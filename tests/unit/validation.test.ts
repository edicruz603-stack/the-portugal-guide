import { describe, expect, it } from 'vitest';
import { validateContent, hasCritical, type ContentInput, type Options } from '../../src/lib/validation/validate.ts';
import { sintraMapPlaces } from '../../src/data/sintra-map.ts';
import sources from '../../src/content/sources.json';
import images from '../../src/content/images.json';
import homeDestinations from '../../src/data/home-destinations.json';

const pages = {
  'index.astro': '', 'sintra.astro': `<img src="${images[0]!.url}">`,
  'sintra-local-discoveries.astro': '', 'sintra-romantic-guide.astro': '', 'sintra-discoveries.astro': '',
};
const base = (): ContentInput => structuredClone({ sources, images, mapPlaces: sintraMapPlaces, homeDestinations, pages });
const free: Options = { mode: 'free', today: '2026-11-07', sourceReviewDays: 90 };
const levels = (input: ContentInput, opts = free) => validateContent(input, opts);

describe('content validation levels', () => {
  it('current repository content has no critical issues in free mode', () => {
    expect(hasCritical(levels(base()))).toBe(false);
  });

  it('CRITICAL: duplicate stable IDs', () => {
    const input = base();
    input.mapPlaces.push({ ...(sintraMapPlaces[0]!) });
    expect(levels(input).some((i) => i.level === 'critical' && /duplicate ID/.test(i.message))).toBe(true);
  });

  it('CRITICAL: malformed IDs', () => {
    const input = base();
    (input.mapPlaces[0] as { id: string }).id = 'Pena Palace';
    expect(hasCritical(levels(input))).toBe(true);
  });

  it('CRITICAL: broken source reference', () => {
    const input = base();
    (input.mapPlaces[0] as { source: string }).source = 'src.nowhere';
    expect(levels(input).some((i) => i.level === 'critical' && /broken reference/.test(i.message))).toBe(true);
  });

  it('CRITICAL: official coordinates without a source', () => {
    const input = base();
    delete (input.mapPlaces[0] as { source?: string }).source;
    expect(levels(input).some((i) => /need a source/.test(i.message))).toBe(true);
  });

  it('CRITICAL: coordinates outside mainland Portugal', () => {
    const input = base();
    (input.mapPlaces[0] as { lat: number }).lat = 51.5;
    expect(hasCritical(levels(input))).toBe(true);
  });

  it('CRITICAL: a page image without a source/credit record', () => {
    const input = base();
    input.pages['sintra.astro'] += '<img src="https://example.com/unknown.jpg" alt="">';
    expect(levels(input).some((i) => i.level === 'critical' && /without a source\/credit record/.test(i.message))).toBe(true);
  });

  it('CRITICAL: contributor image without written permission', () => {
    const input = base();
    Object.assign(input.images[0] as object, { rights_category: 'contributor' });
    expect(levels(input).some((i) => /written-permission/.test(i.message))).toBe(true);
  });

  it('uncleared image is a WARNING in free mode and CRITICAL in commercial mode', () => {
    const issues = levels(base());
    expect(issues.some((i) => i.level === 'warning' && /commercial/.test(i.message))).toBe(true);
    expect(hasCritical(levels(base(), { ...free, mode: 'commercial' }))).toBe(true);
  });

  it('WARNING: source older than the review window, never blocking', () => {
    const issues = levels(base(), { ...free, today: '2027-06-01' });
    expect(issues.some((i) => i.level === 'warning' && /last seen/.test(i.message))).toBe(true);
    expect(hasCritical(issues)).toBe(false);
  });

  it('EDITORIAL PENDING: approximate coordinates are flagged, not blocking', () => {
    const issues = levels(base());
    const pending = issues.filter((i) => i.level === 'pending' && /approximate/.test(i.message));
    expect(pending.length).toBe(3);
  });

  it('CRITICAL: home destination linking to a missing page', () => {
    const input = base();
    (input.homeDestinations[0] as { href: string }).href = 'lisbon.html';
    expect(levels(input).some((i) => /does not exist/.test(i.message))).toBe(true);
  });
});

describe('map data', () => {
  it('Regaleira and Monserrate use the operators’ published coordinates', () => {
    const byId = Object.fromEntries(sintraMapPlaces.map((p) => [p.id, p]));
    expect(byId['place.sintra.quinta-da-regaleira']).toMatchObject({ lat: 38.795875, lon: -9.397281, precision: 'official' });
    expect(byId['place.sintra.monserrate']).toMatchObject({ lat: 38.791861, lon: -9.419192, precision: 'official' });
  });
});
