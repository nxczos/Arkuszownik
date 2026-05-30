from __future__ import annotations

import io
import re
import unicodedata
from pathlib import Path
from typing import BinaryIO, Iterable

from pypdf import PdfReader

try:
    import fitz
except Exception:  # pragma: no cover - optional dependency fallback
    fitz = None


TASK_HEADER_RE = re.compile(r"^(?:\d+(?:\.\d+)?\.\s*)?Z\s*adanie\s+(\d+(?:\s*[.,]\s*\d+)?)\.?\s*(?:\(\s*0\s*[-–]\s*(\d+)\s*\))?", re.IGNORECASE)
POINTS_RE = re.compile(r"\(\s*0\s*[-–]\s*(\d+)\s*\)|\(\s*(\d+)\s*pkt\.?\s*\)", re.IGNORECASE)

NOISE_PATTERNS = [
    re.compile(r"^Strona\s*\d+\s*z\s*\d+", re.IGNORECASE),
    re.compile(r"Więcej arkuszy znajdziesz", re.IGNORECASE),
    re.compile(r"^Układ graficzny", re.IGNORECASE),
    re.compile(r"^©\s*CKE", re.IGNORECASE),
    re.compile(r"^CKE\b", re.IGNORECASE),
    re.compile(r"^WYPEŁNIA\b", re.IGNORECASE),
    re.compile(r"^KOD\s+PESEL\b", re.IGNORECASE),
    re.compile(r"^Miejsce na naklejkę", re.IGNORECASE),
    re.compile(r"^Arkusz zawiera informacje", re.IGNORECASE),
    re.compile(r"^Instrukcja dla zdającego", re.IGNORECASE),
    re.compile(r"^Przed rozpoczęciem pracy", re.IGNORECASE),
    re.compile(r"^Czas trwania:", re.IGNORECASE),
    re.compile(r"^Liczba punktów", re.IGNORECASE),
    re.compile(r"^Symbol arkusza", re.IGNORECASE),
    re.compile(r"^MATEMATYKA$", re.IGNORECASE),
    re.compile(r"^Poziom\s+rozszerzony$", re.IGNORECASE),
    re.compile(r"^Formuła\s+2023$", re.IGNORECASE),
    re.compile(r"^[A-Z]{3,}\s*[-_]\s*[A-Z0-9_]+", re.IGNORECASE),
    re.compile(r"^[A-Z]{3,}[A-Z0-9_-]*[-_]\d", re.IGNORECASE),
]

ANSWER_AREA_PATTERNS = [
    re.compile(r"^Brudnopis(?:\s*\([^)]*\))?$", re.IGNORECASE),
    re.compile(r"^\d+\.$"),
    re.compile(r"^0\s*[-–]\s*1(?:\s*[-–]\s*\d+)*$"),
    re.compile(r"^Miejsce na obliczenia", re.IGNORECASE),
    re.compile(r"^Zapisz rozwiązanie", re.IGNORECASE),
]

SYMBOL_TO_LATEX = {
    "∞": r"\infty",
    "→": r"\to",
    "⇒": r"\Rightarrow",
    "⇔": r"\Leftrightarrow",
    "≤": r"\leq",
    "≥": r"\geq",
    "≠": r"\neq",
    "±": r"\pm",
    "·": r"\cdot",
    "⋅": r"\cdot",
    "×": r"\times",
    "÷": r"\div",
    "π": r"\pi",
    "α": r"\alpha",
    "β": r"\beta",
    "γ": r"\gamma",
    "δ": r"\delta",
    "Δ": r"\Delta",
    "θ": r"\theta",
    "φ": r"\varphi",
    "∈": r"\in",
    "∉": r"\notin",
    "⊂": r"\subset",
    "∩": r"\cap",
    "∪": r"\cup",
    "∅": r"\emptyset",
    "ℝ": r"\mathbb{R}",
    "ℕ": r"\mathbb{N}",
    "ℤ": r"\mathbb{Z}",
}


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = text.replace("\u00ad", "")
    text = text.replace("–", "-").replace("—", "-")
    text = text.replace("−", "-")
    text = text.replace("ﬁ", "fi").replace("ﬂ", "fl")
    text = re.sub(r"[ \t\f\v]+", " ", text)
    return text.strip()


def extract_pdf_lines(source: str | Path | bytes | BinaryIO) -> list[dict]:
    if isinstance(source, (str, Path)):
        reader = PdfReader(str(source))
    elif isinstance(source, bytes):
        reader = PdfReader(io.BytesIO(source))
    else:
        reader = PdfReader(source)

    records: list[dict] = []
    for page_index, page in enumerate(reader.pages, start=1):
        text = _extract_page_text(page)
        for line_index, line in enumerate(text.splitlines(), start=1):
            cleaned = normalize_text(line)
            if not cleaned:
                continue
            records.append(
                {
                    "page": page_index,
                    "line": line_index,
                    "text": cleaned,
                    "items": [],
                }
            )
    return records


def _extract_fitz_pdf_lines(source: str | Path | bytes | BinaryIO) -> list[dict]:
    if fitz is None:
        return []

    try:
        if isinstance(source, (str, Path)):
            doc = fitz.open(str(source))
        elif isinstance(source, bytes):
            doc = fitz.open(stream=source, filetype="pdf")
        else:
            payload = source.read()
            doc = fitz.open(stream=payload, filetype="pdf")
    except Exception:
        return []

    records: list[dict] = []
    for page_index, page in enumerate(doc, start=1):
        page_height = float(page.rect.height)
        data = page.get_text("dict")
        line_index = 1
        for block in data.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                tokens: list[dict] = []
                for span in line.get("spans", []):
                    text = normalize_text(span.get("text", ""))
                    if not text:
                        continue
                    bbox = span.get("bbox")
                    if not bbox:
                        continue
                    x0, y0, x1, y1 = [float(value) for value in bbox]
                    size = float(span.get("size") or max(8.0, y1 - y0))
                    item = {
                        "text": text,
                        "x": x0,
                        "y": page_height - ((y0 + y1) / 2),
                        "size": size,
                        "width": max(0.1, x1 - x0),
                    }
                    tokens.extend(_split_item_text(item))

                tokens = [token for token in tokens if normalize_text(token.get("text", ""))]
                text = _tokens_to_text(tokens)
                if not text:
                    continue

                bbox = line.get("bbox")
                y_value = page_height - ((float(bbox[1]) + float(bbox[3])) / 2) if bbox else 0.0
                records.append(
                    {
                        "page": page_index,
                        "line": line_index,
                        "text": text,
                        "items": tokens,
                        "y": y_value,
                        "size": max((float(item.get("size", 10.0)) for item in tokens), default=10.0),
                    }
                )
                line_index += 1
    return records


def _extract_page_text(page) -> str:
    try:
        return page.extract_text(extraction_mode="layout") or ""
    except TypeError:
        return page.extract_text() or ""
    except Exception:
        return page.extract_text() or ""


