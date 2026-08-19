#!/usr/bin/env python3
"""Local ScrapeGraphAI draft runner. Never writes data/recipes.json or data/exercises.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
SOURCES = json.loads((ROOT / "sources.json").read_text(encoding="utf-8"))


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: scrapegraph_draft.py <url>", file=sys.stderr)
        print("Output is a draft ingredient list on stdout. Run USDA enrich before merge.", file=sys.stderr)
        return 2
    url = sys.argv[1]
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    denied = {row.lower().removeprefix("www.") for row in SOURCES.get("deniedHosts", [])}
    if host in denied:
        print(f"denied source: {host}", file=sys.stderr)
        return 1
    signed = SOURCES.get("signedOffScrapeUrls") or []
    if url not in signed:
        print(
            "no HTML scrape sources are signed off; write a first-party draft instead",
            file=sys.stderr,
        )
        return 1
    try:
        from scrapegraphai.graphs import SmartScraperGraph  # type: ignore
    except ImportError:
        print(
            "install scrapegraphai in .venv-scrape (see scrapegraph-content-ingest skill)",
            file=sys.stderr,
        )
        return 1
    raise SystemExit("signed-off scrape is configured but this runner must still emit drafts only")


if __name__ == "__main__":
    raise SystemExit(main())
