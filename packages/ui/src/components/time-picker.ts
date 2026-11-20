import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { FieldValidity } from '../validation.js';
import { TopLayer, topLayerStyles } from '../top-layer.js';
import { optionStyles } from '../field.js';
import { timeToMinutes, minutesToTime, timeFormat, timePattern, parseTime, resolveLocale, dateFieldStyles, type TimeFormat } from '../calendar.js';
import './icon.js';

const strings = defineStrings('timePicker', {
  /** Accessible name of the clock button that shows the list of times. */
  showTimes: 'Show times',
  /** Accessible name of the list of times. `{label}` is the field's label. */
  times: 'Times',
  timesFor: 'Times for {label}',
  /** Letters for hours and minutes in the placeholder, e.g. hh:mm am. */
  patternHour: 'hh',
  patternMinute: 'mm',
  /** Validation. `{pattern}` is e.g. hh:mm am; `{time}` a time in the field's clock. */
  badInput: 'Enter a time like {pattern}.',
  required: 'Enter or choose a time.',
  rangeUnderflow: 'Choose {time} or later.',
  rangeOverflow: 'Choose {time} or earlier.',
  stepMismatch: { one: 'Choose a time on the minute.', other: 'Choose a time in steps of {count} minutes.' },
});
declare module '../localize.js' { interface CmStrings { timePicker: typeof strings } }

/**
 * Time field: type a time or choose one from a list. Shows the 12-hour clock with am/pm or the 24-hour clock,
 * following the locale or `hour-cycle`; the value is always 24-hour ISO `hh:mm`. Follows the WAI-ARIA APG
 * "combobox" pattern (a text box with a list of suggested times; any time can be typed). Participates in native forms.
 * @element cm-time-picker
 * @fires change - When the time changes: a time chosen from the list, or typed text read on Enter or on leaving the box.
 * @fires input - Same moment as `change`.
 * @csspart label - The visible label.
 * @csspart box - The bordered box around the input and the clock button.
 * @csspart input - The text input.
 * @csspart trigger - The clock button.
 * @csspart popover - The dropdown that holds the list.
 * @csspart listbox - The list of times.
 */
