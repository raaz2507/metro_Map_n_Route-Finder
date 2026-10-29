/**
 * Station Details & Facilities Page Controller
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Fully compliant with Universal Transit Master Schema (v3.0)
 */
import { centerClass } from "../core/CenterClass.js";
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";

import { appStateStore } from "../core/app-state-store.js";
import { BaseSearchEngine } from "../services/search/BaseSearchEngine.js";

export class StationInfoManager {
	// Private State Fields
	#metroData = null;
	#stationsDetailData = null;
	#metroLines = {};
	#metroStations = {};
	#richStations = {};

	#stationId = "";
	#currentCity = "delhi_ncr";
	#stBasicData = null;
	#stRichData = null;
	#unsubscribeLang = null;

	// Spotlight Search Engine & In-Memory Index
	#searchEngine = new BaseSearchEngine();
	#searchIndex = [];
	#spotlightInitialized = false;

	// Localization
	#lang = "en";

	constructor() {
		this.#extractParams();
		this.#lang = appStateStore.getState("currentLang") || "en";
	}

	destroy() {
		if (this.#unsubscribeLang) {
			this.#unsubscribeLang();
			this.#unsubscribeLang = null;
		}
	}

	/**
	 * Helper for nested i18n translation lookups
	 */
	#t(path, vars = {}) {
		const fullKey = `station_info.${path}`;
		const res = centerClass.t(fullKey, vars);
		// 🛡️ Agar translation nahi mila aur i18n ne wahi fullKey wapas kar di, to null return karein
		return (typeof res === "string" && res.startsWith("station_info.")) ? null : res;
	}

	/**
	 * Extracts Station ID and City from URL query parameters
	 */
	#extractParams() {
		const urlParams = new URLSearchParams(window.location.search);
		const rawParam = urlParams.get("id") || urlParams.get("code") || "jhilmil";
		this.#stationId = rawParam.trim().toLowerCase();
		this.#currentCity = urlParams.get("city") || localStorage.getItem("active_city") || "delhi_ncr";
	}

	/**
	 * Initializes Universal Header, Footer, and loads dynamic data
	 */
	async init() {
		// Render Footer first, then Header for single-pass full-DOM translation
		FooterComponent.render();
		await HeaderComponent.render("stations");

		try {
			// 1. Asynchronously load transit graph data and detailed facilities
			this.#metroData = await centerClass.loadCity(this.#currentCity);
			this.#stationsDetailData = await centerClass.loadStationsDetail(this.#currentCity);

			this.#metroLines = this.#metroData.lines || {};
			this.#metroStations = this.#metroData.stationData || {};
			this.#richStations = this.#stationsDetailData || {};

			// 2. Resolve target station basic and rich records
			this.#stBasicData = this.#findBasicData(this.#stationId);
			this.#stRichData = this.#richStations[this.#stationId] || this.#findRichDataFallback(this.#stationId);

			if (!this.#stBasicData && !this.#stRichData) {
				this.#render404();
				return;
			}

			// 3. Render Bento Grid Sections
			this.#renderAllSections();

			// 4. Subscribe to language switches for seamless in-place re-render
			this.#unsubscribeLang = appStateStore.subscribe("currentLang", async (newLang) => {
				this.#lang = newLang || "en";
				await centerClass.reloadLocale(this.#lang);
				this.#renderAllSections();
			});
		} catch (error) {
			console.error("[StationInfoManager] Failed to load station info:", error);
			this.#render404();
		}
	}

	#renderAllSections() {
		this.#renderPageTitle();
		this.#renderBackLink();
		this.#renderRouteTrack(this.#stBasicData);
		this.#renderLineInfoCard(this.#stBasicData);
		this.#renderHero(this.#stBasicData, this.#stRichData);
		this.#renderTimings(this.#stBasicData, this.#stRichData);
		this.#renderHelplines(this.#stRichData);
		this.#renderPlatforms(this.#stBasicData, this.#stRichData);
		this.#renderGates(this.#stRichData);
		this.#renderFacilitiesMasterSection(this.#stRichData);
		this.#renderParkingSection(this.#stRichData);
		this.#renderTransitTable(this.#stRichData);
		this.#renderFeederBuses(this.#stRichData);
		this.#renderStationLayouts(this.#stRichData);
		this.#renderNearbyPlaces(this.#stRichData);
		this.#initSpotlightSearch();
	}

	#renderPageTitle() {
		const name = centerClass.getStationName(this.#stationId);
		document.title = this.#t("meta.title", { name: name || this.#stationId });
	}

	#findBasicData(id) {
		if (this.#metroStations[id]) return this.#metroStations[id];
		return Object.values(this.#metroStations).find(st => 
			st.id?.toLowerCase() === id || st.name?.en?.toLowerCase() === id
		);
	}

	#findRichDataFallback(id) {
		return Object.values(this.#richStations).find(st => 
			st.id?.toLowerCase() === id
		);
	}

	#renderBackLink() {
		const backBtn = document.querySelector(".back-btn");
		if (backBtn) {
			backBtn.textContent = this.#t("nav.backBtn");
			backBtn.setAttribute("aria-label", this.#t("nav.backBtnAria"));
			backBtn.href = `all_stations.html?city=${encodeURIComponent(this.#currentCity)}`;
		}
	}

	#renderRouteTrack(stBasic) {
		const container = document.getElementById("route-track-container");
		if (!container) return;

		const lineKeys = stBasic?.lines || [];
		const neighbors = stBasic?.neighbors || [];
		if (lineKeys.length === 0 && neighbors.length === 0) {
			container.hidden = true;
			return;
		}

		container.hidden = false;
		const primaryLineColor = this.#metroLines[lineKeys[0]]?.color || "#007bff";

		let prevStackHTML = "";
		let nextStackHTML = "";
		const currentName = centerClass.getStationName(this.#stationId) || this.#stationId;

		const activeLines = lineKeys.length > 0 ? lineKeys : [neighbors[0]?.line || "default"];

		activeLines.forEach(lineId => {
			const lineInfo = this.#metroLines[lineId];
			const lineColor = lineInfo?.color || primaryLineColor;

			let lineNeighbors = neighbors.filter(n => n.line === lineId);
			if (lineNeighbors.length === 0 && neighbors.length > 0) {
				lineNeighbors = neighbors;
			}

			const prevNeighbor = lineNeighbors[0];
			const nextNeighbor = lineNeighbors[1];

			const prevName = prevNeighbor ? (centerClass.getStationName(prevNeighbor.station) || prevNeighbor.station) : "Terminal";
			const nextName = nextNeighbor ? (centerClass.getStationName(nextNeighbor.station) || nextNeighbor.station) : "Terminal";
			prevStackHTML += prevNeighbor 
				? `<a href="station_info.html?id=${encodeURIComponent(prevNeighbor.station)}&city=${encodeURIComponent(this.#currentCity)}" class="route-capsule prev" style="--line-color:${lineColor};">← ${this.#escapeHTML(prevName)}</a>`
				: `<span class="route-capsule disabled" style="--line-color:${lineColor};">● ${this.#escapeHTML(prevName)}</span>`;

			nextStackHTML += nextNeighbor 
				? `<a href="station_info.html?id=${encodeURIComponent(nextNeighbor.station)}&city=${encodeURIComponent(this.#currentCity)}" class="route-capsule next" style="--line-color:${lineColor};">${this.#escapeHTML(nextName)} ➔</a>`
				: `<span class="route-capsule disabled" style="--line-color:${lineColor};">● ${this.#escapeHTML(nextName)}</span>`;
		});

		const currentHTML = `<span class="route-capsule current" style="--line-color:${primaryLineColor};">● ${this.#escapeHTML(currentName)}</span>`;

		container.innerHTML = `
			<div class="track-col prev-col">${prevStackHTML}</div>
			<div class="track-col center-col">${currentHTML}</div>
			<div class="track-col next-col">${nextStackHTML}</div>
		`;
	}

	#renderLineInfoCard(stBasic) {
		const container = document.getElementById("line-info-container");
		if (!container) return;
		const lineKeys = stBasic?.lines || [];
		if (lineKeys.length === 0) {
			container.hidden = true;
			return;
		}
		container.hidden = false;
		let linesHTML = '<div class="line-info-master-wrapper">';

		lineKeys.forEach(lineId => {
			const lineInfo = this.#metroLines[lineId];
			if (!lineInfo) return;
			const lineColor = lineInfo.color || "#007bff";
			const label = lineInfo.label ? `Line ${lineInfo.label}` : "Metro";
			const colorName = centerClass.getLineName(lineId) || lineId.toUpperCase();
			
			const network = (centerClass.getNetworkName(lineInfo.network) || lineInfo.network || "Transit").toUpperCase();
			const operator = (lineInfo.operator || "Operator").toUpperCase();
			const fromId = lineInfo.route?.from;
			const toId = lineInfo.route?.to;
			const fromSt = fromId ? (centerClass.getStationName(fromId) || fromId.toUpperCase()) : "Origin";
			const toSt = toId ? (centerClass.getStationName(toId) || toId.toUpperCase()) : "Destination";
			linesHTML += `
				<div class="line-strip-row" style="--line-color:${lineColor};">
					<span class="chip-label">${this.#escapeHTML(label)}</span>
					<span class="chip-name">${this.#escapeHTML(colorName)}</span>
					<span class="chip-net">🏢 ${this.#escapeHTML(network)} (${this.#escapeHTML(operator)})</span>
					<span class="chip-route">📍 ${this.#escapeHTML(fromSt)} ➔ ${this.#escapeHTML(toSt)}</span>
				</div>
			`;
		});
		
		linesHTML += "</div>";
		container.innerHTML = `
			<h3 class="feature-card-header">${this.#escapeHTML(this.#t("hero.connectedLines"))}</h3>
			${linesHTML}
		`;
	}

	#renderHero(stBasic, stRich) {
		const heroContainer = document.getElementById("hero-container");
		if (!heroContainer) return;

		const stationTitle = centerClass.getStationName(this.#stationId) || this.#stationId;
		const code = (stBasic?.id || stRich?.id || this.#stationId).toUpperCase();
		const rawLayout = (stRich?.type || stBasic?.properties?.layout);
		const layoutType = this.#t(`hero.layouts.${rawLayout}`) || rawLayout;
		
		const descText = centerClass.getStationDescription(this.#stationId);
		const description = descText || this.#t("hero.noDescription");

		// GIS Location Strip
		let gisHTML = "";
		const lat = stBasic?.location?.decimal?.lat;
		const lon = stBasic?.location?.decimal?.lon;
		const plusCode = stBasic?.location?.plusCode;

		if (lat && lon) {
			const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
			gisHTML = `
				<div class="gis-action-strip">
					${plusCode ? `<span class="gis-badge">🏷️ <strong>${this.#escapeHTML(this.#t("hero.plusCode"))}:</strong> ${this.#escapeHTML(plusCode)}</span>` : ""}
					<span class="gis-badge">🌐 <strong>${this.#escapeHTML(this.#t("hero.coordinates"))}:</strong> ${lat.toFixed(5)}, ${lon.toFixed(5)}</span>
					<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="gis-map-btn" aria-label="${this.#escapeHTML(this.#t("hero.openInMapsAria"))}">${this.#escapeHTML(this.#t("hero.openInMaps"))}</a>
				</div>
			`;
		}

		heroContainer.innerHTML = `
			<div class="station-hero-header">
				<div class="station-main-title">
					<h2><span class="station-name-en">${this.#escapeHTML(stationTitle)}</span></h2>
					<p>${this.#escapeHTML(this.#t("hero.stationCode"))}: <strong>${this.#escapeHTML(code)}</strong> | ${this.#escapeHTML(this.#t("hero.layout"))}: <strong>${this.#escapeHTML(layoutType)}</strong></p>
				</div>
			</div>
			<p class="station-description-p">📝 ${this.#escapeHTML(description)}</p>
			${gisHTML}
		`;
	}

	#renderTimings(stBasic, stRich) {
		const container = document.getElementById("operating-hours-container");
		if (!container) return;

		const firstTrain = this.#formatTo12Hour(stBasic?.train_schedule?.first_train || stRich?.timings?.opening);
		const lastTrain = this.#formatTo12Hour(stBasic?.train_schedule?.last_train || stRich?.timings?.closing);

		const sunFirst = stBasic?.train_schedule?.sunday_first_train;
		const sunLast = stBasic?.train_schedule?.sunday_last_train;

		let sundayHTML = "";
		if (sunFirst || sunLast) {
			sundayHTML = `
				<div class="compact-timing-row border-top-dashed">
					<span class="timing-day-header">🗓️ ${this.#escapeHTML(this.#t("timings.sundayTitle"))}:</span>
				</div>
				<div class="compact-timing-row">
					<span>☀️ <strong>${this.#escapeHTML(this.#t("timings.first"))}:</strong> <span class="timing-value-success">${this.#formatTo12Hour(sunFirst)}</span></span>
					<span>🌙 <strong>${this.#escapeHTML(this.#t("timings.last"))}:</strong> <span class="timing-value-danger">${this.#formatTo12Hour(sunLast)}</span></span>
				</div>
			`;
		}

		container.innerHTML = `
			<div class="compact-timing-row">
				<span>${this.#escapeHTML(this.#t("timings.title"))}</span>
			</div>
			<div class="compact-timing-row border-top-dashed">
				<span>☀️ <strong>${this.#escapeHTML(this.#t("timings.first"))}:</strong> <span class="timing-value-success">${firstTrain}</span></span>
				<span>🌙 <strong>${this.#escapeHTML(this.#t("timings.last"))}:</strong> <span class="timing-value-danger">${lastTrain}</span></span>
			</div>
			${sundayHTML}
		`;
	}

	#renderHelplines(stRich) {
		const container = document.getElementById("contacts-container");
		if (!container) return;

		const mobile = stRich?.contact?.mobile || "8800793101";
		const landline = stRich?.contact?.landline || "N/A";

		container.innerHTML = `
			<h3 class="feature-card-header">${this.#escapeHTML(this.#t("helplines.title"))}</h3>
			<div class="contacts-grid">
				<div class="contact-box">
					<strong>${this.#escapeHTML(this.#t("helplines.mobile"))}</strong>
					<div><a href="tel:${this.#escapeHTML(mobile)}">${this.#escapeHTML(mobile)}</a></div>
				</div>
				<div class="contact-box">
					<strong>${this.#escapeHTML(this.#t("helplines.landline"))}</strong>
					<div class="contact-landline-val">${this.#escapeHTML(landline)}</div>
				</div>
				<div class="contact-box">
					<strong>${this.#escapeHTML(this.#t("helplines.universal"))}</strong>
					<div><a href="tel:155370">155370</a></div>
				</div>
			</div>
		`;
	}

	#renderPlatforms(stBasic, stRich) {
		const container = document.getElementById("platforms-container");
		if (!container) return;

		const platformsObj = stBasic?.platforms || stRich?.platforms || {};
		const platformKeys = Object.keys(platformsObj);

		if (platformKeys.length === 0) {
			container.innerHTML = `<div class="empty-data-notice">${this.#escapeHTML(this.#t("platforms.noPlatforms"))}</div>`;
			return;
		}

		let html = "";
		platformKeys.forEach(pNum => {
			const p = platformsObj[pNum];
			const lineInfo = this.#metroLines[p.line];
			const lineColor = lineInfo?.color;
			const lineName = centerClass.getLineShortName(p.line) || centerClass.getLineName(p.line) || p.line?.toUpperCase() || "Metro";
			
			let destName = "Terminal";
			if (p.destination) {
				destName = centerClass.getStationName(p.destination) || p.destination.toUpperCase();
			} else if (lineInfo?.route) {
				const fallbackDestId = lineInfo.route.to;
				destName = fallbackDestId ? (centerClass.getStationName(fallbackDestId) || fallbackDestId.toUpperCase()) : "Terminal";
			} else {
				destName = "Terminal";
			}

			const loungeTag = p.lounge ? `<span class="platform-lounge-tag">${this.#escapeHTML(this.#t("platforms.lounge"))}</span>` : "";

			html += `
				<div class="platform-card" style="--line-color:${lineColor};">
					<div class="platform-card-header">
						<span class="platform-badge">🚉 ${this.#escapeHTML(this.#t("platforms.platformNum", { num: pNum }))}</span>
						<span class="platform-line-tag">${this.#escapeHTML(lineName)}</span>
					</div>
					<div class="platform-dest-wrapper">
						<span class="platform-dest-arrow">➔</span>
						<span>${this.#escapeHTML(this.#t("platforms.towards"))}: <strong class="platform-dest-name">${this.#escapeHTML(destName)}</strong></span>
					</div>
					${loungeTag}
				</div>
			`;
		});

		container.innerHTML = html;
	}

	#renderGates(stRich) {
		const container = document.getElementById("gates-container");
		if (!container) return;

		const gatesObj = stRich?.gates || {};
		const gateKeys = Object.keys(gatesObj);

		if (gateKeys.length === 0) {
			container.innerHTML = `<div class="empty-data-notice">${this.#escapeHTML(this.#t("gates.noGates"))}</div>`;
			return;
		}

		let html = "";
		gateKeys.forEach(gNum => {
			const g = gatesObj[gNum];
			const divyangTag = g.divyang 
				? `<span class="divyang-tag accessible">${this.#escapeHTML(this.#t("gates.divyangAccessible"))}</span>` 
				: `<span class="divyang-tag standard">${this.#escapeHTML(this.#t("gates.standardAccess"))}</span>`;
			const gateCode = g.code || `GA${gNum}`;
			const isOpen = (g.status || "OPEN").toUpperCase() === "OPEN";
			const status = isOpen ? this.#t("gates.open") : this.#t("gates.closed");
			const statusClass = isOpen ? "status-active" : "status-maintenance";
			const defaultArea = this.#t("gates.defaultArea") || "Exit Gate Area";
			const landmark = centerClass.getGateLandmark(this.#stationId, gNum) || defaultArea;
			const gateLabel = this.#t("gates.gateNum", { num: gNum });

			html += `
				<div class="gate-card-32">
					<div class="gate-card-header">
						<div class="gate-title-group">
							<span class="gate-number">${this.#escapeHTML(gateLabel)}</span>
							<span class="gate-code-tag">${this.#escapeHTML(gateCode)}</span>
						</div>
						<span class="${statusClass}">${this.#escapeHTML(status)}</span>
					</div>
					<div class="gate-card-body">
						${divyangTag}
					</div>
					<div class="gate-card-footer">
						<span>📍 ${this.#escapeHTML(landmark)}</span>
					</div>
				</div>
			`;
		});

		container.innerHTML = html;
	}

	#renderFacilitiesMasterSection(stRich) {
		const container = document.getElementById("facilities-container");
		if (!container) return;

		const facilitiesObj = stRich?.facilities || {};
		const catKeys = Object.keys(facilitiesObj);

		if (catKeys.length === 0) {
			container.innerHTML = `<div class="empty-data-notice">${this.#escapeHTML(this.#t("facilities.noFacilities"))}</div>`;
			return;
		}

		let html = `<div class="facilities-master-wrapper">`;

		catKeys.forEach(cat => {
			const items = facilitiesObj[cat] || [];
			if (items.length === 0) return;

			const catTitle = this.#t(`facilities.categories.${cat}`) || cat;
			html += `
				<div class="facility-subcategory">
					<div class="facility-subcategory-title">🔹 ${this.#escapeHTML(catTitle)} (${items.length})</div>
					<div class="facility-items-flex">
						${items.map(item => {
							const rawItemName = item.name || cat;
							const itemName = this.#t(`facilities.items.${rawItemName}`) || rawItemName;
							const rawItemLoc = item.location || "Concourse";
							const itemLoc = this.#t(`facilities.locations.${rawItemLoc}`) || rawItemLoc;

							return `
								<div class="facility-pill">
									<span class="facility-name">${this.#escapeHTML(itemName)}</span>
									<span class="facility-loc">📍 ${this.#escapeHTML(itemLoc)} ${item.purpose ? `| ${this.#escapeHTML(item.purpose)}` : ""}</span>
								</div>
							`;
						}).join("")}
					</div>
				</div>
			`;
		});

		html += `</div>`;
		container.innerHTML = html;
	}

	#renderParkingSection(stRich) {
		const capacityContainer = document.getElementById("parking-container");
		const tariffsContainer = document.getElementById("parking-tariffs-container");
		if (!capacityContainer) return;

		// Distinguish between capacity lots (Array) and direct parking charges (Object)
		const parkingCapacityList = Array.isArray(stRich?.parkings) ? stRich.parkings : [];
		const parkingCharges = stRich?.parkingCharges || (stRich?.parkings?.rates ? stRich.parkings : null);

		if (parkingCapacityList.length === 0 && !parkingCharges) {
			capacityContainer.innerHTML = `<div class="empty-data-notice">${this.#escapeHTML(this.#t("parking.noParking"))}</div>`;
			if (tariffsContainer) tariffsContainer.innerHTML = "";
			return;
		}

		// 1. Capacity Table
		if (parkingCapacityList.length > 0) {
			let tableHTML = `
				<div class="table-responsive-wrapper">
					<table class="station-table">
						<thead>
							<tr>
								<th>${this.#escapeHTML(this.#t("parking.provider"))}</th>
								<th>${this.#escapeHTML(this.#t("parking.car"))}</th>
								<th>${this.#escapeHTML(this.#t("parking.bike"))}</th>
								<th>${this.#escapeHTML(this.#t("parking.cycle"))}</th>
								<th>${this.#escapeHTML(this.#t("parking.location"))}</th>
							</tr>
						</thead>
						<tbody>
			`;

			parkingCapacityList.forEach(p => {
				const providerName = p.provider === "Not Available" 
					? this.#t("parking.notAvailable") 
					: (p.provider || this.#t("parking.authorisedParking"));
				const locName = p.location === "Near Exit Gate" 
					? this.#t("parking.nearExitGate") 
					: (p.location || this.#t("parking.nearExitGate"));

				tableHTML += `
					<tr>
						<td><strong>${this.#escapeHTML(providerName)}</strong></td>
						<td>${p.capacity_car ?? "--"}</td>
						<td>${p.capacity_motorcycle ?? "--"}</td>
						<td>${p.capacity_cycle ?? "--"}</td>
						<td>${this.#escapeHTML(locName)}</td>
					</tr>
				`;
			});

			tableHTML += `</tbody></table></div>`;
			capacityContainer.innerHTML = tableHTML;
		} else if (parkingCharges) {
			const noticeTitle = this.#t("parking.authorisedNoticeTitle", { state: parkingCharges.state || "Active" });
			const noticeDesc = this.#t("parking.authorisedNoticeDesc");
			capacityContainer.innerHTML = `
				<div class="facility-pill facility-pill-authorised">
					<span class="facility-name">${this.#escapeHTML(noticeTitle)}</span>
					<span class="facility-loc">${this.#escapeHTML(noticeDesc)}</span>
				</div>
			`;
		}

		// 2. Ultra-Rich Parking Tariffs (Universal Schema)
		if (tariffsContainer && parkingCharges) {
			this.#renderParkingTariffs(parkingCharges, tariffsContainer);
		} else if (tariffsContainer) {
			tariffsContainer.innerHTML = "";
		}
	}

	#formatSlabDuration(s) {
		if (s.tag && s.tag.trim()) return s.tag;
		const minM = s.min_minutes ?? 0;
		const maxM = s.max_minutes ?? 0;
		
		const formatM = (m) => {
			if (m >= 1440) {
				const days = m / 1440;
				return Number.isInteger(days) 
					? this.#t("parking.duration.day", { count: days })
					: this.#t("parking.duration.days", { count: days.toFixed(1) });
			}
			if (m >= 60) {
				const hrs = m / 60;
				return this.#t("parking.duration.hrs", { count: Number.isInteger(hrs) ? hrs : hrs.toFixed(1) });
			}
			return this.#t("parking.duration.min", { count: m });
		};

		if (minM === 0) return this.#t("parking.duration.upTo", { time: formatM(maxM) });
		return this.#t("parking.duration.range", { from: formatM(minM), to: formatM(maxM) });
	}

	#renderMonthlyPasses(passes, sym) {
		if (!passes || typeof passes !== "object") return "";
		const entries = Object.entries(passes);
		if (entries.length === 0) return "";

		return `
			<div class="tariff-pass-box">
				<span><strong>${this.#escapeHTML(this.#t("parking.monthlyPass"))}:</strong></span>
				${entries.map(([key, p]) => {
					let label = "Pass";
					if (key === "day_only") label = this.#t("parking.passes.dayOnly");
					else if (key === "full_24_7") label = this.#t("parking.passes.full247");
					else if (key === "tariff_a") label = this.#t("parking.passes.tariffA");
					else if (key === "tariff_b") label = this.#t("parking.passes.tariffB");
					else label = key;

					const timing = p.timing ? ` (${p.timing})` : "";
					return `<span><strong>${this.#escapeHTML(label)}${this.#escapeHTML(timing)}:</strong> ${sym}${p.fare}</span>`;
				}).join("")}
			</div>
		`;
	}

	#renderParkingTariffs(parkingCharges, container) {
		if (!parkingCharges || !parkingCharges.rates) {
			container.innerHTML = "";
			return;
		}

		const rates = parkingCharges.rates;
		const sym = parkingCharges.symbol || "₹";

		let html = `
			<div class="tariff-container">
				<div class="tariff-section-header">
					<span>${this.#escapeHTML(this.#t("parking.tariffsTitle"))} (${this.#escapeHTML(parkingCharges.state || "Transit Zone")})</span>
				</div>
				<div class="tariff-grid">
		`;

		// 1. 4-Wheeler Card
		if (rates.four_wheeler) {
			const fw = rates.four_wheeler;
			html += `
				<div class="tariff-card">
					<div class="tariff-card-title">
						<span>${this.#escapeHTML(this.#t("parking.car"))}</span>
					</div>
					<div class="tariff-slab-list">
						${(fw.day_charges || []).map(s => `
							<div class="tariff-slab-row">
								<span>${this.#escapeHTML(this.#formatSlabDuration(s))}</span>
								<strong>${sym}${s.fare}</strong>
							</div>
						`).join("")}
						${(fw.night_charges || []).map(s => `
							<div class="tariff-slab-row">
								<span>🌙 ${this.#escapeHTML(this.#formatSlabDuration(s))}</span>
								<strong>${sym}${s.fare}</strong>
							</div>
						`).join("")}
					</div>
					${this.#renderMonthlyPasses(fw.monthly_passes, sym)}
				</div>
			`;
		}

		// 2. 2-Wheeler Card
		if (rates.two_wheeler) {
			const tw = rates.two_wheeler;
			html += `
				<div class="tariff-card">
					<div class="tariff-card-title">
						<span>${this.#escapeHTML(this.#t("parking.bike"))}</span>
					</div>
					<div class="tariff-slab-list">
						${(tw.day_charges || []).map(s => `
							<div class="tariff-slab-row">
								<span>${this.#escapeHTML(this.#formatSlabDuration(s))}</span>
								<strong>${sym}${s.fare}</strong>
							</div>
						`).join("")}
						${(tw.night_charges || []).map(s => `
							<div class="tariff-slab-row">
								<span>🌙 ${this.#escapeHTML(this.#formatSlabDuration(s))}</span>
								<strong>${sym}${s.fare}</strong>
							</div>
						`).join("")}
					</div>
					${this.#renderMonthlyPasses(tw.monthly_passes, sym)}
				</div>
			`;
		}

		// 3. Bicycle Card (Day/Night or Slabs)
		if (rates.bicycle) {
			const b = rates.bicycle;
			const isObjBicycle = typeof b === "object" && !Array.isArray(b) && b.day_charges;
			const bSlabs = isObjBicycle ? b.day_charges : (Array.isArray(b) ? b : []);
			const bNight = isObjBicycle ? (b.night_charges || []) : [];

			html += `
				<div class="tariff-card">
					<div class="tariff-card-title">
						<span>${this.#escapeHTML(this.#t("parking.bicycleStand"))}</span>
					</div>
					<div class="tariff-slab-list">
						${bSlabs.map(s => `
							<div class="tariff-slab-row">
								<span>🚲 ${this.#escapeHTML(this.#formatSlabDuration(s))}</span>
								<strong>${sym}${s.fare}</strong>
							</div>
						`).join("")}
						${bNight.map(s => `
							<div class="tariff-slab-row">
								<span>🌙 ${this.#escapeHTML(this.#formatSlabDuration(s))}</span>
								<strong>${sym}${s.fare}</strong>
							</div>
						`).join("")}
					</div>
				</div>
			`;
		}

		// 4. Helmet Deposit Card
		if (rates.helmet && Array.isArray(rates.helmet)) {
			html += `
				<div class="tariff-card">
					<div class="tariff-card-title">
						<span>${this.#escapeHTML(this.#t("parking.helmetDeposit"))}</span>
					</div>
					<div class="tariff-slab-list">
						${rates.helmet.map(s => `
							<div class="tariff-slab-row">
								<span>🪖 ${this.#escapeHTML(this.#formatSlabDuration(s))}</span>
								<strong>${sym}${s.fare}</strong>
							</div>
						`).join("")}
					</div>
				</div>
			`;
		}

		html += `</div></div>`;
		container.innerHTML = html;
	}

	#renderTransitTable(stRich) {
		const container = document.getElementById("transit-container");
		if (!container) return;

		const liftsObj = stRich?.vertical_transit?.lifts || {};
		const escalatorsObj = stRich?.vertical_transit?.escalators || {};

		const liftKeys = Object.keys(liftsObj);
		const escKeys = Object.keys(escalatorsObj);

		if (liftKeys.length === 0 && escKeys.length === 0) {
			container.innerHTML = `<div class="empty-data-notice">${this.#escapeHTML(this.#t("verticalTransit.noTransit"))}</div>`;
			return;
		}

		let finalHTML = `<div class="bento-col-stack">`;

		// 1. Lifts Sub-Section Table
		if (liftKeys.length > 0) {
			finalHTML += `
				<div class="facility-subcategory">
					<div class="facility-subcategory-title">${this.#escapeHTML(this.#t("verticalTransit.lifts"))} (${liftKeys.length})</div>
					<div class="table-responsive-wrapper">
						<table class="station-table">
							<thead>
								<tr>
									<th>${this.#escapeHTML(this.#t("verticalTransit.code"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.location"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.placement"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.divyangFriendly"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.stretcherFriendly"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.status"))}</th>
								</tr>
							</thead>
							<tbody>
								${liftKeys.map(k => {
									const item = liftsObj[k];
									const rawLoc = item.location || item.name;
									const loc = this.#t(`verticalTransit.locations.${rawLoc}`) || rawLoc;
									const placement = item.placement === "Inside" ? this.#t("verticalTransit.inside") : (item.placement === "Outside" ? this.#t("verticalTransit.outside") : (item.placement || "Concourse"));
									return `
										<tr>
											<td><strong>${this.#escapeHTML(item.code || `LF${k}`)}</strong></td>
											<td>${this.#escapeHTML(loc)}</td>
											<td>${this.#escapeHTML(placement)}</td>
											<td class="${item.divyang_friendly ? "status-yes" : "status-no"}">${item.divyang_friendly ? this.#escapeHTML(this.#t("verticalTransit.yes")) : this.#escapeHTML(this.#t("verticalTransit.no"))}</td>
											<td class="${item.is_stretcher_lift ? "status-yes" : "status-no"}">${item.is_stretcher_lift ? this.#escapeHTML(this.#t("verticalTransit.yes")) : this.#escapeHTML(this.#t("verticalTransit.no"))}</td>
											<td class="${item.status !== false ? "status-active" : "status-maintenance"}">${item.status !== false ? this.#escapeHTML(this.#t("verticalTransit.active")) : this.#escapeHTML(this.#t("verticalTransit.maintenance"))}</td>
										</tr>
									`;
								}).join("")}
							</tbody>
						</table>
					</div>
				</div>
			`;
		}

		// 2. Escalators Sub-Section Table
		if (escKeys.length > 0) {
			finalHTML += `
				<div class="facility-subcategory">
					<div class="facility-subcategory-title">${this.#escapeHTML(this.#t("verticalTransit.escalators"))} (${escKeys.length})</div>
					<div class="table-responsive-wrapper">
						<table class="station-table">
							<thead>
								<tr>
									<th>${this.#escapeHTML(this.#t("verticalTransit.code"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.location"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.placement"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.direction"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.divyangFriendly"))}</th>
									<th>${this.#escapeHTML(this.#t("verticalTransit.status"))}</th>
								</tr>
							</thead>
							<tbody>
								${escKeys.map(k => {
									const item = escalatorsObj[k];
									const rawLoc = item.location || item.name || "Concourse Level";
									const loc = this.#t(`verticalTransit.locations.${rawLoc}`) || rawLoc;
									const placement = item.placement === "Inside" ? this.#t("verticalTransit.inside") : (item.placement === "Outside" ? this.#t("verticalTransit.outside") : (item.placement || "Concourse"));
									const dirTag = item.direction === "Up" ? this.#t("verticalTransit.up") : (item.direction === "Down" ? this.#t("verticalTransit.down") : (item.direction || "Up"));
									return `
										<tr>
											<td><strong>${this.#escapeHTML(item.code || `EC${k}`)}</strong></td>
											<td>${this.#escapeHTML(loc)}</td>
											<td>${this.#escapeHTML(placement)}</td>
											<td><span class="direction-tag">${this.#escapeHTML(dirTag)}</span></td>
											<td class="${item.divyang_friendly ? "status-yes" : "status-no"}">${item.divyang_friendly ? this.#escapeHTML(this.#t("verticalTransit.yes")) : this.#escapeHTML(this.#t("verticalTransit.no"))}</td>
											<td class="${item.status !== false ? "status-active" : "status-maintenance"}">${item.status !== false ? this.#escapeHTML(this.#t("verticalTransit.active")) : this.#escapeHTML(this.#t("verticalTransit.maintenance"))}</td>
										</tr>
									`;
								}).join("")}
							</tbody>
						</table>
					</div>
				</div>
			`;
		}

		finalHTML += `</div>`;
		container.innerHTML = finalHTML;
	}

	#renderFeederBuses(stRich) {
		const section = document.getElementById("feeder-bus-section");
		const container = document.getElementById("feeder-bus-container");
		if (!section || !container) return;

		const routes = stRich?.feederBusRouteInfo || [];
		if (routes.length === 0) {
			section.classList.add("hidden");
			return;
		}

		section.classList.remove("hidden");
		let html = "";
		routes.forEach(r => {
			const freqText = r.frequency_min ? this.#t("feederBus.frequency", { min: r.frequency_min }) : "";

			html += `
				<div class="feeder-card">
					<div class="feeder-card-header">
						<span class="feeder-route-badge">🚌 ${this.#escapeHTML(r.route_name || "Bus")}</span>
						${freqText ? `<span class="feeder-freq-chip">⏱️ ${this.#escapeHTML(freqText)}</span>` : ""}
					</div>
					<div class="feeder-route-path">
						<span>${this.#escapeHTML(r.origin || "Terminal")} ➔ ${this.#escapeHTML(r.destination || "Destination")}</span>
					</div>
					<div class="feeder-timings-row">
						<span>☀️ ${this.#escapeHTML(this.#t("feederBus.firstBus"))}: <strong>${this.#formatTo12Hour(r.first_bus)}</strong></span>
						<span>🌙 ${this.#escapeHTML(this.#t("feederBus.lastBus"))}: <strong>${this.#formatTo12Hour(r.last_bus)}</strong></span>
					</div>
				</div>
			`;
		});

		container.innerHTML = html;
	}

	#renderStationLayouts(stRich) {
		const section = document.getElementById("station-layout-section");
		const container = document.getElementById("station-layout-container");
		if (!section || !container) return;

		const layouts = stRich?.stationLayout || [];
		if (layouts.length === 0) {
			section.classList.add("hidden");
			return;
		}

		section.classList.remove("hidden");
		let html = "";
		layouts.forEach(lay => {
			const title = lay.name || lay.level?.toUpperCase() || "Level Schematic";
			const viewBtn = lay.layout_url ? `<a href="${lay.layout_url}" target="_blank" rel="noopener noreferrer" class="layout-level-btn">🗺️ ${this.#escapeHTML(this.#t("stationLayout.viewFloorPlan"))}</a>` : "";
			const pdfBtn = lay.pdf_url ? `<a href="${lay.pdf_url}" target="_blank" rel="noopener noreferrer" class="layout-level-btn" aria-label="${this.#escapeHTML(this.#t("stationLayout.downloadPdfAria"))}">📄 ${this.#escapeHTML(this.#t("stationLayout.downloadPdf"))}</a>` : "";

			html += `<div class="layout-level-title">📐 ${this.#escapeHTML(title)}</div>
				<div class="layout-level-actions">
					${viewBtn}
					${pdfBtn}
				</div>`;
		});

		container.innerHTML = html;
	}

	#renderNearbyPlaces(stRich) {
		const container = document.getElementById("nearby-container");
		if (!container) return;

		const nearbyObj = stRich?.nearby_places || {};
		const categories = Object.keys(nearbyObj);

		if (categories.length === 0) {
			container.innerHTML = `<div class="empty-data-notice">${this.#escapeHTML(this.#t("nearby.noNearby"))}</div>`;
			return;
		}

		let html = `<div class="nearby-categories-grid">`;

		categories.forEach(cat => {
			const places = nearbyObj[cat] || [];
			if (places.length === 0) return;

			const catTitle = this.#t(`nearby.categories.${cat}`) || cat;
			html += `
				<div class="nearby-cat-card">
					<div class="nearby-cat-title">🏛️ ${this.#escapeHTML(catTitle)}</div>
					<ul class="nearby-places-list">
						${places.map(p => `
							<li class="nearby-place-item">
								<span>${this.#escapeHTML(p.name)}</span>
								<span class="distance-chip">${p.distance_km ? `${p.distance_km} km` : ""} ${p.walking_min ? `| 🚶 ${p.walking_min} min` : ""}</span>
							</li>
						`).join("")}
					</ul>
				</div>
			`;
		});

		html += `</div>`;
		container.innerHTML = html;
	}

	#render404() {
		const main = document.querySelector(".station-page-container");
		if (main) {
			const notFoundTitle = this.#t("notFound.title");
			const notFoundMsg = this.#t("notFound.message", { stationId: this.#stationId });

			main.innerHTML = `
				<div class="station-not-found-state">
					<h2>${this.#escapeHTML(notFoundTitle)}</h2>
					<p>${this.#escapeHTML(notFoundMsg)}</p>
					<a href="all_stations.html?city=${encodeURIComponent(this.#currentCity)}" class="back-btn mt-md">${this.#escapeHTML(this.#t("nav.backBtn"))}</a>
				</div>
			`;
		}
	}

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
	 * Initializes In-Page Master Spotlight Search & Filter Engine
	 */
	#initSpotlightSearch() {
		const searchInput = document.getElementById("station-spotlight-input");
		const clearBtn = document.getElementById("spotlight-clear-btn");
		const chipsContainer = document.getElementById("spotlight-chips-container");
		const resetBtn = document.getElementById("spotlight-reset-btn");

		if (!searchInput) return;

		// 1. Update i18n placeholders and labels
		const placeholder = this.#t("search.placeholder") || "Search gates, ATMs, lifts, platforms, feeder buses, nearby places...";
		const ariaLabel = this.#t("search.ariaLabel") || "Filter station amenities and infrastructure";
		const clearTitle = this.#t("search.clearBtn") || "Clear search";

		searchInput.setAttribute("placeholder", placeholder);
		searchInput.setAttribute("aria-label", ariaLabel);
		if (clearBtn) clearBtn.setAttribute("aria-label", clearTitle);
		if (resetBtn) resetBtn.textContent = this.#t("search.resetBtn") || "Clear Filter";

		// 2. Build In-Memory Search Index from freshly rendered cards
		this.#buildSearchIndex();

		// 3. Attach event listeners only once
		if (!this.#spotlightInitialized) {
			this.#spotlightInitialized = true;

			searchInput.addEventListener("input", (e) => {
				this.#handleSpotlightSearch(e.target.value);
			});

			searchInput.addEventListener("keydown", (e) => {
				if (e.key === "Escape") {
					searchInput.value = "";
					this.#handleSpotlightSearch("");
				}
			});

			if (clearBtn) {
				clearBtn.addEventListener("click", () => {
					searchInput.value = "";
					searchInput.focus();
					this.#handleSpotlightSearch("");
				});
			}

			if (resetBtn) {
				resetBtn.addEventListener("click", () => {
					searchInput.value = "";
					searchInput.focus();
					this.#handleSpotlightSearch("");
				});
			}

			if (chipsContainer) {
				chipsContainer.addEventListener("click", (e) => {
					const chipBtn = e.target.closest(".spotlight-chip");
					if (!chipBtn) return;
					const targetSecId = chipBtn.dataset.target;
					const targetEl = document.getElementById(targetSecId);
					if (targetEl) {
						targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
					}
				});
			}
		}

		// If query already present (e.g. after language switch), re-run search
		if (searchInput.value.trim()) {
			this.#handleSpotlightSearch(searchInput.value);
		}
	}

	/**
	 * Builds an in-memory searchable index for all amenities and features of this station
	 */
	#buildSearchIndex() {
		this.#searchIndex = [];

		const tokenize = (text) => {
			if (!text) return [];
			return text.toLowerCase().split(/[\s,./\\|#\-+()]+/).filter(w => w.length > 1);
		};

		// 1. Platforms
		const platformCards = document.querySelectorAll("#platforms-container .platform-card");
		platformCards.forEach(card => {
			const badge = card.querySelector(".platform-badge")?.textContent || "";
			const dest = card.querySelector(".platform-dest-name")?.textContent || "";
			const line = card.querySelector(".platform-line-tag")?.textContent || "";
			const text = `${badge} ${dest} ${line} ${card.textContent || ""}`.trim();
			this.#searchIndex.push({
				category: "platforms",
				sectionId: "platforms-section",
				title: `${badge} ${dest}`,
				text,
				words: tokenize(text),
				el: card
			});
		});

		// 2. Gates
		const gateCards = document.querySelectorAll("#gates-container .gate-card-32");
		gateCards.forEach(card => {
			const num = card.querySelector(".gate-number")?.textContent || "";
			const code = card.querySelector(".gate-code-tag")?.textContent || "";
			const footer = card.querySelector(".gate-card-footer")?.textContent || "";
			const text = `${num} ${code} ${footer} ${card.textContent || ""}`.trim();
			this.#searchIndex.push({
				category: "gates",
				sectionId: "gates-section",
				title: num || code,
				text,
				words: tokenize(text),
				el: card
			});
		});

		// 3. Facilities & Amenities
		const facilityPills = document.querySelectorAll("#facilities-container .facility-pill");
		facilityPills.forEach(pill => {
			const catHeader = pill.closest(".facility-subcategory")?.querySelector(".facility-subcategory-title")?.textContent || "";
			const name = pill.querySelector(".facility-name")?.textContent || "";
			const loc = pill.querySelector(".facility-loc")?.textContent || "";
			const text = `${name} ${catHeader} ${loc} ${pill.textContent || ""}`.trim();
			this.#searchIndex.push({
				category: "facilities",
				sectionId: "facilities-section",
				title: name,
				text,
				words: tokenize(text),
				el: pill
			});
		});

		// 4. Parking (Capacity Table Rows & Tariff Cards)
		const parkingRows = document.querySelectorAll("#parking-container tbody tr");
		parkingRows.forEach(row => {
			const text = row.textContent || "";
			this.#searchIndex.push({
				category: "parking",
				sectionId: "parking-section",
				title: row.querySelector("td strong")?.textContent || "Parking",
				text,
				words: tokenize(text),
				el: row
			});
		});

		const tariffCards = document.querySelectorAll("#parking-tariffs-container .tariff-card");
		tariffCards.forEach(card => {
			const title = card.querySelector(".tariff-card-title")?.textContent || "Parking";
			const text = `${title} ${card.textContent || ""}`.trim();
			this.#searchIndex.push({
				category: "parking",
				sectionId: "parking-section",
				title,
				text,
				words: tokenize(text),
				el: card
			});
		});

		// 5. Vertical Transit (Lifts & Escalators Rows)
		const transitRows = document.querySelectorAll("#transit-container tbody tr");
		transitRows.forEach(row => {
			const code = row.querySelector("td strong")?.textContent || "";
			const subcatTitle = row.closest(".facility-subcategory")?.querySelector(".facility-subcategory-title")?.textContent || "";
			const text = `${code} ${subcatTitle} ${row.textContent || ""}`.trim();
			this.#searchIndex.push({
				category: "transit",
				sectionId: "transit-section",
				title: code,
				text,
				words: tokenize(text),
				el: row
			});
		});

		// 6. Feeder Buses
		const feederCards = document.querySelectorAll("#feeder-bus-container .feeder-card");
		feederCards.forEach(card => {
			const route = card.querySelector(".feeder-route-badge")?.textContent || "";
			const path = card.querySelector(".feeder-route-path")?.textContent || "";
			const text = `${route} ${path} ${card.textContent || ""}`.trim();
			this.#searchIndex.push({
				category: "feederBus",
				sectionId: "feeder-bus-section",
				title: route,
				text,
				words: tokenize(text),
				el: card
			});
		});

		// 7. Nearby Places
		const nearbyItems = document.querySelectorAll("#nearby-container .nearby-place-item");
		nearbyItems.forEach(item => {
			const catTitle = item.closest(".nearby-cat-card")?.querySelector(".nearby-cat-title")?.textContent || "";
			const name = item.querySelector("span")?.textContent || "";
			const text = `${name} ${catTitle} ${item.textContent || ""}`.trim();
			this.#searchIndex.push({
				category: "nearby",
				sectionId: "nearby-section",
				title: name,
				text,
				words: tokenize(text),
				el: item
			});
		});
	}

	/**
	 * Handles real-time filtering and highlighting across all sections
	 */
	#handleSpotlightSearch(rawQuery) {
		const q = (rawQuery || "").trim().toLowerCase();
		const clearBtn = document.getElementById("spotlight-clear-btn");
		const chipsContainer = document.getElementById("spotlight-chips-container");
		const noResults = document.getElementById("spotlight-no-results");
		const emptyText = document.getElementById("spotlight-empty-text");

		if (clearBtn) {
			clearBtn.classList.toggle("hidden", q.length === 0);
		}

		const allSectionIds = [
			"platforms-section",
			"gates-section",
			"facilities-section",
			"parking-section",
			"transit-section",
			"feeder-bus-section",
			"nearby-section"
		];

		// If query is empty, reset all sections and items
		if (!q) {
			allSectionIds.forEach(secId => {
				const secEl = document.getElementById(secId);
				if (secEl) {
					secEl.classList.remove("spotlight-dimmed", "spotlight-has-matches");
				}
			});

			this.#searchIndex.forEach(item => {
				item.el.classList.remove("spotlight-match", "spotlight-dimmed-item");
			});

			if (chipsContainer) {
				chipsContainer.innerHTML = "";
				chipsContainer.classList.add("hidden");
			}
			if (noResults) {
				noResults.classList.add("hidden");
			}
			return;
		}

		// Perform matching against index
		const matchedItems = [];
		const matchedSections = new Set();
		const categoryCounts = {};
		const categoryTargetMap = {};

		for (const item of this.#searchIndex) {
			const itemTextLower = item.text.toLowerCase();
			const isSubstring = itemTextLower.includes(q);
			const isTypo = this.#searchEngine.hasTypoMatch(q, item.title, item.words);
			const isAcronym = this.#searchEngine.generateAcronym(item.title) === q;

			if (isSubstring || isTypo || isAcronym) {
				matchedItems.push(item);
				matchedSections.add(item.sectionId);
				categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
				categoryTargetMap[item.category] = item.sectionId;
			}
		}

		// Update feature-card sections
		allSectionIds.forEach(secId => {
			const secEl = document.getElementById(secId);
			if (!secEl) return;

			if (matchedSections.has(secId)) {
				secEl.classList.remove("spotlight-dimmed");
				secEl.classList.add("spotlight-has-matches");
			} else {
				secEl.classList.add("spotlight-dimmed");
				secEl.classList.remove("spotlight-has-matches");
			}
		});

		// Update individual items
		const matchedElSet = new Set(matchedItems.map(m => m.el));
		for (const item of this.#searchIndex) {
			if (matchedElSet.has(item.el)) {
				item.el.classList.add("spotlight-match");
				item.el.classList.remove("spotlight-dimmed-item");
			} else {
				item.el.classList.remove("spotlight-match");
				if (matchedSections.has(item.sectionId)) {
					item.el.classList.add("spotlight-dimmed-item");
				} else {
					item.el.classList.remove("spotlight-dimmed-item");
				}
			}
		}

		// Jump chips and empty state feedback
		if (matchedItems.length > 0) {
			if (noResults) noResults.classList.add("hidden");

			if (chipsContainer) {
				let chipsHTML = "";
				for (const [cat, count] of Object.entries(categoryCounts)) {
					const targetSecId = categoryTargetMap[cat];
					const catLabel = this.#t(`search.categories.${cat}`) || cat;
					chipsHTML += `
						<button type="button" class="spotlight-chip" data-target="${targetSecId}">
							<span>${this.#escapeHTML(catLabel)}</span>
							<span class="spotlight-chip-count">${count}</span>
						</button>
					`;
				}
				chipsContainer.innerHTML = chipsHTML;
				chipsContainer.classList.remove("hidden");
			}
		} else {
			if (chipsContainer) {
				chipsContainer.innerHTML = "";
				chipsContainer.classList.add("hidden");
			}
			if (noResults) {
				if (emptyText) {
					emptyText.textContent = this.#t("search.noResults", { query: rawQuery }) || `No amenities match "${rawQuery}"`;
				}
				noResults.classList.remove("hidden");
			}
		}
	}

}

// Auto-instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
	const app = new StationInfoManager();
	app.init();
});