/**
 * 🧠 CenterClass - Central Application Orchestrator & Mediator
 * Enterprise ES2022 OOP Singleton Class with Private Encapsulation (#)
 * 
 * विशेषताएँ:
 * 1. Single Point of Entry: डैशबोर्ड और अन्य सभी UI पेजेस केवल इसी क्लास से बात करते हैं।
 * 2. Complete Subsystem Mediation: 
 *    - Data Store (MetroDataStore)
 *    - Routing Engine (RouteFinder & DijkstraAlgo)
 *    - Pricing Engine (FareCalculator)
 *    - SVG Map Engine (MetroMap)
 *    - Multi-Sensor Alarm & Telemetry (AlarmManager & GPSTracker)
 *    - Recent History (RecentSearchService)
 *    - O(1) Fast Search (UniversalSearchEngine)
 * 3. Race-Condition Safe: AbortController और Async State Management।
 */

import { metroDataStore } from "./metro-data-store.js";
import { eventBus } from "./event-bus.js";
import { RouteFinder } from "../services/route/RouteFinder.js";
import { FareCalculator } from "../services/fare/FareCalculator.js";
import { AlarmManager } from "../services/alarm/AlarmManager.js";
import { MetroMap } from "../components/metro-map.js";
import { RecentSearchService } from "../services/route/recent-search-service.js";
import { StationSearchEngine } from "../services/search/StationSearchEngine.js";
import { UniversalSearchEngine } from "../services/search/UniversalSearchEngine.js";
import { getStationName } from "./data-utils.js";
import { telemetryService } from "../services/sensors/TelemetryService.js";


class CenterClass {
	// Private Subsystem Instances
	#metroData = null;
	#routeFinder = null;
	#fareCalculator = null;
	#alarmManager = null;
	#mapInstance = null;
	#recentSearchService = null;
	#stationSearchEngine = null;
	#searchEngine = null;

	// State Fields
	#isInitialized = false;
	#currentCity = "delhi_ncr";
	#onSpeedUpdateCallback = null;
	#onAlarmStateCallback = null;

	constructor() {
		this.#alarmManager = new AlarmManager();
		this.#searchEngine = new UniversalSearchEngine();
	}

	/**
	 * ऐप और सभी सब-सिस्टम्स को इनिशियलाइज़ करें
	 * @param {string} [cityKey=null] - शहर का नाम (उदा: 'delhi_ncr')
	 * @param {string} [networkKey=null] - नेटवर्क का नाम (उदा: 'dmrc')
	 */
	async init(cityKey = null, networkKey = null) {
		try {
			console.log("[CenterClass] Initializing Metro Application Core...");

			// 1. DataStore से डेटा लोड करें
			this.#metroData = await metroDataStore.loadCity(cityKey, networkKey);
			this.#currentCity = metroDataStore.getCurrentCity ? metroDataStore.getCurrentCity() : (cityKey || "delhi_ncr");

			// ⚠️ यदि कोई अधूरा शहर लोड हुआ और फ़ॉलबैक हुआ, तो ग्लोबल Toast दिखाएं
			if (this.#metroData?._fallback) {
				const { requestedCity, fallbackCity } = this.#metroData._fallback;
				const formattedReq = requestedCity.replace(/_/g, " ").toUpperCase();
				const formattedFallback = fallbackCity.replace(/_/g, " ").toUpperCase();
				eventBus.emit("SHOW_TOAST", {
					title: "City Under Construction",
					message: `Transit data for "${formattedReq}" is not yet available. Showing ${formattedFallback} map.`,
					type: "warning",
					duration: 6000
				});
			}

			// 2. Routing और Pricing इंजन इनिशियलाइज़ करें
			this.#routeFinder = new RouteFinder(this.#metroData);
			this.#fareCalculator = new FareCalculator(this.#metroData.fareRules || {});

			// 3. Search और History सर्विसेज़
			this.#recentSearchService = new RecentSearchService(this.#metroData);
			this.#stationSearchEngine = new StationSearchEngine(this.#metroData);
			
			await this.#searchEngine.init();
			this.#searchEngine.setScope("city", this.#currentCity);

			// 4. Alarm Manager के टेलीमेट्री और स्टेट इवेंट्स को सेंटर क्लास से बाइंड करें
			this.#alarmManager.onTelemetry((telemetry) => {
				// A. यदि स्पीड डेटा है, तो स्पीडोमीटर को भेजें
				if (telemetry.type === "SPEED" && typeof this.#onSpeedUpdateCallback === "function") {
					this.#onSpeedUpdateCallback(telemetry);
				}

				// B. GPS और Accuracy डेटा को टेलीमेट्री सर्विस को भेजें
				if (typeof telemetry.accuracy === "number") {
					telemetryService.updateGpsTelemetry({
						accuracy: telemetry.accuracy,
						isTracking: true
					});
				}

				eventBus.emit("TELEMETRY_UPDATE", telemetry);
			});

			this.#alarmManager.onStateChange((alarmState) => {
				if (typeof this.#onAlarmStateCallback === "function") {
					this.#onAlarmStateCallback(alarmState);
				}

