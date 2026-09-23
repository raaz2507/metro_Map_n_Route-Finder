/**
 * Station Details & Facilities Page Controller
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Fully compliant with Universal Transit Master Schema (v3.0)
 */
import { metroDataStore } from "../core/metro-data-store.js";
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import i18n from "../core/i18n.js";
import { appStateStore } from "../core/app-state-store.js";

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

	// Localization
	#lang = "en";

	constructor() {
		this.#extractParams();
		this.#lang = appStateStore.getState("currentLang") || "en";
	}

	/**
	 * Helper for nested i18n translation lookups
	 */
	#t(path, vars = {}) {
		return i18n.t(`station_info.${path}`, vars);
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
		HeaderComponent.render("stations");
		FooterComponent.render();

		try {
			// 1. Asynchronously load transit graph data and detailed facilities
			this.#metroData = await metroDataStore.loadCity(this.#currentCity);
			this.#stationsDetailData = await metroDataStore.loadStationsDetail(this.#currentCity);

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
		} catch (error) {
			console.error("[StationInfoManager] Failed to load station info:", error);
			this.#render404();
		}
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
			backBtn.href = `all_stations.html?city=${encodeURIComponent(this.#currentCity)}`;
		}
	}

	#renderRouteTrack(stBasic) {
		const container = document.getElementById("route-track-container");
		if (!container) return;

		const lineKeys = stBasic?.lines || [];
		const neighbors = stBasic?.neighbors || [];
		if (lineKeys.length === 0 && neighbors.length === 0) {
			container.style.display = "none";
			return;
		}

		container.style.display = "grid";
		const primaryLineColor = this.#metroLines[lineKeys[0]]?.color || "#007bff";

		let prevStackHTML = "";
		let nextStackHTML = "";
		const currentName = stBasic?.name?.[this.#lang] || stBasic?.name?.en || this.#stationId.toUpperCase();

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

			const prevStObj = prevNeighbor ? this.#metroStations[prevNeighbor.station] : null;
			const nextStObj = nextNeighbor ? this.#metroStations[nextNeighbor.station] : null;

			const prevName = prevStObj ? (prevStObj.name?.[this.#lang] || prevStObj.name?.en) : (prevNeighbor ? prevNeighbor.station.toUpperCase() : "Terminal");
			const nextName = nextStObj ? (nextStObj.name?.[this.#lang] || nextStObj.name?.en) : (nextNeighbor ? nextNeighbor.station.toUpperCase() : "Terminal");

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
			container.style.display = "none";
			return;
		}
		container.style.display = "block";
		let linesHTML = '<div class="line-info-master-wrapper">';

		lineKeys.forEach(lineId => {
			const lineInfo = this.#metroLines[lineId];
			if (!lineInfo) return;
			const lineColor = lineInfo.color || "#007bff";
			const label = lineInfo.label ? `Line ${lineInfo.label}` : "Metro";
			const colorName = lineInfo.name?.[this.#lang] || lineInfo.name?.en || lineId.toUpperCase();
			
			const network = (lineInfo.network || "Transit").toUpperCase();
			const operator = (lineInfo.operator || "Operator").toUpperCase();
			const fromId = lineInfo.route?.from;
			const toId = lineInfo.route?.to;
			const fromSt = fromId ? (this.#metroStations[fromId]?.name?.[this.#lang] || this.#metroStations[fromId]?.name?.en || fromId.toUpperCase()) : "Origin";
			const toSt = toId ? (this.#metroStations[toId]?.name?.[this.#lang] || this.#metroStations[toId]?.name?.en || toId.toUpperCase()) : "Destination";
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

		const stationTitle = stBasic?.name?.[this.#lang] || stBasic?.name?.en || stRich?.id?.toUpperCase() || this.#stationId.toUpperCase();
		const code = (stBasic?.id || stRich?.id || this.#stationId).toUpperCase();
		const layoutType = stRich?.type || stBasic?.properties?.layout || "Elevated";
		
		let descText = "";
		if (stRich?.description && typeof stRich.description === "object" && !Array.isArray(stRich.description)) {
			descText = stRich.description[this.#lang] || stRich.description.en || "";
		}
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
					<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="gis-map-btn">${this.#escapeHTML(this.#t("hero.openInMaps"))}</a>
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
					<span style="font-weight:600;">🗓️ ${this.#escapeHTML(this.#t("timings.sundayTitle"))}:</span>
				</div>
				<div class="compact-timing-row">
					<span>☀️ <strong>${this.#escapeHTML(this.#t("timings.first"))}:</strong> <span style="color:rgb(var(--color-success-rgb)); font-weight:700;">${this.#formatTo12Hour(sunFirst)}</span></span>
					<span>🌙 <strong>${this.#escapeHTML(this.#t("timings.last"))}:</strong> <span style="color:rgb(var(--color-danger-rgb)); font-weight:700;">${this.#formatTo12Hour(sunLast)}</span></span>
				</div>
			`;
		}

		container.innerHTML = `
			<div class="compact-timing-row">
				<span>${this.#escapeHTML(this.#t("timings.title"))}</span>
			</div>
			<div class="compact-timing-row border-top-dashed">
				<span>☀️ <strong>${this.#escapeHTML(this.#t("timings.first"))}:</strong> <span style="color:rgb(var(--color-success-rgb)); font-weight:700;">${firstTrain}</span></span>
				<span>🌙 <strong>${this.#escapeHTML(this.#t("timings.last"))}:</strong> <span style="color:rgb(var(--color-danger-rgb)); font-weight:700;">${lastTrain}</span></span>
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
					<div style="font-weight:700; color:var(--btn-primary-bg); margin-top:3px;">${this.#escapeHTML(landline)}</div>
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
			const lineColor = lineInfo?.color || "#007bff";
			const lineName = lineInfo?.short_name?.[this.#lang] || lineInfo?.name?.[this.#lang] || lineInfo?.name?.en || p.line?.toUpperCase() || "Metro";
			
			// Destination fallback resolution
			let destName = "";
			if (p.destination) {
				const destStation = this.#metroStations[p.destination];
				destName = destStation ? (destStation.name?.[this.#lang] || destStation.name?.en) : p.destination.toUpperCase();
			} else if (lineInfo?.route) {
				const fallbackDestId = pNum === "1" ? (lineInfo.route.to || lineInfo.route.from) : (lineInfo.route.from || lineInfo.route.to);
				const destStation = fallbackDestId ? this.#metroStations[fallbackDestId] : null;
				destName = destStation ? (destStation.name?.[this.#lang] || destStation.name?.en) : (fallbackDestId ? fallbackDestId.toUpperCase() : "Terminal");
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
			const status = (g.status || "OPEN").toUpperCase();
			const statusClass = status === "OPEN" ? "status-active" : "status-maintenance";
			const landmark = g.landmark?.[this.#lang] || g.landmark?.en || g.landmark?.hi || "Exit Gate Area";

			html += `
				<div class="gate-card-32">
					<div class="gate-card-header">
						<div class="gate-title-group">
							<span class="gate-number">Gate No. ${this.#escapeHTML(gNum)}</span>
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

			html += `
				<div class="facility-subcategory">
					<div class="facility-subcategory-title">🔹 ${this.#escapeHTML(cat)} (${items.length})</div>
					<div class="facility-items-flex">
						${items.map(item => `
							<div class="facility-pill">
								<span class="facility-name">${this.#escapeHTML(item.name || cat)}</span>
								<span class="facility-loc">📍 ${this.#escapeHTML(item.location || "Concourse")} ${item.purpose ? `| ${this.#escapeHTML(item.purpose)}` : ""}</span>
							</div>
						`).join("")}
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
				tableHTML += `
					<tr>
						<td><strong>${this.#escapeHTML(p.provider || "Authorised Parking")}</strong></td>
						<td>${p.capacity_car ?? "--"}</td>
						<td>${p.capacity_motorcycle ?? "--"}</td>
						<td>${p.capacity_cycle ?? "--"}</td>
						<td>${this.#escapeHTML(p.location || "Near Exit Gate")}</td>
					</tr>
				`;
			});

			tableHTML += `</tbody></table></div>`;
			capacityContainer.innerHTML = tableHTML;
		} else if (parkingCharges) {
			// In stations like Daurli (NCRTC), parking is active with direct official rate cards
			capacityContainer.innerHTML = `
				<div class="facility-pill" style="width: 100%; border-left: 4px solid rgb(var(--color-success-rgb));">
					<span class="facility-name">🅿️ Authorised Multimodal Station Parking (${this.#escapeHTML(parkingCharges.state || "Active")})</span>
					<span class="facility-loc">Available 24x7 with automated smart ticketing, CCTV surveillance, and designated Divyang slots. Check tariff card below.</span>
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
				return Number.isInteger(days) ? `${days} Day` : `${days.toFixed(1)} Days`;
			}
			if (m >= 60) {
				const hrs = m / 60;
				return Number.isInteger(hrs) ? `${hrs} hrs` : `${hrs.toFixed(1)} hrs`;
			}
			return `${m} min`;
		};

		if (minM === 0) return `Up to ${formatM(maxM)}`;
		return `${formatM(minM)} to ${formatM(maxM)}`;
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
					if (key === "day_only") label = "Day Pass";
					else if (key === "full_24_7") label = "24/7 Pass";
					else if (key === "tariff_a") label = "General Pass";
					else if (key === "tariff_b") label = "Executive Pass";
					else label = key.replace(/_/g, " ").toUpperCase();

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
									const loc = item.location || item.name || "Concourse Level";
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
									const loc = item.location || item.name || "Concourse Level";
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
			const pdfBtn = lay.pdf_url ? `<a href="${lay.pdf_url}" target="_blank" rel="noopener noreferrer" class="layout-level-btn">📄 ${this.#escapeHTML(this.#t("stationLayout.downloadPdf"))}</a>` : "";

			html += `
				<div class="layout-level-card">
					<div class="layout-level-title">📐 ${this.#escapeHTML(title)}</div>
					<div style="display:flex; gap:var(--space-xs); flex-wrap:wrap;">
						${viewBtn}
						${pdfBtn}
					</div>
				</div>
			`;
		});

		container.innerHTML = html;
	}

	#renderNearbyPlaces(stRich) {
		const container = document.getElementById("nearby-container");
		if (!container) return;

		const nearbyObj = stRich?.nearby_places || {};
		const categories = Object.keys(nearbyObj);

		if (categories.length === 0) {
			container.innerHTML = `<div class="empty-data-notice">${this.#escapeHTML(this.#t("nearby.noLandmarks"))}</div>`;
			return;
		}

		let html = `<div class="nearby-categories-grid">`;

		categories.forEach(cat => {
			const places = nearbyObj[cat] || [];
			if (places.length === 0) return;

			html += `
				<div class="nearby-cat-card">
					<div class="nearby-cat-title">🏛️ ${this.#escapeHTML(cat)}</div>
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
			main.innerHTML = `
				<div style="text-align:center; padding:5rem 1rem; color:var(--text-secondary);">
					<h2 style="font-size:2rem; margin-bottom:1rem;">⚠️ Station Not Found</h2>
					<p>The requested station code/ID "<strong>${this.#escapeHTML(this.#stationId)}</strong>" was not found in our metro directory.</p>
					<a href="all_stations.html?city=${encodeURIComponent(this.#currentCity)}" class="back-btn" style="margin-top:1.5rem;">${this.#escapeHTML(this.#t("nav.backBtn"))}</a>
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
}

// Auto-instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
	const app = new StationInfoManager();
	app.init();
});