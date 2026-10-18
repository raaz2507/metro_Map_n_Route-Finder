/**
 * ============================================================================
 * METRO AUDIT HUB - UNIVERSAL TRANSIT MASTER SCHEMA SPECIFICATION (v4.0)
 * ============================================================================
 * Architecture  : 3-Tier Enterprise Decoupled Multilingual Standard (Single City Pack)
 * 
 * Target Destination 1: data/<country>/cities/<city>/transit_network.json (Pure Graph, Topology & Fares)
 * Target Destination 2: data/<country>/cities/<city>/station_details.json (Pure Amenities & Operational Facts)
 * Target Destination 3: locales/<lang>/<country>/<city>.json (Unified Multilingual City Locale Pack)
 * ============================================================================
 */


// ============================================================================
// FILE 1: TRANSIT NETWORK MASTER SCHEMA (transit_network.json)
// ============================================================================
// Primary consumer: Routing algorithms (Dijkstra, A*), Interactive Map Canvas,
// Fare engines, and Line topology managers. Zero descriptive bloat.
export const TransitNetworkMasterSchema = {

	// ------------------------------------------------------------------------
	// 1. GLOBAL CITY-LEVEL DEFAULTS
	// ------------------------------------------------------------------------
	// Fallback attributes applied when individual stations omit specific values.
	defaults: {
		// Open Location Code 4-character regional prefix (Dynamic per city)
		// Delhi NCR: "7JWV" | Mumbai: "7JFJ" | Bengaluru: "7J4V" | Kolkata: "7MR8"
		// Chennai: "7M58"   | Hyderabad: "7J9W" | Kochi: "7J2W"  | Ahmedabad: "7JMJ"
		// Pune: "7JCM"      | Lucknow/Kanpur: "7MV5" | Jaipur: "7JRV"
		defaultPlusCodePrefix: "<string: 4_char_regional_olc_prefix>",

		// Baseline station classification
		// MULTIPLE VALUES: "normal" | "interchange"
		stationType: "normal",

		// Baseline physical station construction layout
		// MULTIPLE VALUES: "elevated" | "underground" | "at-grade"
		layout: "elevated"
	},

	// ------------------------------------------------------------------------
	// 2. FARE RULES & OPERATOR REGISTRY (FARE ENGINE)
	// ------------------------------------------------------------------------
	fareRules: {                     
		currency: "INR",                        // ISO 4217 Currency Code ("INR", "USD", etc.)

		// OPERATOR REGISTRY (Keyed by unique network identifier slug)
		networks: {
			"<network_id_slug>": {              // e.g. "dmrc", "ncrtc", "nmrc", "mmrcl", "bmrc"
				operator: "<string: full_official_agency_name>", // e.g. "Delhi Metro Rail Corporation"
				avgSpeedMetersPerMin: "<integer: meters_per_minute>", // e.g. 600 (Metro ~36 km/h), 1100 (RRTS ~66 km/h)
				stationHaltMinutes: "<float: dwell_time_minutes>"     // e.g. 0.5 (30 sec dwell), 0.75 (45 sec dwell)
			}
		},

		// FARE POLICIES & CALCULATION ENGINES
		policies: {
			"<policy_id_slug>": {               // e.g. "dmrc_standard", "airport_express", "ncrtc_standard"
				network: "<string: network_id_ref>",
				effectiveFrom: "<date_string: YYYY-MM-DD>",

				// FARE MODEL ENUM
				// MULTIPLE VALUES:
				// - "distance_based"       : Calculated based on track distance slabs (km/m)
				// - "station_count_based"  : Calculated based on station hop count (minStations / maxStations)
				// - "station_pair"         : Exact matrix lookups between origin and destination
				// - "flat_fare"            : Single uniform price regardless of distance (e.g. Ring Line, Tram)
				// - "zone_based"           : Tariff determined by crossing concentric geographical zones
				fareModel: "distance_based",

				calculation: {
					// MULTIPLE VALUES: "km" | "m" | "stations"
					distanceUnit: "km",
					// MULTIPLE VALUES: "nearest" | "floor" | "ceil" | "exact"
					rounding: "nearest"
				},

				// DEDICATED ONLINE SMART CARD TOP-UP PORTAL (Keep blank "" if agency only recharges via counters/apps)
				rechargeUrl: "<url_string_or_empty_string: official_agency_smart_card_topup_portal>",

				// TARIFF TABLES (Applicable for "distance_based" and "station_count_based")
				// Multiple tariff tables support weekday vs holiday vs peak pricing
				fareTables: {
					"weekday": [
						// For distance_based: { minKm: 0, maxKm: 2, fare: 10 }
						// For station_count_based: { minStations: 1, maxStations: 2, fare: 10 }
					],
					"holiday": [
						// Weekend / Sunday / Public holiday discounted slabs
					]
				},
				// STATION-PAIR 2D MATRIX (Applicable when fareModel === "station_pair")
				// Enterprise Compact Standard: Ordered stations index array + N x N 2D Fare Matrix
				stations: [
					"<station_id_1>",
					"<station_id_2>",
					"<station_id_n>"
				],
				fareMatrix: [
					// Row index corresponds to origin station in 'stations' array
					// Column index corresponds to destination station in 'stations' array
					[0, 20, 30], // Row 0 (origin: station_id_1 -> all destinations)
					[20, 0, 10], // Row 1 (origin: station_id_2 -> all destinations)
					[30, 10, 0]  // Row 2 (origin: station_id_n -> all destinations)
				],

				// --------------------------------------------------------------------
				// TICKETING PRODUCTS & PASSES SCHEMA SPECIFICATION
				// --------------------------------------------------------------------
				// 100% Lean & Language-Neutral: Strictly numbers, enums, rules, and IDs.
				// Human-readable titles, UI bullets and descriptions decouple into i18n / City Locale Packs.
				products: {
					// 1. भौतिक टोकन (Physical Contactless Single Journey Token)
					token: {
						// MULTIPLE VALUES: "base" | "discount" | "flat_pass" | "digital" | "interoperable"
						type: "base",
						validityMinutes: "<integer: entry_validity_post_purchase_minutes>" // e.g. 20 (purchase to AFC gate tap-in)
					},

					// 2. मेट्रो स्मार्ट कार्ड (Stored Value Contactless Smart Card)
					smart_card: {
						type: "discount",
						baseProduct: "token",                                             // Parent product reference
						discountPercent: "<number: base_discount_percentage>",            // e.g. 10
						weekendDiscountPercent: "<number_or_null: weekend_holiday_discount_percent>", // e.g. 25
						minRecharge: "<integer: min_topup_amount_currency_units>",        // e.g. 100
						maxRecharge: "<integer: max_balance_cap_currency_units>",         // e.g. 2000
						minBalance: "<integer: min_required_balance_to_tap_in>",          // e.g. 50
						refundableDeposit: "<integer: security_deposit_amount>",          // e.g. 50
						validityYears: "<integer: validity_years_from_last_recharge>",    // e.g. 10
						rechargeUrl: "<url_string: official_agency_smart_card_topup_portal>", // e.g. "https://dmrcsmartcard.com/"
						maxTravelTimeMinutes: {
							sameStation: "<integer: max_minutes_if_exiting_same_station>", // e.g. 20
							otherStation: "<integer: max_minutes_to_complete_journey>"     // e.g. 180
						},
						overstayPenaltyPerHour: "<integer_or_null: penalty_per_hour_overstayed>", // e.g. 10
						maxOverstayPenalty: "<integer_or_null: max_penalty_cap>"                  // e.g. 50
					},

					// 3. ऑफ-पीक स्मार्ट कार्ड (Off-Peak Hours Extra Discount)
					off_peak_smart_card: {
						type: "discount",
						baseProduct: "smart_card",
						discountPercent: "<number: additional_off_peak_discount_percentage>", // e.g. 10
						timeRule: "off_peak"                                                  // Mapped to timeRules.off_peak window
					},

					// 4. 1-दिवसीय टूरिस्ट कार्ड (1-Day Unlimited Transit Pass)
					tourist_card_1day: {
						type: "flat_pass",
						cost: "<integer: upfront_purchase_price>",                            // e.g. 200
						travelValue: "<integer: actual_travel_value_loaded>",                 // e.g. 150
						refundableDeposit: "<integer: deposit_refunded_on_card_return>",      // e.g. 50
						validityDays: "<integer: active_calendar_duration_days>",             // e.g. 1
						maxRides: "<integer_or_null: max_rides_cap_null_means_unlimited>",    // null = Unlimited
						excludedLines: [                                                      // Disallowed line_id_slugs
							"<string: line_id_slug>"                                          // e.g. "airport_express"
						]
					},

					// 5. 3-दिवसीय टूरिस्ट कार्ड (3-Day Unlimited Transit Pass)
					tourist_card_3day: {
						type: "flat_pass",
						cost: "<integer: upfront_purchase_price>",                            // e.g. 500
						travelValue: "<integer: usable_travel_credit>",                       // e.g. 450
						refundableDeposit: "<integer: security_deposit>",                     // e.g. 50
						validityDays: "<integer: duration_days>",                             // e.g. 3
						maxRides: "<integer_or_null: max_rides_cap_null_means_unlimited>",    // null = Unlimited
						excludedLines: [
							"<string: line_id_slug>"
						]
					},

					// 6. ट्रिप / मासिक पास (Trip / Monthly Commuter Pass e.g. MMOPL Mumbai 45-Trips)
					trip_pass_45: {
						type: "trip_pass",
						trips: "<integer: total_trips_allowed>",                              // e.g. 45
						validityDays: "<integer: duration_validity_days>",                    // e.g. 30
						discountPercent: "<number_or_null: percentage_discount>"              // e.g. 20
					},

					// 7. विशेष रियायती पास (Concession Pass: Students, Senior Citizens, Divyangjan)
					concessions: {
						type: "concession",
						discountPercent: "<number: concession_discount_percentage>",          // e.g. 25
						categories: [                                                         // Eligible passenger categories
							"<string: category_key>"                                          // "student", "senior_citizen", "divyangjan"
						]
					},

					// 8. डिजिटल क्यूआर टिकट (Paperless QR Ticket via Mobile App / WhatsApp / Web)
					qr_ticket: {
						type: "digital",
						validityMinutes: "<integer: gate_entry_validity_window_minutes>",     // e.g. 60
						discountPercent: "<number: percentage_discount_vs_token>",            // e.g. 0 or 20
						channels: [                                                           // Supported purchase channels
							"<string: channel_slug>"                                          // e.g. "official_app", "whatsapp", "paytm", "amazon_pay"
						],
						// Direct Booking & Ingestion Channels (v4.1 Multi-Channel Integration)
						whatsappUrl: "<url_string_or_empty_string: official_agency_whatsapp_bot_url>", // e.g. "https://wa.me/919650855800?text=Hi"
						bookingUrl: "<url_string_or_empty_string: official_agency_web_qr_booking_portal>", // e.g. "https://dmrc.easymetro.in/"
						appUrl: "<url_string_or_empty_string: official_agency_mobile_app_download_url>"    // e.g. "https://play.google.com/store/apps/details?id=com.dmrc.travel"
					},

					// 9. नेशनल कॉमन मोबिलिटी कार्ड (RuPay NCMC Interoperable Standard)
					ncmc_card: {
						type: "interoperable",
						discountPercent: "<number: ncmc_discount_percentage>",                // e.g. 10
						weekendDiscountPercent: "<number_or_null: weekend_discount_percent>", // e.g. 25
						minBalance: "<integer: min_bank_account_wallet_balance>"              // e.g. 50
					}
				},

				// TIME WINDOWS FOR DYNAMIC PRICING
				timeRules: {
					"off_peak": [
						{ start: "00:00", end: "08:00" },
						{ start: "12:00", end: "17:00" },
						{ start: "21:00", end: "23:59" }
					]
				},
				// TIME & STAY RESTRICTION RULES (Same-station exit & Overstay Penalty)
				"stationStayRules": {
				  "sameStationExitFare": 10,              // उसी स्टेशन से बाहर निकलने का मिनिमम किराया (₹)
				  "sameStationTimeLimitMinutes": 20,       // उसी स्टेशन से बाहर निकलने की समय-सीमा (20 मिनट)
				  "differentStationTimeLimitMinutes": 120, // यात्रा पूरी करने की अधिकतम समय-सीमा (120 मिनट)
				  "overstayPenaltyPerHour": 10,           // समय-सीमा समाप्त होने पर प्रति घंटा पेनल्टी (₹10/घंटा)
				  "maxOverstayPenalty": 50                // अधिकतम पेनल्टी कैप (अधिकतम ₹50)
				}
			}
		}
	},

// ------------------------------------------------------------------------
	// 3. STATION TYPES TAXONOMY (GLOBAL ENUM REFERENCE)
	// ------------------------------------------------------------------------
	// Registered station classification enum:
	// "normal" | "interchange" | "walkway" | "multimodal" | "shared_track"
	// NOTE: Decoupled into main_project/lang/<lang>/map.js -> legend.stationTypes.
	// Core transit_network.json does NOT store display strings for station types.
	// MULTIPLE REGISTERED TYPES:
	// - normal       : Regular single line passenger boarding station
	// - interchange  : Multi-line interchange within a single station complex
	// - walkway      : Connected via external skywalk, FOB, or travelators (Foot transfer)
	// - multimodal   : Integrated mega-hub (Metro + RRTS + Indian Railways + ISBT + Airport)
	// - shared_track : Multiple lines physically running on the identical railway track
	// - terminal     : Dead-end route terminus with reversing sidings
	// - depot        : Maintenance yard / train stabling facility
		

	// ------------------------------------------------------------------------
	// 4. LINES REGISTRY (TOPOLOGICAL LINE DEFINITIONS)
	// ------------------------------------------------------------------------
	lines: {
		"<line_id_slug>": {                     // Pattern: "{network}.{line_name}" e.g. "dmrc.red", "ncrtc.namo_bharat"
			id: "<string: unique_line_id>",
			network: "<string: network_id_ref>",
			operator: "<string: operator_id_ref>",
			label: "<string: short_badge>",     // e.g. "1", "2", "Red", "Blue", "Line 1", "M1"
			// NOTE: Line names, short names & badges are strictly decoupled into:
			// locales/<lang>/<country>/<city>/transit.json -> lines.<line_id_slug>

			color: "<string: hex_color_code>",   // e.g. "#C60C30", "#0066CC"
			color_name: "<string: color_keyword>",// e.g. "red", "blue", "yellow", "aqua", "green", "violet"

			// FARE POLICY SLUG (Links this transit line to a policy under fareRules.policies)
			farePolicy: "<string: fare policy>", // e.g. "dmrc_standard", "airport_express", "nmrc_standard"
			// LINE DISPLAY STYLE
			// MULTIPLE VALUES:
			// - "solid"  : Operational revenue line
			// - "dashed" : Under construction (Phase 4 / extensions)
			// - "dotted" : Planned / Proposed DPR
			style: "solid",

			route: {
				from: "<string: origin_station_id>",
				to: "<string: destination_station_id>"
			},

			// ORDERED TOPOLOGY: Strict sequential array of station IDs from start to terminus
			stations: [
				"<station_id_1>",
				"<station_id_2>",
				"<station_id_n>"
			]
		}
	},

	// ------------------------------------------------------------------------
	// 5. TRANSFERS ENGINE (PHYSICAL INTERCHANGE FOOTPATHS)
	// ------------------------------------------------------------------------
	// Graph edges for multi-line foot transit between platform complexes.
	transfers: {
		"<station_id>": {
			"<from_line_id>": {
				"<station_id>:<to_line_id>": {
					// MULTIPLE TRANSFER TYPES:
					// - "interchange"    : Internal concourse / cross-platform transfer
					// - "walkway"        : Skywalk / Foot-Over-Bridge traversal
					// - "travelator"     : Mechanized moving pedestrian walkway
					// - "out_of_station" : Requires tap-out and re-entry via street (virtual transfer)
					type: "interchange",

					// MULTIPLE TRANSFER MODES:
					// - "vertical"        : Elevator / Escalator / Stairs level change
					// - "horizontal"      : Same floor concourse walking
					// - "cross_platform"  : Same platform island, zero walking cost
					// - "walkway"         : Dedicated aerial corridor
					transfer_mode: "vertical",

					distance_meters: "<integer: walking_distance_in_meters>", // e.g. 40, 150, 450
					levels: "<integer: floor_levels_traversed>",               // e.g. 0 (same level), 1, 2, 3
					walking_time_min: "<float: estimated_walking_minutes>"    // e.g. 1.5, 3.0, 6.5
				}
			}
		}
	},

	// ------------------------------------------------------------------------
	// 6. STATION DATA (GRAPH NODES / VERTICES ONLY)
	// ------------------------------------------------------------------------
	stationData: {
		"<station_id_slug>": {                  // Canonical unique slug (lowercase, alphanumeric_underscore)
			id: "<string: unique_station_id>",

			// OFFICIAL AGENCY STATION CODE (Optional: Omit if agency does not publish codes, e.g. DMRC)
			// MULTIPLE VALUES: "<string: 2_to_4_char_agency_code>" (NCRTC: "Z00", Mumbai: "CUP") | omit
			code: "<string_or_omit: agency_code>",

		
			// Station names are 100% decoupled into:
			// locales/<lang>/<country>/<city>/transit.json -> stations.<station_id_slug>
			// Zero inline names or fallback objects allowed in transit_network.json.

			// PASSING LINE REFERENCES
			// MULTIPLE PATTERNS:
			// - Single Line              : ["dmrc.red"]
			// - Multi-Line Interchange   : ["dmrc.yellow", "dmrc.blue_main"]
			// - Multi-Agency Transit Hub : ["dmrc.blue_main", "ncrtc.delhi_meerut_rrts"]
			// - Tri-Line Mega Junction   : ["dmrc.red", "dmrc.yellow", "dmrc.violet"]
			lines: [
				"<string: line_id_1>",
				"<string: line_id_2>"
			],

			// STATION-SPECIFIC PHYSICAL PROPERTIES
			properties: {
				// PHYSICAL CIVIL STRUCTURE
				// MULTIPLE VALUES:
				// - "elevated"      : Pillar-supported viaduct structure (Standard across Indian Metros)
				// - "underground"   : Deep bored tunnel / subterranean station
				// - "at-grade"      : Surface level railway alignment
				// - "cut_and_cover" : Sub-surface shallow box excavation
				// - "multi_level"   : Hybrid bi-level (e.g. Elevated concourse with underground platforms)
				layout: "elevated",

				// OPERATIONAL REVENUE STATUS
				// MULTIPLE VALUES:
				// - "operational"        : Active revenue service
				// - "under_construction" : Civil/track works active (Phase 4 / Extensions)
				// - "planned"            : Approved in DPR / under tendering
				// - "temporarily_closed" : Temporarily shut for maintenance, security, or flooding
				// - "decommissioned"     : Permanently abandoned or closed historical station
				status: "operational",

				// STATION CLASSIFICATION (Optional override for root defaults.stationType)
				// MULTIPLE VALUES: "normal" | "interchange" | "walkway" | "multimodal" | "shared_track"
				station_type: "normal"
			},

			// PLATFORM BERTHING & OPERATIONAL LINE ASSIGNMENTS
			platforms: {
				"<platform_number_key>": {      // e.g. "1", "2", "3", "4"
					line: "<string: line_id_ref>",
					destination: "<string_or_empty: terminal_station_id>", // Terminus direction trains head towards (e.g. "rithala")
					is_open: "<boolean: true_if_platform_operational>",    // Default: true (false if platform shuttered/under construction)
					lounge: "<boolean: true_if_premium_lounge_available>"  // Default: false (e.g. Namo Bharat RRTS Premium Lounge)
				}
			},

			// TOPOLOGICAL GRAPH EDGES (Dijkstra / A* Neighbors)
			neighbors: [
				{
					station: "<string: adjacent_station_id>",
					line: "<string: traversing_line_id>",
					// Distance & Travel Time: STRICTLY OPTIONAL (Omit if agency does not provide authentic track meters)
					distance: "<integer_or_omit: track_distance_meters>",
					travel_time_sec: "<integer_or_omit: nominal_seconds_run>"
				}
			],

			// AUTHENTIC TRI-COORDINATE GIS CONTAINER
			// STRICT GOVERNANCE: If transit authority does NOT provide official GPS coordinates,
			// the entire 'location' key MUST BE OMITTED. Zero synthetic or guessed coordinates allowed.
			location: "<object_or_omit: { decimal: { lat: float, lon: float }, plusCode?: string, dms?: { lat: string, lon: string } }>",

			// REVENUE TRAIN SERVICE TIMINGS
			train_schedule: {
				first_train: "<time_string: HH:MM:SS>",             // Weekday first revenue train
				last_train: "<time_string: HH:MM:SS>",              // Weekday last revenue train
				sunday_first_train: "<time_string_or_null>",        // Sunday specific timings (null if identical)
				sunday_last_train: "<time_string_or_null>"
			}
		}
	}
};



