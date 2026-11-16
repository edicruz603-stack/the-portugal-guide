/**
 * Regression (M3 closure, 16 Nov 2026): the National Palace gardens' last entry is disputed (18:00 vs 17:30,
 * unresolved). No visitor-facing presentation may state 18:00 — or any single time — as the confirmed last entry,
 * while the published hours (09:30–18:30) stay visible and the facts, sources and history stay in the data.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadContentFromDisk } from '../../src/lib/content/load-fs';
import { validateContent, DEFAULT_OPTIONS } from '../../src/lib/validation/validate';

const input = loadContentFromDisk(process.cwd());
const disputed = /last (entry|admission)\W{0,3}(at\s)?(18:00|17:30)/i;
const strings = (v: unknown): string[] => typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings) : v && typeof v === 'object' ? Object.values(v).flatMap(strings) : [];

describe('gardens last entry is never presented as settled', () => {
  const place = (input.places as { id: string; editorial: unknown }[]).find((p) => p.id === 'place.sintra.national-palace-gardens')!;
  it('canonical editorial text keeps the hours and states that sources differ', () => {
    const text = strings(place.editorial).join('\n');
    expect(text).toContain('09:30–18:30');
    expect(text).toMatch(/last entry: official sources differ/);
    expect(text).not.toMatch(disputed);
  });
  it('the conflict stays unresolved, with both values, sources and history preserved', () => {
    const facts = (input.factSets as { facts: { id: string; conflict_group?: string; status: string; value: Record<string, unknown>; source: string; quote?: string }[] }[]).flatMap((s) => s.facts)
      .filter((f) => f.conflict_group === 'national-palace-gardens-last-entry');
    expect(facts.length).toBeGreaterThanOrEqual(2);
    expect(facts.every((f) => f.status === 'unresolved')).toBe(true);
    expect(new Set(facts.map((f) => f.value.time))).toEqual(new Set(['18:00', '17:30']));
    expect(facts.every((f) => f.source && !f.quote)).toBe(true);
  });
  it('the real dataset passes C15', () => {
    expect(validateContent(input, { ...DEFAULT_OPTIONS, today: '2026-11-16' }).filter((i) => i.rule === 'C15')).toEqual([]);
  });
  it('built output (pages, scripts, data) never states 18:00 or 17:30 as the gardens last entry', () => {
    const dist = join(process.cwd(), 'dist');
    if (!existsSync(dist)) return; // covered by the e2e suite and CI build step when dist is absent
    const files = readdirSync(dist, { recursive: true }).map(String).filter((f) => /\.(html|js|json)$/.test(f));
    for (const f of files) {
      const txt = readFileSync(join(dist, f), 'utf8').replace(/<[^>]+>/g, ' ');
      // the gardens' published hours, followed by a single last-entry time
      for (const m of txt.matchAll(/09:30\s*(–|-|&ndash;)\s*18:30[^]{0,60}?last (entry|admission)\W{0,3}(at\s)?(18:00|17:30)/gi)) throw new Error(`${f}: ${m[0]}`);
    }
  });
});
