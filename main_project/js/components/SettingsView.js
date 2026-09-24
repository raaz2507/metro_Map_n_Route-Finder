/**
 * ⚙️ SettingsView - Multi-Tab Folder Settings Orchestrator
 * Enterprise ES2022 Modular Architecture with Sub-Controllers
 * 
 * 1. AlarmSettingsController: Geofence, Audio synthesis preview, Haptics & Voice
 * 2. MapSettingsController: Auto-center, Interchange walkways display
 * 3. SettingsView: Main Coordinator for Tab Switching & State Management
 */

import { AudioPlayer } from "../services/alarm/AudioPlayer.js";
import { centerClass } from "../core/CenterClass.js";
import { eventBus } from "../core/event-bus.js";
import i18n from "../core/i18n.js";

// =============================================================================
// 1. 🔔 ALARM SETTINGS SUB-CONTROLLER
// =============================================================================
class AlarmSettingsController {
	#elements = {};
	#audioPlayer = null;
	#isPlayingTestSound = false;
	#testSoundTimer = null;
	#abortController = null;

	#defaultSettings = {
		thresholdDistanceMeters: 500,
		alertOnDestination: true,
		alertOnInterchange: true,
		soundType: "chime",          // chime | beep | siren | custom
		customAudioUrl: null,
		customAudioName: "",
		volume: 80,                  // 0 - 100
		vibrationPattern: "long",    // long | short | sos | continuous
		enableVoiceAnnouncement: true
	};

	#settings = {};

	constructor() {
		this.#audioPlayer = new AudioPlayer();
	}

	/**
	 * इनिशियलाइज़ करें और DOM से बाइंड करें
	 */
	init() {
		this.#abortController = new AbortController();
		this.#queryElements();
		this.#loadSettings();
		this.#bindEvents();
		this.#render();
		this.#initVoices();
	}
	destroy() {
		this.#stopTestSound();
		this.#abortController?.abort();
	}

	#queryElements() {
		const panel = document.getElementById("panel-setting-alarm");
		if (!panel) return;

		this.#elements = {
			panel,
			thresholdDist: document.getElementById("settingThresholdDist"),
			alertDest: document.getElementById("settingAlertDest"),
			alertInterchange: document.getElementById("settingAlertInterchange"),
			soundType: document.getElementById("settingSoundType"),
			customMp3Box: document.getElementById("settingCustomMp3Box"),
			mp3FileInput: document.getElementById("settingMp3File"),
			selectedFileName: document.getElementById("selectedFileName"),
			volumeRange: document.getElementById("settingVolumeRange"),
			volumeBadge: document.getElementById("settingVolumeBadge"),
			btnTestSound: document.getElementById("btnTestSound"),
			vibePattern: document.getElementById("settingVibePattern"),
			btnTestVibe: document.getElementById("btnTestVibe"),
			voiceAnnounce: document.getElementById("settingVoiceAnnounce"),
			btnReset: document.getElementById("btnResetSettings"),
			voiceSelect: document.getElementById("settingVoiceSelect"),
			btnTestVoice: document.getElementById("btnTestVoice"),
		};
	}

	#loadSettings() {
		try {
			const saved = localStorage.getItem("metro_alarm_settings");
			this.#settings = saved ? { ...this.#defaultSettings, ...JSON.parse(saved) } : { ...this.#defaultSettings };
		} catch (e) {
			console.warn("[AlarmSettings] Failed to parse saved settings, using defaults.", e);
			this.#settings = { ...this.#defaultSettings };
		}

		// CenterClass के अलार्म इंजन को सिंक करें
		centerClass.updateAlarmSettings(this.#settings);
	}

	#saveSettings() {
		try {
			localStorage.setItem("metro_alarm_settings", JSON.stringify(this.#settings));
			centerClass.updateAlarmSettings(this.#settings);
			eventBus.emit("ALARM_SETTINGS_UPDATED", this.#settings);
		} catch (e) {
			console.error("[AlarmSettings] Failed to save settings:", e);
		}
	}

	#render() {
		const el = this.#elements;
		if (!el.panel) return;

		if (el.thresholdDist) el.thresholdDist.value = String(this.#settings.thresholdDistanceMeters);
		if (el.alertDest) el.alertDest.checked = Boolean(this.#settings.alertOnDestination);
		if (el.alertInterchange) el.alertInterchange.checked = Boolean(this.#settings.alertOnInterchange);
		if (el.soundType) el.soundType.value = this.#settings.soundType;

		// Custom MP3 Box Visibility
		if (el.customMp3Box) {
			el.customMp3Box.style.display = this.#settings.soundType === "custom" ? "flex" : "none";
		}
		if (el.selectedFileName) {
			el.selectedFileName.textContent = this.#settings.customAudioName || "Select Audio File...";
		}

		// Volume
		if (el.volumeRange) el.volumeRange.value = String(this.#settings.volume);
		if (el.volumeBadge) el.volumeBadge.textContent = `${this.#settings.volume}%`;

		// Vibration & Voice
		if (el.vibePattern) el.vibePattern.value = this.#settings.vibrationPattern;
		if (el.voiceAnnounce) el.voiceAnnounce.checked = Boolean(this.#settings.enableVoiceAnnouncement);
	}

	#bindEvents() {
		const el = this.#elements;
		const signal = this.#abortController.signal;

		// 1. Threshold Distance Dropdown
		el.thresholdDist?.addEventListener("change", (e) => {
			this.#settings.thresholdDistanceMeters = e.target.value === "station_1" ? "station_1" : Number(e.target.value);
			this.#saveSettings();
		}, { signal });

		// 2. Alert Destination Toggle
		el.alertDest?.addEventListener("change", (e) => {
			this.#settings.alertOnDestination = e.target.checked;
			this.#saveSettings();
		}, { signal });
		// 3. Alert Interchange Toggle
		el.alertInterchange?.addEventListener("change", (e) => {
			this.#settings.alertOnInterchange = e.target.checked;
			this.#saveSettings();
		}, { signal });

		// 4. Sound Tone Select
		el.soundType?.addEventListener("change", (e) => {
			this.#settings.soundType = e.target.value;
			if (el.customMp3Box) {
				el.customMp3Box.style.display = this.#settings.soundType === "custom" ? "flex" : "none";
			}
			this.#saveSettings();
		}, { signal });

		// 5. Custom Audio File Picker
		el.mp3FileInput?.addEventListener("change", (e) => {
			const file = e.target.files?.[0];
			if (!file) return;

			const blobUrl = URL.createObjectURL(file);
			this.#settings.customAudioUrl = blobUrl;
			this.#settings.customAudioName = file.name;
			if (el.selectedFileName) {
				el.selectedFileName.textContent = file.name;
			}
			this.#saveSettings();
		}, { signal });

		// 6. Volume Slider
		el.volumeRange?.addEventListener("input", (e) => {
			const val = Number(e.target.value);
			this.#settings.volume = val;
			if (el.volumeBadge) el.volumeBadge.textContent = `${val}%`;
			this.#saveSettings();
		}, { signal });

		// 7. Sound Preview Test Button (4 Seconds Auto-Stop)
		el.btnTestSound?.addEventListener("click", () => {
			this.#toggleTestSound();
		}, { signal });

		// 8. Vibration Pattern Select
		el.vibePattern?.addEventListener("change", (e) => {
			this.#settings.vibrationPattern = e.target.value;
			this.#saveSettings();
		}, { signal });

		// 9. Vibration Test Button (View Layer UI Feedback)
		el.btnTestVibe?.addEventListener("click", () => {
			const result = this.#audioPlayer.triggerVibrate(this.#settings.vibrationPattern);

			if (result.success) {
				eventBus.emit("SHOW_TOAST", {
					message: i18n.t("pages.home.sidebar.appSettings.alarm.vibe.vibeSuccess") || "📳 Vibration triggered! (Check touch haptics if not felt)",
					type: "success"
				});
			} else if (result.reason === "BLOCKED_BY_DEVICE") {
				eventBus.emit("SHOW_TOAST", {
					message: i18n.t("pages.home.sidebar.appSettings.alarm.vibe.vibeBlocked") || "⚠️ Vibration blocked. Please check phone Silent/DND mode or Haptics setting.",
					type: "error"
				});
			} else {
				eventBus.emit("SHOW_TOAST", {
					message: i18n.t("pages.home.sidebar.appSettings.alarm.vibe.unsupported") || "📳 Haptic vibration is only supported on mobile devices (Android/PWA)",
					type: "warning"
				});
			}
		}, { signal });
		
		// 10. Voice Announcements Toggle
		el.voiceAnnounce?.addEventListener("change", (e) => {
			this.#settings.enableVoiceAnnouncement = e.target.checked;
			this.#saveSettings();
		}, { signal });

		// 11. Reset to Defaults
		el.btnReset?.addEventListener("click", () => {
			this.#settings = { ...this.#defaultSettings };
			this.#saveSettings();
			this.#render();
		}, { signal });


		// Voice Selection Dropdown Change
		el.voiceSelect?.addEventListener("change", (e) => {
			this.#settings.selectedVoiceURI = e.target.value;
			this.#saveSettings();
		}, { signal });

		// Test Voice Button Click
		el.btnTestVoice?.addEventListener("click", () => {
			this.#testVoiceAnnouncement();
		}, { signal });
	}

	#toggleTestSound() {
		const btn = this.#elements.btnTestSound;
		this.#audioPlayer.unlockAudioContext();

		if (this.#isPlayingTestSound) {
			this.#stopTestSound();
			return;
		}

		// 1. सेटिंग्स अप्लाई करें
		this.#audioPlayer.setSoundType(this.#settings.soundType);
		this.#audioPlayer.setVolume(this.#settings.volume / 100);
		if (this.#settings.soundType === "custom" && this.#settings.customAudioUrl) {
			this.#audioPlayer.setCustomAudioUrl(this.#settings.customAudioUrl);
		}

		// 2. ✅ सही मेथड playAlarm() है
		this.#audioPlayer.playAlarm();

		this.#isPlayingTestSound = true;
		if (btn) btn.classList.add("playing");

		// 4 सेकंड बाद अपने आप बंद हो जाए
		clearTimeout(this.#testSoundTimer);
		this.#testSoundTimer = setTimeout(() => {
			this.#stopTestSound();
		}, 4000);
	}

	#stopTestSound() {
		// ✅ सही मेथड stopAlarm() है
		this.#audioPlayer.stopAlarm();
		this.#isPlayingTestSound = false;
		clearTimeout(this.#testSoundTimer);
		if (this.#elements.btnTestSound) {
			this.#elements.btnTestSound.classList.remove("playing");
		}
	}

	


		/**
	 * डिवाइस/सिस्टम की TTS वॉइस स्कैन करके ड्रॉपडाउन में भरें
	 */
	#initVoices() {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

		const populateVoices = () => {
			const voices = window.speechSynthesis.getVoices();
			if (!voices || voices.length === 0) return;

			const select = this.#elements.voiceSelect;
			if (!select) return;

			select.innerHTML = `<option value="auto">Auto (Match App Language)</option>`;

			voices.forEach((voice) => {
				const lang = voice.lang.toLowerCase();
				if (lang.includes("hi") || lang.includes("en") || lang.includes("in")) {
					const opt = document.createElement("option");
					opt.value = voice.voiceURI;
					opt.textContent = `${voice.name} (${voice.lang})`;
					if (this.#settings.selectedVoiceURI === voice.voiceURI) {
						opt.selected = true;
					}
					select.appendChild(opt);
				}
			});
		};

		populateVoices();
		if (window.speechSynthesis.onvoiceschanged !== undefined) {
			window.speechSynthesis.onvoiceschanged = populateVoices;
		}
	}

	/**
	 * लाइव टेस्ट वॉइस बोलकर सुनाएं
	 */
	#testVoiceAnnouncement() {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) {
			console.warn("[TTS] SpeechSynthesis not supported.");
			return;
		}

		window.speechSynthesis.cancel(); // पहले से चल रहा वाक्य रोकें

		const currentLang = localStorage.getItem("language") || "en";
		const isHindi = currentLang === "hi";

		const text = isHindi
			? "कृपया ध्यान दें। आपका स्टेशन राजीव चौक आने वाला है। कृपया यहाँ अपनी लाइन बदलें।"
			: "Attention please. Approaching your station, Rajiv Chowk. Please change line here.";

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = isHindi ? "hi-IN" : "en-IN";
		utterance.pitch = 0.95;
		utterance.rate = 0.9;
		utterance.volume = (this.#settings.volume || 80) / 100;

		if (this.#settings.selectedVoiceURI && this.#settings.selectedVoiceURI !== "auto") {
			const voices = window.speechSynthesis.getVoices();
			const foundVoice = voices.find(v => v.voiceURI === this.#settings.selectedVoiceURI);
			if (foundVoice) utterance.voice = foundVoice;
		}

		window.speechSynthesis.speak(utterance);
	}
}


// =============================================================================
// 2. 🗺️ MAP SETTINGS SUB-CONTROLLER
// =============================================================================
class MapSettingsController {
	#elements = {};
	#abortController = null;

	#defaultSettings = {
		autoCenter: true,
		showWalkways: true,
		showUnderConstruction: true,
		showApproved: true
	};

	#settings = {};

	init() {
		this.#abortController = new AbortController();
		this.#queryElements();
		this.#loadSettings();
		this.#bindEvents();
		this.#render();
	}

	#queryElements() {
		const panel = document.getElementById("panel-setting-map");
		if (!panel) return;

		this.#elements = {
			panel,
			showUnderConstruction: document.getElementById("settingShowUnderConstruction"),
			showApproved: document.getElementById("settingShowApproved")
		};
	}

	#loadSettings() {
		try {
			const saved = localStorage.getItem("metro_map_settings");
			this.#settings = saved ? { ...this.#defaultSettings, ...JSON.parse(saved) } : { ...this.#defaultSettings };
		} catch (e) {
			this.#settings = { ...this.#defaultSettings };
		}
	}

	#saveSettings() {
		try {
			localStorage.setItem("metro_map_settings", JSON.stringify(this.#settings));
			eventBus.emit("MAP_SETTINGS_UPDATED", this.#settings);
		} catch (e) {
			console.error("[MapSettings] Failed to save settings:", e);
		}
	}

	#render() {
		if (this.#elements.showUnderConstruction) {
			this.#elements.showUnderConstruction.checked = this.#settings.showUnderConstruction !== false;
		}
		if (this.#elements.showApproved) {
			this.#elements.showApproved.checked = this.#settings.showApproved !== false;
		}
	}

	#bindEvents() {
		const signal = this.#abortController.signal;

		this.#elements.showUnderConstruction?.addEventListener("change", (e) => {
			this.#settings.showUnderConstruction = e.target.checked;
			this.#saveSettings();
		}, { signal });

		this.#elements.showApproved?.addEventListener("change", (e) => {
			this.#settings.showApproved = e.target.checked;
			this.#saveSettings();
		}, { signal });
	}

	destroy() {
		this.#abortController?.abort();
	}
}


