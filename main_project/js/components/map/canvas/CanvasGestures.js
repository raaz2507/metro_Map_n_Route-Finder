/**
 * 🖐️ CanvasGestures.js - High-Performance 120 FPS Interaction Controller
 * Handles Pan (drag), Pinch-to-Zoom, Wheel Zoom, 3D Orbiting (Mouse & Touch), and Hover Detection
 * for CanvasRenderer with zero UI blocking. Fully DRY, unified event architecture.
 */

import { APP_CONFIG } from "../../../config/app-config.js";

export class CanvasGestures {
	#renderer = null;
	#canvas = null;
	#container = null;
	#abortController = null;

	// Dragging & Orbiting State
	#isDragging = false;
	#dragDownX = 0;
	#dragDownY = 0;
	#isDragMoved = false;
	#startX = 0;
	#startY = 0;

	#isOrbiting = false;
	#orbitStartX = 0;
	#orbitStartY = 0;

	#lastTouchDist = null;
	#lastTouchAngle = null;
	#lastTouchMidY = null;

	/**
	 * @param {import('./CanvasRenderer.js').CanvasRenderer} renderer
	 * @param {HTMLCanvasElement} canvas
	 * @param {HTMLElement} container
	 */
	constructor(renderer, canvas, container) {
		this.#renderer = renderer;
		this.#canvas = canvas;
		this.#container = container;
		this.#abortController = new AbortController();

		this.#bindEvents();
	}

	#bindEvents() {
		const canvas = this.#canvas;
		const signal = this.#abortController.signal;

