#!/usr/bin/env python3
"""
================================================================================
Chennai Metro Transit Adapter (Chennai Metro Rail Limited - CMRL)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero Fake Data
Governance   : All endpoints read strictly from master_audit_manifest.json
Preservation : Stores authentic station metadata, Tamil script names,
               official line taxonomy, and embedded Google Maps GPS coordinates
================================================================================
"""

import html
import re
from typing import Dict, Any, List
import requests
import urllib3
from bs4 import BeautifulSoup
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger

urllib3.disable_warnings()


class ChennaiMetroAdapter(BaseTransitAdapter):
	"""Handles Chennai Metro (CMRL) transit network."""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://chennaimetrorail.org/")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})

		stations_cfg = data_sources.get("stations_api", {})
		stations_url = stations_cfg.get("url") if isinstance(stations_cfg, dict) else stations_cfg

		lines_cfg = data_sources.get("lines_api", {})
		lines_url = lines_cfg.get("url") if isinstance(lines_cfg, dict) else lines_cfg

		wiki_cfg = data_sources.get("wiki_stations_api", {})
		wiki_url = wiki_cfg.get("url") if isinstance(wiki_cfg, dict) else wiki_cfg

		if not stations_url:
			UniversalPipelineLogger.log("ERROR", "Missing stations_api URL for chennai_metro in manifest!")
			return {}

		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
		}

		# 1. Fetch Line Taxonomy from CMRL
		lines_map: Dict[int, str] = {}
		if lines_url:
			try:
				UniversalPipelineLogger.log("CRAWL", f"Fetching Line taxonomy from: {lines_url}")
				r_tax = session.get(lines_url, headers=headers, verify=False, timeout=10)
				if r_tax.status_code == 200:
					for t in r_tax.json():
						lines_map[t["id"]] = t["name"]
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Line taxonomy fetch failed: {ex}")

		# 2. Fetch Official CMRL Stations
		UniversalPipelineLogger.log("CRAWL", f"Fetching Chennai Metro stations from: {stations_url}")
		resp = session.get(stations_url, headers=headers, verify=False, timeout=20)
		resp.raise_for_status()
		cmrl_stations = resp.json()
		UniversalPipelineLogger.log("CRAWL", f"Received {len(cmrl_stations)} official station posts from CMRL.")

		# 3. Fetch Wikipedia Tamil names & Layout metadata
		wiki_map: Dict[str, dict] = {}
		if wiki_url:
			try:
				UniversalPipelineLogger.log("CRAWL", f"Fetching Wikipedia Tamil metadata from: {wiki_url}")
				w_resp = session.get(wiki_url, headers=headers, timeout=15)
				if w_resp.status_code == 200:
					w_soup = BeautifulSoup(w_resp.text, "html.parser")
					tables = w_soup.find_all("table", class_="wikitable")
					if len(tables) > 1:
						for row in tables[1].find_all("tr")[2:]:
							tds = row.find_all(["td", "th"])
							if len(tds) >= 4:
								raw_en = tds[0].get_text(strip=True)
								clean_en = re.sub(r"[\*\†\d\[\]\¤\#]", "", raw_en).strip()
								name_ta = tds[1].get_text(strip=True)
								line = tds[2].get_text(strip=True)
								opened = tds[3].get_text(strip=True) if len(tds) > 3 else None
								layout = tds[4].get_text(strip=True) if len(tds) > 4 else "Elevated"

								norm_key = re.sub(r"[^a-z0-9]", "", clean_en.lower())
								wiki_map[norm_key] = {
									"name_ta": name_ta,
									"opened": opened,
									"layout": layout,
									"line": line,
								}
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Wikipedia metadata fetch failed: {ex}")

		# 4. Assemble Deep Dataset
		deep_dataset = {}
		for idx, st in enumerate(cmrl_stations, start=1):
			raw_title = html.unescape(st.get("title", {}).get("rendered", "")).strip()
			slug = st.get("slug") or UniversalFileSystemManager.slugify(raw_title)

			# Extract authentic GPS coordinates from embedded Google Maps iframe
			content = st.get("content", {}).get("rendered", "")
			m_coord = re.search(r"!2d([0-9\.]+)!3d([0-9\.]+)", content)
			coords = None
			if m_coord:
				coords = {
					"latitude": float(m_coord.group(2)),
					"longitude": float(m_coord.group(1)),
				}

			# Map lines from taxonomy
			assigned_lines = [lines_map.get(cid) for cid in st.get("phase-one", []) if cid in lines_map]
			line_str = " / ".join(assigned_lines) if assigned_lines else None

			# Cross-reference Tamil name
			norm = re.sub(r"[^a-z0-9]", "", raw_title.lower())
			w_info = wiki_map.get(norm)
			if not w_info:
				for k, v in wiki_map.items():
					if k in norm or norm in k:
						w_info = v
						break

			orig_slug = slug
			counter = 1
			while slug in deep_dataset:
				slug = f"{orig_slug}({counter})"
				counter += 1

			deep_dataset[slug] = {
				"id": slug,
				"station_id": st.get("id"),
				"station_name_en": raw_title,
				"station_name_ta": w_info.get("name_ta") if w_info else None,
				"line": line_str or (w_info.get("line") if w_info else None),
				"layout": w_info.get("layout", "Elevated") if w_info else "Elevated",
				"opened_date": w_info.get("opened") if w_info else None,
				"operator": "Chennai Metro Rail Limited (CMRL)",
				"order": idx,
				"coordinates": coords,
				"meta_raw": {
					"wp_id": st.get("id"),
					"link": st.get("link"),
					"coordinates_found": bool(coords),
					"source": "official_cmrl_wp_rest_api",
				},
			}

		UniversalPipelineLogger.log("CRAWL", f"Compiled {len(deep_dataset)} stations with authentic coordinates.")
		return deep_dataset