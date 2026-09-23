"""
================================================================================
Universal Transit Fare Schema Engine
================================================================================
Location: pipeline_core/fare_schema.py
Role    : Single Source of Truth for Transit Fare Schema Specification.
Contract: Zero-Data, Pure Validation & Packaging. Conforms to universal_transit_schema.js.
================================================================================
"""

from typing import Dict, Any, Optional, List


class UniversalFareSchema:
	"""Central Factory & Packaging Envelope for Universal Transit Fare Rules."""

	VERSION = "1.0"
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
		stations: Optional[List[str]] = None,
		fare_matrix: Optional[List[List[int]]] = None,
		fare_tables: Optional[Dict[str, List[Dict[str, Any]]]] = None,
		calculation: Optional[Dict[str, str]] = None,
		coach_classes: Optional[Dict[str, Any]] = None,
		products: Optional[Dict[str, Any]] = None,
		time_rules: Optional[Dict[str, Any]] = None
	) -> Dict[str, Any]:
		"""Constructs a normalized policy dictionary."""
		policy: Dict[str, Any] = {
			"network": network_ref,
			"fareModel": fare_model
		}
		if stations:
			policy["stations"] = stations
		if fare_matrix:
			policy["fareMatrix"] = fare_matrix
		if calculation:
			policy["calculation"] = calculation
		if fare_tables:
			policy["fareTables"] = fare_tables
		if coach_classes:
			policy["coachClasses"] = coach_classes
		if products:
			policy["products"] = products
		if time_rules:
			policy["timeRules"] = time_rules
		return policy