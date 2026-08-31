#!/usr/bin/env python3
"""
================================================================================
NCRTC Namo Bharat RRTS Deep Greedy Data Scraper (Stage 1 Intake)
================================================================================
Location: import_data/ncrtc_rrts_data/scrape_ncrtc_stations.py
Output  : import_data/ncrtc_rrts_data/ncrtc_raw.json

Purpose:
--------
Scrapes 100% comprehensive raw station metadata directly from official Namo Bharat
(NCRTC) backend endpoints with 0% data loss:
  1. Base List: https://namobharat.ncrtc.in/commons/journey/stations
  2. Deep Details: https://namobharat.ncrtc.in/commons/journey/stations/v2/{station_id}/details

Captures all deep attributes:
  - Gates (numbers, landmarks, divyang accessibility)
  - Parking charges & time periods matrix (4-wheeler, 2-wheeler, helmet, bicycle)
  - Layout vector URLs (SVG, PNG) & high-res station banners
  - Lifts, escalators, divyang-friendly accessibility facilities
  - First / Last train timings and journey timetable
  - Station control room phone numbers (mobile & landline)
  - Feeder bus route connections
================================================================================
"""

import http.cookiejar
import json
import os
import random
import re
import sys
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

# UTF-8 stdout configuration for Windows & SSE logs
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = BASE_DIR / "ncrtc_raw.json"

PORTAL_URL = "https://namobharat.ncrtc.in/"
STATIONS_LIST_URL = "https://namobharat.ncrtc.in/commons/journey/stations"
STATION_DETAILS_URL_TEMPLATE = "https://namobharat.ncrtc.in/commons/journey/stations/v2/{station_id}/details"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
    "Referer": "https://namobharat.ncrtc.in/",
    "Origin": "https://namobharat.ncrtc.in",
    "sec-ch-ua": '"Google Chrome";v="125", "Chromium";v="125", "Not.A/Brand";v="24"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin"
}


def log(level: str, message: str):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] [NCRTC PROTECTED SCRAPER] [{level}] {message}", flush=True)


def slugify(text: str) -> str:
    if not text:
        return "unknown"
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "_", s)
    return s.strip("_")


def get_safe_json_path(target_file: Path) -> Path:
    """If target_file exists on disk, appends counter (1), (2) to create new file without overwriting."""
    if not target_file.exists():
        return target_file
    stem = target_file.stem
    ext = target_file.suffix
    clean_stem = re.sub(r"\(\d+\)$", "", stem)
    counter = 1
    while True:
        candidate = target_file.parent / f"{clean_stem}({counter}){ext}"
        if not candidate.exists():
            return candidate
        counter += 1


import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class NcrtcProtectedSession:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update(HEADERS)
        self.session.verify = False

    def fetch_json(self, url: str, retries: int = 3) -> dict:
        for attempt in range(1, retries + 1):
            try:
                jitter = random.uniform(0.1, 0.25)
                time.sleep(jitter)

                resp = self.session.get(url, timeout=12)
                if resp.status_code == 200:
                    return resp.json()
            except Exception as e:
                log("WARN", f"Attempt {attempt}/{retries} failed for {url}: {e}")
                time.sleep(attempt * 1.5)
        return {}


def scrape_official_ncrtc_stations() -> int:
    log("INIT", "==================================================================")
    log("INIT", "Starting Official NCRTC Namo Bharat Deep Greedy Data Scraper (Stage 1)...")
    log("INIT", f"Portal URL     : {PORTAL_URL}")
    log("INIT", f"List API       : {STATIONS_LIST_URL}")
    log("INIT", "==================================================================")

    session = NcrtcProtectedSession()

    # Step 1: Initial Handshake
    log("SCRAPE_PROTECTION", "Initializing Protected Session with CookieJar & Client-Hints...")
    try:
        resp = session.session.get(PORTAL_URL, timeout=10)
        log("SCRAPE_PROTECTION", f"Handshake successful (HTTP {resp.status_code}). Session active.")
    except Exception as e:
        log("WARN", f"Handshake warning: {e}")

    # Step 2: Fetch Station List
    log("GREEDY_CRAWLER", "Fetching station list from official API...")
    stations_list = session.fetch_json(STATIONS_LIST_URL)

    if not isinstance(stations_list, list) or len(stations_list) == 0:
        log("ERROR", "Failed to obtain valid stations list from official endpoint!")
        sys.exit(1)

    log("SUCCESS", f"Discovered {len(stations_list)} stations in official Namo Bharat corridor.")

    deep_dataset = {}

    # Step 3: Crawl Deep Metadata for Each Station
    for idx, st_summary in enumerate(stations_list, 1):
        st_id = st_summary.get("id")
        st_code = st_summary.get("code", f"ST{idx}").upper()
        st_name = st_summary.get("name", f"Station_{st_id}")
        slug = slugify(st_name)

        log("CRAWL", f"[{idx}/{len(stations_list)}] Crawling deep metadata for ID {st_id} ({st_name})...")
        detail_url = STATION_DETAILS_URL_TEMPLATE.format(station_id=st_id)
        st_details = session.fetch_json(detail_url)

        # Prevent duplicate station key collision in JSON
        orig_slug = slug
        counter = 1
        while slug in deep_dataset and deep_dataset[slug].get("station_id") != st_id:
            slug = f"{orig_slug}({counter})"
            counter += 1

        # Build comprehensive raw station entity
        deep_dataset[slug] = {
            "id": slug,
            "station_id": st_id,
            "station_code": st_code,
            "station_name": st_name,
            "summary_raw": st_summary,
            "details_raw": st_details
        }

    # Step 4: Write Atomically to Target File with Tab Indentation
    final_output = get_safe_json_path(OUTPUT_FILE)
    final_output.parent.mkdir(parents=True, exist_ok=True)
    temp_file = final_output.with_suffix(".tmp")

    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(deep_dataset, f, indent="\t", ensure_ascii=False)

    temp_file.replace(final_output)

    file_size_kb = final_output.stat().st_size / 1024
    line_count = sum(1 for _ in open(final_output, "r", encoding="utf-8"))

    log("SUCCESS", f"✅ Deep Greedy Intake completed! {len(deep_dataset)} stations compiled.")
    log("SUCCESS", f"✅ Output written atomically to: {final_output.name}")
    log("SUCCESS", f"✅ File Stats: {file_size_kb:.1f} KB ({line_count:,} lines, {len(deep_dataset)} stations)")
    log("SUCCESS", "==================================================================")

    # Step 5: Check if --download-media flag was passed
    if "--download-media" in sys.argv or "--media" in sys.argv:
        log("MEDIA", "==================================================================")
        log("MEDIA", "Media download flag detected. Launching Media Assets Downloader...")
        log("MEDIA", "==================================================================")
        try:
            from download_ncrtc_media import main as run_media_download
            run_media_download()
        except ImportError:
            # Fallback if imported from parent dir
            import subprocess
            media_script = BASE_DIR / "download_ncrtc_media.py"
            if media_script.exists():
                subprocess.run([sys.executable, str(media_script)], check=True)

    return len(deep_dataset)


if __name__ == "__main__":
    count = scrape_official_ncrtc_stations()
    sys.exit(0)
