"""
Multi-Operator Passenger Support & Helpline Aggregator.
Location: import_data/pipeline/stage4_bridge/bridge_core/helpline_aggregator.py
Role: Combines passenger_support.json files into a single document, prioritizing verified production base.
"""
import datetime
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
from pipeline.core.logger import UniversalPipelineLogger


class PassengerSupportAggregator:
	"""
	Aggregates multi-agency passenger support files into a unified,
	non-lossy city support document with emergency contacts.
	Prioritizes verified production base over raw stage-1 intake.
	"""

	@staticmethod
	def aggregate(city_id: str, city_name: str, networks: List[Dict[str, Any]], target_city_dir: Optional[Path] = None) -> Dict[str, Any]:
		"""Merges passenger_support files, preserving authentic production base if available."""
		# 1. Priority 1: Check existing verified production base
		if target_city_dir:
			prod_support_file = target_city_dir / "passenger_support.json"
			if prod_support_file.exists():
				try:
					with open(prod_support_file, "r", encoding="utf-8") as pf:
						prod_data = json.load(pf)
					has_verified_data = any(
						bool(n.get("helplines") or n.get("portals"))
						for n in prod_data.get("networks", {}).values()
						if isinstance(n, dict)
					)
					if has_verified_data:
						UniversalPipelineLogger.log("SUPPORT", f"Loaded authentic passenger_support.json from production base for {city_id}")
						return prod_data
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Could not read base passenger_support.json: {ex}")

		# 2. Priority 2: Merge from individual network files
		iso_today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
		aggregated: Dict[str, Any] = {
			"city": city_id,
			"city_name": city_name,
			"last_updated": iso_today,
			"emergency": {
				"police_emergency": "112",
				"women_safety": "1090",
				"ambulance": "108"
			},
			"networks": {}
		}

		for net in networks:
			net_key = net["network_key"]
			supp_path = net.get("support_file")
			if supp_path and supp_path.exists():
				try:
					with open(supp_path, "r", encoding="utf-8") as f:
						supp_data = json.load(f)

					aggregated["networks"][net_key] = {
						"network_name": supp_data.get("network_name", net["name"]),
						"operator": net.get("operator", ""),
						"helplines": supp_data.get("helplines", {}),
						"portals": supp_data.get("portals", {}),
						"facilities": supp_data.get("facilities", {})
					}
				except Exception as ex:
					UniversalPipelineLogger.log("WARN", f"Could not read support file for {net_key}: {ex}")
			else:
				aggregated["networks"][net_key] = {
					"network_name": net["name"],
					"operator": net.get("operator", ""),
					"helplines": {},
					"portals": {},
					"facilities": {}
				}

		return aggregated
