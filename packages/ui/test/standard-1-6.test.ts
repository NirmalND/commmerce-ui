// Owner standard (1.6, commmerce-ui#33): card variants, the compact empty state, resource-item actions that wrap (#31),
// the page-header title adornment (#32), status tabs on phones, phone sizes and layout numbers.
// Sizes are checked in px set by the components (paddings, heights, gaps), never against text widths, so the results
// don't depend on the fonts installed. This file runs at 1280px; phone widths are in standard-1-6-phone.test.ts (each file
// keeps one viewport: WebKit under Playwright styles new shadow roots with stale media queries after a mid-file resize).
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmCard, CmEmptyState, CmStatusTabs, CmResourceItem } from '../src/index.js';

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
/** Rules of a component's shadow styles inside media queries whose condition includes `cond`. */
const mediaRules = (el: Element, cond: string) => [...el.shadowRoot!.adoptedStyleSheets].flatMap((s) => [...s.cssRules])
  .filter((r) => r instanceof CSSMediaRule && r.conditionText.includes(cond)).map((r) => r.cssText).join('\n');

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-24') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  document.body.style.margin = '0';
  await page.viewport(1280, 800);
});
beforeEach(() => { document.body.innerHTML = ''; });
afterAll(async () => { document.body.style.margin = ''; await page.viewport(414, 896); });

