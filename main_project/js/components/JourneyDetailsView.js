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
		const distanceLabel = i18n.t("pages.home.sidebar.findroute.route.distanceLabel") || "Distance";
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

			<!-- 🎟️ एक्सपैंडेबल मल्टी-लेग ब्रेकडाउन (100% i18n) -->
			${routeInfo.fare?.isMultiTicket ? `
				<div class="fare-breakdown-toggle-box" style="margin-top: 12px; border-top: 1px dashed var(--border-color); padding-top: 10px;">
					<button type="button" class="fare-breakdown-btn" id="fareBreakdownBtn">
						<span class="btn-text">ℹ️ ${i18n.t("pages.home.sidebar.findroute.route.breakdownToggle", { count: routeInfo.fare.legs?.length || 2 })}</span>
						<span class="btn-arrow" id="fareBreakdownArrow">▼</span>
					</button>
					
					<!-- कोलैप्सेबल लेग कंटेनर (बाय डिफ़ॉल्ट बंद) -->
					<div class="fare-legs-container" id="fareLegsContent" style="display: none; margin-top: 10px; flex-direction: column; gap: 10px;">
						${(routeInfo.fare.legs || []).map((leg) => {
							const fromName = centerClass.getStationName(leg.fromStation, this.#settings.currentLang);
							const toName = centerClass.getStationName(leg.toStation, this.#settings.currentLang);
							const lName = leg.lineName?.[this.#settings.currentLang] || leg.lineName?.en || leg.lineName;
							
							const alertsHtml = (leg.alerts || []).map(a => {
								const alertText = i18n.t(a.i18nKey, a.params || {}) || a.defaultText;
								return `
									<div class="leg-alert-pill ${a.type}">
										<span>${a.icon}</span> <span>${alertText}</span>
									</div>
								`;
							}).join("");

							return `
								<div class="leg-item-card">
									<!-- हेडर: रंगीन लाइन पिल + रूट -->
									<div class="leg-card-header">
										<span class="line-badge-solid" style="background-color: ${leg.lineColor}; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${lName}</span>
										<span class="leg-route-title" style="font-weight: 600; font-size: 0.85rem;">${fromName} ➔ ${toName}</span>
									</div>

									<!-- अलर्ट्स (सुरक्षा जांच, NCMC, वॉकवे) -->
									${alertsHtml ? `<div class="leg-alerts-list" style="margin: 6px 0; display: flex; flex-direction: column; gap: 4px;">${alertsHtml}</div>` : ""}

									<!-- रो 1: दूरी, समय, स्टेशन और लाइन परिवर्तन (पूरे 4 कॉलम + मुख्य कार्ड जैसे कलर्स) -->
									<div class="metrics-row leg-mini-row" style="background: rgba(0,0,0,0.02); padding: 8px 6px; border-radius: 6px;">
										<div class="metric-col"><span class="metric-val color-indigo" style="font-size: 0.95rem;">${leg.distanceKm} <small style="font-size:0.75em;">km</small></span><span class="metric-lbl">${distanceLabel}</span></div>
										<div class="metric-col"><span class="metric-val color-emerald" style="font-size: 0.95rem;">${leg.travelMinutes}</span><span class="metric-lbl">${timeLabel}</span></div>
										<div class="metric-col"><span class="metric-val color-sky" style="font-size: 0.95rem;">${leg.stationsCount}</span><span class="metric-lbl">${stationsLabel}</span></div>
										<div class="metric-col"><span class="metric-val color-amber" style="font-size: 0.95rem;">${leg.interchangesCount || 0}</span><span class="metric-lbl">${changeLabel}</span></div>
									</div>

									<!-- रो 2: चारों किराये + डिस्काउंट बैज -->
									<div class="metrics-row leg-mini-row" style="margin-top: 6px; padding: 8px 6px; background: rgba(0,0,0,0.02); border-radius: 6px;">
										<div class="metric-col"><span class="metric-val" style="font-size: 0.95rem;">₹${leg.fares.token}</span><span class="metric-lbl">Token</span></div>
										<div class="metric-col"><span class="metric-val color-blue" style="font-size: 0.95rem;">₹${leg.fares.smartCard}</span><span class="metric-lbl">Smart Card<br><span class="fare-badge badge-blue">(10% Off)</span></span></div>
										<div class="metric-col"><span class="metric-val color-purple" style="font-size: 0.95rem;">₹${leg.fares.offPeak}</span><span class="metric-lbl">Off-Peak<br><span class="fare-badge badge-purple">(10% Off)</span></span></div>
										<div class="metric-col"><span class="metric-val color-green" style="font-size: 0.95rem;">₹${leg.fares.offPeakSmartCard}</span><span class="metric-lbl">Off-Peak Smart<br><span class="fare-badge badge-green">(20% Off)</span></span></div>
									</div>
								</div>
							`;
						}).join("")}

						<!-- बचत हाइलाइट (100% i18n) -->
						${routeInfo.fare?.discounts?.savingsAmount > 0 ? `
							<div class="savings-highlight" style="text-align: center; font-size: 0.82rem; color: var(--color-emerald, #10b981); font-weight: bold; padding: 6px; background: rgba(16, 185, 129, 0.08); border-radius: 6px;">
								🎉 ${i18n.t("pages.home.sidebar.findroute.route.smartCardSavings", { amount: routeInfo.fare.discounts.savingsAmount })}
							</div>
						` : ""}
					</div>
				</div>
			` : ""}
		`;
		parent.appendChild(metricsCard);

		// 🎯 टॉगल इवेंट लिसनर (क्लिक करने पर खुलना/बंद होना)
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
		let animationRowCounter = 0; // 👈 1. 120ms एनिमेशन काउंटर

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

						// 🚶 इंटरचेंज वॉकवे बॉक्स
			if (segmentIndex < steps.length - 1) {
				const nextStep = steps[segmentIndex + 1];
				const metroData = centerClass.getMetroData();
				const nextLineInfo = metroData?.lines?.[nextStep.line];
				const nextLineColor = nextLineInfo?.color || lineColor;
				const nextLineName = nextStep.shortName?.[this.#settings.currentLang] || nextStep.shortName?.en || nextStep.line;
				const transferMins = Math.ceil((step.nextTransferSeconds || 180) / 60);
				const transferDistText = step.nextTransferDistanceMeters ? `${step.nextTransferDistanceMeters} m · ` : "";

				// 🏷️ डायनामिक ट्रांसफर मोड व सिविल बैज
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