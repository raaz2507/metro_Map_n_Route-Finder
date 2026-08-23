/**
 * Metro GPS Tracker - Core Class
 * Handles: Real-time Geolocation, Haversine Distance, Accuracy Filtering, and Simulation Mode
 */
export class GpsTracker {
    constructor(options = {}) {
        this.targetCoords = options.targetCoords || null; // { lat, lon }
        this.watchId = null;
        this.isTracking = false;
        this.minAccuracyMeters = options.minAccuracyMeters || 100; // Ignore positions with worse accuracy than this

        this.lastPosition = null;

        // Callbacks
        this.onPositionUpdate = options.onPositionUpdate || null;
        this.onError = options.onError || null;
        this.onLog = options.onLog || null;
    }

    log(msg, type = "info") {
        console.log(`[GpsTracker] ${msg}`);
        if (typeof this.onLog === "function") {
            this.onLog(msg, type);
        }
    }

    setTarget(lat, lon) {
        this.targetCoords = { lat: Number(lat), lon: Number(lon) };
        this.log(`Target set to: Lat ${lat}, Lon ${lon}`);
    }

    clearTarget() {
        this.targetCoords = null;
        this.log(`Target cleared.`);
    }

    /**
     * Start Real GPS Tracking
     */
    startTracking() {
        if (!("geolocation" in navigator)) {
            const err = "Geolocation is not supported by your browser.";
            this.log(err, "error");
            if (this.onError) this.onError(err);
            return;
        }

        if (this.isTracking) return;

        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        };

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => this.handlePositionUpdate(pos),
            (err) => this.handlePositionError(err),
            geoOptions
        );

        this.isTracking = true;
        this.log("Real-time GPS Tracking STARTED.");
    }

    /**
     * Stop GPS Tracking
     */
    stopTracking() {
        if (this.watchId !== null) {
            navigator.geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.isTracking = false;
        this.log("GPS Tracking STOPPED.");
    }

    /**
     * Process raw GPS position
     */
    handlePositionUpdate(position) {
        const coords = position.coords;
        const accuracy = coords.accuracy;

        if (accuracy > this.minAccuracyMeters) {
            this.log(`Ignored GPS update due to low accuracy (${Math.round(accuracy)}m > ${this.minAccuracyMeters}m limit)`, "warn");
            return;
        }

        const currentLat = coords.latitude;
        const currentLon = coords.longitude;
        const timestamp = position.timestamp || Date.now();

        // Speed from GPS hardware (m/s to km/h) or null
        const rawSpeedKmh = (coords.speed !== null && coords.speed >= 0) ? (coords.speed * 3.6) : null;

        // Calculate distance to target if target is set
        let distanceToTarget = null;
        if (this.targetCoords) {
            distanceToTarget = this.calculateHaversineDistance(
                currentLat, currentLon,
                this.targetCoords.lat, this.targetCoords.lon
            );
        }

        const positionData = {
            lat: currentLat,
            lon: currentLon,
            accuracy: Math.round(accuracy),
            altitude: coords.altitude || 0,
            heading: coords.heading || 0,
            rawSpeedKmh: rawSpeedKmh,
            distanceToTarget: distanceToTarget,
            timestamp: timestamp
        };

        this.lastPosition = positionData;

        if (typeof this.onPositionUpdate === "function") {
            this.onPositionUpdate(positionData);
        }
    }

    handlePositionError(error) {
        let msg = "Unknown GPS Error";
        switch (error.code) {
            case error.PERMISSION_DENIED:
                msg = "GPS Permission Denied by user.";
                break;
            case error.POSITION_UNAVAILABLE:
                msg = "GPS Position Unavailable.";
                break;
            case error.TIMEOUT:
                msg = "GPS Request Timed Out.";
                break;
        }
        this.log(msg, "error");
        if (typeof this.onError === "function") {
            this.onError(msg);
        }
    }

    /**
     * Haversine Formula for distance calculation between two lat/lon points (returns Meters)
     */
    calculateHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Earth radius in meters
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;

        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
                  Math.sin(dLon / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return Math.round(R * c);
    }

    /**
     * Simulation Method: Inject fake position for testing without moving
     */
    simulatePosition(lat, lon, fakeSpeedKmh = 45) {
        const positionData = {
            lat: Number(lat),
            lon: Number(lon),
            accuracy: 5,
            altitude: 200,
            heading: 90,
            rawSpeedKmh: fakeSpeedKmh,
            distanceToTarget: this.targetCoords ? this.calculateHaversineDistance(lat, lon, this.targetCoords.lat, this.targetCoords.lon) : null,
            timestamp: Date.now()
        };

        this.lastPosition = positionData;
        this.log(`Simulated Position: Lat ${lat}, Lon ${lon}, Speed ${fakeSpeedKmh}km/h`);

        if (typeof this.onPositionUpdate === "function") {
            this.onPositionUpdate(positionData);
        }
    }
}