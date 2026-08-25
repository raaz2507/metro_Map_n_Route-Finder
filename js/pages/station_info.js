import metroData from "../../data/data.json" with { type: "json" };
import stationsData from "../../data/stations_data.json" with { type: "json" };
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';

import enLang from '../../lang/en.js';
import hiLang from '../../lang/hi.js';

export class StationInfoManager {
    #stBasicData;
    #stRichData;

    constructor() {
        this.metroLines = metroData.lines || {};
        this.metroStations = metroData.stationData || {};
        this.richStations = stationsData || {};

        this.stationId = this.extractStationId();
        this.lang = localStorage.getItem('app-lang') || localStorage.getItem('language') || 'en';
        
                const dictionary = this.lang === 'hi' ? hiLang : enLang;
        this.t = dictionary.pages?.station_info || dictionary.station_info || enLang.pages?.station_info || {};
    }

    extractStationId() {
        const urlParams = new URLSearchParams(window.location.search);
        const rawParam = urlParams.get('id') || urlParams.get('code') || 'jhilmil';
        return rawParam.trim().toLowerCase();
    }

    init() {
        HeaderComponent.render('stations');
        FooterComponent.render();

        this.#stBasicData = this.findBasicData(this.stationId);
        this.#stRichData = this.richStations[this.stationId] || this.findRichDataFallback(this.stationId);

        if (!this.#stBasicData && !this.#stRichData) {
            this.render404();
            return;
        }

        this.renderBackLink();
        this.renderRouteTrack(this.#stBasicData);
        this.renderLineInfoCard(this.#stBasicData, this.#stRichData);
        this.renderHero(this.#stBasicData, this.#stRichData);
        this.renderTimings(this.#stBasicData, this.#stRichData);
        this.renderHelplines(this.#stRichData);
        this.renderGates(this.#stRichData);
        this.renderFacilitiesMasterSection(this.#stRichData);
        this.renderParkingTable(this.#stRichData);
        this.renderTransitTable(this.#stRichData);
        this.renderNearbyPlaces(this.#stRichData);
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

    findBasicData(id) {
        if (this.metroStations[id]) return this.metroStations[id];
        return Object.values(this.metroStations).find(st => 
            st.id?.toLowerCase() === id || st.name?.en?.toLowerCase() === id
        );
    }

    findRichDataFallback(id) {
        return Object.values(this.richStations).find(st => 
            st.id?.toLowerCase() === id
        );
    }

    renderBackLink() {
        const backBtn = document.querySelector('.back-btn');
        if (backBtn) {
            backBtn.textContent = this.t.backBtn;
        }
    }

    renderRouteTrack(stBasic) {
        const container = document.getElementById('route-track-container');
        if (!container) return;

        const lineKeys = stBasic?.lines || [];
        const neighbors = stBasic?.neighbors || [];
        if (lineKeys.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'grid';
        const primaryLineColor = this.metroLines[lineKeys[0]]?.color || '#007bff';

        let prevStackHTML = '';
        let nextStackHTML = '';
        const currentName = stBasic?.name?.[this.lang] || stBasic?.name?.en || this.stationId.toUpperCase();

        lineKeys.forEach(lineId => {
            const lineInfo = this.metroLines[lineId];
            const lineColor = lineInfo?.color || '#007bff';

            const lineNeighbors = neighbors.filter(n => n.line === lineId);
            const prevNeighbor = lineNeighbors[0];
            const nextNeighbor = lineNeighbors[1];

            const prevStObj = prevNeighbor ? this.metroStations[prevNeighbor.station] : null;
            const nextStObj = nextNeighbor ? this.metroStations[nextNeighbor.station] : null;

            const prevName = prevStObj ? (prevStObj.name?.[this.lang] || prevStObj.name?.en) : 'Terminal';
            const nextName = nextStObj ? (nextStObj.name?.[this.lang] || nextStObj.name?.en) : 'Terminal';

            prevStackHTML += prevNeighbor 
                ? `<a href="station_info.html?id=${prevNeighbor.station}" class="route-capsule prev" style="--line-color:${lineColor};">← ${prevName}</a>`
                : `<span class="route-capsule disabled" style="--line-color:${lineColor};">● ${prevName}</span>`;

            nextStackHTML += nextNeighbor 
                ? `<a href="station_info.html?id=${nextNeighbor.station}" class="route-capsule next" style="--line-color:${lineColor};">${nextName} ➔</a>`
                : `<span class="route-capsule disabled" style="--line-color:${lineColor};">● ${nextName}</span>`;
        });

        const currentHTML = `<span class="route-capsule current" style="--line-color:${primaryLineColor};">● ${currentName}</span>`;

        container.innerHTML = `
            <div class="track-col prev-col">${prevStackHTML}</div>
            <div class="track-col center-col">${currentHTML}</div>
            <div class="track-col next-col">${nextStackHTML}</div>
        `;
    }

    renderLineInfoCard(stBasic, stRich) {
        const container = document.getElementById('line-info-container');
        if (!container) return;
        const lineKeys = stBasic?.lines || [];
        if (lineKeys.length === 0) {
            container.style.display = 'none';
            return;
        }
        container.style.display = 'block';
        let linesHTML = '<div class="line-info-master-wrapper">';

        lineKeys.forEach(lineId => {
            const lineInfo = this.metroLines[lineId];
            if (!lineInfo) return;
            const lineColor = lineInfo.color || '#007bff';
            const label = lineInfo.label ? `Line ${lineInfo.label}` : 'Metro';
            const colorName = lineInfo.name?.[this.lang] || lineInfo.name?.en || lineId.toUpperCase();
            
            const network = (lineInfo.network || 'DMRC').toUpperCase();
            const operator = (lineInfo.operator || 'DMRC').toUpperCase();
            const fromId = lineInfo.route?.from;
            const toId = lineInfo.route?.to;
            const fromSt = fromId ? (this.metroStations[fromId]?.name?.[this.lang] || this.metroStations[fromId]?.name?.en || fromId.toUpperCase()) : 'Origin';
            const toSt = toId ? (this.metroStations[toId]?.name?.[this.lang] || this.metroStations[toId]?.name?.en || toId.toUpperCase()) : 'Destination';
            linesHTML += `
                <div class="line-strip-row" style="--line-color:${lineColor};">
                    <span class="chip-label">${label}</span>
                    <span class="chip-name">${colorName}</span>
                    <span class="chip-net">🏢 ${network} (${operator})</span>
                    <span class="chip-route">📍 ${fromSt} ➔ ${toSt}</span>
                </div>
            `;
        });
        
        linesHTML += '</div>';
        container.innerHTML = `
            <h3 class="feature-card-header">${this.t.connectedLines}</h3>
            ${linesHTML}
        `;
    }

    renderHero(stBasic, stRich) {
        const heroContainer = document.getElementById('hero-container');
        if (!heroContainer) return;

        let stationTitle = stBasic?.name?.[this.lang] || stBasic?.name?.en || stRich?.id?.toUpperCase() || this.stationId.toUpperCase();
        const code = (stBasic?.id || stRich?.id || this.stationId).toUpperCase();
        const layoutType = stRich?.type || stBasic?.properties?.layout || 'Elevated';
        const description = stRich?.description || 'No detailed description available for this station.';

        heroContainer.innerHTML = `
            <div class="station-hero-header">
                <div class="station-main-title">
                    <h2><span class="station-name-en">${stationTitle}</span></h2>
                    <p>Station Code: <strong>${code}</strong> | Layout: <strong>${layoutType}</strong></p>
                </div>
            </div>
            <p class="station-description-p">📝 ${description}</p>
        `;
    }

    renderTimings(stBasic, stRich) {
        const container = document.getElementById('operating-hours-container');
        if (!container) return;

        const firstTrain = this.formatTo12Hour(stBasic?.train_schedule?.first_train);
        const lastTrain = this.formatTo12Hour(stBasic?.train_schedule?.last_train);

        container.innerHTML = `
            <div class="compact-timing-row">
                <span>${this.t.operatingHours}</span>
            </div>
            <div class="compact-timing-row border-top-dashed">
                <span>☀️ <strong>${this.t.first}:</strong> <span style="color:rgb(var(--color-success-rgb)); font-weight:700;">${firstTrain}</span></span>
                <span>🌙 <strong>${this.t.last}:</strong> <span style="color:rgb(var(--color-danger-rgb)); font-weight:700;">${lastTrain}</span></span>
            </div>
        `;
    }

    renderHelplines(stRich) {
        const container = document.getElementById('contacts-container');
        if (!container) return;

        const mobile = stRich?.contact?.mobile || '8800793101';
        const landline = stRich?.contact?.landline || 'N/A';

        container.innerHTML = `
            <h3 class="feature-card-header">${this.t.helplines}</h3>
            <div class="contacts-grid">
                <div class="contact-box">
                    <strong>${this.t.mobileHelpline}</strong>
                    <div><a href="tel:${mobile}">${mobile}</a></div>
                </div>
                <div class="contact-box">
                    <strong>${this.t.landline}</strong>
                    <div style="font-weight:700; color:var(--btn-primary-bg); margin-top:3px;">${landline}</div>
                </div>
                <div class="contact-box">
                    <strong>${this.t.dmrcHelpline}</strong>
                    <div><a href="tel:155370">155370</a></div>
                </div>
            </div>
        `;
    }

    renderGates(stRich) {
        const container = document.getElementById('gates-container');
        if (!container) return;

        const gatesObj = stRich?.gates || {};
        const gateKeys = Object.keys(gatesObj);

        if (gateKeys.length === 0) {
            container.innerHTML = `<div class="empty-data-notice">No specific gate details available for this station.</div>`;
            return;
        }

        let html = '';
        gateKeys.forEach(gNum => {
            const g = gatesObj[gNum];
            const divyangTag = g.divyang 
                ? `<span class="divyang-tag accessible">${this.t.divyangAccessible}</span>` 
                : `<span class="divyang-tag standard">${this.t.standardAccess}</span>`;
            const gateCode = g.code || `GA${gNum}`;
            const status = (g.status || 'OPEN').toUpperCase();
            const landmark = g.landmark?.[this.lang] || g.landmark?.en || g.landmark?.hi || 'Exit Gate Area';

            html += `
                <div class="gate-card-32">
                    <div class="gate-card-header">
                        <div class="gate-title-group">
                            <span class="gate-number">Gate No. ${gNum}</span>
                            <span class="gate-code-tag">${gateCode}</span>
                        </div>
                        <span class="status-active">${status}</span>
                    </div>
                    <div class="gate-card-body">
                        ${divyangTag}
                    </div>
                    <div class="gate-card-footer">
                        <span>📍 ${landmark}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    renderFacilitiesMasterSection(stRich) {
        const container = document.getElementById('facilities-container');
        if (!container) return;

        const facilitiesObj = stRich?.facilities || {};
        const catKeys = Object.keys(facilitiesObj);

        if (catKeys.length === 0) {
            container.innerHTML = `<div class="empty-data-notice">No facility records found for this station.</div>`;
            return;
        }

        let html = `<div class="facilities-master-wrapper">`;

        catKeys.forEach(cat => {
            const items = facilitiesObj[cat] || [];
            if (items.length === 0) return;

            html += `
                <div class="facility-subcategory">
                    <div class="facility-subcategory-title">🔹 ${cat} (${items.length})</div>
                    <div class="facility-items-flex">
                        ${items.map(item => `
                            <div class="facility-pill">
                                <span class="facility-name">${item.name || cat}</span>
                                <span class="facility-loc">📍 ${item.location || 'Concourse'} ${item.purpose ? `| ${item.purpose}` : ''}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    renderParkingTable(stRich) {
        const container = document.getElementById('parking-container');
        if (!container) return;

        const parkings = stRich?.parkings || [];
        if (parkings.length === 0) {
            container.innerHTML = `<div class="empty-data-notice">🚫 No authorised DMRC parking available at this station.</div>`;
            return;
        }

        let tableHTML = `
            <div class="table-responsive-wrapper">
                <table class="station-table">
                    <thead>
                        <tr>
                            <th>${this.t.provider}</th>
                            <th>${this.t.car}</th>
                            <th>${this.t.bike}</th>
                            <th>${this.t.cycle}</th>
                            <th>${this.t.location}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        parkings.forEach(p => {
            tableHTML += `
                <tr>
                    <td><strong>${p.provider || 'DMRC Parking'}</strong></td>
                    <td>${p.capacity_car ?? '--'}</td>
                    <td>${p.capacity_motorcycle ?? '--'}</td>
                    <td>${p.capacity_cycle ?? '--'}</td>
                    <td>${p.location || 'Near Exit Gate'}</td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    }

    renderTransitTable(stRich) {
        const container = document.getElementById('transit-container');
        if (!container) return;

        const liftsObj = stRich?.vertical_transit?.lifts || {};
        const escalatorsObj = stRich?.vertical_transit?.escalators || {};

        const liftKeys = Object.keys(liftsObj);
        const escKeys = Object.keys(escalatorsObj);

        if (liftKeys.length === 0 && escKeys.length === 0) {
            container.innerHTML = `<div class="empty-data-notice">No vertical transit (lift/escalator) records available.</div>`;
            return;
        }

        let finalHTML = `<div class="bento-col-stack">`;

        // 1. Lifts Sub-Section Table
        if (liftKeys.length > 0) {
            finalHTML += `
                <div class="facility-subcategory">
                    <div class="facility-subcategory-title">${this.t.lifts} (${liftKeys.length})</div>
                    <div class="table-responsive-wrapper">
                        <table class="station-table">
                            <thead>
                                <tr>
                                    <th>${this.t.code}</th>
                                    <th>${this.t.location}</th>
                                    <th>${this.t.placement}</th>
                                    <th>${this.t.divyangFriendly}</th>
                                    <th>${this.t.status}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${liftKeys.map(k => {
                                    const item = liftsObj[k];
                                    return `
                                        <tr>
                                            <td><strong>${item.code || `LF${k}`}</strong></td>
                                            <td>${item.location || 'Concourse'}</td>
                                            <td>${item.placement || 'Inside'}</td>
                                            <td class="${item.divyang_friendly ? 'status-yes' : 'status-no'}">${item.divyang_friendly ? this.t.yes : this.t.no}</td>
                                            <td class="${item.status !== false ? 'status-active' : 'status-maintenance'}">${item.status !== false ? this.t.active : this.t.maintenance}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        // 2. Escalators Sub-Section Table
        if (escKeys.length > 0) {
            finalHTML += `
                <div class="facility-subcategory">
                    <div class="facility-subcategory-title">${this.t.escalators} (${escKeys.length})</div>
                    <div class="table-responsive-wrapper">
                        <table class="station-table">
                            <thead>
                                <tr>
                                    <th>${this.t.code}</th>
                                    <th>${this.t.location}</th>
                                    <th>${this.t.placement}</th>
                                    <th>${this.t.divyangFriendly}</th>
                                    <th>${this.t.status}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${escKeys.map(k => {
                                    const item = escalatorsObj[k];
                                    return `
                                        <tr>
                                            <td><strong>${item.code || `EC${k}`}</strong></td>
                                            <td>${item.location || 'Concourse'}</td>
                                            <td>${item.placement || 'Inside'}</td>
                                            <td class="${item.divyang_friendly ? 'status-yes' : 'status-no'}">${item.divyang_friendly ? this.t.yes : this.t.no}</td>
                                            <td class="${item.status !== false ? 'status-active' : 'status-maintenance'}">${item.status !== false ? this.t.active : this.t.maintenance}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        finalHTML += `</div>`;
        container.innerHTML = finalHTML;
    }

    renderNearbyPlaces(stRich) {
        const container = document.getElementById('nearby-container');
        if (!container) return;

        const nearbyObj = stRich?.nearby_places || {};
        const categories = Object.keys(nearbyObj);

        if (categories.length === 0) {
            container.innerHTML = `<div class="empty-data-notice">No nearby landmarks registered for this station.</div>`;
            return;
        }

        let html = `<div class="nearby-categories-grid">`;

        categories.forEach(cat => {
            const places = nearbyObj[cat] || [];
            if (places.length === 0) return;

            html += `
                <div class="nearby-cat-card">
                    <div class="nearby-cat-title">🏛️ ${cat}</div>
                    <ul class="nearby-places-list">
                        ${places.map(p => `
                            <li class="nearby-place-item">
                                <span>${p.name}</span>
                                <span class="distance-chip">${p.distance_km ? `${p.distance_km} km` : ''} ${p.walking_min ? `| 🚶 ${p.walking_min} min` : ''}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    render404() {
        const main = document.querySelector('.station-page-container');
        if (main) {
            main.innerHTML = `
                <div style="text-align:center; padding:5rem 1rem; color:var(--text-secondary);">
                    <h2 style="font-size:2rem; margin-bottom:1rem;">⚠️ Station Not Found</h2>
                    <p>The requested station code/ID "<strong>${this.stationId}</strong>" was not found in our metro directory.</p>
                    <a href="all_stations.html" class="back-btn" style="margin-top:1.5rem;">${this.t.backBtn}</a>
                </div>
            `;
        }
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const app = new StationInfoManager();
    app.init();
});