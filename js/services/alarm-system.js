/**
 * Metro Alarm System - Core Class
 * Supports: Web Audio Synth Tones, Custom MP3, Vibration API, Distance Triggering
 */
export class AlarmSystem {
    constructor(options = {}) {
        this.state = "INACTIVE"; // States: 'INACTIVE', 'ARMED', 'RINGING'
        this.soundType = options.soundType || "chime"; // 'beep', 'chime', 'siren', 'mp3'
        this.customAudioUrl = null;
        this.customAudioElement = null;

        this.vibrationPattern = options.vibrationPattern || "long"; // 'short', 'long', 'sos', 'continuous'
        this.thresholdDistance = options.thresholdDistance || 500; // in meters
        this.currentDistance = Infinity;

        this.audioCtx = null;
        this.soundInterval = null;
        this.vibrateInterval = null;

        // Callbacks for UI updates
        this.onStateChange = options.onStateChange || null;
        this.onLog = options.onLog || null;
        this.volume = options.volume !== undefined ? Number(options.volume) : 1.0; // Volume range: 0.0 to 1.0

        // Predefined Vibration Patterns (in milliseconds)
        this.vibrationPatterns = {
            short: [200, 100, 200],
            long: [500, 250, 500, 250, 500],
            sos: [100, 100, 100, 100, 100, 100, 400, 200, 400, 200, 400, 200],
            continuous: [1000, 250, 1000]
        };
    }

