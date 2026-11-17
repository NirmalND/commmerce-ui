import { LitElement, html, css, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId } from '../base.js';
import { fieldStyles } from '../field.js';
import { CmLocalizedElement, defineStrings, formatDate } from '../localize.js';

const strings = defineStrings('textField', {
  /** Validation message when `required` and empty. */
  required: 'Please fill in this field.',
  /** Validation: a date or time before `min`. `{min}` is the min in the page language, e.g. "16 Nov 2026, 3:30 pm". */
  rangeUnderflow: 'Enter {min} or later.',
  /** Validation: a date or time after `max`. */
  rangeOverflow: 'Enter {max} or earlier.',
  /** Validation: a number below `min`. */
  numberUnderflow: 'Enter {min} or more.',
  /** Validation: a number above `max`. */
  numberOverflow: 'Enter {max} or less.',
  /** Validation: a value off the `step`. `{lower}` and `{upper}` are the nearest allowed values. */
  stepMismatch: 'Enter a valid value. The two nearest are {lower} and {upper}.',
  /** Validation, `type="time"`: the time is only partly filled in. */
  badTime: 'Enter a complete time.',
  /** Validation, `type="datetime-local"`: the date and time are only partly filled in. */
  badDateTime: 'Enter a complete date and time.',
});
declare module '../localize.js' { interface CmStrings { textField: typeof strings } }

