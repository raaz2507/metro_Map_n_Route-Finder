/**
 * 🗺️ JourneyDetailsView - Dynamic Route Result UI Component
 * Features: O(1) Instant Fare Selection & LocalStorage Persistence
 */
import { centerClass } from "../core/CenterClass.js";
import { formatTime12h } from "../core/data-utils.js";
import i18n from "../core/i18n.js";

export class JourneyDetailsView {
	#container = null;
	#settings = { currentLang: "en" };
	#mapObj = null;

	constructor(containerSelector = "#journeyDetails .route-overview", mapObj = null) {
		this.#container = document.querySelector(containerSelector);
		this.#mapObj = mapObj;
	}

	setMapEngine(mapObj) {
		this.#mapObj = mapObj;
	}

	render(routeInfo, currentLang = "en") {
		if (!this.#container || !routeInfo || !Array.isArray(routeInfo.path) || routeInfo.path.length === 0) return;
		this.#settings.currentLang = currentLang;
		this.#container.innerHTML = "";

		this.#updateQuickOverviewValues(routeInfo);

		const path = routeInfo.path;
		const startName = centerClass.getStationName(path[0], this.#settings.currentLang);
		const endName = centerClass.getStationName(path[path.length - 1], this.#settings.currentLang);

		this.#renderWarningBanner(this.#container);
		this.#renderJourneyHeader(this.#container, startName, endName);
		this.#renderMetricsCard(this.#container, routeInfo, path.length);
		this.#renderTimelineCard(this.#container, routeInfo);

		const journeyDetails = document.getElementById("journeyDetails");
		if (journeyDetails) journeyDetails.classList.add("active");
	}

	clear() {
		if (this.#container) this.#container.innerHTML = "";
		this.#updateQuickOverviewValues({ totalDistanceMeters: 0, totalTravelTimeSeconds: 0, totalStations: 0, fare: { totalFare: 0 } });
		const journeyDetails = document.getElementById("journeyDetails");
		if (journeyDetails) journeyDetails.classList.remove("active");
	}

	#updateQuickOverviewValues(routeInfo) {
		const totalStation = document.querySelector("#journeyDetails .total_station .value");
		const timeVal = document.querySelector("#journeyDetails .time .value");
		const fareVal = document.querySelector("#journeyDetails .fare_amount .value");
		const interchangeVal = document.querySelector("#journeyDetails .interchange_count .value");
		const distanceVal = document.querySelector("#journeyDetails .distance .value");

		const totalMin = Math.round((routeInfo.totalTravelTimeSeconds || 0) / 60);
		const distKm = ((routeInfo.totalDistanceMeters || 0) / 1000).toFixed(2);
		const fare = routeInfo.fare?.totalFare || 0;

		if (totalStation) totalStation.textContent = routeInfo.totalStations || 0;
		if (timeVal) timeVal.textContent = totalMin;
		if (interchangeVal) interchangeVal.textContent = routeInfo.interchangesCount || 0;
		if (distanceVal) distanceVal.textContent = distKm;
		if (fareVal) fareVal.textContent = fare;
	}

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

	#renderMetricsCard(parent, routeInfo, totalSteps) {
		const metricsCard = document.createElement("div");
		metricsCard.className = "journey-metrics-card";

		const timeLabel = i18n.t("pages.home.sidebar.findroute.route.minutesLabel") || "Minutes";
		const changeLabel = i18n.t("pages.home.sidebar.findroute.route.lineChangeLabel") || "Line Change";
		const stationsLabel = i18n.t("pages.home.sidebar.findroute.route.stationsLabel") || "Stations";
		const distanceLabel = i18n.t("pages.home.sidebar.findroute.route.distanceLabel") || "Distance";
		
		const distNum = ((routeInfo.totalDistanceMeters || 0) / 1000).toFixed(1);
		const totalMin = Math.round((routeInfo.totalTravelTimeSeconds || 0) / 60);

		// 🎯 LOCAL STORAGE: Get user's preferred coach class
		let preferredClass = "standard";
		try {
			preferredClass = localStorage.getItem("preferred_coach_class") || "standard";
		} catch (e) {}

		// 🛠️ HELPER FUNCTION: Find the default product for any leg
		const getDefaultProduct = (prods) => {
			let selectedKey = null;
			let selectedFare = 0;
			for (const [key, p] of Object.entries(prods)) {
				if (preferredClass === "premium" && p.isPremium) {
					selectedKey = key; selectedFare = p.fare; break;
				} else if (preferredClass === "standard" && !p.isPremium && !selectedKey) {
					selectedKey = key; selectedFare = p.fare;
				}
			}
			if (!selectedKey && Object.keys(prods).length > 0) {
				const firstKey = Object.keys(prods)[0];
				selectedKey = firstKey;
				selectedFare = prods[firstKey].fare;
			}
			return { selectedKey, selectedFare };
		};

		let initialGrandTotal = 0;

		// 1. Single Leg Dynamic Fares
		let dynamicFaresHtml = "";
		if (!routeInfo.fare?.isMultiTicket) {
			const products = routeInfo.fare?.products || {};
			const { selectedKey, selectedFare } = getDefaultProduct(products);
			initialGrandTotal = selectedFare || routeInfo.fare?.totalFare || 0;

			for (const [key, prod] of Object.entries(products)) {
				const isSelected = key === selectedKey;
				const labelName = prod.label?.[this.#settings.currentLang] || prod.label?.en || "Fare";
				const badgeHtml = prod.isDiscounted && prod.discountPercent > 0 
					? `<br><span class="fare-badge badge-blue">(${prod.discountPercent}% Off)</span>` : "";
				
				dynamicFaresHtml += `
					<div class="fare-selectable-col">
						<div class="fare-selectable-card ${isSelected ? 'selected' : ''}" 
							 data-leg-index="0" data-fare="${prod.fare}" data-is-premium="${prod.isPremium ? 'true' : 'false'}">
							<span class="metric-val ${prod.isDiscounted ? 'color-blue' : ''}">₹${prod.fare}</span>
							<span class="metric-lbl">${labelName}${badgeHtml}</span>
						</div>
					</div>
				`;
			}
		}

		// 2. Multi-Leg Breakdown Dynamic Fares
		let legsHtml = "";
		if (routeInfo.fare?.isMultiTicket) {
			legsHtml = (routeInfo.fare.legs || []).map((leg, legIndex) => {
				const { selectedKey, selectedFare } = getDefaultProduct(leg.products || {});
				initialGrandTotal += selectedFare; 

				const fromName = centerClass.getStationName(leg.fromStation, this.#settings.currentLang);
				const toName = centerClass.getStationName(leg.toStation, this.#settings.currentLang);
				const lName = leg.lineName?.[this.#settings.currentLang] || leg.lineName?.en || leg.lineName;
				
				const alertsHtml = (leg.alerts || []).map(a => {
					const alertText = i18n.t(a.i18nKey, a.params || {}) || a.defaultText;
					return `<div class="leg-alert-pill ${a.type}"><span>${a.icon}</span> <span>${alertText}</span></div>`;
				}).join("");

				let legFaresHtml = "";
				for (const [key, prod] of Object.entries(leg.products || {})) {
					const isSelected = key === selectedKey;
					const pLabel = prod.label?.[this.#settings.currentLang] || prod.label?.en || "Fare";
					const pBadge = prod.isDiscounted && prod.discountPercent > 0 
						? `<br><span class="fare-badge badge-blue">(${prod.discountPercent}% Off)</span>` : "";
					
					legFaresHtml += `
						<div class="fare-selectable-col">
							<div class="fare-selectable-card ${isSelected ? 'selected' : ''}" 
								 data-leg-index="${legIndex}" data-fare="${prod.fare}" data-is-premium="${prod.isPremium ? 'true' : 'false'}">
								<span class="metric-val ${prod.isDiscounted ? 'color-blue' : ''}">₹${prod.fare}</span>
								<span class="metric-lbl">${pLabel}${pBadge}</span>
							</div>
						</div>
					`;
				}

				return `
					<div class="leg-item-card">
						<div class="leg-card-header">
							<span class="line-badge-solid" style="background-color: ${leg.lineColor}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${lName}</span>
							<span class="leg-route-title" style="font-weight: 600; font-size: 0.85rem;">${fromName} ➔ ${toName}</span>
						</div>
						${alertsHtml ? `<div class="leg-alerts-list" style="margin: 6px 0; display: flex; flex-direction: column; gap: 4px;">${alertsHtml}</div>` : ""}
						
						<div class="metrics-row leg-mini-row" style="background: rgba(0,0,0,0.02); padding: 8px 6px; border-radius: 6px;">
							<div class="metric-col"><span class="metric-val color-indigo" style="font-size: 0.95rem;">${leg.distanceKm} <small style="font-size:0.75em;">km</small></span><span class="metric-lbl">${distanceLabel}</span></div>
							<div class="metric-col"><span class="metric-val color-emerald" style="font-size: 0.95rem;">${leg.travelMinutes}</span><span class="metric-lbl">${timeLabel}</span></div>
							<div class="metric-col"><span class="metric-val color-sky" style="font-size: 0.95rem;">${leg.stationsCount}</span><span class="metric-lbl">${stationsLabel}</span></div>
							<div class="metric-col"><span class="metric-val color-amber" style="font-size: 0.95rem;">${leg.interchangesCount || 0}</span><span class="metric-lbl">${changeLabel}</span></div>
						</div>

						<div class="fare-cards-row" style="margin-top: 6px; padding: 8px 6px; background: rgba(0,0,0,0.02); border-radius: 6px;">
							${legFaresHtml}
						</div>
					</div>
				`;
			}).join("");
		}

		const startStationId = routeInfo?.path?.[0];
		const startStation = centerClass.getStationDetails(startStationId);
		const schedule = startStation?.train_schedule;

		const firstTrainDisplay = schedule?.first_train ? formatTime12h(schedule.first_train) : "N/A";
		const lastTrainDisplay = schedule?.last_train ? formatTime12h(schedule.last_train) : "N/A";

		// 🎯 Added these missing variables back!
		const firstText = `${i18n.t("pages.home.sidebar.findroute.route.first") || "First"} Train`;
		const lastText = `${i18n.t("pages.home.sidebar.findroute.route.last") || "Last"} Train`;

		metricsCard.innerHTML = `
			<div class="metrics-row">
				<div class="metric-col">
					<span class="metric-val color-indigo">${distNum} <small style="font-weight:400; font-size:0.75em; opacity:0.8;">km</small></span>
					<span class="metric-lbl">${distanceLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-emerald">${totalMin}</span>
					<span class="metric-lbl">${timeLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-sky">${totalSteps}</span>
					<span class="metric-lbl">${stationsLabel}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-amber">${routeInfo.interchangesCount || 0}</span>
					<span class="metric-lbl">${changeLabel}</span>
				</div>
			</div>

			<div class="metrics-row" style="margin-top: 14px; border-top: 1px dashed var(--border-color); padding-top: 12px;">
				${dynamicFaresHtml ? `<div class="fare-cards-row">${dynamicFaresHtml}</div>` : `
					<div class="metric-col" style="width: 100%; text-align: center; border: none;">
						<span class="metric-val" id="cardGrandTotalDisplay">₹${initialGrandTotal}</span>
						<span class="metric-lbl">Total Fare</span>
					</div>
				`}
			</div>
			
			<div class="timing-subrow" style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
				<div class="timing-item">☀️ ${firstText} <strong>${firstTrainDisplay}</strong></div>
				<div class="timing-item">🌙 ${lastText} <strong>${lastTrainDisplay}</strong></div>
			</div>

			${routeInfo.fare?.isMultiTicket ? `
				<div class="fare-breakdown-toggle-box" style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
					<button type="button" class="fare-breakdown-btn" id="fareBreakdownBtn">
						<span class="btn-text">ℹ️ ${i18n.t("pages.home.sidebar.findroute.route.breakdownToggle", { count: routeInfo.fare.legs?.length || 2 })}</span>
						<span class="btn-arrow" id="fareBreakdownArrow">▼</span>
					</button>
					
					<div class="fare-legs-container" id="fareLegsContent" style="display: none; margin-top: 10px; flex-direction: column; gap: 10px;">
						${legsHtml}
					</div>
				</div>
			` : ""}
		`;

		parent.appendChild(metricsCard);

		// 🎯 FORCE INITIAL SYNC
		setTimeout(() => {
			const topFareVal = document.querySelector("#journeyDetails .fare_amount .value");
			if (topFareVal) topFareVal.textContent = initialGrandTotal;
			
			const cardTotalVal = document.getElementById("cardGrandTotalDisplay");
			if (cardTotalVal) cardTotalVal.textContent = `₹${initialGrandTotal}`;
		}, 0);

		// 🎯 O(1) CLICK LISTENERS & UPDATE GRAND TOTAL
		const fareCards = metricsCard.querySelectorAll(".fare-selectable-card");
		fareCards.forEach(card => {
			card.addEventListener("click", () => {
				const legIdx = card.getAttribute("data-leg-index");

				// 1. Deselect other cards ONLY in the same Leg
				metricsCard.querySelectorAll(`.fare-selectable-card[data-leg-index="${legIdx}"]`).forEach(c => {
					c.classList.remove("selected");
				});

				// 2. Select the clicked card
				card.classList.add("selected");

				// 3. Recalculate Grand Total across ALL legs
				let newGrandTotal = 0;
				metricsCard.querySelectorAll(".fare-selectable-card.selected").forEach(selCard => {
					newGrandTotal += Number(selCard.getAttribute("data-fare")) || 0;
				});

				// 4. Update Both Totals on UI instantly
				const topFareVal = document.querySelector("#journeyDetails .fare_amount .value");
				if (topFareVal) topFareVal.textContent = newGrandTotal;

				const cardTotalVal = document.getElementById("cardGrandTotalDisplay");
				if (cardTotalVal) cardTotalVal.textContent = `₹${newGrandTotal}`;

				// 5. Save Preference securely
				try {
					const isPrem = card.getAttribute("data-is-premium") === "true";
					localStorage.setItem("preferred_coach_class", isPrem ? "premium" : "standard");
				} catch (e) {}
			});
		});

		if (routeInfo.fare?.isMultiTicket) {
			const toggleBtn = metricsCard.querySelector("#fareBreakdownBtn");
			const content = metricsCard.querySelector("#fareLegsContent");
			const arrow = metricsCard.querySelector("#fareBreakdownArrow");
			if (toggleBtn && content) {
				toggleBtn.addEventListener("click", () => {
					const isHidden = content.style.display === "none";
					content.style.display = isHidden ? "flex" : "none";
					if (arrow) arrow.textContent = isHidden ? "▲" : "▼";
				});
			}
		}
	}

	#renderTimelineCard(parent, routeInfo) {
		const timelineCard = document.createElement("div");
		timelineCard.className = "timeline-card";

		const timelineContainer = document.createElement("div");
		timelineContainer.className = "route-timeline";

		const steps = routeInfo.steps || [];
		let globalStationIndex = 0;
		let animationRowCounter = 0; 

		const firstStationId = routeInfo.path[0];
		const lastStationId = routeInfo.path[routeInfo.path.length - 1];
		const currentCity = localStorage.getItem("active_city") || "delhi_ncr";

		steps.forEach((step, segmentIndex) => {
			const lineName = step.shortName?.[this.#settings.currentLang] || step.shortName?.en || step.line;
			const lineColor = step.lineColor || "#007bff";

			const segmentEl = document.createElement("div");
			segmentEl.className = "timeline-segment";

			const toName = centerClass.getStationName(step.toStation, this.#settings.currentLang);
			const terminalName = step.terminalName?.[this.#settings.currentLang] || step.terminalName?.en || toName;
			const platformNo = step.platformNo || 1;

			const isYellowLike = lineColor.toLowerCase() === "#ffd514" || lineColor.toLowerCase() === "#ffff00";
			const badgeTextColor = isYellowLike ? "#000000" : "#ffffff";

			const segHeader = document.createElement("div");
			segHeader.className = "segment-header";
			segHeader.style.setProperty("--delay", `${animationRowCounter * 120}ms`);
			segHeader.innerHTML = `
				<span class="line-badge-solid" style="background-color: ${lineColor}; color: ${badgeTextColor};">${lineName}</span>
				<span class="segment-direction">➔ Towards ${terminalName.toUpperCase()} · Platform ${platformNo}</span>
			`;
			segmentEl.appendChild(segHeader);
			animationRowCounter++;

			const stations = step.stations || [];
			stations.forEach((st, idx) => {
				if (segmentIndex > 0 && idx === 0) return;

				const name = centerClass.getStationName(st.id, this.#settings.currentLang);
				const isFirstOverall = st.id === firstStationId;
				const isLastOverall = st.id === lastStationId;
				const isInterchange = (idx === stations.length - 1) && (segmentIndex < steps.length - 1);
				globalStationIndex++;

				let gateBadgeHtml = "";
				if (isFirstOverall || isLastOverall) {
					gateBadgeHtml = `<span class="badge-gate">🚪 Gate</span>`;
				}

				const hopText = st.hopDistanceKm ? `${st.hopDistanceKm} km · ` : "";

				let dotClass = "station-dot-solid";
				let dotStyle = `background-color: ${lineColor}; color: ${badgeTextColor};`;
				let trackColor = lineColor;

				if (isInterchange) {
					const nextStep = steps[segmentIndex + 1];
					const metroData = centerClass.getMetroData();
					const nextLineInfo = metroData?.lines?.[nextStep.line];
					const nextLineColor = nextLineInfo?.color || lineColor;

					dotClass = "station-dot-solid interchange-node";
					dotStyle = `border-left-color: ${lineColor}; border-top-color: ${lineColor}; border-right-color: ${nextLineColor}; border-bottom-color: ${nextLineColor};`;
					trackColor = nextLineColor; 
				}

				const rowEl = document.createElement("div");
				rowEl.className = "station-row";
				rowEl.style.setProperty("--line-color", lineColor);
				rowEl.style.setProperty("--delay", `${animationRowCounter * 120}ms`);
				rowEl.innerHTML = `
					<div class="station-track">
						<div class="${dotClass}" style="${dotStyle}">
							${globalStationIndex}
						</div>
						<div class="station-track-line" style="background-color: ${trackColor};"></div>
					</div>
					<div class="station-info">
						<a href="station_info.html?id=${encodeURIComponent(st.id)}&city=${encodeURIComponent(currentCity)}" 
						   class="station-name-main" 
						   target="_blank" 
						   rel="noopener noreferrer" 
						   title="${name}">
							${name}
							${gateBadgeHtml}
						</a>
						<span class="station-time-cumulative">${hopText}~${st.timeMinutes}m</span>
					</div>
				`;
				segmentEl.appendChild(rowEl);
				animationRowCounter++;
			});

			timelineContainer.appendChild(segmentEl);

			if (segmentIndex < steps.length - 1) {
				const nextStep = steps[segmentIndex + 1];
				const metroData = centerClass.getMetroData();
				const nextLineInfo = metroData?.lines?.[nextStep.line];
				const nextLineColor = nextLineInfo?.color || lineColor;
				const nextLineName = nextStep.shortName?.[this.#settings.currentLang] || nextStep.shortName?.en || nextStep.line;
				const transferMins = Math.ceil((step.nextTransferSeconds || 180) / 60);
				const transferDistText = step.nextTransferDistanceMeters ? `${step.nextTransferDistanceMeters} m · ` : "";

				const tData = step.nextTransfer || {};
				const mode = tData.transferMode;
				const dist = tData.distanceMeters || step.nextTransferDistanceMeters;
				let modeBadgeHtml = "";

				if (mode === "cross_platform") {
					const label = i18n.t("pages.home.sidebar.findroute.route.transferModes.crossPlatform") || "Cross-Platform";
					modeBadgeHtml = `<span class="transfer-pill-badge transfer-pill-mode">↔️ ${label}</span>`;
				} else if (mode === "vertical") {
					const levels = tData.levels || 1;
					const label = i18n.t("pages.home.sidebar.findroute.route.transferModes.levelChange", { level: levels }) || `Level ${levels} Change`;
					modeBadgeHtml = `<span class="transfer-pill-badge transfer-pill-mode">↕️ ${label}</span>`;
				} else if (mode === "skywalk") {
					const label = i18n.t("pages.home.sidebar.findroute.route.transferModes.skywalk", { distance: dist }) || `Skywalk (${dist}m)`;
					modeBadgeHtml = `<span class="transfer-pill-badge transfer-pill-mode">🌉 ${label}</span>`;
				} else if (mode === "corridor") {
					const label = i18n.t("pages.home.sidebar.findroute.route.transferModes.corridor", { distance: dist }) || `Corridor (${dist}m)`;
					modeBadgeHtml = `<span class="transfer-pill-badge transfer-pill-mode">🚶 ${label}</span>`;
				}

				let featureBadgesHtml = "";
				if (tData.freeERickshaw) {
					const label = i18n.t("pages.home.sidebar.findroute.route.transferModes.freeERickshaw") || "Free E-Rickshaw";
					featureBadgesHtml += `<span class="transfer-pill-badge transfer-pill-rickshaw">🛺 ${label}</span>`;
				}
				if (tData.securityCheckRequired) {
					const label = i18n.t("pages.home.sidebar.findroute.route.transferModes.securityCheck") || "Security Check";
					featureBadgesHtml += `<span class="transfer-pill-badge transfer-pill-security">🛡️ ${label}</span>`;
				}

				const interchangeContainer = document.createElement("div");
				interchangeContainer.className = "interchange-container";
				interchangeContainer.style.setProperty("--delay", `${animationRowCounter * 120}ms`);
				interchangeContainer.innerHTML = `
					<div class="interchange-track">
						<div class="interchange-track-line" style="border-color: ${nextLineColor};"></div>
					</div>
					<div class="interchange-card">
						<div class="interchange-content">
							<span class="interchange-icon-walk">
								<img src="assets/sprites/footstep.webp" class="interchange-icon-walk" alt="walk">
							</span>
							<div class="interchange-details-col">
								<span>
									Change to <strong>${nextLineName}</strong>
								</span>
								<div class="interchange-badges-row">
									${modeBadgeHtml}
									${featureBadgesHtml}
								</div>
							</div>
						</div>
						<span class="interchange-time-badge">${transferDistText}~${transferMins}m</span>
					</div>
				`;
				timelineContainer.appendChild(interchangeContainer);
				animationRowCounter++;
			}
		});

		timelineCard.appendChild(timelineContainer);
		parent.appendChild(timelineCard);
	}

	#renderWarningBanner(container) {
		// Warning banner placeholder
	}
}