import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';

// 1.11: the opt-in refined look (data-cm-look="refined"). The default look must not change.
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const root = document.documentElement;
const rgb = (hex: string) => { const n = parseInt(hex.slice(1), 16); return `rgb(${n >> 16}, ${(n >> 8) & 255}, ${n & 255})`; };

async function mount(markup: string) {
  document.body.innerHTML = markup;
  const els = [...document.body.querySelectorAll('*')].filter((e) => e.localName.startsWith('cm-')) as (HTMLElement & { updateComplete?: Promise<unknown> })[];
  for (const e of els) await e.updateComplete;
  await nextFrame();
}
const shadow = (sel: string, inner: string) => document.querySelector(sel)!.shadowRoot!.querySelector(inner) as HTMLElement;

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(root).getPropertyValue('--cm-space-20') && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
});
afterEach(() => { root.removeAttribute('data-cm-look'); root.removeAttribute('data-cm-theme'); });

const MARKUP = `
  <cm-page-header heading="Merchants"></cm-page-header>
  <cm-badge tone="success">Open</cm-badge><cm-badge>Customer</cm-badge>
  <cm-button icon="bell" icon-only label="Notifications" count="12"></cm-button>
  <cm-status-tabs><option value="a" selected>Tickets</option><option value="b">Inbox</option></cm-status-tabs>
  <cm-resource-list label="Views"><cm-resource-item value="a" label="Open" selected>Open</cm-resource-item></cm-resource-list>`;

describe('refined look (1.11)', () => {
  it('default look is unchanged: Poppins, blue counts, black tab line, no badge dot', async () => {
    await mount(MARKUP);
    expect(getComputedStyle(shadow('cm-page-header', 'h1')).fontFamily).toMatch(/^"?Poppins/);
    expect(getComputedStyle(shadow('cm-button', '.count')).backgroundColor).toBe(rgb('#446beb'));
    expect(getComputedStyle(shadow('cm-status-tabs', "button[aria-selected='true']"), '::after').backgroundColor).toBe(rgb('#000000'));
    expect(getComputedStyle(shadow('cm-badge', 'span'), '::before').width).toMatch(/^(0px|auto)$/);
    expect(getComputedStyle(root).getPropertyValue('--cm-bg-page').trim()).toBe('#f6f6f6');
  });

  it('refined: Inter for text, Poppins for the page title, green counts with dark text, green tab line, tinted selected row, badge dot', async () => {
    root.setAttribute('data-cm-look', 'refined');
    await mount(MARKUP);
    expect(getComputedStyle(document.querySelector('cm-badge')!).fontFamily).toMatch(/^"?Inter/);
    expect(getComputedStyle(shadow('cm-page-header', 'h1')).fontFamily).toMatch(/^"?Poppins/);
    const count = getComputedStyle(shadow('cm-button', '.count'));
    expect(count.backgroundColor).toBe(rgb('#1ec81a'));
    expect(count.color).toBe(rgb('#0a0b0a'));
    expect(getComputedStyle(shadow('cm-status-tabs', "button[aria-selected='true']"), '::after').backgroundColor).toBe(rgb('#1ec81a'));
    const item = document.querySelector('cm-resource-item')!;
    expect(getComputedStyle(item.shadowRoot!.querySelector('.row')!).backgroundColor).toBe(rgb('#e4f7e3'));
    const toned = getComputedStyle(shadow("cm-badge[tone='success']", 'span'), '::before');
    expect(toned.width).toBe('6px');
    expect(getComputedStyle(shadow("cm-badge[tone='neutral']", 'span'), '::before').content).toMatch(/^(none|normal)$/);
    expect(getComputedStyle(root).getPropertyValue('--cm-bg-page').trim()).toBe('#f5f6f4');
  });

  it('refined + dark theme uses the dark values, not the light look values', async () => {
    root.setAttribute('data-cm-look', 'refined');
    root.setAttribute('data-cm-theme', 'dark');
    await mount(MARKUP);
    const cs = getComputedStyle(root);
    expect(cs.getPropertyValue('--cm-bg-page').trim()).toBe('#0c0d0c');
    expect(cs.getPropertyValue('--cm-text-default').trim()).toBe('#eef1ec');
    expect(getComputedStyle(shadow('cm-button', '.count')).backgroundColor).toBe(rgb('#1ec81a'));
  });
});
