/**
 * 📡 WidgetTelemetry - Pure View Component (Zero Sensor Logic)
 * Enterprise ES2022 Decoupled UI Component
 */

import { centerClass } from "../core/CenterClass.js";
import { eventBus } from "../core/event-bus.js";


export class TelemetryWidget {
	#elements = {};
	#abortController = null;
	#unsubscribe = null;
	#unsubscribeLang = null;
	#lastData = null;

	init() {
		this.#abortController = new AbortController();
		this.#queryElements();
		this.#bindTelemetryStream();
		this.#bindLanguageChanges();
		this.#bindUserInteractions();
	}

	#queryElements() {
		this.#elements = {
			card: document.getElementById("telemetrySignalCard"),
			gpsRow: document.getElementById("rowGpsSignal"),
			gpsPercentBadge: document.getElementById("gpsPercentBadge"),
			netPercentBadge: document.getElementById("netPercentBadge"),
			gpsAccuracyBadge: document.getElementById("gpsAccuracyBadge"),
			helpBtn: document.getElementById("telemetryHelpBtn")
		};
	}

	#bindLanguageChanges() {
		this.#unsubscribeLang = eventBus.on("app:language-changed", () => {
			if (this.#lastData) {
				this.#renderTelemetry(this.#lastData);
			}
		});
	}

	/**
	 * 📡 टेलीमेट्री स्ट्रीम लिसनर (Zero Sensor Math - Pure i18n Display)
	 */
	#bindTelemetryStream() {
		this.#unsubscribe = centerClass.bindTelemetry((data) => {
			if (!data) return;
			this.#lastData = data;
			this.#renderTelemetry(data);
		});
	}

	#renderTelemetry(data) {
		const STATUS_TEXT_MAP = {
			BLOCKED: "pages.home.telemetry.status.blocked",
			NOT_ALLOWED: "pages.home.telemetry.status.notAllowed",
			DEVICE_OFF: "pages.home.telemetry.status.off",
			TUNNEL: "pages.home.telemetry.status.tunnel",
			ACQUIRING: "pages.home.telemetry.status.searching",
			READY: "pages.home.telemetry.status.ready",
		};
		const el = this.#elements;
		// 1. GPS Status Badge
		if (data.gps && el.gpsPercentBadge) {
			const text = data.gps.status === "ACTIVE" 
				? `${data.gps.percentage}%` 
				: (centerClass.t(STATUS_TEXT_MAP[data.gps.status]) || data.gps.status);
			this.#renderBadge(el.gpsPercentBadge, text, data.gps.badgeType);
			if (el.gpsAccuracyBadge) {
				el.gpsAccuracyBadge.textContent = data.gps.precisionText;
			}
		}
		// 2. Network Status Badge
		if (data.network && el.netPercentBadge) {
			const offlineText = centerClass.t("pages.home.telemetry.status.offline") || "Offline";
			const netText = data.network.status === "OFFLINE" ? `0% (${offlineText})` : `${data.network.percentage}%`;
			this.#renderBadge(el.netPercentBadge, netText, data.network.badgeType);
		}
	}

	#renderBadge(badgeEl, text, type) {
		badgeEl.textContent = text;
		badgeEl.className = `telemetry-badge badge-${type}`;
	}

	#bindUserInteractions() {
		const el = this.#elements;
		const signal = this.#abortController.signal;
		// 📍 GPS Status दबाने पर फिर प्रयास या सेटिंग खोलें
		el.gpsRow?.addEventListener("click", () => {
			centerClass.requestGpsPermission(
				() => {},
				(err) => {
					if (err?.code === 1) {
						eventBus.emit("SHOW_TOAST", {
							message: centerClass.t("pages.home.gps.permissionDenied"),
							type: "error"
						});
					} else if (err?.code === 2) {
						eventBus.emit("SHOW_TOAST", {
							message: centerClass.t("pages.home.gps.unavailable"),
							type: "warning"
						});
					}
				}
			);
		}, { signal });
		// (?) सहायता गाइड खोलें
		el.helpBtn?.addEventListener("click", (e) => {
			e.stopPropagation();
			const isOpen = el.card?.classList.toggle("popover-open");
			el.helpBtn.setAttribute("aria-expanded", String(isOpen));
		}, { signal });
		// बाहर क्लिक करने पर पॉपओवर बंद करें
		document.addEventListener("click", (e) => {
			if (el.card && !el.card.contains(e.target)) {
				el.card.classList.remove("popover-open");
				el.helpBtn?.setAttribute("aria-expanded", "false");
			}
		}, { signal });
	}

	destroy() {
		this.#unsubscribe?.();
		if (this.#unsubscribeLang) {
			this.#unsubscribeLang();
			this.#unsubscribeLang = null;
		}
		this.#abortController?.abort();
	}
}
