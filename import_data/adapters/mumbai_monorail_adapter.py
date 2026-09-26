#!/usr/bin/env python3
"""
================================================================================
Mumbai Monorail Transit Adapter (MMRDA)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero Fake Data
Governance   : All endpoints read strictly from master_audit_manifest.json
Preservation : Stores authentic station metadata, Marathi script names,
               interchange connections, and GPS coordinates
================================================================================
"""

import re
import urllib.parse
from typing import Dict, Any, List
import requests
from bs4 import BeautifulSoup
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger


class MumbaiMonorailAdapter(BaseTransitAdapter):
	"""Handles Mumbai Monorail Line 1 (MMRDA)."""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://mmrda.maharashtra.gov.in/")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})

		mono_cfg = data_sources.get("monorail_stations", {})
		mono_url = mono_cfg.get("url") if isinstance(mono_cfg, dict) else mono_cfg

		coord_cfg = data_sources.get("coordinates_api", {})
		coord_template = coord_cfg.get("url") if isinstance(coord_cfg, dict) else coord_cfg

		if not mono_url:
			UniversalPipelineLogger.log("ERROR", "Missing monorail_stations URL for mumbai_monorail in manifest!")
			return {}

		headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

		UniversalPipelineLogger.log("CRAWL", f"Fetching Mumbai Monorail stations from: {mono_url}")
		resp = session.get(mono_url, headers=headers, timeout=15)
		resp.raise_for_status()

		soup = BeautifulSoup(resp.text, "html.parser")
		tables = soup.find_all("table", class_="wikitable")

		if len(tables) < 3:
			UniversalPipelineLogger.log("ERROR", "Failed to locate Monorail station table on Wikipedia!")
			return {}

		t2 = tables[2]
		stations_parsed = []
		wiki_pages = []

		for row in t2.find_all("tr")[2:]:
			tds = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
			if len(tds) >= 4:
				idx_str = tds[0]
				name_en = re.sub(r"[\*\†\d\[\]]", "", tds[1]).strip()
				name_mr = tds[2]
				opened = tds[3]
				conn = tds[4] if len(tds) > 4 else "None"

				a = row.find("a")
				wiki_title = None
				if a and a.get("href"):
					wiki_title = a.get("href").replace("./", "")
					wiki_pages.append(wiki_title)

				idx = int(idx_str) if idx_str.isdigit() else len(stations_parsed) + 1
				stations_parsed.append({
					"idx": idx,
					"name_en": name_en,
					"name_mr": name_mr,
					"opened": opened,
					"connections": conn if conn != "None" else None,
					"wiki_title": wiki_title,
				})

		# Coordinates batch lookup
		unique_pages = list(dict.fromkeys([p for p in wiki_pages if p]))
		coords_map = {}
		if coord_template and unique_pages:
			titles_str = "|".join(unique_pages)
			c_url = coord_template.format(titles=urllib.parse.quote(titles_str))
			try:
				r_coord = session.get(c_url, headers=headers, timeout=10)
				if r_coord.status_code == 200:
					for pid, pdata in r_coord.json().get("query", {}).get("pages", {}).items():
						t = pdata.get("title", "").replace(" ", "_").lower()
						coords = pdata.get("coordinates", [])
						if coords:
							coords_map[t] = {
								"latitude": coords[0].get("lat"),
								"longitude": coords[0].get("lon"),
							}
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Monorail coordinates lookup failed: {ex}")

		deep_dataset = {}
		for st in stations_parsed:
			sname = st["name_en"]
			slug = UniversalFileSystemManager.slugify(sname)
			w_title = (st.get("wiki_title") or "").lower()
			coords = coords_map.get(w_title)

			orig_slug = slug
			counter = 1
			while slug in deep_dataset:
				slug = f"{orig_slug}({counter})"
				counter += 1

			deep_dataset[slug] = {
				"id": slug,
				"station_code": f"MMR_{st['idx']:02d}",
				"station_name_en": sname,
				"station_name_mr": st["name_mr"],
				"line": "Line 1 (Monorail)",
				"layout": "Elevated",
				"opened_date": st["opened"],
				"operator": "Mumbai Metropolitan Region Development Authority (MMRDA)",
				"order": st["idx"],
				"connections": st["connections"],
				"coordinates": coords,
				"meta_raw": {
					"source_url": mono_url,
					"coordinates_found": bool(coords),
				},
			}

		UniversalPipelineLogger.log("CRAWL", f"Successfully compiled {len(deep_dataset)} stations for Mumbai Monorail.")
		return deep_dataset