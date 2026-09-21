/**
 * 📍 StationCalloutView - Interactive Map Station Popup & Route Drafting Component
 * Enterprise ES2022 OOP Component
 * 
 * Responsibilities:
 * 1. Station details link & callout popup DOM management.
 * 2. Temporary Route Draft Buffer (Zero premature replacement alerts).
 * 3. 2nd-value completion confirmation & delegation via callback.
 */

import { centerClass } from "../core/CenterClass.js";
import i18n from "../core/i18n.js";

export class StationCalloutView {
	#container = null;
	#calloutEl = null;
	#currentLang = "en";
	#activeStation = null;
	#draftRoute = { from: null, to: null };
	#onRouteConfirm = null;
	#getActiveRoute = null;

	constructor({ containerSelector = ".mapContainer", lang = "en", onRouteConfirm = null, getActiveRoute = null } = {}) {
		this.#container = document.querySelector(containerSelector);
		this.#currentLang = lang;
		this.#onRouteConfirm = onRouteConfirm;
		this.#getActiveRoute = getActiveRoute;
	}

	setLanguage(newLang) {
		this.#currentLang = newLang;
		if (this.#activeStation) {
			const { stationId, x, y } = this.#activeStation;
			this.show(stationId, x, y);
		}
	}

	show(stationId, x = 0, y = 0) {
		if (!this.#container) {
			this.#container = document.querySelector(".mapContainer");
			if (!this.#container) return;
		}

		this.#activeStation = { stationId, x, y };

		if (!this.#calloutEl) {
			this.#calloutEl = document.createElement("div");
			this.#calloutEl.id = "stationMapCallout";
			this.#calloutEl.className = "station-map-callout";
			this.#container.appendChild(this.#calloutEl);
		}

		this.#renderInitialCard(stationId, x, y);
	}

	hide() {
		this.#activeStation = null;
		if (this.#calloutEl) {
			this.#calloutEl.remove();
			this.#calloutEl = null;
		}
		if (centerClass && typeof centerClass.clearStationHighlight === "function") {
			centerClass.clearStationHighlight();
		}
	}

	resetDraft() {
		this.#draftRoute = { from: null, to: null };
	}

	destroy() {
		this.hide();
		this.resetDraft();
		this.#container = null;
	}

	#renderInitialCard(stationId, x, y) {
		const stationName = centerClass.getStationName(stationId, this.#currentLang) || stationId;
		const currentCity = localStorage.getItem("active_city") || "delhi_ncr";
		const btnText = i18n.t("pages.home.map.viewStationInfo") || "View Station Details";

		const stationObj = centerClass.getStationDetails(stationId);
		const status = stationObj?.properties?.status || "operational";
		let statusBadgeHtml = "";
		if (status === "under_construction") {
			const badgeLabel = this.#currentLang === "hi" ? "🚧 निर्माणाधीन स्टेशन" : (this.#currentLang === "mr" ? "🚧 बांधकाम सुरू" : "🚧 Under Construction");
			statusBadgeHtml = `<div class="callout-status-badge under-construction" title="${badgeLabel}">${badgeLabel}</div>`;
		} else if (status === "approved" || status === "proposed") {
			const badgeLabel = this.#currentLang === "hi" ? "🗓️ प्रस्तावित स्टेशन" : (this.#currentLang === "mr" ? "🗓️ नियोजित स्थानक" : "🗓️ Approved / Planned");
			statusBadgeHtml = `<div class="callout-status-badge approved" title="${badgeLabel}">${badgeLabel}</div>`;
		}

		this.#calloutEl.innerHTML = `
			<div class="callout-card-body">
				<div class="callout-header">
					<button type="button" class="callout-close-btn" aria-label="Close">✕</button>
					<span class="callout-title" title="${stationName}">${stationName}</span>
					<a href="station_info.html?id=${encodeURIComponent(stationId)}&city=${encodeURIComponent(currentCity)}" 
					   target="_blank" 
					   rel="noopener noreferrer" 
					   class="callout-info-btn" 
					   title="${btnText}"
					   aria-label="${btnText}"></a>
				</div>
				${statusBadgeHtml}
				<div class="callout-actions">
					<button type="button" class="callout-btn-from">
						<span class="icon-from">▲</span>
						<span class="text-from">FROM</span>
					</button>
					<div class="callout-divider"></div>
					<button type="button" class="callout-btn-to">
						<span class="icon-to">▼</span>
						<span class="text-to">TO</span>
					</button>
				</div>
			</div>
		`;

		this.#calloutEl.querySelector(".callout-close-btn")?.addEventListener("click", (e) => {
			e.stopPropagation();
			this.hide();
		}, { once: true });

		// 2. FROM दबाने पर (ड्राफ्ट में सेव, 1st वैल्यू पर नो प्रॉम्ट!)
		this.#calloutEl.querySelector(".callout-btn-from")?.addEventListener("click", (e) => {
			e.stopPropagation();

			this.#draftRoute.from = { id: stationId, name: stationName, x, y };
			centerClass.setRoutePin("from", stationId, x, y);

			// 🎯 केवल तब पूछें जब 2nd वैल्यू (TO) भी मौजूद हो:
			if (this.#draftRoute.to && this.#draftRoute.to.id !== stationId) {
				this.#renderConfirmPrompt(stationName, this.#draftRoute.to.name);
			} else {
				this.hide();
			}
		}, { once: true });

		// 3. TO दबाने पर (ड्राफ्ट में सेव, 1st वैल्यू पर नो प्रॉम्ट!)
		this.#calloutEl.querySelector(".callout-btn-to")?.addEventListener("click", (e) => {
			e.stopPropagation();

			this.#draftRoute.to = { id: stationId, name: stationName, x, y };
			centerClass.setRoutePin("to", stationId, x, y);

			// 🎯 केवल तब पूछें जब 2nd वैल्यू (FROM) भी मौजूद हो:
			if (this.#draftRoute.from && this.#draftRoute.from.id !== stationId) {
				this.#renderConfirmPrompt(this.#draftRoute.from.name, stationName);
			} else {
				this.hide();
			}
		}, { once: true });
	}

	#renderConfirmPrompt(startName, endName) {
		const isHi = this.#currentLang === "hi";

		this.#calloutEl.innerHTML = `
			<div class="callout-card-body">
				<div class="callout-prompt-view">
					<div class="prompt-title">${isHi ? "रूट खोजें?" : "Find Route?"}</div>
					<div class="prompt-route-flow">
						<span class="prompt-flow-st prompt-flow-from" title="${startName}">📍 ${startName}</span>
						<span class="prompt-flow-arrow">➔</span>
						<span class="prompt-flow-st prompt-flow-to" title="${endName}">📍 ${endName}</span>
					</div>
					<div class="callout-prompt-actions">
						<button type="button" class="btn-prompt-no">${isHi ? "✕ नहीं" : "✕ No"}</button>
						<button type="button" class="btn-prompt-yes">${isHi ? "🚀 हाँ, खोजें" : "🚀 Find Route"}</button>
					</div>
				</div>
			</div>
		`;

		// ✕ नहीं: ड्राफ्ट रद्द, पुराना सक्रिय रूट सुरक्षित
		this.#calloutEl.querySelector(".btn-prompt-no")?.addEventListener("click", (e) => {
			e.stopPropagation();
			this.hide();

			const activeRoute = typeof this.#getActiveRoute === "function" ? this.#getActiveRoute() : null;
			if (activeRoute?.path?.length >= 2) {
				centerClass.setRoutePin("from", activeRoute.path[0]);
				centerClass.setRoutePin("to", activeRoute.path[activeRoute.path.length - 1]);
			}
			this.resetDraft();
		}, { once: true });

		// 🚀 हाँ, खोजें: नया रूट कन्फ़र्म!
		this.#calloutEl.querySelector(".btn-prompt-yes")?.addEventListener("click", (e) => {
			e.stopPropagation();
			this.hide();
			this.resetDraft();

			if (typeof this.#onRouteConfirm === "function") {
				this.#onRouteConfirm(startName, endName);
			}
		}, { once: true });
	}
}