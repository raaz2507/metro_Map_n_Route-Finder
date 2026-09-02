/**
 * RechargeModalComponent
 * Handles One-Click Card ID & Amount Copying, LocalStorage Persistence,
 * Auto-Toast Notification, and Direct DMRC Portal Redirection.
 */
export class RechargeModalComponent {
    static #instance = null;
    #modal = null;
    #cardInput = null;
    #amountInput = null;
    #submitBtn = null;
    #closeBtn = null;
    #toast = null;
    #chipBtns = [];

    static #STORAGE_KEY_CARD = "metro_recharge_card_id";
    static #STORAGE_KEY_AMOUNT = "metro_recharge_amount";
    static #DMRC_URL = "https://www.dmrcsmartcard.com/";

    constructor() {
        if (RechargeModalComponent.#instance) {
            return RechargeModalComponent.#instance;
        }
        this.#injectMarkup();
        this.#bindDOM();
        this.#bindEvents();
        this.#loadSavedData();
        RechargeModalComponent.#instance = this;
    }

    static getInstance() {
        if (!RechargeModalComponent.#instance) {
            RechargeModalComponent.#instance = new RechargeModalComponent();
        }
        return RechargeModalComponent.#instance;
    }

    open() {
        this.#loadSavedData();
        if (this.#modal) {
            this.#modal.classList.add("active");
            this.#modal.setAttribute("aria-hidden", "false");
            setTimeout(() => {
                if (this.#cardInput && !this.#cardInput.value) {
                    this.#cardInput.focus();
                } else if (this.#amountInput) {
                    this.#amountInput.focus();
                }
            }, 100);
        }
    }

    close() {
        if (this.#modal) {
            this.#modal.classList.remove("active");
            this.#modal.setAttribute("aria-hidden", "true");
        }
    }

    #injectMarkup() {
        if (document.getElementById("rechargeModalOverlay")) return;

        const markup = `
            <div id="rechargeModalOverlay" class="recharge-modal-overlay" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="rechargeModalTitle">
                <div class="recharge-modal-card">
                    <header class="recharge-modal-header">
                        <h2 id="rechargeModalTitle">💳 Smart Card Quick Top-Up</h2>
                        <button type="button" class="recharge-modal-close" id="rechargeModalCloseBtn" aria-label="Close modal">&times;</button>
                    </header>
                    <div class="recharge-modal-body">
                        <div class="recharge-info-banner">
                            ℹ️ <strong>Direct Recharge Helper:</strong> Card ID copy ho jayegi aur 1 click me DMRC ka official quick top-up portal open ho jayega.
                        </div>
                        <div class="recharge-form-group">
                            <label for="rechargeCardId">Smart Card ID (Engraved No.)</label>
                            <input type="text" id="rechargeCardId" class="recharge-input" placeholder="e.g. 12345678" maxlength="11" autocomplete="off" />
                        </div>
                        <div class="recharge-form-group">
                            <label for="rechargeAmount">Recharge Amount (₹)</label>
                            <input type="number" id="rechargeAmount" class="recharge-input" placeholder="Amount (min ₹100)" min="100" max="2000" step="50" />
                            <div class="recharge-amount-chips">
                                <button type="button" class="recharge-chip-btn" data-val="100">₹100</button>
                                <button type="button" class="recharge-chip-btn" data-val="200">₹200</button>
                                <button type="button" class="recharge-chip-btn" data-val="500">₹500</button>
                            </div>
                        </div>
                    </div>
                    <footer class="recharge-modal-footer">
                        <button type="button" id="rechargeSubmitBtn" class="recharge-submit-btn">
                            🚀 Copy Card ID & Open DMRC Portal
                        </button>
                    </footer>
                </div>
            </div>
            <div id="rechargeToast" class="recharge-toast" role="status" aria-live="polite"></div>
        `;
        document.body.insertAdjacentHTML("beforeend", markup);
    }

    #bindDOM() {
        this.#modal = document.getElementById("rechargeModalOverlay");
        this.#cardInput = document.getElementById("rechargeCardId");
        this.#amountInput = document.getElementById("rechargeAmount");
        this.#submitBtn = document.getElementById("rechargeSubmitBtn");
        this.#closeBtn = document.getElementById("rechargeModalCloseBtn");
        this.#toast = document.getElementById("rechargeToast");
        this.#chipBtns = Array.from(document.querySelectorAll(".recharge-chip-btn"));
    }

    #bindEvents() {
        if (this.#closeBtn) {
            this.#closeBtn.addEventListener("click", () => this.close());
        }

        if (this.#modal) {
            this.#modal.addEventListener("click", (e) => {
                if (e.target === this.#modal) this.close();
            });
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && this.#modal?.classList.contains("active")) {
                this.close();
            }
        });

        this.#chipBtns.forEach((btn) => {
            btn.addEventListener("click", () => {
                const val = btn.getAttribute("data-val");
                if (this.#amountInput) {
                    this.#amountInput.value = val;
                }
                this.#chipBtns.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });

        if (this.#cardInput) {
            this.#cardInput.addEventListener("input", (e) => {
                e.target.value = e.target.value.replace(/\D/g, "");
            });
        }

        if (this.#submitBtn) {
            this.#submitBtn.addEventListener("click", () => this.#handleProceed());
        }
    }

    #loadSavedData() {
        const savedCard = localStorage.getItem(RechargeModalComponent.#STORAGE_KEY_CARD);
        const savedAmount = localStorage.getItem(RechargeModalComponent.#STORAGE_KEY_AMOUNT);

        if (this.#cardInput && savedCard) {
            this.#cardInput.value = savedCard;
        }
        if (this.#amountInput && savedAmount) {
            this.#amountInput.value = savedAmount;
        }
    }

    async #handleProceed() {
        const cardId = this.#cardInput?.value?.trim() || "";
        const amount = this.#amountInput?.value?.trim() || "";

        if (!cardId || cardId.length < 8) {
            this.#showToast("⚠️ Please enter a valid 8 to 11 digit Metro Card ID.");
            this.#cardInput?.focus();
            return;
        }

        localStorage.setItem(RechargeModalComponent.#STORAGE_KEY_CARD, cardId);
        if (amount) {
            localStorage.setItem(RechargeModalComponent.#STORAGE_KEY_AMOUNT, amount);
        }

        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(cardId);
            }
        } catch (err) {
            console.warn("[RechargeModal] Clipboard notice:", err);
        }

        this.#showToast(`✅ Card ID ${cardId} copied! Opening DMRC Portal...`);

        setTimeout(() => {
            window.open(RechargeModalComponent.#DMRC_URL, "_blank", "noopener,noreferrer");
            this.close();
        }, 600);
    }

    #showToast(msg) {
        if (!this.#toast) return;
        this.#toast.textContent = msg;
        this.#toast.classList.add("active");
        setTimeout(() => {
            this.#toast.classList.remove("active");
        }, 3000);
    }
}