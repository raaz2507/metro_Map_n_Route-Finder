import time
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger

class NCRTCEcosystemAdapter(BaseTransitAdapter):
	"""
	Handles Namo Bharat (NCRTC RRTS) 2-Stage REST API.
	Zero hardcoded URLs or session headers. All config driven via manifest.
	"""

	def extract(self, network_id: str, net_info: dict) -> dict:
		session = self.create_session(net_info.get("source_url", ""))

		data_sources = net_info.get("data_sources", {})
		stn_cfg = data_sources.get("stations", {})
		list_url = stn_cfg.get("url") if isinstance(stn_cfg, dict) else stn_cfg

		detail_cfg = data_sources.get("station_details", {})
		detail_template = detail_cfg.get("url") if isinstance(detail_cfg, dict) else ""

		if not list_url:
			UniversalPipelineLogger.log("ERROR", f"Missing 'stations' URL in data_sources for {network_id}")
			return {}

		UniversalPipelineLogger.log("CRAWL", f"Querying NCRTC Namo Bharat station list: {list_url}")
		resp = session.get(list_url, verify=False, timeout=15)
		resp.raise_for_status()
		stations_list = resp.json()

		UniversalPipelineLogger.log("SUCCESS", f"Discovered {len(stations_list)} stations in NCRTC corridor.")
		deep_dataset = {}

		for idx, st_summary in enumerate(stations_list, 1):
			st_id = st_summary.get("id")
			raw_code = st_summary.get("code")
			st_code = raw_code.upper() if raw_code else None
			st_name = st_summary.get("name", f"Station_{st_id}")
			slug = UniversalFileSystemManager.slugify(st_name)

			st_details = {}
			if detail_template and "{station_id}" in detail_template and st_id:
				detail_url = detail_template.format(station_id=st_id)
				try:
					r_det = session.get(detail_url, verify=False, timeout=10)
					if r_det.status_code == 200:
						st_details = r_det.json()
				except Exception as e:
					UniversalPipelineLogger.log("WARN", f"Failed fetching details for {st_name}: {e}")

			orig_slug = slug
			counter = 1
			while slug in deep_dataset and deep_dataset[slug].get("station_id") != st_id:
				slug = f"{orig_slug}({counter})"
				counter += 1

			deep_dataset[slug] = {
				"id": slug,
				"station_id": st_id,
				"station_code": st_code,
				"station_name": st_name,
				"summary_raw": st_summary,
				"details_raw": st_details
			}

			if idx % 5 == 0 or idx == len(stations_list):
				UniversalPipelineLogger.log("CRAWL", f"[{idx}/{len(stations_list)}] Scraped: {st_name} ({st_code})")
			time.sleep(0.04)

		return deep_dataset