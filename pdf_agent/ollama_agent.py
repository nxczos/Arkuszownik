from __future__ import annotations

import base64
import json
import os
import re
from pathlib import Path
from typing import Any

import requests

from .agent import AGENT_VERSION
from .feedback import apply_learned_corrections
from .text_tools import normalize_text
from .visuals import extract_task_visuals

try:
    import fitz
except Exception:  # pragma: no cover - optional dependency fallback
    fitz = None


OLLAMA_BASE_URL = os.environ.get("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
OLLAMA_PDF_MODEL = os.environ.get("OLLAMA_PDF_MODEL", "qwen3-vl:4b-instruct")
OLLAMA_TIMEOUT_SECONDS = float(os.environ.get("OLLAMA_PDF_TIMEOUT_SECONDS", "600"))
OLLAMA_PAGE_SCALE = float(os.environ.get("OLLAMA_PDF_PAGE_SCALE", "1.25"))

PAGE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "documentTitle": {"type": "string"},
        "tasks": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "properties": {
                    "number": {"type": "string"},
                    "title": {"type": "string"},
                    "maxScore": {"type": "integer"},
                    "content": {"type": "string"},
                },
                "required": ["number", "title", "maxScore", "content"],
            },
        },
    },
    "required": ["documentTitle", "tasks"],
}

SOLUTION_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "content": {"type": "string"},
    },
    "required": ["content"],
}


def ollama_status() -> dict[str, Any]:
    try:
        response = requests.get(f"{OLLAMA_BASE_URL}/api/tags", timeout=2.5)
        response.raise_for_status()
        body = response.json()
    except Exception as exc:
        return {
            "available": False,
            "model": OLLAMA_PDF_MODEL,
            "modelInstalled": False,
            "baseUrl": OLLAMA_BASE_URL,
            "error": str(exc),
        }

    models = sorted(
        {
            str(item.get("name") or item.get("model") or "").strip()
            for item in body.get("models", [])
            if item.get("name") or item.get("model")
        }
    )
    return {
        "available": True,
        "model": OLLAMA_PDF_MODEL,
        "modelInstalled": OLLAMA_PDF_MODEL in models,
        "baseUrl": OLLAMA_BASE_URL,
        "models": models,
    }


