import { test as base, expect } from '@playwright/test';

export const PAGES = [
  { path: 'index.html', name: 'home' },
  { path: 'sintra.html', name: 'sintra' },
  { path: 'sintra-local-discoveries.html', name: 'sintra-local-discoveries' },
  { path: 'sintra-romantic-guide.html', name: 'sintra-romantic-guide' },
  { path: 'sintra-discoveries.html', name: 'sintra-discoveries' },
] as const;

/**
 * External requests (map tiles, Wikimedia photos) are blocked unless ALLOW_EXTERNAL=1,
 * so tests are deterministic and never depend on third-party services.
 */
export const test = base.extend<{ consoleErrors: string[] }>({
  consoleErrors: async ({ page }, use) => {
    const errors: string[] = [];
    if (process.env.ALLOW_EXTERNAL !== '1') {
      await page.route(/^https?:\/\/(?!localhost)/, (route) => route.abort('blockedbyclient'));
    }
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/ERR_BLOCKED_BY_CLIENT|net::ERR_FAILED|Failed to load resource/.test(t)) return; // blocked third-party requests
      errors.push(t);
    });
    page.on('pageerror', (e) => errors.push(String(e)));
    await use(errors);
  },
});
export { expect };
