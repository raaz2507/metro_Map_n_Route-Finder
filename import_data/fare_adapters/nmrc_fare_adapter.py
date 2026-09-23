#!/usr/bin/env python3
"""
================================================================================
NMRC Noida Metro Fare Adapter
================================================================================
Location: fare_adapters/nmrc_fare_adapter.py
Role    : 100% Manifest-driven live scraper for NMRC Aqua Line fare table.
Model   : station_count_based (minStations -> maxStations)
================================================================================
"""

import re
from typing import Dict, Any, List
from bs4 import BeautifulSoup
from pipeline_core.constants import DEFAULT_REQUEST_TIMEOUT
from pipeline_core.logger import UniversalPipelineLogger
from .base_fare_adapter import BaseFareAdapter


class NMRCFareAdapter(BaseFareAdapter):
	"""Scrapes and normalizes NMRC Noida live station-count fare tariffs."""

	def extract_fare(self, network_id: str, net_info: dict) -> dict:
		data_sources = net_info.get("data_sources", {})
		fare_cfg = data_sources.get("fare_table", {})
		fare_url = fare_cfg.get("url") if isinstance(fare_cfg, dict) else ""

		if not fare_url:
			UniversalPipelineLogger.log("ERROR", f"No fare_table URL defined in manifest for {network_id}!")
			return {}

		UniversalPipelineLogger.log("CRAWL", f"Fetching live NMRC fare table from: {fare_url}")
		session = self.create_session(referer=net_info.get("source_url", "https://www.nmrcnoida.com/"))

		try:
			resp = session.get(fare_url, verify=False, timeout=DEFAULT_REQUEST_TIMEOUT)
			resp.raise_for_status()
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"Failed to fetch NMRC fare table: {e}")
			return {}

		soup = BeautifulSoup(resp.text, "html.parser")
		table = soup.find("table")
		if not table:
			UniversalPipelineLogger.log("ERROR", f"No HTML <table> found on NMRC fare page: {fare_url}")
			return {}

		weekday_slabs: List[Dict[str, Any]] = []
		holiday_slabs: List[Dict[str, Any]] = []

		rows = table.find_all("tr")
		for row in rows:
			cols = [c.get_text().strip() for c in row.find_all(["td", "th"])]
			if len(cols) < 3:
				continue

			stn_text = cols[0]
			# Regex patterns for station counts
			m_above = re.search(r"(\d+)\s*(?:Stations?)?\s*or\s*Above", stn_text, re.I)
			m_range = re.search(r"(\d+)\s*(?:Stations?)?\s*to\s*(\d+)", stn_text, re.I)
			m_single = re.search(r"For\s*(\d+)\s*Station", stn_text, re.I)

			f_weekday = re.search(r"\d+", cols[1])
			f_holiday = re.search(r"\d+", cols[2])

			if not (f_weekday and f_holiday):
				continue

			min_stn, max_stn = None, None
			if m_above:
				min_stn = int(m_above.group(1))
				max_stn = None
			elif m_range:
				min_stn = int(m_range.group(1))
				max_stn = int(m_range.group(2))
			elif m_single:
				min_stn = int(m_single.group(1))
				max_stn = int(m_single.group(1))
			else:
				continue

			wd_fare = int(f_weekday.group(0))
			hd_fare = int(f_holiday.group(0))

			weekday_slabs.append({
				"minStations": min_stn,
				"maxStations": max_stn,
				"fare": wd_fare
			})
			holiday_slabs.append({
				"minStations": min_stn,
				"maxStations": max_stn,
				"fare": hd_fare
			})

			UniversalPipelineLogger.log(
				"EXTRACT",
				f"[NMRC] Stations {min_stn}-{max_stn if max_stn is not None else 'Above'} -> Weekday: ₹{wd_fare}, Holiday: ₹{hd_fare}"
			)

		if not weekday_slabs:
			UniversalPipelineLogger.log("ERROR", "0 fare slabs parsed from NMRC table!")
			return {}

		# Packaging adhering strictly to universal_transit_schema.js
		return {
			"version": "1.0",
			"currency": "INR",
			"networks": {
				"nmrc": {
					"operator": net_info.get("name", "Noida Metro Rail Corporation"),
					"avgSpeedMetersPerMin": 600,
					"stationHaltMinutes": 0.5
				}
			},
			"policies": {
				"nmrc_standard": {
					"network": "nmrc",
					"effectiveFrom": "2025-01-01",
					"fareModel": "station_count_based",
					"source_url": fare_url,
					"calculation": {
						"distanceUnit": "stations",
						"rounding": "exact"
					},
					"fareTables": {
						"weekday": weekday_slabs,
						"holiday": holiday_slabs
					},
					"products": {
						"token": {
							"type": "base",
							"label": {
								"en": "QR Ticket",
								"hi": "क्यूआर टिकट"
							}
						},
						"smart_card": {
							"type": "discount",
							"baseProduct": "token",
							"discountPercent": 10,
							"label": {
								"en": "CITY1 Smart Card",
								"hi": "सिटी1 स्मार्ट कार्ड"
							}
						}
					}
				}
			}
		}