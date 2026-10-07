#!/usr/bin/env python3
"""
================================================================================
Universal Transit Pipeline Fare Scraper Engine
================================================================================
Architecture : 100% Class-Based (OOP), Manifest-Driven, Multi-Protocol
Design       : Adapter Pattern + Facade Architecture + SOLID Principles
Environment  : Python 3.8+
================================================================================
CLI Usage:
  python universal_fare_scraper.py <network_id>
  python universal_fare_scraper.py --all
================================================================================
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any

# Ensure import_data_new is on python path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

from pipeline_core import UniversalPipelineLogger, UniversalFileSystemManager
from fare_adapters import FareAdapterFactory

MANIFEST_PATH = BASE_DIR / "master_audit_manifest.json"


class UniversalFareEngine:
	"""Main Orchestrator & CLI Runner for Transit Fare Scraping."""

	def __init__(self, manifest_path: Path = MANIFEST_PATH):
		self.manifest_path = manifest_path
		self.manifest = self._load_manifest()

	def _load_manifest(self) -> dict:
		if not self.manifest_path.exists():
			UniversalPipelineLogger.log("ERROR", f"Manifest file missing: {self.manifest_path}")
			return {}
		with open(self.manifest_path, "r", encoding="utf-8") as f:
			return json.load(f)

	def scrape_fare(self, network_id: str) -> dict:
		"""Scrapes fare for a single network using its registered adapter or shared dataset mapping."""
		net_info = self.manifest.get("networks", {}).get(network_id)
		if not net_info:
			UniversalPipelineLogger.log("ERROR", f"Network '{network_id}' not found in manifest!")
			return {}

		net_name = net_info.get("name", network_id)
		UniversalPipelineLogger.log("INIT", "==================================================================")
		UniversalPipelineLogger.log("INIT", f"Universal Fare Scraper executing for: {net_name} ({network_id})")
		UniversalPipelineLogger.log("INIT", "==================================================================")

		# Check if network inherits shared dataset from parent network
		shared_from = net_info.get("use_shared_dataset_from")
		if shared_from:
			UniversalPipelineLogger.log("INFO", f"Network '{network_id}' shares fare dataset from '{shared_from}'. Resolving...")
			parent_path = UniversalFileSystemManager.get_stage_path(shared_from, "fare_raw")
			if not parent_path.exists():
				UniversalPipelineLogger.log("INFO", f"Parent '{shared_from}' dataset not found. Generating parent dataset first...")
				self.scrape_fare(shared_from)

			if parent_path.exists():
				with open(parent_path, "r", encoding="utf-8") as pf:
					shared_data = json.load(pf)

				child_dataset = {
					"metadata": {
						**shared_data.get("metadata", {}),
						"network_id": network_id,
						"network_name": net_name,
						"shared_from": shared_from,
						"shared_note": "Fares and ticketing shared with parent transit system"
					},
					**{k: v for k, v in shared_data.items() if k != "metadata"}
				}
				output_path = UniversalFileSystemManager.get_stage_path(network_id, "fare_raw")
				final_output = UniversalFileSystemManager.save_atomic_tab_json(output_path, child_dataset)
				file_size_kb = final_output.stat().st_size / 1024
				UniversalPipelineLogger.log("SUCCESS", f"✅ Shared fare dataset mapped successfully for {net_name}!")
				UniversalPipelineLogger.log("SUCCESS", f"✅ Output written atomically to: {final_output.name} ({file_size_kb:.1f} KB)")
				UniversalPipelineLogger.log("SUCCESS", "==================================================================")
				return child_dataset
			else:
				UniversalPipelineLogger.log("ERROR", f"Could not resolve parent dataset '{shared_from}' for {network_id}!")
				return {}

		try:
			adapter = FareAdapterFactory.get_adapter(network_id)
		except NotImplementedError as e:
			UniversalPipelineLogger.log("WARN", str(e))
			return {}

		# Execute extraction
		fare_dataset = adapter.extract_fare(network_id, net_info)
		if not fare_dataset:
			UniversalPipelineLogger.log("ERROR", f"Failed to extract fare data for {net_name}!")
			return {}

		# Atomic save to datasets/{network_id}_data/{network_id}_fare_raw.json
		output_path = UniversalFileSystemManager.get_stage_path(network_id, "fare_raw")
		final_output = UniversalFileSystemManager.save_atomic_tab_json(output_path, fare_dataset)

		file_size_kb = final_output.stat().st_size / 1024
		UniversalPipelineLogger.log("SUCCESS", f"✅ Fare Scraping completed for {net_name}!")
		UniversalPipelineLogger.log("SUCCESS", f"✅ Output written atomically to: {final_output.name} ({file_size_kb:.1f} KB)")
		UniversalPipelineLogger.log("SUCCESS", "==================================================================")

		return fare_dataset

	def scrape_all(self) -> Dict[str, Any]:
		"""Batch scrapes all registered transit networks in one unified pipeline execution."""
		all_manifest_networks = list(self.manifest.get("networks", {}).keys())
		if not all_manifest_networks:
			UniversalPipelineLogger.log("WARN", "No networks found in manifest.")
			return {}

		# Order: primary adapters first, shared datasets second
		adapters_to_run = [n for n in all_manifest_networks if n in FareAdapterFactory._registry]
		shared_to_run = [n for n in all_manifest_networks if self.manifest.get("networks", {}).get(n, {}).get("use_shared_dataset_from")]
		execution_order = adapters_to_run + shared_to_run

		UniversalPipelineLogger.log("BATCH", f"Starting batch fare scrape across {len(execution_order)} target network(s)...")
		results = {}

		for net_id in execution_order:
			try:
				res = self.scrape_fare(net_id)
				results[net_id] = {
					"status": "SUCCESS" if res else "FAILED",
					"size_bytes": len(json.dumps(res)) if res else 0
				}
			except Exception as e:
				UniversalPipelineLogger.log("ERROR", f"Unexpected exception scraping {net_id}: {e}")
				results[net_id] = {"status": "ERROR", "error": str(e)}

		# Summary Table
		UniversalPipelineLogger.log("REPORT", "==================================================================")
		UniversalPipelineLogger.log("REPORT", "                     BATCH FARE SCRAPING REPORT                   ")
		UniversalPipelineLogger.log("REPORT", "==================================================================")
		for net_id, info in results.items():
			status_icon = "✅" if info["status"] == "SUCCESS" else "❌"
			UniversalPipelineLogger.log("REPORT", f"  {status_icon} {net_id:<25} : {info['status']}")
		UniversalPipelineLogger.log("REPORT", "==================================================================")

		return results


if __name__ == "__main__":
	args = sys.argv[1:]
	engine = UniversalFareEngine()

	if "--all" in args:
		batch_res = engine.scrape_all()
		success = any(r.get("status") == "SUCCESS" for r in batch_res.values())
		sys.exit(0 if success else 1)
	else:
		target_network = args[0] if len(args) > 0 and not args[0].startswith("--") else "nmrc_noida"
		res = engine.scrape_fare(target_network)
		sys.exit(0 if res else 1)