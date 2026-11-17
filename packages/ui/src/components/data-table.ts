import { html, css, nothing } from 'lit';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings, formatDate } from '../localize.js';
import { adoptDensity } from '../density.js';
import './icon.js';
import './skeleton.js';
import './button.js';

const strings = defineStrings('dataTable', {
  /** Shown when there are no rows and no `empty` slot. */
  empty: 'No data',
  /** Announced after a sort. `{direction}` is the common `ascending` or `descending`. */
  sorted: 'Sorted by {column}, {direction}',
  /** Under a table wider than its box, while there is more to scroll to. */
  scrollHint: 'Scroll for more',
  /** The column picker's button, and the name of its list of choices. */
  columns: 'Columns',
  showColumns: 'Show columns',
  /** Accessible name of a column's resize handle. */
  resize: 'Resize {column} column',
  /** Announced after a column is resized. */
  resized: '{column} column, {width} pixels wide',
  /** With `mobile="priority"` on a narrow table: shows and hides a row's low-priority fields. */
  viewAll: 'View all fields',
  viewLess: 'Hide fields',
  /** Accessible name of a row action: `{action}` is its label, `{name}` the row's first (or `primary`) value. */
  rowAction: '{action}, {name}',
});
declare module '../localize.js' { interface CmStrings { dataTable: typeof strings } }

/** A button in an `actions` column. */
export interface DataTableAction {
  /** Button text, e.g. "Edit". With `iconOnly`, the accessible name (the row's name is added for screen readers). */
  label: string;
  /** Identifies the action in `cm-row-action`. Defaults to the label. */
  value?: string;
  /** A @commmerce/icons name shown before the label. */
  icon?: string;
  /** Shows only the icon (give it one). */
  iconOnly?: boolean;
  /** `critical` for destructive actions such as Delete. */
  tone?: 'critical';
}

/** One column of a data table. */
export interface DataTableColumn {
  /** The property of each row shown in this column, and the key in `cm-sort`. */
  key: string;
  /** Column heading. */
  label: string;
  /** Text alignment. Default: `end` for `numeric`, `money` and `actions`, otherwise `start`. */
  align?: 'start' | 'end';
  /** Lets the merchant sort by this column. */
  sortable?: boolean;
  /**
   * How values are compared and laid out. `text` (the default) stays on one line and ends in "…" when it is too long
   * (the full value shows on hover and is always read by screen readers). `numeric` and `money` are right-aligned with
   * tabular figures; `date` sorts by date (ISO strings, timestamps or `Date` objects); numbers and dates never wrap.
   * `actions` (since 1.6) shows the column's `actions` as buttons, right-aligned, with the heading for screen readers only.
   */
  type?: 'text' | 'numeric' | 'money' | 'date' | 'actions';
  /** Heading for screen readers only, e.g. for an actions column. (It does not hide the column: see `visible`.) */
  hidden?: boolean;
  /** `false` leaves the column out (since 1.6). The column picker lists it, unticked, so the merchant can show it. */
  visible?: boolean;
  /** `low`: with `mobile="priority"`, hidden when the table is 640px wide or less (since 1.6). */
  priority?: 'high' | 'low';
  /** The column that names each row: its cells are row headers and card titles. Default: the first column. */
  primary?: boolean;
  /** Starting width in pixels (since 1.6). Text that doesn't fit ends in "…". Without it, columns size to their content. */
  width?: number;
  /** With `type: 'actions'`: the buttons in every row (since 1.6). A row can list its own as an array under the column's key. */
  actions?: DataTableAction[];
  /**
   * Text cells wrap onto up to this many lines, then end in "…" (since 1.7), instead of staying on one line. Use it for
   * long notes or lists of signals that would otherwise make rows very tall. The full value shows on hover and is
   * always read by screen readers. In a server-rendered `<table>`, put `data-lines="1"` to `"4"` on any element inside a cell (not on the cell itself), e.g. `<td><div data-lines="3">…</div></td>`, or one per list item to keep each item to one line.
   */
  lines?: number;
}

/** A row: column keys to cell values. Values are shown as text, never as HTML. */
export type DataTableRow = Record<string, unknown>;

export type SortDirection = 'ascending' | 'descending';

/** Narrowest a merchant can make a column. */
const MIN_WIDTH = 48;
/** Arrow keys on a resize handle change the width by this much. */
const STEP = 16;

let sheetAdded = false;
/**
 * Styles for a server-rendered `<table>` written inside `cm-data-table` (light DOM, so it can't be styled
 * from the shadow root). Added to the document once, scoped to `cm-data-table > table`.
 * The 1.6 table standard: a 40px heading row in 12px semibold, 48px body rows (40px compact, 44px at least on touch
 * screens), cells padded 12px across and 10px down in 13px text. Mirrors the shadow styles below: change both together.
 */
