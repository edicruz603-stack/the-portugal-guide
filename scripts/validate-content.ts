/**
 * Content validation CLI.
 *   npm run validate                               free mode (default, announced); exit 1 on any critical issue
 *   npm run validate -- --mode=commercial          commercial mode: uncleared images are critical
 *   PUBLICATION_MODE=commercial npm run validate   same, from the environment
 * Exit codes: 0 passed · 1 critical issues · 2 invalid publication mode.
 * `astro build` runs this same script from the build hook in astro.config.mjs, so no build skips it.
 * Writes dist-reports/validation.json and dist-reports/content-status.md (commercial: *-commercial.*).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadContentFromDisk } from '../src/lib/content/load-fs.ts';
import { validateContent, hasCritical, DEFAULT_OPTIONS, type Issue } from '../src/lib/validation/validate.ts';
import { contentStatusReport } from '../src/lib/validation/report.ts';
import { resolvePublicationMode, PublicationModeError } from '../src/lib/validation/mode.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = loadContentFromDisk(root);
let resolved;
try { resolved = resolvePublicationMode(process.argv.slice(2), process.env); }
catch (e) { if (e instanceof PublicationModeError) { console.error(`✗ ${e.message}`); process.exit(2); } throw e; }
const { mode, origin } = resolved;
const today = process.env.VALIDATION_DATE ?? new Date().toISOString().slice(0, 10);
const issues = validateContent(input, { ...DEFAULT_OPTIONS, mode, today });

const by = (l: Issue['level']) => issues.filter((i) => i.level === l);
console.log(`Content validation · publication mode=${mode} (${origin === 'default' ? 'default; set PUBLICATION_MODE or --mode to change' : `from ${origin}`}) · date=${today}`);
console.log(`CRITICAL (${by('critical').length}) · WARNING (${by('warning').length}) · EDITORIAL PENDING (${by('pending').length})`);
for (const i of by('critical')) console.log(`  ✗ [${i.rule}] ${i.where}: ${i.message}`);
const counts = (l: Issue['level']) => Object.entries(by(l).reduce<Record<string, number>>((a, i) => ((a[i.rule] = (a[i.rule] ?? 0) + 1), a), {})).map(([r, n]) => `${r}×${n}`).join(' ');
console.log(`  warnings by rule: ${counts('warning') || '—'}`);
console.log(`  pending by rule:  ${counts('pending') || '—'}`);

mkdirSync(new URL('../dist-reports/', import.meta.url), { recursive: true });
// commercial reports get their own names so a commercial check never overwrites the free-edition reports
const suffix = mode === 'commercial' ? '-commercial' : '';
writeFileSync(new URL(`../dist-reports/validation${suffix}.json`, import.meta.url), JSON.stringify({ mode, today, issues }, null, 2));
writeFileSync(new URL(`../dist-reports/content-status${suffix}.md`, import.meta.url), contentStatusReport(input, issues, today));
console.log(`Reports: dist-reports/validation${suffix}.json, dist-reports/content-status${suffix}.md`);

if (hasCritical(issues)) { console.error('\nValidation failed: critical issues block the build.'); process.exit(1); }
console.log('\nValidation passed (no critical issues).');
