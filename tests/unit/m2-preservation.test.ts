/**
 * M2 must not move anything readers see. The nine map markers, now drawn from coordinate facts,
 * must sit exactly where the Phase 1 markers were (values copied from src/data/sintra-map.ts at 0eadbee).
 */
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadContentFromDisk } from '../../src/lib/content/load-fs.ts';

const PHASE_1_MARKERS: [string, number, number][] = [
  ['place.sintra.national-palace', 38.79736, -9.39052],
  ['place.sintra.quinta-da-regaleira', 38.795875, -9.397281],
  ['place.sintra.moorish-castle', 38.79007, -9.3893],
  ['place.sintra.pena-palace', 38.7879, -9.3876],
  ['place.sintra.monserrate', 38.791861, -9.419192],
  ['place.sintra.museu-anjos-teixeira', 38.79683, -9.38733],
  ['place.sintra.parque-da-liberdade', 38.79667, -9.38628],
  ['place.sintra.miradouro-sao-martinho', 38.79644, -9.39175],
  ['place.sintra.villa-sassetti', 38.79572, -9.39067],
];

const root = fileURLToPath(new URL('../../', import.meta.url));
const c = loadContentFromDisk(root);
type Rec = Record<string, any>;

describe('M2 preserves the map', () => {
  it('the map list has the same nine places in the same order', () => {
    const map = (c.lists as Rec[]).find((l) => l.id === 'list.sintra.map')!;
    expect(map.items).toHaveLength(9);
  });
  it('every marker coordinate equals its Phase 1 value', () => {
    const map = (c.lists as Rec[]).find((l) => l.id === 'list.sintra.map')!;
    const facts = new Map((c.factSets as Rec[]).flatMap((s) => s.facts).map((f: Rec) => [f.id, f]));
    const now = map.items.map((id: string) => {
      const p = (c.places as Rec[]).find((x) => x.id === id)!;
      const f = facts.get(p.map.coordinates)!;
      return [p.map.label, f.value.lat, f.value.lon];
    });
    const labels = (c.places as Rec[]).filter((p) => p.map).map((p) => p.map.label);
    expect(labels).toHaveLength(9);
    expect(now.map(([, lat, lon]: number[]) => [lat, lon])).toEqual(PHASE_1_MARKERS.map(([, lat, lon]) => [lat, lon]));
  });
});
