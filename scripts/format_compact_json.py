r"""
===============================================================================
FORMAT COMPACT JSON FORMATTER & ARCHITECTURE SPECIFICATION
===============================================================================

PURPOSE:
--------
This script (`scripts/format_compact_json.py`) is STRICTLY a JSON formatting & 
indentation utility. It reads `data/data.json` and outputs `data/data_new.json`.

CRITICAL PRINCIPLES:
--------------------
1. ZERO KEY MUTATION: Never add, remove, or modify ANY keys in the JSON data.
2. PURE INDENTATION: Only format line breaks and indentation.

ACTIVE COMPACT FORMATTING RULES:
--------------------------------
1. fareTables Slabs: Each slab item inside weekday/holiday is placed on 1 line.
2. Product Labels: The "label" object inside products is placed on 1 line.
3. Time Rules: Each time rule item inside off_peak is placed on 1 line.
4. Line Stations Array: "stations" array inside lines is placed on 1 line.
5. Station Train Schedule: "train_schedule" object inside stationData is placed on 1 line.

HOW TO MODIFY RULES IN FUTURE:
------------------------------
- To add a compact rule for key 'X': Add `elif pk == 'X': buf.append(...)`
- To remove a rule for key 'X': Delete the `elif pk == 'X'` block to let it fallback to standard multi-line formatting.
===============================================================================
"""

