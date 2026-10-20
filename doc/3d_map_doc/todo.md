# 📋 3D Metro Map Engine - Master TODO & Implementation Roadmap

> **Location:** `doc/3d_map_doc/todo.md`  
> **Status:** Planning & Asset Selection Phase  
> **Goal:** High-performance, CoC-inspired Isometric Pure 3D Metro Visualization alongside existing 2D and 2.5D engines.

---

## 🎯 High-Level Milestones

- [ ] **Phase 1: Architecture & Three.js Modular Setup**
  - [ ] Add Three.js dependency (via ES module CDN / local bundle without breaking existing builds).
  - [ ] Create `main_project/js/components/map/three/` directory structure.
  - [ ] Implement `ThreeRenderer.js` implementing the common Map Renderer interface.
  - [ ] Extend `MetroMap.js` facade to support toggling between `2D`, `2.5D`, and `3D Game View`.

- [ ] **Phase 2: Base Terrain & Procedural Cut-Away Environment (1.1 & 1.2)**
  - [ ] Build procedural Warm Sandy/Isometric ground plane at $Z = 0$.
  - [ ] Implement dynamic underground cut-out trench generator for subterranean stations (e.g., Aerocity).
  - [ ] Add rock edge borders and subterranean tunnel portals to cut-out areas.

- [ ] **Phase 3: Procedural 3D Track & Incline Ramp Engine**
  - [ ] Generate 3D tube/rail geometry dynamically from station Lat/Lon coordinates using `CatmullRomCurve3`.
  - [ ] Implement multi-level track transitions (Underground $\rightarrow$ Surface $\rightarrow$ Elevated Flyover viaducts).
  - [ ] Apply line native colors (Yellow, Blue, Red, Orange, etc.) with subtle metallic/toon rail material.
  - [ ] Generate animated active route glow/pulse effect when route is highlighted.

- [ ] **Phase 4: 3D Asset Pipeline & Instancing**
  - [ ] Finalize chosen CC0 3D model pack (Pillars, Trains, Station Canopies).
  - [ ] Set up `ThreeAssetLoader.js` for loading `.glb` models efficiently.
  - [ ] Implement `InstancedMesh` for viaduct support pillars (60-120 FPS performance).
  - [ ] Add stylized low-poly metro trains animated along route splines.

- [ ] **Phase 5: Camera Orbit, Lighting & CoC Toon Shader Atmosphere**
  - [ ] Configure isometric perspective camera with smooth pan, zoom, and 360° orbit rotation.
  - [ ] Set up warm directional sunlight ($135^\circ$ angle) with crisp soft contact shadows.
  - [ ] Implement ambient hemisphere lighting for vibrant, rich CoC game aesthetics.

- [ ] **Phase 6: Interactive Overlays & Raycasting**
  - [ ] Implement GPU Raycasting for station hover and click detection.
  - [ ] Connect clicks to existing `StationCalloutView.js` popup seamlessly.
  - [ ] Render CoC-style floating engraved wooden/metal nameplates above key stations ('DWARKA', 'NEW DELHI', etc.).

- [ ] **Phase 7: Mobile Touch & Performance Optimization**
  - [ ] Touch gestures (1-finger pan, 2-finger pinch-zoom, 2-finger tilt/orbit).
  - [ ] Idle dirty-render gating (0% CPU/GPU usage when camera is static).
  - [ ] Memory lifecycle: Clean `destroy()` and WebGL context disposal when switching views.
