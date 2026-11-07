# Phase 0 + 1 — change report

Branch `phase/0-1-foundation` → `develop`. Prepared 7 November 2026 by Claude (implementation) for ChatGPT's technical review and the owner's approval.

**Status: implemented and tested locally; CI runs on this pull request. Not deployed. Production untouched.**

## 1. What this phase delivers

| Approved item | Delivered |
|---|---|
| Development branch | `develop` created from `main` (identical to production at `531c444`); this PR targets `develop`, not `main` |
| Astro + TypeScript foundation | Astro 7.4.7, TypeScript 6.0.3 (strict), static output, host-independent (`SITE_URL`, `BASE_PATH` env overrides) |
| CI and build validation | `.github/workflows/ci.yml`: type check, unit tests, content validation, production build, internal-link check, HTML validation, editorial parity, Playwright at 3 widths, axe accessibility scan; uploads the built site and screenshots as artifacts. **No deploy step.** |
| Validation levels | `critical` blocks the build · `warning` never blocks · `pending` allowed in dev/preview (see §4) |
| Initial design system | `src/styles/tokens.css`: Lora (headings), DM Sans (body/UI), forest, ivory, restrained antique gold — the same values as the PDF edition; fonts self-hosted (SIL OFL) |
| Reusable components | `Base` layout, `Header` + navigation, `Footer`, `DestinationCard`, `MapView` (engine-independent; Leaflet adapter) |
| Port homepage and Sintra pages | All 5 pages ported; **URLs identical** (`/index.html`, `/sintra.html`, `/sintra-local-discoveries.html`, `/sintra-romantic-guide.html`, `/sintra-discoveries.html`), so no redirects are needed |
| Preview without replacing production | CI artifact `preview-site` (the built site) + `review-screenshots-and-reports`. GitHub Pages hosts one site per repository, so a hosted preview there would replace production |

## 2. Production safety

- No file served by production was modified: `index.html`, `sintra*.html`, `styles.css`, `script.js`, `README.md` are byte-identical to `main` (`git diff main -- <files>` is empty).
- Nothing was pushed to `main`. No deployment, Pages setting, purchase or service was touched.
- If this branch is ever merged to `main` as-is, GitHub Pages would keep serving the same legacy root files. Switching production to the Astro build is a **separate cut-over decision** (change the Pages source to a GitHub Actions deployment), not part of this phase.

## 3. Intentional differences from the live pages

The parity checker (`scripts/check-parity.mjs`) compares every page's visible text, link targets and image src/alt with the live page. All are identical except these, each deliberate:

| # | Change | Why |
|---|---|---|
| 1 | Map legend on `sintra.html`: "Historic centre / Hilltop and garden monuments" → "Main monuments / Free stops" | The live legend contradicts the markers: the code colours the 5 main monuments one way and the 4 free stops the other |
| 2 | Map markers for Quinta da Regaleira and Palácio de Monserrate moved to the operators' published coordinates | Live markers are ~124 m and ~137 m off; sources in `src/content/sources.json` (read 7 Nov 2026) |
| 3 | One shared header and footer on every page | Approved component architecture. Footer taglines "Made with care in Portugal." and "Independent field companions" became the shared "Independent travel guides, made with care in Portugal." All page-specific footer content (sources, research date, footer links) is kept |
| 4 | Brand: Playfair Display → Lora; olive/terracotta → forest/antique gold; large terracotta closing band → paper | Approved unified design system |
| 5 | `sintra-discoveries.html` now has the mobile menu button | The live page had no way to open its navigation on mobile |
| 6 | Navigation collapses into the menu button up to 1024 px (was 760 px) | Five-item navigations wrapped onto two lines on tablets |
| 7 | Accessibility fixes: skip link, visible focus on every control, Escape closes the menu and returns focus, `aria-controls`, `aria-pressed` on filters, decorative card art hidden from screen readers (it was labelled as photographs that do not exist), `lang="en-GB"` everywhere, accent text contrast raised (legacy terracotta and grey text measured 3.6:1; now ≥ 4.8:1) | Phase 0 acceptance criteria |
| 8 | HTML hygiene: encoded `&`, explicit `type` on buttons and the search input | Valid HTML; renders identically |
| 9 | Leaflet and fonts bundled locally instead of unpkg / Google Fonts | No third-party requests for code or fonts; works with stricter privacy settings |

The one page-level CSS defect found during the port: the romantic guide redefined the colour variables in its own `:root`, which after the token mapping made `--paper` refer to itself, and it restyled the shared header with a different breakpoint. Page CSS can no longer redefine tokens or restyle the shared header/footer (`sanitisePageCss` in the port script).

## 4. Validation levels (current content)

`npm run validate` (also run by `npm run build`):

- **CRITICAL (0)** — would block the build. Checks: schema validity, ID format `{type}.{scope}.{slug}`, duplicate IDs, broken source references, official coordinates without a source, coordinates outside mainland Portugal, any `<img>` on a page without a rights record, contributor images without a written-permission reference, homepage cards linking to missing pages.
- **WARNING (4)** — the four Wikimedia photographs on `sintra.html` are not cleared for commercial publication (credits copied from the live captions, licences not re-verified, share-alike not reviewed). With `PUBLICATION_MODE=commercial` these become critical and the build fails — verified.
- **EDITORIAL PENDING (7)** — three map markers with approximate coordinates (Museu Anjos Teixeira, Parque da Liberdade, Miradouro de São Martinho) and the four photo rights records awaiting confirmation.

