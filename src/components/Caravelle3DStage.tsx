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
    __CARAVELLE_STAGE__?: {
      doorScreen: () => { x: number; y: number } | null;
      doorProgress: () => number;
      hoverOpacity: () => number;
    };
  }
}

// Balanced automotive studio HDRI: overhead softbox strips + subtle cool floor bounce (zero front glare)
function createStudioEnvScene(): THREE.Scene {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x090b10);
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
  add(14, 1.0, 0xffffff, 5.5, [0, 9.5, -2.6], down);
  add(14, 1.0, 0xffffff, 5.5, [0, 9.5, 2.6], down);
  add(14, 0.45, 0xffffff, 7.0, [0, 9.5, 0], down);
  add(1.2, 7, 0xdbeafe, 2.6, [-11, 4.5, 0], [0, Math.PI / 2, 0]);
  add(1.2, 7, 0xdbeafe, 2.6, [11, 4.5, 0], [0, Math.PI / 2, 0]);
  add(20, 3.5, 0xcbd5e1, 0.7, [0, 3.5, -10], [0, 0, 0]);
  add(24, 24, 0x0ea5e9, 0.65, [0, -3, 0], [Math.PI / 2, 0, 0]);
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
  glow.addColorStop(0, 'rgba(56,189,248,0.14)');
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

/** Creates a realistic lit 3D cabin doorway interior texture (dark cabin, seats, dome light, step sill). */
function createCabinRecessTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 640;
  const ctx = c.getContext('2d')!;

  // Deep interior cabin gradient
  const bg = ctx.createLinearGradient(0, 0, 0, 640);
  bg.addColorStop(0, '#0B1220');
  bg.addColorStop(0.35, '#090D16');
  bg.addColorStop(1, '#06080E');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 640);

  // Overhead warm/cyan cabin dome light wash
  const dome = ctx.createRadialGradient(256, 48, 6, 256, 130, 260);
  dome.addColorStop(0, 'rgba(224,242,254,0.92)');
  dome.addColorStop(0.25, 'rgba(56,189,248,0.34)');
  dome.addColorStop(1, 'rgba(14,165,233,0)');
  ctx.fillStyle = dome;
  ctx.fillRect(0, 0, 512, 420);

  // Subtle far-side window glow
  ctx.fillStyle = 'rgba(30, 78, 121, 0.35)';
  ctx.fillRect(58, 72, 396, 175);

  // 3D-shaded dark upholstered bench seats (middle row + front seatback)
  // Rear-side seat headrest & backrest
  ctx.fillStyle = '#1E2532';
  ctx.beginPath();
  ctx.roundRect(72, 235, 118, 225, 18);
  ctx.fill();
  ctx.fillStyle = '#2B3548';
  ctx.beginPath();
  ctx.roundRect(84, 172, 74, 62, 14);
  ctx.fill();
  // Seat cushion extending forward
  ctx.fillStyle = '#19202C';
  ctx.beginPath();
  ctx.roundRect(72, 412, 215, 68, 14);
  ctx.fill();
  // Seat highlight rim from dome light
  ctx.strokeStyle = 'rgba(125,211,252,0.28)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(74, 237, 114, 220, 16);
  ctx.stroke();

  // Front passenger seatback edge on the right side of doorway
  ctx.fillStyle = '#181E29';
  ctx.beginPath();
  ctx.roundRect(410, 200, 88, 270, 16);
  ctx.fill();

  // Illuminated lower entry step & cyan courtesy LED
  ctx.fillStyle = '#111622';
  ctx.fillRect(0, 548, 512, 92);
  const stepGlow = ctx.createRadialGradient(420, 588, 4, 420, 588, 95);
  stepGlow.addColorStop(0, 'rgba(125,211,252,0.95)');
  stepGlow.addColorStop(0.5, 'rgba(14,165,233,0.35)');
  stepGlow.addColorStop(1, 'rgba(14,165,233,0)');
  ctx.fillStyle = stepGlow;
  ctx.fillRect(280, 510, 232, 130);

  // Crisp inner metallic doorway frame
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 630);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const idleDistance = (aspect: number) => Math.max(10.4, 6.5 / (0.4986 * Math.max(0.3, aspect)));

// Measured right sliding-door bounds on normalized uploaded caravelle-t5.glb (length 5.2, wall Z = 0.971)
const DOOR_CX = -0.19;
const DOOR_CY = 1.105;
const DOOR_W = 1.26;
const DOOR_H = 1.55;
const DOOR_Z = 0.985;