// =============================================================================
// 3. ⚙️ MAIN SETTINGS ORCHESTRATOR & FOLDER TABS CONTROLLER
// =============================================================================
export class SettingsView {
	#controllers = new Map();
	#abortController = null;
	#elements = {};

	constructor() {
		this.#controllers.set("alarm", new AlarmSettingsController());
		this.#controllers.set("map", new MapSettingsController());
		this.#controllers.set("backup", new BackupSettingsController());
	}

	/**
	 * सेटिंग्स पैनल और सभी सब-कंट्रोलर्स को इनिशियलाइज़ करें
	 */
	init() {
		this.#abortController = new AbortController();
		this.#queryElements();
		this.#bindTabNavigation();

		// सभी सब-कंट्रोलर्स इनिशियलाइज़ करें
		for (const controller of this.#controllers.values()) {
			controller.init();
		}

		// पिछली एक्टिव टैब को रीस्टोर करें
		const lastTab = localStorage.getItem("metro_active_settings_tab") || "alarm";
		this.switchTab(lastTab);
	}

	#queryElements() {
		this.#elements = {
			tabsContainer: document.querySelector(".settings-folder-tabs"),
			tabs: document.querySelectorAll(".folder-tab"),
			panels: document.querySelectorAll(".settings-tab-panel")
		};
	}

	#bindTabNavigation() {
		const signal = this.#abortController.signal;
		const container = this.#elements.tabsContainer;
		if (!container) return;

		container.addEventListener("click", (e) => {
			const btn = e.target.closest(".folder-tab");
			if (!btn) return;

			const targetTab = btn.dataset.tab;
			if (targetTab) {
				this.switchTab(targetTab);
			}
		}, { signal });
	}

	/**
	 * किसी विशिष्ट टैब पर स्विच करें
	 * @param {string} tabKey - 'alarm' | 'map' आदि
	 */
	switchTab(tabKey) {
		if (!tabKey) return;

		// 1. टैब्स को एक्टिव/इनएक्टिव करें
		this.#elements.tabs.forEach(tab => {
			const isActive = tab.dataset.tab === tabKey;
			tab.classList.toggle("active", isActive);
			tab.setAttribute("aria-selected", String(isActive));
		});

		// 2. पैनल्स को शो/हाइड करें
		this.#elements.panels.forEach(panel => {
			const isActive = panel.dataset.panel === tabKey;
			panel.classList.toggle("active", isActive);
		});

		// 3. एक्टिव टैब को लोकल स्टोरेज में याद रखें
		try {
			localStorage.setItem("metro_active_settings_tab", tabKey);
		} catch (e) {}
	}

	/**
	 * क्लीनअप और मेमोरी रिलीज
	 */
	destroy() {
		for (const controller of this.#controllers.values()) {
			controller.destroy();
		}
		this.#abortController?.abort();
	}
}



