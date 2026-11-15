import { LitElement, html, css, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId } from '../base.js';
import './icon.js';

/**
 * Search box for the top of lists and tables, with an optional filter button.
 * Participates in native forms.
 * @element cm-search
 * @fires input - On every keystroke, and when cleared.
 * @fires change - When the value is committed (Enter or blur after typing, or clear).
 * @fires cm-search - When the merchant presses Enter. `detail.value` is the query.
 * @fires cm-filter - When the filter button is pressed. Open a filter panel in response.
 */
export class CmSearch extends LitElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    name: { reflect: true },
    value: {},
    placeholder: {},
    filter: { type: Boolean },
    filterLabel: { attribute: 'filter-label' },
    filterCount: { type: Number, attribute: 'filter-count' },
    size: { reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Accessible name, read by screen readers but not shown. Say what is searched: "Search orders". */
  label = 'Search';
  /** Form field name. */
  name = '';
  /** Current query. Updated on every keystroke. */
  value = '';
  /** Example query, shown in text-tertiary. */
  placeholder = 'Search';
  /** Shows the filter button at the end of the box. */
  filter = false;
  /** Accessible name of the filter button. */
  filterLabel = 'Filter';
  /** Number of filters applied; shown on the filter button when above 0. */
  filterCount = 0;
  /** `default` is 42px (table headers, mobile); `large` is 46px (page-level search). */
  size: 'default' | 'large' = 'default';
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;

  #internals = this.attachInternals();
  #id = nextId('cm-search');
  #defaultValue = '';

  static styles = [
    base,
    css`
      :host { display: block; }
      .box {
        display: flex; align-items: center; gap: var(--cm-space-10); height: 42px; padding: 0 var(--cm-space-10);
        background: var(--cm-bg-page); color: var(--cm-text-default);
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      :host([size='large']) .box { height: 46px; padding: 0 var(--cm-space-15); }
      .box:focus-within { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .icon { flex: none; color: var(--cm-icon-selected); }
      input {
        flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; background: none; outline: none;
        font: inherit; font-size: 14px; color: var(--cm-text-default);
      }
      input::placeholder { color: var(--cm-text-tertiary); }
      input::-webkit-search-cancel-button { display: none; }
      button {
        position: relative; flex: none; display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; margin: 0 -4px; padding: 0; border: 0; border-radius: var(--cm-radius-sm);
        background: none; color: var(--cm-icon-selected); cursor: pointer;
      }
      button:hover { background: var(--cm-bg-hover); }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 0; }
      .count {
        position: absolute; top: -2px; right: -2px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: var(--cm-radius-full);
        background: var(--cm-action-primary); color: var(--cm-action-primary-text); font-size: 10px; line-height: 16px;
      }
      :host([disabled]) .box { background: var(--cm-bg-input-filled); border-color: var(--cm-border-default); }
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
    const big = this.size === 'large';
    return html`<div class="box" part="box">
      <cm-icon class="icon" name="search" size=${big ? 16 : 14}></cm-icon>
      <input id=${this.#id} part="input" type="search" enterkeyhint="search" autocomplete="off"
        aria-label=${this.label} .value=${live(this.value)} placeholder=${this.placeholder || nothing} ?disabled=${this.disabled}
        @input=${this.#onInput} @change=${() => this.#fire('change')} @keydown=${this.#onKeyDown} />
      ${this.value && !this.disabled
        ? html`<button type="button" class="clear" part="clear" aria-label="Clear search" @click=${this.#clear}><cm-icon name="close" size="14"></cm-icon></button>`
        : nothing}
      ${this.filter
        ? html`<button type="button" class="filter" part="filter" ?disabled=${this.disabled}
            aria-label=${this.filterCount > 0 ? `${this.filterLabel} (${this.filterCount} applied)` : this.filterLabel}
            @click=${() => this.#fire('cm-filter')}><cm-icon name="filter" size="18"></cm-icon>${this.filterCount > 0 ? html`<span class="count" aria-hidden="true">${this.filterCount}</span>` : nothing}</button>`
        : nothing}
    </div>`;
  }
}
define('cm-search', CmSearch);

declare global { interface HTMLElementTagNameMap { 'cm-search': CmSearch } }
