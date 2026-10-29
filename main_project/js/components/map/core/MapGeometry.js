/**
 * 📐 MapGeometry.js - Pure Mathematical & Coordinate Projection Engine
 * Responsible for Lat/Lon bounding boxes, Mercator projection to SVG space,
 * sequence mapping, and 8-quadrant geometric label clearance calculations.
 */

import { APP_CONFIG } from "../../../config/app-config.js";

export const EARTH_SCALE = 111320; // Meters per degree
export const DEFAULT_SCALE_MULTIPLIER = APP_CONFIG.MAP?.SCALE_MULTIPLIER || 2.2;

export class MapGeometry {
	/**
	 * Canonical layout classifier for metro infrastructure across 2D, 2.5D, and 3D
	 * @param {string} layout
	 * @returns {"elevated"|"underground"|"cut_and_cover"|"surface"}
	 */
	static classifyLayout(layout) {
		const l = (layout || "").toLowerCase().trim();
		if (l.includes("cut_and_cover") || l.includes("cut-and-cover") || l.includes("trench")) return "cut_and_cover";
		if (l.includes("underground") || l.includes("tunnel") || l.includes("subway")) return "underground";
		if (l.includes("at-grade") || l.includes("at grade") || l.includes("surface") || l.includes("ground") || l.includes("multi_level")) return "surface";
		return "elevated";
	}

	/**
	 * Returns real-world elevation in meters based on infrastructure layout
	 * @param {string} layout
	 * @returns {number} Real elevation in meters (+14m elevated, -16m underground, -7m cut-and-cover, 0m surface)
	 */
	static getRealElevationMeters(layout) {
		const type = this.classifyLayout(layout);
		const cfg = APP_CONFIG?.MAP?.REAL_METERS || APP_CONFIG?.MAP?.THREE_D?.REAL_METERS || {};
		switch (type) {
			case "underground":
				return cfg.UNDERGROUND_DEPTH ?? -16.0;
			case "cut_and_cover":
				return cfg.CUT_AND_COVER_DEPTH ?? ((cfg.UNDERGROUND_DEPTH ?? -16.0) * 0.45);
			case "surface":
				return cfg.AT_GRADE_HEIGHT ?? 0.0;
			case "elevated":
			default:
				return cfg.VIADUCT_HEIGHT ?? 14.0;
		}
	}

	/**
	 * Converts real-world meters to SVG world coordinate units
	 * @param {number} meters
	 * @param {number} [scaleMultiplier=DEFAULT_SCALE_MULTIPLIER]
	 * @returns {number} World SVG units
	 */
	static metersToWorldUnits(meters, scaleMultiplier = DEFAULT_SCALE_MULTIPLIER) {
		return meters * scaleMultiplier;
	}

	/**
	 * Converts SVG world coordinate units to real-world meters
	 * @param {number} units
	 * @param {number} [scaleMultiplier=DEFAULT_SCALE_MULTIPLIER]
	 * @returns {number} Real meters
	 */
	static worldUnitsToMeters(units, scaleMultiplier = DEFAULT_SCALE_MULTIPLIER) {
		return units / (scaleMultiplier || 1);
	}

	/**
	 * Calculate bounding box (min/max Lat/Lon) from station coordinates
	 * @param {Object} stationData
	 * @returns {{ minLat: number, maxLat: number, minLon: number, maxLon: number }}
	 */
	static getBounds(stationData = {}) {
		let minLat = Infinity;
		let maxLat = -Infinity;
		let minLon = Infinity;
		let maxLon = -Infinity;

		Object.values(stationData).forEach((station) => {
			const dec = station.location?.decimal;
			if (dec && dec.lat != null && dec.lon != null && dec.lat !== "") {
				const lat = Number(dec.lat);
				const lon = Number(dec.lon);
				if (lat < minLat) minLat = lat;
				if (lat > maxLat) maxLat = lat;
				if (lon < minLon) minLon = lon;
				if (lon > maxLon) maxLon = lon;
			}
		});

		return { minLat, maxLat, minLon, maxLon };
	}

