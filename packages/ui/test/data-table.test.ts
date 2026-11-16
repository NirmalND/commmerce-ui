import { describe, it, expect, beforeEach } from 'vitest';
import '../src/index.js';
import type { CmDataTable, DataTableColumn } from '../src/index.js';

const COLUMNS: DataTableColumn[] = [
  { key: 'day', label: 'Day', type: 'date', sortable: true },
  { key: 'product', label: 'Product', sortable: true },
  { key: 'orders', label: 'Orders', type: 'numeric', sortable: true },
  { key: 'sales', label: 'Sales', type: 'money' },
];
const ROWS = [
  { day: '2026-11-03', product: 'Mug 10', orders: 12, sales: 'Rs. 2,400' },
  { day: '2026-11-01', product: 'mug 2', orders: 3, sales: 'Rs. 600' },
  { day: '2026-11-02', product: 'Apron', orders: 120, sales: 'Rs. 24,000' },
];

const mount = async (markup = '<cm-data-table caption="Sales by day"></cm-data-table>', props: Partial<CmDataTable> = {}) => {
  document.body.innerHTML = markup;
  const el = document.body.firstElementChild as CmDataTable;
  Object.assign(el, { columns: COLUMNS, rows: ROWS }, props);
  await el.updateComplete;
  return el;
};
const sr = (el: CmDataTable) => el.shadowRoot!;
const firstColumn = (el: CmDataTable) => [...sr(el).querySelectorAll('tbody tr')].map((r) => r.children[1].textContent);

beforeEach(() => { document.body.innerHTML = ''; });

