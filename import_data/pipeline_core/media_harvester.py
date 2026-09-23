from pipeline_core.constants import DEFAULT_USER_AGENT


import hashlib
import json
import re
import urllib.parse
from pathlib import Path
import requests
import urllib3
from .file_manager import UniversalFileSystemManager
from .logger import UniversalPipelineLogger

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class UniversalMediaHarvester:
	"""Recursively discovers and downloads all media assets with SHA-256 deduplication."""

	MEDIA_EXTS = (".png", ".jpg", ".jpeg", ".svg", ".webp", ".pdf", ".gif")

	@classmethod
	def harvest(cls, dataset: dict, media_dir: Path, base_domain: str = "", base_dir: Path = None) -> dict:
		UniversalPipelineLogger.log("MEDIA", "==================================================================")
		UniversalPipelineLogger.log("MEDIA", "Universal Media Harvester scanning dataset for assets...")
		UniversalPipelineLogger.log("MEDIA", f"Media Output Directory: {media_dir}")
		UniversalPipelineLogger.log("MEDIA", "==================================================================")

		media_dir.mkdir(parents=True, exist_ok=True)
		manifest_file = media_dir / "media_manifest.json"

		urls = set()

		def walk(val):
			if isinstance(val, dict):
				for v in val.values():
					walk(v)
			elif isinstance(val, list):
				for item in val:
					walk(item)
			elif isinstance(val, str):
				s = val.strip()
				if s.startswith("http://") or s.startswith("https://"):
					if any(s.lower().endswith(ext) or ext in s.lower() for ext in cls.MEDIA_EXTS):
						urls.add(s)
				elif base_domain and (s.startswith("/media/") or (s.startswith("/") and any(s.lower().endswith(ext) for ext in cls.MEDIA_EXTS))):
					clean_path = "/" + s.lstrip("/")
					urls.add(f"{base_domain.rstrip('/')}{clean_path}")

		walk(dataset)
		sorted_urls = sorted(list(urls))
		UniversalPipelineLogger.log("MEDIA", f"Discovered {len(sorted_urls)} unique media asset URLs.")

		session = requests.Session()
		headers = {
			"User-Agent": DEFAULT_USER_AGENT,
			"Accept": "*/*"
		}
		if base_domain:
			headers["Referer"] = base_domain

		manifest = {}
		downloaded, skipped, failed = 0, 0, 0

		for idx, u in enumerate(sorted_urls, start=1):
			raw_fname = Path(urllib.parse.urlparse(u).path).name
			if not raw_fname or "." not in raw_fname:
				raw_fname = f"asset_{idx}.png"

			target_path = media_dir / raw_fname

			try:
				resp = session.get(u, headers=headers, verify=False, timeout=15)
				if resp.status_code == 200:
					content = resp.content
					new_hash = hashlib.sha256(content).hexdigest()

					if target_path.exists() and UniversalFileSystemManager.get_file_sha256(target_path) == new_hash:
						skipped += 1
						UniversalPipelineLogger.log("CACHE", f"[{idx}/{len(sorted_urls)}] Identical hash (Skipped): {raw_fname}")
					else:
						with open(target_path, "wb") as f_out:
							f_out.write(content)
						downloaded += 1
						UniversalPipelineLogger.log("DOWNLOAD", f"[{idx}/{len(sorted_urls)}] Downloaded: {raw_fname}")

					rel_path = str(target_path.relative_to(base_dir) if base_dir and base_dir in target_path.parents else target_path.name).replace("\\", "/")
					manifest[u] = {
						"remote_url": u,
						"filename": target_path.name,
						"local_path": rel_path,
						"sha256": UniversalFileSystemManager.get_file_sha256(target_path)
					}
				else:
					failed += 1
			except Exception:
				failed += 1

		with open(manifest_file, "w", encoding="utf-8") as f:
			json.dump(manifest, f, indent="\t", ensure_ascii=False)

		UniversalPipelineLogger.log("SUCCESS", f"✅ Universal Media Harvesting completed! {downloaded} downloaded, {skipped} skipped, {len(manifest)} mapped.")
		return manifest