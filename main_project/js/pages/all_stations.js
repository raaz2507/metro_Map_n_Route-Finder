/**
 * All Stations Directory Page Controller - Template 2 (Coach Grid Layout)
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically loads city transit data via metroDataStore and powers City-Scoped Universal Search.
 */
import { metroDataStore } from "../core/metro-data-store.js";
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { UniversalSearchEngine } from "../services/search/UniversalSearchEngine.js";

import i18n from "../core/i18n.js";
import { appStateStore } from "../core/app-state-store.js";

export class AllStationsDirectory {
	// Private State Fields
	#metroData = null;
	#lines = {};
	#stations = {};
	#currentCity = "delhi_ncr";
	#activeFilter = "all";
	#searchQuery = "";
	#searchEngine = null;
	#abortController = null;

	// Private DOM Element Handles
	#dom = {
		container: null,
		filterWrapper: null,
		searchInput: null,
		clearSearchBtn: null,
		dropdown: null
	};

	// Private Localization & Dictionaries
	#lang = "en";
	#t = {};

	constructor() {
		this.#abortController = new AbortController();
		this.#cacheDOM();
		this.#initLocalization();
	}
	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		if (this.#searchEngine && typeof this.#searchEngine.destroy === "function") {
			this.#searchEngine.destroy();
		}
	}
	/**
	 * Initializes Universal Header, Footer, Data Store, and Search Engine
	 */
	async init() {
		HeaderComponent.render("stations");
		FooterComponent.render();

		if (this.#dom.searchInput) {
			this.#dom.searchInput.placeholder = this.#t.searchPlaceholder || "Search station by name or code...";
		}

		try {
			// 1. Dynamically load transit data for the active/selected city
			this.#metroData = await metroDataStore.loadCity();
			this.#lines = this.#metroData.lines || {};
			this.#stations = this.#metroData.stationData || {};

			// Resolve active city
			const urlParams = new URLSearchParams(window.location.search);
			this.#currentCity = urlParams.get("city") || localStorage.getItem("active_city") || "delhi_ncr";

			// 2. Initialize City-Scoped Universal Search Engine
			this.#searchEngine = new UniversalSearchEngine({
				scope: "city",
				activeCity: this.#currentCity
			});
			await this.#searchEngine.init().catch(err => console.warn("[SearchEngine] Init notice:", err));

			// 3. Render Filter Chips & Initial Grid
			this.#renderFilterChips();
			this.#render();

			// 4. Bind Search & Filter Events
			this.#bindEvents();
		} catch (error) {
			console.error("[AllStationsDirectory] Failed to initialize:", error);
			this.#renderErrorState(error.message);
		}
	}

	/**
	 * Cache DOM references defensively
	 */
	#cacheDOM() {
		this.#dom.container = document.getElementById("stations-directory-container");
		this.#dom.filterWrapper = document.getElementById("filter-chips-wrapper");
		this.#dom.searchInput = document.getElementById("dir-search-input");
		this.#dom.clearSearchBtn = document.getElementById("clear-search-btn");
		this.#dom.dropdown = document.getElementById("search-autocomplete-dropdown");
	}

	/**
	 * Initialize active language dictionary
	 */
	#initLocalization() {
		this.#lang = appStateStore.getState("currentLang") || "en";
		this.#t = new Proxy({}, {
			get: (_, key) => i18n.t(`pages.all_stations.${key}`)
		});
	}

	/**
	 * Bind UI & Search Engine Events
	 */
	#bindEvents() {
		// 🔌 PLUG-AND-PLAY SEARCH ENGINE BINDING
		if (this.#dom.searchInput && this.#dom.dropdown && this.#searchEngine) {
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
					const stationId = selectedItem.stationId || selectedItem.id;
					if (stationId) {
						window.location.href = `station_info.html?id=${encodeURIComponent(stationId)}&city=${encodeURIComponent(this.#currentCity)}`;
					}
				}
			});
		}

		const signal = this.#abortController.signal;

		// Clear Search Button Event
		if (this.#dom.clearSearchBtn) {
			this.#dom.clearSearchBtn.addEventListener("click", () => {
				if (this.#dom.searchInput) {
					this.#dom.searchInput.value = "";
					this.#dom.searchInput.focus();
				}
				this.#searchQuery = "";
				this.#dom.clearSearchBtn.hidden = true;
				if (this.#searchEngine) {
					this.#searchEngine.hideDropdown();
				}
				this.#render();
			}, { signal }); // 👈 { signal } जोड़ें
		}
		// Line Filter Chips Delegation
		if (this.#dom.filterWrapper) {
			this.#dom.filterWrapper.addEventListener("click", (e) => {
				const btn = e.target.closest(".chip-btn");
				if (!btn) return;
				const lineId = btn.getAttribute("data-line");
				if (!lineId) return;
				this.#activeFilter = lineId;
				const allChips = this.#dom.filterWrapper.querySelectorAll(".chip-btn");
				allChips.forEach(chip => chip.classList.remove("active"));
				btn.classList.add("active");
				this.#render();
			}, { signal }); // 👈 { signal } जोड़ें
		}
	}

	/**
	 * Renders Network and Line Filter Chips dynamically
	 */
	#renderFilterChips() {
		if (!this.#dom.filterWrapper) return;

		const totalStationsCount = Object.keys(this.#stations || {}).length;

		// Dynamic Grouping of Lines by Network
		const networkGroups = {};

		Object.values(this.#lines).forEach(line => {
			const netKey = line.network || line.operator || "metro";
			if (!networkGroups[netKey]) {
				const formattedTitle = netKey.replace(/_/g, " ").toUpperCase();
				networkGroups[netKey] = {
					title: `🚇 ${formattedTitle}`,
					lines: []
				};
			}
			networkGroups[netKey].lines.push(line);
		});

		let html = `
			<div class="network-chips-row">
				<button type="button" class="chip-btn ${this.#activeFilter === "all" ? "active" : ""}" data-line="all">
					${this.#escapeHTML(this.#t.allLines || "All Lines")} (${totalStationsCount})
				</button>
			</div>
		`;

		Object.values(networkGroups).forEach(group => {
			if (group.lines.length === 0) return;

			html += `
				<div class="network-filter-group">
					<div class="network-group-title">${this.#escapeHTML(group.title)}</div>
					<div class="network-chips-row">
			`;

			group.lines.forEach(line => {
				const shortName = line.short_name?.[this.#lang] || line.short_name?.en || line.name?.[this.#lang] || line.name?.en || line.id;
				const activeClass = this.#activeFilter === line.id ? "active" : "";
				const borderColor = line.color || "#007bff";
				const bgTint = this.#hexToRgba(borderColor, 0.40);
				const count = (line.stations || []).length;

				html += `
					<button type="button" class="chip-btn ${activeClass}" data-line="${this.#escapeHTML(line.id)}" style="--line-color:${borderColor}; border-color:${borderColor}; background-color:${bgTint};">
						● ${this.#escapeHTML(shortName)} (${count})
					</button>
				`;
			});

			html += `
					</div>
				</div>
			`;
		});

		this.#dom.filterWrapper.innerHTML = html;
	}

	/**
	 * Renders Line Directory Sections and Coach Track Rows
	 */
	#render() {
		if (!this.#dom.container) return;

		let html = "";
		let matchedLineCount = 0;

		Object.values(this.#lines).forEach(line => {
			if (this.#activeFilter !== "all" && this.#activeFilter !== line.id) {
				return;
			}

			const stationIds = line.stations || [];

			// Real-time Bilingual Station Search Match
			const filteredStationIds = stationIds.filter(stId => {
				if (!this.#searchQuery) return true;
				const st = this.#stations[stId];
				if (!st) return false;
				const nameEn = (st.name?.en || "").toLowerCase();
				const nameHi = (st.name?.hi || "").toLowerCase();
				const code = (st.id || stId).toLowerCase();
				const query = this.#searchQuery;
				return nameEn.includes(query) || nameHi.includes(query) || code.includes(query);
			});

			if (filteredStationIds.length === 0) {
				return;
			}

			matchedLineCount++;

			const lineTitle = line.name?.[this.#lang] || line.name?.en || line.id;
			const lineColor = line.color || "#c0282c";
			const count = filteredStationIds.length;
			const stationCountText = count === 1 
				? (this.#t.singleStationCount || "1 Station")
				: (this.#t.stationCount ? this.#t.stationCount.replace("{count}", count) : `${count} Stations`);

			html += `
				<section class="line-directory-section" id="section-${this.#escapeHTML(line.id)}">
					<div class="line-section-header" style="border-left-color: ${lineColor};">
						<span>${this.#escapeHTML(lineTitle)}</span>
						<span style="font-size:var(--fs-xs); color:var(--text-secondary); background:var(--btn-reset-bg, rgba(255,255,255,0.08)); border:1px solid var(--border-color); padding:4px 12px; border-radius:var(--radius-full);">${stationCountText}</span>
					</div>

					<div class="train-track-row" style="--line-color: ${lineColor};">
						${filteredStationIds.map(stId => this.#buildCoachCardHTML(stId, line)).join("")}
					</div>    
				</section>
			`;
		});

		// Render Empty State if no stations match query
		if (matchedLineCount === 0) {
			const noMatchMsg = this.#t.noStationQueryMsg 
				? this.#t.noStationQueryMsg.replace("{query}", this.#searchQuery) 
				: `No station matches your search query "${this.#escapeHTML(this.#searchQuery)}".`;

			html = `
				<div class="directory-empty-state">
					<h3>${this.#escapeHTML(this.#t.noStationsFound || "🔍 No stations found")}</h3>
					<p>${noMatchMsg}</p>
				</div>
			`;
		}

		this.#dom.container.innerHTML = html;
	}

	/**
	 * Builds individual SVG Train Coach Card HTML
	 */
	#buildCoachCardHTML(stationId, lineInfo) {
		const st = this.#stations[stationId];

		// Guard against missing station data
		if (!st) {
			console.error(`[Data Integrity Error] Station ID "${stationId}" is referenced in line "${lineInfo.id}", but missing in stationData!`);
			return `
				<div class="real-coach-card missing-station-card" style="--line-color: #ef4444; border: 2px dashed #ef4444; background: rgba(239, 68, 68, 0.08); padding: 1rem; border-radius: var(--radius-lg, 12px); margin: 0.5rem;">
					<div style="color: #ef4444; font-weight: bold; font-size: var(--fs-sm, 14px);">
						⚠️ Missing: <code>${this.#escapeHTML(stationId)}</code>
					</div>
				</div>
			`;
		}

		let stationTitle = (st.name?.en || stationId).toUpperCase();
		if (this.#lang === "hi" && st.name?.hi) {
			stationTitle = st.name.hi;
		}

		const lineColor = lineInfo.color || "#c0282c";
		const firstTrain = this.#formatTo12Hour(st.train_schedule?.first_train);
		const lastTrain = this.#formatTo12Hour(st.train_schedule?.last_train);

		// Layout badge resolution
		const layoutType = (st.properties?.layout || "elevated").toLowerCase();
		let layoutText = "Elevated";
		let layoutClass = "badge-elevated";
		let layoutIcon = "icon_elevated.svg";

		if (layoutType === "underground") {
			layoutText = this.#lang === "hi" ? "भूमिगत" : "Underground";
			layoutClass = "badge-underground";
			layoutIcon = "icon_underground.svg";
		} else if (layoutType === "at_grade" || layoutType === "at-grade" || layoutType === "ground") {
			layoutText = this.#lang === "hi" ? "समतल" : "At Grade";
			layoutClass = "badge-at-grade";
			layoutIcon = "icon_at_grade.svg";
		} else {
			layoutText = this.#lang === "hi" ? "एलिवेटेड" : "Elevated";
			layoutClass = "badge-elevated";
			layoutIcon = "icon_elevated.svg";
		}

		// Interchange badge resolution
		const isInterchange = st.properties?.station_type === "interchange";
		const interchangeText = this.#lang === "hi" ? "इंटरचेंज" : "Interchange";

		return `
			<a href="station_info.html?id=${encodeURIComponent(st.id || stationId)}&city=${encodeURIComponent(this.#currentCity)}" class="real-coach-card" style="--line-color: ${lineColor};" aria-label="${this.#escapeHTML(stationTitle)} Station Info">
				<div class="coach-underglow"></div>

				<svg class="svg-coach-element" viewBox="0 0 360 216" fill="none" xmlns="http://www.w3.org/2000/svg">
					<defs>
						<linearGradient id="bodyGrad-${st.id || stationId}" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="var(--coach-body-grad-start, #ffffff)"/>
							<stop offset="100%" stop-color="var(--coach-body-grad-end, #cbd5e1)"/>
						</linearGradient>
						<linearGradient id="roofGrad-${st.id || stationId}" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="var(--coach-roof-grad-start, #f8fafc)"/>
							<stop offset="100%" stop-color="var(--coach-roof-grad-end, #475569)"/>
						</linearGradient>
					</defs>

					<path d="M12 35 C12 20, 25 12, 45 12 L315 12 C335 12, 348 20, 354 38 L348 165 C340 195, 320 200, 300 200 L25 200 C15 200, 10 185, 10 165 Z" fill="url(#bodyGrad-${st.id || stationId})" stroke="#64748B" stroke-width="2"/>
					<path d="M15 25 C15 12, 28 8, 48 8 L312 8 C328 8, 342 12, 350 25 Z" fill="url(#roofGrad-${st.id || stationId})"/>

					<path d="M322 18 L344 18 C352 18, 356 28, 350 48 L334 48 Z" fill="#0F172A" stroke="#38BDF8" stroke-width="1.5"/>
					<polygon points="325,20 342,20 334,44 325,44" fill="#FFFFFF" opacity="0.3"/>

					<rect class="dynamic-stripe-fill" x="10" y="166" width="340" height="24" rx="4"/>
					<rect x="10" y="174" width="340" height="5" fill="#FFFFFF" opacity="0.8"/>

					<rect x="45" y="198" width="75" height="18" rx="4" fill="#0F172A"/>
					<circle cx="65" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
					<circle cx="65" cy="207" r="3" fill="#E2E8F0"/>
					<circle cx="100" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
					<circle cx="100" cy="207" r="3" fill="#E2E8F0"/>

					<rect x="240" y="198" width="75" height="18" rx="4" fill="#0F172A"/>
					<circle cx="260" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
					<circle cx="260" cy="207" r="3" fill="#E2E8F0"/>
					<circle cx="295" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
					<circle cx="295" cy="207" r="3" fill="#E2E8F0"/>

					<circle cx="348" cy="180" r="5" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5"/>
					<circle cx="338" cy="180" r="4" fill="#F59E0B"/>
				</svg>

				<div class="coach-window-overlay">
					<div class="window-station-title">
						<span class="station-name-title">${this.#escapeHTML(stationTitle)}</span>
					</div>

					<div class="window-timings-line">
						<strong>${firstTrain} ➔ ${lastTrain}</strong>
					</div>
				</div>

				<div class="coach-stripe-badges">
					<span class="coach-badge ${layoutClass}" title="${this.#escapeHTML(layoutText)}">
						<img src="./assets/icons/${layoutIcon}" class="badge-icon-img" alt="${this.#escapeHTML(layoutText)}">
					</span>

					${isInterchange ? `
						<span class="coach-badge badge-interchange" title="${this.#escapeHTML(interchangeText)}">
							<img src="./assets/icons/icon_interchange.svg" class="badge-icon-img" alt="${this.#escapeHTML(interchangeText)}">
						</span>
					` : ""}
				</div>
			</a>
		`;
	}

	/**
	 * Converts 24-hour time string to 12-hour AM/PM format
	 */
	#formatTo12Hour(timeStr) {
		if (!timeStr || timeStr === "N/A" || timeStr === "null" || timeStr === "") {
			return "--:--";
		}
		const parts = timeStr.split(":");
		if (parts.length < 2) return timeStr;

		let hours = parseInt(parts[0], 10);
		const minutes = parts[1];
		const ampm = hours >= 12 ? "PM" : "AM";
		hours = hours % 12;
		hours = hours ? hours : 12;
		const strHours = hours < 10 ? "0" + hours : hours;

		return `${strHours}:${minutes} ${ampm}`;
	}

	/**
	 * Hex to RGBA color conversion helper
	 */
	#hexToRgba(hex, alpha = 0.18) {
		if (!hex) return `rgba(255, 255, 255, ${alpha})`;
		let c = hex.replace("#", "");
		if (c.length === 3) {
			c = c.split("").map(x => x + x).join("");
		}
		if (c.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
		const r = parseInt(c.substring(0, 2), 16);
		const g = parseInt(c.substring(2, 4), 16);
		const b = parseInt(c.substring(4, 6), 16);
		return `rgba(${r}, ${g}, ${b}, ${alpha})`;
	}

	/**
	 * Defensive XSS Sanitization helper
	 */
	#escapeHTML(str) {
		if (!str || typeof str !== "string") return "";
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	/**
	 * Renders UI Error State
	 */
	#renderErrorState(message) {
		if (!this.#dom.container) return;
		this.#dom.container.innerHTML = `
			<div class="directory-empty-state" style="border-color: #ef4444;">
				<span style="font-size: 2rem;">⚠️</span>
				<h3>Failed to load Station Directory</h3>
				<p>${this.#escapeHTML(message)}</p>
			</div>
		`;
	}
}

// Auto-instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
	const directory = new AllStationsDirectory();
	directory.init();
});