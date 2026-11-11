# M2 — Sintra content model: change report

Branch `feature/m2-sintra-content-model` → `develop`. Prepared 11 November 2026 for ChatGPT's technical review and owner approval.
**Status: implemented and tested locally; CI runs on the PR. Not deployed. `main` and production untouched. M3 not started.**

Full generated reports: `docs/content/sintra-content-status-2026-11-11.md` (snapshot); regenerated on every run as `dist-reports/content-status.md`.

## 1. What changed

| Before (Phase 1) | After (M2) |
|---|---|
| Places hand-written in 6 independent lists across 4 pages + a TypeScript map file | One YAML record per place in `src/content/destinations/sintra/places/` (40 places) |
| 55 name variants with no link between them | Each variant is an alias on exactly one place; immutable IDs `place.sintra.<key>` |
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

**3 · Event freshness (editorial change).** Three events had ended:
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
