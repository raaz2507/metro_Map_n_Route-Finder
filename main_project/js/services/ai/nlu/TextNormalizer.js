/**
 * 🔤 TextNormalizer - Multi-Script Preprocessing Engine
 * Language-agnostic, offline-first.
 */

import { centerClass } from "../../../core/CenterClass.js";

export class TextNormalizer {
	/**
	 * Normalize and tokenize user input
	 * @param {string} rawInput 
	 * @returns {Object} normalized query data
	 */
	static normalize(rawInput) {
		const rawText = (rawInput || "").toString();
		
		// 1. Unicode NFKC normalization
		const unicodeNormalized = rawText.normalize("NFKC").trim();

		// 2. Detect script
		const hasDevanagari = /[\u0900-\u097F]/.test(unicodeNormalized);
		const hasLatin = /[a-zA-Z]/.test(unicodeNormalized);
		const script = hasDevanagari && hasLatin ? "mixed" : (hasDevanagari ? "devanagari" : (hasLatin ? "latin" : "other"));

		// 3. Clean punctuation while preserving internal hyphens (e.g., sector-18, sec-62)
		// Strip leading/trailing punctuation and sentence terminators (?, !, ।, ., ,, etc.)
		const cleanedText = unicodeNormalized
			.replace(/[?!।.,;:()\[\]{}"'\\\/~`@#$%^&*+=_<>|]+/g, " ")
			.replace(/\s+/g, " ")
			.trim();

		const lowerText = cleanedText.toLowerCase();

		// 4. Tokenization (word boundaries)
		const tokens = lowerText.length > 0 ? lowerText.split(/\s+/).filter(Boolean) : [];

		return {
			rawText,
			unicodeNormalized,
			cleanedText,
			lowerText,
			tokens,
			script,
			hasDevanagari,
			hasLatin,
			isMixed: script === "mixed"
		};
	}

	/**
	 * Strip common transit conversational filler words dynamically via active language NLU pack
	 * @param {string} text 
	 * @param {string} [lang="en"]
	 * @returns {string}
	 */
	static stripTransitFillers(text, lang = "en") {
		if (!text) return "";
		const nluConfig = centerClass.getNluConfig(lang) || centerClass.getNluConfig("en") || {};
		const patterns = nluConfig.fillerPatterns || [];

		let cleaned = text;
		for (const pattern of patterns) {
			if (pattern instanceof RegExp) {
				cleaned = cleaned.replace(pattern, " ");
			}
		}
		return cleaned.replace(/\s+/g, " ").trim();
	}
}
