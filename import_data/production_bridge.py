#!/usr/bin/env python3
"""
================================================================================
Production Bridge & Staging Delta Engine (Stage 4 Universal Authority)
================================================================================
File Location : import_data/production_bridge.py
Role          : Multi-City Dynamic Aggregator, Sparse Diff Engine & Production Bridge
Architecture  : 100% Modular, Registry-Driven, Multi-City Agnostic, Atomic
--------------------------------------------------------------------------------
GOVERNANCE & ARCHITECTURAL RULES
--------------------------------------------------------------------------------
1. ZERO BLAST RADIUS:
   • Base manual files (transit_network.json, station_details.json) are NEVER
     directly overwritten by automation, unless explicitly requested via --promote.
   • All automated writes are strictly restricted to *_auto.json buffer files.

2. SPARSE UPDATED DELTA (NO FULL DUMPS):
   • station_details_auto.json contains ONLY modified fields or newly discovered
     stations with authentic _meta timestamps (~15-50 KB).

3. MULTI-CITY REGISTRY-DRIVEN (NO HARDCODING):
   • Driven dynamically by india_transit_registry.json & pipeline_core/slug_reconciler.py.
   • Operates uniformly across Delhi-NCR, Mumbai, Bengaluru, Lucknow, Kolkata, etc.

4. MULTI-AGENCY SUPPORT AGGREGATION:
   • Combines individual network passenger_support.json files into a unified,
     namespaced city passenger_support.json without any data loss.

5. ATOMIC FILE REPLACEMENT:
   • Writes via temporary staging files (.tmp -> rename) with pure tab indentation
     (indent="\t") and UTF-8 encoding.
================================================================================
"""

import argparse
import datetime
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent
if str(BASE_DIR) not in sys.path:
	sys.path.insert(0, str(BASE_DIR))

from pipeline_core.logger import UniversalPipelineLogger
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.slug_reconciler import UniversalSlugReconciler  # 👈 मॉड्यूलर रिज़ॉल्वर


class CityRegistryResolver:
	"""
	Dynamic City & Network Resolver.
	Reads india_transit_registry.json to resolve all operational/partial networks,
	master datasets, and support files for any target city without hardcoding.
	"""

	def __init__(self, registry_path: Path):
		self.registry_path = registry_path
		self._registry: Dict[str, Any] = {}
		self._load_registry()

	def _load_registry(self):
		if not self.registry_path.exists():
			UniversalPipelineLogger.log("ERROR", f"Registry file missing at: {self.registry_path}")
			return
		try:
			with open(self.registry_path, "r", encoding="utf-8") as f:
				self._registry = json.load(f)
		except Exception as ex:
			UniversalPipelineLogger.log("ERROR", f"Failed to parse registry: {ex}")

	def resolve_city_info(self, city_or_network: str) -> Tuple[str, str, List[Dict[str, Any]]]:
		"""
		Resolves city_id, city_name, and registered networks metadata.
		Accepts either a city_id (e.g. 'delhi_ncr') or a network_id (e.g. 'dmrc_delhi').
		"""
		clean_target = (city_or_network or "delhi_ncr").strip().lower()
		cities = self._registry.get("cities", {})

		# Scenario A: Exact city match
		if clean_target in cities:
			city_id = clean_target
			city_data = cities[clean_target]
			return city_id, city_data.get("name", city_id), self._get_networks_for_city(city_data)

		# Scenario B: Target is a network_id -> resolve its parent city
		for c_id, c_data in cities.items():
			nets = c_data.get("networks", {})
			for n_key, n_val in nets.items():
				if n_key.lower() == clean_target or n_val.get("dataPath", "").endswith(f"{clean_target}_data"):
					return c_id, c_data.get("name", c_id), self._get_networks_for_city(c_data)

		# Scenario C: Target contains city name substring
		for c_id, c_data in cities.items():
			if c_id in clean_target or clean_target in c_id:
				return c_id, c_data.get("name", c_id), self._get_networks_for_city(c_data)

		# Fallback: Default to delhi_ncr
		default_city = "delhi_ncr"
		c_data = cities.get(default_city, {})
		return default_city, c_data.get("name", "Delhi NCR"), self._get_networks_for_city(c_data)

	def _get_networks_for_city(self, city_data: Dict[str, Any]) -> List[Dict[str, Any]]:
		"""Extracts network records and resolves their authentic stage paths."""
		network_list = []
		for net_key, net_val in city_data.get("networks", {}).items():
			status = net_val.get("status", "operational")
			data_path_str = net_val.get("dataPath", "")
			
			# Resolve effective folder
			if data_path_str and (data_path_str.endswith("_data") or "_data" in data_path_str):
				folder_name = Path(data_path_str).name
				effective_net_id = folder_name[:-5] if folder_name.endswith("_data") else folder_name
			else:
				effective_net_id = net_key

			# Canonical file locations
			dataset_dir = BASE_DIR / "datasets" / f"{effective_net_id}_data"
			master_file = dataset_dir / f"{effective_net_id}_master.json"
			support_file = dataset_dir / "passenger_support.json"

			# Special fallbacks
			if not master_file.exists():
				fallback_dir = BASE_DIR / "datasets" / f"{net_key}_data"
				if (fallback_dir / f"{net_key}_master.json").exists():
					dataset_dir = fallback_dir
					master_file = fallback_dir / f"{net_key}_master.json"
				else:
					alt_details = dataset_dir / f"{effective_net_id[:4]}_station_details.json"
					if alt_details.exists():
						master_file = alt_details

			network_list.append({
				"network_key": net_key,
				"effective_net_id": effective_net_id,
				"name": net_val.get("name", net_key),
				"operator": net_val.get("operator", ""),
				"status": status,
				"dataset_dir": dataset_dir,
				"master_file": master_file,
				"support_file": support_file,
				"master_exists": master_file.exists(),
				"support_exists": support_file.exists()
			})
		return network_list


