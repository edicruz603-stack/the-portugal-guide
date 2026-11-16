/**
 * Every critical rule (C01–C16) is demonstrated by a fixture that must fail, plus the real dataset
 * passing with zero critical issues. Fixtures are small mutations of the real content.
 */
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadContentFromDisk } from '../../src/lib/content/load-fs.ts';
import { validateContent, hasCritical, DEFAULT_OPTIONS, parseDms, type ContentInput, type Options } from '../../src/lib/validation/validate.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const real = loadContentFromDisk(root);
const opts: Options = { ...DEFAULT_OPTIONS, today: '2026-11-16' }; // on or after the newest date in the dataset
const fresh = (): ContentInput => structuredClone(real);
const run = (input: ContentInput, o: Options = opts) => validateContent(input, o);
const fails = (input: ContentInput, rule: string, text?: RegExp, o?: Options) => {
  const hits = run(input, o).filter((i) => i.level === 'critical' && i.rule === rule && (!text || text.test(`${i.where} ${i.message}`)));
  expect(hits.length, `expected a critical ${rule}${text ? ` matching ${text}` : ''}`).toBeGreaterThan(0);
};
// typed helpers to reach into fixtures
type Rec = Record<string, any>;
const place = (i: ContentInput, key: string) => (i.places as Rec[]).find((p) => p.id === `place.sintra.${key}`)!;
const factSet = (i: ContentInput, key: string) => (i.factSets as Rec[]).find((s) => s.place === `place.sintra.${key}`)!;
const fact = (i: ContentInput, id: string) => (i.factSets as Rec[]).flatMap((s) => s.facts).find((f: Rec) => f.id === id)!;

describe('the real dataset', () => {
  it('has no critical issues', () => {
    const critical = run(fresh()).filter((i) => i.level === 'critical');
    expect(critical, JSON.stringify(critical, null, 1)).toEqual([]);
  });
  it('locks every ID it defines', () => {
    expect(run(fresh()).filter((i) => i.rule === 'W05')).toEqual([]);
  });
});

