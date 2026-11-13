# M2 — Sintra content model: change report

Branch `feature/m2-sintra-content-model` → `develop`. Prepared 11 November 2026 for ChatGPT's technical review and owner approval.
**Status: implemented and tested locally; CI runs on the PR. Not deployed. `main` and production untouched. M3 not started.**

Full generated reports: `docs/content/sintra-content-status-2026-11-13.md` (snapshot; pending items by category in §6); regenerated on every run as `dist-reports/content-status.md`.

## 1. What changed

| Before (Phase 1) | After (M2) |
|---|---|
| Places hand-written in 6 independent lists across 4 pages + a TypeScript map file | One YAML record per place in `src/content/destinations/sintra/places/` (40 places) |
| 54 name variants with no link between them (corrected 13 Nov; first reported as 55) | Each variant is an alias on exactly one place; immutable IDs `place.sintra.<key>` |
| Facts only inside prose, with one date for the whole page | 108 facts in `facts/<place>.yaml`, each with source, `observed_on`, status, provenance; `checked_on` only when genuinely verified |
| Two hard-coded event diaries | 7 events in `events/`, each with dates, venue, source and both editions' wording |
| Pages carried data | Pages select through 12 lists in `lists/` and render with 8 components |

Visible output is unchanged: identical text, links, images, link targets, filter/search attributes and map coordinates (evidence §7).

## 2. Model (multi-destination by design)

```
src/content/
  sources.json  images.json  ids.lock.json                    global registers
  destinations/<destination>/
    destination.yaml  zones/  places/  facts/  events/  lists/
src/content.config.ts          Astro collections (glob over all destinations; entry ID = record id)
src/lib/content/schemas.ts     Zod schemas shared by Astro and the validator
src/lib/content/repository.ts  the only read path for pages (placesInList, eventsInList, mapMarkers)
```

- **IDs** are stored in each record and locked in `ids.lock.json` (214 IDs). They are never derived from names, translations, titles, file names or URL slugs; Astro's `generateId` returns the record's own `id`. Renaming or removing a locked ID fails the build; retiring one requires an entry under `retired` (optionally `replaced_by`). `npm run ids:lock` adds new IDs and never removes any.
- **Destinations:** every record carries `destination`, IDs are scoped `{type}.{destination}.{key}`, and collections glob `destinations/*/…`. Adding Lisbon, Porto or Ribatejo means adding a folder; no schema, component or validator change.
- **Editorial vs facts vs presentation:** editorial texts are stored per publishing context (`directory`, `local`, `field_guide`, `field_guide_tickets`, `food_card`, `map_link`, `romantic`) as plain text with only `**strong**`/`*emphasis*`. HTML is rejected by the schema. Facts live in separate files; a fact can `quote` the exact editorial fragment that states it (verified by rule C09). Markup lives only in `src/components/places/*` and `src/components/events/*`.
- **Fact dates (requirement A):** `observed_on` = when the value was found; `checked_on` = when it was genuinely verified, allowed **only** on status `checked`. Values from the previous website or from listings can never be `checked` (rule C05).
- **Conflicts:** competing values share a `conflict_group` and must all stay `unresolved` (rule C06). Nothing is chosen.

## 3. Validation levels and rules

`npm run validate` (run by `npm run build`, so it blocks every production build):

| Code | CRITICAL rule (each has a failing fixture in `tests/unit/validation.test.ts`) |
|---|---|
| C01 | Schema: malformed IDs, missing source / observed_on / status, HTML in editorial text |
| C02 | Duplicate IDs across all record types; two fact files for one place |
| C03 | Locked ID renamed or removed (immutability); retired ID still in use |
| C04 | Broken references: destination, zone, part_of, image, official-name source, map coordinate fact, fact source, event place/source, list items and their contexts |
| C05 | `checked` without `checked_on`; `checked_on` on non-checked facts; checked from secondary/own-edition sources; website values marked checked; future dates |
| C06 | Conflicts silently resolved; conflict group with fewer than two facts; unresolved without group |
| C07 | Duplicate place (name/alias shared by two IDs) |
| C08 | Coordinates outside mainland Portugal; sourced coordinates more than 15 m from their published DMS or missing it |
| C09 | A fact's quote not found verbatim in its place's editorial text |
| C10 | Page with hard-coded place cards, place-card markup, map links to known places, or place IDs |
| C11 | Page image without rights record; contributor image without written permission; uncleared image in commercial mode |
| C12 | Event ending before it starts |
| C13 | Homepage card linking to a missing page |

