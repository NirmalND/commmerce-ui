import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings, formatDate } from '../localize.js';
import './icon.js';
import './skeleton.js';

const strings = defineStrings('dataTable', {
  /** Shown when there are no rows and no `empty` slot. */
  empty: 'No data',
  /** Announced after a sort. `{direction}` is the common `ascending` or `descending`. */
  sorted: 'Sorted by {column}, {direction}',
});
declare module '../localize.js' { interface CmStrings { dataTable: typeof strings } }

/** One column of a data table. */
export interface DataTableColumn {
  /** The property of each row shown in this column, and the key in `cm-sort`. */
  key: string;
  /** Column heading. */
  label: string;
  /** Text alignment. Default: `end` for `numeric` and `money`, otherwise `start`. */
  align?: 'start' | 'end';
  /** Lets the merchant sort by this column. */
  sortable?: boolean;
  /**
   * How values are compared and laid out. `numeric` and `money` are right-aligned with tabular figures;
   * `date` sorts by date (ISO strings, timestamps or `Date` objects).
   */
  type?: 'text' | 'numeric' | 'money' | 'date';
  /** Heading for screen readers only, e.g. for an actions column. */
  hidden?: boolean;
}

/** A row: column keys to cell values. Values are shown as text, never as HTML. */
export type DataTableRow = Record<string, unknown>;

export type SortDirection = 'ascending' | 'descending';

let sheetAdded = false;
/**
 * Styles for a server-rendered `<table>` written inside `cm-data-table` (light DOM, so it can't be styled
 * from the shadow root). Added to the document once, scoped to `cm-data-table > table`.
 */
const LIGHT_CSS = `
cm-data-table > table { width: 100%; border-collapse: separate; border-spacing: 0; font: inherit; font-size: 14px; line-height: 1.5; color: var(--cm-text-default); }
cm-data-table > table caption { text-align: start; font-weight: 500; font-size: 16px; padding-block-end: var(--cm-space-10); }
cm-data-table > table th { font-size: 12px; font-weight: 400; text-align: start; padding: 7px var(--cm-space-20); background: var(--cm-bg-hover); border-block: var(--cm-border-1) solid var(--cm-border-subtle); white-space: nowrap; }
cm-data-table > table th:first-child { border-inline-start: var(--cm-border-1) solid var(--cm-border-subtle); border-start-start-radius: var(--cm-radius-md); }
cm-data-table > table th:last-child { border-inline-end: var(--cm-border-1) solid var(--cm-border-subtle); border-start-end-radius: var(--cm-radius-md); }
cm-data-table > table td { padding: var(--cm-space-10) var(--cm-space-20); border-block-end: var(--cm-border-1) solid var(--cm-border-default); vertical-align: middle; }
cm-data-table > table tfoot td, cm-data-table > table tfoot th { font-weight: 500; background: var(--cm-bg-surface); border-block: var(--cm-border-1) solid var(--cm-border-default); font-size: 14px; }
cm-data-table > table tbody tr:hover td, cm-data-table > table tbody tr:hover th { background: var(--cm-bg-hover); }
cm-data-table > table th > button.cm-sort { display: inline-flex; align-items: center; gap: 4px; padding: 2px 0; font: inherit; color: inherit; background: none; border: 0; cursor: pointer; text-align: inherit; }
cm-data-table > table th[data-type='numeric'] > button.cm-sort, cm-data-table > table th[data-type='money'] > button.cm-sort { flex-direction: row-reverse; }
cm-data-table > table th > button.cm-sort cm-icon { color: var(--cm-icon-selected); opacity: 0; }
cm-data-table > table th > button.cm-sort:hover cm-icon, cm-data-table > table th[aria-sort='ascending'] cm-icon, cm-data-table > table th[aria-sort='descending'] cm-icon { opacity: 1; }
cm-data-table > table th > button.cm-sort:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
@media (forced-colors: active) { cm-data-table > table th > button.cm-sort cm-icon { opacity: 1; } }
cm-data-table > table .numeric, cm-data-table > table [data-type='numeric'], cm-data-table > table [data-type='money'] { text-align: end; font-variant-numeric: tabular-nums; }
`;
function addLightStyles() {
  if (sheetAdded || typeof document === 'undefined') return;
  sheetAdded = true;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(LIGHT_CSS);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}

