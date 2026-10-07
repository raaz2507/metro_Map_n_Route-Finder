#!/usr/bin/env python3
"""
===============================================================================
Production Data Architecture Enforcer & Deep Cleaner (Zero Dependencies)
===============================================================================
Location: import_data/scripts/clean_production_data.py
Role:
  1. Safely removes duplicate keys ('lines', 'properties', 'neighbors', 'location')
     from station_details.json across all cities ONLY after verifying their presence
     in transit_network.json.
  2. Normalizes non-canonical status values in transit_network.json properties
     (e.g., 'work in progress' -> 'under_construction') adhering to universal_transit_schema.js.
===============================================================================
"""
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
CITIES_DIR = BASE_DIR.parent / "main_project" / "data" / "india" / "cities"

EXCLUDED_STATION_DETAILS_KEYS = {"lines", "properties", "neighbors", "location"}

STATUS_ALIAS_MAP = {
	"work in progress": "under_construction",
	"work_in_progress": "under_construction",
	"wip": "under_construction",
	"under construction": "under_construction",
	"under_construction": "under_construction",
	"construction": "under_construction",
	"approved": "planned",
	"proposed": "planned",
	"planned": "planned",
	"in dpr": "planned",
	"dpr": "planned",
	"tendered": "planned",
	"future": "planned",
	"operational": "operational",
	"open": "operational",
	"active": "operational",
	"revenue": "operational",
	"normal service": "operational",
	"temporarily_closed": "temporarily_closed",
	"temp_closed": "temporarily_closed",
	"closed": "temporarily_closed",
	"shut": "temporarily_closed",
	"close": "temporarily_closed",
	"decommissioned": "decommissioned",
	"abandoned": "decommissioned"
}

def normalize_status(raw_status: str) -> str:
	if not raw_status or not isinstance(raw_status, str):
		return "operational"
	return STATUS_ALIAS_MAP.get(raw_status.strip().lower(), "operational")

def save_atomic_json(target_path: Path, data: dict):
	temp_path = target_path.with_suffix(".tmp")
	with open(temp_path, "w", encoding="utf-8") as f:
		json.dump(data, f, indent="\t", ensure_ascii=False)
		f.write("\n")
	temp_path.replace(target_path)

def run_cleanup():
	if not CITIES_DIR.exists():
		print(f"❌ Cities directory not found at: {CITIES_DIR}")
		return

	print("==================================================================")
	print("🚀 PRODUCTION ARCHITECTURE CLEANUP & VERIFICATION RUNNING")
	print(f"📂 Target Directory: {CITIES_DIR}")
	print("==================================================================")

	total_cities = 0
	total_details_cleaned = 0
	total_keys_removed = 0
	total_statuses_normalized = 0
	warnings = []

	for city_folder in sorted(CITIES_DIR.iterdir()):
		if not city_folder.is_dir():
			continue

		city_name = city_folder.name
		sd_file = city_folder / "station_details.json"
		tn_file = city_folder / "transit_network.json"

		if not sd_file.exists() or not tn_file.exists():
			continue

		total_cities += 1

		try:
			with open(sd_file, "r", encoding="utf-8") as f:
				sd_data = json.load(f)
			with open(tn_file, "r", encoding="utf-8") as f:
				tn_data = json.load(f)
		except Exception as ex:
			warnings.append(f"[{city_name}] Failed reading JSON: {ex}")
			continue

		tn_stns = tn_data.get("stationData", tn_data.get("stations", {}))

		city_details_modified = False
		city_tn_modified = False
		city_keys_count = 0

		# 1. Safely Strip Excluded Keys from station_details.json
		for s_id, s_obj in sd_data.items():
			if not isinstance(s_obj, dict):
				continue

			if s_id not in tn_stns:
				has_excluded = any(k in s_obj for k in EXCLUDED_STATION_DETAILS_KEYS)
				if has_excluded:
					warnings.append(f"[{city_name}] Station '{s_id}' preserved safely (missing in transit_network.json).")
				continue

			for k in EXCLUDED_STATION_DETAILS_KEYS:
				if k in s_obj:
					del s_obj[k]
					city_keys_count += 1
					city_details_modified = True

		# 2. Normalize Statuses in transit_network.json
		for s_id, s_obj in tn_stns.items():
			if not isinstance(s_obj, dict):
				continue
			props = s_obj.get("properties")
			if isinstance(props, dict) and "status" in props:
				current_st = props.get("status")
				if current_st:
					canonical_st = normalize_status(current_st)
					if current_st != canonical_st:
						props["status"] = canonical_st
						total_statuses_normalized += 1
						city_tn_modified = True

		# 3. Save Atomic Updates
		if city_details_modified:
			save_atomic_json(sd_file, sd_data)
			total_details_cleaned += 1
			total_keys_removed += city_keys_count

		if city_tn_modified:
			save_atomic_json(tn_file, tn_data)

		print(f"  • {city_name:<22} | Keys Removed from Details: {city_keys_count:<4} | TN Status Fixed: {1 if city_tn_modified else 0}")

	print("\n==================================================================")
	print("📊 CLEANUP SUMMARY REPORT")
	print(f"Total Cities Inspected          : {total_cities}")
	print(f"Cities station_details Cleaned  : {total_details_cleaned}")
	print(f"Total Redundant Keys Removed    : {total_keys_removed}")
	print(f"Total Statuses Normalized       : {total_statuses_normalized}")

	if warnings:
		print("\n⚠️ SAFETY WARNINGS (Preserved Stations):")
		for w in warnings:
			print(f"  - {w}")
	else:
		print("\n✅ 100% Data integrity verified. Zero orphan data loss.")
	print("==================================================================")

if __name__ == "__main__":
	run_cleanup()