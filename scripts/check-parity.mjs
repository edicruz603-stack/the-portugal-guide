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
import { readFileSync } from 'node:fs';

const dist = process.argv[2] ?? 'dist';
const PAGES = ['index.html', 'sintra.html', 'sintra-local-discoveries.html', 'sintra-romantic-guide.html', 'sintra-discoveries.html'];

// [page, legacy text, new text] — each pair must be justified in docs/phase-0-1-report.md
const ALLOWED = [
  ['sintra.html', 'Historic centre Hilltop and garden monuments', 'Main monuments Free stops'],
];

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

let failures = 0;
for (const page of PAGES) {
  const oldHtml = readFileSync(page, 'utf8');
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
console.log('\nEditorial parity: identical text, links and images on all pages (allowed changes: ' + ALLOWED.length + ').');
