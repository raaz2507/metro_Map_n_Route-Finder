/**
 * ⏰ AlarmManager - Intelligent Multi-Sensor Alarm & Fusion Coordinator
 * Enterprise ES2022 OOP Class with Weighted Decision Engine & Offline Speech Synthesis
 * 
 * विशेषताएँ:
 * 1. 100% User Configurable: Destination/Interchange alerts, Distance vs Station mode, Volume, Tones.
 * 2. Multi-Sensor Fusion Engine: GPS (Weight: 5) + Motion Sensor (Weight: 3) + Timer (Weight: 1).
 * 3. 100% Offline Voice Announcement: Web Speech API (TTS) से स्टेशन का नाम और इंटरचेंज बोलना।
 * 4. Snooze & Auto-Dismiss: 2 मिनट का स्नूज़ और 45 सेकंड का बैटरी-सेविंग ऑटो-डिस्मिस।
 * 5. Lifecycle States: 'INACTIVE' -> 'ARMED' -> 'RINGING' -> 'SNOOZED'.
 */

import { GPSTracker } from "../sensors/GPSTracker.js";
import { MotionSensor } from "../sensors/MotionSensor.js";
import { AudioPlayer } from "./AudioPlayer.js";
import { TimeEstimator } from "./TimeEstimator.js";


export class AlarmManager {
	// Subsystem Instances
	#gpsTracker = null;
	#motionSensor = null;
	#audioPlayer = null;
	#timeEstimator = null;

   	// State Fields
	#state = "INACTIVE"; // 'INACTIVE' | 'ARMED' | 'RINGING' | 'SNOOZED'
	#journeyConfig = null;
	#currentTargetStation = null;
	#autoDismissTimer = null;
	#snoozeTimer = null;
	#tunnelTicker = null; // ⚡ टनल डेड-रेकनिंग टिकर
	#wakeLock = null;

	// Callbacks
	#onStateChange = null;
	#onTelemetry = null; // Live distance/speed stream for UI

