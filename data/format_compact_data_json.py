r"""
Master Data Compact JSON Formatter & Architecture Specification
==============================================================
Location: data/format_compact_data_json.py

Purpose:
--------
Strictly a JSON formatting & indentation utility. Reads `data/cities/{city}/data.json`
and formats it into an ultra-clean, compact, production-grade JSON file.

Critical Engineering Principles:
--------------------------------
1. ZERO KEY MUTATION: Never add, remove, or modify ANY keys or data values.
2. PURE INDENTATION: Only format line breaks and indentation.

Active Compact Formatting Rules:
--------------------------------
1. fareTables Slabs: Each slab item inside weekday/holiday is placed on 1 line.
2. Product Labels: The "label" object inside products is placed on 1 line.
3. Time Rules: Each time rule item inside off_peak is placed on 1 line.
4. Line Stations Array: "stations" array inside lines is placed on 1 line.
5. Station Train Schedule: "train_schedule" object inside stationData is placed on 1 line.
6. Station Properties & Geo: "properties", "decimal", and "dms" objects are placed on 1 line.
7. Transfer Transitions: Single-edge transfer definitions are kept compact on 1 line.

Usage:
------
    python data/format_compact_data_json.py
    python data/format_compact_data_json.py delhi_ncr
"""

import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def generate_compact_json(input_path=None, output_path=None, city="delhi_ncr"):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if input_path is None:
        input_path = os.path.join(base_dir, "cities", city, "data.json")
    if output_path is None:
        output_path = input_path

    print(f"Loading master JSON from: {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def compact_format(obj, indent_level=0, parent_key="", grandparent_key=""):
        ind = "\t" * indent_level
        child_ind = "\t" * (indent_level + 1)

        if isinstance(obj, dict):
            if not obj:
                return "{}"
            
            # Compact leaf objects on a single line
            if parent_key in ["label", "train_schedule", "decimal", "dms", "properties"]:
                return json.dumps(obj, ensure_ascii=False)

            # Compact each station row inside fareMatrix on 1 single line
            if grandparent_key == "fareMatrix":
                return json.dumps(obj, ensure_ascii=False)
                
            single_line = json.dumps(obj, ensure_ascii=False)
            # Compact small transition objects (transfers edges) if <= 120 chars
            if (len(single_line) <= 120 and "\n" not in single_line and 
                parent_key not in ["stationData", "lines", "transfers", "fareRules", "defaults", "policies", "networks", "platforms"]):
                return single_line
                
            items = []
            for k, v in obj.items():
                formatted_v = compact_format(v, indent_level + 1, k, parent_key)
                items.append(f'{child_ind}{json.dumps(k, ensure_ascii=False)}: {formatted_v}')
            return "{\n" + ",\n".join(items) + "\n" + ind + "}"

        elif isinstance(obj, list):
            if not obj:
                return "[]"
                
            if parent_key in ["stations", "off_peak", "slabs"]:
                return json.dumps(obj, ensure_ascii=False)

            single_line = json.dumps(obj, ensure_ascii=False)
            if len(single_line) <= 120 and "\n" not in single_line and parent_key not in ["stationData"]:
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
    city = sys.argv[1] if len(sys.argv) > 1 else "delhi_ncr"
    generate_compact_json(city=city)

if __name__ == "__main__":
    main()