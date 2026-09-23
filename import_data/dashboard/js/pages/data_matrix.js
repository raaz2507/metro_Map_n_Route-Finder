/**
 * @file data_matrix.js
 * @module pages/DataMatrixController
 * @description Master Data Coverage & Feature Matrix Controller.
 * Hardened with ES2022 Private OOP (#), Central Manifest Integration, and Zero-CDN Local SVG Assets.
 */

import i18n from '../core/i18n.js';
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { ToastManager } from '../components/Toast.js';
import { getElements, escapeHtml } from '../core/DomUtils.js';

export class DataMatrixApp {
	#dom = {};
	#manifestData = {};
	#abortController = null;
	#supportDataMap = {};
	

	constructor() {
		this.#dom = getElements({
			metricStates: '#metricStates',
			metricOperators: '#metricOperators',
			metricStations: '#metricStations',
			metricFare: '#metricFare',
			matrixTableBody: '#matrixTableBody',
			supportTableBody: '#supportTableBody',
			btnAuditSupport: '#btnAuditSupport',
			auditSupportIcon: '#auditSupportIcon',
			auditSupportText: '#auditSupportText',
			supportAuditBanner: '#supportAuditBanner'
		});

		this.#bindEvents();
	}

	async init() {
		await this.#loadData();
	}

	#bindEvents() {
		if (!this.#dom.btnAuditSupport) return;

			this.#dom.btnAuditSupport.addEventListener('click', async () => {
			this.#dom.btnAuditSupport.disabled = true;
			if (this.#dom.auditSupportIcon) {
				this.#dom.auditSupportIcon.classList.add('icon-spin');
			}
			if (this.#dom.auditSupportText) {
				this.#dom.auditSupportText.textContent = "Auditing Live Networks...";
			}

			try {
				const res = await fetch('/api/portals/health');
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const health = await res.json();

				const online = health.online_count || 0;
				const total = health.total_portals || 5;
				const avgLat = health.average_latency_ms || 0;
				const isAllOk = health.all_operational;

				if (this.#dom.supportAuditBanner) {
					this.#dom.supportAuditBanner.classList.remove('hidden');
					const badgeColor = isAllOk ? 'text-emerald' : 'text-amber';
					const statusIcon = isAllOk ? '✓' : '⚠️';

					this.#dom.supportAuditBanner.innerHTML = `
						<div class="flex items-center gap-sm ${badgeColor}">
							<span>${statusIcon}</span>
							<strong>Live Transit Health Audit Completed:</strong>
							<span>${online}/${total} Portals Operational • Average Latency: ${avgLat}ms • Verified via live concurrent HTTP ping.</span>
						</div>
					`;
				}

				if (isAllOk) {
					ToastManager.success(`All ${total} Transit Portals 100% Verified Operational! (${avgLat}ms)`);
				} else {
					ToastManager.warning(`${online}/${total} Portals reachable. Some networks had high latency.`);
				}
			} catch (err) {
				if (this.#dom.supportAuditBanner) {
					this.#dom.supportAuditBanner.classList.remove('hidden');
					this.#dom.supportAuditBanner.innerHTML = `
						<div class="flex items-center gap-sm text-rose">
							<span>✗</span>
							<strong>Live Audit Failed:</strong>
							<span>${escapeHtml(err.message)}</span>
						</div>
					`;
				}
				ToastManager.error(`Health audit failed: ${err.message}`);
			} finally {
				if (this.#dom.auditSupportIcon) {
					this.#dom.auditSupportIcon.classList.remove('icon-spin');
				}
				if (this.#dom.auditSupportText) {
					this.#dom.auditSupportText.textContent = "Audit Portal Health";
				}
				this.#dom.btnAuditSupport.disabled = false;
			}
		});
	}

	async #loadData() {
		if (this.#abortController) {
			this.#abortController.abort();
		}
		this.#abortController = new AbortController();
		const networks = this.#manifestData.networks || {};

		try {
			const res = await fetch('/api/manifest', { signal: this.#abortController.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			this.#manifestData = await res.json();

			const networks = this.#manifestData.networks || {};
			// ⚡ Fetch authentic passenger_support.json for all registered networks in parallel
			const supportEntries = await Promise.all(
				Object.keys(networks).map(async (netId) => {
					try {
						const sRes = await fetch(`/api/dataset?network=${encodeURIComponent(netId)}&stage=support`);
						if (sRes.ok) {
							const sData = await sRes.json();
							return [netId, sData];
						}
					} catch (_) {}
					return [netId, null];
				})
			);
			this.#supportDataMap = Object.fromEntries(supportEntries.filter(([_, d]) => d !== null));
			const stateGroups = this.#groupNetworksByState(networks);
			this.#computeAndRenderMetrics(networks, stateGroups);
			this.#renderMatrixTable(stateGroups);
			this.#renderSupportTable(networks);
		} catch (err) {
			if (err.name === 'AbortError') return;
			ToastManager.error(`Failed to load matrix: ${err.message}`);
			if (this.#dom.matrixTableBody) {
				this.#dom.matrixTableBody.innerHTML = `
					<tr>
						<td colspan="13" class="text-center py-6 text-muted font-mono text-xs">
							Error loading transit matrix data. Ensure pipeline server is running.
						</td>
					</tr>
				`;
			}
		}
	}

	#groupNetworksByState(networks) {
		const stateMap = new Map();
		for (const [netId, netInfo] of Object.entries(networks)) {
			const state = netInfo.state || 'General';
			if (!stateMap.has(state)) {
				stateMap.set(state, []);
			}
			stateMap.get(state).push({ netId, ...netInfo });
		}
		return stateMap;
	}

	#computeAndRenderMetrics(networks, stateGroups) {
		const totalStates = stateGroups.size;
		const netEntries = Object.entries(networks);
		const totalOperators = netEntries.length;

		let totalStations = 0;
		let activeFaresCount = 0;

		netEntries.forEach(([_, info]) => {
			totalStations += (info.total_stations || 0);
			const stage = info.pipeline?.stage || '';
			if (stage === 'stage_3_structured' || stage === 'stage_2_cleaned') {
				activeFaresCount++;
			}
		});

		if (this.#dom.metricStates) this.#dom.metricStates.textContent = `${totalStates} Regions`;
		if (this.#dom.metricOperators) this.#dom.metricOperators.textContent = `${totalOperators} Systems`;
		if (this.#dom.metricStations) this.#dom.metricStations.textContent = `${totalStations} Stations`;
		if (this.#dom.metricFare) this.#dom.metricFare.textContent = `${activeFaresCount}/${totalOperators} Active`;
	}

	#renderMatrixTable(stateGroups) {
		if (!this.#dom.matrixTableBody) return;
		this.#dom.matrixTableBody.innerHTML = '';

		let stateIdx = 0;
		const frag = document.createDocumentFragment();

		for (const [stateName, netList] of stateGroups.entries()) {
			const rowSpan = netList.length;
			const stateNote = netList[0]?.state_note || netList[0]?.city || '';

			netList.forEach((net, idx) => {
				const tr = document.createElement('tr');
				tr.className = `matrix-row ${idx === 0 && stateIdx > 0 ? 'state-boundary' : ''}`;

				let rowHtml = '';

				// Column 1: State / Region (Rowspan applied on first row of group)
				if (idx === 0) {
					rowHtml += `
						<td rowspan="${rowSpan}" class="col-w-state text-center state-cell">
							<div class="font-bold text-xs text-primary">${escapeHtml(stateName)}</div>
							${stateNote ? `<div class="text-[10px] text-muted mt-1 font-mono">(${escapeHtml(stateNote)})</div>` : ''}
						</td>
					`;
				}

				// Column 2: Network & Line
				const netName = escapeHtml(net.name || net.netId);
				const netCity = escapeHtml(net.city || '');
				const netIcon = escapeHtml(net.icon || '🚇');
				const netUrl = escapeHtml(net.source_url || '#');
				const stage = net.pipeline?.stage || 'stage_1_raw';
				const stnCount = net.total_stations || 0;

				rowHtml += `
					<td class="col-w-network">
						<div class="flex items-center gap-xs">
							<span class="text-base">${netIcon}</span>
							<div>
								<a href="${netUrl}" target="_blank" rel="noopener noreferrer" class="network-link" title="Open Official Portal">
									${netName} ↗
								</a>
								<div class="text-[10px] text-muted">${netCity} • <span class="font-mono text-indigo">${stnCount} Stns</span></div>
							</div>
						</div>
					</td>
				`;

				// Sub-Columns: Coverage Badges based on Pipeline Stage
				const isStage3 = stage === 'stage_3_structured';
				const isStage2 = stage === 'stage_2_cleaned' || isStage3;

				// Station Info: Geo, Gates, Lifts, Parking, Facilities, Emergency
				rowHtml += `
					<td class="text-center">${this.#renderBadge(isStage2 ? 'available' : 'partial', 'Geo')}</td>
					<td class="text-center">${this.#renderBadge(isStage2 ? 'available' : 'partial', 'Gates')}</td>
					<td class="text-center">${this.#renderBadge(isStage2 ? 'available' : 'missing', 'Lifts')}</td>
					<td class="text-center">${this.#renderBadge(isStage3 ? 'available' : 'partial', 'Parking')}</td>
					<td class="text-center">${this.#renderBadge(isStage2 ? 'available' : 'partial', 'Amenities')}</td>
					<td class="text-center">${this.#renderBadge(isStage2 ? 'available' : 'partial', 'Emergency')}</td>
				`;

				// Fare Engine Sub-Columns: Pricing Model, Smart Cards, Freshness
				rowHtml += `
					<td class="text-center">
						<span class="badge-status badge-available font-mono">Distance Matrix</span>
					</td>
					<td class="text-center">${this.#renderBadge('available', 'NCMC')}</td>
					<td class="text-center">
						<span class="badge-status ${isStage3 ? 'badge-available' : 'badge-partial'} font-mono text-[10px]">
							${isStage3 ? 'Live REST API' : 'Stage 2 Filter'}
						</span>
					</td>
				`;

				// Operations: Train Timing, Interchanges
				rowHtml += `
					<td class="text-center col-w-timing">${this.#renderBadge(isStage2 ? 'available' : 'partial', 'Timings')}</td>
					<td class="text-center col-w-interchange">${this.#renderBadge(isStage3 ? 'available' : 'partial', 'Transit Graph')}</td>
				`;

				tr.innerHTML = rowHtml;
				frag.appendChild(tr);
			});

			stateIdx++;
		}

		this.#dom.matrixTableBody.appendChild(frag);
	}

	#renderBadge(status, label) {
		if (status === 'available') {
			return `<span class="badge-status badge-available" title="${label}: Verified">✓ Live</span>`;
		} else if (status === 'partial') {
			return `<span class="badge-status badge-partial" title="${label}: Partial">⚠ Partial</span>`;
		}
		return `<span class="badge-status badge-missing" title="${label}: Missing">✗ Intake</span>`;
	}

	#renderSupportTable(networks) {
		if (!this.#dom.supportTableBody) return;
		this.#dom.supportTableBody.innerHTML = '';

		const frag = document.createDocumentFragment();

		for (const [netId, supportInfo] of Object.entries(this.#supportDataMap)) {
			const netMeta = networks[netId] || {};
			const icon = escapeHtml(netMeta.icon || supportInfo.icon || '🚇');
			const name = escapeHtml(netMeta.name || supportInfo.network_name || netId);
			const city = escapeHtml(netMeta.city || supportInfo.city || '');
			const h = supportInfo.helplines || {};
			const f = supportInfo.facilities || {};
			const p = supportInfo.portals || {};

			const tr = document.createElement('tr');
			tr.className = 'matrix-row';

			tr.innerHTML = `
				<td class="col-sup-net">
					<div class="flex-align gap-xs">
						<span>${icon}</span>
						<div>
							<strong class="font-bold text-primary">${name}</strong>
							<div class="text-muted" style="font-size: 10px;">${city}</div>
						</div>
					</div>
				</td>
				<td class="text-center col-sup-care">
					${h.customer_care ? `<a href="tel:${h.customer_care}" class="support-pill support-pill-indigo">${escapeHtml(h.customer_care)}</a>` : '<span class="text-muted">—</span>'}
				</td>
				<td class="text-center col-sup-sec">
					${h.security_cisf ? `<a href="tel:${h.security_cisf}" class="support-pill support-pill-amber">${escapeHtml(h.security_cisf)}</a>` : '<span class="text-muted">—</span>'}
				</td>
				<td class="text-center col-sup-sos">
					<div class="support-pills-col">
						${h.women_safety ? `<a href="tel:${h.women_safety}" class="support-pill support-pill-rose">${escapeHtml(h.women_safety)}</a>` : ''}
						${h.police_emergency ? `<a href="tel:${h.police_emergency}" class="support-pill support-pill-emerald">${escapeHtml(h.police_emergency)}</a>` : ''}
					</div>
				</td>
				<td class="col-sup-depot">
					<div class="depot-location">${escapeHtml(f.central_lost_found_office || '—')}</div>
					${f.lost_found_operating_hours ? `<div class="depot-hours-badge">${escapeHtml(f.lost_found_operating_hours)}</div>` : ''}
				</td>
				<td class="col-sup-portals">
					<div class="portal-chips-container">
						${Object.entries(p).map(([key, url]) => `
							<a href="${encodeURI(url)}" target="_blank" rel="noopener noreferrer" class="portal-chip">
								<span>${escapeHtml(key.replace(/_/g, ' '))}</span>
								<span class="portal-chip-arrow">↗</span>
							</a>
						`).join('')}
					</div>
				</td>
			`;

			frag.appendChild(tr);
		}

		this.#dom.supportTableBody.appendChild(frag);
	}
}

// Bootstrap on DOM Ready with Unified Header & Footer
document.addEventListener('DOMContentLoaded', async () => {
	if (i18n && typeof i18n.initI18n === 'function') {
		await i18n.initI18n();
	}

	HeaderComponent.render('globalHeader', 'matrix');
	FooterComponent.render('globalFooter');

	const app = new DataMatrixApp();
	await app.init();
});