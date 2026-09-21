"""
Universal Transit Search Index Pre-Computation Engine (Inverted Index DSA)
==========================================================================
Location: main_project/data/build_search_index.py

Purpose:
--------
Scans multi-city transit datasets (transit_network.json + station_details.json + auto deltas)
and builds an O(1) Inverted Index JSON mapping:
  - `tokens`: word -> [item_ids] (Instant token lookup)
  - `cities`: cityKey -> [item_ids] (Instant city scoping)
  - `items` : item_id -> item metadata

Target Output:
--------------
  - main_project/data/search_cache/transit_search_index.json (Production Frontend Cache)

Usage:
------
	python main_project/data/build_search_index.py
"""

import os
import json
import re
import sys
import shutil

# Configure UTF-8 for console output
sys.stdout.reconfigure(encoding="utf-8")

CATEGORY_ICONS = {
	"Station": "🚇",
	"Network": "🌐",
	"Hospital": "🏥",
	"Tourist Place": "🏛️",
	"Religious Place": "🛕",
	"Mall": "🛍️",
	"Market": "🛒",
	"University/College": "🎓",
	"School": "🏫",
	"Airport": "✈️",
	"Railway Station": "🚆",
	"Bus Stand": "🚌",
	"Bus Adda": "🚏",
	"Cinema Hall": "🎬",
	"Stadium / Sports": "🏟️",
	"Government Offices": "🏛️",
	"Court": "⚖️",
	"Police Station": "👮",
	"Fire Station": "🚒",
	"Bank": "🏦",
	"Hotels": "🏨",
	"Restaurant": "🍽️",
	"Locality": "📍",
	"Exam Center": "📝",
	"Fuel Station": "⛽",
	"Gate Landmark": "🚪"
}

def tokenize(text):
	if not text:
		return []
	# Tokenize English and Devanagari Hindi words (minimum 2 characters)
	words = re.findall(r"[\w\u0900-\u097F]+", str(text).lower())
	return [w for w in words if len(w) >= 2]

