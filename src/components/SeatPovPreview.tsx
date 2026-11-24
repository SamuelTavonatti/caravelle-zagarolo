import { motion } from 'motion/react';
import { Eye } from 'lucide-react';
import type { SeatDefinition } from '../types/roadtrip';

interface SeatPovPreviewProps {
  seat: SeatDefinition;
}

export function SeatPovPreview({ seat }: SeatPovPreviewProps) {
  // Subtle horizontal parallax offset based on exact left/center/right seat position
  const shiftX = seat.panOffset * 28;

  return (
    <div
      className="overflow-hidden rounded-[22px] border border-white/10 bg-[#11151B]"
      data-testid="seat-pov-preview"
    >
      {/* 16:9 First-Person Perspective Viewport */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#0B0E13]">
        <motion.div
          key={seat.row}
          initial={{ opacity: 0.2, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1, x: -shiftX }}
          transition={{ type: 'spring', duration: 0.45, bounce: 0 }}
          className="h-full w-[116%] -ml-[8%]"
        >
          {seat.row === 'front' && <FrontWindshieldPov />}
          {seat.row === 'middle' && <MiddleSlidingDoorPov />}
          {seat.row === 'rear' && <RearPanoramicPov />}
        </motion.div>

        {/* Subtle bottom gradient for badge legibility */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#090B0E]/90 via-[#090B0E]/35 to-transparent"
          aria-hidden="true"
        />

        {/* Seat POV label chip */}
        <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#090B0E]/75 px-3 py-1 text-xs font-medium text-[#F5F6F8] backdrop-blur-md border border-white/12">
          <Eye className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
          <span>Visuale dal posto</span>
          <span className="font-mono-telemetry font-semibold text-[#10B981]">{seat.id}</span>
        </div>

        <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-xs text-[#D6DCE5]">
          <span className="font-medium truncate">{seat.positionLabel}</span>
          <span className="font-mono-telemetry text-[11px] text-[#A4AEBC] shrink-0">
            {seat.rowLabel}
          </span>
        </div>
      </div>

      {/* Concise Italian POV caption */}
      <div className="px-4 py-3.5">
        <h3 className="text-sm font-semibold text-[#F5F6F8]">{seat.povTitle}</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#A4AEBC]">{seat.povDescription}</p>
      </div>
    </div>
  );
}

/**
 * First-person POV from Front Passenger Bench (F1 / F2):
 * Wide windshield looking onto golden-hour Italian valley road + authentic 2008 VW T5 dashboard & raised gear shifter
 */
function FrontWindshieldPov() {
  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="povFrontSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#265480" />
          <stop offset="55%" stopColor="#8CA8BC" />
          <stop offset="100%" stopColor="#ECC188" />
        </linearGradient>
        <linearGradient id="povDash" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2A313D" />
          <stop offset="45%" stopColor="#1B2029" />
          <stop offset="100%" stopColor="#0E1217" />
        </linearGradient>
        <linearGradient id="povRoad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B424D" />
          <stop offset="100%" stopColor="#1D222A" />
        </linearGradient>
      </defs>

      {/* Sky & Golden Alpine Valley */}
      <rect width="640" height="230" fill="url(#povFrontSky)" />
      <circle cx="485" cy="96" r="24" fill="#FFF7DF" opacity="0.78" />
      <path d="M 0 154 L 110 108 L 220 132 L 340 94 L 460 124 L 580 96 L 640 118 L 640 230 L 0 230 Z" fill="#6D8066" opacity="0.78" />
      <path d="M 0 176 Q 180 144 360 162 T 640 150 L 640 230 L 0 230 Z" fill="#465C3B" />

      {/* Curving Italian Road through Windshield */}
      <path d="M 272 162 C 296 174, 344 192, 412 230 L 136 230 C 218 192, 250 176, 272 162 Z" fill="url(#povRoad)" />
      <path d="M 272 165 C 282 182, 286 202, 278 230" fill="none" stroke="#F8FAFC" strokeWidth="3" strokeDasharray="12 10" opacity="0.85" />
      <path d="M 255 166 C 232 184, 198 205, 162 230" fill="none" stroke="#E2E8F0" strokeWidth="2" opacity="0.65" />
      <path d="M 288 166 C 316 184, 354 205, 392 230" fill="none" stroke="#E2E8F0" strokeWidth="2" opacity="0.65" />

      {/* Hood tip of White Caravelle visible at base of windshield */}
      <path d="M 96 226 Q 320 202 544 226 L 544 242 L 96 242 Z" fill="#EEF2F6" />

      {/* Interior Roof Headliner & Rearview Mirror */}
      <path d="M 0 0 L 640 0 L 640 34 Q 320 18 0 34 Z" fill="#181D25" />
      <rect x="274" y="24" width="92" height="24" rx="7" fill="#0F131A" stroke="#334155" strokeWidth="1.5" />
      <rect x="316" y="8" width="8" height="18" fill="#0F131A" />

      {/* Left & Right A-Pillars */}
      <path d="M 0 24 L 68 24 L 36 238 L 0 238 Z" fill="#171C24" />
      <path d="M 572 24 L 640 24 L 640 238 L 598 238 Z" fill="#171C24" />
      {/* Grab handle on right A-pillar */}
      <rect x="590" y="92" width="12" height="62" rx="6" fill="#334155" stroke="#475569" strokeWidth="1" />

      {/* Authentic 2008 VW Caravelle T5 Dashboard */}
      <path d="M 0 232 Q 320 212 640 232 L 640 360 L 0 360 Z" fill="url(#povDash)" />
      {/* Sunlit specular ridge across dashboard top */}
      <path d="M 38 232 Q 320 214 602 232" fill="none" stroke="#FFE0A8" strokeOpacity="0.32" strokeWidth="2.5" />

      {/* Left Driver Instrument Binnacle & Steering Wheel Top Edge */}
      <path d="M 54 234 C 66 206, 168 206, 182 234 Z" fill="#141921" stroke="#334155" strokeWidth="1.5" />
      <path d="M 68 292 A 64 64 0 0 1 176 292" fill="none" stroke="#0B0E13" strokeWidth="14" strokeLinecap="round" />
      <path d="M 68 292 A 64 64 0 0 1 176 292" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" />

      {/* Center Console + Raised VW T5 Gear Shifter */}
      <rect x="236" y="246" width="122" height="114" rx="10" fill="#141920" stroke="#2D3748" strokeWidth="1.5" />
      {/* Radio / Navigation screen glowing subtly */}
      <rect x="254" y="262" width="86" height="44" rx="5" fill="#0B1319" stroke="#10B981" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M 268 292 L 288 280 L 306 286 L 326 270" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
      {/* Raised T5 Dashboard Shifter Knob */}
      <line x1="252" y1="354" x2="262" y2="306" stroke="#64748B" strokeWidth="6" strokeLinecap="round" />
      <circle cx="263" cy="300" r="13" fill="#27303F" stroke="#94A3B8" strokeWidth="1.5" />

      {/* Right Passenger Air Vent & Glovebox Trim */}
      <rect x="404" y="264" width="166" height="58" rx="8" fill="#151A22" stroke="#283140" strokeWidth="1.2" />
      <rect x="526" y="242" width="46" height="16" rx="4" fill="#0F1319" stroke="#334155" strokeWidth="1" />
    </svg>
  );
}

/**
 * First-person POV from Middle Row (M1 / M2 / M3):
 * Looking across the cabin toward the wide-open right-side sliding door, cypress hills & sunlit step-in sill
 */
function MiddleSlidingDoorPov() {
  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="povMidSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3B6E9A" />
          <stop offset="60%" stopColor="#D6B185" />
          <stop offset="100%" stopColor="#F5CE93" />
        </linearGradient>
        <linearGradient id="midSunbeam" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE1A3" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#FFE1A3" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Dark Caravelle Cabin Interior Base */}
      <rect width="640" height="360" fill="#12161E" />

      {/* Open Right Sliding Door Aperture revealing Golden-Hour Italian Hills */}
      <g>
        <rect x="278" y="34" width="328" height="278" rx="10" fill="url(#povMidSky)" />
        <path d="M 278 186 Q 380 144 480 166 T 606 148 L 606 312 L 278 312 Z" fill="#526B41" />
        <path d="M 278 228 Q 410 198 606 218 L 606 312 L 278 312 Z" fill="#324428" />
        {/* Cypress trees outside the open door */}
        <path d="M 412 184 Q 418 124 424 184 Z" fill="#21311B" />
        <path d="M 434 190 Q 439 138 444 190 Z" fill="#21311B" />
        <path d="M 526 178 Q 533 116 540 178 Z" fill="#21311B" />
        {/* Crisp asphalt edge visible below step-in sill */}
        <rect x="278" y="274" width="328" height="38" fill="#262B33" />
        <line x1="278" y1="290" x2="606" y2="290" stroke="#E2E8F0" strokeWidth="3" opacity="0.65" />
      </g>

      {/* Sunbeam pouring diagonally across the cabin */}
      <polygon points="278,34 606,34 450,360 110,360" fill="url(#midSunbeam)" />

      {/* Front Windshield glimpse at far left */}
      <rect x="18" y="48" width="166" height="106" rx="10" fill="#5D84A3" opacity="0.55" />
      <path d="M 18 120 Q 100 100 184 118 L 184 154 L 18 154 Z" fill="#445C39" opacity="0.7" />

      {/* Front-Row Caravelle Seat Backrests & Headrests (left-center foreground) */}
      <g>
        <rect x="34" y="132" width="128" height="178" rx="18" fill="#1D232E" stroke="#334155" strokeWidth="1.5" />
        <rect x="56" y="88" width="84" height="42" rx="12" fill="#242C39" stroke="#475569" strokeWidth="1.5" />
        {/* Passenger bench backrest beside it */}
        <rect x="172" y="142" width="96" height="168" rx="16" fill="#222936" stroke="#334155" strokeWidth="1.5" />
        <rect x="190" y="102" width="60" height="38" rx="11" fill="#293242" stroke="#475569" strokeWidth="1.5" />
      </g>

      {/* B-Pillar, Grab Handle & Step-in Sill with Emerald Courtesy Light */}
      <rect x="262" y="0" width="24" height="320" fill="#171C24" />
      <rect x="268" y="128" width="10" height="78" rx="5" fill="#64748B" />
      <rect x="278" y="304" width="328" height="24" rx="4" fill="#1E2530" stroke="#334155" strokeWidth="1.5" />
      <rect x="382" y="314" width="116" height="4" rx="2" fill="#10B981" />

      {/* Cabin Roof Headliner & Air Vents */}
      <rect x="0" y="0" width="640" height="34" fill="#161B23" />
      <rect x="340" y="12" width="56" height="7" rx="3.5" fill="#334155" />
      <rect x="468" y="12" width="56" height="7" rx="3.5" fill="#334155" />

      {/* Cabin Floor Foreground */}
      <rect x="0" y="324" width="640" height="36" fill="#0D1016" />
    </svg>
  );
}

