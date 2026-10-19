/**
 * 💡 MapHighlighter.js - Centralized Visual Filter & Route Highlighting Engine
 * Responsible for GPU-accelerated 1-step dimming (.map-dimmed), route path animations,
 * status filtering, line filtering, station focus with smooth centering, and display modes.
 */

import { eventBus } from "../../core/event-bus.js";

export class MapHighlighter {
	#svgElement = null;
	#mainGroup = null;
	#stationsCircleGroup = null;
	#tracksLineGroup = null;
	#getLabelGroup = null;
	#metroData = null;
	#getSVGSize = null;
	#panZoom = null;
	#pins = null;
	#legend = null;

	// Visual State Machine
	#activeRoutePath = null;
	#isRouteVisible = false;
	#activeStationType = null;
	#activeStatus = null;
	#activeLineId = null;
	#activeStationId = null;

	#stationFocusZoom = 2.8;

	constructor({
		svgElement,
		mainGroup,
		metroData,
		getSVGSize,
		panZoom,
		pins,
		zoomRange,
		getLabelGroup,
	}) {
		this.#svgElement = svgElement;
		this.#mainGroup = mainGroup;
		this.#metroData = metroData;
		this.#getSVGSize = getSVGSize;
		this.#panZoom = panZoom;
		this.#pins = pins;
		this.#getLabelGroup = getLabelGroup;
		if (zoomRange?.stationFocusZoom) {
			this.#stationFocusZoom = zoomRange.stationFocusZoom;
		}
	}

	setStationFocusZoom(val) {
		if (val && !isNaN(val)) this.#stationFocusZoom = val;
	}

	setLayers({ stationsCircleGroup, tracksLineGroup }) {
		this.#stationsCircleGroup = stationsCircleGroup;
		this.#tracksLineGroup = tracksLineGroup;
	}

	setLegend(legend) {
		this.#legend = legend;
	}

	get activeRoutePath() {
		return this.#activeRoutePath;
	}

	get isRouteVisible() {
		return this.#isRouteVisible;
	}

	get activeStationType() {
		return this.#activeStationType;
	}

	get activeStatus() {
		return this.#activeStatus;
	}

	get activeLineId() {
		return this.#activeLineId;
	}

	get activeStationId() {
		return this.#activeStationId;
	}

	getState() {
		return {
			activeRoutePath: this.#activeRoutePath,
			isRouteVisible: this.#isRouteVisible,
			activeStationType: this.#activeStationType,
			activeStatus: this.#activeStatus,
			activeLineId: this.#activeLineId,
			activeStationId: this.#activeStationId,
		};
	}

