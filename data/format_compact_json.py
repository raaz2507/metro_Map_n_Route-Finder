r"""
Master Data Compact JSON Formatter & Architecture Specification
==============================================================
Location: data/format_compact_json.py

Purpose:
--------
Strictly a JSON formatting & indentation utility. Reads `data/data.json` located 
in the same directory and outputs `data/data_new.json` (or updates `data/data.json`).

Critical Engineering Principles:
--------------------------------
1. ZERO KEY MUTATION: Never add, remove, or modify ANY keys in the JSON data.
2. PURE INDENTATION: Only format line breaks and indentation.

Active Compact Formatting Rules:
--------------------------------
1. fareTables Slabs: Each slab item inside weekday/holiday is placed on 1 line.
2. Product Labels: The "label" object inside products is placed on 1 line.
3. Time Rules: Each time rule item inside off_peak is placed on 1 line.
4. Line Stations Array: "stations" array inside lines is placed on 1 line.
5. Station Train Schedule: "train_schedule" object inside stationData is placed on 1 line.

Usage:
------
    python data/format_compact_json.py
"""

import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def generate_compact_json(input_path=None, output_path=None):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if input_path is None:
        input_path = os.path.join(base_dir, "data.json")
    if output_path is None:
        output_path = os.path.join(base_dir, "data_new.json")

    print(f"Loading master JSON from: {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def compact_format(obj, indent_level=0, parent_key=""):
        ind = "\t" * indent_level
        child_ind = "\t" * (indent_level + 1)

        if isinstance(obj, dict):
            if not obj:
                return "{}"
            
            # Check compact single-line rules
            if parent_key in ["label", "train_schedule"]:
                return json.dumps(obj, ensure_ascii=False)
                
            single_line = json.dumps(obj, ensure_ascii=False)
            if len(single_line) <= 120 and "\n" not in single_line:
                return single_line
                
            items = []
            for k, v in obj.items():
                formatted_v = compact_format(v, indent_level + 1, k)
                items.append(f'{child_ind}{json.dumps(k, ensure_ascii=False)}: {formatted_v}')
            return "{\n" + ",\n".join(items) + "\n" + ind + "}"

        elif isinstance(obj, list):
            if not obj:
                return "[]"
                
            if parent_key in ["stations", "off_peak", "slabs"]:
                return json.dumps(obj, ensure_ascii=False)

            single_line = json.dumps(obj, ensure_ascii=False)
            if len(single_line) <= 120 and "\n" not in single_line:
                return single_line

            items = []
            for item in obj:
                formatted_item = compact_format(item, indent_level + 1, parent_key)
                items.append(f'{child_ind}{formatted_item}')
            return "[\n" + ",\n".join(items) + "\n" + ind + "]"

        else:
            return json.dumps(obj, ensure_ascii=False)

    print("Applying compact formatting rules...")
    formatted_output = compact_format(data)

    print(f"Writing formatted JSON to: {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(formatted_output)

    print(f"SUCCESS: Formatted compact master dataset saved to {output_path}")

def main():
    generate_compact_json()

if __name__ == "__main__":
    main()
