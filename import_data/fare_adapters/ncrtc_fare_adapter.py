#!/usr/bin/env python3
"""
================================================================================
Namo Bharat (NCRTC RRTS) Live Fare Adapter
================================================================================
Location: fare_adapters/ncrtc_fare_adapter.py
Role    : Scrapes live station-to-station fare matrix from Namo Bharat REST API.
Architecture: 100% Manifest-driven (zero hardcoded endpoints or slabs).
================================================================================
"""

import json
from datetime import datetime, timezone
from typing import Dict, Any, List
from pipeline_core.logger import UniversalPipelineLogger
from .base_fare_adapter import BaseFareAdapter


class NCRTCFareAdapter(BaseFareAdapter):
	"""
	Live REST Adapter for Namo Bharat (NCRTC RRTS).
	Reads fare_table endpoint template and journey classes from master_audit_manifest.json
	and extracts full discounted fare matrix for both Standard and Premium classes.
	"""

	def extract_fare(self, network_id: str, network_config: Dict[str, Any]) -> Dict[str, Any]:
		fare_cfg = network_config.get("data_sources", {}).get("fare_table", {})
		url_template = fare_cfg.get("url")
		if not url_template:
			UniversalPipelineLogger.log(
				"ERROR",
				f"No fare_table URL defined in manifest data_sources for {network_id}!"
			)
			return {}

		source_url = network_config.get("source_url", "https://namobharat.ncrtc.in/")
		journey_classes = fare_cfg.get("journey_classes", [
			{"id": 1, "name": "Standard"},
			{"id": 2, "name": "Premium"}
		])

		session = self.create_session()
		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
			"Referer": source_url,
			"Accept": "application/json, text/plain, */*"
		}

		UniversalPipelineLogger.log("FETCH", f"Scraping live fare matrix from Namo Bharat API...")
		fares_by_class: Dict[str, List[Dict[str, Any]]] = {}
		total_pairs = 0

		for jc in journey_classes:
			jc_id = jc.get("id", 1)
			jc_name = jc.get("name", "Standard")
			url = url_template.format(jc_id=jc_id)
			UniversalPipelineLogger.log("FETCH", f"Querying class {jc_name} (jc={jc_id}) from {url}...")

			try:
				# verify=False due to Indian intermediate certificate authority chain
				resp = session.get(url, headers=headers, verify=False, timeout=15)
				if resp.status_code != 200:
					UniversalPipelineLogger.log(
						"WARN",
						f"Non-200 response from NCRTC endpoint ({url}): {resp.status_code}"
					)
					continue

				data = resp.json()
				raw_items = data.get("data", [])
				class_fares: List[Dict[str, Any]] = []

				for item in raw_items:
					from_st = item.get("fromStation", {})
					to_st = item.get("toStation", {})
					fare = item.get("discountedFare")

					class_fares.append({
						"from_station_code": from_st.get("code"),
						"from_station_name": from_st.get("name"),
						"to_station_code": to_st.get("code"),
						"to_station_name": to_st.get("name"),
						"fare_inr": float(fare) if fare is not None else None,
						"class_id": jc_id,
						"class_name": jc_name
					})

				key = f"{jc_name.lower()}_class"
				fares_by_class[key] = class_fares
				total_pairs += len(class_fares)
				UniversalPipelineLogger.log("DATA", f"Extracted {len(class_fares)} live station-pair fares for {jc_name} Class.")

			except Exception as e:
				UniversalPipelineLogger.log("ERROR", f"Failed fetching NCRTC fare for class {jc_name}: {e}")

		if not fares_by_class:
			UniversalPipelineLogger.log("ERROR", "No fare data could be extracted for NCRTC!")
			return {}

		return {
			"metadata": {
				"network_id": network_id,
				"network_name": network_config.get("name", "Namo Bharat (NCRTC RRTS)"),
				"scraped_at": datetime.now(timezone.utc).isoformat(),
				"fare_type": "station_pair_matrix",
				"source_url": url_template,
				"currency": "INR",
				"journey_classes_scraped": list(fares_by_class.keys())
			},
			"fares": fares_by_class,
			"total_pairs_scraped": total_pairs
		}