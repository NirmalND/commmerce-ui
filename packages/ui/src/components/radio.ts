import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';

/**
 * One option in a `<cm-radio-group>`. On its own it does nothing: the group owns
 * the value, the keyboard behaviour and the form submission.
 * @element cm-radio
 * @slot - Rich label content, used instead of `label`.
 */
export class CmRadio extends LitElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    description: {},
    value: { reflect: true },
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    groupDisabled: { type: Boolean, reflect: true, attribute: 'group-disabled' },
    _tabbable: { state: true },
  };

  /** Visible label. Write it in sentence case. */
  label = '';
  /** Help text under the label, linked for screen readers. */
  description = '';
  /** The group's value when this option is selected. */
  value = '';
  /** Selected. Set by the group; set it in markup to choose the initial option. */
  checked = false;
  /** This option can't be chosen. Arrow keys skip it. */
  disabled = false;
  /** @internal Set by a disabled group. */
  groupDisabled = false;
  /** @internal Roving tab stop, managed by the group. */
  _tabbable = false;

  #id = nextId('cm-radio');

  static styles = [
    base,
    css`
      :host { display: inline-flex; }
      .radio { display: inline-flex; align-items: flex-start; gap: var(--cm-space-8); padding-block: 2px; cursor: pointer; outline: none; }
      .dot {
        position: relative; flex: none; width: 16px; height: 16px; margin-block: 2px; border-radius: var(--cm-radius-full);
        border: var(--cm-border-1) solid var(--cm-border-strong); background: var(--cm-bg-surface);
      }
      :host([checked]) .dot { background: var(--cm-border-strong); }
      :host([checked]) .dot::after {
        content: ''; position: absolute; inset: 0; margin: auto; width: 8px; height: 8px;
        border-radius: var(--cm-radius-full); background: var(--cm-bg-surface);
      }
      .radio:focus-visible .dot { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .text { display: flex; flex-direction: column; gap: 2px; }
      .label { font-size: var(--cm-type-body-md-size); line-height: var(--cm-type-body-md-line-height); }
      .desc { font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-tertiary); }
      :host([disabled]) .radio, :host([group-disabled]) .radio { cursor: not-allowed; }
      :host([disabled]) .dot, :host([group-disabled]) .dot { background: var(--cm-bg-input-filled); border-color: var(--cm-border-subtle); }
      :host([disabled][checked]) .dot, :host([group-disabled][checked]) .dot { background: var(--cm-border-subtle); }
      :host([disabled]) .label, :host([group-disabled]) .label { color: var(--cm-text-secondary); }
    `,
  ];

  render() {
    const desc = this.description ? `${this.#id}-d` : null;
    return html`<div class="radio" part="radio" role="radio" id=${this.#id}
        aria-checked=${this.checked ? 'true' : 'false'} aria-disabled=${this.disabled || this.groupDisabled ? 'true' : nothing}
        aria-describedby=${desc ?? nothing} tabindex=${this._tabbable && !this.disabled && !this.groupDisabled ? '0' : '-1'}>
      <span class="dot" part="dot"></span>
      <span class="text"><span class="label">${this.label}<slot></slot></span>${desc ? html`<span class="desc" id=${desc}>${this.description}</span>` : nothing}</span>
    </div>`;
  }
}
define('cm-radio', CmRadio);

const strings = defineStrings('radioGroup', {
  /** Validation message when `required` and nothing is chosen. */
  required: 'Please select one of these options.',
});
declare module '../localize.js' { interface CmStrings { radioGroup: typeof strings } }

/**
 * A set of `<cm-radio>` options where exactly one can be chosen. Behaves like a native radio group:
 * one tab stop, arrow keys move and select, and the form receives the selected value.
 * @element cm-radio-group
 * @slot - The `<cm-radio>` options.
 * @slot label - Rich label content, used instead of `label`.
 * @fires change - When the merchant picks a different option.
 * @fires input - Same moment as `change`, for frameworks that listen to `input`.
 */
