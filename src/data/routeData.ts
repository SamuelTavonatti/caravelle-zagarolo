import continuousRoute from './osrm_continuous.json';
import type { RouteStop, SeatDefinition, SeatId } from '../types/roadtrip';

export const SKETCHFAB_T5_EMBED_URL =
  'https://sketchfab.com/models/ee2e1e8000db4deabaf59bae97eddecf/embed?autostart=1&ui_theme=dark';

export const SEATS: SeatDefinition[] = [
  {
    id: 'F1',
    row: 'front',
    rowLabel: 'PRIMA FILA',
    positionLabel: 'Panca anteriore · Centro',
    shortNote: 'Vista diretta su parabrezza e plancia T5',
    povTitle: 'Plancia anteriore e strada davanti',
    povDescription:
      'Visuale dal posto centrale anteriore: cruscotto Volkswagen T5, cambio rialzato e carreggiata frontale.',
    windowSide: 'center',
    panOffset: -0.35,
  },
  {
    id: 'F2',
    row: 'front',
    rowLabel: 'PRIMA FILA',
    positionLabel: 'Panca anteriore · Finestrino destro',
    shortNote: 'Posto copilota e controllo navigazione',
    povTitle: 'Posto copilota · Finestrino destro',
    povDescription:
      'Visuale frontale e laterale destra, posizione di riferimento per rotta, tappe e musica a bordo.',
    windowSide: 'right',
    panOffset: 0.45,
  },
  {
    id: 'M1',
    row: 'middle',
    rowLabel: 'SECONDA FILA',
    positionLabel: 'Fila centrale · Finestrino sinistro',
    shortNote: 'Ampio spazio gambe lato sinistro',
    povTitle: 'Seconda fila · Lato sinistro e portellone',
    povDescription:
      'Seduta rialzata con ampio spazio gambe, vetratura sinistra e visuale trasversale sul portellone scorrevole.',
    windowSide: 'left',
    panOffset: -0.5,
  },
  {
    id: 'M2',
    row: 'middle',
    rowLabel: 'SECONDA FILA',
    positionLabel: 'Fila centrale · Centro cabina',
    shortNote: 'Baricentro abitacolo e visuale aperta',
    povTitle: 'Seconda fila · Centro cabina',
    povDescription:
      'Posizione centrale dell’abitacolo Caravelle con linea visiva equilibrata tra prima fila e portellone laterale.',
    windowSide: 'center',
    panOffset: 0,
  },
  {
    id: 'M3',
    row: 'middle',
    rowLabel: 'SECONDA FILA',
    positionLabel: 'Fila centrale · Lato portellone',
    shortNote: 'Accesso diretto al portellone destro',
    povTitle: 'Seconda fila · Affaccio portellone scorrevole',
    povDescription:
      'Accesso immediato per salita e discesa alle tappe intermedie, con affaccio diretto sul lato destro.',
    windowSide: 'right',
    panOffset: 0.55,
  },
  {
    id: 'R1',
    row: 'rear',
    rowLabel: 'TERZA FILA',
    positionLabel: 'Panca posteriore · Finestrino sinistro',
    shortNote: 'Vetratura panoramica e quiete sul lungo tratto',
    povTitle: 'Terza fila · Panoramica sinistra',
    povDescription:
      'Vista longitudinale sull’intera cabina e ampia vetratura posteriore per il tratto autostradale verso Roma.',
    windowSide: 'left',
    panOffset: -0.5,
  },
  {
    id: 'R2',
    row: 'rear',
    rowLabel: 'TERZA FILA',
    positionLabel: 'Panca posteriore · Centro',
    shortNote: 'Prospettiva completa su tutto l’abitacolo',
    povTitle: 'Terza fila · Asse centrale',
    povDescription:
      'Seduta posteriore centrale con visuale profonda tra i poggiatesta fino al parabrezza anteriore.',
    windowSide: 'center',
    panOffset: 0,
  },
  {
    id: 'R3',
    row: 'rear',
    rowLabel: 'TERZA FILA',
    positionLabel: 'Panca posteriore · Finestrino destro',
    shortNote: 'Vetratura destra e vano bagagli alle spalle',
    povTitle: 'Terza fila · Panoramica destra',
    povDescription:
      'Angolo riservato sul lato destro con vista aperta sul percorso appenninico e accesso diretto ai bagagli.',
    windowSide: 'right',
    panOffset: 0.5,
  },
];

