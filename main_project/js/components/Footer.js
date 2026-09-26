/**
 * Universal Class-Based Footer Component (With Logo & Sleek Bottom Strip)
 */
export class FooterComponent {
	static render(targetContainerId = 'app-footer') {
		const container = document.getElementById(targetContainerId);
		if (!container) return;

		container.outerHTML = `
			<footer id="app-footer" class="site-footer">
				
				<!-- MAIN 2-COLUMN CONTENT ROW (BRAND + MOBILE PASS) -->
				<div class="footer-main-row">
					
					<!-- COLUMN 1: BRAND IDENTITY & DISCLAIMER -->
					<div class="footer-brand-col">
						<div class="footer-logo-title">
							<img src="./assets/images/site_icon.svg" alt="YatraMarg Logo" class="footer-logo">
							<div>
								<h2 data-i18n="header.appName">YatraMarg</h2>
								<span class="footer-brand-tagline">Metro Navigator</span>
							</div>
						</div>
						<p class="footer-desc" data-i18n="footer.brandDescription">Built for smarter urban transit navigation and hassle-free metro commutes.</p>
						<div class="footer-disclaimer-badge">
							<span data-i18n="footer.disclaimer">⚠️ Route, fare and travel data are provided for reference only.</span>
						</div>
					</div>

					<!-- COLUMN 2: TACTILE 2.5D MOBILE PASS CARD -->
					<div class="footer-pass-col">
						<div class="footer-pass-card">
							<button type="button" class="footer-qr-btn" id="footerQrTriggerBtn" aria-haspopup="dialog" aria-expanded="false" aria-controls="footerQrModal" aria-label="Click to enlarge QR code">
								<span class="footer-qr-wrapper">
									<img src="./assets/images/qr-code.png" alt="Scan QR for YatraMarg" class="footer-qr-img">
								</span>
								<span class="footer-qr-expand-badge" aria-hidden="true">🔍 Tap to Zoom</span>
							</button>
							<div class="footer-pass-info">
								<span class="footer-pass-chip">Scan &amp; Ride</span>
								<h3 data-i18n="footer.appTitle">YatraMarg Mobile</h3>
								<p data-i18n="footer.qrDescription">Scan the QR code to quickly open this application on your mobile device.</p>
							</div>
						</div>
					</div>

				</div>

				<!-- BOTTOM CREDIT STRIP -->
				<div class="footer-bottom-credit">
					<p class="footer-copyright">&copy; 2026 <strong data-i18n="header.appName">YatraMarg</strong> Transit Portal. All rights reserved.</p>
					<p class="footer-dev-credit" data-i18n="footer.developedBy">Developed with ❤️</p>
				</div>
			</footer>

			<!-- ACCESSIBLE QR LIGHTBOX MODAL -->
			<div id="footerQrModal" class="footer-qr-modal-overlay" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="footerQrModalTitle">
				<div class="footer-qr-modal-card">
					<header class="footer-qr-modal-header">
						<div class="footer-qr-modal-title-wrap">
							<span class="footer-pass-chip">Scan &amp; Ride</span>
							<h3 id="footerQrModalTitle" data-i18n="footer.appTitle">YatraMarg Mobile</h3>
						</div>
						<button type="button" class="footer-qr-close-btn" id="footerQrCloseBtn" aria-label="Close QR Modal">&times;</button>
					</header>
					<div class="footer-qr-modal-body">
						<div class="footer-qr-large-wrapper">
							<img src="./assets/images/qr-code.png" alt="YatraMarg Mobile Pass QR Code" class="footer-qr-large-img">
						</div>
						<p class="footer-qr-scan-hint" data-i18n="footer.qrDescription">Scan the QR code to quickly open this application on your mobile device.</p>
					</div>
				</div>
			</div>
		`;

		// Initialize modal events safely
		this.#initModal();
	}

	// =========================================================================
	// PRIVATE ES2022 OOP LOGIC & ACCESSIBILITY
	// =========================================================================
	static #abortController = null;
	static #modal = null;
	static #triggerBtn = null;

	static #initModal() {
		if (this.#abortController) {
			this.#abortController.abort();
		}
		this.#abortController = new AbortController();
		const signal = this.#abortController.signal;

		this.#modal = document.getElementById('footerQrModal');
		this.#triggerBtn = document.getElementById('footerQrTriggerBtn');
		const closeBtn = document.getElementById('footerQrCloseBtn');

		if (!this.#modal || !this.#triggerBtn) return;

		// Open modal
		this.#triggerBtn.addEventListener('click', () => this.#openModal(), { signal });

		// Close on button click
		if (closeBtn) {
			closeBtn.addEventListener('click', () => this.#closeModal(), { signal });
		}

		// Close on backdrop click (outside card)
		this.#modal.addEventListener('click', (e) => {
			if (e.target === this.#modal) {
				this.#closeModal();
			}
		}, { signal });

		// Close on Escape key press
		window.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.#modal?.classList.contains('is-open')) {
				this.#closeModal();
			}
		}, { signal });
	}

	static #openModal() {
		if (!this.#modal) return;
		this.#modal.classList.add('is-open');
		this.#modal.setAttribute('aria-hidden', 'false');
		if (this.#triggerBtn) this.#triggerBtn.setAttribute('aria-expanded', 'true');
		document.body.style.overflow = 'hidden';
	}

	static #closeModal() {
		if (!this.#modal) return;
		this.#modal.classList.remove('is-open');
		this.#modal.setAttribute('aria-hidden', 'true');
		if (this.#triggerBtn) {
			this.#triggerBtn.setAttribute('aria-expanded', 'false');
			this.#triggerBtn.focus();
		}
		document.body.style.overflow = '';
	}
}

