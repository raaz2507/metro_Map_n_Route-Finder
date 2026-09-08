/**
 * 📡 TelemetryService - Universal Sensor & Network Telemetry Engine
 * Enterprise ES2022 Decoupled Singleton Service Layer
 */


class TelemetryService {
	#subscribers = new Set();
	#gpsPermissionState = "prompt"; // 'granted' | 'denied' | 'prompt'
	#lastAccuracy = null;
	#isTrackingActive = false;
	#hasHardwareError = false;

	constructor() {
		this.#initPermissionWatcher();
		this.#initNetworkWatcher();
	}

	    /**
     * 1. ब्राउज़र/OS की GPS परमिशन की सीधी जांच
     */
    async #initPermissionWatcher() {
        if (typeof navigator === "undefined") return;

        // 🎯 1. शर्त हटाकर सीधे प्रोब करें ताकि परमिशन और एक्यूरेसी तुरंत लोड हो
        this.#probeInitialLocation();

        if (navigator.permissions?.query) {
            try {
                const status = await navigator.permissions.query({ name: "geolocation" });
                this.#gpsPermissionState = status.state;

                status.onchange = () => {
                    this.#gpsPermissionState = status.state;
                    if (status.state === "granted") {
                        this.#probeInitialLocation();
                    } else {
                        this.#notifySubscribers();
                    }
                };
            } catch (e) {
                console.warn("[TelemetryService] Permission query unsupported:", e);
            }
        }
    }

    /**
     * 🛰️ तुरंत लोकेशन और एक्यूरेसी नापने के लिए कॉल (Desktop + Mobile)
     */
    #probeInitialLocation() {
        if (typeof navigator === "undefined" || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                if (pos?.coords) {
                    this.#gpsPermissionState = "granted"; // ✅ परमिशन कन्फर्म
                    this.#lastAccuracy = Math.round(pos.coords.accuracy || 15);
                    this.#hasHardwareError = false;
                    this.#notifySubscribers();
                }
            },
            (err) => {
                if (err.code === 1) {
                    this.#gpsPermissionState = "denied"; // ब्लॉक है
                } else if (err.code === 2) {
                    this.#hasHardwareError = true; // डिवाइस GPS बंद
                }
                this.#notifySubscribers();
            },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
        );
    }

	/**
	 * 2. इंटरनेट नेटवर्क की निगरानी
	 */
	#initNetworkWatcher() {
		if (typeof window === "undefined") return;

		window.addEventListener("online", () => this.#notifySubscribers());
		window.addEventListener("offline", () => this.#notifySubscribers());

		const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
		if (conn) {
			conn.addEventListener("change", () => this.#notifySubscribers());
		}
	}

	/**
	 * GPS ट्रैकर से नया टेलीमेट्री डेटा रिसीव करें
	 */
	updateGpsTelemetry(telemetry = {}) {
		this.#lastAccuracy = typeof telemetry.accuracy === "number" ? telemetry.accuracy : null;
		this.#isTrackingActive = Boolean(telemetry.isTracking);
		this.#hasHardwareError = Boolean(telemetry.hasHardwareError);
		this.#notifySubscribers();
	}

	/**
	 * UI को सब्सक्राइब कराएं (Data Stream)
	 */
	subscribe(callback) {
		this.#subscribers.add(callback);
		// तुरंत वर्तमान स्थिति भेजें
		callback(this.getCurrentTelemetry());
		return () => this.#subscribers.delete(callback);
	}

	/**
	 * 🛰️ ब्राउज़र का GPS परमिशन डायलॉग बॉक्स खोलें
	 */
	requestGpsPermission(onGranted = null, onDenied = null) {
		if (typeof navigator === "undefined" || !navigator.geolocation) {
			if (typeof onDenied === "function") onDenied({ code: 0, message: "UNSUPPORTED" });
			return;
		}
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				this.#gpsPermissionState = "granted";
				this.#lastAccuracy = Math.round(pos.coords.accuracy || 15);
				this.#hasHardwareError = false;
				this.#notifySubscribers();
				if (typeof onGranted === "function") onGranted(pos);
			},
			(err) => {
				if (err.code === 1) {
					this.#gpsPermissionState = "denied";
				} else if (err.code === 2) {
					this.#hasHardwareError = true;
				}
				this.#notifySubscribers();
				if (typeof onDenied === "function") onDenied(err);
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
		);
	}

	/**
	 * 🎯 शुद्ध डोमेन टेलीमेट्री डेटा ऑब्जेक्ट (Zero UI / Zero i18n Strings)
	 */
	getCurrentTelemetry() {
		return {
			gps: this.#computeGpsDomainState(),
			network: this.#computeNetworkDomainState(),
		};
	}

	#computeGpsDomainState() {
		if (this.#gpsPermissionState === "denied") {
			return { status: "BLOCKED", badgeType: "danger", precisionText: "--" };
		}
		if (this.#gpsPermissionState === "prompt" && !this.#isTrackingActive) {
			return { status: "NOT_ALLOWED", badgeType: "warning", precisionText: "--" };
		}
		if (this.#hasHardwareError) {
			return { status: "DEVICE_OFF", badgeType: "danger", precisionText: "±--m" };
		}
		if (this.#lastAccuracy !== null) {
			if (this.#lastAccuracy > 100) {
				return { status: "TUNNEL", badgeType: "danger", precisionText: `±${this.#lastAccuracy}m` };
			}
			const pct = this.#calculateGpsPercentage(this.#lastAccuracy);
			const type = pct >= 80 ? "success" : pct >= 40 ? "warning" : "danger";
			return { status: "ACTIVE", percentage: pct, badgeType: type, precisionText: `±${this.#lastAccuracy}m` };
		}
		const status = this.#isTrackingActive ? "ACQUIRING" : "READY";
		return { status, badgeType: "success", precisionText: "±--m" };
	}

	#computeNetworkDomainState() {
		if (typeof navigator === "undefined" || !navigator.onLine) {
			return { status: "OFFLINE", percentage: 0, badgeType: "danger" };
		}
		const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
		let pct = 100;
		if (conn) {
			if (conn.effectiveType === "4g") pct = (conn.rtt && conn.rtt <= 100) ? 98 : 85;
			else if (conn.effectiveType === "3g") pct = 60;
			else if (conn.effectiveType === "2g") pct = 30;
		}
		return { status: "ONLINE", percentage: pct, badgeType: pct >= 80 ? "success" : "warning" };
	}
	#calculateGpsPercentage(accuracyMeters) {
		if (accuracyMeters <= 5) return 100;
		if (accuracyMeters >= 100) return 0;
		return Math.max(0, Math.min(100, Math.round(100 - ((accuracyMeters - 5) / 95) * 95)));
	}


	#notifySubscribers() {
		const payload = this.getCurrentTelemetry();
		for (const callback of this.#subscribers) {
			try {
				callback(payload);
			} catch (e) {
				console.error(e);
			}
		}
	}
}

export const telemetryService = new TelemetryService();
