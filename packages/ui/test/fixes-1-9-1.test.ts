import { describe, it, expect, beforeAll } from 'vitest';
import { page } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmInfoItem } from '../src/index.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const box = (el: Element) => el.getBoundingClientRect();

beforeAll(async () => {
  const end = Date.now() + 10_000; // tokens.css waits for its font import in Firefox and WebKit
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  await page.viewport(1100, 800);
});

describe('cm-info-item editable (CRM record "About the company")', () => {
  async function mount(markup: string) {
    document.body.innerHTML = `<div style="width:700px"><cm-info-panel heading="Address information">${markup}</cm-info-panel></div>`;
    const items = [...document.querySelectorAll('cm-info-item')] as CmInfoItem[];
    await Promise.all(items.map((i) => i.updateComplete)); await nextFrame();
    return items;
  }
  it('puts a 28px pencil after the value, centred on its first line, named "Edit {label}"', async () => {
    const [it1] = await mount(`<cm-info-item half label="City" editable>Bengaluru</cm-info-item>`);
    const btn = it1.shadowRoot!.querySelector('.edit') as HTMLButtonElement;
    const value = it1.shadowRoot!.querySelector('.value')!;
    expect(btn.getAttribute('aria-label')).toBe('Edit City');
    expect(Math.round(box(btn).height)).toBe(28);
    const firstLineMid = box(value).top + 10;
    expect(Math.abs(box(btn).top + 14 - firstLineMid)).toBeLessThanOrEqual(1);
    expect(box(btn).left).toBeGreaterThanOrEqual(box(value).right);
    expect(getComputedStyle(btn).borderTopWidth).toBe('0px');
  });
  it('a long value wraps and the pencil stays on its first line', async () => {
    const [it1] = await mount(`<cm-info-item half label="Street" editable>5, 4th Main Rd, NS Palya, BTM 2nd Stage, BTM Layout, Bengaluru, Karnataka</cm-info-item>`);
    const btn = it1.shadowRoot!.querySelector('.edit')!;
    const value = it1.shadowRoot!.querySelector('.value')!;
    expect(box(value).height).toBeGreaterThan(30);
    expect(Math.abs(box(btn).top + 14 - (box(value).top + 10))).toBeLessThanOrEqual(1);
    expect(box(btn).right).toBeLessThanOrEqual(box(it1).right + 0.5);
  });
  it('fires cm-edit, takes edit-label, and is absent without editable', async () => {
    const [a, b] = await mount(`<cm-info-item label="Zip code" editable edit-label="Change the zip code">560076</cm-info-item><cm-info-item label="Country">India</cm-info-item>`);
    let fired = 0; a.addEventListener('cm-edit', () => fired++);
    const btn = a.shadowRoot!.querySelector('.edit') as HTMLButtonElement;
    expect(btn.getAttribute('aria-label')).toBe('Change the zip code');
    btn.click();
    expect(fired).toBe(1);
    expect(b.shadowRoot!.querySelector('.edit')).toBeNull();
  });
});

describe('1.9.2: action menus are not clipped by scrolling containers (CRM board card "…")', () => {
  it('a menu in a narrow scrolling column shows whole, on top, beside its trigger', async () => {
    document.body.innerHTML = `<div style="margin-left:300px;width:160px;height:120px;overflow:auto;border:1px solid">
      <div style="display:flex;justify-content:flex-end"><cm-action-menu icon-only icon="more" label="More">
      <cm-menu-item>Move to Partners</cm-menu-item><cm-menu-item>Move to Website</cm-menu-item><cm-menu-item>Move to Synced</cm-menu-item>
      <cm-menu-item>Move to Verified sync</cm-menu-item></cm-action-menu></div></div>`;
    const menu = document.querySelector('cm-action-menu') as HTMLElement & { open: boolean; updateComplete: Promise<unknown> };
    await menu.updateComplete;
    menu.open = true; await menu.updateComplete; await nextFrame();
    const pop = menu.shadowRoot!.querySelector('.pop') as HTMLElement;
    const col = box(document.querySelector('div')!);
    const p = box(pop), trig = box(menu.shadowRoot!.querySelector('.trigger')!);
    expect(p.height).toBeGreaterThan(col.height); // taller than the column it sits in...
    // ...and the last item is really on screen and on top, not clipped by the column
    const items = [...menu.shadowRoot!.querySelectorAll('[role=menuitem]')];
    const last = box(items[items.length - 1]);
    const hit = menu.shadowRoot!.elementFromPoint(last.left + 10, last.top + last.height / 2);
    expect(hit && (hit === items[items.length - 1] || items[items.length - 1].contains(hit))).toBe(true);
    expect(Math.abs(p.top - (trig.bottom + 4))).toBeLessThanOrEqual(1);
    expect(p.right).toBeLessThanOrEqual(document.documentElement.clientWidth);
    menu.open = false; await menu.updateComplete;
    expect(pop.matches(':popover-open')).toBe(false);
  });
});

describe('1.9.2: cm-account-menu and the header bar order (refresh, notifications, user)', () => {
  it('the account menu is last in the header bar, after the end controls', async () => {
    document.body.innerHTML = `<cm-header-bar><cm-button slot="end" icon-only icon="refresh" label="Refresh"></cm-button>
      <cm-button slot="end" icon-only icon="bell" label="Notifications"></cm-button>
      <cm-account-menu slot="account" name="Nirmal D" meta="Admin" org-name="Commmerce" plan="Standard"><cm-menu-item>Log out</cm-menu-item></cm-account-menu></cm-header-bar>`;
    const acct = document.querySelector('cm-account-menu') as HTMLElement & { show: () => void; updateComplete: Promise<unknown> };
    await acct.updateComplete; await nextFrame();
    const [refresh, bell] = [...document.querySelectorAll('cm-button')];
    expect(box(refresh).right).toBeLessThanOrEqual(box(bell).left);
    expect(box(bell).right).toBeLessThanOrEqual(box(acct).left);
    const trig = acct.shadowRoot!.querySelector('.trigger')!;
    expect(trig.getAttribute('aria-label')).toBe('Account: Nirmal D');
    expect(Math.round(box(trig).width)).toBe(36);
  });
  it('opens a panel with the person, the business and plan, then the choices, aligned to the avatar end', async () => {
    const acct = document.querySelector('cm-account-menu') as HTMLElement & { show: () => void; updateComplete: Promise<unknown> };
    acct.show(); await acct.updateComplete; await nextFrame();
    const sr = acct.shadowRoot!;
    expect(sr.querySelector('[part=profile] strong')!.textContent).toBe('Nirmal D');
    expect(sr.querySelector('[part=org] strong')!.textContent).toBe('Commmerce');
    expect(sr.querySelector('.plan')!.textContent!.trim()).toBe('Standard');
    expect(sr.querySelectorAll('[role=menuitem]').length).toBe(1);
    const pop = box(sr.querySelector('.pop')!), trig = box(sr.querySelector('.trigger')!);
    expect(Math.abs(pop.right - trig.right)).toBeLessThanOrEqual(1);
  });
});
