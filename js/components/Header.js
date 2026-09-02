/**
 * Universal Class-Based Header Component & Global i18n Hub
 * Enterprise Single Source of Truth for rendering, theme switching, and global language translation.
 */
import { appStateStore } from "../core/app-state-store.js";
import i18n from "../core/i18n.js";
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
			<header class="main-header">
				<div class="logo-title-group">
					<img src="assets/images/site_icon.svg" alt="Metro Logo" class="site-logo">
					<h1 data-i18n="header.appName">YatraMarg</h1>
					<p data-i18n="header.tagLine">Maps • Routes • Fares • Journey Assistance</p>
				</div>

				<section class="toolbar">
					<div class="theme-selector">
						<label for="theme" data-i18n="header.themes.label">Theme:</label>
						<select name="theme" id="theme">
							<option value="light" ${currentTheme === 'light' ? 'selected' : ''} data-i18n="header.themes.light">Classic Light</option>
							<option value="dark" ${currentTheme === 'dark' ? 'selected' : ''} data-i18n="header.themes.dark">Sleek Dark</option>
							<option value="cyberpunk" ${currentTheme === 'cyberpunk' ? 'selected' : ''} data-i18n="header.themes.cyberpunk">Neon Cyberpunk</option>
							<option value="vintage" ${currentTheme === 'vintage' ? 'selected' : ''} data-i18n="header.themes.vintage">Vintage Retro</option>
							<option value="mint" ${currentTheme === 'mint' ? 'selected' : ''} data-i18n="header.themes.mint">Forest Mint</option>
							<option value="ghibli" ${currentTheme === 'ghibli' ? 'selected' : ''} data-i18n="header.themes.ghibli">Ghibli Nostalgia</option>
						</select>
					</div>
					<div class="lang-selector">
						<label for="language" data-i18n="header.language">Lang:</label>
						<select id="language" name="lang">
							<option value="en" ${currentLang === 'en' ? 'selected' : ''}>Eng</option>
							<option value="hi" ${currentLang === 'hi' ? 'selected' : ''}>हिन्दी</option>
						</select>
					</div>
				</section>
			</header>
			<nav class="header-nav" id="header-nav" aria-label="Header Navigation">
				<ul class="header-nav-list">
					<li class="header-nav-item">
						<a href="TransitNetworkSelector.html" class="${activePage === 'networks' ? 'active' : ''}" data-i18n="nav-header.networks">🌐 Networks</a>
					</li>
					<li class="header-nav-item">
						<a href="index.html" class="${activePage === 'home' ? 'active' : ''}" data-i18n="nav-header.home">🏠 Home</a>
					</li>
					<li class="header-nav-item">
						<a href="all_stations.html" class="${activePage === 'stations' ? 'active' : ''}" data-i18n="nav-header.stations">🚉 Stations</a>
					</li>
					<li class="header-nav-item">
						<a href="javascript:void(0)" id="nav-recharge-btn" class="${activePage === 'recharge' ? 'active' : ''}" data-i18n="nav-header.recharge">💳 Recharge Card</a>
					</li>
					<li class="header-nav-item">
						<a href="other.html" class="${activePage === 'others' ? 'active' : ''}" data-i18n="nav-header.others">🗂️ Others</a>
					</li>
					<li class="header-nav-item">
						<a href="help.html" class="${activePage === 'help' ? 'active' : ''}" data-i18n="nav-header.help">❓ Help</a>
					</li>
					<li class="header-nav-item">
						<a href="about.html" class="${activePage === 'about' ? 'active' : ''}" data-i18n="nav-header.about">ℹ️ About</a>
					</li>
				</ul>
			</nav>
		`;

	this.initEvents();

		// 🌟 Centrally execute & apply global i18n translations across the entire page
		try {
			await i18n.initI18n();
		} catch (err) {
			console.warn("[HeaderComponent] i18n auto-init notice:", err);
		}
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

        const themeSelect = document.getElementById('theme');

		if (themeSelect) {
			themeSelect.addEventListener('change', (e) => {
				appStateStore.setState({ currentTheme: e.target.value });
			});
		}

		const langSelect = document.getElementById('language');
		if (langSelect) {
			langSelect.addEventListener('change', async (e) => {
				// ⚡ StateStore ट्रिगर करेगा -> Dashboard को सिग्नल मिलेगा
				await appStateStore.setState({ currentLang: e.target.value });
			});
		}
	}
}