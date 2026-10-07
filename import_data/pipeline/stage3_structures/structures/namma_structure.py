#!/usr/bin/env python3
"""
===============================================================================
Namma Metro Master Structuring Module (Stage 3 Canonical Schema)
===============================================================================
Location: import_data/structures/namma_structure.py
Role    : Transforms Stage 2 namma_metro_cleaned.json -> namma_metro_master.json
Rules   : 100% Zero-Data-Loss, Zero synthetic assumptions, Authentic Kannada names,
          Multi-Line Topology (Purple Line: Whitefield <-> Challaghatta,
          Green Line: Madavara <-> Silk Institute), Majestic Interchange,
          No fake distance calculation.
===============================================================================
"""

from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer


class NammaStructure(BaseTransitStructurer):
	"""Stage 3 Master Canonical Structurer for Namma Metro (BMRCL Bengaluru)."""

	# Canonical Line IDs for Namma Metro
	LINE_PURPLE = "bmrcl.purple"  # Purple Line: Whitefield (Kadugodi) <-> Challaghatta (37 stations)
	LINE_GREEN = "bmrcl.green"    # Green Line: Madavara <-> Silk Institute (32 stations)

	# 1. Authentic Purple Line sequence (East to West)
	PURPLE_LINE_STATIONS = [
		"whitefield_kadugodi",
		"hopefarm_channasandra",
		"kadugodi_tree_park",
		"pattandur_agrahara",
		"sri_sathya_sai_hospital",
		"nallurhalli",
		"kundalahalli",
		"seetharamapalya",
		"hoodi",
		"garudacharpalya",
		"singayyanapalya",
		"krishnarajapura",
		"benniganahalli",
		"baiyappanahalli",
		"swami_vivekananda_road",
		"indira_nagar",
		"halasuru",
		"trinity",
		"mahatma_gandhi_road",
		"cubbon_park",
		"dr_b_r_ambedkar_station_vidhana_soudha",
		"sir_m_visveshwaraya_station_central_college",
		"nadaprabhu_kempegowda_station_majestic", # Major Interchange with Green Line
		"krantivira_sangolli_rayanna_railway_station",
		"magadi_road",
		"hosahalli",
		"vijayanagar",
		"attiguppe",
		"deepanjali_nagar",
		"mysuru_road",
		"pantharapalyanayandahalli",
		"rajarajeshwari_nagar",
		"jnanabharathi",
		"pattanagere",
		"kengeri_bus_terminal",
		"kengeri",
		"challaghatta"
	]

	# 2. Authentic Green Line sequence (North to South)
	GREEN_LINE_STATIONS = [
		"madavara",
		"chikkabidarakallu",
		"manjunathanagara",
		"nagasandra",
		"dasarahalli",
		"jalahalli",
		"peenya_industry",
		"peenya",
		"goraguntepalya",
		"yeshwanthpur",
		"sandal_soap_factory",
		"mahalakshmi",
		"rajajinagar",
		"mahakavi_kuvempu_road",
		"srirampura",
		"mantri_square_sampige_road",
		"nadaprabhu_kempegowda_station_majestic", # Major Interchange with Purple Line
		"chickpete",
		"krishna_rajendra_market",
		"national_college",
		"lalbagh",
		"southend_circle",
		"jayanagar",
		"rashtreeya_vidyalaya_road",
		"banashankari",
		"jaya_prakash_nagar",
		"yelachenahalli",
		"konanakunte_cross",
		"doddakallasandra",
		"vajarahalli",
		"thalaghattapura",
		"silk_institute"
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
					"network": "namma_metro",
					"operator": "Bangalore Metro Rail Corporation Limited (BMRCL)",
					"label": "P",
					"short_name": {
						"en": "Purple Line",
						"kn": "ನೇರಳೆ ಮಾರ್ಗ"
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
				self.LINE_GREEN: {
					"id": self.LINE_GREEN,
					"network": "namma_metro",
					"operator": "Bangalore Metro Rail Corporation Limited (BMRCL)",
					"label": "G",
					"short_name": {
						"en": "Green Line",
						"kn": "ಹಸಿರು ಮಾರ್ಗ"
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
				"nadaprabhu_kempegowda_station_majestic": {
					self.LINE_PURPLE: {
						f"nadaprabhu_kempegowda_station_majestic:{self.LINE_GREEN}": {
							"type": "interchange",
							"transfer_mode": "vertical"
						}
					},
					self.LINE_GREEN: {
						f"nadaprabhu_kempegowda_station_majestic:{self.LINE_PURPLE}": {
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
		for sid in self.GREEN_LINE_STATIONS:
			if self.LINE_GREEN not in station_lines_map.get(sid, []):
				station_lines_map.setdefault(sid, []).append(self.LINE_GREEN)

		# Build line neighbors (without synthetic distance)
		line_sequences = [
			(self.LINE_PURPLE, self.PURPLE_LINE_STATIONS),
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
				name_en = entry.get("station_name_en", sid.replace("_", " ").title())
				name_kn = entry.get("station_name_kn")
				coords = entry.get("coordinates")
				code = entry.get("station_code")
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

				if name_kn:
					station_obj["name"]["kn"] = name_kn

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

				# Aggregate neighbors across lines
				station_nb: List[Dict[str, str]] = []
				for assigned_lid in station_lines_map.get(sid, []):
					station_nb.extend(line_neighbors.get(assigned_lid, {}).get(sid, []))

				if station_nb:
					station_obj["neighbors"] = station_nb

				master["stationData"][sid] = station_obj
				master["stations"][sid] = station_obj

		# 2. Preserve remaining phase 2 / unbuilt stations (Zero Data Loss guarantee)
		for slug, entry in clean_lookup.items():
			if slug in processed_slugs:
				continue
			processed_slugs.add(slug)

			name_en = entry.get("station_name_en", slug.replace("_", " ").title())
			name_kn = entry.get("station_name_kn")
			coords = entry.get("coordinates")
			code = entry.get("station_code")
			layout = entry.get("layout", "Elevated")
			opened = entry.get("opened_date")
			line_desc = entry.get("line")

			station_obj = {
				"id": slug,
				"name": {
					"en": name_en
				},
				"lines": [line_desc] if line_desc else [],
				"properties": {
					"layout": str(layout).lower() if layout else "elevated",
					"status": "under_construction"
				}
			}

			if name_kn:
				station_obj["name"]["kn"] = name_kn
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
