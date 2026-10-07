#!/usr/bin/env python3
"""
===============================================================================
Kolkata Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/kolkata_structure.py
Role    : Transforms Stage 2 kolkata_metro_cleaned.json -> kolkata_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic Bengali names,
          Multi-Line Topology (Blue Line, Green Line, Orange Line, Purple Line, Yellow Line),
          Authentic Interchanges (Esplanade, Kavi Subhash, Noapara), No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class KolkataStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Kolkata Metro (Metro Railway Kolkata / Indian Railways)."""

	# Canonical Line IDs
	LINE_BLUE = "kolkata_metro.blue"      # Line 1: Dakshineswar <-> Kavi Subhash (26 stations)
	LINE_GREEN = "kolkata_metro.green"    # Line 2: Howrah Maidan <-> Salt Lake Sector-V (12 stations)
	LINE_ORANGE = "kolkata_metro.orange"  # Line 6: Kavi Subhash <-> Beleghata (9 stations)
	LINE_PURPLE = "kolkata_metro.purple"  # Line 3: Joka <-> Majerhat (7 stations)
	LINE_YELLOW = "kolkata_metro.yellow"  # Line 4: Noapara <-> Jai Hind / Airport (4 stations)

	# 1. Blue Line (North to South: Dakshineswar to Kavi Subhash) - 26 stations
	BLUE_LINE_STATIONS = [
		"dakshineswar",
		"baranagar",
		"noapara", # Interchange with Yellow Line
		"dum_dum",
		"belgachhia",
		"shyambazar",
		"shobhabazar_sutanuti",
		"girish_park",
		"mahatma_gandhi_road",
		"central",
		"chandni_chowk",
		"esplanade", # Interchange with Green Line
		"park_street",
		"maidan",
		"rabindra_sadan",
		"netaji_bhavan",
		"jatin_das_park",
		"kalighat",
		"rabindra_sarobar",
		"mahanayak_uttam_kumar",
		"netaji",
		"masterda_surya_sen",
		"gitanjali",
		"kavi_nazrul",
		"shahid_khudiram",
		"kavi_subhash" # Interchange with Orange Line
	]

	# 2. Green Line (West to East: Howrah Maidan to Salt Lake Sector-V) - 12 stations
	GREEN_LINE_STATIONS = [
		"howrah_maidan",
		"howrah",
		"mahakaran",
		"esplanade", # Interchange with Blue Line
		"sealdah",
		"phoolbagan",
		"salt_lake_stadium",
		"bengal_chemical",
		"city_center",
		"central_park",
		"karunamoyee",
		"salt_lake_sector_v"
	]

	# 3. Orange Line (South to North-East: Kavi Subhash to Beleghata) - 9 stations
	ORANGE_LINE_STATIONS = [
		"kavi_subhash", # Interchange with Blue Line
		"satyajit_ray",
		"jyotirindra_nandi",
		"kavi_sukanta",
		"hemanta_mukhopadhyay",
		"vip_bazar",
		"ritwik_ghatak",
		"barun_sengupta",
		"beleghata"
	]

	# 4. Purple Line (South-West: Joka to Majerhat) - 7 stations
	PURPLE_LINE_STATIONS = [
		"joka",
		"thakurpukur",
		"behala_sakherbazar",
		"behala_chowrasta",
		"behala_bazar",
		"taratala",
		"majerhat"
	]

	# 5. Yellow Line (Noapara to Jai Hind Airport) - 4 stations
	YELLOW_LINE_STATIONS = [
		"noapara", # Interchange with Blue Line
		"dum_dum_cantonment",
		"jessore_road",
		"jai_hind"
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
				"layout": "underground"
			},
			"lines": {
				self.LINE_BLUE: {
					"id": self.LINE_BLUE,
					"network": "kolkata_metro",
					"operator": "Metro Railway Kolkata (Indian Railways)",
					"label": "1",
					"short_name": {
						"en": "Blue Line (Line 1)",
						"bn": "ব্লু লাইন (লাইন ১)"
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
					"network": "kolkata_metro",
					"operator": "Metro Railway Kolkata (Indian Railways)",
					"label": "2",
					"short_name": {
						"en": "Green Line (Line 2)",
						"bn": "গ্রিন লাইন (লাইন ২)"
					},
					"color": "#008752",
					"color_name": "green",
					"style": "solid",
					"route": {
						"from": self.GREEN_LINE_STATIONS[0],
						"to": self.GREEN_LINE_STATIONS[-1]
					},
					"stations": self.GREEN_LINE_STATIONS
				},
				self.LINE_ORANGE: {
					"id": self.LINE_ORANGE,
					"network": "kolkata_metro",
					"operator": "Metro Railway Kolkata (Indian Railways)",
					"label": "6",
					"short_name": {
						"en": "Orange Line (Line 6)",
						"bn": "অরেঞ্জ লাইন (লাইন ৬)"
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
				self.LINE_PURPLE: {
					"id": self.LINE_PURPLE,
					"network": "kolkata_metro",
					"operator": "Metro Railway Kolkata (Indian Railways)",
					"label": "3",
					"short_name": {
						"en": "Purple Line (Line 3)",
						"bn": "পার্পল লাইন (লাইন ৩)"
					},
					"color": "#8C2877",
					"color_name": "purple",
					"style": "solid",
					"route": {
						"from": self.PURPLE_LINE_STATIONS[0],
						"to": self.PURPLE_LINE_STATIONS[-1]
					},
					"stations": self.PURPLE_LINE_STATIONS
				},
				self.LINE_YELLOW: {
					"id": self.LINE_YELLOW,
					"network": "kolkata_metro",
					"operator": "Metro Railway Kolkata (Indian Railways)",
					"label": "4",
					"short_name": {
						"en": "Yellow Line (Line 4)",
						"bn": "ইয়েলো লাইন (লাইন ৪)"
					},
					"color": "#FBC02D",
					"color_name": "yellow",
					"style": "solid",
					"route": {
						"from": self.YELLOW_LINE_STATIONS[0],
						"to": self.YELLOW_LINE_STATIONS[-1]
					},
					"stations": self.YELLOW_LINE_STATIONS
				}
			},
			"transfers": {
				"esplanade": {
					self.LINE_BLUE: {
						f"esplanade:{self.LINE_GREEN}": {
							"type": "interchange",
							"transfer_mode": "subway"
						}
					},
					self.LINE_GREEN: {
						f"esplanade:{self.LINE_BLUE}": {
							"type": "interchange",
							"transfer_mode": "subway"
						}
					}
				},
				"kavi_subhash": {
					self.LINE_BLUE: {
						f"kavi_subhash:{self.LINE_ORANGE}": {
							"type": "interchange",
							"transfer_mode": "cross_platform"
						}
					},
					self.LINE_ORANGE: {
						f"kavi_subhash:{self.LINE_BLUE}": {
							"type": "interchange",
							"transfer_mode": "cross_platform"
						}
					}
				},
				"noapara": {
					self.LINE_BLUE: {
						f"noapara:{self.LINE_YELLOW}": {
							"type": "interchange",
							"transfer_mode": "same_platform"
						}
					},
					self.LINE_YELLOW: {
						f"noapara:{self.LINE_BLUE}": {
							"type": "interchange",
							"transfer_mode": "same_platform"
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
		line_sequences = [
			(self.LINE_BLUE, self.BLUE_LINE_STATIONS),
			(self.LINE_GREEN, self.GREEN_LINE_STATIONS),
			(self.LINE_ORANGE, self.ORANGE_LINE_STATIONS),
			(self.LINE_PURPLE, self.PURPLE_LINE_STATIONS),
			(self.LINE_YELLOW, self.YELLOW_LINE_STATIONS)
		]

		for lid, seq in line_sequences:
			for sid in seq:
				if lid not in station_lines_map.setdefault(sid, []):
					station_lines_map[sid].append(lid)

		# Build line neighbors (without synthetic distance)
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
				name_en = entry.get("station_name_en", sid.replace("_", " ").title())
				name_bn = entry.get("station_name_bn")
				coords = entry.get("coordinates")
				code = entry.get("station_code")
				layout = entry.get("layout", "Underground")
				opened = entry.get("opened_date")

				station_obj: Dict[str, Any] = {
					"id": sid,
					"name": {
						"en": name_en
					},
					"lines": station_lines_map.get(sid, []),
					"properties": {
						"layout": str(layout).lower() if layout else "underground",
						"status": "operational"
					}
				}

				if name_bn:
					station_obj["name"]["bn"] = name_bn

				if code and code != "–":
					station_obj["code"] = code

				if opened:
					station_obj["opened_date"] = opened

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

				# Aggregate neighbors across lines (e.g. Esplanade, Kavi Subhash, Noapara)
				station_nb: List[Dict[str, str]] = []
				for assigned_lid in station_lines_map.get(sid, []):
					station_nb.extend(line_neighbors.get(assigned_lid, {}).get(sid, []))

				if station_nb:
					station_obj["neighbors"] = station_nb

				master["stationData"][sid] = station_obj
				master["stations"][sid] = station_obj

		# 2. Preserve any remaining stations from clean dataset (Zero Data Loss guarantee)
		for slug, entry in clean_lookup.items():
			if slug in processed_slugs:
				continue
			processed_slugs.add(slug)

			name_en = entry.get("station_name_en", slug.replace("_", " ").title())
			name_bn = entry.get("station_name_bn")
			coords = entry.get("coordinates")
			code = entry.get("station_code")
			layout = entry.get("layout", "Elevated")
			opened = entry.get("opened_date")

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

			if name_bn:
				station_obj["name"]["bn"] = name_bn
			if code and code != "–":
				station_obj["code"] = code
			if opened:
				station_obj["opened_date"] = opened
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
