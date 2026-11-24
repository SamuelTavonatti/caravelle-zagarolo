import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, MapPin, User, X } from 'lucide-react';
import { PICKUP_QUICK_CHIPS } from '../data/routeData';
import type { BookingInput, SeatDefinition } from '../types/roadtrip';

interface BookingModalProps {
  seat: SeatDefinition | null;
  isOpen: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onSubmit: (input: BookingInput) => Promise<void>;
}

export function BookingModal({
  seat,
  isOpen,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: BookingModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [pickupLocation, setPickupLocation] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setValidationError(null);
    const timer = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 120);
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setValidationError('Inserisci il tuo nome per bloccare il posto.');
      return;
    }
    if (!lastName.trim()) {
      setValidationError('Inserisci anche il cognome.');
      return;
    }
    if (!pickupLocation.trim()) {
      setValidationError('Indica dove dobbiamo passarti a prendere.');
      return;
    }
    setValidationError(null);
    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      pickupLocation: pickupLocation.trim(),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && seat && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          data-testid="booking-modal"
        >
          {/* Dimming Scrim */}
          <div
            className="absolute inset-0 bg-[#050507]/80 backdrop-blur-md"
            onClick={() => {
              if (!isSubmitting) onClose();
            }}
            aria-hidden="true"
          />

          {/* Modal Sheet — strictly scale 0.94 -> 1 (never scale 0) */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-modal-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-[24px] border border-white/12 bg-[#11151B] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.85)]"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6 sm:py-5">
              <div>
                <h2
                  id="booking-modal-title"
                  className="text-xl font-bold tracking-tight text-[#F5F6F8]"
                >
                  Prenota il posto{' '}
                  <span className="font-mono-telemetry text-[#10B981]">{seat.id}</span>
                </h2>
                <p className="mt-0.5 text-sm text-[#A4AEBC]">{seat.positionLabel}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Chiudi modulo prenotazione"
                className="tactile-btn inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/6 text-[#A4AEBC] hover:bg-white/12 hover:text-[#F5F6F8]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Form Body — strictly text-base (>= 16px) on all inputs for iOS Safari */}
            <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5 sm:px-6" noValidate>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="booking-first-name"
                    className="mb-1.5 block text-sm font-medium text-[#D6DCE5]"
                  >
                    Nome
                  </label>
                  <div className="relative">
                    <User
                      className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D8796]"
                      aria-hidden="true"
                    />
                    <input
                      ref={firstInputRef}
                      id="booking-first-name"
                      name="firstName"
                      type="text"
                      autoComplete="given-name"
                      placeholder="Es. Marco"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="min-h-[48px] w-full rounded-2xl border border-white/12 bg-[#181E27] py-3 pl-10 pr-4 text-base text-[#F5F6F8] placeholder:text-[#7D8796] focus:border-[#10B981]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="booking-last-name"
                    className="mb-1.5 block text-sm font-medium text-[#D6DCE5]"
                  >
                    Cognome
                  </label>
                  <input
                    id="booking-last-name"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    placeholder="Es. Ferretti"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="min-h-[48px] w-full rounded-2xl border border-white/12 bg-[#181E27] px-4 py-3 text-base text-[#F5F6F8] placeholder:text-[#7D8796] focus:border-[#10B981]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="booking-pickup"
                  className="mb-1.5 block text-sm font-medium text-[#D6DCE5]"
                >
                  Dove passarti a prendere
                </label>
                <div className="relative">
                  <MapPin
                    className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#10B981]"
                    aria-hidden="true"
                  />
                  <input
                    id="booking-pickup"
                    name="pickupLocation"
                    type="text"
                    placeholder="Indirizzo, tappa o punto di incontro"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)}
                    required
                    className="min-h-[48px] w-full rounded-2xl border border-white/12 bg-[#181E27] py-3 pl-10 pr-4 text-base text-[#F5F6F8] placeholder:text-[#7D8796] focus:border-[#10B981]"
                  />
                </div>

                {/* Quick-pick stop chips */}
                <div className="mt-2.5 flex flex-wrap gap-2" role="group" aria-label="Tappe rapide">
                  {PICKUP_QUICK_CHIPS.map((stop) => {
                    const active = pickupLocation === stop;
                    return (
                      <button
                        key={stop}
                        type="button"
                        onClick={() => setPickupLocation(stop)}
                        className={`tactile-btn min-h-[36px] rounded-full border px-3 py-1.5 text-xs font-medium ${
                          active
                            ? 'border-[#10B981] bg-[#10B981]/20 text-[#6EE7B7]'
                            : 'border-white/10 bg-[#181E27] text-[#C7D0DC] hover:border-white/25 hover:text-[#F5F6F8]'
                        }`}
                      >
                        {stop}
                      </button>
                    );
                  })}
                </div>
              </div>

              {(validationError || errorMessage) && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/12 px-3.5 py-2.5 text-sm text-[#FCA5A5]"
                >
                  {validationError || errorMessage}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2.5 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="tactile-btn min-h-[48px] rounded-full border border-white/12 bg-transparent px-5 py-3 text-sm font-semibold text-[#C7D0DC] hover:bg-white/6 hover:text-[#F5F6F8]"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  data-testid="confirm-booking-submit"
                  className="tactile-btn inline-flex min-h-[48px] min-w-[180px] items-center justify-center gap-2 rounded-full bg-[#10B981] px-6 py-3 text-base font-bold text-[#042419] hover:bg-[#34D399] disabled:opacity-65"
                >
                  <Check className="h-5 w-5" aria-hidden="true" />
                  <span>{isSubmitting ? 'Salvataggio…' : 'Conferma posto'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
