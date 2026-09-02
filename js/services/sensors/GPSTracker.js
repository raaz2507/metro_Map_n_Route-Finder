/**
 * 📡 GPSTracker - Universal Real-Time Telemetry & Speedometer Engine
 * Enterprise ES2022 OOP Class with Hybrid Capacitor & Web Geolocation Bridge
 * 
 * विशेषताएँ:
 * 1. Universal Platform Bridge: Web Browser, PWA और Capacitor Android APK तीनों पर निर्बाध कार्य।
 * 2. Speed Smoothing Filter: Moving Average विंडो (Window Size = 5) से स्मूथ स्पीड (km/h)।
 * 3. Dual Speed Engine: अगर हार्डवेयर स्पीड null हो तो (Δdistance / Δtime) से स्पीड कैलकुलेट करता है।
 * 4. Haversine Geofencing: टारगेट स्टेशन के अक्षांश/देशांतर (Lat/Lon) से सटीक दूरी (मीटर में)।
 * 5. Low-Speed Noise Filter: 3 km/h से कम की स्पीड को स्टॉप (0 km/h) मानता है।
 */

export class GPSTracker {
    // Private State Fields
    #watchId = null;
    #isTracking = false;
    #targetCoords = null; // { lat, lon }
    #lastPosition = null;

    // Speedometer & Smoothing State
    #speedHistory = [];
    #windowSize = 5;
    #currentSpeed = 0;
    #maxSpeed = 0;
    #motionState = "HALTED"; // 'HALTED' | 'DEPARTING' | 'CRUISING'

    // Callbacks
    #onPositionUpdate = null;
    #onSpeedUpdate = null;
    #onError = null;

    /**
     * @param {Object} options
     * @param {number} [options.windowSize=5] - स्पीड स्मूथिंग विंडो का आकार
     * @param {Function} [options.onPositionUpdate] - लोकेशन बदलने पर कॉलबैक
     * @param {Function} [options.onSpeedUpdate] - स्पीडोमीटर के लिए लाइव स्पीड कॉलबैक
     * @param {Function} [options.onError] - त्रुटि कॉलबैक
     */
    constructor(options = {}) {
        this.#windowSize = options.windowSize || 5;
        this.#onPositionUpdate = options.onPositionUpdate || null;
        this.#onSpeedUpdate = options.onSpeedUpdate || null;
        this.#onError = options.onError || null;
    }

    /**
     * टारगेट स्टेशन के कोऑर्डिनेट्स सेट करें (Geofence Target)
     */
    setTarget(lat, lon) {
        if (lat != null && lon != null) {
            this.#targetCoords = { lat: Number(lat), lon: Number(lon) };
        }
    }

    /**
     * टारगेट स्टेशन हटाएं
     */
    clearTarget() {
        this.#targetCoords = null;
    }

    /**
     * लाइव GPS ट्रैकिंग शुरू करें
     */
    async startTracking(callbacks = {}) {
        if (callbacks.onPositionUpdate) this.#onPositionUpdate = callbacks.onPositionUpdate;
        if (callbacks.onSpeedUpdate) this.#onSpeedUpdate = callbacks.onSpeedUpdate;
        if (callbacks.onError) this.#onError = callbacks.onError;

        if (this.#isTracking) return;

        // 1. क्या Capacitor Native Environment में हैं?
        const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform();

        if (isNative && window.Capacitor?.Plugins?.Geolocation) {
            try {
                this.#watchId = await window.Capacitor.Plugins.Geolocation.watchPosition(
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
                    (pos, err) => {
                        if (err) this.#handleError(err);
                        else if (pos) this.#processPosition(pos);
                    }
                );
                this.#isTracking = true;
                return;
            } catch (err) {
                console.warn("[GPSTracker] Capacitor Geolocation failed, falling back to Web API:", err);
            }
        }

        // 2. Standard Web & PWA Geolocation API
        if (!("geolocation" in navigator)) {
            const errorMsg = "Geolocation is not supported by your browser.";
            this.#handleError(new Error(errorMsg));
            return;
        }

        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        this.#watchId = navigator.geolocation.watchPosition(
            (pos) => this.#processPosition(pos),
            (err) => this.#handleError(err),
            geoOptions
        );

