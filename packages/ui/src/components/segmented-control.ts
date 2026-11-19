import { css } from 'lit';
import { base, define } from '../base.js';
import { defineStrings } from '../localize.js';
import { CmOptionGroup } from './option-group.js';

const strings = defineStrings('segmentedControl', {
  /** Validation message when `required` and nothing is chosen. */
  required: 'Please select one of these options.',
});
declare module '../localize.js' { interface CmStrings { segmentedControl: typeof strings } }

/**
 * A compact switch between two to four views or filters of the same content ("Open / Done", "Board / List"): the
 * options sit side by side in one track and exactly one is selected. Since 1.5.
 *
 * It is an option group with a different look, so it behaves exactly like `cm-option-group`: a radio group with one
 * tab stop, arrow keys (mirrored in right-to-left text), Home and End move and select, `change` fires on every new
 * choice, and inside a form it submits its `value`. Options come from `<option>` children or the `options` property.
 * Option `tone`s are not shown: a view switch has no good or bad answer.
 *
 * Use it to change what a page or card shows, right away. To pick a setting that is saved with a form, use
 * `cm-option-group` (bigger, separate buttons); for five or more choices, `cm-select`; for page sections, tabs.
 * @element cm-segmented-control
 * @slot - `<option value="…">Label</option>` elements. `disabled` and `selected` are honoured.
 * @csspart options - The track (`role="radiogroup"`).
 * @csspart option - Each option (`role="radio"`).
 * @csspart label - The visible label, when `label` is set.
 * @fires change - When the merchant picks a different option.
 * @fires input - Same moment as `change`.
 */
export class CmSegmentedControl extends CmOptionGroup {
  static properties = {
    ...CmOptionGroup.properties,
    size: { reflect: true },
  };

  /**
   * `default`: a 36px track, the height of buttons and fields beside it. `small`: 32px, for toolbars, filter rows and
   * card headers next to small fields and slim buttons. On touch screens both are 44px tall.
   */
  size: 'default' | 'small' = 'default';

  static styles = [
    base,
    css`
      :host { display: inline-block; vertical-align: middle; max-width: 100%; --_h: var(--cm-control-height-md, 36px); }
      :host([size='small']) { --_h: var(--cm-control-height-sm, 32px); }
      @media (pointer: coarse) { :host, :host([size='small']) { --_h: var(--cm-control-height-touch, 44px); } }
      .label {
        display: block; margin-bottom: var(--cm-space-8);
        font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 500;
      }
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
      .options {
        display: inline-flex; max-width: 100%; height: var(--_h); padding: 2px; gap: 2px;
        background: var(--cm-bg-hover); border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-sm);
      }
      button {
        flex: 1 1 auto; min-width: 0; height: 100%; padding: 0 var(--cm-space-12);
        font: inherit; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 500; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis;
        color: var(--cm-text-tertiary); background: none; cursor: pointer;
        border: var(--cm-border-1) solid transparent; border-radius: var(--cm-radius-xs);
      }
      :host([size='small']) button { padding: 0 var(--cm-space-8); font-size: var(--cm-font-size-13); }
      button:hover:not(:disabled) { color: var(--cm-text-default); }
      /* Selected: a white segment with the control outline (border-input, 3:1 or more) and dark text, so the choice
         doesn't rest on colour alone. */
      button[aria-checked='true'] { color: var(--cm-text-default); background: var(--cm-bg-surface); border-color: var(--cm-border-input); }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 1px; }
      button:disabled { color: var(--cm-text-secondary); cursor: not-allowed; }
      button[aria-checked='true']:disabled { background: var(--cm-bg-input-filled); border-color: var(--cm-border-subtle); }
      :host([disabled]) .options { background: var(--cm-bg-input-filled); }
      slot { display: none; }
    `,
  ];
}
define('cm-segmented-control', CmSegmentedControl);

declare global { interface HTMLElementTagNameMap { 'cm-segmented-control': CmSegmentedControl } }
