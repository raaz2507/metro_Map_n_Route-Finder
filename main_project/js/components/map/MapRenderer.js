/**
 * 🎨 MapRenderer.js - SVG Element & Layer Rendering Engine
 * Responsible for creating SVG roots, group layers, track lines, station circles
 * (including Interchange, Walkway, Multimodal, and Shared-Track glyphs), and 3D route pins.
 */

export class MapRenderer {
	/**
	 * Create root <svg> element configured with viewBox
	 * @param {string} viewBox
	 * @returns {SVGSVGElement}
	 */
	static createSVG(viewBox) {
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		svg.setAttribute("width", "100%");
		svg.setAttribute("height", "100%");
		svg.setAttribute("viewBox", viewBox);
		svg.style.cursor = "grab";
		return svg;
	}

	/**
	 * Create SVG <g> group node
	 * @param {string} [id]
	 * @returns {SVGGElement}
	 */
	static createGroup(id) {
		const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
		if (id) group.setAttribute("id", id);
		return group;
	}

	/**
	 * Standard single station circle
	 */
	static createCircle(x, y, radius = 200, fillColor = "#FDFBD4", strokeColor = "#333") {
		const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		circle.setAttribute("cx", x);
		circle.setAttribute("cy", y);
		circle.setAttribute("r", radius);
		circle.setAttribute("fill", fillColor);
		circle.setAttribute("stroke-width", 50);
		circle.setAttribute("stroke", strokeColor);
		return circle;
	}

	/**
	 * Interchange station concentric double circle
	 */
	static createInterchangeCircle(x, y, radius = 200, fillColor = "#FDFBD4", strokeColor = "#333") {
		const group = this.createGroup();

		// Outer concentric ring
		const outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		outer.setAttribute("cx", x);
		outer.setAttribute("cy", y);
		outer.setAttribute("r", radius + 60);
		outer.setAttribute("fill", fillColor);
		outer.setAttribute("stroke-width", 38);
		outer.setAttribute("stroke", strokeColor);

		// Inner glowing core
		const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		inner.setAttribute("cx", x);
		inner.setAttribute("cy", y);
		inner.setAttribute("r", radius - 50);
		inner.setAttribute("fill", strokeColor);
		inner.setAttribute("stroke-width", 30);
		inner.setAttribute("stroke", "#ffffff");

		group.appendChild(outer);
		group.appendChild(inner);
		return group;
	}

	/**
	 * Walkway transfer station with dashed perimeter
	 */
	static createWalkwayCircle(x, y, radius = 200, fillColor = "#FDFBD4", strokeColor = "#333") {
		const group = this.createGroup();

		// Dashed outer ring
		const outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		outer.setAttribute("cx", x);
		outer.setAttribute("cy", y);
		outer.setAttribute("r", radius + 20);
		outer.setAttribute("fill", fillColor);
		outer.setAttribute("stroke-width", 40);
		outer.setAttribute("stroke", strokeColor);
		outer.setAttribute("stroke-dasharray", "50,35");

		// Inner pulse dot
		const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		dot.setAttribute("cx", x);
		dot.setAttribute("cy", y);
		dot.setAttribute("r", 90);
		dot.setAttribute("fill", strokeColor);

		group.appendChild(outer);
		group.appendChild(dot);
		return group;
	}

	/**
	 * Multimodal transport hub squircle
	 */
	static createMultimodalHub(x, y, radius = 200, fillColor = "#FDFBD4", strokeColor = "#333") {
		const group = this.createGroup();
		const size = 440;
		const offset = size / 2;

		// Rounded square hub
		const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		rect.setAttribute("x", x - offset);
		rect.setAttribute("y", y - offset);
		rect.setAttribute("width", size);
		rect.setAttribute("height", size);
		rect.setAttribute("rx", 120);
		rect.setAttribute("fill", fillColor);
		rect.setAttribute("stroke", "#c084fc");
		rect.setAttribute("stroke-width", 45);

		// Inner core dot
		const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		core.setAttribute("cx", x);
		core.setAttribute("cy", y);
		core.setAttribute("r", 95);
		core.setAttribute("fill", "#c084fc");

		group.appendChild(rect);
		group.appendChild(core);
		return group;
	}

