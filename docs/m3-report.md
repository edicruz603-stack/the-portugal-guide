# M3 — Editorial Trust & Content Quality: closure report

Prepared 16 Nov 2026 (M3 continuation, corrections and technical closure). **Status: implemented and tested; CI green on all five PRs; not merged, not deployed, no preview. `main` and `develop` untouched.**

## 1. Repository and branch state
- `main` = `531c444` and `develop` = `3e5cc8c`: unchanged.
- Stack (each PR targets `develop`, open, unmerged), integration order #3 → #4 → #5 → #6 → #7. Corrections were committed on the branch that owns them and propagated by merging each parent into its child (no force-push, no rebase).

| PR | Branch | Head | Closure commits |
|---|---|---|---|
| #3 | `m3/editorial-register` | `37230e8` | none needed (review: every visible change registered; parity applies only active entries and fails on unused ones) |
| #4 | `m3/trust-status` | `34c9b45` | `ab46353` gardens last entry; `34c9b45` "Checked {date}" = consultation date |
| #5 | `m3/conflict-data` | `a48ca53` | merge of #4; `7ae6d8c` explicit operator metadata + owner verification of NP coordinates; style fix |
| #6 | `m3/editorial-policy` | `7c4df74` | merge of #5; diary weekly checks + owner review |
| #7 | `m3/image-rights` | see PR | merge of #6; `453ac60` owner photo intake and image rights corrected; this report |

## 2. Owner photographs found
41 files received in the conversation = **40 distinct photographs** (one byte-identical duplicate): 11 on 6 Nov, 11 on 7 Nov, 19 on 16 Nov 2026. All are **reduced derivatives** (longest side 2576, 1600 or less; camera metadata removed). The **originals were supplied by the owner but are not accessible** in the build workspace; that is recorded, not treated as a blocker or as proof of non-supply. All 41 SHA-256 values match the received files. Manifests: `media/intake/2026-11-06-owner-sintra.yaml`, `2026-11-07-owner-sintra.yaml`, `2026-11-16-owner-sintra.yaml`.

## 3. Image-rights corrections
- Owner recorded as **declared photographer and rights holder** (16 Nov declaration; the 6 and 7 Nov statements kept as history). No owner photo is classified as Wikimedia or third-party. No resend requested.
- Separate assessments per photo: subject (visual / owner-confirmed / not identified), authorship, people, marks, property.
- Authorship marked *to reconfirm* only with documented evidence: c2a5c58f (= 9e8b7991), f971bd19, 98a81e8e.
- **Operators' internal rules** recorded as sources: Parques de Sintra *Regulation for Image Capture* and Quinta da Regaleira visitor rules.
- **Owner decision, 16 Nov 2026 (public-space photography), implemented:** these internal rules apply only with evidence of capture inside the managed premises. Public-space photos are not restricted because a monument appears in them; an unknown capture location stays unknown and is not a blocker. Capture evidence: inside = 50893677, 4cbc72fd (Monserrate park), c2a5c58f/9e8b7991 (Moorish Castle walls), Commons Initiation Well; outside = e0b52248, 1dce0e7a; all others unknown. The schema and C18 refuse a venue rule on an outside or unknown capture.
- C18 rewritten: no "original received" requirement; commercial use blocked only by `commercialBlockers()`; a venue rule (inside captures only) needs `site_authorisation_ref`; replacement candidates and derivative hashes checked.
- Four Wikimedia images reassessed individually: owner photos depict Pena (840a618c, dae4cca9), the Moorish Castle (c2a5c58f, 3e212ddd) and Monserrate (50893677, 4cbc72fd); **none depicts the Initiation Well**. They are recorded as `replacement_candidates`. Images are not replaced automatically (owner instruction); existing references are preserved. Details: `docs/content/image-rights.md`.

## 4. National Palace coordinates
Owner field verification on **16 Nov 2026** recorded on both facts (`verifications`: by owner, method field-verification, covering the other reading): both 38.797360, -9.390520 and 38.797417, -9.390528 lead to the courtyard of the National Palace (≈6.2 m apart). Both stay `checked` with `checked_on` 2026-11-15 (operator pages consulted), both provenances and `agrees_with` kept. It is not an operator confirmation. No marker changed. The 15 m tolerance still requires the same place and subject and the same operator, now compared through explicit `operator` metadata on sources.

