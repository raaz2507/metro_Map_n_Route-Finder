/**
 * 🏬 AppStateStore - Centralized Reactive State Store & Trigger Hub
 * Enterprise ES2022 OOP Singleton with Observer Pattern.
 * Single Source of Truth for Language, Theme, Active City & Route.
 */
import i18n from "./i18n.js";

class AppStateStore {
    // Private State
    #state = {
        currentLang: "en",
        currentTheme: "light",
        activeCity: "delhi_ncr",
        activeNetwork: null,
        activeRoute: null
    };

    #listeners = new Map();

    constructor() {
        this.#bootstrapFromStorage();
    }

    #bootstrapFromStorage() {
        try {
            const savedLang = localStorage.getItem("app-lang") || localStorage.getItem("language") || "en";
            const savedTheme = localStorage.getItem("app-theme") || localStorage.getItem("metro-theme") || "light";
            const savedCity = localStorage.getItem("active_city") || "delhi_ncr";
            const savedNetwork = localStorage.getItem("active_network") || null;

            this.#state.currentLang = savedLang;
            this.#state.currentTheme = savedTheme;
            this.#state.activeCity = savedCity;
            this.#state.activeNetwork = savedNetwork;

            document.documentElement.lang = savedLang;
            document.body.setAttribute("data-lang", savedLang);
            document.body.setAttribute("data-theme", savedTheme);
        } catch (e) {
            console.warn("[AppStateStore] Storage access error:", e);
        }
    }

    getState(key = null) {
        if (key) return this.#state[key];
        return { ...this.#state };
    }

    async setState(partialState = {}) {
        const changedKeys = [];

        for (const [key, value] of Object.entries(partialState)) {
            if (this.#state[key] !== value) {
                this.#state[key] = value;
                changedKeys.push(key);
                this.#persistSlice(key, value);
            }
        }

        if (changedKeys.includes("currentLang")) {
            await i18n.setLanguage(this.#state.currentLang);
            document.body.setAttribute("data-lang", this.#state.currentLang);
        }

        if (changedKeys.includes("currentTheme")) {
            document.body.setAttribute("data-theme", this.#state.currentTheme);
        }

        for (const key of changedKeys) {
            this.#notify(key, this.#state[key]);
        }
    }

    #persistSlice(key, value) {
        try {
            if (key === "currentLang") {
                localStorage.setItem("app-lang", value);
                localStorage.setItem("language", value);
            } else if (key === "currentTheme") {
                localStorage.setItem("app-theme", value);
                localStorage.setItem("metro-theme", value);
            } else if (key === "activeCity") {
                localStorage.setItem("active_city", value);
            } else if (key === "activeNetwork" && value) {
                localStorage.setItem("active_network", value);
            }
        } catch (e) {
            console.warn("[AppStateStore] Failed to write storage:", e);
        }
    }

    subscribe(sliceKey, callback) {
        if (typeof callback !== "function") return () => {};

        if (!this.#listeners.has(sliceKey)) {
            this.#listeners.set(sliceKey, new Set());
        }
        this.#listeners.get(sliceKey).add(callback);

        return () => {
            if (this.#listeners.has(sliceKey)) {
                this.#listeners.get(sliceKey).delete(callback);
            }
        };
    }

    #notify(sliceKey, value) {
        if (this.#listeners.has(sliceKey)) {
            this.#listeners.get(sliceKey).forEach((cb) => {
                try {
                    cb(value);
                } catch (err) {
                    console.error(`[AppStateStore] Error in listener for "${sliceKey}":`, err);
                }
            });
        }
    }
}

export const appStateStore = new AppStateStore();