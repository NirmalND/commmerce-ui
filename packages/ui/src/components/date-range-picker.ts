import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { TopLayer, topLayerStyles } from '../top-layer.js';
import {
  fromISO, toISO, addDays, addMonths, startOfMonth, endOfMonth, clamp, gridKey, renderGrid, calendarStyles, dateFormat,
  parseDate, resolveLocale, localeFirstDay, listConverter, asList, trapTab, dateFieldStyles, datePattern, type DateFormat,
} from '../calendar.js';
import './icon.js';

const strings = defineStrings('dateRangePicker', {
  /** Calendar button while the range is not set. */
  choose: 'Choose dates',
  chooseFor: 'Choose dates for {label}',
  /** Calendar button once set. `{start}` and `{end}` are full dates. */
  change: 'Change dates, {start} to {end}',
  changeFor: 'Change dates for {label}, {start} to {end}',
  /** Accessible name of the calendar popup. */
  dialog: 'Choose dates',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  /** Accessible names of the two inputs. */
  start: 'Start date',
  end: 'End date',
  /** Accessible name of the list of preset ranges. */
  presets: 'Preset ranges',
  /** Line under the calendar while picking. */
  chooseStart: 'Choose the start date.',
  chooseEnd: 'Start date {date}. Choose the end date.',
  /** Added to the start and end days' accessible names. */
  startNote: 'start date',
  endNote: 'end date',
  patternDay: 'dd',
  patternMonth: 'mm',
  patternYear: 'yyyy',
  badStart: 'Enter a start date like {pattern}.',
  badEnd: 'Enter an end date like {pattern}.',
  required: 'Enter or choose a start and end date.',
  endBeforeStart: 'The end date is before the start date.',
  rangeUnderflow: 'Choose {date} or later.',
  rangeOverflow: 'Choose {date} or earlier.',
  unavailable: 'A chosen date isn\'t available. Choose another date.',
  /** Preset labels. */
  today: 'Today',
  yesterday: 'Yesterday',
  last7Days: 'Last 7 days',
  last30Days: 'Last 30 days',
  last90Days: 'Last 90 days',
  thisMonth: 'This month',
  lastMonth: 'Last month',
});
declare module '../localize.js' { interface CmStrings { dateRangePicker: typeof strings } }

/** Built-in preset ranges. Each ends today except `yesterday` and `last-month`. */
export type DateRangePresetKey = 'today' | 'yesterday' | 'last-7-days' | 'last-30-days' | 'last-90-days' | 'this-month' | 'last-month';
/** A custom preset: a label and ISO start and end dates. */
export interface DateRangePreset { label: string; start: string; end: string }

const PRESETS: Record<DateRangePresetKey, [string, (t: Date) => [Date, Date]]> = {
  'today': ['Today', (t) => [t, t]],
  'yesterday': ['Yesterday', (t) => [addDays(t, -1), addDays(t, -1)]],
  'last-7-days': ['Last 7 days', (t) => [addDays(t, -6), t]],
  'last-30-days': ['Last 30 days', (t) => [addDays(t, -29), t]],
  'last-90-days': ['Last 90 days', (t) => [addDays(t, -89), t]],
  'this-month': ['This month', (t) => [startOfMonth(t), t]],
  'last-month': ['Last month', (t) => [startOfMonth(addMonths(t, -1)), endOfMonth(addMonths(t, -1))]],
};

const presetKey = (k: string) => k.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());

/**
 * Resolves a preset key or object to a label and ISO dates (relative to today). Unknown keys return null.
 * `label` translates a key's label (it gets the key in camelCase, e.g. `last7Days`); English otherwise.
 */
export function resolvePreset(p: DateRangePresetKey | DateRangePreset, today = new Date(), label?: (key: string) => string): DateRangePreset | null {
  if (typeof p === 'object' && p) return p;
  const def = PRESETS[p as DateRangePresetKey];
  if (!def) return null;
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const [s, e] = def[1](t);
  return { label: label?.(presetKey(p as string)) || def[0], start: toISO(s), end: toISO(e) };
}

/**
 * Date range field for report and order filters: type a start and end date or pick them in a calendar, or choose
 * a preset range such as "Last 7 days". The calendar is the same APG date picker grid as `cm-date-picker`: the first
 * date picked is the start, the second the end. Participates in native forms: submits `<name>-start` and
 * `<name>-end` (or `start-name` / `end-name`) as ISO `yyyy-mm-dd`.
 * @element cm-date-range-picker
 * @fires change - When the range changes: both dates picked, a preset chosen, or a typed date committed.
 * @fires input - Same moment as `change`.
 * @csspart box - The bordered box around the two inputs and the calendar button.
 * @csspart calendar - The month grid.
 * @csspart presets - The list of preset ranges.
 */
