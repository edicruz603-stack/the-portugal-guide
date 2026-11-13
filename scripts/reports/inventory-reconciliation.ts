/**
 * Place inventory reconciliation (M2 final review, 13 Nov 2026).
 *   npm run report:inventory   writes docs/content/sintra-inventory-reconciliation.md; exit 1 on any gap
 *
 * Sources compared with src/content/destinations/sintra/places/:
 *   - the five legacy website pages (root *.html, frozen copy of production)
 *   - the place lists the website had (now src/content/destinations/sintra/lists/, proven identical by test:parity)
 *   - PDF "Sintra 2026 Edition" (owner upload, text in docs/content/reference/pdf-2026-edition.txt)
 *   - PDF "Sintra Beyond the Palaces, First Edition v1.0" (text in docs/content/reference/pdf-first-edition-v1.0.txt)
 *
 * Checks (each failure is printed and makes the script exit 1):
 *   1. every place record is found in at least one source
 *   2. every PDF chapter maps to place records that exist
 *   3. every place-like name that is NOT a record is classified below (EDITORIAL_ELEMENTS) and really occurs
 *      where stated, and does not match any place record's search terms
 * Nothing here creates or changes content.
 */
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

const root = new URL('../../', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, root), 'utf8');
const placesDir = 'src/content/destinations/sintra/places/';
const listsDir = 'src/content/destinations/sintra/lists/';

type Rec = Record<string, any>;
const places: Rec[] = readdirSync(new URL(placesDir, root)).sort().map((f) => ({ ...parse(read(placesDir + f)), file: placesDir + f }));
const lists: Rec[] = readdirSync(new URL(listsDir, root)).sort().map((f) => parse(read(listsDir + f)));
const byId = new Map(places.map((p) => [p.id, p]));

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'").replace(/&/g, 'and').toLowerCase().replace(/\s+/g, ' ');
const stripHtml = (h: string) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&#x27;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

/** English/PT names the sources use that are not stored as aliases (aliases hold only legacy website variants). */
const EXTRA_TERMS: Record<string, string[]> = {
  'place.sintra.national-palace': ['National Palace of Sintra', 'National Palace'],
  'place.sintra.national-palace-gardens': ['National Palace gardens', 'gardens of the National Palace'],
  'place.sintra.pena-palace': ['Pena Palace', 'Pena Palace and Park', 'Pena and its park'],
  'place.sintra.moorish-castle': ['Moorish Castle', 'Castelo dos Mouros'],
  'place.sintra.sao-pedro-de-canaferrim': ['Canaferrim'],
  'place.sintra.quinta-da-regaleira': ['Quinta da Regaleira', 'Regaleira'],
  'place.sintra.monserrate': ['Monserrate'],
  'place.sintra.capuchos-convent': ['Convent of the Capuchos', 'Capuchos'],
  'place.sintra.cabo-da-roca': ['Cabo da Roca'],
  'place.sintra.cabo-da-roca-lighthouse': ['Cabo da Roca Lighthouse', 'lighthouse'],
  'place.sintra.colares': ['Colares'],
  'place.sintra.adega-regional-de-colares': ['Adega Regional de Colares', 'Adega Regional'],
  'place.sintra.museu-do-bonsai': ['Museu do Bonsai', 'Bonsai Museum'],
  'place.sintra.historic-centre': ['historic centre', 'old town'],
  'place.sintra.sintra-station': ['Sintra station', 'Sintra Train Station'],
  'place.sintra.chalet-countess-edla': ['Countess of Edla', 'Chalet'],
  'place.sintra.villa-sassetti': ['Villa Sassetti', 'Vila Sassetti'],
  'place.sintra.miradouro-santa-eufemia': ['Santa Eufémia'],
  'place.sintra.miradouro-sao-martinho': ['São Martinho viewpoint', 'Miradouro de São Martinho'],
  'place.sintra.museu-anjos-teixeira': ['Anjos Teixeira'],
  'place.sintra.parque-da-liberdade': ['Parque da Liberdade'],
  'place.sintra.natural-history-museum': ['Natural History Museum', 'Museu de História Natural'],
  'place.sintra.lawrences-hotel': ['Lawrence’s Hotel', "Lawrence's"],
  'place.sintra.biester-palace': ['Biester'],
  'place.sintra.museu-ferreira-de-castro': ['Museu Ferreira de Castro'],
};

