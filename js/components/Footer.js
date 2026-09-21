/**
 * Universal Class-Based Footer Component (With Logo & Sleek Bottom Strip)
 */
export class FooterComponent {
	static render(targetContainerId = 'app-footer') {
		const container = document.getElementById(targetContainerId);
		if (!container) return;

		container.outerHTML = `
            <footer id="app-footer" class="site-footer">
                
                <!-- MAIN 2-COLUMN CONTENT ROW (BRAND + MOBILE PASS) -->
                <div class="footer-main-row">
                    
                    <!-- COLUMN 1: BRAND IDENTITY & DISCLAIMER -->
                    <div class="footer-brand-col">
                        <div class="footer-logo-title">
                            <img src="./assets/images/site_icon.svg" alt="YatraMarg Logo" class="footer-logo">
                            <div>
                                <h2 data-i18n="header.appName">YatraMarg</h2>
                                <span class="footer-brand-tagline">Metro Navigator</span>
                            </div>
                        </div>
                        <p class="footer-desc" data-i18n="footer.brandDescription">Built for smarter urban transit navigation and hassle-free metro commutes.</p>
                        <div class="footer-disclaimer-badge">
                            <span data-i18n="footer.disclaimer">⚠️ Route, fare and travel data are provided for reference only.</span>
                        </div>
                    </div>

                    <!-- COLUMN 2: TACTILE 2.5D MOBILE PASS CARD -->
                    <div class="footer-pass-col">
                        <div class="footer-pass-card">
                            <div class="footer-qr-wrapper">
                                <img src="./assets/images/qr-code.png" alt="Scan QR for YatraMarg" class="footer-qr-img">
                            </div>
                            <div class="footer-pass-info">
                                <span class="footer-pass-chip">Scan &amp; Ride</span>
                                <h3 data-i18n="footer.appTitle">YatraMarg Mobile</h3>
                                <p data-i18n="footer.qrDescription">Scan the QR code to quickly open this application on your mobile device.</p>
                            </div>
                        </div>
                    </div>

                </div>

                <!-- BOTTOM CREDIT STRIP -->
                <div class="footer-bottom-credit">
                    <p class="footer-copyright">&copy; 2026 <strong data-i18n="header.appName">YatraMarg</strong> Transit Portal. All rights reserved.</p>
                    <p class="footer-dev-credit" data-i18n="footer.developedBy">Developed with ❤️ for Metro Commuters</p>
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