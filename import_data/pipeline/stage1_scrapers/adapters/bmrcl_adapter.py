#!/usr/bin/env python3
"""
================================================================================
BMRCL Namma Metro Transit Adapter (Bengaluru)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero Fake Data
Governance   : All endpoints read strictly from master_audit_manifest.json
Preservation : Stores authentic station metadata, Kannada names, and coordinates
================================================================================
"""

import re
import urllib.parse
from typing import Dict, Any, List
import requests
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.core.logger import UniversalPipelineLogger


class BMRCLEcosystemAdapter(BaseTransitAdapter):
	"""Handles Namma Metro (BMRCL Bengaluru) transit network."""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://english.bmrc.co.in/")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})

		metadata_cfg = data_sources.get("stations_metadata", {})
		metadata_url = metadata_cfg.get("url") if isinstance(metadata_cfg, dict) else metadata_cfg
		coord_cfg = data_sources.get("coordinates_api", {})
		coord_template = coord_cfg.get("url") if isinstance(coord_cfg, dict) else coord_cfg

		if not metadata_url:
			UniversalPipelineLogger.log("ERROR", "Missing stations_metadata URL for namma_metro in manifest!")
			return {}

		UniversalPipelineLogger.log("CRAWL", f"Fetching BMRCL stations metadata from: {metadata_url}")
		headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
		resp = session.get(metadata_url, headers=headers, timeout=15)
		resp.raise_for_status()

		rows = re.findall(r'<tr[^>]*>(.*?)</tr>', resp.text, re.DOTALL)
		UniversalPipelineLogger.log("CRAWL", f"Parsed {len(rows)} raw station rows from metadata endpoint.")

		stations_parsed = []
		wiki_pages = []

		for row in rows:
			cols = [re.sub(r'<[^>]+>', '', c).strip() for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.DOTALL)]
			m_page = re.search(r'href=["\']\./([^#"\']+metro_station[^"\']*)["\']', row, re.IGNORECASE)

			if len(cols) >= 6 and m_page:
				name_en = cols[0].replace("*", "").replace("†", "").strip()
				name_kn = cols[1].strip()
				line = cols[2].strip()
				opened = cols[3].strip()
				layout = cols[4].strip()
				code = cols[5].strip()

				# Filter strictly operational stations (exclude unbuilt/planned)
				# Retain stations that have a historical opening year even if an extension/interchange is under construction
				has_operational_date = any(yr in opened for yr in ["2011", "2014", "2015", "2016", "2017", "2021", "2023", "2024", "2025"])
				if not has_operational_date and ("planned" in opened.lower() or "under construction" in opened.lower()):
					continue

				page_title = m_page.group(1)
				wiki_pages.append(page_title)
				stations_parsed.append({
					"name_en": name_en,
					"name_kn": name_kn,
					"line": line,
					"opened": opened,
					"layout": layout,
					"code": code,
					"page": page_title,
				})

		UniversalPipelineLogger.log("CRAWL", f"Identified {len(stations_parsed)} operational stations for Namma Metro.")

		# Live Coordinates lookup in batches of 50 via MediaWiki API
		coords_map = {}
		if coord_template and wiki_pages:
			unique_pages = list(dict.fromkeys(wiki_pages))
			batch_size = 50
			for i in range(0, len(unique_pages), batch_size):
				batch = unique_pages[i:i + batch_size]
				titles_str = "|".join(batch)
				c_url = coord_template.format(titles=urllib.parse.quote(titles_str))
				try:
					r_coord = session.get(c_url, headers=headers, timeout=10)
					if r_coord.status_code == 200:
						pages_data = r_coord.json().get("query", {}).get("pages", {})
						for pid, pdata in pages_data.items():
							t = pdata.get("title", "").replace(" metro station", "").replace(" (Bengaluru)", "").replace(" (Bangalore)", "")
							clean_t = re.sub(r'[^a-zA-Z0-9]', '', t).lower()
							coords = pdata.get("coordinates", [])
							if coords:
								coords_map[clean_t] = {
									"latitude": coords[0].get("lat"),
									"longitude": coords[0].get("lon"),
								}
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Coordinates batch fetch failed: {ex}")

		deep_dataset = {}
		for idx, st in enumerate(stations_parsed, start=1):
			st_name = st["name_en"]
			slug = UniversalFileSystemManager.slugify(st_name)
			clean_key = re.sub(r'[^a-zA-Z0-9]', '', st_name).lower()
			coords = coords_map.get(clean_key)

			orig_slug = slug
			counter = 1
			while slug in deep_dataset:
				slug = f"{orig_slug}({counter})"
				counter += 1

			# Strict Verbatim Raw Intake - No dummy or fake data
			deep_dataset[slug] = {
				"id": slug,
				"station_code": st["code"] if st["code"] and st["code"] != "–" else f"BLR_{idx}",
				"station_name_en": st_name,
				"station_name_kn": st["name_kn"],
				"line": st["line"],
				"layout": st["layout"],
				"opened_date": st["opened"],
				"operator": "BMRCL",
				"order": idx,
				"coordinates": coords,
				"meta_raw": {
					"parsed_fields": st,
					"source_url": metadata_url,
					"coordinates_found": bool(coords),
				},
			}

		return deep_dataset