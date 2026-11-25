import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createCaravelleRig } from '../lib/caravelleModel';

interface Caravelle3DStageProps {
  doorPhase: 'closed' | 'sliding' | 'overhead';
  onDoorClick: () => void;
  onDoorHoverChange: (hovered: boolean) => void;
}

declare global {
  interface Window {
    __CARAVELLE_DOOR_MAX__?: number;
    __CARAVELLE_STAGE__?: { doorScreen: () => { x: number; y: number } | null; doorProgress: () => number };
  }
}

// Custom automotive studio HDRI: overhead softbox strips, side cards, cyan-azure floor bounce
function createStudioEnvScene(): THREE.Scene {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x0b0d12);
  const add = (
    w: number,
    h: number,
    c: number,
    i: number,
    pos: [number, number, number],
    rot: [number, number, number]
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i), side: THREE.DoubleSide })
    );
    m.position.set(...pos);
    m.rotation.set(...rot);
    env.add(m);
  };
  const down: [number, number, number] = [Math.PI / 2, 0, 0];
  add(14, 1.1, 0xffffff, 9, [0, 9, -2.5], down);
  add(14, 1.1, 0xffffff, 9, [0, 9, 2.5], down);
  add(14, 0.5, 0xffffff, 12, [0, 9, 0], down);
  add(1.4, 8, 0xffffff, 4, [-11, 4, 0], [0, Math.PI / 2, 0]);
  add(1.4, 8, 0xffffff, 4, [11, 4, 0], [0, Math.PI / 2, 0]);
  add(20, 4, 0xdfe8f5, 1.2, [0, 3, -10], [0, 0, 0]);
  add(20, 4, 0xdfe8f5, 1.0, [0, 3, 10], [0, Math.PI, 0]);
  add(24, 24, 0x0ea5e9, 0.9, [0, -3, 0], [Math.PI / 2, 0, 0]);
  return env;
}

