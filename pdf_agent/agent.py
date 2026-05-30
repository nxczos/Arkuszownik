from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from pdf_agent.text_tools import (
        cleanup_task_lines,
        extract_pdf_lines,
        feature_text,
        is_answer_area,
        is_noise,
        is_task_header,
        parse_task_number,
        points_from_header,
    )
    from pdf_agent.feedback import apply_learned_corrections
    from pdf_agent.visuals import extract_task_visuals, strip_side_score_lines
else:
    from .text_tools import (
        cleanup_task_lines,
        extract_pdf_lines,
        feature_text,
        is_answer_area,
        is_noise,
        is_task_header,
        parse_task_number,
        points_from_header,
    )
    from .feedback import apply_learned_corrections
    from .visuals import extract_task_visuals, strip_side_score_lines


ROOT = Path(__file__).resolve().parent
CPU_MODEL_PATH = ROOT / "model" / "pdf_line_classifier.joblib"
GPU_MODEL_PATH = ROOT / "model" / "gpu" / "pdf_line_classifier_gpu.pt"
DEFAULT_MODEL_PATH = Path(os.environ.get("PDF_AGENT_MODEL_PATH", CPU_MODEL_PATH))
AGENT_VERSION = "0.5.0"


class TorchPdfLineClassifier:
    def __init__(self, model_path: Path):
        try:
            import torch
            from torch import nn
        except ImportError as exc:
            raise RuntimeError("Torch is required to load a .pt PDF agent model.") from exc

        vectorizer_path = model_path.with_name("pdf_line_vectorizer.joblib")
        if not vectorizer_path.exists():
            raise FileNotFoundError(f"Torch model vectorizer is missing: {vectorizer_path}")

        payload = torch.load(model_path, map_location="cpu", weights_only=True)
        hidden_sizes = payload["hiddenSizes"]
        self.labels = payload["labels"]
        self.vectorizer = joblib.load(vectorizer_path)
        self.torch = torch
        self.net = nn.Sequential(
            nn.Linear(payload["featureCount"], hidden_sizes[0]),
            nn.ReLU(),
            nn.Dropout(0.12),
            nn.Linear(hidden_sizes[0], hidden_sizes[1]),
            nn.ReLU(),
            nn.Dropout(0.08),
            nn.Linear(hidden_sizes[1], len(self.labels)),
        )
        state_dict = {
            key.removeprefix("net."): value
            for key, value in payload["stateDict"].items()
        }
        self.net.load_state_dict(state_dict)
        self.net.eval()

    def predict(self, features: list[str]) -> list[str]:
        matrix = self.vectorizer.transform(features)
        labels: list[str] = []
        with self.torch.no_grad():
            for start in range(0, matrix.shape[0], 256):
                batch = matrix[start : start + 256].toarray().astype(np.float32, copy=False)
                indices = self.net(self.torch.from_numpy(batch)).argmax(dim=1).tolist()
                labels.extend(self.labels[index] for index in indices)
        return labels


