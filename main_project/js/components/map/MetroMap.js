/**
 * 🚇 MetroMap.js - High-Level Map Component Facade & Orchestrator
 * Coordinates MapGeometry, MapRenderer, MapPanZoom, MapLabelEngine,
 * MapHighlighter, and MapLegend into a unified, high-performance API.
 */

import { MapGeometry } from "./MapGeometry.js";
import { MapRenderer } from "./MapRenderer.js";
import { MapPanZoom } from "./MapPanZoom.js";
import { MapLabelEngine } from "./MapLabelEngine.js";
import { MapHighlighter } from "./MapHighlighter.js";
import { MapLegend } from "./MapLegend.js";
import { eventBus } from "../../core/event-bus.js";

export class MetroMap {
	#mapContainer = null;
	#metroData = null;
	#settings = { currentTheme: "light", currentLang: "en" };
	#abortController = null;

	// Sub-system instances
	#geometry = null;
	#renderer = null;
	#panZoom = null;
	#labelEngine = null;
	#highlighter = null;
	#legend = null;

	#svgElement = null;
	#mainGroup = null;
	#stationsCircleGroup = null;
	#tracksLineGroup = null;
	#pins = null;
	#bounds = null;
	#zoomRange = null;
	#centerClass = null;

	onClearRoute = null;
	onStationClick = null;

	constructor({
		centerClass = null,
		mapContainerSelector = null,
		metroData = null,
		onClearRoute = null,
		onStationClick = null,
		lang = "en",
		theme = "light",
	}) {
		this.#centerClass = centerClass;
		this.#mapContainer = document.querySelector(mapContainerSelector);
		this.#metroData = metroData;
		this.onClearRoute = onClearRoute;
		this.onStationClick = onStationClick;
		this.#settings.currentLang = lang;
		this.#settings.currentTheme = theme;
		this.#abortController = new AbortController();

		this.#init();
	}

	get zoomScale() {
		return this.#panZoom ? this.#panZoom.zoomScale : 1;
	}

	set zoomScale(val) {
		if (this.#panZoom) {
			this.#panZoom.zoomScale = val;
			this.#panZoom.updateZoomTransform();
		}
	}

	#init() {
		if (!this.#mapContainer || !this.#metroData?.stationData) {
			console.warn("[MetroMap] Missing map container or stationData for initialization.");
			return;
		}

		const signal = this.#abortController.signal;

