
#!/usr/bin/env python3
"""
================================================================================
Metro Audit Hub - Pipeline Server
================================================================================
Zero-dependency HTTP Server with Real-Time SSE (Server-Sent Events) Streaming.
- Orchestrates: universal_scraper.py, universal_cleaner.py, universal_master.py
- Multi-threaded: SSE streaming does not block UI asset loading
- Zero external dependencies: Uses Python Standard Library only
================================================================================
"""
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.constants import DEFAULT_USER_AGENT


import http.server
import json
import os
import pathlib
import socketserver
import subprocess
import sys
import threading
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
from pipeline_core.file_manager import UniversalFileSystemManager

# UTF-8 encoding configuration for Windows terminals & stdout
try:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8", errors="replace")
	if hasattr(sys.stderr, "reconfigure"):
		sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
	pass

BASE_DIR = pathlib.Path(__file__).resolve().parent
PORT = 8080

# Concurrency Guard: Track active subprocesses by network_id
RUNNING_JOBS: Dict[str, subprocess.Popen] = {}
JOBS_LOCK = threading.Lock()


class MetroServerHandler(http.server.SimpleHTTPRequestHandler):
	"""
	Thread-safe HTTP Request Handler:
	- Serves dashboard static files & assets
	- Exposes REST APIs (/api/status, /api/manifest, /api/delta)
	- Real-time SSE execution logs (/api/pipeline/stream)
	- Concurrency-safe job termination (/api/pipeline/kill)
	"""

	def __init__(self, *args, **kwargs):
		super().__init__(*args, directory=str(BASE_DIR), **kwargs)

	def end_headers(self):
		self.send_header("Access-Control-Allow-Origin", "*")
		self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		self.send_header("Access-Control-Allow-Headers", "Content-Type")

		# Smart Cache: Dynamic APIs remain uncached, static assets are cached for fast UI
		if self.path.startswith("/api/"):
			self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
		else:
			self.send_header("Cache-Control", "public, max-age=3600")

		super().end_headers()

	def do_OPTIONS(self):
		self.send_response(200)
		self.end_headers()

	def do_GET(self):
		parsed = urllib.parse.urlparse(self.path)
		path = parsed.path

		# Root and admin convenience redirects
		if path in ["/", "", "/admin", "/admin.html", "/index", "/index.html"]:
			self.send_response(302)
			self.send_header("Location", "/dashboard/admin.html")
			self.end_headers()
			return

		if path == "/api/status":
			self._handle_status()
			return

		if path == "/api/manifest":
			self._handle_manifest()
			return

		if path == "/api/portals/health":
			self._handle_portals_health()
			return

		if path == "/api/delta":
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			self._handle_delta(query_params)
			return

		if path == "/api/bridge/status":
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			city_id = query_params.get("city", "delhi_ncr").strip()
			self._handle_bridge_status(city_id)
			return

		if path == "/api/bridge/inspect":
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			city_id = query_params.get("city", "delhi_ncr").strip()
			network_id = query_params.get("network", "").strip() or None
			station_id = query_params.get("station", "").strip() or None
			self._handle_bridge_inspect(city_id, network_id, station_id)
			return

		if path == "/api/bridge/merge_station":
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			city_id = query_params.get("city", "delhi_ncr").strip()
			station_id = query_params.get("station", "").strip()
			self._handle_merge_single_station(city_id, station_id)
			return
		if path == "/api/pipeline/stream":
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			self._handle_stream(query_params)
			return

		if path == "/api/pipeline/kill":
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			self._handle_kill(query_params.get("network", ""))
			return
		if path == "/api/dataset":
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			network_id = query_params.get("network", "").strip()
			stage = query_params.get("stage", "cleaned").strip()

			data = UniversalFileSystemManager.load_stage_json(network_id, stage)
			if data is None:
				self.send_response(404)
				self.send_header("Content-Type", "application/json")
				self.end_headers()
				self.wfile.write(json.dumps({"error": f"No {stage} dataset found for {network_id}"}).encode("utf-8"))
				return

			self.send_response(200)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps(data).encode("utf-8"))
			return
		# Serve /main_project/ assets requested by CSS @import or components with Path Traversal Guard
		if path.startswith("/main_project/"):
			rel = path[len("/main_project/"):].lstrip("/")
			base_target = (BASE_DIR.parent / "main_project").resolve()
			full_file = (base_target / rel).resolve()

			# Security: Path Traversal Boundary Check
			if full_file.is_relative_to(base_target) and full_file.exists() and full_file.is_file():
				self.send_response(200)
				content_type = "application/octet-stream"
				if full_file.suffix == ".css":
					content_type = "text/css"
				elif full_file.suffix == ".js":
					content_type = "application/javascript"
				elif full_file.suffix == ".svg":
					content_type = "image/svg+xml"
				elif full_file.suffix in [".png", ".jpg", ".jpeg", ".webp"]:
					content_type = f"image/{full_file.suffix[1:]}"
				self.send_header("Content-Type", content_type)
				self.end_headers()
				with open(full_file, "rb") as f:
					self.wfile.write(f.read())
				return

		# Default: Serve static files (HTML, CSS, JS, icons, JSON datasets)
		super().do_GET()


	def do_POST(self):
		parsed = urllib.parse.urlparse(self.path)
		path = parsed.path

		if path == "/api/pipeline/kill":
			content_length = int(self.headers.get("Content-Length", 0))
			post_data = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
			try:
				req = json.loads(post_data)
			except Exception:
				req = {}
			query_params = dict(urllib.parse.parse_qsl(parsed.query))
			network_id = req.get("network") or query_params.get("network", "")
			self._handle_kill(network_id)
			return

		self.send_response(404)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(json.dumps({"error": f"Endpoint {path} not found"}).encode("utf-8"))

	# =========================================================================
	# ENDPOINTS
	# =========================================================================

	def _handle_status(self):
		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		with JOBS_LOCK:
			active_jobs = {net: proc.pid for net, proc in RUNNING_JOBS.items() if proc.poll() is None}
		payload = {
			"status": "online",
			"port": PORT,
			"python_version": sys.version,
			"base_dir": str(BASE_DIR),
			"active_jobs": active_jobs
		}
		self.wfile.write(json.dumps(payload, indent=2).encode("utf-8"))

	def _handle_manifest(self):
		manifest_file = BASE_DIR / "master_audit_manifest.json"
		if not manifest_file.exists():
			self.send_response(404)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"error": "master_audit_manifest.json not found"}).encode("utf-8"))
			return

		try:
			with open(manifest_file, "r", encoding="utf-8") as f:
				data = json.load(f)

			# Dynamically detect real stage based on actual files present on disk
			networks = data.get("networks", {})
			for net_id, net_info in networks.items():
				raw_file = UniversalFileSystemManager.get_stage_path(net_id, "raw")
				cleaned_file = UniversalFileSystemManager.get_stage_path(net_id, "cleaned")
				master_file = UniversalFileSystemManager.get_stage_path(net_id, "master")

				# Fallback agar root me purani files ho
				if not raw_file.exists():
					raw_file = BASE_DIR / f"{net_id}_raw.json"
				if not cleaned_file.exists():
					cleaned_file = BASE_DIR / f"{net_id}_cleaned.json"
				if not master_file.exists():
					master_file = BASE_DIR / f"{net_id}_master.json"

				active_file = None
				if master_file.exists():
					current_stage = "stage_3_structured"
					status = "up_to_date"
					active_file = master_file
				elif cleaned_file.exists():
					current_stage = "stage_2_cleaned"
					status = "needs_supervision"
					active_file = cleaned_file
				elif raw_file.exists():
					current_stage = "stage_1_raw"
					status = "needs_cleaning"
					active_file = raw_file
				else:
					current_stage = "stage_1_missing"
					status = "pending_intake"

				# ⚡ Live station counts via UniversalFileSystemManager in-memory cache
				stage_counts = {
					"raw": UniversalFileSystemManager.get_station_count_cached(raw_file),
					"cleaned": UniversalFileSystemManager.get_station_count_cached(cleaned_file),
					"master": UniversalFileSystemManager.get_station_count_cached(master_file),
				}

				if "pipeline" not in net_info:
					net_info["pipeline"] = {}
				net_info["pipeline"]["stage"] = current_stage
				net_info["pipeline"]["status"] = status
				net_info["total_stations"] = stage_counts.get(
					"master" if "3" in current_stage else ("cleaned" if "2" in current_stage else "raw"), 
					0
				)
				net_info["stage_counts"] = stage_counts
			self.send_response(200)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps(data).encode("utf-8"))
		except Exception as e:
			self.send_response(500)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"error": f"Failed to read manifest: {str(e)}"}).encode("utf-8"))

	def _handle_delta(self, query_params: dict):
		network_id = query_params.get("network", "").strip()
		if not network_id:
			self.send_response(400)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"error": "Missing 'network' query parameter"}).encode("utf-8"))
			return

		cleaned_path = UniversalFileSystemManager.get_stage_path(network_id, "cleaned")
		master_path = UniversalFileSystemManager.get_stage_path(network_id, "master")

		# Fallback to root files if not in datasets/
		if not cleaned_path.exists():
			legacy_cleaned = BASE_DIR / f"{network_id}_cleaned.json"
			if legacy_cleaned.exists():
				cleaned_path = legacy_cleaned

		if not master_path.exists():
			legacy_master = BASE_DIR / f"{network_id}_master.json"
			if legacy_master.exists():
				master_path = legacy_master

		cleaned_exists = cleaned_path.exists()
		master_exists = master_path.exists()

		delta_info: Dict[str, Any] = {
			"network": network_id,
			"cleaned_file": cleaned_path.name if cleaned_exists else None,
			"master_file": master_path.name if master_exists else None,
			"has_delta": False,
			"summary": {
				"new_stations": 0,
				"modified_stations": 0,
				"deleted_stations": 0,
				"total_cleaned": 0,
				"total_master": 0
			},
			"new_station_keys": [],
			"deleted_station_keys": []
		}

		if cleaned_exists and master_exists:
			try:
				with open(cleaned_path, "r", encoding="utf-8") as f:
					c_data = json.load(f)
				with open(master_path, "r", encoding="utf-8") as f:
					m_data = json.load(f)

				# Extract stations whether wrapped in 'stations' key or direct root dictionary
				c_raw = c_data.get("stations", c_data) if isinstance(c_data, dict) else {}
				m_raw = m_data.get("stations", m_data) if isinstance(m_data, dict) else {}

				if isinstance(c_raw, list):
					c_keys = {s.get("id", str(idx)) for idx, s in enumerate(c_raw) if isinstance(s, dict)}
				elif isinstance(c_raw, dict):
					c_keys = set(c_raw.keys())
				else:
					c_keys = set()

				if isinstance(m_raw, list):
					m_keys = {s.get("id", str(idx)) for idx, s in enumerate(m_raw) if isinstance(s, dict)}
				elif isinstance(m_raw, dict):
					m_keys = set(m_raw.keys())
				else:
					m_keys = set()

				new_keys = sorted(list(c_keys - m_keys))
				del_keys = sorted(list(m_keys - c_keys))

				delta_info["summary"]["total_cleaned"] = len(c_keys)
				delta_info["summary"]["total_master"] = len(m_keys)
				delta_info["summary"]["new_stations"] = len(new_keys)
				delta_info["summary"]["deleted_stations"] = len(del_keys)
				delta_info["summary"]["modified_stations"] = 0
				delta_info["new_station_keys"] = new_keys
				delta_info["deleted_station_keys"] = del_keys
				delta_info["has_delta"] = bool(new_keys or del_keys)
			except Exception as ex:
				delta_info["error"] = str(ex)

		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(json.dumps(delta_info, indent=2).encode("utf-8"))
	
	
	
	def _ping_portal(self, net_id: str, name: str, url: str) -> dict:
		import urllib.request
		import ssl
		import time
		
		# Windows SSL verification bypass for government transit domains
		ctx = ssl._create_unverified_context()
		headers = {
			"User-Agent": DEFAULT_USER_AGENT,
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
		}
		req = urllib.request.Request(url, headers=headers)
		start_time = time.time()
		try:
			with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
				latency_ms = int((time.time() - start_time) * 1000)
				status_code = response.getcode()
				return {
					"id": net_id,
					"name": name,
					"url": url,
					"status": "online" if status_code < 400 else "degraded",
					"http_status": status_code,
					"latency_ms": latency_ms,
					"error": None
				}
		except Exception as e:
			latency_ms = int((time.time() - start_time) * 1000)
			return {
				"id": net_id,
				"name": name,
				"url": url,
				"status": "offline",
				"http_status": getattr(e, "code", 500),
				"latency_ms": latency_ms,
				"error": str(e)
			}

	def _handle_portals_health(self):
		import json
		import concurrent.futures

		manifest_file = BASE_DIR / "master_audit_manifest.json"
		if not manifest_file.exists():
			self.send_response(404)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"error": "master_audit_manifest.json missing. Cannot resolve transit portal targets."}).encode("utf-8"))
			return

		try:
			with open(manifest_file, "r", encoding="utf-8") as f:
				manifest_data = json.load(f)
		except Exception as e:
			self.send_response(500)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"error": f"Failed to parse master_audit_manifest.json: {str(e)}"}).encode("utf-8"))
			return

		# 100% Dynamic target discovery from manifest
		targets = []
		for net_id, net_obj in manifest_data.get("networks", {}).items():
			name = net_obj.get("name", net_id)
			url = net_obj.get("source_url")
			if not url:
				url = net_obj.get("data_sources", {}).get("stations", {}).get("url")
			
			if url:
				targets.append((net_id, name, url))

		if not targets:
			self.send_response(404)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"error": "No transit networks with valid source_url found in manifest."}).encode("utf-8"))
			return

		# Parallel non-blocking execution across all discovered networks (~1.1s total)
		results = []
		with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, len(targets))) as executor:
			future_to_net = {
				executor.submit(self._ping_portal, n_id, name, url): n_id 
				for n_id, name, url in targets
			}
			for future in concurrent.futures.as_completed(future_to_net):
				try:
					results.append(future.result())
				except Exception as exc:
					results.append({"error": str(exc)})

		total = len(results)
		online = sum(1 for r in results if r.get("status") == "online")
		valid_latencies = [r["latency_ms"] for r in results if r.get("latency_ms") is not None]
		avg_lat = int(sum(valid_latencies) / len(valid_latencies)) if valid_latencies else 0

		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(json.dumps({
			"status": "success",
			"total_portals": total,
			"online_count": online,
			"average_latency_ms": avg_lat,
			"all_operational": (online == total and total > 0),
			"portals": results
		}).encode("utf-8"))
	
	# =========================================================================
	# PIPELINE EXECUTION, CONCURRENCY GUARD & SSE STREAM
	# =========================================================================

	def _resolve_pipeline_command(self, network_id: str, action: str) -> Optional[List[str]]:
		"""
		Directly routes pipeline actions to universal orchestrator CLI files.
		Decoupled: Does NOT rely on fake script paths in manifest.
		"""
		action = action.lower()
		if action in ["sync_all", "sync"] or network_id == "all":
			return [sys.executable, "-u", str(BASE_DIR / "universal_cleaner.py"), "dmrc_delhi"]

		if action in ["fetch_raw", "scraper"]:
			return [sys.executable, "-u", str(BASE_DIR / "universal_scraper.py"), network_id]

		if action in ["fetch_raw_media", "scraper_media"]:
			return [sys.executable, "-u", str(BASE_DIR / "universal_scraper.py"), network_id, "--download-media"]

		if action in ["fetch_fare", "fare_scraper", "fare"]:
			return [sys.executable, "-u", str(BASE_DIR / "universal_fare_scraper.py"), network_id]

		if action in ["clean_process", "clean", "cleaner"]:
			return [sys.executable, "-u", str(BASE_DIR / "universal_cleaner.py"), network_id]

		if action in ["generate_master", "master"]:
			return [sys.executable, "-u", str(BASE_DIR / "master_structure.py"), network_id]

		if action in ["stage_temp", "bridge_temp"]:
			return [sys.executable, "-u", str(BASE_DIR / "production_bridge.py"), network_id, "--prepare-temp"]

		if action in ["port_production", "bridge_port"]:
			return [sys.executable, "-u", str(BASE_DIR / "production_bridge.py"), network_id, "--port-production"]

		if action in ["promote", "bridge_promote"]:
			return [sys.executable, "-u", str(BASE_DIR / "production_bridge.py"), network_id, "--promote"]

		return None


	def _handle_stream(self, query_params: dict):
		"""
		SSE (Server-Sent Events) real-time pipeline log streaming endpoint.
		- Spawns subprocess for scraper, cleaner, master or bridge actions
		- Enforces Concurrency Guard via RUNNING_JOBS and JOBS_LOCK
		- Streams stdout/stderr line-by-line to UI in JSON SSE format
		- Handles client disconnects (BrokenPipeError) safely without server crash
		"""
		network_id = query_params.get("network", "").strip()
		action = query_params.get("action", "").strip()

		self.send_response(200)
		self.send_header("Content-Type", "text/event-stream; charset=utf-8")
		self.send_header("Cache-Control", "no-cache")
		self.send_header("Connection", "keep-alive")
		self.send_header("Access-Control-Allow-Origin", "*")
		self.end_headers()

		cmd = self._resolve_pipeline_command(network_id, action)
		if not cmd:
			err_payload = json.dumps({
				"type": "error",
				"message": f"Unsupported pipeline action '{action}' for network '{network_id}'",
				"exit_code": 1
			})
			try:
				self.wfile.write(f"data: {err_payload}\n\n".encode("utf-8"))
				self.wfile.flush()
			except (BrokenPipeError, ConnectionResetError):
				pass
			return

		# Send start event with command details
		start_payload = json.dumps({
			"type": "start",
			"command": " ".join(cmd),
			"network": network_id,
			"action": action
		})
		try:
			self.wfile.write(f"data: {start_payload}\n\n".encode("utf-8"))
			self.wfile.flush()
		except (BrokenPipeError, ConnectionResetError):
			return

		proc = None
		try:
			proc = subprocess.Popen(
				cmd,
				cwd=str(BASE_DIR),
				stdout=subprocess.PIPE,
				stderr=subprocess.STDOUT,
				text=True,
				encoding="utf-8",
				errors="replace",
				bufsize=1
			)

			with JOBS_LOCK:
				RUNNING_JOBS[network_id] = proc

			for line in proc.stdout:
				line = line.rstrip("\r\n")
				if not line:
					continue
				log_payload = json.dumps({"type": "log", "line": line})
				self.wfile.write(f"data: {log_payload}\n\n".encode("utf-8"))
				self.wfile.flush()

			proc.wait()
			done_payload = json.dumps({
				"type": "done",
				"exit_code": proc.returncode,
				"success": proc.returncode == 0
			})
			self.wfile.write(f"data: {done_payload}\n\n".encode("utf-8"))
			self.wfile.flush()

		except (BrokenPipeError, ConnectionResetError):
			# Client closed the terminal or refreshed the page
			pass
		except Exception as ex:
			err_payload = json.dumps({
				"type": "error",
				"message": f"Pipeline stream execution error: {str(ex)}",
				"exit_code": 1
			})
			try:
				self.wfile.write(f"data: {err_payload}\n\n".encode("utf-8"))
				self.wfile.flush()
			except Exception:
				pass
		finally:
			with JOBS_LOCK:
				if network_id in RUNNING_JOBS:
					del RUNNING_JOBS[network_id]
			if proc and proc.stdout:
				try:
					proc.stdout.close()
				except Exception:
					pass

	def _handle_bridge_status(self, city_id: str):
		city_dir = (BASE_DIR.parent / "main_project" / "data" / "cities" / city_id).resolve()
		staging_dir = (BASE_DIR / ".staging_temp" / city_id).resolve()

		# Check production files
		transit_file = city_dir / "transit_network_auto.json"
		details_file = city_dir / "station_details_auto.json"

		t_exists = transit_file.exists()
		d_exists = details_file.exists()

		# Staging fallback to show live status immediately
		target_t_file = transit_file if t_exists else (staging_dir / "transit_network_auto.json")
		target_d_file = details_file if d_exists else (staging_dir / "station_details_auto.json")

		t_count = 0
		d_count = 0
		if target_t_file.exists():
			try:
				with open(target_t_file, "r", encoding="utf-8") as f:
					t_count = len(json.load(f).get("stations", {}))
			except Exception: pass

		if target_d_file.exists():
			try:
				with open(target_d_file, "r", encoding="utf-8") as f:
					d_data = json.load(f)
					d_count = len([k for k in d_data.keys() if k != "_meta"])
			except Exception: pass

		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(json.dumps({
			"city": city_id,
			"transit_auto_exists": t_exists or target_t_file.exists(),
			"details_auto_exists": d_exists or target_d_file.exists(),
			"transit_stations": t_count,
			"details_stations": d_count
		}).encode("utf-8"))

	def _handle_bridge_inspect(self, city_id: str, network_id: Optional[str] = None, station_id: Optional[str] = None):
		net_id = UniversalFileSystemManager.resolve_network_for_city(city_id, network_id)
		master_file = UniversalFileSystemManager.get_stage_path(net_id, "master")

		city_dir = (BASE_DIR.parent / "main_project" / "data" / "cities" / city_id).resolve()
		staging_dir = (BASE_DIR / ".staging_temp" / city_id).resolve()

		# Resolve auto files
		details_auto_file = None
		transit_auto_file = None
		for candidate in [staging_dir / "station_details_auto.json", city_dir / "station_details_auto.json"]:
			if candidate.exists():
				details_auto_file = candidate
				break
		for candidate in [staging_dir / "transit_network_auto.json", city_dir / "transit_network_auto.json"]:
			if candidate.exists():
				transit_auto_file = candidate
				break

		# Resolve base files
		details_base_file = city_dir / "station_details.json"
		transit_base_file = city_dir / "transit_network.json"

		details_auto = {}
		transit_auto = {}
		details_base = {}
		transit_base = {}

		if details_auto_file and details_auto_file.exists():
			try:
				with open(details_auto_file, "r", encoding="utf-8") as f:
					details_auto = json.load(f)
			except Exception: pass

		if transit_auto_file and transit_auto_file.exists():
			try:
				with open(transit_auto_file, "r", encoding="utf-8") as f:
					transit_auto = json.load(f)
			except Exception: pass

		if details_base_file.exists():
			try:
				with open(details_base_file, "r", encoding="utf-8") as f:
					details_base = json.load(f)
			except Exception: pass

		if transit_base_file.exists():
			try:
				with open(transit_base_file, "r", encoding="utf-8") as f:
					transit_base = json.load(f)
			except Exception: pass

		# Build unified stations catalog with delta status
		auto_details_keys = {k for k in details_auto.keys() if k != "_meta"}
		auto_transit_keys = set()
		if isinstance(transit_auto.get("stations"), dict):
			auto_transit_keys = set(transit_auto["stations"].keys())

		all_delta_slugs = sorted(list(auto_details_keys | auto_transit_keys))
		base_stn_data = transit_base.get("stationData", {}) if isinstance(transit_base, dict) else {}

		stations_catalog = []
		for slug in all_delta_slugs:
			in_details = slug in auto_details_keys
			in_transit = slug in auto_transit_keys
			is_new = (slug not in base_stn_data) and (slug not in details_base)
			stations_catalog.append({
				"slug": slug,
				"is_new": is_new,
				"has_details_delta": in_details,
				"has_transit_delta": in_transit
			})

		# If specific station requested
		if station_id and station_id != "__all__":
			target_slice = {}
			if station_id in details_auto:
				target_slice["station_details_auto"] = details_auto[station_id]
			if isinstance(transit_auto.get("stations"), dict) and station_id in transit_auto["stations"]:
				target_slice["transit_network_auto"] = transit_auto["stations"][station_id]

			master_slice = {}
			if station_id in details_base:
				master_slice["station_details_base"] = details_base[station_id]
			if station_id in base_stn_data:
				master_slice["transit_network_base"] = base_stn_data[station_id]

			self.send_response(200)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({
				"city": city_id,
				"network": net_id,
				"selected_station": station_id,
				"master_source_file": f"Base Production: {station_id}",
				"target_source_file": f"Auto Delta Candidate: {station_id}",
				"master_data": master_slice if master_slice else {"status": f"No base record for '{station_id}' (Brand New Station)"},
				"target_data": target_slice if target_slice else {"status": f"No delta pending for '{station_id}'"},
				"stations_catalog": stations_catalog
			}, indent=2).encode("utf-8"))
			return

		# Default / All Stations overview
		master_data = None
		if master_file.exists():
			try:
				with open(master_file, "r", encoding="utf-8") as f:
					master_data = json.load(f)
			except Exception: pass

		target_data = details_auto if details_auto else transit_auto

		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(json.dumps({
			"city": city_id,
			"network": net_id,
			"selected_station": "__all__",
			"master_source_file": master_file.name if master_file.exists() else None,
			"target_source_file": details_auto_file.name if details_auto_file else (transit_auto_file.name if transit_auto_file else None),
			"master_data": master_data,
			"target_data": target_data,
			"stations_catalog": stations_catalog
		}, indent=2).encode("utf-8"))

	def _handle_merge_single_station(self, city_id: str, station_id: str):
		"""Merges a single station from auto buffer into base files atomically."""
		if not station_id:
			self.send_response(400)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"success": False, "error": "Missing 'station' parameter"}).encode("utf-8"))
			return

		city_dir = (BASE_DIR.parent / "main_project" / "data" / "cities" / city_id).resolve()
		details_auto_file = city_dir / "station_details_auto.json"
		details_base_file = city_dir / "station_details.json"
		transit_auto_file = city_dir / "transit_network_auto.json"
		transit_base_file = city_dir / "transit_network.json"

		auto_data = {}
		if details_auto_file.exists():
			try:
				with open(details_auto_file, "r", encoding="utf-8") as f:
					auto_data = json.load(f)
			except Exception: pass

		base_data = {}
		if details_base_file.exists():
			try:
				with open(details_base_file, "r", encoding="utf-8") as f:
					base_data = json.load(f)
			except Exception: pass

		merged = False
		# 1. Merge in station_details
		if station_id in auto_data and isinstance(auto_data[station_id], dict):
			patch = auto_data.pop(station_id)
			clean_patch = {k: v for k, v in patch.items() if k != "_meta"}
			if station_id not in base_data:
				base_data[station_id] = clean_patch
			else:
				base_data[station_id].update(clean_patch)

			remaining_stns = [k for k in auto_data.keys() if k != "_meta"]
			auto_data.setdefault("_meta", {})["total_delta_stations"] = len(remaining_stns)
			
			UniversalFileSystemManager.save_atomic_tab_json(details_base_file, base_data)
			UniversalFileSystemManager.save_atomic_tab_json(details_auto_file, auto_data)
			merged = True

		# 2. Merge in transit_network if present as a new station
		if transit_auto_file.exists() and transit_base_file.exists():
			try:
				with open(transit_auto_file, "r", encoding="utf-8") as f:
					t_auto = json.load(f)
				stns = t_auto.get("stations", {})
				if station_id in stns:
					stn_graph = stns.pop(station_id)
					with open(transit_base_file, "r", encoding="utf-8") as f:
						t_base = json.load(f)
					t_base.setdefault("stationData", {})[station_id] = stn_graph
					t_auto.setdefault("_meta", {})["total_new_stations"] = len(stns)
					UniversalFileSystemManager.save_atomic_tab_json(transit_base_file, t_base)
					UniversalFileSystemManager.save_atomic_tab_json(transit_auto_file, t_auto)
					merged = True
			except Exception: pass

		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(json.dumps({
			"success": True,
			"merged": merged,
			"station": station_id,
			"remaining_delta": len([k for k in auto_data.keys() if k != "_meta"])
		}).encode("utf-8"))

	def _handle_kill(self, network_id: str):
		network_id = network_id.strip()
		if not network_id:
			self.send_response(400)
			self.send_header("Content-Type", "application/json")
			self.end_headers()
			self.wfile.write(json.dumps({"success": False, "error": "Missing 'network' parameter"}).encode("utf-8"))
			return

		with JOBS_LOCK:
			proc = RUNNING_JOBS.get(network_id)
			if not proc or proc.poll() is not None:
				if network_id in RUNNING_JOBS:
					del RUNNING_JOBS[network_id]
				self.send_response(200)
				self.send_header("Content-Type", "application/json")
				self.end_headers()
				self.wfile.write(json.dumps({
					"success": True,
					"message": f"No active running job found for network '{network_id}'"
				}).encode("utf-8"))
				return

			pid = proc.pid
			try:
				if sys.platform == "win32":
					subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], capture_output=True)
				else:
					proc.kill()
			except Exception as ex:
				self.send_response(500)
				self.send_header("Content-Type", "application/json")
				self.end_headers()
				self.wfile.write(json.dumps({"success": False, "error": f"Failed to terminate PID {pid}: {str(ex)}"}).encode("utf-8"))
				return

			if network_id in RUNNING_JOBS:
				del RUNNING_JOBS[network_id]

		self.send_response(200)
		self.send_header("Content-Type", "application/json")
		self.end_headers()
		self.wfile.write(json.dumps({
			"success": True,
			"message": f"Successfully terminated pipeline job for '{network_id}' (PID {pid})"
		}).encode("utf-8"))


