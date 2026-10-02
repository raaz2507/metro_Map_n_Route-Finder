#!/usr/bin/env python3
"""
================================================================================
Kochi Metro Cleaner Plugin (KMRL - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/kochi_cleaner.py
Preserves 100% authentic raw fields, Malayalam & Hindi localizations, accessibility,
coordinates, and official GTFS metadata without injecting artificial schemas.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger


class KochiCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Kochi Metro (KMRL)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_ml = self.clean_string(st.get("station_name_ml", "")) or name_en
			name_hi = self.clean_string(st.get("station_name_hi", "")) or name_en
			operator = self.clean_string(st.get("operator", "Kochi Metro Rail Limited (KMRL)"))
			line = self.clean_string(st.get("line", ""))
			layout = self.clean_string(st.get("layout", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_ml": name_ml,
				"station_name_hi": name_hi,
				"line": line,
				"operator": operator,
			}

			if layout:
				entry["layout"] = layout
			if "order" in st:
				entry["order"] = st["order"]
			if "zone_id" in st and st["zone_id"]:
				entry["zone_id"] = self.clean_string(st["zone_id"])
			if "wheelchair_boarding" in st:
				entry["wheelchair_boarding"] = st["wheelchair_boarding"]

			# Retain authentic coordinates if present
			if "coordinates" in st and st["coordinates"]:
				entry["coordinates"] = self.sanitize_recursive(st["coordinates"])

			# Retain GTFS meta raw verbatim
			if "meta_raw" in st:
				entry["meta_raw"] = self.sanitize_recursive(st["meta_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 10 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [Kochi Metro]")

		return cleaned_dataset
