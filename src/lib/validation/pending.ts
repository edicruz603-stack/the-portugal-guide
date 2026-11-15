/**
 * Classification of the EDITORIAL PENDING issues (P01–P06) into five working categories (M2 final review).
 * Pure function over the content and the validator's issues: it changes no status and no fact.
 *
 *   1 visible-risk     the value is shown to visitors today: a fact quoted in published text, the coordinates of a
 *                      map marker (P06 — its coordinate fact's P01 issue is the same item, merged into it),
 *                      or a listed event still shown at the validation date
 *   2 research         not shown to visitors: facts and events kept as data only, conflict partners, ended events,
 *                      places whose location is not established (P02)
 *   3 descriptions     places with no reader-facing text (P03)
 *   4 facts            places with no structured facts (P04)
 *   5 commercial       image rights awaiting confirmation (P05): block a commercial build
 *
 * Every pending issue lands in exactly one category; the only merge is P06 + the P01 of the same coordinate fact.
 */
import type { ContentInput, Issue } from './validate.ts';
import type { Event, Fact, List, Place } from '../content/schemas.ts';
import { isEventActive } from '../content/dates.ts';

export type PendingCategory = 'visible-risk' | 'research' | 'descriptions' | 'facts' | 'commercial';

export interface PendingItem {
  category: PendingCategory;
  id: string;                 // fact, event, place or image ID
  issues: string[];           // validator issue keys "P01:<id>" (two for a merged marker)
  status?: Fact['status'];    // for facts and events
  visibleAs?: string;         // where a visitor sees it (category 1)
  action: string;             // what resolves it
}

export const CATEGORY_INFO: Record<PendingCategory, { title: string; impact: string; caveat: string; hidden: string }> = {
  'visible-risk': {
    title: 'Content risks visible to visitors',
    impact: 'A visitor reads or sees the value today (page text, map marker or event diary) without a per-item verification mark.',
    caveat: 'reported and confirm-first: yes, with a visible status mark ("reported, check before you travel" / "approximate, confirm first"). Status marks arrive with M3; until then only the pages\' general "check before travelling" notes apply.',
    hidden: 'unresolved: yes — a single value should not be presented as fact while sources disagree; show "confirm with the operator" (or every value with its source) instead. Changing visible text breaks parity with production, so this needs owner approval (M3).',
  },
  research: {
    title: 'Internal research tasks',
    impact: 'None today: the values are data only. None is quoted in a published card, marker or diary, and a check of each value against the built pages (13 Nov 2026) found none in page prose either (the one exception is in category 1).',
    caveat: 'Not applicable while unpublished. If published later, the same rule as category 1 applies by status.',
    hidden: 'Yes, until checked or until M3 can show their status mark. Unresolved values stay hidden until the operator settles them.',
  },
  descriptions: {
    title: 'Place descriptions missing',
    impact: 'None today: these places have no card or page. They would be empty if published.',
    caveat: 'No — there is nothing to qualify.',
    hidden: 'Yes: no page or card for them until reader-facing text is written and approved (M3/M4). Text must come from the editions or new sourced writing, never invented.',
  },
  facts: {
    title: 'Structured facts missing',
    impact: 'The place is published with editorial text only; no hours, prices or contact data are shown as facts for it.',
    caveat: 'Yes: editorial text stays as published; it must not gain hours, prices or rules until they are sourced.',
    hidden: 'Not required for the place itself; any future fact field stays empty until sourced.',
  },
  commercial: {
    title: 'Blockers for commercial publication',
    impact: 'Free edition: the photographs show with their credits (warning W06). Commercial edition: the build fails (C11).',
    caveat: 'Free edition only, with credit and licence as today.',
    hidden: 'Commercial edition: yes — each image is cleared, replaced or removed before a commercial build can pass.',
  },
};

type Src = { id: string; kind: string };

/**
 * Facts without a `quote` whose value nevertheless also appears in page prose outside place records.
 * Found by checking every unquoted pending fact's value against the built pages (13 Nov 2026).
 * tests/unit/pending.test.ts asserts each phrase is still in the page source, so this list cannot go stale.
 */
export const VISIBLE_IN_PROSE: Record<string, { page: string; phrase: string }> = {
  'fact.sintra.sintra-station.buses': { page: 'src/pages/sintra.astro', phrase: 'Bus 434 serves the historic centre' },
};

function factAction(f: Fact, sourceKind: string | undefined): string {
  if (f.status === 'unresolved') return `Ask the operator which value applies (conflict ${f.conflict_group}); keep every value until then; then mark the confirmed one checked and retire or re-scope the others.`;
  if (f.status === 'confirm-first') {
    if (f.kind === 'coordinates') return 'Find operator-published coordinates or survey on site; until then the marker stays approximate.';
    return 'Find a reliable published source (the operator itself); until then do not state the value.';
  }
  // reported
  if (f.provenance === 'legacy-website') return 'Re-read on the operator\'s or business\'s own page; record checked_on only when that source states the same value.';
  if (sourceKind && sourceKind !== 'operator' && sourceKind !== 'official') return `Confirm with the operator itself (current source is ${sourceKind}, which cannot make a fact checked).`;
  if (f.provenance === 'pdf-first-edition-2026') return 'Re-read on the operator page cited by the First Edition ledger (read 7 Nov 2026); record checked_on if unchanged.';
  return 'Confirm with the operator (the cited page gives only part of the picture); record checked_on when confirmed.';
}

