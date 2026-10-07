#!/usr/bin/env python3
"""
================================================================================
Chennai Metro Cleaner Plugin (CMRL - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/chennai_cleaner.py
Preserves 100% authentic raw fields, Tamil localizations, layout, and meta
without injecting artificial schemas or hardcoded values.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline.core.logger import UniversalPipelineLogger


class ChennaiCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Chennai Metro (CMRL)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_ta = self.clean_string(st.get("station_name_ta", "")) or name_en
			operator = self.clean_string(st.get("operator", "CMRL"))
			line = self.clean_string(st.get("line", ""))
			layout = self.clean_string(st.get("layout", ""))
			opened_date = self.clean_string(st.get("opened_date", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_ta": name_ta,
				"line": line,
				"operator": operator,
			}

			if "station_id" in st:
				entry["station_id"] = st["station_id"]
			if layout:
				entry["layout"] = layout
			if opened_date:
				entry["opened_date"] = opened_date
			if "order" in st:
				entry["order"] = st["order"]
			if "address" in st and st["address"]:
				entry["address"] = self.clean_string(st["address"])

			# Retain authentic coordinates if present
			if "coordinates" in st and st["coordinates"]:
				entry["coordinates"] = self.sanitize_recursive(st["coordinates"])

			# Retain facilities, timings, and meta raw verbatim
			if "facilities" in st:
				entry["facilities"] = self.sanitize_recursive(st["facilities"])
			if "timing_raw" in st:
				entry["timing_raw"] = self.sanitize_recursive(st["timing_raw"])
			if "meta_raw" in st:
				entry["meta_raw"] = self.sanitize_recursive(st["meta_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 15 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [Chennai Metro]")

		return cleaned_dataset
