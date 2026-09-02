/**
 * 📊 WidgetTelemetry - Pure View Component (Zero Sensor Logic)
 * Enterprise ES2022 Decoupled UI Component
 */

import { centerClass } from "../core/CenterClass.js";

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
     * 📡 शुद्ध टेलीमेट्री स्ट्रीम लिसनर (Pure View Rendering)
     */
    #bindTelemetryStream() {
        this.#unsubscribe = centerClass.bindTelemetry((data) => {
            if (!data) return;

            const el = this.#elements;

            // 1. GPS बैज व एक्यूरेसी रेंडर
            if (el.gpsPercentBadge && data.gps) {
                this.#renderBadge(el.gpsPercentBadge, data.gps.badgeText, data.gps.badgeType);
            }
            if (el.gpsAccuracyBadge && data.gps) {
                el.gpsAccuracyBadge.textContent = data.gps.precisionText;
            }

            // 2. नेटवर्क बैज रेंडर
            if (el.netPercentBadge && data.network) {
                this.#renderBadge(el.netPercentBadge, data.network.badgeText, data.network.badgeType);
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

        // 🛰️ GPS Status पंक्ति पर टैप करते ही डायलॉग बॉक्स खुलेगा
        el.gpsRow?.addEventListener("click", () => {
            centerClass.requestGpsPermission();
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