		// 1. Prevent context menu in 2.5D orbiting mode
		canvas.addEventListener("contextmenu", (e) => {
			if (this.#renderer.is25D) e.preventDefault();
		}, { signal });

		// 2. Mouse Down (Left click for pan, Right click / Shift+Left for 3D Orbit)
		canvas.addEventListener("mousedown", (e) => {
			this.#renderer.cancelCameraAnimation();
			if ((e.button === 2 || e.shiftKey) && this.#renderer.is25D) {
				this.#isOrbiting = true;
				this.#orbitStartX = e.clientX;
				this.#orbitStartY = e.clientY;
				this.#container.classList.add("is-panning");
			} else if (e.button === 0) {
				this.#isDragging = true;
				this.#dragDownX = e.clientX;
				this.#dragDownY = e.clientY;
				this.#isDragMoved = false;
				this.#startX = e.clientX - this.#renderer.panX;
				this.#startY = e.clientY - this.#renderer.panY;
				this.#container.classList.add("is-panning");
			}
		}, { signal });

		// 3. Mouse Move on window
		window.addEventListener("mousemove", (e) => {
			if (this.#isOrbiting && this.#renderer.is25D) {
				const deltaX = e.clientX - this.#orbitStartX;
				const deltaY = e.clientY - this.#orbitStartY;
				this.#applyOrbit(deltaX * 0.4, deltaY * 0.4);
				this.#orbitStartX = e.clientX;
				this.#orbitStartY = e.clientY;
			} else if (this.#isDragging) {
				if (!this.#isDragMoved && Math.hypot(e.clientX - this.#dragDownX, e.clientY - this.#dragDownY) > 5) {
					this.#isDragMoved = true;
				}
				this.#applyPan(e.clientX, e.clientY);
			} else {
				this.checkStationHover(e.clientX, e.clientY);
			}
		}, { signal });

		// 4. Mouse Up on window
		window.addEventListener("mouseup", () => {
			if (this.#isOrbiting) {
				this.#isOrbiting = false;
				this.#container.classList.remove("is-panning");
			}
			if (this.#isDragging) {
				this.#isDragging = false;
				this.#container.classList.remove("is-panning");
				this.#renderer.notifyTransformChange();
			}
		}, { signal });

		// 5. Mouse Leave canvas
		canvas.addEventListener("mouseleave", () => {
			this.#renderer.clearHoverState();
		}, { signal });

		// 6. Smooth Mouse Wheel Zoom
		canvas.addEventListener("wheel", (e) => {
			e.preventDefault();
			this.#renderer.cancelCameraAnimation();
			const factor = e.deltaY < 0 ? 1.15 : 0.87;
			this.zoomToPoint(e.clientX, e.clientY, factor);
		}, { passive: false, signal });

		// 7. Click Station Detection
		canvas.addEventListener("click", (e) => {
			if (this.#isDragMoved) {
				this.#isDragMoved = false;
				return;
			}
			const st = this.getStationAtScreenPoint(e.clientX, e.clientY);
			if (st && typeof this.#renderer.onStationClick === "function") {
				this.#renderer.onStationClick(st);
			}
		}, { signal });

		// 8. Mobile Touch Gestures (Single finger Pan, Two finger Pinch-Zoom & 3D Rotate)
		canvas.addEventListener("touchstart", (e) => {
			this.#renderer.cancelCameraAnimation();
			if (e.touches.length === 1) {
				this.#isDragging = true;
				this.#dragDownX = e.touches[0].clientX;
				this.#dragDownY = e.touches[0].clientY;
				this.#isDragMoved = false;
				this.#startX = e.touches[0].clientX - this.#renderer.panX;
				this.#startY = e.touches[0].clientY - this.#renderer.panY;
			} else if (e.touches.length === 2) {
				this.#isDragging = false;
				this.#isDragMoved = true;
				const t1 = e.touches[0];
				const t2 = e.touches[1];
				this.#lastTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				this.#lastTouchAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
				this.#lastTouchMidY = (t1.clientY + t2.clientY) / 2;
			}
		}, { passive: false, signal });

		canvas.addEventListener("touchmove", (e) => {
			e.preventDefault();
			if (e.touches.length === 1 && this.#isDragging) {
				if (!this.#isDragMoved && Math.hypot(e.touches[0].clientX - this.#dragDownX, e.touches[0].clientY - this.#dragDownY) > 5) {
					this.#isDragMoved = true;
				}
				this.#applyPan(e.touches[0].clientX, e.touches[0].clientY);
			} else if (e.touches.length === 2 && this.#lastTouchDist) {
				this.#isDragMoved = true;
				const t1 = e.touches[0];
				const t2 = e.touches[1];

				// 1. Pinch to Zoom
				const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				if (currentDist > 0) {
					const factor = currentDist / this.#lastTouchDist;
					this.#lastTouchDist = currentDist;

					const cx = (t1.clientX + t2.clientX) / 2;
					const cy = (t1.clientY + t2.clientY) / 2;
					this.zoomToPoint(cx, cy, factor);
				}

				// 2. Two-finger 3D Orbit (Rotation + Tilt/Pitch) in 2.5D mode
				if (this.#renderer.is25D) {
					let deltaAngle = 0;
					if (this.#lastTouchAngle != null) {
						const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * (180 / Math.PI);
						deltaAngle = currentAngle - this.#lastTouchAngle;

						if (deltaAngle > 180) deltaAngle -= 360;
						if (deltaAngle < -180) deltaAngle += 360;

						if (Math.abs(deltaAngle) > 0.3) {
							this.#lastTouchAngle = currentAngle;
						} else {
							deltaAngle = 0;
						}
					}

					let deltaPitch = 0;
					const currentMidY = (t1.clientY + t2.clientY) / 2;
					if (this.#lastTouchMidY != null) {
						// Moving two fingers down tilts up, moving up tilts down
						const dy = currentMidY - this.#lastTouchMidY;
						if (Math.abs(dy) > 1.0) {
							deltaPitch = dy * 0.35;
							this.#lastTouchMidY = currentMidY;
						}
					} else {
						this.#lastTouchMidY = currentMidY;
					}

					if (deltaAngle !== 0 || deltaPitch !== 0) {
						this.#applyOrbit(deltaAngle, deltaPitch);
					}
				}
			}
		}, { passive: false, signal });

		canvas.addEventListener("touchend", (e) => {
			if (e.touches.length === 1) {
				this.#isDragging = true;
				this.#dragDownX = e.touches[0].clientX;
				this.#dragDownY = e.touches[0].clientY;
				this.#startX = e.touches[0].clientX - this.#renderer.panX;
				this.#startY = e.touches[0].clientY - this.#renderer.panY;
				this.#lastTouchDist = null;
				this.#lastTouchAngle = null;
				this.#lastTouchMidY = null;
			} else if (e.touches.length === 0) {
				this.#isDragging = false;
				this.#lastTouchDist = null;
				this.#lastTouchAngle = null;
				this.#lastTouchMidY = null;
			}
			this.#renderer.requestRender();
		}, { signal });

		canvas.addEventListener("touchcancel", () => {
			this.#isDragging = false;
			this.#lastTouchDist = null;
			this.#lastTouchAngle = null;
			this.#lastTouchMidY = null;
			this.#renderer.requestRender();
		}, { signal });
	}

