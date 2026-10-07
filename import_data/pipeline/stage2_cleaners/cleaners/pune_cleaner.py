#!/usr/bin/env python3
"""
================================================================================
Pune Metro Cleaner Plugin (Maha Metro - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/pune_cleaner.py
Preserves 100% authentic raw fields, Marathi localizations, station codes,
coordinates, and official fare dropdown metadata without injecting artificial schemas.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline.core.logger import UniversalPipelineLogger


class PuneCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Pune Metro (Maha Metro)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_mr = self.clean_string(st.get("station_name_mr", "")) or name_en
			operator = self.clean_string(st.get("operator", "Maha Metro"))
			line = self.clean_string(st.get("line", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_mr": name_mr,
				"operator": operator,
			}

			if line:
				entry["line"] = line
			if "order" in st:
				entry["order"] = st["order"]

			# Retain authentic coordinates if present
			if "coordinates" in st and st["coordinates"]:
				entry["coordinates"] = self.sanitize_recursive(st["coordinates"])

			# Retain raw metadata verbatim
			if "meta_raw" in st:
				entry["meta_raw"] = self.sanitize_recursive(st["meta_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 10 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [Pune Metro]")

		return cleaned_dataset
