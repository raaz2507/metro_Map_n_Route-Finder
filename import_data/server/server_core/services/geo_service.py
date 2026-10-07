"""
Geo-Coordinate Audit & Selective Synchronization Service (OOP)
Location: import_data/server_core/services/geo_service.py
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Set, Optional

from ..config import CONFIG_DIR, PROJECT_ROOT, DATA_DIR, BASE_DIR
from data.geo_engine.compare_geo_coordinates import CITY_MAPPINGS, haversine_distance_meters
from pipeline.core.slug_reconciler import UniversalSlugReconciler
from pipeline.core.file_manager import UniversalFileSystemManager


class GeoAuditService:
	"""
	Enterprise OOP Service for Geo Auditing and Selective Staging Application.
	Enforces zero blast radius: buffers URLs into station_details_auto.json.
	"""

	@classmethod
	def get_available_cities(cls) -> List[Dict[str, Any]]:
		"""Returns list of registered cities with available geo datasets."""
		cities_out = []
		seen = set()
		for item in CITY_MAPPINGS:
			k = item["key"]
			if k not in seen:
				seen.add(k)
				main_f = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / item["main_folder"] / item["main_file"]
				bench_f = DATA_DIR / "geo_engine" / "india" / "cities" / item["bench_folder"] / item["bench_file"]
				cities_out.append({
					"key": k,
					"name": item["name"],
					"main_folder": item["main_folder"],
					"has_main_data": main_f.exists(),
					"has_bench_data": bench_f.exists()
				})
		return cities_out

	@classmethod
	def run_audit(cls, city: str, mode: str = "base_vs_google") -> Dict[str, Any]:
		"""Audits drift between base coordinates, Google verified truth, and agency data."""
		cfg = next((c for c in CITY_MAPPINGS if c["key"] == city), None)
		if not cfg:
			raise ValueError(f"Unknown city '{city}'")

		main_folder = cfg["main_folder"]
		city_folder = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / main_folder
		main_file = city_folder / cfg["main_file"]

		if not main_file.exists():
			raise FileNotFoundError(f"Missing production transit file: {main_file.name}")

		with open(main_file, "r", encoding="utf-8") as f:
			main_data = json.load(f)
		base_stns = main_data.get("stationData", main_data.get("stations", {}))

		reconciler = UniversalSlugReconciler(main_folder, BASE_DIR, base_stns)
		geo_cities_dir = DATA_DIR / "geo_engine" / "india" / "cities"
		datasets_dir = DATA_DIR / "datasets"

		# Ingest benchmark Google coords
		bench_map = {}
		for mapping in CITY_MAPPINGS:
			if mapping["main_folder"] == main_folder or mapping["key"] == city:
				b_file = geo_cities_dir / mapping["bench_folder"] / mapping["bench_file"]
				if b_file.exists():
					try:
						records = json.load(open(b_file, "r", encoding="utf-8"))
						for r in records:
							raw_id = r.get("station_id")
							if raw_id:
								resolved_id = reconciler.resolve(raw_id)
								bench_map[resolved_id] = r
					except Exception:
						pass

		# Ingest Agency master coords
		agency_stns = {}
		for mapping in CITY_MAPPINGS:
			if mapping["main_folder"] == main_folder or mapping["key"] == city:
				ag_folder = datasets_dir / mapping["bench_folder"]
				for cand in [
					ag_folder / f"{mapping['bench_folder'][:-5]}_master.json",
					ag_folder / f"{mapping['key']}_master.json",
					ag_folder / f"{mapping['main_folder']}_master.json"
				]:
					if cand.exists():
						try:
							ag_d = json.load(open(cand, "r", encoding="utf-8"))
							st_items = ag_d.get("stations", ag_d.get("stationData", ag_d if isinstance(ag_d, dict) else {}))
							for raw_id, st_obj in st_items.items():
								resolved_id = reconciler.resolve(raw_id)
								agency_stns[resolved_id] = st_obj
						except Exception:
							pass
						break

		if mode in ["base_vs_google", "base_vs_agency"]:
			all_slugs = sorted(list(base_stns.keys()))
		else:
			all_slugs = sorted(list(set(base_stns.keys()) | set(bench_map.keys()) | set(agency_stns.keys())))

		if mode == "base_vs_agency":
			left_label, right_label = "Base Production", "Agency Master"
		elif mode == "google_vs_agency":
			left_label, right_label = "Google Ground-Truth", "Agency Master"
		else:
			left_label, right_label = "Base Production", "Google Ground-Truth"

		results = []
		counts = {"match": 0, "offset": 0, "moderate": 0, "critical": 0, "missing": 0}

		for s_id in all_slugs:
			b_stn = base_stns.get(s_id, {})
			b_loc = b_stn.get("location", {}) if isinstance(b_stn, dict) else {}
			b_dec = b_loc.get("decimal") if isinstance(b_loc, dict) else None
			b_lat = b_dec.get("lat") if isinstance(b_dec, dict) else None
			b_lon = b_dec.get("lon") if isinstance(b_dec, dict) else None

			g_stn = bench_map.get(s_id, {})
			g_coords = g_stn.get("coordinates") or {}
			g_lat, g_lon = g_coords.get("lat"), g_coords.get("lon")
			g_url = g_stn.get("generated_google_maps_url") or g_stn.get("google_maps_url")

			a_stn = agency_stns.get(s_id, {}) if isinstance(agency_stns, dict) else {}
			a_loc = a_stn.get("location", {}) if isinstance(a_stn, dict) else {}
			a_dec = a_loc.get("decimal") if isinstance(a_loc, dict) else None
			a_lat = a_dec.get("lat") if isinstance(a_dec, dict) else None
			a_lon = a_dec.get("lon") if isinstance(a_dec, dict) else None

			name_obj = b_stn.get("name") or a_stn.get("name") or g_stn.get("name")
			name_en = name_obj.get("en", s_id) if isinstance(name_obj, dict) else str(name_obj or s_id)

			if mode == "base_vs_agency":
				l_lat, l_lon, r_lat, r_lon = b_lat, b_lon, a_lat, a_lon
			elif mode == "google_vs_agency":
				l_lat, l_lon, r_lat, r_lon = g_lat, g_lon, a_lat, a_lon
			else:
				l_lat, l_lon, r_lat, r_lon = b_lat, b_lon, g_lat, g_lon

			dist_m = None
			status = "MISSING"

			if l_lat is not None and l_lon is not None and r_lat is not None and r_lon is not None:
				if abs(l_lat - l_lon) < 0.0001:
					status = "CRITICAL"
					counts["critical"] += 1
					dist_m = round(haversine_distance_meters(l_lat, l_lon, r_lat, r_lon), 1)
				else:
					dist_m = round(haversine_distance_meters(l_lat, l_lon, r_lat, r_lon), 1)
					if dist_m <= 50:
						status, counts["match"] = "MATCH", counts["match"] + 1
					elif dist_m <= 500:
						status, counts["offset"] = "OFFSET", counts["offset"] + 1
					elif dist_m <= 5000:
						status, counts["moderate"] = "MODERATE", counts["moderate"] + 1
					else:
						status, counts["critical"] = "CRITICAL", counts["critical"] + 1
			else:
				counts["missing"] += 1

			results.append({
				"station_id": s_id,
				"name": name_en,
				"left_coords": {"lat": l_lat, "lon": l_lon},
				"right_coords": {"lat": r_lat, "lon": r_lon},
				"google_coords": {"lat": g_lat, "lon": g_lon},
				"agency_coords": {"lat": a_lat, "lon": a_lon},
				"distance_m": dist_m,
				"status": status,
				"url": g_url
			})

		status_priority = {"CRITICAL": 0, "MODERATE": 1, "OFFSET": 2, "MATCH": 3, "MISSING": 4}
		results.sort(key=lambda x: (status_priority.get(x["status"], 5), -(x["distance_m"] or 0)))

		return {
			"city": city,
			"name": cfg["name"],
			"mode": mode,
			"labels": {"left": left_label, "right": right_label},
			"counts": counts,
			"total": len(results),
			"stations": results
		}

	@classmethod
	def apply_coordinates(cls, city: str, selected_slugs: Set[str], source_target: str = "google") -> int:
		"""
		Selectively applies verified coordinates to transit_network.json,
		and buffers generated_google_maps_url strictly into station_details_auto.json.
		"""
		cfg = next((c for c in CITY_MAPPINGS if c["key"] == city), None)
		if not cfg:
			raise ValueError(f"Unknown city '{city}'")

		main_folder = cfg["main_folder"]
		city_folder = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / main_folder
		main_file = city_folder / cfg["main_file"]

		with open(main_file, "r", encoding="utf-8") as f:
			main_data = json.load(f)
		stn_data = main_data.get("stationData", main_data.get("stations", {}))

		reconciler = UniversalSlugReconciler(main_folder, BASE_DIR, stn_data)
		geo_cities_dir = DATA_DIR / "geo_engine" / "india" / "cities"
		datasets_dir = DATA_DIR / "datasets"

		coords_map = {}
		if source_target == "google":
			for mapping in CITY_MAPPINGS:
				if mapping["main_folder"] == main_folder or mapping["key"] == city:
					b_file = geo_cities_dir / mapping["bench_folder"] / mapping["bench_file"]
					if b_file.exists():
						try:
							records = json.load(open(b_file, "r", encoding="utf-8"))
							for r in records:
								raw_id = r.get("station_id")
								coords = r.get("coordinates") or {}
								if raw_id and coords.get("lat") and coords.get("lon"):
									resolved_id = reconciler.resolve(raw_id)
									coords_map[resolved_id] = {
										"lat": coords["lat"],
										"lon": coords["lon"],
										"url": r.get("generated_google_maps_url") or r.get("google_maps_url")
									}
						except Exception:
							pass
		else:  # agency
			for mapping in CITY_MAPPINGS:
				if mapping["main_folder"] == main_folder or mapping["key"] == city:
					ag_folder = datasets_dir / mapping["bench_folder"]
					for cand in [
						ag_folder / f"{mapping['bench_folder'][:-5]}_master.json",
						ag_folder / f"{mapping['key']}_master.json",
						ag_folder / f"{mapping['main_folder']}_master.json"
					]:
						if cand.exists():
							try:
								ag_d = json.load(open(cand, "r", encoding="utf-8"))
								st_items = ag_d.get("stations", ag_d.get("stationData", ag_d if isinstance(ag_d, dict) else {}))
								for raw_id, st_obj in st_items.items():
									dec = st_obj.get("location", {}).get("decimal", {}) if isinstance(st_obj, dict) else {}
									if dec.get("lat") and dec.get("lon"):
										resolved_id = reconciler.resolve(raw_id)
										coords_map[resolved_id] = {"lat": dec["lat"], "lon": dec["lon"], "url": None}
							except Exception:
								pass
							break

		updated_count = 0
		for s_id in selected_slugs:
			resolved_s_id = reconciler.resolve(s_id)
			target_key = resolved_s_id if resolved_s_id in stn_data else s_id
			if target_key in stn_data and (resolved_s_id in coords_map or s_id in coords_map):
				c_val = coords_map.get(resolved_s_id) or coords_map.get(s_id)
				if c_val:
					stn_data[target_key].setdefault("location", {})["decimal"] = {
						"lat": c_val["lat"],
						"lon": c_val["lon"]
					}
					updated_count += 1

		UniversalFileSystemManager.save_atomic_tab_json(main_file, main_data, compact=True)

		# Buffer generated_google_maps_url into station_details_auto.json (Staging Buffer)
		auto_details_file = city_folder / "station_details_auto.json"
		auto_data = {}
		if auto_details_file.exists():
			try:
				with open(auto_details_file, "r", encoding="utf-8") as f:
					auto_data = json.load(f)
			except Exception:
				auto_data = {}

		d_updated = False
		for s_id in selected_slugs:
			resolved_s_id = reconciler.resolve(s_id)
			target_key = resolved_s_id if resolved_s_id in stn_data else s_id
			c_val = coords_map.get(resolved_s_id) or coords_map.get(s_id)
			if c_val and c_val.get("url"):
				entry = auto_data.setdefault(target_key, {})
				entry["generated_google_maps_url"] = c_val["url"]
				entry["_meta"] = {
					"is_new": False,
					"modified_fields": ["generated_google_maps_url"]
				}
				d_updated = True

		if d_updated:
			UniversalFileSystemManager.save_atomic_tab_json(auto_details_file, auto_data, compact=True)

		return updated_count