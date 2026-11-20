import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '../src/index.js';
import type { CmGlobalSearch, CmHeaderBar, CmNotificationPanel, GlobalSearchGroup } from '../src/index.js';

const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const all = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(sel)];
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const settle = async (el: any) => { await new Promise((r) => setTimeout(r)); await el.updateComplete; };

const RESULTS: GlobalSearchGroup[] = [
  { label: 'Leads', total: 12, href: '#leads?q=ravi', items: [
    { title: 'Ravi Stores', description: 'Lead · Mumbai', href: '#lead-1', icon: 'user' },
    { title: 'Ravi Traders', description: 'Lead · Pune', href: '#lead-2' },
  ] },
  { label: 'Deals', items: [{ title: 'Ravi Stores renewal', description: 'Deal · ₹ 48,000', href: '#deal-9' }] },
  { label: 'Empty kind', items: [] },
];

beforeEach(async () => {
  document.body.innerHTML = '';
  await page.viewport(1280, 800);
});
afterAll(async () => { await page.viewport(414, 896); });

describe('cm-notification-panel (1.1 additions)', () => {
  it('renders existing markup the same: no mark-all button, no footer, no second line, tone icons', async () => {
    document.body.innerHTML = `<cm-notification-panel open>
      <cm-notification-item time="1 min ago" unread>New order received</cm-notification-item>
      <cm-notification-item tone="attention">Product low stock</cm-notification-item></cm-notification-panel>`;
    const el = document.querySelector('cm-notification-panel') as CmNotificationPanel;
    await el.updateComplete;
    expect(shadow(el, '.mark')).toBeNull();
    expect(shadow(el, '.footer').hidden).toBe(true);
    expect(shadow(el, '.desc')).toBeNull();
    expect(all(el, '.row')[0].querySelector('.label')!.textContent).toBe('Unread: New order received');
    expect(all(el, '.ic cm-icon').map((i) => i.getAttribute('name'))).toEqual(['bag', 'alert']);
    expect(shadow(el, '[role="status"]').textContent).toBe('');
    el.close(); await el.updateComplete;
  });

  it('shows a second line and a per-item icon, from markup and from data', async () => {
    document.body.innerHTML = `<cm-notification-panel open>
      <cm-notification-item tone="attention" icon="clock" description="Follow-up due at 4 pm" unread>Call Ravi Stores</cm-notification-item>
    </cm-notification-panel>`;
    const el = document.querySelector('cm-notification-panel') as CmNotificationPanel;
    await el.updateComplete;
    const row = shadow(el, '.row');
    expect(row.querySelector('.title')!.textContent).toBe('Call Ravi Stores');
    expect(row.querySelector('.desc')!.textContent).toBe('Follow-up due at 4 pm');
    expect(row.querySelector('.label')!.textContent!.replace(/\s+/g, ' ')).toBe('Unread: Call Ravi Stores, Follow-up due at 4 pm');
    expect(row.querySelector('.ic')!.classList.contains('attention')).toBe(true);
    expect(row.querySelector('.ic cm-icon')!.getAttribute('name')).toBe('clock');
    el.items = [{ label: 'New lead', description: 'From the website form', icon: 'user', href: '#lead' }];
    await el.updateComplete;
    expect(shadow(el, '.row .desc').textContent).toBe('From the website form');
    expect(shadow(el, '.row .ic cm-icon').getAttribute('name')).toBe('user');
    el.close(); await el.updateComplete;
  });

  it('"Mark all read" shows only with unread items, fires cm-mark-all-read, and keeps focus in the panel when it goes', async () => {
    document.body.innerHTML = `<cm-notification-panel mark-all-read>
      <cm-notification-item unread>New order received</cm-notification-item>
      <cm-notification-item>Payment received</cm-notification-item></cm-notification-panel>`;
    const el = document.querySelector('cm-notification-panel') as CmNotificationPanel;
    el.show(); await el.updateComplete;
    const btn = shadow(el, 'header .mark') as HTMLButtonElement;
    expect(btn.textContent).toBe('Mark all read');
    expect(btn.localName).toBe('button');
    let fired = 0;
    el.addEventListener('cm-mark-all-read', () => { fired++; el.querySelectorAll('[unread]').forEach((n) => n.removeAttribute('unread')); });
    btn.focus();
    btn.click();
    await settle(el); await settle(el);
    expect(fired).toBe(1);
    expect(shadow(el, '.mark')).toBeNull();
    expect(el.shadowRoot!.activeElement).toBe(shadow(el, '.panel'));
    el.markAllLabel = 'Tout marquer comme lu';
    el.querySelector('cm-notification-item')!.setAttribute('unread', '');
    await settle(el);
    expect(shadow(el, '.mark').textContent).toBe('Tout marquer comme lu');
    el.close(); await el.updateComplete;
  });

  it('footer slot holds a control under the list', async () => {
    document.body.innerHTML = `<cm-notification-panel open more-href="#all">
      <cm-notification-item>Payment received</cm-notification-item>
      <cm-toggle slot="footer" label="Push notifications on this device"></cm-toggle></cm-notification-panel>`;
    const el = document.querySelector('cm-notification-panel') as CmNotificationPanel;
    await settle(el);
    const foot = shadow(el, '.footer');
    expect(foot.hidden).toBe(false);
    expect(foot.getBoundingClientRect().top).toBeGreaterThanOrEqual(shadow(el, '.more').getBoundingClientRect().bottom - 1);
    expect((foot.querySelector('slot') as HTMLSlotElement).assignedElements()[0].localName).toBe('cm-toggle');
    el.close(); await el.updateComplete;
  });

  it('loading shows placeholder rows instead of the list and announces "Loading"', async () => {
    document.body.innerHTML = `<cm-notification-panel open loading mark-all-read><cm-notification-item unread>Old</cm-notification-item></cm-notification-panel>`;
    const el = document.querySelector('cm-notification-panel') as CmNotificationPanel;
    await el.updateComplete;
    expect(all(el, '.loading li').length).toBe(3);
    expect(shadow(el, '.loading').getAttribute('aria-hidden')).toBe('true');
    expect(shadow(el, '.row')).toBeNull();
    expect(shadow(el, '.empty')).toBeNull();
    expect(shadow(el, '.mark')).toBeNull();
    expect(shadow(el, '[role="status"]').textContent).toBe('Loading');
    el.loading = false; await el.updateComplete;
    expect(all(el, '.row').length).toBe(1);
    expect(shadow(el, '[role="status"]').textContent).toBe('');
    el.close(); await el.updateComplete;
  });
});

