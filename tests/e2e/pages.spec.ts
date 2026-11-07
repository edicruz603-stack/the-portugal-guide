import { test, expect, PAGES } from './fixtures.ts';

for (const p of PAGES) {
  test.describe(p.name, () => {
    test('renders with landmarks, one h1 and no script errors', async ({ page, consoleErrors }) => {
      const res = await page.goto(p.path);
      expect(res?.status()).toBe(200);
      await expect(page).toHaveTitle(/\S/);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en-GB');
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('main#main')).toHaveCount(1);
      await expect(page.locator('header.site-header')).toBeVisible();
      await expect(page.locator('footer.site-footer')).toBeVisible();
      await page.waitForLoadState('networkidle');
      expect(consoleErrors).toEqual([]);
    });

    test('has no horizontal overflow', async ({ page, consoleErrors: _ }) => {
      await page.goto(p.path);
      const { scroll, width } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }));
      expect(scroll).toBeLessThanOrEqual(width + 1);
    });

    test('skip link is the first focus stop, is visible and moves focus to main', async ({ page, consoleErrors: _ }) => {
      await page.goto(p.path);
      await page.keyboard.press('Tab');
      const skip = page.locator('.skip-link');
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport();
      await page.keyboard.press('Enter');
      await expect(page.locator('main#main')).toBeFocused();
    });

    test('every keyboard focus stop in the header shows a visible focus indicator', async ({ page, consoleErrors: _ }, info) => {
      await page.goto(p.path);
      const stops = info.project.name === 'desktop' ? 4 : 3; // skip link, brand, (toggle | nav links)
      for (let i = 0; i < stops; i++) {
        await page.keyboard.press('Tab');
        const visible = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return false;
          const s = getComputedStyle(el);
          return (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || s.boxShadow !== 'none';
        });
        expect(visible, `focus stop ${i + 1} has a visible indicator`).toBe(true);
      }
    });

    test('full-page screenshot for review', async ({ page, consoleErrors: _ }, info) => {
      await page.goto(p.path);
      // scroll through the page so lazily initialised parts (the map) render before capture
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
      });
      const map = page.locator('[data-map-places]');
      if (await map.count()) {
        await map.scrollIntoViewIfNeeded();
        await expect(map).toHaveClass(/leaflet-container/);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      await page.waitForTimeout(500);
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `review-screenshots/${info.project.name}/${p.name}.png`, fullPage: true });
    });
  });
}
