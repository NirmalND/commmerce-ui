import { html, css, nothing, type TemplateResult } from 'lit';
import { localeFor, formatDate } from './localize.js';
import { fieldStyles } from './field.js';
import './components/icon.js';

/*
 * Shared, internal helpers for cm-date-picker and cm-date-range-picker: ISO date maths, locale-aware formatting
 * and parsing through Intl, and the month grid (WAI-ARIA APG "date picker dialog" grid). Not a public component.
 * Dates are plain local calendar dates written as ISO `yyyy-mm-dd` strings; Date objects are local midnight.
 */

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A Date at local midnight for an ISO date string, or null if the string is not a real date. */
export function fromISO(s: string | null | undefined): Date | null {
  const m = ISO.exec(s ?? '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return d.getFullYear() === +m[1] && d.getMonth() === +m[2] - 1 && d.getDate() === +m[3] ? d : null;
}
const pad = (n: number, w = 2) => String(n).padStart(w, '0');
export const toISO = (d: Date) => `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = () => toISO(new Date());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Same day in another month, clamped to that month's last day (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(d: Date, n: number) {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  return new Date(first.getFullYear(), first.getMonth(), Math.min(d.getDate(), last));
}
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const endOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
export const sameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/* ---------- Times (cm-date-picker `time`) ---------- */

const TIME = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d{1,3})?)?$/;
/** Minutes since midnight for an ISO time `hh:mm` (seconds are ignored), or null. */
export function timeToMinutes(s: string | null | undefined): number | null {
  const m = TIME.exec(s ?? '');
  return m ? +m[1] * 60 + +m[2] : null;
}
/** ISO time `hh:mm` for minutes since midnight (wraps round the day). */
export const minutesToTime = (n: number) => { const v = ((Math.round(n) % 1440) + 1440) % 1440; return `${pad(Math.floor(v / 60))}:${pad(v % 60)}`; };
/** `yyyy-mm-ddThh:mm` (or just a date) split into its ISO date and `hh:mm` time; a part is '' when missing or not real. */
export function splitDateTime(s: string | null | undefined): { date: string; time: string } {
  const [d = '', t = ''] = (s ?? '').split('T');
  const minutes = timeToMinutes(t);
  return { date: fromISO(d) ? d : '', time: minutes === null ? '' : minutesToTime(minutes) };
}
/** The local Date of `yyyy-mm-ddThh:mm`, or of a date alone at `dayEnd` ? 23:59 : 00:00; null if there is no real date. */
export function fromISODateTime(s: string | null | undefined, dayEnd = false): Date | null {
  const { date, time } = splitDateTime(s);
  const d = fromISO(date);
  if (!d) return null;
  const minutes = time ? timeToMinutes(time)! : dayEnd ? 1439 : 0;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), Math.floor(minutes / 60), minutes % 60);
}
/** The current local time as `yyyy-mm-ddThh:mm`. */
export const nowISO = () => { const n = new Date(); return `${toISO(n)}T${pad(n.getHours())}:${pad(n.getMinutes())}`; };

export interface TimeFormat {
  /** Formats minutes since midnight for the time box, e.g. "3:30 pm" (en-IN) or "15:30" (en-GB). */
  format(minutes: number): string;
  /** A date and time for messages and screen readers, e.g. "16 Nov 2026, 3:30 pm". */
  dateTime(d: Date): string;
  /** "{h}:{m} am": the locale's order, separators and day period; fill it with `timePattern()`. */
  pattern: string;
  /** True when the locale (or the hour cycle asked for) uses a 12-hour clock. */
  hour12: boolean;
  /** Lowercase words for before and after noon (the locale's and English), for reading typed times. */
  am: string[];
  pm: string[];
}

const timeFormats = new Map<string, TimeFormat>();
/** Intl time formatters for a locale, cached. `hourCycle` 'h12' or 'h23' overrides the locale's clock. */
export function timeFormat(locale: string, hourCycle?: string): TimeFormat {
  const hc = hourCycle === 'h12' || hourCycle === 'h23' ? hourCycle : undefined;
  const key = `${locale}|${hc ?? ''}`;
  const hit = timeFormats.get(key);
  if (hit) return hit;
  // A forced 24-hour clock reads 09:05 and 00:00 (1.16); Intl's numeric hour would give 9:05 and 0:00 in some locales.
  const opts = { hour: hc === 'h23' ? '2-digit' : 'numeric', minute: '2-digit', numberingSystem: 'latn', ...(hc ? { hourCycle: hc } : {}) } as Intl.DateTimeFormatOptions;
  const time = new Intl.DateTimeFormat(locale, opts);
  const cycle = time.resolvedOptions().hourCycle;
  const at = (h: number) => new Date(2000, 0, 1, h, 30);
  const period = (h: number) => (new Intl.DateTimeFormat(locale, { hour: 'numeric', hourCycle: 'h12' } as Intl.DateTimeFormatOptions)
    .formatToParts(at(h)).find((p) => p.type === 'dayPeriod')?.value ?? '').toLowerCase().replace(/[^\p{L}]/gu, '');
  const words = (local: string, en: string[]) => [...new Set([local, ...en].filter(Boolean))];
  // Intl puts a narrow no-break space before am/pm in some engines; a plain space is what merchants type.
  const spaces = (t: string) => t.replace(/[\u202f\u00a0]/g, ' ');
  const pattern = spaces(time.formatToParts(at(9))
    .map((p) => (p.type === 'hour' ? '{h}' : p.type === 'minute' ? '{m}' : p.value)).join(''));
  const fmt: TimeFormat = {
    format: (minutes) => spaces(time.format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60))),
    dateTime: (d) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', ...(hc ? { hourCycle: hc } : {}) } as Intl.DateTimeFormatOptions, locale),
    pattern,
    hour12: cycle === 'h12' || cycle === 'h11',
    am: words(period(9), ['am', 'a']),
    pm: words(period(15), ['pm', 'p']),
  };
  timeFormats.set(key, fmt);
  return fmt;
}

/** The typed-time pattern with the component's letters for hours and minutes, e.g. "hh:mm am" or "hh:mm". */
export const timePattern = (tf: TimeFormat, letters: { h: string; m: string }) =>
  tf.pattern.replace(/\{([hm])\}/g, (_, k: 'h' | 'm') => letters[k]);

/**
 * Reads a typed time: `15:30`, `3:30 pm`, `3.30pm`, `3 pm`, `1530`, `330pm`, with the locale's words for am and pm
 * as well as English. Without am/pm the hours are read on a 24-hour clock. Returns ISO `hh:mm`, or null.
 */
export function parseTime(text: string, tf: TimeFormat): string | null {
  const s = text.trim().toLowerCase().normalize('NFKC');
  if (!s) return null;
  const word = s.replace(/[^\p{L}]/gu, '');
  const pm = !!word && tf.pm.includes(word);
  const am = !!word && tf.am.includes(word);
  if (word && !pm && !am) return null;
  const nums = s.match(/\d+/g) ?? [];
  let h: number, m: number;
  if (nums.length === 1) {
    const g = nums[0];
    if (g.length <= 2) { h = +g; m = 0; }
    else if (g.length <= 4) { h = +g.slice(0, -2); m = +g.slice(-2); }
    else return null;
  } else if (nums.length === 2 || nums.length === 3) {
    if (nums[0].length > 2 || nums[1].length !== 2) return null;
    h = +nums[0]; m = +nums[1];
  } else return null;
  if (m > 59) return null;
  if (am || pm) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (pm ? 12 : 0);
  } else if (h > 23) return null;
  return minutesToTime(h * 60 + m);
}

/** Splits a list attribute (`"2026-12-25, 2026-12-31"` or `"today last-7-days"`) into an array. */
export const listConverter = {
  fromAttribute: (v: string | null) => (v ? v.split(/[\s,]+/).filter(Boolean) : []),
  toAttribute: (v: unknown) => (Array.isArray(v) ? v.join(' ') : v),
};

/** An array from a list property that may have been given a string (React 19 passes attribute strings as properties). */
export const asList = <T>(v: T[] | string | null | undefined): T[] =>
  Array.isArray(v) ? v : typeof v === 'string' ? (listConverter.fromAttribute(v) as T[]) : [];

/**
 * A usable BCP 47 locale: the element's own `locale` property, else the library's resolution (`configure({ locale })`,
 * then the nearest `lang` attribute, crossing shadow roots), else the browser's language.
 */
export function resolveLocale(el: Element, explicit: string): string {
  const candidates = [explicit, localeFor(el) ?? '', navigator.language, 'en'];
  for (const c of candidates) {
    if (!c) continue;
    try { if (Intl.DateTimeFormat.supportedLocalesOf([c]).length) return c; } catch { /* not a valid tag */ }
  }
  return 'en';
}

/** First day of the week for a locale (0 = Sunday … 6 = Saturday), from Intl.Locale week info where the browser has it. */
export function localeFirstDay(locale: string): number {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = l.getWeekInfo?.() ?? l.weekInfo;
    if (info?.firstDay) return info.firstDay % 7;
  } catch { /* fall through */ }
  return 0;
}

export interface DateFormat {
  /** Formats an ISO date for the text box, e.g. 15/11/2026 (en-IN) or 11/15/2026 (en-US). */
  short(d: Date): string;
  /** Full date for screen readers, e.g. "Sunday 15 November 2026". */
  long(d: Date): string;
  /** Medium date for summaries, e.g. "15 Nov 2026". */
  medium(d: Date): string;
  monthYear(d: Date): string;
  day(d: Date): string;
  /** Weekday names starting at Sunday. */
  weekdaysShort: string[];
  weekdaysLong: string[];
  /** "{d}/{m}/{y}": the locale's order and separators; fill it with `datePattern()`. */
  pattern: string;
  /** Order of the numeric fields, e.g. ['day', 'month', 'year']. */
  order: Array<'day' | 'month' | 'year'>;
  /** Lowercase month names (long and short, locale and English) for parsing typed dates. */
  months: string[][];
}

const formats = new Map<string, DateFormat>();
/** Intl formatters for a locale, cached. */
export function dateFormat(locale: string): DateFormat {
  const hit = formats.get(locale);
  if (hit) return hit;
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, o);
  const short = f({ day: '2-digit', month: '2-digit', year: 'numeric', numberingSystem: 'latn' } as Intl.DateTimeFormatOptions);
  const wdS = f({ weekday: 'short' });
  const wdL = f({ weekday: 'long' });
  const sunday = new Date(2024, 0, 7);
  const parts = short.formatToParts(new Date(2026, 10, 15));
  const order = parts.filter((p) => p.type === 'day' || p.type === 'month' || p.type === 'year').map((p) => p.type) as DateFormat['order'];
  const pattern = parts.map((p) => (p.type === 'day' ? '{d}' : p.type === 'month' ? '{m}' : p.type === 'year' ? '{y}' : p.value)).join('');
  const names = (loc: string, month: 'long' | 'short') => Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(loc, { month }).format(new Date(2024, i, 1)).toLowerCase().replace(/\./g, ''));
  const months = Array.from({ length: 12 }, (_, i) => [...new Set([names(locale, 'long')[i], names(locale, 'short')[i], names('en', 'long')[i], names('en', 'short')[i]])]);
  const fmt: DateFormat = {
    short: (d) => short.format(d),
    long: (d) => formatDate(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, locale),
    medium: (d) => formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' }, locale),
    monthYear: (d) => formatDate(d, { month: 'long', year: 'numeric' }, locale),
    day: (d) => formatDate(d, { day: 'numeric' }, locale),
    weekdaysShort: Array.from({ length: 7 }, (_, i) => wdS.format(addDays(sunday, i))),
    weekdaysLong: Array.from({ length: 7 }, (_, i) => wdL.format(addDays(sunday, i))),
    pattern: order.length === 3 ? pattern : '{y}-{m}-{d}', order: order.length === 3 ? order : ['year', 'month', 'day'], months,
  };
  formats.set(locale, fmt);
  return fmt;
}

/** The typed-date pattern with the component's letters for day, month and year, e.g. "dd/mm/yyyy" or "jj/mm/aaaa". */
export const datePattern = (fmt: DateFormat, letters: { d: string; m: string; y: string }) =>
  fmt.pattern.replace(/\{([dmy])\}/g, (_, k: 'd' | 'm' | 'y') => letters[k]);

/**
 * Reads a typed date: ISO (2026-11-15), the locale's numeric order (15/11/2026 in en-IN, 11/15/2026 in en-US,
 * with / . - or spaces, two-digit years mean 20xx), or a month name in the locale or English (15 Nov 2026,
 * November 15 2026). Returns the ISO date, or null if the text is not a real date.
 */
export function parseDate(text: string, fmt: DateFormat): string | null {
  const s = text.trim().toLowerCase();
  if (!s) return null;
  const tokens = s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length !== 3) return null;
  let y: number, m: number, d: number;
  const alpha = tokens.findIndex((t) => /\p{L}/u.test(t));
  if (alpha >= 0) {
    const t = tokens[alpha];
    m = fmt.months.findIndex((names) => names.some((n) => n === t || (t.length >= 3 && n.startsWith(t)))) + 1;
    const nums = tokens.filter((_, i) => i !== alpha);
    if (!m || nums.some((n) => !/^\d+$/.test(n))) return null;
    const yi = nums.findIndex((n) => n.length === 4);
    const yIndex = yi >= 0 ? yi : 1;
    y = +nums[yIndex]; d = +nums[1 - yIndex];
    if (nums[yIndex].length <= 2) y += 2000;
  } else {
    if (tokens.some((n) => !/^\d+$/.test(n))) return null;
    const order: DateFormat['order'] = tokens[0].length === 4 ? ['year', 'month', 'day'] : fmt.order;
    const get = (k: 'day' | 'month' | 'year') => tokens[order.indexOf(k)];
    y = +get('year'); m = +get('month'); d = +get('day');
    if (get('year').length <= 2) y += 2000;
    else if (get('year').length !== 4) return null;
  }
  const iso = `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
  return fromISO(iso) ? iso : null;
}

