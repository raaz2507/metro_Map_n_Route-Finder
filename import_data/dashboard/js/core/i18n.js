const DEFAULT_LANGUAGE = "en";

class I18n {
	#currentLanguage = "en";
	#dictionary = {};
	#languageCache = new Map();
	#RTL_LANGUAGES = new Set(["ar", "fa", "ur"]);

	constructor() {}

	/* Initialize i18n */
	async initI18n() {
		const savedLanguage = localStorage.getItem("language");
		const language = savedLanguage || DEFAULT_LANGUAGE;
		await this.setLanguage(language);
	}

	/* Change language */
	async setLanguage(lang) {
		this.#dictionary = await this.#loadLanguageFile(lang);
		this.#currentLanguage = lang;
		document.documentElement.lang = lang;
		this.#applyDirection(lang);
		localStorage.setItem("language", lang);
		this.applyTranslations();

		// Dispatch Decoupled CustomEvent for dynamic reactive UI components
		window.dispatchEvent(new CustomEvent('languageChanged', {
			detail: {
				language: lang,
				dictionary: this.#dictionary
			}
		}));
	}

	/* Current language (Idiomatic accessor) */
	get language() {
		return this.#currentLanguage;
	}

	/* Legacy backward compatibility accessor */
	get getLanguage() {
		return this.#currentLanguage;
	}

	/* Apply RTL/LTR */
	#applyDirection(lang) {
		const direction = this.#RTL_LANGUAGES.has(lang) ? "rtl" : "ltr";
		document.documentElement.dir = direction;
	}

	/* Apply everything (Public API so newly mounted components can re-trigger) */
	applyTranslations() {
		this.#applyTextTranslations();
		this.#applyPlaceholderTranslations();
		this.#applyTitleTranslations();
		this.#applyAriaLabelTranslations();
		this.#applyDocumentTitle();
		this.#applyMetaTranslations();
	}

	/* Load language file dynamically with import.meta.url & Cache Busting */
	async #loadLanguageFile(lang) {
		if (this.#languageCache.has(lang)) {
			return this.#languageCache.get(lang);
		}

		try {
			// import.meta.url ensure karta hai ki path hamesha i18n.js se hi calculate ho, chahe koi bhi page khula ho
			const langUrl = new URL(`../lang/${lang}.js?t=${Date.now()}`, import.meta.url).href;
			const module = await import(langUrl);
			const data = module.default;
			this.#languageCache.set(lang, data);
			return data;
		} catch (error) {
			console.error(`[i18n] Failed to load language "${lang}":`, error);

			if (lang !== DEFAULT_LANGUAGE) {
				return this.#loadLanguageFile(DEFAULT_LANGUAGE);
			}

			throw error;
		}
	}

	/**
	 * Get nested value
	 * Example: getNestedValue(obj, "home.title")
	 */
	#getNestedValue(obj, path) {
		return path.split(".").reduce((current, key) => current?.[key], obj);
	}

	/**
	 * Replace variables
	 * Example: "Fare: {fare}"
	 */
	#interpolate(text, variables = {}) {
		return text.replace(/\{(.*?)\}/g, (_, key) => variables[key] ?? `{${key}}`);
	}

	/* Translate key */
	t(key, variables = {}) {
		const value = this.#getNestedValue(this.#dictionary, key);

		if (typeof value !== "string") {
			return key;
		}

		return this.#interpolate(value, variables);
	}

	/* Apply text translations (Safe HTML & Plaintext Support) */
    #applyTextTranslations() {
        document.querySelectorAll("[data-i18n]").forEach((element) => {
            const key = element.dataset.i18n;
            const text = this.t(key);
            if (text.includes('<') && text.includes('>')) {
                element.innerHTML = text;
            } else {
                element.textContent = text;
            }
        });
    }

	/* Apply placeholders */
	#applyPlaceholderTranslations() {
		document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
			const key = element.dataset.i18nPlaceholder;
			element.placeholder = this.t(key);
		});
	}

	/* Apply title attributes */
	#applyTitleTranslations() {
		document.querySelectorAll("[data-i18n-title]").forEach((element) => {
			const key = element.dataset.i18nTitle;
			element.title = this.t(key);
		});
	}

	/* Apply aria-label attributes */
	#applyAriaLabelTranslations() {
		document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
			const key = element.dataset.i18nAriaLabel;
			element.setAttribute("aria-label", this.t(key));
		});
	}

	/**
	 * Translate document title
	 */
	#applyDocumentTitle() {
		const titleElement = document.querySelector("[data-i18n-title-tag]");
		if (!titleElement) return;

		const key = titleElement.dataset.i18nTitleTag;
		document.title = this.t(key);
	}

	/**
	 * Translate meta tags
	 */
	#applyMetaTranslations() {
		document.querySelectorAll("[data-i18n-meta]").forEach((meta) => {
			const key = meta.dataset.i18nMeta;
			meta.setAttribute("content", this.t(key));
		});
	}
}

export default new I18n();