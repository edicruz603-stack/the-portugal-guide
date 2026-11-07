#!/usr/bin/env node
/**
 * One-off Phase 1 migration: legacy root HTML pages -> Astro pages.
 *
 * - Editorial markup between </header> and <footer> is copied verbatim.
 * - Only colours and font stacks are re-pointed to the design tokens.
 * - Header, navigation and footer are replaced by shared components.
 * - The legacy files themselves are NOT modified (production keeps serving them).
 *
 * Re-running overwrites src/pages/*.astro and src/styles/legacy-*.css.
 * Kept in the repository so the reviewer can reproduce the port exactly.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const write = (p, s) => writeFileSync(new URL(p, root), s);

// ---- palette and font mapping (legacy -> tokens) ----
const HEX = {
  '#314a3a': 'var(--forest)', '#24382d': 'var(--forest-deep)', '#26352c': 'var(--forest-deep)',
  '#24392e': 'var(--forest-deep)', '#e9dfc9': 'var(--paper)', '#f4efe5': 'var(--ivory)',
  '#f5f0e5': 'var(--ivory)', '#f5efe3': 'var(--ivory)', '#f1eadc': 'var(--ivory)',
  '#a65f43': 'var(--gold-text)', '#d3b77d': 'var(--gold-light)', '#27352c': 'var(--ink)',
  '#6d7469': 'var(--muted)',
  // secondary text greys -> one accessible muted tone
  '#687267': 'var(--muted)', '#626b60': 'var(--muted)', '#596357': 'var(--muted)', '#59685d': 'var(--muted)',
  // hairline rules
  '#c8c0ad': 'var(--rule)', '#c8c0b0': 'var(--rule)', '#d1c5ad': 'var(--rule)',
  // form-control border (needs 3:1 against white)
  '#bcb7a8': 'var(--mist)',
};

/**
 * Page CSS may not redefine design tokens or restyle the shared header/footer.
 * - a page-level :root block is inlined into the page's own var() uses, then removed
 * - rules that target only shared-chrome selectors are dropped (selector lists are pruned)
 */
