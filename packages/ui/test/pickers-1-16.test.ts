import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page } from 'vitest/browser';
import '../src/index.js';
import { resolvePreset, type CmTimePicker, type CmDateRangePicker } from '../src/index.js';

// 1.16: cm-time-picker (12/24-hour, list of times) and the analytics-style date range picker
// (more presets, Custom, two months, Apply/Cancel). No real keyboard or pointer: events are dispatched.

const mount = async <T extends HTMLElement>(markup: string): Promise<T> => {
  document.body.innerHTML = markup;
  const first = document.body.firstElementChild!;
  const el = (first.matches('form') ? first.querySelector('cm-time-picker, cm-date-range-picker') : first) as T;
  await (el as any).updateComplete;
  return el;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const all = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(sel)];
const press = (target: Element, key: string, extra: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...extra }));
const typeInto = (input: HTMLInputElement, text: string) => {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};
const commit = (input: HTMLInputElement) => input.dispatchEvent(new Event('change', { bubbles: true }));
const settle = async (el: any) => { await el.updateComplete; await el.updateComplete; };
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const plusDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const options = (el: Element) => all(el, '[role=option]');

beforeAll(async () => { await page.viewport(1280, 800); });
afterAll(async () => { await page.viewport(414, 896); });
beforeEach(() => { document.body.innerHTML = ''; });

describe('cm-time-picker', () => {
  it('is a labelled combobox with a clock button and a list of times', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="Pickup time" locale="en-IN" help-text="Courier collects in this hour"></cm-time-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    expect(shadow(el, 'label').getAttribute('for')).toBe(input.id);
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    expect(input.placeholder).toBe('hh:mm am');
    const list = shadow(el, '[role=listbox]');
    expect(input.getAttribute('aria-controls')).toBe(list.id);
    expect(list.getAttribute('aria-label')).toBe('Times for Pickup time');
    expect(shadow(el, '.trigger').getAttribute('aria-label')).toBe('Show times');
    expect(shadow(el, '.pop').hidden).toBe(true);
  });

  it('shows am/pm or the 24-hour clock; the value is always 24-hour hh:mm', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="At" hour-cycle="h12" locale="en-GB" value="15:30"></cm-time-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    expect(input.value.toLowerCase()).toBe('3:30 pm');
    el.hourCycle = 'h23'; await settle(el);
    expect(input.value).toBe('15:30');
    expect(input.placeholder).toBe('hh:mm');
    expect(el.value).toBe('15:30');
    el.show(); await settle(el);
    expect(options(el)[0].textContent!.trim()).toBe('00:00');
    expect(options(el).find((o) => o.dataset.value === '15:30')!.textContent!.trim()).toBe('15:30');
    el.hourCycle = 'h12'; await settle(el);
    expect(options(el).find((o) => o.dataset.value === '15:30')!.textContent!.trim().toLowerCase()).toBe('3:30 pm');
  });

  it('typed times are read on change in either clock and fire input and change', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="At" locale="en-IN"></cm-time-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    typeInto(input, '9.15pm'); commit(input); await settle(el);
    expect(el.value).toBe('21:15');
    expect(input.value.toLowerCase()).toBe('9:15 pm');
    expect(events).toEqual(['input', 'change']);
    typeInto(input, '07:05'); commit(input); await settle(el);
    expect(el.value).toBe('07:05');
  });

  it('the list runs from min to max every interval and marks the chosen time', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="Slot" hour-cycle="h23" min="09:00" max="11:00" interval="30" value="10:00"></cm-time-picker>');
    el.show(); await settle(el);
    expect(options(el).map((o) => o.dataset.value)).toEqual(['09:00', '09:30', '10:00', '10:30', '11:00']);
    const chosen = options(el).filter((o) => o.getAttribute('aria-selected') === 'true');
    expect(chosen.map((o) => o.dataset.value)).toEqual(['10:00']);
    expect(chosen[0].classList.contains('active')).toBe(true);
  });

  it('interval defaults to step when step is 5 or more, else 30 minutes', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="At" hour-cycle="h23" step="15"></cm-time-picker>');
    el.show(); await settle(el);
    expect(options(el).length).toBe(96);
    el.step = 1; await settle(el);
    expect(options(el).length).toBe(48);
  });

  it('Down opens the list, arrows move the active time, Enter picks it, Escape closes', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="At" hour-cycle="h23" min="09:00" max="12:00" interval="60" value="10:00"></cm-time-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    let changes = 0;
    el.addEventListener('change', () => changes++);
    press(input, 'ArrowDown'); await settle(el);
    expect(el.open).toBe(true);
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const active = () => shadow(el, `#${input.getAttribute('aria-activedescendant')}`)?.dataset.value;
    expect(active()).toBe('10:00');
    press(input, 'ArrowDown'); await settle(el);
    expect(active()).toBe('11:00');
    press(input, 'ArrowUp'); press(input, 'ArrowUp'); press(input, 'ArrowUp'); await settle(el);
    expect(active()).toBe('09:00');
    press(input, 'Enter'); await settle(el);
    expect(el.value).toBe('09:00');
    expect(el.open).toBe(false);
    expect(changes).toBe(1);
    press(input, 'ArrowDown'); await settle(el);
    press(input, 'Escape'); await settle(el);
    expect(el.open).toBe(false);
    expect(el.value).toBe('09:00');
  });

  it('typing while the list is open makes the next listed time active', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="At" hour-cycle="h23"></cm-time-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    el.show(); await settle(el);
    typeInto(input, '14:10'); await settle(el);
    expect(shadow(el, `#${input.getAttribute('aria-activedescendant')}`).dataset.value).toBe('14:30');
  });

  it('clicking a time picks it', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="At" hour-cycle="h23" interval="60"></cm-time-picker>');
    shadow(el, '.trigger').click(); await settle(el);
    expect(el.open).toBe(true);
    options(el).find((o) => o.dataset.value === '18:00')!.click(); await settle(el);
    expect(el.value).toBe('18:00');
    expect(el.open).toBe(false);
  });

  it('validity: bad text, required, min/max and step', async () => {
    const el = await mount<CmTimePicker>('<cm-time-picker label="At" hour-cycle="h23" min="09:00" max="18:00" step="15" required></cm-time-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Enter or choose a time.');
    typeInto(input, '25:99'); commit(input); await settle(el);
    expect(el.value).toBe('');
    expect(input.value).toBe('25:99');
    expect(el.validity.badInput).toBe(true);
    expect(el.validationMessage).toBe('Enter a time like hh:mm.');
    el.value = '08:00'; await settle(el);
    expect(el.validity.rangeUnderflow).toBe(true);
    expect(el.validationMessage).toBe('Choose 09:00 or later.');
    el.value = '19:00'; await settle(el);
    expect(el.validity.rangeOverflow).toBe(true);
    el.value = '10:07'; await settle(el);
    expect(el.validity.stepMismatch).toBe(true);
    expect(el.validationMessage).toBe('Choose a time in steps of 15 minutes.');
    el.value = '10:15'; await settle(el);
    expect(el.checkValidity()).toBe(true);
  });

  it('submits hh:mm under name and form.reset() restores the first value', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    form.innerHTML = '<cm-time-picker name="at" label="At" value="08:30"></cm-time-picker>';
    const el = form.querySelector('cm-time-picker')!;
    await el.updateComplete;
    expect(new FormData(form).get('at')).toBe('08:30');
    el.value = '17:45'; await settle(el);
    expect(new FormData(form).get('at')).toBe('17:45');
    form.reset(); await settle(el);
    expect(el.value).toBe('08:30');
  });
});