## 5. Gardens last-entry fix
The canonical text in `places/national-palace-gardens.yaml` now reads "09:30–18:30; last entry: official sources differ". The website fact's quote was removed, so the card is linked to the conflict through `unresolved_text`; the render-time replacement is gone. The conflict stays unresolved (18:00 vs 17:30), and its sources and history are preserved. The previous wording is the register entry's `before`. C15 now fails on any quote of an unresolved fact, and on the place text pairing a last-entry claim with a disputed time. The regression test `tests/unit/gardens-last-entry.test.ts` covers data, validation and built output (proved to fail when "last entry 18:00" is reinserted into `dist`). No derived output (pages, scripts, map data) contains it.

## 6. Remaining technical findings
- **#4:** status labels are text (not colour alone); dates are editorial consultation dates (documented and tested); no direct-confirmation records exist. The checked line shows no explanation to visitors (the approved wording is "Checked {date}"); adding one would be a visible change for owner approval.
- **#5:** publisher inference replaced by explicit `operator` metadata (fixtures cover a different operator under the same ID prefix, and the same operator under different prefixes).
- **#6:** diary procedure now has weekly checks in December and the summer festival periods (the owner fixes those weeks), secondary sources for discovery only, history preserved, and a prepare-then-owner-review step. No scheduler.
- **#7:** see §3.

## 7. Tests (16 Nov 2026, on `m3/image-rights`; CI green on #4–#7)
| Check | Result |
|---|---|
| astro check | passed (0 errors) |
| Vitest | passed, 171/171 |
| Playwright (mobile/tablet/desktop) | passed, 150; 3 skipped by design (viewport-specific) |
| Accessibility (axe) | passed, 24/24 |
| Content validation (free) | passed: 0 critical · 33 warnings · 91 pending |
| Register / parity | passed, 24/24 active entries |
| Internal links / HTML validation | passed (87 internal links; external listed, not fetched) / passed |
| Locale consistency | N/A (single EN locale) |
| Free build | passed, 5 pages |
| Commercial build | blocked by external evidence: refused with 4 × C11 (the Wikimedia images) |

## 8. Commercial blockers (after the public-space decision)
The commercial build still refuses (4 × C11). The remaining issues are genuine:

| ID | Source | Rights status | Evidence | Issue | Action |
|---|---|---|---|---|---|
| `img.sintra.wm-pena-palace` | Wikimedia Commons (Pakycassano, CC BY-SA 4.0 as captioned) | licence unverified; no commercial basis | Commons page unreachable from the workspace | Licence not verified (capture location unknown: no venue rule) | Verify the licence on Commons, or replace with owner photo 840a618c/dae4cca9 (no documented blocker) |
| `img.sintra.wm-regaleira-well` | Wikimedia Commons (Husond, CC BY-SA 3.0) | licence unverified; no commercial basis | Subject lies inside the Quinta; visitor rules | Licence not verified; captured inside: Quinta authorisation needed | Verify licence + authorisation, or change the card image (no owner photo of the Well) |
| `img.sintra.wm-moorish-castle` | Wikimedia Commons (Ввласенко, CC BY-SA 3.0) | licence unverified; no commercial basis | Commons page unreachable | Licence not verified (capture location unknown) | Verify the licence, or replace: 3e212ddd has no documented blocker (weak at card size); c2a5c58f needs authorship reconfirmation and, being captured inside, the operator's authorisation |
| `img.sintra.wm-monserrate` | Wikimedia Commons (nborges, CC BY 2.0) | licence unverified; no commercial basis | Commons page unreachable | Licence not verified (capture location unknown) | Verify the licence; owner candidates 50893677/4cbc72fd were captured inside the park and would need the operator's authorisation |

Removed as artificial blockers: the venue rule on the three Commons photos of unknown capture location, on the owner's Pena photos, the National Palace views from above, the Regaleira road photos and the other public-space or unknown captures.

## 9. Owner decisions needed
1. Replace Pena with owner photo 840a618c (or dae4cca9)? It now has no documented blocker. This is a visible change that publishes the photo in the public repository, so it was not done automatically.
2. Verify the four Commons licences (a person with a browser; the workspace can't reach Commons).
3. Authorship reconfirmation, one line each: c2a5c58f/9e8b7991, f971bd19, 98a81e8e. Also confirm that the 16 Nov declaration covers the 6–7 Nov files.
4. Initiation Well card: Commons image (licence + Quinta authorisation) or another image.
5. Summer festival weeks for weekly diary checks.
6. Optional: a visitor explanation of "Checked {date}".

## 10. Completed vs proposed
**Completed and tested:** §3, §4, §5, §6 and the test run in §7. Pushed to the existing PR branches; CI green. **Proposed only:** every item in §9. **Not done:** merge, deploy, publication, preview, licence purchase, contact with operators.
