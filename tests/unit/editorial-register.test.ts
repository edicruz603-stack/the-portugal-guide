import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { applyTextChanges, applyImageChanges, checkRegister, EditorialRegisterSchema, type EditorialChange } from '../../src/lib/editorial/register';

const change = (o: Partial<EditorialChange>): EditorialChange => ({
  id: 'change.sintra.example', page: 'sintra.html', content_id: 'page:sintra.html', kind: 'text',
  before: 'Old words', after: 'New words', reason: 'A reason long enough', approval: { ref: 'Owner, test', date: '2026-11-16' }, ...o,
});

describe('editorial change register — text', () => {
  it('a registered change makes legacy and new text match', () => {
    const r = applyTextChanges('sintra.html', 'A. Old words. B.', 'A. New words. B.', [change({})]);
    expect(r.problems).toEqual([]); expect(r.text).toBe('A. New words. B.'); expect(r.applied).toEqual(['change.sintra.example']);
  });
  it('an unregistered change still differs (parity fails on it)', () => {
    const r = applyTextChanges('sintra.html', 'A. Old words. B.', 'A. Other words. B.', []);
    expect(r.text).not.toBe('A. Other words. B.');
  });
  it('a change registered for another page is not applied', () => {
    const r = applyTextChanges('index.html', 'A. Old words.', 'A. New words.', [change({})]);
    expect(r.applied).toEqual([]); expect(r.text).toBe('A. Old words.');
  });
  it('a stale entry (before no longer in the legacy text) is a problem', () => {
    expect(applyTextChanges('sintra.html', 'Nothing here', 'New words', [change({})]).problems[0]).toMatch(/occurs 0 times/);
  });
  it('an ambiguous entry (before occurs twice) is a problem, never a blanket replacement', () => {
    expect(applyTextChanges('sintra.html', 'Old words and Old words', 'New words and New words', [change({})]).problems[0]).toMatch(/occurs 2 times/);
  });
  it('an entry whose replacement is not on the new page is a problem', () => {
    expect(applyTextChanges('sintra.html', 'Old words', 'Something else', [change({})]).problems[0]).toMatch(/not found in the new/);
  });
});

describe('editorial change register — images', () => {
  const img = change({ kind: 'image', before: 'a.jpg | Old alt', after: 'b.jpg | New alt' });
  it('replaces exactly one legacy image entry', () => {
    const r = applyImageChanges('sintra.html', ['x.jpg | X', 'a.jpg | Old alt'], ['x.jpg | X', 'b.jpg | New alt'], [img]);
    expect(r.problems).toEqual([]); expect(r.images).toEqual(['x.jpg | X', 'b.jpg | New alt']);
  });
  it('fails when the legacy image is absent or the new image is missing', () => {
    expect(applyImageChanges('sintra.html', ['x.jpg | X'], ['b.jpg | New alt'], [img]).problems[0]).toMatch(/occurs 0 times/);
    expect(applyImageChanges('sintra.html', ['a.jpg | Old alt'], ['x.jpg | X'], [img]).problems[0]).toMatch(/not found on the new/);
  });
});

describe('register file and structure', () => {
  const file = parse(readFileSync(fileURLToPath(new URL('../../src/content/editorial-changes.yaml', import.meta.url)), 'utf8'));
  it('the committed register is valid', () => { expect(EditorialRegisterSchema.safeParse(file).success).toBe(true); });
  it('rejects entries without approval or reason, or with before = after', () => {
    const bad = (o: Record<string, unknown>) => EditorialRegisterSchema.safeParse({ version: 1, changes: [{ ...change({}), ...o }] }).success;
    expect(bad({ approval: undefined })).toBe(false);
    expect(bad({ reason: 'short' })).toBe(false);
    expect(bad({ after: 'Old words' })).toBe(false);
    expect(bad({ page: 'lisbon.html' })).toBe(false);
  });
  it('flags duplicate ids and unknown content IDs', () => {
    const reg = { version: 1 as const, changes: [change({}), change({ content_id: 'place.sintra.nowhere' })] };
    const out = checkRegister(reg, new Set(['place.sintra.pena-palace']));
    expect(out.join('\n')).toMatch(/duplicate change id/); expect(out.join('\n')).toMatch(/unknown content_id place.sintra.nowhere/);
    expect(checkRegister({ version: 1, changes: [change({ content_id: 'page:lisbon.html' })] }, new Set())).toHaveLength(1);
  });
});
