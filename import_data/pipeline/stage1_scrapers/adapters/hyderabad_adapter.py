#!/usr/bin/env python3
"""
================================================================================
Hyderabad Metro Transit Adapter (L&T Metro Rail Hyderabad)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero Fake Data
Governance   : All endpoints read strictly from master_audit_manifest.json
Preservation : Stores authentic station metadata, Arm entry/exits, lifts,
               escalators, landmarks, Telugu/Urdu names, and GPS coordinates
================================================================================
"""

import html
import re
import urllib.parse
from typing import Dict, Any, List
import requests
import urllib3
from bs4 import BeautifulSoup
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.core.logger import UniversalPipelineLogger

urllib3.disable_warnings()


class HyderabadMetroAdapter(BaseTransitAdapter):
	"""Handles Hyderabad Metro (L&T Metro Rail) transit network."""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://ltmetro.com/")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})

		stations_cfg = data_sources.get("stations_api", {})
		stations_url = stations_cfg.get("url") if isinstance(stations_cfg, dict) else stations_cfg

		wiki_cfg = data_sources.get("wiki_stations_api", {})
		wiki_url = wiki_cfg.get("url") if isinstance(wiki_cfg, dict) else wiki_cfg

		coord_cfg = data_sources.get("wiki_coordinates_api", {})
		coord_template = coord_cfg.get("url") if isinstance(coord_cfg, dict) else coord_cfg

		if not stations_url:
			UniversalPipelineLogger.log("ERROR", "Missing stations_api URL for hyderabad_metro in manifest!")
			return {}

		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
		}

		# 1. Fetch Official WordPress REST API from L&T Metro
		UniversalPipelineLogger.log("CRAWL", f"Fetching Hyderabad Metro stations from: {stations_url}")
		resp = session.get(stations_url, headers=headers, verify=False, timeout=20)
		resp.raise_for_status()
		wp_stations = resp.json()
		UniversalPipelineLogger.log("CRAWL", f"Received {len(wp_stations)} official station posts from L&T portal.")

		# 2. Fetch Wikipedia Bilingual metadata & Line alignments
		wiki_map = {}
		wiki_pages = []
		if wiki_url:
			try:
				UniversalPipelineLogger.log("CRAWL", f"Fetching Wikipedia metadata from: {wiki_url}")
				wiki_resp = session.get(wiki_url, headers=headers, timeout=15)
				if wiki_resp.status_code == 200:
					wiki_soup = BeautifulSoup(wiki_resp.text, "html.parser")
					tables = wiki_soup.find_all("table", class_="wikitable")
					if len(tables) > 1:
						for row in tables[1].find_all("tr")[2:]:
							tds = row.find_all(["td", "th"])
							if len(tds) >= 4:
								raw_name = tds[0].get_text(strip=True)
								clean_name = re.sub(r"[\*\†\d\[\]]", "", raw_name).strip()
								telugu_name = tds[1].get_text(strip=True)
								urdu_name = tds[2].get_text(strip=True)
								line = tds[3].get_text(strip=True)
								opened = tds[4].get_text(strip=True) if len(tds) > 4 else None
								layout = tds[5].get_text(strip=True) if len(tds) > 5 else "Elevated"

								a = tds[0].find("a")
								wiki_title = None
								if a and a.get("href"):
									wiki_title = a.get("href").replace("./", "")
									wiki_pages.append(wiki_title)

								norm_key = re.sub(r"[^a-z0-9]", "", clean_name.lower())
								wiki_map[norm_key] = {
									"clean_name": clean_name,
									"telugu_name": telugu_name,
									"urdu_name": urdu_name,
									"line": line,
									"opened": opened,
									"layout": layout,
									"wiki_title": wiki_title,
								}

						# Standard aliases for minor spelling differences
						aliases = {
							"sultanbazar": "sultanbazaar",
							"narayanguda": "narayanaguda",
							"roadno5jubileehills": "roadno5jubileehills",
							"osmaniacollege": "osmaniamedicalcollege",
							"khairtabad": "khairatabad",
							"balanagar": "drbrambedkarbalanagar",
							"chaitanyapuri": "chaitanyapuri",
						}
						for k, v in aliases.items():
							if v in wiki_map and k not in wiki_map:
								wiki_map[k] = wiki_map[v]
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Wikipedia metadata fetch failed: {ex}")

		# 3. Live Coordinates lookup in batches via MediaWiki API
		coords_by_title = {}
		if coord_template and wiki_pages:
			unique_pages = list(dict.fromkeys([p for p in wiki_pages if p]))
			batch_size = 40
			for i in range(0, len(unique_pages), batch_size):
				batch = unique_pages[i:i + batch_size]
				titles_param = "|".join(batch)
				c_url = coord_template.format(titles=urllib.parse.quote(titles_param))
				try:
					c_res = session.get(c_url, headers=headers, timeout=10)
					if c_res.status_code == 200:
						pages_data = c_res.json().get("query", {}).get("pages", {})
						for pid, pdata in pages_data.items():
							t = pdata.get("title", "").replace(" ", "_").lower()
							coords = pdata.get("coordinates", [])
							if coords:
								coords_by_title[t] = {
									"latitude": coords[0].get("lat"),
									"longitude": coords[0].get("lon"),
								}
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Coordinates batch fetch failed: {ex}")

		UniversalPipelineLogger.log("CRAWL", f"Resolved authentic coordinates for {len(coords_by_title)} stations.")

		# 4. Parse Stations and Deep Facility Metadata
		deep_dataset = {}
		for idx, st in enumerate(wp_stations, start=1):
			raw_title = html.unescape(st.get("title", {}).get("rendered", "")).strip()
			slug = st.get("slug") or UniversalFileSystemManager.slugify(raw_title)
			norm_key = re.sub(r"[^a-z0-9]", "", raw_title.lower())
			wiki_info = wiki_map.get(norm_key, {})

			# Authentic Coordinates (Zero Fake Data: None if not available)
			coords = None
			w_title = wiki_info.get("wiki_title")
			if w_title and w_title.lower() in coords_by_title:
				coords = coords_by_title[w_title.lower()]

			content_html = st.get("content", {}).get("rendered", "")
			soup = BeautifulSoup(content_html, "html.parser")

			# Extract station address
			addr_match = re.search(r"Station Address</h3>\s*<p>(.*?)</p>", content_html, re.DOTALL | re.IGNORECASE)
			station_address = None
			if addr_match:
				station_address = re.sub(r"<[^>]+>", "", addr_match.group(1)).strip()

			# Extract facilities & modal sections (Arms, Lifts, Escalators, Landmarks)
			facilities = {}
			for modal in soup.find_all("div", class_="modal"):
				modal_h = modal.find(["h2", "h3", "h4", "h5"])
				if modal_h:
					title_text = modal_h.get_text(strip=True)
					body = modal.find("div", class_="modal-body")
					if body:
						items = [li.get_text(strip=True) for li in body.find_all("li") if li.get_text(strip=True)]
						if not items:
							items = [p.get_text(strip=True) for p in body.find_all("p") if p.get_text(strip=True)]
						facilities[title_text] = items

			# Extract operational timings
			timings_m = re.search(r"(Monday to Sunday:[^<]+|First Train at[^<]+)", content_html, re.IGNORECASE)
			timings_str = timings_m.group(0).strip() if timings_m else None

			# Platform info
			platforms = []
			for li in soup.find_all("li"):
				txt = li.get_text(strip=True)
				if txt.lower().startswith("platform"):
					platforms.append(txt)

			# Ensure unique slug
			orig_slug = slug
			counter = 1
			while slug in deep_dataset:
				slug = f"{orig_slug}({counter})"
				counter += 1

			deep_dataset[slug] = {
				"id": slug,
				"station_id": st.get("id"),
				"station_name_en": raw_title,
				"station_name_te": wiki_info.get("telugu_name"),
				"station_name_ur": wiki_info.get("urdu_name"),
				"line": wiki_info.get("line"),
				"layout": wiki_info.get("layout", "Elevated"),
				"opened_date": wiki_info.get("opened"),
				"operator": "L&T Metro Rail (Hyderabad) Limited",
				"order": idx,
				"address": station_address,
				"coordinates": coords,
				"timings": timings_str,
				"platforms": platforms,
				"facilities": facilities,
				"meta_raw": {
					"wp_id": st.get("id"),
					"wp_slug": st.get("slug"),
					"link": st.get("link"),
					"coordinates_found": bool(coords),
				},
			}

		return deep_dataset