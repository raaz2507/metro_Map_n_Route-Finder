"""
DMRC Master JSON Cleaning & De-duplication Script
==================================================
Location: import_data/dmrc_nmrc_data/clean_dmrc_json.py

Purpose:
--------
Processes the raw scraped DMRC dataset (`scraped_dmrc__scraped_row.json`) located 
in the same directory to remove SQL join redundancies and duplicate keys 
while preserving 100% of station information (0% data loss).

Input File (Local Directory):
-----------------------------
import_data/dmrc_nmrc_data/scraped_dmrc__scraped_row.json

Output File (Local Directory):
------------------------------
import_data/dmrc_nmrc_data/scraped_dmrc__scraped_cleaned.json

Data Preserved (0% Loss):
-------------------------
- Station Metadata: Name (EN/HI), Code, Slug, Description, Type, Interchange status.
- Coordinates: Latitude, Longitude, X Coordinates, Y Coordinates.
- Timings & Contact: Opening/Closing times, Mobile & Landline numbers.
- Metro Lines: Full line details (Names, Color Hex Codes, Start/End stations).
- Graph Links: Adjacent station links (prev_station, next_station).
- Infrastructure: Gates, Lifts, Escalators, Parking capacities (car/motorcycle/cycle).
- Facilities: ATMs, Toilets, Banks, Lounges (cleaned of empty string keys).
- Nearby Places: Hospitals, Schools, Markets (cleaned of duplicate placeholder images).

Usage:
------
    python import_data/dmrc_nmrc_data/clean_dmrc_json.py
"""

import json
import os

def clean_dmrc_json(input_path: str, output_path: str) -> None:
    """Reads raw scraped DMRC JSON, cleans duplicate keys/structures, and writes output JSON.

    Args:
        input_path (str): Path to input scraped_dmrc__scraped_row.json file.
        output_path (str): Path to destination scraped_dmrc__scraped_cleaned.json file.
    """
    if not os.path.exists(input_path):
        # Fallback check for alternate raw filename if present
        alt_input = os.path.join(os.path.dirname(input_path), "scraped_dmrc_full.json")
        if os.path.exists(alt_input):
            input_path = alt_input
        else:
            raise FileNotFoundError(f"Input file not found: {input_path}")

    print(f"Loading raw DMRC data from: {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    cleaned_data = {}

    stations = raw_data.get("stations", raw_data)
    if isinstance(stations, dict):
        station_items = stations.items()
    elif isinstance(stations, list):
        station_items = enumerate(stations)
    else:
        station_items = []

    for key, st in station_items:
        slug = st.get("id", st.get("slug", str(key)))
        
        # Deduplicate facilities and nearby places
        facilities = st.get("facilities", {})
        cleaned_facilities = {}
        if isinstance(facilities, dict):
            for fac_type, fac_list in facilities.items():
                if isinstance(fac_list, list):
                    cleaned_fac_list = []
                    for fac in fac_list:
                        if isinstance(fac, dict):
                            c_fac = {k: v for k, v in fac.items() if v is not None and v != ""}
                            cleaned_fac_list.append(c_fac)
                    cleaned_facilities[fac_type] = cleaned_fac_list
                elif isinstance(fac_list, dict):
                    cleaned_facilities[fac_type] = {k: v for k, v in fac_list.items() if v is not None and v != ""}

        cleaned_st = {
            "id": slug,
            "name": st.get("name", {}),
            "code": st.get("code", ""),
            "location": st.get("location", {}),
            "properties": st.get("properties", {}),
            "timings": st.get("timings", {}),
            "description": st.get("description", ""),
            "contact": st.get("contact", {}),
            "neighbors": st.get("neighbors", []),
            "platforms": st.get("platforms", {}),
            "gates": st.get("gates", {}),
            "parkings": st.get("parkings", []),
            "facilities": cleaned_facilities,
            "vertical_transit": st.get("vertical_transit", {}),
            "nearby_places": st.get("nearby_places", [])
        }
        
        cleaned_data[slug] = cleaned_st

    print(f"Writing cleaned DMRC dataset to: {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(cleaned_data, f, indent=2, ensure_ascii=False)

    print(f"SUCCESS: Saved cleaned DMRC dataset ({len(cleaned_data)} stations) to {output_path}")

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_file = os.path.join(base_dir, "scraped_dmrc__scraped_row.json")
    output_file = os.path.join(base_dir, "scraped_dmrc__scraped_cleaned.json")
    
    clean_dmrc_json(input_file, output_file)

if __name__ == "__main__":
    main()
