/**
 * ==============================================================================
 * PROGRESSIVE WEB APP (PWA) & APP UTILITY MANAGER
 * Enterprise Singleton managing PWA Install lifecycle, Header Utility Hub,
 * and Service Worker Cache Invalidation (Hard Refresh).
 * ==============================================================================
 */

export class PwaManager {
	static #instance = null;

	#deferredPrompt = null;
	#isStandalone = false;
	#isInitialized = false;

	#dom = {
		// Header Dropdown Controls
		utilityBtn: null,
		utilityMenu: null,
		installMenuItem: null,
		refreshMenuItem: null,
		// Optional Banner Controls (home page)
		banner: null,
		bannerInstallBtn: null,
		bannerDismissBtn: null
	};

	constructor() {
		if (PwaManager.#instance) {
			return PwaManager.#instance;
		}
		PwaManager.#instance = this;
	}

	static getInstance() {
		if (!PwaManager.#instance) {
			PwaManager.#instance = new PwaManager();
		}
		return PwaManager.#instance;
	}

	/**
	 * Centrally initialize PWA Lifecycle and Service Worker
	 */
	init() {
		if (this.#isInitialized) return;
		this.#isInitialized = true;

		this.#detectStandalone();
		this.#bindLifecycleEvents();
		this.#registerServiceWorker();
	}

	/**
	 * Detect if the app is running in Standalone / Installed mode
	 */
	#detectStandalone() {
		this.#isStandalone = window.matchMedia('(display-mode: standalone)').matches
			|| window.matchMedia('(display-mode: window-controls-overlay)').matches
			|| Boolean(window.navigator.standalone)
			|| localStorage.getItem('pwa-installed') === 'true';
	}

	/**
	 * Global PWA Lifecycle Event Listeners
	 */
	#bindLifecycleEvents() {
		// Capture Chromium Install Prompt
		window.addEventListener('beforeinstallprompt', (e) => {
			e.preventDefault();
			this.#deferredPrompt = e;
			window.__pwaDeferredPrompt = e;
			this.#updateUI();
		});

		// Listen for completed installation
		window.addEventListener('appinstalled', () => {
			this.#isStandalone = true;
			this.#deferredPrompt = null;
			window.__pwaDeferredPrompt = null;
			localStorage.setItem('pwa-installed', 'true');
			this.#updateUI();
		});
	}

	/**
	 * Bind UI handles whenever Header or Page is rendered
	 */
	bindHeaderUI() {
		this.init(); // Ensure lifecycle events are active

		this.#dom.utilityBtn = document.getElementById('app-utility-btn');
		this.#dom.utilityMenu = document.getElementById('app-utility-menu');
		this.#dom.installMenuItem = document.getElementById('menu-install-pwa');
		this.#dom.refreshMenuItem = document.getElementById('menu-hard-refresh');

		this.#setupDropdownBehavior();
		this.#bindMenuActions();
		this.#updateUI();
	}

	/**
	 * Bind optional homepage bottom banner if present in DOM
	 */
	bindBannerUI() {
		this.#dom.banner = document.getElementById('pwa-install-banner');
		this.#dom.bannerInstallBtn = document.getElementById('pwa-install-btn');
		this.#dom.bannerDismissBtn = document.getElementById('pwa-dismiss-btn');

		if (this.#dom.bannerInstallBtn) {
			this.#dom.bannerInstallBtn.addEventListener('click', () => this.promptInstall());
		}
		if (this.#dom.bannerDismissBtn) {
			this.#dom.bannerDismissBtn.addEventListener('click', () => {
				if (this.#dom.banner) this.#dom.banner.style.display = 'none';
			});
		}
		this.#updateUI();
	}

	#setupDropdownBehavior() {
		const { utilityBtn, utilityMenu } = this.#dom;
		if (!utilityBtn || !utilityMenu) return;

		const closeMenu = () => {
			utilityMenu.classList.remove('show');
			utilityBtn.setAttribute('aria-expanded', 'false');
		};

		utilityBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = utilityMenu.classList.contains('show');
			// Close any other open dropdowns first
			document.querySelectorAll('.custom-dropdown-menu.show').forEach(m => {
				if (m !== utilityMenu) m.classList.remove('show');
			});

			if (isOpen) {
				closeMenu();
			} else {
				utilityMenu.classList.add('show');
				utilityBtn.setAttribute('aria-expanded', 'true');
			}
		});

		document.addEventListener('click', (e) => {
			if (!utilityBtn.contains(e.target) && !utilityMenu.contains(e.target)) {
				closeMenu();
			}
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && utilityMenu.classList.contains('show')) {
				closeMenu();
				utilityBtn.focus();
			}
		});
	}

	#bindMenuActions() {
		const { utilityBtn, utilityMenu, installMenuItem, refreshMenuItem } = this.#dom;

		// 1. Install Action
		if (installMenuItem) {
			installMenuItem.addEventListener('click', () => {
				if (utilityMenu) utilityMenu.classList.remove('show');
				if (utilityBtn) utilityBtn.setAttribute('aria-expanded', 'false');
				this.promptInstall();
			});
		}

		// 2. Hard Refresh Action
		if (refreshMenuItem) {
			refreshMenuItem.addEventListener('click', () => {
				if (utilityMenu) utilityMenu.classList.remove('show');
				if (utilityBtn) utilityBtn.setAttribute('aria-expanded', 'false');
				this.hardRefresh();
			});
		}
	}

	/**
	 * Synchronize visibility of Install options based on eligibility
	 */
	#updateUI() {
		const canInstall = !this.#isStandalone && Boolean(this.#deferredPrompt);

		// Header Dropdown Install Item
		if (this.#dom.installMenuItem) {
			this.#dom.installMenuItem.style.display = canInstall ? 'flex' : 'none';
		}

		// Homepage Banner
		if (this.#dom.banner) {
			this.#dom.banner.style.display = canInstall ? 'flex' : 'none';
		}
	}

	/**
	 * Prompt the browser native PWA install dialog
	 */
	async promptInstall() {
		if (!this.#deferredPrompt) return;

		try {
			this.#deferredPrompt.prompt();
			const { outcome } = await this.#deferredPrompt.userChoice;
			if (outcome === 'accepted') {
				this.#isStandalone = true;
				localStorage.setItem('pwa-installed', 'true');
				this.#updateUI();
			}
		} catch (err) {
			console.error('[PwaManager] promptInstall failed:', err);
		} finally {
			this.#deferredPrompt = null;
			window.__pwaDeferredPrompt = null;
		}
	}

	/**
	 * Unregisters Service Workers, deletes caches, and forces hard reload
	 */
	async hardRefresh() {
		try {
			// Unregister Service Workers
			if ('serviceWorker' in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const reg of registrations) {
					await reg.unregister();
				}
			}
			// Delete CacheStorage
			if ('caches' in window) {
				const keys = await caches.keys();
				for (const key of keys) {
					await caches.delete(key);
				}
			}
		} catch (err) {
			console.warn('[PwaManager] Hard refresh cleanup warning:', err);
		} finally {
			window.location.reload(true);
		}
	}

	/**
	 * Register SW for Web/PWA (Bypassed in Capacitor Native APK)
	 */
	#registerServiceWorker() {
		window.addEventListener('load', () => {
			const isNativeApp = Boolean(window.Capacitor && window.Capacitor.isNativePlatform());
			if (!isNativeApp && 'serviceWorker' in navigator) {
				navigator.serviceWorker.register('./sw.js')
					.then((reg) => console.log('✅ [PWA] Service Worker Active:', reg.scope))
					.catch((err) => console.error('❌ [PWA] SW Registration Error:', err));
			}
		});
	}
}

export const pwaManager = PwaManager.getInstance();