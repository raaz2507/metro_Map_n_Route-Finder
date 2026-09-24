/**
 * ==============================================================================
 * PROGRESSIVE WEB APP (PWA) MANAGER
 * Handles Service Worker Registration and Custom Install Prompt UI
 * ==============================================================================
 */

export class PwaManager {
	#deferredPrompt = null;
	#bannerElement = null;
	#installBtn = null;
	#dismissBtn = null;

	constructor() {
		// Class initialized
	}

	// पब्लिक API जिसे बाहर से कॉल किया जाएगा
	init() {
		this.#cacheDOM();
		this.#bindEvents();
		this.#registerServiceWorker();
	}

	#cacheDOM() {
		this.#bannerElement = document.getElementById('pwa-install-banner');
		this.#installBtn = document.getElementById('pwa-install-btn');
		this.#dismissBtn = document.getElementById('pwa-dismiss-btn');
	}

	#bindEvents() {
		// ब्राउज़र जब इंस्टॉल इवेंट भेजे, तो उसे पकड़कर बैनर दिखाएं
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault(); // डिफ़ॉल्ट प्रॉम्प्ट रोकें
			this.#deferredPrompt = e;
			this.#showBanner();
		});

		if (this.#installBtn) {
			this.#installBtn.addEventListener('click', () => this.#handleInstall());
		}

		if (this.#dismissBtn) {
			this.#dismissBtn.addEventListener('click', () => this.#hideBanner());
		}
	}

	#showBanner() {
		if (this.#bannerElement) {
			this.#bannerElement.style.display = 'flex';
		}
	}

	#hideBanner() {
		if (this.#bannerElement) {
			this.#bannerElement.style.display = 'none';
		}
	}

	async #handleInstall() {
		this.#hideBanner();
		if (this.#deferredPrompt) {
			this.#deferredPrompt.prompt();
			const { outcome } = await this.#deferredPrompt.userChoice;
			console.log(`[PWA] User response: ${outcome}`);
			this.#deferredPrompt = null; // एक बार प्रॉम्प्ट करने के बाद इसे खाली कर दें
		}
	}

	#registerServiceWorker() {
		window.addEventListener('load', () => {
			// Capacitor (Android APK) डिटेक्शन
			const isNativeApp = Boolean(window.Capacitor && window.Capacitor.isNativePlatform());

			// केवल वेब ब्राउज़र / PWA में सर्विस वर्कर रजिस्टर करें
			if (!isNativeApp && 'serviceWorker' in navigator) {
				navigator.serviceWorker.register('./sw.js')
					.then((reg) => console.log('✅ [PWA] Service Worker Registered:', reg.scope))
					.catch((err) => console.error('❌ [PWA] SW Registration Failed:', err));
			} else if (isNativeApp) {
				console.log('📱 [Capacitor] Running in Native APK Mode. Service Worker bypassed.');
			}
		});
	}
}