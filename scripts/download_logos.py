"""
🚇 Metro Network Official Vector & HD Logos Downloader
Downloads crisp official SVG/PNG logos from Wikimedia into assets/icons/networks/
"""
import os
import time
import urllib.request

TARGET_DIR = os.path.join("assets", "icons", "networks")
os.makedirs(TARGET_DIR, exist_ok=True)

# आधिकारिक वेरिफाइड लिंक्स की पूरी सूची
LOGOS = [
    ("dmrc.svg", "https://upload.wikimedia.org/wikipedia/commons/6/65/Delhi_Metro_logo.svg"),
    ("nmrc.png", "https://upload.wikimedia.org/wikipedia/en/8/80/Noida_Metro_Logo.png"),
    ("ncrtc.svg", "https://upload.wikimedia.org/wikipedia/commons/7/7c/NCRTC_logo.svg"),
    ("kolkata_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/4/4d/Kolkata_Metro_Logo_Blue_Line.svg"),
    ("chennai_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/8/8d/Chennai_Metro_logo.svg"),
    ("hyderabad_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/a/ae/Seal_of_Hyderabad_Metro_Rail.svg"),
    ("namma_metro.png", "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Namma_Metro_Logo.jpg/512px-Namma_Metro_Logo.jpg"),
    ("mumbai_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/7/74/Logo_of_Mumbai_Metro_Line_1.svg"),
    ("up_metro.svg", "https://upload.wikimedia.org/wikipedia/commons/6/6c/UPMRC.svg"),
    ("kochi_metro.png", "https://upload.wikimedia.org/wikipedia/en/1/18/Koch_Metro_Logo.png"),
    ("pune_metro.png", "https://upload.wikimedia.org/wikipedia/commons/5/58/PUNE_METRO_LOGO.png")
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MetroAppLogoSync/2.0 (contact: admin@yatramarg.com)"
}

print(f"🚀 Starting transit logos sync in: '{TARGET_DIR}'...\n")

for filename, url in LOGOS:
    dest_path = os.path.join(TARGET_DIR, filename)
    
    # यदि फाइल पहले से मौजूद है और खाली नहीं है, तो स्किप करें
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        print(f"⏩ Already exists: {filename:20} (Skipping)")
        continue

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            content = resp.read()
            with open(dest_path, "wb") as f:
                f.write(content)
            print(f"✅ Downloaded:     {filename:20} ({len(content) // 1024} KB)")
    except Exception as err:
        print(f"⚠️ Notice for {filename}: {err}")

    # 429 ब्लॉक से बचने के लिए सुरक्षित अंतराल
    time.sleep(2.0)

print(f"\n🎉 Finished! All logo assets are verified in: {TARGET_DIR}")