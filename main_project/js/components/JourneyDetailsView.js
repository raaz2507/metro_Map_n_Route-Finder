/**
 * 🗺️ JourneyDetailsView - Dynamic Route Result UI Component
 * Features: O(1) Instant Fare Selection & LocalStorage Persistence
 */
import { centerClass } from "../core/CenterClass.js";
import { formatTime12h } from "../core/data-utils.js";

 
export class JourneyDetailsView {
	#container = null;
	#settings = { currentLang: "en" };
	#mapObj = null;
	#routeTextSummaryView = null;

	constructor(containerSelector = "#journeyDetails .route-overview", mapObj = null) {
		this.#container = document.querySelector(containerSelector);
		this.#mapObj = mapObj;
		this.#routeTextSummaryView = new RouteTextSummaryView();
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
		
		// 🎯 नया टेक्स्ट समरी कार्ड: Timeline Card के ठीक ऊपर इंसर्ट होगा
		this.#routeTextSummaryView.render(this.#container, routeInfo, this.#settings.currentLang);

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

	#formatTimeSlots(slots) {
		if (!Array.isArray(slots) || slots.length === 0) return "";
		return slots.map(s => `<div class="time-slot-line">${s.start} – ${s.end}</div>`).join("");
	}

	#renderFareCardsHtml(products, selectedKey, legIndex = 0) {
		if (!products || typeof products !== "object") return "";
		const entries = Object.entries(products);
		if (entries.length === 0) return "";

