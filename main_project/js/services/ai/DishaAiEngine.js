/**
 * 🤖 DishaAiEngine - Core Conversational & NLU Orchestrator
 * Integrates Normalizer, Entity Resolver, Intent Classifier, State Context, and CenterClass.
 * 100% Dependency-Free, Fully Deterministic, Offline-First.
 */

import { centerClass } from "../../core/CenterClass.js";
import i18n from "../../core/i18n.js";
import { TransitNetworkHelper } from "./TransitNetworkHelper.js";
import { TextNormalizer } from "./nlu/TextNormalizer.js";
import { StationEntityResolver } from "./nlu/StationEntityResolver.js";
import { IntentClassifier } from "./nlu/IntentClassifier.js";
import { ConversationContext } from "./nlu/ConversationContext.js";
import { ClarificationEngine } from "./nlu/ClarificationEngine.js";
import { DishaResponseFormatter } from "./nlu/DishaResponseFormatter.js";

export class DishaAiEngine {
	#context = null;

	constructor() {
		this.#context = new ConversationContext();
	}

	/**
	 * Reset conversation context (New Chat)
	 */
	reset() {
		this.#context.reset();
	}

	exportState() {
		return this.#context.exportState();
	}

	restoreState(state) {
		this.#context.restoreState(state);
	}

	get context() {
		return this.#context;
	}

