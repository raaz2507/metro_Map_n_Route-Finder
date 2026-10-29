/**

 * 🏛️ TouristPlacesManager - Tourist Places & Metro Connectivity Controller

 * Enterprise ES2022 OOP Class with Private Encapsulation (#)

 * Features Dynamic Geo-Math Spatial Metro Resolution, Typo-Tolerant Search, and 100% Bilingual Parity.

 */

import { centerClass } from "../core/CenterClass.js";

import i18n from "../core/i18n.js";

import { HeaderComponent } from "../components/Header.js";

import { FooterComponent } from "../components/Footer.js";

import { appStateStore } from "../core/app-state-store.js";

import { eventBus } from "../core/event-bus.js";

import { BaseSearchEngine } from "../services/search/BaseSearchEngine.js";

import { batchResolveNearestStations } from "../services/geo/NearestStationResolver.js";

export class TouristPlacesManager {

	// Private State Fields

	#currentCity = "delhi_ncr";

	#lang = "en";

	#metroData = null;

	#coreTouristData = null;

	#localeTouristData = null;

	#enrichedPlaces = [];

	#filteredPlaces = [];

	// Active Filter State

	#selectedCategory = "all";

	#searchQuery = "";

	#activeSort = "nearest"; // 'nearest' | 'name_asc' | 'free_first'

	// Subsystems

	#searchEngine = new BaseSearchEngine();

	#unsubscribeLang = null;

	#unsubEventBus = null;

	#unsubDataUpdated = null;

	constructor() {

		this.#extractParams();

		this.#lang = localStorage.getItem('app-lang') || localStorage.getItem('language') || centerClass.currentLanguage || appStateStore.getState("currentLang") || "en";

	}

	destroy() {

		if (this.#unsubscribeLang) {

			this.#unsubscribeLang();

			this.#unsubscribeLang = null;

		}

		if (this.#unsubEventBus) {

			this.#unsubEventBus();

			this.#unsubEventBus = null;

		}

		if (this.#unsubDataUpdated) {

			this.#unsubDataUpdated();

			this.#unsubDataUpdated = null;

		}

	}

	#extractParams() {

		const urlParams = new URLSearchParams(window.location.search);

