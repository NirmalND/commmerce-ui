import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { page, userEvent } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmDataTable, CmPagination, CmResourceList, CmTableHeader, DataTableColumn } from '../src/index.js';

// The 1.6 table standard (commmerce-ui#33): metrics, density, sticky heading, row actions, resizing, the column picker
// and the three phone strategies. Sizes are checked against the custom properties and the standard's fixed heights,
// never against text widths, so they hold whatever font loads.
const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const settle = async (el: { updateComplete: Promise<unknown> }) => { await el.updateComplete; await frame(); await frame(); await el.updateComplete; };
const touch = () => matchMedia('(pointer: coarse)').matches;
const rowMin = (n: number) => (touch() ? Math.max(n, 44) : n);

const COLUMNS: DataTableColumn[] = [
  { key: 'name', label: 'Account', sortable: true },
  { key: 'owner', label: 'Owner' },
  { key: 'city', label: 'City', priority: 'low' },
  { key: 'renewal', label: 'Renewal', type: 'date' },
  { key: 'value', label: 'Value', type: 'money', sortable: true },
  { key: 'actions', label: 'Actions', type: 'actions', actions: [{ label: 'Open', value: 'open' }, { label: 'Snooze', value: 'snooze' }] },
];
const ROWS = [
  { name: 'Ravi Stores', owner: 'Asha Rao', city: 'Bengaluru', renewal: '2026-12-01', value: 'Rs. 48,000' },
  { name: 'Blue Pottery House, Jaipur and Udaipur showrooms', owner: 'Meera Iyer', city: 'Jaipur', renewal: '2026-12-09', value: 'Rs. 1,20,000' },
  { name: 'Delhi Spice Co.', owner: 'Rahul Kumar', city: 'Delhi', renewal: '2027-01-15', value: 'Rs. 9,500' },
];

async function table(attrs = '', props: Partial<CmDataTable> = {}, wrap?: (html: string) => string) {
  const markup = `<cm-data-table caption="Renewals" ${attrs}></cm-data-table>`;
  document.body.innerHTML = wrap ? wrap(markup) : markup;
  const el = document.querySelector('cm-data-table') as CmDataTable;
  Object.assign(el, { columns: COLUMNS, rows: ROWS }, props);
  await settle(el);
  return el;
}
const $ = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const $$ = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll(sel)] as HTMLElement[];
const h = (e: Element) => e.getBoundingClientRect().height;
const w = (e: Element) => e.getBoundingClientRect().width;
const fadeIn = () => new Promise((r) => setTimeout(r, 300));
const shown = (e: Element | null) => !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0;

beforeAll(async () => {
  // tokens.css must be applied before anything is measured (see layout-extra.test.ts).
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-12') && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
});
beforeEach(async () => {
  document.body.innerHTML = '';
  document.body.removeAttribute('data-cm-density');
  window.scrollTo(0, 0);
  await page.viewport(1280, 800);
});
afterAll(async () => { await page.viewport(414, 896); });

