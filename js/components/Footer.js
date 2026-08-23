/**
 * Universal Class-Based Footer Component (With Logo & Sleek Bottom Strip)
 */
export class FooterComponent {
    static render(targetContainerId = 'app-footer') {
        const container = document.getElementById(targetContainerId);
        if (!container) return;

        container.outerHTML = `
            <footer id="app-footer" class="site-footer">
                
                <!-- SECTION 1: TOP BRAND WITH SITE LOGO & DISCLAIMER -->
                <div class="footer-top-brand">
                    <div class="footer-logo-title">
                        <img src="./assets/images/site_icon.svg" alt="Metro Logo" class="footer-logo">
                        <h2 data-i18n="footer.brandTitle">Metro Map Generator</h2>
                    </div>
                    <p data-i18n="footer.brandDescription">Built for smarter urban transit navigation.</p>
                    <p class="footer-disclaimer" data-i18n="footer.disclaimer">⚠️ Route, fare and travel information are provided for reference only.</p>
                </div>

                <!-- SECTION 2: MIDDLE MAIN CONTENT (RESPONSIVE FLEX WRAP) -->
                <div class="footer-middle-content">
                    
                    <!-- Quick Navigation Links -->
                    <nav class="footer-nav" aria-label="Footer Navigation">
                        <ul class="footer-nav-list">
                            <li class="footer-nav-item"><a href="about.html" data-i18n="footer.about">About</a></li>
                            <li class="footer-nav-item"><a href="#" data-i18n="footer.bookTicket">Book Ticket</a></li>
                            <li class="footer-nav-item"><a href="https://github.com/" data-i18n="footer.github">GitHub</a></li>
                        </ul>
                    </nav>

                    <!-- App QR Code & Features Card -->
                    <div class="footer-app-info">
                        <div class="qr-code">
                            <img src="./assets/images/qr-code.png" alt="QR code for Metro Map Generator">
                        </div>
                        <div class="app-details">
                            <h3 data-i18n="footer.appTitle">Metro Map Generator</h3>
                            <p data-i18n="footer.qrDescription">Scan the QR code to quickly open this application on your mobile device.</p>
                            <ul class="footer-feature-list">
                                <li class="footer-feature-item" data-i18n="footer.interactiveMetroMap">Interactive Metro Map</li>
                                <li class="footer-feature-item" data-i18n="footer.routeFinder">Route Finder</li>
                                <li class="footer-feature-item" data-i18n="footer.fareCalculator">Fare Calculator</li>
                                <li class="footer-feature-item" data-i18n="footer.shortestRoutes">Shortest & Least Interchange Routes</li>
                                <li class="footer-feature-item" data-i18n="footer.mobileFriendly">Mobile Friendly Design</li>
                            </ul>
                        </div>
                    </div>

                </div>

                <!-- SECTION 3: SLEEK 1-LINE BOTTOM CREDIT STRIP -->
                <div class="footer-bottom-credit">
                    <p data-i18n="footer.developedBy">&copy; Developed with ❤️</p>
                </div>

            </footer>
        `;
    }
}

/*
<footer class="site-footer">
		
		<!-- Footer Navigation -->
		<nav class="footer-nav" aria-label="Footer Navigation">
			<h2 class="visually-hidden" data-i18n="footer.footerNavigation">Footer Navigation</h2>
			<ul class="footer-nav-list">
				<!-- class="footer-links" -->
				<li class="footer-nav-item" ><a href="about.html" data-i18n="footer.about">About</a></li>
				<li class="footer-nav-item" ><a href="#" data-i18n="footer.bookTicket">Book Ticket</a></li>
				<li class="footer-nav-item" ><a href="https://github.com/" data-i18n="footer.github">GitHub</a></li>
			</ul>
		</nav>
		<!-- QR Code & Site Information -->
		<section class="footer-app-info">
			<div class="qr-code">
				<img src="./assets/images/qr-code.png" alt="QR code for Metro Map Generator">
			</div>

			<div class="app-details">
				<h2 data-i18n="footer.appTitle">Metro Map Generator</h2>
				<p data-i18n="footer.qrDescription"> Scan the QR code to quickly open this application on your mobile device. </p>

				<h3 data-i18n="footer.features">Features</h3>
				<ul class="footer-feature-list">
					<li class="footer-feature-item" data-i18n="footer.interactiveMetroMap">Interactive Metro Map</li>
					<li class="footer-feature-item" data-i18n="footer.routeFinder">Route Finder</li>
					<li class="footer-feature-item" data-i18n="footer.fareCalculator">Fare Calculator</li>
					<li class="footer-feature-item" data-i18n="footer.shortestRoutes">Shortest & Least Interchange Routes</li>
					<li class="footer-feature-item" data-i18n="footer.mobileFriendly">Mobile Friendly Design</li>
				</ul>
			</div>
		</section>
		<!-- Brand Information -->
		<div class="footer-brand">
			<h2 class="footer-title" data-i18n="footer.brandTitle">Metro Map Generator</h2>
			<p data-i18n="footer.brandDescription">Built for smarter urban transit navigation.</p>
			<p data-i18n="footer.disclaimer">⚠️ Route, fare and travel information are provided for reference only.</p>
			<p data-i18n="footer.developedBy">&copy; Dovelop by ❤️</p>
		</div>
	</footer>

*/