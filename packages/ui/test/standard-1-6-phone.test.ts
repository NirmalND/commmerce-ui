// Owner standard (1.6, commmerce-ui#33) on a 390px phone: card padding, the large empty state, resource-item actions
// that wrap (#31), the page-header title adornment (#32) and title size, status tabs that scroll or become a dropdown.
// The whole file runs at 390px (see standard-1-6.test.ts for why each file keeps one viewport).
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmCard, CmEmptyState, CmStatusTabs, CmResourceItem, CmLinkTabs } from '../src/index.js';

const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const rect = (el: Element) => el.getBoundingClientRect();
const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const px = (el: Element, prop: string) => parseFloat(getComputedStyle(el).getPropertyValue(prop));
const touch = () => matchMedia('(pointer: coarse)').matches;
const mount = async <T extends HTMLElement>(markup: string, width?: number): Promise<T> => {
  document.body.innerHTML = `<div id="box" style="${width ? `width:${width}px` : ''}">${markup}</div>`;
  const root = document.getElementById('box')!;
  const all = () => [...root.querySelectorAll('*')].map((c) => (c as any).updateComplete);
  await Promise.all(all()); await frames(); await Promise.all(all());
  return root.firstElementChild as T;
};

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-24') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  document.body.style.margin = '0';
  await page.viewport(390, 800);
});
beforeEach(() => { document.body.innerHTML = ''; });
afterAll(async () => { document.body.style.margin = ''; await page.viewport(414, 896); });

describe('cm-card on phones', () => {
  it('every variant pads 16px', async () => {
    for (const variant of ['standard', 'compact', 'interactive']) {
      const el = await mount<CmCard>(`<cm-card variant="${variant}" heading="Tasks">x</cm-card>`);
      expect(px(shadow(el, 'section'), 'padding-top'), variant).toBe(16);
    }
  });
  it('keeps the narrow header wrap (1.2/1.5) on an interactive card: badges under the heading, nothing overflows', async () => {
    const el = await mount<CmCard>(`<cm-card variant="interactive" heading="Partner tasks" href="#">
      <cm-badge slot="title-adornment" tone="critical">1 overdue</cm-badge><cm-badge slot="title-adornment" tone="attention">2 today</cm-badge>
      <cm-badge slot="title-adornment">4 later</cm-badge><cm-button slot="actions" size="slim">View all</cm-button>x</cm-card>`, 360);
    const card = rect(el);
    for (const b of el.querySelectorAll('cm-badge, cm-button')) expect(rect(b).right).toBeLessThanOrEqual(card.right + 0.5);
    expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth);
    const text = rect(shadow(el, '.title .text'));
    for (const b of el.querySelectorAll('cm-badge')) expect(rect(b).top).toBeGreaterThanOrEqual(text.bottom - 1);
  });
});

describe('cm-empty-state on phones', () => {
  it('large is a 120px circle; the default tile stays 48px', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="large" heading="No products"></cm-empty-state>');
    expect(rect(shadow(el, '.circle')).width).toBe(120);
    const def = await mount<CmEmptyState>('<cm-empty-state heading="No products"></cm-empty-state>');
    expect(rect(shadow(def, '.circle')).width).toBe(48);
  });
});

describe('cm-resource-item actions wrap on a phone (#31)', () => {
  const row = (attrs = '') => `<cm-resource-list resource-name="task"><cm-resource-item value="1" ${attrs}>
      <strong>Ravi Stores</strong><div>Called 12 Nov, no answer</div>
      <cm-button slot="actions" size="slim">Call</cm-button><cm-button slot="actions" size="slim">Details</cm-button>
      <cm-button slot="actions" size="slim">Set date</cm-button><cm-button slot="actions" size="slim">Not interested</cm-button>
    </cm-resource-item></cm-resource-list>`;
  const parts = (list: Element) => {
    const item = list.querySelector('cm-resource-item') as CmResourceItem;
    return { item, content: rect(shadow(item, '.content')), actions: rect(shadow(item, '.actions')), row: rect(shadow(item, '.row')) };
  };

  it('the buttons move under the content, at the start, and the content keeps its width', async () => {
    const list = await mount<HTMLElement>(row(), 358);
    const { content, actions, row: r } = parts(list);
    expect(actions.top).toBeGreaterThanOrEqual(content.bottom);
    // At the start of the row's content box (rows pad the list's 12px inset inside since 1.17.1).
    expect(Math.abs(actions.left - content.left)).toBeLessThanOrEqual(1);
    expect(content.width).toBeGreaterThan(192);
    expect(actions.right).toBeLessThanOrEqual(r.right + 0.5);
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
  });
  it('a row with one short action keeps it beside the content', async () => {
    const list = await mount<HTMLElement>(`<cm-resource-list><cm-resource-item value="1"><strong>Ravi Stores</strong>
      <cm-button slot="actions" size="slim">Call</cm-button></cm-resource-item></cm-resource-list>`, 358);
    const { content, actions } = parts(list);
    expect(Math.abs((actions.top + actions.bottom) / 2 - (content.top + content.bottom) / 2)).toBeLessThan(2);
  });
  it('actions="inline" keeps the 1.5 behaviour', async () => {
    const list = await mount<HTMLElement>(row('actions="inline"'), 358);
    const { content, actions } = parts(list);
    expect(actions.left).toBeGreaterThanOrEqual(content.right - 0.5);
  });
});

