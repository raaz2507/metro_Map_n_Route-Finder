import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";
import { Toast } from "../components/Toast.js";
import { centerClass } from "../core/CenterClass.js";
import { appStateStore } from "../core/app-state-store.js";
import { TransitFareMatrixView } from "../components/TransitFareMatrixView.js";


class SmartCardPageController {
	static #STORAGE_KEY_CARD = "metro_recharge_card_id";
	static #STORAGE_KEY_AMOUNT = "metro_recharge_amount";

	// Recharge elements
	#cardInput = null;
	#amountInput = null;
	#submitBtn = null;
	#chipBtns = [];

	// Modular Fare Matrix & Passes Component
	#fareMatrixView = null;
	#activeCity = "delhi_ncr";
	#activeNetwork = null;
	#activeLang = "en";
	#metroData = null;
	#unsubscribeLang = null;

	static async init() {
		try {
			// 1. Render Common Header & Footer
			FooterComponent.render();
			await HeaderComponent.render('recharge');

			// 2. Initialize Controller
			const page = new SmartCardPageController();
			await page.#initAsync();
		} catch (err) {
			console.error("[SmartCardPage] Init error:", err);
		}
	}

	async #initAsync() {
		this.#bindElements();
		this.#loadSavedData();
		this.#bindEvents();

		// Initialize modular component
		this.#fareMatrixView = new TransitFareMatrixView({
			fareSelector: "#fare-matrix-section",
			passesSelector: "#passes-guidelines-section"
		});

		// Resolve City & Network
		const urlParams = new URLSearchParams(window.location.search);
		this.#activeCity = urlParams.get('city') || localStorage.getItem('active_city') || 'delhi_ncr';
		this.#activeNetwork = urlParams.get('network') || urlParams.get('net') || localStorage.getItem('active_network') || null;
		this.#activeLang = appStateStore.getState("currentLang") || "en";

		// Load Transit Data via Facade (CenterClass)
		try {
			this.#metroData = await centerClass.loadCity(this.#activeCity);
			await centerClass.reloadLocale(this.#activeLang);
			this.#fareMatrixView.render({
				metroData: this.#metroData,
				cityKey: this.#activeCity,
				networkKey: this.#activeNetwork,
				lang: this.#activeLang
			});
		} catch (e) {
			console.warn("[SmartCardPage] Failed to load transit data:", e);
		}

		// Subscribe to language changes
		this.#unsubscribeLang = appStateStore.subscribe("currentLang", async (newLang) => {
			this.#activeLang = newLang || "en";
			await centerClass.reloadLocale(this.#activeLang);
			this.#fareMatrixView?.render({
				metroData: this.#metroData,
				cityKey: this.#activeCity,
				networkKey: this.#activeNetwork,
				lang: this.#activeLang
			});
		});
	}

	#bindElements() {
		this.#cardInput = document.getElementById("rechargeCardId");
		this.#amountInput = document.getElementById("rechargeAmount");
		this.#submitBtn = document.getElementById("rechargeSubmitBtn");
		this.#chipBtns = Array.from(document.querySelectorAll(".recharge-chip-btn"));

		// Preserve city param on QR ticket link if active
		const qrBtn = document.getElementById("qrTicketNavBtn");
		if (qrBtn) {
			const urlParams = new URLSearchParams(window.location.search);
			const currentCity = urlParams.get('city') || localStorage.getItem('active_city') || '';
			if (currentCity) {
				qrBtn.href = `metro_QR_ticket.html?city=${encodeURIComponent(currentCity)}`;
			}
		}
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
			Toast.show(centerClass.t("smartCardTicket.toastInvalid"), "error");
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

		const portalUrl = this.#getRechargePortalUrl();
		if (portalUrl) {
			const successMsg = centerClass.t("smartCardTicket.toastSuccess", { cardId: sanitizedCardId });
			Toast.show(successMsg, "success");
			setTimeout(() => {
				window.open(portalUrl, "_blank", "noopener,noreferrer");
			}, 800);
		} else {
			const successMsg = centerClass.t("smartCardTicket.toastCopiedOnly", { cardId: sanitizedCardId });
			Toast.show(successMsg, "success");
		}
	}

	#getRechargePortalUrl() {
		const policies = this.#metroData?.fareRules?.policies || {};
		const activeKey = this.#fareMatrixView?.activePolicyKey;

		// 1. Check actively viewed policy tab first (e.g. DMRC smart card)
		if (activeKey && policies[activeKey]?.products?.smart_card?.rechargeUrl) {
			return policies[activeKey].products.smart_card.rechargeUrl;
		}
		if (activeKey && policies[activeKey]?.rechargeUrl) {
			return policies[activeKey].rechargeUrl;
		}

		// 2. Direct from any matching policy smart_card product
		for (const policy of Object.values(policies)) {
			const scUrl = policy.products?.smart_card?.rechargeUrl || policy.rechargeUrl;
			if (scUrl) return scUrl;
		}

		return null;
	}
}

const runInit = () => SmartCardPageController.init();

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", runInit);
} else {
	runInit();
}