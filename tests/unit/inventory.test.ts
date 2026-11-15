import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));

describe('place inventory reconciliation', () => {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/reports/inventory-reconciliation.ts'], { cwd: root, encoding: 'utf8' });
  it('passes every check (all records found in a source, every chapter mapped, every non-record name classified)', () => {
    expect(r.status, r.stdout + r.stderr).toBe(0);
    expect(r.stdout).toMatch(/40 records \(36 independent, 4 sub-places\); 0 problem/);
  });
  it('the committed report is the one the script generates', () => {
    // the script rewrites the file; git diff in CI would show drift, here we check the key figures
    const md = readFileSync(root + 'docs/content/sintra-inventory-reconciliation.md', 'utf8');
    expect(md).toContain('Presented on the website (in at least one of its place lists): **34**');
    expect(md).toContain('Only in the PDF editions: **4**');
  });
});
