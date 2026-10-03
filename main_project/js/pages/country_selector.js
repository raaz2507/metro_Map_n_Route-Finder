/**
 * 🌍 Country & Transit Region Selector Controller
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically loads and renders global transit regions from countries_manifest.json
 */
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { Toast } from "../components/Toast.js";
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";

export class CountrySelector {
	// Private State Fields
	#manifestData = null;
	#activeStatusFilter = "all"; // "all" | "active" | "upcoming"
	#searchQuery = "";
	#abortController = null;
	#unsubscribeLang = null;

	// Private DOM Handles
	#dom = {
		container: null,
		searchInput: null,
		clearSearchBtn: null,
		statusChipsWrapper: null,
		statsCounterText: null
	};

	constructor() {
		this.#abortController = new AbortController();
		this.#cacheDOM();
		this.#bindEvents();
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
	}

	async init() {
		FooterComponent.render();
		await HeaderComponent.render();

		// Subscribe to dynamic language toggle for instant in-place re-render
		this.#unsubscribeLang = appStateStore.subscribe("currentLang", () => {
			if (this.#dom.searchInput) {
				this.#dom.searchInput.placeholder = i18n.t("pages.countrySelector.search.placeholder") || "Search country or code (e.g. India, Japan, UK)...";
			}
			this.#render();
		});

		await this.#fetchManifest();
	}

	#cacheDOM() {
		this.#dom.container = document.getElementById("country-grid-container");
		this.#dom.searchInput = document.getElementById("country-search-input");
		this.#dom.clearSearchBtn = document.getElementById("clear-country-search-btn");
		this.#dom.statusChipsWrapper = document.getElementById("country-status-chips");
		this.#dom.statsCounterText = document.getElementById("country-stats-counter-text");
	}

	#bindEvents() {
		const signal = this.#abortController.signal;

		// 1. Search Input Handler
		if (this.#dom.searchInput) {
			this.#dom.searchInput.addEventListener("input", (e) => {
				this.#searchQuery = (e.target.value || "").trim().toLowerCase();
				if (this.#dom.clearSearchBtn) {
					this.#dom.clearSearchBtn.hidden = this.#searchQuery.length === 0;
				}
				this.#render();
			}, { signal });
		}

		// 2. Clear Search Button
		if (this.#dom.clearSearchBtn) {
			this.#dom.clearSearchBtn.addEventListener("click", () => {
				if (this.#dom.searchInput) {
					this.#dom.searchInput.value = "";
					this.#dom.searchInput.focus();
				}
				this.#searchQuery = "";
				this.#dom.clearSearchBtn.hidden = true;
				this.#render();
			}, { signal });
		}

		// 3. Status Filter Chips
		if (this.#dom.statusChipsWrapper) {
			this.#dom.statusChipsWrapper.addEventListener("click", (e) => {
				const target = e.target.closest(".chip-btn");
				if (!target) return;
				this.#activeStatusFilter = target.dataset.status || "all";
				this.#dom.statusChipsWrapper.querySelectorAll(".chip-btn").forEach(btn => {
					const isActive = btn === target;
					btn.classList.toggle("active", isActive);
					btn.setAttribute("aria-checked", isActive ? "true" : "false");
				});
				this.#render();
			}, { signal });
		}

		// 4. Country Card Click Delegation
		if (this.#dom.container) {
			this.#dom.container.addEventListener("click", (e) => {
				const card = e.target.closest(".country-card");
				if (!card) return;

				const countryKey = card.dataset.countryKey;
				const status = card.dataset.status;
				const countryName = card.dataset.countryName;

				this.#handleCountrySelect(countryKey, status, countryName);
			}, { signal });
		}
	}

	async #fetchManifest() {
		try {
			const response = await fetch("data/countries_manifest.json");
			if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
			this.#manifestData = await response.json();
			this.#render();
		} catch (error) {
			if (error.name === "AbortError") return;
			console.error("[CountrySelector] Failed to load countries manifest:", error);
			this.#renderErrorState(error.message);
		}
	}

	#handleCountrySelect(countryKey, status, countryName) {
		if (status !== "active") {
			const upcomingMsg = i18n.t("pages.countrySelector.card.underMapping") || "Transit data for this country is currently being mapped. Stay tuned!";
			Toast.show(upcomingMsg, {
				title: `${countryName || "Region"} Upcoming`,
				type: "info",
				duration: 3500
			});
			return;
		}

		// Persist Active Country Selection
		try {
			localStorage.setItem("active_country", countryKey);
		} catch (e) {}

		// Seamless navigation to Transit Network Selector with explicit query param
		window.location.href = `TransitNetworkSelector.html?country=${encodeURIComponent(countryKey)}`;
	}

	#getFilteredCountries() {
		if (!this.#manifestData || !this.#manifestData.countries) return [];

		const query = this.#searchQuery;
		const statusFilter = this.#activeStatusFilter;
		const list = [];

		for (const [key, data] of Object.entries(this.#manifestData.countries)) {
			// Status Filter
			if (statusFilter !== "all" && data.status !== statusFilter) {
				continue;
			}

			// Text Search Filter (Matches country name in EN/HI and ISO code)
			if (query.length > 0) {
				const nameEn = (data.name?.en || "").toLowerCase();
				const nameHi = (data.name?.hi || "").toLowerCase();
				const code = (data.code || "").toLowerCase();
				const matches = nameEn.includes(query) || nameHi.includes(query) || code.includes(query) || key.includes(query);
				if (!matches) continue;
			}

			list.push({
				countryKey: key,
				...data
			});
		}

		// Active countries first, then alphabetical
		list.sort((a, b) => {
			if (a.status === "active" && b.status !== "active") return -1;
			if (b.status === "active" && a.status !== "active") return 1;
			const nameA = this.#getLocalized(a.name);
			const nameB = this.#getLocalized(b.name);
			return nameA.localeCompare(nameB);
		});

		return list;
	}

	#render() {
		if (!this.#dom.container) return;

		const countries = this.#getFilteredCountries();

		// Update Stats Bar
		if (this.#dom.statsCounterText) {
			const count = countries.length;
			this.#dom.statsCounterText.textContent = `Showing ${count} country ${count === 1 ? "region" : "regions"}`;
		}

		if (countries.length === 0) {
			this.#dom.container.innerHTML = `
				<div class="empty-state">
					<span class="empty-state-icon">🔍</span>
					<h3>No Countries Found</h3>
					<p>No transit regions match "${this.#escapeHTML(this.#searchQuery)}".</p>
				</div>
			`;
			return;
		}

		this.#dom.container.innerHTML = countries.map(country => this.#renderCard(country)).join("");
	}

	#renderCard(c) {
		const countryName = this.#getLocalized(c.name) || c.countryKey;
		const isOperational = c.status === "active";
		const themeColor = c.themeColor || "#3B82F6";
		const statusText = isOperational ? "● Operational" : "⏱ Coming Soon";
		const landmarkSvg = c.landmarkSvg || "";

		return `
			<article 
				class="country-card ${!isOperational ? "upcoming" : ""}" 
				data-country-key="${this.#escapeHTML(c.countryKey)}"
				data-status="${this.#escapeHTML(c.status)}"
				data-country-name="${this.#escapeHTML(countryName)}"
				style="--country-theme: ${this.#escapeHTML(themeColor)};"
				role="button"
				tabindex="0"
				aria-label="${this.#escapeHTML(countryName)}, ${statusText}"
			>
				${landmarkSvg ? `<div class="landmark-silhouette" style="-webkit-mask-image: url('${this.#escapeHTML(landmarkSvg)}'); mask-image: url('${this.#escapeHTML(landmarkSvg)}');" aria-hidden="true"></div>` : ""}

				<!-- Top Head: Flag & Code Stamp -->
				<div class="card-top-head">
					<span class="flag-badge" aria-hidden="true">${c.flag || "🌐"}</span>
					<span class="code-stamp">${this.#escapeHTML((c.code || "").toUpperCase())}</span>
				</div>

				<!-- Body: Country Name & Status -->
				<div class="card-body">
					<h2 class="country-name">${this.#escapeHTML(countryName)}</h2>
					<div class="country-status-label ${isOperational ? 'status-operational' : 'status-upcoming'}">
						${this.#escapeHTML(statusText)}
					</div>
				</div>

				<!-- Foot: Network Counts or Placeholder & Arrow -->
				<div class="card-foot">
					<div class="metrics-group">
						${isOperational ? `
							<span class="metrics-badge">${c.totalCities || 0}</span> Cities
							<span>•</span>
							<span class="metrics-badge">${c.totalNetworks || 0}</span> Networks
						` : `
							<span>Under Mapping</span>
						`}
					</div>
					<span class="action-arrow" aria-hidden="true">→</span>
				</div>
			</article>
		`;
	}

	#renderErrorState(msg) {
		if (!this.#dom.container) return;
		this.#dom.container.innerHTML = `
			<div class="empty-state">
				<span class="empty-state-icon">🗺️</span>
				<h3>Failed to Load Countries Manifest</h3>
				<p>${this.#escapeHTML(msg)}</p>
			</div>
		`;
	}

	#getLocalized(val) {
		if (!val) return "";
		if (typeof val === "object") {
			// i18n.getLanguage is a getter property, NOT a function!
			const currentLang = i18n.getLanguage || appStateStore.getState("currentLang") || "en";
			return val[currentLang] || val.en || Object.values(val)[0] || "";
		}
		return String(val);
	}

	#escapeHTML(str) {
		if (!str) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
}

// Auto Bootstrapping
document.addEventListener("DOMContentLoaded", () => {
	const controller = new CountrySelector();
	controller.init().catch(err => console.error("[CountrySelector] Initialization failure:", err));
});