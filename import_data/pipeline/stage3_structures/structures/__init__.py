#!/usr/bin/env python3
"""
================================================================================
Structure Factory Registry (Stage 3 Master Architecture)
================================================================================
Location: import_data/structures/__init__.py
Role    : Enterprise Factory registering transit master structurers by network ID
================================================================================
"""

from typing import Optional
from .ncrtc_structure import NCRTCStructure
from .dmrc_structure import DMRCStructure
from .mumbai_structure import MumbaiStructure
from .nmrc_structure import NMRCStructure
from .namma_structure import NammaStructure
from .kolkata_structure import KolkataStructure
from .hyderabad_structure import HyderabadStructure
from .chennai_structure import ChennaiStructure
from .kochi_structure import KochiStructure
from .ahmedabad_structure import AhmedabadStructure
from .pune_structure import PuneStructure
from .nagpur_structure import NagpurStructure
from .lucknow_structure import LucknowStructure
from .kanpur_structure import KanpurStructure
from .agra_structure import AgraStructure
from .jaipur_structure import JaipurStructure
from .indore_structure import IndoreStructure
from .bhopal_structure import BhopalStructure
from .navi_mumbai_structure import NaviMumbaiStructure
from .mumbai_monorail_structure import MumbaiMonorailStructure
from .rapid_metro_structure import RapidMetroStructure


class StructureFactory:
	"""Enterprise Factory registering transit master structurers by network ID."""
	_REGISTRY = {
		"ncrtc_rrts": NCRTCStructure,
		"dmrc_delhi": DMRCStructure,
		"rapid_metro_gurugram": RapidMetroStructure,
		"mumbai_metro": MumbaiStructure,
		"nmrc_noida": NMRCStructure,
		"namma_metro": NammaStructure,
		"kolkata_metro": KolkataStructure,
		"hyderabad_metro": HyderabadStructure,
		"chennai_metro": ChennaiStructure,
		"kochi_metro": KochiStructure,
		"ahmedabad_metro": AhmedabadStructure,
		"pune_metro": PuneStructure,
		"nagpur_metro": NagpurStructure,
		"lucknow_metro": LucknowStructure,
		"kanpur_metro": KanpurStructure,
		"agra_metro": AgraStructure,
		"jaipur_metro": JaipurStructure,
		"indore_metro": IndoreStructure,
		"bhopal_metro": BhopalStructure,
		"navi_mumbai_metro": NaviMumbaiStructure,
		"mumbai_monorail": MumbaiMonorailStructure,
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