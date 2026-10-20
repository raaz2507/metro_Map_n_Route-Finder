/**
 * ⚡ CanvasRenderer.js - High-Performance 60-120 FPS Native Canvas Map Engine
 * Renders metro tracks, stations (5 Legend types), and labels directly onto HTML5 Canvas.
 * - Reuses existing MapGeometry and MapLabelEngine pure logic
 * - Zero stations or labels hidden / dropped (Ghaziabad, Agra, and all networks 100% visible)
 * - Dynamic SVG-viewBox-to-Canvas scale adapts perfectly to both small (Agra) and large (Delhi) networks
 * - Independent cross-fading hover transitions (No sudden pop/snap on fast mouse movement)
 * - Sleek, compact styling with clean theme switching
 */

import { MapGeometry } from "../core/MapGeometry.js";
import { MapLabelEngine } from "../core/MapLabelEngine.js";
import { CanvasGestures } from "./CanvasGestures.js";
import { CanvasCamera3D } from "./CanvasCamera3D.js";
import { CanvasTrackRenderer } from "./CanvasTrackRenderer.js";
import { APP_CONFIG } from "../../../config/app-config.js";

export class CanvasRenderer {
	#container = null;
	#canvas = null;
	#ctx = null;
	#metroData = null;
	#stationData = {};
	#linesData = {};
	#bounds = null;
	#viewBoxInfo = null;
	#labelGeomCache = null;
	#centerClass = null;

	// Viewport & Transform State
	#zoom = 1.0;
	#panX = 0;
	#panY = 0;
	#minZoom = 0.2;
	#maxZoom = 35.0;
	#is25D = false;

	// 2.5D Camera & 3D Parameters (Configurable 0° to 360°)
	#camera = null;
	#showPerspectiveGrid = true;
	#showZPlanes = false;
	#zPlanesOpacity = 0.55;

	// Animation & Performance
	#isDirty = true;
	#rAF = null;
	#dpr = window.devicePixelRatio || 1;
	#fps = 60;
	#frameCount = 0;
	#lastFpsTime = performance.now();

	// Independent Smooth Hover Animation State
	#hoverStationId = null;
	#hoverProgress = 0;
	#exitingHoverStationId = null;
	#exitHoverProgress = 0;
	#hoveredStation = null;

	// Camera Gliding Animation
	#cameraAnim = null;

	// Gesture & Track Controllers
	#gestures = null;
	#trackRenderer = null;

	// Active Highlights
	#activeRoutePath = null;
	#isRouteVisible = false;
	#activeRouteEdges = new Set();
	#activeRouteStations = new Set();
	#routePins = { from: null, to: null };
	#routePinsOverlay = null;
	#pinFromEl = null;
	#pinToEl = null;
	#lastFromStationId = null;
	#lastToStationId = null;
	#activeStationId = null;
	#activeLineId = null;
	#activeStatus = null;
	#activeStationType = null;
	#activeLayout = null;
	#currentLang = "en";
	#currentTheme = "light";

	// Callbacks
	onStationHover = null;
	onStationClick = null;
	onTransformChange = null;
	onFpsUpdate = null;

