import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';

const OUT = 'review-out';
const PAGES = ['index', 'sintra', 'sintra-local-discoveries', 'sintra-romantic-guide', 'sintra-discoveries'];
const results: Record<string, unknown> = existsSync(`${OUT}/results.json`) ? JSON.parse(readFileSync(`${OUT}/results.json`, 'utf8')) : {};
const save = (key: string, v: unknown) => {
  mkdirSync(OUT, { recursive: true });
  const cur = existsSync(`${OUT}/results.json`) ? JSON.parse(readFileSync(`${OUT}/results.json`, 'utf8')) : results;
  cur[key] = v; writeFileSync(`${OUT}/results.json`, JSON.stringify(cur, null, 2));
};
const shot = (name: string) => { mkdirSync(`${OUT}/${name.split('/').slice(0, -1).join('/')}`, { recursive: true }); return `${OUT}/${name}.png`; };

async function watch(page: Page) {
  const errors: string[] = []; const failed: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => failed.push(`${r.failure()?.errorText} ${r.url()}`));
  await page.addInitScript(() => {
    (window as any).__cls = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) (window as any).__cls += e.value; })
      .observe({ type: 'layout-shift', buffered: true });
  });
  return { errors, failed };
}
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  });
}

for (const name of PAGES) {
  test(`full page · ${name}`, async ({ page }, info) => {
    const w = await watch(page);
    await page.goto(`${name}.html`, { waitUntil: 'networkidle' });
    await scrollThrough(page);
    const map = page.locator('[data-map-places]');
    if (await map.count()) {
      await map.scrollIntoViewIfNeeded();
      await expect(map.locator('img.leaflet-tile-loaded').first()).toBeVisible({ timeout: 20_000 });
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(800);
    const imgs = await page.$$eval('main img', (els) => els.map((i) => {
      const im = i as HTMLImageElement; const fig = im.closest('figure');
      return { src: im.currentSrc || im.src, alt: im.alt, loaded: im.complete && im.naturalWidth > 0, natural: [im.naturalWidth, im.naturalHeight], rendered: [Math.round(im.getBoundingClientRect().width), Math.round(im.getBoundingClientRect().height)], hasWH: im.hasAttribute('width') && im.hasAttribute('height'), lazy: im.loading, credit: fig?.querySelector('figcaption')?.textContent?.trim() ?? null, licenceLink: fig?.querySelector('figcaption a')?.getAttribute('href') ?? null };
    }));
    const metrics = await page.evaluate(() => ({ cls: (window as any).__cls as number, scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, height: document.documentElement.scrollHeight }));
    await page.screenshot({ path: shot(`full/${info.project.name}/${name}`), fullPage: true });
    save(`page:${info.project.name}:${name}`, { metrics, imgs, consoleErrors: w.errors, failedRequests: w.failed });
  });
}

test('map · tiles, markers and popups', async ({ page }, info) => {
  const w = await watch(page);
  await page.goto('sintra.html');
  const map = page.locator('#sintra-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map.locator('img.leaflet-tile-loaded').first()).toBeVisible({ timeout: 20_000 });
  await page.waitForLoadState('networkidle');
  const tiles = await map.locator('img.leaflet-tile-loaded').count();
  const markers = map.locator('path.leaflet-interactive');
  const n = await markers.count();
  await map.screenshot({ path: shot(`map/${info.project.name}-tiles-markers`) });
  const popups: string[] = [];
  for (let i = 0; i < n; i++) {
    await markers.nth(i).click({ force: true });
    const pop = map.locator('.leaflet-popup-content');
    await expect(pop).toBeVisible();
    popups.push((await pop.innerText()).replace(/\s+/g, ' '));
    if (i === 1) await map.screenshot({ path: shot(`map/${info.project.name}-popup`) });
  }
  // keyboard: focus map and pan with arrow keys
  await map.focus();
  const before = await map.locator('.leaflet-map-pane').getAttribute('style');
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(400);
  const after = await map.locator('.leaflet-map-pane').getAttribute('style');
  const attribution = await map.locator('.leaflet-control-attribution').innerText();
  save(`map:${info.project.name}`, { tilesLoaded: tiles, markers: n, popups, keyboardPan: before !== after, attribution, consoleErrors: w.errors });
});

test('discoveries · every filter and search', async ({ page }, info) => {
  const w = await watch(page);
  await page.goto('sintra-discoveries.html', { waitUntil: 'networkidle' });
  const out: Record<string, unknown> = {};
  out.initial = await page.locator('#count').innerText();
  out.totalPlaces = await page.locator('.place').count();
  for (const f of ['all', 'monument', 'free', 'food']) {
    await page.click(`[data-filter="${f}"]`);
    const visible = page.locator('.place:visible');
    const types = await visible.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.type));
    out[`filter:${f}`] = { count: types.length, countText: await page.locator('#count').innerText(), typesShown: [...new Set(types)], pressed: await page.locator(`[data-filter="${f}"]`).getAttribute('aria-pressed') };
    await page.locator('.controls, [data-filter]').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: shot(`discoveries/${info.project.name}-filter-${f}`) });
  }
  await page.click('[data-filter="all"]');
  for (const q of ['regaleira', 'garden', 'piriquita', 'zzzz']) {
    await page.fill('#search', q);
    const names = await page.locator('.place:visible h3').allInnerTexts();
    out[`search:${q}`] = { count: names.length, names, countText: await page.locator('#count').innerText() };
    if (q === 'garden') await page.screenshot({ path: shot(`discoveries/${info.project.name}-search-garden`) });
  }
  await page.fill('#search', 'garden'); await page.click('[data-filter="free"]');
  out['combined:free+garden'] = { names: await page.locator('.place:visible h3').allInnerTexts() };
  out.consoleErrors = w.errors;
  save(`discoveries:${info.project.name}`, out);
});

