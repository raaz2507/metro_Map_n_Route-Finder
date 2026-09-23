#!/usr/bin/env python3
"""
================================================================================
Universal Transit Pipeline Scraper Engine
================================================================================
Architecture : 100% Class-Based (OOP), Manifest-Driven, Multi-Protocol Engine
Design       : Adapter Pattern + Facade Architecture + SOLID Principles
Author       : Metro Audit Hub Engineering
Environment  : Python 3.8+ (Zero external mandatory dependencies; uses standard library)

--------------------------------------------------------------------------------
ARCHITECTURE FLOW DIAGRAM (MULTI-PROTOCOL WATERFALL)
--------------------------------------------------------------------------------

 [ TRIGGER: python universal_scraper.py <network_id> [--download-media] ]
								   │
								   ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 📋 MANIFEST ENGINE: master_audit_manifest.json  │
		  │ • Auto-detects network config, URLs, and paths  │
		  └────────────────────────┬────────────────────────┘
								   │
								   ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 🔀 DYNAMIC PROTOCOL ROUTER (Adapter Pattern)    │
		  └────┬──────────────┬──────────────┬──────────────┘
			   │              │              │              │
 ┌─────────────┴────┐ ┌───────┴──────┐ ┌─────┴────────┐ ┌───┴──────────────┐
 │ PROTOCOL 1       │ │ PROTOCOL 2   │ │ PROTOCOL 3   │ │ PROTOCOL 4       │
 │ 2-Stage REST API │ │ Sub-Corridor │ │ HTML Parser  │ │ Generic Adapter  │
 │ ──────────────── │ │ ──────────── │ │ ──────────── │ │ ──────────────── │
 │ • DMRC (255 Stn) │ │ • Rapid Metro│ │ • NMRC Noida │ │ • Any Future     │
 │ • NCRTC (23 Stn) │ │   (11 Stn)   │ │   (22 Stn)   │ │   City Transit   │
 │ • Deep Bilingual │ │ • Dynamic    │ │ • Live Table │ │ • Manifest REST  │
 │   Payloads       │ │   API Filter │ │   Extraction │ │   Endpoints      │
 └─────────────┬────┘ └───────┬──────┘ └─────┬────────┘ └───┬──────────────┘
			   │              │              │              │
			   └──────────────┴───────┬──────┴──────────────┘
									  │
									  ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 🛡️ UniversalFileSystemManager (Atomic & Safe)    │
		  │ • Slugify keys with (1), (2) safety counters    │
		  │ • Atomic write (.tmp -> {net}_raw.json)         │
		  │ • Standard Tab-Indentation (indent="\t")        │
		  └────────────────────────┬────────────────────────┘
								   │
								   ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 🖼️ UniversalMediaHarvester (--download-media)   │
		  │ • Recursive payload tree scan for media URLs    │
		  │ • SHA-256 hash deduplication (Zero duplicates)  │
		  │ • Outputs normalized media/media_manifest.json  │
		  └────────────────────────┬────────────────────────┘
								   │
								   ▼
					   [ ✅ EXIT 0 / INTAKE COMPLETE ]

--------------------------------------------------------------------------------
CLI USAGE GUIDE
--------------------------------------------------------------------------------
Syntax:
  python import_data/universal_scraper.py <network_id> [--download-media]

Examples:
  python import_data/universal_scraper.py rapid_metro_gurugram --download-media
  python import_data/universal_scraper.py ncrtc_rrts --download-media
  python import_data/universal_scraper.py nmrc_noida --download-media
  python import_data/universal_scraper.py dmrc_delhi --download-media
================================================================================
"""


import json
import sys
from pathlib import Path
# Ensure import_data is in python path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))
from pipeline_core import UniversalPipelineLogger, UniversalFileSystemManager, UniversalMediaHarvester
from adapters import AdapterFactory
MANIFEST_PATH = BASE_DIR / "master_audit_manifest.json"
class UniversalTransitEngine:
	"""Main Orchestrator & Protocol Router Engine."""
	
	def __init__(self, manifest_path: Path = MANIFEST_PATH):
		self.manifest_path = manifest_path
		self.manifest = self._load_manifest()
	
	def _load_manifest(self) -> dict:
		if not self.manifest_path.exists():
			UniversalPipelineLogger.log("ERROR", f"Manifest not found: {self.manifest_path}")
			return {}
		with open(self.manifest_path, "r", encoding="utf-8") as f:
			return json.load(f)
	
	def scrape_network(self, network_id: str, download_media: bool = False) -> dict:
		net_info = self.manifest.get("networks", {}).get(network_id)
		if not net_info:
			UniversalPipelineLogger.log("ERROR", f"Network '{network_id}' not found in manifest!")
			return {}
		net_name = net_info.get("name", network_id)
		UniversalPipelineLogger.log("INIT", "==================================================================")
		UniversalPipelineLogger.log("INIT", f"Universal Pipeline Scraper executing for: {net_name} ({network_id})")
		UniversalPipelineLogger.log("INIT", "==================================================================")

		raw_output_path = UniversalFileSystemManager.get_stage_path(network_id, "raw")
		media_output_dir = UniversalFileSystemManager.get_media_dir(network_id)

		adapter = AdapterFactory.get_adapter(network_id)
		dataset = adapter.extract(network_id, net_info)
		if not dataset:
			UniversalPipelineLogger.log("ERROR", f"No stations extracted for {net_name}!")
			return {}

		# Single atomic write to disk (Duplicate block eliminated)
		final_output = UniversalFileSystemManager.save_atomic_tab_json(raw_output_path, dataset)
		file_size_kb = final_output.stat().st_size / 1024
		line_count = sum(1 for _ in open(final_output, "r", encoding="utf-8"))
		UniversalPipelineLogger.log("SUCCESS", f"✅ Deep Greedy Intake completed! {len(dataset)} stations compiled.")
		UniversalPipelineLogger.log("SUCCESS", f"✅ Output written atomically to: {final_output.name}")
		UniversalPipelineLogger.log("SUCCESS", f"✅ File Stats: {file_size_kb:.1f} KB ({line_count:,} lines, {len(dataset)} stations)")
		UniversalPipelineLogger.log("SUCCESS", "==================================================================")
		if download_media:
			base_domain = net_info.get("media_base_url", net_info.get("source_url", ""))
			UniversalMediaHarvester.harvest(dataset, media_output_dir, base_domain, base_dir=BASE_DIR)
		return dataset





if __name__ == "__main__":
	target_network = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "dmrc_delhi"
	download_media_flag = "--download-media" in sys.argv or "--media" in sys.argv
	engine = UniversalTransitEngine()
	res = engine.scrape_network(target_network, download_media=download_media_flag)
	sys.exit(0 if res else 1)