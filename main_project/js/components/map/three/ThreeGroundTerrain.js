/**
 * ThreeGroundTerrain.js
 * Encapsulates the procedural Sandy/Earthen Ground Base with:
 * 1. A Curved Canyon Trench Hole that strictly FOLLOWS THE TRACK CURVE.
 * 2. Dynamic Station Bay Excavation: Moves dynamically wherever the station is located/dragged.
 * 3. True Clockwise (CW) winding order for 100% clean Earcut hole triangulation (Zero phantom sand flaps).
 * 4. Tightly packed, smaller, organic low-poly stone boulders giving an authentic
 *    rugged, jagged, uneven (उबड़-खाबड़) rocky canyon rim.
 * 5. Toggleable rock boulders.
 */

import * as THREE from '../../../lib/three/three.module.js';

export class ThreeGroundTerrain {
  #scene;
  #groundMesh = null;
  #maskMesh = null;
  #instancedRocks = null;
  #canyonConfigs = [];

  constructor(scene) {
    this.#scene = scene;
  }

  /**
   * Cuts a curved trench corridor in the ground following the underground track curve.
   */
  initCurvedCorridor(corridorCurve, { halfWidth = 1.85, steps = 64, stationT = 0.5, hasStation = true } = {}) {
    return this.initCurvedCorridors([{
      curve: corridorCurve,
      halfWidth,
      steps,
      stationT,
      hasStation
    }]);
  }