	// User Configurable Default Settings
	#settings = {
		alertOnDestination: true,
		alertOnInterchange: true,
		triggerMode: "distance_based", // "distance_based" | "station_based"
		thresholdDistanceMeters: 500,
		soundType: "chime",
		volume: 0.8,
		vibrationPattern: "long",
		customAudioUrl: null,
		enableVoiceAnnouncement: true,
		language: "hi", // "hi" | "en"
		autoDismissSeconds: 45
	};

	constructor(options = {}) {
		this.#settings = { ...this.#settings, ...options };

		// सब-सिस्टम्स को इनिशियलाइज़ करें
		this.#audioPlayer = new AudioPlayer({
			soundType: this.#settings.soundType,
			volume: this.#settings.volume,
			vibrationPattern: this.#settings.vibrationPattern
		});

		this.#gpsTracker = new GPSTracker({
			onPositionUpdate: this.#handleGpsUpdate.bind(this),
			onSpeedUpdate: this.#handleSpeedUpdate.bind(this),
			onError: this.#handleGpsError.bind(this)
		});

		this.#motionSensor = new MotionSensor({
			onStateChange: this.#handleMotionUpdate.bind(this)
		});

		this.#timeEstimator = new TimeEstimator();
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "visible" && this.#state === "ARMED") {
					this.#requestWakeLock();
				}
			});
		}
	}

	/**
	 * यात्रा कॉन्फ़िगर करें और अलार्म आर्म (ARM) करें
	 * 
	 * @param {Object} journeyConfig
	 * @param {Array<string>} journeyConfig.routePath - रूट के सभी स्टेशन IDs
	 * @param {Object} journeyConfig.stationData - स्टेशनों का मेटाडेटा (Coords, Names)
	 * @param {Array<string>} journeyConfig.interchanges - इंटरचेंज स्टेशन IDs
	 * @param {string} journeyConfig.destinationId - अंतिम स्टेशन ID
	 * @param {Object} [journeyConfig.settings] - यूज़र की कस्टम सेटिंग्स
	 * @param {number} [journeyConfig.estimatedDurationSeconds] - यात्रा का अनुमानित समय
	 */
	start(journeyConfig = {}) {
		this.stop(); // पहले से चल रहे किसी अलार्म को साफ़ करें

		this.#journeyConfig = journeyConfig;
		if (journeyConfig.settings) {
			this.updateSettings(journeyConfig.settings);
		}

		// 1. अगला टारगेट स्टेशन निर्धारित करें (यदि रूट हो)
		this.#resolveNextTargetStation();
		// 2. टाइमर शुरू करें (यदि समय दिया गया हो)
		if (journeyConfig.estimatedDurationSeconds) {
			this.#timeEstimator.start(journeyConfig.estimatedDurationSeconds);
		}
		// 3. सेंसर्स चालू करें
		if (this.#currentTargetStation) {
			const targetCoords = this.#getStationCoords(this.#currentTargetStation.id);
			if (targetCoords) {
				this.#gpsTracker.setTarget(targetCoords.lat, targetCoords.lon);
			}
		}
		// 🎯 बिना किसी रुकावट के GPS चालू करें और ARMED करें
		this.#gpsTracker.startTracking();
		this.#motionSensor.startListening();
		this.#startTunnelTicker(); // ⚡ टनल हार्टबीट शुरू
		this.#requestWakeLock();
		this.#warmupSpeechSynthesis();

		this.#setState("ARMED");
	}

	/**
	 * अलार्म बंद / डिस्मिस करें
	 */
	dismiss() {
		this.#clearTimers();
		this.#audioPlayer.stopAlarm();

		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			window.speechSynthesis.cancel(); // 🛑 वॉइस रोकें
		}

		// यदि और भी कोई स्टेशन बाकी है (जैसे इंटरचेंज के बाद डेस्टिनेशन)
		const hasMoreTargets = this.#advanceToNextTargetStation();
		if (hasMoreTargets) {
			this.#setState("ARMED");
		} else {
			this.stop();
		}
	}

	/**
	 * 2 मिनट के लिए स्नूज़ करें
	 */
	snooze(minutes = 2) {
		this.#audioPlayer.stopAlarm();
		this.#clearTimers();
		this.#setState("SNOOZED");

		this.#snoozeTimer = setTimeout(() => {
			if (this.#state === "SNOOZED") {
				this.#triggerAlarmRinging();
			}
		}, minutes * 60 * 1000);
	}

	/**
	 * अलार्म और सभी सेंसर्स को पूरी तरह बंद करें
	 */
	stop() {
		this.#clearTimers();
		this.#stopTunnelTicker(); // ⚡ टनल टिकर बंद
		this.#releaseWakeLock();

		this.#audioPlayer.stopAlarm();
		if (typeof window !== "undefined" && "speechSynthesis" in window) {
			window.speechSynthesis.cancel(); // 🛑 वॉइस रोकें
		}

		this.#gpsTracker.stopTracking();
		this.#motionSensor.stopListening();
		this.#timeEstimator.stop();

		this.#currentTargetStation = null;
		this.#journeyConfig = null;
		this.#setState("INACTIVE");
	}

	/**
	 * सेटिंग्स अपडेट करें (Slider, Tones, Scope)
	 */
	updateSettings(newSettings = {}) {
		this.#settings = { ...this.#settings, ...newSettings };
		this.#audioPlayer.setSoundType(this.#settings.soundType);
		this.#audioPlayer.setVolume(this.#settings.volume);
		this.#audioPlayer.setVibrationPattern(this.#settings.vibrationPattern);
		if (this.#settings.customAudioUrl) {
			this.#audioPlayer.setCustomAudioUrl(this.#settings.customAudioUrl);
		}
	}

	getState() {
		return this.#state;
	}

	onStateChange(callback) {
		this.#onStateChange = callback;
	}

	onTelemetry(callback) {
		this.#onTelemetry = callback;
	}

	// =========================================================================
	// 🧠 MULTI-SENSOR FUSION & DECISION ENGINE
	// =========================================================================

	/**
	 * GPS अपडेट मिलने पर मूल्यांकन
	 */
	#handleGpsUpdate(posData) {
		if (this.#state !== "ARMED") return;

		const distanceMeters = posData.distanceToTarget;

		if (typeof this.#onTelemetry === "function") {
			this.#onTelemetry({
				type: "GPS",
				distanceMeters,
				accuracy: posData.accuracy,
				targetStation: this.#currentTargetStation
			});
		}

		this.#evaluateFusionScore({ gpsDistance: distanceMeters });
	}

	#handleSpeedUpdate(speedData) {
		if (typeof this.#onTelemetry === "function") {
			this.#onTelemetry({ type: "SPEED", ...speedData });
		}
	}

	/**
	 * Motion Sensor (Train Stop) अपडेट मिलने पर मूल्यांकन
	 */
	#handleMotionUpdate(motionData) {
		if (this.#state !== "ARMED") return;
		this.#evaluateFusionScore({ motionState: motionData.motionState });
	}

		/**
	 * ⚖️ वेटेड स्कोरिंग डिसीजन फॉर्मूला (ज़मीन पर 4.5 / टनल में 3.5)
	 */
	#evaluateFusionScore(inputs = {}) {
		if (this.#state !== "ARMED" || !this.#currentTargetStation) return;

		let gpsScore = 0.0;
		let motionScore = 0.0;
		let timerScore = this.#timeEstimator.getConfidenceScore(); // 0.0 to 1.0

		// 1. GPS Signal Check
		const hasGps = inputs.gpsDistance !== undefined && inputs.gpsDistance !== null;
		const threshold = this.#settings.thresholdDistanceMeters || 500;

		if (hasGps) {
			if (inputs.gpsDistance <= threshold) {
				gpsScore = 1.0;
			} else if (inputs.gpsDistance <= threshold * 1.5) {
				gpsScore = 0.5;
			}
		}

		// 2. Motion Sensor Confidence (ट्रेन रुकने पर)
		const currentMotion = inputs.motionState || this.#motionSensor.getMotionState();
		if (currentMotion === "STOPPED") {
			motionScore = 1.0;
		} else if (currentMotion === "BRAKING") {
			motionScore = 0.4;
		}

		// 3. 🎯 Context-Aware Adaptive Decision
		if (hasGps) {
			// 🌐 ज़मीन पर (Surface Mode - Pass: 4.5 out of 9)
			const totalScore = (5.0 * gpsScore) + (3.0 * motionScore) + (1.0 * timerScore);
			if (totalScore >= 4.5 || gpsScore === 1.0) {
				this.#triggerAlarmRinging();
			}
		} else {
			// 🚇 टनल में (Tunnel Mode - Pass: 3.5 out of 4 या Dead-Reckoning 100%)
			const tunnelScore = (3.0 * motionScore) + (1.0 * timerScore);
			if (tunnelScore >= 3.5 || timerScore >= 1.0) {
				this.#triggerAlarmRinging();
			}
		}
	}

	/**
	 * अलार्म रिंग करना + वॉइस अनाउंसमेंट
	 */
	#triggerAlarmRinging() {
		if (this.#state === "RINGING") return;
		this.#setState("RINGING");

		// 1. ऑडियो और वाइब्रेशन शुरू
		this.#audioPlayer.playAlarm();

		// 2. 100% Offline Voice Announcement
		if (this.#settings.enableVoiceAnnouncement && this.#currentTargetStation) {
			setTimeout(() => {
				this.#speakStationAnnouncement(this.#currentTargetStation);
			}, 1000);
		}

		// 3. बैटरी सेवर ऑटो-डिस्मिस टाइमर (45 सेकंड)
		this.#autoDismissTimer = setTimeout(() => {
			if (this.#state === "RINGING") {
				this.dismiss();
			}
		}, (this.#settings.autoDismissSeconds || 45) * 1000);
	}

	/**
	 * 🗣️ 100% Offline Speech Synthesis Announcement (Safe Pre-flight & Cleanup)
	 */
	#speakStationAnnouncement(station) {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

		// 1. पुरानी अटकी हुई अटरेंस साफ़ करें
		window.speechSynthesis.cancel();

		const isHindi = this.#settings.language === "hi";
		const finalTargetName = station.finalTargetName || station.name;
		const stName = isHindi ? (finalTargetName?.hi || station.finalTargetId || station.id) : (finalTargetName?.en || station.finalTargetId || station.id);
		const isInterchange = station.isInterchange;

		let text = "";
		if (station.isStation1Mode) {
			text = isHindi
				? `कृपया ध्यान दें। अगला स्टेशन आपका ${isInterchange ? "इंटरचेंज स्टेशन" : "गंतव्य"} ${stName} है।`
				: `Attention please. Next station is your ${isInterchange ? "interchange station" : "destination"}, ${stName}.`;
		} else {
			text = isHindi
				? `कृपया ध्यान दें। आपका स्टेशन ${stName} आने वाला है।`
				: `Attention please. Approaching your station, ${stName}.`;
			if (isInterchange) {
				text += isHindi ? ` कृपया यहाँ अपनी लाइन बदलें।` : ` Please change line here.`;
			}
		}

		const utterance = new SpeechSynthesisUtterance(text);
		utterance.lang = isHindi ? "hi-IN" : "en-IN";
		utterance.pitch = 0.95;
		utterance.rate = 0.9;

		// 2. उपलब्ध वॉयसेस में से बेस्ट मैच चुनें
		const voices = window.speechSynthesis.getVoices?.() || [];
		const targetLangPrefix = isHindi ? "hi" : "en";
		const matchedVoice = voices.find((v) => v.lang && v.lang.startsWith(targetLangPrefix));
		if (matchedVoice) {
			utterance.voice = matchedVoice;
		}

		window.speechSynthesis.speak(utterance);
	}

	// =========================================================================
	// 🛠️ TARGET STATION RESOLVERS & HELPERS
	// =========================================================================

	#resolveNextTargetStation() {
		if (!this.#journeyConfig) return;

		const { routePath = [], interchanges = [], destinationId, stationData = {} } = this.#journeyConfig;
		const isStation1Mode = String(this.#settings.thresholdDistanceMeters) === "station_1";

		let rawTargetId = null;
		let isInterchange = false;

		if (this.#settings.alertOnInterchange && interchanges.length > 0) {
			rawTargetId = interchanges[0];
			isInterchange = true;
		} else if (this.#settings.alertOnDestination && destinationId) {
			rawTargetId = destinationId;
			isInterchange = false;
		}

		if (!rawTargetId) {
			this.#currentTargetStation = null;
			return;
		}

		// 🚉 Station-Based Proximity Mode (1 Station Before Lookahead)
		if (isStation1Mode && Array.isArray(routePath) && routePath.length > 2) {
			const targetIdx = routePath.indexOf(rawTargetId);
			if (targetIdx > 0) {
				const triggerStationId = routePath[targetIdx - 1];
				this.#currentTargetStation = {
					id: triggerStationId,
					name: stationData[triggerStationId]?.name,
					finalTargetId: rawTargetId,
					finalTargetName: stationData[rawTargetId]?.name,
					isInterchange: isInterchange,
					isStation1Mode: true
				};
				return;
			}
		}

		// Standard Distance Mode (or 1-Hop Safety Fallback)
		this.#currentTargetStation = {
			id: rawTargetId,
			name: stationData[rawTargetId]?.name,
			finalTargetId: rawTargetId,
			finalTargetName: stationData[rawTargetId]?.name,
			isInterchange: isInterchange,
			isStation1Mode: false
		};
	}

	#advanceToNextTargetStation() {
		if (!this.#journeyConfig || !this.#currentTargetStation) return false;

		// यदि वर्तमान टारगेट इंटरचेंज था, तो उसे हटाकर अगले टारगेट (Destination) पर जाएं
		if (this.#currentTargetStation.isInterchange) {
			this.#journeyConfig.interchanges.shift();
			this.#resolveNextTargetStation();
			if (this.#currentTargetStation) {
				const targetCoords = this.#getStationCoords(this.#currentTargetStation.id);
				if (targetCoords) {
					this.#gpsTracker.setTarget(targetCoords.lat, targetCoords.lon);
				}
				return true;
			}
		}
		return false;
	}

	#getStationCoords(stationId) {
		const st = this.#journeyConfig?.stationData?.[stationId];
		const dec = st?.location?.decimal;
		if (dec && dec.lat && dec.lon) {
			return { lat: Number(dec.lat), lon: Number(dec.lon) };
		}
		return null;
	}


	#clearTimers() {
		if (this.#autoDismissTimer) {
			clearTimeout(this.#autoDismissTimer);
			this.#autoDismissTimer = null;
		}
		if (this.#snoozeTimer) {
			clearTimeout(this.#snoozeTimer);
			this.#snoozeTimer = null;
		}
	}

	#startTunnelTicker() {
		this.#stopTunnelTicker();
		// हर 3 सेकंड में टनल डेड-रेकनिंग चेक
		this.#tunnelTicker = setInterval(() => {
			if (this.#state === "ARMED") {
				this.#evaluateFusionScore();
			}
		}, 3000);
	}

	#stopTunnelTicker() {
		if (this.#tunnelTicker) {
			clearInterval(this.#tunnelTicker);
			this.#tunnelTicker = null;
		}
	}

	async #requestWakeLock() {
		if (typeof navigator !== "undefined" && "wakeLock" in navigator && !this.#wakeLock) {
			try {
				this.#wakeLock = await navigator.wakeLock.request("screen");
				this.#wakeLock.addEventListener("release", () => {
					this.#wakeLock = null;
				});
			} catch (err) {
				console.warn("[AlarmManager] WakeLock notice:", err);
			}
		}
	}

	async #releaseWakeLock() {
		if (this.#wakeLock) {
			try {
				await this.#wakeLock.release();
			} catch (err) {
				console.warn("[AlarmManager] WakeLock release notice:", err);
			}
			this.#wakeLock = null;
		}
	}

	#warmupSpeechSynthesis() {
		if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
		try {
			window.speechSynthesis.cancel();
			const silentUtterance = new SpeechSynthesisUtterance("");
			silentUtterance.volume = 0;
			silentUtterance.rate = 10;
			window.speechSynthesis.speak(silentUtterance);
		} catch (err) {
			console.warn("[AlarmManager] SpeechSynthesis warmup notice:", err);
		}
	}

	#handleGpsError(error) {
		console.warn("[AlarmManager] GPS Unavailable, activating fallback mode.");
		// ⏱️ टाइमर फ़ॉलबैक सक्रिय रखें
		if (this.#timeEstimator && !this.#timeEstimator.isActive()) {
			const estSeconds = this.#journeyConfig?.estimatedDurationSeconds || 1800;
			this.#timeEstimator.start(estSeconds);
		}
		// शुद्ध डोमेन स्टेट बाहर भेजें
		this.#setState(this.#state, {
			isFallback: true,
			fallbackReason: error?.code === 1 ? "PERMISSION_DENIED" : "GPS_UNAVAILABLE"
		});
	}
	#setState(newState, meta = {}) {
		this.#state = newState;
		if (typeof this.#onStateChange === "function") {
			this.#onStateChange({
				state: this.#state,
				targetStation: this.#currentTargetStation,
				...meta
			});
		}
	}

}