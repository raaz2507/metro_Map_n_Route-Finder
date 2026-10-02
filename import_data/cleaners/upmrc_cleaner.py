#!/usr/bin/env python3
"""
================================================================================
UPMRC Unified Cleaner Plugin (Lucknow, Kanpur, Agra - 0% Mutation Standard)
================================================================================
Location: import_data/cleaners/upmrc_cleaner.py
Preserves 100% authentic raw fields, Hindi localizations, station codes,
official gates, lifts, escalators, and media payloads without injecting artificial schemas.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger


class UPMRCCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for UPMRC Networks (Lucknow, Kanpur, Agra)."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned_dataset = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			clean_slug = self.clean_string(slug).lower()
			st_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_hi = self.clean_string(st.get("station_name_hi", "")) or name_en
			operator = self.clean_string(st.get("operator", "UPMRC"))
			line = self.clean_string(st.get("line", ""))

			entry = {
				"id": clean_slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_hi": name_hi,
				"operator": operator,
			}

			if line:
				entry["line"] = line
			if "order" in st:
				entry["order"] = st["order"]

			# Retain authentic coordinates if present or extract from UPMRC meta_raw
			coords = st.get("coordinates")
			if not coords and "meta_raw" in st and isinstance(st["meta_raw"], dict):
				lat = st["meta_raw"].get("latitude")
				lon = st["meta_raw"].get("longitude")
				if lat and lon:
					try:
						coords = {"latitude": float(lat), "longitude": float(lon)}
					except (ValueError, TypeError):
						pass

			if coords:
				entry["coordinates"] = self.sanitize_recursive(coords)

			# Retain authentic UPMRC API payloads verbatim without data loss
			if "details_raw" in st:
				entry["details_raw"] = self.sanitize_recursive(st["details_raw"])
			if "meta_raw" in st:
				entry["meta_raw"] = self.sanitize_recursive(st["meta_raw"])

			cleaned_dataset[clean_slug] = entry

			count += 1
			if count % 10 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned: {name_en} ({st_code}) [{network_id}]")

		return cleaned_dataset
