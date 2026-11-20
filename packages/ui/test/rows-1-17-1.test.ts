// 1.17.1 (owner rule, 20 Nov 2026): a hover or selected cm-resource-item is highlighted across the list's full width,
// like the bulk-action bar above it. The list's 12px inset moved into each row's padding, so the content stays put:
// the checkbox starts 20px from the list's edge (12px on phones).
import { describe, it, expect, beforeEach } from 'vitest';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';

const frames = (n = 2) => new Promise((r) => { const f = () => (--n ? requestAnimationFrame(f) : r(null)); requestAnimationFrame(f); });

describe('cm-resource-list rows run edge to edge (1.17.1)', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('a selected row fills the list from edge to edge, and its checkbox stays where it was', async () => {
    document.body.innerHTML = `<div style="width:600px"><cm-resource-list selectable resource-name="order">
      <cm-resource-item value="o1" selected>#1042 · Priya S.</cm-resource-item>
      <cm-resource-item value="o2">#1041 · Rahul M.</cm-resource-item>
    </cm-resource-list></div>`;
    const list = document.querySelector('cm-resource-list') as any;
    const items = [...list.querySelectorAll('cm-resource-item')] as any[];
    await list.updateComplete; await Promise.all(items.map((i) => i.updateComplete)); await frames();
    const L = list.getBoundingClientRect();
    const row = items[0].shadowRoot.querySelector('.row') as HTMLElement;
    const R = row.getBoundingClientRect();
    expect(getComputedStyle(row).backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(Math.abs(R.left - L.left)).toBeLessThan(0.5);
    expect(Math.abs(R.right - L.right)).toBeLessThan(0.5);
    const box = items[0].shadowRoot.querySelector('.check') as HTMLElement;
    // 20px on desktop; 12px on phones (640px or less), where rows have no inner padding.
    expect(Math.round(box.getBoundingClientRect().left - L.left)).toBe(window.innerWidth > 640 ? 20 : 12);
    // The divider between rows runs edge to edge too.
    expect(Math.abs(items[0].getBoundingClientRect().width - L.width)).toBeLessThan(0.5);
  });
});
