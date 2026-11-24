import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  collection,
  doc,
  getFirestore,
  onSnapshot,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import type { BookingInput, BookingsMap, SeatBooking, SeatId } from '../types/roadtrip';

const CLIENT_TOKEN_KEY = 'caravelle_t5_client_token_v1';
const LOCAL_BOOKINGS_KEY = 'caravelle_t5_bookings_v1';
const BROADCAST_CHANNEL_NAME = 'caravelle_t5_sync_v1';
const COLLECTION_PATH = 'trips/trento-zagarolo/seats';

const SEEDED_LOCAL_BOOKINGS: BookingsMap = {
  M1: {
    seatId: 'M1',
    firstName: 'Dani',
    lastName: 'Rossi',
    pickupLocation: "Via Torre Vanga (Joy's), Trento",
    clientToken: 'seed-participant-dani',
    updatedAt: 1732450000000,
  },
  R2: {
    seatId: 'R2',
    firstName: 'Taio',
    lastName: 'Bianchi',
    pickupLocation: 'Cesena (FC)',
    clientToken: 'seed-participant-taio',
    updatedAt: 1732450060000,
  },
};

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

function getFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (!apiKey || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;

function ensureFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;
  const cfg = getFirebaseConfig();
  if (!cfg) return null;
  try {
    firebaseApp = initializeApp(cfg);
    firestoreDb = getFirestore(firebaseApp);
    return firestoreDb;
  } catch {
    return null;
  }
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

export function subscribeToBookings(
  onUpdate: (bookings: BookingsMap, mode: SyncMode) => void,
  onError?: (message: string) => void
): () => void {
  const db = ensureFirestore();

  if (db) {
    try {
      const seatsCol = collection(db, COLLECTION_PATH);
      const unsub = onSnapshot(
        seatsCol,
        (snapshot) => {
          const map: BookingsMap = {};
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Partial<SeatBooking>;
            const seatId = docSnap.id as SeatId;
            if (data.firstName && data.clientToken) {
              map[seatId] = {
                seatId,
                firstName: data.firstName,
                lastName: data.lastName ?? '',
                pickupLocation: data.pickupLocation ?? '',
                clientToken: data.clientToken,
                updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : Date.now(),
              };
            }
          });
          onUpdate(map, 'firebase');
        },
        () => {
          // Automatic offline/local fallback if Firestore rules/network fail
          onUpdate(readLocalBookings(), 'local');
          onError?.('Sincronizzazione cloud non raggiungibile: modalità locale attiva.');
        }
      );
      return unsub;
    } catch {
      // Fallback immediately to local sync
    }
  }

  // Local real-time sync (same tab + cross-tab via storage + BroadcastChannel)
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
  currentBookings: BookingsMap
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
      const existingOwned = findMySeat(currentBookings, clientToken);
      await runTransaction(db, async (tx) => {
        const targetRef = doc(db, COLLECTION_PATH, seatId);
        const targetSnap = await tx.get(targetRef);
        if (targetSnap.exists()) {
          const data = targetSnap.data() as Partial<SeatBooking>;
          if (data.clientToken && data.clientToken !== clientToken) {
            throw new Error('Questo posto è appena stato prenotato da un altro passeggero.');
          }
        }

        if (existingOwned && existingOwned.seatId !== seatId) {
          const prevRef = doc(db, COLLECTION_PATH, existingOwned.seatId);
          tx.delete(prevRef);
        }

        tx.set(targetRef, newBooking);
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
      await runTransaction(db, async (tx) => {
        const ref = doc(db, COLLECTION_PATH, currentMine.seatId);
        const snap = await tx.get(ref);
        if (snap.exists() && snap.data()?.clientToken === clientToken) {
          tx.delete(ref);
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
