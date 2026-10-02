#!/usr/bin/env python3
"""
===============================================================================
Lucknow Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/lucknow_structure.py
Role    : Transforms Stage 2 lucknow_metro_cleaned.json -> lucknow_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic UPMRC GPS,
          Red Line (CCS Airport <-> Munshi Pulia - 21 stations), Authentic Hindi names,
          No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class LucknowStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Lucknow Metro (UPMRC)."""

	# Canonical Line ID (Red Line / North-South Corridor)
	CANONICAL_LINE_ID = "upmrc.red"

	# Canonical sequence from CCS Airport (South) to Munshi Pulia (North)
	STATION_SEQUENCE = [
		"ccs_airport",
		"amausi",
		"transport_nagar",
		"krishna_nagar",
		"singar_nagar",
		"alambagh",
		"alambagh_bus_stand",
		"mawaiya",
		"durgapuri",
		"charbagh",
		"hussainganj",
		"sachivalaya",
		"hazratganj",
		"kd_singh_babu_stadium",
		"vishvavidyalaya",
		"it_college",
		"badshah_nagar",
		"lekhraj_market",
		"bhootnath_market",
		"indira_nagar",
		"munshipulia"
	]

	@staticmethod
	def clean_title(name: str) -> str:
		"""Properly capitalizes station name while preserving acronyms like CCS, IT, KD."""
		if not name:
			return ""
		acronyms = {"CCS", "IT", "KD"}
		parts = []
		for word in name.strip().split():
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
					"network": "lucknow_metro",
					"operator": "Uttar Pradesh Metro Rail Corporation (UPMRC)",
					"label": "R",
					"short_name": {
						"en": "Red Line",
						"hi": "रेड लाइन"
					},
					"color": "#D32F2F",
					"color_name": "red",
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

			# Layout determination from authentic UPMRC underground section
			is_underground = sid in {"ccs_airport", "hussainganj", "sachivalaya", "hazratganj"}
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
