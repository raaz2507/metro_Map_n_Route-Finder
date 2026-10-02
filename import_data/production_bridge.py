#!/usr/bin/env python3
"""
Production Bridge & Staging Delta Engine (Stage 4 Universal Authority)
Location: import_data/production_bridge.py
Role: Modular, multi-city dynamic aggregator, sparse diff engine & production bridge.
Zero Blast Radius: Base manual files are NEVER overwritten by automation.
"""
import argparse
import datetime
import json
import sys
from pathlib import Path
from typing import Dict, Any

BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

from pipeline_core.logger import UniversalPipelineLogger
from pipeline_core.slug_reconciler import UniversalSlugReconciler
from bridge_core.city_resolver import CityRegistryResolver
from bridge_core.candidate_aggregator import MultiAgencyCandidateAggregator
from bridge_core.helpline_aggregator import PassengerSupportAggregator
from bridge_core.delta_comparator import StationDeltaDiffEngine
from bridge_core.production_emitter import ProductionEmitter


class ProductionBridgeEngine:
	"""
	Stage 4 Production Bridge & Distribution Engine.
	Orchestrates dynamic multi-city ingestion, diffing, staging previews,
	and production delta porting across all 21 networks.
	"""

	def __init__(self):
		self.base_dir = BASE_DIR
		self.registry_path = self.base_dir / "india_transit_registry.json"
		self.cities_dir = self.base_dir.parent / "main_project" / "data" / "india" / "cities"
		self.resolver = CityRegistryResolver(self.base_dir, self.registry_path)

	def execute(self, city_or_network: str, mode: str = "port_production") -> bool:
		"""
		Main execution pipeline for any city or network.
		Modes:
		  - 'stage_temp'       : Writes temporary staging buffer for Dashboard preview
		  - 'port_production'  : Writes atomic *_auto.json directly into production
		  - 'promote'          : Merges verified _auto.json into base files & resets buffer
		"""
		city_id, city_name, networks = self.resolver.resolve_city_info(city_or_network)
		target_city_dir = self.cities_dir / city_id

		UniversalPipelineLogger.log("INIT", "==================================================================")
		UniversalPipelineLogger.log("INIT", "Stage 4 Production Bridge Engine Active")
		UniversalPipelineLogger.log("INIT", f"Target City        : {city_name} ({city_id})")
		UniversalPipelineLogger.log("INIT", f"Operational Mode   : {mode.upper()}")
		UniversalPipelineLogger.log("INIT", f"Production Target  : {target_city_dir}")
		UniversalPipelineLogger.log("INIT", "==================================================================")

		# 1. Handle Promotion Mode (Developer Supervised Merge)
		if mode == "promote":
			return ProductionEmitter.promote_buffer_to_base(city_id, target_city_dir)

		# 2. Load Baseline Stations for Diff (Strictly Read-Only)
		base_stations: Dict[str, Any] = {}
		local_seed_file = self.base_dir / "datasets" / f"{city_id}_metro_data" / f"{city_id}_curated_seed.json"
		base_details_file = target_city_dir / "station_details.json"

		if local_seed_file.exists():
			try:
				with open(local_seed_file, "r", encoding="utf-8") as f:
					base_stations.update(json.load(f))
				for net in networks:
					m_file = net.get("master_file")
					if m_file and m_file.exists() and m_file.name != f"{city_id}_metro_master.json":
						with open(m_file, "r", encoding="utf-8") as mf:
							base_stations.update(json.load(mf))
				UniversalPipelineLogger.log("BASE", f"Loaded {len(base_stations)} baseline stations from local seeds.")
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Could not load local seed: {ex}")
		elif base_details_file.exists():
			try:
				with open(base_details_file, "r", encoding="utf-8") as f:
					base_stations = json.load(f)
				UniversalPipelineLogger.log("BASE", f"Loaded {len(base_stations)} base stations from station_details.json")
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Could not parse fallback base file: {ex}")
		else:
			UniversalPipelineLogger.log("WARN", f"No baseline stations found for {city_id} (New City Directory).")

		# 3. Modular Reconciler for this City (Zero Hardcoding)
		reconciler = UniversalSlugReconciler(city_id, self.base_dir, base_stations)

		# 4. Ingest & Deep-Merge Multi-Agency Masters
		combined_master = MultiAgencyCandidateAggregator.aggregate(networks, reconciler)
		if not combined_master:
			UniversalPipelineLogger.log("ERROR", f"No valid master stations discovered for city: {city_id}")
			return False

		# 5. Compute Sparse Delta (Zero Synthetic Data)
		UniversalPipelineLogger.log("DIFF", "Calculating sparse delta against base dataset...")
		details_delta, new_graph_stns, audit = StationDeltaDiffEngine.compute_station_delta(
			base_stations, combined_master, reconciler=reconciler
		)

		# 6. Aggregate Multi-Agency Passenger Support
		UniversalPipelineLogger.log("SUPPORT", "Aggregating multi-operator passenger helplines...")
		aggregated_support = PassengerSupportAggregator.aggregate(city_id, city_name, networks)

		# 7. Construct Transit Network Delta (Extract authentic lines, transfers & fareRules)
		iso_today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
		combined_lines: Dict[str, Any] = {}
		combined_transfers: Dict[str, Any] = {}
		combined_fare_rules: Dict[str, Any] = {}

		for net in networks:
			m_file = net.get("master_file")
			f_file = net.get("fare_file")
			if m_file and m_file.exists():
				try:
					with open(m_file, "r", encoding="utf-8") as mf:
						m_data = json.load(mf)
					if "lines" in m_data and isinstance(m_data["lines"], dict):
						combined_lines.update(m_data["lines"])
					if "transfers" in m_data and isinstance(m_data["transfers"], dict):
						combined_transfers.update(m_data["transfers"])
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Could not load lines from master: {ex}")

			if f_file and f_file.exists() and not combined_fare_rules:
				try:
					with open(f_file, "r", encoding="utf-8") as ff:
						combined_fare_rules = json.load(ff)
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Could not load fare rules: {ex}")

		transit_network_delta = {
			"_meta": {
				"city": city_id,
				"last_updated": iso_today,
				"total_new_stations": len(new_graph_stns)
			},
			"stations": new_graph_stns,
			"lines": combined_lines,
			"transfers": combined_transfers,
			"fareRules": combined_fare_rules
		}

		# 8. Emit Output via Atomic Emitter
		return ProductionEmitter.emit_staging_or_production(
			mode=mode,
			city_id=city_id,
			target_city_dir=target_city_dir,
			staging_base_dir=self.base_dir,
			details_delta=details_delta,
			transit_network_delta=transit_network_delta,
			aggregated_support=aggregated_support,
			audit_summary=audit
		)


