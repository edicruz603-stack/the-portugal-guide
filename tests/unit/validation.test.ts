/**
 * Every critical rule (C01–C13) is demonstrated by a fixture that must fail, plus the real dataset
 * passing with zero critical issues. Fixtures are small mutations of the real content.
 */
import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { loadContentFromDisk } from '../../src/lib/content/load-fs.ts';
import { validateContent, hasCritical, DEFAULT_OPTIONS, parseDms, type ContentInput, type Options } from '../../src/lib/validation/validate.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const real = loadContentFromDisk(root);
const opts: Options = { ...DEFAULT_OPTIONS, today: '2026-11-11' };
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
});

describe('WARNING and EDITORIAL PENDING never block', () => {
  it('ended events and unverified facts are reported but not critical', () => {
    const issues = run(fresh());
    expect(issues.some((i) => i.rule === 'W02')).toBe(true);
    expect(issues.some((i) => i.rule === 'P01')).toBe(true);
    expect(hasCritical(issues)).toBe(false);
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
