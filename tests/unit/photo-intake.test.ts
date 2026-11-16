/**
 * Owner photograph intake and image rights (M3, corrected at M3 closure, 16 Nov 2026).
 * The owner is the declared photographer and rights holder. Reduced derivatives, missing camera metadata and
 * originals not accessible to the build are recorded, never treated as blockers or as proof of non-supply.
 * Commercial use is blocked only by documented issues (intake.commercialBlockers, rule C18).
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { IntakeBatchSchema, commercialBlockers, intakeRef, type IntakePhoto } from '../../src/lib/media/intake';
import { loadContentFromDisk } from '../../src/lib/content/load-fs';
import { validateContent, DEFAULT_OPTIONS, type ContentInput } from '../../src/lib/validation/validate';

const root = fileURLToPath(new URL('../../', import.meta.url));
const raw = readdirSync(root + 'media/intake').filter((f) => f.endsWith('.yaml')).map((f) => parse(readFileSync(root + 'media/intake/' + f, 'utf8')));
const batches = raw.map((b) => IntakeBatchSchema.parse(b));
const all = batches.flatMap((b) => b.photos.map((p) => ({ ref: intakeRef(b, p), p })));
const photo = (ref: string) => all.find((x) => x.ref === ref)!.p;
const uploads = '/mnt/user-data/uploads/';

describe('owner photograph intake: what was received', () => {
  it('three batches: 11 (6 Nov), 11 (7 Nov, one an exact duplicate) and 19 (16 Nov) = 41 files, 40 distinct photographs', () => {
    expect(batches.map((b) => [b.batch, b.photos.length])).toEqual([['2026-11-06-owner-sintra', 11], ['2026-11-07-owner-sintra', 11], ['2026-11-16-owner-sintra', 19]]);
    expect(new Set(all.map((x) => x.p.preview.sha256)).size).toBe(40);
  });
  it('every batch records the owner as declared photographer and rights holder, with the earlier statements kept', () => {
    for (const b of batches) { expect(b.declaration.photographer).toBe('owner'); expect(b.declaration.rights_holder).toBe('owner'); expect(b.declaration.stated_on).toBe('2026-11-16'); }
    const early = batches.find((b) => b.batch === '2026-11-07-owner-sintra')!;
    expect(early.declaration.history!.map((h) => h.on)).toEqual(['2026-11-06', '2026-11-07']);
  });
  it('originals are "supplied, not accessible here", previews are reduced derivatives, metadata is never invented', () => {
    for (const { p } of all) {
      expect(p.original.state).toBe('supplied-not-accessible');
      expect(p.original.note).toMatch(/not evidence that the original was not supplied/);
      expect(p.preview.kind).toBe('reduced-derivative');
      expect(p.capture).toMatch(/not known/);
    }
  });
  it('no file is classified as third-party: authorship is owner-declared, or owner-to-reconfirm with documented evidence', () => {
    const reconfirm = all.filter((x) => x.p.authorship.status === 'owner-to-reconfirm').map((x) => x.ref.split('/')[1]).sort();
    expect(reconfirm).toEqual(['98a81e8e-image.jpg', '9e8b7991-image.jpg', 'c2a5c58f-image.jpg', 'f971bd19-image.jpg']);
    for (const { p } of all) expect(JSON.stringify(p)).not.toMatch(/third-party|wikimedia/i);
  });
  it('the duplicate is linked to the file it repeats, with the same SHA-256', () => {
    const d = photo('2026-11-07-owner-sintra/9e8b7991-image.jpg');
    expect(d.duplicate_of).toBe('2026-11-06-owner-sintra/c2a5c58f-image.jpg');
    expect(d.preview.sha256).toBe(photo(d.duplicate_of!).preview.sha256);
  });
  it('integrity: where the received copies are available, each matches its recorded size and SHA-256', () => {
    if (!existsSync(uploads)) return; // only in the workspace that received the photos
    const files = new Map(readdirSync(uploads).filter((f) => /\.jpe?g$/i.test(f)).map((f) => [createHash('sha256').update(readFileSync(uploads + f)).digest('hex'), f]));
    const missing = all.filter((x) => !files.has(x.p.preview.sha256)).map((x) => x.ref);
    // the 16 Nov files were renamed on upload, so they are matched by hash, not by name
    expect(missing).toEqual([]);
  });
  it('every recorded derivative exists and matches its checksum; no original is stored yet', () => {
    for (const { p } of all) for (const d of p.derivatives ?? []) {
      expect(existsSync(root + d.path), d.path).toBe(true);
      expect(createHash('sha256').update(readFileSync(root + d.path)).digest('hex')).toBe(d.sha256);
    }
    expect(readdirSync(root + 'media/originals').filter((f) => f !== 'README.md')).toEqual([]);
  });
  it('schema: an accessible original needs a path and hash; reconfirming authorship needs evidence', () => {
    const b = raw[0]; const p = b.photos[0];
    const ok = (o: object) => IntakeBatchSchema.safeParse({ ...b, photos: [{ ...p, ...o }] }).success;
    expect(ok({ original: { state: 'accessible' } })).toBe(false);
    expect(ok({ authorship: { status: 'owner-to-reconfirm' } })).toBe(false);
    expect(ok({ property: { depicts_site: 'X site', capture: 'inside', note: 'no rule or evidence given' } })).toBe(false);
    expect(ok({ property: { depicts_site: 'X site', capture: 'outside', rule: 'src.parques-de-sintra.image-capture-regulation', note: 'rule on a public-space photo' } })).toBe(false);
    expect(ok({ property: { depicts_site: 'X site', capture: 'unknown', rule: 'src.parques-de-sintra.image-capture-regulation', note: 'rule on an unknown capture' } })).toBe(false);
    expect(ok({})).toBe(true);
  });
});

describe('commercial blockers are only documented issues', () => {
  const base = photo('2026-11-06-owner-sintra/840a618c-image.jpg');
  const without = (o: Partial<IntakePhoto>) => commercialBlockers({ ...base, ...o } as IntakePhoto);
  it('a reduced derivative, no metadata and an inaccessible original are not blockers', () => {
    const clean = without({ property: { capture: 'outside', note: 'public street' } as IntakePhoto['property'] });
    expect(clean).toEqual([]);
  });
  it('public-space or unknown capture of a monument is not a blocker (owner decision, 16 Nov 2026)', () => {
    expect(base.property.capture).toBe('unknown');
    expect(commercialBlockers(base)).toEqual([]); // Pena, location unknown: not assumed inside
    const road = photo('2026-11-06-owner-sintra/e0b52248-image.jpg'); // Regaleira from the public road
    expect(road.property.capture).toBe('outside'); expect(road.property.rule).toBeUndefined();
    expect(commercialBlockers(road)).toEqual([]);
    for (const { p } of all) if (p.property.capture !== 'inside') expect(p.property.rule, JSON.stringify(p.property)).toBeUndefined();
  });
  it('an internal rule applies only with evidence of capture inside the premises, until authorisation is recorded', () => {
    const inside = all.filter((x) => x.p.property.capture === 'inside').map((x) => x.ref.split('/')[1]).sort();
    expect(inside).toEqual(['4cbc72fd-image.jpg', '50893677-image.jpg', '9e8b7991-image.jpg', 'c2a5c58f-image.jpg']);
    const mon = photo('2026-11-06-owner-sintra/50893677-image.jpg');
    expect(commercialBlockers(mon).join()).toMatch(/captured inside Monserrate .*src.parques-de-sintra.image-capture-regulation/);
    expect(commercialBlockers({ ...mon, property: { ...mon.property, authorisation_ref: 'PSML authorisation ref' } })).toEqual([]);
  });
  it('identifiable people, an unidentified subject and documented authorship doubt are blockers', () => {
    expect(commercialBlockers(photo('2026-11-07-owner-sintra/77fe1abc-image.jpg')).join()).toMatch(/identifiable people/);
    expect(commercialBlockers(photo('2026-11-06-owner-sintra/8ab381ad-image.jpg')).join()).toMatch(/subject not identified/);
    expect(commercialBlockers(photo('2026-11-06-owner-sintra/c2a5c58f-image.jpg')).join()).toMatch(/authorship to reconfirm/);
  });
  it('incidental shop signage is recorded but is not a blocker', () => {
    const p = photo('2026-11-16-owner-sintra/1000077312.jpg');
    expect(p.marks.assessment).toBe('present');
    expect(commercialBlockers(p)).toEqual([]);
  });
});

describe('C18 image rights', () => {
  const real = loadContentFromDisk(root);
  const run = (i: ContentInput) => validateContent(i, { ...DEFAULT_OPTIONS, today: '2026-11-16' }).filter((x) => x.rule === 'C18');
  const img = (i: ContentInput, id: string) => (i.images as any[]).find((x) => x.id === id);
  const PENA = 'img.sintra.wm-pena-palace';
  it('real data passes', () => { expect(run(structuredClone(real))).toEqual([]); });
  it('commercial_ok without a basis fails (attribution is not a clearance)', () => {
    const i = structuredClone(real); img(i, PENA).commercial_ok = true;
    expect(run(i).map((x) => x.message).join()).toMatch(/without a commercial_basis/);
  });
  it('a verified licence clears a photo of unknown capture location; an inside capture also needs the operator authorisation', () => {
    const i = structuredClone(real);
    Object.assign(img(i, PENA), { commercial_ok: true, commercial_basis: 'licence-verified' });
    expect(run(i).map((x) => x.message).join()).toMatch(/licence_url, licence_verified_on/);
    Object.assign(img(i, PENA), { licence_url: 'https://creativecommons.org/licenses/by-sa/4.0/', licence_verified_on: '2026-11-16', status: 'verified' });
    expect(run(i)).toEqual([]); // Pena: capture location unknown → no venue rule
    const W = 'img.sintra.wm-regaleira-well';
    Object.assign(img(i, W), { commercial_ok: true, commercial_basis: 'licence-verified', licence_url: 'https://creativecommons.org/licenses/by-sa/3.0/', licence_verified_on: '2026-11-16', status: 'verified' });
    expect(run(i).map((x) => x.message).join()).toMatch(/requires the operator's authorisation/);
    img(i, W).site_authorisation_ref = 'Cultursintra authorisation ref';
    expect(run(i)).toEqual([]);
  });
  it('a venue rule may not be recorded on a public-space or unknown capture', () => {
    const i = structuredClone(real); img(i, PENA).site_rule = 'src.parques-de-sintra.image-capture-regulation';
    expect(run(i).map((x) => x.message).join()).toMatch(/site_rule applies only with evidence of capture inside/);
  });
  it('an owner photograph needs no accessible original; it is blocked only by its documented issues', () => {
    const i = structuredClone(real);
    const owner = { ...img(i, PENA), id: 'img.sintra.owner-pena', rights_category: 'owner', intake: '2026-11-06-owner-sintra/840a618c-image.jpg', commercial_ok: true, commercial_basis: 'owner-original', permission_ref: 'Owner declaration, 16 Nov 2026', site_rule: undefined, replacement_candidates: undefined };
    (i.images as any[]).push(owner);
    const msgs = run(i).map((x) => x.message).join('\n');
    expect(msgs).not.toMatch(/original/i); // the inaccessible original is not a blocker
    expect(run(i)).toEqual([]); // Pena seen from an unknown place: no venue rule, no blocker
    (i.images as any[]).at(-1).intake = '2026-11-06-owner-sintra/50893677-image.jpg'; // captured inside Monserrate park
    expect(run(i).map((x) => x.message).join()).toMatch(/captured inside Monserrate .* none recorded/);
    (i.images as any[]).at(-1).intake = '2026-11-16-owner-sintra/nope.jpg';
    expect(run(i).map((x) => x.message).join()).toMatch(/without a valid intake record/);
  });
  it('replacement candidates must be intake photos, not duplicates', () => {
    const i = structuredClone(real); img(i, 'img.sintra.wm-moorish-castle').replacement_candidates = ['2026-11-07-owner-sintra/9e8b7991-image.jpg', 'x/y.jpg'];
    const m = run(i).map((x) => x.message).join();
    expect(m).toMatch(/is a duplicate of/); expect(m).toMatch(/x\/y.jpg is not in the photo intake/);
  });
  it('only the Wikimedia image captured inside premises carries a venue rule; only the Initiation Well has no owner candidate', () => {
    const imgs = real.images as any[];
    expect(Object.fromEntries(imgs.map((x) => [x.id, [x.capture_location, x.site_rule]]))).toEqual({
      'img.sintra.wm-pena-palace': ['unknown', undefined],
      'img.sintra.wm-regaleira-well': ['inside', 'src.regaleira.visitor-rules'],
      'img.sintra.wm-moorish-castle': ['unknown', undefined],
      'img.sintra.wm-monserrate': ['unknown', undefined],
    });
    expect(imgs.filter((x) => !x.replacement_candidates).map((x) => x.id)).toEqual(['img.sintra.wm-regaleira-well']);
  });
  it('a recorded derivative must exist and match its hash', () => {
    const i = structuredClone(real);
    const b = (i.photoIntake as any[]).find((x) => x.batch === '2026-11-16-owner-sintra');
    b.photos[0].derivatives = [{ path: 'public/images/missing.jpg', from: 'preview', width: 10, height: 10, sha256: 'a'.repeat(64), edits: 'resize' }];
    expect(run(i).map((x) => x.message).join()).toMatch(/file is missing/);
    i.fileHashes = { 'public/images/missing.jpg': 'b'.repeat(64) };
    expect(run(i).map((x) => x.message).join()).toMatch(/does not match its recorded SHA-256/);
  });
  it('replacement links must point to existing images', () => {
    const i = structuredClone(real); img(i, 'img.sintra.wm-monserrate').replaced_by = 'img.sintra.nowhere';
    expect(run(i).map((x) => x.message).join()).toMatch(/unknown image img.sintra.nowhere/);
  });
});