describe('CRITICAL rules each fail on a fixture', () => {
  it('C01 schema: malformed ID', () => { const i = fresh(); place(i, 'pena-palace').id = 'Pena Palace'; fails(i, 'C01'); });
  it('C01 schema: fact without a source', () => { const i = fresh(); delete fact(i, 'fact.sintra.pena-palace.hours-park').source; fails(i, 'C01', /source/); });
  it('C01 schema: fact without observed_on', () => { const i = fresh(); delete fact(i, 'fact.sintra.pena-palace.hours-park').observed_on; fails(i, 'C01', /observed_on/); });
  it('C01 schema: fact without status', () => { const i = fresh(); delete fact(i, 'fact.sintra.pena-palace.hours-park').status; fails(i, 'C01', /status/); });
  it('C01 schema: HTML inside editorial text', () => { const i = fresh(); place(i, 'tascantiga').editorial.local.text = 'Small <b>plates</b>'; fails(i, 'C01', /HTML/); });

  it('C02 duplicate IDs', () => { const i = fresh(); (i.places as Rec[]).push(structuredClone(place(i, 'tascantiga'))); fails(i, 'C02', /duplicate ID/); });
  it('C02 two fact files for one place', () => { const i = fresh(); const extra = structuredClone(fact(i, 'fact.sintra.pena-palace.hours-park')); extra.id = 'fact.sintra.pena-palace.second-file'; (i.factSets as Rec[]).push({ place: 'place.sintra.pena-palace', facts: [extra] }); fails(i, 'C02', /more than one fact file/); });

  it('C03 immutable IDs: renaming a locked ID fails', () => {
    const i = fresh();
    const p = place(i, 'tascantiga'); p.id = 'place.sintra.tasca-antiga';
    for (const l of i.lists as Rec[]) l.items = l.items.map((x: string) => (x === 'place.sintra.tascantiga' ? p.id : x));
    const set = factSet(i, 'tascantiga'); set.place = p.id;
    for (const f of set.facts) f.id = f.id.replace('.tascantiga.', '.tasca-antiga.');
    fails(i, 'C03', /place\.sintra\.tascantiga/);
  });
  it('C03 immutable IDs: removing a locked ID fails', () => {
    const i = fresh();
    i.places = (i.places as Rec[]).filter((p) => p.id !== 'place.sintra.museu-ferreira-de-castro');
    for (const l of i.lists as Rec[]) l.items = l.items.filter((x: string) => x !== 'place.sintra.museu-ferreira-de-castro');
    fails(i, 'C03', /museu-ferreira-de-castro/);
  });
  it('C03 retiring an ID properly is accepted', () => {
    const i = fresh();
    i.places = (i.places as Rec[]).filter((p) => p.id !== 'place.sintra.museu-ferreira-de-castro');
    for (const l of i.lists as Rec[]) l.items = l.items.filter((x: string) => x !== 'place.sintra.museu-ferreira-de-castro');
    (i.idLock as Rec).retired['place.sintra.museu-ferreira-de-castro'] = { reason: 'fixture' };
    expect(run(i).filter((x) => x.rule === 'C03')).toEqual([]);
  });

  it('C04 broken reference: fact source', () => { const i = fresh(); fact(i, 'fact.sintra.pena-palace.hours-park').source = 'src.nowhere'; fails(i, 'C04', /src\.nowhere/); });
  it('C04 broken reference: list item', () => { const i = fresh(); (i.lists as Rec[])[0]!.items.push('place.sintra.atlantis'); fails(i, 'C04', /atlantis/); });
  it('C04 broken reference: zone', () => { const i = fresh(); place(i, 'cajo').zone = 'zone.sintra.nowhere'; fails(i, 'C04', /zone\.sintra\.nowhere/); });
  it('C04 broken reference: part_of', () => { const i = fresh(); place(i, 'national-palace-gardens').part_of = 'place.sintra.nowhere'; fails(i, 'C04', /part_of/); });
  it('C04 broken reference: map coordinates fact', () => { const i = fresh(); place(i, 'villa-sassetti').map.coordinates = 'fact.sintra.villa-sassetti.nowhere'; fails(i, 'C04', /map\.coordinates/); });
  it('C04 list renders a context the place does not have', () => { const i = fresh(); (i.lists as Rec[]).find((l) => l.id === 'list.sintra.romantic')!.items.push('place.sintra.cajo'); fails(i, 'C04', /romantic/); });

  it('C05 an imported website value cannot appear verified', () => {
    const i = fresh(); const f = fact(i, 'fact.sintra.casa-piriquita.founded'); f.status = 'checked'; f.checked_on = '2026-11-11';
    fails(i, 'C05', /legacy-website|own-edition/);
  });
  it('C05 checked_on on a reported fact', () => { const i = fresh(); fact(i, 'fact.sintra.casa-piriquita.founded').checked_on = '2026-11-11'; fails(i, 'C05', /only allowed for status checked/); });
  it('C05 checked fact without checked_on', () => { const i = fresh(); delete fact(i, 'fact.sintra.pena-palace.hours-park').checked_on; fails(i, 'C05', /requires checked_on/); });
  it('C05 checked from a secondary source', () => {
    const i = fresh(); const f = fact(i, 'fact.sintra.museu-do-bonsai.founder'); f.status = 'checked'; f.checked_on = '2026-11-07'; f.provenance = 'official-page-read';
    fails(i, 'C05', /secondary/);
  });
  it('C05 dates in the future', () => { const i = fresh(); fact(i, 'fact.sintra.pena-palace.hours-park').checked_on = '2027-01-01'; fails(i, 'C05', /future/); });

  it('C06 a conflict cannot be silently resolved', () => { const i = fresh(); fact(i, 'fact.sintra.monserrate.coordinates-a').status = 'checked'; fact(i, 'fact.sintra.monserrate.coordinates-a').checked_on = '2026-11-11'; fails(i, 'C06', /must stay unresolved/); });
  it('C06 a conflict group needs two facts', () => {
    const i = fresh(); const s = factSet(i, 'monserrate'); s.facts = s.facts.filter((f: Rec) => f.id !== 'fact.sintra.monserrate.coordinates-b');
    (i.idLock as Rec).retired['fact.sintra.monserrate.coordinates-b'] = { reason: 'fixture' };
    fails(i, 'C06', /at least two/);
  });
  it('C06 unresolved without a conflict group', () => { const i = fresh(); delete fact(i, 'fact.sintra.monserrate.coordinates-b').conflict_group; fails(i, 'C06'); });

  it('C07 duplicate place (same name under two IDs)', () => {
    const i = fresh(); const copy = structuredClone(place(i, 'tascantiga')); copy.id = 'place.sintra.tascantiga-2'; (i.places as Rec[]).push(copy);
    fails(i, 'C07', /also used by/);
  });

  it('C08 coordinates outside Portugal', () => { const i = fresh(); fact(i, 'fact.sintra.parque-da-liberdade.coordinates-approximate').value.lat = 51.5; fails(i, 'C08', /outside/); });
  it('C08 official coordinates that drift from the published DMS', () => { const i = fresh(); fact(i, 'fact.sintra.villa-sassetti.coordinates').value.lat = 38.80; fails(i, 'C08', /m from the published value/); });
  it('C08 official coordinates without the DMS text', () => { const i = fresh(); delete fact(i, 'fact.sintra.villa-sassetti.coordinates').value.dms; fails(i, 'C08', /DMS/); });

  it('C09 a quote that is not in the editorial text', () => { const i = fresh(); fact(i, 'fact.sintra.casa-piriquita.founded').quote = 'Founded in 1863'; fails(i, 'C09'); });

  it('C10 a hard-coded place card in a page', () => { const i = fresh(); i.pages['sintra.astro'] += '<article class="highlight-card"><h3>Tascantiga</h3></article>'; fails(i, 'C10', /tascantiga/); });
  it('C10 a hard-coded directory list in a page', () => { const i = fresh(); i.pages['sintra-discoveries.astro'] += '<article class="place" data-type="food"></article>'; fails(i, 'C10', /card markup/); });
  it('C10 a hard-coded map link to a place', () => { const i = fresh(); i.pages['sintra.astro'] += '<a href="https://www.google.com/maps/search/?api=1&amp;query=Casa+Piriquita+Sintra">x</a>'; fails(i, 'C10', /casa-piriquita/); });

  it('C11 a page image without a rights record', () => { const i = fresh(); i.pages['sintra.astro'] += '<img src="https://example.com/x.jpg" alt="">'; fails(i, 'C11', /without a source\/credit record/); });
  it('C11 uncleared images block a commercial build', () => { fails(fresh(), 'C11', /commercial/, { ...opts, mode: 'commercial' }); });
  it('C11 contributor image without written permission', () => { const i = fresh(); (i.images as Rec[])[0]!.rights_category = 'contributor'; fails(i, 'C11', /written-permission/); });

  it('C12 event ending before it starts', () => { const i = fresh(); (i.events as Rec[])[0]!.ends_on = '2020-01-01'; fails(i, 'C12'); });
  it('C13 homepage card linking to a missing page', () => { const i = fresh(); (i.homeDestinations as Rec[])[0]!.href = 'lisbon.html'; fails(i, 'C13'); });
  it('C15 disputed values are never shown', () => {
    const id = 'fact.sintra.national-palace-gardens.last-entry-website';
    const a = fresh(); fact(a, id).quote = '09:30–18:30; last entry 18:00'; fails(a, 'C15', /unresolved fact has a quote/);
    const g = fresh(); const pg = place(g, 'national-palace-gardens').editorial.field_guide;
    pg.paragraphs = pg.paragraphs.map((t: string) => t.replace('last entry: official sources differ', 'last entry 18:00')); fails(g, 'C15', /editorial text states the disputed last entry 18:00/);
    const b = fresh(); fact(b, id).unresolved_text = '09:30–18:30; last entry 18:00 — sources differ'; fails(b, 'C15', /disputed (quote|time 18:00)/);
    const c = fresh(); fact(c, id).unresolved_text = '09:30–18:30; ask at the gate'; fails(c, 'C15', /must say that the sources differ/);
    const d = fresh(); fact(d, 'fact.sintra.national-palace-gardens.price').unresolved_text = 'sources differ'; fails(d, 'C15', /on a checked fact/);
    const e = fresh(); fact(e, id).unresolved_text = 'last entry 17:30 (sources differ)'; fails(e, 'C15', /disputed time 17:30/);
  });
  it('C16 a conflict group may not mix claims (last ticket is not last admission)', () => {
    const i = fresh(); fact(i, 'fact.sintra.monserrate.last-ticket-park-monument-page').subject = 'park, last admission'; fails(i, 'C16', /mixes different claims/);
  });
  it('C16 tolerance: same operator, same point, within 15 m, never in a conflict', () => {
    const A = 'fact.sintra.national-palace.coordinates', B = 'fact.sintra.national-palace.coordinates-ticket-office';
    const m = 1 / 111_195; // degrees of latitude per metre
    const at = (metres: number) => { const i = fresh(); const b = fact(i, B); const a = fact(i, A); b.value.lat = a.value.lat + metres * m; b.value.lon = a.value.lon; delete b.value.dms; return i; };
    const c16 = (i: ContentInput) => run(i).filter((x) => x.rule === 'C16');
    expect(c16(at(14.9))).toEqual([]);
    fails(at(15.1), 'C16', /apart \(tolerance 15 m\)/);
    const s = fresh(); fact(s, B).subject = 'garden gate'; fails(s, 'C16', /different physical points/);
    const o = fresh(); fact(o, B).source = 'src.visit-sintra.hiking'; fails(o, 'C16', /same operator/);
    const g = fresh(); fact(g, A).conflict_group = 'x-y'; fact(g, B).conflict_group = 'x-y'; fact(g, A).status = 'unresolved'; fact(g, B).status = 'unresolved'; fails(g, 'C16', /not a conflict/);
    const k = fresh(); fact(k, 'fact.sintra.monserrate.price').agrees_with = A; fails(k, 'C16', /coordinates only/);
  });
  it('C16 operator identity is explicit source metadata, not inferred from the source ID', () => {
    const A = 'fact.sintra.national-palace.coordinates', B = 'fact.sintra.national-palace.coordinates-ticket-office';
    const src = (i: ContentInput, id: string) => (i.sources as Rec[]).find((x) => x.id === id)!;
    // same ID prefix, different declared operator → not the same operator
    const d = fresh(); src(d, fact(d, B).source).operator = 'another-operator'; fails(d, 'C16', /same operator/);
    // an operator source must declare its operator
    const m = fresh(); delete src(m, fact(m, A).source).operator; fails(m, 'C16', /without an operator identifier/);
    // a non-operator source may not claim one
    const n = fresh(); src(n, 'src.visit-sintra.hiking').operator = 'parques-de-sintra'; fails(n, 'C16', /operator identifier on a official source/);
    // different ID prefixes but the same declared operator still agree (no string parsing)
    const r = fresh(); const sb = src(r, fact(r, B).source); (r.sources as Rec[]).push({ ...sb, id: 'src.psml-tickets.national-palace' }); fact(r, B).source = 'src.psml-tickets.national-palace';
    expect(run(r).filter((x) => x.rule === 'C16')).toEqual([]);
  });
  it('C16 verifications: owner field verification is dated, not in the future, and covers the same place and kind', () => {
    const A = 'fact.sintra.national-palace.coordinates';
    const v = (i: ContentInput) => fact(i, A).verifications[0];
    const real16 = fresh(); expect(v(real16)).toMatchObject({ on: '2026-11-16', by: 'owner', method: 'field-verification' });
    expect(fact(real16, A).checked_on).toBe('2026-11-15'); expect(fact(real16, A).status).toBe('checked');
    const f1 = fresh(); v(f1).on = '2027-01-01'; fails(f1, 'C16', /verification 1 is dated in the future/);
    const f2 = fresh(); v(f2).on = '2026-11-01'; fails(f2, 'C16', /predates the observation/);
    const f3 = fresh(); v(f3).covers = ['fact.sintra.national-palace.hours-palace']; fails(f3, 'C16', /different place or kind/);
    const f4 = fresh(); v(f4).covers = ['fact.sintra.national-palace.nowhere']; fails(f4, 'C16', /unknown fact/);
  });
  it('C16 status history: complete, dated, and ending at the current status', () => {
    const E = 'fact.sintra.monserrate.coordinates-entrance';
    const a = fresh(); fact(a, E).status = 'reported'; fails(a, 'C16', /history ends at confirm-first/);
    const b = fresh(); fact(b, E).history[0].on = '2027-01-01'; fails(b, 'C16', /in the future/);
    const c = fresh(); delete fact(c, E).history[0].previous_checked_on; fails(c, 'C16', /without previous_checked_on/);
    const d = fresh(); fact(d, E).history[0].to = 'checked'; fails(d, 'C16', /does not change the status/);
  });
  it('C14 editorial changes register: invalid entry or unknown content ID', () => {
    const i = fresh(); (i.editorialChanges as Rec).changes[0].approval = undefined; fails(i, 'C14', /approval/);
    const j = fresh(); (j.editorialChanges as Rec).changes[0].content_id = 'place.sintra.nowhere'; fails(j, 'C14', /unknown content_id/);
    const k = fresh(); (k.editorialChanges as Rec).changes.push({ ...(k.editorialChanges as Rec).changes[0] }); fails(k, 'C14', /duplicate/);
  });
});

