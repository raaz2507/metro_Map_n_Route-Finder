#!/usr/bin/env python3
"""
================================================================================
🗜️ Universal Tourist Places Asset Compressor (Offline Production Engine)
================================================================================
Location : import_data/pipeline/compress_tourist_assets.py
Role     : Ingests unscaled master originals from assets/tourist_places_org/
           Resizes with Lanczos to production web/mobile target (default max edge 720px).
           Encodes to optimized WebP (Quality 80).
           Saves lightweight production assets into transit_assets/tourist_places/.
           Updates transit_assets/tourist_places/{city}/media_manifest.json.
Contract : Zero-data-loss, preserves master archive, pure UTF-8.
================================================================================
"""

import argparse
import hashlib
import io
import json
import os
import sys
import time
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


class TouristAssetsCompressor:
	"""
	Batch compresses high-resolution master WebP images from assets/tourist_places_org
	into lightweight runtime assets in transit_assets/tourist_places.
	"""

	def __init__(self, max_edge: int = 720, quality: int = 80, workers: int = 8):
		self.project_root = PROJECT_ROOT
		self.master_base = PROJECT_ROOT / "assets" / "tourist_places_org"
		self.runtime_base = PROJECT_ROOT / "transit_assets" / "tourist_places"
		self.max_edge = max_edge
		self.quality = quality
		self.workers = workers

	def compress_single_image(self, src_path: Path, dst_path: Path, manifest_meta: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
		"""Compresses one WebP image with Lanczos resize and quality 80."""
		try:
			with open(src_path, "rb") as f:
				data = f.read()

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

			dst_path.parent.mkdir(parents=True, exist_ok=True)
			img.save(dst_path, "WEBP", quality=self.quality, method=4)

			size_bytes = os.path.getsize(dst_path)
			with open(dst_path, "rb") as f:
				md5_hash = hashlib.md5(f.read()).hexdigest()

			meta = dict(manifest_meta or {})
			meta["file"] = dst_path.name
			meta["md5"] = md5_hash
			meta["width"] = img.width
			meta["height"] = img.height
			meta["resolution"] = f"{img.width}x{img.height}"
			if "original_resolution" not in meta:
				meta["original_resolution"] = f"{orig_w}x{orig_h}"
			meta["size_bytes"] = size_bytes
			meta["compressed_at"] = time.strftime("%Y-%m-%d %H:%M:%S")

			return meta
		except Exception as e:
			UniversalPipelineLogger.log("ERROR", f"Failed compressing {src_path.name}: {e}")
			return None

	def compress_city(self, city_id: str) -> bool:
		"""Compresses all master images for a city."""
		clean_city = (city_id or "").strip().lower()
		src_city_dir = self.master_base / clean_city
		dst_city_dir = self.runtime_base / clean_city

		if not src_city_dir.exists():
			UniversalPipelineLogger.log("ERROR", f"Master directory not found: {src_city_dir}")
			return False

		dst_city_dir.mkdir(parents=True, exist_ok=True)

		# Read master manifest if present
		master_manifest = {}
		src_man_file = src_city_dir / "media_manifest.json"
		if src_man_file.exists():
			try:
				with open(src_man_file, "r", encoding="utf-8") as f:
					master_manifest = json.load(f)
			except Exception:
				master_manifest = {}

		webp_files = sorted(src_city_dir.glob("*.webp"))
		if not webp_files:
			UniversalPipelineLogger.log("WARN", f"[{clean_city}] No .webp images found in {src_city_dir}")
			return True

		UniversalPipelineLogger.log("INIT", f"[{clean_city}] Compressing {len(webp_files)} images (max_edge={self.max_edge}px, Q={self.quality})...")

		runtime_manifest = {}
		compressed_count = 0
		total_orig_bytes = 0
		total_comp_bytes = 0

		tasks = []
		for f in webp_files:
			pid = f.stem
			total_orig_bytes += f.stat().st_size
			meta = master_manifest.get(pid, {})
			dst_file = dst_city_dir / f.name
			tasks.append((f, dst_file, meta, pid))

		with ThreadPoolExecutor(max_workers=self.workers) as ex:
			fut_map = {ex.submit(self.compress_single_image, s, d, m): p for s, d, m, p in tasks}
			for fut in as_completed(fut_map):
				pid = fut_map[fut]
				res = fut.result()
				if res:
					runtime_manifest[pid] = res
					compressed_count += 1
					total_comp_bytes += res.get("size_bytes", 0)

		# Write runtime media_manifest.json
		dst_man_file = dst_city_dir / "media_manifest.json"
		with open(dst_man_file, "w", encoding="utf-8") as f:
			json.dump(runtime_manifest, f, indent=2, ensure_ascii=False)

		orig_mb = total_orig_bytes / (1024 * 1024)
		comp_mb = total_comp_bytes / (1024 * 1024)
		saved_pct = ((total_orig_bytes - total_comp_bytes) / max(1, total_orig_bytes)) * 100

		UniversalPipelineLogger.log(
			"SUCCESS",
			f"[{clean_city}] {compressed_count} images: {orig_mb:.2f} MB -> {comp_mb:.2f} MB ({saved_pct:.1f}% reduction)"
		)
		return True

	def compress_all(self) -> None:
		"""Compresses all cities found in assets/tourist_places_org/."""
		for cdir in sorted(self.master_base.iterdir()):
			if cdir.is_dir():
				self.compress_city(cdir.name)


def main():
	parser = argparse.ArgumentParser(description="Universal Tourist Places Asset Compressor")
	parser.add_argument("--city", type=str, help="Target city key (e.g. agra, indore, delhi_ncr)")
	parser.add_argument("--all", action="store_true", help="Compress for all available cities")
	parser.add_argument("--max-edge", type=int, default=720, help="Maximum image width/height in px (default: 720)")
	parser.add_argument("--quality", type=int, default=80, help="WebP quality 1-100 (default: 80)")
	parser.add_argument("--workers", type=int, default=8, help="Concurrent compression threads (default: 8)")
	args = parser.parse_args()

	compressor = TouristAssetsCompressor(max_edge=args.max_edge, quality=args.quality, workers=args.workers)
	if args.city:
		success = compressor.compress_city(args.city)
		sys.exit(0 if success else 1)
	elif args.all:
		compressor.compress_all()
	else:
		parser.print_help()


if __name__ == "__main__":
	main()
