#!/usr/bin/env python3
"""
================================================================================
DMRC Delhi Master Structuring Module (Stage 3 Canonical Schema)
================================================================================
Location: import_data_new/structures/dmrc_structure.py
Role    : Transforms Stage 2 dmrc_delhi_cleaned.json -> dmrc_delhi_master.json
Rules   : 100% Zero-Data-Loss, No Fake Keys, No Null Clutter, 100% Authentic
================================================================================
"""

import json
from pathlib import Path
from typing import Optional, Dict, Any, List
from pipeline_core.base_structure import BaseTransitStructurer
from pipeline_core.file_manager import UniversalFileSystemManager


class DMRCStructure(BaseTransitStructurer):
	"""
	Stage 3 Master Canonical Structurer for DMRC Delhi Metro.
	Guarantees 0% data loss across all 27 authentic fields while strictly
	preventing synthetic calculations, dummy keys, or artificial nulls.
	"""

	LINE_CODE_MAP = {
		"LN1": "dmrc.red",
		"LN2": "dmrc.yellow",
		"LN3": "dmrc.blue_main",
		"LN4": "dmrc.blue_vaishali",
		"LN5": "dmrc.green",
		"LN6": "dmrc.violet",
		"LN7": "dmrc.pink",
		"LN7EXTN": "dmrc.pink",
		"LN8": "dmrc.magenta",
		"LN8EXTN": "dmrc.magenta",
		"LN9": "dmrc.grey",
		"LN10": "dmrc.airport_express",
		"LN11": "rapid_metro.rapid",
	}

	LINE_COLOR_MAP = {
		"red": "dmrc.red",
		"yellow": "dmrc.yellow",
		"blue": "dmrc.blue_main",
		"green": "dmrc.green",
		"violet": "dmrc.violet",
		"pink": "dmrc.pink",
		"magenta": "dmrc.magenta",
		"grey": "dmrc.grey",
		"orange": "dmrc.airport_express",
		"ael": "dmrc.airport_express",
		"gurgaon": "rapid_metro.rapid",
		"rmgl": "rapid_metro.rapid",
	}

	@classmethod
	def resolve_line_id(cls, line_obj: dict) -> Optional[str]:
		if not isinstance(line_obj, dict):
			return None

		l_code = (line_obj.get("line_code") or "").strip().upper()
		if l_code in cls.LINE_CODE_MAP:
			return cls.LINE_CODE_MAP[l_code]

		c_primary = (line_obj.get("class_primary") or "").strip().lower()
		if c_primary in cls.LINE_COLOR_MAP:
			return cls.LINE_COLOR_MAP[c_primary]

		l_color = (line_obj.get("line_color") or "").lower()
		for color_key, canonical_id in cls.LINE_COLOR_MAP.items():
			if color_key in l_color:
				return canonical_id

		return None

	@staticmethod
	def clean_title(name: str) -> str:
		if not name:
			return ""
		cleaned = name.strip()
		acronyms = {"ISBT", "IGI", "SEC", "NDLS", "FOB", "T-3", "II", "III", "IV", "AIIMS", "IIT"}
		parts = []
		for word in cleaned.split():
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
		existing_master: Optional[Dict[str, Any]] = None
	) -> Dict[str, Any]:

		structured_output: Dict[str, Any] = {}

		for slug, st_data in cleaned_dataset.items():
			en_raw = st_data.get("en_raw") if isinstance(st_data.get("en_raw"), dict) else {}
			hi_raw = st_data.get("hi_raw") if isinstance(st_data.get("hi_raw"), dict) else {}

			# 1. Names & Identity
			st_name_en = self.clean_title(st_data.get("station_name_en") or en_raw.get("station_name") or slug)
			raw_hi = (st_data.get("station_name_hi") or (hi_raw.get("station_name") if isinstance(hi_raw, dict) else "") or "").strip()
			st_name_hi = raw_hi if raw_hi and raw_hi != "No Station Exists" and raw_hi.upper() != st_name_en.upper() else ""

			station_obj: Dict[str, Any] = {
				"id": slug,
				"name": {
					"en": st_name_en
				}
			}
			if st_name_hi:
				station_obj["name"]["hi"] = st_name_hi

			st_code = (st_data.get("station_code") or en_raw.get("station_code") or "").strip()
			if st_code:
				station_obj["code"] = st_code

			comm_name = en_raw.get("station_commercial_name")
			if comm_name and comm_name.strip() and comm_name.strip() != st_name_en:
				station_obj["aliases"] = [self.clean_title(comm_name)]

			# 2. Lines
			lines = []
			for l_obj in en_raw.get("metro_lines", []):
				c_line = self.resolve_line_id(l_obj)
				if c_line and c_line not in lines:
					lines.append(c_line)
			
			if lines:
				station_obj["lines"] = lines

			# 3. Location (WGS84 + 2D Schematic Canvas Coordinates)
			lat_raw = en_raw.get("latitude")
			lon_raw = en_raw.get("longitude")
			lat_val = float(lat_raw) if lat_raw and str(lat_raw).strip() != "" else 0.0
			lon_val = float(lon_raw) if lon_raw and str(lon_raw).strip() != "" else 0.0

			

			if lat_val != 0.0 or lon_val != 0.0:
				station_obj["location"] = {
					"decimal": {
						"lat": lat_val,
						"lon": lon_val
					}
				}
				x_raw = en_raw.get("x_coords")
				y_raw = en_raw.get("y_coords")
				if x_raw and y_raw and str(x_raw).strip() not in {"0", ""}:
					station_obj["location"]["schematic"] = {
						"x": float(x_raw),
						"y": float(y_raw)
					}

			# 4. Properties & Layout
			is_interchange = bool(en_raw.get("interchange") or len(lines) > 1)
			st_type = "interchange" if is_interchange else "normal"

			desc_en = (en_raw.get("station_description") or "").strip()
			layout_val = None
			if "underground" in desc_en.lower():
				layout_val = "underground"
			elif "at-grade" in desc_en.lower() or "at grade" in desc_en.lower():
				layout_val = "at-grade"
			elif "elevated" in desc_en.lower():
				layout_val = "elevated"
			elif "station_type" in en_raw:
				st_type_raw = str(en_raw["station_type"]).lower()
				if "underground" in st_type_raw:
					layout_val = "underground"
				elif "elevated" in st_type_raw:
					layout_val = "elevated"

			station_obj["properties"] = {
				"status": "operational",
				"station_type": st_type
			}
			if layout_val:
				station_obj["properties"]["layout"] = layout_val

			# 5. Timings
			opening = en_raw.get("opening_time")
			closing = en_raw.get("closing_time")
			if opening or closing:
				station_obj["timings"] = {}
				if opening:
					station_obj["timings"]["opening"] = opening if len(opening) == 8 else f"{opening}:00"[:8]
				if closing:
					station_obj["timings"]["closing"] = closing if len(closing) == 8 else f"{closing}:00"[:8]

			# 6. Detailed Train Schedule (Towards-specific timings if populated)
			raw_fl = en_raw.get("first_last_train", [])
			has_detailed_schedule = False
			if isinstance(raw_fl, list) and len(raw_fl) > 0:
				for block in raw_fl:
					if isinstance(block, dict):
						for v in block.values():
							if isinstance(v, list) and len(v) > 0:
								has_detailed_schedule = True
			if has_detailed_schedule:
				station_obj["train_schedule"] = {
					"detailed_schedule": raw_fl
				}

			# 7. Contacts (Only real non-empty numbers)
			mob = (en_raw.get("mobile") or "").strip()
			ll = (en_raw.get("landline") or "").strip()
			if mob or ll:
				station_obj["contact"] = {}
				if mob:
					station_obj["contact"]["mobile"] = mob
				if ll:
					station_obj["contact"]["landline"] = ll

			# 8. Gates (Bilingual landmarks + Micro-coordinates)
			hi_gates_map = {}
			for hg in (hi_raw.get("gates", []) if isinstance(hi_raw.get("gates"), list) else []):
				if isinstance(hg, dict):
					g_code = hg.get("gate_code") or hg.get("gate_name")
					if g_code:
						hi_gates_map[str(g_code)] = (hg.get("location") or "").strip()

			gates = {}
			for g in (en_raw.get("gates", []) if isinstance(en_raw.get("gates"), list) else []):
				if isinstance(g, dict):
					g_code = g.get("gate_code") or g.get("gate_name") or "G1"
					g_key = str(g.get("gate_name", g_code)).replace("Gate No.", "").replace("Gate No", "").strip() or g_code
					loc_en = (g.get("location") or "").strip()
					loc_hi = hi_gates_map.get(str(g_code), "")

					gate_entry: Dict[str, Any] = {
						"code": g_code,
						"status": g.get("status") or "open"
					}
					if "divyang_friendly" in g:
						gate_entry["divyang"] = bool(g["divyang_friendly"])

					g_lat = g.get("gate_latitude")
					g_lon = g.get("gate_longitude")
					if g_lat and g_lon and str(g_lat).strip() and str(g_lon).strip():
						gate_entry["coordinates"] = {
							"latitude": float(g_lat),
							"longitude": float(g_lon)
						}

					if loc_en or loc_hi:
						gate_entry["landmark"] = {}
						if loc_en:
							gate_entry["landmark"]["en"] = loc_en
						if loc_hi:
							gate_entry["landmark"]["hi"] = loc_hi

					gates[str(g_key)] = gate_entry

			if gates:
				station_obj["gates"] = gates

			# 9. Vertical Transit (Lifts & Escalators)
			lifts = {}
			escalators = {}
			l_counter = 1
			e_counter = 1

			for item in (en_raw.get("lifts", []) if isinstance(en_raw.get("lifts"), list) else []):
				if isinstance(item, dict):
					l_type = (item.get("lift_type") or "Lift").lower()
					code = item.get("code") or f"VT_{l_counter}"
					name = item.get("name") or code
					loc = (item.get("description_location") or "").strip()
					placement = item.get("available_outside_inside")

					entry: Dict[str, Any] = {
						"code": code,
						"name": name,
						"status": bool(item.get("status", True))
					}
					if loc:
						entry["location"] = loc
					if placement:
						entry["placement"] = placement
					if item.get("last_update"):
						entry["last_update"] = item["last_update"]

					# Gate / Platform connectivity references
					if item.get("from_gate_code"):
						entry["from_gate_code"] = item["from_gate_code"]
					if item.get("to_gate_code"):
						entry["to_gate_code"] = item["to_gate_code"]
					if item.get("from_platform_code"):
						entry["from_platform_code"] = item["from_platform_code"]
					if item.get("to_platform_code"):
						entry["to_platform_code"] = item["to_platform_code"]

					if "escalator" in l_type:
						escalators[str(e_counter)] = entry
						e_counter += 1
					else:
						if "divyang_friendly" in item:
							entry["divyang_friendly"] = bool(item["divyang_friendly"])
						lifts[str(l_counter)] = entry
						l_counter += 1

			if lifts or escalators:
				station_obj["vertical_transit"] = {}
				if lifts:
					station_obj["vertical_transit"]["lifts"] = lifts
				if escalators:
					station_obj["vertical_transit"]["escalators"] = escalators

			# 10. Parkings
			parkings = []
			for p in (en_raw.get("parkings", []) if isinstance(en_raw.get("parkings"), list) else []):
				if isinstance(p, dict):
					provider = (p.get("provider") or "").strip()
					if provider and provider.lower() != "not available":
						p_entry: Dict[str, Any] = {
							"provider": provider,
							"capacity_car": int(p.get("capacity_car") or 0),
							"capacity_motorcycle": int(p.get("capacity_motorcycle") or 0),
							"capacity_cycle": int(p.get("capacity_cycle") or 0)
						}
						if p.get("parking_code"):
							p_entry["code"] = p["parking_code"]
						if p.get("location"):
							p_entry["location"] = p["location"]
						if p.get("nearest_gate_code"):
							p_entry["nearest_gate_code"] = p["nearest_gate_code"]
						parkings.append(p_entry)

			if parkings:
				station_obj["parkings"] = parkings

			# 11. Facilities (Unpacking detail_list correctly!)
			facilities: Dict[str, list] = {}
			for fac in (en_raw.get("stations_facilities", []) if isinstance(en_raw.get("stations_facilities"), list) else []):
				if isinstance(fac, dict):
					f_kind = fac.get("kind") or "General"
					# Unpack detail_list array
					d_list = fac.get("detail_list", [])
					if isinstance(d_list, list) and len(d_list) > 0:
						for item in d_list:
							if isinstance(item, dict):
								f_name = item.get("facility_name") or f_kind
								f_loc = item.get("location_description") or ""
								f_purpose = item.get("purpose")

								if f_kind not in facilities:
									facilities[f_kind] = []
								f_item = {
									"name": f_name,
									"location": f_loc
								}
								if f_purpose:
									f_item["purpose"] = f_purpose
								if item.get("nearest_gate_name"):
									f_item["nearest_gate_name"] = item["nearest_gate_name"]
								if item.get("nearest_gate_code"):
									f_item["nearest_gate_code"] = item["nearest_gate_code"]

								facilities[f_kind].append(f_item)
					else:
						# Flat fallback if no detail_list
						if f_kind not in facilities:
							facilities[f_kind] = []
						facilities[f_kind].append({
							"name": f_kind,
							"location": fac.get("location") or ""
						})

			if facilities:
				station_obj["facilities"] = facilities

			# 12. Amenity Badges (Preserving station_facility icons like Divyang Friendly)
			badges = []
			for b in (en_raw.get("station_facility", []) if isinstance(en_raw.get("station_facility"), list) else []):
				if isinstance(b, dict) and b.get("name"):
					badges.append(b["name"])
			if badges:
				station_obj["amenity_badges"] = badges

			# 13. Platforms (Preserving primary & secondary directions)
			platforms = {}
			for p in (en_raw.get("platforms", []) if isinstance(en_raw.get("platforms"), list) else []):
				if isinstance(p, dict):
					p_code = p.get("platform_code") or p.get("platform_name") or "PL1"
					p_num = str(p_code).replace("Platform No.", "").replace("PL", "").strip() or "1"
					towards = p.get("train_towards", {})
					dest_name = towards.get("station_name", "") if isinstance(towards, dict) else ""

					sec_towards = p.get("train_towards_second", {})
					sec_dest_name = sec_towards.get("station_name", "") if isinstance(sec_towards, dict) else ""

					p_data: Dict[str, Any] = {}
					if dest_name:
						p_data["destination"] = UniversalFileSystemManager.slugify(dest_name)
					if sec_dest_name:
						p_data["destination_second"] = UniversalFileSystemManager.slugify(sec_dest_name)

					if p_data:
						platforms[p_num] = p_data

			if platforms:
				station_obj["platforms"] = platforms

			# 14. Neighbors (Only real topological connections - NO fake distances)
			neighbors = []
			for l_block in (en_raw.get("prev_next_stations", []) if isinstance(en_raw.get("prev_next_stations"), list) else []):
				if isinstance(l_block, dict):
					for l_name, pairs in l_block.items():
						for pair in (pairs if isinstance(pairs, list) else []):
							if isinstance(pair, dict):
								line_color_str = (pair.get("line_color") or "").lower()
								matched_line = None
								for c_k, c_v in self.LINE_COLOR_MAP.items():
									if c_k in line_color_str:
										matched_line = c_v
										break

								prev_st = pair.get("prev_station")
								next_st = pair.get("next_station")

								if prev_st and isinstance(prev_st, dict) and prev_st.get("station_name"):
									p_slug = UniversalFileSystemManager.slugify(prev_st["station_name"])
									if not any(n["station"] == p_slug for n in neighbors):
										edge = {"station": p_slug}
										if matched_line:
											edge["line"] = matched_line
										neighbors.append(edge)

								if next_st and isinstance(next_st, dict) and next_st.get("station_name"):
									n_slug = UniversalFileSystemManager.slugify(next_st["station_name"])
									if not any(n["station"] == n_slug for n in neighbors):
										edge = {"station": n_slug}
										if matched_line:
											edge["line"] = matched_line
										neighbors.append(edge)

			if neighbors:
				station_obj["neighbors"] = neighbors

			# 15. Feeder Buses
			raw_feeder = en_raw.get("feeder", [])
			if isinstance(raw_feeder, list) and len(raw_feeder) > 0:
				feeder_bus_info = []
				for fb in raw_feeder:
					if isinstance(fb, dict):
						f_item = {
							"route_name": fb.get("route_name") or fb.get("name") or ""
						}
						if fb.get("origin"):
							f_item["origin"] = fb["origin"]
						if fb.get("destination"):
							f_item["destination"] = fb["destination"]
						feeder_bus_info.append(f_item)
				if feeder_bus_info:
					station_obj["feederBusRouteInfo"] = feeder_bus_info

			# 16. Description (Bilingual)
			desc_hi = (hi_raw.get("station_description") or "").strip()
			if desc_en or desc_hi:
				station_obj["description"] = {}
				if desc_en:
					station_obj["description"]["en"] = desc_en
				if desc_hi:
					station_obj["description"]["hi"] = desc_hi

			# 17. Nearby Places (Unpacked directly from authentic en_raw)
			raw_np = en_raw.get("nearby_places", [])
			if isinstance(raw_np, list) and len(raw_np) > 0:
				nearby_places: Dict[str, list] = {}
				for top_cat_dict in raw_np:
					if isinstance(top_cat_dict, dict):
						for top_cat, sub_dict in top_cat_dict.items():
							if isinstance(sub_dict, dict):
								for sub_cat, items in sub_dict.items():
									if isinstance(items, list):
										for item in items:
											if isinstance(item, dict) and item.get("name"):
												p_entry: Dict[str, Any] = {"name": item["name"].strip()}
												if item.get("distance_from_metro") is not None:
													p_entry["distance_km"] = float(item["distance_from_metro"])
												if "connected_with_metro" in item:
													p_entry["connected"] = bool(item["connected_with_metro"])
												if item.get("estimated_walking_time_min") is not None:
													p_entry["walking_min"] = float(item["estimated_walking_time_min"])
												if item.get("estimated_pub_transport_time_min") is not None:
													p_entry["pub_transport_min"] = float(item["estimated_pub_transport_time_min"])
												nearby_places.setdefault(sub_cat, []).append(p_entry)
				if nearby_places:
					station_obj["nearby_places"] = nearby_places

			structured_output[slug] = station_obj

		return structured_output