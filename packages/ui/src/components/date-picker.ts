import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import {
  fromISO, toISO, addMonths, startOfMonth, clamp, trapTab, dateFieldStyles, gridKey, renderGrid, calendarStyles, dateFormat, parseDate,
  resolveLocale, localeFirstDay, listConverter, asList, datePattern, type DateFormat,
  splitDateTime, fromISODateTime, timeToMinutes, minutesToTime, nowISO, timeFormat, timePattern, parseTime, type TimeFormat,
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
  /** With `time`: accessible name of the time box. */
  time: 'Time',
  /** With `time`: accessible name of the time box when the field has a label. */
  timeFor: 'Time for {label}',
  /** With `time`: letters for hours and minutes in the time placeholder, e.g. hh:mm am. */
  patternHour: 'hh',
  patternMinute: 'mm',
  /** With `time`, validation: the text in the time box is not a time. `{pattern}` is e.g. hh:mm am. */
  badTime: 'Enter a time like {pattern}.',
  /** With `time`, validation: a date is set but no time. */
  timeMissing: 'Enter a time.',
  /** With `time`, validation: a time off the `step`. `{count}` is the step in minutes. */
  stepMismatch: { one: 'Choose a time on the minute.', other: 'Choose a time in steps of {count} minutes.' },
});
declare module '../localize.js' { interface CmStrings { datePicker: typeof strings } }