class OllamaPdfSheetAgent:
    def __init__(self, model: str = OLLAMA_PDF_MODEL):
        self.model = model

    def import_image(self, image_bytes: bytes, filename: str = "screen.png") -> dict[str, Any]:
        installed = ollama_status()
        if not installed["available"]:
            raise RuntimeError(f"Ollama is unavailable at {OLLAMA_BASE_URL}: {installed.get('error', 'no response')}")
        if not installed["modelInstalled"]:
            raise RuntimeError(f"Ollama model {self.model} is not installed. Run: ollama pull {self.model}")

        image = base64.b64encode(image_bytes).decode("ascii")
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": _screen_prompt(filename),
                        "images": [image],
                    }
                ],
                "format": PAGE_SCHEMA,
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0,
                    "num_predict": 2048,
                },
            },
            timeout=OLLAMA_TIMEOUT_SECONDS,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Ollama screen import failed: {response.text[:300]}")
        body = response.json()
        content = str((body.get("message") or {}).get("content") or "")
        parsed = _parse_structured_response(content, 1)
        tasks = _normalise_page_tasks(parsed.get("tasks"), 1)

        return {
            "ok": True,
            "agentVersion": AGENT_VERSION,
            "trained": True,
            "modelType": "ollama_qwen_vision",
            "ollamaModel": self.model,
            "fileName": filename,
            "title": _clean_text(parsed.get("documentTitle")) or _title_from_filename(filename),
            "rawText": "",
            "tasks": tasks,
            "stats": {
                "pages": 1,
                "tasks": len(tasks),
                "confidence": None,
            },
        }

    def import_solution_image(self, image_bytes: bytes, filename: str = "solution.png") -> dict[str, Any]:
        installed = ollama_status()
        if not installed["available"]:
            raise RuntimeError(f"Ollama is unavailable at {OLLAMA_BASE_URL}: {installed.get('error', 'no response')}")
        if not installed["modelInstalled"]:
            raise RuntimeError(f"Ollama model {self.model} is not installed. Run: ollama pull {self.model}")

        image = base64.b64encode(image_bytes).decode("ascii")
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": _solution_prompt(filename),
                        "images": [image],
                    }
                ],
                "format": SOLUTION_SCHEMA,
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0,
                    "num_predict": 2048,
                },
            },
            timeout=OLLAMA_TIMEOUT_SECONDS,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Ollama solution import failed: {response.text[:300]}")
        body = response.json()
        raw_content = str((body.get("message") or {}).get("content") or "")
        parsed = _parse_structured_response(raw_content, 1)
        return {
            "ok": True,
            "agentVersion": AGENT_VERSION,
            "trained": True,
            "modelType": "ollama_qwen_vision",
            "ollamaModel": self.model,
            "fileName": filename,
            "content": _clean_content(parsed.get("content")),
        }

    def import_pdf(self, pdf_bytes: bytes, filename: str = "arkusz.pdf") -> dict[str, Any]:
        if fitz is None:
            raise RuntimeError("PyMuPDF is required for the Ollama PDF importer.")

        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        if not doc.page_count:
            raise RuntimeError("PDF has no pages.")

        installed = ollama_status()
        if not installed["available"]:
            raise RuntimeError(f"Ollama is unavailable at {OLLAMA_BASE_URL}: {installed.get('error', 'no response')}")
        if not installed["modelInstalled"]:
            raise RuntimeError(f"Ollama model {self.model} is not installed. Run: ollama pull {self.model}")

        tasks: list[dict[str, Any]] = []
        document_title = ""
        raw_pages: list[str] = []
        previous_number = ""
        for page_index, page in enumerate(doc, start=1):
            text_hint = _page_text_hint(page)
            raw_pages.append(text_hint)
            if not previous_number and not _has_task_header_hint(text_hint):
                continue
            page_result = self._read_page(page, page_index, doc.page_count, text_hint, previous_number)
            title_candidate = _clean_text(page_result.get("documentTitle"))
            if not document_title and _is_document_title_candidate(title_candidate):
                document_title = title_candidate
            page_tasks = _normalise_page_tasks(page_result.get("tasks"), page_index)
            if page_tasks:
                previous_number = str(page_tasks[-1]["number"])
            tasks = _merge_tasks(tasks, page_tasks)

        _attach_visuals(tasks, extract_task_visuals(pdf_bytes))
        return {
            "ok": True,
            "agentVersion": AGENT_VERSION,
            "trained": True,
            "modelType": "ollama_qwen_vision",
            "ollamaModel": self.model,
            "fileName": filename,
            "title": document_title or _title_from_filename(filename),
            "rawText": "\n\n--- STRONA ---\n\n".join(raw_pages),
            "tasks": tasks,
            "stats": {
                "pages": doc.page_count,
                "tasks": len(tasks),
                "confidence": None,
            },
        }

    def _read_page(
        self,
        page,
        page_number: int,
        page_count: int,
        text_hint: str,
        previous_number: str,
    ) -> dict[str, Any]:
        image = _render_page(page)
        prompt = _page_prompt(page_number, page_count, text_hint, previous_number)
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt,
                        "images": [image],
                    }
                ],
                "format": PAGE_SCHEMA,
                "stream": False,
                "think": False,
                "options": {
                    "temperature": 0,
                    "num_predict": 2048,
                },
            },
            timeout=OLLAMA_TIMEOUT_SECONDS,
        )
        if response.status_code >= 400:
            raise RuntimeError(f"Ollama page {page_number} failed: {response.text[:300]}")
        body = response.json()
        content = str((body.get("message") or {}).get("content") or "")
        return _parse_structured_response(content, page_number)


