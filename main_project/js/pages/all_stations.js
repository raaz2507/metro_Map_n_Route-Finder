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
	#unsubscribeLang = null;

	// Private DOM Element Handles
	#dom = {
		container: null,
		filterWrapper: null,
		searchInput: null,
		clearSearchBtn: null,
		dropdown: null
	};

	// Private Localization
	#lang = "en";

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
		if (this.#unsubscribeLang) {
			this.#unsubscribeLang();
			this.#unsubscribeLang = null;
		}
		if (this.#searchEngine && typeof this.#searchEngine.destroy === "function") {
			this.#searchEngine.destroy();
		}
	}

	/**
	 * Initializes Universal Header, Footer, Data Store, and Search Engine
	 */
	async init() {
		// Render Footer first, then Header (ensuring i18n single-pass translates both)
		FooterComponent.render();
		await HeaderComponent.render("stations");

		if (this.#dom.searchInput) {
			this.#dom.searchInput.placeholder = i18n.t("pages.all_stations.controls.searchPlaceholder") || "Search station by name or code...";
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

			// 5. Subscribe to dynamic language updates
			this.#unsubscribeLang = appStateStore.subscribe("currentLang", (newLang) => {
				this.#lang = newLang || "en";
				if (this.#dom.searchInput) {
					this.#dom.searchInput.placeholder = i18n.t("pages.all_stations.controls.searchPlaceholder");
				}
				this.#renderFilterChips();
				this.#render();
			});
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
	 * Initialize active language
	 */
	#initLocalization() {
		this.#lang = appStateStore.getState("currentLang") || localStorage.getItem("language") || "en";
	}

	/**
	 * Bind UI & Search Engine Events
	 */
	#bindEvents() {
		// PLUG-AND-PLAY SEARCH ENGINE BINDING
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
			}, { signal });
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
			}, { signal });
		}


				// =========================================================================
		// 🌟 SHOWCASE REAL 2.5D MOUSE CURSOR TILT & DEPTH PARALLAX ENGINE
		// =========================================================================
		if (this.#dom.container) {
			this.#dom.container.addEventListener("mousemove", (e) => {
				const card = e.target.closest(".real-coach-card");
				if (!card) return;

				const rect = card.getBoundingClientRect();
				const mouseX = e.clientX - rect.left;
				const mouseY = e.clientY - rect.top;

				const normX = Math.max(-1, Math.min(1, ((mouseX / rect.width) - 0.5) * 2));
				const normY = Math.max(-1, Math.min(1, ((mouseY / rect.height) - 0.5) * 2));

				// 1. Deep 3D Card Rotations
				const rotateX = -normY * 14;
				const rotateY = normX * 16;
				const translateY = -8 + (normY * -3);

				card.style.transform = `perspective(850px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(${translateY.toFixed(1)}px) scale3d(1.03, 1.03, 1.03)`;

				// 2. Parallax Depth on Window Text (Station Title & Time)
				const textContainer = card.querySelector(".coach-window-overlay");
				if (textContainer) {
					const textX = (normX * 8).toFixed(1);
					const textY = (normY * 6).toFixed(1);
					textContainer.style.transform = `translate3d(${textX}px, ${textY}px, 35px)`;
				}

				// 3. Tactile Medal Badge Pop & Glow
				const badge = card.querySelector(".coach-center-badge");
				if (badge) {
					const badgeX = (normX * 12).toFixed(1);
					const badgeY = (normY * 8).toFixed(1);
					badge.style.transform = `translateX(calc(-50% + ${badgeX}px)) translateY(${badgeY}px) scale(1.22)`;
				}

				// 4. Reactive Underglow Counter-Balance
				const underglow = card.querySelector(".coach-underglow");
				if (underglow) {
					const glowX = (-normX * 14).toFixed(1);
					const glowY = (15 + normY * 5).toFixed(1);
					underglow.style.transform = `translate(${glowX}px, ${glowY}px) scaleX(1.15)`;
					underglow.style.opacity = "0.75";
				}
			});

			this.#dom.container.addEventListener("mouseleave", (e) => {
				const cards = this.#dom.container.querySelectorAll(".real-coach-card");
				cards.forEach(card => {
					card.style.transform = "";
					const textContainer = card.querySelector(".coach-window-overlay");
					if (textContainer) textContainer.style.transform = "";
					const badge = card.querySelector(".coach-center-badge");
					if (badge) badge.style.transform = "translateX(-50%) scale(1)";
					const underglow = card.querySelector(".coach-underglow");
					if (underglow) {
						underglow.style.transform = "";
						underglow.style.opacity = "";
					}
				});
			}, true);

			this.#dom.container.addEventListener("mouseout", (e) => {
				const card = e.target.closest(".real-coach-card");
				if (!card) return;
				const related = e.relatedTarget;
				if (related && card.contains(related)) return;

				card.style.transform = "";
				const textContainer = card.querySelector(".coach-window-overlay");
				if (textContainer) textContainer.style.transform = "";
				const badge = card.querySelector(".coach-center-badge");
				if (badge) badge.style.transform = "translateX(-50%) scale(1)";
				const underglow = card.querySelector(".coach-underglow");
				if (underglow) {
					underglow.style.transform = "";
					underglow.style.opacity = "";
				}
			});
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

		const allLinesLabel = i18n.t("pages.all_stations.controls.allLines") || "All Lines";

		let html = `
			<div class="network-chips-row">
				<button type="button" class="chip-btn ${this.#activeFilter === "all" ? "active" : ""}" data-line="all">
					${this.#escapeHTML(allLinesLabel)} (${totalStationsCount})
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
				? (i18n.t("pages.all_stations.results.singleStationCount") || "1 Station")
				: i18n.t("pages.all_stations.results.stationCount", { count });

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
			const noMatchMsg = i18n.t("pages.all_stations.results.noStationQueryMsg", { query: this.#searchQuery });
			const noFoundTitle = i18n.t("pages.all_stations.results.noStationsFound") || "🔍 No stations found";

			html = `
				<div class="directory-empty-state">
					<h3>${this.#escapeHTML(noFoundTitle)}</h3>
					<p>${this.#escapeHTML(noMatchMsg)}</p>
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

		// Layout badge resolution from i18n dictionary
		const layoutType = (st.properties?.layout || "elevated").toLowerCase();
		let layoutText = i18n.t("pages.all_stations.badges.elevated");
		let layoutClass = "badge-elevated";
		let layoutIcon = "icon_elevated.svg";

		if (layoutType === "underground") {
			layoutText = i18n.t("pages.all_stations.badges.underground");
			layoutClass = "badge-underground";
			layoutIcon = "icon_underground.svg";
		} else if (layoutType === "at_grade" || layoutType === "at-grade" || layoutType === "ground") {
			layoutText = i18n.t("pages.all_stations.badges.atGrade");
			layoutClass = "badge-at-grade";
			layoutIcon = "icon_at_grade.svg";
		}

		// Interchange badge resolution from i18n dictionary
		const isInterchange = st.properties?.station_type === "interchange";
		const interchangeText = i18n.t("pages.all_stations.badges.interchange");
		const cardAria = i18n.t("pages.all_stations.badges.coachAria", { name: stationTitle });

		return `
			<a href="station_info.html?id=${encodeURIComponent(st.id || stationId)}&city=${encodeURIComponent(this.#currentCity)}" class="real-coach-card" style="--line-color: ${lineColor};" aria-label="${this.#escapeHTML(cardAria)}">
				<div class="coach-underglow"></div>

				<!-- Dynamic Reusable SVG Coach Symbol (Theme-Engine Driven) -->
				<svg class="svg-coach-element" viewBox="0 0 360 210" aria-hidden="true">
					<use href="#theme-coach-shape"></use>
				</svg>

				<div class="coach-window-overlay">
					<div class="window-station-title">
						<span class="station-name-title">${this.#escapeHTML(stationTitle)}</span>
					</div>

					<div class="window-timings-line">
						<strong>${firstTrain} ➔ ${lastTrain}</strong>
					</div>
				</div>

				<!-- Showcase Circular Center Badge (Elevated on Patti) -->
				<div class="coach-center-badge ${layoutClass}" title="${this.#escapeHTML(layoutText)}">
					<span>${layoutType.startsWith("u") ? "UG" : (layoutType.startsWith("a") ? "AG" : "E")}</span>
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