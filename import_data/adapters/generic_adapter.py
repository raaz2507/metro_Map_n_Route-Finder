from pipeline_core.constants import DEFAULT_HTTP_HEADERS

import requests
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger

class GenericRESTAdapter(BaseTransitAdapter):
    """Handles any generic or future city transit REST API."""

    def extract(self, network_id: str, net_info: dict) -> dict:
        session = requests.Session()
        session.headers.update(DEFAULT_HTTP_HEADERS)

        data_sources = net_info.get("data_sources", {})
        api_url = ""
        if isinstance(data_sources, dict) and "stations" in data_sources:
            stn_entry = data_sources["stations"]
            if isinstance(stn_entry, dict):
                api_url = stn_entry.get("url", "").strip()
            elif isinstance(stn_entry, str):
                api_url = stn_entry.strip()

        if not api_url or api_url == "#":
            UniversalPipelineLogger.log("ERROR", f"No station URL configured for generic network '{net_info.get('id')}'.")
            return {}

        UniversalPipelineLogger.log("CRAWL", f"Querying generic REST API: {api_url}")
        resp = session.get(api_url, verify=False, timeout=15)
        resp.raise_for_status()
        raw_json = resp.json()

        dataset = {}
        stations = raw_json if isinstance(raw_json, list) else raw_json.get("stations", raw_json.get("data", []))
        if isinstance(stations, list):
            for idx, item in enumerate(stations, 1):
                name = item.get("name") or item.get("station_name") or f"Station_{idx}"
                code = item.get("code") or item.get("station_code") or f"ST_{idx:02d}"
                slug = UniversalFileSystemManager.slugify(name)
                dataset[slug] = {
                    "id": slug,
                    "station_code": code,
                    "station_name_en": name,
                    "raw_payload": item
                }
        elif isinstance(stations, dict):
            for k, v in stations.items():
                slug = UniversalFileSystemManager.slugify(str(k))
                dataset[slug] = {
                    "id": slug,
                    "station_code": v.get("code", slug.upper()),
                    "station_name_en": v.get("name", slug.replace("_", " ").title()),
                    "raw_payload": v
                }

        UniversalPipelineLogger.log("SUCCESS", f"Generic API adapter compiled {len(dataset)} stations.")
        return dataset