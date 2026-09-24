/**
 * 🚇 Universal Fare Calculator Engine
 * Enterprise ES2022 OOP Class with Strategy Pattern & Private Encapsulation (#)
 * 
 * 📌 SUPPORTED FARE MODELS (STRATEGIES) [NO HARDCODED NETWORKS]:
 * 1. 'distance_based'       -> Slab based on distance (Km).
 * 2. 'station_pair'         -> Exact Point-to-Point 2D Matrix.
 * 3. 'station_count_based'  -> Slab based on total stations crossed.
 * 4. 'flat_rate'            -> Fixed fare regardless of distance.
 */

export class FareCalculator {
	#fareRules = null;
	#policies = null;
	#currency = "INR";
	#strategies = new Map();
	#matrixIndexCache = new WeakMap();

	constructor(fareRules = {}) {
		this.#initStrategies();
		this.updateRules(fareRules);
	}

	updateRules(fareRules = {}) {
		this.#fareRules = fareRules || {};
		this.#policies = this.#fareRules.policies || {};
		this.#currency = this.#fareRules.currency || "INR";
		this.#matrixIndexCache = new WeakMap();
	}

	#resolveActivePolicy(policyEntry, targetDate = new Date()) {
		if (!policyEntry) return null;

		if (Array.isArray(policyEntry)) {
			const validPolicies = policyEntry
				.filter(p => {
					if (!p.effectiveFrom) return true;
					const eff = new Date(p.effectiveFrom);
					return isNaN(eff) || eff <= targetDate;
				})
				.sort((a, b) => {
					const dateA = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
					const dateB = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
					return dateB - dateA;
				});

			return validPolicies[0] || policyEntry[0];
		}

		if (Array.isArray(policyEntry.revisions) && policyEntry.revisions.length > 0) {
			const allCandidates = [policyEntry, ...policyEntry.revisions];
			const validCandidates = allCandidates
				.filter(p => {
					if (!p.effectiveFrom) return true;
					const eff = new Date(p.effectiveFrom);
					return isNaN(eff) || eff <= targetDate;
				})
				.sort((a, b) => {
					const dateA = a.effectiveFrom ? new Date(a.effectiveFrom).getTime() : 0;
					const dateB = b.effectiveFrom ? new Date(b.effectiveFrom).getTime() : 0;
					return dateB - dateA;
				});

			return validCandidates[0] || policyEntry;
		}

		if (policyEntry.effectiveFrom) {
			const eff = new Date(policyEntry.effectiveFrom);
			if (!isNaN(eff) && eff > targetDate) {
				return null;
			}
		}