class PassengerSupportAggregator:
	"""
	Aggregates multi-agency passenger support files into a unified,
	non-lossy city support document with emergency contacts.
	"""

	@staticmethod
	def aggregate(city_id: str, city_name: str, networks: List[Dict[str, Any]]) -> Dict[str, Any]:
		"""Merges individual passenger_support.json files namespaced by network."""
		iso_today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
		
		# Baseline aggregated schema
		aggregated: Dict[str, Any] = {
			"city": city_id,
			"city_name": city_name,
			"last_updated": iso_today,
			"emergency": {
				"police_emergency": "112",
				"women_safety": "1090",
				"ambulance": "102"
			},
			"networks": {}
		}

		for net in networks:
			net_key = net["network_key"]
			supp_path = net["support_file"]
			if supp_path.exists():
				try:
					with open(supp_path, "r", encoding="utf-8") as f:
						supp_data = json.load(f)
					
					aggregated["networks"][net_key] = {
						"network_name": supp_data.get("network_name", net["name"]),
						"operator": net.get("operator", ""),
						"helplines": supp_data.get("helplines", {}),
						"portals": supp_data.get("portals", {}),
						"facilities": supp_data.get("facilities", {})
					}
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Could not read support file for {net_key}: {ex}")
			else:
				# Minimal placeholder if support file is pending intake
				aggregated["networks"][net_key] = {
					"network_name": net["name"],
					"operator": net.get("operator", ""),
					"helplines": {},
					"portals": {},
					"facilities": {}
				}

		return aggregated

