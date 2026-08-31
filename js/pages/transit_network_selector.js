/**
 * Transit Network & City Selector Page Controller
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically renders India's transit systems and connects to UniversalSearchEngine via plug-and-play bindUI.
 */
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { UniversalSearchEngine } from "../services/universal-search-engine.js";
import i18n from "../core/i18n.js";

export class TransitNetworkSelector {
    // Private State Fields
    #registryData = null;
    #searchEngine = null;
    #activeModeFilter = "all";
    #activeStatusFilter = "all";
    #activeSort = "status_smart";
    #searchQuery = "";
    #abortController = null;

    // Private DOM Element Handles
    #dom = {
        container: null,
        searchInput: null,
        clearSearchBtn: null,
        dropdown: null,
        modeChipsWrapper: null,
        statusChipsWrapper: null,
        sortChipsWrapper: null,
        statsCounterText: null
    };

    constructor() {
        this.#activeSort = localStorage.getItem("transit_sort_preference") || "status_smart";
        this.#searchEngine = new UniversalSearchEngine({ scope: "global" });
        this.#cacheDOM();
        this.#bindEvents();
    }

    /**
     * Initializes Universal Header, Footer, Registry, and Search Index
     */
    async init() {
        await HeaderComponent.render("networks");
        FooterComponent.render();

        // Sync initial active sort chip UI
        if (this.#dom.sortChipsWrapper) {
            this.#dom.sortChipsWrapper.querySelectorAll(".chip-btn").forEach(btn => {
                const isActive = btn.dataset.sort === this.#activeSort;
                btn.classList.toggle("active", isActive);
                btn.setAttribute("aria-checked", isActive ? "true" : "false");
            });
        }

        // Initialize Global Search Engine in parallel
        this.#searchEngine.init().catch(err => console.warn("[SearchEngine] Init notice:", err));

        await this.#fetchRegistry();
    }

    /**
     * Cache DOM references defensively
     */
    #cacheDOM() {
        this.#dom.container = document.getElementById("transit-selector-container");
        this.#dom.searchInput = document.getElementById("network-search-input");
        this.#dom.clearSearchBtn = document.getElementById("clear-search-btn");
        this.#dom.dropdown = document.getElementById("search-autocomplete-dropdown");
        this.#dom.modeChipsWrapper = document.getElementById("mode-chips-wrapper");
        this.#dom.statusChipsWrapper = document.getElementById("status-chips-wrapper");
        this.#dom.sortChipsWrapper = document.getElementById("sort-chips-wrapper");
        this.#dom.statsCounterText = document.getElementById("stats-counter-text");
    }

    /**
     * Bind all interactive events
     */
    #bindEvents() {
        // 🔌 PLUG-AND-PLAY SEARCH ENGINE BINDING
        if (this.#dom.searchInput && this.#dom.dropdown) {
            this.#searchEngine.bindUI({
                inputEl: this.#dom.searchInput,
                dropdownEl: this.#dom.dropdown,
                onInput: (query) => {
                    this.#searchQuery = (query || "").trim().toLowerCase();
                    if (this.#dom.clearSearchBtn) {
                        this.#dom.clearSearchBtn.hidden = this.#searchQuery.length === 0;
                    }
                    this.#render();
                },
                onSelect: (selectedItem) => {
                    this.#handleSuggestionClick(selectedItem);
                }
            });
        }

        // Clear Search Button
        if (this.#dom.clearSearchBtn) {
            this.#dom.clearSearchBtn.addEventListener("click", () => {
                if (this.#dom.searchInput) {
                    this.#dom.searchInput.value = "";
                    this.#dom.searchInput.focus();
                }
                this.#searchQuery = "";
                this.#dom.clearSearchBtn.hidden = true;
                this.#searchEngine.hideDropdown();
                this.#render();
            });
        }

        // 1. Mode Filter Chips
        if (this.#dom.modeChipsWrapper) {
            this.#dom.modeChipsWrapper.addEventListener("click", (e) => {
                const target = e.target.closest(".chip-btn");
                if (!target) return;

                const mode = target.dataset.mode || "all";
                this.#activeModeFilter = mode;

                this.#dom.modeChipsWrapper.querySelectorAll(".chip-btn").forEach(btn => {
                    const isActive = btn === target;
                    btn.classList.toggle("active", isActive);
                    btn.setAttribute("aria-checked", isActive ? "true" : "false");
                });

                this.#render();
            });
        }

        // 2. Status Filter Chips
        if (this.#dom.statusChipsWrapper) {
            this.#dom.statusChipsWrapper.addEventListener("click", (e) => {
                const target = e.target.closest(".chip-btn");
                if (!target) return;

                const status = target.dataset.status || "all";
                this.#activeStatusFilter = status;

                this.#dom.statusChipsWrapper.querySelectorAll(".chip-btn").forEach(btn => {
                    const isActive = btn === target;
                    btn.classList.toggle("active", isActive);
                    btn.setAttribute("aria-checked", isActive ? "true" : "false");
                });

                this.#render();
            });
        }

        // 3. Sort By Chips Click
        if (this.#dom.sortChipsWrapper) {
            this.#dom.sortChipsWrapper.addEventListener("click", (e) => {
                const target = e.target.closest(".chip-btn");
                if (!target) return;

                const sortValue = target.dataset.sort || "status_smart";
                this.#activeSort = sortValue;

                this.#dom.sortChipsWrapper.querySelectorAll(".chip-btn").forEach(btn => {
                    const isActive = btn === target;
                    btn.classList.toggle("active", isActive);
                    btn.setAttribute("aria-checked", isActive ? "true" : "false");
                });

                try {
                    localStorage.setItem("transit_sort_preference", this.#activeSort);
                } catch (err) {
                    // Ignore
                }

                this.#render();
            });
        }

        // Delegated Click Handler for Network Card Tiles
        if (this.#dom.container) {
            this.#dom.container.addEventListener("click", (e) => {
                if (e.target.closest(".official-website-link")) return;

                const card = e.target.closest(".network-card-compact");
                if (!card) return;

                const cityKey = card.dataset.city;
                const networkKey = card.dataset.network;
                const status = card.dataset.status;

                this.#handleNetworkSelect(cityKey, networkKey, status);
            });
        }
    }

    /**
     * Handles Smart Suggestion Click from Autocomplete Dropdown
     */
    #handleSuggestionClick(item) {
        if (!item || !item.cityKey) return;

        try {
            localStorage.setItem("active_city", item.cityKey);
            if (item.networkKey) localStorage.setItem("active_network", item.networkKey);
        } catch (e) {
            // Ignore
        }

        if (item.stationId) {
            window.location.href = `index.html?city=${encodeURIComponent(item.cityKey)}&to=${encodeURIComponent(item.stationId)}`;
        } else {
            window.location.href = `index.html?city=${encodeURIComponent(item.cityKey)}&network=${encodeURIComponent(item.networkKey || "")}`;
        }
    }

    /**
     * Async fetch of master india_transit_registry.json
     */
    async #fetchRegistry() {
        if (this.#abortController) {
            this.#abortController.abort();
        }
        this.#abortController = new AbortController();

        try {
            const response = await fetch("data/india_transit_registry.json", {
                signal: this.#abortController.signal
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
            }

            this.#registryData = await response.json();
            this.#render();
        } catch (error) {
            if (error.name === "AbortError") return;
            console.error("[TransitNetworkSelector] Failed to load registry:", error);
            this.#renderErrorState(error.message);
        }
    }

    /**
     * Pure filtering pipeline returning a flat array of matching networks
     */
    #getFilteredData() {
        if (!this.#registryData || !this.#registryData.cities) {
            return { totalNetworks: 0, matchedNetworks: [] };
        }

        const query = this.#searchQuery;
        const searchWords = query.length > 0 ? query.split(/\s+/).filter(Boolean) : [];
        const modeFilter = this.#activeModeFilter;
        const statusFilter = this.#activeStatusFilter;

        let totalNetworks = 0;
        const flatList = [];

        for (const [cityKey, cityData] of Object.entries(this.#registryData.cities)) {
            const cityName = cityData.name || cityKey;
            const stateName = cityData.state || "";
            const networks = cityData.networks || {};

            for (const [netKey, netData] of Object.entries(networks)) {
                totalNetworks++;

                const netMode = netData.mode || "Metro";
                const netStatus = netData.status || "operational";
                const netName = netData.name || netKey;
                const operator = netData.operator || "";

                // Mode Filter
                if (modeFilter !== "all" && netMode.toLowerCase() !== modeFilter.toLowerCase()) {
                    continue;
                }

                // Status Filter
                if (statusFilter !== "all" && netStatus.toLowerCase() !== statusFilter.toLowerCase()) {
                    continue;
                }

                // Search Query Filter
                if (searchWords.length > 0) {
                    const searchCorpus = `${cityName} ${stateName} ${netName} ${operator} ${netMode} ${netKey}`.toLowerCase();
                    const matchesAllWords = searchWords.every(word => searchCorpus.includes(word));
                    if (!matchesAllWords) {
                        continue;
                    }
                }

                flatList.push({
                    cityKey,
                    cityName,
                    stateName,
                    networkKey: netKey,
                    ...netData
                });
            }
        }

        // Apply Sorting
        flatList.sort((a, b) => this.#sortComparator(a, b));

        return { totalNetworks, matchedNetworks: flatList };
    }

    /**
     * Comparator for sorting
     */
    #sortComparator(a, b) {
        const sortType = this.#activeSort;

        switch (sortType) {
            case "city_asc":
                return a.cityName.localeCompare(b.cityName) || a.name.localeCompare(b.name);

            case "name_asc":
                return a.name.localeCompare(b.name);

            case "mode":
                return (a.mode || "").localeCompare(b.mode || "") || a.cityName.localeCompare(b.cityName);

            case "status_smart":
            default: {
                const statusOrder = {
                    "operational": 1,
                    "operational_partial": 2,
                    "under_construction": 3,
                    "approved": 4,
                    "proposed": 5
                };
                const orderA = statusOrder[a.status] || 99;
                const orderB = statusOrder[b.status] || 99;

                if (orderA !== orderB) return orderA - orderB;
                return a.cityName.localeCompare(b.cityName) || a.name.localeCompare(b.name);
            }
        }
    }

    /**
     * Primary Render Method
     */
    #render() {
        if (!this.#dom.container) return;

        const { totalNetworks, matchedNetworks } = this.#getFilteredData();

        // 1. Update Stats Bar Text
        if (this.#dom.statsCounterText) {
            const count = matchedNetworks.length;
            this.#dom.statsCounterText.textContent = i18n.t("pages.networks.showingCount", { count }) || `Showing ${count} transit networks`;
        }

        // 2. Render Empty State if no matches
        if (matchedNetworks.length === 0) {
            const noMatchMsg = i18n.t("pages.networks.noNetworksQuery", { query: this.#searchQuery }) || `No networks match "${this.#escapeHTML(this.#searchQuery)}".`;
            this.#dom.container.innerHTML = `
                <div class="empty-state">
                    <span style="font-size: 2rem;">🔍</span>
                    <h3>${this.#escapeHTML(i18n.t("pages.networks.noNetworksFound") || "No transit networks found")}</h3>
                    <p>${noMatchMsg}</p>
                </div>
            `;
            return;
        }

        // 3. Render Unified Compact Grid
        const cardsHtml = matchedNetworks.map(item => this.#renderCompactCard(item)).join("");
        this.#dom.container.innerHTML = `
            <div class="networks-compact-grid">
                ${cardsHtml}
            </div>
        `;
    }

    /**
     * Renders a Compact Network Card Tile
     */
    #renderCompactCard(item) {
        const cityKey = this.#escapeHTML(item.cityKey);
        const cityName = this.#escapeHTML(item.cityName);
        const netKey = this.#escapeHTML(item.networkKey);
        const netName = this.#escapeHTML(item.name || netKey);
        const operator = this.#escapeHTML(item.operator || "");
        const mode = item.mode || "Metro";
        const status = item.status || "operational";
        const website = item.website || null;

        const modeIcon = this.#getModeIcon(mode);
        const statusMeta = this.#getStatusMeta(status);

        return `
            <article 
                class="network-card-compact" 
                data-city="${cityKey}" 
                data-network="${netKey}" 
                data-status="${this.#escapeHTML(status)}"
                tabindex="0"
                role="button"
                aria-label="Open ${netName} map"
            >
                <div class="card-top-meta">
                    <span class="city-tag">📍 ${cityName}</span>
                    <span class="badge mode-badge">${modeIcon} ${this.#escapeHTML(mode)}</span>
                </div>

                <div class="card-main-info">
                    <h3 class="compact-network-name">${netName}</h3>
                    ${operator ? `<p class="compact-operator">${operator}</p>` : ""}
                </div>

                <div class="card-bottom-row">
                    <span class="badge status-badge ${statusMeta.cssClass}">${statusMeta.label}</span>
                    <div class="action-indicators">
                        ${website ? `
                            <a href="${this.#escapeHTML(website)}" target="_blank" rel="noopener noreferrer" class="official-website-link" title="Official Website" aria-label="Official Website">
                                🌐
                            </a>
                        ` : ""}
                        <span class="arrow-indicator">➔</span>
                    </div>
                </div>
            </article>
        `;
    }

    /**
     * Handles User Clicking a Network Card Tile
     */
    #handleNetworkSelect(cityKey, networkKey, status) {
        if (!cityKey) return;

        try {
            localStorage.setItem("active_city", cityKey);
            if (networkKey) {
                localStorage.setItem("active_network", networkKey);
            }
        } catch (e) {
            console.warn("[TransitNetworkSelector] LocalStorage write failed:", e);
        }

        const targetUrl = `index.html?city=${encodeURIComponent(cityKey)}&network=${encodeURIComponent(networkKey || "")}`;
        window.location.href = targetUrl;
    }

    /**
     * Status Label & Styling Metadata Helper
     */
    #getStatusMeta(status) {
        const lang = localStorage.getItem("language") || "en";
        const isHi = lang === "hi";

        switch (status) {
            case "operational":
                return { label: isHi ? "🟢 संचालित" : "🟢 Operational", cssClass: "status-operational" };
            case "operational_partial":
                return { label: isHi ? "🟡 आंशिक" : "🟡 Partial Service", cssClass: "status-operational_partial" };
            case "under_construction":
                return { label: isHi ? "🚧 निर्माणाधीन" : "🚧 Construction", cssClass: "status-under_construction" };
            case "approved":
                return { label: isHi ? "📋 स्वीकृत" : "📋 Approved", cssClass: "status-approved" };
            case "proposed":
                return { label: isHi ? "💡 प्रस्तावित" : "💡 Proposed", cssClass: "status-proposed" };
            default:
                return { label: status, cssClass: "status-approved" };
        }
    }

    #getModeIcon(mode) {
        switch (mode) {
            case "Metro": return "🚇";
            case "RRTS": return "🚆";
            case "Monorail": return "🚝";
            case "MetroLite": return "🚋";
            case "MetroNeo": return "⚡";
            default: return "🚊";
        }
    }

    #renderErrorState(message) {
        if (!this.#dom.container) return;
        this.#dom.container.innerHTML = `
            <div class="empty-state" style="border-color: #ef4444;">
                <span style="font-size: 2rem;">⚠️</span>
                <h3>Failed to load Transit Registry</h3>
                <p>${this.#escapeHTML(message)}</p>
            </div>
        `;
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
}

// Auto-instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    const selector = new TransitNetworkSelector();
    selector.init();
});