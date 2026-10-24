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

    const geo = new THREE.CylinderGeometry(0.38, 0.48, targetHeight, 8);
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
      dummy.position.set(loc.x, (loc.y || 0) + targetHeight / 2, loc.z);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    });

    instancedMesh.instanceMatrix.needsUpdate = true;
    this.#pillarGroup.add(instancedMesh);
  }

  /**
   * Places pillars supporting the elevated track.
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

          // Pillar original bounding box: width 3.0, height 7.05
          const scaleY = targetHeight / 7.05;
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
