#!/usr/bin/env python3
"""
================================================================================
Fare Adapter Registry & Factory Engine
================================================================================
Location: fare_adapters/__init__.py
Role    : Dynamic routing and factory pattern dispatcher for fare adapters.
================================================================================
"""

from typing import Dict, Type
from pipeline_core.logger import UniversalPipelineLogger
from .base_fare_adapter import BaseFareAdapter
from .nmrc_fare_adapter import NMRCFareAdapter
from .mumbai_fare_adapter import MumbaiFareAdapter
from .ncrtc_fare_adapter import NCRTCFareAdapter
from .dmrc_fare_adapter import DMRCFareAdapter


class FareAdapterFactory:
	"""Central Factory for instantiating transit fare adapters."""

	_registry: Dict[str, Type[BaseFareAdapter]] = {
		"nmrc_noida": NMRCFareAdapter,
		"mumbai_metro": MumbaiFareAdapter,
		"ncrtc_rrts": NCRTCFareAdapter,
		"dmrc_delhi": DMRCFareAdapter,
	}

	@classmethod
	def register(cls, network_id: str, adapter_cls: Type[BaseFareAdapter]):
		"""Registers a fare adapter class for a specific network_id."""
		cls._registry[network_id] = adapter_cls

	@classmethod
	def get_adapter(cls, network_id: str) -> BaseFareAdapter:
		"""Resolves and instantiates the registered adapter for the network."""
		adapter_cls = cls._registry.get(network_id)
		if not adapter_cls:
			available = list(cls._registry.keys())
			UniversalPipelineLogger.log(
				"ERROR",
				f"No fare adapter registered for '{network_id}'. Active adapters: {available}"
			)
			raise NotImplementedError(
				f"Fare adapter for '{network_id}' is not yet implemented or registered."
			)
		return adapter_cls()


__all__ = [
	"BaseFareAdapter",
	"FareAdapterFactory",
	"NMRCFareAdapter",
	"MumbaiFareAdapter",
	"NCRTCFareAdapter",
	"DMRCFareAdapter"
]