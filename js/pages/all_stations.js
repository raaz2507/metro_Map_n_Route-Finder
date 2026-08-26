import metroData from "../../data/data.json" with { type: "json" };
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';

import enLang from '../../lang/en.js';
import hiLang from '../../lang/hi.js';

export class AllStationsDirectory {
    constructor() {
        this.lines = metroData.lines || {};
        this.stations = metroData.stationData || {};
        this.activeFilter = 'all';
        this.searchQuery = '';

        this.containerEl = document.getElementById('stations-directory-container');
        this.filterWrapperEl = document.getElementById('filter-chips-wrapper');
        this.searchInputEl = document.getElementById('dir-search-input');

                this.lang = localStorage.getItem('app-lang') || localStorage.getItem('language') || 'en';
        const dictionary = this.lang === 'hi' ? hiLang : enLang;
        this.t = dictionary.pages?.all_stations || dictionary.all_stations || enLang.pages?.all_stations || {};
    }

    init() {
        HeaderComponent.render('stations');
        FooterComponent.render();

        if (this.searchInputEl) {
            this.searchInputEl.placeholder = this.t.searchPlaceholder;
        }

        this.renderFilterChips();
        this.render();
        this.setupEventListeners();
    }

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

    hexToRgba(hex, alpha = 0.18) {
        if (!hex) return `rgba(255, 255, 255, ${alpha})`;
        let c = hex.replace('#', '');
        if (c.length === 3) {
            c = c.split('').map(x => x + x).join('');
        }
        if (c.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    renderFilterChips() {
        if (!this.filterWrapperEl) return;

        const totalStationsCount = Object.keys(this.stations || {}).length;

        const networkGroups = {
            dmrc: {
                title: { en: "🚇 Delhi Metro (DMRC)", hi: "🚇 दिल्ली मेट्रो (DMRC)" },
                lines: []
            },
            nmrc: {
                title: { en: "🚆 Noida Metro (NMRC)", hi: "🚆 नोएडा मेट्रो (NMRC)" },
                lines: []
            },
            rapid_metro: {
                title: { en: "⚡ Rapid Metro Gurugram", hi: "⚡ रैपिड मेट्रो गुरुग्राम" },
                lines: []
            }
        };

        Object.values(this.lines).forEach(line => {
            const netKey = line.network || line.operator || 'dmrc';
            if (networkGroups[netKey]) {
                networkGroups[netKey].lines.push(line);
            } else {
                networkGroups.dmrc.lines.push(line);
            }
        });

        let html = `
            <div class="network-chips-row">
                <button class="chip-btn ${this.activeFilter === 'all' ? 'active' : ''}" data-line="all">${this.t.allLines} (${totalStationsCount})</button>
            </div>
        `;

        Object.values(networkGroups).forEach(group => {
            if (group.lines.length === 0) return;

            const groupTitle = group.title[this.lang] || group.title.en;

            html += `
                <div class="network-filter-group">
                    <div class="network-group-title">${groupTitle}</div>
                    <div class="network-chips-row">
            `;

            group.lines.forEach(line => {
                const shortName = line.short_name?.[this.lang] || line.short_name?.en || line.name?.[this.lang] || line.name?.en || line.id;
                const activeClass = this.activeFilter === line.id ? 'active' : '';
                const borderColor = line.color || '#007bff';
                const bgTint = this.hexToRgba(borderColor, 0.40);
                const count = (line.stations || []).length;

                html += `
                    <button class="chip-btn ${activeClass}" data-line="${line.id}" style="--line-color:${borderColor}; border-color:${borderColor}; background-color:${bgTint};">
                        ● ${shortName} (${count})
                    </button>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        this.filterWrapperEl.innerHTML = html;
    }


    render() {
        if (!this.containerEl) return;

        let html = '';
        let matchedLineCount = 0;

        Object.values(this.lines).forEach(line => {
            if (this.activeFilter !== 'all' && this.activeFilter !== line.id) {
                return;
            }

            const stationIds = line.stations || [];
            
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

            const lineTitle = line.name?.[this.lang] || line.name?.en || line.id;
            const lineColor = line.color || '#c0282c';
            const count = filteredStationIds.length;
            const stationCountText = count === 1 
                ? (this.t.singleStationCount || '1 Station')
                : (this.t.stationCount ? this.t.stationCount.replace('{count}', count) : `${count} Stations`);

            html += `
                <section class="line-directory-section" id="section-${line.id}">
                    <div class="line-section-header" style="border-left-color: ${lineColor};">
                        <span>${lineTitle}</span>
                        <span style="font-size:var(--fs-xs); color:var(--text-secondary); background:var(--btn-reset-bg); border:1px solid var(--border-color); padding:4px 12px; border-radius:var(--radius-full);">${stationCountText}</span>
                    </div>

                    <div class="train-track-row" style="--line-color: ${lineColor};">
                        ${filteredStationIds.map(stId => this.buildCoachCardHTML(stId, line)).join('')}
                    </div>    
                </section>
            `;
        });

        if (matchedLineCount === 0) {
            const noMatchMsg = this.t.noStationQueryMsg ? this.t.noStationQueryMsg.replace('{query}', this.searchQuery) : `No station matches your search query "${this.searchQuery}".`;

            html = `
                <div style="text-align:center; padding: 4rem 1rem; color: var(--text-secondary);">
                    <h3 style="font-size: 1.5rem; margin-bottom: 0.5rem;">${this.t.noStationsFound}</h3>
                    <p>${noMatchMsg}</p>
                </div>
            `;
        }

        this.containerEl.innerHTML = html;
    }

    buildCoachCardHTML(stationId, lineInfo) {
		const st = this.stations[stationId];

		// Explicit Data Guard & Developer Warning (No Silent Suppression)
		if (!st) {
			console.error(`[Data Integrity Error] Station ID "${stationId}" is referenced in line "${lineInfo.id}", but missing in stationData of data.json!`);
			return `
				<div class="real-coach-card missing-station-card" style="--line-color: #ef4444; border: 2px dashed #ef4444; background: rgba(239, 68, 68, 0.08); padding: 1rem; border-radius: var(--radius-lg, 12px); margin: 0.5rem;">
					<div style="color: #ef4444; font-weight: bold; font-size: var(--fs-sm, 14px);">
						⚠️ Missing Station Data: <code>${stationId}</code>
					</div>
					<div style="font-size: var(--fs-xs, 12px); color: var(--text-secondary, #64748b); margin-top: 4px;">
						Defined in <strong>${lineInfo.short_name?.en || lineInfo.id}</strong>, but missing in <code>data.json -> stationData</code>.
					</div>
				</div>
			`;
		}

		let stationTitle = st.name?.en?.toUpperCase();
		if (this.lang === 'hi' && st.name?.hi) {
			stationTitle = st.name.hi;
		}
		
        
        const lineColor = lineInfo.color || '#c0282c';
        const firstTrain = this.formatTo12Hour(st.train_schedule?.first_train);
        const lastTrain = this.formatTo12Hour(st.train_schedule?.last_train);

        // Layout badge resolution
        const layoutType = (st.properties?.layout || 'elevated').toLowerCase();
        let layoutText = 'Elevated';
        let layoutClass = 'badge-elevated';
        let layoutIcon = 'icon_elevated.svg';

        if (layoutType === 'underground') {
            layoutText = this.lang === 'hi' ? 'भूमिगत' : 'Underground';
            layoutClass = 'badge-underground';
            layoutIcon = 'icon_underground.svg';
        } else if (layoutType === 'at_grade' || layoutType === 'at-grade' || layoutType === 'ground') {
            layoutText = this.lang === 'hi' ? 'समतल' : 'At Grade';
            layoutClass = 'badge-at-grade';
            layoutIcon = 'icon_at_grade.svg';
        } else {
            layoutText = this.lang === 'hi' ? 'एलिवेटेड' : 'Elevated';
            layoutClass = 'badge-elevated';
            layoutIcon = 'icon_elevated.svg';
        }

        // Interchange badge resolution
        const isInterchange = st.properties?.station_type === 'interchange';
        const interchangeText = this.lang === 'hi' ? 'इंटरचेंज' : 'Interchange';

        return `
            <a href="station_info.html?id=${st.id}" class="real-coach-card" style="--line-color: ${lineColor};">
                <div class="coach-underglow"></div>

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
                    </defs>

                    <path d="M12 35 C12 20, 25 12, 45 12 L315 12 C335 12, 348 20, 354 38 L348 165 C340 195, 320 200, 300 200 L25 200 C15 200, 10 185, 10 165 Z" fill="url(#bodyGrad-${st.id})" stroke="#64748B" stroke-width="2"/>
                    <path d="M15 25 C15 12, 28 8, 48 8 L312 8 C328 8, 342 12, 350 25 Z" fill="url(#roofGrad-${st.id})"/>

                    <path d="M322 18 L344 18 C352 18, 356 28, 350 48 L334 48 Z" fill="#0F172A" stroke="#38BDF8" stroke-width="1.5"/>
                    <polygon points="325,20 342,20 334,44 325,44" fill="#FFFFFF" opacity="0.3"/>

                    <rect class="dynamic-stripe-fill" x="10" y="166" width="340" height="24" rx="4"/>
                    <rect x="10" y="174" width="340" height="5" fill="#FFFFFF" opacity="0.8"/>

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

                    <circle cx="348" cy="180" r="5" fill="#38BDF8" stroke="#FFFFFF" stroke-width="1.5"/>
                    <circle cx="338" cy="180" r="4" fill="#F59E0B"/>
                </svg>

                <div class="coach-window-overlay">
                    <div class="window-station-title">
                        <span class="station-name-title">${stationTitle}</span>
                    </div>

                    <div class="window-timings-line">
                        <strong>${firstTrain} ➔ ${lastTrain}</strong>
                    </div>
                </div>

                <div class="coach-stripe-badges">
                    <span class="coach-badge ${layoutClass}" title="${layoutText}">
                        <img src="./assets/icons/${layoutIcon}" class="badge-icon-img" alt="${layoutText}">
                    </span>

                    ${isInterchange ? `
                        <span class="coach-badge badge-interchange" title="${interchangeText}">
                            <img src="./assets/icons/icon_interchange.svg" class="badge-icon-img" alt="${interchangeText}">
                        </span>
                    ` : ''}
                </div>
            </a>
        `;
    }

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

document.addEventListener("DOMContentLoaded", () => {
    const directory = new AllStationsDirectory();
    directory.init();
});