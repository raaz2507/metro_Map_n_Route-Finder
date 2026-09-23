/**
 * 📊 WidgetTelemetry - Pure View Component (Zero Sensor Logic)
 * Enterprise ES2022 Decoupled UI Component
 */

import { centerClass } from "../core/CenterClass.js";
import { eventBus } from "../core/event-bus.js";
import i18n from "../core/i18n.js";

export class TelemetryWidget {
    #elements = {};
    #abortController = null;
    #unsubscribe = null;

    init() {
        this.#abortController = new AbortController();
        this.#queryElements();
        this.#bindTelemetryStream();
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

   /**
     * 📡 टेलीमेट्री स्ट्रीम लिसनर (Zero Sensor Math - Pure i18n Display)
     */
    #bindTelemetryStream() {
        const STATUS_TEXT_MAP = {
            BLOCKED: "pages.home.telemetry.gpsBlocked",
            NOT_ALLOWED: "pages.home.telemetry.gpsPrompt",
            DEVICE_OFF: "pages.home.telemetry.gpsDeviceOff",
            TUNNEL: "pages.home.telemetry.gpsTunnel",
            ACQUIRING: "pages.home.telemetry.gpsAcquiring",
            READY: "pages.home.telemetry.gpsReady",
        };
        this.#unsubscribe = centerClass.bindTelemetry((data) => {
            if (!data) return;
            const el = this.#elements;
            // 1. GPS रेंडर (स्टेटस कोड से टेक्स्ट ट्रांसलेशन)
            if (data.gps && el.gpsPercentBadge) {
                const text = data.gps.status === "ACTIVE" 
                    ? `${data.gps.percentage}%` 
                    : (i18n.t(STATUS_TEXT_MAP[data.gps.status]) || data.gps.status);
                this.#renderBadge(el.gpsPercentBadge, text, data.gps.badgeType);
                if (el.gpsAccuracyBadge) {
                    el.gpsAccuracyBadge.textContent = data.gps.precisionText;
                }
            }
            // 2. नेटवर्क रेंडर
            if (data.network && el.netPercentBadge) {
                const netText = data.network.status === "OFFLINE" ? "0% (Offline)" : `${data.network.percentage}%`;
                this.#renderBadge(el.netPercentBadge, netText, data.network.badgeType);
            }
        });
    }

    #renderBadge(badgeEl, text, type) {
        badgeEl.textContent = text;
        badgeEl.className = `telemetry-badge badge-${type}`;
    }

    #bindUserInteractions() {
        const el = this.#elements;
        const signal = this.#abortController.signal;
        // 🛰️ GPS Status पंक्ति पर टैप करते ही परमिशन चेक
        el.gpsRow?.addEventListener("click", () => {
            centerClass.requestGpsPermission(
                () => {},
                (err) => {
                    if (err?.code === 1) {
                        eventBus.emit("SHOW_TOAST", {
                            message: i18n.t("pages.home.gps.permissionDenied") || "📍 लोकेशन अनुमति ब्लॉक है। कृपया ब्राउज़र सेटिंग्स में Allow करें।",
                            type: "error"
                        });
                    } else if (err?.code === 2) {
                        eventBus.emit("SHOW_TOAST", {
                            message: i18n.t("pages.home.gps.unavailable") || "📍 फ़ोन का GPS बंद है। कृपया डिवाइस लोकेशन ऑन करें।",
                            type: "warning"
                        });
                    }
                }
            );
        }, { signal });
        // (?) हेल्प बटन टॉगल
        el.helpBtn?.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = el.card?.classList.toggle("popover-open");
            el.helpBtn.setAttribute("aria-expanded", String(isOpen));
        }, { signal });
        // बाहर क्लिक करने पर पॉपओवर बंद
        document.addEventListener("click", (e) => {
            if (el.card && !el.card.contains(e.target)) {
                el.card.classList.remove("popover-open");
                el.helpBtn?.setAttribute("aria-expanded", "false");
            }
        }, { signal });
    }
    destroy() {
        this.#unsubscribe?.();
        this.#abortController?.abort();
    }
}