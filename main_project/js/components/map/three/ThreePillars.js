/**
 * ThreePillars.js
 * Loads and manages 3D stone pillars supporting the elevated railway tracks:
 * 1. Loads piller.glb model.
 * 2. Scales height to meet the elevated track cleanly.
 * 3. Toggleable visibility via the Checkbox Control Panel.
 */

import * as THREE from '../../../lib/three/three.module.js';
import { GLTFLoader } from '../../../lib/three/addons/loaders/GLTFLoader.js';
import { APP_CONFIG } from '../../../config/app-config.js';

export class ThreePillars {
  #scene;
  #loader;
  #pillarGroup = null;

  constructor(scene) {
    this.#scene = scene;
    this.#loader = new GLTFLoader();
    this.#pillarGroup = new THREE.Group();
    this.#scene.add(this.#pillarGroup);
  }

  clear() {
    while (this.#pillarGroup.children.length > 0) {
      const child = this.#pillarGroup.children[0];
      this.#pillarGroup.remove(child);
      child.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
      });
    }
  }

  /**
   * High-Performance Instanced Pillar Support (1 Draw Call for all pillars)
   */
  buildInstancedPillars(locations, targetHeight = 5.2) {
    if (!locations || locations.length === 0) return;
    this.clear();

    const unitHeight = 1.0;
    const geo = new THREE.CylinderGeometry(0.24, 0.30, unitHeight, 8);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8a7f72,
      roughness: 0.85,
      metalness: 0.1
    });

    const instancedMesh = new THREE.InstancedMesh(geo, mat, locations.length);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    locations.forEach((loc, i) => {
      // Dynamic pillar height to touch bottom of deck exactly
      const h = loc.pillarHeight ?? (loc.trackY != null ? Math.max(0.5, loc.trackY - 0.35) : targetHeight - 0.35);
      dummy.scale.set(1, h, 1);
      dummy.position.set(loc.x, (loc.y || 0) + h / 2, loc.z);
      if (loc.yaw != null) {
        dummy.rotation.y = loc.yaw + Math.PI / 2;
      }
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    this.#pillarGroup.add(instancedMesh);
  }

  /**
   * Places pillars supporting the elevated track.
   * Scales height per-pillar so pillars smoothly shorten along descent ramps
   * and meet the underside of the deck with 0 penetration into the ribbon.
   */
  async loadPillars(locations, { modelUrl = './assets/3d_models/piller.glb', targetHeight = 5.2 } = {}) {
    if (!locations || locations.length === 0) return;

    return new Promise((resolve) => {
      this.#loader.load(
        modelUrl,
        (gltf) => {
          this.clear();
          const pillarBase = gltf.scene;
          pillarBase.traverse((c) => {
            if (c.isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
              if (c.material) c.material.roughness = 0.85;
            }
          });

          const scaleXZ = APP_CONFIG?.MAP?.THREE_D?.PILLAR_SCALE ?? 0.28;

          for (const loc of locations) {
            const p = pillarBase.clone();
            // Dynamic pillar height: supports bottom of deck without piercing through ribbon
            const h = loc.pillarHeight ?? (loc.trackY != null ? Math.max(0.5, loc.trackY - 0.35) : targetHeight - 0.35);
            const scaleY = h / 7.05;

            p.scale.set(scaleXZ, scaleY, scaleXZ);
            p.position.set(loc.x, loc.y || 0, loc.z);

            // Orient crosshead across the track (perpendicular to travel)
            if (loc.yaw != null) {
              p.rotation.y = loc.yaw + Math.PI / 2;
            }

            this.#pillarGroup.add(p);
          }
          resolve();
        },
        undefined,
        () => {
          // Fallback to high-performance InstancedMesh on load error
          this.buildInstancedPillars(locations, targetHeight);
          resolve();
        }
      );
    });
  }

  /**
   * Toggles visibility of the stone pillars.
   */
  togglePillars(visible) {
    if (this.#pillarGroup) {
      this.#pillarGroup.visible = typeof visible === 'boolean' ? visible : !this.#pillarGroup.visible;
      return this.#pillarGroup.visible;
    }
    return false;
  }
}
