import os
import sys
import json
import re
import time
import random
from urllib.parse import quote_plus
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

"""
========================================================================================
🚇 YATRAMARG — CITY-BY-CITY GOOGLE MAPS GEO-COORDINATE EXTRACTOR (OOP CLASS ENGINE)
========================================================================================

Author: Senior Pair Programmer (YatraMarg Core Team)
Scope: Enterprise Object-Oriented class engine for extracting ground-truth Lat/Lon,
       Feature IDs, and Universal Google Maps URLs for Indian Metro Stations.

Architecture & Safety Features:
1. Pure OOP Encapsulation: State and lifecycle managed cleanly inside CityGeoExtractor.
2. Context Manager Support: Automatic and safe Chrome driver teardown via `with` statement.
3. Zero Cost & Zero Billing: Uses system Chrome via Selenium headless (No API key needed).
4. Anti-Detection: Desktop viewport, realistic headers, and defensive delays.
5. Incremental Persistence: Real-time atomic disk persistence after every station.
6. Resumable (Idempotent): Skips already-fetched stations with valid non-null coordinates.
7. Strict Schema Compliance: Retains exact required output JSON schema.
========================================================================================




# 🚇 YatraMarg — City Geo-Coordinate Extractor & Audit Engine

यह टूल भारत के हर मेट्रो शहर के स्टेशनों के सटीक लैटिट्यूड/लॉन्गिट्यूड (Lat/Lon), गूगल मैप्स लिंक्स (Google Maps Universal URLs) और फीचर आईडीज (Place CIDs) निकालने और ऑडिट करने के लिए बनाया गया एक एंटरप्राइज ऑब्जेक्ट-ओरिएंटेड (OOP) इंजन है।

---

## 🎮 इंटरैक्टिव कंट्रोलर (Interactive Menu - सबसे आसान तरीका)

बस बिना किसी आर्ग्युमेंट के स्क्रिप्ट चलाएं:
```powershell
cd "d:\projects\metro_Map_n_Route Finder\temp_working files\geo_benchmark_test"
python city_geo_extractor.py
```

स्क्रीन पर एक इंटरैक्टिव मेनू खुलेगा:
```text
======================================================================
         YATRAMARG - GEO-EXTRACTOR & AUDIT CONTROLLER
======================================================================
  [A0] RUN ALL 17 CITIES          |  [R0] FULL GLOBAL AUDIT REPORT
----------------------------------------------------------------------
  [ 1] Agra Metro                 |  [10] Pune Metro
  [ 2] Kanpur Metro               |  [11] Nagpur Metro
  [ 3] Bhopal Metro               |  [12] Chennai Metro
  [ 4] Indore Metro               |  [13] Mumbai Metro
  [ 5] Navi Mumbai Metro          |  [14] Kolkata Metro
  [ 6] Jaipur Metro               |  [15] Hyderabad Metro
  [ 7] Lucknow Metro              |  [16] Namma Metro (Bengaluru)
  [ 8] Noida Metro (NMRC)         |  [17] Ahmedabad Metro
  [ 9] Kochi Metro                |
----------------------------------------------------------------------
  COMMAND FORMAT:
    * Type 'A<num>' to FETCH data  (e.g., A1 for Agra, A8 for Noida)
    * Type 'R<num>' for NULL REPORT (e.g., R1 for Agra, R8 for Noida)
    * Type 'A0' to run ALL cities  |  Type 'R0' for ALL reports
    * Or just enter number (e.g., '1') to fetch
    * Type 'Q' to Quit / Exit
======================================================================
👉 Enter Command: 
```

### 💡 कमांड्स का अर्थ:
| कमांड | एक्शन | क्या करेगा |
| :--- | :--- | :--- |
| **`A0`** | **Fetch All** | सभी 17 शहरों का डेटा एक के बाद एक फेच करेगा। |
| **`R0`** | **Report All** | सभी 17 शहरों की ग्लोबल अनसुलझे (null) स्टेशनों की ऑडिट रिपोर्ट दिखाएगा। |
| **`A1`** | **Fetch City** | केवल आगरा (City 1) का डेटा फेच करेगा। |
| **`R1`** | **Report City** | केवल आगरा (City 1) की ऑडिट रिपोर्ट दिखाएगा। |
| **`A8` / `R8`** | Noida Fetch / Report | केवल नोएडा (City 8) का डेटा फेच या रिपोर्ट करेगा। |
| **`1` से `17`** | Quick Fetch | सीधे नंबर टाइप करने पर भी उस शहर का डेटा फेच होगा। |
| **`Q`** | **Quit** | मेनू से बाहर निकल जाएगा। |

---

## 🛠️ डायरेक्ट CLI कमांड्स (Direct CLI Flags)

यदि आप मेनू खोले बिना सीधे बैकग्राउंड या ऑटोमेशन में चलाना चाहते हैं:

1. **सभी शहर फेच करने के लिए**:
   ```powershell
   python city_geo_extractor.py --all
   ```

2. **ग्लोबल ऑडिट रिपोर्ट देखने के लिए**:
   ```powershell
   python city_geo_extractor.py --report
   ```

3. **किसी विशिष्ट शहर की ऑडिट रिपोर्ट देखने के लिए**:
   ```powershell
   python city_geo_extractor.py --report kanpur_metro_data
   ```

4. **किसी विशिष्ट शहर को फेच करने के लिए**:
   ```powershell
   python city_geo_extractor.py agra_metro_data
   ```

---

## 🎯 आउटपुट डायरेक्टरी और स्कीमा (Output Files)

सभी शहरों का डेटा सुरक्षित रूप से इस पाथ पर अलग-अलग सब-फोल्डर्स में सेव होता है:
```text
temp_working files/geo_benchmark_test/india/cities/<city_folder>/
```

### स्कीमा:
```json
[
  {
    "station_id": "iit_kanpur",
    "name": "IIT Kanpur",
    "google_maps_url": "https://www.google.com/maps/search/?api=1&query=IIT+Kanpur+Metro+Station",
    "generated_google_maps_url": "https://www.google.com/maps/place/IIT+Kanpur+Metro+Station/@26.5092425,80.248232,17z/...",
    "coordinates": {
      "lat": 26.5092425,
      "lon": 80.248232
    }
  }
]
```

"""