describe('table standard: heading row, rows and cells', () => {
  it('a 40px heading row in 12px semibold; 48px rows with 13px text, cells padded 12px across and 10px down', async () => {
    const el = await table();
    const th = $(el, 'thead th');
    expect(h(th)).toBeCloseTo(40, 0);
    const ths = getComputedStyle(th);
    expect(ths.fontSize).toBe('12px');
    expect(ths.fontWeight).toBe('600');
    for (const row of $$(el, 'tbody tr')) expect(h(row)).toBeCloseTo(rowMin(48), 0);
    const td = getComputedStyle($(el, 'tbody td'));
    expect(td.fontSize).toBe('13px');
    expect([td.paddingInlineStart, td.paddingInlineEnd, td.paddingTop, td.paddingBottom]).toEqual(['12px', '12px', '10px', '10px']);
  });

  it('numbers, money and actions are right-aligned; numbers and dates never wrap; text ends in an ellipsis', async () => {
    const el = await table('', { columns: COLUMNS.map((c) => (c.key === 'name' ? { ...c, width: 120 } : c)) });
    const cells = $$(el, 'tbody tr:first-child > *');
    const [name, , , renewal, value, actions] = cells.map((c) => getComputedStyle(c));
    expect([value.textAlign, actions.textAlign]).toEqual(['end', 'end']);
    expect(name.textAlign).toBe('start');
    expect([renewal.whiteSpace, value.whiteSpace]).toEqual(['nowrap', 'nowrap']);
    const text = $$(el, 'tbody tr:nth-child(2) > th .t')[0];
    const t = getComputedStyle(text);
    expect([t.textOverflow, t.whiteSpace, t.overflow]).toEqual(['ellipsis', 'nowrap', 'hidden']);
    expect(text.scrollWidth).toBeGreaterThan(text.clientWidth);
    // Width given: the column is that wide; the full value shows on hover and stays in the text for screen readers.
    expect(w(cells[0])).toBeCloseTo(120, 0);
    text.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
    expect(text.title).toBe(ROWS[1].name);
    expect(text.textContent).toBe(ROWS[1].name);
    // A value that fits gets no title.
    const short = $$(el, 'tbody tr:first-child > th .t')[0];
    short.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
    expect(short.hasAttribute('title')).toBe(false);
  });

  it('the actions heading is for screen readers only', async () => {
    const el = await table();
    const last = $$(el, 'thead th').at(-1)!;
    expect(last.textContent!.trim()).toBe('Actions');
    expect(w(last.querySelector('.sr')!)).toBeLessThanOrEqual(1);
  });

  it('server-rendered tables follow the same standard', async () => {
    document.body.innerHTML = `<cm-data-table><table><caption>Stock</caption>
      <thead><tr><th>Location</th><th data-type="date">Counted</th><th data-type="numeric">On hand</th></tr></thead>
      <tbody><tr><td>Bengaluru</td><td data-type="date">1 Nov 2026</td><td data-type="numeric">24</td></tr></tbody></table></cm-data-table>`;
    const el = document.querySelector('cm-data-table') as CmDataTable;
    await settle(el);
    const th = el.querySelector('th')!;
    expect(h(th)).toBeCloseTo(40, 0);
    expect(getComputedStyle(th).fontWeight).toBe('600');
    expect(h(el.querySelector('tbody tr')!)).toBeCloseTo(rowMin(48), 0);
    const td = el.querySelectorAll('tbody td');
    expect(getComputedStyle(td[0]).fontSize).toBe('13px');
    expect(getComputedStyle(td[1]).whiteSpace).toBe('nowrap');
    expect(getComputedStyle(td[2]).textAlign).toBe('end');
    expect(td[2].getAttribute('data-label')).toBe('On hand');
  });
});

