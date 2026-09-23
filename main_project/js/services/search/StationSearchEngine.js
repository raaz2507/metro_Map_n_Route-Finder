/**
 * 🚇 StationSearchEngine - Route Finder Station Specialist
 * Extends BaseSearchEngine for 5-Tier Acronyms, Typo-Tolerance, and Line Dots UI.
 */
import { BaseSearchEngine } from "./BaseSearchEngine.js";
import { appStateStore } from "../../core/app-state-store.js";
import { centerClass } from "../../core/CenterClass.js";

export class StationSearchEngine extends BaseSearchEngine {
	// Private State Fields
	#metroData = null;
	#maxResults = 8;
	#index = null;

	constructor(metroData = null, options = {}) {
		super();
		this.#metroData = metroData;
		this.#maxResults = options.maxResults || 8;
		if (this.#metroData) {
			this.#buildIndex();
		}
	}

	setMetroData(metroData) {
		this.#metroData = metroData;
		this.#buildIndex();
	}

	#getMetroData() {
		return this.#metroData || centerClass.getMetroData();
	}


	/**
	 * 🏗️ इन-मेमोरी इनवर्टेड इंडेक्स का निर्माण ($O(1) लुकअप के लिए)
	 */
	#buildIndex() {
		const metroData = this.#getMetroData();
		if (!metroData?.stationData) {
			this.#index = null;
			return;
		}
		const exactMap = new Map();
		const acronymMap = new Map();
		const tokenMap = new Map();
		const metadataList = [];
		const stations = Object.values(metroData.stationData);
		for (const st of stations) {
			if (!st) continue;
			const enName = (typeof st.name === "object" ? st.name?.en : st.name) || st.id || "";
			const hiName = (typeof st.name === "object" ? st.name?.hi : "") || "";
			const stId = (st.id || "").toLowerCase();
			const enLower = enName.toLowerCase().trim();
			const hiLower = hiName.toLowerCase().trim();
			const words = enLower.split(/[\s-]+/).filter(Boolean);
			const acronym = this.generateAcronym(enName);
			metadataList.push({ station: st, enLower, hiLower, stId, words, acronym });
			// Exact Name & ID Map
			if (enLower) {
				if (!exactMap.has(enLower)) exactMap.set(enLower, []);
				exactMap.get(enLower).push(st);
			}
			if (hiLower) {
				if (!exactMap.has(hiLower)) exactMap.set(hiLower, []);
				exactMap.get(hiLower).push(st);
			}
			if (stId) {
				if (!exactMap.has(stId)) exactMap.set(stId, []);
				exactMap.get(stId).push(st);
			}
			// Acronym Map
			if (acronym) {
				if (!acronymMap.has(acronym)) acronymMap.set(acronym, new Set());
				acronymMap.get(acronym).add(st);
			}
			// Word Tokens Inverted Index
			for (const word of words) {
				if (!tokenMap.has(word)) tokenMap.set(word, new Set());
				tokenMap.get(word).add(st);
			}
		}
		this.#index = { exactMap, acronymMap, tokenMap, metadataList };
	}

	/**
	 * ⚡ 5-Tier Fast Index-Based Search
	 */
	search(query, lang = null) {
		if (!query || typeof query !== "string") return [];
		if (!this.#index) {
			this.#buildIndex();
		}
		if (!this.#index) return [];
		const q = query.trim().toLowerCase();
		if (q.length === 0) return [];
		const scoredMap = new Map();
		const addResult = (st, score) => {
			if (!st) return;
			const existing = scoredMap.get(st.id);
			if (!existing || existing.score < score) {
				scoredMap.set(st.id, { station: st, score });
			}
		};
		const { exactMap, acronymMap, tokenMap, metadataList } = this.#index;
		// Tier 1: Exact Match (100)
		if (exactMap.has(q)) {
			exactMap.get(q).forEach((st) => addResult(st, 100));
		}
		// Tier 2: Token / Prefix Match (85)
		if (tokenMap.has(q)) {
			tokenMap.get(q).forEach((st) => addResult(st, 85));
		}
		for (const [token, stationSet] of tokenMap.entries()) {
			if (token.startsWith(q)) {
				stationSet.forEach((st) => addResult(st, 85));
			}
		}
		// Tier 3: Acronym Match (75)
		if (acronymMap.has(q)) {
			acronymMap.get(q).forEach((st) => addResult(st, 75));
		} else if (q.length >= 2) {
			for (const [acronym, stationSet] of acronymMap.entries()) {
				if (acronym.startsWith(q)) {
					stationSet.forEach((st) => addResult(st, 75));
				}
			}
		}
		// Tier 4: Substring Match (50)
		if (scoredMap.size < this.#maxResults) {
			for (const meta of metadataList) {
				if (meta.enLower.includes(q) || meta.hiLower.includes(q) || meta.stId.includes(q)) {
					addResult(meta.station, 50);
				}
			}
		}
		// Tier 5: Levenshtein Typo Fallback (40)
		if (scoredMap.size === 0 && q.length >= 2) {
			for (const meta of metadataList) {
				if (this.hasTypoMatch(q, meta.enLower, meta.words)) {
					addResult(meta.station, 40);
				}
			}
		}
		return Array.from(scoredMap.values())
			.sort((a, b) => b.score - a.score)
			.slice(0, this.#maxResults)
			.map((item) => item.station);
	}

	/**
	 * 🎨 रूट फाइंडर ड्रॉपडाउन आइटम (लाइन कलर डॉट्स + इंटरचेंज बैज)
	 */
	renderDropdownItem(st, idx) {
		const currentLang = appStateStore.getState("currentLang") || "en";
		const rawName = typeof st.name === "object" ? (st.name?.[currentLang] || st.name?.en) : st.name;
		const displayName = this.escapeHTML(rawName || st.id);
		const metroData = this.#getMetroData();
		const lines = metroData?.lines || {};

		const lineDots = (st.lines || []).map((lineId) => {
			const lineInfo = lines[lineId];
			const color = lineInfo?.color || "#007bff";
			const lineTitle = this.escapeHTML(lineInfo?.shortName?.[currentLang] || lineInfo?.name?.en || lineId);
			return `<span class="st-line-dot" style="background-color:${color};" title="${lineTitle}"></span>`;
		}).join("");

		const isInterchange = (st.lines || []).length > 1;

		return `
			<div class="station-autocomplete-item" data-index="${idx}" tabindex="-1" role="option">
				<div class="st-item-name-group">
					<span class="st-item-main-name">🚇 ${displayName}</span>
				</div>
				<div class="st-item-lines-group">
					${lineDots}
					${isInterchange ? `<span class="st-interchange-badge">🔄</span>` : ""}
				</div>
			</div>
		`;
	}
}