  /**
   * Cuts multiple trench corridors in the ground for intersecting/overlapping metro lines.
   */
  initCurvedCorridors(canyonConfigs = []) {
    this.#canyonConfigs = canyonConfigs.map(cfg => ({
      curve: cfg.curve,
      halfWidth: cfg.halfWidth || 1.85,
      steps: cfg.steps || 64,
      stationT: cfg.stationT !== undefined ? cfg.stationT : 0.5,
      hasStation: cfg.hasStation !== undefined ? cfg.hasStation : (cfg.stationT !== null && cfg.stationT !== undefined),
      generateRocks: cfg.generateRocks !== undefined ? cfg.generateRocks : true,
      groundRadius: cfg.groundRadius || 2500
    }));

    this.#buildTerrain();
    return this;
  }

  setSubterraneanXRay(enable) {
    if (this.#groundMesh && this.#groundMesh.material) {
      if (enable) {
        this.#groundMesh.material.transparent = true;
        this.#groundMesh.material.opacity = 0.38;
        this.#groundMesh.material.depthWrite = false;
      } else {
        this.#groundMesh.material.transparent = false;
        this.#groundMesh.material.opacity = 1.0;
        this.#groundMesh.material.depthWrite = true;
      }
      this.#groundMesh.material.needsUpdate = true;
    }
  }

  setThemeColor(color) {
    if (this.#groundMesh && this.#groundMesh.material && color) {
      this.#groundMesh.material.color.set(color);
      this.#groundMesh.material.needsUpdate = true;
    }
  }

  /**
   * Dynamically moves the excavated station trench bay to match the station position (t).
   * Called in real-time when the station is dragged with the mouse!
   */
  updateStationZone(stationT) {
    const stationConfig = this.#canyonConfigs.find(c => c.hasStation);
    if (stationConfig) {
      stationConfig.stationT = stationT;
      this.#updateTerrainHoleAndRocks();
    }
  }

  #computeCanyonHole(config) {
    const { curve, halfWidth, steps, stationT, hasStation } = config;
    const up = new THREE.Vector3(0, 1, 0);
    const leftPts3D = [];
    const rightPts3D = [];
    const rimPoints3D = [];

    const canyonLength = curve.getLength();
    const P0 = hasStation ? curve.getPointAt(stationT) : null;
    const T0 = hasStation ? curve.getTangentAt(stationT).normalize() : null;
    const R0 = hasStation ? new THREE.Vector3().crossVectors(T0, up).normalize() : null;

    const stationHalfLen = 8.5; // True rectangular station length = 17m (±8.5m)
    const cornerW = 0.8; // Sharp 90-degree corner transition width
    const chamberDepth = 4.85; // Rectangular chamber width from track center

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t).normalize();
      const right = new THREE.Vector3().crossVectors(tan, up).normalize();

      const mouthTaper = Math.min(t / 0.08, (1.0 - t) / 0.08, 1.0);

      // Stone block noise for right wall
      const rBlockIdx = Math.floor(i / 2);
      const rHash = Math.sin(rBlockIdx * 43.123 + 91.87) * 31415.92;
      const rStoneFacet = ((rHash - Math.floor(rHash)) - 0.5) * 0.55 * mouthTaper;
      const rWidth = halfWidth + rStoneFacet;

      // Stone block noise for left wall
      const lBlockIdx = Math.floor(i / 2);
      const lHash = Math.sin(lBlockIdx * 78.233 + 12.98) * 43758.54;
      const lStoneFacet = ((lHash - Math.floor(lHash)) - 0.5) * 0.55 * mouthTaper;

      let pL;
      if (hasStation) {
        const u = (t - stationT) * canyonLength;
        if (Math.abs(u) <= stationHalfLen) {
          pL = P0.clone()
            .addScaledVector(T0, u)
            .addScaledVector(R0, -(chamberDepth + lStoneFacet));
        } else if (Math.abs(u) <= stationHalfLen + cornerW) {
          const ratio = (Math.abs(u) - stationHalfLen) / cornerW;
          const cornerDepth = chamberDepth - (chamberDepth - halfWidth) * ratio;
          const cornerSign = u > 0 ? 1 : -1;
          pL = P0.clone()
            .addScaledVector(T0, cornerSign * stationHalfLen)
            .addScaledVector(R0, -(cornerDepth + lStoneFacet));
        } else {
          pL = pt.clone().addScaledVector(right, -(halfWidth + lStoneFacet));
        }
      } else {
        pL = pt.clone().addScaledVector(right, -(halfWidth + lStoneFacet));
      }

      const pR = pt.clone().addScaledVector(right, rWidth);
      leftPts3D.push(pL);
      rightPts3D.push(pR);
    }

    // Rocks along canyon rim (only outside intersections)
    if (config.generateRocks) {
      const otherConfigs = this.#canyonConfigs.filter(c => c !== config);
      const otherSamples = otherConfigs.map(c => c.curve.getPoints(Math.max(16, Math.floor(c.curve.getLength() * 2.5))));
      const isInsideOther = (x, z, thresh = halfWidth * 1.05) => {
        const sq = thresh * thresh;
        for (const pts of otherSamples) {
          for (const p of pts) {
            const dx = x - p.x;
            const dz = z - p.z;
            if (dx * dx + dz * dz < sq) return true;
          }
        }
        return false;
      };

      const rockSteps = Math.min(80, Math.max(16, Math.floor(canyonLength * 2.0)));
      for (let j = 2; j < rockSteps - 2; j++) {
        const t = j / rockSteps;
        const pt = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tan, up).normalize();

        const mouthTaper = Math.min(t / 0.08, (1.0 - t) / 0.08, 1.0);
        const rBlockIdx = Math.floor(j / 2);
        const rHash = Math.sin(rBlockIdx * 43.123 + 91.87) * 31415.92;
        const rStoneFacet = ((rHash - Math.floor(rHash)) - 0.5) * 0.55 * mouthTaper;
        const rWidth = halfWidth + rStoneFacet;

        const lBlockIdx = Math.floor(j / 2);
        const lHash = Math.sin(lBlockIdx * 78.233 + 12.98) * 43758.54;
        const lStoneFacet = ((lHash - Math.floor(lHash)) - 0.5) * 0.55 * mouthTaper;

        let pL;
        if (hasStation) {
          const u = (t - stationT) * canyonLength;
          if (Math.abs(u) <= stationHalfLen) {
            pL = P0.clone()
              .addScaledVector(T0, u)
              .addScaledVector(R0, -(chamberDepth + lStoneFacet));
          } else if (Math.abs(u) <= stationHalfLen + cornerW) {
            const ratio = (Math.abs(u) - stationHalfLen) / cornerW;
            const cornerDepth = chamberDepth - (chamberDepth - halfWidth) * ratio;
            const cornerSign = u > 0 ? 1 : -1;
            pL = P0.clone()
              .addScaledVector(T0, cornerSign * stationHalfLen)
              .addScaledVector(R0, -(cornerDepth + lStoneFacet));
          } else {
            pL = pt.clone().addScaledVector(right, -(halfWidth + lStoneFacet));
          }
        } else {
          pL = pt.clone().addScaledVector(right, -(halfWidth + lStoneFacet));
        }

        const noiseR = Math.sin(j * 1.3) * 0.18;
        const noiseL = Math.cos(j * 1.7) * 0.18;

        const pR_rock = pt.clone().addScaledVector(right, rWidth + 0.12 + noiseR);
        const pL_rock = pL.clone().addScaledVector(hasStation ? R0 : right, -(0.12 + noiseL));

        if (!isInsideOther(pR_rock.x, pR_rock.z)) {
          rimPoints3D.push(new THREE.Vector3(pR_rock.x, 0, pR_rock.z));
        }
        if (!isInsideOther(pL_rock.x, pL_rock.z)) {
          rimPoints3D.push(new THREE.Vector3(pL_rock.x, 0, pL_rock.z));
        }
      }
    }

    return { leftPts3D, rightPts3D, rimPoints3D };
  }

  #computeAllMaskQuadsAndRimPoints() {
    const maskPositions = [];
    const maskIndices = [];
    const allRimPoints3D = [];
    let vertOffset = 0;

    for (const config of this.#canyonConfigs) {
      const { leftPts3D, rightPts3D, rimPoints3D } = this.#computeCanyonHole(config);
      allRimPoints3D.push(...rimPoints3D);

      const numPts = leftPts3D.length;
      for (let i = 0; i < numPts; i++) {
        const pL = leftPts3D[i];
        const pR = rightPts3D[i];
        maskPositions.push(pL.x, 0.01, pL.z);
        maskPositions.push(pR.x, 0.01, pR.z);

        if (i < numPts - 1) {
          const b = vertOffset + i * 2;
          maskIndices.push(b, b + 1, b + 2);
          maskIndices.push(b + 1, b + 3, b + 2);
        }
      }
      vertOffset += numPts * 2;
    }

    return { maskPositions, maskIndices, rimPoints3D: allRimPoints3D };
  }

  #buildTerrain() {
    if (this.#maskMesh) {
      this.#scene.remove(this.#maskMesh);
      this.#maskMesh.geometry?.dispose();
      this.#maskMesh = null;
    }
    if (this.#groundMesh) {
      this.#scene.remove(this.#groundMesh);
      this.#groundMesh.geometry?.dispose();
      this.#groundMesh = null;
    }

    const { maskPositions, maskIndices, rimPoints3D } = this.#computeAllMaskQuadsAndRimPoints();

    // 1. GPU Stencil Mask: Stamps canyon footprint into Stencil Buffer at renderOrder = 0
    if (maskPositions.length > 0) {
      const maskGeo = new THREE.BufferGeometry();
      maskGeo.setAttribute('position', new THREE.Float32BufferAttribute(maskPositions, 3));
      maskGeo.setIndex(maskIndices);
      maskGeo.computeVertexNormals();

      const maskMat = new THREE.MeshBasicMaterial({
        colorWrite: false,
        depthWrite: false,
        stencilWrite: true,
        stencilRef: 1,
        stencilFunc: THREE.AlwaysStencilFunc,
        stencilZPass: THREE.ReplaceStencilOp
      });

      this.#maskMesh = new THREE.Mesh(maskGeo, maskMat);
      this.#maskMesh.renderOrder = 0;
      this.#scene.add(this.#maskMesh);
    }

    // 2. Solid Sand Ground Plane: Discards canyon mask pixels via Stencil test at renderOrder = 1
    const R = Math.max(600, this.#canyonConfigs[0]?.groundRadius || 2500);
    const groundGeo = new THREE.PlaneGeometry(R * 2, R * 2);
    groundGeo.rotateX(-Math.PI / 2); // Lay flat on XZ plane at Y = 0

    let groundColor = 0xe2e8f0;
    if (typeof window !== "undefined" && document.body) {
      const cssColor = getComputedStyle(document.body).getPropertyValue("--map-3d-ground").trim();
      if (cssColor) groundColor = new THREE.Color(cssColor);
    }

    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.90,
      metalness: 0.05,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.NotEqualStencilFunc, // Draw everywhere EXCEPT inside canyon!
      polygonOffset: true,
      polygonOffsetFactor: 1.0,
      polygonOffsetUnits: 4.0
    });

    this.#groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.#groundMesh.renderOrder = 1;
    this.#groundMesh.receiveShadow = true;
    this.#scene.add(this.#groundMesh);

    // Build densely clustered, smaller, rugged rocks along the canyon rims
    this.#buildDenseRuggedRockRim(rimPoints3D);
  }

  #updateTerrainHoleAndRocks() {
    if (!this.#groundMesh || this.#canyonConfigs.length === 0) return;

    const { maskPositions, maskIndices, rimPoints3D } = this.#computeAllMaskQuadsAndRimPoints();

    if (this.#maskMesh && maskPositions.length > 0) {
      const newMaskGeo = new THREE.BufferGeometry();
      newMaskGeo.setAttribute('position', new THREE.Float32BufferAttribute(maskPositions, 3));
      newMaskGeo.setIndex(maskIndices);
      newMaskGeo.computeVertexNormals();
      this.#maskMesh.geometry.dispose();
      this.#maskMesh.geometry = newMaskGeo;
    }

    // Update rocks in-place if count matches
    if (this.#instancedRocks && rimPoints3D.length === this.#instancedRocks.count) {
      const dummy = new THREE.Object3D();
      rimPoints3D.forEach((pt, i) => {
        const jitterX = ((i % 3) - 1) * 0.08;
        const jitterZ = (((i + 1) % 3) - 1) * 0.08;
        dummy.position.set(pt.x + jitterX, 0.10, pt.z + jitterZ);

        const s = 0.75 + ((i % 5) * 0.12);
        dummy.scale.set(s * 1.15, s * 0.85, s * 1.1);

        dummy.rotation.set((i * 1.7) % Math.PI, (i * 2.3) % Math.PI, (i * 0.9) % Math.PI);
        dummy.updateMatrix();

        this.#instancedRocks.setMatrixAt(i, dummy.matrix);
      });
      this.#instancedRocks.instanceMatrix.needsUpdate = true;
    }
  }

  /**
   * Places tightly packed, smaller, rugged low-poly rocks along the curved canyon edge.
   */
  #buildDenseRuggedRockRim(rimPoints) {
    if (!rimPoints || rimPoints.length === 0) return;

    const rockGeo = new THREE.DodecahedronGeometry(0.22, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6e5e4d,
      roughness: 0.95,
      metalness: 0.05
    });

    const count = rimPoints.length;
    const instancedRocks = new THREE.InstancedMesh(rockGeo, rockMat, count);
    instancedRocks.castShadow = false;
    instancedRocks.receiveShadow = true;

    const dummy = new THREE.Object3D();

    rimPoints.forEach((pt, i) => {
      const jitterX = ((i % 3) - 1) * 0.08;
      const jitterZ = (((i + 1) % 3) - 1) * 0.08;
      dummy.position.set(pt.x + jitterX, 0.10, pt.z + jitterZ);

      const s = 0.75 + ((i % 5) * 0.12);
      dummy.scale.set(s * 1.15, s * 0.85, s * 1.1);

      dummy.rotation.set((i * 1.7) % Math.PI, (i * 2.3) % Math.PI, (i * 0.9) % Math.PI);
      dummy.updateMatrix();

      instancedRocks.setMatrixAt(i, dummy.matrix);
    });

    instancedRocks.instanceMatrix.needsUpdate = true;
    this.#scene.add(instancedRocks);
    this.#instancedRocks = instancedRocks;
  }

  /**
   * Enables or disables Subterranean X-Ray view.
   * When enabled, the ground plane becomes semi-transparent so underground tunnels,
   * tracks, stations, and trains are clearly visible from above ground.
   */
  setSubterraneanXRay(enable) {
    if (this.#groundMesh && this.#groundMesh.material) {
      if (enable) {
        this.#groundMesh.material.transparent = true;
        this.#groundMesh.material.opacity = 0.28;
        this.#groundMesh.material.depthWrite = false;
        this.#groundMesh.material.stencilFunc = THREE.AlwaysStencilFunc;
      } else {
        this.#groundMesh.material.transparent = false;
        this.#groundMesh.material.opacity = 1.0;
        this.#groundMesh.material.depthWrite = true;
        this.#groundMesh.material.stencilFunc = THREE.NotEqualStencilFunc;
      }
      this.#groundMesh.material.needsUpdate = true;
    }
    return enable;
  }

  /**
   * Toggles visibility of the sand ground terrain plane.
   */
  toggleGround(visible) {
    if (this.#groundMesh) {
      this.#groundMesh.visible = typeof visible === 'boolean' ? visible : !this.#groundMesh.visible;
      if (this.#maskMesh) this.#maskMesh.visible = this.#groundMesh.visible;
      return this.#groundMesh.visible;
    }
    return false;
  }

  /**
   * Toggles visibility of the canyon rim rocks.
   */
  toggleRocks(visible) {
    if (this.#instancedRocks) {
      this.#instancedRocks.visible = typeof visible === 'boolean' ? visible : !this.#instancedRocks.visible;
      return this.#instancedRocks.visible;
    }
    return false;
  }
}