	/**
	 * ⚡ High-performance visual state engine: Targets parent .map-dimmed and only
	 * active nodes instead of looping over entire DOM (60 FPS)
	 * @param {Object} config
	 */
	applyMapVisualState(config = {}) {
		const svg = this.#svgElement;
		const stationsCircleGroup = this.#stationsCircleGroup;
		const tracksLineGroup = this.#tracksLineGroup;
		const labelGroup = this.#getLabelGroup();

		if (!svg || !stationsCircleGroup || !tracksLineGroup || !labelGroup) return;

		const { path, lineId, stationType, stationId, status } = config;

		// 1. Clear previous active highlights
		svg.querySelectorAll(".highlighted, .highlighted-line, .reverse-flow, .highlighted-text, .target-highlight-circle, .target-highlight-text").forEach((el) => {
			el.classList.remove("highlighted", "highlighted-line", "reverse-flow", "highlighted-text", "target-highlight-circle", "target-highlight-text");
		});

		// 2. Reset logic: If no filter is active, immediately remove .map-dimmed
		if (!path && !lineId && !stationType && !stationId && !status) {
			svg.classList.remove("map-dimmed");
			this.#legend?.updateRouteToggleButtonUI(this.getState());
			this.#legend?.showLegendToggleBtn();
			return;
		}

		// 3. Apply .map-dimmed on root SVG (1-step GPU layer dimming)
		svg.classList.add("map-dimmed");
		this.#legend?.updateRouteToggleButtonUI(this.getState());

		// 🎯 Case A: Single station focus (pulsing & enlarged)
		if (stationId) {
			const circleNode = stationsCircleGroup.querySelector(`[data-station-id="${stationId}"]`);
			const textNode = labelGroup.querySelector(`text[data-station-id="${stationId}"]`);
			if (circleNode) circleNode.classList.add("target-highlight-circle");
			if (textNode) textNode.classList.add("target-highlight-text");
			return;
		}

		// 🚇 Case B: Route path highlight
		if (path && Array.isArray(path)) {
			path.forEach((stId) => {
				const circleNode = stationsCircleGroup.querySelector(`[data-station-id="${stId}"]`);
				const textNode = labelGroup.querySelector(`text[data-station-id="${stId}"]`);
				if (circleNode) circleNode.classList.add("highlighted");
				if (textNode) textNode.classList.add("highlighted-text");
			});

			for (let i = 0; i < path.length - 1; i++) {
				const u = path[i];
				const v = path[i + 1];
				const edgeId1 = `${u}-${v}`;
				const edgeId2 = `${v}-${u}`;
				const edgeNode = tracksLineGroup.querySelector(`line[data-edge-id="${edgeId1}"], line[data-edge-id="${edgeId2}"]`);
				if (edgeNode) {
					edgeNode.classList.add("highlighted-line");
					if (edgeNode.dataset.fromStation !== u) {
						edgeNode.classList.add("reverse-flow");
					}
				}
			}
			return;
		}

		// 🎨 Case C: Line ID highlight
		if (lineId) {
			const lineObj = this.#metroData.lines?.[lineId];
			const lineStations = lineObj?.stations || [];
			lineStations.forEach((stId) => {
				const circleNode = stationsCircleGroup.querySelector(`[data-station-id="${stId}"]`);
				const textNode = labelGroup.querySelector(`text[data-station-id="${stId}"]`);
				if (circleNode) circleNode.classList.add("highlighted");
				if (textNode) textNode.classList.add("highlighted-text");
			});

			tracksLineGroup.querySelectorAll(`line[data-line-id="${lineId}"]`).forEach((l) => {
				l.classList.add("highlighted-line");
			});
			return;
		}

		// 🏷️ Case D: Station Type (interchange, walkway, multimodal, shared_track, normal)
		if (stationType) {
			stationsCircleGroup.querySelectorAll(`[data-station-type="${stationType}"]`).forEach((circleNode) => {
				circleNode.classList.add("highlighted");
				const stId = circleNode.dataset.stationId;
				const textNode = labelGroup.querySelector(`text[data-station-id="${stId}"]`);
				if (textNode) textNode.classList.add("highlighted-text");
			});
			return;
		}

		// 🚦 Case E: Operational status (operational / under_construction / approved)
		if (status) {
			const statusQuery = status === "approved"
				? '[data-status="approved"], [data-status="proposed"]'
				: `[data-status="${status}"]`;

			stationsCircleGroup.querySelectorAll(statusQuery).forEach((circleNode) => {
				circleNode.classList.add("highlighted");
				const stId = circleNode.dataset.stationId;
				const textNode = labelGroup.querySelector(`text[data-station-id="${stId}"]`);
				if (textNode) textNode.classList.add("highlighted-text");
			});

			tracksLineGroup.querySelectorAll(statusQuery).forEach((l) => {
				l.classList.add("highlighted-line");
			});
			return;
		}
	}

	highlightStatus(status) {
		this.#activeStatus = status;
		this.#activeLineId = null;
		this.#activeStationType = null;
		this.#activeStationId = null;
		this.applyMapVisualState({ status });
	}

	highlightLine(lineId) {
		this.#activeLineId = lineId;
		this.#activeStationType = null;
		this.#activeStationId = null;
		this.#activeStatus = null;
		this.applyMapVisualState({ lineId });
	}

	highlightStationType(stationType) {
		this.#activeStationType = stationType;
		this.#activeLineId = null;
		this.#activeStationId = null;
		this.#activeStatus = null;
		this.applyMapVisualState({ stationType });
	}

	highlightStation(stationId, autoPan = true) {
		if (!stationId) {
			this.#activeStationId = null;
			this.applyMapVisualState({});
			return;
		}

		this.#activeStationId = stationId;
		this.#activeStationType = null;
		this.#activeStatus = null;
		this.#activeLineId = null;

		this.applyMapVisualState({ stationId });

		if (autoPan && this.#panZoom) {
			const stationObj = this.#metroData?.stationData?.[stationId];
			if (stationObj?.xy && this.#getSVGSize) {
				const targetX = stationObj.xy.x;
				const targetY = stationObj.xy.y;
				const svgSize = this.#getSVGSize();
				const centerX = svgSize.width / 2;
				const centerY = svgSize.height / 2;
				const targetZoom = this.#stationFocusZoom || 2.8;
				const targetPanX = centerX - targetX * targetZoom;
				const targetPanY = centerY - targetY * targetZoom;

				this.#panZoom.animatePanAndZoom(targetPanX, targetPanY, targetZoom, 450);
			}
		}
	}

