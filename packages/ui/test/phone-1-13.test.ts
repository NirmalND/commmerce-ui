// 1.13 phone fixes (from the docs visual review, 19 Nov 2026), at 390px: action-bar buttons wrap inside the bar,
// mobile-menu labels break between words (a badge moves under the label instead), and cm-resource-list mobile="stack".
// The whole file runs at 390px (see standard-1-6.test.ts for why each file keeps one viewport).
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';

const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });
const rect = (el: Element) => el.getBoundingClientRect();
const mount = async <T extends HTMLElement>(markup: string, width?: number): Promise<T> => {
  document.body.innerHTML = `<div id="box" style="${width ? `width:${width}px` : ''}">${markup}</div>`;
  const root = document.getElementById('box')!;
  const all = () => [...root.querySelectorAll('*')].map((c) => (c as any).updateComplete);
  await Promise.all(all()); await frames(); await Promise.all(all()); await frames();
  return root.firstElementChild as T;
};
/** Number of rendered lines of a text node's element: the distinct line tops of its client rects. */
const lines = (el: Element) => {
  const r = document.createRange(); r.selectNodeContents(el);
  return new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size;
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

describe('cm-action-bar on phones', () => {
  it('keeps every action inside the bar: the buttons wrap instead of running off the edge', async () => {
    const el = await mount<HTMLElement>(`<cm-action-bar eyebrow="#ODYOD0744">
      <p style="margin:0">Amount payable: ₹2,234.00</p>
      <cm-button slot="actions" size="large">Cancel order</cm-button>
      <cm-button slot="actions" size="large">Mark as processing</cm-button>
      <cm-button slot="actions" size="large" variant="primary">Mark as paid</cm-button>
    </cm-action-bar>`, 330);
    const bar = rect(el.shadowRoot!.querySelector('.bar')!);
    for (const b of el.querySelectorAll('cm-button')) {
      expect(rect(b).right, b.textContent!).toBeLessThanOrEqual(bar.right + 0.5);
      expect(rect(b).left, b.textContent!).toBeGreaterThanOrEqual(bar.left - 0.5);
    }
  });
});

describe('cm-mobile-menu on phones', () => {
  it('a badge moves under a label rather than splitting the label inside a word', async () => {
    const el = await mount<HTMLElement>(`<cm-mobile-menu store="Store" user-name="Robinson Jain">
      <cm-nav-item label="Panels">
        <cm-nav-item label="Application" icon="apps" href="#apps" badge="3 apps active"></cm-nav-item>
        <cm-nav-item label="Reports" icon="chart" href="#reports"></cm-nav-item>
      </cm-nav-item>
    </cm-mobile-menu>`, 300);
    const labels = [...el.shadowRoot!.querySelectorAll('.label')].filter((l) => l.textContent === 'Application');
    expect(labels).toHaveLength(1);
    expect(lines(labels[0])).toBe(1);
    const row = labels[0].closest('.row')!;
    expect(rect(row.querySelector('.badge')!).right).toBeLessThanOrEqual(rect(row).right + 0.5);
  });
});

describe('cm-resource-list mobile="stack"', () => {
  const list = (mobile: string) => `<cm-resource-list selectable resource-name="product" ${mobile} style="--cm-table-columns: 2fr 1fr 1fr 0.6fr 1fr">
    <cm-table-header slot="header"><option value="name" sortable>Product</option><option>Type</option><option sortable>Price</option><option sortable>Stock</option><option>Availability</option></cm-table-header>
    <cm-resource-item value="p1" label="Hand-block printed scarf" columns><strong>Hand-block printed scarf</strong><span>Accessories</span><span>Rs. 650</span><span>3</span><span><cm-badge tone="information">Low stock</cm-badge></span></cm-resource-item>
  </cm-resource-list>`;

  it('passes the setting to its rows and header', async () => {
    const el = await mount<HTMLElement>(list('mobile="stack"'), 358);
    expect(el.querySelector('cm-resource-item')!.getAttribute('mobile')).toBe('stack');
    expect(el.querySelector('cm-table-header')!.getAttribute('mobile')).toBe('stack');
    (el as any).mobile = 'columns'; await (el as any).updateComplete;
    expect(el.querySelector('cm-resource-item')!.hasAttribute('mobile')).toBe(false);
    expect(el.querySelector('cm-table-header')!.hasAttribute('mobile')).toBe(false);
  });

  it('gives the first cell its own line and keeps the other cells whole, inside the row', async () => {
    const el = await mount<HTMLElement>(list('mobile="stack"'), 358);
    const item = el.querySelector('cm-resource-item')!;
    const [name, type, price, qty, badge] = [...item.children];
    expect(rect(type).top).toBeGreaterThan(rect(name).bottom - 1);
    for (const c of [type, price, qty]) expect(lines(c), c.textContent!).toBe(1);
    expect(lines(name)).toBeLessThanOrEqual(2);
    expect(rect(badge).right).toBeLessThanOrEqual(rect(item).right + 0.5);
    // The header's names wrap the same way: each name whole and inside the list.
    const header = el.querySelector('cm-table-header')!;
    for (const c of header.shadowRoot!.querySelectorAll('.cell')) expect(rect(c).right).toBeLessThanOrEqual(rect(el).right + 0.5);
  });

  it('without it, the columns stay on one line (the 1.12 layout)', async () => {
    const el = await mount<HTMLElement>(list(''), 358);
    const [name, type] = [...el.querySelector('cm-resource-item')!.children];
    expect(Math.abs(rect(type).top - rect(name).top)).toBeLessThan(40);
    expect(rect(type).left).toBeGreaterThan(rect(name).right - 1);
  });
});
