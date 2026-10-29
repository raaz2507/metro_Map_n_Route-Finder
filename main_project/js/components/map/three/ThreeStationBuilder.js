/**
 * ThreeStationBuilder.js
 * Procedural 3D Metro Station Architecture Engine:
 * Generates 5 distinct architectural station designs that fit perfectly
 * around the railway tracks across Elevated, Ground, and Subterranean levels.
 *
 * 5 Distinct Architectural Styles:
 * 1. MODERN_ARCH: Contemporary metro arch canopy (Delhi/DMRC & Singapore MRT style, tubular curved steel ribs, glass canopy).
 * 2. INDUSTRIAL_TRUSS: Heavy industrial railway station (triangular space-frame trusses, I-beams, corrugated roof, hazard stripes).
 * 3. COC_TIMBER_STONE: Clash of Clans fantasy style (chiseled sandstone blocks, rustic timber beams, terracotta roof, torches).
 * 4. FUTURISTIC_WING: Aerocity / High-speed minimalist (cantilevered aerodynamic wing, neon LED accent channels, titanium blade struts).
 * 5. CAVERN_BUNKER: Subterranean reinforced vault (heavy ribbed concrete arches, catenary gantry, recessed tunnel lights).
 */

import * as THREE from '../../../lib/three/three.module.js';

export const STATION_STYLES = {
  MODERN_ARCH: 0,
  INDUSTRIAL_TRUSS: 1,
  COC_TIMBER_STONE: 2,
  FUTURISTIC_WING: 3,
  CAVERN_BUNKER: 4
};

export class ThreeStationBuilder {
  #scene;
  #currentStationGroup = null;
  #multiStationsGroup = null;
  #stationsList = [];
  #currentStyle = STATION_STYLES.MODERN_ARCH;
  #stationPosition = new THREE.Vector3(14, 5.2, -1); // Placed on Elevated Span (X = 14, Y = 5.2, Z = -1)
  #stationRotationY = 0; // Aligned along Z-axis

  constructor(scene) {
    this.#scene = scene;
  }

  /**
   * Sets world position and yaw rotation for the station.
   */
  setTransform(position, rotationY = 0) {
    this.#stationPosition.copy(position);
    this.#stationRotationY = rotationY;
    if (this.#currentStationGroup) {
      this.#currentStationGroup.position.copy(this.#stationPosition);
      this.#currentStationGroup.rotation.y = this.#stationRotationY;
    }
  }

