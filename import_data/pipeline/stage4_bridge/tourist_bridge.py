#!/usr/bin/env python3
"""
================================================================================
🏛️ Tourist Places Production Bridge (Stage 4 Universal Pipeline)
================================================================================
Location : import_data/pipeline/stage4_bridge/tourist_bridge.py
Role     : Ingests ground-truth tourist source datasets from import_data/data/tourist_places/
           Validates coordinates & authentic metadata.
           Emits production compact datasets and bilingual locales into main_project/.
Contract : Zero-data-loss, pure UTF-8, atomic safe writes, no temporary scripts.
================================================================================
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any, List, Optional

SCRIPT_DIR = Path(__file__).resolve().parent
IMPORT_DATA_DIR = SCRIPT_DIR.parent.parent
PROJECT_ROOT = IMPORT_DATA_DIR.parent

if str(IMPORT_DATA_DIR) not in sys.path:
	sys.path.insert(0, str(IMPORT_DATA_DIR))
if str(SCRIPT_DIR) not in sys.path:
	sys.path.insert(0, str(SCRIPT_DIR))

from pipeline.core.logger import UniversalPipelineLogger
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.core.compact_serializer import UniversalCompactJSONSerializer


class TouristPlacesBridge:
	"""
	Permanent Stage 4 Bridge Engine for Tourist Places Datasets.
	"""

	def __init__(self):
		self.base_dir = IMPORT_DATA_DIR
		self.project_root = PROJECT_ROOT
		self.prod_data_dir = self.project_root / "main_project" / "data" / "india" / "cities"
		self.locales_en_dir = self.project_root / "main_project" / "locales" / "en" / "india"
		self.locales_hi_dir = self.project_root / "main_project" / "locales" / "hi" / "india"

	def validate_place(self, place: Dict[str, Any], idx: int) -> bool:
		"""Validates schema and coordinates of a tourist place."""
		pid = place.get("id")
		if not pid or not isinstance(pid, str):
			UniversalPipelineLogger.log("ERROR", f"Place #{idx} missing valid 'id'")
			return False

		coords = place.get("coordinates")
		if not coords or not isinstance(coords, list) or len(coords) < 2:
			UniversalPipelineLogger.log("ERROR", f"Place '{pid}' has invalid coordinates: {coords}")
			return False

		lat, lon = coords[0], coords[1]
		if not (8.0 <= lat <= 38.0 and 68.0 <= lon <= 98.0):
			UniversalPipelineLogger.log("WARN", f"Place '{pid}' coordinates [{lat}, {lon}] fall outside India bounds!")

		category = place.get("category")
		if not category:
			UniversalPipelineLogger.log("WARN", f"Place '{pid}' missing 'category'")

		return True

	def sync_city(self, city_id: str) -> bool:
		"""Synchronizes a city's tourist source data to main_project production files."""
		clean_city = (city_id or "").strip().lower()
		UniversalPipelineLogger.log("INIT", f"Syncing tourist places for city: '{clean_city}'")

		source = UniversalFileSystemManager.load_tourist_source_json(clean_city)
		if not source:
			source_path = UniversalFileSystemManager.get_tourist_source_path(clean_city)
			UniversalPipelineLogger.log("ERROR", f"Source file not found at: {source_path}")
			return False

		raw_places: List[Dict[str, Any]] = source.get("places", [])
		if not raw_places:
			UniversalPipelineLogger.log("WARN", f"No places found in source file for '{clean_city}'")
			return False

		core_places: List[Dict[str, Any]] = []
		en_places: Dict[str, Any] = {}
		hi_places: Dict[str, Any] = {}

		for i, p in enumerate(raw_places):
			if not self.validate_place(p, i):
				continue

			pid = p["id"]

			# 1. Build Core Place (No localization text)
			core_p = {
				"id": pid,
				"category": p.get("category", "heritage"),
				"coordinates": p.get("coordinates", [0.0, 0.0]),
				"timings": p.get("timings", {"open": "09:00", "close": "18:00", "all_day": False, "closed_on": []}),
				"entry_fee": p.get("entry_fee", {"is_free": True, "amount": 0, "currency": "INR"}),
				"google_maps_url": p.get("google_maps_url", None),
				"image_path": p.get("image_asset") or f"transit_assets/tourist_places/{clean_city}/{pid}.webp",
				"tags": p.get("tags", []),
				"recommended_time_min": p.get("recommended_time_min", 60)
			}
			core_places.append(core_p)

			# 2. English Locale
			en_data = p.get("en", {})
			en_places[pid] = {
				"name": en_data.get("name", pid.replace("_", " ").title()),
				"description": en_data.get("description", ""),
				"best_time_to_visit": en_data.get("best_time_to_visit", "October to March")
			}

			# 3. Hindi Locale
			hi_data = p.get("hi", {})
			hi_places[pid] = {
				"name": hi_data.get("name", en_places[pid]["name"]),
				"description": hi_data.get("description", en_places[pid]["description"]),
				"best_time_to_visit": hi_data.get("best_time_to_visit", "अक्टूबर से मार्च")
			}

		# --- Output Production Datasets ---
		city_target_dir = self.prod_data_dir / clean_city
		city_target_dir.mkdir(parents=True, exist_ok=True)
		self.locales_en_dir.mkdir(parents=True, exist_ok=True)
		self.locales_hi_dir.mkdir(parents=True, exist_ok=True)

		# 1. Main Core Dataset
		prod_core_data = {
			"city": clean_city,
			"version": "1.0",
			"total_places": len(core_places),
			"places": core_places
		}
		core_file = city_target_dir / "tourist_places.json"
		UniversalFileSystemManager.save_atomic_tab_json(core_file, prod_core_data, compact=True)
		UniversalPipelineLogger.log("SUCCESS", f"Wrote {len(core_places)} places to: {core_file}")

		# 2. English Locales
		prod_en_data = {
			"city": clean_city,
			"places": en_places
		}
		en_file = self.locales_en_dir / f"{clean_city}_tourist_places_locale.json"
		UniversalFileSystemManager.save_atomic_tab_json(en_file, prod_en_data, compact=False)
		UniversalPipelineLogger.log("SUCCESS", f"Wrote EN locales to: {en_file}")

		# 3. Hindi Locales
		prod_hi_data = {
			"city": clean_city,
			"places": hi_places
		}
		hi_file = self.locales_hi_dir / f"{clean_city}_tourist_places_locale.json"
		UniversalFileSystemManager.save_atomic_tab_json(hi_file, prod_hi_data, compact=False)
		UniversalPipelineLogger.log("SUCCESS", f"Wrote HI locales to: {hi_file}")

		return True

	def sync_all_available(self) -> None:
		"""Scans tourist_places folder and syncs all discovered cities."""
		tourist_dir = self.base_dir / "data" / "tourist_places"
		if not tourist_dir.exists():
			UniversalPipelineLogger.log("WARN", "No tourist_places directory found.")
			return

		for cdir in tourist_dir.iterdir():
			if cdir.is_dir():
				source_file = cdir / f"{cdir.name}_tourist_places_source.json"
				if source_file.exists():
					self.sync_city(cdir.name)


def main():
	parser = argparse.ArgumentParser(description="Stage 4 Tourist Places Production Bridge")
	parser.add_argument("--city", type=str, help="Target city key (e.g. chennai)")
	parser.add_argument("--all", action="store_true", help="Sync all available cities")
	args = parser.parse_args()

	bridge = TouristPlacesBridge()
	if args.city:
		success = bridge.sync_city(args.city)
		sys.exit(0 if success else 1)
	elif args.all:
		bridge.sync_all_available()
	else:
		parser.print_help()


if __name__ == "__main__":
	main()
