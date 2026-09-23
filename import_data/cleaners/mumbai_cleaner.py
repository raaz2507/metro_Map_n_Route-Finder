#!/usr/bin/env python3
"""
================================================================================
Mumbai Metro Cleaner Plugin (Pure Stage 2 - Non-Mutated Standard)
================================================================================
Location: import_data_new/cleaners/mumbai_cleaner.py
Preserves 100% authentic raw fields across operators (MMRCL + MMMOCL + MMOPL)
without injecting artificial schemas or hardcoded values.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger


class MumbaiCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Mumbai Metro (Line 3 MMRCL, Lines 2A/7 MMMOCL, Line 1 MMOPL)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_mr = self.clean_string(st.get("station_name_mr", "")) or name_en
			operator = self.clean_string(st.get("operator", "MMRCL"))
			line = self.clean_string(st.get("line", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_mr": name_mr,
				"line": line,
				"operator": operator,
			}

			# Retain authentic coordinates if present
			if "coordinates" in st and st["coordinates"]:
				entry["coordinates"] = self.sanitize_recursive(st["coordinates"])
			elif "details_raw" in st and isinstance(st["details_raw"], dict):
				en_det = st["details_raw"].get("en", {})
				if isinstance(en_det, dict) and en_det.get("latitude") and en_det.get("longitude"):
					try:
						entry["coordinates"] = {
							"latitude": float(en_det["latitude"]),
							"longitude": float(en_det["longitude"]),
						}
					except (ValueError, TypeError):
						pass

			if "is_interchange" in st:
				entry["is_interchange"] = st["is_interchange"]
			if "interchanges" in st:
				entry["interchanges"] = self.sanitize_recursive(st["interchanges"])
			if "order" in st:
				entry["order"] = st["order"]
			if "line_code" in st:
				entry["line_code"] = self.clean_string(st["line_code"])

			# Retain raw payloads verbatim without data loss
			if "details_raw" in st:
				entry["details_raw"] = self.sanitize_recursive(st["details_raw"])
			if "raw_payload" in st:
				entry["raw_payload"] = self.sanitize_recursive(st["raw_payload"])
			if "en_raw" in st:
				entry["en_raw"] = self.sanitize_recursive(st["en_raw"])
			if "mr_raw" in st:
				entry["mr_raw"] = self.sanitize_recursive(st["mr_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 10 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [{operator}]")

		return cleaned_dataset