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
    grad.addColorStop(0, 'rgba(0,0,0,0.96)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.78)');
    grad.addColorStop(0.84, 'rgba(0,0,0,0.24)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Soft cyan-azure (#38BDF8 / #0EA5E9) radial underglow focus spotlight pool */
function createAzureSpotlightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 248);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.44)');
    grad.addColorStop(0.32, 'rgba(14, 165, 233, 0.24)');
    grad.addColorStop(0.66, 'rgba(2, 132, 199, 0.08)');
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
    ctx.fillStyle = '#8b8b8b';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5500; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(105 + Math.random() * 68);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  return tex;
}

/** Faint distant Alpine twilight mountain ridge cyclorama (#09090B sky -> #11161D ridges) */
function createTwilightAlpineBackdrop(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Deep obsidian studio sky
    const sky = ctx.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#09090B');
    sky.addColorStop(0.65, '#0C1016');
    sky.addColorStop(1, '#11161D');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1024, 512);

    // Subtle cool cyan twilight horizon glow
    const glow = ctx.createRadialGradient(512, 420, 20, 512, 420, 440);
    glow.addColorStop(0, 'rgba(56, 189, 248, 0.14)');
    glow.addColorStop(0.55, 'rgba(14, 165, 233, 0.05)');
    glow.addColorStop(1, 'rgba(9, 9, 11, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1024, 512);

    // Distant Alpine silhouette ridge 1 (faint twilight #11161D)
    ctx.fillStyle = '#11161D';
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(0, 355);
    ctx.lineTo(95, 290);
    ctx.lineTo(185, 326);
    ctx.lineTo(295, 248);
    ctx.lineTo(410, 314);
    ctx.lineTo(525, 266);
    ctx.lineTo(645, 308);
    ctx.lineTo(760, 238);
    ctx.lineTo(880, 298);
    ctx.lineTo(965, 268);
    ctx.lineTo(1024, 310);
    ctx.lineTo(1024, 512);
    ctx.closePath();
    ctx.fill();

    // Closer softer ridge 2 (#0D1117)
    ctx.fillStyle = '#0D1117';
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(0, 392);
    ctx.lineTo(160, 344);
    ctx.lineTo(350, 376);
    ctx.lineTo(560, 338);
    ctx.lineTo(740, 370);
    ctx.lineTo(920, 336);
    ctx.lineTo(1024, 368);
    ctx.lineTo(1024, 512);
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
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

/** Helper to extrude smoothly with computed vertex normals */
function createSmoothExtrude(
  shape: THREE.Shape,
  opts: THREE.ExtrudeGeometryOptions
): THREE.ExtrudeGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, opts);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Studio-Grade 2008 Volkswagen Caravelle T5 Long-Wheelbase (1:1 real-world meters)
 * Length: 5.29m (x ∈ [-2.64, +2.65]) | Wheelbase: 3.40m (rear -1.60, front +1.80)
 * Nose strictly RIGHT (+X), Rear LEFT (-X), Right Sliding Door facing CAMERA (+Z).
 */
