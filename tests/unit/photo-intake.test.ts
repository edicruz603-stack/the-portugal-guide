import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { IntakeBatchSchema } from '../../src/lib/media/intake';
import { loadContentFromDisk } from '../../src/lib/content/load-fs';
import { validateContent, DEFAULT_OPTIONS, type ContentInput } from '../../src/lib/validation/validate';

const root = fileURLToPath(new URL('../../', import.meta.url));
const batches = readdirSync(root + 'media/intake').filter((f) => f.endsWith('.yaml')).map((f) => IntakeBatchSchema.parse(parse(readFileSync(root + 'media/intake/' + f, 'utf8'))));

describe('owner photograph intake', () => {
  it('the 16 Nov 2026 batch lists 19 photos, all awaiting their original, none with a confirmed subject', () => {
    const b = batches.find((x) => x.batch === '2026-11-16-owner-sintra')!;
    expect(b.photos).toHaveLength(19);
    for (const p of b.photos) {
      expect(p.status).toBe('awaiting-original');
      expect(p.proposed_subject.confirmed).toBe(false);
      expect(p.capture).toMatch(/not known/); // nothing invented
    }
  });
  it('every recorded original exists and matches its checksum; no previews are stored as originals', () => {
    for (const b of batches) for (const p of b.photos.filter((x) => x.original)) {
      const f = root + p.original!.path;
      expect(existsSync(f), f).toBe(true);
      expect(createHash('sha256').update(readFileSync(f)).digest('hex')).toBe(p.original!.sha256);
      expect(p.original!.sha256).not.toBe(p.preview?.sha256);
    }
    expect(readdirSync(root + 'media/originals').filter((f) => f !== 'README.md')).toEqual([]);
  });
  it('schema refuses a confirmed subject without a received original, and original-received without a file', () => {
    const p = batches[0]!.photos[0]!;
    const bad = (o: object) => IntakeBatchSchema.safeParse({ ...batches[0], photos: [{ ...p, ...o }] }).success;
    expect(bad({ proposed_subject: { ...p.proposed_subject, confirmed: true }, confirmed_subject: { text: 'x x x', confirmed_on: '2026-11-16', by: 'owner' } })).toBe(false);
    expect(bad({ status: 'original-received' })).toBe(false);
  });
});

describe('C18 image rights', () => {
  const real = loadContentFromDisk(root);
  const run = (i: ContentInput) => validateContent(i, { ...DEFAULT_OPTIONS, today: '2026-11-16' }).filter((x) => x.rule === 'C18');
  const img = (i: ContentInput, id: string) => (i.images as any[]).find((x) => x.id === id);
  it('real data passes', () => { expect(run(structuredClone(real))).toEqual([]); });
  it('commercial_ok without a basis fails (attribution is not a clearance)', () => {
    const i = structuredClone(real); img(i, 'img.sintra.wm-pena-palace').commercial_ok = true;
    expect(run(i).map((x) => x.message).join()).toMatch(/without a commercial_basis/);
  });
  it('a licence basis needs the verified licence on record', () => {
    const i = structuredClone(real); Object.assign(img(i, 'img.sintra.wm-pena-palace'), { commercial_ok: true, commercial_basis: 'licence-verified' });
    expect(run(i).map((x) => x.message).join()).toMatch(/licence_url, licence_verified_on/);
    Object.assign(img(i, 'img.sintra.wm-pena-palace'), { licence_url: 'https://creativecommons.org/licenses/by-sa/4.0/', licence_verified_on: '2026-11-16', status: 'verified' });
    expect(run(i)).toEqual([]);
  });
  it('an owner photograph cannot be used before its original is received and its subject confirmed', () => {
    const i = structuredClone(real);
    (i.images as any[]).push({ ...img(i, 'img.sintra.wm-pena-palace'), id: 'img.sintra.owner-palace', rights_category: 'owner', intake: '2026-11-16-owner-sintra/1000077326.jpg' });
    expect(run(i).map((x) => x.message).join()).toMatch(/original not received or subject not confirmed/);
    (i.images as any[]).at(-1).intake = '2026-11-16-owner-sintra/nope.jpg';
    expect(run(i).map((x) => x.message).join()).toMatch(/without a valid intake record/);
  });
  it('replacement links must point to existing images', () => {
    const i = structuredClone(real); img(i, 'img.sintra.wm-monserrate').replaced_by = 'img.sintra.nowhere';
    expect(run(i).map((x) => x.message).join()).toMatch(/unknown image img.sintra.nowhere/);
  });
});
