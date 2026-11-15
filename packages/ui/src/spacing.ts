import { unsafeCSS, type CSSResult } from 'lit';

/** Spacing token steps that layout components accept in `gap`: `--cm-space-<step>`, or `0`. */
export const SPACE_STEPS = ['0', '10', '12', '15', '20', '22', '30'] as const;
export type SpaceStep = (typeof SPACE_STEPS)[number];

/** `:host([<attr>='20']) { <prop>: var(--cm-space-20) }` for every step. Unknown values keep the default. */
export function spaceRules(attr: string, prop: string): CSSResult {
  return unsafeCSS(SPACE_STEPS.map((s) =>
    `:host([${attr}='${s}']) { ${prop}: ${s === '0' ? '0px' : `var(--cm-space-${s})`}; }`).join('\n'));
}

