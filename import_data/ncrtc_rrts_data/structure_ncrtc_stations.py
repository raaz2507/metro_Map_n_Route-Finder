"""
NCRTC RRTS Station Dataset Structuring Script
=============================================
Location: import_data/ncrtc_rrts_data/structure_ncrtc_stations.py

Reads raw cleaned NCRTC data (ncrtc_all_stations_scraped_cleaned.json)
and detail metadata (detail_data.json) from the same directory, applies all DMRC-aligned
zero-loss transformation and deduplication rules, and generates the structured dataset
(ncrtc_all_stations_structured_new.json).

Usage:
    python import_data/ncrtc_rrts_data/structure_ncrtc_stations.py
"""

import json
import os
import re

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '_', text)
    return text

def parse_fare_num(fare_str):
    if not fare_str:
        return 0
    m = re.search(r'\d+', fare_str)
    return int(m.group(0)) if m else 0

def parse_parking_charges_structured(raw_pc, st_state_raw):
    if not raw_pc or not isinstance(raw_pc, dict) or not raw_pc.get("charges"):
        return {}
        
    target_state = "Delhi" if "delhi" in st_state_raw.lower() else "Uttar Pradesh"
    rates = {}
    
    for item_obj in raw_pc.get("charges", []):
        v_type = item_obj.get("item", "")
        v_key = "four_wheeler" if "four" in v_type.lower() or "cars" in v_type.lower() else \
                "two_wheeler" if "two" in v_type.lower() else \
                "helmet" if "helmet" in v_type.lower() else \
                "bicycle" if "bicycle" in v_type.lower() else "other"
                
        for cy in item_obj.get("cycles", []):
            cy_name = cy.get("cycle", "").lower()
            
            for p in cy.get("periods", []):
                p_text = p.get("period", "")
                p_lower = p_text.lower()
                
                # Extract state-specific fare
                fare_val = 0
                for st_f in p.get("states", []):
                    if st_f.get("state", "").lower() == target_state.lower():
                        fare_val = parse_fare_num(st_f.get("fare"))
                        break
                if fare_val == 0 and p.get("states"):
                    fare_val = parse_fare_num(p["states"][0].get("fare"))
                    
                if "helmet" in v_key:
                    if "helmet" not in rates:
                        rates["helmet"] = []
                    if "beyond 12" in p_lower:
                        rates["helmet"].append({
                            "min_minutes": 720, "max_minutes": 1440,
                            "tag": "12 to 24 Hours",
                            "fare": fare_val
                        })
                    else:
                        rates["helmet"].append({
                            "min_minutes": 0, "max_minutes": 720,
                            "tag": "Up to 12 Hours",
                            "fare": fare_val
                        })
                else:
                    if v_key not in rates:
                        rates[v_key] = {}
                    
                    if "night" in cy_name or "night" in p_lower:
                        if "night_charges" not in rates[v_key]:
                            rates[v_key]["night_charges"] = []
                        rates[v_key]["night_charges"].append({
                            "min_minutes": 0, "max_minutes": 300,
                            "tag": "Night Parking (00:00 - 05:00)",
                            "fare": fare_val
                        })
                    elif "monthly" in cy_name or "monthly" in p_lower:
                        if "monthly_passes" not in rates[v_key]:
                            rates[v_key]["monthly_passes"] = {}
                        t_type = "tariff_b" if "tariff b" in p_lower or "24/7" in p_lower else "tariff_a"
                        t_lbl = "24/7" if t_type == "tariff_b" else "05:00 - 23:00"
                        rates[v_key]["monthly_passes"][t_type] = {
                            "timing": t_lbl,
                            "fare": fare_val
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
                            item_dict = {"min_minutes": 960, "max_minutes": "OPERATIONAL_CLOSE", "tag": "Station Operations", "fare": fare_val}
                        else:
                            item_dict = {"min_minutes": 0, "max_minutes": 10, "tag": "Pick-up / Drop Off", "fare": fare_val}
                            
                        rates[v_key]["day_charges"].append(item_dict)
                        
    return {
        "state": target_state,
        "currency": "INR",
        "symbol": "₹",
        "rates": rates
    }

def smart_inline_format(obj, indent_level=0):
    ind = "\t" * indent_level
    child_ind = "\t" * (indent_level + 1)
    if isinstance(obj, dict):
        if not obj:
            return "{}"
        single_line = json.dumps(obj, ensure_ascii=False)
        if len(single_line) <= 120 and "\n" not in single_line:
            return single_line
        items = []
        for k, v in obj.items():
            formatted_v = smart_inline_format(v, indent_level + 1)
            items.append(f'{child_ind}{json.dumps(k, ensure_ascii=False)}: {formatted_v}')
        return "{\n" + ",\n".join(items) + "\n" + ind + "}"
    elif isinstance(obj, list):
        if not obj:
            return "[]"
        single_line = json.dumps(obj, ensure_ascii=False)
        if len(single_line) <= 120 and "\n" not in single_line:
            return single_line
        items = []
        for item in obj:
            formatted_item = smart_inline_format(item, indent_level + 1)
            items.append(f'{child_ind}{formatted_item}')
        return "[\n" + ",\n".join(items) + "\n" + ind + "]"
    else:
        return json.dumps(obj, ensure_ascii=False)

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    input_path = os.path.join(base_dir, "ncrtc_all_stations_scraped_cleaned.json")
    detail_path = os.path.join(base_dir, "detail_data.json")
    output_path = os.path.join(base_dir, "ncrtc_all_stations_structured_new.json")

    print(f"Reading input file: {input_path}")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    hindi_names = {}
    if os.path.exists(detail_path):
        print(f"Reading detail data for Hindi names: {detail_path}")
        with open(detail_path, "r", encoding="utf-8") as f:
            det_data = json.load(f)
            for s_id, s_obj in det_data.get("stationData", {}).items():
                name_hi = s_obj.get("name", {}).get("hi", "")
                if name_hi:
                    hindi_names[s_id] = name_hi

    interchange_stations = {"sarai_kale_khan", "anand_vihar", "new_ashok_nagar", "ghaziabad", "meerut_south"}

    structured_data = {}

    for st in data.get("stations", []):
        st_name = st.get("name", "")
        slug = slugify(st_name)
        st_id = slug
        
        st_state_raw = st.get("state", "")
        about_text = st.get("about", "")
        about_lower = about_text.lower()
        
        if "underground" in about_lower:
            layout_val = "underground"
        elif "at grade" in about_lower or "at-grade" in about_lower:
            layout_val = "at-grade"
        else:
            layout_val = "elevated"
            
        st_type_val = "interchange" if slug in interchange_stations else "normal"
        
        name_object = {
            "en": st_name,
            "hi": hindi_names.get(slug, "")
        }

        lat_val = float(st.get("latitude", 0)) if st.get("latitude") else 0.0
        lon_val = float(st.get("longitude", 0)) if st.get("longitude") else 0.0
        location = {
            "decimal": {
                "lat": lat_val,
                "lon": lon_val
            }
        }
        
        properties = {
            "layout": layout_val,
            "station_type": st_type_val,
            "status": "operational",
            "is_terminal": st.get("isTerminal", False),
            "order": st.get("order", 0),
            "state": st_state_raw
        }
        
        timings = {"opening": "06:00:00", "closing": "22:00:00"}
        for tt in st.get("trainTiming", []):
            direction = tt.get("direction", "").lower()
            t_val = tt.get("time", "")
            if "first" in direction and t_val:
                timings["opening"] = f"{t_val}:00" if len(t_val) == 5 else t_val
            elif "last" in direction and t_val:
                timings["closing"] = f"{t_val}:00" if len(t_val) == 5 else t_val

        control_room = st.get("stationControlRoom", "")
        contact = {"mobile": control_room if control_room else "", "landline": ""}
        
        neighbors = []
        left_st = st.get("leftStation", {})
        left_info = st.get("leftJourneyInfo", {})
        if left_st and left_st.get("name"):
            dist_val = int(left_info.get("distance", {}).get("value", 0)) if left_info.get("distance", {}).get("value") else 0
            time_val = int(left_info.get("time", {}).get("value", 0)) if left_info.get("time", {}).get("value") else 0
            neighbors.append({
                "station": slugify(left_st.get("name", "")),
                "line": "ncrtc.namo_bharat",
                "distance_m": dist_val,
                "travel_time_sec": time_val
            })
            
        right_st = st.get("rightStation", {})
        right_info = st.get("rightJourneyInfo", {})
        if right_st and right_st.get("name"):
            dist_val = int(right_info.get("distance", {}).get("value", 0)) if right_info.get("distance", {}).get("value") else 0
            time_val = int(right_info.get("time", {}).get("value", 0)) if right_info.get("time", {}).get("value") else 0
            neighbors.append({
                "station": slugify(right_st.get("name", "")),
                "line": "ncrtc.namo_bharat",
                "distance_m": dist_val,
                "travel_time_sec": time_val
            })

        platforms_dict = {
            str(p.get("number", p.get("id", ""))): {
                "number": p.get("number"),
                "is_open": p.get("isOpen", True),
                "lounge": p.get("isPremiumLoungeAvailable", False)
            } for p in st.get("platforms", [])
        }

        # Cleaned Gates Object (DMRC landmark aligned, duplicate location string removed)
        gates_dict = {
            str(g.get("number", g.get("id", ""))): {
                "code": "GA" + str(g.get("number", g.get("id", ""))),
                "divyang": g.get("hasSpecialAid", st.get("isDivyangFriendly", False)),
                "status": "open" if g.get("isOpen", True) else "closed",
                "landmark": {"en": g.get("location", ""), "hi": ""}
            } for g in st.get("gates", [])
        }
            
        has_parking = st.get("hasParking", False)
        parkings_list = []
        if has_parking or st.get("parkingCharges", {}).get("charges"):
            parkings_list.append({
                "provider": "NCRTC Authorised Parking",
                "capacity_car": 0, "capacity_motorcycle": 0, "capacity_cycle": 0,
                "code": "PA1",
                "location": "Station Premises"
            })
            
        # Cleaned Facilities Object (Stripped redundant name key)
        facilities_dict = {}
        for fac in st.get("facilities", []):
            f_name = fac.get("name", "General")
            if f_name not in facilities_dict:
                facilities_dict[f_name] = []
            facilities_dict[f_name].append({
                "location": fac.get("location", "")
            })
            
        lifts_dict = {
            str(idx): {
                "code": f"LIFT_{idx}",
                "name": l.get("name", ""),
                "location": l.get("location", ""),
                "divyang_friendly": l.get("isStretcherLiftAvailable", True),
                "status": l.get("isOpen", True)
            } for idx, l in enumerate(st.get("lift", []), start=1)
        }
            
        escalators_dict = {
            str(idx): {
                "code": f"ESC_{idx}",
                "name": e.get("name", ""),
                "location": e.get("location", ""),
                "direction": e.get("directionIndicator", ""),
                "status": e.get("isOpen", True)
            } for idx, e in enumerate(st.get("escalator", []), start=1)
        }

        # Cleaned stationLayout (Stripped duplicate displayName key)
        cleaned_layout = []
        for l_item in st.get("stationLayout", []):
            if isinstance(l_item, dict):
                cleaned_item = {
                    "layout": l_item.get("layout", {}),
                    "level": l_item.get("level", ""),
                    "id": l_item.get("id")
                }
                cleaned_layout.append(cleaned_item)

        # Cleaned feederBusRouteInfo (Direct flat objects)
        cleaned_feeder_bus = []
        for fb_item in st.get("feederBusRouteInfo", []):
            if isinstance(fb_item, dict):
                r_obj = {"route_name": fb_item.get("routeName", fb_item.get("route_name", ""))}
                for kv in fb_item.get("infoList", []):
                    k = kv.get("key", "").lower().replace(" ", "_").replace(".", "")
                    v = kv.get("value", "")
                    if k:
                        r_obj[k] = v
                cleaned_feeder_bus.append(r_obj)

        parsed_parking_charges = parse_parking_charges_structured(st.get("parkingCharges", {}), st_state_raw)

        structured_data[slug] = {
            "id": st_id,
            "name": name_object,
            "code": st.get("code", ""),
            "location": location,
            "properties": properties,
            "timings": timings,
            "description": about_text,
            "contact": contact,
            "neighbors": neighbors,
            "platforms": platforms_dict,
            "gates": gates_dict,
            "parkings": parkings_list,
            "parkingCharges": parsed_parking_charges,
            "facilities": facilities_dict,
            "vertical_transit": {"lifts": lifts_dict, "escalators": escalators_dict},
            "nearby_places": [],
            "stationLayout": cleaned_layout,
            "images": st.get("images", {}),
            "banner": st.get("banner", {}),
            "media": st.get("media", {}),
            "infoLink": st.get("infoLink", ""),
            "feederBusRouteInfo": cleaned_feeder_bus
        }

    formatted_json = smart_inline_format(structured_data)

    print(f"Saving output file: {output_path}")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(formatted_json)

    lines_count = len(formatted_json.splitlines())
    print(f"SUCCESS: Generated {output_path} ({lines_count} lines) successfully!")

if __name__ == "__main__":
    main()