/**
 * Date field: type a date or pick one from a calendar. With `time`, a time box sits next to it and the value is a
 * local date and time, `yyyy-mm-ddThh:mm`. Follows the WAI-ARIA APG "date picker dialog" pattern:
 * the calendar button opens a month grid where arrows move by day and week, Page Up/Down by month, Shift+Page Up/Down
 * by year, Home/End to the start and end of the week, Enter picks and Escape closes. Month and weekday names come
 * from `Intl` in the page's language. Participates in native forms with an ISO `yyyy-mm-dd` value.
 * @element cm-date-picker
 * @fires change - When the date changes: picked in the calendar, or typed and committed with Enter or by leaving the box.
 * @fires input - Same moment as `change`.
 * @csspart box - The bordered box around the text input and calendar button.
 * @csspart input - The text input.
 * @csspart calendar - The month grid.
 * @csspart time-box - With `time`: the bordered box around the time input.
 * @csspart time-input - With `time`: the time input.
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
    time: { type: Boolean, reflect: true },
    step: { type: Number },
    hourCycle: { attribute: 'hour-cycle' },
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
  /**
   * The date as ISO `yyyy-mm-dd`; empty when no date is set. With `time`: the local date and time
   * `yyyy-mm-ddThh:mm` (no time zone or offset), empty until both a date and a time are set.
   */
  value = '';
  /**
   * Earliest date that can be chosen, ISO `yyyy-mm-dd`. With `time` it may include a time, `yyyy-mm-ddThh:mm`,
   * or be `now` (the current minute, checked again whenever the field is validated).
   */
  min = '';
  /** Latest date that can be chosen, ISO `yyyy-mm-dd`. With `time`, also `yyyy-mm-ddThh:mm` or `now`. */
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
  /** `small`: a 32px box with a 13px label (filter rows and panels). Default: a 40px box (since 1.6; was 36px). On touch screens both are 44px. */
  size: 'default' | 'medium' | 'small' = 'default';
  /**
   * Adds a time box next to the date box, so the field holds a date and a time. Times are typed (`3:30 pm`, `15:30`)
   * and shown in the locale's clock (12-hour with am/pm for `en-IN`); Up and Down change the time by `step`.
   */
  time = false;
  /** With `time`: minutes between allowed times, counted from midnight (15 allows :00, :15, :30, :45). Up and Down in the time box move by it. Default 1. */
  step = 1;
  /** With `time`: `h12` or `h23` to force a 12- or 24-hour clock. Empty: the locale's clock. */
  hourCycle: '' | 'h12' | 'h23' = '';

  _text = '';
  _focus: Date = new Date();

  #internals = this.attachInternals();
  #id = nextId('cm-dp');
  #defaultValue: string | null = null;
  #keepText = false;
  #focusGrid = false;
  /** With `time`: the date and time parts, kept while the other part is still missing (the value is then empty). */
  #date = '';
  #time = '';
  #keepTime = false;
  #timeTextValue = '';
  /** With `time`: the text in the time box (as typed until it is read). */
  get #timeText() { return this.#timeTextValue; }
  set #timeText(v: string) { if (v !== this.#timeTextValue) { this.#timeTextValue = v; this.requestUpdate(); } }
  #ownValue = false;

  static styles = [base, dateFieldStyles, calendarStyles, css`.pop { min-width: 0; }`];

  // oxlint-disable-next-line unicorn/no-accessor-recursion -- reads the public `locale` property, not this private `#locale` getter
  get #locale() { return resolveLocale(this, this.locale); }
  get #fmt(): DateFormat { return dateFormat(this.#locale); }
  get #tf(): TimeFormat { return timeFormat(this.#locale, this.hourCycle); }
  /** The ISO date the calendar and date box show: the value, or with `time` its date part. */
  get #dateValue() { return this.time ? this.#date : this.value; }
  /** `min`/`max` as given, with `now` resolved (time mode). */
  #limit(v: string) { return this.time && v.trim().toLowerCase() === 'now' ? nowISO() : v; }
  /** The date part of `min`/`max`, for the calendar and date checks. */
  get #minDate() { return fromISO(splitDateTime(this.#limit(this.min)).date || this.min); }
  get #maxDate() { return fromISO(splitDateTime(this.#limit(this.max)).date || this.max); }
  // oxlint-disable-next-line unicorn/no-accessor-recursion -- reads the public `step` property, not this private `#step` getter
  get #step() { const n = Math.trunc(Number(this.step)); return n >= 1 && n <= 1440 ? n : 1; }
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
  /** The value as a local Date (with `time`, at that time), or null. */
  get valueAsDate(): Date | null { return this.time ? (this.value ? fromISODateTime(this.value) : null) : fromISO(this.value); }
  checkValidity() { this.#validate(); return this.#internals.checkValidity(); }
  reportValidity() { this.#validate(); return this.#internals.reportValidity(); }
  formResetCallback() {
    this.value = this.#defaultValue ?? '';
    if (this.time) { this.#split(this.value); this.#timeText = this.#formatTime(this.#time); }
    this._text = this.#format(this.#dateValue);
    this.open = false;
  }
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
    const min = this.#minDate, max = this.#maxDate;
    if ((min && d < min) || (max && d > max)) return true;
    return asList(this.disabledDates).includes(iso) || !!this.isDateDisabled?.(iso);
  }

  get #pattern() { return datePattern(this.#fmt, { d: this.t('patternDay'), m: this.t('patternMonth'), y: this.t('patternYear') }); }

  #format(v: string) {
    const d = fromISO(v);
    return d ? this.#fmt.short(d) : v;
  }

  #formatTime(t: string) {
    const minutes = timeToMinutes(t);
    return minutes === null ? '' : this.#tf.format(minutes);
  }

  get #timePattern() { return timePattern(this.#tf, { h: this.t('patternHour'), m: this.t('patternMinute') }); }

  /** Time mode: reads `value` into the date and time parts. */
  #split(v: string) {
    const { date, time } = splitDateTime(v);
    this.#date = date;
    this.#time = date ? time : '';
  }

  #prepareFocus() {
    const today = new Date();
    const start = fromISO(this.#dateValue) ?? new Date(today.getFullYear(), today.getMonth(), today.getDate());
    this._focus = clamp(start, this.#minDate, this.#maxDate);
    this.#focusGrid = true;
  }

  willUpdate(changed: PropertyValues) {
    if (this.time && (changed.has('value') || changed.has('time')) && !this.#ownValue) {
      this.#split(this.value);
      if (!this.#keepTime) this.#timeText = this.#formatTime(this.#time);
    } else if (this.time && (changed.has('locale') || changed.has('hourCycle')) && this.#time) this.#timeText = this.#formatTime(this.#time);
    if ((changed.has('value') || changed.has('time')) && !this.#keepText) this._text = this.#format(this.#dateValue);
    else if (changed.has('locale') && fromISO(this.#dateValue)) this._text = this.#format(this.#dateValue);
    this.#keepText = false;
    this.#keepTime = false;
    this.#ownValue = false;
  }

  #validate() {
    const input = this.renderRoot.querySelector<HTMLInputElement>('input') ?? undefined;
    const d = fromISO(this.#dateValue);
    const fmt = this.#fmt;
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, input);
    else if (this._text.trim() && !d) this.#internals.setValidity({ badInput: true }, this.t('badInput', { pattern: this.#pattern }), input);
    else if (this.time) this.#validateTime(d, input);
    else if (this.required && !d) this.#internals.setValidity({ valueMissing: true }, this.t('required'), input);
    else if (d && this.#minDate && d < this.#minDate) this.#internals.setValidity({ rangeUnderflow: true }, this.t('rangeUnderflow', { date: fmt.medium(this.#minDate) }), input);
    else if (d && this.#maxDate && d > this.#maxDate) this.#internals.setValidity({ rangeOverflow: true }, this.t('rangeOverflow', { date: fmt.medium(this.#maxDate) }), input);
    else if (d && this.isUnavailable(this.value)) this.#internals.setValidity({ customError: true }, this.t('unavailable'), input);
    else this.#internals.setValidity({});
  }

  /** Time mode checks, after the custom error and a bad typed date. */
  #validateTime(d: Date | null, dateInput?: HTMLInputElement) {
    const timeInput = this.renderRoot.querySelector<HTMLInputElement>('input.time-in') ?? dateInput;
    const set = (flags: ValidityStateFlags, key: string, vars?: Record<string, string | number>, anchor = dateInput) =>
      this.#internals.setValidity(flags, this.t(key, vars), anchor);
    const minutes = timeToMinutes(this.#time);
    if (this.#timeText.trim() && minutes === null) return set({ badInput: true }, 'badTime', { pattern: this.#timePattern }, timeInput);
    if (!d && minutes === null) {
      if (this.required) return set({ valueMissing: true }, 'required');
      return this.#internals.setValidity({});
    }
    if (!d) return set({ badInput: true }, 'required');
    if (minutes === null) return set({ badInput: true }, 'timeMissing', undefined, timeInput);
    const at = fromISODateTime(`${this.#date}T${this.#time}`)!;
    const min = fromISODateTime(this.#limit(this.min)), max = fromISODateTime(this.#limit(this.max), true);
    const show = (limit: string, v: Date) => (splitDateTime(limit).time ? this.#tf.dateTime(v) : this.#fmt.medium(v));
    if (min && at < min) return set({ rangeUnderflow: true }, 'rangeUnderflow', { date: show(this.#limit(this.min), min) }, timeInput);
    if (max && at > max) return set({ rangeOverflow: true }, 'rangeOverflow', { date: show(this.#limit(this.max), max) }, timeInput);
    if (minutes % this.#step) return set({ stepMismatch: true }, 'stepMismatch', { count: this.#step }, timeInput);
    if (this.isUnavailable(this.#date)) return set({ customError: true }, 'unavailable');
    this.#internals.setValidity({});
  }

  updated(changed: PropertyValues) {
    this.#internals.setFormValue(this.value || null, this.time ? this.value : this._text);
    this.#validate();
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

  /** Time mode: sets the date and time parts; the value is both, or empty while one is missing. */
  #setParts(date: string, time: string) {
    this.#date = date;
    this.#time = time;
    const v = date && time ? `${date}T${time}` : '';
    this.#ownValue = true;
    this.requestUpdate();
    this.#setValue(v);
  }

  /** Sets the date from the box or the calendar: the value, or with `time` the date part. */
  #setDate(iso: string) {
    if (this.time) this.#setParts(iso, this.#time);
    else this.#setValue(iso);
  }

  /** Reads the typed text. A real date becomes the value (shown in the locale's format); anything else stays as typed and is invalid. */
  #commitText() {
    const text = this._text.trim();
    if (!text) { this.#setDate(''); return; }
    const iso = parseDate(text, this.#fmt);
    if (iso) { this.#setDate(iso); this._text = this.#format(iso); }
    else { this.#keepText = true; this.#setDate(''); }
  }

  /** Time mode: reads the typed time. A real time is shown in the locale's clock; anything else stays as typed and is invalid. */
  #commitTime() {
    const text = this.#timeText.trim();
    const t = text ? parseTime(text, this.#tf) : '';
    this.#keepText = true;
    if (t === null) { this.#keepTime = true; this.#setParts(this.#date, ''); return; }
    this.#setParts(this.#date, t);
    this.#timeText = this.#formatTime(t);
  }

  /** Time mode: Up and Down move the time by `step`, onto the step; from an empty box they start at `min` or now. */
  #stepTime(dir: 1 | -1) {
    const step = this.#step;
    let current = parseTime(this.#timeText, this.#tf);
    if (!current) {
      const min = splitDateTime(this.#limit(this.min));
      const now = new Date();
      current = min.time && (!this.#date || this.#date === min.date) ? min.time : minutesToTime(now.getHours() * 60 + now.getMinutes());
      const m = timeToMinutes(current)!;
      if (m % step === 0) { this.#keepText = true; this.#setParts(this.#date, current); this.#timeText = this.#formatTime(current); return; }
      dir = 1;
    }
    const m = timeToMinutes(current)!;
    const next = dir > 0 ? (Math.floor(m / step) + 1) * step : (Math.ceil(m / step) - 1) * step;
    const t = minutesToTime(next >= 1440 ? 0 : next < 0 ? Math.floor(1439 / step) * step : next);
    this.#keepText = true;
    this.#setParts(this.#date, t);
    this.#timeText = this.#formatTime(t);
  }

  #onTimeKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter') this.#commitTime();
    else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.altKey) { e.preventDefault(); this.#stepTime(e.key === 'ArrowUp' ? 1 : -1); }
  };

  #pick(d: Date) {
    const iso = toISO(d);
    if (this.isUnavailable(iso)) return;
    this.open = false;
    this.#setDate(iso);
    this._text = this.#format(iso);
    if (this.time && !this.#time) this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>('input.time-in')?.focus());
    else this.#focusTrigger();
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
      this._focus = clamp(next, this.#minDate, this.#maxDate);
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
    this._focus = clamp(addMonths(this._focus, step), this.#minDate, this.#maxDate);
  };

  #onOutside = (e: Event) => {
    if (this.open && !e.composedPath().includes(this)) this.open = false;
  };

  render() {
    const fmt = this.#fmt;
    const value = fromISO(this.#dateValue);
    const described = [this.error && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ');
    const hostLabel = this.getAttribute('aria-label');
    const name = this.label || hostLabel || '';
    const month = startOfMonth(this._focus);
    return html`<div class="field">
      ${this.label
        ? html`<label class="label" for="${this.#id}-in" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</label>`
        : nothing}
      <div class="wrap ${this.time ? 'timed' : ''}">
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
            @click=${this.#toggle}><cm-icon name="calendar" size="16"></cm-icon></button>
        </div>
        ${this.time ? html`<div class="box time" part="time-box">
          <input class="time-in" part="time-input" type="text" autocomplete="off" spellcheck="false"
            .value=${live(this.#timeText)} placeholder=${this.#timePattern}
            aria-label=${this.t(name ? 'timeFor' : 'time', { label: name })}
            ?required=${this.required} ?disabled=${this.disabled}
            aria-invalid=${this.error ? 'true' : nothing} aria-describedby=${described || nothing}
            @input=${(e: Event) => { e.stopPropagation(); this.#timeText = (e.target as HTMLInputElement).value; }}
            @change=${() => this.#commitTime()} @keydown=${this.#onTimeKey} />
        </div>` : nothing}
        <div class="pop" id="${this.#id}-pop" part="popover" role="dialog" aria-modal="true" aria-label=${this.t('dialog')}
          ?hidden=${!this.open} @keydown=${this.#onPopKey}>
          ${this.open ? html`<div class="cal">${renderGrid({
            id: this.#id, fmt, firstDay: this.#firstDay, month, focus: this._focus,
            min: this.#minDate, max: this.#maxDate,
            isDisabled: (d) => this.isUnavailable(toISO(d)),
            mark: (d) => (value && toISO(d) === this.#dateValue ? 'selected' : ''),
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
