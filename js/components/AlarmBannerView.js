/**
 * 🔔 AlarmBannerView - Floating Ringing Banner, Speedometer & Floating Nav Controller
 * Enterprise ES2022 Decoupled UI Component
 */

import { centerClass } from "../core/CenterClass.js";
import { eventBus } from "../core/event-bus.js";
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";

export class AlarmBannerView {
	#elements = {};
	#abortController = null;
	#currentAlarmState = "INACTIVE";

	init() {
		this.#abortController = new AbortController();
		this.#queryElements();
		this.#bindEvents();
		this.#syncWithCenterClass();
	}

	#queryElements() {
		this.#elements = {
			banner: document.getElementById("alarmRingingBanner"),
			stationName: document.getElementById("alarmTargetStationName"),
			subtext: document.getElementById("alarmTargetSubtext"),
			btnDismiss: document.getElementById("btnAlarmDismiss"),
			btnSnooze: document.getElementById("btnAlarmSnooze"),
			btnStop: document.getElementById("btnAlarmStop"),
			floatingAlarmBtn: document.getElementById("floatingAlarmBtn"),
			floatingAlarmIcon: document.getElementById("floatingAlarmIcon"),
			floatingAlarmNav: document.getElementById("floatingAlarmNav"),
		};
	}

	#bindEvents() {
		const el = this.#elements;
		const signal = this.#abortController.signal;

		// 1. Dismiss Button (Current Alarm Stops, Destination Alert active)
		el.btnDismiss?.addEventListener("click", () => {
			centerClass.dismissAlarm();
			this.#hideBanner();
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.alarmBanner.dismissToast") || "🔔 अगला अलर्ट: गंतव्य स्टेशन",
				type: "success"
			});
		}, { signal });
		// 2. Snooze Button (Snooze 2 Min)
		el.btnSnooze?.addEventListener("click", () => {
			centerClass.snoozeAlarm(2);
			this.#hideBanner();
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.alarmBanner.snoozeToast") || "⏱️ अलार्म 2 मिनट के लिए स्नूज़ किया गया",
				type: "warning"
			});
		}, { signal });
		// 3. Stop Button (Stop Entire Alarm)
		el.btnStop?.addEventListener("click", () => {
			centerClass.stopLiveJourney();
			this.#hideBanner();
			this.#setVisualToggleState(false);
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.alarmBanner.stoppedToast") || "🛑 लाइव अलार्म बंद कर दिया गया",
				type: "info"
			});
		}, { signal });

		// 4. Floating Nav Alarm Button Toggle
		el.floatingAlarmBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			this.#handleFloatingBtnClick();
		}, { signal });
	}

	#syncWithCenterClass() {
		// A. अलार्म स्टेट लिसनर
		centerClass.bindAlarmState((alarmState) => {
			this.#handleStateChange(alarmState);
		});

		eventBus.on("ALARM_STATE_CHANGE", (alarmState) => {
			this.#handleStateChange(alarmState);
		});
	}

	#handleStateChange(alarmState) {
		if (!alarmState) return;
		this.#currentAlarmState = alarmState.state || "INACTIVE";
		// ⚠️ यदि फ़ॉलबैक मोड एक्टिव हुआ है, तो View Layer टोस्ट दिखाएगा
		if (alarmState.isFallback) {
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.gps.gpsFallbackWarning") || "⚠️ GPS is off. Alarm will rely on estimated travel time.",
				type: "warning"
			});
		}


		const el = this.#elements;

		// 1. यदि अलार्म बज रहा है (RINGING)
		if (this.#currentAlarmState === "RINGING") {
			const target = alarmState.targetStation || {};
			const lang = i18n.getLanguage || "en";
			const name = lang === "hi" ? (target.name?.hi || target.id) : (target.name?.en || target.id);

			if (el.stationName) el.stationName.textContent = name;
			
			if (el.subtext) {
				const subtextKey = target.isInterchange 
					? "pages.home.alarmBanner.interchangeAlert" 
					: "pages.home.alarmBanner.destinationAlert";
				el.subtext.textContent = i18n.t(subtextKey);
			}
			this.#showBanner();
		} else {
			this.#hideBanner();
		}

		// 2. फ़्लोटिंग बटन का आइकन और स्टेटस टॉगल
		const isArmed = this.#currentAlarmState === "ARMED" || this.#currentAlarmState === "RINGING";
		
		if (el.floatingAlarmIcon) {
			if (isArmed) {
				el.floatingAlarmIcon.classList.replace("alarm-off-iocn", "alarm-on-iocn");
			} else {
				el.floatingAlarmIcon.classList.replace("alarm-on-iocn", "alarm-off-iocn");
			}
		}

		if (el.floatingAlarmNav) {
			el.floatingAlarmNav.classList.toggle("alarm-active", isArmed);
		}

	}

	/**
	 * 🔔 फ़्लोटिंग अलार्म बटन: शुद्ध ON / OFF टॉगल
	 */
		#handleFloatingBtnClick() {
        const isCurrentlyActive = this.#currentAlarmState === "ARMED" || this.#currentAlarmState === "RINGING";

        // 🛑 1. यदि पहले से चालू है -> अलार्म बंद करें
        if (isCurrentlyActive) {
            centerClass.stopLiveJourney();
            this.#setVisualToggleState(false);
            eventBus.emit("SHOW_TOAST", {
                message: i18n.t("pages.home.alarmBanner.stoppedToast") || "🛑 लाइव अलार्म बंद किया गया",
                type: "info"
            });
            return;
        }

        // 🔔 2. अलार्म तुरंत चालू करें (बिना किसी रुकावट या Toast के)
        const activeRoute = appStateStore.getState("activeRoute");
        const savedSettings = localStorage.getItem("metro_alarm_settings");
        const alarmSettings = savedSettings ? JSON.parse(savedSettings) : {};

        centerClass.startLiveJourney({
            path: activeRoute?.path || [],
            interchanges: activeRoute?.interchanges || [],
            destinationId: activeRoute?.destination?.id || (activeRoute?.path ? activeRoute.path[activeRoute.path.length - 1] : null),
            totalTravelTimeSeconds: activeRoute?.totalTravelTimeSeconds || 1800,
            alarmSettings: alarmSettings
        });

        this.#setVisualToggleState(true);
        eventBus.emit("SHOW_TOAST", {
            message: i18n.t("pages.home.alarmBanner.enabledToast") || "🔔 लाइव यात्रा अलार्म सक्रिय है",
            type: "success"
        });
    }

	/**
	 * 🎨 आइकन और बटन का विज़ुअल स्टेटस टॉगल करें
	 * @param {boolean} isArmed 
	 */
	#setVisualToggleState(isArmed) {
		this.#currentAlarmState = isArmed ? "ARMED" : "INACTIVE";
		const el = this.#elements;
		if (el.floatingAlarmIcon) {
			if (isArmed) {
				el.floatingAlarmIcon.classList.replace("alarm-off-iocn", "alarm-on-iocn");
			} else {
				el.floatingAlarmIcon.classList.replace("alarm-on-iocn", "alarm-off-iocn");
			}
		}
		if (el.floatingAlarmNav) {
			el.floatingAlarmNav.classList.toggle("alarm-active", isArmed);
		}
	}


	#showBanner() {
		if (this.#elements.banner) {
			this.#elements.banner.classList.add("active");
			this.#elements.banner.setAttribute("aria-hidden", "false");
		}
	}

	#hideBanner() {
		if (this.#elements.banner) {
			this.#elements.banner.classList.remove("active");
			this.#elements.banner.setAttribute("aria-hidden", "true");
		}
	}

	destroy() {
		this.#abortController?.abort();
	}
}