// =============================================================================
// 3. 💾 BACKUP & RESTORE SUB-CONTROLLER (PRO VERSION)
// =============================================================================
class BackupSettingsController {
	#elements = {};
	#abortController = null;

	init() {
		this.#abortController = new AbortController();
		this.#queryElements();
		this.#bindEvents();
	}

	#queryElements() {
		this.#elements = {
			btnExport: document.getElementById("btnExportBackup"),
			fileInput: document.getElementById("backupFileInput")
		};
	}

	#bindEvents() {
		const signal = this.#abortController.signal;
		this.#elements.btnExport?.addEventListener("click", () => this.#exportData(), { signal });
		this.#elements.fileInput?.addEventListener("change", (e) => this.#importData(e), { signal });
	}

	// -------------------------------------------------------------------------
	// 📤 EXPORT LOGIC
	// -------------------------------------------------------------------------
	#exportData() {
		const exportPayload = {
			appName: "YatraMarg_Metro_App",
			version: "1.0",
			timestamp: new Date().toISOString(),
			data: {}
		};

		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && (key.startsWith("metro_") || key.startsWith("metro-") || key === "language")) {
				exportPayload.data[key] = localStorage.getItem(key);
			}
		}

		const dataStr = JSON.stringify(exportPayload, null, 2);
		const blob = new Blob([dataStr], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		
		const a = document.createElement("a");
		a.href = url;
		const dateStr = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
		a.download = `YatraMarg_Backup_${dateStr}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);

		eventBus.emit("SHOW_TOAST", { message: "✅ Backup exported successfully!", type: "success" });
	}

	// -------------------------------------------------------------------------
	// 🖼️ CUSTOM UI MODAL PROMPT (No HTML/CSS changes needed)
	// -------------------------------------------------------------------------
	#showRestoreModal() {
		return new Promise((resolve) => {
			const backdrop = document.createElement("div");
			backdrop.className = "share-modal-backdrop";
			backdrop.style.zIndex = "99999";
			backdrop.style.display = "flex";
			backdrop.style.opacity = "1";
			backdrop.style.pointerEvents = "auto";
			
			// आपके मौजूदा Share Modal वाले डिज़ाइन को री-यूज़ किया गया है
			backdrop.innerHTML = `
				<div class="share-modal-card" role="dialog" style="max-width: 420px;">
					<header class="share-modal-header">
						<h3>💾 Backup Detected</h3>
						<button type="button" class="close-modal-btn" id="btnCancelRestoreTop">
							<span class="icon close-icon">✕</span>
						</button>
					</header>
					<div class="share-modal-body" style="padding: 20px;">
						<p style="font-size: 14px; margin-bottom: 20px; color: var(--text-secondary); line-height: 1.5;">
							How would you like to handle your existing recent searches and preferences?
						</p>
						<div style="display: flex; flex-direction: column; gap: 12px;">
							<button type="button" class="btn-settings-action" id="btnSmartMerge" style="background: var(--tab-backup-accent, #6366f1); color: white; border: none; padding: 12px; font-size: 14px; justify-content: center;">
								✅ Smart Merge (Recommended)
							</button>
							<button type="button" class="btn-settings-action" id="btnStrictOverwrite" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.4); padding: 12px; font-size: 14px; justify-content: center;">
								⚠️ Strict Overwrite (Replace All)
							</button>
							<button type="button" class="btn-settings-action" id="btnCancelRestore" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 12px; font-size: 14px; justify-content: center;">
								❌ Cancel
							</button>
						</div>
					</div>
				</div>
			`;
			
			document.body.appendChild(backdrop);
			
			const close = (action) => {
				document.body.removeChild(backdrop);
				resolve(action);
			};
			
			backdrop.querySelector("#btnSmartMerge").addEventListener("click", () => close("MERGE"));
			backdrop.querySelector("#btnStrictOverwrite").addEventListener("click", () => close("OVERWRITE"));
			backdrop.querySelector("#btnCancelRestore").addEventListener("click", () => close("CANCEL"));
			backdrop.querySelector("#btnCancelRestoreTop").addEventListener("click", () => close("CANCEL"));
		});
	}

		// -------------------------------------------------------------------------
	// 📥 IMPORT & SECURITY LOGIC (100% Logical Accuracy)
	// -------------------------------------------------------------------------
	async #importData(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		if (file.size > 1024 * 1024) {
			eventBus.emit("SHOW_TOAST", { message: "❌ Backup must be under 1MB.", type: "error" });
			event.target.value = "";
			return;
		}

		try {
			const text = await file.text();
			const payload = JSON.parse(text);

			if (payload.appName !== "YatraMarg_Metro_App" || !payload.data) {
				throw new Error("INVALID_SIGNATURE");
			}

			const userAction = await this.#showRestoreModal();
			
			if (userAction === "CANCEL") {
				event.target.value = "";
				return;
			}

			const isSmartMerge = (userAction === "MERGE");

			// 🚀 OPTIMIZATION & BUG FIX: "Strict Overwrite" के लिए पहले मौजूदा डेटा साफ़ करें
			if (!isSmartMerge) {
				const keysToRemove = [];
				for (let i = 0; i < localStorage.length; i++) {
					const key = localStorage.key(i);
					if (key && (key.startsWith("metro_") || key.startsWith("metro-") || key === "language")) {
						keysToRemove.push(key);
					}
				}
				// सुरक्षित रूप से पुरानी सेटिंग्स डिलीट करें
				keysToRemove.forEach(k => localStorage.removeItem(k));
			}

			// अब बैकअप डेटा को रिस्टोर/मर्ज करें
			for (const [key, rawValue] of Object.entries(payload.data)) {
				if (key.startsWith("metro_") || key.startsWith("metro-") || key === "language") {
					
					// Basic XSS Escape
					let safeValue = typeof rawValue === "string" 
						? rawValue.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
								  .replace(/[<>]/g, "") 
						: rawValue;

					// मर्ज लॉजिक (अगर Smart Merge चुना गया हो)
					if (isSmartMerge && key.startsWith("metro-recent-searches")) {
						safeValue = this.#mergeRecentSearches(key, safeValue);
					}
					
					localStorage.setItem(key, safeValue);
				}
			}

			eventBus.emit("SHOW_TOAST", { message: "✅ Backup restored successfully! Reloading...", type: "success" });
			setTimeout(() => window.location.reload(), 1500);

		} catch (error) {
			eventBus.emit("SHOW_TOAST", { message: "❌ Invalid or corrupted backup file.", type: "error" });
		} finally {
			event.target.value = "";
		}
	}

	
	#mergeRecentSearches(key, importedValueStr) {
		try {
			const existingStr = localStorage.getItem(key);
			if (!existingStr) return importedValueStr;

			const existingArr = JSON.parse(existingStr);
			const importedArr = JSON.parse(importedValueStr);

			if (Array.isArray(existingArr) && Array.isArray(importedArr)) {
				const combined = [...existingArr, ...importedArr];
				const uniqueSet = new Set(combined.map(item => JSON.stringify(item)));
				const mergedArr = Array.from(uniqueSet).map(str => JSON.parse(str));
				return JSON.stringify(mergedArr);
			}
		} catch (e) {}
		return importedValueStr;
	}

	destroy() {
		this.#abortController?.abort();
	}
}