import re
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger


class NMRCEcosystemAdapter(BaseTransitAdapter):
	"""
	100% Dynamic & Manifest-Driven Adapter.
	Zero Hardcoded URLs, Zero Hardcoded Column Keys, Zero Synthetic Structure.
	"""

	def extract(self, network_id: str, net_info: dict) -> dict:
		session = self.create_session(net_info.get("source_url", ""))
		
		# 1. URLs 100% Manifest Driven (No hardcoded strings)
		data_sources = net_info.get("data_sources", {})
		timings_url = data_sources.get("stations_timetable", {}).get("url")
		contacts_url = data_sources.get("contacts", {}).get("url")

		if not timings_url:
			UniversalPipelineLogger.log("ERROR", f"No 'stations_timetable' URL configured in manifest for {network_id}")
			return {}

		# -------------------------------------------------------------
		# 2. Live Contacts (Manifest Driven)
		# -------------------------------------------------------------
		station_contacts = {}
		if contacts_url:
			try:
				c_resp = session.get(contacts_url, verify=False, timeout=15)
				if c_resp.status_code == 200:
					matches = re.findall(r"([A-Za-z0-9\s]+?)\s+(0120\s*\d{6,8})", c_resp.text)
					for st_name, phone in matches:
						station_contacts[st_name.strip().lower()] = phone.strip()
			except Exception as e:
				UniversalPipelineLogger.log("WARN", f"Contacts fetch failed: {e}")

		# -------------------------------------------------------------
		# 3. Dynamic HTML Table Extraction (Headers Driven)
		# -------------------------------------------------------------
		resp = session.get(timings_url, verify=False, timeout=15)
		resp.raise_for_status()

		table_match = re.search(r"<table[^>]*>(.*?)</table>", resp.text, re.DOTALL | re.IGNORECASE)
		if not table_match:
			UniversalPipelineLogger.log("ERROR", "No table found in HTML response")
			return {}

		rows = re.findall(r"<tr[^>]*>(.*?)</tr>", table_match.group(1), re.DOTALL | re.IGNORECASE)
		raw_dataset = {}

		for r in rows:
			cols = re.findall(r"<td[^>]*>(.*?)</td>", r, re.DOTALL | re.IGNORECASE)
			if not cols or len(cols) < 2:
				continue

			# Clean cell strings
			clean_cells = [re.sub(r"&nbsp;|<[^>]+>", " ", c).strip() for c in cols]
			st_name = clean_cells[0]

			# Header ya invalid row filter
			if not st_name or "no data" in st_name.lower() or st_name.lower().startswith("station") or st_name.lower().startswith("s.no"):
				continue

			slug = UniversalFileSystemManager.slugify(st_name)

			# Match contact if available
			matched_phone = ""
			for c_name, c_num in station_contacts.items():
				if c_name in st_name.lower() or st_name.lower() in c_name:
					matched_phone = c_num
					break

			# PURE RAW: Sirf wahi jo table me aaya, bina kisi hardcoded key ke
			raw_dataset[slug] = {
				"station_name": st_name,
				"phone": matched_phone,
				"table_row": clean_cells
			}

		UniversalPipelineLogger.log("SUCCESS", f"Extracted {len(raw_dataset)} raw station rows.")
		return raw_dataset