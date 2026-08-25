/**
 * Metro Train Speedometer - Core Class
 * Handles: Moving Average Speed Smoothing, Dual Speed Fallback (Δd/Δt), and Train Motion States
 */
export class TrainSpeedometer {
    constructor(options = {}) {
        this.windowSize = options.windowSize || 5; // Moving average window size
        this.speedHistory = [];
        this.currentSpeed = 0; // in km/h
        this.maxSpeed = 0;     // in km/h
        this.motionState = "HALTED"; // 'HALTED', 'DEPARTING', 'CRUISING'

        this.lastPositionData = null;

        // Callbacks
        this.onSpeedUpdate = options.onSpeedUpdate || null;
        this.onLog = options.onLog || null;
    }

    log(msg, type = "info") {
        console.log(`[TrainSpeedometer] ${msg}`);
        if (typeof this.onLog === "function") {
            this.onLog(msg, type);
        }
    }

	/**
     * Speedometer Display Element को बाइंड करें
     * @param {string|HTMLElement} elementOrId 
     */
    bindSpeedElement(elementOrId) {
        if (typeof elementOrId === "string") {
            this.speedElement = document.getElementById(elementOrId);
        } else {
            this.speedElement = elementOrId;
        }
    }

    /**
     * Speedometer Display Text को 1 दशमलव स्थान के साथ अपडेट करें (उदा: 0.0 या 45.5)
     */
    updateDisplay(speedKmh) {
        if (!this.speedElement) {
            this.speedElement = document.getElementById("speed-value");
        }
        if (this.speedElement) {
            const speed = typeof speedKmh === "number" ? speedKmh : 0;
            this.speedElement.textContent = speed.toFixed(1);
        }
    }

    /**
     * Process position update from GpsTracker
     */
    updateFromGps(positionData) {
        if (!positionData) return;

        let rawSpeed = positionData.rawSpeedKmh;

        // Fallback: If hardware speed is not available, compute speed from delta position and delta time
        if (rawSpeed === null || rawSpeed === undefined) {
            if (this.lastPositionData) {
                const distMeters = this.calculateDistanceBetween(
                    this.lastPositionData.lat, this.lastPositionData.lon,
                    positionData.lat, positionData.lon
                );
                const timeSec = (positionData.timestamp - this.lastPositionData.timestamp) / 1000;

                if (timeSec > 0) {
                    rawSpeed = (distMeters / timeSec) * 3.6; // convert m/s to km/h
                } else {
                    rawSpeed = 0;
                }
            } else {
                rawSpeed = 0;
            }
        }

        this.lastPositionData = positionData;

        // Apply Moving Average Smoothing Filter
        this.currentSpeed = this.smoothSpeed(rawSpeed);

        // Filter out noise < 3 km/h (treat as halted)
        if (this.currentSpeed < 3.0) {
            this.currentSpeed = 0;
        }

        // Update Max Speed
        if (this.currentSpeed > this.maxSpeed) {
            this.maxSpeed = Math.round(this.currentSpeed * 10) / 10;
        }

        // Determine Motion State
        this.motionState = this.determineMotionState(this.currentSpeed);

        const result = {
            currentSpeed: Math.round(this.currentSpeed * 10) / 10,
            maxSpeed: this.maxSpeed,
            motionState: this.motionState,
            rawSpeed: Math.round(rawSpeed * 10) / 10
        };
		
		this.updateDisplay(result.currentSpeed);

        if (typeof this.onSpeedUpdate === "function") {
            this.onSpeedUpdate(result);
        }
    }

    /**
     * Moving Average Filter to eliminate GPS jitter
     */
    smoothSpeed(newSpeed) {
        this.speedHistory.push(newSpeed);
        if (this.speedHistory.length > this.windowSize) {
            this.speedHistory.shift();
        }
        const sum = this.speedHistory.reduce((acc, val) => acc + val, 0);
        return sum / this.speedHistory.length;
    }

    /**
     * Motion State Logic
     */
    determineMotionState(speed) {
        if (speed < 3.0) {
            return "HALTED";
        } else if (speed >= 3.0 && speed < 30.0) {
            return "DEPARTING";
        } else {
            return "CRUISING";
        }
    }

    /**
     * Simple Haversine Helper for delta speed fallback
     */
    calculateDistanceBetween(lat1, lon1, lat2, lon2) {
        const R = 6371000;
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
                  Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    resetStats() {
        this.speedHistory = [];
        this.currentSpeed = 0;
        this.maxSpeed = 0;
        this.motionState = "HALTED";
        this.lastPositionData = null;
        this.log("Speedometer stats reset.");
    }
}