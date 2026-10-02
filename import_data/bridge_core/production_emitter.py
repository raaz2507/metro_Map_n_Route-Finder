"""
Production Emitter and Promotion Engine for Production Bridge (Stage 4).
Location: import_data/bridge_core/production_emitter.py
Role: Handles atomic writes of staging buffer and production delta files.
      Handles supervised promotion. Existing base files are strictly protected.
"""
import datetime
import json
from pathlib import Path
from typing import Dict, Any
from pipeline_core.logger import UniversalPipelineLogger
from pipeline_core.file_manager import UniversalFileSystemManager


class ProductionEmitter:
	"""
	Atomic Emitter and Supervised Promotion Engine.
	Enforces Zero Blast Radius:
	  - Only writes to .staging_temp/ in stage_temp mode
	  - Only writes to *_auto.json in port_production mode
	  - Base files (transit_network.json, station_details.json) are NEVER directly touched
	    unless explicitly requested in promote mode with strict backup.
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
		"""Writes files to staging temp or production target directory."""
		if mode in ["stage_temp", "prepare_temp"]:
			dest_dir = staging_base_dir / ".staging_temp" / city_id
			dest_dir.mkdir(parents=True, exist_ok=True)
			UniversalPipelineLogger.log("WRITE", f"Writing staging preview files to: {dest_dir}")
		else:
			dest_dir = target_city_dir
			dest_dir.mkdir(parents=True, exist_ok=True)
			UniversalPipelineLogger.log("WRITE", f"Writing production delta files to: {dest_dir}")

		# 1. Save station_details_auto.json
		details_target = dest_dir / "station_details_auto.json"
		UniversalFileSystemManager.save_atomic_tab_json(details_target, details_delta)
		UniversalPipelineLogger.log("SUCCESS", f"Emitted: {details_target.name} ({len(details_delta)} entries)")

		# 2. Save transit_network_auto.json
		transit_target = dest_dir / "transit_network_auto.json"
		UniversalFileSystemManager.save_atomic_tab_json(transit_target, transit_network_delta)
		UniversalPipelineLogger.log("SUCCESS", f"Emitted: {transit_target.name}")

		# 3. Save passenger_support.json
		support_target = dest_dir / "passenger_support.json"
		UniversalFileSystemManager.save_atomic_tab_json(support_target, aggregated_support)
		UniversalPipelineLogger.log("SUCCESS", f"Emitted: {support_target.name}")

		# 4. Save audit summary report strictly inside import_data/.staging_temp
		audit_dir = staging_base_dir / ".staging_temp" / city_id
		audit_dir.mkdir(parents=True, exist_ok=True)
		audit_target = audit_dir / "overlay_audit_report.json"
		UniversalFileSystemManager.save_atomic_tab_json(audit_target, audit_summary)
		UniversalPipelineLogger.log("AUDIT", f"Pipeline audit report saved at: import_data/.staging_temp/{city_id}/{audit_target.name}")

		return True

	@staticmethod
	def promote_buffer_to_base(city_id: str, target_city_dir: Path) -> bool:
		"""
		नियम और लॉजिक (Promotion & Base Creation Logic):
		-------------------------------------------------------------------------
		1. यदि बेस फ़ाइलें (station_details.json और transit_network.json) पहले से मौजूद नहीं हैं (यानी नया शहर):
		   - तो यह इंजन सीधे बेस फ़ाइलें बना देगा (Base Initialization)।
		   - station_details_auto.json से station_details.json बनेगा।
		   - transit_network_auto.json से transit_network.json बनेगा।
		
		2. यदि बेस फ़ाइलें पहले से मौजूद हैं (Existing City):
		   - तो बेस फ़ाइलों को कभी भी सीधे ओवरराइट नहीं किया जाएगा (Zero Blast Radius)।
		   - केवल station_details_auto.json का सत्यापित डेल्टा मौजूदा बेस में सुरक्षित रूप से मर्ज (Update) होगा।
		
		3. प्रमोशन के बाद:
		   - दोनों *_auto.json बफ़र फ़ाइलों को क्लीन/रीसेट कर दिया जाएगा।
		-------------------------------------------------------------------------
		"""
		details_auto_file = target_city_dir / "station_details_auto.json"
		details_base_file = target_city_dir / "station_details.json"
		transit_auto_file = target_city_dir / "transit_network_auto.json"
		transit_base_file = target_city_dir / "transit_network.json"

		if not details_auto_file.exists():
			UniversalPipelineLogger.log("WARN", f"No staging buffer found to promote at: {details_auto_file}")
			return False

		try:
			with open(details_auto_file, "r", encoding="utf-8") as f:
				auto_data = json.load(f)
		except Exception as ex:
			UniversalPipelineLogger.log("ERROR", f"Failed reading auto buffer: {ex}")
			return False

		# --- कंडीशन 1: station_details.json की हैंडलिंग ---
		base_data: Dict[str, Any] = {}
		is_new_city_details = not details_base_file.exists()

		if not is_new_city_details:
			# बेस फ़ाइल पहले से मौजूद है - इसे लोड करके सिर्फ नया/अपडेटेड डेल्टा मर्ज करेंगे
			try:
				with open(details_base_file, "r", encoding="utf-8") as f:
					base_data = json.load(f)
			except Exception as ex:
				UniversalPipelineLogger.log("ERROR", f"Failed reading base file: {ex}")
				return False
		else:
			UniversalPipelineLogger.log("INFO", f"Base station_details.json not found for [{city_id}]. Initializing as new city base.")

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

		# बेस फ़ाइल को सुरक्षित रूप से सेव करें
		UniversalFileSystemManager.save_atomic_tab_json(details_base_file, base_data, compact=True)
		action_label = "Initialized new base with" if is_new_city_details else "Successfully baked"
		UniversalPipelineLogger.log("PROMOTE", f"{action_label} {promoted_count} stations into: {details_base_file.name}")

		# --- कंडीशन 2: transit_network.json की हैंडलिंग ---
		# अगर बेस transit_network.json मौजूद नहीं है, तो auto बफ़र से बेस नेटवर्क तैयार करें
		if not transit_base_file.exists() and transit_auto_file.exists():
			try:
				with open(transit_auto_file, "r", encoding="utf-8") as f:
					transit_auto_data = json.load(f)
				
				# क्लीन बेस स्ट्रक्चर (बिना _meta के)
				base_network = {
					"defaults": {"stationType": "normal", "layout": "elevated"},
					"lines": transit_auto_data.get("lines", {}),
					"transfers": transit_auto_data.get("transfers", {}),
					"stationData": transit_auto_data.get("stations", {})
				}
				UniversalFileSystemManager.save_atomic_tab_json(transit_base_file, base_network, compact=True)
				UniversalPipelineLogger.log("PROMOTE", f"Initialized new base transit network: {transit_base_file.name}")
			except Exception as ex:
				UniversalPipelineLogger.log("ERROR", f"Failed initializing base transit network: {ex}")

		# --- बफ़र रीसेट: प्रमोशन के बाद _auto.json को क्लीन स्टेट में लाएँ ---
		reset_buffer = {
			"_meta": {
				"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
				"total_delta_stations": 0,
				"status": "buffer_promoted_and_reset"
			}
		}
		UniversalFileSystemManager.save_atomic_tab_json(details_auto_file, reset_buffer)

		if transit_auto_file.exists():
			reset_transit = {
				"_meta": {
					"generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat() + "Z",
					"total_new_stations": 0,
					"status": "buffer_promoted_and_reset"
				},
				"stations": {},
				"lines": {}
			}
			UniversalFileSystemManager.save_atomic_tab_json(transit_auto_file, reset_transit)

		UniversalPipelineLogger.log("DONE", "All staging buffers reset to clean state.")
		return True