/** Hero stage: uploaded GLB Caravelle T5 with glare-free studio lighting, grounded tire shadows & interactive 3D sliding door. */
export function Caravelle3DStage({
  doorPhase,
  onDoorClick,
  onDoorHoverChange,
}: Caravelle3DStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(doorPhase);
  const slidingStartMsRef = useRef<number | null>(null);
  const clickRef = useRef(onDoorClick);
  const hoverRef = useRef(onDoorHoverChange);
  if (doorPhase === 'closed') {
    slidingStartMsRef.current = null;
  } else if (slidingStartMsRef.current === null) {
    slidingStartMsRef.current = performance.now();
  }
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
    renderer.toneMappingExposure = 0.96;
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
      new THREE.MeshStandardMaterial({ color: 0x050609, roughness: 0.88, metalness: 0.08, envMapIntensity: 0.1 })
    );
    (floor.material as THREE.MeshStandardMaterial).envMap = envTex;
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    // 1. Dark ambient-occlusion chassis shadow plane at y = 0.002
    const aoTex = radialTexture([
      [0, 'rgba(3,4,6,0.96)'],
      [0.55, 'rgba(3,4,6,0.72)'],
      [1, 'rgba(3,4,6,0)'],
    ]);
    const aoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 2.45),
      new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, depthWrite: false, fog: false })
    );
    aoPlane.rotation.x = -Math.PI / 2;
    aoPlane.position.y = 0.002;
    scene.add(aoPlane);

    // 2. Four tight, dark oval tire contact shadows directly beneath FR, FL, RR, RL at y = 0.004
    const tireShadowTex = radialTexture([
      [0, 'rgba(0,0,0,0.98)'],
      [0.52, 'rgba(0,0,0,0.78)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    const tireShadowMat = new THREE.MeshBasicMaterial({
      map: tireShadowTex,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    const tireCoords: Array<[number, number]> = [
      [1.663, 0.827],
      [1.663, -0.827],
      [-1.625, 0.851],
      [-1.625, -0.851],
    ];
    for (const [tx, tz] of tireCoords) {
      const ts = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.46), tireShadowMat);
      ts.rotation.x = -Math.PI / 2;
      ts.position.set(tx, 0.004, tz);
      scene.add(ts);
    }

    // 3. Richer cyan-azure floor underglow pool (#0EA5E9 / #38BDF8) beneath side sills between wheels
    const innerPoolTex = radialTexture([
      [0, 'rgba(56,189,248,0.95)'],
      [0.45, 'rgba(14,165,233,0.52)'],
      [1, 'rgba(14,165,233,0)'],
    ]);
    const innerPool = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 2.6),
      new THREE.MeshBasicMaterial({
        map: innerPoolTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    innerPool.rotation.x = -Math.PI / 2;
    innerPool.position.set(0.02, 0.006, 0.12);
    scene.add(innerPool);

    const outerPoolTex = radialTexture([
      [0, 'rgba(14,165,233,0.42)'],
      [0.5, 'rgba(14,165,233,0.16)'],
      [1, 'rgba(14,165,233,0)'],
    ]);
    const outerPool = new THREE.Mesh(
      new THREE.PlaneGeometry(9.2, 4.4),
      new THREE.MeshBasicMaterial({
        map: outerPoolTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      })
    );
    outerPool.rotation.x = -Math.PI / 2;
    outerPool.position.set(0, 0.005, 0);
    scene.add(outerPool);

    // 4. Precision Right Sliding Door Hit-Box + Cyan-Azure Hover Highlight & Border
    const doorHitBox = new THREE.Mesh(
      new THREE.PlaneGeometry(DOOR_W + 0.14, DOOR_H + 0.1),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    doorHitBox.position.set(DOOR_CX, DOOR_CY, DOOR_Z + 0.02);
    scene.add(doorHitBox);

    const doorTintMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const doorTint = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W, DOOR_H), doorTintMat);
    doorTint.position.set(DOOR_CX, DOOR_CY, DOOR_Z + 0.015);
    scene.add(doorTint);

    // Crisp #38BDF8 perimeter outline around the sliding door
    const hw = DOOR_W / 2;
    const hh = DOOR_H / 2;
    const borderGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-hw, -hh, 0),
      new THREE.Vector3(hw, -hh, 0),
      new THREE.Vector3(hw, hh, 0),
      new THREE.Vector3(-hw, hh, 0),
    ]);
    const borderMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const doorBorder = new THREE.LineLoop(borderGeo, borderMat);
    doorBorder.position.set(DOOR_CX, DOOR_CY, DOOR_Z + 0.018);
    scene.add(doorBorder);

    // Glowing door-handle & track-rail accent on hover (aligned directly over GLB handle & track groove)
    const accentMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    });
    const handleGlow = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.045), accentMat);
    handleGlow.position.set(0.32, 1.18, DOOR_Z + 0.022);
    scene.add(handleGlow);
    const railGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.48, 0.024), accentMat);
    railGlow.position.set(-1.58, 1.07, DOOR_Z + 0.02);
    scene.add(railGlow);

    // 5. Click-to-Open 3D Sliding Door Sequence (lit cabin recess + sliding 3D door panel)
    const recessMat = new THREE.MeshBasicMaterial({
      map: createCabinRecessTexture(),
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const cabinRecess = new THREE.Mesh(new THREE.PlaneGeometry(DOOR_W - 0.02, DOOR_H - 0.04), recessMat);
    cabinRecess.position.set(DOOR_CX, DOOR_CY, DOOR_Z + 0.01);
    cabinRecess.visible = false;
    scene.add(cabinRecess);

    const slidingPanelGroup = new THREE.Group();
    slidingPanelGroup.position.set(DOOR_CX, DOOR_CY, DOOR_Z + 0.028);
    slidingPanelGroup.visible = false;

    const panelWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xe8edf3,
      roughness: 0.55,
      metalness: 0.04,
      envMap: envTex,
      envMapIntensity: 0.6,
    });
    const panelGlassMat = new THREE.MeshStandardMaterial({
      color: 0x1b4965,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.14,
      roughness: 0.12,
      metalness: 0.25,
      envMap: envTex,
      envMapIntensity: 0.9,
    });
    const panelDarkMat = new THREE.MeshStandardMaterial({ color: 0x11141a, roughness: 0.72 });

    // Lower door body + upper frame + recessed azure window + black handle
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, 0.74, 0.045), panelWhiteMat);
    lowerBody.position.set(0, -0.405, 0);
    slidingPanelGroup.add(lowerBody);

    const upperTop = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W, 0.1, 0.045), panelWhiteMat);
    upperTop.position.set(0, 0.725, 0);
    slidingPanelGroup.add(upperTop);

    const leftPost = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.76, 0.045), panelDarkMat);
    leftPost.position.set(-DOOR_W / 2 + 0.04, 0.32, 0);
    slidingPanelGroup.add(leftPost);

    const rightPost = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.76, 0.045), panelWhiteMat);
    rightPost.position.set(DOOR_W / 2 - 0.035, 0.32, 0);
    slidingPanelGroup.add(rightPost);

    const doorWindow = new THREE.Mesh(new THREE.BoxGeometry(DOOR_W - 0.15, 0.68, 0.025), panelGlassMat);
    doorWindow.position.set(0.005, 0.32, -0.004);
    slidingPanelGroup.add(doorWindow);

    const doorHandle3D = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.036, 0.04), panelDarkMat);
    doorHandle3D.position.set(DOOR_W / 2 - 0.14, 0.02, 0.028);
    slidingPanelGroup.add(doorHandle3D);

    scene.add(slidingPanelGroup);

    // Soft atmospheric headlight beam haze extending gently to the right (+X)
    const beamCanvas = document.createElement('canvas');
    beamCanvas.width = 512;
    beamCanvas.height = 256;
    const bctx = beamCanvas.getContext('2d')!;
    bctx.save();
    bctx.translate(180, 128);
    bctx.scale(1.6, 0.75);
    const bg = bctx.createRadialGradient(0, 0, 10, 0, 0, 185);
    bg.addColorStop(0, 'rgba(186,230,253,0.32)');
    bg.addColorStop(0.45, 'rgba(56,189,248,0.13)');
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

    // Balanced, glare-free studio lighting (no front-facing +Z hotspot)
    scene.add(new THREE.HemisphereLight(0xdbeafe, 0x090b10, 0.44));
    const key = new THREE.DirectionalLight(0xf8fafc, 1.45);
    key.position.set(-2.5, 10.5, 3.2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7dd3fc, 1.1);
    rim.position.set(5.5, 3.5, -5.5);
    scene.add(rim);
    const underGlow = new THREE.PointLight(0x38bdf8, 1.35, 5.2, 1.8);
    underGlow.position.set(0, 0.16, 0.25);
    scene.add(underGlow);

    let disposed = false;
    let rig: Awaited<ReturnType<typeof createCaravelleRig>> | null = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let hovered = false;
    let hoverStrength = 0;
    let doorProgress = 0;
    let overheadProgress = 0;
    const parallax = { x: 0, y: 0, tx: 0, ty: 0 };
    const lookAt = new THREE.Vector3(0, 0.9, 0);

    createCaravelleRig(renderer.capabilities.getMaxAnisotropy())
      .then((r) => {
        if (disposed) return;
        rig = r;
        for (const m of r.materials) {
          m.envMap = envTex;
          m.needsUpdate = true;
        }
        scene.add(r.root);
        container.setAttribute('data-glb', 'loaded');
      })
      .catch(() => container.setAttribute('data-glb', 'error'));

    const doorCenter = new THREE.Vector3(DOOR_CX, DOOR_CY, DOOR_Z);
    window.__CARAVELLE_STAGE__ = {
      doorScreen: () => {
        const v = doorCenter.clone().project(camera);
        const rect = renderer.domElement.getBoundingClientRect();
        return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
      },
      doorProgress: () => doorProgress,
      hoverOpacity: () => doorTintMat.opacity,
    };

    const hitDoorOrVan = (ev: PointerEvent) => {
      if (!rig) return false;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects([doorHitBox, ...rig.hitMeshes], false).length > 0;
    };

    const onMove = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      parallax.tx = ((ev.clientX - rect.left) / rect.width - 0.5) * 2;
      parallax.ty = ((ev.clientY - rect.top) / rect.height - 0.5) * 2;
      if (phaseRef.current !== 'closed') return;
      const hit = hitDoorOrVan(ev);
      if (hit !== hovered) {
        hovered = hit;
        renderer.domElement.style.cursor = hit ? 'pointer' : 'default';
        hoverRef.current(hit);
      }
    };
    const onClick = (ev: PointerEvent) => {
      if (phaseRef.current !== 'closed') return;
      if (hitDoorOrVan(ev)) clickRef.current();
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

      // Smooth cyan-azure hover highlight fade (0 -> 0.22 tint, crisp #38BDF8 perimeter + handle/rail glow)
      const hoverTarget = phase === 'closed' && hovered ? 1 : 0;
      hoverStrength += (hoverTarget - hoverStrength) * Math.min(1, dt * 10);

      // Click-to-open sliding door animation (deterministic 480ms slide-open)
      if (phase === 'closed' || slidingStartMsRef.current === null) {
        doorProgress = 0;
      } else {
        doorProgress = Math.min(1, Math.max(0.05, (now - slidingStartMsRef.current) / 480));
      }
      window.__CARAVELLE_DOOR_MAX__ = Math.max(window.__CARAVELLE_DOOR_MAX__ ?? 0, doorProgress);

      // Brief cyan pulse at start of click, then reveal lit cabin recess & slide 3D door backward along rail
      const clickPulse = phase === 'sliding' ? Math.max(0, 1 - doorProgress * 3.5) : 0;
      doorTintMat.opacity = hoverStrength * 0.22 + clickPulse * 0.32;
      borderMat.opacity = Math.min(1, hoverStrength * 0.92 + clickPulse);
      accentMat.opacity = Math.min(0.65, hoverStrength * 0.55 + clickPulse * 0.65);

      const openingVisible = doorProgress > 0.02;
      cabinRecess.visible = openingVisible;
      slidingPanelGroup.visible = openingVisible;
      if (openingVisible) {
        const popOut = Math.min(1, doorProgress * 3.2);
        const slideBack = Math.max(0, (doorProgress - 0.08) / 0.92);
        const easedSlide = 1 - Math.pow(1 - slideBack, 3);
        recessMat.opacity = Math.min(1, doorProgress * 4.0);
        slidingPanelGroup.position.set(
          DOOR_CX - 1.18 * easedSlide,
          DOOR_CY,
          DOOR_Z + 0.025 + 0.065 * popOut
        );
      }

      // Smooth 90° top-down orbit into ActTwoCabin
      overheadProgress += ((phase === 'overhead' ? 1 : 0) - overheadProgress) * Math.min(1, dt * 4.4);
      const eZoom = 1 - Math.pow(1 - doorProgress, 3);
      const eo = 1 - Math.pow(1 - overheadProgress, 3);

      parallax.x += (parallax.tx - parallax.x) * Math.min(1, dt * 3);
      parallax.y += (parallax.ty - parallax.y) * Math.min(1, dt * 3);

      const baseDist = idleDistance(camera.aspect);
      const zoomDist = THREE.MathUtils.lerp(baseDist, Math.max(7.6, baseDist * 0.78), eZoom);
      const idleY = 1.35 + parallax.y * -0.08;

      const camX = THREE.MathUtils.lerp(parallax.x * 0.26 * (1 - eZoom), 0.0, eo);
      const camY = THREE.MathUtils.lerp(THREE.MathUtils.lerp(idleY, 1.48, eZoom), 9.4, eo);
      const camZ = THREE.MathUtils.lerp(zoomDist, 0.12, eo);

      camera.position.set(camX, camY, camZ);
      lookAt.set(
        THREE.MathUtils.lerp(0, DOOR_CX * 0.5, eZoom * (1 - eo)),
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
