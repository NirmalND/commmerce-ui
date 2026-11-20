// cm-command-palette (1.7): opening (shortcut and API), focus, grouping, keyboard, local filtering, cancelable select,
// sizes from the owner standard, RTL and dark. Runs at 1280px; phone layout is in command-palette-phone.test.ts
// (each file keeps one viewport, see standard-1-6.test.ts).
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import { commandMatches, isApplePlatform, matchesShortcut, shortcutKeys } from '../src/index.js';
import type { CmCommandPalette, CommandPaletteGroup } from '../src/index.js';

const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const all = (el: Element, sel: string) => [...el.shadowRoot!.querySelectorAll<HTMLElement>(sel)];
const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const settle = async (el: any) => { await new Promise((r) => setTimeout(r)); await el.updateComplete; await frames(); };
const px = (el: Element, prop: string) => parseFloat(getComputedStyle(el).getPropertyValue(prop));
const touch = () => matchMedia('(pointer: coarse)').matches;

const ACTIONS: CommandPaletteGroup[] = [
  { label: 'Actions', items: [
    { title: 'New lead', icon: 'plus', keywords: ['create', 'add'], shortcut: 'mod+shift+l', value: 'new-lead' },
    { title: 'Switch to dark theme', icon: 'moon', keywords: ['appearance', 'night'], value: 'dark' },
  ] },
  { label: 'Navigate', items: [
    { title: 'Go to Tasks', icon: 'tasks', href: '#tasks', shortcut: 'g t', keywords: ['todo'] },
    { title: 'Go to Leads', icon: 'users', href: '#leads' },
  ] },
];
const RECORDS: CommandPaletteGroup[] = [
  { label: 'Leads', total: 12, href: '#leads?q=ravi', items: [
    { title: 'Ravi Stores', description: 'Lead · Mumbai', href: '#lead-1', icon: 'user' },
    { title: 'Ravi Traders', description: 'Lead · Pune', href: '#lead-2', icon: 'user' },
  ] },
  { label: 'Contacts', items: [{ title: 'Ravi Kumar', description: 'Contact · Ravi Stores', href: '#contact-3', icon: 'id-card' }] },
];

const mount = async (attrs = '', wrap = (s: string) => s) => {
  document.body.innerHTML = wrap(`<button id="opener">Open</button><input id="field"><cm-command-palette ${attrs}></cm-command-palette>`);
  const el = document.querySelector('cm-command-palette') as CmCommandPalette;
  el.actions = ACTIONS;
  await el.updateComplete;
  return el;
};
const input = (el: CmCommandPalette) => shadow(el, 'input') as HTMLInputElement;
const titles = (el: CmCommandPalette) => all(el, '[role="option"]').map((o) => o.querySelector('.title')?.textContent ?? o.textContent!.trim());
const headings = (el: CmCommandPalette) => all(el, '[role="group"] > .gh > span:first-child').map((h) => h.textContent);
const mod = () => (isApplePlatform() ? { metaKey: true } : { ctrlKey: true });
const press = (target: EventTarget, init: KeyboardEventInit) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true, cancelable: true, ...init }));
const deepFocus = () => { let a = document.activeElement; while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement; return a; };

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-24') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  await page.viewport(1280, 800);
});
beforeEach(() => { document.body.innerHTML = ''; document.documentElement.removeAttribute('data-cm-theme'); });
afterAll(async () => { document.body.innerHTML = ''; await page.viewport(414, 896); });

