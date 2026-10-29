/**
 * ThreeUndergroundStationBuilder.js
 * 🚇 Hybrid 2-Tier Underground Metro Station Architecture:
 * 
 * 1. SURFACE LEVEL (ज़मीन के ऊपर):
 *    - Modern Transparent Glass Entrance Pavilion (फुल ट्रांसपेरेंट ग्लास शेड)
 *    - Accurately matching the architectural reference drawing (media_1793128282191_8352dcde.png):
 *      * Sweeping curved sloped roof ("curve me cut le kar dhalan li hui hai")
 *      * Rotated 90° so the entrance faces perpendicular to the metro line (towards the street/sidewalk)
 *      * Raked structural steel entrance columns and line-colored portal header
 *      * Dual commercial transit escalators & stairs descending from ground down to subterranean depth
 * 
 * 2. SUBTERRANEAN LEVEL (ज़मीन के नीचे):
 *    - Seamlessly connects with the descending stairs/escalators
 *    - 5 Distinct Architectural Platform Styles (Switchable via UI Menu):
 *      0. MODERN_DMRC_OPENCUT: Precast modular platform slabs, glass railings, safety line, LED signage
 *      1. COC_QUARRY_DEPOT: Rustic timber beams, chiseled quarry stones, rope balustrades, braziers
 *      2. CYBERPUNK_TRENCH: Carbon titanium slabs, glowing cyan/pink neon stripes, holographic displays
 *      3. HERITAGE_BAOLI_GHAT: Ancient Indian stepwell (Baoli) red sandstone steps, carved arches, jali screens
 *      4. INDUSTRIAL_SUB_DOCK: Heavy concrete docks, hazard-striped edge slabs, industrial high-mast floodlights
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
  #streetPavilions = [];
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

  #buildStyleGroup(group, styleIndex, item = null) {
    const subGroup = new THREE.Group();
    subGroup.name = "Subterranean_Platform_Level";

    // Build the selected subterranean platform design (at track level Y = 0)
    switch (styleIndex) {
      case UG_STATION_STYLES.MODERN_DMRC_OPENCUT:
        this.#buildModernOpencut(subGroup);
        break;
      case UG_STATION_STYLES.COC_QUARRY_DEPOT:
        this.#buildCoCQuarryDepot(subGroup);
        break;
      case UG_STATION_STYLES.CYBERPUNK_TRENCH:
        this.#buildCyberpunkTrench(subGroup);
        break;
      case UG_STATION_STYLES.HERITAGE_BAOLI_GHAT:
        this.#buildHeritageBaoliGhat(subGroup);
        break;
      case UG_STATION_STYLES.INDUSTRIAL_SUB_DOCK:
        this.#buildIndustrialSubDock(subGroup);
        break;
      default:
        this.#buildModernOpencut(subGroup);
    }
    group.add(subGroup);

    // Build the Modern Glass Entrance Pavilion at surface level (rotated 90 degrees)
    // Relative to station position (which is at Y = item.pos.y, e.g. -3.5 to -4.53),
    // ground surface is at groundY = -item.pos.y
    const posY = item?.pos?.y != null ? item.pos.y : this.#position.y;
    const groundY = posY < 0 ? -posY : 3.5;

    this.#buildModernGlassPavilion(group, {
      groundY,
      xOffset: 3.2,
      zOffset: 0.0,
      item
    });
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

    if (this.#stationsList.length > 0) {
      this.buildAllStations(this.#stationsList, styleIndex);
    }

    return group;
  }

  /**
   * Builds and places authentic 2-tier underground stations across ALL subterranean station coordinates.
   */
  buildAllStations(stationsList, styleIndex = this.#currentStyle) {
    this.#currentStyle = styleIndex;
    this.#stationsList = stationsList;

    if (this.#multiStationsGroup) {
      this.#scene.remove(this.#multiStationsGroup);
      this.#disposeGroup(this.#multiStationsGroup);
      this.#multiStationsGroup = null;
    }

    if (!stationsList || stationsList.length === 0) return null;

    const masterGroup = new THREE.Group();
    masterGroup.name = "UndergroundStations_MasterGroup";
    const placedPositions = [];

    for (const item of stationsList) {
      // Deduplicate overlapping stations at interchange junctions
      if (placedPositions.some(p => Math.hypot(p.x - item.pos.x, p.z - item.pos.z) < 6.0)) {
        continue;
      }
      placedPositions.push(item.pos);

      const stationGroup = new THREE.Group();
      stationGroup.position.copy(item.pos);
      stationGroup.rotation.y = item.rotationY || 0;
      stationGroup.userData = { id: item.id, status: item.status || 'operational', item };

      this.#buildStyleGroup(stationGroup, styleIndex, item);

      masterGroup.add(stationGroup);
    }

    masterGroup.visible = this.#isVisible;
    this.#multiStationsGroup = masterGroup;
    this.#scene.add(masterGroup);
    return masterGroup;
  }

  // =========================================================================
  // 1. SURFACE LEVEL: MODERN GLASS ENTRANCE PAVILION (Rotated 90° to Line)
  // =========================================================================
  #buildModernGlassPavilion(group, { groundY = 3.5, xOffset = 3.2, zOffset = 0.0, item = null } = {}) {
    const pavilion = new THREE.Group();
    pavilion.name = "StreetEntrancePavilion_Glass";

    // Overall Pavilion Dimensions
    const width = 4.4;      // Pavilion width across the entrance
    const length = 7.6;     // Total length from front to back
    const frontOverhang = 1.2; // Forward cantilever overhang at front
    const hFront = 3.2;     // Height at front entrance (above plinth)
    const hRear = 1.55;     // Height at rear wall (above plinth)
    const plinthH = 0.38;   // Street granite plinth height
    const baseWallH = 0.55; // Low side concrete/granite dado wall

    // Position at ground surface, shifted slightly to the platform side
    pavilion.position.set(xOffset, groundY, zOffset);
    // 🔄 90° Rotation: Makes entrance face perpendicular to line (towards street/sidewalk)
    pavilion.rotation.y = Math.PI / 2;

    // Resolve Line Color for Portal Accent
    let accentColor = 0xf1c40f; // Default Yellow Line accent
    if (item?.st?.lines) {
      const lineStr = String(item.st.lines[0] || '').toLowerCase();
      if (lineStr.includes('red')) accentColor = 0xd63031;
      else if (lineStr.includes('blue')) accentColor = 0x0984e3;
      else if (lineStr.includes('green')) accentColor = 0x2ecc71;
      else if (lineStr.includes('violet') || lineStr.includes('purple')) accentColor = 0x8e44ad;
      else if (lineStr.includes('magenta') || lineStr.includes('pink')) accentColor = 0xe84393;
      else if (lineStr.includes('orange') || lineStr.includes('airport')) accentColor = 0xe67e22;
      else if (lineStr.includes('yellow')) accentColor = 0xf1c40f;
    }

    // Materials Palette: Light, Clean, Crystal Clear (Never black!)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xb3e5fc,
      transparent: true,
      opacity: 0.45,
      roughness: 0.08,
      metalness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x5a6572,
      roughness: 0.35,
      metalness: 0.65
    });

    const graniteMat = new THREE.MeshStandardMaterial({
      color: 0xd6d0c4,
      roughness: 0.65,
      metalness: 0.05
    });

    const darkCurbMat = new THREE.MeshStandardMaterial({
      color: 0x9e978e,
      roughness: 0.8
    });

    const linePortalMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.3,
      metalness: 0.4
    });

    const warmLightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffe6a3,
      emissiveIntensity: 0.95
    });

    const escalatorTrussMat = new THREE.MeshStandardMaterial({
      color: 0x474e56,
      roughness: 0.3,
      metalness: 0.7
    });

    const rubberHandrailMat = new THREE.MeshStandardMaterial({
      color: 0x1f2429,
      roughness: 0.85
    });

    const stepTreadMat = new THREE.MeshStandardMaterial({
      color: 0xbdc3c7,
      roughness: 0.4,
      metalness: 0.5
    });

    // 1. Street Granite Plinth & Aperture
    const plinthGroup = new THREE.Group();
    const curbThickness = 0.35;
    [-width / 2 + curbThickness / 2, width / 2 - curbThickness / 2].forEach(x => {
      const sideCurb = new THREE.Mesh(
        new THREE.BoxGeometry(curbThickness, plinthH + baseWallH, length),
        graniteMat
      );
      sideCurb.position.set(x, (plinthH + baseWallH) / 2, 0);
      plinthGroup.add(sideCurb);
    });

    const rearCurb = new THREE.Mesh(
      new THREE.BoxGeometry(width, plinthH + baseWallH, curbThickness),
      graniteMat
    );
    rearCurb.position.set(0, (plinthH + baseWallH) / 2, -length / 2 + curbThickness / 2);
    plinthGroup.add(rearCurb);

    const frontApron = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.6, plinthH, 1.2),
      darkCurbMat
    );
    frontApron.position.set(0, plinthH / 2, length / 2 + 0.6);
    plinthGroup.add(frontApron);

    pavilion.add(plinthGroup);

    // 2. Curved Sloped Roof ("Curve me cut le kar dhalan")
    const zFront = length / 2;
    const zTip = zFront + frontOverhang;
    const roofSegments = 16;
    const roofCurvePoints = [];

    const getRoofY = (z) => {
      if (z >= zFront) {
        const t = (z - zFront) / frontOverhang;
        return hFront + 0.15 * Math.sin(t * Math.PI * 0.5);
      } else {
        const u = Math.max(0, Math.min(1, (zFront - z) / length));
        return hFront - (hFront - hRear) * Math.pow(u, 1.25);
      }
    };

    roofCurvePoints.push({ z: zTip, y: getRoofY(zTip) });
    for (let i = 0; i <= roofSegments; i++) {
      const z = zFront - (i / roofSegments) * length;
      roofCurvePoints.push({ z, y: getRoofY(z) });
    }

    const roofWidth = width + 0.35;
    const roofPositions = [];
    const roofUvs = [];
    const roofIndices = [];

    const numPts = roofCurvePoints.length;
    for (let i = 0; i < numPts; i++) {
      const pt = roofCurvePoints[i];
      const yWorld = plinthH + pt.y;

      roofPositions.push(-roofWidth / 2, yWorld, pt.z);
      roofUvs.push(0, i / (numPts - 1));

      roofPositions.push(roofWidth / 2, yWorld, pt.z);
      roofUvs.push(1, i / (numPts - 1));

      if (i < numPts - 1) {
        const v0 = i * 2;
        const v1 = i * 2 + 1;
        const v2 = (i + 1) * 2;
        const v3 = (i + 1) * 2 + 1;
        roofIndices.push(v0, v1, v2);
        roofIndices.push(v1, v3, v2);
      }
    }

    const roofGeo = new THREE.BufferGeometry();
    roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofPositions, 3));
    roofGeo.setAttribute('uv', new THREE.Float32BufferAttribute(roofUvs, 2));
    roofGeo.setIndex(roofIndices);
    roofGeo.computeVertexNormals();

    const glassRoofMesh = new THREE.Mesh(roofGeo, glassMat);
    pavilion.add(glassRoofMesh);

    // Curved Fascia Beams
    [-roofWidth / 2, roofWidth / 2].forEach(x => {
      const beamPts = roofCurvePoints.map(p => new THREE.Vector3(x, plinthH + p.y, p.z));
      const beamCurve = new THREE.CatmullRomCurve3(beamPts);
      const beamGeo = new THREE.TubeGeometry(beamCurve, 24, 0.05, 8, false);
      const beamMesh = new THREE.Mesh(beamGeo, steelMat);
      pavilion.add(beamMesh);
    });

    const tipPt = roofCurvePoints[0];
    const frontEavesBar = new THREE.Mesh(new THREE.BoxGeometry(roofWidth + 0.08, 0.12, 0.12), steelMat);
    frontEavesBar.position.set(0, plinthH + tipPt.y, tipPt.z);
    pavilion.add(frontEavesBar);

    const rearPt = roofCurvePoints[roofCurvePoints.length - 1];
    const rearEavesBar = new THREE.Mesh(new THREE.BoxGeometry(roofWidth + 0.08, 0.10, 0.10), steelMat);
    rearEavesBar.position.set(0, plinthH + rearPt.y, rearPt.z);
    pavilion.add(rearEavesBar);

    // Transverse Rafters & Interior LED Lighting
    const numRafters = 6;
    for (let r = 0; r <= numRafters; r++) {
      const zRafter = zFront - (r / numRafters) * length;
      const yRafter = plinthH + getRoofY(zRafter);

      const rafter = new THREE.Mesh(new THREE.BoxGeometry(roofWidth - 0.05, 0.06, 0.06), steelMat);
      rafter.position.set(0, yRafter - 0.03, zRafter);
      pavilion.add(rafter);

      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(roofWidth - 0.6, 0.02, 0.04), warmLightMat);
      ledStrip.position.set(0, yRafter - 0.07, zRafter);
      pavilion.add(ledStrip);
    }

    // 3. Side Transparent Glass Curtain Walls
    const numGlassBays = 6;
    const baySpacing = length / numGlassBays;

    [-width / 2, width / 2].forEach(x => {
      for (let b = 0; b < numGlassBays; b++) {
        const z0 = zFront - b * baySpacing;
        const z1 = zFront - (b + 1) * baySpacing;
        const zMid = (z0 + z1) / 2;

        const yBottom = plinthH + baseWallH;
        const yTop = plinthH + getRoofY(zMid);
        const glassHeight = Math.max(0.2, yTop - yBottom);

        const glassPane = new THREE.Mesh(new THREE.BoxGeometry(0.03, glassHeight, baySpacing - 0.05), glassMat);
        glassPane.position.set(x, yBottom + glassHeight / 2, zMid);
        pavilion.add(glassPane);

        const transom = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, baySpacing), steelMat);
        transom.position.set(x, yBottom + glassHeight * 0.45, zMid);
        pavilion.add(transom);

        const mullionH = Math.max(0.2, (plinthH + getRoofY(z1)) - yBottom);
        const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.06, mullionH, 0.06), steelMat);
        mullion.position.set(x, yBottom + mullionH / 2, z1);
        pavilion.add(mullion);
      }
    });

    // Rear Glass Wall
    const rearYBottom = plinthH + baseWallH;
    const rearYTop = plinthH + hRear;
    const rearGlassH = Math.max(0.2, rearYTop - rearYBottom);
    const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(width - curbThickness * 2, rearGlassH, 0.03), glassMat);
    rearGlass.position.set(0, rearYBottom + rearGlassH / 2, -length / 2 + curbThickness / 2);
    pavilion.add(rearGlass);

    // 4. Front Entrance Portal & Raked Columns
    [-width / 2 + 0.15, width / 2 - 0.15].forEach(x => {
      const pBase = new THREE.Vector3(x, plinthH + baseWallH, zFront);
      const pTop = new THREE.Vector3(x, plinthH + getRoofY(zTip - 0.2), zTip - 0.2);
      const pillarCurve = new THREE.LineCurve3(pBase, pTop);
      const pillarGeo = new THREE.TubeGeometry(pillarCurve, 4, 0.07, 8, false);
      const pillarMesh = new THREE.Mesh(pillarGeo, steelMat);
      pavilion.add(pillarMesh);
    });

    const portalBar = new THREE.Mesh(new THREE.BoxGeometry(width - 0.2, 0.28, 0.12), linePortalMat);
    portalBar.position.set(0, plinthH + hFront - 0.14, zFront + 0.1);
    pavilion.add(portalBar);

    const signPlate = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    signPlate.position.set(0, plinthH + hFront - 0.14, zFront + 0.18);
    pavilion.add(signPlate);

    // 5. Descending Dual Escalators & Stairs into Ground
    const escDepth = groundY; // Descends smoothly all the way down to subterranean track level!
    const escLength = 5.6;
    const escWidth = 0.95;

    [-0.75, 0.75].forEach(escX => {
      this.#buildEscalatorPair(pavilion, {
        topX: escX,
        topY: plinthH,
        topZ: zFront - 0.8,
        botY: -escDepth + 0.45,
        botZ: zFront - 0.8 - escLength,
        width: escWidth,
        trussMat: escalatorTrussMat,
        stepMat: stepTreadMat,
        glassMat,
        handrailMat: rubberHandrailMat
      });
    });

    group.add(pavilion);
    this.#streetPavilions.push(pavilion);
  }

  #buildEscalatorPair(group, { topX, topY, topZ, botY, botZ, width, trussMat, stepMat, glassMat, handrailMat }) {
    const escGroup = new THREE.Group();
    const heightDiff = topY - botY;
    const runZ = topZ - botZ;
    const slopeAngle = Math.atan2(heightDiff, runZ);
    const diagonalLen = Math.hypot(heightDiff, runZ);

    const truss = new THREE.Mesh(new THREE.BoxGeometry(width, 0.35, diagonalLen), trussMat);
    truss.position.set(topX, botY + heightDiff / 2, botZ + runZ / 2);
    truss.rotation.x = slopeAngle;
    escGroup.add(truss);

    const numSteps = 16;
    for (let s = 0; s < numSteps; s++) {
      const frac = s / numSteps;
      const step = new THREE.Mesh(new THREE.BoxGeometry(width - 0.12, heightDiff / numSteps, runZ / numSteps), stepMat);
      step.position.set(topX, botY + frac * heightDiff + (heightDiff / numSteps) / 2, botZ + frac * runZ + (runZ / numSteps) / 2);
      escGroup.add(step);
    }

    [-width / 2 + 0.03, width / 2 - 0.03].forEach(bx => {
      const balustrade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.70, diagonalLen), glassMat);
      balustrade.position.set(topX + bx, botY + heightDiff / 2 + 0.38, botZ + runZ / 2);
      balustrade.rotation.x = slopeAngle;
      escGroup.add(balustrade);

      const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, diagonalLen + 0.1), handrailMat);
      handrail.position.set(topX + bx, botY + heightDiff / 2 + 0.74, botZ + runZ / 2);
      handrail.rotation.x = slopeAngle;
      escGroup.add(handrail);
    });

    group.add(escGroup);
  }

  // =========================================================================
  // SUBTERRANEAN DESIGN 0: MODERN DMRC OPEN-CUT PLATFORM
  // =========================================================================
  #buildModernOpencut(group) {
    const platWidth = 2.4;
    const platHeight = 0.45;
    const platBaseX = 1.25 + platWidth / 2;

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

      const tactile = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.02, slabLength - 0.04), safetyYellow);
      tactile.position.set(-platWidth / 2 + 0.14, platHeight / 2 + 0.01, 0);
      slab.add(tactile);

      const glass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, slabLength - 0.04), glassMat);
      glass.position.set(-platWidth / 2 + 0.04, platHeight / 2 + 0.525, 0);
      slab.add(glass);

      const handrail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, slabLength - 0.04), steelMat);
      handrail.position.set(-platWidth / 2 + 0.04, platHeight / 2 + 1.05, 0);
      slab.add(handrail);

      const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.1, 0.08), steelMat);
      post.position.set(-platWidth / 2 + 0.04, platHeight / 2 + 0.55, -slabLength / 2 + 0.05);
      slab.add(post);

      if (k === 1 || k === 4 || k === 6) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.2, 8), steelMat);
        pole.position.set(platWidth / 2 - 0.25, platHeight / 2 + 1.6, 0);
        slab.add(pole);

        const lampHead = new THREE.Mesh(
          new THREE.BoxGeometry(0.6, 0.1, 0.25),
          new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 1.0 })
        );
        lampHead.position.set(platWidth / 2 - 0.55, platHeight / 2 + 3.15, 0);
        slab.add(lampHead);
      }

      if (k === 2 || k === 5) {
        const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 1.4), steelMat);
        bench.position.set(0.35, platHeight / 2 + 0.2, 0);
        slab.add(bench);
      }

      group.add(slab);
    }

    this.#addSideSignboard(group, 'CHAWRI BAZAR (SUBTERRANEAN)', 0x0984e3, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // SUBTERRANEAN DESIGN 1: CLASH OF CLANS SUNKEN QUARRY DEPOT
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

      const woodEdge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, slabLength - 0.04), woodMat);
      woodEdge.position.set(-platWidth / 2 + 0.1, platHeight / 2 + 0.04, 0);
      slab.add(woodEdge);

      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.95, 6), woodMat);
      post.position.set(-platWidth / 2 + 0.1, platHeight / 2 + 0.475, 0);
      slab.add(post);

      [0.4, 0.8].forEach((yOff) => {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, slabLength - 0.04, 6), ropeMat);
        rope.rotation.x = Math.PI / 2;
        rope.position.set(-platWidth / 2 + 0.1, platHeight / 2 + yOff, 0);
        slab.add(rope);
      });

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

      if (k === 3) {
        const crate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), woodMat);
        crate.position.set(0.4, platHeight / 2 + 0.325, 0);
        slab.add(crate);
      }

      group.add(slab);
    }

    this.#addSideSignboard(group, 'CANYON QUARRY DEPOT', 0xd35400, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // SUBTERRANEAN DESIGN 2: CYBERPUNK SKYWAY TRENCH
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

      const floorStrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, slabLength - 0.04), neonCyan);
      floorStrip.position.set(-0.2, platHeight / 2 + 0.01, 0);
      slab.add(floorStrip);

      const emitter = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.85, 0.1), carbonMat);
      emitter.position.set(-platWidth / 2 + 0.06, platHeight / 2 + 0.425, 0);
      slab.add(emitter);

      [0.35, 0.7].forEach((yOff) => {
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, slabLength - 0.04, 8), laserOrange);
        beam.rotation.x = Math.PI / 2;
        beam.position.set(-platWidth / 2 + 0.06, platHeight / 2 + yOff, 0);
        slab.add(beam);
      });

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

    this.#addSideSignboard(group, 'NEO-DELHI DOCK-01', 0x00f0ff, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // SUBTERRANEAN DESIGN 3: ROYAL HERITAGE BAOLI GHAT
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

      const upperStep = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, slabLength - 0.04), redSandstoneMat);
      upperStep.position.set(platWidth / 2 - 0.4, platHeight / 2 + 0.175, 0);
      slab.add(upperStep);

      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.85, 8), redSandstoneMat);
      pillar.position.set(-platWidth / 2 + 0.08, platHeight / 2 + 0.425, 0);
      slab.add(pillar);

      const jali = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.65, slabLength - 0.1), jaliMat);
      jali.position.set(-platWidth / 2 + 0.08, platHeight / 2 + 0.425, 0);
      slab.add(jali);

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

    this.#addSideSignboard(group, 'PURANA QILA (OPEN GHAT)', 0xd4af37, platBaseX + 0.6, platHeight + 2.2, 0);
  }

  // =========================================================================
  // SUBTERRANEAN DESIGN 4: INDUSTRIAL SUB-DOCK
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

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, slabLength - 0.04), k % 2 === 0 ? safetyYellow : hazardBlack);
      stripe.position.set(-platWidth / 2 + 0.1, platHeight / 2 + 0.01, 0);
      slab.add(stripe);

      const cage = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.95, slabLength - 0.04), safetyYellow);
      cage.position.set(-platWidth / 2 + 0.06, platHeight / 2 + 0.475, 0);
      slab.add(cage);

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

    this.#addSideSignboard(group, 'SECTOR-7 (OPEN DOCK)', 0xf1c40f, platBaseX + 0.6, platHeight + 2.2, 0);
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

  toggleGlassCanopy(visible) {
    this.#showGlassCanopy = typeof visible === 'boolean' ? visible : !this.#showGlassCanopy;
    for (const pav of this.#streetPavilions) {
      pav.visible = this.#showGlassCanopy;
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
      this.#multiStationsGroup.children.forEach((child) => {
        if (child.userData?.status === status) {
          child.visible = visible;
        }
      });
    }
  }

  dispose() {
    if (this.#currentGroup) {
      this.#scene.remove(this.#currentGroup);
      this.#disposeGroup(this.#currentGroup);
      this.#currentGroup = null;
    }
    if (this.#multiStationsGroup) {
      this.#scene.remove(this.#multiStationsGroup);
      this.#disposeGroup(this.#multiStationsGroup);
      this.#multiStationsGroup = null;
    }
    this.#streetPavilions = [];
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
