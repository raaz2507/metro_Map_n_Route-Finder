#!/usr/bin/env python3
"""
===============================================================================
Bhopal Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/bhopal_structure.py
Role    : Transforms Stage 2 bhopal_metro_cleaned.json -> bhopal_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic KMZ GPS Only,
          Graph adjacency via sequence order, No distance calculation if absent in clean.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class BhopalStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Bhopal Metro (MPMRCL)."""

	CANONICAL_LINE_ID = "mpmrcl.orange"

	@staticmethod
	def clean_title(name: str) -> str:
		"""Standardizes station title with proper casing and acronym preservation."""
		if not name:
			return ""
		cleaned = name.strip()
		acronyms = {"AIIMS", "DRM", "ISBT", "BHEL", "DIG", "II", "III"}
		parts = []
		for word in cleaned.split():
			w_upper = word.upper()
			if w_upper in acronyms:
				parts.append(w_upper)
			else:
				parts.append(word.capitalize())
		return " ".join(parts)

	def structure(
		self,
		cleaned_dataset: Dict[str, Any],
		network_id: str,
		existing_master: Optional[Dict[str, Any]] = None,
	) -> Dict[str, Any]:
		"""Constructs canonical Stage 3 Master dataset without synthetic nulls or dummy values."""
		master: Dict[str, Any] = {
			"defaults": {
				"stationType": "normal",
				"layout": "elevated"
			},
			"lines": {
				self.CANONICAL_LINE_ID: {
					"id": self.CANONICAL_LINE_ID,
					"network": "bhopal_metro",
					"operator": "Madhya Pradesh Metro Rail Corporation Limited (MPMRCL)",
					"label": "O",
					"short_name": {
						"en": "Orange Line",
						"hi": "ऑरेंज लाइन"
					},
					"color": "#FF7A00",
					"color_name": "orange",
					"style": "solid",
					"route": {},
					"stations": []
				}
			},
			"transfers": {},
			"stationData": {},
			"stations": {}
		}

		if existing_master and "fareRules" in existing_master:
			master["fareRules"] = existing_master["fareRules"]

		# Sort stations strictly by their clean authentic order (1 to N)
		sorted_stations = sorted(
			cleaned_dataset.values(),
			key=lambda x: x.get("order", 9999)
		)

		station_ids_in_order = [st["id"] for st in sorted_stations if "id" in st]
		master["lines"][self.CANONICAL_LINE_ID]["stations"] = station_ids_in_order

		if station_ids_in_order:
			master["lines"][self.CANONICAL_LINE_ID]["route"] = {
				"from": station_ids_in_order[0],
				"to": station_ids_in_order[-1]
			}

		total = len(sorted_stations)

		for idx, st in enumerate(sorted_stations):
			slug = st["id"]
			st_name_en = self.clean_title(st.get("station_name_en", slug.replace("_", " ")))

			station_obj: Dict[str, Any] = {
				"id": slug,
				"name": {
					"en": st_name_en
				},
				"lines": [self.CANONICAL_LINE_ID],
				"properties": {
					"layout": str(st.get("layout", "elevated")).lower(),
					"status": "operational"
				}
			}

			if st.get("station_code"):
				station_obj["code"] = st["station_code"]

			if st.get("station_name_hi"):
				station_obj["name"]["hi"] = st["station_name_hi"]

			# Real authentic coordinates from KMZ
			coords = st.get("coordinates")
			if coords and isinstance(coords, dict):
				lat = float(coords.get("latitude", 0.0))
				lon = float(coords.get("longitude", 0.0))
				if lat != 0.0 and lon != 0.0:
					station_obj["location"] = {
						"decimal": {
							"lat": lat,
							"lon": lon
						}
					}

			# Graph Neighbors Construction (Previous and Next Stations in Line Order)
			neighbors: List[Dict[str, Any]] = []

			# Previous Neighbor
			if idx > 0:
				prev_st = sorted_stations[idx - 1]
				neighbors.append({
					"station": prev_st["id"],
					"line": self.CANONICAL_LINE_ID
				})

			# Next Neighbor
			if idx < total - 1:
				next_st = sorted_stations[idx + 1]
				neighbors.append({
					"station": next_st["id"],
					"line": self.CANONICAL_LINE_ID
				})

			if neighbors:
				station_obj["neighbors"] = neighbors

			master["stationData"][slug] = station_obj
			master["stations"][slug] = station_obj

		return master
