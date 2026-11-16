import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { userEvent } from '@vitest/browser/context';
import '../src/index.js';
import type { CmDatePicker, CmDateRangePicker, CmCombobox } from '../src/index.js';

const mount = async <T extends HTMLElement>(markup: string): Promise<T> => {
  document.body.innerHTML = markup;
  const first = document.body.firstElementChild!;
  const el = (first.matches('form') ? first.querySelector('cm-date-picker, cm-date-range-picker, cm-combobox') : first) as T;
  await (el as any).updateComplete;
  return el;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const all = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(sel)];
const focused = (el: Element) => el.shadowRoot!.activeElement as HTMLElement | null;
const press = (target: Element, key: string, extra: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...extra }));
const typeInto = (input: HTMLInputElement, text: string) => {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const plusDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const longDate = (locale: string, y: number, m: number, d: number) =>
  new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d));
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => { document.body.innerHTML = ''; });
afterEach(() => { document.documentElement.removeAttribute('lang'); });

describe('cm-date-picker', () => {
  const open = async (el: CmDatePicker) => {
    shadow(el, '.trigger').click();
    await el.updateComplete;
    await el.updateComplete;
  };
  /** Presses a key on the focused grid cell and waits for the new cell to take focus. */
  const gridKey = async (el: CmDatePicker, key: string, extra: KeyboardEventInit = {}) => {
    press(focused(el)!, key, extra);
    await el.updateComplete;
    await el.updateComplete;
    return focused(el)?.dataset.date;
  };

  it('is a labelled text box with a calendar button that controls a modal dialog', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Ship by" locale="en-IN" help-text="Courier pickup date"></cm-date-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    expect(shadow(el, 'label').getAttribute('for')).toBe(input.id);
    expect(input.placeholder).toBe('dd/mm/yyyy');
    expect(input.getAttribute('aria-describedby')).toBe(shadow(el, '.help').id);
    const btn = shadow(el, '.trigger');
    expect(btn.getAttribute('aria-label')).toBe('Choose date for Ship by');
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    const dialog = shadow(el, `#${btn.getAttribute('aria-controls')}`);
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hidden).toBe(true);
  });

  it('opens on the chosen date with focus in a grid labelled by the month', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" locale="en-GB" value="2026-11-15"></cm-date-picker>');
    expect((shadow(el, 'input') as HTMLInputElement).value).toBe('15/11/2026');
    expect(shadow(el, '.trigger').getAttribute('aria-label')).toBe(`Change date for Date, ${longDate('en-GB', 2026, 11, 15)}`);
    await open(el);
    expect(el.open).toBe(true);
    expect(shadow(el, '.trigger').getAttribute('aria-expanded')).toBe('true');
    const grid = shadow(el, '[role=grid]');
    expect(shadow(el, `#${grid.getAttribute('aria-labelledby')}`).textContent).toBe('November 2026');
    expect(focused(el)?.dataset.date).toBe('2026-11-15');
    expect(focused(el)?.getAttribute('aria-selected')).toBe('true');
    expect(focused(el)?.getAttribute('tabindex')).toBe('0');
    expect(focused(el)?.getAttribute('aria-label')).toBe(longDate('en-GB', 2026, 11, 15));
    expect(focused(el)?.getAttribute('aria-label')).toMatch(/^Sunday,? 15 November 2026$/);
    expect(all(el, 'td[tabindex="0"]').length).toBe(1);
    expect(all(el, 'td.day').length).toBe(30);
  });

  it('moves by day, week, week start/end, month and year from the keyboard (APG grid keys)', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" locale="en-GB" first-day-of-week="1" value="2026-11-15"></cm-date-picker>');
    await open(el);
    expect(await gridKey(el, 'ArrowRight')).toBe('2026-11-16');
    expect(await gridKey(el, 'ArrowDown')).toBe('2026-11-23');
    expect(await gridKey(el, 'ArrowLeft')).toBe('2026-11-22');
    expect(await gridKey(el, 'ArrowUp')).toBe('2026-11-15');
    expect(await gridKey(el, 'Home')).toBe('2026-11-09'); // Monday: weeks start on Monday
    expect(await gridKey(el, 'End')).toBe('2026-11-15');
    expect(await gridKey(el, 'PageDown')).toBe('2026-12-15');
    expect(shadow(el, '.cal-title').textContent).toBe('December 2026');
    expect(await gridKey(el, 'PageDown', { shiftKey: true })).toBe('2027-12-15');
    expect(await gridKey(el, 'PageUp')).toBe('2027-11-15');
    expect(await gridKey(el, 'PageUp', { shiftKey: true })).toBe('2026-11-15');
    // 31 January + 1 month lands on the last day of February.
    el.value = '2027-01-31'; el.open = false; await el.updateComplete;
    await open(el);
    expect(await gridKey(el, 'PageDown')).toBe('2027-02-28');
    expect(await gridKey(el, 'ArrowLeft')).toBe('2027-02-27');
    expect(await gridKey(el, 'ArrowRight')).toBe('2027-02-28');
    expect(await gridKey(el, 'ArrowRight')).toBe('2027-03-01');
    expect(shadow(el, '.cal-title').textContent).toBe('March 2027');
  });

  it('Enter picks the focused date, closes, fires input and change once and returns focus to the button', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" locale="en-GB" value="2026-11-15"></cm-date-picker>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await open(el);
    await gridKey(el, 'ArrowRight');
    press(focused(el)!, 'Enter'); await el.updateComplete;
    expect(el.value).toBe('2026-11-16');
    expect(el.open).toBe(false);
    expect(events).toEqual(['input', 'change']);
    expect(focused(el)).toBe(shadow(el, '.trigger'));
    expect((shadow(el, 'input') as HTMLInputElement).value).toBe('16/11/2026');
    expect(el.valueAsDate?.getDate()).toBe(16);
    // Space picks too, and picking the same date again fires nothing.
    await open(el);
    press(focused(el)!, ' '); await el.updateComplete;
    expect(events.length).toBe(2);
  });

  it('Escape closes without picking and returns focus; Tab stays inside the dialog', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" value="2026-11-15"></cm-date-picker>');
    await open(el);
    await gridKey(el, 'ArrowRight');
    const pop = shadow(el, '[role=dialog]');
    const stops = () => [shadow(el, '[aria-label="Previous month"]'), shadow(el, '[aria-label="Next month"]'), shadow(el, 'td[tabindex="0"]')];
    press(focused(el)!, 'Tab');
    expect(focused(el)).toBe(stops()[0]);
    press(focused(el)!, 'Tab');
    expect(focused(el)).toBe(stops()[1]);
    press(focused(el)!, 'Tab');
    expect(focused(el)).toBe(stops()[2]);
    press(focused(el)!, 'Tab', { shiftKey: true });
    expect(focused(el)).toBe(stops()[1]);
    expect(pop.contains(focused(el))).toBe(true);
    press(focused(el)!, 'Escape'); await el.updateComplete;
    expect(el.open).toBe(false);
    expect(el.value).toBe('2026-11-15');
    expect(focused(el)).toBe(shadow(el, '.trigger'));
  });

  it('previous and next month buttons change the month; clicking a day picks it', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" locale="en-GB" value="2026-11-15"></cm-date-picker>');
    await open(el);
    shadow(el, '[aria-label="Next month"]').click(); await el.updateComplete;
    expect(shadow(el, '.cal-title').textContent).toBe('December 2026');
    shadow(el, '[aria-label="Previous month"]').click(); await el.updateComplete;
    shadow(el, '[aria-label="Previous month"]').click(); await el.updateComplete;
    expect(shadow(el, '.cal-title').textContent).toBe('October 2026');
    shadow(el, 'td[data-date="2026-10-02"]').click(); await el.updateComplete;
    expect(el.value).toBe('2026-10-02');
    expect(el.open).toBe(false);
  });

  it('honours min and max: dates outside are disabled, focus stays inside, month buttons stop', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" value="2026-11-15" min="2026-11-10" max="2026-12-05"></cm-date-picker>');
    await open(el);
    expect(shadow(el, 'td[data-date="2026-11-09"]').getAttribute('aria-disabled')).toBe('true');
    expect(shadow(el, 'td[data-date="2026-11-10"]').hasAttribute('aria-disabled')).toBe(false);
    expect((shadow(el, '[aria-label="Previous month"]') as HTMLButtonElement).disabled).toBe(true);
    shadow(el, 'td[data-date="2026-11-09"]').click(); await el.updateComplete;
    expect(el.value).toBe('2026-11-15');
    expect(el.open).toBe(true);
    expect(await gridKey(el, 'PageUp')).toBe('2026-11-10');
    expect(await gridKey(el, 'PageDown')).toBe('2026-12-05');
    expect((shadow(el, '[aria-label="Next month"]') as HTMLButtonElement).disabled).toBe(true);
    // A typed date outside the range is kept but invalid.
    el.value = '2026-12-25'; await el.updateComplete;
    expect(el.validity.rangeOverflow).toBe(true);
    el.value = '2026-11-01'; await el.updateComplete;
    expect(el.validity.rangeUnderflow).toBe(true);
    expect(el.validationMessage).toContain('or later');
  });

  it('disables dates from disabled-dates and isDateDisabled; they can be focused but not picked', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Pickup" value="2026-11-16" disabled-dates="2026-11-17, 2026-11-18"></cm-date-picker>');
    el.isDateDisabled = (d) => new Date(d + 'T00:00').getDay() === 0; // Sundays
    await open(el);
    expect(el.disabledDates).toEqual(['2026-11-17', '2026-11-18']);
    expect(shadow(el, 'td[data-date="2026-11-17"]').getAttribute('aria-disabled')).toBe('true');
    expect(shadow(el, 'td[data-date="2026-11-22"]').getAttribute('aria-disabled')).toBe('true');
    expect(shadow(el, 'td[data-date="2026-11-19"]').hasAttribute('aria-disabled')).toBe(false);
    expect(await gridKey(el, 'ArrowRight')).toBe('2026-11-17');
    press(focused(el)!, 'Enter'); await el.updateComplete;
    expect(el.value).toBe('2026-11-16');
    expect(el.open).toBe(true);
    el.open = false;
    el.value = '2026-11-22'; await el.updateComplete;
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.customError).toBe(true);
  });

  it('accepts typed dates in the locale order, ISO and with month names; rejects impossible dates', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" locale="en-IN"></cm-date-picker>');
    const input = shadow(el, 'input') as HTMLInputElement;
    let changes = 0;
    el.addEventListener('change', () => changes++);
    const commit = async (text: string) => { typeInto(input, text); await el.updateComplete; press(input, 'Enter'); await el.updateComplete; };
    await commit('16/11/2026');
    expect(el.value).toBe('2026-11-16');
    expect(changes).toBe(1);
    await commit('2026-11-17');
    expect(el.value).toBe('2026-11-17');
    expect(input.value).toBe('17/11/2026');
    await commit('18 Nov 2026');
    expect(el.value).toBe('2026-11-18');
    await commit('November 19, 2026');
    expect(el.value).toBe('2026-11-19');
    await commit('1.12.26');
    expect(el.value).toBe('2026-12-01');
    await commit('31/02/2026');
    expect(el.value).toBe('');
    expect(input.value).toBe('31/02/2026');
    expect(el.validity.badInput).toBe(true);
    expect(el.validationMessage).toContain('dd/mm/yyyy');
    await commit('');
    expect(el.validity.valid).toBe(true);
    // US order
    el.locale = 'en-US'; await el.updateComplete;
    expect(input.placeholder).toBe('mm/dd/yyyy');
    await commit('11/20/2026');
    expect(el.value).toBe('2026-11-20');
    expect(input.value).toBe('11/20/2026');
  });

  it('typing with the real keyboard and leaving the box commits the date', async () => {
    const el = await mount<CmDatePicker>('<div><cm-date-picker label="Date" locale="en-GB"></cm-date-picker><button>next</button></div>');
    const dp = el.querySelector('cm-date-picker') as CmDatePicker;
    await dp.updateComplete;
    let changes = 0;
    dp.addEventListener('change', () => changes++);
    await userEvent.click(shadow(dp, 'input'));
    await userEvent.keyboard('5/1/2027');
    el.querySelector('button')!.focus();
    await dp.updateComplete;
    expect(dp.value).toBe('2027-01-05');
    expect(changes).toBe(1);
  });

  it('uses Intl for month and weekday names in the locale and the first day of the week', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" locale="fr-FR" first-day-of-week="1" value="2026-11-15"></cm-date-picker>');
    await open(el);
    expect(shadow(el, '.cal-title').textContent).toBe('novembre 2026');
    const heads = all(el, 'th');
    expect(heads.length).toBe(7);
    expect(heads[0].getAttribute('abbr')).toBe('lundi');
    expect(heads[6].getAttribute('abbr')).toBe('dimanche');
    expect(focused(el)?.getAttribute('aria-label')).toBe(longDate('fr-FR', 2026, 11, 15));
    expect((shadow(el, 'input') as HTMLInputElement).placeholder).toBe('dd/mm/yyyy');
    el.firstDayOfWeek = 0; await el.updateComplete;
    expect(all(el, 'th')[0].getAttribute('abbr')).toBe('dimanche');
    // 1 November 2026 is a Sunday: no empty cells before it when weeks start on Sunday.
    expect(shadow(el, 'tbody tr').querySelectorAll('td.empty').length).toBe(0);
  });

  it('defaults to the document language and falls back for invalid locales', async () => {
    document.documentElement.lang = 'es-ES';
    const el = await mount<CmDatePicker>('<cm-date-picker label="Fecha" value="2026-11-15" first-day-of-week="1"></cm-date-picker>');
    await open(el);
    expect(shadow(el, '.cal-title').textContent).toMatch(/noviembre/);
    el.open = false;
    el.locale = 'not a locale!'; await el.updateComplete;
    await open(el);
    expect(shadow(el, '.cal-title').textContent).toMatch(/noviembre/);
  });

  it('marks today with aria-current', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date"></cm-date-picker>');
    await open(el);
    expect(focused(el)?.dataset.date).toBe(iso(today()));
    expect(focused(el)?.getAttribute('aria-current')).toBe('date');
    expect(all(el, '[aria-current=date]').length).toBe(1);
  });

  it('submits the ISO value, validates required, resets and follows a disabled fieldset', async () => {
    const el = await mount<CmDatePicker>('<form><fieldset><cm-date-picker name="ship" label="Ship by" required value="2026-11-15"></cm-date-picker></fieldset></form>');
    const form = el.closest('form')!;
    expect(new FormData(form).get('ship')).toBe('2026-11-15');
    el.value = ''; await el.updateComplete;
    expect(new FormData(form).has('ship')).toBe(false);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    el.value = '2026-12-01'; await el.updateComplete;
    expect(el.checkValidity()).toBe(true);
    form.reset(); await el.updateComplete;
    expect(el.value).toBe('2026-11-15');
    el.error = 'Pick a weekday'; await el.updateComplete;
    expect(shadow(el, 'input').getAttribute('aria-invalid')).toBe('true');
    expect(shadow(el, '.error').getAttribute('role')).toBe('alert');
    expect(el.validity.customError).toBe(true);
    form.querySelector('fieldset')!.disabled = true; await el.updateComplete;
    expect(el.disabled).toBe(true);
    expect((shadow(el, '.trigger') as HTMLButtonElement).disabled).toBe(true);
    expect(new FormData(form).has('ship')).toBe(false);
  });

  it('closes on an outside pointerdown and with show()/close()', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date"></cm-date-picker>');
    el.show(); await el.updateComplete;
    expect(el.open).toBe(true);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.open).toBe(false);
    el.show(); await el.updateComplete;
    el.close(); await el.updateComplete;
    expect(shadow(el, '[role=dialog]').hidden).toBe(true);
    el.disabled = true; el.show(); await el.updateComplete;
    expect(el.open).toBe(false);
  });

  it('Alt+Down in the text box opens the calendar', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Date" value="2026-11-15"></cm-date-picker>');
    press(shadow(el, 'input'), 'ArrowDown', { altKey: true });
    await el.updateComplete; await el.updateComplete;
    expect(el.open).toBe(true);
    expect(focused(el)?.dataset.date).toBe('2026-11-15');
  });
});

