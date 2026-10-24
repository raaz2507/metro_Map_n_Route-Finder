/**
 * ThreeTrainController.js
 * Encapsulates 3D Train loading, state, speed, and continuous motion along a 3D track spline.
 */

import * as THREE from '../../../lib/three/three.module.js';
import { GLTFLoader } from '../../../lib/three/addons/loaders/GLTFLoader.js';

export class ThreeTrainController {
  #scene;
  #loader;
  #trainMesh = null;
  #spline = null;
  #progress = 0;
  #speed = 0.045; // Normalized progress per second
  #isMoving = true;
  #verticalOffset = 0.28;

  constructor(scene) {
    this.#scene = scene;
    this.#loader = new GLTFLoader();
  }

  setSpline(spline) {
    this.#spline = spline;
    return this;
  }

  async loadModel(url = './assets/3d_models/train.glb', scale = 1.15) {
    return new Promise((resolve, reject) => {
      this.#loader.load(
        url,
        (gltf) => {
          this.#trainMesh = gltf.scene;
          this.#trainMesh.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.#trainMesh.scale.set(scale, scale, scale);
          this.#scene.add(this.#trainMesh);
          resolve(this.#trainMesh);
        },
        undefined,
        (err) => {
          console.warn('GLTF train model fallback to procedural train mesh:', err);
          const group = new THREE.Group();
          const bodyGeo = new THREE.BoxGeometry(1.4, 1.3, 5.5);
          const bodyMat = new THREE.MeshStandardMaterial({ color: 0xecf0f1, metalness: 0.5, roughness: 0.3 });
          const body = new THREE.Mesh(bodyGeo, bodyMat);
          body.position.y = 0.85;
          group.add(body);
          this.#trainMesh = group;
          this.#scene.add(group);
          resolve(group);
        }
      );
    });
  }

  toggleMotion(moving) {
    if (typeof moving === 'boolean') {
      this.#isMoving = moving;
    } else {
      this.#isMoving = !this.#isMoving;
    }
    return this.#isMoving;
  }

  isMoving() {
    return this.#isMoving;
  }

  toggleVisibility(visible) {
    if (this.#trainMesh) {
      this.#trainMesh.visible = typeof visible === 'boolean' ? visible : !this.#trainMesh.visible;
      return this.#trainMesh.visible;
    }
    return false;
  }

  update(delta) {
    if (!this.#trainMesh || !this.#spline || !this.#isMoving) return;

    this.#progress = (this.#progress + delta * this.#speed) % 1;
    const pos = this.#spline.getPointAt(this.#progress);
    const tangent = this.#spline.getTangentAt(this.#progress);

    this.#trainMesh.position.copy(pos);
    this.#trainMesh.position.y += this.#verticalOffset;

    const lookTarget = pos.clone().add(tangent);
    this.#trainMesh.lookAt(lookTarget);
  }
}
