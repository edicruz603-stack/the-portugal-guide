/**
 * Content validation with three levels (approved 7 Nov 2026):
 *  - critical: blocks production builds (missing/duplicate IDs, broken references,
 *              invalid geometry, image without source/credit record, uncleared image in commercial mode)
 *  - warning:  never blocks (sources near/after review date, optional metadata missing)
 *  - pending:  editorial work in progress; allowed in dev/preview, must never be shown as verified
 */
import type { z } from 'zod';
import {
  HomeDestinationSchema, ImageSchema, MapPlaceSchema, SourceSchema,
  type Image, type MapPlaceRecord, type Source,
} from './schemas.ts';

export type Level = 'critical' | 'warning' | 'pending';
export interface Issue { level: Level; where: string; message: string }

export interface ContentInput {
  sources: unknown[];
  images: unknown[];
  mapPlaces: unknown[];
  homeDestinations: unknown[];
  /** Page sources keyed by file name, used to check image references and internal links. */
  pages: Record<string, string>;
}

export interface Options {
  /** commercial: an uncleared image is critical instead of a warning */
  mode: 'free' | 'commercial';
  today: string;              // YYYY-MM-DD
  sourceReviewDays: number;   // warn when a source was last seen longer ago than this
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

function parseAll<T>(schema: z.ZodType<T>, items: unknown[], where: string, issues: Issue[]): T[] {
  const out: T[] = [];
  items.forEach((item, i) => {
    const r = schema.safeParse(item);
    if (r.success) out.push(r.data);
    else {
      const id = (item as { id?: string })?.id ?? `#${i}`;
      for (const e of r.error.issues) {
        issues.push({ level: 'critical', where: `${where} ${id}`, message: `${e.path.join('.') || '(root)'}: ${e.message}` });
      }
    }
  });
  return out;
}

function checkUnique(ids: string[], where: string, issues: Issue[]) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) issues.push({ level: 'critical', where, message: `duplicate ID ${id}` });
    seen.add(id);
  }
}

export function validateContent(input: ContentInput, opts: Options): Issue[] {
  const issues: Issue[] = [];

  const sources: Source[] = parseAll(SourceSchema, input.sources, 'source', issues);
  const images: Image[] = parseAll(ImageSchema, input.images, 'image', issues);
  const places: MapPlaceRecord[] = parseAll(MapPlaceSchema, input.mapPlaces, 'map place', issues);
  const dests = parseAll(HomeDestinationSchema, input.homeDestinations, 'home destination', issues);

  checkUnique(sources.map((s) => s.id), 'sources', issues);
  checkUnique(images.map((s) => s.id), 'images', issues);
  checkUnique(places.map((s) => s.id), 'map places', issues);
  const sourceIds = new Set(sources.map((s) => s.id));

  // Sources: freshness
  for (const s of sources) {
    const age = daysBetween(s.seen_on, opts.today);
    if (age > opts.sourceReviewDays) {
      issues.push({ level: 'warning', where: `source ${s.id}`, message: `last seen ${age} days ago (review after ${opts.sourceReviewDays})` });
    }
  }

  // Map places: references and precision
  for (const p of places) {
    if (p.precision === 'official') {
      if (!p.source) issues.push({ level: 'critical', where: `map place ${p.id}`, message: 'official coordinates need a source' });
      else if (!sourceIds.has(p.source)) issues.push({ level: 'critical', where: `map place ${p.id}`, message: `broken reference to ${p.source}` });
    } else {
      issues.push({ level: 'pending', where: `map place ${p.id}`, message: 'approximate coordinates, not yet checked against an official source' });
    }
  }

  // Images: records, references, rights
  const byUrl = new Map(images.map((im) => [im.url, im]));
  for (const im of images) {
    if (!sourceIds.has(im.source)) issues.push({ level: 'critical', where: `image ${im.id}`, message: `broken reference to ${im.source}` });
    if (im.rights_category === 'contributor' && !im.permission_ref) {
      issues.push({ level: 'critical', where: `image ${im.id}`, message: 'contributor image without a written-permission reference' });
    }
    if (!im.commercial_ok) {
      issues.push({
        level: opts.mode === 'commercial' ? 'critical' : 'warning',
        where: `image ${im.id}`,
        message: 'not cleared for commercial publication',
      });
    }
    if (im.status === 'pending') issues.push({ level: 'pending', where: `image ${im.id}`, message: 'rights record awaiting confirmation' });
  }
  for (const [file, html] of Object.entries(input.pages)) {
    for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
      if (!byUrl.has(m[1]!)) {
        issues.push({ level: 'critical', where: `page ${file}`, message: `image without a source/credit record: ${m[1]}` });
      }
    }
  }

  // Home destinations: internal targets must exist
  const pageNames = new Set(Object.keys(input.pages).map((f) => f.replace(/\.astro$/, '.html')));
  for (const d of dests) {
    const target = d.href.split('#')[0]!;
    if (target && !/^https?:/.test(target) && !pageNames.has(target)) {
      issues.push({ level: 'critical', where: `home destination ${d.name}`, message: `link target ${target} does not exist` });
    }
  }

  return issues;
}

export const hasCritical = (issues: Issue[]) => issues.some((i) => i.level === 'critical');
