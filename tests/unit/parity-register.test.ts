/**
 * End-to-end: the parity check over a real build passes with the committed register, and fails as soon as
 * a visible change is made that the register does not record.
 */
import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const parity = (dir: string) => spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/check-parity.mjs', dir], { cwd: root, encoding: 'utf8', env: { ...process.env, VALIDATION_DATE: '2026-11-16' } });

describe('parity with the editorial register', () => {
  it('passes on the build, fails on an unregistered visible change', () => {
    const out = mkdtempSync(join(tmpdir(), 'tpg-parity-'));
    try {
      const env = { ...process.env, VALIDATION_DATE: '2026-11-16' }; delete (env as Record<string, string | undefined>).PUBLICATION_MODE;
      const b = spawnSync('npx', ['astro', 'build', '--outDir', out], { cwd: root, env, encoding: 'utf8' });
      expect(b.status, b.stdout + b.stderr).toBe(0);
      const ok = parity(out);
      expect(ok.status, ok.stdout).toBe(0);
      expect(ok.stdout).toMatch(/registered editorial changes applied: (\d+)\/\1/);
      const page = join(out, 'sintra-romantic-guide.html');
      writeFileSync(page, readFileSync(page, 'utf8').replace('Monserrate', 'Monserate'));
      const bad = parity(out);
      expect(bad.status).toBe(1);
      expect(bad.stdout).toMatch(/sintra-romantic-guide\.html[\s\S]*text differs/);
    } finally { rmSync(out, { recursive: true, force: true }); }
  }, 180_000);
});