    /**
     * Unlock AudioContext on initial user gesture (Click/Tap)
     */
    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
        if (this.audioCtx && this.audioCtx.state === "suspended") {
            this.audioCtx.resume();
        }
    }

    log(message, type = "info") {
        console.log(`[AlarmSystem] ${message}`);
        if (typeof this.onLog === "function") {
            this.onLog(message, type);
        }
    }

    setState(newState) {
        this.state = newState;
        this.log(`State Changed: ${newState}`, newState === "RINGING" ? "alert" : "info");
        if (typeof this.onStateChange === "function") {
            this.onStateChange(this.state);
        }
    }

    setSoundType(type) {
        this.soundType = type;
        this.log(`Sound Type set to: ${type}`);
    }
    setVolume(level) {
        // level is between 0.0 and 1.0
        this.volume = Math.max(0, Math.min(1, Number(level)));
        if (this.customAudioElement) {
            this.customAudioElement.volume = this.volume;
        }
        this.log(`Volume set to: ${Math.round(this.volume * 100)}%`);
    }

    setCustomAudioUrl(url) {
        this.customAudioUrl = url;
        if (url) {
            this.customAudioElement = new Audio(url);
            this.customAudioElement.loop = true;
        }
        this.log(`Custom MP3 file updated`);
    }

    setVibrationPattern(patternKey) {
        if (this.vibrationPatterns[patternKey]) {
            this.vibrationPattern = patternKey;
            this.log(`Vibration Pattern set to: ${patternKey}`);
        }
    }

    setThresholdDistance(meters) {
        this.thresholdDistance = Number(meters);
        this.log(`Threshold Distance set to: ${this.thresholdDistance}m`);
    }

    /**
     * Toggle Alarm ARMED / INACTIVE
     */
    toggleAlarm() {
        this.initAudioContext();
        if (this.state === "RINGING") {
            this.stopAlarm();
        } else if (this.state === "ARMED") {
            this.disarm();
        } else {
            this.arm();
        }
    }

    arm() {
        this.setState("ARMED");
        this.log(`Alarm ARMED! Monitoring distance (Threshold: ${this.thresholdDistance}m)...`);
    }

    disarm() {
        this.stopSoundAndVibration();
        this.setState("INACTIVE");
        this.log(`Alarm DISARMED.`);
    }

    /**
     * Update current distance and check trigger conditions
     */
    updateDistance(distanceInMeters) {
        this.currentDistance = Number(distanceInMeters);

        if (this.state === "ARMED") {
            if (this.currentDistance <= this.thresholdDistance) {
                this.log(`Distance (${this.currentDistance}m) is <= Threshold (${this.thresholdDistance}m)! Triggering Alarm...`, "alert");
                this.triggerAlarm();
            }
        }
    }

    /**
     * Trigger Alarm Ringing
     */
    triggerAlarm() {
        if (this.state === "RINGING") return;
        this.setState("RINGING");
        this.startSound();
        this.startVibration();
    }

    stopAlarm() {
        this.stopSoundAndVibration();
        this.setState("ARMED"); // Return to armed state after stopping ringing
        this.log(`Alarm stopped by user. Still ARMED.`);
    }

    // =========================================================================
    // SOUND GENERATION & MP3 PLAYER
    // =========================================================================
    startSound() {
        this.stopSoundOnly();
        this.initAudioContext();

        if (this.soundType === "mp3" && this.customAudioElement) {
            this.customAudioElement.currentTime = 0;
            this.customAudioElement.play().catch(err => {
                this.log(`Error playing custom MP3: ${err.message}`, "error");
            });
        } else {
            // Web Audio API Synth Tones Loop
            this.playSoundTone();
            this.soundInterval = setInterval(() => {
                this.playSoundTone();
            }, 1200);
        }
    }

    playSoundTone() {
        if (!this.audioCtx) return;

        const now = this.audioCtx.currentTime;

        if (this.soundType === "beep") {
            // Simple High Beep Pulse
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(880, now); // A5 tone
            gain.gain.setValueAtTime(0.3 * this.volume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.3);
        } 
        else if (this.soundType === "chime") {
            // Metro Double Chime (C5 -> G5)
            const playNote = (freq, startTime, duration) => {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.2 * this.volume, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.connect(gain);
                gain.connect(this.audioCtx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };

            playNote(523.25, now, 0.4);       // C5
            playNote(659.25, now + 0.2, 0.4); // E5
            playNote(783.99, now + 0.4, 0.6); // G5
        } 
        else if (this.soundType === "siren") {
            // Sweeping Siren Tone
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.linearRampToValueAtTime(900, now + 0.4);
            osc.frequency.linearRampToValueAtTime(400, now + 0.8);

            gain.gain.setValueAtTime(0.15 * this.volume, now);
            gain.gain.linearRampToValueAtTime(0.001, now + 0.85);

            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.85);
        }
    }

    stopSoundOnly() {
        if (this.soundInterval) {
            clearInterval(this.soundInterval);
            this.soundInterval = null;
        }
        if (this.customAudioElement) {
            this.customAudioElement.pause();
            this.customAudioElement.currentTime = 0;
        }
    }

    // =========================================================================
    // VIBRATION ENGINE
    // =========================================================================
    startVibration() {
        this.stopVibrationOnly();
        if (!("vibrate" in navigator)) {
            this.log("Vibration API not supported on this device/browser.", "error");
            return;
        }

        const pattern = this.vibrationPatterns[this.vibrationPattern] || this.vibrationPatterns.long;
        const patternDuration = pattern.reduce((a, b) => a + b, 0);

        navigator.vibrate(pattern);
        this.vibrateInterval = setInterval(() => {
            navigator.vibrate(pattern);
        }, patternDuration + 500);
    }

    stopVibrationOnly() {
        if (this.vibrateInterval) {
            clearInterval(this.vibrateInterval);
            this.vibrateInterval = null;
        }
        if ("vibrate" in navigator) {
            navigator.vibrate(0);
        }
    }

    stopSoundAndVibration() {
        this.stopSoundOnly();
        this.stopVibrationOnly();
    }

    /**
     * Direct Sound Preview (Testing)
     */
    previewSound() {
        this.initAudioContext();
        this.startSound();
        setTimeout(() => this.stopSoundOnly(), 3000);
    }

    /**
     * Direct Vibration Preview (Testing)
     */
    previewVibration() {
        this.startVibration();
        setTimeout(() => this.stopVibrationOnly(), 3000);
    }
}