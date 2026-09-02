/**
 * 🔊 AudioPlayer - Web Audio Synthesizer, Custom MP3 & Haptics Engine
 * Enterprise ES2022 OOP Class with Zero-Asset Synthesis & Clean Garbage Collection
 *
 * विशेषताएँ:
 * 1. Zero External Audio Files: Web Audio API से Chime, Beep, Siren टोन खुद बनाता है।
 * 2. Custom Audio Loop: यूज़र द्वारा अपलोड की गई किसी भी कस्टम MP3 फ़ाइल को लूप में प्ले करता है।
 * 3. Haptics / Vibration: Navigator.vibrate और Capacitor Haptics का हाइब्रिड सपोर्ट।
 * 4. Memory Safe: अलार्म रुकते ही सभी ऑडियो नोड्स और इंटरवल्स को तुरंत साफ़ (Clean) करता है।
 */

export class AudioPlayer {
	// Private State Fields
	#audioCtx = null;
	#soundType = "chime"; // 'chime' | 'beep' | 'siren' | 'custom'
	#customAudioUrl = null;
	#customAudioElement = null;
	#volume = 1.0; // 0.0 to 1.0

	#soundInterval = null;
	#vibrateInterval = null;
	#isPlaying = false;

	// Vibration Patterns (in milliseconds)
	#vibrationPatterns = {
		short: [200, 100, 200],
		long: [500, 250, 500, 250, 500],
		sos: [100, 100, 100, 100, 100, 100, 400, 200, 400, 200, 400, 200],
		continuous: [1000, 250, 1000],
	};
	#activeVibePattern = "long";

	constructor(options = {}) {
		this.#soundType = options.soundType || "chime";
		this.#volume = options.volume !== undefined ? Number(options.volume) : 1.0;
		this.#activeVibePattern = options.vibrationPattern || "long";
	}

	/**
	 * पहली बार यूज़र इंटरैक्शन पर AudioContext अनलॉक व रेज़्यूमे करें
	 */
	async unlockAudioContext() {
		if (!this.#audioCtx && typeof window !== "undefined") {
			const AudioContextClass = window.AudioContext || window.webkitAudioContext;
			if (AudioContextClass) {
				this.#audioCtx = new AudioContextClass();
			}
		}
		if (this.#audioCtx && this.#audioCtx.state === "suspended") {
			try {
				await this.#audioCtx.resume();
			} catch (err) {
				console.warn("[AudioPlayer] AudioContext resume notice:", err);
			}
		}
	}

	setSoundType(type) {
		this.#soundType = type;
	}

	setCustomAudioUrl(url) {
		this.#customAudioUrl = url;
		if (url) {
			this.#customAudioElement = new Audio(url);
			this.#customAudioElement.loop = true;
			this.#customAudioElement.volume = this.#volume;
		}
	}

	setVolume(level) {
		this.#volume = Math.max(0, Math.min(1, Number(level)));
		if (this.#customAudioElement) {
			this.#customAudioElement.volume = this.#volume;
		}
	}

	setVibrationPattern(patternKey) {
		if (this.#vibrationPatterns[patternKey]) {
			this.#activeVibePattern = patternKey;
		}
	}

	/**
	 * अलार्म टोन और वाइब्रेशन शुरू करें
	 */
	playAlarm() {
		if (this.#isPlaying) return;
		this.#isPlaying = true;
		this.unlockAudioContext();

		// 1. यदि कस्टम MP3 है
		if (this.#soundType === "custom" && this.#customAudioElement) {
			this.#customAudioElement.currentTime = 0;
			this.#customAudioElement.play().catch((err) => {
				console.warn("[AudioPlayer] Custom audio play blocked:", err);
				this.#startSynthLoop();
			});
		} else {
			// 2. Web Audio Synthesizer Loop
			this.#startSynthLoop();
		}

		// 3. Vibration शुरू करें
		this.#startVibrationLoop();
	}

	/**
	 * अलार्म पूरी तरह बंद करें (Clean Cleanup)
	 */
	stopAlarm() {
		this.#isPlaying = false;

		// ऑडियो इंटरवल साफ़ करें
		if (this.#soundInterval) {
			clearInterval(this.#soundInterval);
			this.#soundInterval = null;
		}

		// कस्टम ऑडियो रोकें
		if (this.#customAudioElement) {
			this.#customAudioElement.pause();
			this.#customAudioElement.currentTime = 0;
		}

		// वाइब्रेशन रोकें
		if (this.#vibrateInterval) {
			clearInterval(this.#vibrateInterval);
			this.#vibrateInterval = null;
		}

		if (typeof navigator !== "undefined" && navigator.vibrate) {
			navigator.vibrate(0);
		}
	}

	/**
	 * 📳 सिंगल टेस्ट वाइब्रेशन चलाएं (Pure Hardware - No UI)
	 * @param {string} [patternKey]
	 * @returns {{ success: boolean, reason?: 'UNSUPPORTED' | 'BLOCKED_BY_DEVICE' | 'ERROR' }}
	 */
	triggerVibrate(patternKey = null) {
		if (patternKey) {
			this.setVibrationPattern(patternKey);
		}
		const pattern = this.#vibrationPatterns[this.#activeVibePattern] || [400];

		// 1. यदि डिवाइस में API नहीं है (iOS Safari या Desktop)
		if (typeof navigator === "undefined" || !("vibrate" in navigator)) {
			return { success: false, reason: "UNSUPPORTED" };
		}

		try {
			// 2. वाइब्रेट करें (true = चला, false = फोन OS ने ब्लॉक किया)
			const didVibrate = navigator.vibrate(pattern) || navigator.vibrate(400);
			if (didVibrate) {
				return { success: true };
			} else {
				return { success: false, reason: "BLOCKED_BY_DEVICE" };
			}
		} catch (error) {
			console.warn("[AudioPlayer] Vibration exception:", error);
			return { success: false, reason: "ERROR" };
		}
	}
	// =========================================================================
	// 🎹 SYNTHESIZER GENERATOR (ZERO ASSETS)
	// =========================================================================

	#startSynthLoop() {
		this.#playSynthTone(); // तुरंत पहली बार बजाएं

		const intervalMs = this.#soundType === "siren" ? 800 : 1500;
		this.#soundInterval = setInterval(() => {
			if (!this.#isPlaying) return;
			this.#playSynthTone();
		}, intervalMs);
	}

	#playSynthTone() {
		if (!this.#audioCtx || this.#audioCtx.state === "suspended") {
			this.unlockAudioContext();
		}
		if (!this.#audioCtx) return;

		const ctx = this.#audioCtx;
		const now = ctx.currentTime;
		const gainNode = ctx.createGain();
		gainNode.gain.setValueAtTime(this.#volume * 0.3, now);
		gainNode.connect(ctx.destination);

		if (this.#soundType === "chime") {
			// Two-tone harmonized bell chime (C5 & E5)
			const osc1 = ctx.createOscillator();
			const osc2 = ctx.createOscillator();
			osc1.type = "sine";
			osc2.type = "sine";
			osc1.frequency.setValueAtTime(523.25, now); // C5
			osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5

			gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

			osc1.connect(gainNode);
			osc2.connect(gainNode);
			osc1.start(now);
			osc1.stop(now + 0.6);
			osc2.start(now + 0.15);
			osc2.stop(now + 1.2);
		} else if (this.#soundType === "siren") {
			// Emergency Alarm Siren
			const osc = ctx.createOscillator();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(400, now);
			osc.frequency.linearRampToValueAtTime(900, now + 0.35);
			osc.frequency.linearRampToValueAtTime(400, now + 0.7);

			gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

			osc.connect(gainNode);
			osc.start(now);
			osc.stop(now + 0.75);
		} else {
			// Simple Clean Beep (880 Hz)
			const osc = ctx.createOscillator();
			osc.type = "square";
			osc.frequency.setValueAtTime(880, now);
			gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

			osc.connect(gainNode);
			osc.start(now);
			osc.stop(now + 0.3);
		}
	}

	#startVibrationLoop() {
		const pattern = this.#vibrationPatterns[this.#activeVibePattern] || this.#vibrationPatterns.long;
		const totalDuration = pattern.reduce((a, b) => a + b, 0) + 1000;

		const triggerVibe = () => {
			if (typeof navigator !== "undefined" && navigator.vibrate) {
				navigator.vibrate(pattern);
			}
		};

		triggerVibe();
		this.#vibrateInterval = setInterval(() => {
			if (!this.#isPlaying) return;
			triggerVibe();
		}, totalDuration);
	}
}
