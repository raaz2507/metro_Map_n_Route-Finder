#!/usr/bin/env python3
"""
================================================================================
Kolkata Metro Cleaner Plugin (Metro Railway Kolkata - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/kolkata_cleaner.py
Preserves 100% authentic raw fields, Bengali localizations, layout, and meta
without injecting artificial schemas or hardcoded values.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger


class KolkataCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Kolkata Metro (Metro Railway Kolkata / Indian Railways)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_bn = self.clean_string(st.get("station_name_bn", "")) or name_en
			operator = self.clean_string(st.get("operator", "Metro Railway Kolkata"))
			line = self.clean_string(st.get("line", ""))
			layout = self.clean_string(st.get("layout", ""))
			opened_date = self.clean_string(st.get("opened_date", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_bn": name_bn,
				"line": line,
				"operator": operator,
			}

			if layout:
				entry["layout"] = layout
			if opened_date:
				entry["opened_date"] = opened_date
			if "order" in st:
				entry["order"] = st["order"]

			# Retain authentic coordinates if present
			if "coordinates" in st and st["coordinates"]:
				entry["coordinates"] = self.sanitize_recursive(st["coordinates"])

			# Retain raw meta payload verbatim without data loss
			if "meta_raw" in st:
				entry["meta_raw"] = self.sanitize_recursive(st["meta_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 15 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [Kolkata Metro]")

		return cleaned_dataset