describe('density', () => {
  it('density="compact" gives 40px rows; the heading row stays 40px', async () => {
    const el = await table('density="compact"');
    expect(h($(el, 'tbody tr'))).toBeCloseTo(rowMin(40), 0);
    expect(h($(el, 'thead th'))).toBeCloseTo(40, 0);
    expect(getComputedStyle(el).getPropertyValue('--cm-table-row-height').trim()).toBe('40px');
  });

  it('inherits data-cm-density from any ancestor, and a table\'s own density overrides it', async () => {
    document.body.innerHTML = `<section data-cm-density="compact"><div>
      <cm-data-table caption="A"></cm-data-table><cm-data-table caption="B" density="comfortable"></cm-data-table>
      <cm-resource-list resource-name="lead"><cm-resource-item value="a">Asha Rao</cm-resource-item></cm-resource-list>
      <cm-resource-list resource-name="lead" density="comfortable"><cm-resource-item value="b">Ben Cole</cm-resource-item></cm-resource-list>
    </div></section>`;
    const [a, b] = [...document.querySelectorAll('cm-data-table')] as CmDataTable[];
    for (const t of [a, b]) { Object.assign(t, { columns: COLUMNS, rows: ROWS }); await settle(t); }
    expect(h($(a, 'tbody tr'))).toBeCloseTo(rowMin(40), 0);
    expect(h($(b, 'tbody tr'))).toBeCloseTo(rowMin(48), 0);
    const [l1, l2] = [...document.querySelectorAll('cm-resource-list')] as CmResourceList[];
    await l1.updateComplete; await l2.updateComplete;
    const row = (l: CmResourceList) => l.items[0].shadowRoot!.querySelector('.row')!;
    await l1.items[0].updateComplete; await l2.items[0].updateComplete;
    expect(h(row(l1))).toBeCloseTo(rowMin(40), 0);
    expect(h(row(l2))).toBeCloseTo(rowMin(56), 0);
    // Switching the ancestor switches the whole screen back.
    document.querySelector('section')!.removeAttribute('data-cm-density');
    await frame();
    expect(h($(a, 'tbody tr'))).toBeCloseTo(rowMin(48), 0);
    expect(h(row(l1))).toBeCloseTo(rowMin(56), 0);
  });

  it('resource list rows: comfortable 56px with 40px thumbnails, compact 40px with 32px thumbnails', async () => {
    document.body.innerHTML = `<cm-resource-list resource-name="product"><cm-resource-item value="a"><cm-thumbnail slot="media" alt=""></cm-thumbnail>Mug</cm-resource-item></cm-resource-list>`;
    const list = document.querySelector('cm-resource-list') as CmResourceList;
    await list.updateComplete; await list.items[0].updateComplete;
    const row = list.items[0].shadowRoot!.querySelector('.row')!;
    const thumb = list.querySelector('cm-thumbnail')!;
    expect(h(row)).toBeCloseTo(rowMin(56), 0);
    expect(h(thumb)).toBeCloseTo(40, 0);
    list.density = 'compact';
    await list.updateComplete; await frame();
    expect(h(row)).toBeCloseTo(rowMin(40), 0);
    expect(h(thumb)).toBeCloseTo(32, 0);
  });

  it('touch screens keep rows at least 44px tall at either density', () => {
    // A coarse pointer can't be switched on in this browser; the rule itself is checked instead.
    const tableCss = (customElements.get('cm-data-table') as unknown as { elementStyles: unknown[] }).elementStyles
      .map((s) => (s as unknown as { cssText: string }).cssText).join('\n');
    expect(tableCss).toMatch(/@media \(pointer: coarse\)[^@]*max\(var\(--cm-table-row-height, 48px\), var\(--cm-control-height-touch, 44px\)\)/);
    const itemCss = (customElements.get('cm-resource-item') as unknown as { elementStyles: unknown[] }).elementStyles
      .map((s) => (s as unknown as { cssText: string }).cssText).join('\n');
    expect(itemCss).toMatch(/@media \(pointer: coarse\)[^@]*max\(var\(--cm-resource-row-height, 56px\), var\(--cm-control-height-touch, 44px\)\)/);
  });

  it('a table header in a resource list is as tall as the list\'s toolbar (40px)', async () => {
    document.body.innerHTML = `<cm-resource-list selectable resource-name="lead" style="--cm-table-columns: 1fr 1fr">
      <cm-table-header slot="header"><option>Name</option><option>Owner</option></cm-table-header>
      <cm-resource-item value="a" columns><span>Asha</span><span>Rahul</span></cm-resource-item></cm-resource-list>`;
    const list = document.querySelector('cm-resource-list') as CmResourceList;
    const head = document.querySelector('cm-table-header') as CmTableHeader;
    await list.updateComplete; await head.updateComplete; await frame();
    expect(h(head.shadowRoot!.querySelector('.bar')!)).toBeCloseTo(40, 0);
    expect(h(list.shadowRoot!.querySelector('.toolbar')!)).toBeCloseTo(40, 0);
    expect(getComputedStyle(head.shadowRoot!.querySelector('.bar')!).fontWeight).toBe('600');
  });
});

