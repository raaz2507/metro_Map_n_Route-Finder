/**
 * @file admin.js
 * @module pages/AdminController
 * @description Master Application Controller for Pipeline & Datasets.
 * Hardened with ES2022 Private OOP (#), AbortController Race-Guard, and XSS Sanitization.
 */
import i18n from '../core/i18n.js';
import { getElements, escapeHtml } from '../core/DomUtils.js';
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { ToastManager } from '../components/Toast.js';
import { StationSchemaResolver } from '../core/StationSchemaResolver.js';

// ============================================================================
// 1. SSE TERMINAL CONTROLLER (ES2022 OOP)
// ============================================================================
export class SSETerminalController {
	#dom = {};
	#eventSource = null;
	#activeNetwork = null;

	constructor() {
		this.#dom = getElements({
			modal: '#actionModal',
			viewport: '#pipelineTerminalBody',
			progressBar: '#pipelineProgressBar',
			progressPercent: '#pipelineProgressPercent',
			progressStatus: '#pipelineProgressStatus',
			statusBadge: '#pipelineConsoleBadge',
			scriptLabel: '#pipelineScriptLabel',
			autoScrollCheckbox: '#autoScrollLogsCheckbox',
			closeBtn: '#closeActionModalBtn',
			okBtn: '#actionModalOkBtn',
			clearBtn: '#clearLogsBtn',
			copyBtn: '#copyLogsBtn'
		});

		this.#bindEvents();
	}

	#bindEvents() {
		this.#dom.closeBtn?.addEventListener('click', () => this.closeModal());
		this.#dom.okBtn?.addEventListener('click', () => this.closeModal());
		this.#dom.clearBtn?.addEventListener('click', () => {
			if (this.#dom.viewport) this.#dom.viewport.innerHTML = '';
		});
		this.#dom.copyBtn?.addEventListener('click', () => {
			if (!this.#dom.viewport) return;
			navigator.clipboard.writeText(this.#dom.viewport.innerText);
			ToastManager.show('Logs copied to clipboard', 'success');
		});

		// Keyboard Accessibility: Escape to close modal
		window.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.#dom.modal && !this.#dom.modal.classList.contains('hidden')) {
				this.closeModal();
			}
		});
	}
	appendLog(text) {
		this.#appendLog(text);
	}
	openConsole(networkId, actionTitle = 'Execution Logs') {
		this.#activeNetwork = networkId;
		this.#dom.modal?.classList.remove('hidden');
		if (this.#dom.viewport && !this.#dom.viewport.hasChildNodes()) {
			this.#dom.viewport.innerHTML = `<div class="terminal-ready-text">[Terminal Console Ready - Click "Generate Master" or any pipeline action to run and stream live logs]</div>`;
		}
		if (this.#dom.statusBadge && !this.#eventSource) {
			this.#dom.statusBadge.textContent = 'READY';
			this.#dom.statusBadge.className = 'terminal-status-badge';
		}
		if (this.#dom.scriptLabel) {
			this.#dom.scriptLabel.textContent = `Console: ${actionTitle} (${networkId})`;
		}
	}

	startStream(networkId, action, displayTitle = action) {
		this.openConsole(networkId, displayTitle);

		if (this.#eventSource) this.#eventSource.close();

		const streamUrl = `/api/pipeline/stream?network=${encodeURIComponent(networkId)}&action=${encodeURIComponent(action)}`;
		this.#eventSource = new EventSource(streamUrl);

		this.#eventSource.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data);
				this.#handleStreamPayload(payload);
			} catch {
				this.#appendLog(event.data);
			}
		};

		this.#eventSource.onerror = () => {
			this.#appendLog('[ERROR] Stream connection closed or server unavailable.');
			if (this.#dom.statusBadge) {
				this.#dom.statusBadge.textContent = 'STOPPED';
				this.#dom.statusBadge.className = 'terminal-status-badge badge-stopped';
			}
			this.closeStream();
		};
	}

	#handleStreamPayload(payload) {
		if (payload.type === 'log') {
			this.#appendLog(payload.line);
		} else if (payload.type === 'start') {
			this.#appendLog(`[START] Command: ${payload.command}`);
			this.#updateProgress(30, 'Executing pipeline...');
		} else if (payload.type === 'done') {
			const isSuccess = payload.success;
			this.#updateProgress(100, isSuccess ? 'Completed successfully' : 'Exited with errors');
			if (this.#dom.statusBadge) {
				this.#dom.statusBadge.textContent = isSuccess ? 'SUCCESS' : 'FAILED';
				this.#dom.statusBadge.className = `terminal-status-badge ${isSuccess ? 'badge-success' : 'badge-error'}`;
			}
			this.#appendLog(`\n[FINISHED] Exit Code: ${payload.exit_code}`);
			this.closeStream();

			// ⚡ Show Rich Toast Notification on Completion
			if (isSuccess) {
				ToastManager.success(`Action completed successfully for ${this.#activeNetwork}!`);
			} else {
				ToastManager.error(`Action failed with exit code ${payload.exit_code} (${this.#activeNetwork})`);
			}

			window.dispatchEvent(new CustomEvent('pipelineCompleted', { detail: { network: this.#activeNetwork } }));
		} else if (payload.type === 'error') {
			this.#appendLog(`[ERROR] ${payload.message}`);
			if (this.#dom.statusBadge) {
				this.#dom.statusBadge.textContent = 'ERROR';
				this.#dom.statusBadge.className = 'terminal-status-badge badge-error';
			}
			this.closeStream();
			ToastManager.error(payload.message || 'Pipeline encountered an unexpected error');
		}
	}

	#appendLog(text) {
		if (!this.#dom.viewport) return;
		const line = document.createElement('div');
		line.className = 'terminal-log-line';
		line.textContent = text;
		this.#dom.viewport.appendChild(line);

		if (this.#dom.autoScrollCheckbox?.checked) {
			this.#dom.viewport.scrollTop = this.#dom.viewport.scrollHeight;
		}
	}

	#updateProgress(percent, statusText) {
		if (this.#dom.progressBar) this.#dom.progressBar.style.width = `${percent}%`;
		if (this.#dom.progressPercent) this.#dom.progressPercent.textContent = `${percent}%`;
		if (this.#dom.progressStatus) {
			const span = this.#dom.progressStatus.querySelector('span:last-child');
			if (span) span.textContent = statusText;
		}
	}

	closeStream() {
		if (this.#eventSource) {
			this.#eventSource.close();
			this.#eventSource = null;
		}
	}

	closeModal() {
		this.closeStream();
		this.#dom.modal?.classList.add('hidden');
	}
}

// ============================================================================
// 2. NETWORK NAVIGATION CONTROLLER (SIDEBAR)
// ============================================================================
export class NetworkNavController {
	#dom = {};
	#activeNetworkId = null;
	#manifestData = {};
	#onSelectNetwork = null;

	constructor(onSelectNetwork) {
		this.#onSelectNetwork = onSelectNetwork;
		this.#dom = getElements({
			networksContainer: '#networkNavList',
			networksCountLabel: '#sidebarNetworkCount',
			totalSumEl: '#sidebarTotalStationSum',
			syncTimeEl: '#sidebarSyncTime',
			s3Nets: '#countStage3Nets',
			s3Stns: '#countStage3Stns',
			s2Nets: '#countStage2Nets',
			s2Stns: '#countStage2Stns',
			s1Nets: '#countStage1Nets',
			s1Stns: '#countStage1Stns'
		});

		this.#activeNetworkId = localStorage.getItem('active_network') || 'ncrtc_rrts';
	}

	async load() {
		try {
			const res = await fetch('/api/manifest');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			this.#manifestData = await res.json();
			this.render();
		} catch (err) {
			ToastManager.show('Failed to load network manifest', 'error');
		}
	}

	render() {
		if (!this.#dom.networksContainer) return;
		this.#dom.networksContainer.innerHTML = '';

		const networks = this.#manifestData.networks || {};
		const netEntries = Object.entries(networks);

		if (this.#dom.networksCountLabel) {
			this.#dom.networksCountLabel.textContent = `${netEntries.length} Active`;
		}

		if (!networks[this.#activeNetworkId] && netEntries.length > 0) {
			this.#activeNetworkId = netEntries[0][0];
			localStorage.setItem('active_network', this.#activeNetworkId);
		}

		let totalStationsSum = 0;
		let cS1Nets = 0, cS1Stns = 0;
		let cS2Nets = 0, cS2Stns = 0;
		let cS3Nets = 0, cS3Stns = 0;

		netEntries.forEach(([netId, netInfo]) => {
			const isActive = netId === this.#activeNetworkId;
			const stage = netInfo.pipeline?.stage || 'stage_1_missing';
			const stnEstimate = netInfo.total_stations || 0;
			totalStationsSum += stnEstimate;

			let stageTag = 'Missing';
			let dotClass = 'dot-rose';
			let badgeClass = 'badge-missing';

			if (stage === 'stage_3_structured' || stage.includes('3')) {
				stageTag = 'S3';
				dotClass = 'dot-emerald';
				badgeClass = 'badge-stage';
				cS3Nets++; cS3Stns += stnEstimate;
			} else if (stage === 'stage_2_cleaned' || stage.includes('2')) {
				stageTag = 'S2';
				dotClass = 'dot-amber';
				badgeClass = 'badge-stage';
				cS2Nets++; cS2Stns += stnEstimate;
			} else if (stage === 'stage_1_raw' || stage.includes('raw')) {
				stageTag = 'S1';
				dotClass = 'dot-indigo';
				badgeClass = 'badge-stage';
				cS1Nets++; cS1Stns += stnEstimate;
			}

			const item = document.createElement('div');
			item.className = `network-item ${isActive ? 'active' : ''}`;
			item.setAttribute('data-network', netId);
			item.innerHTML = `
				<div class="network-item-info">
					<span class="network-icon">${escapeHtml(netInfo.icon || '🚇')}</span>
					<div class="network-text">
						<div class="network-name">${escapeHtml(netInfo.name || netId)}</div>
						<div class="network-city">${escapeHtml(netInfo.city || '')}</div>
					</div>
				</div>
				<div class="network-badges">
					<span class="status-indicator-dot ${dotClass}"></span>
					<span class="${badgeClass}">${stageTag}</span>
					<span class="badge-count font-mono">[ ${stnEstimate} ]</span>
				</div>
			`;

			item.addEventListener('click', () => {
				if (this.#activeNetworkId === netId) return;
				this.#activeNetworkId = netId;
				localStorage.setItem('active_network', netId);
				this.render();
				if (this.#onSelectNetwork) this.#onSelectNetwork(netId, netInfo);
			});

			this.#dom.networksContainer.appendChild(item);
		});

		// Fixed Sidebar Label Overwriting Bug:
		if (this.#dom.s3Nets) this.#dom.s3Nets.textContent = `${cS3Nets} Nets`;
		if (this.#dom.s3Stns) this.#dom.s3Stns.textContent = `${cS3Stns} Stns`;
		if (this.#dom.s2Nets) this.#dom.s2Nets.textContent = `${cS2Nets} Nets`;
		if (this.#dom.s2Stns) this.#dom.s2Stns.textContent = `${cS2Stns} Stns`;
		if (this.#dom.s1Nets) this.#dom.s1Nets.textContent = `${cS1Nets} Nets`;
		if (this.#dom.s1Stns) this.#dom.s1Stns.textContent = `${cS1Stns} Stns`;
		if (this.#dom.totalSumEl) this.#dom.totalSumEl.textContent = `${totalStationsSum} Stations`;

		if (networks[this.#activeNetworkId] && this.#onSelectNetwork) {
			this.#onSelectNetwork(this.#activeNetworkId, networks[this.#activeNetworkId]);
		}
	}
}

// ============================================================================
// 3. DATASET VIEW CONTROLLER (GRID & STAGE INSPECTOR)
// ============================================================================
export class DatasetViewController {
	#terminal = null;
	#activeNetwork = null;
	#activeStage = null;
	#dataset = {};
	#datasetAbortController = null;
	#deltaAbortController = null;
	#searchDebounceTimer = null;
	#dom = {};

	constructor(terminalController) {
		this.#terminal = terminalController;
		this.#activeNetwork = localStorage.getItem('active_network') || 'ncrtc_rrts';
		this.#activeStage = localStorage.getItem('active_stage') || 'cleaned';

		this.#dom = getElements({
			netTitle: '#headerNetworkName',
			netSubtitle: '#headerNetworkSub',
			netIcon: '#headerNetworkIcon',
			netLink: '#headerSourceLink',
			stateLabel: '#headerStateLabel',
			pipelineStageBadge: '#headerPipelineStageBadge',
			tabRaw: 'button[data-view-stage="raw"]',
			tabCleaned: 'button[data-view-stage="cleaned"]',
			tabMaster: 'button[data-view-stage="master"]',
			tabRawCount: '#tabRawCount',
			tabCleanedCount: '#tabCleanedCount',
			tabMasterCount: '#tabMasterCount',
			btnFetchRaw: '#btnActionFetchRaw',
			btnFetchMedia: '#btnActionFetchRawMedia',
			btnFetchFare: '#btnActionFetchFare',
			btnClean: '#btnActionClean',
			btnMaster: '#btnActionMaster',
			btnConsole: '#btnOpenConsole',
			metricTotal: '#metricTotalStations',
			metricNew: '#metricNewStations',
			metricPipelineStage: '#metricPipelineStage',
			metricAuditStatus: '#metricAuditStatus',
			statusDot: '#metricAuditStatusDot',
			statusSpinner: '#metricAuditStatusSpinner',
			stagingBadgeCount: '#stagingBadgeCount',
			stagingContainer: '#stagingStationsContainer',
			stagingSection: '.review-section',
			prodBadgeCount: '#prodBadgeCount',
			prodContainer: '#prodStationsContainer',
			prodSectionTitle: '#prodSectionTitle',
			searchInput: '#stationSearchInput',
			clearSearchBtn: '#clearSearchBtn'
		});

		this.#bindEvents();
	}

	#bindEvents() {
		this.#dom.tabRaw?.addEventListener('click', () => this.switchStage('raw'));
		this.#dom.tabCleaned?.addEventListener('click', () => this.switchStage('cleaned'));
		this.#dom.tabMaster?.addEventListener('click', () => this.switchStage('master'));

		this.#dom.btnFetchRaw?.addEventListener('click', () => {
			this.#terminal.startStream(this.#activeNetwork, 'fetch_raw', 'Fast Scraper');
		});
		this.#dom.btnFetchMedia?.addEventListener('click', () => {
			this.#terminal.startStream(this.#activeNetwork, 'fetch_raw_media', 'Scraper + Media');
		});
		
		this.#dom.btnFetchFare?.addEventListener('click', () => {
			this.#terminal.startStream(this.#activeNetwork, 'fetch_fare', 'Fare Scraper');
		});
		
		this.#dom.btnClean?.addEventListener('click', () => {
			this.#terminal.startStream(this.#activeNetwork, 'clean_process', 'Cleaner');
		});

		this.#dom.btnMaster?.addEventListener('click', () => {
			this.#terminal.startStream(this.#activeNetwork, 'generate_master', 'Master Builder');
		});
		this.#dom.btnConsole?.addEventListener('click', () => {
			this.#terminal.openConsole(this.#activeNetwork, 'Execution Logs');
		});
		// Debounced Search (150ms)
		this.#dom.searchInput?.addEventListener('input', (e) => {
			const query = e.target.value;
			if (this.#dom.clearSearchBtn) {
				this.#dom.clearSearchBtn.classList.toggle('hidden', !query);
			}
			clearTimeout(this.#searchDebounceTimer);
			this.#searchDebounceTimer = setTimeout(() => {
				this.renderStationGrid(query.trim().toLowerCase());
			}, 150);
		});

		this.#dom.clearSearchBtn?.addEventListener('click', () => {
			if (this.#dom.searchInput) this.#dom.searchInput.value = '';
			this.#dom.clearSearchBtn.classList.add('hidden');
			this.renderStationGrid();
		});

		window.addEventListener('pipelineCompleted', (e) => {
			if (e.detail?.network === this.#activeNetwork || e.detail?.network === 'all') {
				this.loadActiveDataset();
				this.loadDelta();
			}
		});
	}

	setNetwork(networkId, netInfo) {
		this.#activeNetwork = networkId;
		if (this.#dom.netTitle) this.#dom.netTitle.textContent = netInfo.name || networkId;
		if (this.#dom.netSubtitle) this.#dom.netSubtitle.textContent = netInfo.subtitle || netInfo.city || '';
		if (this.#dom.netIcon) this.#dom.netIcon.textContent = netInfo.icon || '🚇';
		if (this.#dom.netLink) this.#dom.netLink.href = netInfo.source_url || '#';
		if (this.#dom.stateLabel) this.#dom.stateLabel.textContent = netInfo.city || networkId;

		const stage = netInfo.pipeline?.stage || 'stage_1_raw';
		if (this.#dom.metricPipelineStage) this.#dom.metricPipelineStage.textContent = stage.replace(/_/g, ' ').toUpperCase();
		if (this.#dom.pipelineStageBadge) this.#dom.pipelineStageBadge.textContent = stage.replace(/_/g, ' ').toUpperCase();

		// 🚀 Instant synchronous stage count pills sync
		if (netInfo.stage_counts) {
			if (this.#dom.tabRawCount) this.#dom.tabRawCount.textContent = netInfo.stage_counts.raw ?? 0;
			if (this.#dom.tabCleanedCount) this.#dom.tabCleanedCount.textContent = netInfo.stage_counts.cleaned ?? 0;
			if (this.#dom.tabMasterCount) this.#dom.tabMasterCount.textContent = netInfo.stage_counts.master ?? 0;
		}

		this.#updateStageTabStyles();
		this.loadActiveDataset();
		this.loadDelta();
	}

	switchStage(stage) {
		this.#activeStage = stage;
		localStorage.setItem('active_stage', stage);
		this.#updateStageTabStyles();
		this.loadActiveDataset();
	}

	#updateStageTabStyles() {
		[this.#dom.tabRaw, this.#dom.tabCleaned, this.#dom.tabMaster].forEach(tab => tab?.classList.remove('active'));
		if (this.#activeStage === 'raw') this.#dom.tabRaw?.classList.add('active');
		else if (this.#activeStage === 'master') this.#dom.tabMaster?.classList.add('active');
		else this.#dom.tabCleaned?.classList.add('active');
	}

	#showLoadingGrid() {
		if (!this.#dom.prodContainer) return;
		this.#dom.prodContainer.innerHTML = `
			<div class="kpi-card col-span-full text-center py-8 text-muted font-mono text-xs">
				<span class="inline-block animate-spin mr-2">⟳</span> Loading stations dataset...
			</div>
		`;
	}

	async loadActiveDataset() {
		// Cancel in-flight dataset request to prevent race condition
		if (this.#datasetAbortController) {
			this.#datasetAbortController.abort();
		}
		this.#datasetAbortController = new AbortController();
		const signal = this.#datasetAbortController.signal;

		this.#showLoadingGrid();
		if (this.#dom.statusSpinner) this.#dom.statusSpinner.classList.remove('hidden');
		if (this.#dom.statusDot) this.#dom.statusDot.classList.add('hidden');
		if (this.#dom.metricAuditStatus) this.#dom.metricAuditStatus.textContent = 'Checking...';

		const url = `/api/dataset?network=${encodeURIComponent(this.#activeNetwork)}&stage=${encodeURIComponent(this.#activeStage)}`;

		try {
			const res = await fetch(url, { signal });
			if (!res.ok) throw new Error(`Dataset HTTP ${res.status}`);
			this.#dataset = await res.json();
			this.renderStationGrid();

			const count = Object.keys(this.#dataset.stations || this.#dataset).length;
			if (this.#dom.metricTotal) this.#dom.metricTotal.textContent = count;
			this.#updateTabPills(count);

			// 🟢 Stop spinner and show green operational indicator dot
			if (this.#dom.statusSpinner) this.#dom.statusSpinner.classList.add('hidden');
			if (this.#dom.statusDot) {
				this.#dom.statusDot.className = 'status-indicator-dot dot-emerald';
				this.#dom.statusDot.classList.remove('hidden');
			}
			if (this.#dom.metricAuditStatus) this.#dom.metricAuditStatus.textContent = 'Operational';
		} catch (err) {
			if (err.name === 'AbortError') return; // Rapid switch cancellation

			this.#dataset = {};
			this.#renderEmptyGrid(this.#dom.prodContainer, `No ${this.#activeStage.toUpperCase()} data available yet. Click "Fetch Raw" to run pipeline.`);
			if (this.#dom.metricTotal) this.#dom.metricTotal.textContent = '0';
			this.#updateTabPills(0);

			// 🟡 Stop spinner and show amber pending intake dot
			if (this.#dom.statusSpinner) this.#dom.statusSpinner.classList.add('hidden');
			if (this.#dom.statusDot) {
				this.#dom.statusDot.className = 'status-indicator-dot dot-amber';
				this.#dom.statusDot.classList.remove('hidden');
			}
			if (this.#dom.metricAuditStatus) this.#dom.metricAuditStatus.textContent = 'Pending Intake';
		}
	}

	#updateTabPills(activeCount) {
		if (this.#activeStage === 'raw' && this.#dom.tabRawCount) this.#dom.tabRawCount.textContent = activeCount;
		if (this.#activeStage === 'cleaned' && this.#dom.tabCleanedCount) this.#dom.tabCleanedCount.textContent = activeCount;
		if (this.#activeStage === 'master' && this.#dom.tabMasterCount) this.#dom.tabMasterCount.textContent = activeCount;
	}

	async loadDelta() {
		if (this.#deltaAbortController) {
			this.#deltaAbortController.abort();
		}
		this.#deltaAbortController = new AbortController();
		const signal = this.#deltaAbortController.signal;

		try {
			const res = await fetch(`/api/delta?network=${encodeURIComponent(this.#activeNetwork)}`, { signal });
			if (!res.ok) throw new Error(`Delta HTTP ${res.status}`);
			const delta = await res.json();
			const summary = delta.summary || {};

			const newCount = summary.new_stations || 0;
			if (this.#dom.metricNew) this.#dom.metricNew.textContent = newCount;
			if (this.#dom.stagingBadgeCount) this.#dom.stagingBadgeCount.textContent = `${newCount} Pending Review`;

			if (delta.has_delta && newCount > 0) {
				this.#dom.stagingSection?.classList.remove('hidden');
				if (this.#dom.stagingContainer) {
					this.#dom.stagingContainer.innerHTML = `
						<div class="kpi-card card-cyan col-span-full">
							<div class="kpi-title text-cyan">New Staging Detected (+${newCount} Stations)</div>
							<p class="text-xs text-muted mt-1">Cleaned dataset contains stations pending supervised Master ingestion.</p>
						</div>
					`;
				}
			} else {
				if (this.#dom.stagingContainer) {
					this.#dom.stagingContainer.innerHTML = `
						<div class="staging-empty-card">
							<div class="staging-check-circle">
								<svg class="icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
									<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
									<polyline points="22 4 12 14.01 9 11.01"></polyline>
								</svg>
							</div>
							<h4 class="staging-empty-title">All Stations Synchronized</h4>
							<p class="staging-empty-desc">No newly detected stations pending staging review.</p>
						</div>
					`;
				}
			}
		} catch (err) {
			if (err.name === 'AbortError') return;
			if (this.#dom.metricNew) this.#dom.metricNew.textContent = '0';
		}
	}

	renderStationGrid(filterQuery = '') {
		if (!this.#dom.prodContainer) return;
		this.#dom.prodContainer.innerHTML = '';

		const stationsObj = this.#dataset.stations || this.#dataset;
		const entries = Object.entries(stationsObj);

		if (entries.length === 0) {
			this.#renderEmptyGrid(this.#dom.prodContainer, 'No stations found in this dataset.');
			if (this.#dom.prodBadgeCount) this.#dom.prodBadgeCount.textContent = 'Showing 0 Stations';
			return;
		}

				const filtered = entries.filter(([slug, data]) => {
			if (!filterQuery) return true;
			const nameEn = StationSchemaResolver.getName(data, 'en', slug).toLowerCase();
			const nameHi = StationSchemaResolver.getName(data, 'hi').toLowerCase();
			const code = (data.station_code || data.code || '').toLowerCase();
			return nameEn.includes(filterQuery) || nameHi.includes(filterQuery) || code.includes(filterQuery) || slug.toLowerCase().includes(filterQuery);
		});

		if (this.#dom.prodBadgeCount) {
			this.#dom.prodBadgeCount.textContent = `Showing ${filtered.length} Stations`;
		}

		if (filtered.length === 0) {
			this.#renderEmptyGrid(this.#dom.prodContainer, `No stations match "${escapeHtml(filterQuery)}".`);
			return;
		}

		const frag = document.createDocumentFragment();
		filtered.forEach(([slug, data]) => frag.appendChild(this.#createStationCard(slug, data)));
		this.#dom.prodContainer.appendChild(frag);
	}

	#createStationCard(slug, data) {
		const card = document.createElement('div');
		card.className = 'station-card';

		const nameEn = escapeHtml(StationSchemaResolver.getName(data, 'en', slug));
		const nameHi = escapeHtml(StationSchemaResolver.getName(data, 'hi'));
		const code = escapeHtml(data.station_code || data.code || 'STD');
		const safeSlug = escapeHtml(slug);

		const gates = StationSchemaResolver.getGates(data);
		const vt = StationSchemaResolver.getVerticalTransit(data);
		const facs = data.facilities || data.details_raw?.facilities || data.station_facility || [];
		const facsCount = Array.isArray(facs) ? facs.length : Object.keys(facs).length;
		const stateStr = escapeHtml(StationSchemaResolver.getState(data, 'Delhi-NCR'));

		// Dynamic Stage Badge matching exact active view
		let stageBadgeClass = 'badge-stage-cleaned';
		let stageBadgeText = 'STAGE 2: CLEANED';
		if (this.#activeStage === 'raw') {
			stageBadgeClass = 'badge-stage-raw';
			stageBadgeText = 'STAGE 1: RAW';
		} else if (this.#activeStage === 'master') {
			stageBadgeClass = 'badge-stage-master';
			stageBadgeText = 'STAGE 3: MASTER';
		}

		card.innerHTML = `
			<div>
				<div class="station-card-header">
					<div class="station-card-meta">
						<h4 class="station-card-title truncate">${nameEn}</h4>
						<span class="station-card-slug truncate">${safeSlug}</span>
					</div>
					<span class="station-stage-badge ${stageBadgeClass}">${stageBadgeText}</span>
				</div>

				${nameHi ? `<div class="station-card-subtitle truncate">${nameHi}</div>` : ''}

				<div class="station-stats-box">
					<div class="stat-item">
						<div class="stat-item-label">GATES</div>
						<div class="stat-item-val font-mono">${gates.length}</div>
					</div>
					<div class="stat-item">
						<div class="stat-item-label">FACILITIES</div>
						<div class="stat-item-val font-mono">${facsCount}</div>
					</div>
					<div class="stat-item">
						<div class="stat-item-label">CODE</div>
						<div class="stat-code-val font-mono">${code}</div>
					</div>
				</div>
			</div>

			<div class="station-card-footer">
				<span class="station-card-state truncate">${stateStr}</span>
				<span class="station-card-inspect">
					<span>Inspect</span>
					<span>➔</span>
				</span>
			</div>
		`;

		card.addEventListener('click', () => {
			window.location.href = `station_detail.html?network=${encodeURIComponent(this.#activeNetwork)}&station=${encodeURIComponent(slug)}&stage=${encodeURIComponent(this.#activeStage)}`;
		});

		return card;
	}

	#renderEmptyGrid(container, message) {
		if (!container) return;
		container.innerHTML = `<div class="kpi-card col-span-full text-center py-8 text-muted font-mono text-xs">${message}</div>`;
	}

	async previewBridgeData() {
		this.#terminal.openConsole(this.#activeNetwork, 'Preview _auto.json');
		try {
			const res = await fetch(`/api/bridge/preview?network=${encodeURIComponent(this.#activeNetwork)}`);
			const data = await res.json();
			if (!res.ok) {
				this.#terminal.appendLog(`[PREVIEW ERROR] ${data.error || 'Failed to load preview'}`);
				return;
			}
			this.#terminal.appendLog(`=== STAGING _AUTO.JSON PREVIEW: ${this.#activeNetwork} ===\n`);
			this.#terminal.appendLog(JSON.stringify(data, null, 2));
		} catch (err) {
			this.#terminal.appendLog(`[PREVIEW ERROR] ${err.message}`);
		}
	}

}

// ============================================================================
// 4. APPLICATION INITIALIZATION (ADMIN APP)
// ============================================================================
export class AdminApp {
	static async init() {
		if (i18n && typeof i18n.initI18n === 'function') {
			await i18n.initI18n();
		}

		// Header Component mounts top navigation, theme, font slider, language
		HeaderComponent.render('globalHeader', 'admin');

		FooterComponent.render('globalFooter');

		const terminalController = new SSETerminalController();
		const datasetViewController = new DatasetViewController(terminalController);

		const navNavController = new NetworkNavController((netId, netInfo) => {
			datasetViewController.setNetwork(netId, netInfo);
		});
		navNavController.load();

		// Auto reload sidebar upon pipeline run completion
		window.addEventListener('pipelineCompleted', () => {
			navNavController.load();
		});

		this.#bindSyncModal(terminalController);
	}

	static #bindSyncModal(terminalController) {
		const confirmModal = document.getElementById('confirmSyncModal');
		document.getElementById('globalSyncBtn')?.addEventListener('click', () => {
			confirmModal?.classList.remove('hidden');
		});
		document.getElementById('closeSyncModalBtn')?.addEventListener('click', () => {
			confirmModal?.classList.add('hidden');
		});
		document.getElementById('cancelSyncBtn')?.addEventListener('click', () => {
			confirmModal?.classList.add('hidden');
		});
		document.getElementById('executeSyncBtn')?.addEventListener('click', () => {
			confirmModal?.classList.add('hidden');
			terminalController.startStream('all', 'sync_all', 'Full Network Audit Sync');
		});

		// Close on Escape key
		window.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && confirmModal && !confirmModal.classList.contains('hidden')) {
				confirmModal.classList.add('hidden');
			}
		});
	}
}

document.addEventListener('DOMContentLoaded', () => AdminApp.init());