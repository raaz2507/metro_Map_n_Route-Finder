
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

	#scaleMultiplier = 1.5;

	// =========================================================================
	// 2. LIFECYCLE / CONSTRUCTOR
	// =========================================================================
	constructor({ mapContainerSelector = null, metroData = null }) {
		this.#elemts.mapContainer = document.querySelector(mapContainerSelector);
		this.#metroData = metroData;
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
                legendToggleBtn: { type: "button", cls: "metro-btn-overlay", html_con: `Legend`, },

                // क्लोज़ बटन "X" (नया जोड़ा गया)
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
			this.#elemts.track_line_legend = legendPanelElemts.track_line_legend;
			this.#elemts.station_type_legend = legendPanelElemts.station_type_legend;
            this.#elemts.legendPanel = legendPanelElemts.legendPanel;

            // ==========================================
            // B. क्लिक इवेंट्स (टॉगल और शो/हाइड लॉजिक)
            // ==========================================

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

		// 1. मेट्रो लाइन्स रेंडर करें
		Object.entries(this.#metroData.line_color).forEach(
			([lineKey, lineInfo]) => {
				const li = document.createElement("li");
				li.className = "legend_item";
				// li.style.color = lineInfo.color;

				// कलर्ड सर्किल बनाएं (डेटा से लेबल लेकर)
				const circle = document.createElement("span");
				circle.className = "legend-line-circle";
				circle.style.backgroundColor = lineInfo.color;
				circle.textContent = lineInfo.label || "";

				// येलो लाइन के लिए टेक्स्ट कलर ब्लैक करें ताकि कंट्रास्ट अच्छा रहे
				circle.style.color =
					lineInfo.color_name === "yellow" ? "#000000" : "#ffffff";

				// नाम सेट करें (भाषा के अनुसार)
				const text = document.createElement("span");
				text.textContent =
					lang === "hi" && lineInfo.name_hi
						? lineInfo.name_hi
						: lineInfo.name_en || lineKey;

				li.appendChild(circle);
				li.appendChild(text);
				track_line_legend.appendChild(li);
			},
		);

		// 2. स्पेशल स्टेशन टाइप्स रेंडर करें (Walkway, Interchange, Normal)

		Object.entries(this.#metroData.station_types).forEach(([type, info]) => {
			const li = document.createElement("li");
			li.className = "legend_item";

			// आइकॉन बनाएं
			const icon = document.createElement("span");
			if (type === "walkway") {
				icon.className = "legend-icon-walkway";
			} else if (type === "interchange") {
				icon.className = "legend-icon-circle";
			} else {
				icon.className = "legend-icon-normal";
			}

			// नाम सेट करें
			const text = document.createElement("span");
			text.textContent = lang === "hi" ? info.name_hi : info.name_en;

			li.appendChild(icon);
			li.appendChild(text);
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

        // 5. स्टेशन सर्कल पर होवर करने पर उसके टेक्स्ट को हाईलाइट (Bold/Big) करना
		const circlesList = this.#svg.elements.stations_circleGroup.querySelectorAll("circle");
		circlesList.forEach(circle => {
			circle.addEventListener("mouseenter", () => {
				const stationId = circle.dataset.stationId;
				const textNode = this.#svg.elements.labelGroup.querySelector(`text[data-station-id="${stationId}"]`);
				if (textNode) {
					textNode.classList.add("hovered-text");
				}
			});
			circle.addEventListener("mouseleave", () => {
				const stationId = circle.dataset.stationId;
				const textNode = this.#svg.elements.labelGroup.querySelector(`text[data-station-id="${stationId}"]`);
				if (textNode) {
					textNode.classList.remove("hovered-text");
				}
			});
		});
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
	#Lat_Lon_to_X_Y_Conversion() {
		Object.values(this.#metroData.stationData).forEach((station) => {
			if (!station.coordinates) return;

			const lat = station.coordinates.latitudeCenter;
			const lon = station.coordinates.longitudeCenter;

			// Simple Linear Scaling formula to map coords to SVG width and height
			// prettier-ignore
			const x = (lon - this.#bounds.minLon) * earthScale * this.#scaleMultiplier * Math.cos(this.#avgLatRad);

			// Y is inverted because SVG Y coordinate starts from 0 at the top and goes down
			const y =
				(this.#bounds.maxLat - lat) * earthScale * this.#scaleMultiplier;

			// Scaled coordinates ko station.xy property mein store karte hain
			station.xy = { x, y };
		});

        // prettier-ignore 
		console.log( "Mapped Station Coordinates (X, Y):", this.#metroData.stationData,);
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
			if (station.coordinates) {
				const lat = station.coordinates.latitudeCenter;
				const lon = station.coordinates.longitudeCenter;
				if (lat < minLat) minLat = lat;
				if (lat > maxLat) maxLat = lat;
				if (lon < minLon) minLon = lon;
				if (lon > maxLon) maxLon = lon;
			}
		});
		// return { minLat, maxLat, minLon, maxLon };
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
				// 'station' already station object hai, toh hum directly station.lines use kar sakte hain
				const lineColor =
					this.#metroData.line_color[station.lines[0]]?.color ?? "#333";
				const circle = this.#createCircle(
					xy.x,
					xy.y,
					200,
					"#FDFBD4",
					lineColor,
				);
				circle.dataset.stationId = station.id;
				stations_circleGroup.appendChild(circle);
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
				const lineInfo = this.#metroData.line_color[neighbor.line];

				const line = this.#createLine(
					station.xy.x,
					station.xy.y,
					nextStation.xy.x,
					nextStation.xy.y,
					lineInfo.color,
					100,
				);
				line.dataset.edgeId = key;
				tracks_lineGroup.appendChild(line);
			});
		});
		this.#svg.elements.tracks_lineGroup = tracks_lineGroup;
		this.#svg.elements.mainGroup_layer.appendChild(tracks_lineGroup);
	}

	#drawStationLabels(lang = "en") {
		const labelGroup = this.#createGroup("stationLabels");

		//clear old name if avilable
		if (this.#svg.elements.labelGroup) {
			this.#svg.elements.labelGroup.remove();
		}
		Object.values(this.#metroData.stationData).forEach((station) => {
			if (!station.xy) return;
			const text = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"text",
			);

			// Offset the text slightly from the station center
			const x = station.xy.x + 150;
			const y = station.xy.y - 150;

			text.setAttribute("x", x);
			text.setAttribute("y", y);
			text.setAttribute("font-size", 450);
			text.setAttribute("font-family", "Arial, sans-serif");
			text.setAttribute("fill", "#222");
			text.setAttribute("style", "user-select: none;");

			text.textContent =
				lang === "hi" && station.name_hi ? station.name_hi : station.name;

			text.dataset.stationId = station.id;

			// Rotate the text -35 degrees around its own anchor point (x, y)
			// text.setAttribute( "transform", `rotate(-35, ${x}, ${y})` );

			labelGroup.appendChild(text);
		});

		this.#svg.elements.labelGroup = labelGroup;
		this.#svg.elements.mainGroup_layer.appendChild(labelGroup);
	}

	/**
     * मैप पर खोजे गए रूट को विजुअली हाईलाइट करता है और बाकी सबको धुंधला करता है।
     * @param {Array<string>|null} path - रूट के स्टेशन IDs की सूची, या रीसेट करने के लिए null
     */
    highlightRoute(path) {
        const svg = this.#svg.elements;
        // सुनिश्चित करें कि सभी SVG ग्रुप्स उपलब्ध हैं
        if (!svg.stations_circleGroup || !svg.tracks_lineGroup || !svg.labelGroup) return;
        const circles = svg.stations_circleGroup.querySelectorAll("circle");
        const lines = svg.tracks_lineGroup.querySelectorAll("line");
        const labels = svg.labelGroup.querySelectorAll("text");
        // 1. रीसेट लॉजिक: यदि पाथ खाली या null है, तो मैप को पहले जैसा सामान्य करें
        if (!path || path.length === 0) {
            circles.forEach(circle => {
                circle.setAttribute("r", "200");
                circle.setAttribute("stroke-width", "50");
                circle.style.opacity = "1";
            });
            lines.forEach(line => {
                line.setAttribute("stroke-width", "100");
                line.style.opacity = "1";
            });
            labels.forEach(label => {
                label.style.fontWeight = "normal";
                label.style.opacity = "1";
            });
            return;
        }
        // 2. रूट स्टेशनों और कड़ियों (edges) की एक Set सूची बनाएं (O(1) तेज़ खोज के लिए)
        const pathSet = new Set(path);
        const activeEdges = new Set();
        for (let i = 0; i < path.length - 1; i++) {
            // कड़ियों की Key ID: [stationA, stationB].sort().join("-")
            const key = [path[i], path[i + 1]].sort().join("-");
            activeEdges.add(key);
        }
        // 3. स्टेशन सर्किलों को हाईलाइट / फेड-आउट करें
        circles.forEach(circle => {
            const stationId = circle.dataset.stationId;
            if (pathSet.has(stationId)) {
                circle.setAttribute("r", "250"); // रूट स्टेशनों का आकार बढ़ाएं
                circle.setAttribute("stroke-width", "75");
                circle.style.opacity = "1";
            } else {
                circle.setAttribute("r", "200");
                circle.setAttribute("stroke-width", "50");
                circle.style.opacity = "0.15"; // फेड-आउट (धुंधला)
            }
        });
        // 4. मेट्रो लाइन ट्रैक्स (lines) को हाईलाइट / फेड-आउट करें
        lines.forEach(line => {
            const edgeId = line.dataset.edgeId;
            if (activeEdges.has(edgeId)) {
                line.setAttribute("stroke-width", "150"); // रूट लाइन्स की मोटाई बढ़ाएं
                line.style.opacity = "1";
            } else {
                line.setAttribute("stroke-width", "100");
                line.style.opacity = "0.15"; // फेड-आउट (धुंधला)
            }
        });
        // 5. स्टेशन के नाम लेबल्स (text) को हाईलाइट / फेड-आउट करें
        labels.forEach(label => {
            const stationId = label.dataset.stationId;
            if (pathSet.has(stationId)) {
                label.style.fontWeight = "bold"; // नाम बोल्ड करें
                label.style.opacity = "1";
            } else {
                label.style.fontWeight = "normal";
                label.style.opacity = "0.15"; // फेड-आउट (धुंधला)
            }
        });
    }
	// =========================================================================
	// 7. SVG Elemnts creator
	// =========================================================================

	#createGroup(id) {
		const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
		group.setAttribute("id", id);
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
}
