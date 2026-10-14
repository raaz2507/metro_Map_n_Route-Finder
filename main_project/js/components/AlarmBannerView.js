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
		this.#bindStoreSubscriptions();
		this.#syncWithCenterClass();

		// प्रारंभिक अवस्था: यदि स्टोर में पहले से सक्रिय रूट है तो प्रदर्शित करें
		const currentRoute = appStateStore.getState("activeRoute");
		if (currentRoute) {
			this.#populateTargetInfoFromRoute(currentRoute);
		}
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

	/**
	 * 🔄 रिएक्टिव स्टोर और रूट इवेंट्स से बाइंड करें
	 */
	#bindStoreSubscriptions() {
		// A. जब भी सक्रिय रूट सेट या चेंज हो -> स्क्रीन पिल अपडेट करें
		appStateStore.subscribe("activeRoute", (activeRoute) => {
			if (activeRoute) {
				this.#populateTargetInfoFromRoute(activeRoute);
			} else if (this.#currentAlarmState === "INACTIVE") {
				this.#resetStationNameDisplay();
			}
		});

		// B. भाषा बदलने पर स्टेशन का नाम नई भाषा (उदा. हिन्दी / English) में अपडेट करें
		appStateStore.subscribe("currentLang", () => {
			const activeRoute = appStateStore.getState("activeRoute");
			if (activeRoute) {
				this.#populateTargetInfoFromRoute(activeRoute);
			} else if (this.#currentAlarmState === "INACTIVE") {
				this.#resetStationNameDisplay();
			}
		});

		// C. रूट क्लियर होने पर स्क्रीन पिल रीसेट करें (यदि अलार्म इनएक्टिव हो)
		eventBus.on("ROUTE_CLEARED", () => {
			if (this.#currentAlarmState === "INACTIVE") {
				this.#resetStationNameDisplay();
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
				const lang = this.#getCurrentLang();
				let name = "";
				if (target.name) {
					name = typeof target.name === "object" ? (target.name[lang] || target.name.en || target.id) : target.name;
				} else if (target.id) {
					name = centerClass.getStationName(target.id, lang) || target.id;
				}
				this.#setStationNameDisplay(name);
			} else {
				const activeRoute = appStateStore.getState("activeRoute");
				if (activeRoute) {
					this.#populateTargetInfoFromRoute(activeRoute);
				}
			}
		} else {
			const activeRoute = appStateStore.getState("activeRoute");
			if (activeRoute) {
				this.#populateTargetInfoFromRoute(activeRoute);
			} else {
				this.#resetStationNameDisplay();
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
		let activeRoute = appStateStore.getState("activeRoute");
		const isCurrentlyActive = this.#currentAlarmState === "ARMED" || this.#currentAlarmState === "RINGING" || this.#currentAlarmState === "SNOOZED";

		// स्थिति A: यदि अलार्म ON है -> सीधे OFF करें
		if (isCurrentlyActive) {
			centerClass.stopLiveJourney();
			this.#setVisualToggleState(false);
			if (activeRoute) {
				this.#populateTargetInfoFromRoute(activeRoute);
			} else {
				this.#resetStationNameDisplay();
			}
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.alarmBanner.stoppedToast") || "🛑 लाइव अलार्म बंद किया गया",
				type: "info"
			});
			return;
		}

		// स्थिति B: यदि अलार्म OFF था -> अलार्म आर्म (ARM) करें
		// यदि स्टोर में activeRoute नहीं मिला, लेकिन इनपुट फील्ड्स में स्टेशन भरे हैं, तो फॉर्म सबमिट करें
		if (!activeRoute) {
			const startInput = document.getElementById("startStation");
			const endInput = document.getElementById("endStation");
			const startVal = startInput?.value?.trim();
			const endVal = endInput?.value?.trim();

			if (startVal && endVal) {
				const form = document.querySelector(".routeFinder");
				if (form) {
					form.requestSubmit();
					activeRoute = appStateStore.getState("activeRoute");
				}
			}
		}

		if (!activeRoute) {
			eventBus.emit("SHOW_TOAST", {
				message: i18n.t("pages.home.toast.alarm.noRoute") || "⚠️ अलार्म सक्रिय करने के लिए पहले रूट खोजें",
				type: "warning"
			});
			return;
		}

		const savedSettings = localStorage.getItem("metro_alarm_settings");
		const alarmSettings = savedSettings ? JSON.parse(savedSettings) : {};

		const interchanges = activeRoute.interchanges 
			|| (activeRoute.steps ? activeRoute.steps.filter(s => s.type === "interchange" && s.fromStation).map(s => s.fromStation) : []);

		centerClass.startLiveJourney({
			path: activeRoute.path || [],
			interchanges: interchanges,
			destinationId: activeRoute.destination?.id || (activeRoute.path ? activeRoute.path[activeRoute.path.length - 1] : null),
			totalTravelTimeSeconds: activeRoute.totalTravelTimeSeconds || 1800,
			alarmSettings: alarmSettings
		});

		this.#setVisualToggleState(true);
		this.#populateTargetInfoFromRoute(activeRoute);

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
		const lang = this.#getCurrentLang();
		
		let targetName = "";
		if (activeRoute.destination) {
			if (activeRoute.destination.name) {
				targetName = typeof activeRoute.destination.name === "object"
					? (activeRoute.destination.name[lang] || activeRoute.destination.name.en || activeRoute.destination.id)
					: activeRoute.destination.name;
			} else if (activeRoute.destination.id) {
				targetName = centerClass.getStationName(activeRoute.destination.id, lang) || activeRoute.destination.id;
			}
		} else if (Array.isArray(activeRoute.path) && activeRoute.path.length > 0) {
			const lastId = activeRoute.path[activeRoute.path.length - 1];
			targetName = centerClass.getStationName(lastId, lang) || lastId;
		}

		if (targetName) {
			this.#setStationNameDisplay(targetName);
		}
	}

	/**
	 * 🔤 स्टेशन नाम डिस्प्ले सेट करें (data-i18n क्लैश से सुरक्षा)
	 */
	#setStationNameDisplay(name) {
		const el = this.#elements.stationName;
		if (!el) return;
		el.removeAttribute("data-i18n");
		el.textContent = name || "---";
	}

	/**
	 * 🔄 'No Alarm Set' टेक्स्ट रिसेट करें
	 */
	#resetStationNameDisplay() {
		const el = this.#elements.stationName;
		if (!el) return;
		el.setAttribute("data-i18n", "pages.home.alarmBanner.noAlarmSet");
		el.textContent = i18n.t("pages.home.alarmBanner.noAlarmSet") || "No Alarm Set";
	}

	/**
	 * 🌐 सुरक्षित भाषा कोड एक्सट्रैक्टर (Getter vs Method Type-Safe)
	 */
	#getCurrentLang() {
		if (typeof i18n.getLanguage === "function") {
			return i18n.getLanguage();
		}
		if (typeof i18n.getLanguage === "string") {
			return i18n.getLanguage;
		}
		return appStateStore.getState("currentLang") || "en";
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