/**
 * @file geo_sync.js
 * @module pages/GeoSyncController
 * @description Dedicated controller for Geo-Coordinate Visual Audit and Selective Sync.
 */
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { ToastManager } from '../components/Toast.js';

class GeoSyncController {
	#activeCity = 'kanpur';
	#stationsData = [];
	#selectedSlugs = new Set();

	constructor() {
		HeaderComponent.render('globalHeader', 'geo_sync');
		FooterComponent.render('globalFooter');

		this.initElements();
		this.bindEvents();
		this.loadCities();
	}

	initElements() {
		this.citySelect = document.getElementById('citySelect');
		this.compareModeSelect = document.getElementById('compareModeSelect');
		this.applySourceSelect = document.getElementById('applySourceSelect');
		this.searchInput = document.getElementById('searchInput');
		this.statusFilter = document.getElementById('statusFilter');
		this.tableBody = document.getElementById('geoTableBody');
		this.masterCheckbox = document.getElementById('masterCheckbox');
		this.btnApplySelected = document.getElementById('btnApplySelected');
		this.selectedCountBadge = document.getElementById('selectedCountBadge');

		this.thLeftHeader = document.getElementById('thLeftHeader');
		this.thRightHeader = document.getElementById('thRightHeader');

		this.btnSelectAllIssues = document.getElementById('btnSelectAllIssues');
		this.btnSelectAllVisible = document.getElementById('btnSelectAllVisible');
		this.btnDeselectAll = document.getElementById('btnDeselectAll');

		this.statCritical = document.getElementById('statCritical');
		this.statModerate = document.getElementById('statModerate');
		this.statOffset = document.getElementById('statOffset');
		this.statMatch = document.getElementById('statMatch');
	}

	bindEvents() {
		this.citySelect.addEventListener('change', () => {
			this.#activeCity = this.citySelect.value;
			if (this.#activeCity) {
				this.runAudit(this.#activeCity);
			}
		});

		this.compareModeSelect.addEventListener('change', () => {
			if (this.#activeCity) {
				this.runAudit(this.#activeCity);
			}
		});

		this.searchInput.addEventListener('input', () => this.renderTable());
		this.statusFilter.addEventListener('change', () => this.renderTable());

		this.masterCheckbox.addEventListener('change', (e) => {
			const visibleStations = this.getFilteredStations();
			visibleStations.forEach(st => {
				if (e.target.checked) {
					this.#selectedSlugs.add(st.station_id);
				} else {
					this.#selectedSlugs.delete(st.station_id);
				}
			});
			this.updateSelectionUI();
		});

		this.btnSelectAllIssues.addEventListener('click', () => {
			this.#stationsData.forEach(st => {
				if (st.status !== 'MATCH') {
					this.#selectedSlugs.add(st.station_id);
				}
			});
			this.updateSelectionUI();
		});

		this.btnSelectAllVisible.addEventListener('click', () => {
			const visible = this.getFilteredStations();
			visible.forEach(st => this.#selectedSlugs.add(st.station_id));
			this.updateSelectionUI();
		});

		this.btnDeselectAll.addEventListener('click', () => {
			this.#selectedSlugs.clear();
			this.updateSelectionUI();
		});

		this.btnApplySelected.addEventListener('click', () => this.applySelectedUpdates());
	}

	async loadCities() {
		try {
			const res = await fetch('/api/geo/cities');
			const data = await res.json();
			const cities = data.cities || [];

			this.citySelect.innerHTML = '';
			cities.forEach(c => {
				const opt = document.createElement('option');
				opt.value = c.key;
				opt.textContent = `${c.name} (${c.key})`;
				if (c.key === 'kanpur') opt.selected = true;
				this.citySelect.appendChild(opt);
			});

			this.#activeCity = this.citySelect.value || 'kanpur';
			if (this.#activeCity) {
				this.runAudit(this.#activeCity);
			}
		} catch (err) {
			ToastManager.error(`Failed loading cities: ${err.message}`);
		}
	}

	async runAudit(cityKey) {
		const mode = this.compareModeSelect ? this.compareModeSelect.value : 'base_vs_google';
		this.tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">⏳ Auditing coordinates across sources (${mode})...</td></tr>`;
		this.#selectedSlugs.clear();
		this.updateSelectionUI();

		try {
			const res = await fetch(`/api/geo/audit?city=${encodeURIComponent(cityKey)}&mode=${encodeURIComponent(mode)}`);
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.detail || 'Audit request failed');
			}

			const data = await res.json();
			this.#stationsData = data.stations || [];

			// Update Dynamic Column Headers
			if (data.labels && this.thLeftHeader && this.thRightHeader) {
				this.thLeftHeader.textContent = `${data.labels.left} (Lat, Lon)`;
				this.thRightHeader.textContent = `${data.labels.right} (Lat, Lon)`;
			}

			// Update Scorecard
			const counts = data.counts || {};
			this.statCritical.textContent = counts.critical || 0;
			this.statModerate.textContent = counts.moderate || 0;
			this.statOffset.textContent = counts.offset || 0;
			this.statMatch.textContent = counts.match || 0;

			// Auto-select critical & moderate drifts by default (excluding massive outliers > 3km)
			this.#stationsData.forEach(st => {
				const isOutlier = st.distance_m != null && st.distance_m > 3000;
				if ((st.status === 'CRITICAL' || st.status === 'MODERATE') && !isOutlier) {
					this.#selectedSlugs.add(st.station_id);
				}
			});

