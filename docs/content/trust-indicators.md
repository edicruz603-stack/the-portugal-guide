# Trust information for visitors (M3)

Code: `src/lib/trust/trust.ts` (wording, grouping, card linkage), `src/components/TrustNote.astro`, `src/lib/trust/prose.ts`, map popups in `src/lib/map/leaflet-adapter.ts`. The four editorial statuses are unchanged; only their visitor wording is new (owner approval, M3 brief §3).

| Status | Visitor wording | Presentation |
|---|---|---|
| checked | `Checked {date}` — date = the fact's own `checked_on` (oldest on the card) | quiet text line, no badge, no disclosure |
| reported | `Not yet re-checked` | disclosure: where it came from; "It may well be correct — confirm before you rely on it" |
| confirm-first | `Confirm first` | disclosure: no reliable published source yet |
| unresolved | `Sources differ — confirm with the operator` | disclosure; **the canonical text never states the disputed value**: it carries the fact's `unresolved_text` instead, which is also how the card is linked to the conflict |

**Where it appears:**
- **Place cards:** for the facts whose `quote` is in that card's text. One line per status, listing what it concerns ("price, opening hours"), never one warning per value.
- **Page prose:** sentences registered in `src/lib/trust/prose.ts` (e.g. bus 434).
- **Event diaries:** one line about the dates, addressed to the organiser.
- **Map markers:** a popup line; the marker's accessible name includes the status when the position is not checked; a dashed ring marks positions that are not checked.

**Rules:**
- No date is shown unless the facts carry `checked_on`; the code refuses to render a checked line without one.
- **C15:** an `unresolved` fact may not have a `quote` (the canonical text would state a disputed value), and the place's editorial text may not pair a last-entry/admission/ticket claim with any time from the conflict group. `unresolved_text` must say the sources differ or vary and must not show any time from the group; it is only allowed while the fact is unresolved.
- **Why the canonical text, not render-time replacement (M3 closure, 16 Nov 2026):** the first M3 implementation replaced the quote at render time, which left "last entry 18:00" in `places/national-palace-gardens.yaml` and in any other consumer of the raw content. The text itself now says "last entry: official sources differ"; the previous wording is preserved in the editorial changes register (`change.sintra.gardens-last-entry-suppressed`) and in the fact's note. Regression test: `tests/unit/gardens-last-entry.test.ts` (data, validation and built output).
- Status is always written in words; the small shapes are decorative (`::before`), not the message.
- Disclosures are native `<details>`, so they work with keyboard, screen readers and touch. Summaries are at least 44 px high.
- Every visible change is recorded in the editorial changes register.
- Register entries about an event stop applying once the event has ended (its block is hidden by date).
