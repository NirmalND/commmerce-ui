import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmAppFrame, CmResourceList, CmStatusTabs, CmTableHeader } from '../src/index.js';

// 1.5.0 compact layout (commmerce-ui#29): app frame panel, header bar pill, status tab counts, card header, bulk select.
const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const rect = (el: Element) => el.getBoundingClientRect();
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const settle = async (root: Element) => {
  await Promise.all([root, ...root.querySelectorAll('*')].map((c) => (c as any).updateComplete));
  await frames();
  await Promise.all([root, ...root.querySelectorAll('*')].map((c) => (c as any).updateComplete));
};
const coarse = () => matchMedia('(pointer: coarse)').matches;

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  document.body.style.margin = '0';
});
beforeEach(async () => { document.body.innerHTML = ''; scrollTo(0, 0); await page.viewport(1440, 900); });
afterAll(async () => { document.body.style.margin = ''; await page.viewport(414, 896); });

const frame = (attrs = '') => `<cm-app-frame ${attrs}>
  <cm-header-bar slot="header" user-name="Asha Rao"></cm-header-bar>
  <cm-side-navigation slot="navigation"><cm-nav-item label="Orders" icon="bag" href="#o" current badge="12"></cm-nav-item></cm-side-navigation>
  <cm-page><div id="content" style="height:300px">Orders</div></cm-page>
  <cm-bottom-navigation slot="bottom-navigation"><cm-nav-item label="Home" icon="home" href="#h" current></cm-nav-item></cm-bottom-navigation>
</cm-app-frame>`;

