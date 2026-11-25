import {
  doc,
  onSnapshot,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import { db as firebaseDb } from '../lib/firebase';
import type { BookingInput, BookingsMap, SeatBooking, SeatId } from '../types/roadtrip';

const CLIENT_TOKEN_KEY = 'caravelle_t5_client_token_v1';
const LOCAL_BOOKINGS_KEY = 'caravelle_t5_bookings_v2';
const BROADCAST_CHANNEL_NAME = 'caravelle_t5_sync_v2';
const TRIP_COLLECTION = 'trips';
const TRIP_DOC_ID = 'zagarolo-2027';

const SEEDED_LOCAL_BOOKINGS: BookingsMap = {};

export type SyncMode = 'firebase' | 'local';

function generateToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `dev-${crypto.randomUUID()}`;
  }
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getOrCreateClientToken(): string {
  try {
    const existing = localStorage.getItem(CLIENT_TOKEN_KEY);
    if (existing && existing.length > 4) return existing;
    const created = generateToken();
    localStorage.setItem(CLIENT_TOKEN_KEY, created);
    return created;
  } catch {
    return generateToken();
  }
}

let cloudFallbackToLocal = false;

function ensureFirestore(): Firestore | null {
  if (cloudFallbackToLocal) return null;
  return firebaseDb ?? null;
}

function parseSeatsMap(raw: unknown): BookingsMap {
  const map: BookingsMap = {};
  if (!raw || typeof raw !== 'object') return map;
  for (const [key, val] of Object.entries(raw as Record<string, Partial<SeatBooking>>)) {
    if (val && typeof val === 'object' && val.firstName && val.clientToken) {
      const seatId = key as SeatId;
      map[seatId] = {
        seatId,
        firstName: val.firstName,
        lastName: val.lastName ?? '',
        pickupLocation: val.pickupLocation ?? '',
        clientToken: val.clientToken,
        updatedAt: typeof val.updatedAt === 'number' ? val.updatedAt : Date.now(),
      };
    }
  }
  return map;
}

function readLocalBookings(): BookingsMap {
  try {
    const raw = localStorage.getItem(LOCAL_BOOKINGS_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(SEEDED_LOCAL_BOOKINGS));
      return { ...SEEDED_LOCAL_BOOKINGS };
    }
    const parsed = JSON.parse(raw) as BookingsMap;
    return parsed && typeof parsed === 'object' ? parsed : { ...SEEDED_LOCAL_BOOKINGS };
  } catch {
    return { ...SEEDED_LOCAL_BOOKINGS };
  }
}

function writeLocalBookings(next: BookingsMap): void {
  try {
    localStorage.setItem(LOCAL_BOOKINGS_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota/storage errors in restricted environments
  }
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      ch.postMessage({ type: 'BOOKINGS_UPDATED', payload: next });
      ch.close();
    }
  } catch {
    // Fallback gracefully
  }
  window.dispatchEvent(new CustomEvent('caravelle-local-sync', { detail: next }));
}

export function getSyncMode(): SyncMode {
  return ensureFirestore() ? 'firebase' : 'local';
}

function subscribeLocal(onUpdate: (bookings: BookingsMap, mode: SyncMode) => void): () => void {
  onUpdate(readLocalBookings(), 'local');

  const handleStorage = (event: StorageEvent) => {
    if (event.key === LOCAL_BOOKINGS_KEY) {
      onUpdate(readLocalBookings(), 'local');
    }
  };

  const handleCustom = (event: Event) => {
    const customEvent = event as CustomEvent<BookingsMap>;
    if (customEvent.detail) {
      onUpdate({ ...customEvent.detail }, 'local');
    }
  };

  let channel: BroadcastChannel | null = null;
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.onmessage = (msg) => {
        if (msg.data?.type === 'BOOKINGS_UPDATED' && msg.data.payload) {
          onUpdate({ ...(msg.data.payload as BookingsMap) }, 'local');
        }
      };
    } catch {
      channel = null;
    }
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener('caravelle-local-sync', handleCustom);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener('caravelle-local-sync', handleCustom);
    channel?.close();
  };
}

export function subscribeToBookings(
  onUpdate: (bookings: BookingsMap, mode: SyncMode) => void,
  onError?: (message: string) => void
): () => void {
  const db = ensureFirestore();

  if (db) {
    try {
      let unsubLocal: (() => void) | null = null;
      const tripRef = doc(db, TRIP_COLLECTION, TRIP_DOC_ID);
      const unsubCloud = onSnapshot(
        tripRef,
        (docSnap) => {
          cloudFallbackToLocal = false;
          const map = docSnap.exists() ? parseSeatsMap(docSnap.data()?.seats) : {};
          onUpdate(map, 'firebase');
        },
        () => {
          // Automatic offline/local fallback if Firestore rules/network fail
          cloudFallbackToLocal = true;
          if (!unsubLocal) {
            unsubLocal = subscribeLocal(onUpdate);
          }
          onError?.('Sincronizzazione cloud non raggiungibile: modalità locale attiva.');
        }
      );
      return () => {
        unsubCloud();
        unsubLocal?.();
      };
    } catch {
      cloudFallbackToLocal = true;
    }
  }

  return subscribeLocal(onUpdate);
}

