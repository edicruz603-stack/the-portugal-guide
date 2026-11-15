/**
 * Pure marker construction, shared by the content repository and unit tests.
 * The coordinate verification is copied from the coordinate fact, never inferred.
 */
import type { MapPlace, CoordinateVerification } from './types.ts';

interface MarkerPlace { id: string; map?: { coordinates: string; category: 'monument' | 'free'; label: string; zone_label: string } | undefined }
interface CoordinateFact {
  id: string; status: CoordinateVerification['status']; source: string; provenance: string;
  value: Record<string, unknown>; checked_on?: string | undefined; conflict_group?: string | undefined;
}

export function coordinateVerification(fact: CoordinateFact): CoordinateVerification {
  const v: CoordinateVerification = { status: fact.status, fact: fact.id, source: fact.source, provenance: fact.provenance };
  if (fact.status === 'checked') {
    if (!fact.checked_on) throw new Error(`${fact.id}: checked coordinates without checked_on`);
    v.checkedOn = fact.checked_on;
  }
  if (fact.status === 'unresolved') {
    if (!fact.conflict_group) throw new Error(`${fact.id}: unresolved coordinates without conflict_group`);
    v.conflictGroup = fact.conflict_group;
  }
  return v;
}

export function buildMarker(place: MarkerPlace, fact: CoordinateFact | undefined): MapPlace {
  if (!place.map) throw new Error(`${place.id} has no map entry`);
  if (!fact || fact.id !== place.map.coordinates) throw new Error(`${place.id}: coordinate fact ${place.map.coordinates} missing`);
  const { lat, lon } = fact.value;
  if (typeof lat !== 'number' || typeof lon !== 'number') throw new Error(`${place.id}: coordinate fact ${fact.id} has no numeric lat/lon`);
  return {
    id: place.id, name: place.map.label, zone: place.map.zone_label, lat, lon,
    category: place.map.category, coordinates: coordinateVerification(fact),
  };
}
