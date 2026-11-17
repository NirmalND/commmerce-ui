import { unsafeCSS, type CSSResult } from 'lit';

/** Spacing steps that layout components accept in `gap`: `--cm-space-<step>` on the 4px grid, or `0`. */
export const SPACE_STEPS = ['0', '4', '8', '12', '16', '20', '24', '32', '40', '48', '64'] as const;
/**
 * Steps from before 1.5 that were off the 4px grid. Still accepted, so existing pages keep working, but drawn with
 * the nearest grid step: 10 → 8, 15 → 16, 22 → 24, 30 → 32. Deprecated: write the grid step.
 */
export const LEGACY_SPACE_STEPS = { '10': '8', '15': '16', '22': '24', '30': '32' } as const;
export type SpaceStep = (typeof SPACE_STEPS)[number] | keyof typeof LEGACY_SPACE_STEPS;

/** `:host([<attr>='20']) { <prop>: var(--cm-space-20) }` for every step (and legacy step). Unknown values keep the default. */
export function spaceRules(attr: string, prop: string): CSSResult {
  const rule = (s: string, to: string) => `:host([${attr}='${s}']) { ${prop}: ${to === '0' ? '0px' : `var(--cm-space-${to})`}; }`;
  return unsafeCSS([
    ...SPACE_STEPS.map((s) => rule(s, s)),
    ...Object.entries(LEGACY_SPACE_STEPS).map(([s, to]) => rule(s, to)),
  ].join('\n'));
}
