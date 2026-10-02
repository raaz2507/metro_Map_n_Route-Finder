#!/usr/bin/env python3
"""
================================================================================
Namma Metro Cleaner Plugin (BMRCL Bengaluru - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/namma_cleaner.py
Preserves 100% authentic raw fields, Kannada localizations, and layout data
without injecting artificial schemas or hardcoded values.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger


class NammaCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Namma Metro (BMRCL Bengaluru)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_kn = self.clean_string(st.get("station_name_kn", "")) or name_en
			operator = self.clean_string(st.get("operator", "BMRCL"))
			line = self.clean_string(st.get("line", ""))
			layout = self.clean_string(st.get("layout", ""))
			opened_date = self.clean_string(st.get("opened_date", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_kn": name_kn,
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
			if count % 20 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [BMRCL]")

		return cleaned_dataset
