/**
 * other.js - Transit Media & Metro Map Showcase Page Controller
 */
import { HeaderComponent } from '../components/header.js';
import { FooterComponent } from '../components/footer.js';

document.addEventListener('DOMContentLoaded', () => {
	// Initialize global dynamic header and footer
	HeaderComponent.render('other');
	FooterComponent.render();
});
