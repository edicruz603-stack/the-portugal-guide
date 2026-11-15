import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { loadContentFromDisk } from '../../src/lib/content/load-fs';
import { validateContent, DEFAULT_OPTIONS } from '../../src/lib/validation/validate';
import { classifyPending, VISIBLE_IN_PROSE } from '../../src/lib/validation/pending';

const root = fileURLToPath(new URL('../../', import.meta.url));
const input = loadContentFromDisk(root);
const run = (today: string) => {
  const issues = validateContent(input, { ...DEFAULT_OPTIONS, today });
  return { issues, items: classifyPending(input, issues, today) };
};

describe('pending classification', () => {
  const { issues, items } = run('2026-11-13');
  const pending = issues.filter((i) => i.level === 'pending');
  it('covers every pending issue exactly once', () => {
    const covered = items.flatMap((x) => x.issues).sort();
    expect(covered).toEqual(pending.map((i) => `${i.rule}:${i.where}`).sort());
  });
  it('merges only P06 markers with their own coordinate fact', () => {
    for (const x of items.filter((y) => y.issues.length > 1)) {
      expect(x.issues[0]).toMatch(/^P06:/); expect(x.issues[1]).toMatch(/^P01:fact\..*coordinates/);
    }
  });
  it('never changes a status: every fact/event item carries the status of its record', () => {
    const facts = new Map((input.factSets as any[]).flatMap((s) => s.facts).map((f: any) => [f.id, f.status]));
    const events = new Map((input.events as any[]).map((e) => [e.id, e.status]));
    for (const x of items) {
      if (x.id.startsWith('fact.')) expect(x.status).toBe(facts.get(x.id));
      if (x.id.startsWith('event.')) expect(x.status).toBe(events.get(x.id));
      expect(x.status).not.toBe('checked');
    }
  });
  it('13 Nov 2026 snapshot: 91 issues, 86 items, by category', () => {
    expect(pending).toHaveLength(91);
    const n = (c: string) => items.filter((x) => x.category === c).length;
    expect({ items: items.length, visible: n('visible-risk'), research: n('research'), descriptions: n('descriptions'), facts: n('facts'), commercial: n('commercial') })
      .toEqual({ items: 86, visible: 27, research: 33, descriptions: 6, facts: 16, commercial: 4 });
  });
  it('event visibility follows the validation date (Mutatis Mutandis: visible 15 Nov, research 16 Nov)', () => {
    const cat = (d: string) => run(d).items.find((x) => x.id === 'event.sintra.mutatis-mutandis')!.category;
    expect(cat('2026-11-15')).toBe('visible-risk');
    expect(cat('2026-11-16')).toBe('research');
  });
  it('prose exceptions still exist in their page source', () => {
    for (const { page, phrase } of Object.values(VISIBLE_IN_PROSE)) expect(readFileSync(root + page, 'utf8')).toContain(phrase);
  });
});
