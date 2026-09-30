/**
 * 🌊 Mumbai Metro & Monorail Golden Dataset for Route & Platform Testing
 * Sources: MMMOCL, MMOPL (Line 1), MMRC (Line 3 Aqua Line), MMRDA Monorail
 */

export const mumbaiTestCases = [
	// =========================================================================
	// 🔵 1. LINE 1 (BLUE LINE: Versova ↔ Ghatkopar)
	// =========================================================================
	{
		id: "MUM-BLU-01",
		desc: "Ghatkopar Westbound to Jagruti Nagar (towards Versova)",
		from: "mmopl_1_ghatkopar",
		to: "mmopl_1_jagrutinagar",
		expectedPlatforms: [
			{ atStation: "mmopl_1_ghatkopar", line: "mumbai.blue", platform: "1" }
		]
	},
	{
		id: "MUM-BLU-02",
		desc: "Andheri Eastbound to WEH (towards Ghatkopar)",
		from: "mmopl_1_andheri",
		to: "mmopl_1_westernexpresshighway",
		expectedPlatforms: [
			{ atStation: "mmopl_1_andheri", line: "mumbai.blue", platform: "1" }
		]
	},
	{
		id: "MUM-BLU-03",
		desc: "Andheri Westbound to Azad Nagar (towards Versova)",
		from: "mmopl_1_andheri",
		to: "mmopl_1_azadnagar",
		expectedPlatforms: [
			{ atStation: "mmopl_1_andheri", line: "mumbai.blue", platform: "2" }
		]
	},

	// =========================================================================
	// 🟡 2. LINE 2A (YELLOW LINE: Dahisar East ↔ Andheri West)
	// =========================================================================
	{
		id: "MUM-YEL-01",
		desc: "Andheri West Northbound to Lower Oshiwara (towards Dahisar East)",
		from: "mmmocl_2a_andheriwest",
		to: "mmmocl_2a_loweroshiwara",
		expectedPlatforms: [
			{ atStation: "mmmocl_2a_andheriwest", line: "mumbai.yellow", platform: "1" }
		]
	},
	{
		id: "MUM-YEL-02",
		desc: "Dahisar East Southbound to Anand Nagar (Line 2A towards Andheri West)",
		from: "mmmocl_2a_dahisareast",
		to: "mmmocl_2a_anandnagar",
		expectedPlatforms: [
			{ atStation: "mmmocl_2a_dahisareast", line: "mumbai.yellow", platform: "3" }
		]
	},

	// =========================================================================
	// 🔴 3. LINE 7 (RED LINE: Dahisar East ↔ Gundavali)
	// =========================================================================
	{
		id: "MUM-RED-01",
		desc: "Gundavali Northbound to Mogra (Line 7 towards Dahisar East)",
		from: "mmmocl_7_gundavali",
		to: "mmmocl_7_mogra",
		expectedPlatforms: [
			{ atStation: "mmmocl_7_gundavali", line: "mumbai.red", platform: "1" }
		]
	},
	{
		id: "MUM-RED-02",
		desc: "Dahisar East Southbound to Ovari Pada (Line 7 towards Gundavali)",
		from: "mmmocl_2a_dahisareast",
		to: "mmmocl_7_ovaripada",
		expectedPlatforms: [
			{ atStation: "mmmocl_2a_dahisareast", line: "mumbai.red", platform: "1" }
		]
	},

	// =========================================================================
	// 🚆 4. NAVI MUMBAI LINE 1 & MONORAIL
	// =========================================================================
	{
		id: "MUM-NAV-01",
		desc: "Belapur to Sector 7 (Navi Mumbai Metro Line 1)",
		from: "nmm_1_belapur",
		to: "nmm_1_sector7",
		expectedPlatforms: [
			{ atStation: "nmm_1_belapur", line: "mumbai.navi_mumbai_1", platform: "1" }
		]
	},
	{
		id: "MUM-MONO-01",
		desc: "Chembur to V.N. Purav Marg (Mumbai Monorail - Suspended Line Test)",
		from: "mm_mono_chembur",
		to: "mm_mono_vnp_rcmarg",
		options: { includeUnderConstruction: true },
		expectedPlatforms: [
			{ atStation: "mm_mono_chembur", line: "mumbai.monorail", platform: "1" }
		]
	},

	// =========================================================================
	// 🔄 5. MULTI-LINE INTERCHANGES (Cross-platform, Skywalk & Underground)
	// =========================================================================
	{
		id: "MUM-INT-01",
		desc: "Ghatkopar to Cuffe Parade (Line 1 Blue -> Line 3 Aqua via Marol Naka)",
		from: "mmopl_1_ghatkopar",
		to: "cuffe_parade",
		expectedInterchanges: 1,
		expectedPlatforms: [
			{ atStation: "mmopl_1_ghatkopar", line: "mumbai.blue", platform: "1" }
		]
	},
	{
		id: "MUM-INT-02",
		desc: "Versova to Mogra (Line 1 Blue -> Line 7 Red via WEH/Gundavali Skywalk)",
		from: "mmopl_1_versova",
		to: "mmmocl_7_mogra",
		expectedInterchanges: 1,
		expectedPlatforms: [
			{ atStation: "mmopl_1_versova", line: "mumbai.blue", platform: "1" },
			{ atStation: "mmmocl_7_gundavali", line: "mumbai.red", platform: "1" }
		]
	},
	{
		id: "MUM-INT-03",
		desc: "Anand Nagar to Ovari Pada (Line 2A Yellow -> Line 7 Red via Dahisar East Cross-platform)",
		from: "mmmocl_2a_anandnagar",
		to: "mmmocl_7_ovaripada",
		expectedInterchanges: 1,
		expectedPlatforms: [
			{ atStation: "mmmocl_2a_anandnagar", line: "mumbai.yellow", platform: "2" },
			{ atStation: "mmmocl_2a_dahisareast", line: "mumbai.red", platform: "1" }
		]
	}
];