def _page_prompt(page_number: int, page_count: int, text_hint: str, previous_number: str) -> str:
    continuation = (
        f"The previous page ended with task number {previous_number}. "
        "If this page only continues that task, use that same number."
        if previous_number
        else ""
    )
    return f"""
You transcribe Polish matura mathematics exam tasks from one PDF page.
Read the attached page image as the source of truth. The extracted text below is only a hint.
Return only data that follows the JSON schema.

Page: {page_number} of {page_count}.
{continuation}

Rules:
- Transcribe every visible task statement on this page. Do not solve, shorten, explain, or paraphrase.
- Preserve Polish text. Preserve instructions such as "Zapisz obliczenia." when they belong to the task.
- Ignore answer areas, empty work space, page headers, footers, side scoring boxes, page numbers, barcodes, watermarks, and marking ranges such as "0-1-2".
- `number` must contain the visible task number, for example `4` or `12.1`. If a task continues from the previous page, reuse the previous task number.
- `title` must be EXACTLY `Zadanie <number>`, for example `Zadanie 4`. NO formula, NO task text, NO LaTeX in title ever.
- `documentTitle` is the exam name only, plain text, no LaTeX.
- `maxScore` is the upper score from the task header when visible, otherwise 1.
- The `content` field is plain Polish prose plus LaTeX spans. Do not use Markdown, HTML, TeX code blocks, `$...$`, `$$...$$`, or bare TeX commands outside math delimiters.
- Put every mathematical object in LaTeX without exception: variables, indexed symbols, formulas, equations, inequalities, intervals, coordinates, angle names, sets, functions, answer option values, and units attached to a numeric calculation.
- Use `\\(...\\)` for inline math. Use `\\[...\\]` only for a formula that is visually separated from prose on the page. Do not wrap ordinary Polish words in LaTeX.
- Read digit position from the page image, not from the flattened extracted text hint. A smaller digit raised above the baseline is a power such as `\\(x^{{2}}\\)`. A smaller digit lowered below the baseline is an index such as `\\(x_{{1}}\\)` or `\\(x_{{2}}\\)`. Never merge those digits into `x1`, `x2`, `x^1`, or `x^2` by guessing from OCR text.
- Never leave mathematical notation as OCR text or Unicode math. Write `\\(x^{{2}}\\)`, not `x2`, `x²`, or `x^2` in prose. Write `\\(x_{{1}}\\)`, not `x1` or `x₁` in prose. Write `\\(a \\le b\\)`, not `a <= b` or `a≤b` in prose.
- Superscripts and subscripts always use braces: `^{{...}}` and `_{{...}}`.
- Render fractions with `\\frac`, limits with `\\lim_{{...}}`, logarithm bases with `\\log_{{...}}`, roots with `\\sqrt{{...}}`, binomials with `\\binom{{n}}{{k}}`, vectors with `\\overrightarrow{{...}}` when an arrow is visible, and text inside formulas with `\\text{{...}}`.
- Distinguish binomial coefficients from fractions by the visual shape. A binomial coefficient has two stacked entries inside tall parentheses and NO horizontal fraction bar; write it as `\\binom{{n}}{{k}}`, never as `\\left(\\frac{{n}}{{k}}\\right)`. A fraction has a clear horizontal bar between numerator and denominator; write it as `\\frac{{a}}{{b}}`.
- GOOD binomial: a stacked `n` over `k` inside parentheses -> `\\binom{{n}}{{k}}`. BAD binomial: `\\left(\\frac{{n}}{{k}}\\right)`. GOOD fraction: a visible horizontal bar under `x+1` -> `\\frac{{x+1}}{{2}}`.
- In limits, a stacked expression like `(n+2 over n-1)` inside tall parentheses is still a binomial coefficient: `\\frac{{\\binom{{n+2}}{{n-1}}}}{{\\frac{{1}}{{2}}n^{{3}} - 4n + 7}}`, not `\\frac{{\\frac{{n+2}}{{n-1}}}}{{...}}`.
- Never output raw root, multiplication, relation, infinity, or membership symbols outside LaTeX. Use `\\(\\sqrt{{2}}\\)`, `\\(a \\cdot b\\)`, `\\(m \\neq 0\\)`, `\\(x \\in A\\)`, not `√2`, `a·b`, `m≠0`, or `x∈A` in prose.
- Keep each formula complete, including operators, brackets, domains, answer options, and punctuation around it. Do not replace unread formulas with empty parentheses or invented values.
- GOOD content: `Dana jest funkcja \\(f(x) = 3x^{{2}} - 2x\\). Wyznacz miejsca zerowe.` BAD content: `Dana jest funkcja f(x)=3x2-2x.`
- GOOD content: `Dla \\(x \\in (-\\infty, 2]\\) zachodzi \\(f(x) \\le 0\\).` BAD content: `Dla x ∈ (-∞, 2] zachodzi f(x) <= 0.`
- GOOD content: `Dla \\(m \\neq 0\\) funkcja jest określona wzorem \\[ f(x) = m^{{2}}x^{{2}} - 2mx - m + 1 \\] i ma miejsca zerowe \\(x_{{1}}\\), \\(x_{{2}}\\).` BAD content: `Dla m≠0 funkcja jest określona wzorem f(x)=m^2·x2-2mx-m+1 i ma miejsca zerowe x1, x2.`
- If the page has no task content, return an empty `tasks` array.

Extracted text hint:
```text
{text_hint[:6000]}
```
""".strip()