	/**
	 * Shared-track tandem capsule pill
	 */
	static createSharedTrackNode(x, y, radius = 200, fillColor = "#FDFBD4", strokeColor = "#333") {
		const group = this.createGroup();
		const w = 500;
		const h = 280;

		// Capsule pill
		const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		pill.setAttribute("x", x - w / 2);
		pill.setAttribute("y", y - h / 2);
		pill.setAttribute("width", w);
		pill.setAttribute("height", h);
		pill.setAttribute("rx", h / 2);
		pill.setAttribute("fill", fillColor);
		pill.setAttribute("stroke", "#f43f5e");
		pill.setAttribute("stroke-width", 40);

		// Left tandem node
		const leftDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		leftDot.setAttribute("cx", x - 120);
		leftDot.setAttribute("cy", y);
		leftDot.setAttribute("r", 55);
		leftDot.setAttribute("fill", "#f43f5e");

		// Right tandem node
		const rightDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		rightDot.setAttribute("cx", x + 120);
		rightDot.setAttribute("cy", y);
		rightDot.setAttribute("r", 55);
		rightDot.setAttribute("fill", "#f43f5e");

		group.appendChild(pill);
		group.appendChild(leftDot);
		group.appendChild(rightDot);
		return group;
	}

	/**
	 * Track line segment with status styling
	 */
	static createLine(x1, y1, x2, y2, strokeColor, strokeWidth = 50, status = "operational") {
		const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		line.setAttribute("x1", x1);
		line.setAttribute("y1", y1);
		line.setAttribute("x2", x2);
		line.setAttribute("y2", y2);
		line.setAttribute("stroke", strokeColor);
		line.setAttribute("stroke-width", strokeWidth);
		line.dataset.status = status;

		if (status === "under_construction") {
			line.classList.add("track-under-construction");
		} else if (status === "approved" || status === "proposed") {
			line.classList.add("track-approved");
		}
		return line;
	}

