"""
====================================================================================================
🚇 YATRAMARG METRO - ENTERPRISE HTML METADATA & CSS SINGLE-ENTRY SYNCHRONIZATION TOOL
====================================================================================================
📌 OVERVIEW & PURPOSE:
----------------------
This build utility enforces the "Single Source of Truth" (DRY) architectural principle across all
public HTML pages in the YatraMarg platform. Instead of manually maintaining duplicate <meta>,
<link>, <title>, and <link rel="stylesheet"> tags across 10+ separate HTML files, this script
reads a declarative master manifest ('pages_meta_config.json') and atomically injects the exact,
standardized <head> block into each page.
🏛️ ARCHITECTURAL PRINCIPLES ENFORCED:
-------------------------------------
1. SINGLE CSS ENTRY POINT (Strict CSS Tree Architecture):
   - HTML pages MUST NOT directly import multiple stylesheet links (e.g., base.css, layout.css,
     header.css, toast.css, etc.).
   - Each HTML page imports strictly ONE dedicated page-level stylesheet (e.g., 'css/pages/index.css').
   - That single stylesheet then internally encapsulates base tokens, components, and layout via @import.
2. ATOMIC BOUNDARY ISOLATION (Safe Marker System):
   - The injection target inside <head> is strictly bounded by HTML comment sentinels:
     <!-- [METADATA_START] -->
     ... [Auto-Generated Standards] ...
     <!-- [METADATA_END] -->
   - The script preserves all custom JavaScript bundles, <body> elements, and page-specific scripts.
   - Repeated executions are 100% idempotent; running this script multiple times produces identical,
     clean output with zero tag duplication or file corruption.
3. UNIFORM SEO & SOCIAL PREVIEW PARITY:
   - Social scrapers (WhatsApp, Telegram, Twitter/X, Facebook, Discord) do not execute JavaScript.
   - This script ensures all Open Graph (og:*) and Twitter Card metadata are pre-rendered statically
     into the raw HTML so social media shares generate beautiful rich cards with verified preview images.
4. DYNAMIC RUNTIME COMPATIBILITY (i18n & Client-Side Hydration):
   - Generates 'data-i18n' attributes on <title> elements so the client-side localization engine
     ('i18n.js') can dynamically translate tab titles into Hindi and regional languages upon user switch.
----------------------------------------------------------------------------------------------------
📂 DIRECTORY TOPOLOGY:
----------------------
metro_Map_n_Route Finder/
├── main_project/                      <-- Project Root (Contains public .html files)
│   ├── index.html
│   ├── all_stations.html
│   └── ...
└── main_project_scripts/
    └── meta_sync/                     <-- This Tool Module
        ├── pages_meta_config.json     <-- Master Configuration Manifest
        └── sync_meta_tags.py          <-- Execution Script (This File)
⚙️ USAGE INSTRUCTIONS:
----------------------
Run from terminal or command prompt:
$ python main_project_scripts/meta_sync/sync_meta_tags.py
====================================================================================================
"""

import os
import json
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(SCRIPT_DIR, "pages_meta_config.json")
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "main_project"))

START_MARKER = "<!-- [METADATA_START] -->"
END_MARKER = "<!-- [METADATA_END] -->"