	constructor({
		container,
		metroData,
		centerClass = null,
		is25D = false,
		lang = "en",
		theme = "light"
	}) {
		this.#container = typeof container === "string" ? document.querySelector(container) : container;
		this.#metroData = metroData || {};
		this.#stationData = metroData?.stationData || {};
		this.#linesData = metroData?.lines || {};
		this.#centerClass = centerClass;
		this.#is25D = is25D;
		this.#currentLang = lang;
		this.#currentTheme = theme;

		this.#camera = new CanvasCamera3D({
			pitchDeg: 48,
			rotateDeg: 0,
			viaductLift: 16,
			undergroundDepth: 14,
			enableZIndex: true,
			sunAngleDeg: 135
		});
		this.#initCanvas();
		this.#initGeometry();
		this.#gestures = new CanvasGestures(this, this.#canvas, this.#container);
		this.#trackRenderer = new CanvasTrackRenderer(this);
		this.#startRenderLoop();

		// Auto sync on theme switch
		if (typeof MutationObserver !== "undefined" && typeof document !== "undefined") {
			this._themeObserver = new MutationObserver(() => this.requestRender());
			if (document.body) {
				this._themeObserver.observe(document.body, { attributes: true, attributeFilter: ["data-mode", "data-theme", "class"] });
			}
			if (document.documentElement) {
				this._themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mode", "data-theme", "class"] });
			}
		}
	}

	getThemeToken(varName, fallback = "") {
		if (typeof window === "undefined" || !document.body) return fallback;
		const val = getComputedStyle(document.body).getPropertyValue(varName).trim();
		return val || fallback;
	}

	get is25D() {
		return this.#is25D;
	}

	get zoom() {
		return this.#zoom;
	}

	get panX() {
		return this.#panX;
	}

	get panY() {
		return this.#panY;
	}

	// =========================================================================
	// 1. Canvas Setup & Resizing
	// =========================================================================

	#initCanvas() {
		if (!this.#container) return;
		this.#canvas = document.createElement("canvas");
		this.#canvas.style.touchAction = "none";
		this.#canvas.style.userSelect = "none";
		this.#canvas.style.webkitUserSelect = "none";
		this.#ctx = this.#canvas.getContext("2d", { alpha: true });
		this.#container.innerHTML = "";
		this.#container.appendChild(this.#canvas);
		this.#initRoutePinsOverlay();
		this.#resizeCanvas();

		this._resizeObserver = new ResizeObserver(() => {
			this.#resizeCanvas();
			this.requestRender();
		});
		this._resizeObserver.observe(this.#container);
	}

	#initRoutePinsOverlay() {
		if (!this.#container) return;
		this.#routePinsOverlay = this.#container.querySelector(".map-route-pins-layer");
		if (!this.#routePinsOverlay) {
			this.#routePinsOverlay = document.createElement("div");
			this.#routePinsOverlay.className = "map-route-pins-layer";
			this.#routePinsOverlay.setAttribute("aria-hidden", "true");
			this.#routePinsOverlay.style.cssText = "position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:25;overflow:hidden;";
			this.#container.appendChild(this.#routePinsOverlay);
		}

		const createPin = (type, iconFile) => {
			let pin = this.#routePinsOverlay.querySelector(`#mapPin_${type}`);
			if (!pin) {
				pin = document.createElement("div");
				pin.id = `mapPin_${type}`;
				pin.className = `route-pin-badge route-pin-${type}`;
				pin.style.cssText = "position:absolute;top:0;left:0;display:none;pointer-events:none;will-change:transform;transform-origin:50% 87.88%;z-index:25;";
				pin.innerHTML = `
					<div class="pin-drop-anim">
						<img src="./assets/icons/${iconFile}" alt="${type.toUpperCase()}" width="58" height="33" draggable="false" style="display:block;width:58px;height:33px;pointer-events:none;user-select:none;" />
					</div>
				`;
				this.#routePinsOverlay.appendChild(pin);
			}
			return pin;
		};

		this.#pinFromEl = createPin("from", "pin_route_from.svg");
		this.#pinToEl = createPin("to", "pin_route_to.svg");
	}

	#resizeCanvas() {
		if (!this.#container || !this.#canvas) return;
		const rect = this.#container.getBoundingClientRect();
		const w = rect.width > 50 ? rect.width : (window.innerWidth - 32);
		const h = rect.height > 50 ? rect.height : (window.innerHeight - 80);

		const isMobile = typeof navigator !== "undefined" && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768);
		const maxDpr = isMobile ? 1.5 : 2.0;
		this.#dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
		this.#canvas.width = Math.round(w * this.#dpr);
		this.#canvas.height = Math.round(h * this.#dpr);
		this.#canvas.style.width = `${w}px`;
		this.#canvas.style.height = `${h}px`;
		this.#isDirty = true;
	}

	// =========================================================================
	// 2. Geometry & Universal ViewBox Mapping
	// =========================================================================

	#initGeometry() {
		this.#bounds = MapGeometry.getBounds(this.#stationData);
		const { width, height, avgLatRad } = MapGeometry.calculateSVGSize(this.#bounds);
		MapGeometry.convertLatLonToXY(this.#stationData, this.#bounds, avgLatRad);
		this.#labelGeomCache = MapGeometry.precalculateLabelGeometry(this.#stationData);
		this.#viewBoxInfo = MapGeometry.calculateViewBox(this.#bounds);

		const zoomRange = MapGeometry.calculateZoomRange(this.#bounds);
		this.#minZoom = Math.min(0.2, zoomRange.minZoom || 0.4);
		this.#maxZoom = Math.max(35.0, zoomRange.maxZoom || 15.0);

		// Center network initially
		this.fitToScreen(this.#is25D ? 1.5 : 1.0);
	}

	/**
	 * Compute base scale mapping SVG viewBox units to screen pixels.
	 * Works universally for both small networks (Agra) and large ones (Delhi)!
	 */
	getBaseScale() {
		if (!this.#bounds || !this.#container || !this.#viewBoxInfo) return 0.005;
		const rect = this.#container.getBoundingClientRect();
		const cw = rect.width > 50 ? rect.width : window.innerWidth;
		const ch = rect.height > 50 ? rect.height : (window.innerHeight - 80);

		const vbW = this.#viewBoxInfo.width + 2 * this.#viewBoxInfo.margin;
		const vbH = this.#viewBoxInfo.height + 2 * this.#viewBoxInfo.margin;

		return Math.min(cw / (vbW || 150000), ch / (vbH || 160000)) * 0.94;
	}

	getNetworkCenter() {
		if (!this.#viewBoxInfo) return { cx: 75000, cy: 80000 };
		return {
			cx: this.#viewBoxInfo.width / 2,
			cy: this.#viewBoxInfo.height / 2
		};
	}

	getTrackWidth(scale = 1) {
		const effectiveScale = this.getBaseScale() * this.#zoom;
		// True geometric world scaling: track = 100 world units
		// Gracefully scales from 0.6px (zoom out) up to 24.0px (zoom in)
		const baseW = Math.max(0.6, Math.min(24.0, 100 * effectiveScale));
		const clampedScale = Math.max(0.92, Math.min(1.12, scale || 1));
		return baseW * clampedScale;
	}

	getStationRadius(scale = 1, isInterchange = false) {
		const effectiveScale = this.getBaseScale() * this.#zoom;
		// True geometric world scaling: normal = 200 units, interchange = 280 units
		// Truly proper chota on zoom out (0.8px) and proper bada on zoom in (up to 32px / 42px)
		const normalR = Math.max(0.8, Math.min(32.0, 200 * effectiveScale));
		const interR = Math.max(1.2, Math.min(42.0, 280 * effectiveScale));
		const baseR = isInterchange ? interR : normalR;
		const clampedScale = Math.max(0.92, Math.min(1.12, scale || 1));
		return baseR * clampedScale;
	}

	getStationName(st) {
		if (!st) return "";
		if (this.#centerClass && typeof this.#centerClass.getStationName === "function") {
			const name = this.#centerClass.getStationName(st.id, this.#currentLang);
			if (name && name.trim() !== "") return name;
		}
		if (st.name?.[this.#currentLang]) return st.name[this.#currentLang];
		if (st.name?.en) return st.name.en;
		return st.id
			.split("_")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");
	}

	getStationType(station) {
		if (!station) return "normal";
		if (station.properties?.station_type) return station.properties.station_type;
		if (station.station_type) return station.station_type;
		const stationId = station.id;
		const stTransfers = this.#metroData?.transfers?.[stationId];
		if (stTransfers) {
			for (const fromLine of Object.values(stTransfers)) {
				for (const tData of Object.values(fromLine)) {
					if (tData.type === "walkway") return "walkway";
					if (tData.type === "multimodal") return "multimodal";
				}
			}
			return "interchange";
		}
		const stLines = station.lines || [];
		if (stLines.length > 1) {
			const hasSharedLine = stLines.some((lId) => this.#linesData?.[lId]?.sharedTrack);
			if (hasSharedLine) return "shared_track";
			return "interchange";
		}
		return "normal";
	}

	getEdgeStatus(st1, st2, lineId) {
		const lineStatus = this.#linesData?.[lineId]?.status || "operational";
		const st1Status = st1.properties?.status || "operational";
		const st2Status = st2.properties?.status || "operational";

		if (lineStatus === "under_construction" || st1Status === "under_construction" || st2Status === "under_construction") {
			return "under_construction";
		}
		if (lineStatus === "approved" || lineStatus === "proposed" || st1Status === "approved" || st2Status === "approved" || st1Status === "proposed" || st2Status === "proposed") {
			return "approved";
		}
		return "operational";
	}

	// =========================================================================
	// 3. Coordinate Projection Engine
	// =========================================================================

	// =========================================================================
	// 3. Camera & 3D Matrix Delegations (CanvasCamera3D)
	// =========================================================================

	get #pitchDeg() { return this.#camera ? this.#camera.pitchDeg : 48; }
	set #pitchDeg(val) { if (this.#camera) this.#camera.pitchDeg = val; }

	get #rotateDeg() { return this.#camera ? this.#camera.rotateDeg : 0; }
	set #rotateDeg(val) { if (this.#camera) this.#camera.rotateDeg = val; }

	get #viaductLift() { return this.#camera ? this.#camera.viaductLift : 16; }
	set #viaductLift(val) { if (this.#camera) this.#camera.viaductLift = val; }

	get #undergroundDepth() { return this.#camera ? this.#camera.undergroundDepth : 14; }
	set #undergroundDepth(val) { if (this.#camera) this.#camera.undergroundDepth = val; }

	get #enableZIndex() { return this.#camera ? this.#camera.enableZIndex : true; }
	set #enableZIndex(val) { if (this.#camera) this.#camera.enableZIndex = val; }

	get #sunAngleDeg() { return this.#camera ? this.#camera.sunAngleDeg : 135; }
	set #sunAngleDeg(val) { if (this.#camera) this.#camera.sunAngleDeg = val; }

	/**
	 * Extracts current viewport and projection parameters for 3D Camera calculations
	 */
	getViewParams() {
		const rect = this.#container.getBoundingClientRect();
		const vpW = rect.width > 50 ? rect.width : window.innerWidth;
		const vpH = rect.height > 50 ? rect.height : (window.innerHeight - 80);
		const baseScale = this.getBaseScale();
		const { cx, cy } = this.getNetworkCenter();
		const effectiveScale = baseScale * this.#zoom;
		return {
			vpW,
			vpH,
			cx,
			cy,
			effectiveScale,
			zoom: this.#zoom,
			panX: this.#panX,
			panY: this.#panY,
			is25D: this.#is25D
		};
	}

	getLayoutElevation(layout) {
		return this.#camera ? this.#camera.getLayoutElevation(layout, this.#is25D) : 0;
	}

	setPitch(deg) {
		const limits = APP_CONFIG.MAP?.CAMERA_LIMITS?.PITCH || { MIN: 20, MAX: 65 };
		const minLimit = limits.MIN != null ? limits.MIN : 20;
		const maxLimit = limits.MAX != null ? limits.MAX : 65;

		const clamped = Math.max(minLimit, Math.min(maxLimit, deg));
		if (this.#camera) this.#camera.pitchDeg = clamped;
		this.requestRender();
		this.notifyTransformChange();
	}

	getPitch() {
		return this.#camera ? this.#camera.pitchDeg : 48;
	}

	setRotation(deg) {
		const limits = APP_CONFIG.MAP?.CAMERA_LIMITS?.BEARING || { MIN: -45, MAX: 45 };
		const minLimit = limits.MIN != null ? limits.MIN : -45;
		const maxLimit = limits.MAX != null ? limits.MAX : 45;

		let finalDeg = deg;
		if (!(minLimit <= -180 && maxLimit >= 180)) {
			let norm = ((deg % 360) + 360) % 360;
			let signed = norm > 180 ? norm - 360 : norm;
			let clamped = Math.max(minLimit, Math.min(maxLimit, signed));
			finalDeg = ((clamped % 360) + 360) % 360;
		}

		if (this.#camera) this.#camera.rotateDeg = finalDeg;
		this.requestRender();
		this.notifyTransformChange();
	}

	getRotation() {
		return this.#camera ? this.#camera.rotateDeg : 0;
	}

	setViaductLift(px) {
		if (this.#camera) this.#camera.viaductLift = px;
		this.requestRender();
	}

	getViaductLift() {
		return this.#camera ? this.#camera.viaductLift : 16;
	}

	setUndergroundDepth(px) {
		if (this.#camera) this.#camera.undergroundDepth = px;
		this.requestRender();
	}

	getUndergroundDepth() {
		return this.#camera ? this.#camera.undergroundDepth : 14;
	}

	setZPlanesVisible(visible) {
		this.#showZPlanes = !!visible;
		this.requestRender();
	}

	get zPlanesVisible() {
		return this.#showZPlanes;
	}

	setZPlanesOpacity(opacity) {
		this.#zPlanesOpacity = Math.max(0, Math.min(1, opacity));
		this.requestRender();
	}

	get zPlanesOpacity() {
		return this.#zPlanesOpacity;
	}

	setSunAngle(deg) {
		if (this.#camera) this.#camera.sunAngleDeg = deg;
		this.requestRender();
	}

	getSunAngle() {
		return this.#camera ? this.#camera.sunAngleDeg : 135;
	}

	setZIndexEnabled(enabled) {
		if (this.#camera) this.#camera.enableZIndex = Boolean(enabled);
		this.requestRender();
	}

	get zIndexEnabled() {
		return this.#camera ? this.#camera.enableZIndex : true;
	}

	setPerspectiveGridVisible(visible) {
		this.#showPerspectiveGrid = Boolean(visible);
		this.requestRender();
	}

	get perspectiveGridVisible() {
		return this.#showPerspectiveGrid;
	}

	projectPoint(x, y, elevationZ = 0) {
		return this.#camera
			? this.#camera.projectPoint(x, y, elevationZ, this.getViewParams())
			: { sx: x, sy: y, groundSx: x, groundY: y, scale: 1, effectiveScale: 1 };
	}

	projectSunShadow(x, y, elevationZ) {
		return this.#camera
			? this.#camera.projectSunShadow(x, y, elevationZ, this.getViewParams())
			: this.projectPoint(x, y, 0);
	}

	projectTunnelReverseShadow(x, y, elevationZ) {
		return this.#camera
			? this.#camera.projectTunnelReverseShadow(x, y, elevationZ, this.getViewParams())
			: this.projectPoint(x, y, 0);
	}

	fitToScreen(targetZoom = 1.0) {
		this.#zoom = targetZoom;
		this.#panX = 0;
		this.#panY = 0;
		this.requestRender();
		if (typeof this.onTransformChange === "function") {
			this.onTransformChange({ zoom: this.#zoom, panX: this.#panX, panY: this.#panY });
		}
	}

	// =========================================================================
	// 4. Render Loop & Animation Interpolation
	// =========================================================================

	requestRender() {
		this.#isDirty = true;
	}

	#startRenderLoop() {
		const renderFrame = (now) => {
			this.#updateFps(now);

			// Camera Gliding & 3D Tilt Animation
			if (this.#cameraAnim) {
				const elapsed = now - this.#cameraAnim.startTime;
				const progress = Math.min(1.0, elapsed / this.#cameraAnim.duration);
				const ease = 1 - Math.pow(1 - progress, 3);

				if (this.#cameraAnim.startZoom != null && this.#cameraAnim.targetZoom != null) {
					this.#zoom = this.#cameraAnim.startZoom + (this.#cameraAnim.targetZoom - this.#cameraAnim.startZoom) * ease;
				}
				if (this.#cameraAnim.startPanX != null && this.#cameraAnim.targetPanX != null) {
					this.#panX = this.#cameraAnim.startPanX + (this.#cameraAnim.targetPanX - this.#cameraAnim.startPanX) * ease;
				}
				if (this.#cameraAnim.startPanY != null && this.#cameraAnim.targetPanY != null) {
					this.#panY = this.#cameraAnim.startPanY + (this.#cameraAnim.targetPanY - this.#cameraAnim.startPanY) * ease;
				}
				if (this.#cameraAnim.startPitch != null && this.#cameraAnim.targetPitch != null) {
					this.#pitchDeg = this.#cameraAnim.startPitch + (this.#cameraAnim.targetPitch - this.#cameraAnim.startPitch) * ease;
				}
				if (this.#cameraAnim.startRotate != null && this.#cameraAnim.targetRotate != null) {
					this.#rotateDeg = this.#cameraAnim.startRotate + (this.#cameraAnim.targetRotate - this.#cameraAnim.startRotate) * ease;
				}

				this.#isDirty = true;

				if (typeof this.onTransformChange === "function") {
					this.onTransformChange({
						zoom: this.#zoom,
						panX: this.#panX,
						panY: this.#panY,
						pitchDeg: this.#pitchDeg,
						rotateDeg: this.#rotateDeg
					});
				}

				if (progress >= 1.0) {
					const cb = this.#cameraAnim.onComplete;
					this.#cameraAnim = null;
					if (typeof cb === "function") cb();
				}
			}

			// Smooth Hover Animation: Entering Station eases up (0 -> 1.0)
			if (this.#hoverStationId !== null) {
				if (this.#hoverProgress < 1.0) {
					this.#hoverProgress += (1.0 - this.#hoverProgress) * 0.28;
					if (this.#hoverProgress > 0.98) this.#hoverProgress = 1.0;
					this.#isDirty = true;
				}
			}

			// Exiting Station eases down (progress -> 0)
			if (this.#exitingHoverStationId !== null) {
				if (this.#exitHoverProgress > 0) {
					this.#exitHoverProgress += (0 - this.#exitHoverProgress) * 0.28;
					if (this.#exitHoverProgress < 0.02) {
						this.#exitHoverProgress = 0;
						this.#exitingHoverStationId = null;
					}
					this.#isDirty = true;
				}
			}

			if (this.#isDirty) {
				this.#isDirty = false;
				this.#drawScene();
			}

			this.#rAF = requestAnimationFrame(renderFrame);
		};

		this.#rAF = requestAnimationFrame(renderFrame);
	}

	#updateFps(now) {
		this.#frameCount++;
		if (now - this.#lastFpsTime >= 1000) {
			this.#fps = Math.round((this.#frameCount * 1000) / (now - this.#lastFpsTime));
			this.#frameCount = 0;
			this.#lastFpsTime = now;
			if (typeof this.onFpsUpdate === "function") {
				this.onFpsUpdate(this.#fps);
			}
		}
	}

	#isMapDimmed() {
		return Boolean(
			(this.#activeRoutePath && this.#isRouteVisible) ||
			this.#activeLineId ||
			this.#activeStatus ||
			this.#activeStationType ||
			this.#activeLayout
		);
	}

	// =========================================================================
	// 5. Main Drawing Pipeline
	// =========================================================================

	#drawScene() {
		const ctx = this.#ctx;
		const canvas = this.#canvas;
		if (!ctx || !canvas) return;

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.scale(this.#dpr, this.#dpr);

		// =====================================================================
		// PASS 1: SUBTERRANEAN STRATUM (Negative Z: Z < 0)
		// =====================================================================
		// 0A. Negative Z Subterranean Stratum Plane
		if (this.#is25D && this.#enableZIndex && this.#showZPlanes && this.#undergroundDepth > 0) {
			this.#drawSubterraneanPlane(ctx);
		}

		// Shared drawn track edge set ensures ZERO duplicate track segments across all strata passes!
		const drawnTrackEdges = new Set();

		// 1A. Underground Metro Tracks
		this.#trackRenderer.drawUndergroundTracks(ctx, drawnTrackEdges);

		// 1A_stations. Underground Station Nodes (True subterranean depth: Z < 0)
		if (this.#is25D) {
			this.#drawStations(ctx, "underground");
		}


		// =====================================================================
		// PASS 2: GROUND STRATUM (Surface Level: Z = 0)
		// =====================================================================
		// 0B_grid. Ground Perspective Grid Floor Layer (Z = 0)
		if (this.#is25D && this.#showPerspectiveGrid) {
			this.#drawGroundPerspectiveGrid(ctx);
		}

		// 0B_shadows. Viaduct ground soft shadows (diffused ambient shadow cast on Z = 0 ground datum)
		if (this.#is25D && this.#enableZIndex && this.#viaductLift > 0) {
			this.#trackRenderer.drawViaductSoftShadows(ctx);
		}

		// 0B_tunnel. Subterranean tunnel conduit trace / glow (diffused misty aura on Z = 0 ground datum)
		if (this.#is25D && this.#enableZIndex && this.#undergroundDepth > 0) {
			this.#trackRenderer.drawTunnelGroundReverseShadow(ctx);
		}

		// 1B. Surface / At-Grade Tracks
		this.#trackRenderer.drawSurfaceTracks(ctx, drawnTrackEdges);

		// 1B_stations. Surface Station Nodes (At-Grade ground datum: Z = 0)
		if (this.#is25D) {
			this.#drawStations(ctx, "surface");
		}


		// =====================================================================
		// PASS 3: ELEVATED AERIAL STRATUM (Positive Z: Z > 0)
		// =====================================================================
		// 0E. Positive Z Aerial Viaduct Stratum Plane
		if (this.#is25D && this.#enableZIndex && this.#showZPlanes && this.#viaductLift > 0) {
			this.#drawElevatedPlane(ctx);
		}

		// 1C. Elevated & Transition Tracks
		this.#trackRenderer.drawElevatedTracks(ctx, drawnTrackEdges);
		this.#trackRenderer.drawTransitionTracks(ctx, drawnTrackEdges);

		// 1C_stations. Elevated Station Nodes (Viaduct level: Z > 0)
		if (this.#is25D) {
			this.#drawStations(ctx, "elevated");
		}


		// =====================================================================
		// PASS 4: OVERLAYS, STATIONS & LABELS
		// =====================================================================
		// 2. Active Route Highlight Overlay
		if (this.#activeRoutePath && this.#activeRoutePath.length > 1) {
			this.#trackRenderer.drawActiveRouteOverlay(ctx);
		}

		// 3. Station Nodes (If 2D mode, render all stations; if 2.5D, render top active/hovered overlay)
		this.#drawStations(ctx, this.#is25D ? "top" : "all");

		// 4. Route Pins (Origin & Destination 3D Ribbon Badges: pin_route_from.svg & pin_route_to.svg)
		this.#updateRoutePinsOverlay();

		// 5. Station Labels (Zero stations dropped, 8-quadrant placement)
		this.#drawLabels(ctx);
	}

	/**
	 * Ground Perspective Reference Grid Floor (Z = 0 Ground Datum Plane)
	 * Visualizes isometric 3D spatial grid floor with subtle coordinates and boundaries.
	 * 
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 */
	#drawGroundPerspectiveGrid(ctx) {
		if (!this.#viewBoxInfo) return;
		const isLight = this.#currentTheme === "light";
		const opacity = this.#zPlanesOpacity;

		const margin = this.#viewBoxInfo.margin || 0;
		const xMin = this.#viewBoxInfo.minX !== undefined ? this.#viewBoxInfo.minX : -margin;
		const yMin = this.#viewBoxInfo.minY !== undefined ? this.#viewBoxInfo.minY : -margin;
		const totalW = (this.#viewBoxInfo.width || 1000) + 2 * margin;
		const totalH = (this.#viewBoxInfo.height || 1000) + 2 * margin;
		const xMax = xMin + totalW;
		const yMax = yMin + totalH;
		const gridSize = Math.max(55, Math.round(Math.min(totalW, totalH) / 16));

		const c1 = this.projectPoint(xMin, yMin, 0);
		const c2 = this.projectPoint(xMax, yMin, 0);
		const c3 = this.projectPoint(xMax, yMax, 0);
		const c4 = this.projectPoint(xMin, yMax, 0);

		ctx.save();

		// Floor wash (Subtle, airy translucent ground wash)
		ctx.fillStyle = isLight
			? `rgba(241, 245, 249, ${0.06 * opacity})`
			: `rgba(15, 23, 42, ${0.08 * opacity})`;
		ctx.beginPath();
		ctx.moveTo(c1.sx, c1.sy);
		ctx.lineTo(c2.sx, c2.sy);
		ctx.lineTo(c3.sx, c3.sy);
		ctx.lineTo(c4.sx, c4.sy);
		ctx.closePath();
		ctx.fill();

		// Interior grid lines (Soft, non-intrusive reference lines)
		ctx.strokeStyle = isLight
			? `rgba(148, 163, 184, ${0.12 * opacity})`
			: `rgba(71, 85, 105, ${0.16 * opacity})`;
		ctx.lineWidth = 0.6;
		ctx.beginPath();
		for (let x = xMin; x <= xMax; x += gridSize) {
			const p1 = this.projectPoint(x, yMin, 0);
			const p2 = this.projectPoint(x, yMax, 0);
			ctx.moveTo(p1.sx, p1.sy);
			ctx.lineTo(p2.sx, p2.sy);
		}
		for (let y = yMin; y <= yMax; y += gridSize) {
			const p1 = this.projectPoint(xMin, y, 0);
			const p2 = this.projectPoint(xMax, y, 0);
			ctx.moveTo(p1.sx, p1.sy);
			ctx.lineTo(p2.sx, p2.sy);
		}
		ctx.stroke();

		// Outer datum border (Delicate framing)
		ctx.strokeStyle = isLight
			? `rgba(148, 163, 184, ${0.20 * opacity})`
			: `rgba(100, 116, 139, ${0.25 * opacity})`;
		ctx.lineWidth = 1.0;
		ctx.beginPath();
		ctx.moveTo(c1.sx, c1.sy);
		ctx.lineTo(c2.sx, c2.sy);
		ctx.lineTo(c3.sx, c3.sy);
		ctx.lineTo(c4.sx, c4.sy);
		ctx.closePath();
		ctx.stroke();

		ctx.restore();
	}

	/**
	 * Negative Z Stratum Perspective Plane (-Z Subterranean Bed)
	 * Visualizes the subterranean bedrock floor in deep indigo/slate tone with perspective grid.
	 * 
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 */
	#drawSubterraneanPlane(ctx) {
		if (!this.#viewBoxInfo || this.#undergroundDepth <= 0) return;
		const z = -this.#undergroundDepth;
		const isLight = this.#currentTheme === "light";
		const opacity = this.#zPlanesOpacity;

		const margin = this.#viewBoxInfo.margin || 0;
		const xMin = this.#viewBoxInfo.minX !== undefined ? this.#viewBoxInfo.minX : -margin;
		const yMin = this.#viewBoxInfo.minY !== undefined ? this.#viewBoxInfo.minY : -margin;
		const totalW = (this.#viewBoxInfo.width || 1000) + 2 * margin;
		const totalH = (this.#viewBoxInfo.height || 1000) + 2 * margin;
		const xMax = xMin + totalW;
		const yMax = yMin + totalH;
		const gridSize = Math.max(35, Math.round(Math.min(totalW, totalH) / 22));

		const c1 = this.projectPoint(xMin, yMin, z);
		const c2 = this.projectPoint(xMax, yMin, z);
		const c3 = this.projectPoint(xMax, yMax, z);
		const c4 = this.projectPoint(xMin, yMax, z);

		ctx.save();

		// Stratum floor wash
		ctx.fillStyle = isLight
			? `rgba(99, 102, 241, ${0.035 * opacity})`
			: `rgba(30, 27, 75, ${0.28 * opacity})`;
		ctx.beginPath();
		ctx.moveTo(c1.sx, c1.sy);
		ctx.lineTo(c2.sx, c2.sy);
		ctx.lineTo(c3.sx, c3.sy);
		ctx.lineTo(c4.sx, c4.sy);
		ctx.closePath();
		ctx.fill();

		// Stratum boundary border
		ctx.strokeStyle = isLight
			? `rgba(99, 102, 241, ${0.55 * opacity})`
			: `rgba(129, 140, 248, ${0.60 * opacity})`;
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(c1.sx, c1.sy);
		ctx.lineTo(c2.sx, c2.sy);
		ctx.lineTo(c3.sx, c3.sy);
		ctx.lineTo(c4.sx, c4.sy);
		ctx.closePath();
		ctx.stroke();

		// Stratum Level Badge
		ctx.fillStyle = isLight ? "#4f46e5" : "#a5b4fc";
		ctx.font = `600 10.5px Montserrat`;
		ctx.textAlign = "left";
		ctx.textBaseline = "top";
		ctx.fillText(`[-Z] SUBTERRANEAN STRATUM (-${this.#undergroundDepth}px)`, c4.sx + 8, c4.sy - 18);

		ctx.restore();
	}

	/**
	 * Positive Z Stratum Perspective Plane (+Z Aerial Viaduct)
	 * Visualizes the elevated viaduct aerial level in sky blue tone with perspective grid.
	 * 
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 */
	#drawElevatedPlane(ctx) {
		if (!this.#viewBoxInfo || this.#viaductLift <= 0) return;
		const z = this.#viaductLift;
		const isLight = this.#currentTheme === "light";
		const opacity = this.#zPlanesOpacity;

		const margin = this.#viewBoxInfo.margin || 0;
		const xMin = this.#viewBoxInfo.minX !== undefined ? this.#viewBoxInfo.minX : -margin;
		const yMin = this.#viewBoxInfo.minY !== undefined ? this.#viewBoxInfo.minY : -margin;
		const totalW = (this.#viewBoxInfo.width || 1000) + 2 * margin;
		const totalH = (this.#viewBoxInfo.height || 1000) + 2 * margin;
		const xMax = xMin + totalW;
		const yMax = yMin + totalH;
		const gridSize = Math.max(35, Math.round(Math.min(totalW, totalH) / 22));

		const c1 = this.projectPoint(xMin, yMin, z);
		const c2 = this.projectPoint(xMax, yMin, z);
		const c3 = this.projectPoint(xMax, yMax, z);
		const c4 = this.projectPoint(xMin, yMax, z);

		ctx.save();

		// Stratum aerial wash
		ctx.fillStyle = isLight
			? `rgba(14, 165, 233, ${0.025 * opacity})`
			: `rgba(14, 165, 233, ${0.09 * opacity})`;
		ctx.beginPath();
		ctx.moveTo(c1.sx, c1.sy);
		ctx.lineTo(c2.sx, c2.sy);
		ctx.lineTo(c3.sx, c3.sy);
		ctx.lineTo(c4.sx, c4.sy);
		ctx.closePath();
		ctx.fill();

		// Stratum boundary border
		ctx.strokeStyle = isLight
			? `rgba(14, 165, 233, ${0.55 * opacity})`
			: `rgba(56, 189, 248, ${0.60 * opacity})`;
		ctx.lineWidth = 1.4;
		ctx.beginPath();
		ctx.moveTo(c1.sx, c1.sy);
		ctx.lineTo(c2.sx, c2.sy);
		ctx.lineTo(c3.sx, c3.sy);
		ctx.lineTo(c4.sx, c4.sy);
		ctx.closePath();
		ctx.stroke();

		// Stratum Level Badge
		ctx.fillStyle = isLight ? "#0284c7" : "#38bdf8";
		ctx.font = `600 10.5px Montserrat`;
		ctx.textAlign = "left";
		ctx.textBaseline = "bottom";
		ctx.fillText(`[+Z] ELEVATED VIADUCT STRATUM (+${this.#viaductLift}px)`, c1.sx + 8, c1.sy - 8);

		ctx.restore();
	}

	/**
	 * Outer Boundary Vertical Strata Columns
	 * Connects the 4 corners of -Z Subterranean, 0 Ground, and +Z Viaduct.
	 * 
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 */
	#drawVerticalZStrataGuides(ctx) {
		if (!this.#viewBoxInfo) return;
		const isLight = this.#currentTheme === "light";
		const opacity = this.#zPlanesOpacity;

		const margin = this.#viewBoxInfo.margin || 0;
		const xMin = this.#viewBoxInfo.minX !== undefined ? this.#viewBoxInfo.minX : -margin;
		const yMin = this.#viewBoxInfo.minY !== undefined ? this.#viewBoxInfo.minY : -margin;
		const totalW = (this.#viewBoxInfo.width || 1000) + 2 * margin;
		const totalH = (this.#viewBoxInfo.height || 1000) + 2 * margin;
		const xMax = xMin + totalW;
		const yMax = yMin + totalH;

		const corners = [
			{ x: xMin, y: yMin },
			{ x: xMax, y: yMin },
			{ x: xMax, y: yMax },
			{ x: xMin, y: yMax }
		];

		ctx.save();
		ctx.strokeStyle = isLight
			? `rgba(100, 116, 139, ${0.40 * opacity})`
			: `rgba(148, 163, 184, ${0.45 * opacity})`;
		ctx.lineWidth = 1.2;
		ctx.setLineDash([3, 3]);

		const bottomZ = (this.#enableZIndex && this.#undergroundDepth > 0) ? -this.#undergroundDepth : 0;
		const topZ = (this.#enableZIndex && this.#viaductLift > 0) ? this.#viaductLift : 0;

		corners.forEach((c) => {
			const pBottom = this.projectPoint(c.x, c.y, bottomZ);
			const pGround = this.projectPoint(c.x, c.y, 0);
			const pTop = this.projectPoint(c.x, c.y, topZ);

			if (bottomZ !== 0 || topZ !== 0) {
				ctx.beginPath();
				ctx.moveTo(pBottom.sx, pBottom.sy);
				ctx.lineTo(pTop.sx, pTop.sy);
				ctx.stroke();
			}

			[pBottom, pGround, pTop].forEach((pt) => {
				ctx.save();
				ctx.setLineDash([]);
				ctx.fillStyle = isLight ? "#2563eb" : "#38bdf8";
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, 2.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.restore();
			});
		});

		ctx.restore();
	}

	/**
	 * Projects a 3D subterranean point along the inverted sunlight vector onto the ground plane (Z = 0).
	 * Dynamically tracks physical sunlight angle and subterranean depth!

	/**
	 * 3D Vertical Z-Axis Altitude Ruler
	 * 
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 */
	#drawVerticalZAxisRuler(ctx) {
		if (!this.#viewBoxInfo) return;
		const isLight = this.#currentTheme === "light";
		const margin = this.#viewBoxInfo.margin || 0;
		const minX = this.#viewBoxInfo.minX !== undefined ? this.#viewBoxInfo.minX : -margin;
		const minY = this.#viewBoxInfo.minY !== undefined ? this.#viewBoxInfo.minY : -margin;
		const rx = minX + 24;
		const ry = minY + (this.#viewBoxInfo.height || 1000) - 24;

		const pTop = this.projectPoint(rx, ry, this.#viaductLift);
		const pMid = this.projectPoint(rx, ry, 0);
		const pBot = this.projectPoint(rx, ry, -this.#undergroundDepth);

		ctx.save();
		ctx.strokeStyle = isLight ? "#2563eb" : "#38bdf8";
		ctx.lineWidth = 2.5;
		ctx.beginPath();
		ctx.moveTo(pBot.sx, pBot.sy);
		ctx.lineTo(pTop.sx, pTop.sy);
		ctx.stroke();

		const ticks = [
			{ pt: pTop, label: `+Z Viaduct (+${this.#viaductLift}px / +25m)`, color: isLight ? "#0284c7" : "#38bdf8" },
			{ pt: pMid, label: `0 Ground / Street (0px / 0m)`, color: isLight ? "#475569" : "#cbd5e1" },
			{ pt: pBot, label: `-Z Subterranean (-${this.#undergroundDepth}px / -20m)`, color: isLight ? "#4f46e5" : "#a5b4fc" }
		];

		ticks.forEach((t) => {
			ctx.fillStyle = t.color;
			ctx.beginPath();
			ctx.arc(t.pt.sx, t.pt.sy, 4, 0, Math.PI * 2);
			ctx.fill();

			ctx.font = "700 11px Montserrat";
			ctx.textAlign = "left";
			ctx.textBaseline = "middle";

			const textW = ctx.measureText(t.label).width;
			ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.90)" : "rgba(15, 23, 42, 0.92)";
			ctx.fillRect(t.pt.sx + 8, t.pt.sy - 8, textW + 10, 16);

			ctx.strokeStyle = isLight ? "rgba(203, 213, 225, 0.85)" : "rgba(51, 65, 85, 0.85)";
			ctx.lineWidth = 1;
			ctx.strokeRect(t.pt.sx + 8, t.pt.sy - 8, textW + 10, 16);

			ctx.fillStyle = t.color;
			ctx.fillText(t.label, t.pt.sx + 13, t.pt.sy);
		});

		ctx.restore();
	}

	/**
	 * Upper Shadow Sunken Groove for Underground Tracks:
	 * When light hits a sunken trench, the UPPER lip is in shadow (dark),
	 * and the lower lip catches light (crisp highlight), creating a real recessed depth!
	 * 
	 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
	 */
	#drawSubterraneanTrench(ctx) {
		const stationData = this.#stationData;
		const drawn = new Set();
		const isDark = this.getThemeToken("--theme-mode", "light") === "dark";

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const z1 = this.getLayoutElevation(st1.properties?.layout);
				const z2 = this.getLayoutElevation(st2.properties?.layout);
				const isUG1 = z1 < 0;
				const isUG2 = z2 < 0;
				if (!isUG1 || !isUG2) return;

				drawn.add(key);

				const p1 = this.projectPoint(st1.xy.x, st1.xy.y, z1);
				const p2 = this.projectPoint(st2.xy.x, st2.xy.y, z2);
				const trackW = this.getTrackWidth(p1.scale);

				// 1. Recessed Trench Bed
				ctx.strokeStyle = isDark ? "rgba(15, 23, 42, 0.90)" : "rgba(226, 232, 240, 0.85)";
				ctx.lineWidth = trackW * 2.2;
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy);
				ctx.lineTo(p2.sx, p2.sy);
				ctx.stroke();

				// 2. UPPER SHADOW: The top wall casts an inner shadow into the groove!
				ctx.strokeStyle = isDark ? "rgba(0, 0, 0, 0.75)" : "rgba(15, 23, 42, 0.28)";
				ctx.lineWidth = trackW * 0.7;
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy - 3.5 * p1.scale);
				ctx.lineTo(p2.sx, p2.sy - 3.5 * p2.scale);
				ctx.stroke();

				// 3. LOWER HIGHLIGHT: The bottom wall catches the light!
				ctx.strokeStyle = isDark ? "rgba(51, 65, 85, 0.6)" : "rgba(255, 255, 255, 0.9)";
				ctx.lineWidth = trackW * 0.35;
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy + 3.5 * p1.scale);
				ctx.lineTo(p2.sx, p2.sy + 3.5 * p2.scale);
				ctx.stroke();
			});
		});

		ctx.restore();
	}

	// =========================================================================
	// 6. Station Glyphs (5 Legend Types)
	// =========================================================================

	#drawStations(ctx, stratum = "all") {
		const stationData = this.#stationData;
		const isDimmed = this.#isMapDimmed();

		const sortedList = Object.values(stationData).slice().sort((a, b) => {
			const aHover = (a.id === this.#hoverStationId || a.id === this.#exitingHoverStationId) ? 100 : 0;
			const bHover = (b.id === this.#hoverStationId || b.id === this.#exitingHoverStationId) ? 100 : 0;
			if (aHover !== bHover) return aHover - bHover;
			const aActive = (this.#activeStationId === a.id || this.#activeRouteStations.has(a.id)) ? 20 : 0;
			const bActive = (this.#activeStationId === b.id || this.#activeRouteStations.has(b.id)) ? 20 : 0;
			return aActive - bActive;
		});

		sortedList.forEach((st) => {
			if (!st.xy) return;

			const layout = st.properties?.layout || "elevated";
			const z = this.#is25D ? this.getLayoutElevation(layout) : 0;

			// Stratum layer culling for true 2.5D physical depth ordering
			if (this.#is25D && stratum !== "all") {
				const isHoverOrActive = (this.#hoverStationId === st.id || this.#exitingHoverStationId === st.id || this.#activeStationId === st.id);
				if (stratum === "underground") {
					if (z >= 0 || isHoverOrActive) return;
				} else if (stratum === "surface") {
					if (z !== 0 || isHoverOrActive) return;
				} else if (stratum === "elevated") {
					if (z <= 0 || isHoverOrActive) return;
				} else if (stratum === "top") {
					if (!isHoverOrActive) return;
				}
			}

			const pt = this.projectPoint(st.xy.x, st.xy.y, z);
			const trackW = this.getTrackWidth(pt.scale);

			const isInterchange = st.lines && st.lines.length > 1;
			const baseR = this.getStationRadius(pt.scale, isInterchange);

			let hoverAmount = 0;
			if (this.#hoverStationId === st.id) {
				hoverAmount = this.#hoverProgress;
			} else if (this.#exitingHoverStationId === st.id) {
				hoverAmount = this.#exitHoverProgress;
			}

			const stationType = this.getStationType(st);
			const stationStatus = st.properties?.status || "operational";
			const isHoverTarget = this.#hoverStationId === st.id;
			const isFocused = this.#activeStationId === st.id;
			const isRouteSt = this.#activeRouteStations.has(st.id);
			const isLineSt = this.#activeLineId && st.lines?.includes(this.#activeLineId);
			const isLayoutSt = this.#activeLayout && layout === this.#activeLayout;
			const isStatusSt = this.#activeStatus && (
				stationStatus === this.#activeStatus ||
				(this.#activeStatus === "planned" && (stationStatus === "approved" || stationStatus === "proposed" || stationStatus === "planned"))
			);
			const isTypeSt = this.#activeStationType && stationType === this.#activeStationType;
			const isActive = isHoverTarget || (hoverAmount > 0) || isFocused || isRouteSt || isLineSt || isLayoutSt || isStatusSt || isTypeSt;

			const alpha = isDimmed ? (isActive ? 1.0 : 0.22) : 1.0;
			const targetHoverR = Math.max(4.5, baseR * 1.35);
			const radius = isFocused ? targetHoverR : (baseR + (targetHoverR - baseR) * hoverAmount);
			const hoverScale = radius / baseR;

			ctx.globalAlpha = alpha;

			const firstLine = st.lines?.[0];
			const lineInfo = this.#linesData[firstLine];
			let strokeColor = lineInfo?.color || "#ffffff";

			let statusDashed = false;
			let statusDotted = false;
			if (stationStatus === "under_construction") {
				statusDashed = true;
				strokeColor = "#f59e0b";
			} else if (stationStatus === "approved" || stationStatus === "proposed") {
				statusDotted = true;
				strokeColor = "#0284c7";
			}

			const applyStatusDash = () => {
				if (statusDashed) ctx.setLineDash([trackW * 1.1, trackW * 0.8]);
				else if (statusDotted) ctx.setLineDash([trackW * 0.4, trackW * 0.6]);
				else ctx.setLineDash([]);
			};

			const baseFill = layout === "underground" ? "#f0fdf4" : "#FDFBD4";

			// 🚉 Render Glyphs adhering strictly to Legend Station Types:
			if (stationType === "walkway") {
				// 1. Walkway / Travelator (Dashed outer ring + solid center pulse dot)
				const rOuter = baseR * 1.35 * hoverScale;
				const rInner = baseR * 0.52 * hoverScale;

				ctx.fillStyle = baseFill;
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = Math.max(1.2, trackW * 0.35);
				ctx.setLineDash([trackW * 1.1, trackW * 0.75]);
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, rOuter, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();

				ctx.setLineDash([]);
				ctx.fillStyle = strokeColor;
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, rInner, 0, Math.PI * 2);
				ctx.fill();

			} else if (stationType === "multimodal") {
				// 2. Multimodal Transit Hub (Rounded Square Squircle + Glowing Violet #c084fc)
				const size = baseR * 2.3 * hoverScale;
				const offset = size / 2;
				const rx = size * 0.28;
				const rInner = baseR * 0.52 * hoverScale;

				ctx.fillStyle = baseFill;
				ctx.strokeStyle = "#c084fc";
				ctx.lineWidth = Math.max(1.2, trackW * 0.35);
				applyStatusDash();
				ctx.beginPath();
				if (typeof ctx.roundRect === "function") {
					ctx.roundRect(pt.sx - offset, pt.sy - offset, size, size, rx);
				} else {
					ctx.rect(pt.sx - offset, pt.sy - offset, size, size);
				}
				ctx.fill();
				ctx.stroke();

				ctx.setLineDash([]);
				ctx.fillStyle = "#c084fc";
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, rInner, 0, Math.PI * 2);
				ctx.fill();

			} else if (stationType === "shared_track") {
				// 3. Shared Track (Capsule Stadium Pill + 2 Tandem Dots #f43f5e)
				const w = baseR * 2.6 * hoverScale;
				const h = baseR * 1.45 * hoverScale;
				const dotR = baseR * 0.28 * hoverScale;
				const dotOffset = w * 0.24;

				ctx.fillStyle = baseFill;
				ctx.strokeStyle = "#f43f5e";
				ctx.lineWidth = Math.max(1.2, trackW * 0.35);
				applyStatusDash();
				ctx.beginPath();
				if (typeof ctx.roundRect === "function") {
					ctx.roundRect(pt.sx - w / 2, pt.sy - h / 2, w, h, h / 2);
				} else {
					ctx.rect(pt.sx - w / 2, pt.sy - h / 2, w, h);
				}
				ctx.fill();
				ctx.stroke();

				ctx.setLineDash([]);
				ctx.fillStyle = "#f43f5e";
				ctx.beginPath();
				ctx.arc(pt.sx - dotOffset, pt.sy, dotR, 0, Math.PI * 2);
				ctx.arc(pt.sx + dotOffset, pt.sy, dotR, 0, Math.PI * 2);
				ctx.fill();

			} else if (stationType === "interchange") {
				// 4. Interchange (Double Concentric Ring)
				const rOuter = baseR * 1.35 * hoverScale;
				const rInner = baseR * 0.72 * hoverScale;

				ctx.fillStyle = baseFill;
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = Math.max(1.2, trackW * 0.35);
				applyStatusDash();
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, rOuter, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();

				ctx.setLineDash([]);
				ctx.fillStyle = strokeColor;
				ctx.strokeStyle = "#ffffff";
				ctx.lineWidth = Math.max(1.0, trackW * 0.25);
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, rInner, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();

			} else {
				// 5. Normal Station (Clean Cream Circle with Line Color Border)
				const r = baseR * hoverScale;
				ctx.fillStyle = baseFill;
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = Math.max(1.2, trackW * 0.35);
				applyStatusDash();
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, r, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
			}

			ctx.setLineDash([]);
			ctx.globalAlpha = 1.0;
		});
	}

	#updateRoutePinsOverlay() {
		if (!this.#pinFromEl || !this.#pinFromEl.parentElement) {
			this.#initRoutePinsOverlay();
		}
		if (!this.#pinFromEl || !this.#pinToEl) return;

		const isVisible = this.#isRouteVisible;
		const path = (isVisible && this.#activeRoutePath) ? this.#activeRoutePath : null;
		const fromStationId = this.#routePins.from || (path && path.length > 0 ? path[0] : null);
		const toStationId = this.#routePins.to || (path && path.length > 1 ? path[path.length - 1] : null);

		this.#syncSinglePin(this.#pinFromEl, fromStationId, "from");
		this.#syncSinglePin(this.#pinToEl, (toStationId && toStationId !== fromStationId) ? toStationId : null, "to");
	}

	#syncSinglePin(pinEl, stationId, type) {
		if (!pinEl) return;
		if (!stationId) {
			pinEl.style.display = "none";
			if (type === "from") this.#lastFromStationId = null;
			else this.#lastToStationId = null;
			return;
		}

		const st = this.#stationData[stationId];
		if (!st?.xy) {
			pinEl.style.display = "none";
			return;
		}

		// Trigger entrance bounce if newly assigned
		const lastId = type === "from" ? this.#lastFromStationId : this.#lastToStationId;
		if (stationId !== lastId) {
			if (type === "from") this.#lastFromStationId = stationId;
			else this.#lastToStationId = stationId;

			const animEl = pinEl.querySelector(".pin-drop-anim");
			if (animEl) {
				animEl.style.animation = "none";
				void animEl.offsetHeight; // force reflow
				animEl.style.animation = "";
			}
		}

		// Compute structural 3D screen projection
		const layout = st.properties?.layout || "elevated";
		const z = this.#is25D ? this.getLayoutElevation(layout) : 0;
		const pt = this.projectPoint(st.xy.x, st.xy.y, z);

		// Offscreen visibility culling with generous buffer
		const rect = this.#container ? this.#container.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
		const cw = rect.width > 50 ? rect.width : window.innerWidth;
		const ch = rect.height > 50 ? rect.height : window.innerHeight;

		if (pt.sx < -120 || pt.sx > cw + 120 || pt.sy < -120 || pt.sy > ch + 120) {
			pinEl.style.display = "none";
			return;
		}

		// In pin_route_from.svg & pin_route_to.svg (viewBox="-58 -58 116 66"):
		// Ground contact point & needle tip is at (0, 0), which is exactly 50% width and 87.88% height (58 / 66).
		const scale = Math.max(0.65, Math.min(2.0, Math.pow(Math.max(0.2, this.#zoom), 0.45)));
		pinEl.style.transform = `translate3d(${Math.round(pt.sx)}px, ${Math.round(pt.sy)}px, 0) translate(-50%, -87.88%) scale(${scale})`;
		pinEl.style.display = "block";
	}

	// =========================================================================
	// 7. Station Labels (Zero Dropping / Never Hidden)
	// =========================================================================

	#drawLabels(ctx) {
		const stationData = this.#stationData;
		const isDimmed = this.#isMapDimmed();
		const effectiveScale = this.getBaseScale() * this.#zoom;
		const fontSize = Math.max(1.5, Math.min(36.0, 380 * effectiveScale));
		ctx.textBaseline = "middle";

		const themeTextPrimary = this.getThemeToken("--text-primary", "#0f172a");
		const themeCardBg = this.getThemeToken("--card-bg", "#ffffff");
		const themePrimary = this.getThemeToken("--btn-primary-bg", "#3b82f6");
		const mapFont = this.getThemeToken("--map-font", "'Montserrat', -apple-system, sans-serif");

		const occupiedBoxes = [];
		const labelsToDraw = [];

		const sortedStations = Object.values(stationData).slice().sort((a, b) => {
			const aHover = (a.id === this.#hoverStationId || a.id === this.#exitingHoverStationId) ? 100 : 0;
			const bHover = (b.id === this.#hoverStationId || b.id === this.#exitingHoverStationId) ? 100 : 0;
			if (aHover !== bHover) return bHover - aHover;

			const aActive = (this.#activeStationId === a.id || this.#activeRouteStations.has(a.id)) ? 50 : 0;
			const bActive = (this.#activeStationId === b.id || this.#activeRouteStations.has(b.id)) ? 50 : 0;
			if (aActive !== bActive) return bActive - aActive;

			const aInter = (a.lines?.length || 1) > 1 ? 25 : 0;
			const bInter = (b.lines?.length || 1) > 1 ? 25 : 0;
			return bInter - aInter;
		});

		const collidesWithAny = (box) => {
			for (let i = 0; i < occupiedBoxes.length; i++) {
				const ob = occupiedBoxes[i];
				if (!(box.x + box.w < ob.x || box.x > ob.x + ob.w ||
				      box.y + box.h < ob.y || box.y > ob.y + ob.h)) {
					return true;
				}
			}
			return false;
		};

		for (const st of sortedStations) {
			if (!st.xy) continue;

			let hoverAmount = 0;
			if (this.#hoverStationId === st.id) {
				hoverAmount = this.#hoverProgress;
			} else if (this.#exitingHoverStationId === st.id) {
				hoverAmount = this.#exitHoverProgress;
			}
			const isHovered = hoverAmount > 0.01;
			const isHoverTarget = this.#hoverStationId === st.id;
			const isFocused = this.#activeStationId === st.id;
			const isRouteSt = this.#activeRouteStations.has(st.id);
			const isLineSt = this.#activeLineId && st.lines?.includes(this.#activeLineId);
			const isLayoutSt = this.#activeLayout && (st.properties?.layout || "elevated") === this.#activeLayout;
			const isStatusSt = this.#activeStatus && (
				(st.properties?.status || "operational") === this.#activeStatus ||
				(this.#activeStatus === "planned" && ((st.properties?.status || "operational") === "approved" || (st.properties?.status || "operational") === "proposed" || (st.properties?.status || "operational") === "planned"))
			);
			const isTypeSt = this.#activeStationType && this.getStationType(st) === this.#activeStationType;
			const isSelected = isFocused || isRouteSt || Boolean(isLineSt || isLayoutSt || isStatusSt || isTypeSt);
			const isActive = isHoverTarget || isHovered || isSelected;
			const labelAlpha = isDimmed ? (isActive ? 1.0 : 0.20) : 1.0;

			const layout = st.properties?.layout || "elevated";
			const z = this.#is25D ? this.getLayoutElevation(layout) : 0;

			const pt = this.projectPoint(st.xy.x, st.xy.y, z);

			const baseFontSize = Math.max(1.5, Math.round(fontSize));
			const targetHoverFontSize = Math.max(6.0, Math.round(fontSize * 1.35));
			const curFontSize = isHovered
				? Math.round(baseFontSize + (targetHoverFontSize - baseFontSize) * hoverAmount)
				: (isSelected ? targetHoverFontSize : baseFontSize);

			ctx.font = (isHovered || isSelected)
				? `700 ${curFontSize}px ${mapFont}`
				: `600 ${curFontSize}px ${mapFont}`;

			const name = this.getStationName(st);
			const lines = MapLabelEngine.getWrappedLines(name);
			const lineSpacing = curFontSize * 1.15;
			let maxLineWidth = 0;
			for (const line of lines) {
				const w = ctx.measureText(line).width;
				if (w > maxLineWidth) maxLineWidth = w;
			}
			const textWidth = maxLineWidth;
			const textHeight = curFontSize * lines.length + (lines.length - 1) * 2;

			const trackW = this.getTrackWidth(pt.scale);
			const isInterchange = st.lines && st.lines.length > 1;
			const baseR = this.getStationRadius(pt.scale, isInterchange);
			const targetHoverR = Math.max(baseR * 1.35, baseR + 2.0);
			const r = (this.#activeStationId === st.id) ? targetHoverR : (baseR + (targetHoverR - baseR) * hoverAmount);
			const gap = Math.max(2.0, Math.min(12.0, baseR * 0.45));
			const diagOff = (r + gap) * 0.707;

			const geom = this.#labelGeomCache?.get(st.id) || {
				junctionQuad: null,
				isDiagonalTrack: false,
				isDiagonalNWSE: false,
				isHorizontalTrack: true,
				isEven: true
			};

			// Full 8-candidate placement map
			const candidateMap = {
				RIGHT: {
					align: "left",
					textX: pt.sx + r + gap,
					textY: pt.sy,
					box: { x: pt.sx + r + gap - 1, y: pt.sy - textHeight / 2 - 1, w: textWidth + 2, h: textHeight + 2 }
				},
				LEFT: {
					align: "right",
					textX: pt.sx - r - gap,
					textY: pt.sy,
					box: { x: pt.sx - r - gap - textWidth - 1, y: pt.sy - textHeight / 2 - 1, w: textWidth + 2, h: textHeight + 2 }
				},
				TOP: {
					align: "center",
					textX: pt.sx,
					textY: pt.sy - r - gap - textHeight / 2,
					box: { x: pt.sx - textWidth / 2 - 1, y: pt.sy - r - gap - textHeight - 1, w: textWidth + 2, h: textHeight + 2 }
				},
				BOTTOM: {
					align: "center",
					textX: pt.sx,
					textY: pt.sy + r + gap + textHeight / 2,
					box: { x: pt.sx - textWidth / 2 - 1, y: pt.sy + r + gap - 1, w: textWidth + 2, h: textHeight + 2 }
				},
				TR: {
					align: "left",
					textX: pt.sx + diagOff,
					textY: pt.sy - diagOff - textHeight / 2,
					box: { x: pt.sx + diagOff - 1, y: pt.sy - diagOff - textHeight - 1, w: textWidth + 2, h: textHeight + 2 }
				},
				TL: {
					align: "right",
					textX: pt.sx - diagOff,
					textY: pt.sy - diagOff - textHeight / 2,
					box: { x: pt.sx - diagOff - textWidth - 1, y: pt.sy - diagOff - textHeight - 1, w: textWidth + 2, h: textHeight + 2 }
				},
				BR: {
					align: "left",
					textX: pt.sx + diagOff,
					textY: pt.sy + diagOff + textHeight / 2,
					box: { x: pt.sx + diagOff - 1, y: pt.sy + diagOff - 1, w: textWidth + 2, h: textHeight + 2 }
				},
				BL: {
					align: "right",
					textX: pt.sx - diagOff,
					textY: pt.sy + diagOff + textHeight / 2,
					box: { x: pt.sx - diagOff - textWidth - 1, y: pt.sy + diagOff - 1, w: textWidth + 2, h: textHeight + 2 }
				}
			};

			let preferredOrder = [];
			if (geom.junctionQuad && candidateMap[geom.junctionQuad]) {
				preferredOrder = [geom.junctionQuad, "TR", "TL", "BR", "BL", "RIGHT", "LEFT", "TOP", "BOTTOM"].filter((v, i, a) => a.indexOf(v) === i);
			} else if (geom.isDiagonalTrack) {
				preferredOrder = geom.isDiagonalNWSE
					? (geom.isEven ? ["TR", "BL", "TOP", "RIGHT"] : ["BL", "TR", "BOTTOM", "LEFT"])
					: (geom.isEven ? ["TL", "BR", "TOP", "LEFT"] : ["BR", "TL", "BOTTOM", "RIGHT"]);
			} else if (geom.isHorizontalTrack) {
				preferredOrder = geom.isEven ? ["TOP", "BOTTOM", "RIGHT", "LEFT"] : ["BOTTOM", "TOP", "RIGHT", "LEFT"];
			} else {
				preferredOrder = geom.isEven ? ["LEFT", "RIGHT", "TOP", "BOTTOM"] : ["RIGHT", "LEFT", "TOP", "BOTTOM"];
			}

			// Try to find non-colliding candidate
			let chosen = null;
			for (const dir of preferredOrder) {
				const cand = candidateMap[dir];
				if (!cand) continue;
				if (!collidesWithAny(cand.box)) {
					chosen = cand;
					break;
				}
			}

			// 🛡️ ZERO DROPPING GUARANTEE: Never drop or hide any station!
			// If all candidates have partial collision, fall back to preferred direction!
			if (!chosen) {
				chosen = candidateMap[preferredOrder[0]] || candidateMap.RIGHT;
			}

			occupiedBoxes.push(chosen.box);

			let textColor = themeTextPrimary;
			if (isHovered) {
				textColor = themePrimary;
			} else if (isSelected) {
				textColor = this.#activeStationId === st.id ? "#d97706" : themePrimary;
			}

			const startY = lines.length === 1
				? chosen.textY
				: chosen.textY - (lineSpacing * (lines.length - 1)) / 2;

			labelsToDraw.push({
				chosen,
				lines,
				lineSpacing,
				curFontSize,
				mapFont,
				isHovered,
				isSelected,
				labelAlpha,
				textColor,
				startY
			});
		}

		// Two-pass rendering: standard labels first, hovered/selected labels on top!
		const renderItem = (item) => {
			ctx.globalAlpha = item.labelAlpha;
			ctx.font = (item.isHovered || item.isSelected)
				? `700 ${item.curFontSize}px ${item.mapFont}`
				: `600 ${item.curFontSize}px ${item.mapFont}`;
			ctx.textAlign = item.chosen.align;

			item.lines.forEach((lineText, idx) => {
				const yPos = item.startY + idx * item.lineSpacing;

				// Subtle halo only on hover or active selection
				if (item.isHovered || item.isSelected) {
					ctx.strokeStyle = themeCardBg;
					ctx.lineWidth = Math.max(3.0, item.curFontSize * 0.35);
					ctx.strokeText(lineText, item.chosen.textX, yPos);
				}

				ctx.fillStyle = item.textColor;
				ctx.fillText(lineText, item.chosen.textX, yPos);
			});
		};

		for (const item of labelsToDraw) {
			if (!item.isHovered && !item.isSelected) {
				renderItem(item);
			}
		}
		for (const item of labelsToDraw) {
			if (item.isHovered || item.isSelected) {
				renderItem(item);
			}
		}

		ctx.globalAlpha = 1.0;
	}

	// =========================================================================
	// 8. Interaction State Getters/Setters & Delegations (CanvasGestures)
	// =========================================================================

	get container() { return this.#container; }
	get canvas() { return this.#canvas; }
	get is25D() { return this.#is25D; }
	get stationData() { return this.#stationData; }
	get linesData() { return this.#linesData; }
	get currentTheme() { return this.#currentTheme; }
	get activeRouteEdges() { return this.#activeRouteEdges; }
	get activeRoutePath() { return this.#activeRoutePath; }
	get activeLineId() { return this.#activeLineId; }
	get activeLayout() { return this.#activeLayout; }
	get activeStatus() { return this.#activeStatus; }
	get activeStationType() { return this.#activeStationType; }
	isMapDimmed() { return this.#isMapDimmed(); }

	get zoom() { return this.#zoom; }
	set zoom(val) { this.#zoom = val; }

	get minZoom() { return this.#minZoom; }
	get maxZoom() { return this.#maxZoom; }

	get panX() { return this.#panX; }
	set panX(val) { this.#panX = val; }

	get panY() { return this.#panY; }
	set panY(val) { this.#panY = val; }

	get pitchDeg() { return this.#pitchDeg; }
	set pitchDeg(val) { this.setPitch(val); }

	get rotateDeg() { return this.#rotateDeg; }
	set rotateDeg(val) { this.setRotation(val); }

	cancelCameraAnimation() {
		this.#cameraAnim = null;
	}

	notifyTransformChange() {
		if (typeof this.onTransformChange === "function") {
			this.onTransformChange({
				zoom: this.#zoom,
				panX: this.#panX,
				panY: this.#panY,
				pitchDeg: this.#pitchDeg,
				rotateDeg: this.#rotateDeg
			});
		}
	}

	setHoverState(station, clientX = 0, clientY = 0) {
		const newId = station ? station.id : null;
		if (newId !== this.#hoverStationId) {
			if (this.#hoverStationId !== null) {
				this.#exitingHoverStationId = this.#hoverStationId;
				this.#exitHoverProgress = this.#hoverProgress;
			}
			this.#hoverStationId = newId;
			this.#hoverProgress = 0;
			this.#hoveredStation = station;
			this.requestRender();
			if (typeof this.onStationHover === "function") {
				this.onStationHover(station, clientX, clientY);
			}
		}
	}

	clearHoverState() {
		if (this.#hoverStationId !== null) {
			this.#exitingHoverStationId = this.#hoverStationId;
			this.#exitHoverProgress = this.#hoverProgress;
			this.#hoverStationId = null;
			this.#hoverProgress = 0;
			this.#hoveredStation = null;
			this.requestRender();
			if (typeof this.onStationHover === "function") {
				this.onStationHover(null, 0, 0);
			}
		}
	}

	zoomToPoint(clientX, clientY, factor) {
		if (this.#gestures) this.#gestures.zoomToPoint(clientX, clientY, factor);
	}

	setZoom(newZoom) {
		if (this.#gestures) this.#gestures.setZoom(newZoom);
	}

	getStationAtScreenPoint(clientX, clientY) {
		return this.#gestures ? this.#gestures.getStationAtScreenPoint(clientX, clientY) : null;
	}

	setRoutePin(type, stationId) {
		if (type === "from" || type === "to") {
			this.#routePins[type] = stationId;
			this.requestRender();
		}
	}

	clearRoutePins() {
		this.#routePins = { from: null, to: null };
		this.#lastFromStationId = null;
		this.#lastToStationId = null;
		if (this.#pinFromEl) this.#pinFromEl.style.display = "none";
		if (this.#pinToEl) this.#pinToEl.style.display = "none";
		this.requestRender();
	}

	toggle25D(targetEnable = null) {
		const current = this.#is25D;
		const next = targetEnable !== null ? Boolean(targetEnable) : !current;
		if (next === current && !this.#cameraAnim) return this.#is25D;

		if (next) {
			// Transitioning 2D -> 2.5D: Smooth cinematic tilt from 0° up to 48°
			this.#is25D = true;
			this.#pitchDeg = 0;
			this.#rotateDeg = 0;
			const targetZoom = Math.max(1.4, Math.min(2.0, this.#zoom * 1.35));

			this.#cameraAnim = {
				startZoom: this.#zoom,
				targetZoom,
				startPanX: this.#panX,
				targetPanX: this.#panX,
				startPanY: this.#panY,
				targetPanY: this.#panY,
				startPitch: 0,
				targetPitch: 48,
				startRotate: 0,
				targetRotate: 0,
				startTime: performance.now(),
				duration: 650
			};
		} else {
			// Transitioning 2.5D -> 2D: Smooth cinematic tilt down to 0°
			const currentPitch = this.#pitchDeg;
			const currentRot = this.#rotateDeg;
			const targetZoom = Math.min(1.0, this.#zoom / 1.35);

			this.#cameraAnim = {
				startZoom: this.#zoom,
				targetZoom,
				startPanX: this.#panX,
				targetPanX: 0,
				startPanY: this.#panY,
				targetPanY: 0,
				startPitch: currentPitch,
				targetPitch: 0,
				startRotate: currentRot,
				targetRotate: 0,
				startTime: performance.now(),
				duration: 650,
				onComplete: () => {
					this.#is25D = false;
					this.#pitchDeg = 48;
					this.#rotateDeg = 0;
					this.requestRender();
					this.notifyTransformChange();
				}
			};
		}

		this.requestRender();
		return next;
	}

	// =========================================================================
	// 9. Public API Methods
	// =========================================================================

	focusStation(stationId, targetZoom = null) {
		const st = this.#stationData[stationId];
		if (!st?.xy || !this.#container) return;

		this.#activeStationId = stationId;

		const baseScale = this.getBaseScale();
		const { cx, cy } = this.getNetworkCenter();

		let resolvedTarget = targetZoom;
		if (resolvedTarget == null) {
			const zoomRange = MapGeometry.calculateZoomRange(this.#bounds);
			resolvedTarget = zoomRange.stationFocusZoom || 2.4;
		}

		const endZoom = Math.max(resolvedTarget, this.#zoom);
		const effectiveScale = baseScale * endZoom;

		const targetPanX = -(st.xy.x - cx) * effectiveScale;
		const targetPanY = -(st.xy.y - cy) * effectiveScale;

		this.#cameraAnim = {
			startZoom: this.#zoom,
			targetZoom: endZoom,
			startPanX: this.#panX,
			targetPanX,
			startPanY: this.#panY,
			targetPanY,
			startTime: performance.now(),
			duration: 500
		};
		this.requestRender();
	}

	clearStationHighlight() {
		this.#activeStationId = null;
		this.requestRender();
	}

	highlightRoute(path) {
		if (!Array.isArray(path) || path.length === 0) {
			this.clearRouteHighlight();
			return;
		}

		this.#activeRoutePath = path;
		this.#isRouteVisible = true;
		this.#activeRouteStations = new Set(path);
		this.#activeRouteEdges = new Set();

		for (let i = 0; i < path.length - 1; i++) {
			this.#activeRouteEdges.add([path[i], path[i + 1]].sort().join("-"));
		}

		this.requestRender();
	}

	toggleRouteVisibility() {
		if (!this.#activeRoutePath || this.#activeRoutePath.length === 0) return false;
		this.#isRouteVisible = !this.#isRouteVisible;
		if (this.#isRouteVisible) {
			this.#activeRouteStations = new Set(this.#activeRoutePath);
			this.#activeRouteEdges = new Set();
			for (let i = 0; i < this.#activeRoutePath.length - 1; i++) {
				this.#activeRouteEdges.add([this.#activeRoutePath[i], this.#activeRoutePath[i + 1]].sort().join("-"));
			}
		} else {
			this.#activeRouteStations.clear();
			this.#activeRouteEdges.clear();
		}
		this.requestRender();
		return this.#isRouteVisible;
	}

	clearRouteHighlight() {
		this.#activeRoutePath = null;
		this.#isRouteVisible = false;
		this.#activeRouteEdges.clear();
		this.#activeRouteStations.clear();
		this.clearRoutePins();
		this.requestRender();
	}

	highlightLine(lineId) {
		this.#activeLineId = this.#activeLineId === lineId ? null : lineId;
		this.requestRender();
		return this.#activeLineId;
	}

	clearLineHighlight() {
		this.#activeLineId = null;
		this.requestRender();
	}

	highlightStatus(status) {
		this.#activeStatus = this.#activeStatus === status ? null : status;
		this.requestRender();
		return this.#activeStatus;
	}

	clearStatusHighlight() {
		this.#activeStatus = null;
		this.requestRender();
	}

	highlightStationType(type) {
		this.#activeStationType = this.#activeStationType === type ? null : type;
		this.requestRender();
		return this.#activeStationType;
	}

	clearStationTypeHighlight() {
		this.#activeStationType = null;
		this.requestRender();
	}

	highlightLayout(layout) {
		this.#activeLayout = this.#activeLayout === layout ? null : layout;
		this.requestRender();
		return this.#activeLayout;
	}

	clearLayoutHighlight() {
		this.#activeLayout = null;
		this.requestRender();
	}

	clearFilterHighlights() {
		this.#activeStationId = null;
		this.#activeLineId = null;
		this.#activeStatus = null;
		this.#activeStationType = null;
		this.#activeLayout = null;
		this.requestRender();
	}

	clearAllHighlights() {
		this.#activeRoutePath = null;
		this.#isRouteVisible = false;
		this.#activeRouteEdges.clear();
		this.#activeRouteStations.clear();
		this.#activeStationId = null;
		this.#activeLineId = null;
		this.#activeStatus = null;
		this.#activeStationType = null;
		this.#activeLayout = null;
		this.clearRoutePins();
		this.requestRender();
	}

	getHighlightState() {
		return {
			activeRoutePath: this.#activeRoutePath,
			isRouteVisible: this.#isRouteVisible,
			activeStationId: this.#activeStationId,
			activeLineId: this.#activeLineId,
			activeStatus: this.#activeStatus,
			activeStationType: this.#activeStationType,
			activeLayout: this.#activeLayout,
		};
	}

	setLanguage(lang) {
		this.#currentLang = lang;
		this.requestRender();
	}

	setTheme(theme) {
		this.#currentTheme = theme;
		this.requestRender();
	}

	destroy() {
		if (this.#gestures) {
			this.#gestures.destroy();
			this.#gestures = null;
		}
		if (this.#rAF) {
			cancelAnimationFrame(this.#rAF);
			this.#rAF = null;
		}
		if (this._resizeObserver) {
			this._resizeObserver.disconnect();
			this._resizeObserver = null;
		}
		if (this._themeObserver) {
			this._themeObserver.disconnect();
			this._themeObserver = null;
		}
		if (this.#routePinsOverlay) {
			this.#routePinsOverlay.remove();
			this.#routePinsOverlay = null;
			this.#pinFromEl = null;
			this.#pinToEl = null;
		}
		if (this.#container) {
			this.#container.innerHTML = "";
		}
	}
}
