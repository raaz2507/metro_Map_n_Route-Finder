# 🚆 Technical Documentation: Metro Map & Route Finder Engine

This document provides a comprehensive technical reference for the distance calculation, policy-based dynamic fare determination, station pair matrices, multilingual data architecture, smart travel time estimation, location normalization, and UI presentation rules implemented in the **Metro Map & Route Finder** application.

---

## 📐 1. Distance Calculation Logic (`totalDistance`)

### 1.1 Storage Unit & Resolution
- All inter-station physical distances are stored as **integer meters** (e.g. `1117` meters) in `data/data.json` under `stationData.[stationId].neighbors.[].distance`.
- Distances represent true physical rail tracks between neighboring station pairs.

### 1.2 Summation & Unit Conversion
- **Path Reconstruction**: During Dijkstra path reconstruction in `RouteFinder`, physical rail distances between adjacent station nodes are accumulated in integer meters:
  $$\text{totalDistance} = \sum \text{edge.distance}$$
- **Single Kilometers Conversion**: Meter-to-kilometer division (`/ 1000`) is performed **only once** at the very end when:
  1. Matching against `fareRules.policies.dmrc_standard.fareTables.weekday` in `RouteFinder` (`(totalDistance / 1000).toFixed(2)`).
  2. Formatting the UI display string in `Dashboard` (`(totalDistance / 1000).toFixed(1)`).
- **Strict Zero-Extra Distance Rule**: No hardcoded pixel/penalty meters are added to `totalDistance`. The distance represents the pure physical rail track length.

---

## 💰 2. Policy-Based Dynamic Fare & Discount Logic (`totalFare`)

### 2.1 DMRC Official Shortest Distance Norm
- In compliance with DMRC (Delhi Metro Rail Corporation) official ticketing rules:
  > *The fare between Station A and Station B is determined strictly by the **Shortest Distance** path between A and B, regardless of whether the user chooses a direct route or a transfer-heavy route.*
- When the user toggles between **Shortest Route** and **Least Transfers**:
  - **Row 1 Metrics** (Distance, Time, Stations, Line Change) update dynamically to reflect the chosen route.
  - **Row 2 Fares** remain locked to the Shortest Distance fare for that station pair.

### 2.2 Dynamic Fare Determination

#### A. Standard Distance-Based Slabs (`fareRules.policies.dmrc_standard`)
Base token fares for standard DMRC lines are extracted dynamically from `fareRules.policies.dmrc_standard.fareTables.weekday`:

| Slab | Distance Range (minKm - maxKm) | Base Token Fare |
| :---: | :---: | :---: |
| 1 | 0 km to 2 km | ₹11 |
| 2 | 2 km to 5 km | ₹21 |
| 3 | 5 km to 12 km | ₹32 |
| 4 | 12 km to 21 km | ₹43 |
| 5 | 21 km to 32 km | ₹54 |
| 6 | > 32 km (null) | ₹64 |

#### B. Airport Express Fare Matrix (`fareRules.policies.airport_express`)
For journeys on the Airport Express Line or NCRTC RRTS, fares are looked up from the 2D matrix using indexed station lookup: `matrix[stations.indexOf(startId)][stations.indexOf(endId)]` (e.g. `new_delhi` to `igi_airport` = ₹64).

### 2.3 4 Dynamic Fares & Discount Calculation
`RouteFinder.#calculateFare()` reads discount policies dynamically from `data.json` and computes four fare tiers:

1. **Token Fare** ($\text{Token Fare}$):
   $$\text{Token Fare} = \text{baseFare}$$
2. **Smart Card Fare** ($\text{Smart Card (10\% Off)}$):
   $$\text{Smart Card Fare} = \text{Math.round}\left(\text{baseFare} \times \left(1 - \frac{\text{smartCardPct}}{100}\right)\right)$$
3. **Off-Peak Fare** ($\text{Off-Peak (10\% Off)}$):
   $$\text{Off-Peak Fare} = \text{Math.round}\left(\text{baseFare} \times \left(1 - \frac{\text{offPeakPct}}{100}\right)\right)$$
4. **Off-Peak Smart Card Fare** ($\text{Off-Peak Smart (20\% Off)}$):
   $$\text{Off-Peak Smart Fare} = \text{Math.round}\left(\text{baseFare} \times \left(1 - \frac{\text{smartCardPct} + \text{offPeakPct}}{100}\right)\right)$$

---

## 🌐 3. Multilingual Data & Line Mapping Architecture

### 3.1 Standardized Multilingual Schema (`name: { en, hi }`)
All station names and line names in `data/data.json` follow a 100% standardized nested object structure:
- **Station Object**:
  ```json
  "jhilmil": {
      "id": "jhilmil",
      "name": {
          "en": "JhilMil",
          "hi": "झिल मिल"
      },
      "lines": ["dmrc.red"],
      "properties": {
          "layout": "elevated",
          "station_type": "normal",
          "status": "operational"
      }
  }
  ```
- **Line Object**:
  ```json
  "dmrc.red": {
      "id": "dmrc.red",
      "network": "dmrc",
      "label": "1",
      "color": "#C60C30",
      "color_name": "red",
      "name": {
          "en": "Line 1 - Red Line - Rithala to Shaheed Sthal (New Bus Adda)",
          "hi": "लाइन 1 - रेड लाइन - रिठाला से शहीद स्थल (नया बस अड्डा)"
      }
  }
  ```

