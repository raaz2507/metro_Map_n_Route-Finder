"""
================================================================================
Universal Transit Fare Schema Engine
================================================================================
Location: import_data/pipeline/core/fare_schema.py
Role    : Single Source of Truth for Transit Fare Schema Specification.
Contract: Zero-Data, Pure Validation & Packaging. Conforms to universal_transit_schema.js.
================================================================================
"""

from typing import Dict, Any, Optional, List


class UniversalFareSchema:
	"""Central Factory & Packaging Envelope for Universal Transit Fare Rules."""

	VERSION = "4.0"
	DEFAULT_CURRENCY = "INR"

	@classmethod
	def build(
		cls,
		networks: Dict[str, Any],
		policies: Dict[str, Any],
		currency: str = DEFAULT_CURRENCY,
		version: str = VERSION
	) -> Dict[str, Any]:
		"""Wraps network operators and policies into canonical schema envelope."""
		return {
			"version": version,
			"currency": currency,
			"networks": networks or {},
			"policies": policies or {}
		}

	@classmethod
	def create_policy(
		cls,
		network_ref: str,
		fare_model: str,
		effective_from: Optional[str] = None,
		recharge_url: str = "",
		stations: Optional[List[str]] = None,
		fare_matrix: Optional[List[List[int]]] = None,
		fare_tables: Optional[Dict[str, List[Dict[str, Any]]]] = None,
		calculation: Optional[Dict[str, str]] = None,
		coach_classes: Optional[Dict[str, Any]] = None,
		products: Optional[Dict[str, Any]] = None,
		time_rules: Optional[Dict[str, Any]] = None,
		station_stay_rules: Optional[Dict[str, Any]] = None
	) -> Dict[str, Any]:
		"""Constructs a normalized policy dictionary matching universal transit schema v4.0."""
		policy: Dict[str, Any] = {
			"network": network_ref,
			"fareModel": fare_model,
			"rechargeUrl": recharge_url if recharge_url is not None else ""
		}
		if effective_from:
			policy["effectiveFrom"] = effective_from
		if calculation:
			policy["calculation"] = calculation
		if fare_tables:
			policy["fareTables"] = fare_tables
		if stations:
			policy["stations"] = stations
		if fare_matrix:
			policy["fareMatrix"] = fare_matrix
		if coach_classes:
			policy["coachClasses"] = coach_classes
		if products:
			# Ensure language neutrality: strip inline label dictionaries
			cleaned_products = {}
			for p_key, p_val in products.items():
				if isinstance(p_val, dict):
					p_copy = dict(p_val)
					if "label" in p_copy and isinstance(p_copy["label"], dict):
						del p_copy["label"]
					if p_key == "smart_card" and "rechargeUrl" not in p_copy:
						p_copy["rechargeUrl"] = recharge_url if recharge_url is not None else ""
					cleaned_products[p_key] = p_copy
				else:
					cleaned_products[p_key] = p_val
			policy["products"] = cleaned_products
		if time_rules:
			policy["timeRules"] = time_rules
		if station_stay_rules:
			policy["stationStayRules"] = station_stay_rules
		return policy