const COMBOS = [
  { id: 'A', days: 'one', interest: 'classic', pace: 'balanced', mobility: 'standard', transport: 'train', company: 'couple' },
  { id: 'B', days: 'two', interest: 'gardens', pace: 'relaxed', mobility: 'low', transport: 'car', company: 'family' },
  { id: 'C', days: 'half', interest: 'food', pace: 'active', mobility: 'stepfree', transport: 'local', company: 'solo' },
];
test('planner · three combinations', async ({ page }, info) => {
  const w = await watch(page);
  await page.goto('sintra.html');
  const out: Record<string, unknown> = {};
  for (const c of COMBOS) {
    for (const k of ['days', 'interest', 'pace', 'mobility', 'transport', 'company'] as const) await page.selectOption(`#sc-${k}`, c[k]);
    await page.click('#sc-build');
    const res = page.locator('#sc-result');
    await expect(res).toBeVisible();
    out[c.id] = { input: c, title: await res.locator('h3').innerText(), sections: await res.locator('h4').allInnerTexts(), items: await res.locator('li').count(), text: (await res.innerText()).replace(/\s+/g, ' ') };
    await page.locator('#companion, .companion-tool').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.locator('.companion-tool').screenshot({ path: shot(`planner/${info.project.name}-combo-${c.id}`) });
  }
  out.consoleErrors = w.errors;
  save(`planner:${info.project.name}`, out);
});

test('navigation · keyboard, menu and Escape', async ({ page }, info) => {
  await page.goto('sintra.html');
  const out: Record<string, unknown> = {};
  const stops: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    stops.push(await page.evaluate(() => { const e = document.activeElement as HTMLElement; const s = getComputedStyle(e); return `${e.tagName.toLowerCase()}${e.className ? '.' + String(e.className).split(' ')[0] : ''} "${(e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 30)}" outline=${s.outlineStyle}/${s.outlineWidth}`; }));
    if (i === 1) await page.screenshot({ path: shot(`nav/${info.project.name}-focus-brand`) });
  }
  out.tabOrder = stops;
  const toggle = page.locator('.menu-toggle');
  if (await toggle.isVisible()) {
    await page.goto('sintra.html');
    await toggle.focus();
    await page.keyboard.press('Enter');
    out.openedWithEnter = await toggle.getAttribute('aria-expanded');
    await page.screenshot({ path: shot(`nav/${info.project.name}-menu-open`) });
    await page.keyboard.press('Tab');
    out.firstItemAfterToggle = await page.evaluate(() => (document.activeElement as HTMLElement).innerText);
    await page.keyboard.press('Escape');
    out.afterEscape = { expanded: await toggle.getAttribute('aria-expanded'), navVisible: await page.locator('#main-nav').isVisible(), focusOnToggle: await toggle.evaluate((b) => b === document.activeElement) };
    await toggle.click();
    await page.locator('#main-nav a').first().click();
    out.closesOnLinkClick = await toggle.getAttribute('aria-expanded');
  } else out.menuButton = 'not shown at this width (inline navigation)';
  await page.goto('sintra.html');
  await page.keyboard.press('Tab');
  await page.screenshot({ path: shot(`nav/${info.project.name}-skip-link`) });
  save(`nav:${info.project.name}`, out);
});