function termsOf(p: Rec): string[] {
  const t = new Set<string>([p.name?.official, ...(p.name?.aliases ?? []), ...(EXTRA_TERMS[p.id] ?? [])].filter(Boolean));
  for (const ctx of Object.values<Rec>(p.editorial ?? {})) for (const k of ['title', 'name', 'heading']) if (typeof ctx?.[k] === 'string') t.add(ctx[k].replace(/\*/g, ''));
  return [...t].filter((x) => x.trim().length >= 4);
}
const terms = new Map(places.map((p) => [p.id, termsOf(p).map(norm)]));

// ---- sources, split in pages so presence can be cited
const WEBSITE = ['index.html', 'sintra.html', 'sintra-discoveries.html', 'sintra-local-discoveries.html', 'sintra-romantic-guide.html'];
const site = WEBSITE.map((f) => ({ ref: f, text: norm(stripHtml(read(f))) }));
const pdf2026 = read('docs/content/reference/pdf-2026-edition.txt').split(/(?=THE PORTUGAL GUIDE · SINTRA \d+\n)/).map((t, i) => ({ ref: `p.${i + 1}`, text: norm(t) }));
const pdfFE = read('docs/content/reference/pdf-first-edition-v1.0.txt').split('\f').map((t, i) => ({ ref: `p.${i + 1}`, text: norm(t) })).filter((p) => p.text.trim());

const hits = (id: string, src: { ref: string; text: string }[]) => src.filter((s) => terms.get(id)!.some((t) => s.text.includes(t))).map((s) => s.ref);
// the two-word term "Chalet" / "lighthouse" / "Colares" also match inside longer names; presence is per page, never per word count

// ---- PDF chapters (as printed in each edition's contents) → records
const CHAPTERS_2026: [string, string[]][] = [
  ['p.5 The historic centre', ['place.sintra.historic-centre']],
  ['p.6 National Palace of Sintra', ['place.sintra.national-palace']],
  ['p.7 Pena Palace and Park', ['place.sintra.pena-palace']],
  ['p.8 The Moorish Castle (incl. São Pedro de Canaferrim)', ['place.sintra.moorish-castle', 'place.sintra.sao-pedro-de-canaferrim']],
  ['p.9 Quinta da Regaleira', ['place.sintra.quinta-da-regaleira']],
  ['p.10 Monserrate Palace and Park', ['place.sintra.monserrate']],
  ['p.11 Beyond the headline sights: Convent of the Capuchos', ['place.sintra.capuchos-convent']],
  ['p.11 Beyond the headline sights: Cabo da Roca', ['place.sintra.cabo-da-roca']],
];
const CHAPTERS_FE: [string, string[]][] = [
  ['Ch.1 National Palace and old town (pp.6–7)', ['place.sintra.national-palace', 'place.sintra.historic-centre']],
  ['Ch.2 Pena Palace and Park (pp.8–9)', ['place.sintra.pena-palace']],
  ['Ch.3 Moorish Castle and São Pedro de Canaferrim (pp.10–11)', ['place.sintra.moorish-castle', 'place.sintra.sao-pedro-de-canaferrim']],
  ['Ch.4 Quinta da Regaleira (pp.12–13)', ['place.sintra.quinta-da-regaleira']],
  ['Ch.5 Monserrate Palace and Park (pp.14–15)', ['place.sintra.monserrate']],
  ['Ch.6 Convent of the Capuchos (p.16)', ['place.sintra.capuchos-convent']],
  ['Ch.7 Colares and its sand-grown wine (p.17)', ['place.sintra.colares', 'place.sintra.adega-regional-de-colares']],
  ['Ch.8 Cabo da Roca (p.18)', ['place.sintra.cabo-da-roca', 'place.sintra.cabo-da-roca-lighthouse']],
  ['Ch.9 Hidden gems: Museu do Bonsai (p.19)', ['place.sintra.museu-do-bonsai']],
  ['On foot, and small discoveries (p.20)', ['place.sintra.villa-sassetti', 'place.sintra.chalet-countess-edla', 'place.sintra.museu-anjos-teixeira', 'place.sintra.parque-da-liberdade', 'place.sintra.miradouro-sao-martinho']],
];

/**
 * Place-like names in the sources that are deliberately NOT place records. Each is checked to occur where stated.
 * Decision for all: editorial element (kept as text in its page/chapter or in an event's venue field).
 */
