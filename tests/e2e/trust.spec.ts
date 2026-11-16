/**
 * M3 trust information on the built pages: approved wording, grouping per card, disputed values hidden,
 * keyboard and touch access, map markers.
 */
import { test, expect } from './fixtures';

test('gardens card: the disputed last-entry time is not shown; the card says the sources differ', async ({ page, consoleErrors }) => {
  await page.goto('sintra.html');
  const card = page.locator('.highlight-card', { hasText: 'free admission' }).filter({ hasText: 'gardens' }).first();
  await expect(card).toContainText('09:30–18:30; last entry: official sources differ');
  await expect(card).not.toContainText('last entry 18:00');
  await expect(card).not.toContainText('17:30');
  const summary = card.locator('details.trust-unresolved summary');
  await expect(summary).toHaveText('Sources differ — confirm with the operator · last entry');
  expect(consoleErrors).toEqual([]);
});

test('reported: opens by keyboard and by tap, explains without calling the value false', async ({ page, isMobile }) => {
  await page.goto('sintra-romantic-guide.html');
  const details = page.locator('.card', { hasText: 'Quinta da Regaleira' }).locator('details.trust-reported');
  const summary = details.locator('summary');
  await expect(summary).toHaveText('Not yet re-checked · price');
  await expect(details).not.toHaveAttribute('open', '');
  if (isMobile) await summary.tap(); else { await summary.focus(); await page.keyboard.press('Enter'); }
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('p')).toContainText('It may well be correct');
  const box = await summary.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44); // touch target
});

test('checked: a quiet dated line, no badge, no disclosure', async ({ page }) => {
  await page.goto('sintra-romantic-guide.html');
  const card = page.locator('.card', { hasText: 'Monserrate' }).first();
  await expect(card.locator('p.trust-checked')).toHaveText('Checked 11 Nov 2026 · price');
  await expect(card.locator('details.trust-checked')).toHaveCount(0);
});

test('grouping: at most one line per status on any card, and no trust lines on cards without stated facts', async ({ page }) => {
  for (const path of ['sintra.html', 'sintra-local-discoveries.html', 'sintra-romantic-guide.html', 'sintra-discoveries.html']) {
    await page.goto(path);
    const groups = await page.locator('.trust').evaluateAll((els) => els.map((el) => [...el.querySelectorAll('.trust-line')].map((l) => l.className)));
    for (const g of groups) expect(new Set(g).size, `${path}: ${g}`).toBe(g.length);
    expect(groups.length).toBeGreaterThan(0);
  }
  await page.goto('sintra-discoveries.html');
  await expect(page.locator('.place .trust')).toHaveCount(0); // directory cards state no checked/reported facts
});

test('events: each listed event carries its status', async ({ page }) => {
  await page.goto('sintra-local-discoveries.html');
  const events = page.locator('.event');
  const n = await events.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(events.nth(i).locator('summary')).toHaveText('Not yet re-checked · dates');
});

test('map: a marker on disputed coordinates says so, in the marker name and in its popup', async ({ page }) => {
  await page.goto('sintra.html');
  const map = page.locator('#sintra-map');
  await map.scrollIntoViewIfNeeded();
  await expect(map).toHaveAttribute('data-map-ready', 'true');
  const marker = map.locator('.tpg-marker-icon', { hasText: 'Palácio de Monserrate' });
  await expect(marker.locator('.tpg-sr')).toHaveText('Palácio de Monserrate. Sources differ — confirm with the operator');
  await expect(marker.locator('.tpg-dot--uncertain')).toHaveCount(1);
  await marker.click();
  await expect(map.locator('.leaflet-popup-content')).toContainText('Sources differ — confirm with the operator · map position');
});
