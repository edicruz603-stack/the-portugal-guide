import { describe, expect, it } from 'vitest';
import { stopsShown } from '../../src/lib/format.ts';

describe('discoveries counter', () => {
  it('zero is plural', () => expect(stopsShown(0)).toBe('0 curated stops shown'));
  it('one is singular', () => expect(stopsShown(1)).toBe('1 curated stop shown'));
  it('many are plural', () => {
    expect(stopsShown(2)).toBe('2 curated stops shown');
    expect(stopsShown(30)).toBe('30 curated stops shown');
  });
});
