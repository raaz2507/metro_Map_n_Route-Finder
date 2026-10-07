import os
import sys
import json
import math
import re

"""
========================================================================================
🚇 YATRAMARG — GEO-COORDINATES COMPARISON & CORRUPTION DETECTOR TOOL
========================================================================================

Author: Senior Pair Programmer (YatraMarg Core Team)
Scope: Compares existing main_project/data/india/cities coordinates against ground-truth
	   benchmark coordinates from temp_working files/geo_benchmark_test/india/cities.

Key Capabilities:
1. Calculates mathematical distance delta (in meters & kilometers) using Haversine formula.
2. Identifies severe data corruptions (e.g., Lat pasted into Lon, swapped coords, 5000+ km drift).
3. Pure runtime reporting: DOES NOT modify or create files on disk.
4. Interactive console menu or direct CLI arguments (--all or <city>).
========================================================================================
"""

# Mapping between main_project city folder and benchmark city folder/file
CITY_MAPPINGS = [
	{
		"key": "kanpur",
		"name": "Kanpur Metro",
		"main_folder": "kanpur",
		"main_file": "transit_network.json",
		"bench_folder": "kanpur_metro_data",
		"bench_file": "kanpur_station_google_map_coordinates.json"
	},
	{
		"key": "bhopal",
		"name": "Bhopal Metro",
		"main_folder": "bhopal",
		"main_file": "transit_network.json",
		"bench_folder": "bhopal_metro_data",
		"bench_file": "bhopal_station_google_map_coordinates.json"
	},
	{
		"key": "chennai",
		"name": "Chennai Metro",
		"main_folder": "chennai",
		"main_file": "transit_network.json",
		"bench_folder": "chennai_metro_data",
		"bench_file": "chennai_station_google_map_coordinates.json"
	},
	{
		"key": "indore",
		"name": "Indore Metro",
		"main_folder": "indore",
		"main_file": "transit_network.json",
		"bench_folder": "indore_metro_data",
		"bench_file": "indore_station_google_map_coordinates.json"
	},
	{
		"key": "kochi",
		"name": "Kochi Metro",
		"main_folder": "kochi",
		"main_file": "transit_network.json",
		"bench_folder": "kochi_metro_data",
		"bench_file": "kochi_station_google_map_coordinates.json"
	},
	{
		"key": "lucknow",
		"name": "Lucknow Metro",
		"main_folder": "lucknow",
		"main_file": "transit_network.json",
		"bench_folder": "lucknow_metro_data",
		"bench_file": "lucknow_station_google_map_coordinates.json"
	},
	{
		"key": "mumbai",
		"name": "Mumbai Metro",
		"main_folder": "mumbai",
		"main_file": "transit_network.json",
		"bench_folder": "mumbai_metro_data",
		"bench_file": "mumbai_station_google_map_coordinates.json"
	},
	{
		"key": "mumbai_monorail",
		"name": "Mumbai Monorail",
		"main_folder": "mumbai",
		"main_file": "transit_network.json",
		"bench_folder": "mumbai_monorail_data",
		"bench_file": "mumbai_monorail_station_google_map_coordinates.json"
	},
	{
		"key": "nagpur",
		"name": "Nagpur Metro",
		"main_folder": "nagpur",
		"main_file": "transit_network.json",
		"bench_folder": "nagpur_metro_data",
		"bench_file": "nagpur_station_google_map_coordinates.json"
	},
	{
		"key": "delhi_ncr_nmrc",
		"name": "Delhi NCR (Noida Aqua Line)",
		"main_folder": "delhi_ncr",
		"main_file": "transit_network.json",
		"bench_folder": "nmrc_noida_data",
		"bench_file": "noida_station_google_map_coordinates.json"
	},
	{
		"key": "delhi_ncr_dmrc",
		"name": "Delhi NCR (DMRC & Airport Line)",
		"main_folder": "delhi_ncr",
		"main_file": "transit_network.json",
		"bench_folder": "dmrc_delhi_data",
		"bench_file": "delhi_station_google_map_coordinates.json"
	},
	{
		"key": "delhi_ncr_rrts",
		"name": "Delhi NCR (Namo Bharat RRTS)",
		"main_folder": "delhi_ncr",
		"main_file": "transit_network.json",
		"bench_folder": "ncrtc_rrts_data",
		"bench_file": "ncrtc_station_google_map_coordinates.json"
	},
	{
		"key": "bengaluru",
		"name": "Bengaluru (Namma Metro)",
		"main_folder": "bengaluru",
		"main_file": "transit_network.json",
		"bench_folder": "namma_metro_data",
		"bench_file": "bengaluru_station_google_map_coordinates.json"
	},
	{
		"key": "hyderabad",
		"name": "Hyderabad Metro",
		"main_folder": "hyderabad",
		"main_file": "transit_network.json",
		"bench_folder": "hyderabad_metro_data",
		"bench_file": "hyderabad_station_google_map_coordinates.json"
	},
	{
		"key": "kolkata",
		"name": "Kolkata Metro",
		"main_folder": "kolkata",
		"main_file": "transit_network.json",
		"bench_folder": "kolkata_metro_data",
		"bench_file": "kolkata_station_google_map_coordinates.json"
	},
	{
		"key": "pune",
		"name": "Pune Metro",
		"main_folder": "pune",
		"main_file": "transit_network.json",
		"bench_folder": "pune_metro_data",
		"bench_file": "pune_station_google_map_coordinates.json"
	},
	{
		"key": "jaipur",
		"name": "Jaipur Metro",
		"main_folder": "jaipur",
		"main_file": "transit_network.json",
		"bench_folder": "jaipur_metro_data",
		"bench_file": "jaipur_station_google_map_coordinates.json"
	},
	{
		"key": "ahmedabad",
		"name": "Ahmedabad Metro",
		"main_folder": "ahmedabad_gandhinagar",
		"main_file": "transit_network.json",
		"bench_folder": "ahmedabad_metro_data",
		"bench_file": "ahmedabad_station_google_map_coordinates.json"
	},
	{
		"key": "agra",
		"name": "Agra Metro",
		"main_folder": "agra",
		"main_file": "transit_network.json",
		"bench_folder": "agra_metro_data",
		"bench_file": "agra_station_google_map_coordinates.json"
	},
	{
		"key": "navi_mumbai",
		"name": "Navi Mumbai Metro",
		"main_folder": "mumbai",
		"main_file": "transit_network.json",
		"bench_folder": "navi_mumbai_metro_data",
		"bench_file": "navi_mumbai_station_google_map_coordinates.json"
	}
]