class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
	"""
	Multi-threaded HTTP Server.
	Ensures SSE streaming log threads do not block regular file / API requests.
	"""
	daemon_threads = True
	allow_reuse_address = True


class MetroServer:
	"""
	Server lifecycle manager.
	"""

	def __init__(self, host: str = "0.0.0.0", port: int = PORT):
		self.host = host
		self.port = port
		self.httpd: Optional[ThreadedHTTPServer] = None

	def start(self):
		try:
			self.httpd = ThreadedHTTPServer((self.host, self.port), MetroServerHandler)
			print("=" * 65)
			print(f"🚀 Metro Audit Hub Pipeline Server is RUNNING")
			print(f"📡 Local URL    : http://localhost:{self.port}")
			print(f"📁 Root Dir     : {BASE_DIR}")
			print(f"⚡ Concurrency  : Multi-threaded (SSE stream non-blocking)")
			print(f"🛡️ Safety Guard : Concurrency Lock + Process Kill Active")
			print("=" * 65)
			self.httpd.serve_forever()
		except KeyboardInterrupt:
			print("\n[INFO] Stopping server (KeyboardInterrupt)...")
			self.stop()
		except Exception as e:
			print(f"\n[ERROR] Server failed to start: {e}")

	def stop(self):
		if self.httpd:
			self.httpd.shutdown()
			self.httpd.server_close()
			print("[INFO] Server stopped gracefully.")


if __name__ == "__main__":
	server = MetroServer()
	server.start()


