/**
 * Approved editorial changes register (M3).
 *
 * The editorial parity check compares every page with the frozen legacy page. Any intentional visible
 * difference must be recorded in src/content/editorial-changes.yaml with the page, the content it
 * concerns, the previous and the replacement content, the reason and the owner's approval reference.
 * The parity check applies only those entries to the legacy side; anything else that differs still fails.
 *
 * Text entries work on the page's visible text as parity sees it: tags stripped, entities decoded,
 * whitespace collapsed to single spaces. Image entries work on the "src | alt" pairs parity compares.
 */
import { z } from 'zod';
import { isoDate } from '../content/schemas.ts';

export const PARITY_PAGES = ['index.html', 'sintra.html', 'sintra-local-discoveries.html', 'sintra-romantic-guide.html', 'sintra-discoveries.html'] as const;

const KEY = '[a-z0-9]+(?:-[a-z0-9]+)*';
export const EditorialChangeSchema = z.object({
  id: z.string().regex(new RegExp(`^change\\.${KEY}\\.${KEY}$`), 'expected change.<destination>.<key>'),
  page: z.enum(PARITY_PAGES),
  /** The record the change concerns (place, fact, event, image …), or `page:<file>` for page prose. */
  content_id: z.string().min(1),
  kind: z.enum(['text', 'image']),
  before: z.string().min(1),
  after: z.string().min(1),
  reason: z.string().min(10),
  approval: z.object({ ref: z.string().min(5), date: isoDate }).strict(),
}).strict().refine((c) => c.before !== c.after, { message: 'before and after are identical' });
export type EditorialChange = z.infer<typeof EditorialChangeSchema>;

export const EditorialRegisterSchema = z.object({
  version: z.literal(1),
  changes: z.array(EditorialChangeSchema),
}).strict();
export type EditorialRegister = z.infer<typeof EditorialRegisterSchema>;

const count = (hay: string, needle: string) => hay.split(needle).length - 1;

export interface Applied { text: string; problems: string[]; applied: string[] }

/**
 * Applies the page's registered text changes to the legacy text. Each `before` must occur exactly once
 * in the legacy text (so an entry cannot match loosely or go stale) and each `after` must occur in the
 * new page (so an entry cannot approve a change that did not happen).
 */
export function applyTextChanges(page: string, legacyText: string, newText: string, changes: readonly EditorialChange[]): Applied {
  const problems: string[] = []; const applied: string[] = [];
  let text = legacyText;
  for (const c of changes.filter((x) => x.page === page && x.kind === 'text')) {
    const n = count(text, c.before);
    if (n !== 1) { problems.push(`${c.id}: "before" occurs ${n} times in the legacy text of ${page} (need exactly 1)`); continue; }
    if (!newText.includes(c.after)) { problems.push(`${c.id}: "after" not found in the new ${page}`); continue; }
    text = text.replace(c.before, c.after);
    applied.push(c.id);
  }
  return { text, problems, applied };
}

/** Same for images: `before` / `after` are "src | alt" entries as compared by the parity check. */
export function applyImageChanges(page: string, legacy: string[], next: string[], changes: readonly EditorialChange[]): { images: string[]; problems: string[]; applied: string[] } {
  const problems: string[] = []; const applied: string[] = [];
  const images = [...legacy];
  for (const c of changes.filter((x) => x.page === page && x.kind === 'image')) {
    const at = images.flatMap((v, i) => (v === c.before ? [i] : []));
    if (at.length !== 1) { problems.push(`${c.id}: image "${c.before}" occurs ${at.length} times on legacy ${page} (need exactly 1)`); continue; }
    if (!next.includes(c.after)) { problems.push(`${c.id}: image "${c.after}" not found on the new ${page}`); continue; }
    images[at[0]!] = c.after;
    applied.push(c.id);
  }
  return { images, problems, applied };
}

/** Structural checks independent of the pages: unique ids, known content IDs. */
export function checkRegister(reg: EditorialRegister, knownIds: ReadonlySet<string>): string[] {
  const out: string[] = []; const seen = new Set<string>();
  for (const c of reg.changes) {
    if (seen.has(c.id)) out.push(`${c.id}: duplicate change id`);
    seen.add(c.id);
    const pageRef = /^page:(.+)$/.exec(c.content_id);
    if (pageRef ? !(PARITY_PAGES as readonly string[]).includes(pageRef[1]!) : !knownIds.has(c.content_id)) out.push(`${c.id}: unknown content_id ${c.content_id}`);
  }
  return out;
}
