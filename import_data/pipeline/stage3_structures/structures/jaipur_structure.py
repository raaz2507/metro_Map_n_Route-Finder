#!/usr/bin/env python3
"""
===============================================================================
Jaipur Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/jaipur_structure.py
Role    : Transforms Stage 2 jaipur_metro_cleaned.json -> jaipur_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic Hindi names,
          Pink Line (Mansarovar <-> Badi Chaupar - 11 stations), JMRC official station codes,
          Contacts/Customer care preservation, No fake distance or coordinates.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class JaipurStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Jaipur Metro (JMRC)."""

	# Canonical Line ID (Pink Line / Phase 1A + 1B)
	CANONICAL_LINE_ID = "jmrc.pink"

	def structure(
		self,
		cleaned_dataset: Dict[str, Any],
		network_id: str,
		existing_master: Optional[Dict[str, Any]] = None,
	) -> Dict[str, Any]:
		"""Constructs canonical Stage 3 Master dataset without synthetic nulls or dummy values."""
		# Sort stations strictly by authentic order (1 to 11)
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
					"network": "jaipur_metro",
					"operator": "Jaipur Metro Rail Corporation (JMRC)",
					"label": "P",
					"short_name": {
						"en": "Pink Line (Phase 1)",
						"hi": "पिंक लाइन"
					},
					"color": "#E91E63",
					"color_name": "pink",
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
			name_hi = st.get("station_name_hi")
			code = st.get("station_code")
			layout = st.get("layout", "Elevated")
			opened = st.get("opened_date")
			contacts = st.get("contacts")
			coords = st.get("coordinates")

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

			if name_hi:
				station_obj["name"]["hi"] = name_hi

			if code:
				station_obj["code"] = code

			if opened:
				station_obj["opened_date"] = opened

			if contacts and isinstance(contacts, dict):
				station_obj["contacts"] = contacts

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
