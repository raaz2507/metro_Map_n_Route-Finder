/**
 * Metro3DEngine.js
 * Master orchestrator for the Clash of Clans-inspired 3D Metro Map visualization:
 * 1. Elevated track spans supported directly on sturdy stone pillars (piller.glb).
 * 2. Shared CORRIDOR_HALF_WIDTH variable used across Ground Terrain and Canyon Tunnel.
 * 3. Continuous seamless 3D circuit: Ground Track -> Elevated Span 1 -> Canyon -> Elevated Span 2 -> Ground Track.
 * 4. True CW hole triangulation on Ground Terrain (zero phantom sand flaps).
 * 5. Track rails locked to true 3D spline (Zero sinking, zero broken rails, perfectly closed loop).
 * 6. Colored Metro Line Ribbon following spline across all levels (trench, elevated, ground).
 * 7. Full camera orbit, soft shadows, toggleable elements via Checkbox Control Panel.
 */

import * as THREE from '../../../lib/three/three.module.js';
import { OrbitControls } from '../../../lib/three/addons/controls/OrbitControls.js';
import { APP_CONFIG } from '../../../config/app-config.js';
import { BaseMapEngine } from '../core/BaseMapEngine.js';
import { MapGeometry } from '../core/MapGeometry.js';
import { ThreeGroundTerrain } from './ThreeGroundTerrain.js';
import { ThreePillars } from './ThreePillars.js';
import { ThreeCoCTrack } from './ThreeCoCTrack.js';
import { ThreeCavernTunnel } from './ThreeCavernTunnel.js';
import { ThreeTrainController } from './ThreeTrainController.js';
import { ThreeMetroLineRibbon } from './ThreeMetroLineRibbon.js';
import { ThreeViaductBridge } from './ThreeViaductBridge.js';
import { ThreeStationBuilder, STATION_STYLES } from './ThreeStationBuilder.js';
import { ThreeUndergroundStationBuilder, UG_STATION_STYLES } from './ThreeUndergroundStationBuilder.js';

/**
 * Common shared width constant used across all infrastructure modules
 */
const CORRIDOR_HALF_WIDTH = 1.85;

/**
 * SplineSegment
 * Extracts a continuous sub-slice of a master closed spline with identical points and tangents.
 */
class SplineSegment extends THREE.Curve {
  constructor(masterSpline, startT, endT) {
    super();
    this.masterSpline = masterSpline;
    this.startT = startT;
    this.endT = endT;
  }

  getPoint(t, optionalTarget = new THREE.Vector3()) {
    let u;
    if (this.startT <= this.endT) {
      u = this.startT + t * (this.endT - this.startT);
    } else {
      const span = (1.0 - this.startT) + this.endT;
      u = (this.startT + t * span) % 1.0;
    }
    return this.masterSpline.getPointAt(u, optionalTarget);
  }

  getTangent(t, optionalTarget = new THREE.Vector3()) {
    let u;
    if (this.startT <= this.endT) {
      u = this.startT + t * (this.endT - this.startT);
    } else {
      const span = (1.0 - this.startT) + this.endT;
      u = (this.startT + t * span) % 1.0;
    }
    return this.masterSpline.getTangentAt(u, optionalTarget);
  }
}

export class Metro3DEngine extends BaseMapEngine {
  #container;
  #metroData;
  #scene;
  #camera;
  #renderer;
  #controls;
  #sunLight;
  #hemiLight;

  // Sub-modules
  #terrain;
  #pillars;
  #track;
  #tunnel;
  #train;
  #metroLine;
  #bridges;
  #stations;
  #undergroundStation;
  #canyonCurve = null;
  #undergroundStationT = 0.5;
  #isDraggingStation = false;
  onStationDrag = null;

  // Real Metro Data Cache
  #stationCoordinates3D = new Map();
  #realLines = [];

  // Active Train Spline
  #mainSpline = null;

  #isRunning = false;
  #isSunset = false;
  #lastTime = 0;

  // Real-Time 3D Generation Progress & Error HUD
  #loadingOverlay = null;
  #progressFillEl = null;
  #percentTextEl = null;
  #statusTextEl = null;
  #logConsoleEl = null;
  #currentProgress = 0;