const LIGHT_CSS = `
cm-data-table > table { width: 100%; border-collapse: separate; border-spacing: 0; font: inherit; font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); font-variant-numeric: tabular-nums; color: var(--cm-text-default); }
cm-data-table > table caption { text-align: start; font-weight: 600; font-size: var(--cm-font-size-16); line-height: var(--cm-line-height-16); padding-block-end: var(--cm-space-8); }
cm-data-table > table th, cm-data-table > table td { box-sizing: border-box; }
cm-data-table > table thead th { height: var(--cm-table-header-height, 40px); font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); font-weight: 600; color: var(--cm-text-tertiary); text-align: start; padding: 0 var(--cm-space-12); background: var(--cm-bg-hover); border-block: var(--cm-border-1) solid var(--cm-border-subtle); white-space: nowrap; }
cm-data-table > table thead th:first-child { border-inline-start: var(--cm-border-1) solid var(--cm-border-subtle); border-start-start-radius: var(--cm-radius-md); }
cm-data-table > table thead th:last-child { border-inline-end: var(--cm-border-1) solid var(--cm-border-subtle); border-start-end-radius: var(--cm-radius-md); }
cm-data-table > table tbody td, cm-data-table > table tbody th, cm-data-table > table tfoot td, cm-data-table > table tfoot th { height: var(--cm-table-row-height, 48px); padding: 10px var(--cm-space-12); border-block-end: var(--cm-border-1) solid var(--cm-border-subtle); vertical-align: middle; text-align: start; }
cm-data-table > table tbody th { font-weight: 400; }
cm-data-table[density="compact"] { --cm-table-row-height: 40px; }
cm-data-table[density="comfortable"] { --cm-table-row-height: 48px; }
@media (pointer: coarse) { cm-data-table > table tbody td, cm-data-table > table tbody th, cm-data-table > table tfoot td { height: max(var(--cm-table-row-height, 48px), var(--cm-control-height-touch, 44px)); } }
cm-data-table > table tfoot td, cm-data-table > table tfoot th { font-weight: 500; background: var(--cm-bg-surface); border-block: var(--cm-border-1) solid var(--cm-border-subtle); color: var(--cm-text-default); }
cm-data-table > table tbody tr:hover td, cm-data-table > table tbody tr:hover th { background: var(--cm-bg-hover); }
cm-data-table > table th > button.cm-sort { display: inline-flex; align-items: center; gap: 4px; padding: 2px 0; font: inherit; color: inherit; background: none; border: 0; cursor: pointer; text-align: inherit; }
cm-data-table > table th[data-type='numeric'] > button.cm-sort, cm-data-table > table th[data-type='money'] > button.cm-sort { flex-direction: row-reverse; }
cm-data-table > table th > button.cm-sort cm-icon { color: var(--cm-icon-selected); opacity: 0; }
cm-data-table > table th > button.cm-sort:hover cm-icon, cm-data-table > table th[aria-sort='ascending'] cm-icon, cm-data-table > table th[aria-sort='descending'] cm-icon { opacity: 1; }
cm-data-table > table th > button.cm-sort:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
@media (forced-colors: active) { cm-data-table > table th > button.cm-sort cm-icon { opacity: 1; } }
cm-data-table > table .numeric, cm-data-table > table [data-type='numeric'], cm-data-table > table [data-type='money'], cm-data-table > table [data-type='actions'] { text-align: end; font-variant-numeric: tabular-nums; }
cm-data-table > table .numeric, cm-data-table > table [data-type='numeric'], cm-data-table > table [data-type='money'], cm-data-table > table [data-type='date'] { white-space: nowrap; }
cm-data-table > table [data-type='actions'] { width: 1%; white-space: nowrap; }
cm-data-table > table td [data-lines] { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow-wrap: anywhere; }
cm-data-table > table td [data-lines='1'] { display: block; white-space: nowrap; text-overflow: ellipsis; overflow-wrap: normal; max-inline-size: var(--cm-data-table-cell-max-width, 320px); }
cm-data-table > table td [data-lines='3'] { -webkit-line-clamp: 3; line-clamp: 3; }
cm-data-table > table td [data-lines='4'] { -webkit-line-clamp: 4; line-clamp: 4; }
cm-data-table > table tbody td[data-type='actions'] { padding-block: 0; }
cm-data-table > table td[data-type='actions'] > * + * { margin-inline-start: var(--cm-space-8); }
cm-data-table:not([row-actions='always']) > table tbody tr:not(:hover):not(:focus-within) td[data-type='actions'] > * { opacity: 0; }
@media (hover: none), (pointer: coarse) { cm-data-table:not([row-actions='always']) > table tbody tr:not(:hover):not(:focus-within) td[data-type='actions'] > * { opacity: 1; } }
cm-data-table[sticky-header] > table thead th { position: sticky; top: var(--cm-data-table-sticky-top, 0px); z-index: 2; transform: translateY(var(--_shift, 0px)); }
/* The host is the size container for its own light table too: WebKit looks a light-DOM element's container up in the
   DOM tree, not through the shadow root's .frame. */
cm-data-table:has(> table) { container-type: inline-size; }
@container (max-width: 640px) {
  cm-data-table[mobile='priority'] > table [data-priority='low'] { display: none; }
  cm-data-table[mobile='cards'] > table, cm-data-table[mobile='cards'] > table tbody, cm-data-table[mobile='cards'] > table tfoot { display: block; }
  cm-data-table[mobile='cards'] > table thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  cm-data-table[mobile='cards'] > table tr { display: block; margin-block-end: var(--cm-space-8); padding: var(--cm-space-12) var(--cm-space-16); border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md); background: var(--cm-bg-surface); }
  cm-data-table[mobile='cards'] > table tr > * { display: flex; justify-content: space-between; gap: var(--cm-space-12); height: auto; padding: var(--cm-space-4) 0; border: 0; background: none; text-align: end; white-space: normal; }
  cm-data-table[mobile='cards'] > table tbody tr:hover > * { background: none; }
  cm-data-table[mobile='cards'] > table tr > :first-child { font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 600; text-align: start; }
  cm-data-table[mobile='cards'] > table tr > :not(:first-child)[data-label]::before { content: attr(data-label); font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); color: var(--cm-text-tertiary); text-align: start; font-weight: 400; }
  cm-data-table[mobile='cards'] > table td[data-type='actions'] { justify-content: flex-start; flex-wrap: wrap; padding-block-start: var(--cm-space-8); }
  cm-data-table[mobile='cards'] > table td[data-type='actions'] > * { opacity: 1; }
}
`;
function addLightStyles() {
  if (sheetAdded || typeof document === 'undefined') return;
  sheetAdded = true;
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(LIGHT_CSS);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
}

const isNum = (c: DataTableColumn) => c.type === 'numeric' || c.type === 'money';
const isEnd = (c: DataTableColumn) => (c.align ?? (isNum(c) || c.type === 'actions' ? 'end' : 'start')) === 'end';
const isText = (c: DataTableColumn) => !c.type || c.type === 'text';
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

/** The composed (shadow-including) parent of a node. */
const up = (n: Element): Element | null => n.parentElement ?? ((n.getRootNode() as ShadowRoot).host ?? null);

