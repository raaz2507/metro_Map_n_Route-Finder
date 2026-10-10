/**
 * 🔔 AlarmBannerView - 2.5D Unified Alarm & Transit Tracker View Controller
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
			wrapper: document.getElementById("alarmWidgetWrapper"),
			widget: document.getElementById("alarmWidget"),
			stationName: document.getElementById("alarmStationName"),
			screenIcon: document.getElementById("alarmScreenIcon"),
			statusLabel: document.getElementById("alarmStatusLabel"),
			btnDismiss: document.getElementById("btnAlarmDismiss"),
			btnSnooze: document.getElementById("btnAlarmSnooze"),
			podBtn: document.getElementById("alarmPodBtn"),
			podIcon: document.getElementById("alarmPodIcon"),
			liveDistance: document.getElementById("alarmLiveDistance"),
		};
	}

	#bindEvents() {
		const el = this.#elements;
		const signal = this.#abortController.signal;

		// 1. Dismiss Button (Dismisses current station alert)
		el.btnDismiss?.addEventListener("click", () => {
			centerClass.dismissAlarm();
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.alarmBanner.dismissToast") || "🔔 अगला अलर्ट: गंतव्य स्टेशन",
				type: "success"
			});
		}, { signal });

		// 2. Snooze Button (Snoozes 2 Minutes)
		el.btnSnooze?.addEventListener("click", () => {
			centerClass.snoozeAlarm(2);
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.alarmBanner.snoozeToast") || "⏱️ अलार्म 2 मिनट के लिए स्नूज़ किया गया",
				type: "warning"
			});
		}, { signal });

		// 3. 2.5D Left Alarm Pod Button Toggle (ON / OFF)
		el.podBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			this.#handlePodBtnClick();
		}, { signal });

		// 4. Live GPS Telemetry Stream (Distance to Next Station)
		eventBus.on("TELEMETRY_UPDATE", (telemetry) => {
			if (telemetry && telemetry.type === "GPS" && typeof telemetry.distanceMeters === "number") {
				this.#updateLiveDistance(telemetry.distanceMeters);
			}
		});
	}

	#syncWithCenterClass() {
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

		if (alarmState.isFallback) {
			const fallbackKey = alarmState.fallbackReason === "PERMISSION_DENIED"
				? "pages.home.gps.permissionDenied"
				: (alarmState.fallbackReason === "GPS_UNAVAILABLE" 
					? "pages.home.gps.unavailable" 
					: "pages.home.gps.gpsFallbackWarning");
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t(fallbackKey) || "⚠️ GPS unavailable. Using estimated travel time.",
				type: "warning"
			});
		}

		const isArmed = this.#currentAlarmState === "ARMED" || this.#currentAlarmState === "RINGING" || this.#currentAlarmState === "SNOOZED";
		this.#setVisualToggleState(isArmed);

		const el = this.#elements;

		if (isArmed) {
			if (alarmState.targetStation) {
				const target = alarmState.targetStation;
				const lang = i18n.getLanguage ? i18n.getLanguage() : "en";
				const name = lang === "hi" ? (target.name?.hi || target.id) : (target.name?.en || target.id);
				if (el.stationName) el.stationName.textContent = name;
			}
		} else {
			if (el.stationName) {
				el.stationName.textContent = i18n.t("pages.home.alarmBanner.noAlarmSet");
			}
			if (el.liveDistance) {
				el.liveDistance.textContent = "---";
			}
		}
	}

	/**
	 * 🔔 2.5D Left Alarm Pod Button Click Handler
	 */
	#handlePodBtnClick() {
		const activeRoute = appStateStore.getState("activeRoute");
		const isCurrentlyActive = this.#currentAlarmState === "ARMED" || this.#currentAlarmState === "RINGING" || this.#currentAlarmState === "SNOOZED";

		// स्थिति A: यदि अलार्म ON है -> सीधे OFF करें
		if (isCurrentlyActive) {
			centerClass.stopLiveJourney();
			this.#setVisualToggleState(false);
			if (this.#elements.stationName) {
				this.#elements.stationName.textContent = i18n.t("pages.home.alarmBanner.noAlarmSet");
			}
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.alarmBanner.stoppedToast") || "🛑 लाइव अलार्म बंद किया गया",
				type: "info"
			});
			return;
		}

		// स्थिति B: यदि अलार्म OFF था -> अलार्म आर्म (ARM) करें
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

		if (activeRoute) {
			this.#populateTargetInfoFromRoute(activeRoute);
		}

		eventBus.emit("SHOW_TOAST", {
			message: i18n.t("pages.home.alarmBanner.enabledToast") || "🔔 लाइव यात्रा अलार्म सक्रिय है",
			type: "success"
		});
	}

	/**
	 * रूट से टारगेट स्टेशन का नाम सेट करें
	 */
	#populateTargetInfoFromRoute(activeRoute) {
		if (!activeRoute) return;
		const el = this.#elements;
		const lang = i18n.getLanguage ? i18n.getLanguage() : "en";
		
		const targetName = activeRoute.destination?.name?.[lang] 
			|| activeRoute.destination?.name?.en 
			|| activeRoute.destination?.id 
			|| "Destination";
		
		if (el.stationName) el.stationName.textContent = targetName;
	}

	/**
	 * 🎨 2.5D विजेट का विज़ुअल स्टेटस टॉगल करें
	 */
	#setVisualToggleState(isArmed) {
		this.#currentAlarmState = isArmed ? "ARMED" : "INACTIVE";
		const el = this.#elements;

		if (el.widget) {
			el.widget.classList.toggle("is-active", isArmed);
			el.widget.classList.toggle("is-inactive", !isArmed);
		}

		if (el.wrapper) {
			el.wrapper.classList.toggle("is-active", isArmed);
			el.wrapper.classList.toggle("is-inactive", !isArmed);
		}

		if (el.podIcon) {
			if (isArmed) {
				el.podIcon.classList.replace("alarm-off-iocn", "alarm-on-iocn");
			} else {
				el.podIcon.classList.replace("alarm-on-iocn", "alarm-off-iocn");
			}
		}

		if (el.statusLabel) {
			const statusKey = isArmed ? "pages.home.alarmBanner.statusRunning" : "pages.home.alarmBanner.statusStandby";
			el.statusLabel.textContent = i18n.t(statusKey) || (isArmed ? "RUNNING" : "STANDBY");
		}

		if (!isArmed && el.liveDistance) {
			el.liveDistance.textContent = "---";
		}
	}

	/**
	 * 📍 रियल-टाइम GPS डिस्टेंस अपडेट
	 */
	#updateLiveDistance(distanceMeters) {
		const el = this.#elements.liveDistance;
		if (!el) return;

		if (distanceMeters === null || distanceMeters === undefined || this.#currentAlarmState === "INACTIVE") {
			el.textContent = "---";
			return;
		}

		el.textContent = `${Math.round(distanceMeters)} m`;
	}

	destroy() {
		this.#abortController?.abort();
	}
}