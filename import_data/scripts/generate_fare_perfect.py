import json
import re

with open('main_project/data/india/cities/delhi_ncr/transit_network.json', 'r', encoding='utf-8') as f:
    prod_delhi = json.load(f)

p_airport = prod_delhi['fareRules']['policies']['airport_express']
p_ncrtc = prod_delhi['fareRules']['policies']['ncrtc_standard']
p_ncrtc_prem = prod_delhi['fareRules']['policies']['ncrtc_premium']

with open('import_data/datasets/metro_fare_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update delhi_ncr networks header from 1.1...1.6 to semantic networks
delhi_networks_old = """		delhi_ncr: {
			1.1: {
				name: "Delhi Metro Main Network",
				operator: "DMRC",
				fareType: "distance_slab",
			},
			1.2: {
				name: "Airport Express Line",
				operator: "DMRC",
				fareType: "matrix",
			},
			1.3: {
				name: "Noida Metro Aqua Line",
				operator: "NMRC",
				fareType: "distance_slab",
			},
			1.4: {
				name: "Rapid Metro Gurugram",
				operator: "GMDA",
				fareType: "distance_slab",
			},
			1.5: {
				name: "Namo Bharat RRTS Delhi–Meerut",
				operator: "NCRTC",
				fareType: "matrix",
			},
			1.6: {
				name: "Meerut Metro",
				operator: "NCRTC",
				fareType: "distance_slab",
			},"""

delhi_networks_new = """		delhi_ncr: {
			networks: {
				dmrc_main: {
					name: "Delhi Metro Main Network",
					operator: "DMRC",
					fareType: "distance_slab",
				},
				airport_express: {
					name: "Airport Express Line",
					operator: "DMRC",
					fareType: "matrix",
				},
				noida_aqua: {
					name: "Noida Metro Aqua Line",
					operator: "NMRC",
					fareType: "distance_slab",
				},
				rapid_metro: {
					name: "Rapid Metro Gurugram",
					operator: "HMRTC / GMDA / DMRC",
					fareType: "distance_slab",
				},
				namo_bharat_rrts: {
					name: "Namo Bharat RRTS Delhi–Meerut",
					operator: "NCRTC",
					fareType: "matrix",
				},
				meerut_metro: {
					name: "Meerut Metro",
					operator: "NCRTC",
					fareType: "distance_slab",
				},
			},"""

content = content.replace(delhi_networks_old, delhi_networks_new)

# 2. Update Mumbai networks header from 2.1...2.5 to semantic networks
mumbai_networks_old = """		mumbai: {
			2.1: {
				name: "Mumbai Metro Line 1",
				operator: "MMOPL",
				fareType: "distance_slab",
			},
			2.2: {
				name: "Mumbai Metro Lines 2A & 7",
				operator: "MMMOCL",
				fareType: "distance_slab",
			},
			2.3: {
				name: "Mumbai Metro Line 3 Aqua Line",
				operator: "MMRCL",
				fareType: "distance_slab",
			},
			2.4: {
				name: "Navi Mumbai Metro",
				operator: "Maha Mumbai Metro / CIDCO",
				fareType: "distance_slab",
			},
			2.5: {
				name: "Mumbai Monorail",
				operator: "MMRDA",
				fareType: "distance_slab",
				status: "suspended", // ⚠️ Suspended since 20 Sep 2025
			},"""

mumbai_networks_new = """		mumbai: {
			networks: {
				line1_blue: {
					name: "Mumbai Metro Line 1",
					operator: "MMOPL",
					fareType: "distance_slab",
				},
				lines_2a_7: {
					name: "Mumbai Metro Lines 2A & 7",
					operator: "MMMOCL",
					fareType: "distance_slab",
				},
				line3_aqua: {
					name: "Mumbai Metro Line 3 Aqua Line",
					operator: "MMRCL",
					fareType: "distance_slab",
				},
				navi_mumbai: {
					name: "Navi Mumbai Metro",
					operator: "Maha Mumbai Metro / CIDCO",
					fareType: "distance_slab",
				},
				monorail: {
					name: "Mumbai Monorail",
					operator: "MMRDA",
					fareType: "distance_slab",
					status: "suspended", // ⚠️ Suspended since 20 Sep 2025
				},
			},"""

content = content.replace(mumbai_networks_old, mumbai_networks_new)

# 3. Replace Airport Express policy with canonical 2D matrix
airport_rep = """// 1.2 DMRC Airport Express Line Matrix (Canonical 2D Matrix matching FareCalculator)
					airport_express: {
						network: "dmrc",
						effectiveFrom: "2025-08-25",
						fareModel: "station_pair",
						calculation: { rounding: "exact" },
						stations: [
							"new_delhi_yellow_airport_line",
							"shivaji_stadium",
							"dhaula_kuan",
							"delhi_aerocity",
							"airport_t_3",
							"dwarka_sector_21",
							"yashobhoomi_dwarka_sector_25"
						],
						fareMatrix: [
							[11, 21, 43, 54, 64, 64, 75],
							[21, 11, 21, 32, 54, 64, 75],
							[43, 21, 11, 21, 32, 54, 64],
							[54, 32, 21, 11, 21, 32, 43],
							[64, 54, 32, 21, 11, 21, 32],
							[64, 64, 54, 32, 21, 11, 21],
							[75, 75, 64, 43, 32, 21, 11]
						],
						products: {
							single_journey: {
								type: "base",
								label: {
									en: "Airport Express Single Journey Token / QR",
									hi: "एकल यात्रा"
								}
							},
							smart_card: {
								type: "discount",
								baseProduct: "single_journey",
								discountPercent: 10,
								label: {
									en: "Airport Express Smart Card (10% Off)",
									hi: "स्मार्ट कार्ड (10% छूट)"
								}
							}
						},
						stationStayRules: {
							sameStationExitFare: 11,
							sameStationTimeLimitMinutes: 20,
							differentStationTimeLimitMinutes: 120,
							overstayPenaltyPerHour: 20,
							maxOverstayPenalty: 100
						}
					},"""

m_air = re.search(r'// 1\.2 DMRC Airport Express Line Matrix.*?(?=// 1\.3 Noida Metro Aqua Line)', content, re.DOTALL)
if m_air:
    content = content[:m_air.start()] + airport_rep + '\n\n\t\t\t\t\t' + content[m_air.end():]

# 4. Replace namo_bharat_rrts policy with canonical 2D matrix (ncrtc_standard & ncrtc_premium)
ncrtc_rep = f"""// 1.5 Namo Bharat RRTS (23x23 Canonical 2D Matrix matching FareCalculator)
					ncrtc_standard: {json.dumps(p_ncrtc, indent=6)},

					ncrtc_premium: {json.dumps(p_ncrtc_prem, indent=6)},"""

m_rrts = re.search(r'// 1\.5 Namo Bharat RRTS.*?(?=// 1\.6 Meerut Metro)', content, re.DOTALL)
if m_rrts:
    content = content[:m_rrts.start()] + ncrtc_rep + '\n\n\t\t\t\t\t' + content[m_rrts.end():]

# 5. Fix Mumbai MMMOCL policy name (mmmocl_lines -> mmmocl_standard)
content = content.replace("mmmocl_lines:", "mmmocl_standard:")

# 6. Single line cities exact replace:
replacements = {
    '3.1': ('main_metro', 'kolkata'),
    '4.1': ('namma_metro', 'bengaluru'),
    '5.1': ('lt_metro', 'hyderabad'),
    '6.1': ('cmrl_metro', 'chennai'),
    '8.1': ('gmrc_metro', 'ahmedabad'),
    '9.1': ('maha_metro', 'pune'),
    '10.1': ('maha_metro', 'nagpur'),
    '11.1': ('jmrc_metro', 'jaipur'),
    '12.1': ('upmrc_metro', 'lucknow'),
    '13.1': ('upmrc_metro', 'kanpur'),
    '14.1': ('upmrc_metro', 'agra'),
    '15.1': ('mpmrcl_metro', 'indore'),
    '16.1': ('mpmrcl_metro', 'bhopal'),
}

for num_key, (net_name, city_name) in replacements.items():
    # Replace either 'num_key': { or '"num_key"': {
    target1 = f'"{num_key}": {{\n'
    target2 = f'{num_key}: {{\n'
    subst = f'networks: {{\n\t\t\t\t{net_name}: {{\n'
    if target1 in content:
        content = content.replace(target1, subst)
    elif target2 in content:
        content = content.replace(target2, subst)

    # Now close the networks block right before fareRules:
    # Look for city's fareRules
    idx_city = content.find(f'{city_name}:')
    if idx_city == -1:
        idx_city = content.find(f'"{city_name}":')
    if idx_city != -1:
        idx_fr = content.find('fareRules:', idx_city)
        if idx_fr == -1:
            idx_fr = content.find('"fareRules":', idx_city)
        if idx_fr != -1:
            # Look backwards from idx_fr to find the preceding '},\n'
            idx_last_brace = content.rfind('},', idx_city, idx_fr)
            if idx_last_brace != -1:
                content = content[:idx_last_brace+2] + '\n\t\t\t},' + content[idx_last_brace+2:]

# Kochi special handling
kochi_old = """		"kochi": {
			"7.1": {
				"name": "Kochi Metro",
				"operator": "KMRL",
				"fareType": "distance_slab"
			},
			"7.2": {
				"name": "Kochi Water Metro",
				"operator": "KWML / KMRL",
				"fareType": "distance_slab"
			},"""

kochi_new = """		kochi: {
			networks: {
				rail_metro: {
					name: "Kochi Metro",
					operator: "KMRL",
					fareType: "distance_slab"
				},
				water_metro: {
					name: "Kochi Water Metro",
					operator: "KWML / KMRL",
					fareType: "distance_slab"
				}
			},"""

content = content.replace(kochi_old, kochi_new)

# Harmonize remaining quoted city keys
pattern_cities = r'\"(chennai|kochi|ahmedabad|pune|nagpur|jaipur|lucknow|kanpur|agra|indore|bhopal)\":\s*\{'
content = re.sub(pattern_cities, r'\1: {', content)

# Harmonize "fareRules": to fareRules:
content = re.sub(r'\"fareRules\":', 'fareRules:', content)

with open('import_data/datasets/metro_fare_data_new.js', 'w', encoding='utf-8') as f:
    f.write(content)

print('SUCCESS: metro_fare_data_new.js precisely generated!')
