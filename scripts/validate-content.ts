/**
 * Content validation CLI.
 *   npm run validate                          report all levels; exit 1 on any critical issue
 *   npm run build                             runs this first, so critical issues block every production build
 *   PUBLICATION_MODE=commercial npm run build uncleared images become critical
 * Writes dist-reports/validation.json and dist-reports/content-status.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadContentFromDisk } from '../src/lib/content/load-fs.ts';
import { validateContent, hasCritical, DEFAULT_OPTIONS, type Issue } from '../src/lib/validation/validate.ts';
import { contentStatusReport } from '../src/lib/validation/report.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const input = loadContentFromDisk(root);
const mode = process.env.PUBLICATION_MODE === 'commercial' ? 'commercial' : 'free';
const today = process.env.VALIDATION_DATE ?? new Date().toISOString().slice(0, 10);
const issues = validateContent(input, { ...DEFAULT_OPTIONS, mode, today });

const by = (l: Issue['level']) => issues.filter((i) => i.level === l);
console.log(`Content validation · mode=${mode} · date=${today}`);
console.log(`CRITICAL (${by('critical').length}) · WARNING (${by('warning').length}) · EDITORIAL PENDING (${by('pending').length})`);
for (const i of by('critical')) console.log(`  ✗ [${i.rule}] ${i.where}: ${i.message}`);
const counts = (l: Issue['level']) => Object.entries(by(l).reduce<Record<string, number>>((a, i) => ((a[i.rule] = (a[i.rule] ?? 0) + 1), a), {})).map(([r, n]) => `${r}×${n}`).join(' ');
console.log(`  warnings by rule: ${counts('warning') || '—'}`);
console.log(`  pending by rule:  ${counts('pending') || '—'}`);

mkdirSync(new URL('../dist-reports/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist-reports/validation.json', import.meta.url), JSON.stringify({ mode, today, issues }, null, 2));
writeFileSync(new URL('../dist-reports/content-status.md', import.meta.url), contentStatusReport(input, issues, today));
console.log('Reports: dist-reports/validation.json, dist-reports/content-status.md');

if (hasCritical(issues)) { console.error('\nValidation failed: critical issues block the build.'); process.exit(1); }
console.log('\nValidation passed (no critical issues).');
