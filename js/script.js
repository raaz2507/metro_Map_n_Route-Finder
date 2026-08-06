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
    #svg = {element:null, width:1000, height:1000};
    #stationData = data.stationData;
    #bounds = null;     // बाउंड्स स्टोर करने के लिए
    #avgLatRad = 0;     // रेडियन वैल्यू स्टोर करने के लिए
    zoomScale = 1; // Metro map zoom factor
    
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
        this.#elemts = document.querySelector(".mapContainer");
    }

    #init(){
        this.#get_element();
        this.#plusCode2Coordinates();
        
        this.#getBounds();
        const avgLat = (this.#bounds.minLat + this.#bounds.maxLat) / 2;
        this.#avgLatRad = avgLat * Math.PI / 180;
        
        this.#Lat_Lon_to_X_Y_Conversion();
        this.#create_svg();
        this.#drawStationCircle();
        this.#set_event();
    }

    #set_event(){

    }

    // =========================================================================
    // 4. DATA PROCESSING & COORDINATES CONVERSION
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
            const x = (lon - this.#bounds.minLon) * earthScale * this.zoomScale * Math.cos(this.#avgLatRad);
            // Y is inverted because SVG Y coordinate starts from 0 at the top and goes down
            const y = (this.#bounds.maxLat - lat) * earthScale * this.zoomScale;

            // Scaled coordinates ko station.xy property mein store karte hain
            station.xy = { x, y };
        });
        console.log("Mapped Station Coordinates (X, Y):", this.#stationData);
    }

    // =========================================================================
    // 5. SVG RENDERING & LAYOUT SIZING HELPERS
    // =========================================================================
    #create_svg(){
        // SVG element initialize karke attributes set karte hain
        this.#svg.element = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        this.#svg.element.setAttribute("width", "100%");
        this.#svg.element.setAttribute("height", "100%");
        
        // SVG ke viewBox dimensions set karte hain bounds ke according
        this.#setSVG_viewBox(this.#svg.element);

        this.#elemts.appendChild(this.#svg.element);
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
        const width = (this.#bounds.maxLon - this.#bounds.minLon) * earthScale * this.zoomScale * Math.cos(avgLatRad);
        const height = (this.#bounds.maxLat - this.#bounds.minLat) * earthScale * this.zoomScale;
        return { width, height };
    }

    // SVG elements par dynamic viewBox dimensions set karta hai
    #setSVG_viewBox() {
        
        const svgSize = this.#calculateSVGSize();
        this.#svg.element.setAttribute("viewBox", `0 0 ${svgSize.width} ${svgSize.height}`);
    }

    #drawStationCircle(){
        Object.values(this.#stationData).forEach(station => {
            const xy = station.xy;
            if (xy) {
                // 'station' already station object hai, toh hum directly station.lines use kar sakte hain
                const circle = this.#createCircle(xy.x, xy.y, 250 * this.zoomScale, "#FDFBD4", station.lines[0]);
                this.#svg.element.appendChild(circle);
            }
        });
    }
    // =========================================================================
    // 6. SVG Elemnts creator 
    // =========================================================================

    #createCircle(x, y, radius, fillColor, strokeColor) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", radius);
        circle.setAttribute("fill", fillColor);
        circle.setAttribute("stroke-width", 5*this.zoomScale);
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
