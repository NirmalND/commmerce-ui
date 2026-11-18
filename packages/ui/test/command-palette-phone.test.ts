// cm-command-palette on a 390px phone: full screen, a close button, no Esc keycap. The whole file runs at 390px
// (each file keeps one viewport, see standard-1-6.test.ts).
import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { page } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmCommandPalette } from '../src/index.js';

const shadow = (el: Element, sel: string) => el.shadowRoot!.querySelector(sel) as HTMLElement;
const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const settle = async (el: any) => { await new Promise((r) => setTimeout(r)); await el.updateComplete; await frames(); };

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-24') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
  await page.viewport(390, 800);
});
beforeEach(() => { document.body.innerHTML = ''; });
afterAll(async () => { document.body.innerHTML = ''; await page.viewport(414, 896); });

describe('cm-command-palette on phones', () => {
  it('fills the screen, shows a close button instead of the Esc keycap, and nothing scrolls sideways', async () => {
    document.body.innerHTML = '<button id="opener">Open</button><cm-command-palette></cm-command-palette>';
    const el = document.querySelector('cm-command-palette') as CmCommandPalette;
    el.actions = [{ label: 'Actions', items: [
      { title: 'Switch to a very long dark theme name that has to be cut short on a phone', icon: 'moon', shortcut: 'mod+shift+d' },
    ] }];
    document.getElementById('opener')!.focus();
    el.show(); await settle(el);
    const d = shadow(el, 'dialog').getBoundingClientRect();
    expect(Math.round(d.left)).toBe(0);
    expect(Math.round(d.top)).toBe(0);
    expect(Math.round(d.width)).toBe(390);
    expect(Math.round(d.height)).toBe(800);
    expect(getComputedStyle(shadow(el, '.panel')).borderTopLeftRadius).toBe('0px');
    expect(getComputedStyle(shadow(el, '.esc')).display).toBe('none');
    const x = shadow(el, '.x');
    expect(getComputedStyle(x).display).not.toBe('none');
    expect(x.getAttribute('aria-label')).toBe('Close');
    expect(Math.round(x.getBoundingClientRect().width)).toBeGreaterThanOrEqual(36);
    const list = shadow(el, '.list');
    expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth);
    const row = shadow(el, '[role="option"]').getBoundingClientRect();
    expect(row.right).toBeLessThanOrEqual(390);
    x.click(); await settle(el);
    expect(el.open).toBe(false);
    expect(document.activeElement?.id).toBe('opener');
  });
});
