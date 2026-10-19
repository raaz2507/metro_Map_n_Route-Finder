/**
 * 🏷️ MapLabelEngine.js - High-Performance SVG Station Label Rendering Engine
 * Responsible for word wrapping station names, 8-quadrant collision-free placement,
 * multi-line SVG <tspan> formatting, and batch single-reflow DOM insertion.
 */

export class MapLabelEngine {
	#centerClass = null;
	#mainGroup = null;
	#stationData = null;
	#labelGeometryCache = null;
	#currentLabelGroup = null;

	constructor({ centerClass = null, mainGroup, stationData, labelGeometryCache }) {
		this.#centerClass = centerClass;
		this.#mainGroup = mainGroup;
		this.#stationData = stationData;
		this.#labelGeometryCache = labelGeometryCache;
	}

	get labelGroup() {
		return this.#currentLabelGroup;
	}

	/**
	 * Intelligent word wrapping for station labels (e.g. parenthesis separation)
	 * @param {string} str
	 * @returns {Array<string>}
	 */
	static getWrappedLines(str) {
		if (!str) return [str];
		const trimmed = str.trim();

		const parenMatch = trimmed.match(/^([^(]+)\s*(\(.*\))$/);
		if (parenMatch) {
			return [parenMatch[1].trim(), parenMatch[2].trim()];
		}

		const words = trimmed.split(/\s+/);
		if (trimmed.length <= 8 || words.length <= 1) {
			return [trimmed];
		}

		let line1 = "";
		let line2 = "";
		const targetLen = trimmed.length / 2;

		for (let i = 0; i < words.length; i++) {
			if ((line1 + words[i]).length <= targetLen + 2 || i === 0) {
				line1 += (line1 ? " " : "") + words[i];
			} else {
				line2 += (line2 ? " " : "") + words[i];
			}
		}
		return line2 ? [line1, line2] : [line1];
	}

	/**
	 * Render station text labels for the selected language
	 * @param {string} [lang="en"]
	 * @returns {SVGGElement}
	 */
	drawStationLabels(lang = "en") {
		if (this.#currentLabelGroup) {
			this.#currentLabelGroup.remove();
			this.#currentLabelGroup = null;
		}

		const labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
		labelGroup.setAttribute("id", "stationLabels");

		const fragment = document.createDocumentFragment();
		const stations = Object.values(this.#stationData || {});

		stations.forEach((station) => {
			if (!station.xy) return;

			// Instant cached orientation data
			const cachedGeom = this.#labelGeometryCache?.get(station.id) || {
				junctionQuad: null,
				isDiagonalTrack: false,
				isDiagonalNWSE: false,
				isHorizontalTrack: true,
				isEven: true,
			};

			const rawName = this.#centerClass?.getStationName?.(station.id) || station.name || "";
			const lines = MapLabelEngine.getWrappedLines(rawName);

			let x = station.xy.x;
			let y = station.xy.y;
			let textAnchor = "middle";
			let dominantBaseline = "alphabetic";

			const { junctionQuad, isDiagonalTrack, isDiagonalNWSE, isHorizontalTrack, isEven } = cachedGeom;

			if (junctionQuad) {
				if (junctionQuad === "TOP") {
					x = station.xy.x;
					y = station.xy.y - 260 - (lines.length - 1) * 418;
					textAnchor = "middle";
					dominantBaseline = "alphabetic";
				} else if (junctionQuad === "BOTTOM") {
					x = station.xy.x;
					y = station.xy.y + 260;
					textAnchor = "middle";
					dominantBaseline = "hanging";
				} else if (junctionQuad === "LEFT") {
					x = station.xy.x - 260;
					y = station.xy.y;
					textAnchor = "end";
					dominantBaseline = "central";
				} else if (junctionQuad === "RIGHT") {
					x = station.xy.x + 260;
					y = station.xy.y;
					textAnchor = "start";
					dominantBaseline = "central";
				} else if (junctionQuad === "TR") {
					x = station.xy.x + 240;
					y = station.xy.y - 240 - (lines.length - 1) * 418;
					textAnchor = "start";
					dominantBaseline = "alphabetic";
				} else if (junctionQuad === "TL") {
					x = station.xy.x - 240;
					y = station.xy.y - 240 - (lines.length - 1) * 418;
					textAnchor = "end";
					dominantBaseline = "alphabetic";
				} else if (junctionQuad === "BR") {
					x = station.xy.x + 240;
					y = station.xy.y + 240;
					textAnchor = "start";
					dominantBaseline = "hanging";
				} else if (junctionQuad === "BL") {
					x = station.xy.x - 240;
					y = station.xy.y + 240;
					textAnchor = "end";
					dominantBaseline = "hanging";
				}
			} else if (isDiagonalTrack) {
				if (isDiagonalNWSE) {
					if (isEven) {
						x = station.xy.x + 280;
						y = station.xy.y - 280 - (lines.length - 1) * 418;
						textAnchor = "start";
						dominantBaseline = "alphabetic";
					} else {
						x = station.xy.x - 280;
						y = station.xy.y + 280;
						textAnchor = "end";
						dominantBaseline = "hanging";
					}
				} else {
					if (isEven) {
						x = station.xy.x - 280;
						y = station.xy.y - 280 - (lines.length - 1) * 418;
						textAnchor = "end";
						dominantBaseline = "alphabetic";
					} else {
						x = station.xy.x + 280;
						y = station.xy.y + 280;
						textAnchor = "start";
						dominantBaseline = "hanging";
					}
				}
			} else if (isHorizontalTrack) {
				x = station.xy.x;
				if (isEven) {
					const extraTopShift = (lines.length - 1) * 418;
					y = station.xy.y - 260 - extraTopShift;
					dominantBaseline = "alphabetic";
				} else {
					y = station.xy.y + 260;
					dominantBaseline = "hanging";
				}
				textAnchor = "middle";
			} else {
				x = isEven ? station.xy.x - 260 : station.xy.x + 260;
				y = station.xy.y;
				textAnchor = isEven ? "end" : "start";
				dominantBaseline = "central";
			}

			// SVG Text element
			const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
			text.setAttribute("x", x);
			text.setAttribute("y", y);
			text.setAttribute("font-size", 380);
			text.setAttribute("font-family", "Arial, sans-serif");
			text.setAttribute("fill", "#222");
			text.setAttribute("text-anchor", textAnchor);
			text.setAttribute("dominant-baseline", dominantBaseline);
			const stationType = station.properties?.station_type || (station.lines?.length > 1 ? "interchange" : "normal");
			text.dataset.stationId = station.id;
			text.dataset.stationType = stationType;
			text.dataset.status = station.properties?.status || "operational";
			text.classList.add(`label-${stationType}`);

			if (lines.length === 1) {
				text.textContent = lines[0];
			} else {
				lines.forEach((lineText, idx) => {
					const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
					tspan.setAttribute("x", x);
					if (idx > 0) {
						tspan.setAttribute("dy", "1.1em");
					}
					tspan.textContent = lineText;
					text.appendChild(tspan);
				});
			}

			fragment.appendChild(text);
		});

		labelGroup.appendChild(fragment);
		this.#mainGroup.appendChild(labelGroup);
		this.#currentLabelGroup = labelGroup;
		return labelGroup;
	}

	destroy() {
		if (this.#currentLabelGroup) {
			this.#currentLabelGroup.remove();
			this.#currentLabelGroup = null;
		}
	}
}
