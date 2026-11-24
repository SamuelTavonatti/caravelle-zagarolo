import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Compass, DoorOpen, Users } from 'lucide-react';
import type { BookingsMap } from '../types/roadtrip';
import { Caravelle3DStage } from './Caravelle3DStage';

interface ActOneExteriorProps {
  bookings: BookingsMap;
  mySeatId: string | null;
  onEnterCabin: () => void;
  onJumpToTrailer: () => void;
}

export function ActOneExterior({
  bookings,
  mySeatId,
  onEnterCabin,
  onJumpToTrailer,
}: ActOneExteriorProps) {
  const [doorPhase, setDoorPhase] = useState<'closed' | 'sliding' | 'overhead'>('closed');
  const [doorHovered, setDoorHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  const bookedCount = Object.keys(bookings).length;
  const freeCount = 8 - bookedCount;

  const triggerDoorOpen = () => {
    if (doorPhase !== 'closed') return;
    if (prefersReducedMotion) {
      onEnterCabin();
      return;
    }
    setDoorPhase('sliding');
    window.setTimeout(() => {
      setDoorPhase('overhead');
    }, 540);
    window.setTimeout(() => {
      onEnterCabin();
    }, 1220);
  };

  return (
    <section
      aria-label="Studio 3D Volkswagen Caravelle T5 — Trento Zagarolo"
      className="relative h-[100dvh] w-full overflow-hidden select-none bg-[#09090B]"
      data-testid="act-one-exterior"
    >
      {/* True Interactive 3D Studio WebGL Scene (Three.js) */}
      <motion.div
        className="absolute inset-0 h-full w-full"
        animate={{ opacity: doorPhase === 'overhead' ? 0.15 : 1 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <Caravelle3DStage
          doorPhase={doorPhase}
          onDoorClick={triggerDoorOpen}
          onDoorHoverChange={setDoorHovered}
        />
      </motion.div>

      {/* Subtle Bottom Scrim for Sharp Editorial Legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-transparent"
      />

      {/* Top Architectural Header Bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 border-b border-white/12 bg-[#09090B]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="pointer-events-auto flex items-center gap-2.5 whitespace-nowrap">
            <span className="h-2 w-2 bg-[#10B981]" aria-hidden="true" />
            <span className="font-mono-telemetry text-xs font-semibold tracking-[0.08em] uppercase text-[#F8FAFC]">
              VW CARAVELLE T5
            </span>
            <span className="hidden font-mono-telemetry text-xs text-[#A1A1AA] sm:inline">
              / 2008 · STUDIO 3D
            </span>
          </div>

          <nav
            aria-label="Accesso rapido"
            className="pointer-events-auto flex items-center border border-white/15 bg-[#09090B]/85"
          >
            <button
              type="button"
              onClick={onEnterCabin}
              data-testid="quick-jump-seats"
              className="tactile-btn inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-[#F8FAFC] hover:bg-white/10 sm:px-4"
            >
              <Users className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
              <span>Vai ai posti</span>
            </button>
            <span className="h-5 w-px bg-white/15" aria-hidden="true" />
            <button
              type="button"
              onClick={onJumpToTrailer}
              data-testid="quick-jump-route"
              className="tactile-btn inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-xs font-semibold text-[#F8FAFC] hover:bg-white/10 sm:px-4"
            >
              <Compass className="h-3.5 w-3.5 text-[#4285F4]" aria-hidden="true" />
              <span>Vedi percorso</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Bottom Architectural Editorial Fold (Strict 100dvh) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-white/12 bg-[#09090B]/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-6">
          <div className="pointer-events-auto max-w-2xl">
            <h1 className="text-[30px] leading-[1.02] font-extrabold tracking-[-0.035em] text-[#F8FAFC] sm:text-[48px]">
              Trento → Zagarolo.
              <span className="block font-semibold text-[#A1A1AA]">
                Scegli il tuo posto a&nbsp;bordo.
              </span>
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono-telemetry text-[11px] font-medium tracking-[0.06em] uppercase text-[#A1A1AA] sm:text-xs">
              <span className="text-[#F8FAFC]">707 KM</span>
              <span aria-hidden="true">·</span>
              <span>4 TAPPE</span>
              <span aria-hidden="true">·</span>
              <span data-testid="hero-availability-badge" className="text-[#F8FAFC]">
                {freeCount}/8 DISPONIBILI
              </span>
              {mySeatId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="border border-[#10B981]/50 bg-[#10B981]/15 px-2 py-0.5 text-[#34D399]">
                    POSTO {mySeatId}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              onClick={triggerDoorOpen}
              disabled={doorPhase !== 'closed'}
              data-testid="open-door-cta"
              className="tactile-btn inline-flex min-h-[50px] items-center justify-center gap-3 rounded-[4px] bg-[#10B981] px-6 py-3.5 text-sm font-bold tracking-tight text-[#042419] hover:bg-[#34D399] disabled:opacity-75 sm:text-base"
            >
              <DoorOpen className="h-4 w-4" aria-hidden="true" />
              <span>
                {doorPhase === 'closed'
                  ? 'Apri il portellone'
                  : doorPhase === 'sliding'
                    ? 'Apertura portellone…'
                    : 'Ingresso in cabina…'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-center text-xs text-[#A1A1AA] sm:text-right">
              {doorHovered
                ? 'Clicca sul portellone 3D per aprirlo'
                : 'Puoi anche cliccare direttamente sul portellone 3D del\u00A0Caravelle'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