export interface GridOptions {
  id: string;
  fmt: DateFormat;
  firstDay: number;
  /** Month shown. */
  month: Date;
  /** Date that has the roving tabindex. */
  focus: Date;
  min: Date | null;
  max: Date | null;
  isDisabled(d: Date): boolean;
  /** 'selected' | 'start' | 'end' | 'in-range' | '' for a date. */
  mark(d: Date): string;
  /** Extra words after the date in its accessible name, e.g. "start date". */
  note?(d: Date): string;
  onPick(d: Date): void;
  onKey(e: KeyboardEvent): void;
  onMonth(step: number): void;
  onHover?(d: Date): void;
  /** Accessible names of the month buttons, in the component's language. */
  previousLabel: string;
  nextLabel: string;
  /** Hides one month button, for two months side by side (the left month keeps "previous", the right one "next"). */
  hideNav?: 'previous' | 'next';
  /**
   * `title`: only the month name as a heading, with the weekday names read by screen readers but not shown, for months
   * listed one under another under one shared weekday row (the date range picker's report layout, 1.18).
   */
  head?: 'nav' | 'title';
}

/**
 * The new focused date for a grid key (APG date picker dialog), or null if the key is not a grid key. Pass the key
 * from `logicalKey()`, so Left and Right follow the reading direction (in RTL, Left goes to the next day).
 */
