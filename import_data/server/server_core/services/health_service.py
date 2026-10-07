"""
Portal Health & Dataset Introspection Service (OOP)
Location: import_data/server_core/services/health_service.py
"""
import ssl
import time
import json
import urllib.request
import concurrent.futures
from pathlib import Path
from typing import Dict, Any, List
from ..config import CONFIG_DIR, DATA_DIR, PROJECT_ROOT
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.core.constants import DEFAULT_USER_AGENT


class PortalHealthService:
	"""
	Thread-safe OOP Service for concurrent health checking of transit agency portals
	and stage dataset diffing.
	"""

	@classmethod
	def ping_portal(cls, net_id: str, name: str, url: str) -> Dict[str, Any]:
		"""Pings single agency portal with unverified SSL and custom user agent."""
		ctx = ssl._create_unverified_context()
		headers = {"User-Agent": DEFAULT_USER_AGENT, "Accept": "text/html"}
		req = urllib.request.Request(url, headers=headers)
		start_time = time.time()
		try:
			with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
				return {
					"id": net_id,
					"name": name,
					"url": url,
					"status": "online" if response.getcode() < 400 else "degraded",
					"http_status": response.getcode(),
					"latency_ms": int((time.time() - start_time) * 1000),
					"error": None
				}
		except Exception as e:
			return {
				"id": net_id,
				"name": name,
				"url": url,
				"status": "offline",
				"http_status": None,
				"latency_ms": None,
				"error": str(e)
			}

	@classmethod
	def check_all_portals(cls) -> Dict[str, Any]:
		"""Pings all manifest-defined transit authority portals concurrently."""
		manifest_file = CONFIG_DIR / "master_audit_manifest.json"
		if not manifest_file.exists():
			raise FileNotFoundError("master_audit_manifest.json missing")

		with open(manifest_file, "r", encoding="utf-8") as f:
			manifest_data = json.load(f)

		targets = []
		for net_id, net_obj in manifest_data.get("networks", {}).items():
			name = net_obj.get("name", net_id)
			url = net_obj.get("source_url") or net_obj.get("data_sources", {}).get("stations", {}).get("url")
			if url:
				targets.append((net_id, name, url))

		results = []
		with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, len(targets))) as executor:
			futures = {executor.submit(cls.ping_portal, n, name, u): n for n, name, u in targets}
			for future in concurrent.futures.as_completed(futures):
				results.append(future.result())

		online = sum(1 for r in results if r.get("status") == "online")
		latencies = [r["latency_ms"] for r in results if r.get("latency_ms") is not None]
		avg_lat = int(sum(latencies) / len(latencies)) if latencies else 0

		return {
			"status": "success",
			"total_portals": len(results),
			"online_count": online,
			"average_latency_ms": avg_lat,
			"all_operational": (online == len(results) and len(results) > 0),
			"portals": results
		}

	@classmethod
	def get_dataset_delta(cls, network: str) -> Dict[str, Any]:
		"""Computes station-level diff between Stage 2 cleaned and Stage 3 master files."""
		cleaned_path = UniversalFileSystemManager.get_stage_path(network, "cleaned")
		master_path = UniversalFileSystemManager.get_stage_path(network, "master")
		if not cleaned_path.exists():
			cleaned_path = BASE_DIR / f"{network}_cleaned.json"
		if not master_path.exists():
			master_path = BASE_DIR / f"{network}_master.json"

		delta_info = {
			"network": network,
			"cleaned_file": cleaned_path.name if cleaned_path.exists() else None,
			"master_file": master_path.name if master_path.exists() else None,
			"has_delta": False,
			"summary": {"new_stations": 0, "modified_stations": 0, "deleted_stations": 0, "total_cleaned": 0, "total_master": 0},
			"new_station_keys": [],
			"deleted_station_keys": []
		}

		if cleaned_path.exists() and master_path.exists():
			with open(cleaned_path, "r", encoding="utf-8") as f:
				c_data = json.load(f)
			with open(master_path, "r", encoding="utf-8") as f:
				m_data = json.load(f)

			c_raw = c_data.get("stations", c_data) if isinstance(c_data, dict) else {}
			m_raw = m_data.get("stations", m_data) if isinstance(m_data, dict) else {}

			c_keys = set(c_raw.keys()) if isinstance(c_raw, dict) else {s.get("id", str(idx)) for idx, s in enumerate(c_raw) if isinstance(s, dict)}
			m_keys = set(m_raw.keys()) if isinstance(m_raw, dict) else {s.get("id", str(idx)) for idx, s in enumerate(m_raw) if isinstance(s, dict)}

			new_keys = sorted(list(c_keys - m_keys))
			del_keys = sorted(list(m_keys - c_keys))

			delta_info["summary"].update({
				"total_cleaned": len(c_keys),
				"total_master": len(m_keys),
				"new_stations": len(new_keys),
				"deleted_stations": len(del_keys)
			})
			delta_info.update({"new_station_keys": new_keys, "deleted_station_keys": del_keys, "has_delta": bool(new_keys or del_keys)})

		return delta_info

	@classmethod
	def compute_network_field_audit(cls, net_id: str, master_file: Optional[Path]) -> Dict[str, Any]:
		"""
		Calculates authentic, verified field-level availability percentages for a transit network.
		Returns explicit statuses ('available', 'partial', 'missing') based on real data presence.
		"""
		if not master_file or not master_file.exists():
			return {
				"geo": "missing",
				"gates": "missing",
				"lifts": "missing",
				"parking": "missing",
				"facilities": "missing",
				"contact": "missing",
				"timings": "missing",
				"pricing_model": "missing",
				"smart_cards": "missing",
				"sync": "missing",
				"interchanges": "missing"
			}

		try:
			with open(master_file, "r", encoding="utf-8") as f:
				st_data = json.load(f)
		except Exception:
			return {k: "missing" for k in ["geo", "gates", "lifts", "parking", "facilities", "contact", "timings", "pricing_model", "smart_cards", "sync", "interchanges"]}

		stns = st_data.get("stations", st_data.get("stationData", st_data if isinstance(st_data, dict) else {}))
		total = len(stns) if isinstance(stns, dict) else 0

		if total == 0:
			return {k: "missing" for k in ["geo", "gates", "lifts", "parking", "facilities", "contact", "timings", "pricing_model", "smart_cards", "sync", "interchanges"]}

		def has_val(v):
			if not v:
				return False
			if isinstance(v, (list, dict, str)) and len(v) > 0:
				return True
			return False

		geo_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and s.get("location", {}).get("decimal", {}).get("lat") is not None)
		gates_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and has_val(s.get("gates")))
		lifts_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and (has_val(s.get("vertical_transit")) or has_val(s.get("lifts")) or has_val(s.get("facilities", {}).get("lift"))))
		parking_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and (has_val(s.get("parkings")) or has_val(s.get("parking")) or has_val(s.get("facilities", {}).get("parking"))))
		fac_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and has_val(s.get("facilities")))
		contact_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and (has_val(s.get("contact")) or has_val(s.get("contacts")) or has_val(s.get("helpline"))))
		timings_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and has_val(s.get("timings")))

		def to_status(count: int, threshold_full: float = 0.8) -> str:
			if count == 0:
				return "missing"
			ratio = count / total
			if ratio >= threshold_full:
				return "available"
			return "partial"

		# Check fare file presence
		net_dir = master_file.parent
		fare_file = net_dir / "fare_rules.json"
		pricing_status = "missing"
		ncmc_status = "missing"
		if fare_file.exists():
			try:
				with open(fare_file, "r", encoding="utf-8") as ff:
					fd = json.load(ff)
				pricing_status = "available" if fd.get("fare_model") or fd.get("pricing_model") or fd.get("rules") else "partial"
				ncmc_status = "available" if fd.get("ncmc_compliant") is not None or fd.get("ncmc_supported") is not None or "smart_card" in fd else "partial"
			except Exception:
				pricing_status = "partial"

		# Transit graph / interchanges
		interchange_cnt = sum(1 for s in stns.values() if isinstance(s, dict) and (len(s.get("lines", [])) > 1 or has_val(s.get("transfers")) or s.get("is_interchange")))

		return {
			"geo": to_status(geo_cnt),
			"gates": to_status(gates_cnt),
			"lifts": to_status(lifts_cnt),
			"parking": to_status(parking_cnt, threshold_full=0.4),  # Parking is often station-specific
			"facilities": to_status(fac_cnt),
			"contact": to_status(contact_cnt),
			"timings": to_status(timings_cnt),
			"pricing_model": pricing_status,
			"smart_cards": ncmc_status,
			"sync": "available" if total > 0 else "missing",
			"interchanges": "available" if interchange_cnt > 0 else "missing",
			"counts": {
				"total": total,
				"geo": geo_cnt,
				"gates": gates_cnt,
				"lifts": lifts_cnt,
				"parking": parking_cnt,
				"facilities": fac_cnt,
				"contact": contact_cnt,
				"timings": timings_cnt
			}
		}