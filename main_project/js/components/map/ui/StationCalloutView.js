/**
 * 📍 StationCalloutView - Interactive Map Station Popup & Route Drafting Component
 * Enterprise ES2022 OOP Component
 * 
 * Responsibilities:
 * 1. Station details link & callout popup DOM management.
 * 2. Temporary Route Draft Buffer (Zero premature replacement alerts).
 * 3. 2nd-value completion confirmation & delegation via callback.
 */

import { centerClass } from "../../../core/CenterClass.js";
import { eventBus } from "../../../core/event-bus.js";

export class StationCalloutView {
	#container = null;
	#calloutEl = null;
	#currentLang = "en";
	#activeStation = null;
	#draftRoute = { from: null, to: null };
	#onRouteConfirm = null;
	#getActiveRoute = null;
	#unsubTransform = null;
	#onResize = null;
	#rAFId = null;

	constructor({ containerSelector = ".mapContainer", lang = "en", onRouteConfirm = null, getActiveRoute = null } = {}) {
		this.#container = document.querySelector(containerSelector);
		this.#currentLang = lang;
		this.#onRouteConfirm = onRouteConfirm;
		this.#getActiveRoute = getActiveRoute;

		this.#unsubTransform = eventBus.on("MAP_TRANSFORM_CHANGED", () => {
			this.updatePosition();
		});

		this.#onResize = () => this.updatePosition();
		window.addEventListener("resize", this.#onResize);
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
		this.updatePosition();
	}

	updatePosition() {
		if (!this.#calloutEl || !this.#activeStation) return;
		if (this.#rAFId) return;

		this.#rAFId = requestAnimationFrame(() => {
			this.#rAFId = null;
			this.#doUpdatePosition();
		});
	}

	#doUpdatePosition() {
		if (!this.#calloutEl || !this.#activeStation) return;
		const { stationId, x, y } = this.#activeStation;
		const pos = centerClass.getStationScreenPosition(stationId, x, y);
		if (!pos) return;

		this.#calloutEl.style.left = `${Math.round(pos.x)}px`;
		this.#calloutEl.style.top = `${Math.round(pos.y)}px`;

		if (this.#container) {
			const cw = this.#container.clientWidth;
			const ch = this.#container.clientHeight;
			const isOffscreen = pos.x < -180 || pos.x > cw + 180 || pos.y < -180 || pos.y > ch + 180;
			this.#calloutEl.style.display = isOffscreen ? "none" : "";
		}
	}

	hide() {
		this.#activeStation = null;
		if (this.#rAFId) {
			cancelAnimationFrame(this.#rAFId);
			this.#rAFId = null;
		}
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
		if (this.#rAFId) {
			cancelAnimationFrame(this.#rAFId);
			this.#rAFId = null;
		}
		if (typeof this.#unsubTransform === "function") {
			this.#unsubTransform();
			this.#unsubTransform = null;
		}
		if (this.#onResize) {
			window.removeEventListener("resize", this.#onResize);
			this.#onResize = null;
		}
		this.hide();
		this.resetDraft();
		this.#container = null;
	}

	#renderInitialCard(stationId, x, y) {
		const stationName = centerClass.getStationName(stationId, this.#currentLang) || stationId;
		const currentCity = localStorage.getItem("active_city") || "delhi_ncr";
		const btnText = centerClass.t("pages.home.map.viewStationInfo");

		const stationObj = centerClass.getStationDetails(stationId);
		const status = stationObj?.properties?.status || "operational";
		const layout = stationObj?.properties?.layout || "elevated";

		// Civil layout badge
		let layoutLabel = "";
		if (layout === "underground") {
			layoutLabel = this.#currentLang === "hi" ? "🚇 भूमिगत" : (this.#currentLang === "mr" ? "🚇 भुयारी" : "🚇 Underground");
		} else if (layout === "elevated") {
			layoutLabel = this.#currentLang === "hi" ? "🌁 एलिवेटेड" : (this.#currentLang === "mr" ? "🌁 उन्नत" : "🌁 Elevated");
		} else if (layout === "at-grade") {
			layoutLabel = this.#currentLang === "hi" ? "🛤️ धरातलीय" : (this.#currentLang === "mr" ? "🛤️ जमिनीवरील" : "🛤️ At-Grade");
		} else if (layout === "multi_level") {
			layoutLabel = this.#currentLang === "hi" ? "🏢 बहु-स्तरीय" : (this.#currentLang === "mr" ? "🏢 बहुमजली" : "🏢 Multi-Level");
		}
		const layoutBadgeHtml = layoutLabel ? `<span class="callout-layout-badge layout-${layout.replace(/_/g, '-')}" title="${layoutLabel}">${layoutLabel}</span>` : "";

		// Revenue status badge
		let statusBadgeHtml = "";
		if (status === "under_construction") {
			const badgeLabel = this.#currentLang === "hi" ? "🚧 निर्माणाधीन" : (this.#currentLang === "mr" ? "🚧 बांधकाम सुरू" : "🚧 Construction");
			statusBadgeHtml = `<span class="callout-status-badge under-construction" title="${badgeLabel}">${badgeLabel}</span>`;
		} else if (status === "approved" || status === "proposed" || status === "planned") {
			const badgeLabel = this.#currentLang === "hi" ? "🗓️ प्रस्तावित" : (this.#currentLang === "mr" ? "🗓️ नियोजित" : "🗓️ Planned");
			statusBadgeHtml = `<span class="callout-status-badge approved" title="${badgeLabel}">${badgeLabel}</span>`;
		} else if (status === "temporarily_closed") {
			const badgeLabel = this.#currentLang === "hi" ? "⚠️ अस्थायी बंद" : (this.#currentLang === "mr" ? "⚠️ तात्पुरते बंद" : "⚠️ Closed");
			statusBadgeHtml = `<span class="callout-status-badge closed" title="${badgeLabel}">${badgeLabel}</span>`;
		} else if (status === "decommissioned") {
			const badgeLabel = this.#currentLang === "hi" ? "🛑 अप्रचलित" : (this.#currentLang === "mr" ? "🛑 निष्कासित" : "🛑 Retired");
			statusBadgeHtml = `<span class="callout-status-badge decommissioned" title="${badgeLabel}">${badgeLabel}</span>`;
		}

		const metaBadgesHtml = (layoutBadgeHtml || statusBadgeHtml) ? `
			<div class="callout-meta-row">
				${layoutBadgeHtml}
				${statusBadgeHtml}
			</div>
		` : "";

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
				${metaBadgesHtml}
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
