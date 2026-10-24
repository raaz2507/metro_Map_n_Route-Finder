/**
 * ThreeViaductBridge.js
 * Builds the clean, simple, flat stone viaduct deck and pillar supports:
 * 1. Clean flat stone deck ribbon (Zero twist, zero glitchy walls).
 * 2. Matches corridor width exactly with tunnel and ground terrain.
 * 3. GPU polygon offset to eliminate all Z-fighting/flickering.
 * 4. Watertight closed-loop construction across the entire circuit.
 * 5. Sturdy 3D pillars supporting the elevated deck cleanly.
 */

import * as THREE from '../../../lib/three/three.module.js';
import { GLTFLoader } from '../../../lib/three/addons/loaders/GLTFLoader.js';
import { APP_CONFIG } from '../../../config/app-config.js';

export class ThreeViaductBridge {
  #scene;
  #loader;
  #pillarGroup = null;
  #deckMeshes = [];

  constructor(scene) {
    this.#scene = scene;
    this.#loader = new GLTFLoader();
    this.#pillarGroup = new THREE.Group();
    this.#scene.add(this.#pillarGroup);
  }

  /**
   * Builds a clean, simple flat stone viaduct deck along any 3D curve.
   * Supports continuous watertight closed loops across the entire circuit.
   */
  buildDeck(curve, { width = 1.85, thickness = 0.35, steps = 240, closed = false, capStart = true, capEnd = true } = {}) {
    const positions = [];
    const indices = [];
    const up = new THREE.Vector3(0, 1, 0);

    const numRings = closed ? steps : steps + 1;

    for (let i = 0; i < numRings; i++) {
      const t = i / steps;
      const pt = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const right = new THREE.Vector3().crossVectors(tan, up).normalize();

      const topY = pt.y;
      const botY = pt.y - thickness;

      const tl = new THREE.Vector3(pt.x - right.x * width, topY, pt.z - right.z * width);
      const tr = new THREE.Vector3(pt.x + right.x * width, topY, pt.z + right.z * width);
      const br = new THREE.Vector3(pt.x + right.x * width, botY, pt.z + right.z * width);
      const bl = new THREE.Vector3(pt.x - right.x * width, botY, pt.z - right.z * width);

      positions.push(
        tl.x, tl.y, tl.z,
        tr.x, tr.y, tr.z,
        br.x, br.y, br.z,
        bl.x, bl.y, bl.z
      );

      const nextRing = closed ? (i + 1) % steps : i + 1;
      if (closed || i < steps) {
        const b = i * 4;
        const n = nextRing * 4;

        // Top face
        indices.push(b, n, b + 1, b + 1, n, n + 1);
        // Bottom face
        indices.push(b + 3, b + 2, n + 3, n + 3, b + 2, n + 2);
        // Right side
        indices.push(b + 1, n + 1, b + 2, b + 2, n + 1, n + 2);
        // Left side
        indices.push(b, b + 3, n, n, b + 3, n + 3);
      }
    }

    // Caps only needed for open-ended segments
    if (!closed) {
      if (capStart) {
        indices.push(0, 1, 3, 3, 1, 2);
      }
      if (capEnd) {
        const end = steps * 4;
        indices.push(end, end + 3, end + 1, end + 1, end + 3, end + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x6e6355, // Clean weathered viaduct stone
      roughness: 0.88,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: -1.0,
      polygonOffsetUnits: -4.0
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.#scene.add(mesh);
    this.#deckMeshes.push(mesh);
    return mesh;
  }

  /**
   * Toggles visibility of all bridge decks.
   */
  toggleDecks(visible) {
    let result = false;
    for (const mesh of this.#deckMeshes) {
      mesh.visible = typeof visible === 'boolean' ? visible : !mesh.visible;
      result = mesh.visible;
    }
    return result;
  }

  /**
   * Places pillars supporting the elevated viaduct directly under the deck.
   * Scaled to fit cleanly underneath the deck without punching through.
   */
  async loadPillars(locations, { modelUrl = './assets/3d_models/piller.glb', deckHeight = 5.2, deckThickness = 0.35 } = {}) {
    return new Promise((resolve) => {
      this.#loader.load(
        modelUrl,
        (gltf) => {
          const pillarBase = gltf.scene;
          pillarBase.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) c.material.roughness = 0.85;
            }
          });

          // Pillar original bounding box: width 3.0, height 7.05.
          // Target height: underside of deck minus a 0.06 safety gap so it NEVER punches through!
          const targetH = deckHeight - deckThickness - 0.06;
          const scaleY = targetH / 7.05;
          // Scale X and Z to fit cleanly under the deck
          const scaleXZ = APP_CONFIG?.MAP?.THREE_D?.PILLAR_SCALE ?? 0.42;

          for (const loc of locations) {
            const p = pillarBase.clone();
            p.scale.set(scaleXZ, scaleY, scaleXZ);
            p.position.set(loc.x, loc.y, loc.z);
            this.#pillarGroup.add(p);
          }
          resolve();
        },
        undefined,
        resolve
      );
    });
  }

  /**
   * Toggles visibility of the bridge stone pillars.
   */
  togglePillars(visible) {
    if (this.#pillarGroup) {
      this.#pillarGroup.visible = typeof visible === 'boolean' ? visible : !this.#pillarGroup.visible;
      return this.#pillarGroup.visible;
    }
    return false;
  }
}
