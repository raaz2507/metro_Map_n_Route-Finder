"""
Pipeline Execution & Process Management Service (OOP)
Location: import_data/server_core/services/pipeline_service.py
"""
import sys
import json
import asyncio
import threading
from typing import Dict, Optional, List, AsyncGenerator, Any
from ..config import CONFIG_DIR, BASE_DIR


class PipelineExecutionService:
	"""
	Thread-safe service managing subprocess execution,
	Server-Sent Events (SSE) log streaming, and process termination.
	"""
	_running_jobs: Dict[str, asyncio.subprocess.Process] = {}
	_lock = threading.Lock()

	@classmethod
	def resolve_command(cls, network_id: str, action: str) -> Optional[List[str]]:
		"""Resolves CLI command args based on network and action type in new pipeline directory layout."""
		action = action.lower()
		stage1_dir = BASE_DIR / "pipeline" / "stage1_scrapers"
		stage2_dir = BASE_DIR / "pipeline" / "stage2_cleaners"
		stage3_dir = BASE_DIR / "pipeline" / "stage3_structures"
		stage4_dir = BASE_DIR / "pipeline" / "stage4_bridge"

		if action in ["sync_all", "sync"] or network_id == "all":
			return [sys.executable, "-u", str(stage2_dir / "universal_cleaner.py"), "dmrc_delhi"]
		if action in ["fetch_raw", "scraper"]:
			return [sys.executable, "-u", str(stage1_dir / "universal_scraper.py"), network_id]
		if action in ["fetch_raw_media", "scraper_media"]:
			return [sys.executable, "-u", str(stage1_dir / "universal_scraper.py"), network_id, "--download-media"]
		if action in ["fetch_fare", "fare_scraper", "fare"]:
			return [sys.executable, "-u", str(stage1_dir / "universal_fare_scraper.py"), network_id]
		if action in ["clean_process", "clean", "cleaner"]:
			return [sys.executable, "-u", str(stage2_dir / "universal_cleaner.py"), network_id]
		if action in ["generate_master", "master"]:
			return [sys.executable, "-u", str(stage3_dir / "master_structure.py"), network_id]
		if action in ["stage_temp", "bridge_temp"]:
			return [sys.executable, "-u", str(stage4_dir / "production_bridge.py"), network_id, "--prepare-temp"]
		if action in ["port_production", "bridge_port"]:
			return [sys.executable, "-u", str(stage4_dir / "production_bridge.py"), network_id, "--port-production"]
		if action in ["promote", "bridge_promote"]:
			return [sys.executable, "-u", str(stage4_dir / "production_bridge.py"), network_id, "--promote"]
		return None

	@classmethod
	async def stream_pipeline(cls, network: str, action: str) -> AsyncGenerator[str, None]:
		"""Executes CLI command in background and yields SSE log stream events."""
		cmd = cls.resolve_command(network, action)
		if not cmd:
			yield f"data: {json.dumps({'type': 'error', 'message': f'Unsupported action {action}'})}\n\n"
			return

		yield f"data: {json.dumps({'type': 'start', 'command': ' '.join(cmd), 'network': network, 'action': action})}\n\n"

		import subprocess

		loop = asyncio.get_running_loop()
		queue = asyncio.Queue()

		def run_proc():
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
				with cls._lock:
					cls._running_jobs[network] = proc

				for line in iter(proc.stdout.readline, ""):
					clean_line = line.rstrip("\r\n")
					if clean_line:
						loop.call_soon_threadsafe(queue.put_nowait, ("log", clean_line))

				proc.stdout.close()
				ret_code = proc.wait()
				loop.call_soon_threadsafe(queue.put_nowait, ("done", ret_code))
			except Exception as ex:
				loop.call_soon_threadsafe(queue.put_nowait, ("error", str(ex)))

		# Launch worker thread for subprocess
		threading.Thread(target=run_proc, daemon=True).start()

		try:
			while True:
				msg_type, val = await queue.get()
				if msg_type == "log":
					yield f"data: {json.dumps({'type': 'log', 'line': val})}\n\n"
				elif msg_type == "done":
					yield f"data: {json.dumps({'type': 'done', 'exit_code': val, 'success': val == 0})}\n\n"
					break
				elif msg_type == "error":
					yield f"data: {json.dumps({'type': 'error', 'message': val})}\n\n"
					break
		finally:
			with cls._lock:
				if network in cls._running_jobs:
					del cls._running_jobs[network]

	@classmethod
	def kill_process(cls, network: str) -> Dict[str, Any]:
		"""Terminates an in-flight background job."""
		with cls._lock:
			proc = cls._running_jobs.get(network)
			if not proc or proc.returncode is not None:
				if network in cls._running_jobs:
					del cls._running_jobs[network]
				return {"success": True, "message": f"No active job for '{network}'"}

			try:
				proc.kill()
				del cls._running_jobs[network]
				return {"success": True, "message": f"Terminated job for '{network}'"}
			except Exception as ex:
				return {"success": False, "error": str(ex)}