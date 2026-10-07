#!/usr/bin/env python3
"""
================================================================================
Universal Transit Pipeline Cleaner Engine
================================================================================
Architecture : 100% Class-Based (OOP), Manifest-Driven, Strategy Pattern
Author       : Metro Audit Hub Engineering
Environment  : Python 3.8+ (Zero external mandatory dependencies; uses standard library)
--------------------------------------------------------------------------------
5 NON-NEGOTIABLE GOLDEN RULES OF STAGE 2 (CLEANED) TRANSFORMATION
--------------------------------------------------------------------------------
1. ZERO STRUCTURAL MUTATION (NON-MUTATED STANDARD):
   • Cleaner NEVER invents or adds artificial top-level keys (e.g., do NOT add
	 'city', 'state', 'gates', 'vertical_transit', 'facilities').
   • Canonical schema design strictly belongs to Stage 3 (Master Structured)
	 under developer supervision. Stage 2 must preserve raw schema integrity.
2. 0% DATA LOSS:
   • Never drop, discard, or delete authentic unique stations or raw payloads.
   • All original language structures (en_raw, hi_raw, mr_raw, details_raw, 
	 summary_raw) must be preserved 100% verbatim.
3. HYGIENE & SANITIZATION ONLY:
   • Clean leading/trailing whitespaces from string values.
   • Normalize station slug keys (lowercase, safe alphanumeric).
   • Standardize station codes to uppercase.
   • Deduplicate exact repetitive database join artifacts (e.g., DMRC SQL JOINs).
4. ATOMIC WRITES & TAB INDENTATION:
   • 100% standard Tab Indentation (indent="\t").
   • Atomic file writes via temporary files (.tmp -> atomic rename) to eliminate
	 corrupted partial writes.
5. 100% DECOUPLED PLUGIN ARCHITECTURE:
   • Central Cleaner Orchestrator delegates to network-specific cleaner plugins
	 in cleaners/ (e.g., MumbaiCleaner, DMRCCleaner, NCRTCCleaner).
   • Datasets folder (datasets/) must remain a PURE DATA STORE (0% Python code).
--------------------------------------------------------------------------------
ARCHITECTURE FLOW DIAGRAM (STRATEGY PATTERN & ATOMIC SANITIZATION)
--------------------------------------------------------------------------------
 [ TRIGGER: python universal_cleaner.py <network_id> OR Web UI "Process Clean" ]
								   │
								   ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 📋 MANIFEST ENGINE: master_audit_manifest.json  │
		  │ • Auto-detects raw_file & cleaned_file paths    │
		  └────────────────────────┬────────────────────────┘
								   │
								   ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 🔀 CLEANER FACTORY: cleaners/CleanerFactory     │
		  └────┬──────────────┬──────────────┬──────────────┘
			   │              │              │              │
 ┌─────────────┴────┐ ┌───────┴──────┐ ┌─────┴────────┐ ┌───┴──────────────┐
 │ PLUGIN 1         │ │ PLUGIN 2     │ │ PLUGIN 3     │ │ PLUGIN 4         │
 │ DMRCCleaner      │ │ NCRTCCleaner │ │ NMRCCleaner  │ │ MumbaiCleaner    │
 │ ──────────────── │ │ ──────────── │ │ ──────────── │ │ ──────────────── │
 │ • SQL JOIN Dedup │ │ • 0% Mutation│ │ • HTML Table │ │ • Dual Language  │
 │ • Unique Preserv.│ │ • Verbatim   │ │   Sanitize   │ │   (EN+MR) Align  │
 └─────────────┬────┘ └───────┬──────┘ └─────┬────────┘ └───┬──────────────┘
			   │              │              │              │
			   └──────────────┴───────┬──────┴──────────────┘
									  │
									  ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 🛡️ BaseTransitCleaner Execution Lifecycle        │
		  │ • Recursive unicode/whitespace hygiene          │
		  │ • UniversalFileSystemManager (Atomic .tmp ->)   │
		  │ • Tab Indentation standard (indent="\t")        │
		  │ • Real-Time SSE Log Streaming to Server         │
		  └────────────────────────┬────────────────────────┘
								   │
								   ▼
		  ┌─────────────────────────────────────────────────┐
		  │ 📦 PURE DATA STORE: datasets/<net>_cleaned.json │
		  │ • 100% Data Preserved, 0% Artificial Mutation   │
		  └────────────────────────┬────────────────────────┘
								   │
								   ▼
					   [ ✅ EXIT 0 / CLEAN COMPLETE ]
--------------------------------------------------------------------------------
CLI USAGE GUIDE
--------------------------------------------------------------------------------
Syntax:
  python import_data/universal_cleaner.py <network_id>
Examples:
  python import_data/universal_cleaner.py mumbai_metro
  python import_data/universal_cleaner.py dmrc_delhi
  python import_data/universal_cleaner.py ncrtc_rrts
  python import_data/universal_cleaner.py nmrc_noida
  python import_data/universal_cleaner.py rapid_metro_gurugram
================================================================================
"""

import json
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

from pipeline_core import UniversalPipelineLogger, UniversalFileSystemManager
from cleaners import CleanerFactory

MANIFEST_PATH = BASE_DIR / "master_audit_manifest.json"

class UniversalTransitCleanerEngine:
	"""Main Orchestrator for Stage 2 Transformation Pipeline."""

	def __init__(self, manifest_path: Path = MANIFEST_PATH):
		self.manifest_path = manifest_path
		self.manifest = self._load_manifest()

	def _load_manifest(self) -> dict:
		if not self.manifest_path.exists():
			UniversalPipelineLogger.log("ERROR", f"Manifest not found: {self.manifest_path}")
			return {}
		with open(self.manifest_path, "r", encoding="utf-8") as f:
			return json.load(f)

	def clean_network(self, network_id: str) -> dict:
		net_info = self.manifest.get("networks", {}).get(network_id)
		if not net_info:
			UniversalPipelineLogger.log("ERROR", f"Network '{network_id}' not found in manifest!")
			return {}

		net_name = net_info.get("name", network_id)
		UniversalPipelineLogger.log("INIT", "==================================================================")
		UniversalPipelineLogger.log("INIT", f"Universal Pipeline Cleaner executing for: {net_name} ({network_id})")
		UniversalPipelineLogger.log("INIT", "==================================================================")

		raw_path = UniversalFileSystemManager.get_stage_path(network_id, "raw")
		cleaned_path = UniversalFileSystemManager.get_stage_path(network_id, "cleaned")

		# Fallback to legacy root raw file if not in datasets/ directory
		if not raw_path.exists():
			legacy_raw = BASE_DIR / f"{network_id}_raw.json"
			if legacy_raw.exists():
				raw_path = legacy_raw

		cleaner = CleanerFactory.get_cleaner(network_id)
		return cleaner.process(raw_path, cleaned_path, network_id)


if __name__ == "__main__":
	target_network = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("--") else "mumbai_metro"
	engine = UniversalTransitCleanerEngine()
	res = engine.clean_network(target_network)
	sys.exit(0 if res else 1)