/**
 * First-person POV from Rear Bench (R1 / R2 / R3):
 * Full longitudinal cabin vista looking past middle & front rows plus wide panoramic side windows
 */
function RearPanoramicPov() {
  return (
    <svg viewBox="0 0 640 360" className="h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="povRearSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#285784" />
          <stop offset="65%" stopColor="#D8AF82" />
          <stop offset="100%" stopColor="#F5CE93" />
        </linearGradient>
      </defs>

      {/* Spacious Caravelle Interior Walls & Ceiling */}
      <rect width="640" height="360" fill="#11151C" />
      <path d="M 0 0 L 640 0 L 530 62 L 110 62 Z" fill="#1D2430" />
      {/* Interior ceiling lighting & AC vents */}
      <rect x="276" y="20" width="88" height="8" rx="4" fill="#E5B769" opacity="0.45" />
      <rect x="176" y="34" width="44" height="6" rx="3" fill="#334155" />
      <rect x="420" y="34" width="44" height="6" rx="3" fill="#334155" />

      {/* Left Panoramic Side Window */}
      <path d="M 0 58 L 116 86 L 116 206 L 0 232 Z" fill="url(#povRearSky)" opacity="0.88" />
      <path d="M 0 156 L 116 144 L 116 206 L 0 232 Z" fill="#465D3B" />

      {/* Right Panoramic Side Window */}
      <path d="M 640 58 L 524 86 L 524 206 L 640 232 Z" fill="url(#povRearSky)" opacity="0.92" />
      <path d="M 640 156 L 524 146 L 524 206 L 640 232 Z" fill="#516940" />

      {/* Distant Front Windshield at end of cabin tunnel */}
      <rect x="164" y="88" width="312" height="102" rx="12" fill="url(#povRearSky)" opacity="0.82" />
      <path d="M 164 156 Q 320 132 476 154 L 476 190 L 164 190 Z" fill="#49603E" />

      {/* Middle-Row 3 Headrests & Bench Backrest Silhouette */}
      <g>
        <rect x="128" y="216" width="384" height="114" rx="20" fill="#1C232E" stroke="#334155" strokeWidth="1.5" />
        {/* 3 sculpted Caravelle headrests */}
        <rect x="156" y="168" width="76" height="44" rx="12" fill="#263040" stroke="#475569" strokeWidth="1.5" />
        <rect x="282" y="168" width="76" height="44" rx="12" fill="#263040" stroke="#475569" strokeWidth="1.5" />
        <rect x="408" y="168" width="76" height="44" rx="12" fill="#263040" stroke="#475569" strokeWidth="1.5" />
      </g>

      {/* Rear-Row Armrests & Floor Corridor */}
      <rect x="0" y="318" width="640" height="42" fill="#0B0E14" />
      <path d="M 0 248 L 82 262 L 82 360 L 0 360 Z" fill="#171D26" stroke="#283242" strokeWidth="1.2" />
      <path d="M 640 248 L 558 262 L 558 360 L 640 360 Z" fill="#171D26" stroke="#283242" strokeWidth="1.2" />
    </svg>
  );
}
