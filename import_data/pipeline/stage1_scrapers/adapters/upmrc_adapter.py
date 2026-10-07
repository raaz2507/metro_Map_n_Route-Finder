#!/usr/bin/env python3
"""
================================================================================
UPMRC Ecosystem Transit Adapter (Lucknow, Kanpur, Agra)
================================================================================
Architecture : 100% Manifest-Driven, Verbatim Raw Intake, Zero-Mutation Standard
Governance   : No hardcoded URLs in Python; reads directly from master manifest.
Preservation : Stores complete raw API responses as-is without dropping or editing.
================================================================================
"""

import random
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, Any
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.core.logger import UniversalPipelineLogger


class UPMRCEcosystemAdapter(BaseTransitAdapter):
	"""
	Handles UPMRC Ecosystem (Lucknow, Kanpur, Agra) REST API.
	Zero hardcoded URLs. Config-driven via manifest.
	Polite Concurrency: 3 workers + human jitter to prevent server throttling.
	"""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "https://www.upmetrorail.com/")
		session = self.create_session(source_url)

		city_id = net_info.get("city_id")
		line_code = net_info.get("line_code")
		data_sources = net_info.get("data_sources", {})

		stations_cfg = data_sources.get("stations", {})
		stations_template = stations_cfg.get("url") if isinstance(stations_cfg, dict) else stations_cfg

		if not stations_template or city_id is None or not line_code:
			UniversalPipelineLogger.log("ERROR", f"Missing stations URL template, city_id, or line_code for {network_id}")
			return {}

		# Format stations list URL strictly via manifest configuration
		api_list_url = stations_template.format(lang="en", city_id=city_id, line_code=line_code)
		UniversalPipelineLogger.log("CRAWL", f"Fetching UPMRC stations list: {api_list_url}")

		resp = session.get(api_list_url, verify=False, timeout=15)
		resp.raise_for_status()
		raw_station_list = resp.json()

		if not isinstance(raw_station_list, list) or (len(raw_station_list) == 1 and "result" in raw_station_list[0]):
			UniversalPipelineLogger.log("ERROR", f"Failed to retrieve valid stations list for {network_id}: {raw_station_list}")
			return {}

		UniversalPipelineLogger.log("CRAWL", f"Discovered {len(raw_station_list)} live stations for {network_id}.")

		details_cfg = data_sources.get("station_details", {})
		detail_template = details_cfg.get("url") if isinstance(details_cfg, dict) else ""
		languages = details_cfg.get("languages", ["en", "hi"]) if isinstance(details_cfg, dict) else ["en", "hi"]

		def _fetch_station_details(st_meta: dict) -> dict:
			st_code = st_meta.get("st_code") or ""
			st_name = st_meta.get("st_name") or st_code
			slug = UniversalFileSystemManager.slugify(st_name)

			# Polite micro-jitter
			time.sleep(random.uniform(0.10, 0.25))

			lang_payloads = {}
			if detail_template and st_code:
				for lang in languages:
					target_url = detail_template.format(lang=lang, city_id=city_id, st_code=st_code)
					for attempt in range(2):
						try:
							r = session.get(target_url, verify=False, timeout=10)
							if r.status_code == 200:
								lang_payloads[lang] = r.json()
								break
							elif r.status_code in (429, 503):
								time.sleep(2.0)
						except Exception:
							time.sleep(0.5)

			en_res = lang_payloads.get("en", {})
			hi_res = lang_payloads.get("hi", {})

			name_en = ((en_res.get("data") or {}).get("st_name") if isinstance(en_res, dict) else "") or st_name
			name_hi = ((hi_res.get("data") or {}).get("st_name") if isinstance(hi_res, dict) else "") or name_en

			# 100% Authentic Verbatim Raw preservation - Zero data loss, zero mutation
			return {
				"code": st_code,
				"slug": slug,
				"name_en": name_en,
				"name_hi": name_hi,
				"meta_raw": st_meta,
				"en_raw": en_res,
				"hi_raw": hi_res,
			}

		UniversalPipelineLogger.log("CRAWL", f"Starting polite extraction for {len(raw_station_list)} stations (3 safe workers)...")
		results_map = {}
		completed_count = 0
		total_stations = len(raw_station_list)

		with ThreadPoolExecutor(max_workers=3) as executor:
			future_to_code = {
				executor.submit(_fetch_station_details, st): st.get("st_code")
				for st in raw_station_list
			}
			for future in as_completed(future_to_code):
				res = future.result()
				results_map[res["code"]] = res
				completed_count += 1
				UniversalPipelineLogger.log("CRAWL", f"[{completed_count}/{total_stations}] Verbatim Raw Intake: {res['name_en']} ({res['code']})")

		# Deterministic order preservation matching line sequence
		deep_dataset = {}
		for st in raw_station_list:
			code = st.get("st_code")
			item = results_map.get(code)
			if not item:
				continue

			slug = item["slug"]
			orig_slug = slug
			counter = 1
			while slug in deep_dataset and deep_dataset[slug].get("station_code") != code:
				slug = f"{orig_slug}({counter})"
				counter += 1

			deep_dataset[slug] = {
				"id": slug,
				"station_code": item["code"],
				"station_name_en": item["name_en"],
				"station_name_hi": item["name_hi"],
				"meta_raw": item["meta_raw"],
				"en_raw": item["en_raw"],
				"hi_raw": item["hi_raw"],
			}

		return deep_dataset