class MultiAgencyCandidateAggregator:
	"""
	Aggregates multi-agency candidate datasets into a unified,
	reconciled station dictionary with deep attribute merging.
	100% City-Agnostic, Zero Hardcoding, Modular.
	"""

	@staticmethod
	def aggregate(networks: List[Dict[str, Any]], reconciler: UniversalSlugReconciler) -> Dict[str, Any]:
		"""Deep merges multi-agency datasets into canonical station records."""
		combined: Dict[str, Any] = {}

		for net in networks:
			m_file = net.get("master_file")
			net_key = net.get("network_key", "unknown")

			if not m_file or not m_file.exists():
				UniversalPipelineLogger.log("INFO", f"Network [{net_key}] has no Stage 3 master yet (Skipped).")
				continue

			try:
				with open(m_file, "r", encoding="utf-8") as f:
					net_data = json.load(f)

				stns = net_data.get("stations", net_data)
				if not isinstance(stns, dict):
					continue

				loaded_count = 0
				for raw_slug, cand_stn in stns.items():
					if not isinstance(cand_stn, dict):
						continue

					canonical_slug = reconciler.resolve(raw_slug)

					if canonical_slug not in combined:
						combined[canonical_slug] = cand_stn.copy()
					else:
						# Deep-merge multi-agency attributes (Gates, Platforms, Facilities)
						existing = combined[canonical_slug]
						if "gates" in cand_stn and isinstance(cand_stn["gates"], dict):
							existing.setdefault("gates", {}).update(cand_stn["gates"])
						if "platforms" in cand_stn and isinstance(cand_stn["platforms"], dict):
							existing.setdefault("platforms", {}).update(cand_stn["platforms"])
						if "facilities" in cand_stn and isinstance(cand_stn["facilities"], dict):
							for fac_cat, fac_list in cand_stn["facilities"].items():
								if isinstance(fac_list, list):
									existing.setdefault("facilities", {}).setdefault(fac_cat, []).extend(fac_list)

					loaded_count += 1

				UniversalPipelineLogger.log("LOAD", f"Loaded & Reconciled {loaded_count} master stations from [{net_key}]")

			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Failed loading master for [{net_key}]: {ex}")

		return combined


