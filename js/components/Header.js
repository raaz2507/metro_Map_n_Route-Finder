/**
 * Universal Class-Based Header Component
 * Handles rendering, active page link highlighting, theme switching, and language selector syncing.
 */
export class HeaderComponent {
        static render(activePage = 'home', targetContainerId = 'app-header') {
        const container = document.getElementById(targetContainerId);
        if (!container) return;

        const currentTheme = localStorage.getItem('app-theme') || 'light';
        const currentLang = localStorage.getItem('app-lang') || 'en';

        // Set initial theme & lang attributes on body
        document.body.setAttribute('data-theme', currentTheme);
        document.body.setAttribute('data-lang', currentLang);

        container.innerHTML = `
            <header class="main-header">
                <div class="logo-title-group">
                    <img src="assets/images/site_icon.svg" alt="Metro Logo" class="site-logo">
                    <h1>Metro Map Generator</h1>
                </div>

                <section class="toolbar">
                    <div class="theme-selector">
                        <label for="theme" data-i18n="home.theme">Theme:</label>
                        <select name="theme" id="theme">
                            <option value="light" ${currentTheme === 'light' ? 'selected' : ''} data-i18n="themes.light">Classic Light</option>
                            <option value="dark" ${currentTheme === 'dark' ? 'selected' : ''} data-i18n="themes.dark">Sleek Dark</option>
                            <option value="cyberpunk" ${currentTheme === 'cyberpunk' ? 'selected' : ''} data-i18n="themes.cyberpunk">Neon Cyberpunk</option>
                            <option value="vintage" ${currentTheme === 'vintage' ? 'selected' : ''} data-i18n="themes.vintage">Vintage Retro</option>
                            <option value="mint" ${currentTheme === 'mint' ? 'selected' : ''} data-i18n="themes.mint">Forest Mint</option>
                            <option value="ghibli" ${currentTheme === 'ghibli' ? 'selected' : ''} data-i18n="themes.ghibli">Ghibli Nostalgia</option>
                        </select>
                    </div>
                    <div class="lang-selector">
                        <label for="language" data-i18n="home.language">Lang:</label>
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
                        <a href="index.html" class="${activePage === 'home' ? 'active' : ''}" data-i18n="nav-header.home">🏠 Home</a>
                    </li>
                     <!-- 🚉 ALL STATIONS DIRECTORY LINK -->
                    <li class="header-nav-item">
                        <a href="all_stations.html" class="${activePage === 'stations' ? 'active' : ''}" data-i18n="nav-header.stations">🚉 Stations</a>
                    </li>
                    <li class="header-nav-item">
                        <a href="#" class="${activePage === 'recharge' ? 'active' : ''}" data-i18n="nav-header.recharge">💳 Recharge Card</a>
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
    }

    static initEvents() {
        const themeSelect = document.getElementById('theme');
        if (themeSelect) {
            themeSelect.addEventListener('change', (e) => {
                const theme = e.target.value;
                document.body.setAttribute('data-theme', theme);
                localStorage.setItem('app-theme', theme);
            });
        }

        const langSelect = document.getElementById('language');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                const lang = e.target.value;
                document.body.setAttribute('data-lang', lang);
                localStorage.setItem('app-lang', lang);
            });
        }
    }
}


/*
	<header class="main-header">
		<div class="logo-title-group">
			<img src="assets/images/site_icon.svg" alt="Metro Logo" class="site-logo">
			<h1>Metro Map Generator</h1>
		</div>

		<section class="toolbar">
			<div class="theme-selector">
				<label for="theme" data-i18n="home.theme">Theme:</label>
				<select name="theme" id="theme">
					<!--  क्लासिक लाइट थीम (Classic Light): यह मैप की डिफ़ॉल्ट थीम है। इसमें बैकग्राउंड को साफ सफेद या हल्के ऑफ-व्हाइट रंग में रखा जाता है,  जो दिन के उजाले में पढ़ने के लिए सबसे उपयुक्त है। सभी मेट्रो लाइन के रंग और स्टेशन के नाम  इसमें पूरी स्पष्टता और हाई कंट्रास्ट के साथ दिखाई देते हैं। -->
					<option value="light" data-i18n="themes.light">Classic Light</option>

					<!--  स्लीक डार्क थीम (Sleek Dark): यह डार्क मोड पसंद करने वालों के लिए है। इसमें बैकग्राउंड को गहरे स्लेटी (dark slate) या मिडनाइट ब्लू में  रखा जाता है, जिससे कम रोशनी या रात के समय आंखों पर खिंचाव और थकान नहीं होती। मेट्रो की चमकीली रंगीन लाइनें  इस गहरे बैकग्राउंड पर काफी खूबसूरत और साफ दिखाई देती हैं। -->
					<option value="dark" data-i18n="themes.dark">Sleek Dark</option>

					<!--  नियॉन साइबरपंक थीम (Neon Cyberpunk): यह एक हाई-टेक और फ्यूचरिस्टिक थीम है। इसमें बैकग्राउंड बिल्कुल जेट-ब्लैक (पूर्ण काला) होता है,  और सभी मेट्रो लाइन्स को चमकीले नियॉन (glow neon) कलर्स जैसे नियॉन पिंक, नियॉन ग्रीन और स्यान में  दिखाया जाता है। यह पूरे मैप को एक मॉडर्न साइंस-फिक्शन गेम जैसा लुक देता है। -->
					<option value="cyberpunk" data-i18n="themes.cyberpunk">Neon Cyberpunk</option>

					<!--  विंटेज रेट्रो थीम (Vintage Retro): यह थीम पुराने समय के ऐतिहासिक रेलवे और सबवे मैप्स की याद दिलाती है। इसमें बैकग्राउंड को मटमैले पीले या  सेपिया (sepia/warm beige) टोन में रखा जाता है। लाइन के रंगों को भी थोड़ा मद्धम (muted/earth tones)  किया जाता है, जो 1980 के दशक का एक क्लासिक और विंटेज अनुभव प्रदान करता है। -->
					<option value="vintage" data-i18n="themes.vintage">Vintage Retro</option>

					<!--  फॉरेस्ट मिंट थीम (Forest Mint): यह प्रकृति से प्रेरित एक बहुत ही शांत थीम है। इसमें बैकग्राउंड को हल्के मिंट ग्रीन (सॉफ्ट पुदीना हरा)  रंग में रखा जाता है। यह थीम उन लोगों के लिए है जिन्हें बहुत ही सॉफ्ट, पेस्टल और आरामदायक विजुअल्स  पसंद हैं, जो आंखों को बहुत ही तरोताजा और शांतिपूर्ण महसूस कराते हैं। -->
					<option value="mint" data-i18n="themes.mint">Forest Mint</option>

					<!--  जिब्ली नॉस्टैल्जिया थीम (Ghibli Nostalgia): यह प्रसिद्ध स्टूडियो जिब्ली (Studio Ghibli) की एनिमेटेड फिल्मों के दृश्यों से प्रेरित है। इसका बैकग्राउंड  हल्का गर्म क्रीम (warm cream/ivory) रंग का होता है। इसमें लाइन्स और टेक्स्ट को हाथ से पेंट किए गए  पेस्टल वॉटरकलर शेड्स का लुक दिया जाता है, जो पूरे मैप को जादुई और हाथ से बना हुआ (hand-drawn) फील देता है। -->
					<option value="ghibli" data-i18n="themes.ghibli">Ghibli Nostalgia</option>
				</select>
			</div>
			<div class="lang-selector">
				<label for="language" data-i18n="home.language">Lang:</label>
				<select id="language" name="lang">
					<option value="en">Eng</option>
					<option value="hi" >हिन्दी</option>
				</select>
			</div>
		</section>
		
	</header>
    <nav class="header-nav" id="header-nav" aria-label="Header Navigation">
		<ul class="header-nav-list">
			<li class="header-nav-item">
				<a href="#" data-i18n="nav-header.home">🏠 Home</a>
			</li>
			<li class="header-nav-item">
				<a href="#" data-i18n="nav-header.recharge">💳  Recharge Card</a>
			</li>
			<li class="header-nav-item">
				<a href="other.html" data-i18n="nav-header.others">🗂️ Others</a>
			</li>
			<li class="header-nav-item">
				<a href="help.html" data-i18n="nav-header.help">❓ Help</a>
			</li>
			<li class="header-nav-item">
				<a href="about.html" data-i18n="nav-header.about">ℹ️ About</a>
			</li>
		</ul>
	</nav>

*/ 