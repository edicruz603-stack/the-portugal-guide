#!/usr/bin/env node
/**
 * Editorial parity check: legacy root pages vs the built Astro pages.
 * Compares, for the content between </header> and <footer>:
 *   1. visible text (tags stripped, entities decoded, whitespace collapsed)
 *   2. the ordered list of link targets
 *   3. image sources and alt texts
 * Legacy footer sentences must also survive in the new page.
 * Intentional differences are listed in ALLOWED and must be justified in the PR report.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
import { validationDate, isEventActive } from '../src/lib/content/dates.ts';
import { plain } from '../src/lib/content/inline.ts';
const plainInline = (t) => plain(t).replace(/\s+/g, ' ').trim();

const dist = process.argv[2] ?? 'dist';
const PAGES = ['index.html', 'sintra.html', 'sintra-local-discoveries.html', 'sintra-romantic-guide.html', 'sintra-discoveries.html'];

// [page, legacy text, new text] — each pair must be justified in docs/phase-0-1-report.md
const ALLOWED = [
  ['sintra.html', 'Historic centre Hilltop and garden monuments', 'Main monuments Free stops'],
];

// Ended events. The new pages show a listed event only up to and including its last day (src/lib/content/dates.ts);
// the legacy pages are frozen. So for every listed event that has ended at the validation date, its legacy block is
// cut from the legacy side before comparing. The block is found by the event's own editorial title and must match
// exactly one legacy event block, so the exception cannot go stale or match loosely. Nothing is hard-coded here.
const today = validationDate(process.env);
const EVENT_PAGES = [
  // [page, list, block pattern, title field]
  ['sintra-local-discoveries.html', 'events-local', /<div class="event"><time>[\s\S]*?<\/div><\/div>/g, (e) => e.editorial.local.title],
  ['sintra-discoveries.html', 'events-directory', /<div class="event"><strong>[\s\S]*?<\/div>/g, (e) => e.editorial.directory.heading],
];
const sintra = new URL('../src/content/destinations/sintra/', import.meta.url);
const eventRecords = new Map(readdirSync(new URL('events/', sintra)).map((f) => parse(readFileSync(new URL(`events/${f}`, sintra), 'utf8'))).map((e) => [e.id, e]));
// Legacy footer taglines replaced by the single shared footer ("Independent travel guides, made with care in Portugal.")
const ALLOWED_FOOTER = ['Made with care in Portugal.', 'Independent field companions'];

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
const region = (html) => html.slice(html.indexOf('</header>') + 9, html.indexOf('<footer'));
const strip = (html) => decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const links = (html) => [...html.matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => decode(m[1]));
const imgs = (html) => [...html.matchAll(/<img\b[^>]*>/g)].map((m) => {
  const t = m[0];
  return `${decode((t.match(/src="([^"]*)"/) || [])[1] ?? '')} | ${decode((t.match(/alt="([^"]*)"/) || [])[1] ?? '')}`;
});
const footerText = (html) => strip((html.match(/<footer[\s\S]*?<\/footer>/) || [''])[0]);

const ENDED_BLOCKS = []; // [page, legacy block, event id]
const parityProblems = [];
for (const [page, listKey, pattern, title] of EVENT_PAGES) {
  const items = parse(readFileSync(new URL(`lists/${listKey}.yaml`, sintra), 'utf8')).items;
  const blocks = [...readFileSync(page, 'utf8').matchAll(pattern)].map((m) => m[0]);
  for (const id of items) {
    const e = eventRecords.get(id);
    if (!e) { parityProblems.push(`${page}: list item ${id} has no event record`); continue; }
    if (isEventActive(e, today)) continue;
    const want = plainInline(title(e));
    const hits = blocks.filter((b) => strip(b).includes(want));
    if (hits.length !== 1) { parityProblems.push(`${page}: ended event ${id} matches ${hits.length} legacy blocks (need exactly 1)`); continue; }
    ENDED_BLOCKS.push([page, hits[0], id]);
  }
}

let failures = parityProblems.length;
for (const p of parityProblems) console.log('✗ ' + p);
for (const page of PAGES) {
  let oldHtml = readFileSync(page, 'utf8');
  for (const [p, block] of ENDED_BLOCKS) if (p === page) oldHtml = oldHtml.replace(block, '');
  const newHtml = readFileSync(`${dist}/${page}`, 'utf8');
  let a = strip(region(oldHtml));
  let b = strip(region(newHtml));
  for (const [p, from, to] of ALLOWED) if (p === page) { a = a.replace(from, to); }

  const problems = [];
  if (a !== b) {
    let i = 0; while (i < a.length && a[i] === b[i]) i++;
    problems.push(`text differs at char ${i}:\n      legacy: …${a.slice(Math.max(0, i - 60), i + 80)}…\n      new:    …${b.slice(Math.max(0, i - 60), i + 80)}…`);
  }
  const la = links(region(oldHtml)), lb = links(region(newHtml));
  if (JSON.stringify(la) !== JSON.stringify(lb)) problems.push(`links differ:\n      legacy only: ${la.filter((x) => !lb.includes(x)).join(', ') || '(order)'}\n      new only:    ${lb.filter((x) => !la.includes(x)).join(', ') || '(order)'}`);
  // behaviour-bearing attributes: directory filter/search data and whether each link opens a new tab
  const attrs = (h) => JSON.stringify([
    [...h.matchAll(/data-search="([^"]*)"/g)].map((m) => decode(m[1])),
    [...h.matchAll(/data-type="([^"]*)"/g)].map((m) => m[1]),
    [...h.matchAll(/<a\b[^>]*\bhref="([^"]*)"([^>]*)>/g)].map((m) => decode(m[1]) + (/target="_blank"/.test(m[0]) ? ' [new tab]' : '')),
  ]);
  if (attrs(region(oldHtml)) !== attrs(region(newHtml))) problems.push('data-search / data-type / link-target attributes differ');
  const ia = imgs(region(oldHtml)), ib = imgs(region(newHtml));
  if (JSON.stringify(ia) !== JSON.stringify(ib)) problems.push('images or alt texts differ');

  // legacy footer sentences that carry editorial content must survive
  const nf = footerText(newHtml).toLowerCase();
  const oldFooter = footerText(oldHtml)
    .replace(/©\s*\d{0,4}\s*The Portugal Guide\.?( All rights reserved\.)?/g, ' ')
    .replace(/✳|THE PORTUGAL GUIDE ·?/g, ' ');
  for (const sentence of oldFooter.split(/(?<=\.)\s+|<br>/)) {
    const s = sentence.replace(/\s+/g, ' ').trim();
    if (s.length < 12 || ALLOWED_FOOTER.includes(s)) continue;
    if (!nf.includes(s.toLowerCase())) problems.push(`footer sentence missing: "${s}"`);
  }

  console.log(`${problems.length ? '✗' : '✓'} ${page}: ${a.split(' ').length} words, ${la.length} links, ${ia.length} images`);
  for (const p of problems) console.log('    ' + p);
  failures += problems.length;
}
if (failures) { console.error(`\nParity check failed (${failures} problem(s)).`); process.exit(1); }
console.log('\nEditorial parity: identical text, links and images on all pages (validation date ' + today + '; allowed changes: ' + ALLOWED.length + ' text; ended events hidden: ' + (ENDED_BLOCKS.map(([p, , id]) => `${id} on ${p}`).join(', ') || 'none') + ').');
