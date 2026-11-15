#!/usr/bin/env node
/**
 * One-off M2 migration: reads the six independent Sintra place lists from the Phase 1 pages and
 * writes one canonical YAML file per place, plus the ordered lists that pages now render from.
 *
 * Editorial text is copied verbatim (HTML <strong>/<em> become **…** / *…*; entities decoded).
 * Every heading found in a list must map to exactly one place ID in VARIANTS, or the script stops.
 * Facts are NOT written here: they are authored with sources in src/content/destinations/sintra/facts/.
 *
 * Kept as a record: it read the Phase 1 pages and src/data/sintra-map.ts (commit 0eadbee), both replaced by M2.
 * files are the source of truth and this script must not be re-run over edited content.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import YAML from 'yaml';

const root = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const OUT = 'src/content/destinations/sintra/';

// ---------------------------------------------------------------- name variants -> stable IDs
// Hand-checked: every legacy heading, in every list, and the place it refers to.
const VARIANTS = {
  'Palácio Nacional da Pena': 'pena-palace', 'Palácio da Pena': 'pena-palace', 'Pena Palace & Park': 'pena-palace', 'Palácio da Pena · visitor entrance': 'pena-palace',
  'Quinta da Regaleira': 'quinta-da-regaleira',
  'Castelo dos Mouros': 'moorish-castle', 'Moorish Castle': 'moorish-castle',
  'Palácio Nacional de Sintra': 'national-palace', 'National Palace': 'national-palace',
  'Palácio de Monserrate': 'monserrate', 'Monserrate Palace': 'monserrate', 'Monserrate Palace & Park': 'monserrate',
  'Palácio Biester': 'biester-palace',
  'Convento dos Capuchos': 'capuchos-convent', 'Convent of the Capuchos': 'capuchos-convent',
  'Chalet da Condessa d’Edla': 'chalet-countess-edla', 'Chalet of the Countess of Edla': 'chalet-countess-edla',
  'Museu Anjos Teixeira': 'museu-anjos-teixeira', 'Museu Anjos Teixeira · free': 'museu-anjos-teixeira',
  'Museu de História Natural': 'natural-history-museum', 'Museu de História Natural de Sintra': 'natural-history-museum',
  'Museu Ferreira de Castro': 'museu-ferreira-de-castro',
  'Parque da Liberdade': 'parque-da-liberdade', 'Parque da Liberdade · free': 'parque-da-liberdade',
  'Jardins do Palácio Nacional': 'national-palace-gardens', 'National Palace gardens': 'national-palace-gardens', 'Gardens of the National Palace': 'national-palace-gardens',
  'Palácio Nacional de Sintra · gardens (free entry)': 'national-palace-gardens',
  'Miradouro de Santa Eufémia': 'miradouro-santa-eufemia',
  'Miradouro de São Martinho': 'miradouro-sao-martinho', 'Miradouro do Adro de São Martinho': 'miradouro-sao-martinho', 'Miradouro do Adro de São Martinho · free': 'miradouro-sao-martinho',
  'Vila Sassetti': 'villa-sassetti', 'Vila Sassetti · free garden path': 'villa-sassetti',
  'Lawrence’s Hotel': 'lawrences-hotel', "Lawrence's Hotel": 'lawrences-hotel',
  'Historic Centre': 'historic-centre', "Sintra's historic centre": 'historic-centre',
  'Train Station': 'sintra-station',
  'Café Saudade': 'cafe-saudade', 'Casa Piriquita': 'casa-piriquita', 'Queijadas da Sapa': 'queijadas-da-sapa',
  'Dona Estefânia': 'dona-estefania', 'Tascantiga': 'tascantiga', 'Romaria de Baco': 'romaria-de-baco',
  'Restaurante Regional de Sintra': 'restaurante-regional', 'Apeadeiro': 'apeadeiro', 'Metamorphosis': 'metamorphosis',
  'Cajó': 'cajo', 'Tacho Real': 'tacho-real', 'Mela Canela': 'mela-canela', 'Loja 5': 'loja-5',
  'Bacalhau na Vila': 'bacalhau-na-vila', 'Incomum by Luís Santos': 'incomum',
};
const resolve = (name, where) => {
  const key = VARIANTS[name];
  if (!key) throw new Error(`No ID for "${name}" in ${where}`);
  return key;
};

// ---------------------------------------------------------------- HTML -> editorial text
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');
function text(html, where) {
  let s = html.replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**').replace(/<em>([\s\S]*?)<\/em>/g, '*$1*');
  if (/<[a-z/]/i.test(s)) throw new Error(`Unexpected markup in ${where}: ${s.slice(0, 120)}`);
  return decode(s);
}
const links = (html) => [...html.matchAll(/<a href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
  label: text(m[3], 'link'), href: decode(m[1]), external: /target="_blank"/.test(m[2]),
}));

// ---------------------------------------------------------------- collect
const places = {};           // key -> { names:Set, editorial:{} }
const lists = {};            // list key -> { title, context, items:[] }
const P = (key) => (places[key] ??= { names: new Set(), editorial: {} });
const addList = (key, title, context) => (lists[key] = { title, context, items: [] });
function put(key, context, value, listKey, name) {
  const p = P(key);
  if (p.editorial[context]) throw new Error(`${key} already has ${context}`);
  p.editorial[context] = value;
  p.names.add(name);
  lists[listKey].items.push(key);
}

// 1. Discoveries directory
{
  const s = read('src/pages/sintra-discoveries.astro');
  addList('directory', 'Discoveries directory', 'directory');
  for (const m of s.matchAll(/<article class="place" data-type="([^"]+)" data-search="[^"]*"><div class="meta">([\s\S]*?)<\/div><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p><div class="links">([\s\S]*?)<\/div><\/article>/g)) {
    const title = text(m[3], 'directory h3');
    put(resolve(title, 'directory'), 'directory', { filter: m[1], meta: text(m[2], 'meta'), title, text: text(m[4], 'p'), links: links(m[5]) }, 'directory', title);
  }
}
// 2. Local discoveries: free and food sections
{
  const s = read('src/pages/sintra-local-discoveries.astro');
  for (const [sec, listKey, title] of [['free', 'local-free', 'Local discoveries · free'], ['food', 'local-food', 'Local discoveries · food and drink']]) {
    const body = s.match(new RegExp(`<section[^>]*id="${sec}"[\\s\\S]*?</section>`))[0];
    addList(listKey, title, 'local');
    for (const m of body.matchAll(/<article class="item"><span class="tag">([\s\S]*?)<\/span><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>([\s\S]*?)<\/article>/g)) {
      const t = text(m[2], 'local h3');
      put(resolve(t, 'local'), 'local', { tag: text(m[1], 'tag'), title: t, text: text(m[3], 'local p'), links: links(m[4]) }, listKey, t);
    }
  }
}
// 3. Field guide: highlights, free cards, tickets card, food cards, map links
{
  const s = read('src/pages/sintra.astro');
  const section = (id) => s.match(new RegExp(`<section[^>]*id="${id}"[\\s\\S]*?</section>`))[0];
  const cards = (body) => [...body.matchAll(/<article class="highlight-card"><span class="highlight-no">([\s\S]*?)<\/span><h3>([\s\S]*?)<\/h3>([\s\S]*?)<\/article>/g)];
  const paras = (inner) => [...inner.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => text(m[1], 'field guide p'));
  const tail = (inner) => links(inner.replace(/<p>[\s\S]*?<\/p>/g, ''));
  for (const [sec, listKey, title, ctx] of [['highlights', 'field-guide-highlights', 'Field guide · four places', 'field_guide'], ['free-sintra', 'field-guide-free', 'Field guide · free discoveries', 'field_guide']]) {
    addList(listKey, title, ctx);
    for (const m of cards(section(sec))) {
      const t = text(m[2], 'card h3');
      put(resolve(t, sec), ctx, { label: text(m[1], 'label'), title: t, paragraphs: paras(m[3]), links: tail(m[3]) }, listKey, t);
    }
  }
  addList('field-guide-tickets', 'Field guide · ticket cards for single places', 'field_guide_tickets');
  for (const m of cards(section('tickets'))) {
    const t = text(m[2], 'ticket h3');
    if (!VARIANTS[t]) continue; // "Signature monuments" covers several places: stays page prose
    put(resolve(t, 'tickets'), 'field_guide_tickets', { label: text(m[1], 'label'), title: t, paragraphs: paras(m[3]), links: tail(m[3]) }, 'field-guide-tickets', t);
  }
  addList('field-guide-food', 'Field guide · food stops', 'food_card');
  for (const m of section('food-stops').matchAll(/<article class="food-card"><h3>([\s\S]*?)<\/h3>([\s\S]*?)<\/article>/g)) {
    const t = text(m[1], 'food h3');
    put(resolve(t, 'food'), 'food_card', { title: t, paragraphs: paras(m[2]), links: tail(m[2]) }, 'field-guide-food', t);
  }
  addList('map-links', 'Field guide · map and directions links', 'map_link');
  for (const m of section('map').matchAll(/<a href="(https:\/\/www\.google\.com\/maps[^"]*)"[^>]*><span>([\s\S]*?)<\/span><small>Map and directions ↗<\/small><\/a>/g)) {
    const t = text(m[2], 'map link');
    put(resolve(t, 'map links'), 'map_link', { title: t, href: decode(m[1]) }, 'map-links', t);
  }
}
// 4. Romantic guide place cards (the six that are about one place)
{
  const s = read('src/pages/sintra-romantic-guide.astro');
  addList('romantic', 'Romantic guide · places with atmosphere', 'romantic');
  for (const m of s.matchAll(/<article class="card"><span class="number">([\s\S]*?)<\/span><h3>([\s\S]*?)<\/h3><p>([\s\S]*?)<\/p>(?:<p class="meta">([\s\S]*?)<\/p>)?([\s\S]*?)<\/article>/g)) {
    const t = text(m[2], 'romantic h3');
    if (!VARIANTS[t]) continue; // advice cards (meals, pastries, mist, quiet moment) are page prose
    const v = { label: text(m[1], 'number'), title: t, text: text(m[3], 'romantic p'), links: links(m[5]) };
    if (m[4]) v.meta = text(m[4], 'romantic meta');
    put(resolve(t, 'romantic'), 'romantic', v, 'romantic', t);
  }
}
// 5. Interactive map markers (Phase 1 data file)
const mapSrc = read('src/data/sintra-map.ts');
const markers = [...mapSrc.matchAll(/\{ id: '([^']+)', name: '([^']+)', zone: '([^']+)', lat: ([\d.-]+), lon: ([\d.-]+), category: '(\w+)'/g)]
  .map((m) => ({ id: m[1], name: m[2], zone: m[3], lat: +m[4], lon: +m[5], category: m[6] }));
addList('map', 'Interactive map markers', 'map');

// ---------------------------------------------------------------- write
mkdirSync(new URL(OUT + 'places/', root), { recursive: true });
mkdirSync(new URL(OUT + 'lists/', root), { recursive: true });
const meta = JSON.parse(read('scripts/migrations/m2-place-meta.json')); // kind, zone, official name, part_of — hand-authored
for (const mk of markers) {
  const key = resolve(mk.name, 'map');
  // national-palace-gardens: the legacy marker uses the palace's official coordinates (parent place)
  const factPlace = meta[key].map_fact === 'USE_PARENT' ? meta[key].part_of : key;
  const factKey = meta[key].map_fact === 'USE_PARENT' ? 'coordinates' : meta[key].map_fact;
  meta[key].map = { coordinates: `fact.sintra.${factPlace}.${factKey}`, category: mk.category, label: mk.name, zone_label: mk.zone };
  P(key).names.add(mk.name);
  lists.map.items.push(key);
}
const doc = (o) => new YAML.Document(o, { lineWidth: 0 }).toString({ lineWidth: 0 });
for (const key of Object.keys(meta)) {
  const m = meta[key];
  const p = places[key] ?? { names: new Set(), editorial: {} };
  const record = {
    id: `place.sintra.${key}`,
    destination: 'destination.sintra',
    kind: m.kind,
    ...(m.zone ? { zone: `zone.sintra.${m.zone}` } : {}),
    ...(m.part_of ? { part_of: `place.sintra.${m.part_of}` } : {}),
    name: { ...(m.official ? { official: m.official, official_source: m.official_source } : {}), aliases: [...new Set([...p.names, ...(m.aliases ?? [])])] },
    ...(m.map ? { map: m.map } : {}),
    editorial: p.editorial,
  };
  const file = new URL(`${OUT}places/${key}.yaml`, root);
  if (existsSync(file)) throw new Error(`${key}.yaml exists — migration already ran; edit the YAML instead`);
  writeFileSync(file, doc(record));
}
for (const [key, l] of Object.entries(lists)) {
  writeFileSync(new URL(`${OUT}lists/${key}.yaml`, root), doc({
    id: `list.sintra.${key}`, destination: 'destination.sintra', title: l.title, context: l.context,
    items: l.items.map((k) => `place.sintra.${k}`),
  }));
}
const unused = Object.keys(places).filter((k) => !meta[k]);
if (unused.length) throw new Error('places without meta: ' + unused);
console.log(`places: ${Object.keys(meta).length} · lists: ${Object.keys(lists).length} · list entries: ${Object.values(lists).reduce((n, l) => n + l.items.length, 0)}`);
for (const [k, l] of Object.entries(lists)) console.log(`  ${k}: ${l.items.length}`);
