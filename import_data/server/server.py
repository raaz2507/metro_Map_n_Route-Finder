#!/usr/bin/env python3
"""
================================================================================
Metro Audit Hub - FastAPI Pipeline Server (Modular Architecture)
================================================================================
Modern, high-performance API server using FastAPI & Uvicorn.
- Pure Controller-Service Architecture with Strict Class-Based OOP Services.
- Auto-handles Routing, JSON parsing, SSE Subprocess Streaming, and CORS.
- Fully compatible with existing run_server.bat & browser dashboards.
================================================================================
"""
import sys
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import RedirectResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Configure search path
SERVER_DIR = Path(__file__).resolve().parent
IMPORT_DATA_DIR = SERVER_DIR.parent

if str(SERVER_DIR) not in sys.path:
	sys.path.insert(0, str(SERVER_DIR))
if str(IMPORT_DATA_DIR) not in sys.path:
	sys.path.insert(0, str(IMPORT_DATA_DIR))

from server_core.config import PORT
from server_core.routers.pipeline_router import router as pipeline_router
from server_core.routers.bridge_router import router as bridge_router
from server_core.routers.geo_router import router as geo_router
from server_core.routers.explorer_router import router as explorer_router

app = FastAPI(
	title="Metro Audit Hub API",
	description="Enterprise Transit Data Pipeline, Geo Audit & Production Bridge Engine",
	version="2.0.0"
)

# Enable CORS for local dashboards and cross-origin tools
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Register Modular Feature Routers
app.include_router(pipeline_router)
app.include_router(bridge_router)
app.include_router(geo_router)
app.include_router(explorer_router)


# Root Navigation Redirects
@app.get("/favicon.ico", include_in_schema=False)
def favicon_route():
	fav = SERVER_DIR / "dashboard" / "assets" / "icons" / "ui" / "terminal.svg"
	if fav.exists():
		return FileResponse(fav, media_type="image/svg+xml")
	return RedirectResponse(url="/dashboard/admin.html")


@app.get("/", include_in_schema=False)
@app.get("/index.html", include_in_schema=False)
@app.get("/admin.html", include_in_schema=False)
def root_redirect():
	return RedirectResponse(url="/dashboard/admin.html")


# Static Assets & HTML Dashboards Mount
dashboard_dir = SERVER_DIR / "dashboard"
if dashboard_dir.exists():
	app.mount("/dashboard", StaticFiles(directory=str(dashboard_dir), html=True), name="dashboard")

if __name__ == "__main__":
	print(f"🚀 Starting Metro Audit Hub on http://localhost:{PORT}")
	uvicorn.run("server:app", host="127.0.0.1", port=PORT, reload=True)