class StationDeltaDiffEngine:
	"""
	Calculates pure sparse delta between candidate master datasets
	and the production base station_details.json.
	Delegates slug resolution to the modular UniversalSlugReconciler.
	"""

	# Whitelist attributes permissible in sparse delta overlay
	WHITELIST_FIELDS = {"timings", "gates", "contact", "parkings", "facilities", "platforms"}

	@classmethod
	def compute_station_delta(
		cls,
		base_stations: Dict[str, Any],
		candidate_master: Dict[str, Any],
		reconciler: Optional[UniversalSlugReconciler] = None  # 👈 मॉड्यूलर रिज़ॉल्वर
	) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
		"""
		Returns:
		  1. station_details_delta: Sparse delta overlay (~15-40 KB)
		  2. transit_network_delta: Graph additions for newly discovered stations
		  3. audit_summary: Metrics on additions and field mutations
		"""
		iso_timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds") + "Z"
		details_delta: Dict[str, Any] = {}
		new_stations_graph: Dict[str, Any] = {}

		added_count = 0
		modified_count = 0
		unchanged_count = 0

		for raw_slug, cand_stn in candidate_master.items():
			if not isinstance(cand_stn, dict):
				continue

			# 👈 मॉड्यूलर प्लग-इन से स्लग रिज़ॉल्व करें (Zero Hardcoding)
			slug = reconciler.resolve(raw_slug) if reconciler else raw_slug

			# Case A: Brand New Station (Not in Base)
			if slug not in base_stations:
				added_count += 1
				details_delta[slug] = {
					**cand_stn,
					"_meta": {
						"is_new": True,
						"last_updated": iso_timestamp
					}
				}
				# Capture graph vertex dynamically for transit_network_auto
				opening = cand_stn.get("timings", {}).get("opening")
				closing = cand_stn.get("timings", {}).get("closing")

				station_graph = {
					"id": slug,
					"name": cand_stn.get("name", {"en": slug.replace("_", " ").title()}),
					"lines": cand_stn.get("lines", []),
					"location": cand_stn.get("location", {}),
					"properties": cand_stn.get("properties", {"layout": "elevated", "status": "operational", "station_type": "normal"}),
					"neighbors": cand_stn.get("neighbors", []),
					"platforms": cand_stn.get("platforms", {})
				}

				if opening or closing:
					station_graph["train_schedule"] = {
						"first_train": opening or "06:00:00",
						"last_train": closing or "23:00:00",
						"sunday_first_train": None,
						"sunday_last_train": None
					}

				new_stations_graph[slug] = station_graph
				continue

			# Case B: Existing Station -> Compare Volatile Whitelist Fields
			base_stn = base_stations[slug]
			station_patch: Dict[str, Any] = {}
			changed_keys: List[str] = []

			for field in cls.WHITELIST_FIELDS:
				cand_val = cand_stn.get(field)
				base_val = base_stn.get(field)

				# Skip if candidate has no data for this field
				if cand_val is None or cand_val == {} or cand_val == []:
					continue

				# Semantic equality check with schema normalization
				if cls._is_field_modified(base_val, cand_val, field_name=field):
					station_patch[field] = cand_val
					changed_keys.append(field)

			if changed_keys:
				modified_count += 1
				station_patch["id"] = slug
				station_patch["_meta"] = {
					"is_new": False,
					"last_updated": iso_timestamp,
					"modified_fields": changed_keys
				}
				details_delta[slug] = station_patch
			else:
				unchanged_count += 1

		# Global metadata contract header
		delta_output: Dict[str, Any] = {
			"_meta": {
				"generated_at": iso_timestamp,
				"total_delta_stations": len(details_delta),
				"new_stations": added_count,
				"modified_stations": modified_count,
				"unchanged_stations": unchanged_count
			}
		}
		delta_output.update(details_delta)

		audit_summary = {
			"total_candidate_stations": len(candidate_master),
			"base_stations": len(base_stations),
			"new_stations_count": added_count,
			"modified_stations_count": modified_count,
			"unchanged_stations_count": unchanged_count,
			"delta_payload_stations": len(details_delta)
		}

		return delta_output, new_stations_graph, audit_summary

	@classmethod
	def _is_field_modified(cls, base_val: Any, cand_val: Any, field_name: str = "") -> bool:
		"""Compares two values with semantic whitespace & schema normalization."""
		if base_val is None or base_val == {} or base_val == []:
			return bool(cand_val)
		if cand_val is None or cand_val == {} or cand_val == []:
			return False

		norm_base = cls._normalize_field(base_val, field_name)
		norm_cand = cls._normalize_field(cand_val, field_name)

		try:
			s_base = json.dumps(norm_base, sort_keys=True, ensure_ascii=False)
			s_cand = json.dumps(norm_cand, sort_keys=True, ensure_ascii=False)
			return s_base != s_cand
		except Exception:
			return norm_base != norm_cand

	@classmethod
	def _normalize_field(cls, val: Any, field_name: str) -> Any:
		"""Recursively normalizes structures, stripping empty coordinates/boilerplate."""
		if not isinstance(val, (dict, list)):
			return val

		if field_name == "gates" and isinstance(val, dict):
			clean_gates = {}
			for g_num, g_data in val.items():
				if not isinstance(g_data, dict):
					clean_gates[g_num] = g_data
					continue
				g_copy = {k: v for k, v in g_data.items() if k != "coordinates"}
				# Only include coordinates if they have non-empty lat/long
				coords = g_data.get("coordinates")
				if isinstance(coords, dict) and (coords.get("latitude") or coords.get("longitude")):
					g_copy["coordinates"] = coords
				clean_gates[g_num] = g_copy
			return clean_gates

		if field_name == "facilities" and isinstance(val, dict):
			clean_fac = {}
			for cat_key, items in val.items():
				if not isinstance(items, list):
					clean_fac[cat_key] = items
					continue
				clean_items = []
				for itm in items:
					if isinstance(itm, dict):
						# Omit boilerplate 'purpose' if identical to category or empty
						itm_clean = {k: v for k, v in itm.items() if not (k == "purpose" and (v == cat_key or not v))}
						clean_items.append(itm_clean)
					else:
						clean_items.append(itm)
				clean_fac[cat_key] = clean_items
			return clean_fac

		if field_name == "timings" and isinstance(val, dict):
			return {k: v for k, v in val.items() if v}

		return val

