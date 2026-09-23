/**
 * @file help.js
 * @module pages/help
 * @description Help & Architecture Guide Controller with Scroll Spy & Unified Navigation.
 */
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import i18n from '../core/i18n.js';

class HelpApp {
	#dom = {
		sidebar: document.getElementById('sidebar'),
		backdrop: document.getElementById('sidebarBackdrop'),
		docLinks: document.querySelectorAll('.sidebar-doc-link'),
		docCards: document.querySelectorAll('.doc-card'),
		viewport: document.querySelector('.main-viewport')
	};

	init() {
		this.#initHeaderAndFooter();
		this.#initScrollSpy();
		this.#bindSidebarEvents();
	}

	#initHeaderAndFooter() {
		// Master HeaderComponent ka universal toggle use karein
		HeaderComponent.render('globalHeader', 'help');
		FooterComponent.render('globalFooter');

		// Help page par Index sidebar by default open rahe
		if (this.#dom.sidebar && window.innerWidth > 768) {
			this.#dom.sidebar.classList.remove('collapsed');
			localStorage.setItem('sidebar_collapsed', 'false');
		}
	}

	#bindSidebarEvents() {
		const backdrop = this.#dom.backdrop || document.getElementById('sidebarBackdrop');
		if (backdrop) {
			backdrop.addEventListener('click', () => {
				this.#dom.sidebar?.classList.remove('is-open');
				backdrop.classList.add('hidden');
			});
		}

		// Mobile par link click karte hi drawer close ho jaye
		this.#dom.docLinks.forEach(link => {
			link.addEventListener('click', () => {
				if (window.innerWidth <= 768) {
					this.#dom.sidebar?.classList.remove('is-open');
					backdrop?.classList.add('hidden');
				}
			});
		});
	}

	#initScrollSpy() {
		if (!this.#dom.docCards.length || !this.#dom.docLinks.length) return;

		const viewport = this.#dom.viewport || document.querySelector('.main-viewport');

		const observer = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const id = entry.target.getAttribute('id');
					this.#dom.docLinks.forEach(link => {
						const href = link.getAttribute('href');
						if (href === `#${id}`) {
							link.classList.add('active');
						} else {
							link.classList.remove('active');
						}
					});
				}
			});
		}, {
			root: viewport,
			rootMargin: '-10% 0px -70% 0px',
			threshold: 0
		});

		this.#dom.docCards.forEach(card => observer.observe(card));
	}
}

document.addEventListener('DOMContentLoaded', async () => {
	if (i18n && typeof i18n.initI18n === 'function') {
		await i18n.initI18n();
	}
	const app = new HelpApp();
	app.init();
});