class PdfSheetAgent:
    def __init__(self, model_path: str | Path = DEFAULT_MODEL_PATH):
        self.model_path = Path(model_path)
        self.model = None
        self.model_type = "fallback_rules"
        if self.model_path.exists():
            if self.model_path.suffix.lower() == ".pt":
                self.model = TorchPdfLineClassifier(self.model_path)
                self.model_type = "torch_tfidf_mlp"
            else:
                self.model = joblib.load(self.model_path)
                self.model_type = "joblib_tfidf_mlp"

    @property
    def is_trained(self) -> bool:
        return self.model is not None

    def import_pdf(self, pdf_bytes: bytes, filename: str = "arkusz.pdf") -> dict[str, Any]:
        records = extract_pdf_lines(pdf_bytes)
        records = strip_side_score_lines(pdf_bytes, records)
        labelled = self._label(records)
        tasks = self._segment_tasks(labelled)
        visuals = extract_task_visuals(pdf_bytes)
        self._attach_visuals(tasks, visuals)
        raw_text = self._raw_text(labelled)
        title = self._title_guess(filename, records)

        return {
            "ok": True,
            "agentVersion": AGENT_VERSION,
            "trained": self.is_trained,
            "modelPath": str(self.model_path),
            "modelType": self.model_type,
            "fileName": filename,
            "title": title,
            "rawText": raw_text,
            "tasks": tasks,
            "stats": {
                "lines": len(records),
                "tasks": len(tasks),
                "confidence": self._confidence(records),
            },
        }

    def _label(self, records: list[dict]) -> list[dict]:
        if not records:
            return []

        if self.model is None:
            labels = [self._fallback_label(record) for record in records]
        else:
            labels = list(self.model.predict([feature_text(record) for record in records]))

        labelled = []
        for record, label in zip(records, labels):
            text = record["text"]
            if is_task_header(text):
                label = "task_header"
            elif is_noise(text):
                label = "noise"
            elif is_answer_area(text):
                label = "answer_area"
            labelled.append({**record, "label": label})
        return labelled

    def _fallback_label(self, record: dict) -> str:
        text = record["text"]
        if is_task_header(text):
            return "task_header"
        if is_noise(text):
            return "noise"
        if is_answer_area(text):
            return "answer_area"
        return "task_body"

    def _segment_tasks(self, labelled: list[dict]) -> list[dict]:
        tasks: list[dict] = []
        current: dict | None = None
        preambles: dict[int, str] = {}

        def close_current() -> None:
            nonlocal current
            if not current:
                return
            content = apply_learned_corrections(cleanup_task_lines(current.pop("lines")))
            if len(content) >= 5:
                number = current["number"]
                if current.pop("isPreamble", False):
                    preambles[int(number)] = content
                    current = None
                    return
                if isinstance(number, float):
                    intro = preambles.get(int(number))
                    if intro and not content.startswith(intro):
                        content = f"{intro}\n\n{content}"
                current["content"] = content
                current["type"] = self._task_type(content)
                tasks.append(current)
            current = None

        for record in labelled:
            text = record["text"]
            label = record["label"]

            if label == "task_header":
                close_current()
                number = parse_task_number(text) or len(tasks) + 1
                header_match = re.search(r"(?:\d+(?:\.\d+)?\.\s*)?Z\s*adanie\s+\d+(?:\s*[.,]\s*\d+)?\.?\s*(?:\(\s*0\s*[-–]\s*\d+\s*\))?", text, re.IGNORECASE)
                remainder = text[header_match.end() :].strip() if header_match else ""
                current = {
                    "number": number,
                    "title": f"Zadanie {number:g}" if isinstance(number, float) else f"Zadanie {number}",
                    "maxScore": points_from_header(text, 1),
                    "enabled": True,
                    "sourcePage": record["page"],
                    "sourceLine": record["line"],
                    "isPreamble": not re.search(r"\(\s*0\s*[-–]\s*\d+\s*\)|\(\s*\d+\s*pkt\.?\s*\)", text, re.IGNORECASE),
                    "lines": [],
                }
                number_label = f"{number:g}" if isinstance(number, float) else str(number)
                if remainder and not re.fullmatch(rf"{re.escape(number_label)}\.\s*", remainder):
                    current["lines"].append(remainder)
                continue

            if not current:
                continue

            if label == "task_body":
                current["lines"].append(self._strip_current_task_margin_number(record, current["number"]))

        close_current()
        return self._dedupe_tasks(tasks)

    def _dedupe_tasks(self, tasks: list[dict]) -> list[dict]:
        result: list[dict] = []
        seen: set[int] = set()
        for task in tasks:
            number = task["number"]
            if number in seen:
                continue
            seen.add(number)
            result.append(task)
        return result

    def _strip_current_task_margin_number(self, record: dict, task_number: int | float) -> dict:
        text = str(record.get("text", ""))
        escaped_number = re.escape(f"{task_number:g}" if isinstance(task_number, float) else str(task_number))
        if re.fullmatch(rf"\s*{escaped_number}\.\s*", text):
            return {**record, "text": ""}
        text = re.sub(rf"^\s*{escaped_number}\.\s+(?=[^\W\d_])", "", text)
        return {**record, "text": text}

    def _attach_visuals(self, tasks: list[dict], visuals: dict[int, list[dict]]) -> None:
        for task in tasks:
            task_visuals = visuals.get(task["number"], [])
            if not task_visuals:
                continue
            figures = "\n".join(item["html"] for item in task_visuals if item.get("html"))
            if not figures:
                continue
            task["content"] = f"{self._remove_visual_label_noise(task['content'])}\n\n{figures}".strip()
            task["hasVisuals"] = True

    def _remove_visual_label_noise(self, content: str) -> str:
        lines = []
        for line in content.splitlines():
            stripped = line.strip()
            if not stripped:
                lines.append(line)
                continue
            if self._looks_like_visual_label(stripped):
                continue
            lines.append(line)
        return "\n".join(lines).strip()

    def _looks_like_visual_label(self, line: str) -> bool:
        if len(line) > 48:
            return False
        if line.lower() in {"liczba", "uczniow", "uczniów", "ocena", "x", "y"}:
            return True
        if re.fullmatch(r"(liczba|uczniow|uczniów|ocena)\s*\d*", line, re.IGNORECASE):
            return True
        if re.search(r"\b(dla|jest|oraz|oblicz|wykaż|zapisz|funkcj|wartość|przedział|odpowiedź)\b", line, re.IGNORECASE):
            return False
        plain = re.sub(r"\\[a-zA-Z]+|[{}()[\]^_=+\-*/.,;:|]", " ", line)
        words = re.findall(r"[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]{2,}", plain)
        if not words:
            return True
        if len(words) <= 4 and all(len(word) <= 3 for word in words):
            return True
        digit_ratio = sum(ch.isdigit() or ch in "-+., " for ch in line) / max(1, len(line))
        return digit_ratio > 0.72

    def _task_type(self, content: str) -> str:
        if re.search(r"\bA\.\s+.+\bB\.\s+.+\bC\.", content, re.IGNORECASE | re.DOTALL):
            return "closed"
        return "ai_open"

    def _raw_text(self, labelled: list[dict]) -> str:
        pages: dict[int, list[str]] = {}
        for record in labelled:
            pages.setdefault(record["page"], []).append(record["text"])
        return "\n\n--- STRONA ---\n\n".join("\n".join(lines) for _, lines in sorted(pages.items()))

    def _title_guess(self, filename: str, records: list[dict]) -> str:
        name = Path(filename).stem.replace("_", " ").replace("-", " ").strip()
        if name:
            return " ".join(part.capitalize() for part in name.split())
        joined = " ".join(record["text"] for record in records[:20])
        subject = "Arkusz"
        for candidate in ["matematyka", "fizyka", "informatyka", "angielski"]:
            if candidate.upper() in joined.upper():
                subject = candidate.capitalize()
                break
        return f"{subject} z PDF"

    def _confidence(self, records: list[dict]) -> float | None:
        if self.model is None or not hasattr(self.model, "predict_proba") or not records:
            return None
        probabilities = self.model.predict_proba([feature_text(record) for record in records])
        return round(float(probabilities.max(axis=1).mean()), 4)


def main() -> None:
    import argparse

    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    parser = argparse.ArgumentParser(description="Import a PDF sheet with the local Arkuszownik agent.")
    parser.add_argument("pdf", help="Path to a PDF file")
    parser.add_argument("--model", default=str(DEFAULT_MODEL_PATH), help="Path to a trained joblib or Torch model")
    args = parser.parse_args()

    agent = PdfSheetAgent(args.model)
    result = agent.import_pdf(Path(args.pdf).read_bytes(), Path(args.pdf).name)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
