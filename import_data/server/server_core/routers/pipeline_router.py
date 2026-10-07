"""
Pipeline Stream, Process Control & Portal Health Controller
Location: import_data/server_core/routers/pipeline_router.py
"""
import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse
from ..services.pipeline_service import PipelineExecutionService
from ..services.health_service import PortalHealthService
from ..config import BASE_DIR, CONFIG_DIR, DATA_DIR, PROJECT_ROOT
from pipeline.core.file_manager import UniversalFileSystemManager

router = APIRouter(tags=["Pipeline & System"])


@router.get("/api/status")
def api_status():
	return {"status": "online", "server": "Metro Audit Hub API (Modular)"}


@router.get("/api/manifest")
def api_manifest():
	manifest_file = CONFIG_DIR / "master_audit_manifest.json"
	if not manifest_file.exists():
		raise HTTPException(status_code=404, detail="Manifest missing")
	with open(manifest_file, "r", encoding="utf-8") as f:
		data = json.load(f)

	for net_id, net_info in data.get("networks", {}).items():
		folder_name = f"{net_id}_data" if not net_id.endswith("_data") else net_id
		net_dir = DATA_DIR / "datasets" / folder_name

		raw_file = net_dir / f"{net_id}_raw.json"
		cleaned_file = net_dir / f"{net_id}_cleaned.json"
		master_file = net_dir / f"{net_id}_master.json"

		if not raw_file.exists():
			raw_file = DATA_DIR / "datasets" / f"{net_id}_raw.json"
		if not cleaned_file.exists():
			cleaned_file = DATA_DIR / "datasets" / f"{net_id}_cleaned.json"
		if not master_file.exists():
			master_file = DATA_DIR / "datasets" / f"{net_id}_master.json"

		if master_file.exists():
			current_stage, status = "stage_3_structured", "up_to_date"
		elif cleaned_file.exists():
			current_stage, status = "stage_2_cleaned", "needs_supervision"
		elif raw_file.exists():
			current_stage, status = "stage_1_raw", "needs_cleaning"
		else:
			current_stage, status = "stage_1_missing", "pending_intake"

		stage_counts = {
			"raw": UniversalFileSystemManager.get_station_count_cached(raw_file),
			"cleaned": UniversalFileSystemManager.get_station_count_cached(cleaned_file),
			"master": UniversalFileSystemManager.get_station_count_cached(master_file),
		}

		field_audit = PortalHealthService.compute_network_field_audit(net_id, master_file)

		net_info.setdefault("pipeline", {})["stage"] = current_stage
		net_info["pipeline"]["status"] = status
		net_info["total_stations"] = stage_counts.get("master" if "3" in current_stage else ("cleaned" if "2" in current_stage else "raw"), 0)
		net_info["stage_counts"] = stage_counts
		net_info["field_audit"] = field_audit

	return data


@router.get("/api/portals/health")
def api_portals_health():
	try:
		return PortalHealthService.check_all_portals()
	except FileNotFoundError as ex:
		raise HTTPException(status_code=404, detail=str(ex))


@router.get("/api/pipeline/stream")
async def api_pipeline_stream(network: str, action: str):
	cmd = PipelineExecutionService.resolve_command(network, action)
	if not cmd:
		return JSONResponse({"error": f"Unsupported action '{action}'"}, status_code=400)
	return StreamingResponse(
		PipelineExecutionService.stream_pipeline(network, action),
		media_type="text/event-stream"
	)


@router.post("/api/pipeline/kill")
@router.get("/api/pipeline/kill")
def api_pipeline_kill(network: str):
	res = PipelineExecutionService.kill_process(network)
	if not res.get("success", False):
		return JSONResponse(res, status_code=500)
	return res


@router.get("/api/delta")
def api_delta(network: str):
	return PortalHealthService.get_dataset_delta(network)


@router.get("/api/dataset")
def api_dataset(network: str, stage: str = "cleaned"):
	data = UniversalFileSystemManager.load_stage_json(network, stage)
	if data is not None:
		return data

	# If stage is 'support', fallback to production city passenger_support.json
	if stage == "support":
		# Try mapping network to city
		for city_cand in [
			network,
			network.replace("_metro", ""),
			network.replace("_monorail", ""),
			"delhi_ncr" if "dmrc" in network or "rrts" in network or "nmrc" in network or "rapid" in network else "",
			"mumbai" if "mumbai" in network else "",
			"bengaluru" if "namma" in network else "",
			"ahmedabad_gandhinagar" if "ahmedabad" in network else ""
		]:
			if not city_cand:
				continue
			cand_file = PROJECT_ROOT / "main_project" / "data" / "india" / "cities" / city_cand / "passenger_support.json"
			if cand_file.exists():
				try:
					with open(cand_file, "r", encoding="utf-8") as f:
						return json.load(f)
				except Exception:
					pass

	raise HTTPException(status_code=404, detail=f"No {stage} dataset found for {network}")