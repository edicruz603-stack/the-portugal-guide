/**
 * Read access to the canonical content for any destination. Pages and components get places,
 * facts, lists and events only through here, so no page holds its own copy of place data.
 */
import { getCollection } from 'astro:content';
import type { Place, Fact, Event, List } from './schemas.ts';
import type { MapPlace } from '../map/types.ts';
import { buildMarker } from '../map/markers.ts';
import { validationDate, activeEventIds } from './dates.ts';

export interface DestinationContent {
  places: Map<string, Place>;
  facts: Map<string, Fact>;
  events: Map<string, Event>;
  lists: Map<string, List>;
}

const cache = new Map<string, Promise<DestinationContent>>();

export function loadDestination(destination: string): Promise<DestinationContent> {
  if (!cache.has(destination)) cache.set(destination, load(destination));
  return cache.get(destination)!;
}

async function load(destination: string): Promise<DestinationContent> {
  const of = <T extends { destination?: string }>(items: { data: T }[]) => items.map((e) => e.data).filter((d) => d.destination === destination);
  const places = of(await getCollection('places'));
  const placeIds = new Set(places.map((p) => p.id));
  const facts = (await getCollection('facts')).map((e) => e.data).filter((s) => placeIds.has(s.place)).flatMap((s) => s.facts);
  return {
    places: new Map(places.map((p) => [p.id, p])),
    facts: new Map(facts.map((f) => [f.id, f])),
    events: new Map(of(await getCollection('events')).map((e) => [e.id, e])),
    lists: new Map(of(await getCollection('lists')).map((l) => [l.id, l])),
  };
}

function list(content: DestinationContent, id: string): List {
  const l = content.lists.get(id);
  if (!l) throw new Error(`Unknown list ${id}`);
  return l;
}

/** Places of a list, in list order, with the editorial context the list renders. */
export async function placesInList<K extends keyof Place['editorial']>(destination: string, listId: string, context: K) {
  const content = await loadDestination(destination);
  const l = list(content, listId);
  if (l.context !== context) throw new Error(`${listId} renders "${l.context}", not "${context}"`);
  return l.items.map((id) => {
    const place = content.places.get(id);
    const editorial = place?.editorial[context];
    if (!place || !editorial) throw new Error(`${listId}: ${id} has no ${context} text`);
    return { place, editorial: editorial as NonNullable<Place['editorial'][K]> };
  });
}

/**
 * Events of a list that are still on at the validation date (see dates.ts: shown up to and including
 * their last day). Ended events stay in the content as history; no list needs editing when one ends.
 */
export async function eventsInList<K extends keyof Event['editorial']>(destination: string, listId: string, context: K, today: string = validationDate(process.env)) {
  const content = await loadDestination(destination);
  const l = list(content, listId);
  if (l.context !== `event:${context}`) throw new Error(`${listId} renders "${l.context}", not "event:${context}"`);
  // every listed event must be renderable, ended or not, so a list never breaks when its date passes
  for (const id of l.items) if (!content.events.get(id)?.editorial[context]) throw new Error(`${listId}: ${id} has no ${context} text`);
  return activeEventIds(l.items, content.events, today).map((id) => {
    const event = content.events.get(id)!;
    return { event, editorial: event.editorial[context] as NonNullable<Event['editorial'][K]> };
  });
}

/** Map markers for a list: coordinates come from the referenced coordinate facts. */
export async function mapMarkers(destination: string, listId: string): Promise<MapPlace[]> {
  const content = await loadDestination(destination);
  const l = list(content, listId);
  if (l.context !== 'map') throw new Error(`${listId} is not a map list`);
  return l.items.map((id) => {
    const place = content.places.get(id);
    if (!place) throw new Error(`${listId}: unknown place ${id}`);
    return buildMarker(place, place.map ? content.facts.get(place.map.coordinates) : undefined);
  });
}
