import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Caravelle3DStageProps {
  doorPhase: 'closed' | 'sliding' | 'overhead';
  onDoorClick: () => void;
  onDoorHoverChange: (hovered: boolean) => void;
}

/** Soft dark ambient-occlusion contact shadow directly under the Caravelle T5 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);
    const grad = ctx.createRadialGradient(256, 128, 28, 256, 128, 224);
    grad.addColorStop(0, 'rgba(0,0,0,0.94)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.72)');
    grad.addColorStop(0.82, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Cool azure-blue (#0EA5E9 / #38BDF8) radial focus spotlight pool on the dark satin floor */
function createAzureSpotlightTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);
    const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 248);
    grad.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
    grad.addColorStop(0.35, 'rgba(14, 165, 233, 0.18)');
    grad.addColorStop(0.68, 'rgba(2, 132, 199, 0.06)');
    grad.addColorStop(1, 'rgba(9, 9, 11, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Subtle dark satin studio floor roughness grain */
function createStudioFloorRoughness(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#909090';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(110 + Math.random() * 65);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(14, 14);
  return tex;
}

/** Helper to create a rounded rectangle Path (for window cutouts strictly inside body frames) */
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

/** Helper to build a sleek rounded 2008 VW Caravelle T5 with true recessed azure windows & wheel arches */
function buildSculptedCaravelleT5(): {
  vanGroup: THREE.Group;
  slidingDoorGroup: THREE.Group;
  doorHitTargets: THREE.Object3D[];
  doorHandleHighlightMat: THREE.MeshStandardMaterial;
  cabinLight: THREE.PointLight;
} {
  const vanGroup = new THREE.Group();

  // =========================================================================
  // AUTOMOTIVE STUDIO MATERIALS
  // =========================================================================
  const whitePaint = new THREE.MeshPhysicalMaterial({
    color: 0xeef2f7,
    roughness: 0.18,
    metalness: 0.08,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });

  const bumperMat = new THREE.MeshPhysicalMaterial({
    color: 0x1c2028,
    roughness: 0.48,
    metalness: 0.14,
    clearcoat: 0.25,
  });

  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x12151b,
    roughness: 0.62,
    metalness: 0.18,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.12,
    metalness: 0.94,
  });

  // Glossy azure-tinted automotive glass (#38BDF8 / #0284C7) — strictly recessed inside frames
  const azureGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.14,
    roughness: 0.06,
    metalness: 0.28,
    transparent: true,
    opacity: 0.72,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
  });

  const interiorDark = new THREE.MeshStandardMaterial({
    color: 0x11141a,
    roughness: 0.9,
    metalness: 0.05,
  });

  const seatFabric = new THREE.MeshStandardMaterial({
    color: 0x2a313d,
    roughness: 0.84,
    metalness: 0.04,
  });

  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xe0f2fe,
    emissiveIntensity: 0.65,
    roughness: 0.06,
    clearcoat: 1.0,
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.48,
    roughness: 0.22,
  });

  const tailLightMat = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    emissive: 0x991b1b,
    emissiveIntensity: 0.65,
    roughness: 0.16,
    clearcoat: 0.85,
  });

  const doorHandleHighlightMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });

  // =========================================================================
  // 1. SIDE PANEL SILHOUETTE BUILDER (Real Wheel Arches + Real Window Holes!)
  // X: Rear (-2.38) -> Front Nose (+2.42) | Y: Ground (0) -> Roof (1.92)
  // =========================================================================
  const buildRearQuarterShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-2.36, 0.34);
    // Smooth rear corner curve up tailgate edge
    s.quadraticCurveTo(-2.42, 0.36, -2.41, 0.56);
    s.lineTo(-2.34, 1.72);
    s.quadraticCurveTo(-2.3, 1.9, -2.1, 1.91);
    s.lineTo(-0.58, 1.91);
    s.lineTo(-0.58, 0.32);
    // Rear wheel arch cutout (center x=-1.42, y=0.37, r=0.43)
    s.lineTo(-0.99, 0.32);
    s.absarc(-1.42, 0.37, 0.43, 0, Math.PI, false);
    s.lineTo(-2.36, 0.34);

    // Strictly recessed rear quarter window hole
    s.holes.push(makeRoundedRectPath(-2.22, 1.1, -0.74, 1.77, 0.06));
    return s;
  };

  const buildFrontCabShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0.52, 0.32);
    s.lineTo(0.52, 1.91);
    // Roof corner to sloped A-pillar & windshield
    s.lineTo(1.12, 1.91);
    s.quadraticCurveTo(1.26, 1.9, 1.35, 1.76);
    s.lineTo(1.69, 1.15);
    // Sculpted sloped 2008 T5 hood curving down to rounded nose
    s.quadraticCurveTo(2.08, 1.07, 2.34, 0.94);
    s.quadraticCurveTo(2.45, 0.87, 2.45, 0.72);
    s.lineTo(2.43, 0.42);
    s.quadraticCurveTo(2.41, 0.32, 2.28, 0.32);
    // Front wheel arch cutout (center x=+1.46, y=0.37, r=0.43)
    s.lineTo(1.89, 0.32);
    s.absarc(1.46, 0.37, 0.43, 0, Math.PI, false);
    s.lineTo(0.52, 0.32);

    // Strictly recessed sloped front cab window hole (sits inside A & B pillars)
    const cabWin = new THREE.Path();
    cabWin.moveTo(0.68, 1.1);
    cabWin.lineTo(1.52, 1.1);
    cabWin.quadraticCurveTo(1.56, 1.1, 1.54, 1.16);
    cabWin.lineTo(1.24, 1.72);
    cabWin.quadraticCurveTo(1.2, 1.77, 1.12, 1.77);
    cabWin.lineTo(0.68, 1.77);
    cabWin.quadraticCurveTo(0.62, 1.77, 0.62, 1.71);
    cabWin.lineTo(0.62, 1.16);
    cabWin.quadraticCurveTo(0.62, 1.1, 0.68, 1.1);
    s.holes.push(cabWin);

    return s;
  };

  const buildSlidingDoorShape = () => {
    const s = new THREE.Shape();
    s.moveTo(-0.57, 0.33);
    s.lineTo(0.51, 0.33);
    s.lineTo(0.51, 1.88);
    s.lineTo(-0.57, 1.88);
    s.lineTo(-0.57, 0.33);

    // Strictly recessed sliding door window hole
    s.holes.push(makeRoundedRectPath(-0.47, 1.1, 0.41, 1.77, 0.05));
    return s;
  };

  const panelExtrudeOpts: THREE.ExtrudeGeometryOptions = {
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.025,
    bevelSegments: 4,
    curveSegments: 20,
  };

  // --- RIGHT SIDE (CAMERA SIDE, z ≈ +0.86) ---
  const rightRearMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildRearQuarterShape(), panelExtrudeOpts),
    whitePaint
  );
  rightRearMesh.position.z = 0.84;
  rightRearMesh.castShadow = true;
  rightRearMesh.receiveShadow = true;
  vanGroup.add(rightRearMesh);

  const rightFrontMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildFrontCabShape(), panelExtrudeOpts),
    whitePaint
  );
  rightFrontMesh.position.z = 0.84;
  rightFrontMesh.castShadow = true;
  rightFrontMesh.receiveShadow = true;
  vanGroup.add(rightFrontMesh);

  // Strictly recessed right rear & front cab azure windows (z = 0.855, strictly behind outer bevel z = 0.93)
  const rightRearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.68, 0.02), azureGlass);
  rightRearGlass.position.set(-1.48, 1.435, 0.855);
  vanGroup.add(rightRearGlass);

  // Front cab glass shaped cleanly to fit strictly inside the cab window hole
  const cabGlassShape = new THREE.Shape();
  cabGlassShape.moveTo(0.62, 1.1);
  cabGlassShape.lineTo(1.55, 1.1);
  cabGlassShape.lineTo(1.23, 1.77);
  cabGlassShape.lineTo(0.62, 1.77);
  cabGlassShape.closePath();
  const rightCabGlass = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cabGlassShape, { depth: 0.02, bevelEnabled: false }),
    azureGlass
  );
  rightCabGlass.position.z = 0.845;
  vanGroup.add(rightCabGlass);

  // Recessed black horizontal sliding door rail on rear-right quarter panel
  const sideRail = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.036, 0.02), darkTrim);
  sideRail.position.set(-1.44, 1.03, 0.925);
  vanGroup.add(sideRail);

  // Right front door handle
  const frontHandle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.038, 0.032), whitePaint);
  frontHandle.position.set(0.7, 0.96, 0.935);
  vanGroup.add(frontHandle);

  // --- LEFT SIDE (OPPOSITE SIDE, z ≈ -0.90) ---
  const leftRearMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildRearQuarterShape(), panelExtrudeOpts),
    whitePaint
  );
  leftRearMesh.position.z = -0.9;
  leftRearMesh.castShadow = true;
  vanGroup.add(leftRearMesh);

  const leftMidMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildSlidingDoorShape(), panelExtrudeOpts),
    whitePaint
  );
  leftMidMesh.position.z = -0.9;
  leftMidMesh.castShadow = true;
  vanGroup.add(leftMidMesh);

  const leftFrontMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(buildFrontCabShape(), panelExtrudeOpts),
    whitePaint
  );
  leftFrontMesh.position.z = -0.9;
  leftFrontMesh.castShadow = true;
  vanGroup.add(leftFrontMesh);

  // Left side recessed azure windows
  const leftGlassStrip = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.68, 0.02), azureGlass);
  leftGlassStrip.position.set(-0.92, 1.435, -0.865);
  vanGroup.add(leftGlassStrip);

  const leftCabGlass = new THREE.Mesh(
    new THREE.ExtrudeGeometry(cabGlassShape, { depth: 0.02, bevelEnabled: false }),
    azureGlass
  );
  leftCabGlass.position.z = -0.875;
  vanGroup.add(leftCabGlass);

  // =========================================================================
  // 2. ROOF SHELL, FLOOR PAN, SCULPTED HOOD, NOSE, REAR TAILGATE & WINDSHIELD
  // =========================================================================
  // Main floor pan
  const floorPan = new THREE.Mesh(new THREE.BoxGeometry(4.62, 0.1, 1.72), interiorDark);
  floorPan.position.set(-0.02, 0.34, 0);
  vanGroup.add(floorPan);

  // Rounded Roof Cap spanning left-to-right cleanly across Z
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-2.14, 1.84);
  roofShape.lineTo(1.14, 1.84);
  roofShape.quadraticCurveTo(1.25, 1.86, 1.28, 1.91);
  roofShape.lineTo(1.12, 1.95);
  roofShape.lineTo(-2.12, 1.95);
  roofShape.quadraticCurveTo(-2.26, 1.93, -2.28, 1.86);
  roofShape.closePath();

  const roofMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(roofShape, {
      depth: 1.74,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 5,
    }),
    whitePaint
  );
  roofMesh.position.z = -0.87;
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  vanGroup.add(roofMesh);

  // Sculpted Front Hood & Rounded Nose Block (connects left & right front fenders seamlessly)
  const noseShape = new THREE.Shape();
  noseShape.moveTo(1.56, 0.36);
  noseShape.lineTo(2.26, 0.36);
  noseShape.quadraticCurveTo(2.43, 0.37, 2.44, 0.56);
  noseShape.lineTo(2.44, 0.74);
  noseShape.quadraticCurveTo(2.42, 0.9, 2.28, 0.96);
  noseShape.quadraticCurveTo(1.98, 1.08, 1.66, 1.15);
  noseShape.lineTo(1.56, 1.12);
  noseShape.closePath();

  const noseMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(noseShape, {
      depth: 1.72,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.04,
      bevelSegments: 5,
    }),
    whitePaint
  );
  noseMesh.position.z = -0.86;
  noseMesh.castShadow = true;
  noseMesh.receiveShadow = true;
  vanGroup.add(noseMesh);

  // Sloped Front Windshield — strictly recessed between A-pillars (width 1.60 < body 1.80)
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.8, 1.58), azureGlass);
  windshield.position.set(1.48, 1.48, 0);
  windshield.rotation.z = 0.49;
  vanGroup.add(windshield);

  // Front Black T5 Grille + Dual Chrome Slats + Silver VW Medallion
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 1.12), darkTrim);
  grille.position.set(2.46, 0.77, 0);
  vanGroup.add(grille);

  for (const gy of [0.83, 0.72]) {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.02, 1.08), chromeMat);
    slat.position.set(2.47, gy, 0);
    vanGroup.add(slat);
  }

  const vwBadge = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.03, 24), chromeMat);
  vwBadge.rotation.z = Math.PI / 2;
  vwBadge.position.set(2.49, 0.775, 0);
  vanGroup.add(vwBadge);

  // Front & Rear Sculpted Lower Bumpers + Right Lower Sill
  const frontBumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 1.84), bumperMat);
  frontBumper.position.set(2.38, 0.36, 0);
  vanGroup.add(frontBumper);

  const rearBumper = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 1.84), bumperMat);
  rearBumper.position.set(-2.36, 0.36, 0);
  vanGroup.add(rearBumper);

  const rightSill = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.09, 0.08), bumperMat);
  rightSill.position.set(0.02, 0.31, 0.89);
  vanGroup.add(rightSill);

  // Rear Tailgate Core + Recessed Rear Azure Glass + Vertical T5 Taillights
  const rearLower = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.74, 1.76), whitePaint);
  rearLower.position.set(-2.34, 0.72, 0);
  vanGroup.add(rearLower);

  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.66, 1.52), azureGlass);
  rearGlass.position.set(-2.34, 1.44, 0);
  vanGroup.add(rearGlass);

  // Headlights, Amber Indicators, Taillights & Aerodynamic Wing Mirrors (both sides)
  for (const side of [-1, 1]) {
    // Crystal Headlight
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.32), headlightMat);
    hl.position.set(2.41, 0.79, side * 0.72);
    vanGroup.add(hl);

    // Front Amber Turn Signal
    const turn = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.1), amberMat);
    turn.position.set(2.42, 0.71, side * 0.86);
    vanGroup.add(turn);

    // Side Fender Repeater
    const rep = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.026, 0.02), amberMat);
    rep.position.set(1.86, 0.78, side * 0.93);
    vanGroup.add(rep);

    // Vertical 2008 T5 Rear Tail-Light Cluster
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.14), tailLightMat);
    tl.position.set(-2.39, 0.82, side * 0.84);
    vanGroup.add(tl);

    // Rounded Sculpted Wing Mirror
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.045, 0.12), darkTrim);
    arm.position.set(1.36, 1.15, side * 0.96);
    vanGroup.add(arm);

    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12), whitePaint);
    cap.scale.set(0.85, 1.05, 0.75);
    cap.position.set(1.36, 1.2, side * 1.04);
    vanGroup.add(cap);
  }

  // =========================================================================
  // 3. REAL 3D HOLLOWED-OUT CABIN INTERIOR SEATS (VISIBLE WHEN DOOR SLIDES OPEN!)
  // =========================================================================
  // Dashboard & Steering Wheel
  const dash = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 1.64), interiorDark);
  dash.position.set(1.36, 0.88, 0);
  vanGroup.add(dash);

  const steering = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.022, 10, 24), darkTrim);
  steering.position.set(1.1, 1.06, -0.48);
  steering.rotation.y = Math.PI / 2;
  steering.rotation.x = 0.25;
  vanGroup.add(steering);

  // Subtle emerald courtesy step-in strip inside the open doorway sill
  const stepLight = new THREE.Mesh(
    new THREE.BoxGeometry(0.88, 0.02, 0.05),
    doorHandleHighlightMat
  );
  stepLight.position.set(-0.03, 0.4, 0.81);
  vanGroup.add(stepLight);

  const addCabinSeat = (x: number, z: number, width = 0.42) => {
    const g = new THREE.Group();
    g.position.set(x, 0.42, z);
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
  addCabinSeat(0.84, -0.52, 0.42);
  addCabinSeat(0.84, 0.08, 0.4);
  addCabinSeat(0.84, 0.52, 0.4);

  // Middle Row: M1, M2, M3 (immediately revealed when sliding door opens!)
  addCabinSeat(-0.14, -0.52, 0.42);
  addCabinSeat(-0.14, 0.0, 0.42);
  addCabinSeat(-0.14, 0.52, 0.42);

  // Rear Row: R1, R2, R3
  addCabinSeat(-1.18, -0.52, 0.42);
  addCabinSeat(-1.18, 0.0, 0.42);
  addCabinSeat(-1.18, 0.52, 0.42);

  // Interior Cabin Light (brightens smoothly when door opens)
  const cabinLight = new THREE.PointLight(0xe0f2fe, 1.4, 3.8);
  cabinLight.position.set(-0.08, 1.66, 0.15);
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
  doorBodyMesh.position.z = 0.84;
  doorBodyMesh.castShadow = true;
  doorBodyMesh.receiveShadow = true;
  slidingDoorGroup.add(doorBodyMesh);

  // Strictly recessed azure sliding door window (z = 0.855, sits cleanly inside the beveled door hole!)
  const doorWindowMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.68, 0.02), azureGlass);
  doorWindowMesh.position.set(-0.03, 1.435, 0.855);
  slidingDoorGroup.add(doorWindowMesh);

  // Crisp subtle shut-line trim along sliding door edges
  const doorSeamLeft = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.52, 0.02), darkTrim);
  doorSeamLeft.position.set(-0.575, 1.1, 0.925);
  slidingDoorGroup.add(doorSeamLeft);

  const doorSeamRight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 1.52, 0.02), darkTrim);
  doorSeamRight.position.set(0.515, 1.1, 0.925);
  slidingDoorGroup.add(doorSeamRight);

  // Sculpted Sliding Door Handle + Subtle Interactive Highlight Accent
  const doorHandle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.035), whitePaint);
  doorHandle.position.set(0.34, 0.96, 0.94);
  slidingDoorGroup.add(doorHandle);

  const handleAccent = new THREE.Mesh(
    new THREE.BoxGeometry(0.045, 0.02, 0.012),
    doorHandleHighlightMat
  );
  handleAccent.position.set(0.34, 0.96, 0.962);
  slidingDoorGroup.add(handleAccent);

  doorHitTargets.push(doorBodyMesh, doorWindowMesh, doorHandle);
  vanGroup.add(slidingDoorGroup);

  // =========================================================================
  // 5. FOUR REALISTIC MULTI-SPOKE (6-SPOKE) VW ALLOY WHEELS + TORUS TIRES
  // =========================================================================
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x101216,
    roughness: 0.84,
    metalness: 0.06,
  });

  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xdce3ec,
    roughness: 0.2,
    metalness: 0.88,
  });

  const wheelPositions: [number, number][] = [
    [-1.42, 0.84],
    [-1.42, -0.84],
    [1.46, 0.84],
    [1.46, -0.84],
  ];

  for (const [wx, wz] of wheelPositions) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, 0.37, wz);

    // Dark recessed wheel well arch backing
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.16, 28), interiorDark);
    well.rotation.x = Math.PI / 2;
    well.position.z = wz > 0 ? -0.09 : 0.09;
    wheelGroup.add(well);

    // Contoured rubber tire (Cylinder core + rounded Torus sidewall shoulders)
    const tireCore = new THREE.Mesh(new THREE.CylinderGeometry(0.355, 0.355, 0.22, 36), tireMat);
    tireCore.rotation.x = Math.PI / 2;
    tireCore.castShadow = true;
    wheelGroup.add(tireCore);

    const tireShoulder = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.062, 12, 36), tireMat);
    tireShoulder.position.z = wz > 0 ? 0.06 : -0.06;
    wheelGroup.add(tireShoulder);

    // Brushed alloy outer rim lip
    const rimLip = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.02, 10, 32), alloyMat);
    rimLip.position.z = wz > 0 ? 0.112 : -0.112;
    wheelGroup.add(rimLip);

    // Recessed dark brake rotor
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.225, 24), darkTrim);
    rotor.rotation.x = Math.PI / 2;
    wheelGroup.add(rotor);

    // 6-Spoke Sculpted VW Alloy Geometry
    for (let s = 0; s < 6; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.225, 0.238), alloyMat);
      const angle = (s * Math.PI * 2) / 6;
      spoke.position.set(Math.sin(angle) * 0.105, Math.cos(angle) * 0.105, 0);
      spoke.rotation.z = -angle;
      wheelGroup.add(spoke);
    }

    // Center hubcap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.25, 20), chromeMat);
    hub.rotation.x = Math.PI / 2;
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

    // =========================================================================
    // DARK ARCHITECTURAL STUDIO (#09090B) + AZURE FOCUS SPOTLIGHT (#0EA5E9 / #38BDF8)
    // =========================================================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.Fog(0x09090b, 14, 34);

    // Studio Reflections (PMREM) so pearl-white clearcoat & azure glass gleam realistically
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(
      34,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      70
    );

    const getIdleCameraDistance = (aspect: number) => {
      return aspect < 1 ? Math.min(20.5, 9.2 / Math.max(0.42, aspect)) : 8.15;
    };

    // Dark Satin Studio Floor reflecting the soft azure focus spotlight
    const roughnessTex = createStudioFloorRoughness();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0a0b0e,
      roughness: 0.58,
      roughnessMap: roughnessTex,
      metalness: 0.24,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(58, 58), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Soft Azure-Blue Focus Light Pool Directly Beneath the Vehicle (#0EA5E9 / #38BDF8)
    const azureGlowTex = createAzureSpotlightTexture();
    const azureGroundPool = new THREE.Mesh(
      new THREE.PlaneGeometry(9.6, 5.4),
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

    // Atmospheric Cool Azure Studio Backdrop Glow Behind the Van
    const azureBackdropGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 6.8),
      new THREE.MeshBasicMaterial({
        map: azureGlowTex,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    azureBackdropGlow.position.set(0, 1.85, -3.6);
    scene.add(azureBackdropGlow);

    // Soft Ambient-Occlusion Contact Shadow right under tires & chassis
    const contactTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.55, 2.45),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.009, 0);
    scene.add(contactShadow);

    // =========================================================================
    // STUDIO LIGHTING: AZURE OVERHEAD FOCUS SPOTLIGHT + KEY + CRISP RIM
    // =========================================================================
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x09090b, 0.48);
    scene.add(hemi);

    // Primary soft automotive studio key light
    const keyLight = new THREE.DirectionalLight(0xf8fafc, 1.28);
    keyLight.position.set(4.2, 8.0, 5.6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // Overhead Cool Azure Focus Spotlight (#38BDF8) sculpting roof, beveled shoulders & satin floor
    const azureSpot = new THREE.SpotLight(0x38bdf8, 18, 18, Math.PI / 4, 0.72, 1.3);
    azureSpot.position.set(0, 7.6, 1.4);
    azureSpot.target.position.set(0, 0.5, 0);
    scene.add(azureSpot);
    scene.add(azureSpot.target);

    // Crisp cool-azure rear rim light separating the white roof contour from the #09090B backdrop
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.55);
    rimLight.position.set(-3.8, 5.6, -5.2);
    scene.add(rimLight);

    // Subtle front fill so the sliding door & interior seats read cleanly
    const fillLight = new THREE.DirectionalLight(0xcbd5e1, 0.38);
    fillLight.position.set(-3.2, 1.9, 5.8);
    scene.add(fillLight);

    // Add Sculpted 3D VW Caravelle T5
    const {
      vanGroup,
      slidingDoorGroup,
      doorHitTargets,
      doorHandleHighlightMat,
      cabinLight,
    } = buildSculptedCaravelleT5();
    scene.add(vanGroup);

    // Pointer Parallax + Raycaster for Clicking the 3D Sliding Door Directly
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
        doorHandleHighlightMat.emissiveIntensity = hit ? 2.6 : 1.35;
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

    // Smooth critically damped animation state
    let doorProgress = 0;
    let overheadProgress = 0;
    let rafId = 0;
    let lastTime = performance.now();
    const lookAtTarget = new THREE.Vector3(0, 0.9, 0);

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const phase = doorPhaseRef.current;

      // 1. Real 3D Sliding Door Kinematics (pop out on +Z then slide smoothly backward along -X rail)
      const doorTarget = phase === 'closed' ? 0 : 1;
      doorProgress += (doorTarget - doorProgress) * Math.min(1, dt * 8.5);

      const popOut = Math.min(1, doorProgress * 3.2);
      const slideBack = Math.max(0, (doorProgress - 0.08) / 0.92);
      slidingDoorGroup.position.set(-1.1 * slideBack, 0, 0.08 * popOut);
      cabinLight.intensity = 1.4 + doorProgress * 2.5;

      // 2. Smooth 90° Overhead Camera Transition into Act II
      const overheadTarget = phase === 'overhead' ? 1 : 0;
      overheadProgress += (overheadTarget - overheadProgress) * Math.min(1, dt * 4.4);
      const easedOverhead = 1 - Math.pow(1 - overheadProgress, 3);

      const baseDist = getIdleCameraDistance(camera.aspect);
      const idleX = pointerParallax.x * 0.25 * (1 - easedOverhead);
      const idleY =
        (camera.aspect < 1 ? 1.52 : 1.32) + pointerParallax.y * 0.1 * (1 - easedOverhead);

      const camX = THREE.MathUtils.lerp(idleX, 0.0, easedOverhead);
      const camY = THREE.MathUtils.lerp(idleY, 6.2, easedOverhead);
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
