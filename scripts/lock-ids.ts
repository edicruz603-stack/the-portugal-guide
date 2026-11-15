/**
 * Adds every new content ID to src/content/ids.lock.json. Never removes or renames an ID:
 * to retire one, add it under "retired" with a reason (and replaced_by when there is a successor).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadContentFromDisk, allIds } from '../src/lib/content/load-fs.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const file = new URL('../src/content/ids.lock.json', import.meta.url);
let lock = { version: 1 as const, ids: [] as string[], retired: {} as Record<string, { replaced_by?: string; reason: string }> };
try { lock = JSON.parse(readFileSync(file, 'utf8')); } catch { /* first run */ }
const before = new Set(lock.ids);
const added = allIds(loadContentFromDisk(root)).filter((id) => !before.has(id));
lock.ids = [...before, ...added].sort();
writeFileSync(file, JSON.stringify(lock, null, 2) + '\n');
console.log(`ids.lock.json: ${lock.ids.length} locked (${added.length} added), ${Object.keys(lock.retired).length} retired`);