export function gridKey(key: string, e: KeyboardEvent, focus: Date, firstDay: number): Date | null {
  const dow = (focus.getDay() - firstDay + 7) % 7;
  switch (key) {
    case 'ArrowRight': return addDays(focus, 1);
    case 'ArrowLeft': return addDays(focus, -1);
    case 'ArrowDown': return addDays(focus, 7);
    case 'ArrowUp': return addDays(focus, -7);
    case 'Home': return addDays(focus, -dow);
    case 'End': return addDays(focus, 6 - dow);
    case 'PageDown': return addMonths(focus, e.shiftKey ? 12 : 1);
    case 'PageUp': return addMonths(focus, e.shiftKey ? -12 : -1);
    default: return null;
  }
}

export const clamp = (d: Date, min: Date | null, max: Date | null) => (min && d < min ? min : max && d > max ? max : d);

export function renderGrid(o: GridOptions): TemplateResult {
  const { fmt, firstDay, month, focus, min, max } = o;
  const first = startOfMonth(month);
  const lead = (first.getDay() - firstDay + 7) % 7;
  const days = endOfMonth(month).getDate();
  const weeks: Array<Array<Date | null>> = [];
  let row: Array<Date | null> = Array(lead).fill(null);
  for (let i = 1; i <= days; i++) {
    row.push(new Date(month.getFullYear(), month.getMonth(), i));
    if (row.length === 7) { weeks.push(row); row = []; }
  }
  if (row.length) weeks.push([...row, ...Array(7 - row.length).fill(null)]);
  const order = Array.from({ length: 7 }, (_, i) => (i + firstDay) % 7);
  const today = todayISO();
  const prevOff = !!min && endOfMonth(addMonths(first, -1)) < min;
  const nextOff = !!max && addMonths(first, 1) > max;
  const thead = html`<thead class=${o.head === 'title' ? 'vh-head' : ''}><tr>${order.map((d) => html`<th scope="col" abbr=${fmt.weekdaysLong[d]}><span aria-hidden="true">${fmt.weekdaysShort[d]}</span><span class="vh">${fmt.weekdaysLong[d]}</span></th>`)}</tr></thead>`;
  const head = o.head === 'title'
    ? html`<h3 id="${o.id}-month" class="cal-month" part="calendar-month">${fmt.monthYear(month)}</h3>`
    : html`<div class="cal-head">
      ${o.hideNav === 'previous' ? html`<span class="cal-nav-gap"></span>` : html`<button type="button" class="cal-nav" part="calendar-nav" aria-label=${o.previousLabel} ?disabled=${prevOff} @click=${() => o.onMonth(-1)}><cm-icon name="chevron-left" size="18"></cm-icon></button>`}
      <h2 id="${o.id}-month" class="cal-title" aria-live="polite">${fmt.monthYear(month)}</h2>
      ${o.hideNav === 'next' ? html`<span class="cal-nav-gap"></span>` : html`<button type="button" class="cal-nav" part="calendar-nav" aria-label=${o.nextLabel} ?disabled=${nextOff} @click=${() => o.onMonth(1)}><cm-icon name="chevron-right" size="18"></cm-icon></button>`}
    </div>`;
  return html`${head}
    <table role="grid" class="cal-grid" part="calendar" aria-labelledby="${o.id}-month" @keydown=${o.onKey}>
      ${thead}
      <tbody>${weeks.map((w) => html`<tr>${w.map((d) => {
        if (!d) return html`<td class="empty"></td>`;
        const iso = toISO(d);
        const off = o.isDisabled(d) || (!!min && d < min) || (!!max && d > max);
        const mark = o.mark(d);
        const note = o.note?.(d);
        return html`<td class="day ${mark} ${iso === today ? 'today' : ''}" data-date=${iso}
          tabindex=${iso === toISO(focus) ? '0' : '-1'}
          aria-selected=${mark ? 'true' : 'false'} aria-disabled=${off ? 'true' : nothing}
          aria-current=${iso === today ? 'date' : nothing}
          aria-label="${fmt.long(d)}${note ? `, ${note}` : ''}"
          @click=${() => !off && o.onPick(d)} @pointerenter=${() => o.onHover?.(d)}><span aria-hidden="true">${fmt.day(d)}</span></td>`;
      })}</tr>`)}</tbody>
    </table>`;
}