	clearStationHighlight() {
		this.#activeStationId = null;
		if (this.#activeRoutePath && this.#isRouteVisible) {
			this.applyMapVisualState({ path: this.#activeRoutePath });
		} else {
			this.applyMapVisualState({});
		}
		this.#legend?.updateRouteToggleButtonUI(this.getState());
	}

	toggleRouteVisibility() {
		// 1. If any legend/station filter is active, clear it first
		if (this.#activeStationType || this.#activeLineId || this.#activeStationId || this.#activeStatus) {
			this.#activeStationType = null;
			this.#activeLineId = null;
			this.#activeStationId = null;
			this.#activeStatus = null;

			if (this.#activeRoutePath && this.#isRouteVisible) {
				this.applyMapVisualState({ path: this.#activeRoutePath });
			} else {
				this.applyMapVisualState({});
			}
			return;
		}

		// 2. Standard route show/hide toggle
		if (this.#isRouteVisible) {
			this.#isRouteVisible = false;
			this.applyMapVisualState({});
		} else if (this.#activeRoutePath) {
			this.#isRouteVisible = true;
			this.applyMapVisualState({ path: this.#activeRoutePath });
		}
	}

	/**
	 * Highlight and focus on route path
	 * @param {Array<string>|null} path
	 * @param {Object} [options={}]
	 */
	highlightRoute(path, options = {}) {
		if (!path || path.length === 0) {
			this.#activeRoutePath = null;
			this.#isRouteVisible = false;
			this.#activeStationType = null;
			this.#activeLineId = null;
			this.#activeStationId = null;
			this.#activeStatus = null;
			this.applyMapVisualState({});
			if (this.#pins) {
				this.#pins.from.style.display = "none";
				this.#pins.to.style.display = "none";
			}
			return;
		}

		this.#activeRoutePath = path;
		this.#isRouteVisible = true;
		this.#activeStationType = null;
		this.#activeLineId = null;
		this.#activeStationId = null;
		this.#activeStatus = null;

		this.applyMapVisualState({ path });

		// Route pins
		if (path.length >= 2 && this.#pins) {
			this.setRoutePin("from", path[0]);
			this.setRoutePin("to", path[path.length - 1]);
		}

		const { autoPan = true, customZoom = null, paddingRatio = 0.65 } = options;
		if (!autoPan || !this.#panZoom || !this.#getSVGSize) return;

		let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
		let validCount = 0;
		path.forEach((stId) => {
			const stObj = this.#metroData?.stationData?.[stId];
			if (stObj?.xy) {
				const { x, y } = stObj.xy;
				if (x < minX) minX = x;
				if (x > maxX) maxX = x;
				if (y < minY) minY = y;
				if (y > maxY) maxY = y;
				validCount++;
			}
		});

		if (validCount > 0) {
			const svgSize = this.#getSVGSize();
			const centerX = svgSize.width / 2;
			const centerY = svgSize.height / 2;
			const routeWidth = maxX - minX || 100;
			const routeHeight = maxY - minY || 100;
			const routeCenterX = (minX + maxX) / 2;
			const routeCenterY = (minY + maxY) / 2;

			let zoom;
			if (typeof customZoom === "number" && customZoom > 0) {
				zoom = customZoom;
			} else {
				const scaleX = (svgSize.width * paddingRatio) / routeWidth;
				const scaleY = (svgSize.height * paddingRatio) / routeHeight;
				const maxRouteCap = this.#stationFocusZoom || 2.8;
				zoom = Math.min(Math.max(Math.min(scaleX, scaleY), 1.0), maxRouteCap);
			}

			this.#panZoom.zoomScale = zoom;
			this.#panZoom.panX = centerX - routeCenterX * zoom;
			this.#panZoom.panY = centerY - routeCenterY * zoom;
			this.#panZoom.updateZoomTransform();
		}
	}

	setRoutePin(type, stationId, x = null, y = null) {
		const pin = type === "from" ? this.#pins?.from : this.#pins?.to;
		if (!pin) return;

		if (x == null || y == null) {
			const st = this.#metroData?.stationData?.[stationId];
			if (st?.xy) {
				x = st.xy.x;
				y = st.xy.y;
			}
		}

		if (x == null || isNaN(x) || y == null || isNaN(y)) {
			pin.style.display = "none";
			return;
		}

		pin.setAttribute("transform", `translate(${x}, ${y})`);
		pin.style.display = "";

		const animEl = pin.querySelector(".pin-drop-anim");
		if (animEl) {
			animEl.style.animation = "none";
			void animEl.getBoundingClientRect();
			animEl.style.animation = "";
		}
	}

	clearRoutePins() {
		if (this.#pins?.from) this.#pins.from.style.display = "none";
		if (this.#pins?.to) this.#pins.to.style.display = "none";
	}

	// =========================================================================
	// Display Settings Engine
	// =========================================================================

	loadInitialDisplaySettings() {
		try {
			const saved = localStorage.getItem("metro_map_settings");
			if (saved) {
				const settings = JSON.parse(saved);
				this.updateDisplaySettings(settings);
			}
		} catch (e) {}
	}

	listenToMapSettings(signal) {
		const unsub = eventBus.on("MAP_SETTINGS_UPDATED", (settings) => {
			this.updateDisplaySettings(settings);
		});

		if (signal) {
			signal.addEventListener("abort", () => unsub());
		}
	}

	updateDisplaySettings(settings = {}) {
		const svgEl = this.#svgElement;
		if (!svgEl) return;

		if (settings.showUnderConstruction === false) {
			svgEl.classList.add("hide-under-construction");
		} else {
			svgEl.classList.remove("hide-under-construction");
		}

		if (settings.showApproved === false) {
			svgEl.classList.add("hide-approved");
		} else {
			svgEl.classList.remove("hide-approved");
		}
	}
}
