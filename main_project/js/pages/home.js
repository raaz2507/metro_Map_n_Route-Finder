/**
 * 🖥️ HomePageController - Clean UI View Controller
 * Enterprise ES2022 OOP Class with Component Delegation
 */
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { FloatingNav } from "../components/floating-nav.js";
import { SettingsView } from "../components/SettingsView.js";
import { centerClass } from "../core/CenterClass.js";
import { appStateStore } from "../core/app-state-store.js";
import { eventBus } from "../core/event-bus.js";
import i18n from "../core/i18n.js";
import { Toast } from "../components/Toast.js";

import { ShareModalComponent } from "../components/share-modal.js";
import { JourneyDetailsView } from "../components/JourneyDetailsView.js";
import { RecentSearchesView } from "../components/RecentSearchesView.js";
import { StationCalloutView } from "../components/StationCalloutView.js";
import { AlarmBannerView } from "../components/AlarmBannerView.js";
import { SpeedometerWidget } from "../components/WidgetSpeedometer.js";
import { TelemetryWidget } from "../components/WidgetTelemetry.js";
import { PwaManager } from '../core/PwaManager.js';



document.addEventListener("DOMContentLoaded", async () => {

	// PWA मैनेजर इनिशियलाइज़ करें
	const pwaManager = new PwaManager();
	pwaManager.init();

    await HeaderComponent.render('home');
    FooterComponent.render();
    new HomePageController();
	const settingsView = new SettingsView();
	settingsView.init();
	const alarmBannerView = new AlarmBannerView();
	alarmBannerView.init();
	const speedometerWidget = new SpeedometerWidget();
	speedometerWidget.init();
	const telemetryWidget = new TelemetryWidget();
	telemetryWidget.init();
});
class HomePageController {
	#elemts = {};
	#settings = { currentTheme: "light", currentLang: "en" };
	#mapObj = null;
	#currentRouteInfo = null;
	// Sub-components
	#shareModalComponent = null;
	#journeyDetailsView = null;
	#recentSearchesView = null;
	#stationCalloutView = null;
	// Lifecycle
	#abortController = null;
	#unsubscribeStore = null;
	constructor() {
		this.#abortController = new AbortController();
		this.#get_element();
		this.#init();
		this.#set_events();
	}
	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		if (typeof this.#unsubscribeStore === "function") {
			this.#unsubscribeStore();
			this.#unsubscribeStore = null;
		}
		if (this.#mapObj?.destroy) this.#mapObj.destroy();
		if (this.#recentSearchesView?.destroy) this.#recentSearchesView.destroy();
		if (this.#shareModalComponent?.destroy) this.#shareModalComponent.destroy();
		if (this.#stationCalloutView?.destroy) this.#stationCalloutView.destroy();
	}
	#get_element() {
		const elemtMap = {
			startStation: "#startStation",
			endStation: "#endStation",
			startStationDropdown: "#startStation-dropdown",
			endStationDropdown: "#endStation-dropdown",
			swapButton: "#swapButton",
			shareRouteBtn: "#shareRouteBtn",
		};
		for (const [key, selector] of Object.entries(elemtMap)) {
			const element = document.querySelector(selector);
			if (element) this.#elemts[key] = element;
		}
	}
		/**
	 * 🚀 Main Initialization
	 */
	async #init() {
		try {
			this.#settings.currentLang = appStateStore.getState("currentLang");
			this.#settings.currentTheme = appStateStore.getState("currentTheme");
			
			await centerClass.init();

			this.#autoFillLastSearch();
			this.#initUIComponents();
			this.#initAutocomplete();

			this.#recentSearchesView.render(this.#settings.currentLang);
			this.#handleUrlParams();

			// 🔗 Native Android Deep Link Listener
			this.#initDeepLinkListener();
		} catch (error) {
			console.error("[Dashboard] Initialization failed:", error);
		}
	}

	/**
	 * 🎯 SMART AUTO-FILL: Network-Aware Last Search Pre-filling
	 */
	#autoFillLastSearch() {
		const recentSearches = centerClass.getRecentSearches();
		if (recentSearches && recentSearches.length > 0) {
			const lastSearch = recentSearches[0];
			if (this.#elemts.startStation) {
				this.#elemts.startStation.value = centerClass.getStationName(lastSearch.fromId, this.#settings.currentLang);
			}
			if (this.#elemts.endStation) {
				this.#elemts.endStation.value = centerClass.getStationName(lastSearch.toId, this.#settings.currentLang);
			}
		}
	}

