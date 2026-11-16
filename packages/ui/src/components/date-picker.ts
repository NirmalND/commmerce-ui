import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import {
  fromISO, toISO, addMonths, startOfMonth, clamp, trapTab, dateFieldStyles, gridKey, renderGrid, calendarStyles, dateFormat, parseDate,
  resolveLocale, localeFirstDay, listConverter, asList, datePattern, type DateFormat,
} from '../calendar.js';
import './icon.js';

const strings = defineStrings('datePicker', {
  /** Calendar button while no date is set. */
  choose: 'Choose date',
  /** Calendar button while no date is set, when the field has a label. */
  chooseFor: 'Choose date for {label}',
  /** Calendar button once a date is set. `{date}` is the full date. */
  change: 'Change date, {date}',
  /** Calendar button once a date is set, when the field has a label. */
  changeFor: 'Change date for {label}, {date}',
  /** Accessible name of the calendar popup. */
  dialog: 'Choose date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  /** Letters for day, month and year in the placeholder pattern, e.g. dd/mm/yyyy. */
  patternDay: 'dd',
  patternMonth: 'mm',
  patternYear: 'yyyy',
  /** Validation: the text is not a date. `{pattern}` is e.g. dd/mm/yyyy. */
  badInput: 'Enter a date like {pattern}.',
  /** Validation: `required` and empty. */
  required: 'Enter or choose a date.',
  /** Validation: before `min`. `{date}` is the min date. */
  rangeUnderflow: 'Choose {date} or later.',
  /** Validation: after `max`. */
  rangeOverflow: 'Choose {date} or earlier.',
  /** Validation: a date in `disabled-dates` or refused by `isDateDisabled`. */
  unavailable: 'This date isn\'t available. Choose another date.',
});
declare module '../localize.js' { interface CmStrings { datePicker: typeof strings } }

/**
 * Date field: type a date or pick one from a calendar. Follows the WAI-ARIA APG "date picker dialog" pattern:
 * the calendar button opens a month grid where arrows move by day and week, Page Up/Down by month, Shift+Page Up/Down
 * by year, Home/End to the start and end of the week, Enter picks and Escape closes. Month and weekday names come
 * from `Intl` in the page's language. Participates in native forms with an ISO `yyyy-mm-dd` value.
 * @element cm-date-picker
 * @fires change - When the date changes: picked in the calendar, or typed and committed with Enter or by leaving the box.
 * @fires input - Same moment as `change`.
 * @csspart box - The bordered box around the text input and calendar button.
 * @csspart input - The text input.
 * @csspart calendar - The month grid.
 */
