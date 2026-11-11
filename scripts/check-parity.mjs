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

// [page, exact legacy HTML block] — legacy blocks intentionally removed from the new page.
// Each block must still exist verbatim in the legacy file (so an exception can never go stale or match loosely),
// and is cut from the legacy side before every comparison (text, links, attributes, images).
// M2 review (11 Nov 2026): events that had ended were taken off the active seasonal lists; the event records stay
// in src/content/destinations/sintra/events/ as history. Justified in docs/m2-report.md §9.
const ALLOWED_REMOVED = [
  ['sintra-local-discoveries.html', `<div class="event"><time>6 Nov 2026 · 21:00</time><div><h3>TAXI · Centro Cultural Olga Cadaval</h3><p>A live concert by the Portuguese band TAXI in Sintra. Check the venue's ticketing and event details before making plans. <a href="https://agendaculturaldesintra.pt/agenda">Official cultural agenda ↗</a></p></div></div>`],
  ['sintra-local-discoveries.html', `<div class="event"><time>7 Nov 2026 · 10:00</time><div><h3>Wine journey between Sintra and Colares</h3><p>A guided visit announced by Sintra Municipality and Adega Regional de Colares for World Wine Tourism Day. Booking requirements and availability apply; confirm with the organiser. <a href="https://cm-sintra.pt/agenda">Municipal event details ↗</a></p></div></div>`],
  ['sintra-discoveries.html', `<div class="event"><strong>31 Oct · A mystery afternoon at the Archaeological Museum of São Miguel de Odrinhas</strong><p>A themed history and mystery activity. Check age suitability and admission details with the organiser.</p></div>`],
  ['sintra-discoveries.html', `<div class="event"><strong>6 Nov · TAXI at Centro Cultural Olga Cadaval</strong><p>Portuguese rock concert, listed for 21:00.</p></div>`],
  ['sintra-discoveries.html', `<div class="event"><strong>7 Nov · Sintra and Colares wine heritage visit</strong><p>A guided wine-themed event at Adega Regional de Colares, listed for 10:00. Booking requirements should be confirmed.</p></div>`],
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
  let oldHtml = readFileSync(page, 'utf8');
  for (const [p, block] of ALLOWED_REMOVED) if (p === page) {
    if (!oldHtml.includes(block)) { console.log(`✗ ${page}: allowed removal not found in legacy page:\n    ${block.slice(0, 100)}…`); failures++; continue; }
    oldHtml = oldHtml.replace(block, '');
  }
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
console.log('\nEditorial parity: identical text, links and images on all pages (allowed changes: ' + ALLOWED.length + ' text, ' + ALLOWED_REMOVED.length + ' removed legacy blocks).');