const isEnd = (c: DataTableColumn) => (c.align ?? (c.type === 'numeric' || c.type === 'money' ? 'end' : 'start')) === 'end';
/**
 * Reads a number from a cell: 1200, "1,200", "Rs. 1,200", "₹1,200.50", "-500", "(500)" (negative), "12%".
 * Leading text such as a currency is skipped, so its dot is never read as a decimal point.
 */
function toNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const text = String(v ?? '').trim();
  const negative = /^\(.*\)$/.test(text) || /^-|^[^\d]*-\s*\d/.test(text);
  const m = text.match(/\d[\d,]*(?:\.\d+)?/);
  if (!m) return NaN;
  const n = Number(m[0].replace(/,/g, ''));
  return negative ? -n : n;
}
const toTime = (v: unknown) => (v instanceof Date ? v.getTime() : typeof v === 'number' ? v : Date.parse(String(v ?? '')));
const collators = new Map<string, Intl.Collator>();
/** Text sorts by the table's language (`lang`), with numbers inside text compared as numbers. */
function collator(locale?: string) {
  let c = collators.get(locale ?? '');
  if (!c) {
    try { c = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' }); } catch { c = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' }); }
    collators.set(locale ?? '', c);
  }
  return c;
}

/** Compares two cell values the way a column of `type` should sort. Empty values sort last. */
function compare(a: unknown, b: unknown, type: DataTableColumn['type'], locale?: string) {
  const empty = (v: unknown) => v === null || v === undefined || v === '';
  if (empty(a) || empty(b)) return empty(a) === empty(b) ? 0 : empty(a) ? 1 : -1;
  if (type === 'numeric' || type === 'money') return (toNumber(a) || 0) - (toNumber(b) || 0);
  if (type === 'date') return (toTime(a) || 0) - (toTime(b) || 0);
  return collator(locale).compare(String(a), String(b));
}

/**
 * A data table for reports and read-only lists: sales by day, stock by location, order lines.
 * A real `<table>` with column headings, sortable columns, a totals row, a sticky header and first column,
 * loading rows and an empty state. For lists merchants select and act on, use Resource list.
 *
 * Give it `columns` and `rows`, or write a native `<table>` inside it (for server-rendered pages): that
 * table is styled to match. Mark a heading `<th data-sort="text|numeric|money|date">` to make its column sortable
 * in the browser too (a cell's `data-value` is compared instead of its text when present; `data-key` names the
 * column in `cm-sort`). Every sort is announced to screen readers ("Sorted by Net sales, descending").
 * @element cm-data-table
 * @slot - Optional: a native `<table>` to style instead of `columns`/`rows`.
 * @slot empty - Shown instead of the rows when `rows` is empty, e.g. a `cm-empty-state`.
 * @fires cm-sort - `detail: { key, direction }` when a sortable heading is clicked. Cancelable: call
 *   `preventDefault()` to stop the table sorting itself. With `sort-mode="manual"` it never sorts itself.
 * @cssprop --cm-data-table-max-height - With `sticky-header`, the table scrolls inside this height. Default `none`.
 */
export class CmDataTable extends CmLocalizedElement {
  static properties = {
    columns: { type: Array },
    rows: { type: Array },
    totals: { type: Object },
    caption: {},
    captionHidden: { type: Boolean, attribute: 'caption-hidden', reflect: true },
    sort: { reflect: true },
    direction: { reflect: true },
    sortMode: { attribute: 'sort-mode', reflect: true },
    stickyHeader: { type: Boolean, attribute: 'sticky-header', reflect: true },
    stickyFirstColumn: { type: Boolean, attribute: 'sticky-first-column', reflect: true },
    loading: { type: Boolean, reflect: true },
    loadingRows: { type: Number, attribute: 'loading-rows' },
    _light: { state: true },
    _announce: { state: true },
  };

