/**
 * 🌐 UniversalSearchEngine - Multi-City & Global Landmark Search Engine
 * Extends BaseSearchEngine for O(1) Token Inverted Index and Multi-Category Icons.
 */
import { BaseSearchEngine } from "./BaseSearchEngine.js";
import { appStateStore } from "../../core/app-state-store.js";

export class UniversalSearchEngine extends BaseSearchEngine {
    #tokens = {};
    #items = {};
    #scope = "global"; // "global" | "city"
    #activeCity = "delhi_ncr";
    #isReady = false;
    #maxResults = 8;
    #fetchAbort = null;

    constructor(options = {}) {
        super();
        this.#scope = options.scope || "global";
        this.#activeCity = options.activeCity || appStateStore.getState("activeCity") || "delhi_ncr";
        this.#maxResults = options.maxResults || 8;
    }

    async init() {
        if (this.#isReady && Object.keys(this.#items || {}).length > 0) return;

        if (this.#fetchAbort) this.#fetchAbort.abort();
        this.#fetchAbort = new AbortController();

        try {
            const response = await fetch("data/search_cache/transit_search_index.json", {
                signal: this.#fetchAbort.signal
            });

            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            const data = await response.json();
            this.#tokens = data.tokens || {};
            this.#items = data.items || {};
            this.#isReady = true;
            console.log(`[UniversalSearchEngine] Ready: ${Object.keys(this.#tokens).length} tokens & ${Object.keys(this.#items).length} items loaded.`);
        } catch (error) {
            if (error.name === "AbortError") return;
            console.warn("[UniversalSearchEngine] Failed to load index cache:", error);
        }
    }

    setScope(scope = "global", activeCity = "delhi_ncr") {
        this.#scope = scope;
        this.#activeCity = activeCity;
    }

    search(rawQuery) {
        if (!rawQuery || typeof rawQuery !== "string" || !this.#isReady) return [];

        const query = rawQuery.trim().toLowerCase();
        if (query.length === 0) return [];

        const searchWords = query.match(/[\w\u0900-\u097F]+/g) || [];
        if (searchWords.length === 0) return [];

        const wordCandidateSets = [];

        for (const word of searchWords) {
            const matchingIds = new Set();

            // 1. Exact Token Match
            if (this.#tokens[word]) {
                for (const id of this.#tokens[word]) matchingIds.add(id);
            }

            // 2. Prefix Match
            if (word.length >= 2) {
                for (const token in this.#tokens) {
                    if (token.startsWith(word)) {
                        for (const id of this.#tokens[token]) matchingIds.add(id);
                    }
                }
            }

            // 3. Smart Typo Token Match (Levenshtein)
            if (matchingIds.size === 0 && word.length >= 3) {
                for (const token in this.#tokens) {
                    if (this.hasTypoMatch(word, token, [])) {
                        for (const id of this.#tokens[token]) matchingIds.add(id);
                    }
                }
            }

            if (matchingIds.size === 0) return [];
            wordCandidateSets.push(matchingIds);
        }

        // Set Intersection (AND Logic)
        let candidateIds = [...wordCandidateSets[0]];
        for (let i = 1; i < wordCandidateSets.length; i++) {
            const nextSet = wordCandidateSets[i];
            candidateIds = candidateIds.filter((id) => nextSet.has(id));
            if (candidateIds.length === 0) break;
        }

        // 🎯 City Scoping Filter (item.cityKey आधारित असली फ़िल्टर)
        if (this.#scope === "city" && this.#activeCity) {
            const targetCity = this.#activeCity.toLowerCase();
            candidateIds = candidateIds.filter((id) => {
                const item = this.#items[id] || this.#items[String(id)];
                return item && (item.cityKey || "").toLowerCase() === targetCity;
            });
        }

        // Scoring & Ranking
        const results = [];
        for (const id of candidateIds) {
            const item = this.#items[id] || this.#items[String(id)];
            if (!item) continue;

            let score = 0;
            const itemNameLower = (item.name || "").toLowerCase();
            const words = itemNameLower.split(/[\s-]+/).filter(Boolean);
            const acronym = this.generateAcronym(itemNameLower);

            if (itemNameLower === query) score += 100;
            else if (itemNameLower.startsWith(query)) score += 85;
            else if (acronym === query) score += 75;
            else if (itemNameLower.includes(query)) score += 50;
            else if (this.hasTypoMatch(query, itemNameLower, words)) score += 40;
            else score += 25;

            // Category priority
            if (item.type === "Station") score += 15;
            if (item.type === "Hospital" || item.type === "Tourist Place") score += 12;
            if (item.type === "Network") score += 8;

            results.push({ item, score });
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, this.#maxResults).map((res) => res.item);
    }

    /**
     * 🎨 यूनिवर्सल ड्रॉपडाउन आइटम (श्रेणी आइकन + सिटी टैग)
     */
    renderDropdownItem(item, idx) {
        const icon = item.icon || "📍";
        const title = this.escapeHTML(item.name);
        const subtitle = this.escapeHTML(item.subtitle || item.cityName || "");

        return `
            <div class="autocomplete-item" data-index="${idx}" tabindex="-1" role="option">
                <div class="result-main-group">
                    <span class="result-icon">${icon}</span>
                    <div class="result-text-group">
                        <span class="result-title">${title}</span>
                        <span class="result-subtitle">${subtitle}</span>
                    </div>
                </div>
            </div>
        `;
    }
}