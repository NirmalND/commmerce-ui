import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import type { SelectOption } from './select.js';

const strings = defineStrings('optionGroup', {
  /** Validation message when `required` and nothing is chosen. */
  required: 'Please select one of these options.',
});
declare module '../localize.js' { interface CmStrings { optionGroup: typeof strings } }

/** An option of `cm-option-group`. */
export interface OptionGroupOption extends SelectOption {
  /**
   * Colours the option by the outcome it records, as `cm-button`'s `tone`: `success` (green, "Signed up") or
   * `critical` (red, "Not interested"). The label still carries the meaning. Since 1.3.
   */
  tone?: 'critical' | 'success';
}

/**
 * A row of outlined buttons where exactly one is selected (black), used to switch a form between
 * types, such as offer types. Behaves like a native radio group: one tab stop, arrow keys move and
 * select, and the form receives the selected value.
 *
 * Options come from `<option>` children or the `options` property. A `tone` on an option (`<option tone="success">`
 * or `{ tone }`, since 1.3) colours it by the outcome it records: outlined in the tone, filled in it when selected.
 * @element cm-option-group
 * @slot - `<option value="…">Label</option>` elements. `disabled`, `selected` and `tone` (`success`, `critical`) are honoured.
 * @fires change - When the merchant picks a different option.
 * @fires input - Same moment as `change`.
 */
export class CmOptionGroup extends CmLocalizedElement {
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
  /** Options as strings or `{ value, label, disabled, tone }`. Used instead of `<option>` children when set. */
  options: Array<string | OptionGroupOption> = [];
  /** The form will not submit until an option is chosen. */
  required = false;
  /** Blocks every option. Also set by a disabled `<fieldset>`. */
  disabled = false;

  _slotted: OptionGroupOption[] = [];

  #internals = this.attachInternals();
  #id = nextId('cm-og');
  #defaultValue = '';
  #observer = new MutationObserver(() => this.#readChildren());

  static styles = [
    base,
    css`
      :host { display: block; }
      .label { display: block; margin-bottom: var(--cm-space-20); font-size: var(--cm-type-heading-sm-size); font-weight: 600; }
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
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
      /* Tones (1.3), the same token pairs as cm-button's tones (packages/tokens/scripts/contrast.mjs). Unselected: tone
         text and outline on bg-surface (text-critical on bg-hover is under 4.5:1 in dark), hover tints it. Selected:
         filled with the tone's text colour under action-primary-text; hover darkens it towards text-default. Selected
         and unselected differ by fill, not only hue; disabled options look like any disabled option. */
      button.tone-critical:not(:disabled) { --_tone: var(--cm-text-critical); --_edge: var(--cm-border-critical); --_tint: var(--cm-bg-critical); }
      button.tone-success:not(:disabled) { --_tone: var(--cm-text-success); --_edge: var(--cm-text-success); --_tint: var(--cm-bg-success-soft); }
      button[class^='tone-']:not(:disabled) { background: var(--cm-bg-surface); color: var(--_tone); border-color: var(--_edge); }
      button[class^='tone-']:not(:disabled):hover { background: linear-gradient(var(--_tint), var(--_tint)) var(--cm-bg-surface); }
      button[class^='tone-'][aria-checked='true']:not(:disabled) { background: var(--_tone); border-color: var(--_tone); color: var(--cm-action-primary-text); }
      button[class^='tone-'][aria-checked='true']:not(:disabled):hover {
        background: color-mix(in srgb, var(--_tone) 80%, var(--cm-text-default)); border-color: color-mix(in srgb, var(--_tone) 80%, var(--cm-text-default));
      }
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
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'label', 'disabled', 'selected', 'tone'] });
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
  get items(): OptionGroupOption[] {
    if (!this.options.length) return this._slotted;
    return this.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  }

  #readChildren() {
    const opts = [...this.querySelectorAll('option')];
    this._slotted = opts.map((o) => {
      const opt: OptionGroupOption = { value: o.value, label: o.label || o.textContent!.trim(), disabled: o.disabled };
      const tone = o.getAttribute('tone');
      if (tone === 'critical' || tone === 'success') opt.tone = tone;
      return opt;
    });
    if (!this.hasUpdated && !this.value) {
      this.value = opts.find((o) => o.hasAttribute('selected'))?.value ?? '';
      this.#defaultValue = this.value;
    }
  }

  firstUpdated() { this.#defaultValue ||= this.value; }

  updated() {
    this.#internals.setFormValue(this.value || null, this.value);
    const anchor = this.renderRoot.querySelector('button') ?? undefined;
    if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, this.t('required'), anchor);
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
    const key = logicalKey(e, this);
    const en = this.items.flatMap((o, j) => (o.disabled ? [] : [j]));
    const pos = en.indexOf(i);
    let next: number | undefined;
    if (key === 'ArrowRight' || e.key === 'ArrowDown') next = en[(pos + 1) % en.length];
    else if (key === 'ArrowLeft' || e.key === 'ArrowUp') next = en[(pos - 1 + en.length) % en.length];
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
        ${items.map((o, i) => html`<button type="button" role="radio" part="option" class=${o.tone === 'critical' || o.tone === 'success' ? `tone-${o.tone}` : nothing} aria-checked=${o.value === this.value ? 'true' : 'false'}
            tabindex=${i === stop ? '0' : '-1'} ?disabled=${this.disabled || !!o.disabled}
            @click=${() => this.#select(i)} @keydown=${(e: KeyboardEvent) => this.#onKeyDown(e, i)}>${o.label}</button>`)}
      </div>
      <slot></slot>
    `;
  }
}
define('cm-option-group', CmOptionGroup);

declare global { interface HTMLElementTagNameMap { 'cm-option-group': CmOptionGroup } }
