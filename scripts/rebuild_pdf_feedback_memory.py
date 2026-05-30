from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pdf_agent.feedback import CORRECTIONS_PATH, LATEX_MEMORY_PATH, update_latex_memory  # noqa: E402


def read_feedback(path: Path) -> list[dict]:
    if not path.exists():
        return []
    entries = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Niepoprawny JSON w {path}:{line_number}: {exc}") from exc
    return entries


def rebuild(feedback_path: Path, memory_path: Path) -> dict:
    entries = read_feedback(feedback_path)
    if memory_path.exists():
        memory_path.unlink()
    learned = update_latex_memory(entries, memory_path)
    return {
        "feedbackPath": str(feedback_path),
        "memoryPath": str(memory_path),
        "feedbackTasks": len(entries),
        "learnedCorrections": learned,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Rebuild adaptive LaTeX correction memory from PDF import feedback.")
    parser.add_argument("--feedback", type=Path, default=CORRECTIONS_PATH)
    parser.add_argument("--memory", type=Path, default=LATEX_MEMORY_PATH)
    args = parser.parse_args()
    print(json.dumps(rebuild(args.feedback, args.memory), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
