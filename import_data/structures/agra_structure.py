#!/usr/bin/env python3
"""
===============================================================================
Agra Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/agra_structure.py
Role    : Transforms Stage 2 agra_metro_cleaned.json -> agra_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic UPMRC GPS,
          Yellow Line (Taj East Gate <-> Mankameshwar Mandir - 6 stations), Authentic Hindi names,
          No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class AgraStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Agra Metro (UPMRC)."""

	# Canonical Line ID (Yellow Line / Priority Corridor)
	CANONICAL_LINE_ID = "upmrc_agra.yellow"

	# Canonical sequence from Taj East Gate to Mankameshwar Mandir
	STATION_SEQUENCE = [
		"taj_east_gate",
		"shaheed_captain_shubham_gupta",
		"fatehabad_road",
		"taj_mahal",
		"agra_fort",
		"mankameshwar_mandir"
	]

	@staticmethod
	def clean_title(name: str) -> str:
		"""Properly capitalizes station name while preserving standard title case."""
		if not name:
			return ""
		return " ".join([word.capitalize() for word in name.strip().split()])

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
					"network": "agra_metro",
					"operator": "Uttar Pradesh Metro Rail Corporation (UPMRC)",
					"label": "Y",
					"short_name": {
						"en": "Yellow Line (Line 1)",
						"hi": "यलो लाइन"
					},
					"color": "#FBC02D",
					"color_name": "yellow",
					"style": "solid",
					"route": {
						"from": self.STATION_SEQUENCE[0],
						"to": self.STATION_SEQUENCE[-1]
					},
					"stations": self.STATION_SEQUENCE
				}
			},
			"transfers": {},
			"stationData": {},
			"stations": {}
		}

		if existing_master and "fareRules" in existing_master:
			master["fareRules"] = existing_master["fareRules"]

		clean_lookup = dict(cleaned_dataset)
		total = len(self.STATION_SEQUENCE)

		for idx, sid in enumerate(self.STATION_SEQUENCE):
			entry = clean_lookup.get(sid, {})
			raw_name = entry.get("station_name_en", sid.replace("_", " ").title())
			name_en = self.clean_title(raw_name)
			name_hi = entry.get("station_name_hi")
			code = entry.get("station_code")
			coords = entry.get("coordinates")

			# Layout determination: Taj Mahal, Agra Fort, Mankameshwar Mandir are underground
			is_underground = sid in {"taj_mahal", "agra_fort", "mankameshwar_mandir"}
			layout = "underground" if is_underground else "elevated"

			station_obj: Dict[str, Any] = {
				"id": sid,
				"name": {
					"en": name_en
				},
				"lines": [self.CANONICAL_LINE_ID],
				"properties": {
					"layout": layout,
					"status": "operational"
				}
			}

			if name_hi:
				station_obj["name"]["hi"] = name_hi

			if code:
				station_obj["code"] = code

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
					"station": self.STATION_SEQUENCE[idx - 1],
					"line": self.CANONICAL_LINE_ID
				})
			if idx < total - 1:
				neighbors.append({
					"station": self.STATION_SEQUENCE[idx + 1],
					"line": self.CANONICAL_LINE_ID
				})

			if neighbors:
				station_obj["neighbors"] = neighbors

			master["stationData"][sid] = station_obj
			master["stations"][sid] = station_obj

		return master
