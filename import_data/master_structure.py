#!/usr/bin/env python3
"""
================================================================================
Master Structure & Schema Supervision Engine (Stage 3 Authority)
================================================================================
File Location : import_data_new/master_structure.py
Role          : Stage 3 Canonical Schema Authority & Quality Gate
Architecture  : 100% Class-Based (OOP), Developer-Supervised, Zero-Data-Loss
--------------------------------------------------------------------------------
STAGE 3 ARCHITECTURAL CONTRACT & GOVERNANCE RULES
--------------------------------------------------------------------------------
1. DEVELOPER OWNERSHIP & MINUTE SUPERVISION:
   • Every network schema conversion is strictly supervised by the developer.
   • Modular plugins in structures/ execute network-specific transformations.
2. ZERO DATA LOSS PHILOSOPHY:
   • Stage 3 preserves all authentic cleaned fields without synthetic truncation.
3. LIFECYCLE & FILE PATHS:
   • Input  : datasets/<network_id>_data/<network_id>_cleaned.json (Stage 2)
   • Output : datasets/<network_id>_data/<network_id>_master.json (Stage 3)
   • Indent : Pure Tab Indentation (indent="\\t") with UTF-8 encoding.
   • Safety : Atomic file replacement (.tmp -> replace) to prevent corruption.
================================================================================
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, Any, Optional

# Ensure root directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

from pipeline_core.logger import UniversalPipelineLogger
from pipeline_core.file_manager import UniversalFileSystemManager
from structures import StructureFactory


class MasterStructure:
	"""
	Stage 3 Master Structure Supervision & Schema Contract Authority.
	Serves as the supervisory quality gate and authentic master schema anchor.
	"""

	SCHEMA_VERSION = "3.0.0"

	def __init__(self, base_dir: Optional[Path] = None):
		"""Initialize Master Structure Authority."""
		self.base_dir = base_dir or BASE_DIR

	def process_network(self, network_id: str) -> Path:
		"""
		Executes Stage 3 Master Structuring for a specific network ID.
		Input  : datasets/{network_id}_data/{network_id}_cleaned.json
		Output : datasets/{network_id}_data/{network_id}_master.json
		"""
		clean_nid = network_id.strip().lower()
		structurer = StructureFactory.get_structure(clean_nid)

		input_path = UniversalFileSystemManager.get_stage_path(clean_nid, "cleaned")
		output_path = UniversalFileSystemManager.get_stage_path(clean_nid, "master")

		# Reference master for preserving bilingual fields
		ref_master_path = output_path if output_path.exists() else None

		structurer.process(
			input_path=input_path,
			output_path=output_path,
			network_id=clean_nid,
			existing_master_path=ref_master_path,
		)
		return output_path


# Backward compatibility alias
MasterStrucher = MasterStructure


def main():
	parser = argparse.ArgumentParser(description="Master Structure Supervision Engine (Stage 3)")
	parser.add_argument(
		"positional_network",
		nargs="?",
		type=str,
		default=None,
		help="Network ID to structure (positional)",
	)
	parser.add_argument(
		"--network",
		"-n",
		type=str,
		default=None,
		help="Network ID to structure",
	)
	args = parser.parse_args()

	target_network = args.network or args.positional_network or "ncrtc_rrts"

	engine = MasterStructure()
	try:
		out_file = engine.process_network(target_network)
		print(f"\n[OK] Master dataset successfully generated at: {out_file}")
	except Exception as e:
		UniversalPipelineLogger.log("ERROR", f"Stage 3 execution failed: {e}")
		sys.exit(1)


if __name__ == "__main__":
	main()