# Image rights and owner photography (M3, corrected at M3 closure, 16 Nov 2026)

> **Owner decision, 16 Nov 2026 — public-space photography (approved; not to be reopened without new, specific evidence).**
> Photos taken from public streets, roads, squares and other places outside a monument's managed premises are not blocked, and do not need the operator's internal photography authorisation, merely because the monument appears in them. The photographer's copyright is distinct from the operator's property-management rules. Internal rules (e.g. the Parques de Sintra regulation) apply only with evidence that the photo was captured inside the managed premises; an unknown capture location is recorded as unknown, never assumed to be inside. People, third-party works, trademarks and privacy are assessed separately. No authorisation is requested for public-space photos.

## Principles
- **The owner is the declared photographer and rights holder** of the photographs he has supplied (declaration, M3 continuation brief, 16 Nov 2026). Owner photographs are never classified as Wikimedia or third-party material.
- **Original vs derivative.** The files that reached the build workspace are *reduced derivatives* (longest side 2576 or 1600 px or smaller; camera metadata removed). The originals were supplied by the owner but are **not accessible here**. Neither fact is a blocker, and a missing original is never treated as proof that it was not supplied. Nobody is asked to resend.
- **Metadata unverified.** With no camera metadata in the accessible copies, capture date, place and device are recorded as "not known (unverified)"; nothing is invented.
- **Separate assessments** per photo: subject (visual identification or owner-confirmed), authorship, people, marks (trademarks and signage), and property (operators' image rules).
- **The commercial build is blocked only by documented issues** (`commercialBlockers` in `src/lib/media/intake.ts`, rule C18): documented authorship doubt, subject not identified, identifiable people, or evidence of capture inside premises whose internal rule needs an authorisation that is not recorded. Incidental shop signage is recorded for the editor's judgement but is not a blocker.

## Operators' image rules (documented 16 Nov 2026)
| Rule | Source (`sources.json`) | What it says |
|---|---|---|
| Parques de Sintra, *Regulation for Image Capture* (cover: February 2022; approval line: 18 Feb 2021) | `src.parques-de-sintra.image-capture-regulation` | Art. 1(1): applies to any image capture relating to the heritage it manages. Art. 1(4): private use allowed; commercial or public use requires prior authorisation. Art. 3: written request ≥ 15 days ahead (comunicacao@parquesdesintra.pt). Art. 5 / Annex 1: fees per hour and site. Sites include Pena, the National Palace of Sintra, Monserrate, the Capuchos, the Moorish Castle and the Cabo da Roca lighthouse (shared). |
| Quinta da Regaleira visitor rules | `src.regaleira.visitor-rules` | Public use of the Quinta's image, whatever its aim, requires prior authorisation from Fundação Cultursintra FP. |

These are internal rules of the managed premises, separate from copyright. Under the owner decision above they apply **only to photos captured inside the premises** (`capture: inside` with `evidence` in the intake; `capture_location: inside` + `capture_evidence` + `site_rule` in `images.json`); commercial use of such a photo then needs `site_authorisation_ref` (C18). The schema refuses a rule on an `outside` or `unknown` capture.

Capture evidence recorded (16 Nov 2026): **inside** — 50893677 and 4cbc72fd (Monserrate park: palace terrace path, lawn), c2a5c58f/9e8b7991 (on the Moorish Castle walls), and the Commons Initiation Well photo (the well lies within the Quinta). **Outside** — e0b52248, 1dce0e7a (Regaleira from the public road). **Unknown** — everything else, including the Pena photos, the National Palace views from above, the Regaleira terrace views, 3e212ddd and the other three Commons images.

## Photo intake (41 files, 40 distinct photographs)
Manifests: `media/intake/2026-11-06-owner-sintra.yaml` (11), `2026-11-07-owner-sintra.yaml` (11, one byte-identical duplicate of a 6 Nov file), `2026-11-16-owner-sintra.yaml` (19). Every entry records the reduced derivative's size and SHA-256; `tests/unit/photo-intake.test.ts` checks them against the received files whenever those are present.

| Group | Files | Subject (identification) | Notes |
|---|---|---|---|
| Pena Palace | 840a618c (O-06), dae4cca9 (O-07) | owner-confirmed (6 Nov selections) | Candidates for `img.sintra.wm-pena-palace`. Depict a Parques de Sintra site. |
| Regaleira | 468ee244 (O-02), 557cbd39 (O-03), e0b52248 (O-04), 1dce0e7a | owner-confirmed / visual | Regaleira visitor rules apply. 1dce0e7a not suitable (lens obstruction). None shows the Initiation Well. |
| Monserrate | 50893677 (O-08), 4cbc72fd (N-06), 98a81e8e (N-07) | owner-confirmed / visual | Candidates for `img.sintra.wm-monserrate`: 50893677, 4cbc72fd. Taken inside the park. |
| Moorish Castle | c2a5c58f (O-09; 9e8b7991 is the same file), 3e212ddd (N-08) | owner-confirmed / visual | Candidates for `img.sintra.wm-moorish-castle`. |
| National Palace from above | 1000077318–1000077326 (9) | visual | Viewpoint not identified. |
| Cabo da Roca | bf23dc99 (N-01), f971bd19 (N-02), 5dc26aba | visual | The column monument is not a listed managed site; the lighthouse is. |
| Streets, houses, details | 16 Nov streets (8), Villa Nogueiras (2), 77fe1abc (N-03), 0a5cdc9f, c66ba5cb, d89b070a, 8ab381ad (O-11), c1f4a842, b146a5ce | visual / not identified | Locations not established; 77fe1abc has people to decide on. |

**Authorship to reconfirm (documented evidence, not reclassification):** c2a5c58f / 9e8b7991 (heavy HDR, 651×479; held in the v0.8 register "until unedited original and source confirmed"), f971bd19 (aerial viewpoint, 720×720), 98a81e8e (elevated night view, 623×413). The owner said on 7 Nov 2026 that not every supplied photograph is necessarily his; each of these needs a one-line owner confirmation, not a resend.

## The four Wikimedia images: individual reassessment
| Image | Owner photo depicts the subject? | Owner candidate's documented blockers | Replaced now? |
|---|---|---|---|
| `img.sintra.wm-pena-palace` | **Yes**: 840a618c, dae4cca9 | **None** (capture location unknown → no venue rule) | No: no automatic replacement; owner to decide |
| `img.sintra.wm-regaleira-well` | **No** (no supplied photo shows the Initiation Well) | — | No |
| `img.sintra.wm-moorish-castle` | **Yes**: c2a5c58f, 3e212ddd | c2a5c58f: authorship to reconfirm + captured inside (operator authorisation). 3e212ddd: none (quality weak at card size) | No |
| `img.sintra.wm-monserrate` | **Yes**: 50893677, 4cbc72fd | Both captured inside Monserrate park: operator authorisation needed | No |

The candidates are recorded in `images.json` (`replacement_candidates`, checked by C18). When a replacement is approved: add a new image record with `rights_category: owner`, `intake`, `commercial_basis: owner-original`, `permission_ref` (the owner declaration) and, only for a capture inside premises with an internal rule, `capture_location`/`capture_evidence`, `site_rule` and `site_authorisation_ref`; store the web derivative under `public/` and record it in the manifest's `derivatives` (path, size, SHA-256, edits); link old and new with `replaces` / `replaced_by`; record the visible change (`kind: image`) in the editorial changes register.

## Clearance options for the Wikimedia files (unchanged)
Verify each licence on its Commons file page (licence, author and requested attribution, warning templates), record `licence_url`, `licence_verified_on` and `status: verified`, and observe share-alike for adaptations. For the three Commons images with unknown capture location, a verified licence is enough on the rights side. For the Initiation Well (captured inside the Quinta), the Quinta's authorisation is also needed, or a different image.
