import { css } from 'lit';

/**
 * The field scale (1.5.0), shared by every labelled form control: cm-text-field, cm-select, cm-combobox, cm-search,
 * cm-date-picker, cm-date-range-picker and cm-color-field.
 *
 * - Box height `--_cm-field-h`: 36px (`--cm-control-height-md`), 32px with `size="small"` (toolbars and filters),
 *   44px on touch screens (`pointer: coarse`) whatever the size, so every field stays easy to tap.
 * - Value text 14px; 16px on touch screens, where smaller text makes iOS Safari zoom the page on focus.
 * - Label 14px medium, 8px above the box (13px and 4px when small); help and error text 13px under it.
 *
 * A component sets `height: var(--_cm-field-h)` and `font-size: var(--_cm-field-font)` on its box and uses the
 * `.field`, `.label`, `.req`, `.hint`, `.help` and `.error` classes.
 */
export const fieldStyles = css`
  :host {
    --_cm-field-h: var(--cm-control-height-md, 36px);
    --_cm-field-font: var(--cm-font-size-14, 14px);
    --_cm-field-pad: var(--cm-space-12, 12px);
  }
  :host([size='small']) { --_cm-field-h: var(--cm-control-height-sm, 32px); --_cm-field-pad: var(--cm-space-8, 8px); }
  @media (pointer: coarse) {
    :host, :host([size='small']) { --_cm-field-h: var(--cm-control-height-touch, 44px); --_cm-field-font: var(--cm-font-size-16, 16px); }
  }
  .field { display: flex; flex-direction: column; gap: var(--cm-space-8); }
  .label {
    font-size: var(--cm-type-label-size); line-height: var(--cm-type-label-line-height); font-weight: var(--cm-type-label-weight);
    color: var(--cm-text-default);
  }
  .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
  .hint { margin-inline-start: var(--cm-space-8); font-size: var(--cm-type-body-sm-size); font-weight: 400; color: var(--cm-text-tertiary); text-transform: lowercase; }
  .help, .error { margin: 0; font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-tertiary); }
  .error { color: var(--cm-text-critical); }
  :host([size='small']) .field { gap: var(--cm-space-4); }
  :host([size='small']) .label { font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); }
`;

/** Options in a dropdown list (cm-select, cm-combobox): 32px rows of 14px text, 36px on touch screens. */
export const optionStyles = css`
  [role='listbox'] {
    max-height: 264px; overflow-y: auto; margin: 0; padding: var(--cm-space-4); list-style: none;
  }
  [role='option'] {
    display: flex; align-items: center; min-height: var(--cm-control-height-sm, 32px); padding: var(--cm-space-4) var(--cm-space-8);
    font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); color: var(--cm-text-default);
    border-radius: var(--cm-radius-sm); cursor: pointer;
  }
  @media (pointer: coarse) { [role='option'] { min-height: var(--cm-control-height-touch, 44px); } }
`;