	/**
	 * Compute SVG dimensions based on Lat/Lon bounds and Earth scale
	 * @param {Object} bounds
	 * @param {number} scaleMultiplier
	 * @returns {{ width: number, height: number, avgLatRad: number }}
	 */
	static calculateSVGSize(bounds, scaleMultiplier = DEFAULT_SCALE_MULTIPLIER) {
		const avgLat = (bounds.minLat + bounds.maxLat) / 2;
		const avgLatRad = (avgLat * Math.PI) / 180; // Convert to radians for cosine projection

		const width = Math.round(
			(bounds.maxLon - bounds.minLon) *
				EARTH_SCALE *
				scaleMultiplier *
				Math.cos(avgLatRad),
		);
		const height = Math.round(
			(bounds.maxLat - bounds.minLat) *
				EARTH_SCALE *
				scaleMultiplier,
		);

		return { width, height, avgLatRad };
	}

	/**
	 * Compute network-aware dynamic zoom boundaries and station focus zoom scale
	 * @param {Object} bounds
	 * @param {number} [scaleMultiplier=DEFAULT_SCALE_MULTIPLIER]
	 * @returns {{ minZoom: number, maxZoom: number, stationFocusZoom: number, maxDim: number, width: number, height: number }}
	 */
	static calculateZoomRange(bounds, scaleMultiplier = DEFAULT_SCALE_MULTIPLIER) {
		const { width, height } = this.calculateSVGSize(bounds, scaleMultiplier);
		const maxDim = Math.max(width, height);

		// Field of view for comfortable station focus (~8,000 SVG units shows clicked station + 2-3 neighbors)
		const targetStationFOV = 8000;
		const stationFocusZoom = Math.max(1.8, Math.round((maxDim / targetStationFOV) * 10) / 10);

		// Max zoom: close-up on a station node and its platforms (~3,500 SVG units field of view)
		const maxZoom = Math.max(3.5, Math.round((maxDim / 3500) * 10) / 10);

		// Min zoom: view entire network with surrounding breathing room
		const minZoom = 0.4;

		return {
			minZoom,
			maxZoom,
			stationFocusZoom,
			maxDim,
			width,
			height,
		};
	}

	/**
	 * Compute viewBox string and margins with standard padding
	 * @param {Object} bounds
	 * @param {number} scaleMultiplier
	 * @param {number} marginPercent
	 * @returns {{ viewBox: string, margin: number, width: number, height: number, avgLatRad: number, minX: number, minY: number }}
	 */
	static calculateViewBox(bounds, scaleMultiplier = DEFAULT_SCALE_MULTIPLIER, marginPercent = 0.05) {
		const { width, height, avgLatRad } = this.calculateSVGSize(bounds, scaleMultiplier);
		const margin = Math.round(Math.max(width, height) * marginPercent);
		const viewBox = `-${margin} -${margin} ${width + 2 * margin} ${height + 2 * margin}`;

		return { viewBox, margin, width, height, avgLatRad, minX: -margin, minY: -margin };
	}

	/**
	 * Convert station Lat/Lon to SVG Cartesian (x, y) coordinates
	 * @param {Object} stationData
	 * @param {Object} bounds
	 * @param {number} avgLatRad
	 * @param {number} scaleMultiplier
	 */
	static convertLatLonToXY(stationData = {}, bounds, avgLatRad, scaleMultiplier = DEFAULT_SCALE_MULTIPLIER) {
		Object.values(stationData).forEach((station) => {
			const dec = station.location?.decimal;
			if (!dec || dec.lat == null || dec.lon == null || dec.lat === "") return;
			const lat = Number(dec.lat);
			const lon = Number(dec.lon);
			const x = (lon - bounds.minLon) * EARTH_SCALE * scaleMultiplier * Math.cos(avgLatRad);
			const y = (bounds.maxLat - lat) * EARTH_SCALE * scaleMultiplier;
			station.xy = { x, y };
		});
	}

