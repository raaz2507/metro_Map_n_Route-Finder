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
        this.#calculateNeighborDistance();

        this.#create_svg();
        this.#drawMetroLines();
        this.#drawStationCircles();
        this.#drawStationLabels();
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

    #drawStationCircles(){
        Object.values(this.#stationData).forEach(station => {
            const xy = station.xy;
            if (xy) {
                // 'station' already station object hai, toh hum directly station.lines use kar sakte hain
                const lineColor = data.line_color[station.lines[0]]?.color ?? "#333";
                const circle = this.#createCircle(xy.x, xy.y, 200 * this.zoomScale, "#FDFBD4", lineColor);
                this.#svg.element.appendChild(circle);
            }
        });
    }
    
    #drawMetroLines(){
        const drawn = new Set();
        Object.values(this.#stationData).forEach(station => {
            station.neighbors.forEach(neighbor => {
                const key = [station.id, neighbor.station].sort().join("-");
                
                if(drawn.has(key)) return;

                drawn.add(key);
                const nextStation = this.#stationData[neighbor.station];
                const lineInfo = data.line_color[neighbor.line];

                const line = this.#createLine( station.xy.x, station.xy.y, nextStation.xy.x, nextStation.xy.y, lineInfo.color, 100 * this.zoomScale );
                this.#svg.element.appendChild(line);
            });

        });
    }

   #drawStationLabels(){
        Object.values(this.#stationData).forEach(station => {

            if(!station.xy) return;

            const text = document.createElementNS( "http://www.w3.org/2000/svg", "text" );

            text.setAttribute( "x", station.xy.x + 250 );

            text.setAttribute( "y", station.xy.y + 50 );

            text.setAttribute( "font-size", 450 * this.zoomScale );

            text.setAttribute( "font-family", "Arial, sans-serif" );

            text.setAttribute( "fill", "#222" );

            text.textContent = station.name;

            this.#svg.element.appendChild(text);
        });
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
    // 6. SVG Elemnts creator 
    // =========================================================================

    #createCircle(x, y, radius, fillColor, strokeColor) {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", x);
        circle.setAttribute("cy", y);
        circle.setAttribute("r", radius);
        circle.setAttribute("fill", fillColor);
        circle.setAttribute("stroke-width", 50*this.zoomScale);
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
