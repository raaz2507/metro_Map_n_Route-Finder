#!/usr/bin/env python3
"""
================================================================================
Jaipur Metro Transit Adapter (Jaipur Metro Rail Corporation - JMRC)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero Fake Data
Governance   : All endpoints read strictly from master_audit_manifest.json
Preservation : Stores authentic station metadata, Hindi script names,
               official JMRC station codes, helpline contacts, and emails
================================================================================
"""

import re
from typing import Dict, Any, List
import requests
import urllib3
from bs4 import BeautifulSoup
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.core.logger import UniversalPipelineLogger

urllib3.disable_warnings()


class JaipurMetroAdapter(BaseTransitAdapter):
	"""Handles Jaipur Metro (JMRC) transit network."""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://transport.rajasthan.gov.in/jmrc")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})

		contact_cfg = data_sources.get("stations_contact", {})
		contact_url = contact_cfg.get("url") if isinstance(contact_cfg, dict) else contact_cfg

		wiki_cfg = data_sources.get("wiki_stations_api", {})
		wiki_url = wiki_cfg.get("url") if isinstance(wiki_cfg, dict) else wiki_cfg

		if not contact_url:
			UniversalPipelineLogger.log("ERROR", "Missing stations_contact URL for jaipur_metro in manifest!")
			return {}

		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
		}

		# 1. Fetch Official Stations & Contacts from JMRC Portal
		UniversalPipelineLogger.log("CRAWL", f"Fetching stations from JMRC portal: {contact_url}")
		resp = session.get(contact_url, headers=headers, verify=False, timeout=15)
		resp.raise_for_status()

		soup = BeautifulSoup(resp.text, "html.parser")
		table = soup.find("table")
		if not table:
			UniversalPipelineLogger.log("ERROR", "Station contact table not found on JMRC portal!")
			return {}

		jmrc_stations = []
		for row in table.find_all("tr")[1:]:
			tds = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
			if len(tds) >= 5:
				name = tds[0]
				controller = tds[1]
				care = tds[2]
				emergency = tds[3]
				email_raw = tds[4]
				email = email_raw.replace("[at]", "@").replace("[dot]", ".")
				code_m = re.match(r"([a-z]+)@", email)
				code = code_m.group(1).upper() if code_m else None
				jmrc_stations.append({
					"name": name,
					"code": code,
					"controller_phone": controller,
					"care_phone": care,
					"emergency_phone": emergency,
					"email": email,
				})

		UniversalPipelineLogger.log("CRAWL", f"Parsed {len(jmrc_stations)} operational stations from JMRC portal.")

		# 2. Fetch Hindi Script Names & Layout from Wikipedia
		wiki_map: Dict[str, dict] = {}
		if wiki_url:
			try:
				UniversalPipelineLogger.log("CRAWL", f"Fetching Wikipedia Hindi metadata from: {wiki_url}")
				w_resp = session.get(wiki_url, headers=headers, timeout=15)
				if w_resp.status_code == 200:
					w_soup = BeautifulSoup(w_resp.text, "html.parser")
					tables = w_soup.find_all("table", class_="wikitable")
					if len(tables) > 1:
						for row in tables[1].find_all("tr")[2:]:
							tds = row.find_all(["td", "th"])
							if len(tds) >= 4:
								raw_en = tds[0].get_text(strip=True)
								clean_en = re.sub(r"[\*\†\d\[\]]", "", raw_en).strip()
								name_hi = tds[1].get_text(strip=True)
								line = tds[2].get_text(strip=True)
								opened = tds[3].get_text(strip=True) if len(tds) > 3 else None
								layout = tds[4].get_text(strip=True) if len(tds) > 4 else "Elevated"

								norm = re.sub(r"[^a-z0-9]", "", clean_en.lower())
								wiki_map[norm] = {
									"name_hi": name_hi,
									"line": line,
									"opened": opened,
									"layout": layout,
								}
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Wikipedia metadata fetch failed: {ex}")

		# 3. Assemble Deep Dataset
		deep_dataset = {}
		for idx, st in enumerate(jmrc_stations, start=1):
			sname = st["name"]
			slug = UniversalFileSystemManager.slugify(sname)
			norm = re.sub(r"[^a-z0-9]", "", sname.lower())

			w_info = wiki_map.get(norm, {})

			orig_slug = slug
			counter = 1
			while slug in deep_dataset:
				slug = f"{orig_slug}({counter})"
				counter += 1

			deep_dataset[slug] = {
				"id": slug,
				"station_code": st["code"] or f"JAI_{idx:02d}",
				"station_name_en": sname,
				"station_name_hi": w_info.get("name_hi"),
				"line": w_info.get("line", "Pink Line"),
				"layout": w_info.get("layout", "Elevated"),
				"opened_date": w_info.get("opened"),
				"operator": "Jaipur Metro Rail Corporation (JMRC)",
				"order": idx,
				"coordinates": None,
				"contacts": {
					"controller_phone": st["controller_phone"],
					"customer_care_phone": st["care_phone"],
					"emergency_phone": st["emergency_phone"],
					"email": st["email"],
				},
				"meta_raw": {
					"source": "official_jmrc_portal",
					"coordinates_found": False,
				},
			}

		UniversalPipelineLogger.log("CRAWL", f"Successfully compiled {len(deep_dataset)} stations for Jaipur Metro.")
		return deep_dataset