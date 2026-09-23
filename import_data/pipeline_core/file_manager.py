import hashlib
import json
import re
import threading
from pathlib import Path
from typing import Optional, Dict, Tuple
from .compact_serializer import UniversalCompactJSONSerializer

BASE_DIR = Path(__file__).resolve().parent.parent


class UniversalFileSystemManager:
	"""Centralized File, Path, Registry & Serialization Manager (Single Source of Truth)."""

	BASE_DIR = BASE_DIR

	# ⚡ Thread-Safe In-Memory Cache for Station Counts (mtime-keyed)
	_COUNT_CACHE: Dict[str, Tuple[float, int]] = {}
	_CACHE_LOCK = threading.Lock()

	@classmethod
	def resolve_network_id(cls, network_id: str) -> str:
		"""Resolves shared datasets if configured in manifest."""
		manifest_path = cls.BASE_DIR / "master_audit_manifest.json"
		if manifest_path.exists():
			try:
				with open(manifest_path, "r", encoding="utf-8") as f:
					manifest = json.load(f)
					net_cfg = manifest.get("networks", {}).get(network_id, {})
					shared_id = net_cfg.get("use_shared_dataset_from")
					if shared_id:
						return shared_id
			except Exception:
				pass
		return network_id

	@classmethod
	def resolve_network_for_city(cls, city_id: str, network_id: Optional[str] = None) -> str:
		"""
		Dynamically resolves the target network ID for a city without hardcoding.
		Priority:
		  1. Explicit network_id parameter (if passed)
		  2. Dynamic lookup in india_transit_registry.json
		  3. Dynamic lookup in master_audit_manifest.json
		  4. Sensible fallback
		"""
		if network_id and network_id.strip():
			return network_id.strip()

		clean_city = (city_id or "delhi_ncr").strip().lower()

		# 1. Inspect india_transit_registry.json
		registry_file = cls.BASE_DIR / "india_transit_registry.json"
		if registry_file.exists():
			try:
				with open(registry_file, "r", encoding="utf-8") as f:
					reg = json.load(f)
				city_data = reg.get("cities", {}).get(clean_city, {})
				networks = city_data.get("networks", {})
				for net_key, net_val in networks.items():
					data_path = net_val.get("dataPath", "")
					if data_path:
						folder_name = Path(data_path).name
						if folder_name.endswith("_data"):
							return folder_name[:-5]
						return folder_name
					return net_key
			except Exception:
				pass

		# 2. Inspect master_audit_manifest.json
		manifest_file = cls.BASE_DIR / "master_audit_manifest.json"
		if manifest_file.exists():
			try:
				with open(manifest_file, "r", encoding="utf-8") as f:
					man = json.load(f)
				for nid, ninfo in man.get("networks", {}).items():
					target_city = ninfo.get("city", "").lower().replace("-", "_").replace(" ", "_")
					if clean_city in target_city or target_city in clean_city:
						return nid
			except Exception:
				pass

		return "dmrc_delhi"

	@classmethod
	def get_station_count_cached(cls, file_path: Optional[Path]) -> int:
		"""
		Returns station count with st_mtime in-memory caching.
		Eliminates synchronous disk reads and JSON parsing unless file has changed.
		"""
		if not file_path or not file_path.exists():
			return 0

		try:
			current_mtime = file_path.stat().st_mtime
		except OSError:
			return 0

		path_str = str(file_path.resolve())

		with cls._CACHE_LOCK:
			cached = cls._COUNT_CACHE.get(path_str)
			if cached and cached[0] == current_mtime:
				return cached[1]

		try:
			with open(file_path, "r", encoding="utf-8") as fs:
				d = json.load(fs)
				if isinstance(d, dict):
					stns = d.get("stations", d)
					count = len(stns) if isinstance(stns, (dict, list)) else 0
				elif isinstance(d, list):
					count = len(d)
				else:
					count = 0
		except Exception:
			count = 0

		with cls._CACHE_LOCK:
			cls._COUNT_CACHE[path_str] = (current_mtime, count)

		return count

	@classmethod
	def get_dataset_dir(cls, network_id: str) -> Path:
		"""Returns: datasets/{effective_network_id}_data/"""
		effective_id = cls.resolve_network_id(network_id)
		p = cls.BASE_DIR / "datasets" / f"{effective_id}_data"
		p.mkdir(parents=True, exist_ok=True)
		return p

	@classmethod
	def get_stage_path(cls, network_id: str, stage: str) -> Path:
		"""Returns: datasets/{effective_network_id}_data/{effective_network_id}_{stage}.json"""
		effective_id = cls.resolve_network_id(network_id)
		if stage == "support":
			return cls.get_dataset_dir(effective_id) / "passenger_support.json"
		return cls.get_dataset_dir(effective_id) / f"{effective_id}_{stage}.json"

	@classmethod
	def get_media_dir(cls, network_id: str) -> Path:
		"""Returns: datasets/{effective_network_id}_data/media/"""
		effective_id = cls.resolve_network_id(network_id)
		p = cls.get_dataset_dir(effective_id) / "media"
		p.mkdir(parents=True, exist_ok=True)
		return p

	@classmethod
	def load_stage_json(cls, network_id: str, stage: str) -> Optional[dict]:
		"""Loads and returns parsed JSON if exists, else None."""
		path = cls.get_stage_path(network_id, stage)
		if not path.exists():
			return None
		with open(path, "r", encoding="utf-8") as f:
			return json.load(f)

	@staticmethod
	def slugify(text: str) -> str:
		if not text:
			return "unknown"
		s = text.lower().strip()
		s = re.sub(r"[^\w\s-]", "", s)
		s = re.sub(r"[\s_-]+", "_", s)
		return s.strip("_")

	@staticmethod
	def get_file_sha256(path: Path) -> str:
		if not path.exists() or path.stat().st_size == 0:
			return ""
		h = hashlib.sha256()
		with open(path, "rb") as f:
			while chunk := f.read(65536):
				h.update(chunk)
		return h.hexdigest()

	@classmethod
	def save_atomic_tab_json(cls, target_path: Path, data: dict, compact: bool = False) -> Path:
		target_path.parent.mkdir(parents=True, exist_ok=True)
		temp_file = target_path.with_suffix(".tmp")
		with open(temp_file, "w", encoding="utf-8") as f:
			if compact or target_path.name.endswith("_master.json"):
				f.write(UniversalCompactJSONSerializer.serialize(data) + "\n")
			else:
				json.dump(data, f, indent="\t", ensure_ascii=False)
		temp_file.replace(target_path)
		return target_path