describe('cm-date-picker with time (issue #12)', () => {
  const timeIn = (el: CmDatePicker) => shadow(el, 'input.time-in') as HTMLInputElement;
  const dateIn = (el: CmDatePicker) => shadow(el, 'input') as HTMLInputElement;
  const enIN = (d: Date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d);
  const commitTime = async (el: CmDatePicker, text: string) => {
    typeInto(timeIn(el), text);
    timeIn(el).dispatchEvent(new Event('change'));
    await el.updateComplete;
  };
  const pad = (n: number) => String(n).padStart(2, '0');
  // The engine's own en-IN data: "3:30 pm" in Chromium, "3:30 PM" in WebKit.
  const clock = (h: number, m: number) =>
    new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' }).format(new Date(2000, 0, 1, h, m)).replace(/[\u202f\u00a0]/g, ' ');
  const am = () => clock(9, 0).replace(/^[\d:]+\s*/, '');

  it('adds a labelled time box; en-IN shows a 12-hour clock with am/pm; the value is local ISO without offset', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Follow up on" locale="en-IN" time value="2026-11-20T15:30"></cm-date-picker>');
    expect(dateIn(el).value).toBe('20/11/2026');
    expect(timeIn(el).value).toBe(clock(15, 30));
    expect(timeIn(el).placeholder).toBe(`hh:mm ${am()}`);
    expect(timeIn(el).getAttribute('aria-label')).toBe('Time for Follow up on');
    expect(el.valueAsDate!.getTime()).toBe(new Date(2026, 10, 20, 15, 30).getTime());
    expect(el.checkValidity()).toBe(true);
    el.locale = 'en-GB'; await el.updateComplete;
    expect(timeIn(el).value).toBe('15:30');
    expect(timeIn(el).placeholder).toBe('hh:mm');
    el.hourCycle = 'h12'; await el.updateComplete;
    expect(timeIn(el).value).toBe(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', hourCycle: 'h12' }).format(new Date(2000, 0, 1, 15, 30)).replace(/[\u202f\u00a0]/g, ' '));
  });

  it('reads typed times in many shapes and shows them in the locale clock', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Follow up on" locale="en-IN" time value="2026-11-20T09:00"></cm-date-picker>');
    const cases: Array<[string, string, string]> = [
      ['1530', '15:30', clock(15, 30)], ['3:45pm', '15:45', clock(15, 45)], ['9 am', '09:00', clock(9, 0)], ['12:05 am', '00:05', clock(0, 5)],
      ['12 pm', '12:00', clock(12, 0)], ['7.15 P.M.', '19:15', clock(19, 15)], ['0:00', '00:00', clock(0, 0)],
    ];
    for (const [typed, iso, shown] of cases) {
      await commitTime(el, typed);
      expect(el.value, typed).toBe(`2026-11-20T${iso}`);
      expect(timeIn(el).value, typed).toBe(shown);
    }
    let changes = 0;
    el.addEventListener('change', () => changes++);
    await commitTime(el, '25:99');
    expect(timeIn(el).value).toBe('25:99'); // kept as typed
    expect(el.value).toBe('');
    expect(changes).toBe(1);
    expect(el.validity.badInput).toBe(true);
    expect(el.validationMessage).toBe(`Enter a time like hh:mm ${am()}.`);
  });

  it('a date without a time (or a time without a date) is incomplete; the value stays empty until both are set', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Follow up on" locale="en-IN" time></cm-date-picker>');
    expect(el.checkValidity()).toBe(true); // empty and not required
    typeInto(dateIn(el), '20/11/2026'); press(dateIn(el), 'Enter'); await el.updateComplete;
    expect(el.value).toBe('');
    expect(el.validity.badInput).toBe(true);
    expect(el.validationMessage).toBe('Enter a time.');
    await commitTime(el, '4 pm');
    expect(el.value).toBe('2026-11-20T16:00');
    expect(el.checkValidity()).toBe(true);
    typeInto(dateIn(el), ''); press(dateIn(el), 'Enter'); await el.updateComplete;
    expect(el.value).toBe('');
    expect(timeIn(el).value).toBe(clock(16, 0));
    expect(el.validationMessage).toBe('Enter or choose a date.');
  });

  it('min="now": past days are disabled, an earlier time today is invalid with a message in the locale, a later one is valid', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Follow up on" locale="en-IN" time min="now"></cm-date-picker>');
    const t = today();
    el.show(); await el.updateComplete; await el.updateComplete;
    expect(shadow(el, `td[data-date="${iso(t)}"]`).getAttribute('aria-disabled')).toBeNull();
    if (t.getDate() > 1) expect(shadow(el, `td[data-date="${iso(plusDays(t, -1))}"]`).getAttribute('aria-disabled')).toBe('true');
    el.close();
    const past = new Date(Date.now() - 2 * 3600_000);
    el.value = `${iso(past)}T${pad(past.getHours())}:${pad(past.getMinutes())}`;
    await el.updateComplete;
    expect(el.validity.rangeUnderflow).toBe(true);
    const min = new Date(); min.setSeconds(0, 0);
    expect(el.validationMessage).toBe(`Choose ${enIN(min)} or later.`);
    const later = new Date(Date.now() + 2 * 3600_000);
    el.value = `${iso(later)}T${pad(later.getHours())}:${pad(later.getMinutes())}`;
    await el.updateComplete;
    expect(el.checkValidity()).toBe(true);
  });

  it('min and max with times; a date-only max allows the whole day', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Demo at" locale="en-IN" time min="2026-11-20T10:00" max="2026-11-21" value="2026-11-20T09:30"></cm-date-picker>');
    expect(el.validity.rangeUnderflow).toBe(true);
    expect(el.validationMessage).toBe(`Choose ${enIN(new Date(2026, 10, 20, 10, 0))} or later.`);
    el.value = '2026-11-21T23:59'; await el.updateComplete;
    expect(el.checkValidity()).toBe(true);
    el.value = '2026-11-22T00:00'; await el.updateComplete;
    expect(el.validity.rangeOverflow).toBe(true);
    expect(el.validationMessage).toBe(`Choose ${new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(2026, 10, 21))} or earlier.`);
  });

  it('step: Up and Down move by the step from midnight; a time off the step is invalid', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Call at" locale="en-IN" time step="15" value="2026-11-20T10:07"></cm-date-picker>');
    expect(el.validity.stepMismatch).toBe(true);
    expect(el.validationMessage).toBe('Choose a time in steps of 15 minutes.');
    timeIn(el).focus();
    press(timeIn(el), 'ArrowUp'); await el.updateComplete;
    expect(el.value).toBe('2026-11-20T10:15');
    expect(timeIn(el).value).toBe(clock(10, 15));
    press(timeIn(el), 'ArrowDown'); await el.updateComplete;
    expect(el.value).toBe('2026-11-20T10:00');
    expect(el.checkValidity()).toBe(true);
    el.value = '2026-11-20T23:45'; await el.updateComplete;
    press(timeIn(el), 'ArrowUp'); await el.updateComplete;
    expect(el.value).toBe('2026-11-20T00:00'); // wraps round the day
  });

  it('picking a date in the calendar moves focus to the empty time box', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Follow up on" locale="en-IN" time value=""></cm-date-picker>');
    el.show(); await el.updateComplete; await el.updateComplete;
    press(focused(el)!, 'Enter'); await el.updateComplete; await tick();
    expect(el.open).toBe(false);
    expect(focused(el)).toBe(timeIn(el));
    expect(dateIn(el).value).not.toBe('');
  });

  it('submits yyyy-mm-ddThh:mm, blocks a required empty field and resets', async () => {
    const el = await mount<CmDatePicker>('<form><cm-date-picker name="follow_up" label="Follow up on" locale="en-IN" time required value="2026-11-20T15:30"></cm-date-picker></form>');
    const form = el.closest('form')!;
    expect(new FormData(form).get('follow_up')).toBe('2026-11-20T15:30');
    await commitTime(el, '');
    expect(new FormData(form).has('follow_up')).toBe(false);
    expect(form.checkValidity()).toBe(false);
    form.reset(); await el.updateComplete;
    expect(el.value).toBe('2026-11-20T15:30');
    expect(timeIn(el).value).toBe(clock(15, 30));
    el.value = ''; await el.updateComplete;
    expect(el.validity.valueMissing).toBe(true);
    expect(el.validationMessage).toBe('Enter or choose a date.');
  });

  it('without time, a date with a time part in min is read as its date; nothing else changes', async () => {
    const el = await mount<CmDatePicker>('<cm-date-picker label="Ship by" locale="en-IN" min="2026-11-20T10:00" value="2026-11-19"></cm-date-picker>');
    expect(shadow(el, 'input.time-in')).toBeNull();
    expect(el.validity.rangeUnderflow).toBe(true);
    el.value = '2026-11-20'; await el.updateComplete;
    expect(el.checkValidity()).toBe(true);
  });
});