/** Styles for the popover and grid. Hosts render `.pop[role=dialog]` around `renderGrid`. */
export const calendarStyles = css`
  .pop {
    position: absolute; z-index: 20; inset-block-start: calc(100% + var(--cm-space-8)); inset-inline-start: 0;
    width: max-content; max-width: calc(100vw - 32px); padding: var(--cm-space-12);
    background: var(--cm-bg-surface); color: var(--cm-text-default);
    border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-md);
  }
  .pop[hidden] { display: none; }
  .cal { width: 280px; max-width: 100%; }
  .cal-head { display: flex; align-items: center; justify-content: space-between; gap: var(--cm-space-8); margin-block-end: var(--cm-space-8); }
  .cal-title { flex: 1; margin: 0; text-align: center; font-size: 14px; line-height: 20px; font-weight: 500; }
  .cal-nav {
    display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: var(--cm-radius-sm);
    background: none; color: var(--cm-icon-selected); cursor: pointer;
  }
  .cal-nav-gap { flex: none; width: 32px; }
  .cal-nav:hover { background: var(--cm-bg-hover); }
  .cal-nav:disabled { color: var(--cm-text-secondary); cursor: not-allowed; background: none; }
  .cal-nav:focus-visible, .day:focus, .preset:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 0; }
  .cal-grid { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .cal-grid th { height: 32px; padding: 0; font-size: 12px; font-weight: 400; color: var(--cm-text-tertiary); text-align: center; }
  .day, .empty { height: 40px; padding: 0; text-align: center; font-size: 14px; }
  .day { cursor: pointer; border-radius: var(--cm-radius-sm); outline: none; }
  .day:hover { background: var(--cm-bg-hover); }
  .day.today span { text-decoration: underline; text-underline-offset: 3px; font-weight: 500; }
  .day.in-range { background: var(--cm-bg-attention-soft); border-radius: 0; }
  .day.selected, .day.start, .day.end { background: var(--cm-action-primary); color: var(--cm-action-primary-text); }
  .day[aria-disabled='true'] { color: var(--cm-text-secondary); cursor: not-allowed; background: none; text-decoration: line-through; }
  .vh-head { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .vh {
    position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden;
    clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  @media (max-width: 640px) { .day, .empty { height: 36px; } }
`;

