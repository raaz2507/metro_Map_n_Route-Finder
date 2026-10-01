/**
 * ℹ️ AboutController - Enterprise ES2022 OOP Page Controller
 * Mounts Universal Header/Footer and manages interactive state for About Showcase.
 */
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";

class AboutController {
	// Private DOM handles
	#dom = {};
	#toastTimer = null;
	#unsubscribeLang = null;

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

		// 5. Subscribe to Dynamic Language Switch
		this.#unsubscribeLang = appStateStore.subscribe("currentLang", () => {
			// i18n automatic single-pass DOM applies on language toggle
		});
	}

	destroy() {
		if (this.#unsubscribeLang) {
			this.#unsubscribeLang();
			this.#unsubscribeLang = null;
		}
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
		this.#dom.bentoCards.forEach((card) => {
			card.setAttribute("tabindex", "0");
		});

		this.#dom.metricBoxes.forEach((box) => {
			box.addEventListener("mouseenter", () => {
				box.style.transform = "translateY(-4px)";
			});
			box.addEventListener("mouseleave", () => {
				box.style.transform = "translateY(0)";
			});
		});
	}

	/**
	 * 💬 Bind Feedback Modal, Copy & Mailto Triggers
	 */
	#bindFeedbackModal() {
		const {
			openFeedbackBtns,
			closeFeedbackModal,
			feedbackModal,
			copyFeedbackBtn,
			submitFeedbackEmailBtn,
			feedbackDetails
		} = this.#dom;

		openFeedbackBtns.forEach((btn) => {
			btn.addEventListener("click", (e) => {
				e.preventDefault();
				this.#openModal();
			});
		});

		closeFeedbackModal?.addEventListener("click", () => this.#closeModal());

		feedbackModal?.addEventListener("click", (e) => {
			if (e.target === feedbackModal) {
				this.#closeModal();
			}
		});

		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && feedbackModal?.classList.contains("active")) {
				this.#closeModal();
			}
		});

		copyFeedbackBtn?.addEventListener("click", async () => {
			const details = feedbackDetails?.value?.trim();
			if (!details) {
				this.#showToast(i18n.t("about.feedbackModal.requireDetails"));
				feedbackDetails?.focus();
				return;
			}

			const reportPayload = this.#generateReportText();
			await this.#copyToClipboard(reportPayload);
			this.#showToast(i18n.t("about.feedbackModal.copiedToast"));
		});

		submitFeedbackEmailBtn?.addEventListener("click", (e) => {
			e.preventDefault();
			const details = feedbackDetails?.value?.trim();
			if (!details) {
				this.#showToast(i18n.t("about.feedbackModal.requireDetails"));
				feedbackDetails?.focus();
				return;
			}

			const category = this.#dom.feedbackCategory?.value || "Feedback";
			const subject = encodeURIComponent(`[YatraMarg Transit Report] - ${category}`);
			const body = encodeURIComponent(this.#generateReportText());
			const mailtoUrl = `mailto:support@yatramarg.in?subject=${subject}&body=${body}`;

			this.#showToast(i18n.t("about.feedbackModal.sendingToast"));
			setTimeout(() => {
				window.location.href = mailtoUrl;
			}, 400);
		});
	}

	#openModal() {
		const { feedbackModal, feedbackDetails } = this.#dom;
		if (!feedbackModal) return;
		feedbackModal.classList.add("active");
		feedbackModal.setAttribute("aria-hidden", "false");
		document.body.classList.add("lock-scroll");
		setTimeout(() => feedbackDetails?.focus(), 150);
	}

	#closeModal() {
		const { feedbackModal } = this.#dom;
		if (!feedbackModal) return;
		feedbackModal.classList.remove("active");
		feedbackModal.setAttribute("aria-hidden", "true");
		document.body.classList.remove("lock-scroll");
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
}

// Instantiate on DOM Load
document.addEventListener("DOMContentLoaded", () => {
	const controller = new AboutController();
	controller.init();
});