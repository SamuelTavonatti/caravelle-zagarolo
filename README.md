# Trento → Zagarolo · Caravelle T5 (2008)

Applicazione web road-trip interattiva 100% Free & Open-Source per il viaggio **Trento → Zagarolo (Roma)** a bordo del **Volkswagen Caravelle (T5) bianco del 2008**.

## Stack 100% FOSS
- **React 19 + TypeScript + Vite + Tailwind CSS v4**
- **Motion** (molle fisiche critically damped `response: 0.45s, dampingRatio: 1.0`)
- **Lenis** (scorrimento inerziale fluido)
- **MapLibre GL JS** + **OpenFreeMap** (mappa 3D inclinata stile Apple Maps, geometria stradale reale OSRM)
- **Lucide Icons**
- **Firebase Firestore** (`onSnapshot` real-time su piano Spark gratuito, con fallback automatico locale `localStorage` + `BroadcastChannel` pronto all'uso)

## Avvio locale

```bash
npm install
npm run dev
```

Build di produzione e anteprima:

```bash
npm run build
npx vite preview --port 4174
```

## Configurazione opzionale Firebase (Piano Spark gratuito)
Copia `.env.example` in `.env` e inserisci le chiavi del tuo progetto Firebase Firestore (`trips/trento-zagarolo/seats`). Se `.env` non è configurato, l'app funziona immediatamente con sincronizzazione locale in tempo reale.