describe('cm-card variants', () => {
  it('standard: 24px padding, 16px under the header, subtle border, 8px corners', async () => {
    const el = await mount<CmCard>('<cm-card heading="Pricing"><p id="b" style="margin:0">Body</p></cm-card>', 800);
    expect(el.variant).toBe('standard');
    const card = shadow(el, 'section');
    expect([px(card, 'padding-top'), px(card, 'padding-inline-start'), px(card, 'padding-bottom')]).toEqual([24, 24, 24]);
    expect(px(card, 'border-top-left-radius')).toBe(8);
    expect(px(card, 'border-top-width')).toBe(1);
    expect(getComputedStyle(card).boxShadow).toBe('none');
    expect(rect(document.getElementById('b')!).top - rect(shadow(el, 'header')).bottom).toBe(16);
    expect(px(shadow(el, '[role=heading]'), 'font-size')).toBe(16);
    expect(getComputedStyle(shadow(el, '[role=heading]')).fontWeight).toBe('600');
  });
  it('compact: 16px padding and 12px under the header', async () => {
    const el = await mount<CmCard>('<cm-card variant="compact" heading="Due today"><p id="b" style="margin:0">12</p></cm-card>', 400);
    const card = shadow(el, 'section');
    expect([px(card, 'padding-top'), px(card, 'padding-inline-end')]).toEqual([16, 16]);
    expect(rect(document.getElementById('b')!).top - rect(shadow(el, 'header')).bottom).toBe(12);
  });
  it('flush cards keep the variant padding around the header only', async () => {
    const el = await mount<CmCard>('<cm-card heading="Today" flush>x</cm-card>', 800);
    expect(px(shadow(el, 'section'), 'padding-top')).toBe(0);
    expect(px(shadow(el, 'header'), 'padding-top')).toBe(24);
  });

  it('interactive with href: the heading is a link stretched over the card; actions stay separate', async () => {
    const el = await mount<CmCard>(`<cm-card variant="interactive" heading="Renewals" href="#renewals">
      <cm-button slot="actions" size="slim" id="act">Snooze</cm-button><p style="margin:0">8 this month</p></cm-card>`, 600);
    const link = shadow(el, 'a.hit');
    expect(link.getAttribute('href')).toBe('#renewals');
    expect(link.closest('[role=heading]')).toBeTruthy();
    expect(link.textContent!.trim()).toBe('Renewals');
    // The link's ::after covers the card: a point in the body hits the link.
    const card = rect(shadow(el, 'section'));
    const hit = el.shadowRoot!.elementFromPoint(card.left + 12, card.bottom - 6);
    expect(hit).toBe(link);
    // The header action is above the overlay.
    const act = document.getElementById('act')!;
    const a = rect(act);
    expect(document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2)?.closest('cm-button')).toBe(act);
    // A section around a single link is not announced as a region.
    expect(shadow(el, 'section').hasAttribute('aria-label')).toBe(false);
  });

  it('interactive without href: a button that fires cm-action on click, Enter and Space, not from the actions', async () => {
    const el = await mount<CmCard>(`<cm-card variant="interactive compact" heading="Visit plan">
      <cm-button slot="actions" size="slim" id="act">Edit</cm-button>Body</cm-card>`, 600);
    const fired: string[] = [];
    el.addEventListener('cm-action', () => fired.push('action'));
    const btn = shadow(el, 'button.hit');
    expect(btn.getAttribute('type')).toBe('button');
    expect(btn.hasAttribute('aria-pressed')).toBe(false);
    expect(px(shadow(el, 'section'), 'padding-top')).toBe(16); // interactive + compact combine
    await userEvent.click(shadow(el, 'section'), { position: { x: 20, y: 60 } });
    expect(fired).toEqual(['action']);
    await userEvent.click(document.getElementById('act')!);
    expect(fired).toEqual(['action']);
    btn.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(fired).toEqual(['action', 'action', 'action']);
  });

  it('interactive states: hover tints the card, focus-visible draws a ring, selected draws a 2px outline and is announced', async () => {
    const el = await mount<CmCard>('<cm-card variant="interactive" heading="Plan A">x</cm-card>', 600);
    const card = shadow(el, 'section');
    // Hover is checked on the rule (WebKit under Playwright doesn't report :hover inside shadow roots reliably).
    const css = [...el.shadowRoot!.adoptedStyleSheets].flatMap((x) => [...x.cssRules]).map((r) => r.cssText).join('\n');
    expect(css).toMatch(/section:hover \{[^}]*background: var\(--cm-bg-hover\)/);
    expect(css).toMatch(/section:active \{/);
    expect(getComputedStyle(card).cursor).toBe('pointer');
    (document.activeElement as HTMLElement | null)?.blur();
    await userEvent.tab();
    const btn = shadow(el, 'button.hit');
    // Safari's default Tab skips buttons (its "press Tab to highlight each item" setting is off): focus it directly there.
    if (el.shadowRoot!.activeElement !== btn) btn.focus();
    expect(el.shadowRoot!.activeElement).toBe(btn);
    // (WebKit doesn't treat that direct focus as focus-visible: the same limit as the known cm-button ring tests there.)
    if (btn.matches(':focus-visible')) {
      expect(getComputedStyle(btn, '::after').outlineStyle).toBe('solid');
      expect(getComputedStyle(btn, '::after').outlineWidth).toBe('2px');
    }
    const rules = [...el.shadowRoot!.adoptedStyleSheets].flatMap((x) => [...x.cssRules]).map((r) => r.cssText).join('\n');
    expect(rules).toMatch(/\.hit:focus-visible::after \{ outline: 2px solid/);
    el.selected = true; await el.updateComplete;
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(getComputedStyle(card).boxShadow).toContain('inset');
    el.selected = false; await el.updateComplete;
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    const link = await mount<CmCard>('<cm-card variant="interactive" href="#a" selected heading="Plan B">x</cm-card>', 600);
    expect(shadow(link, 'a.hit').getAttribute('aria-current')).toBe('true');
  });

  it('interactive without a heading: a cover control named by label', async () => {
    const el = await mount<CmCard>('<cm-card variant="interactive" label="Open the Ravi Stores account" href="#acct"><p>Ravi Stores</p></cm-card>', 400);
    const a = shadow(el, 'a.hit.cover');
    expect(a.getAttribute('aria-label')).toBe('Open the Ravi Stores account');
    const card = rect(shadow(el, 'section'));
    expect(el.shadowRoot!.elementFromPoint(card.left + card.width / 2, card.top + card.height / 2)).toBe(a);
  });

});

describe('cm-empty-state sizes (owner standard)', () => {
  it('default: a 48px icon tile, 16px heading, 13px text, a 36px action, 8-12px apart', async () => {
    const el = await mount<CmEmptyState>(`<cm-empty-state heading="No visits planned" icon="calendar">Plan a visit to see it here.
      <cm-button slot="actions" variant="primary">Plan a visit</cm-button></cm-empty-state>`, 600);
    expect(el.size).toBe('default');
    const tile = rect(shadow(el, '.circle'));
    expect([tile.width, tile.height]).toEqual([48, 48]);
    expect(rect(shadow(el, '.circle cm-icon')).width).toBe(24);
    const title = shadow(el, '.title');
    expect(px(title, 'font-size')).toBe(16);
    expect(getComputedStyle(title).fontWeight).toBe('600');
    expect(px(shadow(el, '.text'), 'font-size')).toBe(13);
    expect(rect(title).top - tile.bottom).toBe(12);
    const button = el.querySelector('cm-button')!;
    expect(rect(shadow(button, '.btn')).height).toBe(touch() ? 40 : 36);
    const gapToActions = rect(button).top - rect(shadow(el, '.text')).bottom;
    expect(gapToActions).toBeGreaterThanOrEqual(8);
    expect(gapToActions).toBeLessThanOrEqual(12);
  });
  it('size="large" keeps the 160px illustration circle', async () => {
    const el = await mount<CmEmptyState>('<cm-empty-state size="large" heading="No products"></cm-empty-state>', 800);
    expect(rect(shadow(el, '.circle')).width).toBe(160);
    expect(getComputedStyle(shadow(el, '.circle')).borderRadius).not.toBe('8px');
    const def = await mount<CmEmptyState>('<cm-empty-state heading="No products"></cm-empty-state>');
    expect(rect(shadow(def, '.circle')).width).toBe(48);
  });
});

describe('cm-resource-item actions wrap on narrow rows (#31)', () => {
  const row = (attrs = '') => `<cm-resource-list resource-name="task"><cm-resource-item value="1" ${attrs}>
      <strong>Ravi Stores</strong><div>Called 12 Nov, no answer</div>
      <cm-button slot="actions" size="slim">Call</cm-button><cm-button slot="actions" size="slim">Details</cm-button>
      <cm-button slot="actions" size="slim">Set date</cm-button><cm-button slot="actions" size="slim">Not interested</cm-button>
    </cm-resource-item></cm-resource-list>`;
  const parts = (list: Element) => {
    const item = list.querySelector('cm-resource-item') as CmResourceItem;
    return { item, content: rect(shadow(item, '.content')), actions: rect(shadow(item, '.actions')), row: rect(shadow(item, '.row')) };
  };

  it('on desktop the buttons stay on the content line (unchanged), unless actions="wrap" and the row is narrow', async () => {
    const wide = await mount<HTMLElement>(row(), 1000);
    let p = parts(wide);
    expect(p.actions.left).toBeGreaterThanOrEqual(p.content.right);
    expect(p.item.actions).toBe('auto');
    const narrowAuto = await mount<HTMLElement>(row(), 420);
    p = parts(narrowAuto);
    expect(p.actions.top).toBeLessThan(p.content.bottom); // auto wraps only on phones
    const narrowWrap = await mount<HTMLElement>(row('actions="wrap"'), 420);
    p = parts(narrowWrap);
    expect(p.actions.top).toBeGreaterThanOrEqual(p.content.bottom);
    const wideWrap = await mount<HTMLElement>(row('actions="wrap"'), 1000);
    p = parts(wideWrap);
    expect(p.actions.left).toBeGreaterThanOrEqual(p.content.right); // room enough: one line
  });
});

describe('cm-page-header title adornment (#32) and type', () => {
  it('a badge sits beside a short title on one line', async () => {
    for (const w of [1280]) {
      const el = await mount<HTMLElement>(`<cm-page-header heading="Tasks"><cm-badge slot="title-adornment" tone="attention">5 open</cm-badge>
        <cm-button slot="actions">Export</cm-button></cm-page-header>`);
      const text = rect(shadow(el, '.text'));
      const badge = rect(el.querySelector('cm-badge')!);
      expect(badge.left, `${w}px`).toBeGreaterThanOrEqual(text.right);
      expect(badge.left - text.right, `${w}px: 8px gap, not pushed away`).toBeLessThanOrEqual(8.5);
      expect(Math.abs((badge.top + badge.bottom) / 2 - (text.top + text.bottom) / 2), `${w}px`).toBeLessThan(3);
    }
  });
  it('title 24px semibold, description 13px in text-tertiary', async () => {
    const el = await mount<HTMLElement>('<cm-page-header heading="Tasks" description="Calls and visits for your accounts."></cm-page-header>');
    expect(px(shadow(el, 'h1'), 'font-size')).toBe(24);
    expect(px(shadow(el, 'h1'), 'line-height')).toBe(32);
    const desc = shadow(el, '[part=description]');
    expect(desc.textContent).toBe('Calls and visits for your accounts.');
    expect(px(desc, 'font-size')).toBe(13);
    expect(rect(desc).top).toBeGreaterThanOrEqual(rect(shadow(el, 'h1')).bottom);
    const bare = await mount<HTMLElement>('<cm-page-header heading="Tasks"></cm-page-header>');
    expect(shadow(bare, '[part=description]')).toBeNull();
  });
  it('record arrows are 36px icon buttons', async () => {
    const el = await mount<HTMLElement>('<cm-page-header heading="#1001" pagination has-next></cm-page-header>');
    const arrow = rect(shadow(el, '.arrow'));
    expect([arrow.width, arrow.height]).toEqual(touch() ? [40, 40] : [36, 36]);
  });
});

describe('cm-status-tabs on desktop', () => {
  const tabs = (attrs = '') => `<cm-status-tabs ${attrs} aria-label="Task status">
    <option value="a" count="4" selected>Needs a date</option><option value="b" count="12">This week</option>
    <option value="c" count="40">Later</option><option value="d" count="2">Not interested</option><option value="e">Archived</option></cm-status-tabs>`;

  it('fits: no fade; mobile="select" shows the tabs, not the dropdown, on desktop', async () => {
    const fits = await mount<CmStatusTabs>(tabs(), 1000);
    expect(shadow(fits, '.tabs').className).toBe('tabs');
    expect(getComputedStyle(shadow(fits, '.tabs')).maskImage).toBe('none');
    const el = await mount<CmStatusTabs>(tabs('mobile="select"'));
    const select = shadow(el, 'select') as HTMLSelectElement;
    expect(getComputedStyle(select.parentElement!).display).toBe('none');
    expect(getComputedStyle(shadow(el, '.tabs')).display).toBe('flex');
  });
});

describe('phone sizes (pointer: coarse rules)', () => {
  it('buttons draw 40px with a 44px hit area; checkboxes 18px; fields 44px; action-menu trigger 40px', async () => {
    const btn = await mount<HTMLElement>('<cm-button>Save</cm-button>');
    expect(mediaRules(btn, 'pointer: coarse')).toMatch(/min-height: var\(--cm-control-height-lg, 40px\)/);
    expect(mediaRules(btn, 'pointer: coarse')).toMatch(/inset: -2px/);
    const cb = await mount<HTMLElement>('<cm-checkbox label="Done"></cm-checkbox>');
    expect(mediaRules(cb, 'pointer: coarse')).toMatch(/\.box \{ width: 18px; height: 18px;/);
    const tf = await mount<HTMLElement>('<cm-text-field label="Name"></cm-text-field>');
    expect(mediaRules(tf, 'pointer: coarse')).toMatch(/--_cm-field-h: var\(--cm-control-height-touch, 44px\)/);
    const menu = await mount<HTMLElement>('<cm-action-menu icon-only label="Row actions"></cm-action-menu>');
    expect(mediaRules(menu, 'pointer: coarse')).toMatch(/\.trigger\.icon \{ width: var\(--cm-control-height-lg, 40px\)/);
  });
  it('an unlabelled checkbox is 24px tall with its 16px box centred, so it centres in a row', async () => {
    const row = await mount<HTMLElement>('<div style="display:flex;align-items:center;height:48px"><cm-checkbox aria-label="Select"></cm-checkbox><span>Row</span></div>');
    const cb = row.querySelector('cm-checkbox')!;
    const box = rect(shadow(cb, '.box'));
    const r = rect(row);
    expect(Math.abs((box.top + box.bottom) / 2 - (r.top + r.bottom) / 2)).toBeLessThanOrEqual(0.5);
  });
  it('buttons show a pressed state', async () => {
    const btn = await mount<HTMLElement>('<cm-button>Save</cm-button>');
    const css = [...btn.shadowRoot!.adoptedStyleSheets].flatMap((s) => [...s.cssRules]).map((r) => r.cssText).join('\n');
    expect(css).toMatch(/\.btn:active/);
  });
});

describe('layout numbers', () => {
  it('side navigation 220px with 36px rows padded 12px; header bar 56px; page padding 24px; layout gap 24px', async () => {
    const nav = await mount<HTMLElement>('<cm-side-navigation><cm-nav-item label="Orders" icon="bag" href="#o"></cm-nav-item></cm-side-navigation>');
    expect(rect(nav).width).toBe(220);
    const item = shadow(nav, '.item');
    expect(rect(item).height).toBe(touch() ? 44 : 36);
    expect([px(item, 'padding-inline-start'), px(item, 'padding-inline-end')]).toEqual([12, 12]);
    const bar = await mount<HTMLElement>('<cm-header-bar user-name="Asha Rao"></cm-header-bar>');
    expect(rect(shadow(bar, 'header')).height).toBe(56);
    const pg = await mount<HTMLElement>('<cm-page><p>x</p></cm-page>');
    const content = shadow(pg, '.content');
    expect(px(content, 'padding-top')).toBe(24);
    expect(px(content, 'max-inline-size')).toBe(1600);
    const layout = await mount<HTMLElement>('<cm-layout><cm-layout-section variant="one-half">a</cm-layout-section><cm-layout-section variant="one-half">b</cm-layout-section></cm-layout>', 1000);
    const [a, b] = layout.children;
    expect(rect(b).left - rect(a).right).toBe(24);
  });
  it('section heading type token: 18/26 semibold', () => {
    const v = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(`--cm-type-heading-section-${n}`).trim();
    expect([v('size'), v('line-height'), v('weight')]).toEqual(['18px', '26px', '600']);
  });
});
