import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Compass, DoorOpen, MapPin, Users } from 'lucide-react';
import type { BookingsMap } from '../types/roadtrip';

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
    }, 460);
    window.setTimeout(() => {
      onEnterCabin();
    }, 1020);
  };

  return (
    <section
      aria-label="Apertura Caravelle T5 — Trento Zagarolo"
      className="relative h-[100dvh] w-full overflow-hidden select-none bg-[#1B2430]"
      data-testid="act-one-exterior"
    >
      {/* Continuous camera container: smooth zoom-in through open right sliding door */}
      <motion.div
        className="relative h-full w-full will-change-transform"
        animate={
          doorPhase === 'zooming'
            ? {
                scale: 2.55,
                x: '6%',
                y: '-4%',
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
            ? { duration: 0.62, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.4 }
        }
      >
        {/* LAYER 1: Full-Bleed Daylight Italian Countryside Golden-Hour Scenery */}
        <svg
          viewBox="0 0 1920 1080"
          preserveAspectRatio="xMidYMid slice"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="22%" y2="100%">
              <stop offset="0%" stopColor="#1A446E" />
              <stop offset="30%" stopColor="#4A7CA4" />
              <stop offset="56%" stopColor="#BFA389" />
              <stop offset="78%" stopColor="#E9B77A" />
              <stop offset="100%" stopColor="#F5CE93" />
            </linearGradient>

            <radialGradient id="sunGlow" cx="20%" cy="29%" r="48%">
              <stop offset="0%" stopColor="#FFF9E6" stopOpacity="0.92" />
              <stop offset="14%" stopColor="#FFE1A3" stopOpacity="0.52" />
              <stop offset="42%" stopColor="#F0B16A" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#F0B16A" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="cloudWisp" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FFE9C7" stopOpacity="0" />
              <stop offset="35%" stopColor="#FFE9C7" stopOpacity="0.34" />
              <stop offset="65%" stopColor="#F7D5A5" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#F7D5A5" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="farMtnGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#8596AB" />
              <stop offset="100%" stopColor="#C3AC96" />
            </linearGradient>

            <linearGradient id="midHillGrad" x1="12%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#70875C" />
              <stop offset="55%" stopColor="#4E6642" />
              <stop offset="100%" stopColor="#384C33" />
            </linearGradient>

            <linearGradient id="nearHillGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#5D7242" />
              <stop offset="52%" stopColor="#3E512D" />
              <stop offset="100%" stopColor="#25321E" />
            </linearGradient>

            <linearGradient id="asphaltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#373D46" />
              <stop offset="22%" stopColor="#272C34" />
              <stop offset="62%" stopColor="#1B2027" />
              <stop offset="100%" stopColor="#0E1217" />
            </linearGradient>

            <linearGradient id="roadSunSheen" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F3C27F" stopOpacity="0.18" />
              <stop offset="48%" stopColor="#F3C27F" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#0E1217" stopOpacity="0" />
            </linearGradient>

            <filter id="dofFar" x="-10%" y="-10%" width="120%" height="120%">
              <feGaussianBlur stdDeviation="5.5" />
            </filter>
            <filter id="dofCloud" x="-15%" y="-40%" width="130%" height="180%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="dofMid" x="-5%" y="-5%" width="110%" height="110%">
              <feGaussianBlur stdDeviation="1.8" />
            </filter>

            <linearGradient id="bottomScrim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#090B0E" stopOpacity="0" />
              <stop offset="48%" stopColor="#090B0E" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#090B0E" stopOpacity="0.94" />
            </linearGradient>
            <linearGradient id="topScrim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#090B0E" stopOpacity="0.52" />
              <stop offset="100%" stopColor="#090B0E" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Sky + Golden-Hour Sun + Feathered Atmospheric Cirrus */}
          <rect width="1920" height="1080" fill="url(#skyGrad)" />
          <rect width="1920" height="1080" fill="url(#sunGlow)" />
          <circle cx="385" cy="312" r="76" fill="#FFF7DE" opacity="0.55" filter="url(#dofCloud)" />
          <circle cx="385" cy="312" r="24" fill="#FFFDF5" opacity="0.88" />

          {/* Feathered organic golden clouds */}
          <g filter="url(#dofCloud)">
            <path d="M 480 218 Q 760 190 1040 218 Q 840 236 480 218 Z" fill="url(#cloudWisp)" />
            <path d="M 1020 176 Q 1380 148 1760 182 Q 1420 202 1020 176 Z" fill="url(#cloudWisp)" />
            <path d="M 1240 264 Q 1540 246 1840 268 Q 1560 282 1240 264 Z" fill="url(#cloudWisp)" />
          </g>

          {/* Distant Alpine / Dolomite Ridges */}
          <g filter="url(#dofFar)">
            <path
              d="M 0 520 L 170 426 L 320 472 L 520 384 L 700 448 L 930 374 L 1140 438 L 1360 382 L 1580 428 L 1780 378 L 1920 422 L 1920 680 L 0 680 Z"
              fill="url(#farMtnGrad)"
              opacity="0.78"
            />
          </g>

          {/* Mid-ground Sunlit Trentino Hills + Vineyard Rows + Cypress Trees */}
          <g filter="url(#dofMid)">
            <path
              d="M 0 564 Q 250 484 540 536 T 1140 514 T 1700 528 L 1920 502 L 1920 720 L 0 720 Z"
              fill="url(#midHillGrad)"
            />
            <path
              d="M 0 564 Q 250 484 540 536 T 1140 514 T 1700 528 L 1920 502"
              fill="none"
              stroke="#E7C284"
              strokeWidth="3"
              opacity="0.48"
            />
            {/* Subtle terraced vineyard striations */}
            <path d="M 80 566 Q 310 534 560 562" fill="none" stroke="#859E6E" strokeOpacity="0.28" strokeWidth="2.5" />
            <path d="M 1180 546 Q 1440 526 1740 548" fill="none" stroke="#859E6E" strokeOpacity="0.28" strokeWidth="2.5" />

            {/* Italian Cypress clusters */}
            <g fill="#2A3C24" opacity="0.86">
              <path d="M 228 522 Q 234 446 240 522 Z" />
              <path d="M 248 526 Q 253 464 258 526 Z" />
              <path d="M 294 532 Q 299 480 304 532 Z" />
              <path d="M 1495 524 Q 1502 448 1509 524 Z" />
              <path d="M 1522 528 Q 1528 462 1534 528 Z" />
              <path d="M 1554 532 Q 1559 478 1564 532 Z" />
              <path d="M 1648 522 Q 1655 452 1662 522 Z" />
            </g>
          </g>

          {/* Near Hillside & Low Stone Wall */}
          <path
            d="M 0 620 Q 420 582 880 604 T 1920 588 L 1920 700 L 0 700 Z"
            fill="url(#nearHillGrad)"
          />
          <rect x="0" y="654" width="1920" height="24" fill="#6D665C" />
          <rect x="0" y="654" width="1920" height="4" fill="#C9B393" opacity="0.58" />
          <rect x="0" y="676" width="1920" height="6" fill="#23272D" opacity="0.7" />

          {/* Crisp Foreground Italian Asphalt Shoulder */}
          <rect x="0" y="680" width="1920" height="400" fill="url(#asphaltGrad)" />
          <rect x="0" y="680" width="1920" height="400" fill="url(#roadSunSheen)" />
          <path d="M 0 712 L 1920 712" stroke="#E5E9F0" strokeWidth="5.5" opacity="0.72" />
          <path d="M 0 710 L 1920 710" stroke="#FFE2AE" strokeWidth="1.5" opacity="0.4" />

          {/* Subtle top & bottom framing scrims */}
          <rect x="0" y="0" width="1920" height="170" fill="url(#topScrim)" />
          <rect x="0" y="720" width="1920" height="360" fill="url(#bottomScrim)" />
        </svg>

        {/* LAYER 2: Responsive Hero White 2008 VW Caravelle (T5) — Always 100% Uncropped & Grounded on Asphalt! */}
        {/* Strict right-facing side profile: Rear = LEFT, Front Nose = RIGHT, Right Sliding Door facing viewer */}
        <div className="pointer-events-none absolute inset-x-0 top-[60%] z-10 flex -translate-y-1/2 items-center justify-center px-2 sm:top-[52%] sm:px-8">
          <svg
            viewBox="360 370 1220 495"
            preserveAspectRatio="xMidYMid meet"
            className="pointer-events-auto h-auto w-full max-w-[1060px] max-h-[42dvh] sm:max-h-[60dvh]"
            role="img"
            aria-label="Volkswagen Caravelle T5 bianco del 2008 in profilo laterale rivolto a destra, con portellone laterale destro scorrevole"
          >
            <defs>
              <filter id="softContactShadow" x="-15%" y="-35%" width="130%" height="190%">
                <feGaussianBlur stdDeviation="15" />
              </filter>
              <filter id="wheelAO" x="-20%" y="-40%" width="140%" height="180%">
                <feGaussianBlur stdDeviation="6.5" />
              </filter>

              <linearGradient id="t5BodyPaint" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="14%" stopColor="#FAF8F3" />
                <stop offset="42%" stopColor="#F0F2F5" />
                <stop offset="56%" stopColor="#E1E6EE" />
                <stop offset="60%" stopColor="#F7EFE4" />
                <stop offset="76%" stopColor="#D4DCE6" />
                <stop offset="93%" stopColor="#AEB8C7" />
                <stop offset="100%" stopColor="#7C8798" />
              </linearGradient>

              <linearGradient id="t5DoorPaint" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="36%" stopColor="#F4F4F1" />
                <stop offset="56%" stopColor="#E6E9EF" />
                <stop offset="62%" stopColor="#F8ECDC" />
                <stop offset="84%" stopColor="#CFD7E2" />
                <stop offset="100%" stopColor="#9DA8B8" />
              </linearGradient>

              <linearGradient id="t5Glass" x1="0%" y1="0%" x2="25%" y2="100%">
                <stop offset="0%" stopColor="#1B2838" />
                <stop offset="32%" stopColor="#2A3E52" />
                <stop offset="48%" stopColor="#6D7A85" stopOpacity="0.88" />
                <stop offset="56%" stopColor="#141C25" />
                <stop offset="100%" stopColor="#0C1118" />
              </linearGradient>

              <linearGradient id="cabinCutaway" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#11151B" />
                <stop offset="50%" stopColor="#1E2530" />
                <stop offset="100%" stopColor="#0B0E13" />
              </linearGradient>

              <linearGradient id="cabinSunbeam" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFE1A8" stopOpacity="0.34" />
                <stop offset="65%" stopColor="#F3BE75" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#F3BE75" stopOpacity="0" />
              </linearGradient>

              <radialGradient id="alloyRim" cx="42%" cy="38%" r="58%">
                <stop offset="0%" stopColor="#F8FAFC" />
                <stop offset="45%" stopColor="#CBD5E1" />
                <stop offset="80%" stopColor="#8592A6" />
                <stop offset="100%" stopColor="#475569" />
              </radialGradient>

              <linearGradient id="headlightLens" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="45%" stopColor="#E6EDF6" />
                <stop offset="78%" stopColor="#F5B041" />
                <stop offset="100%" stopColor="#C47D22" />
              </linearGradient>

              <linearGradient id="tailLightGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#B91C1C" />
                <stop offset="35%" stopColor="#DC2626" />
                <stop offset="52%" stopColor="#F59E0B" />
                <stop offset="72%" stopColor="#991B1B" />
                <stop offset="100%" stopColor="#5E0E14" />
              </linearGradient>

              <linearGradient id="bumperLower" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#323842" />
                <stop offset="100%" stopColor="#181C22" />
              </linearGradient>

              <clipPath id="doorwayClip">
                <path d="M 792 430 L 1110 430 L 1110 742 L 792 742 Z" />
              </clipPath>
            </defs>

            {/* Realistic Multi-Layer Soft Contact & Ambient Occlusion Shadows */}
            <ellipse
              cx="985"
              cy="824"
              rx="570"
              ry="30"
              fill="#05070A"
              opacity="0.78"
              filter="url(#softContactShadow)"
            />
            <ellipse
              cx="1020"
              cy="828"
              rx="525"
              ry="18"
              fill="#020305"
              opacity="0.88"
              filter="url(#wheelAO)"
            />
            <ellipse cx="640" cy="824" rx="80" ry="10" fill="#000000" opacity="0.95" filter="url(#wheelAO)" />
            <ellipse cx="1312" cy="824" rx="80" ry="10" fill="#000000" opacity="0.95" filter="url(#wheelAO)" />

            <g id="vw-caravelle-t5" transform="translate(0, 8)">
              {/* Subtle roof rack channels */}
              <path d="M 520 400 L 1168 400 L 1175 405 L 516 405 Z" fill="#CBD5E1" opacity="0.85" />

              {/* Main T5 Unibody Silhouette — Rear LEFT, Nose RIGHT */}
              <path
                d="M 442 746
                   L 426 732
                   C 418 712, 417 654, 420 572
                   C 423 488, 434 426, 456 410
                   C 476 402, 540 400, 740 400
                   L 1164 401
                   C 1208 403, 1236 416, 1272 454
                   L 1364 550
                   C 1396 560, 1446 574, 1488 594
                   C 1506 604, 1516 626, 1518 656
                   L 1522 720
                   C 1522 738, 1508 754, 1482 758
                   L 1408 758
                   C 1402 680, 1362 652, 1312 652
                   C 1262 652, 1222 680, 1216 758
                   L 736 758
                   C 730 680, 690 652, 640 652
                   C 590 652, 550 680, 544 758
                   L 462 758
                   C 452 758, 446 752, 442 746 Z"
                fill="url(#t5BodyPaint)"
                stroke="#94A3B8"
                strokeWidth="1.5"
              />

              {/* Roofline specular golden highlight */}
              <path
                d="M 468 406 L 1164 406 C 1200 408, 1224 418, 1254 446"
                fill="none"
                stroke="#FFF8E8"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.85"
              />

              {/* Beltline crease */}
              <path d="M 424 574 L 1468 574" fill="none" stroke="#9CA8B8" strokeWidth="2" opacity="0.6" />
              <path d="M 424 576.5 L 1468 576.5" fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.7" />

              {/* Protective lower rocker sills & bumpers */}
              <path d="M 738 738 L 1214 738 L 1214 758 L 738 758 Z" fill="url(#bumperLower)" />
              <path d="M 428 726 L 544 726 L 544 758 L 456 758 C 440 756, 430 744, 428 726 Z" fill="url(#bumperLower)" />
              <path d="M 1408 712 L 1518 712 L 1516 742 C 1512 754, 1496 758, 1478 758 L 1408 758 Z" fill="url(#bumperLower)" />
              <rect x="1456" y="722" width="54" height="6" rx="2" fill="#0E1217" />
              <rect x="1460" y="734" width="48" height="6" rx="2" fill="#0E1217" />
              <circle cx="1434" cy="730" r="8" fill="#1E293B" stroke="#475569" strokeWidth="1.2" />
              <circle cx="1434" cy="730" r="4.5" fill="#CBD5E1" opacity="0.7" />

              {/* Front VW T5 grille & headlight (RIGHT) */}
              <path d="M 1480 612 L 1512 616 L 1514 646 L 1478 646 Z" fill="#1E242D" />
              <line x1="1480" y1="624" x2="1512" y2="626" stroke="#E2E8F0" strokeWidth="2.5" />
              <line x1="1479" y1="636" x2="1513" y2="638" stroke="#CBD5E1" strokeWidth="2" />
              <path
                d="M 1418 594 C 1448 594, 1484 600, 1502 612 L 1498 656 C 1472 658, 1438 654, 1412 644 C 1406 632, 1408 606, 1418 594 Z"
                fill="url(#headlightLens)"
                stroke="#64748B"
                strokeWidth="1.5"
              />
              <ellipse cx="1462" cy="624" rx="18" ry="14" fill="#FFFFFF" opacity="0.72" />
              <path d="M 1416 634 L 1446 640 L 1442 648 L 1413 641 Z" fill="#F59E0B" opacity="0.92" />

              {/* Vertical 2008 T5 Rear Tail-Light Cluster (LEFT) */}
              <path
                d="M 423 582 C 425 574, 434 570, 446 572 L 448 682 C 434 684, 424 680, 421 670 Z"
                fill="url(#tailLightGrad)"
                stroke="#450A0A"
                strokeWidth="1.2"
              />
              <rect x="427" y="616" width="16" height="14" rx="2" fill="#FDE68A" opacity="0.8" />

              {/* Recessed Horizontal Black Sliding Door Rail (Rear Quarter Panel) */}
              <g id="sliding-door-rail">
                <rect x="454" y="571" width="336" height="8" rx="3" fill="#181D25" />
                <line x1="456" y1="573" x2="788" y2="573" stroke="#475569" strokeWidth="1.2" />
                <line x1="456" y1="579" x2="788" y2="579" stroke="#FFFFFF" strokeWidth="1" opacity="0.65" />
              </g>

              {/* Rear-Left Quarter Panoramic Window */}
              <path
                d="M 464 438 C 466 430, 474 426, 488 426 L 764 426 C 772 426, 776 430, 776 438 L 776 550 C 776 556, 771 560, 764 560 L 474 560 C 464 560, 460 554, 460 546 Z"
                fill="url(#t5Glass)"
                stroke="#0F172A"
                strokeWidth="3"
              />
              <path d="M 480 434 L 760 434 L 740 462 L 472 462 Z" fill="#FFE4B5" opacity="0.16" />

              {/* Front Right Passenger Door Window + Sloped Windshield */}
              <path
                d="M 1134 428 L 1220 428 C 1236 428, 1252 440, 1272 462 L 1344 544 C 1348 550, 1344 558, 1334 558 L 1134 558 C 1128 558, 1124 554, 1124 548 L 1124 438 C 1124 432, 1128 428, 1134 428 Z"
                fill="url(#t5Glass)"
                stroke="#0F172A"
                strokeWidth="3"
              />
              <path d="M 1246 428 L 1358 548 L 1348 554 L 1236 432 Z" fill="#CBD5E1" opacity="0.45" />
              <path
                d="M 1118 422 L 1118 738 M 1118 738 L 1222 738 M 1222 738 C 1228 672, 1264 646, 1314 646 L 1364 552"
                fill="none"
                stroke="#64748B"
                strokeWidth="1.6"
                opacity="0.72"
              />
              <rect x="1142" y="592" width="38" height="10" rx="4" fill="#F8FAFC" stroke="#64748B" strokeWidth="1.2" />

              {/* Right-Side Wing Mirror */}
              <path
                d="M 1296 520 C 1300 504, 1318 498, 1334 504 C 1342 508, 1344 526, 1338 542 C 1332 554, 1310 554, 1298 544 Z"
                fill="#1E242D"
                stroke="#0F172A"
                strokeWidth="1.5"
              />
              <path
                d="M 1304 514 C 1314 506, 1328 506, 1334 514 L 1332 528 C 1320 526, 1310 526, 1302 524 Z"
                fill="#F1F5F9"
              />

              {/* Cabin Interior Cutaway Revealed When Sliding Door Opens */}
              <g clipPath="url(#doorwayClip)">
                <rect x="792" y="428" width="320" height="314" fill="url(#cabinCutaway)" />
                <rect x="814" y="454" width="128" height="92" rx="8" fill="#8BAAC0" opacity="0.58" />
                <rect x="964" y="454" width="122" height="92" rx="8" fill="#9BB6C9" opacity="0.52" />
                <path d="M 814 516 Q 878 496 942 518 L 942 546 L 814 546 Z" fill="#5D7449" opacity="0.65" />
                <path d="M 964 518 Q 1025 498 1086 516 L 1086 546 L 964 546 Z" fill="#5D7449" opacity="0.6" />
                <rect x="792" y="428" width="320" height="24" fill="#2A313C" />
                <rect x="860" y="436" width="44" height="5" rx="2.5" fill="#475569" />
                <rect x="978" y="436" width="44" height="5" rx="2.5" fill="#475569" />

                <path
                  d="M 806 548 C 806 534, 818 528, 836 528 L 870 528 C 884 528, 892 538, 892 554 L 892 678 L 806 678 Z"
                  fill="#2D3542"
                  stroke="#475569"
                  strokeWidth="1.5"
                />
                <rect x="818" y="502" width="46" height="28" rx="9" fill="#374151" stroke="#4B5563" strokeWidth="1.2" />

                <path
                  d="M 918 552 C 918 536, 932 528, 950 528 L 1012 528 C 1028 528, 1038 540, 1038 556 L 1038 696 L 918 696 Z"
                  fill="#353F4F"
                  stroke="#526075"
                  strokeWidth="1.5"
                />
                <rect x="936" y="498" width="54" height="32" rx="10" fill="#3E495B" stroke="#64748B" strokeWidth="1.3" />
                <rect x="932" y="622" width="124" height="34" rx="10" fill="#434F63" stroke="#64748B" strokeWidth="1.2" />
                <rect x="954" y="586" width="66" height="16" rx="8" fill="#526075" />

                <rect x="792" y="694" width="320" height="48" fill="#171C23" />
                <rect x="802" y="718" width="300" height="16" rx="4" fill="#334155" />
                <rect x="894" y="723" width="118" height="4" rx="2" fill="#10B981" opacity="0.95" />
                <rect x="1084" y="514" width="10" height="72" rx="5" fill="#64748B" stroke="#94A3B8" strokeWidth="1" />
                <polygon points="792,430 1110,430 1058,742 792,742" fill="url(#cabinSunbeam)" />
                <rect x="792" y="430" width="318" height="312" fill="none" stroke="#090D12" strokeWidth="8" />
              </g>

              {/* INTERACTIVE RIGHT-SIDE SLIDING PASSENGER DOOR */}
              {/* Critically damped Apple spring: response 0.45s, dampingRatio 1.0 */}
              <motion.g
                id="right-sliding-door"
                role="button"
                tabIndex={0}
                aria-label="Apri il portellone scorrevole laterale destro del Caravelle"
                data-testid="sliding-door-trigger"
                onClick={triggerDoorOpen}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    triggerDoorOpen();
                  }
                }}
                onMouseEnter={() => setDoorHovered(true)}
                onMouseLeave={() => setDoorHovered(false)}
                className="cursor-pointer outline-none"
                initial={false}
                animate={
                  doorPhase === 'closed'
                    ? { x: 0, y: 0, scale: 1 }
                    : { x: -246, y: 2, scale: 1.015 }
                }
                transition={{
                  type: 'spring',
                  duration: 0.45,
                  bounce: 0,
                }}
                style={{ transformOrigin: '950px 585px' }}
              >
                <motion.rect
                  x="788"
                  y="428"
                  width="326"
                  height="324"
                  rx="6"
                  fill="#070A0F"
                  animate={{ opacity: doorPhase === 'closed' ? 0 : 0.48 }}
                  transition={{ duration: 0.25 }}
                  transform="translate(8, 8)"
                />

                <path
                  d="M 792 426 L 1110 426 L 1110 742 L 792 742 Z"
                  fill="url(#t5DoorPaint)"
                  stroke={doorHovered && doorPhase === 'closed' ? '#10B981' : '#64748B'}
                  strokeWidth={doorHovered && doorPhase === 'closed' ? 3 : 1.8}
                />

                <path
                  d="M 806 436 C 806 430, 811 426, 818 426 L 1094 426 C 1100 426, 1104 430, 1104 436 L 1104 550 C 1104 556, 1099 560, 1092 560 L 818 560 C 811 560, 806 556, 806 550 Z"
                  fill="url(#t5Glass)"
                  stroke="#0F172A"
                  strokeWidth="3"
                />
                <rect
                  x="874"
                  y="444"
                  width="142"
                  height="100"
                  rx="4"
                  fill="none"
                  stroke="#0B111A"
                  strokeWidth="2.5"
                  opacity="0.7"
                />
                <path d="M 818 434 L 1092 434 L 1072 464 L 812 464 Z" fill="#FFE4B5" opacity="0.18" />

                <line x1="792" y1="574" x2="1110" y2="574" stroke="#9CA8B8" strokeWidth="2" opacity="0.65" />
                <line x1="792" y1="576.5" x2="1110" y2="576.5" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.8" />
                <rect x="792" y="730" width="318" height="12" fill="url(#bumperLower)" />

                <rect
                  x="1044"
                  y="590"
                  width="42"
                  height="12"
                  rx="5"
                  fill="#FFFFFF"
                  stroke={doorHovered && doorPhase === 'closed' ? '#10B981' : '#64748B'}
                  strokeWidth="1.8"
                />
                {doorPhase === 'closed' && (
                  <g transform="translate(1065, 596)">
                    <circle r="14" fill="#10B981" opacity={doorHovered ? 0.34 : 0.22} />
                    <circle r="5" fill="#10B981" />
                  </g>
                )}
              </motion.g>

              {/* 5-Spoke VW Alloy Wheels */}
              {[
                { cx: 640, cy: 748, id: 'rear-wheel' },
                { cx: 1312, cy: 748, id: 'front-wheel' },
              ].map((wheel) => (
                <g key={wheel.id} transform={`translate(${wheel.cx}, ${wheel.cy})`}>
                  <path d="M -94 12 C -94 -58, -56 -96, 0 -96 C 56 -96, 94 -58, 94 12 Z" fill="#0B0E13" />
                  <circle r="76" fill="#171B21" stroke="#0B0D11" strokeWidth="3" />
                  <circle r="63" fill="none" stroke="#2D3440" strokeWidth="3" />
                  <circle r="48" fill="url(#alloyRim)" stroke="#475569" strokeWidth="2" />
                  <circle r="37" fill="#1E2530" />
                  <circle r="29" fill="#475569" opacity="0.55" />
                  <path d="M 14 -24 A 27 27 0 0 1 28 -4 L 20 0 A 18 18 0 0 0 10 -15 Z" fill="#64748B" />
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <g key={deg} transform={`rotate(${deg})`}>
                      <path
                        d="M -7 -10 L -10 -45 L 10 -45 L 7 -10 Z"
                        fill="url(#alloyRim)"
                        stroke="#64748B"
                        strokeWidth="1"
                      />
                    </g>
                  ))}
                  <circle r="13" fill="#CBD5E1" stroke="#475569" strokeWidth="1.5" />
                  <circle r="6" fill="#1E293B" />
                </g>
              ))}

              <rect x="1390" y="650" width="14" height="6" rx="3" fill="#F59E0B" opacity="0.92" />
            </g>
          </svg>
        </div>
      </motion.div>

      {/* Top Bar: Single-line crisp identity + Discreet Top-Right Quick-Jump Pill */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-4 sm:px-8 sm:pt-6">
        <div className="pointer-events-auto glass-daylight inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium text-[#F5F6F8] sm:px-4 sm:text-sm">
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#10B981]" aria-hidden="true" />
          <span className="tracking-tight font-semibold">Caravelle T5</span>
          <span className="hidden text-[#C7D0DC] sm:inline">· 2008 · Bianco</span>
        </div>

        <nav
          aria-label="Accesso rapido"
          className="pointer-events-auto glass-daylight inline-flex shrink-0 items-center rounded-full p-1"
        >
          <button
            type="button"
            onClick={onEnterCabin}
            data-testid="quick-jump-seats"
            className="tactile-btn inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold text-[#F5F6F8] hover:bg-white/12 sm:px-3.5 sm:text-sm"
          >
            <Users className="h-3.5 w-3.5 shrink-0 text-[#10B981]" aria-hidden="true" />
            <span>Vai ai posti</span>
          </button>
          <span className="h-4 w-px bg-white/15" aria-hidden="true" />
          <button
            type="button"
            onClick={onJumpToTrailer}
            data-testid="quick-jump-route"
            className="tactile-btn inline-flex min-h-[38px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1.5 text-xs font-semibold text-[#F5F6F8] hover:bg-white/12 sm:px-3.5 sm:text-sm"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 text-[#E5B769]" aria-hidden="true" />
            <span>Vedi percorso</span>
          </button>
        </nav>
      </header>

      {/* Bottom Ergonomic Action Area (Strict 100dvh) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-4 pb-5 sm:px-8 sm:pb-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="pointer-events-auto max-w-xl">
            <h1 className="text-[30px] leading-[1.06] font-extrabold tracking-[-0.025em] text-[#F5F6F8] sm:text-[48px]">
              Trento → Zagarolo.
              <span className="block text-[#E5B769]">Scegli il tuo posto a&nbsp;bordo.</span>
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-[#D6DCE5]">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#E5B769]" aria-hidden="true" />
                <span>738&nbsp;km · 4 tappe</span>
              </span>
              <span className="font-mono-telemetry text-xs text-[#C7D0DC] sm:text-sm">
                {freeCount}/8 posti liberi
              </span>
              {mySeatId && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#10B981]/20 px-2.5 py-0.5 text-xs font-semibold text-[#6EE7B7] border border-[#10B981]/35">
                  Il tuo posto: {mySeatId}
                </span>
              )}
            </div>
          </div>

          <div className="pointer-events-auto flex flex-col items-stretch gap-2 sm:items-end">
            <button
              type="button"
              onClick={triggerDoorOpen}
              disabled={doorPhase !== 'closed'}
              data-testid="open-door-cta"
              className="tactile-btn tactile-lift inline-flex min-h-[52px] items-center justify-center gap-2.5 rounded-full bg-[#10B981] px-6 py-3.5 text-base font-bold text-[#042419] shadow-[0_14px_34px_-8px_rgba(16,185,129,0.55)] hover:bg-[#34D399] disabled:opacity-75"
            >
              <DoorOpen className="h-5 w-5" aria-hidden="true" />
              <span>
                {doorPhase === 'closed' ? 'Apri il portellone' : 'Accesso in cabina…'}
              </span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="text-center text-xs text-[#C7D0DC] sm:text-right">
              Puoi anche cliccare direttamente sul portellone laterale del&nbsp;Caravelle
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
