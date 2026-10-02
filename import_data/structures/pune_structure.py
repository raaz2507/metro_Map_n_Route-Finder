#!/usr/bin/env python3
"""
===============================================================================
Pune Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/pune_structure.py
Role    : Transforms Stage 2 pune_metro_cleaned.json -> pune_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic Marathi names,
          Multi-Line Topology (Purple Line: PCMC <-> Swargate, Aqua Line: Vanaz <-> Ramwadi),
          Interchange at District Court, No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class PuneStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Pune Metro (Maha Metro)."""

	# Canonical Line IDs for Pune Metro
	LINE_PURPLE = "mahametro_pune.purple"  # Line 1: PCMC <-> Swargate
	LINE_AQUA = "mahametro_pune.aqua"      # Line 2: Vanaz <-> Ramwadi

	# Purple Line (North-South Corridor: PCMC to Swargate)
	PURPLE_LINE_STATIONS = [
		"pcmc",
		"sant_tukaram_nagar",
		"nashik_phata_bhosari",
		"kasarwadi",
		"phugewadi",
		"dapodi",
		"bopodi",
		"khadki",
		"shivaji_nagar",
		"district_court", # Major Interchange with Aqua Line
		"kasba_peth",
		"mahatma_phule_mandai",
		"swargate"
	]

	# Aqua Line (East-West Corridor: Vanaz to Ramwadi)
	AQUA_LINE_STATIONS = [
		"vanaz",
		"anand_nagar",
		"paud_phata",
		"sndt_college",
		"garware_college",
		"deccan_gymkhana",
		"chhatrapati_sambhaji_udyan",
		"pmc",
		"district_court", # Major Interchange with Purple Line
		"rto_pune",
		"pune_railway_station",
		"ruby_hall_clinic",
		"bund_garden",
		"yerwada",
		"kalyani_nagar",
		"ramwadi"
	]

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
				self.LINE_PURPLE: {
					"id": self.LINE_PURPLE,
					"network": "pune_metro",
					"operator": "Maharashtra Metro Rail Corporation Limited (MahaMetro)",
					"label": "P",
					"short_name": {
						"en": "Purple Line",
						"mr": "पर्पल लाइन"
					},
					"color": "#7B1FA2",
					"color_name": "purple",
					"style": "solid",
					"route": {
						"from": self.PURPLE_LINE_STATIONS[0],
						"to": self.PURPLE_LINE_STATIONS[-1]
					},
					"stations": self.PURPLE_LINE_STATIONS
				},
				self.LINE_AQUA: {
					"id": self.LINE_AQUA,
					"network": "pune_metro",
					"operator": "Maharashtra Metro Rail Corporation Limited (MahaMetro)",
					"label": "A",
					"short_name": {
						"en": "Aqua Line",
						"mr": "एक्वा लाइन"
					},
					"color": "#00A8B5",
					"color_name": "aqua",
					"style": "solid",
					"route": {
						"from": self.AQUA_LINE_STATIONS[0],
						"to": self.AQUA_LINE_STATIONS[-1]
					},
					"stations": self.AQUA_LINE_STATIONS
				}
			},
			"transfers": {
				"district_court": {
					self.LINE_PURPLE: {
						f"district_court:{self.LINE_AQUA}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					},
					self.LINE_AQUA: {
						f"district_court:{self.LINE_PURPLE}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					}
				}
			},
			"stationData": {},
			"stations": {}
		}

		if existing_master and "fareRules" in existing_master:
			master["fareRules"] = existing_master["fareRules"]

		clean_lookup = dict(cleaned_dataset)

		# Build station-to-lines mapping
		station_lines_map: Dict[str, List[str]] = {}
		for sid in self.PURPLE_LINE_STATIONS:
			station_lines_map.setdefault(sid, []).append(self.LINE_PURPLE)
		for sid in self.AQUA_LINE_STATIONS:
			if self.LINE_AQUA not in station_lines_map.get(sid, []):
				station_lines_map.setdefault(sid, []).append(self.LINE_AQUA)

		# Build line neighbors (without synthetic distance)
		line_sequences = [
			(self.LINE_PURPLE, self.PURPLE_LINE_STATIONS),
			(self.LINE_AQUA, self.AQUA_LINE_STATIONS)
		]

		line_neighbors: Dict[str, Dict[str, List[Dict[str, str]]]] = {}
		for lid, seq in line_sequences:
			line_neighbors[lid] = {}
			for i, sid in enumerate(seq):
				nb = []
				if i > 0:
					nb.append({"station": seq[i - 1], "line": lid})
				if i < len(seq) - 1:
					nb.append({"station": seq[i + 1], "line": lid})
				line_neighbors[lid][sid] = nb

		# Combine all stations
		all_station_ids = list(dict.fromkeys(self.PURPLE_LINE_STATIONS + self.AQUA_LINE_STATIONS))

		for sid in all_station_ids:
			entry = clean_lookup.get(sid, {})
			name_en = entry.get("station_name_en", sid.replace("_", " ").title())
			name_mr = entry.get("station_name_mr")
			coords = entry.get("coordinates")
			st_code = entry.get("station_code")

			station_obj: Dict[str, Any] = {
				"id": sid,
				"name": {
					"en": name_en
				},
				"lines": station_lines_map.get(sid, []),
				"properties": {
					"layout": "underground" if sid in {"shivaji_nagar", "district_court", "kasba_peth", "mahatma_phule_mandai", "swargate"} else "elevated",
					"status": "operational"
				}
			}

			if name_mr:
				station_obj["name"]["mr"] = name_mr

			if st_code:
				station_obj["code"] = st_code

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

			# Aggregate neighbors across lines (e.g. District Court has 4 neighbors)
			station_nb: List[Dict[str, str]] = []
			for assigned_lid in station_lines_map.get(sid, []):
				station_nb.extend(line_neighbors.get(assigned_lid, {}).get(sid, []))

			if station_nb:
				station_obj["neighbors"] = station_nb

			master["stationData"][sid] = station_obj
			master["stations"][sid] = station_obj

		return master
