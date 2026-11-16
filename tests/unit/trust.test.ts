import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { formatDate, checkedLabel, trustLines, factsOnCard, eventTrust, markerTrust, LABELS, type TrustFact, type SourceInfo } from '../../src/lib/trust/trust';
import { loadContentFromDisk } from '../../src/lib/content/load-fs';

const sources = new Map<string, SourceInfo>([
  ['src.op', { id: 'src.op', publisher: 'Parques de Sintra', kind: 'operator' }],
  ['src.own', { id: 'src.own', publisher: 'The Portugal Guide — previous website edition', kind: 'own-edition' }],
]);
const f = (o: Partial<TrustFact>): TrustFact => ({ id: 'fact.x.y.z', kind: 'price', status: 'reported', source: 'src.own', ...o });

describe('visitor wording', () => {
  it('uses the four approved labels', () => {
    expect(LABELS).toEqual({ reported: 'Not yet re-checked', 'confirm-first': 'Confirm first', unresolved: 'Sources differ — confirm with the operator' });
    expect(checkedLabel('2026-11-11')).toBe('Checked 11 Nov 2026');
  });
  it('formats ISO calendar dates without time-zone shifts', () => {
    expect(formatDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatDate('2026-12-31')).toBe('31 Dec 2026');
    expect(() => formatDate('11/11/2026')).toThrow();
  });
});

describe('card-level grouping', () => {
  it('one line per status, worst first, listing what each concerns', () => {
    const lines = trustLines([
      f({ id: 'a', kind: 'price' }), f({ id: 'b', kind: 'hours' }), f({ id: 'c', kind: 'price' }),
      f({ id: 'd', kind: 'last-entry', status: 'unresolved', source: 'src.op' }),
      f({ id: 'e', kind: 'rule', status: 'checked', checked_on: '2026-11-11', source: 'src.op' }),
    ], sources);
    expect(lines.map((l) => [l.status, l.label, l.items])).toEqual([
      ['unresolved', 'Sources differ — confirm with the operator', ['last entry']],
      ['reported', 'Not yet re-checked', ['price', 'opening hours']],
      ['checked', 'Checked 11 Nov 2026', ['ticket rule']],
    ]);
  });
  it('checked shows the oldest genuine verification date and no explanation', () => {
    const [l] = trustLines([f({ status: 'checked', checked_on: '2026-11-11', source: 'src.op' }), f({ id: 'b', status: 'checked', checked_on: '2026-11-07', source: 'src.op' })], sources);
    expect(l!.label).toBe('Checked 7 Nov 2026'); expect(l!.detail).toBeUndefined();
  });
  it('never invents a checked date', () => {
    expect(() => trustLines([f({ status: 'checked', source: 'src.op' })], sources)).toThrow(/without checked_on/);
  });
  it('explanations say where the value came from without calling it false', () => {
    const [r] = trustLines([f({})], sources);
    expect(r!.detail).toMatch(/previous edition of this guide/); expect(r!.detail).toMatch(/may well be correct/);
    const [c] = trustLines([f({ status: 'confirm-first', source: 'src.op' })], sources);
    expect(c!.detail).toMatch(/Confirm with the operator/);
    const [u] = trustLines([f({ status: 'unresolved', source: 'src.op' })], sources);
    expect(u!.detail).toMatch(/do not show a single value/);
  });
  it('a card without quoted facts has no trust lines', () => { expect(trustLines([], sources)).toEqual([]); });
});

describe('facts on a card and disputed values', () => {
  const editorial = { title: 'Gardens', paragraphs: ['Hours: 09:30–18:30; last entry: official sources differ. Check first.', 'Entry: free.'] };
  const disputed = f({ status: 'unresolved', quote: undefined, unresolved_text: '09:30–18:30; last entry: official sources differ' });
  it('finds facts by their quote in this card only', () => {
    const q = f({ id: 'q', quote: 'Entry: free' });
    expect(factsOnCard(editorial, [q, f({ id: 'other', quote: 'not on this card' })]).map((x) => x.id)).toEqual(['q']);
  });
  it('links an unresolved fact to the card through its approved unresolved_text', () => {
    expect(factsOnCard(editorial, [disputed]).map((x) => x.id)).toEqual(['fact.x.y.z']);
  });
  it('does not link a non-unresolved fact through unresolved_text', () => {
    expect(factsOnCard(editorial, [{ ...disputed, status: 'reported' }])).toEqual([]);
  });
});

describe('events and map markers', () => {
  it('events: one line about the dates, addressed to the organiser', () => {
    const [l] = eventTrust({ id: 'event.x.y', status: 'reported', source: 'src.own', checked_on: undefined }, sources);
    expect(l!.label).toBe('Not yet re-checked'); expect(l!.items).toEqual(['dates']); expect(l!.detail).toMatch(/organiser/);
  });
  it('markers: the same words for all four statuses', () => {
    const m = (status: any, checkedOn?: string) => markerTrust({ id: 'p', name: 'P', zone: 'Z', lat: 0, lon: 0, category: 'free', coordinates: { status, fact: 'f', source: 's', provenance: 'x', ...(checkedOn ? { checkedOn } : {}) } } as any);
    expect(m('checked', '2026-11-11')).toBe('Checked 11 Nov 2026 · map position');
    expect(m('reported')).toBe('Not yet re-checked · map position');
    expect(m('confirm-first')).toBe('Confirm first · map position');
    expect(m('unresolved')).toBe('Sources differ — confirm with the operator · map position');
  });
});

describe('the real dataset', () => {
  const c = loadContentFromDisk(fileURLToPath(new URL('../../', import.meta.url))) as any;
  const facts = c.factSets.flatMap((s: any) => s.facts);
  it('every quoted unresolved fact has approved visitor text', () => {
    for (const x of facts.filter((y: any) => y.status === 'unresolved' && y.quote)) expect(x.unresolved_text, x.id).toBeTruthy();
  });
});

describe('checked means consulted, not operator-confirmed', () => {
  it('the checked label is a date only and never claims confirmation', () => {
    expect(checkedLabel('2026-11-15')).toBe('Checked 15 Nov 2026');
    expect(checkedLabel('2026-11-15')).not.toMatch(/confirm/i);
  });
  it('every checked fact rests on an editorial reading of an official page (no direct-confirmation records exist)', async () => {
    const { loadContentFromDisk } = await import('../../src/lib/content/load-fs');
    const input = loadContentFromDisk(process.cwd());
    const checked = (input.factSets as { facts: { id: string; status: string; provenance: string; checked_on?: string }[] }[]).flatMap((s) => s.facts).filter((f) => f.status === 'checked');
    expect(checked.length).toBeGreaterThan(0);
    // both provenances are readings of a published official page by the editors (on checked_on / 7 Nov 2026 for the PDF ledger)
    for (const f of checked) { expect(['official-page-read', 'pdf-first-edition-2026'], f.id).toContain(f.provenance); expect(f.checked_on, f.id).toBeTruthy(); }
  });
});
