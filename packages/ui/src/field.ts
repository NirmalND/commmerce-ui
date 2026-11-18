import { css } from 'lit';

/**
 * The field scale, shared by every labelled form control: cm-text-field, cm-select, cm-combobox, cm-search,
 * cm-date-picker, cm-date-range-picker and cm-color-field. Owner standard (1.6, issue #33; 1.5 drew 36px fields).
 *
 * - Box height `--_cm-field-h`: 40px (`--cm-control-height-lg`), 32px with `size="small"` (toolbars and filter rows),
 *   44px on touch screens (`pointer: coarse`) whatever the size, so every field stays easy to tap.
 * - Value text 14px; 16px on touch screens, where smaller text makes iOS Safari zoom the page on focus.
 * - Label 13px medium (`type-label`), 8px above the box (4px when small); help and error text 12/16 under it.
 *
 * A component sets `height: var(--_cm-field-h)` and `font-size: var(--_cm-field-font)` on its box and uses the
 * `.field`, `.label`, `.req`, `.hint`, `.help` and `.error` classes.
 */
export const fieldStyles = css`
  :host {
    --_cm-field-h: var(--cm-control-height-lg, 40px);
    --_cm-field-font: var(--cm-font-size-14, 14px);
    --_cm-field-pad: var(--cm-space-12, 12px);
  }
  :host([size='small']) { --_cm-field-h: var(--cm-control-height-sm, 32px); --_cm-field-pad: var(--cm-space-8, 8px); }
  /* medium (1.8.1): 36px, the height of a standard button, for fields in a row of buttons (page header actions). */
  :host([size='medium']) { --_cm-field-h: var(--cm-control-height-md, 36px); }
  @media (pointer: coarse) { :host([size='medium']) { --_cm-field-h: var(--cm-control-height-touch, 44px); } }
  @media (pointer: coarse) {
    :host, :host([size='small']) { --_cm-field-h: var(--cm-control-height-touch, 44px); --_cm-field-font: var(--cm-font-size-16, 16px); }
  }
  .field { display: flex; flex-direction: column; gap: var(--cm-space-8); }
  .label {
    font-size: var(--cm-type-label-size); line-height: var(--cm-type-label-line-height); font-weight: var(--cm-type-label-weight);
    color: var(--cm-text-default);
  }
  .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
  .hint { margin-inline-start: var(--cm-space-8); font-size: var(--cm-type-body-xs-size); font-weight: 400; color: var(--cm-text-tertiary); text-transform: lowercase; }
  .help, .error { margin: 0; font-size: var(--cm-type-body-xs-size); line-height: var(--cm-type-body-xs-line-height); color: var(--cm-text-tertiary); }
  .error { color: var(--cm-text-critical); }
  :host([size='small']) .field { gap: var(--cm-space-4); }
  :host([size='small']) .label { font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); }
`;

/**
 * Options in a dropdown list (cm-select, cm-combobox), the same rows as cm-action-menu items (owner standard, 1.6):
 * 36px rows of 14px text with 12px side padding (32px with `size="small"`), 44px on touch screens; group headings
 * 12px (`groupStyles`). Hover and the keyboard-active row share `bg-hover`; pressed darkens it a little.
 */
export const optionStyles = css`
  [role='listbox'] {
    max-height: 264px; overflow-y: auto; margin: 0; padding: var(--cm-space-4); list-style: none;
  }
  [role='option'] {
    display: flex; align-items: center; min-height: var(--cm-control-height-md, 36px); padding: var(--cm-space-4) var(--cm-space-12);
    font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); color: var(--cm-text-default);
    border-radius: var(--cm-radius-sm); cursor: pointer;
  }
  [role='option']:not([aria-disabled='true']):not([aria-selected='true']):active { background: color-mix(in srgb, var(--cm-bg-hover), var(--cm-text-default) 8%); }
  :host([size='small']) [role='option'] { min-height: var(--cm-control-height-sm, 32px); }
  @media (pointer: coarse) { [role='option'], :host([size='small']) [role='option'] { min-height: var(--cm-control-height-touch, 44px); } }
`;
