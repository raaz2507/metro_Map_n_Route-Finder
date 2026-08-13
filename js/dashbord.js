import data from "../data/data.json" with { type: "json" };
import { MetroMap } from "./metro-map.js";
import {
	plusCode2Coordinates,
	calculateNeighborDistance,
} from "./data-utils.js";
import { RouteFinder } from "./route-finder.js";

import i18n from "./i18n.js";

// await i18n.setLanguage("hi");
// console.log(data.stationData);

// console.log(olc.decode(delhiCode +"M69H+4Q"));
// console.log(olc.decode(delhiCode +"M6GF+WW"));

export class Dashboard {
	#elemts = {};
	#settings = { currentTheme: "light", currentLang: "en" };
	#metroData = data;
	#mapObj;
	#routeFinder;
	#activeSearchFilter = "recent";
    #currentRouteInfo = null;

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
		// 1. Plus Codes को Coordinates में बदलें
		this.#metroData = plusCode2Coordinates(this.#metroData);
		// 2. सभी पड़ोसियों के बीच की दूरी की गणना करें
		this.#metroData = calculateNeighborDistance(this.#metroData);
		
		// prettier-ignore
		this.#mapObj = new MetroMap({mapContainerSelector: ".mapContainer",metroData: this.#metroData, });
		// console.log(map);

		// 4. RouteFinder इंजन इनिशियलाइज़ करें
		this.#routeFinder = new RouteFinder(this.#metroData);

		// i18n इनिशियलाइज़ करें और भाषा लोड होने का इंतज़ार करें
		await i18n.initI18n();

		this.#loadSettings();

		this.#mapObj.setLanguage = this.#settings.currentLang;
		this.#mapObj.setTheme = this.#settings.currentTheme;
		
