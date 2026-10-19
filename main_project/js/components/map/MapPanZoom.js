/**
 * 🔍 MapPanZoom.js - Interactive Pan, Zoom, Pinch & Gliding Engine
 * Responsible for mouse panning, touch pinch-to-zoom, scroll wheel zoom to cursor,
 * 60 FPS ease-out animations, zoom controls UI, and delegated hover/click events.
 */

import { createDOMFromMap } from "../dom-builder.js";
import { centerClass } from "../../core/CenterClass.js";
import { eventBus } from "../../core/event-bus.js";
import { MapGeometry } from "./MapGeometry.js";

export class MapPanZoom {
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

	#pan = {
		panX: 0,
		panY: 0,
		isPanning: false,
		startX: 0,
		startY: 0,
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
		mapContainer,
		svgElement,
		mainGroup,
		metroData,
		zoomRange,
		onStationClick,
		onStationHover,
		abortSignal,
	}) {
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

		this.#initZoomControls(abortSignal);
		this.#initMouseEvents(abortSignal);
		this.#initTouchEvents(abortSignal);
		this.#initWheelEvents(abortSignal);
		this.#initDelegatedInteractions(abortSignal);
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
				oth_att: { title: centerClass.t("map.controls.zoomIn") },
				html_con: "+",
				parent: "zoomControls",
			},
			zoomOutBtn: {
				type: "button",
				id: "zoomOutBtn",
				cls: "zoom-btn",
				oth_att: { title: centerClass.t("map.controls.zoomOut") },
				html_con: "-",
				parent: "zoomControls",
			},
			resetZoomBtn: {
				type: "button",
				id: "resetZoomBtn",
				cls: "zoom-btn",
				oth_att: { title: centerClass.t("map.controls.resetZoom") },
				html_con: "=",
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
					if (event.target.id === "zoomInBtn") {
						const next = this.zoomScale * 1.3;
						this.zoomScale = Math.min(this.#maxZoom, Math.round(next * 100) / 100);
						this.updateZoomTransform();
					} else if (event.target.id === "zoomOutBtn") {
						const next = this.zoomScale / 1.3;
						this.zoomScale = Math.max(this.#minZoom, Math.round(next * 100) / 100);
						this.updateZoomTransform();
					} else if (event.target.id === "resetZoomBtn") {
						this.zoomScale = 1;
						this.#pan.panX = 0;
						this.#pan.panY = 0;
						this.updateZoomTransform();
					}
				},
				{ signal },
			);
		}
	}

	// =========================================================================
	// Mouse & Dragging Events
	// =========================================================================

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
				svg.style.cursor = "grabbing";

				const svgPt = MapGeometry.getSVGCoordinates(svg, e.clientX, e.clientY);
				this.#pan.startX = svgPt.x - this.#pan.panX;
				this.#pan.startY = svgPt.y - this.#pan.panY;
			},
			{ signal },
		);

		window.addEventListener(
			"mousemove",
			(e) => {
				if (!this.#pan.isPanning) return;

				const svgPt = MapGeometry.getSVGCoordinates(svg, e.clientX, e.clientY);
				this.#pan.panX = svgPt.x - this.#pan.startX;
				this.#pan.panY = svgPt.y - this.#pan.startY;

				this.updateZoomTransform();
			},
			{ signal },
		);

		window.addEventListener(
			"mouseup",
			() => {
				this.#pan.isPanning = false;
				svg.style.cursor = "grab";
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
					const touch = e.touches[0];
					const svgPt = MapGeometry.getSVGCoordinates(svg, touch.clientX, touch.clientY);
					this.#pan.startX = svgPt.x - this.#pan.panX;
					this.#pan.startY = svgPt.y - this.#pan.panY;
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
					const svgPt = MapGeometry.getSVGCoordinates(svg, touch.clientX, touch.clientY);
					this.#pan.panX = svgPt.x - this.#pan.startX;
					this.#pan.panY = svgPt.y - this.#pan.startY;
					this.updateZoomTransform();
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
					this.updateZoomTransform();
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

				this.updateZoomTransform();
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
