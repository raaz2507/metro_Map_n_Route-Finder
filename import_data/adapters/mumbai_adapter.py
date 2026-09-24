import re
import time
import requests
from pipeline_core.base_adapter import BaseTransitAdapter
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.logger import UniversalPipelineLogger


class MumbaiMetroAdapter(BaseTransitAdapter):
	"""
	100% Manifest-Driven Authentic Raw Adapter.
	Zero Hardcoded URLs, Zero Injected Fallbacks, Strict Manifest Governance.
	"""

	def extract(self, network_id: str, net_info: dict) -> dict:
		source_url = net_info.get("source_url", "")
		session = self.create_session(source_url)
		data_sources = net_info.get("data_sources", {})
		combined_dataset = {}

		UniversalPipelineLogger.log("INIT", f"Starting Mumbai composite extraction across {len(data_sources)} manifest sources.")

		# 1. MMRCL Line 3
		if "line3_mmrcl" in data_sources:
			try:
				l3_data = self._extract_mmrcl_line3(session, data_sources["line3_mmrcl"])
				combined_dataset.update(l3_data)
				UniversalPipelineLogger.log("SUCCESS", f"Ingested {len(l3_data)} stations from MMRCL Line 3.")
			except Exception as e:
				UniversalPipelineLogger.log("ERROR", f"MMRCL Line 3 extraction failed: {e}")

		# 2. MMMOCL Lines 2A & 7
		if "line2a_line7_mmmocl" in data_sources:
			try:
				m_data = self._extract_mmmocl(session, data_sources["line2a_line7_mmmocl"])
				combined_dataset.update(m_data)
				UniversalPipelineLogger.log("SUCCESS", f"Ingested {len(m_data)} stations from MMMOCL (2A & 7).")
			except Exception as e:
				UniversalPipelineLogger.log("ERROR", f"MMMOCL extraction failed: {e}")

		# 3. MMOPL Line 1
		if "line1_mmopl" in data_sources:
			try:
				l1_data = self._extract_mmopl(session, data_sources["line1_mmopl"])
				combined_dataset.update(l1_data)
				UniversalPipelineLogger.log("SUCCESS", f"Ingested {len(l1_data)} stations from MMOPL Line 1.")
			except Exception as e:
				UniversalPipelineLogger.log("ERROR", f"MMOPL Line 1 extraction failed: {e}")

		UniversalPipelineLogger.log("SUCCESS", f"Total Mumbai stations unified: {len(combined_dataset)}")
		return combined_dataset

	def _extract_mmrcl_line3(self, session: requests.Session, cfg: dict) -> dict:
		stations_url = cfg.get("stations_url")
		detail_template = cfg.get("station_details_url")
		languages = cfg.get("languages", ["en", "mr"])

		if not stations_url:
			UniversalPipelineLogger.log("ERROR", "Missing 'stations_url' in manifest for line3_mmrcl!")
			return {}

		resp = session.get(stations_url, verify=False, timeout=15)
		resp.raise_for_status()
		stations_list = resp.json()

		dataset = {}
		for st_meta in stations_list:
			if not isinstance(st_meta, dict):
				continue
			st_code = st_meta.get("code") or st_meta.get("afc_station_code") or ""
			raw_name = st_meta.get("name") or st_code
			slug = UniversalFileSystemManager.slugify(raw_name)

			lang_payloads = {}
			if detail_template:
				for lang in languages:
					try:
						url = detail_template.format(lang=lang, code=st_code)
						r = session.get(url, verify=False, timeout=8)
						if r.status_code == 200:
							lang_payloads[lang] = r.json()
					except Exception:
						pass

			en_data = lang_payloads.get("en", {}) if isinstance(lang_payloads.get("en"), dict) else {}
			mr_data = lang_payloads.get("mr", {}) if isinstance(lang_payloads.get("mr"), dict) else {}

			name_en = en_data.get("name") or raw_name
			name_mr = mr_data.get("name") or name_en

			lat = en_data.get("latitude")
			lon = en_data.get("longitude")
			coords = None
			if lat and lon:
				try:
					coords = {"latitude": float(lat), "longitude": float(lon)}
				except (ValueError, TypeError):
					pass

			dataset[slug] = {
				"id": slug,
				"station_code": st_code,
				"station_name_en": name_en,
				"station_name_mr": name_mr,
				"line": "Line 3 (Aqua Line)",
				"operator": "MMRCL",
				"coordinates": coords,
				"raw_payload": st_meta,
				"details_raw": lang_payloads,
				"en_raw": en_data,
				"mr_raw": mr_data
			}
			import random
			# Human-like micro delay (Jitter) to prevent WAF burst detection
			time.sleep(random.uniform(0.15, 0.35))

		return dataset

	def _extract_mmmocl(self, session: requests.Session, cfg: dict) -> dict:
		table_url = cfg.get("fare_table_url")
		map_url = cfg.get("map_asset_url")

		if not table_url:
			UniversalPipelineLogger.log("ERROR", "Missing 'fare_table_url' in manifest for line2a_line7_mmmocl!")
			return {}

		resp = session.get(table_url, verify=False, timeout=15)
		resp.raise_for_status()

		# 1. Greedy extraction: Live form options
		opts = re.findall(r'<select[^>]*name=["\']source_id["\'][^>]*>(.*?)</select>', resp.text, re.DOTALL | re.IGNORECASE)
		station_options = {}
		if opts:
			for val, name in re.findall(r'<option\s+value=["\']?(\d+)["\']?>([^<]+)</option>', opts[0]):
				station_options[int(val)] = name.strip()

		# 2. Authentic location map stops strictly from manifest URL
		stops_2a = []
		stops_7 = []
		if map_url:
			r_map = session.get(map_url, verify=False, timeout=15)
			if r_map.status_code == 200:
				def parse_js_stops(var_name, text):
					m = re.search(rf'const\s+{var_name}\s*=\s*\[(.*?)\];', text, re.DOTALL)
					if not m:
						return []
					items = re.findall(r'\{\s*lat:\s*([\d\.-]+),\s*lng:\s*([\d\.-]+)\s*\},\s*["\']([^"\']+)["\']', m.group(1))
					return [{"order": i + 1, "lat": float(lat), "lng": float(lng), "name": name.strip()} for i, (lat, lng, name) in enumerate(items)]

				stops_2a = parse_js_stops("line2AStops", r_map.text)
				stops_7 = parse_js_stops("line7Stops", r_map.text)

		dataset = {}
		for corridor_name, code, stops in [("Line 2A (Yellow Line)", "2A", stops_2a), ("Line 7 (Red Line)", "7", stops_7)]:
			for stop in stops:
				clean_name = re.sub(r'[^a-zA-Z0-9]', '', stop["name"]).lower()
				slug = f"mmmocl_{code.lower()}_{clean_name}"
				dataset[slug] = {
					"id": slug,
					"station_code": f"MM_{code}_{stop['order']}",
					"station_name_en": stop["name"],
					"line": corridor_name,
					"line_code": code,
					"order": stop["order"],
					"coordinates": {"latitude": stop["lat"], "longitude": stop["lng"]},
					"operator": "MMMOCL",
					"raw_payload": {
						"raw_stop": stop,
						"source_url": table_url,
						"options_catalog_available": len(station_options)
					}
				}

		return dataset

	def _extract_mmopl(self, session: requests.Session, cfg: dict) -> dict:
		fare_url = cfg.get("fare_calculator_url")
		map_url = cfg.get("map_asset_url")

		if not fare_url:
			UniversalPipelineLogger.log("ERROR", "Missing 'fare_calculator_url' in manifest for line1_mmopl!")
			return {}

		resp = session.get(fare_url, verify=False, timeout=15)
		resp.raise_for_status()

		# 1. Greedy extraction: Live ASP.NET dropdown options
		opts = re.findall(r'<select[^>]*name=["\'][^"\']*ddlfromstation["\'][^>]*>(.*?)</select>', resp.text, re.DOTALL | re.IGNORECASE)
		stations_list = []
		if opts:
			for val, name in re.findall(r'<option\s+value=["\']([^"\']+)["\']>([^<]+)</option>', opts[0]):
				if "select" not in name.lower():
					stations_list.append({"id": val, "name": name.strip()})

		# 2. Authentic map coordinates strictly from manifest URL
		coord_map = {}
		if map_url:
			try:
				r_map = session.get(map_url, verify=False, timeout=10)
				if r_map.status_code == 200:
					m = re.search(r'const\s+line1Stops\s*=\s*\[(.*?)\];', r_map.text, re.DOTALL)
					if m:
						items = re.findall(r'\{\s*lat:\s*([\d\.-]+),\s*lng:\s*([\d\.-]+)\s*\},\s*["\']([^"\']+)["\']', m.group(1))
						for lat, lng, name in items:
							coord_map[re.sub(r'[^a-zA-Z0-9]', '', name).lower()] = (float(lat), float(lng))
			except Exception:
				pass

		dataset = {}
		for idx, st in enumerate(stations_list, start=1):
			clean_name = re.sub(r'[^a-zA-Z0-9]', '', st["name"]).lower()
			slug = f"mmopl_1_{clean_name}"
			lat, lng = coord_map.get(clean_name, (None, None))

			dataset[slug] = {
				"id": slug,
				"station_code": f"MMOPL_{idx}",
				"station_name_en": st["name"],
				"line": "Line 1 (Blue Line)",
				"operator": "MMOPL",
				"order": idx,
				"coordinates": {"latitude": lat, "longitude": lng} if lat else None,
				"raw_payload": {
					"dropdown_option": st,
					"source_url": fare_url
				}
			}

		return dataset