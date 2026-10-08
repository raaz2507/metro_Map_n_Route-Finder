# Transit Network & City Selector Documentation

## 1. Overview & Purpose

`TransitNetworkSelector.html` serves as the primary gateway for discovering and selecting urban transit systems across India (and international networks via country manifests). 

It solves a key multi-system challenge: cities like **Delhi NCR, Mumbai, and Kolkata** operate multiple distinct transit modes (Heavy Metro, Rapid Metro, RRTS, Monorail, and Suburban lines). This page provides a unified, searchable directory where commuters can:
1. Search cities, transit systems, or specific stations/landmarks.
2. Filter by transit **Mode** (Metro, RRTS, Monorail, MetroLite, MetroNeo).
3. Filter by **Status** (Operational, Partial, Under Construction).
4. Sort by status priority, alphabetical city/name, or mode.
5. Select a unified **City Group** (all lines combined) or an individual system.
6. Seamlessly redirect to the interactive map and route planner (`index.html`) with query params and `localStorage` persistence.

---

## 2. Technical Architecture & Component Hierarchy

The page is implemented via modern ES2022 OOP class architecture with private encapsulation (`#`) in [`main_project/js/pages/transit_network_selector.js`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/js/pages/transit_network_selector.js).

```mermaid
flowchart TD
    User([User Entry: TransitNetworkSelector.html]) --> Init[TransitNetworkSelector.init]
    Init --> Header[HeaderComponent.render('networks')]
    Init --> Footer[FooterComponent.render]
    Init --> ManifestFetch[Fetch data/countries_manifest.json]
    ManifestFetch --> RegistryFetch[Fetch data/{country}/{country}_transit_registry.json]
    RegistryFetch --> SearchInit[UniversalSearchEngine.init & bindUI]
    SearchInit --> RenderEngine[#render Data Processing]
    
    RenderEngine --> GroupGen[Generate Virtual City Group Cards]
    RenderEngine --> FilterSort[Apply Filters & Sort Matrix]
    FilterSort --> DOMRender[DOM Injection to #transit-selector-container]
    
    DOMRender --> UserClick{User Selects Network}
    UserClick -->|Under Construction / No Data| ToastBlock[Show Warning / Data Pending Toast]
    UserClick -->|Operational System| PersistState[Write to localStorage & Redirect index.html]
```

---

## 3. Data Pipeline & Registry Resolution

### 3.1 Registry Resolution Flow
1. **Country Resolution**:
   - Resolves country code via URL param `?country=...`, falling back to `localStorage.getItem("active_country")`, defaulting to `"india"`.
2. **Manifest Lookup**:
   - Fetches `data/countries_manifest.json` to find the country metadata and registry JSON path (`countryMeta.registryPath`).
3. **Registry Payload**:
   - Fetches the resolved registry file (e.g. `data/india/india_transit_registry.json`).
   - Registry structure:
     ```json
     {
       "country": "India",
       "countryCode": "IN",
       "cities": {
         "delhi_ncr": {
           "name": { "en": "Delhi NCR", "hi": "दिल्ली एनसीआर" },
           "state": { "en": "Delhi / Haryana / UP", "hi": "दिल्ली / हरियाणा / यूपी" },
           "hasData": true,
           "themeColor": "#1E40AF",
           "networks": {
             "dmrc": { "name": "...", "mode": "Metro", "status": "operational", "hasData": true },
             "rapid_metro_gurgaon": { "name": "...", "mode": "Metro", "status": "operational", "hasData": true },
             "namo_bharat_rrts": { "name": "...", "mode": "RRTS", "status": "operational_partial", "hasData": true }
           }
         }
       }
     }
     ```

---

## 4. Virtual Combined Group Cards

For any metropolitan region with **more than 1 transit network** (e.g., Delhi NCR, Mumbai, Hyderabad):
- The controller automatically synthesizes a **Virtual Group Card** (`item.isGroupCard = true`).
- Card title format: `{City Name} (All Networks)` (Localized via `pages.networks.card.allNetworksSuffix`).
- Operator subtitle: `Combined City Data` (Localized via `pages.networks.card.combinedSubtitle`).
- Aggregates system brand icons into an avatar stack.
- Assigns dedicated SVG hub track silhouettes (`track_05.svg`, `track_07.svg`, `track_10.svg`, `track_12.svg`, `track_13.svg`).
- Clicking the group card sets `networkKey = "all"` or leaves it empty, allowing `index.html` to load all combined network layers on the canvas.

---

## 5. Search Engine & Autocomplete (`UniversalSearchEngine`)