		this.#stationListGenerator();
		this.#renderRecentSearches();
	}

	#loadSettings() {
		// 1. Theme लोड और अप्लाई करें
		if (localStorage.getItem("metro-theme")) {
			this.#settings.currentTheme = localStorage.getItem("metro-theme");
		}
		document.body.setAttribute("data-theme", this.#settings.currentTheme);
		if (this.#elemts.theme) {
			this.#elemts.theme.value = this.#settings.currentTheme; // ड्रॉपडाउन सिलेक्ट करें
		}

		// 2. Language लोड और अप्लाई करें (अब "language" की का उपयोग करें)
		if (localStorage.getItem("language")) {
			this.#settings.currentLang = localStorage.getItem("language");
		}

		if (this.#elemts.language) {
			this.#elemts.language.value = this.#settings.currentLang; // ड्रॉपडाउन सिलेक्ट करें
		}
	}

	#set_events() {
		this.#language_event();
		this.#station_input_event();
		this.#theme_event();
		this.#routeFinder_event();

        this.#sidebarNav_event();
		this.#floatingNav_event();
		this.#recentSearches_event();
	}

	// =========================================================================
	// 4. methods for dashbord
	// =========================================================================

	#stationListGenerator() {
		const { stationList } = this.#elemts;
		for (const station of Object.values(this.#metroData.stationData)) {
			const option = document.createElement("option");
			option.value = station.name;
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

	#theme_event() {
		const { theme } = this.#elemts;
		if (!theme) return;

		// 2. जब यूज़र ड्रॉपडाउन से थीम बदलेगा
		theme.addEventListener("change", (e) => {
			const selectedTheme = e.target.value;
			document.body.setAttribute("data-theme", selectedTheme);
			this.#mapObj.setTheme = selectedTheme;
			localStorage.setItem("metro-theme", selectedTheme); // लोकल स्टोरेज में सेव करें
		});
	}

	#language_event() {
		const { language } = this.#elemts;
		if (!language) return;

		language.addEventListener("change", async () => { // <-- async जोड़ें
			const selectedLang = language.value;
			if (selectedLang === "hi" || selectedLang === "en") {
				this.#settings.currentLang = selectedLang;
				this.#mapObj.setLanguage = selectedLang;
				
				// i18n क्लास इंस्टेंस द्वारा भाषा सेट करें (यह स्वयं LocalStorage अपडेट और पेज ट्रांसलेशन करेगा)
				await i18n.setLanguage(selectedLang);
				
				this.#renderRecentSearches();

                // यदि वर्तमान में कोई रूट खोजा गया है, तो उसे नई भाषा में री-रेंडर करें
				if (this.#currentRouteInfo) {
					this.#updateJourneyDetails(this.#currentRouteInfo);
				}
			}
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
	}

	#floatingNav_event(){
		const list = document.querySelectorAll(".floating-nav-item");
		const cutoutPath = document.getElementById("cutout-path");

		function activeLink() {
			list.forEach((item) => item.classList.remove("active"));
			this.classList.add("active");

			// Calculate exact center position of the active item
			const offsetLeft = this.offsetLeft;
			const width = this.offsetWidth;
			const centerX = offsetLeft + width / 2;

			// Update the SVG mask path's transform to slide the cutout smoothly
			if (cutoutPath) {
				cutoutPath.style.transform = `translate(${centerX}px, 0px)`;
			}

			// Update body active tab
			// const link = this.querySelector("a");
			// const tab = link.getAttribute("data-tab");
			// document.body.setAttribute("data-active-tab", tab || "map");
		}

		list.forEach((item) => item.addEventListener("click", activeLink));

		// Align the mask cutout on load based on the default active item
		const activeItem = document.querySelector(".floating-nav-item.active");
		if (activeItem) {
			activeLink.call(activeItem);
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
			this.#saveRecentSearch(startVal, endVal);
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
		const stationsText = i18n.t(totalSteps === 1 ? "route.station" : "route.stations", { count: totalSteps });
		const timeText = i18n.t("route.travelTime", { minutes: routeInfo.totalTime });
		cardHeader.textContent = `${stationsText} · ${timeText}`;
		
		timelineCard.appendChild(cardHeader);

		const segmentLines = this.#calculateSegmentLines(path);
		const segments = this.#groupPathIntoSegments(path, segmentLines);

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
	// HELPER METHODS FOR ROUTE OVERVIEW DETAILED RENDERING
	// =========================================================================

	// Quick Stats UI अपडेट करने वाला हेल्पर
	#updateQuickOverviewValues(routeInfo) {
		const totalStation = document.querySelector(
			"#journeyDetails .total_station .value",
		);
		const timeVal = document.querySelector("#journeyDetails .time .value");
		const fareVal = document.querySelector(
			"#journeyDetails .fare_amount .value",
		);
		const interchangeVal = document.querySelector(
			"#journeyDetails .interchange_count .value",
		);
		const distanceVal = document.querySelector(
			"#journeyDetails .distance .value",
		);

		if (totalStation) totalStation.textContent = routeInfo.path.length;
		if (timeVal) timeVal.textContent = routeInfo.totalTime;
		if (fareVal) fareVal.textContent = routeInfo.totalFare;
		if (interchangeVal) interchangeVal.textContent = routeInfo.interchanges;
		if (distanceVal) distanceVal.textContent = routeInfo.totalDistance;
	}

	// स्टेशन का भाषा अनुसार नाम प्राप्त करने वाला हेल्पर
	#getStationLangName(stationId) {
		const station = this.#metroData.stationData[stationId];
		if (!station) return "";
		return this.#settings.currentLang === "hi" && station.name_hi
			? station.name_hi
			: station.name;
	}

	// वार्निंग बैनर (Warning Banner) बनाने वाला हेल्पर
	#renderWarningBanner(parent) {
		const banner = document.createElement("div");
		banner.className = "warning-banner";
		banner.innerHTML = `
			<span class="warning-banner-icon">ⓘ</span>
			<span>${i18n.t("route.warning")}</span>
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

	// मुख्य आंकड़े वाला कार्ड (Metrics Card) बनाने वाला हेल्पर
	#renderMetricsCard(parent, routeInfo, totalSteps) {
		const metricsCard = document.createElement("div");
		metricsCard.className = "journey-metrics-card";

		const timeLabel = i18n.t("route.minutesLabel");
		const changeLabel = i18n.t("route.lineChangeLabel");
		const stationsLabel = i18n.t("route.stationsLabel");
		const fareLabel = i18n.t("route.tokenFareLabel");

		const firstText = i18n.t("route.first");
		const lastText = i18n.t("route.last");

		metricsCard.innerHTML = `
			<div class="metrics-row">
				<div class="metric-col">
					<span class="metric-val">${routeInfo.totalTime}</span>
					<span class="metric-lbl">${timeLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val">${routeInfo.interchanges}</span>
					<span class="metric-lbl">${changeLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val">${totalSteps}</span>
					<span class="metric-lbl">${stationsLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val">${i18n.t("route.fare", { fare: routeInfo.totalFare })}</span>
					<span class="metric-lbl">${fareLabel}</span>
				</div>
			</div>
			<div class="timing-subrow">
				<div class="timing-item">☀️ ${firstText} <strong>06:00 AM</strong></div>
				<div class="timing-item">🌙 ${lastText} <strong>11:00 PM</strong></div>
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
			const mapContainer = document.querySelector(".mapContainer");
			if (mapContainer) {
				mapContainer.scrollIntoView({ behavior: "smooth" });
			}
		});
		parent.appendChild(showRouteBtn);
	}

	// प्रत्येक सेगमेंट की यात्रा की लाइन निकालने वाला हेल्पर
	#calculateSegmentLines(path) {
		const getSegmentLine = (s1Id, s2Id) => {
			const s1 = this.#metroData.stationData[s1Id];
			if (!s1 || !s1.neighbors) return null;
			const neighbor = s1.neighbors.find((n) => n.station === s2Id);
			return neighbor ? neighbor.line : null;
		};

		const segmentLines = [];
		for (let i = 0; i < path.length - 1; i++) {
			segmentLines.push(getSegmentLine(path[i], path[i + 1]));
		}
		return segmentLines;
	}

	// समान लाइन वाले स्टेशनों को समूह (Segments) में बाँटने वाला हेल्पर
	#groupPathIntoSegments(path, segmentLines) {
		const segments = [];
		if (path.length > 0) {
			let currentLineId = segmentLines[0];
			let currentSegment = {
				lineId: currentLineId,
				stations: [path[0]],
			};

			for (let i = 1; i < path.length; i++) {
				const lineId = segmentLines[i - 1];
				if (lineId === currentLineId) {
					currentSegment.stations.push(path[i]);
				} else {
					segments.push(currentSegment);
					currentLineId = lineId;
					currentSegment = {
						lineId: currentLineId,
						stations: [path[i - 1], path[i]], // इंटरचेंज स्टेशन दोनों समूहों में रहेगा
					};
				}
			}
			segments.push(currentSegment);
		}
		return segments;
	}

	// यात्रा की दिशा (Terminal) ढूंढने का हेल्पर
	#findTerminalTowards(stationIds, lineId) {
		if (stationIds.length < 2) return "";
		let currentId = stationIds[stationIds.length - 1];
		let prevId = stationIds[stationIds.length - 2];

		for (let iter = 0; iter < 100; iter++) {
			const currentStation = this.#metroData.stationData[currentId];
			if (!currentStation || !currentStation.neighbors) break;

			const nextNeighbors = currentStation.neighbors.filter(
				(n) => n.line === lineId && n.station !== prevId,
			);
			if (nextNeighbors.length === 0) break;

			prevId = currentId;
			currentId = nextNeighbors[0].station;
		}

		const terminalStation = this.#metroData.stationData[currentId];
		return terminalStation ? this.#getStationLangName(currentId) : "";
	}

		// पूरी वर्टिकल टाइमलाइन रेंडर करने वाला हेल्पर
	#renderTimelineSegments(container, segments, segmentLines, totalSteps) {
		const timelineContainer = document.createElement("div");
		timelineContainer.className = "route-timeline";

		let globalStationIndex = 0;
		let cumulativeTime = 0;
		let animationRowCounter = 0;

		segments.forEach((segment, segmentIndex) => {
			const lineInfo = this.#metroData.line_color[segment.lineId];
			const lineColor = lineInfo ? lineInfo.color : "#cbd5e1";
			const lineName =
				this.#settings.currentLang === "hi" && lineInfo.name_hi
					? lineInfo.name_hi.split(" - ")[1] || lineInfo.name_hi
					: lineInfo.name_en
						? lineInfo.name_en.split(" - ")[1] || lineInfo.name_en
						: `Line ${segment.lineId}`;

			const terminalName = this.#findTerminalTowards(
				segment.stations,
				segment.lineId,
			);
			
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
				const nextLineInfo = this.#metroData.line_color[nextSegment.lineId];
				const nextLineColor = nextLineInfo ? nextLineInfo.color : "#cbd5e1";
				const nextLineName =
					this.#settings.currentLang === "hi" && nextLineInfo.name_hi
						? nextLineInfo.name_hi.split(" - ")[1] || nextLineInfo.name_hi
						: nextLineInfo.name_en
							? nextLineInfo.name_en.split(" - ")[1] || nextLineInfo.name_en
							: `Line ${nextSegment.lineId}`;

				const nextTerminal = this.#findTerminalTowards(
					nextSegment.stations,
					nextSegment.lineId,
				);

				const interchangeContainer = document.createElement("div");
				interchangeContainer.className = "interchange-container";
				interchangeContainer.style.setProperty(
					"--delay",
					`${animationRowCounter * 120}ms`,
				);

				// इंटरचेंज टेक्स्ट को ट्रांसलेट करें
				interchangeContainer.innerHTML = `
					<div class="interchange-track">
						<div class="interchange-track-line" style="border-color: ${lineColor};"></div>
					</div>
					<div class="interchange-card">
						<div class="interchange-content">
							<span class="interchange-icon-walk">
                                <img src="../img/icons/footstep.webp" class="interchange-icon-walk" alt="walk">
                            </span>
							<span>
								${i18n.t("route.changeToText", {
									line: nextLineName,
									terminal: nextTerminal.toUpperCase(),
									platform: (segmentIndex % 2) + 2
								})}
							</span>
						</div>
						<span class="interchange-time-badge">~5m</span>
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

	// इनपुट नाम (Hindi/English) के आधार पर स्टेशन ऑब्जेक्ट ढूँढने के लिए हेल्पर
	#findStationByName(name) {
		if (!name) return null;
		const normalized = name.trim().toLowerCase();
		return Object.values(this.#metroData.stationData).find(
			(s) =>
				s.name.toLowerCase() === normalized ||
				s.id.toLowerCase() === normalized ||
				(s.name_hi && s.name_hi.toLowerCase() === normalized),
		);
	}

	// हाल ही में किए गए रूट को ID के साथ सहेजने के लिए
	#saveRecentSearch(fromVal, toVal) {
		if (!fromVal || !toVal) return;

		const startStation = this.#findStationByName(fromVal);
		const endStation = this.#findStationByName(toVal);
		if (!startStation || !endStation) return;

		let searches = [];
		try {
			const stored = localStorage.getItem("metro-recent-searches");
			if (stored) {
				searches = JSON.parse(stored);
			}
		} catch (e) {
			console.error("Error loading recent searches", e);
		}

		// पुराने फॉर्मेट को ID आधारित फॉर्मेट में माइग्रेट करना (Backward Compatibility)
		searches = searches
			.map((item) => {
				if (item.fromId && item.toId) return item;
				const startObj = this.#findStationByName(item.from);
				const endObj = this.#findStationByName(item.to);
				return {
					fromId: startObj ? startObj.id : null,
					toId: endObj ? endObj.id : null,
					count: item.count || 1,
					timestamp: item.timestamp || Date.now(),
				};
			})
			.filter((item) => item.fromId && item.toId);

		// जांचें कि क्या यह रूट पहले से ही मौजूद है
		const existingIndex = searches.findIndex(
			(item) => item.fromId === startStation.id && item.toId === endStation.id,
		);
		if (existingIndex > -1) {
			searches[existingIndex].count = (searches[existingIndex].count || 1) + 1;
			searches[existingIndex].timestamp = Date.now();

			// उसे सूची के शीर्ष पर ले आएं
			const item = searches.splice(existingIndex, 1)[0];
			searches.unshift(item);
		} else {
			searches.unshift({
				fromId: startStation.id,
				toId: endStation.id,
				count: 1,
				timestamp: Date.now(),
			});
		}

		// इतिहास को 13 आइटम्स पर सीमित करें
		const maxHistoryLimit = 13;
		if (searches.length > maxHistoryLimit) {
			searches = searches.slice(0, maxHistoryLimit);
		}

		localStorage.setItem("metro-recent-searches", JSON.stringify(searches));
		this.#renderRecentSearches();
	}

	// एक विशिष्ट रूट हटाने के लिए
	#deleteRecentSearch(fromId, toId) {
		let searches = [];
		try {
			const stored = localStorage.getItem("metro-recent-searches");
			if (stored) {
				searches = JSON.parse(stored);
			}
		} catch (e) {
			console.error("Error loading recent searches", e);
		}

		searches = searches.filter(
			(item) => !(item.fromId === fromId && item.toId === toId),
		);
		localStorage.setItem("metro-recent-searches", JSON.stringify(searches));
		this.#renderRecentSearches();
	}

		// हाल की खोजों की सूची को रेंडर करने और ट्रांसलेट/सॉर्ट करने के लिए
	#renderRecentSearches() {
		const { recentSearchList, clearRecentSearches } = this.#elemts;
		const lang = this.#settings.currentLang || "en";

		if (!recentSearchList) return;

		let searches = [];
		try {
			const stored = localStorage.getItem("metro-recent-searches");
			if (stored) {
				searches = JSON.parse(stored);
			}
		} catch (e) {
			console.error("Error loading recent searches", e);
		}

		// पुराने फॉर्मेट को ID आधारित फॉर्मेट में माइग्रेट करना (Backward Compatibility)
		searches = searches.map(item => {
			if (item.fromId && item.toId) return item;
			const startObj = this.#findStationByName(item.from);
			const endObj = this.#findStationByName(item.to);
			return {
				fromId: startObj ? startObj.id : null,
				toId: endObj ? endObj.id : null,
				count: item.count || 1,
				timestamp: item.timestamp || Date.now()
			};
		}).filter(item => item.fromId && item.toId);

		// खाली स्थिति (Empty State)
		if (searches.length === 0) {
			recentSearchList.innerHTML = `
				<li class="recent-list-empty">
					${i18n.t("home.noRecentJourney")}
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

				const fromNameEn = startStation ? startStation.name : "";
				const toNameEn = endStation ? endStation.name : "";

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

			// HTML रेंडरिंग (डिलीट बटन एट्रिब्यूट)
			recentSearchList.innerHTML = displaySearches.map(item => `
				<li class="recent-search-item">
					<button type="button" class="recent-search-btn" title="${item.fromName} → ${item.toName}" data-from-en="${item.fromNameEn}" data-to-en="${item.toNameEn}">
						<span class="from">${item.fromName}</span>
						<span class="arrow">→</span>
						<span class="to">${item.toName}</span>
					</button>
					<button type="button" class="delete-search-btn" aria-label="${i18n.t("home.deleteRoute")}" data-from-id="${item.fromId}" data-to-id="${item.toId}">
						<img src="./img/icons/trash-can-solid-full.svg" alt="🗑️" aria-hidden="true">
					</button>
				</li>
			`).join("");
		}
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
				localStorage.removeItem("metro-recent-searches");
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
						this.#deleteRecentSearch(fromId, toId);
					}
				} else if (searchBtn) {
					// इनपुट फ़ील्ड्स में भरने के लिए इंग्लिश नाम का उपयोग
					const fromVal = searchBtn.getAttribute("data-from-en");
					const toVal = searchBtn.getAttribute("data-to-en");

					if (this.#elemts.startStation && this.#elemts.endStation) {
						this.#elemts.startStation.value = fromVal;
						this.#elemts.endStation.value = toVal;

						// फ़ॉर्म को ऑटो-सबमिट करें
						const form = document.querySelector(".routeFinder");
						if (form) {
							form.requestSubmit();
						}
					}
				}
			});
		}
	}
}
