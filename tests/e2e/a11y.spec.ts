import AxeBuilder from '@axe-core/playwright';
import { test, expect, PAGES } from './fixtures.ts';

/**
 * Automated WCAG 2.2 A/AA scan (axe-core). Automated scans find a subset of issues;
 * manual keyboard and screen-reader review is still required before launch.
 */
for (const p of PAGES) {
  test(`axe WCAG A/AA: ${p.name}`, async ({ page, consoleErrors: _ }) => {
    await page.goto(p.path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .exclude('.leaflet-container') // third-party map widget, covered by its own tests and the text links list
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}

/**
 * The planner result is hidden until a plan is built, so the page-level scan above never sees it.
 * Build plans (including the longest output) and scan the visible result.
 */
const PLANS = [
  { days: 'one', interest: 'classic', pace: 'balanced', mobility: 'standard', transport: 'train', company: 'couple' },
  { days: 'two', interest: 'gardens', pace: 'relaxed', mobility: 'low', transport: 'car', company: 'family' },
  { days: 'half', interest: 'food', pace: 'active', mobility: 'stepfree', transport: 'local', company: 'solo' },
];
for (const [i, plan] of PLANS.entries()) {
  test(`axe WCAG A/AA: planner result ${i + 1} (${plan.days}, ${plan.mobility})`, async ({ page, consoleErrors: _ }) => {
    await page.goto('sintra.html');
    for (const [k, v] of Object.entries(plan)) await page.selectOption(`#sc-${k}`, v);
    await page.click('#sc-build');
    await expect(page.locator('#sc-result')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('.companion-tool')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    const summary = results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`);
    expect(summary, summary.join('\n')).toEqual([]);
  });
}
