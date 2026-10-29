/**
 * 🎨 Enterprise Pluggable Theme & Modular Skin Pack Engine
 * Handles dynamic CSS tokens and modular component/asset injection.
 */
import { appStateStore } from "./app-state-store.js";

const FALLBACK_THEMES_MANIFEST = {
	version: "1.0.0",
	defaultTheme: "classic",
	themes: [
		{ id: "classic", name: "Classic Metro", category: "🚇 Transit & Metro", badge: "Standard Edition", preview: { light: "#ffffff", dark: "#0f172a", accent: "#2563eb" } },
		{ id: "comic", name: "Pop-Comic Hero", category: "💥 Comics & Manga", badge: "Graphic Novel", preview: { light: "#fffde7", dark: "#18181b", accent: "#ef4444" } },
		{ id: "anime", name: "Anime Nostalgia", category: "🎬 Anime & Cinema", badge: "Cinematic Edition", preview: { light: "#faf7ea", dark: "#152232", accent: "#b45309" } },
		{ id: "cyberpunk", name: "Neon Cyberpunk", category: "⚡ Sci-Fi & Retro", badge: "Night City 2077", preview: { light: "#fdf4ff", dark: "#090314", accent: "#00f0ff" } },
		{ id: "pixel", name: "Retro 8-Bit Pixel", category: "⚡ Sci-Fi & Retro", badge: "Arcade & 8-Bit", preview: { light: "#1535a1", dark: "#08081a", accent: "#30cef0" } },
		{ id: "chamgadar", name: "Chamgadar", category: "🦇 Dark Vigilante", badge: "Shadow Patrol", preview: { light: "#dbe1ea", dark: "#0a0b0e", accent: "#f59e0b" } },
		{ id: "makad-manav", name: "Makad-Manav", category: "🕷️ Web-Slinger", badge: "Web Transit", preview: { light: "#f5f3f7", dark: "#080912", accent: "#ef4444" } }
	]
};

export class ThemeEngine {
	static #instance = null;
	#manifest = null;
	#localeManifest = null;
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
			const manifestUrl = new URL("../../themes/manifest.json", import.meta.url).href;
			const manifestRes = await fetch(manifestUrl).catch(() => fetch("themes/manifest.json"));
			if (manifestRes && manifestRes.ok) {
				this.#manifest = await manifestRes.json();
			}
		} catch (_) {
			// Expected when opened via file:/// protocol or offline
		}
		if (!this.#manifest) {
			this.#manifest = FALLBACK_THEMES_MANIFEST;
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

		const currentLang = localStorage.getItem("app-lang") || localStorage.getItem("language") || "en";
		await this.loadThemeLocale(currentLang);

		appStateStore.subscribe("currentLang", async (newLang) => {
			if (newLang) {
				await this.loadThemeLocale(newLang);
			}
		});

		await this.applyTheme(this.#activeThemeId);
	}

	getActiveTheme() {
		return this.#activeThemeId;
	}

	async loadThemeLocale(lang = "en") {
		try {
			const res = await fetch(`locales/${lang}/themes_manifest_locale.json`).catch(() => null);
			if (res && res.ok) {
				this.#localeManifest = await res.json();
			} else {
				this.#localeManifest = null;
			}
		} catch (_) {
			this.#localeManifest = null;
		}
	}

	getThemes() {
		const baseThemes = this.#manifest?.themes || [];
		if (!this.#localeManifest) return baseThemes;

		return baseThemes.map(t => {
			const loc = this.#localeManifest?.themes?.[t.id] || {};
			const cat = this.#localeManifest?.categories?.[t.category] || loc.category || t.category;
			return {
				...t,
				name: loc.name || t.name,
				category: cat || t.category,
				badge: loc.badge || t.badge,
				description: loc.description || t.description
			};
		});
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
			if (appStateStore.getState("currentTheme") !== themeId) {
				appStateStore.setState({ currentTheme: themeId });
			}

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