def _extract_positioned_page_lines(page, page_index: int) -> list[dict]:
    page_width = float(page.mediabox.width)
    page_height = float(page.mediabox.height)
    items: list[dict] = []

    def visitor(text, cm, tm, font_dict, font_size):
        for raw in str(text or "").splitlines():
            cleaned = normalize_text(raw)
            if not cleaned:
                continue
            x = float(tm[4])
            y = float(tm[5])
            if x < 20 or y < 20 or x > page_width + 20 or y > page_height + 20:
                continue
            size = float(font_size or 10)
            items.append(
                {
                    "text": cleaned,
                    "x": x,
                    "y": y,
                    "size": size,
                    "width": _estimate_width(cleaned, size),
                }
            )

    try:
        page.extract_text(visitor_text=visitor)
    except Exception:
        return []

    rows: list[dict] = []
    for item in sorted(items, key=lambda it: (-it["y"], it["x"])):
        target = None
        for row in rows:
            tolerance = max(2.4, min(row["size"], item["size"]) * 0.22)
            if abs(row["y"] - item["y"]) <= tolerance:
                target = row
                break
        if target is None:
            rows.append({"y": item["y"], "size": item["size"], "items": [item]})
        else:
            target["items"].append(item)
            count = len(target["items"])
            target["y"] = ((target["y"] * (count - 1)) + item["y"]) / count
            target["size"] = ((target["size"] * (count - 1)) + item["size"]) / count

    records: list[dict] = []
    for line_index, row in enumerate(sorted(rows, key=lambda r: -r["y"]), start=1):
        tokens = _row_tokens(row)
        text = _tokens_to_text(tokens)
        if not text:
            continue
        records.append(
            {
                "page": page_index,
                "line": line_index,
                "text": text,
                "items": tokens,
                "y": row["y"],
                "size": row["size"],
            }
        )
    return records


def _estimate_width(text: str, size: float) -> float:
    width = 0.0
    for char in text:
        if char.isspace():
            width += size * 0.28
        elif char in ".,;:!|'`":
            width += size * 0.24
        elif char in "()[]{}":
            width += size * 0.36
        elif char in "+-=<>≤≥−×÷":
            width += size * 0.68
        elif char in "ilI1":
            width += size * 0.32
        elif char.isupper():
            width += size * 0.62
        else:
            width += size * 0.54
    return max(width, size * 0.35)


def _split_item_text(item: dict) -> list[dict]:
    text = normalize_text(item["text"])
    if " " in text and not _looks_like_math_fragment(text):
        return [
            {
                "text": text,
                "x": item["x"],
                "y": item["y"],
                "size": item["size"],
                "width": item["width"],
            }
        ]
    parts = re.findall(r"\\[A-Za-z]+|[A-Za-z0-9]+|[^\sA-Za-z0-9]", text)
    if not parts:
        return []
    total = sum(_estimate_width(part, item["size"]) for part in parts) or item["width"]
    cursor = item["x"]
    result = []
    for part in parts:
        width = item["width"] * (_estimate_width(part, item["size"]) / total)
        result.append(
            {
                "text": normalize_text(part),
                "x": cursor,
                "y": item["y"],
                "size": item["size"],
                "width": max(width, _estimate_width(part, item["size"])),
            }
        )
        cursor += width
    return result


def _looks_like_math_fragment(text: str) -> bool:
    cleaned = normalize_text(text)
    if any(symbol in cleaned for symbol in SYMBOL_TO_LATEX):
        return True
    if re.search(r"[=<>+*/^_√≤≥−⋅]", cleaned):
        return True
    parts = cleaned.split()
    return bool(parts) and all(len(part) <= 4 and re.search(r"[A-Za-z0-9]", part) for part in parts)


def _row_tokens(row: dict) -> list[dict]:
    tokens: list[dict] = []
    for item in sorted(row["items"], key=lambda it: it["x"]):
        tokens.extend(_split_item_text(item))

    merged: list[dict] = []
    for token in sorted(tokens, key=lambda it: it["x"]):
        if not token["text"]:
            continue
        if not merged:
            merged.append(token)
            continue
        prev = merged[-1]
        gap = token["x"] - (prev["x"] + prev["width"])
        if (
            gap < max(1.2, min(prev["size"], token["size"]) * 0.18)
            and _can_merge_tokens(prev["text"], token["text"])
        ):
            prev["text"] += token["text"]
            prev["width"] = max(prev["width"], token["x"] + token["width"] - prev["x"])
            prev["size"] = max(prev["size"], token["size"])
        else:
            merged.append(token)
    return merged


def _can_merge_tokens(left: str, right: str) -> bool:
    if left.endswith("\\") or right.startswith("\\"):
        return True
    if left.isalpha() and right.isalpha():
        return True
    if left.isdigit() and right.isdigit():
        return True
    if left.isalpha() and right.isdigit():
        return True
    if left in {"<", ">", "=", "-"} or right in {"=", "<", ">"}:
        return True
    return False


def _tokens_to_text(tokens: list[dict]) -> str:
    if not tokens:
        return ""
    out = ""
    prev = None
    for token in tokens:
        text = token["text"]
        if prev is not None:
            gap = token["x"] - (prev["x"] + prev["width"])
            if _needs_word_space(prev["text"], text) or gap > max(2.0, min(prev["size"], token["size"]) * 0.24):
                out += " "
        out += text
        prev = token
    return normalize_text(out)


def _needs_word_space(left: str, right: str) -> bool:
    if not left or not right:
        return False
    if left[-1].isalnum() and right[0].isalnum():
        if len(left) == 1 and len(right) > 1 and left.isupper():
            return False
        return True
    return False


def is_task_header(text: str) -> bool:
    return bool(TASK_HEADER_RE.search(normalize_text(text)))


def parse_task_number(text: str) -> int | float | None:
    match = TASK_HEADER_RE.search(normalize_text(text))
    if not match:
        return None
    value = re.sub(r"\s+", "", match.group(1)).replace(",", ".")
    return float(value) if "." in value else int(value)


def points_from_header(text: str, default: int = 1) -> int:
    match = POINTS_RE.search(normalize_text(text))
    if not match:
        return default
    return int(next(group for group in match.groups() if group))


def is_answer_area(text: str) -> bool:
    cleaned = normalize_text(text)
    return any(pattern.search(cleaned) for pattern in ANSWER_AREA_PATTERNS)


def is_noise(text: str) -> bool:
    cleaned = normalize_text(text)
    if len(cleaned) <= 1:
        return True
    if any(pattern.search(cleaned) for pattern in NOISE_PATTERNS):
        return True
    if re.fullmatch(r"[\-._ ]{3,}", cleaned):
        return True
    return False


def weak_label(record: dict, in_task: bool = False) -> str:
    text = record["text"]
    if is_task_header(text):
        return "task_header"
    if is_noise(text):
        return "noise"
    if is_answer_area(text):
        return "answer_area"
    return "task_body" if in_task else "noise"


