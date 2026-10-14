/**
 * other.js - Transit Media & Metro Map Showcase Page Controller
 */
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';

document.addEventListener('DOMContentLoaded', () => {
	// Initialize global dynamic header and footer
	HeaderComponent.render('other');
	FooterComponent.render();
});
