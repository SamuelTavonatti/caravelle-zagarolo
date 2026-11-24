import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  FastForward,
  Gauge,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Users,
} from 'lucide-react';
import { FULL_ROUTE_COORDINATES, ROUTE_LEGS, ROUTE_STOPS } from '../data/routeData';
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

  // Departure hold
  segments.push({
    kind: 'stop',
    stopIndex: 0,
    stop: ROUTE_STOPS[0],
    startTime: cursor,
    endTime: (cursor += 1.6),
  });

  // Interleave each leg and its destination stop
  for (let i = 0; i < ROUTE_LEGS.length; i++) {
    const leg = ROUTE_LEGS[i];
    segments.push({
      kind: 'leg',
      legIndex: i,
      startTime: cursor,
      endTime: (cursor += leg.durationSec),
    });

    const stop = ROUTE_STOPS[i + 1];
    const holdDuration = stop.isHighwayEntry ? 2.4 : stop.isFinale ? 1.2 : 2.1;
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

function haversineDistance(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function computeBearing(from: [number, number], to: [number, number]): number {
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

function interpolateBearing(current: number, target: number, factor: number): number {
  let diff = ((target - current + 540) % 360) - 180;
  return (current + diff * factor + 360) % 360;
}

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

interface LegSample {
  coord: [number, number];
  bearing: number;
  traveledCoords: [number, number][];
}

function sampleLegAt(coords: [number, number][], fraction: number): LegSample {
  if (coords.length < 2) {
    return { coord: coords[0], bearing: 180, traveledCoords: coords };
  }
  const cumDist: number[] = [0];
  for (let i = 1; i < coords.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineDistance(coords[i - 1], coords[i]));
  }
  const total = cumDist[cumDist.length - 1] || 1;
  const targetDist = Math.max(0, Math.min(1, fraction)) * total;

  let idx = 0;
  while (idx < cumDist.length - 2 && cumDist[idx + 1] < targetDist) {
    idx++;
  }
  const segLen = cumDist[idx + 1] - cumDist[idx] || 0.0001;
  const localT = Math.max(0, Math.min(1, (targetDist - cumDist[idx]) / segLen));
  const p0 = coords[idx];
  const p1 = coords[idx + 1];
  const coord: [number, number] = [
    p0[0] + (p1[0] - p0[0]) * localT,
    p0[1] + (p1[1] - p0[1]) * localT,
  ];

  // Look slightly ahead for smoother camera bearing
  const lookAheadIdx = Math.min(coords.length - 1, idx + 3);
  const bearing = computeBearing(p0, coords[lookAheadIdx]);
  const traveledCoords = [...coords.slice(0, idx + 1), coord];
  return { coord, bearing, traveledCoords };
}

function createCaravelleMarkerElement(): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'caravelle-map-marker';
  wrapper.style.width = '46px';
  wrapper.style.height = '76px';
  wrapper.style.display = 'flex';
  wrapper.style.alignItems = 'center';
  wrapper.style.justifyContent = 'center';
  wrapper.style.pointerEvents = 'none';
  wrapper.innerHTML = `
    <svg viewBox="0 0 64 112" width="42" height="72" style="filter: drop-shadow(0 10px 14px rgba(0,0,0,0.55));">
      <!-- Ground beacon ring -->
      <ellipse cx="32" cy="58" rx="28" ry="48" fill="rgba(16,185,129,0.22)" />
      <!-- Side mirrors -->
      <rect x="4" y="29" width="7" height="12" rx="3" fill="#1E293B" />
      <rect x="53" y="29" width="7" height="12" rx="3" fill="#1E293B" />
      <!-- White 2008 VW Caravelle T5 Roof & Body -->
      <rect x="10" y="6" width="44" height="100" rx="13" fill="#F8FAFC" stroke="#94A3B8" stroke-width="2" />
      <!-- Front Hood & Headlight Glow -->
      <path d="M 14 14 Q 32 7 50 14 L 50 22 Q 32 18 14 22 Z" fill="#E2E8F0" />
      <rect x="14" y="8" width="9" height="4" rx="2" fill="#FEF08A" />
      <rect x="41" y="8" width="9" height="4" rx="2" fill="#FEF08A" />
      <!-- Front Sloped Windshield -->
      <path d="M 14 23 Q 32 18 50 23 L 48 40 Q 32 37 16 40 Z" fill="#1E293B" />
      <!-- Roof Panel Specular Center -->
      <rect x="16" y="43" width="32" height="50" rx="5" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1" />
      <!-- Rear Window -->
      <rect x="16" y="95" width="32" height="7" rx="3" fill="#1E293B" />
      <!-- Red Rear Tail Lights -->
      <rect x="12" y="102" width="8" height="3" rx="1.5" fill="#EF4444" />
      <rect x="44" y="102" width="8" height="3" rx="1.5" fill="#EF4444" />
    </svg>
  `;
  return wrapper;
}

export function ActThreeTrailer({ onBackToCabin }: ActThreeTrailerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const mapReadyRef = useRef(false);

  const { segments, totalDuration } = useMemo(() => buildTimeline(), []);

  const [isPlaying, setIsPlaying] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [isFinaleVisible, setIsFinaleVisible] = useState(false);
  const [mapFallbackMode, setMapFallbackMode] = useState(false);

  // Live telemetry state (throttled cleanly to React HUD)
  const [hudState, setHudState] = useState({
    activeStopIndex: 0,
    badge: ROUTE_STOPS[0].badge,
    title: ROUTE_STOPS[0].title,
    roadBadge: 'Via Cocciadoro 1, Trento',
    overlayText: null as string | null,
    isHighwayBurst: false,
    kmCovered: 0,
    speedKmh: 0,
    currentCoord: ROUTE_STOPS[0].coordinates as [number, number],
  });

  const elapsedRef = useRef(0);
  const isPlayingRef = useRef(true);
  const speedRef = useRef(1);
  const smoothedBearingRef = useRef(185);
  const lastHudCommitRef = useRef(0);

  isPlayingRef.current = isPlaying;
  speedRef.current = speedMultiplier;

  // Initialize MapLibre GL JS (OpenFreeMap Liberty 3D Vector Tiles — 100% FOSS)
  useEffect(() => {
    const container = mapContainerRef.current;
    if (!container) return;

    let map: maplibregl.Map | null = null;
    try {
      maplibregl.setWorkerUrl(`${import.meta.env.BASE_URL}maplibre-gl-worker.mjs`);
      map = new maplibregl.Map({
        container,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: ROUTE_STOPS[0].coordinates,
        zoom: 16.4,
        pitch: 62,
        bearing: 185,
        interactive: false,
        attributionControl: { compact: true },
        maxPitch: 75,
      });

      mapRef.current = map;

      map.on('error', () => {
        // Keep map resilient if an individual tile times out
      });

      map.on('load', () => {
        if (!map) return;
        mapReadyRef.current = true;

        // Add subtle Apple Maps-inspired daylight atmospheric sky
        try {
          map.setSky({
            'sky-color': '#B8D4EC',
            'sky-horizon-blend': 0.55,
            'horizon-color': '#F3E5D0',
            'horizon-fog-blend': 0.75,
            'fog-color': '#E8EDF2',
            'fog-ground-blend': 0.35,
          });
        } catch {
          // Sky unsupported in older WebGL context — ignore gracefully
        }

        // Full upcoming route ribbon
        map.addSource('full-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: FULL_ROUTE_COORDINATES,
            },
          },
        });

        // Traveled luminous route ribbon
        map.addSource('traveled-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [ROUTE_STOPS[0].coordinates, ROUTE_STOPS[0].coordinates],
            },
          },
        });

        // Stop waypoint pins source
        map.addSource('route-stops', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: ROUTE_STOPS.map((s) => ({
              type: 'Feature',
              properties: {
                id: s.id,
                title: s.badge,
                isHighway: s.isHighwayEntry ? 1 : 0,
              },
              geometry: {
                type: 'Point',
                coordinates: s.coordinates,
              },
            })),
          },
        });

        // Crisp white outer casing for upcoming Apple Maps navigation route
        map.addLayer({
          id: 'route-upcoming-casing',
          type: 'line',
          source: 'full-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#FFFFFF',
            'line-width': 11,
            'line-opacity': 0.82,
          },
        });

        // Upcoming Apple Maps navigation cobalt track
        map.addLayer({
          id: 'route-upcoming-core',
          type: 'line',
          source: 'full-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#2563EB',
            'line-width': 6.5,
            'line-opacity': 0.78,
          },
        });

        // Luminous emerald outer halo for active traveled ribbon
        map.addLayer({
          id: 'route-traveled-glow',
          type: 'line',
          source: 'traveled-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#10B981',
            'line-width': 18,
            'line-blur': 8,
            'line-opacity': 0.56,
          },
        });

        // Crisp luminous emerald core ribbon
        map.addLayer({
          id: 'route-traveled-core',
          type: 'line',
          source: 'traveled-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#10B981',
            'line-width': 8,
            'line-opacity': 0.98,
          },
        });

        // Stop waypoint circles
        map.addLayer({
          id: 'route-stops-circles',
          type: 'circle',
          source: 'route-stops',
          paint: {
            'circle-radius': 7,
            'circle-color': '#F8FAFC',
            'circle-stroke-width': 3.5,
            'circle-stroke-color': '#10B981',
          },
        });

        // White 2008 VW Caravelle 3D Marker
        const markerEl = createCaravelleMarkerElement();
        const marker = new maplibregl.Marker({
          element: markerEl,
          rotationAlignment: 'map',
          pitchAlignment: 'map',
        })
          .setLngLat(ROUTE_STOPS[0].coordinates)
          .setRotation(185)
          .addTo(map);
        markerRef.current = marker;
      });
    } catch {
      setMapFallbackMode(true);
    }

    return () => {
      mapReadyRef.current = false;
      markerRef.current?.remove();
      markerRef.current = null;
      if (map) {
        map.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Precompute prefix coordinate arrays for fast traveled-route GeoJSON updates
  const legPrefixCoords = useMemo(() => {
    const prefixes: [number, number][][] = [];
    let acc: [number, number][] = [];
    for (let i = 0; i < ROUTE_LEGS.length; i++) {
      prefixes.push([...acc]);
      const pts = ROUTE_LEGS[i].coordinates;
      acc = acc.length === 0 ? [...pts] : [...acc, ...pts.slice(1)];
    }
    prefixes.push(acc);
    return prefixes;
  }, []);

  // Evaluate timeline frame at any timestamp t
  const applyTimelineFrame = useCallback(
    (t: number, forceHud = false) => {
      const clampedT = Math.max(0, Math.min(totalDuration, t));
      const seg =
        segments.find((s) => clampedT >= s.startTime && clampedT <= s.endTime) ??
        segments[segments.length - 1];

      let center: [number, number] = ROUTE_STOPS[0].coordinates;
      let zoom = 16.4;
      let pitch = 62;
      let targetBearing = smoothedBearingRef.current;
      let traveled: [number, number][] = [ROUTE_STOPS[0].coordinates, ROUTE_STOPS[0].coordinates];
      let activeStopIndex = 0;
      let badge = ROUTE_STOPS[0].badge;
      let title = ROUTE_STOPS[0].title;
      let roadBadge = 'Via Cocciadoro 1, Trento';
      let overlayText: string | null = null;
      let isHighwayBurst = false;
      let kmCovered = 0;
      let speedKmh = 0;

      if (seg.kind === 'stop') {
        const stop = seg.stop;
        center = stop.coordinates;
        zoom = stop.zoom;
        pitch = stop.pitch;
        activeStopIndex = seg.stopIndex;
        badge = stop.badge;
        title = stop.title;
        roadBadge = stop.isHighwayEntry ? 'Casello Rovereto Sud · A22 → A1 → A14' : stop.subtitle;
        overlayText = stop.overlayText ?? null;
        isHighwayBurst = Boolean(stop.isHighwayEntry);
        kmCovered = stop.kmFromStart;

        const segProgress =
          (clampedT - seg.startTime) / Math.max(0.01, seg.endTime - seg.startTime);

        if (stop.isHighwayEntry) {
          // Dedicated speed-ramp & sweeping camera push on highway entry
          speedKmh = Math.round(52 + segProgress * 78);
          zoom = 14.2 - segProgress * 2.2;
          pitch = 64;
          targetBearing = 168 + segProgress * 14;
        } else {
          speedKmh = 0;
          // Gentle Apple Maps orbiting breath at each pickup stop
          targetBearing = smoothedBearingRef.current + 0.14;
        }

        const prefixIdx = Math.min(seg.stopIndex, legPrefixCoords.length - 1);
        traveled =
          legPrefixCoords[prefixIdx].length >= 2
            ? legPrefixCoords[prefixIdx]
            : [stop.coordinates, stop.coordinates];
      } else {
        const leg = ROUTE_LEGS[seg.legIndex];
        const rawProgress =
          (clampedT - seg.startTime) / Math.max(0.01, seg.endTime - seg.startTime);
        const easedProgress = easeInOutSine(rawProgress);

        const sampled = sampleLegAt(leg.coordinates, easedProgress);
        center = sampled.coord;
        targetBearing = sampled.bearing;

        // Highway dynamic zoom & speed-ramp
        if (leg.isHighwaySegment && seg.legIndex >= 4) {
          const midArc = Math.sin(rawProgress * Math.PI);
          zoom = leg.zoom + (1 - midArc) * 1.6;
          pitch = 62;
          speedKmh = Math.round(leg.cruiseKmh - 12 + midArc * 16);
          isHighwayBurst = seg.legIndex === 4 && rawProgress < 0.28;
        } else {
          zoom = leg.zoom;
          pitch = leg.pitch;
          speedKmh = Math.round(leg.cruiseKmh * (0.72 + 0.28 * Math.sin(rawProgress * Math.PI)));
        }

        activeStopIndex = seg.legIndex;
        badge = leg.label;
        title = ROUTE_STOPS[seg.legIndex + 1].title;
        roadBadge = leg.roadBadge;

        const prevKm = ROUTE_STOPS[seg.legIndex].kmFromStart;
        const nextKm = ROUTE_STOPS[seg.legIndex + 1].kmFromStart;
        kmCovered = prevKm + (nextKm - prevKm) * easedProgress;

        const prefix = legPrefixCoords[seg.legIndex];
        traveled =
          prefix.length > 0
            ? [...prefix, ...sampled.traveledCoords.slice(1)]
            : sampled.traveledCoords;
      }

      smoothedBearingRef.current = interpolateBearing(
        smoothedBearingRef.current,
        targetBearing,
        0.09
      );

      // Update MapLibre 3D camera, route ribbon, and Caravelle marker at 60fps
      const map = mapRef.current;
      if (map && mapReadyRef.current) {
        map.jumpTo({
          center,
          zoom,
          pitch,
          bearing: smoothedBearingRef.current,
        });

        markerRef.current?.setLngLat(center).setRotation(smoothedBearingRef.current);

        const traveledSource = map.getSource('traveled-route') as maplibregl.GeoJSONSource | undefined;
        if (traveledSource) {
          traveledSource.setData({
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: traveled,
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
          kmCovered: Math.round(kmCovered),
          speedKmh,
          currentCoord: center,
        });
      }

      if (clampedT >= totalDuration) {
        setIsPlaying(false);
        setIsFinaleVisible(true);
      }
    },
    [legPrefixCoords, segments, totalDuration]
  );

  // 60/120 FPS requestAnimationFrame trailer loop
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
    applyTimelineFrame(0, true);
    setIsPlaying(true);
  };

  const handleJumpToStop = (stopIdx: number) => {
    const targetSeg = segments.find((s) => s.kind === 'stop' && s.stopIndex === stopIdx);
    if (!targetSeg) return;
    setIsFinaleVisible(false);
    elapsedRef.current = targetSeg.startTime + 0.05;
    applyTimelineFrame(elapsedRef.current, true);
    if (stopIdx === ROUTE_STOPS.length - 1) {
      setIsPlaying(false);
      setIsFinaleVisible(true);
    } else {
      setIsPlaying(true);
    }
  };

  const progressPct = Math.min(100, (elapsedSec / totalDuration) * 100);

  return (
    <section
      aria-label="Trailer 3D del percorso Trento Zagarolo"
      data-testid="act-three-trailer"
      className="relative h-[100dvh] w-full overflow-hidden bg-[#0A0D12] select-none"
    >
      {/* Full-Viewport 3D MapLibre Canvas */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      />

      {/* Resilient High-Craft SVG Fallback if WebGL is unavailable */}
      {mapFallbackMode && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0F1722]">
          <svg viewBox="0 0 800 900" className="h-full w-full max-w-3xl opacity-85" aria-hidden="true">
            <path
              d="M 290 120 Q 250 220 220 260 Q 270 300 350 430 Q 450 530 510 560 Q 560 680 580 790"
              fill="none"
              stroke="#10B981"
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Subtle Apple Maps-style Top & Bottom Readability Gradients */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-32 bg-gradient-to-b from-[#090B0E]/75 via-[#090B0E]/25 to-transparent"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-[#090B0E]/90 via-[#090B0E]/40 to-transparent"
        aria-hidden="true"
      />

      {/* TOP APPLE MAPS NAVIGATION HUD */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6 sm:pt-5">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-3">
          {/* Active Navigation Banner */}
          <div className="pointer-events-auto glass-dark flex items-center gap-3.5 rounded-[20px] px-4 py-3 text-[#F5F6F8] max-w-[74%] sm:max-w-md">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                hudState.isHighwayBurst
                  ? 'bg-[#10B981] text-[#042419]'
                  : 'bg-[#10B981]/18 text-[#34D399]'
              }`}
            >
              {hudState.isHighwayBurst ? (
                <Gauge className="h-5 w-5" aria-hidden="true" />
              ) : (
                <MapPin className="h-5 w-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-bold tracking-tight text-[#34D399]">
                  {hudState.badge}
                </span>
                <span className="font-mono-telemetry text-[11px] text-[#C7D0DC] shrink-0">
                  {hudState.kmCovered} / 738 km
                </span>
              </div>
              <p className="truncate text-sm font-bold text-[#F5F6F8] sm:text-base">
                {hudState.title}
              </p>
              <p className="truncate text-xs text-[#A4AEBC]">{hudState.roadBadge}</p>
            </div>
          </div>

          {/* Right: Speedometer + Return to Cabin Button */}
          <div className="pointer-events-auto flex items-center gap-2">
            <div className="glass-dark hidden items-center gap-2 rounded-full px-3.5 py-2 sm:inline-flex">
              <span className="font-mono-telemetry text-sm font-bold text-[#F5F6F8]">
                {hudState.speedKmh}
              </span>
              <span className="text-[11px] font-medium text-[#A4AEBC]">km/h</span>
            </div>

            <button
              type="button"
              onClick={onBackToCabin}
              data-testid="trailer-back-cabin-btn"
              className="tactile-btn glass-dark inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-[#F5F6F8] hover:bg-white/15 sm:text-sm"
            >
              <Users className="h-4 w-4 text-[#10B981]" aria-hidden="true" />
              <span>Cabina</span>
            </button>
          </div>
        </div>
      </header>

      {/* CENTER CINEMATIC PICKUP & HIGHWAY ENTRY OVERLAYS */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 flex -translate-y-1/2 justify-center px-4">
        <AnimatePresence mode="wait">
          {!isFinaleVisible && hudState.overlayText && (
            <motion.div
              key={hudState.overlayText}
              data-testid="trailer-stop-overlay"
              initial={{ opacity: 0, y: 18, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.96, transition: { duration: 0.16 } }}
              transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
              className={`rounded-[24px] px-6 py-4 text-center shadow-[0_24px_60px_-12px_rgba(0,0,0,0.75)] backdrop-blur-xl ${
                hudState.isHighwayBurst
                  ? 'border border-[#10B981]/55 bg-[#063826]/88 text-[#ECFDF5]'
                  : 'glass-dark text-[#F5F6F8]'
              }`}
            >
              {hudState.isHighwayBurst ? (
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 rounded-full bg-[#10B981] px-3 py-0.5 font-mono-telemetry text-[11px] font-bold uppercase tracking-wider text-[#042419]">
                    <span>Casello Rovereto Sud</span>
                    <span>·</span>
                    <span>{hudState.speedKmh} km/h</span>
                  </div>
                  <p className="text-xl font-extrabold tracking-tight sm:text-3xl">
                    Ingresso in Autostrada
                  </p>
                  <p className="font-mono-telemetry text-xs font-semibold text-[#A7F3D0] sm:text-sm">
                    A22 Brennero → A1 → A14 Adriatica
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <span className="font-mono-telemetry text-xs font-semibold uppercase tracking-wider text-[#34D399]">
                    {hudState.badge}
                  </span>
                  <p className="text-2xl font-extrabold tracking-tight text-[#F5F6F8] sm:text-4xl">
                    {hudState.overlayText}
                  </p>
                  <p className="text-xs text-[#C7D0DC] sm:text-sm">{hudState.title}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* BOTTOM PLAYBACK BAR & INTERACTIVE STOP TIMELINE */}
      {!isFinaleVisible && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="pointer-events-auto glass-dark mx-auto max-w-4xl rounded-[22px] p-3.5 sm:p-4">
            {/* Progress Track */}
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-[#10B981] transition-[width] duration-100 ease-linear"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  aria-label={isPlaying ? 'Metti in pausa trailer' : 'Riprendi trailer'}
                  data-testid="trailer-play-pause-btn"
                  className="tactile-btn inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#10B981] text-[#042419] hover:bg-[#34D399]"
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
                  className="tactile-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/12 bg-white/6 px-3.5 py-2 font-mono-telemetry text-xs font-semibold text-[#F5F6F8] hover:bg-white/12"
                >
                  <FastForward className="h-3.5 w-3.5 text-[#E5B769]" aria-hidden="true" />
                  <span>{speedMultiplier}x</span>
                </button>
              </div>

              {/* Direct Stop Stepper Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
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
                      className={`tactile-btn min-h-[36px] shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        isCurrent
                          ? 'bg-[#10B981] text-[#042419]'
                          : 'bg-white/6 text-[#C7D0DC] hover:bg-white/14 hover:text-[#F5F6F8]'
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
            transition={{ duration: 0.65, ease: [0.23, 1, 0.32, 1] }}
            className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#050507]/90 px-6 text-center backdrop-blur-xl"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
              className="max-w-3xl"
            >
              <p className="font-mono-telemetry text-xs font-semibold uppercase tracking-[0.18em] text-[#E5B769] sm:text-sm">
                Zagarolo (RM) · 738 km completati
              </p>

              <h1 className="mt-4 text-[42px] leading-[1.02] font-extrabold tracking-[-0.03em] text-[#F5F6F8] sm:text-[72px]">
                Ben arrivati a&nbsp;Roma
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-base text-[#C7D0DC] sm:text-lg">
                Tutti a bordo del Caravelle T5: da Via Cocciadoro a Trento fino a Zagarolo,
                passando per Torre Vanga, Pomarolo, Riva del Garda e&nbsp;Cesena.
              </p>

              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleReplay}
                  data-testid="replay-trailer-btn"
                  className="tactile-btn tactile-lift inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-[#10B981] px-7 py-3.5 text-base font-bold text-[#042419] hover:bg-[#34D399] sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  <span>Rivedi trailer</span>
                </button>

                <button
                  type="button"
                  onClick={onBackToCabin}
                  data-testid="finale-back-cabin-btn"
                  className="tactile-btn inline-flex min-h-[52px] w-full items-center justify-center gap-2.5 rounded-full border border-white/15 bg-white/8 px-7 py-3.5 text-base font-semibold text-[#F5F6F8] hover:bg-white/14 sm:w-auto"
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
