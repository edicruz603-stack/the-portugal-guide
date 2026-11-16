# M3 — Editorial Trust & Content Quality: report

Prepared 16 Nov 2026. **Status: implemented and tested locally in five stacked PRs into `develop` (#3–#7); not merged, not deployed, no preview. `main` untouched.**

Baseline: `develop` = `3e5cc8c` (merge of PR #2, M2); `main` = `531c444`.

## 1. Delivered scope
| PR | Branch | Scope |
|---|---|---|
| #3 | `m3/editorial-register` | Approved editorial changes register (`src/content/editorial-changes.yaml`). Parity accepts only registered changes; stale, ambiguous, unproduced or unused entries fail. Rule C14 |
| #4 | `m3/trust-status` | Visitor trust information: the four approved labels, one line per status per card, dates only from `checked_on`. Disputed values suppressed (`unresolved_text`, rule C15). Covers events, bus prose and map popups/markers. 25 register entries |
| #5 | `m3/conflict-data` | Conflict data: 15 m coordinate tolerance (`agrees_with`); Monserrate entrance reopened with audit `history`; last ticket kept separate from last admission; PR8 approximate wording. Rule C16 |
| #6 | `m3/editorial-policy` | Candidate-place decisions; monthly event diary research policy; rule C17 (events checked only from the organiser's own page) |
| #7 | `m3/image-rights` | Owner photograph intake (`media/`), image-rights metadata (`commercial_basis`, licence verification, intake, replacement links), rule C18 |

New critical rules, each with failing fixtures:
- **C14** register validity;
- **C15** disputed values never shown;
- **C16** conflict claims / tolerance / status history;
- **C17** event verification;
- **C18** image rights and owner photos.

## 2. Final validation and tests (local, 16 Nov 2026, on `m3/image-rights`)
| Check | Result |
|---|---|
| astro check | 0 errors / 0 warnings |
| Vitest | 151/151 |
| Content validation (free) | 0 critical · 33 warnings (W03×25, W06×4, W02×4) · 91 pending |
| Production build | 5 pages |
| Commercial build | refused (4 × C11), no output |
| Internal links | 0 broken |
| html-validate | 0 problems |
| Editorial parity | 5/5 pages; registered changes 24/24 applied (1 about an ended event not applicable) |
| Inventory reconciliation | 40 records, 0 problems |
| Playwright 390/820/1440 incl. axe | 150 passed, 3 skipped by design; accessibility 24/24 |

Parity and builds were also run at 20 Nov 2026, 1 Jan 2027 and 4 Jan 2027: the register stays valid as events end. Expiry and the Europe/Lisbon date are unchanged.

## 3. Remaining unresolved editorial facts (11, in 4 groups)
- Gardens last entry (4 facts): hidden on the card behind "Sources differ — confirm with the operator".
- Monserrate coordinates a/b (2): marker warning; what b marks is not stated by any source.
- Monserrate park last ticket (3): not shown to visitors.
- PR8 length (2): not on the website; approved wording "Roughly 15 km (sources vary)".

Also confirm-first: Monserrate entrance and farmyard readings, and three approximate markers. Dataset: 110 facts (59 checked · 33 reported · 7 confirm-first · 11 unresolved).

## 4. Original image inventory and rights
- 19 owner photographs were received as downscaled previews and catalogued in `media/intake/2026-11-16-owner-sintra.yaml`. All are `awaiting-original`; no subject is confirmed; none is stored or used.
- None shows Pena, the Regaleira Initiation Well, the Moorish Castle or Monserrate, so none of the four Wikimedia images can be replaced yet. Their Commons pages could not be inspected from the workspace, so their licences remain unverified.

## 5. Commercial build readiness
**Not ready.** Blocked by the 4 Wikimedia images (C11). Unblocking needs either verified licences with a recorded basis (C18) or owner photographs (originals, confirmed subjects, written permission).

## 6. Deferred items and dependencies
- Owner originals for the 19 photos.
- Photos of the four blocked subjects.
- The first monthly diary run.
- A rebuild policy (not introduced).
- Candidate places: Viúva Gomes waits for expanded Colares content; Seteais is deferred.
- Merge order: #3 → #4 → #5 → #6 → #7 (each stacked on the previous).

## 7. Confirmation
No commits to `main`; no merge; no deployment, publication or preview. All work is on feature branches with PRs targeting `develop`.
