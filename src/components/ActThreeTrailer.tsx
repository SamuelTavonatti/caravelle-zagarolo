import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createCaravelleRig, type CaravelleRig } from '../lib/caravelleModel';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  FastForward,
  Layers,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  Users,
} from 'lucide-react';
import { CONTINUOUS_LEGS, CONTINUOUS_ROUTE, ROUTE_STOPS } from '../data/routeData';
import type { RouteStop } from '../types/roadtrip';

interface ActThreeTrailerProps {
  onBackToCabin: () => void;
}

type TimelineSegment =
  | {
      kind: 'stop';
      stopIndex: number;
      stop: RouteStop;
      startTime: number;
      endTime: number;
    }
  | {
      kind: 'leg';
      legIndex: number;
      startTime: number;
      endTime: number;
    };

function buildTimeline(): { segments: TimelineSegment[]; totalDuration: number } {
  const segments: TimelineSegment[] = [];
  let cursor = 0;

  segments.push({
    kind: 'stop',
    stopIndex: 0,
    stop: ROUTE_STOPS[0],
    startTime: cursor,
    endTime: (cursor += 1.4),
  });

  for (let i = 0; i < CONTINUOUS_LEGS.length; i++) {
    const leg = CONTINUOUS_LEGS[i];
    segments.push({
      kind: 'leg',
      legIndex: i,
      startTime: cursor,
      endTime: (cursor += leg.durationSec),
    });

    const stop = ROUTE_STOPS[i + 1];
    const holdDuration = stop.isHighwayEntry ? 2.2 : stop.isFinale ? 1.1 : 1.9;
    segments.push({
      kind: 'stop',
      stopIndex: i + 1,
      stop,
      startTime: cursor,
      endTime: (cursor += holdDuration),
    });
  }

  return { segments, totalDuration: cursor };
}

function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

function computeBearingDeg(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(from[1]);
  const lat2 = toRad(to[1]);
  const dLng = toRad(to[0] - from[0]);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/**
 * Shortest-angle interpolation with exponential low-pass damping (lerp = 0.06)
 * and per-frame angular velocity clamp to guarantee ZERO 360° camera spins.
 */
function smoothBearingShortestArc(
  currentBearing: number,
  targetBearing: number,
  lerpFactor = 0.06
): number {
  const shortestDelta = ((targetBearing - currentBearing + 540) % 360) - 180;
  const step = Math.max(-3.5, Math.min(3.5, shortestDelta * lerpFactor));
  return (currentBearing + step + 360) % 360;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

interface RouteMetrics {
  coords: [number, number][];
  cumKm: number[];
  totalKm: number;
}

function precomputeRouteMetrics(coords: [number, number][]): RouteMetrics {
  const cumKm: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumKm.push(cumKm[i - 1] + haversineMeters(coords[i - 1], coords[i]) / 1000);
  }
  return {
    coords,
    cumKm,
    totalKm: cumKm[cumKm.length - 1] || 1,
  };
}

function sampleContinuousRoute(
  metrics: RouteMetrics,
  distanceKm: number
): {
  coord: [number, number];
  lookAheadCoord: [number, number];
  traveledCoords: [number, number][];
} {
  const { coords, cumKm, totalKm } = metrics;
  const targetKm = Math.max(0, Math.min(totalKm, distanceKm));

  // Binary search for exact segment index along continuous polyline
  let lo = 0;
  let hi = cumKm.length - 2;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cumKm[mid] <= targetKm && targetKm <= cumKm[mid + 1]) {
      lo = mid;
      break;
    } else if (cumKm[mid] < targetKm) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  const idx = Math.max(0, Math.min(coords.length - 2, lo));
  const segKm = cumKm[idx + 1] - cumKm[idx] || 0.0001;
  const localT = Math.max(0, Math.min(1, (targetKm - cumKm[idx]) / segKm));

  const p0 = coords[idx];
  const p1 = coords[idx + 1];
  const coord: [number, number] = [
    p0[0] + (p1[0] - p0[0]) * localT,
    p0[1] + (p1[1] - p0[1]) * localT,
  ];

  // Look ahead at least 120m along the continuous road polyline for smooth, jitter-free heading
  const lookAheadKm = Math.min(totalKm, targetKm + 0.18);
  let laIdx = idx;
  while (laIdx < cumKm.length - 2 && cumKm[laIdx + 1] < lookAheadKm) {
    laIdx++;
  }
  const laSegKm = cumKm[laIdx + 1] - cumKm[laIdx] || 0.0001;
  const laT = Math.max(0, Math.min(1, (lookAheadKm - cumKm[laIdx]) / laSegKm));
  const lp0 = coords[laIdx];
  const lp1 = coords[laIdx + 1];
  const lookAheadCoord: [number, number] = [
    lp0[0] + (lp1[0] - lp0[0]) * laT,
    lp0[1] + (lp1[1] - lp0[1]) * laT,
  ];

  const traveledCoords = [...coords.slice(0, idx + 1), coord];
  return { coord, lookAheadCoord, traveledCoords };
}

