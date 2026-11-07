/** "0 curated stops shown", "1 curated stop shown", "13 curated stops shown". */
export const stopsShown = (n: number): string => `${n} curated ${n === 1 ? 'stop' : 'stops'} shown`;
