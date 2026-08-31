#!/usr/bin/env python3
"""
================================================================================
NCRTC Namo Bharat RRTS Master Structuring Script (Stage 3 Supervised)
================================================================================
Location: import_data/ncrtc_rrts_data/structure_ncrtc_stations.py
Input   : import_data/ncrtc_rrts_data/ncrtc_cleaned.json
Output  : import_data/ncrtc_rrts_data/ncrtc_master.json

Purpose:
--------
Applies developer-approved Stage 3 canonical structuring to Namo Bharat stations:
  1. Harmonizes state-aware parking matrices (Delhi vs UP tariffs).
  2. Builds canonical gate, platform, and vertical transit dictionaries.
  3. Formats first/last train schedules and station control room contacts.
  4. Preserves 100% of underlying raw payloads without data loss.
================================================================================
"""

import json
import os
import re
import sys
import time
from pathlib import Path

# UTF-8 stdout configuration for Windows & SSE logs
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

BASE_DIR = Path(__file__).resolve().parent
INPUT_FILE = BASE_DIR / "ncrtc_cleaned.json"
OUTPUT_FILE = BASE_DIR / "ncrtc_master.json"


def log(level: str, message: str):
    ts = time.strftime("%H:%M:%S")
    print(f"[{ts}] [NCRTC MASTER STRUCTURE] [{level}] {message}", flush=True)


def slugify(text: str) -> str:
    if not text:
        return "unknown"
    s = text.lower().strip()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "_", s)
    return s.strip("_")


def parse_fare_num(fare_str: str) -> int:
    if not fare_str:
        return 0
    m = re.search(r"\d+", str(fare_str))
    return int(m.group(0)) if m else 0


def parse_parking_charges_structured(raw_pc: dict, st_state_raw: str) -> dict:
    if not raw_pc or not isinstance(raw_pc, dict) or not raw_pc.get("charges"):
        return {}

    target_state = "Delhi" if "delhi" in str(st_state_raw).lower() else "Uttar Pradesh"
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

                        if "up-to 10" in p_lower or "drop off" in p_lower:
                            min_m, max_m = 0, 10
                        elif "6 hours" in p_lower or "6 hrs" in p_lower:
                            min_m, max_m = 10, 360
                        elif "12 hours" in p_lower or "12 hrs" in p_lower:
                            min_m, max_m = 360, 720
                        elif "16 hours" in p_lower or "16 hrs" in p_lower:
                            min_m, max_m = 720, 960
                        else:
                            min_m, max_m = 0, 720

                        rates[v_key]["day_charges"].append({
                            "min_minutes": min_m, "max_minutes": max_m,
                            "tag": p_text,
                            "fare": fare_val
                        })
    return rates


