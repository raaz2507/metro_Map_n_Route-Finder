"""
City and Network Resolver for Production Bridge (Stage 4).
Location: import_data/bridge_core/city_resolver.py
Role: Dynamically reads india_transit_registry.json to discover operational networks and dataset paths.
"""
import json
from pathlib import Path
from typing import Dict, Any, List, Tuple
from pipeline.core.logger import UniversalPipelineLogger


class CityRegistryResolver:
	"""
	Dynamic City & Network Resolver.
	Reads india_transit_registry.json to resolve all operational/partial networks,
	master datasets, and support files for any target city without hardcoding.
	"""

	def __init__(self, base_dir: Path, registry_path: Path):
		self.base_dir = base_dir
		self.registry_path = registry_path
		self._registry: Dict[str, Any] = {}
		self._load_registry()

	def _load_registry(self):
		if not self.registry_path.exists():
			UniversalPipelineLogger.log("ERROR", f"Registry file missing at: {self.registry_path}")
			return
		try:
			with open(self.registry_path, "r", encoding="utf-8") as f:
				self._registry = json.load(f)
		except Exception as ex:
			UniversalPipelineLogger.log("ERROR", f"Failed to parse registry: {ex}")

	def get_all_cities(self) -> List[str]:
		"""Returns all registered city IDs."""
		return list(self._registry.get("cities", {}).keys())

	def get_active_cities(self) -> List[str]:
		"""Returns only cities that have operational or operational_partial networks with stage 3 datasets."""
		active = []
		for c_id, c_data in self._registry.get("cities", {}).items():
			nets = self._get_networks_for_city(c_data)
			if any(net.get("master_exists") for net in nets):
				active.append(c_id)
		return active

	def resolve_city_info(self, city_or_network: str) -> Tuple[str, str, List[Dict[str, Any]]]:
		"""
		Resolves city_id, city_name, and registered networks metadata.
		Accepts either a city_id (e.g. 'delhi_ncr', 'lucknow') or a network_id (e.g. 'dmrc_delhi').
		"""
		clean_target = (city_or_network or "delhi_ncr").strip().lower()
		cities = self._registry.get("cities", {})

		# Scenario A: Exact city match
		if clean_target in cities:
			city_id = clean_target
			city_data = cities[clean_target]
			return city_id, city_data.get("name", city_id), self._get_networks_for_city(city_data)

		# Scenario B: Target is a network_id -> resolve its parent city
		for c_id, c_data in cities.items():
			nets = c_data.get("networks", {})
			for n_key, n_val in nets.items():
				if n_key.lower() == clean_target or n_val.get("dataPath", "").endswith(f"{clean_target}_data"):
					return c_id, c_data.get("name", c_id), self._get_networks_for_city(c_data)

		# Scenario C: Target contains city name substring
		for c_id, c_data in cities.items():
			if c_id in clean_target or clean_target in c_id:
				return c_id, c_data.get("name", c_id), self._get_networks_for_city(c_data)

		# Fallback: Default to delhi_ncr
		default_city = "delhi_ncr"
		c_data = cities.get(default_city, {})
		return default_city, c_data.get("name", "Delhi NCR"), self._get_networks_for_city(c_data)

	def _get_networks_for_city(self, city_data: Dict[str, Any]) -> List[Dict[str, Any]]:
		"""Extracts network records and resolves their authentic stage paths."""
		network_list = []
		for net_key, net_val in city_data.get("networks", {}).items():
			status = net_val.get("status", "operational")
			data_path_str = net_val.get("dataPath", "")

			# Resolve effective folder
			if data_path_str and (data_path_str.endswith("_data") or "_data" in data_path_str):
				folder_name = Path(data_path_str).name
				effective_net_id = folder_name[:-5] if folder_name.endswith("_data") else folder_name
			else:
				effective_net_id = net_key

			# Canonical file locations in data/datasets/ or datasets/
			root_datasets = (self.base_dir / "data" / "datasets") if (self.base_dir / "data" / "datasets").exists() else (self.base_dir / "datasets")
			dataset_dir = root_datasets / f"{effective_net_id}_data"
			master_file = dataset_dir / f"{effective_net_id}_master.json"
			support_file = dataset_dir / "passenger_support.json"

			# Specific network overrides if different in structure
			if not master_file.exists():
				fallback_dir = root_datasets / f"{net_key}_data"
				if (fallback_dir / f"{net_key}_master.json").exists():
					dataset_dir = fallback_dir
					master_file = fallback_dir / f"{net_key}_master.json"
				else:
					alt_details = dataset_dir / f"{effective_net_id[:4]}_station_details.json"
					if alt_details.exists():
						master_file = alt_details

			fare_file = dataset_dir / "fare_rules.json"

			network_list.append({
				"network_key": net_key,
				"effective_net_id": effective_net_id,
				"name": net_val.get("name", net_key),
				"operator": net_val.get("operator", ""),
				"status": status,
				"dataset_dir": dataset_dir,
				"master_file": master_file,
				"support_file": support_file,
				"fare_file": fare_file,
				"master_exists": master_file.exists(),
				"support_exists": support_file.exists(),
				"fare_exists": fare_file.exists()
			})
		return network_list