import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def generate_compact_json(input_path=None, output_path=None):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. इनपुट पाथ: data/data.json
    if input_path is None:
        input_path = os.path.join(script_dir, '..', 'data', 'data.json')
        
    # 2. आउटपुट पाथ: strictly data/data_new.json
    if output_path is None:
        output_path = os.path.join(script_dir, '..', 'data', 'data_new.json')

    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    out = ['{']
    top_keys = list(data.keys())

    for tk_idx, tk in enumerate(top_keys):
        tk_comma = ',' if tk_idx < len(top_keys) - 1 else ''
        val = data[tk]

        # 1. fareRules Section (Exact existing keys & compact formatting)
        if tk == 'fareRules' and isinstance(val, dict):
            out.append('\t"fareRules": {')
            fr_keys = list(val.keys())
            for i, k in enumerate(fr_keys):
                k_comma = ',' if i < len(fr_keys) - 1 else ''
                fr_val = val[k]
                if k == 'policies' and isinstance(fr_val, dict):
                    out.append('\t\t"policies": {')
                    pol_keys = list(fr_val.keys())
                    for pi, pk in enumerate(pol_keys):
                        pk_comma = ',' if pi < len(pol_keys) - 1 else ''
                        pol = fr_val[pk]
                        out.append(f'\t\t\t"{pk}": {{')
                        pol_fields = list(pol.keys())
                        for fi, fk in enumerate(pol_fields):
                            f_comma = ',' if fi < len(pol_fields) - 1 else ''
                            fval = pol[fk]
                            if fk == 'fareTables' and isinstance(fval, dict):
                                out.append('\t\t\t\t"fareTables": {')
                                ft_keys = list(fval.keys())
                                for fti, ftk in enumerate(ft_keys):
                                    ft_comma = ',' if fti < len(ft_keys) - 1 else ''
                                    slabs = fval[ftk]
                                    out.append(f'\t\t\t\t\t"{ftk}": [')
                                    for si, sl in enumerate(slabs):
                                        s_comma = ',' if si < len(slabs) - 1 else ''
                                        sl_str = json.dumps(sl, ensure_ascii=False)
                                        out.append(f'\t\t\t\t\t\t{sl_str}{s_comma}')
                                    out.append(f'\t\t\t\t\t]{ft_comma}')
                                out.append(f'\t\t\t\t}}{f_comma}')
                            elif fk == 'products' and isinstance(fval, dict):
                                out.append('\t\t\t\t"products": {')
                                prod_keys = list(fval.keys())
                                for pri, prk in enumerate(prod_keys):
                                    pr_comma = ',' if pri < len(prod_keys) - 1 else ''
                                    prod = fval[prk]
                                    out.append(f'\t\t\t\t\t"{prk}": {{')
                                    pf_keys = list(prod.keys())
                                    for pfi, pfk in enumerate(pf_keys):
                                        pf_comma = ',' if pfi < len(pf_keys) - 1 else ''
                                        pf_val = prod[pfk]
                                        if pfk == 'label':
                                            lbl_str = json.dumps(pf_val, ensure_ascii=False)
                                            out.append(f'\t\t\t\t\t\t"label": {lbl_str}{pf_comma}')
                                        else:
                                            pv_str = json.dumps(pf_val, ensure_ascii=False)
                                            out.append(f'\t\t\t\t\t\t"{pfk}": {pv_str}{pf_comma}')
                                    out.append(f'\t\t\t\t\t}}{pr_comma}')
                                out.append(f'\t\t\t\t}}{f_comma}')
                            elif fk == 'timeRules' and isinstance(fval, dict):
                                out.append('\t\t\t\t"timeRules": {')
                                tr_keys = list(fval.keys())
                                for tri, trk in enumerate(tr_keys):
                                    tr_comma = ',' if tri < len(tr_keys) - 1 else ''
                                    tr_list = fval[trk]
                                    out.append(f'\t\t\t\t\t"{trk}": [')
                                    for ti, item in enumerate(tr_list):
                                        t_comma = ',' if ti < len(tr_list) - 1 else ''
                                        item_str = json.dumps(item, ensure_ascii=False)
                                        out.append(f'\t\t\t\t\t\t{item_str}{t_comma}')
                                    out.append(f'\t\t\t\t\t]{tr_comma}')
                                out.append(f'\t\t\t\t}}{f_comma}')
                            else:
                                fv_str = json.dumps(fval, indent='\t', ensure_ascii=False)
                                ind_fv = '\n'.join('\t\t\t\t' + line if idx > 0 else line for idx, line in enumerate(fv_str.splitlines()))
                                out.append(f'\t\t\t\t"{fk}": {ind_fv}{f_comma}')
                        out.append(f'\t\t\t}}{pk_comma}')
                    out.append(f'\t\t}}{k_comma}')
                else:
                    v_str = json.dumps(fr_val, indent='\t', ensure_ascii=False)
                    ind_v = '\n'.join('\t\t' + line if idx > 0 else line for idx, line in enumerate(v_str.splitlines()))
                    out.append(f'\t\t"{k}": {ind_v}{k_comma}')
            out.append(f'\t}}{tk_comma}')

        # 2. lines Section
        elif tk == 'lines' and isinstance(val, dict):
            out.append('\t"lines": {')
            l_keys = list(val.keys())
            for li, lk in enumerate(l_keys):
                l_comma = ',' if li < len(l_keys) - 1 else ''
                line_data = val[lk]
                out.append(f'\t\t"{lk}": {{')
                ld_keys = list(line_data.keys())
                for j, (k, v) in enumerate(line_data.items()):
                    k_comma = ',' if j < len(ld_keys) - 1 else ''
                    if k == 'stations':
                        st_arr = json.dumps(v, ensure_ascii=False)
                        out.append(f'\t\t\t"stations": {st_arr}{k_comma}')
                    else:
                        v_str = json.dumps(v, ensure_ascii=False)
                        out.append(f'\t\t\t"{k}": {v_str}{k_comma}')
                out.append(f'\t\t}}{l_comma}')
            out.append(f'\t}}{tk_comma}')

        # 3. stationData Section (Dynamic key rendering with compact rules)
        elif tk == 'stationData' and isinstance(val, dict):
            out.append('\t"stationData": {')
            st_keys = list(val.keys())
            for si, sk in enumerate(st_keys):
                s_comma = ',' if si < len(st_keys) - 1 else ''
                st = val[sk]
                out.append(f'\t\t"{sk}": {{')
                prop_keys = list(st.keys())
                for pi, pk in enumerate(prop_keys):
                    p_comma = ',' if pi < len(prop_keys) - 1 else ''
                    pval = st[pk]
                    if pk == 'train_schedule':
                        ts_str = json.dumps(pval, ensure_ascii=False)
                        out.append(f'\t\t\t"train_schedule": {ts_str}{p_comma}')
                    elif pk == 'properties' and isinstance(pval, dict):
                        out.append('\t\t\t"properties": {')
                        pr_keys = list(pval.keys())
                        for pri, prk in enumerate(pr_keys):
                            pr_comma = ',' if pri < len(pr_keys) - 1 else ''
                            out.append(f'\t\t\t\t"{prk}": {json.dumps(pval[prk], ensure_ascii=False)}{pr_comma}')
                        out.append(f'\t\t\t}}{p_comma}')
                    elif pk == 'platforms' and isinstance(pval, dict):
                        if not pval:
                            out.append(f'\t\t\t"platforms": {{}}{p_comma}')
                        else:
                            out.append('\t\t\t"platforms": {')
                            pl_keys = list(pval.keys())
                            for pli, plk in enumerate(pl_keys):
                                pl_comma = ',' if pli < len(pl_keys) - 1 else ''
                                out.append(f'\t\t\t\t"{plk}": {json.dumps(pval[plk], ensure_ascii=False)}{pl_comma}')
                            out.append(f'\t\t\t}}{p_comma}')
                    elif pk == 'neighbors' and isinstance(pval, list):
                        if not pval:
                            out.append(f'\t\t\t"neighbors": []{p_comma}')
                        else:
                            out.append('\t\t\t"neighbors": [')
                            for ni, nitem in enumerate(pval):
                                n_comma = ',' if ni < len(pval) - 1 else ''
                                out.append(f'\t\t\t\t{json.dumps(nitem, ensure_ascii=False)}{n_comma}')
                            out.append(f'\t\t\t]{p_comma}')
                    elif pk == 'location' and isinstance(pval, dict):
                        out.append('\t\t\t"location": {')
                        loc_keys = list(pval.keys())
                        for li, lk in enumerate(loc_keys):
                            l_comma = ',' if li < len(loc_keys) - 1 else ''
                            out.append(f'\t\t\t\t"{lk}": {json.dumps(pval[lk], ensure_ascii=False)}{l_comma}')
                        out.append(f'\t\t\t}}{p_comma}')
                    else:
                        pv_str = json.dumps(pval, ensure_ascii=False)
                        out.append(f'\t\t\t"{pk}": {pv_str}{p_comma}')
                out.append(f'\t\t}}{s_comma}')
            out.append(f'\t}}{tk_comma}')

        # 4. Other Top-Level Sections (Generic pretty print: station_types, defaults, travelAssumptions, etc.)
        else:
            v_str = json.dumps(val, indent='\t', ensure_ascii=False)
            ind_v = '\n'.join('\t' + line if idx > 0 else line for idx, line in enumerate(v_str.splitlines()))
            out.append(f'\t"{tk}": {ind_v}{tk_comma}')

    out.append('}')
    content = '\n'.join(out)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Successfully created compact formatted JSON at: {output_path}")

if __name__ == '__main__':
    generate_compact_json()