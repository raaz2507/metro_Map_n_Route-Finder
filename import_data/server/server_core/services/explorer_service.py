"""
City Data Explorer Service (OOP)
Location: import_data/server_core/services/explorer_service.py
"""
import json
from pathlib import Path
from typing import Dict, Any, List
from ..config import PROJECT_ROOT, CITY_DATA_ALLOWED_FILES, VALID_CITY_SLUGS


class CityExplorerService:
	"""
	Safe OOP Service providing read-only whitelisted access to main_project city JSON files.
	Protects against arbitrary path traversal attacks.
	"""

	@classmethod
	def list_cities(cls) -> List[Dict[str, Any]]:
		"""Returns list of discoverable cities in main_project data directory."""
		cities_base = PROJECT_ROOT / "main_project" / "data" / "india" / "cities"
		if not cities_base.exists():
			return []

		found = []
		for entry in sorted(cities_base.iterdir()):
			if entry.is_dir() and not entry.name.startswith("."):
				found.append({
					"slug": entry.name,
					"name": entry.name.replace("_", " ").title(),
					"has_transit_network": (entry / "transit_network.json").exists(),
					"has_station_details": (entry / "station_details.json").exists(),
					"has_passenger_support": (entry / "passenger_support.json").exists(),
				})
		return found

	@classmethod
	def get_file_content(cls, city: str, file_name: str) -> Dict[str, Any]:
		"""Safely reads whitelisted JSON file from specified city directory."""
		if city not in VALID_CITY_SLUGS:
			raise ValueError(f"Unknown or unauthorized city '{city}'")

		if file_name not in CITY_DATA_ALLOWED_FILES:
			raise ValueError(f"File '{file_name}' not allowed. Must be one of: {', '.join(sorted(CITY_DATA_ALLOWED_FILES))}")

		target_file = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / city / file_name
		if not target_file.exists():
			raise FileNotFoundError(f"File '{file_name}' not found for city '{city}'")

		with open(target_file, "r", encoding="utf-8") as f:
			data = json.load(f)

		return {
			"city": city,
			"file": file_name,
			"data": data
		}