/**
 * A data table for reports and lists of records: sales by day, stock by location, accounts, tasks.
 * A real `<table>` with column headings, sortable columns, a totals row, a sticky header and first column,
 * loading rows and an empty state. For lists merchants select and act on in bulk, use Resource list.
 *
 * The table standard (since 1.6): a 40px heading row in 12px semibold; 48px body rows (`density="compact"`: 40px;
 * at least 44px on touch screens) with cells padded 12px across and 10px down in 13px text; numbers, money and
 * actions right-aligned; numbers and dates never wrap; text ends in "…" with the full value on hover.
 * Set `data-cm-density="compact"` on any ancestor to make every table and list in it compact.
 *
 * On phones each table picks a strategy with `mobile` (judged by the table's own width, 640px or less):
 * `scroll` (default) keeps the columns and shows that it scrolls sideways; `cards` turns each row into a card;
 * `priority` hides `priority: 'low'` columns and adds "View all fields" to each row.
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
 * @fires cm-row-action - `detail: { action, row, index }` when a button in an `actions` column is pressed: the action's
 *   `value`, the row object and its index in `rows`.
 * @fires cm-column-resize - `detail: { key, width }` when the merchant resizes a column (`resizable`), in pixels. Store
 *   it and pass it back as the column's `width`.
 * @fires cm-columns-change - `detail: { key, visible, columns }` when the merchant shows or hides a column with the column
 *   picker. `columns` is the new array (the table has already switched to it); store it to keep the choice.
 * @cssprop --cm-data-table-max-height - With `sticky-header`, the table scrolls inside this height. Default `none`: the
 *   heading row sticks to the page or to the nearest scrolling box instead.
 * @cssprop --cm-data-table-sticky-top - With `sticky-header`, how far from the top the heading row sticks, e.g. under a
 *   sticky app header. Default `0px`.
 * @cssprop --cm-data-table-cell-max-width - Widest a text column grows before its text ends in "…". Default `320px` (and never more than 45% of the table's width).
 * @cssprop --cm-table-row-height - Height of body rows. Set by `density`/`data-cm-density`: 48px, compact 40px.
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
    density: { reflect: true },
    mobile: { reflect: true },
    rowActions: { attribute: 'row-actions', reflect: true },
    resizable: { type: Boolean, reflect: true },
    columnPicker: { type: Boolean, attribute: 'column-picker', reflect: true },
    _light: { state: true },
    _announce: { state: true },
    _widths: { state: true },
    _expanded: { state: true },
    _picker: { state: true },
    _overflows: { state: true },
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
  /**
   * Keeps the heading row in view while the rows scroll: inside `--cm-data-table-max-height` when you set one,
   * otherwise under the top of the page or of the nearest scrolling box (plus `--cm-data-table-sticky-top`).
   */
  stickyHeader = false;
  /** Keeps the first column visible while the table scrolls sideways (on narrow screens). */
  stickyFirstColumn = false;
  /** Shows placeholder rows and marks the table busy. */
  loading = false;
  /** How many placeholder rows `loading` shows. */
  loadingRows = 5;
  /**
   * Row height (since 1.6): `comfortable` 48px rows or `compact` 40px rows. Unset: the nearest `data-cm-density` on an
   * ancestor, else comfortable. On touch screens rows are at least 44px tall either way.
   */
  density?: 'comfortable' | 'compact';
  /**
   * What the table does when it is 640px wide or less (since 1.6): `scroll` keeps every column, scrolls sideways and
   * says so ("Scroll for more", faded edges); `cards` shows each row as a card of label and value pairs with the primary
   * column as its title and the actions at the bottom; `priority` hides `priority: 'low'` columns and gives each row a
   * "View all fields" button that shows them. Pick one per table: see the "Tables on phones" pattern.
   */
  mobile: 'scroll' | 'cards' | 'priority' = 'scroll';
  /** `hover` (default): an `actions` column's buttons appear when the row is hovered or has focus (always on touch screens). `always`: always shown. */
  rowActions: 'hover' | 'always' = 'hover';
  /** Adds a resize handle to each heading: drag it, or focus it and press the left and right arrow keys (16px a press). */
  resizable = false;
  /** Adds a "Columns" button above the table that shows and hides columns. */
  columnPicker = false;

  _light = false;
  _announce = '';
  _widths: Record<string, number> = {};
  _expanded = new Set<DataTableRow>();
  _picker = false;
  _overflows = false;
  #userSorted = false;
  #id = nextId('cm-dt');
  #observer = new MutationObserver(() => this.#readLight());
  #resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.#measure());
  #observed: Element[] = [];
  #raf = 0;
  #shift = -1;

  static styles = [
    base,
    css`
      :host { display: block; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-variant-numeric: tabular-nums; }
      :host([density='compact']) { --cm-table-row-height: 40px; }
      :host([density='comfortable']) { --cm-table-row-height: 48px; }
      /* The table's own width decides the phone layout (mobile), not the window's. */
      .frame { container-type: inline-size; }
      .wrap { position: relative; }
      .scroll { overflow: auto; max-block-size: var(--cm-data-table-max-height, none); }
      /* Sticky heading row without a max height: when the table fits, the box stops being a scroll container so the
         heading can stick to the page or an outer scrolling box. (When it scrolls sideways, measure() moves it.) */
      .scroll[data-open] { overflow: visible; }
      .scroll:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      table {
        inline-size: 100%; border-collapse: separate; border-spacing: 0;
        font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13);
      }
      caption { text-align: start; font-weight: 600; font-size: var(--cm-font-size-16); line-height: var(--cm-line-height-16); padding-block-end: var(--cm-space-8); }
      :host([caption-hidden]) caption, .sr {
        position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap;
      }
      th, td { padding: 0 var(--cm-space-12); text-align: start; vertical-align: middle; }
      /* Heading row: 40px, 12px semibold. */
      thead th {
        position: relative; block-size: var(--cm-table-header-height, 40px);
        font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); font-weight: 600; white-space: nowrap; color: var(--cm-text-tertiary);
        background: var(--cm-bg-hover); border-block: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      thead th:first-child { border-inline-start: var(--cm-border-1) solid var(--cm-border-subtle); border-start-start-radius: var(--cm-radius-md); }
      thead th:last-child { border-inline-end: var(--cm-border-1) solid var(--cm-border-subtle); border-start-end-radius: var(--cm-radius-md); }
      /* Body rows: 48px (compact 40px), cells padded 12px across and 10px down, 13px text. */
      tbody td, tbody th, tfoot td {
        block-size: var(--cm-table-row-height, 48px);
        padding-block: 10px; /* scale-exempt: the table standard (#33) pads cells 10px down */
        border-block-end: var(--cm-border-1) solid var(--cm-border-subtle); background: var(--cm-bg-surface);
      }
      tbody td, tbody th { font-weight: 400; }
      @media (pointer: coarse) {
        tbody td, tbody th, tfoot td { block-size: max(var(--cm-table-row-height, 48px), var(--cm-control-height-touch, 44px)); }
      }
      tbody tr:hover td, tbody tr:hover th { background: var(--cm-bg-hover); }
      tfoot td { font-weight: 500; }
      .end { text-align: end; }
      .num { font-variant-numeric: tabular-nums; }
      .nw { white-space: nowrap; }
      /* Text cells: one line, "…" when longer than the column (title shows the full value on hover). 45cqi: at most
         45% of the table's width, so a long name can't push the other columns out of a narrow table. */
      .t { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-inline-size: min(var(--cm-data-table-cell-max-width, 320px), 45cqi); }
      /* A column with a width (set, or resized): exactly that wide, whatever its content. */
      .w { inline-size: var(--_w); min-inline-size: var(--_w); max-inline-size: var(--_w); }
      .w > .t, .w > .h { inline-size: 0; min-inline-size: 100%; max-inline-size: none; }
      .w > .h .t { max-inline-size: none; }
      /* lines (1.7): wrap onto up to N lines, then "…". */
      .t.lines { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--_lines); line-clamp: var(--_lines); white-space: normal; overflow-wrap: anywhere; }
      .h { display: flex; align-items: center; min-inline-size: 0; }
      .end > .h { justify-content: flex-end; }
      .act { inline-size: 1%; white-space: nowrap; }
      tbody .act { padding-block: 0; } /* a 32px button fits a 40px compact row */
      .acts { display: inline-flex; gap: var(--cm-space-8); justify-content: flex-end; vertical-align: middle; transition: opacity var(--cm-duration-fast) var(--cm-easing-standard); }
      /* Row actions appear on hover and while the row has focus. They stay in the accessibility tree and in the tab order
         (opacity only), and are always shown on touch screens, which have no hover. */
      /* data-focus: set from focusin/focusout as well, since WebKit doesn't match :focus-within across the buttons' shadow roots. */
      :host(:not([row-actions='always'])) tbody tr:not(:hover):not(:focus-within):not([data-focus]) .acts { opacity: 0; }
      @media (hover: none), (pointer: coarse) { :host(:not([row-actions='always'])) tbody tr:not(:hover):not(:focus-within):not([data-focus]) .acts { opacity: 1; } }
      :host(:not([row-actions='always'])) tbody tr[data-focus] .acts { opacity: 1; }
      @media (prefers-reduced-motion: reduce) { .acts { transition: none; } }
      :host([sticky-header]) thead th {
        position: sticky; inset-block-start: var(--cm-data-table-sticky-top, 0px); z-index: 2; transform: translateY(var(--_shift, 0px));
      }
      :host([sticky-first-column]) tr > :first-child { position: sticky; inset-inline-start: 0; z-index: 1; }
      :host([sticky-first-column]) thead th:first-child { z-index: 3; }
      :host([sticky-first-column]) tfoot td:first-child { background: var(--cm-bg-surface); }
      button.sort {
        display: inline-flex; align-items: center; gap: 4px; max-inline-size: 100%; min-inline-size: 0; padding: 2px 0; font: inherit; color: inherit;
        background: none; border: 0; cursor: pointer; text-align: inherit;
      }
      .end button.sort { flex-direction: row-reverse; }
      button.sort cm-icon { flex: none; color: var(--cm-icon-selected); opacity: 0; }
      button.sort:hover cm-icon, button.sort.on cm-icon { opacity: 1; }
      button:focus-visible, .rz:focus-visible, input:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      /* Resize handle: a 24px strip centred on the heading's end edge (inside the last heading). */
      .rz {
        position: absolute; inset-block: 0; inset-inline-end: calc(-1 * var(--cm-space-12, 12px)); z-index: 4; inline-size: var(--cm-space-24, 24px);
        cursor: col-resize; touch-action: none; display: flex; justify-content: center;
      }
      th:last-child > .h > .rz { inset-inline-end: 0; }
      .rz::after { content: ''; inline-size: 2px; block-size: 100%; background: transparent; }
      .rz:hover::after, .rz:focus-visible::after, .rz[data-dragging]::after { background: var(--cm-border-strong); }
      .empty td { padding: var(--cm-space-20); border-block-end: 0; block-size: auto; }
      .light { display: contents; }
      /* Scroll affordance: faded edges where there is more, and a hint under the table. */
      .fade {
        position: absolute; inset-block: var(--_cap, 0px) 0; inline-size: var(--cm-space-24); pointer-events: none; z-index: 5; opacity: 0;
        transition: opacity var(--cm-duration-fast) var(--cm-easing-standard);
      }
      .fade.s { inset-inline-start: 0; background: linear-gradient(to right, var(--cm-bg-surface), transparent); }
      .fade.e { inset-inline-end: 0; background: linear-gradient(to left, var(--cm-bg-surface), transparent); }
      :host(:dir(rtl)) .fade.s { background: linear-gradient(to left, var(--cm-bg-surface), transparent); }
      :host(:dir(rtl)) .fade.e { background: linear-gradient(to right, var(--cm-bg-surface), transparent); }
      .frame[data-more-start] .fade.s, .frame[data-more-end] .fade.e { opacity: 1; }
      :host([sticky-first-column]) .fade.s { display: none; }
      @media (prefers-reduced-motion: reduce) { .fade { transition: none; } }
      .hint {
        display: none; align-items: center; justify-content: flex-end; gap: var(--cm-space-4); margin: 0; padding-block-start: var(--cm-space-8);
        font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); color: var(--cm-text-tertiary);
      }
      .frame[data-more-end] .hint { display: flex; }
      /* Column picker. */
      .tools { position: relative; display: flex; justify-content: flex-end; padding-block-end: var(--cm-space-8); }
      .pick {
        display: inline-flex; align-items: center; gap: var(--cm-space-4); block-size: var(--cm-control-height-sm, 32px); padding: 0 var(--cm-space-12);
        font: inherit; font-size: var(--cm-font-size-13); font-weight: 500; color: var(--cm-text-default); cursor: pointer;
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      .pick:hover { background: var(--cm-bg-hover); }
      .panel {
        position: absolute; inset-block-start: 100%; inset-inline-end: 0; z-index: 10; min-inline-size: 200px; margin: 0; padding: var(--cm-space-8);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-md);
      }
      .panel legend { padding: 0; }
      .opt {
        display: flex; align-items: center; gap: var(--cm-space-8); min-block-size: var(--cm-control-height-sm, 32px); padding: 0 var(--cm-space-8);
        font-size: var(--cm-font-size-13); border-radius: var(--cm-radius-sm); cursor: pointer;
      }
      .opt:hover { background: var(--cm-bg-hover); }
      .opt input { inline-size: 16px; block-size: 16px; margin: 0; accent-color: var(--cm-icon-selected); }
      @media (pointer: coarse) {
        .pick { block-size: var(--cm-control-height-touch, 44px); }
        .opt { min-block-size: var(--cm-control-height-touch, 44px); }
      }
      /* Priority strategy: the row's "View all fields" button and the row of low-priority fields it opens. */
      .more-btn {
        display: none; align-items: center; min-block-size: var(--cm-space-24); margin-block-start: var(--cm-space-4); padding: 0;
        font: inherit; font-size: var(--cm-font-size-12); font-weight: 500; color: var(--cm-text-default); text-decoration: underline;
        background: none; border: 0; cursor: pointer;
      }
      tr.more { display: none; }
      tr.more td { block-size: auto; background: var(--cm-bg-hover); }
      .pairs { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); gap: var(--cm-space-4) var(--cm-space-12); margin: 0; }
      .pairs dt { color: var(--cm-text-tertiary); font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-13); }
      .pairs dd { margin: 0; min-inline-size: 0; overflow-wrap: anywhere; }
      .pairs dd.num { text-align: end; white-space: nowrap; }
      /* Cards strategy. */
      .cards { display: none; list-style: none; margin: 0; padding: 0; gap: var(--cm-space-8); font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); }
      .cards-caption { display: none; margin: 0; padding-block-end: var(--cm-space-8); font-weight: 600; font-size: var(--cm-font-size-16); line-height: var(--cm-line-height-16); }
      .card {
        display: grid; gap: var(--cm-space-8); padding: var(--cm-space-12) var(--cm-space-16);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md);
      }
      .card-title { margin: 0; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 600; overflow-wrap: anywhere; }
      .card.total .card-title { font-weight: 500; }
      .card-actions { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); padding-block-start: var(--cm-space-4); }
      @container (max-width: 640px) {
        :host([mobile='cards']) .frame[data-cards] .wrap, :host([mobile='cards']) .frame[data-cards] .hint { display: none; }
        :host([mobile='cards']) .frame[data-cards] .cards { display: grid; }
        :host([mobile='cards']:not([caption-hidden])) .frame[data-cards] .cards-caption { display: block; }
        :host([mobile='priority']) .low { display: none; }
        :host([mobile='priority']) .more-btn { display: inline-flex; }
        :host([mobile='priority']) tr.more { display: table-row; }
      }
      @media (forced-colors: active) { button.sort cm-icon { opacity: 1; } .acts { opacity: 1 !important; } }
    `,
  ];

  #lightOver = (e: Event) => { if ((e.target as Element)?.closest?.('[data-lines]')) this.#onOver(e); };

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('pointerover', this.#lightOver); // server-rendered tables: hover title on [data-lines]
    adoptDensity(this);
    this.#readLight();
    // subtree: while the page is still being parsed, the table's head and rows arrive after the table itself.
    this.#observer.observe(this, { childList: true, subtree: true });
    document.addEventListener('scroll', this.#onAnyScroll, { capture: true, passive: true });
    window.addEventListener('resize', this.#onAnyScroll, { passive: true });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
    this.#resize?.disconnect();
    this.#observed = [];
    document.removeEventListener('scroll', this.#onAnyScroll, { capture: true });
    window.removeEventListener('resize', this.#onAnyScroll);
    document.removeEventListener('pointerdown', this.#onOutside, { capture: true });
  }

  #readLight() {
    this._light = !!this.querySelector(':scope > table');
    if (this._light) { addLightStyles(); this.#enhanceLight(); }
  }

  #say(text: string) {
    // A changed string is announced again even when it reads the same as before.
    this._announce = this._announce === text ? `${text} ` : text;
  }

  #saySort(label: string, direction: SortDirection) {
    this.#say(this.t('sorted', { column: label, direction: this.t(direction) }));
  }

  /** Server-rendered table: turns `<th data-sort>` headings into sort buttons and labels cells for the phone layouts. */
  #enhanceLight() {
    const table = this.querySelector<HTMLTableElement>(':scope > table');
    const cells = table?.tHead?.rows[0]?.cells;
    if (!cells) return;
    const heads = [...cells];
    heads.forEach((th, index) => {
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
    // Cards and priority layouts: each cell learns its heading's label and priority.
    for (const body of [...table!.tBodies, ...(table!.tFoot ? [table!.tFoot] : [])]) {
      for (const row of body.rows) {
        [...row.cells].forEach((cell, i) => {
          const th = heads[i];
          if (!th) return;
          if (!cell.dataset.label) cell.dataset.label = (th.textContent ?? '').trim();
          if (th.dataset.priority && !cell.dataset.priority) cell.dataset.priority = th.dataset.priority;
          if (th.dataset.type === 'actions' && !cell.dataset.type) cell.dataset.type = 'actions';
        });
      }
    }
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
    this.#saySort(label, direction);
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

  /** The columns shown: every column whose `visible` isn't `false`. */
  get visibleColumns(): DataTableColumn[] {
    return (this.columns ?? []).filter((c) => c.visible !== false);
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
      if (col) this.#saySort(col.label, this.direction);
    }
    if (changed.has('columns')) {
      // A column given a new width by the app takes it over from an earlier resize.
      const before = (changed.get('columns') as DataTableColumn[] | undefined) ?? [];
      const next = { ...this._widths };
      let touched = false;
      for (const c of this.columns ?? []) {
        const old = before.find((b) => b.key === c.key);
        if (c.width !== undefined && old?.width !== c.width && next[c.key] !== undefined) { delete next[c.key]; touched = true; }
      }
      if (touched) this._widths = next;
    }
    this.#observe();
    this.#measure();
  }

  /** Watches the scroll box and table for size changes (overflow, sticky heading). */
  #observe() {
    const els = [this.renderRoot.querySelector('.scroll'), this.renderRoot.querySelector('table') ?? this.querySelector(':scope > table')]
      .filter(Boolean) as Element[];
    if (els.length === this.#observed.length && els.every((e, i) => e === this.#observed[i])) return;
    this.#resize?.disconnect();
    els.forEach((e) => this.#resize?.observe(e));
    this.#observed = els;
  }

  /** Scrolling elsewhere on the page only matters to a sticky heading; the table's own scroll and size are watched directly. */
  #onAnyScroll = () => {
    if (this.#raf || !this.stickyHeader) return;
    this.#raf = requestAnimationFrame(() => { this.#raf = 0; this.#measure(); });
  };

  /**
   * Keeps the overflow state, the scroll hint and the sticky heading in step with the layout. Runs after every render,
   * on resize and on any scroll. Writes attributes and one custom property directly, so scrolling never re-renders.
   */
  #measure() {
    const scroll = this.renderRoot?.querySelector<HTMLElement>('.scroll');
    const frame = this.renderRoot?.querySelector<HTMLElement>('.frame');
    if (!scroll || !frame) return;
    const ownHeight = getComputedStyle(scroll).maxBlockSize !== 'none';
    const overflows = scroll.scrollWidth > scroll.clientWidth + 1;
    if (overflows !== this._overflows) this._overflows = overflows;
    // A sticky heading sticks to the page (or an outer box) only if this box isn't a scroll container.
    scroll.toggleAttribute('data-open', this.stickyHeader && !ownHeight && !overflows);
    const pos = Math.abs(scroll.scrollLeft);
    frame.toggleAttribute('data-more-start', overflows && pos > 1);
    frame.toggleAttribute('data-more-end', overflows && pos + scroll.clientWidth < scroll.scrollWidth - 1);
    // The faded edges cover the rows, not the caption above them.
    const caption = (this.renderRoot.querySelector('caption') ?? this.querySelector(':scope > table > caption')) as HTMLElement | null;
    const cap = caption && getComputedStyle(caption).position !== 'absolute' ? `${caption.offsetHeight}px` : '';
    if (scroll.parentElement!.style.getPropertyValue('--_cap') !== cap) scroll.parentElement!.style.setProperty('--_cap', cap);
    // Sticky heading in a table that also scrolls sideways: the box is a scroll container, so position: sticky can't
    // reach the page. Move the heading down by hand instead, as far as the top of whatever is scrolling.
    let shift = 0;
    const table = (this.renderRoot.querySelector('table') ?? this.querySelector(':scope > table')) as HTMLTableElement | null;
    const head = table?.tHead;
    if (this.stickyHeader && !ownHeight && overflows && table && head) {
      const current = this.#shift > 0 ? this.#shift : 0;
      const headTop = head.getBoundingClientRect().top - current;
      const tableBottom = table.getBoundingClientRect().bottom - current;
      let top = 0;
      for (let a = up(this); a && a !== document.documentElement && a !== document.body; a = up(a)) {
        // Like position: sticky, under the scrolling box's top border and padding.
        const cs = getComputedStyle(a);
        if (/(auto|scroll|overlay|hidden|clip)/.test(cs.overflowY)) top = Math.max(top, a.getBoundingClientRect().top + a.clientTop + (parseFloat(cs.paddingTop) || 0));
      }
      top += parseFloat(getComputedStyle(this).getPropertyValue('--cm-data-table-sticky-top')) || 0;
      shift = Math.max(0, Math.min(top - headTop, tableBottom - headTop - head.getBoundingClientRect().height));
    }
    // Resize handles say their column's width (set or measured), as a separator's value.
    for (const handle of this.renderRoot.querySelectorAll<HTMLElement>('.rz')) {
      const now = String(Math.round(handle.closest('th')!.getBoundingClientRect().width));
      if (handle.getAttribute('aria-valuenow') !== now) handle.setAttribute('aria-valuenow', now);
    }
    if (shift !== this.#shift) {
      this.#shift = shift;
      if (shift) scroll.style.setProperty('--_shift', `${shift}px`);
      else scroll.style.removeProperty('--_shift');
    }
  }

  #text(v: unknown) {
    if (v === null || v === undefined) return '';
    if (v instanceof Date) return formatDate(v, {}, this.locale);
    return String(v);
  }

  #width(c: DataTableColumn): number | undefined {
    return this._widths[c.key] ?? c.width;
  }

  #cls(c: DataTableColumn, primary?: DataTableColumn) {
    return [
      isEnd(c) && 'end', isNum(c) && 'num', (isNum(c) || c.type === 'date') && 'nw', c.type === 'actions' && 'act',
      c.priority === 'low' && c !== primary && 'low', this.#width(c) !== undefined && 'w',
    ].filter(Boolean).join(' ');
  }

  #style(c: DataTableColumn) {
    const w = this.#width(c);
    return w === undefined ? nothing : `--_w: ${w}px`;
  }

  /** Shows the full value of a cut-off cell on hover. Screen readers always read the whole text. */
  #onOver(e: Event) {
    const clamped = (e.composedPath()[0] as Element)?.closest?.('[data-lines]') as HTMLElement | null;
    if (clamped && this.contains(clamped)) {
      if (clamped.scrollWidth > clamped.clientWidth + 1 || clamped.scrollHeight > clamped.clientHeight + 1) clamped.title = clamped.textContent?.trim() ?? '';
      else clamped.removeAttribute('title');
      return;
    }
    const cell = (e.composedPath()[0] as Element)?.closest?.('.t') as HTMLElement | null;
    if (!cell) return;
    if (cell.scrollWidth > cell.clientWidth + 1 || cell.scrollHeight > cell.clientHeight + 1) cell.title = cell.textContent ?? '';
    else cell.removeAttribute('title');
  }

  /** Marks the row that has focus (for its actions), and shows a cut-off value's full text. */
  #onFocus(e: FocusEvent) {
    if (e.type === 'focusin') this.#onOver(e);
    const row = (e.composedPath() as Element[]).find((n) => n instanceof HTMLTableRowElement) as HTMLTableRowElement | undefined;
    if (!row) return;
    const into = e.type === 'focusin' || (e.relatedTarget instanceof Node && row.contains(e.relatedTarget));
    row.toggleAttribute('data-focus', into);
  }

  #primary(cols: DataTableColumn[]) {
    return cols.find((c) => c.primary) ?? cols.find((c) => c.type !== 'actions') ?? cols[0];
  }

  #rowName(r: DataTableRow, primary?: DataTableColumn) {
    return primary ? this.#text(r[primary.key]) : '';
  }

  #actionsOf(c: DataTableColumn, r: DataTableRow): DataTableAction[] {
    const own = r[c.key];
    return Array.isArray(own) ? (own as DataTableAction[]) : c.actions ?? [];
  }

  #onAction(a: DataTableAction, r: DataTableRow) {
    const index = (this.rows ?? []).indexOf(r);
    this.dispatchEvent(new CustomEvent('cm-row-action', { detail: { action: a.value ?? a.label, row: r, index }, bubbles: true, composed: true }));
  }

  #actions(c: DataTableColumn, r: DataTableRow, name: string) {
    return html`<span class="acts">${this.#actionsOf(c, r).map((a) => html`<cm-button size="slim" icon=${a.icon ?? nothing}
      ?icon-only=${!!a.iconOnly} label=${a.iconOnly ? this.t('rowAction', { action: a.label, name }) : nothing} tone=${a.tone ?? nothing}
      @click=${() => this.#onAction(a, r)}>${a.label}${a.iconOnly || !name ? nothing : html`<span class="sr">, ${name}</span>`}</cm-button>`)}</span>`;
  }

  #content(c: DataTableColumn, r: DataTableRow, name: string) {
    if (c.type === 'actions') return this.#actions(c, r, name);
    const text = this.#text(r[c.key]);
    if (!isText(c)) return text;
    const lines = Math.trunc(Number(c.lines)) || 0;
    return lines > 1 ? html`<span class="t lines" style="--_lines: ${lines}">${text}</span>` : html`<span class="t">${text}</span>`;
  }

  // Column resizing ----------------------------------------------------------------------------------------------

  #setWidth(c: DataTableColumn, width: number, done: boolean) {
    const w = Math.max(MIN_WIDTH, Math.round(width));
    this._widths = { ...this._widths, [c.key]: w };
    if (!done) return;
    this.#say(this.t('resized', { column: c.label, width: w }));
    this.dispatchEvent(new CustomEvent('cm-column-resize', { detail: { key: c.key, width: w }, bubbles: true, composed: true }));
  }

  #currentWidth(c: DataTableColumn, handle: Element) {
    return this.#width(c) ?? Math.round(handle.closest('th')!.getBoundingClientRect().width);
  }

  #onResizeKey(e: KeyboardEvent, c: DataTableColumn) {
    const key = logicalKey(e, this);
    if (key !== 'ArrowLeft' && key !== 'ArrowRight') return;
    e.preventDefault();
    this.#setWidth(c, this.#currentWidth(c, e.currentTarget as Element) + (key === 'ArrowRight' ? STEP : -STEP), true);
  }

  #onResizeDown(e: PointerEvent, c: DataTableColumn) {
    if (e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget as HTMLElement;
    const start = handle.closest('th')!.getBoundingClientRect().width;
    const x0 = e.clientX;
    const rtl = getComputedStyle(this).direction === 'rtl';
    try { handle.setPointerCapture(e.pointerId); } catch { /* synthetic events have no active pointer */ }
    handle.setAttribute('data-dragging', '');
    let last = start;
    const move = (ev: PointerEvent) => { last = start + (ev.clientX - x0) * (rtl ? -1 : 1); this.#setWidth(c, last, false); };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
      handle.removeAttribute('data-dragging');
      this.#setWidth(c, last, true);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  // Column picker ------------------------------------------------------------------------------------------------

  #togglePicker(open = !this._picker) {
    this._picker = open;
    if (open) document.addEventListener('pointerdown', this.#onOutside, { capture: true });
    else document.removeEventListener('pointerdown', this.#onOutside, { capture: true });
  }

  #onOutside = (e: Event) => {
    const tools = this.renderRoot.querySelector('.tools');
    if (tools && !e.composedPath().includes(tools)) this.#togglePicker(false);
  };

  #onPickerKey(e: KeyboardEvent) {
    if (e.key !== 'Escape' || !this._picker) return;
    e.stopPropagation();
    this.#togglePicker(false);
    this.renderRoot.querySelector<HTMLButtonElement>('.pick')?.focus();
  }

  #setVisible(key: string, visible: boolean) {
    const columns = this.columns.map((c) => (c.key === key ? { ...c, visible } : c));
    this.columns = columns;
    this.dispatchEvent(new CustomEvent('cm-columns-change', { detail: { key, visible, columns }, bubbles: true, composed: true }));
  }

  #renderPicker() {
    const all = this.columns ?? [];
    const primary = this.#primary(this.visibleColumns);
    return html`<div class="tools" part="tools" @keydown=${this.#onPickerKey}>
      <button type="button" class="pick" part="column-picker" aria-expanded=${this._picker ? 'true' : 'false'} aria-controls="${this.#id}-cols"
        @click=${() => this.#togglePicker()}>${this.t('columns')}<cm-icon name="chevron-down" size="16" aria-hidden="true"></cm-icon></button>
      <fieldset class="panel" id="${this.#id}-cols" part="column-panel" ?hidden=${!this._picker}>
        <legend class="sr">${this.t('showColumns')}</legend>
        ${all.map((c) => html`<label class="opt"><input type="checkbox" .checked=${c.visible !== false} ?disabled=${c === primary}
          @change=${(e: Event) => this.#setVisible(c.key, (e.target as HTMLInputElement).checked)} />${c.label}</label>`)}
      </fieldset>
    </div>`;
  }

  // Rendering ------------------------------------------------------------------------------------------------------

  #renderHead(c: DataTableColumn, primary?: DataTableColumn) {
    const on = this.sort === c.key;
    const state = on ? this.direction : 'none';
    const hideLabel = c.hidden || c.type === 'actions';
    const label = hideLabel ? html`<span class="sr">${c.label}</span>` : html`<span class="t">${c.label}</span>`;
    return html`<th scope="col" class=${this.#cls(c, primary)} style=${this.#style(c)} aria-sort=${c.sortable ? state : nothing}><div class="h">${c.sortable
      ? html`<button type="button" class="sort ${on ? 'on' : ''}" @click=${() => this.#onSort(c)}>${label}<cm-icon
          name=${on && this.direction === 'descending' ? 'chevron-down' : 'chevron-up'} size="12"></cm-icon></button>`
      : label}${this.resizable && c.type !== 'actions'
      ? html`<span class="rz" part="resize-handle" role="separator" aria-orientation="vertical" tabindex="0" aria-label=${this.t('resize', { column: c.label })}
          aria-valuemin=${MIN_WIDTH} aria-valuemax="1600"
          @keydown=${(e: KeyboardEvent) => this.#onResizeKey(e, c)} @pointerdown=${(e: PointerEvent) => this.#onResizeDown(e, c)}></span>`
      : nothing}</div></th>`;
  }

  #renderRow(r: DataTableRow, cols: DataTableColumn[], primary: DataTableColumn | undefined, low: DataTableColumn[], index: number) {
    const name = this.#rowName(r, primary);
    const open = this._expanded.has(r);
    const moreId = `${this.#id}-more-${index}`;
    const row = html`<tr part="row">${cols.map((c) => c === primary
      ? html`<th scope="row" class=${this.#cls(c, primary)} style=${this.#style(c)} part="cell">${this.#content(c, r, name)}${low.length
          ? html`<button type="button" class="more-btn" aria-expanded=${open ? 'true' : 'false'} aria-controls=${moreId}
              @click=${() => this.#toggleRow(r)}>${this.t(open ? 'viewLess' : 'viewAll')}</button>` : nothing}</th>`
      : html`<td class=${this.#cls(c, primary)} style=${this.#style(c)} part="cell">${this.#content(c, r, name)}</td>`)}</tr>`;
    // One template whether or not the details are open, so the toggle button (and its focus) survives.
    return html`${row}${low.length && open ? html`<tr class="more" id=${moreId} part="row-details"><td colspan=${cols.length - low.length}>
      <dl class="pairs">${low.map((c) => html`<dt>${c.label}</dt><dd class=${isNum(c) ? 'num' : ''}>${this.#text(r[c.key])}</dd>`)}</dl></td></tr>` : nothing}`;
  }

  #toggleRow(r: DataTableRow) {
    const next = new Set(this._expanded);
    if (next.has(r)) next.delete(r); else next.add(r);
    this._expanded = next;
  }

  #renderCards(rows: DataTableRow[], cols: DataTableColumn[], primary?: DataTableColumn) {
    const fields = cols.filter((c) => c !== primary && c.type !== 'actions');
    const actionCols = cols.filter((c) => c.type === 'actions');
    const card = (r: DataTableRow, total = false) => {
      const name = this.#rowName(r, primary);
      return html`<li class="card ${total ? 'total' : ''}" part="card">
        <p class="card-title">${name}</p>
        ${fields.length ? html`<dl class="pairs">${fields.map((c) => html`<dt>${c.label}</dt><dd class=${isNum(c) ? 'num' : ''}>${this.#text(r[c.key])}</dd>`)}</dl>` : nothing}
        ${!total && actionCols.length ? html`<div class="card-actions">${actionCols.map((c) => this.#actions(c, r, name))}</div>` : nothing}
      </li>`;
    };
    return html`${this.caption ? html`<p class="cards-caption" aria-hidden="true">${this.caption}</p>` : nothing}
      <ul class="cards" part="cards" aria-label=${this.caption || nothing}>${rows.map((r) => card(r))}${this.totals ? card(this.totals, true) : nothing}</ul>`;
  }

  render() {
    const status = html`<span class="sr" role="status">${this._announce}</span>`;
    const hint = html`<p class="hint" part="scroll-hint" aria-hidden="true">${this.t('scrollHint')}<cm-icon name="chevron-right" size="16"></cm-icon></p>`;
    const fades = html`<span class="fade s" aria-hidden="true"></span><span class="fade e" aria-hidden="true"></span>`;
    const region = this.stickyHeader || this.stickyFirstColumn || this._overflows;
    if (this._light) {
      return html`<div class="frame" part="frame"><div class="wrap"><div class="scroll" part="scroll" tabindex=${this._overflows ? '0' : nothing}
        role=${this._overflows ? 'region' : nothing} aria-label=${this._overflows ? this.querySelector('caption')?.textContent?.trim() || nothing : nothing}
        @scroll=${() => this.#measure()}><slot></slot></div>${fades}</div>${hint}</div>${status}`;
    }
    const cols = this.visibleColumns;
    const primary = this.#primary(cols);
    const low = this.mobile === 'priority' ? cols.filter((c) => c.priority === 'low' && c !== primary) : [];
    const rows = this.sortedRows;
    const n = Math.max(1, cols.length);
    const showEmpty = !this.loading && rows.length === 0;
    const cards = this.mobile === 'cards' && !this.loading && rows.length > 0;
    return html`
      <div class="frame" part="frame" ?data-cards=${cards}>
        ${this.columnPicker ? this.#renderPicker() : nothing}
        <div class="wrap">
          <div class="scroll" part="scroll" tabindex=${region ? '0' : nothing}
            role=${region ? 'region' : nothing}
            aria-label=${region && this.caption ? this.caption : nothing} @scroll=${() => this.#measure()}>
            <table part="table" aria-busy=${this.loading ? 'true' : 'false'} @pointerover=${this.#onOver} @focusin=${this.#onFocus}
              @focusout=${this.#onFocus}>
              ${this.caption ? html`<caption part="caption">${this.caption}</caption>` : nothing}
              <thead><tr>${cols.map((c) => this.#renderHead(c, primary))}</tr></thead>
              <tbody>
                ${this.loading
                  ? Array.from({ length: Math.max(1, this.loadingRows) }, () => html`<tr>${cols.map((c) =>
                      html`<td class=${this.#cls(c, primary)} style=${this.#style(c)}><cm-skeleton></cm-skeleton></td>`)}</tr>`)
                  : rows.map((r, i) => this.#renderRow(r, cols, primary, low, i))}
                ${showEmpty ? html`<tr class="empty"><td colspan=${n}><slot name="empty">${this.t('empty')}</slot></td></tr>` : nothing}
              </tbody>
              ${this.totals && !this.loading && !showEmpty
                ? html`<tfoot><tr part="totals">${cols.map((c) => html`<td class=${this.#cls(c, primary)} style=${this.#style(c)}>${c.type === 'actions' ? nothing : this.#text(this.totals![c.key])}</td>`)}</tr></tfoot>`
                : nothing}
            </table>
          </div>
          ${fades}
        </div>
        ${hint}
        ${cards ? this.#renderCards(rows, cols, primary) : nothing}
      </div>${status}
    `;
  }
}
define('cm-data-table', CmDataTable);

declare global { interface HTMLElementTagNameMap { 'cm-data-table': CmDataTable } }