describe('cm-date-range-picker 1.16 presets', () => {
  it('resolves the new preset keys; custom is not a range', () => {
    const wed = new Date(2026, 10, 18); // Wednesday 18 Nov 2026
    const r = (k: any, first = 0) => { const p = resolvePreset(k, wed, undefined, first)!; return [p.start, p.end, p.label]; };
    expect(r('this-week')).toEqual(['2026-11-15', '2026-11-18', 'This week']);
    expect(r('this-week', 1)).toEqual(['2026-11-16', '2026-11-18', 'This week']);
    expect(r('last-week')).toEqual(['2026-11-08', '2026-11-14', 'Last week']);
    expect(r('last-week', 1)).toEqual(['2026-11-09', '2026-11-15', 'Last week']);
    expect(r('last-28-days')).toEqual(['2026-10-22', '2026-11-18', 'Last 28 days']);
    expect(r('last-12-months')).toEqual(['2025-11-19', '2026-11-18', 'Last 12 months']);
    expect(r('this-year')).toEqual(['2026-01-01', '2026-11-18', 'This year']);
    expect(r('last-year')).toEqual(['2025-01-01', '2025-12-31', 'Last year']);
    expect(resolvePreset('custom' as any, wed)).toBeNull();
    expect(resolvePreset('toString' as any, wed)).toBeNull();
  });

  it('preset="last-7-days" sets the range relative to today', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Report" preset="last-7-days"></cm-date-range-picker>');
    expect(el.start).toBe(iso(plusDays(today(), -6)));
    expect(el.end).toBe(iso(today()));
    expect(el.getAttribute('preset')).toBe('last-7-days');
  });

  it('choosing a preset sets preset; picking dates clears it and presses Custom', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Report" presets="today last-7-days this-year custom"></cm-date-range-picker>');
    el.show(); await settle(el);
    const labels = all(el, '.preset').map((b) => b.textContent!.trim());
    expect(labels).toEqual(['Today', 'Last 7 days', 'This year', 'Custom']);
    all(el, '.preset')[2].click(); await settle(el);
    expect(el.preset).toBe('this-year');
    expect(el.start).toBe(`${today().getFullYear()}-01-01`);
    el.show(); await settle(el);
    expect(shadow(el, '[data-preset="this-year"]').getAttribute('aria-pressed')).toBe('true');
    expect(shadow(el, '[data-preset="custom"]').getAttribute('aria-pressed')).toBe('false');
    shadow(el, '[data-preset="custom"]').click(); await settle(el);
    expect(shadow(el, '[data-preset="custom"]').getAttribute('aria-pressed')).toBe('true');
    expect(el.shadowRoot!.activeElement?.matches('td[tabindex="0"]')).toBe(true);
    const days = all(el, 'td.day:not([aria-disabled])');
    days[2].click(); await settle(el);
    days[4].click(); await settle(el);
    expect(el.open).toBe(false);
    expect(el.preset).toBe('');
    expect(el.start).toBe(days[2].dataset.date);
  });

  it('months="2" shows two months side by side with one arrow each', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Report" months="2" start="2026-10-20" end="2026-11-10"></cm-date-range-picker>');
    el.show(); await settle(el);
    const titles = all(el, '.cal-title').map((h) => h.textContent!.trim());
    expect(titles).toEqual(['October 2026', 'November 2026']);
    const cals = all(el, '.cal');
    expect(cals[0].querySelectorAll('.cal-nav').length).toBe(1);
    expect(cals[0].querySelector('.cal-nav')!.getAttribute('aria-label')).toBe('Previous month');
    expect(cals[1].querySelector('.cal-nav')!.getAttribute('aria-label')).toBe('Next month');
    expect(all(el, 'td[tabindex="0"]').length).toBe(1);
    (cals[1].querySelector('.cal-nav') as HTMLElement).click(); await settle(el);
    expect(all(el, '.cal-title').map((h) => h.textContent!.trim())).toEqual(['November 2026', 'December 2026']);
    // A range across both months is marked in both grids.
    el.close(); await settle(el); el.show(); await settle(el);
    expect(all(el, 'td.start').map((d) => d.dataset.date)).toEqual(['2026-10-20']);
    expect(all(el, 'td.end').map((d) => d.dataset.date)).toEqual(['2026-11-10']);
  });

  it('months="2" shows one month on phones', async () => {
    await page.viewport(414, 896);
    try {
      const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Report" months="2"></cm-date-range-picker>');
      el.show(); await settle(el);
      expect(all(el, '.cal').length).toBe(1);
      expect(all(el, '.cal-nav').length).toBe(2);
    } finally { await page.viewport(1280, 800); }
  });

  it('confirm: presets and dates are a draft until Apply; Cancel drops them', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Report" confirm months="2" presets="yesterday last-28-days custom" start="2026-11-01" end="2026-11-05"></cm-date-range-picker>');
    let changes = 0;
    el.addEventListener('change', () => changes++);
    el.show(); await settle(el);
    const apply = () => all(el, '.act')[1] as HTMLButtonElement;
    const cancel = () => all(el, '.act')[0] as HTMLButtonElement;
    expect(apply().textContent!.trim()).toBe('Apply');
    expect(cancel().textContent!.trim()).toBe('Cancel');
    shadow(el, '[data-preset="last-28-days"]').click(); await settle(el);
    expect(el.open).toBe(true);
    expect(el.start).toBe('2026-11-01');
    expect(shadow(el, '[data-preset="last-28-days"]').getAttribute('aria-pressed')).toBe('true');
    expect(shadow(el, '.draft').textContent).toContain('–');
    cancel().click(); await settle(el);
    expect(el.open).toBe(false);
    expect([el.start, el.end, changes]).toEqual(['2026-11-01', '2026-11-05', 0]);

    el.show(); await settle(el);
    shadow(el, '[data-preset="yesterday"]').click(); await settle(el);
    apply().click(); await settle(el);
    expect(el.open).toBe(false);
    expect(el.start).toBe(iso(plusDays(today(), -1)));
    expect(el.end).toBe(iso(plusDays(today(), -1)));
    expect(el.preset).toBe('yesterday');
    expect(changes).toBe(1);

    // Dates in the calendar: Apply is disabled until both are picked, and the popup stays open after the end date.
    el.show(); await settle(el);
    const days = all(el, 'td.day:not([aria-disabled])');
    days[3].click(); await settle(el);
    expect(apply().disabled).toBe(true);
    expect(shadow(el, '[data-preset="custom"]').getAttribute('aria-pressed')).toBe('true');
    days[6].click(); await settle(el);
    expect(el.open).toBe(true);
    expect(apply().disabled).toBe(false);
    apply().click(); await settle(el);
    expect([el.start, el.end, el.preset]).toEqual([days[3].dataset.date, days[6].dataset.date, '']);
    expect(changes).toBe(2);
  });

  it('Escape with confirm drops the draft', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Report" confirm presets="today" start="2026-11-01" end="2026-11-05"></cm-date-range-picker>');
    el.show(); await settle(el);
    shadow(el, '[data-preset="today"]').click(); await settle(el);
    press(shadow(el, '.pop').querySelector('.preset')!, 'Escape'); await settle(el);
    expect(el.open).toBe(false);
    expect([el.start, el.end]).toEqual(['2026-11-01', '2026-11-05']);
  });
});