			this.renderTable();
			this.updateSelectionUI();
		} catch (err) {
			this.tableBody.innerHTML = `<tr><td colspan="8" class="empty-state" style="color: #ef4444;">❌ ${err.message}</td></tr>`;
			ToastManager.error(err.message);
		}
	}

	getFilteredStations() {
		const q = (this.searchInput.value || '').trim().toLowerCase();
		const filter = this.statusFilter.value;

		return this.#stationsData.filter(st => {
			if (q) {
				const matchName = (st.name || '').toLowerCase().includes(q);
				const matchId = (st.station_id || '').toLowerCase().includes(q);
				if (!matchName && !matchId) return false;
			}

			if (filter === 'ISSUES') {
				return st.status !== 'MATCH';
			} else if (filter !== 'ALL') {
				return st.status === filter;
			}
			return true;
		});
	}

	renderTable() {
		const list = this.getFilteredStations();
		if (!list.length) {
			this.tableBody.innerHTML = `<tr><td colspan="8" class="empty-state">No stations match the selected filter.</td></tr>`;
			return;
		}

		this.tableBody.innerHTML = list.map(st => {
			const isChecked = this.#selectedSlugs.has(st.station_id);
			const rowClass = isChecked ? 'row-selected' : '';

			const lLat = st.left_coords?.lat != null ? st.left_coords.lat.toFixed(5) : 'N/A';
			const lLon = st.left_coords?.lon != null ? st.left_coords.lon.toFixed(5) : 'N/A';
			const rLat = st.right_coords?.lat != null ? st.right_coords.lat.toFixed(5) : 'N/A';
			const rLon = st.right_coords?.lon != null ? st.right_coords.lon.toFixed(5) : 'N/A';

			let distStr = 'N/A';
			if (st.distance_m != null) {
				distStr = st.distance_m >= 1000 
					? `${(st.distance_m / 1000).toFixed(2)} km` 
					: `${st.distance_m} m`;
			}

			const badgeClass = `badge-${(st.status || 'missing').toLowerCase()}`;

			return `
				<tr class="${rowClass}" data-slug="${st.station_id}">
					<td style="text-align: center;">
						<input type="checkbox" class="stn-chk" value="${st.station_id}" ${isChecked ? 'checked' : ''}>
					</td>
					<td><strong>${this.escapeHtml(st.name)}</strong></td>
					<td><code class="geo-coord-mono">${this.escapeHtml(st.station_id)}</code></td>
					<td class="geo-coord-mono">${lLat}, ${lLon}</td>
					<td class="geo-coord-mono" style="color: #10b981;"><strong>${rLat}, ${rLon}</strong></td>
					<td class="geo-coord-mono font-bold">${distStr}</td>
					<td><span class="badge-status ${badgeClass}">${st.status}</span></td>
					<td>
						${st.url ? `<a href="${st.url}" target="_blank" rel="noopener" class="map-link-btn">📍 View</a>` : '—'}
					</td>
				</tr>
			`;
		}).join('');

		// Bind row checkbox events
		this.tableBody.querySelectorAll('.stn-chk').forEach(chk => {
			chk.addEventListener('change', (e) => {
				const slug = e.target.value;
				if (e.target.checked) {
					this.#selectedSlugs.add(slug);
				} else {
					this.#selectedSlugs.delete(slug);
				}
				this.updateSelectionUI();
			});
		});
	}

	updateSelectionUI() {
		const count = this.#selectedSlugs.size;
		this.selectedCountBadge.textContent = count;
		this.btnApplySelected.disabled = count === 0;

		// Update rows highlight
		this.tableBody.querySelectorAll('tr[data-slug]').forEach(row => {
			const slug = row.getAttribute('data-slug');
			const chk = row.querySelector('.stn-chk');
			const isSel = this.#selectedSlugs.has(slug);
			if (chk) chk.checked = isSel;
			if (isSel) row.classList.add('row-selected');
			else row.classList.remove('row-selected');
		});

		// Update master checkbox state
		const visible = this.getFilteredStations();
		if (visible.length && visible.every(s => this.#selectedSlugs.has(s.station_id))) {
			this.masterCheckbox.checked = true;
			this.masterCheckbox.indeterminate = false;
		} else if (visible.some(s => this.#selectedSlugs.has(s.station_id))) {
			this.masterCheckbox.checked = false;
			this.masterCheckbox.indeterminate = true;
		} else {
			this.masterCheckbox.checked = false;
			this.masterCheckbox.indeterminate = false;
		}
	}

	async applySelectedUpdates() {
		const count = this.#selectedSlugs.size;
		const sourceTarget = this.applySourceSelect ? this.applySourceSelect.value : 'google';
		const sourceLabel = sourceTarget === 'google' ? 'Google Maps Verified' : 'Agency Master';
		const ok = confirm(`Are you sure you want to push ${sourceLabel} coordinates for ${count} selected stations into [${this.#activeCity}] Base?`);
		if (!ok) return;

		this.btnApplySelected.disabled = true;
		this.btnApplySelected.innerHTML = `<span>⏳ Applying ${count} Updates...</span>`;

		try {
			const res = await fetch('/api/geo/apply', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					city: this.#activeCity,
					selected_stations: Array.from(this.#selectedSlugs),
					source_target: sourceTarget
				})
			});

			const data = await res.json();
			if (!res.ok) {
				throw new Error(data.detail || 'Apply failed');
			}

			ToastManager.success(`Successfully updated ${data.updated_stations_count} stations in main_project!`);
			
			// Re-run audit to reflect 0-meter accuracy
			await this.runAudit(this.#activeCity);
		} catch (err) {
			ToastManager.error(`Error: ${err.message}`);
		} finally {
			this.btnApplySelected.innerHTML = `<span>🚀 Apply Selected to Production (<span id="selectedCountBadge">0</span>)</span>`;
			this.initElements();
			this.updateSelectionUI();
		}
	}

	escapeHtml(str) {
		return (str || '').replace(/[&<>"']/g, m => ({
			'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
		}[m]));
	}
}

// Auto instantiate on load
document.addEventListener('DOMContentLoaded', () => {
	new GeoSyncController();
});
