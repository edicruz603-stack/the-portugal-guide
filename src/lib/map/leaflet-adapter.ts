import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { MapAdapter, MapPlace } from './types.ts';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const COLOURS: Record<MapPlace['category'], string> = { monument: '#6e5b29', free: '#1f3a2d' };

/**
 * Leaflet engine. Uses the public OSM raster tiles for normal interactive viewing only
 * (no prefetch or offline caching, per the OSMF tile usage policy).
 */
export const leafletAdapter: MapAdapter = {
  mount(el, places) {
    const map = L.map(el, { scrollWheelZoom: false, keyboard: true }).setView([38.7955, -9.3975], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    for (const p of places) {
      L.circleMarker([p.lat, p.lon], { radius: 8, color: '#f4eedf', weight: 2, fillColor: COLOURS[p.category], fillOpacity: 1 })
        .addTo(map)
        .bindPopup(`<strong>${escape(p.name)}</strong><br><small>${escape(p.zone)}</small>`);
    }
    setTimeout(() => map.invalidateSize(), 250);
  },
};
