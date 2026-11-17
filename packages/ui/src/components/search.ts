import { LitElement, html, css, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { fieldStyles } from '../field.js';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('search', {
  /** Accessible name and placeholder of the field. */
  label: 'Search',
  placeholder: 'Search',
  /** Accessible name of the filter button, and of it with filters applied. */
  filter: 'Filter',
  filterApplied: '{label} ({count} applied)',
  /** Accessible name of the clear button. */
  clear: 'Clear search',
});
declare module '../localize.js' { interface CmStrings { search: typeof strings } }

/**
 * Search box for the top of lists and tables, with an optional filter button.
 * Participates in native forms.
 * @element cm-search
 * @fires input - On every keystroke, and when cleared.
 * @fires change - When the value is committed (Enter or blur after typing, or clear).
 * @fires cm-search - When the merchant presses Enter. `detail.value` is the query.
 * @fires cm-filter - When the filter button is pressed. Open a filter panel in response.
 */
export class CmSearch extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: { string: 'label' },
    name: { reflect: true },
    value: {},
    placeholder: { string: 'placeholder' },
    filter: { type: Boolean },
    filterLabel: { attribute: 'filter-label', string: 'filter' },
    filterCount: { type: Number, attribute: 'filter-count' },
    size: { reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Accessible name, read by screen readers but not shown. Say what is searched: "Search orders". Default: the built-in string `label` ("Search"). */
  label!: string;
  /** Form field name. */
  name = '';
  /** Current query. Updated on every keystroke. */
  value = '';
  /** Example query, shown in text-tertiary. Default: the built-in string `placeholder` ("Search"). */
  placeholder!: string;
  /** Shows the filter button at the end of the box. */
  filter = false;
  /** Accessible name of the filter button. Default: the built-in string `filter` ("Filter"). */
  filterLabel!: string;
  /** Number of filters applied; shown on the filter button when above 0. */
  filterCount = 0;
  /**
   * `default` 40px (since 1.6, owner standard; was 36px); `small` 32px (toolbars, filter rows and table headers, since 1.5);
   * `large` 40px (page-level search; the same as the default since 1.6, kept for compatibility). On touch screens every size is 44px.
   */
  size: 'default' | 'small' | 'large' = 'default';
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;

  #internals = this.attachInternals();
  #id = nextId('cm-search');
  #defaultValue = '';

  static styles = [
    base,
    fieldStyles,
    css`
      :host { display: block; }
      :host([size='large']) { --_cm-field-h: var(--cm-control-height-lg, 40px); }
      @media (pointer: coarse) { :host([size='large']) { --_cm-field-h: var(--cm-control-height-touch, 44px); } button { width: 32px; height: 32px; } }
      .box {
        display: flex; align-items: center; gap: var(--cm-space-8); height: var(--_cm-field-h); padding-block: 0; padding-inline: var(--_cm-field-pad) var(--cm-space-8);
        background: var(--cm-bg-surface); color: var(--cm-text-default);
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      /* Hover (1.6): the outline darkens; focus adds the 2px ring. */
      :host(:not([disabled])) .box:hover { border-color: var(--cm-border-strong); }
      .box:focus-within { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .icon { flex: none; color: var(--cm-text-tertiary); }
      input {
        flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; background: none; outline: none;
        font: inherit; font-size: var(--_cm-field-font); color: var(--cm-text-default);
      }
      input::placeholder { color: var(--cm-text-tertiary); }
      input::-webkit-search-cancel-button { display: none; }
      button {
        position: relative; flex: none; display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; margin: 0; padding: 0; border: 0; border-radius: var(--cm-radius-xs);
        background: none; color: var(--cm-icon-selected); cursor: pointer;
      }
      button:hover { background: var(--cm-bg-hover); }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 0; }
      .count {
        position: absolute; top: -4px; inset-inline-end: -4px; min-width: 16px; height: 16px; padding: 0 var(--cm-space-4); border-radius: var(--cm-radius-full);
        background: var(--cm-action-primary); color: var(--cm-action-primary-text);
        font-size: var(--cm-font-size-12); line-height: 16px; font-weight: 500; font-variant-numeric: tabular-nums;
      }
      :host([disabled]) .box { background: var(--cm-bg-input-filled); border-color: var(--cm-border-subtle); }
      :host([disabled]) input { color: var(--cm-text-secondary); cursor: not-allowed; }
      :host([disabled]) button { cursor: not-allowed; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#defaultValue = this.value;
  }
  get form() { return this.#internals.form; }
  checkValidity() { return this.#internals.checkValidity(); }
  formResetCallback() { this.value = this.#defaultValue; }
  formDisabledCallback(d: boolean) { this.disabled = d; }
  formStateRestoreCallback(state: string) { this.value = state; }

  updated() { this.#internals.setFormValue(this.value); }

  #fire(type: string, detail?: unknown) {
    this.dispatchEvent(detail === undefined
      ? new Event(type, { bubbles: true, composed: true })
      : new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  #onInput(e: Event) { this.value = (e.target as HTMLInputElement).value; }
  #onKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') this.#fire('cm-search', { value: this.value });
    else if (e.key === 'Escape' && this.value) { e.preventDefault(); this.#clear(); }
  }
  #clear() {
    this.value = '';
    this.renderRoot.querySelector('input')?.focus();
    this.#fire('input');
    this.#fire('change');
  }

  render() {
    return html`<div class="box" part="box">
      <cm-icon class="icon" name="search" size="16"></cm-icon>
      <input id=${this.#id} part="input" type="search" enterkeyhint="search" autocomplete="off"
        aria-label=${this.label} .value=${live(this.value)} placeholder=${this.placeholder || nothing} ?disabled=${this.disabled}
        @input=${this.#onInput} @change=${() => this.#fire('change')} @keydown=${this.#onKeyDown} />
      ${this.value && !this.disabled
        ? html`<button type="button" class="clear" part="clear" aria-label=${this.t('clear')} @click=${this.#clear}><cm-icon name="close" size="16"></cm-icon></button>`
        : nothing}
      ${this.filter
        ? html`<button type="button" class="filter" part="filter" ?disabled=${this.disabled}
            aria-label=${this.filterCount > 0 ? this.t('filterApplied', { label: this.filterLabel, count: this.filterCount }) : this.filterLabel}
            @click=${() => this.#fire('cm-filter')}><cm-icon name="filter" size="16"></cm-icon>${this.filterCount > 0 ? html`<span class="count" aria-hidden="true">${this.filterCount}</span>` : nothing}</button>`
        : nothing}
    </div>`;
  }
}
define('cm-search', CmSearch);

declare global { interface HTMLElementTagNameMap { 'cm-search': CmSearch } }
