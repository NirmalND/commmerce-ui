import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page, userEvent } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import { CmButtonGroup } from '../src/index.js';
import type { CmActionMenu } from '../src/index.js';

// cm-button-group (1.7): a row of buttons that wraps, or with overflow="menu" moves the buttons that don't fit into a
// trailing More menu (CRM task outcomes on phones).
const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const settle = async () => {
  const all = () => [...document.querySelectorAll('*')].map((c) => (c as any).updateComplete);
  await Promise.all(all()); await frames(3); await Promise.all(all()); await frames(1);
};
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T;
const rect = (el: Element) => el.getBoundingClientRect();
const more = (g: CmButtonGroup) => g.shadowRoot!.querySelector('.more') as CmActionMenu;
const trigger = (g: CmButtonGroup) => more(g).shadowRoot!.querySelector('[part="trigger"]') as HTMLButtonElement;
const ids = (els: Element[]) => els.map((e) => e.id);

const OUTCOMES = `
  <cm-button id="spoke" icon="phone">Spoke to them</cm-button>
  <cm-button id="noanswer">No answer, reschedule</cm-button>
  <cm-button id="notint" tone="critical">Not interested</cm-button>
  <cm-button id="done" variant="primary">Done</cm-button>
  <cm-button id="renewed" tone="success">Renewed</cm-button>
  <cm-button id="callback">Will renew: call back</cm-button>`;

const mount = async (attrs: string, children = OUTCOMES, width = '1000px') => {
  document.body.innerHTML = `<div id="box" style="width:${width}"><cm-button-group ${attrs}>${children}</cm-button-group></div>`;
  await settle();
  return $<CmButtonGroup>('cm-button-group');
};
const resize = async (width: number) => { $('#box').style.width = `${width}px`; await settle(); };

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-8') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  document.body.style.margin = '0';
});
beforeEach(async () => { document.body.innerHTML = ''; document.documentElement.dir = ''; await page.viewport(1280, 800); });
afterAll(async () => { document.body.style.margin = ''; await page.viewport(414, 896); });

