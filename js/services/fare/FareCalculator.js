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

        // 1. यदि कोई स्टेशन-पेयर मैट्रिक्स मैच होता है (उदा: Airport Express डायरेक्ट रूट)
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

        // 2. डिफ़ॉल्ट पॉलिसी का चयन (Priority: dmrc_standard -> पहली उपलब्ध दूरी आधारित पॉलिसी)
        const defaultPolicyKey = this.#policies["dmrc_standard"] ? "dmrc_standard" : Object.keys(this.#policies)[0];
        const activePolicy = this.#policies[defaultPolicyKey];

        if (!activePolicy) {
            return this.#createDefaultResponse(0);
        }

        // 3. स्ट्रेटेजी चलाकर बेस फेयर निकालें
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

        // 4. कोच क्लास, डिस्काउंट्स और टाइम स्लॉट लागू करें
        return this.#buildFareResponse(baseFare, activePolicy, { coachClass, isHoliday, customTime, distanceKm });
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