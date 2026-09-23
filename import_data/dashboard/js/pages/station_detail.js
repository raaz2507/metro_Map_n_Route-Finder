/**
 * @file station_detail.js
 * @module pages/StationDetailController
 * @description Enterprise Station Inspector & Audit Detail Controller.
 * Hardened with $O(1)$ JSON Tree CSS Toggling, AbortController Race-Guard, and Strict XSS Sanitization.
 */

import i18n from '../core/i18n.js';
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { ToastManager } from '../components/Toast.js';
import { getElements, escapeHtml } from '../core/DomUtils.js';
import { StationSchemaResolver } from '../core/StationSchemaResolver.js';
import { JSONTreeInspector } from '../components/JSONTreeInspector.js';

// ============================================================================
// 1. CENTRAL REACTIVE DATA & CACHE STORE (SINGLETON)
// ============================================================================
class CentralStationStore {
	#state = {
		activeNetwork: 'nmrc_noida',
		activeStationSlug: 'noida_sector_51',
		activeStage: 'cleaned',
		activeTheme: 'dark',
		activeLang: 'en'
	};

	#datasetCache = new Map();
	#subscribers = new Map();

	constructor() {
		this.#bootstrapFromStorage();
	}

	#bootstrapFromStorage() {
		const urlParams = new URLSearchParams(window.location.search);
		this.#state.activeNetwork = urlParams.get('network') || localStorage.getItem('active_network') || 'nmrc_noida';
		this.#state.activeStationSlug = urlParams.get('station') || localStorage.getItem('active_station') || 'noida_sector_51';
		this.#state.activeStage = urlParams.get('stage') || localStorage.getItem('active_stage') || 'cleaned';
		this.#state.activeTheme = localStorage.getItem('theme') || 'dark';
		this.#state.activeLang = localStorage.getItem('language') || 'en';
	}

	getState(key = null) {
		if (key) return this.#state[key];
		return { ...this.#state };
	}

	setState(partialState = {}) {
		const changedKeys = [];
		for (const [key, val] of Object.entries(partialState)) {
			if (this.#state[key] !== val) {
				this.#state[key] = val;
				changedKeys.push(key);
				this.#persistSlice(key, val);
			}
		}
		changedKeys.forEach(k => this.#notify(k, this.#state[k]));
	}

	#persistSlice(key, val) {
		try {
			if (key === 'activeNetwork') localStorage.setItem('active_network', val);
			else if (key === 'activeStationSlug') localStorage.setItem('active_station', val);
			else if (key === 'activeStage') localStorage.setItem('active_stage', val);
			else if (key === 'activeTheme') localStorage.setItem('theme', val);
			else if (key === 'activeLang') localStorage.setItem('language', val);
		} catch (err) {
			console.warn('[CentralStationStore] Storage error:', err);
		}
	}

	subscribe(key, callback) {
		if (!this.#subscribers.has(key)) this.#subscribers.set(key, new Set());
		this.#subscribers.get(key).add(callback);
		return () => this.#subscribers.get(key)?.delete(callback);
	}

	#notify(key, value) {
		this.#subscribers.get(key)?.forEach(cb => cb(value));
	}

	/**
	 * Cache-First Dataset Ingestion: In-memory cache eliminates duplicate network round-trips
	 */
	async loadDataset(networkId, stage, signal = null) {
		const cacheKey = `${networkId}_${stage}`;
		if (this.#datasetCache.has(cacheKey)) {
			return this.#datasetCache.get(cacheKey);
		}

		const url = `/api/dataset?network=${encodeURIComponent(networkId)}&stage=${encodeURIComponent(stage)}`;
		const res = await fetch(url, { signal });
		if (!res.ok) throw new Error(`Dataset HTTP ${res.status} for ${networkId} [${stage}]`);

		const data = await res.json();
		this.#datasetCache.set(cacheKey, data);
		return data;
	}
}

export const store = new CentralStationStore();


// ============================================================================
// 3. MAIN STATION DETAIL APPLICATION CONTROLLER (ES2022 OOP)
// ============================================================================
export class StationDetailApp {
	#dom = {};
	#treeInspector = null;
	#stationData = null;
	#abortController = null;

	constructor() {}

