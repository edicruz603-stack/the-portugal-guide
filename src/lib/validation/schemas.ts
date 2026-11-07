import { z } from 'zod';

/** Stable, immutable ID: {type}.{scope}.{slug} — lowercase, dot-separated, hyphenated slugs. */
export const idPattern = (type: string) =>
  new RegExp(`^${type}\\.[a-z0-9-]+(\\.[a-z0-9-]+)*$`);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const SourceSchema = z.object({
  id: z.string().regex(idPattern('src')),
  publisher: z.string().min(1),
  url: z.url(),
  kind: z.enum(['operator', 'municipal', 'press', 'image-library', 'trade-body', 'other']),
  seen_on: isoDate,
  note: z.string().optional(),
});

export const RightsCategory = z.enum(['owner', 'contributor', 'licensed', 'pending']);

export const ImageSchema = z.object({
  id: z.string().regex(idPattern('img')),
  url: z.string().min(1),
  author: z.string().min(1),
  licence: z.string().min(1),
  rights_category: RightsCategory,
  source: z.string().regex(idPattern('src')),
  source_page: z.url().optional(),
  credit_line: z.string().min(1),
  permission_ref: z.string().optional(),
  commercial_ok: z.boolean(),
  status: z.enum(['verified', 'pending']),
  notes: z.string().optional(),
});

export const MapPlaceSchema = z.object({
  id: z.string().regex(idPattern('place')),
  name: z.string().min(1),
  zone: z.string().min(1),
  lat: z.number().min(36.8).max(42.2),   // mainland Portugal bounds
  lon: z.number().min(-9.6).max(-6.1),
  category: z.enum(['monument', 'free']),
  precision: z.enum(['official', 'approximate']),
  source: z.string().regex(idPattern('src')).optional(),
});

export const HomeDestinationSchema = z.object({
  href: z.string().min(1),
  name: z.string().min(1),
  summary: z.string().min(1),
  label: z.string().min(1),
  art: z.string().min(1),
  featured: z.boolean(),
  linkText: z.string().optional(),
});

export type Source = z.infer<typeof SourceSchema>;
export type Image = z.infer<typeof ImageSchema>;
export type MapPlaceRecord = z.infer<typeof MapPlaceSchema>;
