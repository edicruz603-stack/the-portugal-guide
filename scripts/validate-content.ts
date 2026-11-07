/**
 * Content validation CLI.
 *   npm run validate                       -> report all levels, exit 0 unless critical
 *   npm run validate -- --production       -> same, used by `npm run build`
 *   PUBLICATION_MODE=commercial npm run build -> uncleared images become critical
 * Writes a JSON report to dist-reports/validation.json for CI artifacts.
 */
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { sintraMapPlaces } from '../src/data/sintra-map.ts';
import { validateContent, hasCritical, type Issue } from '../src/lib/validation/validate.ts';

const root = new URL('../', import.meta.url);
const json = (p: string) => JSON.parse(readFileSync(new URL(p, root), 'utf8'));
const pagesDir = new URL('src/pages/', root);
const pages = Object.fromEntries(
  readdirSync(pagesDir).filter((f) => f.endsWith('.astro')).map((f) => [f, readFileSync(new URL(f, pagesDir), 'utf8')]),
);

const mode = process.env.PUBLICATION_MODE === 'commercial' ? 'commercial' : 'free';
const today = process.env.VALIDATION_DATE ?? new Date().toISOString().slice(0, 10);
const issues = validateContent(
  {
    sources: json('src/content/sources.json'),
    images: json('src/content/images.json'),
    mapPlaces: sintraMapPlaces,
    homeDestinations: json('src/data/home-destinations.json'),
    pages,
  },
  { mode, today, sourceReviewDays: 90 },
);

const by = (l: Issue['level']) => issues.filter((i) => i.level === l);
const print = (label: string, list: Issue[]) => {
  console.log(`\n${label} (${list.length})`);
  for (const i of list) console.log(`  - ${i.where}: ${i.message}`);
};
console.log(`Content validation · mode=${mode} · date=${today}`);
print('CRITICAL', by('critical'));
print('WARNING', by('warning'));
print('EDITORIAL PENDING', by('pending'));

mkdirSync(new URL('dist-reports/', root), { recursive: true });
writeFileSync(new URL('dist-reports/validation.json', root), JSON.stringify({ mode, today, issues }, null, 2));

if (hasCritical(issues)) {
  console.error('\nValidation failed: critical issues block the build.');
  process.exit(1);
}
console.log('\nValidation passed (no critical issues).');
