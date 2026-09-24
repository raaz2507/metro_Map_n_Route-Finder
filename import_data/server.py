#!/usr/bin/env python3
"""
================================================================================
Metro Audit Hub - FastAPI Pipeline Server
================================================================================
Modern, high-performance API server using FastAPI & Uvicorn.
- Auto-handles Routing, JSON parsing, and CORS.
- Uses `asyncio.create_subprocess_exec` for non-blocking SSE streaming.
- Fully compatible with the existing `run_server.bat` (via `uvicorn.run`).
================================================================================
"""
import sys
import json
import os
import pathlib
import threading
import asyncio
import urllib.request
import ssl
import time
import concurrent.futures
from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Imports from pipeline core
from pipeline_core.file_manager import UniversalFileSystemManager
from pipeline_core.constants import DEFAULT_USER_AGENT

# UTF-8 encoding configuration
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

BASE_DIR = pathlib.Path(__file__).resolve().parent
PORT = 8080

app = FastAPI(title="Metro Audit Hub API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Concurrency Guard
RUNNING_JOBS: Dict[str, asyncio.subprocess.Process] = {}
JOBS_LOCK = threading.Lock()

# -------------------------------------------------------------------------
# HELPER FUNCTIONS (From old server)
# -------------------------------------------------------------------------

def _resolve_pipeline_command(network_id: str, action: str) -> Optional[List[str]]:
    action = action.lower()
    if action in ["sync_all", "sync"] or network_id == "all":
        return [sys.executable, "-u", str(BASE_DIR / "universal_cleaner.py"), "dmrc_delhi"]
    if action in ["fetch_raw", "scraper"]:
        return [sys.executable, "-u", str(BASE_DIR / "universal_scraper.py"), network_id]
    if action in ["fetch_raw_media", "scraper_media"]:
        return [sys.executable, "-u", str(BASE_DIR / "universal_scraper.py"), network_id, "--download-media"]
    if action in ["fetch_fare", "fare_scraper", "fare"]:
        return [sys.executable, "-u", str(BASE_DIR / "universal_fare_scraper.py"), network_id]
    if action in ["clean_process", "clean", "cleaner"]:
        return [sys.executable, "-u", str(BASE_DIR / "universal_cleaner.py"), network_id]
    if action in ["generate_master", "master"]:
        return [sys.executable, "-u", str(BASE_DIR / "master_structure.py"), network_id]
    if action in ["stage_temp", "bridge_temp"]:
        return [sys.executable, "-u", str(BASE_DIR / "production_bridge.py"), network_id, "--prepare-temp"]
    if action in ["port_production", "bridge_port"]:
        return [sys.executable, "-u", str(BASE_DIR / "production_bridge.py"), network_id, "--port-production"]
    if action in ["promote", "bridge_promote"]:
        return [sys.executable, "-u", str(BASE_DIR / "production_bridge.py"), network_id, "--promote"]
    return None

def _ping_portal(net_id: str, name: str, url: str) -> dict:
    ctx = ssl._create_unverified_context()
    headers = {"User-Agent": DEFAULT_USER_AGENT, "Accept": "text/html"}
    req = urllib.request.Request(url, headers=headers)
    start_time = time.time()
    try:
        with urllib.request.urlopen(req, timeout=5, context=ctx) as response:
            return {
                "id": net_id, "name": name, "url": url,
                "status": "online" if response.getcode() < 400 else "degraded",
                "http_status": response.getcode(),
                "latency_ms": int((time.time() - start_time) * 1000), "error": None
            }
    except Exception as e:
        return {
            "id": net_id, "name": name, "url": url, "status": "offline",
            "http_status": getattr(e, "code", 500),
            "latency_ms": int((time.time() - start_time) * 1000), "error": str(e)
        }


# -------------------------------------------------------------------------
# API ENDPOINTS
# -------------------------------------------------------------------------

@app.get("/")
@app.get("/index.html")
@app.get("/admin.html")
def root_redirect():
    return RedirectResponse(url="/dashboard/admin.html")

@app.get("/api/status")
def api_status():
    with JOBS_LOCK:
        active_jobs = {net: proc.pid for net, proc in RUNNING_JOBS.items() if proc.returncode is None}
    return {
        "status": "online", "port": PORT, "python_version": sys.version,
        "base_dir": str(BASE_DIR), "active_jobs": active_jobs, "framework": "FastAPI"
    }

@app.get("/api/manifest")
def api_manifest():
    manifest_file = BASE_DIR / "master_audit_manifest.json"
    if not manifest_file.exists():
        return JSONResponse({"error": "master_audit_manifest.json not found"}, status_code=404)
    with open(manifest_file, "r", encoding="utf-8") as f:
        data = json.load(f)
        
    for net_id, net_info in data.get("networks", {}).items():
        raw_file = UniversalFileSystemManager.get_stage_path(net_id, "raw")
        cleaned_file = UniversalFileSystemManager.get_stage_path(net_id, "cleaned")
        master_file = UniversalFileSystemManager.get_stage_path(net_id, "master")

        if not raw_file.exists(): raw_file = BASE_DIR / f"{net_id}_raw.json"
        if not cleaned_file.exists(): cleaned_file = BASE_DIR / f"{net_id}_cleaned.json"
        if not master_file.exists(): master_file = BASE_DIR / f"{net_id}_master.json"

        active_file = None
        if master_file.exists():
            current_stage, status, active_file = "stage_3_structured", "up_to_date", master_file
        elif cleaned_file.exists():
            current_stage, status, active_file = "stage_2_cleaned", "needs_supervision", cleaned_file
        elif raw_file.exists():
            current_stage, status, active_file = "stage_1_raw", "needs_cleaning", raw_file
        else:
            current_stage, status = "stage_1_missing", "pending_intake"

        stage_counts = {
            "raw": UniversalFileSystemManager.get_station_count_cached(raw_file),
            "cleaned": UniversalFileSystemManager.get_station_count_cached(cleaned_file),
            "master": UniversalFileSystemManager.get_station_count_cached(master_file),
        }

        if "pipeline" not in net_info: net_info["pipeline"] = {}
        net_info["pipeline"]["stage"] = current_stage
        net_info["pipeline"]["status"] = status
        net_info["total_stations"] = stage_counts.get("master" if "3" in current_stage else ("cleaned" if "2" in current_stage else "raw"), 0)
        net_info["stage_counts"] = stage_counts
        
    return data

@app.get("/api/portals/health")
def api_portals_health():
    manifest_file = BASE_DIR / "master_audit_manifest.json"
    if not manifest_file.exists():
        return JSONResponse({"error": "manifest missing"}, status_code=404)
    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)
        
    targets = []
    for net_id, net_obj in manifest_data.get("networks", {}).items():
        name = net_obj.get("name", net_id)
        url = net_obj.get("source_url") or net_obj.get("data_sources", {}).get("stations", {}).get("url")
        if url: targets.append((net_id, name, url))

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, len(targets))) as executor:
        futures = {executor.submit(_ping_portal, n, name, u): n for n, name, u in targets}
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    online = sum(1 for r in results if r.get("status") == "online")
    latencies = [r["latency_ms"] for r in results if r.get("latency_ms") is not None]
    avg_lat = int(sum(latencies) / len(latencies)) if latencies else 0
    return {
        "status": "success", "total_portals": len(results), "online_count": online,
        "average_latency_ms": avg_lat, "all_operational": (online == len(results) and len(results) > 0),
        "portals": results
    }

