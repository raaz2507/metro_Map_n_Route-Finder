#!/usr/bin/env python3
"""
================================================================================
Navi Mumbai Metro Transit Adapter (CIDCO / Maha Metro)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero Fake Data
Governance   : All endpoints read strictly from master_audit_manifest.json
Preservation : Stores authentic station metadata, Marathi script names,
               inter-station distances, and suburban rail interchange markers
================================================================================
"""

import re
from typing import Dict, Any, List
import requests
from bs4 import BeautifulSoup
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger


class NaviMumbaiMetroAdapter(BaseTransitAdapter):
	"""Handles Navi Mumbai Metro Line 1 (CIDCO / Maha Metro)."""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://cidco.maharashtra.gov.in/")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})

		line_cfg = data_sources.get("line1_stations", {})
		line_url = line_cfg.get("url") if isinstance(line_cfg, dict) else line_cfg

		if not line_url:
			UniversalPipelineLogger.log("ERROR", "Missing line1_stations URL for navi_mumbai_metro in manifest!")
			return {}

		headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

		UniversalPipelineLogger.log("CRAWL", f"Fetching Navi Mumbai Metro stations from: {line_url}")
		resp = session.get(line_url, headers=headers, timeout=15)
		resp.raise_for_status()

		soup = BeautifulSoup(resp.text, "html.parser")
		tables = soup.find_all("table", class_="wikitable")

		if len(tables) < 3:
			UniversalPipelineLogger.log("ERROR", "Failed to locate Line 1 station table for Navi Mumbai Metro!")
			return {}

		t2 = tables[2]
		deep_dataset = {}

		for row in t2.find_all("tr")[2:]:
			tds = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
			if len(tds) >= 6:
				idx_str = tds[0]
				name_en = re.sub(r"[\*\†\d\[\]]", "", tds[1]).strip()
				name_mr = tds[2]
				inter_dist = tds[3]
				cum_dist = tds[4]
				opened = tds[5]
				conn = tds[6] if len(tds) > 6 else "None"

				slug = UniversalFileSystemManager.slugify(name_en)
				idx = int(idx_str) if idx_str.isdigit() else len(deep_dataset) + 1

				orig_slug = slug
				counter = 1
				while slug in deep_dataset:
					slug = f"{orig_slug}({counter})"
					counter += 1

				deep_dataset[slug] = {
					"id": slug,
					"station_code": f"NMM_{idx:02d}",
					"station_name_en": name_en,
					"station_name_mr": name_mr,
					"line": "Line 1",
					"layout": "Elevated",
					"opened_date": opened,
					"operator": "CIDCO / Maha Metro",
					"order": idx,
					"inter_station_km": float(inter_dist) if inter_dist.replace(".", "", 1).isdigit() else None,
					"cumulative_km": float(cum_dist) if cum_dist.replace(".", "", 1).isdigit() else None,
					"connections": conn if conn != "None" else None,
					"coordinates": None,
					"meta_raw": {
						"source_url": line_url,
						"coordinates_found": False,
					},
				}

		UniversalPipelineLogger.log("CRAWL", f"Successfully compiled {len(deep_dataset)} stations for Navi Mumbai Metro.")
		return deep_dataset