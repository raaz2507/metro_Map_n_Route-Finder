"""
Global Transit Pipeline Constants
Single Source of Truth for Network Headers, Status Aliases & Schema Exclusions.
"""

DEFAULT_USER_AGENT = (
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
	"AppleWebKit/537.36 (KHTML, like Gecko) "
	"Chrome/122.0.0.0 Safari/537.36"
)

DEFAULT_HTTP_HEADERS = {
	"User-Agent": DEFAULT_USER_AGENT,
	"Accept": "text/html,application/xhtml+xml,application/json,text/plain,*/*;q=0.8",
	"Accept-Language": "en-US,en;q=0.9,hi;q=0.8",
}

DEFAULT_REQUEST_TIMEOUT = 10

# -------------------------------------------------------------------------
# SCHEMA SEPARATION CONTRACT
# Keys that belong strictly to transit_network.json and must NEVER be leaked
# into station_details.json / station_details_auto.json
# -------------------------------------------------------------------------
EXCLUDED_STATION_DETAILS_KEYS = {"lines", "properties", "neighbors", "location"}

# -------------------------------------------------------------------------
# CANONICAL STATUS TAXONOMY (Strict Schema Authority)
# Maps diverse agency scrape terms to the 5 valid universal schema values:
# 1. "operational"
# 2. "under_construction"
# 3. "planned"
# 4. "temporarily_closed"
# 5. "decommissioned"
# -------------------------------------------------------------------------
STATUS_ALIAS_MAP = {
	# 1. Under Construction
	"work in progress": "under_construction",
	"work_in_progress": "under_construction",
	"wip": "under_construction",
	"under construction": "under_construction",
	"under_construction": "under_construction",
	"construction": "under_construction",

	# 2. Planned / Proposed
	"approved": "planned",
	"proposed": "planned",
	"planned": "planned",
	"in dpr": "planned",
	"dpr": "planned",
	"tendered": "planned",
	"future": "planned",

	# 3. Operational
	"operational": "operational",
	"open": "operational",
	"active": "operational",
	"revenue": "operational",
	"normal service": "operational",

	# 4. Temporarily Closed
	"temporarily_closed": "temporarily_closed",
	"temp_closed": "temporarily_closed",
	"closed": "temporarily_closed",
	"shut": "temporarily_closed",
	"close": "temporarily_closed",

	# 5. Decommissioned
	"decommissioned": "decommissioned",
	"abandoned": "decommissioned"
}

def normalize_transit_status(raw_status: str) -> str:
	"""
	Normalizes any agency scraped status string to canonical universal schema status.
	Defaults to 'operational' if unspecified or unrecognized.
	"""
	if not raw_status or not isinstance(raw_status, str):
		return "operational"
	cleaned = raw_status.strip().lower()
	return STATUS_ALIAS_MAP.get(cleaned, "operational")