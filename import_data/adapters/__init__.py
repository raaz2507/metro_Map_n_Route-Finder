from .dmrc_adapter import DMRCEcosystemAdapter
from .ncrtc_adapter import NCRTCEcosystemAdapter
from .nmrc_adapter import NMRCEcosystemAdapter
from .mumbai_adapter import MumbaiMetroAdapter
from .generic_adapter import GenericRESTAdapter

class AdapterFactory:
    """Enterprise Factory to instantiate transit adapters by network ID."""

    _REGISTRY = {
        "dmrc_delhi": DMRCEcosystemAdapter,
        "rapid_metro_gurugram": DMRCEcosystemAdapter,
        "ncrtc_rrts": NCRTCEcosystemAdapter,
        "nmrc_noida": NMRCEcosystemAdapter,
        "mumbai_metro": MumbaiMetroAdapter,
    }

    @classmethod
    def get_adapter(cls, network_id: str):
        adapter_cls = cls._REGISTRY.get(network_id, GenericRESTAdapter)
        return adapter_cls()