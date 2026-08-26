"""
Stations Data Compact Formatter & Tab Indenter
==============================================
Location: data/format_stations_json.py

Purpose:
--------
Formats `data/stations_data.json` located in the same directory using Tab (`\t`) indentation 
and per-item single-line formatting for gates, lifts, escalators, parkings, facilities, 
and nearby places to ensure perfect readability and compact structure without any data mutation.

Usage:
------
    python data/format_stations_json.py
"""

import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

def format_stations_compact(input_path: str = None, output_path: str = None) -> None:
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if input_path is None:
        input_path = os.path.join(base_dir, "stations_data.json")
    if output_path is None:
        output_path = os.path.join(base_dir, "stations_data_new.json")

    if not os.path.exists(input_path):
        # Fallback check for alternative paths
        alt_path = os.path.join(os.path.dirname(base_dir), "import_data", "dmrc_nmrc_data", "stations_data.json")
        if os.path.exists(alt_path):
            input_path = alt_path
        else:
            raise FileNotFoundError(f"Input file not found: {input_path}")

    print(f"Loading stations dataset from: {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    def compact_format(obj, indent_level=0, parent_key=""):
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
                formatted_v = compact_format(v, indent_level + 1, k)
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
                formatted_item = compact_format(item, indent_level + 1, parent_key)
                items.append(f'{child_ind}{formatted_item}')
            return "[\n" + ",\n".join(items) + "\n" + ind + "]"

        else:
            return json.dumps(obj, ensure_ascii=False)

    print("Formatting station items with Tab indentation...")
    formatted_output = compact_format(data)

    print(f"Writing formatted stations JSON to: {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(formatted_output)

    print(f"SUCCESS: Formatted compact stations dataset saved to {output_path}")

def main():
    format_stations_compact()

if __name__ == "__main__":
    main()