### 3.2 Safe Access Helpers (`data-utils.js`)
- `getStationName(station, lang)`: Returns `station.name?.[lang] || station.name?.en || ""`.
- `getLineName(lineInfo, lang)`: Returns `lineInfo.name?.[lang] || lineInfo.name?.en || ""`.
- `getStationType(station)`: Safely reads `station.properties?.station_type || "normal"`.
- `getStationLayout(station)`: Safely reads `station.properties?.layout || "elevated"`.

---

## ⏱️ 4. Smart Travel Time Estimation Logic (`totalTime`)

Travel time is calculated using a human-speed physics model combined with metro operational constants:

### 4.1 Train Moving Time
- **Average Metro Speed**: **36 km/h** = **600 meters per minute** (includes acceleration, deceleration, and cruising).
$$\text{trainMovingTime (mins)} = \frac{\text{totalDistanceInMeters}}{600}$$

### 4.2 Station Halt / Dwell Time
- **Station Halt Time**: **30 seconds** (0.5 minute) per intermediate station stop.
$$\text{stationHaltTime (mins)} = (\text{stationCount} - 1) \times 0.5$$

### 4.3 Pure Dynamic Walkway & Transfer Time
Transfer time is calculated 100% dynamically based on human walking speed (`avgHumanWalkingSpeedMetersPerMin = 80 m/min`) and physical distance:
- **Inter-Station Walkway Transfer**:
  - Physical distance between station coordinates (`lat`, `lon`) is computed dynamically using the **Haversine Geodesic Distance Formula** via `getDistance(stationA, stationB)`.
  - Transfer time in seconds:
    $$\text{transferSeconds} = \text{Math.round}\left(\frac{\text{distanceInMeters} \times 60}{\text{walkingSpeed}}\right)$$
- **Intra-Station Crossover Transfer**:
  - Physical transfer distance is extracted dynamically from station metadata (`properties.walkway_distance_meters` or `properties.interchange_distance_meters`).
- **Strict No-Jugaad Rule**:
  - If valid physical distance metadata or GPS coordinates are unavailable, the system strictly returns `null` (`N/A`) rather than substituting arbitrary fallback numbers.

### 4.4 Total Journey Time
$$\text{totalTime} = \text{Math.ceil}(\text{trainMovingTime} + \text{stationHaltTime} + \text{totalWalkwayTime})$$

---

## 📍 5. Location Coordinate Priority (`getCoordinates`)

To support multi-format geographic data in `data.json`, location coordinates are extracted using a strict 3-tier priority hierarchy:

```
[Priority 1: location.decimal] ➔ (If valid, return { lat, lon } immediately)
         ↓ (If missing or empty)
[Priority 2: location.dms]     ➔ (Convert DMS "28°40'32.8\"N" to Decimal and return)
         ↓ (If missing or empty)
[Priority 3: location.plusCode]➔ (Decode OpenLocationCode "7JWVM8G6+8X" and return)
         ↓ (If all 3 missing)
[Fallback: console.warn & return null]
```

### One-Time Pre-Processing (`normalizeStationCoordinates`)
To eliminate loop overhead during SVG rendering and routing, `normalizeStationCoordinates(rawMetroData)` executes **once at application load** in `Dashboard.#init()`. It resolves any missing coordinates into `station.location.decimal`, ensuring $O(1)$ direct property access (`station.location.decimal.lat`) across the entire application.

---

## 🎨 6. UI Presentation & Zero-Guess Rules

### 6.1 Journey Metrics Card (2-Row x 4-Column Layout)
The `Dashboard.#renderMetricsCard()` method renders a clean, theme-aware 2x4 metric grid:

```
+-----------------------------------------------------------------------+
|  26.4 km       |  47 Minutes     |  22 Stations    |  1 Line Change   |
|  (Distance)    |  (Time)         |  (Stations)     |  (Line Change)   |
+-----------------------------------------------------------------------+
|  ₹64           |  ₹58            |  ₹58            |  ₹51             |
|  Token Fare    |  Smart Card     |  Off-Peak       |  Off-Peak Smart  |
|                |  (10% Off)      |  (10% Off)      |  (20% Off)       |
+-----------------------------------------------------------------------+
| ☀️ First: 06:00 AM                                🌙 Last: 11:00 PM    |
+-----------------------------------------------------------------------+
```

### 6.2 Formatting Guidelines
- **Distance**: Format to 1 decimal place (e.g. `26.4`). The `km` unit is styled with normal font weight (`font-weight: 400`).
- **Discount Badges**: Discount percentages (e.g., `(10% Off)`, `(20% Off)`) are line-broken cleanly onto line 2 using `<br>` or styled badges.
- **Zero-Guess Platform Rule**: Platform numbers read `station.platform`. If unavailable in `data.json`, the fallback string is strictly **`"Platform No. __"`**. No fake numbers (such as `2` or `3`) are ever generated.
- **Dynamic Interchange Badge**: Timeline badges display live transfer times (e.g. `~5m`, `~3m`) generated per transfer step.