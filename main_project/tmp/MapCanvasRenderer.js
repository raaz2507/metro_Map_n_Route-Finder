/**
 * ⚡ MapCanvasRenderer.js - High-Performance 60-120 FPS Canvas 2.5D Metro Map Engine
 * Native HTML5 Canvas 2D / 2.5D Perspective Renderer
 * Zero DOM Overhead | True 3D Viaduct Pillars & Ground Shadows | High-DPI Crispness
 */

import { MapGeometry } from "../js/components/map/MapGeometry.js";

export class MapCanvasRenderer {
	#container = null;
	#canvas = null;
	#ctx = null;
	#metroData = null;
	#stationData = {};
	#linesData = {};
	#bounds = null;

	// Viewport & Transform State
	#zoom = 1;
	#panX = 0;
	#panY = 0;
	#minZoom = 0.4;
	#maxZoom = 25;
	#is25D = false;

	// Animation & Performance
	#isDirty = true;
	#rAF = null;
	#dpr = window.devicePixelRatio || 1;
	#fps = 60;
	#frameCount = 0;
	#lastFpsTime = performance.now();

	// Interaction State
	#isDragging = false;
	#startX = 0;
	#startY = 0;
	#hoveredStation = null;
	#selectedStation = null;

	// Callbacks
	onStationHover = null;
	onStationClick = null;
	onFpsUpdate = null;
	onTransformChange = null;

	constructor({ container, metroData, is25D = false }) {
		this.#container = typeof container === "string" ? document.querySelector(container) : container;
		this.#metroData = metroData;
		this.#stationData = metroData?.stationData || {};
		this.#linesData = metroData?.lines || {};
		this.#is25D = is25D;

		this.#initCanvas();
		this.#initGeometry();
		this.#initEvents();
		this.#startRenderLoop();
	}

	get is25D() {
		return this.#is25D;
	}

	get zoom() {
		return this.#zoom;
	}

	// =========================================================================
	// 1. Canvas Setup & HiDPI Scaling
	// =========================================================================

	#initCanvas() {
		this.#canvas = document.createElement("canvas");
		this.#ctx = this.#canvas.getContext("2d", { alpha: true });
		this.#container.innerHTML = "";
		this.#container.appendChild(this.#canvas);
		this.#resizeCanvas();

