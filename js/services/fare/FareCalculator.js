/**
 * 🚇 Universal Fare Calculator Engine
 * Enterprise ES2022 OOP Class with Strategy Pattern & Private Encapsulation (#)
 * 
 * विशेषताएँ:
 * 1. 100% Universal: किसी भी नेटवर्क या शहर का नाम हार्डकोड नहीं है।
 * 2. Dynamic Strategy Pattern: data.json में लिखे 'fareModel' के आधार पर गणना करता है:
 *    - 'distance_based' (DMRC, NMRC, Bangalore, etc. दूरी स्लैब)
 *    - 'station_pair' / 'matrix' (Airport Express, Point-to-point)
 *    - 'station_count_based' (स्टेशनों की संख्या पर आधारित)
 *    - 'flat_rate' (फिक्स किराया)
 * 3. Class / Coach Support: Standard Coach vs Premium Coach (NCRTC RRTS / Meerut Metro).
 * 4. Product Discounts: Token, Smart Card, Off-Peak Smart Card (Dynamic from JSON).
 * 5. Multi-Segment Aggregation: जब यात्रा दो अलग-अलग फेयर नीतियों वाली लाइनों से होकर गुज़रे।
 */

export class FareCalculator {
	// Private State Fields
	#fareRules = null;
	#policies = null;
	#currency = "INR";
	#strategies = new Map();

	/**
	 * @param {Object} fareRules - data.json का fareRules ऑब्जेक्ट
	 */
	constructor(fareRules = {}) {
		this.#initStrategies();
		this.updateRules(fareRules);
	}

	/**
	 * फ़ेयर रूल्स अपडेट करें (उदा: जब नया शहर या नेटवर्क लोड हो)
	 */
	updateRules(fareRules = {}) {
		this.#fareRules = fareRules || {};
		this.#policies = this.#fareRules.policies || {};
		this.#currency = this.#fareRules.currency || "INR";
	}