describe('cm-button-group: wrap (default)', () => {
  it('lays the buttons out 8px apart and wraps them when the row is too narrow; no More menu', async () => {
    const g = await mount('label="Call outcome"');
    expect(g.overflow).toBe('wrap');
    expect(g.shadowRoot!.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Call outcome');
    expect(Math.round(rect($('#noanswer')).left - rect($('#spoke')).right)).toBe(8);
    await resize(320);
    expect(more(g).hidden).toBe(true);
    expect(rect($('#callback')).top).toBeGreaterThan(rect($('#spoke')).bottom);
    expect([...g.querySelectorAll('cm-button')].every((b) => !b.hidden)).toBe(true);
  });
});

describe('cm-button-group overflow="menu"', () => {
  it('shows every button and no More when they fit', async () => {
    const g = await mount('overflow="menu"');
    expect(more(g).hidden).toBe(true);
    expect(g.overflowing).toEqual([]);
    expect([...g.querySelectorAll('cm-button')].every((b) => !b.hidden && b.checkVisibility())).toBe(true);
  });

  it('moves the buttons that don\'t fit into More, low priority first, then last-first, primary and high priority last', async () => {
    const g = await mount('overflow="menu"', `
      <cm-button id="a" data-priority="high">Spoke to them</cm-button>
      <cm-button id="b">No answer, reschedule</cm-button>
      <cm-button id="c" data-priority="low">Not interested</cm-button>
      <cm-button id="d" variant="primary">Done</cm-button>
      <cm-button id="e">Renewed</cm-button>`);
    const order: string[] = [];
    for (let w = 900; w >= 180; w -= 10) {
      await resize(w);
      for (const id of ids(g.overflowing)) if (!order.includes(id)) order.push(id);
      // Never wider than the group, and the row stays one line.
      const visible = [...g.querySelectorAll<HTMLElement>('cm-button:not([hidden])'), ...(more(g).hidden ? [] : [more(g)])];
      for (const v of visible) expect(rect(v).right).toBeLessThanOrEqual(rect(g).right + 0.5);
      expect(new Set(visible.map((v) => Math.round(rect(v).top))).size).toBeLessThanOrEqual(1);
    }
    // Narrower than one button plus More: only More is left.
    await resize(120);
    for (const id of ids(g.overflowing)) if (!order.includes(id)) order.push(id);
    expect(order).toEqual(['c', 'e', 'b', 'a', 'd']);
    // The menu lists them in reading order, not in the order they moved.
    expect(more(g).items.map((i) => i.label)).toEqual(['Spoke to them', 'No answer, reschedule', 'Not interested', 'Done', 'Renewed']);
  });

  it('at a 390px phone width keeps two buttons and the More trigger on one line', async () => {
    const g = await mount('overflow="menu"', OUTCOMES, '390px');
    const visible = [...g.querySelectorAll('cm-button')].filter((b) => !b.hidden);
    expect(ids(visible)).toEqual(['spoke', 'done']);
    expect(more(g).hidden).toBe(false);
    expect(trigger(g).textContent!.trim()).toBe('More');
    expect(Math.round(rect(more(g)).left - rect($('#done')).right)).toBe(8);
    expect(more(g).items.map((i) => i.label)).toEqual(['No answer, reschedule', 'Not interested', 'Renewed', 'Will renew: call back']);
    // Tone critical becomes a destructive item; the icon is carried over.
    expect(more(g).items[1].critical).toBe(true);
    await resize(1000);
    expect(g.overflowing).toEqual([]);
  });

  it('choosing a menu item clicks the original button (its handler runs) and focus returns to More', async () => {
    const g = await mount('overflow="menu"', OUTCOMES, '390px');
    const clicks: EventTarget[] = [];
    $('#notint').addEventListener('click', (e) => clicks.push(e.currentTarget!));
    const selects: Event[] = [];
    document.addEventListener('cm-select', (e) => selects.push(e));
    trigger(g).focus();
    await userEvent.keyboard('{ArrowDown}');
    await more(g).updateComplete;
    const items = [...more(g).shadowRoot!.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(items.map((i) => i.textContent!.trim())).toEqual(['No answer, reschedule', 'Not interested', 'Renewed', 'Will renew: call back']);
    items[1].click();
    await settle();
    expect(clicks).toEqual([$('#notint')]);
    expect(selects).toEqual([]); // the internal menu's event does not leak out
    expect(more(g).open).toBe(false);
    expect(more(g).shadowRoot!.activeElement).toBe(trigger(g));
  });

  it('keeps focus in the group when the chosen button removes itself and More goes away', async () => {
    const g = await mount('overflow="menu"', `<cm-button id="x">Spoke to them</cm-button><cm-button id="y">No answer, reschedule</cm-button>`, '260px');
    expect(ids(g.overflowing)).toEqual(['y']);
    $('#y').addEventListener('click', () => $('#y').remove());
    more(g).show();
    await more(g).updateComplete;
    (more(g).shadowRoot!.querySelector('[role="menuitem"]') as HTMLElement).click();
    await settle(); await settle();
    expect(more(g).hidden).toBe(true);
    expect(document.activeElement).toBe($('#x'));
  });

  it('moves focus to More when the focused button moves into the menu', async () => {
    const g = await mount('overflow="menu"', OUTCOMES, '1000px');
    ($('#callback').shadowRoot!.querySelector('[part="control"]') as HTMLElement).focus();
    expect(document.activeElement).toBe($('#callback'));
    await resize(390);
    expect($('#callback').hidden).toBe(true);
    expect(more(g).shadowRoot!.activeElement).toBe(trigger(g));
  });

  it('mirrors disabled (and loading) buttons as disabled items that do nothing, and follows changes', async () => {
    const g = await mount('overflow="menu"', OUTCOMES.replace('id="callback"', 'id="callback" disabled'), '390px');
    let clicked = 0;
    $('#callback').addEventListener('click', () => clicked++);
    const item = (i: number) => more(g).items[i];
    expect(item(3)).toMatchObject({ label: 'Will renew: call back', disabled: true });
    more(g).show();
    await more(g).updateComplete;
    const rows = [...more(g).shadowRoot!.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    expect(rows[3].getAttribute('aria-disabled')).toBe('true');
    rows[3].click();
    await settle();
    expect(clicked).toBe(0);
    more(g).hide();
    $('#callback').removeAttribute('disabled');
    $('#renewed').setAttribute('loading', '');
    await settle();
    expect(item(3).disabled).toBeUndefined();
    expect(item(2).disabled).toBe(true);
  });

  it('restores the buttons when there is room again', async () => {
    const g = await mount('overflow="menu"', OUTCOMES, '320px');
    expect(g.overflowing.length).toBeGreaterThan(2);
    const events: string[][] = [];
    g.addEventListener('cm-overflow-change', (e) => events.push(ids((e as CustomEvent).detail.hidden)));
    await resize(1200);
    expect(g.overflowing).toEqual([]);
    expect(more(g).hidden).toBe(true);
    expect([...g.querySelectorAll('cm-button')].every((b) => !b.hidden && !b.hasAttribute('data-cm-overflow'))).toBe(true);
    expect(events).toEqual([[]]);
    // Switching back to wrap also restores them.
    await resize(320);
    expect(g.overflowing.length).toBeGreaterThan(2);
    g.overflow = 'wrap';
    await settle();
    expect([...g.querySelectorAll('cm-button')].every((b) => !b.hidden)).toBe(true);
    expect(more(g).hidden).toBe(true);
  });

  it('leaves buttons the app hid alone, and gives a moved button its place back when it is taken out', async () => {
    const g = await mount('overflow="menu"', OUTCOMES.replace('id="renewed"', 'id="renewed" hidden'), '390px');
    expect(ids(g.overflowing)).not.toContain('renewed');
    expect(more(g).items.map((i) => i.label)).not.toContain('Renewed');
    await resize(1200);
    expect($('#renewed').hidden).toBe(true);
    await resize(390);
    const moved = $('#callback');
    expect(moved.hidden).toBe(true);
    document.body.append(moved);
    await settle();
    expect(moved.hidden).toBe(false);
    expect(moved.hasAttribute('data-cm-overflow')).toBe(false);
  });

  it('works at 320px without sideways scrolling', async () => {
    await page.viewport(320, 640);
    const g = await mount('overflow="menu"', OUTCOMES, 'auto');
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(320);
    expect(rect(more(g)).right).toBeLessThanOrEqual(320);
    expect(g.overflowing.length).toBeGreaterThan(0);
  });
});

describe('cm-button-group: More trigger', () => {
  it('matches the buttons\' size: 36 medium, 32 slim, 40 large; `size` overrides', async () => {
    for (const [size, h] of [['medium', 36], ['slim', 32], ['large', 40]] as const) {
      const g = await mount('overflow="menu"', OUTCOMES.replaceAll('<cm-button ', `<cm-button size="${size}" `), '390px');
      expect(Math.round(rect(trigger(g)).height)).toBe(h);
      expect(Math.round(rect(trigger(g)).height)).toBe(Math.round(rect($('#spoke')).height));
    }
    const g = await mount('overflow="menu" size="slim"', OUTCOMES, '390px');
    expect(Math.round(rect(trigger(g)).height)).toBe(32);
  });

  it('more-icon makes it a square icon button named by more-label', async () => {
    const g = await mount('overflow="menu" more-icon more-label="More outcomes"', OUTCOMES, '390px');
    const t = trigger(g);
    expect(t.getAttribute('aria-label')).toBe('More outcomes');
    expect(t.querySelector('cm-icon')!.getAttribute('name')).toBe('more');
    expect(Math.round(rect(t).width)).toBe(36);
    expect(Math.round(rect(t).height)).toBe(36);
    expect(getComputedStyle(t).borderTopColor).not.toBe('rgba(0, 0, 0, 0)');
    g.setAttribute('more-icon', 'chevron-down');
    await settle();
    expect(trigger(g).querySelector('cm-icon')!.getAttribute('name')).toBe('chevron-down');
  });

  it('on touch screens draws the trigger 40px (icon-only 40 x 40) like cm-button; cm-action-menu adds the 44px hit area', () => {
    const text = (CmButtonGroup.styles as any[]).map((s) => s.cssText ?? '').join('\n');
    const touch = text.slice(text.indexOf('@media (pointer: coarse)'));
    expect(touch).toMatch(/\.more::part\(trigger\), \.more\.slim::part\(trigger\) \{ min-height: var\(--cm-control-height-lg, 40px\); \}/);
    expect(touch).toMatch(/\.more\.icon::part\(trigger\), \.more\.icon\.slim::part\(trigger\) \{ width: var\(--cm-control-height-lg, 40px\); \}/);
    expect(text).toMatch(/\.more\.slim::part\(trigger\) \{ min-height: var\(--cm-control-height-sm, 32px\)/);
    expect(text).toMatch(/\.more::part\(trigger\) \{ min-height: var\(--cm-control-height-md, 36px\)/);
  });
});

describe('cm-button-group: accessibility', () => {
  it('moved buttons are hidden (out of the tab order and the accessibility tree); Tab goes through the visible buttons, then More', async () => {
    const g = await mount('overflow="menu"', OUTCOMES, '390px');
    for (const b of g.overflowing) {
      expect(b.hidden).toBe(true);
      expect(getComputedStyle(b).display).toBe('none');
      expect(b.checkVisibility()).toBe(false);
    }
    // Moved buttons can't take focus at all, even from script.
    for (const b of g.overflowing) {
      (b.shadowRoot!.querySelector('[part="control"]') as HTMLElement).focus();
      expect(document.activeElement).not.toBe(b);
    }
    document.body.insertAdjacentHTML('afterbegin', '<button id="before">Before</button>');
    $('#before').focus();
    await userEvent.tab();
    // WebKit on macOS (Playwright) skips buttons on Tab unless the system's "tab to all controls" is on: there the
    // order is checked from the DOM instead (visible buttons are tabbable, More comes after the slot).
    if (document.activeElement === document.body || document.activeElement === $('#before')) {
      const tabbable = [...g.querySelectorAll('cm-button')].filter((b) => b.checkVisibility()).map((b) => b.id);
      expect(tabbable).toEqual(['spoke', 'done']);
      expect(g.shadowRoot!.querySelector('slot')!.compareDocumentPosition(more(g)) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    } else {
      const seen = [document.activeElement!.id];
      for (let i = 0; i < 2; i++) {
        await userEvent.tab();
        const a = document.activeElement!;
        seen.push(a.id || a.localName);
      }
      expect(seen).toEqual(['spoke', 'done', 'cm-button-group']);
      expect(g.shadowRoot!.activeElement).toBe(more(g));
    }
    expect(trigger(g).getAttribute('aria-haspopup')).toBe('menu');
    expect(g.shadowRoot!.querySelector('[role="group"]')).not.toBeNull();
  });
});

describe('cm-button-group: right to left', () => {
  it('puts More at the end side (left) in RTL', async () => {
    document.documentElement.dir = 'rtl';
    const g = await mount('overflow="menu"', OUTCOMES, '390px');
    const visible = [...g.querySelectorAll('cm-button')].filter((b) => !b.hidden);
    expect(ids(visible)).toEqual(['spoke', 'done']);
    expect(rect(more(g)).right).toBeLessThanOrEqual(rect($('#done')).left);
    expect(rect($('#done')).right).toBeLessThanOrEqual(rect($('#spoke')).left);
    expect(Math.round(rect($('#spoke')).right)).toBe(Math.round(rect(g).right));
    document.documentElement.dir = '';
  });
});
