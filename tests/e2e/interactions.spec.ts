import { test, expect } from './fixtures.ts';

test('mobile navigation: toggle, Escape closes and returns focus', async ({ page, consoleErrors }, info) => {
  test.skip(info.project.name === 'desktop', 'disclosure is used on mobile and tablet');
  await page.goto('sintra.html');
  const toggle = page.locator('.menu-toggle');
  const nav = page.locator('#main-nav');
  await expect(nav).toBeHidden();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(nav).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
  expect(consoleErrors).toEqual([]);
});

test('desktop navigation is visible without a toggle', async ({ page, consoleErrors: _ }, info) => {
  test.skip(info.project.name !== 'desktop');
  await page.goto('index.html');
  await expect(page.locator('#main-nav')).toBeVisible();
  await expect(page.locator('.menu-toggle')).toBeHidden();
});

test('day planner produces a plan (legacy behaviour preserved)', async ({ page, consoleErrors }) => {
  await page.goto('sintra.html');
  await page.selectOption('#sc-days', 'two');
  await page.selectOption('#sc-interest', 'gardens');
  await page.selectOption('#sc-transport', 'car');
  await page.click('#sc-build');
  const result = page.locator('#sc-result');
  await expect(result).toBeVisible();
  await expect(result.locator('h3')).toHaveText('Two days to experience Sintra properly');
  await expect(result).toContainText('Private vehicles are not permitted on the access roads');
  expect(consoleErrors).toEqual([]);
});

test('discoveries filter and search', async ({ page, consoleErrors }) => {
  await page.goto('sintra-discoveries.html');
  await page.click('[data-filter="food"]');
  const visible = page.locator('.place:visible');
  const n = await visible.count();
  expect(n).toBeGreaterThan(0);
  for (const t of await visible.evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.type))) expect(t).toBe('food');
  await expect(page.locator('#count')).toHaveText(`${n} curated stops shown`);
  await expect(page.locator('[data-filter="food"]')).toHaveAttribute('aria-pressed', 'true');
  await page.fill('#search', 'piriquita');
  await expect(page.locator('.place:visible')).toHaveCount(1);
  expect(consoleErrors).toEqual([]);
});