	/**
	 * Main pipeline: processes user query and returns structured UI payload
	 * @param {string} userQuery - Raw user input
	 * @param {Object} [options={}] - { lang: "en" | "hi", actionPayload: Object, starterAction: string }
	 * @returns {Promise<Object>} { text, cardData, actions, suggestions, resultCardHtml }
	 */
	async processMessage(userQuery, options = {}) {
		const lang = options.lang || i18n.getLanguage || "en";
		const actionPayload = options.actionPayload || null;
		const starterAction = options.starterAction || null;

		// 1. Handle Starter Action Prompt setup
		if (starterAction) {
			return this.#handleStarterActionSetup(starterAction, lang);
		}

		// 2. Check if user clicked an explicit action button
		if (actionPayload && actionPayload.action) {
			const actionResult = await this.#handleActionPayload(actionPayload, lang);
			if (actionResult) return actionResult;
		}

		// 3. Preprocessing & Text Normalization
		const normData = TextNormalizer.normalize(userQuery);
		if (!normData.cleanedText) {
			return DishaResponseFormatter.formatGreeting(lang);
		}

		// 4. Check Pending Clarification (Slot fulfillment)
		const pending = this.#context.pendingClarification;
		if (pending) {
			const fulfillmentResult = await this.#handlePendingClarification(normData, pending, lang);
			if (fulfillmentResult) {
				return fulfillmentResult;
			}
		}

		// 5. Entity & Slot Extraction
		const entities = StationEntityResolver.resolve(normData, lang);

		// 6. Intent Classification (Evaluates dynamic language NLU patterns)
		const { intent, confidence } = IntentClassifier.classify(normData, entities, this.#context, lang);
		this.#context.setCurrentIntent(intent);

		// 7. Handle Ambiguity & Unverified Localities early
		if (entities.unverifiedLocality) {
			return ClarificationEngine.buildUnverifiedLocalityClarification(entities.unverifiedLocality, lang);
		}

		if (entities.isAmbiguous && entities.candidates.length > 1) {
			if (entities.ambiguousSlot === "source_then_dest") {
				this.#context.setPendingClarification({
					type: "AMBIGUOUS_SOURCE_THEN_DEST",
					rawSrc: entities.rawSrc,
					srcCandidates: entities.srcCandidates,
					rawDst: entities.rawDst,
					dstCandidates: entities.dstCandidates
				});
				const text = i18n.t("ai.selectStartStationInArea", { area: entities.rawSrc });
				return {
					text,
					actions: entities.srcCandidates.map(st => ({
						label: centerClass.getStationName(st.id, lang),
						action: "select_source_for_chain",
						payload: { stationId: st.id }
					})),
					suggestions: []
				};
			}

			if (entities.source && !entities.destination) {
				// E.g. "gtb to rohini": source is GTB, destination has multiple candidates
				this.#context.setPendingClarification({
					type: "AMBIGUOUS_DESTINATION",
					source: entities.source,
					candidates: entities.candidates
				});
				const srcName = centerClass.getStationName(entities.source.id, lang);
				const dstQ = entities.ambiguousQuery || i18n.t("ai.destination");
				const text = i18n.t("ai.selectDestStationPrompt", { src: srcName, dst: dstQ });
				return {
					text,
					actions: entities.candidates.map(st => ({
						label: centerClass.getStationName(st.id, lang),
						action: "select_destination",
						payload: { sourceId: entities.source.id, destinationId: st.id }
					})),
					suggestions: []
				};
			} else if (!entities.source && entities.destination) {
				this.#context.setPendingClarification({
					type: "AMBIGUOUS_SOURCE",
					destination: entities.destination,
					candidates: entities.candidates
				});
				const dstName = centerClass.getStationName(entities.destination.id, lang);
				const srcQ = entities.ambiguousQuery || i18n.t("ai.origin");
				const text = i18n.t("ai.selectStartStationPrompt", { dst: dstName, src: srcQ });
				return {
					text,
					actions: entities.candidates.map(st => ({
						label: centerClass.getStationName(st.id, lang),
						action: "select_source",
						payload: { sourceId: st.id, destinationId: entities.destination.id }
					})),
					suggestions: []
				};
			} else {
				this.#context.setPendingClarification({
					type: "AMBIGUOUS_STATION",
					candidates: entities.candidates
				});
				return ClarificationEngine.buildDisambiguationClarification(entities.candidates, "station", lang);
			}
		}

		// 8. Route and Dispatch by Intent
		let responsePayload = null;

		switch (intent) {
			case IntentClassifier.INTENTS.GREETING:
				responsePayload = DishaResponseFormatter.formatGreeting(lang);
				break;

			case IntentClassifier.INTENTS.HELP:
				responsePayload = DishaResponseFormatter.formatHelp(lang);
				break;

			case IntentClassifier.INTENTS.RETURN_ROUTE:
				responsePayload = await this.#handleReturnRoute(lang);
				break;

			case IntentClassifier.INTENTS.ROUTE_SEARCH:
				responsePayload = await this.#handleRouteSearch(entities, lang);
				break;

			case IntentClassifier.INTENTS.FARE_ENQUIRY:
				responsePayload = await this.#handleFareEnquiry(entities, lang);
				break;

			case IntentClassifier.INTENTS.TIME_DISTANCE:
				responsePayload = await this.#handleTimeDistance(entities, lang);
				break;

			case IntentClassifier.INTENTS.STATION_INFO:
				responsePayload = this.#handleStationInfo(entities, lang);
				break;

			case IntentClassifier.INTENTS.LINE_INFO:
				responsePayload = this.#handleLineInfo(entities, lang);
				break;

			case IntentClassifier.INTENTS.NEARBY_STATION:
				responsePayload = this.#handleNearbyStations(lang);
				break;

			default:
				// If user entered a single station name with no keywords, default to station info
				if (entities.station) {
					responsePayload = this.#handleStationInfo(entities, lang);
				} else {
					responsePayload = DishaResponseFormatter.formatFallback(userQuery, lang);
				}
				break;
		}

		// 9. Record in context history
		this.#context.recordTurn(normData.rawText, responsePayload);

		return responsePayload;
	}

	/**
	 * Setup state when starter action cards are clicked
	 */
	#handleStarterActionSetup(starterAction, lang) {
		if (starterAction === "route") {
			this.#context.setPendingClarification({ type: "NEED_ROUTE_STATIONS" });
			const suggestions = TransitNetworkHelper.getStarterRouteSuggestions(lang);
			return {
				text: i18n.t("ai.starterRoutePrompt"),
				actions: [],
				suggestions
			};
		}

		if (starterAction === "fare") {
			this.#context.setPendingClarification({ type: "NEED_FARE_STATIONS" });
			const hubs = TransitNetworkHelper.getTopNetworkHubs(2);
			const fareEx = hubs.length >= 2
				? `Fare from ${centerClass.getStationName(hubs[0].id, lang)} to ${centerClass.getStationName(hubs[1].id, lang)}`
				: null;
			return {
				text: i18n.t("ai.starterFarePrompt"),
				actions: [],
				suggestions: [fareEx, i18n.t("ai.sugSmartCardBenefits")].filter(Boolean)
			};
		}

		if (starterAction === "station") {
			this.#context.setPendingClarification({ type: "NEED_STATION_FOR_INFO" });
			const chips = TransitNetworkHelper.getStarterActionChips(lang);
			const hubs = TransitNetworkHelper.getTopNetworkHubs(2);
			return {
				text: i18n.t("ai.starterStationPrompt"),
				actions: chips,
				suggestions: hubs.map(h => centerClass.getStationName(h.id, lang))
			};
		}

		if (starterAction === "line") {
			this.#context.setPendingClarification({ type: "NEED_STATION_FOR_LINE" });
			const hubs = TransitNetworkHelper.getTopNetworkHubs(2);
			return {
				text: i18n.t("ai.starterLinePrompt"),
				actions: [],
				suggestions: hubs.map(h => centerClass.getStationName(h.id, lang))
			};
		}

		if (starterAction === "nearby") {
			return this.#handleNearbyStations(lang);
		}

		return DishaResponseFormatter.formatGreeting(lang);
	}

	/**
	 * Handle Route Search Intent
	 */
	async #handleRouteSearch(entities, lang) {
		const source = entities.source;
		const destination = entities.destination;

		// Case A: Missing source, have destination
		if (!source && destination) {
			this.#context.setPendingClarification({
				type: "MISSING_SOURCE",
				destination
			});
			return ClarificationEngine.buildMissingSourceClarification(destination, lang);
		}

		// Case B: Missing destination, have source
		if (source && !destination) {
			this.#context.setPendingClarification({
				type: "MISSING_DESTINATION",
				source
			});
			return ClarificationEngine.buildMissingDestinationClarification(source, lang);
		}

		// Case C: Neither found
		if (!source && !destination) {
			return DishaResponseFormatter.formatFallback("", lang);
		}

		// Case D: Same station
		if (source.id === destination.id) {
			const stName = centerClass.getStationName(source.id, lang);
			return ClarificationEngine.buildSameStationWarning(stName, lang);
		}

		// Case E: Both stations available -> Execute search via CenterClass
		const routeData = centerClass.searchRoute(source.id, destination.id, { routeType: "leastTransfers" });
		if (!routeData || !routeData.path || routeData.path.length === 0) {
			const sName = centerClass.getStationName(source.id, lang);
			const dName = centerClass.getStationName(destination.id, lang);
			return {
				text: i18n.t("ai.noRouteFound", { source: sName, dest: dName }),
				actions: [],
				suggestions: [i18n.t("ai.tryOtherStations")]
			};
		}

		// Store in context & synchronize map
		this.#context.saveRouteResult(routeData);

		return DishaResponseFormatter.formatRouteResult(routeData, lang);
	}

	/**
	 * Handle Fare Enquiry Intent (Grounded in context or explicit stations)
	 */
	async #handleFareEnquiry(entities, lang) {
		const slots = this.#context.resolveFollowUpSlots("FARE_ENQUIRY", entities);

		if (slots.source && slots.destination) {
			const routeData = centerClass.searchRoute(slots.source.id, slots.destination.id);
			if (routeData) {
				this.#context.saveRouteResult(routeData);
				return DishaResponseFormatter.formatFareResult(routeData, lang);
			}
		}

		if (slots.destination) {
			this.#context.setPendingClarification({
				type: "MISSING_SOURCE",
				destination: slots.destination
			});
			return ClarificationEngine.buildMissingSourceClarification(slots.destination, lang);
		}

		const sampleRoute = TransitNetworkHelper.getStarterRouteSuggestions(lang)[0] || null;
		return {
			text: i18n.t("ai.needStationsForFare"),
			actions: [],
			suggestions: [sampleRoute].filter(Boolean)
		};
	}

	/**
	 * Handle Time & Distance Intent
	 */
	async #handleTimeDistance(entities, lang) {
		const slots = this.#context.resolveFollowUpSlots("TIME_DISTANCE", entities);

		if (slots.source && slots.destination) {
			const routeData = centerClass.searchRoute(slots.source.id, slots.destination.id);
			if (routeData) {
				this.#context.saveRouteResult(routeData);
				return DishaResponseFormatter.formatTimeDistanceResult(routeData, lang);
			}
		}

		const sampleRoute = TransitNetworkHelper.getStarterRouteSuggestions(lang)[0] || null;
		return {
			text: i18n.t("ai.needStationsForTime"),
			actions: [],
			suggestions: [sampleRoute].filter(Boolean)
		};
	}

	/**
	 * Handle Return Route
	 */
	async #handleReturnRoute(lang) {
		const swapped = this.#context.getSwappedReturnSlots();
		if (!swapped) {
			const sampleRoute = TransitNetworkHelper.getStarterRouteSuggestions(lang)[0] || null;
			return {
				text: i18n.t("ai.searchInitialRouteFirst"),
				actions: [],
				suggestions: [sampleRoute].filter(Boolean)
			};
		}

		const routeData = centerClass.searchRoute(swapped.source.id, swapped.destination.id);
		if (!routeData) {
			return DishaResponseFormatter.formatFallback("", lang);
		}

		this.#context.saveRouteResult(routeData);
		return DishaResponseFormatter.formatRouteResult(routeData, lang);
	}

	/**
	 * Handle Station Info
	 */
	#handleStationInfo(entities, lang) {
		const station = entities.station || entities.source || entities.destination;
		if (station) {
			return DishaResponseFormatter.formatStationInfo(station, lang);
		}

		const topHub = TransitNetworkHelper.getTopNetworkHubs(1)[0];
		return {
			text: i18n.t("ai.starterStationPrompt"),
			actions: [],
			suggestions: [topHub ? centerClass.getStationName(topHub.id, lang) : null].filter(Boolean)
		};
	}

	/**
	 * Handle Line Info
	 */
	#handleLineInfo(entities, lang) {
		const station = entities.station || entities.source || entities.destination;
		if (station) {
			return DishaResponseFormatter.formatLineInfo(station, lang);
		}

		const topHub = TransitNetworkHelper.getTopNetworkHubs(1)[0];
		return {
			text: i18n.t("ai.starterLinePrompt"),
			actions: [],
			suggestions: [topHub ? centerClass.getStationName(topHub.id, lang) : null].filter(Boolean)
		};
	}

	/**
	 * Handle Nearby Stations Intent
	 */
	#handleNearbyStations(lang) {
		const chips = TransitNetworkHelper.getStarterActionChips(lang);
		return {
			text: i18n.t("ai.nearbyPrompt"),
			actions: chips,
			suggestions: [
				chips[0]?.label || null,
				i18n.t("ai.sugWhatIsFare")
			].filter(Boolean)
		};
	}

	/**
	 * Handle pending slot fulfillment when user responds to a clarification prompt
	 */
	async #handlePendingClarification(normData, pending, lang) {
		const resolved = StationEntityResolver.resolve(normData, lang);
		const candidate = resolved.source || resolved.destination || resolved.station;

		if (pending.type === "NEED_STATION_FOR_INFO") {
			this.#context.clearPendingClarification();
			if (candidate) {
				return this.#handleStationInfo({ station: candidate }, lang);
			}
		}

		if (pending.type === "NEED_STATION_FOR_LINE") {
			this.#context.clearPendingClarification();
			if (candidate) {
				return this.#handleLineInfo({ station: candidate }, lang);
			}
		}

		if (pending.type === "NEED_ROUTE_STATIONS") {
			this.#context.clearPendingClarification();
			if (resolved.source && resolved.destination) {
				return this.#handleRouteSearch(resolved, lang);
			} else if (candidate) {
				return this.#handleRouteSearch({ destination: candidate }, lang);
			}
		}

		if (pending.type === "NEED_FARE_STATIONS") {
			this.#context.clearPendingClarification();
			if (resolved.source && resolved.destination) {
				return this.#handleFareEnquiry(resolved, lang);
			} else if (candidate) {
				return this.#handleFareEnquiry({ destination: candidate }, lang);
			}
		}

		if (pending.type === "AMBIGUOUS_DESTINATION" && pending.source) {
			this.#context.clearPendingClarification();
			if (candidate) {
				return this.#handleRouteSearch({ source: pending.source, destination: candidate }, lang);
			}
		}

		if (pending.type === "AMBIGUOUS_SOURCE" && pending.destination) {
			this.#context.clearPendingClarification();
			if (candidate) {
				return this.#handleRouteSearch({ source: candidate, destination: pending.destination }, lang);
			}
		}

		if (pending.type === "MISSING_SOURCE" && pending.destination) {
			this.#context.clearPendingClarification();
			if (candidate) {
				return this.#handleRouteSearch({ source: candidate, destination: pending.destination }, lang);
			}
		}

		if (pending.type === "MISSING_DESTINATION" && pending.source) {
			this.#context.clearPendingClarification();
			if (candidate) {
				return this.#handleRouteSearch({ source: pending.source, destination: candidate }, lang);
			}
		}

		if (pending.type === "AMBIGUOUS_STATION") {
			this.#context.clearPendingClarification();
			if (candidate) {
				return this.#handleStationInfo({ station: candidate }, lang);
			}
		}

		return null;
	}

	/**
	 * Handle interactive button clicks (e.g. "🔄 Return Route", "🗺️ View on Map")
	 */
	async #handleActionPayload(actionPayload, lang) {
		const { action, payload } = actionPayload;

		if (action === "return_route") {
			return this.#handleReturnRoute(lang);
		}

		if (action === "select_destination" && payload?.sourceId && payload?.destinationId) {
			const source = centerClass.getStationDetails(payload.sourceId);
			const destination = centerClass.getStationDetails(payload.destinationId);
			if (source && destination) {
				this.#context.clearPendingClarification();
				return this.#handleRouteSearch({ source, destination }, lang);
			}
		}

		if (action === "select_source" && payload?.sourceId && payload?.destinationId) {
			const source = centerClass.getStationDetails(payload.sourceId);
			const destination = centerClass.getStationDetails(payload.destinationId);
			if (source && destination) {
				this.#context.clearPendingClarification();
				return this.#handleRouteSearch({ source, destination }, lang);
			}
		}

		if (action === "select_source_for_chain" && payload?.stationId) {
			const pending = this.#context.pendingClarification;
			const source = centerClass.getStationDetails(payload.stationId);
			if (source && pending?.dstCandidates) {
				this.#context.setPendingClarification({
					type: "AMBIGUOUS_DESTINATION",
					source: source,
					candidates: pending.dstCandidates
				});
				const srcName = centerClass.getStationName(source.id, lang);
				const dstQ = pending.rawDst || i18n.t("ai.destination");
				const text = i18n.t("ai.selectDestStationPrompt", { src: srcName, dst: dstQ });
				return {
					text,
					actions: pending.dstCandidates.map(st => ({
						label: centerClass.getStationName(st.id, lang),
						action: "select_destination",
						payload: { sourceId: source.id, destinationId: st.id }
					})),
					suggestions: []
				};
			}
		}

		if (action === "set_station" && payload?.stationId) {
			const st = centerClass.getStationDetails(payload.stationId);
			if (st) {
				return this.#handleStationInfo({ station: st }, lang);
			}
		}

		return null;
	}
}

// Singleton export
export const dishaAiEngine = new DishaAiEngine();