export function classifyPending(input: ContentInput, issues: Issue[], today: string): PendingItem[] {
  const places = input.places as Place[];
  const facts = (input.factSets as { place: string; facts: Fact[] }[]).flatMap((s) => s.facts.map((f) => ({ ...f, place: s.place })));
  const events = input.events as Event[];
  const lists = input.lists as List[];
  const sources = new Map((input.sources as Src[]).map((s) => [s.id, s.kind]));
  const factById = new Map(facts.map((f) => [f.id, f]));
  const eventById = new Map(events.map((e) => [e.id, e]));
  const placeById = new Map(places.map((p) => [p.id, p]));
  const listsOf = (id: string) => lists.filter((l) => l.items.includes(id)).map((l) => l.id);
  const pending = issues.filter((i) => i.level === 'pending');

  // coordinate facts drawn on the map (P06) — their own P01 issue is the same item
  const markerFact = new Map<string, string>(); // fact id -> place id
  for (const id of lists.filter((l) => l.context === 'map').flatMap((l) => l.items)) {
    const c = placeById.get(id)?.map?.coordinates; if (c) markerFact.set(c, id);
  }

  const items: PendingItem[] = [];
  for (const i of pending) {
    const key = `${i.rule}:${i.where}`;
    switch (i.rule) {
      case 'P06': {
        const p = placeById.get(i.where)!; const f = factById.get(p.map!.coordinates)!;
        items.push({ category: 'visible-risk', id: i.where, issues: [key, `P01:${f.id}`], status: f.status, visibleAs: `map marker "${p.map!.label}" (coordinates ${f.id})`, action: factAction(f, sources.get(f.source)) });
        break;
      }
      case 'P01': {
        const f = factById.get(i.where);
        if (f) {
          if (markerFact.has(f.id) && pending.some((x) => x.rule === 'P06' && x.where === markerFact.get(f.id))) break; // merged into the P06 item
          const prose = VISIBLE_IN_PROSE[f.id];
          const shown = (f.quote && listsOf(f.place).length) || prose;
          const visibleAs = prose ? `page prose (${prose.page.split('/').pop()}): “${prose.phrase}…” (part of the value)` : `published text of ${f.place}: “${f.quote}”`;
          items.push({ category: shown ? 'visible-risk' : 'research', id: f.id, issues: [key], status: f.status, ...(shown ? { visibleAs } : {}), action: factAction(f, sources.get(f.source)) });
          break;
        }
        const e = eventById.get(i.where)!;
        const shownIn = listsOf(e.id);
        const active = isEventActive(e, today);
        items.push({
          category: shownIn.length && active ? 'visible-risk' : 'research', id: e.id, issues: [key], status: e.status,
          ...(shownIn.length && active ? { visibleAs: `event diary (${shownIn.join(', ')}) until ${e.ends_on ?? e.starts_on}` } : {}),
          action: active ? 'Check the organiser\'s own event page (dates, times, booking); record checked_on when it matches.' : `Ended ${e.ends_on ?? e.starts_on}: hidden automatically, kept as history. No action unless the record is reused.`,
        });
        break;
      }
      case 'P02': items.push({ category: 'research', id: i.where, issues: [key], action: 'Establish where the place is from a reliable source (address published by the business), then assign its zone.' }); break;
      case 'P03': items.push({ category: 'descriptions', id: i.where, issues: [key], action: 'Write reader-facing text from the PDF chapter or new sourced research, for editorial approval (M3/M4).' }); break;
      case 'P04': items.push({ category: 'facts', id: i.where, issues: [key], action: 'Research hours, prices, address or access from the operator or the business\'s own page; enter each with source and status.' }); break;
      case 'P05': items.push({ category: 'commercial', id: i.where, issues: [key], action: 'Verify the licence and author on the file page, decide on share-alike and attribution for commercial use, record it — or replace with an owner photograph with written permission.' }); break;
      default: throw new Error(`unclassified pending rule ${i.rule} (${i.where})`);
    }
  }
  // completeness: every pending issue is covered exactly once
  const covered = items.flatMap((x) => x.issues);
  const keys = pending.map((i) => `${i.rule}:${i.where}`);
  if (covered.length !== keys.length || new Set(covered).size !== covered.length || keys.some((k) => !covered.includes(k)))
    throw new Error(`pending classification incomplete: ${keys.length} issues, ${covered.length} covered`);
  return items;
}
