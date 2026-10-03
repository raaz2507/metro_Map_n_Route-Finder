r"""
====================================================================================================
📐 Master Data Compact JSON Formatter & Architecture Specification
====================================================================================================
📁 Location:
    main_project_scripts/data_pipeline/format_compact_data_json.py

🎯 Purpose & Scope:
    Strictly a non-destructive JSON beautification & compaction engine.
    Scans transit dataset files across ALL cities or specific target files and renders them into
    clean, ultra-compact, production-grade JSON files suitable for Git diffs and web delivery.

🛡️ Critical Engineering Principles:
    1. ZERO KEY MUTATION:
       Never adds, deletes, renames, or modifies any data values or keys.
    2. 100% DATA EQUIVALENCE ASSERTION:
       Every formatted output is parsed back and verified via `assert orig_data == parsed_check`.
       If even a single byte of data meaning deviates, the write operation is aborted immediately.
    3. PURE INDENTATION & READABILITY:
       Uses tab indentation with intelligent single-line compaction for compact leaves (<= 130 chars).
       Maintains full UTF-8 encoding (no escaped Unicode like \u0905).

🌐 Multi-City & File Targeting:
    - Formats all core dataset files in every city folder:
        • transit_network.json (Stations, lines, coordinates, connections)
        • transit_network_auto.json (Auto-generated delta graphs)
        • station_details.json (Gates, platforms, amenities, nearby places)
        • passenger_support.json (Lost & found, helpline numbers, emergency contacts)

⚙️ Active Compact Formatting Rules:
    1. Fare Tables & Slabs: Weekday/holiday distance & fare slabs on single lines.
    2. Time Rules: Off-peak & operating time definitions on single lines.
    3. Product Labels: Leaf translation objects {"en": "...", "hi": "..."} on single lines.
    4. Line Stations Array: Station sequences `["st1", "st2", "st3"]` kept on single lines.
    5. Geo & Coordinates: Decimal, DMS, properties, train timings compacted on single lines.
    6. Amenity Badges: Icon badge lists kept compact on single lines.
    7. Fare Matrix Rows: 2D integer fare matrix rows formatted horizontally.
    8. Small leaf dictionaries (<= 130 chars) kept compact on 1 line.

💻 Execution & CLI Usage:
    # 1. Format ALL files across ALL cities (Default):
    py format_compact_data_json.py
    py format_compact_data_json.py all

    # 2. Format ALL files for a specific city:
    py format_compact_data_json.py delhi_ncr
    py format_compact_data_json.py mumbai
    py format_compact_data_json.py bangalore

    # 3. Format a single specific JSON file directly:
    py format_compact_data_json.py "path/to/specific_file.json"
====================================================================================================
"""

import os
import sys
import json

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
	sys.stdout.reconfigure(encoding="utf-8")

TARGET_FILES = [
	"transit_network.json",
	"transit_network_auto.json",
	"station_details.json",
	"passenger_support.json"
]

EXCLUDE_CONTAINERS = {
	"stationData", "stations", "lines", "transfers", "fareRules", "defaults",
	"policies", "networks", "platforms", "gates", "parkings", "facilities",
	"nearby_places", "vertical_transit", "lifts", "escalators", "emergency",
	"helplines", "portals", "fareTables", "timeRules", "products"
}

ALWAYS_COMPACT_KEYS = {
	"label", "train_schedule", "decimal", "dms", "properties",
	"coordinates", "contact", "timings", "landmark"
}

