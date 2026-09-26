from .dmrc_adapter import DMRCEcosystemAdapter
from .ncrtc_adapter import NCRTCEcosystemAdapter
from .nmrc_adapter import NMRCEcosystemAdapter
from .mumbai_adapter import MumbaiMetroAdapter
from .upmrc_adapter import UPMRCEcosystemAdapter
from .mahametro_adapter import MahaMetroEcosystemAdapter
from .bmrcl_adapter import BMRCLEcosystemAdapter
from .hyderabad_adapter import HyderabadMetroAdapter
from .kolkata_adapter import KolkataMetroAdapter
from .kochi_adapter import KochiMetroAdapter
from .chennai_adapter import ChennaiMetroAdapter
from .mpmrc_adapter import MPMRCEcosystemAdapter
from .ahmedabad_adapter import AhmedabadMetroAdapter
from .jaipur_adapter import JaipurMetroAdapter
from .navi_mumbai_adapter import NaviMumbaiMetroAdapter
from .mumbai_monorail_adapter import MumbaiMonorailAdapter
from .generic_adapter import GenericRESTAdapter

class AdapterFactory:
    """Enterprise Factory to instantiate transit adapters by network ID."""

    _REGISTRY = {
        "dmrc_delhi": DMRCEcosystemAdapter,
        "rapid_metro_gurugram": DMRCEcosystemAdapter,
        "ncrtc_rrts": NCRTCEcosystemAdapter,
        "nmrc_noida": NMRCEcosystemAdapter,
        "mumbai_metro": MumbaiMetroAdapter,
        "lucknow_metro": UPMRCEcosystemAdapter,
        "kanpur_metro": UPMRCEcosystemAdapter,
        "agra_metro": UPMRCEcosystemAdapter,
        "pune_metro": MahaMetroEcosystemAdapter,
        "nagpur_metro": MahaMetroEcosystemAdapter,
        "namma_metro": BMRCLEcosystemAdapter,
        "hyderabad_metro": HyderabadMetroAdapter,
        "kolkata_metro": KolkataMetroAdapter,
        "kochi_metro": KochiMetroAdapter,
        "chennai_metro": ChennaiMetroAdapter,
        "indore_metro": MPMRCEcosystemAdapter,
        "bhopal_metro": MPMRCEcosystemAdapter,
        "ahmedabad_metro": AhmedabadMetroAdapter,
        "jaipur_metro": JaipurMetroAdapter,
        "navi_mumbai_metro": NaviMumbaiMetroAdapter,
        "mumbai_monorail": MumbaiMonorailAdapter,
    }

    @classmethod
    def get_adapter(cls, network_id: str):
        adapter_cls = cls._REGISTRY.get(network_id, GenericRESTAdapter)
        return adapter_cls()