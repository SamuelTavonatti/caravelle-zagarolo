import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Caravelle3DStageProps {
  doorPhase: 'closed' | 'sliding' | 'overhead';
  onDoorClick: () => void;
  onDoorHoverChange: (hovered: boolean) => void;
}

/** Soft dark ambient-occlusion contact shadow directly under the LWB Caravelle T5 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);
    const grad = ctx.createRadialGradient(256, 128, 30, 256, 128, 232);
    grad.addColorStop(0, 'rgba(0,0,0,0.95)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.74)');
    grad.addColorStop(0.84, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Cool azure-blue (#0EA5E9 / #38BDF8) radial focus spotlight pool on dark satin floor */
function createAzureSpotlightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const grad = ctx.createRadialGradient(256, 256, 12, 256, 256, 248);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
    grad.addColorStop(0.36, 'rgba(14, 165, 233, 0.18)');
    grad.addColorStop(0.7, 'rgba(2, 132, 199, 0.06)');
    grad.addColorStop(1, 'rgba(9, 9, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Subtle satin studio floor roughness texture */
function createStudioFloorRoughness(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#8e8e8e';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(110 + Math.random() * 62);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}

/** Rounded rectangle Path for flush recessed window cutouts */
function makeRoundedRectPath(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number
): THREE.Path {
  const p = new THREE.Path();
  p.moveTo(x0 + r, y0);
  p.lineTo(x1 - r, y0);
  p.quadraticCurveTo(x1, y0, x1, y0 + r);
  p.lineTo(x1, y1 - r);
  p.quadraticCurveTo(x1, y1, x1 - r, y1);
  p.lineTo(x0 + r, y1);
  p.quadraticCurveTo(x0, y1, x0, y1 - r);
  p.lineTo(x0, y0 + r);
  p.quadraticCurveTo(x0, y0, x0 + r, y0);
  return p;
}

/**
 * Sculpted 2008 Volkswagen Caravelle T5 Long-Wheelbase (1:1 real-world meters)
 * Length: 5.29m (x ∈ [-2.64, +2.65]) | Wheelbase: 3.40m (rear -1.60, front +1.80)
 * Height: 1.96m | Width: 1.90m (z ∈ [-0.95, +0.95])
 * Nose pointing strictly RIGHT (+X), Rear LEFT (-X), Right Sliding Door facing CAMERA (+Z).
 */
function buildCaravelleT5LWB(): {
  vanGroup: THREE.Group;
  slidingDoorGroup: THREE.Group;
  doorHitTargets: THREE.Object3D[];
  doorHandleHighlightMat: THREE.MeshStandardMaterial;
  cabinLight: THREE.PointLight;
} {
  const vanGroup = new THREE.Group();

  // =========================================================================
  // AUTOMOTIVE PHYSICAL MATERIALS
  // =========================================================================
  const whitePaint = new THREE.MeshPhysicalMaterial({
    color: 0xeef2f6,
    roughness: 0.18,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  const swageHighlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xdbe3ec,
    roughness: 0.24,
    metalness: 0.14,
    clearcoat: 0.85,
  });

  const bumperMat = new THREE.MeshPhysicalMaterial({
    color: 0x1b1f27,
    roughness: 0.5,
    metalness: 0.14,
    clearcoat: 0.22,
  });

  const gasketMat = new THREE.MeshStandardMaterial({
    color: 0x0e1116,
    roughness: 0.72,
    metalness: 0.1,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.12,
    metalness: 0.94,
  });

  // Flush, seamless deep azure-tinted automotive glass (#1E3A5F + #38BDF8 rim sheen)
  const azureGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1e3a5f,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.09,
    roughness: 0.08,
    metalness: 0.28,
    transparent: true,
    opacity: 0.8,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const clearHeadlightGlass = new THREE.MeshPhysicalMaterial({
    color: 0xf8fafc,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.55,
    roughness: 0.05,
    metalness: 0.15,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.92,
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    roughness: 0.2,
  });

  const tailLightMat = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.72,
    roughness: 0.16,
    clearcoat: 0.9,
  });

  const interiorDark = new THREE.MeshStandardMaterial({
    color: 0x101319,
    roughness: 0.9,
    metalness: 0.04,
  });

  const seatFabric = new THREE.MeshStandardMaterial({
    color: 0x2b3340,
    roughness: 0.84,
    metalness: 0.05,
  });

  const doorHandleHighlightMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  // =========================================================================
  // 1. EXACT T5 LWB SIDE SILHOUETTE SHAPES (Real Wheel Arches + Flush Window Holes)
  // Rear wheel center: x = -1.60, y = 0.36, arch r = 0.435
  // Front wheel center: x = +1.80, y = 0.36, arch r = 0.435
  // =========================================================================
  const buildRearQuarterShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-2.56, 0.31);
    s.quadraticCurveTo(-2.64, 0.34, -2.63, 0.56);
    s.lineTo(-2.57, 1.72);
    s.quadraticCurveTo(-2.53, 1.91, -2.32, 1.93);
    s.lineTo(-0.54, 1.93);
    s.lineTo(-0.54, 0.29);
    // Flared semicircular rear wheel arch cutout
    s.lineTo(-1.165, 0.29);
    s.absarc(-1.6, 0.36, 0.435, -0.14, Math.PI + 0.14, false);
    s.lineTo(-2.56, 0.31);

    // Long LWB rear quarter window hole (strictly inside C and D pillars)
    s.holes.push(makeRoundedRectPath(-2.42, 1.13, -0.7, 1.79, 0.055));
    return s;
  };

  const buildSlidingDoorShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.53, 0.3);
    s.lineTo(0.65, 0.3);
    s.lineTo(0.65, 1.9);
    s.lineTo(-0.53, 1.9);
    s.lineTo(-0.53, 0.3);

    // Wide sliding-door window hole (strictly inside B and C pillars)
    s.holes.push(makeRoundedRectPath(-0.44, 1.13, 0.56, 1.79, 0.05));
    return s;
  };

  const buildFrontCabShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0.66, 0.29);
    s.lineTo(0.66, 1.93);
    // Smooth roofline flowing into ~42° raked T5 windshield
    s.lineTo(1.22, 1.93);
    s.quadraticCurveTo(1.36, 1.92, 1.46, 1.81);
    s.lineTo(1.98, 1.17);
    // Short, rounded T5 hood curving seamlessly into sculpted front nose
    s.quadraticCurveTo(2.34, 1.09, 2.55, 0.96);
    s.quadraticCurveTo(2.65, 0.88, 2.65, 0.72);
    s.lineTo(2.63, 0.4);
    s.quadraticCurveTo(2.61, 0.29, 2.46, 0.29);
    // Flared semicircular front wheel arch cutout
    s.lineTo(2.235, 0.29);
    s.absarc(1.8, 0.36, 0.435, -0.14, Math.PI + 0.14, false);
    s.lineTo(0.66, 0.29);

    // Angled front cab window hole (matching the ~42° A-pillar rake, strictly inside frame)
    const cabWin = new THREE.Path();
    cabWin.moveTo(0.81, 1.13);
    cabWin.lineTo(1.78, 1.13);
    cabWin.quadraticCurveTo(1.83, 1.13, 1.8, 1.19);
    cabWin.lineTo(1.36, 1.74);
    cabWin.quadraticCurveTo(1.32, 1.79, 1.24, 1.79);
    cabWin.lineTo(0.81, 1.79);
    cabWin.quadraticCurveTo(0.75, 1.79, 0.75, 1.73);
    cabWin.lineTo(0.75, 1.19);
    cabWin.quadraticCurveTo(0.75, 1.13, 0.81, 1.13);
    s.holes.push(cabWin);

    return s;
  };

  // Smooth automotive bevel extrusion (bevelSegments: 8, curveSegments: 32)
  const panelExtrudeOpts: THREE.ExtrudeGeometryOptions = {
    depth: 0.055,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.024,
    bevelSegments: 8,
    curveSegments: 32,
  };

  // Helper to build a black rubber gasket + flush recessed azure window strictly inside the body
  const addFlushWindow = (
    parent: THREE.Object3D,
    shape: THREE.Shape,
    zCenter: number
  ) => {
    const glass = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.016, bevelEnabled: false }),
      azureGlass
    );
    glass.position.z = zCenter - 0.008;
    parent.add(glass);
  };

  const makeRectShape = (x0: number, y0: number, x1: number, y1: number) => {
    const s = new THREE.Shape();
    s.moveTo(x0, y0);
    s.lineTo(x1, y0);
    s.lineTo(x1, y1);
    s.lineTo(x0, y1);
    s.closePath();
    return s;
  };

  const rearWinShape = makeRectShape(-2.45, 1.11, -0.67, 1.81);
  const doorWinShape = makeRectShape(-0.46, 1.11, 0.58, 1.81);
  const cabWinShape = new THREE.Shape();
  cabWinShape.moveTo(0.73, 1.11);
  cabWinShape.lineTo(1.84, 1.11);
  cabWinShape.lineTo(1.36, 1.81);
  cabWinShape.lineTo(0.73, 1.81);
  cabWinShape.closePath();

  // --- RIGHT SIDE (CAMERA SIDE, outer bevel at z ≈ +0.935, flush recessed glass at z = +0.865) ---
  const rightRearPanel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildRearQuarterShape(), panelExtrudeOpts),
    whitePaint
  );
  rightRearPanel.position.z = 0.85;
  rightRearPanel.castShadow = true;
  rightRearPanel.receiveShadow = true;
  vanGroup.add(rightRearPanel);

  const rightFrontPanel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildFrontCabShape(), panelExtrudeOpts),
    whitePaint
  );
  rightFrontPanel.position.z = 0.85;
  rightFrontPanel.castShadow = true;
  rightFrontPanel.receiveShadow = true;
  vanGroup.add(rightFrontPanel);

  // Recessed black rubber window gaskets & flush deep azure glass
  addFlushWindow(vanGroup, rearWinShape, 0.865);
  addFlushWindow(vanGroup, cabWinShape, 0.865);

  // Subtle dark rubber surround frames tucked strictly inside window edges
  const rearGasket = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.025, 0.022), gasketMat);
  rearGasket.position.set(-1.56, 1.125, 0.875);
  vanGroup.add(rearGasket);

  // Recessed sliding-door track groove running from C-pillar toward vertical red rear taillight
  const trackGroove = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.036, 0.02), gasketMat);
  trackGroove.position.set(-1.53, 1.04, 0.935);
  vanGroup.add(trackGroove);

  // Subtle body-side swage crease at door-handle height
  const frontSwage = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.018, 0.016), swageHighlightMat);
  frontSwage.position.set(1.58, 0.97, 0.938);
  vanGroup.add(frontSwage);

  // Front right door handle
  const frontHandle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.036, 0.032), whitePaint);
  frontHandle.position.set(0.84, 0.97, 0.946);
  vanGroup.add(frontHandle);

  // --- LEFT SIDE (OPPOSITE SIDE, z = -0.905) ---
  const leftRearPanel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildRearQuarterShape(), panelExtrudeOpts),
    whitePaint
  );
  leftRearPanel.position.z = -0.905;
  leftRearPanel.castShadow = true;
  vanGroup.add(leftRearPanel);

  const leftMidPanel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildSlidingDoorShape(), panelExtrudeOpts),
    whitePaint
  );
  leftMidPanel.position.z = -0.905;
  leftMidPanel.castShadow = true;
  vanGroup.add(leftMidPanel);

  const leftFrontPanel = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildFrontCabShape(), panelExtrudeOpts),
    whitePaint
  );
  leftFrontPanel.position.z = -0.905;
  leftFrontPanel.castShadow = true;
  vanGroup.add(leftFrontPanel);

  addFlushWindow(vanGroup, rearWinShape, -0.865);
  addFlushWindow(vanGroup, doorWinShape, -0.865);
  addFlushWindow(vanGroup, cabWinShape, -0.865);

  // =========================================================================
  // 2. SMOOTH ROUNDED ROOF, SCULPTED NOSE, FRONT BUMPER, GRILLE & HEADLIGHTS
  // =========================================================================
  // Floor pan
  const floorPan = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.1, 1.72), interiorDark);
  floorPan.position.set(0.0, 0.32, 0);
  vanGroup.add(floorPan);

  // Rounded Roof Cap spanning left-to-right with smooth bevelSegments: 8
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.36, 1.86);
  roofShape.lineTo(1.24, 1.86);
  roofShape.quadraticCurveTo(1.36, 1.88, 1.38, 1.93);
  roofShape.lineTo(1.22, 1.97);
  roofShape.lineTo(-2.34, 1.97);
  roofShape.quadraticCurveTo(-2.48, 1.95, -2.51, 1.88);
  roofShape.closePath();

  const roofMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roofShape, {
      depth: 1.74,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.042,
      bevelSegments: 8,
      curveSegments: 24,
    }),
    whitePaint
  );
  roofMesh.position.z = -0.87;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  vanGroup.add(roofMesh);

  // Sculpted Front Hood + Rounded Nose Profile
  const noseShape = new THREE.Shape();
  noseShape.moveTo(1.88, 0.34);
  noseShape.lineTo(2.44, 0.34);
  noseShape.quadraticCurveTo(2.63, 0.36, 2.64, 0.56);
  noseShape.lineTo(2.64, 0.74);
  noseShape.quadraticCurveTo(2.62, 0.91, 2.48, 0.98);
  noseShape.quadraticCurveTo(2.22, 1.1, 1.96, 1.17);
  noseShape.lineTo(1.88, 1.14);
  noseShape.closePath();

  const noseMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(noseShape, {
      depth: 1.72,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.04,
      bevelSegments: 8,
      curveSegments: 24,
    }),
    whitePaint
  );
  noseMesh.position.z = -0.86;
  noseMesh.castShadow = true;
  noseMesh.receiveShadow = true;
  vanGroup.add(noseMesh);

  // Flush ~42° Raked Windshield (strictly recessed inside A-pillars, width 1.60 < body 1.82)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.96, 1.58), azureGlass);
  windshield.position.set(1.69, 1.51, 0);
  windshield.rotation.z = 0.68; // ~39-42 deg sleek T5 rake
  vanGroup.add(windshield);

  // Sculpted Front Bumper with Lower Grille Intake & Fog-Light Recesses
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 1.84), bumperMat);
  frontBumper.position.set(2.58, 0.36, 0);
  vanGroup.add(frontBumper);

  const lowerIntake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 1.06), gasketMat);
  lowerIntake.position.set(2.69, 0.35, 0);
  vanGroup.add(lowerIntake);

  // Upper T5 Horizontal Black Grille + Dual Chrome Slats + VW Medallion
  const upperGrille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.21, 1.12), gasketMat);
  upperGrille.position.set(2.67, 0.78, 0);
  vanGroup.add(upperGrille);

  for (const gy of [0.835, 0.73]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.02, 1.08), chromeMat);
    slat.position.set(2.68, gy, 0);
    vanGroup.add(slat);
  }

  const vwBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24), chromeMat);
  vwBadge.rotation.z = Math.PI / 2;
  vwBadge.position.set(2.7, 0.785, 0);
  vanGroup.add(vwBadge);

  // Rear Tailgate + Recessed Rear Azure Glass + Rear Bumper
  const rearLower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.78, 1.76), whitePaint);
  rearLower.position.set(-2.54, 0.71, 0);
  vanGroup.add(rearLower);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 1.54), azureGlass);
  rearGlass.position.set(-2.55, 1.46, 0);
  vanGroup.add(rearGlass);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.21, 1.84), bumperMat);
  rearBumper.position.set(-2.58, 0.35, 0);
  vanGroup.add(rearBumper);

  // Right lower rocker sill trim
  const rightSill = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.085, 0.075), bumperMat);
  rightSill.position.set(0.1, 0.29, 0.895);
  vanGroup.add(rightSill);

  // Wrap-Around Clear-Lens Headlights, Fog-Light Recesses, Vertical Taillights & Sculpted Side Mirrors
  for (const side of [-1, 1]) {
    // Wrap-around crystal headlight housing + warm LED accent
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.34), clearHeadlightGlass);
    hl.position.set(2.55, 0.8, side * 0.74);
    vanGroup.add(hl);

    // Fog-light recess in lower front bumper
    const fogHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 18), gasketMat);
    fogHousing.rotation.z = Math.PI / 2;
    fogHousing.position.set(2.69, 0.36, side * 0.68);
    vanGroup.add(fogHousing);

    const fogLens = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.056, 16), clearHeadlightGlass);
    fogLens.rotation.z = Math.PI / 2;
    fogLens.position.set(2.695, 0.36, side * 0.68);
    vanGroup.add(fogLens);

    // Side fender amber repeater
    const rep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.025, 0.02), amberMat);
    rep.position.set(2.14, 0.78, side * 0.94);
    vanGroup.add(rep);

    // Vertical red 2008 T5 Rear Taillight Cluster
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.46, 0.14), tailLightMat);
    tl.position.set(-2.6, 0.84, side * 0.85);
    vanGroup.add(tl);

    // Sculpted Aerodynamic T5 Side Mirror
    const mirrorBase = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.11), gasketMat);
    mirrorBase.position.set(1.64, 1.17, side * 0.96);
    vanGroup.add(mirrorBase);

    const mirrorCap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 20, 14), whitePaint);
    mirrorCap.scale.set(0.88, 1.08, 0.72);
    mirrorCap.position.set(1.64, 1.22, side * 1.05);
    vanGroup.add(mirrorCap);
  }

  // =========================================================================
  // 3. REAL 3D HOLLOWED-OUT CABIN INTERIOR SEATS (REVEALED WHEN DOOR OPENS)
  // =========================================================================
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 1.64), interiorDark);
  dash.position.set(1.64, 0.88, 0);
  vanGroup.add(dash);

  const steering = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 10, 24), gasketMat);
  steering.position.set(1.36, 1.06, -0.48);
  steering.rotation.y = Math.PI / 2;
  steering.rotation.x = 0.25;
  vanGroup.add(steering);

  // Subtle emerald courtesy step-in strip inside the open doorway
  const stepLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.02, 0.05),
    doorHandleHighlightMat
  );
  stepLight.position.set(0.06, 0.39, 0.81);
  vanGroup.add(stepLight);

  const addCabinSeat = (x: number, z: number, width = 0.42) => {
    const g = new THREE.Group();
    g.position.set(x, 0.41, z);
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.13, width), seatFabric);
    cushion.position.set(0, 0.13, 0);
    g.add(cushion);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.58, width), seatFabric);
    back.position.set(-0.19, 0.46, 0);
    back.rotation.z = 0.14;
    g.add(back);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, width * 0.6), seatFabric);
    headrest.position.set(-0.24, 0.84, 0);
    g.add(headrest);
    vanGroup.add(g);
  };

  // Front Row: Driver (-0.52) + center gap + F1 (+0.08) + F2 (+0.52)
  addCabinSeat(1.06, -0.52, 0.42);
  addCabinSeat(1.06, 0.08, 0.4);
  addCabinSeat(1.06, 0.52, 0.4);

  // Middle Row: M1, M2, M3 (immediately visible inside the sliding doorway)
  addCabinSeat(0.02, -0.52, 0.42);
  addCabinSeat(0.02, 0.0, 0.42);
  addCabinSeat(0.02, 0.52, 0.42);

  // Rear Row: R1, R2, R3
  addCabinSeat(-1.12, -0.52, 0.42);
  addCabinSeat(-1.12, 0.0, 0.42);
  addCabinSeat(-1.12, 0.52, 0.42);

  const cabinLight = new THREE.PointLight(0xe0f2fe, 1.4, 4.0);
  cabinLight.position.set(0.04, 1.66, 0.15);
  vanGroup.add(cabinLight);

  // =========================================================================
  // 4. INTERACTIVE 3D RIGHT-SIDE SLIDING DOOR (BEVELED + FLUSH AZURE GLASS)
  // =========================================================================
  const slidingDoorGroup = new THREE.Group();
  const doorHitTargets: THREE.Object3D[] = [];

  const doorBodyMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildSlidingDoorShape(), panelExtrudeOpts),
    whitePaint
  );
  doorBodyMesh.position.z = 0.85;
  doorBodyMesh.castShadow = true;
  doorBodyMesh.receiveShadow = true;
  slidingDoorGroup.add(doorBodyMesh);

  // Flush recessed azure sliding-door window (strictly inside white door frame)
  addFlushWindow(slidingDoorGroup, doorWinShape, 0.865);

  // Subtle horizontal swage line on sliding door + crisp shut-line seams
  const doorSwage = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.018, 0.016), swageHighlightMat);
  doorSwage.position.set(0.06, 0.97, 0.938);
  slidingDoorGroup.add(doorSwage);

  const doorSeamLeft = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.56, 0.02), gasketMat);
  doorSeamLeft.position.set(-0.535, 1.1, 0.932);
  slidingDoorGroup.add(doorSeamLeft);

  const doorSeamRight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.56, 0.02), gasketMat);
  doorSeamRight.position.set(0.655, 1.1, 0.932);
  slidingDoorGroup.add(doorSeamRight);

  // Sculpted Sliding Door Handle + Subtle Emerald Tactile Highlight
  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.038, 0.034), whitePaint);
  doorHandle.position.set(0.46, 0.97, 0.946);
  slidingDoorGroup.add(doorHandle);

  const handleAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.048, 0.018, 0.012),
    doorHandleHighlightMat
  );
  handleAccent.position.set(0.46, 0.97, 0.968);
  slidingDoorGroup.add(handleAccent);

  doorHitTargets.push(doorBodyMesh, doorHandle);
  vanGroup.add(slidingDoorGroup);

  // =========================================================================
  // 5. FOUR 5-SPOKE SILVER ALLOY WHEELS (metalness 0.85, roughness 0.22) + BRAKE DISCS
  // =========================================================================
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x0f1116,
    roughness: 0.85,
    metalness: 0.05,
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xdce3ec,
    metalness: 0.85,
    roughness: 0.22,
  });

  const brakeDiscMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    metalness: 0.72,
    roughness: 0.42,
  });

  const wheelPositions: [number, number][] = [
    [-1.6, 0.85],
    [-1.6, -0.85],
    [1.8, 0.85],
    [1.8, -0.85],
  ];

  for (const [wx, wz] of wheelPositions) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, 0.36, wz);

    // Dark recessed wheel well backing
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.16, 32), interiorDark);
    well.rotation.x = Math.PI / 2;
    well.position.z = wz > 0 ? -0.09 : 0.09;
    wheelGroup.add(well);

    // Contoured rubber tire with tread curvature
    const tireCore = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.23, 36), tireMat);
    tireCore.rotation.x = Math.PI / 2;
    tireCore.castShadow = true;
    wheelGroup.add(tireCore);

    const tireShoulder = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.06, 14, 36), tireMat);
    tireShoulder.position.z = wz > 0 ? 0.062 : -0.062;
    wheelGroup.add(tireShoulder);

    // Outer silver alloy rim lip
    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.232, 0.022, 12, 32), alloyMat);
    rimLip.position.z = wz > 0 ? 0.114 : -0.114;
    wheelGroup.add(rimLip);

    // Ventilated metallic brake disc inside the alloy wheel
    const brakeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.04, 24), brakeDiscMat);
    brakeDisc.rotation.x = Math.PI / 2;
    brakeDisc.position.z = wz > 0 ? 0.045 : -0.045;
    wheelGroup.add(brakeDisc);

    // 5-Spoke Silver Alloy Geometry
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.22, 0.036), alloyMat);
      const angle = (s * Math.PI * 2) / 5;
      spoke.position.set(Math.sin(angle) * 0.105, Math.cos(angle) * 0.105, wz > 0 ? 0.105 : -0.105);
      spoke.rotation.z = -angle;
      wheelGroup.add(spoke);
    }

    // Center hubcap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.056, 0.048, 20), chromeMat);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = wz > 0 ? 0.11 : -0.11;
    wheelGroup.add(hub);

    vanGroup.add(wheelGroup);
  }

  return { vanGroup, slidingDoorGroup, doorHitTargets, doorHandleHighlightMat, cabinLight };
}