describe('shortcut helpers', () => {
  it('mod is Cmd on Apple platforms and Ctrl elsewhere; keycaps and matching follow', () => {
    const k = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);
    expect(matchesShortcut(k({ key: 'k', metaKey: true }), 'mod+k', true)).toBe(true);
    expect(matchesShortcut(k({ key: 'k', ctrlKey: true }), 'mod+k', true)).toBe(false);
    expect(matchesShortcut(k({ key: 'k', ctrlKey: true }), 'mod+k', false)).toBe(true);
    expect(matchesShortcut(k({ key: 'K', ctrlKey: true, shiftKey: true }), 'mod+k', false)).toBe(false);
    expect(matchesShortcut(k({ key: 'k' }), 'mod+k', false)).toBe(false);
    expect(shortcutKeys('mod+shift+l', true)).toEqual(['⇧', '⌘', 'L']);
    expect(shortcutKeys('mod+shift+l', false)).toEqual(['Ctrl', 'Shift', 'L']);
    expect(shortcutKeys('g t', false)).toEqual(['G', 'T']);
  });
  it('an action matches when every typed word is in its title or keywords, any case', () => {
    const a = ACTIONS[0].items[0];
    expect(commandMatches(a, 'NEW')).toBe(true);
    expect(commandMatches(a, 'add lead')).toBe(true);
    expect(commandMatches(a, 'lea')).toBe(true);
    expect(commandMatches(a, 'tasks')).toBe(false);
  });
});

