/**
 * 🤖 Disha AI Master Test Benchmark Dataset
 * Covers:
 * 1. Intent Classification across languages (EN, HI, Hinglish)
 * 2. Slot & Station Entity Extraction (Directional, Typo, Ambiguity, Unverified Locality)
 * 3. Multi-Turn Context & Slot Fulfillment
 * 4. Multi-Network Portability (Delhi, Mumbai, Bengaluru)
 * 5. Storage & LRU Session Constraints
 */

export const dishaAiTestCases = {
	// =========================================================================
	// 1. INTENT CLASSIFICATION CASES
	// =========================================================================
	intents: [
		// Added from User Feedback (2026-10-14) [Network: delhi_ncr]
		{
			id: "SHEET_2026-10-14_002",
			text: "bhai rajiv chowk se model town ka kiraya",
			lang: "hi",
			expectedIntent: "ROUTE_SEARCH", // TODO: Verify or update expected slots
		},
		// Added from User Feedback (2026-10-14) [Network: delhi_ncr]
		{
			id: "SHEET_2026-10-14_001",
			text: "soorghat se gtb jaana hai kaise jaun",
			lang: "hi",
			expectedIntent: "ROUTE_SEARCH", // TODO: Verify or update expected slots
		},
		// ROUTE_SEARCH
		{ id: "INT_01", text: "route from rajiv chowk to kashmere gate", lang: "en", expectedIntent: "ROUTE_SEARCH" },
		{ id: "INT_02", text: "how to reach model town from jharoda", lang: "en", expectedIntent: "ROUTE_SEARCH" },
		{ id: "INT_03", text: "jharoda se model town kaise jaun", lang: "hi", expectedIntent: "ROUTE_SEARCH" },
		{ id: "INT_04", text: "राजीव चौक से कश्मीरी गेट कैसे जाएं", lang: "hi", expectedIntent: "ROUTE_SEARCH" },
		{ id: "INT_05", text: "dwarka ➔ botanical garden", lang: "en", expectedIntent: "ROUTE_SEARCH" },
		{ id: "INT_06", text: "huda city centre to samaypur badli", lang: "en", expectedIntent: "ROUTE_SEARCH" },
		{ id: "INT_07", text: "model town jana hai cp se", lang: "hi", expectedIntent: "ROUTE_SEARCH" },

		// FARE_ENQUIRY
		{ id: "INT_08", text: "what is the ticket fare from noida to cp", lang: "en", expectedIntent: "FARE_ENQUIRY" },
		{ id: "INT_09", text: "kiraya kitna lagega", lang: "hi", expectedIntent: "FARE_ENQUIRY" },
		{ id: "INT_10", text: "टिकट का किराया कितना है", lang: "hi", expectedIntent: "FARE_ENQUIRY" },
		{ id: "INT_11", text: "smart card discount kitna milta hai", lang: "hi", expectedIntent: "FARE_ENQUIRY" },

		// TIME_DISTANCE
		{ id: "INT_12", text: "how long does it take from noida to rajiv chowk", lang: "en", expectedIntent: "TIME_DISTANCE" },
		{ id: "INT_13", text: "kitna time lagega", lang: "hi", expectedIntent: "TIME_DISTANCE" },
		{ id: "INT_14", text: "दूरी कितनी है और कितना समय लगेगा", lang: "hi", expectedIntent: "TIME_DISTANCE" },

		// LINE_INFO
		{ id: "INT_15", text: "which line goes to botanical garden", lang: "en", expectedIntent: "LINE_INFO" },
		{ id: "INT_16", text: "kaun si line badalni hogi", lang: "hi", expectedIntent: "LINE_INFO" },
		{ id: "INT_17", text: "इंटरचेंज स्टेशन कौन सा है", lang: "hi", expectedIntent: "LINE_INFO" },

		// STATION_INFO
		{ id: "INT_18", text: "first train timing for kashmere gate", lang: "en", expectedIntent: "STATION_INFO" },
		{ id: "INT_19", text: "gate number 2 of rajiv chowk", lang: "en", expectedIntent: "STATION_INFO" },
		{ id: "INT_20", text: "स्टेशन पर पार्किंग और लिफ्ट की सुविधा है क्या", lang: "hi", expectedIntent: "STATION_INFO" },

		// NEARBY_STATION
		{ id: "INT_21", text: "nearest metro station from my location", lang: "en", expectedIntent: "NEARBY_STATION" },
		{ id: "INT_22", text: "paas ka metro station batao", lang: "hi", expectedIntent: "NEARBY_STATION" },
		{ id: "INT_23", text: "नजदीकी मेट्रो स्टेशन", lang: "hi", expectedIntent: "NEARBY_STATION" },

		// RETURN_ROUTE
		{ id: "INT_24", text: "show me return route", lang: "en", expectedIntent: "RETURN_ROUTE" },
		{ id: "INT_25", text: "wapas kaise jaye", lang: "hi", expectedIntent: "RETURN_ROUTE" },
		{ id: "INT_26", text: "वापसी का रास्ता दिखाओ", lang: "hi", expectedIntent: "RETURN_ROUTE" },

		// GREETING & HELP
		{ id: "INT_27", text: "hello", lang: "en", expectedIntent: "GREETING" },
		{ id: "INT_28", text: "नमस्ते", lang: "hi", expectedIntent: "GREETING" },
		{ id: "INT_29", text: "help me", lang: "en", expectedIntent: "HELP" },
		{ id: "INT_30", text: "क्या कर सकते हो आप", lang: "hi", expectedIntent: "HELP" },

		// Route search: English, Hindi, Hinglish
		{
			id: "INT_031",
			query: "How do I get from Rajiv Chowk to Kashmere Gate?",
			lang: "en",
			expected: "ROUTE_SEARCH",
		},
		{
			id: "INT_032",
			query: "मुझे राजीव चौक से नोएडा सेक्टर 62 जाना है",
			lang: "hi",
			expected: "ROUTE_SEARCH",
		},
		{
			id: "INT_033",
			query: "botanical garden se sector 18 ka route batao",
			lang: "hi",
			expected: "ROUTE_SEARCH",
		},

		// Fare enquiries
		{
			id: "INT_034",
			query: "How much will the metro ticket cost?",
			lang: "en",
			expected: "FARE_ENQUIRY",
		},
		{
			id: "INT_035",
			query: "राजीव चौक से कश्मीरी गेट का किराया कितना है?",
			lang: "hi",
			expected: "FARE_ENQUIRY",
		},
		{
			id: "INT_036",
			query: "smart card se kitne paise lagenge?",
			lang: "hi",
			expected: "FARE_ENQUIRY",
		},

		// Travel time and distance
		{
			id: "INT_037",
			query: "How long does the journey take?",
			lang: "en",
			expected: "TIME_DISTANCE",
		},
		{
			id: "INT_038",
			query: "कितनी देर लगेगी?",
			lang: "hi",
			expected: "TIME_DISTANCE",
		},

		// Station information
		{
			id: "INT_039",
			query: "Tell me about Rajiv Chowk station",
			lang: "en",
			expected: "STATION_INFO",
		},
		{
			id: "INT_040",
			query: "राजीव चौक स्टेशन पर कौन-कौन सी सुविधाएँ हैं?",
			lang: "hi",
			expected: "STATION_INFO",
		},

		// Nearby station
		{
			id: "INT_041",
			query: "Find the nearest metro station",
			lang: "en",
			expected: "NEARBY_STATION",
		},
		{
			id: "INT_042",
			query: "मेरे पास सबसे नजदीकी मेट्रो स्टेशन बताओ",
			lang: "hi",
			expected: "NEARBY_STATION",
		},

		// Return route
		{
			id: "INT_043",
			query: "Show me the return route",
			lang: "en",
			expected: "RETURN_ROUTE",
		},

		// Greeting and help
		{
			id: "INT_044",
			query: "Good morning",
			lang: "en",
			expected: "GREETING",
		},
		{
			id: "INT_045",
			query: "नमस्ते",
			lang: "hi",
			expected: "GREETING",
		},
		{
			id: "INT_046",
			query: "What can you help me with?",
			lang: "en",
			expected: "HELP",
		},

		// Noisy inputs and difficult classification
		{
			id: "INT_047",
			query: "hiiiii",
			lang: "en",
			expected: "GREETING",
		},
		{
			id: "INT_048",
			query: "fare aur travel time batao",
			lang: "hi",
			expected: "FARE_ENQUIRY",
		},
		{
			id: "INT_049",
			query: "xyzabc qwerty",
			lang: "en",
			expected: "UNKNOWN",
		},
		{
			id: "INT_050",
			query: "",
			lang: "en",
			expected: "UNKNOWN",
		},

		// Ambiguity / Out of Scope (OOS)
    { id: "INT_051", text: "weather in noida", lang: "en", expectedIntent: "UNKNOWN" },
    { id: "INT_052", text: "delhi metro helpline number", lang: "en", expectedIntent: "HELP" },
    { id: "INT_053", text: "मेट्रो कब बंद होती है रात को", lang: "hi", expectedIntent: "STATION_INFO" },
    
    // Luggage & Safety
    { id: "INT_054", text: "is alcohol allowed in metro", lang: "en", expectedIntent: "STATION_INFO" },
    { id: "INT_055", text: "kitna bag le ja sakte hain", lang: "hi", expectedIntent: "STATION_INFO" },

    // Line / Interchange clarification
    { id: "INT_056", text: "kashmere gate pe yellow se red change hoti hai kya", lang: "hi", expectedIntent: "LINE_INFO" },
    { id: "INT_057", text: "magenta line interchange stations", lang: "en", expectedIntent: "LINE_INFO" },

    // Fare nuances (Token vs UPI)
    { id: "INT_058", text: "can I pay ticket via upi", lang: "en", expectedIntent: "FARE_ENQUIRY" },
    { id: "INT_059", text: "रविवार को मेट्रो किराया कम होता है क्या", lang: "hi", expectedIntent: "FARE_ENQUIRY" },



	],

	// =========================================================================
	// 2. STATION ENTITY & SLOT EXTRACTION CASES (Delhi NCR baseline)
	// =========================================================================
	entities: [
		// Standard Preposition (EN)
		{
			id: "ENT_01",
			text: "from kashmere gate to rajiv chowk",
			lang: "en",
			expectedSource: "kashmere_gate",
			expectedDest: "rajiv_chowk",
		},
		// Standard Postposition (HI Hinglish)
		{
			id: "ENT_02",
			text: "kashmere gate se rajiv chowk tak",
			lang: "hi",
			expectedSource: "kashmere_gate",
			expectedDest: "rajiv_chowk",
		},
		// Standard Postposition (HI Devanagari)
		{
			id: "ENT_03",
			text: "कश्मीरी गेट से राजीव चौक",
			lang: "hi",
			expectedSource: "kashmere_gate",
			expectedDest: "rajiv_chowk",
		},
		// User query with fuzzy matching & colloquial 'kaise jaun'
		{
			id: "ENT_04",
			text: "jharoda se model town kaise jaun",
			lang: "hi",
			expectedSource: "jharoda_majra",
			expectedDest: "model_town",
		},
		// Reverse Slot Order: Destination first, Source second
		{
			id: "ENT_05",
			text: "model town jana hai rajiv chowk se",
			lang: "hi",
			expectedSource: "rajiv_chowk",
			expectedDest: "model_town",
		},
		// Connector arrow
		{
			id: "ENT_06",
			text: "azadpur -> model town",
			lang: "en",
			expectedSource: "azadpur",
			expectedDest: "model_town",
		},
		// Typo Tolerance in station name
		{
			id: "ENT_07",
			text: "modl town to rajiv chawk",
			lang: "en",
			expectedSource: "model_town",
			expectedDest: "rajiv_chowk",
		},
		// Single Destination Intent
		{
			id: "ENT_08",
			text: "botanical garden jana hai",
			lang: "hi",
			expectedSource: null,
			expectedDest: "botanical_garden",
		},
		// Ambiguity Detection (e.g., 'noida' matches multiple Sector stations)
		{
			id: "ENT_09",
			text: "noida to rajiv chowk",
			lang: "en",
			expectedAmbiguous: true,
			expectedAmbiguousSlot: "source",
		},
		// Unverified Locality (Outside metro network)
		{
			id: "ENT_10",
			text: "agra se rajiv chowk kaise jaye",
			lang: "hi",
			expectedUnverified: "agra",
			expectedDest: "rajiv_chowk",
		},

		{
			id: "ENT_011",
			query: "Rajiv Chowk to Kashmere Gate",
			expectedSource: "rajiv_chowk",
			expectedDest: "kashmere_gate",
		},
		{
			id: "ENT_012",
			query: "Kashmere Gate se Rajiv Chowk",
			expectedSource: "kashmere_gate",
			expectedDest: "rajiv_chowk",
		},
		{
			id: "ENT_013",
			query: "botanical garden -> noida sector 18",
			expectedSource: "botanical_garden",
			expectedDest: "noida_sector_18",
		},
		{
			id: "ENT_014",
			query: "rajiv chok se kashmere get",
			expectedSource: "rajiv_chowk",
			expectedDest: "kashmere_gate",
		},
		{
			id: "ENT_015",
			query: "Take me to Rajiv Chowk",
			expectedDest: "rajiv_chowk",
		},
		{
			id: "ENT_016",
			query: "Route from Agra to Rajiv Chowk",
			expectedSource: null,
			expectedDest: "rajiv_chowk",
			expectedUnverified: true,
		},
		{
			id: "ENT_017",
			query: "noida se noida",
			expectedAmbiguous: true,
		},
		{
			id: "ENT_018",
			query: "from New Delhi to Airport",
			expectedSource: "new_delhi",
		},
		{
			id: "ENT_019",
			query: "राजीव चौक से नई दिल्ली",
			expectedSource: "rajiv_chowk",
			expectedDest: "new_delhi",
		},
		{
			id: "ENT_020",
			query: "sector 62",
			expectedDest: "noida_sector_62",
		},
		// Severe phonetical typo tolerance
    {
        id: "ENT_021",
        text: "huda cty senter se samaypur bdli",
        lang: "hi",
        expectedSource: "millennium_city_centre_gurugram", // Note: HUDA City Centre was renamed
        expectedDest: "samaypur_badli",
    },
    // Devanagari typo tolerance
    {
        id: "ENT_022",
        text: "राजीव चोक से नोयडा सेक्टर 18",
        lang: "hi",
        expectedSource: "rajiv_chowk",
        expectedDest: "noida_sector_18",
    },
    // Colloquial abbreviations (CP -> Rajiv Chowk, Hauz Khas -> HK)
    {
        id: "ENT_023",
        text: "cp to noida city centre",
        lang: "en",
        expectedSource: "rajiv_chowk",
        expectedDest: "noida_city_centre",
    },
    // Airport T1 vs T3 terminal precision
    {
        id: "ENT_024",
        text: "t3 airport se dwarka sector 21",
        lang: "hi",
        expectedSource: "igi_airport_t3",
        expectedDest: "dwarka_sector_21",
    },
    // Same source and destination (Self-loop boundary test)
    {
        id: "ENT_025",
        text: "rajiv chowk to rajiv chowk",
        lang: "en",
        expectedSource: "rajiv_chowk",
        expectedDest: "rajiv_chowk",
        expectedValidationFailure: "SAME_ORIGIN_DESTINATION",
    },
    // Mixed script (Latin + Devanagari in single utterance)
    {
        id: "ENT_026",
        text: "Rajiv Chowk से Kashmere Gate kaise jana hai",
        lang: "hi",
        expectedSource: "rajiv_chowk",
        expectedDest: "kashmere_gate",
    },
    // Station with stop-words inside station name (e.g., 'New Delhi' contains 'Delhi')
    {
        id: "ENT_027",
        text: "delhi cantt to central secretariat",
        lang: "en",
        expectedSource: "delhi_cantt",
        expectedDest: "central_secretariat",
    },
	],

	// =========================================================================
	// 3. MULTI-TURN CONVERSATIONAL FLOW CASES
	// =========================================================================
	conversations: [
		{
			id: "CONV_01",
			desc: "Slot fulfillment for missing source station",
			turns: [
				{
					userQuery: "mujhe model town jana hai",
					lang: "hi",
					expectClarification: true,
					expectMissingSlot: "source",
				},
				{
					userQuery: "jharoda se",
					lang: "hi",
					expectRouteFound: true,
					expectedSource: "jharoda_majra",
					expectedDest: "model_town",
				},
			],
		},
		{
			id: "CONV_02",
			desc: "Return journey route inversion",
			turns: [
				{
					userQuery: "kashmere gate to rajiv chowk",
					lang: "en",
					expectRouteFound: true,
					expectedSource: "kashmere_gate",
					expectedDest: "rajiv_chowk",
				},
				{
					userQuery: "wapas kaise jaye",
					lang: "hi",
					expectRouteFound: true,
					expectedSource: "rajiv_chowk",
					expectedDest: "kashmere_gate",
				},
			],
		},

		{
			id: "CONV_003",
			turns: [
				{
					userQuery: "Mujhe metro route batao",
					lang: "hi",
					expectClarification: true,
				},
				{
					userQuery: "Rajiv Chowk se Kashmere Gate",
					lang: "en",
					expectRouteFound: true,
					expectedSource: "rajiv_chowk",
					expectedDest: "kashmere_gate",
				},
			],
		},
		{
			id: "CONV_004",
			turns: [
				{
					userQuery: "Rajiv Chowk se Botanical Garden",
					lang: "en",
					expectRouteFound: true,
					expectedSource: "rajiv_chowk",
					expectedDest: "botanical_garden",
				},
				{
					userQuery: "Ab return route batao",
					lang: "hi",
					expectRouteFound: true,
					expectedSource: "botanical_garden",
					expectedDest: "rajiv_chowk",
				},
			],
		},
		{
			id: "CONV_005",
			turns: [
				{
					userQuery: "Rajiv Chowk se Noida Sector 62",
					lang: "en",
					expectRouteFound: true,
				},
				{
					userQuery: "Nahi, Botanical Garden tak",
					lang: "en",
					expectRouteFound: true,
					expectedSource: "rajiv_chowk",
					expectedDest: "botanical_garden",
				},
			],
		},
		{
			id: "CONV_006",
			turns: [
				{
					userQuery: "Hello",
					lang: "en",
				},
				{
					userQuery: "Nearest metro station",
					lang: "en",
					expectClarification: true,
				},
			],
		},

		// Source correction mid-flow (Slot update without resetting destination)
    {
        id: "CONV_007",
        desc: "User changes their mind about origin station",
        turns: [
            {
                userQuery: "How to go to Noida Sector 18",
                lang: "en",
                expectClarification: true,
                expectMissingSlot: "source",
                expectedDest: "noida_sector_18",
            },
            {
                userQuery: "from Rajiv Chowk",
                lang: "en",
                expectRouteFound: true,
                expectedSource: "rajiv_chowk",
                expectedDest: "noida_sector_18",
            },
            {
                userQuery: "Wait, actually I am at Chandni Chowk",
                lang: "en",
                expectRouteFound: true,
                expectedSource: "chandni_chowk",
                expectedDest: "noida_sector_18",
            },
        ],
    },
    // Follow-up context queries (Fare/Time on previously resolved route)
    {
        id: "CONV_008",
        desc: "Contextual follow-up on active session route",
        turns: [
            {
                userQuery: "rajiv chowk to kashmere gate",
                lang: "en",
                expectRouteFound: true,
                expectedSource: "rajiv_chowk",
                expectedDest: "kashmere_gate",
            },
            {
                userQuery: "aur kiraya kitna hai?",
                lang: "hi",
                expectedIntent: "FARE_ENQUIRY",
                expectPreservedSlots: true,
                expectedSource: "rajiv_chowk",
                expectedDest: "kashmere_gate",
            },
            {
                userQuery: "time kitna lagega",
                lang: "hi",
                expectedIntent: "TIME_DISTANCE",
                expectPreservedSlots: true,
            },
        ],
    },
    // Interrupted conversational branch (Context recovery)
    {
        id: "CONV_009",
        desc: "Interruption via greeting and resuming missing slot",
        turns: [
            {
                userQuery: "botanical garden jana hai",
                lang: "hi",
                expectClarification: true,
                expectMissingSlot: "source",
            },
            {
                userQuery: "arre hello suno",
                lang: "hi",
                expectedIntent: "GREETING",
                expectPreservedSlotInFlight: "botanical_garden",
            },
            {
                userQuery: "kalka ji mandir se hu",
                lang: "hi",
                expectRouteFound: true,
                expectedSource: "kalkaji_mandir",
                expectedDest: "botanical_garden",
            },
        ],
    },


	],

	// =========================================================================
	// 4. MULTI-NETWORK PORTABILITY CASES
	// =========================================================================
	networks: [
		{
			cityKey: "delhi_ncr",
			query: "rajiv chowk to kashmere gate",
			lang: "en",
			expectedSource: "rajiv_chowk",
			expectedDest: "kashmere_gate",
		},
		{
			cityKey: "mumbai",
			query: "ghatkopar to versova",
			lang: "en",
			expectedSource: "mmopl_1_ghatkopar",
			expectedDest: "mmopl_1_versova",
		},
		{
			cityKey: "bengaluru",
			query: "majestic to indiranagar",
			lang: "en",
			expectedSource: "nadaprabhu_kempegowda_station_majestic",
			expectedDest: "indira_nagar",
		},

		{
        cityKey: "mumbai",
        query: "andheri to ghatkopar",
        lang: "en",
        expectedSource: "mmopl_1_andheri",
        expectedDest: "mmopl_1_ghatkopar",
    },
    // Bengaluru (Namma Metro Purple Line ➔ Green Line)
    {
        cityKey: "bengaluru",
        query: "whitefield to mg road",
        lang: "en",
        expectedSource: "whitefield_kadugodi",
        expectedDest: "mahatma_gandhi_road",
    },
    // Hyderabad Metro portability check
    {
        cityKey: "hyderabad",
        query: "miyapur to ameerpet",
        lang: "en",
        expectedSource: "hmrl_miyapur",
        expectedDest: "hmrl_ameerpet",
    },
	],

	// =========================================================================
	// 5. PERFORMANCE SLA TARGETS
	// =========================================================================
	performanceSLA: {
		maxResolutionTimeMs: 60, // Maximum allowed latency per query resolution
		offlineStrict: true, // Zero network fetch allowed
	},
};
