"""
Universal Transit Search Index Pre-Computation Engine (Inverted Index DSA)
==========================================================================
Location: data/search_cache/build_search_index.py

Purpose:
--------
Scans city transit datasets and builds an O(1) Inverted Index JSON mapping:
  - `tokens`: word -> [item_ids] (Instant token lookup)
  - `cities`: cityKey -> [item_ids] (Instant city scoping)
  - `items`: item_id -> item metadata

Usage:
------
    python data/search_cache/build_search_index.py
"""

import os
import json
import re
import sys

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
    current_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(current_dir)
    registry_path = os.path.join(base_dir, "india_transit_registry.json")
    cities_dir = os.path.join(base_dir, "cities")
    output_path = os.path.join(current_dir, "transit_search_index.json")

    print(f"🚀 Starting Inverted Index Generation...")

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

    # 1. Registry Networks Indexing
    if os.path.exists(registry_path):
        with open(registry_path, "r", encoding="utf-8") as f:
            registry = json.load(f)

        for c_key, c_data in registry.get("cities", {}).items():
            c_name = c_data.get("name", c_key)
            state_name = c_data.get("state", "")

            for n_key, n_data in c_data.get("networks", {}).items():
                n_name = n_data.get("name", n_key)
                op = n_data.get("operator", "")
                mode = n_data.get("mode", "Metro")
                status = n_data.get("status", "operational")

                corpus = f"{n_name} {c_name} {state_name} {op} {mode} {n_key}"
                add_entry({
                    "name": n_name,
                    "type": "Network",
                    "icon": "🌐",
                    "subtitle": f"{op} • {mode} ({c_name})",
                    "cityKey": c_key,
                    "cityName": c_name,
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

            graph_path = os.path.join(c_path, "data.json")
            rich_path = os.path.join(c_path, "stations_data.json")

            graph_data = json.load(open(graph_path, "r", encoding="utf-8")) if os.path.exists(graph_path) else {}
            rich_data = json.load(open(rich_path, "r", encoding="utf-8")) if os.path.exists(rich_path) else {}

            stations = graph_data.get("stationData", {})
            lines = graph_data.get("lines", {})

            # A. Index Stations
            for st_id, st_obj in stations.items():
                n_en = st_obj.get("name", {}).get("en", st_id) if isinstance(st_obj.get("name"), dict) else st_id
                n_hi = st_obj.get("name", {}).get("hi", "") if isinstance(st_obj.get("name"), dict) else ""
                l_keys = st_obj.get("lines", [])
                l_names = ", ".join([lines.get(lk, {}).get("short_name", {}).get("en", lk) for lk in l_keys])
                net_key = l_keys[0].split(".")[0] if l_keys else "metro"

                corpus = f"{n_en} {n_hi} {st_id} {c_name} {l_names} metro station"
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

            # B. Index Nearby Places
            for st_id, rich_obj in rich_data.items():
                st_basic = stations.get(st_id, {})
                st_name_en = st_basic.get("name", {}).get("en", st_id) if isinstance(st_basic.get("name"), dict) else st_id
                nearby = rich_obj.get("nearby_places", {})

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

                # C. Index Gates
                gates = rich_obj.get("gates", {})
                for g_no, g_obj in gates.items():
                    if isinstance(g_obj, dict):
                        lm_en = g_obj.get("landmark", {}).get("en", "")
                        lm_hi = g_obj.get("landmark", {}).get("hi", "")
                        if lm_en and lm_en.strip():
                            corpus = f"{lm_en} {lm_hi} Gate {g_no} {st_name_en} {c_name}"
                            add_entry({
                                "name": lm_en,
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

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output_dict, f, ensure_ascii=False, separators=(",", ":"))

    size_kb = os.path.getsize(output_path) / 1024
    print(f"✅ Inverted Index Generated: {output_path}")
    print(f"📊 Total Items: {len(items)}, Unique Tokens: {len(tokens_index)}, File Size: {size_kb:.2f} KB")

if __name__ == "__main__":
    build_search_index()