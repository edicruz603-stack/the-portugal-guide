# Conflict groups and coordinate tolerance (M3)

Owner decisions of 16 Nov 2026 (M3 brief §5–6), applied in data. Evidence is in each fact's `note` and `history`. Every original value and source is kept.

| # | Group / facts | M3 outcome | Status now |
|---|---|---|---|
| 1 | `national-palace-gardens-last-entry`: 18:00 on three operator pages, 17:30 on the Essential Visit page, 18:00 on the previous website | No value chosen. The visible card shows "last entry: official sources differ" plus "Sources differ — confirm with the operator" (`unresolved_text`, rule C15) | 4 facts **unresolved** |
| 2 | `monserrate-coordinates`: a (EN375 road location, operator main GPS point; the map marker) and b (listed with the Colares access advice during road works) | Re-read on 15 Nov; no source states what b marks, so it is **not** modelled as a separate point. Both notes record the evidence. The marker popup shows the warning | 2 facts **unresolved** |
| 3 | `monserrate-park-last-ticket`: 17:30 (monument page) vs 18:00 (ticket office; opening-times page added from the 15 Nov reading) | Last ticket stays disputed. Last **admission** 18:00 is a different claim, kept in `hours-park` (checked). Rule C16a forbids mixing claims in one group | 3 facts **unresolved** |
| 4 | National Palace coordinates: monument page vs ticket office, 6.2 m apart, same operator | Approved **15 m tolerance** (`agrees_with`, rule C16b). Both values kept, both checked (re-read 15 Nov), conflict group removed. The map marker is unchanged | 2 facts **checked** |
| 5 | `colares-pr8-length`: 15.5 km vs about 15 km (municipal tourism); secondary sources 14–16.6 km | Precise distance unresolved. Approved visitor wording, if needed: `Roughly 15 km (sources vary)` (`unresolved_text`). PR8 is not on the website today | 2 facts **unresolved** |

**Monserrate entrance (brief §6).**
- `fact.sintra.monserrate.coordinates-entrance` was `checked` (ticket-office page, 11 Nov). The operator's How to get there page gives the identical value for the **Farmyard of Monserrate**, 850 m east of the entrance.
- The fact is reopened as **confirm-first**. Its `history` records the previous status, the previous `checked_on`, the reason and the approval. Value and source are unchanged.
- The farmyard reading is recorded as `fact.sintra.monserrate.coordinates-farmyard` (confirm-first, new source `src.parques-de-sintra.how-to-get-there`).
- Neither value is used by the map or shown as a visitor entrance.

**Rule C16** (critical, with failing fixtures):
- **a.** Members of a conflict group make the same claim: same kind and subject.
- **b.** `agrees_with` applies only between coordinate facts for the same place and subject, both from the same operator (`src.<operator>.*`, kind `operator`), at most 15 m apart, outside any conflict group.
- **c.** `history` is in date order with no future dates; each entry changes the status; leaving `checked` records `previous_checked_on`; the last entry is the current status.

Result (16 Nov 2026): 4 open conflict groups (group 4 closed by the tolerance rule), 11 unresolved facts; 110 facts in total (59 checked · 33 reported · 7 confirm-first · 11 unresolved).
