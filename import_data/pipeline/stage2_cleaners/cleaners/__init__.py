#!/usr/bin/env python3
from .dmrc_cleaner import DMRCCleaner
from .ncrtc_cleaner import NCRTCCleaner
from .nmrc_cleaner import NMRCCleaner
from .mumbai_cleaner import MumbaiCleaner
from .namma_cleaner import NammaCleaner
from .kolkata_cleaner import KolkataCleaner
from .hyderabad_cleaner import HyderabadCleaner
from .chennai_cleaner import ChennaiCleaner
from .kochi_cleaner import KochiCleaner
from .ahmedabad_cleaner import AhmedabadCleaner
from .pune_cleaner import PuneCleaner
from .nagpur_cleaner import NagpurCleaner
from .upmrc_cleaner import UPMRCCleaner
from .jaipur_cleaner import JaipurCleaner
from .mpmrc_cleaner import MPMRCCleaner
from .mmr_transit_cleaner import MMRTransitCleaner

class CleanerFactory:
	"""Enterprise Factory registering transit cleaners by network ID."""

	_REGISTRY = {
		"dmrc_delhi": DMRCCleaner,
		"rapid_metro_gurugram": DMRCCleaner,
		"ncrtc_rrts": NCRTCCleaner,
		"nmrc_noida": NMRCCleaner,
		"mumbai_metro": MumbaiCleaner,
		"namma_metro": NammaCleaner,
		"kolkata_metro": KolkataCleaner,
		"hyderabad_metro": HyderabadCleaner,
		"chennai_metro": ChennaiCleaner,
		"kochi_metro": KochiCleaner,
		"ahmedabad_metro": AhmedabadCleaner,
		"pune_metro": PuneCleaner,
		"nagpur_metro": NagpurCleaner,
		"lucknow_metro": UPMRCCleaner,
		"kanpur_metro": UPMRCCleaner,
		"agra_metro": UPMRCCleaner,
		"jaipur_metro": JaipurCleaner,
		"indore_metro": MPMRCCleaner,
		"bhopal_metro": MPMRCCleaner,
		"navi_mumbai_metro": MMRTransitCleaner,
		"mumbai_monorail": MMRTransitCleaner,
	}

	@classmethod
	def get_cleaner(cls, network_id: str):
		cleaner_cls = cls._REGISTRY.get(network_id, MumbaiCleaner)
		return cleaner_cls()