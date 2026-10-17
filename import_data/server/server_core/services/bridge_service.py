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

			
			staging_f = cdir / "staging_buffer.json"
			stg_staging_f = staging_dir / cid / "staging_buffer.json"
			target_f = staging_f if staging_f.exists() else (stg_staging_f if stg_staging_f.exists() else None)

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
			has_delta = False
			if target_f:
				try:
					content = json.load(open(target_f, "r", encoding="utf-8"))
					st_items = content.get("station_details", {})
					delta_count = len([k for k in st_items.keys() if k != "_meta"])
					new_stns_count = len(content.get("transit_network", {}).get("stations", {}))
					has_delta = delta_count > 0 or new_stns_count > 0
					delta_count = max(delta_count, new_stns_count)
				except Exception:
					pass

			matrix_data.append({
				"id": cid,
				"name": cdata.get("name", cid),
				"state": cdata.get("state", ""),
				"transit_network": {"exists": transit_p.exists(), "count": t_count},
				"station_details": {"exists": details_p.exists(), "count": d_count},
				"passenger_support": {"exists": support_p.exists(), "count": s_count},
				"has_delta": has_delta,
				"delta_count": delta_count
			})

		return matrix_data

	@classmethod
	def get_bridge_status(cls, city: str = "delhi_ncr") -> Dict[str, Any]:
		"""Checks buffer presence in production staging_buffer.json or .staging_temp."""
		city_dir = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / city
		staging_dir = DATA_DIR / ".staging_temp" / city

		target_file = city_dir / "staging_buffer.json" if (city_dir / "staging_buffer.json").exists() else (staging_dir / "staging_buffer.json")

		t_count = 0
		d_count = 0
		if target_file.exists():
			try:
				buf = json.load(open(target_file, "r", encoding="utf-8"))
				t_count = len(buf.get("transit_network", {}).get("stations", {}))
				d_count = len([k for k in buf.get("station_details", {}).keys() if k != "_meta"])
			except Exception:
				pass

		return {
			"city": city,
			"staging_buffer_exists": target_file.exists(),
			"transit_stations": t_count,
			"details_stations": d_count
		}

	@classmethod
	def inspect_bridge_delta(cls, city: str = "delhi_ncr", station: Optional[str] = None) -> Dict[str, Any]:
		"""Returns side-by-side sparse delta diffs from staging_buffer.json adhering to contract."""
		city_dir = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / city
		staging_dir = DATA_DIR / ".staging_temp" / city

		staging_file = next((f for f in [staging_dir / "staging_buffer.json", city_dir / "staging_buffer.json"] if f and f.exists()), None)
		details_base_file = city_dir / "station_details.json"
		transit_base_file = city_dir / "transit_network.json"

		staging_data = {}
		if staging_file and staging_file.exists():
			try:
				with open(staging_file, "r", encoding="utf-8") as f:
					staging_data = json.load(f)
			except Exception:
				pass

		details_auto = staging_data.get("station_details", {})
		transit_auto = staging_data.get("transit_network", {})

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

		# Load localized display names from locales (v4.0 Standard)
		locale_file = PROJECT_ROOT / "main_project" / "locales" / "en" / "india" / f"{city}_station_details_locale.json"
		localized_names: Dict[str, str] = {}
		if locale_file.exists():
			try:
				with open(locale_file, "r", encoding="utf-8") as lf:
					loc_data = json.load(lf)
				for sid, sinfo in loc_data.get("stations", {}).items():
					if isinstance(sinfo, dict) and "name" in sinfo:
						localized_names[sid] = sinfo["name"]
			except Exception:
				pass

		stations_catalog = [
			{
				"slug": slug,
				"name": localized_names.get(slug, slug.replace("_", " ").title()),
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
		staging_file = city_dir / "staging_buffer.json"
		details_base_file = city_dir / "station_details.json"
		transit_base_file = city_dir / "transit_network.json"

		merged = False
		is_new_station = False

		if staging_file.exists():
			staging_data = json.load(open(staging_file, "r", encoding="utf-8"))
			details_buf = staging_data.get("station_details", {})
			transit_buf = staging_data.get("transit_network", {})

			if station in details_buf and details_base_file.exists():
				patch = details_buf.pop(station)
				clean_patch = {k: v for k, v in patch.items() if k != "_meta"}
				base_data = json.load(open(details_base_file, "r", encoding="utf-8"))
				if station not in base_data:
					base_data[station] = clean_patch
					is_new_station = True
				else:
					base_data[station].update(clean_patch)
				UniversalFileSystemManager.save_atomic_tab_json(details_base_file, base_data)
				merged = True

			stns_buf = transit_buf.get("stations", {})
			if station in stns_buf and transit_base_file.exists():
				stn_graph = stns_buf.pop(station)
				t_base = json.load(open(transit_base_file, "r", encoding="utf-8"))
				t_base.setdefault("stationData", {})[station] = stn_graph
				UniversalFileSystemManager.save_atomic_tab_json(transit_base_file, t_base)
				merged = True

			if merged:
				staging_data.setdefault("_meta", {}).setdefault("summary", {})["total_delta_stations"] = len([k for k in details_buf.keys() if k != "_meta"])
				staging_data["_meta"]["summary"]["new_graph_stations"] = len(stns_buf)
				UniversalFileSystemManager.save_atomic_tab_json(staging_file, staging_data)

		# Sync locale skeleton for newly added station
		if is_new_station:
			locales_root = PROJECT_ROOT / "main_project" / "locales"
			for lang in ["en", "hi"]:
				loc_file = locales_root / lang / "india" / f"{city}_station_details_locale.json"
				if loc_file.exists():
					try:
						loc_content = json.load(open(loc_file, "r", encoding="utf-8"))
						if station not in loc_content.setdefault("stations", {}):
							loc_content["stations"][station] = {
								"name": station.replace("_", " ").title(),
								"aliases": [],
								"description": "",
								"gates": {},
								"landmarks": []
							}
							UniversalFileSystemManager.save_atomic_tab_json(loc_file, loc_content)
					except Exception:
						pass

		return {"success": True, "merged": merged, "station": station}