interface Caravelle3DPuck {
  element: HTMLDivElement;
  update: (distanceMeters: number, steerDeg: number) => void;
  dispose: () => void;
}

/** True 3D WebGL miniature of the sculpted Caravelle T5 GLB, rendered on a transparent canvas anchored to the marker. */
function createCaravelle3DPuck(): Caravelle3DPuck {
  const W = 120;
  const H = 176;
  const wrapper = document.createElement('div');
  wrapper.setAttribute('data-testid', 'mini-caravelle-marker');
  wrapper.style.width = `${W}px`;
  wrapper.style.height = `${H}px`;
  wrapper.style.pointerEvents = 'none';

  let renderer: THREE.WebGLRenderer | null = null;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    renderer = null;
  }
  if (!renderer) {
    return { element: wrapper, update: () => {}, dispose: () => {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.setAttribute('data-testid', 'mini-caravelle-3d-canvas');
  renderer.domElement.style.display = 'block';
  wrapper.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 60);
  camera.position.set(0, 9.4, 7.4);
  camera.lookAt(0, 0.5, -0.1);

  const key = new THREE.DirectionalLight(0xffffff, 2.0);
  key.position.set(-3, 8, 4);
  scene.add(key);

  // cyan navigation underglow + soft drop shadow
  const mk = (stops: Array<[number, string]>) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d')!;
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    stops.forEach(([o, col]) => gr.addColorStop(o, col));
    g.fillStyle = gr;
    g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  };
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 7.6),
    new THREE.MeshBasicMaterial({
      map: mk([[0, 'rgba(56,189,248,0.55)'], [0.6, 'rgba(66,133,244,0.22)'], [1, 'rgba(66,133,244,0)']]),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.01;
  scene.add(glow);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.7, 6.0),
    new THREE.MeshBasicMaterial({
      map: mk([[0, 'rgba(0,0,0,0.55)'], [0.7, 'rgba(0,0,0,0.25)'], [1, 'rgba(0,0,0,0)']]),
      transparent: true,
      depthWrite: false,
    })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  scene.add(shadow);

  let rig: CaravelleRig | null = null;
  let dist = 0;
  let steer = 0;
  let alive = true;
  let lastDraw = 0;
  const draw = () => {
    if (!alive || !renderer) return;
    if (rig) {
      rig.root.rotation.y = Math.PI / 2 - steer * 0.22;
      for (const w of rig.wheels) {
        w.spin.rotation.z = -dist / 0.34;
        if (w.front) w.steer.rotation.y = steer;
      }
    }
    renderer.render(scene, camera);
  };

  createCaravelleRig()
    .then((r) => {
      if (!alive) return;
      rig = r;
      r.root.rotation.y = Math.PI / 2; // nose points up-screen (map bearing = vehicle heading)
      r.root.scale.setScalar(0.92);
      scene.add(r.root);
      wrapper.setAttribute('data-glb', 'loaded');
      draw();
    })
    .catch(() => wrapper.setAttribute('data-glb', 'error'));

  return {
    element: wrapper,
    update: (distanceMeters, steerDeg) => {
      dist = distanceMeters;
      steer = (steerDeg * Math.PI) / 180;
      const now = performance.now();
      if (now - lastDraw < 45) return; // throttle mini-van WebGL redraws (~22 fps) to keep the map fluid
      lastDraw = now;
      draw();
    },
    dispose: () => {
      alive = false;
      pmrem.dispose();
      renderer?.dispose();
    },
  };
}

