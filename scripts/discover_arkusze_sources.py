from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path
from urllib.parse import urljoin

import requests

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUT = ROOT / "pdf_agent" / "sources.json"

BASE_URL = "https://arkusze.pl"
CATEGORY_URLS = [
    "https://arkusze.pl/matura-matematyka-rozszerzona/",
    "https://arkusze.pl/matura-matematyka-podstawowa/",
]

PDF_EXCLUDE_RE = re.compile(
    r"(odpowiedzi|rozwiazania|rozwiązania|zasady|schemat|kryteria|model|transkrypcja|nagranie|brudnopis)",
    re.IGNORECASE,
)


def fetch(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "MaturaLab source discovery"})
    response.raise_for_status()
    return response.text


def hrefs(page_html: str, base: str) -> list[str]:
    links = []
    for match in re.finditer(r"href=[\"']([^\"']+)[\"']", page_html):
        link = html.unescape(match.group(1))
        if link.startswith("#") or link.startswith("mailto:"):
            continue
        links.append(urljoin(base, link))
    return links


def candidate_page_urls(include_generated: bool = False) -> list[str]:
    urls: set[str] = set()
    for category in CATEGORY_URLS:
        try:
            for link in hrefs(fetch(category), category):
                if _looks_like_math_exam_page(link):
                    urls.add(link)
        except requests.RequestException as exc:
            print(f"Pomijam kategorię {category}: {exc}")

    years = range(2020, 2027)
    terms = ["maj", "czerwiec", "sierpien", "styczen", "luty", "marzec", "listopad", "grudzien"]
    levels = ["podstawowy", "rozszerzony"]
    prefixes = ["matura-matematyka", "matura-probna-matematyka"]
    for year in years:
        for level in levels:
            for term in (terms if include_generated else ["maj"]):
                for prefix in prefixes:
                    urls.add(f"{BASE_URL}/{prefix}-{year}-{term}-poziom-{level}/")
    return sorted(urls)


def discover_sources(limit_pages: int | None = None, include_generated: bool = False) -> list[dict]:
    sources: dict[str, dict] = {}
    pages = candidate_page_urls(include_generated)
    if limit_pages:
        pages = pages[:limit_pages]

    for index, page_url in enumerate(pages, start=1):
        try:
            page = fetch(page_url)
        except requests.RequestException:
            continue

        title = _title(page) or _title_from_url(page_url)
        for pdf_url in hrefs(page, page_url):
            if ".pdf" not in pdf_url.lower():
                continue
            if "arkusze.pl" not in pdf_url:
                continue
            if PDF_EXCLUDE_RE.search(pdf_url):
                continue
            if "matematyka" not in pdf_url.lower():
                continue
            meta = _metadata(pdf_url, title)
            sources.setdefault(meta["id"], meta)

        if index % 50 == 0:
            print(f"Sprawdzono stron: {index}, znaleziono PDF: {len(sources)}")

    return sorted(sources.values(), key=lambda row: (row["subject"], row["level"], row["year"], row["id"]))


def _looks_like_math_exam_page(url: str) -> bool:
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    return slug.startswith("matura-") and "matematyka" in slug and "poziom-" in slug


def _title(page_html: str) -> str:
    match = re.search(r"<title>(.*?)</title>", page_html, re.IGNORECASE | re.DOTALL)
    if not match:
        return ""
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", "", match.group(1)))).strip()


def _title_from_url(url: str) -> str:
    slug = url.rstrip("/").rsplit("/", 1)[-1]
    return slug.replace("-", " ")


def _metadata(pdf_url: str, page_title: str) -> dict:
    stem = Path(pdf_url.split("?", 1)[0]).stem
    normalized = stem.lower().replace("_", "-")
    year_match = re.search(r"(20\d{2}|19\d{2})", normalized)
    year = int(year_match.group(1)) if year_match else 0
    level = "rozszerzony" if "rozszerz" in normalized else "podstawowy" if "podstaw" in normalized else "nieznany"
    term = next((item for item in ["maj", "czerwiec", "sierpien", "styczen", "luty", "marzec", "listopad", "grudzien"] if item in normalized), "arkusz")
    legacy = "stara" in normalized
    sample = "probna" in normalized or "przykladow" in normalized
    kind = "stara" if legacy else "probna" if sample else "cke"
    return {
        "id": re.sub(r"[^a-z0-9]+", "_", normalized).strip("_"),
        "title": page_title.split(" - Arkusze", 1)[0] or stem.replace("-", " "),
        "subject": "matematyka",
        "level": level,
        "year": year,
        "term": term,
        "kind": kind,
        "url": pdf_url,
        "source": "arkusze.pl",
    }


def merge_sources(existing_path: Path, discovered: list[dict]) -> list[dict]:
    existing = json.loads(existing_path.read_text(encoding="utf-8")) if existing_path.exists() else []
    merged: dict[str, dict] = {}
    for row in existing + discovered:
        key = row.get("url") or row.get("id")
        merged[key] = row
    return sorted(merged.values(), key=lambda row: (row.get("subject", ""), row.get("level", ""), row.get("year", 0), row.get("id", "")))


def main() -> None:
    parser = argparse.ArgumentParser(description="Discover public Arkusze.pl math PDF sources.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--replace", action="store_true", help="Write only discovered sources instead of merging with the existing file.")
    parser.add_argument("--limit-pages", type=int, default=None)
    parser.add_argument("--include-generated", action="store_true", help="Also probe many generated page URL variants.")
    args = parser.parse_args()

    discovered = discover_sources(args.limit_pages, args.include_generated)
    sources = discovered if args.replace else merge_sources(args.out, discovered)
    args.out.write_text(json.dumps(sources, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"discovered": len(discovered), "written": len(sources), "out": str(args.out)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
