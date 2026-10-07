#!/usr/bin/env python3
"""
===============================================================================
Hyderabad Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/hyderabad_structure.py
Role    : Transforms Stage 2 hyderabad_metro_cleaned.json -> hyderabad_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic Telugu/Urdu names,
          Multi-Line Topology (Red Line, Blue Line, Green Line), Authentic Interchanges
          (Ameerpet, MGBS, Parade Ground / JBS), Facilities preservation, No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class HyderabadStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Hyderabad Metro (L&T / HMRL)."""

	# Canonical Line IDs
	LINE_RED = "hmrl.red"      # Miyapur <-> LB Nagar (Corridor 1)
	LINE_BLUE = "hmrl.blue"    # Nagole <-> Raidurg (Corridor 3)
	LINE_GREEN = "hmrl.green"  # JBS Parade Ground <-> MG Bus Station (Corridor 2)

	# 1. Red Line (Miyapur to LB Nagar) - 27 stations
	RED_LINE_STATIONS = [
		"miyapur",
		"jntu-college",
		"kphb-colony",
		"kukatpally",
		"balanagar",
		"moosapet",
		"bharat-nagar",
		"erragadda",
		"esi-hospital",
		"sr-nagar",
		"ameerpet", # Interchange with Blue Line
		"punjagutta",
		"irrum-manzil",
		"khairtabad",
		"lakdi-ka-pul",
		"assembly",
		"nampally",
		"gandhi-bhavan",
		"osmania-college",
		"mg-bus-station", # Interchange with Green Line
		"malakpet",
		"new-market",
		"musarambagh",
		"dilsukhnagar",
		"chaitanya-puri",
		"victoria-memorial",
		"lb-nagar"
	]

	# 2. Blue Line (Nagole to Raidurg) - 23 stations
	BLUE_LINE_STATIONS = [
		"nagole",
		"uppal-bus",
		"stadium",
		"ngri",
		"habsiguda",
		"tarnaka",
		"mettuguda",
		"secunderabad-east",
		"parade-ground", # Interchange with Green Line (JBS)
		"paradise",
		"rasoolpura",
		"prakash-nagar",
		"begumpet",
		"ameerpet", # Interchange with Red Line
		"madhura-nagar",
		"yusufguda",
		"road-no-5-jubilee-hills",
		"jubilee-hills-check-post",
		"peddamma-gudi",
		"madhapur",
		"durgam-cheruvu",
		"hitec-city",
		"raidurg"
	]

	# 3. Green Line (JBS Parade Ground to MG Bus Station) - 9 stations
	GREEN_LINE_STATIONS = [
		"jbs-parade-ground", # Interchange with Blue Line (Parade Ground)
		"secunderabad-west",
		"gandhi-hospital",
		"musheerabad",
		"rtc-x-roads",
		"chikkadpally",
		"narayanguda",
		"sultan-bazar",
		"mg-bus-station" # Interchange with Red Line
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
				self.LINE_RED: {
					"id": self.LINE_RED,
					"network": "hyderabad_metro",
					"operator": "L&T Metro Rail (Hyderabad) Limited",
					"label": "R",
					"short_name": {
						"en": "Red Line",
						"te": "రెడ్ లైన్"
					},
					"color": "#D32F2F",
					"color_name": "red",
					"style": "solid",
					"route": {
						"from": self.RED_LINE_STATIONS[0],
						"to": self.RED_LINE_STATIONS[-1]
					},
					"stations": self.RED_LINE_STATIONS
				},
				self.LINE_BLUE: {
					"id": self.LINE_BLUE,
					"network": "hyderabad_metro",
					"operator": "L&T Metro Rail (Hyderabad) Limited",
					"label": "B",
					"short_name": {
						"en": "Blue Line",
						"te": "బ్లూ లైన్"
					},
					"color": "#005BA6",
					"color_name": "blue",
					"style": "solid",
					"route": {
						"from": self.BLUE_LINE_STATIONS[0],
						"to": self.BLUE_LINE_STATIONS[-1]
					},
					"stations": self.BLUE_LINE_STATIONS
				},
				self.LINE_GREEN: {
					"id": self.LINE_GREEN,
					"network": "hyderabad_metro",
					"operator": "L&T Metro Rail (Hyderabad) Limited",
					"label": "G",
					"short_name": {
						"en": "Green Line",
						"te": "గ్రీన్ లైన్"
					},
					"color": "#008752",
					"color_name": "green",
					"style": "solid",
					"route": {
						"from": self.GREEN_LINE_STATIONS[0],
						"to": self.GREEN_LINE_STATIONS[-1]
					},
					"stations": self.GREEN_LINE_STATIONS
				}
			},
			"transfers": {
				"ameerpet": {
					self.LINE_RED: {
						f"ameerpet:{self.LINE_BLUE}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					},
					self.LINE_BLUE: {
						f"ameerpet:{self.LINE_RED}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					}
				},
				"mg-bus-station": {
					self.LINE_RED: {
						f"mg-bus-station:{self.LINE_GREEN}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					},
					self.LINE_GREEN: {
						f"mg-bus-station:{self.LINE_RED}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					}
				},
				"parade-ground": {
					self.LINE_BLUE: {
						f"jbs-parade-ground:{self.LINE_GREEN}": {
							"type": "interchange",
							"transfer_mode": "walkway"
						}
					}
				},
				"jbs-parade-ground": {
					self.LINE_GREEN: {
						f"parade-ground:{self.LINE_BLUE}": {
							"type": "interchange",
							"transfer_mode": "walkway"
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
		for sid in self.RED_LINE_STATIONS:
			station_lines_map.setdefault(sid, []).append(self.LINE_RED)
		for sid in self.BLUE_LINE_STATIONS:
			if self.LINE_BLUE not in station_lines_map.get(sid, []):
				station_lines_map.setdefault(sid, []).append(self.LINE_BLUE)
		for sid in self.GREEN_LINE_STATIONS:
			if self.LINE_GREEN not in station_lines_map.get(sid, []):
				station_lines_map.setdefault(sid, []).append(self.LINE_GREEN)

		# Build line neighbors (without synthetic distance)
		line_sequences = [
			(self.LINE_RED, self.RED_LINE_STATIONS),
			(self.LINE_BLUE, self.BLUE_LINE_STATIONS),
			(self.LINE_GREEN, self.GREEN_LINE_STATIONS)
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

		processed_slugs = set()

		# 1. Process all operational line stations
		for lid, seq in line_sequences:
			for sid in seq:
				if sid in processed_slugs:
					continue
				processed_slugs.add(sid)

				entry = clean_lookup.get(sid, {})
				name_en = entry.get("station_name_en", sid.replace("-", " ").title())
				name_te = entry.get("station_name_te")
				name_ur = entry.get("station_name_ur")
				coords = entry.get("coordinates")
				st_id = entry.get("station_id")
				layout = entry.get("layout", "Elevated")
				opened = entry.get("opened_date")
				facilities = entry.get("facilities")

				station_obj: Dict[str, Any] = {
					"id": sid,
					"name": {
						"en": name_en
					},
					"lines": station_lines_map.get(sid, []),
					"properties": {
						"layout": str(layout).lower() if layout else "elevated",
						"status": "operational"
					}
				}

				if name_te:
					station_obj["name"]["te"] = name_te
				if name_ur:
					station_obj["name"]["ur"] = name_ur

				if st_id:
					station_obj["code"] = f"HYD_{st_id}"

				if opened:
					station_obj["opened_date"] = opened

				if facilities and isinstance(facilities, dict):
					station_obj["facilities"] = facilities

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

				# Aggregate neighbors across lines
				station_nb: List[Dict[str, str]] = []
				for assigned_lid in station_lines_map.get(sid, []):
					station_nb.extend(line_neighbors.get(assigned_lid, {}).get(sid, []))

				if station_nb:
					station_obj["neighbors"] = station_nb

				master["stationData"][sid] = station_obj
				master["stations"][sid] = station_obj

		# 2. Preserve remaining stations (like secunderabad-railway-station, m-g-bus-station) for Zero Data Loss
		for slug, entry in clean_lookup.items():
			if slug in processed_slugs:
				continue
			processed_slugs.add(slug)

			name_en = entry.get("station_name_en", slug.replace("-", " ").title())
			name_te = entry.get("station_name_te")
			name_ur = entry.get("station_name_ur")
			coords = entry.get("coordinates")
			st_id = entry.get("station_id")
			layout = entry.get("layout", "Elevated")
			opened = entry.get("opened_date")
			facilities = entry.get("facilities")

			station_obj = {
				"id": slug,
				"name": {
					"en": name_en
				},
				"lines": [],
				"properties": {
					"layout": str(layout).lower() if layout else "elevated",
					"status": "operational"
				}
			}

			if name_te:
				station_obj["name"]["te"] = name_te
			if name_ur:
				station_obj["name"]["ur"] = name_ur
			if st_id:
				station_obj["code"] = f"HYD_{st_id}"
			if opened:
				station_obj["opened_date"] = opened
			if facilities and isinstance(facilities, dict):
				station_obj["facilities"] = facilities
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

			master["stationData"][slug] = station_obj
			master["stations"][slug] = station_obj

		return master