WARNING (never blocks): W01 fact past its review window · W02 ended event still in an active list (unlisted ended events are history) · W03 place without coordinates · W04 stale source · W05 new ID not yet locked · W06 uncleared image (free mode).
EDITORIAL PENDING: P01 unverified facts/events · P02 no zone · P03 no reader-facing text · P04 no facts · P05 image rights pending · P06 map marker on unverified coordinates.

Current dataset: **0 critical · 29 warnings · 91 pending**.

## 4. Data entered

- **40 places**: the 34 on the website plus the PDF chapters not yet on the site — São Pedro de Canaferrim (part of the Moorish Castle), Colares, Adega Regional de Colares, Cabo da Roca and its lighthouse, Museu do Bonsai. Kinds and zones use the website's own zone labels; three places whose location is not established have no zone (pending).
- **108 facts** on 24 places — checked 58 · reported 33 · confirm-first 5 · unresolved 12. Provenance: 52 read on official pages on 11 Nov 2026, 37 from the PDF fact ledger (read 7 Nov, original status kept), 19 from the previous website (Reported).
- **36 sources** with URL, kind and date seen.
- **7 events** (3 already ended → warnings).

## 5. Findings while entering data (all preserved as data, nothing chosen)

1. **National Palace gardens, last entry** — operator pages disagree: 18:00 (ticket office, opening-times page) vs 17:30 (Essential Visit page). The website's 18:00 is kept in the same conflict group.
2. **Monserrate coordinates** — the English monument page lists two unlabelled values ~280 m apart. The Phase 1 marker matches the visitor map / Portuguese page value; both kept unresolved. The ticket office gives the park entrance separately (not a conflict).
3. **Monserrate park last ticket** — 17:30 (monument page) vs 18:00 (ticket office).
4. **National Palace coordinates** — monument page vs ticket office differ by ~6 m; both kept.
5. **Colares PR8 length** — 15.5 km vs about 15 km on two Visit Sintra pages.
6. **Moorish Castle** — the two "conflicting" coordinates in the M2 plan are the castle and its entrance: recorded as two facts with different subjects, not a conflict.
7. **Museu do Bonsai hours** — the plan expected a conflict, but the PDF ledger did not record the other listing's values, so the hours are `confirm-first` instead.
8. **Adega Regional de Colares** — hours, address, phone and booking rule found on Visit Sintra; kept Reported because Visit Sintra is not the operator (same decision as the PDF).
9. On 11 Nov 2026 the operator's site showed a banner "Monuments closed" (one-day notice); not recorded as a fact.

## 6. The six lists, eliminated

| Former hard-coded list (page) | Items | Now |
|---|---|---|
| Discoveries directory (`sintra-discoveries`) | 30 | `list.sintra.directory` → `DirectoryPlaceCard`; counter computed from the list |
| Local discoveries free / food (`sintra-local-discoveries`) | 8 + 10 | `list.sintra.local-free`, `list.sintra.local-food` → `LocalPlaceItem` |
| Field guide cards (`sintra`): highlights, free, Regaleira ticket, food | 4 + 6 + 1 + 4 | `list.sintra.field-guide-highlights`, `-free`, `-tickets` → `FieldGuideCard`; `-food` → `FoodCard` |
| Field guide map links (`sintra`) | 14 | `list.sintra.map-links` → `MapLink` |
| Interactive map (`src/data/sintra-map.ts`, deleted) | 9 | `list.sintra.map` → `mapMarkers()`; coordinates from coordinate facts |
| Romantic guide place cards | 6 | `list.sintra.romantic` → `RomanticPlaceCard` |
| (Events) local diary / directory diary | 6 + 4 | `list.sintra.events-local`, `list.sintra.events-directory` |