		window.addEventListener("resize", () => {
			this.#resizeCanvas();
			this.requestRender();
		});
	}

	#resizeCanvas() {
		if (!this.#container || !this.#canvas) return;
		const rect = this.#container.getBoundingClientRect();
		const w = rect.width > 50 ? rect.width : (window.innerWidth - 32);
		const h = rect.height > 50 ? rect.height : (window.innerHeight - 80);

		this.#dpr = Math.min(window.devicePixelRatio || 1, 2.0); // Cap at 2.0x for max 120 FPS performance
		
		this.#canvas.width = Math.round(w * this.#dpr);
		this.#canvas.height = Math.round(h * this.#dpr);
		this.#canvas.style.width = `${w}px`;
		this.#canvas.style.height = `${h}px`;
		this.#isDirty = true;
	}

	// =========================================================================
	// 2. Geometry & Bounds Setup
	// =========================================================================

	#initGeometry() {
		this.#bounds = MapGeometry.getBounds(this.#stationData);
		const { avgLatRad } = MapGeometry.calculateSVGSize(this.#bounds);
		MapGeometry.convertLatLonToXY(this.#stationData, this.#bounds, avgLatRad);

		// Initial center and auto-fit to screen
		this.fitToScreen(this.#is25D ? 1.8 : 1.0);
	}

	getBaseScale() {
		if (!this.#bounds || !this.#container) return 0.004;
		const rect = this.#container.getBoundingClientRect();
		const { width, height } = MapGeometry.calculateSVGSize(this.#bounds);
		const cw = rect.width > 50 ? rect.width : window.innerWidth;
		const ch = rect.height > 50 ? rect.height : (window.innerHeight - 80);
		return Math.min(cw / (width || 150000), ch / (height || 160000)) * 0.92;
	}

	getNetworkCenter() {
		if (!this.#bounds) return { cx: 75000, cy: 80000 };
		const { width, height } = MapGeometry.calculateSVGSize(this.#bounds);
		return { cx: width / 2, cy: height / 2 };
	}

	fitToScreen(targetZoom = 1.0) {
		this.#zoom = targetZoom;
		this.#panX = 0;
		this.#panY = 0;
		this.requestRender();
	}

	// =========================================================================
	// 3. 2D & 2.5D Perspective Projection Engine
	// =========================================================================

	/**
	 * Projects a geographic (X, Y) point to screen coordinates
	 * Supports true 2.5D elevation in screen-space pixels!
	 * @param {number} x
	 * @param {number} y
	 * @param {number} [elevationZ=0] Screen pixel lift (+35 for elevated, -20 for underground)
	 */
	projectPoint(x, y, elevationZ = 0) {
		const rect = this.#container.getBoundingClientRect();
		const vpW = rect.width > 50 ? rect.width : window.innerWidth;
		const vpH = rect.height > 50 ? rect.height : (window.innerHeight - 80);

		const baseScale = this.getBaseScale();
		const { cx, cy } = this.getNetworkCenter();
		const effectiveScale = baseScale * this.#zoom;

		// Normalized displacement from network center in screen pixels
		const dx = (x - cx) * effectiveScale + this.#panX;
		const dy = (y - cy) * effectiveScale + this.#panY;

		if (!this.#is25D) {
			const sx = vpW / 2 + dx;
			const sy = vpH / 2 + dy;
			return { sx, sy, groundY: sy, scale: 1, effectiveScale };
		}

		// 2.5D Perspective Transformation
		const normY = dy / (vpH / 2);
		const perspFactor = 0.28;
		const perspScale = Math.max(0.65, Math.min(1.4, 1 + normY * perspFactor));

		const groundSx = vpW / 2 + dx * perspScale;
		const groundSy = vpH / 2 + dy * 0.85;

		// True 3D Pixel Lift (Elevated stations lift up, underground sink down)
		const pixelLift = elevationZ * Math.min(1.4, Math.max(0.7, Math.sqrt(this.#zoom))) * perspScale;
		const elevatedSy = groundSy - pixelLift;

		return {
			sx: groundSx,
			sy: elevatedSy,
			groundY: groundSy,
			scale: perspScale,
			effectiveScale
		};
	}

	// =========================================================================
	// 4. Main 60-120 FPS Hardware Render Pipeline
	// =========================================================================

	requestRender() {
		this.#isDirty = true;
	}

	#startRenderLoop() {
		const renderFrame = (now) => {
			this.#updateFps(now);

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

	#drawScene() {
		const ctx = this.#ctx;
		const canvas = this.#canvas;
		if (!ctx || !canvas) return;

		// Reset transform and clear screen
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Scale for HiDPI
		ctx.scale(this.#dpr, this.#dpr);

		// Render Layers in Z-Order:
		// 1. Subterranean Underground Tunnel Casings (Lowest)
		this.#drawUndergroundTracks(ctx);
		
		// 2. Surface At-Grade Tracks (Ground)
		this.#drawSurfaceTracks(ctx);

		// 3. Elevated Viaduct Tracks with 3D Pillars & Ground Shadows (Highest)
		this.#drawElevatedTracks(ctx);

		// 4. Transition Ramps (Underground to Elevated)
		this.#drawTransitionTracks(ctx);

		// 5. Stations (Underground, At-grade, Elevated with Pillars)
		this.#drawStations(ctx);

		// 6. Station Labels (Crisp text with dark halo)
		this.#drawLabels(ctx);
	}

	// =========================================================================
	// 5. Layer Drawing: Tracks & Tunnels
	// =========================================================================

	#drawUndergroundTracks(ctx) {
		const stationData = this.#stationData;
		const drawn = new Set();

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const isUnderground = st1.properties?.layout === "underground" && st2.properties?.layout === "underground";
				if (!isUnderground) return;

				drawn.add(key);

				const z = this.#is25D ? -25 : 0;
				const p1 = this.projectPoint(st1.xy.x, st1.xy.y, z);
				const p2 = this.projectPoint(st2.xy.x, st2.xy.y, z);

				// Dark Subterranean Tunnel Tube
				ctx.strokeStyle = "#090d16";
				ctx.lineWidth = Math.max(3.5, 9 * this.#zoom * p1.scale);
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy);
				ctx.lineTo(p2.sx, p2.sy);
				ctx.stroke();

				// Inner Subterranean Track line
				const lineInfo = this.#linesData[nbr.line];
				ctx.strokeStyle = lineInfo?.color || "#64748b";
				ctx.globalAlpha = 0.8;
				ctx.lineWidth = Math.max(1.8, 4.5 * this.#zoom * p1.scale);
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy);
				ctx.lineTo(p2.sx, p2.sy);
				ctx.stroke();
				ctx.globalAlpha = 1.0;
			});
		});

		ctx.restore();
	}

	#drawSurfaceTracks(ctx) {
		const stationData = this.#stationData;
		const drawn = new Set();

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const isSurface = st1.properties?.layout === "at-grade" && st2.properties?.layout === "at-grade";
				if (!isSurface) return;

				drawn.add(key);

				const p1 = this.projectPoint(st1.xy.x, st1.xy.y, 0);
				const p2 = this.projectPoint(st2.xy.x, st2.xy.y, 0);

				const lineInfo = this.#linesData[nbr.line];
				ctx.strokeStyle = lineInfo?.color || "#3b82f6";
				ctx.lineWidth = Math.max(2, 5 * this.#zoom * p1.scale);
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy);
				ctx.lineTo(p2.sx, p2.sy);
				ctx.stroke();
			});
		});

		ctx.restore();
	}

	#drawElevatedTracks(ctx) {
		const stationData = this.#stationData;
		const drawn = new Set();

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const isElevated = st1.properties?.layout !== "underground" && st2.properties?.layout !== "underground";
				if (!isElevated) return;

				drawn.add(key);

				const z = this.#is25D ? 38 : 0; // Elevated track height in pixels
				const p1 = this.projectPoint(st1.xy.x, st1.xy.y, z);
				const p2 = this.projectPoint(st2.xy.x, st2.xy.y, z);

				// 1. 3D Ground Shadow beneath viaduct
				if (this.#is25D) {
					ctx.strokeStyle = "rgba(0, 0, 0, 0.4)";
					ctx.lineWidth = Math.max(2, 6 * this.#zoom * p1.scale);
					ctx.beginPath();
					ctx.moveTo(p1.sx, p1.groundY);
					ctx.lineTo(p2.sx, p2.groundY);
					ctx.stroke();
				}

				// 2. Viaduct Track Line (Airborne)
				const lineInfo = this.#linesData[nbr.line];
				ctx.strokeStyle = lineInfo?.color || "#10b981";
				ctx.lineWidth = Math.max(2.5, 6 * this.#zoom * p1.scale);
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy);
				ctx.lineTo(p2.sx, p2.sy);
				ctx.stroke();
			});
		});

		ctx.restore();
	}

	#drawTransitionTracks(ctx) {
		const stationData = this.#stationData;
		const drawn = new Set();

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const isTransition =
					(st1.properties?.layout === "underground" && st2.properties?.layout !== "underground") ||
					(st1.properties?.layout !== "underground" && st2.properties?.layout === "underground");
				if (!isTransition) return;

				drawn.add(key);

				const z1 = this.#is25D ? (st1.properties?.layout === "underground" ? -25 : 38) : 0;
				const z2 = this.#is25D ? (st2.properties?.layout === "underground" ? -25 : 38) : 0;

				const p1 = this.projectPoint(st1.xy.x, st1.xy.y, z1);
				const p2 = this.projectPoint(st2.xy.x, st2.xy.y, z2);

				const lineInfo = this.#linesData[nbr.line];
				ctx.strokeStyle = lineInfo?.color || "#64748b";
				ctx.lineWidth = Math.max(2, 5 * this.#zoom * p1.scale);
				ctx.beginPath();
				ctx.moveTo(p1.sx, p1.sy);
				ctx.lineTo(p2.sx, p2.sy);
				ctx.stroke();
			});
		});

		ctx.restore();
	}

	// =========================================================================
	// 6. Layer Drawing: 3D Stations & Pillars
	// =========================================================================

	#drawStations(ctx) {
		const stationData = this.#stationData;

		Object.values(stationData).forEach((st) => {
			if (!st.xy) return;

			const layout = st.properties?.layout || "elevated";
			let z = 0;
			if (this.#is25D) {
				if (layout === "elevated") z = 38;
				else if (layout === "multi_level") z = 60;
				else if (layout === "underground") z = -25;
			}

			const pt = this.projectPoint(st.xy.x, st.xy.y, z);
			const baseRadius = Math.max(4, 8.5 * this.#zoom * pt.scale);
			const isHovered = this.#hoveredStation?.id === st.id;
			const radius = isHovered ? baseRadius * 1.35 : baseRadius;

			// 🌁 3D Elevated: Viaduct Vertical Pillar & Ground Shadow
			if (this.#is25D && z > 0) {
				// Ground Shadow
				ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
				ctx.beginPath();
				ctx.ellipse(pt.sx, pt.groundY, radius * 1.1, radius * 0.45, 0, 0, Math.PI * 2);
				ctx.fill();

				// Vertical Pillar (Supporting Column)
				ctx.strokeStyle = "rgba(148, 163, 184, 0.6)";
				ctx.lineWidth = Math.max(1.8, 3.2 * this.#zoom * pt.scale);
				ctx.beginPath();
				ctx.moveTo(pt.sx, pt.groundY);
				ctx.lineTo(pt.sx, pt.sy);
				ctx.stroke();
			}

			// 🚇 Underground: Sunken Well Trench
			if (this.#is25D && z < 0) {
				ctx.fillStyle = "#090d16";
				ctx.strokeStyle = "#475569";
				ctx.lineWidth = 2.5;
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, radius + 2.5, 0, Math.PI * 2);
				ctx.fill();
				ctx.stroke();
			}

			// Station Disc (Primary Node)
			const firstLine = st.lines?.[0];
			const lineInfo = this.#linesData[firstLine];
			const strokeColor = lineInfo?.color || "#ffffff";

			ctx.fillStyle = layout === "underground" ? "#bfdbfe" : "#ffffff";
			ctx.strokeStyle = strokeColor;
			ctx.lineWidth = Math.max(2, 4 * this.#zoom * pt.scale);

			ctx.beginPath();
			ctx.arc(pt.sx, pt.sy, radius, 0, Math.PI * 2);
			ctx.fill();
			ctx.stroke();

			// Interchange Station Double Ring
			if (st.lines && st.lines.length > 1) {
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = 1.8;
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, radius * 0.55, 0, Math.PI * 2);
				ctx.stroke();
			}

			// Hover Glow Ring
			if (isHovered) {
				ctx.strokeStyle = "#38bdf8";
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(pt.sx, pt.sy, radius + 4, 0, Math.PI * 2);
				ctx.stroke();
			}
		});
	}

	// =========================================================================
	// 7. Layer Drawing: Station Labels
	// =========================================================================

	#drawLabels(ctx) {
		// Only render labels when zoom is sufficient
		if (this.#zoom < 0.75) return;

		const stationData = this.#stationData;
		ctx.font = `600 ${Math.max(10, 12 * Math.sqrt(this.#zoom))}px sans-serif`;
		ctx.textAlign = "left";
		ctx.textBaseline = "middle";

		Object.values(stationData).forEach((st) => {
			if (!st.xy) return;

			// In zoomed out mode, skip non-interchanges to maximize FPS
			const isInterchange = st.lines && st.lines.length > 1;
			if (this.#zoom < 1.3 && !isInterchange) return;

			const layout = st.properties?.layout || "elevated";
			let z = 0;
			if (this.#is25D) {
				if (layout === "elevated") z = 38;
				else if (layout === "multi_level") z = 60;
				else if (layout === "underground") z = -25;
			}

			const pt = this.projectPoint(st.xy.x, st.xy.y, z);
			const name = st.name?.en || st.id;
			const textX = pt.sx + 14;
			const textY = pt.sy;

			// Dark halo for readability over lines
			ctx.strokeStyle = "rgba(15, 23, 42, 0.95)";
			ctx.lineWidth = 3.5;
			ctx.strokeText(name, textX, textY);

			// Clean White Text
			ctx.fillStyle = "#ffffff";
			ctx.fillText(name, textX, textY);
		});
	}

	// =========================================================================
	// 8. 120 FPS Touch & Mouse Interactions
	// =========================================================================

	#initEvents() {
		const canvas = this.#canvas;

		// Mouse Drag Panning
		canvas.addEventListener("mousedown", (e) => {
			this.#isDragging = true;
			this.#startX = e.clientX - this.#panX;
			this.#startY = e.clientY - this.#panY;
			this.#container.classList.add("is-panning");
		});

		window.addEventListener("mousemove", (e) => {
			if (this.#isDragging) {
				this.#panX = e.clientX - this.#startX;
				this.#panY = e.clientY - this.#startY;
				this.requestRender();
			} else {
				this.#checkStationHover(e.clientX, e.clientY);
			}
		});

		window.addEventListener("mouseup", () => {
			if (this.#isDragging) {
				this.#isDragging = false;
				this.#container.classList.remove("is-panning");
				if (typeof this.onTransformChange === "function") {
					this.onTransformChange({ zoom: this.#zoom, panX: this.#panX, panY: this.#panY });
				}
			}
		});

		// Scroll Wheel Zoom to Cursor
		canvas.addEventListener("wheel", (e) => {
			e.preventDefault();
			const factor = e.deltaY < 0 ? 1.15 : 0.87;
			this.zoomToPoint(e.clientX, e.clientY, factor);
		}, { passive: false });

		// Click Selection
		canvas.addEventListener("click", (e) => {
			const st = this.getStationAtScreenPoint(e.clientX, e.clientY);
			if (st && typeof this.onStationClick === "function") {
				this.onStationClick(st);
			}
		});

		// Touch gestures (Pan & Pinch Zoom)
		let lastTouchDist = null;
		let lastTouchCenter = null;

		canvas.addEventListener("touchstart", (e) => {
			if (e.touches.length === 1) {
				this.#isDragging = true;
				this.#startX = e.touches[0].clientX - this.#panX;
				this.#startY = e.touches[0].clientY - this.#panY;
			} else if (e.touches.length === 2) {
				this.#isDragging = false;
				const t1 = e.touches[0];
				const t2 = e.touches[1];
				lastTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				lastTouchCenter = {
					x: (t1.clientX + t2.clientX) / 2,
					y: (t1.clientY + t2.clientY) / 2
				};
			}
		}, { passive: false });

		canvas.addEventListener("touchmove", (e) => {
			e.preventDefault();
			if (e.touches.length === 1 && this.#isDragging) {
				this.#panX = e.touches[0].clientX - this.#startX;
				this.#panY = e.touches[0].clientY - this.#startY;
				this.requestRender();
			} else if (e.touches.length === 2 && lastTouchDist) {
				const t1 = e.touches[0];
				const t2 = e.touches[1];
				const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
				const factor = currentDist / lastTouchDist;
				lastTouchDist = currentDist;

				const cx = (t1.clientX + t2.clientX) / 2;
				const cy = (t1.clientY + t2.clientY) / 2;
				this.zoomToPoint(cx, cy, factor);
			}
		}, { passive: false });

		canvas.addEventListener("touchend", () => {
			this.#isDragging = false;
			lastTouchDist = null;
			lastTouchCenter = null;
		});
	}

	zoomToPoint(clientX, clientY, factor) {
		const rect = this.#container.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const mouseY = clientY - rect.top;

		const oldZoom = this.#zoom;
		let newZoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, oldZoom * factor));

		this.#panX = mouseX - (mouseX - this.#panX) * (newZoom / oldZoom);
		this.#panY = mouseY - (mouseY - this.#panY) * (newZoom / oldZoom);
		this.#zoom = newZoom;

		this.requestRender();
		if (typeof this.onTransformChange === "function") {
			this.onTransformChange({ zoom: this.#zoom, panX: this.#panX, panY: this.#panY });
		}
	}

	toggle25D() {
		this.#is25D = !this.#is25D;
		if (this.#is25D && this.#zoom < 1.6) {
			this.fitToScreen(1.8);
		} else {
			this.requestRender();
		}
		return this.#is25D;
	}

	setZoom(newZoom) {
		const rect = this.#container.getBoundingClientRect();
		const cx = (rect.width || 800) / 2;
		const cy = (rect.height || 600) / 2;
		const oldZoom = this.#zoom;
		this.#zoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, newZoom));
		this.#panX = cx - (cx - this.#panX) * (this.#zoom / oldZoom);
		this.#panY = cy - (cy - this.#panY) * (this.#zoom / oldZoom);
		this.requestRender();
	}

	getStationAtScreenPoint(clientX, clientY) {
		const rect = this.#container.getBoundingClientRect();
		const mouseX = clientX - rect.left;
		const mouseY = clientY - rect.top;

		let closest = null;
		let minDistance = 22; // 22px click radius

		Object.values(this.#stationData).forEach((st) => {
			if (!st.xy) return;
			const layout = st.properties?.layout || "elevated";
			let z = 0;
			if (this.#is25D) {
				if (layout === "elevated") z = 38;
				else if (layout === "multi_level") z = 60;
				else if (layout === "underground") z = -25;
			}

			const pt = this.projectPoint(st.xy.x, st.xy.y, z);
			const dist = Math.hypot(pt.sx - mouseX, pt.sy - mouseY);

			if (dist < minDistance) {
				minDistance = dist;
				closest = st;
			}
		});

		return closest;
	}

	#checkStationHover(clientX, clientY) {
		const st = this.getStationAtScreenPoint(clientX, clientY);
		if (st !== this.#hoveredStation) {
			this.#hoveredStation = st;
			this.requestRender();
			if (typeof this.onStationHover === "function") {
				this.onStationHover(st, clientX, clientY);
			}
		}
	}

	destroy() {
		if (this.#rAF) {
			cancelAnimationFrame(this.#rAF);
			this.#rAF = null;
		}
	}
}
