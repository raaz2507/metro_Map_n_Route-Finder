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
	 * 🔄 Public Rebuild Index Method (Called on Language Switch)
	 */
	rebuildIndex() {
		this.#buildIndex();
	}

	/**
	 * 🏗️ इन-मेमोरी इनवर्टेड इंडेक्स का निर्माण ($O(1) लुकअप के लिए - v4.0 Decoupled Standard)
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
			if (!st?.id) continue;
			const stId = st.id.toLowerCase();

			// 🌐 Always resolve display name & aliases via centerClass facade
			const primaryName = (typeof centerClass?.getStationName === "function" 
				? centerClass.getStationName(stId) 
				: st.name?.en || st.name?.hi || stId) || stId;

			const aliases = typeof centerClass?.getStationAliases === "function"
				? centerClass.getStationAliases(stId)
				: (st.aliases || []);

			const nameLower = primaryName.toLowerCase().trim();
			const words = nameLower.split(/[\s-]+/).filter(Boolean);
			const acronym = this.generateAcronym(primaryName);

			metadataList.push({ station: st, nameLower, stId, words, acronym, aliases });

			// 1. Primary Name Mapping
			if (nameLower) {
				if (!exactMap.has(nameLower)) exactMap.set(nameLower, []);
				exactMap.get(nameLower).push(st);
			}

			// 2. ID Mapping
			if (!exactMap.has(stId)) exactMap.set(stId, []);
			exactMap.get(stId).push(st);

			// 3. Aliases Mapping (e.g. "CP", "HUDA City Centre")
			for (const alias of aliases) {
				const aliasLower = alias.toLowerCase().trim();
				if (aliasLower) {
					if (!exactMap.has(aliasLower)) exactMap.set(aliasLower, []);
					exactMap.get(aliasLower).push(st);
				}
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
				const hasAliasMatch = Array.isArray(meta.aliases) && meta.aliases.some(a => a.toLowerCase().includes(q));
				if (meta.nameLower?.includes(q) || meta.stId?.includes(q) || hasAliasMatch) {
					addResult(meta.station, 50);
				}
			}
		}
		// Tier 5: Levenshtein Typo Fallback (40)
		if (scoredMap.size === 0 && q.length >= 2) {
			for (const meta of metadataList) {
				if (this.hasTypoMatch(q, meta.nameLower || "", meta.words || [])) {
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
		const rawName = (typeof centerClass?.getStationName === "function" ? centerClass.getStationName(st.id) : null) || st.id;
		const displayName = this.escapeHTML(rawName);
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