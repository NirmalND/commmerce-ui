import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('tableHeader', {
  /** Accessible name of the select-all box. */
  selectAll: 'Select all',
  /** Read after a sortable column's name (outside a table). `{direction}` is the common `ascending` or `descending`. */
  sorted: ', sorted {direction}',
  sortable: ', sortable',
});
declare module '../localize.js' { interface CmStrings { tableHeader: typeof strings } }

/** One column of a table header. */
export interface TableColumn {
  /** Identifies the column in `cm-sort`. Defaults to the label. */
  key: string;
  label: string;
  /** Sortable columns become buttons. */
  sortable?: boolean;
  align?: 'start' | 'center' | 'end';
  /** Shown to screen readers only, e.g. for an actions column with no visible label. */
  hidden?: boolean;
}

/**
 * The grey 34px label bar at the top of a table or resource list: column names in 12px type,
 * optional sort buttons and an optional "select all" checkbox.
 *
 * Columns come from `<option>` children or the `columns` property. Lay out the rows with the same
 * grid: set `--cm-table-columns` (a `grid-template-columns` value) on a shared parent.
 * Inside an element with `role="table"` or `role="grid"` it renders a real header row
 * (`row` and `columnheader` roles); elsewhere it is a plain bar whose sort buttons say their state.
 *
 * In the `header` slot of a `cm-resource-list`, the list sets `resource-rows` so the column names line up with the
 * cells of its `cm-resource-item` rows (including the rows' checkbox column when the list is `selectable`). The
 * list's toolbar has the select-all box there: don't also set `selectable` on the header.
 * @element cm-table-header
 * @slot - `<option value="key" sortable align="end">Label</option>` elements.
 * @fires cm-sort - `detail: { key, direction }` when a sortable column is clicked. Set `sort` and `direction` yourself.
 * @fires cm-select-all - `detail: { checked }` when the select-all box is toggled.
 * @cssprop --cm-table-columns - Column widths, e.g. `2fr 1fr 1fr 120px`. Default: equal columns.
 */
