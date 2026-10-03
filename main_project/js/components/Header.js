/**
 * Universal Class-Based Header Component & Global i18n Hub
 * Enterprise Single Source of Truth for rendering, theme switching, and global language translation.
 */
import { appStateStore } from "../core/app-state-store.js";
import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_CATEGORIES } from "../core/i18n.js";
import { RechargeModalComponent } from "./RechargeModal.js";
import { themeEngine } from "../core/ThemeEngine.js";
import { pwaManager } from "../core/PwaManager.js";

export class HeaderComponent {
	static async render(activePage = 'home', targetContainerId = 'app-header') {
		const container = document.getElementById(targetContainerId);
		if (!container) return;

		let currentTheme = localStorage.getItem('app-theme');
		if (!currentTheme || currentTheme === 'light' || currentTheme === 'dark') {
			currentTheme = 'classic';
			localStorage.setItem('app-theme', 'classic');
		}
		const currentMode = localStorage.getItem('app-mode') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
		const currentLang = localStorage.getItem('app-lang') || localStorage.getItem('language') || 'en';

		// Set initial theme, mode & lang attributes on body
		document.body.setAttribute('data-theme', currentTheme);
		document.body.setAttribute('data-mode', currentMode);
		document.body.setAttribute('data-lang', currentLang);

		// Apply saved font scale
		const savedFontScale = localStorage.getItem('app-font-scale') || '100';
		document.documentElement.style.setProperty('--app-font-scale', `${savedFontScale}%`);

		// Centrally Initialize Global Pluggable Theme Engine
		try {
			await themeEngine.init();
		} catch (err) {
			console.warn("[HeaderComponent] ThemeEngine init notice:", err);
		}

		const availableThemes = themeEngine.getThemes();
		container.innerHTML = HeaderComponent.#HTMLStrucher(activePage, currentTheme, currentMode, currentLang, availableThemes);

		this.initEvents();

		// Centrally execute & apply global i18n translations across the entire page
		try {
			await i18n.initI18n();
		} catch (err) {
			console.warn("[HeaderComponent] i18n auto-init notice:", err);
		}

		// Smoothly bring active nav tab into view on mobile horizontal scroll
		requestAnimationFrame(() => {
			const activeNavLink = container.querySelector('.nav-link.active');
			if (activeNavLink) {
				activeNavLink.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
			}
		});
	}