				// 🛑 अलार्म बंद होने पर टेलीमेट्री रीसेट करें
				if (alarmState.state === "INACTIVE") {
					telemetryService.updateGpsTelemetry({
						accuracy: null,
						isTracking: false
					});
				}

				eventBus.emit("ALARM_STATE_CHANGE", alarmState);
			});

			this.#isInitialized = true;
			console.log("[CenterClass] Core Initialized Successfully!");
			return this.#metroData;
		} catch (error) {
			console.error("[CenterClass] Initialization failed:", error);
			throw error;
		}
	}

	/**
	 * वर्तमान लोड किया गया मेट्रो डेटा प्राप्त करें
	 */
	getMetroData() {
		return this.#metroData;
	}

	// =========================================================================
	// 🗺️ METRO MAP BINDING & HIGHLIGHTING
	// =========================================================================

	/**
	 * MetroMap SVG इंजन को इनिशियलाइज़ करके इंस्टेंस लौटाएं
	 * @param {Object} options
	 * @param {string} options.containerSelector - DOM कंटेनर सेलेक्टर
	 * @param {Function} [options.onClearRoute] - रूट क्लियर होने पर कॉलबैक
	 */
	getMapEngine(options = {}) {
		if (!this.#metroData) {
			console.warn("[CenterClass] MetroData not ready. Call init() first.");
			return null;
		}

		this.#mapInstance = new MetroMap({
			mapContainerSelector: options.containerSelector || ".mapContainer",
			metroData: this.#metroData,
			lang: options.lang || "en",
			theme: options.theme || "light",
			onClearRoute: () => {
				if (typeof options.onClearRoute === "function") {
					options.onClearRoute();
				}
				eventBus.emit("ROUTE_CLEARED");
			},
			onStationClick: (stationPayload) => {
				if (typeof options.onStationClick === "function") {
					options.onStationClick(stationPayload);
				}
				eventBus.emit("STATION_CLICKED", stationPayload);
			}
		});

		return this.#mapInstance;
	}

	/**
	 * मैप पर रूट पाथ हाईलाइट व ऑटो-फ़ोकस करें
	 * @param {Array<string>|null} path - रूट के स्टेशन IDs की सूची
	 * @param {Object} [options={}] - ज़ूम ऑप्शंस (customZoom, autoPan, paddingRatio)
	 */
	highlightRoute(path, options = {}) {
		if (this.#mapInstance && typeof this.#mapInstance.highlightRoute === "function") {
			this.#mapInstance.highlightRoute(path, options);
		}
	}

	/**
	 * मैप का हाईलाइट हटाएं
	 */
	clearMapHighlight() {
		if (this.#mapInstance && typeof this.#mapInstance.highlightRoute === "function") {
			this.#mapInstance.highlightRoute(null);
		}
	}

	setRoutePin(type, stationId, x = null, y = null) {
		if (this.#mapInstance && typeof this.#mapInstance.setRoutePin === "function") {
			this.#mapInstance.setRoutePin(type, stationId, x, y);
		}
	}
	clearRoutePins() {
		if (this.#mapInstance && typeof this.#mapInstance.clearRoutePins === "function") {
			this.#mapInstance.clearRoutePins();
		}
	}
	clearStationHighlight() {
		if (this.#mapInstance && typeof this.#mapInstance.clearStationHighlight === "function") {
			this.#mapInstance.clearStationHighlight();
		}
	}
	// =========================================================================
	// 🧭 ROUTE SEARCH & PRICING ORCHESTRATION
	// =========================================================================

	/**
	 * संपूर्ण रूट खोजें (Path + Fare + Map Highlight + History Save)
	 * 
	 * @param {string} sourceName - शुरुआती स्टेशन का नाम
	 * @param {string} destinationName - अंतिम स्टेशन का नाम
	 * @param {Object} [options={}] - सेटिंग्स
	 * @param {string} [options.routeType="leastTransfers"] - "leastTransfers" | "shortestDistance"
	 * @param {string} [options.coachClass="standard"] - "standard" | "premium"
	 * @returns {Object|null}
	 */
	searchRoute(sourceName, destinationName, options = {}) {
		if (!this.#isInitialized || !this.#routeFinder || !this.#fareCalculator) {
			console.warn("[CenterClass] Engines not ready.");
			return null;
		}

		const routeType = options.routeType || "leastTransfers";
		const coachClass = options.coachClass || "standard";

		// 1. रूटिंग इंजन से पाथ और स्टेप्स निकालें
		const routeData = this.#routeFinder.findRoute(sourceName, destinationName, routeType);
		if (!routeData) {
			return null;
		}

		// 2. फेयर इंजन से डायनामिक किराया निकालें
		const fareData = this.#fareCalculator.calculateFare({
			path: routeData.path,
			totalDistanceMeters: routeData.totalDistanceMeters,
			startId: routeData.source.id,
			endId: routeData.destination.id,
			segments: routeData.steps,
			coachClass: coachClass
		});

		// 3. यदि कम से कम ट्रांसफर चुना है, तो तुलना के लिए सबसे छोटी दूरी का डेटा भी लाएं
		let alternativeRoute = null;
		if (routeType === "leastTransfers") {
			alternativeRoute = this.#routeFinder.findRoute(sourceName, destinationName, "shortestDistance");
		}

		// 4. SVG मैप पर रूट हाईलाइट करें
		this.highlightRoute(routeData.path);

		// 5. हाल की खोजों (Recent Searches) में सहेजें
		if (this.#recentSearchService) {
			this.#recentSearchService.saveSearch(sourceName, destinationName);
		}

		// 6. कंबाइंड रिस्पॉन्स लौटाएं
		return {
			...routeData,
			fare: fareData,
			alternative: alternativeRoute,
			activeFilter: routeType
		};
	}


	// =========================================================================
	// ⏰ LIVE JOURNEY & ALARM MANAGEMENT
	// =========================================================================

	/**
	 * लाइव यात्रा और अलार्म शुरू करें
	 * @param {Object} journeyConfig
	 */
	startLiveJourney(journeyConfig = {}) {
		if (!this.#alarmManager) return;

		this.#alarmManager.start({
			routePath: journeyConfig.path || [],
			stationData: this.#metroData.stationData || {},
			interchanges: journeyConfig.interchanges || [],
			destinationId: journeyConfig.destinationId,
			estimatedDurationSeconds: journeyConfig.totalTravelTimeSeconds,
			settings: journeyConfig.alarmSettings || {}
		});
	}

	/**
	 * लाइव यात्रा और अलार्म बंद करें
	 */
	stopLiveJourney() {
		if (this.#alarmManager) {
			this.#alarmManager.stop();
		}
	}

	/**
	 * अलार्म डिस्मिस करें
	 */
	dismissAlarm() {
		if (this.#alarmManager) {
			this.#alarmManager.dismiss();
		}
	}

	/**
	 * अलार्म 2 मिनट के लिए स्नूज़ करें
	 */
	snoozeAlarm(minutes = 2) {
		if (this.#alarmManager) {
			this.#alarmManager.snooze(minutes);
		}
	}

	/**
	 * अलार्म सेटिंग्स अपडेट करें
	 */
	updateAlarmSettings(newSettings) {
		if (this.#alarmManager) {
			this.#alarmManager.updateSettings(newSettings);
		}
	}

	/**
	 * स्पीडोमीटर और टेलीमेट्री के लिए लाइव लिसनर बाइंड करें
	 */
	bindSpeedometer(callback) {
		this.#onSpeedUpdateCallback = (telemetry) => {
			// 1. स्पीडोमीटर को भेजें
			if (typeof callback === "function") callback(telemetry);
			
			// 2. टेलीमेट्री सर्विस को लाइव एक्यूरेसी भेजें
			telemetryService.updateGpsTelemetry(telemetry);
		};
	}

	
	/**
	 * अलार्म स्टेट लिसनर बाइंड करें
	 */
	bindAlarmState(callback) {
		this.#onAlarmStateCallback = callback;
	}


	/**
     * टेलीमेट्री स्ट्रीम से बाइंड करें
     */
    bindTelemetry(callback) {
        return telemetryService.subscribe(callback);
    }
    /**
     * GPS परमिशन का अनुरोध करें
     */
    requestGpsPermission(onGranted = null, onDenied = null) {
        telemetryService.requestGpsPermission(onGranted, onDenied);
    }

	// =========================================================================
	// 🕒 RECENT SEARCHES & AUTOCOMPLETE SEARCH
	// =========================================================================

	getRecentSearches() {
		return this.#recentSearchService ? this.#recentSearchService.getSearches() : [];
	}

	deleteRecentSearch(fromId, toId) {
		if (this.#recentSearchService) {
			this.#recentSearchService.deleteSearch(fromId, toId);
		}
	}

	clearRecentSearches() {
		if (this.#recentSearchService) {
			this.#recentSearchService.clearAll();
		}
	}

	// =========================================================================
	// 🔍 STATION & SEARCH ENGINE ACCESSORS (Single Source of Truth)
	// =========================================================================

	/**
	 * 🚇 StationSearchEngine इंस्टेंस प्राप्त करें (Dashboard ऑटोकम्पलीट बाइंडिंग के लिए)
	 */
	getStationSearchEngine() {
		return this.#stationSearchEngine;
	}

	/**
	 * 🔍 5-Tier Typo-Tolerant Station Search (Exact, Prefix, Acronym, Typo)
	 */
	searchStations(query, lang = "en") {
		return this.#stationSearchEngine ? this.#stationSearchEngine.search(query, lang) : [];
	}

	/**
	 * किसी स्टेशन का विवरण ID से प्राप्त करें
	 */
	getStationDetails(stationId) {
		return this.#metroData?.stationData?.[stationId] || null;
	}

	/**
	 * भाषा के अनुसार स्टेशन का नाम प्राप्त करें (Single Source of Truth)
	 */
	getStationName(stationId, lang = "en") {
		const station = this.getStationDetails(stationId);
		return getStationName(station, lang);
	}
}

// Global Singleton Export
export const centerClass = new CenterClass();
export { CenterClass };