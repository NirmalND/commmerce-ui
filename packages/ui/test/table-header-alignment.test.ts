import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { page } from '@vitest/browser/context';
import '@commmerce/tokens/tokens.css';
import '../src/index.js';
import type { CmResourceList, CmTableHeader } from '../src/index.js';

// commmerce-ui#17: a cm-table-header in a cm-resource-list's header slot lines up with the rows' --cm-table-columns grid.
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r(null)));
const LABELS = ['Name', 'Company', 'Email', 'Phone', 'Owner', 'Status', 'Created'];

// Cells of different lengths, so a grid that sized its tracks from content would drift.
const cells = (row: number) => LABELS.map((l, i) => `<span>${i % 2 ? l : `${l} of row ${row}, a long value`}</span>`).join('');
/** The recommended markup: `columns` on each row, one element per column. */
const columnsRow = (n: number) => `<cm-resource-item value="r${n}" label="Lead ${n}" columns>${cells(n)}</cm-resource-item>`;
/** Hand-made: the app lays the row out itself, as the docs describe. */
const manualRow = (n: number) => `<cm-resource-item value="r${n}" label="Lead ${n}">
      <div style="display:grid;grid-template-columns:var(--cm-table-columns);column-gap:var(--cm-space-20);align-items:center">${cells(n)}</div>
    </cm-resource-item>`;

async function mountList(opts: { selectable: boolean; rtl: boolean; headerSelectable?: boolean; manual?: boolean }) {
  const rows = [1, 2, 3].map(opts.manual ? manualRow : columnsRow).join('');
  document.body.innerHTML = `<div ${opts.rtl ? 'dir="rtl"' : ''}>
    <cm-resource-list ${opts.selectable ? 'selectable' : ''} resource-name="lead" style="--cm-table-columns: 2fr 1.4fr 2fr 1.2fr 1fr 1fr 90px">
      <cm-table-header slot="header" ${opts.headerSelectable ? 'selectable' : ''}>${LABELS.map((l) => `<option>${l}</option>`).join('')}</cm-table-header>
      ${rows}
    </cm-resource-list></div>`;
  const list = document.querySelector('cm-resource-list') as CmResourceList;
  const head = document.querySelector('cm-table-header') as CmTableHeader;
  await list.updateComplete; await head.updateComplete;
  await Promise.all(list.items.map((i) => i.updateComplete));
  await head.updateComplete; await nextFrame();
  return { list, head };
}

function expectAligned(list: CmResourceList, head: CmTableHeader) {
  const headings = [...head.shadowRoot!.querySelectorAll('.cell[part="cell"]')].map((c) => c.getBoundingClientRect());
  expect(headings).toHaveLength(7);
  const rows = list.items.map((item) => (item.columns ? item : item.firstElementChild!));
  expect(rows).toHaveLength(3);
  for (const row of rows) {
    const boxes = [...row.children].map((c) => c.getBoundingClientRect());
    expect(boxes).toHaveLength(7);
    boxes.forEach((cell, i) => {
      expect(Math.abs(headings[i].left - cell.left), `column ${i + 1} left`).toBeLessThanOrEqual(1);
      expect(Math.abs(headings[i].right - cell.right), `column ${i + 1} right`).toBeLessThanOrEqual(1);
    });
  }
}

// tokens.css @imports the font; Firefox and WebKit apply none of its rules until that has loaded (see layout-extra.test.ts).
beforeAll(async () => {
  const end = Date.now() + 10_000;
  while (!getComputedStyle(document.documentElement).getPropertyValue('--cm-space-20') && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 20));
  }
});
beforeEach(async () => {
  document.body.innerHTML = '';
  await page.viewport(1280, 800);
});
afterAll(async () => { await page.viewport(414, 896); });

describe('cm-table-header in cm-resource-list: headings line up with their cells', () => {
  for (const width of [1280, 360]) {
    for (const rtl of [false, true]) {
      for (const selectable of [true, false]) {
        it(`${selectable ? 'selectable' : 'not selectable'}, ${rtl ? 'RTL' : 'LTR'}, ${width}px wide`, async () => {
          await page.viewport(width, 800);
          const { list, head } = await mountList({ selectable, rtl });
          expect(head.getAttribute('resource-rows')).toBe(selectable ? 'selectable' : 'plain');
          expectAligned(list, head);
        });
      }
    }
  }

  it('rows laid out by the app (grid, column-gap space-20, cells with min-width 0) line up too', async () => {
    document.head.insertAdjacentHTML('beforeend', '<style id="cells">cm-resource-item > div > * { min-width: 0 }</style>');
    for (const selectable of [true, false]) {
      const { list, head } = await mountList({ selectable, rtl: false, manual: true });
      expectAligned(list, head);
    }
    document.getElementById('cells')!.remove();
  });

  it('follows the list: turning selection on and off re-aligns the header', async () => {
    const { list, head } = await mountList({ selectable: false, rtl: false });
    list.selectable = true;
    await list.updateComplete; await head.updateComplete;
    await Promise.all(list.items.map((i) => i.updateComplete)); await nextFrame();
    expect(head.resourceRows).toBe('selectable');
    expectAligned(list, head);
    list.selectable = false;
    await list.updateComplete; await head.updateComplete;
    await Promise.all(list.items.map((i) => i.updateComplete)); await nextFrame();
    expect(head.resourceRows).toBe('plain');
    expectAligned(list, head);
  });

  it('a header taken out of the header slot goes back to the standalone bar', async () => {
    const { head } = await mountList({ selectable: true, rtl: false });
    head.removeAttribute('slot');
    await new Promise((r) => setTimeout(r, 0));
    document.body.append(head);
    await head.updateComplete;
    expect(head.hasAttribute('resource-rows')).toBe(false);
  });

  it('one select-all control: the toolbar has it, the header adds none', async () => {
    const { list, head } = await mountList({ selectable: true, rtl: false });
    expect(head.shadowRoot!.querySelector('input[type="checkbox"]')).toBeNull();
    expect(list.shadowRoot!.querySelectorAll('input[type="checkbox"]')).toHaveLength(1);
  });

  it('a header with its own select-all still lines its headings up (both widths)', async () => {
    for (const width of [1280, 360]) {
      await page.viewport(width, 800);
      const { list, head } = await mountList({ selectable: true, rtl: false, headerSelectable: true });
      expectAligned(list, head);
    }
  });

  it('a standalone header keeps its own padding and border', async () => {
    document.body.innerHTML = '<cm-table-header><option>Product</option></cm-table-header>';
    const head = document.querySelector('cm-table-header') as CmTableHeader;
    await head.updateComplete;
    const bar = getComputedStyle(head.shadowRoot!.querySelector('.bar')!);
    expect(head.hasAttribute('resource-rows')).toBe(false);
    expect(bar.paddingInlineStart).toBe('20px');
    expect(bar.borderTopWidth).toBe('1px');
    expect(bar.marginInlineStart).toBe('0px');
  });
});