def feature_text(record: dict) -> str:
    text = normalize_text(record.get("text", ""))
    lowered = text.lower()
    tokens = [lowered]
    if is_task_header(text):
        tokens.append("__task_header_rule__")
    if POINTS_RE.search(text):
        tokens.append("__has_points__")
    if is_answer_area(text):
        tokens.append("__answer_area_rule__")
    if is_noise(text):
        tokens.append("__noise_rule__")
    if re.search(r"\b[A-D]\.", text):
        tokens.append("__multiple_choice__")
    if any(symbol in text for symbol in SYMBOL_TO_LATEX):
        tokens.append("__math_symbol__")
    if re.search(r"[=<>+\-*/^]", text):
        tokens.append("__operator__")
    if re.search(r"\d", text):
        tokens.append("__digit__")
    if len(text) < 12:
        tokens.append("__short_line__")
    page = min(int(record.get("page", 0)), 12)
    line = min(int(record.get("line", 0)) // 8, 12)
    tokens.append(f"__page_{page}__")
    tokens.append(f"__line_bucket_{line}__")
    return " ".join(tokens)


def label_records(records: Iterable[dict]) -> list[dict]:
    labelled: list[dict] = []
    in_task = False
    for record in records:
        label = weak_label(record, in_task=in_task)
        if label == "task_header":
            in_task = True
        labelled.append({**record, "label": label})
    return labelled


def latexify_text(text: str) -> str:
    result = normalize_text(text)
    result = _repair_glued_math_fragments(result)
    for symbol, latex in SYMBOL_TO_LATEX.items():
        result = result.replace(symbol, f" {latex} ")

    result = re.sub(r"[\u221a]\s*\(([^)]+)\)", r"\\sqrt{\1}", result)
    result = re.sub(r"[\u221a]\s*([0-9]+)(?=[A-Za-z])", r"\\sqrt{\1}", result)
    result = re.sub(r"[\u221a]\s*([A-Za-z0-9]+)", r"\\sqrt{\1}", result)
    result = _latexify_compact_logs(result)
    result = re.sub(r"\blog\s*([0-9]+)\s+([A-Za-z0-9(])", r"\\log_{\1} \2", result)
    result = _repair_common_math_fragments(result)
    result = re.sub(r"\bO\s*([0-9]+)\b", r"O_{\1}", result)
    result = re.sub(r"([A-Za-z])\s*\^\s*([0-9A-Za-z]+)", r"\1^{\2}", result)
    result = re.sub(r"([A-Za-z])\s*_\s*([0-9A-Za-z]+)", r"\1_{\2}", result)
    result = re.sub(r"(\([^()\n]+\))\s*([23])(?=$|[\s.,;:+\-*/<>=])", r"\1^{\2}", result)
    result = re.sub(r"([A-Za-z])([23])(?=$|[A-Za-z\s.,;:+\-*/<>=)])", r"\1^{\2}", result)
    result = _latexify_inline_variables(result)
    result = re.sub(r"\s{2,}", " ", result)
    return result.strip()


def _latexify_compact_logs(text: str) -> str:
    def repl(match: re.Match) -> str:
        digits = match.group(1)
        if len(digits) <= 1:
            return match.group(0)
        base_len = 2 if len(digits) >= 4 else 1
        base = digits[:base_len]
        argument = digits[base_len:]
        return rf"\log_{{{base}}} {argument}"

    return re.sub(r"\blog\s*([0-9]{2,5})\b", repl, text)


def _repair_glued_math_fragments(text: str) -> str:
    result = normalize_text(text)
    result = re.sub(r"\bN\s*[0oO]\b", r"N_{0}", result)
    result = re.sub(r"\bT([pz])\b", r"T_{\1}", result)
    result = re.sub(r"\bt\s*=\s*[oO]\b", "t = 0", result)
    result = re.sub(r"\bk\s*t\s*dla\s*t\b", r"k^{t} dla t", result)
    result = re.sub(r"\bk\s*-\s*t\b", r"k^{-t}", result)
    return result


def _repair_common_math_fragments(text: str) -> str:
    result = normalize_text(text)
    result = result.replace(r"\frac{}{2}", r"\frac{1}{2}")
    result = re.sub(r"\\neq\s+1\s+([A-Za-z])", r"\\neq \\frac{1}{2}\1", result)
    result = re.sub(r"([A-Za-z])\s+\\neq\s+1\s+([A-Za-z])", r"\1 \\neq \\frac{1}{2}\2", result)
    return result


def cleanup_task_lines(lines: Iterable[str | dict]) -> str:
    rows = list(lines)
    if any(isinstance(row, dict) and row.get("items") for row in rows):
        return _cleanup_positioned_task_rows(rows)

    cleaned: list[str] = []
    for line in rows:
        text = normalize_text(line.get("text", "") if isinstance(line, dict) else line)
        if not text or is_noise(text) or is_answer_area(text):
            continue
        text = _strip_leading_score_range(text)
        text = _strip_inline_score_artifacts(text)
        if _is_score_fragment(text):
            continue
        cleaned.append(text)

    text = "\n".join(_reconstruct_text_math_blocks(cleaned))
    text = re.sub(r"\n{3,}", "\n\n", text)
    return _repair_contextual_math(text).strip()


def _is_score_fragment(text: str) -> bool:
    return bool(re.fullmatch(r"\d+\s*-\s*\d+(?:\s*-\s*\d+)*-?", normalize_text(text)))


def _strip_inline_score_artifacts(text: str) -> str:
    cleaned = normalize_text(text)
    cleaned = re.sub(r"\s+\d+\s*-\s*\d+(?:\s*-\s*\d+)*\s*-?\s*$", "", cleaned)
    cleaned = _strip_leading_score_range(cleaned)
    has_math_tail = bool(re.search(r"[=<>+\-*/^≥≤≠⋅√∈]|\b(?:sin|cos|tg|tan|log|ln)\b|\\(?:frac|sqrt)", cleaned))
    has_value_tail = bool(re.search(r"\b(?:równa|równy|równe|wynosi|od|do)\s+\d{1,2}\.\s*$", cleaned, re.IGNORECASE))
    if len(cleaned) > 24 and not has_math_tail and not has_value_tail:
        cleaned = re.sub(r"\s+\d{1,2}\.\s*$", "", cleaned)
    return cleaned.strip()


def _strip_leading_score_range(text: str) -> str:
    cleaned = normalize_text(text)
    match = re.match(r"^(\d+(?:-\d+)+-?)\s+(.+)$", cleaned)
    if not match:
        return cleaned
    rest = match.group(2).lstrip()
    first_word = re.match(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]+", rest)
    if first_word and first_word.group(0).lower() in {"sin", "cos", "tg", "tan", "ctg", "log", "ln"}:
        return cleaned
    return rest


def _reconstruct_text_math_blocks(lines: list[str]) -> list[str]:
    output: list[str] = []
    i = 0
    while i < len(lines):
        line = lines[i]
        if i + 2 < len(lines):
            inline_fraction = _combine_text_inline_fraction(line, lines[i + 1], lines[i + 2])
            if inline_fraction:
                output.extend(inline_fraction)
                i += 3
                continue

        if i + 1 < len(lines):
            limit = _combine_text_limit(line, lines[i + 1])
            if limit:
                output.append(limit)
                i += 2
                continue

            fraction = _combine_text_fraction_lines(line, lines[i + 1])
            if fraction:
                output.append(fraction)
                i += 2
                continue

        if _looks_like_formula_line(line):
            output.append(_display_math(_latex_math_text(line)))
        else:
            output.append(latexify_text(line))
        i += 1
    return _repair_broken_limit_fractions(_merge_display_fences(output))


def _combine_text_inline_fraction(before_line: str, numerator_line: str, denominator_line: str) -> list[str] | None:
    before = normalize_text(before_line)
    numerator_source = normalize_text(numerator_line)
    denominator_source = normalize_text(denominator_line)
    if not before or not numerator_source or not denominator_source:
        return None
    if _looks_like_formula_line(before) or _looks_like_formula_line(denominator_source):
        return None

    numerator = _latex_math_text(numerator_source)
    if not _is_short_math_text(numerator):
        return None
    if not re.search(r"\\sqrt|[+\-*/]", numerator):
        return None

    match = re.match(r"^(.+?)\s+([0-9A-Za-z]+)\s*([.,])?$", denominator_source)
    if not match:
        return None
    prefix, denominator, punctuation = match.groups()
    if len(prefix) < 12 or not re.fullmatch(r"[0-9A-Za-z]+", denominator):
        return None
    if denominator.isalpha() and len(denominator) > 1:
        return None
    if re.search(r"\b(?:od|do|przez)\s*$", prefix, re.IGNORECASE):
        return None

    denominator_latex = _latex_math_text(denominator)
    fraction = f"\\(\\frac{{{numerator}}}{{{denominator_latex}}}\\){punctuation or ''}"
    return [latexify_text(before), f"{latexify_text(prefix)} {fraction}".strip()]


def _looks_like_formula_line(line: str) -> bool:
    text = _repair_glued_math_fragments(line)
    if not text or len(text) > 180:
        return False
    if re.search(r"[=<>≤≥≠·]|\\neq|\\leq|\\geq|\\cdot|\^|_\{|√", text):
        words = re.findall(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,}", text)
        allowed = {"neq", "leq", "geq", "frac", "sqrt", "lim", "infty", "sin", "cos", "log", "ln", "dla", "cdot"}
        return all(word in allowed for word in words)
    return False


def _merge_display_fences(lines: list[str]) -> list[str]:
    merged: list[str] = []
    index = 0
    while index < len(lines):
        if lines[index].strip() == "\\[" and index + 1 < len(lines):
            body = lines[index + 1].strip()
            if index + 2 < len(lines) and lines[index + 2].strip() == "\\]":
                merged.append(body if _is_display_math_line(body) else f"\\[ {body} \\]")
                index += 3
            else:
                merged.append(body if _is_display_math_line(body) else f"\\[ {body} \\]")
                index += 2
            continue
        if lines[index].strip() == "\\]":
            index += 1
            continue
        merged.append(lines[index])
        index += 1
    return merged


def _is_display_math_line(value: str) -> bool:
    stripped = value.strip()
    return stripped.startswith("\\[") and stripped.endswith("\\]")


def _repair_broken_limit_fractions(lines: list[str]) -> list[str]:
    repaired: list[str] = []
    index = 0
    while index < len(lines):
        if index + 1 < len(lines):
            embedded = _combine_bad_limit_with_embedded_fraction(lines[index], lines[index + 1])
            if embedded:
                repaired.append(embedded)
                index += 2
                continue
            duplicate = _drop_duplicate_limit_numerator(lines[index], lines[index + 1])
            if duplicate:
                repaired.append(duplicate)
                index += 2
                continue
            combined = _combine_prior_line_with_limit(lines[index], lines[index + 1])
            if combined:
                repaired.append(combined)
                index += 2
                continue
        repaired.append(lines[index])
        index += 1
    return repaired


def _combine_bad_limit_with_embedded_fraction(previous: str, current: str) -> str | None:
    display_match = re.fullmatch(r"\\\[\s*(.+?)\s*\\\]", current.strip(), re.DOTALL)
    if not display_match:
        return None

    previous_math = _normalise_math_spacing(_clean_nested_math_delims(previous))
    if not _is_short_math_text(previous_math):
        return None

    expression = _normalise_math_spacing(display_match.group(1))
    match = re.fullmatch(
        r"(?P<sub>[A-Za-z]\s+\\to\s+\+?\s*\\infty)\s+"
        r"(?P<body>.+?)\s+\+\s+\\frac\{\s*(?:\\?lim\s*)?(?P<inner>[^{}]+?)\s*\}\{\s*(?P<tail>[^{}]+?)\s*\}",
        expression,
    )
    if not match:
        return None

    body = _tighten_math_coefficients(_repair_half_coefficient(_normalise_math_spacing(match.group("body"))))
    inner = _normalise_math_spacing(_latex_math_text(match.group("inner")))
    tail = _normalise_math_spacing(_latex_math_text(match.group("tail")))
    if not inner or not tail or not re.search(r"\\infty", match.group("sub")):
        return None

    denominator = _tighten_math_coefficients(_normalise_math_spacing(f"{body} + {tail}"))
    outer = (
        f"\\lim_{{{_normalise_math_spacing(match.group('sub'))}}} "
        f"\\frac{{\\frac{{{previous_math}}}{{{inner}}}}}{{{denominator}}}"
    )
    return _display_math(outer)


def _clean_nested_math_delims(value: str) -> str:
    cleaned = _strip_inline_math_delims(_strip_display_math_delims(value))
    previous = None
    while previous != cleaned:
        previous = cleaned
        cleaned = _strip_inline_math_delims(_strip_display_math_delims(cleaned))
    cleaned = re.sub(r"\(([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\)", r"\1", cleaned)
    cleaned = re.sub(r"\(\s*([A-Za-z])\s*\)", r"\1", cleaned)
    return _normalise_math_spacing(cleaned)


def _tighten_math_coefficients(expression: str) -> str:
    return re.sub(
        r"(?<![A-Za-z0-9}])([2-9]\d*)\s+([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)",
        r"\1\2",
        expression,
    )


def _drop_duplicate_limit_numerator(previous: str, current: str) -> str | None:
    display_match = re.fullmatch(r"\\\[\s*(.+?)\s*\\\]", current.strip(), re.DOTALL)
    if not display_match or "\\lim_" not in current or "\\frac{\\frac" not in current:
        return None
    previous_math = _compact_math(_latex_math_text(_strip_display_math_delims(previous)))
    expression = _compact_math(display_match.group(1))
    if previous_math and previous_math in expression:
        return current
    return None


def _compact_math(value: str) -> str:
    value = _strip_inline_math_delims(_strip_display_math_delims(value))
    value = value.replace(" ", "")
    return value


def _combine_prior_line_with_limit(previous: str, current: str) -> str | None:
    previous_math = _latex_math_text(_strip_display_math_delims(previous))
    if not _is_short_math_text(previous_math):
        return None
    display_match = re.fullmatch(r"\\\[\s*(.+?)\s*\\\]", current, re.DOTALL)
    expression = display_match.group(1).strip() if display_match else current.strip()
    limit_match = re.fullmatch(r"\\lim_\{(.+)\}\s+(.+)", expression, re.DOTALL)
    if not limit_match:
        return None

    inner = _normalise_math_spacing(_strip_inline_math_delims(limit_match.group(1)))
    after = _normalise_math_spacing(_strip_inline_math_delims(limit_match.group(2)))
    split = re.match(r"(.+?\\infty)\s+(.+)", inner)
    if not split:
        return None

    subscript = _normalise_math_spacing(split.group(1))
    lower_denominator = _repair_half_coefficient(_normalise_math_spacing(split.group(2)))
    upper_denominator = _normalise_math_spacing(after)
    numerator = _normalise_math_spacing(previous_math)
    expression = (
        f"\\lim_{{{subscript}}} "
        f"\\frac{{\\frac{{{numerator}}}{{{upper_denominator}}}}}"
        f"{{{lower_denominator}}}"
    )
    return _display_math(expression)


def _repair_half_coefficient(expression: str) -> str:
    expression = expression.replace(r"\frac{}{2}", r"\frac{1}{2}")
    return re.sub(r"^1\s+(?=[A-Za-z])", r"\\frac{1}{2} ", expression, count=1)


def _strip_inline_math_delims(value: str) -> str:
    return value.replace("\\(", "").replace("\\)", "")


def _strip_display_math_delims(value: str) -> str:
    stripped = value.strip()
    if stripped.startswith("\\[") and stripped.endswith("\\]"):
        return stripped[2:-2].strip()
    return value


def _combine_text_limit(line: str, lower_line: str) -> str | None:
    text = _latex_math_text(line)
    lower = _latex_math_text(lower_line)
    if not re.search(r"(^|\s)(lim|\\lim)($|\s)", text):
        return None
    if not _is_short_math_text(lower) or not re.search(r"(\\to|->|→|infty|\\infty|[a-z]\s*=)", lower):
        return None
    expression = re.sub(
        r"(^|\s)(lim|\\lim)($|\s)",
        lambda match: f"{match.group(1)}\\lim_{{{lower}}}{match.group(3)}",
        text,
        count=1,
    )
    return _display_math(expression)


def _combine_text_fraction_lines(top_line: str, bottom_line: str) -> str | None:
    top = _math_tokens_from_text(top_line)
    bottom = _math_tokens_from_text(bottom_line)
    if not top or not bottom:
        return None

    top_operands = [token for token in top if not _plain_operator(token)]
    bottom_operands = [token for token in bottom if not _plain_operator(token)]
    top_ops = [token for token in top if _plain_operator(token)]
    bottom_ops = [token for token in bottom if _plain_operator(token)]
    count = len(top_operands)

    if count < 2 or len(bottom_operands) != count:
        return None
    if not (_has_fraction_operator(top_ops) or _has_fraction_operator(bottom_ops)):
        return None

    operators = top_ops if len(top_ops) == count - 1 else bottom_ops if len(bottom_ops) == count - 1 else []
    if len(operators) != count - 1:
        return None

    parts: list[str] = []
    for index, numerator in enumerate(top_operands):
        parts.append(f"\\frac{{{numerator}}}{{{bottom_operands[index]}}}")
        if index < len(operators):
            parts.append(operators[index])
    return _display_math(" ".join(parts))


def _math_tokens_from_text(text: str) -> list[str]:
    math = _latex_math_text(text)
    if not _is_short_math_text(math):
        return []
    tokens = re.findall(
        r"\\(?:leq|geq|neq|to|infty|cdot|times|div|sqrt\{[^}]+\}|frac\{[^}]+\}\{[^}]+\})|[A-Za-z0-9]+(?:\^\{[^}]+\}|_\{[^}]+\})?|<=|>=|[+\-=<>]",
        math,
    )
    return [token for token in tokens if token]


def _latex_math_text(text: str) -> str:
    math = latexify_text(text)
    math = math.replace("\\(", "").replace("\\)", "")
    math = math.replace("≤", "\\leq").replace("≥", "\\geq").replace("→", "\\to")
    math = math.replace("< =", "\\leq").replace("> =", "\\geq")
    math = re.sub(
        r"\bdla\s+([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\s+(\\(?:leq|geq|neq)|[<>]=?|=)\s*([0-9A-Za-z]+)",
        r"\\quad \\text{dla } \1 \2 \3",
        math,
    )
    return _normalise_math_spacing(math)


def _is_short_math_text(text: str) -> bool:
    cleaned = normalize_text(text)
    if not cleaned or len(cleaned) > 120:
        return False
    words = re.findall(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,}", cleaned)
    allowed_words = {"frac", "sqrt", "leq", "geq", "neq", "lim", "to", "infty", "cdot", "times", "div", "text", "dla"}
    return all(word in allowed_words for word in words)


def _plain_operator(token: str) -> bool:
    return token in {"+", "-", "=", "<", ">", "<=", ">=", "\\leq", "\\geq", "\\neq", "\\to"}


def _has_fraction_operator(tokens: list[str]) -> bool:
    return any(token in {"+", "=", "<", ">", "<=", ">=", "\\leq", "\\geq", "\\neq"} for token in tokens)


MATH_OPERATORS = {"+", "-", "−", "=", "<", ">", "≤", "≥", "\\leq", "\\geq", "\\neq", "\\to", ":", "/", "\\cdot", "⋅"}
MATH_WORDS = {"lim", "sin", "cos", "tg", "tan", "ctg", "log", "ln", "max", "min", "sum"}
VARIABLES = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")


def _cleanup_positioned_task_rows(records: list[str | dict]) -> str:
    rows = [_record_to_math_row(record) for record in records]
    rows = [row for row in rows if row and not is_noise(row["text"]) and not is_answer_area(row["text"])]
    rows = _merge_close_script_rows(rows)

    output: list[str] = []
    i = 0
    while i < len(rows):
        row = rows[i]
        if i + 1 < len(rows):
            limited = _combine_limit_row(row, rows[i + 1])
            if limited:
                output.append(limited)
                i += 2
                continue

            fraction = _combine_fraction_rows(row, rows[i + 1])
            if fraction:
                output.append(fraction)
                i += 2
                continue

        text = _strip_score_prefix(row["text"])
        if text and not is_noise(text) and not is_answer_area(text):
            output.append(latexify_text(text))
        i += 1

    text = "\n".join(line for line in output if line)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return _repair_contextual_math(text).strip()


def _repair_contextual_math(text: str) -> str:
    result = _repair_sequence_context(text)
    result = _repair_known_exam_layouts(result)
    result = _repair_vector_notation(result)
    result = _repair_segment_powers(result)
    if "Oblicz granicę" in result and r"\frac{lim n - 1}{7}" in result:
        result = re.sub(
            r"\(\s*\\\(n\\\)\s*\+\s*2\)\s*\n\s*\\\(n\\\)\s*\\to\s*\+\s*\\infty\s*1\s*\\\(n\^\{3\}\\\)\s*-\s*4\\\(n\\\)\s*\+\s*\\\(\\frac\{lim n - 1\}\{7\}\\\)",
            r"\\[ \\lim_{n \\to +\\infty} \\left(\\frac{n+2}{n-1}\\right)^{\\frac{1}{2n^{3}-4n+7}} \\]",
            result,
        )
    result = result.replace(
        "\\pi 25h^{3}\n\\[ V(h) = 3 \\cdot h^{2} - 25 \\]",
        "\\[ V(h) = \\frac{\\pi}{3} \\cdot \\frac{25h^{3}}{h^{2} - 25} \\]",
    )
    result = result.replace(
        "2\\(x^{3}\\)\n\\[ P(x) = x^{2} - 16 \\]",
        "\\[ P(x) = \\frac{2x^{3}}{x^{2} - 16} \\]",
    )
    if re.search(r"\bmiejsc[ae]\s+zerow", result, re.IGNORECASE):
        result = re.sub(r"\\\(x\^\{2\}\\\)", r"\\(x_{2}\\)", result)
        result = re.sub(r"(?<=x_\{1\}\s-\s)x\^\{2\}", r"x_{2}", result)
        result = re.sub(r"(?<=x_\{1\}\s-\s)\\\(x\^\{2\}\\\)", r"\\(x_{2}\\)", result)
    return result


def _repair_known_exam_layouts(text: str) -> str:
    result = text
    result = re.sub(
        r"Oblicz granicę\s*\n\\\(x\^\{3\}\\\)\s*-\s*8\s*\n\\\[\s*\\lim_\{x\s*\\to\s*2\s*-\s*x\s*-\s*2\}\s*\(\s*\)\^\{2\}\s*\\\]",
        r"Oblicz granicę\n\\[ \\lim_{x \\to 2} \\left(\\frac{x^{3}-8}{x-2}\\right)^{2} \\]",
        result,
    )
    result = result.replace(
        "Funkcja f jest określona wzorem\n\\[ \\frac{x^{3}}{f} - \\frac{3x}{x} + \\frac{2}{x} \\]",
        "Funkcja f jest określona wzorem\n\\[ f(x) = \\frac{x^{3} - 3x + 2}{x} \\]",
    )
    result = re.sub(
        r"^2\\\(a\\\)\s*\+\s*1\s*\nWykaż, że jeżeli (.+?)\\\(a\\\) oraz (.+?)\\\(b\\\), to (.+?)\\\(a\\\)\s*\\cdot\s*\(1\s*\+\s*\\\(b\\\)\)\s*\.",
        lambda match: f"Wykaż, że jeżeli \\({match.group(1).strip()}a\\) oraz \\({match.group(2).strip()}b\\), to \\({match.group(3).strip()}\\frac{{2a + 1}}{{a \\cdot (1 + b)}}\\).",
        result,
        flags=re.DOTALL,
    )
    result = result.replace(
        "\\[ a^{2} \\cdot \\sqrt{3} 13824\\sqrt{3} \\]\n\\[ P(a) = 2 + a \\]",
        "\\[ P(a) = \\frac{a^{2}\\sqrt{3}}{2} + \\frac{13824\\sqrt{3}}{a} \\]",
    )
    result = result.replace(
        "\\[ dla a \\in (0, 8\\sqrt{3} ]. \\]",
        "dla \\(a \\in (0, 8\\sqrt{3}]\\).",
    )
    result = result.replace(
        "\\[ x - 3m + 1 \\cdot x + 2m + m + 1 = 0 \\]",
        "\\[ x^{2} - (3m + 1)x + 2m^{2} + m + 1 = 0 \\]",
    )
    result = result.replace(
        "2 ( )^{2}\n\\[ x - 3m + 1 \\cdot x + 2m + m + 1 = 0 \\]",
        "\\[ x^{2} - (3m + 1)x + 2m^{2} + m + 1 = 0 \\]",
    )
    result = result.replace(
        "2 ( )^{2}\n\\[ x^{2} - (3m + 1)x + 2m^{2} + m + 1 = 0 \\]",
        "\\[ x^{2} - (3m + 1)x + 2m^{2} + m + 1 = 0 \\]",
    )
    result = re.sub(
        r"\\\[ x\^\{3\} \+ x\^\{3\} \+ 3 \\cdot x_\{1\} \\cdot x\^\{2\} \\cdot \(x_\{1\} \+ x\^\{2\} - 3\) \\leq 3m - 7 \\\]\s*\n1 2",
        r"\\[ x_{1}^{3} + x_{2}^{3} + 3 \\cdot x_{1} \\cdot x_{2} \\cdot (x_{1} + x_{2} - 3) \\leq 3m - 7 \\]",
        result,
    )
    return result


def _repair_vector_notation(text: str) -> str:
    result = "\n".join(line for line in text.splitlines() if not re.fullmatch(r"[\s⃗]+", line))
    result = re.sub(r"\bAM\s*=\s*-?\s*2\s*\\cdot\s*BM\b", r"\\(\\vec{AM} = -2 \\cdot \\vec{BM}\\)", result)
    return result


def _repair_segment_powers(text: str) -> str:
    result = re.sub(r"(\|[A-Z]{1,2}\|)\s*2\b", r"\1^{2}", text)
    result = re.sub(r"\b([xyzam])\^\{2\}(?=\s*(?:tego samego|należące|spełniające|,|\.))", r"\1_{2}", result)
    result = re.sub(r"\\\(x\^\{2\}\\\)", r"\\(x_{2}\\)", result) if re.search(r"\bx_\{1\}\b|x_\{1\}", result) else result
    return result


def _repair_sequence_context(text: str) -> str:
    if not re.search(r"\bci.g|\bwyraz", text, re.IGNORECASE):
        return text
    result = re.sub(
        r"\\\(([abcxy])\^\{([0-9]+)\}\\\)(?=\s*=)",
        r"\\(\1_{\2}\\)",
        text,
    )
    result = re.sub(
        r"(\\\[\s*)([abcxy])\^\{([0-9]+)\}(?=\s*=)",
        r"\1\2_{\3}",
        result,
    )
    result = re.sub(
        r"\\\(([abcxy])\\\)\s*\+\s*\\\(\1\s*=\s*([0-9]+)\\\)\s+i\s+\\\(\1\^\{2\}\\\)\s*\+\s*\\\(\1\^\{2\}\s*=\s*([0-9]+)\\\)\.\s*\n\s*1\s+3\s+1\s+3",
        r"\\(\1_{1} + \1_{3} = \2\\) i \\(\1_{1}^{2} + \1_{3}^{2} = \3\\).",
        result,
    )
    return result


def _record_to_math_row(record: str | dict) -> dict | None:
    if isinstance(record, str):
        text = normalize_text(record)
        return {"text": text, "tokens": [], "y": 0.0, "size": 10.0} if text else None

    text = _strip_score_prefix(normalize_text(record.get("text", "")))
    tokens = [_normalise_token(token) for token in record.get("items", [])]
    tokens = [token for token in tokens if token["text"]]
    if not text and tokens:
        text = _tokens_to_text(tokens)
    if not text:
        return None
    return {
        "text": text,
        "tokens": tokens,
        "y": float(record.get("y", 0.0)),
        "size": float(record.get("size", 10.0)),
    }


def _normalise_token(token: dict) -> dict:
    text = normalize_text(token.get("text", ""))
    width = float(token.get("width") or _estimate_width(text, float(token.get("size", 10.0))))
    x = float(token.get("x", 0.0))
    return {
        "text": text,
        "x": x,
        "y": float(token.get("y", 0.0)),
        "size": float(token.get("size", 10.0)),
        "width": width,
        "center": x + width / 2,
    }


def _strip_score_prefix(text: str) -> str:
    text = normalize_text(text)
    text = _strip_leading_score_range(text)
    text = re.sub(r"^\d+\.\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])", "", text)
    return text.strip()


def _merge_close_script_rows(rows: list[dict]) -> list[dict]:
    result: list[dict] = []
    used: set[int] = set()

    for index, row in enumerate(rows):
        if index in used:
            continue
        if index + 1 < len(rows) and _looks_like_script_row(row, rows[index + 1]):
            target = _copy_row(rows[index + 1])
            _attach_scripts(row, target, "^")
            target["text"] = _tokens_to_text(target["tokens"])
            result.append(target)
            used.add(index)
            used.add(index + 1)
            continue
        result.append(_copy_row(row))
    return result


def _copy_row(row: dict) -> dict:
    return {
        "text": row["text"],
        "tokens": [dict(token) for token in row.get("tokens", [])],
        "y": row["y"],
        "size": row["size"],
    }


def _looks_like_script_row(upper: dict, base: dict) -> bool:
    dy = upper["y"] - base["y"]
    if dy <= 0 or dy > 10.5:
        return False
    upper_tokens = [token for token in upper.get("tokens", []) if _is_math_token(token["text"])]
    base_tokens = [token for token in base.get("tokens", []) if _is_math_token(token["text"])]
    if not upper_tokens or not base_tokens:
        return False
    if len(upper_tokens) > max(3, len(base_tokens)):
        return False
    if any(len(token["text"]) > 4 for token in upper_tokens):
        return False
    return upper["size"] <= base["size"] * 0.95


def _attach_scripts(script_row: dict, base_row: dict, marker: str) -> None:
    base_tokens = base_row.get("tokens", [])
    for script in script_row.get("tokens", []):
        if not _is_math_token(script["text"]):
            continue
        best = None
        best_score = 9999.0
        for token in base_tokens:
            if _is_operator(token["text"]) or token["text"] in {"(", ")", "[", "]"}:
                continue
            token_end = token["x"] + token["width"]
            score = abs(script["center"] - token_end)
            if token["x"] - 2 <= script["center"] <= token_end + 12 and score < best_score:
                best = token
                best_score = score
        if best is not None:
            best["text"] = f"{best['text']}{marker}{{{_latex_token(script['text'])}}}"
            best["width"] = max(best["width"], script["x"] + script["width"] - best["x"])
            best["center"] = best["x"] + best["width"] / 2


def _combine_limit_row(row: dict, lower: dict) -> str | None:
    dy = row["y"] - lower["y"]
    if dy <= 0 or dy > 12:
        return None
    row_tokens = row.get("tokens", [])
    lower_tokens = [token for token in lower.get("tokens", []) if _is_math_token(token["text"])]
    if not row_tokens or not lower_tokens:
        return None

    changed = False
    for token in row_tokens:
        if token["text"].lower() not in {"lim", "sum"}:
            continue
        under = [
            lower_token
            for lower_token in lower_tokens
            if abs(lower_token["center"] - token["center"]) < max(26, token["width"] * 2.8)
        ]
        if under:
            subscript = " ".join(_latex_token(item["text"]) for item in under)
            command = "\\lim" if token["text"].lower() == "lim" else "\\sum"
            token["text"] = f"{command}_{{{subscript}}}"
            changed = True
    if not changed:
        return None
    return _display_math(_tokens_to_latex(row_tokens))


def _combine_fraction_rows(upper: dict, base: dict) -> str | None:
    dy = upper["y"] - base["y"]
    if dy <= 5.5 or dy > 24:
        return None
    if not _is_math_row(upper) or not _is_math_row(base):
        return None

    upper_tokens = [token for token in upper.get("tokens", []) if _is_fraction_part(token["text"])]
    base_tokens = [token for token in base.get("tokens", []) if token["text"]]
    if not upper_tokens or not base_tokens:
        return None

    pairs: dict[int, list[dict]] = {}
    used_upper: set[int] = set()
    for upper_index, top in enumerate(upper_tokens):
        best_index = None
        best_score = 9999.0
        for base_index, bottom in enumerate(base_tokens):
            if not _is_fraction_part(bottom["text"]):
                continue
            score = abs(top["center"] - bottom["center"])
            limit = max(10.5, bottom["width"] * 0.85, top["width"] * 0.85)
            if score <= limit and score < best_score:
                best_index = base_index
                best_score = score
        if best_index is not None:
            pairs.setdefault(best_index, []).append(top)
            used_upper.add(upper_index)

    pair_count = sum(1 for tops in pairs.values() if tops)
    if pair_count == 0:
        return None
    if pair_count == 1 and not (_row_math_only(upper) and _row_math_only(base)):
        return None

    if _looks_like_binomial(base_tokens, pairs):
        return _display_math(_binomial_from_rows(base_tokens, pairs))

    expression_parts: list[str] = []
    for index, token in enumerate(base_tokens):
        if index in pairs and _is_fraction_part(token["text"]):
            numerator = " ".join(_latex_token(top["text"]) for top in sorted(pairs[index], key=lambda item: item["x"]))
            expression_parts.append(f"\\frac{{{numerator}}}{{{_latex_token(token['text'])}}}")
        else:
            expression_parts.append(_latex_token(token["text"]))

    expression = _normalise_math_spacing(" ".join(part for part in expression_parts if part))
    if not expression:
        return None
    return _display_math(expression)


def _looks_like_binomial(base_tokens: list[dict], pairs: dict[int, list[dict]]) -> bool:
    if len(pairs) != 1:
        return False
    texts = [token["text"] for token in base_tokens]
    return "(" in texts and ")" in texts and not any(text in MATH_OPERATORS for text in texts)


def _binomial_from_rows(base_tokens: list[dict], pairs: dict[int, list[dict]]) -> str:
    index, tops = next(iter(pairs.items()))
    numerator = " ".join(_latex_token(top["text"]) for top in sorted(tops, key=lambda item: item["x"]))
    denominator = _latex_token(base_tokens[index]["text"])
    return f"\\binom{{{numerator}}}{{{denominator}}}"


def _is_math_row(row: dict) -> bool:
    tokens = [token["text"] for token in row.get("tokens", []) if token["text"]]
    if not tokens:
        return False
    math_count = sum(1 for token in tokens if _is_math_token(token))
    text_words = [token for token in tokens if re.fullmatch(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{4,}", token)]
    if text_words:
        return False
    return math_count / len(tokens) >= 0.7


def _row_math_only(row: dict) -> bool:
    tokens = [token["text"] for token in row.get("tokens", []) if token["text"]]
    return bool(tokens) and all(_is_math_token(token) for token in tokens)


def _is_fraction_part(text: str) -> bool:
    return _is_math_token(text) and not _is_operator(text) and text not in {"(", ")", "[", "]", "{", "}"}


def _is_math_token(text: str) -> bool:
    text = normalize_text(text)
    if not text:
        return False
    if text in MATH_OPERATORS or text in {"(", ")", "[", "]", "{", "}", ","}:
        return True
    if text.startswith("\\"):
        return True
    if text.lower() in MATH_WORDS:
        return True
    if re.fullmatch(r"[0-9]+(?:[,.][0-9]+)?", text):
        return True
    if re.fullmatch(r"[A-Za-z](?:\^\{[^}]+\}|_\{[^}]+\})?", text):
        return True
    if re.fullmatch(r"[A-Za-z0-9]+(?:\^\{[^}]+\}|_\{[^}]+\})?", text) and len(text) <= 5:
        return True
    if any(symbol in text for symbol in SYMBOL_TO_LATEX):
        return True
    return False


def _is_operator(text: str) -> bool:
    return normalize_text(text) in MATH_OPERATORS


def _latex_token(text: str) -> str:
    text = normalize_text(text)
    if text in SYMBOL_TO_LATEX:
        return SYMBOL_TO_LATEX[text]
    aliases = {
        "−": "-",
        "⋅": "\\cdot",
        "≤": "\\leq",
        ">=": "\\geq",
        "<=": "\\leq",
        "≥": "\\geq",
        "≠": "\\neq",
        "->": "\\to",
        "→": "\\to",
    }
    if text in aliases:
        return aliases[text]
    if text.lower() == "lim":
        return "\\lim"
    if text.lower() == "sqrt":
        return "\\sqrt"
    return latexify_text(text).replace("\\(", "").replace("\\)", "")


def _tokens_to_latex(tokens: list[dict]) -> str:
    return _normalise_math_spacing(" ".join(_latex_token(token["text"]) for token in tokens if token["text"]))


def _normalise_math_spacing(expression: str) -> str:
    expression = re.sub(r"\s+", " ", expression).strip()
    expression = expression.replace(r"\frac{}{2}", r"\frac{1}{2}")
    expression = re.sub(r"\b([abcxy])_\{n\}\s*\+\s*([0-9]+)(?=\s*=)", r"\1_{n+\2}", expression)
    expression = expression.replace(" < = ", " \\leq ")
    expression = expression.replace(" > = ", " \\geq ")
    expression = re.sub(r"\s*([+=<>-])\s*", r" \1 ", expression)
    expression = expression.replace("\\ leq", "\\leq").replace("\\ geq", "\\geq")
    expression = re.sub(r"_\{\s*([^{}]+?)\s*\+\s*([^{}]+?)\s*\}", r"_{\1+\2}", expression)
    expression = re.sub(r"\^\{\s*-\s*([^{}]+?)\s*\}", r"^{-\1}", expression)
    expression = re.sub(r"\\to\s*\+\s*\\infty", r"\\to + \\infty", expression)
    expression = re.sub(r"\s+", " ", expression).strip()
    return expression


def _display_math(expression: str) -> str:
    expression = _normalise_math_spacing(expression)
    return f"\\[ {expression} \\]"


def _latexify_inline_variables(text: str) -> str:
    text = _repair_sequence_subscripts(text)
    variable_pattern = r"(?<![^\W\d_])(?<!\\)([NKTxyznmabckt])(?:\s*([\^_])\s*(?:\{([^}]+)\}|([0-9A-Za-z]+)))?(?![^\W\d_])"

    def repl(match: re.Match) -> str:
        variable = match.group(1)
        marker = match.group(2)
        script = match.group(3) or match.group(4)
        if not marker and not _should_wrap_inline_variable(text, match.start(), match.end(), variable):
            return variable
        if marker and script:
            return f"\\({variable}{marker}{{{script}}}\\)"
        return f"\\({variable}\\)"

    return _merge_inline_math_operators(re.sub(variable_pattern, repl, text))


def _should_wrap_inline_variable(source: str, start: int, end: int, variable: str) -> bool:
    if variable == "N" and re.search(r"\d\s*$", source[:start]):
        return False
    if variable in {"N", "K", "T"}:
        return True
    if variable == "z":
        if re.match(r"\s+[^\W\d_]{3,}", source[end:]):
            return False
        return _near_symbol_list_context(source, start, end)
    if _near_math_context(source, start, end):
        return True

    before_words = re.findall(r"[^\W\d_]+", source[:start].lower())
    after_words = re.findall(r"[^\W\d_]+", source[end:].lower())
    context_words = set(before_words[-4:] + after_words[:2])
    math_cues = {
        "liczba",
        "liczby",
        "liczbą",
        "liczbie",
        "rzeczywista",
        "rzeczywistej",
        "naturalna",
        "naturalnej",
        "zmienna",
        "zmiennej",
        "ciąg",
        "ciągu",
        "wyraz",
        "wyrazu",
        "funkcja",
        "funkcji",
        "współrzędna",
        "współrzędnej",
        "współrzędnych",
    }
    if context_words & math_cues:
        return True
    if variable == "a":
        return False
    return variable in {"x", "y", "n", "m", "b", "c", "k", "t"}


def _near_math_context(source: str, start: int, end: int) -> bool:
    left = source[max(0, start - 10) : start]
    right = source[end : min(len(source), end + 10)]
    window = left + right
    if re.search(r"\\(?:leq|geq|neq|to|infty)|[=<>+\-*/^_{}()]", window):
        return True
    if re.search(r"^\s*[-–—]\s*", right):
        return True
    return False


def _near_symbol_list_context(source: str, start: int, end: int) -> bool:
    window = source[max(0, start - 16) : min(len(source), end + 16)]
    if re.search(r"[(),=<>+\-*/^_{}]", window):
        return True
    return bool(re.search(r"(?<![^\W\d_])[xy](?![^\W\d_]).{0,12}$", source[max(0, start - 24) : start]))


def _merge_inline_math_operators(text: str) -> str:
    result = text
    result = re.sub(
        r"\(\\\(([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\\\)\)",
        r"\\((\1)\\)",
        result,
    )
    result = re.sub(
        r"\\\(([abcxy])\\\)([0-9]+)(?=$|[\s.,;:=+\-*/<>)])",
        r"\\(\1_{\2}\\)",
        result,
    )
    result = re.sub(
        r"\\\(([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\\\)\s*(=|<|>|\\(?:leq|geq))\s*([0-9]+)",
        r"\\(\1 \2 \3\\)",
        result,
    )
    result = re.sub(
        r"\\\(([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\\\)\s*(\\(?:neq|leq|geq))\s*\\frac\{1\}\{2\}\\\(([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\\\)",
        r"\\(\1 \2 \\frac{1}{2}\3\\)",
        result,
    )
    result = re.sub(
        r"\\\(([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\\\)\s*(\\(?:neq|leq|geq))\s*\\\(([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\\\)",
        r"\\(\1 \2 \3\\)",
        result,
    )
    return result


def _repair_sequence_subscripts(text: str) -> str:
    result = normalize_text(text)
    result = re.sub(r"(?<![^\W\d_])([abcxy])\s*[_]?\s*n(?![^\W\d_])", r"\1_{n}", result)
    result = re.sub(r"\(([abcxy])\s*n\)", r"(\1_{n})", result)
    return result
