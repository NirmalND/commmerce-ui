import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { page, userEvent } from '@vitest/browser/context';
import '../src/index.js';
import type { CmSidePanel, CmPagination, CmSelect, CmStatusTabs, CmActionMenu, CmIcon, CmNotificationPanel, CmOptionGroup, CmDatePicker, CmDateRangePicker, CmCombobox, CmGlobalSearch, CmHeaderBar, CmMetric } from '../src/index.js';

const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const mountRtl = async <T extends HTMLElement>(markup: string, sel: string): Promise<T> => {
  document.body.innerHTML = `<div dir="rtl">${markup}</div>`;
  const el = document.querySelector(sel) as T;
  await (el as any).updateComplete;
  return el;
};
/** Horizontal scale of an element's computed transform: -1 when mirrored. */
const scaleX = (el: Element) => new DOMMatrixReadOnly(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform).a;

beforeEach(async () => {
  document.body.innerHTML = '';
  await page.viewport(1280, 800);
});
afterAll(async () => { await page.viewport(414, 896); });

describe('right-to-left', () => {
  it('side panel opens at the left edge (the end edge) in RTL, the right edge in LTR', async () => {
    const el = await mountRtl<CmSidePanel>('<cm-side-panel heading="Inquiry"><p>Robinson</p></cm-side-panel>', 'cm-side-panel');
    el.open = true; await el.updateComplete; await nextFrame();
    const r = shadow(el, 'dialog').getBoundingClientRect();
    expect(Math.round(r.left)).toBe(0);
    expect(Math.round(r.width)).toBe(450);
    el.open = false; await el.updateComplete;
    document.body.innerHTML = '<cm-side-panel heading="Inquiry"><p>Robinson</p></cm-side-panel>';
    const ltr = document.querySelector('cm-side-panel') as CmSidePanel;
    ltr.open = true; await ltr.updateComplete; await nextFrame();
    const l = shadow(ltr, 'dialog').getBoundingClientRect();
    expect(Math.round(l.right)).toBe(document.documentElement.clientWidth);
    ltr.open = false; await ltr.updateComplete;
  });

  it('notification panel sits under the top-left corner in RTL', async () => {
    const el = await mountRtl<CmNotificationPanel>('<cm-notification-panel></cm-notification-panel>', 'cm-notification-panel');
    el.open = true; await el.updateComplete; await nextFrame();
    const r = shadow(el, 'dialog').getBoundingClientRect();
    expect(Math.round(r.left)).toBe(20);
    el.open = false; await el.updateComplete;
  });

  it('pagination: previous sits on the right, next on the left, and their chevrons are mirrored', async () => {
    const el = await mountRtl<CmPagination>('<cm-pagination total="100" page="2" page-size="20"></cm-pagination>', 'cm-pagination');
    const prev = shadow(el, '.prev'), next = shadow(el, '.next');
    expect(prev.getBoundingClientRect().left).toBeGreaterThan(next.getBoundingClientRect().left);
    const prevIcon = prev.querySelector('cm-icon') as CmIcon, nextIcon = next.querySelector('cm-icon') as CmIcon;
    await prevIcon.updateComplete;
    // chevron-left in the "previous" button points right in RTL: towards the start, where previous pages are.
    expect(scaleX(prevIcon.shadowRoot!.querySelector('svg')!)).toBe(-1);
    expect(scaleX(nextIcon.shadowRoot!.querySelector('svg')!)).toBe(-1);
    // The rows picker's chevron sits at the inline end (left) of its select.
    const sel = el.shadowRoot!.querySelector('select')!.getBoundingClientRect();
    const chev = el.shadowRoot!.querySelector('.field cm-icon')!.getBoundingClientRect();
    expect(chev.left - sel.left).toBeLessThan(20);
  });

  it('only directional icons are mirrored, and mirror="never" opts out', async () => {
    document.body.innerHTML = `<div dir="rtl"><cm-icon name="chevron-right"></cm-icon><cm-icon name="close"></cm-icon><cm-icon name="search"></cm-icon>
      <cm-icon name="arrow-left" mirror="never"></cm-icon></div><cm-icon name="chevron-right"></cm-icon>`;
    const icons = [...document.querySelectorAll('cm-icon')] as CmIcon[];
    await Promise.all(icons.map((i) => i.updateComplete));
    expect(icons.map((i) => scaleX(i.shadowRoot!.querySelector('svg')!))).toEqual([-1, 1, 1, 1, 1]);
  });

  it('icon-only button: the count sits on the top-end corner (top-left in RTL)', async () => {
    const el = await mountRtl<HTMLElement>('<cm-button icon-only icon="bell" label="Notifications" count="3"></cm-button>', 'cm-button');
    const btn = shadow(el, 'button').getBoundingClientRect(), count = shadow(el, '.count').getBoundingClientRect();
    expect(count.left).toBeLessThan(btn.left);
    expect(count.right).toBeLessThan(btn.right);
    expect(count.top).toBeLessThan(btn.top);
  });

  it('log-out points the other way in RTL; refresh and the other 1.1 icons are drawn as is', async () => {
    document.body.innerHTML = `<div dir="rtl"><cm-icon name="log-out"></cm-icon><cm-icon name="refresh"></cm-icon><cm-icon name="mail"></cm-icon><cm-icon name="tasks"></cm-icon></div>`;
    const icons = [...document.querySelectorAll('cm-icon')] as CmIcon[];
    await Promise.all(icons.map((i) => i.updateComplete));
    expect(icons.map((i) => scaleX(i.shadowRoot!.querySelector('svg')!))).toEqual([-1, 1, 1, 1]);
  });

  it('toggle: on moves the thumb to the end, inside the track, in both directions', async () => {
    document.body.innerHTML = '<cm-toggle checked label="Show"></cm-toggle><div dir="rtl"><cm-toggle checked label="Show"></cm-toggle></div>';
    const [ltr, rtl] = [...document.querySelectorAll('cm-toggle')] as any[];
    await ltr.updateComplete; await rtl.updateComplete;
    await new Promise((r) => setTimeout(r, 250)); // the thumb's transition
    for (const [el, end] of [[ltr, 'right'], [rtl, 'left']] as const) {
      const track = shadow(el, '.track').getBoundingClientRect(), thumb = shadow(el, '.thumb').getBoundingClientRect();
      expect(thumb.left).toBeGreaterThanOrEqual(track.left);
      expect(thumb.right).toBeLessThanOrEqual(track.right);
      if (end === 'right') expect(track.right - thumb.right).toBeLessThan(6); else expect(thumb.left - track.left).toBeLessThan(6);
    }
  });

  it('select: the open list lines up with the box on both edges', async () => {
    const el = await mountRtl<CmSelect>('<cm-select label="Status" style="width:300px"><option value="a">Alpha</option><option value="b">Beta</option></cm-select>', 'cm-select');
    shadow(el, '.box').click(); await el.updateComplete;
    const box = shadow(el, '.box').getBoundingClientRect();
    const list = shadow(el, '[role="listbox"]').getBoundingClientRect();
    expect(Math.round(list.right)).toBe(Math.round(box.right));
    expect(Math.round(list.left)).toBe(Math.round(box.left));
    // The chevron is at the inline end: the left side in RTL.
    expect(shadow(el, '.chev').getBoundingClientRect().left - box.left).toBeLessThan(box.width / 2);
  });

  it('action menu aligned to the end lines up with the trigger\'s left edge in RTL', async () => {
    const el = await mountRtl<CmActionMenu>('<div style="padding:0 300px"><cm-action-menu align="end"><cm-menu-item value="a">Archive order</cm-menu-item></cm-action-menu></div>', 'cm-action-menu');
    el.show(); await el.updateComplete;
    const trigger = shadow(el, '.trigger').getBoundingClientRect();
    const menu = shadow(el, '.pop').getBoundingClientRect();
    expect(Math.round(menu.left)).toBe(Math.round(trigger.left));
  });

  it('arrow keys follow the reading direction in status tabs and option groups', async () => {
    const tabs = await mountRtl<CmStatusTabs>('<cm-status-tabs><option value="all">All</option><option value="open">Open</option><option value="done">Done</option></cm-status-tabs>', 'cm-status-tabs');
    (shadow(tabs, '[role="tab"]') as HTMLButtonElement).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(tabs.value).toBe('open'); // left is forward in RTL
    await userEvent.keyboard('{ArrowRight}');
    expect(tabs.value).toBe('all');
    const og = await mountRtl<CmOptionGroup>('<cm-option-group label="Size"><option value="s">S</option><option value="m">M</option></cm-option-group>', 'cm-option-group');
    og.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(og.value).toBe('m');
  });
  it('date picker with time: the time box follows the date box, to its left in RTL', async () => {
    const el = await mountRtl<CmDatePicker>('<cm-date-picker label="تاريخ" locale="en-GB" time value="2026-11-15T15:30" style="width:400px"></cm-date-picker>', 'cm-date-picker');
    const date = shadow(el, '.box:not(.time)').getBoundingClientRect();
    const time = shadow(el, '.box.time').getBoundingClientRect();
    expect(Math.round(time.top)).toBe(Math.round(date.top));
    expect(time.right).toBeLessThanOrEqual(date.left);
    expect(Math.round(date.right)).toBe(Math.round(el.getBoundingClientRect().right));
  });

  it('date picker: Left and Right follow the reading direction in the calendar grid; the popup starts at the right edge', async () => {
    const el = await mountRtl<CmDatePicker>('<cm-date-picker label="تاريخ" locale="en-GB" value="2026-11-15" style="width:320px"></cm-date-picker>', 'cm-date-picker');
    shadow(el, '.trigger').click(); await el.updateComplete; await el.updateComplete;
    const cell = () => el.shadowRoot!.activeElement as HTMLElement;
    expect(cell().dataset.date).toBe('2026-11-15');
    await userEvent.keyboard('{ArrowLeft}');
    await el.updateComplete; await el.updateComplete;
    expect(cell().dataset.date).toBe('2026-11-16'); // left is forward (the next day) in RTL
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await el.updateComplete; await el.updateComplete;
    expect(cell().dataset.date).toBe('2026-11-14');
    // Days run right to left: the 17th is to the left of the 16th.
    const x = (d: string) => shadow(el, `td[data-date="${d}"]`).getBoundingClientRect().left;
    expect(x('2026-11-17')).toBeLessThan(x('2026-11-16'));
    const box = shadow(el, '.box').getBoundingClientRect();
    const pop = shadow(el, '.pop').getBoundingClientRect();
    expect(Math.round(pop.right)).toBe(Math.round(box.right));
    // The calendar button is at the inline end: the left side.
    expect(shadow(el, '.trigger').getBoundingClientRect().left - box.left).toBeLessThan(box.width / 2);
    // "Previous month" chevron is mirrored (points right, towards the start).
    const icon = shadow(el, '.cal-nav').querySelector('cm-icon') as CmIcon;
    await icon.updateComplete;
    expect(scaleX(icon.shadowRoot!.querySelector('svg')!)).toBe(-1);
  });

  it('date range picker: grid arrows follow the reading direction; presets sit on the right', async () => {
    const el = await mountRtl<CmDateRangePicker>('<cm-date-range-picker label="Dates" presets="today" start="2026-11-03" end="2026-11-05"></cm-date-range-picker>', 'cm-date-range-picker');
    shadow(el, '.trigger').click(); await el.updateComplete; await el.updateComplete;
    await userEvent.keyboard('{ArrowLeft}');
    await el.updateComplete; await el.updateComplete;
    expect((el.shadowRoot!.activeElement as HTMLElement).dataset.date).toBe('2026-11-04');
    expect(shadow(el, '.presets').getBoundingClientRect().left).toBeGreaterThan(shadow(el, '.cal').getBoundingClientRect().left);
  });

  it('combobox: the list lines up with the box and tags start at the right', async () => {
    const el = await mountRtl<CmCombobox>('<cm-combobox label="Tags" multiple style="width:300px"><option value="a" selected>Alpha</option><option value="b">Beta</option></cm-combobox>', 'cm-combobox');
    (shadow(el, 'input') as HTMLInputElement).click(); await el.updateComplete;
    const box = shadow(el, '.box').getBoundingClientRect();
    const pop = shadow(el, '.pop').getBoundingClientRect();
    expect(Math.round(pop.left)).toBe(Math.round(box.left));
    expect(Math.round(pop.right)).toBe(Math.round(box.right));
    const tag = shadow(el, 'cm-tag').getBoundingClientRect();
    expect(box.right - tag.right).toBeLessThan(20);
    expect(shadow(el, '.chev').getBoundingClientRect().left - box.left).toBeLessThan(30);
  });

  it('app frame: the side navigation sits on the right and the page to its left; the rail\'s expand chevron is mirrored', async () => {
    const el = await mountRtl<any>(`<cm-app-frame><cm-side-navigation slot="navigation" collapsed collapsible>
      <cm-nav-item label="Orders" icon="bag" href="#o"></cm-nav-item></cm-side-navigation><cm-page>Page</cm-page></cm-app-frame>`, 'cm-app-frame');
    const nav = el.querySelector('cm-side-navigation');
    await nav.updateComplete; await nextFrame();
    // This file loads no tokens, so the frame's space-20 inset is 0 here; the side is what counts.
    expect(Math.round(nav.getBoundingClientRect().right)).toBe(document.documentElement.clientWidth);
    expect(shadow(el, 'main').getBoundingClientRect().right).toBeLessThanOrEqual(nav.getBoundingClientRect().left);
    const icon = shadow(nav, '[part="collapse-button"] cm-icon') as CmIcon;
    await icon.updateComplete;
    expect(scaleX(icon.shadowRoot!.querySelector('svg')!)).toBe(-1);
  });

  it('global search: results line up with the box, the icon sits at the right and the active bar on the right edge', async () => {
    const el = await mountRtl<CmGlobalSearch>('<cm-global-search value="ravi" style="width:360px;--cm-border-strong:#000"></cm-global-search>', 'cm-global-search');
    el.results = [{ label: 'Leads', items: [{ title: 'Ravi Stores', href: '#a', icon: 'user' }] }];
    el.open = true; await el.updateComplete;
    const box = shadow(el, '.box').getBoundingClientRect();
    const pop = shadow(el, '.pop').getBoundingClientRect();
    expect(Math.round(pop.left)).toBe(Math.round(box.left));
    expect(Math.round(pop.right)).toBe(Math.round(box.right));
    expect(box.right - shadow(el, '.icon').getBoundingClientRect().right).toBeLessThan(20);
    const opt = shadow(el, '[role="option"]');
    expect(opt.getBoundingClientRect().right - opt.querySelector('cm-icon')!.getBoundingClientRect().right).toBeLessThan(25);
    (shadow(el, 'input') as HTMLInputElement).focus();
    await userEvent.keyboard('{ArrowDown}'); await el.updateComplete;
    expect(getComputedStyle(opt).boxShadow).toContain('-2px 0px 0px');
  });

  it('header bar: the search sits after the store (to its left) and the layer close button at the left end', async () => {
    const el = await mountRtl<CmHeaderBar>('<cm-header-bar store="preprod.commmerce.com" user-name="Asha"><cm-global-search slot="search"></cm-global-search></cm-header-bar>', 'cm-header-bar');
    await nextFrame(); await nextFrame(); await el.updateComplete;
    const gs = el.querySelector('cm-global-search')!;
    expect(gs.getBoundingClientRect().right).toBeLessThanOrEqual(shadow(el, '.store').getBoundingClientRect().left);
    (el.parentElement as HTMLElement).style.width = '600px';
    await nextFrame(); await nextFrame(); await el.updateComplete;
    el.openSearch(); await el.updateComplete;
    const close = shadow(el, '.layer-close').getBoundingClientRect();
    expect(close.left).toBeLessThan(gs.getBoundingClientRect().left);
    el.closeSearch(); await el.updateComplete;
  });

  it('timeline: icons and the line on the right, text to their left, the time at the left end', async () => {
    const t = await mountRtl<HTMLElement>(`<cm-timeline style="width:600px">
      <cm-timeline-item icon="mail" heading="Email sent" datetime="${new Date(Date.now() - 7200_000).toISOString()}">Body</cm-timeline-item>
      <cm-timeline-item icon="edit" heading="Status changed"></cm-timeline-item></cm-timeline>`, 'cm-timeline');
    const item = t.querySelector('cm-timeline-item') as any;
    await item.updateComplete; await nextFrame();
    const box = t.getBoundingClientRect();
    const icon = shadow(item, '.icon').getBoundingClientRect(), title = shadow(item, '.title').getBoundingClientRect();
    const time = shadow(item, 'time').getBoundingClientRect();
    expect(Math.round(box.right - icon.right)).toBe(0);
    expect(title.right).toBeLessThanOrEqual(icon.left); // no tokens in this file, so the gap is 0 here
    expect(time.left - box.left).toBeLessThan(10);
    const li = t.shadowRoot!.querySelector('li')!;
    const line = getComputedStyle(li, '::before');
    expect(li.getBoundingClientRect().right - parseFloat(line.right) - 1).toBeCloseTo(icon.left + icon.width / 2, 0);
  });

  it('metric: text starts on the right; the up arrow points up-left and the down arrow down-left', async () => {
    const el = await mountRtl<CmMetric>('<cm-metric label="Leads" value="1240" change="+1" trend="up" hint="Today" style="width:300px"></cm-metric>', 'cm-metric');
    await nextFrame();
    const tile = shadow(el, '.tile').getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(shadow(el, '.label'));
    expect(tile.right - range.getBoundingClientRect().right).toBeLessThan(25); // starts at the right padding
    const icon = shadow(el, '.change cm-icon') as CmIcon;
    await icon.updateComplete;
    expect(scaleX(icon.shadowRoot!.querySelector('svg')!)).toBe(-1);
    el.trend = 'down';
    await el.updateComplete;
    const m = new DOMMatrixReadOnly(getComputedStyle(shadow(el, '.change cm-icon')).transform);
    expect(Math.round((Math.atan2(m.b, m.a) * 180) / Math.PI)).toBe(-90); // mirrored, then turned a quarter anticlockwise
  });
});
