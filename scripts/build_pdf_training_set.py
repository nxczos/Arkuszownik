from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from pdf_agent.text_tools import extract_pdf_lines, label_records  # noqa: E402
from pdf_agent.visuals import strip_side_score_lines  # noqa: E402


DEFAULT_SOURCES = ROOT / "pdf_agent" / "sources.json"
DEFAULT_DATASET = ROOT / "pdf_agent" / "data" / "training_lines.jsonl"
DEFAULT_RAW_DIR = ROOT / "pdf_agent" / "data" / "raw"


def load_sources(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8"))


def download(url: str, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.exists() and target.stat().st_size > 1024 and target.read_bytes()[:4] == b"%PDF":
        return
    response = requests.get(url, timeout=45)
    response.raise_for_status()
    if response.content[:4] != b"%PDF":
        raise RuntimeError(f"Źródło nie zwróciło PDF-a: {url}")
    target.write_bytes(response.content)


def build_dataset(
    sources_path: Path,
    out_path: Path,
    raw_dir: Path,
    limit: int | None = None,
    extra_pdfs: list[Path] | None = None,
) -> dict:
    sources = load_sources(sources_path)
    if limit:
        sources = sources[:limit]
    extra_pdfs = extra_pdfs or []

    out_path.parent.mkdir(parents=True, exist_ok=True)
    total = 0
    labels: dict[str, int] = {}

    with out_path.open("w", encoding="utf-8") as out:
        for source in sources:
            pdf_path = raw_dir / f"{source['id']}.pdf"
            print(f"Pobieram/czytam: {source['title']}")
            download(source["url"], pdf_path)
            pdf_bytes = pdf_path.read_bytes()
            records = label_records(strip_side_score_lines(pdf_bytes, extract_pdf_lines(pdf_bytes)))
            for record in records:
                row = {
                    **record,
                    "sourceId": source["id"],
                    "subject": source["subject"],
                    "level": source["level"],
                    "year": source["year"],
                }
                labels[row["label"]] = labels.get(row["label"], 0) + 1
                out.write(json.dumps(row, ensure_ascii=False) + "\n")
                total += 1

        for pdf_path in extra_pdfs:
            if not pdf_path.exists():
                raise FileNotFoundError(pdf_path)
            print(f"Czytam lokalny PDF treningowy: {pdf_path.name}")
            pdf_bytes = pdf_path.read_bytes()
            source = _local_source_metadata(pdf_path)
            records = label_records(strip_side_score_lines(pdf_bytes, extract_pdf_lines(pdf_bytes)))
            for record in records:
                row = {
                    **record,
                    "sourceId": source["id"],
                    "subject": source["subject"],
                    "level": source["level"],
                    "year": source["year"],
                }
                labels[row["label"]] = labels.get(row["label"], 0) + 1
                out.write(json.dumps(row, ensure_ascii=False) + "\n")
                total += 1

    summary = {
        "sources": len(sources) + len(extra_pdfs),
        "publicSources": len(sources),
        "extraLocalSources": len(extra_pdfs),
        "records": total,
        "labels": labels,
        "dataset": str(out_path),
    }
    (out_path.parent / "training_summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    return summary


def _local_source_metadata(pdf_path: Path) -> dict:
    name = pdf_path.stem.lower()
    subject = "matematyka" if "matematyka" in name else "arkusz"
    level = "rozszerzony" if "rozszerzona" in name or "rozszerzony" in name else "podstawowy"
    year_match = next((part for part in name.replace("-", " ").split() if part.isdigit() and len(part) == 4), "0")
    return {
        "id": f"local_{pdf_path.stem}",
        "title": pdf_path.stem.replace("-", " "),
        "subject": subject,
        "level": level,
        "year": int(year_match),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Build a weakly labelled PDF line dataset from public exam sheets.")
    parser.add_argument("--sources", type=Path, default=DEFAULT_SOURCES)
    parser.add_argument("--out", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--extra-pdf", type=Path, action="append", default=[], help="Additional local PDF to include in the weakly labelled training set.")
    args = parser.parse_args()

    summary = build_dataset(args.sources, args.out, args.raw_dir, args.limit, args.extra_pdf)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
