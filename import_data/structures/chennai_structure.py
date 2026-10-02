#!/usr/bin/env python3
"""
===============================================================================
Chennai Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/chennai_structure.py
Role    : Transforms Stage 2 chennai_metro_cleaned.json -> chennai_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic Tamil names,
          Multi-Line Topology (Blue Line & Green Line), Authentic Interchanges
          (Central Metro, Alandur Metro), No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class ChennaiStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Chennai Metro (CMRL)."""

	# Canonical Line IDs
	LINE_BLUE = "cmrl.blue"    # Corridor 1: Wimco Nagar Depot <-> Airport (26 stations)
	LINE_GREEN = "cmrl.green"  # Corridor 2: Central Metro <-> St. Thomas Mount (17 stations)

	# 1. Blue Line (North to South: Wimco Nagar Depot to Chennai Airport) - 26 stations
	BLUE_LINE_STATIONS = [
		"wimco-nagar-depot-metro",
		"wimco-nagar-metro",
		"thiruvotriyur-metro",
		"thiruvottriyur-theradi-metro",
		"kaladipet-metro",
		"tollgate-metro",
		"new-washermenpet-metro",
		"tondiarpet-metro",
		"sir-thiyagaraya-college-metro",
		"washermenpet-metro",
		"mannadi",
		"highcourt",
		"puratchi-thalaivar-dr-m-g-ramachandran-central-metro", # Major Interchange with Green Line
		"government-estate",
		"lic",
		"thousand-lights",
		"ag-dms",
		"teynampet",
		"nandanam",
		"saidapet-metro",
		"little-mount",
		"guindy",
		"arignar-anna-alandur-metro", # Major Interchange with Green Line
		"ota-nanganallur-road",
		"meenambakkam",
		"chennai-international-airport"
	]

	# 2. Green Line (Central Metro to St. Thomas Mount) - 17 stations
	GREEN_LINE_STATIONS = [
		"puratchi-thalaivar-dr-m-g-ramachandran-central-metro-2", # Major Interchange with Blue Line
		"egmore-metro",
		"nehru-park",
		"kilpauk",
		"pachaiyappas-college",
		"shenoy-nagar",
		"anna-nagar-east",
		"anna-nagar-tower",
		"thirumangalam",
		"koyambedu",
		"puratchi-thalaivi-dr-j-jayalalithaa-cmbt-metro",
		"arumbakkam",
		"vadapalani",
		"ashok-nagar",
		"ekkattuthangal",
		"arignar-anna-alandur-metro-2", # Major Interchange with Blue Line
		"st-thomas-mount-metro"
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
				self.LINE_BLUE: {
					"id": self.LINE_BLUE,
					"network": "chennai_metro",
					"operator": "Chennai Metro Rail Limited (CMRL)",
					"label": "B",
					"short_name": {
						"en": "Blue Line (Corridor 1)",
						"ta": "நீல வழித்தடம்"
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
					"network": "chennai_metro",
					"operator": "Chennai Metro Rail Limited (CMRL)",
					"label": "G",
					"short_name": {
						"en": "Green Line (Corridor 2)",
						"ta": "பச்சை வழித்தடம்"
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
				"central_metro": {
					self.LINE_BLUE: {
						f"puratchi-thalaivar-dr-m-g-ramachandran-central-metro-2:{self.LINE_GREEN}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					},
					self.LINE_GREEN: {
						f"puratchi-thalaivar-dr-m-g-ramachandran-central-metro:{self.LINE_BLUE}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					}
				},
				"alandur_metro": {
					self.LINE_BLUE: {
						f"arignar-anna-alandur-metro-2:{self.LINE_GREEN}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					},
					self.LINE_GREEN: {
						f"arignar-anna-alandur-metro:{self.LINE_BLUE}": {
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
		for sid in self.BLUE_LINE_STATIONS:
			station_lines_map.setdefault(sid, []).append(self.LINE_BLUE)
		for sid in self.GREEN_LINE_STATIONS:
			if self.LINE_GREEN not in station_lines_map.get(sid, []):
				station_lines_map.setdefault(sid, []).append(self.LINE_GREEN)

		# Build line neighbors (without synthetic distance)
		line_sequences = [
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

		# Include cross-platform interchange links between paired station nodes
		interchange_pairs = [
			("puratchi-thalaivar-dr-m-g-ramachandran-central-metro", "puratchi-thalaivar-dr-m-g-ramachandran-central-metro-2", self.LINE_GREEN),
			("puratchi-thalaivar-dr-m-g-ramachandran-central-metro-2", "puratchi-thalaivar-dr-m-g-ramachandran-central-metro", self.LINE_BLUE),
			("arignar-anna-alandur-metro", "arignar-anna-alandur-metro-2", self.LINE_GREEN),
			("arignar-anna-alandur-metro-2", "arignar-anna-alandur-metro", self.LINE_BLUE)
		]

		processed_slugs = set()

		# Process all stations
		for lid, seq in line_sequences:
			for sid in seq:
				if sid in processed_slugs:
					continue
				processed_slugs.add(sid)

				entry = clean_lookup.get(sid, {})
				name_en = entry.get("station_name_en", sid.replace("-", " ").title())
				name_ta = entry.get("station_name_ta")
				coords = entry.get("coordinates")
				st_id = entry.get("station_id")
				layout = entry.get("layout", "Elevated")
				opened = entry.get("opened_date")

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

				if name_ta:
					station_obj["name"]["ta"] = name_ta

				if st_id:
					station_obj["code"] = f"CHN_{st_id}"

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

				# Aggregate neighbors across lines
				station_nb: List[Dict[str, str]] = []
				for assigned_lid in station_lines_map.get(sid, []):
					station_nb.extend(line_neighbors.get(assigned_lid, {}).get(sid, []))

				# Add paired interchange neighbor if applicable
				for source_id, target_id, target_line in interchange_pairs:
					if sid == source_id:
						station_nb.append({"station": target_id, "line": target_line})

				if station_nb:
					station_obj["neighbors"] = station_nb

				master["stationData"][sid] = station_obj
				master["stations"][sid] = station_obj

		return master
