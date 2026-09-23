"""
Universal Multi-City Slug & Interchange Reconciler
Location: import_data/pipeline_core/slug_reconciler.py
"""
import re
import json
from pathlib import Path
from typing import Dict, Any, Optional

class UniversalSlugReconciler:
	"""
	Modular, City-Agnostic Station Slug & Interchange Bridge Resolver.
	Dynamically resolves scraping variations and cross-operator interchanges
	without hardcoding any city names in the core pipeline.
	"""

	def __init__(self, city_id: str, base_dir: Path, base_stations: Dict[str, Any]):
		self.city_id = city_id
		self.base_dir = base_dir
		self.base_stations = base_stations
		self.alias_map: Dict[str, str] = {}
		self._load_modular_config()

	def _load_modular_config(self):
		"""Loads city-specific alias registry from import_data/config/slug_aliases/{city_id}.json"""
		config_file = self.base_dir / "config" / "slug_aliases" / f"{self.city_id}.json"
		if config_file.exists():
			try:
				with open(config_file, "r", encoding="utf-8") as f:
					self.alias_map = json.load(f)
			except Exception as ex:
				print(f"[WARN] Failed to load slug alias config for {self.city_id}: {ex}")

	def resolve(self, raw_slug: str) -> str:
		"""
		Resolves any candidate raw slug to the authentic base station slug.
		3-tier resolution:
		  1. Direct match in production base
		  2. Pluggable city alias map
		  3. Universal algorithmic heuristics (roman numerals, common suffixes)
		"""
		if not raw_slug:
			return ""

		# Tier 1: Direct match in base
		if raw_slug in self.base_stations:
			return raw_slug

		# Tier 2: Modular City Alias Mapping
		if raw_slug in self.alias_map:
			mapped = self.alias_map[raw_slug]
			if mapped in self.base_stations:
				return mapped

		# Tier 3: Universal Algorithmic Heuristics (Zero-Config)
		# A. Strip common agency suffixes (_metro_station, _metro)
		clean = raw_slug.replace("_metro_station", "").replace("_metro", "")
		if clean in self.base_stations:
			return clean

		# B. Roman numeral normalizations (_1 -> _i, _2 -> _ii, _3 -> _iii)
		roman_fixed = re.sub(r"_1$", "_i", clean)
		roman_fixed = re.sub(r"_2$", "_ii", roman_fixed)
		roman_fixed = re.sub(r"_3$", "_iii", roman_fixed)
		if roman_fixed in self.base_stations:
			return roman_fixed

		return raw_slug