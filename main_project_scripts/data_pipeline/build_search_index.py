"""
====================================================================================================
🚆 Universal Transit Search Index Pre-Computation Engine (Inverted Index DSA)
====================================================================================================
📁 Location:
    main_project_scripts/data_pipeline/build_search_index.py

🎯 Overview & Purpose:
    Scans entire multi-city transit datasets and Decoupled v4.0 Locale Packs across all configured
    cities in India (or any given country). Pre-computes a high-performance, O(1) in-memory Inverted
    Index (Search Engine) and dumps it as a compact JSON cache for client-side instant searches.

⚙️ Core Architectural Design (Inverted Index Data Structure - v4.0 Decoupled Standard):
    1. `tokens`   : Inverted word token map -> { token_string: [item_id_1, item_id_2, ...] }
                   Enables instant O(1) prefix/word matching for multi-language queries across:
                   English, Devanagari (Hindi/Marathi), Gujarati, Tamil, Telugu, Kannada,
                   Malayalam, Bengali, and Urdu.
    2. `cities`   : City scope map -> { cityKey: [item_id_1, item_id_2, ...] }
                   Allows zero-latency filtering when a user searches within a selected city.
    3. `items`    : Central dictionary -> { item_id: { ...metadata... } }
                   Stores compact metadata payload (title, Hindi/local name, mode, icon, line, etc.).

🌐 Multi-City & Entity Coverage:
    - ✅ Resolves station human narratives, aliases, and line names directly from `locales/` packs!
    - 🌐 Transit Networks (DMRC, Mumbai Metro, Namma Metro, RRTS, etc. from registry)
    - 🚇 Stations (Names in English, Hindi, and regional scripts, Aliases, Line affiliations)
    - 📍 Nearby Places (Hospitals, Malls, Universities, Tourist Spots, etc. with distance in km)
    - 🚪 Station Gates & Landmarks (Decoupled gate landmarks from v4.0 locale packs)

📦 Target Output:
    main_project/data/<country>/search_cache/transit_search_index.json

💻 Execution & CLI Usage:
    # 1. Run for default country (India) across ALL cities:
    py build_search_index.py

    # 2. Run for specific country dataset:
    py build_search_index.py india
====================================================================================================
"""

import os
import json
import re
import sys
from pathlib import Path

# Configure UTF-8 for console output on Windows terminals
if hasattr(sys.stdout, "reconfigure"):
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

# Comprehensive regex matching English, Devanagari, Bengali, Gujarati, Tamil, Telugu, Kannada, Malayalam, Urdu
MULTI_LANG_WORD_REGEX = re.compile(
	r"[\w\u0900-\u097F\u0980-\u09FF\u0A80-\u0AFF\u0B80-\u0BFF\u0C00-\u0C7F\u0C80-\u0CFF\u0D00-\u0D7F\u0600-\u06FF]+",
	re.UNICODE
)

def tokenize(text):
	"""
	Extracts normalized search tokens from text across all supported Indian transit scripts.
	Enforces minimum 2-character word length to ignore single-letter noise.
	"""
	if not text:
		return []
	words = MULTI_LANG_WORD_REGEX.findall(str(text).lower())
	return [w for w in words if len(w) >= 2]

