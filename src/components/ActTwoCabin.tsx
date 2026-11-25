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

interface ActTwoCabinProps {
  bookings: BookingsMap;
  myBooking: SeatBooking | null;
  clientToken: string;
  syncMode: SyncMode;
  onBookSeat: (seatId: SeatId, input: BookingInput) => Promise<void>;
  onSwitchSeat: (targetSeatId: SeatId) => Promise<void>;
  onReleaseSeat: () => Promise<void>;
  onAdoptSeat: (booking: SeatBooking, verificationInput: string) => void;
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
  onAdoptSeat,
  onBookingCelebrationDone,
  onBackToExterior,
  onOpenTrailer,
  onModalToggle,
}: ActTwoCabinProps) {
  const [selectedSeatId, setSelectedSeatId] = useState<SeatId>(() => {
    if (myBooking) return myBooking.seatId;
    const firstFree = SEATS.find((s) => !bookings[s.id]);
    return firstFree ? firstFree.id : 'F1';
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmedSeatId, setConfirmedSeatId] = useState<SeatId | null>(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);

  useEffect(() => {
    setUnlockOpen(false);
    setUnlockInput('');
    setUnlockError(null);
  }, [selectedSeatId]);

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

    let containerClasses =
      'border-white/12 bg-[#141418] text-[#F8FAFC] hover:border-white/35 hover:bg-[#1B1B20]';

    if (isSelected && !occupant) {
      containerClasses = 'border-[#10B981] bg-[#10B981] text-[#042419]';
    } else if (isMine) {
      containerClasses = isSelected
        ? 'border-[#10B981] bg-[#10B981] text-[#042419]'
        : 'border-[#10B981] bg-[#10B981]/14 text-[#ECFDF5]';
    } else if (isOther) {
      containerClasses = isSelected
        ? 'border-white/40 bg-[#141418] text-[#CBD5E1]'
        : 'border-white/10 bg-[#0E0E11] text-[#94A3B8] hover:border-white/25';
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
        className={`tactile-btn group relative flex min-h-[84px] w-full flex-col justify-between rounded-[4px] border p-2.5 text-left sm:min-h-[94px] sm:p-3 ${containerClasses}`}
      >
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
            <Lock className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" aria-hidden="true" />
          ) : isSelected ? (
            <Check className="h-4 w-4 shrink-0 text-[#042419]" aria-hidden="true" />
          ) : (
            <span
              className="h-1.5 w-1.5 bg-[#52525B] group-hover:bg-[#10B981]"
              aria-hidden="true"
            />
          )}
        </div>

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
                      : 'text-[#94A3B8]'
                }`}
              >
                {occupant.pickupLocation}
              </div>
            </>
          ) : (
            <div
              className={`font-mono-telemetry text-[11px] font-semibold uppercase tracking-[0.04em] ${
                isSelected ? 'text-[#042419]' : 'text-[#A1A1AA]'
              }`}
            >
              {isSelected ? 'Scelto' : 'Libero'}
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
      className="min-h-[100dvh] w-full bg-[#09090B] text-[#F8FAFC]"
    >
      {/* Top Architectural Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-white/12 bg-[#09090B]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onBackToExterior}
              aria-label="Torna allo studio 3D del Caravelle"
              className="tactile-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border border-white/12 bg-[#111114] text-[#D4D4D8] hover:border-white/30 hover:text-[#F8FAFC]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-extrabold tracking-[-0.025em] text-[#F8FAFC] sm:text-base">
                Cabina Caravelle T5
              </h1>
              <div className="flex items-center gap-1.5 font-mono-telemetry text-[11px] text-[#A1A1AA] whitespace-nowrap">
                <span data-testid="cabin-availability-count">{freeCount}/8 DISPONIBILI</span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 text-[#34D399]">
                  <Wifi className="h-3 w-3 shrink-0" aria-hidden="true" />
                  <span>{syncMode === 'firebase' ? 'CLOUD' : 'LIVE'}</span>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenTrailer}
            data-testid="cabin-view-route-btn"
            className="tactile-btn inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border border-white/15 bg-[#111114] px-3.5 py-2 text-xs font-semibold text-[#F8FAFC] hover:border-white/30 sm:px-4"
          >
            <Compass className="h-3.5 w-3.5 shrink-0 text-[#4285F4]" aria-hidden="true" />
            <span>Vedi percorso</span>
          </button>
        </div>
      </header>

      {/* Centered Single-Column Top-Down Cabin Layout */}
      <main className="mx-auto max-w-[620px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Status Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              role="status"
              data-testid="cabin-toast"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mb-5 flex items-center gap-2.5 rounded-[4px] border border-[#10B981]/50 bg-[#10B981]/12 px-4 py-3 text-sm font-medium text-[#A7F3D0]"
            >
              <Check className="h-4 w-4 shrink-0 text-[#10B981]" aria-hidden="true" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active User Booking Banner */}
        {myBooking && (
          <div
            data-testid="my-booking-banner"
            className="mb-5 flex flex-col gap-3 rounded-[4px] border border-[#10B981]/40 bg-[#111114] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] border border-[#10B981]/45 bg-[#10B981]/14 font-mono-telemetry text-sm font-bold text-[#34D399]">
                {myBooking.seatId}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#F8FAFC]">
                  Il tuo posto è il{' '}
                  <span className="font-mono-telemetry text-[#34D399]">{myBooking.seatId}</span> ·{' '}
                  {myBooking.firstName}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-[#10B981]" aria-hidden="true" />
                  <span className="truncate">Raccolta: {myBooking.pickupLocation}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReleaseSeat}
              disabled={isBusy}
              data-testid="release-seat-btn"
              className="tactile-btn inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1.5 rounded-[4px] border border-white/15 bg-[#09090B] px-3.5 py-2 text-xs font-semibold text-[#FCA5A5] hover:border-[#EF4444]/50 hover:bg-[#EF4444]/10"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Libera il mio posto</span>
            </button>
          </div>
        )}

        {/* Centered Top-Down 2008 VW Caravelle T5 Cabin Blueprint */}
        <div className="rounded-[4px] border border-white/12 bg-[#111114] p-4 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-lg font-extrabold tracking-[-0.025em] text-[#F8FAFC]">
                Scegli il tuo posto · 8 posti passeggeri
              </h2>
              <p className="mt-0.5 text-xs text-[#A1A1AA]">
                Vista dall’alto rivolta verso il parabrezza anteriore
              </p>
            </div>

            <div className="flex items-center gap-3 font-mono-telemetry text-[11px] uppercase tracking-[0.04em] text-[#A1A1AA]">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 border border-white/35 bg-[#141418]" />
                Libero
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 bg-[#10B981]" />
                Scelto
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 bg-[#3F3F46]" />
                Occupato
              </span>
            </div>
          </div>

          {/* Vehicle Chassis Outline */}
          <div className="relative rounded-[4px] border border-white/20 bg-[#09090B] px-3.5 pb-5 pt-4 sm:px-5 sm:pb-6 sm:pt-5">
            {/* Front Windshield */}
            <div className="mb-5 flex h-9 w-full items-center justify-center rounded-[2px] border border-white/12 bg-[#141418]">
              <span className="font-mono-telemetry text-[11px] tracking-[0.12em] uppercase text-[#A1A1AA]">
                Parabrezza anteriore
              </span>
            </div>

            {/* PRIMA FILA: Left Locked Driver | Clear Center Aisle Gap | Adjacent Right Passenger Bench (F1 + F2) */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono-telemetry text-[11px] font-semibold uppercase tracking-[0.06em] text-[#E4E4E7]">
                  Prima fila
                </span>
                <span className="font-mono-telemetry text-[11px] text-[#71717A]">
                  CONDUCENTE · CORRIDOIO · F1 F2
                </span>
              </div>

              <div
                data-testid="front-row-grid"
                className="grid grid-cols-[1fr_20px_1fr_1fr] items-stretch gap-2 sm:grid-cols-[1fr_40px_1fr_1fr]"
              >
                <div
                  data-testid="driver-seat-locked"
                  aria-label="Posto conducente bloccato"
                  className="flex min-h-[84px] flex-col justify-between rounded-[4px] border border-dashed border-white/15 bg-[#0D0D10] p-2.5 text-[#94A3B8] sm:min-h-[94px] sm:p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-telemetry text-[10px] font-semibold sm:text-[11px]">
                      GUIDA
                    </span>
                    <Lock className="h-3.5 w-3.5 text-[#71717A]" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-4 w-4 shrink-0 text-[#71717A]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <circle cx="12" cy="12" r="2" />
                      <path d="M12 14v6M5 10l5 2M19 10l-5 2" />
                    </svg>
                    <span className="text-[11px] font-semibold text-[#A1A1AA] sm:text-xs">
                      Conducente
                    </span>
                  </div>
                </div>

                {/* Clear Center Aisle / Console Gap */}
                <div
                  data-testid="front-row-aisle"
                  aria-hidden="true"
                  className="flex flex-col items-center justify-center rounded-[2px] border border-dashed border-white/10 bg-[#0D0D10]/50"
                >
                  <span className="h-8 w-px bg-white/15" />
                </div>

                {renderSeatButton('F1')}
                {renderSeatButton('F2')}
              </div>
            </div>

            {/* SECONDA FILA: M1, M2, M3 + Open Right Sliding Door Entry Marker */}
            <div className="relative mb-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono-telemetry text-[11px] font-semibold uppercase tracking-[0.06em] text-[#E4E4E7]">
                  Seconda fila
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono-telemetry text-[11px] font-semibold text-[#34D399]">
                  <span className="h-1.5 w-1.5 bg-[#10B981]" />
                  INGRESSO PORTELLONE DESTRO
                </span>
              </div>

              <div
                className="pointer-events-none absolute -right-[15px] top-7 bottom-0 w-1 bg-[#10B981] sm:-right-[21px]"
                aria-hidden="true"
              />

              <div className="grid grid-cols-3 gap-2">
                {renderSeatButton('M1')}
                {renderSeatButton('M2')}
                {renderSeatButton('M3')}
              </div>
            </div>

            {/* TERZA FILA: R1, R2, R3 */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono-telemetry text-[11px] font-semibold uppercase tracking-[0.06em] text-[#E4E4E7]">
                  Terza fila
                </span>
                <span className="font-mono-telemetry text-[11px] text-[#71717A]">
                  R1 · R2 · R3
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {renderSeatButton('R1')}
                {renderSeatButton('R2')}
                {renderSeatButton('R3')}
              </div>
            </div>

            {/* Luggage Compartment */}
            <div className="flex h-9 items-center justify-center rounded-[2px] border border-dashed border-white/12 bg-[#111114]">
              <span className="font-mono-telemetry text-[11px] tracking-[0.1em] uppercase text-[#71717A]">
                Bagagliaio · Zaini e valigie
              </span>
            </div>
          </div>

          {/* Action Bar Directly Below the Cabin Map */}
          <div className="mt-5 border-t border-white/10 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-extrabold tracking-[-0.025em] text-[#F8FAFC]">
                  Posto <span className="font-mono-telemetry text-[#10B981]">{selectedSeat.id}</span>
                </h3>
                <p className="mt-0.5 text-xs text-[#A1A1AA]">{selectedSeat.positionLabel}</p>
              </div>

              <span
                className={`shrink-0 rounded-[2px] border px-2.5 py-1 font-mono-telemetry text-[11px] font-semibold uppercase tracking-[0.05em] ${
                  isSelectedMine
                    ? 'border-[#10B981]/50 bg-[#10B981]/15 text-[#34D399]'
                    : isSelectedByOther
                      ? 'border-white/12 bg-[#18181B] text-[#A1A1AA]'
                      : 'border-[#10B981]/40 bg-[#10B981]/10 text-[#34D399]'
                }`}
              >
                {isSelectedMine
                  ? 'Tuo posto'
                  : isSelectedByOther
                    ? 'Occupato'
                    : 'Libero'}
              </span>
            </div>

            {actionError && (
              <p
                role="alert"
                className="mt-3 rounded-[4px] border border-[#EF4444]/45 bg-[#EF4444]/12 px-3.5 py-2.5 text-xs text-[#FCA5A5]"
              >
                {actionError}
              </p>
            )}

            <div className="mt-4">
              {isSelectedFree && !myBooking && (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  disabled={isBusy}
                  data-testid="book-seat-btn"
                  className="tactile-btn inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#10B981] px-6 py-3 text-base font-bold text-[#042419] hover:bg-[#34D399]"
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
                    className="tactile-btn inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#10B981] px-6 py-3 text-base font-bold text-[#042419] hover:bg-[#34D399] disabled:opacity-65"
                  >
                    <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
                    <span>{isBusy ? 'Spostamento…' : 'Sposta qui il mio posto'}</span>
                  </button>
                  <p className="text-center text-xs text-[#A1A1AA]">
                    Libera automaticamente{' '}
                    <span className="font-mono-telemetry font-semibold text-[#F8FAFC]">
                      {myBooking.seatId}
                    </span>{' '}
                    conservando i tuoi dati ({myBooking.firstName} · {myBooking.pickupLocation}).
                  </p>
                </div>
              )}

              {isSelectedMine && myBooking && (
                <button
                  type="button"
                  onClick={onOpenTrailer}
                  data-testid="my-seat-open-trailer-btn"
                  className="tactile-btn inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[4px] bg-[#F8FAFC] px-5 py-3 text-sm font-bold text-[#09090B] hover:bg-white"
                >
                  <Compass className="h-4 w-4" aria-hidden="true" />
                  <span>Vedi percorso e avvia trailer</span>
                </button>
              )}

              {isSelectedByOther && selectedOccupant && (
                <div className="rounded-[4px] border border-white/12 bg-[#09090B] px-4 py-3.5 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-[#F8FAFC]">
                        Occupato da {selectedOccupant.firstName}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-[#A1A1AA]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#4285F4]" aria-hidden="true" />
                        <span>Raccolta: {selectedOccupant.pickupLocation}</span>
                      </p>
                    </div>

                    {!unlockOpen && (
                      <button
                        type="button"
                        onClick={() => {
                          setUnlockOpen(true);
                          setUnlockError(null);
                        }}
                        data-testid="unlock-seat-trigger"
                        className="tactile-btn rounded-[4px] border border-white/15 bg-[#141418] px-2.5 py-1.5 text-[11px] font-semibold text-[#CBD5E1] hover:border-[#38BDF8]/50 hover:text-[#F8FAFC]"
                      >
                        È il tuo posto? Modifica / Libera
                      </button>
                    )}
                  </div>

                  {unlockOpen && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        try {
                          onAdoptSeat(selectedOccupant, unlockInput);
                          setUnlockOpen(false);
                          setUnlockInput('');
                          setUnlockError(null);
                          setToastMessage(
                            `Posto ${selectedOccupant.seatId} sbloccato per ${selectedOccupant.firstName}.`
                          );
                        } catch (err) {
                          setUnlockError(
                            err instanceof Error ? err.message : 'Verifica non riuscita.'
                          );
                        }
                      }}
                      className="mt-3 border-t border-white/10 pt-3"
                    >
                      <label
                        htmlFor="unlock-lastname-input"
                        className="block font-mono-telemetry text-[11px] font-medium uppercase tracking-[0.04em] text-[#A1A1AA]"
                      >
                        Conferma il tuo cognome
                      </label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <input
                          id="unlock-lastname-input"
                          type="text"
                          value={unlockInput}
                          onChange={(e) => {
                            setUnlockInput(e.target.value);
                            if (unlockError) setUnlockError(null);
                          }}
                          placeholder="Cognome"
                          autoComplete="family-name"
                          data-testid="unlock-lastname-input"
                          className="min-h-[42px] w-full rounded-[4px] border border-white/15 bg-[#141418] px-3 text-base text-[#F8FAFC] placeholder:text-[#52525B] focus:border-[#38BDF8] focus:outline-none"
                        />
                        <button
                          type="submit"
                          data-testid="unlock-seat-submit"
                          className="tactile-btn min-h-[42px] shrink-0 rounded-[4px] bg-[#10B981] px-4 text-xs font-bold text-[#042419] hover:bg-[#34D399]"
                        >
                          Sblocca
                        </button>
                      </div>
                      {unlockError && (
                        <p
                          role="alert"
                          data-testid="unlock-seat-error"
                          className="mt-2 text-xs text-[#FCA5A5]"
                        >
                          {unlockError}
                        </p>
                      )}
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <BookingModal
        seat={selectedSeat}
        isOpen={isModalOpen}
        isSubmitting={isBusy}
        errorMessage={actionError}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleConfirmNewBooking}
      />

      {/* Animated Green Checkmark Motion Graphic after Booking Submission */}
      <AnimatePresence>
        {confirmedSeatId && (
          <motion.div
            data-testid="booking-success-checkmark"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#050507]/94 px-6 text-center backdrop-blur-md"
          >
            <div className="relative flex items-center justify-center">
              <motion.span
                initial={{ scale: 0.8, opacity: 0.75 }}
                animate={{ scale: 1.75, opacity: 0 }}
                transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                className="absolute h-24 w-24 rounded-[4px] border-2 border-[#10B981]"
                aria-hidden="true"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.42, bounce: 0.12 }}
                className="relative flex h-24 w-24 items-center justify-center rounded-[4px] bg-[#10B981]"
              >
                <svg viewBox="0 0 48 48" className="h-12 w-12" fill="none" aria-hidden="true">
                  <motion.path
                    d="M 11 25 L 20.5 34 L 37.5 15.5"
                    stroke="#042419"
                    strokeWidth="4.5"
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.45, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
                  />
                </svg>
              </motion.div>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.18 }}
              className="mt-6 text-2xl font-extrabold tracking-[-0.03em] text-[#F8FAFC] sm:text-3xl"
            >
              Posto {confirmedSeatId} confermato
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: 0.26 }}
              className="mt-1.5 font-mono-telemetry text-xs uppercase tracking-[0.06em] text-[#A1A1AA]"
            >
              Preparazione itinerario Trento → Zagarolo…
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
