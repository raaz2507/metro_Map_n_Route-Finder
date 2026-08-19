import os
import json

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

    # 1. fareRules Section (Exact existing keys & compact formatting)
    if 'fareRules' in data:
        fr = data['fareRules']
        out.append('\t"fareRules": {')
        fr_keys = list(fr.keys())
        for i, k in enumerate(fr_keys):
            k_comma = ',' if i < len(fr_keys) - 1 else ''
            val = fr[k]
            if k == 'policies' and isinstance(val, dict):
                out.append('\t\t"policies": {')
                pol_keys = list(val.keys())
                for pi, pk in enumerate(pol_keys):
                    pk_comma = ',' if pi < len(pol_keys) - 1 else ''
                    pol = val[pk]
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
                v_str = json.dumps(val, indent='\t', ensure_ascii=False)
                ind_v = '\n'.join('\t\t' + line if idx > 0 else line for idx, line in enumerate(v_str.splitlines()))
                out.append(f'\t\t"{k}": {ind_v}{k_comma}')
        out.append('\t},')

    # 2. lines Section (Exact existing keys & compact formatting)
    if 'lines' in data:
        out.append('\t"lines": {')
        lines_obj = data['lines']
        l_keys = list(lines_obj.keys())
        for i, lk in enumerate(l_keys):
            l_comma = ',' if i < len(l_keys) - 1 else ''
            line_data = lines_obj[lk]
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
        out.append('\t},')

    # 3. stationData Section (STRICTLY exists-check only, NO extra key created)
    if 'stationData' in data:
        out.append('\t"stationData": {')
        st_obj = data['stationData']
        s_keys = list(st_obj.keys())
        for i, sk in enumerate(s_keys):
            s_comma = ',' if i < len(s_keys) - 1 else ''
            st = st_obj[sk]
            
            buf = [f'\t\t"{sk}": {{']
            
            # 1. id
            if 'id' in st:
                buf.append(f'\t\t\t"id": {json.dumps(st["id"], ensure_ascii=False)},')
            elif sk:
                buf.append(f'\t\t\t"id": "{sk}",')

            # 2. name
            if 'name' in st:
                name_json = json.dumps(st['name'], ensure_ascii=False)
                has_next = ('name_hi' in st) or ('lines' in st) or ('properties' in st) or ('platforms' in st) or ('neighbors' in st) or ('location' in st)
                comma_flag = ',' if has_next else ''
                buf.append(f'\t\t\t"name": {name_json}{comma_flag}')

            # 3. name_hi (ONLY IF EXISTS)
            if 'name_hi' in st:
                name_hi_json = json.dumps(st['name_hi'], ensure_ascii=False)
                has_next = ('lines' in st) or ('properties' in st) or ('platforms' in st) or ('neighbors' in st) or ('location' in st)
                comma_flag = ',' if has_next else ''
                buf.append(f'\t\t\t"name_hi": {name_hi_json}{comma_flag}')

            # 4. lines (ONLY IF EXISTS)
            if 'lines' in st:
                st_lines = json.dumps(st['lines'], ensure_ascii=False)
                has_next = ('properties' in st) or ('platforms' in st) or ('neighbors' in st) or ('location' in st)
                comma_flag = ',' if has_next else ''
                buf.append(f'\t\t\t"lines": {st_lines}{comma_flag}')

            # 5. properties (ONLY IF EXISTS)
            props = st.get('properties')
            if props is not None:
                has_next = ('platforms' in st) or ('neighbors' in st) or ('location' in st)
                comma_flag = ',' if has_next else ''
                buf.append('\t\t\t"properties": {')
                pk_list = list(props.keys())
                for idx, pk in enumerate(pk_list):
                    pk_comma = ',' if idx < len(pk_list) - 1 else ''
                    buf.append(f'\t\t\t\t"{pk}": {json.dumps(props[pk], ensure_ascii=False)}{pk_comma}')
                buf.append(f'\t\t\t}}{comma_flag}')

            # 6. platforms (ONLY IF EXISTS)
            if 'platforms' in st:
                plats = st['platforms']
                has_next = ('neighbors' in st) or ('location' in st)
                comma_flag = ',' if has_next else ''
                if not plats:
                    buf.append(f'\t\t\t"platforms": {{}}{comma_flag}')
                else:
                    buf.append('\t\t\t"platforms": {')
                    pl_keys = list(plats.keys())
                    for idx, plk in enumerate(pl_keys):
                        pl_comma = ',' if idx < len(pl_keys) - 1 else ''
                        buf.append(f'\t\t\t\t"{plk}": {json.dumps(plats[plk], ensure_ascii=False)}{pl_comma}')
                    buf.append(f'\t\t\t}}{comma_flag}')

            # 7. neighbors (ONLY IF EXISTS)
            if 'neighbors' in st:
                neighs = st['neighbors']
                has_next = ('location' in st)
                comma_flag = ',' if has_next else ''
                if not neighs:
                    buf.append(f'\t\t\t"neighbors": []{comma_flag}')
                else:
                    buf.append('\t\t\t"neighbors": [')
                    for idx, n in enumerate(neighs):
                        n_comma = ',' if idx < len(neighs) - 1 else ''
                        buf.append(f'\t\t\t\t{json.dumps(n, ensure_ascii=False)}{n_comma}')
                    buf.append(f'\t\t\t]{comma_flag}')

            # 8. location (ONLY EXISTING KEYS INSIDE LOCATION)
            if 'location' in st and st['location'] is not None:
                loc = st['location']
                buf.append('\t\t\t"location": {')
                loc_keys = list(loc.keys())
                for idx, lk in enumerate(loc_keys):
                    lk_comma = ',' if idx < len(loc_keys) - 1 else ''
                    buf.append(f'\t\t\t\t"{lk}": {json.dumps(loc[lk], ensure_ascii=False)}{lk_comma}')
                buf.append('\t\t\t}')

            buf.append(f'\t\t}}{s_comma}')
            out.append('\n'.join(buf))
        out.append('\t}')

    out.append('}')
    content = '\n'.join(out)

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"✅ Successfully created compact formatted JSON at: {output_path}")

if __name__ == '__main__':
    generate_compact_json()