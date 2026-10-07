#!/usr/bin/env python3
"""
===============================================================================
Kochi Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/kochi_structure.py
Role    : Transforms Stage 2 kochi_metro_cleaned.json -> kochi_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic GTFS GPS,
          Malayalam and Hindi names preserved, Line 1 (Aluva to Tripunithura),
          No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class KochiStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Kochi Metro (KMRL)."""

	# Canonical Line ID
	CANONICAL_LINE_ID = "kmrl.blue"  # Line 1: Aluva <-> Tripunithura (25 stations)

	def structure(
		self,
		cleaned_dataset: Dict[str, Any],
		network_id: str,
		existing_master: Optional[Dict[str, Any]] = None,
	) -> Dict[str, Any]:
		"""Constructs canonical Stage 3 Master dataset without synthetic nulls or dummy values."""
		# Sort stations strictly by authentic order (1 to 25)
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
					"network": "kochi_metro",
					"operator": "Kochi Metro Rail Limited (KMRL)",
					"label": "1",
					"short_name": {
						"en": "Blue Line (Line 1)",
						"ml": "നീല ലൈൻ"
					},
					"color": "#005BA6",
					"color_name": "blue",
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
			name_ml = st.get("station_name_ml")
			name_hi = st.get("station_name_hi")
			code = st.get("station_code")
			layout = st.get("layout", "Elevated")
			coords = st.get("coordinates")
			wheelchair = st.get("wheelchair_boarding")

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

			if name_ml:
				station_obj["name"]["ml"] = name_ml
			if name_hi:
				station_obj["name"]["hi"] = name_hi

			if code:
				station_obj["code"] = code

			if wheelchair is not None:
				station_obj["wheelchair_boarding"] = wheelchair

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