describe('cm-global-search', () => {
  const mount = async (attrs = '') => {
    document.body.innerHTML = `<cm-global-search label="Search the CRM" placeholder="Search leads, deals" ${attrs}></cm-global-search><button id="after">after</button>`;
    const el = document.querySelector('cm-global-search') as CmGlobalSearch;
    await el.updateComplete;
    return el;
  };
  const input = (el: CmGlobalSearch) => shadow(el, 'input') as HTMLInputElement;

  it('is a combobox with a grouped listbox; typing fires cm-search and shows results by group', async () => {
    const el = await mount();
    const queries: string[] = [];
    el.addEventListener('cm-search', (e) => {
      queries.push((e as CustomEvent).detail.query);
      el.results = RESULTS;
    });
    const box = input(el);
    expect(box.getAttribute('role')).toBe('combobox');
    expect(box.getAttribute('aria-label')).toBe('Search the CRM');
    expect(box.getAttribute('aria-expanded')).toBe('false');
    expect(box.getAttribute('aria-keyshortcuts')).toBeNull();
    box.focus();
    await userEvent.keyboard('ra');
    await el.updateComplete;
    expect(queries).toEqual(['r', 'ra']);
    expect(el.open).toBe(true);
    expect(box.getAttribute('aria-expanded')).toBe('true');
    const list = shadow(el, '[role="listbox"]');
    expect(box.getAttribute('aria-controls')).toBe(list.id);
    const groups = all(el, '[role="group"]');
    expect(groups.length).toBe(2); // the empty group is skipped
    const head = el.shadowRoot!.getElementById(groups[0].getAttribute('aria-labelledby')!)!;
    expect(head.textContent!.replace(/\s+/g, ' ')).toContain('Leads');
    expect(head.querySelector('.count')!.textContent).toBe('12');
    expect(head.querySelector('.vh')!.textContent).toBe(', 12 results');
    const opts = all(el, '[role="option"]');
    expect(opts.map((o) => o.getAttribute('href'))).toEqual(['#lead-1', '#lead-2', '#leads?q=ravi', '#deal-9']);
    expect(opts.every((o) => o.getAttribute('tabindex') === '-1')).toBe(true);
    expect(opts[0].querySelector('.title')!.textContent).toBe('Ravi Stores');
    expect(opts[0].querySelector('.desc')!.textContent).toBe('Lead · Mumbai');
    expect(opts[0].querySelector('cm-icon')!.getAttribute('name')).toBe('user');
    expect(opts[2].textContent!.trim()).toBe('See all');
    expect(shadow(el, '[role="status"]').textContent).toBe('3 results');
  });

  it('arrow keys move through items across groups (wrapping), Enter opens the result, Escape closes then clears', async () => {
    const el = await mount('value="ravi"');
    el.results = RESULTS;
    input(el).focus();
    await el.updateComplete;
    const got: unknown[] = [];
    el.addEventListener('cm-select', (e) => { got.push((e as CustomEvent).detail); e.preventDefault(); });
    const active = () => input(el).getAttribute('aria-activedescendant');
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    const opts = all(el, '[role="option"]');
    expect(active()).toBe(opts[0].id);
    expect(opts[0].getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    await el.updateComplete;
    expect(active()).toBe(opts[3].id); // into the second group
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(active()).toBe(opts[0].id); // wraps
    await userEvent.keyboard('{ArrowUp}');
    await el.updateComplete;
    expect(active()).toBe(opts[3].id);
    await userEvent.keyboard('{Enter}');
    await el.updateComplete;
    expect(got).toEqual([{ href: '#deal-9', item: RESULTS[1].items[0], group: RESULTS[1] }]);
    expect(el.open).toBe(false);
    // Down reopens; "See all" carries no item.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    await el.updateComplete;
    expect(got[1]).toEqual({ href: '#leads?q=ravi', item: undefined, group: RESULTS[0] });
    await userEvent.keyboard('{ArrowDown}');
    await el.updateComplete;
    expect(el.open).toBe(true);
    const queries: string[] = [];
    el.addEventListener('cm-search', (e) => queries.push((e as CustomEvent).detail.query));
    await userEvent.keyboard('{Escape}');
    await el.updateComplete;
    expect(el.open).toBe(false);
    expect(el.value).toBe('ravi');
    await userEvent.keyboard('{Escape}');
    await el.updateComplete;
    expect(el.value).toBe('');
    expect(queries).toEqual(['']);
  });

  it('a click on a result follows its link unless cm-select is cancelled', async () => {
    const el = await mount('value="ravi"');
    el.results = RESULTS;
    el.open = true; await el.updateComplete;
    const before = location.hash;
    el.addEventListener('cm-select', (e) => e.preventDefault(), { once: true });
    all(el, '[role="option"]')[1].click();
    expect(location.hash).toBe(before);
    el.open = true; await el.updateComplete;
    all(el, '[role="option"]')[1].click();
    await expect.poll(() => location.hash).toBe('#lead-2'); // Firefox can update the address a moment after the click
    history.replaceState(null, '', location.pathname + location.search);
  });

  it('shows loading and empty states, announced politely', async () => {
    const el = await mount('value="zz" loading');
    el.open = true; await el.updateComplete;
    const status = shadow(el, '[role="status"]');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('Loading');
    expect(shadow(el, '.message cm-spinner')).toBeTruthy();
    expect(shadow(el, '[role="listbox"]').hidden).toBe(true);
    el.loading = false; el.results = []; await el.updateComplete;
    expect(status.textContent).toBe('No results');
    expect(shadow(el, '.message').textContent).toBe('No results');
    el.emptyText = 'Nothing matches “zz”'; await el.updateComplete;
    expect(status.textContent).toBe('Nothing matches “zz”');
    // No query: nothing shows, even when open.
    el.value = ''; await el.updateComplete;
    expect(shadow(el, '.pop').hidden).toBe(true);
    expect(status.textContent).toBe('');
  });

  it('the shortcut key is off by default; with shortcut="/" it focuses the box unless typing in a field', async () => {
    const el = await mount();
    await userEvent.keyboard('/');
    expect(document.activeElement).not.toBe(el);
    el.shortcut = '/'; await el.updateComplete;
    expect(input(el).getAttribute('aria-keyshortcuts')).toBe('/');
    expect(shadow(el, 'kbd').textContent).toBe('/');
    document.body.insertAdjacentHTML('beforeend', '<input id="other">');
    (document.getElementById('other') as HTMLInputElement).focus();
    await userEvent.keyboard('/');
    expect(document.activeElement!.id).toBe('other');
    (document.getElementById('after') as HTMLButtonElement).focus();
    await userEvent.keyboard('/');
    expect(el.shadowRoot!.activeElement).toBe(input(el));
    expect(el.value).toBe(''); // the slash is not typed
  });

  it('closes when the pointer goes down outside, and on Tab', async () => {
    const el = await mount('value="ravi"');
    el.results = RESULTS;
    input(el).focus(); await el.updateComplete;
    expect(el.open).toBe(true);
    document.getElementById('after')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    await el.updateComplete;
    expect(el.open).toBe(false);
    input(el).click(); await el.updateComplete;
    expect(el.open).toBe(true);
    await userEvent.keyboard('{Tab}');
    await el.updateComplete;
    expect(el.open).toBe(false);
  });
});

describe('cm-header-bar search slot', () => {
  const mount = async (width: number) => {
    document.body.innerHTML = `<div style="width:${width}px"><cm-header-bar user-name="Asha" store="preprod.commmerce.com">
      <cm-global-search slot="search" label="Search the CRM"></cm-global-search>
      <cm-button slot="end">Bell</cm-button>
    </cm-header-bar></div>`;
    const el = document.querySelector('cm-header-bar') as CmHeaderBar;
    await el.updateComplete; await frame(); await el.updateComplete;
    return el;
  };

  it('shows the search inline on wide bars, after the store switcher', async () => {
    const el = await mount(1200);
    const gs = el.querySelector('cm-global-search') as CmGlobalSearch;
    const r = gs.getBoundingClientRect();
    expect(r.width).toBeGreaterThan(200);
    expect(r.left).toBeGreaterThanOrEqual(shadow(el, '.store').getBoundingClientRect().right);
    expect(shadow(el, '.search-btn')).toBeNull();
    el.openSearch();
    expect(gs.shadowRoot!.activeElement).toBe(shadow(gs, 'input'));
    expect(el.searchOpen).toBe(false);
  });

  it('existing bars without search render no search area or button', async () => {
    document.body.innerHTML = '<div style="width:600px"><cm-header-bar user-name="Asha"></cm-header-bar></div>';
    const el = document.querySelector('cm-header-bar') as CmHeaderBar;
    await el.updateComplete; await frame(); await el.updateComplete;
    expect(shadow(el, '.search-btn')).toBeNull();
    (el.parentElement as HTMLElement).style.width = '1200px';
    await frame(); await el.updateComplete;
    expect(getComputedStyle(shadow(el, '.search')).display).toBe('none');
  });

  it('collapses to a search button at 900px or narrower that opens a full-screen layer; Escape and choosing a result close it', async () => {
    const el = await mount(800);
    const gs = el.querySelector('cm-global-search') as CmGlobalSearch;
    expect(gs.getClientRects().length).toBe(0);
    const btn = shadow(el, '.search-btn') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Search');
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    const toggles: boolean[] = [];
    el.addEventListener('cm-search-toggle', (e) => toggles.push((e as CustomEvent).detail.open));
    btn.focus();
    btn.click(); await el.updateComplete;
    const layer = shadow(el, 'dialog.layer') as HTMLDialogElement;
    expect(layer.matches(':modal')).toBe(true);
    expect(layer.getAttribute('aria-label')).toBe('Search');
    expect(el.searchOpen).toBe(true);
    const lr = layer.getBoundingClientRect();
    expect(Math.round(lr.width)).toBe(document.documentElement.clientWidth);
    expect(Math.round(lr.top)).toBe(0);
    expect(gs.shadowRoot!.activeElement).toBe(shadow(gs, 'input'));
    expect(document.documentElement.style.overflow).toBe('hidden');
    // Results fill the layer instead of floating.
    gs.value = 'ravi'; gs.results = RESULTS; gs.open = true; await gs.updateComplete;
    expect(getComputedStyle(shadow(gs, '.pop')).position).toBe('static');
    // First Escape closes the results, the second closes the layer and focus returns to the button.
    await userEvent.keyboard('{Escape}'); await el.updateComplete;
    await expect.poll(() => gs.open).toBe(false);
    expect(el.searchOpen).toBe(true);
    await userEvent.keyboard('{Escape}'); await el.updateComplete; // clears the query
    await userEvent.keyboard('{Escape}'); await el.updateComplete;
    await expect.poll(() => el.searchOpen).toBe(false);
    await expect.poll(() => layer.open).toBe(false);
    expect(el.shadowRoot!.activeElement).toBe(btn);
    expect(document.documentElement.style.overflow).toBe('');
    // Choosing a result closes the layer, even when the app routes itself.
    el.openSearch(); await el.updateComplete;
    gs.value = 'ravi'; gs.open = true; await gs.updateComplete;
    gs.addEventListener('cm-select', (e) => e.preventDefault());
    all(gs, '[role="option"]')[0].click(); await el.updateComplete;
    await expect.poll(() => el.searchOpen).toBe(false);
    // The close button closes it too.
    el.openSearch(); await el.updateComplete;
    shadow(el, '.layer-close').click(); await el.updateComplete;
    await expect.poll(() => el.searchOpen).toBe(false);
    expect(toggles).toEqual([true, false, true, false, true, false]);
  });

  it('widening the bar while the layer is open puts the search back inline', async () => {
    const el = await mount(800);
    el.openSearch(); await el.updateComplete;
    (el.parentElement as HTMLElement).style.width = '1200px';
    await frame(); await el.updateComplete; await frame();
    expect(el.searchOpen).toBe(false);
    expect(document.documentElement.style.overflow).toBe('');
    expect((el.querySelector('cm-global-search') as HTMLElement).getBoundingClientRect().width).toBeGreaterThan(200);
  });
});
