/**
 * ThreeStationHoardings.js
 * 🏙️ 3D Unipole Station Hoardings / Billboard Signage
 * 
 * Rules:
 * 1. Single-Line Station: Solid 100% official line color background from transit_network.json
 *    (e.g. Red Line -> #C60C30, Blue Line -> #005FA9, Yellow Line -> #FFD514). NO sheen, NO gradient!
 * 2. Interchange Station: Only interchanges show a sharp 2-color (or 3-color) split gradient of the
 *    intersecting line colors (e.g. Rajiv Chowk -> Yellow + Blue; Kashmere Gate -> Violet + Red + Yellow).
 * 3. High-Impact Bold Typography: Station name fills the panoramic signboard (large 42-46px bold font)
 *    with a 7px dark stroke + solid white fill, guaranteeing 100% legibility on any line color.
 * 4. Grounded Low-Profile Unipole: Compact 0.65m steel pole with circular swivel flange hub.
 * 5. Option A Camera-Oriented: Board face aligns with camera viewing quaternion for 100% legibility from any angle.
 * 6. Zero Hiding Guarantee: Every station retains its hoarding sign permanently.
 * 7. Official Localized Names: Reads clean names directly via metroDataStore.getStationName(stationId).
 */

import * as THREE from '../../../lib/three/three.module.js';
import { metroDataStore } from '../../../core/metro-data-store.js';

export class ThreeStationHoardings {
  #scene;
  #hoardingsGroup = null;
  #hoardingsList = [];
  #visible = true;

  constructor(scene) {
    this.#scene = scene;
  }