def build_search_index():
	base_dir = os.path.dirname(os.path.abspath(__file__))
	registry_path = os.path.join(base_dir, "india_transit_registry.json")
	cities_dir = os.path.join(base_dir, "cities")
	cache_output_path = os.path.join(base_dir, "search_cache", "transit_search_index.json")

	print("🚀 [SEARCH ENGINE] Starting Inverted Index Pre-computation...")
	print(f"📂 Scanning datasets from: {cities_dir}")

	items = {}
	tokens_index = {}
	city_items = {}
	current_id = 0

	def add_entry(item_dict, corpus_text):
		nonlocal current_id
		item_id = str(current_id)
		items[item_id] = item_dict

		city_k = item_dict.get("cityKey", "global")
		city_items.setdefault(city_k, []).append(current_id)

		words = set(tokenize(corpus_text))
		for w in words:
			tokens_index.setdefault(w, []).append(current_id)

		current_id += 1

	# 1. Index All Networks from Registry
	if os.path.exists(registry_path):
		with open(registry_path, "r", encoding="utf-8") as f:
			registry = json.load(f)

		for c_key, c_data in registry.get("cities", {}).items():
			c_name_en = c_data.get("name", {}).get("en", c_key) if isinstance(c_data.get("name"), dict) else str(c_data.get("name", c_key))
			c_name_hi = c_data.get("name", {}).get("hi", "") if isinstance(c_data.get("name"), dict) else ""
			state_name = c_data.get("state", {}).get("en", "") if isinstance(c_data.get("state"), dict) else str(c_data.get("state", ""))

			for n_key, n_data in c_data.get("networks", {}).items():
				n_name_en = n_data.get("name", {}).get("en", n_key) if isinstance(n_data.get("name"), dict) else str(n_data.get("name", n_key))
				n_name_hi = n_data.get("name", {}).get("hi", "") if isinstance(n_data.get("name"), dict) else ""
				op = n_data.get("operator", "")
				mode = n_data.get("mode", "Metro")
				status = n_data.get("status", "operational")

				corpus = f"{n_name_en} {n_name_hi} {c_name_en} {c_name_hi} {state_name} {op} {mode} {n_key}"
				add_entry({
					"name": n_name_en,
					"nameHi": n_name_hi,
					"type": "Network",
					"icon": "🌐",
					"subtitle": f"{op} • {mode} ({c_name_en})",
					"cityKey": c_key,
					"cityName": c_name_en,
					"networkKey": n_key,
					"status": status,
					"isStation": False
				}, corpus)

	# 2. Scan All Cities in data/cities/
	if os.path.exists(cities_dir):
		for c_folder in os.listdir(cities_dir):
			c_path = os.path.join(cities_dir, c_folder)
			if not os.path.isdir(c_path):
				continue

			c_key = c_folder
			c_name = c_folder.replace("_", " ").title()

			# Load Base + Auto Graph
			graph_path = os.path.join(c_path, "transit_network.json")
			graph_auto_path = os.path.join(c_path, "transit_network_auto.json")
			if not os.path.exists(graph_path):
				graph_path = os.path.join(c_path, "data.json")

			graph_data = json.load(open(graph_path, "r", encoding="utf-8")) if os.path.exists(graph_path) else {}
			if os.path.exists(graph_auto_path):
				try:
					auto_graph = json.load(open(graph_auto_path, "r", encoding="utf-8"))
					for st_id, st_val in auto_graph.get("stations", {}).items():
						graph_data.setdefault("stationData", {})[st_id] = st_val
					for l_id, l_val in auto_graph.get("lines", {}).items():
						graph_data.setdefault("lines", {})[l_id] = l_val
				except Exception as e:
					print(f"  ⚠️ Warning reading {graph_auto_path}: {e}")

			# Load Base + Auto Station Details
			rich_path = os.path.join(c_path, "station_details.json")
			rich_auto_path = os.path.join(c_path, "station_details_auto.json")
			if not os.path.exists(rich_path):
				rich_path = os.path.join(c_path, "stations_data.json")

			rich_data = json.load(open(rich_path, "r", encoding="utf-8")) if os.path.exists(rich_path) else {}
			if os.path.exists(rich_auto_path):
				try:
					auto_rich = json.load(open(rich_auto_path, "r", encoding="utf-8"))
					for st_id, st_val in auto_rich.items():
						if st_id != "_meta" and isinstance(st_val, dict):
							if st_id in rich_data:
								rich_data[st_id].update(st_val)
							else:
								rich_data[st_id] = st_val
				except Exception as e:
					print(f"  ⚠️ Warning reading {rich_auto_path}: {e}")

			stations = graph_data.get("stationData", {})
			lines = graph_data.get("lines", {})

			# A. Index All Stations
			for st_id, st_obj in stations.items():
				n_en = st_obj.get("name", {}).get("en", st_id) if isinstance(st_obj.get("name"), dict) else st_id
				n_hi = st_obj.get("name", {}).get("hi", "") if isinstance(st_obj.get("name"), dict) else ""
				l_keys = st_obj.get("lines", [])
				l_names = ", ".join([lines.get(lk, {}).get("short_name", {}).get("en", lk) if isinstance(lines.get(lk, {}).get("short_name"), dict) else lk for lk in l_keys])
				net_key = l_keys[0].split(".")[0] if l_keys else "metro"

				corpus = f"{n_en} {n_hi} {st_id} {c_name} {l_names} metro station namo bharat rrts"
				add_entry({
					"name": f"{n_en} Metro Station",
					"nameHi": n_hi,
					"type": "Station",
					"icon": "🚇",
					"subtitle": f"{l_names} • {c_name}",
					"cityKey": c_key,
					"cityName": c_name,
					"networkKey": net_key,
					"stationId": st_id,
					"isStation": True
				}, corpus)

			# B. Index Nearby Places (Hospitals, Tourist spots, Malls, etc.)
			for st_id, rich_obj in rich_data.items():
				if not isinstance(rich_obj, dict):
					continue
				st_basic = stations.get(st_id, {})
				st_name_en = st_basic.get("name", {}).get("en", st_id) if isinstance(st_basic.get("name"), dict) else st_id
				nearby = rich_obj.get("nearby_places", {})

				if isinstance(nearby, dict):
					for category, p_list in nearby.items():
						if not isinstance(p_list, list):
							continue

						icon = CATEGORY_ICONS.get(category, "📍")
						for p in p_list:
							p_name = p if isinstance(p, str) else p.get("name")
							if not p_name or not p_name.strip():
								continue

							d_km = p.get("distance_km") if isinstance(p, dict) else None
							d_text = f" (~{d_km} km)" if d_km else ""

							corpus = f"{p_name} {category} {st_name_en} {c_name}"
							add_entry({
								"name": p_name,
								"type": category,
								"icon": icon,
								"subtitle": f"Near {st_name_en} Station{d_text} • {c_name}",
								"cityKey": c_key,
								"cityName": c_name,
								"stationId": st_id,
								"nearestStation": st_name_en,
								"distanceKm": d_km,
								"isStation": False
							}, corpus)

				# C. Index Gate Landmarks
				gates = rich_obj.get("gates", {})
				if isinstance(gates, dict):
					for g_no, g_obj in gates.items():
						if isinstance(g_obj, dict):
							lm_en = g_obj.get("landmark", {}).get("en", "") if isinstance(g_obj.get("landmark"), dict) else str(g_obj.get("landmark", ""))
							lm_hi = g_obj.get("landmark", {}).get("hi", "") if isinstance(g_obj.get("landmark"), dict) else ""
							if lm_en and lm_en.strip():
								corpus = f"{lm_en} {lm_hi} Gate {g_no} {st_name_en} {c_name}"
								add_entry({
									"name": lm_en,
									"nameHi": lm_hi,
									"type": "Gate Landmark",
									"icon": "🚪",
									"subtitle": f"Gate No. {g_no}, {st_name_en} Station • {c_name}",
									"cityKey": c_key,
									"cityName": c_name,
									"stationId": st_id,
									"nearestStation": st_name_en,
									"gateNo": g_no,
									"isStation": False
								}, corpus)

	output_dict = {
		"version": 1,
		"totalItems": len(items),
		"tokens": tokens_index,
		"cities": city_items,
		"items": items
	}

	# Save to search_cache
	os.makedirs(os.path.dirname(cache_output_path), exist_ok=True)
	with open(cache_output_path, "w", encoding="utf-8") as f:
		json.dump(output_dict, f, ensure_ascii=False, separators=(",", ":"))

	size_kb = os.path.getsize(cache_output_path) / 1024
	print("=" * 70)
	print(f"✅ [SUCCESS] Inverted Search Index generated successfully!")
	print(f"📦 Output Target          : {cache_output_path}")
	print(f"📊 Total Searchable Items : {len(items)}")
	print(f"🔑 Unique Inverted Tokens : {len(tokens_index)}")
	print(f"💾 File Size              : {size_kb:.2f} KB")
	print("=" * 70)

if __name__ == "__main__":
	build_search_index()