function radialTexture(stops: Array<[number, string]>, size = 256): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function alpineTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#09090B');
  sky.addColorStop(0.7, '#0C1016');
  sky.addColorStop(1, '#10151C');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1024, 512);
  const glow = ctx.createRadialGradient(512, 430, 20, 512, 430, 420);
  glow.addColorStop(0, 'rgba(56,189,248,0.16)');
  glow.addColorStop(1, 'rgba(9,9,11,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1024, 512);
  ctx.fillStyle = '#10151C';
  ctx.beginPath();
  ctx.moveTo(0, 512);
  [
    [0, 360], [95, 295], [185, 330], [295, 250], [410, 316], [525, 268], [645, 310],
    [760, 240], [880, 300], [965, 270], [1024, 312],
  ].forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.lineTo(1024, 512);
  ctx.closePath();
  ctx.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const idleDistance = (aspect: number) => Math.max(10.4, 6.5 / (0.4986 * Math.max(0.3, aspect)));

/** Hero stage: uploaded GLB Caravelle T5 in an obsidian studio with cyan-azure floor focus light. */
export function Caravelle3DStage({
  doorPhase,
  onDoorClick,
  onDoorHoverChange,
}: Caravelle3DStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(doorPhase);
  const clickRef = useRef(onDoorClick);
  const hoverRef = useRef(onDoorHoverChange);
  phaseRef.current = doorPhase;
  clickRef.current = onDoorClick;
  hoverRef.current = onDoorHoverChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = false;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x09090b);
    scene.fog = new THREE.Fog(0x09090b, 18, 44);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(createStudioEnvScene(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(28, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 90);

    // Twilight Alpine backdrop
    const alpine = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 17),
      new THREE.MeshBasicMaterial({ map: alpineTexture(), depthWrite: false, fog: false })
    );
    alpine.position.set(0, 5, -11);
    scene.add(alpine);

    // Dark satin studio floor
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(30, 64),
      new THREE.MeshStandardMaterial({ color: 0x06070a, roughness: 0.85, metalness: 0.08, envMapIntensity: 0.12 })
    );
    (floor.material as THREE.MeshStandardMaterial).envMap = envTex;
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // Cyan-azure focus spotlight pool under chassis
    const poolTex = radialTexture([
      [0, 'rgba(56,189,248,0.92)'],
      [0.38, 'rgba(14,165,233,0.42)'],
      [1, 'rgba(14,165,233,0)'],
    ]);
    const pool = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 4.4),
      new THREE.MeshBasicMaterial({
        map: poolTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.012;
    scene.add(pool);

    // Soft contact shadow blob beneath tires
    const blobTex = radialTexture([
      [0, 'rgba(0,0,0,0.88)'],
      [0.62, 'rgba(0,0,0,0.45)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(6.2, 2.8),
      new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, fog: false })
    );
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.016;
    scene.add(blob);

    // Subtle cyan highlight cue over the right sliding door zone (illuminates on hover)
    const doorCueMat = new THREE.MeshBasicMaterial({
      map: radialTexture([
        [0, 'rgba(125,211,252,0.75)'],
        [0.45, 'rgba(56,189,248,0.28)'],
        [1, 'rgba(14,165,233,0)'],
      ]),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const doorCue = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.35), doorCueMat);
    doorCue.position.set(-0.08, 1.05, 1.3);
    scene.add(doorCue);

    // Soft atmospheric headlight beam haze extending gently to the right (+X)
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 512;
    beamCanvas.height = 256;
    const bctx = beamCanvas.getContext('2d')!;
    bctx.save();
    bctx.translate(180, 128);
    bctx.scale(1.6, 0.75);
    const bg = bctx.createRadialGradient(0, 0, 10, 0, 0, 185);
    bg.addColorStop(0, 'rgba(186,230,253,0.34)');
    bg.addColorStop(0.45, 'rgba(56,189,248,0.14)');
    bg.addColorStop(1, 'rgba(14,165,233,0)');
    bctx.fillStyle = bg;
    bctx.beginPath();
    bctx.arc(0, 0, 185, 0, Math.PI * 2);
    bctx.fill();
    bctx.restore();
    const beamTex = new THREE.CanvasTexture(beamCanvas);
    beamTex.colorSpace = THREE.SRGBColorSpace;
    const beam = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 2.4),
      new THREE.MeshBasicMaterial({
        map: beamTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    beam.position.set(4.1, 0.92, -0.45);
    scene.add(beam);

    // Studio Lighting
    scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x0b0d12, 0.45));
    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-3, 9, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xe0f2fe, 0.75);
    fill.position.set(4, 4, 7);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 1.35);
    rim.position.set(6, 3, -5);
    scene.add(rim);
    const underGlow = new THREE.PointLight(0x38bdf8, 1.6, 5.5, 1.8);
    underGlow.position.set(0, 0.2, 0);
    scene.add(underGlow);

    let disposed = false;
    let rig: Awaited<ReturnType<typeof createCaravelleRig>> | null = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = false;
    let doorProgress = 0;
    let overheadProgress = 0;
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    const lookAt = new THREE.Vector3(0, 0.9, 0);

    createCaravelleRig()
      .then((r) => {
        if (disposed) return;
        rig = r;
        for (const m of r.materials) {
          m.envMap = envTex;
          m.needsUpdate = true;
        }
        doorCue.position.set(-0.08, r.bounds.height * 0.54, r.bounds.width * 0.5 + 0.04);
        scene.add(r.root);
        container.setAttribute('data-glb', 'loaded');
      })
      .catch(() => container.setAttribute('data-glb', 'error'));

    const doorCenter = new THREE.Vector3(-0.08, 1.0, 1.2);
    window.__CARAVELLE_STAGE__ = {
      doorScreen: () => {
        const v = doorCenter.clone().project(camera);
        const rect = renderer.domElement.getBoundingClientRect();
        return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
      },
      doorProgress: () => doorProgress,
    };

    const hitVan = (ev: PointerEvent) => {
      if (!rig) return false;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(rig.hitMeshes, false).length > 0;
    };

    const onMove = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      parallax.tx = ((ev.clientX - rect.left) / rect.width - 0.5) * 2;
      parallax.ty = ((ev.clientY - rect.top) / rect.height - 0.5) * 2;
      if (phaseRef.current !== 'closed') return;
      const hit = hitVan(ev);
      if (hit !== hovered) {
        hovered = hit;
        renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
        hoverRef.current(hit);
      }
    };
    const onClick = (ev: PointerEvent) => {
      if (phaseRef.current !== 'closed') return;
      if (hitVan(ev)) clickRef.current();
    };
    const onLeave = () => {
      if (hovered) {
        hovered = false;
        renderer.domElement.style.cursor = 'default';
        hoverRef.current(false);
      }
    };
    renderer.domElement.addEventListener('pointermove', onMove);
    renderer.domElement.addEventListener('pointerdown', onClick);
    renderer.domElement.addEventListener('pointerleave', onLeave);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const phase = phaseRef.current;

      // Cinematic zoom-in toward sliding door (`sliding`), then smooth 90° top-down orbit (`overhead`)
      const target = phase === 'closed' ? 0 : 1;
      doorProgress += (target - doorProgress) * Math.min(1, dt * 5.2);
      window.__CARAVELLE_DOOR_MAX__ = Math.max(window.__CARAVELLE_DOOR_MAX__ ?? 0, doorProgress);

      const cueTarget = phase === 'closed' ? (hovered ? 0.65 : 0.0) : phase === 'sliding' ? 0.85 : 0.0;
      doorCueMat.opacity += (cueTarget - doorCueMat.opacity) * Math.min(1, dt * 8);

      overheadProgress += ((phase === 'overhead' ? 1 : 0) - overheadProgress) * Math.min(1, dt * 4.4);
      const eZoom = 1 - Math.pow(1 - doorProgress, 3);
      const eo = 1 - Math.pow(1 - overheadProgress, 3);

      parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 3);
      parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 3);

      const baseDist = idleDistance(camera.aspect);
      const zoomDist = THREE.MathUtils.lerp(baseDist, Math.max(6.8, baseDist * 0.68), eZoom);
      const idleY = 1.35 + parallax.y * -0.08;

      const camX = THREE.MathUtils.lerp(parallax.x * 0.28 * (1 - eZoom), 0.0, eo);
      const camY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(idleY, 1.55, eZoom), 9.4, eo);
      const camZ = THREE.MathUtils.lerp(zoomDist, 0.12, eo);

      camera.position.set(camX, camY, camZ);
      lookAt.set(
        THREE.MathUtils.lerp(0, -0.08, eZoom * (1 - eo)),
        THREE.MathUtils.lerp(0.95, 0.45, eo),
        0
      );
      camera.lookAt(lookAt);
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', onMove);
      renderer.domElement.removeEventListener('pointerdown', onClick);
      renderer.domElement.removeEventListener('pointerleave', onLeave);
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      delete window.__CARAVELLE_STAGE__;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      data-testid="caravelle-3d-canvas"
      className="absolute inset-0 h-full w-full bg-[#09090B]"
      aria-label="Volkswagen Caravelle T5 bianco in 3D"
    />
  );
}
