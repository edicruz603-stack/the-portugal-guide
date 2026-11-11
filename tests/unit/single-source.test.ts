/**
 * Acceptance: one canonical dataset. No file in src/ outside src/content/destinations may hold
 * place IDs or a list of places; pages contain no place-card markup and no place data.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadContentFromDisk } from '../../src/lib/content/load-fs.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/<!--[\s\S]*?-->/g, '');
/**
 * Documented exceptions:
 * - src/content/ids.lock.json: the immutability register must list every ID.
 * - src/lib/planner/legacy-plan.ts: the approved legacy planner's advice sentences mention places by name;
 *   it is prose, not a place list, and becomes data-driven in M6 (planner v2).
 */
const EXCEPTIONS = [join('src', 'content', 'ids.lock.json'), join('src', 'lib', 'planner', 'legacy-plan.ts')];
const files = walk(join(root, 'src')).filter((f) => !f.includes(`${join('src', 'content', 'destinations')}`) && /\.(astro|ts|mjs|js|json|ya?ml)$/.test(f) && !EXCEPTIONS.some((e) => f.endsWith(e)));

describe('single source of truth for places', () => {
  it('no place IDs outside the canonical dataset', () => {
    const offenders = files.filter((f) => /['"`]place\.[a-z0-9-]+\.[a-z0-9-]+/.test(stripComments(readFileSync(f, 'utf8')))).map((f) => relative(root, f));
    expect(offenders).toEqual([]);
  });

  it('no data file outside the dataset lists place names', () => {
    const names = (loadContentFromDisk(root).places as { name: { aliases: string[] } }[]).flatMap((p) => p.name.aliases).filter((n) => n.length > 6);
    const dataFiles = files.filter((f) => f.includes(join('src', 'data')) || f.includes(join('src', 'lib')) || f.includes(join('src', 'scripts')));
    const offenders = dataFiles.flatMap((f) => {
      const src = stripComments(readFileSync(f, 'utf8'));
      return names.filter((n) => src.includes(n)).map((n) => `${relative(root, f)}: ${n}`);
    });
    expect(offenders).toEqual([]);
  });

  it('pages contain no place-card markup', () => {
    const pages = files.filter((f) => f.includes(join('src', 'pages')));
    for (const f of pages) expect(readFileSync(f, 'utf8'), relative(root, f)).not.toMatch(/<article class="(place|item|food-card)"/);
  });

  it('the Phase 1 map data file is gone', () => {
    expect(files.some((f) => f.endsWith(join('src', 'data', 'sintra-map.ts')))).toBe(false);
  });
});
