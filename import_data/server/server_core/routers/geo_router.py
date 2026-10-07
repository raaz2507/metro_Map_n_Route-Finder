"""
Geo-Coordinate Audit & Sync Controller
Location: import_data/server_core/routers/geo_router.py
"""
from fastapi import APIRouter, HTTPException, Request
from ..services.geo_service import GeoAuditService

router = APIRouter(prefix="/api/geo", tags=["Geo Coordinates"])


@router.get("/cities")
def api_geo_cities():
	return {"cities": GeoAuditService.get_available_cities()}


@router.get("/audit")
def api_geo_audit(city: str, mode: str = "base_vs_google"):
	try:
		return GeoAuditService.run_audit(city=city, mode=mode)
	except ValueError as ex:
		raise HTTPException(status_code=404, detail=str(ex))
	except FileNotFoundError as ex:
		raise HTTPException(status_code=404, detail=str(ex))
	except Exception as ex:
		raise HTTPException(status_code=500, detail=f"Geo audit failed: {ex}")


@router.post("/apply")
async def api_geo_apply(request: Request):
	payload = await request.json()
	city = payload.get("city")
	selected_slugs = set(payload.get("selected_stations", []))
	source_target = payload.get("source_target", "google")

	if not city or not selected_slugs:
		raise HTTPException(status_code=400, detail="Missing city or selected_stations")

	try:
		updated_count = GeoAuditService.apply_coordinates(city, selected_slugs, source_target)
		return {
			"success": True,
			"city": city,
			"source_target": source_target,
			"updated_stations_count": updated_count
		}
	except ValueError as ex:
		raise HTTPException(status_code=404, detail=str(ex))
	except Exception as ex:
		raise HTTPException(status_code=500, detail=f"Failed applying coordinates: {ex}")