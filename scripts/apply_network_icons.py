"""
🖼️ Script 2: Apply Downloaded Network Icons to Registry
Attaches verified local logo file paths to corresponding networks in data/india_transit_registry.json
"""
import json
import os

REGISTRY_PATH = os.path.join("data", "india_transit_registry.json")
ICONS_DIR = os.path.join("assets", "icons", "networks")

# नेटवर्क से लोगो फाइल की मैपिंग
NETWORK_ICON_MAP = {
    "dmrc": "dmrc.svg",
    "nmrc": "nmrc.png",
    "delhi_meerut_rrts": "ncrtc.svg",
    "delhi_alwar_rrts": "ncrtc.svg",
    "delhi_panipat_rrts": "ncrtc.svg",
    "rapid_metro_gurugram": "rapid_metro.svg",
    "mumbai_metro": "mumbai_metro.svg",
    "kolkata_metro": "kolkata_metro.svg",
    "namma_metro": "namma_metro.png",
    "hyderabad_metro": "hyderabad_metro.svg",
    "chennai_metro": "chennai_metro.svg",
    "kochi_metro": "kochi_metro.png",
    "pune_metro": "pune_metro.png",
    "lucknow_metro": "up_metro.svg",
    "kanpur_metro": "up_metro.svg",
    "agra_metro": "up_metro.svg"
}

if not os.path.exists(REGISTRY_PATH):
    print(f"❌ Error: {REGISTRY_PATH} not found!")
    exit(1)

with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
    registry = json.load(f)

cities = registry.get("cities", {})
attached_count = 0

print("🚀 Mapping downloaded logo assets to transit networks...\n")

for city_key, city_data in cities.items():
    networks = city_data.get("networks", {})
    for net_key, net_data in networks.items():
        icon_filename = NETWORK_ICON_MAP.get(net_key)
        
        if icon_filename:
            icon_disk_path = os.path.join(ICONS_DIR, icon_filename)
            # केवल तभी पाथ जोड़ें जब वह इमेज वास्तव में आपके डिस्क पर मौजूद हो
            if os.path.exists(icon_disk_path):
                # Web relative path forward slashes me
                web_path = f"assets/icons/networks/{icon_filename}"
                net_data["icon"] = web_path
                attached_count += 1
                print(f"✅ {net_data.get('name', net_key):35} ➔ {web_path}")
            else:
                # यदि फाइल डिस्क पर नहीं है, तो फॉलबैक के लिए icon फील्ड न जोड़ें या हटा दें
                net_data.pop("icon", None)
                print(f"ℹ️ {net_data.get('name', net_key):35} ➔ (No file on disk, fallback active)")

with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
    json.dump(registry, f, indent="\t", ensure_ascii=False)

print(f"\n🎉 Successfully linked {attached_count} network logos in {REGISTRY_PATH}!")