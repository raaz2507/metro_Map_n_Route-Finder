#!/usr/bin/env python3
from .dmrc_cleaner import DMRCCleaner
from .ncrtc_cleaner import NCRTCCleaner
from .nmrc_cleaner import NMRCCleaner
from .mumbai_cleaner import MumbaiCleaner

class CleanerFactory:
	"""Enterprise Factory registering transit cleaners by network ID."""

	_REGISTRY = {
		"dmrc_delhi": DMRCCleaner,
		"rapid_metro_gurugram": DMRCCleaner,
		"ncrtc_rrts": NCRTCCleaner,
		"nmrc_noida": NMRCCleaner,
		"mumbai_metro": MumbaiCleaner,
	}

	@classmethod
	def get_cleaner(cls, network_id: str):
		cleaner_cls = cls._REGISTRY.get(network_id, MumbaiCleaner)
		return cleaner_cls()