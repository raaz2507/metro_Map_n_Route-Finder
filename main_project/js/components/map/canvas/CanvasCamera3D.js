/**
 * 🎥 CanvasCamera3D.js - 3D Projection Matrix & Perspective Camera Engine
 * Handles full 360° Yaw & Pitch 3D rotation, perspective divide, elevation levels,
 * and sunlight / subterranean shadow projections for CanvasRenderer.
 */

export class CanvasCamera3D {
	#pitchDeg = 45;
	#rotateDeg = 0;
	#viaductLift = 16;
	#undergroundDepth = 14;
	#enableZIndex = true;
	#cameraDist = 650;
	#sunAngleDeg = 135;

	/**
	 * @param {object} [options]
	 */
	constructor({
		pitchDeg = 45,
		rotateDeg = 0,
		viaductLift = 16,
		undergroundDepth = 14,
		enableZIndex = true,
		cameraDist = 650,
		sunAngleDeg = 135
	} = {}) {
		this.#pitchDeg = pitchDeg;
		this.#rotateDeg = rotateDeg;
		this.#viaductLift = viaductLift;
		this.#undergroundDepth = undergroundDepth;
		this.#enableZIndex = enableZIndex;
		this.#cameraDist = cameraDist;
		this.#sunAngleDeg = sunAngleDeg;
	}