class ProductionBridgeEngine:
	"""
	Stage 4 Production Bridge & Distribution Engine.
	Orchestrates dynamic multi-city ingestion, diffing, staging previews,
	production porting, and developer supervision promotion.
	"""

	def __init__(self):
		self.base_dir = BASE_DIR
		self.registry_path = self.base_dir / "india_transit_registry.json"
		self.cities_dir = self.base_dir.parent / "main_project" / "data" / "cities"
		self.resolver = CityRegistryResolver(self.registry_path)

	def execute(self, city_or_network: str, mode: str = "port_production") -> bool:
		"""
		Main execution pipeline for any city.
		Modes:
		  - 'stage_temp'       : Writes temporary staging buffer for Dashboard preview
		  - 'port_production'  : Writes atomic *_auto.json directly into production
		  - 'promote'          : Merges verified _auto.json into base files & resets buffer
		"""
		city_id, city_name, networks = self.resolver.resolve_city_info(city_or_network)
		target_city_dir = self.cities_dir / city_id

		UniversalPipelineLogger.log("INIT", "==================================================================")
		UniversalPipelineLogger.log("INIT", f"Stage 4 Production Bridge Engine Active")
		UniversalPipelineLogger.log("INIT", f"Target City        : {city_name} ({city_id})")
		UniversalPipelineLogger.log("INIT", f"Operational Mode   : {mode.upper()}")
		UniversalPipelineLogger.log("INIT", f"Production Target  : {target_city_dir}")
		UniversalPipelineLogger.log("INIT", "==================================================================")

				# 1. Handle Promotion Mode (Developer Supervised Merge)
		if mode == "promote":
			return self._promote_buffer_to_base(city_id, target_city_dir)

		# 2. Load Baseline Stations for Diff
		base_stations: Dict[str, Any] = {}
		local_seed_dir = self.base_dir / "datasets" / f"{city_id}_metro_data"
		local_seed_file = local_seed_dir / f"{city_id}_curated_seed.json"

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
		elif (target_city_dir / "station_details.json").exists():
			try:
				with open(target_city_dir / "station_details.json", "r", encoding="utf-8") as f:
					base_stations = json.load(f)
				UniversalPipelineLogger.log("BASE", f"Loaded {len(base_stations)} base stations from station_details.json")
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Could not parse fallback base file: {ex}")
		else:
			UniversalPipelineLogger.log("WARN", f"No baseline stations found for {city_id}.")

		# 3. Initialize Modular Reconciler for this City (Zero Hardcoding!)
		reconciler = UniversalSlugReconciler(city_id, self.base_dir, base_stations)

		# 4. Ingest & Deep-Merge Multi-Agency Masters (Delegated to MultiAgencyCandidateAggregator)
		combined_master = MultiAgencyCandidateAggregator.aggregate(networks, reconciler)

		if not combined_master:
			UniversalPipelineLogger.log("ERROR", f"No valid master stations discovered for city: {city_id}")
			return False

				# 5. Compute Sparse Delta
		UniversalPipelineLogger.log("DIFF", "Calculating sparse delta against base dataset...")
		details_delta, new_graph_stns, audit = StationDeltaDiffEngine.compute_station_delta(
			base_stations, combined_master, reconciler=reconciler
		)

		# 6. Aggregate Multi-Agency Passenger Support
		UniversalPipelineLogger.log("SUPPORT", "Aggregating multi-operator passenger helplines...")
		aggregated_support = PassengerSupportAggregator.aggregate(city_id, city_name, networks)

		# 7. Construct Transit Network Delta
		iso_today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
		transit_network_delta = {
			"_meta": {
				"city": city_id,
				"last_updated": iso_today,
				"total_new_stations": len(new_graph_stns)
			},
			"stations": new_graph_stns,
			"lines": {}
		}

		# 8. Write to Target Destination
		if mode in ["stage_temp", "prepare_temp"]:
			dest_dir = self.base_dir / ".staging_temp" / city_id
			dest_dir.mkdir(parents=True, exist_ok=True)
			UniversalPipelineLogger.log("WRITE", f"Writing staging preview files to: {dest_dir}")
		else:
			dest_dir = target_city_dir
			dest_dir.mkdir(parents=True, exist_ok=True)
			UniversalPipelineLogger.log("WRITE", f"Writing production delta files to: {dest_dir}")

		# Save station_details_auto.json
		details_target = dest_dir / "station_details_auto.json"
		UniversalFileSystemManager.save_atomic_tab_json(details_target, details_delta)
		UniversalPipelineLogger.log("SUCCESS", f"Emitted: {details_target.name} ({len(details_delta)} entries)")

		# Save transit_network_auto.json
		transit_target = dest_dir / "transit_network_auto.json"
		UniversalFileSystemManager.save_atomic_tab_json(transit_target, transit_network_delta)
		UniversalPipelineLogger.log("SUCCESS", f"Emitted: {transit_target.name}")

		# Save passenger_support.json
		support_target = dest_dir / "passenger_support.json"
		UniversalFileSystemManager.save_atomic_tab_json(support_target, aggregated_support)
		UniversalPipelineLogger.log("SUCCESS", f"Emitted: {support_target.name}")

		# Save audit summary report strictly inside import_data (Never pollute main_project)
		audit_dir = self.base_dir / ".staging_temp" / city_id
		audit_dir.mkdir(parents=True, exist_ok=True)
		audit_target = audit_dir / "overlay_audit_report.json"
		UniversalFileSystemManager.save_atomic_tab_json(audit_target, audit)
		UniversalPipelineLogger.log("AUDIT", f"Pipeline audit report saved at: import_data/.staging_temp/{city_id}/{audit_target.name}")
		return True

	def _promote_buffer_to_base(self, city_id: str, target_city_dir: Path) -> bool:
		"""
		Supervised Promotion: Merges verified station_details_auto.json
		directly into station_details.json and resets the buffer.
		"""
		details_auto_file = target_city_dir / "station_details_auto.json"
		details_base_file = target_city_dir / "station_details.json"

		if not details_auto_file.exists():
			UniversalPipelineLogger.log("WARN", f"No staging buffer found to promote at: {details_auto_file}")
			return False

		try:
			with open(details_auto_file, "r", encoding="utf-8") as f:
				auto_data = json.load(f)
		except Exception as ex:
			UniversalPipelineLogger.log("ERROR", f"Failed reading auto buffer: {ex}")
			return False

		# Load Base
		base_data: Dict[str, Any] = {}
		if details_base_file.exists():
			try:
				with open(details_base_file, "r", encoding="utf-8") as f:
					base_data = json.load(f)
			except Exception as ex:
				UniversalPipelineLogger.log("ERROR", f"Failed reading base file: {ex}")
				return False

		promoted_count = 0
		for slug, patch in auto_data.items():
			if slug == "_meta" or not isinstance(patch, dict):
				continue

			clean_patch = {k: v for k, v in patch.items() if k != "_meta"}
			if slug not in base_data:
				base_data[slug] = clean_patch
			else:
				base_data[slug].update(clean_patch)
			promoted_count += 1

				# Atomically update base file with compact serializer
		UniversalFileSystemManager.save_atomic_tab_json(details_base_file, base_data, compact=True)
		UniversalPipelineLogger.log("PROMOTE", f"Successfully baked {promoted_count} stations into: {details_base_file.name}")

		# Reset auto buffers to clean state
		reset_buffer = {
			"_meta": {
				"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
				"total_delta_stations": 0,
				"status": "buffer_promoted_and_reset"
			}
		}
		UniversalFileSystemManager.save_atomic_tab_json(details_auto_file, reset_buffer)

		transit_auto_file = target_city_dir / "transit_network_auto.json"
		if transit_auto_file.exists():
			reset_transit = {
				"_meta": {
					"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
					"total_new_stations": 0,
					"status": "buffer_promoted_and_reset"
				},
				"stations": {},
				"lines": []
			}
			UniversalFileSystemManager.save_atomic_tab_json(transit_auto_file, reset_transit)

		UniversalPipelineLogger.log("DONE", "All staging buffers reset to clean state.")
		return True


def main():
	parser = argparse.ArgumentParser(description="Production Bridge & Staging Delta Engine (Stage 4)")
	parser.add_argument("city", nargs="?", default="delhi_ncr", help="Target city key (e.g. delhi_ncr, mumbai, lucknow)")
	parser.add_argument("--city", "-c", dest="explicit_city", default=None, help="Explicit city key")
	parser.add_argument("--prepare-temp", "--stage-temp", action="store_true", help="Prepare staging temp preview for Dashboard")
	parser.add_argument("--port-production", "--deploy", action="store_true", help="Atomically write delta stores to main_project")
	parser.add_argument("--promote", action="store_true", help="Bake staging buffer into base file and reset")

	args = parser.parse_args()
	target_city = args.explicit_city or args.city or "delhi_ncr"

	# Determine operational mode
	if args.promote:
		mode = "promote"
	elif args.prepare_temp:
		mode = "stage_temp"
	else:
		mode = "port_production"

	engine = ProductionBridgeEngine()
	success = engine.execute(target_city, mode=mode)
	sys.exit(0 if success else 1)


if __name__ == "__main__":
	main()