function buildStudioCaravelleT5(): {
  vanGroup: THREE.Group;
  slidingDoorGroup: THREE.Group;
  doorHitTargets: THREE.Object3D[];
  doorHandleHighlightMat: THREE.MeshStandardMaterial;
  cabinLight: THREE.PointLight;
} {
  const vanGroup = new THREE.Group();

  // =========================================================================
  // STUDIO CGI AUTOMOTIVE MATERIALS
  // =========================================================================
  // Refined metallic-pearl studio white (calibrated so curved studio bevels show rich tonal depth)
  const whitePaint = new THREE.MeshPhysicalMaterial({
    color: 0xe6ebf2,
    roughness: 0.2,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  // Crisp swage crease & sill accent paint
  const swageMat = new THREE.MeshPhysicalMaterial({
    color: 0xcbd4e0,
    roughness: 0.26,
    metalness: 0.16,
    clearcoat: 0.85,
  });

  // Sculpted dark matte-charcoal bumpers (#1E2025)
  const matteCharcoalBumper = new THREE.MeshPhysicalMaterial({
    color: 0x1e2025,
    roughness: 0.66,
    metalness: 0.08,
    clearcoat: 0.1,
  });

  // Thin black rubber window gaskets & handles (#111318)
  const blackRubber = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.72,
    metalness: 0.1,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.1,
    metalness: 0.95,
  });

  // Glossy azure-tinted automotive glass (#2B6CB0 + #0EA5E9 emissive sheen, clearcoat 1.0)
  const azureGlass = new THREE.MeshPhysicalMaterial({
    color: 0x2b6cb0,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.12,
    roughness: 0.06,
    metalness: 0.24,
    transparent: true,
    opacity: 0.84,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  // Multi-reflector clear-lens headlights
  const headlightLens = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.62,
    roughness: 0.04,
    metalness: 0.18,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.94,
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.58,
    roughness: 0.2,
  });

  const tailLightRed = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.78,
    roughness: 0.14,
    clearcoat: 0.92,
  });

  const interiorDark = new THREE.MeshStandardMaterial({
    color: 0x0e1116,
    roughness: 0.92,
    metalness: 0.04,
  });

  const seatFabric = new THREE.MeshStandardMaterial({
    color: 0x262d38,
    roughness: 0.85,
    metalness: 0.05,
  });

  const doorHandleHighlightMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  // =========================================================================
  // 1. EXACT LWB SIDE SILHOUETTES (Deep Semicircular Arches + Flush Window Holes)
  // =========================================================================
  const buildRearQuarterShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-2.55, 0.36);
    s.quadraticCurveTo(-2.62, 0.4, -2.61, 0.6);
    s.lineTo(-2.54, 1.72);
    s.quadraticCurveTo(-2.5, 1.91, -2.28, 1.93);
    s.lineTo(-0.54, 1.93);
    s.lineTo(-0.54, 0.3);
    // Deep semi-circular rear wheel arch (center x=-1.60, y=0.36, r=0.44)
    s.lineTo(-1.16, 0.3);
    s.absarc(-1.6, 0.36, 0.44, -0.14, Math.PI + 0.14, false);
    s.lineTo(-2.55, 0.36);

    // Long LWB rear quarter window hole (strictly inside C and D pillars)
    s.holes.push(makeRoundedRectPath(-2.4, 1.13, -0.68, 1.8, 0.055));
    return s;
  };

  const buildSlidingDoorShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.53, 0.31);
    s.lineTo(0.65, 0.31);
    s.lineTo(0.65, 1.9);
    s.lineTo(-0.53, 1.9);
    s.lineTo(-0.53, 0.31);

    // Wide middle sliding-door window hole
    s.holes.push(makeRoundedRectPath(-0.44, 1.13, 0.56, 1.8, 0.05));
    return s;
  };

  const buildFrontCabShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0.66, 0.3);
    s.lineTo(0.66, 1.93);
    // Smooth roofline into ~42° raked windshield
    s.lineTo(1.2, 1.93);
    s.quadraticCurveTo(1.36, 1.92, 1.46, 1.8);
    s.lineTo(1.98, 1.17);
    // Short rounded hood flowing into front fender above matte-charcoal bumper
    s.quadraticCurveTo(2.34, 1.09, 2.55, 0.96);
    s.quadraticCurveTo(2.63, 0.9, 2.63, 0.74);
    s.lineTo(2.6, 0.54);
    s.lineTo(2.24, 0.54);
    // Deep semi-circular front wheel arch (center x=+1.80, y=0.36, r=0.44)
    s.absarc(1.8, 0.36, 0.44, 0.35, Math.PI + 0.14, false);
    s.lineTo(0.66, 0.3);

    // Angled front cab window hole (matching ~42° A-pillar rake)
    const cabWin = new THREE.Path();
    cabWin.moveTo(0.81, 1.13);
    cabWin.lineTo(1.78, 1.13);
    cabWin.quadraticCurveTo(1.83, 1.13, 1.8, 1.19);
    cabWin.lineTo(1.36, 1.75);
    cabWin.quadraticCurveTo(1.32, 1.8, 1.24, 1.8);
    cabWin.lineTo(0.81, 1.8);
    cabWin.quadraticCurveTo(0.75, 1.8, 0.75, 1.74);
    cabWin.lineTo(0.75, 1.19);
    cabWin.quadraticCurveTo(0.75, 1.13, 0.81, 1.13);
    s.holes.push(cabWin);

    return s;
  };

  // Multi-segment smooth automotive bevel extrusion
  const panelExtrudeOpts: THREE.ExtrudeGeometryOptions = {
    depth: 0.056,
    bevelEnabled: true,
    bevelThickness: 0.032,
    bevelSize: 0.025,
    bevelSegments: 8,
    curveSegments: 32,
  };

  // Helper: thin black rubber gasket (#111318) + flush recessed azure-tinted glass
  const addFlushGasketWindow = (
    parent: THREE.Object3D,
    shape: THREE.Shape,
    zCenter: number
  ) => {
    const gasket = new THREE.Mesh(
      createSmoothExtrude(shape, { depth: 0.022, bevelEnabled: false }),
      blackRubber
    );
    gasket.position.z = zCenter - 0.011;
    parent.add(gasket);

    const glass = new THREE.Mesh(
      createSmoothExtrude(shape, { depth: 0.014, bevelEnabled: false }),
      azureGlass
    );
    glass.position.z = zCenter - 0.002;
    glass.scale.set(0.988, 0.975, 1);
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

  const rearWinShape = makeRectShape(-2.43, 1.11, -0.65, 1.82);
  const doorWinShape = makeRectShape(-0.46, 1.11, 0.58, 1.82);
  const cabWinShape = new THREE.Shape();
  cabWinShape.moveTo(0.73, 1.11);
  cabWinShape.lineTo(1.84, 1.11);
  cabWinShape.lineTo(1.36, 1.82);
  cabWinShape.lineTo(0.73, 1.82);
  cabWinShape.closePath();

  // --- RIGHT SIDE (CAMERA SIDE) ---
  const rightRearPanel = new THREE.Mesh(
    createSmoothExtrude(buildRearQuarterShape(), panelExtrudeOpts),
    whitePaint
  );
  rightRearPanel.position.z = 0.85;
  rightRearPanel.castShadow = true;
  rightRearPanel.receiveShadow = true;
  vanGroup.add(rightRearPanel);

  const rightFrontPanel = new THREE.Mesh(
    createSmoothExtrude(buildFrontCabShape(), panelExtrudeOpts),
    whitePaint
  );
  rightFrontPanel.position.z = 0.85;
  rightFrontPanel.castShadow = true;
  rightFrontPanel.receiveShadow = true;
  vanGroup.add(rightFrontPanel);

  // Flush recessed azure-tinted windows with black rubber gaskets
  addFlushGasketWindow(vanGroup, rearWinShape, 0.865);
  addFlushGasketWindow(vanGroup, cabWinShape, 0.865);

  // Subtle fender flare arches around both wheel wells (right side)
  for (const fx of [-1.6, 1.8]) {
    const flare = new THREE.Mesh(
      new THREE.TorusGeometry(0.455, 0.022, 12, 32, Math.PI),
      whitePaint
    );
    flare.position.set(fx, 0.36, 0.928);
    vanGroup.add(flare);
  }

  // Recessed sliding-door guide track running horizontally from C-pillar to vertical rear taillight
  const trackGroove = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.036, 0.02), blackRubber);
  trackGroove.position.set(-1.53, 1.035, 0.935);
  vanGroup.add(trackGroove);

  // Crisp horizontal body-side character swage crease at door-handle height
  const frontSwage = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.018, 0.018), swageMat);
  frontSwage.position.set(1.6, 0.96, 0.938);
  vanGroup.add(frontSwage);

  const rearSwage = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.016, 0.014), swageMat);
  rearSwage.position.set(-1.55, 0.96, 0.936);
  vanGroup.add(rearSwage);

  // Subtle lower rocker panel sill groove between wheel arches
  const rockerGroove = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.024, 0.018), blackRubber);
  rockerGroove.position.set(0.1, 0.36, 0.936);
  vanGroup.add(rockerGroove);

  // Front Cab Black Door Handle (left of B-pillar seam, adjacent to sliding door handle!)
  const frontCabHandle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.038, 0.036), blackRubber);
  frontCabHandle.position.set(0.83, 0.97, 0.946);
  vanGroup.add(frontCabHandle);

  // --- LEFT SIDE (OPPOSITE SIDE) ---
  const leftRearPanel = new THREE.Mesh(
    createSmoothExtrude(buildRearQuarterShape(), panelExtrudeOpts),
    whitePaint
  );
  leftRearPanel.position.z = -0.906;
  leftRearPanel.castShadow = true;
  vanGroup.add(leftRearPanel);

  const leftMidPanel = new THREE.Mesh(
    createSmoothExtrude(buildSlidingDoorShape(), panelExtrudeOpts),
    whitePaint
  );
  leftMidPanel.position.z = -0.906;
  leftMidPanel.castShadow = true;
  vanGroup.add(leftMidPanel);

  const leftFrontPanel = new THREE.Mesh(
    createSmoothExtrude(buildFrontCabShape(), panelExtrudeOpts),
    whitePaint
  );
  leftFrontPanel.position.z = -0.906;
  leftFrontPanel.castShadow = true;
  vanGroup.add(leftFrontPanel);

  addFlushGasketWindow(vanGroup, rearWinShape, -0.865);
  addFlushGasketWindow(vanGroup, doorWinShape, -0.865);
  addFlushGasketWindow(vanGroup, cabWinShape, -0.865);

  // =========================================================================
  // 2. SMOOTH ROOF, SCULPTED HOOD, MATTE-CHARCOAL BUMPERS, HEADLIGHTS & TAILLIGHTS
  // =========================================================================
  const floorPan = new THREE.Mesh(new THREE.BoxGeometry(5.05, 0.1, 1.72), interiorDark);
  floorPan.position.set(0.0, 0.32, 0);
  vanGroup.add(floorPan);

  // Smooth Rounded Roof Shell
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.34, 1.86);
  roofShape.lineTo(1.22, 1.86);
  roofShape.quadraticCurveTo(1.36, 1.88, 1.38, 1.93);
  roofShape.lineTo(1.2, 1.97);
  roofShape.lineTo(-2.32, 1.97);
  roofShape.quadraticCurveTo(-2.48, 1.95, -2.5, 1.88);
  roofShape.closePath();

  const roofMesh = new THREE.Mesh(
    createSmoothExtrude(roofShape, {
      depth: 1.74,
      bevelEnabled: true,
      bevelThickness: 0.058,
      bevelSize: 0.044,
      bevelSegments: 8,
      curveSegments: 24,
    }),
    whitePaint
  );
  roofMesh.position.z = -0.87;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  vanGroup.add(roofMesh);

  // Short Rounded Front Hood (white upper nose flowing into matte-charcoal bumper)
  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(1.88, 0.56);
  hoodShape.lineTo(2.58, 0.56);
  hoodShape.quadraticCurveTo(2.64, 0.62, 2.64, 0.74);
  hoodShape.quadraticCurveTo(2.61, 0.91, 2.48, 0.98);
  hoodShape.quadraticCurveTo(2.22, 1.1, 1.96, 1.17);
  hoodShape.lineTo(1.88, 1.14);
  hoodShape.closePath();

  const hoodMesh = new THREE.Mesh(
    createSmoothExtrude(hoodShape, {
      depth: 1.72,
      bevelEnabled: true,
      bevelThickness: 0.055,
      bevelSize: 0.04,
      bevelSegments: 8,
      curveSegments: 24,
    }),
    whitePaint
  );
  hoodMesh.position.z = -0.86;
  hoodMesh.castShadow = true;
  hoodMesh.receiveShadow = true;
  vanGroup.add(hoodMesh);

  // Sculpted Dark Matte-Charcoal Front Bumper (#1E2025) wrapping smoothly to front wheel arch!
  const frontBumperShape = new THREE.Shape();
  frontBumperShape.moveTo(2.18, 0.28);
  frontBumperShape.lineTo(2.52, 0.28);
  frontBumperShape.quadraticCurveTo(2.69, 0.3, 2.71, 0.44);
  frontBumperShape.quadraticCurveTo(2.71, 0.58, 2.58, 0.62);
  frontBumperShape.lineTo(2.18, 0.56);
  frontBumperShape.closePath();

  const frontBumperMesh = new THREE.Mesh(
    createSmoothExtrude(frontBumperShape, {
      depth: 1.78,
      bevelEnabled: true,
      bevelThickness: 0.045,
      bevelSize: 0.032,
      bevelSegments: 6,
      curveSegments: 20,
    }),
    matteCharcoalBumper
  );
  frontBumperMesh.position.z = -0.89;
  frontBumperMesh.castShadow = true;
  vanGroup.add(frontBumperMesh);

  // Lower Front Bumper Air Intakes
  for (const iy of [0.34, 0.43]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.048, 1.16), blackRubber);
    intake.position.set(2.72, iy, 0);
    vanGroup.add(intake);
  }

  // Sculpted Dark Matte-Charcoal Rear Bumper (#1E2025) wrapping smoothly under taillights!
  const rearBumperShape = new THREE.Shape();
  rearBumperShape.moveTo(-2.68, 0.31);
  rearBumperShape.quadraticCurveTo(-2.74, 0.34, -2.72, 0.48);
  rearBumperShape.lineTo(-2.64, 0.58);
  rearBumperShape.lineTo(-2.14, 0.54);
  rearBumperShape.lineTo(-2.14, 0.29);
  rearBumperShape.closePath();

  const rearBumperMesh = new THREE.Mesh(
    createSmoothExtrude(rearBumperShape, {
      depth: 1.78,
      bevelEnabled: true,
      bevelThickness: 0.042,
      bevelSize: 0.028,
      bevelSegments: 6,
      curveSegments: 20,
    }),
    matteCharcoalBumper
  );
  rearBumperMesh.position.z = -0.89;
  rearBumperMesh.castShadow = true;
  vanGroup.add(rearBumperMesh);

  // Flush ~42° Raked Windshield (strictly recessed inside A-pillars)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.96, 1.56), azureGlass);
  windshield.position.set(1.69, 1.51, 0);
  windshield.rotation.z = 0.68;
  vanGroup.add(windshield);

  // Upper T5 Horizontal Black Grille + Dual Chrome Slats + VW Medallion
  const upperGrille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.2, 1.12), blackRubber);
  upperGrille.position.set(2.67, 0.78, 0);
  vanGroup.add(upperGrille);

  for (const gy of [0.83, 0.73]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.018, 1.08), chromeMat);
    slat.position.set(2.68, gy, 0);
    vanGroup.add(slat);
  }

  const vwBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24), chromeMat);
  vwBadge.rotation.z = Math.PI / 2;
  vwBadge.position.set(2.7, 0.785, 0);
  vanGroup.add(vwBadge);

  // Rear Tailgate Core + Recessed Rear Azure Glass
  const rearLower = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.72, 1.74), whitePaint);
  rearLower.position.set(-2.54, 0.76, 0);
  vanGroup.add(rearLower);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.68, 1.52), azureGlass);
  rearGlass.position.set(-2.55, 1.46, 0);
  vanGroup.add(rearGlass);

  // Multi-Reflector Headlights, Fog Recesses, Red/Amber Taillights & Black/White Mirrors
  for (const side of [-1, 1]) {
    // Clear-lens multi-reflector headlight wrapping smoothly onto fender
    const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.19, 0.34), blackRubber);
    hlHousing.position.set(2.53, 0.79, side * 0.73);
    vanGroup.add(hlHousing);

    const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.17, 0.32), headlightLens);
    hlLens.position.set(2.55, 0.795, side * 0.745);
    vanGroup.add(hlLens);

    // Fog-light recess in matte-charcoal bumper
    const fogHousing = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.05, 18), blackRubber);
    fogHousing.rotation.z = Math.PI / 2;
    fogHousing.position.set(2.72, 0.39, side * 0.68);
    vanGroup.add(fogHousing);

    // Side fender amber repeater
    const rep = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.025, 0.02), amberMat);
    rep.position.set(2.14, 0.78, side * 0.94);
    vanGroup.add(rep);

    // Vertical Red/Amber 2008 T5 Taillight Cluster
    const tlRed = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.34, 0.15), tailLightRed);
    tlRed.position.set(-2.6, 0.9, side * 0.85);
    vanGroup.add(tlRed);

    const tlAmber = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.15), amberMat);
    tlAmber.position.set(-2.6, 0.67, side * 0.85);
    vanGroup.add(tlAmber);

    // Sculpted Black/Body-Colored Side Mirror
    const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.09), blackRubber);
    mirrorStem.position.set(1.68, 1.15, side * 0.95);
    vanGroup.add(mirrorStem);

    const mirrorHousing = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), blackRubber);
    mirrorHousing.scale.set(0.95, 1.05, 0.72);
    mirrorHousing.position.set(1.66, 1.21, side * 1.04);
    vanGroup.add(mirrorHousing);

    const mirrorWhiteCap = new THREE.Mesh(new THREE.SphereGeometry(0.088, 18, 12), whitePaint);
    mirrorWhiteCap.scale.set(0.9, 0.95, 0.68);
    mirrorWhiteCap.position.set(1.69, 1.23, side * 1.045);
    vanGroup.add(mirrorWhiteCap);
  }

  // =========================================================================
  // 3. REAL 3D HOLLOWED-OUT CABIN INTERIOR SEATS (HEADREST SILHOUETTES VISIBLE!)
  // =========================================================================
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.44, 1.64), interiorDark);
  dash.position.set(1.64, 0.88, 0);
  vanGroup.add(dash);

  const steering = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 10, 24), blackRubber);
  steering.position.set(1.36, 1.06, -0.48);
  steering.rotation.y = Math.PI / 2;
  steering.rotation.x = 0.25;
  vanGroup.add(steering);

  // Subtle emerald courtesy step-in light inside the open doorway sill
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
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.21, width * 0.62), seatFabric);
    headrest.position.set(-0.24, 0.86, 0);
    g.add(headrest);
    vanGroup.add(g);
  };

  // Front Row: Driver (-0.52) + center aisle + F1 (+0.08) + F2 (+0.52)
  addCabinSeat(1.06, -0.52, 0.42);
  addCabinSeat(1.06, 0.08, 0.4);
  addCabinSeat(1.06, 0.52, 0.4);

  // Middle Row: M1, M2, M3
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
  // 4. INTERACTIVE 3D RIGHT-SIDE SLIDING DOOR (DUAL ADJACENT BLACK HANDLES!)
  // =========================================================================
  const slidingDoorGroup = new THREE.Group();
  const doorHitTargets: THREE.Object3D[] = [];

  const doorBodyMesh = new THREE.Mesh(
    createSmoothExtrude(buildSlidingDoorShape(), panelExtrudeOpts),
    whitePaint
  );
  doorBodyMesh.position.z = 0.85;
  doorBodyMesh.castShadow = true;
  doorBodyMesh.receiveShadow = true;
  slidingDoorGroup.add(doorBodyMesh);

  // Flush recessed azure-tinted sliding door window with black rubber gasket
  addFlushGasketWindow(slidingDoorGroup, doorWinShape, 0.865);

  // Continuous horizontal swage crease & lower rocker groove on sliding door
  const doorSwage = new THREE.Mesh(new THREE.BoxGeometry(1.17, 0.018, 0.018), swageMat);
  doorSwage.position.set(0.06, 0.96, 0.938);
  slidingDoorGroup.add(doorSwage);

  const doorSeamLeft = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.56, 0.02), blackRubber);
  doorSeamLeft.position.set(-0.535, 1.1, 0.933);
  slidingDoorGroup.add(doorSeamLeft);

  const doorSeamRight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.56, 0.02), blackRubber);
  doorSeamRight.position.set(0.655, 1.1, 0.933);
  slidingDoorGroup.add(doorSeamRight);

  // Adjacent Matte-Black Sliding Door Handle (right across the B-pillar seam from frontCabHandle!)
  const slidingHandle = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.038, 0.036), blackRubber);
  slidingHandle.position.set(0.49, 0.97, 0.946);
  slidingDoorGroup.add(slidingHandle);

  // Subtle emerald tactile indicator accent on sliding door handle
  const handleAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.044, 0.014, 0.012),
    doorHandleHighlightMat
  );
  handleAccent.position.set(0.49, 0.97, 0.968);
  slidingDoorGroup.add(handleAccent);

  doorHitTargets.push(doorBodyMesh, slidingHandle);
  vanGroup.add(slidingDoorGroup);

  // =========================================================================
  // 5. FOUR 5-SPOKE SILVER ALLOY WHEELS (metalness 0.88, roughness 0.2) + VW HUBS
  // =========================================================================
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x141619,
    roughness: 0.86,
    metalness: 0.05,
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.88,
    roughness: 0.2,
  });

  const brakeRotorMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    metalness: 0.65,
    roughness: 0.45,
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

    // Dark recessed wheel well arch backing
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.16, 32), interiorDark);
    well.rotation.x = Math.PI / 2;
    well.position.z = wz > 0 ? -0.09 : 0.09;
    wheelGroup.add(well);

    // Rounded rubber tire (#141619)
    const tireCore = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.355, 0.23, 36), tireMat);
    tireCore.rotation.x = Math.PI / 2;
    tireCore.castShadow = true;
    wheelGroup.add(tireCore);

    const tireShoulder = new THREE.Mesh(new THREE.TorusGeometry(0.305, 0.062, 14, 36), tireMat);
    tireShoulder.position.z = wz > 0 ? 0.062 : -0.062;
    wheelGroup.add(tireShoulder);

    // Silver alloy outer rim lip
    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.232, 0.022, 12, 32), alloyMat);
    rimLip.position.z = wz > 0 ? 0.114 : -0.114;
    wheelGroup.add(rimLip);

    // Dark ventilated brake rotor behind the spokes
    const brakeRotor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.04, 24),
      brakeRotorMat
    );
    brakeRotor.rotation.x = Math.PI / 2;
    brakeRotor.position.z = wz > 0 ? 0.045 : -0.045;
    wheelGroup.add(brakeRotor);

    // 5-Spoke Sculpted Silver Alloy Spokes
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.22, 0.036), alloyMat);
      const angle = (s * Math.PI * 2) / 5;
      spoke.position.set(
        Math.sin(angle) * 0.105,
        Math.cos(angle) * 0.105,
        wz > 0 ? 0.105 : -0.105
      );
      spoke.rotation.z = -angle;
      wheelGroup.add(spoke);
    }

    // Central VW-style hub cap (chrome ring + dark recessed center)
    const hubOuter = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.048, 24), chromeMat);
    hubOuter.rotation.x = Math.PI / 2;
    hubOuter.position.z = wz > 0 ? 0.11 : -0.11;
    wheelGroup.add(hubOuter);

    const hubInner = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.052, 20), blackRubber);
    hubInner.rotation.x = Math.PI / 2;
    hubInner.position.z = wz > 0 ? 0.112 : -0.112;
    wheelGroup.add(hubInner);

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
    renderer.toneMappingExposure = 0.96;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Deep Obsidian Studio (#09090B) + Distant Twilight Alpine Ridges (#11161D)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.Fog(0x09090b, 16, 40);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      80
    );

    const getIdleCameraDistance = (aspect: number) => {
      return aspect < 1 ? Math.min(22.0, 9.8 / Math.max(0.42, aspect)) : 8.65;
    };

    // Faint Distant Twilight Alpine Mountain Ridge Backdrop Plane
    const alpineTex = createTwilightAlpineBackdrop();
    const alpineBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 15),
      new THREE.MeshBasicMaterial({
        map: alpineTex,
        depthWrite: false,
      })
    );
    alpineBackdrop.position.set(0, 4.4, -10.5);
    scene.add(alpineBackdrop);

    // Dark Satin Studio Floor
    const roughnessTex = createStudioFloorRoughness();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0f,
      roughness: 0.54,
      roughnessMap: roughnessTex,
      metalness: 0.26,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(64, 64), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Soft Cyan-Azure Underglow Focus Spotlight Directly Beneath Van Chassis (#38BDF8 / #0EA5E9)
    const azureGlowTex = createAzureSpotlightTexture();
    const azureUnderglow = new THREE.Mesh(
      new THREE.PlaneGeometry(9.8, 5.2),
      new THREE.MeshBasicMaterial({
        map: azureGlowTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    azureUnderglow.rotation.x = -Math.PI / 2;
    azureUnderglow.position.set(0, 0.004, 0.08);
    scene.add(azureUnderglow);

    // Soft Ambient-Occlusion Contact Shadow right under tires & chassis
    const contactTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(6.05, 2.55),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.009, 0);
    scene.add(contactShadow);

    // Studio CGI Lighting: Overhead Softbox Key + Cyan-Azure Focus Spot + Rear Twilight Rim
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x09090b, 0.42);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.18);
    keyLight.position.set(4.4, 8.6, 5.2);
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

    const azureSpot = new THREE.SpotLight(0x38bdf8, 22, 20, Math.PI / 4, 0.74, 1.25);
    azureSpot.position.set(0, 7.6, 1.6);
    azureSpot.target.position.set(0, 0.45, 0);
    scene.add(azureSpot);
    scene.add(azureSpot.target);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.65);
    rimLight.position.set(-4.0, 5.8, -5.4);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.34);
    fillLight.position.set(-3.4, 1.8, 6.0);
    scene.add(fillLight);

    const {
      vanGroup,
      slidingDoorGroup,
      doorHitTargets,
      doorHandleHighlightMat,
      cabinLight,
    } = buildStudioCaravelleT5();
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
        doorHandleHighlightMat.emissiveIntensity = hit ? 2.9 : 1.5;
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

      // Real 3D Sliding Door Kinematics along the recessed rear guide track
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
      alpineTex.dispose();
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