describe('cm-app-frame panel', () => {
  it('at 1440px puts the page in a white rounded panel with a space-20 gutter beside and below the navigation', async () => {
    document.body.innerHTML = frame('panel');
    const el = document.querySelector('cm-app-frame') as CmAppFrame;
    await settle(el);
    const main = shadow(el, 'main'), nav = el.querySelector('cm-side-navigation')!, header = el.querySelector('cm-header-bar')!;
    const cs = getComputedStyle(main);
    expect(Math.round(rect(main).left - rect(nav).right)).toBe(20);
    expect(Math.round(1440 - rect(main).right)).toBe(20);
    expect(Math.round(rect(main).top - rect(header).bottom)).toBe(20);
    expect(Math.round(rect(main).top)).toBe(Math.round(rect(nav).top));
    expect(cs.borderTopLeftRadius).toBe('12px');
    expect(cs.backgroundColor).toBe(getComputedStyle(header).backgroundColor);
    expect(cs.boxShadow).toBe('none');
    // The panel fills the window below the header, less the gutter.
    expect(Math.round(rect(main).bottom)).toBe(900 - 20);
    expect(getComputedStyle(el.querySelector('cm-page')!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(getComputedStyle(el).backgroundColor).not.toBe(cs.backgroundColor);
  });

  it('without panel nothing changes: the page runs to the window edge on bg-page', async () => {
    document.body.innerHTML = frame();
    const el = document.querySelector('cm-app-frame') as CmAppFrame;
    await settle(el);
    const main = shadow(el, 'main');
    expect(Math.round(rect(main).right)).toBe(1440);
    expect(getComputedStyle(main).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(el.querySelector('cm-page')!).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  it('on a phone the panel runs edge to edge, white, without corners', async () => {
    await page.viewport(390, 800);
    document.body.innerHTML = frame('panel');
    const el = document.querySelector('cm-app-frame') as CmAppFrame;
    await settle(el);
    const main = shadow(el, 'main');
    expect(el.wide).toBe(false);
    expect(Math.round(rect(main).left)).toBe(0);
    expect(Math.round(rect(main).right)).toBe(390);
    expect(getComputedStyle(main).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(main).backgroundColor).toBe(getComputedStyle(el.querySelector('cm-header-bar')!).backgroundColor);
  });
});

describe('cm-header-bar compact', () => {
  it('is 56px tall with a 36px user pill (44px on touch screens) and a 28px avatar', async () => {
    document.body.innerHTML = '<cm-header-bar store="preprod.commmerce.com" balance="₹ 2,312" user-name="Demo user"></cm-header-bar>';
    const el = document.querySelector('cm-header-bar')!;
    await settle(el);
    expect(Math.round(rect(el).height)).toBe(56);
    const pill = shadow(el, '.user');
    expect(Math.round(rect(pill).height)).toBe(coarse() ? 44 : 36);
    expect(Math.round(rect(shadow(el, '.pill')).height)).toBe(coarse() ? 44 : 36);
    expect(Math.round(rect(shadow(el, '.avatar')).height)).toBe(28);
    expect(getComputedStyle(pill).fontSize).toBe('14px');
    expect(getComputedStyle(shadow(el, '.store')).fontSize).toBe('14px');
  });
});

describe('cm-status-tabs compact', () => {
  it('shows the count in a pill after the label, smaller than the label; size small is smaller still', async () => {
    document.body.innerHTML = `<cm-status-tabs><option value="a" count="4" selected>My tasks</option><option value="b" count="12">All</option></cm-status-tabs>
      <cm-status-tabs size="small"><option value="a" count="4">Open</option></cm-status-tabs>`;
    const [big, small] = [...document.querySelectorAll('cm-status-tabs')] as CmStatusTabs[];
    await settle(big); await settle(small);
    const tab = shadow(big, '[role=tab]');
    const count = tab.querySelector('.count')!;
    expect(count.textContent).toBe('4');
    expect(tab.textContent).not.toContain('(');
    expect(rect(count).left).toBeGreaterThan(rect(tab.querySelector('.label')!).right);
    expect(parseFloat(getComputedStyle(count).fontSize)).toBeLessThan(parseFloat(getComputedStyle(tab).fontSize));
    expect(getComputedStyle(tab).fontWeight).toBe('600');
    expect(getComputedStyle(shadow(big, '[role=tab][aria-selected=false]')).fontWeight).toBe('500');
    expect(parseFloat(getComputedStyle(shadow(small, '[role=tab]')).fontSize)).toBeLessThan(parseFloat(getComputedStyle(tab).fontSize));
    // Choosing a tab (bold) doesn't move the tabs after it.
    const second = shadow(big, '[role=tab][aria-selected=false]');
    const before = rect(second).left;
    (shadow(big, '[role=tab]') as HTMLButtonElement).click();
    big.value = 'b'; await big.updateComplete;
    expect(Math.abs(rect(second).left - before)).toBeLessThan(0.5);
  });
});

describe('cm-card compact header', () => {
  it('a flush list starts right under the heading', async () => {
    document.body.innerHTML = `<cm-card heading="Today" flush style="width:800px"><cm-resource-list resource-name="task">
      <cm-resource-item value="a">Call Ravi Stores</cm-resource-item></cm-resource-list></cm-card>`;
    const card = document.querySelector('cm-card')!;
    await settle(card);
    const heading = shadow(card, '[role=heading]');
    const row = shadow(card.querySelector('cm-resource-item')!, '.row');
    expect(getComputedStyle(heading).fontWeight).toBe('600');
    expect(rect(row).top - rect(heading).bottom).toBeLessThanOrEqual(12);
    expect(rect(row).top - rect(heading).bottom).toBeGreaterThanOrEqual(0);
  });
});

describe('cm-resource-list compact bulk select', () => {
  const list = (header: boolean, extra = '') => `<cm-resource-list selectable total="40" resource-name="task" style="--cm-table-columns: 2fr 1fr 1fr" ${extra}>
    ${header ? '<cm-table-header slot="header"><option>Task</option><option>Customer</option><option>Due</option></cm-table-header>' : ''}
    <cm-button slot="bulk-actions" size="slim">Mark done</cm-button>
    ${[1, 2, 3].map((n) => `<cm-resource-item value="${n}" label="Task ${n}" columns><span>Task ${n}</span><span>Ravi</span><span>Today</span></cm-resource-item>`).join('')}
  </cm-resource-list>`;
  const mountList = async (header: boolean, width = 1200) => {
    await page.viewport(width, 800);
    document.body.innerHTML = list(header);
    const el = document.querySelector('cm-resource-list') as CmResourceList;
    await settle(el);
    return el;
  };
  const centre = (r: DOMRect) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });

  for (const width of [1200, 360]) {
    it(`over a table header (${width}px): one row, the box in the header's checkbox column, lined up with the rows' boxes`, async () => {
      const el = await mountList(true, width);
      const head = el.querySelector('cm-table-header') as CmTableHeader;
      const bar = rect(shadow(head, '.bar'));
      const toolbar = rect(shadow(el, '.toolbar'));
      const box = rect(shadow(el, '.toolbar .check'));
      // No row of its own: the toolbar lies over the header bar.
      expect(Math.round(toolbar.top)).toBe(Math.round(bar.top));
      expect(Math.round(toolbar.height)).toBe(Math.round(bar.height));
      expect(Math.abs(centre(box).y - centre(bar).y)).toBeLessThan(1);
      for (const item of el.items) {
        const rowBox = rect(shadow(item, '.check'));
        expect(Math.abs(centre(rowBox).x - centre(box).x)).toBeLessThan(1);
      }
      // The column names stay clear of the box; the chevron waits until something is selected.
      const first = rect(head.shadowRoot!.querySelector('.cell[part="cell"]')!);
      expect(first.left).toBeGreaterThanOrEqual(box.right);
      expect((shadow(el, '[part="select-menu"]') as HTMLElement).hidden).toBe(true);
      const height = rect(el).height;
      el.items[0].toggle(true);
      await settle(el);
      expect((shadow(el, '[part="select-menu"]') as HTMLElement).hidden).toBe(false);
      expect(shadow(el, '.status').textContent).toContain('1 task selected.');
      const status = rect(shadow(el, '.status'));
      expect(status.top).toBeGreaterThanOrEqual(bar.top - 1);
      expect(status.bottom).toBeLessThanOrEqual(bar.bottom + 1);
      // Selecting adds no row (slim bulk buttons fit the 40px row).
      if (width > 640) expect(Math.round(rect(el).height)).toBe(Math.round(height));
      // The header row now shows the selection over the column names.
      expect(getComputedStyle(shadow(el, '.toolbar')).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    });
  }

  it('without a header: one slim row with the box (lined up with the rows), the chevron and "Select"', async () => {
    const el = await mountList(false);
    const toolbar = rect(shadow(el, '.toolbar'));
    expect(toolbar.height).toBeLessThanOrEqual(41); // 40px since 1.6, the table heading standard (#33); 32px in 1.5
    const box = rect(shadow(el, '.toolbar .check'));
    expect(Math.abs(centre(rect(shadow(el.items[0], '.check'))).x - centre(box).x)).toBeLessThan(1);
    expect((shadow(el, '[part="select-menu"]') as HTMLElement).hidden).toBe(false);
    expect(shadow(el, '.select label').textContent).toContain('all 3 tasks on this page');
    expect(rect(el.items[0]).top - toolbar.bottom).toBeLessThan(2);
  });

  it('keeps one select-all control, the strings and the events', async () => {
    const el = await mountList(true);
    expect(el.shadowRoot!.querySelectorAll('input[type=checkbox]')).toHaveLength(1);
    const changes: unknown[] = [];
    el.addEventListener('cm-selection-change', (e) => changes.push((e as CustomEvent).detail));
    const all = shadow(el, '.select input') as HTMLInputElement;
    all.click();
    await settle(el);
    expect(el.selected).toEqual(['1', '2', '3']);
    expect(changes).toHaveLength(1);
    expect(shadow(el, '.status').getAttribute('role')).toBe('status');
    expect(shadow(el, '.status button')!.textContent).toBe('Select all 40 tasks');
  });
});