def compact_format(obj, indent_level=0, parent_key="", grandparent_key=""):
	ind = "\t" * indent_level
	child_ind = "\t" * (indent_level + 1)

	if isinstance(obj, dict):
		if not obj:
			return "{}"

		# Always compact specific leaf structures
		if parent_key in ALWAYS_COMPACT_KEYS:
			return json.dumps(obj, ensure_ascii=False)

		# FareMatrix rows
		if grandparent_key == "fareMatrix":
			return json.dumps(obj, ensure_ascii=False)

		# Compact leaf dicts (all primitive values) within length limit
		if parent_key not in EXCLUDE_CONTAINERS:
			all_primitive = all(not isinstance(v, (dict, list)) for v in obj.values())
			if all_primitive:
				single_line = json.dumps(obj, ensure_ascii=False)
				if len(single_line) <= 130 and "\n" not in single_line:
					return single_line

		items = []
		for k, v in obj.items():
			formatted_v = compact_format(v, indent_level + 1, k, parent_key)
			items.append(f'{child_ind}{json.dumps(k, ensure_ascii=False)}: {formatted_v}')
		return "{\n" + ",\n".join(items) + "\n" + ind + "}"

	elif isinstance(obj, list):
		if not obj:
			return "[]"

		# Compact stations array or amenity badges
		if parent_key in ["stations", "amenity_badges"]:
			return json.dumps(obj, ensure_ascii=False)

		# 2D matrix rows or lists of primitives within length limit
		all_primitive = all(not isinstance(v, (dict, list)) for v in obj)
		if all_primitive:
			single_line = json.dumps(obj, ensure_ascii=False)
			if len(single_line) <= 130 and "\n" not in single_line:
				return single_line

		single_line = json.dumps(obj, ensure_ascii=False)
		if len(single_line) <= 130 and "\n" not in single_line and parent_key not in EXCLUDE_CONTAINERS:
			return single_line

		items = []
		for item in obj:
			formatted_item = compact_format(item, indent_level + 1, parent_key)
			items.append(f'{child_ind}{formatted_item}')
		return "[\n" + ",\n".join(items) + "\n" + ind + "]"

	else:
		return json.dumps(obj, ensure_ascii=False)

def format_file(file_path):
	"""Reads, formats, validates 100% equivalence, and saves a JSON file."""
	if not os.path.isfile(file_path):
		print(f"⚠️  File not found: {file_path}")
		return False

	orig_size = os.path.getsize(file_path)
	try:
		with open(file_path, "r", encoding="utf-8") as f:
			orig_data = json.load(f)
	except Exception as e:
		print(f"❌ Error parsing JSON in {file_path}: {e}")
		return False

	formatted_output = compact_format(orig_data)

	# Verify 100% Data Equivalence (Zero Key Mutation Guard)
	try:
		parsed_check = json.loads(formatted_output)
		assert orig_data == parsed_check, "Data mismatch detected after formatting!"
	except Exception as e:
		print(f"❌ Aborted: Validation failed for {file_path}: {e}")
		return False

	with open(file_path, "w", encoding="utf-8") as f:
		f.write(formatted_output)

	new_size = os.path.getsize(file_path)
	line_count = formatted_output.count("\n") + 1
	rel_path = os.path.relpath(file_path)
	diff_kb = (new_size - orig_size) / 1024
	print(f"  ✓ {rel_path} [{line_count} lines, {new_size/1024:.1f} KB, diff: {diff_kb:+.1f} KB] (Verified 100% Equivalent)")
	return True

def format_city(city_dir):
	"""Formats all target JSON files in a city directory."""
	city_name = os.path.basename(city_dir)
	print(f"\n📂 Processing City: {city_name}")
	count = 0
	for filename in TARGET_FILES:
		filepath = os.path.join(city_dir, filename)
		if os.path.exists(filepath):
			if format_file(filepath):
				count += 1
	return count

def main():
	# Resolve robust paths relative to script location
	script_dir = os.path.dirname(os.path.abspath(__file__))
	project_root = os.path.abspath(os.path.join(script_dir, "..", "..", "main_project"))
	base_dir = os.path.join(project_root, "data")
	
	# Support country argument: python format_compact_data_json.py india [city]
	country_key = "india"
	cities_dir = os.path.join(base_dir, country_key, "cities")


	arg = sys.argv[1] if len(sys.argv) > 1 else "all"
	print("=" * 70)
	print("🚇 Master Data Compact JSON Formatter (Zero Key Mutation Guard)")
	print("=" * 70)

	# Case 1: Specific file directly provided
	if os.path.isfile(arg):
		format_file(os.path.abspath(arg))
		print("\n✨ Done!")
		return

	# Case 2: Specific city or all cities
	if arg.lower() in ["all", "*"]:
		if not os.path.exists(cities_dir):
			print(f"❌ Cities directory not found: {cities_dir}")
			return
		total = 0
		for item in sorted(os.listdir(cities_dir)):
			full_item = os.path.join(cities_dir, item)
			if os.path.isdir(full_item):
				total += format_city(full_item)
		print(f"\n✨ Successfully formatted {total} datasets across all cities!")
	else:
		# Single city
		city_dir = os.path.join(cities_dir, arg)
		if os.path.isdir(city_dir):
			total = format_city(city_dir)
			print(f"\n✨ Successfully formatted {total} datasets for '{arg}'!")
		else:
			print(f"❌ City directory not found: {city_dir}")

if __name__ == "__main__":
	main()