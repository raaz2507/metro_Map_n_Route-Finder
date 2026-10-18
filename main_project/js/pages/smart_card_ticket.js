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
	#cardTopupCard = null;
	#smartcardSubtitle = null;
	#smartcardInfoTip = null;
	#smartcardInfoTipIcon = null;
	#smartcardInfoTipText = null;
	#cardInput = null;
	#amountInput = null;
	#submitBtn = null;
	#submitBtnIcon = null;
	#submitBtnText = null;
	#chipBtns = [];

	// QR Ticket Action Elements
	#qrActionsContainer = null;
	#qrCardSubtitle = null;

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
			passesSelector: "#passes-guidelines-section",
			onPolicyChange: () => this.#updateSmartCardAvailability()
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
			this.#renderQrActions();
			this.#fareMatrixView.render({
				metroData: this.#metroData,
				cityKey: this.#activeCity,
				networkKey: this.#activeNetwork,
				lang: this.#activeLang
			});
			this.#updateSmartCardAvailability();
		} catch (e) {
			console.warn("[SmartCardPage] Failed to load transit data:", e);
		}

		// Subscribe to language changes
		this.#unsubscribeLang = appStateStore.subscribe("currentLang", async (newLang) => {
			this.#activeLang = newLang || "en";
			await centerClass.reloadLocale(this.#activeLang);
			this.#renderQrActions();
			this.#fareMatrixView?.render({
				metroData: this.#metroData,
				cityKey: this.#activeCity,
				networkKey: this.#activeNetwork,
				lang: this.#activeLang
			});
			this.#updateSmartCardAvailability();
		});
	}

	#bindElements() {
		this.#cardTopupCard = document.getElementById("card-smartcard-topup");
		this.#smartcardSubtitle = document.getElementById("smartcardSubtitle");
		this.#smartcardInfoTip = document.getElementById("smartcardInfoTip");
		this.#smartcardInfoTipIcon = document.getElementById("smartcardInfoTipIcon");
		this.#smartcardInfoTipText = document.getElementById("smartcardInfoTipText");
		this.#cardInput = document.getElementById("rechargeCardId");
		this.#amountInput = document.getElementById("rechargeAmount");
		this.#submitBtn = document.getElementById("rechargeSubmitBtn");
		this.#submitBtnIcon = document.getElementById("rechargeSubmitIcon");
		this.#submitBtnText = document.getElementById("rechargeSubmitText");
		this.#chipBtns = Array.from(document.querySelectorAll(".recharge-chip-btn"));
		this.#qrActionsContainer = document.getElementById("qr-actions-list");
		this.#qrCardSubtitle = document.getElementById("qr-card-subtitle");
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
		const portalUrl = this.#getRechargePortalUrl();
		if (!portalUrl) {
			Toast.show(centerClass.t("smartCardTicket.toastNoPortal"), "warning");
			return;
		}

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

		const successMsg = centerClass.t("smartCardTicket.toastSuccess", { cardId: sanitizedCardId });
		Toast.show(successMsg, "success");
		setTimeout(() => {
			window.open(portalUrl, "_blank", "noopener,noreferrer");
		}, 800);
	}

	#getRechargePortalUrl() {
		const policies = this.#metroData?.fareRules?.policies || {};
		const activeKey = this.#fareMatrixView?.activePolicyKey;
		const isValidUrl = (url) => typeof url === "string" && url.trim().length > 0;

		// 1. Check actively viewed policy tab first (e.g. DMRC smart card)
		if (activeKey && isValidUrl(policies[activeKey]?.products?.smart_card?.rechargeUrl)) {
			return policies[activeKey].products.smart_card.rechargeUrl.trim();
		}
		if (activeKey && isValidUrl(policies[activeKey]?.rechargeUrl)) {
			return policies[activeKey].rechargeUrl.trim();
		}

		// 2. Direct from any matching policy smart_card product
		for (const policy of Object.values(policies)) {
			const scUrl = policy.products?.smart_card?.rechargeUrl || policy.rechargeUrl;
			if (isValidUrl(scUrl)) return scUrl.trim();
		}

		return null;
	}

	#updateSmartCardAvailability() {
		const portalUrl = this.#getRechargePortalUrl();
		const isAvailable = Boolean(portalUrl && portalUrl.trim().length > 0);

		if (this.#cardTopupCard) {
			this.#cardTopupCard.classList.toggle("state-counter-only", !isAvailable);
		}

		if (this.#cardInput) {
			this.#cardInput.disabled = !isAvailable;
		}

		if (this.#amountInput) {
			this.#amountInput.disabled = !isAvailable;
		}

		this.#chipBtns.forEach(btn => {
			btn.disabled = !isAvailable;
		});

		if (this.#submitBtn) {
			this.#submitBtn.disabled = !isAvailable;
			this.#submitBtn.setAttribute("aria-disabled", String(!isAvailable));
		}

		if (this.#smartcardSubtitle) {
			const subKey = isAvailable ? "smartCardTicket.smartcardSubtitle" : "smartCardTicket.subtitleUnavailable";
			this.#smartcardSubtitle.setAttribute("data-i18n", subKey);
			this.#smartcardSubtitle.textContent = centerClass.t(subKey);
		}

		if (this.#smartcardInfoTipText) {
			const tipKey = isAvailable ? "smartCardTicket.infoTip" : "smartCardTicket.unavailableTip";
			this.#smartcardInfoTipText.setAttribute("data-i18n", tipKey);
			this.#smartcardInfoTipText.textContent = centerClass.t(tipKey);
		}

		if (this.#smartcardInfoTipIcon) {
			this.#smartcardInfoTipIcon.textContent = isAvailable ? "⚡" : "ℹ️";
		}

		if (this.#submitBtnText) {
			const btnKey = isAvailable ? "smartCardTicket.submitBtn" : "smartCardTicket.btnUnavailable";
			this.#submitBtnText.setAttribute("data-i18n", btnKey);
			this.#submitBtnText.textContent = centerClass.t(btnKey);
		}

		if (this.#submitBtnIcon) {
			this.#submitBtnIcon.textContent = isAvailable ? "⚡" : "🏢";
		}
	}

	#renderQrActions() {
		if (!this.#qrActionsContainer) return;

		const policies = this.#metroData?.fareRules?.policies || {};
		const policyKeys = Object.keys(policies);
		const seenNetworks = new Set();
		const qrNetworks = [];

		policyKeys.forEach(pKey => {
			const pObj = policies[pKey];
			if (!pObj) return;

			// Group companion or auxiliary policies by network
			const netKey = pObj.network || pKey;
			if (seenNetworks.has(netKey)) return;

			// Find QR product in this policy
			let qrProduct = null;
			if (pObj.products) {
				qrProduct = pObj.products.qr_ticket || 
				            pObj.products.standard_qr || 
				            pObj.products.premium_qr || 
				            Object.values(pObj.products).find(p => p.type === "digital");
			}

			if (!qrProduct) return;

			const hasBookingChannel = Boolean(
				(qrProduct.whatsappUrl && qrProduct.whatsappUrl.trim()) ||
				(qrProduct.bookingUrl && qrProduct.bookingUrl.trim()) ||
				(qrProduct.appUrl && qrProduct.appUrl.trim())
			);

			if (hasBookingChannel) {
				seenNetworks.add(netKey);
				qrNetworks.push({
					policyKey: pKey,
					networkKey: netKey,
					policyObj: pObj,
					qr: qrProduct
				});
			}
		});

		if (this.#qrCardSubtitle) {
			const cityDisplayName = centerClass.getCityDisplayName(this.#activeCity);
			const count = qrNetworks.length;
			this.#qrCardSubtitle.textContent = count > 1 
				? `${cityDisplayName} (${count} Networks)` 
				: cityDisplayName;
		}

		// Sync Gate Pass Wallet card link with active city
		const walletBtn = document.getElementById("walletGatePassBtn");
		if (walletBtn) {
			walletBtn.href = `metro_QR_ticket.html?city=${encodeURIComponent(this.#activeCity)}`;
		}

		if (qrNetworks.length === 0) {
			const noQrLabel = centerClass.t("smartCardTicket.noQrTickets") || "No online booking channels available for this city.";
			this.#qrActionsContainer.innerHTML = `
				<div class="network-item-row">
					<span class="network-name">${this.#escapeHTML(noQrLabel)}</span>
				</div>
			`;
			return;
		}

		const waLabel = centerClass.t("smartCardTicket.btnWhatsApp") || "WhatsApp";
		const webLabel = centerClass.t("smartCardTicket.btnWeb") || "Online";
		const appLabel = centerClass.t("smartCardTicket.btnApp") || "App";

		let html = "";
		qrNetworks.forEach(item => {
			const netDisplayName = centerClass.getPolicyName(item.policyKey) || 
			                       centerClass.getNetworkName(item.networkKey) || 
			                       this.#formatNetworkName(item.networkKey);
			const qr = item.qr;

			let btnHtml = "";
			if (qr.whatsappUrl && qr.whatsappUrl.trim()) {
				btnHtml += `
					<a href="${this.#escapeHTML(qr.whatsappUrl.trim())}" target="_blank" rel="noopener noreferrer" class="btn-micro-action btn-action-whatsapp" title="WhatsApp Booking">
						<span>💬</span>
						<span>${this.#escapeHTML(waLabel)}</span>
					</a>
				`;
			}
			if (qr.bookingUrl && qr.bookingUrl.trim()) {
				btnHtml += `
					<a href="${this.#escapeHTML(qr.bookingUrl.trim())}" target="_blank" rel="noopener noreferrer" class="btn-micro-action btn-action-web" title="Official Web Booking">
						<span>🌐</span>
						<span>${this.#escapeHTML(webLabel)}</span>
					</a>
				`;
			}
			if (qr.appUrl && qr.appUrl.trim()) {
				btnHtml += `
					<a href="${this.#escapeHTML(qr.appUrl.trim())}" target="_blank" rel="noopener noreferrer" class="btn-micro-action btn-action-app" title="Official Mobile App">
						<span>📱</span>
						<span>${this.#escapeHTML(appLabel)}</span>
					</a>
				`;
			}

			html += `
				<div class="network-item-row">
					<span class="network-name">${this.#escapeHTML(netDisplayName)}</span>
					<div class="network-btn-group">
						${btnHtml}
					</div>
				</div>
			`;
		});

		this.#qrActionsContainer.innerHTML = html;
	}

	#formatNetworkName(key) {
		if (!key) return "Metro";
		return key
			.replace(/[_-]/g, " ")
			.replace(/\b\w/g, l => l.toUpperCase());
	}

	#escapeHTML(str) {
		if (!str) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
}

const runInit = () => SmartCardPageController.init();

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", runInit);
} else {
	runInit();
}