		return policyEntry;
	}

	#initStrategies() {
		this.#strategies.set("distance_based", this.#calculateDistanceBased.bind(this));
		this.#strategies.set("station_pair", this.#calculateStationPair.bind(this));
		this.#strategies.set("matrix_based", this.#calculateStationPair.bind(this));
		this.#strategies.set("station_count_based", this.#calculateStationCountBased.bind(this));
		this.#strategies.set("flat_rate", this.#calculateFlatRate.bind(this));
	}

	calculateFare(options = {}) {
		const {
			path = [],
			totalDistanceMeters = 0,
			startId = null,
			endId = null,
			segments = [],
			coachClass = "standard",
			isHoliday = false,
			customTime = null,
			journeyDate = new Date()
		} = options;

		if (!this.#policies || Object.keys(this.#policies).length === 0) {
			return this.#createDefaultResponse(0);
		}

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

		if (segments && segments.length > 0) {
			const legs = this.#groupSegmentsIntoLegs(segments);
			if (legs.length > 1) {
				return this.#calculateMultiLegFare(legs, { coachClass, isHoliday, customTime, journeyDate });
			}
		}

		const activePolicyKey = segments?.[0]?.farePolicy;
		const rawPolicy = activePolicyKey ? this.#policies[activePolicyKey] : null;
		
		if (!rawPolicy) {
			console.error(`[FareCalculator] 🚨 CRITICAL ERROR: Fare Policy "${activePolicyKey}" not found in database! Cannot calculate fare.`);
			return this.#createDefaultResponse(0);
		}

		const activePolicy = this.#resolveActivePolicy(rawPolicy, journeyDate);
		
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

	#detectConnectionType(prevLeg, currentSeg) {
		if (!prevLeg) return "normal";
		if (currentSeg.line === "walkway" || currentSeg.farePolicy === "walkway" || prevLeg.walkwayAfter) {
			return "walkway";
		}
		if (prevLeg.operator !== currentSeg.operator || prevLeg.network !== currentSeg.network || prevLeg.policyKey !== currentSeg.farePolicy) {
			return "multimodal";
		}
		if (prevLeg.isTrackShared || currentSeg.isTrackShared) {
			return "shared_track";
		}
		return "interchange";
	}

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
			
			const policyKey = seg.farePolicy;
			if (!policyKey || !this.#policies[policyKey]) {
				console.error(`[FareCalculator] 🚨 ERROR: Invalid or missing farePolicy "${policyKey}" on segment ${seg.line}.`);
			}

			const connectionType = this.#detectConnectionType(currentLeg, seg);

			if (!currentLeg || connectionType === "multimodal") {
				currentLeg = {
					policyKey: policyKey,
					operator: seg.operator || "default",
					network: seg.network || "default",
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

	#calculateDistanceBased(policy, context) {
		const { distanceKm = 0, isHoliday = false } = context;
		const fareTables = policy.fareTables || {};
		const slabs = (isHoliday && fareTables.holiday) ? fareTables.holiday : (fareTables.weekday || fareTables.standard || []);

		if (!slabs || slabs.length === 0) return 0;
		let matchedFare = slabs[slabs.length - 1].fare;

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

	#calculateMultiLegFare(legs, options) {
		const { coachClass = "standard", isHoliday = false, customTime = null, journeyDate = new Date() } = options;
		
		let totalDistanceKm = 0;
		let totalBaseFare = 0;
		const evaluatedLegs = [];

		legs.forEach((leg) => {
			const distKm = Number(((leg.distanceMeters || 0) / 1000).toFixed(2));
			const rawPolicy = this.#policies[leg.policyKey];
			
			if (!rawPolicy) {
				console.error(`[FareCalculator] 🚨 CRITICAL ERROR: Policy "${leg.policyKey}" missing for Leg. Skipping calculation.`);
				return;
			}

			const policy = this.#resolveActivePolicy(rawPolicy, journeyDate);
			const strategyHandler = this.#strategies.get(policy?.fareModel) || this.#calculateDistanceBased.bind(this);
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

			totalBaseFare += legFareObj.totalFare;

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
				products: legFareObj.products
			});
		});

		const defaultPolicy = legs[0] ? this.#policies[legs[0].policyKey] : null;
		const isOffPeak = this.#checkIsOffPeak(defaultPolicy?.timeRules, customTime);

		return {
			totalFare: totalBaseFare,
			currency: this.#currency,
			coachClass,
			timeSlot: isOffPeak ? "off_peak" : "peak",
			distanceKm: Number(totalDistanceKm.toFixed(2)),
			isMultiTicket: true,
			legs: evaluatedLegs
		};
	}

	#calculateStationPair(policy, context) {
		const { startId, endId } = context;
		if (!policy || !startId || !endId) return null;

		if (!Array.isArray(policy.stations) || !Array.isArray(policy.fareMatrix)) return null;
		if (policy.fareMatrix.length !== policy.stations.length) return null;

		let indexMap = this.#matrixIndexCache.get(policy);
		if (!indexMap) {
			indexMap = new Map();
			policy.stations.forEach((id, idx) => indexMap.set(id, idx));
			this.#matrixIndexCache.set(policy, indexMap);
		}

		const startIdx = indexMap.get(startId);
		const endIdx = indexMap.get(endId);

		if (startIdx === undefined || endIdx === undefined) return null;

		const row = policy.fareMatrix[startIdx];
		if (!Array.isArray(row) || endIdx >= row.length) return null;

		const fare = row[endIdx];
		if (fare === undefined || fare === null || isNaN(Number(fare))) return null;

		return Number(fare);
	}

	#calculateStationCountBased(policy, context) {
		const { stationsCount = 0, isHoliday = false } = context;
		const fareTables = policy.fareTables || {};
		const slabs = (isHoliday && fareTables.holiday)
			? fareTables.holiday
			: (fareTables.weekday || policy.stationSlabs || policy.slabs || []);

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

	#calculateFlatRate(policy) {
		return Number(policy.flatFare || policy.fare || 10);
	}

	/**
	 * 100% Dynamic Products Builder with Multiplier (Premium) Support
	 */
	#buildFareResponse(rawBaseFare, policy, options) {
		const { coachClass = "standard", customTime = null, distanceKm = 0 } = options;
		let baseFare = Number(rawBaseFare) || 0;

		const isOffPeak = this.#checkIsOffPeak(policy.timeRules, customTime);
		const productsConfig = policy.products || {};
		const computedProducts = {};

		// 1. Base Products (Standard)
		for (const [key, config] of Object.entries(productsConfig)) {
			if (config.type === "base") {
				computedProducts[key] = {
					fare: baseFare,
					label: config.label || { en: key, hi: key },
					isDiscounted: false,
					discountPercent: 0,
					isPremium: false // Base tickets are not premium
				};
			}
		}

		// Fallback
		if (Object.keys(computedProducts).length === 0) {
			computedProducts["standard"] = {
				fare: baseFare,
				label: { en: "Fare", hi: "किराया" },
				isDiscounted: false,
				discountPercent: 0,
				isPremium: false
			};
		}

		// 2. Extra Products (Discounts or Premium Multipliers)
		for (const [key, config] of Object.entries(productsConfig)) {
			if (config.type === "discount" || config.type === "concession") {
				if (config.timeRule === "off_peak" && !isOffPeak) continue; 
				
				const baseFareValue = config.baseProduct && computedProducts[config.baseProduct] 
					? computedProducts[config.baseProduct].fare 
					: baseFare;
				
				let finalProductFare = baseFareValue;
				let isPremiumCoach = false;
				
				if (config.multiplier) {
					// Premium Surcharge (e.g. 1.2x)
					finalProductFare = Math.max(0, Math.round(baseFareValue * config.multiplier));
					isPremiumCoach = config.multiplier > 1; 
				} else if (config.discountPercent) {
					// Smart Card / NCMC Discount
					finalProductFare = Math.max(0, Math.round(baseFareValue * (1 - config.discountPercent / 100)));
				}

				computedProducts[key] = {
					fare: finalProductFare,
					label: config.label || { en: key, hi: key },
					isDiscounted: !!config.discountPercent,
					discountPercent: config.discountPercent || 0,
					isPremium: isPremiumCoach
				};
			}
		}

		return {
			totalFare: baseFare,
			currency: this.#currency,
			coachClass,
			timeSlot: isOffPeak ? "off_peak" : "peak",
			distanceKm,
			products: computedProducts
		};
	}

	#checkIsOffPeak(timeRules, customTime) {
		if (!timeRules || !timeRules.off_peak || !Array.isArray(timeRules.off_peak)) return false;

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

	#createDefaultResponse(fare = 0) {
		return {
			totalFare: fare,
			currency: this.#currency,
			coachClass: "standard",
			timeSlot: "peak",
			distanceKm: 0,
			products: {
				standard: {
					fare: fare,
					label: { en: "Standard Fare", hi: "सामान्य किराया" },
					isDiscounted: false,
					discountPercent: 0,
					isPremium: false
				}
			}
		};
	}
}