import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import type { SelectOption } from './select.js';

/**
 * A row of outlined buttons where exactly one is selected (black), used to switch a form between
 * types, such as offer types. Behaves like a native radio group: one tab stop, arrow keys move and
 * select, and the form receives the selected value.
 *
 * Options come from `<option>` children or the `options` property.
 * @element cm-option-group
 * @slot - `<option value="…">Label</option>` elements. `disabled` and `selected` are honoured.
 * @fires change - When the merchant picks a different option.
 * @fires input - Same moment as `change`.
 */
export class CmOptionGroup extends LitElement {
  static formAssociated = true;
  static properties = {
    label: {},
    name: { reflect: true },
    value: {},
    options: { type: Array },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _slotted: { state: true },
  };

  /** Heading above the options, e.g. "Select offer type". Without one, give the element an `aria-label`. */
  label = '';
  /** Form field name. */
  name = '';
  /** Value of the selected option; empty when nothing is selected. */
  value = '';
  /** Options as strings or `{ value, label, disabled }`. Used instead of `<option>` children when set. */
  options: Array<string | SelectOption> = [];
  /** The form will not submit until an option is chosen. */
  required = false;
  /** Blocks every option. Also set by a disabled `<fieldset>`. */
  disabled = false;

  _slotted: SelectOption[] = [];

  #internals = this.attachInternals();
  #id = nextId('cm-og');
  #defaultValue = '';
  #observer = new MutationObserver(() => this.#readChildren());

  static styles = [
    base,
    css`
      :host { display: block; }
      .label { display: block; margin-bottom: var(--cm-space-20); font-size: var(--cm-type-heading-sm-size); font-weight: 600; }
      .req { color: var(--cm-text-critical); margin-left: 2px; }
      .options { display: flex; flex-wrap: wrap; gap: var(--cm-space-20); }
      button {
        height: 46px; padding: 0 var(--cm-space-20); font: inherit; font-size: 16px; font-weight: 500; white-space: nowrap;
        color: var(--cm-text-default); background: var(--cm-bg-hover); cursor: pointer;
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      button:hover { border-color: var(--cm-border-strong); }
      button[aria-checked='true'] { background: var(--cm-action-primary); color: var(--cm-action-primary-text); border-color: var(--cm-action-primary); }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      button:disabled { background: var(--cm-bg-input-filled); color: var(--cm-text-secondary); border-color: var(--cm-border-default); cursor: not-allowed; }
      button[aria-checked='true']:disabled { background: var(--cm-action-disabled); color: var(--cm-action-disabled-text); }
      slot { display: none; }
      @media (max-width: 640px) {
        .label { font-size: var(--cm-type-heading-sm-resp-size); }
        .options { gap: var(--cm-space-10); }
        button { height: 42px; padding: 0 var(--cm-space-15); font-size: 14px; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#readChildren();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'label', 'disabled', 'selected'] });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  formResetCallback() { this.value = this.#defaultValue; }
  formDisabledCallback(d: boolean) { this.disabled = d; }
  formStateRestoreCallback(state: string) { this.value = state; }

  /** Focuses the selected option, or the first one. */
  override focus(options?: FocusOptions) {
    this.renderRoot.querySelector<HTMLElement>('button[tabindex="0"]')?.focus(options);
  }

  /** The options in use, normalised. */
  get items(): SelectOption[] {
    if (!this.options.length) return this._slotted;
    return this.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  }

  #readChildren() {
    const opts = [...this.querySelectorAll('option')];
    this._slotted = opts.map((o) => ({ value: o.value, label: o.label || o.textContent!.trim(), disabled: o.disabled }));
    if (!this.hasUpdated && !this.value) {
      this.value = opts.find((o) => o.hasAttribute('selected'))?.value ?? '';
      this.#defaultValue = this.value;
    }
  }

  firstUpdated() { this.#defaultValue ||= this.value; }

  updated() {
    this.#internals.setFormValue(this.value || null, this.value);
    const anchor = this.renderRoot.querySelector('button') ?? undefined;
    if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, 'Please select one of these options.', anchor);
    else this.#internals.setValidity({});
  }

  #select(i: number) {
    const o = this.items[i];
    if (!o || o.disabled || this.disabled) return;
    this.updateComplete.then(() => this.renderRoot.querySelectorAll('button')[i]?.focus());
    if (o.value === this.value) return;
    this.value = o.value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onKeyDown(e: KeyboardEvent, i: number) {
    const en = this.items.flatMap((o, j) => (o.disabled ? [] : [j]));
    const pos = en.indexOf(i);
    let next: number | undefined;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = en[(pos + 1) % en.length];
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = en[(pos - 1 + en.length) % en.length];
    else if (e.key === 'Home') next = en[0];
    else if (e.key === 'End') next = en[en.length - 1];
    else return;
    e.preventDefault();
    if (next !== undefined) this.#select(next);
  }

  render() {
    const items = this.items;
    const sel = items.findIndex((o) => o.value === this.value && !o.disabled);
    const stop = sel >= 0 ? sel : items.findIndex((o) => !o.disabled);
    const hostLabel = this.getAttribute('aria-label');
    return html`
      ${this.label ? html`<span class="label" id="${this.#id}-l" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>` : nothing}
      <div class="options" part="options" role="radiogroup"
        aria-labelledby=${this.label ? `${this.#id}-l` : nothing} aria-label=${!this.label && hostLabel ? hostLabel : nothing}
        aria-required=${this.required ? 'true' : nothing}>
        ${items.map((o, i) => html`<button type="button" role="radio" part="option" aria-checked=${o.value === this.value ? 'true' : 'false'}
            tabindex=${i === stop ? '0' : '-1'} ?disabled=${this.disabled || !!o.disabled}
            @click=${() => this.#select(i)} @keydown=${(e: KeyboardEvent) => this.#onKeyDown(e, i)}>${o.label}</button>`)}
      </div>
      <slot></slot>
    `;
  }
}
define('cm-option-group', CmOptionGroup);

declare global { interface HTMLElementTagNameMap { 'cm-option-group': CmOptionGroup } }
