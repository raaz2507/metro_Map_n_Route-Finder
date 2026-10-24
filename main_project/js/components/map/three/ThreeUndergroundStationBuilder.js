/**
 * ThreeUndergroundStationBuilder.js
 * Open-Air Sunken Trench Subterranean Station Architecture:
 * 1. NO ROOF / NO CEILING: 100% open-air canyon trench so camera has an unobstructed
 *    top-down isometric view of tracks, metro line, and arriving trains.
 * 2. MODULAR CURVED PLATFORM: Platform is composed of modular precast square slabs
 *    that follow the track curve with uniform 1.25m clearance (Zero rail clipping).
 * 3. EXCAVATION BAY FIT: Fits neatly inside the squared-off, stone-chiseled subterranean canyon bay.
 * 4. Open-air stairs climbing the rock wall to ground level (Y = 0).
 */

import * as THREE from '../../../lib/three/three.module.js';

export const UG_STATION_STYLES = {
  MODERN_DMRC_OPENCUT: 0,
  COC_QUARRY_DEPOT: 1,
  CYBERPUNK_TRENCH: 2,
  HERITAGE_BAOLI_GHAT: 3,
  INDUSTRIAL_SUB_DOCK: 4
};

export class ThreeUndergroundStationBuilder {
  #scene;
  #currentGroup = null;
  #multiStationsGroup = null;
  #stationsList = [];
  #currentStyle = UG_STATION_STYLES.MODERN_DMRC_OPENCUT;
  #position = new THREE.Vector3(0, -3.5, -29);
  #rotationY = -Math.PI / 2;
  #glassCanopy = null;
  #showGlassCanopy = true;
  #isVisible = true;

  constructor(scene) {
    this.#scene = scene;
  }

  setTransform(position, rotationY = -Math.PI / 2) {
    this.#position.copy(position);
    this.#rotationY = rotationY;
    if (this.#currentGroup) {
      this.#currentGroup.position.copy(this.#position);
      this.#currentGroup.rotation.y = this.#rotationY;
    }
  }

  setCurveTransform(canyonCurve, t = 0.5) {
    const pt = canyonCurve.getPointAt(t);
    const tan = canyonCurve.getTangentAt(t);
    const angle = Math.atan2(tan.x, tan.z);
    this.setTransform(pt, angle);
  }

  #buildStyleGroup(group, styleIndex) {
    switch (styleIndex) {
      case UG_STATION_STYLES.MODERN_DMRC_OPENCUT:
        this.#buildModernOpencut(group);
        break;
      case UG_STATION_STYLES.COC_QUARRY_DEPOT:
        this.#buildCoCQuarryDepot(group);
        break;
      case UG_STATION_STYLES.CYBERPUNK_TRENCH:
        this.#buildCyberpunkTrench(group);
        break;
      case UG_STATION_STYLES.HERITAGE_BAOLI_GHAT:
        this.#buildHeritageBaoliGhat(group);
        break;
      case UG_STATION_STYLES.INDUSTRIAL_SUB_DOCK:
        this.#buildIndustrialSubDock(group);
        break;
      default:
        this.#buildModernOpencut(group);
    }

