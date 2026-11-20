import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page } from '@vitest/browser/context';
import '../src/index.js';
import { resolvePreset, type CmDateRangePicker } from '../src/index.js';

// 1.18: cm-date-range-picker variant="report" — summary button, presets with their dates, typed start/end boxes in the
// popup, months listed one under another, Cancel/Apply. No real keyboard or pointer: events are dispatched.

const mount = async (markup: string): Promise<CmDateRangePicker> => {
  document.body.innerHTML = markup;
  const first = document.body.firstElementChild!;
  const el = (first.matches('form') ? first.querySelector('cm-date-range-picker') : first) as CmDateRangePicker;
  await el.updateComplete;
  return el;
};
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const all = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(sel)];
const settle = async (el: any) => { await el.updateComplete; await el.updateComplete; };
const press = (target: Element, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true }));
const typeInto = async (el: CmDateRangePicker, input: HTMLInputElement, text: string) => {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(el);
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const plusDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const apply = (el: Element) => all(el, '.act')[1] as HTMLButtonElement;
const cancel = (el: Element) => all(el, '.act')[0] as HTMLButtonElement;

beforeAll(async () => { await page.viewport(1280, 800); });
afterAll(async () => { await page.viewport(414, 896); });
beforeEach(() => { document.body.innerHTML = ''; });

describe('cm-date-range-picker variant="report"', () => {
  it('the field is one button with the preset and the range; no boxes in the field', async () => {
    const el = await mount('<cm-date-range-picker label="Report period" variant="report" locale="en-GB" start="2026-10-23" end="2026-11-19"></cm-date-range-picker>');
    const btn = shadow(el, '.summary');
    expect(all(el, '.box input').length).toBe(0);
    expect(shadow(el, '.chip')?.textContent).toBe('Custom');
    expect(shadow(el, '.range').textContent!.replace(/\s+/g, ' ')).toBe('23 Oct – 19 Nov 2026');
    expect(btn.getAttribute('aria-haspopup')).toBe('dialog');
    expect(btn.getAttribute('aria-label')).toMatch(/^Custom, Change dates for Report period, /);
    el.preset = 'last-28-days'; await settle(el);
    expect(shadow(el, '.chip').textContent).toBe('Last 28 days');
    expect(el.start).toBe(iso(plusDays(today(), -27)));
  });

  it('without a range it says "Choose dates" and has no chip', async () => {
    const el = await mount('<cm-date-range-picker label="Report period" variant="report"></cm-date-range-picker>');
    expect(shadow(el, '.chip')).toBeNull();
    expect(shadow(el, '.range').textContent).toBe('Choose dates');
  });

  it('lists the report presets, Custom first, each with its dates', async () => {
    const el = await mount('<cm-date-range-picker label="Report" variant="report" locale="en-GB"></cm-date-range-picker>');
    el.show(); await settle(el);
    const keys = all(el, '.preset').map((b) => b.dataset.preset);
    expect(keys).toEqual(['custom', 'today', 'yesterday', 'this-week', 'last-7-days', 'last-week', 'last-28-days', 'last-30-days',
      'this-month', 'last-month', 'last-90-days', 'quarter-to-date', 'this-year']);
    const y = plusDays(today(), -1);
    const span = shadow(el, '[data-preset="yesterday"] .p-span').textContent!;
    expect(span).toBe(new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', ...(y.getFullYear() !== today().getFullYear() ? { year: 'numeric' } : {}) }).format(y));
  });

  it('a preset is a draft until Apply; Cancel drops it', async () => {
    const el = await mount('<cm-date-range-picker label="Report" variant="report" start="2026-11-01" end="2026-11-05"></cm-date-range-picker>');
    let changes = 0;
    el.addEventListener('change', () => changes++);
    el.show(); await settle(el);
    shadow(el, '[data-preset="last-7-days"]').click(); await settle(el);
    expect(el.start).toBe('2026-11-01');
    expect(shadow(el, '[data-preset="last-7-days"]').getAttribute('aria-pressed')).toBe('true');
    expect(shadow(el, '.draft').textContent).toContain('7 days');
    cancel(el).click(); await settle(el);
    expect([el.start, el.end, changes, el.open]).toEqual(['2026-11-01', '2026-11-05', 0, false]);
    el.show(); await settle(el);
    shadow(el, '[data-preset="last-7-days"]').click(); await settle(el);
    apply(el).click(); await settle(el);
    expect([el.start, el.end, el.preset, changes]).toEqual([iso(plusDays(today(), -6)), iso(today()), 'last-7-days', 1]);
  });

  it('typed start and end boxes in the popup change the draft; bad text disables Apply', async () => {
    const el = await mount('<cm-date-range-picker label="Report" variant="report" locale="en-GB" start="2026-11-01" end="2026-11-05"></cm-date-range-picker>');
    el.show(); await settle(el);
    const [inS, inE] = all(el, '.r-in input') as HTMLInputElement[];
    expect(inS.value).toBe('01/11/2026');
    expect(inS.closest('label')!.textContent).toContain('Start date');
    await typeInto(el, inE, '20/11/2026');
    expect(shadow(el, '[data-preset="custom"]').getAttribute('aria-pressed')).toBe('true');
    expect(shadow(el, '.draft').textContent!.replace(/\s+/g, ' ')).toContain('20 days');
    await typeInto(el, inS, 'not a date');
    expect(inS.getAttribute('aria-invalid')).toBe('true');
    expect(apply(el).disabled).toBe(true);
    await typeInto(el, inS, '10/11/2026');
    expect(apply(el).disabled).toBe(false);
    apply(el).click(); await settle(el);
    expect([el.start, el.end, el.preset]).toEqual(['2026-11-10', '2026-11-20', '']);
  });

  it('an end typed before the start swaps them', async () => {
    const el = await mount('<cm-date-range-picker label="Report" variant="report" locale="en-GB" start="2026-11-10" end="2026-11-20"></cm-date-range-picker>');
    el.show(); await settle(el);
    const [, inE] = all(el, '.r-in input') as HTMLInputElement[];
    await typeInto(el, inE, '05/11/2026');
    apply(el).click(); await settle(el);
    expect([el.start, el.end]).toEqual(['2026-11-05', '2026-11-10']);
  });

  it('lists months one under another under one weekday row, with one Tab stop', async () => {
    const el = await mount('<cm-date-range-picker label="Report" variant="report" locale="en-GB" start="2026-10-23" end="2026-11-19" max="2026-11-20"></cm-date-range-picker>');
    el.show(); await settle(el);
    const titles = all(el, '.cal-month').map((h) => h.textContent);
    expect(titles.slice(-2)).toEqual(['October 2026', 'November 2026']);
    expect(titles.length).toBeGreaterThan(12);
    expect(all(el, '.r-week span').length).toBe(7);
    expect(all(el, '[role=grid]').every((g) => g.getAttribute('aria-labelledby') && el.shadowRoot!.getElementById(g.getAttribute('aria-labelledby')!))).toBe(true);
    expect(all(el, 'td[tabindex="0"]').map((d) => d.dataset.date)).toEqual(['2026-10-23']);
    expect(all(el, 'td.start').map((d) => d.dataset.date)).toEqual(['2026-10-23']);
    expect(all(el, 'td.end').map((d) => d.dataset.date)).toEqual(['2026-11-19']);
    expect(shadow(el, 'td[data-date="2026-11-21"]').getAttribute('aria-disabled')).toBe('true');
    // The first month of the range is scrolled to the top of the list.
    const list = shadow(el, '.r-months');
    const oct = shadow(el, '[data-month="2026-10"]');
    expect(Math.abs(list.scrollTop - (oct.offsetTop - shadow(el, '.r-week').offsetHeight))).toBeLessThan(2);
    // Arrow keys move across months.
    press(el.shadowRoot!.activeElement!, 'PageDown'); await settle(el);
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-11-20');
  });

  it('picking two days in the list makes a custom draft', async () => {
    const el = await mount('<cm-date-range-picker label="Report" variant="report" max="2026-11-30"></cm-date-range-picker>');
    el.show(); await settle(el);
    shadow(el, 'td[data-date="2026-11-03"]').click(); await settle(el);
    expect(apply(el).disabled).toBe(true);
    shadow(el, 'td[data-date="2026-11-09"]').click(); await settle(el);
    expect(el.open).toBe(true);
    apply(el).click(); await settle(el);
    expect([el.start, el.end, el.preset]).toEqual(['2026-11-03', '2026-11-09', '']);
    expect(shadow(el, '.chip').textContent).toBe('Custom');
  });

  it('required: the message points at the field button', async () => {
    const form = document.createElement('form');
    document.body.append(form);
    form.innerHTML = '<cm-date-range-picker name="r" label="Report" variant="report" required></cm-date-range-picker>';
    const el = form.querySelector('cm-date-range-picker')!;
    await settle(el);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity.valueMissing).toBe(true);
  });

  it('quarter presets', () => {
    const d = new Date(2026, 10, 18);
    const r = (k: any) => { const p = resolvePreset(k, d)!; return [p.start, p.end]; };
    expect(r('quarter-to-date')).toEqual(['2026-10-01', '2026-11-18']);
    expect(r('last-quarter')).toEqual(['2026-07-01', '2026-09-30']);
    expect(resolvePreset('last-quarter', new Date(2026, 1, 3))!.start).toBe('2025-10-01');
  });
});