const CHROME = /\.(site-header|brand|brand-mark|main-nav|menu-toggle|nav-cta|footer|footer-inner|site-footer|local-foot)\b/;
function sanitisePageCss(css) {
  const root = css.match(/:root\s*\{([^}]*)\}/);
  if (root) {
    const vars = Object.fromEntries(root[1].split(';').map((d) => d.split(':').map((x) => x.trim())).filter((d) => d[0]?.startsWith('--')));
    css = css.replace(root[0], '');
    css = css.replace(/var\((--[a-z-]+)\)/g, (m, name) => (name in vars ? vars[name] : m));
  }
  // prune rule selectors (handles one level of @media nesting)
  const prune = (block) => block.replace(/([^{}]+)\{([^{}]*)\}/g, (m, sel, decl) => {
    if (/^\s*@/.test(sel)) return m;
    const keep = sel.split(',').map((x) => x.trim()).filter((x) => x && !CHROME.test(x));
    return keep.length ? `${keep.join(',')}{${decl}}` : '';
  });
  return prune(css).replace(/@media[^{]+\{\s*\}/g, '');
}
const RGBA = [
  [/rgba\(\s*49\s*,\s*74\s*,\s*58\s*,/g, 'rgba(31,58,45,'],
  [/rgba\(\s*166\s*,\s*95\s*,\s*67\s*,/g, 'rgba(126,106,51,'],
  [/rgba\(\s*211\s*,\s*183\s*,\s*125\s*,/g, 'rgba(205,181,122,'],
  [/rgba\(\s*233\s*,\s*223\s*,\s*201\s*,/g, 'rgba(235,226,204,'],
  [/rgba\(\s*24[45]\s*,\s*239\s*,\s*22[79]\s*,/g, 'rgba(244,238,223,'],
];
const FONTS = [
  [/'Playfair Display'\s*,\s*Georgia\s*,\s*serif/g, 'var(--font-serif)'],
  [/'Playfair Display'\s*,\s*serif/g, 'var(--font-serif)'],
  [/Georgia\s*,\s*serif/g, 'var(--font-serif)'],
  [/'DM Sans'\s*,\s*(sans-serif|Arial)/g, 'var(--font-sans)'],
];
function recolour(css) {
  let s = css.replace(/#[0-9a-fA-F]{6}\b/g, (h) => HEX[h.toLowerCase()] ?? h);
  for (const [re, to] of RGBA) s = s.replace(re, to);
  for (const [re, to] of FONTS) s = s.replace(re, to);
  return s;
}

// ---- shared base stylesheet ----
{
  let css = read('styles.css');
  css = css.replace(/:root\s*\{[\s\S]*?\}\s*/, ''); // tokens now live in tokens.css
  css = css.replace(/var\(--gold\)/g, 'var(--gold-light)'); // legacy gold was used on dark backgrounds
  css = recolour(css);
  write('src/styles/legacy-base.css',
    '/* Ported from legacy styles.css (Phase 1). Tokens replace hard-coded colours. */\n' + css);
}

// ---- pages ----
const PAGES = [
  {
    file: 'index.html', out: 'index.astro',
    nav: [['#destinations', 'Destinations'], ['#our-way', 'Our way'], ['#about', 'About']],
    cta: ['sintra.html', 'Explore the guides'],
  },
  {
    file: 'sintra.html', out: 'sintra.astro', bodyClass: 'guide-page',
    nav: [['index.html#destinations', 'Destinations'], ['index.html#our-way', 'Our way'], ['index.html#about', 'About']],
    cta: ['#day-plan', 'Plan your visit'],
    map: true, planner: true,
  },
  {
    file: 'sintra-local-discoveries.html', out: 'sintra-local-discoveries.astro',
    nav: [['sintra.html', 'Sintra field guide'], ['#free', 'Free discoveries'], ['#food', 'Eat & drink'], ['#events', "What's on"], ['sintra-romantic-guide.html', 'Romantic guide']],
    footerNoteFromLegacy: true,
  },
  {
    file: 'sintra-romantic-guide.html', out: 'sintra-romantic-guide.astro',
    nav: [['sintra.html', 'The Sintra field guide'], ['sintra-local-discoveries.html', 'Local discoveries'], ['#itineraries', 'Romantic itineraries']],
    cta: ['sintra.html#companion', 'Build your day'],
    footerLinks: [['sintra.html', 'The Sintra field guide'], ['sintra-local-discoveries.html', 'Local discoveries'], ['index.html', 'Home']],
  },
  {
    file: 'sintra-discoveries.html', out: 'sintra-discoveries.astro',
    nav: [['sintra.html', 'Sintra field guide'], ['#places', 'Discoveries'], ['#events', 'Seasonal diary']],
    filterScript: true,
  },
];

const js = (v) => JSON.stringify(v);

for (const p of PAGES) {
  const src = read(p.file);
  const title = src.match(/<title>([\s\S]*?)<\/title>/)[1].trim();
  const description = (src.match(/<meta name="description" content="([^"]*)"/) || [])[1] ?? '';
  const styles = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  const start = src.indexOf('</header>') + '</header>'.length;
  const end = src.indexOf('<footer');
  let body = src.slice(start, end).trim();

  body = recolour(body);
  // HTML hygiene only (renders identically): encode bare ampersands, explicit control types.
  body = body.replace(/&(?![a-zA-Z][a-zA-Z0-9]*;|#[0-9]+;|#x[0-9a-fA-F]+;)/g, '&amp;');
  body = body.replace(/<button(?![^>]*\btype=)/g, '<button type="button"');
  body = body.replace(/<input class="search"(?![^>]*\btype=)/g, '<input type="search" class="search"');
  // one <main> per page, made the skip-link target
  body = body.replace(/<main(\s[^>]*)?>/, (_m, a = '') => `<main id="main" tabindex="-1"${a}>`);

  let imports = [`import Base from '../layouts/Base.astro';`];
  let scripts = '';

  if (p.file === 'index.html') {
    // Destination cards -> data + reusable component (same markup, decorative art hidden from AT).
    const gridRe = /<div class="destination-grid">([\s\S]*?)<\/div>\s*<\/section>/;
    const grid = body.match(gridRe);
    if (!grid) throw new Error('destination grid not found');
    const cards = [...grid[1].matchAll(/<a class="destination-card( featured)?" href="([^"]*)">\s*<div class="destination-image ([a-z-]+)"[^>]*><\/div>\s*<div class="card-caption"><span>([^<]*)<\/span><span>↗<\/span><\/div>\s*<h3>([^<]*)<\/h3>\s*<p>([^<]*)<\/p>\s*(?:<span class="text-link">([^<]*)<span[^>]*>↗<\/span><\/span>)?\s*<\/a>/g)]
      .map((m) => ({ featured: !!m[1], href: m[2], art: m[3], label: m[4], name: m[5], summary: m[6], ...(m[7] ? { linkText: m[7].trim() } : {}) }));
    if (cards.length !== 5) throw new Error('expected 5 destination cards, got ' + cards.length);
    write('src/data/home-destinations.json', JSON.stringify(cards, null, 2) + '\n');
    body = body.replace(gridRe, () => `<div class="destination-grid">\n        {homeDestinations.map((d) => <DestinationCard {...d} />)}\n      </div>\n    </section>`);
    body = body.replace(/<div class="guide-art" role="img" aria-label="[^"]*"><\/div>/, '<div class="guide-art" aria-hidden="true"></div>');
    imports.push(`import DestinationCard from '../components/DestinationCard.astro';`);
    imports.push(`import homeDestinations from '../data/home-destinations.json';`);
  }

  if (p.map) {
    const re = /<div id="sintra-map"[^>]*><\/div>/;
    if (!re.test(body)) throw new Error('map container not found in ' + p.file);
    body = body.replace(re, '<MapView id="sintra-map" places={sintraMapPlaces} label="Interactive map of Sintra visitor areas" />');
    // Legend corrected to match the markers (legacy legend contradicted the marker colours).
    const legend = '<span><i class="map-dot"></i> Historic centre</span><span><i class="map-dot green"></i> Hilltop and garden monuments</span>';
    if (!body.includes(legend)) throw new Error('legacy map legend not found');
    body = body.replace(legend, '<span><i class="map-dot"></i> Main monuments</span><span><i class="map-dot green"></i> Free stops</span>');
    imports.push(`import MapView from '../components/MapView.astro';`);
    imports.push(`import { sintraMapPlaces } from '../data/sintra-map.ts';`);
  }
  if (p.planner) scripts += `\n<script>\n  import '../scripts/planner.ts';\n</script>\n`;
  if (p.filterScript) scripts += `\n<script>\n  import '../scripts/discoveries-filter.ts';\n</script>\n`;

  let footerNote = '';
  if (p.footerNoteFromLegacy) {
    const f = src.match(/<footer[^>]*>([\s\S]*?)<\/footer>/)[1];
    footerNote = recolour(f.replace(/^THE PORTUGAL GUIDE · Independent travel guides, made with care in Portugal\.<br>/, '')).trim();
  }

  const props = [
    `title=${js(title)}`,
    `description=${js(description)}`,
    `nav={${js(p.nav)}}`,
    p.cta ? `cta={${js(p.cta)}}` : '',
    p.bodyClass ? `bodyClass=${js(p.bodyClass)}` : '',
    p.footerLinks ? `footerLinks={${js(p.footerLinks)}}` : '',
  ].filter(Boolean).join('\n  ');

  const pageCss = styles.trim()
    ? `\n<style is:global>\n/* Page styles ported from legacy ${p.file}: colours/fonts re-pointed to tokens; token overrides and shared header/footer rules removed. */\n${recolour(sanitisePageCss(styles)).trim()}\n</style>\n`
    : '';

  const out = `---
// Ported from legacy /${p.file} by scripts/port-legacy.mjs (Phase 1).
// Editorial content is unchanged; see docs/phase-0-1-report.md.
${imports.join('\n')}
---
<Base
  ${props}
>
${body}
${footerNote ? `<Fragment slot="footer-note">${footerNote}</Fragment>\n` : ''}</Base>
${pageCss}${scripts}`;
  write('src/pages/' + p.out, out);
  console.log('ported', p.file, '->', 'src/pages/' + p.out);
}
