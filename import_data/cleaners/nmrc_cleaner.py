#!/usr/bin/env python3
"""
================================================================================
NMRC Noida Aqua Line Cleaner Plugin
================================================================================
Location: import_data/cleaners/nmrc_cleaner.py
================================================================================
"""

from pipeline_core.base_cleaner import BaseTransitCleaner
from pipeline_core.logger import UniversalPipelineLogger

class NMRCCleaner(BaseTransitCleaner):
	"""Stage 2 Cleaner for Noida Metro Aqua Line."""

	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		cleaned = {}
		total = len(raw_dataset)
		count = 0

		for slug, st in raw_dataset.items():
			c_slug = self.clean_string(slug).lower()
			cleaned[c_slug] = self.sanitize_recursive(st)
			count += 1

		UniversalPipelineLogger.log("PROCESS", f"Cleaned {count} NMRC stations.")
		return cleaned