	/**
	 * Single Source of Truth for Panning (DRY helper for mouse & touch)
	 * @param {number} clientX
	 * @param {number} clientY
	 */
	#applyPan(clientX, clientY) {
		this.#renderer.panX = clientX - this.#startX;
		this.#renderer.panY = clientY - this.#startY;
		this.#renderer.requestRender();
		this.#renderer.notifyTransformChange();
	}

	/**
	 * Single Source of Truth for 3D Camera Orbiting (DRY helper for mouse & touch)
	 * Bounded by APP_CONFIG.MAP.CAMERA_LIMITS (BEARING & PITCH)
	 * @param {number} deltaRotate - Horizontal change in bearing/rotation (degrees)
	 * @param {number} deltaPitch - Vertical change in tilt/pitch (degrees)
	 */
	#applyOrbit(deltaRotate, deltaPitch = 0) {
		if (!this.#renderer.is25D) return;

		// 1. Horizontal Bearing Clamping (Left-Right)
		const bearingLimits = APP_CONFIG.MAP?.CAMERA_LIMITS?.BEARING || { MIN: -45, MAX: 45 };
		const minBearing = bearingLimits.MIN != null ? bearingLimits.MIN : -45;
		const maxBearing = bearingLimits.MAX != null ? bearingLimits.MAX : 45;

		let newRotate = this.#renderer.rotateDeg;
		if (minBearing <= -180 && maxBearing >= 180) {
			let res = (newRotate + deltaRotate) % 360;
			newRotate = res < 0 ? res + 360 : res;
		} else {
			let norm = ((newRotate % 360) + 360) % 360;
			let signed = norm > 180 ? norm - 360 : norm;
			let target = signed + deltaRotate;
			let clamped = Math.max(minBearing, Math.min(maxBearing, target));
			newRotate = ((clamped % 360) + 360) % 360;
		}

		// 2. Vertical Pitch Clamping (Up-Down)
		const pitchLimits = APP_CONFIG.MAP?.CAMERA_LIMITS?.PITCH || { MIN: 20, MAX: 65 };
		const minPitch = pitchLimits.MIN != null ? pitchLimits.MIN : 20;
		const maxPitch = pitchLimits.MAX != null ? pitchLimits.MAX : 65;

		let newPitch = this.#renderer.pitchDeg + deltaPitch;
		newPitch = Math.max(minPitch, Math.min(maxPitch, newPitch));

		this.#renderer.rotateDeg = newRotate;
		this.#renderer.pitchDeg = newPitch;

		this.#renderer.requestRender();
		this.#renderer.notifyTransformChange();
	}

	/**
	 * Smooth zoom centered exactly at cursor coordinate
	 * @param {number} clientX
	 * @param {number} clientY
	 * @param {number} factor
	 */
	zoomToPoint(clientX, clientY, factor) {
		const container = this.#container;
		const rect = container.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const mouseY = clientY - rect.top;

		const vpW = rect.width > 50 ? rect.width : window.innerWidth;
		const vpH = rect.height > 50 ? rect.height : (window.innerHeight - 80);
		const originX = vpW / 2;
		const originY = vpH / 2;

		const oldZoom = this.#renderer.zoom;
		const minZ = this.#renderer.minZoom;
		const maxZ = this.#renderer.maxZoom;
		const newZoom = Math.max(minZ, Math.min(maxZ, oldZoom * factor));
		const ratio = newZoom / oldZoom;

		const panX = this.#renderer.panX;
		const panY = this.#renderer.panY;

		this.#renderer.panX = (mouseX - originX) - ((mouseX - originX) - panX) * ratio;
		this.#renderer.panY = (mouseY - originY) - ((mouseY - originY) - panY) * ratio;
		this.#renderer.zoom = newZoom;

		this.#renderer.requestRender();
		this.#renderer.notifyTransformChange();
	}

	/**
	 * Programmatic zoom set
	 * @param {number} newZoom
	 */
	setZoom(newZoom) {
		const oldZoom = this.#renderer.zoom;
		const minZ = this.#renderer.minZoom;
		const maxZ = this.#renderer.maxZoom;
		const targetZoom = Math.max(minZ, Math.min(maxZ, newZoom));
		const ratio = targetZoom / oldZoom;

		this.#renderer.panX = this.#renderer.panX * ratio;
		this.#renderer.panY = this.#renderer.panY * ratio;
		this.#renderer.zoom = targetZoom;

		this.#renderer.requestRender();
		this.#renderer.notifyTransformChange();
	}

	/**
	 * Find station under cursor point (with dynamic zoom-scaled radius)
	 * @param {number} clientX
	 * @param {number} clientY
	 * @returns {object|null}
	 */
	getStationAtScreenPoint(clientX, clientY) {
		const rect = this.#container.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const mouseY = clientY - rect.top;

		let closest = null;
		const zoom = this.#renderer.zoom;
		const minDistance = Math.max(14, Math.min(24, 16 * Math.sqrt(zoom)));

		const stationMap = this.#renderer.stationMap;
		if (!stationMap) return null;

		for (const st of stationMap.values()) {
			if (!st.xy) continue;

			const z = this.#renderer.getLayoutElevation(st.layout);
			const pt = this.#renderer.projectPoint(st.xy.x, st.xy.y, z);
			const dist = Math.hypot(pt.sx - mouseX, pt.sy - mouseY);

			if (dist < minDistance) {
				return st;
			}
		}
		return closest;
	}

	/**
	 * Update hover state with dynamic proximity check
	 * @param {number} clientX
	 * @param {number} clientY
	 */
	checkStationHover(clientX, clientY) {
		const st = this.getStationAtScreenPoint(clientX, clientY);
		this.#renderer.setHoverState(st, clientX, clientY);
	}

	/**
	 * Abort all event listeners and release references
	 */
	destroy() {
		this.#abortController.abort();
		this.#renderer = null;
		this.#canvas = null;
		this.#container = null;
	}
}
