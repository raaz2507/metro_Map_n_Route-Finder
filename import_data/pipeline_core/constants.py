"""
Global Transit Pipeline Constants
Single Source of Truth for Network Headers, User-Agents & Timeouts.
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