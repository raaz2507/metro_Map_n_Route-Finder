# Delhi-NCR Metro Map & Route Finder

🔗 **Live Demo:** [https://raaz2507.github.io/metro_Map_n_Route-Finder/](https://raaz2507.github.io/metro_Map_n_Route-Finder/)

An interactive, geographical SVG-based Metro Map and Route Finder for the Delhi-NCR (Delhi, Noida, Gurugram) Metro network. The application dynamically projects station locations using standard 10-digit global Plus Codes (Open Location Codes) and represents the entire network as an adjacency list graph.

---

## 🚀 Features

- **Interactive SVG Metro Map:** Renders the entire metro network dynamically on an SVG canvas, supporting smooth panning, zooming, and resetting views.
- **Geographically Accurate Projection:** Station coordinates are decoded from standard Plus Codes (e.g., `7JWVM69H+27`) to absolute latitude/longitude and mapped to 2D canvas coordinates.
- **100% Complete & Audited Database:** Features all 271 unique stations across all major metro lines:
	- **Red Line** (29 stations)
	- **Yellow Line** (37 stations)
	- **Blue Line** (56 stations, Main & Branch)
	- **Green Line** (24 stations, Main & Branch)
	- **Violet Line** (34 stations)
	- **Pink Line** (46 stations, Ring Loop & Northeast Branch)
	- **Magenta Line** (34 stations, Main & Phase 4 Extensions)
	- **Orange Line** (7 stations, Airport Express & Yashobhoomi Extension)
	- **Grey Line** (4 stations)
	- **Aqua Line** (21 stations, Noida Metro)
	- **Rapid Metro** (11 stations, Gurugram Metro)
- **Adjacency Graph (Neighbors Map):** Every station in the database contains a fully populated `neighbors` list mapping the adjacent stations and the line they share, making it ready for routing algorithms (Dijkstra/BFS).
- **Route Finder UI:** Interface supporting start/end station selection and routing preference ("Shortest Path" or "Less Interchange").

---

## 📁 Project Structure

```text
metro_Map_n_Route-Finder/
├── css/
│   └── style.css       # Visual styles and theme for the map & controls
├── data/
│   └── data.json       # Central database of stations, line colors, and metadata
├── js/
│   ├── open_location_code.js  # Standard Google OpenLocationCode (Plus Codes) library
│   └── script.js       # Main map renderer, projection logic, and event handling
├── index.html          # Main application page (Map viewport & Route Finder controls)
└── README.md           # Project documentation
```

---

## 📊 Data Schema (`data/data.json`)

The network is defined in a structured JSON schema. Below is the specification of a station entry:

```json
"station_id": {
	"id": "station_id",                     // Unique string identifier (snake_case)
	"name": "Station Name",                 // Display name of the station
	"lines": ["line_color1", "line_color2"], // Lines serving this station (Interchange support)
	"layout": "elevated" | "underground",   // Station construction layout
	"plusCode": "10_digit_plus_code",       // Standard global Plus Code (e.g., "7JWVM69H+27")
	"neighbors": [                          // Connected adjacent stations
		{
			"station": "neighbor_station_id",   // ID of the connected station
			"line": "line_color",               // Metro line color linking the stations
			"distance": 0                       // Weight parameter (initialized dynamically in JS)
		}
	]
}
```

---

## 🛠️ How to Run

1. Clone or download this repository to your local system.
2. Open `index.html` directly in any modern web browser, or serve it using a local development server (e.g., VS Code Live Server, `http-server` via npm, etc.).
3. Use the zoom controls (`+`, `-`, `=`) on the top-right to navigate the SVG canvas, or drag to pan around.
