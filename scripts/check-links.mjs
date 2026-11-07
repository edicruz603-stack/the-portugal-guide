#!/usr/bin/env node
/**
 * Internal link checker for the built site (no network).
 * Checks every href/src that points inside the site: the file must exist, and any #fragment
 * must match an id on the target page. External links are listed, not fetched.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, normalize, relative } from 'node:path';

const dist = process.argv[2] ?? 'dist';
const base = (process.env.BASE_PATH ?? '/the-portugal-guide').replace(/\/$/, '');

const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const html = walk(dist).filter((f) => f.endsWith('.html'));
const ids = new Map(html.map((f) => [normalize(f), new Set([...readFileSync(f, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));

const errors = [];
const external = new Set();
let checked = 0;

for (const file of html) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/\s(?:href|src)="([^"]*)"/g)) {
    const raw = m[1].replace(/&amp;/g, '&');
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(raw) || raw.startsWith('//')) { if (raw.startsWith('http')) external.add(raw); continue; }
    checked++;
    const [pathPart, frag] = raw.split('#');
    let target;
    if (pathPart === '') target = normalize(file);
    else if (pathPart.startsWith('/')) {
      if (!pathPart.startsWith(base + '/') && pathPart !== base) { errors.push(`${relative(dist, file)}: absolute link outside base path: ${raw}`); continue; }
      target = normalize(join(dist, pathPart.slice(base.length).split('?')[0]));
    } else target = normalize(join(dirname(file), pathPart.split('?')[0]));
    if (existsSync(target) && statSync(target).isDirectory()) target = join(target, 'index.html');
    if (!existsSync(target)) { errors.push(`${relative(dist, file)}: missing target ${raw}`); continue; }
    if (frag && target.endsWith('.html') && !ids.get(normalize(target))?.has(decodeURIComponent(frag))) {
      errors.push(`${relative(dist, file)}: missing anchor #${frag} in ${relative(dist, target)}`);
    }
  }
}

console.log(`Internal links checked: ${checked} across ${html.length} pages; external links listed (not fetched): ${external.size}`);
if (errors.length) { console.error(errors.map((e) => '  ✗ ' + e).join('\n')); process.exit(1); }
console.log('No broken internal links.');
