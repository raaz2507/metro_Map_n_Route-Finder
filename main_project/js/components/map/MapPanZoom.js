/**
 * 🔍 MapPanZoom.js - Interactive Pan, Zoom, Pinch & Gliding Engine
 * Responsible for mouse panning, touch pinch-to-zoom, scroll wheel zoom to cursor,
 * 60 FPS ease-out animations, zoom controls UI, and delegated hover/click events.
 */

import { createDOMFromMap } from "../dom-builder.js";
import { eventBus } from "../../core/event-bus.js";
import { MapGeometry } from "./MapGeometry.js";

export class MapPanZoom {
	#centerClass = null;
	#mapContainer = null;
	#svgElement = null;
	#mainGroup = null;
	#stationsCircleGroup = null;
	#labelGroup = null;
	#metroData = null;
	#onStationClick = null;
	#onStationHover = null;
	#abortController = null;

	#minZoom = 0.4;
	#maxZoom = 30.0;
	#stationFocusZoom = 2.8;
	#is25DMode = false;
	#lastLodActive = null;

	#pan = {
		panX: 0,
		panY: 0,
		isPanning: false,
		startX: 0,
		startY: 0,
		lastClientX: 0,
		lastClientY: 0,
		invA: 1,
		invB: 0,
		invC: 0,
		invD: 1,
		initialPinchDist: null,
		initialZoom: 1,
		pinchCx: 0,
		pinchCy: 0,
	};
	#panAnimFrame = null;
	#elements = {
		zoomControls: null,
		zoomLevel: null,
	};

	zoomScale = 1;

	constructor({
		centerClass = null,
		mapContainer,
		svgElement,
		mainGroup,
		metroData,
		zoomRange,
		onStationClick,
		onStationHover,
		abortSignal,
	}) {
		this.#centerClass = centerClass;
		this.#mapContainer = mapContainer;
		this.#svgElement = svgElement;
		this.#mainGroup = mainGroup;
		this.#metroData = metroData;
		this.#onStationClick = onStationClick;
		this.#onStationHover = onStationHover;

		if (zoomRange) {
			if (zoomRange.minZoom) this.#minZoom = zoomRange.minZoom;
			if (zoomRange.maxZoom) this.#maxZoom = zoomRange.maxZoom;
			if (zoomRange.stationFocusZoom) this.#stationFocusZoom = zoomRange.stationFocusZoom;
		}

		try {
			const savedMode = localStorage.getItem("metro_map_view_mode");
			if (savedMode === "2.5d") {
				this.#is25DMode = true;
				this.#mapContainer?.classList.add("is-25d-view");
				this.zoomScale = 2.2;
				const center = this.#getNetworkCenter();
				if (center) {
					this.#pan.panX = center.cx - center.cx * 2.2;
					this.#pan.panY = center.cy - center.cy * 2.2;
				}
			}
		} catch (e) {}

		this.#initZoomControls(abortSignal);
		this.#initMouseEvents(abortSignal);
		this.#initTouchEvents(abortSignal);
		this.#initWheelEvents(abortSignal);
		this.#initDelegatedInteractions(abortSignal);
	}

	#getNetworkCenter() {
		if (!this.#metroData?.stationData) return null;
		const bounds = MapGeometry.getBounds(this.#metroData.stationData);
		const { width, height } = MapGeometry.calculateSVGSize(bounds);
		return { cx: width / 2, cy: height / 2 };
	}

	get is25DMode() {
		return this.#is25DMode;
	}

	toggle25DMode(enable = null, save = true) {
		this.#is25DMode = enable !== null ? Boolean(enable) : !this.#is25DMode;

		if (this.#mapContainer) {
			if (this.#is25DMode) {
				this.#mapContainer.classList.add("is-25d-view");
			} else {
				this.#mapContainer.classList.remove("is-25d-view");
			}
		}

		const btn = this.#elements.zoomControls?.querySelector("#toggle25DBtn");
		if (btn) {
			if (this.#is25DMode) {
				btn.classList.add("active");
				btn.textContent = "2D";
				btn.title = this.#centerClass?.t("map.controls.view2D") || "Switch to 2D Flat Mode";
			} else {
				btn.classList.remove("active");
				btn.textContent = "2.5D";
				btn.title = this.#centerClass?.t("map.controls.view25D") || "Switch to 2.5D Perspective Mode";
			}
		}

		if (save) {
			try {
				localStorage.setItem("metro_map_view_mode", this.#is25DMode ? "2.5d" : "2d");
			} catch (e) {}
		}

		// 🎯 Step 2: Auto-focus & Readable Zoom in 2.5D mode
		if (this.#is25DMode) {
			if (this.zoomScale < 1.8) {
				const center = this.#getNetworkCenter();
				const targetZoom = Math.min(2.2, this.#maxZoom);
				if (center) {
					const targetPanX = center.cx - center.cx * targetZoom;
					const targetPanY = center.cy - center.cy * targetZoom;
					this.animatePanAndZoom(targetPanX, targetPanY, targetZoom, 500);
				} else {
					this.zoomScale = targetZoom;
					this.updateZoomTransform();
				}
			} else {
				this.updateZoomTransform();
			}
		} else {
			if (Math.abs(this.zoomScale - 2.2) < 0.1) {
				this.animatePanAndZoom(0, 0, 1.0, 450);
			} else {
				this.updateZoomTransform();
			}
		}

		eventBus.emit("MAP_VIEW_MODE_CHANGED", { is25D: this.#is25DMode });
	}

	get minZoom() {
		return this.#minZoom;
	}

	get maxZoom() {
		return this.#maxZoom;
	}

	get stationFocusZoom() {
		return this.#stationFocusZoom;
	}

	setZoomRange(range = {}) {
		if (range.minZoom) this.#minZoom = range.minZoom;
		if (range.maxZoom) this.#maxZoom = range.maxZoom;
		if (range.stationFocusZoom) this.#stationFocusZoom = range.stationFocusZoom;
	}

	setLayers({ stationsCircleGroup, labelGroup }) {
		this.#stationsCircleGroup = stationsCircleGroup;
		this.#labelGroup = labelGroup;
	}

	get panX() {
		return this.#pan.panX;
	}

	set panX(val) {
		this.#pan.panX = val;
	}

	get panY() {
		return this.#pan.panY;
	}

	set panY(val) {
		this.#pan.panY = val;
	}

	// =========================================================================
	// UI Zoom Controls
	// =========================================================================

	#initZoomControls(signal) {
		const elemtMap = {
			zoomLevel: {
				type: "output",
				id: "zoomLevel",
				cls: "zoom-indicator",
				oth_att: { for: "zoomInBtn zoomOutBtn resetZoomBtn" },
				html_con: `${Math.round(this.zoomScale * 100)}%`,
				parent: "zoomControls",
			},
			zoomControls: {
				type: "div",
				id: "zoomControls",
				cls: "metro-zoom-container",
				oth_att: {},
			},
			zoomInBtn: {
				type: "button",
				id: "zoomInBtn",
				cls: "zoom-btn",
				oth_att: { title: this.#centerClass?.t("map.controls.zoomIn") || "Zoom In" },
				html_con: "+",
				parent: "zoomControls",
			},
			zoomOutBtn: {
				type: "button",
				id: "zoomOutBtn",
				cls: "zoom-btn",
				oth_att: { title: this.#centerClass?.t("map.controls.zoomOut") || "Zoom Out" },
				html_con: "-",
				parent: "zoomControls",
			},
			resetZoomBtn: {
				type: "button",
				id: "resetZoomBtn",
				cls: "zoom-btn",
				oth_att: { title: this.#centerClass?.t("map.controls.resetZoom") || "Reset Zoom" },
				html_con: "=",
				parent: "zoomControls",
			},
			toggle25DBtn: {
				type: "button",
				id: "toggle25DBtn",
				cls: `zoom-btn view-mode-btn${this.#is25DMode ? " active" : ""}`,
				oth_att: { title: this.#is25DMode ? (this.#centerClass?.t("map.controls.view2D") || "Switch to 2D Flat Mode") : (this.#centerClass?.t("map.controls.view25D") || "Switch to 2.5D Perspective Mode") },
				html_con: this.#is25DMode ? "2D" : "2.5D",
				parent: "zoomControls",
			},
		};

		const zoomElemts = createDOMFromMap(elemtMap, this.#mapContainer);
		this.#elements.zoomControls = zoomElemts.zoomControls;
		this.#elements.zoomLevel = zoomElemts.zoomLevel;

		if (this.#elements.zoomControls) {
			this.#elements.zoomControls.addEventListener(
				"click",
				(event) => {
					const btn = event.target.closest("button");
					if (!btn) return;

					if (btn.id === "zoomInBtn") {
						const next = this.zoomScale * 1.3;
						this.zoomScale = Math.min(this.#maxZoom, Math.round(next * 100) / 100);
						this.updateZoomTransform();
					} else if (btn.id === "zoomOutBtn") {
						const next = this.zoomScale / 1.3;
						this.zoomScale = Math.max(this.#minZoom, Math.round(next * 100) / 100);
						this.updateZoomTransform();
					} else if (btn.id === "resetZoomBtn") {
						this.zoomScale = 1;
						this.#pan.panX = 0;
						this.#pan.panY = 0;
						this.updateZoomTransform();
					} else if (btn.id === "toggle25DBtn") {
						this.toggle25DMode();
					}
				},
				{ signal },
			);
		}
	}

	// =========================================================================
	// Mouse & Dragging Events
	// =========================================================================

	#scheduleTransformUpdate() {
		if (this.#panAnimFrame) return;
		this.#panAnimFrame = requestAnimationFrame(() => {
			this.#panAnimFrame = null;
			this.updateZoomTransform();
		});
	}

	#initMouseEvents(signal) {
		const svg = this.#svgElement;
		if (!svg) return;

		svg.addEventListener(
			"mousedown",
			(e) => {
				if (this.#panAnimFrame) {
					cancelAnimationFrame(this.#panAnimFrame);
					this.#panAnimFrame = null;
				}
				this.#pan.isPanning = true;
				this.#mapContainer?.classList.add("is-panning");
				svg.style.cursor = "grabbing";

				const inv = svg.getScreenCTM()?.inverse();
				if (inv) {
					this.#pan.invA = inv.a;
					this.#pan.invB = inv.b;
					this.#pan.invC = inv.c;
					this.#pan.invD = inv.d;
				}
				this.#pan.lastClientX = e.clientX;
				this.#pan.lastClientY = e.clientY;
			},
			{ signal },
		);

		window.addEventListener(
			"mousemove",
			(e) => {
				if (!this.#pan.isPanning) return;

				const deltaX = e.clientX - this.#pan.lastClientX;
				const deltaY = e.clientY - this.#pan.lastClientY;
				this.#pan.lastClientX = e.clientX;
				this.#pan.lastClientY = e.clientY;

				this.#pan.panX += deltaX * this.#pan.invA + deltaY * this.#pan.invC;
				this.#pan.panY += deltaX * this.#pan.invB + deltaY * this.#pan.invD;

				this.#scheduleTransformUpdate();
			},
			{ signal },
		);

		window.addEventListener(
			"mouseup",
			() => {
				if (!this.#pan.isPanning) return;
				this.#pan.isPanning = false;
				this.#mapContainer?.classList.remove("is-panning");
				svg.style.cursor = "grab";
				if (this.#panAnimFrame) {
					cancelAnimationFrame(this.#panAnimFrame);
					this.#panAnimFrame = null;
				}
				this.updateZoomTransform();
			},
			{ signal },
		);
	}

	// =========================================================================
	// Touch & Pinch Events (Mobile Support)
	// =========================================================================

	#initTouchEvents(signal) {
		const svg = this.#svgElement;
		if (!svg) return;

		svg.addEventListener(
			"touchstart",
			(e) => {
				if (this.#panAnimFrame) {
					cancelAnimationFrame(this.#panAnimFrame);
					this.#panAnimFrame = null;
				}
				if (e.touches.length === 1) {
					this.#pan.isPanning = true;
					this.#mapContainer?.classList.add("is-panning");
					const touch = e.touches[0];
					const inv = svg.getScreenCTM()?.inverse();
					if (inv) {
						this.#pan.invA = inv.a;
						this.#pan.invB = inv.b;
						this.#pan.invC = inv.c;
						this.#pan.invD = inv.d;
					}
					this.#pan.lastClientX = touch.clientX;
					this.#pan.lastClientY = touch.clientY;
				} else if (e.touches.length === 2) {
					this.#pan.isPanning = false;
					const dx = e.touches[0].clientX - e.touches[1].clientX;
					const dy = e.touches[0].clientY - e.touches[1].clientY;
					this.#pan.initialPinchDist = Math.hypot(dx, dy);
					this.#pan.initialZoom = this.zoomScale;
					const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
					const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
					const svgPt = MapGeometry.getSVGCoordinates(svg, cx, cy);
					this.#pan.pinchCx = svgPt.x;
					this.#pan.pinchCy = svgPt.y;
				}
			},
			{ passive: false, signal },
		);

		svg.addEventListener(
			"touchmove",
			(e) => {
				if (e.touches.length === 1 && this.#pan.isPanning) {
					const touch = e.touches[0];
					const deltaX = touch.clientX - this.#pan.lastClientX;
					const deltaY = touch.clientY - this.#pan.lastClientY;
					this.#pan.lastClientX = touch.clientX;
					this.#pan.lastClientY = touch.clientY;

					this.#pan.panX += deltaX * this.#pan.invA + deltaY * this.#pan.invC;
					this.#pan.panY += deltaX * this.#pan.invB + deltaY * this.#pan.invD;
					this.#scheduleTransformUpdate();
				} else if (e.touches.length === 2 && this.#pan.initialPinchDist) {
					e.preventDefault();
					const dx = e.touches[0].clientX - e.touches[1].clientX;
					const dy = e.touches[0].clientY - e.touches[1].clientY;
					const dist = Math.hypot(dx, dy);
					const scale = dist / this.#pan.initialPinchDist;
					let newZoom = this.#pan.initialZoom * scale;
					newZoom = Math.max(this.#minZoom, Math.min(newZoom, this.#maxZoom));

					this.#pan.panX = this.#pan.pinchCx - (this.#pan.pinchCx - this.#pan.panX) * (newZoom / this.zoomScale);
					this.#pan.panY = this.#pan.pinchCy - (this.#pan.pinchCy - this.#pan.panY) * (newZoom / this.zoomScale);
					this.zoomScale = newZoom;
					this.#scheduleTransformUpdate();
				}
			},
			{ passive: false, signal },
		);

		svg.addEventListener(
			"touchend",
			(e) => {
				if (e.touches.length < 2) {
					this.#pan.initialPinchDist = null;
				}
				if (e.touches.length === 0) {
					this.#pan.isPanning = false;
					this.#mapContainer?.classList.remove("is-panning");
					if (this.#panAnimFrame) {
						cancelAnimationFrame(this.#panAnimFrame);
						this.#panAnimFrame = null;
					}
					this.updateZoomTransform();
				}
			},
			{ signal },
		);
	}

	// =========================================================================
	// Scroll Wheel Zoom to Cursor
	// =========================================================================

	#initWheelEvents(signal) {
		const svg = this.#svgElement;
		if (!svg) return;

		svg.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault();
				if (this.#panAnimFrame) {
					cancelAnimationFrame(this.#panAnimFrame);
					this.#panAnimFrame = null;
				}

				const mousePt = MapGeometry.getSVGCoordinates(svg, e.clientX, e.clientY);
				const oldZoom = this.zoomScale;
				const factor = e.deltaY < 0 ? 1.15 : 0.87;
				let newZoom = this.zoomScale * factor;
				newZoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, newZoom));

				this.#pan.panX = mousePt.x - (mousePt.x - this.#pan.panX) * (newZoom / oldZoom);
				this.#pan.panY = mousePt.y - (mousePt.y - this.#pan.panY) * (newZoom / oldZoom);
				this.zoomScale = newZoom;

				this.#scheduleTransformUpdate();
			},
			{ signal, passive: false },
		);
	}

	// =========================================================================
	// Delegated Interactions (Hover & Click)
	// =========================================================================

	#initDelegatedInteractions(signal) {
		const mainLayer = this.#mainGroup;
		if (!mainLayer) return;

		const handleHover = (e, isHovered) => {
			const target = e.target.closest("[data-station-id]");
			if (!target) return;
			const stationId = target.dataset.stationId;
			if (!stationId) return;

			const circleNode = this.#stationsCircleGroup?.querySelector(`[data-station-id="${stationId}"]`);
			const textNode = this.#labelGroup?.querySelector(`text[data-station-id="${stationId}"]`);

			if (isHovered) {
				if (circleNode) circleNode.classList.add("hovered-circle");
				if (textNode) textNode.classList.add("hovered-text");
			} else {
				if (circleNode) circleNode.classList.remove("hovered-circle");
				if (textNode) textNode.classList.remove("hovered-text");
			}

			if (typeof this.#onStationHover === "function") {
				this.#onStationHover(stationId, isHovered);
			}
		};

		mainLayer.addEventListener("mouseover", (e) => handleHover(e, true), { signal });
		mainLayer.addEventListener("mouseout", (e) => handleHover(e, false), { signal });

		mainLayer.addEventListener(
			"click",
			(e) => {
				if (this.#pan.isPanning) return;
				const target = e.target.closest("[data-station-id]");
				if (!target) return;
				const stationId = target.dataset.stationId;
				if (!stationId) return;

				if (typeof this.#onStationClick === "function") {
					const st = this.#metroData?.stationData?.[stationId];
					this.#onStationClick({
						stationId,
						x: st?.xy?.x ?? 0,
						y: st?.xy?.y ?? 0,
					});
				}
			},
			{ signal },
		);
	}

	// =========================================================================
	// Transform & Animation Methods
	// =========================================================================

	/**
	 * Apply current pan and zoom to SVG main group and sync UI indicator
	 */
	updateZoomTransform() {
		if (this.#mainGroup) {
			this.#mainGroup.setAttribute(
				"transform",
				`translate(${this.#pan.panX}, ${this.#pan.panY}) scale(${this.zoomScale})`,
			);

			if (this.#elements.zoomLevel) {
				this.#elements.zoomLevel.textContent = `${Math.round(this.zoomScale * 100)}%`;
			}

			// 🚀 Dynamic Mobile Level-Of-Detail (LOD): Hide minor station labels when zoomed out to save 75% GPU text rasterizer memory
			if (this.#labelGroup) {
				const isLODActive = this.#is25DMode ? this.zoomScale < 1.25 : this.zoomScale < 0.75;
				if (this.#lastLodActive !== isLODActive) {
					this.#lastLodActive = isLODActive;
					this.#labelGroup.classList.toggle("lod-zoomed-out", isLODActive);
				}
			}

			eventBus.emit("MAP_TRANSFORM_CHANGED", {
				panX: this.#pan.panX,
				panY: this.#pan.panY,
				zoomScale: this.zoomScale,
			});
		}
	}

	/**
	 * 🚀 60 FPS Quartic Ease-Out Gliding Engine
	 * @param {number} targetPanX
	 * @param {number} targetPanY
	 * @param {number} targetZoom
	 * @param {number} [duration=450]
	 */
	animatePanAndZoom(targetPanX, targetPanY, targetZoom, duration = 450) {
		if (this.#panAnimFrame) {
			cancelAnimationFrame(this.#panAnimFrame);
			this.#panAnimFrame = null;
		}

		const startPanX = this.#pan.panX;
		const startPanY = this.#pan.panY;
		const startZoom = this.zoomScale;
		const startTime = performance.now();

		const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

		const step = (currentTime) => {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const ease = easeOutQuart(progress);

			this.#pan.panX = startPanX + (targetPanX - startPanX) * ease;
			this.#pan.panY = startPanY + (targetPanY - startPanY) * ease;
			this.zoomScale = startZoom + (targetZoom - startZoom) * ease;

			this.updateZoomTransform();

			if (progress < 1) {
				this.#panAnimFrame = requestAnimationFrame(step);
			} else {
				this.#panAnimFrame = null;
			}
		};

		this.#panAnimFrame = requestAnimationFrame(step);
	}

	destroy() {
		if (this.#panAnimFrame) {
			cancelAnimationFrame(this.#panAnimFrame);
			this.#panAnimFrame = null;
		}
	}
}