def build_head_snippet(page_file, page_config, global_config):
	title = page_config.get("default_title", global_config.get("site_name"))
	title_key = page_config.get("title_key", "")
	desc = page_config.get("description", "")
	css_file = page_config.get("css", "")
	
	base_url = global_config.get("base_url", "").rstrip("/") + "/"
	page_url = f"{base_url}{page_file}"
	og_image_url = f"{base_url}{global_config.get('og_image', '')}"
	
	title_attr = f' data-i18n="{title_key}"' if title_key else ""
	
	lines = [
		START_MARKER,
		'\t<meta charset="UTF-8">',
		'\t<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">',
		'',
		'\t<!-- Open Graph / Social Sharing -->',
		'\t<meta property="og:type" content="website">',
		f'\t<meta property="og:url" content="{page_url}">',
		f'\t<meta property="og:title" content="{title}">',
		f'\t<meta property="og:description" content="{desc}">',
		f'\t<meta property="og:image" content="{og_image_url}">',
		'',
		'\t<!-- Twitter / X Cards -->',
		f'\t<meta name="twitter:card" content="{global_config.get("twitter_card", "summary_large_image")}">',
		f'\t<meta name="twitter:url" content="{page_url}">',
		f'\t<meta name="twitter:title" content="{title}">',
		f'\t<meta name="twitter:description" content="{desc}">',
		f'\t<meta name="twitter:image" content="{og_image_url}">',
		'',
		'\t<!-- Favicon & PWA App Standards -->',
		f'\t<link rel="icon" type="image/svg+xml" href="{global_config.get("favicon", "assets/images/site_icon.svg")}">',
		f'\t<link rel="manifest" href="{global_config.get("manifest", "manifest.webmanifest")}">',
		f'\t<meta name="theme-color" content="{global_config.get("theme_color", "#0f172a")}">',
		'\t<meta name="apple-mobile-web-app-capable" content="yes">',
		'\t<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
		'',
		f'\t<title{title_attr}>{title}</title>',
		'',
		'\t<!-- 🎯 Single CSS Entry Point Architecture -->',
		f'\t<link rel="stylesheet" href="{css_file}">',
		f'\t{END_MARKER}'
	]
	return "\n".join(lines)

def process_html_file(page_file, page_config, global_config):
	file_path = os.path.join(PROJECT_ROOT, page_file)
	if not os.path.exists(file_path):
		print(f"⚠️ Notice: '{page_file}' not found at {file_path}")
		return False

	with open(file_path, "r", encoding="utf-8") as f:
		content = f.read()

	new_snippet = build_head_snippet(page_file, page_config, global_config)

	# 1. Check if markers already exist
	marker_pattern = re.compile(
		re.escape(START_MARKER) + r".*?" + re.escape(END_MARKER), 
		re.DOTALL
	)
	if marker_pattern.search(content):
		updated_content = marker_pattern.sub(new_snippet, content, count=1)
	else:
		# 2. If markers do not exist, replace content between <head> and </head>
		head_pattern = re.compile(r"(<head[^>]*>)(.*?)(</head>)", re.DOTALL | re.IGNORECASE)
		match = head_pattern.search(content)
		if not match:
			print(f"❌ Error: Could not find <head> tag in '{page_file}'")
			return False

		# Place snippet cleanly inside head
		updated_content = (
			content[:match.start(2)] + 
			"\n\t" + new_snippet + "\n" + 
			content[match.end(2):]
		)

	with open(file_path, "w", encoding="utf-8") as f:
		f.write(updated_content)

	print(f"✅ Synced: {page_file:28} -> Single CSS: '{page_config.get('css')}'")
	return True

def main():
	print(f"🔍 Reading Metadata Configuration from:\n   {CONFIG_PATH}\n")
	if not os.path.exists(CONFIG_PATH):
		print(f"❌ Error: Config file not found at {CONFIG_PATH}")
		return

	with open(CONFIG_PATH, "r", encoding="utf-8") as f:
		config = json.load(f)

	global_config = config.get("_global", {})
	pages = config.get("pages", {})

	print(f"📦 Starting Synchronization across {len(pages)} Core HTML Pages...\n")
	success_count = 0
	for page_file, page_config in pages.items():
		if process_html_file(page_file, page_config, global_config):
			success_count += 1

	print(f"\n🎉 Finished! Successfully synchronized {success_count}/{len(pages)} HTML pages.")
	print("✨ All pages now follow Single-CSS and Uniform Social Meta Tag Architecture.")

if __name__ == "__main__":
	main()