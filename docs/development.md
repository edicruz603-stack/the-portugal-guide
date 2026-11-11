# Development guide

Node 22 (see `.nvmrc`). Everything below is free and runs locally or in GitHub Actions.

```bash
npm ci                 # install exact versions from package-lock.json
npm run dev            # local dev server at http://localhost:4321/the-portugal-guide/
npm run ci             # everything CI runs: check, unit, validate+build, links, HTML, parity, browser tests
```

Individual steps: `npm run check` (TypeScript), `npm test` (Vitest), `npm run validate`, `npm run build`, `npm run test:links`, `npm run test:html`, `npm run test:parity`, `npm run test:e2e` (Playwright; first run `npx playwright install chromium`, or set `CHROME_PATH` to an installed Chrome).

## Structure

```
src/
  layouts/Base.astro          head, skip link, header, footer — every page uses it
  components/                 Header, Footer, DestinationCard, MapView
  pages/                      one .astro per URL; build.format 'file' keeps /page.html URLs
  styles/                     tokens.css (design system) · legacy-base.css (ported) · brand.css · a11y.css
  lib/map/                    MapView contract + Leaflet adapter (swap engines without touching pages)
  lib/validation/             Zod schemas + critical / warning / pending rules
  data/                       typed data used by pages (map places, homepage cards)
  content/                    registers: sources.json, images.json
  scripts/                    client scripts: navigation, planner (legacy logic), discoveries filter
scripts/                      port-legacy, validate-content, check-links, check-parity
tests/unit · tests/e2e        Vitest · Playwright (mobile 390, tablet 820, desktop 1440) + axe
```

## Rules

- Never push to `main`. Work on a branch, open a PR into `develop`; CI must be green before review.
- Production deploys only with explicit owner approval.
- Every image on a page needs a record in `src/content/images.json`; commercial builds (`PUBLICATION_MODE=commercial`) refuse uncleared images.
- Coordinates marked `official` need a source ID from `src/content/sources.json`.
- The legacy root HTML files are what production serves today. Do not edit them; `scripts/port-legacy.mjs` regenerates the Astro pages from them until Phase 2 replaces that with structured content.

## Content (M2)

Places, facts, events and lists live in `src/content/destinations/<destination>/` as YAML (one record per file),
validated by the Zod schemas in `src/lib/content/schemas.ts`. Pages read them only through `src/lib/content/repository.ts`.

- Add a place: create `places/<key>.yaml` with a new `id` (`place.<destination>.<key>`), add it to a list in `lists/`, run `npm run ids:lock`.
- Add a fact: add it to `facts/<place-key>.yaml` with `source`, `observed_on`, `status` and `provenance`; add `checked_on` only if you verified it yourself against an operator or official page.
- Sources disagree: keep every value, give them the same `conflict_group`, status `unresolved`.
- Never rename or delete an ID; retire it in `src/content/ids.lock.json`.
- `npm run validate` writes `dist-reports/content-status.md` (inventory, coverage, conflicts, pending).
