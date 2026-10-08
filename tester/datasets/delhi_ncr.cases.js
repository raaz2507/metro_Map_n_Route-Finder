/**
 * 🚇 Delhi NCR Golden Dataset for Route & Platform Testing
 * Sources: DMRC Official Route Map, Station Signage & Journey Directory
 */

export const delhiNcrTestCases = [
	// =========================================================================
	// 🟡 1. YELLOW LINE (Samaypur Badli ↔ Millennium City Centre Gurugram)
	// =========================================================================
	{
		id: "YEL-01",
		desc: "Rajiv Chowk Southbound to Patel Chowk (Adjacent Station)",
		from: "rajiv_chowk",
		to: "patel_chowk",
		sourceVerification: {
			officialUrl: "https://www.delhimetrorail.com",
			notificationRef: "DMRC Standard Tariff Slab (0-2 km)",
			notes: "Base tariff slab is ₹11."
		},
		expectedFare: 11,
		expectedPlatforms: [
			{ atStation: "rajiv_chowk", line: "dmrc.yellow", platform: "1" }
		]
	},
	{
		id: "YEL-02",
		desc: "Rajiv Chowk Northbound to New Delhi (Yellow Line)",
		from: "rajiv_chowk",
		to: "new_delhi_yellow_airport_line",
		sourceVerification: {
			officialUrl: "https://www.delhimetrorail.com",
			notificationRef: "DMRC Standard Tariff Slab (0-2 km)",
			notes: "Base tariff slab is ₹11."
		},
		expectedFare: 11,
		expectedPlatforms: [
			{ atStation: "rajiv_chowk", line: "dmrc.yellow", platform: "2" }
		]
	},
	{
		id: "YEL-03",
		desc: "Kashmere Gate Northbound to Civil Lines",
		from: "kashmere_gate",
		to: "civil_lines",
		expectedPlatforms: [
			{ atStation: "kashmere_gate", line: "dmrc.yellow", platform: "2" }
		]
	},
	{
		id: "YEL-04",
		desc: "Kashmere Gate Southbound to Chandni Chowk",
		from: "kashmere_gate",
		to: "chandni_chowk",
		expectedPlatforms: [
			{ atStation: "kashmere_gate", line: "dmrc.yellow", platform: "1" }
		]
	},
	{
		id: "YEL-05",
		desc: "Azadpur Southbound to Model Town",
		from: "azadpur",
		to: "model_town",
		expectedPlatforms: [
			{ atStation: "azadpur", line: "dmrc.yellow", platform: "1" }
		]
	},
	{
		id: "YEL-06",
		desc: "Azadpur Northbound to Adarsh Nagar",
		from: "azadpur",
		to: "adarsh_nagar",
		expectedPlatforms: [
			{ atStation: "azadpur", line: "dmrc.yellow", platform: "2" }
		]
	},

	// =========================================================================
	// 🔴 2. RED LINE (Rithala ↔ Shaheed Sthal New Bus Adda)
	// =========================================================================
	{
		id: "RED-01",
		desc: "Kashmere Gate Westbound to Rithala",
		from: "kashmere_gate",
		to: "tis_hazari",
		expectedPlatforms: [
			{ atStation: "kashmere_gate", line: "dmrc.red", platform: "3" }
		]
	},
	{
		id: "RED-02",
		desc: "Kashmere Gate Eastbound to Shaheed Sthal",
		from: "kashmere_gate",
		to: "shastri_park",
		expectedPlatforms: [
			{ atStation: "kashmere_gate", line: "dmrc.red", platform: "4" }
		]
	},

	// =========================================================================
	// 🔵 3. BLUE LINE (Dwarka Sector 21 ↔ Noida Electronic City / Vaishali)
	// =========================================================================
	{
		id: "BLU-01",
		desc: "Rajiv Chowk Eastbound to Noida Electronic City",
		from: "rajiv_chowk",
		to: "barakhamba_road",
		expectedPlatforms: [
			{ atStation: "rajiv_chowk", line: "dmrc.blue_main", platform: "3" }
		]
	},
	{
		id: "BLU-02",
		desc: "Rajiv Chowk Westbound to Dwarka Sector 21",
		from: "rajiv_chowk",
		to: "ramakrishna_ashram_marg",
		expectedPlatforms: [
			{ atStation: "rajiv_chowk", line: "dmrc.blue_main", platform: "4" }
		]
	},
	{
		id: "BLU-03",
		desc: "Mandi House Eastbound to Supreme Court",
		from: "mandi_house",
		to: "supreme_court_pragati_maidan",
		expectedPlatforms: [
			{ atStation: "mandi_house", line: "dmrc.blue_main", platform: "1" }
		]
	},
	{
		id: "BLU-04",
		desc: "Mandi House Westbound to Barakhamba Road",
		from: "mandi_house",
		to: "barakhamba_road",
		expectedPlatforms: [
			{ atStation: "mandi_house", line: "dmrc.blue_main", platform: "2" }
		]
	},

	// =========================================================================
	// 🌸 4. PINK LINE (Majlis Park ↔ Shiv Vihar)
	// =========================================================================
	{
		id: "PNK-01",
		desc: "Azadpur Northbound to Majlis Park",
		from: "azadpur",
		to: "majlis_park",
		expectedPlatforms: [
			{ atStation: "azadpur", line: "dmrc.pink", platform: "4" }
		]
	},
	{
		id: "PNK-02",
		desc: "Azadpur Southbound to Shalimar Bagh",
		from: "azadpur",
		to: "shalimar_bagh",
		expectedPlatforms: [
			{ atStation: "azadpur", line: "dmrc.pink", platform: "3" }
		]
	},

	// =========================================================================
	// 🟣 5. VIOLET LINE (Kashmere Gate ↔ Raja Nahar Singh Ballabhgarh)
	// =========================================================================
	{
		id: "VIO-01",
		desc: "Kashmere Gate Southbound to Lal Quila",
		from: "kashmere_gate",
		to: "lal_quila",
		expectedPlatforms: [
			{ atStation: "kashmere_gate", line: "dmrc.violet", platform: "5" }
		]
	},
	{
		id: "VIO-02",
		desc: "Mandi House Northbound to ITO",
		from: "mandi_house",
		to: "ito",
		expectedPlatforms: [
			{ atStation: "mandi_house", line: "dmrc.violet", platform: "4" }
		]
	},
	{
		id: "VIO-03",
		desc: "Mandi House Southbound to Janpath",
		from: "mandi_house",
		to: "janpath",
		expectedPlatforms: [
			{ atStation: "mandi_house", line: "dmrc.violet", platform: "3" }
		]
	},

	// =========================================================================
	// 🌺 6. MAGENTA LINE (Janakpuri West ↔ Botanical Garden)
	// =========================================================================
	{
		id: "MAG-01",
		desc: "Hauz Khas Westbound to IIT",
		from: "hauz_khas",
		to: "iit",
		expectedPlatforms: [
			{ atStation: "hauz_khas", line: "dmrc.magenta", platform: "4" }
		]
	},
	{
		id: "MAG-02",
		desc: "Hauz Khas Eastbound to Panchsheel Park",
		from: "hauz_khas",
		to: "panchsheel_park",
		expectedPlatforms: [
			{ atStation: "hauz_khas", line: "dmrc.magenta", platform: "3" }
		]
	},

	// =========================================================================
	// 🔄 7. MULTI-LINE INTERCHANGE ROUTES (The Acid Test)
	// =========================================================================
	{
		id: "INT-01",
		desc: "Vishwavidyalaya to Burari (Yellow -> Pink via Azadpur Platform 4)",
		from: "vishwavidyalaya",
		to: "burari",
		expectedInterchanges: 1,
		expectedPlatforms: [
			{ atStation: "vishwavidyalaya", line: "dmrc.yellow", platform: "2" },
			{ atStation: "azadpur", line: "dmrc.pink", platform: "4" }
		]
	},
	{
		id: "INT-02",
		desc: "Rajiv Chowk to Burari (Yellow -> Pink via Azadpur Platform 4)",
		from: "rajiv_chowk",
		to: "burari",
		expectedInterchanges: 1,
		expectedPlatforms: [
			{ atStation: "rajiv_chowk", line: "dmrc.yellow", platform: "2" },
			{ atStation: "azadpur", line: "dmrc.pink", platform: "4" }
		]
	},
	{
		id: "INT-03",
		desc: "Noida Electronic City to Rithala (Blue -> Yellow -> Red)",
		from: "noida_electronic_city",
		to: "rithala",
		expectedInterchanges: 2,
		expectedPlatforms: [
			{ atStation: "noida_electronic_city", line: "dmrc.blue_main", platform: "2" }
		]
	},
	{
		id: "INT-04",
		desc: "Samaypur Badli to Dilli Haat INA (Yellow Line Direct)",
		from: "samaypur_badli_dipo",
		to: "dilli_haat_ina",
		expectedInterchanges: 0,
		expectedPlatforms: [
			{ atStation: "samaypur_badli_dipo", line: "dmrc.yellow", platform: "1" }
		]
	},
	{
		id: "INT-05",
		desc: "Haiderpur Badli Mor to Burari (Magenta -> Pink via Majlis Park Platform 3)",
		from: "haiderpur_badli_mor",
		to: "burari",
		expectedInterchanges: 1,
		expectedPlatforms: [
			{ atStation: "haiderpur_badli_mor", line: "dmrc.magenta", platform: "4" },
			{ atStation: "majlis_park", line: "dmrc.pink", platform: "3" }
		]
	}
];
