import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

interface Caravelle3DStageProps {
  doorPhase: 'closed' | 'sliding' | 'overhead';
  onDoorClick: () => void;
  onDoorHoverChange: (hovered: boolean) => void;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);
    const grad = ctx.createRadialGradient(256, 128, 30, 256, 128, 225);
    grad.addColorStop(0, 'rgba(0,0,0,0.92)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.68)');
    grad.addColorStop(0.82, 'rgba(0,0,0,0.22)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function createAsphaltRoughnessTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const v = Math.floor(115 + Math.random() * 75);
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

function buildCaravelleT5(): {
  vanGroup: THREE.Group;
  slidingDoorGroup: THREE.Group;
  doorHitTargets: THREE.Object3D[];
  cabinLight: THREE.PointLight;
} {
  const vanGroup = new THREE.Group();

  // Materials — 2008 Pearl White VW Caravelle T5 Automotive Studio Shaders
  const whitePaint = new THREE.MeshPhysicalMaterial({
    color: 0xe6eaf0,
    roughness: 0.24,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });

  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x181a1f,
    roughness: 0.62,
    metalness: 0.15,
  });

  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x20232a,
    roughness: 0.55,
    metalness: 0.12,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.15,
    metalness: 0.92,
  });

  const tintedGlass = new THREE.MeshPhysicalMaterial({
    color: 0x0c1118,
    roughness: 0.08,
    metalness: 0.1,
    transmission: 0.18,
    transparent: true,
    opacity: 0.88,
    clearcoat: 1.0,
  });

  const clearWindshield = new THREE.MeshPhysicalMaterial({
    color: 0x182230,
    roughness: 0.06,
    metalness: 0.08,
    transparent: true,
    opacity: 0.62,
    clearcoat: 1.0,
  });

  const interiorDark = new THREE.MeshStandardMaterial({
    color: 0x14171c,
    roughness: 0.88,
    metalness: 0.05,
  });

  const seatFabric = new THREE.MeshStandardMaterial({
    color: 0x2d333d,
    roughness: 0.85,
    metalness: 0.04,
  });

  const headlightMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    emissive: 0xfff3d6,
    emissiveIntensity: 0.45,
    roughness: 0.08,
    clearcoat: 1.0,
  });

  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.4,
    roughness: 0.25,
  });

  const tailLightMat = new THREE.MeshPhysicalMaterial({
    color: 0xb91c1c,
    emissive: 0x991b1b,
    emissiveIntensity: 0.55,
    roughness: 0.18,
    clearcoat: 0.8,
  });

  const emeraldStepMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  // Helper to add a box cleanly
  const addBox = (
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // =========================================================================
  // 1. UNDERBODY CHASSIS, FLOOR PAN & ROOF CAP
  // X: Rear (-2.42) -> Front Nose (+2.42) | Z: Left (-0.94) -> Right (+0.94)
  // =========================================================================
  addBox(vanGroup, 4.76, 0.14, 1.82, 0.0, 0.3, 0, interiorDark);
  // Roof main shell
  addBox(vanGroup, 3.68, 0.11, 1.84, -0.54, 1.88, 0, whitePaint);
  // Roof slight upper crown
  addBox(vanGroup, 3.45, 0.05, 1.68, -0.54, 1.94, 0, whitePaint);

  // =========================================================================
  // 2. LEFT SIDE FULL BODY WALL (opposite side, z = -0.90)
  // =========================================================================
  addBox(vanGroup, 3.82, 0.72, 0.08, -0.48, 0.68, -0.9, whitePaint);
  addBox(vanGroup, 3.65, 0.72, 0.06, -0.55, 1.44, -0.9, tintedGlass);
  // Left pillars
  addBox(vanGroup, 0.18, 0.86, 0.1, -2.32, 1.44, -0.9, whitePaint);
  addBox(vanGroup, 0.14, 0.86, 0.1, -0.62, 1.44, -0.9, whitePaint);
  addBox(vanGroup, 0.14, 0.86, 0.1, 0.54, 1.44, -0.9, whitePaint);

  // =========================================================================
  // 3. REAR TAILGATE (LEFT end, x = -2.40) + VERTICAL T5 TAIL LIGHTS
  // =========================================================================
  addBox(vanGroup, 0.12, 0.78, 1.84, -2.38, 0.68, 0, whitePaint);
  addBox(vanGroup, 0.1, 0.74, 1.56, -2.38, 1.44, 0, tintedGlass);
  addBox(vanGroup, 0.12, 0.78, 0.16, -2.38, 1.44, -0.84, whitePaint);
  addBox(vanGroup, 0.12, 0.78, 0.16, -2.38, 1.44, 0.84, whitePaint);
  // Rear lower bumper
  addBox(vanGroup, 0.22, 0.22, 1.88, -2.39, 0.36, 0, bumperMat);
  // Characteristic vertical T5 tail-light clusters (left & right corners)
  addBox(vanGroup, 0.08, 0.44, 0.16, -2.42, 0.78, 0.84, tailLightMat);
  addBox(vanGroup, 0.08, 0.44, 0.16, -2.42, 0.78, -0.84, tailLightMat);

  // =========================================================================
  // 4. FRONT NOSE, HOOD, SLOPED WINDSHIELD, GRILLE & HEADLIGHTS (RIGHT, +X)
  // =========================================================================
  // Front lower engine bay & bumper body
  addBox(vanGroup, 0.96, 0.66, 1.84, 1.9, 0.65, 0, whitePaint);
  // Front bumper lower valance
  addBox(vanGroup, 0.24, 0.24, 1.88, 2.34, 0.36, 0, bumperMat);
  // Sloped hood deck
  const hoodGeo = new THREE.BoxGeometry(0.92, 0.1, 1.82);
  const hoodMesh = new THREE.Mesh(hoodGeo, whitePaint);
  hoodMesh.position.set(1.9, 1.04, 0);
  hoodMesh.rotation.z = -0.22;
  hoodMesh.castShadow = true;
  hoodMesh.receiveShadow = true;
  vanGroup.add(hoodMesh);

  // Sloped front windshield
  const windshieldGeo = new THREE.BoxGeometry(0.06, 0.96, 1.66);
  const windshieldMesh = new THREE.Mesh(windshieldGeo, clearWindshield);
  windshieldMesh.position.set(1.48, 1.48, 0);
  windshieldMesh.rotation.z = 0.46;
  vanGroup.add(windshieldMesh);

  // Left & Right sloped A-Pillars
  for (const side of [-1, 1]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.98, 0.11), whitePaint);
    pillar.position.set(1.48, 1.48, side * 0.86);
    pillar.rotation.z = 0.46;
    pillar.castShadow = true;
    vanGroup.add(pillar);
  }

  // Front grille + chrome slats + VW emblem
  addBox(vanGroup, 0.06, 0.24, 1.16, 2.38, 0.78, 0, darkTrim);
  addBox(vanGroup, 0.07, 0.025, 1.14, 2.39, 0.84, 0, chromeMat);
  addBox(vanGroup, 0.07, 0.025, 1.14, 2.39, 0.73, 0, chromeMat);
  const vwEmblem = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.04, 24), chromeMat);
  vwEmblem.rotation.z = Math.PI / 2;
  vwEmblem.position.set(2.41, 0.78, 0);
  vanGroup.add(vwEmblem);

  // Sculpted 2008 T5 Headlights & Amber Side Turn Indicators
  for (const side of [-1, 1]) {
    addBox(vanGroup, 0.14, 0.22, 0.34, 2.34, 0.8, side * 0.74, headlightMat);
    addBox(vanGroup, 0.08, 0.06, 0.12, 2.36, 0.72, side * 0.88, amberMat);
    // Side fender repeater
    addBox(vanGroup, 0.07, 0.03, 0.02, 1.78, 0.76, side * 0.93, amberMat);
    // Sculpted wing mirror
    const mirrorArm = addBox(vanGroup, 0.08, 0.06, 0.14, 1.32, 1.14, side * 0.98, darkTrim);
    mirrorArm.castShadow = true;
    addBox(vanGroup, 0.14, 0.18, 0.14, 1.32, 1.2, side * 1.05, whitePaint);
    addBox(vanGroup, 0.12, 0.16, 0.04, 1.33, 1.2, side * 0.99, darkTrim);
  }

  // =========================================================================
  // 5. RIGHT SIDE BODY (CAMERA SIDE, z = +0.90) WITH REAL DOORWAY APERTURE!
  // Rear quarter panel: x = -2.38 to -0.60
  // Sliding Door Aperture (OPEN!): x = -0.60 to +0.54
  // Front right passenger door: x = +0.54 to +1.45
  // =========================================================================
  // Rear-right quarter lower body
  addBox(vanGroup, 1.76, 0.74, 0.08, -1.49, 0.68, 0.9, whitePaint);
  // Rear-right quarter panoramic tinted glass
  addBox(vanGroup, 1.56, 0.7, 0.06, -1.49, 1.44, 0.9, tintedGlass);
  // Rear-right D-pillar & C-pillar framing
  addBox(vanGroup, 0.16, 0.82, 0.09, -2.32, 1.44, 0.9, whitePaint);
  addBox(vanGroup, 0.14, 0.82, 0.09, -0.65, 1.44, 0.9, whitePaint);

  // Recessed black horizontal sliding door rail on rear-right quarter panel
  addBox(vanGroup, 1.66, 0.045, 0.03, -1.46, 1.02, 0.945, darkTrim);

  // Front-right passenger door (fixed)
  addBox(vanGroup, 0.92, 0.74, 0.08, 1.0, 0.68, 0.9, whitePaint);
  // Front-right door window
  addBox(vanGroup, 0.78, 0.68, 0.06, 0.98, 1.42, 0.9, tintedGlass);
  // Front-right B-pillar
  addBox(vanGroup, 0.1, 0.86, 0.09, 0.56, 1.44, 0.9, whitePaint);
  // Front door handle
  addBox(vanGroup, 0.14, 0.04, 0.04, 0.72, 0.94, 0.95, whitePaint);

  // Lower rocker trim along right side
  addBox(vanGroup, 4.5, 0.1, 0.08, 0.0, 0.32, 0.91, bumperMat);

  // Illuminated emerald step-in threshold inside doorway aperture
  addBox(vanGroup, 0.92, 0.025, 0.08, -0.04, 0.38, 0.84, emeraldStepMat);

  // =========================================================================
  // 6. REAL 3D INTERIOR CABIN SEATS (VISIBLE WHEN SLIDING DOOR OPENS!)
  // =========================================================================
  // Interior dashboard & steering wheel (front-left)
  addBox(vanGroup, 0.42, 0.45, 1.72, 1.38, 0.88, 0, interiorDark);
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.024, 10, 24), darkTrim);
  wheelRing.position.set(1.12, 1.05, -0.48);
  wheelRing.rotation.y = Math.PI / 2;
  wheelRing.rotation.x = 0.25;
  vanGroup.add(wheelRing);

  const addCabinSeat = (x: number, z: number, width = 0.44) => {
    const g = new THREE.Group();
    g.position.set(x, 0.42, z);
    // Cushion
    addBox(g, 0.46, 0.14, width, 0, 0.14, 0, seatFabric);
    // Backrest
    const back = addBox(g, 0.13, 0.62, width, -0.2, 0.48, 0, seatFabric);
    back.rotation.z = 0.14;
    // Headrest
    addBox(g, 0.11, 0.2, width * 0.62, -0.25, 0.88, 0, seatFabric);
    vanGroup.add(g);
  };

  // Front Row: Driver (-0.52) + aisle gap + F1 (+0.10) + F2 (+0.54)
  addCabinSeat(0.86, -0.52, 0.44);
  addCabinSeat(0.86, 0.08, 0.42);
  addCabinSeat(0.86, 0.52, 0.42);

  // Middle Row: M1, M2, M3 (clearly visible right inside the sliding doorway!)
  addCabinSeat(-0.12, -0.52, 0.44);
  addCabinSeat(-0.12, 0.0, 0.44);
  addCabinSeat(-0.12, 0.52, 0.44);

  // Rear Row: R1, R2, R3
  addCabinSeat(-1.18, -0.52, 0.44);
  addCabinSeat(-1.18, 0.0, 0.44);
  addCabinSeat(-1.18, 0.52, 0.44);

  // Interior warm-white cabin dome light so seats gleam cleanly when door slides open
  const cabinLight = new THREE.PointLight(0xeef6ff, 1.4, 3.6);
  cabinLight.position.set(-0.08, 1.66, 0.15);
  vanGroup.add(cabinLight);

  // =========================================================================
  // 7. REAL 3D RIGHT-SIDE SLIDING DOOR GROUP (INTERACTIVE MESH)
  // Covers exact doorway aperture x ∈ [-0.60, +0.52], y ∈ [0.34, 1.84], z = +0.91
  // =========================================================================
  const slidingDoorGroup = new THREE.Group();
  const doorHitTargets: THREE.Object3D[] = [];

  const doorLower = addBox(slidingDoorGroup, 1.14, 0.74, 0.07, -0.04, 0.68, 0.91, whitePaint);
  const doorGlass = addBox(slidingDoorGroup, 1.06, 0.7, 0.055, -0.04, 1.43, 0.91, tintedGlass);
  // Subtle T5 flush sliding door top frame & vertical edges
  addBox(slidingDoorGroup, 1.14, 0.07, 0.07, -0.04, 1.81, 0.91, whitePaint);
  addBox(slidingDoorGroup, 0.05, 0.74, 0.07, -0.585, 1.43, 0.91, whitePaint);
  addBox(slidingDoorGroup, 0.05, 0.74, 0.07, 0.505, 1.43, 0.91, whitePaint);
  // Door lower black sill strip + crisp shut-line seams
  addBox(slidingDoorGroup, 1.14, 0.09, 0.075, -0.04, 0.34, 0.915, bumperMat);
  addBox(slidingDoorGroup, 0.014, 1.48, 0.082, -0.605, 1.06, 0.915, darkTrim);
  addBox(slidingDoorGroup, 0.014, 1.48, 0.082, 0.525, 1.06, 0.915, darkTrim);
  addBox(slidingDoorGroup, 1.13, 0.016, 0.082, -0.04, 1.02, 0.915, darkTrim);
  // Sliding Door Handle + crisp emerald tactile indicator dot
  const doorHandle = addBox(slidingDoorGroup, 0.16, 0.045, 0.045, 0.34, 0.94, 0.96, whitePaint);
  addBox(slidingDoorGroup, 0.045, 0.045, 0.025, 0.34, 0.94, 0.985, emeraldStepMat);

  doorHitTargets.push(doorLower, doorGlass, doorHandle);
  vanGroup.add(slidingDoorGroup);

  // =========================================================================
  // 8. FOUR DETAILED 5-SPOKE VW ALLOY WHEELS
  // =========================================================================
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.85,
    metalness: 0.05,
  });
  const alloyMat = new THREE.MeshStandardMaterial({
    color: 0xd4dbe5,
    roughness: 0.24,
    metalness: 0.82,
  });

  const wheelPositions: [number, number][] = [
    [-1.44, 0.92],
    [-1.44, -0.92],
    [1.48, 0.92],
    [1.48, -0.92],
  ];

  for (const [wx, wz] of wheelPositions) {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, 0.36, wz);

    // Wheel arch dark well cutout backing
    const well = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 0.14, 24), interiorDark);
    well.rotation.x = Math.PI / 2;
    well.position.z = wz > 0 ? -0.08 : 0.08;
    wheelGroup.add(well);

    // Rubber tire
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 32), tireMat);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;
    wheelGroup.add(tire);

    // Alloy rim barrel
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.25, 24), alloyMat);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(rim);

    // Dark recessed rotor face
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.255, 20), darkTrim);
    rotor.rotation.x = Math.PI / 2;
    wheelGroup.add(rotor);

    // 5-Spoke VW Alloy Geometry
    for (let s = 0; s < 5; s++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.22, 0.265), alloyMat);
      const angle = (s * Math.PI * 2) / 5;
      spoke.position.set(Math.sin(angle) * 0.1, Math.cos(angle) * 0.1, 0);
      spoke.rotation.z = -angle;
      wheelGroup.add(spoke);
    }

    // Center hubcap
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.27, 16), chromeMat);
    hub.rotation.x = Math.PI / 2;
    wheelGroup.add(hub);

    vanGroup.add(wheelGroup);
  }

  return { vanGroup, slidingDoorGroup, doorHitTargets, cabinLight };
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
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.Fog(0x09090b, 14, 34);

    // Studio Reflection Environment (PMREM) for glossy pearl-white clearcoat & glass reflections
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
      // Automatically adapt distance so full 4.9m van fits completely uncropped on desktop & mobile portrait
      return aspect < 1 ? Math.min(20.5, 9.2 / Math.max(0.42, aspect)) : 8.2;
    };

    // =========================================================================
    // STUDIO ASPHALT FLOOR + SOFT CONTACT SHADOW
    // =========================================================================
    const roughnessTex = createAsphaltRoughnessTexture();
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x0b0c10,
      roughness: 0.84,
      roughnessMap: roughnessTex,
      metalness: 0.12,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(56, 56), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Subtle architectural studio horizon grid line on asphalt
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.12,
    });
    const roadEdgeLine = new THREE.Mesh(new THREE.PlaneGeometry(42, 0.04), lineMat);
    roadEdgeLine.rotation.x = -Math.PI / 2;
    roadEdgeLine.position.set(0, 0.004, 1.75);
    scene.add(roadEdgeLine);

    // Soft contact shadow directly under the VW Caravelle T5
    const contactTex = createContactShadowTexture();
    const contactShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5.6, 2.55),
      new THREE.MeshBasicMaterial({
        map: contactTex,
        transparent: true,
        depthWrite: false,
      })
    );
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.set(0, 0.008, 0);
    scene.add(contactShadow);

    // =========================================================================
    // 3-POINT AUTOMOTIVE STUDIO LIGHTING (Key + Crisp Rim + Cool Fill)
    // =========================================================================
    const hemi = new THREE.HemisphereLight(0xcbd5e1, 0x09090b, 0.55);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.35);
    keyLight.position.set(4.5, 8.2, 5.2);
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

    // Crisp overhead-rear rim light sculpting the white roofline & hood crease
    const rimLight = new THREE.DirectionalLight(0xbae6fd, 1.45);
    rimLight.position.set(-4.0, 5.8, -5.5);
    scene.add(rimLight);

    // Subtle front-right fill so the sliding door & interior seats read crisply
    const fillLight = new THREE.DirectionalLight(0x94a3b8, 0.42);
    fillLight.position.set(-3.2, 1.8, 5.8);
    scene.add(fillLight);

    // Build Sculpted White 2008 VW Caravelle T5
    const { vanGroup, slidingDoorGroup, doorHitTargets, cabinLight } = buildCaravelleT5();
    scene.add(vanGroup);

    // Pointer parallax & Raycaster for clicking the 3D sliding door directly
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

    // Animation state (critically damped spring-like exponential smoothing)
    let doorProgress = 0; // 0 = closed, 1 = slid fully open along side rail
    let overheadProgress = 0; // 0 = side profile, 1 = 90° overhead camera looking down into cabin
    let rafId = 0;
    let lastTime = performance.now();

    const lookAtTarget = new THREE.Vector3(0, 0.92, 0);

    const animate = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const phase = doorPhaseRef.current;

      // 1. Real 3D Sliding Door Kinematics (pop out on +Z then slide backward along -X rail)
      const doorTarget = phase === 'closed' ? 0 : 1;
      doorProgress += (doorTarget - doorProgress) * Math.min(1, dt * 8.5);

      const popOut = Math.min(1, doorProgress * 3.2);
      const slideBack = Math.max(0, (doorProgress - 0.08) / 0.92);
      slidingDoorGroup.position.set(-1.12 * slideBack, 0, 0.085 * popOut);
      cabinLight.intensity = 1.4 + doorProgress * 2.4;

      // 2. Camera framing + Smooth 90° Overhead Transition into Act II
      const overheadTarget = phase === 'overhead' ? 1 : 0;
      overheadProgress += (overheadTarget - overheadProgress) * Math.min(1, dt * 4.4);
      const easedOverhead = 1 - Math.pow(1 - overheadProgress, 3);

      const baseDist = getIdleCameraDistance(camera.aspect);
      const idleX = pointerParallax.x * 0.28 * (1 - easedOverhead);
      const idleY = (camera.aspect < 1 ? 1.55 : 1.32) + pointerParallax.y * 0.12 * (1 - easedOverhead);

      // Arc smoothly from side profile (z = baseDist, y = idleY) to 90° overhead (z = 0.08, y = 6.2)
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
