r"""
===================================================================================
 🚆 POPULATE STATION COORDINATES FROM CSV (Delhi-Metro-Network.csv Parser)
===================================================================================

📌 फ़ाइल का उद्देश्य (Purpose):
   यह स्क्रिप्ट 'data/Delhi-Metro-Network.csv' फ़ाइल से सभी 100% प्रामाणिक 
   (Latitude, Longitude) पढ़कर 'data/station_coordinates_filled.json' 
   में आपके exact JSON स्ट्रक्चर के अनुसार फ़िल करती है।

📁 इस फ़ाइल को किस फ़ोल्डर में रखें (File Location):
   प्रोजेक्ट के मुख्य फ़ोल्डर (Root Directory) या 'scripts/' फ़ोल्डर में:
   d:/projects/metro_Map_n_Route Finder/scripts/populate_coords_from_csv.py
   या
   d:/projects/metro_Map_n_Route Finder/populate_coords_from_csv.py

🚀 कैसे चलाएं (How to Run):
   टर्मिनल (CMD या PowerShell) खोलें और चलाएं:
   $ python populate_coords_from_csv.py
   या
   $ python scripts/populate_coords_from_csv.py

📄 आउटपुट फ़ाइल का ढाँचा (Output Schema - 'data/station_coordinates_filled.json'):
   {
     "metadata": {
       "totalStations": 275,
       "matchedCount": 270,
       "unmatchedCount": 5,
       "sourceFile": "data/Delhi-Metro-Network.csv",
       "timestamp": "2026-08-15 22:05:00"
     },
     "locations": {
       "jhilmil": {
         "id": "jhilmil",
         "coordinates": {
           "lat": 28.67579,
           "lon": 77.31239
         },
         "source": "Delhi-Metro-Network.csv"
       }
     }
   }
===================================================================================
"""

import os
import re
import csv
import json
from datetime import datetime

def clean_station_name(name):
    """
    स्टेशन नाम से एक्स्ट्रा टैग्स (उदा: '[Conn: Red]', '(First station)', '- ' आदि) साफ़ करता है।
    """
    cleaned = re.sub(r'\[.*?\]', '', name)
    cleaned = re.sub(r'\(.*?\)', '', cleaned)
    cleaned = cleaned.replace("-", " ").strip().lower()
    cleaned = re.sub(r'\s+', ' ', cleaned)
    return cleaned

def populate_coordinates():
    csv_path = "data/Delhi-Metro-Network.csv"
    data_path = "data/data.json"
    output_path = "data/station_coordinates_filled.json"

    # पाथ ऑटो-डिटेक्शन (यदि स्क्रिप्ट 'scripts/' फ़ोल्डर के अंदर से चलाई जा रही हो)
    if not os.path.exists(csv_path) and os.path.exists(os.path.join("..", csv_path)):
        csv_path = os.path.join("..", csv_path)
        data_path = os.path.join("..", data_path)
        output_path = os.path.join("..", output_path)

    print("=" * 85)
    print(" 🚀 STARTING POPULATE COORDINATES FROM DELHI-METRO-NETWORK.CSV")
    print("=" * 85)

    if not os.path.exists(csv_path):
        print(f"❌ Error: '{csv_path}' फ़ाइल नहीं मिली! कृपया सुनिश्चित करें कि CSV फ़ाइल इसी स्थान पर है।")
        return

    if not os.path.exists(data_path):
        print(f"❌ Error: '{data_path}' फ़ाइल नहीं मिली!")
        return

    # Step 1: Parse CSV File
    csv_map = {}
    with open(csv_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            raw_name = row.get("Station Name", "")
            lat_str = row.get("Latitude", "").strip()
            lon_str = row.get("Longitude", "").strip()

            if lat_str and lon_str:
                try:
                    lat = round(float(lat_str), 6)
                    lon = round(float(lon_str), 6)
                    c_name = clean_station_name(raw_name)
                    c_unspaced = c_name.replace(" ", "")

                    csv_map[c_name] = (lat, lon)
                    csv_map[c_unspaced] = (lat, lon)
                except ValueError:
                    pass

    print(f"📊 CSV से लोड किए गए यूनिट स्टेशन्स: {len(csv_map) // 2}")

    # Step 2: Read data.json schema & populate coordinates
    with open(data_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    station_data = data.get("stationData", {})
    total_stations = len(station_data)

    matched_count = 0
    unmatched_list = []
    locations = {}

    for st_id, station in station_data.items():
        name = station.get("name", st_id)
        c_name = clean_station_name(name)
        c_unspaced = c_name.replace(" ", "")

        lat, lon = None, None
        source = "Delhi-Metro-Network.csv"

        if c_name in csv_map:
            lat, lon = csv_map[c_name]
        elif c_unspaced in csv_map:
            lat, lon = csv_map[c_unspaced]
        else:
            # Substring matching fallback
            for k, v in csv_map.items():
                if c_name in k or k in c_name:
                    lat, lon = v
                    break

        if lat is not None and lon is not None:
            matched_count += 1
            locations[st_id] = {
                "id": st_id,
                "coordinates": {
                    "lat": lat,
                    "lon": lon
                },
                "source": source
            }
        else:
            source = "Not Found in CSV"
            unmatched_list.append((st_id, name))
            locations[st_id] = {
                "id": st_id,
                "coordinates": {
                    "lat": None,
                    "lon": None
                },
                "source": source
            }

    result = {
        "metadata": {
            "totalStations": total_stations,
            "matchedCount": matched_count,
            "unmatchedCount": len(unmatched_list),
            "sourceFile": csv_path,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "locations": locations
    }

    # Step 3: Save filled output JSON
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as out_f:
        json.dump(result, out_f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 85)
    print(" 📈 PARSING & POPULATION SUMMARY REPORT")
    print("=" * 85)
    print(f"🟢 सफलतापूर्वक मैच होकर फ़िल हुए स्टेशन्स: {matched_count} / {total_stations}")
    print(f"⚠️ CSV में न मिले स्टेशन्स (Unmatched): {len(unmatched_list)}")
    print(f"💾 फ़िल्ड डेटाबेस फ़ाइल यहाँ सेव हुई: {output_path}")

    if unmatched_list:
        print("\n⚠️ UNMATCHED STATIONS LIST (रिक्वायर्ड समीक्षा):")
        for st_id, st_name in unmatched_list:
            print(f" - {st_name:<32} (ID: {st_id})")
    print("=" * 85)

if __name__ == "__main__":
    populate_coordinates()