@app.get("/api/pipeline/stream")
async def api_pipeline_stream(network: str, action: str):
    cmd = _resolve_pipeline_command(network, action)
    if not cmd:
        return JSONResponse({"error": f"Unsupported action '{action}'"}, status_code=400)

    async def event_generator():
        yield f"data: {json.dumps({'type': 'start', 'command': ' '.join(cmd), 'network': network, 'action': action})}\n\n"
        
        proc = await asyncio.create_subprocess_exec(
            *cmd, cwd=str(BASE_DIR),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT
        )
        
        with JOBS_LOCK:
            RUNNING_JOBS[network] = proc

        try:
            while True:
                line = await proc.stdout.readline()
                if not line:
                    break
                line_str = line.decode("utf-8", errors="replace").rstrip("\r\n")
                if line_str:
                    yield f"data: {json.dumps({'type': 'log', 'line': line_str})}\n\n"
            
            await proc.wait()
            yield f"data: {json.dumps({'type': 'done', 'exit_code': proc.returncode, 'success': proc.returncode == 0})}\n\n"
        finally:
            with JOBS_LOCK:
                if network in RUNNING_JOBS:
                    del RUNNING_JOBS[network]

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/pipeline/kill")
@app.get("/api/pipeline/kill")
def api_pipeline_kill(network: str):
    with JOBS_LOCK:
        proc = RUNNING_JOBS.get(network)
        if not proc or proc.returncode is not None:
            if network in RUNNING_JOBS: del RUNNING_JOBS[network]
            return {"success": True, "message": f"No active job for '{network}'"}
        
        try:
            proc.kill()
            del RUNNING_JOBS[network]
            return {"success": True, "message": f"Terminated job for '{network}'"}
        except Exception as e:
            return JSONResponse({"success": False, "error": str(e)}, status_code=500)

