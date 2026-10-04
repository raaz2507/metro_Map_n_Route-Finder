/**
 * @file city_explorer.js
 * @module pages/CityExplorerApp
 * @description
 *   Excel-like Spreadsheet Viewer for all India city metro data files.
 *   Reads transit_network.json & station_details.json from each city folder
 *   and renders an interactive, filterable, frozen-header table grounded in
 *   the Universal Transit Schema v3.0 specification.
 *
 *   Architecture: ES2022 Private Class Fields (#) with strict encapsulation.
 *   Zero CDN dependencies. All data served via the Python pipeline server.
 */

import i18n           from '../core/i18n.js';
import { HeaderComponent } from '../components/Header.js';
import { FooterComponent } from '../components/Footer.js';
import { ToastManager }    from '../components/Toast.js';
import { getElements, escapeHtml } from '../core/DomUtils.js';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION RENDERER REGISTRY
// Maps a schema section key → a renderer class factory.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base abstract renderer — enforces interface.
 * @abstract
 */
class BaseSectionRenderer {
	/** @param {object} data - Full parsed JSON data for the selected file */
	constructor(data) {
		if (new.target === BaseSectionRenderer) throw new Error('Abstract class');
		this._data = data;
	}

	/** @returns {{ headers: string[][], rows: Array<(string|Node)[]> }} */
	render() { throw new Error('Not implemented'); }

	/** @param {number} count @returns {string} */
	_plural(count, singular, plural) {
		return `${count} ${count === 1 ? singular : plural}`;
	}

	/** Formats a lat/lon pair as readable string */
	_formatCoords(lat, lon) {
		if (lat == null || lon == null) return '';
		return `${Number(lat).toFixed(6)}, ${Number(lon).toFixed(6)}`;
	}

	/** Convert snake_case or camelCase to Title Case */
	_toLabel(key) {
		return key
			.replace(/_/g, ' ')
			.replace(/([A-Z])/g, ' $1')
			.replace(/\b\w/g, c => c.toUpperCase())
			.trim();
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. STATION DATA RENDERER (transit_network.json → stationData)
// ─────────────────────────────────────────────────────────────────────────────
class StationDataRenderer extends BaseSectionRenderer {
	/** @type {Map<string,string>} lineId → hex color */
	#lineColorMap = new Map();

	constructor(data) {
		super(data);
		this.#buildLineColorMap();
	}

	#buildLineColorMap() {
		const lines = this._data?.lines || {};
		for (const [lineId, lineDef] of Object.entries(lines)) {
			this.#lineColorMap.set(lineId, lineDef.color || '#888');
		}
	}

	/** Render colored line pill HTML */
	#linePill(lineId) {
		const color = this.#lineColorMap.get(lineId) || '#666';
		const label = lineId.split('.').pop().replace(/_/g, ' ');
		return `<span class="cell-line-pill" style="background:${color};" title="${escapeHtml(lineId)}">${escapeHtml(label)}</span>`;
	}

