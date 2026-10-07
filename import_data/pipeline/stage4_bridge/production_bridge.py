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

SCRIPT_DIR = Path(__file__).resolve().parent
IMPORT_DATA_DIR = SCRIPT_DIR.parent.parent
PROJECT_ROOT = IMPORT_DATA_DIR.parent

if str(IMPORT_DATA_DIR) not in sys.path:
	sys.path.insert(0, str(IMPORT_DATA_DIR))
if str(SCRIPT_DIR) not in sys.path:
	sys.path.insert(0, str(SCRIPT_DIR))

from pipeline.core.logger import UniversalPipelineLogger
from pipeline.core.slug_reconciler import UniversalSlugReconciler
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
		self.base_dir = IMPORT_DATA_DIR
		self.registry_path = self.base_dir / "config" / "india_transit_registry.json"
		self.cities_dir = PROJECT_ROOT / "main_project" / "data" / "india" / "cities"
		self.resolver = CityRegistryResolver(self.base_dir, self.registry_path)

	def execute(self, city_or_network: str, mode: str = "port_production", geo_source: str = "keep_base") -> bool:
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
		# Priority 1: Current live production base (station_details.json) to reflect all promoted/merged data
		# Priority 2: Fallback to curated seed if station_details.json is not yet created
		base_stations: Dict[str, Any] = {}
		base_details_file = target_city_dir / "station_details.json"
		local_seed_file = self.base_dir / "datasets" / f"{city_id}_metro_data" / f"{city_id}_curated_seed.json"

		if base_details_file.exists():
			try:
				with open(base_details_file, "r", encoding="utf-8") as f:
					base_stations = json.load(f)
				UniversalPipelineLogger.log("BASE", f"Loaded {len(base_stations)} base stations from station_details.json")
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Could not parse base station_details.json: {ex}")
		elif local_seed_file.exists():
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
		UniversalPipelineLogger.log("DIFF", f"Calculating sparse delta against base dataset (Geo Source: {geo_source.upper()})...")
		google_coords = {}
		if geo_source == "google":
			geo_cities_dir = self.base_dir / "geo_engine" / "india" / "cities"
			for net in networks:
				ds_dir_name = net.get("dataset_dir", Path()).name
				g_dir = geo_cities_dir / ds_dir_name
				if g_dir.exists():
					for g_file in g_dir.glob("*_coordinates.json"):
						try:
							with open(g_file, "r", encoding="utf-8") as gf:
								g_items = json.load(gf)
							for itm in g_items:
								s_id = itm.get("station_id")
								if s_id:
									resolved_sid = reconciler.resolve(s_id)
									google_coords[resolved_sid] = itm
						except Exception as ex:
							UniversalPipelineLogger.log("WARN", f"Could not load google coords from {g_file.name}: {ex}")

		details_delta, new_graph_stns, audit = StationDeltaDiffEngine.compute_station_delta(
			base_stations, combined_master, reconciler=reconciler, geo_source=geo_source, google_coords=google_coords
		)

		# 6. Aggregate Multi-Agency Passenger Support
		UniversalPipelineLogger.log("SUPPORT", "Aggregating multi-operator passenger helplines...")
		aggregated_support = PassengerSupportAggregator.aggregate(city_id, city_name, networks)

		# 7. Construct Transit Network Delta (Sparse Delta: only missing/modified lines, transfers & fareRules)
		iso_today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
		combined_lines: Dict[str, Any] = {}
		combined_transfers: Dict[str, Any] = {}
		combined_fare_rules: Dict[str, Any] = {}

		# Read existing base transit network to compare and avoid duplicate generation
		base_transit_file = target_city_dir / "transit_network.json"
		base_transit_data: Dict[str, Any] = {}
		if base_transit_file.exists():
			try:
				with open(base_transit_file, "r", encoding="utf-8") as btf:
					base_transit_data = json.load(btf)
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Could not read base transit_network.json for delta diff: {ex}")

		base_lines = base_transit_data.get("lines", {})
		base_transfers = base_transit_data.get("transfers", {})
		base_fare_rules = base_transit_data.get("fareRules", {})

		for net in networks:
			m_file = net.get("master_file")
			f_file = net.get("fare_file")
			if m_file and m_file.exists():
				try:
					with open(m_file, "r", encoding="utf-8") as mf:
						m_data = json.load(mf)
					if "lines" in m_data and isinstance(m_data["lines"], dict):
						for l_key, l_val in m_data["lines"].items():
							# Check if line key already exists in base, or if an equivalent line (reconciled stations) already exists
							raw_cand_stns = l_val.get("stations", [])
							resolved_cand_stns = {reconciler.resolve(s) if reconciler else s for s in raw_cand_stns}
							already_in_base = l_key in base_lines
							if not already_in_base and resolved_cand_stns:
								for b_lkey, b_lval in base_lines.items():
									b_stns = set(b_lval.get("stations", []))
									# Exact match or high overlap (>80%) indicating same line under different prefix
									if b_stns and len(resolved_cand_stns.intersection(b_stns)) / max(len(resolved_cand_stns), len(b_stns)) > 0.8:
										already_in_base = True
										break
							if not already_in_base:
								combined_lines[l_key] = l_val
					if "transfers" in m_data and isinstance(m_data["transfers"], dict):
						for t_key, t_val in m_data["transfers"].items():
							if t_key not in base_transfers:
								combined_transfers[t_key] = t_val
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Could not load lines from master: {ex}")

			if f_file and f_file.exists() and not base_fare_rules and not combined_fare_rules:
				try:
					with open(f_file, "r", encoding="utf-8") as ff:
						combined_fare_rules = json.load(ff)
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Could not load fare rules: {ex}")

		transit_network_delta = {
			"_meta": {
				"city": city_id,
				"last_updated": iso_today,
				"total_new_stations": len(new_graph_stns),
				"new_lines": len(combined_lines),
				"has_new_transfers": bool(combined_transfers),
				"has_new_fare_rules": bool(combined_fare_rules)
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
	parser.add_argument("--geo-source", choices=["keep_base", "google", "agency"], default="keep_base", help="Geo strategy: 'keep_base' (default), 'google' (verified ground-truth), or 'agency' (network master)")

	args = parser.parse_args()
	target_city = args.explicit_city or args.city or "delhi_ncr"

	mode = "promote" if args.promote else ("stage_temp" if args.prepare_temp else "port_production")
	engine = ProductionBridgeEngine()

	if target_city == "all":
		active_cities = engine.resolver.get_active_cities()
		UniversalPipelineLogger.log("INIT", f"Batch Processing {len(active_cities)} Active Cities across India...")
		success_all = True
		for c in active_cities:
			if not engine.execute(c, mode=mode, geo_source=args.geo_source):
				success_all = False
		sys.exit(0 if success_all else 1)
	else:
		success = engine.execute(target_city, mode=mode, geo_source=args.geo_source)
		sys.exit(0 if success else 1)


if __name__ == "__main__":
	main()