/** Keeps focus inside an open calendar popover: Tab and Shift+Tab cycle its buttons, presets and the grid. */
export function trapTab(e: KeyboardEvent, pop: HTMLElement) {
  if (e.key !== 'Tab') return;
  const stops = [...pop.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), [role=grid] td[tabindex="0"]')];
  if (!stops.length) return;
  const root = pop.getRootNode() as ShadowRoot;
  const i = stops.indexOf(root.activeElement as HTMLElement);
  e.preventDefault();
  stops[(i + (e.shiftKey ? -1 : 1) + stops.length) % stops.length].focus();
}

/** Shared field and popover styles of the two date pickers. */
export const dateFieldStyles = css`
  ${fieldStyles}
  :host { display: block; position: relative; }
  .wrap { position: relative; }
  .box {
    display: flex; align-items: center; gap: var(--cm-space-4); width: 100%; height: var(--_cm-field-h); padding-block: 0; padding-inline: var(--_cm-field-pad) var(--cm-space-4);
    background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
  }
  /* Hover (1.6): the outline darkens; focus adds the 2px ring. */
  :host(:not([disabled])) .box:hover { border-color: var(--cm-border-strong); }
  .box:focus-within { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
  input {
    flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; outline: none; background: none;
    font: inherit; font-size: var(--_cm-field-font); color: var(--cm-text-default);
  }
  input::placeholder { color: var(--cm-text-tertiary); }
  .trigger {
    flex: none; display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0;
    border-radius: var(--cm-radius-xs); background: none; color: var(--cm-icon-selected); cursor: pointer;
  }
  :host([size='small']) .trigger { width: 24px; height: 24px; }
  @media (pointer: coarse) { .trigger, :host([size='small']) .trigger { width: 36px; height: 36px; } }
  .trigger:hover { background: var(--cm-bg-hover); }
  .trigger:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 0; }
  :host([error]:not([error=''])) .box, .box.invalid { border-color: var(--cm-border-critical); }
  :host([disabled]) .box { background: var(--cm-bg-input-filled); border-color: var(--cm-border-subtle); }
  :host([disabled]) input, :host([disabled]) .trigger { color: var(--cm-text-secondary); cursor: not-allowed; }
  :host([disabled]) .trigger:hover { background: none; }
  /* cm-date-picker with \`time\`: the date box and a time box side by side, wrapping onto two rows when narrow. */
  .wrap.timed { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); }
  .wrap.timed .box { width: auto; min-inline-size: 0; flex: 2 1 10.5rem; }
  .wrap.timed .box.time { flex: 1 1 7.5rem; padding-inline: var(--_cm-field-pad); }
`;

