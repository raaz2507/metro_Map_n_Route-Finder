/**
 * 🌐 I18n Core Engine
 * Enterprise ES2022 Private OOP Singleton
 * Zero-fallback, Strict Error Handling, Single-Pass DOM Mutation
 */
const DEFAULT_LANGUAGE = "en";

export const LANGUAGE_CATEGORIES = [
	{
		id: "global",
		name: "Global / International",
		flag: "🌐",
		languages: [
			{ code: "en", label: "English", nativeName: "English", short: "EN", flag: "🌐" }
		]
	},
	{
		id: "india",
		name: "India (भारत)",
		flag: "🇮🇳",
		languages: [
			{ code: "hi", label: "हिन्दी", nativeName: "Hindi", short: "HI • IN", flag: "🇮🇳" }
		]
	},
];

export const SUPPORTED_LANGUAGES = LANGUAGE_CATEGORIES.flatMap(cat => cat.languages);

class I18n {
	#currentLanguage = DEFAULT_LANGUAGE;
	#dictionary = {};
	#languageCache = new Map();
	#RTL_LANGUAGES = new Set(["ar", "fa", "ur"]);

	constructor() {}

	/* Initialize i18n from storage */
	async initI18n() {
		const savedLanguage = localStorage.getItem("language") || localStorage.getItem("app-lang");
		const language = savedLanguage || DEFAULT_LANGUAGE;
		await this.setLanguage(language);
	}

	/* Change language with zero silent fallbacks */
	async setLanguage(lang) {
		this.#dictionary = await this.#loadLanguageFile(lang);
		this.#currentLanguage = lang;
		document.documentElement.lang = lang;
		this.#applyDirection(lang);
		localStorage.setItem("language", lang);
		localStorage.setItem("app-lang", lang);
		this.#applyTranslations();
	}

	/* Current active language code */
	get getLanguage() {
		return this.#currentLanguage;
	}

	/* Apply RTL/LTR layout */
	#applyDirection(lang) {
		const direction = this.#RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";
		document.documentElement.dir = direction;
	}

	/* Load language file dynamically - Throws directly on missing file (NO SILENT FALLBACKS) */
	async #loadLanguageFile(lang) {
		if (this.#languageCache.has(lang)) {
			return this.#languageCache.get(lang);
		}

		try {
			const module = await import(`../../lang/${lang}.js`);
			if (!module || !module.default) {
				throw new Error(`Invalid language module export for '${lang}'`);
			}
			const data = module.default;
			this.#languageCache.set(lang, data);
			return data;
		} catch (error) {
			console.error(`[I18n Engine] Fatal error loading language file '${lang}':`, error);
			throw error; // Strict: No silent default fallback
		}
	}

	/* Get nested dictionary value by dot path (e.g. "pages.home.title") */
	#getNestedValue(obj, path) {
		if (!path || !obj) return undefined;
		return path.split(".").reduce((current, key) => current?.[key], obj);
	}

	/* Interpolate dynamic placeholders like {fare}, {count} */
	#interpolate(text, variables = {}) {
		return text.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
	}

	/* Public translation method */
	t(key, variables = {}) {
		const value = this.#getNestedValue(this.#dictionary, key);

		if (typeof value !== "string") {
			return key;
		}

		return this.#interpolate(value, variables);
	}

	/**
	 * High-Performance Single-Pass DOM Translation
	 * Traverses DOM elements with i18n data-attributes in one unified pass
	 */
	#applyTranslations() {
		// 1. Unified element traversal
		const selector = "[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label], [data-i18n-meta]";
		const elements = document.querySelectorAll(selector);

		elements.forEach((el) => {
			const ds = el.dataset;

			if (ds.i18n) {
				el.textContent = this.t(ds.i18n);
			}
			if (ds.i18nPlaceholder) {
				el.placeholder = this.t(ds.i18nPlaceholder);
			}
			if (ds.i18nTitle) {
				el.title = this.t(ds.i18nTitle);
			}
			if (ds.i18nAriaLabel) {
				el.setAttribute("aria-label", this.t(ds.i18nAriaLabel));
			}
			if (ds.i18nMeta) {
				el.setAttribute("content", this.t(ds.i18nMeta));
			}
		});

		// 2. Document Title
		const titleEl = document.querySelector("[data-i18n-title-tag]");
		if (titleEl && titleEl.dataset.i18nTitleTag) {
			document.title = this.t(titleEl.dataset.i18nTitleTag);
		}
	}
}

export default new I18n();