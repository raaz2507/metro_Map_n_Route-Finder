"""
Station Delta Diff Engine for Production Bridge (Stage 4).
Location: import_data/bridge_core/delta_comparator.py
Role: Computes sparse delta overlays between candidate master stations and base production files.
      Strictly avoids synthetic data and enforces architectural separation.
"""
import datetime
import json
from typing import Dict, Any, List, Tuple, Optional
from pipeline.core.slug_reconciler import UniversalSlugReconciler
from pipeline.core.constants import EXCLUDED_STATION_DETAILS_KEYS, normalize_transit_status

class StationDeltaDiffEngine:
	"""
	Calculates pure sparse delta between candidate master datasets
	and the production base station_details.json.
	Delegates slug resolution to the modular UniversalSlugReconciler.
	Enforces zero duplicate graph keys in station_details delta.
	"""

	WHITELIST_FIELDS = {"timings", "gates", "contact", "parkings", "facilities", "platforms"}

	@classmethod
	def compute_station_delta(
		cls,
		base_stations: Dict[str, Any],
		candidate_master: Dict[str, Any],
		reconciler: Optional[UniversalSlugReconciler] = None,
		geo_source: str = "keep_base",
		google_coords: Optional[Dict[str, Any]] = None
	) -> Tuple[Dict[str, Any], Dict[str, Any], Dict[str, Any]]:
		"""
		Returns:
		  1. station_details_delta: Sparse delta overlay (facilities, gates, timings, etc.)
		  2. transit_network_delta: Graph additions for newly discovered stations & geo updates
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

				# Filter out graph keys: NEVER leak lines, properties, neighbors, location to station_details
				clean_details = {
					k: v for k, v in cand_stn.items()
					if k not in EXCLUDED_STATION_DETAILS_KEYS
				}
				clean_details["_meta"] = {
					"is_new": True,
					"last_updated": iso_timestamp
				}
				details_delta[slug] = clean_details

				# Capture graph vertex dynamically for transit_network_auto
				opening = cand_stn.get("timings", {}).get("opening")
				closing = cand_stn.get("timings", {}).get("closing")

				cand_props = cand_stn.get("properties") or {}
				raw_status = cand_props.get("status", "operational")
				canonical_status = normalize_transit_status(raw_status)
				layout = cand_props.get("layout", "elevated")
				station_type = cand_props.get("station_type", "normal")

				station_graph: Dict[str, Any] = {
					"id": slug,
					"name": cand_stn.get("name", {"en": slug.replace("_", " ").title()}),
					"lines": cand_stn.get("lines", []),
					"properties": {
						"layout": layout,
						"status": canonical_status,
						"station_type": station_type
					},
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

			# Case B.2: Geo-source Strategy Handling (Strictly for transit_network graph)
			if geo_source == "google" and google_coords and slug in google_coords:
				g_rec = google_coords[slug]
				g_coords_val = g_rec.get("coordinates", {})
				if g_coords_val.get("lat") and g_coords_val.get("lon"):
					cur_loc = base_stn.get("location", {})
					cur_dec = cur_loc.get("decimal") if isinstance(cur_loc, dict) else {}
					c_lat = cur_dec.get("lat") if isinstance(cur_dec, dict) else None
					c_lon = cur_dec.get("lon") if isinstance(cur_dec, dict) else None
					g_lat, g_lon = g_coords_val["lat"], g_coords_val["lon"]
					
					# Update if coords missing, lat==lon corruption, or diff > 0.0001
					if c_lat is None or c_lon is None or abs(c_lat - c_lon) < 0.0001 or abs(c_lat - g_lat) > 0.0001 or abs(c_lon - g_lon) > 0.0001:
						loc_patch = {
							"decimal": {"lat": g_lat, "lon": g_lon}
						}
						# Location belongs strictly to transit_network, never station_details
						new_stations_graph.setdefault(slug, {})["location"] = loc_patch
			elif geo_source == "agency":
				cand_loc = cand_stn.get("location")
				if cand_loc and isinstance(cand_loc, dict) and cand_loc.get("decimal"):
					base_loc = base_stn.get("location")
					if cls._is_field_modified(base_loc, cand_loc, field_name="location"):
						new_stations_graph.setdefault(slug, {})["location"] = cand_loc

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

		# Normalized equality check
		return norm_base != norm_cand

	@classmethod
	def _normalize_field(cls, val: Any, field_name: str) -> Any:
		"""Normalizes dictionary or list representations for exact semantic matching."""
		if isinstance(val, dict):
			# If timings, normalize seconds vs HH:MM
			if field_name == "timings":
				return {k: str(v).strip()[:5] for k, v in sorted(val.items()) if v}
			return {k: cls._normalize_field(v, field_name) for k, v in sorted(val.items())}
		elif isinstance(val, list):
			# Sort lists of dicts by code or name if present for order-agnostic diff
			if val and isinstance(val[0], dict) and "code" in val[0]:
				return sorted([cls._normalize_field(item, field_name) for item in val], key=lambda x: str(x.get("code", "")))
			return [cls._normalize_field(item, field_name) for item in val]
		elif isinstance(val, str):
			return val.strip()
		return val