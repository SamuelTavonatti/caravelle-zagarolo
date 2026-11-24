import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Check,
  Compass,
  Lock,
  MapPin,
  Trash2,
  UserCheck,
  Wifi,
} from 'lucide-react';
import { SEAT_MAP, SEATS } from '../data/routeData';
import type { SyncMode } from '../services/seatSync';
import type { BookingInput, BookingsMap, SeatBooking, SeatId } from '../types/roadtrip';
import { BookingModal } from './BookingModal';
import { SeatPovPreview } from './SeatPovPreview';

interface ActTwoCabinProps {
  bookings: BookingsMap;
  myBooking: SeatBooking | null;
  clientToken: string;
  syncMode: SyncMode;
  onBookSeat: (seatId: SeatId, input: BookingInput) => Promise<void>;
  onSwitchSeat: (targetSeatId: SeatId) => Promise<void>;
  onReleaseSeat: () => Promise<void>;
  onBookingCelebrationDone: () => void;
  onBackToExterior: () => void;
  onOpenTrailer: () => void;
  onModalToggle?: (isOpen: boolean) => void;
}

export function ActTwoCabin({
  bookings,
  myBooking,
  clientToken,
  syncMode,
  onBookSeat,
  onSwitchSeat,
  onReleaseSeat,
  onBookingCelebrationDone,
  onBackToExterior,
  onOpenTrailer,
  onModalToggle,
}: ActTwoCabinProps) {
  // Default selection: user's seat if booked, else first free seat
  const [selectedSeatId, setSelectedSeatId] = useState<SeatId>(() => {
    if (myBooking) return myBooking.seatId;
    const firstFree = SEATS.find((s) => !bookings[s.id]);
    return firstFree ? firstFree.id : 'F2';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmedSeatId, setConfirmedSeatId] = useState<SeatId | null>(null);

  useEffect(() => {
    onModalToggle?.(isModalOpen || confirmedSeatId !== null);
  }, [isModalOpen, confirmedSeatId, onModalToggle]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

  const selectedSeat = SEAT_MAP[selectedSeatId];
  const selectedOccupant = bookings[selectedSeatId];
  const isSelectedMine = selectedOccupant?.clientToken === clientToken;
  const isSelectedByOther = Boolean(selectedOccupant && !isSelectedMine);
  const isSelectedFree = !selectedOccupant;

  const bookedCount = Object.keys(bookings).length;
  const freeCount = 8 - bookedCount;

  const handleSeatClick = (seatId: SeatId) => {
    setActionError(null);
    setSelectedSeatId(seatId);
  };

  const handleConfirmNewBooking = async (input: BookingInput) => {
    setIsBusy(true);
    setActionError(null);
    try {
      await onBookSeat(selectedSeatId, input);
      setIsModalOpen(false);
      setConfirmedSeatId(selectedSeatId);
      // Show animated green checkmark motion graphic, then raise black curtain
      window.setTimeout(() => {
        setConfirmedSeatId(null);
        onBookingCelebrationDone();
      }, 1350);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Errore durante la prenotazione.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSwitchSeat = async () => {
    if (!myBooking || !isSelectedFree) return;
    const previousSeat = myBooking.seatId;
    setIsBusy(true);
    setActionError(null);
    try {
      await onSwitchSeat(selectedSeatId);
      setToastMessage(`Posto spostato da ${previousSeat} a ${selectedSeatId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossibile spostare il posto.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleReleaseSeat = async () => {
    if (!myBooking) return;
    const releasedId = myBooking.seatId;
    setIsBusy(true);
    setActionError(null);
    try {
      await onReleaseSeat();
      setToastMessage(`Posto ${releasedId} liberato con successo`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Impossibile liberare il posto.');
    } finally {
      setIsBusy(false);
    }
  };

  const renderSeatButton = (seatId: SeatId) => {
    const occupant = bookings[seatId];
    const isMine = occupant?.clientToken === clientToken;
    const isOther = Boolean(occupant && !isMine);
    const isSelected = selectedSeatId === seatId;

    // Visual states:
    // - Selected available seat -> vibrant emerald green (#10B981)
    // - My booked seat -> distinct emerald ring & tinted fill
    // - Booked by other -> muted obsidian-slate with occupant name & pickup
    // - Available unselected -> clean elevated tonal tile
    let containerClasses =
      'border-white/12 bg-[#181E27] text-[#F5F6F8] hover:border-[#10B981]/60 hover:bg-[#1E2733]';

    if (isSelected && !occupant) {
      containerClasses =
        'border-[#34D399] bg-[#10B981] text-[#042419] shadow-[0_12px_28px_-6px_rgba(16,185,129,0.58)]';
    } else if (isMine) {
      containerClasses = isSelected
        ? 'border-[#34D399] bg-[#10B981] text-[#042419] shadow-[0_12px_28px_-6px_rgba(16,185,129,0.55)]'
        : 'border-[#10B981] bg-[#10B981]/18 text-[#ECFDF5]';
    } else if (isOther) {
      containerClasses = isSelected
        ? 'border-white/35 bg-[#151A22] text-[#A4AEBC]'
        : 'border-white/8 bg-[#12161D] text-[#8D97A6] opacity-90 hover:border-white/20';
    }

    return (
      <button
        key={seatId}
        type="button"
        onClick={() => handleSeatClick(seatId)}
        data-testid={`seat-btn-${seatId}`}
        data-seat-state={isMine ? 'mine' : isOther ? 'occupied' : isSelected ? 'selected' : 'free'}
        aria-pressed={isSelected}
        aria-label={
          occupant
            ? `Posto ${seatId}, ${isMine ? 'il tuo posto' : `occupato da ${occupant.firstName}`}, raccolta ${occupant.pickupLocation}`
            : `Posto ${seatId}, libero`
        }
        className={`tactile-btn group relative flex min-h-[84px] w-full flex-col justify-between rounded-[16px] border p-2.5 text-left sm:min-h-[92px] sm:p-3 ${containerClasses}`}
      >
        {/* Top Row: Seat Code + State Icon */}
        <div className="flex w-full items-center justify-between gap-1">
          <span className="font-mono-telemetry text-xs font-bold tracking-tight sm:text-sm">
            {seatId}
          </span>
          {isMine ? (
            <UserCheck
              className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-[#042419]' : 'text-[#34D399]'}`}
              aria-hidden="true"
            />
          ) : isOther ? (
            <Lock className="h-3.5 w-3.5 shrink-0 text-[#7D8796]" aria-hidden="true" />
          ) : isSelected ? (
            <Check className="h-4 w-4 shrink-0 text-[#042419]" aria-hidden="true" />
          ) : (
            <span
              className="h-2 w-2 rounded-full bg-[#10B981]/70 group-hover:bg-[#10B981]"
              aria-hidden="true"
            />
          )}
        </div>

        {/* Bottom Row: Occupant Name + Pickup or Available Status */}
        <div className="mt-1.5 min-w-0">
          {occupant ? (
            <>
              <div className="truncate text-xs font-bold leading-tight sm:text-[13px]">
                {isMine ? `${occupant.firstName} (Tu)` : occupant.firstName}
              </div>
              <div
                className={`mt-0.5 truncate text-[11px] leading-tight ${
                  isMine && isSelected
                    ? 'text-[#042419]/80'
                    : isMine
                      ? 'text-[#A7F3D0]'
                      : 'text-[#8D97A6]'
                }`}
              >
                {occupant.pickupLocation}
              </div>
            </>
          ) : (
            <div
              className={`text-xs font-semibold ${
                isSelected ? 'text-[#042419]' : 'text-[#A4AEBC]'
              }`}
            >
              {isSelected ? 'Selezionato' : 'Libero'}
            </div>
          )}
        </div>
      </button>
    );
  };

  return (
    <motion.section
      aria-label="Mappa cabina Caravelle T5"
      data-testid="act-two-cabin"
      initial={{ opacity: 0, scale: 1.05 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', duration: 0.55, bounce: 0 }}
      className="min-h-[100dvh] w-full bg-[#090B0E] text-[#F5F6F8]"
    >
      {/* Top Bar */}
      <header className="sticky top-0 z-30 border-b border-white/8 bg-[#090B0E]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBackToExterior}
              aria-label="Torna alla vista esterna del Caravelle"
              className="tactile-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#11151B] text-[#C7D0DC] hover:border-white/25 hover:text-[#F5F6F8]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-[#F5F6F8] sm:text-lg">
                Cabina Caravelle T5
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-[#A4AEBC] whitespace-nowrap">
                <span className="font-mono-telemetry">{freeCount}/8 liberi</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#6EE7B7]">
                  <Wifi className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{syncMode === 'firebase' ? 'Sync cloud' : 'Sync live'}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenTrailer}
            data-testid="cabin-view-route-btn"
            className="tactile-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/12 bg-[#11151B] px-3.5 py-2 text-xs font-semibold text-[#F5F6F8] hover:border-white/25 hover:bg-[#181E27] sm:px-4 sm:text-sm"
          >
            <Compass className="h-4 w-4 shrink-0 text-[#E5B769]" aria-hidden="true" />
            <span>Vedi percorso</span>
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-8">
        {/* Toast feedback for seat switch or release */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              role="status"
              data-testid="cabin-toast"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22 }}
              className="mb-5 flex items-center gap-2.5 rounded-2xl border border-[#10B981]/35 bg-[#10B981]/14 px-4 py-3 text-sm font-medium text-[#A7F3D0]"
            >
              <Check className="h-4 w-4 shrink-0 text-[#10B981]" aria-hidden="true" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active User Booking Banner (with mandatory Release option) */}
        {myBooking && (
          <div
            data-testid="my-booking-banner"
            className="mb-6 flex flex-col gap-3 rounded-[22px] border border-[#10B981]/30 bg-[#11151B] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#10B981]/18 font-mono-telemetry text-sm font-bold text-[#34D399]">
                {myBooking.seatId}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#F5F6F8]">
                  Il tuo posto è il <span className="font-mono-telemetry text-[#34D399]">{myBooking.seatId}</span> · {myBooking.firstName} {myBooking.lastName}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#A4AEBC]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#10B981]" aria-hidden="true" />
                  <span className="truncate">Raccolta: {myBooking.pickupLocation}</span>
                </p>
                <p className="mt-1 text-xs text-[#8D97A6]">
                  Puoi cambiare posto in qualsiasi momento selezionandone uno libero sulla mappa.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleReleaseSeat}
                disabled={isBusy}
                data-testid="release-seat-btn"
                className="tactile-btn inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-white/12 bg-[#181E27] px-4 py-2 text-xs font-semibold text-[#FCA5A5] hover:border-[#EF4444]/45 hover:bg-[#EF4444]/12"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Libera il mio posto</span>
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
          {/* LEFT COLUMN (7 cols): Top-Down Overhead 2008 VW Caravelle T5 Cabin Blueprint */}
          <div className="lg:col-span-7">
            <div className="rounded-[26px] border border-white/10 bg-[#11151B] p-4 sm:p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-[#F5F6F8]">
                    Mappa dall’alto · 8 posti passeggeri
                  </h2>
                  <p className="text-xs text-[#A4AEBC]">
                    Tocca un posto libero per vedere la visuale reale dall’abitacolo
                  </p>
                </div>

                {/* Compact Legend */}
                <div className="flex items-center gap-3 text-[11px] text-[#A4AEBC]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#181E27] ring-1 ring-white/25" />
                    Libero
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                    Scelto
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#334155]" />
                    Occupato
                  </span>
                </div>
              </div>

              {/* Overhead Caravelle T5 Vehicle Chassis Frame */}
              <div className="relative mx-auto max-w-[460px]">
                {/* Left & Right Side Mirrors */}
                <div
                  className="pointer-events-none absolute -left-2.5 top-[92px] hidden h-9 w-2.5 rounded-l-lg bg-[#273140] border border-white/10 sm:block"
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute -right-2.5 top-[92px] hidden h-9 w-2.5 rounded-r-lg bg-[#273140] border border-white/10 sm:block"
                  aria-hidden="true"
                />

                {/* Caravelle Outer White-Tinted Roof Contour */}
                <div className="relative rounded-t-[64px] rounded-b-[34px] border-2 border-[#DCE3EE]/22 bg-[#0C0F14] px-3.5 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
                  {/* Front Hood & Panoramic Windshield */}
                  <div className="mb-4 flex flex-col items-center">
                    <div className="h-2 w-24 rounded-full bg-white/12" aria-hidden="true" />
                    <div className="mt-2.5 flex h-9 w-full items-center justify-center rounded-t-[36px] rounded-b-xl border border-white/10 bg-gradient-to-b from-[#1E2A3A]/75 to-[#121720]/70">
                      <span className="font-mono-telemetry text-[11px] tracking-wider uppercase text-[#A4AEBC]">
                        Parabrezza anteriore
                      </span>
                    </div>
                  </div>

                  {/* ROW 1: Front Row — Locked Driver (Left) + F1 & F2 (Right Bench) */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[#C7D0DC]">Prima fila</span>
                      <span className="font-mono-telemetry text-[11px] text-[#7D8796]">
                        Conducente + F1 · F2
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {/* Locked Driver Seat */}
                      <div
                        data-testid="driver-seat-locked"
                        aria-label="Posto conducente bloccato"
                        className="flex min-h-[84px] flex-col justify-between rounded-[16px] border border-dashed border-white/12 bg-[#0F131A] p-2.5 text-[#7D8796] sm:min-h-[92px] sm:p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono-telemetry text-[11px] font-semibold">GUIDA</span>
                          <Lock className="h-3.5 w-3.5 text-[#7D8796]" aria-hidden="true" />
                        </div>
                        <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-1.5">
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4 shrink-0 text-[#7D8796]"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            aria-hidden="true"
                          >
                            <circle cx="12" cy="12" r="8" />
                            <circle cx="12" cy="12" r="2" />
                            <path d="M12 14v6M5 10l5 2M19 10l-5 2" />
                          </svg>
                          <span className="text-[11px] font-semibold text-[#94A3B8] sm:text-xs">
                            Conducente
                          </span>
                        </div>
                      </div>

                      {/* Selectable Front Passenger Bench (F1, F2) */}
                      {renderSeatButton('F1')}
                      {renderSeatButton('F2')}
                    </div>
                  </div>

                  {/* ROW 2: Middle Row (M1, M2, M3) + Open Right-Side Sliding Door Indicator */}
                  <div className="relative mb-4">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[#C7D0DC]">Seconda fila</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#34D399]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                        Portellone destro aperto
                      </span>
                    </div>

                    {/* Emerald right-edge visual accent marking the open sliding doorway */}
                    <div
                      className="pointer-events-none absolute -right-[16px] top-7 bottom-1 w-1.5 rounded-full bg-[#10B981] sm:-right-[22px]"
                      aria-hidden="true"
                    />

                    <div className="grid grid-cols-3 gap-2.5">
                      {renderSeatButton('M1')}
                      {renderSeatButton('M2')}
                      {renderSeatButton('M3')}
                    </div>
                  </div>

                  {/* ROW 3: Rear Row (R1, R2, R3) */}
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between px-1">
                      <span className="text-xs font-semibold text-[#C7D0DC]">Terza fila</span>
                      <span className="font-mono-telemetry text-[11px] text-[#7D8796]">
                        R1 · R2 · R3
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2.5">
                      {renderSeatButton('R1')}
                      {renderSeatButton('R2')}
                      {renderSeatButton('R3')}
                    </div>
                  </div>

                  {/* Trunk / Bagagliaio */}
                  <div className="flex h-10 items-center justify-center rounded-b-[20px] rounded-t-lg border border-dashed border-white/10 bg-[#11151B]/75">
                    <span className="font-mono-telemetry text-[11px] tracking-wider uppercase text-[#7D8796]">
                      Bagagliaio · Zaini e valigie
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN (5 cols): Interactive Seat POV Preview + Context Action Card */}
          <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-24">
            <SeatPovPreview seat={selectedSeat} />

            {/* Action & Status Panel */}
            <div className="rounded-[22px] border border-white/10 bg-[#11151B] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-[#F5F6F8]">
                    Posto <span className="font-mono-telemetry text-[#10B981]">{selectedSeat.id}</span>
                  </h3>
                  <p className="mt-0.5 text-sm text-[#A4AEBC]">{selectedSeat.shortNote}</p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                    isSelectedMine
                      ? 'bg-[#10B981]/20 text-[#6EE7B7] border border-[#10B981]/35'
                      : isSelectedByOther
                        ? 'bg-white/8 text-[#A4AEBC] border border-white/10'
                        : 'bg-[#10B981]/14 text-[#34D399] border border-[#10B981]/30'
                  }`}
                >
                  {isSelectedMine
                    ? 'Il tuo posto'
                    : isSelectedByOther
                      ? 'Occupato'
                      : 'Disponibile'}
                </span>
              </div>

              {actionError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/12 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
                >
                  {actionError}
                </p>
              )}

              {/* Contextual Action CTA */}
              <div className="mt-4">
                {isSelectedFree && !myBooking && (
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    disabled={isBusy}
                    data-testid="book-seat-btn"
                    className="tactile-btn tactile-lift inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#10B981] px-6 py-3.5 text-base font-bold text-[#042419] shadow-[0_14px_30px_-8px_rgba(16,185,129,0.5)] hover:bg-[#34D399]"
                  >
                    <Check className="h-5 w-5" aria-hidden="true" />
                    <span>Prenota</span>
                  </button>
                )}

                {isSelectedFree && myBooking && (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={handleSwitchSeat}
                      disabled={isBusy}
                      data-testid="switch-seat-btn"
                      className="tactile-btn tactile-lift inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#10B981] px-6 py-3.5 text-base font-bold text-[#042419] shadow-[0_14px_30px_-8px_rgba(16,185,129,0.5)] hover:bg-[#34D399] disabled:opacity-65"
                    >
                      <ArrowRightLeft className="h-5 w-5" aria-hidden="true" />
                      <span>{isBusy ? 'Spostamento…' : 'Sposta qui il mio posto'}</span>
                    </button>
                    <p className="text-center text-xs text-[#A4AEBC]">
                      Libera automaticamente il posto{' '}
                      <span className="font-mono-telemetry font-semibold text-[#F5F6F8]">
                        {myBooking.seatId}
                      </span>{' '}
                      mantenendo i tuoi dati ({myBooking.firstName} · {myBooking.pickupLocation}).
                    </p>
                  </div>
                )}

                {isSelectedMine && myBooking && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-[#10B981]/25 bg-[#10B981]/10 px-4 py-3 text-sm text-[#D1FAE5]">
                      <p className="font-semibold">
                        {myBooking.firstName} {myBooking.lastName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#A7F3D0]">
                        Raccolta: {myBooking.pickupLocation}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenTrailer}
                      data-testid="my-seat-open-trailer-btn"
                      className="tactile-btn inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#F5F6F8] px-5 py-3 text-sm font-bold text-[#090B0E] hover:bg-white"
                    >
                      <Compass className="h-4 w-4" aria-hidden="true" />
                      <span>Vedi percorso e avvia trailer</span>
                    </button>
                  </div>
                )}

                {isSelectedByOther && selectedOccupant && (
                  <div className="rounded-2xl border border-white/10 bg-[#181E27] px-4 py-3.5 text-sm">
                    <p className="font-semibold text-[#F5F6F8]">
                      Già prenotato da {selectedOccupant.firstName}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-[#A4AEBC]">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-[#E5B769]" aria-hidden="true" />
                      <span>Punto di raccolta: {selectedOccupant.pickupLocation}</span>
                    </p>
                    <p className="mt-2 text-xs text-[#7D8796]">
                      Questo posto non può essere sovrascritto. Scegli un altro posto libero sulla mappa.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Form Modal */}
      <BookingModal
        seat={selectedSeat}
        isOpen={isModalOpen}
        isSubmitting={isBusy}
        errorMessage={actionError}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleConfirmNewBooking}
      />

      {/* Animated Green Checkmark Motion Graphic Overlay after Submission */}
      <AnimatePresence>
        {confirmedSeatId && (
          <motion.div
            data-testid="booking-success-checkmark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050507]/90 backdrop-blur-xl px-6 text-center"
          >
            <div className="relative flex items-center justify-center">
              {/* Radial Emerald Pulse Ring 1 */}
              <motion.span
                initial={{ scale: 0.75, opacity: 0.7 }}
                animate={{ scale: 1.85, opacity: 0 }}
                transition={{ duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
                className="absolute h-28 w-28 rounded-full border-2 border-[#10B981]"
                aria-hidden="true"
              />
              {/* Radial Emerald Pulse Ring 2 */}
              <motion.span
                initial={{ scale: 0.85, opacity: 0.45 }}
                animate={{ scale: 1.45, opacity: 0 }}
                transition={{ duration: 0.9, delay: 0.14, ease: [0.16, 1, 0.3, 1] }}
                className="absolute h-28 w-28 rounded-full bg-[#10B981]/25"
                aria-hidden="true"
              />

              {/* Spring-Drawn SVG Checkmark Circle */}
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.45, bounce: 0.18 }}
                className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#10B981] shadow-[0_20px_50px_-10px_rgba(16,185,129,0.65)]"
              >
                <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
                  <motion.path
                    d="M 11 25 L 20.5 34 L 37.5 15.5"
                    stroke="#042419"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.48, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
                  />
                </svg>
              </motion.div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.2 }}
              className="mt-6 text-2xl font-extrabold tracking-tight text-[#F5F6F8] sm:text-3xl"
            >
              Posto {confirmedSeatId} confermato
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.3 }}
              className="mt-1.5 text-sm text-[#A4AEBC]"
            >
              Preparazione del percorso Trento → Zagarolo…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
