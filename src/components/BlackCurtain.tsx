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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="relative flex min-h-[100dvh] w-full flex-col justify-between overflow-hidden bg-[#050507] text-[#F8FAFC]"
    >
      {/* Top Hairline Bar */}
      <header className="relative z-10 border-b border-white/12">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <button
            type="button"
            onClick={onBackToCabin}
            data-testid="curtain-back-cabin-btn"
            className="tactile-btn inline-flex min-h-[44px] items-center gap-2 rounded-[4px] border border-white/15 bg-[#09090B] px-4 py-2 text-xs font-semibold text-[#E4E4E7] hover:border-white/30 hover:text-[#F8FAFC] sm:text-sm"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Torna alla cabina</span>
          </button>

          {myBooking && (
            <div className="inline-flex items-center gap-2 rounded-[2px] border border-[#10B981]/45 bg-[#10B981]/12 px-3 py-1.5 font-mono-telemetry text-xs font-semibold text-[#34D399]">
              <span>POSTO {myBooking.seatId}</span>
              <span aria-hidden="true">·</span>
              <span>{myBooking.firstName.toUpperCase()}</span>
            </div>
          )}
        </div>
      </header>

      {/* Center Editorial Reveal */}
      <div className="relative z-10 mx-auto my-auto flex w-full max-w-4xl flex-col items-center px-5 py-10 text-center sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
          className="inline-flex items-center gap-2 rounded-[2px] border border-white/15 bg-[#09090B] px-3 py-1.5 font-mono-telemetry text-xs font-medium tracking-[0.06em] uppercase text-[#A1A1AA]"
        >
          <Route className="h-3.5 w-3.5 text-[#4285F4]" aria-hidden="true" />
          <span>707 KM · A22 → A1 → A14</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
          className="mt-5 text-[36px] leading-[1.04] font-extrabold tracking-[-0.035em] text-[#F8FAFC] sm:text-[60px]"
        >
          Vedi percorso.
          <span className="block font-semibold text-[#A1A1AA]">
            Da Trento alle porte di&nbsp;Roma.
          </span>
        </motion.h1>

        {/* Sharp Architectural Waypoint Strip */}
        <motion.ol
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.18, ease: [0.23, 1, 0.32, 1] }}
          className="mt-8 grid w-full max-w-3xl grid-cols-2 gap-px border border-white/12 bg-white/12 sm:grid-cols-4"
        >
          {ROUTE_STOPS.map((stop, idx) => (
            <li
              key={stop.id}
              className={`flex items-center gap-2 bg-[#09090B] px-3 py-2.5 text-left text-xs ${
                idx === ROUTE_STOPS.length - 1 ? 'col-span-2 sm:col-span-2' : ''
              }`}
            >
              <MapPin
                className={`h-3.5 w-3.5 shrink-0 ${
                  stop.isFinale ? 'text-[#10B981]' : 'text-[#4285F4]'
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="font-mono-telemetry text-[10px] tracking-[0.06em] text-[#71717A]">
                  {stop.badge}
                </div>
                <div className="truncate font-semibold text-[#F8FAFC]">
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
                </div>
              </div>
            </li>
          ))}
        </motion.ol>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.26, ease: [0.23, 1, 0.32, 1] }}
          className="mt-9"
        >
          <button
            type="button"
            onClick={onStartTrailer}
            data-testid="launch-trailer-btn"
            className="tactile-btn inline-flex min-h-[54px] items-center justify-center gap-3 rounded-[4px] bg-[#10B981] px-8 py-3.5 text-base font-bold text-[#042419] hover:bg-[#34D399]"
          >
            <Play className="h-4 w-4 fill-current" aria-hidden="true" />
            <span>Avvia trailer</span>
          </button>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/12 px-4 py-4 text-center font-mono-telemetry text-[11px] tracking-[0.04em] text-[#71717A]">
        NAVIGAZIONE 3D CONTINUA SU RETE STRADALE OSRM · PUOI TORNARE ALLA CABINA IN QUALSIASI MOMENTO
      </footer>
    </motion.section>
  );
}
