# Seasonal event diary — monthly research procedure (M3)

Owner policy, 16 Nov 2026 (M3 brief §8). Rules enforced in code are marked **[rule]**.

## Cadence
- **Monthly**, in the last week of each month: research the next 6–8 weeks.
- Before any release build: check every listed event's dates against today's validation date.
- **No automatic rebuild schedule exists or is introduced in M3.** The site is static, so an event disappears from the pages only when the site is rebuilt (see "Limits").

## Sources, in order of authority
1. **The organiser's own published page** for the event (the venue's or producer's site, or the municipality for its own events). This is the only basis for `checked` **[rule C17]**.
2. Official institutional calendars, used to discover events and as primary sources when the institution is the organiser:
   - Parques de Sintra agenda — https://www.parquesdesintra.pt/en/agenda/
   - Quinta da Regaleira agenda — https://www.regaleira.pt/en/agenda
   - Câmara Municipal de Sintra agenda — https://cm-sintra.pt/agenda (per-event pages; includes Centro Cultural Olga Cadaval, MU.SA and the municipal museums)
   - Agenda Cultural de Sintra and Visit Sintra events, for discovery
3. Aggregators and press, as leads only, never as evidence.

## Minimum evidence before an event is `checked` [rule C17]
- The source is in `src/content/sources.json` with its URL, and is the organiser's own page (`kind: operator` or `official`).
- `provenance: official-page-read`, `observed_on` (when found) and `checked_on` (when the organiser's page was read). Both dates are on or before the validation date, and `checked_on` ≥ `observed_on`.
- `starts_on` / `ends_on` (and `time` when given) match the organiser's page; record anything still to confirm (booking, sessions, prices) in `note`.
- Anything less stays `reported`, and visitors see "Not yet re-checked". `checked_on` on a non-checked event is an error.

## Never
- Invent or assume recurring dates ("it happened last year, so it will happen again").
- Change the dates of an existing event without the organiser's published evidence. Record the new reading, with its source and `observed_on`.
- Delete ended events. They stay in `events/` and in their lists as history. The inclusive rule hides them from the first build after their last day (`src/lib/content/dates.ts`, Europe/Lisbon validation date), and W02 reports them; W07 reports a diary with nothing left to show.

## Monthly log
Add one file per run under `docs/content/diary-research/` (`YYYY-MM.md`) with this shape:

```
Run: YYYY-MM-DD · researcher · validation date
Sources read: <URL> (read YYYY-MM-DD) …
Events added / updated / unchanged: <event IDs, with what the organiser's page showed>
Not added (why): …
Open questions for the owner: …
```

## Limits of a static website
- Cancellations or changes after the last build are invisible until the next build.
- A page built on an event's last day still shows it until the next build.
- The diary's lead text ("Checked 30 October 2026", "This page does not update itself automatically yet") is legacy prose. Changing it is an editorial change for the register.
- Current state (16 Nov 2026): 7 events, all `reported` from the previous edition; no new research recorded yet. The first monthly run has not happened.
