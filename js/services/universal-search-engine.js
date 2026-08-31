/**
 * Universal Search Engine & Plug-and-Play UI Binder
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Powers O(1) Inverted Index fuzzy search and plug-and-play autocomplete binding.
 */
export class UniversalSearchEngine {
    // Private State Fields
    #tokens = {};
    #cities = {};
    #items = {};
    #scope = "global"; // "global" | "city"
    #activeCity = "delhi_ncr";
    #isReady = false;
    #maxResults = 8;
    #abortController = null;

    // Active UI Bindings
    #boundUI = null;
    #focusedIndex = -1;

    /**
     * @param {Object} options Configuration options
     * @param {string} options.scope 'global' (Networks tab) or 'city' (Map/Stations)
     * @param {string} options.activeCity Active city key (when scope is 'city')
     * @param {number} options.maxResults Maximum results to return
     */
    constructor(options = {}) {
        this.#scope = options.scope || "global";
        this.#activeCity = options.activeCity || "delhi_ncr";
        this.#maxResults = options.maxResults || 8;
    }

    /**
     * Loads the pre-computed Inverted Index JSON from search_cache
     */
    async init() {
        if (this.#isReady && Object.keys(this.#items).length > 0) return;

        if (this.#abortController) {
            this.#abortController.abort();
        }
        this.#abortController = new AbortController();

        try {
            const response = await fetch("data/search_cache/transit_search_index.json", {
                signal: this.#abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: Failed to load search cache`);
            }

            const data = await response.json();
            this.#tokens = data.tokens || {};
            this.#cities = data.cities || {};
            this.#items = data.items || {};
            this.#isReady = true;

            console.log(`[UniversalSearchEngine] Loaded O(1) Index: ${Object.keys(this.#items).length} items, ${Object.keys(this.#tokens).length} tokens.`);
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("[UniversalSearchEngine] Failed to load search index:", error);
        }
    }

    /**
     * Updates active search scope dynamically
     */
    setScope(scope = "global", activeCity = "delhi_ncr") {
        this.#scope = scope;
        this.#activeCity = activeCity;
    }

    /**
     * Executes instant O(1) token intersection & relevance-scored search
     * @param {string} rawQuery User search input
     * @returns {Array<Object>} Ranked search results
     */
    search(rawQuery) {
        if (!rawQuery || typeof rawQuery !== "string" || !this.#isReady) return [];

        const query = rawQuery.trim().toLowerCase();
        if (query.length === 0) return [];

        const searchWords = query.match(/[\w\u0900-\u097F]+/g) || [];
        if (searchWords.length === 0) return [];

        // 1. Get Candidate Item IDs for each search word using O(1) Token Lookup & Prefix Expansion
        const wordCandidateSets = [];

        for (const word of searchWords) {
            const matchingIds = new Set();

            // Direct O(1) Exact Token Match
            if (this.#tokens[word]) {
                for (const id of this.#tokens[word]) {
                    matchingIds.add(id);
                }
            }

            // Fast Prefix Lookup (for incomplete typing like "aii" -> "aiims")
            if (word.length >= 2) {
                for (const tokenKey in this.#tokens) {
                    if (tokenKey.startsWith(word) && tokenKey !== word) {
                        for (const id of this.#tokens[tokenKey]) {
                            matchingIds.add(id);
                        }
                    }
                }
            }

            if (matchingIds.size === 0) {
                // If any word has 0 matches, intersection will be empty
                return [];
            }

            wordCandidateSets.push(matchingIds);
        }

        // 2. Set Intersection across all search words (AND Logic)
        let candidateIds = [...wordCandidateSets[0]];
        for (let i = 1; i < wordCandidateSets.length; i++) {
            const nextSet = wordCandidateSets[i];
            candidateIds = candidateIds.filter(id => nextSet.has(id));
            if (candidateIds.length === 0) break;
        }

        // 3. City Scoping Filter
        if (this.#scope === "city" && this.#cities[this.#activeCity]) {
            const citySet = new Set(this.#cities[this.#activeCity]);
            candidateIds = candidateIds.filter(id => citySet.has(id));
        }

        // 4. Score and Rank Results
        const results = [];
        for (const id of candidateIds) {
            const item = this.#items[String(id)];
            if (!item) continue;

            let score = 0;
            const itemNameLower = (item.name || "").toLowerCase();

            // Relevance scoring
            if (itemNameLower === query) {
                score += 100;
            } else if (itemNameLower.startsWith(query)) {
                score += 75;
            } else if (itemNameLower.includes(query)) {
                score += 50;
            } else {
                score += 25;
            }

            // Category priority weights
            if (item.type === "Station") score += 15;
            if (item.type === "Hospital" || item.type === "Tourist Place") score += 12;
            if (item.type === "Network") score += 8;

            results.push({ item, score });
        }

        results.sort((a, b) => b.score - a.score);
        return results.slice(0, this.#maxResults).map(res => res.item);
    }

    /**
     * 🔌 PLUG-AND-PLAY UI BINDER:
     * Connects any Input Element and Dropdown Container to this Search Engine automatically!
     */
    bindUI({ inputEl, dropdownEl, onSelect, onInput }) {
        if (!inputEl || !dropdownEl) return;

        this.#boundUI = { inputEl, dropdownEl, onSelect, onInput, currentResults: [] };
        this.#focusedIndex = -1;

        // 1. Live Input Event
        inputEl.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            if (onInput) onInput(query);

            if (query.length < 2 || !this.#isReady) {
                this.hideDropdown();
                return;
            }

            const results = this.search(query);
            this.#boundUI.currentResults = results;
            this.#renderDropdown(results);
        });

        // 2. Keyboard Navigation (ArrowUp, ArrowDown, Enter, Escape)
        inputEl.addEventListener("keydown", (e) => {
            if (dropdownEl.hidden || this.#boundUI.currentResults.length === 0) return;

            const items = dropdownEl.querySelectorAll(".autocomplete-item");

            if (e.key === "ArrowDown") {
                e.preventDefault();
                this.#focusedIndex = (this.#focusedIndex + 1) % items.length;
                this.#updateFocusedItem(items);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                this.#focusedIndex = (this.#focusedIndex - 1 + items.length) % items.length;
                this.#updateFocusedItem(items);
            } else if (e.key === "Enter") {
                if (this.#focusedIndex >= 0 && this.#boundUI.currentResults[this.#focusedIndex]) {
                    e.preventDefault();
                    this.#selectItem(this.#boundUI.currentResults[this.#focusedIndex]);
                }
            } else if (e.key === "Escape") {
                this.hideDropdown();
            }
        });

        // 3. Document Click to Close Dropdown
        document.addEventListener("click", (e) => {
            if (!inputEl.contains(e.target) && !dropdownEl.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }

    /**
     * Renders dropdown suggestions HTML
     */
    #renderDropdown(results) {
        if (!this.#boundUI || !this.#boundUI.dropdownEl) return;
        const dropdownEl = this.#boundUI.dropdownEl;

        if (results.length === 0) {
            this.hideDropdown();
            return;
        }

        this.#focusedIndex = -1;
        const html = results.map((item, idx) => {
            const icon = item.icon || "📍";
            const title = this.#escapeHTML(item.name);
            const subtitle = this.#escapeHTML(item.subtitle || item.cityName || "");
            const cityTag = this.#escapeHTML(item.cityName || item.cityKey);

            return `
                <div class="autocomplete-item" data-index="${idx}" tabindex="-1" role="option">
                    <div class="result-main-group">
                        <span class="result-icon">${icon}</span>
                        <div class="result-text-group">
                            <span class="result-title">${title}</span>
                            <span class="result-subtitle">${subtitle}</span>
                        </div>
                    </div>
                    <span class="result-meta-badge">${cityTag}</span>
                </div>
            `;
        }).join("");

        dropdownEl.innerHTML = html;
        dropdownEl.hidden = false;

        dropdownEl.querySelectorAll(".autocomplete-item").forEach(itemEl => {
            itemEl.addEventListener("click", () => {
                const idx = parseInt(itemEl.dataset.index, 10);
                if (results[idx]) {
                    this.#selectItem(results[idx]);
                }
            });
        });
    }

    #updateFocusedItem(items) {
        items.forEach((el, idx) => {
            el.classList.toggle("focused", idx === this.#focusedIndex);
            if (idx === this.#focusedIndex) {
                el.scrollIntoView({ block: "nearest" });
            }
        });
    }

    #selectItem(item) {
        this.hideDropdown();
        if (this.#boundUI && this.#boundUI.onSelect) {
            this.#boundUI.onSelect(item);
        }
    }

    hideDropdown() {
        if (this.#boundUI && this.#boundUI.dropdownEl) {
            this.#boundUI.dropdownEl.hidden = true;
            this.#boundUI.dropdownEl.innerHTML = "";
            this.#focusedIndex = -1;
        }
    }

    #escapeHTML(str) {
        if (!str || typeof str !== "string") return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    get isReady() {
        return this.#isReady;
    }

    get totalIndexed() {
        return Object.keys(this.#items).length;
    }
}