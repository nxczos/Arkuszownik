from __future__ import annotations

import base64
import io
import re
from dataclasses import dataclass

from .text_tools import is_task_header, normalize_text, parse_task_number

try:
    import fitz
except Exception:  # pragma: no cover - optional dependency fallback
    fitz = None


@dataclass
class VisualAsset:
    task_number: int
    page: int
    y: float
    html: str


def extract_task_visuals(pdf_bytes: bytes) -> dict[int, list[dict]]:
    if fitz is None:
        return {}

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    headers = _task_headers(doc)
    if not headers:
        return {}

    by_task: dict[int, list[dict]] = {}
    for index, header in enumerate(headers):
        next_header = headers[index + 1] if index + 1 < len(headers) else None
        page_index = header["page_index"]
        page = doc[page_index]
        y0 = max(0, header["bbox"].y0 - 8)
        y1 = page.rect.height - 54
        if next_header and next_header["page_index"] == page_index:
            y1 = next_header["bbox"].y0 - 10

        regions = _drawing_regions(page, y0, y1)
        for order, rect in enumerate(regions, start=1):
            html = _render_region(page, rect, alt=f"Rysunek do zadania {header['number']}")
            if not html:
                continue
            by_task.setdefault(header["number"], []).append(
                {
                    "page": page_index + 1,
                    "y": float(rect.y0),
                    "html": html,
                    "order": order,
                }
            )
    return by_task


def strip_side_score_lines(pdf_bytes: bytes, records: list[dict]) -> list[dict]:
    if fitz is None or not records:
        return records

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    score_texts_by_page: dict[int, set[str]] = {}
    for page_index, page in enumerate(doc, start=1):
        score_texts = set()
        for line in _page_lines(page):
            text = normalize_text(line["text"])
            rect = line["bbox"]
            compact = text.replace(" ", "")
            if _is_score_box_position(rect, page) and _is_score_box_text(compact):
                score_texts.add(compact)
        if score_texts:
            score_texts_by_page[page_index] = score_texts

    filtered: list[dict] = []
    for record in records:
        compact = normalize_text(record["text"]).replace(" ", "")
        page_scores = score_texts_by_page.get(record["page"], set())
        if compact in page_scores or _is_standalone_score_range(compact):
            continue
        filtered.append(record)
    return filtered


def _task_headers(doc) -> list[dict]:
    headers: list[dict] = []
    for page_index, page in enumerate(doc):
        for line in _page_lines(page):
            text = normalize_text(line["text"])
            if not is_task_header(text):
                continue
            number = parse_task_number(text)
            if number is None:
                continue
            headers.append({"page_index": page_index, "number": number, "bbox": line["bbox"]})
    return headers


def _page_lines(page) -> list[dict]:
    lines = []
    data = page.get_text("dict")
    for block in data.get("blocks", []):
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = normalize_text("".join(span.get("text", "") for span in line.get("spans", [])))
            if not text:
                continue
            lines.append({"text": text, "bbox": fitz.Rect(line["bbox"])})
    return sorted(lines, key=lambda item: (item["bbox"].y0, item["bbox"].x0))


def _drawing_regions(page, y0: float, y1: float) -> list:
    candidates = []
    task_band = fitz.Rect(58, y0, page.rect.width - 36, y1)

    for drawing in page.get_drawings():
        rect = fitz.Rect(drawing.get("rect"))
        if rect.is_empty or not rect.intersects(task_band):
            continue
        rect = rect & task_band
        if _looks_like_side_score_box(rect):
            continue
        if _looks_like_answer_grid(rect, page):
            continue
        if rect.width < 34 or rect.height < 24:
            continue
        candidates.append(rect)

    for block in page.get_text("dict").get("blocks", []):
        if block.get("type") != 1:
            continue
        rect = fitz.Rect(block["bbox"])
        if rect.intersects(task_band) and not _looks_like_answer_grid(rect, page):
            candidates.append(rect & task_band)

    groups = _merge_rects(candidates, gap=12)
    result = []
    for rect in groups:
        expanded = fitz.Rect(rect.x0 - 10, rect.y0 - 10, rect.x1 + 10, rect.y1 + 10) & page.rect
        if expanded.width < 70 or expanded.height < 45:
            continue
        if expanded.width > page.rect.width * 0.82 and expanded.height > 140:
            continue
        result.append(expanded)
    return sorted(result, key=lambda rect: (rect.y0, rect.x0))[:2]


def _merge_rects(rects: list, gap: float = 10) -> list:
    groups: list = []
    for rect in rects:
        merged = False
        probe = fitz.Rect(rect.x0 - gap, rect.y0 - gap, rect.x1 + gap, rect.y1 + gap)
        for index, group in enumerate(groups):
            if probe.intersects(group):
                groups[index] = group | rect
                merged = True
                break
        if not merged:
            groups.append(fitz.Rect(rect))

    changed = True
    while changed:
        changed = False
        next_groups = []
        for rect in groups:
            probe = fitz.Rect(rect.x0 - gap, rect.y0 - gap, rect.x1 + gap, rect.y1 + gap)
            hit = None
            for idx, other in enumerate(next_groups):
                if probe.intersects(other):
                    hit = idx
                    break
            if hit is None:
                next_groups.append(rect)
            else:
                next_groups[hit] = next_groups[hit] | rect
                changed = True
        groups = next_groups
    return groups


def _render_region(page, rect, alt: str) -> str:
    try:
        pixmap = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0), clip=rect, alpha=False)
        png = pixmap.tobytes("png")
    except Exception:
        return ""
    encoded = base64.b64encode(png).decode("ascii")
    width = min(720, max(220, int(rect.width * 1.35)))
    return (
        f'<figure class="pdf-import-figure">'
        f'<img src="data:image/png;base64,{encoded}" alt="{alt}" style="max-width:{width}px" />'
        f"</figure>"
    )


def _looks_like_side_score_box(rect) -> bool:
    return rect.width <= 54 and rect.height <= 82 and (rect.x0 < 66 or rect.x1 > 520)


def _is_score_box_position(rect, page) -> bool:
    left_margin = rect.x0 < 66
    right_margin = rect.x1 > page.rect.width - 76
    narrow = rect.width <= 54
    return narrow and (left_margin or right_margin)


def _looks_like_answer_grid(rect, page) -> bool:
    if rect.width > page.rect.width * 0.68 and rect.height > 90:
        return True
    return rect.width > 420 and rect.height > 55


def _is_score_box_text(compact: str) -> bool:
    compact = compact.replace("–", "-").replace("—", "-")
    return bool(
        compact
        and (
            compact in {"0-1", "0-1-", "2-3", "2-3-4"}
            or bool(re.fullmatch(r"\d+\.?", compact))
            or bool(re.fullmatch(r"0-1(?:-\d+)*-?", compact))
            or bool(re.fullmatch(r"\d+-\d+(?:-\d+)*", compact))
        )
    )


def _is_standalone_score_range(compact: str) -> bool:
    compact = compact.replace("–", "-").replace("—", "-")
    return bool(re.fullmatch(r"0-1(?:-\d+)*-?|\d+-\d+(?:-\d+)*", compact))
