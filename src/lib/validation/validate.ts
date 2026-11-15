/**
 * Content validation (M2), three levels approved 7 Nov 2026:
 *  - critical: blocks every production build
 *  - warning:  never blocks
 *  - pending:  editorial work in progress; allowed in development, never presented as verified
 *
 * Works for any number of destinations: every rule is expressed over records, not over Sintra.
 * Each critical rule has a failing fixture in tests/unit/validation.test.ts (rule codes C01…).
 */
import type { z } from 'zod';
import {
  CHECKABLE_KINDS, DestinationSchema, EventSchema, FactSetSchema, IdLockSchema, ImageSchema, ListSchema,
  PlaceSchema, SourceSchema, ZoneSchema, EDITORIAL_CONTEXTS,
  type Event, type Fact, type List, type Place,
} from '../content/schemas.ts';
import { HomeDestinationSchema } from './schemas.ts';
import { isEventActive, lastDay } from '../content/dates.ts';

export type Level = 'critical' | 'warning' | 'pending';
export interface Issue { level: Level; rule: string; where: string; message: string }

export interface ContentInput {
  sources: unknown[];
  images: unknown[];
  destinations: unknown[];
  zones: unknown[];
  places: unknown[];
  factSets: unknown[];
  events: unknown[];
  lists: unknown[];
  idLock: unknown;
  homeDestinations: unknown[];
  /** src/pages/*.astro sources keyed by file name */
  pages: Record<string, string>;
}

export interface Options {
  mode: 'free' | 'commercial';
  today: string;              // YYYY-MM-DD
  defaultReviewDays: number;  // facts without review_after_days
  sourceReviewDays: number;
}

export const DEFAULT_OPTIONS: Omit<Options, 'today'> = { mode: 'free', defaultReviewDays: 180, sourceReviewDays: 180 };

