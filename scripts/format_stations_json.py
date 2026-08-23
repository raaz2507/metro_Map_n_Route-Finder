"""
Stations Data Compact Formatter & Tab Indenter
==============================================

Purpose:
--------
Formats `import_data/New folder (3)/stations_data_new.json` using Tab (`\t`) indentation 
and per-item single-line formatting for gates, lifts, escalators, parkings, facilities, 
and nearby places to ensure perfect readability and compact structure without any data mutation.
"""

import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")


def format_stations_compact(input_path: str, output_path: str = None) -> None:
    if output_path is None:
        output_path = input_path

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")

    print(f"Loading {input_path}...")
    with open(input_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    out = ["{"]
    st_keys = list(data.keys())

    for idx, slug in enumerate(st_keys):
        st_comma = "," if idx < len(st_keys) - 1 else ""
        st_obj = data[slug]

        out.append(f'\t"{slug}": {{')

        if isinstance(st_obj, dict):
            obj_keys = list(st_obj.keys())
            for k_idx, k in enumerate(obj_keys):
                k_comma = "," if k_idx < len(obj_keys) - 1 else ""
                val = st_obj[k]

                # Single-line primitive or compact dicts
                if k in ("timings", "contact") and isinstance(val, dict):
                    compact_str = json.dumps(val, ensure_ascii=False)
                    out.append(f'\t\t"{k}": {compact_str}{k_comma}')

                elif not isinstance(val, (dict, list)):
                    val_str = json.dumps(val, ensure_ascii=False)
                    out.append(f'\t\t"{k}": {val_str}{k_comma}')

                # List objects (parkings)
                elif isinstance(val, list):
                    if not val:
                        out.append(f'\t\t"{k}": []{k_comma}')
                    else:
                        out.append(f'\t\t"{k}": [')
                        for elem_idx, elem in enumerate(val):
                            elem_comma = "," if elem_idx < len(val) - 1 else ""
                            elem_str = json.dumps(elem, ensure_ascii=False)
                            out.append(f"\t\t\t{elem_str}{elem_comma}")
                        out.append(f"\t\t]{k_comma}")

                # Nested dicts (gates, facilities, nearby_places, vertical_transit)
                elif isinstance(val, dict):
                    if not val:
                        out.append(f'\t\t"{k}": {{}}{k_comma}')
                    else:
                        out.append(f'\t\t"{k}": {{')
                        sub_keys = list(val.keys())
                        for sub_idx, sub_k in enumerate(sub_keys):
                            sub_comma = "," if sub_idx < len(sub_keys) - 1 else ""
                            sub_val = val[sub_k]

                            # Nested list inside dict (e.g. facilities["ATM"], nearby_places["Hospital"])
                            if isinstance(sub_val, list):
                                if not sub_val:
                                    out.append(f'\t\t\t"{sub_k}": []{sub_comma}')
                                else:
                                    out.append(f'\t\t\t"{sub_k}": [')
                                    for item_idx, item in enumerate(sub_val):
                                        item_comma = "," if item_idx < len(sub_val) - 1 else ""
                                        item_str = json.dumps(item, ensure_ascii=False)
                                        out.append(f"\t\t\t\t{item_str}{item_comma}")
                                    out.append(f"\t\t\t]{sub_comma}")

                            # Nested dict inside dict (e.g. vertical_transit["lifts"], gates["1"])
                            elif isinstance(sub_val, dict):
                                if not sub_val:
                                    out.append(f'\t\t\t"{sub_k}": {{}}{sub_comma}')
                                else:
                                    out.append(f'\t\t\t"{sub_k}": {{')
                                    inner_keys = list(sub_val.keys())
                                    for ik_idx, ik in enumerate(inner_keys):
                                        ik_comma = "," if ik_idx < len(inner_keys) - 1 else ""
                                        ik_val = sub_val[ik]
                                        ik_str = json.dumps(ik_val, ensure_ascii=False)
                                        out.append(f'\t\t\t\t"{ik}": {ik_str}{ik_comma}')
                                    out.append(f"\t\t\t}}{sub_comma}")

                            else:
                                sub_str = json.dumps(sub_val, ensure_ascii=False)
                                out.append(f'\t\t\t"{sub_k}": {sub_str}{sub_comma}')

                        out.append(f"\t\t}}{k_comma}")

        out.append(f"\t}}{st_comma}")

    out.append("}")

    formatted_json = "\n".join(out)

    print(f"Writing formatted compact JSON to {output_path}...")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(formatted_json)

    file_size = os.path.getsize(output_path)
    print(f"SUCCESS: Formatted {len(st_keys)} stations.")
    print(f"Compact File Size: {file_size} bytes ({round(file_size / (1024 * 1024), 2)} MB)")


if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    target_file = os.path.join(BASE_DIR, "import_data", "New folder (3)", "stations_data_new.json")
    format_stations_compact(target_file)