test('map: markers sit exactly on the source coordinates', async ({ page, consoleErrors }) => {
  await page.goto('sintra.html');
  const map = page.locator('#sintra-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveAttribute('data-map-ready', 'true');
  const { source, mounted } = await map.evaluate((el) => ({
    source: JSON.parse(el.dataset.mapPlaces ?? '[]') as { id: string; lat: number; lon: number }[],
    mounted: (el as HTMLElement).tpgMarkers ?? [],
  }));
  expect(source).toHaveLength(9);
  expect(mounted).toEqual(source.map(({ id, lat, lon }) => ({ id, lat, lon })));
  expect(consoleErrors).toEqual([]);
});

test('map: overlapping town markers are clustered, and selecting the cluster reveals them', async ({ page, consoleErrors }) => {
  await page.goto('sintra.html');
  const map = page.locator('#sintra-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveAttribute('data-map-ready', 'true');
  const clusters = map.locator('.tpg-cluster-icon');
  await expect(clusters.first()).toBeVisible();
  const before = await map.locator('.tpg-marker-icon').count();
  const inClusters = (await clusters.allInnerTexts()).reduce((s, t) => s + parseInt(t, 10), 0);
  expect(before + inClusters).toBe(9);              // nothing lost: separate markers + clustered markers = 9
  await clusters.first().click();
  await expect.poll(() => map.locator('.tpg-marker-icon').count()).toBeGreaterThan(before);
  expect(consoleErrors).toEqual([]);
});

test('map: all nine places, names, zones and popups remain reachable', async ({ page, consoleErrors }) => {
  const open = async () => {
    await page.goto('sintra.html');
    const m = page.locator('#sintra-map');
    await m.scrollIntoViewIfNeeded();
    await expect(m).toHaveAttribute('data-map-ready', 'true');
    return m;
  };
  const seen = new Set<string>();
  const collect = async (map: ReturnType<typeof page.locator>) => {
    const markers = map.locator('.tpg-marker-icon');
    for (let i = 0; i < await markers.count(); i++) {
      await markers.nth(i).dispatchEvent('click');
      const pop = map.locator('.leaflet-popup-content');
      await expect(pop).toHaveCount(1);
      seen.add((await pop.innerText()).replace(/\s+/g, ' ').trim());
      await map.locator('.leaflet-popup-close-button').click();
      await expect(pop).toHaveCount(0);
    }
  };
  const map0 = await open();
  const source = await map0.evaluate((el) => JSON.parse(el.dataset.mapPlaces ?? '[]') as { name: string; zone: string }[]);
  // depth-first: open the page, follow a path of cluster selections, collect popups, recurse into each remaining cluster
  const explore = async (path: number[]): Promise<void> => {
    const map = await open();
    for (const k of path) { await map.locator('.tpg-cluster-icon').nth(k).click(); await page.waitForTimeout(700); }
    await collect(map);
    const n = await map.locator('.tpg-cluster-icon').count();
    if (path.length < 4) for (let k = 0; k < n; k++) await explore([...path, k]);
  };
  await explore([]);
  expect([...seen].sort()).toEqual(source.map((p) => `${p.name} ${p.zone}`).sort());
  expect(consoleErrors).toEqual([]);
});

test('map: keyboard can open a cluster and a marker popup', async ({ page, consoleErrors }) => {
  await page.goto('sintra.html');
  const map = page.locator('#sintra-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveAttribute('data-map-ready', 'true');
  const cluster = map.locator('.tpg-cluster-icon').first();
  await expect(cluster).toHaveAttribute('role', 'button');
  await expect(cluster).toContainText('places close together');
  const before = await map.locator('.tpg-marker-icon').count();
  await cluster.focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => map.locator('.tpg-marker-icon').count()).toBeGreaterThan(before);
  const marker = map.locator('.tpg-marker-icon').first();
  await expect(marker).toHaveAttribute('tabindex', '0');
  await marker.focus();
  await page.keyboard.press('Enter');
  await expect(map.locator('.leaflet-popup-content')).toBeVisible();
  expect(consoleErrors).toEqual([]);
});

test('map: marker touch targets are at least 24 px (WCAG 2.2 target size)', async ({ page, consoleErrors: _ }) => {
  await page.goto('sintra.html');
  const map = page.locator('#sintra-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveAttribute('data-map-ready', 'true');
  for (const box of await map.locator('.tpg-marker-icon, .tpg-cluster-icon').evaluateAll((els) => els.map((e) => e.getBoundingClientRect()))) {
    expect(box.width).toBeGreaterThanOrEqual(24);
    expect(box.height).toBeGreaterThanOrEqual(24);
  }
});

test('legacy URLs resolve unchanged', async ({ page, consoleErrors: _ }) => {
  for (const path of ['index.html', 'sintra.html', 'sintra-local-discoveries.html', 'sintra-romantic-guide.html', 'sintra-discoveries.html']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});

test('discoveries counter: zero, one and many results', async ({ page, consoleErrors }) => {
  await page.goto('sintra-discoveries.html');
  const count = page.locator('#count');
  await page.fill('#search', 'zzzz');
  await expect(page.locator('.place:visible')).toHaveCount(0);
  await expect(count).toHaveText('0 curated stops shown');
  await page.fill('#search', 'regaleira');
  await expect(page.locator('.place:visible')).toHaveCount(1);
  await expect(count).toHaveText('1 curated stop shown');
  await page.fill('#search', 'garden');
  const n = await page.locator('.place:visible').count();
  expect(n).toBeGreaterThan(1);
  await expect(count).toHaveText(`${n} curated stops shown`);
  expect(consoleErrors).toEqual([]);
});

test('planner keeps the duration and separates less walking from step-free', async ({ page, consoleErrors }) => {
  await page.goto('sintra.html');
  const set = async (days: string, mobility: string) => {
    await page.selectOption('#sc-days', days);
    await page.selectOption('#sc-mobility', mobility);
    await page.click('#sc-build');
  };
  const h3 = page.locator('#sc-result h3');
  await set('half', 'stepfree');
  await expect(h3).toHaveText('A thoughtful half-day in Sintra — step-free access requested');
  await expect(page.locator('#sc-result')).toContainText('This planner has not verified step-free routes');
  await set('half', 'low');
  await expect(h3).toHaveText('A thoughtful half-day in Sintra — less walking');
  await expect(page.locator('#sc-result')).not.toContainText('This planner has not verified step-free routes');
  await set('two', 'standard');
  await expect(h3).toHaveText('Two days to experience Sintra properly');
  expect(consoleErrors).toEqual([]);
});
