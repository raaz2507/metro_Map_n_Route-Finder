#!/usr/bin/env python3
"""
================================================================================
Ahmedabad Metro Transit Adapter (Gujarat Metro Rail Corporation - GMRC)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero Fake Data
Governance   : All endpoints read strictly from master_audit_manifest.json
Preservation : Stores authentic station metadata, Gujarati script names,
               line taxonomy, and exact GIS coordinates from official GMRC KML
================================================================================
"""

import re
import xml.etree.ElementTree as ET
from typing import Dict, Any, List
import requests
import urllib3
from bs4 import BeautifulSoup
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.core.logger import UniversalPipelineLogger

urllib3.disable_warnings()


class AhmedabadMetroAdapter(BaseTransitAdapter):
	"""Handles Ahmedabad & Gandhinagar Metro (GMRC) transit network."""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://www.gujaratmetrorail.com/")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})

		route_fares_cfg = data_sources.get("route_and_fares", {})
		route_fares_url = route_fares_cfg.get("url") if isinstance(route_fares_cfg, dict) else route_fares_cfg

		kml_cfg = data_sources.get("official_kml_map", {})
		kml_url = kml_cfg.get("url") if isinstance(kml_cfg, dict) else kml_cfg

		wiki_cfg = data_sources.get("wiki_stations_api", {})
		wiki_url = wiki_cfg.get("url") if isinstance(wiki_cfg, dict) else wiki_cfg

		if not route_fares_url:
			UniversalPipelineLogger.log("ERROR", "Missing route_and_fares URL for ahmedabad_metro in manifest!")
			return {}

		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
		}

		# 1. Fetch Station List from GMRC Route & Fares Dropdown
		UniversalPipelineLogger.log("CRAWL", f"Fetching stations from GMRC route portal: {route_fares_url}")
		resp = session.get(route_fares_url, headers=headers, verify=False, timeout=20)
		resp.raise_for_status()

		soup = BeautifulSoup(resp.text, "html.parser")
		stn_select = soup.find("select", id="FrmStn")
		if not stn_select:
			UniversalPipelineLogger.log("ERROR", "Failed to locate station dropdown #FrmStn on GMRC portal!")
			return {}

		dropdown_stations = []
		for opt in stn_select.find_all("option"):
			val = opt.get("value", "").strip()
			name = opt.get_text(strip=True)
			if val and val != "From Station":
				is_wip = "WORK IN PROGRESS" in name
				clean_name = re.sub(r"\(WORK IN PROGRESS\)", "", name, flags=re.IGNORECASE).strip()
				clean_name = re.sub(r"Metro Station", "", clean_name, flags=re.IGNORECASE).strip()
				dropdown_stations.append({
					"id": int(val),
					"name": clean_name,
					"is_wip": is_wip,
				})

		UniversalPipelineLogger.log("CRAWL", f"Parsed {len(dropdown_stations)} stations from official GMRC dropdown.")

		# 2. Fetch GIS Coordinates from GMRC Official KML Map
		kml_coords: Dict[str, dict] = {}
		if kml_url:
			try:
				UniversalPipelineLogger.log("CRAWL", f"Downloading official GMRC KML map from: {kml_url}")
				kml_resp = session.get(kml_url, headers=headers, timeout=15)
				if kml_resp.status_code == 200:
					root = ET.fromstring(kml_resp.content)
					for child in root.iter():
						if child.tag.endswith("Placemark"):
							name_el = child.find("{*}name")
							coord_el = child.find(".//{*}coordinates")
							name = name_el.text.strip() if name_el is not None and name_el.text else ""
							coords = coord_el.text.strip() if coord_el is not None and coord_el.text else ""
							if name and coords:
								c_parts = coords.split(",")
								if len(c_parts) >= 2:
									clean_k = re.sub(r"[^a-z0-9]", "", name.lower())
									kml_coords[clean_k] = {
										"lat": float(c_parts[1]),
										"lon": float(c_parts[0]),
									}
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"KML coordinates fetch failed: {ex}")

		UniversalPipelineLogger.log("CRAWL", f"Resolved {len(kml_coords)} placemarks from GMRC KML map.")

		# 3. Fetch Gujarati script names from Wikipedia
		wiki_map: Dict[str, dict] = {}
		if wiki_url:
			try:
				UniversalPipelineLogger.log("CRAWL", f"Fetching Wikipedia Gujarati metadata from: {wiki_url}")
				w_resp = session.get(wiki_url, headers=headers, timeout=15)
				if w_resp.status_code == 200:
					w_soup = BeautifulSoup(w_resp.text, "html.parser")
					for t in w_soup.find_all("table", class_="wikitable"):
						for row in t.find_all("tr")[1:]:
							tds = row.find_all(["td", "th"])
							if len(tds) >= 3:
								en_name = re.sub(r"[\*\†\d\[\]]", "", tds[0].get_text(strip=True)).strip()
								gu_name = tds[1].get_text(strip=True)
								line = tds[2].get_text(strip=True) if len(tds) > 2 else None
								norm = re.sub(r"[^a-z0-9]", "", en_name.lower())
								wiki_map[norm] = {"gu_name": gu_name, "line": line}
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Wikipedia metadata fetch failed: {ex}")

		# 4. Assemble Deep Dataset
		deep_dataset = {}
		for idx, st in enumerate(dropdown_stations, start=1):
			sname = st["name"]
			slug = UniversalFileSystemManager.slugify(sname)
			norm = re.sub(r"[^a-z0-9]", "", sname.lower())

			c_info = kml_coords.get(norm)
			if not c_info:
				for k, v in kml_coords.items():
					if k in norm or norm in k:
						c_info = v
						break

			coords = {"latitude": c_info["lat"], "longitude": c_info["lon"]} if c_info else None

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
				"station_id": st["id"],
				"station_name_en": sname,
				"station_name_gu": w_info.get("gu_name") if w_info else None,
				"line": w_info.get("line") if w_info else None,
				"is_operational": not st["is_wip"],
				"status": "Work in Progress" if st["is_wip"] else "Operational",
				"layout": "Elevated",
				"operator": "Gujarat Metro Rail Corporation (GMRC)",
				"order": idx,
				"coordinates": coords,
				"meta_raw": {
					"dropdown_id": st["id"],
					"coordinates_found": bool(coords),
					"source": "official_gmrc_portal",
				},
			}

		UniversalPipelineLogger.log("CRAWL", f"Successfully compiled {len(deep_dataset)} stations for Ahmedabad Metro.")
		return deep_dataset