export const SEAT_MAP: Record<SeatId, SeatDefinition> = Object.fromEntries(
  SEATS.map((s) => [s.id, s])
) as Record<SeatId, SeatDefinition>;

export const PICKUP_QUICK_CHIPS: string[] = [
  'Via Cocciadoro 1, Trento',
  "Via Torre Vanga (Joy's), Trento",
  'Pomarolo (TN)',
  'Riva del Garda (TN)',
  'Cesena (FC)',
];

export interface ContinuousOsrmRoute {
  totalDistanceKm: number;
  stopIndices: number[];
  stopKm: number[];
  legDistancesKm: number[];
  coordinates: [number, number][];
}

export const CONTINUOUS_ROUTE: ContinuousOsrmRoute = continuousRoute as ContinuousOsrmRoute;

export const ROUTE_STOPS: RouteStop[] = [
  {
    id: 'partenza',
    badge: 'PARTENZA',
    title: 'Via Cocciadoro 1, Trento',
    subtitle: 'Avvio navigazione · VW Caravelle T5',
    coordinates: CONTINUOUS_ROUTE.coordinates[CONTINUOUS_ROUTE.stopIndices[0]],
    zoom: 16.5,
    pitch: 58,
    kmFromStart: CONTINUOUS_ROUTE.stopKm[0],
  },
  {
    id: 'tappa-1',
    badge: 'TAPPA 01',
    title: "Via Torre Vanga · Piazza Dante (Joy's), Trento",
    subtitle: 'Centro storico di Trento',
    overlayText: 'Si prende Dani',
    coordinates: CONTINUOUS_ROUTE.coordinates[CONTINUOUS_ROUTE.stopIndices[1]],
    zoom: 16.5,
    pitch: 58,
    kmFromStart: CONTINUOUS_ROUTE.stopKm[1],
  },
  {
    id: 'tappa-2',
    badge: 'TAPPA 02',
    title: 'Pomarolo (TN)',
    subtitle: 'SS12 · Vallagarina',
    overlayText: 'Si prende Arianna',
    coordinates: CONTINUOUS_ROUTE.coordinates[CONTINUOUS_ROUTE.stopIndices[2]],
    zoom: 14.4,
    pitch: 58,
    kmFromStart: CONTINUOUS_ROUTE.stopKm[2],
  },
  {
    id: 'tappa-3',
    badge: 'TAPPA 03',
    title: 'Riva del Garda (TN)',
    subtitle: 'SS240 · Alto Garda',
    overlayText: 'Si prendono Eleonora e Mattia',
    coordinates: CONTINUOUS_ROUTE.coordinates[CONTINUOUS_ROUTE.stopIndices[3]],
    zoom: 14.3,
    pitch: 58,
    kmFromStart: CONTINUOUS_ROUTE.stopKm[3],
  },
  {
    id: 'autostrada',
    badge: 'AUTOSTRADA',
    title: 'Casello Rovereto Sud · A22 → A1 → A14',
    subtitle: 'Ingresso corridoio autostradale sud',
    overlayText: 'Ingresso in Autostrada · A22 → A1 → A14',
    coordinates: CONTINUOUS_ROUTE.coordinates[CONTINUOUS_ROUTE.stopIndices[4]],
    isHighwayEntry: true,
    zoom: 13.6,
    pitch: 62,
    kmFromStart: CONTINUOUS_ROUTE.stopKm[4],
  },
  {
    id: 'tappa-4',
    badge: 'TAPPA 04',
    title: 'Cesena (FC)',
    subtitle: 'Uscita A14 Adriatica · Romagna',
    overlayText: 'Si prende Taio',
    coordinates: CONTINUOUS_ROUTE.coordinates[CONTINUOUS_ROUTE.stopIndices[5]],
    zoom: 13.6,
    pitch: 58,
    kmFromStart: CONTINUOUS_ROUTE.stopKm[5],
  },
  {
    id: 'arrivo',
    badge: 'ARRIVO',
    title: 'Zagarolo (RM)',
    subtitle: 'Alle porte di Roma · Destinazione raggiunta',
    overlayText: 'Ben arrivati a Roma',
    coordinates: CONTINUOUS_ROUTE.coordinates[CONTINUOUS_ROUTE.stopIndices[6]],
    isFinale: true,
    zoom: 14.8,
    pitch: 58,
    kmFromStart: CONTINUOUS_ROUTE.stopKm[6],
  },
];

