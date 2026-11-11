/**
 * Human-readable content status report, generated from the data on every validation run:
 * place inventory, fact and source coverage, conflicts and editorial-pending items.
 */
import type { ContentInput, Issue } from './validate.ts';
import type { Event, Fact, List, Place } from '../content/schemas.ts';

type Src = { id: string; publisher: string; kind: string; url: string; seen_on: string };

export function contentStatusReport(input: ContentInput, issues: Issue[], today: string): string {
  const places = input.places as Place[];
  const facts = (input.factSets as { place: string; facts: Fact[] }[]).flatMap((s) => s.facts.map((f) => ({ ...f, place: s.place })));
  const events = input.events as Event[];
  const lists = input.lists as List[];
  const sources = input.sources as Src[];
  const count = (l: Issue['level']) => issues.filter((i) => i.level === l).length;
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const out: string[] = [];
  const line = (s = '') => out.push(s);

  line('# Content status report');
  line();
  line(`Generated ${today} from src/content. Critical ${count('critical')} · warnings ${count('warning')} · editorial pending ${count('pending')}.`);
  line();

  // ---- inventory
  line(`## 1. Place inventory (${places.length} places)`);
  line();
  line('| ID | Kind | Zone | Part of | Names found in the editions | Published in | Facts (checked / reported / confirm-first / unresolved) |');
  line('|---|---|---|---|---|---|---|');
  const inLists = (id: string) => lists.filter((l) => l.items.includes(id)).map((l) => l.id.split('.').pop());
  for (const p of [...places].sort((a, b) => a.id.localeCompare(b.id))) {
    const fs = facts.filter((f) => f.place === p.id);
    const c = (s: Fact['status']) => fs.filter((f) => f.status === s).length;
    line(`| \`${p.id}\` | ${p.kind} | ${p.zone?.split('.').pop() ?? '—'} | ${p.part_of ? `\`${p.part_of.split('.').pop()}\`` : ''} | ${esc([...new Set([p.name.official, ...p.name.aliases].filter(Boolean))].join('; ')) || '—'} | ${inLists(p.id).join(', ') || '—'} | ${fs.length ? `${c('checked')} / ${c('reported')} / ${c('confirm-first')} / ${c('unresolved')}` : '—'} |`);
  }
  line();

  // ---- lists
  line(`## 2. Lists (the only place selections pages render)`);
  line();
  line('| List | Renders | Items |');
  line('|---|---|---|');
  for (const l of lists) line(`| \`${l.id}\` | ${l.context} | ${l.items.length} |`);
  line();

  // ---- fact coverage
  const st = (s: string) => facts.filter((f) => f.status === s).length;
  const pv = (p: string) => facts.filter((f) => f.provenance === p).length;
  line(`## 3. Fact and source coverage`);
  line();
  line(`${facts.length} facts on ${new Set(facts.map((f) => f.place)).size} of ${places.length} places; ${events.length} dated events.`);
  line();
  line(`- Every fact has a source, an observed date and a status: ${facts.every((f) => f.source && f.observed_on && f.status) ? 'yes' : 'NO'}.`);
  line(`- Status: checked ${st('checked')} · reported ${st('reported')} · confirm-first ${st('confirm-first')} · unresolved ${st('unresolved')}.`);
  line(`- Provenance: read on official pages ${pv('official-page-read')} · PDF first edition ledger ${pv('pdf-first-edition-2026')} · previous website ${pv('legacy-website')} · secondary listings ${pv('secondary-listing')}.`);
  line(`- \`checked_on\` is present only on checked facts; website and listing values are never marked checked.`);
  line();
  line('| Kind | Facts |');
  line('|---|---|');
  for (const [k, n] of Object.entries(facts.reduce<Record<string, number>>((a, f) => ((a[f.kind] = (a[f.kind] ?? 0) + 1), a), {})).sort()) line(`| ${k} | ${n} |`);
  line();
  line('| Source | Kind | Facts | Seen |');
  line('|---|---|---|---|');
  for (const s of sources) {
    const n = facts.filter((f) => f.source === s.id).length + events.filter((e) => e.source === s.id).length;
    line(`| \`${s.id}\` — [${esc(s.publisher)}](${s.url}) | ${s.kind} | ${n} | ${s.seen_on} |`);
  }
  line();

  // ---- conflicts
  const groups = new Map<string, typeof facts>();
  for (const f of facts) if (f.conflict_group) groups.set(f.conflict_group, [...(groups.get(f.conflict_group) ?? []), f]);
  line(`## 4. Unresolved conflicts (${groups.size})`);
  line();
  line('Every competing value is kept. None is chosen until a source settles it.');
  line();
  for (const [g, fs] of groups) {
    line(`### ${g}`);
    for (const f of fs) line(`- \`${f.id}\`: ${esc(f.text)} — \`${f.source}\` (${f.provenance}, observed ${f.observed_on})`);
    line();
  }

  // ---- pending
  line(`## 5. Editorial pending`);
  line();
  const pending = issues.filter((i) => i.level === 'pending');
  const label: Record<string, string> = {
    P01: 'Facts and events not verified (reported / confirm-first / unresolved)', P02: 'Places whose location is not established',
    P03: 'Places with no reader-facing text yet', P04: 'Places with no structured facts yet', P05: 'Image rights awaiting confirmation',
    P06: 'Map markers drawn from non-verified coordinates',
  };
  for (const rule of Object.keys(label)) {
    const xs = pending.filter((i) => i.rule === rule);
    if (!xs.length) continue;
    line(`### ${label[rule]} (${xs.length})`);
    for (const i of xs) line(`- \`${i.where}\`: ${esc(i.message)}`);
    line();
  }

  // ---- warnings
  line(`## 6. Warnings`);
  line();
  for (const i of issues.filter((x) => x.level === 'warning')) line(`- [${i.rule}] \`${i.where}\`: ${esc(i.message)}`);
  line();
  return out.join('\n');
}