describe('cm-page-header on phones (#32)', () => {
  it('a badge sits beside a short title, 8px from it; the title is 20px', async () => {
    const el = await mount<HTMLElement>(`<cm-page-header heading="Tasks" description="Calls and visits."><cm-badge slot="title-adornment" tone="attention">5 open</cm-badge>
      <cm-button slot="actions">Export</cm-button></cm-page-header>`);
    const text = rect(shadow(el, '.text'));
    const badge = rect(el.querySelector('cm-badge')!);
    expect(badge.left).toBeGreaterThanOrEqual(text.right);
    expect(badge.left - text.right).toBeLessThanOrEqual(8.5);
    expect(Math.abs((badge.top + badge.bottom) / 2 - (text.top + text.bottom) / 2)).toBeLessThan(3);
    expect(px(shadow(el, 'h1'), 'font-size')).toBe(20);
    expect(px(shadow(el, '[part=description]'), 'font-size')).toBe(13);
  });
});

describe('cm-status-tabs on phones', () => {
  const tabs = (attrs = '') => `<cm-status-tabs ${attrs} aria-label="Task status">
    <option value="a" count="4" selected>Needs a date</option><option value="b" count="12">This week</option>
    <option value="c" count="40">Later</option><option value="d" count="2">Not interested</option><option value="e">Archived</option></cm-status-tabs>`;

  it('a row too wide for its box scrolls with snapping, and fades the edge that has more tabs', async () => {
    const el = await mount<CmStatusTabs>(tabs(), 300);
    const row = shadow(el, '.tabs');
    expect(getComputedStyle(row).scrollSnapType).toContain('x');
    expect(getComputedStyle(shadow(el, '[role=tab]')).scrollSnapAlign).toContain('start');
    expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
    expect(row.classList.contains('more-end')).toBe(true);
    expect(getComputedStyle(row).maskImage).toContain('gradient');
    row.scrollLeft = row.scrollWidth; row.dispatchEvent(new Event('scroll'));
    await el.updateComplete; await frames();
    expect(row.classList.contains('more-start')).toBe(true);
    expect(row.classList.contains('more-end')).toBe(false);
  });

  it('mobile="select": a dropdown of the same choices that fires change and focuses', async () => {
    const el = await mount<CmStatusTabs>(tabs('mobile="select"'));
    const select = shadow(el, 'select') as HTMLSelectElement;
    expect(getComputedStyle(shadow(el, '.tabs')).display).toBe('none');
    expect(select.offsetParent).not.toBeNull();
    expect(select.getAttribute('aria-label')).toBe('Task status');
    expect([...select.options].map((o) => o.textContent!.trim())).toEqual(['Needs a date (4)', 'This week (12)', 'Later (40)', 'Not interested (2)', 'Archived']);
    expect(select.value).toBe('a');
    expect(rect(select).height).toBe(touch() ? 44 : 40);
    const changes: string[] = [];
    el.addEventListener('change', () => changes.push(el.value));
    await userEvent.selectOptions(select, 'c');
    expect(changes).toEqual(['c']);
    await el.updateComplete;
    expect(shadow(el, '[role=tab][aria-selected=true]').textContent).toContain('Later');
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(select);
  });
});

describe('cm-status-tabs fade when counts arrive later (CRM /v4 feedback)', () => {
  it('shows the end fade once late counts make the row overflow, without any scrolling or resizing', async () => {
    document.body.innerHTML = '<div style="width:300px"><cm-status-tabs></cm-status-tabs></div>';
    const el = document.querySelector('cm-status-tabs') as any;
    el.tabs = [{ value: 'a', label: 'All' }, { value: 'b', label: 'Upcoming' }, { value: 'c', label: 'Expired' }];
    await el.updateComplete;
    const row = el.shadowRoot.querySelector('.tabs') as HTMLElement;
    const fits = row.scrollWidth <= row.clientWidth + 1;
    el.tabs = [{ value: 'a', label: 'All', count: 1240 }, { value: 'b', label: 'Upcoming', count: 380 }, { value: 'c', label: 'Expired', count: 96 }, { value: 'd', label: 'This month', count: 41 }, { value: 'e', label: 'Renewed', count: 12 }];
    await el.updateComplete;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
    expect(fits).toBe(true);
    expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
    expect(row.className).toMatch(/more-(end|both)/); // WebKit may already have scrolled the selected tab into view
  });
});

describe('cm-link-tabs on phones (1.20.1)', () => {
  const tabs = (current: string) => `<cm-link-tabs label="Settings sections">${['General', 'Payments', 'Shipping and delivery', 'Notifications', 'Domains']
    .map((l) => `<cm-nav-item label="${l}" href="#${l}"${l === current ? ' current' : ''}></cm-nav-item>`).join('')}</cm-link-tabs>`;

  it('a row too wide for its box fades the edge that has more tabs, and the fade follows the scroll', async () => {
    const el = await mount<CmLinkTabs>(tabs('General'), 300);
    const row = shadow(el, 'ul');
    expect(row.scrollWidth).toBeGreaterThan(row.clientWidth);
    expect(row.classList.contains('more-end')).toBe(true);
    expect(getComputedStyle(row).maskImage).toContain('gradient');
    row.scrollLeft = row.scrollWidth; row.dispatchEvent(new Event('scroll'));
    await el.updateComplete; await frames();
    expect(row.classList.contains('more-start')).toBe(true);
    expect(row.classList.contains('more-end')).toBe(false);
  });

  it('scrolls the current tab into view without scrolling the page', async () => {
    const before = window.scrollY;
    const el = await mount<CmLinkTabs>(tabs('Domains'), 300);
    const row = shadow(el, 'ul');
    const a = rect(shadow(el, 'a[aria-current=page]'));
    expect(a.right).toBeLessThanOrEqual(rect(row).right + 0.5);
    expect(row.className).toMatch(/more-(start|both)/);
    expect(window.scrollY).toBe(before);
  });

  it('a row that fits has no fade', async () => {
    const el = await mount<CmLinkTabs>(tabs('General'), 900);
    expect(shadow(el, 'ul').className).toBe('');
  });
});
