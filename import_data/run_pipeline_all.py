#!/usr/bin/env python3
"""
================================================================================
Master Multi-City Transit Pipeline Orchestrator (Stage 6 Unified Runner)
================================================================================
File Location : import_data/run_pipeline_all.py
Role          : Orchestrates Scrape -> Clean -> Structure -> Bridge -> Search Index
Architecture  : Modular, Error-Resilient, Multi-City Aware, UTF-8 Safe
================================================================================
"""

import os
import sys
import time
from pathlib import Path

# Ensure root directory is in sys.path
BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

from pipeline_core.logger import UniversalPipelineLogger
from universal_scraper import UniversalTransitEngine
from universal_cleaner import UniversalCleaner
from master_structure import MasterStructure
from production_bridge import ProductionBridgeEngine


# Active networks configured with active scrapers/cleaners/structures
ACTIVE_NETWORKS = [
	"dmrc_delhi",
	"mumbai_metro",
	"ncrtc_rrts",
	"nmrc_noida"
]

# Target production cities
ACTIVE_CITIES = [
	"delhi_ncr",
	"mumbai"
]


def run_full_pipeline() -> bool:
	start_time = time.time()
	UniversalPipelineLogger.log("INIT", "==================================================================")
	UniversalPipelineLogger.log("INIT", "🚀 STARTING FULL MULTI-CITY TRANSIT DATA PIPELINE AUTOMATION")
	UniversalPipelineLogger.log("INIT", "==================================================================")

	scraper = UniversalTransitEngine()
	cleaner = UniversalCleaner()
	structure = MasterStructure()
	bridge = ProductionBridgeEngine()

	success_count = 0
	total_networks = len(ACTIVE_NETWORKS)

	# -------------------------------------------------------------------------
	# STAGE 1, 2, 3: Scrape -> Clean -> Master Structure for each network
	# -------------------------------------------------------------------------
	for net_id in ACTIVE_NETWORKS:
		UniversalPipelineLogger.log("PROCESS", f"--- Processing Network: [{net_id}] ---")
		try:
			# Step 1: Scrape
			UniversalPipelineLogger.log("CRAWL", f"[{net_id}] 1/3 Scraping live endpoints...")
			raw_data = scraper.scrape_network(net_id, download_media=False)
			if not raw_data:
				UniversalPipelineLogger.log("WARN", f"[{net_id}] Scraper returned empty or failed. Continuing...")

			# Step 2: Clean
			UniversalPipelineLogger.log("CLEAN", f"[{net_id}] 2/3 Sanitizing & Cleaning raw payloads...")
			clean_path = cleaner.clean_network(net_id)

			# Step 3: Structure
			UniversalPipelineLogger.log("STRUCTURE", f"[{net_id}] 3/3 Transforming to Master Schema...")
			master_path = structure.process_network(net_id)

			UniversalPipelineLogger.log("SUCCESS", f"✅ Network [{net_id}] completed successfully -> {master_path.name}")
			success_count += 1
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"❌ Failed processing network [{net_id}]: {str(e)}")

	# -------------------------------------------------------------------------
	# STAGE 4: Production Bridge (Delta calculation & Port to main_project)
	# -------------------------------------------------------------------------
	UniversalPipelineLogger.log("PROCESS", "==================================================================")
	UniversalPipelineLogger.log("PROCESS", "🌉 RUNNING PRODUCTION BRIDGE (DELTA EMITTER & MERGE)")
	UniversalPipelineLogger.log("PROCESS", "==================================================================")

	for city_key in ACTIVE_CITIES:
		try:
			UniversalPipelineLogger.log("BRIDGE", f"Porting delta buffers for city: [{city_key}]...")
			bridge_success = bridge.execute(city_key, mode="port_production")
			if bridge_success:
				UniversalPipelineLogger.log("SUCCESS", f"✅ City [{city_key}] delta ported to main_project.")
			else:
				UniversalPipelineLogger.log("WARN", f"⚠️ City [{city_key}] bridge finished with warnings.")
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"❌ Bridge error for city [{city_key}]: {str(e)}")

	# -------------------------------------------------------------------------
	# STAGE 5: Rebuild Universal Search Index
	# -------------------------------------------------------------------------
	UniversalPipelineLogger.log("PROCESS", "==================================================================")
	UniversalPipelineLogger.log("PROCESS", "🔍 REBUILDING 0ms INSTANT SEARCH INDEX")
	UniversalPipelineLogger.log("PROCESS", "==================================================================")

	search_builder_path = ROOT_DIR / "main_project" / "data" / "build_search_index.py"
	if search_builder_path.exists():
		try:
			# Import and execute build_search_index dynamically
			import importlib.util
			spec = importlib.util.spec_from_file_location("build_search_index", str(search_builder_path))
			search_module = importlib.util.module_from_spec(spec)
			spec.loader.exec_module(search_module)
			
			if hasattr(search_module, "build_search_index"):
				search_module.build_search_index()
			UniversalPipelineLogger.log("SUCCESS", "✅ Universal search index pre-computed successfully.")
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"❌ Error rebuilding search index: {str(e)}")
	else:
		UniversalPipelineLogger.log("WARN", f"Search index builder not found at: {search_builder_path}")

	elapsed = time.time() - start_time
	UniversalPipelineLogger.log("DONE", "==================================================================")
	UniversalPipelineLogger.log("DONE", f"🏁 PIPELINE RUN COMPLETED IN {elapsed:.2f}s | Success: {success_count}/{total_networks} Networks")
	UniversalPipelineLogger.log("DONE", "==================================================================")
	return True


if __name__ == "__main__":
	success = run_full_pipeline()
	sys.exit(0 if success else 1)