export function findMySeat(bookings: BookingsMap, clientToken: string): SeatBooking | null {
  for (const booking of Object.values(bookings)) {
    if (booking && booking.clientToken === clientToken) {
      return booking;
    }
  }
  return null;
}

export async function bookSeatAtomic(
  seatId: SeatId,
  input: BookingInput,
  clientToken: string,
  _currentBookings: BookingsMap
): Promise<SeatBooking> {
  const trimmedFirst = input.firstName.trim();
  const trimmedLast = input.lastName.trim();
  const trimmedPickup = input.pickupLocation.trim();

  if (!trimmedFirst || !trimmedLast || !trimmedPickup) {
    throw new Error('Compila nome, cognome e punto di raccolta per confermare.');
  }

  const newBooking: SeatBooking = {
    seatId,
    firstName: trimmedFirst,
    lastName: trimmedLast,
    pickupLocation: trimmedPickup,
    clientToken,
    updatedAt: Date.now(),
  };

  const db = ensureFirestore();
  if (db) {
    try {
      const tripRef = doc(db, TRIP_COLLECTION, TRIP_DOC_ID);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(tripRef);
        const seats = snap.exists() ? parseSeatsMap(snap.data()?.seats) : {};

        const occupant = seats[seatId];
        if (occupant && occupant.clientToken !== clientToken) {
          throw new Error(`Questo posto è appena stato prenotato da ${occupant.firstName}.`);
        }

        // Enforce strict 1-seat-per-user invariant
        for (const [key, val] of Object.entries(seats)) {
          if (val && val.clientToken === clientToken) {
            delete seats[key as SeatId];
          }
        }

        seats[seatId] = newBooking;
        tx.set(tripRef, { seats, updatedAt: Date.now() }, { merge: true });
      });
      return newBooking;
    } catch (err) {
      if (err instanceof Error && err.message.includes('appena stato prenotato')) {
        throw err;
      }
      // Fall through to local persistence on Firebase connectivity errors
    }
  }

  const latest = readLocalBookings();
  const occupant = latest[seatId];
  if (occupant && occupant.clientToken !== clientToken) {
    throw new Error(`Posto già occupato da ${occupant.firstName}. Scegline un altro libero.`);
  }

  // Enforce strict 1-seat-per-user invariant
  for (const [key, val] of Object.entries(latest)) {
    if (val && val.clientToken === clientToken) {
      delete latest[key as SeatId];
    }
  }

  latest[seatId] = newBooking;
  writeLocalBookings(latest);
  return newBooking;
}

export async function switchSeatAtomic(
  targetSeatId: SeatId,
  clientToken: string,
  currentBookings: BookingsMap
): Promise<SeatBooking> {
  const currentMine = findMySeat(currentBookings, clientToken);
  if (!currentMine) {
    throw new Error('Nessun posto attivo da spostare.');
  }
  if (currentMine.seatId === targetSeatId) {
    return currentMine;
  }

  return bookSeatAtomic(
    targetSeatId,
    {
      firstName: currentMine.firstName,
      lastName: currentMine.lastName,
      pickupLocation: currentMine.pickupLocation,
    },
    clientToken,
    currentBookings
  );
}

export async function releaseMySeatAtomic(
  clientToken: string,
  currentBookings: BookingsMap
): Promise<void> {
  const currentMine = findMySeat(currentBookings, clientToken);
  if (!currentMine) return;

  const db = ensureFirestore();
  if (db) {
    try {
      const tripRef = doc(db, TRIP_COLLECTION, TRIP_DOC_ID);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(tripRef);
        if (!snap.exists()) return;
        const seats = parseSeatsMap(snap.data()?.seats);
        let changed = false;
        for (const [key, val] of Object.entries(seats)) {
          if (val && val.clientToken === clientToken) {
            delete seats[key as SeatId];
            changed = true;
          }
        }
        if (changed) {
          tx.set(tripRef, { seats, updatedAt: Date.now() }, { merge: true });
        }
      });
      return;
    } catch {
      // Fallback to local
    }
  }

  const latest = readLocalBookings();
  for (const [key, val] of Object.entries(latest)) {
    if (val && val.clientToken === clientToken) {
      delete latest[key as SeatId];
    }
  }
  writeLocalBookings(latest);
}
