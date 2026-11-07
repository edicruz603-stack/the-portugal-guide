import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import type { MapAdapter } from './types.ts';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Read-only record of where markers were placed, exposed for automated tests. */
export interface MountedMarker { id: string; lat: number; lon: number }
declare global { interface HTMLElement { tpgMarkers?: MountedMarker[] } }

/**
 * Leaflet engine. Uses the public OSM raster tiles for normal interactive viewing only
 * (no prefetch or offline caching, per the OSMF tile usage policy).
 *
 * Nearby markers are grouped into a numbered cluster instead of overlapping. Selecting a cluster
 * (click, tap, or Enter) zooms in until the places separate; if they still share a spot at the
 * deepest zoom they fan out ("spiderfy"). Markers always sit on their real coordinates.
 */
export const leafletAdapter: MapAdapter = {
  async mount(el, places) {
    // leaflet.markercluster is a UMD plugin that extends the global L.
    (window as unknown as { L: typeof L }).L = L;
    await import('leaflet.markercluster');

    const map = L.map(el, { scrollWheelZoom: false, keyboard: true }).setView([38.7955, -9.3975], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      maxClusterRadius: 36,          // px: only markers that would visually collide are grouped
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: (c) => {
        const n = c.getChildCount();
        return L.divIcon({
          className: 'tpg-cluster-icon',
          html: `<span class="tpg-cluster" aria-hidden="true">${n}</span><span class="tpg-sr">${n} places close together. Select to zoom in.</span>`,
          iconSize: [44, 44],
        });
      },
    });
    // Keyboard: Enter on a focused cluster behaves like a click.
    cluster.on('clusterkeypress', (e) => {
      const ev = (e as unknown as { originalEvent: KeyboardEvent; layer: L.MarkerCluster }).originalEvent;
      if (ev.key === 'Enter') (e as unknown as { layer: L.MarkerCluster }).layer.zoomToBounds({ padding: [40, 40] });
    });

    const mounted: MountedMarker[] = [];
    for (const p of places) {
      const icon = L.divIcon({
        className: 'tpg-marker-icon',
        html: `<span class="tpg-dot tpg-dot--${p.category}" aria-hidden="true"></span><span class="tpg-sr">${escape(p.name)}</span>`,
        iconSize: [32, 32],     // touch target; the visible dot is 16 px and centred on the coordinate
        iconAnchor: [16, 16],
        popupAnchor: [0, -10],
      });
      const marker = L.marker([p.lat, p.lon], { icon, keyboard: true, riseOnHover: true })
        .bindPopup(`<strong>${escape(p.name)}</strong><br><small>${escape(p.zone)}</small>`);
      cluster.addLayer(marker);
      const ll = marker.getLatLng();
      mounted.push({ id: p.id, lat: ll.lat, lon: ll.lng });
    }
    map.addLayer(cluster);
    el.tpgMarkers = mounted;
    el.dataset.mapReady = 'true';
    setTimeout(() => map.invalidateSize(), 250);
  },
};
