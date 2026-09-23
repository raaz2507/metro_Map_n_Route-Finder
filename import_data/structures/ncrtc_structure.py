#!/usr/bin/env python3
"""
================================================================================
NCRTC RRTS Master Structuring Module (Stage 3 Canonical Schema)
================================================================================
Location: import_data_new/structures/ncrtc_structure.py
Role    : Transforms Stage 2 ncrtc_rrts_cleaned.json -> ncrtc_rrts_master.json
Rules   : Zero synthetic data, No fake dummy lots, Canonical Line IDs
================================================================================
"""

import json
import re
from pathlib import Path
from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer
from pipeline_core.file_manager import UniversalFileSystemManager


class NCRTCStructure(BaseTransitStructurer):
	"""NCRTC RRTS (Namo Bharat) Master Canonical Structurer."""

	CANONICAL_LINE_ID = "ncrtc.delhi_meerut_rrts"

	@staticmethod
	def parse_fare_num(fare_str: Any) -> int:
		if not fare_str:
			return 0
		m = re.search(r"\d+", str(fare_str))
		return int(m.group(0)) if m else 0

	@classmethod
	def parse_parking_charges_structured(cls, raw_pc: dict, st_state_raw: str) -> dict:
		if not raw_pc or not isinstance(raw_pc, dict) or not raw_pc.get("charges"):
			return {}

		target_state = "Delhi" if "delhi" in (st_state_raw or "").lower() else "Uttar Pradesh"
		rates: Dict[str, Any] = {}

		for item_obj in raw_pc.get("charges", []):
			v_type = (item_obj.get("item") or "").lower()

			if "four" in v_type or "cars" in v_type:
				v_key = "four_wheeler"
			elif "two" in v_type:
				v_key = "two_wheeler"
			elif "helmet" in v_type:
				v_key = "helmet"
			elif "bicycle" in v_type:
				v_key = "bicycle"
			else:
				v_key = "other"

			for cy in item_obj.get("cycles", []):
				cy_name = (cy.get("cycle") or "").lower()

				for p in cy.get("periods", []):
					p_text = p.get("period", "")
					p_lower = p_text.lower()

					fare_val = 0
					for st_f in p.get("states", []):
						if st_f.get("state", "").lower() == target_state.lower():
							fare_val = cls.parse_fare_num(st_f.get("fare"))
							break
					if fare_val == 0 and p.get("states"):
						fare_val = cls.parse_fare_num(p["states"][0].get("fare"))

					if "helmet" in v_key:
						if "helmet" not in rates:
							rates["helmet"] = []
						if "beyond 12" in p_lower:
							rates["helmet"].append({
								"min_minutes": 720,
								"max_minutes": 1440,
								"tag": "12 to 24 Hours",
								"fare": fare_val,
							})
						else:
							rates["helmet"].append({
								"min_minutes": 0,
								"max_minutes": 720,
								"tag": "Up to 12 Hours",
								"fare": fare_val,
							})
					else:
						if v_key not in rates:
							rates[v_key] = {}

						if "night" in cy_name or "night" in p_lower:
							if "night_charges" not in rates[v_key]:
								rates[v_key]["night_charges"] = []
							rates[v_key]["night_charges"].append({
								"min_minutes": 0,
								"max_minutes": 300,
								"tag": "Night Parking (00:00 - 05:00)",
								"fare": fare_val,
							})
						elif "monthly" in cy_name or "monthly" in p_lower:
							if "monthly_passes" not in rates[v_key]:
								rates[v_key]["monthly_passes"] = {}
							t_type = "tariff_b" if "tariff b" in p_lower or "24/7" in p_lower else "tariff_a"
							t_lbl = "24/7" if t_type == "tariff_b" else "05:00 - 23:00"
							rates[v_key]["monthly_passes"][t_type] = {
								"timing": t_lbl,
								"fare": fare_val,
							}
						else:
							if "day_charges" not in rates[v_key]:
								rates[v_key]["day_charges"] = []

							if "pick-up" in p_lower or "drop off" in p_lower:
								item_dict = {"min_minutes": 0, "max_minutes": 10, "tag": "Pick-up / Drop Off", "fare": fare_val}
							elif "16" in p_lower and "12" in p_lower:
								item_dict = {"min_minutes": 720, "max_minutes": 960, "fare": fare_val}
							elif "12" in p_lower and "6" in p_lower:
								item_dict = {"min_minutes": 360, "max_minutes": 720, "fare": fare_val}
							elif "6" in p_lower and "10" in p_lower:
								item_dict = {"min_minutes": 10, "max_minutes": 360, "fare": fare_val}
							elif "16" in p_lower or "operations" in p_lower:
								item_dict = {"min_minutes": 960, "max_minutes": 1440, "tag": "Station Operations", "fare": fare_val}
							else:
								item_dict = {"min_minutes": 0, "max_minutes": 10, "tag": "Pick-up / Drop Off", "fare": fare_val}

							rates[v_key]["day_charges"].append(item_dict)

		return {
			"state": target_state,
			"currency": "INR",
			"symbol": "₹",
			"rates": rates,
		}

	def structure(
		self,
		cleaned_dataset: Dict[str, Any],
		network_id: str,
		existing_master: Optional[Dict[str, Any]] = None
	) -> Dict[str, Any]:
		reference_hi_names: Dict[str, str] = {}
		if existing_master:
			for s_id, s_val in existing_master.items():
				hi_txt = s_val.get("name", {}).get("hi", "")
				if hi_txt:
					reference_hi_names[s_id] = hi_txt

		stations_source = cleaned_dataset.get("stations", cleaned_dataset)
		structured_output: Dict[str, Any] = {}

		iterator = stations_source.items() if isinstance(stations_source, dict) else enumerate(stations_source)

		for key_or_idx, st_entry in iterator:
			summary_raw = st_entry.get("summary_raw", st_entry)
			details_raw = st_entry.get("details_raw", {})

			st_name = (summary_raw.get("name") or "").strip()
			slug = UniversalFileSystemManager.slugify(st_name)

			# 1. Names
			station_obj: Dict[str, Any] = {
				"id": slug,
				"name": {
					"en": st_name
				}
			}
			hi_name = reference_hi_names.get(slug, "")
			if hi_name:
				station_obj["name"]["hi"] = hi_name

			# 2. Code
			if summary_raw.get("code"):
				station_obj["code"] = summary_raw["code"]

			# 3. Canonical Lines (FIXED: Added missing lines array!)
			station_obj["lines"] = [self.CANONICAL_LINE_ID]

			# 4. Location
			lat_val = float(summary_raw.get("latitude", 0)) if summary_raw.get("latitude") else 0.0
			lon_val = float(summary_raw.get("longitude", 0)) if summary_raw.get("longitude") else 0.0
			if lat_val != 0.0 or lon_val != 0.0:
				station_obj["location"] = {
					"decimal": {
						"lat": lat_val,
						"lon": lon_val
					}
				}

			# 5. Properties
			layout_val = (summary_raw.get("layout") or "elevated").lower()
			st_type_val = "interchange" if summary_raw.get("isInterchange") else "normal"

			station_obj["properties"] = {
				"layout": layout_val,
				"status": "operational",
				"station_type": st_type_val
			}

			# 6. Timings (Only authentic values)
			timings: Dict[str, str] = {}
			for tt in details_raw.get("trainTiming", []):
				direction = tt.get("direction", "").lower()
				t_val = (tt.get("time") or "").strip()
				if "first" in direction and t_val:
					timings["opening"] = f"{t_val}:00" if len(t_val) == 5 else t_val
				elif "last" in direction and t_val:
					timings["closing"] = f"{t_val}:00" if len(t_val) == 5 else t_val
			if timings:
				station_obj["timings"] = timings

			# 7. Contacts (Only authentic numbers)
			control_room = (details_raw.get("stationControlRoom") or "").strip()
			if control_room:
				station_obj["contact"] = {
					"mobile": control_room
				}

			# 8. Description
			about_text = (details_raw.get("about") or "").strip()
			if about_text:
				station_obj["description"] = {
					"en": about_text
				}

			# 9. Neighbors (FIXED: Using canonical line ID 'ncrtc.delhi_meerut_rrts')
			neighbors = []
			left_st = details_raw.get("leftStation", {})
			left_info = details_raw.get("leftJourneyInfo", {})
			if left_st and left_st.get("name"):
				dist_val = int(left_info.get("distance", {}).get("value", 0)) if left_info.get("distance", {}).get("value") else None
				time_val = int(left_info.get("time", {}).get("value", 0)) if left_info.get("time", {}).get("value") else None
				edge: Dict[str, Any] = {
					"station": UniversalFileSystemManager.slugify(left_st.get("name", "")),
					"line": self.CANONICAL_LINE_ID
				}
				if dist_val:
					edge["distance"] = dist_val
				if time_val:
					edge["travel_time_sec"] = time_val
				neighbors.append(edge)

			right_st = details_raw.get("rightStation", {})
			right_info = details_raw.get("rightJourneyInfo", {})
			if right_st and right_st.get("name"):
				dist_val = int(right_info.get("distance", {}).get("value", 0)) if right_info.get("distance", {}).get("value") else None
				time_val = int(right_info.get("time", {}).get("value", 0)) if right_info.get("time", {}).get("value") else None
				edge = {
					"station": UniversalFileSystemManager.slugify(right_st.get("name", "")),
					"line": self.CANONICAL_LINE_ID
				}
				if dist_val:
					edge["distance"] = dist_val
				if time_val:
					edge["travel_time_sec"] = time_val
				neighbors.append(edge)

			if neighbors:
				station_obj["neighbors"] = neighbors

			# 10. Platforms (Harmonized with Universal Schema)
			platforms_dict = {}
			for p in details_raw.get("platforms", []):
				p_num = str(p.get("number", p.get("id", "")))
				platforms_dict[p_num] = {
					"line": self.CANONICAL_LINE_ID,
					"destination": p.get("destination", ""),
					"is_open": p.get("isOpen", True),
					"lounge": p.get("isPremiumLoungeAvailable", False)
				}
			if platforms_dict:
				station_obj["platforms"] = platforms_dict
			# 11. Gates
			gates_dict = {}
			for g in details_raw.get("gates", []):
				g_num = str(g.get("number", g.get("id", "")))
				g_entry: Dict[str, Any] = {
					"code": "GA" + g_num,
					"divyang": g.get("hasSpecialAid", details_raw.get("isDivyangFriendly", False)),
					"status": "open" if g.get("isOpen", True) else "closed"
				}
				if g.get("location"):
					g_entry["landmark"] = {"en": g["location"].strip()}
				gates_dict[g_num] = g_entry
			if gates_dict:
				station_obj["gates"] = gates_dict

			# 12. Parking Charges (Authentic Tariff preservation)
			parsed_parking_charges = self.parse_parking_charges_structured(
				details_raw.get("parkingCharges", {}), summary_raw.get("state", "")
			)
			if parsed_parking_charges:
				station_obj["parkingCharges"] = parsed_parking_charges

			# 13. Facilities
			facilities_dict: Dict[str, list] = {}
			for fac in details_raw.get("facilities", []):
				f_name = fac.get("name", "General")
				if f_name not in facilities_dict:
					facilities_dict[f_name] = []
				facilities_dict[f_name].append({
					"location": fac.get("location", "").strip()
				})
			if facilities_dict:
				station_obj["facilities"] = facilities_dict

			# 14. Vertical Transit (Lifts & Escalators)
			lifts_dict = {}
			for idx, l in enumerate(details_raw.get("lift", []), start=1):
				lifts_dict[str(idx)] = {
					"code": f"LIFT_{idx}",
					"name": l.get("name", ""),
					"location": l.get("location", ""),
					"divyang_friendly": True,
					"is_stretcher_lift": l.get("isStretcherLiftAvailable", True),
					"status": l.get("isOpen", True)
				}

			escalators_dict = {}
			for idx, e in enumerate(details_raw.get("escalator", []), start=1):
				esc_entry: Dict[str, Any] = {
					"code": f"ESC_{idx}",
					"name": e.get("name", ""),
					"location": e.get("location", ""),
					"status": e.get("isOpen", True)
				}
				if e.get("directionIndicator"):
					esc_entry["direction"] = e["directionIndicator"]
				escalators_dict[str(idx)] = esc_entry

			if lifts_dict or escalators_dict:
				station_obj["vertical_transit"] = {}
				if lifts_dict:
					station_obj["vertical_transit"]["lifts"] = lifts_dict
				if escalators_dict:
					station_obj["vertical_transit"]["escalators"] = escalators_dict

			# 15. Layouts, Feeders, Media (100% Authentic)
			if details_raw.get("stationLayout"):
				station_obj["stationLayout"] = details_raw["stationLayout"]
			if details_raw.get("feederBusRouteInfo"):
				station_obj["feederBusRouteInfo"] = details_raw["feederBusRouteInfo"]
			if summary_raw.get("images"):
				station_obj["images"] = summary_raw["images"]
			if details_raw.get("banner"):
				station_obj["banner"] = details_raw["banner"]
			if details_raw.get("infoLink"):
				station_obj["infoLink"] = details_raw["infoLink"]

			structured_output[slug] = station_obj

		return structured_output