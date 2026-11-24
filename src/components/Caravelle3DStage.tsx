import { motion } from 'motion/react';

interface Caravelle3DStageProps {
  doorPhase: 'closed' | 'sliding' | 'overhead';
  onDoorClick: () => void;
  onDoorHoverChange: (hovered: boolean) => void;
}

const BASE = import.meta.env.BASE_URL;
const EDGE_MASK =
  'linear-gradient(to right, transparent 0%, #000 14%, #000 86%, transparent 100%), linear-gradient(to bottom, transparent 0%, #000 16%, #000 78%, transparent 100%)';

/**
 * Photorealistic dual-state studio stage: closed → open sliding door.
 * Edges dissolve into #09090B so the softbox studio blends into the editorial UI.
 */
export function Caravelle3DStage({
  doorPhase,
  onDoorClick,
  onDoorHoverChange,
}: Caravelle3DStageProps) {
  const isOpen = doorPhase !== 'closed';
  const zoom = doorPhase === 'overhead';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#09090B]"
      data-testid="caravelle-photo-stage"
    >
      <motion.div
        className="relative shrink-0"
        style={{
          width: 'min(100vw, 1180px)',
          aspectRatio: '500 / 572',
          WebkitMaskImage: EDGE_MASK,
          maskImage: EDGE_MASK,
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
          transformOrigin: '53% 46%',
        }}
        animate={{ scale: zoom ? 1.9 : 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img
          src={`${BASE}caravelle-closed.jpg`}
          alt="Volkswagen Caravelle T5 bianco con portellone scorrevole chiuso"
          data-testid="caravelle-closed-img"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <motion.img
          src={`${BASE}caravelle-open.jpg`}
          alt="Volkswagen Caravelle T5 con portellone scorrevole aperto e sedili illuminati"
          data-testid="caravelle-open-img"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
          initial={false}
          animate={{
            opacity: isOpen ? 1 : 0,
            clipPath: isOpen ? 'inset(0 0% 0 0)' : 'inset(0 100% 0 0)',
          }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />

        {/* Hit-zone on the sliding door */}
        {!isOpen && (
          <button
            type="button"
            aria-label="Apri il portellone scorrevole"
            data-testid="door-hit-zone"
            onClick={onDoorClick}
            onMouseEnter={() => onDoorHoverChange(true)}
            onMouseLeave={() => onDoorHoverChange(false)}
            onFocus={() => onDoorHoverChange(true)}
            onBlur={() => onDoorHoverChange(false)}
            className="group absolute cursor-pointer outline-none"
            style={{ left: '33%', top: '30.5%', width: '24.5%', height: '30%' }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 border border-transparent transition-colors duration-200 group-hover:border-white/30 group-hover:bg-white/[0.04] group-focus-visible:border-white/50"
            />
            <span
              aria-hidden="true"
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/90 shadow-[0_0_14px_4px_rgba(125,211,252,0.75)] opacity-35 transition-opacity duration-200 group-hover:opacity-100 group-hover:animate-pulse"
              style={{ left: '84%', top: '45%' }}
            />
          </button>
        )}
      </motion.div>
    </div>
  );
}