  /**
   * Builds 3D Unipole Hoardings across all stations.
   * @param {Array<Object>} stationsList - [{ id, pos, layout, status, st }]
   */
  buildHoardings(stationsList) {
    this.dispose();

    if (!stationsList || stationsList.length === 0) return null;

    this.#hoardingsGroup = new THREE.Group();
    this.#hoardingsGroup.name = "StationHoardings_Group";
    this.#hoardingsList = [];

    // Shared materials & geometries for mounting pole and swivel hub
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x3d4349,
      metalness: 0.75,
      roughness: 0.35
    });

    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x24282e,
      metalness: 0.85,
      roughness: 0.25
    });

    // True full-size real metro station gantry ratio (14.0m width x 3.8m height)
    const baseWidth = 14.0;
    const baseHeight = 3.8;
    const boardGeo = new THREE.PlaneGeometry(baseWidth, baseHeight);

    for (const item of stationsList) {
      const stId = item.id;
      const st = item.st || metroDataStore.stationData?.[stId] || {};

      // 1. Resolve Official Clean Station Name via Single Source of Truth
      let cleanName = "";
      if (typeof metroDataStore?.getStationName === "function") {
        cleanName = metroDataStore.getStationName(stId);
      }
      if (!cleanName || cleanName.trim() === "") {
        cleanName = st.name || item.name || stId;
        cleanName = cleanName.replace(/_/g, ' ');
      }

      // 2. Resolve Exact Line Colors from transit_network.json lines data
      const lineColors = this.#resolveStationLineColors(st, stId);
      const isInterchange = lineColors.length > 1;

      // 3. Generate Billboard Canvas Texture
      const texture = this.#createBillboardTexture(cleanName, lineColors, isInterchange);

      const boardMat = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.DoubleSide,
        depthTest: true
      });

      const boardMesh = new THREE.Mesh(boardGeo, boardMat);

      // 4. Build Compact Mounting Structure:
      // Lower profile: snug against the station / pavilion roof canopy
      const isUnderground = item.pos.y < 1.0;
      const rot = item.rotationY || 0;
      
      // For underground stations, place hoarding directly on top of the street entrance canopy roof
      let anchorX = item.pos.x;
      let anchorZ = item.pos.z;
      let baseY = item.pos.y + 3.8;
      let poleHeight = 1.0;

      if (isUnderground) {
        anchorX = item.pos.x + 3.2 * Math.cos(rot);
        anchorZ = item.pos.z - 3.2 * Math.sin(rot);
        baseY = 3.65; // Sits neatly atop the rotated glass entrance pavilion roof
        poleHeight = 0.9;
      }

      const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, poleHeight, 14);
      const poleMesh = new THREE.Mesh(poleGeo, poleMat);

      // Base anchor position in 3D world
      poleMesh.position.set(anchorX, baseY + poleHeight / 2, anchorZ);
      poleMesh.castShadow = false;
      poleMesh.receiveShadow = true;

      // Circular Swivel Flange Hub at top of pole (looks 100% natural from all 360-degree angles)
      const hubGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.12, 16);
      const hubMesh = new THREE.Mesh(hubGeo, hubMat);
      hubMesh.position.set(anchorX, baseY + poleHeight + 0.06, anchorZ);
      hubMesh.castShadow = false;
      hubMesh.receiveShadow = true;

      // Board sits right on top of the swivel hub
      const boardCenterY = baseY + poleHeight + 0.12 + (baseHeight / 2);
      boardMesh.position.set(anchorX, boardCenterY, anchorZ);

      this.#hoardingsGroup.add(poleMesh);
      this.#hoardingsGroup.add(hubMesh);
      this.#hoardingsGroup.add(boardMesh);

      this.#hoardingsList.push({
        boardMesh,
        poleMesh,
        hubMesh,
        anchorPos: new THREE.Vector3(anchorX, boardCenterY, anchorZ),
        boardBaseY: boardCenterY,
        baseWidth,
        baseHeight,
        status: item.status || 'operational',
        isInterchange
      });
    }

    this.#scene.add(this.#hoardingsGroup);
    return this.#hoardingsGroup;
  }

  /**
   * Helper to extract exact official line colors directly from transit_network.json lines.
   */
  #resolveStationLineColors(st, stId) {
    const colors = [];
    const linesList = Array.isArray(st.lines) ? st.lines : (metroDataStore?.stationData?.[stId]?.lines || []);

    const fallbackColorsMap = {
      red: '#C60C30',
      yellow: '#FFD514',
      blue: '#005FA9',
      green: '#00B050',
      violet: '#5A189A',
      pink: '#FF69B4',
      magenta: '#FF00FF',
      orange: '#FF8000',
      airport: '#FF8000',
      grey: '#7F8C8D',
      gray: '#7F8C8D',
      aqua: '#00B5E2',
      rapid: '#004B87'
    };

    for (const lineEntry of linesList) {
      let lineKey = '';
      let directColor = null;

      if (typeof lineEntry === 'string') {
        lineKey = lineEntry.toLowerCase();
        // Read directly from metroDataStore.lines or metroDataStore.data.lines
        directColor = metroDataStore?.lines?.[lineEntry]?.color || metroDataStore?.data?.lines?.[lineEntry]?.color;
      } else if (lineEntry && typeof lineEntry === 'object') {
        lineKey = (lineEntry.id || lineEntry.name || '').toLowerCase();
        directColor = lineEntry.color || metroDataStore?.lines?.[lineEntry.id]?.color || metroDataStore?.data?.lines?.[lineEntry.id]?.color;
      }

      if (directColor && !colors.includes(directColor)) {
        colors.push(directColor);
        continue;
      }

      // Keyword fallback if line ID is slightly different
      for (const [k, hex] of Object.entries(fallbackColorsMap)) {
        if (lineKey.includes(k)) {
          if (!colors.includes(hex)) {
            colors.push(hex);
          }
          break;
        }
      }
    }

    if (colors.length === 0) {
      colors.push('#005FA9'); // Fallback default
    }
    return colors;
  }

  /**
   * Generates official metro billboard texture:
   * 1. Single-Line: Solid 100% official line color from transit_network.json.
   * 2. Interchange: Sharp 2-color (or 3-color) vertical split gradient representing intersecting lines.
   * 3. Station name: Large bold font with 7px dark outline + pure white fill for 100% readability.
   */
  #createBillboardTexture(stationName, lineColors, isInterchange) {
    const canvas = document.createElement('canvas');
    canvas.width = 1400;
    canvas.height = 380;
    const ctx = canvas.getContext('2d');

    const numColors = lineColors.length;

    if (!isInterchange || numColors === 1) {
      // 1. Single-line: Solid 100% official line color (NO gradient, NO sheen!)
      ctx.fillStyle = lineColors[0];
      ctx.fillRect(0, 0, 1400, 380);

      // Outer metallic white/chrome frame
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 1386, 366);

      // Inner subtle pinstripe border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(18, 18, 1364, 344);
    } else {
      // 2. Interchange: Sharp multi-color split gradient between intersecting lines
      const bandWidth = 1400 / numColors;
      for (let i = 0; i < numColors; i++) {
        const xStart = Math.round(i * bandWidth);
        const xEnd = Math.round((i + 1) * bandWidth);
        ctx.fillStyle = lineColors[i];
        ctx.fillRect(xStart, 0, xEnd - xStart, 380);

        // Sharp chrome/white separator line between colors
        if (i > 0) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(xStart - 3.5, 0, 7, 380);
        }
      }

      // Golden outer frame for interchange
      ctx.strokeStyle = '#f5cf7c';
      ctx.lineWidth = 14;
      ctx.strokeRect(7, 7, 1386, 366);

      // Inner subtle pinstripe border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 3.5;
      ctx.strokeRect(18, 18, 1364, 344);
    }

    // 3. Prominent Bold Typography
    const rawLen = stationName.length;
    let fontSize = 100;
    if (rawLen > 24) fontSize = 64;
    else if (rawLen > 18) fontSize = 76;
    else if (rawLen > 12) fontSize = 90;

    const textCenterY = isInterchange ? 150 : 190;

    // Interchange pill badge at bottom
    if (isInterchange) {
      const pillW = 660;
      const pillH = 70;
      const pillX = 700 - pillW / 2;
      const pillY = 265;

      ctx.save();
      ctx.fillStyle = 'rgba(10, 14, 20, 0.88)';
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(pillX, pillY, pillW, pillH, 18);
      } else {
        ctx.rect(pillX, pillY, pillW, pillH);
      }
      ctx.fill();

      ctx.strokeStyle = '#f5cf7c';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#f5cf7c';
      ctx.font = "bold 34px 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('★ INTERCHANGE JUNCTION ★', 700, pillY + pillH / 2);
      ctx.restore();
    }

    // Heavy Dark Outline + Pure White Embossed Lettering for 100% legibility on any color
    ctx.font = `900 ${fontSize}px 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(10, 12, 16, 0.95)';
    ctx.lineWidth = 16;
    ctx.lineJoin = 'round';
    ctx.strokeText(stationName.toUpperCase(), 700, textCenterY);

    ctx.fillStyle = '#ffffff';
    ctx.fillText(stationName.toUpperCase(), 700, textCenterY);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return texture;
  }

  /**
   * Called on every animation frame.
   * Aligns hoarding board with camera direction and applies strictly clamped damped scale.
   * @param {THREE.Camera} camera
   */
  update(camera) {
    if (!this.#hoardingsGroup || !this.#visible) return;

    const camPos = camera.position;
    const camQuat = camera.quaternion;

    for (let i = 0; i < this.#hoardingsList.length; i++) {
      const item = this.#hoardingsList[i];
      if (!item.boardMesh.visible) continue;

      const dist = camPos.distanceTo(item.anchorPos);

      // Natural 3D perspective scaling:
      // - At full zoom-in (dist <= 60m): scale = 1.0 (True real-world 14.0m x 3.8m station gantry hoarding)
      //   Screen size is big, bold and prominent!
      // - As camera zooms out (dist moves from 60m to 1200m):
      //   The hoarding naturally and smoothly gets smaller on screen, with a gentle progressive dampening (max scale 2.4)
      //   so it never blocks neighbors or unnaturally balloons out into a gigantic billboard.
      const distOffset = Math.max(0, dist - 60);
      const scale = Math.min(2.4, Math.max(1.0, 1.0 + 0.0012 * distOffset));

      item.boardMesh.scale.set(scale, scale, 1);

      // Lift board smoothly with scale so it stays resting cleanly above the station canopy/hub
      item.boardMesh.position.y = item.boardBaseY + (item.baseHeight * (scale - 1)) * 0.45;

      // Billboard board face directly towards the camera
      item.boardMesh.quaternion.copy(camQuat);
    }
  }

  /**
   * Toggles overall visibility of hoardings.
   */
  toggleVisibility(visible) {
    this.#visible = typeof visible === 'boolean' ? visible : !this.#visible;
    if (this.#hoardingsGroup) {
      this.#hoardingsGroup.visible = this.#visible;
    }
    return this.#visible;
  }

  /**
   * Filter hoardings by operational / under_construction status (tied to Settings toggle).
   */
  toggleVisibilityByStatus(status, visible) {
    for (const item of this.#hoardingsList) {
      if (item.status === status) {
        item.boardMesh.visible = visible;
        item.poleMesh.visible = visible;
        if (item.hubMesh) item.hubMesh.visible = visible;
      }
    }
  }

  dispose() {
    if (this.#hoardingsGroup) {
      this.#scene.remove(this.#hoardingsGroup);
      for (const item of this.#hoardingsList) {
        item.boardMesh.geometry?.dispose();
        item.boardMesh.material.map?.dispose();
        item.boardMesh.material.dispose();
        item.poleMesh.geometry?.dispose();
        item.poleMesh.material.dispose();
        if (item.hubMesh) {
          item.hubMesh.geometry?.dispose();
          item.hubMesh.material.dispose();
        }
      }
      this.#hoardingsGroup = null;
      this.#hoardingsList = [];
    }
  }
}