class CityGeoExtractor:
    """Enterprise OOP Engine for resolving metro station geo-coordinates from Google Maps."""

    CITY_CONFIG = {
        "nmrc_noida_data": {
            "dataset_folder": "nmrc_noida_data",
            "master_file": "noida_transit_network.json",
            "city_search_keyword": "Noida, Uttar Pradesh",
            "output_filename": "noida_station_google_map_coordinates.json"
        },
        "chennai_metro_data": {
            "dataset_folder": "chennai_metro_data",
            "master_file": "chennai_metro_master.json",
            "city_search_keyword": "Chennai, Tamil Nadu",
            "output_filename": "chennai_station_google_map_coordinates.json"
        },
        "agra_metro_data": {
            "dataset_folder": "agra_metro_data",
            "master_file": "agra_metro_master.json",
            "city_search_keyword": "Agra, Uttar Pradesh",
            "output_filename": "agra_station_google_map_coordinates.json"
        },
        "ahmedabad_metro_data": {
            "dataset_folder": "ahmedabad_metro_data",
            "master_file": "ahmedabad_metro_master.json",
            "city_search_keyword": "Ahmedabad, Gujarat",
            "output_filename": "ahmedabad_station_google_map_coordinates.json"
        },
        "bhopal_metro_data": {
            "dataset_folder": "bhopal_metro_data",
            "master_file": "bhopal_metro_master.json",
            "city_search_keyword": "Bhopal, Madhya Pradesh",
            "output_filename": "bhopal_station_google_map_coordinates.json"
        },
        "hyderabad_metro_data": {
            "dataset_folder": "hyderabad_metro_data",
            "master_file": "hyderabad_metro_master.json",
            "city_search_keyword": "Hyderabad, Telangana",
            "output_filename": "hyderabad_station_google_map_coordinates.json"
        },
        "indore_metro_data": {
            "dataset_folder": "indore_metro_data",
            "master_file": "indore_metro_master.json",
            "city_search_keyword": "Indore, Madhya Pradesh",
            "output_filename": "indore_station_google_map_coordinates.json"
        },
        "jaipur_metro_data": {
            "dataset_folder": "jaipur_metro_data",
            "master_file": "jaipur_metro_master.json",
            "city_search_keyword": "Jaipur, Rajasthan",
            "output_filename": "jaipur_station_google_map_coordinates.json"
        },
        "kanpur_metro_data": {
            "dataset_folder": "kanpur_metro_data",
            "master_file": "kanpur_metro_master.json",
            "city_search_keyword": "Kanpur, Uttar Pradesh",
            "output_filename": "kanpur_station_google_map_coordinates.json"
        },
        "kochi_metro_data": {
            "dataset_folder": "kochi_metro_data",
            "master_file": "kochi_metro_master.json",
            "city_search_keyword": "Kochi, Kerala",
            "output_filename": "kochi_station_google_map_coordinates.json"
        },
        "kolkata_metro_data": {
            "dataset_folder": "kolkata_metro_data",
            "master_file": "kolkata_metro_master.json",
            "city_search_keyword": "Kolkata, West Bengal",
            "output_filename": "kolkata_station_google_map_coordinates.json"
        },
        "lucknow_metro_data": {
            "dataset_folder": "lucknow_metro_data",
            "master_file": "lucknow_metro_master.json",
            "city_search_keyword": "Lucknow, Uttar Pradesh",
            "output_filename": "lucknow_station_google_map_coordinates.json"
        },
        "mumbai_metro_data": {
            "dataset_folder": "mumbai_metro_data",
            "master_file": "mumbai_metro_master.json",
            "city_search_keyword": "Mumbai, Maharashtra",
            "output_filename": "mumbai_station_google_map_coordinates.json"
        },
        "nagpur_metro_data": {
            "dataset_folder": "nagpur_metro_data",
            "master_file": "nagpur_metro_master.json",
            "city_search_keyword": "Nagpur, Maharashtra",
            "output_filename": "nagpur_station_google_map_coordinates.json"
        },
        "namma_metro_data": {
            "dataset_folder": "namma_metro_data",
            "master_file": "namma_metro_master.json",
            "city_search_keyword": "Bengaluru, Karnataka",
            "output_filename": "bengaluru_station_google_map_coordinates.json"
        },
        "navi_mumbai_metro_data": {
            "dataset_folder": "navi_mumbai_metro_data",
            "master_file": "navi_mumbai_metro_master.json",
            "city_search_keyword": "Navi Mumbai, Maharashtra",
            "output_filename": "navi_mumbai_station_google_map_coordinates.json"
        },
        "pune_metro_data": {
            "dataset_folder": "pune_metro_data",
            "master_file": "pune_metro_master.json",
            "city_search_keyword": "Pune, Maharashtra",
            "output_filename": "pune_station_google_map_coordinates.json"
        },
        "dmrc_delhi_data": {
            "dataset_folder": "dmrc_delhi_data",
            "master_file": "dmrc_delhi_master.json",
            "city_search_keyword": "Delhi, India",
            "output_filename": "delhi_station_google_map_coordinates.json"
        },
        "ncrtc_rrts_data": {
            "dataset_folder": "ncrtc_rrts_data",
            "master_file": "ncrtc_rrts_master.json",
            "city_search_keyword": "Delhi Meerut RRTS Namo Bharat, India",
            "output_filename": "ncrtc_station_google_map_coordinates.json"
        },
        "mumbai_monorail_data": {
            "dataset_folder": "mumbai_monorail_data",
            "master_file": "mumbai_monorail_master.json",
            "city_search_keyword": "Mumbai Monorail, Maharashtra",
            "output_filename": "mumbai_monorail_station_google_map_coordinates.json"
        }
    }

    def __init__(self, base_dir=None):
        """Initializes base paths, environment and lazy driver placeholder."""
        if base_dir:
            self.base_dir = os.path.abspath(base_dir)
        else:
            self.base_dir = os.path.dirname(os.path.abspath(__file__))
        
        self.project_root = os.path.abspath(os.path.join(self.base_dir, "..", ".."))
        self._driver = None

    def __enter__(self):
        """Context manager entry."""
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit ensuring safe teardown of Chrome driver."""
        self.close()

    def _get_driver(self):
        """Lazy initialization of high-performance headless Chrome driver."""
        if self._driver is None:
            options = Options()
            options.add_argument("--headless=new")
            options.add_argument("--disable-gpu")
            options.add_argument("--no-sandbox")
            options.add_argument("--disable-dev-shm-usage")
            options.add_argument("--window-size=1280,800")
            options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
            self._driver = webdriver.Chrome(options=options)
        return self._driver

    def close(self):
        """Safely terminates active Chrome driver process."""
        if self._driver is not None:
            try:
                self._driver.quit()
            except Exception:
                pass
            finally:
                self._driver = None

    @staticmethod
    def clean_station_name(name):
        """Cleans station name for search query (removes brackets, notes)."""
        return re.sub(r'\(.*?\)', '', name).strip()

    @staticmethod
    def extract_coords(url):
        """Extracts (lat, lon) tuple from Google Maps resolved destination URL."""
        match = re.search(r'/@([0-9\.\-]+),([0-9\.\-]+)', url)
        if match:
            return float(match.group(1)), float(match.group(2))
        return None, None

    @staticmethod
    def extract_feature_id(url):
        """Extracts Google Feature ID / CID (0x...:0x...) if present."""
        match = re.search(r'(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)', url)
        if match:
            return match.group(1)
        return None

    def read_stations_from_master(self, master_path):
        """
        Parses stationData dictionary from city master JSON file.
        Returns: list of dicts [{'station_id': '...', 'name': '...'}]
        """
        if not os.path.exists(master_path):
            raise FileNotFoundError(f"Master file not found: {master_path}")

        with open(master_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        stations = []
        station_data = data.get("stationData")
        # If no "stationData" wrapper, check if the file itself is a dictionary of stations (like DMRC and NCRTC)
        if not isinstance(station_data, dict):
            station_data = {
                k: v for k, v in data.items()
                if isinstance(v, dict) and ("name" in v or "id" in v or "lines" in v)
            }

        for st_id, st_obj in station_data.items():
            name_field = st_obj.get("name")
            if isinstance(name_field, dict):
                name_en = name_field.get("en", "")
            elif isinstance(name_field, str):
                name_en = name_field
            else:
                name_en = st_id.replace("_", " ").replace("-", " ").title()

            stations.append({
                "station_id": st_obj.get("id", st_id),
                "name": name_en.strip()
            })
        return stations

    def _load_existing_progress(self, output_file, total_stations_count):
        """
        Loads existing output file for idempotency / resume capability.
        Strict verification: Only records with valid non-null coordinates are treated as completed.
        """
        saved_records = []
        saved_ids = set()
        if os.path.exists(output_file):
            try:
                with open(output_file, "r", encoding="utf-8") as f:
                    raw_records = json.load(f)
                    for r in raw_records:
                        coords = r.get("coordinates") or {}
                        if coords.get("lat") is not None and coords.get("lon") is not None:
                            saved_ids.add(r["station_id"])
                            saved_records.append(r)
                print(f" [*] Found existing progress: {len(saved_ids)}/{total_stations_count} valid stations already fetched.")
            except Exception as e:
                print(f" [!] Could not load existing file ({e}), starting fresh.")
                saved_records = []
                saved_ids = set()

        return saved_records, saved_ids

    def resolve_station(self, station_name, city_search_keyword):
        """
        Navigates Google Maps to resolve station coordinates and place URL.
        Returns: (lat, lon, final_url, fid)
        """
        driver = self._get_driver()
        clean_name = self.clean_station_name(station_name)

        # Smart deduplication for 'Metro' and 'Station'
        metro_suffix = ""
        if "metro" not in clean_name.lower():
            metro_suffix = " Metro Station"
        elif "station" not in clean_name.lower():
            metro_suffix = " Station"

        query = f"{clean_name}{metro_suffix}, {city_search_keyword}, India"
        search_url = f"https://www.google.com/maps/search/{quote_plus(query)}"

        driver.get(search_url)

        # Wait up to 6 seconds for redirect to /place/
        start_t = time.time()
        final_url = driver.current_url
        while time.time() - start_t < 6:
            final_url = driver.current_url
            if "/place/" in final_url and "/@" in final_url:
                break
            time.sleep(0.4)

        # Handle list results: auto-click first place card if not redirected directly
        if "/place/" not in final_url:
            try:
                items = driver.find_elements(By.CSS_SELECTOR, "a[href*='/maps/place/']")
                if items:
                    items[0].click()
                    click_t = time.time()
                    while time.time() - click_t < 5:
                        final_url = driver.current_url
                        if "/place/" in final_url and "/@" in final_url:
                            break
                        time.sleep(0.3)
            except Exception:
                pass

        lat, lon = self.extract_coords(final_url)
        fid = self.extract_feature_id(final_url)
        return lat, lon, final_url, fid, clean_name

    def run_city(self, city_key):
        """
        End-to-end execution for a given city:
        Reads master data, resumes existing progress, fetches missing stations,
        and saves atomically after each station.
        """
        if city_key not in self.CITY_CONFIG:
            raise ValueError(f"Unknown city_key '{city_key}'. Available: {list(self.CITY_CONFIG.keys())}")

        cfg = self.CITY_CONFIG[city_key]
        master_file = os.path.abspath(os.path.join(
            self.base_dir,
            "..",
            "datasets",
            cfg["dataset_folder"],
            cfg["master_file"]
        ))
        output_dir = os.path.join(self.base_dir, "india", "cities", cfg["dataset_folder"])
        os.makedirs(output_dir, exist_ok=True)
        output_file = os.path.join(output_dir, cfg["output_filename"])

        stations = self.read_stations_from_master(master_file)

        print("======================================================================")
        print(f" [*] YATRAMARG GEO EXTRACTOR -- Processing: {city_key}")
        print(f" [-] Master Source : {master_file}")
        print(f" [-] Target Output : {output_file}")
        print(f" [-] Total Stations: {len(stations)}")
        print("======================================================================")

        saved_records, saved_ids = self._load_existing_progress(output_file, len(stations))
        fetched_in_this_session = 0

        for idx, st in enumerate(stations, start=1):
            s_id = st["station_id"]
            s_name = st["name"]

            # Skip already resolved station
            if s_id in saved_ids:
                print(f" [{idx}/{len(stations)}] [SKIPPED] {s_name} ({s_id}) already fetched.")
                continue

            print(f"\n [{idx}/{len(stations)}] Fetching: '{s_name}'...")
            lat, lon, final_url, fid, clean_name = self.resolve_station(s_name, cfg["city_search_keyword"])

            # Strict validation: Non-null coordinates only on confirmed place pages
            if lat is not None and lon is not None and "/place/" in final_url:
                print(f"   [+] Coords: ({lat}, {lon})")
                print(f"   [-] URL   : {final_url[:80]}...")

                short_url = f"https://www.google.com/maps/search/?api=1&query={quote_plus(clean_name + ' Metro Station')}"
                record = {
                    "station_id": s_id,
                    "name": s_name,
                    "google_maps_url": short_url,
                    "generated_google_maps_url": final_url,
                    "coordinates": {
                        "lat": lat,
                        "lon": lon
                    }
                }
                saved_records.append(record)
                saved_ids.add(s_id)
                fetched_in_this_session += 1
            else:
                print(f"   [!] UNRESOLVED: Coords/Place could not be verified for {s_name}. Storing explicit null.")
                record = {
                    "station_id": s_id,
                    "name": s_name,
                    "google_maps_url": None,
                    "generated_google_maps_url": None,
                    "coordinates": {
                        "lat": None,
                        "lon": None
                    }
                }
                saved_records.append(record)

            # Atomic real-time disk persistence
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(saved_records, f, indent=2, ensure_ascii=False)

            # Defensive anti-detection delay
            time.sleep(random.uniform(1.2, 2.5))

        print("\n======================================================================")
        print(" [+] RUN FINISHED SUCCESSFULLY!")
        print(f" Total Stations in Output File: {len(saved_records)}/{len(stations)}")
        print(f" New Stations Added in this Run: {fetched_in_this_session}")
        print(f" File Location: {output_file}")
        print("======================================================================\n")

    def get_unresolved_stations(self, city_key=None):
        """
        Inspects output JSON files and returns list of stations where coordinates are null/unresolved.
        If city_key is provided, inspects only that city; otherwise inspects all configured cities.
        Returns: dict { city_key: [ {'station_id': '...', 'name': '...'}, ... ] }
        """
        cities_to_check = [city_key] if city_key else sorted(self.CITY_CONFIG.keys())
        unresolved_map = {}

        for c_key in cities_to_check:
            if c_key not in self.CITY_CONFIG:
                continue
            cfg = self.CITY_CONFIG[c_key]
            output_file = os.path.join(self.base_dir, "india", "cities", cfg["dataset_folder"], cfg["output_filename"])

            if not os.path.exists(output_file):
                continue

            try:
                with open(output_file, "r", encoding="utf-8") as f:
                    records = json.load(f)

                null_stations = []
                for r in records:
                    coords = r.get("coordinates") or {}
                    if coords.get("lat") is None or coords.get("lon") is None:
                        null_stations.append({
                            "station_id": r.get("station_id"),
                            "name": r.get("name")
                        })

                if null_stations:
                    unresolved_map[c_key] = null_stations
            except Exception:
                pass

        return unresolved_map

    def print_null_report(self, city_key=None):
        """Prints a clean, formatted scorecard of all stations with null/unresolved coordinates."""
        unresolved_map = self.get_unresolved_stations(city_key)

        print("\n======================================================================")
        print(" [*] YATRAMARG UNRESOLVED / NULL STATIONS AUDIT REPORT")
        print("======================================================================")

        if not unresolved_map:
            scope_text = f"for '{city_key}'" if city_key else "across all checked cities"
            print(f" [+] EXCELLENT! Zero null stations found {scope_text}.")
            print("======================================================================\n")
            return

        total_null_count = 0
        for c_key, null_list in unresolved_map.items():
            print(f"\n [!] City: {c_key} ({len(null_list)} unresolved):")
            for idx, item in enumerate(null_list, start=1):
                print(f"     {idx}. {item['name']} (ID: {item['station_id']})")
            total_null_count += len(null_list)

        print("\n----------------------------------------------------------------------")
        print(f" Total Unresolved Stations: {total_null_count}")
        print("======================================================================\n")

    def run_all_cities(self):
        """
        Runs geo-extraction sequentially for all configured cities in optimal order.
        Dynamically derives the order from CITIES_ORDERED to guarantee full coverage of all 20 networks.
        """
        priority_order = [key for key, _ in self.CITIES_ORDERED]

        print("======================================================================")
        print(f" [*] STARTING BATCH EXTRACTION FOR ALL {len(priority_order)} NETWORKS")
        print("======================================================================")

        for idx, c_key in enumerate(priority_order, start=1):
            print(f"\n>>> [{idx}/{len(priority_order)}] Processing City: {c_key}")
            try:
                self.run_city(c_key)
            except Exception as e:
                print(f" [X] Error processing {c_key}: {e}. Continuing to next city...")

        print("\n======================================================================")
        print(" [+] BATCH RUN COMPLETE ACROSS ALL CITIES!")
        print("======================================================================")
        # Automatically print audit report at the end of all cities
        self.print_null_report()


    CITIES_ORDERED = [
        ("agra_metro_data", "Agra Metro"),
        ("kanpur_metro_data", "Kanpur Metro"),
        ("bhopal_metro_data", "Bhopal Metro"),
        ("indore_metro_data", "Indore Metro"),
        ("navi_mumbai_metro_data", "Navi Mumbai Metro"),
        ("jaipur_metro_data", "Jaipur Metro"),
        ("lucknow_metro_data", "Lucknow Metro"),
        ("nmrc_noida_data", "Noida Metro (NMRC)"),
        ("kochi_metro_data", "Kochi Metro"),
        ("pune_metro_data", "Pune Metro"),
        ("nagpur_metro_data", "Nagpur Metro"),
        ("chennai_metro_data", "Chennai Metro"),
        ("mumbai_metro_data", "Mumbai Metro"),
        ("mumbai_monorail_data", "Mumbai Monorail"),
        ("kolkata_metro_data", "Kolkata Metro"),
        ("hyderabad_metro_data", "Hyderabad Metro"),
        ("namma_metro_data", "Namma Metro (Bengaluru)"),
        ("ahmedabad_metro_data", "Ahmedabad Metro"),
        ("ncrtc_rrts_data", "Namo Bharat RRTS"),
        ("dmrc_delhi_data", "Delhi Metro (DMRC)")
    ]

    def interactive_menu(self):
        """Interactive console loop allowing users to easily fetch or audit cities via A0/R0 or A1..A17/R1..R17."""
        while True:
            print("\n======================================================================")
            print("         YATRAMARG - GEO-EXTRACTOR & AUDIT CONTROLLER")
            print("======================================================================")
            print("  [A0] RUN ALL 20 NETWORKS        |  [R0] FULL GLOBAL AUDIT REPORT")
            print("----------------------------------------------------------------------")
            
            # Print cities in 2 columns
            half = (len(self.CITIES_ORDERED) + 1) // 2
            for i in range(half):
                idx1 = i + 1
                key1, name1 = self.CITIES_ORDERED[i]
                col1 = f"[{idx1:2d}] {name1:<22}"

                j = i + half
                if j < len(self.CITIES_ORDERED):
                    idx2 = j + 1
                    key2, name2 = self.CITIES_ORDERED[j]
                    col2 = f"[{idx2:2d}] {name2:<22}"
                else:
                    col2 = ""

                print(f"  {col1}  |  {col2}")

            print("----------------------------------------------------------------------")
            print("  COMMAND FORMAT:")
            print("    * Type 'A<num>' to FETCH data  (e.g., A1 for Agra, A8 for Noida)")
            print("    * Type 'R<num>' for NULL REPORT (e.g., R1 for Agra, R8 for Noida)")
            print("    * Type 'A0' to run ALL cities  |  Type 'R0' for ALL reports")
            print("    * Or just enter number (e.g., '1') to fetch")
            print("    * Type 'Q' to Quit / Exit")
            print("======================================================================")

            try:
                user_input = input("Enter Command: ").strip().upper()
            except (KeyboardInterrupt, EOFError):
                print("\n\n Exiting. Goodbye!")
                break

            if not user_input:
                continue

            if user_input in ["Q", "QUIT", "EXIT"]:
                print("\n Exiting YatraMarg Geo-Extractor. Have a great day!")
                break

            # Global commands
            if user_input in ["A0", "ALL"]:
                self.run_all_cities()
                continue
            elif user_input in ["R0", "REPORT", "REPORTS"]:
                self.print_null_report()
                continue

            # Parse Action and Number
            action = "A"
            num_str = ""

            if user_input.startswith("A") or user_input.startswith("R"):
                action = user_input[0]
                num_str = user_input[1:]
            elif user_input.isdigit():
                action = "A"
                num_str = user_input
            else:
                print(f"\n [!] Invalid command: '{user_input}'. Use format A1, R1, A0, R0, or Q.")
                continue

            if not num_str.isdigit():
                print(f"\n [!] Invalid city number in '{user_input}'. Please enter a valid number 1 to {len(self.CITIES_ORDERED)}.")
                continue

            city_num = int(num_str)
            if city_num < 1 or city_num > len(self.CITIES_ORDERED):
                print(f"\n [!] Number out of range! Please choose between 1 and {len(self.CITIES_ORDERED)}.")
                continue

            city_key, city_name = self.CITIES_ORDERED[city_num - 1]

            if action == "A":
                print(f"\n>>> Starting Extraction for: {city_name} ({city_key})...")
                self.run_city(city_key)
            elif action == "R":
                print(f"\n>>> Generating Audit Report for: {city_name} ({city_key})...")
                self.print_null_report(city_key)


def main():
    # If arguments are passed, use CLI mode; otherwise start Interactive Menu
    if len(sys.argv) > 1:
        cmd = sys.argv[1].strip()
        try:
            with CityGeoExtractor() as extractor:
                if cmd == "--all":
                    extractor.run_all_cities()
                elif cmd == "--report":
                    target_city = sys.argv[2].strip() if len(sys.argv) > 2 else None
                    extractor.print_null_report(target_city)
                else:
                    extractor.run_city(cmd)
        except KeyboardInterrupt:
            print("\n [!] Execution stopped by user. Progress saved cleanly.")
        except Exception as e:
            print(f"\n [X] Execution Error: {e}")
            sys.exit(1)
    else:
        # No args: launch user-friendly interactive while loop
        try:
            with CityGeoExtractor() as extractor:
                extractor.interactive_menu()
        except KeyboardInterrupt:
            print("\n\n [!] Exited cleanly.")


if __name__ == "__main__":
    main()
