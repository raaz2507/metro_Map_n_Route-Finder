#!/usr/bin/env python3
"""
update_about_metrics.py
Automatically calculates accurate transit metrics from real city datasets and manifest,
and updates `about.js` (data object) and `about.html` (fallback) with zero runtime overhead.
Does NOT pollute or touch i18n language files.
"""

import sys
import os
import json
import re
from pathlib import Path

# Fix Windows console UTF-8 output
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Paths configuration
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
DATA_DIR = PROJECT_ROOT / "main_project" / "data"
MANIFEST_FILE = DATA_DIR / "countries_manifest.json"

ABOUT_HTML = PROJECT_ROOT / "main_project" / "about.html"
ABOUT_JS = PROJECT_ROOT / "main_project" / "js" / "pages" / "about.js"


def calculate_metrics():
    """Scans all active countries in data/ to calculate total countries, cities, networks, and stations."""
    total_stations = 0
    total_cities = 0
    total_networks = 0
    total_countries = 0
    city_station_counts = {}

    # Read countries manifest
    active_countries = ["india"]
    if MANIFEST_FILE.exists():
        try:
            with open(MANIFEST_FILE, "r", encoding="utf-8") as f:
                manifest = json.load(f)
                countries = manifest.get("countries", {})
                active_countries = [c_id for c_id, c in countries.items() if c.get("status") == "active"]
                if not active_countries:
                    active_countries = ["india"]
                total_countries = len(active_countries)
        except Exception as e:
            print(f"[!] Error reading {MANIFEST_FILE}: {e}")

    if total_countries == 0:
        total_countries = len(active_countries)

    for country in active_countries:
        country_dir = DATA_DIR / country
        cities_dir = country_dir / "cities"
        registry_file = country_dir / f"{country}_transit_registry.json"

        # 1. Count stations across all cities
        if cities_dir.exists():
            for city_dir in sorted(cities_dir.iterdir()):
                if city_dir.is_dir():
                    station_file = city_dir / "station_details.json"
                    if station_file.exists():
                        try:
                            with open(station_file, "r", encoding="utf-8") as f:
                                data = json.load(f)
                                stations = data.get("stations", data)
                                count = len(stations)
                                city_station_counts[city_dir.name] = count
                                total_stations += count
                                total_cities += 1
                        except Exception as e:
                            print(f"[!] Error reading {station_file}: {e}")

        # 2. Count active networks from registry
        if registry_file.exists():
            try:
                with open(registry_file, "r", encoding="utf-8") as f:
                    registry = json.load(f)
                    cities_map = registry.get("cities", {})
                    for city_key, city_data in cities_map.items():
                        if city_data.get("hasData") or city_key in city_station_counts:
                            networks = city_data.get("networks", {})
                            operational_nets = [
                                net_id for net_id, net in networks.items()
                                if net.get("hasData") or net.get("status") == "operational"
                            ]
                            count = len(operational_nets) if operational_nets else len(networks)
                            total_networks += count
            except Exception as e:
                print(f"[!] Error reading {registry_file}: {e}")

    if total_networks == 0:
        total_networks = total_cities

    return {
        "total_countries": total_countries,
        "total_stations": total_stations,
        "total_cities": total_cities,
        "total_networks": total_networks,
        "city_station_counts": city_station_counts,
    }


def update_about_js(countries_display: str, cities_display: str, networks_display: str, stations_display: str, offline_display: str = "100%"):
    """Updates ABOUT_METRICS object in about.js."""
    if not ABOUT_JS.exists():
        print(f"[!] {ABOUT_JS} not found.")
        return False

    with open(ABOUT_JS, "r", encoding="utf-8") as f:
        content = f.read()

    replacement = (
        f'export const ABOUT_METRICS = {{\n'
        f'\tcountries: "{countries_display}",\n'
        f'\tcities: "{cities_display}",\n'
        f'\tnetworks: "{networks_display}",\n'
        f'\tstations: "{stations_display}",\n'
        f'\toffline: "{offline_display}"\n'
        f'}};'
    )

    pattern = r'export const ABOUT_METRICS\s*=\s*\{[\s\S]*?\};'
    if not re.search(pattern, content):
        print(f"[!] Pattern ABOUT_METRICS not matched in {ABOUT_JS.name}")
        return False

    content = re.sub(pattern, replacement, content)

    with open(ABOUT_JS, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[+] Updated {ABOUT_JS.name} (countries: {countries_display}, cities: {cities_display}, networks: {networks_display}, stations: {stations_display}, offline: {offline_display})")
    return True


def update_about_html(countries_display: str, cities_display: str, networks_display: str, stations_display: str, offline_display: str = "100%"):
    """Updates fallback values in about.html."""
    if not ABOUT_HTML.exists():
        print(f"[!] {ABOUT_HTML} not found.")
        return False

    with open(ABOUT_HTML, "r", encoding="utf-8") as f:
        content = f.read()

    # Update metricCountries
    content = re.sub(
        r'(id="metricCountries">)(.*?)(</span>)',
        rf'\g<1>{countries_display}\g<3>',
        content
    )
    # Update metricCities
    content = re.sub(
        r'(id="metricCities">)(.*?)(</span>)',
        rf'\g<1>{cities_display}\g<3>',
        content
    )
    # Update metricNetworks
    content = re.sub(
        r'(id="metricNetworks">)(.*?)(</span>)',
        rf'\g<1>{networks_display}\g<3>',
        content
    )
    # Update metricStations
    content = re.sub(
        r'(id="metricStations">)(.*?)(</span>)',
        rf'\g<1>{stations_display}\g<3>',
        content
    )
    # Update metricOffline
    content = re.sub(
        r'(id="metricOffline">)(.*?)(</span>)',
        rf'\g<1>{offline_display}\g<3>',
        content
    )

    with open(ABOUT_HTML, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"[+] Updated {ABOUT_HTML.name} fallback values successfully.")
    return True


def main():
    print("=" * 60)
    print("YatraMarg - 5-Metric World Transit Precomputation Engine")
    print("=" * 60)

    metrics = calculate_metrics()
    total_countries = metrics["total_countries"]
    total_cities = metrics["total_cities"]
    total_networks = metrics["total_networks"]
    total_stations = metrics["total_stations"]

    print(f"\n[*] Total Countries in Manifest: {total_countries}")
    print(f"[*] Active Cities Found: {total_cities}")
    print(f"[*] Active Networks Found: {total_networks}")
    print(f"[*] Total Stations Found: {total_stations}")

    # Format values for display: e.g. "4+", "16+", "23+", "930+", "100%"
    countries_display = f"{total_countries}+"
    cities_display = f"{total_cities}+"
    networks_display = f"{total_networks}+"
    rounded_stations = f"{(total_stations // 10) * 10}+" if total_stations >= 50 else f"{total_stations}+"
    offline_display = "100%"

    print(f"\n[*] Computed Display Metrics:")
    print(f"    - Countries: {countries_display}")
    print(f"    - Cities   : {cities_display}")
    print(f"    - Networks : {networks_display}")
    print(f"    - Stations : {rounded_stations}")
    print(f"    - Offline  : {offline_display}")
    print("-" * 60)

    # Perform updates strictly to about.js object and about.html fallback (NO i18n touching)
    update_about_js(countries_display, cities_display, networks_display, rounded_stations, offline_display)
    update_about_html(countries_display, cities_display, networks_display, rounded_stations, offline_display)

    print("\n[SUCCESS] 5 World Transit metrics synchronized cleanly!")
    print("=" * 60)


if __name__ == "__main__":
    main()
