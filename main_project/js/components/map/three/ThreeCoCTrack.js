/**
 * ThreeCoCTrack.js
 * Builds authentic, ultra-high-performance procedural 3D railway tracks:
 * 1. Dual Continuous Steel Rails (Left & Right) following the true 3D spline curve with 100% smooth bends.
 * 2. Transverse Modular Sleepers (Ties) sitting on the 3D bridge deck.
 * 3. 0ms instant procedural generation — zero GLB file download latency or network dependency!
 * 4. Ultra-high GPU performance: track shadows turned OFF (castShadow = false) while keeping
 *    receiveShadow = true so the 3D bridge deck and stations cast clean shadows without GPU lag!
 */

import * as THREE from '../../../lib/three/three.module.js';

export class ThreeCoCTrack {
  #scene;
  #trackMeshes = [];
  #railMaterial = null;
  #sleeperGeometry = null;
  #sleeperMaterial = null;

  constructor(scene) {
    this.#scene = scene;

    // Realistic polished metallic steel rail material
    this.#railMaterial = new THREE.MeshStandardMaterial({
      color: 0xc8d6e5,
      metalness: 0.88,
      roughness: 0.22,
      side: THREE.DoubleSide
    });

    // Dark weathered ballastless concrete sleeper tie geometry & material
    this.#sleeperGeometry = new THREE.BoxGeometry(1.22, 0.05, 0.16);
    this.#sleeperMaterial = new THREE.MeshStandardMaterial({
      color: 0x3d3835,
      roughness: 0.85,
      metalness: 0.10
    });
  }

  /**
   * Backward-compatible pre-loader (resolves immediately with zero network overhead).
   */
  async loadModel() {
    return Promise.resolve();
  }

  /**
   * Procedurally builds authentic continuous dual rails and cross-sleepers along any 3D spline.
   */
  async loadAndBuildTrack(spline, { sleeperSpacing = 1.4, yOffset = 0.015, railGauge = 0.84 } = {}) {
    const totalLength = spline.getLength();
    if (totalLength < 0.5) return null;

    const trackGroup = new THREE.Group();
    const up = new THREE.Vector3(0, 1, 0);
    const closed = Boolean(spline.closed);

    // =========================================================================
    // 1. DUAL CONTINUOUS STEEL RAILS (1 single unified BufferGeometry!)
    // =========================================================================
    const railSteps = Math.max(80, Math.ceil(totalLength * 1.4));
    const numRings = closed ? railSteps : railSteps + 1;
    const positions = [];
    const indices = [];

    const railHalfGauge = railGauge / 2; // e.g. 0.42m
    const railOffsets = [-railHalfGauge, railHalfGauge];
    const railW = 0.065;
    const railH = 0.075;

    railOffsets.forEach((offset, rIdx) => {
      const vOffset = rIdx * numRings * 4;

      for (let i = 0; i < numRings; i++) {
        const t = Math.min(1.0, i / railSteps);
        const pt = spline.getPointAt(t);
        const tan = spline.getTangentAt(t);
        const right = new THREE.Vector3().crossVectors(tan, up).normalize();

        const cx = pt.x + right.x * offset;
        const cz = pt.z + right.z * offset;
        const topY = pt.y + yOffset + railH;
        const botY = pt.y + yOffset;

        const halfW = railW / 2;
        positions.push(
          cx - right.x * halfW, topY, cz - right.z * halfW, // 0: tl
          cx + right.x * halfW, topY, cz + right.z * halfW, // 1: tr
          cx + right.x * halfW, botY, cz + right.z * halfW, // 2: br
          cx - right.x * halfW, botY, cz - right.z * halfW  // 3: bl
        );

        const nextRing = closed ? (i + 1) % railSteps : i + 1;
        if (closed || i < railSteps) {
          const b = vOffset + i * 4;
          const n = vOffset + nextRing * 4;

          // Top face of rail (running head)
          indices.push(b, n, b + 1, b + 1, n, n + 1);
          // Bottom face of rail (foot)
          indices.push(b + 3, b + 2, n + 3, n + 3, b + 2, n + 2);
          // Right web face
          indices.push(b + 1, n + 1, b + 2, b + 2, n + 1, n + 2);
          // Left web face
          indices.push(b, b + 3, n, n, b + 3, n + 3);
        }
      }

      // Caps for open line rails
      if (!closed) {
        const b = vOffset;
        indices.push(b, b + 1, b + 3, b + 3, b + 1, b + 2);
        const end = vOffset + railSteps * 4;
        indices.push(end, end + 3, end + 1, end + 1, end + 3, end + 2);
      }
    });

    const railsGeo = new THREE.BufferGeometry();
    railsGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    railsGeo.setIndex(indices);
    railsGeo.computeVertexNormals();

    const railsMesh = new THREE.Mesh(railsGeo, this.#railMaterial);
    // Crucial: Track shadow OFF for 60-120 FPS performance boost, receiveShadow ON
    railsMesh.castShadow = false;
    railsMesh.receiveShadow = true;
    trackGroup.add(railsMesh);

    // =========================================================================
    // 2. CROSS-SLEEPERS / TIES (InstancedMesh along curve)
    // =========================================================================
    const sleeperCount = Math.max(1, Math.ceil(totalLength / sleeperSpacing));
    const exactSpacing = totalLength / sleeperCount;
    const instancedSleepers = new THREE.InstancedMesh(this.#sleeperGeometry, this.#sleeperMaterial, sleeperCount);
    // Track shadow OFF to completely eliminate GPU shadow map rasterization lag
    instancedSleepers.castShadow = false;
    instancedSleepers.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < sleeperCount; i++) {
      const t = Math.min(1.0, (i * exactSpacing) / totalLength);
      const pt = spline.getPointAt(t);
      const tangent = spline.getTangentAt(t);

      dummy.position.set(pt.x, pt.y + yOffset + 0.02, pt.z);
      const lookTarget = dummy.position.clone().add(tangent);
      dummy.lookAt(lookTarget);
      dummy.updateMatrix();
      instancedSleepers.setMatrixAt(i, dummy.matrix);
    }

    instancedSleepers.instanceMatrix.needsUpdate = true;
    trackGroup.add(instancedSleepers);

    this.#scene.add(trackGroup);
    this.#trackMeshes.push(trackGroup);
    return trackGroup;
  }

  /**
   * Toggles visibility of all railway tracks.
   */
  toggleTrack(visible) {
    let result = false;
    for (const group of this.#trackMeshes) {
      group.visible = typeof visible === 'boolean' ? visible : !group.visible;
      result = group.visible;
    }
    return result;
  }

  destroy() {
    for (const group of this.#trackMeshes) {
      this.#scene.remove(group);
      group.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose();
        }
      });
    }
    this.#trackMeshes = [];
  }
}
