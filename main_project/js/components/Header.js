/**
 * Universal Class-Based Header Component & Global i18n Hub
 * Enterprise Single Source of Truth for rendering, theme switching, and global language translation.
 */
import { appStateStore } from "../core/app-state-store.js";
import i18n, { SUPPORTED_LANGUAGES } from "../core/i18n.js";
import { RechargeModalComponent } from "./RechargeModal.js";

export class HeaderComponent {
	static async render(activePage = 'home', targetContainerId = 'app-header') {
		const container = document.getElementById(targetContainerId);
		if (!container) return;

		const currentTheme = localStorage.getItem('app-theme') || localStorage.getItem('metro-theme') || 'light';
		const currentLang = localStorage.getItem('app-lang') || localStorage.getItem('language') || 'en';

		// Set initial theme & lang attributes on body
		document.body.setAttribute('data-theme', currentTheme);
		document.body.setAttribute('data-lang', currentLang);

		container.innerHTML = `
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
						<div class="dropdown-container">
							<button type="button" class="btn-25d theme-selector" id="theme-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Theme Selector">
								<span class="btn-icon">🌙</span>
								<span class="btn-text">Theme</span>
							</button>
							<ul class="custom-dropdown-menu" id="theme-menu" role="listbox">
								<li class="custom-dropdown-item ${currentTheme === 'light' ? 'active' : ''}" role="option" data-value="light" data-i18n="header.themes.light">Classic Light</li>
								<li class="custom-dropdown-item ${currentTheme === 'dark' ? 'active' : ''}" role="option" data-value="dark" data-i18n="header.themes.dark">Sleek Dark</li>
								<li class="custom-dropdown-item ${currentTheme === 'cyberpunk' ? 'active' : ''}" role="option" data-value="cyberpunk" data-i18n="header.themes.cyberpunk">Neon Cyberpunk</li>
								<li class="custom-dropdown-item ${currentTheme === 'vintage' ? 'active' : ''}" role="option" data-value="vintage" data-i18n="header.themes.vintage">Vintage Retro</li>
								<li class="custom-dropdown-item ${currentTheme === 'mint' ? 'active' : ''}" role="option" data-value="mint" data-i18n="header.themes.mint">Forest Mint</li>
								<li class="custom-dropdown-item ${currentTheme === 'ghibli' ? 'active' : ''}" role="option" data-value="ghibli" data-i18n="header.themes.ghibli">Ghibli Nostalgia</li>
							</ul>
						</div>
						<div class="dropdown-container">
							<button type="button" class="btn-25d lang-selector" id="lang-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="Language Selector">
								<span class="btn-icon">🌐</span>
								<span class="btn-text">${SUPPORTED_LANGUAGES.find(l => l.code === currentLang)?.short || currentLang.toUpperCase()}</span>
							</button>
							<ul class="custom-dropdown-menu" id="lang-menu" role="listbox">
								${SUPPORTED_LANGUAGES.map(l => `
									<li class="custom-dropdown-item ${currentLang === l.code ? 'active' : ''}" role="option" data-value="${l.code}">
										${l.label}
									</li>
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
						<a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}" data-target="home">
							<span class="nav-icon"><svg><use href="#icon-home"></use></svg></span>
							<span class="nav-label" data-i18n="nav-header.home">Home</span>
						</a>
					</li>
					<li class="header-nav-item">
						<a href="all_stations.html" class="nav-link ${activePage === 'stations' ? 'active' : ''}" data-target="stations">
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
						<a href="passenger_support.html" class="nav-link ${activePage === 'passenger_support' ? 'active' : ''}" data-target="support">
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
		// Recharge Modal Trigger
		const rechargeBtn = document.getElementById('nav-recharge-btn');
		if (rechargeBtn) {
			rechargeBtn.addEventListener('click', (e) => {
				e.preventDefault();
				RechargeModalComponent.getInstance().open();
			});
		}

				this.#setupDropdown('theme-btn', 'theme-menu', (val) => {
			appStateStore.setState({ currentTheme: val });
		});

		this.#setupDropdown('lang-btn', 'lang-menu', async (val) => {
			await appStateStore.setState({ currentLang: val });
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
}