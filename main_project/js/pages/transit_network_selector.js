/**
 * Transit Network & City Selector Page Controller
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically renders India's transit systems with auto-generated City-wide Group Cards.
 */
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { UniversalSearchEngine } from "../services/search/UniversalSearchEngine.js";
import { Toast } from "../components/Toast.js";
import { appStateStore } from "../core/app-state-store.js";
import { centerClass } from "../core/CenterClass.js";


export class TransitNetworkSelector {
	// Private State Fields
	#registryData = null;
	#searchEngine = null;
	#activeModeFilter = "all";
	#activeStatusFilter = "all";
	#activeSort = "status_smart";
	#searchQuery = "";
	#abortController = null;
	#unsubscribeLang = null; 

	// Private DOM Element Handles
	#dom = {
		container: null,
		searchInput: null,
		clearSearchBtn: null,
		dropdown: null,
		modeChipsWrapper: null,
		statusChipsWrapper: null,
		sortChipsWrapper: null
	};

	constructor() {
		this.#abortController = new AbortController(); 
		this.#activeSort = localStorage.getItem("transit_sort_preference") || "status_smart";
		this.#searchEngine = new UniversalSearchEngine({ scope: "global" });
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
		if (this.#searchEngine && typeof this.#searchEngine.destroy === "function") {
			this.#searchEngine.destroy();
		}
	}

	async init() {
		FooterComponent.render();
		await HeaderComponent.render("networks");
		
		
		if (this.#dom.sortChipsWrapper) {
			this.#dom.sortChipsWrapper.querySelectorAll(".chip-btn").forEach(btn => {
				const isActive = btn.dataset.sort === this.#activeSort;
				btn.classList.toggle("active", isActive);
				btn.setAttribute("aria-checked", isActive ? "true" : "false");
			});
		}
		// Subscribe to dynamic language toggle for instant in-place re-render
		this.#unsubscribeLang = appStateStore.subscribe("currentLang", async (newLang) => {
			await this.#reloadLocale(newLang);
			if (this.#dom.searchInput) {
				this.#dom.searchInput.placeholder = centerClass.t("pages.networks.search.placeholder") || "Search city, state or network...";
			}
			this.#render();
		});

		await this.#searchEngine.init().catch(err => console.warn("[SearchEngine] Init notice:", err));
		await this.#fetchRegistry();
	}

	#cacheDOM() {
		this.#dom.container = document.getElementById("transit-selector-container");
		this.#dom.searchInput = document.getElementById("network-search-input");
		this.#dom.clearSearchBtn = document.getElementById("clear-search-btn");
		this.#dom.dropdown = document.getElementById("search-autocomplete-dropdown");
		this.#dom.modeChipsWrapper = document.getElementById("mode-chips-wrapper");
		this.#dom.statusChipsWrapper = document.getElementById("status-chips-wrapper");
		this.#dom.sortChipsWrapper = document.getElementById("sort-chips-wrapper");
	}

	#bindEvents() {
		const signal = this.#abortController.signal;
		
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
			}, { signal });
		}
		
		if (this.#dom.modeChipsWrapper) {
			this.#dom.modeChipsWrapper.addEventListener("click", (e) => {
				const target = e.target.closest(".chip-btn");
				if (!target) return;
				this.#activeModeFilter = target.dataset.mode || "all";
				this.#updateChipsUI(this.#dom.modeChipsWrapper, target);
				this.#render();
			}, { signal });
		}
		
		if (this.#dom.statusChipsWrapper) {
			this.#dom.statusChipsWrapper.addEventListener("click", (e) => {
				const target = e.target.closest(".chip-btn");
				if (!target) return;
				this.#activeStatusFilter = target.dataset.status || "all";
				this.#updateChipsUI(this.#dom.statusChipsWrapper, target);
				this.#render();
			}, { signal });
		}
		
		if (this.#dom.sortChipsWrapper) {
			this.#dom.sortChipsWrapper.addEventListener("click", (e) => {
				const target = e.target.closest(".chip-btn");
				if (!target) return;
				this.#activeSort = target.dataset.sort || "status_smart";
				this.#updateChipsUI(this.#dom.sortChipsWrapper, target);
				try { localStorage.setItem("transit_sort_preference", this.#activeSort); } catch (err) {}
				this.#render();
			}, { signal });
		}
		
		if (this.#dom.container) {
			this.#dom.container.addEventListener("click", (e) => {
				if (e.target.closest(".official-website-link")) return;
				const card = e.target.closest(".network-card-compact");
				if (!card) return;
				const cityKey = card.dataset.city;
				const networkKey = card.dataset.network;
				const status = card.dataset.status;
				const name = card.dataset.name;
				this.#handleNetworkSelect(cityKey, networkKey, status, name);
			}, { signal });
		}


	}

	#updateChipsUI(wrapper, activeTarget) {
		wrapper.querySelectorAll(".chip-btn").forEach(btn => {
			const isActive = btn === activeTarget;
			btn.classList.toggle("active", isActive);
			btn.setAttribute("aria-checked", isActive ? "true" : "false");
		});
	}

	#handleSuggestionClick(item) {
		if (!item || !item.cityKey) return;
		try {
			localStorage.setItem("active_city", item.cityKey);
			if (item.networkKey) localStorage.setItem("active_network", item.networkKey);
		} catch (e) {}

		if (item.stationId) {
			window.location.href = `index.html?city=${encodeURIComponent(item.cityKey)}&to=${encodeURIComponent(item.stationId)}`;
		} else {
			window.location.href = `index.html?city=${encodeURIComponent(item.cityKey)}&network=${encodeURIComponent(item.networkKey || "")}`;
		}
	}

	async #fetchRegistry() {
		try {
			// 1. Resolve Active Country from URL param > LocalStorage > Default 'india'
			const urlParams = new URLSearchParams(window.location.search);
			const requestedCountry = urlParams.get("country") || localStorage.getItem("active_country") || "india";

			// 2. Load Global Countries Manifest to resolve dynamic registry path
			const manifestRes = await fetch("data/countries_manifest.json", {
				signal: this.#abortController ? this.#abortController.signal : undefined
			});
			if (!manifestRes.ok) throw new Error(`Manifest HTTP Error: ${manifestRes.status}`);
			const manifest = await manifestRes.json();

			const countryMeta = manifest.countries?.[requestedCountry] || manifest.countries?.[manifest.default_country || "india"];
			if (!countryMeta) throw new Error(`Country "${requestedCountry}" not found in manifest.`);

			// 3. Persist Active Country
			try {
				localStorage.setItem("active_country", countryMeta.code ? requestedCountry : "india");
			} catch (e) {}

			// 4. Fetch Country Specific Registry + Strict Locale Dictionary
			const registryPath = countryMeta.registryPath || `data/${requestedCountry}/${requestedCountry}_transit_registry.json`;
			const activeLang = localStorage.getItem("app-lang") || localStorage.getItem("language") || centerClass.currentLanguage || "en";
			const locPath = `locales/${activeLang}/${requestedCountry}/transit_registry_locale.json`;

			const [registryRes, locRes] = await Promise.all([
				fetch(registryPath, { signal: this.#abortController?.signal }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
				fetch(locPath, { signal: this.#abortController?.signal }).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
			]);

			this.#registryData = registryRes;
			const regLoc = locRes?.registry?.cities || {};
			if (locRes?.registry?.country) {
				this.#registryData.country = locRes.registry.country;
			}
			if (locRes?.registry?.country) {
				this.#registryData.country = locRes.registry.country;
			}

			if (this.#registryData.cities) {
				for (const [cKey, cVal] of Object.entries(this.#registryData.cities)) {
					const locCity = regLoc[cKey] || {};
					cVal.name = locCity.name || "";
					cVal.state = locCity.state || "";
					if (cVal.networks) {
						for (const [nKey, nVal] of Object.entries(cVal.networks)) {
							const locNet = locCity.networks?.[nKey] || {};
							nVal.name = locNet.name || "";
							nVal.operator = locNet.operator || "";
						}
					}
				}
			}

			this.#render();
		} catch (error) {
			if (error.name === "AbortError") return;
			console.error("[TransitNetworkSelector] Failed to load registry:", error);
			this.#renderErrorState(error.message);
		}
	}

	async #reloadLocale(newLang) {
		if (!this.#registryData) return;
		try {
			const urlParams = new URLSearchParams(window.location.search);
			const requestedCountry = urlParams.get("country") || localStorage.getItem("active_country") || "india";
			const activeLang = newLang || "en";
			const locPath = `locales/${activeLang}/${requestedCountry}/transit_registry_locale.json`;
			const locRes = await fetch(locPath, { signal: this.#abortController?.signal }).then(r => r.ok ? r.json() : null);
			const regLoc = locRes?.registry?.cities || {};
			if (locRes?.registry?.country) {
				this.#registryData.country = locRes.registry.country;
			}

			if (this.#registryData.cities) {
				for (const [cKey, cVal] of Object.entries(this.#registryData.cities)) {
					const locCity = regLoc[cKey] || {};
					cVal.name = locCity.name || "";
					cVal.state = locCity.state || "";
					if (cVal.networks) {
						for (const [nKey, nVal] of Object.entries(cVal.networks)) {
							const locNet = locCity.networks?.[nKey] || {};
							nVal.name = locNet.name || "";
							nVal.operator = locNet.operator || "";
						}
					}
				}
			}
		} catch (e) {
			console.warn("[TransitNetworkSelector] Failed to reload locale:", e);
		}
	}

	
	/**
	 * Smart Dynamic Track Silhouette Resolver (Pure UI logic - 100% Zero JSON dependency)
	 */
	#resolveTrackSvg(item) {
		const trackBase = "assets/icons/tracks";

		// 1. Group Cards: Strictly pick from the 5 Group tracks
		if (item.isGroupCard) {
			const groupTracks = [
				"track_05.svg", // Orbital Ring Hub
				"track_07.svg", // Trunk & Merge Junction
				"track_10.svg", // Sweeping Arc & Spoke Hub
				"track_12.svg", // Transfer T-Junction
				"track_13.svg"// Multi-Line Master Grid
			];
			const hash = this.#hashString(item.cityKey || "");
			return `${trackBase}/${groupTracks[hash % groupTracks.length]}`;
		}

		// 2. Mode-specific Rules for Normal Cards
		const mode = (item.mode || "").toLowerCase();
		if (mode === "rrts") {
			return `${trackBase}/track_03.svg`; // Twin Parallel strictly for RRTS
		}
		if (mode === "monorail" || mode === "metroneo") {
			return `${trackBase}/track_04.svg`; // Loop Track
		}
		if (mode === "metrolite") {
			return `${trackBase}/track_09.svg`; // Fork / Y-Branch
		}

		// 3. Normal Metro Corridors (Tracks 01, 02, 06, 08, 11)
		const normalTracks = [
			"track_01.svg", // S-Curve Classic
			"track_02.svg", // Cross Diagonal
			"track_06.svg", // Underground Step
			"track_08.svg", // Express Bypass Loop
			"track_11.svg"// Ascending 3-Step Corridor
		];
		const hash = this.#hashString(item.networkKey || item.cityKey || "");
		return `${trackBase}/${normalTracks[hash % normalTracks.length]}`;
	}

	#hashString(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = (hash << 5) - hash + str.charCodeAt(i);
			hash |= 0;
		}
		return Math.abs(hash);
	}
	#getLocalized(val) {
		return val ? String(val) : "";
	}

	// Helper: Search corpus across both Hindi & English
	#getSearchCorpus(val) {
		if (!val) return "";
		if (typeof val === "object") {
			return `${val.en || ""} ${val.hi || ""} ${Object.values(val).join(" ")}`.toLowerCase();
		}
		return String(val).toLowerCase();
	}

	/**
	 * Data Aggregation & Segregation (Backend Logic)
	 */
	#getFilteredData() {
		if (!this.#registryData || !this.#registryData.cities) {
			return { totalNetworks: 0, groupNetworks: [], individualNetworks: [] };
		}

		const query = this.#searchQuery;
		const searchWords = query.length > 0 ? query.split(/\s+/).filter(Boolean) : [];
		
		const groupNetworks = [];
		const individualNetworks = [];
		let totalNetworks = 0;

				for (const [cityKey, cityData] of Object.entries(this.#registryData.cities)) {
			// Extract safe localized display strings
			const cityName = this.#getLocalized(cityData.name) || cityKey;
			const stateName = this.#getLocalized(cityData.state);
			const networks = cityData.networks || {};
			const networkKeys = Object.keys(networks);

			// 1. Process Individual Networks
			for (const [netKey, netData] of Object.entries(networks)) {
				if (this.#passesFilters(netData, cityData, netKey, searchWords)) {
					const netName = this.#getLocalized(netData.name) || netKey;
					const operatorName = this.#getLocalized(netData.operator);

					individualNetworks.push({
						cityKey,
						cityName,
						stateName,
						networkKey: netKey,
						name: netName,
						operator: operatorName,
						themeColor: cityData.themeColor || "#1E40AF",
						mode: netData.mode || "Metro",
						status: netData.status || "operational",
						website: netData.website || null,
						icon: netData.icon || null
					});
					totalNetworks++;
				}
			}

			// 2. Generate Virtual Group Card for Cities with > 1 network
			if (networkKeys.length > 1) {
				if (this.#activeModeFilter === "all" || this.#activeModeFilter === "Combined") {
					let searchMatches = true;
					if (searchWords.length > 0) {
						const cityCorpus = `${this.#getSearchCorpus(cityData.name)} ${this.#getSearchCorpus(cityData.state)} combined all networks`;
						searchMatches = searchWords.every(word => cityCorpus.includes(word));
					}
					
					if (searchMatches && (this.#activeStatusFilter === "all" || this.#activeStatusFilter === "operational")) {
						const availableIcons = Object.values(networks).map(n => n.icon).filter(Boolean);
						const allNetSuffix = centerClass.t("pages.networks.card.allNetworksSuffix");
						const combinedSubtitle = centerClass.t("pages.networks.card.combinedSubtitle");

						groupNetworks.push({
							isGroupCard: true,
							cityKey: cityKey,
							cityName: cityName,
							stateName: stateName,
							themeColor: cityData.themeColor || "#1E40AF",
							networkKey: "all",
							name: `${cityName} ${allNetSuffix}`,
							mode: "Combined",
							status: "operational",
							operator: combinedSubtitle,
							icons: availableIcons
						});
					}
				}
			}
		}

		// Apply Safe String Sorting (Zero Crash guarantee)
		groupNetworks.sort((a, b) => this.#sortComparator(a, b));
		individualNetworks.sort((a, b) => this.#sortComparator(a, b));

		return { totalNetworks, groupNetworks, individualNetworks };
	}

	#passesFilters(netData, cityData, netKey, searchWords) {
		const netMode = netData.mode || "Metro";
		const netStatus = netData.status || "operational";
		const operator = this.#getLocalized(netData.operator);

		if (this.#activeModeFilter !== "all" && netMode.toLowerCase() !== this.#activeModeFilter.toLowerCase()) return false;
		if (this.#activeStatusFilter !== "all" && netStatus.toLowerCase() !== this.#activeStatusFilter.toLowerCase()) return false;

		if (searchWords.length > 0) {
			const searchCorpus = `${this.#getSearchCorpus(cityData.name)} ${this.#getSearchCorpus(cityData.state)} ${this.#getSearchCorpus(netData.name)} ${operator} ${netMode} ${netKey}`;
			return searchWords.every(word => searchCorpus.includes(word));
		}
		return true;
	}

	#sortComparator(a, b) {
		const nameA = String(a.name || "");
		const nameB = String(b.name || "");
		const cityA = String(a.cityName || "");
		const cityB = String(b.cityName || "");

		switch (this.#activeSort) {
			case "city_asc":
				return cityA.localeCompare(cityB) || nameA.localeCompare(nameB);
			case "name_asc":
				return nameA.localeCompare(nameB);
			case "mode":
				return (a.mode || "").localeCompare(b.mode || "") || cityA.localeCompare(cityB);
			case "status_smart":
			default: {
				const statusOrder = { "operational": 1, "operational_partial": 2, "under_construction": 3, "approved": 4, "proposed": 5 };
				const orderA = statusOrder[a.status] || 99;
				const orderB = statusOrder[b.status] || 99;
				if (orderA !== orderB) return orderA - orderB;
				return cityA.localeCompare(cityB) || nameA.localeCompare(nameB);
			}
		}
	}

	/**
	 * Primary Render Method (Frontend UI Logic)
	 */
	#render() {
		if (!this.#dom.container) return;

		const { totalNetworks, groupNetworks, individualNetworks } = this.#getFilteredData();

		if (groupNetworks.length === 0 && individualNetworks.length === 0) {
			const noMatchMsg = centerClass.t("pages.networks.stats.noNetworksQuery", { query: this.#searchQuery });
			this.#dom.container.innerHTML = `
				<div class="empty-state">
					<span class="empty-state-icon">🔍</span>
					<h3>${this.#escapeHTML(centerClass.t("pages.networks.stats.noNetworksFound"))}</h3>
					<p>${noMatchMsg}</p>
				</div>
			`;
			return;
		}

		// =========================================================================
		// 🌐 DYNAMIC COUNTRY-WISE ACCORDION RENDERING ENGINE
		// Reads country metadata from registry and encapsulates sub-decks (2.1 & 2.2)
		// =========================================================================
		const countryName = this.#registryData.country || "India";
		const countryFlag = countryName.toLowerCase() === "india" ? "🇮🇳" : "🌐";
		const totalCardsCount = individualNetworks.length;
		const networksCountText = centerClass.t("pages.networks.stats.networksAvailable", { count: totalCardsCount });

		let subDecksHtml = "";

		// 🏙️ Sub-Section 2.1: City-wide Combined Networks (Integrated Regional Hubs)
		if (groupNetworks.length > 0) {
			const groupTitle = centerClass.t("pages.networks.sections.combined");
			subDecksHtml += `
				<section class="sub-network-deck">
					<div class="sub-deck-header">
						<h3><span class="ui-vector-icon icon-city-network" aria-hidden="true"></span> ${this.#escapeHTML(groupTitle)}</h3>
						<span class="sub-deck-badge">${groupNetworks.length} Hubs</span>
					</div>
					<div class="networks-compact-grid">
						${groupNetworks.map(item => this.#renderCompactCard(item)).join("")}
					</div>
				</section>
			`;
		}

		// 🚆 Sub-Section 2.2: Individual Transit Lines (Standalone Operator Corridors)
		if (individualNetworks.length > 0) {
			const indTitle = centerClass.t("pages.networks.sections.individual");
			subDecksHtml += `
				<section class="sub-network-deck">
					<div class="sub-deck-header">
						<h3><span class="ui-vector-icon icon-train-lines" aria-hidden="true"></span> ${this.#escapeHTML(indTitle)}</h3>
						<span class="sub-deck-badge">${individualNetworks.length} Networks</span>
					</div>
					<div class="networks-compact-grid">
						${individualNetworks.map(item => this.#renderCompactCard(item)).join("")}
					</div>
				</section>
			`;
		}

		// 📦 Build Country Accordion Card (Passenger Support Accordion Pattern)
		const countryCardHtml = `
			<article class="country-accordion-card" id="country-card-${this.#escapeHTML(countryName.toLowerCase())}">
				<!-- Clickable Accordion Header -->
				<header class="country-accordion-header" role="button" aria-expanded="true" tabindex="0" title="Click to collapse / expand">
					<div class="country-header-left">
						<span class="country-flag-icon" aria-hidden="true">${countryFlag}</span>
						<div class="country-header-titles">
							<h2>${this.#escapeHTML(countryName.toUpperCase())} TRANSIT DIRECTORY</h2>
							<span class="country-networks-count">${this.#escapeHTML(networksCountText)}</span>
						</div>
					</div>
					<span class="country-accordion-chevron" aria-hidden="true"></span>
				</header>
				
				<!-- Expandable / Collapsible Drawer -->
				<div class="country-accordion-drawer">
					${subDecksHtml}
				</div>
			</article>
		`;

		this.#dom.container.innerHTML = countryCardHtml;

		// 🎯 Bind Smooth Accordion Toggle & Full Keyboard Accessibility (Enter / Space)
		this.#dom.container.querySelectorAll(".country-accordion-header").forEach(header => {
			const toggleAccordion = () => {
				const card = header.closest(".country-accordion-card");
				if (card) {
					const isCollapsed = card.classList.toggle("collapsed");
					header.setAttribute("aria-expanded", String(!isCollapsed));
				}
			};

			header.addEventListener("click", toggleAccordion);
			header.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					toggleAccordion();
				}
			});
		});
	}

	#renderCompactCard(item) {
		const cityKey = this.#escapeHTML(item.cityKey);
		const cityName = this.#escapeHTML(item.cityName);
		const netKey = item.networkKey === "all" ? "" : this.#escapeHTML(item.networkKey);
		const netName = this.#escapeHTML(item.name || netKey);
		const operator = this.#escapeHTML(item.operator || "");
		const mode = item.mode || "Metro";
		const status = item.status || "operational";
		const website = item.website || null;
		const cityColor = item.themeColor || "var(--primary-color)";
		const netIcon = item.icon || null;
		// Dynamic Track Silhouette (Auto-generated by UI engine)
		const trackSvg = this.#resolveTrackSvg(item);
		

		const modeIcon = this.#getModeIcon(mode);
		const statusMeta = this.#getStatusMeta(status);

		// Mode label dynamic translation (e.g. Metro -> मेट्रो)
		const modeKey = (mode || "metro").toLowerCase();
		const modeLabel = centerClass.t("pages.networks.card.modes." + modeKey) || mode;

		// 1. Top-right Header: Solo Brand Logo ya Group Multi-Avatar Cluster
		let headRightContent = "";
		if (item.isGroupCard && Array.isArray(item.icons) && item.icons.length > 0) {
			const visibleIcons = item.icons.slice(0, 3);
			const remainingCount = item.icons.length > 3 ? item.icons.length - 3 : 0;
			headRightContent = `
				<div class="avatar-cluster">
					${visibleIcons.map(ic => `<img src="${this.#escapeHTML(ic)}" alt="">`).join("")}
					${remainingCount > 0 ? `<span class="cluster-count">+${remainingCount}</span>` : ""}
				</div>
			`;
		} else if (netIcon) {
			headRightContent = `
				<div class="brand-avatar-box">
					<img src="${this.#escapeHTML(netIcon)}" alt="${netName}" onerror="this.parentElement.style.display='none'">
				</div>
			`;
		}

		// 2. Track Silhouette HTML (Direct inline mask taaki HTML root se SVG 100% load ho)
		const trackHtml = trackSvg 
			? `<div class="card-trace-bg" style="-webkit-mask-image: url('${this.#escapeHTML(trackSvg)}'); mask-image: url('${this.#escapeHTML(trackSvg)}');"></div>` 
			: "";

		// 3. Footer Row Content: Group Card vs Single Card
		let footLeftContent = "";
		let footRightContent = "";

		if (item.isGroupCard) {
			const linesCount = item.icons ? item.icons.length : 3;
			const linkedText = linesCount === 1
				? centerClass.t("pages.networks.card.singleLineLinked")
				: centerClass.t("pages.networks.card.linesLinked", { count: linesCount });
			footLeftContent = `<span class="linked-lines-badge">${linkedText}</span>`;
			footRightContent = `
				<div class="action-group">
					<span class="action-arrow">➔</span>
				</div>
			`;
		} else {
			footLeftContent = `
				<div class="foot-meta-group">
					<span class="mode-tag">${modeIcon}${this.#escapeHTML(modeLabel)}</span>
					<span class="meta-sep">•</span>
					<span class="status-tag ${statusMeta.cssClass}"><span class="live-status-dot"></span> ${statusMeta.label}</span>
				</div>
			`;
			const websiteTitle = centerClass.t("pages.networks.card.officialWebsite");
			// Globe Link:
			footRightContent = `
				<div class="action-group">
					${website ? `<a href="${this.#escapeHTML(website)}" target="_blank" rel="noopener noreferrer" class="official-website-link" title="${websiteTitle}" aria-label="${websiteTitle}" onclick="event.stopPropagation()"><span class="ui-vector-icon icon-globe"></span></a>` : ""}
					<span class="action-arrow">➔</span>
				</div>
			`;
		}

		const regionSuffix = item.isGroupCard ? centerClass.t("pages.networks.card.regionSuffix") : "";

		return `
			<article class="network-card-compact" style="--card-city-accent: ${cityColor};" data-city="${cityKey}" data-network="${netKey}" data-status="${this.#escapeHTML(status)}" data-name="${netName}" tabindex="0" role="button" aria-label="Open ${netName} map">
				<!-- Metro Route Trace Silhouette (Zero hardcoding) -->
				${trackHtml}

				<!-- Top Head: City Stamp + Brand Logo / Cluster -->
				<div class="card-top-head">
					<span class="city-stamp"><span class="ui-vector-icon icon-leaf"></span>${cityName}${regionSuffix}</span>
					${headRightContent}
				</div>

				<!-- Content: Network Title + Operator Subtitle -->
				<div class="card-body">
					<h3 class="network-title">${netName}</h3>
					${operator ? `<p class="operator-sub">${operator}</p>` : ""}
				</div>

				<!-- Footer Row -->
				<div class="card-foot">
					${footLeftContent}
					${footRightContent}
				</div>
			</article>
		`;
	}

	#handleNetworkSelect(cityKey, networkKey, status, netName) {
		if (!cityKey) return;

		const displayName = netName || networkKey || cityKey;

		// 1. Status Blockers Lookup Dictionary
		const STATUS_BLOCKERS = {
			under_construction: { type: "warning", key: "underConstruction" },
			proposed:{ type: "info",key: "proposed" },
			approved:{ type: "info",key: "proposed" }
		};

		const blocker = STATUS_BLOCKERS[status];
		if (blocker) {
			const title = centerClass.t(`pages.networks.toast.${blocker.key}Title`);
			const message = centerClass.t(`pages.networks.toast.${blocker.key}Msg`, { name: displayName });
			Toast[blocker.type](message, { title });
			return;
		}

		// 2. Data Availability Check (City & Network Level)
		const cityData = this.#registryData?.cities?.[cityKey];
		if (!cityData?.hasData) {
			const title = centerClass.t("pages.networks.toast.dataPendingTitle");
			const message = centerClass.t("pages.networks.toast.dataPendingMsg", { name: displayName });
			Toast.info(message, { title });
			return;
		}

		if (networkKey && networkKey !== "all") {
			const networkData = cityData?.networks?.[networkKey];
			if (!networkData?.hasData) {
				const title = centerClass.t("pages.networks.toast.dataPendingTitle");
				const message = centerClass.t("pages.networks.toast.dataPendingMsg", { name: displayName });
				Toast.info(message, { title });
				return;
			}
		}

		// 3. Success: Persist & Redirect
		try {
			localStorage.setItem("active_city", cityKey);
			localStorage.setItem("active_network", networkKey || "");
		} catch (e) {
			console.warn("[TransitNetworkSelector] LocalStorage write failed:", e);
		}

		const targetUrl = `index.html?city=${encodeURIComponent(cityKey)}${networkKey ? `&network=${encodeURIComponent(networkKey)}` : ''}`;
		window.location.href = targetUrl;
	}

	#getStatusMeta(status) {
		const STATUS_MAP = {
			operational:{ key: "operational",fallback: "Operational",css: "status-operational" },
			operational_partial:{ key: "partial",fallback: "Partial Service",css: "status-operational_partial" },
			under_construction:{ key: "underConstruction",fallback: "Under Construction",css: "status-under_construction" },
			approved: { key: "approved",fallback: "Approved",css: "status-approved" },
			proposed: { key: "proposed",fallback: "Proposed",css: "status-proposed" }
		};

		const meta = STATUS_MAP[status] || STATUS_MAP.proposed;
		return {
			label: centerClass.t(`pages.networks.card.status.${meta.key}`) || meta.fallback,
			cssClass: meta.css
		};
	}

	#getModeIcon(mode) {
		const MODE_ICON_MAP = {
			metro: "icon-metro",
			rrts:"icon-rrts",
			monorail:"icon-monorail",
			metrolite: "icon-metrolite",
			metroneo:"icon-metroneo"
		};

		const iconClass = MODE_ICON_MAP[(mode || "").toLowerCase()] || "icon-metro";
		return `<span class="ui-vector-icon ${iconClass}"></span>`;
	}

	#renderErrorState(message) {
		if (!this.#dom.container) return;
		this.#dom.container.innerHTML = `
			<div class="empty-state empty-state-error">
				<span class="empty-state-icon">⚠️</span>
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