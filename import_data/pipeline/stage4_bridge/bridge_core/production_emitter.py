"""
Production Emitter and Promotion Engine for Production Bridge (Stage 4).
Location: import_data/bridge_core/production_emitter.py
Role: Handles atomic writes of unified staging buffer (staging_buffer.json).
      Handles supervised 3-way promotion (transit_network.json, station_details.json, locales).
      Existing base files are strictly protected against automated overwrites.
"""
import datetime
import json
from pathlib import Path
from typing import Dict, Any
from pipeline.core.logger import UniversalPipelineLogger
from pipeline.core.file_manager import UniversalFileSystemManager


class ProductionEmitter:
	"""
	Atomic Emitter and Supervised Promotion Engine.
	Enforces Zero Blast Radius:
	  - Only writes to .staging_temp/ in stage_temp mode
	  - Only writes to staging_buffer.json in port_production mode
	  - Base files (transit_network.json, station_details.json, locales) are NEVER directly touched
	    unless explicitly requested in promote mode.
	"""

	@staticmethod
	def emit_staging_or_production(
		mode: str,
		city_id: str,
		target_city_dir: Path,
		staging_base_dir: Path,
		details_delta: Dict[str, Any],
		transit_network_delta: Dict[str, Any],
		aggregated_support: Dict[str, Any],
		audit_summary: Dict[str, Any]
	) -> bool:
		"""Writes unified staging buffer and passenger support files."""
		if mode in ["stage_temp", "prepare_temp"]:
			dest_dir = staging_base_dir / ".staging_temp" / city_id
			dest_dir.mkdir(parents=True, exist_ok=True)
			UniversalPipelineLogger.log("WRITE", f"Writing staging preview files to: {dest_dir}")
		else:
			dest_dir = target_city_dir
			dest_dir.mkdir(parents=True, exist_ok=True)
			UniversalPipelineLogger.log("WRITE", f"Writing unified staging buffer to: {dest_dir}")

		# 1. Build draft locales delta for newly discovered stations
		new_station_ids = [
			slug for slug, p in details_delta.items()
			if slug != "_meta" and isinstance(p, dict) and p.get("_meta", {}).get("is_new")
		]
		locales_delta: Dict[str, Any] = {
			"en": {"stations": {}},
			"hi": {"stations": {}}
		}
		for s_id in new_station_ids:
			locales_delta["en"]["stations"][s_id] = {
				"name": s_id.replace("_", " ").title(),
				"aliases": [],
				"description": "",
				"gates": {},
				"landmarks": []
			}
			locales_delta["hi"]["stations"][s_id] = {
				"name": "",
				"aliases": [],
				"description": "",
				"gates": {},
				"landmarks": []
			}

		# 2. Save unified staging_buffer.json
		delta_stations_count = len([k for k in details_delta.keys() if k != "_meta"])
		new_graph_stns = transit_network_delta.get("stations", {})
		new_lines = transit_network_delta.get("lines", {})
		new_transfers = transit_network_delta.get("transfers", {})
		new_fare_rules = transit_network_delta.get("fareRules", {})

		staging_buffer = {
			"_meta": {
				"city": city_id,
				"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
				"status": "pending_developer_review",
				"summary": {
					"total_delta_stations": delta_stations_count,
					"new_graph_stations": len(new_graph_stns),
					"new_lines": len(new_lines),
					"has_new_transfers": bool(new_transfers),
					"has_new_fare_rules": bool(new_fare_rules)
				}
			},
			"transit_network": {
				"stations": new_graph_stns,
				"lines": new_lines,
				"transfers": new_transfers,
				"fareRules": new_fare_rules
			},
			"station_details": {k: v for k, v in details_delta.items() if k != "_meta"},
			"locales": locales_delta
		}

		staging_target = dest_dir / "staging_buffer.json"
		UniversalFileSystemManager.save_atomic_tab_json(staging_target, staging_buffer)
		UniversalPipelineLogger.log("SUCCESS", f"Emitted: {staging_target.name} (Delta stations: {delta_stations_count})")

		# 3. Save passenger_support.json (Protected against empty overwrite)
		support_target = dest_dir / "passenger_support.json"
		should_write_support = True
		if support_target.exists():
			try:
				with open(support_target, "r", encoding="utf-8") as exf:
					existing_supp = json.load(exf)
				has_existing_helplines = any(
					bool(n.get("helplines") or n.get("portals"))
					for n in existing_supp.get("networks", {}).values()
					if isinstance(n, dict)
				)
				has_new_helplines = any(
					bool(n.get("helplines") or n.get("portals"))
					for n in aggregated_support.get("networks", {}).values()
					if isinstance(n, dict)
				)
				if has_existing_helplines and not has_new_helplines:
					should_write_support = False
					UniversalPipelineLogger.log("SUPPORT", f"Protected existing verified passenger_support.json for {city_id} (Skipping empty overwrite)")
			except Exception:
				pass

		if should_write_support:
			UniversalFileSystemManager.save_atomic_tab_json(support_target, aggregated_support)
			UniversalPipelineLogger.log("SUCCESS", f"Emitted: {support_target.name}")

		# 4. Save audit summary report inside import_data/.staging_temp
		audit_dir = staging_base_dir / ".staging_temp" / city_id
		audit_dir.mkdir(parents=True, exist_ok=True)
		audit_target = audit_dir / "overlay_audit_report.json"
		UniversalFileSystemManager.save_atomic_tab_json(audit_target, audit_summary)
		UniversalPipelineLogger.log("AUDIT", f"Pipeline audit report saved at: import_data/.staging_temp/{city_id}/{audit_target.name}")

		return True

	@staticmethod
	def promote_buffer_to_base(city_id: str, target_city_dir: Path) -> bool:
		"""
		Supervised 3-Way Promotion Engine (Zero Blast Radius):
		-------------------------------------------------------------------------
		Reads staging_buffer.json and atomically promotes:
		  1. station_details -> station_details.json (merges amenities, timings, gates, etc.)
		  2. transit_network -> transit_network.json (merges stations, lines, transfers, fares)
		  3. locales -> <city>_station_details_locale.json (merges EN, HI, regional names)
		
		After promotion, resets staging_buffer.json to a clean 0-delta buffer.
		-------------------------------------------------------------------------
		"""
		staging_file = target_city_dir / "staging_buffer.json"
		details_base_file = target_city_dir / "station_details.json"
		transit_base_file = target_city_dir / "transit_network.json"

		if not staging_file.exists():
			UniversalPipelineLogger.log("WARN", f"No staging_buffer.json found to promote at: {staging_file}")
			return False

		try:
			with open(staging_file, "r", encoding="utf-8") as f:
				staging_data = json.load(f)
		except Exception as ex:
			UniversalPipelineLogger.log("ERROR", f"Failed reading staging_buffer.json: {ex}")
			return False

		transit_delta = staging_data.get("transit_network", {})
		details_delta = staging_data.get("station_details", {})
		locales_delta = staging_data.get("locales", {})

		# --- 1. Promote station_details ---
		base_details: Dict[str, Any] = {}
		is_new_details = not details_base_file.exists()

		if not is_new_details:
			try:
				with open(details_base_file, "r", encoding="utf-8") as f:
					base_details = json.load(f)
			except Exception as ex:
				UniversalPipelineLogger.log("ERROR", f"Failed reading base station_details.json: {ex}")
				return False
		else:
			UniversalPipelineLogger.log("INFO", f"Base station_details.json not found for [{city_id}]. Initializing as new.")

		promoted_details_count = 0
		for slug, patch in details_delta.items():
			if slug == "_meta" or not isinstance(patch, dict):
				continue

			clean_patch = {k: v for k, v in patch.items() if k != "_meta"}
			if slug not in base_details:
				base_details[slug] = clean_patch
			else:
				base_details[slug].update(clean_patch)
			promoted_details_count += 1

		UniversalFileSystemManager.save_atomic_tab_json(details_base_file, base_details, compact=True)
		label_details = "Initialized new base with" if is_new_details else "Successfully baked"
		UniversalPipelineLogger.log("PROMOTE", f"{label_details} {promoted_details_count} stations into: {details_base_file.name}")

		# --- 2. Promote transit_network ---
		auto_lines = transit_delta.get("lines", {})
		auto_transfers = transit_delta.get("transfers", {})
		auto_stns = transit_delta.get("stations", {})
		auto_fares = transit_delta.get("fareRules", {})

		try:
			if not transit_base_file.exists():
				base_network = {
					"defaults": {"stationType": "normal", "layout": "elevated"},
					"fareRules": auto_fares,
					"lines": auto_lines,
					"transfers": auto_transfers,
					"stationData": auto_stns
				}
				UniversalFileSystemManager.save_atomic_tab_json(transit_base_file, base_network, compact=True)
				UniversalPipelineLogger.log("PROMOTE", f"Initialized new base transit network: {transit_base_file.name}")
			else:
				with open(transit_base_file, "r", encoding="utf-8") as bf:
					base_net = json.load(bf)
				updated = False

				if not base_net.get("lines") and auto_lines:
					base_net["lines"] = auto_lines
					updated = True
				elif auto_lines:
					for al_id, al_val in auto_lines.items():
						if al_id not in base_net.setdefault("lines", {}):
							base_net["lines"][al_id] = al_val
							updated = True

				if not base_net.get("transfers") and auto_transfers:
					base_net["transfers"] = auto_transfers
					updated = True

				if not base_net.get("fareRules") and auto_fares:
					base_net["fareRules"] = auto_fares
					updated = True

				if auto_stns:
					for stn_id, stn_graph in auto_stns.items():
						if stn_id not in base_net.setdefault("stationData", {}):
							base_net["stationData"][stn_id] = stn_graph
							updated = True
						elif "location" in stn_graph:
							base_net["stationData"][stn_id]["location"] = stn_graph["location"]
							updated = True

				# Auto-link missing line farePolicy to declared authentic network policy
				policies = base_net.get("fareRules", {}).get("policies", {})
				if policies and "lines" in base_net:
					for l_obj in base_net["lines"].values():
						if not l_obj.get("farePolicy"):
							l_net = l_obj.get("network")
							matched = None
							for pol_id, pol_obj in policies.items():
								if isinstance(pol_obj, dict) and pol_obj.get("network") == l_net:
									matched = pol_id
									break
							if not matched and l_net:
								for pol_id in policies:
									if l_net in pol_id or pol_id in l_net:
										matched = pol_id
										break
							if matched:
								l_obj["farePolicy"] = matched
								updated = True

				if updated:
					UniversalFileSystemManager.save_atomic_tab_json(transit_base_file, base_net, compact=True)
					UniversalPipelineLogger.log("PROMOTE", f"Updated base transit network with lines/transfers/fares: {transit_base_file.name}")
		except Exception as ex:
			UniversalPipelineLogger.log("ERROR", f"Failed handling base transit network: {ex}")

		# --- 3. Promote locales ---
		if locales_delta:
			try:
				locales_root = target_city_dir.parents[3] / "locales"
				for lang, lang_dict in locales_delta.items():
					stations_map = lang_dict.get("stations", {}) if isinstance(lang_dict, dict) else {}
					if not stations_map:
						continue

					loc_file = locales_root / lang / "india" / f"{city_id}_station_details_locale.json"
					if loc_file.exists():
						with open(loc_file, "r", encoding="utf-8") as lf:
							loc_content = json.load(lf)
						loc_stns = loc_content.setdefault("stations", {})
						loc_updated = False
						for ns_id, ns_payload in stations_map.items():
							if ns_id not in loc_stns:
								loc_stns[ns_id] = ns_payload
								loc_updated = True
							elif ns_payload.get("name") and not loc_stns[ns_id].get("name"):
								loc_stns[ns_id]["name"] = ns_payload["name"]
								loc_updated = True

						if loc_updated:
							UniversalFileSystemManager.save_atomic_tab_json(loc_file, loc_content)
							UniversalPipelineLogger.log("PROMOTE", f"Synchronized {len(stations_map)} station entries into {lang} locale: {loc_file.name}")
			except Exception as ex:
				UniversalPipelineLogger.log("WARN", f"Could not sync locales during promotion: {ex}")

		# --- 4. Reset staging_buffer.json to clean 0-delta buffer ---
		reset_buffer = {
			"_meta": {
				"city": city_id,
				"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
				"status": "buffer_promoted_and_reset",
				"summary": {
					"total_delta_stations": 0,
					"new_graph_stations": 0,
					"new_lines": 0,
					"has_new_transfers": False,
					"has_new_fare_rules": False
				}
			},
			"transit_network": {
				"stations": {},
				"lines": {},
				"transfers": {},
				"fareRules": {}
			},
			"station_details": {},
			"locales": {
				"en": {"stations": {}},
				"hi": {"stations": {}}
			}
		}
		UniversalFileSystemManager.save_atomic_tab_json(staging_file, reset_buffer)
		UniversalPipelineLogger.log("DONE", f"Staging buffer {staging_file.name} reset to clean state.")
		return True
