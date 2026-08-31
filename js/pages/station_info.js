/**
 * Station Details & Facilities Page Controller
 * Enterprise ES2022 OOP Class with Private Encapsulation (#)
 * Dynamically loads station data and rich facilities via metroDataStore.
 */
import { metroDataStore } from "../core/metro-data-store.js";
import { HeaderComponent } from "../components/Header.js";
import { FooterComponent } from "../components/Footer.js";

import enLang from "../../lang/en.js";
import hiLang from "../../lang/hi.js";

export class StationInfoManager {
    // Private State Fields
    #metroData = null;
    #stationsDetailData = null;
    #metroLines = {};
    #metroStations = {};
    #richStations = {};

    #stationId = "";
    #currentCity = "delhi_ncr";
    #stBasicData = null;
    #stRichData = null;

    // Localization
    #lang = "en";
    #t = {};

    constructor() {
        this.#extractParams();
        this.#initLocalization();
    }

    /**
     * Extracts Station ID and City from URL query parameters
     */
    #extractParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const rawParam = urlParams.get("id") || urlParams.get("code") || "jhilmil";
        this.#stationId = rawParam.trim().toLowerCase();

        this.#currentCity = urlParams.get("city") || localStorage.getItem("active_city") || "delhi_ncr";
    }

    /**
     * Initialize active language dictionary
     */
    #initLocalization() {
        this.#lang = localStorage.getItem("app-lang") || localStorage.getItem("language") || "en";
        const dictionary = this.#lang === "hi" ? hiLang : enLang;
        this.#t = dictionary.pages?.station_info || dictionary.station_info || enLang.pages?.station_info || {};
    }

    /**
     * Initializes Universal Header, Footer, and loads dynamic data
     */
    async init() {
        HeaderComponent.render("stations");
        FooterComponent.render();

        try {
            // 1. Asynchronously load transit graph data and detailed facilities
            this.#metroData = await metroDataStore.loadCity(this.#currentCity);
            this.#stationsDetailData = await metroDataStore.loadStationsDetail(this.#currentCity);

            this.#metroLines = this.#metroData.lines || {};
            this.#metroStations = this.#metroData.stationData || {};
            this.#richStations = this.#stationsDetailData || {};

            // 2. Resolve target station basic and rich records
            this.#stBasicData = this.#findBasicData(this.#stationId);
            this.#stRichData = this.#richStations[this.#stationId] || this.#findRichDataFallback(this.#stationId);

            if (!this.#stBasicData && !this.#stRichData) {
                this.#render404();
                return;
            }

            // 3. Render Page Bento Grid Sections
            this.#renderBackLink();
            this.#renderRouteTrack(this.#stBasicData);
            this.#renderLineInfoCard(this.#stBasicData, this.#stRichData);
            this.#renderHero(this.#stBasicData, this.#stRichData);
            this.#renderTimings(this.#stBasicData, this.#stRichData);
            this.#renderHelplines(this.#stRichData);
            this.#renderGates(this.#stRichData);
            this.#renderFacilitiesMasterSection(this.#stRichData);
            this.#renderParkingTable(this.#stRichData);
            this.#renderTransitTable(this.#stRichData);
            this.#renderNearbyPlaces(this.#stRichData);
        } catch (error) {
            console.error("[StationInfoManager] Failed to load station info:", error);
            this.#render404();
        }
    }

    #findBasicData(id) {
        if (this.#metroStations[id]) return this.#metroStations[id];
        return Object.values(this.#metroStations).find(st => 
            st.id?.toLowerCase() === id || st.name?.en?.toLowerCase() === id
        );
    }

    #findRichDataFallback(id) {
        return Object.values(this.#richStations).find(st => 
            st.id?.toLowerCase() === id
        );
    }

    #renderBackLink() {
        const backBtn = document.querySelector(".back-btn");
        if (backBtn) {
            backBtn.textContent = this.#t.backBtn || "⬅️ Back to All Stations";
            backBtn.href = `all_stations.html?city=${encodeURIComponent(this.#currentCity)}`;
        }
    }

    #renderRouteTrack(stBasic) {
        const container = document.getElementById("route-track-container");
        if (!container) return;

        const lineKeys = stBasic?.lines || [];
        const neighbors = stBasic?.neighbors || [];
        if (lineKeys.length === 0) {
            container.style.display = "none";
            return;
        }

        container.style.display = "grid";
        const primaryLineColor = this.#metroLines[lineKeys[0]]?.color || "#007bff";

        let prevStackHTML = "";
        let nextStackHTML = "";
        const currentName = stBasic?.name?.[this.#lang] || stBasic?.name?.en || this.#stationId.toUpperCase();

        lineKeys.forEach(lineId => {
            const lineInfo = this.#metroLines[lineId];
            const lineColor = lineInfo?.color || "#007bff";

            const lineNeighbors = neighbors.filter(n => n.line === lineId);
            const prevNeighbor = lineNeighbors[0];
            const nextNeighbor = lineNeighbors[1];

            const prevStObj = prevNeighbor ? this.#metroStations[prevNeighbor.station] : null;
            const nextStObj = nextNeighbor ? this.#metroStations[nextNeighbor.station] : null;

            const prevName = prevStObj ? (prevStObj.name?.[this.#lang] || prevStObj.name?.en) : "Terminal";
            const nextName = nextStObj ? (nextStObj.name?.[this.#lang] || nextStObj.name?.en) : "Terminal";

            prevStackHTML += prevNeighbor 
                ? `<a href="station_info.html?id=${encodeURIComponent(prevNeighbor.station)}&city=${encodeURIComponent(this.#currentCity)}" class="route-capsule prev" style="--line-color:${lineColor};">← ${this.#escapeHTML(prevName)}</a>`
                : `<span class="route-capsule disabled" style="--line-color:${lineColor};">● ${this.#escapeHTML(prevName)}</span>`;

            nextStackHTML += nextNeighbor 
                ? `<a href="station_info.html?id=${encodeURIComponent(nextNeighbor.station)}&city=${encodeURIComponent(this.#currentCity)}" class="route-capsule next" style="--line-color:${lineColor};">${this.#escapeHTML(nextName)} ➔</a>`
                : `<span class="route-capsule disabled" style="--line-color:${lineColor};">● ${this.#escapeHTML(nextName)}</span>`;
        });

        const currentHTML = `<span class="route-capsule current" style="--line-color:${primaryLineColor};">● ${this.#escapeHTML(currentName)}</span>`;

        container.innerHTML = `
            <div class="track-col prev-col">${prevStackHTML}</div>
            <div class="track-col center-col">${currentHTML}</div>
            <div class="track-col next-col">${nextStackHTML}</div>
        `;
    }

    #renderLineInfoCard(stBasic, stRich) {
        const container = document.getElementById("line-info-container");
        if (!container) return;
        const lineKeys = stBasic?.lines || [];
        if (lineKeys.length === 0) {
            container.style.display = "none";
            return;
        }
        container.style.display = "block";
        let linesHTML = '<div class="line-info-master-wrapper">';

        lineKeys.forEach(lineId => {
            const lineInfo = this.#metroLines[lineId];
            if (!lineInfo) return;
            const lineColor = lineInfo.color || "#007bff";
            const label = lineInfo.label ? `Line ${lineInfo.label}` : "Metro";
            const colorName = lineInfo.name?.[this.#lang] || lineInfo.name?.en || lineId.toUpperCase();
            
            const network = (lineInfo.network || "DMRC").toUpperCase();
            const operator = (lineInfo.operator || "DMRC").toUpperCase();
            const fromId = lineInfo.route?.from;
            const toId = lineInfo.route?.to;
            const fromSt = fromId ? (this.#metroStations[fromId]?.name?.[this.#lang] || this.#metroStations[fromId]?.name?.en || fromId.toUpperCase()) : "Origin";
            const toSt = toId ? (this.#metroStations[toId]?.name?.[this.#lang] || this.#metroStations[toId]?.name?.en || toId.toUpperCase()) : "Destination";
            linesHTML += `
                <div class="line-strip-row" style="--line-color:${lineColor};">
                    <span class="chip-label">${this.#escapeHTML(label)}</span>
                    <span class="chip-name">${this.#escapeHTML(colorName)}</span>
                    <span class="chip-net">🏢 ${this.#escapeHTML(network)} (${this.#escapeHTML(operator)})</span>
                    <span class="chip-route">📍 ${this.#escapeHTML(fromSt)} ➔ ${this.#escapeHTML(toSt)}</span>
                </div>
            `;
        });
        
        linesHTML += "</div>";
        container.innerHTML = `
            <h3 class="feature-card-header">${this.#escapeHTML(this.#t.connectedLines || "🚆 Connected Metro Lines")}</h3>
            ${linesHTML}
        `;
    }

    #renderHero(stBasic, stRich) {
        const heroContainer = document.getElementById("hero-container");
        if (!heroContainer) return;

        let stationTitle = stBasic?.name?.[this.#lang] || stBasic?.name?.en || stRich?.id?.toUpperCase() || this.#stationId.toUpperCase();
        const code = (stBasic?.id || stRich?.id || this.#stationId).toUpperCase();
        const layoutType = stRich?.type || stBasic?.properties?.layout || "Elevated";
        const description = stRich?.description || "No detailed description available for this station.";

        heroContainer.innerHTML = `
            <div class="station-hero-header">
                <div class="station-main-title">
                    <h2><span class="station-name-en">${this.#escapeHTML(stationTitle)}</span></h2>
                    <p>Station Code: <strong>${this.#escapeHTML(code)}</strong> | Layout: <strong>${this.#escapeHTML(layoutType)}</strong></p>
                </div>
            </div>
            <p class="station-description-p">📝 ${this.#escapeHTML(description)}</p>
        `;
    }

    #renderTimings(stBasic, stRich) {
        const container = document.getElementById("operating-hours-container");
        if (!container) return;

        const firstTrain = this.#formatTo12Hour(stBasic?.train_schedule?.first_train || stRich?.timings?.opening);
        const lastTrain = this.#formatTo12Hour(stBasic?.train_schedule?.last_train || stRich?.timings?.closing);

        container.innerHTML = `
            <div class="compact-timing-row">
                <span>${this.#escapeHTML(this.#t.operatingHours || "⏰ Station Hours")}</span>
            </div>
            <div class="compact-timing-row border-top-dashed">
                <span>☀️ <strong>${this.#escapeHTML(this.#t.first || "First")}:</strong> <span style="color:rgb(var(--color-success-rgb)); font-weight:700;">${firstTrain}</span></span>
                <span>🌙 <strong>${this.#escapeHTML(this.#t.last || "Last")}:</strong> <span style="color:rgb(var(--color-danger-rgb)); font-weight:700;">${lastTrain}</span></span>
            </div>
        `;
    }

    #renderHelplines(stRich) {
        const container = document.getElementById("contacts-container");
        if (!container) return;

        const mobile = stRich?.contact?.mobile || "8800793101";
        const landline = stRich?.contact?.landline || "N/A";

        container.innerHTML = `
            <h3 class="feature-card-header">${this.#escapeHTML(this.#t.helplines || "📞 Helplines & Support")}</h3>
            <div class="contacts-grid">
                <div class="contact-box">
                    <strong>${this.#escapeHTML(this.#t.mobileHelpline || "Station Mobile Helpline")}</strong>
                    <div><a href="tel:${this.#escapeHTML(mobile)}">${this.#escapeHTML(mobile)}</a></div>
                </div>
                <div class="contact-box">
                    <strong>${this.#escapeHTML(this.#t.landline || "Station Landline")}</strong>
                    <div style="font-weight:700; color:var(--btn-primary-bg); margin-top:3px;">${this.#escapeHTML(landline)}</div>
                </div>
                <div class="contact-box">
                    <strong>${this.#escapeHTML(this.#t.dmrcHelpline || "Universal Helpline")}</strong>
                    <div><a href="tel:155370">155370</a></div>
                </div>
            </div>
        `;
    }

    #renderGates(stRich) {
        const container = document.getElementById("gates-container");
        if (!container) return;

        const gatesObj = stRich?.gates || {};
        const gateKeys = Object.keys(gatesObj);

        if (gateKeys.length === 0) {
            container.innerHTML = `<div class="empty-data-notice">No specific gate details available for this station.</div>`;
            return;
        }

        let html = "";
        gateKeys.forEach(gNum => {
            const g = gatesObj[gNum];
            const divyangTag = g.divyang 
                ? `<span class="divyang-tag accessible">${this.#escapeHTML(this.#t.divyangAccessible || "♿ Divyang Accessible")}</span>` 
                : `<span class="divyang-tag standard">${this.#escapeHTML(this.#t.standardAccess || "🚶 Standard Access")}</span>`;
            const gateCode = g.code || `GA${gNum}`;
            const status = (g.status || "OPEN").toUpperCase();
            const landmark = g.landmark?.[this.#lang] || g.landmark?.en || g.landmark?.hi || "Exit Gate Area";

            html += `
                <div class="gate-card-32">
                    <div class="gate-card-header">
                        <div class="gate-title-group">
                            <span class="gate-number">Gate No. ${this.#escapeHTML(gNum)}</span>
                            <span class="gate-code-tag">${this.#escapeHTML(gateCode)}</span>
                        </div>
                        <span class="status-active">${this.#escapeHTML(status)}</span>
                    </div>
                    <div class="gate-card-body">
                        ${divyangTag}
                    </div>
                    <div class="gate-card-footer">
                        <span>📍 ${this.#escapeHTML(landmark)}</span>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    #renderFacilitiesMasterSection(stRich) {
        const container = document.getElementById("facilities-container");
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
                    <div class="facility-subcategory-title">🔹 ${this.#escapeHTML(cat)} (${items.length})</div>
                    <div class="facility-items-flex">
                        ${items.map(item => `
                            <div class="facility-pill">
                                <span class="facility-name">${this.#escapeHTML(item.name || cat)}</span>
                                <span class="facility-loc">📍 ${this.#escapeHTML(item.location || "Concourse")} ${item.purpose ? `| ${this.#escapeHTML(item.purpose)}` : ""}</span>
                            </div>
                        `).join("")}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    #renderParkingTable(stRich) {
        const container = document.getElementById("parking-container");
        if (!container) return;

        const parkings = stRich?.parkings || [];
        if (parkings.length === 0) {
            container.innerHTML = `<div class="empty-data-notice">🚫 No authorised parking available at this station.</div>`;
            return;
        }

        let tableHTML = `
            <div class="table-responsive-wrapper">
                <table class="station-table">
                    <thead>
                        <tr>
                            <th>${this.#escapeHTML(this.#t.provider || "Provider")}</th>
                            <th>${this.#escapeHTML(this.#t.car || "🚗 Car")}</th>
                            <th>${this.#escapeHTML(this.#t.bike || "🏍️ Bike")}</th>
                            <th>${this.#escapeHTML(this.#t.cycle || "🚲 Cycle")}</th>
                            <th>${this.#escapeHTML(this.#t.location || "Location")}</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        parkings.forEach(p => {
            tableHTML += `
                <tr>
                    <td><strong>${this.#escapeHTML(p.provider || "Authorised Parking")}</strong></td>
                    <td>${p.capacity_car ?? "--"}</td>
                    <td>${p.capacity_motorcycle ?? "--"}</td>
                    <td>${p.capacity_cycle ?? "--"}</td>
                    <td>${this.#escapeHTML(p.location || "Near Exit Gate")}</td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    }

    #renderTransitTable(stRich) {
        const container = document.getElementById("transit-container");
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
                    <div class="facility-subcategory-title">${this.#escapeHTML(this.#t.lifts || "🛗 Lifts")} (${liftKeys.length})</div>
                    <div class="table-responsive-wrapper">
                        <table class="station-table">
                            <thead>
                                <tr>
                                    <th>${this.#escapeHTML(this.#t.code || "Code")}</th>
                                    <th>${this.#escapeHTML(this.#t.location || "Location")}</th>
                                    <th>${this.#escapeHTML(this.#t.placement || "Placement")}</th>
                                    <th>${this.#escapeHTML(this.#t.divyangFriendly || "Divyang Friendly")}</th>
                                    <th>${this.#escapeHTML(this.#t.status || "Status")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${liftKeys.map(k => {
                                    const item = liftsObj[k];
                                    return `
                                        <tr>
                                            <td><strong>${this.#escapeHTML(item.code || `LF${k}`)}</strong></td>
                                            <td>${this.#escapeHTML(item.location || "Concourse")}</td>
                                            <td>${this.#escapeHTML(item.placement || "Inside")}</td>
                                            <td class="${item.divyang_friendly ? "status-yes" : "status-no"}">${item.divyang_friendly ? this.#escapeHTML(this.#t.yes || "✔️ Yes") : this.#escapeHTML(this.#t.no || "❌ No")}</td>
                                            <td class="${item.status !== false ? "status-active" : "status-maintenance"}">${item.status !== false ? this.#escapeHTML(this.#t.active || "Active") : this.#escapeHTML(this.#t.maintenance || "Maintenance")}</td>
                                        </tr>
                                    `;
                                }).join("")}
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
                    <div class="facility-subcategory-title">${this.#escapeHTML(this.#t.escalators || "🪜 Escalators")} (${escKeys.length})</div>
                    <div class="table-responsive-wrapper">
                        <table class="station-table">
                            <thead>
                                <tr>
                                    <th>${this.#escapeHTML(this.#t.code || "Code")}</th>
                                    <th>${this.#escapeHTML(this.#t.location || "Location")}</th>
                                    <th>${this.#escapeHTML(this.#t.placement || "Placement")}</th>
                                    <th>${this.#escapeHTML(this.#t.divyangFriendly || "Divyang Friendly")}</th>
                                    <th>${this.#escapeHTML(this.#t.status || "Status")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${escKeys.map(k => {
                                    const item = escalatorsObj[k];
                                    return `
                                        <tr>
                                            <td><strong>${this.#escapeHTML(item.code || `EC${k}`)}</strong></td>
                                            <td>${this.#escapeHTML(item.location || "Concourse")}</td>
                                            <td>${this.#escapeHTML(item.placement || "Inside")}</td>
                                            <td class="${item.divyang_friendly ? "status-yes" : "status-no"}">${item.divyang_friendly ? this.#escapeHTML(this.#t.yes || "✔️ Yes") : this.#escapeHTML(this.#t.no || "❌ No")}</td>
                                            <td class="${item.status !== false ? "status-active" : "status-maintenance"}">${item.status !== false ? this.#escapeHTML(this.#t.active || "Active") : this.#escapeHTML(this.#t.maintenance || "Maintenance")}</td>
                                        </tr>
                                    `;
                                }).join("")}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        }

        finalHTML += `</div>`;
        container.innerHTML = finalHTML;
    }

    #renderNearbyPlaces(stRich) {
        const container = document.getElementById("nearby-container");
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
                    <div class="nearby-cat-title">🏛️ ${this.#escapeHTML(cat)}</div>
                    <ul class="nearby-places-list">
                        ${places.map(p => `
                            <li class="nearby-place-item">
                                <span>${this.#escapeHTML(p.name)}</span>
                                <span class="distance-chip">${p.distance_km ? `${p.distance_km} km` : ""} ${p.walking_min ? `| 🚶 ${p.walking_min} min` : ""}</span>
                            </li>
                        `).join("")}
                    </ul>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;
    }

    #render404() {
        const main = document.querySelector(".station-page-container");
        if (main) {
            main.innerHTML = `
                <div style="text-align:center; padding:5rem 1rem; color:var(--text-secondary);">
                    <h2 style="font-size:2rem; margin-bottom:1rem;">⚠️ Station Not Found</h2>
                    <p>The requested station code/ID "<strong>${this.#escapeHTML(this.#stationId)}</strong>" was not found in our metro directory.</p>
                    <a href="all_stations.html?city=${encodeURIComponent(this.#currentCity)}" class="back-btn" style="margin-top:1.5rem;">${this.#escapeHTML(this.#t.backBtn || "⬅️ Back to All Stations")}</a>
                </div>
            `;
        }
    }

    #formatTo12Hour(timeStr) {
        if (!timeStr || timeStr === "N/A" || timeStr === "null" || timeStr === "") {
            return "--:--";
        }
        const parts = timeStr.split(":");
        if (parts.length < 2) return timeStr;

        let hours = parseInt(parts[0], 10);
        const minutes = parts[1];
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12;
        const strHours = hours < 10 ? "0" + hours : hours;

        return `${strHours}:${minutes} ${ampm}`;
    }

    #escapeHTML(str) {
        if (!str || typeof str !== "string") return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Auto-instantiate on DOM ready
document.addEventListener("DOMContentLoaded", () => {
    const app = new StationInfoManager();
    app.init();
});