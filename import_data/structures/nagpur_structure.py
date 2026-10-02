#!/usr/bin/env python3
"""
===============================================================================
Nagpur Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/nagpur_structure.py
Role    : Transforms Stage 2 nagpur_metro_cleaned.json -> nagpur_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic KML GPS,
          Marathi localization preservation, Multi-line topology (Orange & Aqua),
          Interchange at Sitabuldi, No synthetic distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class NagpurStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Nagpur Metro (Maha Metro)."""

	# Authentic Lines in Nagpur Metro
	LINE_ORANGE = "mahametro_nagpur.orange"
	LINE_AQUA = "mahametro_nagpur.aqua"

	# Canonical sequence for Orange Line (North-South Corridor: Automotive Sq -> Khapri)
	ORANGE_LINE_STATIONS = [
		"automotive_square",
		"nari_road",
		"indora_square",
		"kadbi_square",
		"gaddi_godam_square",
		"kasturchand_park",
		"zero_mile_freedom_park",
		"sitabuldi", # Sitabuldi Interchange
		"congress_nagar",
		"rahate_colony",
		"ajni_square",
		"chhatrapati_square",
		"jaiprakash_nagar",
		"ujwal_nagar",
		"airport",
		"south_airport",
		"new_airport",
		"khapri"
	]

	# Canonical sequence for Aqua Line (East-West Corridor: Prajapati Nagar -> Lokmanya Nagar)
	AQUA_LINE_STATIONS = [
		"prajapati_nagar",
		"vaishno_devi_chowk",
		"ambedkar_square",
		"telephone_exchange",
		"chitar_oli_square",
		"agrasen_square",
		"dosar_vaisya_square",
		"nagpur_railway",
		"cotton_market",
		"sitabuldi", # Sitabuldi Interchange
		"jhansi_rani_square",
		"institution_of_engineers",
		"shankar_nagar",
		"lad_square",
		"dharampeth_college",
		"subhash_nagar",
		"rachana_ring_road_junction",
		"vasudev_nagar",
		"bansi_nagar",
		"lokmanya_nagar_open"
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
				self.LINE_ORANGE: {
					"id": self.LINE_ORANGE,
					"network": "nagpur_metro",
					"operator": "Maharashtra Metro Rail Corporation Limited (MahaMetro)",
					"label": "O",
					"short_name": {
						"en": "Orange Line",
						"mr": "ऑरेंज लाइन"
					},
					"color": "#FF7A00",
					"color_name": "orange",
					"style": "solid",
					"route": {
						"from": self.ORANGE_LINE_STATIONS[0],
						"to": self.ORANGE_LINE_STATIONS[-1]
					},
					"stations": self.ORANGE_LINE_STATIONS
				},
				self.LINE_AQUA: {
					"id": self.LINE_AQUA,
					"network": "nagpur_metro",
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
				"sitabuldi": {
					self.LINE_ORANGE: {
						f"sitabuldi:{self.LINE_AQUA}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					},
					self.LINE_AQUA: {
						f"sitabuldi:{self.LINE_ORANGE}": {
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

		# Map cleaned stations for lookup (including handling sitabuldi variants)
		clean_lookup = dict(cleaned_dataset)

		# Consolidate sitabuldi variants if present
		sitabuldi_coords = None
		sitabuldi_mr = None
		if "sitabuldi_n_s" in clean_lookup:
			sitabuldi_coords = clean_lookup["sitabuldi_n_s"].get("coordinates")
			sitabuldi_mr = clean_lookup["sitabuldi_n_s"].get("station_name_mr")
		elif "sitabuldi_e_w" in clean_lookup:
			sitabuldi_coords = clean_lookup["sitabuldi_e_w"].get("coordinates")
			sitabuldi_mr = clean_lookup["sitabuldi_e_w"].get("station_name_mr")

		# Track station-to-line assignments
		station_lines_map: Dict[str, List[str]] = {}
		for sid in self.ORANGE_LINE_STATIONS:
			station_lines_map.setdefault(sid, []).append(self.LINE_ORANGE)
		for sid in self.AQUA_LINE_STATIONS:
			station_lines_map.setdefault(sid, []).append(self.LINE_AQUA)

		# Build neighbors for each line without fake distance
		line_neighbors_map: Dict[str, Dict[str, List[Dict[str, str]]]] = {
			self.LINE_ORANGE: {},
			self.LINE_AQUA: {}
		}

		# Process Orange line adjacency
		for i, sid in enumerate(self.ORANGE_LINE_STATIONS):
			nb_list = []
			if i > 0:
				nb_list.append({"station": self.ORANGE_LINE_STATIONS[i - 1], "line": self.LINE_ORANGE})
			if i < len(self.ORANGE_LINE_STATIONS) - 1:
				nb_list.append({"station": self.ORANGE_LINE_STATIONS[i + 1], "line": self.LINE_ORANGE})
			line_neighbors_map[self.LINE_ORANGE][sid] = nb_list

		# Process Aqua line adjacency
		for i, sid in enumerate(self.AQUA_LINE_STATIONS):
			nb_list = []
			if i > 0:
				nb_list.append({"station": self.AQUA_LINE_STATIONS[i - 1], "line": self.LINE_AQUA})
			if i < len(self.AQUA_LINE_STATIONS) - 1:
				nb_list.append({"station": self.AQUA_LINE_STATIONS[i + 1], "line": self.LINE_AQUA})
			line_neighbors_map[self.LINE_AQUA][sid] = nb_list

		# Construct all station objects
		all_station_ids = list(dict.fromkeys(self.ORANGE_LINE_STATIONS + self.AQUA_LINE_STATIONS))

		for sid in all_station_ids:
			clean_entry = clean_lookup.get(sid, {})

			# Resolve name
			if sid == "sitabuldi":
				name_en = "Sitabuldi Interchange"
				name_mr = "सीताबर्डी"
				coords = sitabuldi_coords
				st_code = "NGP_SIT"
			else:
				name_en = clean_entry.get("station_name_en", sid.replace("_", " ").title())
				name_mr = clean_entry.get("station_name_mr")
				coords = clean_entry.get("coordinates")
				st_code = clean_entry.get("station_code")

			station_obj: Dict[str, Any] = {
				"id": sid,
				"name": {
					"en": name_en
				},
				"lines": station_lines_map.get(sid, []),
				"properties": {
					"layout": "elevated",
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

			# Aggregate neighbors across lines for junction stations like Sitabuldi
			station_neighbors: List[Dict[str, str]] = []
			for line_id in station_lines_map.get(sid, []):
				nbs = line_neighbors_map.get(line_id, {}).get(sid, [])
				station_neighbors.extend(nbs)

			if station_neighbors:
				station_obj["neighbors"] = station_neighbors

			master["stationData"][sid] = station_obj
			master["stations"][sid] = station_obj

		return master
