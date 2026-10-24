/**
 * ThreeMetroLineRibbon.js
 * Builds the continuous colored metro line ribbon (route corridor):
 * 1. Runs seamlessly along the ENTIRE continuous closed-loop circuit:
 *    - In the Canyon Trench (Y = -3.5)
 *    - Across both Viaduct Bridges (Y = 5.2)
 *    - Across the On-Ground Surface Track
 * 2. Matches exact corridor width of the bridge (width = 1.85m).
 * 3. Sits directly under the railway tracks to represent official Metro Lines (Red Line, Yellow Line, etc.).
 * 4. High-performance GPU mesh with dynamic color changing and toggleable visibility.
 */

import * as THREE from '../../../lib/three/three.module.js';

export class ThreeMetroLineRibbon {
  #scene;
  #mesh = null;
  #material = null;
  #ribbons = [];

  constructor(scene) {
    this.#scene = scene;
  }

  /**
   * Builds the continuous solid 3D colored metro line viaduct deck.
   * Extrudes a 3D structural box (top, bottom, and side faces) so the colored
   * line itself acts as the physical viaduct bridge and casts realistic shadows!
   */
  buildRibbon(spline, { width = 0.9, thickness = 0.35, color = 0xd63031, steps = 240, yOffset = 0.0 } = {}) {
    const positions = [];
    const indices = [];
    const up = new THREE.Vector3(0, 1, 0);

    const closed = Boolean(spline.closed);
    const numRings = closed ? steps : steps + 1;

    for (let i = 0; i < numRings; i++) {
      const t = i / steps;
      const clampedT = Math.max(0, Math.min(1.0, t));
      const pt = spline.getPointAt(clampedT);
      const tan = spline.getTangentAt(clampedT);

      const right = new THREE.Vector3().crossVectors(tan, up).normalize();
      const topY = pt.y + yOffset;
      const botY = topY - thickness;

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

        // Top face (colored track surface)
        indices.push(b, n, b + 1, b + 1, n, n + 1);
        // Bottom face (under deck facing ground)
        indices.push(b + 3, b + 2, n + 3, n + 3, b + 2, n + 2);
        // Right side wall
        indices.push(b + 1, n + 1, b + 2, b + 2, n + 1, n + 2);
        // Left side wall
        indices.push(b, b + 3, n, n, b + 3, n + 3);
      }
    }

    // Caps for open lines (start and end)
    if (!closed) {
      indices.push(0, 1, 3, 3, 1, 2); // Start cap
      const end = steps * 4;
      indices.push(end, end + 3, end + 1, end + 1, end + 3, end + 2); // End cap
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.45,
      metalness: 0.15,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.#scene.add(mesh);

    this.#mesh = mesh;
    this.#material = mat;
    this.#ribbons.push({ mesh, material: mat });

    return mesh;
  }

  /**
   * Dynamically changes the metro line color (Red Line, Yellow Line, Blue Line, etc.)
   */
  setColor(hexColor, index = 0) {
    if (this.#ribbons[index]) {
      this.#ribbons[index].material.color.set(hexColor);
    } else if (this.#material) {
      this.#material.color.set(hexColor);
    }
  }

  /**
   * Toggles visibility of all metro line ribbons.
   */
  toggleVisibility(visible) {
    let result = false;
    for (const item of this.#ribbons) {
      item.mesh.visible = typeof visible === 'boolean' ? visible : !item.mesh.visible;
      result = item.mesh.visible;
    }
    return result;
  }

  getMesh() {
    return this.#mesh;
  }

  clear() {
    for (const item of this.#ribbons) {
      if (item.mesh) {
        this.#scene.remove(item.mesh);
        if (item.mesh.geometry) item.mesh.geometry.dispose();
        if (item.mesh.material) item.mesh.material.dispose();
      }
    }
    this.#ribbons = [];
  }
}