def generate_ncrtc_master_json(input_path: Path, output_path: Path) -> int:
    log("INIT", "==================================================================")
    log("INIT", "Starting NCRTC Namo Bharat Stage 3 Master Structuring...")
    log("INIT", f"Input File  : {input_path.name}")
    log("INIT", f"Output File : {output_path.name}")
    log("INIT", "==================================================================")

    if not input_path.exists():
        log("ERROR", f"Input file not found: {input_path}")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        raw_input = json.load(f)

    if isinstance(raw_input, dict):
        if "stations" in raw_input and isinstance(raw_input["stations"], list):
            station_items = [(slugify(st.get("name", "")), st) for st in raw_input["stations"]]
        else:
            station_items = list(raw_input.items())
    elif isinstance(raw_input, list):
        station_items = [(slugify(st.get("name", "")), st) for st in raw_input]
    else:
        station_items = []

    log("PROCESS", f"Structuring {len(station_items)} stations into canonical Stage 3 Master...")

    interchange_stations = {"sarai_kale_khan", "anand_vihar", "new_ashok_nagar", "ghaziabad", "meerut_south"}
    structured_data = {}

    for key, entity in station_items:
        slug = str(entity.get("id", key)).strip().lower()

        # Handle both nested {summary_raw, details_raw} and flat objects
        summary = entity.get("summary_raw", {}) if "summary_raw" in entity else entity
        details = entity.get("details_raw", {}) if "details_raw" in entity else entity

        st_name = summary.get("name") or entity.get("station_name") or slug.replace("_", " ").title()
        st_code = summary.get("code") or entity.get("station_code") or "STD"
        st_state = summary.get("state") or details.get("station", {}).get("state", "Uttar Pradesh, India")

        about_text = details.get("about", "")
        about_lower = about_text.lower()
        if "underground" in about_lower:
            layout_val = "underground"
        elif "at grade" in about_lower or "at-grade" in about_lower:
            layout_val = "at-grade"
        else:
            layout_val = "elevated"

        # Coordinates
        lat_val = float(summary.get("latitude", 0)) if summary.get("latitude") else None
        lng_val = float(summary.get("longitude", 0)) if summary.get("longitude") else None

        # Gates
        gates_dict = {}
        for idx, g in enumerate(details.get("gates", []), start=1):
            g_num = g.get("gateNo") or g.get("gate_no") or f"G{idx}"
            gates_dict[str(g_num)] = {
                "number": str(g_num),
                "landmark": g.get("landmark", f"Gate {g_num} Entry/Exit"),
                "accessible": g.get("isDivyangFriendly", True)
            }

        # Platforms
        platforms_dict = {}
        for p in details.get("platforms", []):
            p_num = str(p.get("platformNumber", p.get("id", "1")))
            platforms_dict[p_num] = {
                "number": int(p_num) if p_num.isdigit() else 1,
                "train_towards": p.get("trainTowards", ""),
                "doors_open": p.get("doorsOpen", "Left")
            }

        # Lifts & Escalators
        lifts_dict = {
            str(idx): {
                "name": l.get("name", f"Lift {idx}"),
                "location": l.get("location", ""),
                "status": l.get("isOpen", True)
            } for idx, l in enumerate(details.get("lift", []), start=1)
        }
        escalators_dict = {
            str(idx): {
                "name": e.get("name", f"Escalator {idx}"),
                "location": e.get("location", ""),
                "status": e.get("isOpen", True)
            } for idx, e in enumerate(details.get("escalator", []), start=1)
        }

        # Facilities
        fac_list = details.get("facilities", [])
        facilities_dict = {}
        for f_item in fac_list:
            if isinstance(f_item, dict):
                f_name = f_item.get("name", "")
                if f_name:
                    f_key = slugify(f_name)
                    facilities_dict[f_key] = {"name": f_name, "available": True}

        # Contact Room
        contact_room = details.get("stationControlRoom", {})
        if isinstance(contact_room, dict):
            contact_obj = {
                "mobile": contact_room.get("mobileNo", ""),
                "landline": contact_room.get("landlineNo", "")
            }
        else:
            contact_obj = {
                "mobile": str(contact_room) if contact_room else "",
                "landline": ""
            }

        # Timings
        train_timing = details.get("trainTiming", {})
        if isinstance(train_timing, dict):
            timings_obj = {
                "frequency_minutes": train_timing.get("frequency", "15 mins"),
                "first_train": train_timing.get("firstTrain", "06:00 AM"),
                "last_train": train_timing.get("lastTrain", "10:00 PM")
            }
        else:
            timings_obj = {
                "frequency_minutes": str(train_timing) if train_timing else "15 mins",
                "first_train": "06:00 AM",
                "last_train": "10:00 PM"
            }

        # Parking Rates
        parsed_parking_charges = parse_parking_charges_structured(details.get("parkingCharges", {}), st_state)

        # Prevent duplicate station key collision in JSON
        orig_slug = slug
        counter = 1
        while slug in structured_data and structured_data[slug].get("station_code") != st_code:
            slug = f"{orig_slug}({counter})"
            counter += 1

        structured_data[slug] = {
            "id": slug,
            "station_code": st_code,
            "station_name": st_name,
            "properties": {
                "state": st_state,
                "layout": layout_val,
                "type": "interchange" if slug in interchange_stations else "normal",
                "is_terminal": summary.get("isTerminal", False),
                "order": summary.get("order", 0)
            },
            "location": {
                "latitude": lat_val,
                "longitude": lng_val
            },
            "timings": timings_obj,
            "contact": contact_obj,
            "platforms": platforms_dict,
            "gates": gates_dict,
            "facilities": facilities_dict,
            "vertical_transit": {
                "lifts": lifts_dict,
                "escalators": escalators_dict
            },
            "parking_charges": parsed_parking_charges,
            "station_layout_urls": details.get("stationLayout", []),
            "images": summary.get("images", {}),
            "media": details.get("media", {}),
            # 100% VERBATIM PRESERVED RAW OBJECTS
            "summary_raw": summary,
            "details_raw": details
        }

def get_safe_json_path(target_file: Path) -> Path:
    if not target_file.exists():
        return target_file
    stem = target_file.stem
    ext = target_file.suffix
    clean_stem = re.sub(r"\(\d+\)$", "", stem)
    counter = 1
    while True:
        candidate = target_file.parent / f"{clean_stem}({counter}){ext}"
        if not candidate.exists():
            return candidate
        counter += 1


    # Write atomically with standard tab indentation
    final_output = get_safe_json_path(output_path)
    final_output.parent.mkdir(parents=True, exist_ok=True)
    temp_output = final_output.with_suffix(".tmp")

    with open(temp_output, "w", encoding="utf-8") as f:
        json.dump(structured_data, f, indent="\t", ensure_ascii=False)

    temp_output.replace(final_output)

    file_size_kb = final_output.stat().st_size / 1024
    line_count = sum(1 for _ in open(final_output, "r", encoding="utf-8"))

    log("SUCCESS", f"✅ NCRTC Stage 3 Master generated successfully!")
    log("SUCCESS", f"✅ Compiled {len(structured_data)} master stations.")
    log("SUCCESS", f"✅ Output written atomically to: {final_output.name}")
    log("SUCCESS", f"✅ File Stats: {file_size_kb:.1f} KB ({line_count:,} lines, {len(structured_data)} stations)")
    log("SUCCESS", "==================================================================")
    return len(structured_data)


if __name__ == "__main__":
    count = generate_ncrtc_master_json(INPUT_FILE, OUTPUT_FILE)
    sys.exit(0)
