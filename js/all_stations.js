import metroData from "../data/data.json" with { type: "json" };
import { HeaderComponent } from './components/Header.js';
import { FooterComponent } from './components/Footer.js';

export class AllStationsDirectory {
    constructor() {
        this.lines = metroData.lines || {};
        this.stations = metroData.stationData || {};
        this.activeFilter = 'all';
        this.searchQuery = '';

        this.containerEl = document.getElementById('stations-directory-container');
        this.filterWrapperEl = document.getElementById('filter-chips-wrapper');
        this.searchInputEl = document.getElementById('dir-search-input');
    }

    init() {
        // 1. Header और Footer रेंडर करें
        HeaderComponent.render('stations');
        FooterComponent.render();

        // 2. Dynamic Filter Chips बनाएँ
        this.renderFilterChips();

        // 3. Line Sections और Metro Coach Cards रेंडर करें
        this.render();

        // 4. Event Listeners अटैच करें
        this.setupEventListeners();
    }

    
    /**
     * Converts 24-hour time string ("05:47:25") to 12-hour format ("05:47 AM")
     * Missing or null values correctly return "--:--" without hardcoding assumptions.
     */
    formatTo12Hour(timeStr) {
        if (!timeStr || timeStr === "N/A" || timeStr === null || timeStr === "") {
            return "--:--";
        }
        const parts = timeStr.split(":");
        if (parts.length < 2) return timeStr;

        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strHours = hours < 10 ? '0' + hours : hours;

        return `${strHours}:${minutes} ${ampm}`;
    }

    /**
     * सभी मेट्रो लाइन्स के अनुसार dynamic filter chips बटन बनाता है
     */
    renderFilterChips() {
        if (!this.filterWrapperEl) return;

        let html = `<button class="chip-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-line="all">All Lines</button>`;

        Object.values(this.lines).forEach(line => {
            const lineNameEn = line.name?.en?.split('-')[1]?.trim() || line.color_name || line.id;
            const activeClass = this.activeFilter === line.id ? 'active' : '';
            const borderColor = line.color || '#007bff';

            html += `
                <button class="chip-btn ${activeClass}" data-line="${line.id}" style="border-color:${borderColor};">
                    ● ${lineNameEn}
                </button>
            `;
        });

        this.filterWrapperEl.innerHTML = html;
    }

    /**
     * Active filter और search query के अनुसार लाइन सेक्शंस और कोचिंग पटरियां रेंडर करता है
     */
    render() {
        if (!this.containerEl) return;

        let html = '';
        let matchedLineCount = 0;

        Object.values(this.lines).forEach(line => {
            // Line filter check
            if (this.activeFilter !== 'all' && this.activeFilter !== line.id) {
                return;
            }

            const stationIds = line.stations || [];
            
            // Search query filter check
            const filteredStationIds = stationIds.filter(stId => {
                if (!this.searchQuery) return true;
                const st = this.stations[stId];
                if (!st) return false;
                const nameEn = (st.name?.en || '').toLowerCase();
                const nameHi = (st.name?.hi || '').toLowerCase();
                const code = stId.toLowerCase();
                const query = this.searchQuery.toLowerCase();
                return nameEn.includes(query) || nameHi.includes(query) || code.includes(query);
            });

            if (filteredStationIds.length === 0) {
                return;
            }

            matchedLineCount++;

            const lineTitleEn = line.name?.en || line.id;
            const lineColor = line.color || '#c0282c';
            const stationCountText = `${filteredStationIds.length} Station${filteredStationIds.length > 1 ? 's' : ''}`;

            html += `
                <section class="line-directory-section" id="section-${line.id}">
                    <div class="line-section-header" style="border-left-color: ${lineColor};">
                        <span>${lineTitleEn}</span>
                        <span style="font-size:var(--fs-xs); color:var(--text-secondary); background:var(--btn-reset-bg); border:1px solid var(--border-color); padding:4px 12px; border-radius:var(--radius-full);">${stationCountText}</span>
                    </div>

                 <div class="train-track-row" style="--line-color: ${lineColor};">
                        ${filteredStationIds.map(stId => this.buildCoachCardHTML(stId, line)).join('')}
                    </div>    
                </section>
            `;
        });

        if (matchedLineCount === 0) {
            html = `
                <div style="text-align:center; padding: 4rem 1rem; color: var(--text-sub);">
                    <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">🔍 No stations found</h3>
                    <p>No station matches your search query "${this.searchQuery}". Try searching for another name or code.</p>
                </div>
            `;
        }

        this.containerEl.innerHTML = html;
    }

