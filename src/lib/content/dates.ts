/**
 * The one date the whole system uses (validation, event lists, parity): the "validation date".
 *   VALIDATION_DATE=YYYY-MM-DD   fixed date (tests, reproducible builds)
 *   otherwise                     today's calendar date in Portugal (Europe/Lisbon)
 * The astro build hook resolves it once and passes it to the validator, so a build and its
 * validation never disagree about "today".
 */
export const DESTINATION_TIME_ZONE = 'Europe/Lisbon';

export function validationDate(env: Record<string, string | undefined> = {}, now: Date = new Date()): string {
  const fixed = env.VALIDATION_DATE?.trim();
  if (fixed) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fixed) || Number.isNaN(Date.parse(`${fixed}T00:00:00Z`)) || new Date(`${fixed}T00:00:00Z`).toISOString().slice(0, 10) !== fixed)
      throw new Error(`VALIDATION_DATE must be a real date as YYYY-MM-DD, got "${env.VALIDATION_DATE}"`);
    return fixed;
  }
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: DESTINATION_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Last day an event takes place: ends_on, or starts_on for a one-day event. */
export const lastDay = (e: { starts_on: string; ends_on?: string | undefined }) => e.ends_on ?? e.starts_on;

/**
 * Rule: an event is published up to and including its last day, and disappears from the day after.
 * (An exhibition "until 15 Nov" is still on on 15 Nov.) Ended events stay in the content as history.
 */
export const isEventActive = (e: { starts_on: string; ends_on?: string | undefined }, today: string) => lastDay(e) >= today;

/** The items of an event list that are published at `today`, in list order. Unknown IDs throw. */
export function activeEventIds<E extends { starts_on: string; ends_on?: string | undefined }>(items: readonly string[], events: ReadonlyMap<string, E>, today: string): string[] {
  return items.filter((id) => {
    const e = events.get(id);
    if (!e) throw new Error(`event list item ${id} has no event record`);
    return isEventActive(e, today);
  });
}
