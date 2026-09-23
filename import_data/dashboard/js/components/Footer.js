/**
 * @file Footer.js
 * @module components/Footer
 * @description Centralized Universal Footer Component for Metro Audit Hub.
 */

export class FooterComponent {
	static render(containerId = 'globalFooter') {
		const container = document.getElementById(containerId);
		if (!container) return;

		const currentYear = new Date().getFullYear();

		container.className = 'global-footer';
		container.innerHTML = `
			<div class="footer-left">
				<span class="footer-brand font-mono">Metro Audit Hub </span>
				<span class="footer-sep">•</span>
				<span class="footer-note">Dovelop by ❤️</span>
			</div>
			<div class="footer-right">
				<a href="./help.html" class="footer-link">Documentation</a>
				<a href="./data_matrix.html" class="footer-link">Matrix</a>
				<span class="footer-sep">•</span>
				<span class="footer-copy font-mono">&copy; ${currentYear}</span>
			</div>
		`;
	}
}