		// 🎯 Single Fare: Clean static display (No button, no selector pill)
		if (entries.length === 1) {
			const [key, prod] = entries[0];
			const labelName = prod.label?.[this.#settings.currentLang] || prod.label?.en || "Fare";
			return `
				<div class="fare-single-metric" data-leg-index="${legIndex}" data-fare="${prod.fare}">
					<span class="metric-val">₹${prod.fare}</span>
					<span class="metric-lbl">${labelName}</span>
				</div>
			`;
		}

		// 🎯 Multi-Fare: Interactive Selectable Cards
		return entries.map(([key, prod]) => {
			const isSelected = key === selectedKey;
			const labelName = centerClass.t(`smartCardTicket.products.${key}`);
			const badgeHtml = prod.isDiscounted && prod.discountPercent > 0 
				? `<span class="fare-badge badge-blue">(${prod.discountPercent}% Off)</span>` : "";
			
			const timeHtml = Array.isArray(prod.timeSlots) && prod.timeSlots.length > 0 ? `<div class="fare-time-slot">${this.#formatTimeSlots(prod.timeSlots)}</div>` : "";
			const activeNowLabel = centerClass.t("pages.home.findRoute.timeline.activeNow");
			const activeBadgeHtml = (prod.timeRule && prod.isCurrentSlotActive) 
			? `<span class="fare-active-badge">● ${activeNowLabel}</span>` : "";
			return `
				<div class="fare-selectable-col">
					<div class="fare-selectable-card ${isSelected ? 'selected' : ''}" 
						 data-leg-index="${legIndex}" data-fare="${prod.fare}" data-is-premium="${prod.isPremium ? 'true' : 'false'}">
						<span class="metric-val ${prod.isDiscounted ? 'color-blue' : ''}">₹${prod.fare}</span>
						<span class="metric-lbl">${labelName} ${badgeHtml}</span>
						${activeBadgeHtml}
						${timeHtml}
					</div>
				</div>
			`;
		}).join("");
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

		const timeLabel = centerClass.t("pages.home.findRoute.routeSummary.travelTime", { minutes: "" }).trim();
		const changeLabel = centerClass.t("pages.home.findRoute.routeSummary.interchange", { count: "" }).trim();
		const stationsLabel = centerClass.t("pages.home.findRoute.routeSummary.stations", { count: "" }).trim();
		const distanceLabel = centerClass.t("pages.home.findRoute.routeSummary.distance", { distance: "" }).trim();
		
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
			dynamicFaresHtml = this.#renderFareCardsHtml(products, selectedKey, 0);
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
					const alertText = centerClass.t(a.i18nKey, a.params || {}) || a.defaultText;
					return `<div class="leg-alert-pill ${a.type}"><span>${a.icon}</span> <span>${alertText}</span></div>`;
				}).join("");

				const legFaresHtml = this.#renderFareCardsHtml(leg.products || {}, selectedKey, legIndex);

				return `
					<div class="leg-item-card">
						<div class="leg-card-header">
							<span class="line-badge-solid" style="background-color: ${leg.lineColor};">${lName}</span>
							<span class="leg-route-title">${fromName} ➔ ${toName}</span>
						</div>
						${alertsHtml ? `<div class="leg-alerts-list">${alertsHtml}</div>` : ""}
						
						<div class="metrics-row leg-mini-row">
							<div class="metric-col"><span class="metric-val color-indigo">${leg.distanceKm} <small class="unit-km">km</small></span><span class="metric-lbl">${distanceLabel}</span></div>
							<div class="metric-col"><span class="metric-val color-emerald">${leg.travelMinutes}</span><span class="metric-lbl">${timeLabel}</span></div>
							<div class="metric-col"><span class="metric-val color-sky">${leg.stationsCount}</span><span class="metric-lbl">${stationsLabel}</span></div>
							<div class="metric-col"><span class="metric-val color-amber">${leg.interchangesCount || 0}</span><span class="metric-lbl">${changeLabel}</span></div>
						</div>

						<div class="fare-cards-row leg-fare-cards-row">
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

		// 🛠️ BUG FIX: सही i18n पाथ (pages.home.findRoute.timeline.*)
		const firstText = centerClass.t("pages.home.findRoute.timeline.firstTrain");
		const lastText = centerClass.t("pages.home.findRoute.timeline.lastTrain");
		const totalFareText = centerClass.t("pages.home.findRoute.routeSummary.fare", { fare: "" }).trim();
		
		metricsCard.innerHTML = `
			<div class="metrics-row">
				<div class="metric-col">
					<span class="metric-val color-indigo">${distNum} <small class="unit-km">km</small></span>
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

			<div class="metrics-row fare-metrics-divider">
				${dynamicFaresHtml ? `<div class="fare-cards-row ${Object.keys(routeInfo.fare?.products || {}).length === 1 ? 'is-single' : ''}">${dynamicFaresHtml}</div>` : `
				<div class="metric-col fare-grand-total-col">
					<span class="metric-val" id="cardGrandTotalDisplay">₹${initialGrandTotal}</span>
					<span class="metric-lbl">${totalFareText}</span>
				</div>
				`}
			</div>
			
			<div class="timing-subrow">
				<div class="timing-item">☀️ ${firstText} <strong>${firstTrainDisplay}</strong></div>
				<div class="timing-item">🌙 ${lastText} <strong>${lastTrainDisplay}</strong></div>
			</div>
			${routeInfo.fare?.isMultiTicket ? `
				<div class="fare-breakdown-toggle-box">
					<button type="button" class="fare-breakdown-btn" id="fareBreakdownBtn">
						<div class="btn-text-col">
									<span class="btn-primary-label">${centerClass.t("pages.home.findRoute.timeline.splitFareTitle")}</span>
									<span class="btn-sub-label">${centerClass.t("pages.home.findRoute.timeline.splitFareSubtitle", { count: routeInfo.fare.legs?.length || 2 })}</span>
						</div>
						<div class="round-chevron-btn">
							<span class="chevron" id="fareBreakdownArrow">▼</span>
						</div>
					</button>
					
					<div class="fare-legs-container" id="fareLegsContent">
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
			if (toggleBtn && content) {
				toggleBtn.addEventListener("click", () => {
					// 🎯 क्लास-बेस्ड चेक: पहली बार में इनलाइन खाली स्ट्रिंग ("") के बग को पूरी तरह रोकता है
					const isCurrentlyOpen = toggleBtn.classList.contains("open-state");
					const shouldOpen = !isCurrentlyOpen;

					content.style.display = shouldOpen ? "flex" : "none";
					toggleBtn.classList.toggle("open-state", shouldOpen);
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
			const lineName = centerClass.getLineShortName(step.line) || centerClass.getLineName(step.line) || step.line;
			const lineColor = step.lineColor || "#007bff";

			const segmentEl = document.createElement("div");
			segmentEl.className = "timeline-segment";

			const toName = centerClass.getStationName(step.toStation);
			// 🛠️ BUG FIX: टर्मिनल आईडी को स्थानीय भाषा के नाम में बदलें
			const terminalId = step.terminalStationId || step.terminalName?.en || toName;
			const terminalName = centerClass.getStationName(terminalId) || toName;
			const platformNo = step.platformNo || 1;

			const isYellowLike = lineColor.toLowerCase() === "#ffd514" || lineColor.toLowerCase() === "#ffff00";
			const badgeTextColor = isYellowLike ? "#000000" : "#ffffff";

			const segHeader = document.createElement("div");
			segHeader.className = "segment-header";
			segHeader.style.setProperty("--delay", `${animationRowCounter * 120}ms`);

			const directionStr = centerClass.t("pages.home.findRoute.timeline.directionText", { 
				terminal: terminalName, 
				platform: platformNo 
			});
			segHeader.innerHTML = `
				<span class="line-badge-solid" style="background-color: ${lineColor}; color: ${badgeTextColor};">${lineName}</span>
				<span class="segment-direction">➔ ${directionStr}</span>
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
					const gateLabel = centerClass.t("pages.home.findRoute.timeline.gate") || "Gate";
					gateBadgeHtml = `<span class="badge-gate">🚪 ${gateLabel}</span>`;
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
				const nextLineName = centerClass.getLineShortName(nextStep.line) || centerClass.getLineName(nextStep.line) || nextStep.line;
				const transferMins = Math.ceil((step.nextTransferSeconds || 180) / 60);
				const transferDistText = step.nextTransferDistanceMeters ? `${step.nextTransferDistanceMeters} m · ` : "";

				const tData = step.nextTransfer || {};
				const mode = tData.transferMode;
				const dist = tData.distanceMeters || step.nextTransferDistanceMeters;
				let modeBadgeHtml = "";
				let featureBadgesHtml = "";

				const transferTypeKey = (tData.type || "interchange").replace(/_/g, "-");
				const stationTypeObj = metroData?.station_types?.[tData.type || "interchange"];
				const typeLabel = stationTypeObj?.[this.#settings.currentLang] || stationTypeObj?.en;
				const typeBadgeHtml = typeLabel 
					? `<span class="transfer-pill-badge transfer-pill-station-type"><span class="station-type-glyph type-${transferTypeKey}"></span>${typeLabel}</span>` 
					: "";

				if (mode === "cross_platform") {
					const label = centerClass.t("pages.home.findRoute.transferModes.crossPlatform");
					modeBadgeHtml = `<span class="transfer-mode-badge badge-cross-platform"><span class="transfer-mode-icon ico-mode-cross-platform" aria-hidden="true"></span> ${label}</span>`;
				} else if (mode === "level_change") {
					const levels = tData.levels || 1;
					const label = centerClass.t("pages.home.findRoute.transferModes.levelChange", { level: levels });
					modeBadgeHtml = `<span class="transfer-mode-badge badge-level-change"><span class="transfer-mode-icon ico-mode-level-change" aria-hidden="true"></span> ${label}</span>`;
				} else if (mode === "skywalk") {
					const label = centerClass.t("pages.home.findRoute.transferModes.skywalk", { distance: dist || 150 });
					modeBadgeHtml = `<span class="transfer-mode-badge badge-skywalk"><span class="transfer-mode-icon ico-mode-skywalk" aria-hidden="true"></span> ${label}</span>`;
				} else if (mode === "corridor") {
					const label = centerClass.t("pages.home.findRoute.transferModes.corridor", { distance: dist || 80 });
					modeBadgeHtml = `<span class="transfer-mode-badge badge-corridor"><span class="transfer-mode-icon ico-mode-corridor" aria-hidden="true"></span> ${label}</span>`;
				} else if (mode === "free_erickshaw") {
					const label = centerClass.t("pages.home.findRoute.transferModes.freeERickshaw");
					modeBadgeHtml = `<span class="transfer-mode-badge badge-erickshaw"><span class="transfer-mode-icon ico-mode-erickshaw" aria-hidden="true"></span> ${label}</span>`;
				} else if (mode === "security_check") {
					const label = centerClass.t("pages.home.findRoute.transferModes.securityCheck");
					modeBadgeHtml = `<span class="transfer-mode-badge badge-security"><span class="transfer-mode-icon ico-mode-security" aria-hidden="true"></span> ${label}</span>`;
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
									${centerClass.t("pages.home.findRoute.timeline.changeTo", { line: `<strong>${nextLineName}</strong>` }) || `Change to <strong>${nextLineName}</strong>`}
								</span>
								<div class="interchange-badges-row">
									${typeBadgeHtml}
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

/**
 * 📝 RouteTextSummaryView - Concept 1: Modern Transit Passport (Collapsible + TTS + Copy)
 * Strict ES2022 OOP Class with Private Fields (#)
 */
class RouteTextSummaryView {
	#cardEl = null;
	#currentLang = "en";
	#isSpeaking = false;
	#speechUtterance = null;

	/**
	 * 📝 इंटरचेंजेस और लाइन्स की पठनीय सूची बनाना (HTML Pills & Plain Text)
	 */
	#getInterchangeData(steps) {
		if (!Array.isArray(steps) || steps.length <= 1) {
			return { htmlList: "", plainList: "" };
		}
		const htmlParts = [];
		const plainParts = [];

		for (let i = 0; i < steps.length - 1; i++) {
			const currentStep = steps[i];
			const nextStep = steps[i + 1];
			const stationName = centerClass.getStationName(currentStep.toStation);
			const fromLineName = centerClass.getLineShortName(currentStep.line) || currentStep.line;
			const toLineName = centerClass.getLineShortName(nextStep.line) || nextStep.line;

			const fromColor = currentStep.lineColor || "#ec4899";
			const toColor = nextStep.lineColor || "#eab308";

			htmlParts.push(`<strong>${stationName}</strong> (<span class="summary-line-pill" style="--line-c:${fromColor}">${fromLineName}</span> ➔ <span class="summary-line-pill" style="--line-c:${toColor}">${toLineName}</span>)`);
			plainParts.push(`${stationName} (${fromLineName} ➔ ${toLineName})`);
		}

		return {
			htmlList: htmlParts.join(", "),
			plainList: plainParts.join(", ")
		};
	}

	/**
	 * 📋 मुख्य रेंडर मेथड (Concept 1: Modern Transit Passport, Inserts strictly before .timeline-card)
	 */
	async render(parent, routeInfo, currentLang = "en") {
		if (!parent || !routeInfo) return;
		this.#currentLang = currentLang;

		// अगर पहले से कोई आवाज़ बज रही हो, तो बंद करें
		this.#stopSpeaking();

		// अगर पुराना समरी कार्ड मौजूद है, तो उसका एक्सपैंडेड स्टेटस याद रखकर हटाएँ
		const existingCard = parent.querySelector(".route-text-summary-card");
		const wasExpanded = existingCard ? !existingCard.classList.contains("is-collapsed") : false;
		if (existingCard) existingCard.remove();

		const path = routeInfo.path || [];
		const startId = path[0];
		const endId = path[path.length - 1];

		const startName = centerClass.getStationName(startId, this.#currentLang);
		const endName = centerClass.getStationName(endId, this.#currentLang);

		const totalMin = Math.round((routeInfo.totalTravelTimeSeconds || 0) / 60);
		const distKm = ((routeInfo.totalDistanceMeters || 0) / 1000).toFixed(1);
		const fare = routeInfo.fare?.totalFare || 0;
		const interchangeCount = routeInfo.interchangesCount || 0;

		// 1. इंटरचेंज डेटा (HTML व Plain Text दोनों)
		const { htmlList, plainList } = this.#getInterchangeData(routeInfo.steps);
		let interchangeHtml = "";
		let interchangePlain = "";

		if (interchangeCount > 0) {
			interchangeHtml = centerClass.t("routeSummary.interchangeRoute", {
				count: `<strong class="val-interchange">${interchangeCount}</strong>`,
				list: htmlList
			});
			interchangePlain = centerClass.t("routeSummary.interchangeRoute", {
				count: `${interchangeCount}`,
				list: plainList
			});
		} else {
			interchangeHtml = centerClass.t("routeSummary.directRoute");
			interchangePlain = interchangeHtml;
		}

		// 2. पहली और अंतिम ट्रेन का समय (प्रारंभिक स्टेशन)
		const startStationObj = centerClass.getStationDetails(startId);
		const schedule = startStationObj?.train_schedule;
		let scheduleHtml = "";
		let schedulePlain = "";

		if (schedule?.first_train && schedule?.last_train) {
			const firstTime = formatTime12h(schedule.first_train);
			const lastTime = formatTime12h(schedule.last_train);
			scheduleHtml = centerClass.t("routeSummary.schedule", {
				station: `<span class="val-station">${startName}</span>`,
				first: `<span class="val-time">${firstTime}</span>`,
				last: `<span class="val-time">${lastTime}</span>`
			});
			schedulePlain = centerClass.t("routeSummary.schedule", {
				station: startName,
				first: firstTime,
				last: lastTime
			});
		}

		// 3. पार्किंग डिटेल्स (Pre-fetch before DOM paint)
		let parkingHtml = "";
		let parkingPlain = "";
		try {
			const detailsMap = await centerClass.loadStationsDetail();
			const startHasParking = Array.isArray(detailsMap?.[startId]?.parkings) && detailsMap[startId].parkings.length > 0;
			const endHasParking = Array.isArray(detailsMap?.[endId]?.parkings) && detailsMap[endId].parkings.length > 0;

			if (startHasParking && endHasParking) {
				parkingPlain = centerClass.t("routeSummary.parkingBoth");
			} else if (startHasParking) {
				parkingPlain = centerClass.t("routeSummary.parkingStartOnly", { station: startName });
			} else if (endHasParking) {
				parkingPlain = centerClass.t("routeSummary.parkingEndOnly", { station: endName });
			}
			if (parkingPlain) {
				parkingHtml = `<span class="val-parking">🅿️ ${parkingPlain}</span>`;
			}
		} catch (e) {
			console.warn("[RouteTextSummaryView] Parking load warning:", e);
		}

		// 4. स्टेशन यूनिट व समय
		const stationsText = centerClass.t(
			path.length === 1 ? "pages.home.findRoute.routeSummary.station" : "pages.home.findRoute.routeSummary.stations",
			{ count: path.length }
		);
		const timeText = centerClass.t("pages.home.findRoute.routeSummary.travelTime", { minutes: totalMin });

		// 5. Rich HTML और Plain Text दोनों स्ट्रिंग्स का निर्माण
		const fullSummaryHtml = centerClass.t("routeSummary.summaryTemplate", {
			start: `<span class="val-station">${startName}</span>`,
			end: `<span class="val-station">${endName}</span>`,
			stations: `<strong class="val-stops">${stationsText}</strong>`,
			interchangeText: interchangeHtml,
			distance: `<span class="val-distance">${distKm}</span>`,
			time: `<span class="val-duration">${timeText}</span>`,
			fare: `<span class="val-fare">₹${fare}</span>`,
			scheduleText: scheduleHtml,
			parkingText: parkingHtml
		}).trim();

		const fullSummaryPlain = centerClass.t("routeSummary.summaryTemplate", {
			start: startName,
			end: endName,
			stations: stationsText,
			interchangeText: interchangePlain,
			distance: `${distKm}`,
			time: timeText,
			fare: fare,
			scheduleText: schedulePlain,
			parkingText: parkingPlain
		}).trim().replace(/\s+/g, " ");

		// 6. DOM Element निर्माण (Concept 1: Modern Transit Passport)
		const title = centerClass.t("routeSummary.title");
		const copyLabel = centerClass.t("routeSummary.copyBtn");
		const listenLabel = centerClass.t("routeSummary.listenBtn");

		this.#cardEl = document.createElement("div");
		this.#cardEl.className = `route-text-summary-card ${wasExpanded ? "" : "is-collapsed"}`;
		this.#cardEl.innerHTML = `
			<div class="summary-card-header" role="button" tabindex="0" aria-expanded="${wasExpanded ? "true" : "false"}">
				<div class="summary-card-title">
					<span class="summary-icon" aria-hidden="true">📝</span>
					<h3>${title}</h3>
					<span class="summary-toggle-arrow" aria-hidden="true">▼</span>
				</div>
				<div class="summary-actions">
					<button type="button" class="btn-summary-action btn-speak-summary" aria-label="${listenLabel}" title="${listenLabel}">
						<span class="speak-icon" aria-hidden="true">🔊</span>
						<span class="btn-action-text">${listenLabel}</span>
					</button>
					<button type="button" class="btn-summary-action btn-copy-summary" aria-label="${copyLabel}" title="${copyLabel}">
						<img src="./assets/icons/ui/copy.svg" alt="" class="copy-icon" width="14" height="14" aria-hidden="true" />
						<span class="btn-action-text">${copyLabel}</span>
					</button>
				</div>
			</div>
			<div class="summary-card-body" ${wasExpanded ? "" : "hidden"}>
				<p class="summary-text">${fullSummaryHtml}</p>
			</div>
		`;

		// 🎯 100% GUARANTEED PLACEMENT: Insert strictly before .timeline-card
		const timelineCard = parent.querySelector(".timeline-card");
		if (timelineCard) {
			parent.insertBefore(this.#cardEl, timelineCard);
		} else {
			parent.appendChild(this.#cardEl);
		}

		// 7. इवेंट्स बाइंड करें
		this.#bindAccordionToggle();
		this.#bindCopyEvent(copyLabel, fullSummaryPlain);
		this.#bindSpeechEvent(fullSummaryPlain);
	}

	#bindAccordionToggle() {
		const header = this.#cardEl?.querySelector(".summary-card-header");
		const body = this.#cardEl?.querySelector(".summary-card-body");
		if (!header || !body) return;

		const toggle = (e) => {
			if (e.target.closest(".summary-actions")) return;

			const isCurrentlyCollapsed = this.#cardEl.classList.contains("is-collapsed");
			if (isCurrentlyCollapsed) {
				this.#cardEl.classList.remove("is-collapsed");
				body.hidden = false;
				header.setAttribute("aria-expanded", "true");
			} else {
				this.#cardEl.classList.add("is-collapsed");
				body.hidden = true;
				header.setAttribute("aria-expanded", "false");
			}
		};

		header.addEventListener("click", toggle);
		header.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				toggle(e);
			}
		});
	}

	#bindCopyEvent(copyLabel, textToCopy) {
		const copyBtn = this.#cardEl?.querySelector(".btn-copy-summary");
		if (!copyBtn) return;

		copyBtn.addEventListener("click", async (e) => {
			e.stopPropagation();
			if (!textToCopy) return;

			try {
				await navigator.clipboard.writeText(textToCopy);
				const btnText = copyBtn.querySelector(".btn-action-text");
				const origText = btnText ? btnText.textContent : copyLabel;
				if (btnText) btnText.textContent = centerClass.t("routeSummary.copied");
				copyBtn.classList.add("copied");

				eventBus.emit("SHOW_TOAST", {
					message: centerClass.t("routeSummary.copiedToast"),
					type: "success",
					duration: 3000
				});

				setTimeout(() => {
					if (btnText) btnText.textContent = origText;
					copyBtn.classList.remove("copied");
				}, 2500);
			} catch (err) {
				console.error("[RouteTextSummaryView] Copy failed:", err);
			}
		});
	}

	#bindSpeechEvent(textToSpeak) {
		const speakBtn = this.#cardEl?.querySelector(".btn-speak-summary");
		if (!speakBtn) return;

		if (!("speechSynthesis" in window)) {
			speakBtn.style.display = "none";
			return;
		}

		speakBtn.addEventListener("click", (e) => {
			e.stopPropagation();

			if (this.#isSpeaking) {
				this.#stopSpeaking();
				return;
			}

			this.#speak(textToSpeak, speakBtn);
		});
	}

	#speak(text, buttonEl) {
		window.speechSynthesis.cancel();

		const cleanText = text.replace(/➔/g, "से").replace(/~[0-9]+m/g, "");
		this.#speechUtterance = new SpeechSynthesisUtterance(cleanText);
		this.#speechUtterance.lang = this.#currentLang === "hi" ? "hi-IN" : "en-IN";
		this.#speechUtterance.rate = 0.95;

		const iconEl = buttonEl.querySelector(".speak-icon");
		const textEl = buttonEl.querySelector(".btn-action-text");
		const listenLabel = centerClass.t("routeSummary.listenBtn");
		const stopLabel = centerClass.t("routeSummary.speakingBtn");

		this.#speechUtterance.onstart = () => {
			this.#isSpeaking = true;
			buttonEl.classList.add("is-speaking");
			if (iconEl) iconEl.textContent = "⏹️";
			if (textEl) textEl.textContent = stopLabel;
		};

		this.#speechUtterance.onend = () => {
			this.#resetSpeechUI(buttonEl, iconEl, textEl, listenLabel);
		};

		this.#speechUtterance.onerror = () => {
			this.#resetSpeechUI(buttonEl, iconEl, textEl, listenLabel);
		};

		window.speechSynthesis.speak(this.#speechUtterance);
	}

	#stopSpeaking() {
		if ("speechSynthesis" in window) {
			window.speechSynthesis.cancel();
		}
		this.#isSpeaking = false;
		const speakBtn = this.#cardEl?.querySelector(".btn-speak-summary");
		if (speakBtn) {
			const iconEl = speakBtn.querySelector(".speak-icon");
			const textEl = speakBtn.querySelector(".btn-action-text");
			this.#resetSpeechUI(speakBtn, iconEl, textEl, centerClass.t("routeSummary.listenBtn"));
		}
	}

	#resetSpeechUI(buttonEl, iconEl, textEl, label) {
		this.#isSpeaking = false;
		buttonEl.classList.remove("is-speaking");
		if (iconEl) iconEl.textContent = "🔊";
		if (textEl) textEl.textContent = label;
	}
}

