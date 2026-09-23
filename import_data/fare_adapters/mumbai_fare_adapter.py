#!/usr/bin/env python3
"""
================================================================================
Mumbai Metro Consolidated Live Fare Adapter
================================================================================
Location: fare_adapters/mumbai_fare_adapter.py
Role    : Scrapes live fare data for Mumbai Metro lines strictly using URLs 
          from master_audit_manifest.json (Zero manual slabs in manifest).
================================================================================
"""

import re
import time
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, List
from bs4 import BeautifulSoup
from pipeline_core.logger import UniversalPipelineLogger
from .base_fare_adapter import BaseFareAdapter


class MumbaiFareAdapter(BaseFareAdapter):
	"""Consolidated live scraper for Mumbai Metro operators."""

	def extract_fare(self, network_id: str, network_config: Dict[str, Any]) -> Dict[str, Any]:
		data_sources = network_config.get("data_sources", {})
		operators_data: Dict[str, Any] = {}
		total_pairs = 0

		UniversalPipelineLogger.log("INIT", "Starting live fare extraction for Mumbai Metro...")

		# 1. MMMOCL (Line 2A & Line 7) - Live Server Scraping
		mmmocl_cfg = data_sources.get("line2a_line7_mmmocl", {})
		mmmocl_url = mmmocl_cfg.get("url")
		if mmmocl_url:
			UniversalPipelineLogger.log("FETCH", f"[1/3] Scraping MMMOCL live from {mmmocl_url}...")
			mmmocl_res = self._scrape_mmmocl(mmmocl_url)
			if mmmocl_res:
				operators_data["line2a_line7_mmmocl"] = {
					"operator": mmmocl_cfg.get("operator", "MMMOCL"),
					"line_name": mmmocl_cfg.get("line_name", "Line 2A & Line 7"),
					"source_url": mmmocl_url,
					**mmmocl_res
				}
				total_pairs += len(mmmocl_res.get("fares", []))

		# 2. MMRCL (Line 3 Aqua Line) - Live REST API
		mmrcl_cfg = data_sources.get("line3_mmrcl", {})
		mmrcl_st_url = mmrcl_cfg.get("stations_url")
		mmrcl_fare_url = mmrcl_cfg.get("url")
		if mmrcl_st_url and mmrcl_fare_url:
			UniversalPipelineLogger.log("FETCH", f"[2/3] Scraping MMRCL live REST API...")
			mmrcl_res = self._scrape_mmrcl(mmrcl_st_url, mmrcl_fare_url)
			if mmrcl_res:
				operators_data["line3_mmrcl"] = {
					"operator": mmrcl_cfg.get("operator", "MMRCL"),
					"line_name": mmrcl_cfg.get("line_name", "Line 3 (Aqua Line)"),
					"source_endpoint": mmrcl_fare_url,
					**mmrcl_res
				}
				total_pairs += len(mmrcl_res.get("fares", []))

		# 3. MMOPL (Line 1 Blue Line) - Live Web Page & Fare Asset Discovery
		mmopl_cfg = data_sources.get("line1_mmopl", {})
		mmopl_url = mmopl_cfg.get("url")
		if mmopl_url:
			UniversalPipelineLogger.log("FETCH", f"[3/3] Scraping MMOPL live page from {mmopl_url}...")
			mmopl_res = self._scrape_mmopl(mmopl_url)
			if mmopl_res:
				operators_data["line1_mmopl"] = {
					"operator": mmopl_cfg.get("operator", "MMOPL (Reliance)"),
					"line_name": mmopl_cfg.get("line_name", "Line 1 (Blue Line)"),
					"source_url": mmopl_url,
					**mmopl_res
				}

		if not operators_data:
			UniversalPipelineLogger.log("ERROR", "No operator fare data collected for Mumbai!")
			return {}

		return {
			"metadata": {
				"network_id": network_id,
				"network_name": network_config.get("name", "Mumbai Metro"),
				"scraped_at": datetime.now(timezone.utc).isoformat(),
				"currency": "INR",
				"operators_included": list(operators_data.keys())
			},
			"operators": operators_data,
			"total_pairs_scraped": total_pairs
		}

	def _scrape_mmmocl(self, table_url: str) -> Dict[str, Any]:
		"""Extracts live station pairs from MMMOCL server."""
		session = self.create_session()
		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			"Referer": table_url,
			"Origin": "https://www.mmmocl.co.in",
			"X-Requested-With": "XMLHttpRequest"
		}
		try:
			resp = session.get(table_url, headers=headers, timeout=12)
			soup = BeautifulSoup(resp.text, "html.parser")
			csrf_el = soup.find("input", {"name": "csrf_test_name"}) or soup.find("input", {"class": "txt_csrfname"})
			csrf_token = csrf_el.get("value", "") if csrf_el else ""

			match = re.search(r"url:\s*['\"]([^'\"]*fare_details[^'\"]*)['\"]", resp.text)
			endpoint = urllib.parse.urljoin(table_url, match.group(1)) if match else table_url

			src_sel = soup.find("select", {"name": "source_id"})
			dst_sel = soup.find("select", {"name": "destination_id"})

			sources = [o.get("value") for o in src_sel.find_all("option") if o.get("value")] if src_sel else []
			dests = [o.get("value") for o in dst_sel.find_all("option") if o.get("value")] if dst_sel else []

			if not sources or not dests:
				return {}

			fares = []
			from_id = sources[0]  # Gundavali anchor
			for to_id in dests[1:16]:  # Sample across line corridor
				p_data = {
					"csrf_test_name": csrf_token,
					"journey_type": "0",
					"source_id": from_id,
					"destination_id": to_id,
					"no_of_ticket": "1"
				}
				p_res = session.post(endpoint, data=p_data, headers=headers, timeout=6)
				if p_res.status_code == 200:
					rj = p_res.json()
					if rj.get("csrf_hash"):
						csrf_token = rj["csrf_hash"]
					if rj.get("fare") is not None:
						fares.append({
							"from_station": rj.get("source"),
							"to_station": rj.get("destination"),
							"fare_inr": float(rj.get("fare"))
						})
				time.sleep(0.35)

			return {
				"fare_type": "station_pair",
				"total_stations_available": len(sources),
				"fares": fares
			}
		except Exception as e:
			UniversalPipelineLogger.log("WARN", f"MMMOCL error: {e}")
			return {}

	def _scrape_mmrcl(self, stations_url: str, fare_url: str) -> Dict[str, Any]:
		"""Extracts live station pair fares from MMRCL Line 3 REST API."""
		session = self.create_session()
		headers = {
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
			"Referer": "https://mmrcl.com/",
			"Content-Type": "application/json"
		}
		try:
			st_res = session.get(stations_url, headers=headers, timeout=10)
			all_stations = st_res.json()
			station_map = {s["code"]: s["name"] for s in all_stations if "code" in s}

			codes = list(station_map.keys())
			from_code = codes[0]  # ARYJ (Aarey)
			fares = []

			for to_code in codes[1:10]:
				body = {"source": from_code, "destination": to_code, "line_type": "normal"}
				res = session.post(fare_url, json=body, headers=headers, timeout=6)
				if res.status_code == 200 and isinstance(res.json(), dict):
					data = res.json()
					fare_val = data.get("fare_amount")
					if fare_val is not None:
						fares.append({
							"from_station_code": from_code,
							"from_station_name": station_map.get(from_code, from_code),
							"to_station_code": to_code,
							"to_station_name": station_map.get(to_code, to_code),
							"fare_inr": float(fare_val),
							"distance_km": data.get("distance")
						})
				time.sleep(0.08)

			return {
				"fare_type": "station_pair",
				"total_stations_in_catalog": len(station_map),
				"fares": fares
			}
		except Exception as e:
			UniversalPipelineLogger.log("WARN", f"MMRCL error: {e}")
			return {}

	def _scrape_mmopl(self, page_url: str) -> Dict[str, Any]:
		"""Scrapes MMOPL live page and discovers official fare map image asset."""
		session = self.create_session()
		headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
		try:
			res = session.get(page_url, headers=headers, timeout=10)
			soup = BeautifulSoup(res.text, "html.parser")

			fare_img = None
			for img in soup.find_all("img"):
				src = img.get("src", "")
				if any(k in src.lower() for k in ["fare", "ticket", "map"]):
					fare_img = urllib.parse.urljoin(page_url, src)
					break

			asset_meta = {}
			if fare_img:
				h_res = session.head(fare_img, headers=headers, timeout=6)
				asset_meta = {
					"fare_chart_image_url": fare_img,
					"http_status": h_res.status_code,
					"last_modified": h_res.headers.get("Last-Modified"),
					"etag": h_res.headers.get("ETag")
				}

			return {
				"fare_type": "official_asset_catalog",
				"live_asset": asset_meta
			}
		except Exception as e:
			UniversalPipelineLogger.log("WARN", f"MMOPL error: {e}")
			return {}