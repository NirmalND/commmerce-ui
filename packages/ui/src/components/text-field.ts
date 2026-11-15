import { LitElement, html, css, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';

const strings = defineStrings('textField', {
  /** Validation message when `required` and empty. */
  required: 'Please fill in this field.',
});
declare module '../localize.js' { interface CmStrings { textField: typeof strings } }

/**
 * Labelled single- or multi-line input. Participates in native forms.
 * @element cm-text-field
 * @fires input - On every keystroke (bubbles, composed).
 * @fires change - When the value is committed.
 */
export class CmTextField extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    hint: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: {},
    placeholder: {},
    type: {},
    multiline: { type: Boolean },
    rows: { type: Number },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    readonly: { type: Boolean, reflect: true },
    autocomplete: {},
    size: { reflect: true },
  };

  /** Visible label above the box. Required for accessibility unless the field has an aria-label. */
  label = '';
  /** Lowercase bracketed note after the label, e.g. "points earned per rupee spent". */
  hint = '';
  /** One sentence under the box in text-tertiary. */
  helpText = '';
  /** Error message; turns the border critical and sets aria-invalid. */
  error = '';
  /** Form field name. */
  name = '';
  /** Current value. Updated on every keystroke. */
  value = '';
  /** Example input, shown in text-tertiary. Never a substitute for the label. */
  placeholder = '';
  /** Native input type. Ignored when `multiline`. */
  type: 'text' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'url' | 'date' = 'text';
  /** Renders a resizable textarea. */
  multiline = false;
  /** Visible rows when `multiline`. */
  rows = 4;
  /** Shows a red asterisk and blocks form submission while empty. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Shows the value on the filled background; the value is still submitted. */
  readonly = false;
  /** Native autocomplete hint, e.g. `email`, `postal-code`. */
  autocomplete?: string;
  /** `small`: 12px label, 14px value (filter panels). */
  size: 'default' | 'small' = 'default';

  #internals = this.attachInternals();
  #id = nextId('cm-tf');
  #defaultValue = '';

  static styles = [
    base,
    css`
      :host { display: block; }
      .field { display: flex; flex-direction: column; gap: var(--cm-space-10); }
      label { font-size: var(--cm-type-label-size); color: var(--cm-text-default); }
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
      .hint { margin-inline-start: var(--cm-space-10); font-size: 12px; color: var(--cm-text-tertiary); text-transform: lowercase; }
      .input {
        width: 100%; height: 42px; padding: 0 var(--cm-space-10);
        font: inherit; font-size: 16px; color: var(--cm-text-default);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input);
        border-radius: var(--cm-radius-sm); outline: none;
      }
      textarea.input { height: auto; padding: var(--cm-space-10); resize: vertical; }
      .input::placeholder { color: var(--cm-text-tertiary); }
      .input:focus { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .input:read-only, .input:disabled { background: var(--cm-bg-input-filled); }
      .input:disabled { color: var(--cm-text-secondary); border-color: var(--cm-border-default); cursor: not-allowed; }
      :host([error]:not([error=''])) .input { border-color: var(--cm-border-critical); }
      .help { margin: 0; font-size: 12px; color: var(--cm-text-tertiary); }
      .error { margin: 0; font-size: 12px; color: var(--cm-text-critical); }
      :host([size='small']) .field { gap: 6px; }
      :host([size='small']) label { font-size: 12px; }
      :host([size='small']) .input { font-size: 14px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#defaultValue = this.value;
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }

  formResetCallback() {
    this.value = this.#defaultValue;
    this.error = '';
  }
  formDisabledCallback(disabled: boolean) { this.disabled = disabled; }

  updated() {
    this.#internals.setFormValue(this.value);
    const control = this.renderRoot.querySelector<HTMLInputElement | HTMLTextAreaElement>('.input');
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, control ?? undefined);
    else if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, this.t('required'), control ?? undefined);
    else this.#internals.setValidity({});
  }

  #onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
  }
  #onChange() {
    // native change does not cross the shadow boundary; re-dispatch it
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  render() {
    const describedBy = [this.error && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ') || nothing;
    const common = {
      id: this.#id,
      invalid: this.error ? 'true' : nothing,
    };
    const control = this.multiline
      ? html`<textarea class="input" part="input" id=${common.id} rows=${this.rows}
          .value=${live(this.value)} placeholder=${this.placeholder || nothing}
          ?required=${this.required} ?disabled=${this.disabled} ?readonly=${this.readonly}
          aria-invalid=${common.invalid} aria-describedby=${describedBy}
          @input=${this.#onInput} @change=${this.#onChange}></textarea>`
      : html`<input class="input" part="input" id=${common.id} type=${this.type}
          .value=${live(this.value)} placeholder=${this.placeholder || nothing}
          autocomplete=${this.autocomplete ?? nothing}
          ?required=${this.required} ?disabled=${this.disabled} ?readonly=${this.readonly}
          aria-invalid=${common.invalid} aria-describedby=${describedBy}
          @input=${this.#onInput} @change=${this.#onChange} />`;
    return html`<div class="field">
      ${this.label
        ? html`<label for=${this.#id} part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}${this.hint ? html`<span class="hint">[${this.hint}]</span>` : nothing}</label>`
        : nothing}
      ${control}
      ${this.error ? html`<p class="error" id="${this.#id}-err" role="alert">${this.error}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
    </div>`;
  }
}
define('cm-text-field', CmTextField);

declare global { interface HTMLElementTagNameMap { 'cm-text-field': CmTextField } }
