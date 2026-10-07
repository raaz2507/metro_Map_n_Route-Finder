"""
Multi-Operator Passenger Support & Helpline Aggregator.
Location: import_data/bridge_core/helpline_aggregator.py
Role: Combines passenger_support.json files from multiple operators in a city into a single document.
"""
import datetime
import json
from typing import Dict, Any, List
from pipeline.core.logger import UniversalPipelineLogger


class PassengerSupportAggregator:
	"""
	Aggregates multi-agency passenger support files into a unified,
	non-lossy city support document with emergency contacts.
	"""

	@staticmethod
	def aggregate(city_id: str, city_name: str, networks: List[Dict[str, Any]]) -> Dict[str, Any]:
		"""Merges individual passenger_support.json files namespaced by network."""
		iso_today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")

		aggregated: Dict[str, Any] = {
			"city": city_id,
			"city_name": city_name,
			"last_updated": iso_today,
			"emergency": {
				"police_emergency": "112",
				"women_safety": "1090",
				"ambulance": "102"
			},
			"networks": {}
		}

		for net in networks:
			net_key = net["network_key"]
			supp_path = net["support_file"]
			if supp_path.exists():
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
				# Minimal placeholder if support file is pending intake
				aggregated["networks"][net_key] = {
					"network_name": net["name"],
					"operator": net.get("operator", ""),
					"helplines": {},
					"portals": {},
					"facilities": {}
				}

		return aggregated
