import json
import time
import urllib.request
import urllib.parse
import os

INPUT_FILE = '../../data/data.json'
OUTPUT_FILE = 'gmaps_fetched_coordinates.json'

def load_json(filepath):
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def save_json(data, filepath):
    temp = filepath + ".tmp"
    with open(temp, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(temp, filepath)

def fetch_precise_coords(station_name):
    query = f"{station_name} Metro Station Delhi"
    url = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?f=json&singleLine=" + urllib.parse.quote(query)
    
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DelhiMetroApp/1.0'}
    req = urllib.request.Request(url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            candidates = data.get('candidates', [])
            if candidates:
                c = candidates[0]
                loc = c.get('location', {})
                if 'x' in loc and 'y' in loc:
                    return round(loc['y'], 6), round(loc['x'], 6), c.get('address', '')
    except Exception as e:
        pass
        
    return None, None, ""

def main():
    print("=" * 80)
    print(" 🚀 REAL METRO STATION COORDINATES GENERATOR")
    print("=" * 80)
    
    metro_data = load_json(INPUT_FILE)
    stations = metro_data.get('stationData', {})
    results = load_json(OUTPUT_FILE)
    
    total = len(stations)
    already_done = len([k for k, v in results.items() if v.get('lat') is not None])
    print(f"📊 Total stations: {total} | Already completed: {already_done}\n")
    
    success_count = already_done
    
    for idx, (st_id, st_data) in enumerate(stations.items(), start=1):
        st_name = st_data.get('name', st_id)
        
        # पहले से मौजूद है तो स्किप करें (Resume Support)
        if st_id in results and results[st_id].get('lat') is not None:
            continue
            
        print(f"[{idx:>3}/{total}] 🔍 Searching coordinates for: '{st_name}'...")
        lat, lon, addr = fetch_precise_coords(st_name)
        
        if lat and lon:
            print(f"        ✅ Found: Lat {lat}, Lon {lon} | ({addr})")
            results[st_id] = {
                "id": st_id,
                "name": st_name,
                "lat": lat,
                "lon": lon,
                "matched_address": addr
            }
            success_count += 1
        else:
            print(f"        ⚠️ Could not find coordinates for '{st_name}'")
            results[st_id] = {
                "id": st_id,
                "name": st_name,
                "lat": None,
                "lon": None
            }
            
        # हर 1 स्टेशन के बाद तुरंत डिस्क सेव!
        save_json(results, OUTPUT_FILE)
        time.sleep(0.3)  # तेज़ और सेफ़
        
    print("=" * 80)
    print(f"🎉 Process Finished! Successfully fetched: {success_count}/{total}")
    print(f"📁 Saved file: {OUTPUT_FILE}")

if __name__ == '__main__':
    main()