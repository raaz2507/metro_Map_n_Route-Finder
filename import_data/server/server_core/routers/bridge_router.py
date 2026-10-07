"""
Production Bridge & Staging Inspector Controller
Location: import_data/server_core/routers/bridge_router.py
"""
from typing import Optional
from fastapi import APIRouter
from ..services.bridge_service import BridgeInspectionService

router = APIRouter(prefix="/api/bridge", tags=["Production Bridge"])


@router.get("/cities")
def api_bridge_cities():
	return BridgeInspectionService.get_cities()


@router.get("/readiness_matrix")
def api_bridge_readiness_matrix():
	try:
		return BridgeInspectionService.get_readiness_matrix()
	except Exception as ex:
		print(f"[ERROR /api/bridge/readiness_matrix]: {ex}")
		import traceback
		traceback.print_exc()
		return []


@router.get("/status")
def api_bridge_status(city: str = "delhi_ncr"):
	try:
		return BridgeInspectionService.get_bridge_status(city)
	except Exception as ex:
		print(f"[ERROR /api/bridge/status]: {ex}")
		return {
			"city": city,
			"transit_auto_exists": False,
			"details_auto_exists": False,
			"transit_stations": 0,
			"details_stations": 0
		}


@router.get("/inspect")
def api_bridge_inspect(city: str = "delhi_ncr", network: Optional[str] = None, station: Optional[str] = None):
	try:
		return BridgeInspectionService.inspect_bridge_delta(city=city, station=station)
	except Exception as ex:
		print(f"[ERROR /api/bridge/inspect for {city}]: {ex}")
		import traceback
		traceback.print_exc()
		return {
			"city": city,
			"target_station": station or "__all__",
			"catalog": [],
			"stats": {"total_stations": 0, "details_delta_count": 0, "transit_delta_count": 0}
		}

@router.get("/merge_station")
def api_bridge_merge_station(city: str, station: str):
	try:
		return BridgeInspectionService.merge_station(city, station)
	except Exception as ex:
		print(f"[ERROR /api/bridge/merge_station for {city}/{station}]: {ex}")
		return {"success": False, "merged": False, "error": str(ex), "station": station}