	get pitchDeg() { return this.#pitchDeg; }
	set pitchDeg(deg) { this.#pitchDeg = ((deg % 360) + 360) % 360; }

	get rotateDeg() { return this.#rotateDeg; }
	set rotateDeg(deg) { this.#rotateDeg = ((deg % 360) + 360) % 360; }

	get viaductLift() { return this.#viaductLift; }
	set viaductLift(px) { this.#viaductLift = Math.max(0, px); }

	get undergroundDepth() { return this.#undergroundDepth; }
	set undergroundDepth(px) { this.#undergroundDepth = Math.max(0, px); }

	get enableZIndex() { return this.#enableZIndex; }
	set enableZIndex(val) { this.#enableZIndex = Boolean(val); }

	get cameraDist() { return this.#cameraDist; }
	set cameraDist(val) { this.#cameraDist = Math.max(100, val); }

	get sunAngleDeg() { return this.#sunAngleDeg; }
	set sunAngleDeg(deg) { this.#sunAngleDeg = deg; }

	/**
	 * Computes visual 3D elevation in pixels for a structural layout type
	 * @param {string} layout
	 * @param {boolean} [is25D=true]
	 * @returns {number}
	 */
	getLayoutElevation(layout, is25D = true) {
		if (!is25D || !this.#enableZIndex) return 0;
		const l = (layout || "").toLowerCase().trim();

		// Subterranean / Underground (-Z: below ground datum)
		if (l.includes("underground") || l.includes("tunnel") || l.includes("subway")) {
			return -this.#undergroundDepth;
		}
		if (l.includes("cut_and_cover") || l.includes("cut-and-cover") || l.includes("trench")) {
			return -(this.#undergroundDepth * 0.45);
		}

		// Surface / At-Grade (Z = 0: exactly on ground datum)
		if (l.includes("at-grade") || l.includes("at grade") || l.includes("surface") || l.includes("ground") || l.includes("multi_level")) {
			return 0;
		}

		// Elevated / Aerial Viaduct (+Z: above ground datum)
		if (l.includes("elevated") || l.includes("viaduct") || l.includes("aerial") || l.includes("bridge")) {
			return this.#viaductLift;
		}

		// Safe fallback: standard metro viaduct lift
		return this.#viaductLift;
	}

	/**
	 * Structural layout classifiers
	 */
	isUnderground(layout) {
		const l = (layout || "").toLowerCase().trim();
		return l.includes("underground") || l.includes("tunnel") || l.includes("subway") || l.includes("cut_and_cover") || l.includes("cut-and-cover") || l.includes("trench");
	}

	isSurface(layout) {
		const l = (layout || "").toLowerCase().trim();
		return l.includes("at-grade") || l.includes("at grade") || l.includes("surface") || l.includes("ground") || l.includes("multi_level");
	}

	isElevated(layout) {
		const l = (layout || "").toLowerCase().trim();
		return l.includes("elevated") || l.includes("viaduct") || l.includes("aerial") || l.includes("bridge");
	}

	/**
	 * Projects a 2D/3D world coordinate to screen space with 360° yaw/pitch matrix and perspective
	 * @param {number} x - SVG/Map world X
	 * @param {number} y - SVG/Map world Y
	 * @param {number} elevationZ - Structure height in pixels (+Z elevated, -Z underground)
	 * @param {object} viewParams - { vpW, vpH, cx, cy, effectiveScale, panX, panY, is25D }
	 * @returns {{ sx: number, sy: number, groundSx: number, groundY: number, scale: number, effectiveScale: number }}
	 */
	projectPoint(x, y, elevationZ = 0, viewParams) {
		const { vpW, vpH, cx, cy, effectiveScale, panX, panY, is25D } = viewParams;

		const dx = (x - cx) * effectiveScale + panX;
		const dy = (y - cy) * effectiveScale + panY;

		if (!is25D) {
			const sx = vpW / 2 + dx;
			const sy = vpH / 2 + dy;
			return { sx, sy, groundSx: sx, groundY: sy, scale: 1, effectiveScale };
		}

		// Full 360° Matrix 3D Projection
		const pitchRad = (this.#pitchDeg * Math.PI) / 180;
		const rotRad = (this.#rotateDeg * Math.PI) / 180;

		// 1. Yaw rotation around Z axis
		const rx = dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
		const ry = dx * Math.sin(rotRad) + dy * Math.cos(rotRad);

		// 2. Pitch tilt around X axis
		const cosP = Math.cos(pitchRad);
		const sinP = Math.sin(pitchRad);

		const x3d = rx;
		const y3d = ry * cosP - elevationZ * sinP;
		const z3d = ry * sinP + elevationZ * cosP;

		const groundY3d = ry * cosP;
		const groundZ3d = ry * sinP;

		// 3. Perspective Divide
		const cameraDist = this.#cameraDist;
		const zDepth = cameraDist - z3d;
		const groundZDepth = cameraDist - groundZ3d;

		const perspective = Math.max(0.2, Math.min(2.5, cameraDist / Math.max(40, zDepth)));
		const groundPersp = Math.max(0.2, Math.min(2.5, cameraDist / Math.max(40, groundZDepth)));

		const sx = vpW / 2 + (x3d * perspective);
		const sy = vpH / 2 + (y3d * perspective);

		const groundSx = vpW / 2 + (rx * groundPersp);
		const groundSy = vpH / 2 + (groundY3d * groundPersp);

		return {
			sx,
			sy,
			groundSx,
			groundY: groundSy,
			scale: perspective,
			effectiveScale
		};
	}

	/**
	 * Unified Physical Ground Shadow & Subterranean Glow Projector
	 * Scales shadow / glow offset distance dynamically and relatively with map zoom!
	 * 
	 * @param {number} x - Map world X
	 * @param {number} y - Map world Y
	 * @param {number} elevationZ - Positive for elevated viaduct, negative for subterranean tunnel
	 * @param {object} viewParams - Includes { zoom, effectiveScale, vpW, vpH, ... }
	 * @param {boolean} [isInverse=false] - False for sunlight shadow (+135°), True for reverse tunnel glow (-45°)
	 * @returns {{ sx: number, sy: number, groundSx: number, groundY: number, scale: number, effectiveScale: number }}
	 */
	projectShadowPoint(x, y, elevationZ, viewParams, isInverse = false) {
		const pGround = this.projectPoint(x, y, 0, viewParams);
		if (elevationZ === 0) {
			return pGround;
		}

		const depth = Math.abs(elevationZ);
		const baseAngle = isInverse ? (this.#sunAngleDeg + 180) : this.#sunAngleDeg;
		const angleRad = (baseAngle * Math.PI) / 180;

		// Relative Zoom Scaling: As map zooms out (zoom < 1.0), distance smoothly contracts so shadow never detaches.
		// As map zooms in (zoom > 1.0), distance scales out proportionally with the enlarged viaduct tracks.
		const zoom = viewParams?.zoom || 1.0;
		const zoomScaleFactor = Math.max(0.25, Math.min(3.5, Math.pow(zoom, 0.82)));

		// Base physical projection coefficients (calibrated for delicate, natural depth)
		const coeff = isInverse ? 0.16 : 0.24;
		const shift = (depth * coeff) * (pGround.scale || 1) * zoomScaleFactor;

		return {
			sx: pGround.sx + Math.cos(angleRad) * shift,
			sy: pGround.sy + Math.sin(angleRad) * shift,
			groundSx: pGround.sx,
			groundY: pGround.sy,
			scale: pGround.scale,
			effectiveScale: pGround.effectiveScale
		};
	}

	/**
	 * Projects elevated viaduct shadow along sunlight vector
	 */
	projectSunShadow(x, y, elevationZ, viewParams) {
		if (elevationZ <= 0) return this.projectPoint(x, y, 0, viewParams);
		return this.projectShadowPoint(x, y, elevationZ, viewParams, false);
	}

	/**
	 * Projects subterranean tunnel conduit glow along reverse sunlight vector
	 */
	projectTunnelReverseShadow(x, y, elevationZ, viewParams) {
		if (elevationZ >= 0) return this.projectPoint(x, y, 0, viewParams);
		return this.projectShadowPoint(x, y, elevationZ, viewParams, true);
	}
}