export function Caravelle3DStage({
  doorPhase,
  onDoorClick,
  onDoorHoverChange,
}: Caravelle3DStageProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const doorPhaseRef = useRef(doorPhase);
  const onDoorClickRef = useRef(onDoorClick);
  const onDoorHoverRef = useRef(onDoorHoverChange);

  doorPhaseRef.current = doorPhase;
  onDoorClickRef.current = onDoorClick;
  onDoorHoverRef.current = onDoorHoverChange;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.02;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Dark Obsidian Studio (#09090B) + Cool Azure-Blue Focus Spotlight (#0EA5E9 / #38BDF8)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.Fog(0x09090b, 15, 36);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      75
    );

    const getIdleCameraDistance = (aspect: number) => {
      return aspect < 1 ? Math.min(22.0, 9.8 / Math.max(0.42, aspect)) : 8.7;
    };

    // Dark Satin Studio Floor
    const roughnessTex = createStudioFloorRoughness();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0e,
      roughness: 0.56,
      roughnessMap: roughnessTex,
      metalness: 0.24,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Cool Azure-Blue Focus Light Pool Beneath & Behind the Van (#0EA5E9 / #38BDF8)
    const azureGlowTex = createAzureSpotlightTexture();
    const azureGroundPool = new THREE.Mesh(
      new THREE.PlaneGeometry(10.6, 5.8),
      new THREE.MeshBasicMaterial({
        map: azureGlowTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    azureGroundPool.rotation.x = -Math.PI / 2;
    azureGroundPool.position.set(0, 0.004, 0.1);
    scene.add(azureGroundPool);

    const azureBackdropGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(15.2, 7.2),
      new THREE.MeshBasicMaterial({
        map: azureGlowTex,
        transparent: true,
        opacity: 0.54,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    azureBackdropGlow.position.set(0, 1.85, -3.8);
    scene.add(azureBackdropGlow);

    // Soft Contact Shadow beneath tires & underbody
    const contactTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.0, 2.55),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.009, 0);
    scene.add(contactShadow);

    // 3-Point Studio Lighting + Overhead Cool Azure Focus Spotlight
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x09090b, 0.46);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.25);
    keyLight.position.set(4.6, 8.2, 5.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 24;
    keyLight.shadow.camera.left = -4.5;
    keyLight.shadow.camera.right = 4.5;
    keyLight.shadow.camera.top = 4.5;
    keyLight.shadow.camera.bottom = -4.5;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const azureSpot = new THREE.SpotLight(0x38bdf8, 19, 20, Math.PI / 4, 0.72, 1.3);
    azureSpot.position.set(0, 7.8, 1.5);
    azureSpot.target.position.set(0, 0.5, 0);
    scene.add(azureSpot);
    scene.add(azureSpot.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.6);
    rimLight.position.set(-4.0, 5.8, -5.4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0xcbd5e1, 0.36);
    fillLight.position.set(-3.4, 1.9, 6.0);
    scene.add(fillLight);

    const {
      vanGroup,
      slidingDoorGroup,
      doorHitTargets,
      doorHandleHighlightMat,
      cabinLight,
    } = buildCaravelleT5LWB();
    scene.add(vanGroup);

    // Pointer Parallax + Raycaster for Clicking the 3D Sliding Door
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2(99, 99);
    const pointerParallax = { x: 0, y: 0 };
    let isHovered = false;

    const updatePointer = (clientX: number, clientY: number) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = ((clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -((clientY - rect.top) / rect.height) * 2 + 1;
      pointerNdc.set(nx, ny);
      pointerParallax.x = nx;
      pointerParallax.y = ny;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (doorPhaseRef.current !== 'closed') return;
      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      const hit = raycaster.intersectObjects(doorHitTargets, false).length > 0;
      if (hit !== isHovered) {
        isHovered = hit;
        renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
        doorHandleHighlightMat.emissiveIntensity = hit ? 2.8 : 1.4;
        onDoorHoverRef.current(hit);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (doorPhaseRef.current !== 'closed') return;
      updatePointer(e.clientX, e.clientY);
      raycaster.setFromCamera(pointerNdc, camera);
      if (raycaster.intersectObjects(doorHitTargets, false).length > 0) {
        onDoorClickRef.current();
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('click', handleClick);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    let doorProgress = 0;
    let overheadProgress = 0;
    let rafId = 0;
    let lastTime = performance.now();
    const lookAtTarget = new THREE.Vector3(0, 0.9, 0);

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const phase = doorPhaseRef.current;

      // Real 3D Sliding Door Kinematics along the recessed rear track
      const doorTarget = phase === 'closed' ? 0 : 1;
      doorProgress += (doorTarget - doorProgress) * Math.min(1, dt * 8.5);
      const popOut = Math.min(1, doorProgress * 3.2);
      const slideBack = Math.max(0, (doorProgress - 0.08) / 0.92);
      slidingDoorGroup.position.set(-1.18 * slideBack, 0, 0.08 * popOut);
      cabinLight.intensity = 1.4 + doorProgress * 2.5;

      // Smooth 90° Overhead Camera Transition into Act II
      const overheadTarget = phase === 'overhead' ? 1 : 0;
      overheadProgress += (overheadTarget - overheadProgress) * Math.min(1, dt * 4.4);
      const easedOverhead = 1 - Math.pow(1 - overheadProgress, 3);

      const baseDist = getIdleCameraDistance(camera.aspect);
      const idleX = pointerParallax.x * 0.25 * (1 - easedOverhead);
      const idleY =
        (camera.aspect < 1 ? 1.54 : 1.32) + pointerParallax.y * 0.1 * (1 - easedOverhead);

      const camX = THREE.MathUtils.lerp(idleX, 0.0, easedOverhead);
      const camY = THREE.MathUtils.lerp(idleY, 6.4, easedOverhead);
      const camZ = THREE.MathUtils.lerp(baseDist, 0.08, easedOverhead);

      camera.position.set(camX, camY, camZ);
      lookAtTarget.set(
        0,
        THREE.MathUtils.lerp(camera.aspect < 1 ? 0.72 : 0.88, 0.45, easedOverhead),
        0
      );
      camera.lookAt(lookAtTarget);

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('click', handleClick);
      pmremGenerator.dispose();
      envTex.dispose();
      contactTex.dispose();
      azureGlowTex.dispose();
      roughnessTex.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="caravelle-3d-canvas"
      className="absolute inset-0 h-full w-full"
    />
  );
}