describe('cm-data-table', () => {
  it('renders a native table with a caption, column headers and row headers', async () => {
    const el = await mount();
    const table = sr(el).querySelector('table')!;
    expect(table.querySelector('caption')!.textContent).toBe('Sales by day');
    expect([...table.querySelectorAll('thead th')].map((t) => t.getAttribute('scope'))).toEqual(['col', 'col', 'col', 'col']);
    expect(table.querySelectorAll('tbody tr').length).toBe(3);
    expect(table.querySelector('tbody tr > th')!.getAttribute('scope')).toBe('row');
  });

  it('right-aligns numeric and money columns with tabular figures', async () => {
    const el = await mount();
    const cells = sr(el).querySelectorAll('tbody tr:first-child > *');
    expect(cells[2].classList.contains('end')).toBe(true);
    expect(cells[3].classList.contains('end')).toBe(true);
    expect(cells[1].classList.contains('end')).toBe(false);
    expect(getComputedStyle(cells[3]).fontVariantNumeric).toContain('tabular-nums');
  });

  it('marks sortable columns with aria-sort and sorts text, numbers and dates itself', async () => {
    const el = await mount();
    const ths = sr(el).querySelectorAll('thead th');
    expect([...ths].map((t) => t.getAttribute('aria-sort'))).toEqual(['none', 'none', 'none', null]);
    (ths[1].querySelector('button') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(el.sort).toBe('product');
    expect(ths[1].getAttribute('aria-sort')).toBe('ascending');
    expect(firstColumn(el)).toEqual(['Apron', 'mug 2', 'Mug 10']); // case-insensitive, numeric-aware
    (ths[1].querySelector('button') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(ths[1].getAttribute('aria-sort')).toBe('descending');
    expect(firstColumn(el)).toEqual(['Mug 10', 'mug 2', 'Apron']);
    (ths[2].querySelector('button') as HTMLButtonElement).click();
    await el.updateComplete;
    expect([...sr(el).querySelectorAll('tbody tr')].map((r) => r.children[2].textContent)).toEqual(['3', '12', '120']);
    el.sort = 'day'; el.direction = 'ascending';
    await el.updateComplete;
    expect([...sr(el).querySelectorAll('tbody tr')].map((r) => r.children[0].textContent)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03']);
  });

  it('keeps empty values last in both directions', async () => {
    const el = await mount(undefined, { rows: [{ product: 'B', orders: 2 }, { product: 'A', orders: '' }, { product: 'C', orders: 1 }], sort: 'orders' });
    expect(firstColumn(el)).toEqual(['C', 'B', 'A']);
    el.direction = 'descending';
    await el.updateComplete;
    expect(firstColumn(el)).toEqual(['B', 'C', 'A']);
  });

  it('only fires cm-sort with sort-mode="manual", and a cancelled event stops the sort', async () => {
    const el = await mount('<cm-data-table caption="Orders" sort-mode="manual"></cm-data-table>');
    const seen: unknown[] = [];
    el.addEventListener('cm-sort', (e) => seen.push((e as CustomEvent).detail));
    (sr(el).querySelectorAll('thead th button')[1] as HTMLButtonElement).click();
    await el.updateComplete;
    expect(seen).toEqual([{ key: 'product', direction: 'ascending' }]);
    expect(el.sort).toBe('');
    expect(firstColumn(el)).toEqual(['Mug 10', 'mug 2', 'Apron']);

    const auto = await mount();
    auto.addEventListener('cm-sort', (e) => e.preventDefault());
    (sr(auto).querySelectorAll('thead th button')[1] as HTMLButtonElement).click();
    await auto.updateComplete;
    expect(auto.sort).toBe('');
  });

  it('shows cell values as text, never HTML', async () => {
    const el = await mount(undefined, { rows: [{ day: '2026-11-01', product: '<img src=x onerror="window.__pwned=1">', orders: 1 }] });
    const cell = sr(el).querySelector('tbody tr')!.children[1];
    expect(cell.querySelector('img')).toBeNull();
    expect(cell.textContent).toBe('<img src=x onerror="window.__pwned=1">');
  });

  it('shows a totals row in tfoot', async () => {
    const el = await mount(undefined, { totals: { day: 'Total', orders: 135, sales: 'Rs. 27,000' } });
    const foot = sr(el).querySelector('tfoot tr')!;
    expect([...foot.children].map((c) => c.textContent)).toEqual(['Total', '', '135', 'Rs. 27,000']);
  });

  it('shows placeholder rows while loading, and the empty slot when there are no rows', async () => {
    const el = await mount('<cm-data-table caption="Orders" loading loading-rows="3"></cm-data-table>');
    expect(sr(el).querySelector('table')!.getAttribute('aria-busy')).toBe('true');
    expect(sr(el).querySelectorAll('tbody tr').length).toBe(3);
    expect(sr(el).querySelectorAll('cm-skeleton').length).toBe(12);

    const empty = await mount('<cm-data-table caption="Orders"><p slot="empty">No orders yet</p></cm-data-table>', { rows: [], totals: { day: 'Total' } });
    const slot = sr(empty).querySelector('slot[name="empty"]') as HTMLSlotElement;
    expect(slot.assignedElements()[0].textContent).toBe('No orders yet');
    expect(slot.closest('td')!.getAttribute('colspan')).toBe('4');
    expect(sr(empty).querySelector('tfoot')).toBeNull();
  });

  it('styles a server-rendered native table written inside it', async () => {
    document.body.innerHTML = `<cm-data-table><table><caption>Stock</caption>
      <thead><tr><th scope="col">Location</th><th scope="col" data-type="numeric">On hand</th></tr></thead>
      <tbody><tr><td>Bengaluru</td><td data-type="numeric">24</td></tr></tbody></table></cm-data-table>`;
    const el = document.body.firstElementChild as CmDataTable;
    await el.updateComplete;
    expect(sr(el).querySelector('table')).toBeNull();
    expect(sr(el).querySelector('slot')).toBeTruthy();
    const th = el.querySelector('th')!;
    expect(getComputedStyle(th).fontSize).toBe('12px');
    expect(getComputedStyle(el.querySelector('td[data-type="numeric"]')!).textAlign).toBe('end');
  });

  it('makes a scrolling table a named, focusable region', async () => {
    const el = await mount('<cm-data-table caption="Sales by day" sticky-header sticky-first-column></cm-data-table>');
    const scroll = sr(el).querySelector('.scroll')!;
    expect(scroll.getAttribute('role')).toBe('region');
    expect(scroll.getAttribute('aria-label')).toBe('Sales by day');
    expect(scroll.getAttribute('tabindex')).toBe('0');
    expect(getComputedStyle(sr(el).querySelector('thead th')!).position).toBe('sticky');
  });
});

describe('cm-data-table: sorting extras', () => {
  const status = (el: CmDataTable) => sr(el).querySelector('[role="status"]')!.textContent;
  const headButton = (el: CmDataTable, label: string) =>
    [...sr(el).querySelectorAll('thead button')].find((b) => b.textContent!.trim() === label) as HTMLButtonElement;

  it('announces a sort the merchant made, once the rows are in order', async () => {
    const el = await mount();
    expect(status(el)).toBe('');
    headButton(el, 'Orders').click();
    await el.updateComplete; await el.updateComplete;
    expect(status(el)).toBe('Sorted by Orders, ascending');
    headButton(el, 'Orders').click();
    await el.updateComplete; await el.updateComplete;
    expect(status(el)).toBe('Sorted by Orders, descending');
  });

  it('in manual mode, announces when the page applies the sort, not on the click', async () => {
    const el = await mount(undefined, { sortMode: 'manual' });
    el.addEventListener('cm-sort', (e) => setTimeout(() => {
      Object.assign(el, { sort: (e as CustomEvent).detail.key, direction: (e as CustomEvent).detail.direction });
    }, 20));
    headButton(el, 'Product').click();
    await el.updateComplete;
    expect(status(el)).toBe('');
    await new Promise((r) => setTimeout(r, 60));
    await el.updateComplete; await el.updateComplete;
    expect(status(el)).toBe('Sorted by Product, ascending');
  });

  it('sorts a server-rendered table by its data-sort headings, using data-value when given', async () => {
    document.body.innerHTML = `<cm-data-table><table>
      <thead><tr><th>Product</th><th data-sort="money" data-key="sales">Sales</th><th data-sort="date">Date</th></tr></thead>
      <tbody>
        <tr><th>Mug</th><td data-value="2400">Rs. 2,400</td><td>2026-11-03</td></tr>
        <tr><th>Apron</th><td data-value="24000">Rs. 24,000</td><td>2026-11-01</td></tr>
        <tr><th>Bag</th><td data-value="600">Rs. 600</td><td></td></tr>
      </tbody></table></cm-data-table>`;
    const el = document.querySelector('cm-data-table') as CmDataTable;
    await el.updateComplete;
    const names = () => [...el.querySelectorAll('tbody tr th')].map((t) => t.textContent);
    const ths = [...el.querySelectorAll('thead th')] as HTMLTableCellElement[];
    expect(ths[0].querySelector('button')).toBeNull();
    expect(ths[1].getAttribute('aria-sort')).toBe('none');
    const events: unknown[] = [];
    el.addEventListener('cm-sort', (e) => events.push((e as CustomEvent).detail));
    ths[1].querySelector('button')!.click();
    expect(names()).toEqual(['Bag', 'Mug', 'Apron']);
    expect(ths[1].getAttribute('aria-sort')).toBe('ascending');
    ths[1].querySelector('button')!.click();
    expect(names()).toEqual(['Apron', 'Mug', 'Bag']);
    ths[2].querySelector('button')!.click();
    expect(names()).toEqual(['Apron', 'Mug', 'Bag']); // empty date stays last
    expect(ths[1].getAttribute('aria-sort')).toBe('none');
    expect(events).toEqual([{ key: 'sales', direction: 'ascending' }, { key: 'sales', direction: 'descending' }, { key: 'Date', direction: 'ascending' }]);
    await el.updateComplete;
    expect(sr(el).querySelector('[role="status"]')!.textContent).toBe('Sorted by Date, ascending');
  });

  it('leaves a server-rendered table to the server in manual mode', async () => {
    document.body.innerHTML = `<cm-data-table sort-mode="manual"><table>
      <thead><tr><th data-sort="text">Name</th></tr></thead>
      <tbody><tr><td>b</td></tr><tr><td>a</td></tr></tbody></table></cm-data-table>`;
    const el = document.querySelector('cm-data-table') as CmDataTable;
    await el.updateComplete;
    let fired = 0;
    el.addEventListener('cm-sort', () => fired++);
    el.querySelector('thead button')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(fired).toBe(1);
    expect([...el.querySelectorAll('tbody td')].map((t) => t.textContent)).toEqual(['b', 'a']);
  });

  it('does not restyle other tables on the page', async () => {
    document.body.innerHTML = `<cm-data-table><table><tbody><tr><td>x</td></tr></tbody></table></cm-data-table>
      <table id="other"><tbody><tr><td>y</td></tr></tbody></table>`;
    await (document.querySelector('cm-data-table') as CmDataTable).updateComplete;
    const rules = [...document.adoptedStyleSheets].flatMap((s) => [...s.cssRules].map((r) => (r as CSSStyleRule).selectorText ?? ''));
    for (const sel of rules.flatMap((r) => r.split(','))) if (sel.trim()) expect(sel.trim().startsWith('cm-data-table')).toBe(true);
  });
});

describe('cm-data-table: review fixes', () => {
  it('sorts rupee amounts written with "Rs." by value, and reads (500) as negative', async () => {
    const el = await mount(undefined, {
      columns: [{ key: 'name', label: 'Name' }, { key: 'amt', label: 'Amount', type: 'money', sortable: true }],
      rows: [{ name: 'a', amt: 'Rs. 1,200' }, { name: 'b', amt: 'Rs. 600' }, { name: 'c', amt: 'Rs. 24,000.50' }, { name: 'd', amt: '(Rs. 500)' }, { name: 'e', amt: '₹90' }],
      sort: 'amt', direction: 'ascending',
    });
    const names = [...sr(el).querySelectorAll('tbody tr > th')].map((t) => t.textContent);
    expect(names).toEqual(['d', 'e', 'b', 'a', 'c']);
  });

  it('enhances a server-rendered table whose head arrives after the table (page still loading)', async () => {
    document.body.innerHTML = '<cm-data-table><table></table></cm-data-table>';
    const el = document.querySelector('cm-data-table') as CmDataTable;
    await el.updateComplete;
    const table = el.querySelector('table')!;
    table.innerHTML = '<thead><tr><th data-sort="numeric">Qty</th></tr></thead><tbody><tr><td>3</td></tr><tr><td>1</td></tr></tbody>';
    await new Promise((r) => setTimeout(r, 0));
    const button = el.querySelector('thead th button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect([...el.querySelectorAll('tbody td')].map((t) => t.textContent)).toEqual(['1', '3']);
  });
});