@app.get("/api/delta")
def api_delta(network: str):
    cleaned_path = UniversalFileSystemManager.get_stage_path(network, "cleaned")
    master_path = UniversalFileSystemManager.get_stage_path(network, "master")
    if not cleaned_path.exists(): cleaned_path = BASE_DIR / f"{network}_cleaned.json"
    if not master_path.exists(): master_path = BASE_DIR / f"{network}_master.json"

    delta_info = {
        "network": network,
        "cleaned_file": cleaned_path.name if cleaned_path.exists() else None,
        "master_file": master_path.name if master_path.exists() else None,
        "has_delta": False,
        "summary": {"new_stations": 0, "modified_stations": 0, "deleted_stations": 0, "total_cleaned": 0, "total_master": 0},
        "new_station_keys": [], "deleted_station_keys": []
    }

    if cleaned_path.exists() and master_path.exists():
        with open(cleaned_path, "r", encoding="utf-8") as f: c_data = json.load(f)
        with open(master_path, "r", encoding="utf-8") as f: m_data = json.load(f)
        
        c_raw = c_data.get("stations", c_data) if isinstance(c_data, dict) else {}
        m_raw = m_data.get("stations", m_data) if isinstance(m_data, dict) else {}
        
        c_keys = set(c_raw.keys()) if isinstance(c_raw, dict) else {s.get("id", str(idx)) for idx, s in enumerate(c_raw) if isinstance(s, dict)}
        m_keys = set(m_raw.keys()) if isinstance(m_raw, dict) else {s.get("id", str(idx)) for idx, s in enumerate(m_raw) if isinstance(s, dict)}

        new_keys = sorted(list(c_keys - m_keys))
        del_keys = sorted(list(m_keys - c_keys))

        delta_info["summary"].update({
            "total_cleaned": len(c_keys), "total_master": len(m_keys),
            "new_stations": len(new_keys), "deleted_stations": len(del_keys)
        })
        delta_info.update({"new_station_keys": new_keys, "deleted_station_keys": del_keys, "has_delta": bool(new_keys or del_keys)})

    return delta_info

@app.get("/api/dataset")
def api_dataset(network: str, stage: str = "cleaned"):
    data = UniversalFileSystemManager.load_stage_json(network, stage)
    if data is None:
        return JSONResponse({"error": f"No {stage} dataset found for {network}"}, status_code=404)
    return data

@app.get("/api/bridge/status")
def api_bridge_status(city: str = "delhi_ncr"):
    city_dir = (BASE_DIR.parent / "main_project" / "data" / "cities" / city).resolve()
    staging_dir = (BASE_DIR / ".staging_temp" / city).resolve()

    transit_file = city_dir / "transit_network_auto.json"
    details_file = city_dir / "station_details_auto.json"
    
    t_exists = transit_file.exists()
    d_exists = details_file.exists()
    
    target_t = transit_file if t_exists else (staging_dir / "transit_network_auto.json")
    target_d = details_file if d_exists else (staging_dir / "station_details_auto.json")

    t_count = d_count = 0
    if target_t.exists():
        with open(target_t, "r", encoding="utf-8") as f: t_count = len(json.load(f).get("stations", {}))
    if target_d.exists():
        with open(target_d, "r", encoding="utf-8") as f: d_count = len([k for k in json.load(f).keys() if k != "_meta"])

    return {
        "city": city, "transit_auto_exists": target_t.exists(), "details_auto_exists": target_d.exists(),
        "transit_stations": t_count, "details_stations": d_count
    }

