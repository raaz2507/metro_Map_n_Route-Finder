#!/usr/bin/env python3
"""
================================================================================
NCRTC Namo Bharat Cleaner Plugin (0% Mutation Standard)
================================================================================
Location: import_data/cleaners/ncrtc_cleaner.py
Preserves 100% authentic summary_raw and details_raw payloads.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger

class NCRTCCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Namo Bharat RRTS."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			c_slug = self.clean_string(slug).lower()
			cleaned[c_slug] = {
				"id": c_slug,
				"station_id": st.get("station_id", count),
				"station_code": self.clean_string(st.get("station_code", "")).upper(),
				"station_name": self.clean_string(st.get("station_name", "")),
				"summary_raw": self.sanitize_recursive(st.get("summary_raw", {})),
				"details_raw": self.sanitize_recursive(st.get("details_raw", {}))
			}
			count += 1
			if count % 5 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {cleaned[c_slug]['station_name']}")

		return cleaned