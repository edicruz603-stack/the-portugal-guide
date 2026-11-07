import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildPlan, renderPlanHtml, LESS_WALKING_TITLE_SUFFIX, STEP_FREE_TITLE_SUFFIX, STEP_FREE_NOT_VERIFIED, type PlanInput,
} from '../../src/lib/planner/legacy-plan.ts';

const OPTIONS = {
  days: ['one', 'two', 'half'],
  interest: ['classic', 'gardens', 'culture', 'food', 'family'],
  pace: ['relaxed', 'balanced', 'active'],
  mobility: ['standard', 'low', 'stepfree'],
  transport: ['train', 'car', 'local'],
  company: ['solo', 'couple', 'family', 'group'],
} as const;

function* combos(): Generator<PlanInput> {
  for (const days of OPTIONS.days) for (const interest of OPTIONS.interest) for (const pace of OPTIONS.pace)
    for (const mobility of OPTIONS.mobility) for (const transport of OPTIONS.transport) for (const company of OPTIONS.company)
      yield { days, interest, pace, mobility, transport, company };
}

/** Runs the live site's script.js (unchanged, from the repository root) against a minimal fake DOM. */
function legacyHtml(input: PlanInput): string {
  const code = readFileSync(new URL('../../script.js', import.meta.url), 'utf8');
  let handler: (() => void) | undefined;
  const result = { hidden: true, innerHTML: '', scrollIntoView() {} };
  const fakeDocument = {
    querySelector(sel: string) {
      if (sel === '#sc-build') return { addEventListener: (_: string, fn: () => void) => { handler = fn; } };
      if (sel === '#sc-result') return result;
      const key = sel.replace('#sc-', '') as keyof PlanInput;
      if (sel.startsWith('#sc-') && key in input) return { value: input[key] };
      return null;
    },
  };
  new Function('document', code)(fakeDocument);
  handler!();
  return result.innerHTML;
}

const DURATION_TITLES = {
  one: 'A balanced one-day Sintra plan',
  two: 'Two days to experience Sintra properly',
  half: 'A thoughtful half-day in Sintra',
} as const;

describe('planner: identical to the live site except the approved mobility fix', () => {
  it('matches legacy script.js for every combination (1,620)', () => {
    let n = 0;
    for (const input of combos()) {
      const legacy = legacyHtml(input);
      let current = renderPlanHtml(buildPlan(input));
      if (input.mobility !== 'standard') {
        // undo only the two deliberate differences, then everything else must be byte-identical
        const t = DURATION_TITLES[input.days as keyof typeof DURATION_TITLES];
        current = current
          .replace(`<h3>${t}${input.mobility === 'stepfree' ? STEP_FREE_TITLE_SUFFIX : LESS_WALKING_TITLE_SUFFIX}</h3>`, '<h3>A lower-walking plan for Sintra</h3>')
          .replace(`<li>${STEP_FREE_NOT_VERIFIED}</li>`, '');
      }
      expect(current, JSON.stringify(input)).toBe(legacy);
      n++;
    }
    expect(n).toBe(1620);
  });
});

describe('planner: mobility × duration', () => {
  const base = { interest: 'food', pace: 'balanced', transport: 'train', company: 'solo' };
  for (const days of OPTIONS.days) {
    const duration = DURATION_TITLES[days];
    it(`${days}: no limitation keeps the duration title and adds no mobility note`, () => {
      const p = buildPlan({ ...base, days, mobility: 'standard' });
      expect(p.title).toBe(duration);
      expect(p.practical.join(' ')).not.toMatch(/step-free/i);
    });
    it(`${days}: less walking keeps the duration and says "less walking", without claiming step-free`, () => {
      const p = buildPlan({ ...base, days, mobility: 'low' });
      expect(p.title).toBe(duration + LESS_WALKING_TITLE_SUFFIX);
      expect(p.practical).not.toContain(STEP_FREE_NOT_VERIFIED);
      expect(p.practical.join(' ')).toContain('Do not assume a route is fully step-free.');
    });
    it(`${days}: step-free keeps the duration, marks it as requested and states it is not verified`, () => {
      const p = buildPlan({ ...base, days, mobility: 'stepfree' });
      expect(p.title).toBe(duration + STEP_FREE_TITLE_SUFFIX);
      expect(p.title).not.toMatch(/step-free (route|plan)\b|verified|accessible/i);
      expect(p.practical).toContain(STEP_FREE_NOT_VERIFIED);
    });
  }
  it('less walking and step-free now give different results', () => {
    for (const days of OPTIONS.days) {
      const a = buildPlan({ ...base, days, mobility: 'low' });
      const b = buildPlan({ ...base, days, mobility: 'stepfree' });
      expect(a.title).not.toBe(b.title);
      expect(a.practical).not.toEqual(b.practical);
    }
  });
});