  constructor(containerOrParams, metroData = null, options = {}) {
    let container = containerOrParams;
    let data = metroData;
    let opts = options;

    // Dual compatibility: supports both (container, metroData) and ({ container, metroData, ...options })
    if (containerOrParams && typeof containerOrParams === "object" && !(containerOrParams instanceof HTMLElement)) {
      container = containerOrParams.container;
      data = containerOrParams.metroData ?? metroData;
      opts = containerOrParams;
    }

    super({ container, metroData: data, ...opts });
    this.#container = typeof container === "string" ? document.querySelector(container) : container;
    this.#metroData = data || {};

    // 1. Scene
    this.#scene = new THREE.Scene();
    this.#scene.background = new THREE.Color(0xe8d6b5); // Warm CoC parchment/desert tone
    this.#scene.fog = null; // Fog removed for 100% crisp visibility and higher GPU performance

    // 2. Camera (Isometric view angle framing the multi-line network)
    const aspect = this.#container.clientWidth / this.#container.clientHeight;
    this.#camera = new THREE.PerspectiveCamera(40, aspect, 0.5, 600);
    this.#camera.position.set(56, 52, 48);

    // 3. Renderer with antialiasing and soft shadows
    this.#renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, stencil: true, powerPreference: 'high-performance' });
    this.#renderer.setSize(this.#container.clientWidth, this.#container.clientHeight);
    this.#renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.#renderer.shadowMap.enabled = true;
    this.#renderer.shadowMap.type = THREE.PCFShadowMap;
    this.#renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.#renderer.toneMappingExposure = 1.05;
    if (this.#container.firstChild) {
      this.#container.insertBefore(this.#renderer.domElement, this.#container.firstChild);
    } else {
      this.#container.appendChild(this.#renderer.domElement);
    }

    // 4. Controls
    this.#controls = new OrbitControls(this.#camera, this.#renderer.domElement);
    this.#controls.enableDamping = true;
    this.#controls.dampingFactor = 0.05;
    this.#controls.target.set(0, 1, -2);
    this.#controls.maxPolarAngle = Math.PI / 2 - 0.04;
    this.#controls.minDistance = 10;
    this.#controls.maxDistance = 220;

    // 5. Lighting
    this.#setupLights();

    // 6. Sub-modules
    this.#terrain = new ThreeGroundTerrain(this.#scene);
    this.#pillars = new ThreePillars(this.#scene);
    this.#bridges = new ThreeViaductBridge(this.#scene);
    this.#track = new ThreeCoCTrack(this.#scene);
    this.#tunnel = new ThreeCavernTunnel(this.#scene);
    this.#train = new ThreeTrainController(this.#scene);
    this.#metroLine = new ThreeMetroLineRibbon(this.#scene);
    this.#stations = new ThreeStationBuilder(this.#scene);
    this.#undergroundStation = new ThreeUndergroundStationBuilder(this.#scene);

    this.#setupStationDragging();

    window.addEventListener('resize', this.#onWindowResize);
  }

  #setupLights() {
    this.#hemiLight = new THREE.HemisphereLight(0xdcf0ff, 0xbf9c6e, 1.1);
    this.#hemiLight.position.set(0, 50, 0);
    this.#scene.add(this.#hemiLight);

    this.#sunLight = new THREE.DirectionalLight(0xfff2d9, 2.6);
    this.#sunLight.position.set(45, 60, 35);
    this.#sunLight.castShadow = true;
    this.#sunLight.shadow.mapSize.width = 2048;
    this.#sunLight.shadow.mapSize.height = 2048;
    this.#sunLight.shadow.camera.near = 10;
    this.#sunLight.shadow.camera.far = 160;
    this.#sunLight.shadow.camera.left = -50;
    this.#sunLight.shadow.camera.right = 50;
    this.#sunLight.shadow.camera.top = 50;
    this.#sunLight.shadow.camera.bottom = -50;
    this.#sunLight.shadow.bias = -0.0001;
    this.#sunLight.shadow.normalBias = 0.04;
    this.#sunLight.shadow.radius = 2.8;
    this.#scene.add(this.#sunLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.#scene.add(ambient);
  }

  #updateShadowCameraForSpan(span = 1050.0) {
    if (!this.#sunLight) return;
    const halfSpan = Math.max(120, (span / 2) * 1.15);
    this.#sunLight.position.set(halfSpan * 0.75, halfSpan * 1.1, halfSpan * 0.6);
    this.#sunLight.shadow.camera.near = 10;
    this.#sunLight.shadow.camera.far = halfSpan * 4.0;
    this.#sunLight.shadow.camera.left = -halfSpan;
    this.#sunLight.shadow.camera.right = halfSpan;
    this.#sunLight.shadow.camera.top = halfSpan;
    this.#sunLight.shadow.camera.bottom = -halfSpan;
    this.#sunLight.shadow.mapSize.width = 4096;
    this.#sunLight.shadow.mapSize.height = 4096;
    this.#sunLight.shadow.radius = 2.8;
    this.#sunLight.shadow.bias = -0.0001;
    this.#sunLight.shadow.normalBias = 0.04;
    this.#sunLight.shadow.camera.updateProjectionMatrix();
  }