def _screen_prompt(filename: str) -> str:
    return f"""
You transcribe Polish matura tasks from one screenshot image.
Read the attached image as the source of truth. Return only data that follows the JSON schema.

Image file: {filename}

Rules:
- Transcribe every visible task statement from the screenshot. Do not solve, shorten, explain, or paraphrase.
- Ignore application UI around the task, navigation, buttons, editable fields, browser chrome, preview labels, and answer/work areas.
- If both an editor textarea and a rendered white preview show the same task, use the rendered preview as the source of truth and do not duplicate it.
- `number` must contain the visible task number, for example `4` or `12.1`. If no number is visible, use `1`.
- `title` must be EXACTLY `Zadanie <number>`, for example `Zadanie 4`. NO formula, NO task text, NO LaTeX in title ever.
- `documentTitle` should be empty unless the screenshot visibly contains an exam title.
- `maxScore` is the visible point count if shown near the task, otherwise 1.
- The `content` field is plain Polish prose plus LaTeX spans. Do not use Markdown, HTML, TeX code blocks, `$...$`, `$$...$$`, or bare TeX commands outside math delimiters.
- Put every mathematical object in LaTeX: variables, indexed symbols, formulas, equations, inequalities, intervals, coordinates, functions, answer option values, and units attached to a numeric calculation.
- Use `\\(...\\)` for inline math. Use `\\[...\\]` only for a formula visually separated from prose.
- Superscripts and subscripts always use braces: `^{{...}}` and `_{{...}}`.
- Render fractions with `\\frac`, limits with `\\lim_{{...}}`, logarithm bases with `\\log_{{...}}`, roots with `\\sqrt{{...}}`, binomials with `\\binom{{n}}{{k}}`, and text inside formulas with `\\text{{...}}`.
- Distinguish binomial coefficients from fractions by the visual shape. A binomial coefficient has two stacked entries inside tall parentheses and NO horizontal fraction bar; write it as `\\binom{{n}}{{k}}`, never as `\\left(\\frac{{n}}{{k}}\\right)`. A fraction has a clear horizontal bar between numerator and denominator; write it as `\\frac{{a}}{{b}}`.
- GOOD binomial: a stacked `n` over `k` inside parentheses -> `\\binom{{n}}{{k}}`. BAD binomial: `\\left(\\frac{{n}}{{k}}\\right)`. GOOD fraction: a visible horizontal bar under `x+1` -> `\\frac{{x+1}}{{2}}`.
- In limits, a stacked expression like `(n+2 over n-1)` inside tall parentheses is still a binomial coefficient: `\\frac{{\\binom{{n+2}}{{n-1}}}}{{\\frac{{1}}{{2}}n^{{3}} - 4n + 7}}`, not `\\frac{{\\frac{{n+2}}{{n-1}}}}{{...}}`.
- Never output raw root, multiplication, relation, infinity, or membership symbols outside LaTeX.
- Keep each formula complete, including operators, brackets, domains, answer options, and punctuation around it.
- If the screenshot has no task content, return an empty `tasks` array.
""".strip()


