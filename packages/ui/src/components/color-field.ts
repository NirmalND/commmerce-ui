import { LitElement, html, css, nothing } from 'lit';
import { live } from 'lit/directives/live.js';
import { fieldStyles } from '../field.js';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('colorField', {
  /** Accessible name of each swatch with a name: "Blue, #2e6faf". */
  swatch: '{name}, {hex}',
  /** Accessible name of the hex box. `hexNamed` is used when the field has a label. */
  hex: 'Hex code',
  hexNamed: '{label}, hex code',
  /** Placeholder of the hex box. */
  placeholder: '#RRGGBB',
  /** Accessible name of the native colour picker button (`picker`). `pickerNamed` is used with a label. */
  picker: 'Choose a custom colour',
  pickerNamed: 'Choose a custom colour for {label}',
  /** Validation message when `required` and no colour is chosen. */
  required: 'Please choose a colour.',
  /** Validation message for text that isn't a colour. */
  invalid: 'Enter a colour as #RRGGBB, for example #2e6faf.',
  /** Names of the default swatches. */
  black: 'Black',
  grey: 'Grey',
  lightGrey: 'Light grey',
  red: 'Red',
  darkOrange: 'Dark orange',
  orange: 'Orange',
  yellow: 'Yellow',
  lightGreen: 'Light green',
  green: 'Green',
  lightBlue: 'Light blue',
  blue: 'Blue',
  indigo: 'Indigo',
});
declare module '../localize.js' { interface CmStrings { colorField: typeof strings } }

/** A swatch: a colour as `#rrggbb` and an optional name for its accessible name and tooltip. */
export interface ColorSwatch { value: string; name?: string }

/**
 * The default palette: the hues of Commmerce's light theme tokens (text-*, bg-*, icon-rating, nav-badge, gray-*), so
 * colours picked for pick-list values sit well next to the admin. Names are built-in strings (translatable).
 */
const DEFAULT_SWATCHES: Array<{ value: string; key: keyof typeof strings }> = [
  { value: '#000000', key: 'black' },
  { value: '#707070', key: 'grey' },
  { value: '#c9c9c9', key: 'lightGrey' },
  { value: '#de0000', key: 'red' },
  { value: '#ad5500', key: 'darkOrange' },
  { value: '#f1a953', key: 'orange' },
  { value: '#ffc107', key: 'yellow' },
  { value: '#81bb47', key: 'lightGreen' },
  { value: '#3c7c00', key: 'green' },
  { value: '#5394d9', key: 'lightBlue' },
  { value: '#2e6faf', key: 'blue' },
  { value: '#446beb', key: 'indigo' },
];

/** `#RGB`, `RRGGBB`, `#RRGGBB` (any case, spaces around) -> `#rrggbb`; anything else -> null. */
export function normalizeHex(text: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return `#${h.toLowerCase()}`;
}

const luminance = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    .map((v) => v / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
};
/**
 * Black or white, whichever contrasts more with the swatch (always 4.5:1 or more). The swatch colour is data, not
 * a theme colour, so this pairs it with plain black or white rather than a token that changes with the theme.
 */
export function checkColor(hex: string): '#000000' | '#ffffff' {
  const l = luminance(hex);
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#000000' : '#ffffff';
}

/**
 * Colour field: a palette of swatches, a hex box and, optionally, the browser's colour picker. For colours that
 * mean something to the merchant, such as the colour of each lead status. The value is lowercase `#rrggbb`.
 * Participates in native forms.
 * @element cm-color-field
 * @fires input - When the colour changes: a swatch, a complete hex code typed, or the picker moving.
 * @fires change - When the colour is committed: a swatch picked, the hex box left or Enter pressed, the picker closed.
 * @csspart label - The label.
 * @csspart swatches - The swatch radio group.
 * @csspart swatch - Each swatch.
 * @csspart input - The hex box.
 */
