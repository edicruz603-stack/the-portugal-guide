/**
 * Canonical content schemas (M2). Shared by Astro content collections (src/content.config.ts)
 * and the standalone validator (scripts/validate-content.ts).
 *
 * Multi-destination by design: every record carries its destination, IDs are scoped
 * `{type}.{destination}.{key}`, and nothing here is specific to Sintra.
 *
 * IDs are assigned once, stored in the record and locked in src/content/ids.lock.json.
 * They are never computed from names, translations, display titles or URL slugs.
 */
import { z } from 'zod';

const KEY = '[a-z0-9]+(?:-[a-z0-9]+)*';
/** `{type}.{destination}.{key}` — e.g. place.sintra.pena-palace, list.sintra.directory */
export const scopedId = (type: string) => z.string().regex(new RegExp(`^${type}\\.${KEY}\\.${KEY}$`), `expected ${type}.<destination>.<key>`);
/** `fact.{destination}.{place-key}.{claim-key}` */
export const factId = z.string().regex(new RegExp(`^fact\\.${KEY}\\.${KEY}\\.${KEY}$`), 'expected fact.<destination>.<place-key>.<claim-key>');
export const destinationId = z.string().regex(new RegExp(`^destination\\.${KEY}$`), 'expected destination.<key>');
export const sourceId = z.string().regex(new RegExp(`^src\\.${KEY}(?:\\.${KEY})*$`), 'expected src.<publisher>[.<page>]');
export const imageId = z.string().regex(new RegExp(`^img\\.${KEY}\\.${KEY}$`), 'expected img.<destination>.<key>');

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

// ---------- registers (global, shared by all destinations) ----------

export const SourceKind = z.enum([
  'operator',       // runs the place: Parques de Sintra, Fundação Cultursintra, the business itself
  'official',       // public authority: municipality, Visit Sintra (municipal tourism), CP, DGAM
  'own-edition',    // a previous edition of The Portugal Guide (website or PDF) — never a verification
  'secondary',      // press, listings, trade bodies, operators' resellers
  'image-library',
]);
/** Kinds whose pages can make a fact `checked`. */
export const CHECKABLE_KINDS = ['operator', 'official'] as const;

export const SourceSchema = z.object({
  id: sourceId,
  publisher: z.string().min(1),
  title: z.string().min(1).optional(),
  url: z.url(),
  kind: SourceKind,
  seen_on: isoDate,
  note: z.string().optional(),
}).strict();

export const ImageSchema = z.object({
  id: z.string().regex(/^img\.[a-z0-9-]+\.[a-z0-9-]+$/),
  url: z.string().min(1),
  author: z.string().min(1),
  licence: z.string().min(1),
  rights_category: z.enum(['owner', 'contributor', 'licensed', 'pending']),
  source: sourceId,
  source_page: z.url().optional(),
  credit_line: z.string().min(1),
  permission_ref: z.string().optional(),
  commercial_ok: z.boolean(),
  status: z.enum(['verified', 'pending']),
  notes: z.string().optional(),
}).strict();

// ---------- destination structure ----------

export const DestinationSchema = z.object({
  id: destinationId,
  name: z.string().min(1),
  country: z.string().length(2),
  status: z.enum(['in-production', 'planned', 'published']),
  map: z.object({ lat: z.number(), lon: z.number(), zoom: z.number().int().min(1).max(19) }).strict(),
}).strict();

export const ZoneSchema = z.object({
  id: scopedId('zone'),
  destination: destinationId,
  name: z.string().min(1),
}).strict();

// ---------- places ----------

export const PlaceKind = z.enum([
  'monument', 'garden', 'museum', 'viewpoint', 'landmark', 'area', 'transport',
  'restaurant', 'cafe', 'pastry-shop', 'wine-cellar', 'shop', 'hidden-gem',
]);

export const LinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  external: z.boolean(),
}).strict();
export type Link = z.infer<typeof LinkSchema>;

/**
 * Editorial texts, keyed by the context in which they are published. Plain text with two inline
 * marks only: **strong** and *emphasis*. No HTML and no layout: presentation lives in components.
 */
const Text = z.string().min(1).refine((s) => !/[<>]/.test(s), 'editorial text must not contain HTML');
export const EditorialSchema = z.object({
  directory: z.object({ filter: z.enum(['monument', 'free', 'food']), meta: Text, title: Text, text: Text, links: z.array(LinkSchema) }).strict().optional(),
  local: z.object({ tag: Text, title: Text, text: Text, links: z.array(LinkSchema) }).strict().optional(),
  field_guide: z.object({ label: Text, title: Text, paragraphs: z.array(Text).min(1), links: z.array(LinkSchema) }).strict().optional(),
  field_guide_tickets: z.object({ label: Text, title: Text, paragraphs: z.array(Text).min(1), links: z.array(LinkSchema) }).strict().optional(),
  food_card: z.object({ title: Text, paragraphs: z.array(Text).min(1), links: z.array(LinkSchema) }).strict().optional(),
  map_link: z.object({ title: Text, href: z.string().min(1) }).strict().optional(),
  romantic: z.object({ label: Text, title: Text, text: Text, meta: Text.optional(), links: z.array(LinkSchema) }).strict().optional(),
}).strict();
export type Editorial = z.infer<typeof EditorialSchema>;
export const EDITORIAL_CONTEXTS = Object.keys(EditorialSchema.shape) as (keyof Editorial)[];

