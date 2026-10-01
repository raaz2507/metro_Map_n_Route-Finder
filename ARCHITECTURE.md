<!-- 
  🤖 AI MAINTENANCE NOTICE:
  This ARCHITECTURE.md file is maintained by the AI Assistant (Antigravity / Gemini) to preserve 
  full project memory, context, and structural integrity across new chat sessions.
  Per user authorization, the AI has permission to update this specific file as the architecture 
  and codebase evolve. All other project files (HTML, CSS, JS) must NOT be edited directly without chat approval.
-->

# 🚇 YatraMarg (Metro Map & Route Finder) — Architecture & Context Guide

> **Core Philosophy:** "Write Once, Run Everywhere with Zero Code Duplication"  
> **Source Directory Authority:** `main_project/` (Powers Web, PWA, and Capacitor Android Native APK).

---

## 🗺️ Architectural Overview & Data Flow

```
┌────────────────────────────────────────────────────────┐
│                   1. UI / VIEW LAYER                   │
│   • pages: home.js, station_info.js, tvm_dispenser.js  │
│   • components: JourneyDetailsView.js, metro-map.js    │
│   • utilities: Toast.js (accessible, no window.alert)  │
└───────────────────────────┬────────────────────────────┘
                            │ User Actions (Search, Filter, City Switch)
┌───────────────────────────▼────────────────────────────┐
│              2. ORCHESTRATION LAYER (CORE)             │
│   • CenterClass.js: Facade coordinating UI & Services  │
│   • MetroDataStore.js: Singleton Data Store & Filter   │
│   • event-bus.js: Decoupled pub/sub event bus          │
└───────────────────────────┬────────────────────────────┘
                            │ Graph & Policy Queries
┌───────────────────────────▼────────────────────────────┐
│              3. ENGINES & SERVICES LAYER               │
│   • RouteFinder.js: Journey builder, NextHop & Platforms│
│   • DijkstraAlgo.js: Min-Heap State-Space Graph Solver │
│   • FareCalculator.js: Strategy Pattern, Holiday/Time  │
└───────────────────────────┬────────────────────────────┘
                            │ Verified JSON Feeds
┌───────────────────────────▼────────────────────────────┐
│               4. VERIFIED DATA LAYER                   │
│   • data/cities/{city}/transit_network.json            │
│   • stationData: IDs, coordinates, neighbors, platforms│
│   • lines: IDs, colors, route {from, to}, stations     │
│   • transfers: Interchange times, modes (corridor/sky) │
│   • fareRules: distance_based policies, weekday/holiday│
└────────────────────────────────────────────────────────┘
```

---

## 📂 Project Directory Structure

```
d:\projects\metro_Map_n_Route Finder\
├── ARCHITECTURE.md                  # 🌟 This document (AI Project Memory)
├── THEME_ARCHITECTURE_PLAN.md       # 🎨 Pluggable Theme & Modular Skin Pack Roadmap
├── package.json                     # Root configuration
├── capacitor.config.json            # Capacitor Android Native bridge config
├── android/                         # Capacitor Native Android Project (Built from main_project)
├── doc/                             # Technical deep-dives (01_architecture, etc.)
└── main_project/                    # 🎯 SINGLE SOURCE OF TRUTH
    ├── index.html                   # Main entry point (Find Route, Live Map)
    ├── station_info.html            # Station Details & Facilities
    ├── manifest.json & sw.js        # PWA Offline & Install support
    ├── css/
    │   ├── base.css                 # Master Design Tokens & CSS Variables (--text-primary, etc.)
    │   ├── components/              # Floating nav, cards, modals, toast
    │   └── pages/                   # Page-specific stylesheets
    ├── data/
    │   ├── india_transit_registry.json # Master registry of supported cities
    │   └── cities/
    │       ├── delhi_ncr/           # DMRC, NMRC, Rapid Metro, NCRTC RRTS
    │       │   ├── transit_network.json
    │       │   ├── station_details.json
    │       │   └── passenger_support.json
    │       └── mumbai/              # MMOPL, MMMOCL, Monorail
    │           ├── transit_network.json
    │           └── station_details.json
    └── js/
        ├── core/
        │   ├── app-config.js        # Global environment flags (PWA vs Native Capacitor)
        │   ├── metro-data-store.js  # Singleton Data Repository (Deep merge & network filter)
        │   ├── CenterClass.js       # Central Orchestration Controller (Singleton)
        │   ├── event-bus.js         # Decoupled Event System
        │   ├── i18n.js              # Strict Zero-Fallback Single-Pass Localization Engine
        │   └── data-utils.js        # Geospatial distance, string cleaners, OLC codes
    ├── lang/                        # 🌐 Enterprise Modular Localization System
    │   ├── en.js / hi.js            # Clean modular composers (zero monolith)
    │   └── en/ & hi/                # Page-scoped dictionaries (common, home, networks, etc.)
        ├── services/
        │   ├── route/
        │   │   ├── DijkstraAlgo.js  # Pure State-Space Graph Solver (PriorityQueue)
        │   │   └── RouteFinder.js   # Journey coordinator, walkway timings, platform finder
        │   ├── fare/
        │   │   └── FareCalculator.js# Dynamic Strategy Fare Engine (Sunday/Peak auto-sync)
        │   ├── search/              # Universal Search Engines (Fuzzy station search)
        │   └── sensors/             # Telemetry & GPS Tracking
        ├── components/
        │   ├── JourneyDetailsView.js# Step-by-step route timeline & dynamic fare selector
        │   ├── Toast.js             # Sleek auto-dismissing notifications (No browser alerts)
        │   ├── Header.js & Footer.js# Universal responsive layouts
        │   └── metro-map.js         # Interactive SVG Map Controller
        └── pages/
            ├── home.js              # Find route controller & event listeners
            └── station_info.js      # Station facilities, platforms, gates renderer
```