  #buildStyleGroup(group, styleIndex) {
    switch (styleIndex) {
      case STATION_STYLES.MODERN_ARCH:
        this.#buildModernArch(group);
        break;
      case STATION_STYLES.INDUSTRIAL_TRUSS:
        this.#buildIndustrialTruss(group);
        break;
      case STATION_STYLES.COC_TIMBER_STONE:
        this.#buildCoCTimberStone(group);
        break;
      case STATION_STYLES.FUTURISTIC_WING:
        this.#buildFuturisticWing(group);
        break;
      case STATION_STYLES.CAVERN_BUNKER:
        this.#buildCavernBunker(group);
        break;
      default:
        this.#buildModernArch(group);
    }
  }

  /**
   * Builds and displays one of the 5 station styles (single station mode).
   */
  buildStation(styleIndex = STATION_STYLES.MODERN_ARCH) {
    this.#currentStyle = styleIndex;

    // Clean up previous station
    if (this.#currentStationGroup) {
      this.#scene.remove(this.#currentStationGroup);
      this.#disposeGroup(this.#currentStationGroup);
      this.#currentStationGroup = null;
    }

    const group = new THREE.Group();
    group.position.copy(this.#stationPosition);
    group.rotation.y = this.#stationRotationY;

    this.#buildStyleGroup(group, styleIndex);

    this.#scene.add(group);
    this.#currentStationGroup = group;

    // If multi-stations are active, update their style too!
    if (this.#stationsList.length > 0) {
      this.buildAllStations(this.#stationsList, styleIndex);
    }

    return group;
  }

  /**
   * Builds and places authentic stations across ALL network station coordinates.
   * Uses template cloning so every station displays the full architectural design
   * (curved tubular arch ribs, extruded glass canopy, safety lines, railings, etc.)
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
    template.scale.set(scaleFactor, scaleFactor, scaleFactor);

    const masterGroup = new THREE.Group();

    for (const item of stationsList) {
      const clone = template.clone(true);
      clone.position.copy(item.pos);
      clone.rotation.y = item.rotationY || 0;
      clone.userData = { id: item.id, status: item.status || 'operational' };
      masterGroup.add(clone);
    }

    this.#multiStationsGroup = masterGroup;
    this.#scene.add(masterGroup);
    return masterGroup;
  }

  /**
   * Toggles station visibility across both single and multi-station modes.
   */
  toggleVisibility(visible) {
    let isVis = false;
    if (this.#currentStationGroup) {
      this.#currentStationGroup.visible = typeof visible === 'boolean' ? visible : !this.#currentStationGroup.visible;
      isVis = this.#currentStationGroup.visible;
    }
    if (this.#multiStationsGroup) {
      this.#multiStationsGroup.visible = typeof visible === 'boolean' ? visible : !this.#multiStationsGroup.visible;
      isVis = this.#multiStationsGroup.visible;
    }
    return isVis;
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
  // DESIGN 1: MODERN ARCH CANOPY (DMRC / Singapore MRT Modern Style)
  // =========================================================================
  #buildModernArch(group) {
    const length = 16.0;
    const platWidth = 1.8;
    const platXOffset = 2.4; // Distance from track center to platform center
    const platHeight = 0.45;

    // 1. Dual Platforms (Left & Right of Track)
    const platMat = new THREE.MeshStandardMaterial({ color: 0xe6e6e6, roughness: 0.7, metalness: 0.1 });
    const safetyMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4 }); // Yellow safety line
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.7,
      transparent: true,
      opacity: 0.65
    });

    [-platXOffset, platXOffset].forEach((xSide) => {
      // Platform slab
      const slabGeo = new THREE.BoxGeometry(platWidth, platHeight, length);
      const slab = new THREE.Mesh(slabGeo, platMat);
      slab.position.set(xSide, platHeight / 2, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      group.add(slab);

      // Yellow tactile edge line
      const lineGeo = new THREE.BoxGeometry(0.18, 0.02, length);
      const line = new THREE.Mesh(lineGeo, safetyMat);
      const edgeX = xSide > 0 ? xSide - platWidth / 2 + 0.12 : xSide + platWidth / 2 - 0.12;
      line.position.set(edgeX, platHeight + 0.01, 0);
      group.add(line);

      // Glass Edge Railing (outer side)
      const railGeo = new THREE.BoxGeometry(0.06, 0.85, length);
      const rail = new THREE.Mesh(railGeo, glassMat);
      const outerX = xSide > 0 ? xSide + platWidth / 2 - 0.05 : xSide - platWidth / 2 + 0.05;
      rail.position.set(outerX, platHeight + 0.425, 0);
      group.add(rail);

      // Steel Railing Handrail
      const handrailGeo = new THREE.BoxGeometry(0.12, 0.06, length);
      const steelMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.85, roughness: 0.25 });
      const handrail = new THREE.Mesh(handrailGeo, steelMat);
      handrail.position.set(outerX, platHeight + 0.88, 0);
      group.add(handrail);
    });

    // 2. Sweeping Curved Tubular Arch Ribs (over the whole station)
    const archRadius = 4.2;
    const archMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, metalness: 0.7, roughness: 0.3 });
    const archCount = 5;

    for (let i = 0; i < archCount; i++) {
      const z = -length / 2 + (i / (archCount - 1)) * length;
      const curve = new THREE.EllipseCurve(0, 0, archRadius, archRadius * 0.75, 0, Math.PI, false);
      const points = curve.getPoints(24);
      const shape = new THREE.Shape();
      const archGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p.x, p.y + platHeight + 0.2, z))),
        32,
        0.12,
        8,
        false
      );
      const archMesh = new THREE.Mesh(archGeo, archMat);
      archMesh.castShadow = true;
      group.add(archMesh);
    }

    // 3. Curved Glass Canopy Roof covering the arches
    const roofCurve = new THREE.EllipseCurve(0, 0, archRadius + 0.05, archRadius * 0.75 + 0.05, 0.15 * Math.PI, 0.85 * Math.PI, false);
    const roofPoints = roofCurve.getPoints(20);
    const roofShape = new THREE.Shape(roofPoints);
    const extrudeSettings = { depth: length + 0.6, bevelEnabled: false };
    const roofGeo = new THREE.ExtrudeGeometry(roofShape, extrudeSettings);
    roofGeo.center();
    const roofMesh = new THREE.Mesh(roofGeo, glassMat);
    roofMesh.position.set(0, platHeight + archRadius * 0.38 + 0.2, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);

    // 4. Station Signboard ("RAJIV CHOWK - BLUE LINE")
    this.#addStationSignboard(group, 'RAJIV CHOWK', 0x0984e3, length / 2 + 0.1, platHeight + 3.2);
  }

  // =========================================================================
  // DESIGN 2: INDUSTRIAL STEEL TRUSS (Heritage / Heavy Gantry Space-Frame)
  // =========================================================================
  #buildIndustrialTruss(group) {
    const length = 16.0;
    const platWidth = 1.8;
    const platXOffset = 2.4;
    const platHeight = 0.45;

    const asphaltMat = new THREE.MeshStandardMaterial({ color: 0x3d3d3d, roughness: 0.9 });
    const rustSteelMat = new THREE.MeshStandardMaterial({ color: 0x4a4a48, metalness: 0.8, roughness: 0.4 });
    const yellowMat = new THREE.MeshStandardMaterial({ color: 0xf39c12, roughness: 0.5 });
    const corrugatedMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.6, roughness: 0.5 });

    // 1. Dual Platforms with Caution Hazard Stripes
    [-platXOffset, platXOffset].forEach((xSide) => {
      const slabGeo = new THREE.BoxGeometry(platWidth, platHeight, length);
      const slab = new THREE.Mesh(slabGeo, asphaltMat);
      slab.position.set(xSide, platHeight / 2, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      group.add(slab);

      // Steel safety fence
      const fenceCount = 8;
      for (let j = 0; j <= fenceCount; j++) {
        const postZ = -length / 2 + (j / fenceCount) * length;
        const outerX = xSide > 0 ? xSide + platWidth / 2 - 0.08 : xSide - platWidth / 2 + 0.08;
        const postGeo = new THREE.BoxGeometry(0.08, 0.9, 0.08);
        const post = new THREE.Mesh(postGeo, rustSteelMat);
        post.position.set(outerX, platHeight + 0.45, postZ);
        group.add(post);
      }
      // Horizontal fence bars
      const outerX = xSide > 0 ? xSide + platWidth / 2 - 0.08 : xSide - platWidth / 2 + 0.08;
      [0.35, 0.75].forEach((yOff) => {
        const barGeo = new THREE.BoxGeometry(0.04, 0.04, length);
        const bar = new THREE.Mesh(barGeo, yellowMat);
        bar.position.set(outerX, platHeight + yOff, 0);
        group.add(bar);
      });
    });

    // 2. Heavy Triangular Overhead Space-Frame Trusses
    const trussHeight = 4.2;
    const spanWidth = 7.0;
    const trussCount = 5;

    for (let i = 0; i < trussCount; i++) {
      const z = -length / 2 + (i / (trussCount - 1)) * length;

      // Left column
      const colL = new THREE.Mesh(new THREE.BoxGeometry(0.25, trussHeight, 0.25), rustSteelMat);
      colL.position.set(-spanWidth / 2, platHeight + trussHeight / 2, z);
      colL.castShadow = true;
      group.add(colL);

      // Right column
      const colR = new THREE.Mesh(new THREE.BoxGeometry(0.25, trussHeight, 0.25), rustSteelMat);
      colR.position.set(spanWidth / 2, platHeight + trussHeight / 2, z);
      colR.castShadow = true;
      group.add(colR);

      // Top Cross Beam
      const beamTop = new THREE.Mesh(new THREE.BoxGeometry(spanWidth, 0.22, 0.22), rustSteelMat);
      beamTop.position.set(0, platHeight + trussHeight, z);
      beamTop.castShadow = true;
      group.add(beamTop);

      // Diagonal Cross-braces
      const diagGeo = new THREE.CylinderGeometry(0.06, 0.06, spanWidth * 0.72);
      const diag1 = new THREE.Mesh(diagGeo, rustSteelMat);
      diag1.position.set(-spanWidth * 0.25, platHeight + trussHeight * 0.75, z);
      diag1.rotation.z = Math.PI / 4;
      group.add(diag1);

      const diag2 = new THREE.Mesh(diagGeo, rustSteelMat);
      diag2.position.set(spanWidth * 0.25, platHeight + trussHeight * 0.75, z);
      diag2.rotation.z = -Math.PI / 4;
      group.add(diag2);
    }

    // 3. Glazed Transparent Glass Pitch Roof with Steel Frame
    const trussGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const roofP1 = new THREE.Mesh(new THREE.BoxGeometry(spanWidth * 0.54, 0.06, length + 0.4), trussGlassMat);
    roofP1.position.set(-spanWidth * 0.25, platHeight + trussHeight + 0.35, 0);
    roofP1.rotation.z = -0.15;
    roofP1.castShadow = true;
    group.add(roofP1);

    const roofP2 = new THREE.Mesh(new THREE.BoxGeometry(spanWidth * 0.54, 0.06, length + 0.4), trussGlassMat);
    roofP2.position.set(spanWidth * 0.25, platHeight + trussHeight + 0.35, 0);
    roofP2.rotation.z = 0.15;
    roofP2.castShadow = true;
    group.add(roofP2);

    // Steel Edge Trims around Glass Roof Panels
    [-spanWidth * 0.51, 0, spanWidth * 0.51].forEach((xEdge, idx) => {
      const trimGeo = new THREE.BoxGeometry(0.08, 0.10, length + 0.5);
      const trim = new THREE.Mesh(trimGeo, rustSteelMat);
      const angle = idx === 0 ? -0.15 : (idx === 2 ? 0.15 : 0);
      trim.position.set(xEdge, platHeight + trussHeight + (idx === 1 ? 0.55 : 0.2), 0);
      trim.rotation.z = angle;
      group.add(trim);
    });

    // 4. Industrial Hanging Caged Lamps
    for (let k = 0; k < 3; k++) {
      const lampZ = -length * 0.35 + k * length * 0.35;
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9), rustSteelMat);
      wire.position.set(0, platHeight + trussHeight - 0.45, lampZ);
      group.add(wire);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xffeaa7, emissive: 0xffd32a, emissiveIntensity: 0.8 })
      );
      bulb.position.set(0, platHeight + trussHeight - 0.9, lampZ);
      group.add(bulb);
    }

    // Signboard
    this.#addStationSignboard(group, 'KASHMERE GATE', 0xd35400, length / 2 + 0.1, platHeight + 3.4);
  }

  // =========================================================================
  // DESIGN 3: CLASH OF CLANS TIMBER & STONE FORT (Fantasy Strategy Game Theme)
  // =========================================================================
  #buildCoCTimberStone(group) {
    const length = 16.0;
    const platWidth = 1.9;
    const platXOffset = 2.45;
    const platHeight = 0.5;

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8a7b69, roughness: 0.92 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.85 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x9c3d28, roughness: 0.75 }); // CoC red roof tiles
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf5cd44, metalness: 0.6, roughness: 0.3 });

    // 1. Chiseled Stone Platforms
    [-platXOffset, platXOffset].forEach((xSide) => {
      const slabGeo = new THREE.BoxGeometry(platWidth, platHeight, length);
      const slab = new THREE.Mesh(slabGeo, stoneMat);
      slab.position.set(xSide, platHeight / 2, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      group.add(slab);

      // Wooden edge border
      const borderX = xSide > 0 ? xSide - platWidth / 2 + 0.08 : xSide + platWidth / 2 - 0.08;
      const border = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, length), woodMat);
      border.position.set(borderX, platHeight + 0.025, 0);
      group.add(border);

      // Wooden Palisade Fence on outer rim
      const outerX = xSide > 0 ? xSide + platWidth / 2 - 0.1 : xSide - platWidth / 2 + 0.1;
      const logCount = 10;
      for (let l = 0; l <= logCount; l++) {
        const logZ = -length / 2 + (l / logCount) * length;
        const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.85, 6), woodMat);
        log.position.set(outerX, platHeight + 0.425, logZ);
        log.castShadow = true;
        group.add(log);
      }
    });

    // 2. Heavy Timber Pillars & Cross Beams
    const roofHeight = 4.0;
    const postCount = 4;
    for (let p = 0; p < postCount; p++) {
      const z = -length / 2 + (p / (postCount - 1)) * length;

      [-platXOffset - 0.6, platXOffset + 0.6].forEach((x) => {
        // Wooden Post
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, roofHeight, 8), woodMat);
        post.position.set(x, platHeight + roofHeight / 2, z);
        post.castShadow = true;
        group.add(post);

        // Stone Base Footing
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.4, 8), stoneMat);
        base.position.set(x, platHeight + 0.2, z);
        group.add(base);
      });

      // Overhead heavy wood crossbeam
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(platXOffset * 2 + 1.6, 0.3, 0.3), woodMat);
      crossBeam.position.set(0, platHeight + roofHeight, z);
      crossBeam.castShadow = true;
      group.add(crossBeam);
    }

    // 3. CoC Stylized Transparent Glass Pagoda Canopy with Timber/Gold Beams
    const cocGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x90caf9,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const roofMesh = new THREE.Mesh(new THREE.BoxGeometry(platXOffset * 2 + 2.0, 0.08, length + 0.8), cocGlassMat);
    roofMesh.position.set(0, platHeight + roofHeight + 0.35, 0);
    roofMesh.castShadow = true;
    group.add(roofMesh);

    // Timber perimeter fascia frame around glass canopy
    const timberTrim = new THREE.Mesh(new THREE.BoxGeometry(platXOffset * 2 + 2.15, 0.18, length + 0.95), woodMat);
    timberTrim.position.set(0, platHeight + roofHeight + 0.35, 0);
    group.add(timberTrim);

    // Ridge crest
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, length + 1.0), goldMat);
    ridge.position.set(0, platHeight + roofHeight + 0.65, 0);
    group.add(ridge);

    // 4. Flaming Braziers (Torches at entrances)
    [-platXOffset, platXOffset].forEach((xSide) => {
      [-length / 2, length / 2].forEach((zSide) => {
        const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.35, 8), stoneMat);
        brazier.position.set(xSide, platHeight + 0.6, zSide);
        group.add(brazier);

        const flame = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.12, 0),
          new THREE.MeshStandardMaterial({ color: 0xff471a, emissive: 0xff7700, emissiveIntensity: 1.2 })
        );
        flame.position.set(xSide, platHeight + 0.85, zSide);
        group.add(flame);
      });
    });

    // Signboard (Carved Wood Shield)
    this.#addStationSignboard(group, 'BARBARIAN JUNCTION', 0x8b4513, length / 2 + 0.1, platHeight + 3.1);
  }

  // =========================================================================
  // DESIGN 4: FUTURISTIC AEROCITY WING (High-Speed Hyperloop / Aerodynamic)
  // =========================================================================
  #buildFuturisticWing(group) {
    const length = 16.0;
    const platWidth = 1.8;
    const platXOffset = 2.4;
    const platHeight = 0.45;

    const whiteComposite = new THREE.MeshStandardMaterial({ color: 0xf5f6fa, roughness: 0.15, metalness: 0.2 });
    const cyanNeon = new THREE.MeshStandardMaterial({ color: 0x00d2d3, emissive: 0x01a3a4, emissiveIntensity: 1.0 });
    const titaniumStrut = new THREE.MeshStandardMaterial({ color: 0x2f3640, roughness: 0.3, metalness: 0.85 });

    // 1. Polished Terrazzo Platforms with Embedded Cyan Neon Guides
    [-platXOffset, platXOffset].forEach((xSide) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(platWidth, platHeight, length), whiteComposite);
      slab.position.set(xSide, platHeight / 2, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      group.add(slab);

      // Glowing Neon Guide Strip
      const neonX = xSide > 0 ? xSide - platWidth / 2 + 0.08 : xSide + platWidth / 2 - 0.08;
      const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, length), cyanNeon);
      neonStrip.position.set(neonX, platHeight + 0.015, 0);
      group.add(neonStrip);

      // Sleek Minimalist Glass Barrier
      const outerX = xSide > 0 ? xSide + platWidth / 2 - 0.04 : xSide - platWidth / 2 + 0.04;
      const glassBarrier = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.8, length),
        new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transmission: 0.8, transparent: true, opacity: 0.5 })
      );
      glassBarrier.position.set(outerX, platHeight + 0.4, 0);
      group.add(glassBarrier);
    });

    // 2. Sweeping Aerodynamic Cantilevered Wing Roof
    const wingSpan = 8.4;
    const wingShape = new THREE.Shape();
    wingShape.moveTo(-wingSpan / 2, 0);
    wingShape.quadraticCurveTo(0, 1.2, wingSpan / 2, 0);
    wingShape.lineTo(wingSpan / 2, 0.15);
    wingShape.quadraticCurveTo(0, 1.35, -wingSpan / 2, 0.15);
    wingShape.closePath();

    const extrudeSettings = { depth: length + 1.2, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1 };
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, extrudeSettings);
    wingGeo.center();

    // Transparent Aerodynamic Glass Wing Canopy
    const aeroGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x80e8ff,
      roughness: 0.05,
      metalness: 0.05,
      transmission: 0.88,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const wingMesh = new THREE.Mesh(wingGeo, aeroGlassMat);
    wingMesh.position.set(0, platHeight + 3.8, 0);
    wingMesh.castShadow = true;
    group.add(wingMesh);

    // 3. Central Neon Spine along roof
    const spineMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, length + 1.4), cyanNeon);
    spineMesh.position.set(0, platHeight + 4.45, 0);
    group.add(spineMesh);

    // 4. Slanted Aerodynamic Blade Columns
    const bladeCount = 4;
    for (let b = 0; b < bladeCount; b++) {
      const z = -length / 2 + 1.5 + (b / (bladeCount - 1)) * (length - 3.0);
      [-platXOffset - 0.5, platXOffset + 0.5].forEach((xSide) => {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 0.6), titaniumStrut);
        blade.position.set(xSide, platHeight + 1.9, z);
        blade.rotation.z = xSide > 0 ? -0.12 : 0.12;
        blade.castShadow = true;
        group.add(blade);
      });
    }

    // Signboard
    this.#addStationSignboard(group, 'AEROCITY TERMINAL', 0x00d2d3, length / 2 + 0.1, platHeight + 3.2);
  }

  // =========================================================================
  // DESIGN 5: CAVERN VAULT BUNKER (Subterranean / Trench Arch)
  // =========================================================================
  #buildCavernBunker(group) {
    const length = 16.0;
    const platWidth = 1.8;
    const platXOffset = 2.4;
    const platHeight = 0.45;

    const concreteMat = new THREE.MeshStandardMaterial({ color: 0x57606f, roughness: 0.95 });
    const gantryMat = new THREE.MeshStandardMaterial({ color: 0x2f3542, metalness: 0.75, roughness: 0.35 });
    const amberMat = new THREE.MeshStandardMaterial({ color: 0xffa502, emissive: 0xff7f50, emissiveIntensity: 0.9 });
    const whiteFluorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff9fb, emissiveIntensity: 0.7 });

    // 1. Reinforced Heavy Concrete Platforms
    [-platXOffset, platXOffset].forEach((xSide) => {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(platWidth, platHeight, length), concreteMat);
      slab.position.set(xSide, platHeight / 2, 0);
      slab.castShadow = true;
      slab.receiveShadow = true;
      group.add(slab);

      // Amber emergency platform edge strip
      const amberX = xSide > 0 ? xSide - platWidth / 2 + 0.08 : xSide + platWidth / 2 - 0.08;
      const amberStrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, length), amberMat);
      amberStrip.position.set(amberX, platHeight + 0.01, 0);
      group.add(amberStrip);

      // Heavy Safety Barricade (Subterranean steel posts)
      const outerX = xSide > 0 ? xSide + platWidth / 2 - 0.08 : xSide - platWidth / 2 + 0.08;
      const barGeo = new THREE.BoxGeometry(0.1, 0.85, length);
      const barricade = new THREE.Mesh(barGeo, concreteMat);
      barricade.position.set(outerX, platHeight + 0.425, 0);
      group.add(barricade);
    });

    // 2. Heavy Segmented Barrel Vault Ribbed Arches
    const vaultRadius = 4.0;
    const ribCount = 6;
    for (let r = 0; r < ribCount; r++) {
      const z = -length / 2 + (r / (ribCount - 1)) * length;
      const ribCurve = new THREE.EllipseCurve(0, 0, vaultRadius, vaultRadius * 0.78, 0, Math.PI, false);
      const pts = ribCurve.getPoints(20);
      const ribGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x, p.y + platHeight, z))),
        24,
        0.26,
        6,
        false
      );
      const ribMesh = new THREE.Mesh(ribGeo, concreteMat);
      ribMesh.castShadow = true;
      group.add(ribMesh);
    }

    // Transparent Glass Barrel Vault Canopy spanning the arches
    const bunkerGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x88ccff,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.85,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    const vaultCurve = new THREE.EllipseCurve(0, 0, vaultRadius + 0.06, vaultRadius * 0.78 + 0.06, 0.12 * Math.PI, 0.88 * Math.PI, false);
    const vaultPts = vaultCurve.getPoints(20);
    const vaultShape = new THREE.Shape(vaultPts);
    const vaultGeo = new THREE.ExtrudeGeometry(vaultShape, { depth: length + 0.4, bevelEnabled: false });
    vaultGeo.center();
    const bunkerGlass = new THREE.Mesh(vaultGeo, bunkerGlassMat);
    bunkerGlass.position.set(0, platHeight + vaultRadius * 0.38, 0);
    group.add(bunkerGlass);

    // 3. Overhead Catenary Cable Gantries & Fluorescent Strip Lighting
    const gantryCount = 3;
    for (let g = 0; g < gantryCount; g++) {
      const z = -length * 0.35 + g * length * 0.35;

      // Cross gantry steel frame
      const gantryBeam = new THREE.Mesh(new THREE.BoxGeometry(platXOffset * 2 + 0.8, 0.15, 0.15), gantryMat);
      gantryBeam.position.set(0, platHeight + 3.2, z);
      group.add(gantryBeam);

      // Fluorescent Light Fixture
      const lightFix = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.2), whiteFluorMat);
      lightFix.position.set(0, platHeight + 3.08, z);
      group.add(lightFix);
    }

    // Signboard (Military / Bunker Stenciled Sign)
    this.#addStationSignboard(group, 'CENTRAL CAVERN VAULT', 0xe67e22, length / 2 + 0.1, platHeight + 3.0);
  }

  // =========================================================================
  // HELPER: STATION SIGNBOARD
  // =========================================================================
  #addStationSignboard(group, stationName, accentColor, zPos, yPos) {
    const boardGroup = new THREE.Group();
    boardGroup.position.set(0, yPos, zPos);

    // Background Frame
    const frameGeo = new THREE.BoxGeometry(3.6, 0.75, 0.12);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1e272e, roughness: 0.3, metalness: 0.8 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    boardGroup.add(frame);

    // Accent Color Border
    const borderGeo = new THREE.BoxGeometry(3.4, 0.58, 0.14);
    const borderMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.2, metalness: 0.5 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    boardGroup.add(border);

    // Text Canvas Texture for Station Name
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e272e';
    ctx.fillRect(0, 0, 512, 128);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(stationName, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    const signGeo = new THREE.PlaneGeometry(3.2, 0.48);
    const signMat = new THREE.MeshBasicMaterial({ map: texture });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, 0, 0.08);
    boardGroup.add(signMesh);

    group.add(boardGroup);
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
