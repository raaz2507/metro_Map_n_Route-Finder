/**
 * ❓ ClarificationEngine - Interactive Disambiguation & Missing Slot Handler
 * Generates user-friendly clarification prompts and clickable action buttons.
 * 100% Dynamic, Network-Agnostic, and Language-Agnostic.
 */

import { centerClass } from "../../../core/CenterClass.js";
import { TransitNetworkHelper } from "../TransitNetworkHelper.js";

export class ClarificationEngine {
	/**
	 * Build clarification response for missing source station
	 */
	static buildMissingSourceClarification(destination, lang = "en") {
		const destName = typeof destination === "object" ? centerClass.getStationName(destination.id, lang) : destination;
		const text = centerClass.t("ai.missingSource", { dest: destName });

		// Dynamically discover top transit hubs of active network
		const hubs = TransitNetworkHelper.getTopNetworkHubs(4);
		const actions = hubs
			.filter(st => st.id !== destination?.id)
			.slice(0, 3)
			.map(st => ({
				label: centerClass.getStationName(st.id, lang),
				action: "select_source",
				payload: { sourceId: st.id, destinationId: destination?.id }
			}));

		return {
			text,
			actions,
			suggestions: hubs.slice(0, 3).map(st => centerClass.getStationName(st.id, lang))
		};
	}

	/**
	 * Build clarification response for missing destination station
	 */
	static buildMissingDestinationClarification(source, lang = "en") {
		const srcName = typeof source === "object" ? centerClass.getStationName(source.id, lang) : source;
		const text = centerClass.t("ai.missingDest", { source: srcName });

		// Dynamically discover alternative hubs as destination suggestions
		const hubs = TransitNetworkHelper.getTopNetworkHubs(4);
		const suggestions = hubs
			.filter(st => st.id !== source?.id)
			.slice(0, 3)
			.map(st => centerClass.getStationName(st.id, lang));

		return {
			text,
			actions: [],
			suggestions
		};
	}

	/**
	 * Build clarification for multiple ambiguous candidate stations
	 */
	static buildDisambiguationClarification(candidates = [], slotType = "station", lang = "en") {
		const text = centerClass.t("ai.disambiguation");

		const actions = candidates.slice(0, 4).map(st => ({
			label: centerClass.getStationName(st.id, lang),
			action: `select_${slotType}`,
			payload: { stationId: st.id, slotType }
		}));

		return {
			text,
			actions,
			suggestions: []
		};
	}

	/**
	 * Build clarification for unverified locality
	 */
	static buildUnverifiedLocalityClarification(localityName, lang = "en") {
		const text = centerClass.t("ai.unverifiedLocality", { locality: localityName });
		const topHub = TransitNetworkHelper.getTopNetworkHubs(1)[0];

		return {
			text,
			actions: [],
			suggestions: [
				centerClass.t("ai.sugFindNearby"),
				topHub ? centerClass.getStationName(topHub.id, lang) : null
			].filter(Boolean)
		};
	}

	/**
	 * Build response for same source and destination
	 */
	static buildSameStationWarning(stationName, lang = "en") {
		const text = centerClass.t("ai.sameStation", { station: stationName });
		const starterRoutes = TransitNetworkHelper.getStarterRouteSuggestions(lang);

		return {
			text,
			actions: [],
			suggestions: [
				starterRoutes[0] || null,
				centerClass.t("ai.sugReturnRoute")
			].filter(Boolean)
		};
	}
}
