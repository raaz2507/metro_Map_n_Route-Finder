/**
 * ℹ️ AboutController - Enterprise ES2022 OOP Page Controller
 * Mounts Universal Header/Footer and manages interactive state for About Showcase.
 */
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";

class AboutController {
	// Private DOM handles
	#dom = {};
	#toastTimer = null;

	/**
	 * 🚀 Initialize Universal Layout & About Interactions
	 */
	async init() {
		// 1. Render Universal Header & Footer (Active Page: 'about')
		await HeaderComponent.render("about");
		FooterComponent.render("app-footer");

		// 2. Cache DOM Elements
		this.#cacheDOM();

		// 3. Bind Subtle Interactive Hover & Accessibility
		this.#bindInteractions();

		// 4. Bind Interactive Feedback Modal
		this.#bindFeedbackModal();
	}

	/**
	 * 📦 Cache DOM references defensively
	 */
	#cacheDOM() {
		this.#dom = {
			metricBoxes: document.querySelectorAll(".metric-box"),
			bentoCards: document.querySelectorAll(".bento-card"),
			communityBtns: document.querySelectorAll(".community-btn"),
			feedbackModal: document.getElementById("aboutFeedbackModal"),
			closeFeedbackModal: document.getElementById("closeFeedbackModal"),
			feedbackForm: document.getElementById("aboutFeedbackForm"),
			feedbackCategory: document.getElementById("feedbackCategory"),
			feedbackCity: document.getElementById("feedbackCity"),
			feedbackDetails: document.getElementById("feedbackDetails"),
			feedbackEmail: document.getElementById("feedbackEmail"),
			copyFeedbackBtn: document.getElementById("copyFeedbackBtn"),
			submitFeedbackEmailBtn: document.getElementById("submitFeedbackEmailBtn"),
			aboutToast: document.getElementById("aboutToast"),
			openFeedbackBtns: document.querySelectorAll(".open-feedback-btn, .feedback-tile")
		};
	}

	/**
	 * 🎯 Bind Micro-Interactions & Keyboard Accessibility
	 */
	#bindInteractions() {
		// Smooth subtle tilt effect on hover for Bento Cards
		this.#dom.bentoCards.forEach((card) => {
			card.setAttribute("tabindex", "0");
		});

		// Accessible button feedback
		this.#dom.communityBtns.forEach((btn) => {
			btn.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					btn.click();
				}
			});
		});
	}

	/**
	 * 📬 Bind Interactive In-App Feedback & Suggestion Modal
	 */
	#bindFeedbackModal() {
		const {
			feedbackModal,
			closeFeedbackModal,
			feedbackForm,
			feedbackCategory,
			feedbackCity,
			feedbackDetails,
			copyFeedbackBtn,
			openFeedbackBtns
		} = this.#dom;

		if (!feedbackModal) return;

		// 1. Open modal from triggers
		openFeedbackBtns.forEach((btn) => {
			btn.addEventListener("click", (e) => {
				// Prevent double trigger if clicking directly on inner button
				if (btn.classList.contains("feedback-tile") && e.target.closest(".open-feedback-btn")) {
					return;
				}
				const category = btn.dataset.category || btn.closest("[data-category]")?.dataset.category || "route_issue";
				if (feedbackCategory) {
					feedbackCategory.value = category;
				}
				this.#openModal();
			});

			// Keyboard Enter / Space support
			btn.addEventListener("keydown", (e) => {
				if (e.key === "Enter" || e.key === " ") {
					e.preventDefault();
					const category = btn.dataset.category || btn.closest("[data-category]")?.dataset.category || "route_issue";
					if (feedbackCategory) {
						feedbackCategory.value = category;
					}
					this.#openModal();
				}
			});
		});

		// 2. Close modal listeners
		closeFeedbackModal?.addEventListener("click", () => this.#closeModal());

		feedbackModal.addEventListener("click", (e) => {
			if (e.target === feedbackModal) {
				this.#closeModal();
			}
		});

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && feedbackModal.classList.contains("active")) {
				this.#closeModal();
			}
		});

		// 3. Copy formatted report to clipboard
		copyFeedbackBtn?.addEventListener("click", () => {
			const details = feedbackDetails?.value?.trim();
			if (!details) {
				this.#showToast(this.#getI18nText("about.feedbackModal.requireDetails", "Please provide description details first."));
				feedbackDetails?.focus();
				return;
			}

			const reportText = this.#generateReportText();
			this.#copyToClipboard(reportText);
			this.#showToast(this.#getI18nText("about.feedbackModal.copiedToast", "Report copied to clipboard!"));
		});

		// 4. Form Submit via Email Client
		feedbackForm?.addEventListener("submit", (e) => {
			e.preventDefault();
			const details = feedbackDetails?.value?.trim();
			if (!details) {
				this.#showToast(this.#getI18nText("about.feedbackModal.requireDetails", "Please provide description details first."));
				feedbackDetails?.focus();
				return;
			}

			const reportText = this.#generateReportText();
			const categoryText = feedbackCategory?.options[feedbackCategory?.selectedIndex]?.text || "Transit Report";
			const city = feedbackCity?.value?.trim() || "General";
			const subject = `[YatraMarg Feedback] ${categoryText} - ${city}`;

			const mailtoUrl = `mailto:raaz2507@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(reportText)}`;

			this.#showToast(this.#getI18nText("about.feedbackModal.sendingToast", "Opening your email client..."));
			window.location.href = mailtoUrl;

			setTimeout(() => {
				this.#closeModal();
			}, 1200);
		});
	}

	#openModal() {
		const { feedbackModal, feedbackDetails } = this.#dom;
		if (!feedbackModal) return;
		feedbackModal.classList.add("active");
		feedbackModal.setAttribute("aria-hidden", "false");
		document.body.style.overflow = "hidden";
		setTimeout(() => feedbackDetails?.focus(), 120);
	}

	#closeModal() {
		const { feedbackModal } = this.#dom;
		if (!feedbackModal) return;
		feedbackModal.classList.remove("active");
		feedbackModal.setAttribute("aria-hidden", "true");
		document.body.style.overflow = "";
	}

	#generateReportText() {
		const { feedbackCategory, feedbackCity, feedbackDetails, feedbackEmail } = this.#dom;
		const category = feedbackCategory?.options[feedbackCategory?.selectedIndex]?.text || "General";
		const network = feedbackCity?.value?.trim() || "Not specified";
		const details = feedbackDetails?.value?.trim() || "";
		const contact = feedbackEmail?.value?.trim() || "Anonymous commuter";

		return [
			"==================================",
			" YATRAMARG USER FEEDBACK & REPORT",
			"==================================",
			`Category: ${category}`,
			`Transit Network / City: ${network}`,
			`User Contact: ${contact}`,
			`Platform: YatraMarg Web v2.4.0`,
			`Timestamp: ${new Date().toLocaleString()}`,
			"----------------------------------",
			"DETAILS & DESCRIPTION:",
			details,
			"=================================="
		].join("\n");
	}

	async #copyToClipboard(text) {
		if (navigator.clipboard?.writeText) {
			try {
				await navigator.clipboard.writeText(text);
				return;
			} catch (e) {
				// Fallback below
			}
		}
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		try {
			document.execCommand("copy");
		} finally {
			document.body.removeChild(textarea);
		}
	}

	#showToast(msg) {
		const toast = this.#dom.aboutToast;
		if (!toast) return;
		toast.textContent = msg;
		toast.classList.add("active");
		if (this.#toastTimer) clearTimeout(this.#toastTimer);
		this.#toastTimer = setTimeout(() => {
			toast.classList.remove("active");
		}, 3200);
	}

	#getI18nText(key, fallback) {
		const currentLang = localStorage.getItem("language") || "en";
		if (currentLang === "hi") {
			if (key.includes("copiedToast")) return "रिपोर्ट क्लिपबोर्ड पर कॉपी हो गई!";
			if (key.includes("sendingToast")) return "ईमेल क्लाइंट खोला जा रहा है...";
			if (key.includes("requireDetails")) return "कृपया पहले विवरण दर्ज करें।";
		}
		return fallback;
	}
}

// Instantiate on DOM Load
document.addEventListener("DOMContentLoaded", () => {
	const controller = new AboutController();
	controller.init();
});