/**
 * Labelled single- or multi-line input. Participates in native forms.
 * `type="date"`, `"time"` and `"datetime-local"` use the browser's own picker; their values are ISO and local
 * (`yyyy-mm-dd`, `hh:mm`, `yyyy-mm-ddThh:mm`), with no time zone.
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
    min: {},
    max: {},
    step: {},
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
  /**
   * Native input type. Ignored when `multiline`. `time` and `datetime-local` (since 1.2) give the browser's time and
   * date-and-time pickers; their value is local time without a time zone, `hh:mm` and `yyyy-mm-ddThh:mm`.
   */
  type: 'text' | 'email' | 'number' | 'password' | 'search' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' = 'text';
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
  /** `small`: a 32px box with a 13px label, for toolbars, filter rows and filter panels. Default: a 36px box. On touch screens both are 44px. */
  size: 'default' | 'small' = 'default';
  /**
   * Lowest allowed value for `number`, `date`, `time` and `datetime-local`, in the value's format (`2026-11-16T15:30`
   * for `datetime-local`). The browser's picker doesn't offer earlier dates; an earlier value makes the field invalid.
   */
  min?: string;
  /** Highest allowed value for `number`, `date`, `time` and `datetime-local`, in the value's format. */
  max?: string;
  /**
   * Allowed steps from `min`, as on a native input: a number for `number`, days for `date`, seconds for `time` and
   * `datetime-local` (`900` = 15 minutes; under 60 shows seconds). `any` allows every value.
   */
  step?: string;

  #internals = this.attachInternals();
  #id = nextId('cm-tf');
  #defaultValue = '';

  static styles = [
    base,
    fieldStyles,
    css`
      :host { display: block; }
      .input {
        width: 100%; height: var(--_cm-field-h); padding: 0 var(--_cm-field-pad);
        font: inherit; font-size: var(--_cm-field-font); line-height: var(--cm-line-height-14); color: var(--cm-text-default);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input);
        border-radius: var(--cm-radius-sm); outline: none;
      }
      textarea.input { height: auto; min-height: var(--_cm-field-h); padding: var(--cm-space-8) var(--_cm-field-pad); resize: vertical; }
      .input::placeholder { color: var(--cm-text-tertiary); }
      .input:focus { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .input:read-only, .input:disabled { background: var(--cm-bg-input-filled); }
      .input:disabled { color: var(--cm-text-secondary); border-color: var(--cm-border-subtle); cursor: not-allowed; }
      :host([error]:not([error=''])) .input { border-color: var(--cm-border-critical); }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#defaultValue = this.value;
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { this.#validate(); return this.#internals.checkValidity(); }
  reportValidity() { this.#validate(); return this.#internals.reportValidity(); }

  formResetCallback() {
    this.value = this.#defaultValue;
    this.error = '';
  }
  formDisabledCallback(disabled: boolean) { this.disabled = disabled; }

  updated() {
    this.#internals.setFormValue(this.value);
    this.#validate();
  }

  #validate() {
    const control = this.renderRoot.querySelector<HTMLInputElement | HTMLTextAreaElement>('.input');
    const native = control instanceof HTMLInputElement ? control.validity : null;
    const dated = this.type === 'time' || this.type === 'datetime-local';
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, control ?? undefined);
    // A half-typed time reads as an empty value; say so instead of "fill in this field".
    else if (dated && native?.badInput) this.#internals.setValidity({ badInput: true }, this.t(this.type === 'time' ? 'badTime' : 'badDateTime'), control ?? undefined);
    else if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, this.t('required'), control ?? undefined);
    else if (!this.multiline && native?.rangeUnderflow) this.#internals.setValidity({ rangeUnderflow: true }, this.t(this.type === 'number' ? 'numberUnderflow' : 'rangeUnderflow', { min: this.#show(this.min ?? '') }), control ?? undefined);
    else if (!this.multiline && native?.rangeOverflow) this.#internals.setValidity({ rangeOverflow: true }, this.t(this.type === 'number' ? 'numberOverflow' : 'rangeOverflow', { max: this.#show(this.max ?? '') }), control ?? undefined);
    // Only with an explicit `step`: a number like 12.50 stays valid, as before 1.2.
    else if (!this.multiline && this.step && native?.stepMismatch) this.#internals.setValidity({ stepMismatch: true }, this.t('stepMismatch', this.#nearest(control as HTMLInputElement)), control ?? undefined);
    else this.#internals.setValidity({});
  }

  /** A value of this field's type in the page language: "16 Nov 2026, 3:30 pm", "3:30 pm", "1,000". */
  #show(v: string) {
    const locale = this.locale;
    if (this.type === 'number' && v !== '' && Number.isFinite(Number(v))) return this.formatNumber(Number(v));
    if (this.type === 'time') {
      const t = /^(\d{2}):(\d{2})/.exec(v);
      return t ? formatDate(new Date(2000, 0, 1, +t[1], +t[2]), { hour: 'numeric', minute: '2-digit' }, locale) : v;
    }
    const m = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(v);
    if (!m) return v;
    const d = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0));
    return this.type === 'datetime-local'
      ? formatDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }, locale)
      : formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' }, locale);
  }

  /** The two allowed values either side of the current one, for the step message. */
  #nearest(input: HTMLInputElement) {
    const unit = this.type === 'date' ? 86_400_000 : this.type === 'time' || this.type === 'datetime-local' ? 1000 : 1;
    const step = Number(this.step) * unit || (this.type === 'date' ? 86_400_000 : this.type === 'number' ? 1 : 60_000);
    const v = input.valueAsNumber;
    const probe = document.createElement('input');
    probe.type = this.type;
    probe.value = this.min ?? '';
    const base = Number.isFinite(probe.valueAsNumber) ? probe.valueAsNumber : 0;
    const lower = base + Math.floor((v - base) / step) * step;
    const show = (n: number) => {
      if (this.type === 'number') return this.formatNumber(Number(n.toPrecision(12)));
      const d = new Date(n);
      const iso = d.toISOString();
      return this.#show(this.type === 'time' ? iso.slice(11, 16) : this.type === 'date' ? iso.slice(0, 10) : iso.slice(0, 16));
    };
    return { lower: show(lower), upper: show(lower + step) };
  }

  #onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
  }
  #onBlur() {
    // A half-typed date or time doesn't fire input; check it when the merchant leaves the box.
    this.#validate();
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
          min=${this.min || nothing} max=${this.max || nothing} step=${this.step || nothing}
          ?required=${this.required} ?disabled=${this.disabled} ?readonly=${this.readonly}
          aria-invalid=${common.invalid} aria-describedby=${describedBy}
          @input=${this.#onInput} @change=${this.#onChange} @blur=${this.#onBlur} />`;
    return html`<div class="field">
      ${this.label
        ? html`<label class="label" for=${this.#id} part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}${this.hint ? html`<span class="hint">[${this.hint}]</span>` : nothing}</label>`
        : nothing}
      ${control}
      ${this.error ? html`<p class="error" id="${this.#id}-err" role="alert">${this.error}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
    </div>`;
  }
}
define('cm-text-field', CmTextField);

declare global { interface HTMLElementTagNameMap { 'cm-text-field': CmTextField } }