describe('WARNING and EDITORIAL PENDING never block', () => {
  it('unverified facts are reported but not critical', () => {
    const issues = run(fresh());
    expect(issues.some((i) => i.rule === 'P01')).toBe(true);
    expect(hasCritical(issues)).toBe(false);
  });
  it('W02 flags listed events that ended (hidden automatically); unlisted ended events are silent history', () => {
    const i = fresh();
    const evs = i.events as Rec[];
    const unlisted: Rec = { ...evs.find((e) => e.id === 'event.sintra.taxi-concert')!, id: 'event.sintra.old-unlisted', starts_on: '2020-01-01' };
    delete unlisted.ends_on; evs.push(unlisted);
    const w02 = run(i).filter((x) => x.rule === 'W02').map((x) => x.where).sort();
    expect(w02).toEqual(['event.sintra.colares-wine-journey', 'event.sintra.masmo-mystery-afternoon', 'event.sintra.mutatis-mutandis', 'event.sintra.taxi-concert']); // at 16 Nov 2026
    expect(run(i).find((x) => x.rule === 'W02')!.message).toMatch(/hidden automatically/);
    expect(hasCritical(run(i))).toBe(false);
  });
  it('W02 follows the validation date: Mutatis Mutandis joins on 16 Nov, not on 15 Nov', () => {
    const w = (today: string) => run(fresh(), { ...opts, today }).filter((x) => x.rule === 'W02').map((x) => x.where);
    expect(w('2026-11-15')).not.toContain('event.sintra.mutatis-mutandis');
    expect(w('2026-11-16')).toContain('event.sintra.mutatis-mutandis');
  });
  it('W07 flags an event list with nothing left to show', () => {
    expect(run(fresh()).filter((x) => x.rule === 'W07')).toEqual([]);
    // last recorded events end 3 Jan 2027 (Mordidas do Tempo, Vinil Musa): from 4 Jan both diaries are empty
    expect(run(fresh(), { ...opts, today: '2027-01-03' }).filter((x) => x.rule === 'W07')).toEqual([]);
    expect(run(fresh(), { ...opts, today: '2027-01-04' }).filter((x) => x.rule === 'W07').map((x) => x.where).sort()).toEqual(['list.sintra.events-directory', 'list.sintra.events-local']);
  });
  it('facts past their review window become warnings, not errors', () => {
    const issues = run(fresh(), { ...opts, today: '2027-06-01' });
    expect(issues.some((i) => i.rule === 'W01')).toBe(true);
    expect(issues.filter((i) => i.level === 'critical' && i.rule !== 'C05')).toEqual([]);
  });
});

describe('helpers', () => {
  it('parses DMS in operator formats', () => {
    expect(parseDms('38°47\'44.6"N 9°23\'26.4"W')![0]).toBeCloseTo(38.795722, 5);
    expect(parseDms('38º 47’ 30,70” N 9º 25’ 9,09” W')![1]).toBeCloseTo(-9.419192, 5);
  });
});