export const PlaceSchema = z.object({
  id: scopedId('place'),
  destination: destinationId,
  kind: PlaceKind,
  /** Optional: left empty when the location has not been established (reported as editorial pending). */
  zone: scopedId('zone').optional(),
  part_of: scopedId('place').optional(),
  name: z.object({
    official: z.string().min(1).optional(),
    official_source: sourceId.optional(),
    aliases: z.array(z.string().min(1)),
  }).strict(),
  /** Marker on the destination map. Coordinates are a fact (with source, dates and status). */
  map: z.object({
    coordinates: factId,
    category: z.enum(['monument', 'free']),
    label: z.string().min(1),
    zone_label: z.string().min(1),
  }).strict().optional(),
  editorial: EditorialSchema,
  images: z.array(imageId).default([]),
}).strict();
export type Place = z.infer<typeof PlaceSchema>;

// ---------- facts ----------

export const FactKind = z.enum([
  'coordinates', 'hours', 'last-entry', 'price', 'closure', 'notice', 'rule', 'access',
  'address', 'phone', 'website', 'route', 'transport', 'date', 'history', 'other',
]);
export const FactStatus = z.enum(['checked', 'reported', 'confirm-first', 'unresolved']);
export const Provenance = z.enum([
  'official-page-read',      // read by us on checked_on
  'pdf-first-edition-2026',  // recorded in the PDF fact ledger (Registers v0.9), read 7 Nov 2026
  'legacy-website',          // found in the previous website edition; not re-verified
  'secondary-listing',       // press or listing
]);

export const FactSchema = z.object({
  id: factId,
  kind: FactKind,
  /** What exactly the value is about, when a place has several: "gardens", "park entrance", "adult, essential visit". */
  subject: z.string().min(1).optional(),
  value: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  text: z.string().min(1),
  /** Verbatim fragment of this place's editorial text that states this fact (links prose to data). */
  quote: z.string().min(1).optional(),
  source: sourceId,
  provenance: Provenance,
  /** When the value was found in a website or document. */
  observed_on: isoDate,
  /** When the value was genuinely verified against an appropriate source. Only for status `checked`. */
  checked_on: isoDate.optional(),
  status: FactStatus,
  conflict_group: z.string().regex(new RegExp(`^${KEY}$`)).optional(),
  review_after_days: z.number().int().positive().optional(),
  note: z.string().optional(),
}).strict();
export type Fact = z.infer<typeof FactSchema>;

export const FactSetSchema = z.object({
  place: scopedId('place'),
  facts: z.array(FactSchema).min(1),
}).strict();
export type FactSet = z.infer<typeof FactSetSchema>;

// ---------- events ----------

export const EventSchema = z.object({
  id: scopedId('event'),
  destination: destinationId,
  title: z.string().min(1),
  starts_on: isoDate,
  ends_on: isoDate.optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  venue: z.string().min(1),
  place: scopedId('place').optional(),
  source: sourceId,
  provenance: Provenance,
  observed_on: isoDate,
  checked_on: isoDate.optional(),
  status: FactStatus,
  editorial: z.object({
    local: z.object({ when: Text, title: Text, text: Text, link: LinkSchema }).strict().optional(),
    directory: z.object({ heading: Text, text: Text }).strict().optional(),
  }).strict(),
}).strict();
export type Event = z.infer<typeof EventSchema>;

// ---------- lists (the only way pages select places or events) ----------

export const ListSchema = z.object({
  id: scopedId('list'),
  destination: destinationId,
  title: z.string().min(1),
  /** Editorial context rendered for each item, or `map` for map markers, or `event:<context>`. */
  context: z.union([z.enum(EDITORIAL_CONTEXTS as [string, ...string[]]), z.literal('map'), z.enum(['event:local', 'event:directory'])]),
  items: z.array(z.union([scopedId('place'), scopedId('event')])).min(1),
}).strict();
export type List = z.infer<typeof ListSchema>;

// ---------- ID lock ----------

export const IdLockSchema = z.object({
  version: z.literal(1),
  ids: z.array(z.string()),
  retired: z.record(z.string(), z.object({ replaced_by: z.string().optional(), reason: z.string().min(1) }).strict()),
}).strict();