def build_search_index(country_key="india"):
	# Resolve robust paths relative to script location
	script_dir = Path(__file__).resolve().parent
	project_root = script_dir.parent.parent / "main_project"
	base_dir = project_root / "data"

	country_dir = base_dir / country_key
	registry_path = country_dir / f"{country_key}_transit_registry.json"
	cities_dir = country_dir / "cities"
	locales_base_dir = project_root / "locales"
	cache_dir = country_dir / "search_cache"
	cache_output_path = cache_dir / "transit_search_index.json"

	cache_dir.mkdir(parents=True, exist_ok=True)

	print(f"🚀 [SEARCH ENGINE] Starting Inverted Index Pre-computation for '{country_key}' (v4.0 Standard)...")
	print(f"📂 Scanning datasets from: {cities_dir}")
	print(f"🌐 Sourcing decoupled names from: {locales_base_dir}")

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
	if registry_path.exists():
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
	if cities_dir.exists():
		for c_folder in sorted(os.listdir(cities_dir)):
			c_path = cities_dir / c_folder
			if not c_path.is_dir():
				continue

			c_key = c_folder
			c_name = c_folder.replace("_", " ").title()

			# Load Base + Auto Graph
			graph_path = c_path / "transit_network.json"
			graph_auto_path = c_path / "transit_network_auto.json"

			graph_data = json.load(open(graph_path, "r", encoding="utf-8")) if graph_path.exists() else {}
			if graph_auto_path.exists():
				try:
					auto_graph = json.load(open(graph_auto_path, "r", encoding="utf-8"))
					for st_id, st_val in auto_graph.get("stations", {}).items():
						graph_data.setdefault("stationData", {})[st_id] = st_val
					for l_id, l_val in auto_graph.get("lines", {}).items():
						graph_data.setdefault("lines", {})[l_id] = l_val
				except Exception as e:
					print(f"  ⚠️ Warning reading {graph_auto_path}: {e}")

			# Load Base + Auto Station Details
			rich_path = c_path / "station_details.json"
			rich_auto_path = c_path / "station_details_auto.json"

			rich_data = json.load(open(rich_path, "r", encoding="utf-8")) if rich_path.exists() else {}
			if rich_auto_path.exists():
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

			# 🌐 Load v4.0 Decoupled Locales for this city (EN + HI + All Regional Packs)
			city_locales = {}
			locale_file_pattern = f"{c_key}_station_details_locale.json"
			for loc_path in locales_base_dir.glob(f"*/{country_key}/{locale_file_pattern}"):
				lang = loc_path.parent.parent.name
				try:
					with open(loc_path, "r", encoding="utf-8") as lf:
						city_locales[lang] = json.load(lf)
				except Exception as e:
					print(f"  ⚠️ Could not read locale {loc_path}: {e}")

			en_locale = city_locales.get("en", {})
			hi_locale = city_locales.get("hi", {})

			stations = graph_data.get("stationData", {})
			lines = graph_data.get("lines", {})

			# A. Index All Stations (Decoupled Name Resolution)
			for st_id, st_obj in stations.items():
				# 1. Resolve English Display Name from English Locale Pack
				en_st_record = en_locale.get("stations", {}).get(st_id, {})
				n_en = en_st_record.get("name") or st_id.replace("_", " ").title()

				# 2. Resolve Hindi Display Name
				hi_st_record = hi_locale.get("stations", {}).get(st_id, {})
				n_hi = hi_st_record.get("name") or ""

				# 3. Collect all multilingual names & aliases across all available locales
				regional_names = []
				all_aliases = []
				for lang_k, l_pack in city_locales.items():
					s_rec = l_pack.get("stations", {}).get(st_id, {})
					reg_n = s_rec.get("name", "")
					if reg_n and reg_n.strip():
						regional_names.append(reg_n.strip())
					for al in s_rec.get("aliases", []):
						if al and al.strip():
							all_aliases.append(al.strip())

				# 4. Resolve Line Names
				l_keys = st_obj.get("lines", [])
				l_name_list = []
				for lk in l_keys:
					en_line_name = en_locale.get("lines", {}).get(lk, {}).get("short_name") or en_locale.get("lines", {}).get(lk, {}).get("name")
					if not en_line_name:
						raw_line = lines.get(lk, {})
						en_line_name = raw_line.get("short_name", {}).get("en") if isinstance(raw_line.get("short_name"), dict) else lk
					l_name_list.append(en_line_name)
				l_names = ", ".join(l_name_list)
				net_key = l_keys[0].split(".")[0] if l_keys else "metro"

				# Construct Rich Multi-Language Search Corpus
				corpus_parts = [
					n_en,
					n_hi,
					st_id,
					c_name,
					l_names,
					"metro",
					"station",
					"namo",
					"bharat",
					"rrts"
				]
				corpus_parts.extend(regional_names)
				corpus_parts.extend(all_aliases)
				corpus = " ".join(corpus_parts)

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
				en_st_record = en_locale.get("stations", {}).get(st_id, {})
				st_name_en = en_st_record.get("name") or st_id.replace("_", " ").title()
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

				# C. Index Gate Landmarks (Decoupled from v4.0 Locale Packs)
				# 1. Check English Gate Landmarks
				en_gates = en_locale.get("stations", {}).get(st_id, {}).get("gates", {})
				hi_gates = hi_locale.get("stations", {}).get(st_id, {}).get("gates", {})
				all_gate_keys = set(en_gates.keys()) | set(hi_gates.keys())

				for g_no in sorted(all_gate_keys, key=lambda x: str(x)):
					lm_en = en_gates.get(g_no, "").strip()
					lm_hi = hi_gates.get(g_no, "").strip()

					# Fallback to rich_obj if locale gate had empty string
					if not lm_en:
						raw_g = rich_obj.get("gates", {}).get(g_no, {})
						if isinstance(raw_g, dict):
							raw_lm = raw_g.get("landmark")
							lm_en = raw_lm if isinstance(raw_lm, str) else ""

					if lm_en or lm_hi:
						disp_name = lm_en or lm_hi
						corpus = f"{lm_en} {lm_hi} Gate {g_no} {st_name_en} {c_name}"
						add_entry({
							"name": disp_name,
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
		"version": 2,
		"totalItems": len(items),
		"tokens": tokens_index,
		"cities": city_items,
		"items": items
	}

	# Save to search_cache
	with open(cache_output_path, "w", encoding="utf-8") as f:
		json.dump(output_dict, f, ensure_ascii=False, separators=(",", ":"))

	size_kb = os.path.getsize(cache_output_path) / 1024
	print("=" * 70)
	print(f"✅ [SUCCESS] Inverted Search Index generated successfully (v4.0 Standard)!")
	print(f"📦 Output Target  : {cache_output_path}")
	print(f"📊 Total Searchable Items : {len(items)}")
	print(f"🔑 Unique Inverted Tokens : {len(tokens_index)}")
	print(f"💾 File Size  : {size_kb:.2f} KB")
	print("=" * 70)

if __name__ == "__main__":
	country = sys.argv[1] if len(sys.argv) > 1 else "india"
	build_search_index(country)