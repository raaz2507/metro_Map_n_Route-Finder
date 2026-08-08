import data from "../data/data.json" with { type: "json" };
import { MetroMap } from "./metro-map.js";
import { plusCode2Coordinates, calculateNeighborDistance } from "./data-utils.js";
import { RouteFinder } from "./route-finder.js"; 

// console.log(data.stationData);

// console.log(olc.decode(delhiCode +"M69H+4Q"));
// console.log(olc.decode(delhiCode +"M6GF+WW"));

document.addEventListener("DOMContentLoaded", () => {
	new Dashboard();
});

class Dashboard {
	#elemts = {};
	#settings = { currentTheme: "light", currentLang: "en" };
	#metroData = data;
	#mapObj;
	#routeFinder;

	constructor() {
		this.#get_element();
		this.#init();
		this.#set_events();
	}

	#get_element() {
		const elemtMap = {
			// mapContainer: ".mapContainer",

			// zoomControls: "#zoomControls",
			// zoomLevel: "#zoomLevel",
			// zoomInBtn: "#zoomInBtn",
			// zoomOutBtn: "#zoomOutBtn",
			// resetZoomBtn: "#resetZoomBtn",

			startStation: "#startStation",
			endStation: "#endStation",
			stationList: "#stationList",
			swapButton: "#swapButton",

			// track_line_legend: "#track_line_legend",
			// station_type_legend: "#station_type_legend",

			language: "#language",

			theme: "#theme",
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
	#init() {
		// 1. Plus Codes को Coordinates में बदलें
		this.#metroData = plusCode2Coordinates(this.#metroData);
		// 2. सभी पड़ोसियों के बीच की दूरी की गणना करें
		this.#metroData = calculateNeighborDistance(this.#metroData);
		
		// prettier-ignore
		this.#mapObj = new MetroMap({mapContainerSelector: ".mapContainer",metroData: this.#metroData, });
		// console.log(map);

		// 4. RouteFinder इंजन इनिशियलाइज़ करें
		this.#routeFinder = new RouteFinder(this.#metroData);

		this.#loadSettings();

		this.#mapObj.setLanguage = this.#settings.currentLang;
    	this.#mapObj.setTheme=  this.#settings.currentTheme;
		
		this.#stationListGenerator();
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

		// 2. Language लोड और अप्लाई करें
		if (localStorage.getItem("metro-lang")) {
			this.#settings.currentLang = localStorage.getItem("metro-lang");
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

		language.addEventListener("change", () => {
			const selectedLang = language.value;
			if (selectedLang === "hi" || selectedLang === "en") {
				this.#settings.currentLang = selectedLang;
				this.#mapObj.setLanguage = selectedLang;
				
				localStorage.setItem("metro-lang", selectedLang); // लोकल स्टोरेज में सेव करें
			}
		});
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
			const routeTypeRadio = form.querySelector('input[name="routeType"]:checked');
			const routeType = routeTypeRadio ? routeTypeRadio.value : "fastest";
			// UI 'fastest' को एल्गोरिदम के 'shortestDistance' से मैप करें
			const type = routeType === "fastest" ? "shortestDistance" : "leastTransfers";
			if (!startVal || !endVal) {
				alert(this.#settings.currentLang === "hi" ? "कृपया दोनों स्टेशनों के नाम दर्ज करें।" : "Please enter both stations.");
				return;
			}
			// रूट की खोज करें
			const routeInfo = this.#routeFinder.findRoute(startVal, endVal, type);
			if (!routeInfo) {
				alert(this.#settings.currentLang === "hi" ? "इन स्टेशनों के बीच कोई मार्ग नहीं मिला।" : "No route found between these stations.");
				return;
			}
			// 1. यात्रा विवरण UI को अपडेट करें
			this.#updateJourneyDetails(routeInfo);
			// 2. मैप पर रूट को विजुअली हाईलाइट करें
			if (this.#mapObj) {
				this.#mapObj.highlightRoute(routeInfo.path);
			}
		});
		// फ़ॉर्म रीसेट होने पर (कैलकुलेशंस और हाईलाइट्स हटाएँ)
		form.addEventListener("reset", () => {
			this.#resetJourneyDetails();
			if (this.#mapObj) {
				this.#mapObj.highlightRoute(null); // हाईलाइट हटाएं
			}
		});
	}
	// 7. यात्रा विवरण और स्टेशन टाइमलाइन अपडेट करने का हेल्पर
	#updateJourneyDetails(routeInfo) {
		const totalStation = document.querySelector("#journeyDetails .total_station .value");
		const timeVal = document.querySelector("#journeyDetails .time .value");
		const fareVal = document.querySelector("#journeyDetails .fare_amount .value");
		const interchangeVal = document.querySelector("#journeyDetails .interchange_count .value");
		const distanceVal = document.querySelector("#journeyDetails .distance .value");
		if (totalStation) totalStation.textContent = routeInfo.path.length;
		if (timeVal) timeVal.textContent = routeInfo.totalTime;
		if (fareVal) fareVal.textContent = routeInfo.totalFare;
		if (interchangeVal) interchangeVal.textContent = routeInfo.interchanges;
		if (distanceVal) distanceVal.textContent = routeInfo.totalDistance;
		// Sidebar पर विस्तृत मार्ग सूची (stations list) दिखाएँ
		const overviewSection = document.querySelector("#journeyDetails .route-overview");
		if (overviewSection) {
			overviewSection.innerHTML = ""; // पुराना रूट साफ़ करें
			
			const listContainer = document.createElement("div");
			listContainer.className = "route-timeline";
			routeInfo.path.forEach((stationId, index) => {
				const station = this.#metroData.stationData[stationId];
				if (!station) return;
				const step = document.createElement("div");
				step.className = "route-step";
				// भाषा के अनुसार नाम प्राप्त करें
				const name = this.#settings.currentLang === "hi" && station.name_hi
					? station.name_hi
					: station.name;
				// स्टेशन पर मौजूद मेट्रो लाइनों के रंगीन डॉट्स (badges) बनाएं
				const lineBadges = station.lines.map(lineId => {
					const lineInfo = this.#metroData.line_color[lineId];
					const color = lineInfo ? lineInfo.color : "#ccc";
					const lineName = this.#settings.currentLang === "hi" && lineInfo.name_hi
						? lineInfo.name_hi
						: lineInfo.name_en || `Line ${lineId}`;
					return `<span class="line-badge-dot" style="background-color: ${color};" title="${lineName}"></span>`;
				}).join(" ");
				step.innerHTML = `
					<span class="step-index">${index + 1}</span>
					<span class="station-name">${name}</span>
					<span class="station-badges">${lineBadges}</span>
				`;
				listContainer.appendChild(step);
			});
			overviewSection.appendChild(listContainer);
		}
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
		const overviewSection = document.querySelector("#journeyDetails .route-overview");
		if (overviewSection) overviewSection.innerHTML = "";
	}
}
