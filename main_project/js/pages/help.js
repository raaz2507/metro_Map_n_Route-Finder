/**
 * ❓ HelpController - Enterprise ES2022 OOP Page Controller
 * Extends BaseSearchEngine for typo-tolerant instant search,
 * dynamic filter chips, accordion drawer states, and smooth scrollspy.
 */
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { BaseSearchEngine } from "../services/search/BaseSearchEngine.js";
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";

class HelpController extends BaseSearchEngine {
	// Private State Fields
	#dom = {};
	#activeFilter = "all";
	#searchQuery = "";
	#abortController = null;
	#unsubscribeLang = null;

	constructor() {
		super();
	}

	/**
	 * 🚀 Initialize Universal Layout & Help Features
	 */
	async init() {
		// 1. Render Universal Header & Footer
		await HeaderComponent.render("help");
		FooterComponent.render("app-footer");

		// 2. Cache DOM Elements
		this.#cacheDOM();

		// 3. Bind Accordion Toggles
		this.#bindAccordion();

		// 4. Bind Search & Filter Chips
		this.#bindSearch();
		this.#bindFilterChips();

		// 5. Bind Sticky Sidebar Nav & ScrollSpy
		this.#bindScrollSpy();

		// 6. Subscribe to Dynamic Language Switch
		this.#unsubscribeLang = appStateStore.subscribe("currentLang", () => {
			if (this.#dom.searchInput) {
				this.#dom.searchInput.placeholder = i18n.t("help.hero.searchPlaceholder");
			}
			if (this.#searchQuery) {
				this.#filterContent();
			}
		});
	}

	destroy() {
		if (this.#unsubscribeLang) {
			this.#unsubscribeLang();
			this.#unsubscribeLang = null;
		}
	}

	/**
	 * 📦 Cache all DOM references defensively
	 */
	#cacheDOM() {
		this.#dom = {
			searchInput: document.getElementById("helpSearchInput"),
			searchClear: document.getElementById("helpSearchClear"),
			searchStats: document.getElementById("helpSearchStats"),
			filterChips: document.querySelectorAll("#helpFilterChips .chip-btn"),
			sections: document.querySelectorAll(".help-section-group"),
			cards: document.querySelectorAll(".help-card-item"),
			sidebarLinks: document.querySelectorAll(".help-sidebar-nav .sidebar-nav-item"),
			emptyState: document.getElementById("helpEmptyState"),
			emptyStateDesc: document.getElementById("emptyStateDesc"),
			btnReset: document.getElementById("helpBtnReset")
		};
	}

	/**
	 * 📂 Accordion Toggle Handler (Click + Keyboard Accessibility)
	 */
	#bindAccordion() {
		this.#dom.cards.forEach((card) => {
			const summary = card.querySelector(".card-summary");
			if (!summary) return;

			const toggleDrawer = () => {
				const isCurrentlyCollapsed = card.classList.contains("collapsed");
				card.classList.toggle("collapsed");
				summary.setAttribute("aria-expanded", String(isCurrentlyCollapsed));
			};

			summary.addEventListener("click", toggleDrawer);
			summary.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					toggleDrawer();
				}
			});
		});
	}

	/**
	 * 🔍 Fast Typo-Tolerant Search Binding
	 */
	#bindSearch() {
		const { searchInput, searchClear, btnReset } = this.#dom;
		if (!searchInput) return;

		searchInput.addEventListener("input", (e) => {
			this.#searchQuery = e.target.value.trim();
			searchClear?.classList.toggle("hidden", this.#searchQuery.length === 0);
			this.#filterContent();
		});

		searchClear?.addEventListener("click", () => this.#resetSearch());
		btnReset?.addEventListener("click", () => this.#resetSearchAndFilters());
	}

	/**
	 * 🏷️ Filter Chips Binding (Category Narrowing)
	 */
	#bindFilterChips() {
		const { filterChips } = this.#dom;
		filterChips.forEach((chip) => {
			chip.addEventListener("click", () => {
				filterChips.forEach((btn) => btn.classList.remove("active"));
				chip.classList.add("active");

				this.#activeFilter = chip.getAttribute("data-filter") || "all";
				this.#filterContent();
			});
		});
	}

	/**
	 * ⚡ Core Unified Search & Filter Algorithm
	 */
	#filterContent() {
		const query = this.#searchQuery.toLowerCase();
		const hasQuery = query.length > 0;
		const queryWords = query.match(/[\w\u0900-\u097F]+/g) || [];

		let totalMatchedCards = 0;

		this.#dom.sections.forEach((section) => {
			const sectionCategory = section.getAttribute("data-category");
			const isCategoryMatch = (this.#activeFilter === "all" || this.#activeFilter === sectionCategory);

			if (!isCategoryMatch) {
				section.classList.add("hidden");
				return;
			}

			let sectionVisibleCards = 0;
			const cardsInSection = section.querySelectorAll(".help-card-item");

			cardsInSection.forEach((card) => {
				if (!hasQuery) {
					// No search query: display card according to filter
					card.classList.remove("hidden");
					sectionVisibleCards++;
					totalMatchedCards++;
					return;
				}

				// Search query present: check title, subtitle, bullets, and keywords
				const keywords = (card.getAttribute("data-keywords") || "").toLowerCase();
				const cardText = (card.textContent || "").toLowerCase();
				const combinedContent = `${keywords} ${cardText}`;

				let isMatch = false;

				// 1. Direct Substring Match
				if (combinedContent.includes(query)) {
					isMatch = true;
				} else {
					// 2. Smart Typo Match via BaseSearchEngine
					const cardWords = combinedContent.split(/[\s,.-]+/).filter(Boolean);
					for (const qWord of queryWords) {
						if (this.hasTypoMatch(qWord, keywords, cardWords)) {
							isMatch = true;
							break;
						}
					}
				}

				if (isMatch) {
					card.classList.remove("hidden");
					card.classList.remove("collapsed");
					const summary = card.querySelector(".card-summary");
					if (summary) summary.setAttribute("aria-expanded", "true");

					sectionVisibleCards++;
					totalMatchedCards++;
				} else {
					card.classList.add("hidden");
				}
			});

			if (sectionVisibleCards > 0) {
				section.classList.remove("hidden");
			} else {
				section.classList.add("hidden");
			}
		});

		this.#updateSearchStats(hasQuery, totalMatchedCards, query);
	}

	/**
	 * 📊 Update Search Counter & Empty State
	 */
	#updateSearchStats(hasQuery, count, query) {
		const { searchStats, emptyState, emptyStateDesc } = this.#dom;

		if (hasQuery) {
			if (count === 0) {
				emptyState?.classList.remove("hidden");
				searchStats?.classList.add("hidden");
				if (emptyStateDesc) {
					const sanitizedQuery = this.escapeHTML(query);
					emptyStateDesc.textContent = i18n.t("help.emptyState.desc", { query: sanitizedQuery });
				}
			} else {
				emptyState?.classList.add("hidden");
				searchStats?.classList.remove("hidden");
				if (searchStats) {
					searchStats.textContent = i18n.t("help.hero.searchStats", { count });
				}
			}
		} else {
			emptyState?.classList.add("hidden");
			searchStats?.classList.add("hidden");
		}
	}

	/**
	 * 🔄 Reset search box only
	 */
	#resetSearch() {
		const { searchInput, searchClear } = this.#dom;
		if (searchInput) {
			searchInput.value = "";
			searchInput.focus();
		}
		this.#searchQuery = "";
		searchClear?.classList.add("hidden");
		this.#filterContent();
	}

	/**
	 * 🔄 Reset both search and category chips to default
	 */
	#resetSearchAndFilters() {
		this.#activeFilter = "all";
		this.#dom.filterChips.forEach((btn) => {
			btn.classList.toggle("active", btn.getAttribute("data-filter") === "all");
		});
		this.#resetSearch();
	}

	/**
	 * 🧭 Sticky Sidebar Smooth Scroll & ScrollSpy
	 */
	#bindScrollSpy() {
		const { sidebarLinks } = this.#dom;
		if (!sidebarLinks) return;
		sidebarLinks.forEach((link) => {
			link.addEventListener("click", (e) => {
				e.preventDefault();
				const targetId = link.getAttribute("data-target") || link.hash?.replace("#", "");
				const targetSection = document.getElementById(targetId);
				if (targetSection) {
					sidebarLinks.forEach((l) => l.classList.toggle("active", l === link));
					targetSection.scrollIntoView({ behavior: "smooth", block: "start" });
				}
			});
		});
	}
}

// Instantiate on DOM Load
document.addEventListener("DOMContentLoaded", () => {
	const controller = new HelpController();
	controller.init();
});