export class CmTimePicker extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: {},
    placeholder: {},
    min: {},
    max: {},
    step: { type: Number },
    interval: { type: Number },
    hourCycle: { attribute: 'hour-cycle' },
    locale: { noAccessor: true },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    size: { reflect: true },
    _text: { state: true },
    _active: { state: true },
  };

  /** Visible label above the box, e.g. "Pickup time". Required for accessibility unless the element has an aria-label. */
  label = '';
  /** One sentence under the box in text-tertiary. */
  helpText = '';
  /** Error message; turns the border critical and sets aria-invalid. */
  error = '';
  /** Form field name. */
  name = '';
  /** The time as 24-hour ISO `hh:mm` (`15:30`), whichever clock is shown; empty when not set. */
  value = '';
  /** Placeholder. Default: the format, e.g. "hh:mm am" or "hh:mm". */
  placeholder = '';
  /** Earliest time that can be chosen, `hh:mm`. The list starts here. */
  min = '';
  /** Latest time that can be chosen, `hh:mm`. The list ends here. */
  max = '';
  /** Minutes between allowed times, counted from midnight (15 allows :00, :15, :30, :45). A typed time off the step is invalid. Default 1. */
  step = 1;
  /** Minutes between the times in the list. Default: `step` when it is 5 or more, else 30. Any allowed time can still be typed. */
  interval?: number;
  /** `h12` (am/pm) or `h23` (24-hour) to force a clock. Empty: the locale's clock (12-hour for `en-IN` and `en-US`, 24-hour for `en-GB` and most of Europe). */
  hourCycle: '' | 'h12' | 'h23' = '';
  #localeProp = '';
  /** BCP 47 language for the clock and am/pm words. Empty: the same language as every other component. */
  get locale(): string { return this.#localeProp; }
  set locale(v: string) { const old = this.#localeProp; this.#localeProp = v ?? ''; this.requestUpdate('locale', old); }
  /** The form will not submit until a time is set. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Whether the list of times is showing. */
  open = false;
  /** `small`: a 32px box (filter rows); `medium`: 36px. Default 40px. On touch screens all are 44px. */
  size: 'default' | 'medium' | 'small' = 'default';

  _text = '';
  /** Index of the keyboard-active time in the list, or -1. */
  _active = -1;

  #internals = this.attachInternals();
  #v = new FieldValidity(this, this.#internals);
  #id = nextId('cm-tp');
  #default: string | null = null;
  #keepText = false;
  #layer = new TopLayer();

  static styles = [
    base, topLayerStyles, dateFieldStyles, optionStyles,
    css`
      :host([data-cm-invalid]) .box { border-color: var(--cm-border-critical); }
      :host { max-width: 100%; }
      .pop {
        position: absolute; z-index: 20; inset-block-start: calc(100% + var(--cm-space-4)); inset-inline-start: 0; min-width: 100%;
        background: var(--cm-bg-surface); color: var(--cm-text-default);
        border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-md);
      }
      .pop[hidden] { display: none; }
      [role='option'] { font-variant-numeric: tabular-nums; white-space: nowrap; }
      [role='option'].active { background: var(--cm-bg-hover); }
      [role='option'][aria-selected='true'] { background: var(--cm-action-primary); color: var(--cm-action-primary-text); }
      [role='option'][aria-selected='true'].active { background: var(--cm-action-primary-hover); }
      input { font-variant-numeric: tabular-nums; }
    `,
  ];

  // oxlint-disable-next-line unicorn/no-accessor-recursion -- reads the public `locale` property, not this private `#locale` getter
  get #locale() { return resolveLocale(this, this.locale); }
  get #tf(): TimeFormat { return timeFormat(this.#locale, this.hourCycle); }
  get #stepMinutes() { const n = Math.trunc(Number(this.step)); return n >= 1 && n <= 720 ? n : 1; }
  get #listEvery() {
    const n = Math.trunc(Number(this.interval));
    if (n >= 1 && n <= 720) return n;
    return this.#stepMinutes >= 5 ? this.#stepMinutes : 30;
  }
  get #pattern() { return timePattern(this.#tf, { h: this.t('patternHour'), m: this.t('patternMinute') }); }
  #format(v: string) { const m = timeToMinutes(v); return m === null ? '' : this.#tf.format(m); }

  /** The times in the list, as minutes since midnight: every `interval` from `min` (or midnight) to `max`, on the step. */
  get #times(): number[] {
    const lo = timeToMinutes(this.min) ?? 0, hi = timeToMinutes(this.max) ?? 1439;
    const every = this.#listEvery, step = this.#stepMinutes;
    const out: number[] = [];
    for (let m = Math.ceil(lo / every) * every; m <= hi && out.length < 1440; m += every) if (m % step === 0) out.push(m);
    return out;
  }

  /** The value as minutes since midnight, or null. */
  get valueAsNumber(): number | null { return timeToMinutes(this.value); }

  connectedCallback() {
    super.connectedCallback();
    if (this.#default === null) this.#default = this.value;
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
  reportValidity() { return this.#v.report(() => this.#internals.reportValidity()); }
  formResetCallback() { this.value = this.#default ?? ''; this._text = this.#format(this.value); this.open = false; this.#v.reset(); }
  formDisabledCallback(d: boolean) { this.disabled = d; if (d) this.open = false; }
  formStateRestoreCallback(state: string) { this.value = state ?? ''; }

  /** Shows the list of times, with the chosen time (or the one nearest to now) active and scrolled into view. */
  show() {
    if (this.disabled) return;
    this._active = this.#nearest(timeToMinutes(this.value) !== null ? this.value : parseTime(this._text, this.#tf) ?? this.#now());
    this.open = true;
  }
  /** Hides the list without changing the time. */
  close() { this.open = false; }

  #now() { const n = new Date(); return minutesToTime(n.getHours() * 60 + n.getMinutes()); }
  /** Index of the first listed time at or after `t` (the last one if none), or -1 for an empty list. */
  #nearest(t: string | null) {
    const times = this.#times;
    if (!times.length) return -1;
    const m = timeToMinutes(t);
    if (m === null) return 0;
    const i = times.findIndex((x) => x >= m);
    return i === -1 ? times.length - 1 : i;
  }

  willUpdate(changed: PropertyValues) {
    if (changed.has('value') && !this.#keepText) this._text = this.#format(this.value);
    else if ((changed.has('locale') || changed.has('hourCycle')) && timeToMinutes(this.value) !== null) this._text = this.#format(this.value);
    this.#keepText = false;
  }

  updated(changed: PropertyValues) {
    if (this.open && !this.#layer.active) this.#layer.open(this.renderRoot.querySelector<HTMLElement>('.pop'), this.renderRoot.querySelector<HTMLElement>('.box'), { align: 'stretch', gap: 4 });
    else if (!this.open && this.#layer.active) this.#layer.close();
    else if (this.open) this.#layer.place();
    if (this.open) this.#scrollToActive(changed.has('open'));

    const m = timeToMinutes(this.value);
    this.#internals.setFormValue(m === null ? null : this.value, this.value);
    const input = this.renderRoot.querySelector<HTMLInputElement>('input') ?? undefined;
    const lo = timeToMinutes(this.min), hi = timeToMinutes(this.max);
    const tf = this.#tf;
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, input);
    else if (this._text.trim() && m === null) this.#internals.setValidity({ badInput: true }, this.t('badInput', { pattern: this.#pattern }), input);
    else if (this.required && m === null) this.#internals.setValidity({ valueMissing: true }, this.t('required'), input);
    else if (m !== null && lo !== null && m < lo) this.#internals.setValidity({ rangeUnderflow: true }, this.t('rangeUnderflow', { time: tf.format(lo) }), input);
    else if (m !== null && hi !== null && m > hi) this.#internals.setValidity({ rangeOverflow: true }, this.t('rangeOverflow', { time: tf.format(hi) }), input);
    else if (m !== null && m % this.#stepMinutes) this.#internals.setValidity({ stepMismatch: true }, this.t('stepMismatch', { count: this.#stepMinutes }), input);
    else this.#internals.setValidity({});
    this.#v.sync();
  }

  /** Keeps the active time in view: in the middle of the list when it opens, else just inside its edge. Only the list scrolls. */
  #scrollToActive(center: boolean) {
    const list = this.renderRoot.querySelector<HTMLElement>('[role=listbox]');
    const opt = this.renderRoot.querySelector<HTMLElement>('[role=option].active');
    if (!list || !opt) return;
    const top = opt.offsetTop - list.offsetTop, bottom = top + opt.offsetHeight;
    if (center) list.scrollTop = top - (list.clientHeight - opt.offsetHeight) / 2;
    else if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  }

  #setValue(v: string) {
    if (v === this.value) return;
    this.value = v;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  /** Reads the typed text: a real time becomes the value, shown in the field's clock; anything else stays as typed and is invalid. */
  #commitText() {
    const text = this._text.trim();
    const t = text ? parseTime(text, this.#tf) : '';
    if (t === null) { this.#keepText = true; this.#setValue(''); this.requestUpdate(); return; }
    this.#setValue(t);
    this._text = this.#format(t);
  }

  #pick(minutes: number) {
    const t = minutesToTime(minutes);
    this.open = false;
    this.#setValue(t);
    this._text = this.#format(t);
    this.renderRoot.querySelector<HTMLInputElement>('input')?.focus();
  }

  #onKey = (e: KeyboardEvent) => {
    const times = this.#times;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        e.preventDefault();
        if (!this.open) { this.show(); return; }
        if (!times.length) return;
        const d = e.key === 'ArrowDown' ? 1 : -1;
        this._active = this._active < 0 ? 0 : Math.min(times.length - 1, Math.max(0, this._active + d));
        return;
      }
      case 'PageDown':
      case 'PageUp':
        if (!this.open || !times.length) return;
        e.preventDefault();
        this._active = Math.min(times.length - 1, Math.max(0, this._active + (e.key === 'PageDown' ? 6 : -6)));
        return;
      case 'Enter':
        if (this.open && this._active >= 0 && times[this._active] !== undefined) { e.preventDefault(); this.#pick(times[this._active]); }
        else { this.open = false; this.#commitText(); }
        return;
      case 'Escape':
        if (this.open) { e.preventDefault(); e.stopPropagation(); this.open = false; }
        return;
      case 'Tab':
        this.open = false;
        return;
      default:
    }
  };

  #onInput = (e: Event) => {
    e.stopPropagation();
    this._text = (e.target as HTMLInputElement).value;
    // While the list shows, the first time at or after what is typed becomes active, so Enter picks it.
    if (this.open) { const t = parseTime(this._text, this.#tf); if (t) this._active = this.#nearest(t); }
  };

  #toggle = () => {
    if (this.disabled) return;
    if (this.open) this.open = false;
    else { this.#commitText(); this.show(); }
    this.renderRoot.querySelector<HTMLInputElement>('input')?.focus();
  };

  #onOutside = (e: Event) => {
    if (this.open && !e.composedPath().includes(this)) this.open = false;
  };

  render() {
    const tf = this.#tf;
    const message = this.#v.message;
    const described = [message && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ');
    const hostLabel = this.getAttribute('aria-label');
    const name = this.label || hostLabel || '';
    const times = this.open ? this.#times : [];
    const chosen = timeToMinutes(this.value);
    const listId = `${this.#id}-list`;
    return html`<div class="field">
      ${this.label
        ? html`<label class="label" for="${this.#id}-in" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</label>`
        : nothing}
      <div class="wrap">
        <div class="box" part="box">
          <input id="${this.#id}-in" part="input" type="text" autocomplete="off" spellcheck="false" inputmode="text"
            role="combobox" aria-autocomplete="none" aria-expanded=${this.open ? 'true' : 'false'} aria-controls=${listId}
            aria-activedescendant=${this.open && this._active >= 0 && times[this._active] !== undefined ? `${this.#id}-o${times[this._active]}` : nothing}
            .value=${live(this._text)} placeholder=${this.placeholder || this.#pattern}
            aria-label=${!this.label && hostLabel ? hostLabel : nothing}
            ?required=${this.required} ?disabled=${this.disabled}
            aria-invalid=${message ? 'true' : nothing} aria-describedby=${described || nothing}
            @input=${this.#onInput} @change=${() => this.#commitText()} @keydown=${this.#onKey} />
          <button type="button" class="trigger" part="trigger" tabindex="-1" ?disabled=${this.disabled}
            aria-label=${this.t('showTimes')} aria-expanded=${this.open ? 'true' : 'false'} aria-controls=${listId}
            @pointerdown=${(e: Event) => e.preventDefault()} @click=${this.#toggle}><cm-icon name="clock" size="16"></cm-icon></button>
        </div>
        <div class="pop" part="popover" ?hidden=${!this.open} @pointerdown=${(e: Event) => e.preventDefault()}>
          <ul role="listbox" id=${listId} part="listbox" aria-label=${this.t(name ? 'timesFor' : 'times', { label: name })}>
            ${times.map((m, i) => html`<li role="option" id="${this.#id}-o${m}" data-value=${minutesToTime(m)}
              class=${i === this._active ? 'active' : ''} aria-selected=${m === chosen ? 'true' : 'false'}
              @pointerenter=${() => { this._active = i; }} @click=${() => this.#pick(m)}>${tf.format(m)}</li>`)}
          </ul>
        </div>
      </div>
      ${message ? html`<p class="error" id="${this.#id}-err" role="alert">${message}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
    </div>`;
  }
}
define('cm-time-picker', CmTimePicker);

declare global { interface HTMLElementTagNameMap { 'cm-time-picker': CmTimePicker } }
