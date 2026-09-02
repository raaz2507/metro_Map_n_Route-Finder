/**
 * 📳 MotionSensor - DeviceMotion / Inertial Train Stop Detector
 * Enterprise ES2022 OOP Class with Accelerometer Variance Analysis
 * 
 * विशेषताएँ:
 * 1. Tunnel Fallback: टनल में GPS कटने पर ट्रेन के रुकने की पहचान करता है।
 * 2. Variance Analysis: एक्सेलेरोमीटर के उतार-चढ़ाव (Vibration Variance) को ट्रैक करता है।
 * 3. Train Stop Event: जब ट्रेन की हलचल 3 सेकंड तक न्यूनतम हो जाती है, तो 'TRAIN_STOPPED' स्टेट ट्रिगर करता है।
 */

export class MotionSensor {
    // Private State Fields
    #isListening = false;
    #motionSamples = [];
    #windowSize = 15; // ~1-2 सेकंड का सैंपल बफर
    #motionState = "UNKNOWN"; // 'CRUISING' | 'BRAKING' | 'STOPPED'
    #stoppedCounter = 0;

    // Callbacks
    #onStateChange = null;
    #boundHandler = null;

    /**
     * @param {Object} options
     * @param {Function} [options.onStateChange] - मोशन स्टेट बदलने पर कॉलबैक
     */
    constructor(options = {}) {
        this.#onStateChange = options.onStateChange || null;
        this.#boundHandler = this.#handleDeviceMotion.bind(this);
    }

    /**
     * सेंसर लिसनिंग शुरू करें
     */
    async startListening(onStateChange = null) {
        if (onStateChange) this.#onStateChange = onStateChange;
        if (this.#isListening) return;

        // iOS 13+ Permission Check (यदि लागू हो)
        if (typeof DeviceMotionEvent !== "undefined" && typeof DeviceMotionEvent.requestPermission === "function") {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission !== "granted") {
                    console.warn("[MotionSensor] Permission denied for DeviceMotion.");
                    return;
                }
            } catch (e) {
                console.warn("[MotionSensor] Error requesting motion permission:", e);
            }
        }

        if (typeof window !== "undefined" && "ondevicemotion" in window) {
            window.addEventListener("devicemotion", this.#boundHandler, false);
            this.#isListening = true;
        } else {
            console.warn("[MotionSensor] DeviceMotionEvent not supported on this device.");
        }
    }

    /**
     * सेंसर लिसनिंग बंद करें
     */
    stopListening() {
        if (this.#isListening && typeof window !== "undefined") {
            window.removeEventListener("devicemotion", this.#boundHandler, false);
            this.#isListening = false;
            this.#motionSamples = [];
            this.#stoppedCounter = 0;
            this.#motionState = "UNKNOWN";
        }
    }

    /**
     * वर्तमान मोशन स्टेट प्राप्त करें
     */
    getMotionState() {
        return this.#motionState;
    }

    /**
     * DeviceMotion इवेंट्स को प्रोसेस करें
     */
    #handleDeviceMotion(event) {
        const acc = event.acceleration || event.accelerationIncludingGravity;
        if (!acc || acc.x === null) return;

        // कुल एक्सेलेरेशन का मैग्नीट्यूड निकालें
        const magnitude = Math.sqrt((acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2);

        this.#motionSamples.push(magnitude);
        if (this.#motionSamples.length > this.#windowSize) {
            this.#motionSamples.shift();
        }

        if (this.#motionSamples.length < 5) return;

        // वेरिएंस (Variance) की गणना करें (हलचल का स्तर)
        const mean = this.#motionSamples.reduce((a, b) => a + b, 0) / this.#motionSamples.length;
        const variance = this.#motionSamples.reduce((a, b) => a + (b - mean) ** 2, 0) / this.#motionSamples.length;

        let newState = this.#motionState;

        // यदि वाइब्रेशन / वेरिएंस बहुत कम है (ट्रेन पूरी तरह स्थिर है)
        if (variance < 0.15) {
            this.#stoppedCounter++;
            if (this.#stoppedCounter >= 5) {
                newState = "STOPPED";
            }
        } else if (variance >= 0.15 && variance < 0.6) {
            this.#stoppedCounter = 0;
            newState = "BRAKING";
        } else {
            this.#stoppedCounter = 0;
            newState = "CRUISING";
        }

        if (newState !== this.#motionState) {
            this.#motionState = newState;
            if (typeof this.#onStateChange === "function") {
                this.#onStateChange({
                    motionState: this.#motionState,
                    variance: Math.round(variance * 100) / 100
                });
            }
        }
    }
}