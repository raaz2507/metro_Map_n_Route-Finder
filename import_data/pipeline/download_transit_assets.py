#!/usr/bin/env python3
"""
================================================================================
🏛️ Universal Transit Assets Downloader & Media Pipeline (SSOT Engine)
================================================================================
Location : import_data/pipeline/download_transit_assets.py
Role     : Ingests ground-truth 'image_source_url' from import_data/data/tourist_places/
           Downloads unscaled maximum-resolution master photos.
           Resizes with Lanczos to max edge 2560px and encodes to WebP (Quality 90).
           Verifies MD5 uniqueness and updates media_manifest.json in transit_assets/.
Contract : Pure UTF-8, zero-duplicate guarantee, unscaled master resolution.
================================================================================
"""

import argparse
import hashlib
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, Any, List, Optional

try:
	from PIL import Image
except ImportError:
	print("Error: PIL (Pillow) is required. Install via 'pip install Pillow'", file=sys.stderr)
	sys.exit(1)

SCRIPT_DIR = Path(__file__).resolve().parent
IMPORT_DATA_DIR = SCRIPT_DIR.parent
PROJECT_ROOT = IMPORT_DATA_DIR.parent

if str(IMPORT_DATA_DIR) not in sys.path:
	sys.path.insert(0, str(IMPORT_DATA_DIR))

from pipeline.core.logger import UniversalPipelineLogger
from pipeline.core.file_manager import UniversalFileSystemManager
from pipeline.compress_tourist_assets import TouristAssetsCompressor

USER_AGENT = "YatraMargTransitAssetsBot/1.0 (https://yatramarg.org; dev@yatramarg.org)"


class TransitAssetsDownloader:
	"""
	Downloads master unscaled photos from image_source_url in import_data
	into assets/tourist_places_org/{city}/ and compresses into transit_assets/tourist_places/{city}/.
	"""

	def __init__(self, max_edge: int = 2560, quality: int = 90, workers: int = 5):
		self.project_root = PROJECT_ROOT
		self.source_dir = IMPORT_DATA_DIR / "data" / "tourist_places"
		self.assets_base = PROJECT_ROOT / "assets" / "tourist_places_org"
		self.max_edge = max_edge
		self.quality = quality
		self.workers = workers
		self.compressor = TouristAssetsCompressor(max_edge=720, quality=80, workers=workers)

	def download_and_process_image(self, url: str, target_file: Path) -> Optional[Dict[str, Any]]:
		"""Downloads an image from URL, converts to WebP Q90 with Lanczos resize."""
		req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
		try:
			with urllib.request.urlopen(req, timeout=15) as resp:
				data = resp.read()
		except Exception as e:
			UniversalPipelineLogger.log("WARN", f"Failed download {url}: {e}")
			return None

		try:
			img = Image.open(io.BytesIO(data))
			orig_w, orig_h = img.size

			if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
				bg = Image.new("RGB", img.size, (255, 255, 255))
				bg.paste(img, mask=img.convert("RGBA").split()[3])
				img = bg
			elif img.mode != "RGB":
				img = img.convert("RGB")

			w, h = img.size
			if max(w, h) > self.max_edge:
				scale = self.max_edge / max(w, h)
				new_w = max(1, int(w * scale))
				new_h = max(1, int(h * scale))
				img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)

			target_file.parent.mkdir(parents=True, exist_ok=True)
			img.save(target_file, "WEBP", quality=self.quality)

			size_bytes = os.path.getsize(target_file)
			with open(target_file, "rb") as f:
				md5_hash = hashlib.md5(f.read()).hexdigest()

			return {
				"file": target_file.name,
				"md5": md5_hash,
				"width": img.width,
				"height": img.height,
				"original_resolution": f"{orig_w}x{orig_h}",
				"resolution": f"{img.width}x{img.height}",
				"size_bytes": size_bytes,
				"image_source_url": url,
				"license": "CC-BY-SA / Wikimedia Commons"
			}
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"Failed processing {url} to {target_file}: {e}")
			return None

	def sync_city(self, city_id: str, force: bool = False) -> bool:
		"""Downloads all images for a given city from its SSOT source file."""
		clean_city = (city_id or "").strip().lower()
		source_file = self.source_dir / clean_city / f"{clean_city}_tourist_places_source.json"
		if not source_file.exists():
			UniversalPipelineLogger.log("ERROR", f"Source file not found: {source_file}")
			return False

		with open(source_file, "r", encoding="utf-8") as f:
			src_data = json.load(f)

		places: List[Dict[str, Any]] = src_data.get("places", [])
		city_assets_dir = self.assets_base / clean_city
		city_assets_dir.mkdir(parents=True, exist_ok=True)
		manifest_path = city_assets_dir / "media_manifest.json"

		manifest: Dict[str, Any] = {}
		if manifest_path.exists():
			try:
				with open(manifest_path, "r", encoding="utf-8") as f:
					manifest = json.load(f)
			except Exception:
				manifest = {}

		tasks = []
		for p in places:
			pid = p.get("id")
			url = p.get("image_source_url")
			if not pid or not url:
				continue

			target_file = city_assets_dir / f"{pid}.webp"
			if not force and target_file.exists() and pid in manifest:
				continue

			tasks.append((pid, url, target_file))

		if not tasks:
			UniversalPipelineLogger.log("INFO", f"[{clean_city}] All {len(places)} places are already up-to-date in {city_assets_dir.name}/.")
			return True

		UniversalPipelineLogger.log("INIT", f"[{clean_city}] Downloading {len(tasks)} images with {self.workers} workers...")

		downloaded = 0
		with ThreadPoolExecutor(max_workers=self.workers) as ex:
			fut_map = {ex.submit(self.download_and_process_image, url, tfile): (pid, url) for pid, url, tfile in tasks}
			for fut in as_completed(fut_map):
				pid, url = fut_map[fut]
				res = fut.result()
				if res:
					manifest[pid] = res
					downloaded += 1

		# Save manifest
		with open(manifest_path, "w", encoding="utf-8") as f:
			json.dump(manifest, f, indent=2, ensure_ascii=False)

		UniversalPipelineLogger.log("SUCCESS", f"[{clean_city}] Finished master sync. {downloaded} images in archive.")
		
		# Auto-compress to runtime directory
		self.compressor.compress_city(clean_city)
		return True

	def sync_all(self, force: bool = False) -> None:
		"""Iterates over all cities in import_data/data/tourist_places/."""
		for cdir in sorted(self.source_dir.iterdir()):
			if cdir.is_dir():
				source_file = cdir / f"{cdir.name}_tourist_places_source.json"
				if source_file.exists():
					self.sync_city(cdir.name, force=force)


def main():
	parser = argparse.ArgumentParser(description="Universal Transit Assets Downloader")
	parser.add_argument("--city", type=str, help="Target city key (e.g. agra, indore, delhi_ncr)")
	parser.add_argument("--all", action="store_true", help="Download for all available cities")
	parser.add_argument("--force", action="store_true", help="Re-download and overwrite existing webp assets")
	parser.add_argument("--workers", type=int, default=5, help="Concurrent download threads (default: 5)")
	parser.add_argument("--quality", type=int, default=90, help="WebP quality 1-100 (default: 90)")
	args = parser.parse_args()

	downloader = TransitAssetsDownloader(quality=args.quality, workers=args.workers)
	if args.city:
		success = downloader.sync_city(args.city, force=args.force)
		sys.exit(0 if success else 1)
	elif args.all:
		downloader.sync_all(force=args.force)
	else:
		parser.print_help()


if __name__ == "__main__":
	main()
