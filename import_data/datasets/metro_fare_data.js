export const obj = {
	fareNetworks: {
		// =========================================================================
		// 1. DELHI NCR (6 Lines)
		// =========================================================================
		delhi_ncr: {
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
			},

			fareRules: {
				currency: "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Keyed by unique network identifier slug)
				networks: {
					dmrc: {
						operator: "Delhi Metro Rail Corporation",
						avgSpeedMetersPerMin: 550, // ~33 km/h commercial speed
						stationHaltMinutes: 0.5, // 30 seconds average dwell time
					},
					nmrc: {
						operator: "Noida Metro Rail Corporation",
						avgSpeedMetersPerMin: 550,
						stationHaltMinutes: 0.5,
					},
					gmda: {
						operator: "Gurugram Metropolitan Development Authority / DMRC",
						avgSpeedMetersPerMin: 500,
						stationHaltMinutes: 0.4,
					},
					ncrtc: {
						operator: "National Capital Region Transport Corporation",
						avgSpeedMetersPerMin: 1100, // RRTS high speed (~66 km/h avg)
						stationHaltMinutes: 0.75,
					},
				},

				// FARE POLICIES & CALCULATION ENGINES
				policies: {
					// 1.1 DMRC Main Network Standard Distance Slabs
					dmrc_standard: {
						network: "dmrc",
						effectiveFrom: "2025-08-25", // Latest fare revision notification
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 2, fare: 11 },
								{ minKm: 2, maxKm: 5, fare: 21 },
								{ minKm: 5, maxKm: 12, fare: 32 },
								{ minKm: 12, maxKm: 21, fare: 43 },
								{ minKm: 21, maxKm: 32, fare: 54 },
								{ minKm: 32, maxKm: null, fare: 64 },
							],
							holiday: [
								// Discounted slabs for Sundays and National Holidays
								{ minKm: 0, maxKm: 2, fare: 11 },
								{ minKm: 2, maxKm: 5, fare: 11 },
								{ minKm: 5, maxKm: 12, fare: 21 },
								{ minKm: 12, maxKm: 21, fare: 32 },
								{ minKm: 21, maxKm: 32, fare: 43 },
								{ minKm: 32, maxKm: null, fare: 54 },
							],
						},
						products: {
							token: {
								type: "base",
								label: {
									en: "Token / Paper QR Ticket",
									hi: "टोकन / पेपर क्यूआर टिकट",
								},
							},
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 10, // Standard 10% off for Smart Card
								timeRule: null,
								label: {
									en: "Smart Card / DMRC App QR",
									hi: "स्मार्ट कार्ड / ऐप क्यूआर टिकट",
								},
							},
							smart_card_off_peak: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 20, // 20% off during off-peak windows
								timeRule: "off_peak",
								label: {
									en: "Smart Card Off-Peak Discount",
									hi: "स्मार्ट कार्ड ऑफ-पीक छूट",
								},
							},
						},
						timeRules: {
							off_peak: [
								{ start: "00:00", end: "08:00" },
								{ start: "12:00", end: "17:00" },
								{ start: "21:00", end: "23:59" },
							],
						},
						 // Stay and Overstay penalty rules as per official DMRC business guidelines
						"stationStayRules": {
							"sameStationExitFare": 11,              // उसी स्टेशन से निकलने का मिनिमम किराया
							"sameStationTimeLimitMinutes": 20,       // उसी स्टेशन से बाहर निकलने की समय-सीमा (20 मिनट)
							"differentStationTimeLimitMinutes": 180, // लंबी यात्राओं के लिए अधिकतम समय (180 मिनट / 3 घंटे)
							"overstayPenaltyPerHour": 10,           // समय-सीमा समाप्त होने पर पेनल्टी (₹10 प्रति घंटा)
							"maxOverstayPenalty": 50                // अधिकतम पेनल्टी सीमा (अधिकतम ₹50)
						}
					},

					// 1.2 Airport Express Line (Station-Pair 2D Matrix)
					dmrc_airport_express: {
						network: "dmrc",
						effectiveFrom: "2025-08-25",
						fareModel: "station_pair",
						calculation: {
							distanceUnit: "km",
							rounding: "exact",
						},
						stations: [
							"NDLS", // New Delhi Railway Station
							"SHIVAJI", // Shivaji Stadium
							"DHAULA_KUAN", // Dhaula Kuan
							"AEROCITY", // Delhi Aerocity
							"IGI_T3", // Airport Terminal 3
							"DWARKA_21", // Dwarka Sector 21
							"YASHOBHOOMI_25", // Yashobhoomi Dwarka Sector 25
						],
						fareMatrix: [
							// NDLS, SHIVAJI, DHAULA, AEROCITY, IGI_T3, DWARKA_21, YASHOBHOOMI_25
							[0, 10, 20, 40, 50, 60, 75], // NDLS
							[10, 0, 10, 30, 40, 50, 60], // SHIVAJI
							[20, 10, 0, 20, 30, 40, 50], // DHAULA_KUAN
							[40, 30, 20, 0, 20, 30, 40], // AEROCITY
							[50, 40, 30, 20, 0, 20, 30], // IGI_T3
							[60, 50, 40, 30, 20, 0, 20], // DWARKA_21
							[75, 60, 50, 40, 30, 20, 0], // YASHOBHOOMI_25
						],
						products: {
							token: {
								type: "base",
								label: {
									en: "Airport Token / QR",
									hi: "एयरपोर्ट टोकन / क्यूआर",
								},
							},
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 10,
								timeRule: null,
								label: {
									en: "Smart Card (10% Off)",
									hi: "स्मार्ट कार्ड (10% छूट)",
								},
							},
						},
						"timeRules": null,
						// Stay rules for Airport Express Line
						"stationStayRules": {
							"sameStationExitFare": 10,
							"sameStationTimeLimitMinutes": 20,
							"differentStationTimeLimitMinutes": 120, // 2 घंटे की समय-सीमा
							"overstayPenaltyPerHour": 10,
							"maxOverstayPenalty": 50
						}
					},

					// 1.3 Noida Metro Aqua Line (Station-Count Based)
					nmrc_aqua_line: {
						network: "nmrc",
						effectiveFrom: "2019-01-26",
						fareModel: "station_count_based",
						calculation: {
							distanceUnit: "stations",
							rounding: "exact",
						},
						fareTables: {
							weekday: [
								{ minStations: 1, maxStations: 1, fare: 10 },
								{ minStations: 2, maxStations: 2, fare: 15 },
								{ minStations: 3, maxStations: 6, fare: 20 },
								{ minStations: 7, maxStations: 9, fare: 30 },
								{ minStations: 10, maxStations: 16, fare: 40 },
								{ minStations: 17, maxStations: 99, fare: 50 },
							],
							holiday: [
								{ minStations: 1, maxStations: 1, fare: 10 },
								{ minStations: 2, maxStations: 2, fare: 10 },
								{ minStations: 3, maxStations: 6, fare: 15 },
								{ minStations: 7, maxStations: 9, fare: 20 },
								{ minStations: 10, maxStations: 16, fare: 30 },
								{ minStations: 17, maxStations: 99, fare: 40 },
							],
						},
						products: {
							token: {
								type: "base",
								label: {
									en: "Paper QR Ticket",
									hi: "पेपर क्यूआर टिकट",
								},
							},
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 10,
								timeRule: null,
								label: {
									en: "NMRC Smart Card (10% Off)",
									hi: "एनएमआरसी स्मार्ट कार्ड (10% छूट)",
								},
							},
						},

						"timeRules": null,
						// Stay rules for Noida Metro Aqua Line
						"stationStayRules": {
							"sameStationExitFare": 10,
							"sameStationTimeLimitMinutes": 20,
							"differentStationTimeLimitMinutes": 90,  // 90 मिनट की यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,
							"maxOverstayPenalty": 50
						}
					},

					// 1.4 Rapid Metro Gurugram (Phase-based Slabs)
					rapid_metro_gurugram: {
						network: "gmda",
						effectiveFrom: "2020-01-01",
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 6, fare: 20 },
								{ minKm: 6, maxKm: 99, fare: 35 },
							],
							holiday: [
								{ minKm: 0, maxKm: 6, fare: 20 },
								{ minKm: 6, maxKm: 99, fare: 35 },
							],
						},
						products: {
							token: {
								type: "base",
								label: {
									en: "DMRC Token / QR",
									hi: "डीएमआरसी टोकन / क्यूआर",
								},
							},
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 10,
								timeRule: null,
								label: {
									en: "DMRC Smart Card",
									hi: "डीएमआरसी स्मार्ट कार्ड",
								},
							},
						},
						"timeRules": null,
						// Stay rules for Rapid Metro Gurugram
							"stationStayRules": {
								"sameStationExitFare": 20,              // बेस किराया ₹20
								"sameStationTimeLimitMinutes": 20,
								"differentStationTimeLimitMinutes": 60,  // 60 मिनट की लूप यात्रा
								"overstayPenaltyPerHour": 10,
								"maxOverstayPenalty": 50
							}
					},

					// 1.5 Namo Bharat RRTS (Standard vs Premium Tiers)
					// NOTE: Premium Coach uses a multiplier of 1.2 on the base ticket price
					namo_bharat_rrts: {
						network: "ncrtc",
						effectiveFrom: "2023-10-21",
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 5, fare: 20 },
								{ minKm: 5, maxKm: 15, fare: 30 },
								{ minKm: 15, maxKm: 25, fare: 40 },
								{ minKm: 25, maxKm: 35, fare: 60 },
								{ minKm: 35, maxKm: 45, fare: 90 },
								{ minKm: 45, maxKm: 60, fare: 110 },
								{ minKm: 60, maxKm: 99, fare: 210 },
							],
						},
						products: {
							standard_qr: {
								type: "base",
								label: {
									en: "Standard Coach Ticket / eQR",
									hi: "स्टैंडर्ड कोच टिकट / ई-क्यूआर",
								},
							},
							premium_coach: {
								type: "concession",
								baseProduct: "standard_qr",
								multiplier: 1.2, // 20% surcharge for Premium Class
								label: {
									en: "Premium Lounge & Coach",
									hi: "प्रीमियम लाउंज एवं कोच",
								},
							},
							smart_card: {
								type: "discount",
								baseProduct: "standard_qr",
								discountPercent: 10,
								timeRule: null,
								label: {
									en: "Namo Bharat Smart Card",
									hi: "नमो भारत स्मार्ट कार्ड",
								},
							},
						},
						"timeRules": null,
						// Stay rules for Namo Bharat High-Speed RRTS
						"stationStayRules": {
							"sameStationExitFare": 20,              // मिनिमम टिकट ₹20
							"sameStationTimeLimitMinutes": 30,       // 30 मिनट का स्टेशन स्टे
							"differentStationTimeLimitMinutes": 120, // 120 मिनट की कॉरिडोर यात्रा
							"overstayPenaltyPerHour": 20,           // ₹20 प्रति घंटा पेनल्टी
							"maxOverstayPenalty": 100
						}
					},

					// 1.6 Meerut Metro
					meerut_metro: {
						network: "ncrtc",
						effectiveFrom: "2025-01-01",
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 3, fare: 10 },
								{ minKm: 3, maxKm: 6, fare: 20 },
								{ minKm: 6, maxKm: 12, fare: 30 },
								{ minKm: 12, maxKm: 18, fare: 40 },
								{ minKm: 18, maxKm: 99, fare: 60 },
							],
						},
						products: {
							token: {
								type: "base",
								label: {
									en: "Standard Token / QR",
									hi: "स्टैंडर्ड टोकन / क्यूआर",
								},
							},
						},
						"timeRules": null,
						// Stay rules for Meerut Metro
						"stationStayRules": {
							"sameStationExitFare": 10,
							"sameStationTimeLimitMinutes": 20,
							"differentStationTimeLimitMinutes": 90,
							"overstayPenaltyPerHour": 10,
							"maxOverstayPenalty": 50
						}
					},
				},
			},
		},

		// =========================================================================
		// 2. MUMBAI (4 Lines)
		// =========================================================================
		mumbai: {
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
			},
			fareRules: {
				currency: "INR",

				// OPERATOR REGISTRY (Mumbai)
				networks: {
					mmopl: {
						operator: "Mumbai Metro One Private Limited (MMOPL)",
						avgSpeedMetersPerMin: 550,
						stationHaltMinutes: 0.5,
					},
					mmmocl: {
						operator: "Maha Mumbai Metro Operation Corporation Ltd",
						avgSpeedMetersPerMin: 550,
						stationHaltMinutes: 0.5,
					},
					mmrcl: {
						operator: "Mumbai Metro Rail Corporation Limited",
						avgSpeedMetersPerMin: 550,
						stationHaltMinutes: 0.5,
					},
					cidco: {
						operator: "City and Industrial Development Corporation / Maha Metro",
						avgSpeedMetersPerMin: 500,
						stationHaltMinutes: 0.5,
					},
					mmrda_monorail: {
						operator: "Mumbai Metropolitan Region Development Authority (MMRDA)",
						avgSpeedMetersPerMin: 350,
						stationHaltMinutes: 0.75,
						status: "suspended", // ⚠️ Suspended since 20 Sep 2025
					},
				},

				// FARE POLICIES & CALCULATION ENGINES
				policies: {
					// 2.1 Mumbai Metro Line 1 (Versova - Ghatkopar Corridor)
					mmopl_line_1: {
						network: "mmopl",
						effectiveFrom: "2024-01-01",
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 3, fare: 10 },
								{ minKm: 3, maxKm: 8, fare: 20 },
								{ minKm: 8, maxKm: 99, fare: 30 }, // Capped at ₹30
							],
						},
						products: {
							token: {
								type: "base",
								label: {
									en: "Token / Paper QR",
									hi: "टोकन / पेपर क्यूआर",
								},
							},
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 5, // 5% discount on Metro One Card
								timeRule: null,
								label: {
									en: "Metro One Smart Card (5% Off)",
									hi: "मेट्रो वन स्मार्ट कार्ड (5% छूट)",
								},
							},
						},

						"timeRules": null,

						// Stay rules as per official MMOPL guidelines
						"stationStayRules": {
							"sameStationExitFare": 10,              // 20 मिनट के अंदर उसी स्टेशन से एग्जिट
							"sameStationTimeLimitMinutes": 20,       // उसी स्टेशन की समय-सीमा (20 मिनट)
							"differentStationTimeLimitMinutes": 75,  // लाइन 1 (11.4 km) के लिए 75 मिनट समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा ओवरस्टे चार्ज
							"maxOverstayPenalty": 50                // अधिकतम पेनल्टी कैप (₹50)
						}
					},

					// 2.2 & 2.3 MMRDA Standard (Unified Tariff for Lines 2A, 7 & 3 Aqua Line)
					mmrda_standard: {
						network: "mmmocl",
						effectiveFrom: "2023-01-20",
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 3, fare: 10 },
								{ minKm: 3, maxKm: 12, fare: 20 },
								{ minKm: 12, maxKm: 18, fare: 30 },
								{ minKm: 18, maxKm: 24, fare: 40 },
								{ minKm: 24, maxKm: 30, fare: 50 },
								{ minKm: 30, maxKm: 36, fare: 60 },
								{ minKm: 36, maxKm: 42, fare: 70 },
								{ minKm: 42, maxKm: 99, fare: 80 },
							],
						},
						products: {
							qr_ticket: {
								type: "base",
								label: {
									en: "Paper / Mobile QR Ticket",
									hi: "पेपर / मोबाइल क्यूआर टिकट",
								},
							},
							mumbai_1_card: {
								type: "discount",
								baseProduct: "qr_ticket",
								discountPercent: 10, // 10% discount on NCMC Card
								timeRule: null,
								label: {
									en: "Mumbai 1 NCMC Card (10% Off)",
									hi: "मुंबई 1 एनसीएमसी कार्ड (10% छूट)",
								},
							},
						},

						"timeRules": null,

						// Stay rules as per official MMRDA / MMMOCL guidelines
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम किराया
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट
							"differentStationTimeLimitMinutes": 120, // 120 मिनट (2 घंटे) की यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा पेनल्टी
							"maxOverstayPenalty": 50                // अधिकतम ₹50
						}

					},

					// 2.4 Navi Mumbai Metro Line 1 (Belapur to Pendhar)
					cidco_navi_mumbai: {
						network: "cidco",
						effectiveFrom: "2024-09-07", // CIDCO revised fare structure
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 4, fare: 10 },
								{ minKm: 4, maxKm: 8, fare: 20 },
								{ minKm: 8, maxKm: 99, fare: 30 }, // Capped at ₹30
							],
						},
						products: {
							qr_ticket: {
								type: "base",
								label: {
									en: "Standard QR Ticket",
									hi: "स्टैंडर्ड क्यूआर टिकट",
								},
							},
						},


						"timeRules": null,

						// Stay rules as per official CIDCO / Maha Metro guidelines
						"stationStayRules": {
							"sameStationExitFare": 10,
							"sameStationTimeLimitMinutes": 20,
							"differentStationTimeLimitMinutes": 90,  // 90 मिनट की समय-सीमा
							"overstayPenaltyPerHour": 10,
							"maxOverstayPenalty": 50
						}
					},

					// 2.5 Mumbai Monorail (Chembur ↔ Sant Gadge Maharaj Chowk)
					// ⚠️ SERVICE SUSPENDED since 20 Sep 2025 — CBTC upgrade & new rolling stock
					// Last effective fares (2018–2025). New fare pending official MMRDA notification on relaunch.
					mmrda_monorail_standard: {
						network: "mmrda_monorail",
						effectiveFrom: "2018-01-01",
						effectiveTo: "2025-09-20", // Suspended on this date
						status: "suspended",
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						fareTables: {
							weekday: [
								{ minKm: 0,  maxKm: 3,  fare: 10 },
								{ minKm: 3,  maxKm: 12, fare: 20 },
								{ minKm: 12, maxKm: 18, fare: 30 },
								{ minKm: 18, maxKm: 99, fare: 40 }, // Max cap ₹40
							],
						},
						products: {
							token: {
								type: "base",
								label: {
									en: "Single Journey Token",
									hi: "सिंगल जर्नी टोकन",
								},
							},
						},
						timeRules: null,
						stationStayRules: {
							sameStationExitFare: 10,
							sameStationTimeLimitMinutes: 20,
							differentStationTimeLimitMinutes: 60, // Short corridor ~20 km
							overstayPenaltyPerHour: 10,
							maxOverstayPenalty: 40,
						},
					},
				},
			},
		},

		// =========================================================================
		// 3. KOLKATA (1 Line)
		// =========================================================================
		kolkata: {
			3.1: {
				name: "Kolkata Metro",
				operator: "Metro Railway Kolkata",
				fareType: "distance_slab",
			},

			fareRules: {
				currency: "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Metro Railway Kolkata - Ministry of Railways)
				networks: {
					metro_railway_kolkata: {
						operator: "Metro Railway, Kolkata (Indian Railways)",
						avgSpeedMetersPerMin: 550, // Commercial speed ~33 km/h
						stationHaltMinutes: 0.5, // Standard dwell time (30 seconds)
					},
				},

				// FARE POLICIES & CALCULATION ENGINES
				policies: {
					// 3.1 Kolkata Metro Official 5-Zone Distance Tariff
					kolkata_metro_standard: {
						network: "metro_railway_kolkata",
						effectiveFrom: "2019-12-05", // Official Gazette notification
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						// Official 5-Zone Distance Slabs (Blue, Green, Purple, Orange corridors)
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 2, fare: 5 }, // Zone 1: 0 to 2 km
								{ minKm: 2, maxKm: 5, fare: 10 }, // Zone 2: 2 to 5 km
								{ minKm: 5, maxKm: 10, fare: 15 }, // Zone 3: 5 to 10 km
								{ minKm: 10, maxKm: 20, fare: 20 }, // Zone 4: 10 to 20 km
								{ minKm: 20, maxKm: 99, fare: 25 }, // Zone 5: Above 20 km
							],
						},
						products: {
							// Single Journey Paper Token / eQR
							token: {
								type: "base",
								label: {
									en: "Single Journey Token / Paper QR",
									hi: "सिंगल जर्नी टोकन / पेपर क्यूआर",
								},
							},
							// Metro Smart Card (Offers 10% bonus value on every recharge)
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 10,
								timeRule: null,
								label: {
									en: "Metro Smart Card (10% Recharge Bonus)",
									hi: "मेट्रो स्मार्ट कार्ड (10% बोनस छूट)",
								},
							},
						},
						"timeRules": null,

						// Stay rules as per Metro Railway Kolkata guidelines
						"stationStayRules": {
							"sameStationExitFare": 5,                // 20 मिनट के अंदर उसी स्टेशन से एग्जिट
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट
							"differentStationTimeLimitMinutes": 120, // 120 मिनट की यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा पेनल्टी
							"maxOverstayPenalty": 50
						}

					},
				},
			},
		},

		// =========================================================================
		// 4. BENGALURU (1 Line)
		// =========================================================================
		bengaluru: {
			4.1: {
				name: "Namma Metro",
				operator: "BMRCL",
				fareType: "distance_slab",
			},

			fareRules: {
				currency: "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Bangalore Metro Rail Corporation Limited)
				networks: {
					bmrcl: {
						operator: "Bangalore Metro Rail Corporation Limited (BMRCL)",
						avgSpeedMetersPerMin: 550, // Average commercial speed ~33 km/h
						stationHaltMinutes: 0.5, // Standard dwell time (30 seconds)
					},
				},

				// FARE POLICIES & CALCULATION ENGINES
				policies: {
					// 4.1 Namma Metro Official 10-Zone Distance Tariff
					bmrcl_standard: {
						network: "bmrcl",
						effectiveFrom: "2026-02-09", // Official BMRCL Fare Revision Notification
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						// Official 10-Zone Distance Slabs
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 2, fare: 11 }, // Zone F1: 0 to 2 km
								{ minKm: 2, maxKm: 4, fare: 21 }, // Zone F2: 2 to 4 km
								{ minKm: 4, maxKm: 6, fare: 32 }, // Zone F3: 4 to 6 km
								{ minKm: 6, maxKm: 8, fare: 42 }, // Zone F4: 6 to 8 km
								{ minKm: 8, maxKm: 10, fare: 53 }, // Zone F5: 8 to 10 km
								{ minKm: 10, maxKm: 15, fare: 63 }, // Zone F6: 10 to 15 km
								{ minKm: 15, maxKm: 20, fare: 74 }, // Zone F7: 15 to 20 km
								{ minKm: 20, maxKm: 25, fare: 84 }, // Zone F8: 20 to 25 km
								{ minKm: 25, maxKm: 99, fare: 95 }, // Zone F9/F10: Above 25 km
							],
						},
						products: {
							// Single Journey Token or Paper QR Ticket
							token: {
								type: "base",
								label: {
									en: "Single Journey Token / Paper QR",
									hi: "सिंगल जर्नी टोकन / पेपर क्यूआर",
								},
							},
							// Varshik Contactless Smart Card / NCMC (5% standard peak discount)
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 5,
								timeRule: null,
								label: {
									en: "Varshik Smart Card / NCMC (5% Off)",
									hi: "वार्षिक स्मार्ट कार्ड / एनसीएमसी (5% छूट)",
								},
							},
							// Varshik Card Off-Peak Discount (10% discount during non-peak hours)
							smart_card_off_peak: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 10,
								timeRule: "off_peak",
								label: {
									en: "Smart Card Off-Peak Discount (10% Off)",
									hi: "स्मार्ट कार्ड ऑफ-पीक छूट (10% छूट)",
								},
							},
						},
						// Dynamic non-peak hours for BMRCL
						timeRules: {
							off_peak: [
								{ start: "00:00", end: "08:00" }, // Morning opening till 08:00
								{ start: "12:00", end: "16:00" }, // Afternoon 12:00 to 16:00
								{ start: "21:00", end: "23:59" }, // Night 21:00 till closing
							],
						},
						// Stay rules as per official BMRCL guidelines
						"stationStayRules": {
							"sameStationExitFare": 11,              // बेस किराया
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट
							"differentStationTimeLimitMinutes": 120, // 120 मिनट की यात्रा समय-सीमा
							"overstayPenaltyPerHour": 50,           // BMRCL में ₹50 का फिक्स पेनल्टी चार्ज है
							"maxOverstayPenalty": 50
						},
						// Dynamic non-peak hours for BMRCL
						timeRules: {
							off_peak: [
								{ start: "00:00", end: "08:00" }, // Morning opening till 08:00
								{ start: "12:00", end: "16:00" }, // Afternoon 12:00 to 16:00
								{ start: "21:00", end: "23:59" }, // Night 21:00 till closing
							],
						},
					},
				},
			},
		},

		// =========================================================================
		// 5. HYDERABAD (1 Line)
		// =========================================================================
		hyderabad: {
			5.1: {
				name: "Hyderabad Metro",
				operator: "HMRL",
				fareType: "distance_slab",
			},

			fareRules: {
				currency: "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (L&T Metro Rail Hyderabad / HMRL)
				networks: {
					hmrl: {
						operator: "L&T Metro Rail (Hyderabad) Limited / HMRL",
						avgSpeedMetersPerMin: 550, // Average commercial speed ~33 km/h
						stationHaltMinutes: 0.5, // Standard dwell time (30 seconds)
					},
				},

				// FARE POLICIES & CALCULATION ENGINES
				policies: {
					// 5.1 Hyderabad Metro Official Distance Slabs
					hmrl_standard: {
						network: "hmrl",
						effectiveFrom: "2025-05-24", // Official Tariff Revision Notification
						fareModel: "distance_based",
						calculation: {
							distanceUnit: "km",
							rounding: "nearest",
						},
						// Official 10 Distance Slabs (Red, Blue & Green Corridors)
						fareTables: {
							weekday: [
								{ minKm: 0, maxKm: 2, fare: 12 }, // 0 to 2 km
								{ minKm: 2, maxKm: 4, fare: 18 }, // 2 to 4 km
								{ minKm: 4, maxKm: 6, fare: 30 }, // 4 to 6 km
								{ minKm: 6, maxKm: 9, fare: 40 }, // 6 to 9 km
								{ minKm: 9, maxKm: 12, fare: 50 }, // 9 to 12 km
								{ minKm: 12, maxKm: 15, fare: 55 }, // 12 to 15 km
								{ minKm: 15, maxKm: 18, fare: 60 }, // 15 to 18 km
								{ minKm: 18, maxKm: 21, fare: 66 }, // 18 to 21 km
								{ minKm: 21, maxKm: 24, fare: 70 }, // 21 to 24 km
								{ minKm: 24, maxKm: 99, fare: 75 }, // Above 24 km
							],
						},
						products: {
							// Single Journey Token / Paper QR
							token: {
								type: "base",
								label: {
									en: "Single Journey Token / Paper QR",
									hi: "सिंगल जर्नी टोकन / पेपर क्यूआर",
								},
							},
							// Hyderabad Metro Smart Card / TSavaari App QR (10% Discount)
							smart_card: {
								type: "discount",
								baseProduct: "token",
								discountPercent: 10,
								timeRule: null,
								label: {
									en: "Nebula Smart Card / TSavaari QR (10% Off)",
									hi: "स्मार्ट कार्ड / टीसवारी क्यूआर (10% छूट)",
								},
							},
						},

						"timeRules": null,

						// Stay rules as per official L&T Metro / HMRL guidelines
						"stationStayRules": {
							"sameStationExitFare": 12,              // मिनिमम टिकट ₹12
							"sameStationTimeLimitMinutes": 30,       // हैदराबाद में 30 मिनट का समय मिलता है
							"differentStationTimeLimitMinutes": 90,  // 90 मिनट की यात्रा सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					},
				},
			},
		},



		// =========================================================================
		// 6. CHENNAI (1 Line)
		// =========================================================================
		"chennai": {
			"6.1": {
				"name": "Chennai Metro",
				"operator": "CMRL",
				"fareType": "distance_slab"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Chennai Metro Rail Limited)
				"networks": {
					"cmrl": {
						"operator": "Chennai Metro Rail Limited (CMRL)",
						"avgSpeedMetersPerMin": 550, // Average commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 6.1 Chennai Metro Standard Distance Slabs (Capped at ₹50)
					"cmrl_standard": {
						"network": "cmrl",
						"effectiveFrom": "2021-02-22", // Official notification capping maximum fare at ₹50
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Official Distance Slabs (Blue & Green Lines)
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 2, "fare": 10 },   // 0 to 2 km
								{ "minKm": 2, "maxKm": 5, "fare": 20 },   // 2 to 5 km
								{ "minKm": 5, "maxKm": 12, "fare": 30 },  // 5 to 12 km
								{ "minKm": 12, "maxKm": 21, "fare": 40 }, // 12 to 21 km
								{ "minKm": 21, "maxKm": 99, "fare": 50 }  // Above 21 km (Maximum ₹50)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// CMRL Travel Card / NCMC / WhatsApp QR (Flat 20% discount on all journeys)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 20, // 20% discount
								"timeRule": null,
								"label": {
									"en": "CMRL Smart Card / WhatsApp QR (20% Off)",
									"hi": "स्मार्ट कार्ड / वॉट्सऐप क्यूआर (20% छूट)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official CMRL guidelines
						"stationStayRules": {
							"sameStationExitFare": 10,
							"sameStationTimeLimitMinutes": 20,
							"differentStationTimeLimitMinutes": 120, // 120 मिनट की यात्रा सीमा
							"overstayPenaltyPerHour": 10,
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},

		
		// =========================================================================
		// 7. KOCHI (2 Lines: Rail + Water Metro)
		// =========================================================================
		"kochi": {
			"7.1": {
				"name": "Kochi Metro",
				"operator": "KMRL",
				"fareType": "distance_slab"
			},
			"7.2": {
				"name": "Kochi Water Metro",
				"operator": "KWML / KMRL",
				"fareType": "distance_slab"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY
				"networks": {
					"kmrl": {
						"operator": "Kochi Metro Rail Limited (KMRL)",
						"avgSpeedMetersPerMin": 550, // Commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					},
					"kwml": {
						"operator": "Kochi Water Metro Limited (KWML)",
						"avgSpeedMetersPerMin": 250, // Commercial ferry speed ~15 km/h (8 knots)
						"stationHaltMinutes": 1.0     // Jetty docking & dwell time (1 minute)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 7.1 Kochi Metro Rail Standard Distance Slabs
					"kmrl_standard": {
						"network": "kmrl",
						"effectiveFrom": "2017-06-19",
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Official 6 Distance Slabs (Aluva to Thripunithura Corridor)
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 2, "fare": 10 },   // 0 to 2 km
								{ "minKm": 2, "maxKm": 5, "fare": 20 },   // 2 to 5 km
								{ "minKm": 5, "maxKm": 10, "fare": 30 },  // 5 to 10 km
								{ "minKm": 10, "maxKm": 15, "fare": 40 }, // 10 to 15 km
								{ "minKm": 15, "maxKm": 20, "fare": 50 }, // 15 to 20 km
								{ "minKm": 20, "maxKm": 99, "fare": 60 }  // Above 20 km (Maximum ₹60)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// Kochi1 Smart Card (Flat 20% discount on all metro rail journeys)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 20,
								"timeRule": null,
								"label": {
									"en": "Kochi1 Smart Card (20% Off)",
									"hi": "कोच्चि1 स्मार्ट कार्ड (20% छूट)"
								}
							}
						},

						"timeRules": null,

						// Stay rules as per official KMRL guidelines
						"stationStayRules": {
							"sameStationExitFare": 10,
							"sameStationTimeLimitMinutes": 30,       // 30 मिनट
							"differentStationTimeLimitMinutes": 120, // 120 मिनट
							"overstayPenaltyPerHour": 10,
							"maxOverstayPenalty": 50
						}
					},

					// 7.2 Kochi Water Metro Distance Slabs (Electric Ferry Network)
					"kwml_water_standard": {
						"network": "kwml",
						"effectiveFrom": "2023-04-25", // Commercial launch
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Official Water Metro Slabs
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 3, "fare": 20 },  // 0 to 3 km (Base fare ₹20)
								{ "minKm": 3, "maxKm": 6, "fare": 30 },  // 3 to 6 km
								{ "minKm": 6, "maxKm": 9, "fare": 35 },  // 6 to 9 km
								{ "minKm": 9, "maxKm": 99, "fare": 40 }  // Above 9 km (Max cap ₹40)
							]
						},
						"products": {
							// Single Journey QR Ticket
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey QR Ticket",
									"hi": "सिंगल जर्नी क्यूआर टिकट"
								}
							},
							// Kochi1 Smart Card (10% discount on water metro)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "Kochi1 Smart Card (10% Off)",
									"hi": "कोच्चि1 स्मार्ट कार्ड (10% छूट)"
								}
							},
							// Weekly Pass (12 Trips)
							"weekly_pass": {
								"type": "pass",
								"price": 180,
								"label": {
									"en": "Weekly Pass (12 Trips / ₹180)",
									"hi": "साप्ताहिक पास (12 यात्राएं / ₹180)"
								}
							},
							// Monthly Pass (50 Trips)
							"monthly_pass": {
								"type": "pass",
								"price": 600,
								"label": {
									"en": "Monthly Pass (50 Trips / ₹600)",
									"hi": "मासिक पास (50 यात्राएं / ₹600)"
								}
							},
							// Quarterly Pass (150 Trips)
							"quarterly_pass": {
								"type": "pass",
								"price": 1500,
								"label": {
									"en": "Quarterly Pass (150 Trips / ₹1500)",
									"hi": "त्रैमासिक पास (150 यात्राएं / ₹1500)"
								}
							}
						},

						"timeRules": null,

						// Jetty terminal stay rules
						"stationStayRules": {
							"sameStationExitFare": 20,              // मिनिमम टिकट ₹20
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट
							"differentStationTimeLimitMinutes": 120, // 120 मिनट
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},

		// =========================================================================
		// 8. AHMEDABAD (1 Line)
		// =========================================================================
		"ahmedabad": {
			"8.1": {
				"name": "Ahmedabad Metro",
				"operator": "GMRC",
				"fareType": "distance_slab"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Gujarat Metro Rail Corporation)
				"networks": {
					"gmrc": {
						"operator": "Gujarat Metro Rail Corporation (GMRC)",
						"avgSpeedMetersPerMin": 550, // Commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 8.1 Ahmedabad Metro Official Distance Slabs (Phase 1 & Phase 2)
					"gmrc_standard": {
						"network": "gmrc",
						"effectiveFrom": "2022-09-30", // Commercial launch notification
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Official Slabs (East-West & North-South Corridors)
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 2.5, "fare": 5 },    // 0 to 2.5 km (up to 3 stations)
								{ "minKm": 2.5, "maxKm": 7.5, "fare": 10 },  // 2.5 to 7.5 km (4 to 7 stations)
								{ "minKm": 7.5, "maxKm": 12.5, "fare": 15 }, // 7.5 to 12.5 km (8 to 11 stations)
								{ "minKm": 12.5, "maxKm": 17.5, "fare": 20 },// 12.5 to 17.5 km (12 to 15 stations)
								{ "minKm": 17.5, "maxKm": 22.5, "fare": 25 },// 17.5 to 22.5 km
								{ "minKm": 22.5, "maxKm": 99, "fare": 30 }   // Above 22.5 km (Gandhinagar Phase 2)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// GMRC Contactless Smart Card / NCMC (10% Discount)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10, // 10% discount on Smart Card
								"timeRule": null,
								"label": {
									"en": "GMRC Smart Card / NCMC (10% Off)",
									"hi": "जीएमआरसी स्मार्ट कार्ड / एनसीएमसी (10% छूट)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official GMRC passenger regulations
						"stationStayRules": {
							"sameStationExitFare": 5,                // मिनिमम टिकट ₹5
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट
							"differentStationTimeLimitMinutes": 120, // 120 मिनट
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},
		// =========================================================================
		// 9. PUNE (1 Line)
		// =========================================================================
		"pune": {
			"9.1": {
				"name": "Pune Metro",
				"operator": "MahaMetro",
				"fareType": "distance_slab"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Maharashtra Metro Rail Corporation Limited)
				"networks": {
					"mahametro_pune": {
						"operator": "Maharashtra Metro Rail Corporation Limited (MahaMetro)",
						"avgSpeedMetersPerMin": 550, // Commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 9.1 Pune Metro Standard Distance Slabs (Purple & Aqua Corridors)
					"pune_metro_standard": {
						"network": "mahametro_pune",
						"effectiveFrom": "2022-03-06", // Commercial service launch
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Official Slabs (PCMC to Swargate & Vanaz to Ramwadi)
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 2, "fare": 10 },  // 0 to 2 km
								{ "minKm": 2, "maxKm": 4, "fare": 20 },  // 2 to 4 km
								{ "minKm": 4, "maxKm": 12, "fare": 30 }, // 4 to 12 km
								{ "minKm": 12, "maxKm": 18, "fare": 40 },// 12 to 18 km
								{ "minKm": 18, "maxKm": 99, "fare": 50 } // Above 18 km (Maximum ₹50)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// One Pune NCMC Smart Card (10% weekday discount)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "One Pune Smart Card (10% Off Weekdays)",
									"hi": "वन पुणे स्मार्ट कार्ड (सप्ताह के दिनों में 10% छूट)"
								}
							},
							// One Pune Card Weekend Discount (30% off on Saturdays & Sundays)
							"smart_card_weekend": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 30, // 30% off on weekends
								"timeRule": null,
								"label": {
									"en": "One Pune Weekend Discount (30% Off Sat & Sun)",
									"hi": "वन पुणे वीकेंड डिस्काउंट (शनि-रवि 30% छूट)"
								}
							},
							// One Pune Vidyarthi Pass (30% student discount on all 7 days)
							"student_pass": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 30, // 30% off daily for students
								"timeRule": null,
								"label": {
									"en": "One Pune Vidyarthi Student Pass (30% Off Daily)",
									"hi": "वन पुणे विद्यार्थी पास (प्रतिदिन 30% छात्र छूट)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official MahaMetro guidelines
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट समय-सीमा
							"differentStationTimeLimitMinutes": 120, // 120 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},

		// =========================================================================
		// 10. NAGPUR (1 Line)
		// =========================================================================
		 "nagpur": {
			"10.1": {
				"name": "Nagpur Metro",
				"operator": "MahaMetro",
				"fareType": "distance_slab"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Maharashtra Metro Rail Corporation Limited)
				"networks": {
					"mahametro_nagpur": {
						"operator": "Maharashtra Metro Rail Corporation Limited (MahaMetro)",
						"avgSpeedMetersPerMin": 550, // Commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 10.1 Nagpur Metro Standard Distance Slabs (Orange & Aqua Corridors)
					"nagpur_metro_standard": {
						"network": "mahametro_nagpur",
						"effectiveFrom": "2019-03-08", // Commercial operation launch
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Official Slabs (Khapri - Automotive Sq & Lokmanya Nagar - Prajapati Nagar)
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 2, "fare": 10 },   // 0 to 2 km
								{ "minKm": 2, "maxKm": 5, "fare": 15 },   // 2 to 5 km
								{ "minKm": 5, "maxKm": 8, "fare": 20 },   // 5 to 8 km
								{ "minKm": 8, "maxKm": 12, "fare": 25 },  // 8 to 12 km
								{ "minKm": 12, "maxKm": 16, "fare": 30 }, // 12 to 16 km
								{ "minKm": 16, "maxKm": 20, "fare": 35 }, // 16 to 20 km
								{ "minKm": 20, "maxKm": 99, "fare": 40 }  // Beyond 20 km (Max cap ₹40)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// Maha Card (10% discount on regular rides)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "Maha Card (10% Off Daily)",
									"hi": "महा कार्ड (प्रतिदिन 10% छूट)"
								}
							},
							// Weekend & Gazetted Holiday Discount (30% off across network)
							"weekend_holiday_discount": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 30,
								"timeRule": null,
								"label": {
									"en": "Weekend & Holiday Special (30% Off Sat, Sun & Holidays)",
									"hi": "वीकेंड एवं अवकाश विशेष (शनिवार, रविवार एवं छुट्टियों पर 30% छूट)"
								}
							},
							// Student Maha Card Concession (30% off for school/college students)
							"student_pass": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 30,
								"timeRule": null,
								"label": {
									"en": "Maha Card Student Concession (30% Off Daily)",
									"hi": "महा कार्ड छात्र रियायत (प्रतिदिन 30% छात्र छूट)"
								}
							},
							// 1-Day Unlimited Travel Pass
							"daily_pass": {
								"type": "pass",
								"price": 100,
								"label": {
									"en": "1-Day Unlimited Metro Pass (₹100)",
									"hi": "1-दिवसीय असीमित मेट्रो पास (₹100)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official MahaMetro Nagpur passenger charter
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 60,       // 60 मिनट समय-सीमा (MahaMetro Nagpur rule)
							"differentStationTimeLimitMinutes": 120, // 120 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},
		


		// =========================================================================
		// 11. JAIPUR (1 Line)
		// =========================================================================
		"jaipur": {
			"11.1": {
				"name": "Jaipur Metro",
				"operator": "JMRC",
				"fareType": "station_count_based"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Jaipur Metro Rail Corporation)
				"networks": {
					"jmrc": {
						"operator": "Jaipur Metro Rail Corporation (JMRC)",
						"avgSpeedMetersPerMin": 530, // Commercial speed ~32 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 11.1 Jaipur Metro Pink Line (Station Hop Count Based)
					"jaipur_metro_standard": {
						"network": "jmrc",
						"effectiveFrom": "2020-09-23", // Commercial operation with Phase 1B
						"fareModel": "station_count_based",
						"calculation": {
							"distanceUnit": "stations",
							"rounding": "exact"
						},
						// Official Slabs based on number of stations traveled
						"fareTables": {
							"weekday": [
								{ "minStations": 0, "maxStations": 2, "fare": 10 },  // 0 to 2 stations
								{ "minStations": 3, "maxStations": 5, "fare": 15 },  // 3 to 5 stations
								{ "minStations": 6, "maxStations": 8, "fare": 25 },  // 6 to 8 stations
								{ "minStations": 9, "maxStations": 10, "fare": 30 }  // 9 to 10 stations (Full line)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// JMRC Metro Smart Card (10% discount)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "JMRC Smart Card (10% Off)",
									"hi": "जेएमआरसी स्मार्ट कार्ड (10% छूट)"
								}
							},
							// 1-Day Tourist Card
							"tourist_card_1day": {
								"type": "pass",
								"price": 100,
								"label": {
									"en": "1-Day Tourist Card (₹100)",
									"hi": "1-दिवसीय टूरिस्ट कार्ड (₹100)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official JMRC passenger charter
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट समय-सीमा
							"differentStationTimeLimitMinutes": 60,  // 60 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},

		// =========================================================================
		// 12. LUCKNOW (1 Line)
		// =========================================================================
		"lucknow": {
			"12.1": {
				"name": "Lucknow Metro",
				"operator": "UPMRC",
				"fareType": "station_count_based"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Uttar Pradesh Metro Rail Corporation)
				"networks": {
					"upmrc_lucknow": {
						"operator": "Uttar Pradesh Metro Rail Corporation (UPMRC)",
						"avgSpeedMetersPerMin": 550, // Commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 12.1 Lucknow Metro Red Line (CCS Airport to Munshi Pulia)
					"lucknow_metro_standard": {
						"network": "upmrc_lucknow",
						"effectiveFrom": "2017-09-06", // Commercial operations start
						"fareModel": "station_count_based",
						"calculation": {
							"distanceUnit": "stations",
							"rounding": "exact"
						},
						// Official UPMRC Station Count Slabs
						"fareTables": {
							"weekday": [
								{ "minStations": 1, "maxStations": 1, "fare": 10 },  // 1 station
								{ "minStations": 2, "maxStations": 2, "fare": 15 },  // 2 stations
								{ "minStations": 3, "maxStations": 6, "fare": 20 },  // 3 to 6 stations
								{ "minStations": 7, "maxStations": 9, "fare": 30 },  // 7 to 9 stations
								{ "minStations": 10, "maxStations": 13, "fare": 40 },// 10 to 13 stations
								{ "minStations": 14, "maxStations": 17, "fare": 50 },// 14 to 17 stations
								{ "minStations": 18, "maxStations": 99, "fare": 60 } // 18+ stations (Max ₹60)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// GoSmart / NCMC Smart Card (10% discount on all journeys)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "GoSmart / NCMC Card (10% Off)",
									"hi": "गो-स्मार्ट / एनसीएमसी कार्ड (10% छूट)"
								}
							},
							// 1-Day Tourist Card (Unlimited travel for 1 day)
							"tourist_card_1day": {
								"type": "pass",
								"price": 100,
								"label": {
									"en": "1-Day Tourist Card (₹100)",
									"hi": "1-दिवसीय टूरिस्ट कार्ड (₹100)"
								}
							},
							// 3-Day Tourist Card (Unlimited travel for 3 days)
							"tourist_card_3day": {
								"type": "pass",
								"price": 250,
								"label": {
									"en": "3-Day Tourist Card (₹250)",
									"hi": "3-दिवसीय टूरिस्ट कार्ड (₹250)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official UPMRC passenger charter
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट समय-सीमा
							"differentStationTimeLimitMinutes": 120, // 120 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},


		// =========================================================================
		// 13. KANPUR (1 Line)
		// =========================================================================
		"kanpur": {
			"13.1": {
				"name": "Kanpur Metro",
				"operator": "UPMRC",
				"fareType": "station_count_based"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Uttar Pradesh Metro Rail Corporation)
				"networks": {
					"upmrc_kanpur": {
						"operator": "Uttar Pradesh Metro Rail Corporation (UPMRC)",
						"avgSpeedMetersPerMin": 550, // Commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 13.1 Kanpur Metro Orange Line (IIT Kanpur Corridor)
					"kanpur_metro_standard": {
						"network": "upmrc_kanpur",
						"effectiveFrom": "2021-12-28", // Priority corridor inauguration
						"fareModel": "station_count_based",
						"calculation": {
							"distanceUnit": "stations",
							"rounding": "exact"
						},
						// Standard UPMRC Station Count Slabs
						"fareTables": {
							"weekday": [
								{ "minStations": 1, "maxStations": 1, "fare": 10 },  // 1 station
								{ "minStations": 2, "maxStations": 2, "fare": 15 },  // 2 stations
								{ "minStations": 3, "maxStations": 6, "fare": 20 },  // 3 to 6 stations
								{ "minStations": 7, "maxStations": 9, "fare": 30 },  // 7 to 9 stations
								{ "minStations": 10, "maxStations": 13, "fare": 40 },// 10 to 13 stations
								{ "minStations": 14, "maxStations": 17, "fare": 50 },// 14 to 17 stations
								{ "minStations": 18, "maxStations": 99, "fare": 60 } // 18+ stations
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// GoSmart / NCMC Smart Card (10% discount)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "GoSmart / NCMC Card (10% Off)",
									"hi": "गो-स्मार्ट / एनसीएमसी कार्ड (10% छूट)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official UPMRC passenger charter
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट समय-सीमा
							"differentStationTimeLimitMinutes": 120, // 120 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},


		// =========================================================================
		// 14. AGRA (1 Line)
		// =========================================================================
		"agra": {
			"14.1": {
				"name": "Agra Metro",
				"operator": "UPMRC",
				"fareType": "station_count_based"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Uttar Pradesh Metro Rail Corporation)
				"networks": {
					"upmrc_agra": {
						"operator": "Uttar Pradesh Metro Rail Corporation (UPMRC)",
						"avgSpeedMetersPerMin": 550, // Commercial speed ~33 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 14.1 Agra Metro Yellow Line (Priority Corridor)
					"agra_metro_standard": {
						"network": "upmrc_agra",
						"effectiveFrom": "2024-03-06", // Priority corridor inauguration
						"fareModel": "station_count_based",
						"calculation": {
							"distanceUnit": "stations",
							"rounding": "exact"
						},
						// Standard UPMRC Station Count Slabs
						"fareTables": {
							"weekday": [
								{ "minStations": 1, "maxStations": 1, "fare": 10 },  // 1 station
								{ "minStations": 2, "maxStations": 2, "fare": 15 },  // 2 stations
								{ "minStations": 3, "maxStations": 6, "fare": 20 },  // 3 to 6 stations
								{ "minStations": 7, "maxStations": 9, "fare": 30 },  // 7 to 9 stations
								{ "minStations": 10, "maxStations": 13, "fare": 40 },// 10 to 13 stations
								{ "minStations": 14, "maxStations": 17, "fare": 50 },// 14 to 17 stations
								{ "minStations": 18, "maxStations": 99, "fare": 60 } // 18+ stations
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// GoSmart / NCMC Smart Card (10% discount)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "GoSmart / NCMC Card (10% Off)",
									"hi": "गो-स्मार्ट / एनसीएमसी कार्ड (10% छूट)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official UPMRC passenger charter
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट समय-सीमा
							"differentStationTimeLimitMinutes": 120, // 120 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},

		// =========================================================================
		// 15. INDORE (1 Line)
		// =========================================================================
		"indore": {
			"15.1": {
				"name": "Indore Metro",
				"operator": "Madhya Pradesh Metro Rail Corporation",
				"fareType": "distance_slab"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Madhya Pradesh Metro Rail Corporation Limited)
				"networks": {
					"mpmrcl_indore": {
						"operator": "Madhya Pradesh Metro Rail Corporation Limited (MPMRCL)",
						"avgSpeedMetersPerMin": 530, // Commercial speed ~32 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 15.1 Indore Metro Yellow Line (Super Priority Corridor)
					"indore_metro_standard": {
						"network": "mpmrcl_indore",
						"effectiveFrom": "2024-01-01", // Commercial operations phase
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Standard MPMRCL Distance Slabs
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 2, "fare": 10 },   // 0 to 2 km
								{ "minKm": 2, "maxKm": 5, "fare": 15 },   // 2 to 5 km
								{ "minKm": 5, "maxKm": 8, "fare": 20 },   // 5 to 8 km
								{ "minKm": 8, "maxKm": 12, "fare": 25 },  // 8 to 12 km
								{ "minKm": 12, "maxKm": 16, "fare": 30 }, // 12 to 16 km
								{ "minKm": 16, "maxKm": 99, "fare": 40 }  // Beyond 16 km (Max ₹40)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// NCMC / MPMRCL Smart Card (10% discount)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "MPMRCL NCMC Smart Card (10% Off)",
									"hi": "एमपीएमआरसीएल एनसीएमसी स्मार्ट कार्ड (10% छूट)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official MPMRCL passenger charter
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट समय-सीमा
							"differentStationTimeLimitMinutes": 120, // 120 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		},

		// =========================================================================
		// 16. BHOPAL (1 Line)
		// =========================================================================
		"bhopal": {
			"16.1": {
				"name": "Bhopal Metro",
				"operator": "Madhya Pradesh Metro Rail Corporation",
				"fareType": "distance_slab"
			},

			"fareRules": {
				"currency": "INR", // ISO 4217 Currency Code

				// OPERATOR REGISTRY (Madhya Pradesh Metro Rail Corporation Limited)
				"networks": {
					"mpmrcl_bhopal": {
						"operator": "Madhya Pradesh Metro Rail Corporation Limited (MPMRCL)",
						"avgSpeedMetersPerMin": 530, // Commercial speed ~32 km/h
						"stationHaltMinutes": 0.5     // Standard dwell time (30 seconds)
					}
				},

				// FARE POLICIES & CALCULATION ENGINES
				"policies": {
					// 16.1 Bhopal Metro Orange Line (Priority Corridor)
					"bhopal_metro_standard": {
						"network": "mpmrcl_bhopal",
						"effectiveFrom": "2024-01-01", // Commercial operations phase
						"fareModel": "distance_based",
						"calculation": {
							"distanceUnit": "km",
							"rounding": "nearest"
						},
						// Standard MPMRCL Distance Slabs
						"fareTables": {
							"weekday": [
								{ "minKm": 0, "maxKm": 2, "fare": 10 },   // 0 to 2 km
								{ "minKm": 2, "maxKm": 5, "fare": 15 },   // 2 to 5 km
								{ "minKm": 5, "maxKm": 8, "fare": 20 },   // 5 to 8 km
								{ "minKm": 8, "maxKm": 12, "fare": 25 },  // 8 to 12 km
								{ "minKm": 12, "maxKm": 16, "fare": 30 }, // 12 to 16 km
								{ "minKm": 16, "maxKm": 99, "fare": 40 }  // Beyond 16 km (Max ₹40)
							]
						},
						"products": {
							// Single Journey Token / Paper QR
							"token": {
								"type": "base",
								"label": {
									"en": "Single Journey Token / Paper QR",
									"hi": "सिंगल जर्नी टोकन / पेपर क्यूआर"
								}
							},
							// NCMC / MPMRCL Smart Card (10% discount)
							"smart_card": {
								"type": "discount",
								"baseProduct": "token",
								"discountPercent": 10,
								"timeRule": null,
								"label": {
									"en": "MPMRCL NCMC Smart Card (10% Off)",
									"hi": "एमपीएमआरसीएल एनसीएमसी स्मार्ट कार्ड (10% छूट)"
								}
							}
						},
						"timeRules": null,

						// Stay rules as per official MPMRCL passenger charter
						"stationStayRules": {
							"sameStationExitFare": 10,              // मिनिमम टिकट ₹10
							"sameStationTimeLimitMinutes": 20,       // 20 मिनट समय-सीमा
							"differentStationTimeLimitMinutes": 120, // 120 मिनट यात्रा समय-सीमा
							"overstayPenaltyPerHour": 10,           // ₹10 प्रति घंटा
							"maxOverstayPenalty": 50
						}
					}
				}
			}
		}
	},
};
