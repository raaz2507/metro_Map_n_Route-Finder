"""
Production Bridge & Staging Inspection Service (OOP)
Location: import_data/server_core/services/bridge_service.py
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from ..config import CONFIG_DIR, PROJECT_ROOT, DATA_DIR
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.stage4_bridge.bridge_core.city_resolver import CityRegistryResolver


class BridgeInspectionService:
	"""
	Enterprise OOP Service handling multi-city staging delta discovery,
	readiness metrics, inspection diffs, and individual station promotions.
	"""

	@classmethod
	def get_cities(cls) -> List[Dict[str, Any]]:
		"""Lists all cities registered in india_transit_registry.json."""
		registry_path = CONFIG_DIR / "india_transit_registry.json"
		if not registry_path.exists():
			return []

		try:
			with open(registry_path, "r", encoding="utf-8") as f:
				reg_data = json.load(f)
			cities_dict = reg_data.get("cities", {})
			cities_list = []
			for cid, cdata in cities_dict.items():
				cities_list.append({
					"id": cid,
					"name": cdata.get("name", cid),
					"state": cdata.get("state", ""),
					"default_network": cdata.get("default_network", "")
				})
			return cities_list
		except Exception as ex:
			print(f"[ERROR in get_cities]: {ex}")
			return []

	@classmethod
	def get_readiness_matrix(cls) -> List[Dict[str, Any]]:
		"""Computes production readiness metrics across all registered transit cities."""
		registry_path = CONFIG_DIR / "india_transit_registry.json"
		if not registry_path.exists():
			return []

		try:
			with open(registry_path, "r", encoding="utf-8") as f:
				reg_data = json.load(f)
		except Exception as ex:
			print(f"[ERROR in registry read]: {ex}")
			return []

		cities_dir = PROJECT_ROOT / "main_project" / "data" / "india" / "cities"
		staging_dir = DATA_DIR / ".staging_temp"

		cities_dict = reg_data.get("cities", {})
		matrix_data = []
		for cid, cdata in cities_dict.items():
			cdir = cities_dir / cid
			transit_p = cdir / "transit_network.json"
			details_p = cdir / "station_details.json"
			support_p = cdir / "passenger_support.json"

			
			t_auto = cdir / "transit_network_auto.json"
			d_auto = cdir / "station_details_auto.json"
			stg_t = staging_dir / cid / "transit_network_auto.json"
			stg_d = staging_dir / cid / "station_details_auto.json"

			t_count = 0
			if transit_p.exists():
				try:
					t_count = len(json.load(open(transit_p, "r", encoding="utf-8")).get("stationData", {}))
				except Exception:
					pass

			d_count = 0
			if details_p.exists():
				try:
					d_count = len([k for k in json.load(open(details_p, "r", encoding="utf-8")).keys() if k != "_meta"])
				except Exception:
					pass

			s_count = 0
			if support_p.exists():
				try:
					s_count = len(json.load(open(support_p, "r", encoding="utf-8")).get("operators", []))
				except Exception:
					pass

			delta_count = 0
			for f in [t_auto, d_auto, stg_t, stg_d]:
				if f.exists():
					try:
						content = json.load(open(f, "r", encoding="utf-8"))
						st_items = content.get("stations", content)
						delta_count = max(delta_count, len([k for k in st_items.keys() if k != "_meta"]))
					except Exception:
						pass

			matrix_data.append({
				"id": cid,
				"name": cdata.get("name", cid),
				"state": cdata.get("state", ""),
				"transit_network": {"exists": transit_p.exists(), "count": t_count},
				"station_details": {"exists": details_p.exists(), "count": d_count},
				"passenger_support": {"exists": support_p.exists(), "count": s_count},
				"has_delta": (t_auto.exists() or d_auto.exists() or stg_t.exists() or stg_d.exists()),
				"delta_count": delta_count
			})

		return matrix_data

	@classmethod
	def get_bridge_status(cls, city: str = "delhi_ncr") -> Dict[str, Any]:
		"""Checks buffer presence in both production *_auto and .staging_temp."""
		city_dir = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / city
		staging_dir = DATA_DIR / ".staging_temp" / city

		target_t = city_dir / "transit_network_auto.json" if (city_dir / "transit_network_auto.json").exists() else (staging_dir / "transit_network_auto.json")
		target_d = city_dir / "station_details_auto.json" if (city_dir / "station_details_auto.json").exists() else (staging_dir / "station_details_auto.json")

		t_count = 0
		d_count = 0
		if target_t.exists():
			try:
				t_count = len(json.load(open(target_t, "r", encoding="utf-8")).get("stations", {}))
			except Exception:
				pass
		if target_d.exists():
			try:
				d_count = len([k for k in json.load(open(target_d, "r", encoding="utf-8")).keys() if k != "_meta"])
			except Exception:
				pass

		return {
			"city": city,
			"transit_auto_exists": target_t.exists(),
			"details_auto_exists": target_d.exists(),
			"transit_stations": t_count,
			"details_stations": d_count
		}

	@classmethod
	def inspect_bridge_delta(cls, city: str = "delhi_ncr", station: Optional[str] = None) -> Dict[str, Any]:
		"""Returns side-by-side sparse delta diffs adhering strictly to production_bridge.js contract."""
		city_dir = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / city
		staging_dir = DATA_DIR / ".staging_temp" / city

		details_auto_file = next((f for f in [staging_dir / "station_details_auto.json", city_dir / "station_details_auto.json"] if f and f.exists()), None)
		transit_auto_file = next((f for f in [staging_dir / "transit_network_auto.json", city_dir / "transit_network_auto.json"] if f and f.exists()), None)
		details_base_file = city_dir / "station_details.json"
		transit_base_file = city_dir / "transit_network.json"

		details_auto = {}
		if details_auto_file and details_auto_file.exists():
			try:
				with open(details_auto_file, "r", encoding="utf-8") as f:
					details_auto = json.load(f)
			except Exception:
				pass

		transit_auto = {}
		if transit_auto_file and transit_auto_file.exists():
			try:
				with open(transit_auto_file, "r", encoding="utf-8") as f:
					transit_auto = json.load(f)
			except Exception:
				pass

		details_base = {}
		if details_base_file.exists():
			try:
				with open(details_base_file, "r", encoding="utf-8") as f:
					details_base = json.load(f)
			except Exception:
				pass

		transit_base = {}
		if transit_base_file.exists():
			try:
				with open(transit_base_file, "r", encoding="utf-8") as f:
					transit_base = json.load(f)
			except Exception:
				pass

		auto_details_keys = {k for k in details_auto.keys() if k != "_meta"}
		auto_transit_keys = set(transit_auto.get("stations", {}).keys())
		all_delta_slugs = sorted(list(auto_details_keys | auto_transit_keys))
		base_stn_data = transit_base.get("stationData", {})

		stations_catalog = [
			{
				"slug": slug,
				"is_new": (slug not in base_stn_data and slug not in details_base),
				"has_details_delta": slug in auto_details_keys,
				"has_transit_delta": slug in auto_transit_keys
			}
			for slug in all_delta_slugs
		]

		# Compute side-by-side data payload
		if station and station != "__all__":
			target_slug = station
			master_data = details_base.get(target_slug) or base_stn_data.get(target_slug) or {}
			target_data = details_auto.get(target_slug) or transit_auto.get("stations", {}).get(target_slug) or {}
		else:
			master_data = details_base if details_base else base_stn_data
			target_data = details_auto if details_auto else transit_auto

		return {
			"city": city,
			"target_station": station or "__all__",
			"stations_catalog": stations_catalog,
			"master_source_file": details_base_file.name if details_base_file.exists() else "Base not found",
			"target_source_file": details_auto_file.name if details_auto_file else "No delta file",
			"master_data": master_data,
			"target_data": target_data,
			"stats": {
				"total_stations": len(all_delta_slugs),
				"details_delta_count": len(auto_details_keys),
				"transit_delta_count": len(auto_transit_keys)
			}
		}

	@classmethod
	def merge_station(cls, city: str, station: str) -> Dict[str, Any]:
		"""Individually promotes a single verified station from staging buffer into base."""
		city_dir = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / city
		details_auto_file = city_dir / "station_details_auto.json"
		details_base_file = city_dir / "station_details.json"
		transit_auto_file = city_dir / "transit_network_auto.json"
		transit_base_file = city_dir / "transit_network.json"

		merged = False
		if details_auto_file.exists() and details_base_file.exists():
			auto_data = json.load(open(details_auto_file, "r", encoding="utf-8"))
			if station in auto_data:
				patch = auto_data.pop(station)
				clean_patch = {k: v for k, v in patch.items() if k != "_meta"}
				base_data = json.load(open(details_base_file, "r", encoding="utf-8"))
				if station not in base_data:
					base_data[station] = clean_patch
				else:
					base_data[station].update(clean_patch)

				auto_data.setdefault("_meta", {})["total_delta_stations"] = len([k for k in auto_data.keys() if k != "_meta"])
				UniversalFileSystemManager.save_atomic_tab_json(details_base_file, base_data)
				UniversalFileSystemManager.save_atomic_tab_json(details_auto_file, auto_data)
				merged = True

		if transit_auto_file.exists() and transit_base_file.exists():
			t_auto = json.load(open(transit_auto_file, "r", encoding="utf-8"))
			if station in t_auto.get("stations", {}):
				stn_graph = t_auto["stations"].pop(station)
				t_base = json.load(open(transit_base_file, "r", encoding="utf-8"))
				t_base.setdefault("stationData", {})[station] = stn_graph
				t_auto.setdefault("_meta", {})["total_new_stations"] = len(t_auto["stations"])
				UniversalFileSystemManager.save_atomic_tab_json(transit_base_file, t_base)
				UniversalFileSystemManager.save_atomic_tab_json(transit_auto_file, t_auto)
				merged = True

		return {"success": True, "merged": merged, "station": station}