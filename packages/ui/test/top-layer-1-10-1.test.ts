import { describe, it, expect, beforeAll } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
const box = (el: Element) => el.getBoundingClientRect();
type El = HTMLElement & { updateComplete: Promise<unknown>; open: boolean };

beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) await new Promise((r) => setTimeout(r, 20));
  await page.viewport(1100, 800);
});

/** The element actually painted at the middle of `el` (looking through shadow roots). */
function topAt(el: Element) {
  const r = box(el);
  let hit: Element | null = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  while (hit?.shadowRoot) {
    const inner = hit.shadowRoot.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!inner || inner === hit) break;
    hit = inner;
  }
  return hit;
}

describe('#35: dropdown lists open in the top layer', () => {
  const row = (n: number) => `<cm-resource-item label="Ticket ${n}">Ticket ${n}
    <cm-select slot="actions" size="small" aria-label="Owner of ${n}" style="inline-size:160px" value="r">
      <option value="r">Rahul</option><option value="m">Madhan</option><option value="s">Support Commmerce</option><option value="n">Nirmal</option>
    </cm-select></cm-resource-item>`;
  it('a cm-select in a resource item actions slot, in a flush card in a sidebar layout, opens fully visible over the rows below', async () => {
    document.body.innerHTML = `<cm-layout variant="sidebar" style="width:1000px"><cm-layout-section variant="sidebar">Views</cm-layout-section>
      <cm-layout-section><cm-card flush style="overflow:hidden"><cm-resource-list label="Tickets">${[1, 2, 3, 4].map(row).join('')}</cm-resource-list></cm-card></cm-layout-section></cm-layout>`;
    const sel = document.querySelector('cm-select') as El;
    await sel.updateComplete; await nextFrame();
    sel.shadowRoot!.querySelector<HTMLElement>('.box')!.click();
    await sel.updateComplete; await nextFrame();
    const list = sel.shadowRoot!.querySelector('[role=listbox]') as HTMLElement;
    expect(list.matches(':popover-open')).toBe(true);
    const opts = [...list.querySelectorAll('[role=option]')];
    for (const o of opts) {
      const hit = topAt(o);
      expect(hit === o || o.contains(hit)).toBe(true); // painted on top, not covered by row 2's select
    }
    const trig = box(sel.shadowRoot!.querySelector('.box')!);
    expect(Math.abs(box(list).top - (trig.bottom + 4))).toBeLessThanOrEqual(1);
    expect(box(list).width).toBeGreaterThanOrEqual(trig.width - 0.5);
  });
  it('works with the keyboard as before: arrows move, Enter picks, Escape closes', async () => {
    const sel = document.querySelector('cm-select') as El & { value: string };
    const boxEl = sel.shadowRoot!.querySelector<HTMLElement>('.box')!;
    sel.open = false; await sel.updateComplete;
    boxEl.focus();
    await userEvent.keyboard('{ArrowDown}');
    await sel.updateComplete;
    expect(sel.open).toBe(true);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    await sel.updateComplete;
    expect(sel.value).toBe('m');
    expect(sel.open).toBe(false);
    expect(sel.shadowRoot!.querySelector('[role=listbox]')!.matches(':popover-open')).toBe(false);
  });
  it('opens above its box near the bottom of the window', async () => {
    document.body.innerHTML = `<div style="position:fixed;bottom:12px;left:20px;width:200px"><cm-select aria-label="Status" value="a">
      <option value="a">Open</option><option value="b">Waiting</option><option value="c">On hold</option><option value="d">Closed</option></cm-select></div>`;
    const sel = document.querySelector('cm-select') as El;
    await sel.updateComplete;
    sel.shadowRoot!.querySelector<HTMLElement>('.box')!.click();
    await sel.updateComplete; await nextFrame();
    const list = box(sel.shadowRoot!.querySelector('[role=listbox]')!), trig = box(sel.shadowRoot!.querySelector('.box')!);
    expect(list.bottom).toBeLessThanOrEqual(trig.top);
    expect(list.top).toBeGreaterThanOrEqual(0);
  });
});
