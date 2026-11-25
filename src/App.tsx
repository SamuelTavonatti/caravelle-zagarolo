import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Lenis from 'lenis';
import { AnimatePresence, MotionConfig } from 'motion/react';
import { ActOneExterior } from './components/ActOneExterior';
import { ActTwoCabin } from './components/ActTwoCabin';
import { BlackCurtain } from './components/BlackCurtain';

const ActThreeTrailer = lazy(() =>
  import('./components/ActThreeTrailer').then((m) => ({ default: m.ActThreeTrailer }))
);
import {
  adoptSeatByLastName,
  bookSeatAtomic,
  findMySeat,
  getOrCreateClientToken,
  getSyncMode,
  releaseMySeatAtomic,
  subscribeToBookings,
  switchSeatAtomic,
  type SyncMode,
} from './services/seatSync';
import type { AppAct, BookingInput, BookingsMap, SeatBooking, SeatId } from './types/roadtrip';

export function App() {
  const [act, setAct] = useState<AppAct>('exterior');
  const [bookings, setBookings] = useState<BookingsMap>({});
  const [syncMode, setSyncMode] = useState<SyncMode>(() => getSyncMode());
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [clientToken, setClientToken] = useState<string>(() => getOrCreateClientToken());
  const myBooking = useMemo(() => findMySeat(bookings, clientToken), [bookings, clientToken]);

  const lenisRef = useRef<Lenis | null>(null);

  // Real-time Firestore onSnapshot (with automatic local/offline fallback)
  useEffect(() => {
    const unsubscribe = subscribeToBookings((nextBookings, mode) => {
      setBookings(nextBookings);
      setSyncMode(mode);
    });
    return unsubscribe;
  }, []);

  // Lenis smooth inertial scroll lifecycle (active in scrollable Act II, respects prefers-reduced-motion)
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || act !== 'cabin') {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      return;
    }

    const lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1.0,
      smoothWheel: true,
      autoRaf: false,
    });
    lenisRef.current = lenis;

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [act]);

  // Pause Lenis whenever a modal or celebration overlay is open
  useEffect(() => {
    if (!lenisRef.current) return;
    if (isModalOpen) {
      lenisRef.current.stop();
    } else {
      lenisRef.current.start();
    }
  }, [isModalOpen]);

  // Scroll to top cleanly on act transitions
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [act]);

  const handleBookSeat = useCallback(
    async (seatId: SeatId, input: BookingInput) => {
      await bookSeatAtomic(seatId, input, clientToken, bookings);
    },
    [bookings, clientToken]
  );

  const handleSwitchSeat = useCallback(
    async (targetSeatId: SeatId) => {
      await switchSeatAtomic(targetSeatId, clientToken, bookings);
    },
    [bookings, clientToken]
  );

  const handleReleaseSeat = useCallback(async () => {
    await releaseMySeatAtomic(clientToken, bookings);
  }, [bookings, clientToken]);

  const handleAdoptSeat = useCallback(
    (booking: SeatBooking, verificationInput: string) => {
      const adoptedToken = adoptSeatByLastName(booking, verificationInput);
      setClientToken(adoptedToken);
    },
    []
  );

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-[100dvh] w-full bg-[#090B0E] text-[#F5F6F8]">
        <AnimatePresence mode="wait">
          {act === 'exterior' && (
            <ActOneExterior
              key="act-exterior"
              bookings={bookings}
              mySeatId={myBooking?.seatId ?? null}
              onEnterCabin={() => setAct('cabin')}
              onJumpToTrailer={() => setAct('curtain')}
            />
          )}

          {act === 'cabin' && (
            <ActTwoCabin
              key="act-cabin"
              bookings={bookings}
              myBooking={myBooking}
              clientToken={clientToken}
              syncMode={syncMode}
              onBookSeat={handleBookSeat}
              onSwitchSeat={handleSwitchSeat}
              onReleaseSeat={handleReleaseSeat}
              onAdoptSeat={handleAdoptSeat}
              onBookingCelebrationDone={() => setAct('curtain')}
              onBackToExterior={() => setAct('exterior')}
              onOpenTrailer={() => setAct('curtain')}
              onModalToggle={setIsModalOpen}
            />
          )}

          {act === 'curtain' && (
            <BlackCurtain
              key="act-curtain"
              myBooking={myBooking}
              onStartTrailer={() => setAct('trailer')}
              onBackToCabin={() => setAct('cabin')}
            />
          )}

          {act === 'trailer' && (
            <Suspense
              fallback={
                <div className="flex h-[100dvh] w-full items-center justify-center bg-[#050507] text-sm font-medium text-[#A4AEBC]">
                  Caricamento mappa 3D…
                </div>
              }
            >
              <ActThreeTrailer
                key="act-trailer"
                onBackToCabin={() => setAct('cabin')}
              />
            </Suspense>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default App;
