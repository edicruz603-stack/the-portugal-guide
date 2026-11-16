# Seasonal event diary — research procedure (M3)

Owner policy, 16 Nov 2026 (M3 brief §8). Rules enforced in code are marked **[rule]**.

## Cadence
- **Monthly**, in the last week of each month: research the next 6–8 weeks.
- **Weekly lightweight checks in December and in the summer festival periods** (M3 closure brief, 16 Nov 2026): once a week, re-read the organiser page of every listed event that falls in the next 2–3 weeks, and look for cancellations, sold-out notices, changed dates or newly announced events. The owner fixes each year which summer weeks count as festival periods; until then, a weekly check is due in any summer week in which a listed event takes place. A weekly check uses the same evidence rules as the monthly run and is logged the same way (`YYYY-MM-DD-weekly.md`).
- Before any release build: check every listed event's dates against today's validation date.
- **No automatic rebuild schedule exists or is introduced in M3.** The site is static, so an event disappears from the pages only when the site is rebuilt (see "Limits").

## Sources, in order of authority
1. **The organiser's own published page** for the event (the venue's or producer's site, or the municipality for its own events). This is the only basis for `checked` **[rule C17]**.
2. Official institutional calendars, used to discover events and as primary sources when the institution is the organiser:
   - Parques de Sintra agenda — https://www.parquesdesintra.pt/en/agenda/
   - Quinta da Regaleira agenda — https://www.regaleira.pt/en/agenda
   - Câmara Municipal de Sintra agenda — https://cm-sintra.pt/agenda (per-event pages; includes Centro Cultural Olga Cadaval, MU.SA and the municipal museums)
   - Agenda Cultural de Sintra and Visit Sintra events, for discovery
3. Aggregators, press and other secondary sources: **for discovery only**, never as evidence. An event found there is not added until the organiser's page has been read.

## Minimum evidence before an event is `checked` [rule C17]
- The source is in `src/content/sources.json` with its URL, and is the organiser's own page (`kind: operator` or `official`).
- `provenance: official-page-read`, `observed_on` (when found) and `checked_on` (when the organiser's page was read). Both dates are on or before the validation date, and `checked_on` ≥ `observed_on`.
- `starts_on` / `ends_on` (and `time` when given) match the organiser's page; record anything still to confirm (booking, sessions, prices) in `note`.
- Anything less stays `reported`, and visitors see "Not yet re-checked". `checked_on` on a non-checked event is an error.

## Never
- Invent or assume recurring dates ("it happened last year, so it will happen again").
- Change the dates of an existing event without the organiser's published evidence. Record the new reading, with its source and `observed_on`.
- Overwrite history. A changed date, a cancellation or a corrected status is a new reading with its own source and date; the previous values stay in the event's `note` or the run log.
- Publish directly. See "Owner review" below.
- Delete ended events. They stay in `events/` and in their lists as history. The inclusive rule hides them from the first build after their last day (`src/lib/content/dates.ts`, Europe/Lisbon validation date), and W02 reports them; W07 reports a diary with nothing left to show.

## Owner review before publication
Every run (monthly or weekly) **prepares** the changes and stops:
1. Content edits (`events/*.yaml`, `lists/*.yaml`, `sources.json`) and the run log go on a feature branch from `develop`, in a pull request.
2. `npm run validate`, the unit tests and the parity check must pass. Any visible change is recorded in the editorial changes register.
3. The PR description lists, per event: added / updated / unchanged / not added, the organiser page read and its date.
4. **The owner reviews and approves the PR.** Nothing is merged, built or published by the research run itself. No scheduler, automatic rebuild or automatic publication is introduced.

## Run log
Add one file per run under `docs/content/diary-research/` (`YYYY-MM.md` for the monthly run, `YYYY-MM-DD-weekly.md` for a weekly check) with this shape:

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
- Current state (16 Nov 2026): 7 events, all `reported` from the previous edition; no new research recorded yet. The first monthly run has not happened; the first December weekly checks are due from 1 Dec 2026, subject to owner approval of each run's PR.