// ============================================================================
// FILE 2: STATION DETAILS MASTER SCHEMA (station_details.json)
// ============================================================================
// Primary consumer: Passenger Information System (PIS), Station Detail Page,
// Accessibility modules, Wayfinding, Facility search, and Parking fee estimators.
export const StationDetailsMasterSchema = {
	"<station_id_slug>": {                      // Matches exact slug from stationData
		id: "<string: unique_station_id>",

		// --------------------------------------------------------------------
		// 1. PHYSICAL STATION GATE OPENING & CLOSING HOURS
		// --------------------------------------------------------------------
		timings: {
			opening: "<time_string: HH:MM:SS>", // Physical station gate opening time (e.g. "05:30:00")
			closing: "<time_string: HH:MM:SS>"  // Physical station gate shutdown time (e.g. "23:30:00")
		},

		// --------------------------------------------------------------------
		// 2. PASSENGER ORIENTATION & STATION OVERVIEW
		// --------------------------------------------------------------------
		// NOTE: Human-readable narrative descriptions are 100% decoupled into:
		// locales/<lang>/<country>/<city>/station_details.json -> <station_id>.description

		// --------------------------------------------------------------------
		// 3. LOCAL STATION CONTACTS (CONTROL ROOM & LANDLINE)
		// --------------------------------------------------------------------
		// Note: Network-wide helplines (CISF, Police 112, Women Safety, Customer Care)
		// are maintained centrally at network-level in passenger_support.json.
		contact: {
			mobile: "<string: station_control_room_mobile_or_empty>", // e.g. "8800793101", "9289928744"
			landline: "<string: station_pabx_landline_or_empty>"      // e.g. "7290049044", ""
		},

		// --------------------------------------------------------------------
		// 4. ENTRY / EXIT GATES (WITH MICRO-GIS & ACCESSIBILITY)
		// --------------------------------------------------------------------
		gates: {
			"<gate_number_or_code>": {          // e.g. "1", "2", "3", "GA1", "Main"
				code: "<string: official_gate_code>", // e.g. "GA1", "Gate 1"
				divyang: "<boolean: true_if_wheelchair_accessible_at_this_gate>",

				// GATE STATUS ENUM
				// MULTIPLE VALUES:
				// - "open"       : Bidirectional Entry & Exit permitted
				// - "closed"     : Gate shuttered / non-operational
				// - "entry_only" : Only passenger check-in permitted (no exit)
				// - "exit_only"  : Only passenger egress permitted (no entry)
				status: "open",

				// MICRO-GIS COORDINATES (Progressive Enrichment: For future door-to-door pedestrian routing)
				// Empty strings "" are standard placeholders until ground audit coordinates are populated
				coordinates: {
					latitude: "<float_or_empty_string: gate_wgs84_lat>", // e.g. 28.549376 or ""
					longitude: "<float_or_empty_string: gate_wgs84_lon>"  // e.g. 77.047083 or ""
				},

				
				// Landmarks and directional texts are 100% decoupled into:
				// locales/<lang>/<country>/<city>/station_details.json -> <station_id>.gates.<gate_id>.landmark
				// Only structural facts (code, divyang accessibility, operational status, coordinates) remain here.
				
			}
		},

		// --------------------------------------------------------------------
		// 5. PHYSICAL PARKING LOTS (CAPACITY & GATE CO-LOCATION)
		// --------------------------------------------------------------------
		parkings: [
			{
				provider: "<string: operating_authority>", // e.g. "DMRC Authorised", "NCRTC Authorised", "MCD", "Private"
				capacity_car: "<integer: four_wheeler_capacity>",
				capacity_motorcycle: "<integer: two_wheeler_capacity>",
				capacity_cycle: "<integer: bicycle_capacity>",
				code: "<string: lot_code>",                // e.g. "PA1", "PA2"
				location: "<string: gate_relative_location>" // e.g. "Near Gate Number-02"
			}
		],

		// --------------------------------------------------------------------
		// 6. ULTRA-RICH PARKING TARIFFS (SLABS, NIGHT SURCHARGE, PASSES, HELMET)
		// --------------------------------------------------------------------
		// Preserves exact micro-tariff rate cards without data loss.
		parkingCharges: {
			state: "<string: tax_jurisdiction_state>",     // e.g. "Delhi", "Uttar Pradesh", "Haryana"
			currency: "INR",
			symbol: "₹",
			rates: {
				// FOUR WHEELER TARIFF SLABS
				four_wheeler: {
					day_charges: [
						{
							min_minutes: "<integer: slab_start_minutes>", // e.g. 0, 10, 360, 720
							max_minutes: "<integer: slab_end_minutes>",   // e.g. 10, 360, 720, 1440
							tag: "<string: user_friendly_label>",         // e.g. "Pick-up / Drop Off", "Up to 6 Hours"
							fare: "<number: tariff_amount>"               // e.g. 0, 50, 80, 100
						}
					],
					night_charges: [
						{
							min_minutes: 0,
							max_minutes: 300,
							tag: "Night Surcharge (00:00 - 05:00)",
							fare: "<number: night_tariff_amount>"
						}
					],
					monthly_passes: {
						day_only:  { timing: "05:00 - 23:00", fare: "<number: monthly_pass_amount>" },
						full_24_7: { timing: "24/7",          fare: "<number: round_clock_pass_amount>" }
					}
				},

				// TWO WHEELER TARIFF SLABS
				two_wheeler: {
					day_charges: [
						{ min_minutes: 0,   max_minutes: 10,   tag: "Pick-up / Drop Off", fare: 0 },
						{ min_minutes: 10,  max_minutes: 360,  tag: "Up to 6 Hours",      fare: 20 },
						{ min_minutes: 360, max_minutes: 720,  tag: "6 to 12 Hours",      fare: 30 },
						{ min_minutes: 720, max_minutes: 1440, tag: "12 to 24 Hours",     fare: 50 }
					],
					night_charges: [
						{ min_minutes: 0, max_minutes: 300, tag: "Night Surcharge", fare: 100 }
					],
					monthly_passes: {
						day_only:  { timing: "05:00 - 23:00", fare: 600 },
						full_24_7: { timing: "24/7",          fare: 1000 }
					}
				},

				// HELMET DEPOSIT CHARGES (Mandatory two-wheeler amenity in Indian transit)
				helmet: [
					{ min_minutes: 0,   max_minutes: 720,  tag: "Up to 12 Hours",  fare: 5 },
					{ min_minutes: 720, max_minutes: 1440, tag: "12 to 24 Hours", fare: 10 }
				],

				// BICYCLE STAND CHARGES (Eco-transit encouragement)
				bicycle: [
					{ min_minutes: 0,   max_minutes: 360,  tag: "Up to 6 Hours",  fare: 5 },
					{ min_minutes: 360, max_minutes: 1440, tag: "6 to 24 Hours", fare: 10 }
				]
			}
		},

		// --------------------------------------------------------------------
		// 7. COMPREHENSIVE CATEGORIZED PASSENGER FACILITIES (FACTS ONLY)
		// --------------------------------------------------------------------
		// ARCHITECTURE & LOCALIZATION RULE:
		// 1. Category keys & common locations are GLOBAL TAXONOMIES.
		//    Do NOT localize them per station. They are mapped in main_project/lang/<lang>/station_info.js:
		//    Example:
		//      facilityCategories: { "Toilet": "शौचालय", "Shop/Office": "दुकान / कार्यालय", "ATM": "एटीएम" }
		//      locationTerms:      { "Paid concourse": "पेड कॉनकोर्स", "Near Gate no. 1": "गेट नंबर 1 के पास" }
		// 2. Specific brand/vendor names remain factual proper nouns directly here:
		//    Example core entry:
		//      "Toilet": [{ "name": "Sulabh Toilet", "location": "Near Gate no. 1", "purpose": "Sanitation" }]
		//      "Shop/Office": [{ "name": "Food Track IRCTC", "location": "Paid concourse", "purpose": "Snacks & Drinks" }]
		facilities: {
			"<facility_category_key>": [
				{
					name: "<string: facility_brand_or_label>",          // e.g. "Sulabh Toilet", "PNB ATM", "Food Track IRCTC"
					location: "<string: concourse_or_gate_location>",   // e.g. "Near Gate no. 1", "Paid concourse", "Platform 1"
					purpose: "<string_or_omit: secondary_purpose_note>" // e.g. "Coffee, snacks, Eatables"
				}
			]
		},

		// --------------------------------------------------------------------
		// 8. NEARBY PLACES WITH PEDESTRIAN & TRANSIT ACCESS METRICS
		// --------------------------------------------------------------------
		// ARCHITECTURE & LOCALIZATION RULE:
		// 1. POI Category keys are GLOBAL TAXONOMIES mapped centrally in main_project/lang/<lang>/station_info.js:
		//    Example:
		//      placeCategories: { "Hospital": "अस्पताल", "Police Station": "पुलिस थाना", "Market": "बाजार" }
		// 2. Institutional place names remain factual ground-truth entities here in core:
		//    Example core entry:
		//      "University/College": [{ "name": "Shyam Lal College, Delhi University", "distance_km": 0.8, "walking_min": 6.0 }]
		//      "Police Station":     [{ "name": "Shahdara Police Station", "distance_km": 0.9, "walking_min": 8.0 }]
		// 3. Translated prominent destination waypoints for navigation belong in:
		//    locales/<lang>/<country>/<city>.json -> stations.<id>.landmarks: ["श्याम लाल कॉलेज", "शाहदरा पुलिस स्टेशन"]
		nearby_places: {
			"<place_category_key>": [
				{
					name: "<string: POI_name>",                         // e.g. "Shyam Lal College, Delhi University", "GTB Hospital"
					distance_km: "<float: aerial_or_road_km>",          // e.g. 0.8, 1.3
					connected: "<boolean>",                             // true (Direct FOB/Skywalk) | false
					walking_min: "<integer_or_null: walking_minutes>",  // e.g. 6.0
					pub_transport_min: "<integer_or_null: transit_min>" // e.g. 3.0
				}
			]
		},

		// --------------------------------------------------------------------
		// 9. VERTICAL TRANSIT (LIFTS & ESCALATORS WITH ACCESSIBILITY STATUS)
		// --------------------------------------------------------------------
		vertical_transit: {
			lifts: {
				"<lift_id_key>": {              // e.g. "1", "2", "3"
					code: "<string: lift_code>", // e.g. "LF1", "LIFT_01"
					name: "<string: descriptive_name>",
					location: "<string: physical_shaft_location>", // e.g. "Concourse to Platform 1", "Ground Entrance Gate 1"

					// SHAFT PLACEMENT ENUM
					// MULTIPLE VALUES:
					// - "Inside"  : Located inside paid concourse (requires ticket to enter)
					// - "Outside" : Located on street level / unpaid concourse (accessible to public)
					placement: "Inside",

					divyang_friendly: "<boolean: true_if_wheelchair_accessible_and_braille_buttons>",
					// MULTIPLE VALUES: true (Supports hospital stretcher for emergency medical transit) | false
					is_stretcher_lift: "<boolean>",

					// OPERATIONAL LIFECYCLE STATUS
					// MULTIPLE VALUES: true (Operational) | false (Under maintenance / Breakdown)
					status: "<boolean>",
					last_update: "<date_string_or_empty: YYYY-MM-DD>" // Audit timestamp
				}
			},
			escalators: {
				"<escalator_id_key>": {         // e.g. "1", "2", "3"
					code: "<string: escalator_code>", // e.g. "EC1", "ESC_01"
					name: "<string: descriptive_name>", // e.g. "C2-E1", "Gate 1 Escalator"
					location: "<string: physical_location>", // e.g. "Concourse to Platform 1", "Ground to Concourse"
					
					// MULTIPLE VALUES: "Inside" | "Outside"
					placement: "Inside",

					// TRAVEL DIRECTION ENUM
					// MULTIPLE VALUES:
					// - "Up"            : Ascending only
					// - "Down"          : Descending only
					// - "bidirectional" : Reversible flow based on peak passenger rush
					direction: "Up",

					// ACCESSIBILITY & INCLUSION
					divyang_friendly: "<boolean: true_if_step_free_or_wheelchair_compatible>",

					status: "<boolean: true_if_running>",
					last_update: "<date_string_or_empty: YYYY-MM-DD>"
				}
			}
		},

		// --------------------------------------------------------------------
		// 10. MULTI-LEVEL ARCHITECTURAL FLOOR PLANS
		// --------------------------------------------------------------------
		// Detailed level-by-level schematics for multi-story transit structures.
		stationLayout: [
			{
				// LEVEL ENUM
				// MULTIPLE VALUES:
				// - "ground"     : Street entrance, drop-off, bus bays
				// - "concourse"  : Ticket counters, AFC gates, security screening
				// - "mezzanine"  : Intermediate interchange walkway
				// - "platform"   : Train berthing tracks
				// - "platform_1" : Specific track level 1
				// - "platform_2" : Specific track level 2
				level: "concourse",
				name: "<string: level_title>",            // e.g. "Concourse Level (Ticketing & Security)"
				layout_url: "<string: image_or_svg_url>", // High-res map asset
				pdf_url: "<string_or_empty: downloadable_schematic_pdf>"
			}
		],

		// --------------------------------------------------------------------
		// 11. LAST-MILE CONNECTIVITY (FEEDER BUS ROUTES)
		// --------------------------------------------------------------------
		// Surface transport integration connecting outer catchment neighborhoods.
		feederBusRouteInfo: [
			{
				route_name: "<string: bus_route_code>",   // e.g. "FB-01", "MF-102"
				origin: "<string: route_start_terminal>",
				destination: "<string: route_end_terminal>",
				first_bus: "<time_string: HH:MM:SS>",
				last_bus: "<time_string: HH:MM:SS>",
				frequency_min: "<integer: headway_minutes>" // e.g. 10, 15, 20
			}
		],

		// --------------------------------------------------------------------
		// 12. OFFICIAL MEDIA, IMAGES & EXTERNAL PORTAL LINKS
		// --------------------------------------------------------------------
		media: {
			images: {
				png: "<url_string: high_res_station_photo_or_empty>",
				jpg: "<url_string: compressed_station_photo_or_empty>",
				thumb: "<url_string: thumbnail_preview_or_empty>"
			},
			banner: "<url_string: hero_header_banner_or_empty>",
			infoLink: "<url_string: official_agency_station_webpage_or_empty>"
		}
	}
};


