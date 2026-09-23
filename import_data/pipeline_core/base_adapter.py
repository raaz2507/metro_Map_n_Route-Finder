from abc import ABC, abstractmethod
import requests
import urllib3
from pipeline_core.constants import DEFAULT_HTTP_HEADERS

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class BaseTransitAdapter(ABC):
    """Abstract Base Class for all network protocol adapters."""

    def create_session(self, referer: str = "") -> requests.Session:
        session = requests.Session()
        session.headers.update(DEFAULT_HTTP_HEADERS)
        if referer:
            session.headers.update({"Referer": referer})
        return session

    @abstractmethod
    def extract(self, network_id: str, net_info: dict) -> dict:
        """Extract raw station data and return as a normalized dictionary."""
        pass