		// 1. Pure Geometry calculations & Projection
		this.#bounds = MapGeometry.getBounds(this.#metroData.stationData);
		const { width, height, avgLatRad } = MapGeometry.calculateSVGSize(this.#bounds);
		const viewBoxInfo = MapGeometry.calculateViewBox(this.#bounds);
		this.#zoomRange = MapGeometry.calculateZoomRange(this.#bounds);
		MapGeometry.convertLatLonToXY(this.#metroData.stationData, this.#bounds, avgLatRad);
		const labelGeometryCache = MapGeometry.precalculateLabelGeometry(this.#metroData.stationData);

		// 2. SVG Root & Viewport Layers
		this.#svgElement = MapRenderer.createSVG(viewBoxInfo.viewBox);
		this.#mainGroup = MapRenderer.createGroup("main_layer");
		this.#svgElement.appendChild(this.#mainGroup);
		this.#mapContainer.appendChild(this.#svgElement);

		// 3. Pan, Zoom & Interaction Engine
		this.#panZoom = new MapPanZoom({
			centerClass: this.#centerClass,
			mapContainer: this.#mapContainer,
			svgElement: this.#svgElement,
			mainGroup: this.#mainGroup,
			metroData: this.#metroData,
			zoomRange: this.#zoomRange,
			onStationClick: (payload) => {
				this.highlightStation(payload.stationId, true);
				if (typeof this.onStationClick === "function") {
					this.onStationClick(payload);
				}
			},
			abortSignal: signal,
		});

		// 4. Render Track Lines & Station Circles
		this.#tracksLineGroup = MapRenderer.drawMetroLines({
			mainGroup: this.#mainGroup,
			metroData: this.#metroData,
		});
		this.#stationsCircleGroup = MapRenderer.drawStationCircles({
			mainGroup: this.#mainGroup,
			metroData: this.#metroData,
		});
		this.#pins = MapRenderer.initRoutePins(this.#mainGroup);

		// 5. Render Station Labels
		this.#labelEngine = new MapLabelEngine({
			centerClass: this.#centerClass,
			mainGroup: this.#mainGroup,
			stationData: this.#metroData.stationData,
			labelGeometryCache,
		});
		const labelGroup = this.#labelEngine.drawStationLabels(this.#settings.currentLang);

		// Sync layers with PanZoom delegation
		this.#panZoom.setLayers({
			stationsCircleGroup: this.#stationsCircleGroup,
			labelGroup,
		});

		// 6. Highlighter Engine
		this.#highlighter = new MapHighlighter({
			svgElement: this.#svgElement,
			mainGroup: this.#mainGroup,
			metroData: this.#metroData,
			getSVGSize: () => MapGeometry.calculateSVGSize(this.#bounds),
			panZoom: this.#panZoom,
			pins: this.#pins,
			zoomRange: this.#zoomRange,
			getLabelGroup: () => this.#labelEngine.labelGroup,
		});
		this.#highlighter.setLayers({
			stationsCircleGroup: this.#stationsCircleGroup,
			tracksLineGroup: this.#tracksLineGroup,
		});
		this.#highlighter.loadInitialDisplaySettings();
		this.#highlighter.listenToMapSettings(signal);

		// 7. Legend Drawer & Top-Right Overlay Controls Hub
		this.#legend = new MapLegend({
			centerClass: this.#centerClass,
			mapContainer: this.#mapContainer,
			metroData: this.#metroData,
			onToggleRouteVisibility: () => this.toggleRouteVisibility(),
			onHighlightLine: (lId) => this.highlightLine(lId),
			onHighlightStationType: (stType) => this.highlightStationType(stType),
			onHighlightStatus: (st) => this.highlightStatus(st),
			abortSignal: signal,
		});
		this.#highlighter.setLegend(this.#legend);
		this.#legend.render(this.#settings.currentLang);

		// 8. Global Event Subscriptions
		this.#listenToEvents(signal);
	}

	#listenToEvents(signal) {
		const unsubLang = eventBus.on("metro:data-updated", ({ reason, lang }) => {
			if (reason === "language_switch") {
				this.setLanguage = lang;
			}
		});

		if (signal) {
			signal.addEventListener("abort", () => {
				unsubLang();
			});
		}
	}

	// =========================================================================
	// Public API Methods
	// =========================================================================

	set setLanguage(selectedLang) {
		this.#settings.currentLang = selectedLang;
		if (this.#labelEngine) {
			const labelGroup = this.#labelEngine.drawStationLabels(selectedLang);
			this.#panZoom?.setLayers({
				stationsCircleGroup: this.#stationsCircleGroup,
				labelGroup,
			});
		}
		if (this.#legend) {
			this.#legend.render(selectedLang);
			this.#legend.updateRouteToggleButtonUI(this.#highlighter?.getState());
		}
	}

	set setTheme(selectedTheme) {
		this.#settings.currentTheme = selectedTheme;
	}

	highlightStatus(status) {
		this.#highlighter?.highlightStatus(status);
	}

	updateDisplaySettings(settings = {}) {
		this.#highlighter?.updateDisplaySettings(settings);
	}

	highlightStation(stationId, autoPan = true) {
		this.#highlighter?.highlightStation(stationId, autoPan);
	}

	clearStationHighlight() {
		this.#highlighter?.clearStationHighlight();
	}

	toggleRouteVisibility() {
		this.#highlighter?.toggleRouteVisibility();
	}

	highlightRoute(path, options = {}) {
		this.#highlighter?.highlightRoute(path, options);
	}

	highlightLine(lineId) {
		this.#highlighter?.highlightLine(lineId);
	}

	highlightStationType(stationType) {
		this.#highlighter?.highlightStationType(stationType);
	}

	showRouteOnMap(path) {
		if (path && path.length > 0) {
			this.highlightRoute(path);
		}
		if (this.#mapContainer) {
			this.#mapContainer.scrollIntoView({ behavior: "smooth" });
		}
	}

	setRoutePin(type, stationId, x = null, y = null) {
		this.#highlighter?.setRoutePin(type, stationId, x, y);
	}

	clearRoutePins() {
		this.#highlighter?.clearRoutePins();
	}

	get zoomRange() {
		return this.#zoomRange;
	}

	get is25DMode() {
		return Boolean(this.#panZoom?.is25DMode);
	}

	toggle25DMode(enable = null) {
		this.#panZoom?.toggle25DMode(enable);
	}

	#cachedContainerRect = null;
	#lastRectTimestamp = 0;

	/**
	 * Compute station screen coordinates relative to map container
	 * @param {string} stationId
	 * @param {number|null} [x=null]
	 * @param {number|null} [y=null]
	 * @returns {{ x: number, y: number, clientX: number, clientY: number }|null}
	 */
	getStationScreenPosition(stationId, x = null, y = null) {
		if (x == null || y == null) {
			const station = this.#metroData?.stationData?.[stationId];
			if (station?.xy) {
				x = station.xy.x;
				y = station.xy.y;
			}
		}

		if (x == null || y == null || !this.#svgElement || !this.#mainGroup || !this.#mapContainer) {
			return null;
		}

		const pt = this.#svgElement.createSVGPoint();
		pt.x = x;
		pt.y = y;

		const ctm = this.#mainGroup.getScreenCTM();
		if (!ctm) return null;

		const screenPt = pt.matrixTransform(ctm);
		
		const now = performance.now();
		if (!this.#cachedContainerRect || now - this.#lastRectTimestamp > 200) {
			this.#cachedContainerRect = this.#mapContainer.getBoundingClientRect();
			this.#lastRectTimestamp = now;
		}
		const containerRect = this.#cachedContainerRect;

		return {
			x: screenPt.x - containerRect.left,
			y: screenPt.y - containerRect.top,
			clientX: screenPt.x,
			clientY: screenPt.y,
		};
	}

	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		this.#panZoom?.destroy();
		this.#labelEngine?.destroy();
		if (this.#mapContainer) {
			this.#mapContainer.innerHTML = "";
		}
	}
}