export class CmDateRangePicker extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    startName: { attribute: 'start-name' },
    endName: { attribute: 'end-name' },
    start: {},
    end: {},
    min: {},
    max: {},
    locale: { noAccessor: true },
    firstDayOfWeek: { type: Number, attribute: 'first-day-of-week' },
    disabledDates: { attribute: 'disabled-dates', converter: listConverter },
    isDateDisabled: { attribute: false },
    presets: { converter: listConverter },
    startLabel: { attribute: 'start-label', string: 'start' },
    endLabel: { attribute: 'end-label', string: 'end' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    size: { reflect: true },
    _startText: { state: true },
    _endText: { state: true },
    _focus: { state: true },
    _draftStart: { state: true },
    _draftEnd: { state: true },
    _hover: { state: true },
  };

  /** Visible label above the box, e.g. "Order date". Required for accessibility unless the element has an aria-label. */
  label = '';
  /** One sentence under the box in text-tertiary. */
  helpText = '';
  /** Error message; turns the border critical and sets aria-invalid. */
  error = '';
  /** Form field name. The range is submitted as `<name>-start` and `<name>-end` unless `start-name` / `end-name` are set. */
  name = '';
  /** Form entry name for the start date (instead of `<name>-start`). `name` must still be set for the form to include the field. */
  startName = '';
  /** Form entry name for the end date (instead of `<name>-end`). */
  endName = '';
  /** Start of the range, ISO `yyyy-mm-dd`; empty when not set. */
  start = '';
  /** End of the range, ISO `yyyy-mm-dd`; empty when not set. */
  end = '';
  /** Earliest date that can be chosen, ISO `yyyy-mm-dd`. */
  min = '';
  /** Latest date that can be chosen, ISO `yyyy-mm-dd`. For reports, usually today. */
  max = '';
  #localeProp = '';
  /**
   * BCP 47 language for month and weekday names and the typed date order. Empty: the same language as every other
   * component (`configure({ locale })`, else the nearest `lang` attribute, else the browser's).
   */
  get locale(): string { return this.#localeProp; }
  set locale(v: string) { const old = this.#localeProp; this.#localeProp = v ?? ''; this.requestUpdate('locale', old); }
  /** First column of the calendar: 0 = Sunday, 1 = Monday … 6 = Saturday. Defaults to the locale's custom where known, else Sunday. */
  firstDayOfWeek?: number;
  /** Dates that can't be chosen, as ISO strings. In HTML, a comma- or space-separated list. */
  disabledDates: string[] = [];
  /** Function that returns true for dates that can't be chosen. Property only. */
  isDateDisabled?: (date: string) => boolean;
  /**
   * Preset ranges shown beside the calendar: keys (`today`, `yesterday`, `last-7-days`, `last-30-days`, `last-90-days`,
   * `this-month`, `last-month`) or `{ label, start, end }` objects. In HTML, a space-separated list of keys.
   */
  presets: Array<DateRangePresetKey | DateRangePreset> = [];
  /** Accessible name of the start input. Default: the built-in string `start` ("Start date"). */
  startLabel!: string;
  /** Accessible name of the end input. Default: the built-in string `end` ("End date"). */
  endLabel!: string;
  /** The form will not submit until both dates are set. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Whether the calendar is showing. */
  open = false;
  /** `small`: a 32px box with a 13px label (filter rows and panels). Default: a 40px box (since 1.6; was 36px). On touch screens both are 44px. */
  size: 'default' | 'medium' | 'small' = 'default';

  _startText = '';
  _endText = '';
  _focus: Date = new Date();
  _draftStart = '';
  _draftEnd = '';
  _hover: Date | null = null;

  #internals = this.attachInternals();
  #id = nextId('cm-drp');
  #default: [string, string] | null = null;
  #keepText = false;
  #focusGrid = false;

  static styles = [
    base, topLayerStyles, dateFieldStyles, calendarStyles,
    css`
      .sep { flex: none; color: var(--cm-text-tertiary); }
      input { flex: 0 1 6.6em; }
      :host([size='small']) input { flex-basis: 6.6em; }
      .trigger { margin-inline-start: auto; }
      .body { display: flex; gap: var(--cm-space-12); }
      .presets { display: flex; flex-direction: column; gap: 2px; min-width: 140px; margin: 0; padding: 0; padding-inline-end: var(--cm-space-12); list-style: none; border-inline-end: var(--cm-border-1) solid var(--cm-border-subtle); }
      .preset {
        width: 100%; min-height: var(--cm-control-height-sm, 32px); padding: var(--cm-space-4) var(--cm-space-8); border: 0; border-radius: var(--cm-radius-sm);
        background: none; font: inherit; font-size: 14px; text-align: start; color: var(--cm-text-default); cursor: pointer;
      }
      .preset:hover { background: var(--cm-bg-hover); }
      .preset[aria-pressed='true'] { background: var(--cm-action-primary); color: var(--cm-action-primary-text); }
      .status { margin: var(--cm-space-8) 0 0; font-size: var(--cm-type-body-xs-size); line-height: var(--cm-type-body-xs-line-height); color: var(--cm-text-tertiary); }
      @media (max-width: 640px) {
        .body { flex-direction: column; }
        .presets { flex-direction: row; flex-wrap: wrap; min-width: 0; padding: 0 0 var(--cm-space-8); border-inline-end: 0; border-block-end: var(--cm-border-1) solid var(--cm-border-subtle); }
        .presets li { flex: 0 0 auto; }
        .preset { width: auto; border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-full); min-height: 32px; }
      }
    `,
  ];

  // oxlint-disable-next-line unicorn/no-accessor-recursion -- reads the public `locale` property, not this private `#locale` getter
  get #locale() { return resolveLocale(this, this.locale); }
  get #fmt(): DateFormat { return dateFormat(this.#locale); }
  get #firstDay() {
    const n = Number(this.firstDayOfWeek);
    return this.firstDayOfWeek == null || Number.isNaN(n) ? localeFirstDay(this.#locale) : ((Math.trunc(n) % 7) + 7) % 7;
  }

  connectedCallback() {
    super.connectedCallback();
    if (!this.#default) this.#default = [this.start, this.end];
    document.addEventListener('pointerdown', this.#onOutside, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#layer.close();
    document.removeEventListener('pointerdown', this.#onOutside, true);
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  formResetCallback() {
    [this.start, this.end] = this.#default ?? ['', ''];
    this._startText = this.#format(this.start); this._endText = this.#format(this.end); this.open = false;
  }
  formDisabledCallback(d: boolean) { this.disabled = d; if (d) this.open = false; }
  formStateRestoreCallback(state: string) { [this.start = '', this.end = ''] = (state ?? '').split('/'); }

  /** Opens the calendar. */
  show() {
    if (this.disabled) return;
    this._draftStart = fromISO(this.start) ? this.start : '';
    this._draftEnd = fromISO(this.end) ? this.end : '';
    this._hover = null;
    const t = new Date();
    this._focus = clamp(fromISO(this.start) ?? new Date(t.getFullYear(), t.getMonth(), t.getDate()), fromISO(this.min), fromISO(this.max));
    this.#picking = 'start';
    this.#focusGrid = true;
    this.open = true;
  }
  /** Closes the calendar without changing the range. */
  close() { this.open = false; }

  /** True when a date can't be chosen (outside min/max, in `disabledDates` or refused by `isDateDisabled`). */
  isUnavailable(iso: string) {
    const d = fromISO(iso);
    if (!d) return true;
    const min = fromISO(this.min), max = fromISO(this.max);
    if ((min && d < min) || (max && d > max)) return true;
    return asList(this.disabledDates).includes(iso) || !!this.isDateDisabled?.(iso);
  }

  #picking: 'start' | 'end' = 'start';
  get #pattern() { return datePattern(this.#fmt, { d: this.t('patternDay'), m: this.t('patternMonth'), y: this.t('patternYear') }); }
  #format(v: string) { const d = fromISO(v); return d ? this.#fmt.short(d) : v; }

  willUpdate(changed: PropertyValues) {
    if (!this.#keepText) {
      if (changed.has('start')) this._startText = this.#format(this.start);
      if (changed.has('end')) this._endText = this.#format(this.end);
    }
    this.#keepText = false;
    if (changed.has('locale')) {
      if (fromISO(this.start)) this._startText = this.#format(this.start);
      if (fromISO(this.end)) this._endText = this.#format(this.end);
    }
  }

  #layer = new TopLayer();

  updated() {
    // The calendar opens in the top layer (1.10.1, #35), so rows after this one and scroll containers can't cover or clip it.
    if (this.open && !this.#layer.active) this.#layer.open(this.renderRoot.querySelector<HTMLElement>('.pop'), this.renderRoot.querySelector<HTMLElement>('.wrap'), { align: 'start', gap: 8 });
    else if (!this.open && this.#layer.active) this.#layer.close();
    else if (this.open) this.#layer.place();

    const s = fromISO(this.start), e = fromISO(this.end);
    const fd = new FormData();
    if (this.name || this.startName) { if (s) fd.append(this.startName || `${this.name}-start`, this.start); }
    if (this.name || this.endName) { if (e) fd.append(this.endName || `${this.name}-end`, this.end); }
    this.#internals.setFormValue(s || e ? fd : null, `${this.start}/${this.end}`);
    const inputs = this.renderRoot.querySelectorAll<HTMLInputElement>('input');
    const [inS, inE] = [inputs[0] ?? undefined, inputs[1] ?? undefined];
    const fmt = this.#fmt;
    const min = fromISO(this.min), max = fromISO(this.max);
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, inS);
    else if (this._startText.trim() && !s) this.#internals.setValidity({ badInput: true }, this.t('badStart', { pattern: this.#pattern }), inS);
    else if (this._endText.trim() && !e) this.#internals.setValidity({ badInput: true }, this.t('badEnd', { pattern: this.#pattern }), inE);
    else if (this.required && (!s || !e)) this.#internals.setValidity({ valueMissing: true }, this.t('required'), !s ? inS : inE);
    else if (s && e && e < s) this.#internals.setValidity({ badInput: true }, this.t('endBeforeStart'), inE);
    else if ((s && min && s < min) || (e && min && e < min)) this.#internals.setValidity({ rangeUnderflow: true }, this.t('rangeUnderflow', { date: fmt.medium(min!) }), inS);
    else if ((s && max && s > max) || (e && max && e > max)) this.#internals.setValidity({ rangeOverflow: true }, this.t('rangeOverflow', { date: fmt.medium(max!) }), inE);
    else if ((s && this.isUnavailable(this.start)) || (e && this.isUnavailable(this.end))) this.#internals.setValidity({ customError: true }, this.t('unavailable'), inS);
    else this.#internals.setValidity({});
    if (this.open && this.#focusGrid) {
      this.#focusGrid = false;
      this.renderRoot.querySelector<HTMLElement>('td[tabindex="0"]')?.focus();
    }
  }

  #emit() {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #setRange(start: string, end: string) {
    if (start === this.start && end === this.end) return;
    this.start = start; this.end = end;
    this.#emit();
  }

  #commitText(which: 'start' | 'end') {
    const text = (which === 'start' ? this._startText : this._endText).trim();
    const iso = text ? parseDate(text, this.#fmt) : '';
    if (text && !iso) this.#keepText = true;
    const next: [string, string] = which === 'start' ? [iso ?? '', this.end] : [this.start, iso ?? ''];
    this.#setRange(...next);
    if (iso) { if (which === 'start') this._startText = this.#format(iso); else this._endText = this.#format(iso); }
  }

  #pick(d: Date) {
    const iso = toISO(d);
    if (this.isUnavailable(iso)) return;
    if (this.#picking === 'start' || !this._draftStart || iso < this._draftStart) {
      this._draftStart = iso; this._draftEnd = ''; this.#picking = 'end';
      this._focus = d; this.#focusGrid = true;
      return;
    }
    this._draftEnd = iso;
    this.open = false;
    this.#setRange(this._draftStart, iso);
    this.#focusTrigger();
  }

  #applyPreset(p: DateRangePreset) {
    this.open = false;
    this.#setRange(p.start, p.end);
    this.#focusTrigger();
  }

  #focusTrigger() { this.renderRoot.querySelector<HTMLElement>('.trigger')?.focus(); }

  #toggle = () => {
    if (this.disabled) return;
    if (this.open) this.open = false;
    else { this.#commitText('start'); this.#commitText('end'); this.show(); }
  };

  #onInputKey = (which: 'start' | 'end') => (e: KeyboardEvent) => {
    if (e.key === 'Enter') this.#commitText(which);
    else if (e.key === 'ArrowDown' && e.altKey) { e.preventDefault(); this.#commitText(which); this.show(); }
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

  #onOutside = (e: Event) => {
    if (this.open && !e.composedPath().includes(this)) this.open = false;
  };

  #mark(d: Date) {
    const iso = toISO(d);
    const s = this._draftStart;
    const e = this._draftEnd || (this.#picking === 'end' && s ? toISO(this._hover ?? this._focus) : '');
    if (iso === s) return 'start';
    if (iso === e && e > s) return 'end';
    if (s && e && iso > s && iso < e) return 'in-range';
    return '';
  }

  render() {
    const fmt = this.#fmt;
    const s = fromISO(this.start), e = fromISO(this.end);
    const described = [this.error && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ');
    const hostLabel = this.getAttribute('aria-label');
    const name = this.label || hostLabel || '';
    const presets = asList(this.presets).map((p) => resolvePreset(p, new Date(), (k) => this.t(k))).filter((p): p is DateRangePreset => !!p);
    const status = this.#picking === 'end' && this._draftStart
      ? this.t('chooseEnd', { date: fmt.medium(fromISO(this._draftStart)!) })
      : this.t('chooseStart');
    const input = (which: 'start' | 'end') => {
      const text = which === 'start' ? this._startText : this._endText;
      return html`<input id="${this.#id}-${which}" type="text" autocomplete="off" spellcheck="false"
        .value=${live(text)} placeholder=${this.#pattern}
        aria-label=${which === 'start' ? this.startLabel || this.t('start') : this.endLabel || this.t('end')}
        ?required=${this.required} ?disabled=${this.disabled}
        aria-invalid=${this.error ? 'true' : nothing} aria-describedby=${described || nothing}
        @input=${(ev: Event) => { ev.stopPropagation(); const v = (ev.target as HTMLInputElement).value; if (which === 'start') this._startText = v; else this._endText = v; }}
        @change=${() => this.#commitText(which)} @keydown=${this.#onInputKey(which)} />`;
    };
    return html`<div class="field" role="group" aria-labelledby=${this.label ? `${this.#id}-l` : nothing} aria-label=${!this.label && hostLabel ? hostLabel : nothing}>
      ${this.label
        ? html`<span class="label" id="${this.#id}-l" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>`
        : nothing}
      <div class="wrap">
        <div class="box" part="box">
          ${input('start')}<span class="sep" aria-hidden="true">–</span>${input('end')}
          <button type="button" class="trigger" part="trigger" ?disabled=${this.disabled}
            aria-label=${s && e ? this.t(name ? 'changeFor' : 'change', { label: name, start: fmt.long(s), end: fmt.long(e) }) : this.t(name ? 'chooseFor' : 'choose', { label: name })}
            aria-haspopup="dialog" aria-expanded=${this.open ? 'true' : 'false'} aria-controls="${this.#id}-pop"
            @click=${this.#toggle}><cm-icon name="calendar" size="16"></cm-icon></button>
        </div>
        <div class="pop" id="${this.#id}-pop" part="popover" role="dialog" aria-modal="true" aria-label=${this.t('dialog')}
          ?hidden=${!this.open} @keydown=${this.#onPopKey}>
          ${this.open ? html`<div class="body">
            ${presets.length ? html`<ul class="presets" part="presets" aria-label=${this.t('presets')}>${presets.map((p) => html`<li>
              <button type="button" class="preset" aria-pressed=${p.start === this.start && p.end === this.end ? 'true' : 'false'}
                @click=${() => this.#applyPreset(p)}>${p.label}</button></li>`)}</ul>` : nothing}
            <div class="cal">${renderGrid({
              id: this.#id, fmt, firstDay: this.#firstDay, month: startOfMonth(this._focus), focus: this._focus,
              min: fromISO(this.min), max: fromISO(this.max),
              isDisabled: (d) => this.isUnavailable(toISO(d)),
              mark: (d) => this.#mark(d),
              note: (d) => { const m = this.#mark(d); return m === 'start' ? this.t('startNote') : m === 'end' ? this.t('endNote') : ''; },
              onPick: (d) => this.#pick(d), onKey: this.#onGridKey,
              onMonth: (step) => { this._focus = clamp(addMonths(this._focus, step), fromISO(this.min), fromISO(this.max)); },
              previousLabel: this.t('previousMonth'), nextLabel: this.t('nextMonth'),
              onHover: (d) => { if (this.#picking === 'end') this._hover = d; },
            })}
              <p class="status" aria-live="polite">${status}</p>
            </div>
          </div>` : nothing}
        </div>
      </div>
      ${this.error ? html`<p class="error" id="${this.#id}-err" role="alert">${this.error}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
    </div>`;
  }
}
define('cm-date-range-picker', CmDateRangePicker);

declare global { interface HTMLElementTagNameMap { 'cm-date-range-picker': CmDateRangePicker } }
