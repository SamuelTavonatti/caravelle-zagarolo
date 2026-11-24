import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const CARAVELLE_GLB_URL = `${import.meta.env.BASE_URL}models/caravelle-t5.glb`;

export interface WheelRig {
  steer: THREE.Group;
  spin: THREE.Group;
  front: boolean;
}

export interface CaravelleRig {
  root: THREE.Group;
  doorParts: THREE.Object3D[];
  doorHit: THREE.Object3D[];
  handle: THREE.Mesh | null;
  rail: THREE.Mesh | null;
  wheels: WheelRig[];
  materials: Record<string, THREE.Material>;
}

let gltfPromise: Promise<THREE.Group> | null = null;

function loadGLB(): Promise<THREE.Group> {
  if (!gltfPromise) {
    gltfPromise = new Promise((resolve, reject) => {
      new GLTFLoader().load(
        CARAVELLE_GLB_URL,
        (g) => resolve(g.scene),
        undefined,
        (e) => {
          gltfPromise = null;
          reject(e);
        }
      );
    });
  }
  return gltfPromise;
}

function makeMaterials(): Record<string, THREE.Material> {
  const glass = () =>
    new THREE.MeshPhysicalMaterial({
      color: 0x1b4965,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.14,
      roughness: 0.04,
      metalness: 0.2,
      reflectivity: 1.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      envMapIntensity: 1.3,
    });
  const paint = () =>
    new THREE.MeshPhysicalMaterial({
      color: 0xf4f6f9,
      metalness: 0.08,
      roughness: 0.24,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4,
    });
  const rubber = (c: number, r = 0.7) =>
    new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.1 });
  return {
    Body: paint(),
    SlidingDoor: paint(),
    Mirrors: paint(),
    GlassCab: glass(),
    GlassDoor: glass(),
    GlassRear: glass(),
    Windshield: glass(),
    Seals: rubber(0x0f1115),
    DoorTrim: rubber(0x0f1115),
    Trim: rubber(0x0f1115),
    TrackRail: new THREE.MeshStandardMaterial({
      color: 0x15181d,
      roughness: 0.5,
      metalness: 0.3,
      emissive: 0x38bdf8,
      emissiveIntensity: 0,
    }),
    InnerShell: new THREE.MeshStandardMaterial({ color: 0x23272e, roughness: 0.9, side: THREE.DoubleSide }),
    DoorLiner: new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.9, side: THREE.DoubleSide }),
    Bumpers: new THREE.MeshPhysicalMaterial({ color: 0x1b1d22, roughness: 0.65, metalness: 0.08 }),
    Grille: rubber(0x07080a, 0.6),
    Headlights: new THREE.MeshPhysicalMaterial({
      color: 0xf0f6ff,
      roughness: 0.05,
      clearcoat: 1,
      transparent: true,
      opacity: 0.9,
      emissive: 0x9fb4c8,
      emissiveIntensity: 0.25,
    }),
    DRL: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    Taillights: new THREE.MeshStandardMaterial({
      color: 0xb3121b,
      roughness: 0.15,
      emissive: 0xdc2626,
      emissiveIntensity: 0.5,
    }),
    MirrorGlass: new THREE.MeshStandardMaterial({ color: 0x1a1d22, roughness: 0.1, metalness: 0.6 }),
    Handles: rubber(0x0f1115, 0.6),
    DoorHandle: new THREE.MeshStandardMaterial({
      color: 0x0f1115,
      roughness: 0.6,
      metalness: 0.1,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0,
    }),
    Badge: new THREE.MeshStandardMaterial({ color: 0xe8edf3, metalness: 1, roughness: 0.1 }),
    Wheels: rubber(0x15161a, 0.72),
    Rims: new THREE.MeshStandardMaterial({ color: 0xd5dce5, metalness: 0.75, roughness: 0.28, envMapIntensity: 1.8 }),
    Brakes: new THREE.MeshStandardMaterial({ color: 0x6b7078, metalness: 0.8, roughness: 0.4 }),
    Calipers: new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.4, metalness: 0.2 }),
    WheelWells: new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.95 }),
    ArchTrim: new THREE.MeshStandardMaterial({ color: 0x121418, roughness: 0.8, side: THREE.DoubleSide }),
    CabinSeats: new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.85 }),
    CabinFloor: new THREE.MeshStandardMaterial({ color: 0x15171b, roughness: 0.95 }),
    Dashboard: new THREE.MeshStandardMaterial({ color: 0x1a1c21, roughness: 0.7, metalness: 0.1 }),
  };
}

/** Loads (cached) and clones the sculpted GLB, applies PBR materials and builds wheel/door rigs. */
export async function createCaravelleRig(): Promise<CaravelleRig> {
  const src = await loadGLB();
  const root = new THREE.Group();
  const model = src.clone(true);
  root.add(model);

  const materials = makeMaterials();
  const byName: Record<string, THREE.Mesh> = {};
  const wheelParts: Record<string, THREE.Mesh[]> = {};

  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const name = o.name || mesh.parent?.name || '';
    const base = name.split('_')[0];
    const mat = materials[base];
    if (mat) mesh.material = mat;
    mesh.castShadow = !base.startsWith('Glass') && base !== 'Windshield' && base !== 'InnerShell';
    mesh.receiveShadow = false;
    if (base === 'Windshield' || base.startsWith('Glass')) mesh.renderOrder = 2;
    byName[name] = mesh;
    if (['Wheels', 'Rims', 'Brakes', 'Calipers'].includes(base) && name.includes('_')) {
      const key = name.split('_')[1];
      (wheelParts[key] ||= []).push(mesh);
    }
  });

  // wheel pivots: steer (Y) -> spin (Z)
  root.updateMatrixWorld(true);
  const wheels: WheelRig[] = [];
  for (const [key, parts] of Object.entries(wheelParts)) {
    const center = new THREE.Vector3();
    parts[0].getWorldPosition(center);
    const steer = new THREE.Group();
    const spin = new THREE.Group();
    steer.position.copy(center);
    steer.add(spin);
    root.add(steer);
    for (const p of parts) {
      const keep = p.name.startsWith('Calipers');
      p.removeFromParent();
      p.position.set(0, 0, 0);
      p.quaternion.identity();
      p.scale.set(1, 1, 1);
      (keep ? steer : spin).add(p);
    }
    wheels.push({ steer, spin, front: key.startsWith('F') });
  }

  const doorNames = ['SlidingDoor', 'GlassDoor', 'DoorHandle', 'DoorLiner', 'DoorTrim'];
  const doorParts = doorNames.map((n) => byName[n]).filter(Boolean);
  const doorHit = ['SlidingDoor', 'GlassDoor', 'DoorHandle'].map((n) => byName[n]).filter(Boolean);

  return {
    root,
    doorParts,
    doorHit,
    handle: byName['DoorHandle'] ?? null,
    rail: byName['TrackRail'] ?? null,
    wheels,
    materials,
  };
}