describe('sticky heading row', () => {
  const tall = { rows: Array.from({ length: 30 }, (_, i) => ({ ...ROWS[i % 3], name: `Account ${i + 1}` })) };

  it('sticks to the top of a scrolling box', async () => {
    const el = await table('sticky-header', tall, (m) => `<div id="box" style="height:400px;overflow:auto">${m}</div>`);
    const box = document.getElementById('box')!;
    box.scrollTop = 600;
    await frame(); await frame();
    expect(Math.abs($(el, 'thead th').getBoundingClientRect().top - box.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
  });

  it('sticks to the top of the page, and under --cm-data-table-sticky-top', async () => {
    const el = await table('sticky-header', tall, (m) => `<div style="padding-block:200px 2000px">${m}</div>`);
    window.scrollTo(0, 700);
    await frame(); await frame();
    expect(Math.abs($(el, 'thead th').getBoundingClientRect().top)).toBeLessThanOrEqual(1);
    el.style.setProperty('--cm-data-table-sticky-top', '56px');
    await frame(); await frame();
    expect(Math.abs($(el, 'thead th').getBoundingClientRect().top - 56)).toBeLessThanOrEqual(1);
    window.scrollTo(0, 0);
  });

  it('still sticks when the table also scrolls sideways', async () => {
    const el = await table('sticky-header', tall, (m) => `<div id="box" style="height:400px;width:360px;overflow:auto">${m}</div>`);
    const box = document.getElementById('box')!;
    expect($(el, '.scroll').scrollWidth).toBeGreaterThan($(el, '.scroll').clientWidth);
    box.scrollTop = 500;
    box.dispatchEvent(new Event('scroll'));
    await frame(); await frame(); await frame();
    expect(Math.abs($(el, 'thead th').getBoundingClientRect().top - box.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
    // Never past the end of the table.
    box.scrollTop = 100000;
    box.dispatchEvent(new Event('scroll'));
    await frame(); await frame(); await frame();
    expect($(el, 'thead th').getBoundingClientRect().bottom).toBeLessThanOrEqual($(el, 'table').getBoundingClientRect().bottom + 1);
  });

  it('inside its own max height (--cm-data-table-max-height)', async () => {
    const el = await table('sticky-header', tall);
    el.style.setProperty('--cm-data-table-max-height', '300px');
    await settle(el);
    const scroll = $(el, '.scroll');
    scroll.scrollTop = 400;
    await frame();
    expect(Math.abs($(el, 'thead th').getBoundingClientRect().top - scroll.getBoundingClientRect().top)).toBeLessThanOrEqual(1);
  });

  it('sticky-first-column keeps the row names in view while scrolling sideways', async () => {
    const el = await table('sticky-first-column', {}, (m) => `<div style="width:360px">${m}</div>`);
    const scroll = $(el, '.scroll');
    const first = $(el, 'tbody th');
    const x = first.getBoundingClientRect().left;
    scroll.scrollLeft = 200;
    await frame();
    expect(first.getBoundingClientRect().left).toBeCloseTo(x, 0);
  });
});

describe('row actions', () => {
  it('appear on hover and focus, stay in the accessibility tree, and fire cm-row-action', async () => {
    const el = await table();
    const acts = $$(el, 'tbody .acts');
    expect(acts).toHaveLength(3);
    const opacity = (e: Element) => Number(getComputedStyle(e).opacity);
    if (!matchMedia('(hover: none), (pointer: coarse)').matches) expect(opacity(acts[0])).toBe(0);
    // Hidden by opacity only: in the tab order and named for screen readers.
    const button = acts[0].querySelector('cm-button')!;
    expect(getComputedStyle(acts[0]).visibility).toBe('visible');
    expect(acts[0].closest('[aria-hidden="true"]')).toBeNull();
    expect(button.textContent).toBe('Open, Ravi Stores');
    // The pointer over the middle of the table: that row shows its actions, the others don't.
    await userEvent.hover(el);
    await new Promise((r) => setTimeout(r, 250));
    const hovered = $$(el, 'tbody tr').findIndex((r) => r.matches(':hover'));
    expect(hovered).toBeGreaterThanOrEqual(0);
    expect(opacity(acts[hovered])).toBe(1);
    if (!matchMedia('(hover: none), (pointer: coarse)').matches) expect(acts.filter((a, i) => i !== hovered).map(opacity)).toEqual([0, 0]);
    await userEvent.unhover(el);
    (acts[1].querySelector('cm-button')!.shadowRoot!.querySelector('button') as HTMLElement).focus();
    await new Promise((r) => setTimeout(r, 250));
    expect(opacity(acts[1])).toBe(1);
    const seen: unknown[] = [];
    el.addEventListener('cm-row-action', (e) => seen.push((e as CustomEvent).detail));
    (acts[2].querySelectorAll('cm-button')[1] as HTMLElement).click();
    expect(seen).toEqual([{ action: 'snooze', row: ROWS[2], index: 2 }]);
  });

  it('row-actions="always" shows them all the time; touch screens always show them', async () => {
    const el = await table('row-actions="always"');
    expect(Number(getComputedStyle($(el, 'tbody .acts')).opacity)).toBe(1);
    const css = (customElements.get('cm-data-table') as unknown as { elementStyles: unknown[] }).elementStyles
      .map((s) => (s as unknown as { cssText: string }).cssText).join('\n');
    expect(css).toMatch(/@media \(hover: none\), \(pointer: coarse\)[^@]*\.acts \{ opacity: 1; \}/);
  });

  it('a row can list its own actions; icon-only actions are named with the row', async () => {
    const el = await table('', {
      columns: [{ key: 'name', label: 'Account' }, { key: 'actions', label: 'Actions', type: 'actions', actions: [{ label: 'Edit', icon: 'edit', iconOnly: true }] }],
      rows: [{ name: 'Ravi Stores' }, { name: 'Delhi Spice Co.', actions: [{ label: 'Restore', value: 'restore' }] }],
    });
    const [first, second] = $$(el, 'tbody .acts');
    expect(first.querySelector('cm-button')!.getAttribute('label')).toBe('Edit, Ravi Stores');
    expect(second.querySelector('cm-button')!.textContent).toBe('Restore, Delhi Spice Co.');
  });
});

describe('column resizing', () => {
  it('arrow keys change the width by 16px, announce it and fire cm-column-resize', async () => {
    const el = await table('resizable');
    const handle = $$(el, '.rz')[1];
    expect(handle.getAttribute('role')).toBe('separator');
    expect(handle.getAttribute('aria-label')).toBe('Resize Owner column');
    const th = handle.closest('th')!;
    const before = Math.round(w(th));
    const seen: Array<{ key: string; width: number }> = [];
    el.addEventListener('cm-column-resize', (e) => seen.push((e as CustomEvent).detail));
    handle.focus();
    await userEvent.keyboard('{ArrowRight}');
    await settle(el);
    expect(seen).toEqual([{ key: 'owner', width: before + 16 }]);
    expect(w(th)).toBeCloseTo(before + 16, 0);
    expect(handle.getAttribute('aria-valuenow')).toBe(String(before + 16));
    expect($(el, '[role="status"]').textContent!.trim()).toBe(`Owner column, ${before + 16} pixels wide`);
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await settle(el);
    expect(seen.at(-1)).toEqual({ key: 'owner', width: before - 16 });
    expect(w(th)).toBeCloseTo(before - 16, 0);
  });

  it('dragging the handle resizes the column (mirrored in right-to-left)', async () => {
    for (const rtl of [false, true]) {
      const el = await table('resizable', {}, (m) => `<div ${rtl ? 'dir="rtl"' : ''}>${m}</div>`);
      const handle = $$(el, '.rz')[1];
      const th = handle.closest('th')!;
      const before = w(th);
      const r = handle.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const seen: unknown[] = [];
      el.addEventListener('cm-column-resize', (e) => seen.push((e as CustomEvent).detail));
      const fire = (type: string, cx: number) => handle.dispatchEvent(new PointerEvent(type, { clientX: cx, clientY: y, button: 0, pointerId: 1, bubbles: true, composed: true }));
      fire('pointerdown', x);
      fire('pointermove', x + (rtl ? -60 : 60));
      fire('pointerup', x + (rtl ? -60 : 60));
      await settle(el);
      expect(w(th), rtl ? 'RTL' : 'LTR').toBeCloseTo(before + 60, 0);
      expect(seen).toEqual([{ key: 'owner', width: Math.round(before + 60) }]);
    }
  });

  it('never narrower than 48px', async () => {
    const el = await table('resizable', { columns: COLUMNS.map((c) => (c.key === 'owner' ? { ...c, width: 56 } : c)) });
    const handle = $$(el, '.rz')[1];
    handle.focus();
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await settle(el);
    expect(w(handle.closest('th')!)).toBeCloseTo(48, 0);
  });

  it('right-to-left: the arrow pointing away from the column\'s start widens it', async () => {
    const el = await table('resizable', {}, (m) => `<div dir="rtl">${m}</div>`);
    const handle = $$(el, '.rz')[1];
    const before = Math.round(w(handle.closest('th')!));
    handle.focus();
    await userEvent.keyboard('{ArrowLeft}');
    await settle(el);
    expect(w(handle.closest('th')!)).toBeCloseTo(before + 16, 0);
  });
});

describe('column picker', () => {
  it('lists every column, hides and shows them, and fires cm-columns-change', async () => {
    const el = await table('column-picker', { columns: COLUMNS.map((c) => (c.key === 'city' ? { ...c, visible: false } : c)) });
    expect($$(el, 'thead th').map((t) => t.textContent!.trim())).not.toContain('City');
    const button = $(el, '.pick');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(shown($(el, '.panel'))).toBe(false);
    button.click();
    await settle(el);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(shown($(el, '.panel'))).toBe(true);
    const boxes = $$(el, '.panel input') as HTMLInputElement[];
    expect(boxes.map((b) => b.checked)).toEqual([true, true, false, true, true, true]);
    expect(boxes[0].disabled).toBe(true); // the primary column names the rows
    const seen: Array<{ key: string; visible: boolean; columns: DataTableColumn[] }> = [];
    el.addEventListener('cm-columns-change', (e) => seen.push((e as CustomEvent).detail));
    boxes[2].click();
    await settle(el);
    expect(seen[0].key).toBe('city');
    expect(seen[0].visible).toBe(true);
    expect(seen[0].columns.find((c) => c.key === 'city')!.visible).toBe(true);
    expect($$(el, 'thead th').map((t) => t.textContent!.trim())).toContain('City');
    boxes[1].click();
    await settle(el);
    expect($$(el, 'thead th').map((t) => t.textContent!.trim())).not.toContain('Owner');
    expect($$(el, 'tbody tr:first-child > *')).toHaveLength(5);
    // Escape closes it and returns focus to the button.
    boxes[1].focus();
    await userEvent.keyboard('{Escape}');
    await settle(el);
    expect(shown($(el, '.panel'))).toBe(false);
    expect(el.shadowRoot!.activeElement).toBe(button);
  });

  it('a click outside closes it', async () => {
    const el = await table('column-picker');
    $(el, '.pick').click();
    await settle(el);
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await settle(el);
    expect(shown($(el, '.panel'))).toBe(false);
  });
});

describe('phone strategies, by the table\'s own width (640px)', () => {
  const at = (width: number) => (m: string) => `<div style="width:${width}px">${m}</div>`;

  it('cards: each row becomes a card at 390px; a table at 1200px', async () => {
    const narrow = await table('mobile="cards"', { totals: { name: 'Total', value: 'Rs. 1,77,500' } }, at(390));
    expect(shown($(narrow, '.wrap'))).toBe(false);
    expect(shown($(narrow, '.cards'))).toBe(true);
    const cards = $$(narrow, '.card');
    expect(cards).toHaveLength(4);
    expect(cards[0].querySelector('.card-title')!.textContent).toBe('Ravi Stores');
    const pairs = [...cards[0].querySelectorAll('dt')].map((d) => `${d.textContent}: ${d.nextElementSibling!.textContent}`);
    expect(pairs).toEqual(['Owner: Asha Rao', 'City: Bengaluru', 'Renewal: 2026-12-01', 'Value: Rs. 48,000']);
    expect(cards[0].lastElementChild!.classList.contains('card-actions')).toBe(true);
    expect(cards[0].querySelectorAll('cm-button')).toHaveLength(2);
    expect(Number(getComputedStyle(cards[0].querySelector('.acts')!).opacity)).toBe(1);
    expect(cards[3].querySelector('.card-actions')).toBeNull();
    expect($(narrow, '.cards').getAttribute('aria-label')).toBe('Renewals');
    // Wider than the window allows: no sideways scroll.
    expect(narrow.getBoundingClientRect().width).toBeLessThanOrEqual(390);

    const wide = await table('mobile="cards"', {}, at(1200));
    expect(shown($(wide, '.wrap'))).toBe(true);
    expect(shown($(wide, '.cards'))).toBe(false);
  });

  it('scroll: keeps every column and says it scrolls (faded edge and "Scroll for more") at 390px', async () => {
    const narrow = await table('mobile="scroll"', {}, at(390));
    const scroll = $(narrow, '.scroll');
    expect(scroll.scrollWidth).toBeGreaterThan(scroll.clientWidth);
    expect(scroll.getAttribute('role')).toBe('region');
    expect(scroll.getAttribute('tabindex')).toBe('0');
    expect(shown($(narrow, '.hint'))).toBe(true);
    expect($(narrow, '.hint').textContent!.trim()).toBe('Scroll for more');
    await fadeIn();
    expect(Number(getComputedStyle($(narrow, '.fade.e')).opacity)).toBe(1);
    expect(Number(getComputedStyle($(narrow, '.fade.s')).opacity)).toBe(0);
    scroll.scrollLeft = scroll.scrollWidth;
    scroll.dispatchEvent(new Event('scroll'));
    await settle(narrow); await fadeIn();
    expect(shown($(narrow, '.hint'))).toBe(false);
    expect(Number(getComputedStyle($(narrow, '.fade.s')).opacity)).toBe(1);

    const wide = await table('mobile="scroll"', {}, at(1200));
    expect(shown($(wide, '.hint'))).toBe(false);
    expect(Number(getComputedStyle($(wide, '.fade.e')).opacity)).toBe(0);
    expect($(wide, '.scroll').hasAttribute('role')).toBe(false);
  });

  it('scroll is the default', async () => {
    const el = await table('', {}, at(390));
    expect(el.mobile).toBe('scroll');
    expect(shown($(el, '.hint'))).toBe(true);
  });

  it('priority: low-priority columns hide at 390px, and "View all fields" shows them for one row', async () => {
    const narrow = await table('mobile="priority"', {}, at(390));
    const heads = () => $$(narrow, 'thead th').filter(shown).map((t) => t.textContent!.trim());
    expect(heads()).not.toContain('City');
    expect(heads()).toContain('Owner');
    const more = $$(narrow, '.more-btn');
    expect(more).toHaveLength(3);
    expect(shown(more[0])).toBe(true);
    expect(more[0].textContent).toBe('View all fields');
    more[0].click();
    await settle(narrow);
    expect(more[0].getAttribute('aria-expanded')).toBe('true');
    const details = $(narrow, 'tr.more');
    expect(shown(details)).toBe(true);
    expect(details.id).toBe(more[0].getAttribute('aria-controls'));
    expect([...details.querySelectorAll('dt')].map((d) => `${d.textContent}: ${d.nextElementSibling!.textContent}`)).toEqual(['City: Bengaluru']);
    expect(more[0].textContent).toBe('Hide fields');

    const wide = await table('mobile="priority"', {}, at(1200));
    expect($$(wide, 'thead th').filter(shown).map((t) => t.textContent!.trim())).toContain('City');
    expect(shown($(wide, '.more-btn'))).toBe(false);
  });

  it('server-rendered tables: cards and priority by CSS', async () => {
    const light = (mode: string, width: number) => `<div style="width:${width}px"><cm-data-table mobile="${mode}"><table><caption>Tasks</caption>
      <thead><tr><th>Task</th><th>Owner</th><th data-priority="low">Notes</th><th data-type="date">Due</th></tr></thead>
      <tbody><tr><td>Call Ravi Stores</td><td>Asha</td><td>About renewal</td><td data-type="date">2 Dec</td></tr></tbody></table></cm-data-table></div>`;
    document.body.innerHTML = light('cards', 390);
    let el = document.querySelector('cm-data-table') as CmDataTable;
    await settle(el);
    expect(getComputedStyle(el.querySelector('tbody tr')!).display).toBe('block');
    // Firefox reports the rule unresolved (attr(data-label)); the label itself is what counts.
    expect(el.querySelector('tbody td:nth-child(2)')!.getAttribute('data-label')).toBe('Owner');
    expect(getComputedStyle(el.querySelector('tbody td:nth-child(2)')!, '::before').content).toMatch(/^("Owner"|attr\(data-label\))$/);
    document.body.innerHTML = light('priority', 390);
    el = document.querySelector('cm-data-table') as CmDataTable;
    await settle(el);
    expect(getComputedStyle(el.querySelector('tbody td:nth-child(3)')!).display).toBe('none');
    document.body.innerHTML = light('priority', 1200);
    el = document.querySelector('cm-data-table') as CmDataTable;
    await settle(el);
    expect(getComputedStyle(el.querySelector('tbody td:nth-child(3)')!).display).not.toBe('none');
  });
});

describe('right-to-left', () => {
  it('numbers and actions sit at the end (left), the scroll fade and hint follow the direction', async () => {
    const el = await table('', {}, (m) => `<div dir="rtl" style="width:1200px">${m}</div>`);
    const cells = $$(el, 'tbody tr:first-child > *');
    expect(cells[0].getBoundingClientRect().left).toBeGreaterThan(cells[5].getBoundingClientRect().left);
    expect(getComputedStyle(cells[4]).textAlign).toBe('end');
    const narrow = await table('', {}, (m) => `<div dir="rtl" style="width:390px">${m}</div>`);
    const fade = $(narrow, '.fade.e');
    const box = $(narrow, '.wrap').getBoundingClientRect();
    await fadeIn();
    expect(Number(getComputedStyle(fade).opacity)).toBe(1);
    expect(fade.getBoundingClientRect().left).toBeCloseTo(box.left, 0); // the end edge is on the left
  });
});

describe('pagination', () => {
  it('13px tabular text and compact 32px controls (36px on phones, 44px on touch screens)', async () => {
    document.body.innerHTML = '<cm-pagination total="290" page="2"></cm-pagination>';
    const el = document.querySelector('cm-pagination') as CmPagination;
    await el.updateComplete;
    const nav = el.shadowRoot!.querySelector('nav')!;
    expect(getComputedStyle(nav).fontSize).toBe('13px');
    expect(getComputedStyle(nav).fontVariantNumeric).toContain('tabular-nums');
    const controls = [...el.shadowRoot!.querySelectorAll('select, input, button')];
    for (const c of controls) expect(h(c)).toBe(touch() ? 44 : 32);
    await page.viewport(390, 800);
    await frame();
    for (const c of el.shadowRoot!.querySelectorAll('input, button')) expect(h(c)).toBe(touch() ? 44 : 36);
  });
});

describe('cm-data-table lines (1.7, CRM At risk feedback)', () => {
  it('a column with lines wraps text onto up to N lines, then clamps; without it text stays on one line', async () => {
    document.body.innerHTML = '<div style="width:900px"><cm-data-table caption="At risk"></cm-data-table></div>';
    const el = document.querySelector('cm-data-table') as any;
    const long = 'Store set up, no product yet. Store suspended or made inactive. Plan expired, not renewed since 6 days ago.';
    el.columns = [{ key: 'name', label: 'Customer' }, { key: 'signals', label: 'Signals', lines: 2, width: 240 }, { key: 'note', label: 'Note', width: 240 }];
    el.rows = [{ name: 'Ravi Stores', signals: long, note: long }];
    await el.updateComplete;
    const [sig, note] = [...el.shadowRoot.querySelectorAll('tbody td .t')] as HTMLElement[];
    const lh = parseFloat(getComputedStyle(sig).lineHeight);
    expect(sig.clientHeight).toBeGreaterThan(lh * 1.5);
    expect(sig.clientHeight).toBeLessThanOrEqual(lh * 2 + 1);
    expect(sig.scrollHeight).toBeGreaterThan(sig.clientHeight);
    expect(note.clientHeight).toBeLessThanOrEqual(lh + 1);
    expect(sig.textContent).toBe(long);
  });

  it('server-rendered: a [data-lines] element inside a cell clamps, and the cell stays a table cell', async () => {
    document.body.innerHTML = `<div style="width:900px"><cm-data-table><table><thead><tr><th>Customer</th><th>Signals</th></tr></thead>
      <tbody><tr><td>Ravi Stores</td><td style="width:240px"><div data-lines="3">${'Plan expired, not renewed. '.repeat(10)}</div></td></tr></tbody></table></cm-data-table></div>`;
    const el = document.querySelector('cm-data-table') as any; await el.updateComplete;
    const td = el.querySelector('tbody td:nth-child(2)') as HTMLElement, div = td.firstElementChild as HTMLElement;
    expect(getComputedStyle(td).display).toBe('table-cell');
    const lh = parseFloat(getComputedStyle(div).lineHeight);
    expect(div.clientHeight).toBeLessThanOrEqual(lh * 3 + 1);
    expect(div.scrollHeight).toBeGreaterThan(div.clientHeight);
  });
});

describe('cm-data-table data-lines per list item (CRM At risk)', () => {
  it('each <li><div data-lines="1"> stays on one line with "…", and hovering it shows the full text', async () => {
    const sig = 'Store suspended or made inactive: BROOZ suspended, every subscription expired 8 Nov since 9 days ago';
    document.body.innerHTML = `<div style="width:900px"><cm-data-table><table><thead><tr><th>Customer</th><th>Signals</th></tr></thead>
      <tbody><tr><td>Ravi Stores</td><td style="width:240px"><ul style="margin:0;padding-inline-start:16px"><li><div data-lines="1">${sig}</div></li><li><div data-lines="1">${sig}</div></li></ul></td></tr></tbody></table></cm-data-table></div>`;
    const el = document.querySelector('cm-data-table') as any; await el.updateComplete;
    const items = [...el.querySelectorAll('[data-lines]')] as HTMLElement[];
    const lh = parseFloat(getComputedStyle(items[0]).lineHeight);
    for (const it of items) {
      expect(it.clientHeight).toBeLessThanOrEqual(lh + 1);
      expect(getComputedStyle(it).textOverflow).toBe('ellipsis');
      expect(it.scrollWidth).toBeGreaterThan(it.clientWidth);
    }
    items[0].dispatchEvent(new PointerEvent('pointerover', { bubbles: true, composed: true }));
    expect(items[0].title).toBe(sig);
    expect(getComputedStyle(el.querySelector('tbody td:nth-child(2)')!).display).toBe('table-cell');
  });
});

describe('cm-data-table data-lines="1" in phone cards (CRM 1.7.1 feedback)', () => {
  it('a one-line item never grows past its card, even with a wide --cm-data-table-cell-max-width', async () => {
    const sig = 'Store suspended or made inactive: BROOZ suspended, every subscription expired 8 Nov since 9 days ago';
    document.body.innerHTML = `<div style="width:360px"><cm-data-table mobile="cards" style="--cm-data-table-cell-max-width:420px"><table><thead><tr><th>Customer</th><th>Signals</th></tr></thead>
      <tbody><tr><td>Ravi Stores</td><td><ul style="margin:0;padding-inline-start:16px"><li><div data-lines="1">${sig}</div></li></ul></td></tr></tbody></table></cm-data-table></div>`;
    const el = document.querySelector('cm-data-table') as any; await el.updateComplete;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    const item = el.querySelector('[data-lines]') as HTMLElement;
    const card = el.querySelector('tbody tr') as HTMLElement;
    expect(item.getBoundingClientRect().right).toBeLessThanOrEqual(card.getBoundingClientRect().right + 0.5);
    expect(item.scrollWidth).toBeGreaterThan(item.clientWidth);
    expect(getComputedStyle(item).textOverflow).toBe('ellipsis');
  });
});
