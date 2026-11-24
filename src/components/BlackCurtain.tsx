import { motion } from 'motion/react';
import { ArrowLeft, MapPin, Play, Route } from 'lucide-react';
import { ROUTE_STOPS } from '../data/routeData';
import type { SeatBooking } from '../types/roadtrip';

interface BlackCurtainProps {
  myBooking: SeatBooking | null;
  onStartTrailer: () => void;
  onBackToCabin: () => void;
}

export function BlackCurtain({
  myBooking,
  onStartTrailer,
  onBackToCabin,
}: BlackCurtainProps) {
  return (
    <motion.section
      aria-label="Anteprima percorso Trento Zagarolo"
      data-testid="black-curtain"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#050507] px-5 py-6 text-[#F5F6F8] sm:px-10 sm:py-8"
    >
      {/* Subtle warm horizon glow at bottom */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-[#10B981]/10 via-transparent to-transparent"
        aria-hidden="true"
      />

      {/* Top Navigation */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBackToCabin}
          data-testid="curtain-back-cabin-btn"
          className="tactile-btn inline-flex min-h-[44px] items-center gap-2 rounded-full border border-white/12 bg-white/5 px-4 py-2 text-xs font-semibold text-[#D6DCE5] hover:border-white/25 hover:bg-white/10 hover:text-[#F5F6F8] sm:text-sm"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Torna alla cabina</span>
        </button>

        {myBooking && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#10B981]/30 bg-[#10B981]/12 px-3.5 py-1.5 text-xs font-semibold text-[#6EE7B7]">
            <span className="font-mono-telemetry">{myBooking.seatId}</span>
            <span aria-hidden="true">·</span>
            <span>{myBooking.firstName}</span>
          </div>
        )}
      </header>

      {/* Center Editorial Reveal */}
      <div className="relative z-10 mx-auto my-auto flex w-full max-w-4xl flex-col items-center py-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-[#C7D0DC]"
        >
          <Route className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
          <span className="font-mono-telemetry">738 km · A22 → A1 → A14</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: [0.23, 1, 0.32, 1] }}
          className="mt-5 text-[36px] leading-[1.06] font-extrabold tracking-[-0.03em] text-[#F5F6F8] sm:text-[60px]"
        >
          Vedi percorso.
          <span className="block text-[#A4AEBC]">Da Trento alle porte di&nbsp;Roma.</span>
        </motion.h1>

        {/* Clean Route Stops Preview Strip */}
        <motion.ol
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5"
        >
          {ROUTE_STOPS.map((stop, idx) => (
            <li
              key={stop.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-[#11151B] px-3 py-1.5 text-xs text-[#D6DCE5]"
            >
              <MapPin
                className={`h-3 w-3 shrink-0 ${
                  stop.isFinale
                    ? 'text-[#E5B769]'
                    : stop.isHighwayEntry
                      ? 'text-[#34D399]'
                      : 'text-[#10B981]'
                }`}
                aria-hidden="true"
              />
              <span className="font-medium">
                {idx === 0
                  ? 'Trento'
                  : idx === 1
                    ? 'Torre Vanga'
                    : idx === 2
                      ? 'Pomarolo'
                      : idx === 3
                        ? 'Riva del Garda'
                        : idx === 4
                          ? 'Autostrada A22'
                          : idx === 5
                            ? 'Cesena'
                            : 'Zagarolo (RM)'}
              </span>
            </li>
          ))}
        </motion.ol>

        {/* Primary Launch Trailer CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="mt-10 flex flex-col items-center gap-3 sm:flex-row"
        >
          <button
            type="button"
            onClick={onStartTrailer}
            data-testid="launch-trailer-btn"
            className="tactile-btn tactile-lift inline-flex min-h-[56px] items-center justify-center gap-3 rounded-full bg-[#10B981] px-8 py-4 text-base font-bold text-[#042419] shadow-[0_18px_40px_-10px_rgba(16,185,129,0.58)] hover:bg-[#34D399]"
          >
            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
            <span>Avvia trailer</span>
          </button>
        </motion.div>
      </div>

      {/* Bottom Caption */}
      <footer className="relative z-10 mx-auto w-full max-w-5xl text-center text-xs text-[#7D8796]">
        Trailer 3D interattivo in tempo reale · Puoi tornare alla cabina per cambiare posto in qualsiasi&nbsp;momento.
      </footer>
    </motion.section>
  );
}