Enforced by rule C10 and `tests/unit/single-source.test.ts` (no place IDs or place-name lists anywhere in `src/` outside the dataset; documented exceptions: the ID lock, and the legacy planner's advice sentences until M6).

Cards that are not about one place (itineraries, the multi-monument tickets card, romantic advice cards, route ideas) remain page prose until M3/M4.

## 7. Evidence (local run, 11 Nov 2026)

| Check | Result |
|---|---|
| astro check | 0 errors / 0 warnings / 0 hints |
| Vitest | 77 / 77 (every critical rule fails on a fixture; dataset passes; single-source; map preservation; planner golden 1,620 combinations) |
| Content validation | 0 critical · 29 warnings · 91 pending |
| Build | 5 pages |
| Internal links | 87, 0 broken |
| html-validate | 0 problems |
| Editorial parity | 5/5 pages identical text, links, images, link targets and directory search/filter attributes (1 listed Phase 1 exception) |
| Map | 9 markers at exactly the Phase 1 coordinates (`tests/unit/m2-preservation.test.ts`) |
| Playwright (390 / 820 / 1440) + axe | 132 passed, 3 skipped by design |

## 8. Notes for review

- The marker labelled "Palácio Nacional de Sintra · gardens (free entry)" belongs to `place.sintra.national-palace-gardens` (its label is about the gardens) and uses the palace's coordinate fact (its `part_of` parent). Same coordinates as before.
- One-off migration scripts are kept for reproducibility: `scripts/migrations/m2-extract-sintra.mjs` (+ `m2-place-meta.json`), `m2-rewrite-pages.py`, `m2-facts-entry.py`, `m2-events-entry.py`. The YAML is now the source of truth. `scripts/port-legacy.mjs` is retired (refuses to run) because it would overwrite the data-driven pages.
- New dev dependency: `yaml` 2.9.1 (ISC). No runtime dependency added.

## 9. Independent review corrections (11 Nov 2026)

**1 · Publication mode.** Findings: `npm run build` passed `--production`, which the validator ignored; any `PUBLICATION_MODE` other than exactly `commercial` (including a typo) silently became free; and a direct `npx astro build` skipped validation entirely.
Corrections:
- `src/lib/validation/mode.ts` defines the contract: `free` (the default) or `commercial`, from `PUBLICATION_MODE` and/or `--mode=`. Values are trimmed and case-insensitive. An unknown value, a bare `--mode`, the old `--production` flag, or an argument that contradicts the environment variable exits 2. The resolved mode and its origin are always printed.
- `astro.config.mjs` adds a build hook (`astro:build:start`) that runs the validator, so every `astro build`, however it is started, is validated. `npm run build` is now `astro build`.
- New scripts: `build:commercial` and `validate:commercial`.
- Commercial reports are written as `*-commercial.*`, so they never overwrite the free-edition reports.
- CI gets a new step that asserts a commercial `astro build` fails, and fails because of C11.
- Free behaviour is unchanged: the same rules, warnings and outcome (0 critical).

**2 · Map coordinate semantics.** Finding: `precision` was `approximate` only for confirm-first; unresolved coordinates (National Palace gardens, Monserrate) and any reported coordinates were labelled `official`.
Corrections:
- `CoordinatePrecision` and `precision` are replaced by `coordinates: { status, fact, source, provenance, checkedOn?, conflictGroup? }`, copied 1:1 from the coordinate fact by `src/lib/map/markers.ts` (a pure function used by the repository).
- `checked` requires `checked_on`, and `unresolved` requires a `conflict_group`; otherwise the build fails.
- Tests cover each of the four statuses and the real dataset: 4 checked, 2 unresolved, 3 confirm-first.
- Coordinates are unchanged (`m2-preservation.test.ts`).

**3 · Event freshness (editorial change — superseded on 13 Nov, see §10.4: lists restored, expiry is now automatic).** Three events had ended:
- `masmo-mystery-afternoon` (31 Oct);
- `taxi-concert` (6 Nov);
- `colares-wine-journey` (7 Nov).

Decision:
- They were removed from the active lists (`events-local`: −2; `events-directory`: −3). Their records stay in `events/` as history.
- W02 now warns only for an ended event that an `event:*` list still publishes.
- `scripts/check-parity.mjs` lists the five removed legacy HTML blocks verbatim (`ALLOWED_REMOVED`). Each must exist exactly in the legacy page, and is cut from the legacy side before every comparison. Nothing else on those pages may differ.

Next: `mutatis-mutandis` ends 15 Nov 2026 and must leave `events-local` after that date (W02 will flag it).

**Evidence (local, 11 Nov 2026):** see §7 for the base results.
- astro check: 0 errors.
- Vitest: 77/77.
- Validation:
  - free: 0 critical · 29 warnings · 91 pending;
  - commercial: 4 × C11, exit 1;
  - invalid mode: exit 2.
- Build: 5 pages; `astro build` in commercial mode stops before generating pages.
- Links: 87 internal, 0 broken.
- html-validate: 0 problems.
- Parity: 5/5 (1 text exception and 5 removed legacy blocks).
- Playwright and axe: 132 passed, 3 skipped by design.

## 10. Final review (13 Nov 2026)

Branch head before this round: `7956212` (owner's doc refresh on top of `0e92351`). Status: **implemented and tested locally; CI runs on the PR. Not merged, not deployed; `main` untouched; M3 not started.**

### 10.1 Summary of changes

| Area | Change |
|---|---|
| Events | Expiry is automatic: `eventsInList()` shows a listed event up to and including its last day (`src/lib/content/dates.ts`). The three event-list edits of §9.3 are reverted, so the lists are again exactly the M2 migration's editorial selection (`git diff aaca95e -- src/content/destinations/sintra/lists/` is empty). |
| Date | One "validation date" for the whole system: `VALIDATION_DATE`, else today in Europe/Lisbon (previously UTC). Invalid dates exit 2. The build hook fixes it once per build for the validator and the pages. |
| Validator | W02 = listed event that has ended (hidden automatically); new W07 = event list with nothing left to show. |
| Parity | Ended events are cut from the legacy side by the validation date, matched by the event's own title to exactly one legacy block; no hard-coded exceptions remain. `test:parity` now reads the content (runs with `--experimental-strip-types`). |
| Pending | `src/lib/validation/pending.ts` classifies every pending issue into five categories; the classification is part of `dist-reports/content-status.md` (§6). No status or fact changed. |
| Inventory | `npm run report:inventory` (`scripts/reports/inventory-reconciliation.ts`) reconciles the records with the website, its lists and both PDF editions; text of the PDFs in `docs/content/reference/`. |
| Tests | New: `event-expiry`, `pending`, `inventory`; extended: `validation` (W02/W07), `map-markers` (source and provenance per marker). Vitest 77 → 110. |
| Correction | §1 said 55 name variants; the migration's variant table has 54 (54 aliases on the 34 website places). |

### 10.2 Inventory reconciliation

Full table: `docs/content/sintra-inventory-reconciliation.md` (40 rows: name, permanent ID, file, presence on each website page and list, presence by page in each PDF, hierarchy, decision). The script fails if a record is found in no source, a PDF chapter maps to a missing record, or a place-like name that is not a record is unclassified or absent from where it is said to occur. Result: **0 problems**.

- **40 records = 36 independent places + 4 sub-places** (`part_of`): São Pedro de Canaferrim → Moorish Castle; National Palace gardens → National Palace; Chalet of the Countess of Edla → Pena; Cabo da Roca lighthouse → Cabo da Roca.
- **34** are presented on the website (in its place lists). **2** (Colares, Adega Regional de Colares) appear on the website only inside an event description. **4** exist only in the PDFs (Cabo da Roca, its lighthouse, Museu do Bonsai, São Pedro de Canaferrim).
- Every chapter of both PDFs maps to records: 2026 Edition (8 chapters/sections), First Edition v1.0 (9 chapters + "On foot, and small discoveries").
- 16 groups of place-like names are deliberately **editorial elements**, each verified to occur in its source: features inside a monument (Interpretation Centre, Initiation Well, Casa do Gerador, Farmyard of Monserrate, Chapel of Santa Eufémia), trailheads and trails, event venues (MASMO, Olga Cadaval), streets used as addresses, transport points, the Byron plaque, and Porto/Douro on the homepage.

Explicit cases:
- **São Pedro de Canaferrim** — sub-place of the Moorish Castle. Both PDFs describe it inside the castle chapter; it is inside the castle's ticketed area and houses its Interpretation Centre; it is not on the website. Own record because the First Edition gives it its own content (the church and the finds); no own ticket, hours or card.
- **National Palace gardens** — sub-place of the National Palace, kept as a separate record because the website presents it as a separate free stop with its own text in 3 lists and its own last-entry rule (an unresolved conflict). Not mentioned in either PDF. Merging it into the palace would lose a published card and a distinct fact.
- **Adega Regional de Colares** — independent place in the Colares zone, not a sub-place of Colares: it has its own address, hours, phone and booking rule (First Edition ch.7). Colares is the village and wine region (an area). On the website both appear only in the wine-journey event text.

**~41 vs 40.** The M2 plan (7 Nov) estimated "about 37 distinct places" on the website and listed five PDF-only places, giving "≈ 41". The estimate was made before the name variants were resolved and is not backed by a list, so it cannot be itemised record by record. What can be shown: the migration's variant table resolves all 54 legacy headings to **34** website places (it throws on any unresolved heading), and the PDF-only places are the five the plan named plus the Cabo da Roca lighthouse, recorded as a sub-place because the First Edition gives it its own opening and last-entry times (6 in all). 34 + 6 = 40. No record was created to reach a number, and none was merged: each pair that could look like a merge (palace/gardens, castle/Canaferrim, Cabo da Roca/lighthouse, Colares/Adega, Pena/Chalet) is two records.

**Evidence that nothing was omitted or merged:** (1) the variant table resolves every heading of every legacy list and fails on any unknown one; (2) `test:parity` proves the rebuilt pages carry exactly the legacy cards, links and texts; (3) the inventory script maps every PDF chapter to records and checks every other place-like name in the sources; (4) the duplicate-place rule C07 forbids two records sharing a name. Open candidates (not omissions, decisions): Palace of Seteais, MASMO, Viúva Gomes — see §10.7.

### 10.3 Pending items (91)

Classification at validation date 2026-11-13 (`docs/content/sintra-content-status-2026-11-13.md` §6 lists every ID with its status, where it is visible and what resolves it):

**91 pending issues = 86 distinct items**: the 5 map markers on non-checked coordinates are reported twice by the validator (P06 for the marker, P01 for its coordinate fact) and are counted once.

| Category | Items | reported | confirm-first | unresolved | no status | Visitor impact | Show with caveat? | Keep hidden? |
|---|---|---|---|---|---|---|---|---|
| 1 Visible to visitors | 27 | 21 | 3 | 3 | — | value is on a page, the map or the diary today | reported / confirm-first: yes, with a status mark (M3) | unresolved: yes, show "confirm with the operator" (owner decision, M3) |
| 2 Internal research | 33 | 19 | 2 | 9 | 3 places | none (data only) | n/a | yes, until checked |
| 3 Descriptions missing | 6 | — | — | — | 6 places | none (no card) | no | yes, no page until text is approved |
| 4 Structured facts missing | 16 | — | — | — | 16 places | editorial text only | yes, as today | no new fact fields until sourced |
| 5 Commercial blockers | 4 | — | — | — | 4 images | free: shown with credit; commercial: build fails | free only | commercial: yes |

- Category 1: 17 facts quoted in published cards (16 reported, 1 unresolved: gardens last entry 18:00), 1 fact visible in page prose (bus 434), 4 events in the diaries, 5 map markers (2 unresolved, 3 confirm-first).
- `checked` items are never pending (58 facts are checked); no status was changed in this round. `reported` = recorded from a source but not re-verified (website values, Visit Sintra, PDF ledger); `confirm-first` = no reliable source; `unresolved` = sources disagree, every value kept.
- The validator's own grouping (P01–P06) is unchanged; the categories are a second, non-overlapping view of the same issues, tested in `tests/unit/pending.test.ts` (each issue in exactly one item).

### 10.4 Expired events

- Rule: shown up to and including the last day; hidden from the next day. A one-day event's last day is its start date. Records and list entries stay as history.
- Date: the validation date (fixed in tests with `VALIDATION_DATE`; never the real clock in tests).
- Same function for both diaries (`activeEventIds`), used by `eventsInList()` for both event components.
- **Mutatis Mutandis** (last day 2026-11-15): built pages and parity were tested at three dates — 14 Nov: shown (4 events in the local diary); 15 Nov: shown (4); 16 Nov: hidden (3), parity still passes.
- Today (13 Nov) the diaries show: local — Cunha e Costa collection (to 31 Dec), Mordidas do Tempo, Vinil Musa (to 3 Jan 2027), Mutatis Mutandis (to 15 Nov); directory — Mordidas do Tempo only. From 4 Jan 2027 both diaries would be empty (W07).
- **Limitation — the seasonal diary is not complete.** It holds only the 7 events carried over from the website (checked by that edition on 30 Oct 2026, all `reported`). No new agenda research was done in M2; the official agendas were not re-read. The page text "Checked 30 October 2026" and "This page does not update itself automatically yet" are legacy prose kept for parity.
- **Limitation — static pages.** Expiry happens at build time. A page built on 15 Nov keeps showing Mutatis Mutandis until the next build; a scheduled daily rebuild is a deployment decision (§10.7), not done.

### 10.5 Tests and results (local, 13 Nov 2026)

| Check | Result |
|---|---|
| astro check | 0 errors / 0 warnings / 0 hints |
| Vitest | 110 / 110 (10 files) |
| Content validation (free) | 0 critical · 32 warnings (W03×25, W06×4, W02×3) · 91 pending |
| Free build | 5 pages, validation date 2026-11-13 |
| Commercial build | refused: 4 × C11 (the four Wikimedia photographs), no output written |
| Playwright (390 / 820 / 1440) incl. axe | 132 passed, 3 skipped by design; all 24 accessibility tests passed |
| Internal links | 87, 0 broken |
| html-validate | 0 problems |
| Editorial parity | 5/5 pages; 1 text exception; 5 ended-event blocks hidden by date |
| Map | 9 markers at the Phase 1 coordinates; source, provenance and status per marker asserted |
| Inventory reconciliation | 40 records, 0 problems |

### 10.6 Remaining limitations

- Seasonal diary incomplete and unverified (above). Static pages need a rebuild to drop an ended event.
- The inventory check matches names: it proves presence of each record and classifies every place-like name found, but a place described without any name would not be detected.
- Status marks for visitors (reported / confirm-first / unresolved) do not exist yet (M3); today visitors see values without a per-item mark.
- The PDF texts in `docs/content/reference/` are extractions: the 2026 Edition from the project copy, the First Edition by `pdftotext` (SHA-256 of the PDF `15cf75ca…148222a`).

### 10.7 Blockers and decisions needing human approval

Editorial blockers: 27 visible items without verification (3 unresolved: gardens last entry, Monserrate and gardens markers); 33 research items; 6 places without text; 16 without facts; diary research.
Commercial blockers: 4 image rights (C11); in addition, category 1 should be resolved before any paid edition.

Decisions for the owner:
1. Unresolved values now visible (gardens last entry 18:00; two markers): keep as published until M3, or replace them with "confirm with the operator" — this changes visible text (parity).
2. Candidate places: Palace of Seteais, MASMO (event venue), Viúva Gomes — create records or keep as editorial mentions.
3. A scheduled rebuild so ended events disappear on time (a deployment change; not done).
4. Agenda research to refresh the seasonal diary (editorial work, outside M2).
5. Approval of the expiry rule (inclusive last day) and of the Europe/Lisbon date.
