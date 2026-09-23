/**
 * Metro Data Store - Universal Dynamic Singleton Data Repository
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically loads, filters, and deep-merges transit & auto-delta data for any selected city.
 */
import { normalizeStationCoordinates } from "./data-utils.js";

class MetroDataStore {
	// Private State Fields
	#rawCityData = null;
	#metroData = null;
	#stationsDetailData = null;
	#stationsDetailAutoData = null;
	#currentCity = "delhi_ncr";
	#currentNetwork = null;
	#registryData = null;
	#abortController = null;
	#detailsAbortController = null;
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
			const response = await fetch("data/india_transit_registry.json");
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

		const dataPath = `data/cities/${resolvedCity}/transit_network.json`;
		const autoDataPath = `data/cities/${resolvedCity}/transit_network_auto.json`;

		try {
			console.log(`[MetroDataStore] Loading transit graph (Base + Auto) for: "${resolvedCity}"...`);
			const [baseResult, autoResult] = await Promise.allSettled([
				fetch(dataPath, { signal }).then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				}),
				fetch(autoDataPath, { signal }).then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				})
			]);

			if (baseResult.status !== "fulfilled") {
				if (signal.aborted) return this.#metroData;
				throw new Error(`Data file not found for city "${resolvedCity}" (HTTP ${baseResult.reason})`);
			}

			const rawData = baseResult.value;

			// In-memory merge of auto graph delta (stations & lines)
			if (autoResult.status === "fulfilled" && autoResult.value) {
				const autoGraph = autoResult.value;
				const autoStations = autoGraph.stations || {};
				const autoLines = autoGraph.lines || {};

				// 1. Merge Auto Stations
				rawData.stationData = rawData.stationData || {};
				for (const [stSlug, stObj] of Object.entries(autoStations)) {
					if (rawData.stationData[stSlug]) {
						rawData.stationData[stSlug] = {
							...rawData.stationData[stSlug],
							...stObj
						};
					} else {
						rawData.stationData[stSlug] = { ...stObj };
					}
				}

				// 2. Merge Auto Lines
				rawData.lines = rawData.lines || {};
				for (const [lineId, lineObj] of Object.entries(autoLines)) {
					if (rawData.lines[lineId]) {
						rawData.lines[lineId] = {
							...rawData.lines[lineId],
							...lineObj
						};
					} else {
						rawData.lines[lineId] = { ...lineObj };
					}
				}
			}

			this.#rawCityData = normalizeStationCoordinates(rawData);
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

		const basePath = `data/cities/${resolvedCity}/station_details.json`;
		const autoPath = `data/cities/${resolvedCity}/station_details_auto.json`;

		try {
			console.log(`[MetroDataStore] Fetching station details (Base + Auto) for "${resolvedCity}"...`);
			
			// Parallel non-blocking execution across Base and Auto stores
			const [baseResult, autoResult] = await Promise.allSettled([
				fetch(basePath, { signal }).then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				}),
				fetch(autoPath, { signal }).then(res => {
					if (!res.ok) throw new Error(`HTTP ${res.status}`);
					return res.json();
				})
			]);

			// 1. Base File Handling (Mandatory with graceful fallback)
			if (baseResult.status !== "fulfilled") {
				if (signal.aborted) return this.#stationsDetailData;
				console.warn(`[MetroDataStore] Base station details not found for "${resolvedCity}":`, baseResult.reason);
				if (resolvedCity !== this.#defaultCity) {
					return await this.loadStationsDetail(this.#defaultCity);
				}
				return {};
			}

			const baseData = baseResult.value || {};

			// 2. Auto File Handling (Soft Fallback - Silent ignore on 404/failure)
			let autoData = null;
			if (autoResult.status === "fulfilled" && autoResult.value && typeof autoResult.value === "object") {
				autoData = autoResult.value;
				this.#stationsDetailAutoData = autoData;
				console.log(`[MetroDataStore] Live auto delta detected (${Object.keys(autoData).length} entries) for "${resolvedCity}".`);
			} else {
				this.#stationsDetailAutoData = null;
			}

			// 3. In-Memory Deep Merge (Base + Live Delta)
			this.#stationsDetailData = this.#deepMergeStationDetails(baseData, autoData);
			return this.#stationsDetailData;

		} catch (error) {
			if (error.name === "AbortError") return this.#stationsDetailData;
			console.error(`[MetroDataStore] Critical error loading station details for "${resolvedCity}":`, error);
			return {};
		}
	}

	/**
	 * In-Memory Deep Merge Algorithm: Overlays auto delta over base without data loss.
	 */
	#deepMergeStationDetails(baseData, autoData) {
		if (!autoData || typeof autoData !== "object" || Object.keys(autoData).length === 0) {
			return { ...baseData };
		}

		const merged = { ...baseData };

		for (const [slug, patch] of Object.entries(autoData)) {
			// Skip root metadata headers
			if (slug === "_meta" || !patch || typeof patch !== "object") {
				continue;
			}

			// Case A: New station not in base -> Append directly
			if (!merged[slug]) {
				const cleanPatch = { ...patch };
				delete cleanPatch._meta;
				merged[slug] = cleanPatch;
				continue;
			}

			// Case B: Existing station -> Selective deep merge
			const baseStation = merged[slug];
			const updatedStation = { ...baseStation };

			for (const [field, candVal] of Object.entries(patch)) {
				if (field === "_meta" || candVal === null || candVal === undefined) {
					continue;
				}

				// Deep merge nested dictionaries (gates, timings, contact, facilities)
				if (
					typeof candVal === "object" &&
					!Array.isArray(candVal) &&
					baseStation[field] &&
					typeof baseStation[field] === "object" &&
					!Array.isArray(baseStation[field])
				) {
					if (field === "gates") {
						// Gate-level fine-grained merge
						const mergedGates = { ...(baseStation.gates || {}) };
						for (const [gKey, gObj] of Object.entries(candVal)) {
							if (mergedGates[gKey] && typeof gObj === "object") {
								mergedGates[gKey] = { ...mergedGates[gKey], ...gObj };
							} else {
								mergedGates[gKey] = gObj;
							}
						}
						updatedStation.gates = mergedGates;
					} else {
						updatedStation[field] = {
							...baseStation[field],
							...candVal
						};
					}
				} else {
					// Arrays (parkings, platforms) or primitive values override directly
					updatedStation[field] = candVal;
				}
			}

			merged[slug] = updatedStation;
		}

		return merged;
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

	get stationsDetailAuto() {
		return this.#stationsDetailAutoData || {};
	}

	get hasLiveAutoDelta() {
		return Boolean(this.#stationsDetailAutoData && Object.keys(this.#stationsDetailAutoData).length > 1);
	}

	get isLoaded() {
		return Boolean(this.#metroData && Object.keys(this.#metroData.lines || {}).length > 0);
	}
}

export const metroDataStore = new MetroDataStore();