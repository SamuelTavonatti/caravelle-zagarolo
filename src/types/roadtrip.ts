export type SeatId = 'F1' | 'F2' | 'M1' | 'M2' | 'M3' | 'R1' | 'R2' | 'R3';

export type SeatRow = 'front' | 'middle' | 'rear';

export type AppAct = 'exterior' | 'cabin' | 'curtain' | 'trailer';

export interface SeatDefinition {
  id: SeatId;
  row: SeatRow;
  rowLabel: string;
  positionLabel: string;
  shortNote: string;
  povTitle: string;
  povDescription: string;
  windowSide: 'left' | 'center' | 'right';
  panOffset: number; // -1 (left) to +1 (right) for subtle seat-specific POV shift
}

export interface SeatBooking {
  seatId: SeatId;
  firstName: string;
  lastName: string;
  pickupLocation: string;
  clientToken: string;
  updatedAt: number;
}

export type BookingsMap = Partial<Record<SeatId, SeatBooking>>;

export interface BookingInput {
  firstName: string;
  lastName: string;
  pickupLocation: string;
}

export interface RouteStop {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  overlayText?: string;
  coordinates: [number, number];
  isHighwayEntry?: boolean;
  isFinale?: boolean;
  zoom: number;
  pitch: number;
  kmFromStart: number;
}

export interface RouteLeg {
  id: string;
  fromStopId: string;
  toStopId: string;
  label: string;
  roadBadge: string;
  coordinates: [number, number][];
  distanceKm: number;
  durationSec: number;
  cruiseKmh: number;
  zoom: number;
  pitch: number;
  isHighwaySegment?: boolean;
}
