import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { Toast } from "../components/Toast.js";
import i18n from "../core/i18n.js";

class SmartCardPageController {
	static #STORAGE_KEY_CARD = "metro_recharge_card_id";
	static #STORAGE_KEY_AMOUNT = "metro_recharge_amount";

	#cardInput = null;
	#amountInput = null;
	#submitBtn = null;
	#chipBtns = [];

	static async init() {
		try {
			// 1. Render Common Header & Footer
			FooterComponent.render();
			await HeaderComponent.render('recharge');

			// 2. Centrally Initialize Global i18n & Translate Page
			await i18n.initI18n();

			// 3. Initialize Controller
			const page = new SmartCardPageController();
			page.#bindElements();
			page.#loadSavedData();
			page.#bindEvents();
		} catch (err) {
			console.error("[SmartCardPage] Init error:", err);
		}
	}

	#bindElements() {
		this.#cardInput = document.getElementById("rechargeCardId");
		this.#amountInput = document.getElementById("rechargeAmount");
		this.#submitBtn = document.getElementById("rechargeSubmitBtn");
		this.#chipBtns = Array.from(document.querySelectorAll(".recharge-chip-btn"));
	}

	#loadSavedData() {
		const savedCard = localStorage.getItem(SmartCardPageController.#STORAGE_KEY_CARD);
		const savedAmount = localStorage.getItem(SmartCardPageController.#STORAGE_KEY_AMOUNT);

		if (savedCard && this.#cardInput) this.#cardInput.value = savedCard;
		if (savedAmount && this.#amountInput) {
			this.#amountInput.value = savedAmount;
			this.#syncChipActive(savedAmount);
		}
	}

	#bindEvents() {
		// Amount chips click
		this.#chipBtns.forEach(btn => {
			btn.addEventListener("click", () => {
				const val = btn.getAttribute("data-val");
				if (this.#amountInput) {
					this.#amountInput.value = val;
					this.#syncChipActive(val);
					localStorage.setItem(SmartCardPageController.#STORAGE_KEY_AMOUNT, val);
				}
			});
		});

		// Manual amount input sync
		if (this.#amountInput) {
			this.#amountInput.addEventListener("input", (e) => {
				const val = e.target.value.trim();
				this.#syncChipActive(val);
				if (val) localStorage.setItem(SmartCardPageController.#STORAGE_KEY_AMOUNT, val);
			});
		}

		// Submit button
		if (this.#submitBtn) {
			this.#submitBtn.addEventListener("click", () => this.#handleRechargeSubmit());
		}
	}

	#syncChipActive(value) {
		this.#chipBtns.forEach(btn => {
			btn.classList.toggle("active", btn.getAttribute("data-val") === String(value));
		});
	}

	async #handleRechargeSubmit() {
		const rawCardId = this.#cardInput ? this.#cardInput.value.trim() : "";
		const sanitizedCardId = rawCardId.replace(/[^0-9]/g, "");

		if (!sanitizedCardId || sanitizedCardId.length < 8 || sanitizedCardId.length > 11) {
			const invalidMsg = i18n.t("smartCardTicket.toastInvalid") || "Please enter a valid 8 to 11 digit Metro Card ID.";
			Toast.show(invalidMsg, "error");
			if (this.#cardInput) this.#cardInput.focus();
			return;
		}

		localStorage.setItem(SmartCardPageController.#STORAGE_KEY_CARD, sanitizedCardId);

		// Copy Card ID to clipboard
		try {
			if (navigator.clipboard && navigator.clipboard.writeText) {
				await navigator.clipboard.writeText(sanitizedCardId);
			}
		} catch (_) {
			// Clipboard write fallback
		}

		let successMsg = i18n.t("smartCardTicket.toastSuccess") || "Card ID {cardId} copied! Opening DMRC Portal...";
		successMsg = successMsg.replace("{cardId}", sanitizedCardId);
		Toast.show(successMsg, "success");

		// Open DMRC Portal in new tab
		setTimeout(() => {
			window.open("https://dmrcsmartcard.com/", "_blank", "noopener,noreferrer");
		}, 800);
	}
}

const runInit = () => SmartCardPageController.init();

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", runInit);
} else {
	runInit();
}