/**
 * MapView contract. Any map engine (Leaflet now, MapLibre later) implements MapAdapter.
 * Pages and content never import an engine directly.
 */
/**
 * How far a marker's coordinates are verified. Mirrors the coordinate fact's status 1:1 —
 * the map never upgrades or summarises it.
 *   checked        read on the cited source and confirmed (fact has checked_on)
 *   reported       taken from a recorded source but not re-checked
 *   confirm-first  approximate visitor-area position; confirm before relying on it
 *   unresolved     sources disagree (fact has a conflict_group); shown with the chosen reading
 */
export type CoordinateStatus = 'checked' | 'reported' | 'confirm-first' | 'unresolved';

export interface CoordinateVerification {
  status: CoordinateStatus;
  fact: string;               // coordinate fact ID, e.g. fact.sintra.pena-palace.coordinates-main-entrance
  source: string;             // source ID from sources.json
  provenance: string;         // how the value entered the content (official-page-read, pdf-first-edition-2026 …)
  checkedOn?: string;         // only when status === 'checked'
  conflictGroup?: string;     // only when status === 'unresolved'
}

export interface MapPlace {
  id: string;                 // stable ID, e.g. place.sintra.pena-palace
  name: string;
  zone: string;
  lat: number;
  lon: number;
  category: 'monument' | 'free';
  coordinates: CoordinateVerification;
}

export interface MapAdapter {
  mount(el: HTMLElement, places: MapPlace[]): void | Promise<void>;
}