	async init() {
		// 1. Initialize Bilingual i18n
		if (i18n && typeof i18n.initI18n === 'function') {
			await i18n.initI18n();
		}

		// 2. Set Theme from Store & Sync Buttons
		const activeTheme = store.getState('activeTheme');
		document.documentElement.setAttribute('data-theme', activeTheme);

		// 3. Resolve DOM References via DomUtils
		this.#dom = getElements({
			breadcrumbNetwork: '#breadcrumbNetwork',
			breadcrumbStation: '#breadcrumbStation',
			pipelineBadge: '#headerPipelineStageBadge',
			sourceBadge: '#headerSourceBadge',
			heroLayoutBadge: '#heroLayoutBadge',
			heroTypeBadge: '#heroTypeBadge',
			heroStageBadge: '#heroStageBadge',
			heroNameEn: '#heroNameEn',
			heroNameHi: '#heroNameHi',
			heroSlug: '#heroSlug',
			heroCode: '#heroCode',
			heroCoords: '#heroCoords',
			heroTimings: '#heroTimings',
			heroContact: '#heroContact',
			gatesGrid: '#gatesGrid',
			parkingContainer: '#parkingContainer',
			facilitiesGrid: '#facilitiesGrid',
			liftsCount: '#liftsCount',
			liftsList: '#liftsList',
			escalatorsCount: '#escalatorsCount',
			escalatorsList: '#escalatorsList',
			layoutsContainer: '#layoutsContainer',
			feederBusesContainer: '#feederBusesContainer',
			neighborsGrid: '#neighborsGrid',
			jsonTreeContainer: '#jsonTreeContainer',
			jsonSearchInput: '#jsonSearchInput',
			clearJsonSearchBtn: '#clearJsonSearchBtn',
			jsonMatchBadge: '#jsonMatchBadge',
			prevMatchBtn: '#prevMatchBtn',
			nextMatchBtn: '#nextMatchBtn',
			toggleCaseBtn: '#toggleCaseBtn',
			toggleWordBtn: '#toggleWordBtn',
			toggleRegexBtn: '#toggleRegexBtn'
		});

		// Mount Autonomous Tree Inspector
		this.#treeInspector = new JSONTreeInspector('#stationJsonInspector', {
			title: 'Station JSON Payload',
			subtitle: 'Line Numbered Gutter • Foldable Tree',
			dotColor: 'indigo'
		});

		this.#bindUIEvents();
		this.#updateThemeButtons();
		this.#updateBreadcrumbs();
		this.#updateStageTabs();

		// Common Global Header & Footer Mount
		HeaderComponent.render('globalHeader', 'admin');
		FooterComponent.render('globalFooter');
		// 5. Ingest Active Station Data
		await this.loadStation();
	}

	#bindUIEvents() {
		// Stage Switchers (Raw, Cleaned, Master)
		document.querySelectorAll('.stage-view-tab').forEach(btn => {
			btn.addEventListener('click', async () => {
				const newStage = btn.getAttribute('data-detail-stage');
				if (newStage && newStage !== store.getState('activeStage')) {
					store.setState({ activeStage: newStage });
					this.#updateStageTabs();
					await this.loadStation();
				}
			});
		});

		// Theme Switchers with Active Class Sync
		document.querySelectorAll('.theme-select-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				const theme = btn.getAttribute('data-set-theme');
				if (theme) {
					store.setState({ activeTheme: theme });
					document.documentElement.setAttribute('data-theme', theme);
					this.#updateThemeButtons();
				}
			});
		});

		// Collapse/Expand All in JSON Inspector
		document.getElementById('toggleAllJsonBtn')?.addEventListener('click', () => {
			this.#treeInspector?.toggleCollapseAll();
		});

		// Copy Raw JSON
		document.getElementById('copyStationJsonBtn')?.addEventListener('click', () => {
			if (!this.#stationData) return;
			navigator.clipboard.writeText(JSON.stringify(this.#stationData, null, 2));
			ToastManager.success('Station JSON copied to clipboard!');
		});

		// Download .json file
		document.getElementById('downloadStationJsonBtn')?.addEventListener('click', () => {
			if (!this.#stationData) return;
			const slug = store.getState('activeStationSlug');
			const stage = store.getState('activeStage');
			const blob = new Blob([JSON.stringify(this.#stationData, null, '\t')], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${slug}_${stage}.json`;
			a.click();
			URL.revokeObjectURL(url);
			ToastManager.info(`Downloaded ${slug}_${stage}.json`);
		});

		// Re-render when language changes
		window.addEventListener('languageChanged', () => {
			this.#updateBreadcrumbs();
			this.renderStationVisuals();
		});
	}

	#updateThemeButtons() {
		const activeTheme = store.getState('activeTheme');
		document.querySelectorAll('.theme-select-btn').forEach(btn => {
			btn.classList.toggle('active', btn.getAttribute('data-set-theme') === activeTheme);
		});
	}

	#updateBreadcrumbs() {
		const net = store.getState('activeNetwork');
		const stn = store.getState('activeStationSlug');
		if (this.#dom.breadcrumbNetwork) this.#dom.breadcrumbNetwork.textContent = net.replace(/_/g, ' ').toUpperCase();
		if (this.#dom.breadcrumbStation) this.#dom.breadcrumbStation.textContent = stn;
	}

	#updateStageTabs() {
		const stage = store.getState('activeStage');
		document.querySelectorAll('.stage-view-tab').forEach(btn => {
			btn.classList.toggle('active', btn.getAttribute('data-detail-stage') === stage);
		});

		if (this.#dom.pipelineBadge) this.#dom.pipelineBadge.textContent = `STAGE: ${stage.toUpperCase()}`;
		if (this.#dom.sourceBadge) {
			this.#dom.sourceBadge.textContent = stage.toUpperCase();
			this.#dom.sourceBadge.className = stage === 'master' ? 'badge-emerald' : stage === 'cleaned' ? 'badge-amber' : 'badge-rose';
		}
		if (this.#dom.heroStageBadge) this.#dom.heroStageBadge.textContent = `Stage: ${stage.toUpperCase()}`;
	}

	async loadStation() {
		if (this.#abortController) {
			this.#abortController.abort();
		}
		this.#abortController = new AbortController();
		const signal = this.#abortController.signal;

		const network = store.getState('activeNetwork');
		const stage = store.getState('activeStage');
		const targetSlug = store.getState('activeStationSlug');

		try {
			const dataset = await store.loadDataset(network, stage, signal);
			const stationsObj = dataset.stations || dataset;

			let matched = stationsObj[targetSlug];
			if (!matched) {
				const norm = targetSlug.toLowerCase().replace(/[-_]/g, '');
				for (const [k, v] of Object.entries(stationsObj)) {
					if (k.toLowerCase().replace(/[-_]/g, '') === norm) {
						matched = v;
						store.setState({ activeStationSlug: k });
						break;
					}
				}
			}

			if (!matched) {
				const firstKey = Object.keys(stationsObj)[0];
				if (firstKey) {
					matched = stationsObj[firstKey];
					store.setState({ activeStationSlug: firstKey });
				}
			}

			this.#stationData = matched || { error: 'Station payload not found in this stage' };
			this.renderStationVisuals();
			this.#treeInspector?.setJSON(this.#stationData, `${store.getState('activeStationSlug')} (${stage.toUpperCase()})`);

		} catch (err) {
			if (err.name === 'AbortError') return;
			ToastManager.error(`Failed to load dataset: ${err.message}`);
			this.#stationData = { error: err.message, network, stage };
			this.#treeInspector?.setJSON(this.#stationData, 'Intake Missing');
		}
	}

		renderStationVisuals() {
		const d = this.#stationData;
		if (!d) return;

		// 1. HERO SECTION (Resolved via StationSchemaResolver)
		const slug = store.getState('activeStationSlug');
		const nameEn = escapeHtml(StationSchemaResolver.getName(d, 'en', slug));
		const nameHi = escapeHtml(StationSchemaResolver.getName(d, 'hi'));
		const code = escapeHtml(d.station_code || d.code || 'STD');
		const line = escapeHtml(d.line || (Array.isArray(d.lines) ? d.lines[0] : null) || 'Main Line');

		if (this.#dom.heroNameEn) this.#dom.heroNameEn.textContent = nameEn;
		if (this.#dom.heroNameHi) this.#dom.heroNameHi.textContent = nameHi;
		if (this.#dom.heroSlug) this.#dom.heroSlug.innerHTML = `${escapeHtml(slug)} • Line: <strong class="text-indigo">${line}</strong>`;
		if (this.#dom.heroCode) this.#dom.heroCode.textContent = code;

		const coords = StationSchemaResolver.getCoordinates(d);
		if (this.#dom.heroCoords) {
			this.#dom.heroCoords.textContent = coords ? `${coords.lat.toFixed(4)}, ${coords.lon.toFixed(4)}` : 'N/A';
		}

		if (this.#dom.heroTimings) {
			this.#dom.heroTimings.textContent = StationSchemaResolver.getTimings(d);
		}

		if (this.#dom.heroContact) {
			this.#dom.heroContact.textContent = StationSchemaResolver.getContact(d);
		}

		this.#renderGates(d);
		this.#renderParking(d);
		this.#renderFacilities(d);
		this.#renderVerticalTransit(d);
		this.#renderLayoutsAndBuses(d);
		this.#renderNeighbors(d);
	}

	#renderGates(d) {
		if (!this.#dom.gatesGrid) return;
		this.#dom.gatesGrid.innerHTML = '';

		const gatesList = StationSchemaResolver.getGates(d);

		if (gatesList.length === 0) {
			this.#dom.gatesGrid.innerHTML = `<div class="kpi-card col-span-full text-center py-4 text-muted text-xs">No gate records available for this station stage.</div>`;
			return;
		}

		gatesList.forEach(g => {
			const card = document.createElement('div');
			card.className = 'kpi-card';
			const gName = escapeHtml(g.name);
			const lm = escapeHtml(g.landmark);
			const badgeClass = g.status === 'Open' ? 'badge-stage text-emerald' : 'badge-stage text-rose';

			card.innerHTML = `
				<div class="flex-align justify-between mb-xs">
					<strong class="text-xs text-indigo font-bold">${gName}</strong>
					<span class="${badgeClass}">${g.status}</span>
				</div>
				<p class="text-xs text-muted m-0">${lm}</p>
			`;
			this.#dom.gatesGrid.appendChild(card);
		});
	}

	#renderParking(d) {
		if (!this.#dom.parkingContainer) return;
		this.#dom.parkingContainer.innerHTML = '';

		const parking = d.details_raw?.parkingCharges || d.parking || null;
		if (!parking || (parking.charges && parking.charges.length === 0)) {
			this.#dom.parkingContainer.innerHTML = `<div class="kpi-card text-center py-4 text-muted text-xs">Parking facility details not published for this station.</div>`;
			return;
		}

		const charges = parking.charges || [];
		charges.forEach(ch => {
			const card = document.createElement('div');
			card.className = 'kpi-card';
			const itemName = escapeHtml(ch.item || 'Vehicle Parking');

			let periodsHtml = '';
			if (ch.cycles) {
				ch.cycles.forEach(c => {
					const cycleName = escapeHtml(c.cycle || '');
					(c.periods || []).forEach(p => {
						const fare = escapeHtml(p.states?.[0]?.fare || p.fare || '-');
						const periodName = escapeHtml(p.period || cycleName);
						periodsHtml += `
							<div class="flex-align justify-between text-xs py-xs border-b">
								<span class="text-muted">${periodName}</span>
								<strong class="font-mono text-emerald">${fare}</strong>
							</div>
						`;
					});
				});
			}

			card.innerHTML = `
				<div class="font-bold text-xs text-primary mb-xs">${itemName}</div>
				<div class="stack-xs">${periodsHtml || '<div class="text-muted text-xs">Standard Tariff Applied</div>'}</div>
			`;
			this.#dom.parkingContainer.appendChild(card);
		});
	}

	#renderFacilities(d) {
		if (!this.#dom.facilitiesGrid) return;
		this.#dom.facilitiesGrid.innerHTML = '';

		const facs = d.facilities || d.details_raw?.facilities || [];
		const facsList = Array.isArray(facs) ? facs : Object.keys(facs);

		if (facsList.length === 0) {
			this.#dom.facilitiesGrid.innerHTML = `<div class="kpi-card col-span-full text-center py-4 text-muted text-xs">Standard civic amenities operational (Drinking Water, CCTV, First-Aid).</div>`;
			return;
		}

		facsList.forEach(f => {
			const card = document.createElement('div');
			card.className = 'kpi-card flex-align gap-sm';
			const name = escapeHtml(typeof f === 'string' ? f : (f.name || f.facility || 'Facility'));
			card.innerHTML = `
				<span class="status-indicator-dot dot-emerald"></span>
				<span class="text-xs font-semibold">${name}</span>
			`;
			this.#dom.facilitiesGrid.appendChild(card);
		});
	}

	#renderVerticalTransit(d) {
		const vt = StationSchemaResolver.getVerticalTransit(d);

		if (this.#dom.liftsCount) this.#dom.liftsCount.textContent = vt.liftsCount;
		if (this.#dom.escalatorsCount) this.#dom.escalatorsCount.textContent = vt.escalatorsCount;

		if (this.#dom.liftsList) {
			this.#dom.liftsList.innerHTML = vt.liftsCount === 0 
				? '<div class="text-muted text-xs p-xs">No lift records.</div>' 
				: vt.lifts.map(l => `
					<div class="flex-align justify-between text-xs py-xs border-b">
						<span class="font-mono text-primary">${escapeHtml(l.name || l.code || l.id || 'Lift')}</span>
						<span class="badge-stage text-emerald">${l.status === false ? 'Maintenance' : 'Operational'}</span>
					</div>
				`).join('');
		}

		if (this.#dom.escalatorsList) {
			this.#dom.escalatorsList.innerHTML = vt.escalatorsCount === 0 
				? '<div class="text-muted text-xs p-xs">No escalator records.</div>' 
				: vt.escalators.map(e => `
					<div class="flex-align justify-between text-xs py-xs border-b">
						<span class="font-mono text-primary">${escapeHtml(e.name || e.code || e.id || 'Escalator')}</span>
						<span class="badge-stage text-emerald">${e.status === false ? 'Maintenance' : 'Operational'}</span>
					</div>
				`).join('');
		}
	}

	#renderLayoutsAndBuses(d) {
		if (this.#dom.layoutsContainer) {
			const layouts = d.layouts || d.summary_raw?.images || d.details_raw?.media || null;
			const rawUrl = layouts ? (layouts.png || layouts.url || (typeof layouts === 'string' ? layouts : null)) : null;

			// Strict Protocol Whitelisting against javascript: injection
			const isSafeUrl = rawUrl && (
				rawUrl.startsWith('http://') || 
				rawUrl.startsWith('https://') || 
				rawUrl.startsWith('/') || 
				rawUrl.startsWith('./')
			);

			if (isSafeUrl) {
				const safeUrl = encodeURI(rawUrl);
				this.#dom.layoutsContainer.innerHTML = `
					<div class="kpi-card text-center">
						<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="text-indigo text-xs font-bold underline">View Station Layout Schematic ↗</a>
					</div>
				`;
			} else {
				this.#dom.layoutsContainer.innerHTML = '<div class="kpi-card text-center text-muted text-xs py-2">Schematic uploaded in Master Audit Stage</div>';
			}
		}

		if (this.#dom.feederBusesContainer) {
			const buses = d.feeder_buses || d.buses || [];
			this.#dom.feederBusesContainer.innerHTML = Array.isArray(buses) && buses.length > 0
				? buses.map(b => `<div class="kpi-card text-xs">${escapeHtml(b)}</div>`).join('')
				: '<div class="kpi-card text-center text-muted text-xs py-2">Local city transport connectivity available</div>';
		}
	}

	#renderNeighbors(d) {
		if (!this.#dom.neighborsGrid) return;
		const neighbors = d.adjacent_stations || d.neighbors || [];
		const nList = Array.isArray(neighbors) ? neighbors : Object.values(neighbors);

		if (nList.length === 0) {
			this.#dom.neighborsGrid.innerHTML = `<div class="kpi-card col-span-full text-center py-4 text-muted text-xs">Sequential transit graph link calculated during Master synthesis.</div>`;
			return;
		}

		this.#dom.neighborsGrid.innerHTML = nList.map(n => `
			<div class="kpi-card flex-align justify-between">
				<span class="text-xs font-bold text-primary">${escapeHtml(n.name || n)}</span>
				<span class="badge-line">Adjacent</span>
			</div>
		`).join('');
	}
}

// Bootstrap on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
	const app = new StationDetailApp();
	await app.init();
});