import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { buildMarker } from '../../src/lib/map/markers';
import { loadContentFromDisk } from '../../src/lib/content/load-fs';

const place = { id: 'place.x.y', map: { coordinates: 'fact.x.y.coordinates', category: 'monument' as const, label: 'Y', zone_label: 'Z' } };
const fact = (over: Record<string, unknown>) => ({ id: 'fact.x.y.coordinates', source: 'src.x', provenance: 'official-page-read', value: { lat: 38.1, lon: -9.1 }, ...over }) as any;

describe('marker coordinate verification mirrors the fact status', () => {
  it('checked carries checked_on', () => {
    const m = buildMarker(place, fact({ status: 'checked', checked_on: '2026-11-10' }));
    expect(m.coordinates).toEqual({ status: 'checked', fact: 'fact.x.y.coordinates', source: 'src.x', provenance: 'official-page-read', checkedOn: '2026-11-10' });
    expect([m.lat, m.lon]).toEqual([38.1, -9.1]);
  });
  it('reported stays reported (not official)', () => {
    expect(buildMarker(place, fact({ status: 'reported' })).coordinates).toEqual({ status: 'reported', fact: 'fact.x.y.coordinates', source: 'src.x', provenance: 'official-page-read' });
  });
  it('confirm-first stays confirm-first', () => {
    expect(buildMarker(place, fact({ status: 'confirm-first', provenance: 'legacy-website' })).coordinates.status).toBe('confirm-first');
  });
  it('unresolved stays unresolved and names its conflict group', () => {
    const c = buildMarker(place, fact({ status: 'unresolved', conflict_group: 'y-coordinates' })).coordinates;
    expect(c.status).toBe('unresolved'); expect(c.conflictGroup).toBe('y-coordinates');
  });
  it('rejects inconsistent facts', () => {
    expect(() => buildMarker(place, fact({ status: 'checked' }))).toThrow(/checked_on/);
    expect(() => buildMarker(place, fact({ status: 'unresolved' }))).toThrow(/conflict_group/);
    expect(() => buildMarker(place, undefined)).toThrow(/missing/);
    expect(() => buildMarker(place, fact({ status: 'reported', value: { lat: '38' } }))).toThrow(/numeric/);
  });
});

describe('Sintra map: verification per marker (coordinates unchanged, see m2-preservation)', () => {
  const c = loadContentFromDisk(fileURLToPath(new URL('../../', import.meta.url))) as any;
  const facts = new Map(c.factSets.flatMap((s: any) => s.facts).map((f: any) => [f.id, f]));
  const map = c.lists.find((l: any) => l.id === 'list.sintra.map');
  const markers = map.items.map((id: string) => { const p = c.places.find((x: any) => x.id === id); return buildMarker(p, facts.get(p.map.coordinates) as any); });
  const status = Object.fromEntries(markers.map((m: any) => [m.id, m.coordinates.status]));
  it('matches the recorded fact statuses', () => {
    expect(status).toEqual({
      'place.sintra.national-palace-gardens': 'unresolved',
      'place.sintra.quinta-da-regaleira': 'checked',
      'place.sintra.moorish-castle': 'checked',
      'place.sintra.pena-palace': 'checked',
      'place.sintra.monserrate': 'unresolved',
      'place.sintra.museu-anjos-teixeira': 'confirm-first',
      'place.sintra.parque-da-liberdade': 'confirm-first',
      'place.sintra.miradouro-sao-martinho': 'confirm-first',
      'place.sintra.villa-sassetti': 'checked',
    });
  });
});
