/**
 * Reads the raw content from disk (no Astro), for the validator CLI and unit tests.
 * Layout: src/content/destinations/<destination>/{destination.yaml, zones/, places/, facts/, events/, lists/}
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';
import type { ContentInput } from '../validation/validate.ts';

const yamlFiles = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.yaml')).sort().map((f) => join(dir, f)) : []);
const readYaml = (file: string): unknown => YAML.parse(readFileSync(file, 'utf8'));
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));

export function loadContentFromDisk(root: string): ContentInput {
  const content = join(root, 'src/content');
  const destRoot = join(content, 'destinations');
  const dests = readdirSync(destRoot).filter((d) => existsSync(join(destRoot, d, 'destination.yaml'))).sort();
  const each = (sub: string) => dests.flatMap((d) => yamlFiles(join(destRoot, d, sub)).map(readYaml));
  const pagesDir = join(root, 'src/pages');
  return {
    sources: readJson(join(content, 'sources.json')) as unknown[],
    images: readJson(join(content, 'images.json')) as unknown[],
    destinations: dests.map((d) => readYaml(join(destRoot, d, 'destination.yaml'))),
    zones: each('zones'),
    places: each('places'),
    factSets: each('facts'),
    events: each('events'),
    lists: each('lists'),
    idLock: readJson(join(content, 'ids.lock.json')),
    homeDestinations: readJson(join(root, 'src/data/home-destinations.json')) as unknown[],
    pages: Object.fromEntries(readdirSync(pagesDir).filter((f) => f.endsWith('.astro')).map((f) => [f, readFileSync(join(pagesDir, f), 'utf8')])),
  };
}

/** Every ID defined by the content (for the ID lock). */
export function allIds(input: ContentInput): string[] {
  const ids = (xs: unknown[]) => xs.map((x) => (x as { id?: string }).id).filter((x): x is string => !!x);
  const factIds = input.factSets.flatMap((s) => ((s as { facts?: { id?: string }[] }).facts ?? []).map((f) => f.id).filter((x): x is string => !!x));
  return [...ids(input.sources), ...ids(input.images), ...ids(input.destinations), ...ids(input.zones), ...ids(input.places), ...factIds, ...ids(input.events), ...ids(input.lists)].sort();
}
