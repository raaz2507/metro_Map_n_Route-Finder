/**
 * 🗺️ JourneyDetailsView - Dynamic Route Result & Timeline UI Component
 * Exact Mirror of Dashboard Journey Rendering Engine
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

	/**
	 * मुख्य रेंडर मेथड
	 */
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
		const distanceLabel = "Distance";
		const distNum = (routeInfo.totalDistanceMeters / 1000).toFixed(1);
		const totalMin = Math.round(routeInfo.totalTravelTimeSeconds / 60);
		const fares = routeInfo.fare?.products || {};
		const discounts = routeInfo.fare?.discounts || {};

		const tokenFare = fares.token;
		const smartFare = fares.smartCard;
		const offPeakFare = fares.offPeak;
		const offPeakSmartFare = fares.offPeakSmartCard;

		const smartBadge = discounts.smartCardDiscountPct ? `<br><span class="fare-badge badge-blue">(${discounts.smartCardDiscountPct}% Off)</span>` : "";
		const offPeakBadge = discounts.offPeakDiscountPct ? `<br><span class="fare-badge badge-purple">(${discounts.offPeakDiscountPct}% Off)</span>` : "";
		const offPeakSmartBadge = discounts.offPeakSmartDiscountPct ? `<br><span class="fare-badge badge-green">(${discounts.offPeakSmartDiscountPct}% Off)</span>` : "";

		const fmtFare = (val) => (val != null ? `₹${val}` : "N/A");

		const startStationId = routeInfo?.path?.[0];
		const startStation = centerClass.getStationDetails(startStationId);
		const schedule = startStation?.train_schedule;

		const firstTrainDisplay = schedule?.first_train ? formatTime12h(schedule.first_train) : "N/A";
		const lastTrainDisplay = schedule?.last_train ? formatTime12h(schedule.last_train) : "N/A";

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

			<!-- 💰 4-कॉलम 100% डायनामिक किराया लेआउट -->
			<div class="metrics-row" style="margin-top: 14px; border-top: 1px dashed var(--border-color); padding-top: 12px;">
				<div class="metric-col">
					<span class="metric-val">${fmtFare(tokenFare)}</span>
					<span class="metric-lbl">Token Fare</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-blue">${fmtFare(smartFare)}</span>
					<span class="metric-lbl">Smart Card${smartBadge}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-purple">${fmtFare(offPeakFare)}</span>
					<span class="metric-lbl">Off-Peak${offPeakBadge}</span>
				</div>
				<div class="metric-col">
					<span class="metric-val color-green">${fmtFare(offPeakSmartFare)}</span>
					<span class="metric-lbl">Off-Peak Smart${offPeakSmartBadge}</span>
				</div>
			</div>
			<div class="timing-subrow" style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
				<div class="timing-item">☀️ ${firstText} <strong>${firstTrainDisplay}</strong></div>
				<div class="timing-item">🌙 ${lastText} <strong>${lastTrainDisplay}</strong></div>
			</div>
		`;
		parent.appendChild(metricsCard);
	}

	#renderTimelineCard(parent, routeInfo) {
		const timelineCard = document.createElement("div");
		timelineCard.className = "timeline-card";

		const timelineContainer = document.createElement("div");
		timelineContainer.className = "route-timeline";

		const steps = routeInfo.steps || [];
		let globalStationIndex = 0;
		let animationRowCounter = 0; // 👈 1. 120ms एनिमेशन काउंटर

		const firstStationId = routeInfo.path[0];
		const lastStationId = routeInfo.path[routeInfo.path.length - 1];

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
			segHeader.style.setProperty("--delay", `${animationRowCounter * 120}ms`); // 👈 2. हेडर 120ms डिले
			segHeader.innerHTML = `
				<span class="line-badge-solid" style="background-color: ${lineColor}; color: ${badgeTextColor};">${lineName}</span>
				<span class="segment-direction">➔ Towards ${terminalName.toUpperCase()} · Platform ${platformNo}</span>
			`;
			segmentEl.appendChild(segHeader);
			animationRowCounter++;

			const stations = step.stations || [];
			stations.forEach((st, idx) => {
				if (segmentIndex > 0 && idx === 0) return; // इंटरचेंज का डुप्लीकेट छोड़ें

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

				// 🎨 Concept 2: स्प्लिट-बॉर्डर इंटरचेंज रिंग
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
					trackColor = nextLineColor; // 👈 नीचे जाने वाली लाइन अगली लाइन के रंग की होगी
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
						<span class="station-name-main">
							${name}
							${gateBadgeHtml}
						</span>
						<span class="station-time-cumulative">${hopText}~${st.timeMinutes}m</span>
					</div>
				`;
				segmentEl.appendChild(rowEl);
				animationRowCounter++;
			});

			timelineContainer.appendChild(segmentEl);

			// 🚶 इंटरचेंज वॉकवे बॉक्स
			if (segmentIndex < steps.length - 1) {
				const nextStep = steps[segmentIndex + 1];
				const metroData = centerClass.getMetroData();
				const nextLineInfo = metroData?.lines?.[nextStep.line];
				const nextLineColor = nextLineInfo?.color || lineColor;
				const nextLineName = nextStep.shortName?.[this.#settings.currentLang] || nextStep.shortName?.en || nextStep.line;
				const transferMins = Math.ceil((step.nextTransferSeconds || 180) / 60);
				const transferDistText = step.nextTransferDistanceMeters ? `${step.nextTransferDistanceMeters} m · ` : "";

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
							<span>
								Change to <strong>${nextLineName}</strong>
							</span>
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