@app.get("/api/bridge/inspect")
def api_bridge_inspect(city: str = "delhi_ncr", network: Optional[str] = None, station: Optional[str] = None):
    net_id = UniversalFileSystemManager.resolve_network_for_city(city, network)
    master_file = UniversalFileSystemManager.get_stage_path(net_id, "master")
    city_dir = (BASE_DIR.parent / "main_project" / "data" / "cities" / city).resolve()
    staging_dir = (BASE_DIR / ".staging_temp" / city).resolve()

    details_auto_file = next((f for f in [staging_dir / "station_details_auto.json", city_dir / "station_details_auto.json"] if f.exists()), None)
    transit_auto_file = next((f for f in [staging_dir / "transit_network_auto.json", city_dir / "transit_network_auto.json"] if f.exists()), None)

    details_base_file = city_dir / "station_details.json"
    transit_base_file = city_dir / "transit_network.json"

    details_auto = json.load(open(details_auto_file, "r", encoding="utf-8")) if details_auto_file else {}
    transit_auto = json.load(open(transit_auto_file, "r", encoding="utf-8")) if transit_auto_file else {}
    details_base = json.load(open(details_base_file, "r", encoding="utf-8")) if details_base_file.exists() else {}
    transit_base = json.load(open(transit_base_file, "r", encoding="utf-8")) if transit_base_file.exists() else {}

    auto_details_keys = {k for k in details_auto.keys() if k != "_meta"}
    auto_transit_keys = set(transit_auto.get("stations", {}).keys())
    all_delta_slugs = sorted(list(auto_details_keys | auto_transit_keys))
    base_stn_data = transit_base.get("stationData", {})

    stations_catalog = [
        {"slug": slug, "is_new": (slug not in base_stn_data and slug not in details_base), 
         "has_details_delta": slug in auto_details_keys, "has_transit_delta": slug in auto_transit_keys}
        for slug in all_delta_slugs
    ]

    if station and station != "__all__":
        target_slice = {}
        if station in details_auto: target_slice["station_details_auto"] = details_auto[station]
        if station in transit_auto.get("stations", {}): target_slice["transit_network_auto"] = transit_auto["stations"][station]
        
        master_slice = {}
        if station in details_base: master_slice["station_details_base"] = details_base[station]
        if station in base_stn_data: master_slice["transit_network_base"] = base_stn_data[station]

        return {
            "city": city, "network": net_id, "selected_station": station,
            "master_source_file": f"Base Production: {station}", "target_source_file": f"Auto Delta: {station}",
            "master_data": master_slice or {"status": "Brand New Station"},
            "target_data": target_slice or {"status": "No delta"}, "stations_catalog": stations_catalog
        }

    master_data = json.load(open(master_file, "r", encoding="utf-8")) if master_file.exists() else None
    return {
        "city": city, "network": net_id, "selected_station": "__all__",
        "master_source_file": master_file.name if master_file.exists() else None,
        "target_source_file": details_auto_file.name if details_auto_file else (transit_auto_file.name if transit_auto_file else None),
        "master_data": master_data, "target_data": details_auto or transit_auto, "stations_catalog": stations_catalog
    }

@app.get("/api/bridge/merge_station")
def api_bridge_merge_station(city: str, station: str):
    city_dir = (BASE_DIR.parent / "main_project" / "data" / "cities" / city).resolve()
    details_auto_file = city_dir / "station_details_auto.json"
    details_base_file = city_dir / "station_details.json"
    transit_auto_file = city_dir / "transit_network_auto.json"
    transit_base_file = city_dir / "transit_network.json"

    auto_data = json.load(open(details_auto_file, "r", encoding="utf-8")) if details_auto_file.exists() else {}
    base_data = json.load(open(details_base_file, "r", encoding="utf-8")) if details_base_file.exists() else {}

    merged = False
    if station in auto_data:
        patch = auto_data.pop(station)
        clean_patch = {k: v for k, v in patch.items() if k != "_meta"}
        if station not in base_data: base_data[station] = clean_patch
        else: base_data[station].update(clean_patch)
        
        auto_data.setdefault("_meta", {})["total_delta_stations"] = len([k for k in auto_data.keys() if k != "_meta"])
        UniversalFileSystemManager.save_atomic_tab_json(details_base_file, base_data)
        UniversalFileSystemManager.save_atomic_tab_json(details_auto_file, auto_data)
        merged = True

    if transit_auto_file.exists() and transit_base_file.exists():
        t_auto = json.load(open(transit_auto_file, "r", encoding="utf-8"))
        if station in t_auto.get("stations", {}):
            stn_graph = t_auto["stations"].pop(station)
            t_base = json.load(open(transit_base_file, "r", encoding="utf-8"))
            t_base.setdefault("stationData", {})[station] = stn_graph
            t_auto.setdefault("_meta", {})["total_new_stations"] = len(t_auto["stations"])
            UniversalFileSystemManager.save_atomic_tab_json(transit_base_file, t_base)
            UniversalFileSystemManager.save_atomic_tab_json(transit_auto_file, t_auto)
            merged = True

    return {"success": True, "merged": merged, "station": station}

# -------------------------------------------------------------------------
# MOUNT STATIC FILES (Dashboard & Main Project)
# -------------------------------------------------------------------------

# Mount Main Project assets (CSS, JS, SVG) to serve frontend requirements
app.mount("/main_project", StaticFiles(directory=str(BASE_DIR.parent / "main_project")), name="main_project")

# Mount Dashboard statically at root
app.mount("/", StaticFiles(directory=str(BASE_DIR), html=True), name="dashboard")


if __name__ == "__main__":
    print("=" * 65)
    print("🚀 Metro Audit Hub FastAPI Server is RUNNING")
    print(f"📡 Local URL    : http://localhost:{PORT}")
    print(f"⚡ Engine       : Uvicorn (Asynchronous)")
    print("=" * 65)
    uvicorn.run("server:app", host="0.0.0.0", port=PORT, log_level="warning")