const EDITORIAL_ELEMENTS: { name: string; term: string; where: ('website' | 'pdf2026' | 'pdfFE')[]; role: string; reason: string }[] = [
  { name: 'Palace of Seteais', term: 'Seteais', where: ['pdf2026', 'pdfFE'], role: 'bus 435 stop, start of the Seteais trail, "towards the Seteais side" in the town walk', reason: 'Never presented as a visit: no chapter, card, hours, price or map marker in any edition. Candidate place for M3/M4 if the editors want it (decision open).' },
  { name: 'Interpretation Centre (Moorish Castle)', term: 'Interpretation Centre', where: ['pdf2026', 'pdfFE'], role: 'exhibition inside the castle (in the former church of São Pedro de Canaferrim)', reason: 'Part of the castle visit; covered by place.sintra.moorish-castle / sao-pedro-de-canaferrim.' },
  { name: 'Initiation Well (Regaleira)', term: 'Initiation Well', where: ['website'], role: 'feature of Quinta da Regaleira', reason: 'Feature inside the estate, same ticket; editorial detail of place.sintra.quinta-da-regaleira.' },
  { name: 'Casa do Gerador (Regaleira)', term: 'Casa do Gerador', where: ['pdfFE'], role: 'exhibitions inside the estate, free with the ticket', reason: 'Feature inside the estate; editorial detail of place.sintra.quinta-da-regaleira.' },
  { name: 'Farmyard of Monserrate', term: 'Farmyard of Monserrate', where: ['pdfFE'], role: 'part of the Monserrate park, 850 m east of the entrance', reason: 'Inside the park, same ticket; editorial detail of place.sintra.monserrate.' },
  { name: 'Chapel of Santa Eufémia', term: 'Chapel of Santa Eufémia', where: ['website'], role: 'chapel beside the viewpoint', reason: 'Described only as the setting of place.sintra.miradouro-santa-eufemia.' },
  { name: 'Info Parques de Sintra (São Pedro de Sintra)', term: 'Info Parques de Sintra', where: ['pdfFE'], role: 'start of the Santa Maria trail', reason: 'Trailhead / information point, not a visit.' },
  { name: 'Marked trails (Santa Maria, Seteais, Villa Sassetti, PR8 Colares Wine)', term: 'Santa Maria Trail', where: ['pdfFE'], role: 'official walking trails', reason: 'Routes, not places; belong to the M5 route layers.' },
  { name: 'Viúva Gomes', term: 'Viúva Gomes', where: ['pdfFE'], role: 'example of a Colares producer that takes bookings', reason: 'Named once as an example; no address, hours or recommendation. Candidate place only if the editors decide to feature it (decision open).' },
  { name: 'Archaeological Museum of São Miguel de Odrinhas (MASMO)', term: 'São Miguel de Odrinhas', where: ['website'], role: 'venue of two events', reason: 'Event venue, stored in the event record (venue field); never presented as a visit. Candidate place if the diary keeps using it (decision open).' },
  { name: 'Centro Cultural Olga Cadaval', term: 'Olga Cadaval', where: ['website'], role: 'venue of one event', reason: 'Event venue, stored in the event record.' },
  { name: 'Lord Byron plaque', term: 'Byron', where: ['pdf2026', 'website'], role: 'commemorative plaque (PDF 2026) / literary note on Lawrence’s Hotel (website)', reason: 'Historical note; the PDF itself says its wording must be checked before use.' },
  { name: 'Streets and squares used as addresses or directions (Volta do Duche, Rua das Padarias, Escadinhas da Fonte da Pipa, Travessa do Município, Largo Ferreira de Castro, Largo Rainha D. Amélia)', term: 'Volta do Duche', where: ['website'], role: 'addresses and directions', reason: 'Location text of existing places, not destinations.' },
  { name: 'Rio do Porto', term: 'Rio do Porto', where: ['website'], role: 'river beside the Museu Anjos Teixeira', reason: 'Setting of place.sintra.museu-anjos-teixeira.' },
  { name: 'Transport points outside the town (Lisbon Rossio, Portela de Sintra, Cascais terminal, Lourel car park)', term: 'Rossio', where: ['pdf2026', 'pdfFE'], role: 'arrival and parking information', reason: 'Practical information, not Sintra destinations.' },
  { name: 'Porto, Douro Valley (homepage)', term: 'Douro Valley', where: ['website'], role: '"coming next" destinations', reason: 'Other destinations of The Portugal Guide, outside Sintra.' },
];

