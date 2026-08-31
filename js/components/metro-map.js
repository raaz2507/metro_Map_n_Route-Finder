
import { createDOMFromMap } from "./dom-builder.js";

const earthScale = 111320; // Meters per degree

export class MetroMap {
	// =========================================================================
	// 1. PRIVATE PROPERTIES
	// =========================================================================
	#elemts = { mapContainer: null };
	#svg = {
		elements: {
			svg: null, // 'root' की जगह 'svg' (यह स्पष्ट करता है कि यह <svg> नोड है)
			mainGroup_layer: null, // 'viewport' (यह नाम बिल्कुल सही है)
			tracks_lineGroup: null, // 'connections' की जगह 'tracks' (या 'lines' - मेट्रो के लिए अधिक स्वाभाविक है)
			stations_circleGroup: null, // 'stations' (यह भी बिल्कुल सही है)
			labelGroup: null, // 'labels' (यह भी बिल्कुल सही है)
		},
		width: 1000,
		height: 1000,
	};

	#settings = { currentTheme: "light", currentLang: "en" };
	#metroData = { stationData: null };
	#bounds = null; // बाउंड्स स्टोर करने के लिए
	#avgLatRad = 0; // रेडियन वैल्यू स्टोर करने के लिए
	zoomScale = 1; // Metro map zoom factor
	#pan = {
		panX: 0, // X-अक्ष पर मैप का विस्थापन (panX)
		panY: 0, // Y-अक्ष पर मैप का विस्थापन (panY)
		isPanning: false, // क्या यूज़र ड्रैग कर रहा है?
		startX: 0, // माउस/टच शुरू होने का X पॉइंट
		startY: 0, // माउस/टच शुरू होने का Y पॉइंट
	};

	#scaleMultiplier = 2.0;

	// =========================================================================
	// 2. LIFECYCLE / CONSTRUCTOR
	// =========================================================================
	constructor({ mapContainerSelector = null, metroData = null, onClearRoute = null  }) {
		this.#elemts.mapContainer = document.querySelector(mapContainerSelector);
		this.#metroData = metroData;
        this.onClearRoute = onClearRoute; 
		this.#init();
	}

	// =========================================================================
	// 3. setter Methods
	// =========================================================================
	set setLanguage(selectedLang) {
		this.#drawStationLabels(selectedLang);
		this.#legendGenerator(selectedLang);
	}
	set setTheme(selectedLang) {}

	#get_element() {}

	#init() {
		this.#get_element();

		// this.#plusCode2Coordinates();

		this.#getBounds();
		const avgLat = (this.#bounds.minLat + this.#bounds.maxLat) / 2;
		this.#avgLatRad = (avgLat * Math.PI) / 180;

		// setup the SVG viewBox and dimensions based on the calculated bounds
		this.#Lat_Lon_to_X_Y_Conversion();
		// this.#calculateNeighborDistance();

		// Generate station list for datalist and legend for lines

		this.#legendGenerator(this.#settings.currentLang);

		//svg rendering
		this.#create_svg();
		this.#drawMetroLines();
		this.#drawStationCircles();
		this.#drawStationLabels(this.#settings.currentLang);

		this.#set_events();
	}

	#legendGenerator(lang = "en") {
		// Check if the legend panel elements are already created
		// prettier-ignore
		if (!this.#elemts.track_line_legend) {
			const legendPanelElemtMap = {
                // 0. Legend Toggle Button
                legendToggleBtn: { type: "button", cls: "metro-btn-overlay", html_con: "Legend", },

				// 0.1 Clear Route Highlight Overlay Button (Legend button ke left me align)
				clearRouteBtn: { 
					type: "button", 
					id: "clearRouteHighlightBtn", 
					cls: "clear-route-highlight-btn hidden", 
					html_con: `<span class="icon" aria-hidden="true">✕</span><span data-i18n="pages.home.map.clearRoute">Clear Route</span>` 
				},

                // क्लोज़ बटन "X"
                legendCloseBtn: { type: "button", id: "legendCloseBtn", cls: "legend-close-btn", html_con: "×", parent: "legendPanel" },

				// 1. Main Panel Wrapper
				legendPanel: { type: "div", cls: "legend-panel" },
				// Main Header
				mainHeader: { type: "h2", html_con: "Legend", parent: "legendPanel" },
				// 2. Section: Metro Track Lines
				trackSection: { type: "div", cls: "legend-section", parent: "legendPanel" },
				trackHeader: { type: "h3", html_con: "Metro Track Lines", parent: "trackSection" },
				track_line_legend: { type: "ul", id: "track_line_legend", parent: "trackSection" },
				// 3. Section: Station Type
				stationSection: { type: "div", cls: "legend-section", parent: "legendPanel" },
				stationHeader: { type: "h3", html_con: "Station Type", parent: "stationSection" },
				station_type_legend: { type: "ul", id: "station_type_legend", parent: "stationSection" }
			};

			const legendPanelElemts = createDOMFromMap(legendPanelElemtMap, this.#elemts.mapContainer);
			this.#elemts.legendToggleBtn = legendPanelElemts.legendToggleBtn;
			this.#elemts.track_line_legend = legendPanelElemts.track_line_legend;
			this.#elemts.station_type_legend = legendPanelElemts.station_type_legend;
            this.#elemts.legendPanel = legendPanelElemts.legendPanel;
			this.#elemts.clearRouteBtn = legendPanelElemts.clearRouteBtn;

            // Clear Route Button click listener
            if (legendPanelElemts.clearRouteBtn) {
                legendPanelElemts.clearRouteBtn.addEventListener("click", () => {
                    this.highlightRoute(null); // Map route remove karein
                    if (typeof this.onClearRoute === "function") {
                        this.onClearRoute(); // Dashboard ko inform karein (Journey details clear karne ke liye)
                    }
                });
            }

            // 1. जब 'Legend' बटन पर क्लिक हो
            legendPanelElemts.legendToggleBtn.addEventListener("click", () => {
                legendPanelElemts.legendToggleBtn.style.display = "none"; // बटन छुपाएं
                legendPanelElemts.legendPanel.classList.add("active");    // लेजेंड पैनल दिखाएं
            });
            // 2. जब क्लोज़ बटन "×" पर क्लिक हो
            legendPanelElemts.legendCloseBtn.addEventListener("click", (e) => {
                e.stopPropagation(); // क्लिक इवेंट को पैरेंट (पैनल) तक जाने से रोकें
                legendPanelElemts.legendPanel.classList.remove("active"); // पैनल छुपाएं
                legendPanelElemts.legendToggleBtn.style.display = "";     // CSS flex layout ko natural restore karein
            });
            // 3. जब लेजेंड पैनल कंटेनर पर कहीं भी क्लिक हो
            legendPanelElemts.legendPanel.addEventListener("click", () => {
                legendPanelElemts.legendPanel.classList.remove("active");
                legendPanelElemts.legendToggleBtn.style.display = "";     // CSS flex layout ko natural restore karein
            });
		}

		const { track_line_legend, station_type_legend } = this.#elemts;
		if (!track_line_legend) return;

		// पुराने लेजेंड लिस्ट को साफ़ करें
		track_line_legend.innerHTML = "";
		station_type_legend.innerHTML = "";

		// 1. मेट्रो लाइन्स रेंडर करें (कस्टम क्लिक इवेंट के साथ)
		const linesData = this.#metroData.lines || {};
		Object.entries(linesData).forEach(
			([lineKey, lineInfo]) => {
				const li = document.createElement("li");
				li.className = "legend_item";
				li.style.cursor = "pointer";
				li.dataset.lineId = lineKey;

				const circle = document.createElement("span");
				circle.className = "legend-line-circle";
				circle.style.backgroundColor = lineInfo.color;
				circle.textContent = lineInfo.label || "";
				circle.style.color =
					lineInfo.color_name === "yellow" ? "#000000" : "#ffffff";

				const text = document.createElement("span");
				text.textContent = lineInfo.name?.[lang] || lineInfo.name?.en || lineKey;
				
				li.appendChild(circle);
				li.appendChild(text);

				// लाइन पर क्लिक करने पर वह लाइन और उसके स्टेशन हाइलाइट होंगे
				li.addEventListener("click", (e) => {
					e.stopPropagation();
					this.highlightLine(lineKey);
					if (this.#elemts.legendPanel) {
						this.#elemts.legendPanel.classList.remove("active");
						if (this.#elemts.legendToggleBtn) this.#elemts.legendToggleBtn.style.display = "";
					}
				});

				track_line_legend.appendChild(li);
			},
		);

		// 2. स्पेशल स्टेशन टाइप्स रेंडर करें (कस्टम क्लिक इवेंट के साथ)
		const stationTypes = this.#metroData.station_types || {};

		Object.entries(stationTypes).forEach(([type, info]) => {
			const li = document.createElement("li");
			li.className = "legend_item";
			li.style.cursor = "pointer";
			li.dataset.stationType = type;

			const icon = document.createElement("span");
			if (type === "walkway") {
				icon.className = "legend-icon-walkway";
			} else if (type === "interchange") {
				icon.className = "legend-icon-circle";
			} else {
				icon.className = "legend-icon-normal";
			}

			const text = document.createElement("span");
			text.textContent = info[lang] || info.en;

			li.appendChild(icon);
			li.appendChild(text);

			// स्टेशन टाइप पर क्लिक करने पर केवल उस प्रकार के स्टेशन हाइलाइट होंगे
			li.addEventListener("click", (e) => {
				e.stopPropagation();
				this.highlightStationType(type);
				if (this.#elemts.legendPanel) {
					this.#elemts.legendPanel.classList.remove("active");
					if (this.#elemts.legendToggleBtn) this.#elemts.legendToggleBtn.style.display = "";
				}
			});

			station_type_legend.appendChild(li);
		});
	}

	#set_events() {
		this.#zoom_n_pen_event();
	}

	// स्क्रीन पॉइंट को SVG viewBox पॉइंट में बदलने वाला हेल्पर
	#getSVGCoordinates(clientX, clientY) {
		const svg = this.#svg.elements.svg;
		const point = svg.createSVGPoint();
		point.x = clientX;
		point.y = clientY;

		// CTM = Coordinate Transformation Matrix
		const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse());
		return svgPoint; // { x, y } रिटर्न करेगा
	}

	#zoom_n_pen_event() {
		// 1. ज़ूम कंट्रोल्स बनाने का काम (UI Creation)
		// prettier-ignore
		const elemtMap = {
            zoomLevel: { type: "output", id: "zoomLevel", cls: "zoom-indicator", oth_att: { for: "zoomInBtn zoomOutBtn resetZoomBtn" }, html_con: `${Math.round(this.zoomScale * 100)}%`, parent: "zoomControls" },
            zoomControls: { type: "div", id: "zoomControls", cls: "metro-zoom-container", oth_att: {} },
            zoomInBtn: { type: "button", id: "zoomInBtn", cls: "zoom-btn", oth_att: { title: "Zoom In" }, html_con: "+", parent: "zoomControls" },
            zoomOutBtn: { type: "button", id: "zoomOutBtn", cls: "zoom-btn", oth_att: { title: "Zoom Out" }, html_con: "-", parent: "zoomControls" },
            resetZoomBtn: { type: "button", id: "resetZoomBtn", cls: "zoom-btn", oth_att: { title: "Reset Zoom" }, html_con: "=", parent: "zoomControls" },
        };

		const zoomControlsElemts = createDOMFromMap(
			elemtMap,
			this.#elemts.mapContainer,
		);
		const { zoomControls, zoomLevel } = zoomControlsElemts;
		this.#elemts.zoomControls = zoomControls;
		this.#elemts.zoomLevel = zoomLevel;

		const svgElement = this.#svg.elements.svg;

		// 1. ज़ूम बटन्स (यदि डैशबोर्ड में मौजूद हों)
		if (zoomControls) {
			zoomControls.addEventListener("click", (event) => {
				if (event.target.id === "zoomInBtn") {
					this.zoomScale += 0.2;
					this.#updateZoomTransform();
				} else if (event.target.id === "zoomOutBtn") {
					this.zoomScale = Math.max(0.1, this.zoomScale - 0.2);
					this.#updateZoomTransform();
				} else if (event.target.id === "resetZoomBtn") {
					this.zoomScale = 1;
					this.#pan.panX = 0;
					this.#pan.panY = 0;
					this.#updateZoomTransform();
				}
			});
		}

		// 2. माउस पैनिंग (Mouse Panning) - 100% कर्सर के साथ सिंक
		svgElement.addEventListener("mousedown", (e) => {
			this.#pan.isPanning = true;
			svgElement.style.cursor = "grabbing";

			// क्लिक किए गए स्क्रीन पॉइंट को SVG स्पेस में बदलें
			const svgPt = this.#getSVGCoordinates(e.clientX, e.clientY);

			// ड्रैग शुरू होने का पॉइंट स्टोर करें
			this.#pan.startX = svgPt.x - this.#pan.panX;
			this.#pan.startY = svgPt.y - this.#pan.panY;
		});

		window.addEventListener("mousemove", (e) => {
			if (!this.#pan.isPanning) return;

			const svgPt = this.#getSVGCoordinates(e.clientX, e.clientY);
			this.#pan.panX = svgPt.x - this.#pan.startX;
			this.#pan.panY = svgPt.y - this.#pan.startY;

			this.#updateZoomTransform();
		});

		window.addEventListener("mouseup", () => {
			this.#pan.isPanning = false;
			svgElement.style.cursor = "grab";
		});

		// 3. टच पैनिंग (Touch Panning for Mobile)
		svgElement.addEventListener(
			"touchstart",
			(e) => {
				if (e.touches.length === 1) {
					this.#pan.isPanning = true;
					const touch = e.touches[0];
					const svgPt = this.#getSVGCoordinates(touch.clientX, touch.clientY);

					this.#pan.startX = svgPt.x - this.#pan.panX;
					this.#pan.startY = svgPt.y - this.#pan.panY;
				}
			},
			{ passive: true },
		);

		svgElement.addEventListener(
			"touchmove",
			(e) => {
				if (!this.#pan.isPanning || e.touches.length !== 1) return;
				const touch = e.touches[0];
				const svgPt = this.#getSVGCoordinates(touch.clientX, touch.clientY);

				this.#pan.panX = svgPt.x - this.#pan.startX;
				this.#pan.panY = svgPt.y - this.#pan.startY;

				this.#updateZoomTransform();
			},
			{ passive: true },
		);

		svgElement.addEventListener("touchend", () => {
			this.#pan.isPanning = false;
		});

		// 4. कर्सर केंद्रित ज़ूम (Scroll Wheel Zoom to Cursor) - बिल्कुल परफेक्ट मैथ
		svgElement.addEventListener(
			"wheel",
			(e) => {
				e.preventDefault(); // ब्राउज़र का पेज स्क्रॉल रोकें

				// कर्सर की सटीक viewBox पोजीशन प्राप्त करें
				const mousePt = this.#getSVGCoordinates(e.clientX, e.clientY);

				const oldZoom = this.zoomScale;
				const zoomStep = 0.08;

				// नया ज़ूम कैलकुलेट करें
				if (e.deltaY < 0) {
					this.zoomScale += zoomStep;
				} else {
					this.zoomScale = Math.max(0.1, this.zoomScale - zoomStep);
				}
				const newZoom = this.zoomScale;

				// कर्सर को उसी जगह स्थिर रखने के लिए नया पैन (Translation) निकालें
				this.#pan.panX =
					mousePt.x - (mousePt.x - this.#pan.panX) * (newZoom / oldZoom);
				this.#pan.panY =
					mousePt.y - (mousePt.y - this.#pan.panY) * (newZoom / oldZoom);

				this.#updateZoomTransform();
			},
			{ passive: false },
		);

        // 5. ऑप्टिमाइज़्ड डेलीगेटेड होवर लिसनर (Event Delegation for Circles & Text)
		const mainLayer = this.#svg.elements.mainGroup_layer;
		if (mainLayer) {
			const handleHover = (e, isHovered) => {
								// चाहे माउस circle, group या text पर हो, उसका station-id ढूँढें
				const target = e.target.closest("[data-station-id]");
				if (!target) return;
				const stationId = target.dataset.stationId;
				if (!stationId) return;

				const circleNode = this.#svg.elements.stations_circleGroup?.querySelector(`[data-station-id="${stationId}"]`);
				const textNode = this.#svg.elements.labelGroup?.querySelector(`text[data-station-id="${stationId}"]`);

				if (isHovered) {
					if (circleNode) circleNode.classList.add("hovered-circle");
					if (textNode) textNode.classList.add("hovered-text");
				} else {
					if (circleNode) circleNode.classList.remove("hovered-circle");
					if (textNode) textNode.classList.remove("hovered-text");
				}
			};

			mainLayer.addEventListener("mouseover", (e) => handleHover(e, true));
			mainLayer.addEventListener("mouseout", (e) => handleHover(e, false));
		}
	}

    
	// =========================================================================
	// 4. Events Methods
	// =========================================================================
	#updateZoomTransform() {
		if (this.#svg.elements.mainGroup_layer) {
			this.#svg.elements.mainGroup_layer.setAttribute(
				"transform",
				`translate(${this.#pan.panX}, ${this.#pan.panY}) scale(${this.zoomScale})`,
			);

			// UI पर ज़ूम लेवल दिखाने के लिए
			if (this.#elemts.zoomLevel) {
				this.#elemts.zoomLevel.textContent = `${Math.round(this.zoomScale * 100)}%`;
			}
		}
	}

	// =========================================================================
	// 5. DATA PROCESSING & COORDINATES CONVERSION
	// =========================================================================
	// 1. #Lat_Lon_to_X_Y_Conversion() (Line 396)
	#Lat_Lon_to_X_Y_Conversion() {
		Object.values(this.#metroData.stationData).forEach((station) => {
			const dec = station.location?.decimal;
			if (!dec || dec.lat == null || dec.lon == null || dec.lat === "") return;
			const lat = Number(dec.lat);
			const lon = Number(dec.lon);
			const x = (lon - this.#bounds.minLon) * earthScale * this.#scaleMultiplier * Math.cos(this.#avgLatRad);
			const y = (this.#bounds.maxLat - lat) * earthScale * this.#scaleMultiplier;
			station.xy = { x, y };
		});
	}


	// =========================================================================
	// 6. SVG RENDERING & LAYOUT SIZING HELPERS
	// =========================================================================
	#create_svg() {
		// SVG element initialize karke attributes set karte hain
		this.#svg.elements.svg = document.createElementNS( "http://www.w3.org/2000/svg", "svg", );
		this.#svg.elements.svg.setAttribute("width", "100%");
		this.#svg.elements.svg.setAttribute("height", "100%");
		this.#svg.elements.svg.style.cursor = "grab";

		// SVG ke viewBox dimensions set karte hain bounds ke according
		this.#setSVG_viewBox(this.#svg.elements.svg);

		this.#svg.elements.mainGroup_layer = this.#createGroup("main_layer");

		this.#svg.elements.svg.appendChild(this.#svg.elements.mainGroup_layer);
		this.#elemts.mapContainer.appendChild(this.#svg.elements.svg);
	}

	// Sabhi stations ke coordinates mein se minimum aur maximum Latitude/Longitude find karta hai
	
	#getBounds() {
		let minLat = Infinity;
		let maxLat = -Infinity;
		let minLon = Infinity;
		let maxLon = -Infinity;
		Object.values(this.#metroData.stationData).forEach((station) => {
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
		this.#bounds = { minLat, maxLat, minLon, maxLon };
	}

	// Latitude/Longitude bounds aur Earth scale ke details use karke total SVG size (width & height) compute karta hai
	#calculateSVGSize() {
		const avgLat = (this.#bounds.minLat + this.#bounds.maxLat) / 2;
		const avgLatRad = (avgLat * Math.PI) / 180; // Degrees ko Radians mein convert karte hain cosine logic ke liye

		// Avg Latitude ke cosine factor se width standardise karte hain (Mercator alignment)
		const width = Math.round(
			(this.#bounds.maxLon - this.#bounds.minLon) *
				earthScale *
				this.#scaleMultiplier *
				Math.cos(avgLatRad),
		);
		const height = Math.round(
			(this.#bounds.maxLat - this.#bounds.minLat) *
				earthScale *
				this.#scaleMultiplier,
		);
		return { width, height };
	}

	// SVG elements par dynamic viewBox dimensions set karta hai
	#setSVG_viewBox() {
		const svgSize = this.#calculateSVGSize();

		const marginPercent = 0.05; // 10% प्रतिशत
		const margin = Math.round(
			Math.max(svgSize.width, svgSize.height) * marginPercent,
		);

		this.#svg.elements.svg.setAttribute(
			"viewBox",
			`-${margin} -${margin} ${svgSize.width + 2 * margin} ${svgSize.height + 2 * margin}`,
		);
	}

	#drawStationCircles() {
		const stations_circleGroup = this.#createGroup("stationCircles");

		Object.values(this.#metroData.stationData).forEach((station) => {
			const xy = station.xy;
			if (xy) {
				const firstLineId = station.lines?.[0];
				const lineInfo = this.#metroData.lines?.[firstLineId];
				const lineColor = lineInfo?.color ?? "#333";

				const stationType =
					station.properties?.station_type ||
					station.station_type ||
					(station.lines.length > 1 ? "interchange" : "normal");

				let elem;
				if (stationType === "walkway") {
					elem = this.#createWalkwayCircle(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				} else if (stationType === "interchange") {
					elem = this.#createInterchangeCircle(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				} else {
					elem = this.#createCircle(xy.x, xy.y, 200, "#FDFBD4", lineColor);
				}

				elem.dataset.stationId = station.id;
				elem.dataset.stationType = stationType;;
				stations_circleGroup.appendChild(elem);
			}
		});

		this.#svg.elements.stations_circleGroup = stations_circleGroup;
		this.#svg.elements.mainGroup_layer.appendChild(stations_circleGroup);
	}

	#drawMetroLines() {
		const tracks_lineGroup = this.#createGroup("metroLines");

		const drawn = new Set();
		Object.values(this.#metroData.stationData).forEach((station) => {
			station.neighbors.forEach((neighbor) => {
				const key = [station.id, neighbor.station].sort().join("-");

				if (drawn.has(key)) return;

				drawn.add(key);
				const nextStation = this.#metroData.stationData[neighbor.station];
				
				// Explicit Warning & Crash Prevention Guard
				if (!nextStation) {
					console.warn(`[Metro Map Warning] Neighbor station "${neighbor.station}" defined for "${station.id}", but missing in stationData!`);
					return;
				}

				const lineInfo = this.#metroData.lines?.[neighbor.line];
				const lineColor = lineInfo?.color ?? "#333";

				const line = this.#createLine(
					station.xy.x,
					station.xy.y,
					nextStation.xy.x,
					nextStation.xy.y,
					lineColor,
					100,
				);
				line.dataset.edgeId = key;
				line.dataset.lineId = neighbor.line;
				tracks_lineGroup.appendChild(line);
			});
		});

		this.#svg.elements.tracks_lineGroup = tracks_lineGroup;
		this.#svg.elements.mainGroup_layer.appendChild(tracks_lineGroup);
	}

		#calculateStationSequenceMap() {
		const sequenceMap = new Map();
		const visited = new Set();
		const stationData = this.#metroData.stationData;

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

	// Full 8-Quadrant Empty Sector Selector for Junctions & Curved Stations
	#getBestLabelQuadrant(station) {
		if (!station.neighbors || station.neighbors.length < 3) return null;

		// पड़ोसी स्टेशन्स के एंगल्स नापना
		const angles = [];
		station.neighbors.forEach((nbr) => {
			const nbrSt = this.#metroData.stationData[nbr.station];
			if (nbrSt && nbrSt.xy) {
				const rad = Math.atan2(nbrSt.xy.y - station.xy.y, nbrSt.xy.x - station.xy.x);
				let deg = (rad * 180) / Math.PI;
				if (deg < 0) deg += 360;
				angles.push(deg);
			} else {
				console.warn(`[Metro Map Label Warning] Neighbor station "${nbr.station}" missing in stationData for label angle calculation of "${station.id}"!`);
			}
		});

		// सभी 8 मुख्य और डायगोनल दिशाएँ
		const quadrants = [
			{ name: "TOP", angle: 270 },
			{ name: "BOTTOM", angle: 90 },
			{ name: "LEFT", angle: 180 },
			{ name: "RIGHT", angle: 0 },
			{ name: "TR", angle: 315 }, // Top-Right
			{ name: "TL", angle: 225 }, // Top-Left
			{ name: "BR", angle: 45 },  // Bottom-Right
			{ name: "BL", angle: 135 }, // Bottom-Left
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

	#drawStationLabels(lang = "en") {
		const labelGroup = this.#createGroup("stationLabels");

		if (this.#svg.elements.labelGroup) {
			this.#svg.elements.labelGroup.remove();
		}

		const sequenceMap = this.#calculateStationSequenceMap();
		const stations = Object.values(this.#metroData.stationData);

		stations.forEach((station, index) => {
			if (!station.xy) return;

			// 1. ट्रैक ओरिएंटेशन (Horizontal, Vertical, या Diagonal Slopes) की सटीक पहचान
			let isHorizontalTrack = true;
			let isDiagonalTrack = false;
			let isDiagonalNWSE = false;

			if (station.neighbors && station.neighbors.length > 0) {
				const neighborId = station.neighbors[0].station;
				const neighbor = this.#metroData.stationData[neighborId];
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

			// यूनिवर्सल नाम स्प्लिटिंग लॉजिक
						const rawName = station.name?.[lang] || station.name?.en || "";
			
			const getWrappedLines = (str) => {
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
			};

			const lines = getWrappedLines(rawName);

			let x = station.xy.x;
			let y = station.xy.y;
			let textAnchor = "middle";
			let dominantBaseline = "alphabetic";

			// Full 8-Quadrant Selector for Junctions and Curved Stations
			const junctionQuad = this.#getBestLabelQuadrant(station);

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
				// 90° Perpendicular Diagonal Slope Alternating
				if (isDiagonalNWSE) {
					// Top-Left से Bottom-Right Slope (उदा: Rohini East / West)
					if (isEven) {
						// Top-Right (दाएँ-ऊपर)
						x = station.xy.x + 280;
						y = station.xy.y - 280 - (lines.length - 1) * 418;
						textAnchor = "start";
						dominantBaseline = "alphabetic";
					} else {
						// Bottom-Left (बाएँ-नीचे)
						x = station.xy.x - 280;
						y = station.xy.y + 280;
						textAnchor = "end";
						dominantBaseline = "hanging";
					}
				} else {
					// Bottom-Left से Top-Right Slope
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
				// हॉरिजॉन्टल लाइनों पर (Top / Bottom Alternating)
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
				// वर्टिकल लाइनों पर (Left / Right Alternating)
				x = isEven ? station.xy.x - 260 : station.xy.x + 260;
				y = station.xy.y;
				textAnchor = isEven ? "end" : "start";
				dominantBaseline = "central";
			}

			// SVG Text एलिमेंट तैयार करें
			const text = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"text",
			);

			text.setAttribute("x", x);
			text.setAttribute("y", y);
			text.setAttribute("font-size", 380);
			text.setAttribute("font-family", "Arial, sans-serif");
			text.setAttribute("fill", "#222");
			text.setAttribute("text-anchor", textAnchor);
			text.setAttribute("dominant-baseline", dominantBaseline);
			text.setAttribute("style", "user-select: none;");
			text.dataset.stationId = station.id;

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

			labelGroup.appendChild(text);
		});

		this.#svg.elements.labelGroup = labelGroup;
		this.#svg.elements.mainGroup_layer.appendChild(labelGroup);
	}


		/**
	 * ⚡ हाई-परफॉरमेंस विजुअल स्टेट इंजन: 1000 नोड्स पर लूप चलाने के बजाय 
	 * पेरेंट क्लास '.map-dimmed' और सिर्फ 5-10 एक्टिव एलिमेंट्स को छूता है (60 FPS)
	 */
	#applyMapVisualState(config = {}) {
		const svg = this.#svg.elements;
		if (!svg.svg || !svg.stations_circleGroup || !svg.tracks_lineGroup || !svg.labelGroup) return;

		const { path, lineId, stationType, stationId } = config;

		// 1. पिछले सभी एक्टिव हाईलाइट्स को 0ms में साफ करें
		svg.svg.querySelectorAll(".highlighted, .highlighted-line, .highlighted-text, .target-highlight-circle, .target-highlight-text").forEach(el => {
			el.classList.remove("highlighted", "highlighted-line", "highlighted-text", "target-highlight-circle", "target-highlight-text");
		});

		// 2. रीसेट लॉजिक: यदि कोई फ़िल्टर नहीं है तो सीधे '.map-dimmed' हटाकर तुरंत बाहर निकलें
		if (!path && !lineId && !stationType && !stationId) {
			svg.svg.classList.remove("map-dimmed");
			if (this.#elemts.clearRouteBtn) {
				this.#elemts.clearRouteBtn.classList.add("hidden");
			}
			if (this.#elemts.legendToggleBtn) {
				this.#elemts.legendToggleBtn.style.display = "";
			}
			return;
		}

		// 3. पेरेंट SVG पर '.map-dimmed' लगाएं (GPU 1-step dimming)
		svg.svg.classList.add("map-dimmed");

		if (this.#elemts.clearRouteBtn) {
			this.#elemts.clearRouteBtn.classList.remove("hidden");
		}

		// 🎯 Case A: सिंगल स्टेशन हाईलाइट (पल्सिंग और बड़ा)
		if (stationId) {
			const circleNode = svg.stations_circleGroup.querySelector(`[data-station-id="${stationId}"]`);
			const textNode = svg.labelGroup.querySelector(`text[data-station-id="${stationId}"]`);
			if (circleNode) circleNode.classList.add("target-highlight-circle");
			if (textNode) textNode.classList.add("target-highlight-text");
			return;
		}

		// 🚇 Case B: रूट पाथ हाईलाइट
		if (path && Array.isArray(path)) {
			path.forEach(stId => {
				const circleNode = svg.stations_circleGroup.querySelector(`[data-station-id="${stId}"]`);
				const textNode = svg.labelGroup.querySelector(`text[data-station-id="${stId}"]`);
				if (circleNode) circleNode.classList.add("highlighted");
				if (textNode) textNode.classList.add("highlighted-text");
			});

			for (let i = 0; i < path.length - 1; i++) {
				const edgeId1 = `${path[i]}-${path[i + 1]}`;
				const edgeId2 = `${path[i + 1]}-${path[i]}`;
				const edgeNode = svg.tracks_lineGroup.querySelector(`line[data-edge-id="${edgeId1}"], line[data-edge-id="${edgeId2}"]`);
				if (edgeNode) edgeNode.classList.add("highlighted-line");
			}
			return;
		}

		// 🎨 Case C: लाइन ID हाईलाइट
		if (lineId) {
			const lineObj = this.#metroData.lines?.[lineId];
			const lineStations = lineObj?.stations || [];
			lineStations.forEach(stId => {
				const circleNode = svg.stations_circleGroup.querySelector(`[data-station-id="${stId}"]`);
				const textNode = svg.labelGroup.querySelector(`text[data-station-id="${stId}"]`);
				if (circleNode) circleNode.classList.add("highlighted");
				if (textNode) textNode.classList.add("highlighted-text");
			});

			svg.tracks_lineGroup.querySelectorAll(`line[data-line-id="${lineId}"]`).forEach(l => {
				l.classList.add("highlighted-line");
			});
			return;
		}

		// 🏷️ Case D: स्टेशन टाइप (Interchange / Normal)
		if (stationType) {
			svg.stations_circleGroup.querySelectorAll(`[data-station-type="${stationType}"]`).forEach(circleNode => {
				circleNode.classList.add("highlighted");
				const stId = circleNode.dataset.stationId;
				const textNode = svg.labelGroup.querySelector(`text[data-station-id="${stId}"]`);
				if (textNode) textNode.classList.add("highlighted-text");
			});
		}
	}

	// -------------------------------------------------------------------------
	// Public Methods API (Centralized & 0ms Instant)
	// -------------------------------------------------------------------------

	highlightStation(stationId, autoPan = true) {
		if (!stationId) {
			this.#applyMapVisualState({});
			return;
		}

		// 1. सेंट्रल इंजन से टारगेट स्टेशन को पल्स और बाकी मैप को डिम करें
		this.#applyMapVisualState({ stationId });

		// 2. 180% ज़ूम के साथ स्टेशन को स्क्रीन के सटीक केंद्र में लाएँ
		if (autoPan) {
			const stationObj = this.#metroData?.stationData?.[stationId];
			if (stationObj?.xy) {
				const targetX = stationObj.xy.x;
				const targetY = stationObj.xy.y;

				const svgSize = this.#calculateSVGSize();
				const centerX = svgSize.width / 2;
				const centerY = svgSize.height / 2;

				this.zoomScale = 2.8; // 180% आरामदायक ज़ूम ताकि स्टेशन बड़ा दिखे
				this.#pan.panX = centerX - (targetX * this.zoomScale);
				this.#pan.panY = centerY - (targetY * this.zoomScale);

				this.#updateZoomTransform();
			}
		}
	}

	// -------------------------------------------------------------------------
	// Public Methods API
	// -------------------------------------------------------------------------


	highlightRoute(path) {
		if (!path || path.length === 0) {
			this.#applyMapVisualState({});
		} else {
			this.#applyMapVisualState({ path });
		}
	}

	highlightLine(lineId) {
		this.#applyMapVisualState({ lineId });
	}

	highlightStationType(stationType) {
		this.#applyMapVisualState({ stationType });
	}
    
	// =========================================================================
	// 7. SVG Elements creator
	// =========================================================================
	
	/**
     * रूट को मैप पर री-हाईलाइट करता है और मैप कंटेनर पर स्मूथ स्क्रॉल करता है।
     * @param {Array<string>|null} path - रूट के स्टेशन IDs की सूची
     */
    showRouteOnMap(path) {
        if (path && path.length > 0) {
            this.highlightRoute(path);
        }
        if (this.#elemts.mapContainer) {
            this.#elemts.mapContainer.scrollIntoView({ behavior: "smooth" });
        }
    }
	
	#createGroup(id) {
		const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
		if (id) group.setAttribute("id", id);
		return group;
	}

	#createCircle(x, y, radius, fillColor, strokeColor) {
		const circle = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"circle",
		);
		circle.setAttribute("cx", x);
		circle.setAttribute("cy", y);
		circle.setAttribute("r", radius);
		circle.setAttribute("fill", fillColor);
		circle.setAttribute("stroke-width", 50);
		circle.setAttribute("stroke", strokeColor);
		return circle;
	}

	#createLine(x1, y1, x2, y2, strokeColor, strokeWidth = 50) {
		const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
		line.setAttribute("x1", x1);
		line.setAttribute("y1", y1);
		line.setAttribute("x2", x2);
		line.setAttribute("y2", y2);
		line.setAttribute("stroke", strokeColor);
		line.setAttribute("stroke-width", strokeWidth);
		return line;
	}

	#createInterchangeCircle(x, y, radius, fillColor, strokeColor) {
		const group = this.#createGroup();
		// 1. Outer concentric ring (⭕ Outer Ring)
		const outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		outer.setAttribute("cx", x);
		outer.setAttribute("cy", y);
		outer.setAttribute("r", radius + 60);
		outer.setAttribute("fill", "none");
		outer.setAttribute("stroke-width", 40);
		outer.setAttribute("stroke", strokeColor);

		// 2. Inner main circle
		const inner = this.#createCircle(x, y, radius, fillColor, strokeColor);

		group.appendChild(outer);
		group.appendChild(inner);
		return group;
	}

	#createWalkwayCircle(x, y, radius, fillColor, strokeColor) {
		const group = this.#createGroup();
		// 1. Main outer circle
		const mainCircle = this.#createCircle(x, y, radius, fillColor, strokeColor);

		// 2. Inner solid center dot (⊙ Center Dot)
		const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		dot.setAttribute("cx", x);
		dot.setAttribute("cy", y);
		dot.setAttribute("r", 90);
		dot.setAttribute("fill", strokeColor);

		group.appendChild(mainCircle);
		group.appendChild(dot);
		return group;
	}

}
