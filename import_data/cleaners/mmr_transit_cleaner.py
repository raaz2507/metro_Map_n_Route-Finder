#!/usr/bin/env python3
"""
================================================================================
MMR Transit Cleaner Plugin (Navi Mumbai & Monorail - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/mmr_transit_cleaner.py
Preserves 100% authentic raw fields, Marathi localizations, suburban connections,
kilometer distances, and layout data without injecting artificial schemas.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger


class MMRTransitCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Navi Mumbai Metro and Mumbai Monorail."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_mr = self.clean_string(st.get("station_name_mr", "")) or name_en
			operator = self.clean_string(st.get("operator", "MMRDA / CIDCO"))
			line = self.clean_string(st.get("line", ""))
			layout = self.clean_string(st.get("layout", ""))
			opened_date = self.clean_string(st.get("opened_date", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_mr": name_mr,
				"line": line,
				"operator": operator,
			}

			if layout:
				entry["layout"] = layout
			if opened_date:
				entry["opened_date"] = opened_date
			if "order" in st:
				entry["order"] = st["order"]
			if "connections" in st and st["connections"]:
				entry["connections"] = self.clean_string(st["connections"])
			if "inter_station_km" in st:
				entry["inter_station_km"] = st["inter_station_km"]
			if "cumulative_km" in st:
				entry["cumulative_km"] = st["cumulative_km"]

			# Retain authentic coordinates if present
			if "coordinates" in st and st["coordinates"]:
				entry["coordinates"] = self.sanitize_recursive(st["coordinates"])

			# Retain metadata verbatim
			if "meta_raw" in st:
				entry["meta_raw"] = self.sanitize_recursive(st["meta_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 5 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [{network_id}]")

		return cleaned_dataset
