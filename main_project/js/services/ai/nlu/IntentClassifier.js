/**
 * 🎯 IntentClassifier - Multi-Signal Weighted Rule-Based Intent Classifier
 * Evaluates triggers dynamically across language-specific NLU packs (lang/<lang>/disha_nlu.js).
 * 100% Language-Agnostic: Zero Hardcoded Regex or Multilingual Keywords in Engine.
 */

import i18n from "../../../core/i18n.js";

export class IntentClassifier {
	static INTENTS = {
		ROUTE_SEARCH: "ROUTE_SEARCH",
		FARE_ENQUIRY: "FARE_ENQUIRY",
		TIME_DISTANCE: "TIME_DISTANCE",
		STATION_INFO: "STATION_INFO",
		LINE_INFO: "LINE_INFO",
		NEARBY_STATION: "NEARBY_STATION",
		RETURN_ROUTE: "RETURN_ROUTE",
		GREETING: "GREETING",
		HELP: "HELP",
		UNKNOWN: "UNKNOWN"
	};

	/**
	 * Classify intent using dynamic language NLU patterns and entity signals
	 * @param {Object} normData - from TextNormalizer
	 * @param {Object} entities - from StationEntityResolver
	 * @param {Object} context - from ConversationContext
	 * @param {string} [lang="en"] - Active language code
	 * @returns {Object} { intent, confidence, matchedRule }
	 */
	static classify(normData, entities = {}, context = null, lang = "en") {
		const text = normData.lowerText;
		const rawText = normData.rawText;
		const hasSource = Boolean(entities.source);
		const hasDest = Boolean(entities.destination);
		const hasStation = Boolean(entities.station || entities.source || entities.destination);
		const hasLastRoute = Boolean(context?.lastRouteResult);

		const scores = {
			[this.INTENTS.ROUTE_SEARCH]: 0,
			[this.INTENTS.FARE_ENQUIRY]: 0,
			[this.INTENTS.TIME_DISTANCE]: 0,
			[this.INTENTS.STATION_INFO]: 0,
			[this.INTENTS.LINE_INFO]: 0,
			[this.INTENTS.NEARBY_STATION]: 0,
			[this.INTENTS.RETURN_ROUTE]: 0,
			[this.INTENTS.GREETING]: 0,
			[this.INTENTS.HELP]: 0
		};

		// 1. Fetch language NLU grammar patterns from active language pack
		const nluConfig = i18n.getNluConfig(lang) || i18n.getNluConfig("en") || {};
		const patterns = nluConfig.intentPatterns || {};

		// Helper to test regex pattern against normalized text or raw text
		const matches = (pattern) => {
			if (!pattern) return false;
			if (pattern instanceof RegExp) {
				return pattern.test(text) || pattern.test(rawText);
			}
			return false;
		};

		// 1. RETURN ROUTE
		if (matches(patterns.RETURN_ROUTE)) {
			scores[this.INTENTS.RETURN_ROUTE] += 85;
			if (hasLastRoute) {
				scores[this.INTENTS.RETURN_ROUTE] += 15;
			}
		}

		// 2. FARE ENQUIRY
		if (matches(patterns.FARE_ENQUIRY)) {
			scores[this.INTENTS.FARE_ENQUIRY] += 80;
			if (hasLastRoute || (hasSource && hasDest)) {
				scores[this.INTENTS.FARE_ENQUIRY] += 20;
			}
		}

		// 3. TIME AND DISTANCE
		if (matches(patterns.TIME_DISTANCE)) {
			scores[this.INTENTS.TIME_DISTANCE] += 80;
			if (hasLastRoute || (hasSource && hasDest)) {
				scores[this.INTENTS.TIME_DISTANCE] += 20;
			}
		}

		// 4. LINE AND INTERCHANGE
		if (matches(patterns.LINE_INFO)) {
			scores[this.INTENTS.LINE_INFO] += 75;
		}

		// 5. STATION INFO
		if (matches(patterns.STATION_INFO)) {
			scores[this.INTENTS.STATION_INFO] += 80;
		}

		// 6. NEARBY STATIONS
		if (matches(patterns.NEARBY_STATION)) {
			scores[this.INTENTS.NEARBY_STATION] += 85;
		}

		// 7. GREETINGS
		if (matches(patterns.GREETING)) {
			if (normData.tokens.length <= 3) {
				scores[this.INTENTS.GREETING] += 95;
			}
		}

		// 8. HELP & CAPABILITIES
		if (matches(patterns.HELP)) {
			scores[this.INTENTS.HELP] += 85;
		}

		// 9. ROUTE SEARCH
		if (matches(patterns.ROUTE_SEARCH)) {
			scores[this.INTENTS.ROUTE_SEARCH] += 75;
		}

		// 10. Entity-driven signal boosting
		if (hasSource && hasDest) {
			if (scores[this.INTENTS.FARE_ENQUIRY] === 0 && scores[this.INTENTS.TIME_DISTANCE] === 0 && scores[this.INTENTS.RETURN_ROUTE] === 0) {
				scores[this.INTENTS.ROUTE_SEARCH] += 80;
			}
		} else if (hasDest && !hasSource) {
			if (scores[this.INTENTS.FARE_ENQUIRY] === 0 && scores[this.INTENTS.TIME_DISTANCE] === 0 && scores[this.INTENTS.STATION_INFO] === 0 && scores[this.INTENTS.LINE_INFO] === 0) {
				scores[this.INTENTS.ROUTE_SEARCH] += 50;
			}
		} else if (hasStation && !hasSource && !hasDest) {
			if (normData.tokens.length <= 4 && scores[this.INTENTS.ROUTE_SEARCH] < 80) {
				scores[this.INTENTS.STATION_INFO] += 50;
			}
		}

		// Pick highest scored intent
		let bestIntent = this.INTENTS.UNKNOWN;
		let maxScore = 0;

		for (const [intent, score] of Object.entries(scores)) {
			if (score > maxScore) {
				maxScore = score;
				bestIntent = intent;
			}
		}

		if (maxScore < 30) {
			if (hasSource || hasDest) {
				bestIntent = this.INTENTS.ROUTE_SEARCH;
				maxScore = 40;
			} else if (hasStation) {
				bestIntent = this.INTENTS.STATION_INFO;
				maxScore = 35;
			} else {
				bestIntent = this.INTENTS.UNKNOWN;
				maxScore = 10;
			}
		}

		const confidence = Math.min(1.0, maxScore / 100);

		return {
			intent: bestIntent,
			confidence,
			scores
		};
	}
}
