#!/usr/bin/env python3
"""
================================================================================
Ahmedabad Metro Cleaner Plugin (GMRC - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/ahmedabad_cleaner.py
Preserves 100% authentic raw fields, Gujarati localizations, operational status,
coordinates, and official dropdown metadata without injecting artificial schemas.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline.core.logger import UniversalPipelineLogger


class AhmedabadCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Ahmedabad & Gandhinagar Metro (GMRC)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_gu = self.clean_string(st.get("station_name_gu", "")) or name_en
			operator = self.clean_string(st.get("operator", "Gujarat Metro Rail Corporation (GMRC)"))
			line = self.clean_string(st.get("line", ""))
			layout = self.clean_string(st.get("layout", ""))
			status = self.clean_string(st.get("status", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_gu": name_gu,
				"line": line,
				"operator": operator,
			}

			if "station_id" in st:
				entry["station_id"] = st["station_id"]
			if layout:
				entry["layout"] = layout
			if status:
				entry["status"] = status
			if "is_operational" in st:
				entry["is_operational"] = st["is_operational"]
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
			if count % 15 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({clean_slug}) [GMRC]")

		return cleaned_dataset