export class CmRadioGroup extends CmLocalizedElement {
  static formAssociated = true;
  static properties = {
    label: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: { reflect: true },
    orientation: { reflect: true },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Question above the options. Required for accessibility unless the group has an aria-label. */
  label = '';
  /** One sentence under the label in text-tertiary. */
  helpText = '';
  /** Error message; announced and linked to the group. */
  error = '';
  /** Form field name. */
  name = '';
  /** Value of the selected option; empty when nothing is selected. */
  value = '';
  /** `vertical` stacks options `space-20` apart; `horizontal` puts them in a row `space-30` apart. */
  orientation: 'vertical' | 'horizontal' = 'vertical';
  /** The form will not submit until an option is chosen. */
  required = false;
  /** Blocks every option. Also set by a disabled `<fieldset>`. */
  disabled = false;

  #internals = this.attachInternals();
  #id = nextId('cm-rg');
  #defaultValue = '';

  static styles = [
    base,
    css`
      :host { display: block; }
      .group { display: flex; flex-direction: column; gap: var(--cm-space-8); }
      .label { font-size: var(--cm-type-label-size); line-height: var(--cm-type-label-line-height); font-weight: var(--cm-type-label-weight); color: var(--cm-text-default); }
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
      .help, .error { margin: 0; font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-tertiary); }
      .error { color: var(--cm-text-critical); }
      .options { display: flex; flex-direction: column; align-items: flex-start; gap: var(--cm-space-12); padding-top: var(--cm-space-4); }
      :host([orientation='horizontal']) .options { flex-direction: row; flex-wrap: wrap; column-gap: var(--cm-space-24); }
    `,
  ];

  constructor() {
    super();
    this.addEventListener('keydown', this.#onKeyDown);
    this.addEventListener('click', this.#onClick);
  }

  connectedCallback() {
    super.connectedCallback();
    this.#adoptInitial();
  }

  // Options may be parsed or upgraded after the group, so the initial value is taken from a
  // `checked` option whenever options arrive, until the value has been set some other way.
  #pristine = true;
  #rendered = false;
  #adopting = false;
  #adoptInitial() {
    if (!this.#pristine) return;
    if (!this.value) {
      this.#adopting = true;
      this.value = this.#radios().find((r) => r.hasAttribute('checked'))?.getAttribute('value') ?? '';
      this.updateComplete.then(() => (this.#adopting = false));
    }
    this.#defaultValue = this.value;
  }
  #onSlotChange = () => { this.#adoptInitial(); this.#sync(); };

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
    (this.#radios().find((r) => r._tabbable) ?? this.#radios()[0])?.focus(options);
  }

  #radios(): CmRadio[] { return [...this.querySelectorAll<CmRadio>('cm-radio')]; }
  #enabled() { return this.#radios().filter((r) => !r.disabled && !this.disabled); }

  #sync = () => {
    const radios = this.#radios();
    let found = false;
    for (const r of radios) {
      r.checked = !!this.value && r.value === this.value && !found;
      if (r.checked) found = true;
      r.groupDisabled = this.disabled;
    }
    const stop = radios.find((r) => r.checked && !r.disabled) ?? this.#enabled()[0];
    for (const r of radios) r._tabbable = r === stop && !this.disabled;
  };

  updated(changed: Map<string, unknown>) {
    if (changed.has('value') && this.#rendered && !this.#adopting) this.#pristine = false;
    this.#rendered = true;
    this.#sync();
    this.#internals.setFormValue(this.value || null, this.value);
    const anchor = this.#radios()[0];
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, anchor);
    else if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, this.t('required'), anchor);
    else this.#internals.setValidity({});
  }

  #select(r: CmRadio, focus: boolean) {
    if (focus) r.focus();
    if (r.value === this.value) return;
    this.value = r.value;
    this.#sync();
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onClick = (e: MouseEvent) => {
    const r = (e.target as Element).closest?.('cm-radio') as CmRadio | null;
    if (!r || r.disabled || this.disabled || !this.contains(r)) return;
    this.#select(r, true);
  };

  #onKeyDown = (e: KeyboardEvent) => {
    const r = (e.target as Element).closest?.('cm-radio') as CmRadio | null;
    if (!r || this.disabled) return;
    const list = this.#enabled();
    const i = list.indexOf(r);
    const key = logicalKey(e, this);
    let next: CmRadio | undefined;
    if (e.key === 'ArrowDown' || key === 'ArrowRight') next = list[(i + 1) % list.length];
    else if (e.key === 'ArrowUp' || key === 'ArrowLeft') next = list[(i - 1 + list.length) % list.length];
    else if (e.key === ' ') next = r.disabled ? undefined : r;
    else return;
    e.preventDefault();
    if (next) this.#select(next, true);
  };

  #hasLabel() { return !!this.label || !!this.querySelector('[slot=label]'); }

  render() {
    const described = [this.error && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ');
    return html`<div class="group" role="radiogroup" part="group"
        aria-labelledby=${this.#hasLabel() ? `${this.#id}-l` : nothing} aria-label=${this.#hasLabel() ? nothing : this.getAttribute('aria-label') ?? nothing}
        aria-describedby=${described || nothing}
        aria-required=${this.required ? 'true' : nothing} aria-invalid=${this.error ? 'true' : nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}>
      <span class="label" id="${this.#id}-l" part="label" ?hidden=${!this.#hasLabel()}>${this.label}<slot name="label"></slot>${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
      ${this.error ? html`<p class="error" id="${this.#id}-err" role="alert">${this.error}</p>` : nothing}
      <div class="options" part="options"><slot @slotchange=${this.#onSlotChange}></slot></div>
    </div>`;
  }
}
define('cm-radio-group', CmRadioGroup);

declare global {
  interface HTMLElementTagNameMap { 'cm-radio': CmRadio; 'cm-radio-group': CmRadioGroup }
}
