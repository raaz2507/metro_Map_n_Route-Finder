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

		
		// Custom MP3 Box Visibility (Clean hidden attribute)
		if (el.customMp3Box) {
			el.customMp3Box.hidden = (this.#settings.soundType !== "custom");
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
				el.customMp3Box.hidden = (this.#settings.soundType !== "custom");
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
					message: i18n.t("pages.home.toast.settings.vibeSuccess"),
					type: "info"
				});
			} else if (result.reason === "BLOCKED_BY_DEVICE") {
				eventBus.emit("SHOW_TOAST", {
					message: i18n.t("pages.home.toast.settings.vibeBlocked"),
					type: "warning"
				});
			} else {
				eventBus.emit("SHOW_TOAST", {
					message: i18n.t("pages.home.toast.settings.vibeUnsupported"),
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
		this.#controllers.set("packs", new PacksSettingsController());
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
			btnDownload: document.getElementById("btnDownloadBackup") || document.getElementById("btnExportBackup"),
			btnShare: document.getElementById("btnShareBackup"),
			fileInput: document.getElementById("backupFileInput")
		};
	}
	#bindEvents() {
		const signal = this.#abortController.signal;
		this.#elements.btnDownload?.addEventListener("click", () => this.#downloadData(), { signal });
		this.#elements.btnShare?.addEventListener("click", () => this.#shareData(), { signal });
		this.#elements.fileInput?.addEventListener("change", (e) => this.#importData(e), { signal });
	}

	// -------------------------------------------------------------------------
	// 📦 PAYLOAD GENERATOR (DRY Architecture)
	// -------------------------------------------------------------------------
	#createExportPayload() {
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
		const dateStr = new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
		const fileName = `YatraMarg_Backup_${dateStr}.json`;
		return { dataStr, fileName };
	}
	// -------------------------------------------------------------------------
	// 📥 1-CLICK DIRECT DOWNLOAD (Phone Documents / Browser Downloads)
	// -------------------------------------------------------------------------
	async #downloadData() {
		const { dataStr, fileName } = this.#createExportPayload();
		const isNative = Boolean(window.Capacitor && window.Capacitor.isNativePlatform());
		// 1. Android APK Native Mode -> सीधे Documents फ़ोल्डर में राइट करें
		if (isNative && window.Capacitor.Plugins?.Filesystem) {
			try {
				const { Filesystem } = window.Capacitor.Plugins;
				await Filesystem.writeFile({
					path: fileName,
					data: dataStr,
					directory: "DOCUMENTS",
					encoding: "utf8"
				});
				eventBus.emit("SHOW_TOAST", { 
					message: `✅ Saved in Documents: ${fileName}`, 
					type: "success" 
				});
				return;
			} catch (err) {
				console.error("[Backup] Download to Documents failed:", err);
				eventBus.emit("SHOW_TOAST", { 
					message: i18n.t("pages.home.toast.settings.saveFailed"), 
					type: "error" 
				});
				return;
			}
		}
		// 2. Desktop Browser Fallback
		const blob = new Blob([dataStr], { type: "application/json" });
		this.#triggerBrowserDownload(blob, fileName);
	}
	// -------------------------------------------------------------------------
	// 📤 NATIVE SHARE (Google Drive, WhatsApp, Files etc.)
	// -------------------------------------------------------------------------
	async #shareData() {
		const { dataStr, fileName } = this.#createExportPayload();
		const isNative = Boolean(window.Capacitor && window.Capacitor.isNativePlatform());
		// 1. Android APK Native Mode -> Cache में लिखकर Share Sheet खोलें
		if (isNative && window.Capacitor.Plugins?.Filesystem && window.Capacitor.Plugins?.Share) {
			try {
				const { Filesystem, Share } = window.Capacitor.Plugins;
				const writeResult = await Filesystem.writeFile({
					path: fileName,
					data: dataStr,
					directory: "CACHE",
					encoding: "utf8"
				});
				if (writeResult?.uri) {
					await Share.share({
						title: "Metro Route Finder Backup",
						text: "YatraMarg Metro App Backup File",
						url: writeResult.uri,
						dialogTitle: "Save or Share Backup"
					});
					return;
				}
			} catch (err) {
				if (err.name === "AbortError" || err.message?.includes("canceled") || err.message?.includes("dismissed")) {
					return;
				}
				console.error("[Backup] Share failed:", err);
				eventBus.emit("SHOW_TOAST", { 
					message: i18n.t("pages.home.toast.settings.shareFailed"), 
					type: "error" 
				});
				return;
			}
		}
		// 2. Desktop Browser Web Share (Fallback)
		try {
			const blob = new Blob([dataStr], { type: "application/json" });
			const file = new File([blob], fileName, { type: "application/json" });
			if (navigator.canShare && navigator.canShare({ files: [file] })) {
				await navigator.share({
					files: [file],
					title: "Metro Route Finder Backup",
					text: "YatraMarg Metro App Backup File"
				});
				return;
			}
		} catch (e) {
			if (e.name === "AbortError") return;
		}
		// 3. Fallback to direct download
		const blob = new Blob([dataStr], { type: "application/json" });
		this.#triggerBrowserDownload(blob, fileName);
	}
	#triggerBrowserDownload(blob, fileName) {
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = fileName;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		eventBus.emit("SHOW_TOAST", { 
			message: i18n.t("pages.home.toast.settings.backupSuccess"), 
			type: "success" 
		});

	}

	// -------------------------------------------------------------------------
	// 🖼️ CUSTOM UI MODAL PROMPT (No HTML/CSS changes needed)
	// -------------------------------------------------------------------------
	#showRestoreModal() {
		return new Promise((resolve) => {
			const backdrop = document.createElement("div");
			backdrop.className = "restore-modal-backdrop";
			
			backdrop.innerHTML = `
				<div class="share-modal-card restore-modal-card" role="dialog">
					<header class="share-modal-header">
						<h3>💾 Backup Detected</h3>
						<button type="button" class="close-modal-btn" id="btnCancelRestoreTop">
							<span class="icon close-icon">✕</span>
						</button>
					</header>
					<div class="share-modal-body restore-modal-body">
						<p class="restore-modal-desc">
							How would you like to handle your existing recent searches and preferences?
						</p>
						<div class="restore-modal-actions">
							<button type="button" class="btn-settings-action btn-restore-merge" id="btnSmartMerge">
								✅ Smart Merge (Recommended)
							</button>
							<button type="button" class="btn-settings-action btn-restore-overwrite" id="btnStrictOverwrite">
								⚠️ Strict Overwrite (Replace All)
							</button>
							<button type="button" class="btn-settings-action btn-restore-cancel" id="btnCancelRestore">
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
			eventBus.emit("SHOW_TOAST", { 
				message: i18n.t("pages.home.toast.settings.restoreSizeLimit"), 
				type: "error" 
			});
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

						eventBus.emit("SHOW_TOAST", { 
				message: i18n.t("pages.home.toast.settings.restoreSuccess"), 
				type: "success" 
			});
			setTimeout(() => window.location.reload(), 1500);

		} catch (error) {
			eventBus.emit("SHOW_TOAST", { 
				message: i18n.t("pages.home.toast.settings.restoreInvalid"), 
				type: "error" 
			});
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


// =============================================================================
// 4. 📦 PACKS (LANGUAGES & THEMES) SUB-CONTROLLER
// =============================================================================
class PacksSettingsController {
	#elements = {};
	#abortController = null;

	init() {
		this.#abortController = new AbortController();
		this.#queryElements();
		this.#renderPlatformNotice();
		this.#renderLanguages();
		this.#renderThemes();
		this.#bindEvents();
	}

	#queryElements() {
		this.#elements = {
			platformNotice: document.getElementById("packsPlatformNotice"),
			langContainer: document.getElementById("packsLangContainer"),
			themeContainer: document.getElementById("packsThemeContainer")
		};
	}

	#renderPlatformNotice() {
		const isNative = centerClass.isNativePlatform();
		const isPwa = centerClass.isPwaMode();
		// सिर्फ सामान्य वेब ब्राउज़र पर नोटिस दिखाएं, ऐप/PWA पर छुपाएं
		if (this.#elements.platformNotice) {
			this.#elements.platformNotice.hidden = (isNative || isPwa);
		}
	}

	#renderLanguages() {
		const container = this.#elements.langContainer;
		if (!container) return;

		// i18n के LANGUAGE_CATEGORIES से सभी भाषाएं उठाएं (Zero Hardcoding!)
		const categories = i18n.LANGUAGE_CATEGORIES || [];
		const isNativeOrPwa = centerClass.isNativePlatform() || centerClass.isPwaMode();

		let html = "";

		categories.forEach(category => {
			category.languages.forEach(lang => {
				const isCore = (lang.code === "en");
				const isInstalled = centerClass.isLanguagePackInstalled(lang.code);
				const approxSize = lang.code === "hi" ? "140" : "100";

				html += `
					<div class="pack-item-row" data-lang-code="${lang.code}">
						<div class="settings-label-wrapper">
							<span class="settings-label">${lang.flag} ${lang.nativeName} (${lang.label})</span>
							<span class="pack-meta-text">
								${isCore ? i18n.t("pages.home.settings.packs.coreBuiltin") : `${category.name} • ${i18n.t("pages.home.settings.packs.sizeApprox", { size: approxSize })}`}
							</span>
						</div>
						<div class="pack-action-wrapper">
							${isCore ? `
								<span class="pack-status-badge is-installed" data-i18n="pages.home.settings.packs.installed">${i18n.t("pages.home.settings.packs.installed")}</span>
							` : `
								<button type="button" class="btn-settings-action btn-pack-download ${isInstalled ? "is-hidden" : ""}" data-action="download" data-lang="${lang.code}">
									<img src="./assets/icons/download.svg" width="14" height="14" alt="" aria-hidden="true" />
									<span data-i18n="pages.home.settings.packs.downloadBtn">${i18n.t("pages.home.settings.packs.downloadBtn")}</span>
								</button>
								<button type="button" class="btn-settings-action btn-pack-uninstall ${!isInstalled ? "is-hidden" : ""}" data-action="uninstall" data-lang="${lang.code}">
									<img src="./assets/icons/trash-can-solid-full.svg" width="14" height="14" alt="" aria-hidden="true" />
									<span data-i18n="pages.home.settings.packs.uninstallBtn">${i18n.t("pages.home.settings.packs.uninstallBtn")}</span>
								</button>
							`}
						</div>
					</div>
				`;
			});
		});

		container.innerHTML = html;
	}

		async #renderThemes() {
		const container = this.#elements.themeContainer;
		if (!container) return;

		const currentTheme = localStorage.getItem("app-theme") || "classic";

		try {
			// 1. Fetch live catalog directly from manifest.json (Zero Hardcoding!)
			const res = await fetch("themes/manifest.json");
			if (!res.ok) throw new Error("Manifest could not be loaded");
			const manifest = await res.json();
			const themesList = manifest.themes || [];

			let html = "";
			themesList.forEach(theme => {
				const isActive = (theme.id === currentTheme);
				const colors = [
					theme.preview?.light || "#ffffff",
					theme.preview?.dark || "#000000",
					theme.preview?.accent || "#3b82f6"
				];

				html += `
					<div class="pack-item-row theme-skin-card ${isActive ? "is-theme-active" : ""}" data-theme-id="${theme.id}">
						<div class="settings-label-wrapper">
							<div class="theme-card-header">
								<span class="theme-card-title">${theme.name}</span>
								<span class="theme-badge-pill">${theme.badge || "Theme Pack"}</span>
							</div>
							<p class="theme-card-desc">${theme.description || ""}</p>
							
							<div class="theme-palette-wrapper">
								<span class="theme-palette-label">Palette:</span>
								<div class="theme-swatches-group">
									${colors.map(c => `<span class="theme-swatch-circle" style="background-color: ${c};"></span>`).join("")}
								</div>
							</div>
						</div>

						<div class="pack-action-wrapper">
							${isActive ? `
								<span class="theme-active-pill">
									<span>✓</span> <span>ACTIVE</span>
								</span>
							` : `
								<button type="button" class="btn-apply-theme" data-theme-id="${theme.id}">
									<span>Apply Theme</span>
								</button>
							`}
						</div>
					</div>
				`;
			});

			container.innerHTML = html;
		} catch (err) {
			console.error("[SettingsView] Failed to load theme catalog:", err);
			container.innerHTML = `<p class="pack-meta-text" style="color: var(--color-danger, #ef4444);">Failed to load themes catalogue.</p>`;
		}
	}

	#bindEvents() {
		const signal = this.#abortController.signal;

		this.#elements.langContainer?.addEventListener("click", async (e) => {
			const btn = e.target.closest("button[data-action]");
			if (!btn || btn.disabled) return;

			const action = btn.dataset.action;
			const langCode = btn.dataset.lang;
			const row = btn.closest(".pack-item-row");

			if (action === "download") {
				btn.disabled = true;
				const originalText = btn.querySelector("span").textContent;
				btn.querySelector("span").textContent = i18n.t("pages.home.settings.packs.downloading");

				try {
					await centerClass.downloadLanguagePack(langCode);
					eventBus.emit("SHOW_TOAST", {
						message: i18n.t("pages.home.toast.settings.packDownloaded", { name: langCode.toUpperCase() }),
						type: "success"
					});
					this.#toggleButtonVisibility(row, true);
				} catch (err) {
					console.error("[Packs] Download failed:", err);
					eventBus.emit("SHOW_TOAST", {
						message: i18n.t("pages.home.toast.settings.packDownloadError"),
						type: "error"
					});
				} finally {
					btn.disabled = false;
					btn.querySelector("span").textContent = originalText;
				}
			} else if (action === "uninstall") {
				const confirmMsg = i18n.t("pages.home.settings.packs.confirmUninstallLang", { langName: langCode.toUpperCase() });
				if (!window.confirm(confirmMsg)) return;

				btn.disabled = true;
				try {
					await centerClass.uninstallLanguagePack(langCode);
					eventBus.emit("SHOW_TOAST", {
						message: i18n.t("pages.home.toast.settings.packRemoved", { name: langCode.toUpperCase() }),
						type: "info"
					});
					this.#toggleButtonVisibility(row, false);
				} catch (err) {
					console.error("[Packs] Uninstall failed:", err);
				} finally {
					btn.disabled = false;
				}
			}
		}, { signal });

		eventBus.on("LANGUAGE_PACK_CHANGED", () => {
			this.#renderLanguages();
		}, { signal });


				this.#elements.themeContainer?.addEventListener("click", async (e) => {
			const btn = e.target.closest(".btn-apply-theme");
			if (!btn) return;

			const themeId = btn.dataset.themeId;
			if (!themeId) return;

			btn.disabled = true;
			btn.textContent = "Applying...";

			try {
				const { themeEngine } = await import("../core/ThemeEngine.js");
				await themeEngine.applyTheme(themeId);

				eventBus.emit("SHOW_TOAST", {
					message: `Theme switched to ${themeId.toUpperCase()}!`,
					type: "success"
				});

				// Re-render theme rows to update Active badges
				this.#renderThemes();
			} catch (err) {
				console.error("[SettingsView] Failed to apply theme:", err);
			}
		});
	}

	#toggleButtonVisibility(row, isInstalled) {
		if (!row) return;
		const downloadBtn = row.querySelector(".btn-pack-download");
		const uninstallBtn = row.querySelector(".btn-pack-uninstall");

		if (downloadBtn) downloadBtn.classList.toggle("is-hidden", isInstalled);
		if (uninstallBtn) uninstallBtn.classList.toggle("is-hidden", !isInstalled);
	}

	destroy() {
		this.#abortController?.abort();
	}
}