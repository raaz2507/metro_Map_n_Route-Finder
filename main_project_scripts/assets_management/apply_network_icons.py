"""
====================================================================================================
🖼️ Transit Network Logo Linking Engine (Asset-to-Registry Mapper)
====================================================================================================
📁 Location:
    main_project_scripts/assets_management/apply_network_icons.py

🎯 Purpose & Scope:
    Maps verified local logo files from `assets/icons/networks/` directly to their respective
    transit network entries in `india_transit_registry.json`.

🛡️ Key Features & Safeguards:
    1. Disk Existence Assertion:
       Only links the `icon` web path if the actual image file physically exists on disk.
    2. Graceful Fallback:
       If an asset is missing from disk, it safely strips the `icon` field so the frontend
       automatically renders the fallback SVG monogram badge instead of a broken image.
    3. Interactive Re-apply Prompt:
       If a network already has an icon assigned, asks user permission ([y]es / [n]o / [a]ll)
       before modifying.
    4. Minimal I/O:
       Only rewrites `india_transit_registry.json` if actual modifications were made.

💻 CLI Usage:
    py apply_network_icons.py
====================================================================================================
"""


import json
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "main_project"))
REGISTRY_PATH = os.path.join(PROJECT_ROOT, "data", "india", "india_transit_registry.json")
ICONS_DIR = os.path.join(PROJECT_ROOT, "assets", "icons", "networks")

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
skipped_count = 0
overwrite_all = False
has_changes = False

print("🚀 Mapping downloaded logo assets to transit networks...\n")

for city_key, city_data in cities.items():
	networks = city_data.get("networks", {})
	for net_key, net_data in networks.items():
		raw_name = net_data.get("name", net_key)
		display_name = raw_name.get("en", net_key) if isinstance(raw_name, dict) else str(raw_name)

		icon_filename = NETWORK_ICON_MAP.get(net_key)
		
		if icon_filename:
			icon_disk_path = os.path.join(ICONS_DIR, icon_filename)
			
			if os.path.exists(icon_disk_path):
				web_path = f"assets/icons/networks/{icon_filename}"
				current_icon = net_data.get("icon")

				# Agar already same icon laga hua hai
				if current_icon == web_path:
					if not overwrite_all:
						choice = input(f"❓ {display_name:32} already has '{current_icon}'. Re-apply? ([y]es / [n]o / [a]ll): ").strip().lower()
						if choice == 'a':
							overwrite_all = True
							apply_icon = True
						elif choice == 'y':
							apply_icon = True
						else:
							apply_icon = False
					else:
						apply_icon = True
				else:
					apply_icon = True

				if apply_icon:
					net_data["icon"] = web_path
					attached_count += 1
					has_changes = True
					print(f"✅ {display_name:32} ➔ {web_path}")
				else:
					skipped_count += 1
					print(f"⏩ Skipped {display_name:24} (kept '{current_icon}')")
			else:
				if "icon" in net_data:
					net_data.pop("icon", None)
					has_changes = True
				print(f"ℹ️ {display_name:32} ➔ (No file on disk, fallback active)")

if has_changes:
	with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
		json.dump(registry, f, indent="\t", ensure_ascii=False)
	print(f"\n🎉 Successfully saved changes to {REGISTRY_PATH}!")
else:
	print(f"\nℹ️ No changes made to registry.")

print(f"📊 Summary: {attached_count} applied/confirmed, {skipped_count} skipped.")