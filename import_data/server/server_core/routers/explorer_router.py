"""
City Data Explorer Controller
Location: import_data/server_core/routers/explorer_router.py
"""
from fastapi import APIRouter, HTTPException
from ..services.explorer_service import CityExplorerService

router = APIRouter(prefix="/api/city-data", tags=["City Data Explorer"])


@router.get("")
def api_city_data(city: str, file: str):
	try:
		res = CityExplorerService.get_file_content(city, file)
		return res["data"]
	except ValueError as ex:
		raise HTTPException(status_code=400, detail=str(ex))
	except FileNotFoundError as ex:
		raise HTTPException(status_code=404, detail=str(ex))


@router.get("/cities")
def api_city_data_list():
	return {"cities": CityExplorerService.list_cities()}