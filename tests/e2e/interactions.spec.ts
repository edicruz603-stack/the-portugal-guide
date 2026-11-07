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

test('map initialises with all 9 markers via the MapView adapter', async ({ page, consoleErrors }) => {
  await page.goto('sintra.html');
  const map = page.locator('#sintra-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveClass(/leaflet-container/);
  await expect(map.locator('path.leaflet-interactive')).toHaveCount(9);
  await expect(map).toHaveAttribute('aria-label', /Sintra/);
  expect(consoleErrors).toEqual([]);
});

test('legacy URLs resolve unchanged', async ({ page, consoleErrors: _ }) => {
  for (const path of ['index.html', 'sintra.html', 'sintra-local-discoveries.html', 'sintra-romantic-guide.html', 'sintra-discoveries.html']) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
  }
});