// ============================================================================
// FILE 3: LOCALIZED CITY TRANSIT CONTENT SCHEMA (locales/<lang>/<country>/<city>_station_details_locale.json)
// ============================================================================
// Primary consumer: i18n & MetroDataStore Name Resolvers.
// Single consolidated city locale pack: Zero operational bloat, zero duplicate meta.
// Fully encapsulates city-level networks, lines, and station-specific human narratives.
export const LocalizedTransitPackSchema = {
	// Transit network operators display titles
	networks: {
		"<network_id_slug>": "<string: translated_agency_name>" // e.g. "dmrc": "दिल्ली मेट्रो"
	},

	// Fare Policy Tabs display titles (e.g. Line 1, Airport Express, Namo Bharat)
	policies: {
		"<policy_id_slug>": "<string: translated_policy_title>" // e.g. "dmrc_standard": "दिल्ली मेट्रो (DMRC)", "mmopl_line1": "लाइन 1 (वर्सोवा - घाटकोपर)"
	},

	// Line names and badges
	lines: {
		"<line_id_slug>": {
			name: "<string: full_translated_line_name>",       // e.g. "लाइन 2 - येलो लाइन - समयपुर बादली से मिलेनियम सिटी सेंटर"
			short_name: "<string: short_badge_or_line_name>"   // e.g. "येलो लाइन"
		}
	},

	// Station entity encapsulation (Names, aliases, descriptions, gate landmarks & local waypoints)
	stations: {
		"<station_id_slug>": {
			name: "<string: translated_station_name>",         // e.g. "राजीव चौक"
			aliases: [
				"<string: localized_alias>"                    // e.g. "कनॉट प्लेस", "सीपी"
			],
			description: "<string_or_empty: station_narrative_context>", // e.g. "ब्लू और येलो लाइन का प्रमुख भूमिगत इंटरचेंज स्टेशन।"
			gates: {
				"<gate_number_or_code>": "<string: landmark_directional_text>" // e.g. "1": "कनॉट प्लेस ब्लॉक-बी"
			},
			landmarks: [
				"<string: prominent_local_landmark>"           // e.g. "पालिका बाजार", "सेंट्रल पार्क"
			]
		}
	}
};