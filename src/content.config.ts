/**
 * Astro content collections (M2). One glob per record type, across all destinations:
 *   src/content/destinations/<destination>/{destination.yaml, zones/, places/, facts/, events/, lists/}
 * Entry IDs come from the record's own `id` field (never from the file name or a slug).
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  DestinationSchema, ZoneSchema, PlaceSchema, FactSetSchema, EventSchema, ListSchema,
} from './lib/content/schemas.ts';

const base = './src/content/destinations';
const byId = ({ data, entry }: { data: Record<string, unknown>; entry: string }) => {
  const id = (data.id ?? data.place) as string | undefined;
  if (!id) throw new Error(`${entry}: record has no id`);
  return id;
};

export const collections = {
  destinations: defineCollection({ loader: glob({ base, pattern: '*/destination.yaml', generateId: byId }), schema: DestinationSchema }),
  zones: defineCollection({ loader: glob({ base, pattern: '*/zones/*.yaml', generateId: byId }), schema: ZoneSchema }),
  places: defineCollection({ loader: glob({ base, pattern: '*/places/*.yaml', generateId: byId }), schema: PlaceSchema }),
  facts: defineCollection({ loader: glob({ base, pattern: '*/facts/*.yaml', generateId: byId }), schema: FactSetSchema }),
  events: defineCollection({ loader: glob({ base, pattern: '*/events/*.yaml', generateId: byId }), schema: EventSchema }),
  lists: defineCollection({ loader: glob({ base, pattern: '*/lists/*.yaml', generateId: byId }), schema: ListSchema }),
};
