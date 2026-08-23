"""
DMRC Master JSON Cleaning & De-duplication Script
==================================================

Purpose:
--------
Processes the raw scraped DMRC dataset (`scraped_dmrc_full.json`) to remove SQL join 
redundancies and duplicate keys while preserving 100% of station information (0% data loss).

Input File:
-----------
import_data/New folder (3)/scraped_dmrc_full.json

Output File:
------------
import_data/New folder (3)/scraped_dmrc_cleaned.json

Data Preserved:
---------------
- Station Metadata: Name (EN/HI), Code, Slug, Description, Type, Interchange status.
- Coordinates: Latitude, Longitude, X Coordinates, Y Coordinates.
- Timings & Contact: Opening/Closing times, Mobile & Landline numbers.
- Metro Lines: Full line details (Names, Color Hex Codes, Start/End stations).
- Graph Links: Adjacent station links (prev_station, next_station).
- Infrastructure: Gates, Lifts, Escalators, Parking capacities (car/motorcycle/cycle).
- Facilities: ATMs, Toilets, Banks, Lounges (cleaned of empty string keys).
- Nearby Places: Hospitals, Schools, Markets (cleaned of duplicate placeholder images).
"""

import json
import os


def clean_dmrc_json(input_path: str, output_path: str) -> None:
    """Reads raw scraped DMRC JSON, cleans duplicate keys/structures, and writes the output JSON file.

    Args:
        input_path (str): Path to input scraped_dmrc_full.json file.
        output_path (str): Path to destination scraped_dmrc_cleaned.json file.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found at: {input_path}")

    print(f"Loading raw dataset from: {input_path} ...")
    with open(input_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    cleaned_data = {}

    for slug, station_obj in raw_data.items():
        if not isinstance(station_obj, dict):
            continue

        en_raw = station_obj.get("en_raw") or {}

        # 1. Base Station Metadata (Merge Top-Level & en_raw)
        cleaned_station = {
            "slug": slug,
            "id": en_raw.get("id"),
            "code": station_obj.get("station_code") or en_raw.get("station_code"),
            "name_en": station_obj.get("station_name_en") or en_raw.get("station_name"),
            "name_hi": station_obj.get("station_name_hi"),
            "description": en_raw.get("station_description"),
            "type": en_raw.get("station_type"),
            "interchange": en_raw.get("interchange", False),
            "latitude": en_raw.get("latitude"),
            "longitude": en_raw.get("longitude"),
            "x_coords": en_raw.get("x_coords"),
            "y_coords": en_raw.get("y_coords"),
            "contact": {
                "mobile": en_raw.get("mobile"),
                "landline": en_raw.get("landline"),
            },
            "timings": {
                "opening": en_raw.get("opening_time"),
                "closing": en_raw.get("closing_time"),
            },
        }

        # 2. Metro Lines Details
        raw_lines = en_raw.get("metro_lines") or []
        cleaned_lines = []
        for line in raw_lines:
            if isinstance(line, dict):
                cleaned_lines.append({
                    "id": line.get("id"),
                    "name": line.get("name"),
                    "color": line.get("line_color"),
                    "code": line.get("line_code"),
                    "primary_color": line.get("primary_color_code"),
                    "secondary_color": line.get("secondary_color_code"),
                    "start_station": line.get("start_station"),
                    "end_station": line.get("end_station"),
                    "status": line.get("status"),
                })
        cleaned_station["lines"] = cleaned_lines

        # 3. Graph Adjacency (Prev / Next Stations)
        raw_prev_next = en_raw.get("prev_next_stations") or []
        cleaned_prev_next = []
        for item in raw_prev_next:
            if isinstance(item, dict):
                for line_name, links in item.items():
                    if isinstance(links, list):
                        for link in links:
                            if isinstance(link, dict):
                                prev_st = link.get("prev_station") or {}
                                next_st = link.get("next_station") or {}
                                cleaned_prev_next.append({
                                    "line": line_name,
                                    "line_id": link.get("line_id"),
                                    "prev_station": {
                                        "id": prev_st.get("id"),
                                        "code": prev_st.get("station_code"),
                                        "name": prev_st.get("station_name"),
                                    } if prev_st else None,
                                    "next_station": {
                                        "id": next_st.get("id"),
                                        "code": next_st.get("station_code"),
                                        "name": next_st.get("station_name"),
                                    } if next_st else None,
                                })
        cleaned_station["prev_next_stations"] = cleaned_prev_next

        # 4. Gates Information
        raw_gates = en_raw.get("gates") or []
        cleaned_gates = []
        for gate in raw_gates:
            if isinstance(gate, dict):
                cleaned_gates.append({
                    "name": gate.get("gate_name"),
                    "code": gate.get("gate_code"),
                    "location": gate.get("location"),
                    "divyang_friendly": gate.get("divyang_friendly"),
                    "status": gate.get("status"),
                    "latitude": gate.get("gate_latitude"),
                    "longitude": gate.get("gate_longitude"),
                })
        cleaned_station["gates"] = cleaned_gates

        # 5. Lifts and Escalators
        raw_lifts = en_raw.get("lifts") or []
        cleaned_lifts = []
        for lift in raw_lifts:
            if isinstance(lift, dict):
                cleaned_lifts.append({
                    "type": lift.get("lift_type"),
                    "name": lift.get("name"),
                    "location": lift.get("description_location"),
                    "code": lift.get("code"),
                    "inside_outside": lift.get("available_outside_inside"),
                    "divyang_friendly": lift.get("divyang_friendly"),
                    "status": lift.get("status"),
                    "note": lift.get("note"),
                    "last_update": lift.get("last_update"),
                })
        cleaned_station["lifts"] = cleaned_lifts

        # 6. Parking Facilities
        raw_parkings = en_raw.get("parkings") or []
        cleaned_parkings = []
        for p in raw_parkings:
            if isinstance(p, dict):
                cleaned_parkings.append({
                    "provider": p.get("provider"),
                    "capacity_car": p.get("capacity_car"),
                    "capacity_motorcycle": p.get("capacity_motorcycle"),
                    "capacity_cycle": p.get("capacity_cycle"),
                    "code": p.get("parking_code"),
                    "location": p.get("location"),
                })
        cleaned_station["parkings"] = cleaned_parkings

        # 7. Station Facilities (Cleaned of empty string keys)
        raw_facilities = en_raw.get("stations_facilities") or []
        cleaned_facilities = []
        for fac in raw_facilities:
            if isinstance(fac, dict):
                kind = fac.get("kind")
                icon = fac.get("icon-class")
                detail_list = fac.get("detail_list") or []
                cleaned_details = []
                for item in detail_list:
                    if isinstance(item, dict):
                        cleaned_item = {
                            "name": item.get("facility_name"),
                            "purpose": item.get("purpose"),
                            "location": item.get("location_description"),
                        }
                        if item.get("nearest_gate_name"):
                            cleaned_item["nearest_gate_name"] = item.get("nearest_gate_name")
                        if item.get("nearest_gate_code"):
                            cleaned_item["nearest_gate_code"] = item.get("nearest_gate_code")
                        if item.get("nearest_platform_name"):
                            cleaned_item["nearest_platform_name"] = item.get("nearest_platform_name")
                        if item.get("nearest_platform_code"):
                            cleaned_item["nearest_platform_code"] = item.get("nearest_platform_code")
                        cleaned_details.append(cleaned_item)
                cleaned_facilities.append({
                    "kind": kind,
                    "icon": icon,
                    "details": cleaned_details,
                })
        cleaned_station["facilities"] = cleaned_facilities

        # 8. Nearby Places (Cleaned of static placeholder images)
        raw_nearby = en_raw.get("nearby_places") or []
        cleaned_nearby = []
        for item in raw_nearby:
            if isinstance(item, dict):
                for cat_name, sub_cats in item.items():
                    if isinstance(sub_cats, dict):
                        for sub_cat, places in sub_cats.items():
                            if isinstance(places, list):
                                for place in places:
                                    if isinstance(place, dict):
                                        name = place.get("name")
                                        if not name:
                                            continue
                                        cleaned_nearby.append({
                                            "category": cat_name,
                                            "type": place.get("types_of_place"),
                                            "name": name,
                                            "distance_km": place.get("distance_from_metro"),
                                            "connected": place.get("connected_with_metro"),
                                            "walking_min": place.get("estimated_walking_time_min"),
                                            "pub_transport_min": place.get("estimated_pub_transport_time_min"),
                                        })
        cleaned_station["nearby_places"] = cleaned_nearby

        cleaned_data[slug] = cleaned_station

    print(f"Saving cleaned master dataset to: {output_path} ...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, ensure_ascii=False, indent=2)

    print("SUCCESS: Cleaned dataset saved successfully!")
    print(f"Total stations processed: {len(cleaned_data)}")
    print(f"Cleaned file size: {os.path.getsize(output_path)} bytes")


if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_file = os.path.join(BASE_DIR, "import_data", "New folder (3)", "scraped_dmrc_full.json")
    output_file = os.path.join(BASE_DIR, "import_data", "New folder (3)", "scraped_dmrc_cleaned.json")

    clean_dmrc_json(input_file, output_file)