export class CmTableHeader extends CmLocalizedElement {
  static properties = {
    columns: { type: Array },
    sort: { reflect: true },
    direction: { reflect: true },
    selectable: { type: Boolean, reflect: true },
    checked: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean, reflect: true },
    resourceRows: { attribute: 'resource-rows', reflect: true },
    _slotted: { state: true },
    _inTable: { state: true },
  };

  /** Columns as strings or `{ key, label, sortable, align, hidden }`. Used instead of `<option>` children when set. */
  columns: Array<string | TableColumn> = [];
  /** Key of the sorted column. */
  sort = '';
  /** Sort direction of the `sort` column. */
  direction: 'ascending' | 'descending' = 'ascending';
  /** Adds a leading "select all" checkbox column (50px, as in Figma). */
  selectable = false;
  /** Select-all box is ticked. */
  checked = false;
  /** Select-all box shows a dash: some rows are selected. */
  indeterminate = false;
  /**
   * Lines the columns up with `cm-resource-item` rows: `plain` matches the rows' padding, `selectable` also leaves
   * room for the rows' checkboxes. Set by `cm-resource-list` on a header in its `header` slot (from its own
   * `selectable`); you don't need to set it. Unset (the default) is the standalone bar.
   */
  resourceRows?: 'plain' | 'selectable';

  _slotted: TableColumn[] = [];
  _inTable = false;
  #id = nextId('cm-th');
  #observer = new MutationObserver(() => this.#readChildren());

  static styles = [
    base,
    css`
      :host { display: block; }
      slot { display: none; } /* <option> children are column data, not content */
      .bar {
        display: grid; grid-template-columns: var(--cm-table-columns, var(--_cols)); align-items: center; column-gap: var(--cm-space-20);
        min-height: 34px; padding: 0 var(--cm-space-20); font-size: 12px; line-height: 1.5; color: var(--cm-text-default);
        background: var(--cm-bg-hover); border: var(--cm-border-1) solid var(--cm-border-subtle);
        border-radius: var(--cm-radius-md) var(--cm-radius-md) 0 0;
      }
      .bar.sel { grid-template-columns: 20px var(--cm-table-columns, var(--_cols)); padding-inline-start: var(--cm-space-10); }
      .cell { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .cell[data-align='center'] { text-align: center; }
      .cell[data-align='end'] { text-align: end; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      button {
        display: inline-flex; align-items: center; gap: 4px; max-width: 100%; padding: 2px 0; font: inherit; color: inherit;
        background: none; border: 0; cursor: pointer;
      }
      button cm-icon { color: var(--cm-icon-selected); opacity: 0; }
      button:hover cm-icon, button.on cm-icon { opacity: 1; }
      button:focus-visible, input:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .check { display: inline-flex; position: relative; width: 20px; height: 20px; }
      input { position: absolute; inset: 0; margin: 0; opacity: 0; cursor: pointer; }
      .box {
        width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; pointer-events: none;
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-xs); background: var(--cm-bg-surface);
      }
      .dash { width: 10px; height: 2px; background: var(--cm-icon-selected); }
      input:focus-visible + .box { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      slot { display: none; }
      /* In a cm-resource-list (resource-rows): the bar's content box matches a row's content box, so the same
         --cm-table-columns grid (with column-gap space-20) lands on the same x positions. Rows are padded space-10
         inline, start with a 20px checkbox and a space-20 gap when selectable, and end with the gap before their
         (possibly empty) actions; on phones: no padding, an 18px checkbox, space-10 gaps.
         The bar reaches out to the list's edges; its border is drawn inside so it takes no room. */
      :host([resource-rows]) .bar {
        margin-inline: calc(-1 * var(--cm-space-10)); padding-inline: var(--cm-space-20) calc(2 * var(--cm-space-20));
        border: 0; box-shadow: inset 0 0 0 var(--cm-border-1) var(--cm-border-subtle);
      }
      :host([resource-rows='selectable']) .bar:not(.sel) { padding-inline-start: calc(var(--cm-space-20) + 20px + var(--cm-space-20)); }
      :host([resource-rows]) .bar.sel > .cell:first-child { overflow: visible; }
      @media (max-width: 640px) {
        :host([resource-rows]) .bar { padding-inline: var(--cm-space-10) calc(2 * var(--cm-space-10)); }
        :host([resource-rows='selectable']) .bar:not(.sel) { padding-inline-start: calc(var(--cm-space-10) + 18px + var(--cm-space-10)); }
        :host([resource-rows]) .bar.sel { grid-template-columns: calc(18px + var(--cm-space-10) - var(--cm-space-20)) var(--cm-table-columns, var(--_cols)); }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._inTable = !!this.parentElement?.closest('table, [role="table"], [role="grid"], [role="treegrid"]');
    this.#readChildren();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  /** The columns in use, normalised. */
  get items(): TableColumn[] {
    if (!this.columns.length) return this._slotted;
    return this.columns.map((c) => (typeof c === 'string' ? { key: c, label: c } : { ...c, key: c.key ?? c.label }));
  }

  #readChildren() {
    this._slotted = [...this.querySelectorAll('option')].map((o) => {
      const label = o.label || o.textContent!.trim();
      return {
        key: o.getAttribute('value') ?? label, label, sortable: o.hasAttribute('sortable'), hidden: o.hasAttribute('hidden'),
        align: (o.getAttribute('align') as TableColumn['align']) ?? 'start',
      };
    });
  }

  #onSort(c: TableColumn) {
    const direction = this.sort === c.key && this.direction === 'ascending' ? 'descending' : 'ascending';
    this.dispatchEvent(new CustomEvent('cm-sort', { detail: { key: c.key, direction }, bubbles: true, composed: true }));
  }

  #onSelectAll(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.checked = checked;
    this.indeterminate = false;
    this.dispatchEvent(new CustomEvent('cm-select-all', { detail: { checked }, bubbles: true, composed: true }));
  }

  render() {
    const t = this._inTable;
    const items = this.items;
    return html`
      <div class="bar ${this.selectable ? 'sel' : ''}" part="bar" role=${t ? 'row' : nothing}
        style="--_cols: repeat(${Math.max(1, items.length)}, minmax(0, 1fr))">
        ${this.selectable
          ? html`<span class="cell" role=${t ? 'columnheader' : nothing}><span class="check">
              <input id="${this.#id}-all" type="checkbox" aria-label=${this.t('selectAll')} .checked=${this.checked} .indeterminate=${this.indeterminate}
                @change=${this.#onSelectAll} />
              <span class="box" aria-hidden="true">${this.indeterminate ? html`<span class="dash"></span>` : this.checked ? html`<cm-icon name="check" size="14"></cm-icon>` : nothing}</span>
            </span></span>`
          : nothing}
        ${items.map((c) => {
          const on = this.sort === c.key;
          const state = on ? (this.direction === 'descending' ? 'descending' : 'ascending') : 'none';
          const label = c.hidden ? html`<span class="sr">${c.label}</span>` : c.label;
          return html`<span class="cell" part="cell" data-align=${c.align ?? 'start'} role=${t ? 'columnheader' : nothing}
            aria-sort=${t && c.sortable ? state : nothing}>${c.sortable
              ? html`<button type="button" class=${on ? 'on' : ''} @click=${() => this.#onSort(c)}>${label}${!t
                  ? html`<span class="sr">${on ? this.t('sorted', { direction: this.t(state) }) : this.t('sortable')}</span>` : nothing}<cm-icon
                  name=${on && this.direction === 'descending' ? 'chevron-down' : 'chevron-up'} size="12"></cm-icon></button>`
              : label}</span>`;
        })}
      </div>
      <slot></slot>
    `;
  }
}
define('cm-table-header', CmTableHeader);

declare global { interface HTMLElementTagNameMap { 'cm-table-header': CmTableHeader } }