	/**
	 * Automatic Station Type Resolver
	 * @param {Object} station
	 * @param {Object} metroData
	 * @returns {string} "walkway" | "multimodal" | "shared_track" | "interchange" | "normal"
	 */
	static getStationType(station, metroData = {}) {
		if (station.properties?.station_type) return station.properties.station_type;
		if (station.station_type) return station.station_type;
		const stationId = station.id;
		const stTransfers = metroData.transfers?.[stationId];
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
			const hasSharedLine = stLines.some((lId) => metroData.lines?.[lId]?.sharedTrack);
			if (hasSharedLine) return "shared_track";
			return "interchange";
		}
		return "normal";
	}

	/**
	 * Draw metro line track segments (Batch Fragment for 60 FPS single reflow)
	 * @param {Object} params
	 * @param {SVGGElement} params.mainGroup
	 * @param {Object} params.metroData
	 * @returns {SVGGElement}
	 */
	static drawMetroLines({ mainGroup, metroData }) {
		const tracks_lineGroup = this.createGroup("metroLines");
		const fragment = document.createDocumentFragment();
		const drawn = new Set();
		const stationData = metroData.stationData || {};

		Object.values(stationData).forEach((station) => {
			if (!station.neighbors) return;
			station.neighbors.forEach((neighbor) => {
				const key = [station.id, neighbor.station].sort().join("-");
				if (drawn.has(key)) return;

				drawn.add(key);
				const nextStation = stationData[neighbor.station];
				if (!nextStation || !station.xy || !nextStation.xy) return;

				const lineInfo = metroData.lines?.[neighbor.line];
				const lineColor = lineInfo?.color ?? "#333";
				const lineStatus = lineInfo?.status || "operational";
				const st1Status = station.properties?.status || "operational";
				const st2Status = nextStation.properties?.status || "operational";

				let effectiveStatus = lineStatus;
				if (lineStatus === "under_construction" || st1Status === "under_construction" || st2Status === "under_construction") {
					effectiveStatus = "under_construction";
				} else if (lineStatus === "approved" || lineStatus === "proposed" || st1Status === "approved" || st2Status === "approved" || st1Status === "proposed" || st2Status === "proposed") {
					effectiveStatus = "approved";
				}

				const line = this.createLine(
					station.xy.x,
					station.xy.y,
					nextStation.xy.x,
					nextStation.xy.y,
					lineColor,
					100,
					effectiveStatus
				);
				line.dataset.edgeId = key;
				line.dataset.fromStation = station.id;
				line.dataset.lineId = neighbor.line;
				line.dataset.status = effectiveStatus;
				fragment.appendChild(line);
			});
		});

		tracks_lineGroup.appendChild(fragment);
		mainGroup.appendChild(tracks_lineGroup);
		return tracks_lineGroup;
	}

	/**
	 * Draw station circles and glyphs (Batch Fragment for 60 FPS single reflow)
	 * @param {Object} params
	 * @param {SVGGElement} params.mainGroup
	 * @param {Object} params.metroData
	 * @returns {SVGGElement}
	 */
	static drawStationCircles({ mainGroup, metroData }) {
		const stations_circleGroup = this.createGroup("stationCircles");
		const fragment = document.createDocumentFragment();
		const stationData = metroData.stationData || {};

		Object.values(stationData).forEach((station) => {
			const xy = station.xy;
			if (xy) {
				const firstLineId = station.lines?.[0];
				const lineInfo = metroData.lines?.[firstLineId];
				const lineColor = lineInfo?.color ?? "#333";
				const stationType = this.getStationType(station, metroData);
				let elem;

				if (stationType === "walkway") {
					elem = this.createWalkwayCircle(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				} else if (stationType === "multimodal") {
					elem = this.createMultimodalHub(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				} else if (stationType === "shared_track") {
					elem = this.createSharedTrackNode(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				} else if (stationType === "interchange") {
					elem = this.createInterchangeCircle(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				} else {
					elem = this.createCircle(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				}

				const stationStatus = station.properties?.status || "operational";
				elem.dataset.stationId = station.id;
				elem.dataset.stationType = stationType;
				elem.dataset.status = stationStatus;

				if (stationStatus === "under_construction") {
					elem.classList.add("station-under-construction");
				} else if (stationStatus === "approved" || stationStatus === "proposed") {
					elem.classList.add("station-approved");
				}
				fragment.appendChild(elem);
			}
		});

		stations_circleGroup.appendChild(fragment);
		mainGroup.appendChild(stations_circleGroup);
		return stations_circleGroup;
	}

	/**
	 * Initialize permanent 3D route ribbon pins (Hidden by default)
	 * @param {SVGGElement} mainGroup
	 * @returns {{ layer: SVGGElement, from: SVGGElement, to: SVGGElement }}
	 */
	static initRoutePins(mainGroup) {
		const layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
		layer.id = "routePinsLayer";

		const createPin = (type, iconFile) => {
			const pin = document.createElementNS("http://www.w3.org/2000/svg", "g");
			pin.id = `mapPin_${type}`;
			pin.setAttribute("class", `route-pin-badge route-pin-${type}`);
			pin.style.display = "none";
			const S = 25;
			pin.innerHTML = `
				<g class="pin-drop-anim">
					<image href="assets/icons/${iconFile}" 
					xlink:href="assets/icons/${iconFile}" 
					x="${-58 * S}" y="${-58 * S}" 
					width="${116 * S}" height="${66 * S}" 
					preserveAspectRatio="xMidYMid meet" />
				</g>
			`;
			return pin;
		};

		const fromPin = createPin("from", "pin_route_from.svg");
		const toPin = createPin("to", "pin_route_to.svg");
		layer.appendChild(fromPin);
		layer.appendChild(toPin);

		mainGroup.appendChild(layer);
		return { layer, from: fromPin, to: toPin };
	}

	/**
	 * Position and display a route pin on a specific station
	 * @param {Object} pins
	 * @param {"from"|"to"} type
	 * @param {string} stationId
	 * @param {number|null} x
	 * @param {number|null} y
	 * @param {Object} stationData
	 */
	static setRoutePin(pins, type, stationId, x = null, y = null, stationData = {}) {
		const pin = type === "from" ? pins?.from : pins?.to;
		if (!pin) return;

		if (x == null || y == null) {
			const st = stationData[stationId];
			if (st?.xy) {
				x = st.xy.x;
				y = st.xy.y;
			}
		}

		if (x == null || isNaN(x) || y == null || isNaN(y)) {
			pin.style.display = "none";
			return;
		}

		pin.setAttribute("transform", `translate(${x}, ${y})`);
		pin.style.display = "";

		// SVG getBoundingClientRect triggers reflow to replay CSS keyframe bounce
		const animEl = pin.querySelector(".pin-drop-anim");
		if (animEl) {
			animEl.style.animation = "none";
			void animEl.getBoundingClientRect();
			animEl.style.animation = "";
		}
	}

	/**
	 * Hide both route pins
	 * @param {Object} pins
	 */
	static clearRoutePins(pins) {
		if (pins?.from) pins.from.style.display = "none";
		if (pins?.to) pins.to.style.display = "none";
	}
}