    /**
     * individual Metro Coach SVG Card Markup बनाता है (metro_coach_svg_demo2.html के अनुसार)
     */
    buildCoachCardHTML(stationId, lineInfo) {
        const st = this.stations[stationId];
        
        const nameEn = st.name?.en.toUpperCase();
        const nameHi = st.name?.hi;
        const lineColor = lineInfo.color || '#c0282c';

        // 12-Hour AM/PM schedule timings strictly from data.json
        const firstTrain = this.formatTo12Hour(st.train_schedule?.first_train);
        const lastTrain = this.formatTo12Hour(st.train_schedule?.last_train);


        return `
            <a href="station_info.html?id=${st.id}" class="real-coach-card" style="--line-color: ${lineColor};">
                <div class="coach-underglow"></div>

                <!-- STANDALONE COACH SVG (360x216) -->
                <svg class="svg-coach-element" viewBox="0 0 360 216" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="bodyGrad-${st.id}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="var(--coach-body-grad-start, #ffffff)"/>
                            <stop offset="100%" stop-color="var(--coach-body-grad-end, #cbd5e1)"/>
                        </linearGradient>
                        <linearGradient id="roofGrad-${st.id}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="var(--coach-roof-grad-start, #f8fafc)"/>
                            <stop offset="100%" stop-color="var(--coach-roof-grad-end, #475569)"/>
                        </linearGradient>
                        <linearGradient id="glassTint-${st.id}" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stop-color="#0f172a" stop-opacity="0.85"/>
                            <stop offset="100%" stop-color="#1e293b" stop-opacity="0.7"/>
                        </linearGradient>
                    </defs>

                    <!-- Sleek Metallic Body & Aerodynamic Roof -->
                    <path d="M12 35 C12 20, 25 12, 45 12 L315 12 C335 12, 348 20, 354 38 L348 165 C340 195, 320 200, 300 200 L25 200 C15 200, 10 185, 10 165 Z" fill="url(#bodyGrad-${st.id})" stroke="#64748B" stroke-width="2"/>
                    <path d="M15 25 C15 12, 28 8, 48 8 L312 8 C328 8, 342 12, 350 25 Z" fill="url(#roofGrad-${st.id})"/>

                    <!-- Driver Windshield -->
                    <path d="M322 18 L344 18 C352 18, 356 28, 350 48 L334 48 Z" fill="#0F172A" stroke="#38BDF8" stroke-width="1.5"/>
                    <polygon points="325,20 342,20 334,44 325,44" fill="#FFFFFF" opacity="0.3"/>

                    <!-- 1 SINGLE LARGE GLASS WINDOW CUTOUT -->
                    <!-- <rect x="22" y="38" width="290" height="125" rx="8" fill="url(#glassTint-${st.id})" stroke="#334155" stroke-width="2"/> -->

                    <!-- Glass Reflection Highlight -->
                    <!-- <polygon points="28,42 65,42 45,158 28,158" fill="#FFFFFF" opacity="0.12"/> -->

                    <!-- Dynamic Line Color Stripe -->
                    <rect class="dynamic-stripe-fill" x="10" y="166" width="340" height="24" rx="4"/>
                    <rect x="10" y="174" width="340" height="5" fill="#FFFFFF" opacity="0.8"/>

                    <!-- Wheel Bogies -->
                    <rect x="45" y="198" width="75" height="18" rx="4" fill="#0F172A"/>
                    <circle cx="65" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
                    <circle cx="65" cy="207" r="3" fill="#E2E8F0"/>
                    <circle cx="100" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
                    <circle cx="100" cy="207" r="3" fill="#E2E8F0"/>

                    <rect x="240" y="198" width="75" height="18" rx="4" fill="#0F172A"/>
                    <circle cx="260" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
                    <circle cx="260" cy="207" r="3" fill="#E2E8F0"/>
                    <circle cx="295" cy="207" r="9" fill="#64748B" stroke="#0F172A" stroke-width="3"/>
                    <circle cx="295" cy="207" r="3" fill="#E2E8F0"/>

                    <!-- Headlights -->
                    <circle cx="348" cy="180" r="5" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5"/>
                    <circle cx="338" cy="180" r="4" fill="#F59E0B"/>
                </svg>

                <!-- GLASS WINDOW OVERLAY (Minimalist Single-Line Range) -->
                <div class="coach-window-overlay">
                    <div class="window-station-title">
                        <span class="lang-en">${nameEn}</span>
                        <span class="lang-hi">${nameHi}</span>
                    </div>

                    <div class="window-timings-line">
                        <strong>${firstTrain} ➔ ${lastTrain}</strong>
                    </div>
                </div>
            </a>
        `;
    }

    /**
     * Search और Filter Events सेट करता है
     */
    setupEventListeners() {
        if (this.searchInputEl) {
            this.searchInputEl.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.trim();
                this.render();
            });
        }

        if (this.filterWrapperEl) {
            this.filterWrapperEl.addEventListener('click', (e) => {
                const btn = e.target.closest('.chip-btn');
                if (!btn) return;

                const lineId = btn.getAttribute('data-line');
                if (!lineId) return;

                this.activeFilter = lineId;

                const allChips = this.filterWrapperEl.querySelectorAll('.chip-btn');
                allChips.forEach(chip => chip.classList.remove('active'));
                btn.classList.add('active');

                this.render();
            });
        }
    }
}

// Auto Instantiate
document.addEventListener("DOMContentLoaded", () => {
    const directory = new AllStationsDirectory();
    directory.init();
});