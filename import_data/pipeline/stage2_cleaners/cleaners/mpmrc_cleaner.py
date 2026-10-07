#!/usr/bin/env python3
"""
================================================================================
MPMRCL Unified Cleaner Plugin (Indore & Bhopal - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/mpmrc_cleaner.py
Preserves 100% authentic raw fields, station codes, layout, accurate KMZ coordinates,
and placemark metadata without injecting artificial schemas.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline.core.logger import UniversalPipelineLogger


class MPMRCCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for MPMRCL Networks (Indore & Bhopal)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_hi = self.clean_string(st.get("station_name_hi", "")) or name_en
			operator = self.clean_string(st.get("operator", "Madhya Pradesh Metro Rail Corporation Limited (MPMRCL)"))
			line = self.clean_string(st.get("line", ""))
			layout = self.clean_string(st.get("layout", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"line": line,
				"operator": operator,
			}

			if name_hi != name_en:
				entry["station_name_hi"] = name_hi
			if layout:
				entry["layout"] = layout
			if "order" in st:
				entry["order"] = st["order"]

			# Retain authentic coordinates if present
			if "coordinates" in st and st["coordinates"]:
				entry["coordinates"] = self.sanitize_recursive(st["coordinates"])

			# Retain KMZ placemark metadata verbatim
			if "meta_raw" in st:
				entry["meta_raw"] = self.sanitize_recursive(st["meta_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 10 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [{network_id}]")

		return cleaned_dataset