def haversine_distance_meters(lat1, lon1, lat2, lon2):
	"""Calculates distance between two lat/lon points on Earth in meters."""
	R = 6371000  # meters
	phi1 = math.radians(lat1)
	phi2 = math.radians(lat2)
	delta_phi = math.radians(lat2 - lat1)
	delta_lambda = math.radians(lon2 - lon1)

	a = (math.sin(delta_phi / 2.0) ** 2 +
		 math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
	c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
	return R * c


class GeoComparator:
	"""Core comparison engine between main_project and benchmark coordinates."""

	def __init__(self):
		self.script_dir = os.path.dirname(os.path.abspath(__file__))
		self.project_root = os.path.abspath(os.path.join(self.script_dir, "..", ".."))
		self.main_data_dir = os.path.join(self.project_root, "main_project", "data", "india", "cities")
		self.bench_data_dir = os.path.join(self.script_dir, "india", "cities")

	def _load_main_project_stations(self, city_cfg):
		"""Loads stations from main_project/data/india/cities/<city>/transit_network.json."""
		file_path = os.path.join(self.main_data_dir, city_cfg["main_folder"], city_cfg["main_file"])
		if not os.path.exists(file_path):
			return None

		with open(file_path, "r", encoding="utf-8") as f:
			data = json.load(f)

		station_dict = {}
		for s_id, s_obj in data.get("stationData", {}).items():
			loc = s_obj.get("location", {})
			decimal = loc.get("decimal") if isinstance(loc, dict) else None
			lat, lon = None, None
			if decimal and isinstance(decimal, dict):
				lat = decimal.get("lat")
				lon = decimal.get("lon")

			name_field = s_obj.get("name")
			name_en = name_field.get("en", s_id) if isinstance(name_field, dict) else str(name_field or s_id)

			station_dict[s_id] = {
				"name": name_en,
				"lat": lat,
				"lon": lon
			}
		return station_dict

	def _load_benchmark_stations(self, city_cfg):
		"""Loads stations from temp_working files/geo_benchmark_test/india/cities/<city>/...json."""
		file_path = os.path.join(self.bench_data_dir, city_cfg["bench_folder"], city_cfg["bench_file"])
		if not os.path.exists(file_path):
			return None

		with open(file_path, "r", encoding="utf-8") as f:
			records = json.load(f)

		station_dict = {}
		for r in records:
			s_id = r.get("station_id")
			coords = r.get("coordinates") or {}
			station_dict[s_id] = {
				"name": r.get("name", s_id),
				"lat": coords.get("lat"),
				"lon": coords.get("lon"),
				"url": r.get("generated_google_maps_url")
			}
		return station_dict

	def compare_city(self, city_cfg):
		"""Compares coordinates for a single city and prints structured findings."""
		main_stations = self._load_main_project_stations(city_cfg)
		bench_stations = self._load_benchmark_stations(city_cfg)

		print("\n=========================================================================================")
		print(f" [*] CITY COMPARISON: {city_cfg['name']} (Key: {city_cfg['key']})")
		print("=========================================================================================")

		if main_stations is None:
			print(f" [!] Main project file missing: main_project/data/india/cities/{city_cfg['main_folder']}/{city_cfg['main_file']}")
			return
		if bench_stations is None:
			print(f" [!] Benchmark file not yet generated: temp_working files/.../{city_cfg['bench_folder']}/{city_cfg['bench_file']}")
			print("     (Run extraction for this city first via city_geo_extractor.py)")
			return

		# Scorecard counters
		exact_matches = 0
		minor_offsets = 0
		major_offsets = 0
		critical_corrupt = 0
		missing_old = 0
		missing_bench = 0

		# Build lookup indexes for smart matching (Direct ID -> Normalized ID -> Normalized Name)
		def normalize_str(s):
			return re.sub(r'[^a-z0-9]', '', str(s).lower().replace("greater_noida", "").replace("noida", ""))

		bench_by_norm_id = {}
		bench_by_norm_name = {}
		for b_id, b_data in bench_stations.items():
			norm_id = normalize_str(b_id)
			norm_name = normalize_str(b_data["name"])
			bench_by_norm_id[norm_id] = (b_id, b_data)
			bench_by_norm_name[norm_name] = (b_id, b_data)

		# Header format
		print(f" {'Station Name':<28} | {'Delta Distance':<15} | {'Status':<14} | Notes")
		print("-" * 89)

		matched_bench_ids = set()

		for s_id, old_data in sorted(main_stations.items(), key=lambda x: x[1]["name"]):
			name = old_data["name"][:28]
			old_lat = old_data["lat"]
			old_lon = old_data["lon"]

			# 1. Exact ID match
			new_data = bench_stations.get(s_id)
			matched_b_id = s_id if new_data else None

			# 2. Normalized ID match (e.g., alpha_1 vs alpha_1_greater_noida)
			if not new_data:
				norm_s_id = normalize_str(s_id)
				if norm_s_id in bench_by_norm_id:
					matched_b_id, new_data = bench_by_norm_id[norm_s_id]

			# 3. Normalized Name match
			if not new_data:
				norm_name = normalize_str(old_data["name"])
				if norm_name in bench_by_norm_name:
					matched_b_id, new_data = bench_by_norm_name[norm_name]

			if not new_data:
				# If city has over 100 stations and this is an unrelated network (like DMRC vs NMRC benchmark),
				# skip spamming the screen unless it's a small network.
				if len(main_stations) > 50:
					continue
				print(f" {name:<28} | {'-':<15} | {'[NOT_IN_BENCH]':<14} | Missing in benchmark dataset")
				missing_bench += 1
				continue

			matched_bench_ids.add(matched_b_id)

			new_lat = new_data["lat"]
			new_lon = new_data["lon"]

			# If either coordinate is missing/null
			if old_lat is None or old_lon is None:
				print(f" {name:<28} | {'-':<15} | {'[MISSING_OLD]':<14} | Main project had no coords")
				missing_old += 1
				continue
			if new_lat is None or new_lon is None:
				print(f" {name:<28} | {'-':<15} | {'[BENCH_NULL]':<14} | Benchmark has null coords")
				continue

			# Calculate mathematical drift
			dist_m = haversine_distance_meters(old_lat, old_lon, new_lat, new_lon)

			# Categorize status
			if dist_m <= 50:
				status = "[MATCH]"
				dist_str = f"{dist_m:.1f} m"
				notes = "Identical (< 50m)"
				exact_matches += 1
			elif dist_m <= 500:
				status = "[OFFSET]"
				dist_str = f"{dist_m:.1f} m"
				notes = "Minor gate/exit shift (< 500m)"
				minor_offsets += 1
			elif dist_m <= 5000:
				status = "[MODERATE]"
				dist_str = f"{dist_m / 1000.0:.2f} km"
				notes = "Noticeable offset (0.5 - 5 km)"
				major_offsets += 1
			else:
				status = "[CRITICAL!]"
				dist_str = f"{dist_m / 1000.0:.1f} km"
				notes = f"CORRUPTED! Old: ({old_lat}, {old_lon}) vs New: ({new_lat:.4f}, {new_lon:.4f})"
				critical_corrupt += 1

			print(f" {name:<28} | {dist_str:<15} | {status:<14} | {notes}")

		# Summary box
		print("-" * 89)
		print(" [*] SUMMARY SCORECARD:")
		print(f"    - Exact Matches (<= 50m)      : {exact_matches}")
		print(f"    - Minor Offsets (50m - 500m)   : {minor_offsets}")
		print(f"    - Moderate Drift (0.5 - 5 km)  : {major_offsets}")
		print(f"    - CRITICAL CORRUPTIONS (> 5km) : {critical_corrupt}")
		if missing_old > 0:
			print(f"    - Missing in Main Project      : {missing_old}")
		print("=========================================================================================\n")

	def run_all(self):
		"""Runs comparison sequentially across all available cities."""
		print("\n=========================================================================================")
		print(" [*] RUNNING GEO-COORDINATE AUDIT ACROSS ALL CONFIGURED CITIES")
		print("=========================================================================================")
		for city_cfg in CITY_MAPPINGS:
			self.compare_city(city_cfg)

	def interactive_menu(self):
		"""Interactive console loop allowing users to easily choose which city to compare."""
		while True:
			print("\n======================================================================")
			print("       YATRAMARG - GEO-COORDINATE AUDIT & COMPARISON TOOL")
			print("======================================================================")
			print("  [0]  AUDIT ALL CITIES (Global Comparison)")
			print("----------------------------------------------------------------------")
			for idx, c in enumerate(CITY_MAPPINGS, start=1):
				print(f"  [{idx:2d}] {c['name']:<25} (Key: {c['key']})")
			print("----------------------------------------------------------------------")
			print("  [Q]  Quit / Exit")
			print("======================================================================")

			try:
				choice = input("Enter City Number or '0' for All: ").strip().upper()
			except (KeyboardInterrupt, EOFError):
				print("\n\n Exiting.")
				break

			if not choice:
				continue

			if choice in ["Q", "QUIT", "EXIT"]:
				print("\n Exiting Comparison Tool. Goodbye!")
				break

			if choice == "0":
				self.run_all()
				continue

			if not choice.isdigit():
				# Allow typing key name directly like 'kanpur'
				matched = [c for c in CITY_MAPPINGS if c["key"].lower() == choice.lower()]
				if matched:
					self.compare_city(matched[0])
					continue
				print(f"\n [!] Invalid choice '{choice}'. Please select a valid number or city key.")
				continue

			num = int(choice)
			if 1 <= num <= len(CITY_MAPPINGS):
				self.compare_city(CITY_MAPPINGS[num - 1])
			else:
				print(f"\n [!] Number out of range. Choose between 0 and {len(CITY_MAPPINGS)}.")


def main():
	comparator = GeoComparator()
	if len(sys.argv) > 1:
		arg = sys.argv[1].strip().lower()
		if arg in ["--all", "-a", "all"]:
			comparator.run_all()
		else:
			matched = [c for c in CITY_MAPPINGS if c["key"].lower() == arg]
			if matched:
				comparator.compare_city(matched[0])
			else:
				print(f" [!] Unknown city '{arg}'. Available keys: {[c['key'] for c in CITY_MAPPINGS]}")
				sys.exit(1)
	else:
		comparator.interactive_menu()


if __name__ == "__main__":
	main()
