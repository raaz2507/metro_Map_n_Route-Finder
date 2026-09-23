/**
 * @file Header.js
 * @module components/Header
 * @description Master Top Header Component with Page Navigation & Integrated Preferences Toolbar.
 */
import i18n from '../core/i18n.js';

export class HeaderComponent {
	static render(containerId = 'globalHeader', activePage = 'admin', onToggleSidebar = null) {
		const container = document.getElementById(containerId);
		if (!container) return;

		const currentTheme = localStorage.getItem('theme') || 'dark';
		const currentSize = parseInt(localStorage.getItem('font_size_px') || '16', 10);
		const currentLang = localStorage.getItem('language') || 'en';
		document.documentElement.setAttribute('data-theme', currentTheme);
		document.documentElement.style.setProperty('--base-font-size', `${currentSize}px`);

		container.className = 'top-header';
		container.innerHTML = `
			<!-- ROW 1: BRAND LOGO + PREFERENCES TOOLBAR -->
			<div class="header-primary-row">
				<div class="header-left">
					<button id="sidebarToggleBtn" class="icon-btn" title="Toggle Sidebar" aria-label="Toggle navigation menu">
						<img src="./assets/icons/ui/menu-bars.svg" class="icon-sm" alt="Menu">
					</button>
					<div class="brand-logo-box">
						<img src="./assets/icons/ui/terminal.svg" class="icon-xs icon-white" alt="Engine Logo">
					</div>
					<div>
						<h1 class="brand-title" data-i18n="header.brand_title">Metro Audit Hub</h1>
						<p class="brand-subtitle" data-i18n="header.subtitle">Universal Pipeline Engine</p>
					</div>
				</div>

				<div class="header-right">
					<!-- UI Language Capsule -->
					<div class="capsule-box" title="Interface Language">
						<button data-set-lang="en" class="lang-select-btn ${currentLang === 'en' ? 'active' : ''}">EN</button>
						<button data-set-lang="hi" class="lang-select-btn ${currentLang === 'hi' ? 'active' : ''}">HI</button>
					</div>

					<!-- Font Size Slider Capsule -->
					<div class="capsule-box" title="Adjust Font Size Scale">
						<span class="font-indicator-min">a</span>
						<input type="range" id="fontSizeSlider" min="12" max="22" value="${currentSize}" step="1" class="font-range-input">
						<span class="font-indicator-max">A</span>
						<span id="fontSizeDisplay" class="font-display-badge">${currentSize}px</span>
					</div>

					<!-- Theme Switcher Capsule -->
					<div class="capsule-box" title="Theme Palette">
						<button data-set-theme="dark" class="theme-select-btn ${currentTheme === 'dark' ? 'active' : ''}" title="Dark Theme">🌙</button>
						<button data-set-theme="light" class="theme-select-btn ${currentTheme === 'light' ? 'active' : ''}" title="Light Theme">☀️</button>
						<button data-set-theme="spa" class="theme-select-btn ${currentTheme === 'spa' ? 'active' : ''}" title="Spa Theme">🌿</button>
						<button data-set-theme="bw" class="theme-select-btn ${currentTheme === 'bw' ? 'active' : ''}" title="B/W Theme">🖤</button>
					</div>

					<!-- Active Engine Indicator -->
					<div class="engine-status-pill">
						<span class="pulse-dot"></span>
						<span data-i18n="header.active_engine">Active Engine</span>
					</div>
				</div>
			</div>

			<!-- ROW 2: DEDICATED PAGE NAVIGATION TABS -->
			<div class="header-nav-row">
				<nav class="header-nav-tabs">
					<a href="./admin.html" class="nav-tab-item ${activePage === 'admin' ? 'active' : ''}">
						<img src="./assets/icons/ui/terminal.svg" class="icon-xs" alt="Admin">
						<span>Dashboard</span>
					</a>
					<a href="./production_bridge.html" class="nav-tab-item ${activePage === 'bridge' ? 'active' : ''}">
						<img src="./assets/icons/ui/sync.svg" class="icon-xs" alt="Bridge">
						<span data-i18n="header.production_bridge">Production Bridge</span>
					</a>
					<a href="./data_matrix.html" class="nav-tab-item ${activePage === 'matrix' ? 'active' : ''}">
						<img src="./assets/icons/ui/matrix.svg" class="icon-xs" alt="Matrix">
						<span data-i18n="header.data_matrix">Data Matrix</span>
					</a>
					<a href="./help.html" class="nav-tab-item ${activePage === 'help' ? 'active' : ''}">
						<img src="./assets/icons/ui/book-help.svg" class="icon-xs" alt="Help">
						<span data-i18n="header.help_docs">Help & Docs</span>
					</a>
				</nav>
			</div>
		`;

		this.bindEvents(container, onToggleSidebar);
	}

	static bindEvents(container, onToggleSidebar) {
		// 1. Sidebar Auto-Restore & Smart Toggle (DRY - Single Source of Truth)
		const sidebar = document.getElementById('sidebar');
		if (sidebar && localStorage.getItem('sidebar_collapsed') === 'true' && window.innerWidth > 768) {
			sidebar.classList.add('collapsed');
		}
		const toggleBtn = container.querySelector('#sidebarToggleBtn');
		if (toggleBtn) {
			toggleBtn.addEventListener('click', () => {
				if (onToggleSidebar) {
					onToggleSidebar();
					return;
				}
				const sb = document.getElementById('sidebar');
				if (!sb) return;
				const backdrop = document.getElementById('sidebarBackdrop');
				if (window.innerWidth <= 768) {
					const isOpen = sb.classList.toggle('is-open');
					if (backdrop) backdrop.classList.toggle('hidden', !isOpen);
				} else {
					const collapsed = sb.classList.toggle('collapsed');
					localStorage.setItem('sidebar_collapsed', collapsed);
				}
			});
		}
		// Theme Switcher
		container.querySelectorAll('.theme-select-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const theme = btn.getAttribute('data-set-theme');
				if (theme) {
					document.documentElement.setAttribute('data-theme', theme);
					localStorage.setItem('theme', theme);
					container.querySelectorAll('.theme-select-btn').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
				}
			});
		});

		// Font Size Slider
		const fontSlider = container.querySelector('#fontSizeSlider');
		const fontDisplay = container.querySelector('#fontSizeDisplay');
		fontSlider?.addEventListener('input', (e) => {
			const size = e.target.value;
			document.documentElement.style.setProperty('--base-font-size', `${size}px`);
			localStorage.setItem('font_size_px', size);
			if (fontDisplay) fontDisplay.textContent = `${size}px`;
		});

		// Language Buttons (Active Toggle + Instant Re-Translate)
		container.querySelectorAll('.lang-select-btn').forEach(btn => {
			btn.addEventListener('click', async () => {
				const lang = btn.getAttribute('data-set-lang');
				if (lang && i18n && typeof i18n.setLanguage === 'function') {
					await i18n.setLanguage(lang);
					container.querySelectorAll('.lang-select-btn').forEach(b => b.classList.remove('active'));
					btn.classList.add('active');
				}
			});
		});

		// Header render hote hi turant active language apply karein
		if (i18n && typeof i18n.applyTranslations === 'function') {
			i18n.applyTranslations();
		}
	}
}