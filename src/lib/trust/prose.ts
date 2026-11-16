/**
 * Facts stated in page prose outside place records (M2 finding, M3 trust marks).
 * The page shows the trust line next to the sentence; the pending classification treats them as visible.
 * tests/unit/pending.test.ts asserts each phrase is still in its page source, so this list cannot go stale.
 */
export const VISIBLE_IN_PROSE: Record<string, { page: string; phrase: string }> = {
  'fact.sintra.sintra-station.buses': { page: 'src/pages/sintra.astro', phrase: 'Bus 434 serves the historic centre' },
};

/** Fact IDs stated by a phrase on a page (the page passes its own file name and phrase, never an ID). */
export function proseFacts(page: string, phrase: string): string[] {
  const hits = Object.entries(VISIBLE_IN_PROSE).filter(([, v]) => v.page.endsWith(`/${page}`) && v.phrase === phrase).map(([id]) => id);
  if (!hits.length) throw new Error(`no prose fact registered for ${page}: "${phrase}"`);
  return hits;
}
