/**
 * 📲 WidgetBridgeService - Capacitor Native Android Home Screen Widget & Notification Sync
 * Bridges Route Details, Alarm State and Telemetry with Android AppWidget & Status Bar
 */

import { centerClass } from "../../core/CenterClass.js";
import { eventBus } from "../../core/event-bus.js";

const THEME_PALETTES = {
	classic: { accent: "#2563eb", bg: "#1e293b", surface: "#0f172a", text: "#f8fafc" },
	comic: { accent: "#ef4444", bg: "#18181b", surface: "#27272a", text: "#fffde7" },
	anime: { accent: "#b45309", bg: "#152232", surface: "#0f172a", text: "#faf7ea" },
	cyberpunk: { accent: "#00f0ff", bg: "#090314", surface: "#1a0933", text: "#00f0ff" },
	pixel: { accent: "#30cef0", bg: "#08081a", surface: "#12123b", text: "#ffffff" },
	chamgadar: { accent: "#f59e0b", bg: "#0a0b0e", surface: "#161922", text: "#dbe1ea" },
	"makad-manav": { accent: "#ef4444", bg: "#080912", surface: "#131627", text: "#f5f3f7" }
};

class WidgetBridgeService {
	#plugin = null;
	#isInitialized = false;

	init() {
		if (this.#isInitialized) return;
		this.#isInitialized = true;

		if (this.#isNativeCapacitor()) {
			try {
				if (window.Capacitor?.Plugins?.AlarmWidget) {
					this.#plugin = window.Capacitor.Plugins.AlarmWidget;
				} else if (typeof window.Capacitor?.registerPlugin === "function") {
					this.#plugin = window.Capacitor.registerPlugin("AlarmWidget");
				}

				if (this.#plugin?.addListener) {
					this.#plugin.addListener("onWidgetAction", (data) => {
						this.#handleWidgetAction(data);
					});
				}

				if (typeof this.#plugin?.requestNotificationPermission === "function") {
					this.#plugin.requestNotificationPermission().catch(() => {});
				}

				window.addEventListener("theme-applied", (e) => {
					const themeId = e.detail?.themeId;
					if (themeId) {
						this.syncTheme(themeId);
					}
				});

				const initialTheme = document.documentElement.getAttribute("data-theme") || "classic";
				this.syncTheme(initialTheme);
			} catch (err) {
				console.warn("[WidgetBridgeService] Failed to bind AlarmWidget plugin:", err);
			}
		}
	}

	#isNativeCapacitor() {
		return typeof window !== "undefined" && Boolean(window.Capacitor?.isNativePlatform?.());
	}

	/**
	 * Sync Alarm & Widget state
	 */
	updateWidget({
		stationName, status, distance, isRinging = false, isActive = false,
		hasRoute, startStation, endStation, timeText, distanceText, fareText
	} = {}) {
		if (!this.#isNativeCapacitor() || !this.#plugin?.updateWidget) {
			return;
		}

		try {
			const payload = {
				stationName: stationName || "No Alarm Set",
				status: status || "STANDBY",
				distance: distance || "---",
				isRinging: Boolean(isRinging),
				isActive: Boolean(isActive)
			};

			if (hasRoute !== undefined) payload.hasRoute = Boolean(hasRoute);
			if (startStation !== undefined) payload.startStation = startStation;
			if (endStation !== undefined) payload.endStation = endStation;
			if (timeText !== undefined) payload.timeText = timeText;
			if (distanceText !== undefined) payload.distanceText = distanceText;
			if (fareText !== undefined) payload.fareText = fareText;

			this.#plugin.updateWidget(payload);
		} catch (err) {
			console.warn("[WidgetBridgeService] Error syncing to Android widget:", err);
		}
	}

	/**
	 * Sync Route details to Notification bar (independent of alarm)
	 */
	updateRoute({
		hasRoute = true, startStation = "", endStation = "",
		timeText = "", distanceText = "", fareText = ""
	} = {}) {
		if (!this.#isNativeCapacitor() || !this.#plugin?.updateRoute) {
			return;
		}

		try {
			this.#plugin.updateRoute({
				hasRoute: Boolean(hasRoute),
				startStation: String(startStation || ""),
				endStation: String(endStation || ""),
				timeText: String(timeText || ""),
				distanceText: String(distanceText || ""),
				fareText: String(fareText || "")
			});
		} catch (err) {
			console.warn("[WidgetBridgeService] Error updating route in notification:", err);
		}
	}

	/**
	 * Toggle Persistent Notification Mode
	 */
	setPersistentNotification(enabled) {
		if (!this.#isNativeCapacitor() || !this.#plugin?.setPersistentNotification) {
			return;
		}
		try {
			this.#plugin.setPersistentNotification({ enabled: Boolean(enabled) });
		} catch (err) {
			console.warn("[WidgetBridgeService] Error toggling persistent notification:", err);
		}
	}

	/**
	 * Set Notification Layout Style: "boarding_pass" | "minimal_pill" | "progress_bar" | "widget_mirror"
	 */
	setNotificationStyle(style) {
		if (!this.#isNativeCapacitor() || !this.#plugin?.setNotificationStyle) {
			return;
		}
		try {
			this.#plugin.setNotificationStyle({ style: String(style || "boarding_pass") });
		} catch (err) {
			console.warn("[WidgetBridgeService] Error updating notification style:", err);
		}
	}

	/**
	 * Trigger a Live Test Preview Notification on device
	 */
	testNotification(style) {
		if (!this.#isNativeCapacitor() || !this.#plugin?.testNotification) {
			return;
		}
		try {
			this.#plugin.testNotification({ style: style || undefined });
		} catch (err) {
			console.warn("[WidgetBridgeService] Error triggering test notification:", err);
		}
	}

	/**
	 * Clear Route from Notification bar
	 */
	clearRoute() {
		this.updateRoute({
			hasRoute: false, startStation: "", endStation: "",
			timeText: "", distanceText: "", fareText: ""
		});
	}

	/**
	 * Handle button clicks from Android Home Screen & Notification Bar
	 */
	#handleWidgetAction(data) {
		if (!data || !data.action) return;

		if (data.action === "DISMISS") {
			centerClass.dismissAlarm();
			eventBus.emit("SHOW_TOAST", {
				message: centerClass.t("pages.home.alarmBanner.dismissToast"),
				type: "success"
			});
		} else if (data.action === "SNOOZE") {
			centerClass.snoozeAlarm(2);
			eventBus.emit("SHOW_TOAST", {
				message: centerClass.t("pages.home.alarmBanner.snoozeToast"),
				type: "warning"
			});
		}
	}
}

export const widgetBridgeService = new WidgetBridgeService();