	/**
	 * सभी फ़ेयर स्ट्रेटेजीज़ (Calculators) को रजिस्टर करें
	 */
	#initStrategies() {
		this.#strategies.set("distance_based", this.#calculateDistanceBased.bind(this));
		this.#strategies.set("station_pair", this.#calculateStationPair.bind(this));
		this.#strategies.set("matrix_based", this.#calculateStationPair.bind(this));
		this.#strategies.set("station_count_based", this.#calculateStationCountBased.bind(this));
		this.#strategies.set("flat_rate", this.#calculateFlatRate.bind(this));
	}

	/**
	 * मुख्य पब्लिक मेथड: रूट और दूरी के आधार पर संपूर्ण किराया निकालें
	 * 
	 * @param {Object} options
	 * @param {Array<string>} options.path - स्टेशन IDs की लिस्ट
	 * @param {number} options.totalDistanceMeters - कुल रेल दूरी (मीटर में)
	 * @param {string} options.startId - शुरुआती स्टेशन ID
	 * @param {string} options.endId - अंतिम स्टेशन ID
	 * @param {Array<Object>} [options.segments] - लाइन-वाइज़ सेगमेंट्स (वैकल्पिक)
	 * @param {string} [options.coachClass="standard"] - "standard" | "premium"
	 * @param {boolean} [options.isHoliday=false] - क्या आज हॉलिडे/रविवार है
	 * @param {string} [options.customTime=null] - "HH:MM" फॉर्मेट में कस्टम समय
	 * @returns {Object} किराया, डिस्काउंट्स और ब्रेकडाउन
	 */
	/**
	 * मुख्य पब्लिक मेथड: रूट और दूरी के आधार पर संपूर्ण किराया निकालें
	 */
	calculateFare(options = {}) {
		const {
			path = [],
			totalDistanceMeters = 0,
			startId = null,
			endId = null,
			segments = [],
			coachClass = "standard",
			isHoliday = false,
			customTime = null
		} = options;
		if (!this.#policies || Object.keys(this.#policies).length === 0) {
			return this.#createDefaultResponse(0);
		}
		// 1. यदि कोई डायरेक्ट स्टेशन-पेयर मैट्रिक्स मैच होता है
		if (startId && endId) {
			for (const [policyKey, policy] of Object.entries(this.#policies)) {
				if (policy.fareModel === "station_pair" || policy.fareModel === "matrix_based") {
					const matrixFare = this.#calculateStationPair(policy, { startId, endId });
					if (matrixFare !== null) {
						return this.#buildFareResponse(matrixFare, policy, { coachClass, isHoliday, customTime });
					}
				}
			}
		}
		// 2. यदि यात्रा में एकाधिक लेग्स/कंपनियां हैं (मल्टी-लेग जर्नी)
		if (segments && segments.length > 0) {
			const legs = this.#groupSegmentsIntoLegs(segments);
			if (legs.length > 1) {
				return this.#calculateMultiLegFare(legs, { coachClass, isHoliday, customTime });
			}
		}
		// 3. डिफ़ॉल्ट/सिंगल पॉलिसी कोड (100% पुराना टेस्टेड कोड सुरक्षित)
		const defaultPolicyKey = this.#policies["dmrc_standard"] ? "dmrc_standard" : Object.keys(this.#policies)[0];
		const activePolicy = this.#policies[defaultPolicyKey];
		if (!activePolicy) {
			return this.#createDefaultResponse(0);
		}
		const strategyHandler = this.#strategies.get(activePolicy.fareModel) || this.#calculateDistanceBased.bind(this);
		const distanceKm = Number((totalDistanceMeters / 1000).toFixed(2));
		const stationsCount = path.length;
		const baseFare = strategyHandler(activePolicy, {
			distanceKm,
			stationsCount,
			startId,
			endId,
			isHoliday
		});
		return this.#buildFareResponse(baseFare, activePolicy, { coachClass, isHoliday, customTime, distanceKm });
	}


	 /**
	 * 🌐 यूनिवर्सल कनेक्शन डिटेक्टर (5 तय किए गए प्रकारों के आधार पर)
	 */
	#detectConnectionType(prevLeg, currentSeg) {
		if (!prevLeg) return "normal";
		if (currentSeg.line === "walkway" || currentSeg.farePolicy === "walkway" || prevLeg.walkwayAfter) {
			return "walkway";
		}
		// यदि कंपनी या फेयर सिस्टम अलग है -> Multimodal (अलग गेट, अलग टिकट)
		if (prevLeg.operator !== currentSeg.operator || prevLeg.network !== currentSeg.network || prevLeg.policyKey !== currentSeg.farePolicy) {
			return "multimodal";
		}
		// यदि साझा ट्रैक है -> Shared Track
		if (prevLeg.isTrackShared || currentSeg.isTrackShared) {
			return "shared_track";
		}
		return "interchange";
	}
	/**
	 * 🧩 सेगमेंट्स को लेग्स में ग्रुप करें
	 */
	#groupSegmentsIntoLegs(segments = []) {
		const legs = [];
		let currentLeg = null;
		for (const seg of segments) {
			if (seg.line === "walkway" || seg.farePolicy === "walkway") {
				if (currentLeg) {
					currentLeg.walkwayAfter = {
						distanceMeters: seg.distanceMeters || 300,
						timeSeconds: seg.travelTimeSeconds || 240
					};
				}
				continue;
			}
			const policyKey = seg.farePolicy || "dmrc_standard";
			const connectionType = this.#detectConnectionType(currentLeg, seg);
			// यदि लेग नहीं बना या कनेक्शन 'multimodal' है, तो नया लेग शुरू करें
			if (!currentLeg || connectionType === "multimodal") {
				currentLeg = {
					policyKey: policyKey,
					operator: seg.operator || "dmrc",
					network: seg.network || "dmrc",
					connectionType: connectionType,
					lineName: seg.shortName || seg.lineName || seg.line,
					lineColor: seg.lineColor || "#007bff",
					fromStation: seg.fromStation,
					toStation: seg.toStation,
					distanceMeters: seg.distanceMeters || 0,
					travelTimeSeconds: seg.travelTimeSeconds || 0,
					stationsCount: seg.stationsCount || 1,
					interchangesCount: 0,
					intermediateStations: [...(seg.intermediateStations || [seg.fromStation, seg.toStation])],
					walkwayAfter: null
				};
				legs.push(currentLeg);
			} else {
				// सेम सिस्टम में दूरी व समय जोड़ें (interchange / normal)
				currentLeg.toStation = seg.toStation;
				currentLeg.distanceMeters += (seg.distanceMeters || 0);
				currentLeg.travelTimeSeconds += (seg.travelTimeSeconds || 0);
				currentLeg.stationsCount += (seg.stationsCount || 1);
				currentLeg.interchangesCount = (currentLeg.interchangesCount || 0) + 1;
				if (seg.intermediateStations) {
					currentLeg.intermediateStations.push(...seg.intermediateStations.slice(1));
				}
			}
		}
		return legs;
	}


	// =========================================================================
	// 🧩 STRATEGY HANDLERS (DYNAMIC FARE MODELS)
	// =========================================================================

	/**
	 * 1. Distance-Based Strategy (DMRC, NMRC, Bangalore, etc.)
	 */
	#calculateDistanceBased(policy, context) {
		const { distanceKm = 0, isHoliday = false } = context;
		const fareTables = policy.fareTables || {};
		const slabs = (isHoliday && fareTables.holiday) ? fareTables.holiday : (fareTables.weekday || fareTables.standard || []);

		if (!slabs || slabs.length === 0) return 0;

		let matchedFare = slabs[slabs.length - 1].fare; // फॉलबैक: अधिकतम स्लैब

		for (const slab of slabs) {
			if (slab.maxKm === null || slab.maxKm === undefined) {
				if (distanceKm >= slab.minKm) {
					matchedFare = slab.fare;
					break;
				}
			} else if (distanceKm >= slab.minKm && distanceKm < slab.maxKm) {
				matchedFare = slab.fare;
				break;
			}
		}

		return Number(matchedFare) || 0;
	}

	/**
	 * 💰 5 प्रकारों के आधार पर प्रत्येक लेग का किराया व अलर्ट्स बनाना
	 */
	#calculateMultiLegFare(legs, options) {
		const { coachClass = "standard", isHoliday = false, customTime = null } = options;
		
		let totalToken = 0;
		let totalSmartCard = 0;
		let totalOffPeak = 0;
		let totalOffPeakSmart = 0;
		let totalDistanceKm = 0;
		const evaluatedLegs = [];
		legs.forEach((leg, index) => {
			const policy = this.#policies[leg.policyKey] || this.#policies["dmrc_standard"];
			const strategyHandler = this.#strategies.get(policy?.fareModel) || this.#calculateDistanceBased.bind(this);
			const distKm = Number((leg.distanceMeters / 1000).toFixed(2));
			totalDistanceKm += distKm;
			const legBaseFare = strategyHandler(policy, {
				distanceKm: distKm,
				stationsCount: leg.stationsCount,
				startId: leg.fromStation,
				endId: leg.toStation,
				isHoliday
			}) || 0;
			const legFareObj = this.#buildFareResponse(legBaseFare, policy, {
				coachClass,
				isHoliday,
				customTime,
				distanceKm: distKm
			});
			totalToken += (legFareObj.products?.token || legBaseFare);
			totalSmartCard += (legFareObj.products?.smartCard || legBaseFare);
			totalOffPeak += (legFareObj.products?.offPeak || legBaseFare);
			totalOffPeakSmart += (legFareObj.products?.offPeakSmartCard || legBaseFare);
			// 🚨 5 प्रकारों के अनुसार यूनिवर्सल अलर्ट्स:
			const alerts = [];
			if (leg.connectionType === "multimodal") {
				alerts.push({
					type: "multimodal",
					icon: "🛡️",
					i18nKey: "pages.home.sidebar.findroute.route.alerts.multimodalSecurity",
					defaultText: "Multimodal Junction: Separate gate & fresh security check required"
				});
				alerts.push({
					type: "ncmc",
					icon: "💳",
					i18nKey: "pages.home.sidebar.findroute.route.alerts.ncmcCard",
					defaultText: "RuPay NCMC / Smart Card works directly at gates"
				});
			} else if (leg.connectionType === "shared_track") {
				alerts.push({
					type: "shared_track",
					icon: "🛤️",
					i18nKey: "pages.home.sidebar.findroute.route.alerts.sharedTrackNotice",
					defaultText: "Shared Track: Local & express trains available on same platform"
				});
			}

			if (leg.walkwayAfter) {
				const walkMin = Math.round(leg.walkwayAfter.timeSeconds / 60) || 1;
				alerts.push({
					type: "walkway",
					icon: "🚶",
					i18nKey: "pages.home.sidebar.findroute.route.alerts.walkwayNotice",
					params: { distance: leg.walkwayAfter.distanceMeters, minutes: walkMin },
					defaultText: `${leg.walkwayAfter.distanceMeters}m walkway (~${walkMin} min walk)`
				});
			}
			evaluatedLegs.push({
				operator: leg.operator,
				network: leg.network,
				connectionType: leg.connectionType,
				lineName: leg.lineName,
				lineColor: leg.lineColor,
				fromStation: leg.fromStation,
				toStation: leg.toStation,
				distanceKm: distKm,
				travelMinutes: Math.round(leg.travelTimeSeconds / 60),
				stationsCount: leg.stationsCount,
				interchangesCount: leg.interchangesCount || 0,
				alerts: alerts,
				fares: {
					token: legFareObj.products?.token || legBaseFare,
					smartCard: legFareObj.products?.smartCard || legBaseFare,
					offPeak: legFareObj.products?.offPeak || legBaseFare,
					offPeakSmartCard: legFareObj.products?.offPeakSmartCard || legBaseFare
				}
			});
		});
		const defaultPolicy = this.#policies["dmrc_standard"] || Object.values(this.#policies)[0];
		const isOffPeak = this.#checkIsOffPeak(defaultPolicy?.timeRules, customTime);
		return {
			totalFare: totalToken,
			currency: this.#currency,
			coachClass,
			timeSlot: isOffPeak ? "off_peak" : "peak",
			distanceKm: Number(totalDistanceKm.toFixed(2)),
			isMultiTicket: true,
			products: {
				token: totalToken,
				smartCard: totalSmartCard,
				offPeak: totalOffPeak,
				offPeakSmartCard: totalOffPeakSmart
			},
			discounts: {
				savingsAmount: Math.max(0, totalToken - totalSmartCard),
				smartCardDiscountPct: Math.round(((totalToken - totalSmartCard) / (totalToken || 1)) * 100),
				offPeakDiscountPct: Math.round(((totalToken - totalOffPeak) / (totalToken || 1)) * 100),
				offPeakSmartDiscountPct: Math.round(((totalToken - totalOffPeakSmart) / (totalToken || 1)) * 100)
			},
			legs: evaluatedLegs
		};
	}


	/**
	 * 2. Station-Pair / Matrix Strategy (Airport Express, Point-to-Point)
	 */
	#calculateStationPair(policy, context) {
		const { startId, endId } = context;
		const matrix = policy.fareMatrix;
		if (!matrix || !startId || !endId) return null;

		// डायरेक्ट चेक (start -> end)
		if (matrix[startId] && matrix[startId][endId] !== undefined) {
			return Number(matrix[startId][endId]);
		}

		// रिवर्स चेक (end -> start) यदि मैट्रिक्स सममित (symmetric) हो
		if (matrix[endId] && matrix[endId][startId] !== undefined) {
			return Number(matrix[endId][startId]);
		}

		return null;
	}

	/**
	 * 3. Station-Count Strategy (Kolkata, Mumbai Suburban hop count)
	 */
	#calculateStationCountBased(policy, context) {
		const { stationsCount = 0 } = context;
		const slabs = policy.stationSlabs || policy.slabs || [];
		if (!slabs.length) return 0;

		let matchedFare = slabs[slabs.length - 1].fare;
		for (const slab of slabs) {
			if (slab.maxStations == null) {
				if (stationsCount >= slab.minStations) {
					matchedFare = slab.fare;
					break;
				}
			} else if (stationsCount >= slab.minStations && stationsCount <= slab.maxStations) {
				matchedFare = slab.fare;
				break;
			}
		}
		return Number(matchedFare) || 0;
	}

	/**
	 * 4. Flat Rate Strategy (Monorail / Shuttle)
	 */
	#calculateFlatRate(policy) {
		return Number(policy.flatFare || policy.fare || 10);
	}

	// =========================================================================
	// 🎁 DISCOUNTS, COACH CLASSES & RESPONSE BUILDER
	// =========================================================================

	/**
	 * अंतिम रिस्पॉन्स ऑब्जेक्ट तैयार करता है (Discounts + Coach Modifiers)
	 */
	#buildFareResponse(rawBaseFare, policy, options) {
		const { coachClass = "standard", customTime = null, distanceKm = 0 } = options;

		let baseFare = Number(rawBaseFare) || 0;

		// 1. Coach Class Modifier (उदा: Premium Coach 2x या पॉलिसी मल्टीप्लायर)
		let classMultiplier = 1.0;
		if (coachClass === "premium") {
			classMultiplier = policy.coachClasses?.premium?.multiplier || 2.0;
			baseFare = Math.round(baseFare * classMultiplier);
		}

		// 2. टाइम स्लॉट जांचें (Peak vs Off-Peak)
		const isOffPeak = this.#checkIsOffPeak(policy.timeRules, customTime);
		const timeSlot = isOffPeak ? "off_peak" : "peak";

		// 3. डायनामिक प्रोडक्ट डिस्काउंट्स (Smart Card, NCMC, Off-Peak)
		const productsConfig = policy.products || {};
		const smartCardPct = productsConfig.smart_card?.discountPercent ?? 10;
		const offPeakPct = productsConfig.off_peak_smart_card?.discountPercent ?? 10;

		const smartCardFare = Math.max(0, Math.round(baseFare * (1 - smartCardPct / 100)));
		const offPeakFare = Math.max(0, Math.round(baseFare * (1 - offPeakPct / 100))); // 👈 यह लाइन
		const offPeakSmartFare = Math.max(0, Math.round(baseFare * (1 - (smartCardPct + offPeakPct) / 100)));

		return {
			totalFare: baseFare,
			currency: this.#currency,
			coachClass,
			timeSlot,
			distanceKm,
			products: {
				token: baseFare,
				smartCard: smartCardFare,
				offPeak: offPeakFare, // 👈 यह प्रोडक्ट
				offPeakSmartCard: offPeakSmartFare
			},
			discounts: {
				smartCardDiscountPct: smartCardPct,
				offPeakDiscountPct: offPeakPct,
				offPeakSmartDiscountPct: smartCardPct + offPeakPct
			}
		};
	}

	/**
	 * Off-Peak टाइम रूल्स की जांच करता है
	 */
	#checkIsOffPeak(timeRules, customTime) {
		if (!timeRules || !timeRules.off_peak || !Array.isArray(timeRules.off_peak)) {
			return false;
		}

		let timeStr = customTime;
		if (!timeStr) {
			const now = new Date();
			const hrs = String(now.getHours()).padStart(2, "0");
			const mins = String(now.getMinutes()).padStart(2, "0");
			timeStr = `${hrs}:${mins}`;
		}

		return timeRules.off_peak.some((slot) => {
			return timeStr >= slot.start && timeStr <= slot.end;
		});
	}

	/**
	 * डिफ़ॉल्ट/खाली रिस्पॉन्स
	 */
	#createDefaultResponse(fare = 0) {
		return {
			totalFare: fare,
			currency: this.#currency,
			coachClass: "standard",
			timeSlot: "peak",
			distanceKm: 0,
			products: { token: fare, smartCard: fare, offPeakSmartCard: fare },
			discounts: { smartCardDiscountPct: 0, offPeakDiscountPct: 0 }
		};
	}
}