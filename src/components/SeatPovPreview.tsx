import { motion } from 'motion/react';
import { Eye } from 'lucide-react';
import type { SeatDefinition } from '../types/roadtrip';

interface SeatPovPreviewProps {
  seat: SeatDefinition;
}

export function SeatPovPreview({ seat }: SeatPovPreviewProps) {
  const shiftX = seat.panOffset * 28;

  return (
    <div
      className="overflow-hidden rounded-[4px] border border-white/12 bg-[#111114]"
      data-testid="seat-pov-preview"
    >
      {/* 16:9 Architectural First-Person Schematic Perspective */}
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-white/12 bg-[#09090B]">
        <motion.div
          key={seat.row}
          initial={{ opacity: 0.25, scale: 1.02 }}
          animate={{ opacity: 1, scale: 1, x: -shiftX }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0 }}
          className="h-full w-[116%] -ml-[8%]"
        >
          {seat.row === 'front' && <FrontWindshieldPov />}
          {seat.row === 'middle' && <MiddleSlidingDoorPov />}
          {seat.row === 'rear' && <RearPanoramicPov />}
        </motion.div>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#09090B]/92 via-[#09090B]/40 to-transparent"
          aria-hidden="true"
        />

        {/* Sharp Architectural Telemetry Tag */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-[2px] border border-white/15 bg-[#09090B]/85 px-2.5 py-1 text-[11px] font-medium text-[#F8FAFC] backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
          <span>Visuale dal posto</span>
          <span className="font-mono-telemetry font-bold text-[#10B981]">{seat.id}</span>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-[#E4E4E7]">
          <span className="truncate font-medium">{seat.positionLabel}</span>
          <span className="font-mono-telemetry text-[11px] tracking-[0.06em] text-[#A1A1AA] shrink-0">
            {seat.rowLabel}
          </span>
        </div>
      </div>

      {/* Caption */}
      <div className="px-4 py-3.5">
        <h3 className="text-sm font-bold tracking-tight text-[#F8FAFC]">{seat.povTitle}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#A1A1AA]">{seat.povDescription}</p>
      </div>
    </div>
  );
}

function FrontWindshieldPov() {
  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="archFrontSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181B" />
          <stop offset="65%" stopColor="#27272A" />
          <stop offset="100%" stopColor="#3F3F46" />
        </linearGradient>
      </defs>
      <rect width="640" height="230" fill="url(#archFrontSky)" />
      {/* Subtle topographic horizon line */}
      <path d="M 0 164 L 140 128 L 280 148 L 430 116 L 640 144 L 640 230 L 0 230 Z" fill="#18181B" stroke="#52525B" strokeOpacity="0.35" strokeWidth="1" />
      {/* Highway perspective */}
      <path d="M 284 166 L 356 166 L 430 230 L 140 230 Z" fill="#111114" />
      <line x1="296" y1="166" x2="210" y2="230" stroke="#71717A" strokeWidth="1.5" />
      <line x1="344" y1="166" x2="404" y2="230" stroke="#71717A" strokeWidth="1.5" />
      <line x1="320" y1="168" x2="310" y2="230" stroke="#F8FAFC" strokeWidth="2" strokeDasharray="10 10" opacity="0.7" />

      {/* White T5 Hood Edge */}
      <path d="M 90 226 Q 320 206 550 226 L 550 242 L 90 242 Z" fill="#E4E4E7" />

      {/* A-Pillars & Roofline */}
      <path d="M 0 0 L 640 0 L 640 30 L 0 30 Z" fill="#09090B" />
      <rect x="278" y="22" width="84" height="20" rx="2" fill="#111114" stroke="#3F3F46" strokeWidth="1" />
      <path d="M 0 24 L 64 24 L 34 238 L 0 238 Z" fill="#09090B" />
      <path d="M 576 24 L 640 24 L 640 238 L 602 238 Z" fill="#09090B" />

      {/* T5 Architectural Dashboard */}
      <path d="M 0 232 Q 320 216 640 232 L 640 360 L 0 360 Z" fill="#111114" stroke="#3F3F46" strokeWidth="1" />
      <path d="M 68 292 A 64 64 0 0 1 176 292" fill="none" stroke="#27272A" strokeWidth="12" />
      <rect x="240" y="246" width="120" height="114" rx="2" fill="#09090B" stroke="#27272A" strokeWidth="1.2" />
      <rect x="256" y="262" width="88" height="44" rx="2" fill="#0B1319" stroke="#10B981" strokeOpacity="0.6" strokeWidth="1" />
      <path d="M 268 292 L 290 280 L 310 284 L 332 270" fill="none" stroke="#10B981" strokeWidth="2" />
      {/* Raised T5 Dashboard Shifter */}
      <line x1="254" y1="354" x2="262" y2="306" stroke="#71717A" strokeWidth="5" />
      <circle cx="263" cy="300" r="12" fill="#18181B" stroke="#A1A1AA" strokeWidth="1.2" />
      <rect x="404" y="264" width="166" height="58" rx="2" fill="#0D0D10" stroke="#27272A" strokeWidth="1" />
    </svg>
  );
}

function MiddleSlidingDoorPov() {
  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="640" height="360" fill="#09090B" />
      {/* Open Right Sliding Door Aperture */}
      <rect x="278" y="34" width="328" height="278" fill="#27272A" stroke="#52525B" strokeWidth="1" />
      <path d="M 278 196 L 410 156 L 520 174 L 606 150 L 606 312 L 278 312 Z" fill="#18181B" />
      <rect x="278" y="274" width="328" height="38" fill="#111114" />
      <line x1="278" y1="290" x2="606" y2="290" stroke="#E4E4E7" strokeWidth="2" opacity="0.5" />

      {/* Front Windshield Glimpse */}
      <rect x="18" y="48" width="166" height="106" fill="#1E1E24" stroke="#3F3F46" strokeWidth="1" />

      {/* Front Seat Backs */}
      <rect x="34" y="132" width="128" height="178" rx="4" fill="#141418" stroke="#27272A" strokeWidth="1.2" />
      <rect x="56" y="88" width="84" height="40" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
      <rect x="172" y="142" width="96" height="168" rx="4" fill="#141418" stroke="#27272A" strokeWidth="1.2" />
      <rect x="190" y="102" width="60" height="36" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />

      {/* B-Pillar & Step Sill */}
      <rect x="262" y="0" width="22" height="320" fill="#09090B" stroke="#27272A" strokeWidth="1" />
      <rect x="278" y="304" width="328" height="22" fill="#111114" stroke="#27272A" strokeWidth="1" />
      <rect x="382" y="313" width="116" height="3" fill="#10B981" />
      <rect x="0" y="0" width="640" height="34" fill="#0D0D10" />
      <rect x="0" y="324" width="640" height="36" fill="#09090B" />
    </svg>
  );
}

function RearPanoramicPov() {
  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="640" height="360" fill="#09090B" />
      <path d="M 0 0 L 640 0 L 530 62 L 110 62 Z" fill="#141418" stroke="#27272A" strokeWidth="1" />

      {/* Left & Right Panoramic Windows */}
      <path d="M 0 58 L 116 86 L 116 206 L 0 232 Z" fill="#27272A" stroke="#3F3F46" strokeWidth="1" />
      <path d="M 640 58 L 524 86 L 524 206 L 640 232 Z" fill="#27272A" stroke="#3F3F46" strokeWidth="1" />

      {/* Front Windshield Vista */}
      <rect x="164" y="88" width="312" height="102" fill="#1E1E24" stroke="#3F3F46" strokeWidth="1" />
      <path d="M 164 156 L 320 138 L 476 154 L 476 190 L 164 190 Z" fill="#141418" />

      {/* Middle-Row 3 Headrests */}
      <rect x="128" y="216" width="384" height="114" rx="4" fill="#141418" stroke="#27272A" strokeWidth="1.2" />
      <rect x="156" y="168" width="76" height="44" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
      <rect x="282" y="168" width="76" height="44" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />
      <rect x="408" y="168" width="76" height="44" rx="3" fill="#18181B" stroke="#3F3F46" strokeWidth="1.2" />

      <rect x="0" y="318" width="640" height="42" fill="#09090B" />
    </svg>
  );
}