  #createLoadingHUD() {
    if (this.#loadingOverlay || !this.#container) return;

    const overlay = document.createElement('div');
    overlay.className = 'metro3d-loading-overlay';
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      background: rgba(15, 13, 11, 0.85);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      transition: opacity 0.4s ease;
      pointer-events: all;
    `;

    overlay.innerHTML = `
      <div style="
        width: 90%;
        max-width: 440px;
        background: rgba(26, 23, 20, 0.95);
        border: 1px solid rgba(220, 185, 120, 0.35);
        border-radius: 16px;
        padding: 22px 24px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
        color: #f7ecd7;
      ">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="
              width: 18px;
              height: 18px;
              border: 2px solid rgba(245, 207, 124, 0.3);
              border-top-color: #f5cf7c;
              border-radius: 50%;
              animation: metro3d-spin 0.8s linear infinite;
            "></div>
            <div>
              <div style="font-size: 15px; font-weight: 700; color: #f5cf7c; letter-spacing: 0.3px;">🚇 3D Metro Engine</div>
              <div id="metro3d-status" style="font-size: 11px; color: #c9bea9; margin-top: 2px;">Initializing 3D World...</div>
            </div>
          </div>
          <div id="metro3d-percent" style="font-size: 16px; font-weight: 800; color: #6ee787; font-variant-numeric: tabular-nums;">0%</div>
        </div>

        <!-- Progress Bar -->
        <div style="
          width: 100%;
          height: 8px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 14px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        ">
          <div id="metro3d-bar" style="
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #f39c12, #f1c40f, #2ecc71);
            border-radius: 10px;
            transition: width 0.25s ease;
          "></div>
        </div>

        <!-- Mini Live Log Terminal -->
        <div style="font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: #8c7e6c; margin-bottom: 6px;">Live Generation Logs:</div>
        <div id="metro3d-logs" style="
          width: 100%;
          max-height: 105px;
          overflow-y: auto;
          background: rgba(10, 9, 8, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 8px 10px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          line-height: 1.5;
          color: #a4b0be;
          box-sizing: border-box;
        ">
        </div>
      </div>
      <style>
        @keyframes metro3d-spin { to { transform: rotate(360deg); } }
      </style>
    `;

    this.#container.appendChild(overlay);
    this.#loadingOverlay = overlay;
    this.#progressFillEl = overlay.querySelector('#metro3d-bar');
    this.#percentTextEl = overlay.querySelector('#metro3d-percent');
    this.#statusTextEl = overlay.querySelector('#metro3d-status');
    this.#logConsoleEl = overlay.querySelector('#metro3d-logs');
  }

  #updateProgress(percent, statusMsg, logMsg = null, isError = false) {
    this.#currentProgress = percent;
    if (!this.#loadingOverlay) {
      this.#createLoadingHUD();
    }

    if (this.#progressFillEl) {
      this.#progressFillEl.style.width = `${Math.min(100, Math.max(0, percent))}%`;
      if (isError) {
        this.#progressFillEl.style.background = '#e74c3c';
      }
    }
    if (this.#percentTextEl) {
      this.#percentTextEl.textContent = `${Math.round(percent)}%`;
      if (isError) this.#percentTextEl.style.color = '#e74c3c';
    }
    if (this.#statusTextEl && statusMsg) {
      this.#statusTextEl.textContent = statusMsg;
      if (isError) this.#statusTextEl.style.color = '#ff7675';
    }

    if (this.#logConsoleEl && (logMsg || statusMsg)) {
      const msg = logMsg || statusMsg;
      const entry = document.createElement('div');
      entry.style.marginBottom = '2px';
      if (isError) {
        entry.style.color = '#ff7675';
        entry.style.fontWeight = 'bold';
        entry.textContent = `❌ [ERROR] ${msg}`;
      } else if (percent >= 100) {
        entry.style.color = '#2ecc71';
        entry.textContent = `✔ [${Math.round(percent)}%] ${msg}`;
      } else {
        entry.textContent = `▸ [${Math.round(percent)}%] ${msg}`;
      }
      this.#logConsoleEl.appendChild(entry);
      this.#logConsoleEl.scrollTop = this.#logConsoleEl.scrollHeight;
    }

    // When 100% complete, smoothly fade out after a brief moment
    if (percent >= 100 && !isError) {
      setTimeout(() => {
        if (this.#loadingOverlay) {
          this.#loadingOverlay.style.opacity = '0';
          this.#loadingOverlay.style.pointerEvents = 'none';
          setTimeout(() => {
            this.#loadingOverlay?.remove();
            this.#loadingOverlay = null;
          }, 400);
        }
      }, 450);
    }
  }

  #initRealDataSplines() {
    const rawStationData = this.#metroData?.stationData || this.#metroData?.stations;
    if (!rawStationData) return false;
    const stations = Array.isArray(rawStationData) ? rawStationData : Object.values(rawStationData);
    if (stations.length === 0) return false;

    let hasXY = stations.some(st => st.xy?.x != null && st.xy?.y != null);
    if (!hasXY) {
      const stationMap = Array.isArray(rawStationData)
        ? Object.fromEntries(rawStationData.map(st => [st.id, st]))
        : rawStationData;
      const bounds = MapGeometry.getBounds(stationMap);
      const { avgLatRad } = MapGeometry.calculateSVGSize(bounds);
      MapGeometry.convertLatLonToXY(stationMap, bounds, avgLatRad);
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const st of stations) {
      if (st.xy?.x != null && st.xy?.y != null) {
        if (st.xy.x < minX) minX = st.xy.x;
        if (st.xy.x > maxX) maxX = st.xy.x;
        if (st.xy.y < minY) minY = st.xy.y;
        if (st.xy.y > maxY) maxY = st.xy.y;
      }
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const maxSpan = Math.max(1, Math.max(maxX - minX, maxY - minY));
    const targetSpan = APP_CONFIG?.MAP?.THREE_D?.TARGET_SPAN || 350.0;
    const scale = targetSpan / maxSpan;

    this.#stationCoordinates3D.clear();
    for (const st of stations) {
      if (st.xy?.x == null || st.xy?.y == null) continue;
      const x = (st.xy.x - centerX) * scale;
      const z = (st.xy.y - centerY) * scale;
      const layout = (st.properties?.layout || st.layout || "elevated").toLowerCase();
      let y = 0.35;
      if (layout.includes("underground") || layout.includes("tunnel") || layout.includes("subway") || layout.includes("cut_and_cover") || layout.includes("cut-and-cover") || layout.includes("trench")) {
        y = -3.5;
      } else if (layout.includes("elevated") || layout.includes("viaduct") || layout.includes("aerial") || layout.includes("bridge")) {
        y = 5.2;
      }

      this.#stationCoordinates3D.set(st.id, {
        st,
        pos: new THREE.Vector3(x, y, z),
        x, y, z, layout,
        rotationY: 0
      });
    }

    // Calculate station yaw orientation along line path
    const rawLines = Array.isArray(this.#metroData.lines)
      ? this.#metroData.lines
      : Object.values(this.#metroData.lines || {});

    for (const line of rawLines) {
      const stIds = line.stations || line.stationIds || [];
      for (let i = 0; i < stIds.length; i++) {
        const stId = stIds[i];
        const coord = this.#stationCoordinates3D.get(stId);
        if (!coord || coord.rotationYSet) continue;

        let dir = new THREE.Vector3(1, 0, 0);
        if (i > 0 && i < stIds.length - 1) {
          const pPrev = this.#stationCoordinates3D.get(stIds[i - 1])?.pos;
          const pNext = this.#stationCoordinates3D.get(stIds[i + 1])?.pos;
          if (pPrev && pNext) dir = pNext.clone().sub(pPrev);
        } else if (i === 0 && stIds.length > 1) {
          const pNext = this.#stationCoordinates3D.get(stIds[1])?.pos;
          if (pNext) dir = pNext.clone().sub(coord.pos);
        } else if (i === stIds.length - 1 && stIds.length > 1) {
          const pPrev = this.#stationCoordinates3D.get(stIds[i - 1])?.pos;
          if (pPrev) dir = coord.pos.clone().sub(pPrev);
        }
        dir.y = 0;
        if (dir.lengthSq() > 0.0001) {
          coord.rotationY = Math.atan2(dir.x, dir.z);
          coord.rotationYSet = true;
        }
      }
    }

    return true;
  }

  #findSplineIntervals(spline, conditionFn, samples = 180) {
    const intervals = [];
    let inInterval = false;
    let startU = 0;

    for (let i = 0; i <= samples; i++) {
      const u = i / samples;
      const pt = spline.getPointAt(u);
      const match = conditionFn(pt);

      if (match && !inInterval) {
        inInterval = true;
        startU = u;
      } else if (!match && inInterval) {
        inInterval = false;
        if (u - startU >= 0.015) {
          intervals.push({ startU, endU: u });
        }
      }
    }
    if (inInterval && 1.0 - startU >= 0.015) {
      intervals.push({ startU, endU: 1.0 });
    }
    return intervals;
  }

  #buildLinesFromRealData() {
    const rawLines = Array.isArray(this.#metroData.lines)
      ? this.#metroData.lines
      : Object.values(this.#metroData.lines || {});

    const metroLines = [];
    const pillarPoints = [];

    for (const line of rawLines) {
      const stIds = line.stations || line.stationIds || [];
      const rawPoints = [];
      for (const stId of stIds) {
        const coord = this.#stationCoordinates3D.get(stId);
        if (coord?.pos) {
          rawPoints.push(coord.pos.clone());
        }
      }

      if (rawPoints.length >= 2) {
        // Build smooth transition points between elevated and underground stations
        // so tracks incline smoothly at a gentle 15-20 deg angle into the ground
        const points = [];
        for (let i = 0; i < rawPoints.length; i++) {
          points.push(rawPoints[i]);
          if (i < rawPoints.length - 1) {
            const p1 = rawPoints[i];
            const p2 = rawPoints[i + 1];
            // If transitioning between elevated (> 1.0) and underground (< -0.5)
            if ((p1.y > 1.0 && p2.y < -0.5) || (p1.y < -0.5 && p2.y > 1.0)) {
              // Insert 2 intermediate ramp points to ensure gentle slope
              const mid1 = new THREE.Vector3(
                p1.x * 0.67 + p2.x * 0.33,
                p1.y > 1.0 ? 0.8 : -0.6,
                p1.z * 0.67 + p2.z * 0.33
              );
              const mid2 = new THREE.Vector3(
                p1.x * 0.33 + p2.x * 0.67,
                p1.y > 1.0 ? -0.6 : 0.8,
                p1.z * 0.33 + p2.z * 0.67
              );
              points.push(mid1, mid2);
            }
          }
        }

        // 2-pass moving average smoothing on Y coordinates for gentle grade transitions
        const smoothedY = points.map(p => p.y);
        for (let pass = 0; pass < 2; pass++) {
          for (let i = 1; i < smoothedY.length - 1; i++) {
            smoothedY[i] = 0.25 * smoothedY[i - 1] + 0.5 * smoothedY[i] + 0.25 * smoothedY[i + 1];
          }
        }
        for (let i = 0; i < points.length; i++) {
          points[i].y = smoothedY[i];
        }

        const isLoop = points.length > 3 && points[0].distanceTo(points[points.length - 1]) < 2.0;
        const spline = new THREE.CatmullRomCurve3(points, isLoop, 'centripetal', 0.5);
        spline.closed = isLoop;

        // Distribute pillars at clean, realistic 16m intervals along the entire elevated track
        const totalSplineLen = spline.getLength();
        const pillarSpacing = 16.0;
        const numPillarSamples = Math.max(1, Math.floor(totalSplineLen / pillarSpacing));
        for (let i = 0; i <= numPillarSamples; i++) {
          const u = i / numPillarSamples;
          const pt = spline.getPointAt(u);
          if (pt.y > 1.5) {
            const pos = new THREE.Vector3(pt.x, 0, pt.z);
            if (!pillarPoints.some(p => p.distanceTo(pos) < 10.0)) {
              pillarPoints.push(pos);
            }
          }
        }

        let color = 0xd63031;
        if (typeof line.color === "number") color = line.color;
        else if (typeof line.color === "string") {
          const parsed = parseInt(line.color.replace("#", "0x"), 16);
          if (!Number.isNaN(parsed)) color = parsed;
        }

        metroLines.push({
          id: line.id || 'line',
          name: line.name || line.label || 'Metro Line',
          color,
          spline
        });
      }
    }

    return { metroLines, pillarPoints };
  }

  async init() {
    this.#createLoadingHUD();
    try {
      this.#updateProgress(6, "Parsing Transit Network...", "Connecting to single source of truth data store...");
      const hasRealData = this.#initRealDataSplines();
      if (hasRealData) {
        this.#updateProgress(18, "Generating 3D Splines...", "Building 3D coordinates & gentle gradient transition ramps...");
        const { metroLines, pillarPoints } = this.#buildLinesFromRealData();
        if (metroLines.length > 0) {
          this.#realLines = metroLines;
          this.#mainSpline = metroLines[0].spline;

          this.#updateProgress(30, "Pre-loading 3D Assets...", "Loading railway track & civil models...");
          await this.#track.loadModel('./assets/3d_models/track-single.glb').catch((err) => {
            this.#updateProgress(35, "Asset Notice", `Using procedural track fallback: ${err.message || 'GLB not found'}`);
          });

          this.#updateProgress(42, "Constructing Metro Lines...", `Extruding colored ribbons & tracks for ${metroLines.length} lines...`);
          const allCanyonCurves = [];
          const ribbonWidth = APP_CONFIG?.MAP?.THREE_D?.RIBBON_WIDTH ?? 0.9;

          for (let lIdx = 0; lIdx < metroLines.length; lIdx++) {
            const line = metroLines[lIdx];
            // A. Build authentic tracks & ribbons along each real line
            this.#metroLine.buildRibbon(line.spline, {
              width: ribbonWidth,
              color: line.color,
              steps: Math.max(80, line.spline.points.length * 16)
            });

            await this.#track.loadAndBuildTrack(line.spline, {
              spacing: 0.98,
              yOffset: 0.05
            }).catch(console.warn);

            // C. Extract underground intervals (Y <= -0.5) -> Canyon Trenches
            const ugIntervals = this.#findSplineIntervals(line.spline, pt => pt.y <= -0.5);
            for (const seg of ugIntervals) {
              const curve = new SplineSegment(line.spline, seg.startU, seg.endU);
              allCanyonCurves.push(curve);
            }
          }

          this.#updateProgress(62, "Excavating Subterranean World...", "Building sandy ground terrain & canyon retaining walls...");
          const canyonConfigs = allCanyonCurves.map(curve => ({
            curve,
            halfWidth: 1.5,
            steps: 32,
            hasStation: false,
            generateRocks: true
          }));
          this.#terrain.initCurvedCorridors(canyonConfigs);

          for (const curve of allCanyonCurves) {
            this.#tunnel.buildCurvedCanyonTrench(curve, {
              halfWidth: 1.5,
              steps: 32,
              wallColor: 0x6e6355,
              hasStation: false,
              otherCurves: allCanyonCurves.filter(c => c !== curve)
            });
          }

          this.#updateProgress(74, "Erecting Pillars...", `Placing ${pillarPoints.length} elevated stone pillars...`);
          if (pillarPoints.length > 0) {
            await this.#pillars.loadPillars(pillarPoints, { targetHeight: 5.2 }).catch(console.warn);
          }

          this.#updateProgress(85, "Constructing 3D Stations...", `Building authentic elevated & underground station architectures...`);
          const elevatedStationsList = [];
          const undergroundStationsList = [];

          for (const [stId, coord] of this.#stationCoordinates3D.entries()) {
            const item = {
              id: stId,
              name: coord.st?.name || stId,
              pos: coord.pos,
              rotationY: coord.rotationY || 0,
              layout: coord.layout,
              status: coord.st?.properties?.status || "operational"
            };

            if (coord.layout.includes("underground")) {
              undergroundStationsList.push(item);
            } else {
              elevatedStationsList.push(item);
            }
          }

          // Build all elevated stations
          if (elevatedStationsList.length > 0) {
            this.#stations.buildAllStations(elevatedStationsList, STATION_STYLES.MODERN_ARCH);
          }

          // Build all underground stations with glass atrium shades
          if (undergroundStationsList.length > 0) {
            this.#undergroundStation.buildAllStations(undergroundStationsList, UG_STATION_STYLES.MODERN_DMRC_OPENCUT);
          }

          this.#updateProgress(94, "Placing Rolling Stock...", "Initializing metro train & controls...");
          this.#train.setSpline(this.#mainSpline);
          await this.#train.loadModel('./assets/3d_models/train.glb', 1.15).catch(console.warn);

          const targetSpan = APP_CONFIG?.MAP?.THREE_D?.TARGET_SPAN || 350.0;
          this.#updateShadowCameraForSpan(targetSpan);
          const camDist = targetSpan * 0.55;
          this.#camera.position.set(camDist * 1.1, camDist, camDist * 0.9);
          this.#controls.target.set(0, 0, 0);
          this.#controls.maxDistance = Math.max(800, targetSpan * 3.0);
          this.#camera.far = Math.max(1500, targetSpan * 5.0);
          this.#camera.updateProjectionMatrix();
          this.#controls.update();

          this.#isRunning = true;
          this.#animate();

          this.#updateProgress(100, "Ready!", `3D Network ready: ${metroLines.length} lines, ${this.#stationCoordinates3D.size} stations loaded.`);
          return true;
        }
      }

      // Fallback: When no lines found in data
      console.warn("[Metro3DEngine] No metro network lines found to render.");
      this.#updateProgress(100, "Ready", "No metro lines available in current network data.");
      this.#isRunning = true;
      this.#animate();
      return true;
    } catch (err) {
      console.error("[Metro3DEngine] Initialization failed:", err);
      this.#updateProgress(this.#currentProgress || 50, "Initialization Failed", `${err.message || err}`, true);
      throw err;
    }
  }

  // --- Element Toggle API for Checkbox Control Panel ---

  setMapDisplaySettings(settings = {}) {
    if (typeof settings.showUnderConstruction === "boolean") {
      this.#stations?.toggleVisibilityByStatus?.("under_construction", settings.showUnderConstruction);
      this.#undergroundStation?.toggleVisibilityByStatus?.("under_construction", settings.showUnderConstruction);
    }
  }

  toggleGround(visible) {
    return this.#terrain.toggleGround(visible);
  }

  toggleSubterraneanView(enable) {
    return this.#terrain.setSubterraneanXRay(enable);
  }

  togglePillars(visible) {
    return this.#pillars.togglePillars(visible);
  }

  toggleBridges(visible) {
    this.#bridges?.toggleDecks?.(visible);
    return this.#metroLine.toggleVisibility(visible);
  }

  toggleCanyon(visible) {
    return this.#tunnel.toggleCanyon(visible);
  }

  toggleRocks(visible) {
    return this.#terrain.toggleRocks(visible);
  }

  toggleTracks(visible) {
    return this.#track.toggleTrack(visible);
  }

  toggleTrainVisibility(visible) {
    return this.#train.toggleVisibility(visible);
  }

  toggleTrainMotion(moving) {
    return this.#train.toggleMotion(moving);
  }

  toggleMetroLine(visible) {
    return this.#metroLine.toggleVisibility(visible);
  }

  toggleStation(visible) {
    return this.#stations.toggleVisibility(visible);
  }

  setStationStyle(styleIndex) {
    return this.#stations.buildStation(styleIndex);
  }

  focusStation() {
    for (const [stId, coord] of this.#stationCoordinates3D.entries()) {
      if (!coord.layout?.includes("underground")) {
        this.#camera.position.set(coord.x + 10, coord.y + 6, coord.z + 10);
        this.#controls.target.set(coord.x, coord.y, coord.z);
        this.#controls.update();
        return;
      }
    }
    this.#camera.position.set(24, 9, 8);
    this.#controls.target.set(14, 6.5, -1);
    this.#controls.update();
  }

  toggleUndergroundStation(visible) {
    return this.#undergroundStation.toggleVisibility(visible);
  }

  toggleUndergroundGlassCanopy(visible) {
    return this.#undergroundStation.toggleGlassCanopy(visible);
  }

  setUndergroundStationStyle(styleIndex) {
    return this.#undergroundStation.buildStation(styleIndex);
  }

  getUndergroundStationT() {
    return this.#undergroundStationT;
  }

  setUndergroundStationT(t) {
    t = THREE.MathUtils.clamp(parseFloat(t), 0.22, 0.78);
    this.#undergroundStationT = t;

    // 1. Move station along canyon curve
    if (this.#canyonCurve) {
      this.#undergroundStation.setCurveTransform(this.#canyonCurve, t);
    }

    // 2. Dynamically move the terrain cutout hole and rim rocks
    this.#terrain.updateStationZone(t);

    // 3. Dynamically move the canyon retaining walls and floor
    this.#tunnel.updateStationZone(t);

    return t;
  }

  focusUndergroundStation() {
    for (const [stId, coord] of this.#stationCoordinates3D.entries()) {
      if (coord.layout?.includes("underground")) {
        this.#camera.position.set(coord.x + 8, coord.y + 6, coord.z + 8);
        this.#controls.target.set(coord.x, coord.y, coord.z);
        this.#controls.update();
        return;
      }
    }
    if (this.#canyonCurve) {
      const p = this.#canyonCurve.getPointAt(this.#undergroundStationT);
      this.#camera.position.set(p.x, 5, p.z + 16);
      this.#controls.target.set(p.x, -2.5, p.z);
      this.#controls.update();
    } else {
      this.#camera.position.set(0, 5, -13);
      this.#controls.target.set(0, -2.5, -29);
      this.#controls.update();
    }
  }

  #setupStationDragging() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 3.5); // Plane at Y = -3.5
    const hitPoint = new THREE.Vector3();

    const onPointerDown = (e) => {
      if (e.button !== 0 || !this.#canyonCurve) return;

      const rect = this.#renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.#camera);

      if (raycaster.ray.intersectPlane(plane, hitPoint)) {
        const currentPt = this.#canyonCurve.getPointAt(this.#undergroundStationT);
        // If clicked within 8 meters of station
        if (currentPt.distanceTo(hitPoint) < 8.0) {
          this.#isDraggingStation = true;
          this.#controls.enabled = false;
          this.#container.style.cursor = 'grabbing';
          window.addEventListener('pointermove', onPointerMove);
          window.addEventListener('pointerup', onPointerUp);
        }
      }
    };

    const onPointerMove = (e) => {
      if (!this.#isDraggingStation || !this.#canyonCurve) return;

      const rect = this.#renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, this.#camera);

      if (raycaster.ray.intersectPlane(plane, hitPoint)) {
        let bestT = this.#undergroundStationT;
        let minDist = Infinity;
        const samples = 60;
        for (let i = 0; i <= samples; i++) {
          const testT = 0.22 + (i / samples) * (0.78 - 0.22);
          const p = this.#canyonCurve.getPointAt(testT);
          const d = p.distanceTo(hitPoint);
          if (d < minDist) {
            minDist = d;
            bestT = testT;
          }
        }
        this.setUndergroundStationT(bestT);
        if (typeof this.onStationDrag === 'function') {
          this.onStationDrag(bestT);
        }
      }
    };

    const onPointerUp = () => {
      if (this.#isDraggingStation) {
        this.#isDraggingStation = false;
        this.#controls.enabled = true;
        this.#container.style.cursor = 'default';
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      }
    };

    this.#renderer.domElement.addEventListener('pointerdown', onPointerDown);
  }

  setMetroLineColor(hexColor) {
    this.#metroLine.setColor(hexColor);
  }

  toggleLighting() {
    this.#isSunset = !this.#isSunset;
    if (this.#isSunset) {
      this.#scene.background.set(0x7c4e36);
      if (this.#scene.fog) this.#scene.fog.color.set(0x7c4e36);
      this.#sunLight.color.set(0xff8c42);
      this.#sunLight.intensity = 2.0;
      this.#hemiLight.color.set(0xff9e73);
      this.#hemiLight.groundColor.set(0x402b1f);
    } else {
      this.#scene.background.set(0xe8d6b5);
      if (this.#scene.fog) this.#scene.fog.color.set(0xe8d6b5);
      this.#sunLight.color.set(0xfff2d9);
      this.#sunLight.intensity = 2.6;
      this.#hemiLight.color.set(0xdcf0ff);
      this.#hemiLight.groundColor.set(0xbf9c6e);
    }
    return this.#isSunset;
  }

  getMainSpline() {
    return this.#mainSpline;
  }

  resetCamera() {
    this.#camera.position.set(56, 52, 48);
    this.#controls.target.set(0, 1, -2);
    this.#controls.update();
  }

  #animate = (timestamp = 0) => {
    if (!this.#isRunning) return;
    requestAnimationFrame(this.#animate);

    const delta = (timestamp - this.#lastTime) / 1000;
    this.#lastTime = timestamp;

    this.#controls.update();
    this.#train.update(delta);
    this.#renderer.render(this.#scene, this.#camera);
  };

  #onWindowResize = () => {
    if (!this.#container) return;
    const width = this.#container.clientWidth;
    const height = this.#container.clientHeight;
    this.#camera.aspect = width / height;
    this.#camera.updateProjectionMatrix();
    this.#renderer.setSize(width, height);
  };

  destroy() {
    this.#isRunning = false;
    window.removeEventListener('resize', this.#onWindowResize);
    this.#controls?.dispose();
    this.#track?.destroy?.();
    this.#renderer?.dispose();
    if (this.#loadingOverlay && this.#loadingOverlay.parentNode) {
      this.#loadingOverlay.parentNode.removeChild(this.#loadingOverlay);
      this.#loadingOverlay = null;
    }
    if (this.#renderer?.domElement && this.#container?.contains(this.#renderer.domElement)) {
      this.#container.removeChild(this.#renderer.domElement);
    }
  }
}
