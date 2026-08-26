"""
NCRTC RRTS Station Scraping Utility
====================================
Location: import_data/ncrtc_rrts_data/scrape_ncrtc_stations.py

Purpose:
--------
Scrapes live station, timing, pricing, layout, and facility metadata directly 
from the official Namo Bharat (NCRTC) web backend API:
  - Base URL: https://namobharat.ncrtc.in/commons/journey
  - Stations API: /stations
  - Station Details API: /stations/v2/{station_id}/details

Output Files (Saved in same directory):
----------------------------------------
  - import_data/ncrtc_rrts_data/ncrtc_all_stations_scraped_cleaned.json (Cleaned JSON)
  - import_data/ncrtc_rrts_data/ncrtc_all_stations_scraped_row.json (Raw scraped API response)

Usage:
------
    python import_data/ncrtc_rrts_data/scrape_ncrtc_stations.py
"""

import os
import re
import json
import requests
import urllib3
from datetime import datetime
from urllib.parse import unquote, urlparse

# Disable SSL warnings for web scraping robustness
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Target Backend API URLs
BASE_URL = "https://namobharat.ncrtc.in/commons/journey"
STATIONS_LIST_URL = f"{BASE_URL}/stations"
STATION_DETAILS_URL_TEMPLATE = f"{BASE_URL}/stations/v2/{{station_id}}/details"

# Standard Request Headers
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Referer': 'https://namobharat.ncrtc.in/'
}

def extract_all_image_urls(data):
    """Recursively extract all image/media URLs from JSON object."""
    image_urls = set()

    def recursive_find(obj):
        if isinstance(obj, dict):
            for k, v in obj.items():
                if isinstance(v, str) and (v.startswith("http://") or v.startswith("https://")):
                    path_lower = v.lower()
                    if any(ext in path_lower for ext in ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif']) or 'rapidx-cms' in path_lower:
                        image_urls.add(v)
                else:
                    recursive_find(v)
        elif isinstance(obj, list):
            for item in obj:
                recursive_find(item)

    recursive_find(data)
    return sorted(list(image_urls))

def clean_station_data(station):
    """Recursively clean empty keys or null attributes from station dictionary."""
    if isinstance(station, dict):
        cleaned = {}
        for k, v in station.items():
            if v is not None and v != "":
                cleaned[k] = clean_station_data(v)
        return cleaned
    elif isinstance(station, list):
        return [clean_station_data(item) for item in station if item is not None and item != ""]
    return station

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    cleaned_out_path = os.path.join(base_dir, "ncrtc_all_stations_scraped_cleaned.json")
    raw_out_path = os.path.join(base_dir, "ncrtc_all_stations_scraped_row.json")

    print(f"Fetching stations list from {STATIONS_LIST_URL}...")
    resp = requests.get(STATIONS_LIST_URL, headers=HEADERS, verify=False, timeout=15)
    resp.raise_for_status()
    stations_list = resp.json()

    print(f"Found {len(stations_list)} stations in list. Fetching details for each...")

    all_stations_data = []
    raw_responses = []

    for st in stations_list:
        st_id = st.get('id')
        st_name = st.get('name', f"Station_{st_id}")
        print(f"  Fetching details for Station ID {st_id}: {st_name}...")
        
        detail_url = STATION_DETAILS_URL_TEMPLATE.format(station_id=st_id)
        try:
            d_resp = requests.get(detail_url, headers=HEADERS, verify=False, timeout=15)
            d_resp.raise_for_status()
            st_detail = d_resp.json()
            raw_responses.append(st_detail)
            cleaned_st = clean_station_data(st_detail)
            all_stations_data.append(cleaned_st)
        except Exception as e:
            print(f"    WARNING: Failed to fetch station {st_id} ({st_name}): {e}")

    timestamp = datetime.now().isoformat()

    cleaned_payload = {
        "scraped_at": timestamp,
        "source": "https://namobharat.ncrtc.in/",
        "total_stations": len(all_stations_data),
        "extraction_method": "Cleaned & Standardized (Zero Data Loss)",
        "stations": all_stations_data
    }

    raw_payload = {
        "scraped_at": timestamp,
        "source": "https://namobharat.ncrtc.in/",
        "total_stations": len(raw_responses),
        "stations": raw_responses
    }

    with open(cleaned_out_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_payload, f, indent=2, ensure_ascii=False)

    with open(raw_out_path, "w", encoding="utf-8") as f:
        json.dump(raw_payload, f, indent=2, ensure_ascii=False)

    print(f"\nSUCCESS: Saved cleaned scraped data to {cleaned_out_path}")
    print(f"SUCCESS: Saved raw scraped data to {raw_out_path}")

if __name__ == "__main__":
    main()
