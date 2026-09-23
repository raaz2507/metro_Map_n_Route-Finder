"""
🎨 Script 1: Apply Authentic City Colors to Registry
Adds 'themeColor' to each city in data/india_transit_registry.json
"""
import json
import os

REGISTRY_PATH = os.path.join("data", "india_transit_registry.json")

# प्रामाणिक व सांस्कृतिक कलर मैपिंग
CITY_COLORS = {
    "delhi_ncr": "#1E40AF",              # Republic Navy Blue
    "mumbai": "#0284C7",                 # Arabian Sea Azure
    "kolkata": "#BE123C",                # Terracotta Crimson
    "bengaluru": "#059669",              # Garden City Emerald
    "hyderabad": "#7C3AED",              # Nizam Royal Amethyst
    "chennai": "#B45309",                # Temple Gopuram Bronze
    "kochi": "#0D9488",                  # Backwater Teal
    "ahmedabad_gandhinagar": "#F59E0B",  # Marigold Amber
    "nagpur": "#D97706",                 # Maratha Saffron Gold
    "pune": "#D97706",                   # Maratha Saffron Gold
    "jaipur": "#E11D48",                 # Pink City Rose
    "lucknow": "#C2410C",                # Awadhi Clay Ochre
    "kanpur": "#C2410C",                 # Awadhi Clay Ochre
    "agra": "#C2410C",                   # Awadhi Clay Ochre
    "indore": "#0891B2",                 # Lake Cleanliness Cyan
    "bhopal": "#0891B2",                 # Lake Cleanliness Cyan
    "patna": "#9333EA",                  # Magadha Imperial Plum
    "surat": "#F59E0B",                  # Marigold Amber
    "meerut": "#C2410C",                 # Awadhi Clay Ochre
    "gorakhpur": "#C2410C",              # Awadhi Clay Ochre
    "jammu": "#2563EB",                  # Glacial Sapphire Blue
    "srinagar": "#2563EB",               # Glacial Sapphire Blue
    "dehradun": "#047857"                # Devbhoomi Pine Green
}

if not os.path.exists(REGISTRY_PATH):
    print(f"❌ Error: {REGISTRY_PATH} not found!")
    exit(1)

with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
    registry = json.load(f)

cities = registry.get("cities", {})
updated_count = 0

print("🚀 Applying authentic theme colors to cities...\n")

for city_key, city_data in cities.items():
    color = CITY_COLORS.get(city_key, "#2563EB")
    city_data["themeColor"] = color
    updated_count += 1
    print(f"✅ {city_data.get('name', city_key):25} ➔ {color}")

with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
    json.dump(registry, f, indent="\t", ensure_ascii=False)

print(f"\n🎉 Successfully updated {updated_count} cities in {REGISTRY_PATH}!")