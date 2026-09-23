#!/usr/bin/env python3
"""
================================================================================
Universal Base Transit Structurer (Stage 3 Abstract Strategy Pattern)
================================================================================
Location: import_data_new/pipeline_core/base_structure.py
Role    : Abstract Base Class for Network Master Structurers
Contract: Zero-Data-Loss, Class-Based (OOP), Atomic Writes, Live Audit Hook
================================================================================
"""

import abc
import json
from pathlib import Path
from typing import Optional, Dict, Any
from .logger import UniversalPipelineLogger
from .file_manager import UniversalFileSystemManager
from .audit_engine import UniversalAuditEngine


class BaseTransitStructurer(abc.ABC):
	"""Abstract Base Class for all network-specific Stage 3 master structurers."""

	@abc.abstractmethod
	def structure(
		self,
		cleaned_dataset: Dict[str, Any],
		network_id: str,
		existing_master: Optional[Dict[str, Any]] = None
	) -> Dict[str, Any]:
		"""Network-specific schema transformation and canonical structuring logic."""
		pass

	def process(
		self,
		input_path: Path,
		output_path: Path,
		network_id: str,
		existing_master_path: Optional[Path] = None
	) -> Dict[str, Any]:
		"""Standard execution lifecycle for all Stage 3 structurers with live audit."""
		UniversalPipelineLogger.log("INIT", "==================================================================")
		UniversalPipelineLogger.log("INIT", f"Stage 3 Master Structuring executing for: {network_id}")
		UniversalPipelineLogger.log("INIT", f"Input Cleaned File  : {input_path.name}")
		UniversalPipelineLogger.log("INIT", f"Output Master File : {output_path.name}")
		UniversalPipelineLogger.log("INIT", "==================================================================")

		if not input_path.exists():
			UniversalPipelineLogger.log("ERROR", f"Stage 2 cleaned input file not found: {input_path}")
			return {}

		try:
			with open(input_path, "r", encoding="utf-8") as f:
				cleaned_data = json.load(f)
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"Failed to parse cleaned dataset: {e}")
			return {}

		existing_master = None
		# Check explicit reference master path or check if output_path already exists on disk
		target_ref = existing_master_path or (output_path if output_path.exists() else None)
		if target_ref and target_ref.exists():
			try:
				with open(target_ref, "r", encoding="utf-8") as f:
					existing_master = json.load(f)
				UniversalPipelineLogger.log("INFO", f"Loaded reference baseline master: {target_ref.name}")
			except Exception as e:
				UniversalPipelineLogger.log("WARN", f"Could not load existing baseline master: {e}")

		UniversalPipelineLogger.log("INFO", f"Structuring authentic records for network: {network_id}...")
		structured_result = self.structure(cleaned_data, network_id, existing_master=existing_master)

		stn_count = len(structured_result.get("stations", structured_result)) if isinstance(structured_result, (dict, list)) else 0
		UniversalPipelineLogger.log("SUCCESS", f"Successfully structured {stn_count} stations.")

		# ⚡ Real-Time Live Audit & Diff Stream (Zero file pollution)
		if existing_master:
			UniversalAuditEngine.audit_and_stream(network_id, existing_master, structured_result)
		else:
			UniversalPipelineLogger.log("AUDIT", f"Initial intake: {stn_count} stations established as canonical baseline.")

		UniversalPipelineLogger.log("INFO", f"Saving canonical Stage 3 master dataset to: {output_path}")
		UniversalFileSystemManager.save_atomic_tab_json(output_path, structured_result)
		UniversalPipelineLogger.log("DONE", f"Stage 3 Master file saved: {output_path.name}")
		return structured_result