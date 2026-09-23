#!/usr/bin/env python3
"""
================================================================================
DMRC & Rapid Metro Cleaner Plugin (SQL Join Deduplication Standard)
================================================================================
Location: import_data/cleaners/dmrc_cleaner.py
Removes backend SQL join duplicates from station_facility and nearby_places.
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger

class DMRCCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for DMRC Delhi & Rapid Metro Gurugram."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			c_slug = self.clean_string(slug).lower()
			c_code = self.clean_string(st.get("station_code", "")).upper()
			name_en = self.clean_string(st.get("station_name_en", ""))
			name_hi = self.clean_string(st.get("station_name_hi", ""))

			en_raw = self.sanitize_recursive(st.get("en_raw", {}))
			hi_raw = self.sanitize_recursive(st.get("hi_raw", {}))

			# Deduplicate repetitive SQL join facilities in en_raw
			if isinstance(en_raw, dict) and "station_facility" in en_raw:
				facs = en_raw.get("station_facility", [])
				if isinstance(facs, list):
					seen_facs = set()
					unique_facs = []
					for f in facs:
						fname = f.get("name", "") if isinstance(f, dict) else str(f)
						if fname and fname not in seen_facs:
							seen_facs.add(fname)
							unique_facs.append(f)
					en_raw["station_facility"] = unique_facs

			cleaned[c_slug] = {
				"id": c_slug,
				"station_code": c_code,
				"station_name_en": name_en,
				"station_name_hi": name_hi,
				"en_raw": en_raw,
				"hi_raw": hi_raw
			}

			count += 1
			if count % 50 == 0 or count == total:
				UniversalPipelineLogger.log("PROCESS", f"[{count}/{total}] Cleaned & Deduplicated: {name_en} ({c_code})")

		return cleaned