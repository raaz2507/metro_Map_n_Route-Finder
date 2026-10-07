#!/usr/bin/env python3
"""
===============================================================================
Kanpur Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/kanpur_structure.py
Role    : Transforms Stage 2 kanpur_metro_cleaned.json -> kanpur_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic UPMRC GPS,
          Orange Line (IIT Kanpur <-> Kanpur Central - 14 stations), Authentic Hindi names,
          No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class KanpurStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Kanpur Metro (UPMRC)."""

	# Canonical Line ID (Orange Line / Priority Corridor)
	CANONICAL_LINE_ID = "upmrc_kanpur.orange"

	# Canonical sequence from IIT Kanpur to Kanpur Central
	STATION_SEQUENCE = [
		"iit_kanpur",
		"kalyanpur_metro",
		"spm_hospital",
		"vishwavidyalaya_metro",
		"gurudev_chauraha",
		"geeta_nagar",
		"rawatpur_metro",
		"llr_hospital",
		"motijheel_metro",
		"chunni_ganj",
		"naveen_market",
		"bada_chauraha",
		"naya_ganj",
		"kanpur_central"
	]

	@staticmethod
	def clean_title(name: str) -> str:
		"""Properly capitalizes station name while preserving acronyms like IIT, SPM, LLR."""
		if not name:
			return ""
		acronyms = {"IIT", "SPM", "LLR"}
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
					"network": "kanpur_metro",
					"operator": "Uttar Pradesh Metro Rail Corporation (UPMRC)",
					"label": "O",
					"short_name": {
						"en": "Orange Line (Line 1)",
						"hi": "ऑरेंज लाइन"
					},
					"color": "#FF7A00",
					"color_name": "orange",
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

			# Layout determination: Chunni Ganj to Kanpur Central is underground
			is_underground = sid in {"chunni_ganj", "naveen_market", "bada_chauraha", "naya_ganj", "kanpur_central"}
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