	render() {
		const stationData = this._data?.stationData || {};
		const entries = Object.entries(stationData);

		// ── COLUMN GROUPS (maps to universal_transit_schema stationData fields) ──
		const tier1 = [
			{ label: '#',           colspan: 1, cls: '' },
			{ label: 'Identity',    colspan: 4, cls: 'th-group-identity' },
			{ label: 'Lines',       colspan: 1, cls: 'th-group-lines' },
			{ label: 'Properties',  colspan: 2, cls: 'th-group-properties' },
			{ label: 'Platforms',   colspan: 1, cls: 'th-group-topology' },
			{ label: 'Neighbors',   colspan: 1, cls: 'th-group-topology' },
			{ label: 'Geo Location',colspan: 2, cls: 'th-group-geo' },
			{ label: 'Train Schedule', colspan: 4, cls: 'th-group-schedule' },
		];

		const tier2 = [
			{ label: '#',                cls: 'row-num col-frozen', frozen: true },
			// Identity
			{ label: 'Station ID',       cls: 'th-sub-identity col-frozen', frozen: true },
			{ label: 'Name (EN)',         cls: 'th-sub-identity' },
			{ label: 'Name (HI)',         cls: 'th-sub-identity' },
			{ label: 'Code',              cls: 'th-sub-identity' },
			// Lines
			{ label: 'Lines',             cls: 'th-sub-lines' },
			// Properties
			{ label: 'Layout',            cls: 'th-sub-properties' },
			{ label: 'Status',            cls: 'th-sub-properties' },
			// Platforms
			{ label: 'Platform Count',    cls: 'th-sub-topology' },
			// Neighbors
			{ label: 'Neighbors',         cls: 'th-sub-topology' },
			// Geo
			{ label: 'Lat, Lon',          cls: 'th-sub-geo' },
			{ label: 'Plus Code',         cls: 'th-sub-geo' },
			// Schedule
			{ label: 'First Train',       cls: 'th-sub-schedule' },
			{ label: 'Last Train',        cls: 'th-sub-schedule' },
			{ label: 'Sun First',         cls: 'th-sub-schedule' },
			{ label: 'Sun Last',          cls: 'th-sub-schedule' },
		];

		const rows = entries.map(([stationId, s], idx) => {
			const loc       = s.location?.decimal;
			const schedule  = s.train_schedule || {};
			const props     = s.properties || {};
			const platforms = s.platforms || {};
			const neighbors = s.neighbors || [];

			const statusClass = {
				operational:        'cell-status-operational',
				under_construction: 'cell-status-construction',
				planned:            'cell-status-planned',
			}[props.status] || '';

			const linesPills = (s.lines || []).map(l => this.#linePill(l)).join('');

			const neighborChips = neighbors.slice(0, 4).map(n => {
				const sid   = n.station || '';
				const dist  = n.distance ? `${n.distance}m` : '';
				return `<span class="neighbor-chip" title="${escapeHtml(n.line || '')}">${escapeHtml(sid.replace(/_/g, ' '))} ${dist ? `<span style="color:var(--accent-amber)">${dist}</span>` : ''}</span>`;
			}).join('');
			const moreNeighbors = neighbors.length > 4
				? `<span class="cell-empty">+${neighbors.length - 4} more</span>` : '';

			return [
				{ html: `<span class="font-mono" style="color:var(--text-muted)">${idx + 1}</span>`, cls: 'row-num col-frozen' },
				// Identity
				{ html: `<span class="cell-station-id">${escapeHtml(stationId)}</span>`, cls: 'col-frozen' },
				{ html: `<span class="cell-station-name">${escapeHtml(s.name?.en || '')}</span>` },
				{ html: `<span class="cell-name-hi">${escapeHtml(s.name?.hi || '')}</span>` },
				{ html: s.code ? `<span class="cell-layout-tag">${escapeHtml(s.code)}</span>` : `<span class="cell-empty">—</span>` },
				// Lines
				{ html: linesPills || `<span class="cell-empty">—</span>` },
				// Properties
				{ html: props.layout ? `<span class="cell-layout-tag">${escapeHtml(props.layout)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: props.status ? `<span class="${statusClass}">${escapeHtml(props.status.replace(/_/g, ' '))}</span>` : `<span class="cell-empty">—</span>` },
				// Platforms
				{ html: `<span class="cell-number">${Object.keys(platforms).length}</span>` },
				// Neighbors
				{ html: `<div class="cell-neighbor-list">${neighborChips}${moreNeighbors}</div>` },
				// Geo
				{ html: loc ? `<span class="cell-coords">${this._formatCoords(loc.lat, loc.lon)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: s.location?.plusCode ? `<span class="font-mono" style="color:var(--accent-cyan)">${escapeHtml(s.location.plusCode)}</span>` : `<span class="cell-empty">—</span>` },
				// Schedule
				{ html: schedule.first_train ? `<span class="cell-time">${escapeHtml(schedule.first_train)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: schedule.last_train  ? `<span class="cell-time">${escapeHtml(schedule.last_train)}</span>`  : `<span class="cell-empty">—</span>` },
				{ html: schedule.sunday_first_train ? `<span class="cell-time">${escapeHtml(schedule.sunday_first_train)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: schedule.sunday_last_train  ? `<span class="cell-time">${escapeHtml(schedule.sunday_last_train)}</span>`  : `<span class="cell-empty">—</span>` },
			];
		});

		return { tier1, tier2, rows };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LINES RENDERER (transit_network.json → lines)
// ─────────────────────────────────────────────────────────────────────────────
class LinesRenderer extends BaseSectionRenderer {
	render() {
		const lines = this._data?.lines || {};
		const entries = Object.entries(lines);

		const tier1 = [
			{ label: '#',             colspan: 1, cls: '' },
			{ label: 'Line Identity', colspan: 5, cls: 'th-group-identity' },
			{ label: 'Display',       colspan: 2, cls: 'th-group-lines' },
			{ label: 'Route',         colspan: 3, cls: 'th-group-geo' },
			{ label: 'Fare',          colspan: 1, cls: 'th-group-schedule' },
			{ label: 'Full Name',     colspan: 2, cls: 'th-group-properties' },
		];

		const tier2 = [
			{ label: '#',             cls: 'row-num col-frozen', frozen: true },
			{ label: 'Line ID',       cls: 'th-sub-identity col-frozen', frozen: true },
			{ label: 'Network',       cls: 'th-sub-identity' },
			{ label: 'Label',         cls: 'th-sub-identity' },
			{ label: 'Short Name EN', cls: 'th-sub-identity' },
			{ label: 'Short Name HI', cls: 'th-sub-identity' },
			{ label: 'Color',         cls: 'th-sub-lines' },
			{ label: 'Style',         cls: 'th-sub-lines' },
			{ label: 'From',          cls: 'th-sub-geo' },
			{ label: 'To',            cls: 'th-sub-geo' },
			{ label: 'Stations',      cls: 'th-sub-geo' },
			{ label: 'Fare Policy',   cls: 'th-sub-schedule' },
			{ label: 'Full Name EN',  cls: 'th-sub-properties' },
			{ label: 'Full Name HI',  cls: 'th-sub-properties' },
		];

		const rows = entries.map(([lineId, line], idx) => {
			const styleClass = {
				solid:  'line-style-solid',
				dashed: 'line-style-dashed',
				dotted: 'line-style-dotted',
			}[line.style] || '';

			return [
				{ html: `<span class="font-mono" style="color:var(--text-muted)">${idx + 1}</span>`, cls: 'row-num col-frozen' },
				{ html: `<span class="cell-station-id">${escapeHtml(lineId)}</span>`, cls: 'col-frozen' },
				{ html: `<span class="font-mono" style="color:var(--text-secondary)">${escapeHtml(line.network || '')}</span>` },
				{ html: `<span class="cell-layout-tag">${escapeHtml(line.label || '')}</span>` },
				{ html: `<span class="cell-station-name">${escapeHtml(line.short_name?.en || '')}</span>` },
				{ html: `<span class="cell-name-hi">${escapeHtml(line.short_name?.hi || '')}</span>` },
				// Color swatch
				{ html: `<div class="cell-line-name"><span class="line-color-swatch" style="background:${escapeHtml(line.color || '#666')};"></span><span class="font-mono" style="color:${escapeHtml(line.color || 'var(--text-muted)')}">${escapeHtml(line.color || '—')}</span></div>` },
				{ html: line.style ? `<span class="line-style-tag ${styleClass}">${escapeHtml(line.style)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: `<span class="cell-station-id">${escapeHtml(line.route?.from || '—')}</span>` },
				{ html: `<span class="cell-station-id">${escapeHtml(line.route?.to || '—')}</span>` },
				{ html: `<span class="cell-number">${(line.stations || []).length}</span>` },
				{ html: line.farePolicy ? `<span class="fare-model-badge">${escapeHtml(line.farePolicy)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: `<span style="color:var(--text-secondary);white-space:normal;max-width:20rem;word-break:break-word;">${escapeHtml(line.name?.en || '')}</span>` },
				{ html: `<span class="cell-name-hi" style="white-space:normal;max-width:18rem;">${escapeHtml(line.name?.hi || '')}</span>` },
			];
		});

		return { tier1, tier2, rows };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. FARE RULES RENDERER (transit_network.json → fareRules)
// ─────────────────────────────────────────────────────────────────────────────
class FareRulesRenderer extends BaseSectionRenderer {
	render() {
		const fareRules = this._data?.fareRules || {};
		const policies  = fareRules.policies || {};
		const networks  = fareRules.networks || {};
		const entries   = Object.entries(policies);

		const tier1 = [
			{ label: '#',              colspan: 1, cls: '' },
			{ label: 'Policy',         colspan: 3, cls: 'th-group-identity' },
			{ label: 'Model',          colspan: 3, cls: 'th-group-lines' },
			{ label: 'Tariff Slabs',   colspan: 2, cls: 'th-group-geo' },
			{ label: 'Products',       colspan: 2, cls: 'th-group-schedule' },
			{ label: 'Time Rules',     colspan: 1, cls: 'th-group-properties' },
		];

		const tier2 = [
			{ label: '#',              cls: 'row-num col-frozen', frozen: true },
			{ label: 'Policy ID',      cls: 'th-sub-identity col-frozen', frozen: true },
			{ label: 'Network',        cls: 'th-sub-identity' },
			{ label: 'Effective From', cls: 'th-sub-identity' },
			{ label: 'Fare Model',     cls: 'th-sub-lines' },
			{ label: 'Distance Unit',  cls: 'th-sub-lines' },
			{ label: 'Rounding',       cls: 'th-sub-lines' },
			{ label: 'Weekday Slabs',  cls: 'th-sub-geo' },
			{ label: 'Holiday Slabs',  cls: 'th-sub-geo' },
			{ label: 'Products',       cls: 'th-sub-schedule' },
			{ label: 'Avg Speed',      cls: 'th-sub-schedule' },
			{ label: 'Time Rules',     cls: 'th-sub-properties' },
		];

		const rows = entries.map(([policyId, policy], idx) => {
			const netMeta       = networks[policy.network] || {};
			const weekdaySlabs  = policy.fareTables?.weekday  || policy.fareMatrix ? [] : [];
			const holidaySlabs  = policy.fareTables?.holiday  || [];
			const products      = Object.keys(policy.products || {});
			const timeRules     = Object.keys(policy.timeRules || {});

			const slabSummary = (slabs) => {
				if (!slabs.length) {
					if (policy.fareMatrix) return `<span class="fare-model-badge">Matrix ${policy.stations?.length || '?'}×${policy.stations?.length || '?'}</span>`;
					return `<span class="cell-empty">—</span>`;
				}
				const min = Math.min(...slabs.map(s => s.fare));
				const max = Math.max(...slabs.map(s => s.fare));
				return `<span class="cell-number">₹${min}–₹${max}</span> <span class="cell-empty">${slabs.length} slabs</span>`;
			};

			return [
				{ html: `<span class="font-mono" style="color:var(--text-muted)">${idx + 1}</span>`, cls: 'row-num col-frozen' },
				{ html: `<span class="cell-station-id">${escapeHtml(policyId)}</span>`, cls: 'col-frozen' },
				{ html: `<span class="font-mono" style="color:var(--text-secondary)">${escapeHtml(policy.network || '')}</span>` },
				{ html: `<span class="cell-time">${escapeHtml(policy.effectiveFrom || '—')}</span>` },
				{ html: `<span class="fare-model-badge">${escapeHtml(policy.fareModel || '—')}</span>` },
				{ html: `<span class="cell-layout-tag">${escapeHtml(policy.calculation?.distanceUnit || '—')}</span>` },
				{ html: `<span class="cell-layout-tag">${escapeHtml(policy.calculation?.rounding || '—')}</span>` },
				{ html: slabSummary(policy.fareTables?.weekday || []) },
				{ html: slabSummary(policy.fareTables?.holiday || []) },
				{ html: products.length ? products.map(p => `<span class="cell-layout-tag">${escapeHtml(p)}</span>`).join(' ') : `<span class="cell-empty">—</span>` },
				{ html: netMeta.avgSpeedMetersPerMin ? `<span class="cell-number">${netMeta.avgSpeedMetersPerMin} m/min</span>` : `<span class="cell-empty">—</span>` },
				{ html: timeRules.length ? timeRules.map(r => `<span class="cell-layout-tag">${escapeHtml(r)}</span>`).join(' ') : `<span class="cell-empty">—</span>` },
			];
		});

		return { tier1, tier2, rows };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. TRANSFERS RENDERER (transit_network.json → transfers)
// ─────────────────────────────────────────────────────────────────────────────
class TransfersRenderer extends BaseSectionRenderer {
	render() {
		const transfers = this._data?.transfers || {};
		const rows = [];

		let idx = 0;
		for (const [stationId, lineMap] of Object.entries(transfers)) {
			for (const [fromLine, targetMap] of Object.entries(lineMap)) {
				for (const [transferKey, details] of Object.entries(targetMap)) {
					rows.push([
						{ html: `<span class="font-mono" style="color:var(--text-muted)">${++idx}</span>`, cls: 'row-num col-frozen' },
						{ html: `<span class="cell-station-id">${escapeHtml(stationId)}</span>`, cls: 'col-frozen' },
						{ html: `<span class="cell-layout-tag">${escapeHtml(fromLine)}</span>` },
						{ html: `<span class="cell-layout-tag" style="background:var(--accent-rose-bg);color:var(--accent-rose)">${escapeHtml(transferKey.split(':')[1] || transferKey)}</span>` },
						{ html: `<span class="fare-model-badge">${escapeHtml(details.type || '—')}</span>` },
						{ html: `<span class="cell-layout-tag">${escapeHtml(details.transfer_mode || '—')}</span>` },
						{ html: details.distance_meters != null ? `<span class="cell-number">${details.distance_meters}m</span>` : `<span class="cell-empty">—</span>` },
						{ html: details.levels != null ? `<span class="cell-number">${details.levels} lvl</span>` : `<span class="cell-empty">—</span>` },
						{ html: details.walking_time_min != null ? `<span class="cell-time">${details.walking_time_min} min</span>` : `<span class="cell-empty">—</span>` },
					]);
				}
			}
		}

		const tier1 = [
			{ label: '#',           colspan: 1, cls: '' },
			{ label: 'Transfer',    colspan: 3, cls: 'th-group-identity' },
			{ label: 'Details',     colspan: 3, cls: 'th-group-lines' },
			{ label: 'Metrics',     colspan: 3, cls: 'th-group-geo' },
		];

		const tier2 = [
			{ label: '#',           cls: 'row-num col-frozen', frozen: true },
			{ label: 'Station',     cls: 'th-sub-identity col-frozen', frozen: true },
			{ label: 'From Line',   cls: 'th-sub-identity' },
			{ label: 'To Line',     cls: 'th-sub-identity' },
			{ label: 'Type',        cls: 'th-sub-lines' },
			{ label: 'Mode',        cls: 'th-sub-lines' },
			{ label: 'Fare',        cls: 'th-sub-lines' },
			{ label: 'Distance',    cls: 'th-sub-geo' },
			{ label: 'Levels',      cls: 'th-sub-geo' },
			{ label: 'Walk Time',   cls: 'th-sub-geo' },
		];

		return { tier1, tier2, rows };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. STATION DETAILS RENDERER (station_details.json)
// ─────────────────────────────────────────────────────────────────────────────
class StationDetailsRenderer extends BaseSectionRenderer {
	render() {
		const entries = Object.entries(this._data || {});

		const tier1 = [
			{ label: '#',           colspan: 1, cls: '' },
			{ label: 'Identity',    colspan: 2, cls: 'th-group-identity' },
			{ label: 'Timings',     colspan: 2, cls: 'th-group-schedule' },
			{ label: 'Contact',     colspan: 2, cls: 'th-group-properties' },
			{ label: 'Gates',       colspan: 2, cls: 'th-group-geo' },
			{ label: 'Parking',     colspan: 2, cls: 'th-group-topology' },
			{ label: 'Facilities',  colspan: 1, cls: 'th-group-lines' },
			{ label: 'Lifts',       colspan: 2, cls: 'th-group-geo' },
			{ label: 'Escalators',  colspan: 1, cls: 'th-group-topology' },
		];

		const tier2 = [
			{ label: '#',              cls: 'row-num col-frozen', frozen: true },
			{ label: 'Station ID',     cls: 'th-sub-identity col-frozen', frozen: true },
			{ label: 'Description EN', cls: 'th-sub-identity' },
			{ label: 'Opening',        cls: 'th-sub-schedule' },
			{ label: 'Closing',        cls: 'th-sub-schedule' },
			{ label: 'Mobile',         cls: 'th-sub-properties' },
			{ label: 'Landline',       cls: 'th-sub-properties' },
			{ label: 'Gate Count',     cls: 'th-sub-geo' },
			{ label: 'Divyang Gates',  cls: 'th-sub-geo' },
			{ label: 'Parking Lots',   cls: 'th-sub-topology' },
			{ label: 'Car Capacity',   cls: 'th-sub-topology' },
			{ label: 'Facilities',     cls: 'th-sub-lines' },
			{ label: 'Lifts',          cls: 'th-sub-geo' },
			{ label: 'Escalators',     cls: 'th-sub-geo' },
			{ label: 'Feeder Buses',   cls: 'th-sub-topology' },
		];

		const rows = entries.map(([stationId, s], idx) => {
			// ── Defensive normalization: fields can be array, object, or null ──
			const gates      = (s.gates && typeof s.gates === 'object' && !Array.isArray(s.gates)) ? s.gates : {};
			const contact    = (s.contact && typeof s.contact === 'object')                          ? s.contact : {};
			const timings    = (s.timings && typeof s.timings === 'object')                          ? s.timings : {};
			const facilities = (s.facilities && typeof s.facilities === 'object' && !Array.isArray(s.facilities)) ? s.facilities : {};
			const lifts      = (s.vertical_transit?.lifts && typeof s.vertical_transit.lifts === 'object')         ? s.vertical_transit.lifts      : {};
			const escalators = (s.vertical_transit?.escalators && typeof s.vertical_transit.escalators === 'object')? s.vertical_transit.escalators : {};

			// parkings: schema says array, but some cities store it as an object keyed by lot code
			const rawParkings = s.parkings ?? [];
			const parkings = Array.isArray(rawParkings)
				? rawParkings
				: Object.values(rawParkings);   // normalize object → array of parking lot objects

			// feederBusRouteInfo: may be null or an object instead of array
			const rawFeeders = s.feederBusRouteInfo ?? [];
			const feeders = Array.isArray(rawFeeders)
				? rawFeeders
				: Object.values(rawFeeders);

			const gateCount    = Object.keys(gates).length;
			const divyangGates = Object.values(gates).filter(g => g && g.divyang).length;

			const totalCarCap  = parkings.reduce((sum, p) => sum + ((p && typeof p === 'object' ? (p.capacity_car || 0) : 0)), 0);
			const facilityKeys = Object.keys(facilities);

			return [
				{ html: `<span class="font-mono" style="color:var(--text-muted)">${idx + 1}</span>`, cls: 'row-num col-frozen' },
				{ html: `<span class="cell-station-id">${escapeHtml(stationId)}</span>`, cls: 'col-frozen' },
				{ html: `<span style="color:var(--text-secondary);white-space:normal;max-width:20rem;">${escapeHtml(s.description?.en || '—')}</span>` },
				{ html: timings.opening ? `<span class="cell-time">${escapeHtml(timings.opening)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: timings.closing ? `<span class="cell-time">${escapeHtml(timings.closing)}</span>` : `<span class="cell-empty">—</span>` },
				{ html: contact.mobile   ? `<a href="tel:${escapeHtml(contact.mobile)}"   class="cell-coords">${escapeHtml(contact.mobile)}</a>`   : `<span class="cell-empty">—</span>` },
				{ html: contact.landline ? `<a href="tel:${escapeHtml(contact.landline)}" class="cell-coords">${escapeHtml(contact.landline)}</a>` : `<span class="cell-empty">—</span>` },
				{ html: `<span class="cell-number">${gateCount}</span>` },
				{ html: divyangGates > 0
					? `<span class="cell-status-operational">${divyangGates} ♿</span>`
					: `<span class="cell-empty">—</span>` },
				{ html: `<span class="cell-number">${parkings.length}</span>` },
				{ html: totalCarCap > 0 ? `<span class="cell-number">${totalCarCap}</span>` : `<span class="cell-empty">—</span>` },
				{ html: facilityKeys.length
					? facilityKeys.slice(0, 3).map(k => `<span class="cell-layout-tag">${escapeHtml(k)}</span>`).join(' ')
					  + (facilityKeys.length > 3 ? `<span class="cell-empty"> +${facilityKeys.length - 3}</span>` : '')
					: `<span class="cell-empty">—</span>` },
				{ html: `<span class="cell-number">${Object.keys(lifts).length}</span>` },
				{ html: `<span class="cell-number">${Object.keys(escalators).length}</span>` },
				{ html: `<span class="cell-number">${feeders.length}</span>` },
			];
		});

		return { tier1, tier2, rows };
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDERER FACTORY
// ─────────────────────────────────────────────────────────────────────────────
class RendererFactory {
	/**
	 * @param {string} file    - 'transit_network' | 'station_details'
	 * @param {string} section - 'stationData' | 'lines' | 'fareRules' | 'transfers'
	 * @param {object} data
	 * @returns {BaseSectionRenderer}
	 */
	static create(file, section, data) {
		if (file === 'station_details') {
			return new StationDetailsRenderer(data);
		}
		// transit_network
		switch (section) {
			case 'lines':     return new LinesRenderer(data);
			case 'fareRules': return new FareRulesRenderer(data);
			case 'transfers': return new TransfersRenderer(data);
			default:          return new StationDataRenderer(data);
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CityExplorerApp
 * @classdesc
 *   Main page controller. All DOM state, data caches, and user interaction
 *   are managed as private fields. Zero global state leakage.
 */
export class CityExplorerApp {
	// ── Private State ──
	/** @type {Record<string, HTMLElement>} */
	#dom = {};

	/** @type {string} Currently selected city slug */
	#activeCity = '';

	/** @type {'transit_network'|'station_details'} */
	#activeFile = 'transit_network';

	/** @type {'stationData'|'lines'|'fareRules'|'transfers'} */
	#activeSection = 'stationData';

	/** @type {string} Current search query */
	#searchQuery = '';

	/** @type {object|null} Parsed JSON data for current city+file */
	#rawData = null;

	/** @type {Map<string, object>} In-memory cache: "citySlug:file" → parsed JSON */
	#dataCache = new Map();

	/** @type {{ tier1: object[], tier2: object[], rows: object[][] }|null} */
	#renderedResult = null;

	/** @type {string[]} List of available city slugs */
	#cities = [
		'bhopal', 'chennai', 'delhi_ncr', 'indore',
		'kanpur', 'kochi', 'lucknow', 'mumbai', 'nagpur'
	];

	/** @type {AbortController|null} */
	#abortController = null;

	// City display names
	#cityLabels = {
		bhopal:    '🏙️ Bhopal',
		chennai:   '🏙️ Chennai',
		delhi_ncr: '🏙️ Delhi NCR',
		indore:    '🏙️ Indore',
		kanpur:    '🏙️ Kanpur',
		kochi:     '🏙️ Kochi',
		lucknow:   '🏙️ Lucknow',
		mumbai:    '🏙️ Mumbai',
		nagpur:    '🏙️ Nagpur',
	};

	constructor() {
		this.#dom = getElements({
			citySelect:         '#citySelect',
			fileTabGroup:       '#fileTabGroup',
			searchInput:        '#searchInput',
			sectionSelect:      '#sectionSelect',
			statsBar:           '#statsBar',
			statRows:           '#statRows',
			statCols:           '#statCols',
			statFiltered:       '#statFiltered',
			btnExport:          '#btnExport',
			kpiNetworks:        '#kpiNetworks .kpi-mini-val',
			kpiLines:           '#kpiLines .kpi-mini-val',
			kpiStations:        '#kpiStations .kpi-mini-val',
			kpiInterchanges:    '#kpiInterchanges .kpi-mini-val',
			kpiFareModel:       '#kpiFareModel .kpi-mini-val',
			kpiCurrency:        '#kpiCurrency .kpi-mini-val',
			explorerEmptyState: '#explorerEmptyState',
			explorerLoading:    '#explorerLoading',
			excelTableWrapper:  '#excelTableWrapper',
			excelThead:         '#excelThead',
			excelTbody:         '#excelTbody',
		});
	}

	/** Public init — called after DOM ready */
	async init() {
		await this.#loadCitiesList();
		this.#bindEvents();
	}

	// ── Private: Setup ────────────────────────────────────────────────────────

	/** Load city list dynamically from the API, fallback to static list */
	async #loadCitiesList() {
		try {
			const res = await fetch('/api/city-data/cities');
			if (res.ok) {
				const json = await res.json();
				const apiCities = (json.cities || [])
					.filter(c => c.has_transit_network || c.has_station_details)
					.map(c => c.slug);
				if (apiCities.length > 0) {
					this.#cities = apiCities;
				}
			}
		} catch (_) {
			// Silently fall back to hardcoded list
		}
		this.#populateCitySelect();
	}

	#populateCitySelect() {
		if (!this.#dom.citySelect) return;
		this.#dom.citySelect.innerHTML = `<option value="">— Select City —</option>`;
		this.#cities.forEach(city => {
			const opt = document.createElement('option');
			opt.value = city;
			opt.textContent = this.#cityLabels[city] || city;
			this.#dom.citySelect.appendChild(opt);
		});
	}

	#bindEvents() {
		// City selector
		this.#dom.citySelect?.addEventListener('change', (e) => {
			this.#activeCity = e.target.value;
			if (this.#activeCity) this.#loadAndRender();
		});

		// File tab group
		this.#dom.fileTabGroup?.querySelectorAll('.file-tab').forEach(btn => {
			btn.addEventListener('click', () => {
				this.#dom.fileTabGroup.querySelectorAll('.file-tab').forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				this.#activeFile = btn.dataset.file;
				this.#updateSectionOptions();
				if (this.#activeCity) this.#loadAndRender();
			});
		});

		// Section selector
		this.#dom.sectionSelect?.addEventListener('change', (e) => {
			this.#activeSection = e.target.value;
			if (this.#rawData) this.#applyRenderer();
		});

		// Search
		let searchTimer;
		this.#dom.searchInput?.addEventListener('input', (e) => {
			clearTimeout(searchTimer);
			searchTimer = setTimeout(() => {
				this.#searchQuery = e.target.value.trim().toLowerCase();
				if (this.#renderedResult) this.#applySearch();
			}, 220);
		});

		// Export
		this.#dom.btnExport?.addEventListener('click', () => this.#exportCSV());
	}

	/** When switching file tabs, update section dropdown visibility */
	#updateSectionOptions() {
		if (!this.#dom.sectionSelect) return;
		if (this.#activeFile === 'station_details') {
			this.#dom.sectionSelect.closest('.toolbar-group').style.display = 'none';
		} else {
			this.#dom.sectionSelect.closest('.toolbar-group').style.display = '';
			this.#activeSection = this.#dom.sectionSelect.value || 'stationData';
		}
	}

	// ── Private: Data Loading ─────────────────────────────────────────────────

	async #loadAndRender() {
		if (!this.#activeCity) return;

		const cacheKey = `${this.#activeCity}:${this.#activeFile}`;
		if (this.#dataCache.has(cacheKey)) {
			this.#rawData = this.#dataCache.get(cacheKey);
			this.#updateKPIs();
			this.#applyRenderer();
			return;
		}

		// Abort previous
		if (this.#abortController) this.#abortController.abort();
		this.#abortController = new AbortController();

		this.#showLoading(true);

		try {
			const fileName = `${this.#activeFile}.json`;
			const url = `/api/city-data?city=${encodeURIComponent(this.#activeCity)}&file=${encodeURIComponent(fileName)}`;

			const res = await fetch(url, { signal: this.#abortController.signal });

			if (!res.ok) {
				throw new Error(`HTTP ${res.status}: ${await res.text()}`);
			}

			this.#rawData = await res.json();
			this.#dataCache.set(cacheKey, this.#rawData);
			this.#updateKPIs();
			this.#applyRenderer();

		} catch (err) {
			if (err.name === 'AbortError') return;
			this.#showLoading(false);
			this.#showEmpty(`Failed to load data: ${escapeHtml(err.message)}`);
			ToastManager.error(`Load failed: ${err.message}`);
		}
	}

	// ── Private: KPI Strip ────────────────────────────────────────────────────

	#updateKPIs() {
		if (!this.#rawData) return;
		const d = this.#rawData;

		const networks  = Object.keys(d.fareRules?.networks || {});
		const lines     = Object.keys(d.lines || {});
		const stations  = Object.keys(d.stationData || Object.keys(d).filter(k => typeof d[k] === 'object' && d[k]?.id));
		const interchanges = Object.values(d.stationData || {}).filter(s =>
			(s.lines || []).length > 1 || s.properties?.station_type === 'interchange'
		);

		const fareModels = [...new Set(
			Object.values(d.fareRules?.policies || {}).map(p => p.fareModel).filter(Boolean)
		)];

		if (this.#dom.kpiNetworks)    this.#dom.kpiNetworks.textContent    = networks.length  || '—';
		if (this.#dom.kpiLines)       this.#dom.kpiLines.textContent       = lines.length     || '—';
		if (this.#dom.kpiStations)    this.#dom.kpiStations.textContent    = Object.keys(d.stationData || {}).length || '—';
		if (this.#dom.kpiInterchanges)this.#dom.kpiInterchanges.textContent= interchanges.length || '—';
		if (this.#dom.kpiFareModel)   this.#dom.kpiFareModel.textContent   = fareModels.join(', ') || '—';
		if (this.#dom.kpiCurrency)    this.#dom.kpiCurrency.textContent    = d.fareRules?.currency || '—';
	}

	// ── Private: Rendering ────────────────────────────────────────────────────

	#applyRenderer() {
		if (!this.#rawData) return;

		const renderer = RendererFactory.create(this.#activeFile, this.#activeSection, this.#rawData);
		this.#renderedResult = renderer.render();

		this.#showLoading(false);
		this.#renderTable(this.#renderedResult);
	}

	/**
	 * Renders the two-tier header and all data rows into the Excel table.
	 * @param {{ tier1, tier2, rows }} result
	 */
	#renderTable({ tier1, tier2, rows }) {
		const thead = this.#dom.excelThead;
		const tbody = this.#dom.excelTbody;
		if (!thead || !tbody) return;

		thead.innerHTML = '';
		tbody.innerHTML = '';

		// ── Tier-1 Header (Super Groups) ──
		const tr1 = document.createElement('tr');
		tr1.className = 'header-tier-1';
		tier1.forEach(col => {
			const th = document.createElement('th');
			th.colSpan = col.colspan || 1;
			th.textContent = col.label;
			if (col.cls) th.className = col.cls;
			tr1.appendChild(th);
		});
		thead.appendChild(tr1);

		// ── Tier-2 Header (Column Names) ──
		const tr2 = document.createElement('tr');
		tr2.className = 'header-tier-2';
		tier2.forEach(col => {
			const th = document.createElement('th');
			th.textContent = col.label;
			th.className   = col.cls || '';
			tr2.appendChild(th);
		});
		thead.appendChild(tr2);

		// ── Rows ──
		this.#renderRows(rows);

		// Show table
		this.#dom.excelTableWrapper.style.display = '';
		this.#dom.explorerEmptyState?.classList.add('hidden');

		this.#updateStats(rows.length, tier2.length, rows.length);
	}

	/**
	 * Renders row data into tbody.
	 * @param {Array<Array<{html:string, cls?:string}>>} rows
	 */
	#renderRows(rows) {
		const tbody = this.#dom.excelTbody;
		if (!tbody) return;
		tbody.innerHTML = '';

		if (!rows.length) {
			const tr = document.createElement('tr');
			tr.innerHTML = `<td colspan="20" class="explorer-no-results">No matching rows found.</td>`;
			tbody.appendChild(tr);
			return;
		}

		const frag = document.createDocumentFragment();
		rows.forEach(cells => {
			const tr = document.createElement('tr');
			cells.forEach(cell => {
				const td = document.createElement('td');
				td.innerHTML = cell.html || '';
				if (cell.cls) td.className = cell.cls;
				tr.appendChild(td);
			});
			frag.appendChild(tr);
		});
		tbody.appendChild(frag);
	}

	// ── Private: Search ───────────────────────────────────────────────────────

	#applySearch() {
		if (!this.#renderedResult) return;
		const query = this.#searchQuery;

		if (!query) {
			this.#renderRows(this.#renderedResult.rows);
			this.#updateStats(
				this.#renderedResult.rows.length,
				this.#renderedResult.tier2.length,
				this.#renderedResult.rows.length
			);
			return;
		}

		// Filter rows: check all cell html text for query
		const filtered = this.#renderedResult.rows.filter(cells => {
			return cells.some(cell => {
				// Strip HTML tags for plain text comparison
				const text = (cell.html || '').replace(/<[^>]+>/g, '').toLowerCase();
				return text.includes(query);
			});
		});

		this.#renderRows(filtered);
		this.#updateStats(
			this.#renderedResult.rows.length,
			this.#renderedResult.tier2.length,
			filtered.length
		);

		if (!filtered.length) {
			ToastManager.warning(`No results for "${query}"`);
		}
	}

	// ── Private: Stats Bar ────────────────────────────────────────────────────

	#updateStats(totalRows, cols, filteredRows) {
		if (this.#dom.statsBar)    this.#dom.statsBar.classList.remove('hidden');
		if (this.#dom.statRows)    this.#dom.statRows.textContent    = `${totalRows} rows`;
		if (this.#dom.statCols)    this.#dom.statCols.textContent    = `${cols} cols`;
		if (this.#dom.statFiltered)this.#dom.statFiltered.textContent= filteredRows < totalRows
			? `${filteredRows} shown`
			: `All shown`;
		if (this.#dom.btnExport)   this.#dom.btnExport.classList.remove('hidden');
	}

	// ── Private: CSV Export ───────────────────────────────────────────────────

	#exportCSV() {
		if (!this.#renderedResult) return;
		const { tier2, rows } = this.#renderedResult;

		// Build CSV header
		const headers = tier2.map(col => `"${(col.label || '').replace(/"/g, '""')}"`).join(',');

		// Build CSV rows (strip HTML tags)
		const csvRows = rows.map(cells =>
			cells.map(cell => {
				const text = (cell.html || '')
					.replace(/<[^>]+>/g, '')
					.replace(/&amp;/g, '&')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&quot;/g, '"')
					.replace(/&#039;/g, "'")
					.trim();
				return `"${text.replace(/"/g, '""')}"`;
			}).join(',')
		);

		const csv      = [headers, ...csvRows].join('\n');
		const blob     = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
		const url      = URL.createObjectURL(blob);
		const link     = document.createElement('a');
		const filename = `${this.#activeCity}_${this.#activeFile}_${this.#activeSection}.csv`;

		link.href     = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
		ToastManager.success(`Exported: ${filename}`);
	}

	// ── Private: UI State Helpers ─────────────────────────────────────────────

	#showLoading(visible) {
		const loading = this.#dom.explorerLoading;
		const empty   = this.#dom.explorerEmptyState;
		const table   = this.#dom.excelTableWrapper;
		if (!loading) return;

		if (visible) {
			loading.classList.remove('hidden');
			empty?.classList.add('hidden');
			if (table) table.style.display = 'none';
		} else {
			loading.classList.add('hidden');
		}
	}

	#showEmpty(message = '') {
		const empty = this.#dom.explorerEmptyState;
		const table = this.#dom.excelTableWrapper;
		if (!empty) return;
		empty.classList.remove('hidden');
		if (table) table.style.display = 'none';
		if (message) {
			const p = empty.querySelector('p');
			if (p) p.textContent = message;
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOTSTRAP
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
	if (i18n && typeof i18n.initI18n === 'function') {
		await i18n.initI18n();
	}

	HeaderComponent.render('globalHeader', 'explorer');
	FooterComponent.render('globalFooter');

	// Add "City Explorer" to header nav (dynamic patch)
	const navTabs = document.querySelector('.header-nav-tabs');
	if (navTabs && !navTabs.querySelector('[href="./city_explorer.html"]')) {
		const a = document.createElement('a');
		a.href = './city_explorer.html';
		a.className = 'nav-tab-item active';
		a.innerHTML = `<span class="icon-xs">📊</span><span>City Explorer</span>`;
		// Insert before API Docs link
		const lastTab = navTabs.lastElementChild;
		navTabs.insertBefore(a, lastTab);
		// Remove 'active' from other tabs
		navTabs.querySelectorAll('.nav-tab-item').forEach(t => {
			if (t !== a) t.classList.remove('active');
		});
	}

	const app = new CityExplorerApp();
	await app.init();
});