def _solution_prompt(filename: str) -> str:
    return f"""
You transcribe a Polish matura solution from one screenshot image.
Read the attached image as the source of truth. Return only data that follows the JSON schema: a single `content` string.

Image file: {filename}

Rules:
- Transcribe the visible solution, calculations, reasoning, and final answer. Do not solve anything that is not written in the image. Do not add missing steps.
- Ignore application UI around the solution, navigation, buttons, browser chrome, empty work areas, and unrelated task text unless it is part of the solution.
- Preserve Polish text and the order of lines.
- The `content` field is plain Polish prose plus LaTeX spans. Do not use Markdown, HTML, TeX code blocks, `$...$`, `$$...$$`, or bare TeX commands outside math delimiters.
- Put every mathematical object in LaTeX: variables, indexed symbols, formulas, equations, inequalities, intervals, coordinates, functions, and numeric expressions.
- Use `\\(...\\)` for inline math. Use `\\[...\\]` for formulas or calculation lines visually separated from prose.
- Superscripts and subscripts always use braces: `^{{...}}` and `_{{...}}`.
- Render fractions with `\\frac`, limits with `\\lim_{{...}}`, logarithm bases with `\\log_{{...}}`, roots with `\\sqrt{{...}}`, binomials with `\\binom{{n}}{{k}}`, and text inside formulas with `\\text{{...}}`.
- Distinguish binomial coefficients from fractions by the visual shape. A binomial coefficient has two stacked entries inside tall parentheses and NO horizontal fraction bar; write it as `\\binom{{n}}{{k}}`, never as `\\left(\\frac{{n}}{{k}}\\right)`.
- In limits, a stacked expression like `(n+2 over n-1)` inside tall parentheses is still a binomial coefficient: `\\frac{{\\binom{{n+2}}{{n-1}}}}{{\\frac{{1}}{{2}}n^{{3}} - 4n + 7}}`, not `\\frac{{\\frac{{n+2}}{{n-1}}}}{{...}}`.
- If the screenshot has no visible solution content, return an empty string.
""".strip()


def _render_page(page) -> str:
    pixmap = page.get_pixmap(matrix=fitz.Matrix(OLLAMA_PAGE_SCALE, OLLAMA_PAGE_SCALE), alpha=False)
    return base64.b64encode(pixmap.tobytes("png")).decode("ascii")


def _page_text_hint(page) -> str:
    text = str(page.get_text("text") or "")
    lines = [_clean_text(line) for line in text.splitlines()]
    return "\n".join(line for line in lines if line)


def _has_task_header_hint(text: str) -> bool:
    return bool(re.search(r"\bZ\s*adanie\s+\d+", text, re.IGNORECASE))


def _parse_structured_response(content: str, page_number: int) -> dict[str, Any]:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
    try:
        payload = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Ollama returned invalid JSON for page {page_number}: {content[:300]}") from exc
    return payload if isinstance(payload, dict) else {"documentTitle": "", "tasks": []}


