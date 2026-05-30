from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent
DATA_DIR = ROOT / "data" / "feedback"
CORRECTIONS_PATH = DATA_DIR / "import_corrections.jsonl"
LATEX_MEMORY_PATH = DATA_DIR / "latex_corrections.json"


def append_import_feedback(payload: dict[str, Any]) -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tasks = payload.get("tasks") if isinstance(payload.get("tasks"), list) else []

    entries = []
    for task in tasks:
        if not isinstance(task, dict):
            continue
        imported = _clean_content(task.get("importedContent"))
        corrected = _clean_content(task.get("correctedContent"))
        if not imported and not corrected:
            continue
        entries.append(
            {
                "createdAt": now,
                "fileName": str(payload.get("fileName") or ""),
                "title": str(payload.get("title") or ""),
                "subjectId": str(payload.get("subjectId") or ""),
                "levelId": str(payload.get("levelId") or ""),
                "agentMeta": payload.get("agentMeta") if isinstance(payload.get("agentMeta"), dict) else {},
                "number": task.get("number"),
                "sourcePage": task.get("sourcePage"),
                "sourceLine": task.get("sourceLine"),
                "maxScore": task.get("maxScore"),
                "enabled": task.get("enabled") is not False,
                "importedTitle": str(task.get("importedTitle") or ""),
                "correctedTitle": str(task.get("correctedTitle") or ""),
                "importedContent": imported,
                "correctedContent": corrected,
                "changed": imported != corrected or str(task.get("importedTitle") or "") != str(task.get("correctedTitle") or ""),
            }
        )

    if not entries:
        return feedback_status()

    with CORRECTIONS_PATH.open("a", encoding="utf-8") as out:
        for entry in entries:
            out.write(json.dumps(entry, ensure_ascii=False) + "\n")

    learned = update_latex_memory(entries)
    status = feedback_status()
    status["acceptedTasks"] = len(entries)
    status["learnedCorrections"] = learned
    return status


def update_latex_memory(entries: list[dict[str, Any]], memory_path: Path = LATEX_MEMORY_PATH) -> int:
    memory = _load_memory(memory_path)
    learned = 0
    for entry in entries:
        imported = str(entry.get("importedContent") or "")
        corrected = str(entry.get("correctedContent") or "")
        for before, after in _line_correction_pairs(imported, corrected):
            item = memory.setdefault(before, {"replacement": after, "count": 0, "lastSeen": ""})
            if item.get("replacement") != after:
                item["replacement"] = after
                item["count"] = 0
            item["count"] = int(item.get("count") or 0) + 1
            item["lastSeen"] = str(entry.get("createdAt") or "")
            learned += 1

    if learned:
        memory_path.parent.mkdir(parents=True, exist_ok=True)
        memory_path.write_text(json.dumps(memory, ensure_ascii=False, indent=2), encoding="utf-8")
    return learned


def apply_learned_corrections(content: str) -> str:
    memory = _load_memory()
    if not memory or not content:
        return content

    output = []
    changed = False
    for line in content.splitlines():
        key = line.strip()
        item = memory.get(key)
        if item and int(item.get("count") or 0) >= 1:
            replacement = str(item.get("replacement") or "").strip()
            if replacement:
                output.append(replacement)
                changed = changed or replacement != line
                continue
        output.append(line)
    return "\n".join(output).strip() if changed else content


def feedback_status() -> dict[str, Any]:
    total = 0
    changed = 0
    last_seen = ""
    if CORRECTIONS_PATH.exists():
        for line in CORRECTIONS_PATH.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            total += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            if row.get("changed"):
                changed += 1
            last_seen = str(row.get("createdAt") or last_seen)

    memory = _load_memory()
    return {
        "feedbackPath": str(CORRECTIONS_PATH),
        "latexMemoryPath": str(LATEX_MEMORY_PATH),
        "feedbackTasks": total,
        "changedTasks": changed,
        "latexCorrections": len(memory),
        "lastFeedbackAt": last_seen or None,
    }


def _load_memory(memory_path: Path = LATEX_MEMORY_PATH) -> dict[str, dict[str, Any]]:
    if not memory_path.exists():
        return {}
    try:
        data = json.loads(memory_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    if not isinstance(data, dict):
        return {}
    return {str(key): value for key, value in data.items() if isinstance(value, dict)}


def _line_correction_pairs(imported: str, corrected: str) -> list[tuple[str, str]]:
    imported_lines = [_normalise_line(line) for line in imported.splitlines()]
    corrected_lines = [_normalise_line(line) for line in corrected.splitlines()]
    imported_lines = [line for line in imported_lines if _usable_training_line(line)]
    corrected_lines = [line for line in corrected_lines if _usable_training_line(line)]
    if len(imported_lines) != len(corrected_lines):
        return []

    pairs = []
    for before, after in zip(imported_lines, corrected_lines):
        if before == after or not _usable_training_pair(before, after):
            continue
        pairs.append((before, after))
    return pairs


def _clean_content(value: Any) -> str:
    text = str(value or "").replace("\r\n", "\n").replace("\r", "\n")
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()


def _normalise_line(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def _usable_training_line(value: str) -> bool:
    if not value or len(value) < 4 or len(value) > 260:
        return False
    if "<figure" in value or "data:image" in value:
        return False
    return True


def _usable_training_pair(before: str, after: str) -> bool:
    if not _usable_training_line(before) or not _usable_training_line(after):
        return False
    if abs(len(before) - len(after)) > max(40, len(before) * 0.6):
        return False
    return "\\" in after or "\\" in before or any(symbol in before + after for symbol in "≤≥≠√∞π")