The page embeds the `UniversalSearchEngine` instance (`scope: "global"`):
- **Typo Tolerance**: Handled client-side using Levenshtein distance and phonetic matching.
- **Bi-Lingual Corpus**: Queries match against city names, network names, state names, and landmarks in both English and Hindi.
- **Autocomplete Suggestions**:
  - Typing reveals suggestions dropdown (`#search-autocomplete-dropdown`).
  - Selecting a station suggestion immediately redirects to `index.html?city={cityKey}&to={stationId}`.
  - Selecting a network suggestion redirects to `index.html?city={cityKey}&network={networkKey}`.

---

## 6. Filtering & Sorting Matrix

### 6.1 Mode Filters
| Filter Code | UI Label | Target Transit Types |
|---|---|---|
| `all` | All Modes | Shows everything including combined group cards |
| `Metro` | Metro | Standard heavy rail rapid transit systems |
| `RRTS` | RRTS | Regional Rapid Transit Systems (e.g. Namo Bharat) |
| `Monorail` | Monorail | Straddle monorail systems (e.g. Mumbai Monorail) |
| `MetroLite` | MetroLite | Light rail urban transit systems |
| `MetroNeo` | MetroNeo | Electric trolleybus / dedicated guideway systems |

### 6.2 Status Filters
| Filter Code | Badge / CSS Class | Description |
|---|---|---|
| `all` | All Status | Shows operational, partial, and upcoming projects |
| `operational` | `status-operational` | Fully operational commercial systems |
| `operational_partial` | `status-operational_partial` | Corridors with active priority sections under ongoing expansion |
| `under_construction` | `status-under_construction` | Systems currently in civil construction |

### 6.3 Sorting Algorithms
- **`status_smart` (Default)**: Operational first $\rightarrow$ Partial Service $\rightarrow$ Under Construction $\rightarrow$ Proposed.
- **`city_asc`**: Alphabetical order by city name.
- **`name_asc`**: Alphabetical order by network name.
- **`mode`**: Grouped by mode category.
- **Persistence**: User selection saved to `localStorage.getItem("transit_sort_preference")`.

---

## 7. State Management & Navigation Lifecycle

### 7.1 Selection Handler (`#handleNetworkSelect`)
```javascript
#handleNetworkSelect(cityKey, networkKey, status, netName)
```
1. **Status Blocker Check**:
   - If status is `under_construction`, `proposed`, or `approved`, clicking does **not** redirect. Instead, it displays a non-intrusive warning Toast explaining construction/planning phase.
2. **Data Availability Validation**:
   - Checks `cityData.hasData` and `networkData.hasData`.
   - If data generation is pending, displays info Toast `"🛠️ Data Integration Pending"`.
3. **Persistence & Redirection**:
   - Saves:
     - `localStorage.setItem("active_city", cityKey);`
     - `localStorage.setItem("active_network", networkKey || "");`
   - Redirects to:
     ```
     index.html?city={cityKey}&network={networkKey}
     ```

---

## 8. Internationalization (i18n)

- All UI strings, chip labels, placeholders, stats counters, toasts, and card titles are mapped to `pages.networks.*` in [`lang/india/hi/networks.js`](file:///d:/projects/metro_Map_n_Route Finder/main_project/lang/india/hi/networks.js) and [`lang/en/networks.js`](file:///d:/projects/metro_Map_n_Route Finder/main_project/lang/en/networks.js).
- Subscribed to `appStateStore.subscribe("currentLang", () => this.#render())`: when language is switched via header menu, cards and search placeholders re-render instantly in place with zero page reload.

---

## 9. File & Dependency Map

| File Path | Role |
|---|---|
| [`main_project/TransitNetworkSelector.html`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/TransitNetworkSelector.html) | HTML entry point & semantic markup |
| [`main_project/js/pages/transit_network_selector.js`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/js/pages/transit_network_selector.js) | ES2022 Page controller |
| [`main_project/css/pages/transit_network_selector.css`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/css/pages/transit_network_selector.css) | Scoped CSS and layout styles |
| [`main_project/data/countries_manifest.json`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/data/countries_manifest.json) | Country registry router |
| [`main_project/data/india/india_transit_registry.json`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/data/india/india_transit_registry.json) | India cities & networks master database |
| [`main_project/lang/india/hi/networks.js`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/lang/india/hi/networks.js) | Hindi locale dictionary |
| [`main_project/lang/en/networks.js`](file:///d:/projects/metro_Map_n_Route%20Finder/main_project/lang/en/networks.js) | English locale dictionary |