	/**
	 * Calculate BFS sequence map starting from leaf stations (degree 1)
	 * @param {Object} stationData
	 * @returns {Map<string, number>}
	 */
	static calculateStationSequenceMap(stationData = {}) {
		const sequenceMap = new Map();
		const visited = new Set();

		const leafStations = Object.values(stationData).filter(
			(st) => st.neighbors && st.neighbors.length === 1,
		);

		const queue = [];
		leafStations.forEach((st) => {
			queue.push({ id: st.id, step: 0 });
			visited.add(st.id);
			sequenceMap.set(st.id, 0);
		});

		while (queue.length > 0) {
			const { id, step } = queue.shift();
			const st = stationData[id];
			if (!st || !st.neighbors) continue;

			st.neighbors.forEach((nbr) => {
				if (!visited.has(nbr.station)) {
					visited.add(nbr.station);
					sequenceMap.set(nbr.station, step + 1);
					queue.push({ id: nbr.station, step: step + 1 });
				}
			});
		}

		return sequenceMap;
	}

	/**
	 * Full 8-Quadrant Empty Sector Selector for Junctions & Curved Stations
	 * @param {Object} station
	 * @param {Object} stationData
	 * @returns {string|null} "TOP" | "BOTTOM" | "LEFT" | "RIGHT" | "TR" | "TL" | "BR" | "BL"
	 */
	static getBestLabelQuadrant(station, stationData = {}) {
		if (!station.neighbors || station.neighbors.length < 3) return null;

		const angles = [];
		station.neighbors.forEach((nbr) => {
			const nbrSt = stationData[nbr.station];
			if (nbrSt && nbrSt.xy) {
				const rad = Math.atan2(nbrSt.xy.y - station.xy.y, nbrSt.xy.x - station.xy.x);
				let deg = (rad * 180) / Math.PI;
				if (deg < 0) deg += 360;
				angles.push(deg);
			} else {
				console.warn(`[Metro Map Label Warning] Neighbor station "${nbr.station}" missing in stationData for label angle calculation of "${station.id}"!`);
			}
		});

		const quadrants = [
			{ name: "TOP", angle: 270 },
			{ name: "BOTTOM", angle: 90 },
			{ name: "LEFT", angle: 180 },
			{ name: "RIGHT", angle: 0 },
			{ name: "TR", angle: 315 },
			{ name: "TL", angle: 225 },
			{ name: "BR", angle: 45 },
			{ name: "BL", angle: 135 },
		];

		let bestQuad = "TR";
		let maxClearance = -1;

		quadrants.forEach((q) => {
			let minDiff = 360;
			angles.forEach((a) => {
				let diff = Math.abs(q.angle - a);
				if (diff > 180) diff = 360 - diff;
				if (diff < minDiff) minDiff = diff;
			});
			if (minDiff > maxClearance) {
				maxClearance = minDiff;
				bestQuad = q.name;
			}
		});

		return bestQuad;
	}

	/**
	 * Precalculate track orientations and clearances for all stations
	 * @param {Object} stationData
	 * @returns {Map<string, Object>}
	 */
	static precalculateLabelGeometry(stationData = {}) {
		const labelGeometryCache = new Map();
		const sequenceMap = this.calculateStationSequenceMap(stationData);
		const stations = Object.values(stationData);

		stations.forEach((station, index) => {
			if (!station.xy) return;

			let isHorizontalTrack = true;
			let isDiagonalTrack = false;
			let isDiagonalNWSE = false;

			if (station.neighbors && station.neighbors.length > 0) {
				const neighborId = station.neighbors[0].station;
				const neighbor = stationData[neighborId];
				if (neighbor && neighbor.xy) {
					const rawDx = neighbor.xy.x - station.xy.x;
					const rawDy = neighbor.xy.y - station.xy.y;
					const dx = Math.abs(rawDx);
					const dy = Math.abs(rawDy);
					const maxDiff = Math.max(dx, dy);

					if (maxDiff > 0 && Math.abs(dx - dy) < maxDiff * 0.45) {
						isDiagonalTrack = true;
						if ((rawDx > 0 && rawDy > 0) || (rawDx < 0 && rawDy < 0)) {
							isDiagonalNWSE = true;
						}
					} else if (dy > dx) {
						isHorizontalTrack = false;
					}
				}
			}

			const sequenceStep = sequenceMap.get(station.id) ?? index;
			const isEven = sequenceStep % 2 === 0;
			const junctionQuad = this.getBestLabelQuadrant(station, stationData);

			labelGeometryCache.set(station.id, {
				junctionQuad,
				isDiagonalTrack,
				isDiagonalNWSE,
				isHorizontalTrack,
				isEven
			});
		});

		return labelGeometryCache;
	}
}