  /** The columns, in order. */
  columns: DataTableColumn[] = [];
  /** The rows: objects keyed by column `key`. Values are shown as text. */
  rows: DataTableRow[] = [];
  /** A totals row shown at the bottom (`<tfoot>`), keyed like a row. Leave a key out for an empty cell. */
  totals: DataTableRow | null = null;
  /** What the table shows, e.g. "Sales by day". Every table needs one; it names the table for screen readers. */
  caption = '';
  /** Keeps the caption for screen readers but hides it, when a card or page heading already says it. */
  captionHidden = false;
  /** Key of the sorted column. Empty: rows stay in the order given. */
  sort = '';
  /** Direction of the sorted column. */
  direction: SortDirection = 'ascending';
  /** `auto`: the table sorts its own rows. `manual`: it only fires `cm-sort` (sort on your server, then set `rows`). */
  sortMode: 'auto' | 'manual' = 'auto';
  /** Keeps the heading row visible while the table scrolls inside `--cm-data-table-max-height`. */
  stickyHeader = false;
  /** Keeps the first column visible while the table scrolls sideways (on narrow screens). */
  stickyFirstColumn = false;
  /** Shows placeholder rows and marks the table busy. */
  loading = false;
  /** How many placeholder rows `loading` shows. */
  loadingRows = 5;

  _light = false;
  _announce = '';
  #userSorted = false;
  #observer = new MutationObserver(() => this.#readLight());

