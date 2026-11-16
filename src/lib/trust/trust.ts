/**
 * Visitor-facing trust information (M3). Pure functions; no Astro imports, so everything is unit-tested.
 *
 * The four editorial statuses are unchanged; this module only words them for visitors:
 *   checked        "Checked {date}"   — a quiet, dated line; the date is the fact's own checked_on
 *   reported       "Not yet re-checked"
 *   confirm-first  "Confirm first"
 *   unresolved     "Sources differ — confirm with the operator" (the disputed value is not shown)
 *
 * Trust is grouped per card: one line per status present on the card, listing what it concerns,
 * never one warning per value.
 */
import type { Fact, Event } from '../content/schemas.ts';
import type { MapPlace } from '../map/types.ts';

export type Status = Fact['status'];
export const STATUS_ORDER: Status[] = ['unresolved', 'confirm-first', 'reported', 'checked'];

export const LABELS = {
  reported: 'Not yet re-checked',
  'confirm-first': 'Confirm first',
  unresolved: 'Sources differ — confirm with the operator',
} as const satisfies Record<Exclude<Status, 'checked'>, string>;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 2026-11-11 → "11 Nov 2026" (no time zone arithmetic: the ISO date is the calendar date). */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`not an ISO date: ${iso}`);
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}
export const checkedLabel = (iso: string) => `Checked ${formatDate(iso)}`;

/** What a fact is about, in visitor words. */
export const ITEM: Record<Fact['kind'], string> = {
  coordinates: 'map position', hours: 'opening hours', 'last-entry': 'last entry', price: 'price', closure: 'closure',
  notice: 'notice', rule: 'ticket rule', access: 'access', address: 'address', phone: 'phone', website: 'website',
  route: 'route', transport: 'transport', date: 'date', history: 'history', other: 'details',
};

export interface SourceInfo { id: string; publisher: string; kind: string }
export interface TrustFact { id: string; kind: Fact['kind']; status: Status; checked_on?: string | undefined; source: string; quote?: string | undefined; unresolved_text?: string | undefined }

export interface TrustLine {
  status: Status;
  /** e.g. "Not yet re-checked" or "Checked 11 Nov 2026" */
  label: string;
  /** what the line concerns: "price, opening hours" */
  items: string[];
  /** explanation shown when the visitor opens the line (not for checked) */
  detail?: string;
  facts: string[];
}

const join = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const unique = <T,>(xs: T[]) => [...new Set(xs)];

function detail(status: Exclude<Status, 'checked'>, sources: SourceInfo[], subject: 'operator' | 'organiser'): string {
  const own = sources.filter((s) => s.kind === 'own-edition');
  const others = unique(sources.filter((s) => s.kind !== 'own-edition').map((s) => s.publisher));
  const who = subject === 'organiser' ? 'the organiser' : 'the operator';
  switch (status) {
    case 'reported': {
      const from = [...(own.length ? ['the previous edition of this guide'] : []), ...others];
      return `From ${join(from)}. We have not yet re-checked this with ${who}. It may well be correct — confirm before you rely on it.`;
    }
    case 'confirm-first':
      return `We have no reliable published source for this yet. Confirm with ${who} before you rely on it.`;
    case 'unresolved':
      return `Official sources give different information${others.length ? ` (${join(others)})` : ''}, so we do not show a single value. Confirm with ${who} before you go.`;
  }
}

/** Trust lines for a set of facts shown together (one card, one sentence, one marker). */
export function trustLines(facts: readonly TrustFact[], sources: ReadonlyMap<string, SourceInfo>, subject: 'operator' | 'organiser' = 'operator'): TrustLine[] {
  const lines: TrustLine[] = [];
  for (const status of STATUS_ORDER) {
    const fs = facts.filter((f) => f.status === status);
    if (!fs.length) continue;
    const items = unique(fs.map((f) => ITEM[f.kind]));
    if (status === 'checked') {
      const dates = fs.map((f) => f.checked_on).filter((d): d is string => !!d).sort();
      // only a date backed by the facts' own verification; without one, no checked line at all
      if (dates.length !== fs.length) throw new Error(`checked facts without checked_on: ${fs.filter((f) => !f.checked_on).map((f) => f.id).join(', ')}`);
      lines.push({ status, label: checkedLabel(dates[0]!), items, facts: fs.map((f) => f.id) });
    } else {
      const srcs = fs.map((f) => sources.get(f.source)).filter((s): s is SourceInfo => !!s);
      lines.push({ status, label: LABELS[status], items, detail: detail(status, srcs, subject), facts: fs.map((f) => f.id) });
    }
  }
  return lines;
}

/** Every string in an editorial object, in order. */
export const editorialStrings = (o: unknown): string[] =>
  typeof o === 'string' ? [o] : Array.isArray(o) ? o.flatMap(editorialStrings) : o && typeof o === 'object' ? Object.values(o).flatMap(editorialStrings) : [];

/** The place's facts whose quote appears in this card's editorial text. */
export function factsOnCard<F extends TrustFact>(editorial: unknown, facts: readonly F[]): F[] {
  const text = editorialStrings(editorial);
  return facts.filter((f) => f.quote && text.some((t) => t.includes(f.quote!)));
}

/**
 * Replaces the quoted text of every unresolved fact by its approved `unresolved_text`, so a disputed value
 * is never shown as if it were settled. Returns a new object; the stored editorial text is untouched.
 */
export function suppressDisputed<T>(editorial: T, facts: readonly TrustFact[]): T {
  const swaps = facts.filter((f) => f.status === 'unresolved' && f.quote && f.unresolved_text);
  if (!swaps.length) return editorial;
  const walk = (o: unknown): unknown =>
    typeof o === 'string' ? swaps.reduce((s, f) => s.split(f.quote!).join(f.unresolved_text!), o)
      : Array.isArray(o) ? o.map(walk)
        : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, walk(v)])) : o;
  return walk(editorial) as T;
}

/** Events carry their own status: one line about the event's dates. */
export function eventTrust(e: Pick<Event, 'id' | 'status' | 'checked_on' | 'source'>, sources: ReadonlyMap<string, SourceInfo>): TrustLine[] {
  return trustLines([{ id: e.id, kind: 'date', status: e.status, checked_on: e.checked_on, source: e.source }], sources, 'organiser')
    .map((l) => ({ ...l, items: ['dates'] }));
}

/** A map marker's trust line, in the same words as the cards. */
export function markerTrust(p: Pick<MapPlace, 'coordinates'>): string {
  const c = p.coordinates;
  return c.status === 'checked' ? `${checkedLabel(c.checkedOn!)} · map position` : `${LABELS[c.status]} · map position`;
}
