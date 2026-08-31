"""
Universal Transit Search Index Pre-Computation Engine
=====================================================
Location: data/build_search_index.py

Purpose:
--------
Scans all registered city datasets (data.json & stations_data.json) and builds a single,
super-compact, pre-indexed `data/transit_search_index.json` (~180 KB) for instantaneous (0ms)
fuzzy search across all landmarks, hospitals, tourist places, malls, colleges, gates, and stations.

Usage:
------
    python data/build_search_index.py
"""

import os
import json
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

def build_search_index():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    registry_path = os.path.join(base_dir, "india_transit_registry.json")
    cities_dir = os.path.join(base_dir, "cities")
    output_path = os.path.join(base_dir, "transit_search_index.json")

    print(f"🚀 Starting Search Index Generation...")
    print(f"📂 Base Directory: {base_dir}")

    search_index = []
    seen_ids = set()

    # 1. Load Registry & Index Networks
    if os.path.exists(registry_path):
        with open(registry_path, "r", encoding="utf-8") as f:
            registry = json.load(f)

        for city_key, city_data in registry.get("cities", {}).items():
            city_name = city_data.get("name", city_key)
            state_name = city_data.get("state", "")

            for net_key, net_data in city_data.get("networks", {}).items():
                net_name = net_data.get("name", net_key)
                operator = net_data.get("operator", "")
                mode = net_data.get("mode", "Metro")
                status = net_data.get("status", "operational")

                net_id = f"net_{city_key}_{net_key}"
                if net_id not in seen_ids:
                    seen_ids.add(net_id)
                    search_index.append({
                        "id": net_id,
                        "q": f"{net_name} {city_name} {state_name} {operator} {mode} {net_key}".lower(),
                        "name": net_name,
                        "type": "Network",
                        "icon": "🌐",
                        "subtitle": f"{operator} • {mode} ({city_name})",
                        "cityKey": city_key,
                        "cityName": city_name,
                        "networkKey": net_key,
                        "status": status,
                        "isStation": False
                    })

    # 2. Scan All Cities in data/cities/
    if os.path.exists(cities_dir):
        for city_folder in os.listdir(cities_dir):
            city_path = os.path.join(cities_dir, city_folder)
            if not os.path.isdir(city_path):
                continue

            city_key = city_folder
            city_name = city_folder.replace("_", " ").title()

            graph_path = os.path.join(city_path, "data.json")
            rich_path = os.path.join(city_path, "stations_data.json")

            graph_data = {}
            rich_data = {}

            if os.path.exists(graph_path):
                with open(graph_path, "r", encoding="utf-8") as f:
                    graph_data = json.load(f)

            if os.path.exists(rich_path):
                with open(rich_path, "r", encoding="utf-8") as f:
                    rich_data = json.load(f)

            stations = graph_data.get("stationData", {})
            lines = graph_data.get("lines", {})

            # Index Stations
            for st_id, st_obj in stations.items():
                name_en = st_obj.get("name", {}).get("en", st_id) if isinstance(st_obj.get("name"), dict) else st_id
                name_hi = st_obj.get("name", {}).get("hi", "") if isinstance(st_obj.get("name"), dict) else ""
                line_keys = st_obj.get("lines", [])
                line_names = ", ".join([lines.get(lk, {}).get("short_name", {}).get("en", lk) for lk in line_keys])
                network_key = line_keys[0].split(".")[0] if line_keys else "metro"

                st_unique_id = f"st_{city_key}_{st_id}"
                if st_unique_id not in seen_ids:
                    seen_ids.add(st_unique_id)
                    search_index.append({
                        "id": st_unique_id,
                        "q": f"{name_en} {name_hi} {st_id} {city_name} {line_names} metro station".lower(),
                        "name": f"{name_en} Metro Station",
                        "nameHi": name_hi,
                        "type": "Station",
                        "icon": "🚇",
                        "subtitle": f"{line_names} • {city_name}",
                        "cityKey": city_key,
                        "cityName": city_name,
                        "networkKey": network_key,
                        "stationId": st_id,
                        "isStation": True
                    })

            # Index Rich Places (Hospitals, Tourist Places, Malls, Gates, etc.)
            for st_id, rich_obj in rich_data.items():
                st_basic = stations.get(st_id, {})
                st_name_en = st_basic.get("name", {}).get("en", st_id) if isinstance(st_basic.get("name"), dict) else st_id
                nearby = rich_obj.get("nearby_places", {})

                for category, places_list in nearby.items():
                    if not isinstance(places_list, list):
                        continue

                    icon = CATEGORY_ICONS.get(category, "📍")

                    for idx, place in enumerate(places_list):
                        place_name = place if isinstance(place, str) else place.get("name")
                        if not place_name or not place_name.strip():
                            continue

                        dist_km = place.get("distance_km") if isinstance(place, dict) else None
                        dist_text = f" (~{dist_km} km)" if dist_km else ""

                        place_id = f"place_{city_key}_{st_id}_{category}_{idx}"
                        if place_id not in seen_ids:
                            seen_ids.add(place_id)
                            search_index.append({
                                "id": place_id,
                                "q": f"{place_name} {category} {st_name_en} {city_name}".lower(),
                                "name": place_name,
                                "type": category,
                                "icon": icon,
                                "subtitle": f"Near {st_name_en} Station{dist_text} • {city_name}",
                                "cityKey": city_key,
                                "cityName": city_name,
                                "stationId": st_id,
                                "nearestStation": st_name_en,
                                "distanceKm": dist_km,
                                "isStation": False
                            })

                # Index Gates Landmarks
                gates = rich_obj.get("gates", {})
                for gate_no, gate_obj in gates.items():
                    if isinstance(gate_obj, dict):
                        lm_en = gate_obj.get("landmark", {}).get("en", "")
                        lm_hi = gate_obj.get("landmark", {}).get("hi", "")
                        if lm_en and lm_en.strip():
                            gate_id = f"gate_{city_key}_{st_id}_{gate_no}"
                            if gate_id not in seen_ids:
                                seen_ids.add(gate_id)
                                search_index.append({
                                    "id": gate_id,
                                    "q": f"{lm_en} {lm_hi} Gate {gate_no} {st_name_en} {city_name}".lower(),
                                    "name": lm_en,
                                    "type": "Gate Landmark",
                                    "icon": "🚪",
                                    "subtitle": f"Gate No. {gate_no}, {st_name_en} Station • {city_name}",
                                    "cityKey": city_key,
                                    "cityName": city_name,
                                    "stationId": st_id,
                                    "nearestStation": st_name_en,
                                    "gateNo": gate_no,
                                    "isStation": False
                                })

    # Save to Compact Minified JSON
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(search_index, f, ensure_ascii=False, separators=(",", ":"))

    file_size_kb = os.path.getsize(output_path) / 1024
    print(f"✅ Success! Search Index written to: {output_path}")
    print(f"📊 Total Searchable Items: {len(search_index)}")
    print(f"📦 File Size: {file_size_kb:.2f} KB")

if __name__ == "__main__":
    build_search_index()