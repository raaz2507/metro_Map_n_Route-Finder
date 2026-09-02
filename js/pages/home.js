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

import { ShareModalComponent } from "../components/share-modal.js";
import { JourneyDetailsView } from "../components/JourneyDetailsView.js";
import { RecentSearchesView } from "../components/RecentSearchesView.js";
import { AlarmBannerView } from "../components/AlarmBannerView.js";
import { Toast } from "../components/Toast.js";
import { SpeedometerWidget } from "../components/WidgetSpeedometer.js";
import { TelemetryWidget } from "../components/WidgetTelemetry.js";

document.addEventListener("DOMContentLoaded", async () => {
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
	// Private UI Elements Cache
	#elemts = {};
	#settings = { currentTheme: "light", currentLang: "en" };
	#mapObj = null;
	#currentRouteInfo = null;

	// Sub-components
	#shareModalComponent = null;
	#journeyDetailsView = null;
	#recentSearchesView = null;

	// Lifecycle & Memory Management
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
		if (this.#mapObj && typeof this.#mapObj.destroy === "function") {
			this.#mapObj.destroy();
		}
		if (this.#recentSearchesView && typeof this.#recentSearchesView.destroy === "function") {
			this.#recentSearchesView.destroy();
		}
		if (this.#shareModalComponent && typeof this.#shareModalComponent.destroy === "function") {
			this.#shareModalComponent.destroy();
		}
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

	async #init() {
		try {
			this.#settings.currentLang = appStateStore.getState("currentLang");
			this.#settings.currentTheme = appStateStore.getState("currentTheme");

			await centerClass.init();

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
			this.#shareModalComponent = new ShareModalComponent();
			new FloatingNav();

			// 🔌 PLUG-AND-PLAY STATION AUTOCOMPLETE (Zero Boilerplate)
			const stationSearchEngine = centerClass.getStationSearchEngine();
			if (stationSearchEngine) {
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

			this.#recentSearchesView.render(this.#settings.currentLang);
			this.#handleUrlParams();


		} catch (error) {
			console.error("[Dashboard] Initialization failed:", error);
		}
	}

	#set_events() {
		const signal = this.#abortController.signal;

		this.#initSwapButton(signal);
		this.#routeFinder_event(signal);
		this.#sidebarNav_event(signal);

		// AppStateStore को सब्सक्राइब करें और अनसब्सक्राइबर को सेव करें
		this.#unsubscribeStore = appStateStore.subscribe("currentLang", (newLang) => {
			this.#settings.currentLang = newLang;
			if (this.#mapObj) {
				this.#mapObj.setLanguage = newLang;
			}
			if (this.#recentSearchesView) {
				this.#recentSearchesView.render(newLang);
			}
	
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
	#routeFinder_event(signal) {
		const form = document.querySelector(".routeFinder");
		if (!form) return;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const startVal = this.#elemts.startStation?.value?.trim();
			const endVal = this.#elemts.endStation?.value?.trim();
			const routeTypeRadio = document.querySelector('input[name="routeType"]:checked');
			const routeType = routeTypeRadio?.value === "fastest" ? "shortestDistance" : "leastTransfers";
			if (!startVal || !endVal) {
				alert(this.#settings.currentLang === "hi" ? "कृपया दोनों स्टेशनों के नाम दर्ज करें।" : "Please enter both stations.");
				return;
			}
			const routeInfo = centerClass.searchRoute(startVal, endVal, { routeType });
			if (!routeInfo) {
				alert(this.#settings.currentLang === "hi" ? "इन स्टेशनों के बीच कोई मार्ग नहीं मिला।" : "No route found between these stations.");
				return;
			}
			this.#currentRouteInfo = routeInfo;

			appStateStore.setState({ activeRoute: routeInfo });

			// 1. यात्रा विवरण UI रेंडर करें
			this.#journeyDetailsView.render(routeInfo, this.#settings.currentLang);
			// 2. 🗺️ मैप पर रूट को हाईलाइट व ऑटो-फ़ोकस ज़ूम करें
			centerClass.highlightRoute(routeInfo.path, { customZoom: 2.2 });
			// 3. हाल की खोजें दोबारा रेंडर करें
			this.#recentSearchesView.render(this.#settings.currentLang);
		}, { signal });
		// रेडियो बटन बदलने पर ऑटो-सबमिट
		document.querySelectorAll('input[name="routeType"]').forEach((radio) => {
			radio.addEventListener("change", () => form.requestSubmit(), { signal });
		});
		// फ़ॉर्म रीसेट
		form.addEventListener("reset", () => {
			this.#currentRouteInfo = null;
			this.#journeyDetailsView.clear();
			centerClass.clearMapHighlight();
		}, { signal });
		// 📤 शेयर रूट बटन
		if (this.#elemts.shareRouteBtn) {
			this.#elemts.shareRouteBtn.addEventListener("click", () => this.#handleShareRoute(), { signal });
		}
	}


	#handleShareRoute() {
		if (!this.#currentRouteInfo?.path?.length) {
			alert(this.#settings.currentLang === "hi" ? "कृपया शेयर करने से पहले एक रूट खोजें।" : "Please find a route first to share.");
			return;
		}
		this.#shareModalComponent?.shareRoute(this.#currentRouteInfo, this.#settings.currentLang);
	}


	#handleUrlParams() {
		const urlParams = new URLSearchParams(window.location.search);
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