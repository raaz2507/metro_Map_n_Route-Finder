/**
 * Metro Data Store - Universal Dynamic Singleton Data Repository
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically loads, filters, and deep-merges transit & auto-delta data for any selected city.
 */
import { normalizeStationCoordinates, calculateNeighborDistance } from "./data-utils.js";
import { eventBus } from "./event-bus.js";
import i18n from "./i18n.js";

class MetroDataStore {
	// Private State Fields
	#rawCityData = null;
	#metroData = null;
	#localeData = null;
	#enLocaleData = null; // 🛡️ Persistent English fallback cache
	#stationsDetailData = null;
	#stagingBuffer = null;
	#currentCity = "delhi_ncr";
	#currentNetwork = null;
	#registryData = null;
	#abortController = null;
	#detailsAbortController = null;
	#localeAbortController = null;
	#defaultCity = "delhi_ncr";

	constructor() {
		this.#metroData = {
			defaults: {},
			fareRules: {},
			station_types: {},
			lines: {},
			stationData: {},
			transfers: {}
		};
	}

	/**
	 * Loads master transit registry (india_transit_registry.json)
	 */
	async loadRegistry() {
		if (this.#registryData) return this.#registryData;

		try {
			const activeCountry = localStorage.getItem("active_country") || "india";
			const response = await fetch(`data/${activeCountry}/${activeCountry}_transit_registry.json`);
			if (response.ok) {
				this.#registryData = await response.json();
			}
		} catch (error) {
			console.warn("[MetroDataStore] Failed to load transit registry:", error);
		}
		return this.#registryData;
	}

	/**
	 * Dynamically loads and filters transit graph data for the requested city and network.
	 * Parallel non-blocking fetch for Base + Auto graph delta with in-memory deep merge.
	 */
	async loadCity(cityKey = null, networkKey = null) {
		const resolvedCity = this.#resolveCityKey(cityKey);
		const resolvedNetwork = this.#resolveNetworkKey(networkKey);

		// Prevent redundant fetch if same city is already in memory
		if (this.#rawCityData && this.#currentCity === resolvedCity) {
			this.#currentNetwork = resolvedNetwork;
			this.#metroData = this.#filterByNetwork(this.#rawCityData, resolvedNetwork);
			this.#persistSelection(resolvedCity, resolvedNetwork);
			return this.#metroData;
		}

		if (this.#abortController) {
			this.#abortController.abort();
		}
		this.#abortController = new AbortController();
		const signal = this.#abortController.signal;

		const dataPath = this.getCityFilePath("transit_network.json", resolvedCity);
		const bufferPath = this.getCityFilePath("staging_buffer.json", resolvedCity);
		const localePath = this.getCityLocalePath(resolvedCity);

		try {
			console.log(`[MetroDataStore] Loading transit graph & staging buffer for: "${resolvedCity}"...`);
			const [baseResult, bufferResult, localeResult] = await Promise.allSettled([
				fetch(dataPath, { signal }).then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				}),
				fetch(bufferPath, { signal }).then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				}),
				fetch(localePath, { signal }).then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				})
			]);

			if (baseResult.status !== "fulfilled") {
				if (signal.aborted) return this.#metroData;
				throw new Error(`Data file not found for city "${resolvedCity}" (HTTP ${baseResult.reason})`);
			}

			const rawData = baseResult.value;
			const activeLang = localStorage.getItem("language") || localStorage.getItem("app-lang") || "en";
			let primaryLocale = localeResult.status === "fulfilled" ? localeResult.value : null;

			// Store staging buffer in memory for both graph and station details overlays
			this.#stagingBuffer = bufferResult.status === "fulfilled" && bufferResult.value ? bufferResult.value : null;

			// In-memory overlay of unpromoted staging buffer (Zero loss unattended mode)
			if (this.#stagingBuffer) {
				const bufTransit = this.#stagingBuffer.transit_network;
				if (bufTransit) {
					// 1. Overlay Buffer Stations
					if (bufTransit.stations && typeof bufTransit.stations === "object") {
						rawData.stationData = rawData.stationData || {};
						for (const [stSlug, stObj] of Object.entries(bufTransit.stations)) {
							if (rawData.stationData[stSlug]) {
								rawData.stationData[stSlug] = { ...rawData.stationData[stSlug], ...stObj };
							} else {
								rawData.stationData[stSlug] = { ...stObj };
							}
						}
					}
					// 2. Overlay Buffer Lines
					if (bufTransit.lines && typeof bufTransit.lines === "object") {
						rawData.lines = rawData.lines || {};
						for (const [lineId, lineObj] of Object.entries(bufTransit.lines)) {
							if (rawData.lines[lineId]) {
								rawData.lines[lineId] = { ...rawData.lines[lineId], ...lineObj };
							} else {
								rawData.lines[lineId] = { ...lineObj };
							}
						}
					}
					// 3. Overlay Buffer Transfers
					if (bufTransit.transfers && typeof bufTransit.transfers === "object") {
						rawData.transfers = rawData.transfers || {};
						for (const [tId, tObj] of Object.entries(bufTransit.transfers)) {
							rawData.transfers[tId] = tObj;
						}
					}
					// 4. Overlay Buffer Fare Rules
					if (bufTransit.fareRules && typeof bufTransit.fareRules === "object") {
						if (bufTransit.fareRules.policies) {
							rawData.fareRules = rawData.fareRules || {};
							rawData.fareRules.policies = { ...(rawData.fareRules.policies || {}), ...bufTransit.fareRules.policies };
						}
						if (bufTransit.fareRules.fareTables) {
							rawData.fareRules = rawData.fareRules || {};
							rawData.fareRules.fareTables = { ...(rawData.fareRules.fareTables || {}), ...bufTransit.fareRules.fareTables };
						}
					}
				}

				// Overlay Buffer Locales for newly added stations
				const bufLocales = this.#stagingBuffer.locales;
				if (bufLocales && typeof bufLocales === "object") {
					const langLoc = bufLocales[activeLang] || bufLocales["en"];
					if (langLoc?.stations && primaryLocale) {
						primaryLocale.stations = primaryLocale.stations || {};
						for (const [sid, sobj] of Object.entries(langLoc.stations)) {
							if (!primaryLocale.stations[sid] || !primaryLocale.stations[sid].name) {
								primaryLocale.stations[sid] = { ...(primaryLocale.stations[sid] || {}), ...sobj };
							}
						}
					}
				}
			}

			// जाँचें कि क्या चुनी हुई भाषा में स्टेशन के नाम भरे हुए हैं या खाली हैं
			const hasValidNames = primaryLocale && Object.values(primaryLocale.stations || {}).some(st => st.name && st.name.trim() !== "");

			if (!hasValidNames && activeLang !== "en") {
				console.warn(`[MetroDataStore] ${activeLang.toUpperCase()} locale missing or empty for "${resolvedCity}". Fetching English fallback...`);
				try {
					const enPath = this.getCityLocalePath(resolvedCity, "en");
					const enRes = await fetch(enPath, { signal });
					if (enRes.ok) {
						primaryLocale = await enRes.json();
						this.#enLocaleData = primaryLocale;
						eventBus.emit("SHOW_TOAST", {
							type: "warning",
							title: i18n.t("toasts.langFallbackTitle"),
							message: i18n.t("toasts.langFallbackMsg", { lang: activeLang.toUpperCase() }),
							duration: 4500
						});
					}
				} catch (err) {
					console.error("[MetroDataStore] Failed to load English fallback locale:", err);
				}
			}

			this.#localeData = primaryLocale || {};

			this.#rawCityData = calculateNeighborDistance(normalizeStationCoordinates(rawData));
			this.#currentCity = resolvedCity;
			this.#currentNetwork = resolvedNetwork;
			this.#metroData = this.#filterByNetwork(this.#rawCityData, resolvedNetwork);
			this.#persistSelection(resolvedCity, resolvedNetwork);
			return this.#metroData;
		} catch (error) {
			if (error.name === "AbortError") return this.#metroData;
			console.warn(`[MetroDataStore] Failed to load "${resolvedCity}". Falling back to default "${this.#defaultCity}"...`, error);
			if (resolvedCity !== this.#defaultCity) {
				const fallbackData = await this.loadCity(this.#defaultCity, "dmrc");
				if (fallbackData) {
					fallbackData._fallback = { requestedCity: resolvedCity, fallbackCity: this.#defaultCity };
				}
				return fallbackData;
			}
			throw error;
		}
	}

	/**
	 * Pure Filtering Pipeline (Filters Lines, Stations, and Fares by Network)
	 */
	#filterByNetwork(rawData, networkKey) {
		if (!rawData) return rawData;

		// अगर नेटवर्क खाली या 'all' है -> तो Combined City Data रिटर्न करें
		if (!networkKey || networkKey === "all" || networkKey.trim() === "") {
			return rawData;
		}

		const normalizedNetKey = networkKey.trim().toLowerCase();
		const rawLines = rawData.lines || {};
		const rawStations = rawData.stationData || {};
		const rawFareRules = rawData.fareRules || {};

		// 1. केवल चुने हुए नेटवर्क की लाइन्स फ़िल्टर करें
		const filteredLines = {};
		const activeStationIds = new Set();
		for (const [lineId, lineObj] of Object.entries(rawLines)) {
			const lineNetwork = (lineObj.network || "").trim().toLowerCase();
			if (lineNetwork === normalizedNetKey) {
				filteredLines[lineId] = lineObj;
				if (Array.isArray(lineObj.stations)) {
					lineObj.stations.forEach(stId => activeStationIds.add(stId));
				}
			}
		}

		// Ensure any stations belonging to the active lines are preserved
		for (const [stId, stObj] of Object.entries(rawStations)) {
			if (Array.isArray(stObj.lines) && stObj.lines.some(lId => filteredLines[lId])) {
				activeStationIds.add(stId);
			}
		}

		if (Object.keys(filteredLines).length === 0) {
			return rawData;
		}

		// 2. केवल एक्टिव लाइन्स के स्टेशन्स रखें और उनके नेबर्स को क्लीन करें
		const filteredStationData = {};
		for (const stId of activeStationIds) {
			if (rawStations[stId]) {
				const originalStation = rawStations[stId];
				filteredStationData[stId] = {
					...originalStation,
					lines: (originalStation.lines || []).filter(lineId => filteredLines[lineId]),
					neighbors: (originalStation.neighbors || []).filter(nbr => filteredLines[nbr.line] && activeStationIds.has(nbr.station))
				};
			}
		}

		// 3. केवल संबंधित फेयर पॉलिसियां रखें
		const filteredFareRules = {
			version: rawFareRules.version || "1.0",
			currency: rawFareRules.currency || "INR",
			networks: {},
			policies: {}
		};

		if (rawFareRules.networks && rawFareRules.networks[normalizedNetKey]) {
			filteredFareRules.networks[normalizedNetKey] = rawFareRules.networks[normalizedNetKey];
		} else {
			filteredFareRules.networks = rawFareRules.networks || {};
		}

		if (rawFareRules.policies) {
			for (const [pKey, pObj] of Object.entries(rawFareRules.policies)) {
				const policyNetwork = (pObj.network || "").trim().toLowerCase();
				if (policyNetwork === normalizedNetKey) {
					filteredFareRules.policies[pKey] = pObj;
				}
			}
			if (Object.keys(filteredFareRules.policies).length === 0) {
				filteredFareRules.policies = rawFareRules.policies;
			}
		}

		// 4. केवल एक्टिव लाइन्स के ट्रांसफर्स रखें
		const rawTransfers = rawData.transfers || {};
		const filteredTransfers = {};
		for (const [stId, lineMap] of Object.entries(rawTransfers)) {
			if (activeStationIds.has(stId)) {
				const stFiltered = {};
				for (const [fromLine, targetMap] of Object.entries(lineMap)) {
					if (filteredLines[fromLine]) {
						const targetsFiltered = {};
						for (const [targetKey, targetObj] of Object.entries(targetMap)) {
							const [toStation, toLine] = targetKey.split(":");
							if (activeStationIds.has(toStation) && filteredLines[toLine]) {
								targetsFiltered[targetKey] = targetObj;
							}
						}
						if (Object.keys(targetsFiltered).length > 0) {
							stFiltered[fromLine] = targetsFiltered;
						}
					}
				}
				if (Object.keys(stFiltered).length > 0) {
					filteredTransfers[stId] = stFiltered;
				}
			}
		}

		return {
			...rawData,
			lines: filteredLines,
			stationData: filteredStationData,
			fareRules: filteredFareRules,
			transfers: filteredTransfers
		};
	}

	#persistSelection(city, network) {
		try {
			localStorage.setItem("active_city", city);
			if (network) {
				localStorage.setItem("active_network", network);
			} else {
				localStorage.removeItem("active_network");
			}
		} catch (e) {}
	}

	/**
	 * Dynamically loads detailed station facilities data (Base + Auto Overlay)
	 * Executes parallel non-blocking fetch with in-memory deep merge and soft fallback.
	 */
	async loadStationsDetail(cityKey = null) {
		const resolvedCity = this.#resolveCityKey(cityKey);

		// Prevent redundant fetch if already in memory for this city
		if (this.#stationsDetailData && this.#currentCity === resolvedCity) {
			return this.#stationsDetailData;
		}

		if (this.#detailsAbortController) {
			this.#detailsAbortController.abort();
		}
		this.#detailsAbortController = new AbortController();
		const signal = this.#detailsAbortController.signal;

		const basePath = this.getCityFilePath("station_details.json", resolvedCity);
		
		try {
			console.log(`[MetroDataStore] Fetching station details for "${resolvedCity}"...`);
			const res = await fetch(basePath, { signal });
			if (!res.ok) {
				if (signal.aborted) return this.#stationsDetailData;
				console.warn(`[MetroDataStore] Station details not found for "${resolvedCity}" (HTTP ${res.status})`);
				if (resolvedCity !== this.#defaultCity) {
					return await this.loadStationsDetail(this.#defaultCity);
				}
				return {};
			}

			const baseData = await res.json();

			// If staging buffer has unpromoted station_details, overlay them cleanly
			const bufferDetails = this.#stagingBuffer?.station_details;
			if (bufferDetails && typeof bufferDetails === "object") {
				for (const [stSlug, patch] of Object.entries(bufferDetails)) {
					if (stSlug === "_meta" || !patch || typeof patch !== "object") continue;
					if (!baseData[stSlug]) {
						const cleanPatch = { ...patch };
						delete cleanPatch._meta;
						baseData[stSlug] = cleanPatch;
					} else {
						const stRef = baseData[stSlug];
						for (const [field, candVal] of Object.entries(patch)) {
							if (field === "_meta" || candVal === null || candVal === undefined) continue;
							if (typeof candVal === "object" && !Array.isArray(candVal) && stRef[field] && typeof stRef[field] === "object" && !Array.isArray(stRef[field])) {
								if (field === "gates") {
									stRef.gates = stRef.gates || {};
									for (const [gKey, gObj] of Object.entries(candVal)) {
										stRef.gates[gKey] = { ...(stRef.gates[gKey] || {}), ...gObj };
									}
								} else {
									stRef[field] = { ...stRef[field], ...candVal };
								}
							} else {
								stRef[field] = candVal;
							}
						}
					}
				}
			}

			this.#stationsDetailData = baseData;
			return this.#stationsDetailData;

		} catch (error) {
			if (error.name === "AbortError") return this.#stationsDetailData;
			console.error(`[MetroDataStore] Critical error loading station details for "${resolvedCity}":`, error);
			if (resolvedCity !== this.#defaultCity) {
				return await this.loadStationsDetail(this.#defaultCity);
			}
			return {};
		}
	}

	/**
	 * Resolves City Key using 3-tier hierarchy
	 */
	#resolveCityKey(explicitCity) {
		if (explicitCity && typeof explicitCity === "string" && explicitCity.trim() !== "") {
			return explicitCity.trim().toLowerCase();
		}

		if (typeof window !== "undefined" && window.location) {
			const urlParams = new URLSearchParams(window.location.search);
			const paramCity = urlParams.get("city") || urlParams.get("region");
			if (paramCity && paramCity.trim() !== "") {
				return paramCity.trim().toLowerCase();
			}
		}

		try {
			const storedCity = localStorage.getItem("active_city");
			if (storedCity && storedCity.trim() !== "") {
				return storedCity.trim().toLowerCase();
			}
		} catch (e) {}

		return this.#defaultCity;
	}

	/**
	 * Resolves Network Key
	 */
	#resolveNetworkKey(explicitNetwork) {
		if (explicitNetwork && typeof explicitNetwork === "string") {
			return explicitNetwork.trim().toLowerCase();
		}

		if (typeof window !== "undefined" && window.location) {
			const urlParams = new URLSearchParams(window.location.search);
			if (urlParams.has("network") || urlParams.has("net")) {
				const paramNet = urlParams.get("network") ?? urlParams.get("net");
				return (paramNet || "").trim().toLowerCase();
			}
		}

		try {
			const storedNet = localStorage.getItem("active_network");
			if (storedNet && storedNet.trim() !== "") {
				return storedNet.trim().toLowerCase();
			}
		} catch (e) {}

		return null;
	}


	/**
	 * 🌐 Centralized City File Path Resolver (Single Source of Truth)
	 * Resolves active country and returns normalized relative path.
	 * @param {string} fileName - e.g. "passenger_support.json", "transit_network.json"
	 * @param {string} cityKey - optional city key
	 * @returns {string} e.g. "data/india/cities/delhi_ncr/passenger_support.json"
	 */
	getCityFilePath(fileName, cityKey = null) {
		const resolvedCity = this.#resolveCityKey(cityKey);
		const activeCountry = localStorage.getItem("active_country") || "india";
		return `data/${activeCountry}/cities/${resolvedCity}/${fileName}`;
	}

	getCityLocalePath(cityKey = null, lang = null) {
		const resolvedCity = this.#resolveCityKey(cityKey);
		const activeCountry = localStorage.getItem("active_country") || "india";
		const activeLang = lang || localStorage.getItem("language") || localStorage.getItem("app-lang") || "en";
		return `locales/${activeLang}/${activeCountry}/${resolvedCity}_station_details_locale.json`;
	}

	/**
	 * 🔄 Reloads active city locale pack on language switch (Zero graph reload)
	 */
	async reloadLocale(lang) {
		if (this.#localeAbortController) {
			this.#localeAbortController.abort();
		}
		this.#localeAbortController = new AbortController();
		const signal = this.#localeAbortController.signal;

		const localePath = this.getCityLocalePath(this.#currentCity, lang);
		try {
			console.log(`[MetroDataStore] Reloading locale pack: "${localePath}"...`);
			const res = await fetch(localePath, { signal });
			let loadedLocale = res.ok ? await res.json() : null;

			const hasValidNames = loadedLocale && Object.values(loadedLocale.stations || {}).some(st => st.name && st.name.trim() !== "");

			if ((!res.ok || !hasValidNames) && lang !== "en") {
				console.warn(`[MetroDataStore] ${lang.toUpperCase()} not available for "${this.#currentCity}". Falling back to English...`);
				
				// यदि कैश में अंग्रेज़ी नहीं है, तो लाएं
				if (!this.#enLocaleData) {
					const enPath = this.getCityLocalePath(this.#currentCity, "en");
					const enRes = await fetch(enPath, { signal });
					if (enRes.ok) {
						this.#enLocaleData = await enRes.json();
					}
				}

				this.#localeData = this.#enLocaleData || {};
				eventBus.emit("SHOW_TOAST", {
					type: "warning",
					title: i18n.t("toasts.langFallbackTitle"),
					message: i18n.t("toasts.langFallbackMsg", { lang: lang.toUpperCase() }),
					duration: 4500
				});
				return this.#localeData;
			}

			this.#localeData = loadedLocale || {};
			return this.#localeData;
		} catch (e) {
			if (e.name !== "AbortError") {
				console.warn("[MetroDataStore] Failed to reload locale:", e);
			}
		}
		return this.#localeData;
	}

	/**
	 * 🛡️ Centralized Passenger Support Loader
	 * Loads official city-specific support/helpline directory.
	 * Returns null gracefully if unavailable (STRICTLY NO SILENT FALLBACK TO OTHER CITIES).
	 */
	async loadPassengerSupport(cityKey = null) {
		const resolvedCity = this.#resolveCityKey(cityKey);
		const dataPath = this.getCityFilePath("passenger_support.json", resolvedCity);

		try {
			const res = await fetch(dataPath);
			if (!res.ok) {
				console.warn(`[MetroDataStore] Passenger support directory not found for "${resolvedCity}" (${dataPath})`);
				return null;
			}
			return await res.json();
		} catch (err) {
			console.warn(`[MetroDataStore] Error loading passenger support for "${resolvedCity}":`, err.message);
			return null;
		}
	}

	// Public Getters
	get data() {
		return this.#metroData;
	}

	get stationData() {
		return this.#metroData?.stationData || {};
	}

	get lines() {
		return this.#metroData?.lines || {};
	}

	get fareRules() {
		return this.#metroData?.fareRules || {};
	}

	get transfers() {
		return this.#metroData?.transfers || {};
	}
	
	get currentCity() {
		return this.#currentCity;
	}

	get currentNetwork() {
		return this.#currentNetwork;
	}

	get stationsDetail() {
		return this.#stationsDetailData || {};
	}

	get stagingBuffer() {
		return this.#stagingBuffer || {};
	}

	get hasPendingStagingBuffer() {
		const summary = this.#stagingBuffer?._meta?.summary;
		if (summary) {
			return Boolean(summary.total_delta_stations > 0 || summary.new_graph_stations > 0 || summary.new_lines > 0);
		}
		return false;
	}

	get isLoaded() {
		return Boolean(this.#metroData && Object.keys(this.#metroData.lines || {}).length > 0);
	}


	// =========================================================================
	// 🌐 LOCALIZED TRANSIT RESOLVERS (Strict Single Source of Truth)
	// =========================================================================
	getStationName(stationId) {
		if (!stationId) return "";
		const stations = this.#localeData?.stations;
		// 1. Fast-path: Exact key match in active locale
		const exactName = stations?.[stationId]?.name;
		if (exactName && exactName.trim() !== "") return exactName;

		// 2. Fallback path for case mismatch
		const normId = String(stationId).toLowerCase();
		const normName = stations?.[normId]?.name;
		if (normName && normName.trim() !== "") return normName;

		// 3. Fallback to English cache if active locale name is empty
		const enName = this.#enLocaleData?.stations?.[stationId]?.name || this.#enLocaleData?.stations?.[normId]?.name;
		if (enName && enName.trim() !== "") return enName;

		return stationId;
	}

	getStationAliases(stationId) {
		if (!stationId) return [];
		const stations = this.#localeData?.stations;
		if (stations?.[stationId]?.aliases) return stations[stationId].aliases;
		return stations?.[String(stationId).toLowerCase()]?.aliases || [];
	}

	getStationDescription(stationId) {
		if (!stationId) return "";
		const stations = this.#localeData?.stations;
		if (stations?.[stationId]?.description) return stations[stationId].description;
		return stations?.[String(stationId).toLowerCase()]?.description || "";
	}

	getStationLandmarks(stationId) {
		if (!stationId) return [];
		const stations = this.#localeData?.stations;
		if (stations?.[stationId]?.landmarks) return stations[stationId].landmarks;
		return stations?.[String(stationId).toLowerCase()]?.landmarks || [];
	}

	getGateLandmark(stationId, gateId) {
		if (!stationId) return "";
		const stations = this.#localeData?.stations;
		const stObj = stations?.[stationId] || stations?.[String(stationId).toLowerCase()];
		return stObj?.gates?.[gateId] || "";
	}

	getLineName(lineId) {
		return this.#localeData?.lines?.[lineId]?.name || lineId || "";
	}

	getLineShortName(lineId) {
		return this.#localeData?.lines?.[lineId]?.short_name || lineId || "";
	}

	getNetworkName(networkId) {
		return this.#localeData?.networks?.[networkId] || networkId || "";
	}

	getPolicyName(policyId) {
		if (!policyId) return "";
		return this.#localeData?.policies?.[policyId] || this.#enLocaleData?.policies?.[policyId] || "";
	}

	/**
	 * 🏙️ शहर का शुद्ध प्रदर्शन नाम (100% Dynamic from Registry - Zero Hardcoding)
	 * @param {string} [cityKey=null]
	 * @param {string} [lang=null]
	 */
	getCityDisplayName(cityKey = null, lang = null) {
		const key = cityKey || this.#currentCity || "delhi_ncr";
		const activeLang = lang || localStorage.getItem("language") || localStorage.getItem("app-lang") || "en";

		// 1. यदि रजिस्ट्री मेमोरी में है, तो आधिकारिक बहुभाषी नाम लौटाएं
		const cityObj = this.#registryData?.cities?.[key];
		if (cityObj?.name) {
			return cityObj.name[activeLang] || cityObj.name.en || key;
		}

		// 2. फ़ॉलबैक: की को सुंदर टाइटल केस में लौटाएं (e.g. delhi_ncr -> Delhi NCR)
		return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
	}

	get localeData() {
		return this.#localeData || {};
	}

}

export const metroDataStore = new MetroDataStore();