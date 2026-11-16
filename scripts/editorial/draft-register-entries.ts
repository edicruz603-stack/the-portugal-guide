/**
 * Drafts register entries for the visible differences between the legacy pages and a build (M3 helper).
 *   node --experimental-strip-types scripts/editorial/draft-register-entries.ts [dist]
 * Prints YAML for review; it never writes the register. Each draft still needs a reason and the owner's
 * approval reference before it goes into src/content/editorial-changes.yaml.
 * `before` is extended word by word until it occurs exactly once in the legacy text.
 */
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { EditorialRegisterSchema, applyTextChanges, PARITY_PAGES } from '../../src/lib/editorial/register.ts';
import { region, strip } from '../../src/lib/editorial/parity-text.ts';

const dist = process.argv[2] ?? 'dist';
const register = EditorialRegisterSchema.parse(parse(readFileSync(new URL('../../src/content/editorial-changes.yaml', import.meta.url), 'utf8')));
const count = (hay: string, n: string) => hay.split(n).length - 1;

for (const page of PARITY_PAGES) {
  const next = strip(region(readFileSync(`${dist}/${page}`, 'utf8')));
  const legacy = applyTextChanges(page, strip(region(readFileSync(page, 'utf8'))), next, register.changes).text;
  const a = legacy.split(' '), b = next.split(' ');
  let i = 0;
  const out: string[] = [];
  while (i < a.length || i < b.length) {
    // walk forward to the next difference, then find where both sequences meet again
    let s = 0; while (s < a.length && s < b.length && a[s] === b[s]) s++;
    if (s >= a.length && s >= b.length) break;
    let found: [number, number] | null = null;
    for (let d = 1; !found && d < 400; d++) for (let x = 0; x <= d; x++) {
      const ia = s + x, ib = s + (d - x);
      if (ia <= a.length && ib <= b.length && a.slice(ia, ia + 6).join(' ') === b.slice(ib, ib + 6).join(' ') && ia + 6 <= a.length) { found = [ia, ib]; break; }
    }
    if (!found) { out.push(`# ${page}: could not resynchronise after word ${s}`); break; }
    let k = 3, before = '', after = '';
    for (; k < 60; k++) {
      before = a.slice(Math.max(0, s - k), found[0]).join(' ');
      if (count(legacy, before) === 1) break;
    }
    after = b.slice(Math.max(0, s - k), found[1]).join(' ');
    out.push(`  - id: change.sintra.TODO\n    page: ${page}\n    content_id: TODO\n    kind: text\n    before: ${JSON.stringify(before)}\n    after: ${JSON.stringify(after)}\n    reason: TODO\n    approval:\n      ref: TODO\n      date: 'TODO'`);
    a.splice(0, found[0]); b.splice(0, found[1]);
    i = 0;
  }
  if (out.length) console.log(`# ${page}\n${out.join('\n')}`);
}