def main():
	parser = argparse.ArgumentParser(description="Production Bridge & Staging Delta Engine (Stage 4)")
	parser.add_argument("city", nargs="?", default="delhi_ncr", help="Target city key (e.g. delhi_ncr, mumbai, lucknow, all)")
	parser.add_argument("--city", "-c", dest="explicit_city", default=None, help="Explicit city key")
	parser.add_argument("--prepare-temp", "--stage-temp", action="store_true", help="Prepare staging temp preview for Dashboard")
	parser.add_argument("--port-production", "--deploy", action="store_true", help="Atomically write delta stores to main_project")
	parser.add_argument("--promote", action="store_true", help="Bake staging buffer into base file and reset")

	args = parser.parse_args()
	target_city = args.explicit_city or args.city or "delhi_ncr"

	mode = "promote" if args.promote else ("stage_temp" if args.prepare_temp else "port_production")
	engine = ProductionBridgeEngine()

	if target_city == "all":
		active_cities = engine.resolver.get_active_cities()
		UniversalPipelineLogger.log("INIT", f"Batch Processing {len(active_cities)} Active Cities across India...")
		success_all = True
		for c in active_cities:
			if not engine.execute(c, mode=mode):
				success_all = False
		sys.exit(0 if success_all else 1)
	else:
		success = engine.execute(target_city, mode=mode)
		sys.exit(0 if success else 1)


if __name__ == "__main__":
	main()