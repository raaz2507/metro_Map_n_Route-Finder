/**
 * @file production_bridge.js
 * @module pages/ProductionBridgeController
 * @description Dedicated Workspace Controller for Stage 4 Production Bridge.
 */
import i18n from '../core/i18n.js';
import { getElements, escapeHtml } from '../core/DomUtils.js';
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { ToastManager } from '../components/Toast.js';
import { JSONTreeInspector } from '../components/JSONTreeInspector.js';

class ProductionBridgeController {
	#dom = {};
	#activeCity = 'delhi_ncr';
	#selectedStation = '__all__';
	#stationsCatalog = [];
	#eventSource = null;
	#masterTree = null;
	#targetTree = null;

	constructor() {
		HeaderComponent.render('globalHeader', 'bridge');
		FooterComponent.render('globalFooter');

		this.#dom = getElements({
			cityList: '#bridgeCityList',
			headerCityName: '#headerCityName',
			headerCityIcon: '#headerCityIcon',
			btnRefresh: '#btnRefreshBridge',
			btnPrepareTemp: '#btnPrepareTemp',
			btnInspectDiff: '#btnInspectDiff',
			btnDeployProduction: '#btnDeployProduction',
			btnPromoteAll: '#btnPromoteAll',
			stationFilterInput: '#stationFilterInput',
			stationSelectDropdown: '#stationSelectDropdown',
			stationFilterCount: '#stationFilterCount',
			btnMergeSingleStation: '#btnMergeSingleStation',
			mergeSingleBtnText: '#mergeSingleBtnText',
			statusTransit: '#statusTransitAuto',
			statusDetails: '#statusDetailsAuto',
			dotTransit: '#dotTransitAuto',
			dotDetails: '#dotDetailsAuto',
			masterViewport: '#masterSourceViewport',
			targetViewport: '#productionTargetViewport',
			masterSourceFile: '#masterSourceFile',
			targetRootPath: '#targetRootPath',
			modal: '#bridgeModal',
			terminalBody: '#bridgeTerminalBody',
			consoleBadge: '#bridgeConsoleBadge',
			closeModalBtn: '#closeBridgeModalBtn',
			modalOkBtn: '#bridgeModalOkBtn'
		});

		// Self-Rendering Dual Inspectors
		this.#masterTree = new JSONTreeInspector('#masterInspector', {
			title: 'Base Production Data',
			subtitle: 'loading...',
			dotColor: 'indigo'
		});

		this.#targetTree = new JSONTreeInspector('#targetInspector', {
			title: 'Staging Delta Candidate (_auto.json)',
			subtitle: 'loading...',
			dotColor: 'emerald'
		});

		this.#bindEvents();
		this.loadCityDiagnostics();
	}

	#bindEvents() {
		// City Switcher Items (Admin Sidebar Card Style)
		this.#dom.cityList?.querySelectorAll('.network-item').forEach(item => {
			item.addEventListener('click', () => {
				const city = item.getAttribute('data-city');
				if (!city || city === this.#activeCity) return;
				this.#activeCity = city;
				this.#selectedStation = '__all__';
				
				this.#dom.cityList.querySelectorAll('.network-item').forEach(i => i.classList.remove('active'));
				item.classList.add('active');

				const isDelhi = city === 'delhi_ncr';
				if (this.#dom.headerCityName) this.#dom.headerCityName.textContent = isDelhi ? 'Delhi NCR (delhi_ncr)' : 'Mumbai (mumbai)';
				if (this.#dom.headerCityIcon) this.#dom.headerCityIcon.textContent = isDelhi ? '🏛️' : '🌊';

				this.loadCityDiagnostics();
			});
		});

		this.#dom.btnRefresh?.addEventListener('click', () => this.loadCityDiagnostics());

		this.#dom.closeModalBtn?.addEventListener('click', () => this.#closeModal());
		this.#dom.modalOkBtn?.addEventListener('click', () => this.#closeModal());

		this.#dom.btnPrepareTemp?.addEventListener('click', () => {
			this.startBridgeProcess('stage_temp', 'Preparing Staging Temp');
		});

		this.#dom.btnDeployProduction?.addEventListener('click', () => {
			this.startBridgeProcess('port_production', 'Porting to Production');
		});

		this.#dom.btnPromoteAll?.addEventListener('click', () => {
			this.startBridgeProcess('promote', 'Promoting All Stations to Base');
		});

		this.#dom.btnInspectDiff?.addEventListener('click', () => {
			this.inspectDualPane();
		});

		// Station Dropdown & Filter Events
		this.#dom.stationSelectDropdown?.addEventListener('change', (e) => {
			this.#selectedStation = e.target.value;
			this.#updateSingleMergeButton();
			this.inspectDualPane();
		});

		this.#dom.stationFilterInput?.addEventListener('input', (e) => {
			this.#renderDropdownOptions(e.target.value);
		});

		this.#dom.btnMergeSingleStation?.addEventListener('click', () => {
			this.#mergeCurrentStation();
		});
	}

	#renderDropdownOptions(filterText = '') {
		if (!this.#dom.stationSelectDropdown) return;
		const query = (filterText || '').trim().toLowerCase();
		const currentSelected = this.#selectedStation;

		this.#dom.stationSelectDropdown.innerHTML = '';

		// Option 1: All Stations
		const allOpt = document.createElement('option');
		allOpt.value = '__all__';
		allOpt.textContent = '📂 All Stations (Full JSON Overview)';
		this.#dom.stationSelectDropdown.appendChild(allOpt);

		let matchedCount = 0;
		for (const item of this.#stationsCatalog) {
			const slug = item.slug;
			if (query && !slug.toLowerCase().includes(query)) {
				continue;
			}
			matchedCount++;
			const opt = document.createElement('option');
			opt.value = slug;
			let statusTag = '';
			if (item.is_new) {
				statusTag = ' 🆕 [NEW]';
			} else if (item.has_details_delta && item.has_transit_delta) {
				statusTag = ' ⚡ [MODIFIED: Details+Transit]';
			} else if (item.has_details_delta) {
				statusTag = ' ⚡ [MODIFIED: Details]';
			} else if (item.has_transit_delta) {
				statusTag = ' ⚡ [MODIFIED: Transit]';
			}
			opt.textContent = `${slug}${statusTag}`;
			this.#dom.stationSelectDropdown.appendChild(opt);
		}

		if (this.#dom.stationFilterCount) {
			this.#dom.stationFilterCount.textContent = `${matchedCount} / ${this.#stationsCatalog.length} delta stations`;
		}

		// Restore selection if still present, otherwise reset to __all__
		const exists = Array.from(this.#dom.stationSelectDropdown.options).some(o => o.value === currentSelected);
		if (exists) {
			this.#dom.stationSelectDropdown.value = currentSelected;
		} else {
			this.#selectedStation = '__all__';
			this.#dom.stationSelectDropdown.value = '__all__';
		}
		this.#updateSingleMergeButton();
	}

	#updateSingleMergeButton() {
		if (!this.#dom.btnMergeSingleStation) return;
		if (this.#selectedStation && this.#selectedStation !== '__all__') {
			this.#dom.btnMergeSingleStation.classList.remove('hidden');
			if (this.#dom.mergeSingleBtnText) {
				this.#dom.mergeSingleBtnText.textContent = `Merge "${this.#selectedStation}" to Base`;
			}
		} else {
			this.#dom.btnMergeSingleStation.classList.add('hidden');
		}
	}

	async #mergeCurrentStation() {
		if (!this.#selectedStation || this.#selectedStation === '__all__') return;
		const stationToMerge = this.#selectedStation;

		try {
			const res = await fetch(`/api/bridge/merge_station?city=${encodeURIComponent(this.#activeCity)}&station=${encodeURIComponent(stationToMerge)}`);
			const data = await res.json();
			if (data.success) {
				ToastManager.success(`Station '${stationToMerge}' successfully merged into Base!`);
				this.#selectedStation = '__all__';
				this.#updateSingleMergeButton();
				this.loadCityDiagnostics();
			} else {
				ToastManager.error(`Merge failed: ${data.error || 'Unknown error'}`);
			}
		} catch (err) {
			ToastManager.error(`Merge request failed: ${err.message}`);
		}
	}

	#closeModal() {
		this.#dom.modal?.classList.add('hidden');
		if (this.#eventSource) {
			this.#eventSource.close();
			this.#eventSource = null;
		}
	}

	async loadCityDiagnostics() {
		try {
			if (this.#dom.targetRootPath) {
				this.#dom.targetRootPath.textContent = `main_project/data/cities/${this.#activeCity}/`;
			}
			const res = await fetch(`/api/bridge/status?city=${encodeURIComponent(this.#activeCity)}`);
			if (!res.ok) throw new Error('Status fetch failed');
			const data = await res.json();

			if (this.#dom.statusTransit) {
				this.#dom.statusTransit.textContent = data.transit_auto_exists ? `Present (${data.transit_stations || 0} stns)` : 'Missing (Pending)';
				this.#dom.statusTransit.className = data.transit_auto_exists ? 'diag-meta-val text-emerald font-mono' : 'diag-meta-val text-rose font-mono';
			}
			if (this.#dom.statusDetails) {
				this.#dom.statusDetails.textContent = data.details_auto_exists ? `Present (${data.details_stations || 0} stns)` : 'Missing (Pending)';
				this.#dom.statusDetails.className = data.details_auto_exists ? 'diag-meta-val text-emerald font-mono' : 'diag-meta-val text-rose font-mono';
			}

			await this.inspectDualPane();
		} catch (err) {
			ToastManager.error(`Diagnostics error: ${err.message}`);
		}
	}

	async inspectDualPane() {
		try {
			const stationParam = this.#selectedStation ? `&station=${encodeURIComponent(this.#selectedStation)}` : '';
			const res = await fetch(`/api/bridge/inspect?city=${encodeURIComponent(this.#activeCity)}${stationParam}`);
			const data = await res.json();

			// Catalog update
			if (Array.isArray(data.stations_catalog)) {
				this.#stationsCatalog = data.stations_catalog;
				// Re-render dropdown keeping filter
				const filterVal = this.#dom.stationFilterInput?.value || '';
				this.#renderDropdownOptions(filterVal);
			}

			if (this.#masterTree) {
				const isSingle = this.#selectedStation && this.#selectedStation !== '__all__';
				this.#masterTree.setTitle(isSingle ? `Base Record: ${this.#selectedStation}` : 'Source: Stage 3 Verified Master Schema');
				this.#masterTree.setSubtitle(data.master_source_file || 'Base file');
				if (data.master_data) {
					this.#masterTree.setJSON(data.master_data);
				} else {
					this.#masterTree.setJSON({ status: "Stage 3 Master file not found. Generate Master in Dashboard first." });
				}
			}

			if (this.#targetTree) {
				const isSingle = this.#selectedStation && this.#selectedStation !== '__all__';
				this.#targetTree.setTitle(isSingle ? `Delta Candidate: ${this.#selectedStation}` : 'Target: Production Client Schema (_auto.json)');
				this.#targetTree.setSubtitle(data.target_source_file || 'Delta file');
				if (data.target_data) {
					this.#targetTree.setJSON(data.target_data);
				} else {
					this.#targetTree.setJSON({ status: "Target client schema preview will appear here once processed." });
				}
			}
		} catch (err) {
			ToastManager.error(`Inspect error: ${err.message}`);
		}
	}

	startBridgeProcess(action, title) {
		this.#dom.modal?.classList.remove('hidden');
		if (this.#dom.terminalBody) {
			this.#dom.terminalBody.innerHTML = `<div class="terminal-log-line">[Starting Stage 4 Engine: ${escapeHtml(title)} for ${escapeHtml(this.#activeCity)}...]</div>`;
		}
		if (this.#dom.consoleBadge) {
			this.#dom.consoleBadge.textContent = 'RUNNING';
			this.#dom.consoleBadge.className = 'terminal-status-badge badge-running';
		}

		if (this.#eventSource) this.#eventSource.close();

		const streamUrl = `/api/pipeline/stream?network=${encodeURIComponent(this.#activeCity)}&action=${encodeURIComponent(action)}`;
		this.#eventSource = new EventSource(streamUrl);

		this.#eventSource.onmessage = (event) => {
			try {
				const payload = JSON.parse(event.data);
				if (payload.type === 'log') {
					this.#appendLog(payload.line);
				} else if (payload.type === 'done') {
					this.#appendLog(`\n[FINISHED] Action completed with exit code: ${payload.exit_code}`);
					if (this.#dom.consoleBadge) {
						this.#dom.consoleBadge.textContent = payload.success ? 'SUCCESS' : 'FAILED';
						this.#dom.consoleBadge.className = `terminal-status-badge ${payload.success ? 'badge-success' : 'badge-error'}`;
					}

					// ⚡ Trigger Toast on Bridge Action Completion
					if (payload.success) {
						ToastManager.success(`${title} completed successfully!`);
					} else {
						ToastManager.error(`${title} failed with exit code ${payload.exit_code}`);
					}

					this.#eventSource.close();
					this.loadCityDiagnostics();
				}
			} catch {
				this.#appendLog(event.data);
			}
		};

		this.#eventSource.onerror = () => {
			this.#appendLog('[ERROR] Stream closed.');
			this.#closeModal();
		};
	}

	#appendLog(text) {
		if (!this.#dom.terminalBody) return;
		const lineDiv = document.createElement('div');
		lineDiv.className = 'terminal-log-line';
		lineDiv.textContent = text;
		this.#dom.terminalBody.appendChild(lineDiv);
		this.#dom.terminalBody.scrollTop = this.#dom.terminalBody.scrollHeight;
	}

	static async init() {
		await i18n.initI18n();
		new ProductionBridgeController();
	}
}

document.addEventListener('DOMContentLoaded', () => ProductionBridgeController.init());