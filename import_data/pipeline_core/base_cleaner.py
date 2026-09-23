#!/usr/bin/env python3
"""
================================================================================
Universal Base Transit Cleaner (Abstract Strategy Pattern)
================================================================================
Location: import_data/pipeline_core/base_cleaner.py
Provides shared utilities, atomic file IO, and lifecycle hooks for all cleaners.
================================================================================
"""

import abc
import json
import re
import sys
from pathlib import Path
from .logger import UniversalPipelineLogger
from .file_manager import UniversalFileSystemManager

class BaseTransitCleaner(abc.ABC):
	"""Abstract Base Class for all network-specific Stage 2 cleaners."""

	@abc.abstractmethod
	def clean(self, raw_dataset: dict, network_id: str) -> dict:
		"""Network-specific cleaning, deduplication, and sanitization logic."""
		pass

	@staticmethod
	def clean_string(val):
		"""Standard whitespace and string sanitizer."""
		if isinstance(val, str):
			return re.sub(r"\s+", " ", val).strip()
		return val

	@classmethod
	def sanitize_recursive(cls, obj):
		"""Deep recursive sanitization preserving data types without mutations."""
		if isinstance(obj, dict):
			return {cls.clean_string(k): cls.sanitize_recursive(v) for k, v in obj.items()}
		elif isinstance(obj, list):
			return [cls.sanitize_recursive(item) for item in obj]
		elif isinstance(obj, str):
			return cls.clean_string(obj)
		return obj

	def process(self, input_path: Path, output_path: Path, network_id: str) -> dict:
		"""Standard execution lifecycle for all Stage 2 cleaners."""
		UniversalPipelineLogger.log("INIT", "==================================================================")
		UniversalPipelineLogger.log("INIT", f"Stage 2 Cleaning Pipeline executing for: {network_id}")
		UniversalPipelineLogger.log("INIT", f"Input File  : {input_path.name}")
		UniversalPipelineLogger.log("INIT", f"Output File : {output_path.name}")
		UniversalPipelineLogger.log("INIT", "==================================================================")

		if not input_path.exists():
			UniversalPipelineLogger.log("ERROR", f"Raw input file not found: {input_path}")
			return {}

		try:
			with open(input_path, "r", encoding="utf-8") as f:
				raw_data = json.load(f)
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"Failed to parse raw JSON: {e}")
			return {}

		total_in = len(raw_data)
		UniversalPipelineLogger.log("PROCESS", f"Loaded {total_in} raw stations. Running network transformation...")

		cleaned_data = self.clean(raw_data, network_id)
		if not cleaned_data:
			UniversalPipelineLogger.log("ERROR", "Cleaner produced empty output!")
			return {}

		# Save atomically using standard tab indentation
		final_output = UniversalFileSystemManager.save_atomic_tab_json(output_path, cleaned_data)
		file_size_kb = final_output.stat().st_size / 1024
		line_count = sum(1 for _ in open(final_output, "r", encoding="utf-8"))

		UniversalPipelineLogger.log("SUCCESS", "==================================================================")
		UniversalPipelineLogger.log("SUCCESS", f"✅ Stage 2 Cleaning Complete for {network_id}!")
		UniversalPipelineLogger.log("SUCCESS", f"✅ Output File : {final_output.name}")
		UniversalPipelineLogger.log("SUCCESS", f"✅ Stats       : {file_size_kb:.1f} KB ({line_count:,} lines, {len(cleaned_data)} stations)")
		UniversalPipelineLogger.log("SUCCESS", "==================================================================")
		return cleaned_data