describe('cm-date-range-picker', () => {
  const open = async (el: CmDateRangePicker) => {
    shadow(el, '.trigger').click();
    await el.updateComplete; await el.updateComplete;
  };
  const gridKey = async (el: CmDateRangePicker, key: string, extra: KeyboardEventInit = {}) => {
    press(focused(el)!, key, extra);
    await el.updateComplete; await el.updateComplete;
    return focused(el)?.dataset.date;
  };

  it('is a labelled group of two named date inputs and a calendar button', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Order date" locale="en-IN" start="2026-11-01" end="2026-11-15"></cm-date-range-picker>');
    const group = shadow(el, '[role=group]');
    expect(shadow(el, `#${group.getAttribute('aria-labelledby')}`).textContent).toBe('Order date');
    const [s, e] = all(el, 'input') as HTMLInputElement[];
    expect(s.getAttribute('aria-label')).toBe('Start date');
    expect(e.getAttribute('aria-label')).toBe('End date');
    expect(s.value).toBe('01/11/2026');
    expect(e.value).toBe('15/11/2026');
    const long = (d: Date) => new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d);
    expect(shadow(el, '.trigger').getAttribute('aria-label')).toBe(`Change dates for Order date, ${long(new Date(2026, 10, 1))} to ${long(new Date(2026, 10, 15))}`);
    expect(shadow(el, '[role=dialog]').getAttribute('aria-label')).toBe('Choose dates');
  });

  it('picks the start then the end date from the keyboard, showing the range as it goes', async () => {
    const el = await mount<CmDateRangePicker>('<form><cm-date-range-picker name="created" label="Created" locale="en-GB" start="2026-11-03" end="2026-11-05"></cm-date-range-picker></form>');
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await open(el);
    expect(focused(el)?.dataset.date).toBe('2026-11-03');
    expect(shadow(el, 'td[data-date="2026-11-04"]').classList.contains('in-range')).toBe(true);
    expect(shadow(el, '.status').textContent).toBe('Choose the start date.');
    await gridKey(el, 'ArrowRight');
    press(focused(el)!, 'Enter'); await el.updateComplete; await el.updateComplete;
    expect(el.open).toBe(true);
    expect(events).toEqual([]);
    expect(shadow(el, '.status').textContent).toBe('Start date 4 Nov 2026. Choose the end date.');
    expect(shadow(el, 'td[data-date="2026-11-04"]').getAttribute('aria-label')).toBe(`${longDate('en-GB', 2026, 11, 4)}, start date`);
    expect(await gridKey(el, 'ArrowDown')).toBe('2026-11-11');
    expect(shadow(el, 'td[data-date="2026-11-08"]').classList.contains('in-range')).toBe(true);
    expect(shadow(el, 'td[data-date="2026-11-08"]').getAttribute('aria-selected')).toBe('true');
    expect(shadow(el, 'td[data-date="2026-11-12"]').getAttribute('aria-selected')).toBe('false');
    press(focused(el)!, 'Enter'); await el.updateComplete;
    expect(el.open).toBe(false);
    expect([el.start, el.end]).toEqual(['2026-11-04', '2026-11-11']);
    expect(events).toEqual(['input', 'change']);
    expect(focused(el)).toBe(shadow(el, '.trigger'));
    const fd = new FormData(el.closest('form')!);
    expect(fd.get('created-start')).toBe('2026-11-04');
    expect(fd.get('created-end')).toBe('2026-11-11');
  });

  it('a second date before the first restarts the range; Escape keeps the old range', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Created" start="2026-11-10" end="2026-11-12"></cm-date-range-picker>');
    await open(el);
    shadow(el, 'td[data-date="2026-11-20"]').click(); await el.updateComplete;
    shadow(el, 'td[data-date="2026-11-05"]').click(); await el.updateComplete;
    expect(el.open).toBe(true);
    expect(shadow(el, 'td[data-date="2026-11-05"]').classList.contains('start')).toBe(true);
    press(focused(el)!, 'Escape'); await el.updateComplete;
    expect(el.open).toBe(false);
    expect([el.start, el.end]).toEqual(['2026-11-10', '2026-11-12']);
    await open(el);
    shadow(el, 'td[data-date="2026-11-05"]').click(); await el.updateComplete;
    shadow(el, 'td[data-date="2026-11-07"]').click(); await el.updateComplete;
    expect([el.start, el.end]).toEqual(['2026-11-05', '2026-11-07']);
  });

  it('a one-day range: the same date twice', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Day"></cm-date-range-picker>');
    await open(el);
    press(focused(el)!, 'Enter'); await el.updateComplete; await el.updateComplete;
    press(focused(el)!, 'Enter'); await el.updateComplete;
    expect([el.start, el.end]).toEqual([iso(today()), iso(today())]);
  });

  it('preset ranges from the presets attribute: Today, Last 7 days, Last 30 days, This month', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Report period" presets="today last-7-days last-30-days this-month"></cm-date-range-picker>');
    let changes = 0;
    el.addEventListener('change', () => changes++);
    await open(el);
    const buttons = () => all(el, '.preset');
    expect(shadow(el, '.presets').getAttribute('aria-label')).toBe('Preset ranges');
    expect(buttons().map((b) => b.textContent!.trim())).toEqual(['Today', 'Last 7 days', 'Last 30 days', 'This month']);
    buttons()[1].click(); await el.updateComplete;
    const t = today();
    expect([el.start, el.end]).toEqual([iso(plusDays(t, -6)), iso(t)]);
    expect(el.open).toBe(false);
    expect(changes).toBe(1);
    await open(el);
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[0].getAttribute('aria-pressed')).toBe('false');
    buttons()[2].click(); await el.updateComplete;
    expect(el.start).toBe(iso(plusDays(t, -29)));
    await open(el);
    buttons()[3].click(); await el.updateComplete;
    expect(el.start).toBe(iso(new Date(t.getFullYear(), t.getMonth(), 1)));
    expect(el.end).toBe(iso(t));
    await open(el);
    buttons()[0].click(); await el.updateComplete;
    expect([el.start, el.end]).toEqual([iso(t), iso(t)]);
    // Presets are Tab stops inside the dialog.
    await open(el);
    press(focused(el)!, 'Tab');
    expect(focused(el)).toBe(buttons()[0]);
  });

  it('custom presets, start-name and end-name', async () => {
    const el = await mount<CmDateRangePicker>('<form><cm-date-range-picker name="r" start-name="from" end-name="to" label="Sale"></cm-date-range-picker></form>');
    el.presets = [{ label: 'Diwali sale', start: '2026-11-01', end: '2026-11-08' }, 'yesterday', 'nonsense' as any];
    await open(el);
    expect(all(el, '.preset').map((b) => b.textContent!.trim())).toEqual(['Diwali sale', 'Yesterday']);
    all(el, '.preset')[0].click(); await el.updateComplete;
    const fd = new FormData(el.closest('form')!);
    expect(fd.get('from')).toBe('2026-11-01');
    expect(fd.get('to')).toBe('2026-11-08');
    expect(fd.has('r-start')).toBe(false);
  });

  it('list properties given as strings (as React 19 passes attribute values) still work', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Dates" start="2026-11-10" end="2026-11-12"></cm-date-range-picker>');
    (el as any).presets = 'today last-7-days';
    (el as any).disabledDates = '2026-11-20, 2026-11-21';
    await open(el);
    expect(all(el, '.preset').map((b) => b.textContent!.trim())).toEqual(['Today', 'Last 7 days']);
    expect(shadow(el, 'td[data-date="2026-11-21"]').getAttribute('aria-disabled')).toBe('true');
    expect(shadow(el, 'td[data-date="2026-11-02"]').hasAttribute('aria-disabled')).toBe(false);
  });

  it('typed start and end dates; end before start and required are invalid; reset restores', async () => {
    const el = await mount<CmDateRangePicker>('<form><cm-date-range-picker name="d" label="Dates" locale="en-IN" required start="2026-11-01" end="2026-11-30"></cm-date-range-picker></form>');
    const [s, e] = all(el, 'input') as HTMLInputElement[];
    let changes = 0;
    el.addEventListener('change', () => changes++);
    typeInto(s, '5/11/2026'); await el.updateComplete;
    press(s, 'Enter'); await el.updateComplete;
    expect(el.start).toBe('2026-11-05');
    expect(s.value).toBe('05/11/2026');
    expect(changes).toBe(1);
    typeInto(e, '2026-11-02'); await el.updateComplete;
    e.dispatchEvent(new Event('change')); await el.updateComplete;
    expect(el.end).toBe('2026-11-02');
    expect(el.checkValidity()).toBe(false);
    expect(el.validationMessage).toBe('The end date is before the start date.');
    typeInto(e, 'soon'); await el.updateComplete;
    press(e, 'Enter'); await el.updateComplete;
    expect(el.end).toBe('');
    expect(el.validity.badInput).toBe(true);
    typeInto(e, ''); await el.updateComplete;
    press(e, 'Enter'); await el.updateComplete;
    expect(el.validity.valueMissing).toBe(true);
    el.closest('form')!.reset(); await el.updateComplete;
    expect([el.start, el.end]).toEqual(['2026-11-01', '2026-11-30']);
    expect(e.value).toBe('30/11/2026');
    expect(el.checkValidity()).toBe(true);
  });

  it('min, max and disabled dates apply to the range calendar', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Dates" start="2026-11-10" end="2026-11-12" min="2026-11-05" max="2026-11-20" disabled-dates="2026-11-15"></cm-date-range-picker>');
    await open(el);
    expect(shadow(el, 'td[data-date="2026-11-04"]').getAttribute('aria-disabled')).toBe('true');
    expect(shadow(el, 'td[data-date="2026-11-21"]').getAttribute('aria-disabled')).toBe('true');
    expect(shadow(el, 'td[data-date="2026-11-15"]').getAttribute('aria-disabled')).toBe('true');
    expect(await gridKey(el, 'PageDown')).toBe('2026-11-20');
    el.open = false;
    el.end = '2026-11-25'; await el.updateComplete;
    expect(el.validity.rangeOverflow).toBe(true);
  });

  it('uses the locale for names and the first day of the week', async () => {
    const el = await mount<CmDateRangePicker>('<cm-date-range-picker label="Datum" locale="de-DE" first-day-of-week="1" start="2026-03-02" end="2026-03-04"></cm-date-range-picker>');
    expect((shadow(el, 'input') as HTMLInputElement).placeholder).toBe('dd.mm.yyyy');
    expect((shadow(el, 'input') as HTMLInputElement).value).toBe('02.03.2026');
    await open(el);
    expect(shadow(el, '.cal-title').textContent).toBe('März 2026');
    expect(all(el, 'th')[0].getAttribute('abbr')).toBe('Montag');
  });
});

