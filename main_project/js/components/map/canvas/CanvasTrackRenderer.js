/**
 * 🛤️ CanvasTrackRenderer.js - High-Performance Multi-Stratum Track Pipeline
 * Renders subterranean tubes, at-grade surface tracks, elevated flyovers,
 * transition incline ramps, physically-based sunlight shadows, and active route ribbons.
 */

export class CanvasTrackRenderer {
	#renderer = null;

	/**
	 * @param {import('./CanvasRenderer.js').CanvasRenderer} renderer
	 */
	constructor(renderer) {
		this.#renderer = renderer;
	}

	/**
	 * Physically-Based Sunlight Shadows for Elevated Viaducts:
	 * Shadows dynamically taper down to zero where the viaduct meets the ground,
	 * following sunlight angle and true physical height!
	 * 
	 * @param {CanvasRenderingContext2D} ctx
	 */
	drawViaductSoftShadows(ctx) {
		const r = this.#renderer;
		const stationData = r.stationData || {};
		const drawn = new Set();
		const isDark = r.getThemeToken("--theme-mode", "light") === "dark";
		const shadowAlpha = isDark ? 0.10 : 0.06;
		const shadowEdges = [];

		// Viaduct segment ground shadows along sunlight vector
		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const edgeStatus = r.getEdgeStatus(st1, st2, nbr.line);
				if (!r.showUnderConstruction && edgeStatus === "under_construction") return;
				if (!r.showApproved && (edgeStatus === "approved" || edgeStatus === "proposed" || edgeStatus === "planned")) return;

				const z1Raw = r.getLayoutElevation(st1.properties?.layout);
				const z2Raw = r.getLayoutElevation(st2.properties?.layout);

				const z1 = Math.max(0, z1Raw);
				const z2 = Math.max(0, z2Raw);

				// Case 1: Both stations elevated
				if (z1 > 0 && z2 > 0) {
					drawn.add(key);
					const sp1 = r.projectSunShadow(st1.xy.x, st1.xy.y, z1);
					const sp2 = r.projectSunShadow(st2.xy.x, st2.xy.y, z2);
					const avgScale = ((sp1.scale || 1) + (sp2.scale || 1)) / 2;
					const trackW = r.getTrackWidth(avgScale);
					shadowEdges.push({ x1: sp1.sx, y1: sp1.sy, x2: sp2.sx, y2: sp2.sy, baseW: trackW });
				}
				// Case 2: Transition Edge (One elevated, other is underground/ground)
				else if (z1 > 0 || z2 > 0) {
					drawn.add(key);
					const elevSt = z1 > 0 ? st1 : st2;
					const otherSt = z1 > 0 ? st2 : st1;
					const elevZ = z1 > 0 ? z1 : z2;

					// Ramp touches ground at 55% towards ground station
					const groundX = elevSt.xy.x + (otherSt.xy.x - elevSt.xy.x) * 0.55;
					const groundY = elevSt.xy.y + (otherSt.xy.y - elevSt.xy.y) * 0.55;

					const spElev = r.projectSunShadow(elevSt.xy.x, elevSt.xy.y, elevZ);
					const spGround = r.projectSunShadow(groundX, groundY, 0); // Z = 0!
					const avgScale = ((spElev.scale || 1) + (spGround.scale || 1)) / 2;
					const trackW = r.getTrackWidth(avgScale);
					shadowEdges.push({ x1: spElev.sx, y1: spElev.sy, x2: spGround.sx, y2: spGround.sy, baseW: trackW * 0.9 });
				}
			});
		});

		ctx.save();
		ctx.lineCap = "round";

		// Diffused ambient viaduct ground shadow with wide, misty falloff (dhundhla - zero thin lines)
		const tiers = [
			{ widthMultiplier: 5.0, alphaMult: 0.25 },
			{ widthMultiplier: 3.2, alphaMult: 0.45 },
			{ widthMultiplier: 2.0, alphaMult: 0.30 }
		];

		tiers.forEach((tier) => {
			ctx.strokeStyle = `rgba(15, 23, 42, ${shadowAlpha * tier.alphaMult})`;
			shadowEdges.forEach((e) => {
				ctx.lineWidth = e.baseW * tier.widthMultiplier;
				ctx.beginPath();
				ctx.moveTo(e.x1, e.y1);
				ctx.lineTo(e.x2, e.y2);
				ctx.stroke();
			});
		});

		// Elevated station node ground shadows - soft diffused radial puddle on ground
		Object.values(stationData).forEach((st) => {
			const z = r.getLayoutElevation(st.properties?.layout);
			if (z > 0 && st.xy) {
				const sp = r.projectSunShadow(st.xy.x, st.xy.y, z);
				const trackW = r.getTrackWidth(sp.scale);
				const isInterchange = st.lines && st.lines.length > 1;
				const baseR = r.getStationRadius ? r.getStationRadius(sp.scale, isInterchange) : (isInterchange ? Math.max(2.8, trackW * 1.4) : Math.max(2.0, trackW * 1.1));
				const outerR = baseR * 2.8;

				const grad = ctx.createRadialGradient(sp.sx, sp.sy, baseR * 0.2, sp.sx, sp.sy, outerR);
				grad.addColorStop(0.0, `rgba(15, 23, 42, ${shadowAlpha * 0.35})`);
				grad.addColorStop(0.5, `rgba(15, 23, 42, ${shadowAlpha * 0.15})`);
				grad.addColorStop(1.0, "rgba(15, 23, 42, 0)");

				ctx.fillStyle = grad;
				ctx.beginPath();
				ctx.arc(sp.sx, sp.sy, outerR, 0, Math.PI * 2);
				ctx.fill();
			}
		});

		ctx.restore();
	}

	/**
	 * Subtle Translucent Slate Tunnel Tube for Underground Tunnels (Z = 0 Ground Datum)
	 * @param {CanvasRenderingContext2D} ctx
	 */
	drawTunnelGroundReverseShadow(ctx) {
		const r = this.#renderer;
		if (r.undergroundDepth <= 0) return;
		const isLight = r.currentTheme === "light";
		const stationData = r.stationData || {};
		const drawn = new Set();
		const shadowEdges = [];

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			const nbrList = Array.isArray(st1.neighbors)
				? st1.neighbors
				: (typeof st1.neighbors === "object" ? Object.values(st1.neighbors).flat() : []);

			nbrList.forEach((nbr) => {
				const nbrId = (nbr && typeof nbr === "object") ? (nbr.station || nbr.id) : nbr;
				if (!nbrId) return;

				const key = [st1.id, nbrId].sort().join("-");
				if (drawn.has(key)) return;
				drawn.add(key);

				const st2 = stationData[nbrId];
				if (!st2 || !st1.xy || !st2.xy) return;

				const z1 = r.getLayoutElevation(st1.properties?.layout);
				const z2 = r.getLayoutElevation(st2.properties?.layout);

				const isUG1 = z1 < 0;
				const isUG2 = z2 < 0;

				// Case A: Fully Underground edge
				if (isUG1 && isUG2) {
					const sp1 = r.projectTunnelReverseShadow(st1.xy.x, st1.xy.y, z1);
					const sp2 = r.projectTunnelReverseShadow(st2.xy.x, st2.xy.y, z2);
					const trackW = r.getTrackWidth(sp1.scale);
					shadowEdges.push({ x1: sp1.sx, y1: sp1.sy, x2: sp2.sx, y2: sp2.sy, trackW: Math.max(2.0, trackW * 1.1) });
				}
				// Case B: Transition edge (descending from ground to underground)
				else if (isUG1 || isUG2) {
					const ugStation = isUG1 ? st1 : st2;
					const otherStation = isUG1 ? st2 : st1;
					const ugZ = isUG1 ? z1 : z2;

					const groundX = ugStation.xy.x + (otherStation.xy.x - ugStation.xy.x) * 0.45;
					const groundY = ugStation.xy.y + (otherStation.xy.y - ugStation.xy.y) * 0.45;

					const spUG = r.projectTunnelReverseShadow(ugStation.xy.x, ugStation.xy.y, ugZ);
					const spGround = r.projectPoint(groundX, groundY, 0);
					const trackW = r.getTrackWidth(spUG.scale);
					shadowEdges.push({ x1: spGround.sx, y1: spGround.sy, x2: spUG.sx, y2: spUG.sy, trackW: Math.max(1.8, trackW * 0.95) });
				}
			});
		});

		if (shadowEdges.length === 0) return;

		ctx.save();
		ctx.lineCap = "round";
		ctx.lineJoin = "round";

		// Misty Skyblue subterranean tunnel conduit (dhundhla / hazy / soft diffused aura)
		// Zero thin parallel lines - broad atmospheric glow on ground datum
		const tiers = isLight ? [
			{ widthMultiplier: 4.8, stroke: "rgba(2, 132, 199, 0.02)" },
			{ widthMultiplier: 3.2, stroke: "rgba(14, 165, 233, 0.035)" },
			{ widthMultiplier: 1.8, stroke: "rgba(56, 189, 248, 0.04)" }
		] : [
			{ widthMultiplier: 4.8, stroke: "rgba(56, 189, 248, 0.02)" },
			{ widthMultiplier: 3.2, stroke: "rgba(56, 189, 248, 0.035)" },
			{ widthMultiplier: 1.8, stroke: "rgba(125, 211, 252, 0.045)" }
		];

		tiers.forEach((tier) => {
			ctx.strokeStyle = tier.stroke;
			shadowEdges.forEach((e) => {
				ctx.lineWidth = e.trackW * tier.widthMultiplier;
				ctx.beginPath();
				ctx.moveTo(e.x1, e.y1);
				ctx.lineTo(e.x2, e.y2);
				ctx.stroke();
			});
		});

		ctx.restore();
	}

	/**
	 * Stroke an individual track segment with construction/planned line dash styling or smooth S-curve ramp
	 */
	strokeTrackSegment(ctx, p1, p2, trackW, lineInfo, st1, st2, lineId, alpha, controlPoints = null) {
		const r = this.#renderer;
		const edgeStatus = r.getEdgeStatus(st1, st2, lineId);
		if (!r.showUnderConstruction && edgeStatus === "under_construction") return;
		if (!r.showApproved && (edgeStatus === "approved" || edgeStatus === "proposed" || edgeStatus === "planned")) return;
		if (edgeStatus === "under_construction") {
			ctx.setLineDash([trackW * 2.4, trackW * 1.8]);
			ctx.strokeStyle = "#f59e0b";
		} else if (edgeStatus === "approved") {
			ctx.setLineDash([trackW * 0.6, trackW * 1.6]);
			ctx.strokeStyle = "#0284c7";
		} else {
			ctx.setLineDash([]);
			ctx.strokeStyle = lineInfo?.color || "#64748b";
		}
		ctx.globalAlpha = edgeStatus === "approved" ? alpha * 0.85 : alpha;
		ctx.lineWidth = edgeStatus === "approved" ? trackW * 0.9 : trackW;
		ctx.beginPath();
		ctx.moveTo(p1.sx, p1.sy);
		if (controlPoints && controlPoints.length === 2) {
			ctx.bezierCurveTo(
				controlPoints[0].sx, controlPoints[0].sy,
				controlPoints[1].sx, controlPoints[1].sy,
				p2.sx, p2.sy
			);
		} else {
			ctx.lineTo(p2.sx, p2.sy);
		}
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.globalAlpha = 1.0;
	}

	/**
	 * Check if an edge is active / matches active legend filters
	 */
	isEdgeActive(key, nbr, st1, st2) {
		const r = this.#renderer;
		if (r.activeRouteEdges.size > 0 && r.activeRouteEdges.has(key)) return true;
		if (r.activeLineId && nbr.line === r.activeLineId) return true;
		if (r.activeLayout) {
			const l1 = st1.properties?.layout || "elevated";
			const l2 = st2.properties?.layout || "elevated";
			if (l1 === r.activeLayout || l2 === r.activeLayout) return true;
		}
		if (r.activeStatus) {
			const edgeStatus = r.getEdgeStatus(st1, st2, nbr.line);
			const st1Status = st1.properties?.status || "operational";
			const st2Status = st2.properties?.status || "operational";
			if (r.activeStatus === "planned") {
				if (edgeStatus === "approved" || st1Status === "planned" || st1Status === "approved" || st1Status === "proposed" || st2Status === "planned" || st2Status === "approved" || st2Status === "proposed") return true;
			} else {
				if (edgeStatus === r.activeStatus || st1Status === r.activeStatus || st2Status === r.activeStatus) return true;
			}
		}
		if (r.activeStationType) {
			const type1 = r.getStationType(st1);
			const type2 = r.getStationType(st2);
			if (type1 === r.activeStationType || type2 === r.activeStationType) return true;
		}
		return false;
	}

	drawUndergroundTracks(ctx, drawn = new Set()) {
		const r = this.#renderer;
		const stationData = r.stationData || {};
		const isDimmed = r.isMapDimmed();
		const isLight = r.currentTheme === "light";

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const edgeStatus = r.getEdgeStatus(st1, st2, nbr.line);
				if (!r.showUnderConstruction && edgeStatus === "under_construction") return;
				if (!r.showApproved && (edgeStatus === "approved" || edgeStatus === "proposed" || edgeStatus === "planned")) return;

				const z1 = r.is25D ? r.getLayoutElevation(st1.properties?.layout) : 0;
				const z2 = r.is25D ? r.getLayoutElevation(st2.properties?.layout) : 0;
				const isUnderground = z1 < 0 && z2 < 0;
				if (!isUnderground) return;

				drawn.add(key);

				const isEdgeActive = this.isEdgeActive(key, nbr, st1, st2);
				const alpha = isDimmed ? (isEdgeActive ? 1.0 : 0.22) : 0.85;

				const p1 = r.projectPoint(st1.xy.x, st1.xy.y, z1);
				const p2 = r.projectPoint(st2.xy.x, st2.xy.y, z2);
				const avgScale = ((p1.scale || 1) + (p2.scale || 1)) / 2;
				const trackW = r.getTrackWidth(avgScale);

				const lineInfo = r.linesData[nbr.line];
				this.strokeTrackSegment(ctx, p1, p2, trackW, lineInfo, st1, st2, nbr.line, alpha);
			});
		});

		ctx.restore();
	}

	drawSurfaceTracks(ctx, drawn = new Set()) {
		const r = this.#renderer;
		const stationData = r.stationData || {};
		const isDimmed = r.isMapDimmed();

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const edgeStatus = r.getEdgeStatus(st1, st2, nbr.line);
				if (!r.showUnderConstruction && edgeStatus === "under_construction") return;
				if (!r.showApproved && (edgeStatus === "approved" || edgeStatus === "proposed" || edgeStatus === "planned")) return;

				const z1 = r.is25D ? r.getLayoutElevation(st1.properties?.layout) : 0;
				const z2 = r.is25D ? r.getLayoutElevation(st2.properties?.layout) : 0;
				const isSurface = z1 === 0 && z2 === 0;
				if (!isSurface) return;

				drawn.add(key);

				const isEdgeActive = this.isEdgeActive(key, nbr, st1, st2);
				const alpha = isDimmed ? (isEdgeActive ? 1.0 : 0.22) : 1.0;

				const p1 = r.projectPoint(st1.xy.x, st1.xy.y, z1);
				const p2 = r.projectPoint(st2.xy.x, st2.xy.y, z2);
				const avgScale = ((p1.scale || 1) + (p2.scale || 1)) / 2;
				const trackW = r.getTrackWidth(avgScale);

				const lineInfo = r.linesData[nbr.line];
				this.strokeTrackSegment(ctx, p1, p2, trackW, lineInfo, st1, st2, nbr.line, alpha);
			});
		});

		ctx.restore();
	}

	drawElevatedTracks(ctx, drawn = new Set()) {
		const r = this.#renderer;
		const stationData = r.stationData || {};
		const isDimmed = r.isMapDimmed();

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const edgeStatus = r.getEdgeStatus(st1, st2, nbr.line);
				if (!r.showUnderConstruction && edgeStatus === "under_construction") return;
				if (!r.showApproved && (edgeStatus === "approved" || edgeStatus === "proposed" || edgeStatus === "planned")) return;

				const z1 = r.is25D ? r.getLayoutElevation(st1.properties?.layout) : 0;
				const z2 = r.is25D ? r.getLayoutElevation(st2.properties?.layout) : 0;
				const isElevated = z1 > 0 && z2 > 0;
				if (!isElevated) return;

				drawn.add(key);

				const isEdgeActive = this.isEdgeActive(key, nbr, st1, st2);
				const alpha = isDimmed ? (isEdgeActive ? 1.0 : 0.22) : 1.0;

				const p1 = r.projectPoint(st1.xy.x, st1.xy.y, z1);
				const p2 = r.projectPoint(st2.xy.x, st2.xy.y, z2);
				const avgScale = ((p1.scale || 1) + (p2.scale || 1)) / 2;
				const trackW = r.getTrackWidth(avgScale);

				// In 2.5D, elevated viaduct tracks get a subtle contact drop shadow directly behind them (never separated)
				if (r.is25D && !isDimmed) {
					ctx.save();
					ctx.strokeStyle = "rgba(15, 23, 42, 0.12)";
					ctx.lineWidth = trackW * 1.35;
					const contactOffset = Math.max(0.4, trackW * 0.22);
					ctx.beginPath();
					ctx.moveTo(p1.sx, p1.sy + contactOffset);
					ctx.lineTo(p2.sx, p2.sy + contactOffset);
					ctx.stroke();
					ctx.restore();
				}

				const lineInfo = r.linesData[nbr.line];
				this.strokeTrackSegment(ctx, p1, p2, trackW, lineInfo, st1, st2, nbr.line, alpha);

				// In 2.5D, elevated viaduct tracks get a subtle white inner gleam
				if (r.is25D && !isDimmed) {
					ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
					ctx.lineWidth = trackW * 0.3;
					ctx.beginPath();
					ctx.moveTo(p1.sx, p1.sy);
					ctx.lineTo(p2.sx, p2.sy);
					ctx.stroke();
				}
			});
		});

		ctx.restore();
	}

	drawTransitionTracks(ctx, drawn = new Set()) {
		const r = this.#renderer;
		const stationData = r.stationData || {};
		const isDimmed = r.isMapDimmed();

		ctx.save();
		ctx.lineCap = "round";

		Object.values(stationData).forEach((st1) => {
			if (!st1.neighbors) return;
			st1.neighbors.forEach((nbr) => {
				const key = [st1.id, nbr.station].sort().join("-");
				if (drawn.has(key)) return;

				const st2 = stationData[nbr.station];
				if (!st2 || !st1.xy || !st2.xy) return;

				const edgeStatus = r.getEdgeStatus(st1, st2, nbr.line);
				if (!r.showUnderConstruction && edgeStatus === "under_construction") return;
				if (!r.showApproved && (edgeStatus === "approved" || edgeStatus === "proposed" || edgeStatus === "planned")) return;

				const z1 = r.is25D ? r.getLayoutElevation(st1.properties?.layout) : 0;
				const z2 = r.is25D ? r.getLayoutElevation(st2.properties?.layout) : 0;
				const isTransition = (z1 !== z2);
				if (!isTransition) return;

				drawn.add(key);

				const isEdgeActive = this.isEdgeActive(key, nbr, st1, st2);
				const alpha = isDimmed ? (isEdgeActive ? 1.0 : 0.22) : 1.0;

				const p1 = r.projectPoint(st1.xy.x, st1.xy.y, z1);
				const p2 = r.projectPoint(st2.xy.x, st2.xy.y, z2);
				const avgScale = ((p1.scale || 1) + (p2.scale || 1)) / 2;
				const trackW = r.getTrackWidth(avgScale);

				// 🌁 3D Cubic Bézier S-Curve Ramp:
				// Smoothly transitions between strata with level entry/exit tangents so tracks glide naturally into underground portals without sharp V angles!
				let transitionControlPoints = null;
				if (r.is25D) {
					const dx = st2.xy.x - st1.xy.x;
					const dy = st2.xy.y - st1.xy.y;
					const cp1 = r.projectPoint(st1.xy.x + dx * 0.38, st1.xy.y + dy * 0.38, z1);
					const cp2 = r.projectPoint(st1.xy.x + dx * 0.62, st1.xy.y + dy * 0.62, z2);
					transitionControlPoints = [cp1, cp2];
				}

				const lineInfo = r.linesData[nbr.line];
				this.strokeTrackSegment(ctx, p1, p2, trackW, lineInfo, st1, st2, nbr.line, alpha, transitionControlPoints);
			});
		});

		ctx.restore();
	}

	drawActiveRouteOverlay(ctx) {
		// Route highlight blue line removed as requested.
		// Native metro line tracks already remain 100% vibrant while non-route tracks are dimmed.
	}
}