// mainland Portugal (Phase scope); extend when island destinations arrive
const BOUNDS = { latMin: 36.8, latMax: 42.2, lonMin: -9.6, lonMax: -6.1 };
const MAX_DMS_DRIFT_M = 15;

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const norm = (s: string) => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’'`]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
const haversine = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
};
export function parseDms(s: string): [number, number] | null {
  const parts = [...s.matchAll(/(\d+)[°º]\s*(\d+)['’′]\s*([\d.,]+)["”″]?\s*([NSEW])/g)].map((m) => {
    const v = +m[1]! + +m[2]! / 60 + parseFloat(m[3]!.replace(',', '.')) / 3600;
    return /[SW]/.test(m[4]!) ? -v : v;
  });
  return parts.length === 2 ? [parts[0]!, parts[1]!] : null;
}
/** Every string inside an editorial object (titles, texts, labels, links). */
const strings = (o: unknown): string[] =>
  typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === 'object' ? Object.values(o).flatMap(strings) : [];

export function validateContent(input: ContentInput, opts: Options): Issue[] {
  const issues: Issue[] = [];
  const add = (level: Level, rule: string, where: string, message: string) => issues.push({ level, rule, where, message });

  // C01 — schema validity (includes malformed IDs, missing source/observed_on/status on facts)
  function parse<T>(schema: z.ZodType<T>, items: unknown[], label: string): T[] {
    const ok: T[] = [];
    items.forEach((item, i) => {
      const r = schema.safeParse(item);
      if (r.success) ok.push(r.data);
      else {
        const id = (item as { id?: string; place?: string })?.id ?? (item as { place?: string })?.place ?? `#${i}`;
        for (const e of r.error.issues) add('critical', 'C01', `${label} ${id}`, `${e.path.join('.') || '(root)'}: ${e.message}`);
      }
    });
    return ok;
  }
  const sources = parse(SourceSchema, input.sources, 'source');
  const images = parse(ImageSchema, input.images, 'image');
  const destinations = parse(DestinationSchema, input.destinations, 'destination');
  const zones = parse(ZoneSchema, input.zones, 'zone');
  const places = parse(PlaceSchema, input.places, 'place') as Place[];
  const factSets = parse(FactSetSchema, input.factSets, 'facts');
  const events = parse(EventSchema, input.events, 'event') as Event[];
  const lists = parse(ListSchema, input.lists, 'list') as List[];
  const homeDests = parse(HomeDestinationSchema, input.homeDestinations, 'home destination');
  const lockParsed = IdLockSchema.safeParse(input.idLock);
  if (!lockParsed.success) add('critical', 'C01', 'ids.lock.json', lockParsed.error.issues.map((e) => e.message).join('; '));

  const facts: (Fact & { place: string })[] = factSets.flatMap((s) => s.facts.map((f) => ({ ...f, place: s.place })));

  // C02 — IDs unique across every record type
  const all = [
    ...sources.map((x) => x.id), ...images.map((x) => x.id), ...destinations.map((x) => x.id), ...zones.map((x) => x.id),
    ...places.map((x) => x.id), ...facts.map((x) => x.id), ...events.map((x) => x.id), ...lists.map((x) => x.id),
  ];
  const seen = new Set<string>();
  for (const id of all) { if (seen.has(id)) add('critical', 'C02', id, 'duplicate ID'); seen.add(id); }
  const factSetPlaces = new Set<string>();
  for (const s of factSets) { if (factSetPlaces.has(s.place)) add('critical', 'C02', s.place, 'more than one fact file for this place'); factSetPlaces.add(s.place); }

  // C03 — immutable IDs: every locked ID still exists or is explicitly retired
  if (lockParsed.success) {
    const lock = lockParsed.data;
    for (const id of lock.ids) {
      if (seen.has(id)) continue;
      const r = lock.retired[id];
      if (!r) add('critical', 'C03', id, 'locked ID no longer exists (renamed or removed); IDs are immutable — restore it or retire it in ids.lock.json');
    }
    for (const [id, r] of Object.entries(lock.retired)) {
      if (seen.has(id)) add('critical', 'C03', id, 'retired ID is still in use');
      if (r.replaced_by && !seen.has(r.replaced_by)) add('critical', 'C03', id, `retired ID points to missing ${r.replaced_by}`);
    }
    const locked = new Set(lock.ids);
    for (const id of all) if (!locked.has(id)) add('warning', 'W05', id, 'new ID not yet locked — run `npm run ids:lock`');
  }

  // lookups
  const S = new Map(sources.map((x) => [x.id, x]));
  const I = new Set(images.map((x) => x.id));
  const D = new Set(destinations.map((x) => x.id));
  const Z = new Map(zones.map((x) => [x.id, x]));
  const P = new Map(places.map((x) => [x.id, x]));
  const F = new Map(facts.map((x) => [x.id, x]));
  const E = new Map(events.map((x) => [x.id, x]));
  const ref = (ok: boolean, where: string, what: string) => { if (!ok) add('critical', 'C04', where, `broken reference: ${what}`); };

  // C04 — references
  for (const z of zones) ref(D.has(z.destination), z.id, z.destination);
  for (const p of places) {
    ref(D.has(p.destination), p.id, p.destination);
    if (p.zone) {
      ref(Z.has(p.zone), p.id, p.zone);
      if (Z.get(p.zone) && Z.get(p.zone)!.destination !== p.destination) add('critical', 'C04', p.id, `zone ${p.zone} belongs to another destination`);
    }
    if (p.part_of) ref(P.has(p.part_of) && p.part_of !== p.id, p.id, `part_of ${p.part_of}`);
    for (const im of p.images) ref(I.has(im), p.id, im);
    if (p.name.official && !p.name.official_source) add('critical', 'C04', p.id, 'official name without official_source');
    if (p.name.official_source) ref(S.has(p.name.official_source), p.id, p.name.official_source);
    if (p.map) {
      const f = F.get(p.map.coordinates);
      ref(!!f, p.id, `map.coordinates ${p.map.coordinates}`);
      if (f && f.kind !== 'coordinates') add('critical', 'C04', p.id, `map.coordinates points to a ${f.kind} fact`);
      if (f && f.place !== p.id && f.place !== p.part_of) add('critical', 'C04', p.id, 'map.coordinates must be a fact of this place or of its parent');
    }
  }
  for (const s of factSets) ref(P.has(s.place), `facts ${s.place}`, s.place);
  for (const f of facts) {
    ref(S.has(f.source), f.id, f.source);
    const key = f.place.split('.').slice(1).join('.');
    if (!f.id.startsWith(`fact.${key}.`)) add('critical', 'C04', f.id, `fact ID must start with fact.${key}.`);
  }
  for (const e of events) {
    ref(D.has(e.destination), e.id, e.destination);
    ref(S.has(e.source), e.id, e.source);
    if (e.place) ref(P.has(e.place), e.id, e.place);
  }
  for (const l of lists) {
    ref(D.has(l.destination), l.id, l.destination);
    for (const item of l.items) {
      if (l.context.startsWith('event:')) {
        const ev = E.get(item);
        ref(!!ev, l.id, item);
        const ctx = l.context.slice(6) as keyof Event['editorial'];
        if (ev && !ev.editorial[ctx]) add('critical', 'C04', l.id, `${item} has no "${ctx}" text`);
      } else {
        const pl = P.get(item);
        ref(!!pl, l.id, item);
        if (pl && l.context === 'map' && !pl.map) add('critical', 'C04', l.id, `${item} has no map entry`);
        if (pl && l.context !== 'map' && !pl.editorial[l.context as keyof Place['editorial']]) add('critical', 'C04', l.id, `${item} has no "${l.context}" text`);
        if (pl && pl.destination !== l.destination) add('critical', 'C04', l.id, `${item} belongs to another destination`);
      }
    }
    if (new Set(l.items).size !== l.items.length) add('critical', 'C04', l.id, 'an item appears twice');
  }
  for (const im of images) ref(S.has(im.source), im.id, im.source);

  // C05 — dates and statuses can never make a value look freshly verified
  for (const f of [...facts, ...events]) {
    const where = f.id;
    if (f.status === 'checked') {
      if (!f.checked_on) add('critical', 'C05', where, 'status checked requires checked_on');
      const src = S.get(f.source);
      if (src && !(CHECKABLE_KINDS as readonly string[]).includes(src.kind)) add('critical', 'C05', where, `cannot be checked from a ${src.kind} source (${src.id})`);
      if (f.provenance === 'legacy-website' || f.provenance === 'secondary-listing') add('critical', 'C05', where, `a ${f.provenance} value cannot be marked checked`);
    } else if (f.checked_on) add('critical', 'C05', where, `checked_on is only allowed for status checked (status is ${f.status})`);
    if (f.checked_on && f.checked_on < f.observed_on) add('critical', 'C05', where, 'checked_on is before observed_on');
    for (const d of [f.observed_on, f.checked_on]) if (d && d > opts.today) add('critical', 'C05', where, `date ${d} is in the future`);
  }

  // C06 — conflicts are kept, never silently resolved
  const groups = new Map<string, typeof facts>();
  for (const f of facts) if (f.conflict_group) groups.set(f.conflict_group, [...(groups.get(f.conflict_group) ?? []), f]);
  for (const f of facts) {
    if (f.status === 'unresolved' && !f.conflict_group) add('critical', 'C06', f.id, 'unresolved fact without conflict_group');
    if (f.conflict_group && f.status !== 'unresolved') add('critical', 'C06', f.id, `fact in conflict group "${f.conflict_group}" must stay unresolved until the conflict is settled`);
  }
  for (const [g, list] of groups) if (list.length < 2) add('critical', 'C06', g, 'conflict group needs at least two competing facts');

  // C07 — one place per real place: names and aliases may not collide across places
  const owner = new Map<string, string>();
  for (const p of places) {
    const names = new Set([p.name.official, ...p.name.aliases, ...EDITORIAL_CONTEXTS.map((c) => (p.editorial[c] as { title?: string } | undefined)?.title)]
      .filter((x): x is string => !!x).map(norm));
    for (const n of names) {
      const other = owner.get(`${p.destination}|${n}`);
      if (other && other !== p.id) add('critical', 'C07', p.id, `name "${n}" is also used by ${other} (duplicate place?)`);
      owner.set(`${p.destination}|${n}`, p.id);
    }
  }

  // C08 — geometry: coordinates inside the country, official values consistent with their DMS text
  for (const f of facts.filter((x) => x.kind === 'coordinates')) {
    const lat = f.value.lat, lon = f.value.lon;
    if (typeof lat !== 'number' || typeof lon !== 'number') { add('critical', 'C08', f.id, 'coordinates need numeric lat and lon'); continue; }
    if (lat < BOUNDS.latMin || lat > BOUNDS.latMax || lon < BOUNDS.lonMin || lon > BOUNDS.lonMax) add('critical', 'C08', f.id, `(${lat}, ${lon}) is outside mainland Portugal`);
    if (f.status === 'checked' || f.provenance === 'official-page-read' || f.provenance === 'pdf-first-edition-2026') {
      const dms = typeof f.value.dms === 'string' ? parseDms(f.value.dms) : null;
      if (!dms) add('critical', 'C08', f.id, 'sourced coordinates must keep the published DMS text');
      else if (haversine(dms, [lat, lon]) > MAX_DMS_DRIFT_M) add('critical', 'C08', f.id, `lat/lon is ${Math.round(haversine(dms, [lat, lon]))} m from the published value`);
    }
  }

  // C09 — a fact that quotes editorial text must quote it exactly
  for (const f of facts.filter((x) => x.quote)) {
    const p = P.get(f.place);
    if (p && !strings(p.editorial).some((s) => s.includes(f.quote!))) add('critical', 'C09', f.id, `quote not found in ${f.place} editorial: "${f.quote}"`);
  }

  // C10 — pages render places only from the dataset (no hard-coded place cards or place lists)
  const placeNames = new Map<string, string>();
  for (const p of places) for (const n of [...p.name.aliases, p.name.official].filter(Boolean) as string[]) placeNames.set(norm(n), p.id);
  for (const [file, src] of Object.entries(input.pages)) {
    if (/<article class="(place|item|food-card)"/.test(src)) add('critical', 'C10', `page ${file}`, 'hard-coded place card markup; render it from a list');
    for (const m of src.matchAll(/google\.com\/maps\/search\/\?api=1&(?:amp;)?query=([^"&]+)/g)) {
      const q = norm(decodeURIComponent(m[1]!.replace(/\+/g, ' ')));
      const hit = [...placeNames.entries()].find(([n]) => n.length > 4 && q.includes(n.replace(/['’]/g, '')));
      if (hit) add('critical', 'C10', `page ${file}`, `hard-coded map link to ${hit[1]}; render it from the dataset`);
    }
    if (/\bplace\.[a-z0-9-]+\.[a-z0-9-]+/.test(src.replace(/<!--[\s\S]*?-->/g, ''))) add('critical', 'C10', `page ${file}`, 'page refers to place IDs directly; select places through a list');
    for (const m of src.matchAll(/<article\b[\s\S]*?<\/article>/g)) {
      const h = m[0].match(/<h3>([\s\S]*?)<\/h3>/);
      const id = h && placeNames.get(norm(decode(h[1]!.replace(/<[^>]+>/g, ''))));
      if (id) add('critical', 'C10', `page ${file}`, `hard-coded card for ${id}`);
    }
  }

  // C11 — images: every page image has a rights record; uncleared images block commercial builds
  const byUrl = new Map(images.map((im) => [im.url, im]));
  for (const [file, html] of Object.entries(input.pages)) {
    for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) if (!byUrl.has(m[1]!)) add('critical', 'C11', `page ${file}`, `image without a source/credit record: ${m[1]}`);
  }
  for (const im of images) {
    if (im.rights_category === 'contributor' && !im.permission_ref) add('critical', 'C11', im.id, 'contributor image without a written-permission reference');
    if (!im.commercial_ok) add(opts.mode === 'commercial' ? 'critical' : 'warning', opts.mode === 'commercial' ? 'C11' : 'W06', im.id, 'not cleared for commercial publication');
    if (im.status === 'pending') add('pending', 'P05', im.id, 'rights record awaiting confirmation');
  }

  // C12 — events: dates in order
  for (const e of events) if (e.ends_on && e.ends_on < e.starts_on) add('critical', 'C12', e.id, 'ends_on is before starts_on');

  // C13 — homepage destination cards link to existing pages
  const pageNames = new Set(Object.keys(input.pages).map((f) => f.replace(/\.astro$/, '.html')));
  for (const d of homeDests) {
    const target = d.href.split('#')[0]!;
    if (target && !/^https?:/.test(target) && !pageNames.has(target)) add('critical', 'C13', `home destination ${d.name}`, `link target ${target} does not exist`);
  }

  // ---------------- warnings
  for (const f of facts) {
    const since = f.checked_on ?? f.observed_on;
    const limit = f.review_after_days ?? opts.defaultReviewDays;
    if (days(since, opts.today) > limit) add('warning', 'W01', f.id, `last ${f.checked_on ? 'checked' : 'observed'} ${days(since, opts.today)} days ago (review every ${limit})`);
  }
  // W02 — a listed event that has ended is hidden automatically (repository.eventsInList, rule in content/dates.ts);
  //       the warning tells editors the list has lost an item. Unlisted ended events are history and stay silent.
  // W07 — an event list with nothing left to show at the validation date
  const eventLists = lists.filter((l) => l.context.startsWith('event:'));
  const eventById = new Map(events.map((e) => [e.id, e]));
  const listsOf = (id: string) => eventLists.filter((l) => l.items.includes(id)).map((l) => l.id);
  for (const e of events) if (listsOf(e.id).length && !isEventActive(e, opts.today)) add('warning', 'W02', e.id, `event ended ${lastDay(e)}; hidden automatically from ${listsOf(e.id).join(', ')}`);
  for (const l of eventLists) if (!l.items.some((id) => { const e = eventById.get(id); return e && isEventActive(e, opts.today); })) add('warning', 'W07', l.id, 'no event left to show at the validation date');
  const hasCoords = new Set(facts.filter((f) => f.kind === 'coordinates').map((f) => f.place));
  for (const p of places) if (!hasCoords.has(p.id) && !(p.part_of && hasCoords.has(p.part_of))) add('warning', 'W03', p.id, 'no coordinates recorded');
  for (const s of sources) if (days(s.seen_on, opts.today) > opts.sourceReviewDays) add('warning', 'W04', s.id, `last seen ${days(s.seen_on, opts.today)} days ago`);

  // ---------------- editorial pending
  for (const f of facts) if (f.status !== 'checked') add('pending', 'P01', f.id, `${f.status}${f.conflict_group ? ` (conflict: ${f.conflict_group})` : ''} — ${f.text}`);
  for (const e of events) if (e.status !== 'checked') add('pending', 'P01', e.id, `${e.status} — ${e.title}`);
  for (const p of places) {
    if (!p.zone) add('pending', 'P02', p.id, 'location not established (no zone)');
    if (Object.keys(p.editorial).length === 0) add('pending', 'P03', p.id, 'no reader-facing text yet');
    if (!facts.some((f) => f.place === p.id)) add('pending', 'P04', p.id, 'no structured facts yet');
    if (p.map) {
      const f = F.get(p.map.coordinates);
      if (f && f.status !== 'checked') add('pending', 'P06', p.id, `map marker uses ${f.status} coordinates (${f.id})`);
    }
  }

  return issues;
}

export const hasCritical = (issues: Issue[]) => issues.some((i) => i.level === 'critical');
