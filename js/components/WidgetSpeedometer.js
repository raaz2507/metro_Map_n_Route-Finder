/**
 * ⚡ SpeedometerWidget - Independent Live Speedometer with Dynamic Colors & Tooltip
 * Enterprise ES2022 Decoupled UI Component
 */

import { centerClass } from "../core/CenterClass.js";
import i18n from "../core/i18n.js";

export class SpeedometerWidget {
    #elements = {};
    #abortController = null;
    #maxSpeedRecorded = 0.0;

    init() {
        this.#abortController = new AbortController();
        this.#queryElements();
        this.#bindEvents();
        this.#bindSpeedUpdates();
    }

    #queryElements() {
        this.#elements = {
            widget: document.getElementById("speedometer-widget"),
            speedValue: document.getElementById("speed-value"),
            tooltip: document.getElementById("speedometerTooltip"),
            topValue: document.getElementById("speedTopValue"),
            accuracyValue: document.getElementById("speedAccuracyValue"),
            statusValue: document.getElementById("speedStatusValue")
        };
    }

    #bindEvents() {
        const widget = this.#elements.widget;
        if (!widget) return;

        const signal = this.#abortController.signal;

        // ⚡ स्पीडोमीटर पर क्लिक/टैप करने पर:
        widget.addEventListener("click", () => {
            // 1. यदि GPS अभी तक एक्टिव नहीं है, तो डायलॉग बॉक्स खोलें
            centerClass.requestGpsPermission();

            // 2. टूलटिप टॉगल करें
            widget.classList.toggle("tooltip-active");
        }, { signal });

        // बाहर क्लिक करने पर टूलटिप बंद करें
        document.addEventListener("click", (e) => {
            if (!widget.contains(e.target)) {
                widget.classList.remove("tooltip-active");
            }
        }, { signal });
    }

    #bindSpeedUpdates() {
        centerClass.bindSpeedometer((telemetry) => {
            if (!telemetry) return;

            const el = this.#elements;
            const currentSpeed = typeof telemetry.currentSpeedKmh === "number" ? telemetry.currentSpeedKmh : 0;
            const maxSpeed = typeof telemetry.maxSpeedKmh === "number" ? telemetry.maxSpeedKmh : currentSpeed;
            const accuracy = typeof telemetry.accuracy === "number" ? telemetry.accuracy : null;
            const motionState = telemetry.motionState || "HALTED";

            // 1. स्पीड नंबर अपडेट
            if (el.speedValue) {
                el.speedValue.textContent = currentSpeed.toFixed(1);
            }

            // 2. मोशन स्टेट कलरिंग ('HALTED' | 'DEPARTING' | 'CRUISING')
            if (el.widget) {
                el.widget.setAttribute("data-motion", motionState);
            }

            // 3. टूलटिप डेटा अपडेट
            if (el.topValue) {
                if (maxSpeed > this.#maxSpeedRecorded) {
                    this.#maxSpeedRecorded = maxSpeed;
                }
                el.topValue.textContent = `${this.#maxSpeedRecorded.toFixed(1)} km/h`;
            }

            if (el.accuracyValue) {
                el.accuracyValue.textContent = accuracy !== null ? `±${accuracy} m` : "±-- m";
            }

            if (el.statusValue) {
                let statusKey = "pages.home.speedometer.statusHalted";
                if (motionState === "DEPARTING") statusKey = "pages.home.speedometer.statusDeparting";
                else if (motionState === "CRUISING") statusKey = "pages.home.speedometer.statusCruising";

                el.statusValue.textContent = i18n.t(statusKey);
            }
        });
    }

    destroy() {
        this.#abortController?.abort();
    }
}