describe('cm-command-palette', () => {
  it('is closed until opened; show() opens a labelled modal dialog with focus in the combobox; close() returns focus', async () => {
    const el = await mount();
    expect(shadow(el, 'dialog').open).toBe(false);
    const opener = document.getElementById('opener')!;
    opener.focus();
    let opened = 0;
    el.addEventListener('cm-open', () => opened++);
    el.show(); await settle(el);
    expect(el.open).toBe(true);
    expect(el.hasAttribute('open')).toBe(true);
    const d = shadow(el, 'dialog') as HTMLDialogElement;
    expect(d.open).toBe(true);
    expect(d.matches(':modal')).toBe(true); // the page behind is inert
    expect(d.getAttribute('aria-label')).toBe('Command palette');
    expect(opened).toBe(1);
    expect(deepFocus()).toBe(input(el));
    expect(input(el).getAttribute('role')).toBe('combobox');
    expect(input(el).getAttribute('aria-label')).toBe('Command palette');
    expect(input(el).placeholder).toBe('Search or run a command');
    expect(document.documentElement.style.overflow).toBe('hidden');
    el.close(); await settle(el);
    expect(d.open).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('the open attribute opens it', async () => {
    const el = await mount('open');
    await settle(el);
    expect((shadow(el, 'dialog') as HTMLDialogElement).open).toBe(true);
    el.close(); await settle(el);
  });

  it('shortcut="mod+k" opens it from anywhere, even while typing in a field, and toggles it closed; off by default', async () => {
    const off = await mount();
    press(document.getElementById('field')!, { key: 'k', ...mod() });
    await settle(off);
    expect(off.open).toBe(false);

    const el = await mount('shortcut="mod+k"');
    const field = document.getElementById('field') as HTMLInputElement;
    field.focus();
    const ev = new KeyboardEvent('keydown', { key: 'k', bubbles: true, composed: true, cancelable: true, ...mod() });
    field.dispatchEvent(ev);
    await settle(el);
    expect(ev.defaultPrevented).toBe(true); // the browser's own Ctrl+K / Cmd+K doesn't also run
    expect(el.open).toBe(true);
    expect(deepFocus()).toBe(input(el));
    press(input(el), { key: 'k', ...mod() }); // from inside the palette: closes
    await settle(el);
    expect(el.open).toBe(false);
    expect(document.activeElement).toBe(field);

    // Real key presses too.
    field.focus();
    await userEvent.keyboard(isApplePlatform() ? '{Meta>}k{/Meta}' : '{Control>}k{/Control}');
    await settle(el);
    expect(el.open).toBe(true);
    // Plain k (no modifier) types into the box instead.
    await userEvent.keyboard('k');
    await settle(el);
    expect(el.open).toBe(true);
    expect(el.value).toBe('k');
    el.close(); await settle(el);
  });

  it('Escape closes it through a cancelable cm-close and focus returns to the opener', async () => {
    const el = await mount();
    const opener = document.getElementById('opener')!;
    opener.focus();
    el.show(); await settle(el);
    const reasons: string[] = [];
    let keep = true;
    el.addEventListener('cm-close', (e) => { reasons.push((e as CustomEvent).detail.reason); if (keep) e.preventDefault(); });
    await userEvent.keyboard('{Escape}'); await settle(el);
    expect(el.open).toBe(true);
    keep = false;
    await userEvent.keyboard('{Escape}'); await settle(el);
    expect(el.open).toBe(false);
    expect(reasons).toEqual(['escape', 'escape']);
    expect(document.activeElement).toBe(opener);
  });

  it('empty box: recent items first, then every action group; each row has icon, title, second line and 12px keycaps', async () => {
    const el = await mount();
    el.recent = [{ title: 'Ravi Stores', description: 'Lead · Mumbai', href: '#lead-1', icon: 'user' }];
    el.show(); await settle(el);
    expect(headings(el)).toEqual(['Recent', 'Actions', 'Navigate']);
    expect(titles(el)).toEqual(['Ravi Stores', 'New lead', 'Switch to dark theme', 'Go to Tasks', 'Go to Leads']);
    const opts = all(el, '[role="option"]');
    expect(opts[0].querySelector('cm-icon')!.getAttribute('name')).toBe('user');
    expect(opts[0].querySelector('.desc')!.textContent).toBe('Lead · Mumbai');
    expect(opts[0].getAttribute('href')).toBe('#lead-1');
    expect(opts[1].localName).toBe('div'); // an action without href is not a link
    const keys = [...opts[1].querySelectorAll('kbd')].map((k) => k.textContent);
    expect(keys).toEqual(isApplePlatform() ? ['⇧', '⌘', 'L'] : ['Ctrl', 'Shift', 'L']);
    expect(opts[1].querySelector('.keys')!.getAttribute('aria-hidden')).toBe('true');
    expect(opts[1].getAttribute('aria-keyshortcuts')).toBe(isApplePlatform() ? 'Meta+Shift+L' : 'Control+Shift+L');
    expect(opts[3].hasAttribute('aria-keyshortcuts')).toBe(false); // a sequence (g t) has no aria form
    expect(px(opts[1].querySelector('kbd')!, 'font-size')).toBe(12);
    // Grouped listbox: every group is labelled by its heading.
    const groups = all(el, '[role="listbox"] > [role="group"]');
    expect(groups.length).toBe(3);
    for (const g of groups) expect(el.shadowRoot!.getElementById(g.getAttribute('aria-labelledby')!)).not.toBeNull();
    // Nothing is announced for the empty box.
    expect(shadow(el, '[role="status"]').textContent).toBe('');
    el.close(); await settle(el);
  });

  it('typing fires cm-search; results come first, then actions filtered locally on title and keywords', async () => {
    const el = await mount();
    const queries: string[] = [];
    el.addEventListener('cm-search', (e) => { queries.push((e as CustomEvent).detail.query); });
    el.show(); await settle(el);
    await userEvent.keyboard('Add'); await settle(el);
    expect(queries).toEqual(['A', 'Ad', 'Add']);
    expect(titles(el)).toEqual(['New lead']); // keyword "add", any case
    expect(shadow(el, '[role="status"]').textContent).toBe('1 result');

    el.value = ''; input(el).value = '';
    input(el).dispatchEvent(new Event('input')); await settle(el);
    await userEvent.keyboard('go'); await settle(el);
    expect(headings(el)).toEqual(['Navigate']);
    expect(titles(el)).toEqual(['Go to Tasks', 'Go to Leads']);

    el.loading = true;
    input(el).value = 'ravi'; input(el).dispatchEvent(new Event('input')); await settle(el);
    expect(shadow(el, '.message').textContent).toContain('Loading');
    expect(shadow(el, '[role="status"]').textContent).toBe('Loading');
    el.results = RECORDS; el.loading = false; await settle(el);
    expect(headings(el)).toEqual(['Leads', 'Contacts']);
    expect(titles(el)).toEqual(['Ravi Stores', 'Ravi Traders', 'See all', 'Ravi Kumar']);
    expect(all(el, '.gh .count').map((c) => c.textContent)).toEqual(['12']);
    expect(shadow(el, '[role="status"]').textContent).toBe('3 results');

    input(el).value = 'zzz'; input(el).dispatchEvent(new Event('input')); el.results = []; await settle(el);
    expect(all(el, '[role="option"]').length).toBe(0);
    expect(shadow(el, '[role="listbox"]').hidden).toBe(true);
    expect(input(el).getAttribute('aria-expanded')).toBe('false');
    expect(shadow(el, '.message').textContent).toBe('No results');
    expect(shadow(el, '[role="status"]').textContent).toBe('No results');
    el.close(); await settle(el);
    expect(el.value).toBe(''); // emptied on close
  });

  it('arrow keys, Home and End move through rows across groups (wrapping); the first row is highlighted', async () => {
    const el = await mount();
    el.show(); await settle(el);
    const active = () => input(el).getAttribute('aria-activedescendant');
    const opts = all(el, '[role="option"]');
    expect(active()).toBe(opts[0].id);
    expect(opts[0].getAttribute('aria-selected')).toBe('true');
    await userEvent.keyboard('{ArrowDown}{ArrowDown}'); await settle(el);
    expect(active()).toBe(opts[2].id); // into the Navigate group
    expect(opts[2].classList.contains('active')).toBe(true);
    await userEvent.keyboard('{End}'); await settle(el);
    expect(active()).toBe(opts[3].id);
    await userEvent.keyboard('{ArrowDown}'); await settle(el);
    expect(active()).toBe(opts[0].id); // wraps
    await userEvent.keyboard('{ArrowUp}'); await settle(el);
    expect(active()).toBe(opts[3].id);
    await userEvent.keyboard('{Home}'); await settle(el);
    expect(active()).toBe(opts[0].id);
    expect(deepFocus()).toBe(input(el)); // focus never leaves the box
    el.close(); await settle(el);
  });

  it('Enter chooses: cm-select carries item and group, the palette closes first, run() is called', async () => {
    const el = await mount();
    const ran: string[] = [];
    el.actions = [{ label: 'Actions', items: [{ title: 'Switch to dark theme', value: 'dark', run: (item) => ran.push(item.value!) }] }];
    document.getElementById('opener')!.focus();
    el.show(); await settle(el);
    const got: any[] = [];
    el.addEventListener('cm-select', (e) => { got.push({ ...(e as CustomEvent).detail, open: el.open, focus: document.activeElement?.id }); });
    await userEvent.keyboard('dark{Enter}'); await settle(el);
    expect(got.length).toBe(1);
    expect(got[0].item.value).toBe('dark');
    expect(got[0].group.label).toBe('Actions');
    expect(got[0].open).toBe(false);
    expect(got[0].focus).toBe('opener');
    expect(ran).toEqual(['dark']);
    expect((shadow(el, 'dialog') as HTMLDialogElement).open).toBe(false);
  });

  it('cm-select is cancelable: preventDefault stops the link and run()', async () => {
    const el = await mount();
    const ran: string[] = [];
    el.actions = [{ label: 'Navigate', items: [{ title: 'Go to Tasks', href: '#tasks-cancel', run: () => ran.push('run') }] }];
    el.show(); await settle(el);
    el.addEventListener('cm-select', (e) => e.preventDefault());
    const before = location.hash;
    all(el, '[role="option"]')[0].click(); await settle(el);
    expect(location.hash).toBe(before);
    expect(ran).toEqual([]);
    expect(el.open).toBe(false);
  });

  it('links are followed by default', async () => {
    const el = await mount();
    el.actions = [{ label: 'Navigate', items: [{ title: 'Go to Tasks', href: '#palette-tasks' }] }];
    el.show(); await settle(el);
    await userEvent.keyboard('{Enter}'); await settle(el);
    expect(location.hash).toBe('#palette-tasks');
    history.replaceState(null, '', location.pathname + location.search);
  });

  it('sizes from the owner standard: 640px wide near the top, 40px search box, 36px rows, 12px headings', async () => {
    const el = await mount();
    el.recent = [{ title: 'Ravi Stores', href: '#lead-1' }];
    el.show(); await settle(el);
    const d = shadow(el, 'dialog').getBoundingClientRect();
    expect(Math.round(d.width)).toBe(640);
    expect(Math.round(d.left + d.width / 2)).toBe(640); // centred
    expect(d.top).toBeLessThan(800 * 0.2);
    expect(d.top).toBeGreaterThan(0);
    expect(Math.round(shadow(el, '.box').getBoundingClientRect().height)).toBe(touch() ? 44 : 40);
    const row = all(el, '[role="option"]')[0];
    expect(Math.round(row.getBoundingClientRect().height)).toBe(touch() ? 44 : 36);
    expect(px(row, 'font-size')).toBe(14);
    expect(px(row, 'padding-inline-start')).toBe(12);
    expect(Math.round(row.querySelector('cm-icon')?.getBoundingClientRect().width ?? 16)).toBe(16);
    expect(px(shadow(el, '.gh'), 'font-size')).toBe(12);
    expect(px(shadow(el, '.panel'), 'border-top-left-radius')).toBe(12);
    expect(getComputedStyle(shadow(el, '.esc')).display).not.toBe('none');
    expect(getComputedStyle(shadow(el, '.x')).display).toBe('none'); // the close button is for phones
    el.close(); await settle(el);
  });

  it('localises: strings and setStrings', async () => {
    const el = await mount(`strings='{"placeholder":"Rechercher","noResults":"Aucun résultat"}'`);
    el.show(); await settle(el);
    expect(input(el).placeholder).toBe('Rechercher');
    input(el).value = 'zzz'; input(el).dispatchEvent(new Event('input')); await settle(el);
    expect(shadow(el, '.message').textContent).toBe('Aucun résultat');
    el.close(); await settle(el);
  });

  it('RTL: the highlight bar is on the start (right) edge and keycaps sit at the left end', async () => {
    const el = await mount('', (s) => `<div dir="rtl">${s}</div>`);
    el.show(); await settle(el);
    const row = all(el, '[role="option"]')[0];
    expect(getComputedStyle(row).boxShadow).toMatch(/-2px 0px 0px 0px inset|inset -2px/);
    const r = row.getBoundingClientRect();
    const keys = row.querySelector('.keys')!.getBoundingClientRect();
    const title = row.querySelector('.title')!.getBoundingClientRect();
    expect(keys.left - r.left).toBeLessThan(r.right - keys.right);
    expect(title.right).toBeGreaterThan(keys.right);
    expect(row.querySelector('cm-icon')!.getBoundingClientRect().left).toBeGreaterThan(title.left);
    el.close(); await settle(el);
  });

  it('dark theme: surface, text and highlight come from the tokens', async () => {
    document.documentElement.setAttribute('data-cm-theme', 'dark');
    const el = await mount();
    el.show(); await settle(el);
    const root = getComputedStyle(document.documentElement);
    const color = (v: string) => { const p = document.createElement('div'); p.style.color = v; document.body.append(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    expect(getComputedStyle(shadow(el, '.panel')).backgroundColor).toBe(color(root.getPropertyValue('--cm-bg-surface')));
    const row = all(el, '[role="option"]')[0];
    expect(getComputedStyle(row).color).toBe(color(root.getPropertyValue('--cm-text-default')));
    expect(getComputedStyle(row).backgroundColor).toBe(color(root.getPropertyValue('--cm-bg-hover')));
    // Dark surface really is dark.
    const [r, g, b] = getComputedStyle(shadow(el, '.panel')).backgroundColor.match(/\d+/g)!.map(Number);
    expect(r + g + b).toBeLessThan(200);
    el.close(); await settle(el);
    document.documentElement.removeAttribute('data-cm-theme');
  });
});
