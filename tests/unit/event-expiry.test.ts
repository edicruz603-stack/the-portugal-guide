/**
 * Ended events leave the active lists automatically, by the validation date, with no YAML edit.
 * Rule (src/lib/content/dates.ts): an event is shown up to and including its last day; hidden from the next day.
 * Every date here is fixed: nothing depends on the real clock.
 */
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validationDate, isEventActive, activeEventIds, lastDay } from '../../src/lib/content/dates';
import { loadContentFromDisk } from '../../src/lib/content/load-fs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const c = loadContentFromDisk(root) as any;
const events = new Map<string, any>(c.events.map((e: any) => [e.id, e]));
const list = (id: string) => c.lists.find((l: any) => l.id === id).items as string[];
const MUTATIS = 'event.sintra.mutatis-mutandis';

describe('validation date', () => {
  it('uses VALIDATION_DATE when set', () => { expect(validationDate({ VALIDATION_DATE: '2026-11-15' })).toBe('2026-11-15'); });
  it('rejects malformed or impossible dates', () => {
    for (const bad of ['15/11/2026', '2026-11-31', '2026-02-29', 'tomorrow']) expect(() => validationDate({ VALIDATION_DATE: bad })).toThrow(/VALIDATION_DATE/);
  });
  it('otherwise uses the calendar date in Portugal, not UTC', () => {
    expect(validationDate({}, new Date('2026-07-01T23:30:00Z'))).toBe('2026-07-02'); // 00:30 in Lisbon (summer time)
    expect(validationDate({}, new Date('2026-11-15T23:30:00Z'))).toBe('2026-11-15'); // 23:30 in Lisbon (winter time)
  });
});

describe('expiry rule', () => {
  const oneDay = { starts_on: '2026-11-06' };
  const range = { starts_on: '2026-10-24', ends_on: '2026-11-15' };
  it('a multi-day event is shown before and on its last day, hidden after', () => {
    expect(isEventActive(range, '2026-11-14')).toBe(true);
    expect(isEventActive(range, '2026-11-15')).toBe(true);
    expect(isEventActive(range, '2026-11-16')).toBe(false);
  });
  it('a one-day event ends on its start date', () => {
    expect(lastDay(oneDay)).toBe('2026-11-06');
    expect(isEventActive(oneDay, '2026-11-06')).toBe(true);
    expect(isEventActive(oneDay, '2026-11-07')).toBe(false);
  });
  it('an event that has not started yet is shown (diary of what is coming)', () => {
    expect(isEventActive({ starts_on: '2026-12-01', ends_on: '2026-12-31' }, '2026-11-13')).toBe(true);
  });
});

describe('Mutatis Mutandis (ends 15 Nov 2026) in the real lists', () => {
  it('is recorded with last day 2026-11-15 and is in the local diary list', () => {
    expect(lastDay(events.get(MUTATIS))).toBe('2026-11-15');
    expect(list('list.sintra.events-local')).toContain(MUTATIS);
  });
  it.each([['2026-11-14', true], ['2026-11-15', true], ['2026-11-16', false]])('on %s shown=%s', (day, shown) => {
    expect(activeEventIds(list('list.sintra.events-local'), events, day).includes(MUTATIS)).toBe(shown);
  });
  it('stays in the content and in the list file (history, no YAML edit)', () => {
    expect(events.has(MUTATIS)).toBe(true);
    expect(list('list.sintra.events-local')).toContain(MUTATIS);
  });
});

describe('every event list applies the same rule', () => {
  const eventLists = c.lists.filter((l: any) => String(l.context).startsWith('event:'));
  it('covers both diaries', () => { expect(eventLists.map((l: any) => l.id).sort()).toEqual(['list.sintra.events-directory', 'list.sintra.events-local']); });
  it.each(['2026-10-30', '2026-11-07', '2026-11-13', '2026-11-15', '2026-11-16', '2027-01-03', '2027-01-04'])('on %s each list shows exactly its items whose last day is not past, in order', (day) => {
    for (const l of eventLists) expect(activeEventIds(l.items, events, day)).toEqual(l.items.filter((id: string) => lastDay(events.get(id)) >= day));
  });
  it('unknown IDs are an error, not silently dropped', () => { expect(() => activeEventIds(['event.sintra.nope'], events, '2026-11-13')).toThrow(/no event record/); });
});

describe('built pages at 14, 15 and 16 Nov 2026 (both event components, plus parity)', () => {
  const build = (day: string) => {
    const out = mkdtempSync(join(tmpdir(), `tpg-${day}-`));
    const env = { ...process.env, VALIDATION_DATE: day }; delete (env as any).PUBLICATION_MODE;
    const r = spawnSync('npx', ['astro', 'build', '--outDir', out], { cwd: root, env, encoding: 'utf8' });
    expect(r.status, r.stdout + r.stderr).toBe(0);
    const parity = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/check-parity.mjs', out], { cwd: root, env, encoding: 'utf8' });
    const page = (p: string) => readFileSync(join(out, p), 'utf8');
    const res = { local: page('sintra-local-discoveries.html'), directory: page('sintra-discoveries.html'), parity };
    rmSync(out, { recursive: true, force: true });
    return res;
  };
  const count = (html: string) => (html.match(/<div class="event">/g) ?? []).length;
  it.each([['2026-11-14', true, 4], ['2026-11-15', true, 4], ['2026-11-16', false, 3]])('%s: Mutatis Mutandis shown=%s, local diary has %i events', (day, shown, n) => {
    const b = build(day);
    expect(b.local.includes('Mutatis Mutandis')).toBe(shown);
    expect(count(b.local)).toBe(n);
    // directory diary: only Mordidas do Tempo (until 3 Jan 2027) is still on; ended ones absent in every build
    expect(count(b.directory)).toBe(1);
    expect(b.directory).toContain('Mordidas do Tempo');
    for (const gone of ['TAXI', 'Colares wine heritage', 'mystery afternoon']) expect(b.directory).not.toContain(gone);
    expect(b.local).not.toContain('TAXI · Centro Cultural');
    expect(b.parity.status, b.parity.stdout).toBe(0);
    expect(b.parity.stdout).toContain(`validation date ${day}`);
    expect(b.parity.stdout.includes(`${MUTATIS} on sintra-local-discoveries.html`)).toBe(!shown);
  }, 120_000);
});
