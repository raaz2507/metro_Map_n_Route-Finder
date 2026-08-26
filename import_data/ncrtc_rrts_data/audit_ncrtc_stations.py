"""
NCRTC RRTS Network Automated Audit & Diff Engine
=================================================
Location: import_data/ncrtc_rrts_data/audit_ncrtc_stations.py

Purpose:
--------
Automated audit & diff engine for Namo Bharat (NCRTC RRTS) network.
1. Compares newly structured station data against production dataset (ncrtc_all_stations_structured.json).
2. Detects newly added stations and attribute modifications.
3. Saves newly detected stations into staging file (ncrtc_all_new_stations.json).
4. Generates audit summary (audit_diff_summary.json) and updates central master manifest (import_data/master_audit_manifest.json).

Usage:
------
    python import_data/ncrtc_rrts_data/audit_ncrtc_stations.py
"""

import json
import os
import subprocess
import sys
from datetime import datetime

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

def run_audit():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(base_dir))
    
    prod_path = os.path.join(base_dir, "ncrtc_all_stations_structured.json")
    new_struct_path = os.path.join(base_dir, "ncrtc_all_stations_structured_new.json")
    staging_out_path = os.path.join(base_dir, "ncrtc_all_new_stations.json")
    diff_summary_path = os.path.join(base_dir, "audit_diff_summary.json")
    master_manifest_path = os.path.join(project_root, "import_data", "master_audit_manifest.json")

    # Load production dataset if exists
    prod_data = {}
    if os.path.exists(prod_path):
        print(f"Loading production dataset: {prod_path}")
        with open(prod_path, "r", encoding="utf-8") as f:
            prod_data = json.load(f)

    # Trigger structuring script to generate new_struct_path if missing or for fresh audit
    struct_script = os.path.join(base_dir, "structure_ncrtc_stations.py")
    if os.path.exists(struct_script):
        print(f"Executing structuring script: {struct_script}...")
        subprocess.run([sys.executable, struct_script], check=True)

    if not os.path.exists(new_struct_path):
        print(f"ERROR: Target structured file not found: {new_struct_path}")
        return

    print(f"Loading fresh structured dataset: {new_struct_path}")
    with open(new_struct_path, "r", encoding="utf-8") as f:
        new_data = json.load(f)

    prod_station_keys = set(prod_data.keys())
    new_station_keys = set(new_data.keys())

    # Detect Newly Added Stations
    added_keys = sorted(list(new_station_keys - prod_station_keys))
    
    # Detect Modified Stations
    modified_keys = []
    diff_details = {}

    for s_key in (new_station_keys & prod_station_keys):
        prod_st = prod_data[s_key]
        new_st = new_data[s_key]
        if json.dumps(prod_st, sort_keys=True) != json.dumps(new_st, sort_keys=True):
            modified_keys.append(s_key)
            diff_details[s_key] = {
                "name": new_st.get("name", {}).get("en", s_key),
                "status": "modified"
            }

    new_stations_payload = {}
    for s_key in added_keys:
        new_stations_payload[s_key] = new_data[s_key]
        diff_details[s_key] = {
            "name": new_data[s_key].get("name", {}).get("en", s_key),
            "status": "new_station_detected"
        }

    timestamp = datetime.now().isoformat()

    summary_payload = {
        "network_id": "ncrtc_rrts",
        "network_name": "Namo Bharat (NCRTC RRTS)",
        "audit_timestamp": timestamp,
        "total_scraped_stations": len(new_data),
        "total_production_stations": len(prod_data),
        "new_stations_count": len(added_keys),
        "modified_stations_count": len(modified_keys),
        "new_station_keys": added_keys,
        "modified_station_keys": modified_keys,
        "diff_details": diff_details
    }

    # Save staging new stations payload
    print(f"Saving new stations staging payload: {staging_out_path}")
    formatted_staging = smart_inline_format(new_stations_payload)
    with open(staging_out_path, "w", encoding="utf-8") as f:
        f.write(formatted_staging)

    # Save summary report
    print(f"Saving audit summary: {diff_summary_path}")
    with open(diff_summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_payload, f, indent=2, ensure_ascii=False)

    # Update Master Audit Manifest
    if os.path.exists(master_manifest_path):
        print(f"Updating master manifest: {master_manifest_path}")
        with open(master_manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        
        manifest["last_audit_timestamp"] = timestamp
        if "networks" in manifest and "ncrtc_rrts" in manifest["networks"]:
            ncrtc_entry = manifest["networks"]["ncrtc_rrts"]
            ncrtc_entry["total_stations"] = len(new_data)
            ncrtc_entry["new_stations_count"] = len(added_keys)
            ncrtc_entry["modified_stations_count"] = len(modified_keys)
            ncrtc_entry["status"] = "new_data_available" if (added_keys or modified_keys) else "up_to_date"
            
        with open(master_manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent="\t", ensure_ascii=False)

    print("\n" + "="*60)
    print("  NCRTC AUDIT COMPLETED SUCCESSFULLY!")
    print(f"  - Scraped Stations: {len(new_data)}")
    print(f"  - Production Stations: {len(prod_data)}")
    print(f"  - New Stations Detected: {len(added_keys)}")
    print(f"  - Modified Stations Detected: {len(modified_keys)}")
    print("="*60)

if __name__ == "__main__":
    run_audit()
