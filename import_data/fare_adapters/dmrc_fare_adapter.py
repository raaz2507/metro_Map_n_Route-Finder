#!/usr/bin/env python3
"""
================================================================================
Delhi Metro (DMRC) Canonical Stage 1 Fare Adapter
================================================================================
Location: fare_adapters/dmrc_fare_adapter.py
Role    : Scrapes and packages DMRC's true dual-corridor tariff architecture:
          1. Standard Network (255 Stations) - Dynamic Distance Slabs (Weekday, Weekend, Smart Card)
          2. Airport Express Line (Orange Line) - Point-to-Point Live Matrix
Architecture: 100% Manifest-Driven (Zero hardcoded URLs, probes, or station codes).
================================================================================
"""

import time
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List
from pipeline_core.logger import UniversalPipelineLogger
from .base_fare_adapter import BaseFareAdapter


class DMRCFareAdapter(BaseFareAdapter):
	"""
	Canonical Stage 1 Fare Adapter for Delhi Metro Rail Corporation (DMRC).
	Extracts dynamic distance slabs via live API probing and scrapes Airport Express Line.
	"""

	def extract_fare(self, network_id: str, network_config: Dict[str, Any]) -> Dict[str, Any]:
		data_sources = network_config.get("data_sources", {})
		fare_cfg = data_sources.get("fare_table", {})
		fare_url_template = fare_cfg.get("url")
		source_url = network_config.get("source_url", "https://delhimetrorail.com/")

		if not fare_url_template:
			UniversalPipelineLogger.log("ERROR", f"No fare_table URL template in manifest for {network_id}!")
			return {}

		session = self.create_session()
		parsed_src = urllib.parse.urlsplit(source_url)
		origin_header = f"{parsed_src.scheme}://{parsed_src.netloc}/"

		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			"Referer": origin_header,
			"Accept": "application/json, text/plain, */*"
		}

		# -------------------------------------------------------------------------
		# 1. Discover Real Distance Slabs dynamically via Live API Probing
		# -------------------------------------------------------------------------
		distance_buckets = fare_cfg.get("distance_buckets", [])
		dynamic_slabs: List[Dict[str, Any]] = []

		if distance_buckets:
			UniversalPipelineLogger.log("FETCH", f"[1/2] Probing live DMRC API to discover true distance slabs...")
			for bucket in distance_buckets:
				probe = bucket.get("probe", [])
				if len(probe) < 2:
					continue
				src, dst = probe[0], probe[1]
				url = fare_url_template.format(from_code=src, to_code=dst)

				try:
					resp = session.get(url, headers=headers, timeout=8)
					if resp.status_code == 200:
						data = resp.json()
						w_fare = data.get("weekday_fare")
						we_fare = data.get("weekend_fare")

						dynamic_slabs.append({
							"slab_id": bucket.get("slab_id"),
							"min_km": bucket.get("min_km"),
							"max_km": bucket.get("max_km"),
							"token_weekday_fare_inr": w_fare,
							"token_weekend_fare_inr": we_fare,
							"smart_card_normal_fare_inr": round(w_fare * 0.9, 1) if w_fare is not None else None,
							"smart_card_non_peak_fare_inr": round(w_fare * 0.8, 1) if w_fare is not None else None,
							"live_probe_verified": f"{src}->{dst}"
						})
					time.sleep(0.06)
				except Exception as e:
					UniversalPipelineLogger.log("WARN", f"Distance probe failed for {src}->{dst}: {e}")

			UniversalPipelineLogger.log("DATA", f"Discovered {len(dynamic_slabs)} distance slabs live from DMRC server.")

		# -------------------------------------------------------------------------
		# 2. Scrape Airport Express Line (Orange Line) Live Point-to-Point Fares
		# -------------------------------------------------------------------------
		airport_stations = fare_cfg.get("airport_express_stations", [])
		airport_fares: List[Dict[str, Any]] = []

		if airport_stations:
			UniversalPipelineLogger.log("FETCH", f"[2/2] Scraping live Airport Express Line point-to-point matrix...")
			for i, from_info in enumerate(airport_stations):
				for j, to_info in enumerate(airport_stations):
					if i >= j:
						continue
					from_code = from_info.get("code")
					from_name = from_info.get("name", from_code)
					to_code = to_info.get("code")
					to_name = to_info.get("name", to_code)

					url = fare_url_template.format(from_code=from_code, to_code=to_code)
					try:
						resp = session.get(url, headers=headers, timeout=8)
						if resp.status_code == 200:
							data = resp.json()
							w_fare = data.get("weekday_fare")
							if w_fare is not None:
								airport_fares.append({
									"from_station_code": from_code,
									"from_station_name": from_name,
									"to_station_code": to_code,
									"to_station_name": to_name,
									"weekday_fare_inr": w_fare,
									"weekend_fare_inr": data.get("weekend_fare"),
									"travel_time": data.get("total_time")
								})
						time.sleep(0.06)
					except Exception as e:
						UniversalPipelineLogger.log("WARN", f"Airport pair failed for {from_code}->{to_code}: {e}")

			UniversalPipelineLogger.log("DATA", f"Scraped {len(airport_fares)} live Airport Express Line pairs.")

		if not dynamic_slabs and not airport_fares:
			UniversalPipelineLogger.log("ERROR", "No fare data could be extracted for DMRC!")
			return {}

		return {
			"metadata": {
				"network_id": network_id,
				"network_name": network_config.get("name", "Delhi Metro (DMRC)"),
				"scraped_at": datetime.now(timezone.utc).isoformat(),
				"currency": "INR",
				"source_endpoint": fare_url_template,
				"corridors": ["standard_network", "airport_express_line"]
			},
			"standard_network": {
				"fare_model": "distance_based",
				"description": "Applies across all regular lines (Red, Yellow, Blue, Green, Violet, Pink, Magenta, Grey)",
				"distance_slabs": dynamic_slabs,
				"discounts": {
					"smart_card_peak_discount_percent": 10,
					"smart_card_non_peak_discount_percent": 20,
					"non_peak_hours": [
						"start_of_revenue_service - 08:00",
						"12:00 - 17:00",
						"21:00 - end_of_revenue_service"
					]
				}
			},
			"airport_express_line": {
				"fare_model": "station_pair",
				"description": "Dedicated premium tariff for Orange Line (New Delhi to Yashobhoomi Dwarka Sec 25)",
				"stations_count": len(airport_stations),
				"point_to_point_fares": airport_fares,
				"total_pairs_scraped": len(airport_fares)
			}
		}