        this.#isTracking = true;
    }

    /**
     * GPS ट्रैकिंग बंद करें
     */
    stopTracking() {
        if (this.#watchId !== null) {
            const isNative = typeof window !== "undefined" && window.Capacitor?.isNativePlatform();
            if (isNative && window.Capacitor?.Plugins?.Geolocation && typeof this.#watchId === "string") {
                window.Capacitor.Plugins.Geolocation.clearWatch({ id: this.#watchId });
            } else if (typeof this.#watchId === "number") {
                navigator.geolocation.clearWatch(this.#watchId);
            }
            this.#watchId = null;
        }

        this.#isTracking = false;
        this.#currentSpeed = 0;
        this.#speedHistory = [];
    }

    /**
     * लोकेशन और स्पीड डेटा को प्रोसेस करें
     */
        /**
     * 🛰️ शुद्ध हार्डवेयर जीपीएस स्पीड प्रोसेसिंग (Zero Fake Delta Math)
     */
    #processPosition(position) {
        const coords = position.coords;
        const currentLat = coords.latitude;
        const currentLon = coords.longitude;
        const accuracy = coords.accuracy || 10;
        const timestamp = position.timestamp || Date.now();

        // 1. ✅ केवल और केवल सैटेलाइट चिप की हार्डवेयर स्पीड (coords.speed in m/s)
        let rawHardwareSpeedKmh = 0;
        if (coords.speed !== null && coords.speed !== undefined && coords.speed >= 0) {
            rawHardwareSpeedKmh = coords.speed * 3.6; // m/s -> km/h
        }

        // 2. स्पीड स्मूथिंग फ़िल्टर (हल्के सैटेलाइट फ्लक्चुएशन हटाने के लिए)
        this.#currentSpeed = this.#smoothSpeed(rawHardwareSpeedKmh);

        // 3. 3.0 km/h से कम को हमेशा स्थिर (0.0 km/h) मानें
        if (this.#currentSpeed < 3.0) {
            this.#currentSpeed = 0;
        }

        if (this.#currentSpeed > this.#maxSpeed) {
            this.#maxSpeed = Math.round(this.#currentSpeed * 10) / 10;
        }

        this.#motionState = this.#determineMotionState(this.#currentSpeed);

        // 4. टारगेट स्टेशन से दूरी (सिर्फ Geofencing ट्रिगर के लिए)
        let distanceToTarget = null;
        if (this.#targetCoords) {
            distanceToTarget = this.calculateHaversineDistance(
                currentLat, currentLon,
                this.#targetCoords.lat, this.#targetCoords.lon
            );
        }

        this.#lastPosition = { lat: currentLat, lon: currentLon, timestamp };

        // 5. कॉलबैक्स ट्रिगर करें
        if (typeof this.#onPositionUpdate === "function") {
            this.#onPositionUpdate({
                lat: currentLat,
                lon: currentLon,
                accuracy: Math.round(accuracy),
                distanceToTarget: distanceToTarget !== null ? Math.round(distanceToTarget) : null,
                timestamp
            });
        }

        if (typeof this.#onSpeedUpdate === "function") {
            this.#onSpeedUpdate({
                currentSpeedKmh: Math.round(this.#currentSpeed * 10) / 10,
                maxSpeedKmh: this.#maxSpeed,
                motionState: this.#motionState,
                accuracy: Math.round(accuracy),
                timestamp
            });
        }
    }

    /**
     * मूविंग एवरेज फ़िल्टर (Moving Average Filter)
     */
    #smoothSpeed(speedKmh) {
        this.#speedHistory.push(speedKmh);
        if (this.#speedHistory.length > this.#windowSize) {
            this.#speedHistory.shift();
        }
        const sum = this.#speedHistory.reduce((acc, val) => acc + val, 0);
        return sum / this.#speedHistory.length;
    }

    /**
     * मोशन स्टेट निर्धारित करें
     */
    #determineMotionState(speed) {
        if (speed <= 3) return "HALTED";
        if (speed < 20) return "DEPARTING";
        return "CRUISING";
    }

    /**
     * Haversine फ़ॉर्मूले से दो बिंदुओं के बीच की दूरी (मीटर में)
     */
    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // पृथ्वी की त्रिज्या (मीटर)
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);

        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    #handleError(error) {
        console.warn("[GPSTracker] GPS Error:", error);
		
		// 1. AlarmManager को सूचित करें
        if (typeof this.#onError === "function") {
            this.#onError(error);
        }

        let msgKey = "pages.home.gps.unavailable";
        if (error.code === 1) { // 1 = PERMISSION_DENIED
            msgKey = "pages.home.gps.permissionDenied";
        }

        // 📍 स्क्रीन पर साफ़ टोस्ट मैसेज दिखाएं
        eventBus.emit("SHOW_TOAST", {
            message: i18n.t(msgKey) || "📍 Please enable GPS / Location permissions for live speed & tracking",
            type: "error"
        });

        if (typeof this.#onError === "function") {
            this.#onError(error);
        }
    }
}