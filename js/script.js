import {OpenLocationCode} from "./open_location_code.js";
import data from '../data/data.json' with { type: 'json' };

// console.log(data.stationData);

// console.log(olc.decode(delhiCode +"M69H+4Q"));
// console.log(olc.decode(delhiCode +"M6GF+WW"));

const earthScale = data.other.earthScale; // Meters per degree
document.addEventListener("DOMContentLoaded",()=>{
    const map = new metroMap();
    // console.log(map);
});

class metroMap{
    // =========================================================================
    // 1. PRIVATE PROPERTIES
    // =========================================================================
    #elemts={};
    #svg = {elements: {
        svg: null,         // 'root' की जगह 'svg' (यह स्पष्ट करता है कि यह <svg> नोड है)
        mainGroup_layer: null,    // 'viewport' (यह नाम बिल्कुल सही है)
        tracks_lineGroup: null,      // 'connections' की जगह 'tracks' (या 'lines' - मेट्रो के लिए अधिक स्वाभाविक है)
        stations_circleGroup: null,    // 'stations' (यह भी बिल्कुल सही है)
        labelGroup: null       // 'labels' (यह भी बिल्कुल सही है)
    }, width:1000, height:1000};

    #settings = {currentTheme : "light", currentLang : "en"};
    #stationData = data.stationData;
    #bounds = null;     // बाउंड्स स्टोर करने के लिए
    #avgLatRad = 0;     // रेडियन वैल्यू स्टोर करने के लिए
    zoomScale = 1; // Metro map zoom factor
    #pan = {
        panX: 0,             // X-अक्ष पर मैप का विस्थापन (panX)
        panY: 0,             // Y-अक्ष पर मैप का विस्थापन (panY)
        isPanning: false, // क्या यूज़र ड्रैग कर रहा है?
        startX: 0,        // माउस/टच शुरू होने का X पॉइंट
        startY: 0         // माउस/टच शुरू होने का Y पॉइंट
    };


    #scaleMultiplier = 1.5;

    // =========================================================================
    // 2. LIFECYCLE / CONSTRUCTOR
    // =========================================================================
    constructor(){
        this.#init();
    }

    // =========================================================================
    // 3. CORE INITIALIZATION & DOM METHODS
    // =========================================================================
    #get_element(){
        const elemtMap={
            mapContainer:".mapContainer",

            zoomControls:"#zoomControls",
            zoomLevel:"#zoomLevel",
            zoomInBtn:"#zoomInBtn",
            zoomOutBtn:"#zoomOutBtn",
            resetZoomBtn:"#resetZoomBtn",

            startStation:"#startStation",
            endStation:"#endStation",
            stationList:"#stationList",
            swapButton:"#swapButton",
            

            track_line_legend:"#track_line_legend",
            station_type_legend: "#station_type_legend",

            language:"#language",

            theme: "#theme",
        };
        for (const [key, selector] of Object.entries(elemtMap)) {
            const element = document.querySelector(selector);
            if (!element) {
                console.error(`Element not found for selector: ${selector}`);
                continue;
            }
            this.#elemts[key] = element;
        }
        
    }

    // =========================================================================
    // 4. methods for dashbord
    // =========================================================================


    #stationListGenerator(){
        const { stationList } = this.#elemts;
        for (const station of Object.values(this.#stationData)) {
            const option = document.createElement("option");
            option.value = station.name;
            stationList.appendChild(option);
        }
    }


    #legendGenerator(lang = "en") {
        const { track_line_legend , station_type_legend} = this.#elemts;
        if (!track_line_legend) return;

        // पुराने लेजेंड लिस्ट को साफ़ करें
        track_line_legend.innerHTML = "";
        station_type_legend.innerHTML = "";
        
        // 1. मेट्रो लाइन्स रेंडर करें
        Object.entries(data.line_color).forEach(([lineKey, lineInfo]) => {
            const li = document.createElement("li");
            li.className = "legend_item";
            // li.style.color = lineInfo.color;

            // कलर्ड सर्किल बनाएं (डेटा से लेबल लेकर)
            const circle = document.createElement("span");
            circle.className = "legend-line-circle";
            circle.style.backgroundColor = lineInfo.color;
            circle.textContent = lineInfo.label || "";

            // येलो लाइन के लिए टेक्स्ट कलर ब्लैक करें ताकि कंट्रास्ट अच्छा रहे
            circle.style.color = (lineInfo.color_name === "yellow") ? "#000000" : "#ffffff";

            // नाम सेट करें (भाषा के अनुसार)
            const text = document.createElement("span");
            text.textContent = lang === "hi" && lineInfo.name_hi ? lineInfo.name_hi : (lineInfo.name_en || lineKey);

            li.appendChild(circle);
            li.appendChild(text);
            track_line_legend.appendChild(li);
        });

        // 2. स्पेशल स्टेशन टाइप्स रेंडर करें (Walkway, Interchange, Normal)
        
        
        Object.entries(data.station_types).forEach(([type, info]) => {
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


    #init(){
        this.#get_element();
        this.#loadSettings();

        this.#plusCode2Coordinates();
        
        this.#getBounds();
        const avgLat = (this.#bounds.minLat + this.#bounds.maxLat) / 2;
        this.#avgLatRad = avgLat * Math.PI / 180;
        
        // setup the SVG viewBox and dimensions based on the calculated bounds
        this.#Lat_Lon_to_X_Y_Conversion();
        this.#calculateNeighborDistance();

        // Generate station list for datalist and legend for lines
        this.#stationListGenerator();
        this.#legendGenerator(this.#settings.currentLang);

        //svg rendering
        this.#create_svg();
        this.#drawMetroLines();
        this.#drawStationCircles();
        this.#drawStationLabels(this.#settings.currentLang);
        
        this.#set_event();
    }
    
    #loadSettings() {
        // 1. Theme लोड और अप्लाई करें
        if (localStorage.getItem("metro-theme")){
            this.#settings.currentTheme = localStorage.getItem("metro-theme");
        }
        document.body.setAttribute("data-theme", this.#settings.currentTheme);
        if (this.#elemts.theme) {
            this.#elemts.theme.value = this.#settings.currentTheme; // ड्रॉपडाउन सिलेक्ट करें
        }

        // 2. Language लोड और अप्लाई करें
        if (localStorage.getItem("metro-lang")){
            this.#settings.currentLang = localStorage.getItem("metro-lang");
        }
        
        if (this.#elemts.language) {
            this.#elemts.language.value = this.#settings.currentLang; // ड्रॉपडाउन सिलेक्ट करें
        }
    }


    #set_event() { 
        this.#zoom_n_pen_event();

        this.#language_event();

        this.#station_input_event();

        this.#theme_event();
    }

    #station_input_event() {
        const { startStation, endStation, swapButton } = this.#elemts;
        swapButton.addEventListener("click", () => {
            const temp = startStation.value;
            startStation.value = endStation.value;
            endStation.value = temp;
        });
    }

    #theme_event() {
        const { theme } = this.#elemts;
        if (!theme) return;

        // 2. जब यूज़र ड्रॉपडाउन से थीम बदलेगा
        theme.addEventListener("change", (e) => {
            const selectedTheme = e.target.value;
            document.body.setAttribute("data-theme", selectedTheme);
            localStorage.setItem("metro-theme", selectedTheme); // लोकल स्टोरेज में सेव करें
        });
    }

    #language_event() {
        const { language } = this.#elemts;
        if (!language) return;

        language.addEventListener("change", () => {
            const selectedLang = language.value;
            if ( selectedLang === "hi" || selectedLang === "en") {
                this.#settings.currentLang = selectedLang; 
                this.#drawStationLabels(selectedLang);
                this.#legendGenerator(selectedLang);

                localStorage.setItem("metro-lang", selectedLang);  // लोकल स्टोरेज में सेव करें
            }
        });
    }

    #zoom_n_pen_event() {
        const { zoomControls } = this.#elemts;
        const svgElement = this.#svg.elements.svg;

        // 1. ज़ूम बटन इवेंट्स
        zoomControls.addEventListener("click", (event) => {
            if (event.target.id === "zoomInBtn") {
                this.zoomScale += 0.2;
                this.#updateZoomTransform();
            } else if (event.target.id === "zoomOutBtn") {
                this.zoomScale -= 0.2;
                if (this.zoomScale < 0.1) this.zoomScale = 0.1;
                this.#updateZoomTransform();
            } else if (event.target.id === "resetZoomBtn") {
                this.zoomScale = 1;
                this.#pan.panX = 0;
                this.#pan.panY = 0;
                this.#updateZoomTransform();
            }
        });

        // 2. माउस पैनिंग इवेंट्स (स्केल फ़ैक्टर के साथ)
        svgElement.addEventListener("mousedown", (e) => {
            this.#pan.isPanning = true;
            svgElement.style.cursor = "grabbing";

            // स्क्रीन विड्थ और SVG viewBox विड्थ का अनुपात निकालें
            const rect = svgElement.getBoundingClientRect();
            const svgSize = this.#calculateSVGSize();
            const scaleFactor = svgSize.width / rect.width;

            // माउस पॉइंट को SVG कोऑर्डिनेट स्पेस में बदलें
            this.#pan.startX = (e.clientX * scaleFactor) - this.#pan.panX;
            this.#pan.startY = (e.clientY * scaleFactor) - this.#pan.panY;
            this.#pan.scaleFactor = scaleFactor; // इसे टेम्परेरी स्टोर करें
        });

        window.addEventListener("mousemove", (e) => {
            if (!this.#pan.isPanning) return;
            const scale = this.#pan.scaleFactor || 1;
            
            // ड्रैग को 1:1 माउस के साथ सिंक करें
            this.#pan.panX = (e.clientX * scale) - this.#pan.startX;
            this.#pan.panY = (e.clientY * scale) - this.#pan.startY;
            
            this.#updateZoomTransform();
        });

        window.addEventListener("mouseup", () => {
            this.#pan.isPanning = false;
            svgElement.style.cursor = "grab";
        });

        // 3. टच पैनिंग इवेंट्स (मोबाइल के लिए - स्केल फ़ैक्टर के साथ)
        svgElement.addEventListener("touchstart", (e) => {
            if (e.touches.length === 1) {
                this.#pan.isPanning = true;
                const touch = e.touches[0];
                
                const rect = svgElement.getBoundingClientRect();
                const svgSize = this.#calculateSVGSize();
                const scaleFactor = svgSize.width / rect.width;

                this.#pan.startX = (touch.clientX * scaleFactor) - this.#pan.panX;
                this.#pan.startY = (touch.clientY * scaleFactor) - this.#pan.panY;
                this.#pan.scaleFactor = scaleFactor;
            }
        }, { passive: true });

        svgElement.addEventListener("touchmove", (e) => {
            if (!this.#pan.isPanning || e.touches.length !== 1) return;
            const touch = e.touches[0];
            const scale = this.#pan.scaleFactor || 1;

            this.#pan.panX = (touch.clientX * scale) - this.#pan.startX;
            this.#pan.panY = (touch.clientY * scale) - this.#pan.startY;
            
            this.#updateZoomTransform();
        }, { passive: true });

        svgElement.addEventListener("touchend", () => {
            this.#pan.isPanning = false;
        });

        // 4. माउस व्हील (Scroll Wheel) ज़ूम इवेंट
        // 4. माउस व्हील ज़ूम (कर्सर केंद्रित - Zoom to Cursor)
        svgElement.addEventListener("wheel", (e) => {
            e.preventDefault(); // ब्राउज़र स्क्रॉल को रोकें

            // 1. स्क्रीन विड्थ और SVG viewBox विड्थ का अनुपात निकालें
            const rect = svgElement.getBoundingClientRect();
            const svgSize = this.#calculateSVGSize();
            const scaleFactor = svgSize.width / rect.width;

            // 2. कर्सर की पोजीशन (स्क्रीन पिक्सल में)
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // 3. कर्सर की पोजीशन को SVG viewBox कोऑर्डिनेट में बदलें
            const mouseX_vb = mouseX * scaleFactor;
            const mouseY_vb = mouseY * scaleFactor;

            // 4. पुराने ज़ूम स्केल को स्टोर करें
            const oldZoom = this.zoomScale;

            // 5. नया ज़ूम स्केल कैलकुलेट करें
            const zoomStep = 0.08; // स्मूथ अनुभव के लिए ज़ूम स्टेप
            if (e.deltaY < 0) {
                this.zoomScale += zoomStep;
            } else {
                this.zoomScale -= zoomStep;
                if (this.zoomScale < 0.1) this.zoomScale = 0.1; // मिनिमम ज़ूम लिमिट
            }
            const newZoom = this.zoomScale;

            // 6. कर्सर को स्थिर रखने के लिए नए पैन (विस्थापन) की गणना करें
            // newPan = cursor_vb - (cursor_vb - oldPan) * (newZoom / oldZoom)
            this.#pan.panX = mouseX_vb - (mouseX_vb - this.#pan.panX) * (newZoom / oldZoom);
            this.#pan.panY = mouseY_vb - (mouseY_vb - this.#pan.panY) * (newZoom / oldZoom);
            // 7. अपडेटेड ट्रांसफ़ॉर्म अप्लाई करें
            this.#updateZoomTransform();
        }, { passive: false });
    }
    // =========================================================================
    // 4. Events Methods
    // =========================================================================
    #updateZoomTransform() {
        if (this.#svg.elements.mainGroup_layer) {
            this.#svg.elements.mainGroup_layer.setAttribute(
                "transform",  
                `translate(${this.#pan.panX}, ${this.#pan.panY}) scale(${this.zoomScale})`
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
    #plusCode2Coordinates(){
        const olc = new OpenLocationCode();
        Object.values(this.#stationData).forEach(station => {
            const delhiCode = "";//data.other.delhiCode;
            station.coordinates = olc.decode(delhiCode + station.plusCode);
            // console.log(this.#stationData);
        });
    }

    #Lat_Lon_to_X_Y_Conversion(){
        
        Object.values(this.#stationData).forEach(station => {
            if (!station.coordinates) return;

            const lat = station.coordinates.latitudeCenter;
            const lon = station.coordinates.longitudeCenter;

            // Simple Linear Scaling formula to map coords to SVG width and height
            const x = (lon - this.#bounds.minLon) * earthScale * this.#scaleMultiplier * Math.cos(this.#avgLatRad);
            // Y is inverted because SVG Y coordinate starts from 0 at the top and goes down
            const y = (this.#bounds.maxLat - lat) * earthScale * this.#scaleMultiplier;

            // Scaled coordinates ko station.xy property mein store karte hain
            station.xy = { x, y };
        });
        console.log("Mapped Station Coordinates (X, Y):", this.#stationData);
    }

    // =========================================================================
    // 6. SVG RENDERING & LAYOUT SIZING HELPERS
    // =========================================================================
    #create_svg(){
        // SVG element initialize karke attributes set karte hain
        this.#svg.elements.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
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

        Object.values(this.#stationData).forEach(station => {
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
        const avgLatRad = avgLat * Math.PI / 180; // Degrees ko Radians mein convert karte hain cosine logic ke liye
        
        // Avg Latitude ke cosine factor se width standardise karte hain (Mercator alignment)
        const width = Math.round((this.#bounds.maxLon - this.#bounds.minLon) * earthScale * this.#scaleMultiplier * Math.cos(avgLatRad));
        const height = Math.round((this.#bounds.maxLat - this.#bounds.minLat) * earthScale * this.#scaleMultiplier );
        return { width, height };
    }

    // SVG elements par dynamic viewBox dimensions set karta hai
    #setSVG_viewBox() {
        const svgSize = this.#calculateSVGSize();

        const marginPercent = 0.05; // 10% प्रतिशत
        const margin = Math.round(Math.max(svgSize.width, svgSize.height) * marginPercent);

        this.#svg.elements.svg.setAttribute(
            "viewBox", 
            `-${margin} -${margin} ${svgSize.width + (2 * margin)} ${svgSize.height + (2 * margin)}`
        );
    }

    #drawStationCircles(){
        const stations_circleGroup = this.#createGroup("stationCircles");
        
        Object.values(this.#stationData).forEach(station => {
            const xy = station.xy;
            if (xy) {
                // 'station' already station object hai, toh hum directly station.lines use kar sakte hain
                const lineColor = data.line_color[station.lines[0]]?.color ?? "#333";
                const circle = this.#createCircle(xy.x, xy.y, 200 , "#FDFBD4", lineColor);
                circle.dataset.stationId = station.id;
                stations_circleGroup.appendChild(circle);
            }
        });

        this.#svg.elements.stations_circleGroup = stations_circleGroup;
        this.#svg.elements.mainGroup_layer.appendChild(stations_circleGroup);
    }
    
    #drawMetroLines(){
        
        const tracks_lineGroup = this.#createGroup("metroLines");
        
        const drawn = new Set();
        Object.values(this.#stationData).forEach(station => {
            station.neighbors.forEach(neighbor => {
                const key = [station.id, neighbor.station].sort().join("-");
                
                if(drawn.has(key)) return;

                drawn.add(key);
                const nextStation = this.#stationData[neighbor.station];
                const lineInfo = data.line_color[neighbor.line];

                const line = this.#createLine( station.xy.x, station.xy.y, nextStation.xy.x, nextStation.xy.y, lineInfo.color, 100 );
                line.dataset.edgeId = key;
                tracks_lineGroup.appendChild(line);
            });

        });
        this.#svg.elements.tracks_lineGroup = tracks_lineGroup;
        this.#svg.elements.mainGroup_layer.appendChild(tracks_lineGroup);
    }

   #drawStationLabels(lang="en") {
        const labelGroup = this.#createGroup("stationLabels");
        

        //clear old name if avilable
        if (this.#svg.elements.labelGroup) {
            this.#svg.elements.labelGroup.remove();
        }
        Object.values(this.#stationData).forEach(station => {
            if(!station.xy) return;
            const text = document.createElementNS( "http://www.w3.org/2000/svg", "text" );

            // Offset the text slightly from the station center
            const x = station.xy.x + 150;
            const y = station.xy.y - 150;

            text.setAttribute( "x", x );
            text.setAttribute( "y", y );
            text.setAttribute( "font-size", 450 );
            text.setAttribute( "font-family", "Arial, sans-serif" );
            text.setAttribute( "fill", "#222" );
            text.setAttribute( "style", "user-select: none;" );

            text.textContent = lang === "hi" && station.name_hi ? station.name_hi : station.name;
            
            text.dataset.stationId = station.id;

            // Rotate the text -35 degrees around its own anchor point (x, y)
            // text.setAttribute( "transform", `rotate(-35, ${x}, ${y})` );
            
            labelGroup.appendChild(text);
        });

        this.#svg.elements.labelGroup = labelGroup;
        this.#svg.elements.mainGroup_layer.appendChild(labelGroup);
    }

    #getDistance(stationA, stationB) {
        const lat1 = stationA.coordinates.latitudeCenter;
        const lon1 = stationA.coordinates.longitudeCenter;

        const lat2 = stationB.coordinates.latitudeCenter;
        const lon2 = stationB.coordinates.longitudeCenter;

        const R = 6371; // Earth radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2( Math.sqrt(a), Math.sqrt(1 - a) );
        return Number((R * c).toFixed(2));
    }

    #calculateNeighborDistance(){
        Object.values(this.#stationData).forEach(station => {
            station.neighbors.forEach(neighbor => {
                const nextStation = this.#stationData[neighbor.station];
                neighbor.distance = this.#getDistance( station, nextStation );
            });
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
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", radius);
        circle.setAttribute("fill", fillColor);
        circle.setAttribute("stroke-width", 50);
        circle.setAttribute("stroke", strokeColor);
        return circle;
    }
    #createLine(x1, y1, x2, y2, strokeColor, strokeWidth=50) {
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
