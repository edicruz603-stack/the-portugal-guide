import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolvePublicationMode, PublicationModeError } from '../../src/lib/validation/mode';

describe('publication mode resolution', () => {
  it('defaults to free, announced as default', () => {
    expect(resolvePublicationMode([], {})).toEqual({ mode: 'free', origin: 'default' });
    expect(resolvePublicationMode([], { PUBLICATION_MODE: '' })).toEqual({ mode: 'free', origin: 'default' });
  });
  it('reads env and argument, normalising case and spaces', () => {
    expect(resolvePublicationMode([], { PUBLICATION_MODE: ' Commercial ' }).mode).toBe('commercial');
    expect(resolvePublicationMode(['--mode=commercial'], {}).mode).toBe('commercial');
    expect(resolvePublicationMode(['--mode=free'], { PUBLICATION_MODE: 'free' }).origin).toBe('argument+environment');
  });
  it('rejects unknown values instead of falling back to free', () => {
    expect(() => resolvePublicationMode([], { PUBLICATION_MODE: 'comercial' })).toThrow(PublicationModeError);
    expect(() => resolvePublicationMode(['--mode=prod'], {})).toThrow(PublicationModeError);
    expect(() => resolvePublicationMode(['--mode'], {})).toThrow(PublicationModeError);
    expect(() => resolvePublicationMode(['--production'], {})).toThrow(PublicationModeError);
  });
  it('rejects contradicting argument and environment', () => {
    expect(() => resolvePublicationMode(['--mode=free'], { PUBLICATION_MODE: 'commercial' })).toThrow(/contradicts/);
  });
});

describe('validator CLI exit contract (real content)', () => {
  const run = (args: string[], env: Record<string, string> = {}) => {
    const e = { ...process.env, ...env }; if (!('PUBLICATION_MODE' in env)) delete e.PUBLICATION_MODE;
    return spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/validate-content.ts', ...args], { env: e, encoding: 'utf8' });
  };
  it('free (default) passes and says so', () => {
    const r = run([]); expect(r.status).toBe(0); expect(r.stdout).toMatch(/publication mode=free \(default/);
  });
  it('commercial fails on uncleared images (C11)', () => {
    const r = run([], { PUBLICATION_MODE: 'commercial' }); expect(r.status).toBe(1); expect(r.stdout).toMatch(/\[C11\]/);
    expect(run(['--mode=commercial']).status).toBe(1);
  });
  it('invalid mode exits 2', () => {
    expect(run([], { PUBLICATION_MODE: 'comercial' }).status).toBe(2);
    expect(run(['--production']).status).toBe(2);
  });
});
