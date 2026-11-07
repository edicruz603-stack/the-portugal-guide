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
