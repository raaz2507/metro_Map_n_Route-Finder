"""
Server Core Configuration & Paths
Location: import_data/server/server_core/config.py
"""
import pathlib
import sys

# Encoding safety
try:
	if hasattr(sys.stdout, "reconfigure"):
		sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
	pass

SERVER_CORE_DIR = pathlib.Path(__file__).resolve().parent
SERVER_DIR = SERVER_CORE_DIR.parent
IMPORT_DATA_DIR = SERVER_DIR.parent
PROJECT_ROOT = IMPORT_DATA_DIR.parent

BASE_DIR = IMPORT_DATA_DIR
CONFIG_DIR = IMPORT_DATA_DIR / "config"
DATA_DIR = IMPORT_DATA_DIR / "data"

PORT = 8080

# Allowed Whitelist files for City Data Explorer
CITY_DATA_ALLOWED_FILES = {
	"transit_network.json",
	"station_details.json",
	"passenger_support.json",
}

# Known valid cities in main_project
VALID_CITY_SLUGS = {
	"bhopal", "chennai", "delhi_ncr", "indore", "kanpur",
	"kochi", "lucknow", "mumbai", "nagpur",
	"agra", "ahmedabad_gandhinagar", "bengaluru", "hyderabad",
	"jaipur", "kolkata", "pune",
}