import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Compass, DoorOpen, Users } from 'lucide-react';
import type { BookingsMap } from '../types/roadtrip';

interface ActOneExteriorProps {
  bookings: BookingsMap;
  mySeatId: string | null;
  onEnterCabin: () => void;
  onJumpToTrailer: () => void;
}

const CARAVELLE_PHOTO_URL = `${import.meta.env.BASE_URL}caravelle-side.jpg`;

export function ActOneExterior({
  bookings,
  mySeatId,
  onEnterCabin,
  onJumpToTrailer,
}: ActOneExteriorProps) {
  const [doorPhase, setDoorPhase] = useState<'closed' | 'sliding' | 'zooming'>('closed');
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
      setDoorPhase('zooming');
    }, 480);
    window.setTimeout(() => {
      onEnterCabin();
    }, 1020);
  };

  return (
    <section
      aria-label="Apertura Volkswagen Caravelle T5 — Trento Zagarolo"
      className="relative h-[100dvh] w-full overflow-hidden select-none bg-[#09090B]"
      data-testid="act-one-exterior"
    >
      {/* Continuous camera container: smooth push-in through the opened right-side sliding door */}
      <motion.div
        className="relative h-full w-full overflow-hidden will-change-transform"
        animate={
          doorPhase === 'zooming'
            ? {
                scale: 2.35,
                x: '4%',
                y: '-2%',
                opacity: 0,
              }
            : {
                scale: 1,
                x: '0%',
                y: '0%',
                opacity: 1,
              }
        }
        transition={
          doorPhase === 'zooming'
            ? { duration: 0.58, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.35 }
        }
      >
        {/* Aspect-locked 568:375 full-bleed cover stage so cropped sliding door aligns pixel-for-pixel at all viewports */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: 'max(100vw, calc(100dvh * 568 / 375))',
            height: 'max(100dvh, calc(100vw * 375 / 568))',
          }}
        >
          {/* Base Real Photograph of Right-Side Profile VW T5 Caravelle */}
          <img
            src={CARAVELLE_PHOTO_URL}
            alt="Volkswagen Caravelle T5 in profilo laterale destro con portellone scorrevole rivolto allo spettatore"
            className="block h-full w-full object-cover"
            draggable={false}
          />

          {/* Recessed Dark Cabin Aperture Revealed Behind the Sliding Door */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute overflow-hidden bg-[#09090B]"
            style={{
              left: '35.04%',
              top: '24.80%',
              width: '22.35%',
              height: '43.73%',
              opacity: doorPhase === 'closed' ? 0 : 1,
              transition: 'opacity 140ms ease',
            }}
          >
            {/* Subtle interior cabin depth geometry */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#141418] via-[#0B0B0E] to-[#050507]" />
            <div className="absolute inset-x-0 top-0 h-[12%] border-b border-white/10 bg-[#18181B]" />
            {/* Silhouette of middle-row headrests inside the real doorway */}
            <div className="absolute bottom-[14%] left-[12%] h-[42%] w-[28%] border border-white/10 bg-[#18181B]/90" />
            <div className="absolute bottom-[14%] left-[44%] h-[42%] w-[30%] border border-white/10 bg-[#1C1C21]/95" />
            {/* Bottom step-in threshold with restrained emerald courtesy strip */}
            <div className="absolute inset-x-0 bottom-0 h-[10%] border-t border-white/15 bg-[#111114] flex items-center justify-center">
              <span className="h-[2px] w-1/3 bg-[#10B981]" />
            </div>
            <div className="absolute inset-0 shadow-[inset_0_0_28px_rgba(0,0,0,0.88)]" />
          </div>

          {/* Independent GPU Layer: Real Cropped Sliding Door Panel Sliding Backward Along the Body Rail */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 will-change-transform"
            initial={false}
            animate={
              doorPhase === 'closed'
                ? { x: '0%', scale: 1 }
                : { x: '-21.8%', scale: 1.012 }
            }
            transition={{
              type: 'spring',
              duration: 0.45,
              bounce: 0,
            }}
            style={{
              clipPath: 'inset(24.80% 42.61% 31.47% 35.04%)',
              filter:
                doorPhase === 'closed'
                  ? 'none'
                  : 'drop-shadow(10px 8px 18px rgba(0,0,0,0.68))',
            }}
          >
            <img
              src={CARAVELLE_PHOTO_URL}
              alt=""
              className="block h-full w-full object-cover"
              draggable={false}
            />
          </motion.div>

          {/* Interactive Hit Zone Directly Over the Photographic Right-Side Sliding Door */}
          <button
            type="button"
            onClick={triggerDoorOpen}
            onMouseEnter={() => setDoorHovered(true)}
            onMouseLeave={() => setDoorHovered(false)}
            disabled={doorPhase !== 'closed'}
            aria-label="Apri il portellone scorrevole laterale destro del Caravelle"
            data-testid="sliding-door-trigger"
            className="absolute cursor-pointer bg-transparent focus-visible:outline-2 focus-visible:outline-[#10B981]"
            style={{
              left: '35.04%',
              top: '24.80%',
              width: '22.35%',
              height: '43.73%',
            }}
          >
            {/* Subtle architectural seam outline on hover */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 border transition-opacity duration-150 ${
                doorHovered && doorPhase === 'closed'
                  ? 'border-[#10B981] bg-[#10B981]/8 opacity-100'
                  : 'border-white/0 opacity-0'
              }`}
            />
            {/* Minimalist architectural door-handle marker */}
            {doorPhase === 'closed' && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute right-[8%] top-[44%] flex h-6 w-6 items-center justify-center rounded-[2px] border transition-colors ${
                  doorHovered
                    ? 'border-[#10B981] bg-[#10B981] text-[#052E1F]'
                    : 'border-white/40 bg-[#09090B]/75 text-[#F8FAFC]'
                }`}
              >
                <span className="h-1.5 w-1.5 bg-current" />
              </span>
            )}
          </button>
        </div>

        {/* Crisp Editorial Scrims for High-Contrast Typography */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#09090B]/80 via-[#09090B]/35 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-gradient-to-t from-[#09090B] via-[#09090B]/82 to-transparent"
        />
      </motion.div>

      {/* Top Architectural Header Bar — Zero Floating Rounded Pills */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 border-b border-white/12 bg-[#09090B]/72 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <div className="pointer-events-auto flex items-center gap-2.5 whitespace-nowrap">
            <span className="h-2 w-2 bg-[#10B981]" aria-hidden="true" />
            <span className="font-mono-telemetry text-xs font-semibold tracking-[0.08em] uppercase text-[#F8FAFC]">
              VW CARAVELLE T5
            </span>
            <span className="hidden font-mono-telemetry text-xs text-[#A1A1AA] sm:inline">
              / 2008 · TRENTO → ROMA
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
              <Compass className="h-3.5 w-3.5 text-[#A1A1AA]" aria-hidden="true" />
              <span>Vedi percorso</span>
            </button>
          </nav>
        </div>
      </header>

      {/* Bottom Architectural Editorial Fold (Strict 100dvh) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 border-t border-white/12 bg-[#09090B]/68 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-8 sm:py-6">
          <div className="pointer-events-auto max-w-2xl">
            <h1 className="text-[30px] leading-[1.02] font-extrabold tracking-[-0.035em] text-[#F8FAFC] sm:text-[48px]">
              Trento → Zagarolo.
              <span className="block font-semibold text-[#A1A1AA]">
                Scegli il tuo posto a&nbsp;bordo.
              </span>
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono-telemetry text-[11px] font-medium tracking-[0.06em] uppercase text-[#A1A1AA] sm:text-xs">
              <span className="text-[#F8FAFC]">738 KM</span>
              <span aria-hidden="true">·</span>
              <span>4 TAPPE</span>
              <span aria-hidden="true">·</span>
              <span className="text-[#F8FAFC]">{freeCount}/8 DISPONIBILI</span>
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
                {doorPhase === 'closed' ? 'Apri il portellone' : 'Accesso in cabina…'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-center text-xs text-[#A1A1AA] sm:text-right">
              Clicca il portellone laterale scorrevole per entrare nella mappa&nbsp;posti
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