export class CmColorField extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    hint: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: {},
    swatches: { type: Array },
    picker: { type: Boolean },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _draft: { state: true },
    _invalid: { state: true },
  };

  /** Visible label above the swatches, e.g. "Colour". Without one, give the element an `aria-label`. */
  label = '';
  /** Lowercase bracketed note after the label, e.g. "shown on the status tag". */
  hint = '';
  /** One sentence under the field in text-tertiary. */
  helpText = '';
  /** Error message from your own validation; turns the hex box critical and is announced. */
  error = '';
  /** Form field name. */
  name = '';
  /** The colour as lowercase `#rrggbb`, or empty for none. `#ABC` and `ABCDEF` are accepted and normalised. */
  value = '';
  /**
   * The palette, as `#rrggbb` strings or `{ value, name }`. Names are read out with the hex code and shown as a
   * tooltip. Default: 12 colours from the Commmerce tokens (black, greys, red, oranges, yellow, greens, blues).
   * In HTML, pass JSON: `swatches='["#2e6faf", {"value": "#de0000", "name": "Lost"}]'`.
   */
  swatches?: Array<string | ColorSwatch>;
  /** Adds a button that opens the browser's own colour picker, for colours outside the palette. */
  picker = false;
  /** Shows a red asterisk and blocks form submission until a colour is chosen. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;

  /** Text in the hex box while it differs from `value`. */
  _draft?: string;
  /** The hex box holds text that isn't a colour (after it was committed). */
  _invalid = false;

  #internals = this.attachInternals();
  #id = nextId('cm-cf');
  #defaultValue = '';
  /** The value this element set itself from the hex box; any other new value replaces the box's text. */
  #typed?: string;

  static styles = [
    base,
    fieldStyles,
    css`
      :host { display: block; }
      .swatches { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); padding: 4px; margin: -4px; }
      .swatch {
        position: relative; display: inline-flex; align-items: center; justify-content: center;
        width: 32px; height: 32px; padding: 0; cursor: pointer; border-radius: var(--cm-radius-full);
        border: var(--cm-border-1) solid var(--cm-border-input);
      }
      .swatch cm-icon { visibility: hidden; }
      .swatch[aria-checked='true'] { box-shadow: 0 0 0 2px var(--cm-bg-surface), 0 0 0 4px var(--cm-border-strong); }
      .swatch[aria-checked='true'] cm-icon { visibility: visible; }
      .swatch:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 6px; }
      .swatch:disabled { cursor: not-allowed; opacity: 0.4; }
      .row { display: flex; align-items: center; gap: var(--cm-space-8); }
      .preview, .pick {
        position: relative; flex: none; width: var(--_cm-field-h); height: var(--_cm-field-h); border-radius: var(--cm-radius-sm);
        border: var(--cm-border-1) solid var(--cm-border-input); background: var(--cm-bg-inset);
      }
      .pick { cursor: pointer; }
      .pick input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: inherit; padding: 0; border: 0; }
      .pick:focus-within { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .pick cm-icon {
        position: absolute; inset-inline-end: -6px; bottom: -6px; padding: 2px; border-radius: var(--cm-radius-full);
        background: var(--cm-bg-surface); color: var(--cm-text-default); border: var(--cm-border-1) solid var(--cm-border-input);
      }
      .input {
        width: 11ch; min-width: 0; flex: 0 1 auto; height: calc(var(--_cm-field-h) - 2px); padding: 0 var(--_cm-field-pad);
        font: inherit; font-size: var(--_cm-field-font); font-variant-numeric: tabular-nums; color: var(--cm-text-default);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input);
        border-radius: var(--cm-radius-sm); outline: none; box-sizing: content-box;
      }
      .input::placeholder { color: var(--cm-text-tertiary); }
      .input:focus { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .input[aria-invalid='true'] { border-color: var(--cm-border-critical); }
      .input:disabled { background: var(--cm-bg-input-filled); color: var(--cm-text-secondary); border-color: var(--cm-border-subtle); cursor: not-allowed; }
      :host([disabled]) .pick { cursor: not-allowed; opacity: 0.4; }
      :host([disabled]) .preview { opacity: 0.4; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#defaultValue = normalizeHex(this.value) ?? this.value;
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  formResetCallback() {
    this.value = this.#defaultValue;
    this._draft = undefined;
    this._invalid = false;
  }
  formDisabledCallback(d: boolean) { this.disabled = d; }
  formStateRestoreCallback(state: string) { this.value = state; }

  /** The swatches in use, normalised, with their names. Invalid colours are left out. */
  get items(): ColorSwatch[] {
    if (!this.swatches) return DEFAULT_SWATCHES.map((s) => ({ value: s.value, name: this.t(s.key) }));
    return this.swatches.flatMap((s) => {
      const o = typeof s === 'string' ? { value: s } : s;
      const value = normalizeHex(o?.value ?? '');
      return value ? [{ value, name: o.name }] : [];
    });
  }

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('value')) {
      const n = normalizeHex(this.value ?? '');
      if (n && n !== this.value) this.value = n;
      if (this.hasUpdated && this.value !== this.#typed) { this._draft = undefined; this._invalid = false; }
      this.#typed = undefined;
    }
  }

  updated() {
    const ok = !this.value || normalizeHex(this.value) !== null;
    this.#internals.setFormValue(this.value && ok ? this.value : null, this.value);
    const anchor = this.renderRoot.querySelector<HTMLElement>('.input') ?? undefined;
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, anchor);
    else if (this._invalid || !ok) this.#internals.setValidity({ patternMismatch: true }, this.t('invalid'), anchor);
    else if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, this.t('required'), anchor);
    else this.#internals.setValidity({});
  }

  #emit(...types: Array<'input' | 'change'>) {
    for (const type of types) this.dispatchEvent(new Event(type, { bubbles: true, composed: true }));
  }

  #pick(i: number) {
    const s = this.items[i];
    if (!s || this.disabled) return;
    this.updateComplete.then(() => this.renderRoot.querySelectorAll<HTMLElement>('.swatch')[i]?.focus());
    this._draft = undefined;
    this._invalid = false;
    if (s.value === this.value) return;
    this.value = s.value;
    this.#emit('input', 'change');
  }

  #onSwatchKey(e: KeyboardEvent, i: number) {
    const n = this.items.length;
    const key = logicalKey(e, this);
    let next: number | undefined;
    if (key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === ' ' || e.key === 'Enter') next = i;
    else return;
    e.preventDefault();
    this.#pick(next);
  }

  #onHexInput(e: Event) {
    e.stopPropagation();
    const text = (e.target as HTMLInputElement).value;
    this._draft = text;
    const n = /^#?[0-9a-f]{6}$/i.test(text.trim()) ? normalizeHex(text) : null; // live only for full codes
    if (n && n !== this.value) {
      this.#typed = n;
      this.value = n;
      this.#emit('input');
    }
    if (this._invalid && (n || !text.trim())) this._invalid = false;
  }

  #commitHex() {
    if (this._draft === undefined) return;
    const text = this._draft.trim();
    const n = text ? normalizeHex(text) : '';
    if (n === null) { this._invalid = true; return; }
    const before = this.value;
    this.value = n;
    this._draft = undefined;
    this._invalid = false;
    if (n !== before) this.#emit('input');
    this.#emit('change');
  }

  #onHexChange(e: Event) {
    e.stopPropagation();
    this.#commitHex();
  }

  #onHexKey(e: KeyboardEvent) {
    if (e.key === 'Enter') this.#commitHex();
  }

  #onPickerInput(e: Event) {
    e.stopPropagation();
    const n = normalizeHex((e.target as HTMLInputElement).value);
    if (!n || n === this.value) return;
    this.value = n;
    this._draft = undefined;
    this._invalid = false;
    this.#emit('input');
  }

  #onPickerChange(e: Event) {
    e.stopPropagation();
    this.#emit('change');
  }

  render() {
    const items = this.items;
    const current = normalizeHex(this.value ?? '');
    const sel = items.findIndex((s) => s.value === current);
    const message = this.error || (this._invalid || (this.value && !current) ? this.t('invalid') : '');
    const describedBy = [message && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ') || nothing;
    const hostLabel = this.getAttribute('aria-label');
    const named = this.label || hostLabel || '';
    return html`<div class="field">
      ${this.label
        ? html`<span class="label" id="${this.#id}-l" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}${this.hint ? html`<span class="hint">[${this.hint}]</span>` : nothing}</span>`
        : nothing}
      ${items.length
        ? html`<div class="swatches" part="swatches" role="radiogroup"
            aria-labelledby=${this.label ? `${this.#id}-l` : nothing} aria-label=${!this.label && hostLabel ? hostLabel : nothing}
            aria-required=${this.required ? 'true' : nothing} aria-describedby=${describedBy}>
            ${items.map((s, i) => {
              const name = s.name ? this.t('swatch', { name: s.name, hex: s.value }) : s.value;
              return html`<button type="button" class="swatch" part="swatch" role="radio" aria-checked=${i === sel ? 'true' : 'false'}
                aria-label=${name} title=${s.name || s.value} tabindex=${i === (sel >= 0 ? sel : 0) ? '0' : '-1'} ?disabled=${this.disabled}
                style="background-color:${s.value};color:${checkColor(s.value)}"
                @click=${() => this.#pick(i)} @keydown=${(e: KeyboardEvent) => this.#onSwatchKey(e, i)}><cm-icon name="check" size="16"></cm-icon></button>`;
            })}
          </div>`
        : nothing}
      <div class="row">
        ${this.picker
          ? html`<label class="pick" part="picker" style=${current ? `background-color:${current}` : nothing}>
              <input type="color" .value=${live(current ?? '#000000')} ?disabled=${this.disabled}
                aria-label=${named ? this.t('pickerNamed', { label: named }) : this.t('picker')}
                @input=${this.#onPickerInput} @change=${this.#onPickerChange} />
              <cm-icon name="edit" size="12" aria-hidden="true"></cm-icon>
            </label>`
          : html`<span class="preview" part="preview" aria-hidden="true" style=${current ? `background-color:${current}` : nothing}></span>`}
        <input class="input" part="input" id=${this.#id} type="text" inputmode="text" autocomplete="off" spellcheck="false"
          maxlength="7" .value=${live(this._draft ?? this.value ?? '')} placeholder=${this.t('placeholder')}
          aria-label=${named ? this.t('hexNamed', { label: named }) : this.t('hex')}
          ?required=${this.required} ?disabled=${this.disabled}
          aria-invalid=${message ? 'true' : nothing} aria-describedby=${describedBy}
          @input=${this.#onHexInput} @change=${this.#onHexChange} @keydown=${this.#onHexKey} />
      </div>
      ${message ? html`<p class="error" id="${this.#id}-err" role="alert">${message}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
    </div>`;
  }
}
define('cm-color-field', CmColorField);

declare global { interface HTMLElementTagNameMap { 'cm-color-field': CmColorField } }
