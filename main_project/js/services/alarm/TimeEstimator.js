/**
 * ⏱️ TimeEstimator - Zero-CPU Tunnel Dead-Reckoning Timer
 * Enterprise ES2022 OOP Class with Pure Timestamp Delta Mathematics
 * 
 * विशेषताएँ:
 * 1. Zero Background CPU Waste: कोई setInterval लूप नहीं; केवल Timestamp Delta Math पर आधारित।
 * 2. Mathematical Confidence Curve: 0.0 से 1.0 के बीच कॉन्फिडेंस स्कोर देता है।
 * 3. Tunnel Fallback: टनल में GPS लॉस होने पर समय के आधार पर स्टेशन आगमन की पुष्टि करता है।
 */

export class TimeEstimator {
    // Private State Fields
    #startTime = null;
    #estimatedDurationSeconds = 0;
    #isActive = false;

    /**
     * टाइमर शुरू करें
     * @param {number} estimatedSeconds - स्टेशन तक पहुंचने का अनुमानित समय (सेकंड में)
     */
    start(estimatedSeconds = 120) {
        this.#estimatedDurationSeconds = Math.max(10, Number(estimatedSeconds) || 120);
        this.#startTime = Date.now();
        this.#isActive = true;
    }

    /**
     * टाइमर बंद करें
     */
    stop() {
        this.#isActive = false;
        this.#startTime = null;
        this.#estimatedDurationSeconds = 0;
    }

    /**
     * क्या टाइमर सक्रिय है?
     */
    isActive() {
        return this.#isActive;
    }

    /**
     * टाइम कॉन्फिडेंस स्कोर प्राप्त करें (0.0 से 1.0)
     * - यदि समय 90% से अधिक बीत चुका है, तो स्कोर 1.0 (High Arrival Match) होगा।
     */
    getConfidenceScore() {
        if (!this.#isActive || !this.#startTime) return 0.0;

        const elapsedSeconds = (Date.now() - this.#startTime) / 1000;
        const ratio = elapsedSeconds / this.#estimatedDurationSeconds;

        if (ratio < 0.5) {
            return 0.0; // अभी यात्रा के शुरुआती चरण में हैं
        } else if (ratio >= 0.9) {
            return 1.0; // 90%+ समय बीत चुका है -> स्टेशन आने की पूरी संभावना
        } else {
            // 0.5 से 0.9 के बीच लीनियर ग्रोथ (0.0 -> 0.8)
            return Math.round(((ratio - 0.5) / 0.4) * 0.8 * 100) / 100;
        }
    }

    /**
     * बचे हुए सेकंड्स प्राप्त करें
     */
    getRemainingSeconds() {
        if (!this.#isActive || !this.#startTime) return 0;
        const elapsedSeconds = (Date.now() - this.#startTime) / 1000;
        return Math.max(0, Math.round(this.#estimatedDurationSeconds - elapsedSeconds));
    }
}