export interface ContinuousLegMeta {
  id: string;
  label: string;
  roadBadge: string;
  startKm: number;
  endKm: number;
  durationSec: number;
  cruiseKmh: number;
  zoom: number;
  pitch: number;
  isHighwaySegment?: boolean;
}

export const CONTINUOUS_LEGS: ContinuousLegMeta[] = [
  {
    id: 'leg-1',
    label: 'Trento centro',
    roadBadge: 'Via Cocciadoro → Via Torre Vanga',
    startKm: CONTINUOUS_ROUTE.stopKm[0],
    endKm: CONTINUOUS_ROUTE.stopKm[1],
    durationSec: 3.8,
    cruiseKmh: 38,
    zoom: 16.4,
    pitch: 58,
  },
  {
    id: 'leg-2',
    label: 'Direzione Pomarolo',
    roadBadge: 'SS12 · Vallagarina',
    startKm: CONTINUOUS_ROUTE.stopKm[1],
    endKm: CONTINUOUS_ROUTE.stopKm[2],
    durationSec: 4.5,
    cruiseKmh: 84,
    zoom: 13.2,
    pitch: 58,
  },
  {
    id: 'leg-3',
    label: 'Discesa verso Riva del Garda',
    roadBadge: 'SS240 · Passo San Giovanni',
    startKm: CONTINUOUS_ROUTE.stopKm[2],
    endKm: CONTINUOUS_ROUTE.stopKm[3],
    durationSec: 4.6,
    cruiseKmh: 76,
    zoom: 13.0,
    pitch: 58,
  },
  {
    id: 'leg-4',
    label: 'Verso il Casello A22',
    roadBadge: 'Riva → Casello Rovereto Sud',
    startKm: CONTINUOUS_ROUTE.stopKm[3],
    endKm: CONTINUOUS_ROUTE.stopKm[4],
    durationSec: 4.0,
    cruiseKmh: 94,
    zoom: 13.2,
    pitch: 60,
    isHighwaySegment: true,
  },
  {
    id: 'leg-5',
    label: 'Corridoio Autostradale Sud',
    roadBadge: 'A22 Brennero → A1 → A14 Adriatica',
    startKm: CONTINUOUS_ROUTE.stopKm[4],
    endKm: CONTINUOUS_ROUTE.stopKm[5],
    durationSec: 6.2,
    cruiseKmh: 130,
    zoom: 10.2,
    pitch: 60,
    isHighwaySegment: true,
  },
  {
    id: 'leg-6',
    label: 'Direzione Roma · Zagarolo',
    roadBadge: 'E45 → A1 → Roma Est → Zagarolo',
    startKm: CONTINUOUS_ROUTE.stopKm[5],
    endKm: CONTINUOUS_ROUTE.stopKm[6],
    durationSec: 6.0,
    cruiseKmh: 126,
    zoom: 10.2,
    pitch: 58,
    isHighwaySegment: true,
  },
];
