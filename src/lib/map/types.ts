/**
 * MapView contract. Any map engine (Leaflet now, MapLibre later) implements MapAdapter.
 * Pages and content never import an engine directly.
 */
export type CoordinatePrecision =
  | 'official'      // published by the operator; source recorded
  | 'approximate';  // visitor-area marker, not yet verified against an official source

export interface MapPlace {
  id: string;                 // stable ID, e.g. place.sintra.pena-palace
  name: string;
  zone: string;
  lat: number;
  lon: number;
  category: 'monument' | 'free';
  precision: CoordinatePrecision;
  source?: string;            // required when precision === 'official'
}

export interface MapAdapter {
  mount(el: HTMLElement, places: MapPlace[]): void | Promise<void>;
}
