/**
 * 🌐 TransitNetworkHelper - Dynamic Global Metro Intelligence
 * Extracts hubs, interchange junctions, starter suggestions, and clusters
 * dynamically from whichever transit network is currently loaded in CenterClass.
 * 100% Network-Agnostic: Zero Hardcoded Cities or Stations.
 */

import { centerClass } from "../../core/CenterClass.js";

export class TransitNetworkHelper {
	/**
	 * Get the top hub / interchange stations of the active network
	 * @param {number} [limit=4]
	 * @returns {Array<Object>}
	 */
	static getTopNetworkHubs(limit = 4) {
		const metroData = centerClass.getMetroData();
		if (!metroData?.stationData) return [];

		const stations = Object.values(metroData.stationData).filter(Boolean);
		if (stations.length === 0) return [];

		// Rank stations: 1) is_interchange, 2) number of intersecting lines, 3) connectivity degree
		const ranked = [...stations].sort((a, b) => {
			const aInter = a.is_interchange ? 1 : 0;
			const bInter = b.is_interchange ? 1 : 0;
			if (bInter !== aInter) return bInter - aInter;

			const aLines = Array.isArray(a.lines) ? a.lines.length : (a.line ? 1 : 0);
			const bLines = Array.isArray(b.lines) ? b.lines.length : (b.line ? 1 : 0);
			if (bLines !== aLines) return bLines - aLines;

			const aConn = Array.isArray(a.connections) ? a.connections.length : 0;
			const bConn = Array.isArray(b.connections) ? b.connections.length : 0;
			return bConn - aConn;
		});

		return ranked.slice(0, limit);
	}

	/**
	 * Get 2-3 prominent starter stations for quick action chips
	 * @param {string} lang
	 * @returns {Array<{ label: string, stationId: string }>}
	 */
	static getStarterActionChips(lang = "en") {
		const hubs = this.getTopNetworkHubs(3);
		return hubs.map(st => ({
			label: centerClass.getStationName(st.id, lang),
			action: "set_station",
			payload: { stationId: st.id }
		}));
	}

	/**
	 * Get starter suggestion pairs (e.g. "Station A to Station B")
	 * @param {string} lang
	 * @returns {Array<string>}
	 */
	static getStarterRouteSuggestions(lang = "en") {
		const hubs = this.getTopNetworkHubs(4);
		if (hubs.length < 2) return [];

		const name1 = centerClass.getStationName(hubs[0].id, lang);
		const name2 = centerClass.getStationName(hubs[1].id, lang);

		const suggestions = [`${name1} to ${name2}`];

		if (hubs.length >= 3) {
			const name3 = centerClass.getStationName(hubs[2].id, lang);
			suggestions.push(`${name2} to ${name3}`);
		}

		return suggestions;
	}

	/**
	 * Dynamically group stations into an ambiguous cluster if query matches multiple stations sharing a common root word
	 * @param {string} queryTerm - The searched candidate string (e.g. "rohini", "sector", "central")
	 * @param {Array<Object>} candidates - Station search matches
	 * @param {string} lang
	 * @returns {{ isAmbiguous: boolean, clusterCandidates: Array<Object> }}
	 */
	static detectAmbiguousCluster(queryTerm, candidates = [], lang = "en") {
		if (!candidates || candidates.length < 2) {
			return { isAmbiguous: false, clusterCandidates: candidates };
		}

		const cleanQuery = queryTerm.toLowerCase().trim();
		if (cleanQuery.length < 3) {
			return { isAmbiguous: false, clusterCandidates: candidates };
		}

		// Filter candidates that actually contain the query root in their English, native or localized name
		const matching = candidates.filter(st => {
			const enName = (typeof st.name === "object" ? st.name?.en : st.name) || st.id || "";
			const locName = centerClass.getStationName(st.id, lang) || "";
			const stId = (st.id || "").toLowerCase();
			return enName.toLowerCase().includes(cleanQuery) ||
				locName.toLowerCase().includes(cleanQuery) ||
				stId.includes(cleanQuery.replace(/\s+/g, "_"));
		});

		if (matching.length >= 2) {
			return { isAmbiguous: true, clusterCandidates: matching };
		}

		return { isAmbiguous: false, clusterCandidates: candidates };
	}
}