---

## ⚙️ Core Engines & Technical Implementation Details

### 1. `DijkstraAlgo.js` (Graph Solver)
- **State-Space Node Keys:** Tracks `stationId-line` so transfers incur realistic penalties.
- **Priority Queue:** Binary min-heap for $O((V + E) \log V)$ optimal performance.
- **Route Modes:** 
  - `leastTransfers`: Uses virtual penalty (`LEAST_TRANSFER_PENALTY = 1000m`) to minimize line changes.
  - `shortestDistance`: Uses minimal penalty (`0.5m`) to optimize purely on geographical meters.

### 2. `RouteFinder.js` (Journey & Platform Coordinator)
- **Step Construction:** Aggregates contiguous train segments and walkway transfers.
- **Topological Forward Reachability Platform Resolver:**
  - `getInterchangePlatformNumber(stationOrId, targetLineId, nextHopOrTerminalId)`
  - Avoids circular loop infinite iterations by determining which platform destination on `targetLineId` is reachable from `nextHop` without backtracking through the interchange station.
  - Normalizes station query strings (handling underscores, hyphens, and aliases like `huda_city_center` ➔ `millennium_city_centre_gurugram`).

### 3. `FareCalculator.js` (Universal Fare Strategy Engine)
- **Zero Hardcoding Strategy Pattern:** Supports `distance_based`, `station_pair`, `station_count_based`, and `flat_rate`.
- **DMRC Delhi Fare Slabs (Effective 25 Aug 2025):**
  - **Weekday (Mon–Sat):** 0–2 km: ₹11, 2–5 km: ₹21, 5–12 km: ₹32, 12–21 km: ₹43, 21–32 km: ₹54, >32 km: ₹64.
  - **Sunday & National Holidays:** 0–2 km: ₹11, 2–5 km: ₹11, 5–12 km: ₹21, 12–21 km: ₹32, 21–32 km: ₹43, >32 km: ₹54.
- **Automatic Day & Slot Synchronization:**
  - Evaluates `journeyDate.getDay() === 0` to automatically apply `fareTables.holiday`.
  - Smart Card: 10% discount.
  - Off-Peak Smart Card: Additional 10% (Total 20% off) during `< 08:00`, `12:00–17:00`, and `> 21:00`.

### 4. `MetroDataStore.js` (Data Store & Network Filtering)
- Manages dynamic switching between cities (e.g. `delhi_ncr` ➔ `mumbai`).
- Uses `AbortController` to cancel in-flight HTTP fetches upon rapid user switching.

---

## 🚨 Strict Behavioral & Coding Standards (For AI Pair Programmer)

1. **🔒 No Direct Source Code Modifications**:
   - The AI must **NEVER** directly modify application source code (HTML, CSS, JS) files.
   - Code changes must be provided strictly in copy-paste blocks inside the chat.
   - *Exception:* This `ARCHITECTURE.md` file can be updated by the AI to keep documentation in sync.

2. **💬 First Discuss, Plan on Confirmation, Code on Final Plan**:
   - Step 1: Analyze root causes and discuss in Hindi/Hinglish.
   - Step 2: Present a clear, phased Implementation Plan.
   - Step 3: Output final code blocks only after the user approves the plan.

3. **🛡️ ES2022 Private OOP Encapsulation (`#`)**:
   - All classes must use private fields and methods (`#state`, `#dom`, `#bindEvents()`).
   - No loose procedural functions in global scope.

4. **🚫 Anti-Pattern Prohibitions**:
   - **NO JS Symptom Patches:** Never use string `.replace()` hacks or dummy fallbacks to mask corrupted data. Fix errors directly at the root data source.
   - **NO `!important` abuse:** Leverage CSS design tokens from `base.css` (`var(--text-primary)`, `var(--card-bg)`).
   - **NO `window.alert()`:** Always use `Toast.show()` for async user notifications.

5. **📱 Mobile-First Responsiveness**:
   - Layouts must be built mobile-first (`flex-col` on mobile, `flex-row` on desktop) without horizontal overflow.

---

## ⚡ Quick-Start Instruction for New Chat Sessions

When starting a fresh chat session with the AI, the user only needs to state:
> *"कृपया ARCHITECTURE.md पढ़ लो और हमारे कोडिंग रूल्स के अनुसार काम शुरू करो।"*