def _normalise_page_tasks(raw_tasks: Any, page_number: int) -> list[dict[str, Any]]:
    tasks = []
    for raw in raw_tasks if isinstance(raw_tasks, list) else []:
        if not isinstance(raw, dict):
            continue
        number = _task_number(raw.get("number") or raw.get("title"))
        content = _clean_content(raw.get("content"))
        if not number or len(content) < 5:
            continue
        score = _score(raw.get("maxScore"))
        number_label = f"{number:g}" if isinstance(number, float) else str(number)
        tasks.append(
            {
                "number": number,
                "title": f"Zadanie {number_label}",
                "content": content,
                "maxScore": score,
                "enabled": True,
                "type": _task_type(content),
                "sourcePage": page_number,
                "sourceLine": None,
            }
        )
    return tasks


def _merge_tasks(existing: list[dict[str, Any]], page_tasks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_number = {str(task["number"]): task for task in existing}
    for task in page_tasks:
        key = str(task["number"])
        previous = by_number.get(key)
        if previous is None:
            existing.append(task)
            by_number[key] = task
            continue
        if task["content"] not in previous["content"]:
            previous["content"] = f"{previous['content']}\n\n{task['content']}".strip()
        previous["maxScore"] = max(previous["maxScore"], task["maxScore"])
        previous["type"] = _task_type(previous["content"])
    return existing


def _attach_visuals(tasks: list[dict[str, Any]], visuals: dict[int, list[dict]]) -> None:
    for task in tasks:
        key = task["number"]
        task_visuals = visuals.get(key)
        if not task_visuals and isinstance(key, float) and key.is_integer():
            task_visuals = visuals.get(int(key))
        figures = "\n".join(item["html"] for item in task_visuals or [] if item.get("html"))
        if figures:
            task["content"] = f"{task['content']}\n\n{figures}".strip()
            task["hasVisuals"] = True


def _task_number(value: Any) -> int | float | None:
    text = _clean_text(value).replace(",", ".")
    match = re.search(r"\d+(?:\.\d+)?", text)
    if not match:
        return None
    number = float(match.group(0))
    return int(number) if number.is_integer() else number


def _score(value: Any) -> int:
    try:
        return max(1, int(value))
    except (TypeError, ValueError):
        return 1


def _clean_text(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _clean_content(value: Any) -> str:
    lines = [
        normalize_text(_preserve_visual_scripts(line)).rstrip()
        for line in str(value or "").replace("\r\n", "\n").splitlines()
        if line.strip()
    ]
    cleaned = apply_learned_corrections(_repair_bare_math("\n".join(lines)))
    cleaned = re.sub(r"\\\[\s*\\\[(.*?)\\\]\s*\\\]", r"\\[\1\\]", cleaned, flags=re.DOTALL)
    cleaned = _repair_binomial_coefficients(cleaned)
    return cleaned.strip()


def _repair_binomial_coefficients(content: str) -> str:
    keyword_pattern = re.compile(
        r"(dwumian|dwumianow|newton|symbol\s+newtona|kombinacj|bernoull|schemat\s+bernoull)",
        re.IGNORECASE,
    )
    frac_pattern = re.compile(
        r"(?:\\left\s*)?\(\s*\\frac\{((?:\{[^{}]+\}|[^{}\n])*)\}\{((?:\{[^{}]+\}|[^{}\n])*)\}\s*(?:\\right\s*)?\)"
    )
    nested_numerator_pattern = re.compile(
        r"\\frac\{\s*\\frac\{((?:\{[^{}]+\}|[^{}\n])*)\}\{((?:\{[^{}]+\}|[^{}\n])*)\}\s*\}\{"
    )

    def strip_outer(value: str) -> str:
        text = value.strip()
        while text.startswith("{") and text.endswith("}"):
            inner = text[1:-1].strip()
            if not inner:
                break
            text = inner
        return text

    def simple_binom_part(value: str) -> bool:
        text = strip_outer(value)
        if re.fullmatch(r"[A-Za-z](?:_\{?[A-Za-z0-9]+\}?)?(?:\s*[+-]\s*\d+)?", text):
            return True
        if re.fullmatch(r"\d+", text):
            return True
        return False

    def affine_variable(value: str) -> str:
        text = strip_outer(value).replace(" ", "")
        match = re.fullmatch(r"([A-Za-z])(?:_\{?[A-Za-z0-9]+\}?)?(?:[+-]\d+)?", text)
        return match.group(1).lower() if match else ""

    def should_repair(match: re.Match, top: str, bottom: str) -> bool:
        before = content[max(0, match.start() - 120) : match.start()]
        after = content[match.end() : match.end() + 120]
        has_context = bool(keyword_pattern.search(before) or keyword_pattern.search(after))
        looks_like_n_choose_k = top in {"n", "N"} and bottom in {"k", "K", "r", "R"}
        top_var = affine_variable(top)
        bottom_var = affine_variable(bottom)
        same_variable_stack = bool(top_var and top_var == bottom_var and not bottom.strip().isdigit())
        limit_stack = same_variable_stack and "\\lim" in before
        outer_fraction_numerator = same_variable_stack and re.search(r"\\frac\{\s*$", before) is not None
        if not (has_context or looks_like_n_choose_k or limit_stack or outer_fraction_numerator):
            return False
        if not (simple_binom_part(top) and simple_binom_part(bottom)):
            return False
        if top.isdigit() and bottom.isdigit() and not has_context:
            return False
        return True

    def replace(match: re.Match) -> str:
        top = strip_outer(match.group(1))
        bottom = strip_outer(match.group(2))
        if not should_repair(match, top, bottom):
            return match.group(0)
        return rf"\binom{{{top}}}{{{bottom}}}"

    def replace_nested(match: re.Match) -> str:
        top = strip_outer(match.group(1))
        bottom = strip_outer(match.group(2))
        if not should_repair(match, top, bottom):
            return match.group(0)
        return rf"\frac{{\binom{{{top}}}{{{bottom}}}}}{{"

    repaired = nested_numerator_pattern.sub(replace_nested, content)
    return frac_pattern.sub(replace, repaired)


def _preserve_visual_scripts(value: str) -> str:
    superscripts = str.maketrans({"⁰": "^{0}", "¹": "^{1}", "²": "^{2}", "³": "^{3}", "⁴": "^{4}", "⁵": "^{5}", "⁶": "^{6}", "⁷": "^{7}", "⁸": "^{8}", "⁹": "^{9}"})
    subscripts = str.maketrans({"₀": "_{0}", "₁": "_{1}", "₂": "_{2}", "₃": "_{3}", "₄": "_{4}", "₅": "_{5}", "₆": "_{6}", "₇": "_{7}", "₈": "_{8}", "₉": "_{9}"})
    return str(value or "").translate(superscripts).translate(subscripts)


def _repair_bare_math(content: str) -> str:
    parts = re.split(r"(\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))", content)
    return "".join(part if _has_math_delimiters(part) else _repair_bare_math_text(part) for part in parts)


def _repair_bare_math_text(value: str) -> str:
    lines = []
    for line in value.splitlines(keepends=True):
        ending = "\n" if line.endswith("\n") else ""
        body = line[:-1] if ending else line
        body = _normalise_plain_math_symbols(body)
        body = _wrap_math_only_line(body)
        if not _has_math_delimiters(body.lstrip()):
            body = _wrap_common_inline_math(body)
            body = _wrap_simple_inline_products(body)
        lines.append(f"{body}{ending}")
    return "".join(lines)


def _normalise_plain_math_symbols(value: str) -> str:
    result = value
    result = result.replace("√", r"\sqrt")
    result = result.replace("·", r" \cdot ").replace("⋅", r" \cdot ")
    result = result.replace("×", r" \times ").replace("÷", r" \div ")
    result = result.replace("≤", r" \le ").replace("≥", r" \ge ").replace("≠", r" \neq ")
    result = result.replace("∞", r"\infty").replace("∈", r" \in ").replace("∉", r" \notin ")
    result = re.sub(r"\\sqrt\s*\(([^()\n]+)\)", r"\\sqrt{\1}", result)
    result = re.sub(r"\\sqrt\s*([A-Za-z0-9]+)", r"\\sqrt{\1}", result)
    result = re.sub(r"\s{2,}", " ", result)
    return result


def _wrap_math_only_line(value: str) -> str:
    stripped = value.strip()
    if not stripped or not re.search(r"(?:=|\\(?:le|ge|neq)|[<>])", stripped):
        return value
    words = re.findall(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{3,}", stripped)
    if any(word.lower() not in {"sin", "cos", "tan", "ctg", "log", "lim", "cdot", "times", "div", "sqrt", "frac", "neq", "le", "ge"} for word in words):
        return value
    if re.search(r"\bx1\b.*\bx2\b|\bx2\b.*\bx1\b", stripped):
        stripped = re.sub(r"\b([A-Za-z])([0-9]+)\b", r"\1_{\2}", stripped)
    else:
        stripped = re.sub(r"\b([A-Za-z])\s*\^\s*([A-Za-z0-9]+)", r"\1^{\2}", stripped)
        stripped = re.sub(r"\b([A-Za-z])([23])(?=$|[\s.,;:+\-*/<>=])", r"\1^{\2}", stripped)
    indent = value[: len(value) - len(value.lstrip())]
    return f"{indent}\\[ {stripped} \\]"


def _wrap_common_inline_math(value: str) -> str:
    if re.search(r"miejsc[ae]\s+zerow", value, re.IGNORECASE):
        value = re.sub(r"\b([A-Za-z])([0-9]+)\b", r"\\(\1_{\2}\\)", value)
    value = re.sub(
        r"(?<!\\\()([A-Za-z](?:_\{[^}]+\}|\^\{[^}]+\})?)\s*\\neq\s*([A-Za-z0-9]+)(?!\\\))",
        r"\\(\1 \\neq \2\\)",
        value,
    )
    value = re.sub(
        r"\b(przedziału|przedzialu)\s+(\([^()\n]+\)|\[[^\[\]\n]+\])",
        lambda match: f"{match.group(1)} \\({match.group(2)}\\)",
        value,
        flags=re.IGNORECASE,
    )
    return value


def _wrap_simple_inline_products(value: str) -> str:
    atom = r"(?:\\sqrt\{[^{}\n]+\}|[A-Za-z](?:_\{[^{}\n]+\}|\^\{[^{}\n]+\})?|[0-9]+)"
    value = re.sub(rf"(?<!\\\()({atom}\s*\\(?:cdot|times|div)\s*{atom})(?!\\\))", r"\\(\1\\)", value)
    value = re.sub(r"(?<!\\\()(\\sqrt\{[^{}\n]+\})(?!\\\))", r"\\(\1\\)", value)
    return value


def _has_math_delimiters(value: str) -> bool:
    return value.startswith("\\(") or value.startswith("\\[")


def _task_type(content: str) -> str:
    return "closed" if re.search(r"\bA\.\s+.+\bB\.\s+.+\bC\.", content, re.IGNORECASE | re.DOTALL) else "ai_open"


def _is_document_title_candidate(value: str) -> bool:
    return bool(value and not re.match(r"Zadanie\b", value, re.IGNORECASE))


def _title_from_filename(filename: str) -> str:
    name = Path(filename).stem.replace("_", " ").replace("-", " ").strip()
    return " ".join(part.capitalize() for part in name.split()) if name else "Arkusz z PDF"
