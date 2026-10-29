/**
 * Universal Class-Based Header Component & Global i18n Hub
 * Enterprise Single Source of Truth for rendering, theme switching, and global language translation.
 */
import { appStateStore } from "../core/app-state-store.js";
import i18n, { SUPPORTED_LANGUAGES, LANGUAGE_CATEGORIES } from "../core/i18n.js";
import { themeEngine } from "../core/ThemeEngine.js";
import { pwaManager } from "../core/PwaManager.js";
import { Toast } from "./Toast.js";


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

		// Centrally execute & apply global i18n translations across the entire page
		try {
			await i18n.initI18n();
		} catch (err) {
			console.warn("[HeaderComponent] i18n auto-init notice:", err);
		}

		const availableThemes = themeEngine.getThemes();
		container.innerHTML = HeaderComponent.#HTMLStrucher(activePage, currentTheme, savedMode, currentLang, availableThemes);

		// Re-apply translations for newly injected header elements
		if (typeof i18n?.applyTranslations === 'function') {
			i18n.applyTranslations();
		}

		this.initEvents();

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

		// Mobile 2.5D Header Navigation Expand Toggle
		this.#setupHeaderNavToggle();

		// Auto-realign any active open dropdown on window resize / orientation change
		window.addEventListener('resize', () => {
			const openMenu = document.querySelector('.custom-dropdown-menu.show, .font-scale-panel.show, .city-dropdown-menu.show');
			if (openMenu) {
				HeaderComponent.#adjustDropdownPosition(openMenu);
			}
		});
	}

	/**
	 * Mobile Header Navigation 2.5D Expand/Collapse Handler
	 */
	static buildThemeMenuItems(currentTheme, availableThemes = []) {
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
	}

	static updateThemeMenuItems(themeMenu, currentTheme, availableThemes = []) {
		if (!themeMenu) return;
		const divider = themeMenu.querySelector('.dropdown-divider');
		if (!divider) return;
		while (divider.nextElementSibling) {
			divider.nextElementSibling.remove();
		}
		const temp = document.createElement('ul');
		temp.innerHTML = HeaderComponent.buildThemeMenuItems(currentTheme, availableThemes);
		while (temp.firstElementChild) {
			divider.parentNode.appendChild(temp.firstElementChild);
		}
	}

	static #setupHeaderNavToggle() {
		const toggleBtn = document.getElementById('header-nav-toggle-btn');
		const bogieContainer = document.getElementById('nav-bogie-container');
		const badge = document.getElementById('header-nav-badge-val');
		const expandBar = bogieContainer?.querySelector('.header-nav-expand-bar');
		if (!toggleBtn || !bogieContainer) return;

		const handleToggle = (e) => {
			if (e) e.stopPropagation();
			const isExpanded = bogieContainer.classList.toggle('expanded');
			toggleBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
		};

		toggleBtn.addEventListener('click', handleToggle);
		if (expandBar) {
			expandBar.addEventListener('click', (e) => {
				if (e.target !== toggleBtn && !toggleBtn.contains(e.target)) {
					handleToggle(e);
				}
			});
		}
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
			panel.style.transform = '';
			btn.setAttribute('aria-expanded', 'false');
		};

		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = panel.classList.contains('show');
			HeaderComponent.#closeAllDropdowns(panel);
			if (!isOpen) {
				panel.classList.add('show');
				btn.setAttribute('aria-expanded', 'true');
				HeaderComponent.#adjustDropdownPosition(panel);
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

		// Resolve active city & active network
		const urlParams   = new URLSearchParams(window.location.search);
		const activeCity  = urlParams.get('city') || localStorage.getItem('active_city') || 'delhi_ncr';
		let activeNetwork = urlParams.get('network') || urlParams.get('net') || localStorage.getItem('active_network') || '';
		if (activeNetwork === 'all') activeNetwork = '';
		const activeLang  = localStorage.getItem('app-lang') || localStorage.getItem('language') || 'en';

		// --- Fetch countries manifest + india registry with Strict Locale Dictionaries ---
		let countriesManifest = null;
		let indiaRegistry     = null;

		try {
			const [cmRes, irRes, cmLocRes, irLocRes] = await Promise.all([
				fetch('data/countries_manifest.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => null),
				fetch('data/india/india_transit_registry.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => null),
				fetch(`locales/${activeLang}/countries_manifest_locale.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => null),
				fetch(`locales/${activeLang}/india/transit_registry_locale.json`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch(() => null)
			]);

			countriesManifest = cmRes;
			indiaRegistry     = irRes;

			// Strict Locale Injection with robust fallback
			const cmLoc = cmLocRes?.countries || {};
			for (const [cKey, cVal] of Object.entries(countriesManifest?.countries || {})) {
				cVal.name = cmLoc[cKey]?.name || cVal.name || cKey;
			}

			const irLoc = irLocRes?.registry?.cities || {};
			for (const [cityK, cityV] of Object.entries(indiaRegistry?.cities || {})) {
				const locCity = irLoc[cityK] || {};
				if (locCity.name) cityV.name = locCity.name;
				if (locCity.state) cityV.state = locCity.state;
				if (cityV.networks) {
					for (const [netK, netV] of Object.entries(cityV.networks)) {
						const locNet = locCity.networks?.[netK] || {};
						if (locNet.name) netV.name = locNet.name;
						if (locNet.operator) netV.operator = locNet.operator;
					}
				}
			}
		} catch (_) { /* silent */ }

		const resolveCityName = (cityKey, cityMeta) => {
			if (typeof cityMeta?.name === 'string' && cityMeta.name.trim()) {
				return cityMeta.name;
			}
			return cityMeta?.name?.[activeLang] || cityMeta?.name?.en || cityKey;
		};

		const resolveNetName = (netKey, netMeta) => {
			if (typeof netMeta?.name === 'string' && netMeta.name.trim()) {
				return netMeta.name;
			}
			return netMeta?.name?.[activeLang] || netMeta?.name?.en || netKey;
		};

		// --- Build pill label from registry (City or specific Network) ---
		const buildPillLabel = (cityKey, netKey) => {
			if (!indiaRegistry?.cities) return { flag: '🏙', name: cityKey };
			const cityData = indiaRegistry.cities[cityKey];
			if (!cityData) return { flag: '🏙', name: cityKey };
			const flag = countriesManifest?.countries?.india?.flag || '🇮🇳';

			if (netKey && cityData.networks?.[netKey]) {
				const netData = cityData.networks[netKey];
				const netName = resolveNetName(netKey, netData);
				return { flag, name: netName };
			}

			return {
				flag,
				name: resolveCityName(cityKey, cityData)
			};
		};

		const { flag, name } = buildPillLabel(activeCity, activeNetwork);
		if (flagEl) flagEl.textContent = flag;
		if (nameEl) nameEl.textContent = name;

		// --- Build dropdown items ---
		let html = '';

		if (countriesManifest?.countries && indiaRegistry?.cities) {
			for (const [countryKey, countryMeta] of Object.entries(countriesManifest.countries)) {
				const countryName = countryMeta.name || countryKey;
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
							const nameA = resolveCityName(keyA, cityA);
							const nameB = resolveCityName(keyB, cityB);
							return nameA.localeCompare(nameB, activeLang, { sensitivity: 'base' });
						});

					// Separate into Combined (Group) Networks and Individual Networks
					const combinedCities = availableCities.filter(([, c]) => {
						const nets = Object.values(c.networks || {});
						return nets.length > 1;
					});
					const singleCities = availableCities.filter(([, c]) => {
						const nets = Object.values(c.networks || {});
						return nets.length <= 1;
					});

					const getI18nLabel = (key, fallback) => {
						if (!i18n?.t) return fallback;
						const val = i18n.t(key);
						return (val && val !== key) ? val : fallback;
					};

					const combinedLabel = getI18nLabel('header.citySelector.combinedNetworks', 'Combined Regional Hubs');
					const singleLabel   = getI18nLabel('header.citySelector.singleNetworks', 'Standalone Transit Networks');
					const allNetSuffix  = getI18nLabel('pages.networks.card.allNetworksSuffix', 'All Networks');

					// Render multi-network groups with their independent network sub-items
					const renderCombinedCityGroups = (citiesList) => {
						let itemsHtml = '';
						for (const [cityKey, cityMeta] of citiesList) {
							const cityName = resolveCityName(cityKey, cityMeta);
							const isCitySelected = cityKey === activeCity;
							const isAllSelected = isCitySelected && (!activeNetwork || activeNetwork === 'all');
							const safeCityKey = cityKey.replace(/[^a-z0-9_-]/gi, '');
							
							// 1. Regional Hub / All Networks Option
							itemsHtml += `<li class="city-dropdown-item group-hub-item ${isAllSelected ? 'active' : ''}"
								role="option"
								aria-selected="${isAllSelected}"
								data-city="${safeCityKey}"
								data-network="all"
								tabindex="0">
								<span>${countryFlag} ${cityName} <small class="text-muted">(${allNetSuffix})</small></span>
							</li>`;

							// 2. Individual Operational Transit Networks under this City
							const networks = cityMeta.networks || {};
							for (const [netKey, netMeta] of Object.entries(networks)) {
								// Only operational or data-ready networks
								if (netMeta.hasData !== true && netMeta.status !== 'operational' && netMeta.status !== 'operational_partial') {
									continue;
								}
								const netName = resolveNetName(netKey, netMeta);
								const isNetSelected = isCitySelected && activeNetwork === netKey;
								const safeNetKey = netKey.replace(/[^a-z0-9_-]/gi, '');
								const mode = netMeta.mode || 'Metro';

								itemsHtml += `<li class="city-dropdown-item network-sub-item ${isNetSelected ? 'active' : ''}"
									role="option"
									aria-selected="${isNetSelected}"
									data-city="${safeCityKey}"
									data-network="${safeNetKey}"
									tabindex="0">
									<span class="sub-network-bullet">↳</span>
									<span class="sub-network-name">${netName}</span>
									<span class="sub-network-mode-pill">${mode}</span>
								</li>`;
							}
						}
						return itemsHtml;
					};

					const renderSingleCityItems = (citiesList) => {
						let itemsHtml = '';
						for (const [cityKey, cityMeta] of citiesList) {
							const cityName = resolveCityName(cityKey, cityMeta);
							const isSelected = cityKey === activeCity;
							const safeCityKey = cityKey.replace(/[^a-z0-9_-]/gi, '');
							itemsHtml += `<li class="city-dropdown-item ${isSelected ? 'active' : ''}"
								role="option"
								aria-selected="${isSelected}"
								data-city="${safeCityKey}"
								data-network=""
								tabindex="0">
								<span>${countryFlag} ${cityName}</span>
							</li>`;
						}
						return itemsHtml;
					};

					if (combinedCities.length > 0) {
						html += `<li class="dropdown-sub-category-header" role="presentation">
							<span data-i18n="header.citySelector.combinedNetworks">${combinedLabel}</span>
						</li>`;
						html += renderCombinedCityGroups(combinedCities);
					}

					if (singleCities.length > 0) {
						html += `<li class="dropdown-sub-category-header" role="presentation">
							<span data-i18n="header.citySelector.singleNetworks">${singleLabel}</span>
						</li>`;
						html += renderSingleCityItems(singleCities);
					}
				} else if (!isActive) {
					// Upcoming country — no city list, just the header badge
				}
			}
		}

		menu.innerHTML = html;
		if (typeof i18n?.applyTranslations === 'function') {
			i18n.applyTranslations();
		}

		// --- Bind click events on items ---
		menu.querySelectorAll('.city-dropdown-item[data-city]').forEach(item => {
			item.addEventListener('click', (e) => {
				e.stopPropagation();
				const selectedCity = item.getAttribute('data-city');
				const selectedNetwork = item.getAttribute('data-network') || '';

				if (!selectedCity) { 
					closeMenu(); 
					return; 
				}

				const currNet = activeNetwork || 'all';
				const targetNet = selectedNetwork || 'all';
				if (selectedCity === activeCity && targetNet === currNet) {
					closeMenu();
					return;
				}

				localStorage.setItem('active_city', selectedCity);
				if (selectedNetwork && selectedNetwork !== 'all') {
					localStorage.setItem('active_network', selectedNetwork);
				} else {
					localStorage.removeItem('active_network');
				}

				// Navigate: Preserve current page pathname and other params, update city & network
				const newParams = new URLSearchParams(window.location.search);
				newParams.set('city', selectedCity);
				if (selectedNetwork && selectedNetwork !== 'all') {
					newParams.set('network', selectedNetwork);
				} else {
					newParams.delete('network');
				}
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
			menu.style.transform = '';
			btn.setAttribute('aria-expanded', 'false');
		};

		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = menu.classList.contains('show');
			HeaderComponent.#closeAllDropdowns(menu);
			if (!isOpen) {
				menu.classList.add('show');
				btn.setAttribute('aria-expanded', 'true');
				HeaderComponent.#adjustDropdownPosition(menu);
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

		// Prevent dropdown menu from closing on segmented bar clicks & reliably handle touch/click on Android
		const bar = document.querySelector('.theme-mode-segmented-bar');
		if (bar) {
			bar.addEventListener('click', (e) => e.stopPropagation());

			// Direct pill tap handling for Android touch browsers
			const labels = bar.querySelectorAll('.mode-pill-label');
			labels.forEach(label => {
				const activate = (e) => {
					e.stopPropagation();
					const targetId = label.getAttribute('for');
					const radio = document.getElementById(targetId);
					if (radio) {
						radio.checked = true;
						applyMode(radio.value);
					}
				};
				label.addEventListener('click', activate);
				label.addEventListener('touchend', (e) => {
					e.preventDefault();
					activate(e);
				});
			});

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
			menu.style.transform = '';
			btn.setAttribute('aria-expanded', 'false');
		};

		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			const isOpen = menu.classList.contains('show');
			HeaderComponent.#closeAllDropdowns(menu);
			if (!isOpen) {
				menu.classList.add('show');
				btn.setAttribute('aria-expanded', 'true');
				HeaderComponent.#adjustDropdownPosition(menu);
			} else {
				close();
			}
		});

		const handleItemSelect = (e) => {
			const item = e.target.closest('.custom-dropdown-item');
			if (!item || !menu.contains(item)) return;
			e.stopPropagation();
			const val = item.getAttribute('data-value');
			if (!val) return;
			menu.querySelectorAll('.custom-dropdown-item').forEach(i => i.classList.remove('active'));
			item.classList.add('active');
			close();
			if (onSelectCallback) onSelectCallback(val);
		};
		menu.addEventListener('click', handleItemSelect);
		menu.addEventListener('touchend', (e) => {
			if (e.target.closest('.custom-dropdown-item')) {
				e.preventDefault();
				handleItemSelect(e);
			}
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
				m.style.transform = '';
				const container = m.closest('.dropdown-container');
				const trigger = container ? container.querySelector('[aria-expanded="true"]') : null;
				if (trigger) trigger.setAttribute('aria-expanded', 'false');
			}
		});
	}

	/**
	 * Smart Viewport Boundary Collision Adjuster
	 * Keeps dropdown centered under trigger button by default (translateX(-50%)).
	 * Only shifts left or right if there is not enough space at the viewport edges.
	 */
	static #adjustDropdownPosition(menu) {
		if (!menu) return;
		menu.style.transform = '';

		const rect = menu.getBoundingClientRect();
		const margin = 12; // 12px safe margin from viewport edge
		const viewportWidth = window.innerWidth;

		if (rect.right > viewportWidth - margin) {
			const overflow = Math.ceil(rect.right - (viewportWidth - margin));
			menu.style.transform = `translateX(calc(-50% - ${overflow}px))`;
		} else if (rect.left < margin) {
			const underflow = Math.ceil(margin - rect.left);
			menu.style.transform = `translateX(calc(-50% + ${underflow}px))`;
		}
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
								<symbol id="icon-tourist" viewBox="0 0 24 24">
					<path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-6a3 3 0 0 1 6 0v6M10 9h4"/>
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
							<ul class="city-dropdown-menu" id="city-dropdown-menu" role="listbox" aria-label="Select City" data-i18n-aria-label="header.citySelector.label"></ul>
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
							<button type="button" class="btn-25d theme-selector" id="theme-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Theme & Appearance Selector" data-i18n-aria-label="header.theme.ariaLabel">
								<span class="btn-icon">🎨</span>
								<span class="btn-text" data-i18n="header.theme.btnText">Theme</span>
							</button>
							<ul class="custom-dropdown-menu" id="theme-menu" role="listbox">
								<!-- ☀️ / 🌙 / 💻 Semantic Radio Mode Switcher Segment -->
								<li class="dropdown-header-segment-wrapper" role="presentation">
									<fieldset class="theme-mode-segmented-bar" aria-label="Appearance Mode" data-i18n-aria-label="header.mode.appearanceMode">
										<span class="theme-mode-glider" aria-hidden="true"></span>
										<input type="radio" name="app-appearance-mode" id="mode-opt-light" value="light" class="mode-radio-input" ${(currentMode === 'light') ? 'checked' : ''}>
										<label for="mode-opt-light" class="mode-pill-label">
											<span class="mode-icon">☀️</span>
											<span class="mode-text" data-i18n="header.mode.light">Light</span>
										</label>
										<input type="radio" name="app-appearance-mode" id="mode-opt-dark" value="dark" class="mode-radio-input" ${(currentMode === 'dark') ? 'checked' : ''}>
										<label for="mode-opt-dark" class="mode-pill-label">
											<span class="mode-icon">🌙</span>
											<span class="mode-text" data-i18n="header.mode.dark">Dark</span>
										</label>
										<input type="radio" name="app-appearance-mode" id="mode-opt-auto" value="auto" class="mode-radio-input" ${(currentMode === 'auto') ? 'checked' : ''}>
										<label for="mode-opt-auto" class="mode-pill-label">
											<span class="mode-icon">💻</span>
											<span class="mode-text" data-i18n="header.mode.auto">Auto</span>
										</label>
									</fieldset>
								</li>
								<li class="dropdown-divider" id="theme-menu-divider" role="separator"></li>
								${HeaderComponent.buildThemeMenuItems(currentTheme, availableThemes)}
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

			${(() => {
				const navItemsDef = [
					{
						target: 'networks',
						active: activePage === 'networks',
						href: 'TransitNetworkSelector.html',
						icon: 'icon-networks',
						i18n: 'nav-header.networks',
						label: 'Networks'
					},
					{
						target: 'home',
						active: activePage === 'home',
						href: `index.html${cityParam}`,
						icon: 'icon-home',
						i18n: 'nav-header.home',
						label: 'Home'
					},
					{
						target: 'stations',
						active: activePage === 'stations',
						href: `all_stations.html${cityParam}`,
						icon: 'icon-stations',
						i18n: 'nav-header.stations',
						label: 'Stations'
					},
					{
						target: 'tourist',
						active: activePage === 'tourist' || activePage === 'tourist_places',
						href: `tourist_places.html${cityParam}`,
						icon: 'icon-tourist',
						i18n: 'nav-header.tourist',
						label: 'Tourist Places'
					},
					{
						target: 'recharge',
						active: activePage === 'recharge',
						href: `smart_card_ticket.html${cityParam}`,
						icon: 'icon-recharge',
						i18n: 'nav-header.recharge',
						label: 'Smart Card/ Tokken'
					},
					{
						target: 'support',
						active: activePage === 'passenger_support' || activePage === 'support',
						href: `passenger_support.html${cityParam}`,
						icon: 'icon-support',
						i18n: 'nav-header.passengerSupport',
						label: 'Passenger Support'
					},
					{
						target: 'other',
						active: activePage === 'other',
						href: `other.html${cityParam}`,
						icon: 'icon-other',
						i18n: 'nav-header.other',
						label: 'Other'
					},
					{
						target: 'help',
						active: activePage === 'help',
						href: 'help.html',
						icon: 'icon-help',
						i18n: 'nav-header.help',
						label: 'Help'
					},
					{
						target: 'about',
						active: activePage === 'about',
						href: 'about.html',
						icon: 'icon-about',
						i18n: 'nav-header.about',
						label: 'About'
					}
				];

				// 💡 Smart Row Flip: Active Page's row always appears in Row 1 on mobile
				const isGroupBActive = navItemsDef.slice(4).some(item => item.active);
				const primaryItems = isGroupBActive ? navItemsDef.slice(4) : navItemsDef.slice(0, 4);
				const secondaryItems = isGroupBActive ? navItemsDef.slice(0, 4) : navItemsDef.slice(4);

				const renderNavItem = (item) => `
					<li class="header-nav-item" data-target="${item.target}">
						<a href="${item.href}" class="nav-link ${item.active ? 'active' : ''}" data-target="${item.target}">
							<span class="nav-icon"><svg><use href="#${item.icon}"></use></svg></span>
							<span class="nav-label" data-i18n="${item.i18n}">${item.label}</span>
						</a>
					</li>
				`;

				return `
					<!-- Retro Ticket Stub Navigation Bar with Blueprint Stroke Draw -->
					<nav class="header-nav" id="header-nav" aria-label="Header Navigation">
						<div class="nav-bogie-container" id="nav-bogie-container"${isGroupBActive ? ' data-group-flipped="true"' : ''}>
							<ul class="header-nav-list nav-primary-group">
								${primaryItems.map(renderNavItem).join('')}
							</ul>
							<div class="nav-expandable-tray">
								<div class="nav-tray-inner">
									<ul class="header-nav-list nav-secondary-group">
										${secondaryItems.map(renderNavItem).join('')}
									</ul>
								</div>
							</div>
							<div class="header-nav-expand-bar">
								<button type="button" class="nav-expand-btn-right" id="header-nav-toggle-btn" aria-label="Toggle all navigation links" aria-expanded="false">
									<span class="nav-btn-badge" id="header-nav-badge-val">+4</span>
									<span class="nav-chevron-icon" id="header-nav-chevron">▼</span>
								</button>
							</div>
						</div>
					</nav>
				`;
			})()}
		`;
	}
}