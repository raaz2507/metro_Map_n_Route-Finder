#!/usr/bin/env python3
"""
================================================================================
Structure Factory Registry (Stage 3 Master Architecture)
================================================================================
Location: import_data_new/structures/__init__.py
Role    : Enterprise Factory registering transit master structurers by network ID
================================================================================
"""

from typing import Optional
from .ncrtc_structure import NCRTCStructure
from .dmrc_structure import DMRCStructure
from .mumbai_structure import MumbaiStructure
from .nmrc_structure import NMRCStructure



class StructureFactory:
	"""Enterprise Factory registering transit master structurers by network ID."""
	_REGISTRY = {
		"ncrtc_rrts": NCRTCStructure,
		"dmrc_delhi": DMRCStructure,
		"mumbai_metro": MumbaiStructure,
		"nmrc_noida": NMRCStructure,
	}
	@classmethod
	def get_structure(cls, network_id: str):
		"""Returns an instantiated structurer plugin for the given network ID."""
		structure_cls = cls._REGISTRY.get(network_id)
		if not structure_cls:
			raise NotImplementedError(
				f"No Stage 3 Master Structurer registered for network '{network_id}'. "
				f"Available structurers: {list(cls._REGISTRY.keys())}"
			)
		return structure_cls()