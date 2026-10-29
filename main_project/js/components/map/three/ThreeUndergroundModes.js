/**
 * ThreeUndergroundModes.js
 * Modular visual manager for 4 alternative underground metro presentation styles:
 * - Mode 0: 'canyon' (Current Look: Deep canyon trench with retaining walls)
 * - Mode 1: 'image_bed' (Image Style: Wide excavated earth/ballast roadbed + strata edge, 0 depth clipping)
 * - Mode 2: 'tunnel_portals' (Concrete Tunnel Portals at ramp transitions + enclosed subway casing)
 * - Mode 3: 'shallow_trench' (Cut-and-cover shallow 0.35m trench with low concrete curbs)
 */

import * as THREE from '../../../lib/three/three.module.js';

export class ThreeUndergroundModes {
  #scene;
  #currentMode = 'canyon';

  // Root Groups
  #imageBedGroup = null;
  #portalsGroup = null;
  #shallowTrenchGroup = null;

  #curves = [];
  #metroLines = [];

  constructor(scene) {
    this.#scene = scene;
  }

  /**
   * Initializes all alternative mode geometries once subway spline curves are available.
   * @param {Object} params
   * @param {Array<THREE.Curve>} params.curves - Underground spline segment curves
   * @param {Array<Object>} params.metroLines - Array of line objects
   */
  init({ curves = [], metroLines = [] } = {}) {
    this.dispose();

    this.#curves = curves || [];
    this.#metroLines = metroLines || [];

    this.#imageBedGroup = new THREE.Group();
    this.#imageBedGroup.name = "UndergroundMode_ImageBed";
    this.#imageBedGroup.visible = false;

    this.#portalsGroup = new THREE.Group();
    this.#portalsGroup.name = "UndergroundMode_Portals";
    this.#portalsGroup.visible = false;

    this.#shallowTrenchGroup = new THREE.Group();
    this.#shallowTrenchGroup.name = "UndergroundMode_ShallowTrench";
    this.#shallowTrenchGroup.visible = false;

    this.#buildImageBed();
    this.#buildTunnelPortals();
    this.#buildShallowTrench();

    this.#scene.add(this.#imageBedGroup);
    this.#scene.add(this.#portalsGroup);
    this.#scene.add(this.#shallowTrenchGroup);

    this.setMode(this.#currentMode);
  }

  /**
   * Switches the active underground rendering style.
   * @param {'canyon'|'image_bed'|'tunnel_portals'|'shallow_trench'} mode
   */
  setMode(mode) {
    this.#currentMode = mode || 'canyon';

    if (this.#imageBedGroup) {
      this.#imageBedGroup.visible = (this.#currentMode === 'image_bed');
    }
    if (this.#portalsGroup) {
      this.#portalsGroup.visible = (this.#currentMode === 'tunnel_portals');
    }
    if (this.#shallowTrenchGroup) {
      this.#shallowTrenchGroup.visible = (this.#currentMode === 'shallow_trench');
    }

    return this.#currentMode;
  }

  getMode() {
    return this.#currentMode;
  }

  // =========================================================================
  // MODE 1: Wide Earth/Ballast Bed (Clash of Clans / Reference Image Style)
  // =========================================================================
  #buildImageBed() {
    const up = new THREE.Vector3(0, 1, 0);

    // Dark excavated earth/ballast material (matte, polygon offset to eliminate z-fighting on ground plane)
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x3d3326,
      roughness: 0.95,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -4.0
    });

    // Darker outer strata shoulder / cut-edge border
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x241d16,
      roughness: 0.98,
      metalness: 0.02,
      polygonOffset: true,
      polygonOffsetFactor: -1.2,
      polygonOffsetUnits: -4.5
    });

    const halfBedWidth = 1.35; // Total bed width = 2.7m (wide excavated roadway)
    const shoulderWidth = 0.28;

    const rockPoints = [];

    for (const curve of this.#curves) {
      const len = curve.getLength();
      const steps = Math.max(30, Math.floor(len * 2.0));

      const bedPositions = [];
      const borderLPositions = [];
      const borderRPositions = [];
      const bedIndices = [];
      const borderLIndices = [];
      const borderRIndices = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tan, up).normalize();

        // Flat on ground surface (y = 0.02)
        const yGround = 0.025;
        const center = new THREE.Vector3(pt.x, yGround, pt.z);

        const pL = center.clone().addScaledVector(right, -halfBedWidth);
        const pR = center.clone().addScaledVector(right, halfBedWidth);
        const pL_outer = center.clone().addScaledVector(right, -(halfBedWidth + shoulderWidth));
        const pR_outer = center.clone().addScaledVector(right, halfBedWidth + shoulderWidth);

        // Center Bed Vertices
        bedPositions.push(pL.x, pL.y, pL.z);
        bedPositions.push(pR.x, pR.y, pR.z);

        // Left Border Vertices
        borderLPositions.push(pL_outer.x, pL_outer.y, pL_outer.z);
        borderLPositions.push(pL.x, pL.y, pL.z);

        // Right Border Vertices
        borderRPositions.push(pR.x, pR.y, pR.z);
        borderRPositions.push(pR_outer.x, pR_outer.y, pR_outer.z);

        if (i < steps) {
          const b = i * 2;
          bedIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
          borderLIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
          borderRIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }

        // Collect scattered rock positions along the cut shoulders (every 4-5 steps)
        if (i > 1 && i < steps - 1 && i % 4 === 0) {
          const side = (i % 8 === 0) ? 1 : -1;
          const rockDist = halfBedWidth + shoulderWidth + 0.15;
          const rockPos = center.clone().addScaledVector(right, side * rockDist);
          rockPoints.push(rockPos);
        }
      }

      // Center Bed Mesh
      const bedGeo = new THREE.BufferGeometry();
      bedGeo.setAttribute('position', new THREE.Float32BufferAttribute(bedPositions, 3));
      bedGeo.setIndex(bedIndices);
      bedGeo.computeVertexNormals();
      const bedMesh = new THREE.Mesh(bedGeo, earthMat);
      bedMesh.receiveShadow = true;
      this.#imageBedGroup.add(bedMesh);

      // Left Border Mesh
      const bLGeo = new THREE.BufferGeometry();
      bLGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderLPositions, 3));
      bLGeo.setIndex(borderLIndices);
      bLGeo.computeVertexNormals();
      const bLMesh = new THREE.Mesh(bLGeo, borderMat);
      bLMesh.receiveShadow = true;
      this.#imageBedGroup.add(bLMesh);

      // Right Border Mesh
      const bRGeo = new THREE.BufferGeometry();
      bRGeo.setAttribute('position', new THREE.Float32BufferAttribute(borderRPositions, 3));
      bRGeo.setIndex(borderRIndices);
      bRGeo.computeVertexNormals();
      const bRMesh = new THREE.Mesh(bRGeo, borderMat);
      bRMesh.receiveShadow = true;
      this.#imageBedGroup.add(bRMesh);
    }

    // Low-poly bedrock boulders along the excavated shoulders (just like the reference image)
    if (rockPoints.length > 0) {
      const rockGeo = new THREE.DodecahedronGeometry(0.24, 0);
      const rockMat = new THREE.MeshStandardMaterial({
        color: 0x5a4f43,
        roughness: 0.92,
        metalness: 0.08
      });
      const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockPoints.length);
      rockMesh.castShadow = false; // Fast GPU performance
      rockMesh.receiveShadow = true;

      const dummy = new THREE.Object3D();
      rockPoints.forEach((p, idx) => {
        dummy.position.set(p.x, 0.12, p.z);
        const s = 0.8 + ((idx % 4) * 0.22);
        dummy.scale.set(s * 1.2, s * 0.75, s * 1.1);
        dummy.rotation.set((idx * 1.2) % Math.PI, (idx * 2.1) % Math.PI, 0);
        dummy.updateMatrix();
        rockMesh.setMatrixAt(idx, dummy.matrix);
      });
      rockMesh.instanceMatrix.needsUpdate = true;
      this.#imageBedGroup.add(rockMesh);
    }
  }

  // =========================================================================
  // MODE 2: Concrete Tunnel Portals + Subterranean Subway Casing
  // =========================================================================
  #buildTunnelPortals() {
    const up = new THREE.Vector3(0, 1, 0);

    // Concrete Portal Material
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0xa8a299,
      roughness: 0.85,
      metalness: 0.1
    });

    // Dark Tunnel Void Material (inside the portal arch)
    const voidMat = new THREE.MeshBasicMaterial({
      color: 0x12100e
    });

    // Reusable single portal geometry
    const portalGroupTemplate = new THREE.Group();

    // Portal Arch Frame (Left pillar, right pillar, top lintel arch)
    const pillarGeo = new THREE.BoxGeometry(0.35, 1.8, 0.6);
    const leftPillar = new THREE.Mesh(pillarGeo, concreteMat);
    leftPillar.position.set(-1.1, 0.9, 0);
    leftPillar.castShadow = true;
    leftPillar.receiveShadow = true;
    portalGroupTemplate.add(leftPillar);

    const rightPillar = leftPillar.clone();
    rightPillar.position.set(1.1, 0.9, 0);
    portalGroupTemplate.add(rightPillar);

    const topBeamGeo = new THREE.BoxGeometry(2.7, 0.45, 0.75);
    const topBeam = new THREE.Mesh(topBeamGeo, concreteMat);
    topBeam.position.set(0, 1.85, 0);
    topBeam.castShadow = true;
    topBeam.receiveShadow = true;
    portalGroupTemplate.add(topBeam);

    // Dark recessed tunnel entrance interior
    const voidGeo = new THREE.PlaneGeometry(1.85, 1.6);
    const voidMesh = new THREE.Mesh(voidGeo, voidMat);
    voidMesh.position.set(0, 0.8, -0.05);
    portalGroupTemplate.add(voidMesh);

    // Place a portal at the start and end transition points of each underground curve
    for (const curve of this.#curves) {
      const endpoints = [
        { t: 0.02, reverse: false },
        { t: 0.98, reverse: true }
      ];

      for (const ep of endpoints) {
        const pt = curve.getPointAt(ep.t);
        const tan = curve.getTangentAt(ep.t).normalize();
        if (ep.reverse) tan.negate();

        const portalInstance = portalGroupTemplate.clone(true);
        portalInstance.position.set(pt.x, 0.0, pt.z);

        // Orient portal facing along the track tangent
        const lookTarget = new THREE.Vector3().addVectors(portalInstance.position, tan);
        portalInstance.lookAt(lookTarget);

        this.#portalsGroup.add(portalInstance);
      }

      // Semi-transparent sleek glass/mesh subterranean cover along the curve
      const len = curve.getLength();
      const steps = Math.max(20, Math.floor(len * 1.5));
      const tubeGeo = new THREE.BufferGeometry();
      const positions = [];
      const indices = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tan, up).normalize();

        const pL = pt.clone().addScaledVector(right, -0.95);
        const pR = pt.clone().addScaledVector(right, 0.95);
        pL.y = 0.03;
        pR.y = 0.03;

        positions.push(pL.x, pL.y, pL.z);
        positions.push(pR.x, pR.y, pR.z);

        if (i < steps) {
          const b = i * 2;
          indices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }

      tubeGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      tubeGeo.setIndex(indices);
      tubeGeo.computeVertexNormals();

      const casingMat = new THREE.MeshStandardMaterial({
        color: 0x22262b,
        roughness: 0.4,
        metalness: 0.8,
        polygonOffset: true,
        polygonOffsetFactor: -1.0,
        polygonOffsetUnits: -4.0
      });
      const casingMesh = new THREE.Mesh(tubeGeo, casingMat);
      casingMesh.receiveShadow = true;
      this.#portalsGroup.add(casingMesh);
    }
  }

  // =========================================================================
  // MODE 3: Cut-and-Cover Shallow 0.35m Trench with Concrete Curbs
  // =========================================================================
  #buildShallowTrench() {
    const up = new THREE.Vector3(0, 1, 0);

    const trenchFloorMat = new THREE.MeshStandardMaterial({
      color: 0x332e27,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -4.0
    });

    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x8a847b,
      roughness: 0.75,
      metalness: 0.15
    });

    const halfW = 1.15;
    const curbH = 0.28;
    const curbW = 0.18;

    for (const curve of this.#curves) {
      const len = curve.getLength();
      const steps = Math.max(24, Math.floor(len * 2.0));

      const floorPositions = [];
      const floorIndices = [];
      const leftCurbPositions = [];
      const rightCurbPositions = [];
      const curbIndices = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = curve.getPointAt(t);
        const tan = curve.getTangentAt(t).normalize();
        const right = new THREE.Vector3().crossVectors(tan, up).normalize();

        const pL = pt.clone().addScaledVector(right, -halfW);
        const pR = pt.clone().addScaledVector(right, halfW);
        pL.y = 0.02;
        pR.y = 0.02;

        floorPositions.push(pL.x, pL.y, pL.z);
        floorPositions.push(pR.x, pR.y, pR.z);

        // Left curb top and base
        const curbL_in = pL.clone();
        const curbL_out = pL.clone().addScaledVector(right, -curbW);
        curbL_in.y += curbH;
        curbL_out.y += curbH;

        leftCurbPositions.push(pL.x, 0.02, pL.z);
        leftCurbPositions.push(curbL_in.x, curbL_in.y, curbL_in.z);

        // Right curb top and base
        const curbR_in = pR.clone();
        const curbR_out = pR.clone().addScaledVector(right, curbW);
        curbR_in.y += curbH;
        curbR_out.y += curbH;

        rightCurbPositions.push(pR.x, 0.02, pR.z);
        rightCurbPositions.push(curbR_in.x, curbR_in.y, curbR_in.z);

        if (i < steps) {
          const b = i * 2;
          floorIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
          curbIndices.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }

      // Trench Floor Mesh
      const fGeo = new THREE.BufferGeometry();
      fGeo.setAttribute('position', new THREE.Float32BufferAttribute(floorPositions, 3));
      fGeo.setIndex(floorIndices);
      fGeo.computeVertexNormals();
      const floorMesh = new THREE.Mesh(fGeo, trenchFloorMat);
      floorMesh.receiveShadow = true;
      this.#shallowTrenchGroup.add(floorMesh);

      // Left Curb Mesh
      const lcGeo = new THREE.BufferGeometry();
      lcGeo.setAttribute('position', new THREE.Float32BufferAttribute(leftCurbPositions, 3));
      lcGeo.setIndex(curbIndices);
      lcGeo.computeVertexNormals();
      const lcMesh = new THREE.Mesh(lcGeo, curbMat);
      lcMesh.receiveShadow = true;
      this.#shallowTrenchGroup.add(lcMesh);

      // Right Curb Mesh
      const rcGeo = new THREE.BufferGeometry();
      rcGeo.setAttribute('position', new THREE.Float32BufferAttribute(rightCurbPositions, 3));
      rcGeo.setIndex(curbIndices);
      rcGeo.computeVertexNormals();
      const rcMesh = new THREE.Mesh(rcGeo, curbMat);
      rcMesh.receiveShadow = true;
      this.#shallowTrenchGroup.add(rcMesh);
    }
  }

  dispose() {
    const groups = [this.#imageBedGroup, this.#portalsGroup, this.#shallowTrenchGroup];
    for (const g of groups) {
      if (!g) continue;
      this.#scene.remove(g);
      g.traverse(child => {
        if (child.isMesh) {
          child.geometry?.dispose();
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material?.dispose();
        }
      });
    }
    this.#imageBedGroup = null;
    this.#portalsGroup = null;
    this.#shallowTrenchGroup = null;
  }
}
