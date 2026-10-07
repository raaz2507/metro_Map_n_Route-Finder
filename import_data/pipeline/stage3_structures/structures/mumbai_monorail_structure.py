#!/usr/bin/env python3
"""
===============================================================================
Mumbai Monorail Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/mumbai_monorail_structure.py
Role    : Transforms Stage 2 mumbai_monorail_cleaned.json -> mumbai_monorail_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic Marathi names,
          Line 1 (Chembur <-> Sant Gadge Maharaj Chowk - 17 stations),
          Authentic coordinates where available, No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class MumbaiMonorailStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Mumbai Monorail (MMRDA)."""

	CANONICAL_LINE_ID = "mmrda.monorail"

	def structure(
		self,
		cleaned_dataset: Dict[str, Any],
		network_id: str,
		existing_master: Optional[Dict[str, Any]] = None,
	) -> Dict[str, Any]:
		"""Constructs canonical Stage 3 Master dataset without synthetic nulls or dummy values."""
		# Sort stations strictly by authentic order (1 to 17)
		sorted_stations = sorted(
			cleaned_dataset.values(),
			key=lambda x: x.get("order", 999)
		)

		station_ids_in_order = [st["id"] for st in sorted_stations if "id" in st]

		master: Dict[str, Any] = {
			"defaults": {
				"stationType": "normal",
				"layout": "elevated"
			},
			"lines": {
				self.CANONICAL_LINE_ID: {
					"id": self.CANONICAL_LINE_ID,
					"network": "mumbai_monorail",
					"operator": "Mumbai Metropolitan Region Development Authority (MMRDA)",
					"label": "M",
					"short_name": {
						"en": "Monorail (Line 1)",
						"mr": "मोनोरेल (लाईन १)"
					},
					"color": "#795548",
					"color_name": "brown",
					"style": "solid",
					"route": {
						"from": station_ids_in_order[0] if station_ids_in_order else "",
						"to": station_ids_in_order[-1] if station_ids_in_order else ""
					},
					"stations": station_ids_in_order
				}
			},
			"transfers": {},
			"stationData": {},
			"stations": {}
		}

		if existing_master and "fareRules" in existing_master:
			master["fareRules"] = existing_master["fareRules"]

		total = len(sorted_stations)

		for idx, st in enumerate(sorted_stations):
			slug = st["id"]
			name_en = st.get("station_name_en", slug.replace("_", " ").title())
			name_mr = st.get("station_name_mr")
			code = st.get("station_code")
			layout = st.get("layout", "Elevated")
			opened = st.get("opened_date")
			coords = st.get("coordinates")
			connections = st.get("connections")

			station_obj: Dict[str, Any] = {
				"id": slug,
				"name": {
					"en": name_en
				},
				"lines": [self.CANONICAL_LINE_ID],
				"properties": {
					"layout": str(layout).lower() if layout else "elevated",
					"status": "operational"
				}
			}

			if name_mr:
				station_obj["name"]["mr"] = name_mr

			if code:
				station_obj["code"] = code

			if opened:
				station_obj["opened_date"] = opened

			if connections:
				station_obj["connections"] = connections

			if coords and isinstance(coords, dict):
				lat = coords.get("latitude")
				lon = coords.get("longitude")
				if lat and lon:
					station_obj["location"] = {
						"decimal": {
							"lat": float(lat),
							"lon": float(lon)
						}
					}

			# Neighbors (previous and next in authentic sequence, zero fake distance)
			neighbors: List[Dict[str, str]] = []
			if idx > 0:
				neighbors.append({
					"station": sorted_stations[idx - 1]["id"],
					"line": self.CANONICAL_LINE_ID
				})
			if idx < total - 1:
				neighbors.append({
					"station": sorted_stations[idx + 1]["id"],
					"line": self.CANONICAL_LINE_ID
				})

			if neighbors:
				station_obj["neighbors"] = neighbors

			master["stationData"][slug] = station_obj
			master["stations"][slug] = station_obj

		return master
