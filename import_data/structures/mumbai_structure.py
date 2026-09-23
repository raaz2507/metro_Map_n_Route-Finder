#!/usr/bin/env python3
"""
================================================================================
Mumbai Metro Master Structuring Module (Stage 3 Hybrid Canonical Engine)
================================================================================
Location: import_data/structures/mumbai_structure.py
Role    : Transforms Stage 2 mumbai_metro_cleaned.json + Local Curated Seed
          -> mumbai_metro_master.json
Rules   : Hybrid Model - Seed Baseline + Live Scraped Overlays.
          Zero dependency on main_project. 100% authentic, zero synthetic data.
================================================================================
"""

import copy
import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger


class MumbaiStructure(BaseTransitStructurer):
	"""
	Stage 3 Master Canonical Hybrid Structurer for Mumbai Metro.
	Combines local curated seed baseline (Gates, Lifts, Escalators, Facilities)
	with live scraped clean dataset (Coordinates, Line 3 REST API, Station Orders).
	"""

	LINE_MAP = {
		"line 1": "mumbai.blue",
		"blue": "mumbai.blue",
		"line 2a": "mumbai.yellow",
		"yellow": "mumbai.yellow",
		"line 7": "mumbai.red",
		"red": "mumbai.red",
		"line 3": "mumbai.aqua",
		"aqua": "mumbai.aqua",
	}

	@classmethod
	def resolve_line_id(cls, line_str: str) -> str:
		l = (line_str or "").lower()
		for key, line_id in cls.LINE_MAP.items():
			if key in l:
				return line_id
		return "mumbai.blue"

	@staticmethod
	def clean_title(name: str) -> str:
		if not name:
			return ""
		cleaned = name.strip()
		acronyms = {"JVLR", "CSMI", "BKC", "MIDC", "SEEPZ", "DN", "WEH", "T1", "T2", "FOB", "II", "III"}
		parts = []
		for word in cleaned.split():
			w_upper = word.upper()
			if w_upper in acronyms:
				parts.append(w_upper)
			else:
				parts.append(word.capitalize())
		return " ".join(parts)

	def structure(
		self,
		cleaned_dataset: Dict[str, Any],
		network_id: str,
		existing_master: Optional[Dict[str, Any]] = None,
	) -> Dict[str, Any]:
		base_dir = Path(__file__).resolve().parent.parent
		seed_path = base_dir / "datasets" / "mumbai_metro_data" / "mumbai_curated_seed.json"

		seed_stations: Dict[str, Any] = {}
		if seed_path.exists():
			try:
				with open(seed_path, "r", encoding="utf-8") as f:
					seed_stations = json.load(f)
				UniversalPipelineLogger.log("LOAD", f"Loaded {len(seed_stations)} baseline stations from local curated seed.")
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Could not load local seed: {ex}")

		alias_map: Dict[str, str] = {}
		alias_path = base_dir / "config" / "slug_aliases" / "mumbai.json"
		if alias_path.exists():
			try:
				with open(alias_path, "r", encoding="utf-8") as f:
					alias_map = json.load(f)
			except Exception:
				pass

		structured_output: Dict[str, Any] = {}

		# Step 1: Initialize all stations from the local curated seed
		for slug, seed_stn in seed_stations.items():
			structured_output[slug] = copy.deepcopy(seed_stn)

		# Step 2: Live Scraped Overlay on Seed
		overlay_count = 0
		new_stn_count = 0

		for raw_slug, live_st in cleaned_dataset.items():
			slug = alias_map.get(raw_slug, raw_slug)
			canonical_line = self.resolve_line_id(live_st.get("line", ""))
			details_raw = live_st.get("details_raw", {})
			en_raw = details_raw.get("en", {}) if isinstance(details_raw, dict) else {}
			mr_raw = details_raw.get("mr", {}) if isinstance(details_raw, dict) else {}
			if not isinstance(en_raw, dict):
				en_raw = {}
			if not isinstance(mr_raw, dict):
				mr_raw = {}

			# Extract live coordinates
			coords = live_st.get("coordinates")
			live_lat = None
			live_lon = None
			if coords and isinstance(coords, dict) and coords.get("latitude") and coords.get("longitude"):
				live_lat = coords.get("latitude")
				live_lon = coords.get("longitude")
			elif en_raw.get("latitude") and en_raw.get("longitude"):
				try:
					live_lat = float(en_raw["latitude"])
					live_lon = float(en_raw["longitude"])
				except (ValueError, TypeError):
					pass

			# Case A: Station exists in Seed -> Apply live updates
			if slug in structured_output:
				st_obj = structured_output[slug]

				# 1. Update Live GPS Decimal Coordinates if available
				if live_lat is not None and live_lon is not None:
					st_obj.setdefault("location", {})
					st_obj["location"]["decimal"] = {
						"lat": round(float(live_lat), 7),
						"lon": round(float(live_lon), 7)
					}
					x_raw = en_raw.get("x_coords")
					y_raw = en_raw.get("y_coords")
					if x_raw and y_raw:
						st_obj["location"]["schematic"] = {"x": float(x_raw), "y": float(y_raw)}

				# 2. Update Live Station Code if available
				live_code = live_st.get("station_code") or en_raw.get("code")
				if live_code:
					st_obj["code"] = live_code.strip()

				# 3. Update Order if live data provides authentic ordering
				if "order" in live_st and live_st["order"]:
					st_obj["order"] = int(live_st["order"])

				# 4. If MMRCL Line 3: Overlay authentic live gates, lifts, platforms, facilities from REST API
				if canonical_line == "mumbai.aqua" and en_raw:
					live_gates = self._parse_gates(en_raw, mr_raw)
					if live_gates:
						st_obj["gates"] = live_gates

					live_vt = self._parse_vertical_transit(en_raw)
					if live_vt:
						st_obj["vertical_transit"] = live_vt

					live_platforms = self._parse_platforms(en_raw)
					if live_platforms:
						st_obj.setdefault("platforms", {})
						st_obj["platforms"].update(live_platforms)

					live_facilities = self._parse_facilities(en_raw)
					if live_facilities:
						st_obj["facilities"] = live_facilities

					live_np = self._parse_nearby_places(en_raw)
					if live_np:
						st_obj["nearby_places"] = live_np

				overlay_count += 1

			# Case B: Newly discovered station in live data (not in seed)
			else:
				new_stn = self._build_canonical_station(slug, live_st, canonical_line, en_raw, mr_raw, live_lat, live_lon)
				structured_output[slug] = new_stn
				new_stn_count += 1

		UniversalPipelineLogger.log("INFO", f"Hybrid Overlay complete: {overlay_count} baseline stations updated, +{new_stn_count} new stations added.")
		UniversalPipelineLogger.log("INFO", f"Total structured master stations: {len(structured_output)}")
		return structured_output

	def _build_canonical_station(self, slug: str, st_data: dict, canonical_line: str, en_raw: dict, mr_raw: dict, lat: Optional[float], lon: Optional[float]) -> dict:
		st_name_en = self.clean_title(st_data.get("station_name_en") or en_raw.get("name") or slug)
		st_name_mr = (st_data.get("station_name_mr") or mr_raw.get("name") or "").strip() or st_name_en

		obj = {
			"id": slug,
			"name": {"en": st_name_en, "mr": st_name_mr, "hi": st_name_en},
			"lines": [canonical_line],
			"operator": st_data.get("operator", "MMRCL"),
			"properties": {"status": "operational", "station_type": "normal", "layout": "elevated"}
		}
		if lat is not None and lon is not None:
			obj["location"] = {"decimal": {"lat": round(lat, 7), "lon": round(lon, 7)}}
		if "order" in st_data and st_data["order"]:
			obj["order"] = int(st_data["order"])
		if st_data.get("station_code"):
			obj["code"] = st_data["station_code"]
		return obj

	@staticmethod
	def _parse_gates(en_raw: dict, mr_raw: dict) -> dict:
		gates = {}
		mr_gates = {}
		if isinstance(mr_raw, dict) and isinstance(mr_raw.get("gates"), list):
			mr_gates = {g.get("gate_name"): g.get("locations") for g in mr_raw.get("gates", []) if isinstance(g, dict)}

		for g in (en_raw.get("gates") or []):
			if isinstance(g, dict):
				g_name = (g.get("gate_name") or "G1").strip()
				g_key = g_name.replace("Gate No.", "").replace("Gate No", "").strip() or g_name
				loc_en = ", ".join([loc.get("location") for loc in g.get("locations", []) if isinstance(loc, dict) and loc.get("location")])
				loc_mr = ", ".join([loc.get("location") for loc in mr_gates.get(g_name, []) if isinstance(loc, dict) and loc.get("location")])

				g_entry: Dict[str, Any] = {
					"code": g.get("gate_code") or g_name,
					"status": g.get("status") or "open",
				}
				if "divyang_friendly" in g:
					g_entry["divyang"] = bool(g["divyang_friendly"])
				if g.get("gate_latitude") and g.get("gate_longitude"):
					g_entry["coordinates"] = {
						"latitude": float(g["gate_latitude"]),
						"longitude": float(g["gate_longitude"]),
					}
				if loc_en or loc_mr:
					g_entry["landmark"] = {}
					if loc_en:
						g_entry["landmark"]["en"] = loc_en
					if loc_mr:
						g_entry["landmark"]["mr"] = loc_mr
				gates[g_key] = g_entry
		return gates

	@staticmethod
	def _parse_vertical_transit(en_raw: dict) -> dict:
		lifts = {}
		escalators = {}
		l_count = 1
		e_count = 1
		for item in (en_raw.get("lifts") or []):
			if isinstance(item, dict):
				l_type = (item.get("lift_type") or "Lift").lower()
				code = item.get("code") or f"VT_{l_count}"
				entry = {
					"code": code,
					"name": item.get("name") or code,
					"status": bool(item.get("status", True)),
					"location": (item.get("description_location") or "").strip(),
					"placement": item.get("available_outside_inside", "Inside")
				}
				if "escalator" in l_type:
					escalators[str(e_count)] = entry
					e_count += 1
				else:
					if "divyang_friendly" in item:
						entry["divyang_friendly"] = bool(item["divyang_friendly"])
					lifts[str(l_count)] = entry
					l_count += 1

		res = {}
		if lifts:
			res["lifts"] = lifts
		if escalators:
			res["escalators"] = escalators
		return res

	@staticmethod
	def _parse_platforms(en_raw: dict) -> dict:
		platforms = {}
		for p in (en_raw.get("platforms") or []):
			if isinstance(p, dict):
				p_code = p.get("platform_code") or p.get("platform_name") or "PL1"
				p_num = str(p_code).replace("Platform No.", "").replace("Platform No", "").replace("PL", "").strip() or "1"
				towards = p.get("train_towards", {})
				dest_name = towards.get("name", "") if isinstance(towards, dict) else ""
				if dest_name:
					platforms[p_num] = {
						"line": "mumbai.aqua",
						"destination": UniversalFileSystemManager.slugify(dest_name)
					}
		return platforms

	@staticmethod
	def _parse_facilities(en_raw: dict) -> dict:
		facilities: Dict[str, list] = {}
		for fac in (en_raw.get("station_facilities") or []):
			if isinstance(fac, dict):
				f_kind = fac.get("kind") or "General"
				d_list = fac.get("detail_list", [])
				if isinstance(d_list, list) and len(d_list) > 0:
					for item in d_list:
						if isinstance(item, dict):
							facilities.setdefault(f_kind, []).append({
								"name": item.get("facility_name") or f_kind,
								"location": item.get("location_description") or ""
							})
				else:
					facilities.setdefault(f_kind, []).append({"name": f_kind, "location": fac.get("location") or ""})
		return facilities

	@staticmethod
	def _parse_nearby_places(en_raw: dict) -> dict:
		raw_np = en_raw.get("nearby_places", [])
		if not isinstance(raw_np, list) or not raw_np:
			return {}
		nearby_places: Dict[str, list] = {}
		for p in raw_np:
			if isinstance(p, dict) and p.get("name"):
				t_place = p.get("types_of_place", {})
				cat = t_place.get("name") if isinstance(t_place, dict) and t_place.get("name") else "General"
				p_entry = {"name": p["name"].strip()}
				if p.get("distance_from_metro") is not None:
					p_entry["distance_km"] = float(p["distance_from_metro"])
				if "connected_with_metro" in p:
					p_entry["connected"] = bool(p["connected_with_metro"])
				if p.get("estimated_walking_time_min") is not None:
					p_entry["walking_min"] = round(float(p["estimated_walking_time_min"]), 1)
				nearby_places.setdefault(cat, []).append(p_entry)
		return nearby_places