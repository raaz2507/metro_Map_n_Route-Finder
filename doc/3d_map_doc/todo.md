# 📋 3D Metro Map Engine - Master TODO & Implementation Roadmap

> **Location:** `doc/3d_map_doc/todo.md`  
> **Status:** Phase 1 to 4 Complete (Pluggable Architecture, Real Data Integration & Fullscreen Controls Active)  
> **Goal:** High-performance, CoC-inspired Isometric Pure 3D Metro Visualization alongside existing 2D and 2.5D engines.

---

## 🎯 High-Level Milestones

- [x] **Phase 1: Architecture & Pluggable Engine Setup**
  - [x] Add Three.js dependency (Local offline bundle in `main_project/js/lib/three/`: Three.js v0.160.0, GLTFLoader, OrbitControls).
  - [x] Establish pluggable multi-engine foundation: `BaseMapEngine.js` and `MapEngineFactory.js`.
  - [x] Implement `Metro3DEngine.js` implementing the common `BaseMapEngine` interface.
  - [x] Integrate `MetroMap.js` facade to support toggling between `2D`, `2.5D`, and `3D Game View`.

- [x] **Phase 2: Base Terrain & Real Data Integration**
  - [x] Build procedural Warm Sandy/Isometric ground plane at $Z = 0$ with fog and directional lighting.
  - [x] Link `Metro3DEngine.js` to real transit network data (`metroDataStore.loadCity` / `transit_network.json`).
  - [x] Convert geographic Lat/Lon coordinates into scaled 3D world space coordinates ($X, Z$).
  - [x] Dynamic viaduct stone pillars under elevated stations and tracks.
  - [x] Purge obsolete and duplicate mock renderers (`ThreeRenderer.js`).

- [x] **Phase 3: Procedural 3D Track & UI Overlays**
  - [x] Generate 3D tube/rail geometry dynamically from station Lat/Lon coordinates using `CatmullRomCurve3`.
  - [x] Multi-line real data support (Delhi NCR, Agra, etc.).
  - [x] Top-right animated view mode widget (`[2D] [2.5D] [3D]`) with persistence fix across mode switches.
  - [x] Top-right fullscreen toggle button (`#btnToggleMapFullscreen`) with dual SVGs (`maximize-solid-full.svg`, `minimize-solid-full.svg`) and Capacitor Android APK status bar safe area spacing.

- [x] **Phase 4: 4th Engine Extensibility & Architecture Documentation**
  - [x] Create 4th Map Engine boilerplate template (`MapEngineTemplate.js`).
  - [x] Finalize comprehensive data flow and class architecture documentation (`MAP_DATA_FLOW_CLASS_AND_EXTENSION_ARCHITECTURE.md`).
  - [x] Update 3D architecture blueprint (`ARCHITECTURE_3D.md`) and asset credits (`credit.md`).

---

## 🚀 Next-Gen 3D Visual & Feature Enhancements (Future Sprints)

- [ ] **Phase 5: InstancedMesh Pillars (High-FPS Optimization)**
  - [ ] Convert viaduct support pillars to `THREE.InstancedMesh` for massive networks (Delhi NCR 300+ stations) maintaining 60–120 FPS.
  - [ ] Implement GPU frustum culling on individual pillar instances.

- [ ] **Phase 6: Interactive Overlays & Raycasting**
  - [ ] GPU Raycasting for station hover and click detection in 3D.
  - [ ] Connect clicks to existing `StationCalloutView.js` popup seamlessly.
  - [ ] Render CoC-style floating engraved wooden/metal 3D nameplates above key stations ('RAJIV CHOWK', 'KASHMERE GATE', etc.).

- [ ] **Phase 7: Animated Metro Trains on Real Splines**
  - [ ] Animated low-poly 3D trains traversing real network line splines continuously.
  - [ ] Automatic multi-train dispatching per line.

- [ ] **Phase 8: Mobile Touch & Camera Orbit Refinements**
  - [ ] Touch gestures (1-finger pan, 2-finger pinch-zoom, 2-finger tilt/orbit) customized for 3D transit viewport.
  - [ ] Idle dirty-render gating (0% CPU/GPU usage when camera is static).