		this.#currentCity = urlParams.get("city") || localStorage.getItem("active_city") || "delhi_ncr";

	}

	/**

	 * Initializes Universal Header, Footer, and loads city & tourist data

	 */

	async init() {

		FooterComponent.render();

		await HeaderComponent.render("tourist");

		// 🛡️ Always sync active language after HeaderComponent / i18n initialization
		this.#lang = centerClass.currentLanguage || localStorage.getItem('app-lang') || localStorage.getItem('language') || appStateStore.getState("currentLang") || "en";

		try {

			// 1. Load city transit graph

			this.#metroData = await centerClass.loadCity(this.#currentCity);

			const stationsMap = this.#metroData?.stationData || {};

			const linesMap = this.#metroData?.lines || {};

			// 2. Load Core Technical Tourist Data

			const coreRes = await fetch(`data/india/cities/${this.#currentCity}/tourist_places.json`);

			if (!coreRes.ok) throw new Error(`Failed to load tourist data: ${coreRes.status}`);

			this.#coreTouristData = await coreRes.json();

			// 3. Load Active Locale Pack

			await this.#loadLocaleData(this.#lang);

			// 4. Run High-Speed Spatial Batch Resolver (O(N) in < 25ms for Top 3 Stations)

			this.#enrichedPlaces = batchResolveNearestStations(

				this.#coreTouristData.places || [],

				stationsMap,

				linesMap,

				{ topN: 3 }

			);

			// 5. Render Toolbar, Static Labels & Cards

			this.#initUIEvents();

			this.#updateUIForLocale();

			this.#renderCategoryChips();

			this.#applyFilterAndSort();

			// 6. Subscribe to global language & data changes for instant live switch

			const handleLangUpdate = async (newLang) => {

				const resolvedLang = newLang || centerClass.currentLanguage || localStorage.getItem('app-lang') || localStorage.getItem('language') || "en";

				if (this.#lang === resolvedLang && this.#localeTouristData?.lang === resolvedLang) {

					return;

				}

				this.#lang = resolvedLang;

				await this.#loadLocaleData(this.#lang);

				this.#updateUIForLocale();

				this.#renderCategoryChips();

				this.#applyFilterAndSort();

			};

			this.#unsubscribeLang = appStateStore.subscribe("currentLang", handleLangUpdate);

			this.#unsubEventBus = eventBus.on("app:language-changed", ({ lang }) => handleLangUpdate(lang));

			this.#unsubDataUpdated = eventBus.on("metro:data-updated", () => {

				this.#applyFilterAndSort();

			});

		} catch (error) {

			console.error("[TouristPlacesManager] Initialization error:", error);

			this.#renderErrorState();

		}

	}

	async #loadLocaleData(lang) {

		try {

			// 1. Get Global UI strings directly from master i18n hub (main_project/lang/{lang}/tourist.js)
			const globalDict = i18n.getDictionary() || {};
			const touristUI = globalDict?.pages?.tourist || {};

			// 2. Fetch City-Specific Tourist Places (Contains ONLY places data, 0 UI keys!)
			const placesRes = await fetch(`locales/${lang}/india/${this.#currentCity}_tourist_places_locale.json?v=${Date.now()}`);
			const placesData = placesRes.ok ? await placesRes.json() : {};

			this.#localeTouristData = {
				lang: lang || this.#lang || "en",
				city: placesData.city || this.#currentCity,
				categories: touristUI.categories || {},
				ui: touristUI.ui || {},
				hero: touristUI.hero || {},
				places: placesData.places || {}
			};

		} catch (e) {

			console.warn("[TouristPlacesManager] Locale fetch warning:", e);

			this.#localeTouristData = { categories: {}, ui: {}, places: {} };

		}

		this.#updateUIForLocale();

	}

	#updateUIForLocale() {

		const ui = this.#localeTouristData?.ui || {};
		const hero = this.#localeTouristData?.hero || {};

		// 0. Page Hero Header (Dynamically Localized per City)
		const heroBadge = document.getElementById("tourist-hero-badge");
		const heroTitle = document.getElementById("tourist-hero-title");
		const heroSubtitle = document.getElementById("tourist-hero-subtitle");

		const cityName = centerClass.getCityDisplayName(this.#currentCity, this.#lang) || 
			(this.#currentCity ? this.#currentCity.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "City");
		const count = this.#enrichedPlaces?.length || this.#coreTouristData?.places?.length || 0;

		let badgeText = hero.badge || ui.heroBadge || "{city} Exploration Hub";
		badgeText = badgeText.replace("{city}", cityName)
			.replace("दिल्ली एनसीआर", cityName)
			.replace("Delhi NCR", cityName);

		let subText = hero.subtitle || ui.heroSubtitle || "";
		if (subText) {
			subText = subText.replace("{city}", cityName)
				.replace("{count}", count > 0 ? `${count}` : "")
				.replace(/395\+?/g, count > 0 ? `${count}+` : "");
		}

		if (heroBadge) heroBadge.textContent = badgeText;
		if (heroTitle && (hero.title || ui.heroTitle)) heroTitle.textContent = hero.title || ui.heroTitle;
		if (heroSubtitle && subText) heroSubtitle.textContent = subText;

		// 1. Search Input Placeholder

		const searchInput = document.getElementById("tourist-search-input");

		if (searchInput && ui.searchPlaceholder) {

			searchInput.placeholder = ui.searchPlaceholder;

		}

		// 2. Drawer Title & Mobile FAB

		const drawerTitle = document.getElementById("tourist-drawer-title");

		if (drawerTitle && ui.searchAndFilter) {

			drawerTitle.innerHTML = `<i class="tourist-icon icon-search" aria-hidden="true"></i> ${this.#escapeHTML(ui.searchAndFilter || "Search & Filter")}`;

		}

		const fabText = document.getElementById("mobile-fab-text");

		if (fabText && ui.searchAndFilter) {

			fabText.textContent = ui.searchAndFilter;

		}

		// 3. Sort Label & Select Options

		const sortLabel = document.getElementById("tourist-sort-label");

		if (sortLabel && ui.sort) {

			sortLabel.textContent = ui.sort;

		}

		const sortSelect = document.getElementById("tourist-sort-select");

		if (sortSelect) {

			const optNearest = sortSelect.querySelector('option[value="nearest"]');

			const optName = sortSelect.querySelector('option[value="name_asc"]');

			const optFree = sortSelect.querySelector('option[value="free_first"]');

			if (optNearest && ui.sortNearest) optNearest.textContent = ui.sortNearest;

			if (optName && ui.sortName) optName.textContent = ui.sortName;

			if (optFree && ui.sortFree) optFree.textContent = ui.sortFree;

		}

		// 4. Empty State

		const emptyTitle = document.getElementById("tourist-empty-title");

		const emptyDesc = document.getElementById("tourist-empty-desc");

		const resetBtn = document.getElementById("tourist-reset-filter-btn");

		if (emptyTitle) emptyTitle.textContent = ui.noResults ? ui.noResults.replace('"{query}"', '').trim() : "No Places Found";

		if (emptyDesc) emptyDesc.textContent = ui.noResults || "No attractions match your search.";

		if (resetBtn && ui.resetFilter) resetBtn.textContent = ui.resetFilter;

	}

	#initUIEvents() {

		const searchInput = document.getElementById("tourist-search-input");

		const clearBtn = document.getElementById("tourist-clear-btn");

		const sortSelect = document.getElementById("tourist-sort-select");

		const resetFilterBtn = document.getElementById("tourist-reset-filter-btn");

		if (searchInput) {

			searchInput.addEventListener("input", (e) => {

				this.#searchQuery = (e.target.value || "").trim().toLowerCase();

				if (clearBtn) clearBtn.classList.toggle("hidden", this.#searchQuery.length === 0);

				this.#applyFilterAndSort();

			});

			searchInput.addEventListener("keydown", (e) => {

				if (e.key === "Escape") {

					searchInput.value = "";

					this.#searchQuery = "";

					if (clearBtn) clearBtn.classList.add("hidden");

					this.#applyFilterAndSort();

				}

			});

		}

		if (clearBtn) {

			clearBtn.addEventListener("click", () => {

				if (searchInput) {

					searchInput.value = "";

					searchInput.focus();

				}

				this.#searchQuery = "";

				clearBtn.classList.add("hidden");

				this.#applyFilterAndSort();

			});

		}

		if (sortSelect) {

			sortSelect.addEventListener("change", (e) => {

				this.#activeSort = e.target.value || "nearest";

				this.#applyFilterAndSort();

			});

		}

		if (resetFilterBtn) {

			resetFilterBtn.addEventListener("click", () => {

				this.#selectedCategory = "all";

				this.#searchQuery = "";

				if (searchInput) searchInput.value = "";

				if (clearBtn) clearBtn.classList.add("hidden");

				this.#renderCategoryChips();

				this.#applyFilterAndSort();

			});

		}

		// Mobile Search Drawer Toggle

		const mobileFab = document.getElementById("mobile-search-fab");

		const spotlightSection = document.getElementById("tourist-spotlight-section");

		const spotlightBackdrop = document.getElementById("tourist-spotlight-backdrop");

		const closeDrawerBtn = document.getElementById("mobile-spotlight-close-btn");

		const openDrawer = () => {

			if (spotlightSection) spotlightSection.classList.add("drawer-open");

			if (spotlightBackdrop) spotlightBackdrop.classList.add("active");

			document.body.style.overflow = "hidden";

			if (searchInput) setTimeout(() => searchInput.focus(), 250);

		};

		const closeDrawer = () => {

			if (spotlightSection) spotlightSection.classList.remove("drawer-open");

			if (spotlightBackdrop) spotlightBackdrop.classList.remove("active");

			document.body.style.overflow = "";

		};

		if (mobileFab) mobileFab.addEventListener("click", openDrawer);

		if (closeDrawerBtn) closeDrawerBtn.addEventListener("click", closeDrawer);

		if (spotlightBackdrop) spotlightBackdrop.addEventListener("click", closeDrawer);

	}

	#renderCategoryChips() {

		const container = document.getElementById("tourist-categories-container");

		if (!container) return;

		const categoriesDef = this.#localeTouristData?.categories || {

			all: "All Attractions",

			monument: "Monuments & Forts",

			religious: "Temples & Religious",

			park: "Parks & Nature",

			museum: "Museums & Science",

			market: "Markets & Bazaars",

			heritage: "Heritage Sites",

			entertainment: "Entertainment & Sports"

		};

		// Compute category counts

		const counts = { all: this.#enrichedPlaces.length };

		for (const p of this.#enrichedPlaces) {

			const c = p.category || "heritage";

			counts[c] = (counts[c] || 0) + 1;

		}

		const iconMap = {
			all: `<i class="tourist-icon icon-all" aria-hidden="true"></i>`,
			monument: `<i class="tourist-icon icon-monument" aria-hidden="true"></i>`,
			religious: `<i class="tourist-icon icon-religious" aria-hidden="true"></i>`,
			park: `<i class="tourist-icon icon-park" aria-hidden="true"></i>`,
			museum: `<i class="tourist-icon icon-museum" aria-hidden="true"></i>`,
			market: `<i class="tourist-icon icon-market" aria-hidden="true"></i>`,
			heritage: `<i class="tourist-icon icon-heritage" aria-hidden="true"></i>`,
			entertainment: `<i class="tourist-icon icon-entertainment" aria-hidden="true"></i>`
		};

		let html = "";

		for (const [key, label] of Object.entries(categoriesDef)) {

			const count = counts[key] || 0;

			const icon = iconMap[key] || `<i class="tourist-icon icon-maps" aria-hidden="true"></i>`;

			const isActive = this.#selectedCategory === key ? "active" : "";

			html += `

				<button type="button" class="category-chip ${isActive}" data-cat="${key}" role="tab" aria-selected="${this.#selectedCategory === key}">

					<span class="chip-icon">${icon}</span>

					<span class="chip-label">${this.#escapeHTML(label)}</span>

					<span class="chip-count">(${count})</span>

				</button>

			`;

		}

		container.innerHTML = html;

		// Bind delegated click

		container.querySelectorAll(".category-chip").forEach(btn => {

			btn.addEventListener("click", () => {

				this.#selectedCategory = btn.dataset.cat || "all";

				container.querySelectorAll(".category-chip").forEach(b => b.classList.remove("active"));

				btn.classList.add("active");

				this.#applyFilterAndSort();

			});

		});

	}

	#applyFilterAndSort() {

		const grid = document.getElementById("tourist-places-grid");

		const emptyState = document.getElementById("tourist-empty-state");

		const badge = document.getElementById("tourist-results-badge");

		if (!grid) return;

		const placesLocale = this.#localeTouristData?.places || {};

		// 1. Filter by category and search query

		let results = this.#enrichedPlaces.filter(place => {

			// Category filter

			if (this.#selectedCategory !== "all" && place.category !== this.#selectedCategory) {

				return false;

			}

			// Search query filter

			if (this.#searchQuery) {

				const loc = placesLocale[place.id] || {};

				const name = (loc.name || place.id).toLowerCase();

				const desc = (loc.description || "").toLowerCase();

				const tags = (place.tags || []).join(" ").toLowerCase();

				const searchable = `${name} ${desc} ${tags} ${place.category}`;

				const isSub = searchable.includes(this.#searchQuery);

				const isTypo = this.#searchEngine.hasTypoMatch(this.#searchQuery, loc.name || place.id);

				const isAcronym = this.#searchEngine.generateAcronym(loc.name || place.id) === this.#searchQuery;

				if (!isSub && !isTypo && !isAcronym) return false;

			}

			return true;

		});

		// 2. Sort results

		if (this.#activeSort === "nearest") {

			results.sort((a, b) => (a.nearestMetro?.distanceMeters || Infinity) - (b.nearestMetro?.distanceMeters || Infinity));

		} else if (this.#activeSort === "name_asc") {

			results.sort((a, b) => {

				const nameA = placesLocale[a.id]?.name || a.id;

				const nameB = placesLocale[b.id]?.name || b.id;

				return nameA.localeCompare(nameB);

			});

		} else if (this.#activeSort === "free_first") {

			results.sort((a, b) => {

				const freeA = a.entry_fee?.is_free ? 1 : 0;

				const freeB = b.entry_fee?.is_free ? 1 : 0;

				return freeB - freeA;

			});

		}

		this.#filteredPlaces = results;

		// 3. Update counter badge & mobile FAB count

		if (badge) {

			const countStr = this.#localeTouristData?.ui?.resultsCount 

				? this.#localeTouristData.ui.resultsCount.replace("{count}", results.length)

				: `${results.length} places`;

			badge.textContent = countStr;

		}

		const fabCount = document.getElementById("mobile-fab-count");

		if (fabCount) {

			fabCount.textContent = results.length;

		}

		// 4. Render Grid or Empty State

		if (results.length === 0) {

			grid.innerHTML = "";

			grid.classList.add("hidden");

			if (emptyState) emptyState.classList.remove("hidden");

		} else {

			if (emptyState) emptyState.classList.add("hidden");

			grid.classList.remove("hidden");

			grid.innerHTML = results.map(p => this.#renderCardHTML(p)).join("");

		}

	}

	#renderCardHTML(place) {

		const loc = this.#localeTouristData?.places?.[place.id] || {};

		const ui = this.#localeTouristData?.ui || {};

		const name = loc.name || place.id;

		const desc = (loc.description || "").trim();

		const catLabels = this.#localeTouristData?.categories || {};

		const catLabel = catLabels[place.category] || place.category;

		const iconMap = {
			monument: `<i class="tourist-icon icon-monument" aria-hidden="true"></i>`,
			religious: `<i class="tourist-icon icon-religious" aria-hidden="true"></i>`,
			park: `<i class="tourist-icon icon-park" aria-hidden="true"></i>`,
			museum: `<i class="tourist-icon icon-museum" aria-hidden="true"></i>`,
			market: `<i class="tourist-icon icon-market" aria-hidden="true"></i>`,
			heritage: `<i class="tourist-icon icon-heritage" aria-hidden="true"></i>`,
			entertainment: `<i class="tourist-icon icon-entertainment" aria-hidden="true"></i>`
		};

		const catIcon = iconMap[place.category] || `<i class="tourist-icon icon-maps" aria-hidden="true"></i>`;

		// 1. Media Banner: Authentic Real Photo if present, else Clean 2.5D Vector Art

		let mediaHTML = "";

		const resolvedImgUrl = this.#resolveImageUrl(place);

		if (resolvedImgUrl) {

			mediaHTML = `

				<div class="card-media-banner">

					<img src="${this.#escapeHTML(resolvedImgUrl)}" alt="${this.#escapeHTML(name)}" class="card-img" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />

					<div class="card-art-fallback cat-${this.#escapeHTML(place.category)}" style="display: none;">

						<span class="art-icon">${catIcon}</span>

						<span class="art-label">${this.#escapeHTML(catLabel)}</span>

					</div>

					<span class="category-badge-pill cat-${this.#escapeHTML(place.category)}" data-category="${this.#escapeHTML(place.category)}">${catIcon} ${this.#escapeHTML(catLabel)}</span>

				</div>

			`;

		} else {

			mediaHTML = `

				<div class="card-media-banner">

					<div class="card-art-fallback cat-${this.#escapeHTML(place.category)}">

						<span class="art-icon">${catIcon}</span>

						<span class="art-label">${this.#escapeHTML(catLabel)}</span>

					</div>

					<span class="category-badge-pill cat-${this.#escapeHTML(place.category)}" data-category="${this.#escapeHTML(place.category)}">${catIcon} ${this.#escapeHTML(catLabel)}</span>

				</div>

			`;

		}

		// 2. Metrics: Timings & Fee (with -- fallbacks as requested)

		let timingsStr = "-- : --";

		if (place.timings) {

			if (place.timings.all_day) {

				timingsStr = "24 Hours";

			} else if (place.timings.open && place.timings.close) {

				timingsStr = `${place.timings.open} - ${place.timings.close}`;

			}

		}

		let feeStr = "--";

		let isFree = false;

		if (place.entry_fee) {

			if (place.entry_fee.is_free) {

				feeStr = `${ui.freeEntry || "Free Entry"}`;

				isFree = true;

			} else if (place.entry_fee.amount > 0) {

				feeStr = `₹${place.entry_fee.amount}`;

			}

		}

		// 3. Top 3 Nearest Metro Stations List (Sorted by Distance with Route & Info Buttons)

		const stations = place.nearestStations || (place.nearestMetro ? [place.nearestMetro] : []);

		const stationsListHTML = stations.slice(0, 3).map((st, idx) => {

			const locStName = centerClass.getStationName(st.stationId) || st.stationName;

			const isClosest = idx === 0;

			const routeUrl = `index.html?city=${encodeURIComponent(this.#currentCity)}&to=${encodeURIComponent(st.stationId)}`;

			const infoUrl = `station_info.html?city=${encodeURIComponent(this.#currentCity)}&id=${encodeURIComponent(st.stationId)}`;

			const lineTitle = (st.lines || []).map(l => l.name).join(", ");

			return `

				<li class="nearest-station-item ${isClosest ? "closest-station" : ""}">

					<div class="station-meta-col">

						<span class="line-dot" style="background-color: ${st.primaryLineColor};" title="${this.#escapeHTML(lineTitle)}"></span>

						<span class="station-name-text" title="${this.#escapeHTML(locStName)}">${this.#escapeHTML(locStName)}</span>

						${isClosest ? `<span class="closest-badge"><i class="tourist-icon icon-star" aria-hidden="true"></i> ${this.#escapeHTML(ui.closest || "Nearest")}</span>` : ""}

					</div>

					<div class="station-actions-group">

						<div class="station-distance-info">

							<span class="metric-dist">${st.distanceFormatted}</span>

							<span class="metric-walk"><i class="tourist-icon icon-walk" aria-hidden="true"></i> ${st.walkingTimeMin}m</span>

						</div>

						<div class="station-btn-pair">

							<a href="${routeUrl}" class="station-quick-btn station-route-btn" title="${this.#escapeHTML(ui.planRoute || "Route")}">
								<i class="tourist-icon icon-metro" aria-hidden="true"></i>
							</a>

							<a href="${infoUrl}" class="station-quick-btn station-info-btn" title="${this.#escapeHTML(ui.viewStation || "Station Info")}">
								<i class="tourist-icon icon-info" aria-hidden="true"></i>
							</a>

						</div>

					</div>

				</li>

			`;

		}).join("");

		// 4. Place Actions: Google Maps & Bilingual Wikipedia

		const pLat = place.coordinates?.[0];

		const pLon = place.coordinates?.[1];

		const mapsUrl = place.google_maps_url || (pLat && pLon ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pLat)},${encodeURIComponent(pLon)}` : `https://maps.google.com/?q=${encodeURIComponent(name)}`);

		const wikiLang = this.#lang === "hi" ? "hi" : "en";

		const wikiUrl = place.wikipedia_url || `https://${wikiLang}.wikipedia.org/w/index.php?search=${encodeURIComponent(name)}`;

		return `

			<article class="tourist-card" data-id="${place.id}">

				${mediaHTML}

				<div class="card-content-body">

					<h3 class="card-title">${this.#escapeHTML(name)}</h3>

					<div class="card-place-actions">

						<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-action btn-maps" title="Open directions in Google Maps">

							<i class="tourist-icon icon-maps" aria-hidden="true"></i> <span>${this.#escapeHTML(ui.googleMaps || "Maps")}</span>

						</a>

						<a href="${wikiUrl}" target="_blank" rel="noopener noreferrer" class="btn-card-action btn-wikipedia" title="Read historical details on Wikipedia">

							<i class="tourist-icon icon-wiki" aria-hidden="true"></i> <span>${this.#escapeHTML(ui.wikipedia || "Wikipedia")}</span>

						</a>

					</div>

					${desc ? `<p class="card-desc">${this.#escapeHTML(desc)}</p>` : ""}

					<div class="card-metrics-row">

						<span class="metric-pill"><i class="tourist-icon icon-clock" aria-hidden="true"></i> ${this.#escapeHTML(timingsStr)}</span>

						<span class="metric-pill ${isFree ? "highlight" : ""}"><i class="tourist-icon ${isFree ? "icon-free" : "icon-ticket"}" aria-hidden="true"></i> ${this.#escapeHTML(feeStr)}</span>

					</div>

					<div class="card-nearest-stations-box">

						<div class="stations-box-header">

							<span class="box-icon"><i class="tourist-icon icon-metro" aria-hidden="true"></i></span>

							<span class="box-title">${this.#escapeHTML(ui.topNearestStations || ui.nearestMetro || "Nearest Metro Stations")}</span>

						</div>

						<ul class="nearest-stations-list" role="list">

							${stationsListHTML}

						</ul>

					</div>

				</div>

			</article>

		`;

	}

	#renderErrorState() {

		const grid = document.getElementById("tourist-places-grid");

		if (grid) {

			grid.innerHTML = `

				<div class="tourist-empty-state">

					<div class="empty-icon"><i class="tourist-icon icon-warning" aria-hidden="true"></i></div>

					<h3 class="empty-title">Failed to load tourist places</h3>

					<p class="empty-desc">Please check your network connection or try reloading the page.</p>

				</div>

			`;

		}

	}

	#resolveImageUrl(place) {

		const rawPath = place.image_path || place.image_url;

		if (!rawPath) return null;

		if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) return rawPath;

		const isCapacitorApp = typeof window !== 'undefined' && 

			((window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) ||

			window.location.protocol === 'capacitor:' ||

			(window.location.hostname === 'localhost' && !window.location.port));

		const isGitHubPages = typeof window !== 'undefined' && window.location.hostname.includes('github.io');

		if (isCapacitorApp || isGitHubPages) {

			const clean = rawPath.replace(/^\.\.\//, '');

			return `https://raw.githubusercontent.com/raaz2507/metro_Map_n_Route-Finder/main/${clean}`;

		}

		return rawPath.startsWith('../') ? rawPath : `../${rawPath}`;

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

// Auto-instantiate on DOM Ready

document.addEventListener("DOMContentLoaded", () => {

	const manager = new TouristPlacesManager();

	manager.init();

});