	/**
	 * 🧩 UI Components Setup
	 */
	#initUIComponents() {
		this.#mapObj = centerClass.getMapEngine({ 
			containerSelector: ".mapContainer",
			lang: this.#settings.currentLang,
			theme: this.#settings.currentTheme
		});

		this.#journeyDetailsView = new JourneyDetailsView("#journeyDetails .route-overview", this.#mapObj);
		
		this.#recentSearchesView = new RecentSearchesView({
			onSelectRoute: (from, to) => {
				if (this.#elemts.startStation) this.#elemts.startStation.value = from;
				if (this.#elemts.endStation) this.#elemts.endStation.value = to;
				const routeFinderTab = document.querySelector('.sidebar-link[data-target="route-finder"]');
				if (routeFinderTab) routeFinderTab.click();
				document.querySelector(".routeFinder")?.requestSubmit();
			}
		});

		this.#stationCalloutView = new StationCalloutView({
			containerSelector: ".mapContainer",
			lang: this.#settings.currentLang,
			getActiveRoute: () => this.#currentRouteInfo,
			onRouteConfirm: (startName, endName) => {
				if (this.#elemts.startStation) this.#elemts.startStation.value = startName;
				if (this.#elemts.endStation) this.#elemts.endStation.value = endName;
				this.#executeRouteSearch(startName, endName);
			}
		});

		this.#shareModalComponent = new ShareModalComponent();
		new FloatingNav();
	}

	/**
	 * 🔌 Search & Autocomplete Binding
	 */
	#initAutocomplete() {
		const stationSearchEngine = centerClass.getStationSearchEngine();
		if (!stationSearchEngine) return;

		stationSearchEngine.bindUI({
			inputEl: this.#elemts.startStation,
			dropdownEl: this.#elemts.startStationDropdown,
			onSelect: (station) => {
				this.#elemts.startStation.value = centerClass.getStationName(station.id, this.#settings.currentLang);
				this.#elemts.startStation.focus();
			}
		});

		stationSearchEngine.bindUI({
			inputEl: this.#elemts.endStation,
			dropdownEl: this.#elemts.endStationDropdown,
			onSelect: (station) => {
				this.#elemts.endStation.value = centerClass.getStationName(station.id, this.#settings.currentLang);
				this.#elemts.endStation.focus();
			}
		});
	}
	#set_events() {
		const signal = this.#abortController.signal;
		this.#initSwapButton(signal);
		this.#routeFinder_event(signal);
		this.#sidebarNav_event(signal);
		eventBus.on("STATION_CLICKED", ({ stationId, x, y }) => {
			this.#stationCalloutView.show(stationId, x, y);
		});
		eventBus.on("ROUTE_CLEARED", () => {
			this.#stationCalloutView.hide();
			this.#stationCalloutView.resetDraft();
			centerClass.clearRoutePins();
		});
		this.#unsubscribeStore = appStateStore.subscribe("currentLang", (newLang) => {
			this.#settings.currentLang = newLang;
			if (this.#mapObj) this.#mapObj.setLanguage = newLang;
			if (this.#recentSearchesView) this.#recentSearchesView.render(newLang);
			if (this.#stationCalloutView) this.#stationCalloutView.setLanguage(newLang);
			if (this.#currentRouteInfo && this.#journeyDetailsView) {
				this.#journeyDetailsView.render(this.#currentRouteInfo, newLang);
			}
		});
	}
	#initSwapButton(signal) {
		if (this.#elemts.swapButton) {
			this.#elemts.swapButton.addEventListener("click", () => {
				const temp = this.#elemts.startStation.value;
				this.#elemts.startStation.value = this.#elemts.endStation.value;
				this.#elemts.endStation.value = temp;
			}, { signal });
		}
	}
	#executeRouteSearch(startVal, endVal) {
		const routeTypeRadio = document.querySelector('input[name="routeType"]:checked');
		const routeType = routeTypeRadio?.value === "fastest" ? "shortestDistance" : "leastTransfers";
		const routeInfo = centerClass.searchRoute(startVal, endVal, { routeType });
		if (!routeInfo) {
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.sidebar.findroute.noRouteFound"),
				type: "error"
			});
			return;
		}
		this.#currentRouteInfo = routeInfo;
		appStateStore.setState({ activeRoute: routeInfo });
		this.#journeyDetailsView.render(routeInfo, this.#settings.currentLang);
		centerClass.highlightRoute(routeInfo.path, { customZoom: 2.2 });
		this.#recentSearchesView.render(this.#settings.currentLang);
	}
	#routeFinder_event(signal) {
		const form = document.querySelector(".routeFinder");
		if (!form) return;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const startVal = this.#elemts.startStation?.value?.trim();
			const endVal = this.#elemts.endStation?.value?.trim();
			if (!startVal || !endVal) {
				eventBus.emit("SHOW_TOAST", {
					message: i18n.t("pages.home.routeFinder.enterBothStations"),
					type: "warning"
				});
				return;
			}
			this.#executeRouteSearch(startVal, endVal);
		}, { signal });
		document.querySelectorAll('input[name="routeType"]').forEach((radio) => {
			radio.addEventListener("change", () => form.requestSubmit(), { signal });
		});
		form.addEventListener("reset", () => {
			this.#currentRouteInfo = null;
			this.#journeyDetailsView.clear();
			centerClass.clearMapHighlight();
			this.#stationCalloutView?.hide();
			this.#stationCalloutView?.resetDraft();
			centerClass.clearRoutePins();
		}, { signal });
		if (this.#elemts.shareRouteBtn) {
			this.#elemts.shareRouteBtn.addEventListener("click", () => this.#handleShareRoute(), { signal });
		}
	}
	#handleShareRoute() {
		if (!this.#currentRouteInfo?.path?.length) {
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.shareModal.noRouteToast") || "Please find a route first to share.",
				type: "warning"
			});
			return;
		}
		this.#shareModalComponent?.shareRoute(this.#currentRouteInfo, this.#settings.currentLang);
	}
	#handleUrlParams(customParams = null) {
		const urlParams = customParams || new URLSearchParams(window.location.search);
		const fromId = urlParams.get("from");
		const toId = urlParams.get("to") || urlParams.get("station");
		const priority = urlParams.get("priority");
		if (!fromId && !toId) return;
		const startStationObj = fromId ? centerClass.getStationDetails(fromId) : null;
		const endStationObj = toId ? centerClass.getStationDetails(toId) : null;
		if (!fromId && endStationObj) {
			if (this.#elemts.endStation) {
				this.#elemts.endStation.value = centerClass.getStationName(toId, this.#settings.currentLang);
			}
			if (this.#mapObj) this.#mapObj.highlightStation(toId, true);
			setTimeout(() => {
				const routeFinderTab = document.querySelector('.sidebar-link[data-target="route-finder"]');
				if (routeFinderTab) routeFinderTab.click();
				if (this.#elemts.startStation) this.#elemts.startStation.focus();
			}, 150);
			return;
		}
		if (startStationObj && endStationObj) {
			if (this.#elemts.startStation) {
				this.#elemts.startStation.value = centerClass.getStationName(fromId, this.#settings.currentLang);
			}
			if (this.#elemts.endStation) {
				this.#elemts.endStation.value = centerClass.getStationName(toId, this.#settings.currentLang);
			}
			if (priority) {
				const priorityRadio = document.querySelector(`input[name="routeType"][value="${priority}"]`);
				if (priorityRadio) priorityRadio.checked = true;
			}
			const form = document.querySelector(".routeFinder");
			if (form) {
				setTimeout(() => {
					const routeFinderTab = document.querySelector('.sidebar-link[data-target="route-finder"]');
					if (routeFinderTab) routeFinderTab.click();
					form.requestSubmit();
					const routeSection = document.getElementById("route-finder");
					if (routeSection) routeSection.scrollIntoView({ behavior: "smooth" });
				}, 150);
			}
		}
	}


	#initDeepLinkListener() {
		if (window.Capacitor && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins?.App) {
			const App = window.Capacitor.Plugins.App;

			// 1. Cold Start (App band thi aur user ne link par click kiya)
			App.getLaunchUrl().then(ret => {
				if (ret?.url) {
					this.#processIncomingUrl(ret.url);
				}
			}).catch(() => {});

			// 2. Warm Start (App background me thi aur user ne link click kiya)
			App.addListener('appUrlOpen', (data) => {
				console.log('[DeepLink] App opened with URL:', data.url);
				if (data?.url) {
					this.#processIncomingUrl(data.url);
				}
			});
		}
	}

	#processIncomingUrl(rawUrl) {
		try {
			let urlObj;
			if (rawUrl.startsWith('metroapp://')) {
				urlObj = new URL(rawUrl.replace('metroapp://', 'https://dummy.app/'));
			} else {
				urlObj = new URL(rawUrl);
			}
			this.#handleUrlParams(urlObj.searchParams);
		} catch (e) {
			console.warn('[DeepLink] Failed to parse URL:', e);
		}
	}
	
	#sidebarNav_event(signal) {
		const sidebarLinks = document.querySelectorAll(".sidebar-link");
		const sections = document.querySelectorAll(".sidebar-section");
		const showTargetSection = (targetId) => {
			sections.forEach((section) => {
				if (section.id === targetId) section.classList.add("active");
				else section.classList.remove("active");
			});
		};
		const initialActiveLink = document.querySelector(".sidebar-link.active");
		if (initialActiveLink) {
			showTargetSection(initialActiveLink.getAttribute("data-target"));
		}
		sidebarLinks.forEach((link) => {
			link.addEventListener("click", () => {
				sidebarLinks.forEach((l) => {
					l.classList.remove("active");
					l.setAttribute("aria-selected", "false");
				});
				link.classList.add("active");
				link.setAttribute("aria-selected", "true");
				showTargetSection(link.getAttribute("data-target"));
			}, { signal });
		});
		const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
		if (sidebarCloseBtn) {
			sidebarCloseBtn.addEventListener("click", () => {
				sections.forEach((s) => s.classList.remove("active"));
				sidebarLinks.forEach((l) => {
					const isMapLink = l.getAttribute("data-target") === "none";
					if (isMapLink) {
						l.classList.add("active");
						l.setAttribute("aria-selected", "true");
					} else {
						l.classList.remove("active");
						l.setAttribute("aria-selected", "false");
					}
				});
			}, { signal });
		}
	}
}