    // Add transparent vaulted glass atrium canopy sitting over the square pit
    this.#buildGlassAtriumShade(group);
  }

  buildStation(styleIndex = UG_STATION_STYLES.MODERN_DMRC_OPENCUT) {
    this.#currentStyle = styleIndex;

    if (this.#currentGroup) {
      this.#scene.remove(this.#currentGroup);
      this.#disposeGroup(this.#currentGroup);
      this.#currentGroup = null;
    }

    const group = new THREE.Group();
    group.position.copy(this.#position);
    group.rotation.y = this.#rotationY;

    this.#buildStyleGroup(group, styleIndex);

    this.#scene.add(group);
    this.#currentGroup = group;

    // If multi-stations are active, update their style too!
    if (this.#stationsList.length > 0) {
      this.buildAllStations(this.#stationsList, styleIndex);
    }

    return group;
  }

  /**
   * Builds and places authentic underground stations across ALL subterranean station coordinates.
   * Uses template cloning so every underground station displays the full architectural design
   * (open-cut stone trench, curved modular slabs, climbing stairs, transparent glass atrium skylight, etc.)
   */
  buildAllStations(stationsList, styleIndex = this.#currentStyle, scaleFactor = 0.22) {
    this.#currentStyle = styleIndex;
    this.#stationsList = stationsList;

    if (this.#multiStationsGroup) {
      this.#scene.remove(this.#multiStationsGroup);
      this.#disposeGroup(this.#multiStationsGroup);
      this.#multiStationsGroup = null;
    }

    if (!stationsList || stationsList.length === 0) return null;

    const template = new THREE.Group();
    this.#buildStyleGroup(template, styleIndex);
    // Scale horizontal footprint along track (X, Z), but preserve Y-height (1.0)
    // so stairs climb up to ground surface (Y = 0) and the glass skylight sits at ground level!
    template.scale.set(scaleFactor, 1.0, scaleFactor);

    const masterGroup = new THREE.Group();
    const placedPositions = [];

    for (const item of stationsList) {
      // Deduplicate overlapping stations at interchange junctions
      if (placedPositions.some(p => p.distanceTo(item.pos) < 6.0)) {
        continue;
      }
      placedPositions.push(item.pos);

      const clone = template.clone(true);
      clone.position.copy(item.pos);
      clone.rotation.y = item.rotationY || 0;
      clone.userData = { id: item.id, status: item.status || 'operational' };
      masterGroup.add(clone);
    }

    masterGroup.visible = this.#isVisible;
    if (!this.#showGlassCanopy) {
      masterGroup.traverse(child => {
        if (child.name === 'glassAtriumShade') {
          child.visible = false;
        }
      });
    }

    this.#multiStationsGroup = masterGroup;
    this.#scene.add(masterGroup);
    return masterGroup;
  }

  toggleGlassCanopy(visible) {
    this.#showGlassCanopy = typeof visible === 'boolean' ? visible : !this.#showGlassCanopy;
    if (this.#glassCanopy) {
      this.#glassCanopy.visible = this.#showGlassCanopy;
    }
    if (this.#multiStationsGroup) {
      this.#multiStationsGroup.traverse(child => {
        if (child.name === 'glassAtriumShade') {
          child.visible = this.#showGlassCanopy;
        }
      });
    }
    return this.#showGlassCanopy;
  }

  toggleVisibility(visible) {
    this.#isVisible = typeof visible === 'boolean' ? visible : !this.#isVisible;
    if (this.#currentGroup) {
      this.#currentGroup.visible = this.#isVisible;
    }
    if (this.#multiStationsGroup) {
      this.#multiStationsGroup.visible = this.#isVisible;
    }
    return this.#isVisible;
  }

  toggleVisibilityByStatus(status, visible) {
    if (this.#multiStationsGroup) {
      this.#multiStationsGroup.children.forEach(child => {
        if (child.userData?.status === status) {
          child.visible = visible;
        }
      });
    }
  }

  get currentStyle() {
    return this.#currentStyle;
  }

  // =========================================================================
  // 1. MODERN DMRC OPEN-CUT METRO PLATFORM
  // =========================================================================
  #buildModernOpencut(group) {
    const platWidth = 2.4;
    const platHeight = 0.45;
    const platBaseX = 1.25 + platWidth / 2; // Exact 1.25m safety clearance from track center

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0xdedede, roughness: 0.6, metalness: 0.1 });
    const safetyYellow = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.85, roughness: 0.25 });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.6
    });

    // 8 Precast Modular Slabs following the track curvature
    const numSlabs = 8;
    const slabLength = 2.0;

    for (let k = 0; k < numSlabs; k++) {
      const z = -7.0 + k * slabLength;
      const xCurve = (z * z) / 52.0;
      const angle = Math.atan2(z, 26.0);

      // Precast square concrete slab
      const slab = new THREE.Mesh(new THREE.BoxGeometry(platWidth, platHeight, slabLength - 0.04), concreteMat);
      slab.position.set(platBaseX + xCurve, platHeight / 2, z);
      slab.rotation.y = angle;
      slab.castShadow = true;
      slab.receiveShadow = true;

      // Yellow tactile strip on this modular slab
      const tactile = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, slabLength - 0.04), safetyYellow);
      tactile.position.set(-platWidth / 2 + 0.14, platHeight / 2 + 0.01, 0);
      slab.add(tactile);

      // Glass safety railing on this slab
      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, slabLength - 0.04), glassMat);
      glass.position.set(-platWidth / 2 + 0.04, platHeight / 2 + 0.525, 0);
      slab.add(glass);

      // Handrail
      const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, slabLength - 0.04), steelMat);
      handrail.position.set(-platWidth / 2 + 0.04, platHeight / 2 + 1.05, 0);
      slab.add(handrail);

      // Post
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), steelMat);
      post.position.set(-platWidth / 2 + 0.04, platHeight / 2 + 0.55, -slabLength / 2 + 0.05);
      slab.add(post);

      // Light poles on selected slabs
      if (k === 1 || k === 4 || k === 6) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 8), steelMat);
        pole.position.set(platWidth / 2 - 0.25, platHeight / 2 + 1.6, 0);
        pole.castShadow = true;
        slab.add(pole);

        const lampHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.1, 0.25),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 })
        );
        lampHead.position.set(platWidth / 2 - 0.55, platHeight / 2 + 3.15, 0);
        slab.add(lampHead);
      }

      // Passenger benches on selected slabs
      if (k === 2 || k === 5) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.4), steelMat);
        bench.position.set(0.35, platHeight / 2 + 0.2, 0);
        bench.castShadow = true;
        slab.add(bench);
      }

      group.add(slab);
    }

    // Open-Air Concrete Stairs climbing the canyon wall up to ground (Y = 0)
    const zStair = 3.5;
    const xStair = platBaseX + (zStair * zStair) / 52.0 + platWidth / 2 - 0.1;
    this.#buildOpenAirStairs(group, xStair, platHeight, zStair, concreteMat, steelMat);

    // Modern Station Signboard
    this.#addSideSignboard(group, 'CHAWRI BAZAR (OPEN CUT)', 0x0984e3, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // 2. CLASH OF CLANS SUNKEN QUARRY DEPOT
  // =========================================================================
  #buildCoCQuarryDepot(group) {
    const platWidth = 2.4;
    const platHeight = 0.5;
    const platBaseX = 1.25 + platWidth / 2;

    const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a4d41, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3821, roughness: 0.85 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xa57548, roughness: 0.9 });

    const numSlabs = 8;
    const slabLength = 2.0;

    for (let k = 0; k < numSlabs; k++) {
      const z = -7.0 + k * slabLength;
      const xCurve = (z * z) / 52.0;
      const angle = Math.atan2(z, 26.0);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(platWidth, platHeight, slabLength - 0.04), rockMat);
      slab.position.set(platBaseX + xCurve, platHeight / 2, z);
      slab.rotation.y = angle;
      slab.castShadow = true;
      slab.receiveShadow = true;

      // Timber edge beam
      const woodEdge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, slabLength - 0.04), woodMat);
      woodEdge.position.set(-platWidth / 2 + 0.1, platHeight / 2 + 0.04, 0);
      slab.add(woodEdge);

      // Wooden post
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.95, 6), woodMat);
      post.position.set(-platWidth / 2 + 0.1, platHeight / 2 + 0.475, 0);
      slab.add(post);

      // Rope railings
      [0.4, 0.8].forEach((yOff) => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, slabLength - 0.04, 6), ropeMat);
        rope.rotation.x = Math.PI / 2;
        rope.position.set(-platWidth / 2 + 0.1, platHeight / 2 + yOff, 0);
        slab.add(rope);
      });

      // Torches on selected slabs
      if (k === 1 || k === 6) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 2.2, 6), woodMat);
        pole.position.set(platWidth / 2 - 0.25, platHeight / 2 + 1.1, 0);
        slab.add(pole);

        const flame = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.14, 0),
          new THREE.MeshStandardMaterial({ color: 0xff471a, emissive: 0xff7700, emissiveIntensity: 1.6 })
        );
        flame.position.set(platWidth / 2 - 0.25, platHeight / 2 + 2.25, 0);
        slab.add(flame);
      }

      // Barrels/crates on slabs
      if (k === 3) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), woodMat);
        crate.position.set(0.4, platHeight / 2 + 0.325, 0);
        slab.add(crate);
      }

      group.add(slab);
    }

    // Wooden Gangway Stairs climbing canyon wall
    const zStair = 3.5;
    const xStair = platBaseX + (zStair * zStair) / 52.0 + platWidth / 2 - 0.1;
    this.#buildOpenAirStairs(group, xStair, platHeight, zStair, woodMat, woodMat);

    this.#addSideSignboard(group, 'CANYON QUARRY DEPOT', 0xd35400, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // 3. CYBERPUNK OPEN SKYWAY TRENCH
  // =========================================================================
  #buildCyberpunkTrench(group) {
    const platWidth = 2.4;
    const platHeight = 0.45;
    const platBaseX = 1.25 + platWidth / 2;

    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x15181f, roughness: 0.2, metalness: 0.8 });
    const neonCyan = new THREE.MeshStandardMaterial({ color: 0x00f0ff, emissive: 0x00f0ff, emissiveIntensity: 2.0 });
    const neonPink = new THREE.MeshStandardMaterial({ color: 0xff007f, emissive: 0xff007f, emissiveIntensity: 1.8 });
    const laserOrange = new THREE.MeshStandardMaterial({ color: 0xff9900, emissive: 0xff6600, emissiveIntensity: 2.0 });

    const numSlabs = 8;
    const slabLength = 2.0;

    for (let k = 0; k < numSlabs; k++) {
      const z = -7.0 + k * slabLength;
      const xCurve = (z * z) / 52.0;
      const angle = Math.atan2(z, 26.0);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(platWidth, platHeight, slabLength - 0.04), carbonMat);
      slab.position.set(platBaseX + xCurve, platHeight / 2, z);
      slab.rotation.y = angle;
      slab.castShadow = true;
      slab.receiveShadow = true;

      // Cyan floor track
      const floorStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, slabLength - 0.04), neonCyan);
      floorStrip.position.set(-0.2, platHeight / 2 + 0.01, 0);
      slab.add(floorStrip);

      // Laser emitters & beams
      const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), carbonMat);
      emitter.position.set(-platWidth / 2 + 0.06, platHeight / 2 + 0.425, 0);
      slab.add(emitter);

      [0.35, 0.7].forEach((yOff) => {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, slabLength - 0.04, 8), laserOrange);
        beam.rotation.x = Math.PI / 2;
        beam.position.set(-platWidth / 2 + 0.06, platHeight / 2 + yOff, 0);
        slab.add(beam);
      });

      // Holographic Monoliths
      if (k === 2 || k === 5) {
        const holo = new THREE.Mesh(
          new THREE.PlaneGeometry(1.0, 1.8),
          new THREE.MeshBasicMaterial({ color: k === 2 ? 0x00f0ff : 0xff007f, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
        );
        holo.position.set(0.4, platHeight / 2 + 1.1, 0);
        slab.add(holo);
      }

      group.add(slab);
    }

    const zStair = 3.5;
    const xStair = platBaseX + (zStair * zStair) / 52.0 + platWidth / 2 - 0.1;
    this.#buildOpenAirStairs(group, xStair, platHeight, zStair, carbonMat, neonCyan);

    this.#addSideSignboard(group, 'NEO-DELHI DOCK-01', 0x00f0ff, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // 4. ROYAL HERITAGE BAOLI GHAT
  // =========================================================================
  #buildHeritageBaoliGhat(group) {
    const platWidth = 2.5;
    const platHeight = 0.5;
    const platBaseX = 1.25 + platWidth / 2;

    const redSandstoneMat = new THREE.MeshStandardMaterial({ color: 0x9f513d, roughness: 0.88 });
    const jaliMat = new THREE.MeshStandardMaterial({ color: 0xc47b62, roughness: 0.82 });

    const numSlabs = 8;
    const slabLength = 2.0;

    for (let k = 0; k < numSlabs; k++) {
      const z = -7.0 + k * slabLength;
      const xCurve = (z * z) / 52.0;
      const angle = Math.atan2(z, 26.0);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(platWidth, platHeight, slabLength - 0.04), redSandstoneMat);
      slab.position.set(platBaseX + xCurve, platHeight / 2, z);
      slab.rotation.y = angle;
      slab.castShadow = true;
      slab.receiveShadow = true;

      // Upper seating step along rear
      const upperStep = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, slabLength - 0.04), redSandstoneMat);
      upperStep.position.set(platWidth / 2 - 0.4, platHeight / 2 + 0.175, 0);
      slab.add(upperStep);

      // Balustrade post & jali screen
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.85, 8), redSandstoneMat);
      pillar.position.set(-platWidth / 2 + 0.08, platHeight / 2 + 0.425, 0);
      slab.add(pillar);

      const jali = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, slabLength - 0.1), jaliMat);
      jali.position.set(-platWidth / 2 + 0.08, platHeight / 2 + 0.425, 0);
      slab.add(jali);

      // Deepastambha Lampposts
      if (k === 1 || k === 6) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 2.6, 8), redSandstoneMat);
        post.position.set(platWidth / 2 - 0.3, platHeight / 2 + 1.3, 0);
        slab.add(post);

        const lamp = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.2, 0),
          new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 1.4 })
        );
        lamp.position.set(platWidth / 2 - 0.3, platHeight / 2 + 2.7, 0);
        slab.add(lamp);
      }

      group.add(slab);
    }

    const zStair = 3.5;
    const xStair = platBaseX + (zStair * zStair) / 52.0 + platWidth / 2 - 0.1;
    this.#buildOpenAirStairs(group, xStair, platHeight, zStair, redSandstoneMat, redSandstoneMat);

    this.#addSideSignboard(group, 'PURANA QILA (OPEN GHAT)', 0xd4af37, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // 5. INDUSTRIAL SUB-DOCK
  // =========================================================================
  #buildIndustrialSubDock(group) {
    const platWidth = 2.4;
    const platHeight = 0.45;
    const platBaseX = 1.25 + platWidth / 2;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x4a4f56, roughness: 0.95 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.85, roughness: 0.3 });
    const safetyYellow = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.5 });
    const hazardBlack = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 });

    const numSlabs = 8;
    const slabLength = 2.0;

    for (let k = 0; k < numSlabs; k++) {
      const z = -7.0 + k * slabLength;
      const xCurve = (z * z) / 52.0;
      const angle = Math.atan2(z, 26.0);

      const slab = new THREE.Mesh(new THREE.BoxGeometry(platWidth, platHeight, slabLength - 0.04), concreteMat);
      slab.position.set(platBaseX + xCurve, platHeight / 2, z);
      slab.rotation.y = angle;
      slab.castShadow = true;
      slab.receiveShadow = true;

      // Hazard striping
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, slabLength - 0.04), k % 2 === 0 ? safetyYellow : hazardBlack);
      stripe.position.set(-platWidth / 2 + 0.1, platHeight / 2 + 0.01, 0);
      slab.add(stripe);

      // Yellow cage railing
      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, slabLength - 0.04), safetyYellow);
      cage.position.set(-platWidth / 2 + 0.06, platHeight / 2 + 0.475, 0);
      slab.add(cage);

      // High-mast floodlight
      if (k === 1) {
        const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 3.8, 8), steelMat);
        mast.position.set(platWidth / 2 - 0.25, platHeight / 2 + 1.9, 0);
        slab.add(mast);

        const floodlight = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.25, 0.25),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffea88, emissiveIntensity: 1.5 })
        );
        floodlight.position.set(platWidth / 2 - 0.5, platHeight / 2 + 3.8, 0);
        slab.add(floodlight);
      }

      if (k === 4) {
        const toolBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.2), safetyYellow);
        toolBox.position.set(0.4, platHeight / 2 + 0.3, 0);
        slab.add(toolBox);
      }

      group.add(slab);
    }

    const zStair = 3.5;
    const xStair = platBaseX + (zStair * zStair) / 52.0 + platWidth / 2 - 0.1;
    this.#buildOpenAirStairs(group, xStair, platHeight, zStair, steelMat, safetyYellow);

    this.#addSideSignboard(group, 'SECTOR-7 (OPEN DOCK)', 0xf1c40f, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // HELPER: OPEN-AIR STAIRS CLIMBING CANYON WALL TO GROUND LEVEL (Y = 0)
  // =========================================================================
  #buildOpenAirStairs(group, startX, startY, centerZ, stepMat, handrailMat) {
    const numSteps = 12;
    const totalRise = 3.05; // From Y = -3.05 up to Y = 0.0 ground surface
    const stepRise = totalRise / numSteps;
    const stepTread = 0.35;
    const stairWidth = 1.4;

    const stairGroup = new THREE.Group();
    const zBase = centerZ;

    for (let i = 0; i < numSteps; i++) {
      const stepMesh = new THREE.Mesh(new THREE.BoxGeometry(stairWidth, stepRise, stepTread), stepMat);
      stepMesh.position.set(startX + 0.3, startY + (i + 0.5) * stepRise, zBase + i * stepTread);
      stepMesh.castShadow = true;
      stepMesh.receiveShadow = true;
      stairGroup.add(stepMesh);
    }

    // Slanted Handrail along the climbing stairs
    const railLength = Math.sqrt(totalRise * totalRise + (numSteps * stepTread) * (numSteps * stepTread));
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, railLength), handrailMat);
    const midY = startY + totalRise / 2 + 0.85;
    const midZ = zBase + (numSteps * stepTread) / 2;
    rail.position.set(startX - stairWidth / 2 + 0.35, midY, midZ);
    rail.rotation.x = -Math.atan2(totalRise, numSteps * stepTread);
    stairGroup.add(rail);

    group.add(stairGroup);
  }

  // =========================================================================
  // HELPER: SIDE-MOUNTED STATION SIGNBOARD
  // =========================================================================
  #addSideSignboard(group, stationName, accentColor, xPos, yPos, zPos) {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(xPos, yPos, zPos);

    [-1.2, 1.2].forEach((zOff) => {
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.8, roughness: 0.3 })
      );
      pole.position.set(0, -0.9, zOff);
      boardGroup.add(pole);
    });

    const frameGeo = new THREE.BoxGeometry(0.12, 0.65, 3.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.3, metalness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    boardGroup.add(frame);

    const borderGeo = new THREE.BoxGeometry(0.14, 0.52, 3.0);
    const borderMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.2, metalness: 0.5 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    boardGroup.add(border);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stationName, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const signGeo = new THREE.PlaneGeometry(2.8, 0.42);
    const signMat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.rotation.y = Math.PI / 2;
    signMesh.position.set(-0.08, 0, 0);
    boardGroup.add(signMesh);

    group.add(boardGroup);
  }

  // =========================================================================
  // HELPER: TRANSPARENT GLASS SKYLIGHT SHADE OVER THE SQUARE PIT (NO CAGE/ARCH)
  // =========================================================================
  #buildGlassAtriumShade(group) {
    const shadeGroup = new THREE.Group();
    shadeGroup.name = 'glassAtriumShade';
    const length = 17.0;
    const xMin = 1.35;
    const xMax = 4.85;
    const xCenter = (xMin + xMax) / 2;
    const spanWidth = xMax - xMin;
    const groundY = 3.5; // Ground surface level Y = 0.0 in world coordinates

    // Pure transparent glass material matching the elevated station glass
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      roughness: 0.08,
      metalness: 0.1,
      transmission: 0.75,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    // Clean subtle stainless chrome edge trim (ultra thin, no cage bars)
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xb0bec5,
      metalness: 0.85,
      roughness: 0.25
    });

    // 1. Pure flat crystal-clear transparent glass panel over the station pit
    const glassGeo = new THREE.BoxGeometry(spanWidth + 0.2, 0.05, length);
    const glassMesh = new THREE.Mesh(glassGeo, glassMat);
    glassMesh.position.set(xCenter, groundY + 0.03, 0);
    shadeGroup.add(glassMesh);

    // 2. Ultra-slim perimeter bezel frame around the pit edges (no cage, no arch)
    [-length / 2, length / 2].forEach(z => {
      const endTrim = new THREE.Mesh(new THREE.BoxGeometry(spanWidth + 0.3, 0.06, 0.08), trimMat);
      endTrim.position.set(xCenter, groundY + 0.03, z);
      shadeGroup.add(endTrim);
    });
    [xMin - 0.1, xMax + 0.1].forEach(x => {
      const sideTrim = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, length), trimMat);
      sideTrim.position.set(x, groundY + 0.03, 0);
      shadeGroup.add(sideTrim);
    });

    shadeGroup.visible = this.#showGlassCanopy;
    this.#glassCanopy = shadeGroup;
    group.add(shadeGroup);
  }

  #disposeGroup(group) {
    group.traverse((c) => {
      if (c.isMesh) {
        c.geometry?.dispose();
        if (Array.isArray(c.material)) {
          c.material.forEach(m => m.dispose());
        } else {
          c.material?.dispose();
        }
      }
    });
  }
}
