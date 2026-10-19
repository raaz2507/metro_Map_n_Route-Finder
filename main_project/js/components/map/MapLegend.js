/**
 * 🗺️ MapLegend.js - Interactive Metro Map Legend Drawer & Overlay Controls Engine
 * Responsible for creating floating controls (Clear Route / Filter & Legend Toggle buttons),
 * the sliding drawer panel, metro line color keys, station glyph keys, and track status keys.
 */

import { createDOMFromMap } from "../dom-builder.js";

export class MapLegend {
	#centerClass = null;
	#mapContainer = null;
	#metroData = null;
	#onToggleRouteVisibility = null;
	#onHighlightLine = null;
	#onHighlightStationType = null;
	#onHighlightStatus = null;
	#abortSignal = null;

	#elements = {
		topRightControls: null,
		clearRouteBtn: null,
		legendToggleBtn: null,
		legendCloseBtn: null,
		legendPanel: null,
		track_line_legend: null,
		station_type_legend: null,
		status_legend: null,
	};

	constructor({
		centerClass = null,
		mapContainer,
		metroData,
		onToggleRouteVisibility,
		onHighlightLine,
		onHighlightStationType,
		onHighlightStatus,
		abortSignal,
	}) {
		this.#centerClass = centerClass;
		this.#mapContainer = mapContainer;
		this.#metroData = metroData;
		this.#onToggleRouteVisibility = onToggleRouteVisibility;
		this.#onHighlightLine = onHighlightLine;
		this.#onHighlightStationType = onHighlightStationType;
		this.#onHighlightStatus = onHighlightStatus;
		this.#abortSignal = abortSignal;
	}

	get elements() {
		return this.#elements;
	}

	openLegend() {
		if (!this.#elements.legendPanel) return;
		if (this.#elements.legendToggleBtn) this.#elements.legendToggleBtn.style.display = "none";
		this.#elements.legendPanel.classList.add("active");
		document.body.setAttribute("data-legend-open", "true");
	}

	closeLegend() {
		if (!this.#elements.legendPanel) return;
		this.#elements.legendPanel.classList.remove("active");
		if (this.#elements.legendToggleBtn) this.#elements.legendToggleBtn.style.display = "";
		document.body.removeAttribute("data-legend-open");
	}

	showLegendToggleBtn() {
		if (this.#elements.legendToggleBtn) {
			this.#elements.legendToggleBtn.style.display = "";
		}
	}

	/**
	 * Build or refresh legend panel and overlay controls
	 * @param {string} [lang="en"]
	 */
	render(lang = "en") {
		const signal = this.#abortSignal;

		// 1. Build DOM structure if not yet created
		if (!this.#elements.track_line_legend) {
			const legendPanelElemtMap = {
				topRightControls: {
					type: "div",
					id: "mapTopRightControls",
					cls: "map-top-right-controls",
				},
				legendToggleBtn: {
					type: "button",
					id: "legendToggleBtn",
					cls: "metro-btn-overlay",
					html_con: `<span data-i18n="pages.home.map.legend">${this.#centerClass?.t("pages.home.map.legend") || "Legend"}</span>`,
					parent: "topRightControls",
				},
				clearRouteBtn: {
					type: "button",
					id: "clearRouteHighlightBtn",
					cls: "clear-route-highlight-btn hidden",
					html_con: `<span class="icon" aria-hidden="true">✕</span><span data-i18n="pages.home.map.clearRoute">${this.#centerClass?.t("pages.home.map.clearRoute") || "Clear Route"}</span>`,
					parent: "topRightControls",
				},
				legendCloseBtn: {
					type: "button",
					id: "legendCloseBtn",
					cls: "legend-close-btn",
					html_con: "×",
					parent: "legendPanel",
				},
				legendPanel: {
					type: "div",
					cls: "legend-panel",
				},
				mainHeader: {
					type: "h2",
					html_con: `<span data-i18n="pages.home.map.legend">${this.#centerClass?.t("pages.home.map.legend") || "Legend"}</span>`,
					parent: "legendPanel",
				},
				trackSection: {
					type: "div",
					cls: "legend-section",
					parent: "legendPanel",
				},
				trackHeader: {
					type: "h3",
					html_con: `<span data-i18n="pages.home.map.metroTrackLines">Metro Track Lines</span>`,
					parent: "trackSection",
				},
				track_line_legend: {
					type: "ul",
					id: "track_line_legend",
					parent: "trackSection",
				},
				stationSection: {
					type: "div",
					cls: "legend-section",
					parent: "legendPanel",
				},
				stationHeader: {
					type: "h3",
					html_con: `<span data-i18n="pages.home.map.stationType">Station Type</span>`,
					parent: "stationSection",
				},
				station_type_legend: {
					type: "ul",
					id: "station_type_legend",
					parent: "stationSection",
				},
				statusSection: {
					type: "div",
					cls: "legend-section",
					parent: "legendPanel",
				},
				statusHeader: {
					type: "h3",
					html_con: `<span data-i18n="pages.home.map.trackStatus">Track & Station Status</span>`,
					parent: "statusSection",
				},
				status_legend: {
					type: "ul",
					id: "status_legend",
					parent: "statusSection",
				},
			};

			const legendPanelElemts = createDOMFromMap(legendPanelElemtMap, this.#mapContainer);
			this.#elements.topRightControls = legendPanelElemts.topRightControls;
			this.#elements.legendToggleBtn = legendPanelElemts.legendToggleBtn;
			this.#elements.track_line_legend = legendPanelElemts.track_line_legend;
			this.#elements.station_type_legend = legendPanelElemts.station_type_legend;
			this.#elements.status_legend = legendPanelElemts.status_legend;
			this.#elements.legendPanel = legendPanelElemts.legendPanel;
			this.#elements.clearRouteBtn = legendPanelElemts.clearRouteBtn;
			this.#elements.legendCloseBtn = legendPanelElemts.legendCloseBtn;

			// Clear route button listener
			if (legendPanelElemts.clearRouteBtn && signal) {
				legendPanelElemts.clearRouteBtn.addEventListener(
					"click",
					() => {
						if (typeof this.#onToggleRouteVisibility === "function") {
							this.#onToggleRouteVisibility();
						}
					},
					{ signal },
				);
			}

			// Legend toggle listener
			legendPanelElemts.legendToggleBtn.addEventListener("click", () => {
				this.openLegend();
			}, { signal });

			// Close button listener
			legendPanelElemts.legendCloseBtn.addEventListener("click", (e) => {
				e.stopPropagation();
				this.closeLegend();
			}, { signal });

			// Backdrop click on panel container
			legendPanelElemts.legendPanel.addEventListener("click", () => {
				this.closeLegend();
			}, { signal });
		}

		const { track_line_legend, station_type_legend, status_legend } = this.#elements;
		if (!track_line_legend) return;

		// Clear previous lists
		track_line_legend.innerHTML = "";
		station_type_legend.innerHTML = "";

		// 1. Render Metro Lines
		const linesData = this.#metroData.lines || {};
		Object.entries(linesData).forEach(([lineKey, lineInfo]) => {
			const li = document.createElement("li");
			li.className = "legend_item";
			li.style.cursor = "pointer";
			li.dataset.lineId = lineKey;

			const circle = document.createElement("span");
			circle.className = "legend-line-circle";
			circle.style.backgroundColor = lineInfo.color;
			circle.textContent = lineInfo.label || "";
			circle.style.color = lineInfo.color_name === "yellow" ? "#000000" : "#ffffff";

			const text = document.createElement("span");
			text.textContent = this.#centerClass?.getLineName(lineKey) || lineKey;

			li.appendChild(circle);
			li.appendChild(text);

			li.addEventListener("click", (e) => {
				e.stopPropagation();
				if (typeof this.#onHighlightLine === "function") {
					this.#onHighlightLine(lineKey);
				}
				this.closeLegend();
			});

			track_line_legend.appendChild(li);
		});

		// 2. Special Station Types
		const registeredStationTypes = ["normal", "interchange", "walkway", "multimodal", "shared_track"];

		registeredStationTypes.forEach((type) => {
			const li = document.createElement("li");
			li.className = "legend_item";
			li.style.cursor = "pointer";
			li.dataset.stationType = type;

			const icon = document.createElement("span");
			if (type === "walkway") {
				icon.className = "legend-icon-walkway";
			} else if (type === "multimodal") {
				icon.className = "legend-icon-multimodal";
			} else if (type === "shared_track") {
				icon.className = "legend-icon-shared-track";
			} else if (type === "interchange") {
				icon.className = "legend-icon-circle";
			} else {
				icon.className = "legend-icon-normal";
			}

			const text = document.createElement("span");
			text.textContent = this.#centerClass?.t(`map.legend.stationTypes.${type}`) || type;

			li.appendChild(icon);
			li.appendChild(text);

			li.addEventListener("click", (e) => {
				e.stopPropagation();
				if (typeof this.#onHighlightStationType === "function") {
					this.#onHighlightStationType(type);
				}
				this.closeLegend();
			});

			station_type_legend.appendChild(li);
		});

		// 3. Track & Station Status
		if (status_legend) {
			status_legend.innerHTML = "";

			const statusList = [
				{ status: "operational", iconClass: "legend-status-solid" },
				{ status: "under_construction", iconClass: "legend-status-dashed" },
				{ status: "approved", iconClass: "legend-status-dotted" },
			];

			statusList.forEach((item) => {
				const li = document.createElement("li");
				li.className = "legend_item";
				li.style.cursor = "pointer";
				li.dataset.status = item.status;

				const bar = document.createElement("span");
				bar.className = item.iconClass;

				const text = document.createElement("span");
				text.textContent = this.#centerClass?.t(`map.legend.trackStatus.${item.status}`) || item.status;

				li.appendChild(bar);
				li.appendChild(text);

				li.addEventListener("click", (e) => {
					e.stopPropagation();
					if (typeof this.#onHighlightStatus === "function") {
						this.#onHighlightStatus(item.status);
					}
					this.closeLegend();
				});

				status_legend.appendChild(li);
			});
		}
	}

	/**
	 * Sync clear/show route button UI with active visual state
	 * @param {Object} state
	 */
	updateRouteToggleButtonUI(state = {}) {
		const btn = this.#elements.clearRouteBtn;
		if (!btn) return;

		const { activeStationType, activeLineId, activeStationId, activeStatus, activeRoutePath, isRouteVisible } = state;

		// 1. Legend/Station filter active: Clear Filter mode
		if (activeStationType || activeLineId || activeStationId || activeStatus) {
			btn.classList.remove("hidden");
			btn.classList.remove("show-mode");
			const label = this.#centerClass?.t("map.actions.clearFilter") || "Clear Filter";
			btn.innerHTML = `<span class="icon" aria-hidden="true">✕</span><span>${label}</span>`;
			return;
		}

		// 2. No route active: hide button
		if (!activeRoutePath) {
			btn.classList.add("hidden");
			return;
		}

		// 3. Route active: Show/Clear Route states
		btn.classList.remove("hidden");
		if (isRouteVisible) {
			btn.classList.remove("show-mode");
			const label = this.#centerClass?.t("map.actions.clearRoute") || "Clear Route";
			btn.innerHTML = `<span class="icon" aria-hidden="true">✕</span><span>${label}</span>`;
		} else {
			btn.classList.add("show-mode");
			const label = this.#centerClass?.t("map.actions.showRoute") || "Show Route";
			btn.innerHTML = `<span class="icon" aria-hidden="true">👁️</span><span>${label}</span>`;
		}
	}
}
