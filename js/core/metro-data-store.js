/**
 * Metro Data Store - Universal Dynamic Singleton Data Repository
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically loads and normalizes transit data for any selected city.
 */
import { normalizeStationCoordinates } from "./data-utils.js";

class MetroDataStore {
    // Private State Fields
    #metroData = null;
    #stationsDetailData = null;
    #currentCity = "delhi_ncr";
    #currentNetwork = null;
    #registryData = null;
    #abortController = null;
    #defaultCity = "delhi_ncr";

    constructor() {
        this.#metroData = {
            defaults: {},
            fareRules: {},
            station_types: {},
            lines: {},
            stationData: {}
        };
    }

    /**
     * Loads master transit registry (india_transit_registry.json)
     */
    async loadRegistry() {
        if (this.#registryData) return this.#registryData;

        try {
            const response = await fetch("data/india_transit_registry.json");
            if (response.ok) {
                this.#registryData = await response.json();
            }
        } catch (error) {
            console.warn("[MetroDataStore] Failed to load transit registry:", error);
        }
        return this.#registryData;
    }

    /**
     * Dynamically loads transit graph data for the requested or detected city.
     * Priority: 1. Passed cityKey -> 2. URL (?city=) -> 3. localStorage -> 4. 'delhi_ncr'
     */
    async loadCity(cityKey = null, networkKey = null) {
        // 1. Resolve Target City & Network
        const resolvedCity = this.#resolveCityKey(cityKey);
        const resolvedNetwork = this.#resolveNetworkKey(networkKey);

        // Prevent redundant fetch if same city is already loaded
        if (this.#metroData && this.#currentCity === resolvedCity && Object.keys(this.#metroData.lines || {}).length > 0) {
            this.#currentNetwork = resolvedNetwork;
            return this.#metroData;
        }

        // 2. Abort previous pending fetch to prevent race conditions
        if (this.#abortController) {
            this.#abortController.abort();
        }
        this.#abortController = new AbortController();

        const dataPath = `data/cities/${resolvedCity}/data.json`;

        try {
            console.log(`[MetroDataStore] Loading transit data for: "${resolvedCity}" from ${dataPath}...`);
            const response = await fetch(dataPath, {
                signal: this.#abortController.signal
            });

            if (!response.ok) {
                throw new Error(`Data file not found for city "${resolvedCity}" (HTTP ${response.status})`);
            }

            const rawData = await response.json();
            this.#metroData = normalizeStationCoordinates(rawData);
            this.#currentCity = resolvedCity;
            this.#currentNetwork = resolvedNetwork;

            // Persist active city in localStorage
            try {
                localStorage.setItem("active_city", resolvedCity);
                if (resolvedNetwork) {
                    localStorage.setItem("active_network", resolvedNetwork);
                }
            } catch (e) {
                console.warn("[MetroDataStore] LocalStorage write failed:", e);
            }

            return this.#metroData;
        } catch (error) {
            if (error.name === "AbortError") {
                return this.#metroData;
            }

            console.warn(`[MetroDataStore] Failed to load "${resolvedCity}". Falling back to default "${this.#defaultCity}"...`, error);

            // Fallback to Default City (delhi_ncr) and SHOW TOAST NOTICE
            if (resolvedCity !== this.#defaultCity) {
                this.#showFallbackToast(resolvedCity, this.#defaultCity);
                return await this.loadCity(this.#defaultCity, "dmrc");
            }

            throw error;
        }
    }

    /**
     * Dynamically loads detailed station facilities data (stations_data.json)
     */
    async loadStationsDetail(cityKey = null) {
        const resolvedCity = this.#resolveCityKey(cityKey);
        const dataPath = `data/cities/${resolvedCity}/stations_data.json`;

        try {
            const response = await fetch(dataPath);
            if (!response.ok) {
                throw new Error(`Detailed stations file not found for "${resolvedCity}"`);
            }
            this.#stationsDetailData = await response.json();
            return this.#stationsDetailData;
        } catch (error) {
            console.warn(`[MetroDataStore] Failed to load stations detail for "${resolvedCity}":`, error);
            if (resolvedCity !== this.#defaultCity) {
                return await this.loadStationsDetail(this.#defaultCity);
            }
            return {};
        }
    }

    /**
     * Resolves City Key using 3-tier hierarchy
     */
    #resolveCityKey(explicitCity) {
        if (explicitCity && typeof explicitCity === "string" && explicitCity.trim() !== "") {
            return explicitCity.trim().toLowerCase();
        }

        // Check URL Parameters (?city=delhi_ncr)
        if (typeof window !== "undefined" && window.location) {
            const urlParams = new URLSearchParams(window.location.search);
            const paramCity = urlParams.get("city") || urlParams.get("region");
            if (paramCity && paramCity.trim() !== "") {
                return paramCity.trim().toLowerCase();
            }
        }

        // Check LocalStorage
        try {
            const storedCity = localStorage.getItem("active_city");
            if (storedCity && storedCity.trim() !== "") {
                return storedCity.trim().toLowerCase();
            }
        } catch (e) {
            // Ignore
        }

        return this.#defaultCity;
    }

    /**
     * Resolves Network Key
     */
    #resolveNetworkKey(explicitNetwork) {
        if (explicitNetwork && typeof explicitNetwork === "string" && explicitNetwork.trim() !== "") {
            return explicitNetwork.trim().toLowerCase();
        }

        if (typeof window !== "undefined" && window.location) {
            const urlParams = new URLSearchParams(window.location.search);
            const paramNet = urlParams.get("network") || urlParams.get("net");
            if (paramNet && paramNet.trim() !== "") {
                return paramNet.trim().toLowerCase();
            }
        }

        try {
            const storedNet = localStorage.getItem("active_network");
            if (storedNet && storedNet.trim() !== "") {
                return storedNet.trim().toLowerCase();
            }
        } catch (e) {
            // Ignore
        }

        return null;
    }

        /**
     * Highly Visible, Animated Top-Center Notification Toast on Data Fallback
     */
    #showFallbackToast(requestedCity, fallbackCity) {
        if (typeof document === "undefined") return;

        const formattedRequested = requestedCity.replace(/_/g, " ").toUpperCase();
        const formattedFallback = fallbackCity.replace(/_/g, " ").toUpperCase();

        // Remove any existing fallback toast first
        const existing = document.getElementById("metro-fallback-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.id = "metro-fallback-toast";
        toast.setAttribute("role", "alert");
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.3rem;">⚠️</span>
                <div>
                    <strong style="color: #92400e; font-weight: 700; display: block; font-size: 0.95rem;">City Data Under Construction</strong>
                    <span style="color: #78350f; font-size: 0.85rem;">
                        Transit data for "<strong>${formattedRequested}</strong>" is not yet available. Showing <strong>${formattedFallback}</strong> map.
                    </span>
                </div>
            </div>
            <button type="button" aria-label="Close Notice" style="background: transparent; border: none; font-size: 1.1rem; color: #92400e; cursor: pointer; padding: 2px 6px; font-weight: bold; margin-left: 12px; line-height: 1;">✕</button>
        `;

        // Modern High-Visibility Top Toast Styles
        Object.assign(toast.style, {
            position: "fixed",
            top: "85px",
            left: "50%",
            transform: "translateX(-50%) translateY(-20px)",
            backgroundColor: "#fef3c7", // Bright Warm Amber
            border: "1.5px solid #f59e0b",
            borderRadius: "12px",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.2), 0 1px 3px rgba(0,0,0,0.1)",
            padding: "12px 20px",
            zIndex: "999999",
            maxWidth: "92vw",
            width: "max-content",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--font-main, sans-serif)",
            opacity: "0",
            transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)"
        });

        document.body.appendChild(toast);

        // Entrance Animation Trigger
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateX(-50%) translateY(0)";
        });

        // Close Button Handler
        const closeBtn = toast.querySelector("button");
        const dismissToast = () => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(-50%) translateY(-15px)";
            setTimeout(() => toast.remove(), 350);
        };

        if (closeBtn) {
            closeBtn.addEventListener("click", dismissToast);
        }

        // Auto dismiss after 5.5 seconds
        setTimeout(dismissToast, 5500);
    }

    // Public Getters
    get data() {
        return this.#metroData;
    }

    get stationData() {
        return this.#metroData?.stationData || {};
    }

    get lines() {
        return this.#metroData?.lines || {};
    }

    get fareRules() {
        return this.#metroData?.fareRules || {};
    }

    get currentCity() {
        return this.#currentCity;
    }

    get currentNetwork() {
        return this.#currentNetwork;
    }

    get stationsDetail() {
        return this.#stationsDetailData || {};
    }

    get isLoaded() {
        return Boolean(this.#metroData && Object.keys(this.#metroData.lines || {}).length > 0);
    }
}

export const metroDataStore = new MetroDataStore();