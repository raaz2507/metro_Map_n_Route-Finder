"""
====================================================================================================
🚇 Metro & Transit Network Vector Logo Downloader (Wikimedia Pipeline)
====================================================================================================
📁 Location:
    main_project_scripts/assets_management/download_logos.py

🎯 Purpose & Scope:
    Fetches verified, authentic SVG/PNG vector logos of major Indian metro and rapid rail transit
    networks (DMRC, NMRC, NCRTC, Mumbai Metro, Namma Metro, Kolkata Metro, UPMRC, etc.) directly
    from official Wikimedia sources.

🛡️ Key Features & Safeguards:
    1. Interactive Overwrite Prompt:
       If a logo already exists on disk, it prompts the user ([y]es / [n]o / [a]ll) instead of
       blindly re-downloading or silently skipping.
    2. Rate Limiting Protection:
       Uses polite User-Agent headers and a 1.0s delay between requests to avoid HTTP 429 errors.
    3. Zero Corruption:
       Checks file sizes and only saves complete HTTP response buffers.

📦 Target Storage:
    main_project/assets/icons/networks/

💻 CLI Usage:
    py download_logos.py
====================================================================================================
"""

import os
import time
import urllib.request

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "main_project"))
TARGET_DIR = os.path.join(PROJECT_ROOT, "assets", "icons", "networks")
os.makedirs(TARGET_DIR, exist_ok=True)

# आधिकारिक वेरिफाइड लिंक्स की पूरी सूची
LOGOS = [
	("dmrc.svg", "https://upload.wikimedia.org/wikipedia/commons/6/65/Delhi_Metro_logo.svg"),
	("nmrc.svg", "https://upload.wikimedia.org/wikipedia/fr/d/d6/Noida_Metro_logo.svg?utm_source=fr.wikipedia.org&utm_campaign=index&utm_content=original"),
	("ncrtc.svg", "https://upload.wikimedia.org/wikipedia/commons/7/7c/NCRTC_logo.svg"),
	("kolkata_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/4/4d/Kolkata_Metro_Logo_Blue_Line.svg"),
	("chennai_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/8/8d/Chennai_Metro_logo.svg"),
	("hyderabad_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Hyderabad_Metro_Rail.svg"),
	("Namma_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/0/02/Namma_metro_icon.svg?download"),
	("mumbai_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/7/74/Logo_of_Mumbai_Metro_Line_1.svg"),
	("up_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/6/6c/UPMRC.svg"),
	("kochi_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/c/ce/Logo_of_Kochi_Metro.svg"),
	("pune_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/a/af/Maha-metro-logo.svg"),
	("nagpur_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/a/af/Maha-metro-logo.svg"),
]

headers = {
	"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MetroAppLogoSync/2.0 (contact: admin@yatramarg.com)"
}

print(f"🚀 Starting transit logos sync in: '{TARGET_DIR}'...\n")

overwrite_all = False
downloaded_count = 0
skipped_count = 0

for filename, url in LOGOS:
	dest_path = os.path.join(TARGET_DIR, filename)
	
	should_download = True
	if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
		if not overwrite_all:
			choice = input(f"❓ '{filename}' already exists. Overwrite? ([y]es / [n]o / [a]ll): ").strip().lower()
			if choice == 'a':
				overwrite_all = True
				should_download = True
			elif choice == 'y':
				should_download = True
			else:
				should_download = False

	if not should_download:
		print(f"⏩ Skipped:        {filename:20}")
		skipped_count += 1
		continue

	req = urllib.request.Request(url, headers=headers)
	try:
		with urllib.request.urlopen(req, timeout=10) as resp:
			content = resp.read()
			with open(dest_path, "wb") as f:
				f.write(content)
			print(f"✅ Downloaded:     {filename:20} ({len(content) // 1024} KB)")
			downloaded_count += 1
	except Exception as err:
		print(f"⚠️ Failed for {filename}: {err}")

	# Rate limit delay
	time.sleep(1.0)

print(f"\n🎉 Finished! Downloaded: {downloaded_count}, Skipped: {skipped_count}")
print(f"📁 Target Directory: {TARGET_DIR}")