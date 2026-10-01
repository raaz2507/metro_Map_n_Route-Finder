/**
 * 🎨 Enterprise Pluggable Theme & Modular Skin Pack Engine
 * Handles dynamic CSS tokens and modular component/asset injection.
 */
import { appStateStore } from "./app-state-store.js";

export class ThemeEngine {
	static #instance = null;
	#manifest = null;
	#activeThemeId = "classic";
	#cssStyleElement = null;
	#svgContainerElement = null;
	#abortController = null;

	constructor() {
		if (ThemeEngine.#instance) {
			return ThemeEngine.#instance;
		}
		ThemeEngine.#instance = this;
	}

	/**
	 * Singleton Accessor
	 */
	static getInstance() {
		if (!this.#instance) {
			this.#instance = new ThemeEngine();
		}
		return this.#instance;
	}

	/**
	 * Initialize the Theme Engine
	 */
	async init() {
		this.#ensureDOMMountPoints();

		try {
			const manifestRes = await fetch("themes/manifest.json");
			if (manifestRes.ok) {
				this.#manifest = await manifestRes.json();
			}
		} catch (e) {
			console.warn("[ThemeEngine] Could not load manifest:", e);
		}

		const defaultTheme = this.#manifest?.defaultTheme || "classic";
		const validThemeIds = this.#manifest?.themes?.map(t => t.id) || ["classic"];

		let savedTheme = localStorage.getItem("app-theme");
		if (!savedTheme || !validThemeIds.includes(savedTheme)) {
			savedTheme = defaultTheme;
			localStorage.setItem("app-theme", defaultTheme);
		}
		this.#activeThemeId = savedTheme;

		appStateStore.subscribe("currentTheme", async (newTheme) => {
			if (newTheme && newTheme !== this.#activeThemeId && validThemeIds.includes(newTheme)) {
				await this.applyTheme(newTheme);
			}
		});

		await this.applyTheme(this.#activeThemeId);
	}

	getActiveTheme() {
		return this.#activeThemeId;
	}

	getThemes() {
		return this.#manifest?.themes || [];
	}
	/**
	 * Create DOM mounts for injected CSS and SVG Symbols
	 */
	#ensureDOMMountPoints() {
		this.#cssStyleElement = document.getElementById("active-theme-pack-css");
		if (!this.#cssStyleElement) {
			this.#cssStyleElement = document.createElement("style");
			this.#cssStyleElement.id = "active-theme-pack-css";
			document.head.appendChild(this.#cssStyleElement);
		}

		this.#svgContainerElement = document.getElementById("active-theme-coach-symbols");
		if (!this.#svgContainerElement) {
			this.#svgContainerElement = document.createElement("div");
			this.#svgContainerElement.id = "active-theme-coach-symbols";
			this.#svgContainerElement.style.display = "none";
			this.#svgContainerElement.setAttribute("aria-hidden", "true");
			document.body.prepend(this.#svgContainerElement);
		}
	}

	/**
	 * Apply a Theme by ID (Modular Payload Loading)
	 */
	async applyTheme(themeId) {
		if (!themeId) return;

		if (this.#abortController) {
			this.#abortController.abort();
		}
		this.#abortController = new AbortController();
		const signal = this.#abortController.signal;

		try {
			this.#activeThemeId = themeId;
			document.body.setAttribute("data-theme", themeId);
			localStorage.setItem("app-theme", themeId);

			const basePath = `themes/bundled/${themeId}`;

			// 1. Always load Master Global tokens.css
			let combinedCss = "";
			try {
				const tokensRes = await fetch(`${basePath}/tokens.css`, { signal });
				if (tokensRes.ok) {
					combinedCss += await tokensRes.text() + "\n";
				}
			} catch (_) {}

			// 2. Conditionally load Coach Module if on page with coach cards or stations directory
			const hasCoach = document.querySelector(".real-coach-card, #cards-container, .train-track-row, #stations-directory-container, .stations-page-container");
			if (hasCoach) {
				try {
					const coachCssRes = await fetch(`${basePath}/css/coach.css`, { signal });
					if (coachCssRes.ok) {
						combinedCss += await coachCssRes.text() + "\n";
					}
					const coachSvgRes = await fetch(`${basePath}/assets/images/coach.svg`, { signal });
					if (coachSvgRes.ok) {
						this.#svgContainerElement.innerHTML = await coachSvgRes.text();
					}
				} catch (_) {}
			}

			// 3. Conditionally load TVM Module if on TVM Dispenser page
			const hasTvm = document.querySelector(".tvm-kiosk-unit, .kiosk-workspace");
			if (hasTvm) {
				try {
					const tvmCssRes = await fetch(`${basePath}/css/tvm.css`, { signal });
					if (tvmCssRes.ok) {
						combinedCss += await tvmCssRes.text() + "\n";
					}
				} catch (_) {}
			}

			// Inject combined scoped CSS into style tag
			this.#cssStyleElement.textContent = combinedCss;

			// Dispatch global theme ready event
			window.dispatchEvent(new CustomEvent("theme-applied", { detail: { themeId } }));
		} catch (err) {
			if (err.name !== "AbortError") {
				console.error(`[ThemeEngine] Failed to apply theme "${themeId}":`, err);
			}
		}
	}

	getActiveTheme() {
		return this.#activeThemeId;
	}
}

export const themeEngine = ThemeEngine.getInstance();