  static styles = [
    base,
    css`
      :host { display: block; font-size: 14px; line-height: 1.5; }
      .scroll { overflow: auto; max-block-size: var(--cm-data-table-max-height, none); }
      .scroll:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      table { inline-size: 100%; border-collapse: separate; border-spacing: 0; }
      caption { text-align: start; font-weight: 500; font-size: 16px; padding-block-end: var(--cm-space-10); }
      :host([caption-hidden]) caption {
        position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
      }
      th, td { padding: var(--cm-space-10) var(--cm-space-20); text-align: start; vertical-align: middle; }
      thead th {
        font-size: 12px; font-weight: 400; padding-block: 7px; white-space: nowrap; color: var(--cm-text-default);
        background: var(--cm-bg-hover); border-block: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      thead th:first-child { border-inline-start: var(--cm-border-1) solid var(--cm-border-subtle); border-start-start-radius: var(--cm-radius-md); }
      thead th:last-child { border-inline-end: var(--cm-border-1) solid var(--cm-border-subtle); border-start-end-radius: var(--cm-radius-md); }
      tbody td, tbody th { font-weight: 400; border-block-end: var(--cm-border-1) solid var(--cm-border-default); background: var(--cm-bg-surface); }
      tbody tr:hover td, tbody tr:hover th { background: var(--cm-bg-hover); }
      tfoot td { font-weight: 500; background: var(--cm-bg-surface); border-block-end: var(--cm-border-1) solid var(--cm-border-default); }
      .end { text-align: end; }
      .num { font-variant-numeric: tabular-nums; }
      :host([sticky-header]) thead th { position: sticky; inset-block-start: 0; z-index: 2; }
      :host([sticky-first-column]) tr > :first-child { position: sticky; inset-inline-start: 0; z-index: 1; }
      :host([sticky-first-column]) thead th:first-child { z-index: 3; }
      :host([sticky-first-column]) tfoot td:first-child { background: var(--cm-bg-surface); }
      .sr { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      button {
        display: inline-flex; align-items: center; gap: 4px; padding: 2px 0; font: inherit; color: inherit;
        background: none; border: 0; cursor: pointer; text-align: inherit;
      }
      .end button { flex-direction: row-reverse; }
      button cm-icon { color: var(--cm-icon-selected); opacity: 0; }
      button:hover cm-icon, button.on cm-icon { opacity: 1; }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .empty td { padding: var(--cm-space-20); border-block-end: 0; }
      .light { display: contents; }
      @media (forced-colors: active) { button cm-icon { opacity: 1; } }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#readLight();
    // subtree: while the page is still being parsed, the table's head and rows arrive after the table itself.
    this.#observer.observe(this, { childList: true, subtree: true });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  #readLight() {
    this._light = !!this.querySelector(':scope > table');
    if (this._light) { addLightStyles(); this.#enhanceLight(); }
  }

  #say(label: string, direction: SortDirection) {
    this._announce = this.t('sorted', { column: label, direction: this.t(direction) });
  }

  /** Server-rendered table: turns `<th data-sort>` headings into sort buttons. */
  #enhanceLight() {
    const table = this.querySelector<HTMLTableElement>(':scope > table');
    const cells = table?.tHead?.rows[0]?.cells;
    if (!cells) return;
    [...cells].forEach((th, index) => {
      if (!th.dataset.sort || th.querySelector(':scope > button.cm-sort')) return;
      th.dataset.type = th.dataset.sort;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cm-sort';
      button.append(...th.childNodes);
      const icon = document.createElement('cm-icon');
      icon.setAttribute('size', '12');
      button.append(icon);
      th.append(button);
      if (!th.hasAttribute('aria-sort')) th.setAttribute('aria-sort', 'none');
      this.#lightIcon(th);
      button.addEventListener('click', () => this.#onLightSort(table!, th, index));
    });
  }

  #lightIcon(th: HTMLTableCellElement) {
    th.querySelector(':scope > button.cm-sort > cm-icon')?.setAttribute('name', th.getAttribute('aria-sort') === 'descending' ? 'chevron-down' : 'chevron-up');
  }

  #onLightSort(table: HTMLTableElement, th: HTMLTableCellElement, index: number) {
    const label = (th.querySelector(':scope > button.cm-sort')?.textContent ?? '').trim();
    const key = th.dataset.key || label;
    const direction: SortDirection = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
    const ev = new CustomEvent('cm-sort', { detail: { key, direction }, bubbles: true, composed: true, cancelable: true });
    if (!this.dispatchEvent(ev) || this.sortMode === 'manual') return;
    const type = th.dataset.sort as DataTableColumn['type'];
    const sign = direction === 'descending' ? -1 : 1;
    for (const body of table.tBodies) {
      const value = (r: HTMLTableRowElement) => { const c = r.cells[index]; return c ? (c.dataset.value ?? c.textContent ?? '').trim() : ''; };
      const sorted = [...body.rows].map((r, i) => [r, value(r), i] as const).sort(([, a, i], [, b, j]) => {
        if (a === '' || b === '') return a === b ? i - j : a === '' ? 1 : -1;
        return sign * compare(a, b, type, this.locale) || i - j;
      });
      body.append(...sorted.map(([r]) => r));
    }
    for (const other of table.tHead!.rows[0].cells) {
      if (!other.dataset.sort) continue;
      other.setAttribute('aria-sort', other === th ? direction : 'none');
      this.#lightIcon(other);
    }
    this.#say(label, direction);
  }

  /** The rows in display order: sorted when `sort` is set and `sort-mode` is `auto`. */
  get sortedRows(): DataTableRow[] {
    const rows = [...(this.rows ?? [])];
    const col = this.columns.find((c) => c.key === this.sort);
    if (!col || this.sortMode === 'manual') return rows;
    const sign = this.direction === 'descending' ? -1 : 1;
    // Stable sort; empty values stay last in both directions.
    return rows.map((r, i) => [r, i] as const).sort(([a, i], [b, j]) => {
      const av = a[col.key], bv = b[col.key];
      const emptyA = av === null || av === undefined || av === '', emptyB = bv === null || bv === undefined || bv === '';
      if (emptyA || emptyB) return emptyA === emptyB ? i - j : emptyA ? 1 : -1;
      return sign * compare(av, bv, col.type, this.locale) || i - j;
    }).map(([r]) => r);
  }

  #onSort(c: DataTableColumn) {
    const direction: SortDirection = this.sort === c.key && this.direction === 'ascending' ? 'descending' : 'ascending';
    const ev = new CustomEvent('cm-sort', { detail: { key: c.key, direction }, bubbles: true, composed: true, cancelable: true });
    // In manual mode the page sorts and then sets `sort`/`direction`; the announcement waits for that.
    const ok = this.dispatchEvent(ev);
    this.#userSorted = ok;
    if (ok && this.sortMode !== 'manual') {
      this.sort = c.key;
      this.direction = direction;
    }
  }

  updated(changed: Map<string, unknown>) {
    if (this.#userSorted && (changed.has('sort') || changed.has('direction')) && this.sort) {
      this.#userSorted = false;
      const col = this.columns.find((c) => c.key === this.sort);
      if (col) this.#say(col.label, this.direction);
    }
  }

  #text(v: unknown) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return formatDate(v, {}, this.locale);
    return String(v);
  }

  #cls(c: DataTableColumn) {
    return `${isEnd(c) ? 'end' : ''} ${c.type === 'numeric' || c.type === 'money' ? 'num' : ''}`;
  }

  render() {
    const status = html`<span class="sr" role="status">${this._announce}</span>`;
    if (this._light) return html`<div class="scroll" part="scroll"><slot></slot></div>${status}`;
    const cols = this.columns ?? [];
    const rows = this.sortedRows;
    const n = Math.max(1, cols.length);
    const showEmpty = !this.loading && rows.length === 0;
    return html`
      <div class="scroll" part="scroll" tabindex=${this.stickyHeader || this.stickyFirstColumn ? '0' : nothing}
        role=${this.stickyHeader || this.stickyFirstColumn ? 'region' : nothing}
        aria-label=${(this.stickyHeader || this.stickyFirstColumn) && this.caption ? this.caption : nothing}>
        <table part="table" aria-busy=${this.loading ? 'true' : 'false'}>
          ${this.caption ? html`<caption part="caption">${this.caption}</caption>` : nothing}
          <thead><tr>${cols.map((c) => {
            const on = this.sort === c.key;
            const state = on ? this.direction : 'none';
            const label = c.hidden ? html`<span class="sr">${c.label}</span>` : c.label;
            return html`<th scope="col" class=${this.#cls(c)} aria-sort=${c.sortable ? state : nothing}>${c.sortable
              ? html`<button type="button" class=${on ? 'on' : ''} @click=${() => this.#onSort(c)}>${label}<cm-icon
                  name=${on && this.direction === 'descending' ? 'chevron-down' : 'chevron-up'} size="12"></cm-icon></button>`
              : label}</th>`;
          })}</tr></thead>
          <tbody>
            ${this.loading
              ? Array.from({ length: Math.max(1, this.loadingRows) }, () => html`<tr>${cols.map((c) =>
                  html`<td class=${this.#cls(c)}><cm-skeleton></cm-skeleton></td>`)}</tr>`)
              : rows.map((r) => html`<tr part="row">${cols.map((c, i) => i === 0
                  ? html`<th scope="row" class=${this.#cls(c)} part="cell">${this.#text(r[c.key])}</th>`
                  : html`<td class=${this.#cls(c)} part="cell">${this.#text(r[c.key])}</td>`)}</tr>`)}
            ${showEmpty ? html`<tr class="empty"><td colspan=${n}><slot name="empty">${this.t('empty')}</slot></td></tr>` : nothing}
          </tbody>
          ${this.totals && !this.loading && !showEmpty
            ? html`<tfoot><tr part="totals">${cols.map((c) => html`<td class=${this.#cls(c)}>${this.#text(this.totals![c.key])}</td>`)}</tr></tfoot>`
            : nothing}
        </table>
      </div>${status}
    `;
  }
}
define('cm-data-table', CmDataTable);

declare global { interface HTMLElementTagNameMap { 'cm-data-table': CmDataTable } }
