# Trust information for visitors (M3)

Code: `src/lib/trust/trust.ts` (wording, grouping, suppression), `src/components/TrustNote.astro`, `src/lib/trust/prose.ts`, map popups in `src/lib/map/leaflet-adapter.ts`. The four editorial statuses are unchanged; only their visitor wording is new (owner approval, M3 brief §3).

| Status | Visitor wording | Presentation |
|---|---|---|
| checked | `Checked {date}` — date = the fact's own `checked_on` (oldest on the card) | quiet text line, no badge, no disclosure |
| reported | `Not yet re-checked` | disclosure: where it came from; "It may well be correct — confirm before you rely on it" |
| confirm-first | `Confirm first` | disclosure: no reliable published source yet |
| unresolved | `Sources differ — confirm with the operator` | disclosure; **the disputed value is replaced** by the fact's `unresolved_text` |

**Where it appears:**
- **Place cards:** for the facts whose `quote` is in that card's text. One line per status, listing what it concerns ("price, opening hours"), never one warning per value.
- **Page prose:** sentences registered in `src/lib/trust/prose.ts` (e.g. bus 434).
- **Event diaries:** one line about the dates, addressed to the organiser.
- **Map markers:** a popup line; the marker's accessible name includes the status when the position is not checked; a dashed ring marks positions that are not checked.

**Rules:**
- No date is shown unless the facts carry `checked_on`; the code refuses to render a checked line without one.
- **C15:** a quoted `unresolved` fact must have `unresolved_text`. That text must say the sources differ or vary, must not contain the quote, and must not show any time from the conflict group. `unresolved_text` is only allowed while the fact is unresolved.
- Status is always written in words; the small shapes are decorative (`::before`), not the message.
- Disclosures are native `<details>`, so they work with keyboard, screen readers and touch. Summaries are at least 44 px high.
- Every visible change is recorded in the editorial changes register.
- Register entries about an event stop applying once the event has ended (its block is hidden by date).
