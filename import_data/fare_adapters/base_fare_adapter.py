#!/usr/bin/env python3
"""
================================================================================
Base Transit Fare Adapter Specification
================================================================================
Location: fare_adapters/base_fare_adapter.py
Role    : Abstract contract and resilient network session provider.
================================================================================
"""

from abc import ABC, abstractmethod
import requests
from requests.adapters import HTTPAdapter
import urllib3
from urllib3.util.retry import Retry
from pipeline_core.constants import DEFAULT_HTTP_HEADERS, DEFAULT_REQUEST_TIMEOUT
from pipeline_core.logger import UniversalPipelineLogger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


class BaseFareAdapter(ABC):
	"""Abstract base class for all transit network fare scrapers."""

	def create_session(self, referer: str = "") -> requests.Session:
		"""
		Creates a resilient HTTP session equipped with:
		- Standard headers and browser User-Agent
		- Exponential retry mechanism on transient server errors (429, 500, 502, 503, 504)
		- Custom Referer support
		"""
		session = requests.Session()
		session.headers.update(DEFAULT_HTTP_HEADERS)
		if referer:
			session.headers.update({"Referer": referer})

		retry_strategy = Retry(
			total=3,
			backoff_factor=1.0,
			status_forcelist=[429, 500, 502, 503, 504],
			raise_on_status=False
		)
		adapter = HTTPAdapter(max_retries=retry_strategy)
		session.mount("https://", adapter)
		session.mount("http://", adapter)

		return session

	@abstractmethod
	def extract_fare(self, network_id: str, net_info: dict) -> dict:
		"""
		Extracts fare rules/matrix/slabs for the target transit network.

		:param network_id: Unique slug of the network (e.g., 'nmrc_noida')
		:param net_info: Manifest configuration dictionary for this network
		:return: Dictionary containing parsed fare structures
		"""
		pass