export class CmDatePicker extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: {},
    min: {},
    max: {},
    placeholder: {},
    locale: { noAccessor: true },
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    disabledDates: { attribute: 'disabled-dates', converter: listConverter },
    isDateDisabled: { attribute: false },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    size: { reflect: true },
    _text: { state: true },
    _focus: { state: true },
  };

  /** Visible label above the box. Required for accessibility unless the element has an aria-label. */
  label = '';
  /** One sentence under the box in text-tertiary. */
  helpText = '';
  /** Error message; turns the border critical and sets aria-invalid. */
  error = '';
  /** Form field name. */
  name = '';
  /** The date as ISO `yyyy-mm-dd`; empty when no date is set. */
  value = '';
  /** Earliest date that can be chosen, ISO `yyyy-mm-dd`. */
  min = '';
  /** Latest date that can be chosen, ISO `yyyy-mm-dd`. */
  max = '';
  /** Shown in the empty box. Defaults to the locale's pattern, e.g. "dd/mm/yyyy". */
  placeholder = '';
  #localeProp = '';
  /**
   * BCP 47 language for month and weekday names and the typed date order, e.g. `en-IN`, `hi-IN`. Empty: the same
   * language as every other component (`configure({ locale })`, else the nearest `lang` attribute, else the browser's).
   * Built-in text follows that language too; set it with `strings`, `setStrings()` or `configure()`.
   */
  get locale(): string { return this.#localeProp; }
  set locale(v: string) { const old = this.#localeProp; this.#localeProp = v ?? ''; this.requestUpdate('locale', old); }
  /** First column of the calendar: 0 = Sunday, 1 = Monday … 6 = Saturday. Defaults to the locale's custom where the browser knows it, else Sunday. */
  firstDayOfWeek?: number;
  /** Dates that can't be chosen, as ISO strings. In HTML, a comma- or space-separated list. */
  disabledDates: string[] = [];
  /** Function that returns true for dates that can't be chosen, e.g. `(iso) => new Date(iso).getDay() === 0` for Sundays. Property only. */
  isDateDisabled?: (date: string) => boolean;
  /** The form will not submit until a date is set. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Whether the calendar is showing. */
  open = false;
  /** `small`: 12px label, 14px value (filter panels). */
  size: 'default' | 'small' = 'default';

  _text = '';
  _focus: Date = new Date();

  #internals = this.attachInternals();
  #id = nextId('cm-dp');
  #defaultValue: string | null = null;
  #keepText = false;
  #focusGrid = false;

  static styles = [base, dateFieldStyles, calendarStyles, css`.pop { min-width: 0; }`];

  get #locale() { return resolveLocale(this, this.locale); }
  get #fmt(): DateFormat { return dateFormat(this.#locale); }
  get #firstDay() {
    const n = Number(this.firstDayOfWeek);
    return this.firstDayOfWeek == null || Number.isNaN(n) ? localeFirstDay(this.#locale) : ((Math.trunc(n) % 7) + 7) % 7;
  }

  connectedCallback() {
    super.connectedCallback();
    if (this.#defaultValue === null) this.#defaultValue = this.value;
    document.addEventListener('pointerdown', this.#onOutside, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('pointerdown', this.#onOutside, true);
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  /** The value as a local Date, or null. */
  get valueAsDate(): Date | null { return fromISO(this.value); }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  formResetCallback() { this.value = this.#defaultValue ?? ''; this._text = this.#format(this.value); this.open = false; }
  formDisabledCallback(d: boolean) { this.disabled = d; if (d) this.open = false; }
  formStateRestoreCallback(state: string) { this.value = state ?? ''; }

  /** Opens the calendar. */
  show() { if (!this.disabled) { this.#prepareFocus(); this.open = true; } }
  /** Closes the calendar. */
  close() { this.open = false; }

  /** True when a date can't be chosen (outside min/max, in `disabledDates` or refused by `isDateDisabled`). */
  isUnavailable(iso: string) {
    const d = fromISO(iso);
    if (!d) return true;
    const min = fromISO(this.min), max = fromISO(this.max);
    if ((min && d < min) || (max && d > max)) return true;
    return asList(this.disabledDates).includes(iso) || !!this.isDateDisabled?.(iso);
  }

  get #pattern() { return datePattern(this.#fmt, { d: this.t('patternDay'), m: this.t('patternMonth'), y: this.t('patternYear') }); }

  #format(v: string) {
    const d = fromISO(v);
    return d ? this.#fmt.short(d) : v;
  }

  #prepareFocus() {
    const today = new Date();
    const start = fromISO(this.value) ?? new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this._focus = clamp(start, fromISO(this.min), fromISO(this.max));
    this.#focusGrid = true;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && !this.#keepText) this._text = this.#format(this.value);
    else if (changed.has('locale') && fromISO(this.value)) this._text = this.#format(this.value);
    this.#keepText = false;
  }

  updated(changed: PropertyValues) {
    this.#internals.setFormValue(this.value || null, this._text);
    const input = this.renderRoot.querySelector<HTMLInputElement>('input') ?? undefined;
    const d = fromISO(this.value);
    const fmt = this.#fmt;
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, input);
    else if (this._text.trim() && !d) this.#internals.setValidity({ badInput: true }, this.t('badInput', { pattern: this.#pattern }), input);
    else if (this.required && !d) this.#internals.setValidity({ valueMissing: true }, this.t('required'), input);
    else if (d && fromISO(this.min) && d < fromISO(this.min)!) this.#internals.setValidity({ rangeUnderflow: true }, this.t('rangeUnderflow', { date: fmt.medium(fromISO(this.min)!) }), input);
    else if (d && fromISO(this.max) && d > fromISO(this.max)!) this.#internals.setValidity({ rangeOverflow: true }, this.t('rangeOverflow', { date: fmt.medium(fromISO(this.max)!) }), input);
    else if (d && this.isUnavailable(this.value)) this.#internals.setValidity({ customError: true }, this.t('unavailable'), input);
    else this.#internals.setValidity({});
    if (this.open && this.#focusGrid) {
      this.#focusGrid = false;
      this.renderRoot.querySelector<HTMLElement>('td[tabindex="0"]')?.focus();
    }
    if (changed.has('open') && changed.get('open') === true && !this.open) this.#focusGrid = false;
  }

  #setValue(v: string) {
    if (v === this.value) return;
    this.value = v;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /** Reads the typed text. A real date becomes the value (shown in the locale's format); anything else stays as typed and is invalid. */
  #commitText() {
    const text = this._text.trim();
    if (!text) { this.#setValue(''); return; }
    const iso = parseDate(text, this.#fmt);
    if (iso) { this.#setValue(iso); this._text = this.#format(iso); }
    else { this.#keepText = true; this.#setValue(''); }
  }

  #pick(d: Date) {
    const iso = toISO(d);
    if (this.isUnavailable(iso)) return;
    this.open = false;
    this.#setValue(iso);
    this._text = this.#format(iso);
    this.#focusTrigger();
  }

  #focusTrigger() { this.renderRoot.querySelector<HTMLElement>('.trigger')?.focus(); }

  #toggle = () => {
    if (this.disabled) return;
    if (this.open) this.open = false;
    else { this.#commitText(); this.show(); }
  };

  #onInputKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') { this.#commitText(); }
    else if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); this.#commitText(); this.show(); }
    else if (e.key === 'Escape' && this.open) { e.preventDefault(); this.open = false; }
  };

  #onGridKey = (e: KeyboardEvent) => {
    const next = gridKey(logicalKey(e, this), e, this._focus, this.#firstDay);
    if (next) {
      e.preventDefault();
      this._focus = clamp(next, fromISO(this.min), fromISO(this.max));
      this.#focusGrid = true;
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.#pick(this._focus); }
  };

  #onPopKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.open = false; this.#focusTrigger(); return; }
    trapTab(e, e.currentTarget as HTMLElement);
  };

  #onMonth = (step: number) => {
    this._focus = clamp(addMonths(this._focus, step), fromISO(this.min), fromISO(this.max));
  };

  #onOutside = (e: Event) => {
    if (this.open && !e.composedPath().includes(this)) this.open = false;
  };

  render() {
    const fmt = this.#fmt;
    const value = fromISO(this.value);
    const described = [this.error && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ');
    const hostLabel = this.getAttribute('aria-label');
    const name = this.label || hostLabel || '';
    const month = startOfMonth(this._focus);
    return html`<div class="field">
      ${this.label
        ? html`<label class="label" for="${this.#id}-in" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</label>`
        : nothing}
      <div class="wrap">
        <div class="box" part="box">
          <input id="${this.#id}-in" part="input" type="text" autocomplete="off" spellcheck="false"
            .value=${live(this._text)} placeholder=${this.placeholder || this.#pattern}
            aria-label=${!this.label && hostLabel ? hostLabel : nothing}
            ?required=${this.required} ?disabled=${this.disabled}
            aria-invalid=${this.error ? 'true' : nothing} aria-describedby=${described || nothing}
            @input=${(e: Event) => { e.stopPropagation(); this._text = (e.target as HTMLInputElement).value; }}
            @change=${() => this.#commitText()} @keydown=${this.#onInputKey} />
          <button type="button" class="trigger" part="trigger" ?disabled=${this.disabled}
            aria-label=${value ? this.t(name ? 'changeFor' : 'change', { label: name, date: fmt.long(value) }) : this.t(name ? 'chooseFor' : 'choose', { label: name })}
            aria-haspopup="dialog" aria-expanded=${this.open ? 'true' : 'false'} aria-controls="${this.#id}-pop"
            @click=${this.#toggle}><cm-icon name="calendar" size="18"></cm-icon></button>
        </div>
        <div class="pop" id="${this.#id}-pop" part="popover" role="dialog" aria-modal="true" aria-label=${this.t('dialog')}
          ?hidden=${!this.open} @keydown=${this.#onPopKey}>
          ${this.open ? html`<div class="cal">${renderGrid({
            id: this.#id, fmt, firstDay: this.#firstDay, month, focus: this._focus,
            min: fromISO(this.min), max: fromISO(this.max),
            isDisabled: (d) => this.isUnavailable(toISO(d)),
            mark: (d) => (value && toISO(d) === this.value ? 'selected' : ''),
            onPick: (d) => this.#pick(d), onKey: this.#onGridKey, onMonth: this.#onMonth,
            previousLabel: this.t('previousMonth'), nextLabel: this.t('nextMonth'),
          })}</div>` : nothing}
        </div>
      </div>
      ${this.error ? html`<p class="error" id="${this.#id}-err" role="alert">${this.error}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
    </div>`;
  }
}
define('cm-date-picker', CmDatePicker);

declare global { interface HTMLElementTagNameMap { 'cm-date-picker': CmDatePicker } }
