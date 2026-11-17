import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('tag', {
  /** Accessible name of the remove button. `{label}` is the tag's text. */
  remove: 'Remove {label}',
});
declare module '../localize.js' { interface CmStrings { tag: typeof strings } }

/**
 * Pill for a product tag or an applied filter value, optionally with a remove button.
 * Removing is up to you: listen for `cm-remove` and take the tag out of your list,
 * then move focus to the next tag or the field that adds tags.
 * @element cm-tag
 * @slot - The tag text.
 * @fires cm-remove - When the remove button is pressed.
 */
export class CmTag extends CmLocalizedElement {
  /** `focus()` on the tag focuses its remove button. */
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    removable: { type: Boolean, reflect: true },
    removeLabel: { attribute: 'remove-label' },
    disabled: { type: Boolean, reflect: true },
  };

  /** Shows the remove button. */
  removable = false;
  /** Accessible name of the remove button. Defaults to "Remove" plus the tag text. */
  removeLabel = '';
  /** Hides the remove button's action and dims the tag. */
  disabled = false;

  static styles = [
    base,
    css`
      :host { display: inline-flex; vertical-align: middle; max-width: 100%; }
      .tag {
        display: inline-flex; align-items: center; gap: var(--cm-space-4); min-width: 0; height: 24px; padding: 0 var(--cm-space-8);
        font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); color: var(--cm-text-default); background: var(--cm-bg-tag);
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-full);
      }
      :host([removable]) .tag { padding-inline-end: 4px; }
      .text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      button {
        flex: none; display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px;
        padding: 0; border: 0; border-radius: var(--cm-radius-full); background: none; color: var(--cm-icon-selected); cursor: pointer;
      }
      button:hover { background: var(--cm-bg-hover); color: var(--cm-text-default); }
      button:active { background: color-mix(in srgb, var(--cm-bg-hover), var(--cm-text-default) 8%); }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 0; }
      :host([disabled]) .tag { color: var(--cm-text-secondary); border-color: var(--cm-border-subtle); }
      :host([disabled]) button { cursor: not-allowed; color: var(--cm-text-secondary); background: none; }
    `,
  ];

  #remove() {
    if (this.disabled) return;
    this.dispatchEvent(new CustomEvent('cm-remove', { bubbles: true, composed: true }));
  }

  render() {
    const name = this.removeLabel || this.t('remove', { label: this.textContent?.trim() ?? '' }).trim();
    return html`<span class="tag" part="tag"><span class="text"><slot @slotchange=${() => this.requestUpdate()}></slot></span>${this.removable
      ? html`<button type="button" part="remove" aria-label=${name} ?disabled=${this.disabled} @click=${this.#remove}><cm-icon name="x-circle" size="14"></cm-icon></button>`
      : nothing}</span>`;
  }
}
define('cm-tag', CmTag);

declare global { interface HTMLElementTagNameMap { 'cm-tag': CmTag } }