## 5. Test results (local run, 7 Nov 2026)

| Check | Result |
|---|---|
| `astro check` (TypeScript) | 0 errors, 0 warnings, 0 hints |
| Vitest unit tests | 13 / 13 passed (every validation level, including deliberate failures) |
| Content validation | 0 critical, 4 warnings, 7 pending |
| Production build | 5 pages built |
| Internal links | 87 links + all `#anchors` resolved, 0 broken (checker proven against injected faults) |
| HTML validation (`html-validate:recommended`) | 0 problems |
| Editorial parity | 5 / 5 pages identical text, links and images (1 listed exception) |
| Playwright, mobile 390 · tablet 820 · desktop 1440 | 105 passed, 3 skipped by design (menu-button tests on desktop, desktop-nav test on mobile/tablet) |
| axe-core WCAG 2.2 A/AA | 0 violations on all 5 pages at all 3 widths (map widget excluded; its text list of links is tested) |

Playwright covers, per page and width: HTTP 200, one `h1`, `main` landmark, `lang`, no script errors, no horizontal overflow, skip link is first and moves focus, visible focus on every header stop, full-page screenshot. Plus: mobile/tablet menu (open, Escape, focus return), day planner output identical to the live wording, discoveries filter and search, map initialises with all 9 markers, legacy URLs return 200.

Local environment limits: this workspace cannot reach `tile.openstreetmap.org` or `upload.wikimedia.org`, so local screenshots show the map without tiles and the four photographs missing. The CI screenshot step runs with external requests allowed and shows both. Tests themselves always block third-party requests so they are deterministic.

## 6. Screenshots

Top of each page at each width (full-page originals are in the CI artifact `review-screenshots-and-reports`):

- `docs/review/phase-0-1/desktop.jpg` · `tablet.jpg` · `mobile.jpg`
- `docs/review/phase-0-1/sintra-map-desktop.jpg` — corrected legend, 9 markers (tiles blocked locally)
- `docs/review/phase-0-1/romantic-footer-mobile.jpg` — shared footer on the romantic guide
- `docs/review/phase-0-1/home-closing-footer-desktop.jpg` — closing band and footer

## 7. Not in this phase (unchanged plan)

Content model and de-duplication of the three place lists (Phase 2); map categories, filters and route layers (Phase 3); planner v2 (Phase 4); translations (Phase 5); PWA/offline (Phase 6). No accounts, payments, subscriptions, offline maps or native apps.

## 8. Decisions requested

1. Approve this PR into `develop`.
2. Cut-over to the Astro build on production is a separate, later approval (needs a Pages source change and a deploy workflow with manual approval).
3. Confirm the closing-band and tablet-navigation design changes (§3 items 4 and 6), or ask for the legacy behaviour.

---

## 9. Review fixes (issues 1–4 of the Phase 0+1 visual review, approved 7 Nov 2026)

Scope limited to the four approved issues. No editorial content, image rights, prices or opening hours changed; URLs and architecture unchanged.

| # | Issue | Fix | Tests added |
|---|---|---|---|
| 1 | Planner result label "Your personalised starting point" at 1.73:1 contrast | Label uses the text gold on the ivory result panel (`brand.css`), 5.7:1 | axe scan of the **visible** planner result for 3 plans × 3 widths. It failed before the fix: the first CSS attempt was overridden by the page CSS and the test caught it |
| 2 | Six town-centre markers overlapped at the default zoom | Leaflet.markercluster 1.5.3 (MIT): nearby markers form a numbered cluster; selecting it (click, tap or Enter) zooms in until the places separate, and spiderfies if they still coincide. Markers are `L.marker`s with a 16 px dot (same colours as before) inside a 32 px touch target, keyboard-focusable with a screen-reader name. **Coordinates unchanged** | Markers equal the source coordinates exactly (all 9 IDs); separate + clustered markers = 9; selecting a cluster reveals more markers; every one of the 9 popups (name + zone) is reachable; keyboard Enter opens a cluster and a popup; touch targets ≥ 24 px |
| 3 | Planner merged "less walking" and "step-free" and dropped the duration from the title | Title keeps the duration and adds the need: "… — less walking" or "… — step-free access requested". A step-free choice adds: "This planner has not verified step-free routes, entrances or facilities at any venue, so none of the suggestions above should be read as step-free…". Rules moved to a pure function (`src/lib/planner/legacy-plan.ts`) | Golden test: runs the live site's own `script.js` and compares all 1,620 input combinations — identical except the two deliberate changes; 3 durations × 3 mobility options; browser test of the titles |
| 4 | "1 curated stops shown" | Singular for 1, plural otherwise (`src/lib/format.ts`) | Unit: 0 / 1 / many; browser: 0, 1 and many results |

Results after the fixes (local, 7 Nov 2026): astro check 0/0/0 · Vitest 27/27 · validation 0 critical · 5 pages built · 87 internal links, 0 broken · html-validate 0 · parity 5/5 · Playwright 132 passed, 3 skipped by design.

Before/after screenshots: `docs/review/phase-0-1-fixes/`. Map before/after with real tiles is produced by the review run on `review/phase-0-1`.
