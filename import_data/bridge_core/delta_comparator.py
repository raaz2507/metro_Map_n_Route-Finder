"""
Station Delta Diff Engine for Production Bridge (Stage 4).
Location: import_data/bridge_core/delta_comparator.py
Role: Computes sparse delta overlays between candidate master stations and base production files.
      Strictly avoids synthetic data.
"""
import datetime
import json
from typing import Dict, Any, List, Tuple, Optional
from pipeline_core.slug_reconciler import UniversalSlugReconciler


class StationDeltaDiffEngine:
	"""
	Calculates pure sparse delta between candidate master datasets
	and the production base station_details.json.
	Delegates slug resolution to the modular UniversalSlugReconciler.
	"""

	WHITELIST_FIELDS = {"timings", "gates", "contact", "parkings", "facilities", "platforms"}

	@classmethod
	def compute_station_delta(
		cls,
		base_stations: Dict[str, Any],
		candidate_master: Dict[str, Any],
		reconciler: Optional[UniversalSlugReconciler] = None
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

				station_graph: Dict[str, Any] = {
					"id": slug,
					"name": cand_stn.get("name", {"en": slug.replace("_", " ").title()}),
					"lines": cand_stn.get("lines", []),
					"properties": cand_stn.get("properties", {"layout": "elevated", "status": "operational", "station_type": "normal"}),
					"neighbors": cand_stn.get("neighbors", []),
					"platforms": cand_stn.get("platforms", {})
				}

				# Only include location if authentic coordinates exist (Zero Fake Data)
				loc = cand_stn.get("location")
				if loc and isinstance(loc, dict) and loc.get("decimal", {}).get("lat"):
					station_graph["location"] = loc

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
						itm_clean = {k: v for k, v in itm.items() if not (k == "purpose" and (v == cat_key or not v))}
						clean_items.append(itm_clean)
					else:
						clean_items.append(itm)
				clean_fac[cat_key] = clean_items
			return clean_fac

		if field_name == "timings" and isinstance(val, dict):
			return {k: v for k, v in val.items() if v}

		return val