	static initEvents() {
		// Font Scaler Setup
		this.#setupFontScaler();
		// Recharge Modal Trigger
		const rechargeModal = RechargeModalComponent.getInstance();

		const rechargeBtn = document.getElementById('nav-recharge-btn');
		if (rechargeBtn) {
			rechargeBtn.addEventListener('click', (e) => {
				e.preventDefault();
				rechargeModal.open();
			});
		}

				this.#setupDropdown('theme-btn', 'theme-menu', (val) => {
			appStateStore.setState({ currentTheme: val });
		});
		this.#setupThemeModeToggle();

		this.#setupDropdown('lang-btn', 'lang-menu', async (val) => {
			await appStateStore.setState({ currentLang: val });
		});
		// PWA & App Utility Hub Setup
		pwaManager.bindHeaderUI();
	}


	/**
	 * Bounded Continuous Font Scale Stepper (85% to 130%, 5% step)
	 */
	static #setupFontScaler() {
		const decBtn = document.getElementById('font-dec-btn');
		const resetBtn = document.getElementById('font-reset-btn');
		const incBtn = document.getElementById('font-inc-btn');

		if (!decBtn || !resetBtn || !incBtn) return;

		const MIN_SCALE = 85;
		const MAX_SCALE = 130;
		const STEP = 5;
		const DEFAULT_SCALE = 100;

		const getScale = () => {
			const saved = parseInt(localStorage.getItem('app-font-scale'), 10);
			return isNaN(saved) ? DEFAULT_SCALE : saved;
		};

		const updateUI = (scale) => {
			document.documentElement.style.setProperty('--app-font-scale', `${scale}%`);
			localStorage.setItem('app-font-scale', scale.toString());

			// Bounds and visual feedback
			decBtn.disabled = scale <= MIN_SCALE;
			incBtn.disabled = scale >= MAX_SCALE;

			if (scale === DEFAULT_SCALE) {
				resetBtn.classList.add('is-default');
				resetBtn.style.color = '';
			} else {
				resetBtn.classList.remove('is-default');
				resetBtn.style.color = 'var(--color-primary)';
			}

			// Dynamic accessible tooltips
			decBtn.title = `Decrease Font Size (${scale - STEP >= MIN_SCALE ? scale - STEP : scale}%)`;
			incBtn.title = `Increase Font Size (${scale + STEP <= MAX_SCALE ? scale + STEP : scale}%)`;
			resetBtn.title = `Reset Font Size (Current: ${scale}%)`;
		};

		// Initial boundary sync
		updateUI(getScale());

		decBtn.addEventListener('click', (e) => {
			e.preventDefault();
			const current = getScale();
			if (current > MIN_SCALE) {
				updateUI(Math.max(MIN_SCALE, current - STEP));
			}
		});

		incBtn.addEventListener('click', (e) => {
			e.preventDefault();
			const current = getScale();
			if (current < MAX_SCALE) {
				updateUI(Math.min(MAX_SCALE, current + STEP));
			}
		});

		resetBtn.addEventListener('click', (e) => {
			e.preventDefault();
			updateUI(DEFAULT_SCALE);
		});
	}


	/**
	 * Dual-Mode (Light / Dark) Toggle Handler (Pure Icon + i18n Safe)
	 */
	static #setupThemeModeToggle() {
		const modeBtn = document.getElementById('theme-mode-btn');
		const modeIcon = document.getElementById('mode-icon');
		if (!modeBtn) return;

		modeBtn.addEventListener('click', (e) => {
			e.preventDefault();
			const currentMode = document.body.getAttribute('data-mode') === 'dark' ? 'dark' : 'light';
			const newMode = currentMode === 'dark' ? 'light' : 'dark';

			// 1. Update Body Attribute & Local Storage
			document.body.setAttribute('data-mode', newMode);
			localStorage.setItem('app-mode', newMode);

			// 2. Pure Icon Toggle
			if (modeIcon) {
				modeIcon.textContent = newMode === 'dark' ? '🌙' : '☀️';
			}

			// 3. Dynamic i18n Safe Tooltip & Aria
			const i18nKey = newMode === 'dark' ? 'header.mode.switchToLight' : 'header.mode.switchToDark';
			const localizedTitle = i18n.t(i18nKey);
			modeBtn.setAttribute('title', localizedTitle);
			modeBtn.setAttribute('aria-label', localizedTitle);

			// 4. Dispatch global event for theme listeners
			window.dispatchEvent(new CustomEvent('app-mode-changed', { detail: { mode: newMode } }));
		});
	}


	static #setupDropdown(btnId, menuId, onSelectCallback) {
		const btn = document.getElementById(btnId);
		const menu = document.getElementById(menuId);
		if (!btn || !menu) return;

		const close = () => {
			menu.classList.remove('show');
			btn.setAttribute('aria-expanded', 'false');
		};

		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = menu.classList.contains('show');
			document.querySelectorAll('.custom-dropdown-menu.show').forEach(m => m.classList.remove('show'));
			if (!isOpen) {
				menu.classList.add('show');
				btn.setAttribute('aria-expanded', 'true');
			} else {
				close();
			}
		});

		menu.querySelectorAll('.custom-dropdown-item').forEach(item => {
			item.addEventListener('click', (e) => {
				e.stopPropagation();
				const val = item.getAttribute('data-value');
				menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
				item.classList.add('active');
				close();
				if (onSelectCallback) onSelectCallback(val);
			});
		});

		document.addEventListener('click', (e) => {
			if (!btn.contains(e.target) && !menu.contains(e.target)) {
				close();
			}
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') close();
		});
	}

	static #HTMLStrucher(activePage, currentTheme, currentMode, currentLang, availableThemes = []) {
		const isNative = window.Capacitor && window.Capacitor.isNativePlatform();
		const urlParams = new URLSearchParams(window.location.search);
		const currentCity = urlParams.get('city') || localStorage.getItem('active_city') || '';
		const cityParam = currentCity ? `?city=${encodeURIComponent(currentCity)}` : '';
		return `
			<!-- Global SVG Symbol Sprite for Navigation (Zero External Requests) -->
			<svg style="display: none;" xmlns="http://www.w3.org/2000/svg">
				<symbol id="icon-networks" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="9"/>
					<path d="M3.6 9h16.8M3.6 15h16.8"/>
					<path d="M12 3a14 14 0 0 0 0 18 14 14 0 0 0 0-18z"/>
					<circle cx="12" cy="12" r="2" fill="currentColor"/>
				</symbol>
				<symbol id="icon-home" viewBox="0 0 24 24">
					<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5z"/>
					<path d="M9 21V12h6v9"/>
					<path d="M12 7.5v1.5"/>
				</symbol>
				<symbol id="icon-stations" viewBox="0 0 24 24">
					<rect x="4" y="3" width="16" height="14" rx="3"/>
					<path d="M4 11h16"/>
					<circle cx="8" cy="14" r="1" fill="currentColor"/>
					<circle cx="16" cy="14" r="1" fill="currentColor"/>
					<path d="M6 17l-3 4M18 17l3 4M8 20h8"/>
				</symbol>
				<symbol id="icon-recharge" viewBox="0 0 24 24">
					<rect x="2" y="5" width="20" height="14" rx="2"/>
					<line x1="2" y1="10" x2="22" y2="10"/>
					<circle cx="7" cy="15" r="1.5" fill="currentColor"/>
					<path d="M14 14a2.5 2.5 0 0 1 0 3"/>
					<path d="M16.5 12.5a5 5 0 0 1 0 6"/>
				</symbol>
				<symbol id="icon-support" viewBox="0 0 24 24">
					<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
					<path d="M9 12h2l1-2 2 4 1-2h2"/>
				</symbol>
				<symbol id="icon-help" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="9"/>
					<circle cx="12" cy="12" r="4"/>
					<path d="M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
				</symbol>
				<symbol id="icon-about" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="9"/>
					<line x1="12" y1="11" x2="12" y2="17"/>
					<circle cx="12" cy="7.5" r="1" fill="currentColor"/>
					<path d="M10 11h2"/>
				</symbol>
			</svg>

			<header class="main-header">
				<div class="header-top-row">
					<div class="logo-title-group">
						<img src="assets/images/site_icon.svg" alt="Metro Logo" class="site-logo">
						<h1 data-i18n="header.appName">YatraMarg</h1>
					</div>

					<section class="toolbar">
						<section class="toolbar">
						${!isNative ? `
						<!-- 📱 Smart App Utility & PWA Hub Dropdown (Web/PWA Only) -->
						<div class="dropdown-container app-utility-container">
							<button type="button" class="btn-25d app-utility-btn" id="app-utility-btn" aria-haspopup="menu" aria-expanded="false" 
								data-i18n-attr="title:header.appOptions;aria-label:header.appOptions" title="App Utilities">
								<span class="btn-icon">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<rect x="5" y="2" width="14" height="20" rx="3" ry="3"/>
										<line x1="12" y1="18" x2="12.01" y2="18"/>
										<path d="M9 6h6"/>
									</svg>
								</span>
							</button>
							<ul class="custom-dropdown-menu app-utility-menu" id="app-utility-menu" role="menu">
								<!-- Install PWA (Auto-shown only when eligible) -->
								<li class="custom-dropdown-item" id="menu-install-pwa" role="menuitem" style="display: none;">
									<span class="item-icon">📲</span>
									<span data-i18n="header.installApp">Install App</span>
								</li>
								<!-- Clear Cache & Hard Refresh -->
								<li class="custom-dropdown-item" id="menu-hard-refresh" role="menuitem">
									<span class="item-icon">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="23 4 23 10 17 10"/>
											<polyline points="1 20 1 14 7 14"/>
											<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
										</svg>
									</span>
									<span data-i18n="header.hardRefresh">Clear Cache & Refresh</span>
								</li>
							</ul>
						</div>
						` : ''}

						<!-- 🔤 Continuous Bounded Font Size Stepper -->
						<div class="font-scale-stepper" role="group" aria-label="Font Size Adjuster">
							<button type="button" class="btn-stepper" id="font-dec-btn" 
								data-i18n-attr="title:header.fontScale.decrease;aria-label:header.fontScale.decrease">A-</button>
							<span class="stepper-divider" aria-hidden="true"></span>
							<button type="button" class="btn-stepper is-default" id="font-reset-btn" 
								data-i18n-attr="title:header.fontScale.reset;aria-label:header.fontScale.reset">A</button>
							<span class="stepper-divider" aria-hidden="true"></span>
							<button type="button" class="btn-stepper" id="font-inc-btn" 
								data-i18n-attr="title:header.fontScale.increase;aria-label:header.fontScale.increase">A+</button>
						</div>

						
						<!-- ☀️ / 🌙 Pure Icon Dual-Mode Toggle Button (Zero Extra Text) -->
						
						<section class="theme-container">
							<button type="button" class="btn-25d mode-toggle-btn" id="theme-mode-btn"
								data-i18n-attr="aria-label:header.mode.switchTo${currentMode === 'dark' ? 'Light' : 'Dark'};title:header.mode.switchTo${currentMode === 'dark' ? 'Light' : 'Dark'}">
								<span class="btn-icon" id="mode-icon">${currentMode === 'dark' ? '🌙' : '☀️'}</span>
							</button>
							<div class="dropdown-container">
								<button type="button" class="btn-25d theme-selector" id="theme-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Theme Selector">
									<span class="btn-icon">🎨</span>
									<span class="btn-text">Theme</span>
								</button>
								<ul class="custom-dropdown-menu" id="theme-menu" role="listbox">
									${(() => {
										// Group themes by category dynamically from manifest
										const groups = {};
										availableThemes.forEach(t => {
											const cat = t.category || "🎨 Themes";
											if (!groups[cat]) groups[cat] = [];
											groups[cat].push(t);
										});
										return Object.entries(groups).map(([categoryName, themes]) => `
											<li class="dropdown-category-header" role="presentation">
												<span>${categoryName}</span>
											</li>
											${themes.map(t => `
												<li class="custom-dropdown-item ${currentTheme === t.id ? 'active' : ''}" role="option" data-value="${t.id}">
													${t.name}
												</li>
											`).join('')}
										`).join('');
									})()}
								</ul>
							</div>
						</section>
						<div class="dropdown-container">
							<button type="button" class="btn-25d lang-selector" id="lang-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Language Selector">
								<span class="btn-icon">🌐</span>
								<span class="btn-text">${SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.short || currentLang.toUpperCase()}</span>
							</button>
							<ul class="custom-dropdown-menu categorized-lang-menu" id="lang-menu" role="listbox">
								${LANGUAGE_CATEGORIES.map(cat => `
									<li class="dropdown-category-header" role="presentation">
										<span>${cat.flag} ${cat.name}</span>
									</li>
									${cat.languages.map(l => l.disabled ? `
										<li class="custom-dropdown-item disabled-lang-item" role="option" aria-disabled="true" title="Coming Soon">
											<span class="lang-label-group">
												<span class="lang-native-text">${l.label}</span>
												<span class="lang-sub-text">(${l.nativeName})</span>
											</span>
											<span class="badge-coming-soon">Soon</span>
										</li>
										` : `
										<li class="custom-dropdown-item ${currentLang === l.code ? 'active' : ''}" role="option" data-value="${l.code}">
											<span class="lang-label-group">
												<span class="lang-native-text">${l.label}</span>
												<span class="lang-sub-text">${l.code !== 'en' ? `(${l.nativeName})` : ''}</span>
											</span>
										</li>
									`).join('')}
								`).join('')}
							</ul>
						</div>
					</section>
				</div>

				<p class="header-tagline" data-i18n="header.tagLine">Maps • Routes • Fares • Journey Assistance</p>
			</header>

			<!-- Retro Ticket Stub Navigation Bar with Blueprint Stroke Draw -->
			<nav class="header-nav" id="header-nav" aria-label="Header Navigation">
				<ul class="header-nav-list">
					<li class="header-nav-item">
						<a href="TransitNetworkSelector.html" class="nav-link ${activePage === 'networks' ? 'active' : ''}" data-target="networks">
							<span class="nav-icon"><svg><use href="#icon-networks"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.networks">Networks</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="index.html${cityParam}" class="nav-link ${activePage === 'home' ? 'active' : ''}" data-target="home">
							<span class="nav-icon"><svg><use href="#icon-home"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.home">Home</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="all_stations.html${cityParam}" class="nav-link ${activePage === 'stations' ? 'active' : ''}" data-target="stations">
							<span class="nav-icon"><svg><use href="#icon-stations"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.stations">Stations</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="javascript:void(0)" id="nav-recharge-btn" class="nav-link ${activePage === 'recharge' ? 'active' : ''}" data-target="recharge">
							<span class="nav-icon"><svg><use href="#icon-recharge"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.recharge">Recharge Card</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="passenger_support.html${cityParam}" class="nav-link ${activePage === 'passenger_support' ? 'active' : ''}" data-target="support">
							<span class="nav-icon"><svg><use href="#icon-support"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.passengerSupport">Passenger Support</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="help.html" class="nav-link ${activePage === 'help' ? 'active' : ''}" data-target="help">
							<span class="nav-icon"><svg><use href="#icon-help"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.help">Help</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="about.html" class="nav-link ${activePage === 'about' ? 'active' : ''}" data-target="about">
							<span class="nav-icon"><svg><use href="#icon-about"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.about">About</span>
						</a>
					</li>
				</ul>
			</nav>
		`;
	}
}