describe('cm-combobox', () => {
  const markup = `<form><cm-combobox name="customer" label="Customer" placeholder="Search customers">
    <option value="r">Robinson Mid Rao</option>
    <option value="r2">Robinson</option>
    <option value="x" disabled>Archived Rao</option>
    <option value="m">Manjunath</option>
  </cm-combobox></form>`;
  const input = (el: CmCombobox) => shadow(el, 'input') as HTMLInputElement;
  const options = (el: CmCombobox) => all(el, '[role=option]');
  const labels = (el: CmCombobox) => options(el).map((o) => o.textContent!.trim());
  const active = (el: CmCombobox) => {
    const id = input(el).getAttribute('aria-activedescendant');
    return id ? shadow(el, `#${id}`).textContent!.trim() : null;
  };
  const type = async (el: CmCombobox, text: string) => { typeInto(input(el), text); await el.updateComplete; };
  const key = async (el: CmCombobox, k: string, extra: KeyboardEventInit = {}) => { press(input(el), k, extra); await el.updateComplete; };

  it('is an editable combobox with list autocomplete, labelled, controlling a listbox', async () => {
    const el = await mount<CmCombobox>(markup);
    const i = input(el);
    expect(i.getAttribute('role')).toBe('combobox');
    expect(i.getAttribute('aria-autocomplete')).toBe('list');
    expect(i.getAttribute('aria-expanded')).toBe('false');
    expect(shadow(el, 'label').getAttribute('for')).toBe(i.id);
    const list = shadow(el, `#${i.getAttribute('aria-controls')}`);
    expect(list.getAttribute('role')).toBe('listbox');
    expect(shadow(el, `#${list.getAttribute('aria-labelledby')}`).textContent).toBe('Customer');
    expect(i.placeholder).toBe('Search customers');
    expect(options(el).length).toBe(4);
  });

  it('filters as the merchant types and says how many match, or "No results"', async () => {
    const el = await mount<CmCombobox>(markup);
    const searches: string[] = [];
    el.addEventListener('cm-search', (e) => searches.push((e as CustomEvent).detail.query));
    await type(el, 'rao');
    expect(el.open).toBe(true);
    expect(input(el).getAttribute('aria-expanded')).toBe('true');
    expect(labels(el)).toEqual(['Robinson Mid Rao', 'Archived Rao']);
    expect(shadow(el, 'mark').textContent).toBe('Rao');
    expect(shadow(el, '[role=status]').textContent).toBe('2 results');
    expect(input(el).hasAttribute('aria-activedescendant')).toBe(false);
    await type(el, 'zzz');
    expect(options(el).length).toBe(0);
    expect((shadow(el, '[role=listbox]') as HTMLElement).hidden).toBe(true);
    expect(shadow(el, '.message').textContent!.trim()).toBe('No results');
    expect(shadow(el, '[role=status]').textContent).toBe('No results');
    expect(searches).toEqual(['rao', 'zzz']);
    el.filter = 'starts-with';
    await type(el, 'rob');
    expect(labels(el)).toEqual(['Robinson Mid Rao', 'Robinson']);
    await type(el, 'son');
    expect(labels(el)).toEqual([]);
  });

  it('arrow keys move the active option (skipping disabled, wrapping); Enter picks; Escape closes then clears', async () => {
    const el = await mount<CmCombobox>(markup);
    const events: string[] = [];
    el.addEventListener('input', () => events.push('input'));
    el.addEventListener('change', () => events.push('change'));
    await key(el, 'ArrowDown');
    expect(el.open).toBe(true);
    expect(active(el)).toBe('Robinson Mid Rao');
    await key(el, 'ArrowDown');
    await key(el, 'ArrowDown');
    expect(active(el)).toBe('Manjunath');
    await key(el, 'ArrowDown');
    expect(active(el)).toBe('Robinson Mid Rao');
    await key(el, 'ArrowUp');
    expect(active(el)).toBe('Manjunath');
    expect(shadow(el, '.active').getAttribute('aria-selected')).toBe('false');
    await key(el, 'Enter');
    expect(el.value).toBe('m');
    expect(input(el).value).toBe('Manjunath');
    expect(el.open).toBe(false);
    expect(events).toEqual(['input', 'change']);
    await key(el, 'ArrowUp');
    expect(active(el)).toBe('Manjunath');
    expect(shadow(el, '[aria-selected=true]').textContent!.trim()).toBe('Manjunath');
    await key(el, 'Escape');
    expect(el.open).toBe(false);
    expect(el.value).toBe('m');
    await key(el, 'Escape');
    expect(el.value).toBe('');
    expect(input(el).value).toBe('');
    expect(events).toEqual(['input', 'change', 'input', 'change']);
  });

  it('Alt+Down opens without choosing an active option', async () => {
    const el = await mount<CmCombobox>(markup);
    await key(el, 'ArrowDown', { altKey: true });
    expect(el.open).toBe(true);
    expect(active(el)).toBe(null);
  });

  it('picks with the mouse, ignores disabled options and closes on an outside click', async () => {
    const el = await mount<CmCombobox>(markup);
    input(el).click(); await el.updateComplete;
    expect(el.open).toBe(true);
    options(el)[2].click(); await el.updateComplete;
    expect(el.value).toBe('');
    options(el)[1].click(); await el.updateComplete;
    expect(el.value).toBe('r2');
    expect(el.open).toBe(false);
    input(el).click(); await el.updateComplete;
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.open).toBe(false);
  });

  it('leaving the box puts back the chosen label', async () => {
    const el = await mount<CmCombobox>(`<div>${markup.replace(/<\/?form>/g, '')}<button>next</button></div>`);
    const cb = el.querySelector('cm-combobox') as CmCombobox;
    await cb.updateComplete;
    cb.value = 'r'; await cb.updateComplete;
    expect(input(cb).value).toBe('Robinson Mid Rao');
    input(cb).focus();
    await type(cb, 'Man');
    el.querySelector('button')!.focus();
    await tick(); await cb.updateComplete;
    expect(cb.value).toBe('r');
    expect(input(cb).value).toBe('Robinson Mid Rao');
    expect(cb.open).toBe(false);
  });

  it('typing with the real keyboard filters and Enter picks', async () => {
    const el = await mount<CmCombobox>(markup);
    await userEvent.click(input(el));
    await userEvent.keyboard('manj');
    await el.updateComplete;
    expect(labels(el)).toEqual(['Manjunath']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await el.updateComplete;
    expect(el.value).toBe('m');
  });

  it('submits, validates required, honours <option selected> and resets (single)', async () => {
    const el = await mount<CmCombobox>('<form><cm-combobox name="s" label="Status" required><option value="a">Active</option><option value="i" selected>Inactive</option></cm-combobox></form>');
    const form = el.closest('form')!;
    expect(el.value).toBe('i');
    expect(input(el).value).toBe('Inactive');
    expect(new FormData(form).get('s')).toBe('i');
    el.value = ''; await el.updateComplete;
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
    expect(input(el).getAttribute('aria-required')).toBe('true');
    form.reset(); await el.updateComplete;
    expect(el.value).toBe('i');
    expect(el.checkValidity()).toBe(true);
    el.error = 'Choose a status'; await el.updateComplete;
    expect(input(el).getAttribute('aria-invalid')).toBe('true');
    expect(input(el).getAttribute('aria-describedby')).toBe(shadow(el, '.error').id);
  });

  describe('multiple', () => {
    const multi = `<form><cm-combobox name="tags" label="Tags" multiple placeholder="Add tags">
      <option value="cotton">Cotton</option>
      <option value="summer" selected>Summer</option>
      <option value="sale">Sale</option>
      <option value="handmade">Handmade</option>
    </cm-combobox></form>`;
    const tags = (el: CmCombobox) => all(el, 'cm-tag').map((t) => t.textContent!.trim());

    it('shows chosen values as removable tags and keeps the list open while choosing', async () => {
      const el = await mount<CmCombobox>(multi);
      expect(el.values).toEqual(['summer']);
      expect(tags(el)).toEqual(['Summer']);
      expect(shadow(el, '[role=listbox]').getAttribute('aria-multiselectable')).toBe('true');
      let changes = 0;
      el.addEventListener('change', () => changes++);
      await type(el, 'co');
      await key(el, 'ArrowDown');
      await key(el, 'Enter');
      expect(el.values).toEqual(['summer', 'cotton']);
      expect(tags(el)).toEqual(['Summer', 'Cotton']);
      expect(input(el).value).toBe('');
      expect(el.open).toBe(true);
      expect(changes).toBe(1);
      expect(options(el).filter((o) => o.getAttribute('aria-selected') === 'true').map((o) => o.textContent!.trim())).toEqual(['Cotton', 'Summer']);
      // Choosing a chosen option again takes it out.
      options(el)[0].click(); await el.updateComplete;
      expect(el.values).toEqual(['summer']);
    });

    it('Backspace in the empty box removes the last tag; a tag\'s remove button removes it', async () => {
      const el = await mount<CmCombobox>(multi);
      el.values = ['summer', 'sale', 'cotton']; await el.updateComplete;
      await key(el, 'Backspace');
      expect(el.values).toEqual(['summer', 'sale']);
      await type(el, 'x');
      await key(el, 'Backspace'); // there is text: Backspace edits it instead
      expect(el.values).toEqual(['summer', 'sale']);
      const remove = all(el, 'cm-tag')[0].shadowRoot!.querySelector('button') as HTMLButtonElement;
      expect(remove.getAttribute('aria-label')).toBe('Remove Summer');
      remove.click(); await el.updateComplete;
      expect(el.values).toEqual(['sale']);
      expect(focused(el)).toBe(input(el));
    });

    it('submits each value as its own entry, validates required and resets', async () => {
      const el = await mount<CmCombobox>(multi);
      const form = el.closest('form')!;
      el.values = ['summer', 'handmade']; await el.updateComplete;
      expect(new FormData(form).getAll('tags')).toEqual(['summer', 'handmade']);
      el.required = true; el.values = []; await el.updateComplete;
      expect(new FormData(form).getAll('tags')).toEqual([]);
      expect(el.validity.valueMissing).toBe(true);
      form.reset(); await el.updateComplete;
      expect(el.values).toEqual(['summer']);
      expect(el.checkValidity()).toBe(true);
    });
  });

  describe('allow-custom', () => {
    it('offers "Add …" for new text and creates a tag; cm-create can refuse it', async () => {
      const el = await mount<CmCombobox>('<form><cm-combobox name="tags" label="Tags" multiple allow-custom><option>Cotton</option></cm-combobox></form>');
      const created: string[] = [];
      el.addEventListener('cm-create', (e) => created.push((e as CustomEvent).detail.value));
      await type(el, 'Diwali');
      expect(labels(el)).toEqual(['Add “Diwali”']);
      await key(el, 'Enter');
      expect(el.values).toEqual(['Diwali']);
      expect(created).toEqual(['Diwali']);
      expect(all(el, 'cm-tag').map((t) => t.textContent!.trim())).toEqual(['Diwali']);
      expect(new FormData(el.closest('form')!).getAll('tags')).toEqual(['Diwali']);
      // An existing option is matched, not duplicated.
      await type(el, 'cotton');
      expect(labels(el)).toEqual(['Cotton']);
      el.addEventListener('cm-create', (e) => e.preventDefault());
      await type(el, 'Refused');
      await key(el, 'ArrowDown');
      expect(active(el)).toBe('Add “Refused”');
      await key(el, 'Enter');
      expect(el.values).toEqual(['Diwali']);
    });

    it('single mode: the typed text becomes the value', async () => {
      const el = await mount<CmCombobox>('<cm-combobox label="Brand" allow-custom><option>Fabindia</option></cm-combobox>');
      await type(el, 'Anokhi');
      await key(el, 'Enter');
      expect(el.value).toBe('Anokhi');
      expect(input(el).value).toBe('Anokhi');
    });
  });

  describe('async', () => {
    it('fires cm-search, shows a spinner while loading, shows options unfiltered and "No results"', async () => {
      const el = await mount<CmCombobox>('<cm-combobox label="Product" filter="none" empty-text="No products found"></cm-combobox>');
      const queries: string[] = [];
      el.addEventListener('cm-search', (e) => {
        queries.push((e as CustomEvent).detail.query);
        el.loading = true;
      });
      await type(el, 'kur');
      await el.updateComplete;
      expect(queries).toEqual(['kur']);
      expect(el.open).toBe(true);
      expect(shadow(el, 'cm-spinner')).toBeTruthy();
      expect(shadow(el, '[role=status]').textContent).toBe('Loading');
      el.options = [{ value: 'p1', label: 'Cotton kurta' }, { value: 'p2', label: 'Silk dupatta' }];
      el.loading = false; await el.updateComplete;
      expect(shadow(el, 'cm-spinner')).toBeNull();
      expect(labels(el)).toEqual(['Cotton kurta', 'Silk dupatta']); // server-filtered: shown as given
      expect(shadow(el, '[role=status]').textContent).toBe('2 results');
      await key(el, 'ArrowDown');
      await key(el, 'Enter');
      expect(el.value).toBe('p1');
      expect(input(el).value).toBe('Cotton kurta');
      el.options = []; await el.updateComplete;
      await type(el, 'zzz');
      el.loading = false; await el.updateComplete;
      expect(shadow(el, '.message').textContent!.trim()).toBe('No products found');
    });

    it('multiple tags keep their labels when the options change', async () => {
      const el = await mount<CmCombobox>('<cm-combobox label="Products" multiple filter="none"></cm-combobox>');
      el.options = [{ value: 'p1', label: 'Cotton kurta' }]; await el.updateComplete;
      await key(el, 'ArrowDown');
      await key(el, 'Enter');
      el.options = [{ value: 'p9', label: 'Something else' }]; await el.updateComplete;
      expect(all(el, 'cm-tag').map((t) => t.textContent!.trim())).toEqual(['Cotton kurta']);
    });
  });

  it('accepts an options property and an aria-label', async () => {
    const el = await mount<CmCombobox>('<cm-combobox aria-label="Courier"></cm-combobox>');
    el.options = ['Delhivery', { value: 'bd', label: 'Blue Dart', disabled: true }]; await el.updateComplete;
    expect(input(el).getAttribute('aria-label')).toBe('Courier');
    expect(shadow(el, '[role=listbox]').getAttribute('aria-label')).toBe('Courier');
    expect(labels(el)).toEqual(['Delhivery', 'Blue Dart']);
    expect(options(el)[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('disabled blocks typing and follows a disabled fieldset', async () => {
    const el = await mount<CmCombobox>('<form><fieldset><cm-combobox name="c" label="C"><option selected>A</option></cm-combobox></fieldset></form>');
    el.closest('form')!.querySelector('fieldset')!.disabled = true; await el.updateComplete;
    expect(el.disabled).toBe(true);
    expect(input(el).disabled).toBe(true);
    await key(el, 'ArrowDown');
    expect(el.open).toBe(false);
  });
});
