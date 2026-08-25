import { metroDataStore } from "../core/metro-data-store.js";
import { eventBus } from "../core/event-bus.js";
import { MetroMap } from "../components/metro-map.js";
import { formatTime12h, getStationName, normalizeStationCoordinates } from "../core/data-utils.js";
import { RouteFinder } from "../services/route-finder.js";
import { TrainSpeedometer } from "../services/train-speedometer.js";

import { FloatingNav } from "../components/floating-nav.js";
import { ShareModalComponent } from "../components/share-modal.js";
import { RecentSearchService } from "../services/recent-search-service.js";


import i18n from "../core/i18n.js";

export class Dashboard {
	#elemts = {};
	#settings = { currentTheme: "light", currentLang: "en" };
	#metroData;
	#mapObj;
	#routeFinder;
	#activeSearchFilter = "recent";
    #currentRouteInfo = null;
    #speedometerObj;
	#recentSearchService;
	#shareModalComponent;

	constructor() {
		this.#get_element();
		this.#init();
		this.#set_events();
	}

	#get_element() {
		const elemtMap = {
			startStation: "#startStation",
			endStation: "#endStation",
			stationList: "#stationList",
			swapButton: "#swapButton",

            shareRouteBtn: "#shareRouteBtn",

            // Modal Elements
			shareModal: "#shareModal",
			closeShareModal: "#closeShareModal",
			shareWhatsAppBtn: "#shareWhatsAppBtn",
			shareTelegramBtn: "#shareTelegramBtn",
			shareSmsBtn: "#shareSmsBtn",
			copyShareUrlBtn: "#copyShareUrlBtn",
			copyShareTextBtn: "#copyShareTextBtn",
			shareToast: "#shareToast",
			
            // Preview Elements inside Modal
			sharePreviewFrom: "#sharePreviewFrom",
			sharePreviewTo: "#sharePreviewTo",
			sharePreviewDist: "#sharePreviewDist",
			sharePreviewTime: "#sharePreviewTime",
			sharePreviewFare: "#sharePreviewFare",


			language: "#language",

			theme: "#theme",

			recentSearchList: "#recent-search-list",
			clearRecentSearches: "#clearRecentSearches",
			recentSearchesHeading: "#recent-searches-heading",
		};
		for (const [key, selector] of Object.entries(elemtMap)) {
			const element = document.querySelector(selector);
			if (!element) {
				console.error(`Element not found for selector: ${selector}`);
				continue;
			}
			this.#elemts[key] = element;
		}
	}

	// =========================================================================
	// 3. CORE INITIALIZATION & DOM METHODS
	// =========================================================================
	async #init() {
		// 1. यदि किसी का decimal खाली हो तो उसे DMS/PlusCode से भरकर decimal को 100% पूरा करें
        this.#metroData = this.#metroData = metroDataStore.data;
        // 2. अब MetroMap इनिशियलाइज़ करें
        this.#mapObj = new MetroMap({ 
            mapContainerSelector: ".mapContainer", 
            metroData: this.#metroData,
            onClearRoute: () => {
				// मैप से हाइलाइट हटने पर भी साइडबार के जर्नी रिजल्ट को सुरक्षित रखें
			} 
        });
		// console.log(map);
        this.#speedometerObj = new TrainSpeedometer();
        this.#speedometerObj.bindSpeedElement("speed-value");

		// 4. RouteFinder इंजन इनिशियलाइज़ करें
		this.#routeFinder = new RouteFinder(this.#metroData);

		// i18n इनिशियलाइज़ करें और भाषा लोड होने का इंतज़ार करें
		await i18n.initI18n();

		this.#loadSettings();

		this.#mapObj.setLanguage = this.#settings.currentLang;
		this.#mapObj.setTheme = this.#settings.currentTheme;
		
		this.#recentSearchService = new RecentSearchService(this.#metroData);
		this.#stationListGenerator();
		this.#renderRecentSearches();
        this.#handleUrlParams();
		new FloatingNav();
		this.#shareModalComponent = new ShareModalComponent();
	}

	#loadSettings() {
		// 1. Theme लोड और अप्लाई करें (app-theme Key का प्रयोग)
		const savedTheme = localStorage.getItem("app-theme") || localStorage.getItem("metro-theme");
		if (savedTheme) {
			this.#settings.currentTheme = savedTheme;
		}
		document.body.setAttribute("data-theme", this.#settings.currentTheme);
		if (this.#elemts.theme) {
			this.#elemts.theme.value = this.#settings.currentTheme;
		}

		// 2. Language लोड और अप्लाई करें (app-lang Key का प्रयोग)
		const savedLang = localStorage.getItem("app-lang") || localStorage.getItem("language");
		if (savedLang) {
			this.#settings.currentLang = savedLang;
		}

		if (this.#elemts.language) {
			this.#elemts.language.value = this.#settings.currentLang;
		}
	}

	#set_events() {
		// ⚠️ नोट: थीम और लैंग्वेज के इवेंट्स अब सेंट्रली HeaderComponent (Header.js) द्वारा मैनेज होते हैं
		this.#station_input_event();
		this.#routeFinder_event();

		this.#sidebarNav_event();
		
		this.#recentSearches_event();
	}

	

	// =========================================================================
	// 4. methods for dashbord
	// =========================================================================

	#stationListGenerator() {
		const { stationList } = this.#elemts;
		for (const station of Object.values(this.#metroData.stationData)) {
			const option = document.createElement("option");
			option.value = station.name?.en || "";
			stationList.appendChild(option);
		}
	}

	#station_input_event() {
		const { startStation, endStation, swapButton } = this.#elemts;
		swapButton.addEventListener("click", () => {
			const temp = startStation.value;
			startStation.value = endStation.value;
			endStation.value = temp;
		});
	}


    #sidebarNav_event() {
		const sidebarLinks = document.querySelectorAll(".sidebar-link");
		const sections = document.querySelectorAll(".sidebar-section");

		const showTargetSection = (targetId) => {
			sections.forEach((section) => {
				if (section.id === targetId) {
					section.classList.add("active");
				} else {
					section.classList.remove("active");
				}
			});
		};

		// Run once on load to show initial active section
		const initialActiveLink = document.querySelector(".sidebar-link.active");
		if (initialActiveLink) {
			const targetId = initialActiveLink.getAttribute("data-target");
			showTargetSection(targetId);
		}

		sidebarLinks.forEach((link) => {
			link.addEventListener("click", () => {
				sidebarLinks.forEach((l) => {
					l.classList.remove("active");
					l.setAttribute("aria-selected", "false");
				});
				link.classList.add("active");
				link.setAttribute("aria-selected", "true");

				const targetId = link.getAttribute("data-target");
				showTargetSection(targetId);
			});
		});
        // Single Sidebar Close Button Event Handler
		const sidebarCloseBtn = document.getElementById("sidebarCloseBtn");
		if (sidebarCloseBtn) {
			sidebarCloseBtn.addEventListener("click", () => {
				// Hide all open sidebar sections
				sections.forEach((s) => s.classList.remove("active"));

				// Reset active tab on sidebar navigation links back to Map (data-target="none")
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
			});
		}
	}


	// 6. रूट खोजने और फ़ॉर्म इवेंट्स का मुख्य हैंडलर
	#routeFinder_event() {
		const form = document.querySelector(".routeFinder");
		if (!form) return;
		// फ़ॉर्म सबमिट होने पर (रूट खोजें)
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			const startVal = this.#elemts.startStation.value.trim();
			const endVal = this.#elemts.endStation.value.trim();
			// रेडियो बटन्स से रूट प्रेफरेंस चुनें
			const routeTypeRadio = document.querySelector(
				'input[name="routeType"]:checked',
			);
			const routeType = routeTypeRadio ? routeTypeRadio.value : "fastest";
			// UI 'fastest' को एल्गोरिदम के 'shortestDistance' से मैप करें
			const type =
				routeType === "fastest" ? "shortestDistance" : "leastTransfers";
			if (!startVal || !endVal) {
				alert(
					this.#settings.currentLang === "hi"
						? "कृपया दोनों स्टेशनों के नाम दर्ज करें।"
						: "Please enter both stations.",
				);
				return;
			}
			// रूट की खोज करें
			const routeInfo = this.#routeFinder.findRoute(startVal, endVal, type);
			if (!routeInfo) {
				alert(
					this.#settings.currentLang === "hi"
						? "इन स्टेशनों के बीच कोई मार्ग नहीं मिला।"
						: "No route found between these stations.",
				);
				return;
			}

            // वर्तमान रूट इन्फो स्टोर करें
			this.#currentRouteInfo = routeInfo;

			// 1. यात्रा विवरण UI को अपडेट करें
			this.#updateJourneyDetails(routeInfo);
			// 2. मैप पर रूट को विजुअली हाईलाइट करें
			if (this.#mapObj) {
				this.#mapObj.highlightRoute(routeInfo.path);
			}
			// 3. सफल सर्च को हाल की खोजों में सहेजें
			if (this.#recentSearchService) {
				this.#recentSearchService.saveSearch(startVal, endVal);
				this.#renderRecentSearches();
			}
		});

		// जब भी प्रायोरिटी स्लाइडर (Shortest / Less Interchange) बदला जाए, तुरंत दोबारा रूट कैलकुलेट करें
		const priorityRadios = document.querySelectorAll('input[name="routeType"]');
		priorityRadios.forEach((radio) => {
			radio.addEventListener("change", () => {
				// फ़ॉर्म को ऑटो-सबमिट करें ताकि यूज़र को तुरंत अपडेटेड रूट दिखे
				form.requestSubmit();
			});
		});
				// फ़ॉर्म रीसेट होने पर (कैलकुलेशंस और हाईलाइट्स हटाएँ)
		form.addEventListener("reset", () => {
            this.#currentRouteInfo = null; // वर्तमान रूट को साफ़ करें
			this.#resetJourneyDetails();
			if (this.#mapObj) {
				this.#mapObj.highlightRoute(null); // हाईलाइट हटाएं
			}
		});

				// 📤 साइडबार शेयर बटन क्लिक इवेंट लिसनर (सटीक डेटा मैपिंग के साथ)
		if (this.#elemts.shareRouteBtn) {
			this.#elemts.shareRouteBtn.addEventListener("click", () => {
				if (!this.#currentRouteInfo || !Array.isArray(this.#currentRouteInfo.path) || this.#currentRouteInfo.path.length === 0) {
					alert(this.#settings.currentLang === "hi" ? "कृपया शेयर करने से पहले एक रूट खोजें।" : "Please find a route first to share.");
					return;
				}

				const path = this.#currentRouteInfo.path;
				const startStationId = path[0];
				const endStationId = path[path.length - 1];

				const startName = startStationId ? this.#getStationLangName(startStationId) : "";
				const endName = endStationId ? this.#getStationLangName(endStationId) : "";

				const distMeters = this.#currentRouteInfo.totalDistance || 0;
				const distKm = typeof distMeters === "number"
					? (distMeters / 1000).toFixed(1)
					: parseFloat(distMeters || 0).toFixed(1);

				const totalMin = this.#currentRouteInfo.totalTime || 0;

				const fare = typeof this.#currentRouteInfo.totalFare === "object"
					? (this.#currentRouteInfo.totalFare.tokenFare || 0)
					: (this.#currentRouteInfo.totalFare || 0);

				const shareUrl = `${window.location.origin}${window.location.pathname}?from=${startStationId}&to=${endStationId}`;
				const shareText = `🚇 Metro Route: ${startName} → ${endName}\n⏱️ Time: ~${totalMin} min | 📏 Distance: ${distKm} km | 💰 Fare: ₹${fare}\n🔗 Details: ${shareUrl}`;

				this.#shareModalComponent?.share({
					startName,
					endName,
					distKm,
					totalMin,
					tokenFare: fare,
					shareUrl,
					shareText
				}, this.#settings.currentLang);
			});
		}
	}


	// 7. यात्रा विवरण और स्टेशन टाइमलाइन अपडेट करने का हेल्पर (मुख्य फ़ंक्शन)
	#updateJourneyDetails(routeInfo) {
		// 1. त्वरित आंकड़े (Quick Overview) भरें
		this.#updateQuickOverviewValues(routeInfo);

		// 2. पुराना रूट साफ़ करें
		const overviewSection = document.querySelector(
			"#journeyDetails .route-overview",
		);
		if (!overviewSection) return;
		overviewSection.innerHTML = "";

		const path = routeInfo.path;
		const totalSteps = path.length;
		if (totalSteps === 0) return;

		// 3. भाषा के अनुसार स्टार्ट/एंड स्टेशन का नाम
		const startName = this.#getStationLangName(path[0]);
		const endName = this.#getStationLangName(path[totalSteps - 1]);

		// 4. घटक (Components) रेंडर करें
		this.#renderWarningBanner(overviewSection);
		this.#renderJourneyHeader(overviewSection, startName, endName);
		this.#renderMetricsCard(overviewSection, routeInfo, totalSteps);
		this.#renderShowRouteButton(overviewSection);

		// 5. ग्रुप की हुई टाइमलाइन रेंडर करें
		const timelineCard = document.createElement("div");
		timelineCard.className = "timeline-card";

		const cardHeader = document.createElement("div");
		cardHeader.className = "timeline-card-header";
		
		// स्टेशनों की संख्या और समय को i18n द्वारा ट्रांसलेट करें
		const stationsText = i18n.t(totalSteps === 1 ? "pages.home.sidebar.findroute.route.station" : "pages.home.sidebar.findroute.route.stations", { count: totalSteps });
		const timeText = i18n.t("pages.home.sidebar.findroute.route.travelTime", { minutes: routeInfo.totalTime });
		cardHeader.textContent = `${stationsText} · ${timeText}`;
		
		timelineCard.appendChild(cardHeader);

		const { segmentLines, segments } = this.#routeFinder.getRouteSegments(path);

		this.#renderTimelineSegments(
			timelineCard,
			segments,
			segmentLines,
			totalSteps,
		);
		overviewSection.appendChild(timelineCard);

		// रूट मिलने पर journeyDetails को एक्टिव (विजिबल) करें
		const journeyDetails = document.getElementById("journeyDetails");
		if (journeyDetails) journeyDetails.classList.add("active");
	}

	// =========================================================================
	// HELPER METHODS FOR ROUTE OVERVIEW DETAILED RENDERING (UPDATED)
	// =========================================================================
	// Quick Stats UI (दूरी, किराया, समय, स्टेशन काउंट) अपडेट करने वाला हेल्पर
	#updateQuickOverviewValues(routeInfo) {
		const totalStation = document.querySelector(
			"#journeyDetails .total_station .value",
		);
		const timeVal = document.querySelector("#journeyDetails .time .value");
		const fareVal = document.querySelector( "#journeyDetails .fare_amount .value", );
		const interchangeVal = document.querySelector( "#journeyDetails .interchange_count .value", );
		const distanceVal = document.querySelector( "#journeyDetails .distance .value", );

		if (totalStation) totalStation.textContent = routeInfo.path.length;
		if (timeVal) timeVal.textContent = routeInfo.totalTime;
		if (interchangeVal) interchangeVal.textContent = routeInfo.interchanges;
		// 1. कुल दूरी मीटर में है, इसे UI पर दिखाने के लिए 1000 से भाग देकर किलोमीटर (km) में बदलें
		if (distanceVal) {
			const distKm = typeof routeInfo.totalDistance === "number"
				? (routeInfo.totalDistance / 1000).toFixed(2)
				: routeInfo.totalDistance;
			distanceVal.textContent = distKm;
		}
		// 2. किराया (Fare) ऑब्जेक्ट या नंबर हो सकता है (Token, Smart Card, Off-Peak)
		if (fareVal) {
			const displayFare = typeof routeInfo.totalFare === "object"
				? routeInfo.totalFare.tokenFare
				: routeInfo.totalFare;
			fareVal.textContent = displayFare;
		}
	}


	// स्टेशन का भाषा अनुसार नाम प्राप्त करने वाला हेल्पर
	#getStationLangName(stationId) {
		return getStationName(this.#metroData.stationData[stationId], this.#settings.currentLang);
	}

	// वार्निंग बैनर (Warning Banner) बनाने वाला हेल्पर
	#renderWarningBanner(parent) {
		const banner = document.createElement("div");
		banner.className = "warning-banner";
		banner.innerHTML = `
			<span class="warning-banner-icon">ⓘ</span>
			<span>${i18n.t("pages.home.sidebar.findroute.route.warning")}</span>
		`;
		parent.appendChild(banner);
	}

	// हेडर शीर्षक (Heading Title) बनाने वाला हेल्पर
	#renderJourneyHeader(parent, startName, endName) {
		const header = document.createElement("div");
		header.className = "journey-title-header";
		header.innerHTML = `
			<span class="from-station">${startName}</span>
			<span class="arrow">➔</span>
			<span class="to-station">${endName}</span>
		`;
		parent.appendChild(header);
	}
    

	// मुख्य आंकड़े वाला कार्ड (Colorful Metrics Card)
	#renderMetricsCard(parent, routeInfo, totalSteps) {
		const metricsCard = document.createElement("div");
		metricsCard.className = "journey-metrics-card";

		const timeLabel = i18n.t("pages.home.sidebar.findroute.route.minutesLabel") || "Minutes";
		const changeLabel = i18n.t("pages.home.sidebar.findroute.route.lineChangeLabel") || "Line Change";
		const stationsLabel = i18n.t("pages.home.sidebar.findroute.route.stationsLabel") || "Stations";
		const distanceLabel = "Distance";

		const firstText = i18n.t("route.first") || "First";
		const lastText = i18n.t("route.last") || "Last";

		const distNum = typeof routeInfo.totalDistance === "number"
			? (routeInfo.totalDistance / 1000).toFixed(1)
			: parseFloat(routeInfo.totalDistance || 0).toFixed(1);

		const fares = typeof routeInfo.totalFare === "object" ? routeInfo.totalFare : {
			tokenFare: routeInfo.totalFare ?? null,
			smartCardFare: routeInfo.totalFare ?? null,
			offPeakFare: routeInfo.totalFare ?? null,
			offPeakSmartFare: routeInfo.totalFare ?? null
		};

		const fmtFare = (val) => (val != null ? `₹${val}` : "N/A");

		// यात्रा के शुरुआती स्टेशन (Start Station) से train_schedule टाइमिंग्स प्राप्त करें
		const startStationId = routeInfo?.path?.[0];
		const startStation = startStationId ? this.#metroData.stationData?.[startStationId] : null;
		const schedule = startStation?.train_schedule;

		const firstTrainDisplay = schedule?.first_train ? formatTime12h(schedule.first_train) : "N/A";
		const lastTrainDisplay = schedule?.last_train ? formatTime12h(schedule.last_train) : "N/A";

		metricsCard.innerHTML = `
			<!-- Row 1: Distance | Minutes | Stations | Line Change -->
			<div class="metrics-row">
				<div class="metric-col">
					<span class="metric-val color-indigo">${distNum} <small style="font-weight:400; font-size:0.75em; opacity:0.8;">km</small></span>
					<span class="metric-lbl">${distanceLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-emerald">${routeInfo.totalTime}</span>
					<span class="metric-lbl">${timeLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-sky">${totalSteps}</span>
					<span class="metric-lbl">${stationsLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-amber">${routeInfo.interchanges}</span>
					<span class="metric-lbl">${changeLabel}</span>
				</div>
			</div>

			<!-- Row 2: Token Fare | Smart Card | Off-Peak | Smart Card Off-Peak -->
			<div class="metrics-row" style="margin-top: 14px; border-top: 1px dashed var(--border-color); padding-top: 12px;">
				<div class="metric-col">
					<span class="metric-val">${fmtFare(fares.tokenFare)}</span>
					<span class="metric-lbl">Token Fare</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-blue">${fmtFare(fares.smartCardFare)}</span>
					<span class="metric-lbl">Smart Card<br><span class="fare-badge badge-blue">(${fares.smartCardPct ?? 10}% Off)</span></span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-purple">${fmtFare(fares.offPeakFare)}</span>
					<span class="metric-lbl">Off-Peak<br><span class="fare-badge badge-purple">(${fares.offPeakPct ?? 10}% Off)</span></span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-green">${fmtFare(fares.offPeakSmartFare)}</span>
					<span class="metric-lbl">Off-Peak Smart<br><span class="fare-badge badge-green">(${fares.offPeakSmartPct ?? 20}% Off)</span></span>
				</div>
			</div>

			<div class="timing-subrow">
				<div class="timing-item">☀️ ${firstText} <strong>${firstTrainDisplay}</strong></div>
				<div class="timing-item">🌙 ${lastText} <strong>${lastTrainDisplay}</strong></div>
			</div>
		`;
		parent.appendChild(metricsCard);
	}

	// मैप पर मार्ग दिखाने वाला बटन (Show Route Map Button)
	#renderShowRouteButton(parent) {
		const showRouteBtn = document.createElement("button");
		showRouteBtn.className = "btn-show-route";
		showRouteBtn.innerHTML = `🗺️ ${i18n.t("route.showOnMap")}`;
		showRouteBtn.addEventListener("click", () => {
			// MetroMap के एन्कैप्सुलेटेड मेथड को कॉल करें जो स्क्रॉल और री-हाईलाइट दोनों संभालेगा
			if (this.#mapObj) {
				this.#mapObj.showRouteOnMap(this.#currentRouteInfo?.path);
			}
		});
		parent.appendChild(showRouteBtn);
	}


    // पूरी वर्टिकल टाइमलाइन रेंडर करने वाला हेल्पर
    #renderTimelineSegments(container, segments, segmentLines, totalSteps) {
		const timelineContainer = document.createElement("div");
		timelineContainer.className = "route-timeline";

		let globalStationIndex = 0;
		let cumulativeTime = 0;
		let animationRowCounter = 0;

		segments.forEach((segment, segmentIndex) => {
			const lineInfo = this.#metroData.lines?.[segment.lineId];
			const lineColor = lineInfo ? lineInfo.color : "#cbd5e1";
			const lang = this.#settings.currentLang;
			const fullLineName = lineInfo?.name?.[lang] || lineInfo?.name?.en || "";
			const lineName = fullLineName.split(" - ")[1] || fullLineName || `Line ${segment.lineId}`;

			const terminalId = this.#routeFinder.getTerminalStationId(segment.stations, segment.lineId);
 			const terminalName = terminalId ? this.#getStationLangName(terminalId) : "";
			
			// दिशा के टेक्स्ट को i18n द्वारा ट्रांसलेट करें
			const directionText = i18n.t("route.directionText", {
				terminal: terminalName.toUpperCase(),
				platform: (segmentIndex % 2) + 1
			});

			const segmentEl = document.createElement("div");
			segmentEl.className = "timeline-segment";

			const segHeader = document.createElement("div");
			segHeader.className = "segment-header";
			segHeader.style.setProperty("--delay", `${animationRowCounter * 120}ms`);

			const isYellowLike =
				segment.lineId === "2" ||
				segment.lineId === "4" ||
				lineColor.toLowerCase() === "#ffd514";
			const badgeTextColor = isYellowLike ? "#000000" : "#ffffff";

			segHeader.innerHTML = `
				<span class="line-badge-solid" style="background-color: ${lineColor}; color: ${badgeTextColor};">${lineName}</span>
				<span class="segment-direction">${directionText}</span>
			`;
			segmentEl.appendChild(segHeader);
			animationRowCounter++;

			segment.stations.forEach((stationId, idx) => {
				const overallPathIndex =
					segmentIndex === 0
						? idx
						: segments
								.slice(0, segmentIndex)
								.reduce((sum, s) => sum + s.stations.length - 1, 0) + idx;

				const isInterchange =
					overallPathIndex > 0 &&
					overallPathIndex < totalSteps - 1 &&
					segmentLines[overallPathIndex - 1] !== segmentLines[overallPathIndex];

				if (globalStationIndex > 0) {
					if (idx === 0) {
						cumulativeTime += 5; // लाइन बदलाव
					} else {
						cumulativeTime += 2; // स्टेशन हॉप
					}
				}
				globalStationIndex++;

				const name = this.#getStationLangName(stationId);
				const isFirstOverall = overallPathIndex === 0;
				const isLastOverall = overallPathIndex === totalSteps - 1;

				// गेट टेक्स्ट को ट्रांसलेट करें
				let gateBadgeHtml = "";
				if (isFirstOverall || isLastOverall) {
					gateBadgeHtml = `<span class="badge-gate">🚪 ${i18n.t("route.gate")}</span>`;
				}

				const dotTextColor = isYellowLike ? "#000000" : "#ffffff";

				const rowEl = document.createElement("div");
				rowEl.className = "station-row";
				rowEl.style.setProperty("--delay", `${animationRowCounter * 120}ms`);
				rowEl.style.setProperty("--line-color", lineColor);

				rowEl.innerHTML = `
					<div class="station-track">
						<div class="station-dot-solid" style="background-color: ${lineColor}; color: ${dotTextColor};">
							${overallPathIndex + 1}
						</div>
						<div class="station-track-line" style="background-color: ${lineColor};"></div>
					</div>
					<div class="station-info">
						<span class="station-name-main">
							${name}
							${gateBadgeHtml}
						</span>
						<span class="station-time-cumulative">~${cumulativeTime}m</span>
					</div>
				`;
				segmentEl.appendChild(rowEl);
				animationRowCounter++;
			});

			timelineContainer.appendChild(segmentEl);

			// इंटरचेंज बॉक्स लगाने का हिस्सा
			if (segmentIndex < segments.length - 1) {
                const nextSegment = segments[segmentIndex + 1];
                const interchangeStationId = segment.stations[segment.stations.length - 1];
                const interchangeStation = this.#metroData.stationData[interchangeStationId];
                const nextLineInfo = this.#metroData.lines?.[nextSegment.lineId];
                const nextFullLineName = nextLineInfo?.name?.[lang] || nextLineInfo?.name?.en || "";
                const nextLineName = nextFullLineName.split(" - ")[1] || nextFullLineName || `Line ${nextSegment.lineId}`;
                const nextTerminalId = this.#routeFinder.getTerminalStationId(nextSegment.stations, nextSegment.lineId);
             	const nextTerminal = nextTerminalId ? this.#getStationLangName(nextTerminalId) : "";

             	// प्लेटफॉर्म नंबर (RouteFinder service से lookup)
             	const platformNo = this.#routeFinder.getInterchangePlatformNumber(interchangeStation, nextSegment.lineId, nextTerminalId);

                // 2. इंटरचेंज समय (Seconds -> Minutes conversion with strict N/A fallback)
                let transferTimeText = "N/A";
                const nextStationInSegment = nextSegment.stations?.[1] || null;
                const transferData = this.#routeFinder?.getStationTransferData(interchangeStationId, nextStationInSegment);
                
                if (transferData && transferData.transferSeconds !== null && transferData.transferSeconds !== undefined) {
                    const mins = Math.ceil(transferData.transferSeconds / 60);
                    transferTimeText = `~${mins}m`;
                }

                const interchangeContainer = document.createElement("div");
                interchangeContainer.className = "interchange-container";
                interchangeContainer.style.setProperty("--delay", `${animationRowCounter * 120}ms`);
                interchangeContainer.innerHTML = `
                    <div class="interchange-track">
                        <div class="interchange-track-line" style="border-color: ${lineColor};"></div>
                    </div>
                    <div class="interchange-card">
                        <div class="interchange-content">
                            <span class="interchange-icon-walk">
                                <img src="assets/sprites/footstep.webp" class="interchange-icon-walk" alt="walk">
                            </span>
                            <span>
                                Change to <strong>${nextLineName}</strong> towards <strong>${nextTerminal.toUpperCase()}</strong> from <strong>Platform No. ${platformNo}</strong>
                            </span>
                        </div>
                        <span class="interchange-time-badge">${transferTimeText}</span>
                    </div>
                `;
                timelineContainer.appendChild(interchangeContainer);
                animationRowCounter++;
            }
		});

		container.appendChild(timelineContainer);
	}
	// 8. कैलकुलेशंस को वापस "00" पर सेट करने का हेल्पर
	#resetJourneyDetails() {
		const selectors = {
			totalStation: "#journeyDetails .total_station .value",
			timeVal: "#journeyDetails .time .value",
			fareVal: "#journeyDetails .fare_amount .value",
			interchangeVal: "#journeyDetails .interchange_count .value",
			distanceVal: "#journeyDetails .distance .value",
		};
		for (const selector of Object.values(selectors)) {
			const element = document.querySelector(selector);
			if (element) element.textContent = "00";
		}
		const overviewSection = document.querySelector(
			"#journeyDetails .route-overview",
		);
		if (overviewSection) overviewSection.innerHTML = "";
		// रीसेट करने पर journeyDetails को वापस छुपाएं
		const journeyDetails = document.getElementById("journeyDetails");
		if (journeyDetails) journeyDetails.classList.remove("active");
	}

	// =========================================================================
	// 9. RECENT SEARCHES & LOCALSTORAGE LOGIC (13 Records Limit & Localization)
	// =========================================================================

	

	// हाल की खोजों की सूची को रेंडर करने और ट्रांसलेट/सॉर्ट करने के लिए
	#renderRecentSearches() {
		const { recentSearchList, clearRecentSearches } = this.#elemts;
		const lang = this.#settings.currentLang || "en";

		if (!recentSearchList) return;

		const searches = this.#recentSearchService ? this.#recentSearchService.getSearches() : [];

		// खाली स्थिति (Empty State)
		if (searches.length === 0) {
			recentSearchList.innerHTML = `
				<li class="recent-list-empty">
					${i18n.t("pages.home.sidebar.recent.noRecentJourney") || i18n.t("home.noRecentJourney")}
				</li>
			`;
			if (clearRecentSearches) {
				clearRecentSearches.style.display = "none";
			}
		} else {
			if (clearRecentSearches) {
				clearRecentSearches.style.display = "block";
			}

			// डिस्प्ले डेटा तैयार करना (भाषा के अनुसार नाम)
			let displaySearches = searches.map(item => {
				const startStation = this.#metroData.stationData[item.fromId];
				const endStation = this.#metroData.stationData[item.toId];
				
				const fromName = this.#getStationLangName(item.fromId);
				const toName = this.#getStationLangName(item.toId);

				const fromNameEn = startStation ? startStation.name?.en || "" : "";
				const toNameEn = endStation ? endStation.name?.en || "" : "";
				return {
					...item,
					fromName,
					toName,
					fromNameEn,
					toNameEn
				};
			});

			// फ़िल्टर के आधार पर सॉर्ट करना
			if (this.#activeSearchFilter === "most-used") {
				displaySearches.sort((a, b) => {
					const countA = a.count || 1;
					const countB = b.count || 1;
					if (countB !== countA) return countB - countA;
					return (b.timestamp || 0) - (a.timestamp || 0);
				});
			} else if (this.#activeSearchFilter === "az") {
				displaySearches.sort((a, b) => {
					const fromCompare = a.fromName.localeCompare(b.fromName, lang);
					if (fromCompare !== 0) return fromCompare;
					return a.toName.localeCompare(b.toName, lang);
				});
			} else {
				displaySearches.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
			}

			// HTML रेंडरिंग (स्टेशन लाइन बुलेट्स + डिलीट बटन)
			recentSearchList.innerHTML = displaySearches.map(item => {
				const fromDots = this.#getStationLineDotsHTML(item.fromId);
				const toDots = this.#getStationLineDotsHTML(item.toId);

				return `
					<li class="recent-search-item">
						<button type="button" class="recent-search-btn" title="${item.fromName} → ${item.toName}" data-from-en="${item.fromNameEn}" data-to-en="${item.toNameEn}">
							<span class="from">${fromDots}<span>${item.fromName}</span></span>
							<span class="arrow">→</span>
							<span class="to">${toDots}<span>${item.toName}</span></span>
						</button>
						<button type="button" class="delete-search-btn" aria-label="${i18n.t("home.deleteRoute")}" data-from-id="${item.fromId}" data-to-id="${item.toId}">
							<img src="../assets/icons/trash-can-solid-full.svg" alt="🗑️" aria-hidden="true">
						</button>
					</li>
				`;
			}).join("");
		}
	}

	// स्टेशन की मेट्रो लाइनों के रंगीन बुलेट डॉट्स बनाने के लिए हेल्पर फ़ंक्शन
	#getStationLineDotsHTML(stationId) {
		if (!stationId || !this.#metroData?.stationData || !this.#metroData?.lines) return "";
		const station = this.#metroData.stationData[stationId];
		if (!station || !Array.isArray(station.lines) || station.lines.length === 0) return "";
		const dots = station.lines.map(lineKey => {
			const lineObj = this.#metroData.lines[lineKey];
			const color = lineObj?.color || "#999999";
			const lineName = lineObj?.short_name?.[i18n.currentLang || "en"] || lineObj?.name?.en || lineKey;
			return `<span class="line-dot" style="background-color: ${color};" title="${lineName}"></span>`;
		}).join("");
		return `<span class="line-dots">${dots}</span>`;
	}

	// फ़िल्टर चिप्स, सिंगल डिलीट और क्विक सर्च इवेंट्स
	#recentSearches_event() {
		const { recentSearchList, clearRecentSearches } = this.#elemts;
		const filterChipsContainer = document.querySelector(".filter-chips");

		// 1. फ़िल्टर चिप्स पर क्लिक इवेंट
		if (filterChipsContainer) {
			filterChipsContainer.addEventListener("click", (e) => {
				const clickedBtn = e.target.closest("button");
				if (!clickedBtn) return;

				const buttons = filterChipsContainer.querySelectorAll("button");
				buttons.forEach((btn) => btn.classList.remove("active"));
				clickedBtn.classList.add("active");

				const index = Array.from(buttons).indexOf(clickedBtn);
				if (index === 0) {
					this.#activeSearchFilter = "recent";
				} else if (index === 1) {
					this.#activeSearchFilter = "most-used";
				} else if (index === 2) {
					this.#activeSearchFilter = "az";
				}

				this.#renderRecentSearches();
			});
		}

		// 2. सभी साफ़ करें (Clear All) बटन
		if (clearRecentSearches) {
			clearRecentSearches.addEventListener("click", () => {
				this.#recentSearchService?.clearAll();
				this.#renderRecentSearches();
			});
		}

		// 3. क्विक सर्च और डिलीट (इवेंट डेलीगेशन)
		if (recentSearchList) {
			recentSearchList.addEventListener("click", (e) => {
				const deleteBtn = e.target.closest(".delete-search-btn");
				const searchBtn = e.target.closest(".recent-search-btn");

				if (deleteBtn) {
					const fromId = deleteBtn.getAttribute("data-from-id");
					const toId = deleteBtn.getAttribute("data-to-id");
					if (fromId && toId) {
						this.#recentSearchService?.deleteSearch(fromId, toId);
					}
								} else if (searchBtn) {
					// इनपुट फ़ील्ड्स में भरने के लिए इंग्लिश नाम का उपयोग
					const fromVal = searchBtn.getAttribute("data-from-en");
					const toVal = searchBtn.getAttribute("data-to-en");

				if (this.#elemts.startStation && this.#elemts.endStation) {
						this.#elemts.startStation.value = fromVal;
						this.#elemts.endStation.value = toVal;

						// 1. साइडबार एक्टिव टैब को Recent Searches से Route Finder पर शिफ्ट करें
						const routeFinderTab = document.querySelector('.sidebar-link[data-target="route-finder"]');
						if (routeFinderTab) {
							routeFinderTab.click();
						}

						// 2. फ़ॉर्म को ऑटो-सबमिट करें
						const form = document.querySelector(".routeFinder");
						if (form) {
							form.requestSubmit();
						}
					}
				}
			});
		}
	}

    // =========================================================================
	// SHARE & URL ROUTE AUTO-LOAD METHODS
	// =========================================================================
	
	// URL पैरामीटर्स से ऑटो-रूट जनरेट करने वाला मेथड
	#handleUrlParams() {
		const urlParams = new URLSearchParams(window.location.search);
		const fromId = urlParams.get("from");
		const toId = urlParams.get("to");
		const priority = urlParams.get("priority");

		if (!fromId || !toId) return;

		const startStationObj = this.#metroData.stationData[fromId];
		const endStationObj = this.#metroData.stationData[toId];

		if (!startStationObj || !endStationObj) return;

		const currentLang = this.#settings.currentLang || "en";

		if (this.#elemts.startStation) {
			this.#elemts.startStation.value = startStationObj.name[currentLang] || startStationObj.name.en;
		}
		if (this.#elemts.endStation) {
			this.#elemts.endStation.value = endStationObj.name[currentLang] || endStationObj.name.en;
		}

		if (priority) {
			const priorityRadio = document.querySelector(`input[name="routeType"][value="${priority}"]`);
			if (priorityRadio) priorityRadio.checked = true;
		}

		const form = document.querySelector(".routeFinder");
		if (form) {
			setTimeout(() => {
				// 1. यदि साइडबार सेक्शन बंद है, तो Route Finder वाली टैब को क्लिक करके विंडो खोलें
				const routeFinderTab = document.querySelector('.sidebar-link[data-target="route-finder"]');
				if (routeFinderTab) {
					routeFinderTab.click();
				}
				// 2. फ़ॉर्म सबमिट करके रूट कैलकुलेट करें
				form.requestSubmit();
				// 3. विजुअल स्क्रॉल करें
				const routeSection = document.getElementById("route-finder");
				if (routeSection) {
					routeSection.scrollIntoView({ behavior: "smooth" });
				}
			}, 150);
		}
	}
}
