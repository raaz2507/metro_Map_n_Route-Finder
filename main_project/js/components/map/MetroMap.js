/**
 * 🚇 MetroMap.js - Unified Metro Map Component Facade
 * Delegates rendering directly to high-performance CanvasRenderer,
 * while managing MapLegend, CenterClass, and UI Zoom Controls.
 */

import { MapGeometry } from "./core/MapGeometry.js";
import { CanvasRenderer } from "./canvas/CanvasRenderer.js";
import { MapLegend } from "./ui/MapLegend.js";
import { eventBus } from "../../core/event-bus.js";
import { APP_CONFIG } from "../../config/app-config.js";

export class MetroMap {
	#mapContainer = null;
	#metroData = null;
	#settings = { currentTheme: "light", currentLang: "en" };
	#abortController = null;
	#centerClass = null;

	// Sub-system instances
	#canvasEngine = null;
	#legend = null;
	#bounds = null;
	#zoomRange = null;

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
		return this.#canvasEngine ? this.#canvasEngine.zoom : 1;
	}

	set zoomScale(val) {
		if (this.#canvasEngine) {
			this.#canvasEngine.setZoom(val);
		}
	}

	get is25D() {
		return Boolean(this.#canvasEngine?.is25D);
	}

	get is25DMode() {
		return Boolean(this.#canvasEngine?.is25D);
	}

	#init() {
		if (!this.#mapContainer || !this.#metroData?.stationData) {
			console.warn("[MetroMap] Missing map container or stationData for initialization.");
			return;
		}

		const signal = this.#abortController.signal;

		// 1. Pure Geometry calculations & Projection
		this.#bounds = MapGeometry.getBounds(this.#metroData.stationData);
		const { avgLatRad } = MapGeometry.calculateSVGSize(this.#bounds);
		MapGeometry.convertLatLonToXY(this.#metroData.stationData, this.#bounds, avgLatRad);
		this.#zoomRange = MapGeometry.calculateZoomRange(this.#bounds);

		// 2. Hardware-Accelerated Native Canvas Engine
		const savedViewMode = localStorage.getItem("metro_map_view_mode") || "2d";
		const isInitial25D = savedViewMode === "2.5d";

		this.#canvasEngine = new CanvasRenderer({
			container: this.#mapContainer,
			metroData: this.#metroData,
			centerClass: this.#centerClass,
			is25D: isInitial25D,
			lang: this.#settings.currentLang,
			theme: this.#settings.currentTheme,
		});

		this.#canvasEngine.onStationClick = (st) => {
			if (st?.id) {
				if (typeof this.onStationClick === "function") {
					this.onStationClick({
						stationId: st.id,
						x: st.xy?.x ?? 0,
						y: st.xy?.y ?? 0
					});
				}
			}
		};

		// 3. Floating Zoom Controls Hub
		this.#initZoomControls();

		// 3B. Top-Right 2D / 2.5D Animated Slider View Mode Widget & Controls Panel
		this.#initViewModeWidget();

		// 4. Legend Drawer & Top-Right Overlay Controls Hub
		this.#legend = new MapLegend({
			centerClass: this.#centerClass,
			mapContainer: this.#mapContainer,
			metroData: this.#metroData,
			onToggleRouteVisibility: () => this.toggleRouteVisibility(),
			onHighlightLine: (lId) => this.highlightLine(lId),
			onHighlightStationType: (stType) => this.highlightStationType(stType),
			onHighlightStatus: (st) => this.highlightStatus(st),
			onHighlightLayout: (layout) => this.highlightLayout(layout),
			abortSignal: signal,
		});
		this.#legend.render(this.#settings.currentLang);

		// 5. Global Event Subscriptions
		this.#listenToEvents(signal);
	}

	#initZoomControls() {
		if (!this.#mapContainer) return;

		let zoomControls = this.#mapContainer.querySelector("#zoomControls");
		if (!zoomControls) {
			zoomControls = document.createElement("div");
			zoomControls.id = "zoomControls";
			zoomControls.innerHTML = `
				<output id="zoomLevel">100%</output>
				<button type="button" id="btnZoomIn" title="Zoom In" aria-label="Zoom In">+</button>
				<button type="button" id="btnZoomOut" title="Zoom Out" aria-label="Zoom Out">−</button>
				<button type="button" id="btnResetZoom" title="Reset View" aria-label="Reset View">=</button>
			`;
			this.#mapContainer.appendChild(zoomControls);
		}

		const zoomLevel = zoomControls.querySelector("#zoomLevel");
		const btnZoomIn = zoomControls.querySelector("#btnZoomIn");
		const btnZoomOut = zoomControls.querySelector("#btnZoomOut");
		const btnResetZoom = zoomControls.querySelector("#btnResetZoom");

		const updateZoomUI = (zoom) => {
			if (zoomLevel) zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
		};

		this.#canvasEngine.onTransformChange = (data) => {
			if (data?.zoom != null) updateZoomUI(data.zoom);
			eventBus.emit("MAP_TRANSFORM_CHANGED", data);
		};

		if (btnZoomIn) {
			btnZoomIn.onclick = () => {
				this.#canvasEngine.setZoom(this.#canvasEngine.zoom * 1.3);
				updateZoomUI(this.#canvasEngine.zoom);
			};
		}

		if (btnZoomOut) {
			btnZoomOut.onclick = () => {
				this.#canvasEngine.setZoom(this.#canvasEngine.zoom / 1.3);
				updateZoomUI(this.#canvasEngine.zoom);
			};
		}

		if (btnResetZoom) {
			btnResetZoom.onclick = () => {
				this.#canvasEngine.fitToScreen(this.#canvasEngine.is25D ? 1.5 : 1.0);
				updateZoomUI(this.#canvasEngine.zoom);
			};
		}
	}

	/**
	 * Top-Right Dedicated 2D / 2.5D Animated Slider Widget & Floating Controls Panel
	 */
	#initViewModeWidget() {
		if (!this.#mapContainer) return;

		let viewModeWidget = this.#mapContainer.querySelector("#viewModeWidget");
		if (!viewModeWidget) {
			viewModeWidget = document.createElement("div");
			viewModeWidget.id = "viewModeWidget";
			viewModeWidget.className = "view-mode-widget";
			viewModeWidget.setAttribute("role", "region");
			viewModeWidget.setAttribute("aria-label", "Map Perspective Switcher");
			viewModeWidget.innerHTML = `
				<div class="view-slider-track" id="viewSliderTrack" role="radiogroup" aria-label="View Perspective">
					<div class="view-slider-thumb" id="viewSliderThumb"></div>
					<button type="button" class="view-slider-btn active" id="btnView2D" role="radio" aria-checked="true" data-mode="2d">
						<span class="view-mode-icon" aria-hidden="true">📐</span>
						<span class="view-mode-text">2D</span>
					</button>
					<button type="button" class="view-slider-btn" id="btnView25D" role="radio" aria-checked="false" data-mode="2.5d">
						<span class="view-mode-icon" aria-hidden="true">🧊</span>
						<span class="view-mode-text">2.5D</span>
					</button>
				</div>
				<button type="button" class="view-settings-toggle-btn hidden" id="btnToggle25DSettings" title="2.5D Camera & Layer Controls" aria-label="2.5D Settings">
					<span class="settings-icon" aria-hidden="true">⚙️</span>
				</button>
			`;
			this.#mapContainer.appendChild(viewModeWidget);
		}

		let controlsPanel = this.#mapContainer.querySelector("#map25DControlsPanel");
		if (!controlsPanel) {
			const bearingLimits = APP_CONFIG.MAP?.CAMERA_LIMITS?.BEARING || { MIN: -45, MAX: 45 };
			const pitchLimits = APP_CONFIG.MAP?.CAMERA_LIMITS?.PITCH || { MIN: 20, MAX: 65 };
			const minBearing = bearingLimits.MIN ?? -45;
			const maxBearing = bearingLimits.MAX ?? 45;
			const minPitch = pitchLimits.MIN ?? 20;
			const maxPitch = pitchLimits.MAX ?? 65;

			controlsPanel = document.createElement("div");
			controlsPanel.id = "map25DControlsPanel";
			controlsPanel.className = "map-25d-controls-panel hidden";
			controlsPanel.setAttribute("role", "region");
			controlsPanel.setAttribute("aria-label", "2.5D Camera & Layer Controls");
			controlsPanel.innerHTML = `
				<div class="panel-header">
					<span class="panel-title">
						<span class="title-icon" aria-hidden="true">🧊</span>
						<span>2.5D Camera & Layers</span>
					</span>
					<button type="button" class="btn-close-25d-panel" id="btnClose25DPanel" title="Close Panel" aria-label="Close">✕</button>
				</div>

				<div class="control-row">
					<div class="control-label">
						<span>Camera Tilt / Pitch:</span>
						<span id="lblTiltVal">48°</span>
					</div>
					<input type="range" id="sliderTilt25D" min="${minPitch}" max="${maxPitch}" value="48">
				</div>

				<div class="control-row">
					<div class="control-label">
						<span>Plane Rotate / Bearing:</span>
						<span id="lblRotateVal">0°</span>
					</div>
					<input type="range" id="sliderRotate25D" min="${minBearing}" max="${maxBearing}" value="0">
				</div>

				<div class="control-row">
					<div class="control-label">
						<span>Viaduct Lift (+Z):</span>
						<span id="lblLiftVal">16px</span>
					</div>
					<input type="range" id="sliderLift25D" min="0" max="40" value="16">
				</div>

				<div class="control-row">
					<div class="control-label">
						<span>Tunnel Depth (-Z):</span>
						<span id="lblDepthVal">14px</span>
					</div>
					<input type="range" id="sliderDepth25D" min="0" max="40" value="14">
				</div>

				<div class="control-row">
					<div class="control-label">
						<span>Sun Light Angle:</span>
						<span id="lblSunVal">135°</span>
					</div>
					<input type="range" id="sliderSun25D" min="0" max="360" value="135">
				</div>

				<div class="control-row strata-toggle-row">
					<div class="control-label">
						<span>Z-Index 3D Levels (+Z / -Z):</span>
						<span id="lblZIndexVal">ON</span>
					</div>
					<button type="button" class="btn-strata-toggle active" id="btnZIndexToggle">
						<span id="txtZIndexToggle">🏢 Z-Index 3D: ON</span>
					</button>
				</div>

				<div class="control-row strata-toggle-row">
					<div class="control-label">
						<span>Perspective Grid Layer:</span>
						<span id="lblPerspectiveVal">ON</span>
					</div>
					<button type="button" class="btn-strata-toggle active" id="btnPerspectiveToggle">
						<span id="txtPerspectiveToggle">📐 Perspective Grid: ON</span>
					</button>
				</div>

				<div class="control-row strata-toggle-row">
					<div class="control-label">
						<span>Z-Strata Planes (+Z / -Z):</span>
						<span id="lblStrataVal">OFF</span>
					</div>
					<button type="button" class="btn-strata-toggle" id="btnStrataToggle">
						<span id="txtStrataToggle">💠 Strata Planes: OFF</span>
					</button>
				</div>

				<button type="button" class="btn-reset-25d-view" id="btnReset25DView">
					<span>Reset 2.5D View</span>
				</button>
			`;
			this.#mapContainer.appendChild(controlsPanel);
		}

		const btnView2D = viewModeWidget.querySelector("#btnView2D");
		const btnView25D = viewModeWidget.querySelector("#btnView25D");
		const btnToggle25DSettings = viewModeWidget.querySelector("#btnToggle25DSettings");
		const btnClose25DPanel = controlsPanel.querySelector("#btnClose25DPanel");

		const sliderTilt25D = controlsPanel.querySelector("#sliderTilt25D");
		const lblTiltVal = controlsPanel.querySelector("#lblTiltVal");
		const sliderRotate25D = controlsPanel.querySelector("#sliderRotate25D");
		const lblRotateVal = controlsPanel.querySelector("#lblRotateVal");
		const sliderLift25D = controlsPanel.querySelector("#sliderLift25D");
		const lblLiftVal = controlsPanel.querySelector("#lblLiftVal");
		const sliderDepth25D = controlsPanel.querySelector("#sliderDepth25D");
		const lblDepthVal = controlsPanel.querySelector("#lblDepthVal");
		const sliderSun25D = controlsPanel.querySelector("#sliderSun25D");
		const lblSunVal = controlsPanel.querySelector("#lblSunVal");
		const btnZIndexToggle = controlsPanel.querySelector("#btnZIndexToggle");
		const txtZIndexToggle = controlsPanel.querySelector("#txtZIndexToggle");
		const lblZIndexVal = controlsPanel.querySelector("#lblZIndexVal");
		const btnPerspectiveToggle = controlsPanel.querySelector("#btnPerspectiveToggle");
		const txtPerspectiveToggle = controlsPanel.querySelector("#txtPerspectiveToggle");
		const lblPerspectiveVal = controlsPanel.querySelector("#lblPerspectiveVal");
		const btnStrataToggle = controlsPanel.querySelector("#btnStrataToggle");
		const txtStrataToggle = controlsPanel.querySelector("#txtStrataToggle");
		const lblStrataVal = controlsPanel.querySelector("#lblStrataVal");
		const btnReset25DView = controlsPanel.querySelector("#btnReset25DView");

		const updateWidgetState = (is25) => {
			viewModeWidget.setAttribute("data-active-mode", is25 ? "2.5d" : "2d");
			btnView2D.classList.toggle("active", !is25);
			btnView2D.setAttribute("aria-checked", String(!is25));
			btnView25D.classList.toggle("active", is25);
			btnView25D.setAttribute("aria-checked", String(is25));

			if (btnToggle25DSettings) {
				btnToggle25DSettings.classList.toggle("hidden", !is25);
			}
			if (!is25 && controlsPanel) {
				controlsPanel.classList.add("hidden");
				btnToggle25DSettings?.classList.remove("active");
			}
		};

		// Initial sync
		const isInitial25 = Boolean(this.#canvasEngine?.is25D);
		updateWidgetState(isInitial25);

		btnView2D.onclick = () => {
			if (this.#canvasEngine?.is25D) {
				this.toggle25DMode(false);
			}
		};

		btnView25D.onclick = () => {
			if (!this.#canvasEngine?.is25D) {
				this.toggle25DMode(true);
			}
		};

		if (btnToggle25DSettings) {
			btnToggle25DSettings.onclick = () => {
				const isCurrentlyHidden = controlsPanel.classList.contains("hidden");
				controlsPanel.classList.toggle("hidden", !isCurrentlyHidden);
				btnToggle25DSettings.classList.toggle("active", isCurrentlyHidden);
			};
		}

		if (btnClose25DPanel) {
			btnClose25DPanel.onclick = () => {
				controlsPanel.classList.add("hidden");
				btnToggle25DSettings?.classList.remove("active");
			};
		}

		if (sliderTilt25D) {
			sliderTilt25D.oninput = (e) => {
				const val = parseInt(e.target.value);
				lblTiltVal.textContent = `${val}°`;
				this.#canvasEngine.setPitch(val);
			};
		}
		if (sliderRotate25D) {
			sliderRotate25D.oninput = (e) => {
				const val = parseInt(e.target.value);
				lblRotateVal.textContent = `${val}°`;
				this.#canvasEngine.setRotation(val);
			};
		}
		if (sliderLift25D) {
			sliderLift25D.oninput = (e) => {
				const val = parseInt(e.target.value);
				lblLiftVal.textContent = `${val}px`;
				this.#canvasEngine.setViaductLift(val);
			};
		}
		if (sliderDepth25D) {
			sliderDepth25D.oninput = (e) => {
				const val = parseInt(e.target.value);
				lblDepthVal.textContent = `${val}px`;
				this.#canvasEngine.setUndergroundDepth(val);
			};
		}
		if (sliderSun25D) {
			sliderSun25D.oninput = (e) => {
				const val = parseInt(e.target.value);
				lblSunVal.textContent = `${val}°`;
				this.#canvasEngine.setSunAngle(val);
			};
		}

		if (btnZIndexToggle) {
			btnZIndexToggle.onclick = () => {
				const isEnabled = !this.#canvasEngine.zIndexEnabled;
				this.#canvasEngine.setZIndexEnabled(isEnabled);
				btnZIndexToggle.classList.toggle("active", isEnabled);
				lblZIndexVal.textContent = isEnabled ? "ON" : "OFF";
				txtZIndexToggle.textContent = isEnabled ? "🏢 Z-Index 3D: ON" : "🏢 Z-Index 3D: OFF";
			};
		}

		if (btnPerspectiveToggle) {
			btnPerspectiveToggle.onclick = () => {
				const isVisible = !this.#canvasEngine.perspectiveGridVisible;
				this.#canvasEngine.setPerspectiveGridVisible(isVisible);
				btnPerspectiveToggle.classList.toggle("active", isVisible);
				lblPerspectiveVal.textContent = isVisible ? "ON" : "OFF";
				txtPerspectiveToggle.textContent = isVisible ? "📐 Perspective Grid: ON" : "📐 Perspective Grid: OFF";
			};
		}

		if (btnStrataToggle) {
			btnStrataToggle.onclick = () => {
				const isVisible = !this.#canvasEngine.zPlanesVisible;
				this.#canvasEngine.setZPlanesVisible(isVisible);
				btnStrataToggle.classList.toggle("active", isVisible);
				lblStrataVal.textContent = isVisible ? "ON" : "OFF";
				txtStrataToggle.textContent = isVisible ? "💠 Strata Planes: ON" : "💠 Strata Planes: OFF";
			};
		}

		if (btnReset25DView) {
			btnReset25DView.onclick = () => {
				this.#canvasEngine.setPitch(48);
				this.#canvasEngine.setRotation(0);
				this.#canvasEngine.setViaductLift(16);
				this.#canvasEngine.setUndergroundDepth(14);
				this.#canvasEngine.setSunAngle(135);
				this.#canvasEngine.setZIndexEnabled(true);
				this.#canvasEngine.setPerspectiveGridVisible(true);
				this.#canvasEngine.setZPlanesVisible(false);

				sliderTilt25D.value = 48;
				lblTiltVal.textContent = "48°";
				sliderRotate25D.value = 0;
				lblRotateVal.textContent = "0°";
				sliderLift25D.value = 16;
				lblLiftVal.textContent = "16px";
				sliderDepth25D.value = 14;
				lblDepthVal.textContent = "14px";
				sliderSun25D.value = 135;
				lblSunVal.textContent = "135°";

				btnZIndexToggle.classList.add("active");
				lblZIndexVal.textContent = "ON";
				txtZIndexToggle.textContent = "🏢 Z-Index 3D: ON";

				btnPerspectiveToggle.classList.add("active");
				lblPerspectiveVal.textContent = "ON";
				txtPerspectiveToggle.textContent = "📐 Perspective Grid: ON";

				btnStrataToggle.classList.remove("active");
				lblStrataVal.textContent = "OFF";
				txtStrataToggle.textContent = "💠 Strata Planes: OFF";

				this.#canvasEngine.fitToScreen(1.5);
			};
		}

		// Live sync on transform change (orbiting / zoom)
		this.#canvasEngine.onTransformChange = (data) => {
			const zoomLevel = this.#mapContainer.querySelector("#zoomLevel");
			if (zoomLevel && data.zoom != null) {
				zoomLevel.textContent = `${Math.round(data.zoom * 100)}%`;
			}
			if (data.pitchDeg != null && sliderTilt25D) {
				const pVal = Math.round(data.pitchDeg);
				sliderTilt25D.value = pVal;
				lblTiltVal.textContent = `${pVal}°`;
			}
			if (data.rotateDeg != null && sliderRotate25D) {
				const rVal = Math.round(data.rotateDeg);
				const signedVal = rVal > 180 ? rVal - 360 : rVal;
				sliderRotate25D.value = signedVal;
				lblRotateVal.textContent = `${signedVal}°`;
			}
			eventBus.emit("MAP_TRANSFORM_CHANGED", data);
		};
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
	// Public API Methods (100% Backward Compatible)
	// =========================================================================

	set setLanguage(selectedLang) {
		this.#settings.currentLang = selectedLang;
		this.#canvasEngine?.setLanguage(selectedLang);
		this.#legend?.render(selectedLang);
	}

	set setTheme(selectedTheme) {
		this.#settings.currentTheme = selectedTheme;
		this.#canvasEngine?.setTheme(selectedTheme);
	}

	highlightStatus(status) {
		this.#canvasEngine?.highlightStatus(status);
		this.#syncLegendControlsUI();
	}

	clearStatusHighlight() {
		this.#canvasEngine?.clearStatusHighlight();
		this.#syncLegendControlsUI();
	}

	highlightLayout(layout) {
		this.#canvasEngine?.highlightLayout(layout);
		this.#syncLegendControlsUI();
	}

	clearLayoutHighlight() {
		this.#canvasEngine?.clearLayoutHighlight();
		this.#syncLegendControlsUI();
	}

	highlightStation(stationId, autoPan = true) {
		if (!stationId) {
			this.clearStationHighlight();
			return;
		}
		if (autoPan) {
			this.#canvasEngine?.focusStation(stationId);
		} else {
			this.#canvasEngine?.focusStation(stationId, this.#canvasEngine.zoom);
		}
		this.#syncLegendControlsUI();
	}

	clearStationHighlight() {
		this.#canvasEngine?.clearStationHighlight();
		this.#syncLegendControlsUI();
	}

	toggleRouteVisibility() {
		const state = this.#canvasEngine?.getHighlightState?.() || {};
		if (state.activeLineId || state.activeStationType || state.activeStatus || state.activeLayout || state.activeStationId) {
			this.#canvasEngine?.clearFilterHighlights?.();
		} else if (state.activeRoutePath) {
			this.#canvasEngine?.toggleRouteVisibility?.();
		} else {
			this.#canvasEngine?.clearRouteHighlight?.();
		}
		this.#syncLegendControlsUI();
	}

	highlightRoute(path) {
		this.#canvasEngine?.highlightRoute(path);
		this.#syncLegendControlsUI();
	}

	highlightLine(lineId) {
		this.#canvasEngine?.highlightLine(lineId);
		this.#syncLegendControlsUI();
	}

	clearLineHighlight() {
		this.#canvasEngine?.clearLineHighlight();
		this.#syncLegendControlsUI();
	}

	highlightStationType(stationType) {
		this.#canvasEngine?.highlightStationType(stationType);
		this.#syncLegendControlsUI();
	}

	clearStationTypeHighlight() {
		this.#canvasEngine?.clearStationTypeHighlight();
		this.#syncLegendControlsUI();
	}

	#syncLegendControlsUI() {
		if (!this.#legend || !this.#canvasEngine?.getHighlightState) return;
		this.#legend.updateRouteToggleButtonUI(this.#canvasEngine.getHighlightState());
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
		this.#canvasEngine?.setRoutePin(type, stationId);
	}

	clearRoutePins() {
		this.#canvasEngine?.clearRoutePins();
	}

	toggle25DMode(targetEnable = null) {
		if (!this.#canvasEngine) return;
		const current = Boolean(this.#canvasEngine.is25D);
		if (targetEnable !== null && targetEnable === current) return;
		const is25 = this.#canvasEngine.toggle25D(targetEnable);
		localStorage.setItem("metro_map_view_mode", is25 ? "2.5d" : "2d");

		const viewModeWidget = this.#mapContainer?.querySelector("#viewModeWidget");
		const btnView2D = viewModeWidget?.querySelector("#btnView2D");
		const btnView25D = viewModeWidget?.querySelector("#btnView25D");
		const btnToggle25DSettings = viewModeWidget?.querySelector("#btnToggle25DSettings");
		const controlsPanel = this.#mapContainer?.querySelector("#map25DControlsPanel");

		if (viewModeWidget) {
			viewModeWidget.setAttribute("data-active-mode", is25 ? "2.5d" : "2d");
			btnView2D?.classList.toggle("active", !is25);
			btnView2D?.setAttribute("aria-checked", String(!is25));
			btnView25D?.classList.toggle("active", is25);
			btnView25D?.setAttribute("aria-checked", String(is25));
			btnToggle25DSettings?.classList.toggle("hidden", !is25);
			if (!is25 && controlsPanel) {
				controlsPanel.classList.add("hidden");
				btnToggle25DSettings?.classList.remove("active");
			}
		}

		this.#canvasEngine.notifyTransformChange();
		eventBus.emit("MAP_TRANSFORM_CHANGED", { is25D: is25 });
	}

	get zoomRange() {
		return this.#zoomRange;
	}

	getStationScreenPosition(stationId, x = null, y = null) {
		const station = (stationId && this.#metroData?.stationData?.[stationId]) ||
						(stationId && this.#canvasEngine?.stationData?.[stationId]) || null;

		if (x == null || y == null) {
			if (station?.xy) {
				x = station.xy.x;
				y = station.xy.y;
			}
		}

		if (x == null || y == null || !this.#canvasEngine) {
			return null;
		}

		const layout = station?.properties?.layout || "elevated";
		const z = this.#canvasEngine.is25D ? this.#canvasEngine.getLayoutElevation(layout) : 0;
		const pt = this.#canvasEngine.projectPoint(x, y, z);
		return {
			x: pt.sx,
			y: pt.sy,
			clientX: pt.sx,
			clientY: pt.sy,
		};
	}

	setZPlanesVisible(visible) {
		this.#canvasEngine?.setZPlanesVisible(visible);
	}

	setZPlanesOpacity(opacity) {
		this.#canvasEngine?.setZPlanesOpacity(opacity);
	}

	setZIndexEnabled(enabled) {
		this.#canvasEngine?.setZIndexEnabled(enabled);
	}

	getZIndexEnabled() {
		return Boolean(this.#canvasEngine?.zIndexEnabled);
	}

	setPerspectiveGridVisible(visible) {
		this.#canvasEngine?.setPerspectiveGridVisible(visible);
	}

	getPerspectiveGridVisible() {
		return Boolean(this.#canvasEngine?.perspectiveGridVisible);
	}

	setViaductLift(px) {
		this.#canvasEngine?.setViaductLift(px);
	}

	setUndergroundDepth(px) {
		this.#canvasEngine?.setUndergroundDepth(px);
	}

	setPitch(deg) {
		this.#canvasEngine?.setPitch(deg);
	}

	setRotation(deg) {
		this.#canvasEngine?.setRotation(deg);
	}

	setSunAngle(deg) {
		this.#canvasEngine?.setSunAngle(deg);
	}

	destroy() {
		if (this.#abortController) {
			this.#abortController.abort();
			this.#abortController = null;
		}
		this.#canvasEngine?.destroy();
		if (this.#mapContainer) {
			this.#mapContainer.innerHTML = "";
		}
	}
}