// ---- run the checks
const problems: string[] = [];
const rows = places.map((p) => {
  const w = hits(p.id, site), a = hits(p.id, pdf2026), b = hits(p.id, pdfFE);
  const inLists = lists.filter((l) => l.items.includes(p.id)).map((l) => l.id.replace('list.sintra.', ''));
  if (!w.length && !a.length && !b.length) problems.push(`${p.id}: found in no source`);
  const decision = p.part_of ? `sublocal of \`${p.part_of}\`` : 'independent place';
  return { p, w, a, b, inLists, decision };
});
for (const [ch, ids] of [...CHAPTERS_2026, ...CHAPTERS_FE]) for (const id of ids) {
  if (!byId.has(id)) problems.push(`chapter "${ch}": no record ${id}`);
}
const pool = { website: site, pdf2026, pdfFE };
for (const el of EDITORIAL_ELEMENTS) {
  const t = norm(el.term);
  for (const w of el.where) if (!pool[w].some((s) => s.text.includes(t))) problems.push(`editorial element "${el.name}": "${el.term}" not found in ${w}`);
  const clash = [...terms].find(([, ts]) => ts.some((x) => x === t));
  if (clash) problems.push(`editorial element "${el.name}" is a search term of ${clash[0]}`);
}
const fileCount = readdirSync(new URL(placesDir, root)).length;
if (fileCount !== places.length || new Set(places.map((p) => p.id)).size !== places.length) problems.push('place files and IDs do not match one-to-one');

// ---- report
const cell = (x: string[]) => (x.length ? x.join(', ') : '—');
const out: string[] = [];
out.push('# Sintra place inventory — reconciliation', '',
  `Generated by \`npm run report:inventory\` from \`${placesDir}\`, the five legacy pages, the lists, and the two PDF editions (text in \`docs/content/reference/\`). Presence = a record's name, alias or source name occurs on that page. Checks: ${problems.length ? `**${problems.length} problem(s)**` : 'all passed'}.`, '');
const subs = rows.filter((r) => r.p.part_of).length;
const listed = rows.filter((r) => r.inLists.length);
const mentionedOnly = rows.filter((r) => !r.inLists.length && r.w.length);
const pdfOnly = rows.filter((r) => !r.w.length);
out.push(`**${places.length} records**: ${places.length - subs} independent places + ${subs} sub-places.`, '',
  `- Presented on the website (in at least one of its place lists): **${listed.length}**.`,
  `- Not presented on the website, only mentioned in other text (event descriptions): **${mentionedOnly.length}** — ${mentionedOnly.map((r) => `\`${r.p.id}\``).join(', ')}.`,
  `- Only in the PDF editions: **${pdfOnly.length}** — ${pdfOnly.map((r) => `\`${r.p.id}\``).join(', ')}.`,
  `- Place-like names kept as editorial elements, not records: ${EDITORIAL_ELEMENTS.length} groups (§3).`, '',
  '"Website pages" = pages where a name of the record occurs anywhere in the text (cards, prose, events). "Website lists" = the place lists that present it. PDF columns = pages where a name occurs.', '');
out.push('## 1. Records', '', '| # | Place | Permanent ID | File | Kind | Website pages (name occurs) | Website lists (presented) | PDF 2026 Edition | PDF First Edition v1.0 | Hierarchy | Decision |', '|---|---|---|---|---|---|---|---|---|---|---|');
rows.forEach(({ p, w, a, b, inLists, decision }, i) => {
  const name = p.name?.official ?? p.name?.aliases?.[0] ?? p.id;
  const children = places.filter((c) => c.part_of === p.id).map((c) => `\`${c.id}\``);
  const hier = p.part_of ? `part of \`${p.part_of}\`` : children.length ? `contains ${children.join(', ')}` : '—';
  out.push(`| ${i + 1} | ${name} | \`${p.id}\` | \`${p.file.replace(placesDir, '')}\` | ${p.kind} | ${cell(w)} | ${cell(inLists)} | ${cell(a)} | ${cell(b)} | ${hier} | ${decision} |`);
});
out.push('', '## 2. PDF chapters → records', '', '| Edition | Chapter | Records |', '|---|---|---|');
for (const [ch, ids] of CHAPTERS_2026) out.push(`| 2026 Edition | ${ch} | ${ids.map((x) => `\`${x}\``).join(', ')} |`);
for (const [ch, ids] of CHAPTERS_FE) out.push(`| First Edition v1.0 | ${ch} | ${ids.map((x) => `\`${x}\``).join(', ')} |`);
out.push('', '## 3. Place-like names that are editorial elements, not records', '', '| Name | Occurs in | Role in the source | Why not a record |', '|---|---|---|---|');
for (const el of EDITORIAL_ELEMENTS) out.push(`| ${el.name} | ${el.where.join(', ')} | ${el.role} | ${el.reason} |`);
if (problems.length) out.push('', '## Problems', '', ...problems.map((p) => `- ${p}`));
writeFileSync(new URL('docs/content/sintra-inventory-reconciliation.md', root), out.join('\n') + '\n');
console.log(`Inventory: ${places.length} records (${places.length - subs} independent, ${subs} sub-places); ${problems.length} problem(s). Report: docs/content/sintra-inventory-reconciliation.md`);
for (const p of problems) console.log('  ✗ ' + p);
process.exit(problems.length ? 1 : 0);
