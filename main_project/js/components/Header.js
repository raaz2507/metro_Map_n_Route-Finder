/**
 * Universal Class-Based Header Component & Global i18n Hub
 * Enterprise Single Source of Truth for rendering, theme switching, and global language translation.
 */
import { appStateStore } from "../core/app-state-store.js";
import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_CATEGORIES } from "../core/i18n.js";
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
		const currentLang = localStorage.getItem('app-lang') || localStorage.getItem('language') || 'en';

		const savedMode = localStorage.getItem('app-mode') || 'auto';
		const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		const effectiveMode = savedMode === 'auto' ? (systemDark ? 'dark' : 'light') : savedMode;

		// Set initial theme, mode & lang attributes on body
		document.body.setAttribute('data-theme', currentTheme);
		document.body.setAttribute('data-mode', effectiveMode);
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
		container.innerHTML = HeaderComponent.#HTMLStrucher(activePage, currentTheme, savedMode, currentLang, availableThemes);

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
		// App Utility Dropdown
		this.#setupDropdown('app-utility-btn', 'app-utility-menu');

		// Font Scale Slider Dropdown
		this.#setupFontScaleDropdown();

		this.#setupDropdown('theme-btn', 'theme-menu', (val) => {
			appStateStore.setState({ currentTheme: val });
		});
		this.#setupAppearanceMode();

		this.#setupDropdown('lang-btn', 'lang-menu', async (val) => {
			await appStateStore.setState({ currentLang: val });
		});

		// City Selector (async — loads registry then renders)
		this.#setupCitySelector();

		// PWA & App Utility Hub Setup
		pwaManager.bindHeaderUI();
	}


	/**
	 * Font Scale: Single trigger button → slider dropdown panel
	 */
	static #setupFontScaleDropdown() {
		const btn = document.getElementById('font-scale-btn');
		const panel = document.getElementById('font-scale-panel');
		const range = document.getElementById('font-scale-range');
		const display = document.getElementById('font-panel-value');
		const badge = document.getElementById('font-pct-badge');
		const resetEl = document.getElementById('font-reset-link');
		const progressFill = document.getElementById('font-slider-fill');
		const closeBtn = document.getElementById('font-panel-close');

		if (!btn || !panel || !range) return;

		const MIN = 85, MAX = 130, DEFAULT = 100;

		const getScale = () => {
			const s = parseInt(localStorage.getItem('app-font-scale'), 10);
			return isNaN(s) ? DEFAULT : Math.min(MAX, Math.max(MIN, s));
		};

		const applyScale = (val) => {
			const clamped = Math.min(MAX, Math.max(MIN, val));
			document.documentElement.style.setProperty('--app-font-scale', `${clamped}%`);
			localStorage.setItem('app-font-scale', clamped.toString());
			range.value = clamped;
			const label = `${clamped}%`;
			if (display) display.textContent = label;
			if (badge) badge.textContent = clamped === DEFAULT ? '' : label;
			range.setAttribute('aria-valuenow', clamped);

			// Progress fill sync
			const percentage = ((clamped - MIN) / (MAX - MIN)) * 100;
			if (progressFill) progressFill.style.width = `${percentage}%`;

			// Step dot highlight sync
			panel.querySelectorAll('.slider-step-dot').forEach(dot => {
				const dotVal = parseInt(dot.getAttribute('data-value'), 10);
				dot.classList.toggle('passed', dotVal <= clamped);
			});
		};

		applyScale(getScale());

		const closePanel = () => {
			panel.classList.remove('show');
			btn.setAttribute('aria-expanded', 'false');
		};

		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = panel.classList.contains('show');
			HeaderComponent.#closeAllDropdowns(panel);
			if (!isOpen) {
				panel.classList.add('show');
				btn.setAttribute('aria-expanded', 'true');
			} else {
				closePanel();
			}
		});

		range.addEventListener('input', () => applyScale(parseInt(range.value, 10)));
		if (resetEl) resetEl.addEventListener('click', () => applyScale(DEFAULT));
		if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closePanel(); });

		panel.querySelectorAll('.slider-step-dot').forEach(dot => {
			dot.addEventListener('click', (e) => {
				e.stopPropagation();
				applyScale(parseInt(dot.getAttribute('data-value'), 10));
			});
		});

		document.addEventListener('click', (e) => {
			if (!btn.contains(e.target) && !panel.contains(e.target)) closePanel();
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') closePanel();
		});
	}

	/**
	 * City Selector: Async registry-driven, country-grouped dropdown
	 * On select → persists to localStorage → navigates to index.html?city=KEY
	 */
	static async #setupCitySelector() {
		const btn      = document.getElementById('city-selector-btn');
		const menu     = document.getElementById('city-dropdown-menu');
		const flagEl   = document.getElementById('city-pill-flag');
		const nameEl   = document.getElementById('city-pill-name');

		if (!btn || !menu) return;

		// Resolve active city
		const urlParams   = new URLSearchParams(window.location.search);
		const activeCity  = urlParams.get('city') || localStorage.getItem('active_city') || 'delhi_ncr';
		const activeLang  = localStorage.getItem('app-lang') || 'en';

		// --- Fetch countries manifest + india registry in parallel ---
		let countriesManifest = null;
		let indiaRegistry     = null;

		try {
			const [cmRes, irRes] = await Promise.allSettled([
				fetch('data/countries_manifest.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }),
				fetch('data/india/india_transit_registry.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
			]);
			if (cmRes.status === 'fulfilled')  countriesManifest = cmRes.value;
			if (irRes.status === 'fulfilled')  indiaRegistry     = irRes.value;
		} catch (_) { /* silent — pill will show fallback */ }

		// --- Build pill label from registry ---
		const buildPillLabel = (cityKey) => {
			if (!indiaRegistry?.cities) return { flag: '🏙', name: cityKey };
			const cityData = indiaRegistry.cities[cityKey];
			if (!cityData) return { flag: '🏙', name: cityKey };
			return {
				flag: countriesManifest?.countries?.india?.flag || '🇮🇳',
				name: (cityData.name?.[activeLang] || cityData.name?.en || cityKey)
			};
		};

		const { flag, name } = buildPillLabel(activeCity);
		if (flagEl) flagEl.textContent = flag;
		if (nameEl) nameEl.textContent = name;

		// --- Build dropdown items ---
		let html = '';

		if (countriesManifest?.countries && indiaRegistry?.cities) {
			for (const [countryKey, countryMeta] of Object.entries(countriesManifest.countries)) {
				const countryName = countryMeta.name?.[activeLang] || countryMeta.name?.en || countryKey;
				const countryFlag = countryMeta.flag || '';
				const isActive    = countryMeta.status === 'active';

				html += `<li class="dropdown-category-header" role="presentation">
					<span>${countryFlag} ${countryName}</span>
					${!isActive ? `<span class="badge-coming-soon" data-i18n="header.citySelector.soon">Soon</span>` : ''}
				</li>`;

				if (isActive && countryKey === 'india') {
					// Only show cities with hasData: true, sorted alphabetically by localized name
					const availableCities = Object.entries(indiaRegistry.cities)
						.filter(([, c]) => c.hasData === true)
						.sort(([keyA, cityA], [keyB, cityB]) => {
							const nameA = cityA.name?.[activeLang] || cityA.name?.en || keyA;
							const nameB = cityB.name?.[activeLang] || cityB.name?.en || keyB;
							return nameA.localeCompare(nameB, activeLang, { sensitivity: 'base' });
						});

					for (const [cityKey, cityMeta] of availableCities) {
						const cityName = cityMeta.name?.[activeLang] || cityMeta.name?.en || cityKey;
						const isSelected = cityKey === activeCity;
						// Escape cityKey for XSS safety
						const safeCityKey = cityKey.replace(/[^a-z0-9_-]/gi, '');
						html += `<li class="city-dropdown-item ${isSelected ? 'active' : ''}"
							role="option"
							aria-selected="${isSelected}"
							data-city="${safeCityKey}"
							tabindex="0">
							${countryFlag} ${cityName}
						</li>`;
					}
				} else if (!isActive) {
					// Upcoming country — no city list, just the header badge
				}
			}
		}

		menu.innerHTML = html;

		// --- Bind click events on items ---
		menu.querySelectorAll('.city-dropdown-item[data-city]').forEach(item => {
			item.addEventListener('click', (e) => {
				e.stopPropagation();
				const selectedCity = item.getAttribute('data-city');
				if (!selectedCity || selectedCity === activeCity) { 
					closeMenu(); 
					return; 
				}

				localStorage.setItem('active_city', selectedCity);
				localStorage.removeItem('active_network');

				// Navigate: Preserve current page pathname and other params, update only city
				const newParams = new URLSearchParams(window.location.search);
				newParams.set('city', selectedCity);
				newParams.delete('network');
				newParams.delete('net');
				
				const currentPage = window.location.pathname.split('/').pop() || 'index.html';
				window.location.href = `${currentPage}?${newParams.toString()}`;
			});

			// Keyboard: Enter / Space to select
			item.addEventListener('keydown', (e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault();
					item.click();
				}
			});
		});

		// --- Toggle menu ---
		const closeMenu = () => {
			menu.classList.remove('show');
			btn.setAttribute('aria-expanded', 'false');
		};

		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = menu.classList.contains('show');
			HeaderComponent.#closeAllDropdowns(menu);
			if (!isOpen) {
				menu.classList.add('show');
				btn.setAttribute('aria-expanded', 'true');
			} else {
				closeMenu();
			}
		});

		document.addEventListener('click', (e) => {
			if (!btn.contains(e.target) && !menu.contains(e.target)) closeMenu();
		});

		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape') closeMenu();
		});
	}


		/**
	 * Segmented Appearance Mode (Light / Dark / Auto) Controller
	 * Native Radio Group with zero manual class toggling
	 * 100% Compatible with Web, PWA, and Capacitor Native Android OS theme changes
	 */
	static #setupAppearanceMode() {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

		const applyMode = (mode) => {
			const effective = mode === 'auto' ? (mediaQuery.matches ? 'dark' : 'light') : mode;
			document.body.setAttribute('data-mode', effective);
			localStorage.setItem('app-mode', mode);

			// Sync radio checked state if triggered programmatically
			const targetRadio = document.querySelector(`input[name="app-appearance-mode"][value="${mode}"]`);
			if (targetRadio && !targetRadio.checked) targetRadio.checked = true;

			window.dispatchEvent(new CustomEvent('app-mode-changed', { detail: { mode: effective, setting: mode } }));
		};

		// Prevent dropdown menu from closing on segmented bar clicks
		const bar = document.querySelector('.theme-mode-segmented-bar');
		if (bar) {
			bar.addEventListener('click', (e) => e.stopPropagation());
			bar.addEventListener('change', (e) => {
				if (e.target && e.target.name === 'app-appearance-mode') {
					applyMode(e.target.value);
				}
			});
		}

		// Dynamic OS / Android Dark Mode Listener
		mediaQuery.addEventListener('change', (e) => {
			if (localStorage.getItem('app-mode') === 'auto') {
				const effective = e.matches ? 'dark' : 'light';
				document.body.setAttribute('data-mode', effective);
				window.dispatchEvent(new CustomEvent('app-mode-changed', { detail: { mode: effective, setting: 'auto' } }));
			}
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
			HeaderComponent.#closeAllDropdowns(menu);
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

	/**
	 * Centrally close all header dropdowns and reset aria-expanded
	 */
	static #closeAllDropdowns(except = null) {
		document.querySelectorAll('.custom-dropdown-menu.show, .font-scale-panel.show, .city-dropdown-menu.show').forEach(m => {
			if (m !== except) {
				m.classList.remove('show');
				const container = m.closest('.dropdown-container');
				const trigger = container ? container.querySelector('[aria-expanded="true"]') : null;
				if (trigger) trigger.setAttribute('aria-expanded', 'false');
			}
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
				<symbol id="icon-other" viewBox="0 0 24 24">
					<circle cx="12" cy="12" r="9"/>
					<path d="M16 8l-3 8-5 2 3-8 5-2z"/>
					<circle cx="12" cy="12" r="1.5" fill="currentColor"/>
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
					<!-- Brand & City Group (Together on Left) -->
					<div class="brand-city-group">
						<div class="logo-title-group">
							<img src="assets/images/site_icon.svg" alt="Metro Logo" class="site-logo">
							<h1 data-i18n="header.appName">YatraMarg</h1>
						</div>

						${activePage !== 'networks' && activePage !== 'country_selector' ? `
						<!-- 🏙 City Selector Pill (Placed with Brand, Hidden on Selector Pages) -->
						<div class="city-selector-container dropdown-container" id="city-selector-container">
							<button type="button" class="city-selector-btn" id="city-selector-btn"
								aria-haspopup="listbox" aria-expanded="false"
								data-i18n-aria-label="header.citySelector.label">
								<span class="city-pill-flag" id="city-pill-flag" aria-hidden="true">🏙</span>
								<span class="city-pill-name" id="city-pill-name"></span>
								<svg class="chevron-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
									<polyline points="6 9 12 15 18 9"/>
								</svg>
							</button>
							<ul class="city-dropdown-menu" id="city-dropdown-menu" role="listbox" aria-label="Select City"></ul>
						</div>
						` : ''}
					</div>

					<section class="toolbar">
						${!isNative ? `
						<!-- 📱 Smart App Utility & PWA Hub Dropdown -->
						<div class="dropdown-container app-utility-container">
							<button type="button" class="btn-25d app-utility-btn" id="app-utility-btn" aria-haspopup="menu" aria-expanded="false" 
								data-i18n-title="header.appOptions" data-i18n-aria-label="header.appOptions" title="App Utilities">
								<span class="btn-icon">
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
										<rect x="5" y="2" width="14" height="20" rx="3" ry="3"/>
										<line x1="12" y1="18" x2="12.01" y2="18"/>
										<path d="M9 6h6"/>
									</svg>
								</span>
							</button>
							<ul class="custom-dropdown-menu app-utility-menu" id="app-utility-menu" role="menu">
								<li class="custom-dropdown-item" id="menu-install-pwa" role="menuitem" style="display: none;">
									<span class="item-icon">📲</span>
									<span data-i18n="header.installApp">Install App</span>
								</li>
								<li class="custom-dropdown-item" id="menu-hard-refresh" role="menuitem">
									<span class="item-icon">
										<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
											<polyline points="23 4 23 10 17 10"/>
											<polyline points="1 20 1 14 7 14"/>
											<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
										</svg>
									</span>
									<span data-i18n="header.hardRefresh">Refresh</span>
								</li>
							</ul>
						</div>
						` : ''}

						<!-- 🔤 Font Scale: Single Trigger -> Android/Chrome Range Bar Dropdown -->
						<div class="font-scale-dropdown-container dropdown-container">
							<button type="button" class="btn-25d font-scale-trigger" id="font-scale-btn"
								aria-haspopup="true" aria-expanded="false"
								data-i18n-title="header.fontScale.btnTitle"
								data-i18n-aria-label="header.fontScale.btnTitle">
								<span class="ui-vector-icon icon-fontscale icon-md" aria-hidden="true"></span>
								<span class="font-pct-badge" id="font-pct-badge" aria-live="polite"></span>
							</button>
							<div class="font-scale-panel" id="font-scale-panel" role="dialog" aria-label="Font Size Adjuster">
								<div class="font-panel-header">
									<div class="font-panel-header-left">
										<span class="font-panel-label" data-i18n="header.fontScale.label">Text Size</span>
										<span class="font-panel-value" id="font-panel-value">100%</span>
									</div>
									<button type="button" class="font-panel-close-btn" id="font-panel-close" aria-label="Close">✕</button>
								</div>
								<div class="font-slider-container">
									<span class="font-slider-endlabel small" aria-hidden="true">A</span>
									<div class="font-slider-track-wrap">
										<div class="font-slider-track-bg">
											<div class="font-slider-fill" id="font-slider-fill"></div>
											<div class="font-slider-steps-overlay">
												<span class="slider-step-dot" data-value="85" style="left: 0%;"></span>
												<span class="slider-step-dot" data-value="100" style="left: 33.33%;"></span>
												<span class="slider-step-dot" data-value="115" style="left: 66.66%;"></span>
												<span class="slider-step-dot" data-value="130" style="left: 100%;"></span>
											</div>
										</div>
										<input type="range" class="font-scale-range" id="font-scale-range"
											min="85" max="130" step="5" value="100"
											aria-label="Font size slider"
											aria-valuemin="85" aria-valuemax="130" aria-valuenow="100">
									</div>
									<span class="font-slider-endlabel large" aria-hidden="true">A</span>
								</div>
								<button type="button" class="font-reset-link" id="font-reset-link" data-i18n="header.fontScale.reset">Reset to Default</button>
							</div>
						</div>

						
						<!-- 🎨 Unified Theme & Appearance Selector -->
						<div class="dropdown-container">
							<button type="button" class="btn-25d theme-selector" id="theme-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Theme & Appearance Selector">
								<span class="btn-icon">🎨</span>
								<span class="btn-text">Theme</span>
							</button>
							<ul class="custom-dropdown-menu" id="theme-menu" role="listbox">
								<!-- ☀️ / 🌙 / 💻 Semantic Radio Mode Switcher Segment -->
								<li class="dropdown-header-segment-wrapper" role="presentation">
									<fieldset class="theme-mode-segmented-bar" aria-label="Appearance Mode">
										<input type="radio" name="app-appearance-mode" id="mode-opt-light" value="light" class="mode-radio-input" ${(currentMode === 'light') ? 'checked' : ''}>
										<label for="mode-opt-light" class="mode-pill-label">
											<span class="mode-icon">☀️</span>
											<span class="mode-text">Light</span>
										</label>
										<input type="radio" name="app-appearance-mode" id="mode-opt-dark" value="dark" class="mode-radio-input" ${(currentMode === 'dark') ? 'checked' : ''}>
										<label for="mode-opt-dark" class="mode-pill-label">
											<span class="mode-icon">🌙</span>
											<span class="mode-text">Dark</span>
										</label>
										<input type="radio" name="app-appearance-mode" id="mode-opt-auto" value="auto" class="mode-radio-input" ${(currentMode === 'auto') ? 'checked' : ''}>
										<label for="mode-opt-auto" class="mode-pill-label">
											<span class="mode-icon">💻</span>
											<span class="mode-text">Auto</span>
										</label>
									</fieldset>
								</li>
								<li class="dropdown-divider" role="separator"></li>
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
						<!-- 🌐 Language Selector -->
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
						<a href="smart_card_ticket.html${cityParam}" class="nav-link ${activePage === 'recharge' ? 'active' : ''}" data-target="recharge">
							<span class="nav-icon"><svg><use href="#icon-recharge"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.recharge">Smart Card/ Tokken</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="passenger_support.html${cityParam}" class="nav-link ${activePage === 'passenger_support' ? 'active' : ''}" data-target="support">
							<span class="nav-icon"><svg><use href="#icon-support"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.passengerSupport">Passenger Support</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="other.html${cityParam}" class="nav-link ${activePage === 'other' ? 'active' : ''}" data-target="other">
							<span class="nav-icon"><svg><use href="#icon-other"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.other">Other</span>
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