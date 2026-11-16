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
- **Documented site rules** added as sources: Parques de Sintra *Regulation for Image Capture* (commercial or public use requires prior authorisation) and Quinta da Regaleira visitor rules (any public use of the Quinta's image requires prior authorisation).
- C18 rewritten: no "original received" requirement; commercial use blocked only by `commercialBlockers()`; `site_rule` needs `site_authorisation_ref`; replacement candidates and derivative hashes checked.
- Four Wikimedia images reassessed individually: owner photos depict Pena (840a618c, dae4cca9), the Moorish Castle (c2a5c58f, 3e212ddd) and Monserrate (50893677, 4cbc72fd); **none depicts the Initiation Well**. They are recorded as `replacement_candidates`. No visible image was swapped (see §9). Details: `docs/content/image-rights.md`.

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

## 8. Commercial blockers
| ID | Source | Rights status | Evidence | Issue | Action |
|---|---|---|---|---|---|
| `img.sintra.wm-pena-palace` | Wikimedia Commons (Pakycassano, CC BY-SA 4.0 as captioned) | licence unverified; no basis | Commons page unreachable from the workspace; Parques de Sintra regulation | Licence not verified; site rule needs authorisation | Owner decision: swap to 840a618c/dae4cca9 and/or request Parques de Sintra authorisation |
| `img.sintra.wm-regaleira-well` | Wikimedia Commons (Husond, CC BY-SA 3.0) | licence unverified; no basis | No owner photo shows the Well; Regaleira visitor rules | Licence not verified; site rule needs authorisation | Verify licence and request Fundação Cultursintra authorisation, or change the card's image (owner decision) |
| `img.sintra.wm-moorish-castle` | Wikimedia Commons (Ввласенко, CC BY-SA 3.0) | licence unverified; no basis | Parques de Sintra regulation; c2a5c58f authorship evidence | Licence not verified; site rule; best owner candidate needs a one-line authorship reconfirmation | Owner reconfirms c2a5c58f, or chooses 3e212ddd; authorisation |
| `img.sintra.wm-monserrate` | Wikimedia Commons (nborges, CC BY 2.0) | licence unverified; no basis | Parques de Sintra regulation; 50893677 taken inside the park | Licence not verified; site rule needs authorisation | Swap to 50893677 and request authorisation, or verify licence + authorisation |

## 9. Owner decisions needed
1. **Operator authorisations.** Whether to request Parques de Sintra (≥ 15 days ahead; fees per Annex 1) and Fundação Cultursintra authorisation for commercial and public use, or take legal advice on the regulation's reach. This affects owner photos and Commons photos alike, and costs money, so nothing was requested.
2. **Swapping images on the website now** (Pena → 840a618c; Monserrate → 50893677): a visible change that publishes the owner's photos in a public repository and on a public page, inside the scope of the operator rules above.
3. **Authorship reconfirmation**, one line each: c2a5c58f/9e8b7991, f971bd19, 98a81e8e. Also confirm that the 16 Nov declaration covers the 6–7 Nov files, given the 7 Nov statement about contributors.
4. Initiation Well card: keep the Commons image (after verification) or use an owner Regaleira palace photo.
5. Summer festival weeks for weekly diary checks.
6. Optional: a visitor explanation of "Checked {date}".

## 10. Completed vs proposed
**Completed and tested:** §3, §4, §5, §6 and the test run in §7. Pushed to the existing PR branches; CI green. **Proposed only:** every item in §9. **Not done:** merge, deploy, publication, preview, licence purchase, contact with operators.
