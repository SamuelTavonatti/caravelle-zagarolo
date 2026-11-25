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
  hitMeshes: THREE.Object3D[];
  wheels: WheelRig[];
  materials: THREE.MeshStandardMaterial[];
  bounds: { length: number; height: number; width: number };
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

/**
 * Loads (cached) and clones the uploaded VW Caravelle T5 GLB, normalizes its
 * dimensions (length ~5.2 units, centered X/Z, tires resting cleanly at y = 0),
 * orients nose -> +X and right sliding door -> +Z, and tunes PBR materials
 * while preserving the embedded sRGB baseColor texture.
 */
export async function createCaravelleRig(maxAnisotropy = 16): Promise<CaravelleRig> {
  const src = await loadGLB();
  const root = new THREE.Group();
  const pivot = new THREE.Group();
  const model = src.clone(true);

  const hitMeshes: THREE.Object3D[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  const aniso = Math.min(16, Math.max(1, maxAnisotropy));

  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;

    const origMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    const std = (origMat instanceof THREE.MeshStandardMaterial
      ? origMat.clone()
      : new THREE.MeshStandardMaterial({ color: 0xf4f6f9 })) as THREE.MeshStandardMaterial;

    if (std.map) {
      std.map.colorSpace = THREE.SRGBColorSpace;
      std.map.anisotropy = aniso;
      std.map.minFilter = THREE.LinearMipmapLinearFilter;
      std.map.magFilter = THREE.LinearFilter;
      std.map.generateMipmaps = true;
      std.map.needsUpdate = true;
    }
    std.roughness = 0.58;
    std.metalness = 0.04;
    std.envMapIntensity = 0.65;
    std.needsUpdate = true;

    mesh.material = std;
    mesh.castShadow = true;
    mesh.receiveShadow = false;

    hitMeshes.push(mesh);
    materials.push(std);
  });

  // Rotate uploaded GLB (+Z nose, -X right side) -> (+X nose, +Z right sliding door)
  pivot.add(model);
  pivot.rotation.y = Math.PI / 2;
  pivot.updateMatrixWorld(true);

  // Compute post-rotation world bounding box and normalize length to ~5.2 world units
  const box = new THREE.Box3().setFromObject(pivot);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const targetLength = 5.2;
  const maxHoriz = Math.max(size.x, size.z, 0.001);
  const scale = targetLength / maxHoriz;

  pivot.scale.setScalar(scale);
  pivot.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
  root.add(pivot);
  root.updateMatrixWorld(true);

  return {
    root,
    hitMeshes,
    wheels: [],
    materials,
    bounds: {
      length: size.x * scale,
      height: size.y * scale,
      width: size.z * scale,
    },
  };
}