function formatEtaRemaining(remainingKm: number): string {
  const totalMinutes = Math.max(0, Math.round((remainingKm / 105) * 60));
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins} min`;
  return `${hrs}h ${String(mins).padStart(2, '0')}m`;
}

declare global {
  interface Window {
    __CARAVELLE_NAV_TELEMETRY__?: {
      startCoordinate: [number, number];
      maxBearingDelta: number;
      currentBearing: number;
      kmCovered: number;
      samples: number;
    };
  }
}

export function ActThreeTrailer({ onBackToCabin }: ActThreeTrailerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const puckRef = useRef<Caravelle3DPuck | null>(null);
  const mapReadyRef = useRef(false);

  const routeMetrics = useMemo(
    () => precomputeRouteMetrics(CONTINUOUS_ROUTE.coordinates),
    []
  );
  const { segments, totalDuration } = useMemo(() => buildTimeline(), []);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [mapMode, setMapMode] = useState<'daylight' | 'hybrid'>('daylight');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFinaleVisible, setIsFinaleVisible] = useState(false);

  const [hudState, setHudState] = useState({
    activeStopIndex: 0,
    badge: ROUTE_STOPS[0].badge,
    title: ROUTE_STOPS[0].title,
    roadBadge: 'Via Gocciadoro 1, Trento',
    overlayText: null as string | null,
    isHighwayBurst: false,
    kmCovered: 0,
    speedKmh: 0,
  });

  const elapsedRef = useRef(0);
  const isPlayingRef = useRef(true);
  const speedRef = useRef(1);
  const initialHeading = useMemo(
    () =>
      computeBearingDeg(
        CONTINUOUS_ROUTE.coordinates[0],
        CONTINUOUS_ROUTE.coordinates[Math.min(4, CONTINUOUS_ROUTE.coordinates.length - 1)]
      ),
    []
  );
  const smoothedBearingRef = useRef(initialHeading);
  const targetBearingRef = useRef(initialHeading);
  const lastHeadingAnchorRef = useRef<[number, number]>(CONTINUOUS_ROUTE.coordinates[0]);
  const lastHudCommitRef = useRef(0);

  isPlayingRef.current = isPlaying;
  speedRef.current = speedMultiplier;

  // Toggle optional satellite hybrid underlay layer inside MapLibre
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReadyRef.current) return;
    if (map.getLayer('hybrid-satellite-underlay')) {
      map.setLayoutProperty(
        'hybrid-satellite-underlay',
        'visibility',
        mapMode === 'hybrid' ? 'visible' : 'none'
      );
    }
  }, [mapMode]);

  // Initialize MapLibre GL JS with Google Maps Navigation Styling
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    window.__CARAVELLE_NAV_TELEMETRY__ = {
      startCoordinate: CONTINUOUS_ROUTE.coordinates[0],
      maxBearingDelta: 0,
      currentBearing: initialHeading,
      kmCovered: 0,
      samples: 0,
    };

    let map: maplibregl.Map | null = null;
    try {
      maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);
      map = new maplibregl.Map({
        container,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: CONTINUOUS_ROUTE.coordinates[0],
        zoom: 16.5,
        pitch: 58,
        bearing: initialHeading,
        interactive: false,
        attributionControl: { compact: true },
        maxPitch: 70,
      });

      mapRef.current = map;

      map.on('error', () => {
        // Keep playback resilient if an individual remote tile times out
      });

      map.on('load', () => {
        if (!map) return;
        mapReadyRef.current = true;

        try {
          map.setSky({
            'sky-color': '#DCE8F5',
            'sky-horizon-blend': 0.5,
            'horizon-color': '#F4F6F8',
            'horizon-fog-blend': 0.7,
            'fog-color': '#EEF1F4',
            'fog-ground-blend': 0.25,
          });
        } catch {
          // Ignore if WebGL sky unsupported
        }

        // Optional crisp daylight satellite hybrid raster source (Esri World Imagery free tiles, toggled on demand)
        const firstRoadLayer = map
          .getStyle()
          .layers.find((l) => l.id.includes('road') || l.id.includes('highway'))?.id;

        map.addSource('esri-satellite', {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          ],
          tileSize: 256,
          maxzoom: 18,
        });

        map.addLayer(
          {
            id: 'hybrid-satellite-underlay',
            type: 'raster',
            source: 'esri-satellite',
            layout: { visibility: 'none' },
            paint: { 'raster-opacity': 0.88 },
          },
          firstRoadLayer
        );

        // Full continuous OSRM route source
        map.addSource('full-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: CONTINUOUS_ROUTE.coordinates,
            },
          },
        });

        // Traveled route progress source
        map.addSource('traveled-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [CONTINUOUS_ROUTE.coordinates[0], CONTINUOUS_ROUTE.coordinates[0]],
            },
          },
        });

        // Stop waypoint markers source
        map.addSource('route-stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: ROUTE_STOPS.map((s) => ({
              type: 'Feature',
              properties: { id: s.id, title: s.badge },
              geometry: { type: 'Point', coordinates: s.coordinates },
            })),
          },
        });

        // Iconic Google Maps Route Casing (#1967D2)
        map.addLayer({
          id: 'gmaps-route-casing',
          type: 'line',
          source: 'full-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#1967D2',
            'line-width': 11,
            'line-opacity': 0.92,
          },
        });

        // Iconic Google Maps Route Blue Core (#4285F4)
        map.addLayer({
          id: 'gmaps-route-core',
          type: 'line',
          source: 'full-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#4285F4',
            'line-width': 7,
            'line-opacity': 0.98,
          },
        });

        // Already-traveled muted slate-blue trail (classic Google Maps navigation behind vehicle)
        map.addLayer({
          id: 'gmaps-traveled-trail',
          type: 'line',
          source: 'traveled-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#93C5FD',
            'line-width': 7,
            'line-opacity': 0.92,
          },
        });

        // Waypoint pins (crisp white with Google Maps blue ring)
        map.addLayer({
          id: 'gmaps-stop-pins',
          type: 'circle',
          source: 'route-stops',
          paint: {
            'circle-radius': 6.5,
            'circle-color': '#FFFFFF',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#1967D2',
          },
        });

        // Google Maps Navigation Puck
        const puck = createCaravelle3DPuck();
        puckRef.current = puck;
        const marker = new maplibregl.Marker({
          element: puck.element,
          rotationAlignment: 'viewport',
          pitchAlignment: 'viewport',
        })
          .setLngLat(CONTINUOUS_ROUTE.coordinates[0])
          .addTo(map);
        markerRef.current = marker;
      });
    } catch {
      // Resilient no-op if WebGL context unavailable
    }

    return () => {
      mapReadyRef.current = false;
      markerRef.current?.remove();
      markerRef.current = null;
      puckRef.current?.dispose();
      puckRef.current = null;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, [initialHeading]);

  // Frame-accurate continuous timeline evaluator (zero teleportation, zero 360° spins)
  const applyTimelineFrame = useCallback(
    (t: number, forceHud = false, isExplicitJump = false) => {
      const clampedT = Math.max(0, Math.min(totalDuration, t));
      const seg =
        segments.find((s) => clampedT >= s.startTime && clampedT <= s.endTime) ??
        segments[segments.length - 1];

      let distanceKm = 0;
      let zoom = 16.5;
      let pitch = 58;
      let activeStopIndex = 0;
      let badge = ROUTE_STOPS[0].badge;
      let title = ROUTE_STOPS[0].title;
      let roadBadge = 'Via Gocciadoro 1, Trento';
      let overlayText: string | null = null;
      let isHighwayBurst = false;
      let speedKmh = 0;

      if (seg.kind === 'stop') {
        const stop = seg.stop;
        distanceKm = stop.kmFromStart;
        zoom = stop.zoom;
        pitch = stop.pitch;
        activeStopIndex = seg.stopIndex;
        badge = stop.badge;
        title = stop.title;
        roadBadge = stop.isHighwayEntry ? 'Casello Rovereto Sud · A22 → A1 → A14' : stop.subtitle;
        overlayText = stop.overlayText ?? null;
        isHighwayBurst = Boolean(stop.isHighwayEntry);

        const segProgress =
          (clampedT - seg.startTime) / Math.max(0.01, seg.endTime - seg.startTime);

        if (stop.isHighwayEntry) {
          speedKmh = Math.round(54 + segProgress * 76);
          zoom = 14.0 - segProgress * 1.8;
          pitch = 62;
        } else {
          speedKmh = 0;
        }
      } else {
        const leg = CONTINUOUS_LEGS[seg.legIndex];
        const rawProgress =
          (clampedT - seg.startTime) / Math.max(0.01, seg.endTime - seg.startTime);
        const easedProgress = easeInOutSine(rawProgress);

        // Continuous meter-by-meter interpolation along single OSRM polyline
        distanceKm = leg.startKm + (leg.endKm - leg.startKm) * easedProgress;

        if (leg.isHighwaySegment && seg.legIndex >= 4) {
          const midArc = Math.sin(rawProgress * Math.PI);
          zoom = leg.zoom + (1 - midArc) * 1.4;
          pitch = 60;
          speedKmh = Math.round(leg.cruiseKmh - 10 + midArc * 14);
          isHighwayBurst = seg.legIndex === 4 && rawProgress < 0.25;
        } else {
          zoom = leg.zoom;
          pitch = leg.pitch;
          speedKmh = Math.round(leg.cruiseKmh * (0.74 + 0.26 * Math.sin(rawProgress * Math.PI)));
        }

        activeStopIndex = seg.legIndex;
        badge = leg.label;
        title = ROUTE_STOPS[seg.legIndex + 1].title;
        roadBadge = leg.roadBadge;
      }

      const sampled = sampleContinuousRoute(routeMetrics, distanceKm);

      // Update heading ONLY if we moved > 25m from last heading anchor (eliminates micro-kink 360° jitter)
      const movedMeters = haversineMeters(lastHeadingAnchorRef.current, sampled.coord);
      const lookAheadMeters = haversineMeters(sampled.coord, sampled.lookAheadCoord);
      if ((movedMeters > 25 || isExplicitJump) && lookAheadMeters > 25) {
        targetBearingRef.current = computeBearingDeg(sampled.coord, sampled.lookAheadCoord);
        lastHeadingAnchorRef.current = sampled.coord;
      }

      const prevBearing = smoothedBearingRef.current;
      const nextBearing = isExplicitJump
        ? targetBearingRef.current
        : smoothBearingShortestArc(prevBearing, targetBearingRef.current, 0.06);

      smoothedBearingRef.current = nextBearing;

      // Record bearing stability telemetry for QA verification
      if (!isExplicitJump && window.__CARAVELLE_NAV_TELEMETRY__) {
        const frameDelta = Math.abs(((nextBearing - prevBearing + 540) % 360) - 180);
        window.__CARAVELLE_NAV_TELEMETRY__.maxBearingDelta = Math.max(
          window.__CARAVELLE_NAV_TELEMETRY__.maxBearingDelta,
          frameDelta
        );
        window.__CARAVELLE_NAV_TELEMETRY__.currentBearing = nextBearing;
        window.__CARAVELLE_NAV_TELEMETRY__.kmCovered = distanceKm;
        window.__CARAVELLE_NAV_TELEMETRY__.samples += 1;
      }

      const map = mapRef.current;
      if (map && mapReadyRef.current) {
        map.jumpTo({
          center: sampled.coord,
          zoom,
          pitch,
          bearing: nextBearing,
        });

        markerRef.current?.setLngLat(sampled.coord);
        const steerDelta = ((nextBearing - prevBearing + 540) % 360) - 180;
        puckRef.current?.update(distanceKm * 1000, Math.max(-28, Math.min(28, steerDelta * 14)));

        const traveledSource = map.getSource('traveled-route') as maplibregl.GeoJSONSource | undefined;
        if (traveledSource) {
          traveledSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: sampled.traveledCoords,
            },
          });
        }
      }

      const now = performance.now();
      if (forceHud || now - lastHudCommitRef.current > 80) {
        lastHudCommitRef.current = now;
        setElapsedSec(clampedT);
        setHudState({
          activeStopIndex,
          badge,
          title,
          roadBadge,
          overlayText,
          isHighwayBurst,
          kmCovered: Math.round(distanceKm),
          speedKmh,
        });
      }

      if (clampedT >= totalDuration) {
        setIsPlaying(false);
        setIsFinaleVisible(true);
      }
    },
    [routeMetrics, segments, totalDuration]
  );

  // Smooth 60/120fps RAF loop
  useEffect(() => {
    let rafId = 0;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.25, (now - lastTs) / 1000);
      lastTs = now;

      if (isPlayingRef.current) {
        elapsedRef.current = Math.min(totalDuration, elapsedRef.current + dt * speedRef.current);
        applyTimelineFrame(elapsedRef.current);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [applyTimelineFrame, totalDuration]);

  const handleReplay = () => {
    setIsFinaleVisible(false);
    elapsedRef.current = 0;
    applyTimelineFrame(0, true, true);
    setIsPlaying(true);
  };

  const handleJumpToStop = (stopIdx: number) => {
    const targetSeg = segments.find((s) => s.kind === 'stop' && s.stopIndex === stopIdx);
    if (!targetSeg) return;
    setIsFinaleVisible(false);
    elapsedRef.current = targetSeg.startTime + 0.05;
    applyTimelineFrame(elapsedRef.current, true, true);
    if (stopIdx === ROUTE_STOPS.length - 1) {
      setIsPlaying(false);
      setIsFinaleVisible(true);
    } else {
      setIsPlaying(true);
    }
  };

  const totalKmDisplay = Math.round(routeMetrics.totalKm);
  const remainingKm = Math.max(0, totalKmDisplay - hudState.kmCovered);
  const progressPct = Math.min(100, (elapsedSec / totalDuration) * 100);

  return (
    <section
      aria-label="Navigazione 3D Trento Zagarolo"
      data-testid="act-three-trailer"
      className="relative h-[100dvh] w-full overflow-hidden bg-[#E5E7EB] select-none"
    >
      {/* Full-Viewport MapLibre GL JS Canvas */}
      <div ref={mapContainerRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />

      {/* TOP GOOGLE MAPS NAVIGATION TURN/STOP TELEMETRY BANNER (Dark-Bordered Architectural Bar) */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-5">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-2.5">
          {/* Classic Google Maps Navigation Direction Banner */}
          <div className="pointer-events-auto flex min-w-0 max-w-[72%] items-stretch overflow-hidden rounded-[4px] border border-black/40 bg-[#0F5338] text-[#F8FAFC] shadow-[0_8px_24px_rgba(0,0,0,0.35)] sm:max-w-lg">
            <div className="flex w-12 shrink-0 flex-col items-center justify-center border-r border-white/15 bg-[#0A3D29] px-2">
              <Navigation className="h-5 w-5 text-[#F8FAFC]" aria-hidden="true" />
              <span className="mt-1 font-mono-telemetry text-[10px] font-bold text-[#A7F3D0]">
                {hudState.speedKmh}
              </span>
            </div>
            <div className="min-w-0 px-3.5 py-2.5">
              <div className="flex items-center gap-2 font-mono-telemetry text-[11px] font-semibold tracking-[0.05em] text-[#A7F3D0]">
                <span className="truncate">{hudState.badge}</span>
                <span aria-hidden="true">·</span>
                <span className="shrink-0">{hudState.roadBadge}</span>
              </div>
              <p className="mt-0.5 truncate text-sm font-extrabold tracking-tight text-[#FFFFFF] sm:text-base">
                {hudState.title}
              </p>
            </div>
          </div>

          {/* Right: Map Layer Toggle (Daylight / Hybrid) + Return to Cabin */}
          <div className="pointer-events-auto flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMapMode((m) => (m === 'daylight' ? 'hybrid' : 'daylight'))}
              data-testid="toggle-map-mode-btn"
              aria-label="Cambia vista mappa tra stradale e satellitare ibrida"
              className="tactile-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] border border-white/15 bg-[#09090B]/92 px-3 py-2 text-xs font-semibold text-[#F8FAFC] hover:bg-[#18181B]"
            >
              <Layers className="h-4 w-4 text-[#4285F4]" aria-hidden="true" />
              <span className="hidden sm:inline">
                {mapMode === 'daylight' ? 'Satellite' : 'Mappa'}
              </span>
            </button>

            <button
              type="button"
              onClick={onBackToCabin}
              data-testid="trailer-back-cabin-btn"
              className="tactile-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] border border-white/15 bg-[#09090B]/92 px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:bg-[#18181B]"
            >
              <Users className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
              <span>Cabina</span>
            </button>
          </div>
        </div>
      </header>

      {/* CENTER PICKUP & HIGHWAY ENTRY TELEMETRY OVERLAY */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-4">
        <AnimatePresence mode="wait">
          {!isFinaleVisible && hudState.overlayText && (
            <motion.div
              key={hudState.overlayText}
              data-testid="trailer-stop-overlay"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.14 } }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
              className={`rounded-[4px] border px-6 py-4 text-center shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${
                hudState.isHighwayBurst
                  ? 'border-[#10B981] bg-[#0F5338] text-[#FFFFFF]'
                  : 'border-white/20 bg-[#09090B]/94 text-[#F8FAFC]'
              }`}
            >
              {hudState.isHighwayBurst ? (
                <div className="space-y-1">
                  <div className="font-mono-telemetry text-[11px] font-bold uppercase tracking-[0.08em] text-[#A7F3D0]">
                    CASELLO ROVERETO SUD · {hudState.speedKmh} KM/H
                  </div>
                  <p className="text-xl font-extrabold tracking-[-0.025em] sm:text-3xl">
                    Ingresso in Autostrada
                  </p>
                  <p className="font-mono-telemetry text-xs text-[#D1FAE5]">
                    A22 BRENNERO → A1 → A14 ADRIATICA
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="font-mono-telemetry text-[11px] font-bold uppercase tracking-[0.08em] text-[#4285F4]">
                    {hudState.badge}
                  </span>
                  <p className="text-2xl font-extrabold tracking-[-0.03em] text-[#F8FAFC] sm:text-4xl">
                    {hudState.overlayText}
                  </p>
                  <p className="text-xs text-[#A1A1AA] sm:text-sm">{hudState.title}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM GOOGLE MAPS DISTANCE / ETA PROGRESS BAR & STOP STEPPER */}
      {!isFinaleVisible && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 sm:p-5">
          <div className="pointer-events-auto mx-auto max-w-5xl overflow-hidden rounded-[4px] border border-white/15 bg-[#09090B]/94 text-[#F8FAFC] shadow-[0_14px_34px_rgba(0,0,0,0.45)]">
            {/* Google Maps Blue Progress Track */}
            <div className="h-1 w-full bg-white/12">
              <div
                className="h-full bg-[#4285F4] transition-[width] duration-100 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
              {/* Left: Controls + Tabular Distance / ETA */}
              <div className="flex items-center justify-between gap-3 sm:justify-start">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPlaying((p) => !p)}
                    aria-label={isPlaying ? 'Metti in pausa trailer' : 'Riprendi trailer'}
                    data-testid="trailer-play-pause-btn"
                    className="tactile-btn inline-flex h-11 w-11 items-center justify-center rounded-[4px] bg-[#4285F4] text-[#FFFFFF] hover:bg-[#3B82F6]"
                  >
                    {isPlaying ? (
                      <Pause className="h-4 w-4 fill-current" aria-hidden="true" />
                    ) : (
                      <Play className="h-4 w-4 fill-current" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSpeedMultiplier((s) => (s === 1 ? 2 : 1))}
                    data-testid="trailer-speed-btn"
                    className="tactile-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-[4px] border border-white/15 bg-[#141418] px-3 py-2 font-mono-telemetry text-xs font-bold text-[#F8FAFC] hover:border-white/30"
                  >
                    <FastForward className="h-3.5 w-3.5 text-[#A1A1AA]" aria-hidden="true" />
                    <span>{speedMultiplier}X</span>
                  </button>
                </div>

                {/* Google Maps Style Tabular ETA & Remaining Distance */}
                <div className="flex items-center gap-3 border-l border-white/12 pl-3 font-mono-telemetry text-xs">
                  <div>
                    <div className="text-sm font-bold text-[#10B981]">
                      {formatEtaRemaining(remainingKm)}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.05em] text-[#A1A1AA]">
                      {remainingKm} KM RESTANTI
                    </div>
                  </div>
                  <div className="hidden border-l border-white/12 pl-3 sm:block">
                    <div className="text-sm font-bold text-[#F8FAFC]">
                      {hudState.kmCovered} / {totalKmDisplay} KM
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.05em] text-[#A1A1AA]">
                      PERCORSI
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Sharp Stop Stepper */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {ROUTE_STOPS.map((stop, idx) => {
                  const isCurrent = hudState.activeStopIndex === idx;
                  const shortName =
                    idx === 0
                      ? 'Trento'
                      : idx === 1
                        ? 'Dani'
                        : idx === 2
                          ? 'Arianna'
                          : idx === 3
                            ? 'Riva'
                            : idx === 4
                              ? 'A22'
                              : idx === 5
                                ? 'Cesena'
                                : 'Roma';
                  return (
                    <button
                      key={stop.id}
                      type="button"
                      onClick={() => handleJumpToStop(idx)}
                      data-testid={`jump-stop-${stop.id}`}
                      className={`tactile-btn min-h-[36px] shrink-0 rounded-[2px] border px-2.5 py-1 font-mono-telemetry text-[11px] font-semibold uppercase ${
                        isCurrent
                          ? 'border-[#4285F4] bg-[#4285F4] text-[#FFFFFF]'
                          : 'border-white/12 bg-[#141418] text-[#D4D4D8] hover:border-white/30 hover:text-[#F8FAFC]'
                      }`}
                    >
                      {shortName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GRAND FINALE MONUMENTAL CINEMATIC END CARD ("Ben arrivati a Roma") */}
      <AnimatePresence>
        {isFinaleVisible && (
          <motion.div
            data-testid="finale-end-card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#050507]/94 px-6 text-center backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-3xl border-y border-white/12 py-10"
            >
              <p className="font-mono-telemetry text-xs font-semibold uppercase tracking-[0.16em] text-[#10B981]">
                ZAGAROLO (RM) · {totalKmDisplay} KM COMPLETATI
              </p>

              <h1 className="mt-4 text-[42px] leading-[1.02] font-extrabold tracking-[-0.035em] text-[#F8FAFC] sm:text-[72px]">
                Ben arrivati a&nbsp;Roma
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm text-[#A1A1AA] sm:text-base">
                Da Via Gocciadoro 1 a Trento fino a Zagarolo, passando per Torre Vanga,
                Pomarolo, Riva del Garda e&nbsp;Cesena.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleReplay}
                  data-testid="replay-trailer-btn"
                  className="tactile-btn inline-flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-[4px] bg-[#10B981] px-7 py-3 text-sm font-bold text-[#042419] hover:bg-[#34D399] sm:w-auto sm:text-base"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Rivedi trailer</span>
                </button>

                <button
                  type="button"
                  onClick={onBackToCabin}
                  data-testid="finale-back-cabin-btn"
                  className="tactile-btn inline-flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-[4px] border border-white/15 bg-[#111114] px-7 py-3 text-sm font-semibold text-[#F8FAFC] hover:border-white/30 sm:w-auto sm:text-base"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  <span>Torna alla cabina</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
