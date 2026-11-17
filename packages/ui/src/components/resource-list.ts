import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings, pluralCategory } from '../localize.js';
import './icon.js';
import './action-menu.js';

const itemStrings = defineStrings('resourceItem', {
  /** Accessible name of a row's checkbox. */
  select: 'Select {name}',
});
const strings = defineStrings('resourceList', {
  /** Default nouns, when `resource-name` isn't set. */
  resourceName: 'item',
  resourceNamePlural: 'items',
  /** Visible label of the select-all box; `selectPageHidden` follows it for screen readers only. */
  select: 'Select',
  selectPageHidden: 'all {count} {resource} on this page',
  /** Accessible name of the menu next to the select-all box, and its choices. */
  selectionOptions: 'Selection options',
  selectPage: 'Select all {count} on this page',
  selectAll: 'Select all {count} {resource}',
  selectNone: 'Select none',
  /** Selection status. `{resource}` is singular or plural to match `{count}`. */
  selected: '{count} {resource} selected.',
  allSelected: 'All {count} {resource} selected.',
  clearSelection: 'Clear selection',
  /** Accessible name of the spinner while loading. */
  loading: 'Loading {resource}',
});
declare module '../localize.js' { interface CmStrings { resourceItem: typeof itemStrings; resourceList: typeof strings } }

const checkboxStyles = css`
  .check { position: relative; display: inline-flex; flex: none; width: 16px; height: 16px; }
  .check input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .check input:disabled { cursor: not-allowed; }
  .box {
    width: 100%; height: 100%; display: inline-flex; align-items: center; justify-content: center; pointer-events: none;
    color: var(--cm-icon-selected); background: var(--cm-bg-surface);
    border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-xs);
  }
  .dash { width: 50%; height: 2px; background: currentColor; }
  .check input:focus-visible + .box { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
  .check input:disabled + .box { border-color: var(--cm-border-subtle); background: var(--cm-bg-input-filled); }
`;

/**
 * A row in a `cm-resource-list`: a checkbox when the list is selectable, an optional thumbnail and
 * any content. With `href` the whole row is a link; otherwise clicking a selectable row ticks it.
 * @element cm-resource-item
 * @slot - Row content: name, details, badges. To line up with a `cm-table-header`, set `columns` and give one element per column.
 * @slot media - A 40px thumbnail (32px on phones): a `cm-thumbnail` (recommended; `alt=""` when the row names the product) or an `<img>`.
 * @slot actions - Buttons at the end of the row. They do not toggle selection.
 * @fires cm-resource-select - `detail: { value, selected }` when the merchant ticks or unticks the row. The list handles it.
 */
export class CmResourceItem extends CmLocalizedElement {
  static properties = {
    value: { reflect: true },
    selected: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    href: {},
    label: {},
    selectable: { type: Boolean, reflect: true },
    columns: { type: Boolean, reflect: true },
  };

  /** Identifies the row in the list's `selected` array. */
  value = '';
  /** The row is ticked. */
  selected = false;
  /** The row cannot be selected or opened. */
  disabled = false;
  /** Makes the row a link to the resource's page. */
  href = '';
  /** Name for the checkbox and link, e.g. the product name. Defaults to the row's text. */
  label = '';
  /** Shows the checkbox. Set by the parent list from its own `selectable`. */
  selectable = false;
  /**
   * Lays the row's content out on the `--cm-table-columns` grid (set it on the list), one child element per column,
   * `space-20` apart: the same grid as a `cm-table-header` in the list's `header` slot, so cells sit under their headings.
   */
  columns = false;

  #internals = this.attachInternals();

  constructor() {
    super();
    this.#internals.role = 'listitem';
  }

  connectedCallback() {
    super.connectedCallback();
    // Also as an attribute, so checkers that don't read ElementInternals (axe-core) see the list item too.
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  static styles = [
    base,
    checkboxStyles,
    css`
      :host { display: block; position: relative; border-bottom: var(--cm-border-1) solid var(--cm-border-subtle); }
      :host(:last-child) { border-bottom: 0; }
      /* 56px rows (a 40px thumbnail with space-8 above and below), 14px text. A cm-table-header in the list's header
         slot mirrors this geometry (resource-rows in table-header.ts): change both together. */
      .row {
        display: flex; align-items: center; gap: var(--cm-space-12); box-sizing: border-box;
        min-height: calc(var(--cm-control-height-lg) + 2 * var(--cm-space-8)); padding: var(--cm-space-8);
        font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14);
      }
      :host(:hover:not([disabled])) .row, :host([selected]) .row { background: var(--cm-bg-hover); }
      :host([selectable]:not([href]):not([disabled])) .row { cursor: pointer; }
      :host([disabled]) .row { color: var(--cm-text-tertiary); }
      .media { display: contents; }
      ::slotted([slot='media']) {
        flex: none; width: 40px; height: 40px; object-fit: cover; border-radius: var(--cm-radius-sm); background: var(--cm-thumb-bg);
      }
      ::slotted(cm-thumbnail[slot='media']) { --cm-thumbnail-size: 40px; background: none; }
      .content { flex: 1; min-width: 0; }
      :host([columns]) .content {
        display: grid; grid-template-columns: var(--cm-table-columns, minmax(0, 1fr)); column-gap: var(--cm-space-20); align-items: center;
      }
      :host([columns]) ::slotted(*) { min-width: 0; overflow-wrap: anywhere; }
      a { position: absolute; inset: 0; z-index: 0; border-radius: var(--cm-radius-xs); }
      a:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; }
      .check, .actions { position: relative; z-index: 1; }
      .actions { display: flex; gap: var(--cm-space-8); }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .row { gap: var(--cm-space-8); padding: var(--cm-space-12) 0; }
        .check { width: 20px; height: 20px; }
        ::slotted([slot='media']) { width: 32px; height: 32px; }
        ::slotted(cm-thumbnail[slot='media']) { --cm-thumbnail-size: 32px; }
      }
    `,
  ];

  /** Accessible name: `label` or the row's text. */
  get name() {
    return this.label || this.textContent!.replace(/\s+/g, ' ').trim();
  }

  /** Ticks or unticks the row and fires `cm-resource-select`. */
  toggle(force?: boolean) {
    if (this.disabled) return;
    const next = force ?? !this.selected;
    if (next === this.selected) return;
    this.selected = next;
    this.dispatchEvent(new CustomEvent('cm-resource-select', { detail: { value: this.value, selected: next }, bubbles: true, composed: true }));
  }

  #onRowClick(e: MouseEvent) {
    if (!this.selectable || this.href || this.disabled) return;
    const path = e.composedPath();
    if (path.some((n) => n instanceof HTMLElement && n !== this && n.matches('a, button, input, select, textarea, label, [role="button"], cm-button'))) return;
    if (getSelection()?.toString()) return;
    this.toggle();
  }

  render() {
    return html`
      ${this.href && !this.disabled ? html`<a href=${this.href} part="link"><span class="sr">${this.name}</span></a>` : nothing}
      <div class="row" part="row" @click=${this.#onRowClick}>
        ${this.selectable
          ? html`<span class="check" part="checkbox"><input type="checkbox" aria-label=${this.t('select', { name: this.name })} .checked=${this.selected}
              ?disabled=${this.disabled} @change=${(e: Event) => this.toggle((e.target as HTMLInputElement).checked)} />
              <span class="box" aria-hidden="true">${this.selected ? html`<cm-icon name="check" size="12"></cm-icon>` : nothing}</span></span>`
          : nothing}
        <span class="media"><slot name="media"></slot></span>
        <div class="content" part="content"><slot></slot></div>
        <div class="actions" part="actions"><slot name="actions"></slot></div>
      </div>
    `;
  }
}
define('cm-resource-item', CmResourceItem);

/**
 * A list of products, orders, customers or other resources, with optional bulk selection.
 * When `selectable`, the list's header row (a slim grey bar at the top) has a select-all box lined up with the rows' checkboxes and,
 * next to it, a small chevron menu (this page, all matching, none). Once something is selected the same row shows
 * "2 products selected", a button to select all matching results when there are more than the rows, and the bulk actions.
 * With a `cm-table-header` in the `header` slot, that header is the row: the box sits in its checkbox column, and the
 * selection status and bulk actions cover the column names while rows are selected. (Until something is selected the
 * chevron is hidden there, since the column names use its room; the box selects the page.)
 * Put a `cm-table-header` in the `header` slot for column names and `cm-pagination` under the list.
 * The list lines a slotted `cm-table-header` up with its rows (it sets the header's `resource-rows`): lay each row's
 * content out as a grid with `grid-template-columns: var(--cm-table-columns)` and `column-gap: var(--cm-space-20)`,
 * and set `--cm-table-columns` on the list.
 * @element cm-resource-list
 * @slot - `cm-resource-item` rows.
 * @slot header - A `cm-table-header` (or anything) above the rows. A `cm-table-header` here is lined up with the rows, checkbox column included, and shares its row with the select-all box.
 * @slot bulk-actions - Buttons that act on the selection, e.g. "Bulk orders". Shown once a row is selected, in the header row: use `size="slim"` buttons (32px, the row's height).
 * @slot actions - Buttons at the end of the header row, e.g. "Customise columns". With a slotted header they get a row of their own above it.
 * @slot empty - Shown instead of the rows when there are none, e.g. a `cm-empty-state`.
 * @fires cm-selection-change - `detail: { selected, all }`: values of the selected rows, and whether every matching resource (all `total`) is selected.
 */
export class CmResourceList extends CmLocalizedElement {
  static properties = {
    selectable: { type: Boolean, reflect: true },
    total: { type: Number },
    resourceName: { attribute: 'resource-name', string: 'resourceName' },
    resourceNamePlural: { attribute: 'resource-name-plural' },
    loading: { type: Boolean, reflect: true },
    allSelected: { type: Boolean, attribute: 'all-selected', reflect: true },
    hideSelectMenu: { type: Boolean, attribute: 'hide-select-menu' },
    label: {},
    _count: { state: true },
    _rows: { state: true },
    _hasHeader: { state: true },
    _hasTable: { state: true },
    _hasActions: { state: true },
  };

  /** Rows get checkboxes and the selection toolbar appears. */
  selectable = false;
  /** Number of resources matching the current filter across all pages. When higher than the rows shown, offers "Select all". */
  total = 0;
  /** Singular noun, e.g. "product". Default: the built-in string `resourceName` ("item"). */
  resourceName!: string;
  /** Plural noun. Defaults to the singular plus "s" (or the built-in `resourceNamePlural`, "items", when `resource-name` isn't set). */
  resourceNamePlural = '';
  /** Dims the rows and shows a spinner while results load. */
  loading = false;
  /** Every matching resource is selected, not just the rows on this page. */
  allSelected = false;
  /** Hides the menu next to the select box (select this page, select all matching, select none). */
  hideSelectMenu = false;
  /** Accessible name of the list, e.g. "Products". Defaults to the plural noun. */
  label = '';

  _count = 0;
  _rows = 0;
  _hasHeader = false;
  _hasTable = false;
  _hasActions = false;
  #id = nextId('cm-rl');
  #headers = new Set<HTMLElement>();

  static styles = [
    base,
    checkboxStyles,
    css`
      :host { display: block; position: relative; background: var(--cm-bg-surface); border-radius: var(--cm-radius-md); --_pad: var(--cm-space-12); }
      /* The header row. Rows sit --_pad in from the list's edges and pad space-8 inside (0 on phones), so their 16px
         checkbox starts space-20 from the edge (space-12 on phones, 20px box). The header row runs edge to edge and puts
         its box at the same place. The slotted header and the toolbar share one grid cell: the toolbar lies over the
         header's checkbox column, and while rows are selected it covers the column names. */
      .head { display: grid; grid-template-columns: minmax(0, 1fr); padding: 0 var(--_pad); }
      .head:not(.on) { display: none; }
      .head.over > * { grid-area: 1 / 1; }
      .head:not(.over) .toolbar { order: -1; }
      .head:not(.over) .header { padding-block-start: var(--cm-space-8); }
      .header:not(.has) { display: none; }
      .toolbar {
        position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-4) var(--cm-space-8);
        box-sizing: border-box; min-height: var(--cm-control-height-sm);
        margin-inline: calc(-1 * var(--_pad)); padding-block: 0; padding-inline: calc(var(--_pad) + var(--cm-space-8)) var(--_pad);
        font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13);
        background: var(--cm-bg-hover); box-shadow: inset 0 var(--cm-border-1) 0 var(--cm-border-subtle), inset 0 calc(-1 * var(--cm-border-1)) 0 var(--cm-border-subtle);
      }
      /* Over a slotted header with nothing selected: only the box shows, in the header's checkbox column. */
      .toolbar.over:not(.busy) { background: none; box-shadow: none; pointer-events: none; }
      .toolbar.over:not(.busy) > * { pointer-events: auto; }
      .select { display: inline-flex; align-items: center; gap: var(--cm-space-4); }
      .select label { cursor: pointer; font-weight: 500; }
      .select .label[hidden] { display: none; }
      .select cm-action-menu::part(trigger) { width: var(--cm-space-24); min-height: var(--cm-space-24); border-radius: var(--cm-radius-xs); }
      .select cm-action-menu[hidden] { display: none; }
      .bulk { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); }
      .bulk[hidden] { display: none; }
      .status { font-weight: 500; font-variant-numeric: tabular-nums; }
      .status:empty { display: none; }
      .status button { font: inherit; font-weight: 500; color: inherit; text-decoration: underline; background: none; border: 0; padding: 0; cursor: pointer; }
      .status button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .actions { display: flex; gap: var(--cm-space-8); margin-inline-start: auto; }
      .actions:not(.has) { display: none; }
      .top { display: flex; justify-content: flex-end; gap: var(--cm-space-8); padding: var(--cm-space-8) var(--_pad); }
      .top:not(.has) { display: none; }
      .body { position: relative; }
      .list { padding: 0 var(--_pad) var(--cm-space-8); }
      :host([loading]) .list ::slotted(*) { opacity: 0.4; }
      .spinner {
        position: absolute; inset-inline-start: 50%; top: 50%; width: 48px; height: 48px; margin: -24px; border-radius: 50%;
        border: 4px solid var(--cm-thumb-bg); border-top-color: var(--cm-icon-selected); animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
      .empty:not(.show) { display: none; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .toolbar { padding-inline: var(--_pad); }
        .toolbar .check { width: 20px; height: 20px; }
        .spinner { width: 32px; height: 32px; margin: -16px; border-width: 3px; }
      }
    `,
  ];

  constructor() {
    super();
    this.addEventListener('cm-resource-select', (e) => {
      if (e.target === this) return;
      this.allSelected = false;
      this.#sync();
      this.#emit();
    });
  }

  /** The `cm-resource-item` rows. */
  get items(): CmResourceItem[] {
    return [...this.querySelectorAll(':scope > cm-resource-item')] as CmResourceItem[];
  }

  /** Values of the selected rows on this page. */
  get selected(): string[] {
    return this.items.filter((i) => i.selected).map((i) => i.value);
  }

  #plural() {
    if (this.resourceNamePlural) return this.resourceNamePlural;
    const own = this.resourceName;
    // A custom singular keeps the old rule (plus "s"); the built-in noun has its own plural.
    return own !== this.t('resourceName') ? `${own}s` : this.t('resourceNamePlural');
  }

  /** Tells each `cm-table-header` in the header slot to line up with the rows (`resource-rows`). */
  #syncHeaders(slot = this.renderRoot?.querySelector<HTMLSlotElement>('slot[name="header"]')) {
    if (!slot) return;
    const found = new Set<HTMLElement>();
    for (const el of slot.assignedElements()) {
      if (el.localName === 'cm-table-header') found.add(el as HTMLElement);
      el.querySelectorAll<HTMLElement>('cm-table-header').forEach((h) => found.add(h));
    }
    for (const h of this.#headers) if (!found.has(h)) h.removeAttribute('resource-rows');
    for (const h of found) h.setAttribute('resource-rows', this.selectable ? 'selectable' : 'plain');
    this.#headers = found;
    this._hasTable = found.size > 0;
  }

  #onHeaderSlot = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    this._hasHeader = slot.assignedElements().length > 0;
    this.#syncHeaders(slot);
  };

  #onActionsSlot = (e: Event) => {
    this._hasActions = (e.target as HTMLSlotElement).assignedElements().length > 0;
  };

  #sync() {
    const items = this.items;
    items.forEach((i) => (i.selectable = this.selectable));
    this._rows = items.length;
    this._count = items.filter((i) => i.selected).length;
  }

  #emit() {
    this.dispatchEvent(new CustomEvent('cm-selection-change', { detail: { selected: this.selected, all: this.allSelected }, bubbles: true, composed: true }));
  }

  /** Ticks or unticks every enabled row on this page. */
  selectPage(select = true) {
    this.items.forEach((i) => { if (!i.disabled) i.selected = select; });
    if (!select) this.allSelected = false;
    this.#sync();
    this.#emit();
  }

  /** Selects every matching resource (`total`), including rows on other pages. */
  selectAll() {
    this.items.forEach((i) => { if (!i.disabled) i.selected = true; });
    this.allSelected = true;
    this.#sync();
    this.#emit();
  }

  /** Clears the selection. */
  clearSelection() { this.selectPage(false); }

  #menuSelect = (e: CustomEvent<{ value: string }>) => {
    e.stopPropagation(); // the list's own menu: don't leak its cm-select to the page
    const v = e.detail.value;
    if (v === 'page') this.selectPage(true);
    else if (v === 'all') this.selectAll();
    else if (v === 'none') this.clearSelection();
  };

  updated(changed: Map<string, unknown>) {
    if (changed.has('selectable')) { this.#sync(); this.#syncHeaders(); }
  }

  render() {
    const n = this._count;
    const rows = this._rows;
    const enabled = this.items.filter((i) => !i.disabled).length;
    const all = enabled > 0 && n >= enabled;
    const plural = this.#plural();
    const noun = (x: number) => (pluralCategory(x, this.locale) === 'one' ? this.resourceName : plural);
    const more = this.total > rows;
    let status: unknown = nothing;
    if (this.allSelected) {
      status = html`${this.t('allSelected', { count: Math.max(this.total, n), resource: plural })} <button type="button" @click=${() => this.clearSelection()}>${this.t('clearSelection')}</button>`;
    } else if (n) {
      status = html`${this.t('selected', { count: n, resource: noun(n) })}${all && more
        ? html` <button type="button" @click=${() => this.selectAll()}>${this.t('selectAll', { count: this.total, resource: plural })}</button>` : nothing}`;
    }
    const busy = n > 0 || this.allSelected;
    const over = this._hasTable;
    // The chevron needs the room the column names use, so over a header it waits until something is selected.
    const menu = !this.hideSelectMenu && (!over || busy);
    const actions = html`<slot name="actions" @slotchange=${this.#onActionsSlot}></slot>`;
    return html`
      ${this.selectable && over ? html`<div class="top ${this._hasActions ? 'has' : ''}" part="top-actions">${actions}</div>` : nothing}
      <div class="head ${this.selectable || this._hasHeader ? 'on' : ''} ${over ? 'over' : ''}">
        <div class="header ${this._hasHeader ? 'has' : ''}"><slot name="header" @slotchange=${this.#onHeaderSlot}></slot></div>
        ${this.selectable
          ? html`<div class="toolbar ${over ? 'over' : ''} ${busy ? 'busy' : ''}" part="toolbar">
            <span class="select" part="select">
              <span class="check"><input id="${this.#id}-all" type="checkbox" .checked=${all} .indeterminate=${n > 0 && !all}
                ?disabled=${!enabled} @change=${(e: Event) => this.selectPage((e.target as HTMLInputElement).checked)} />
                <span class="box" aria-hidden="true">${n > 0 && !all ? html`<span class="dash"></span>` : all ? html`<cm-icon name="check" size="12"></cm-icon>` : nothing}</span></span>
              ${this.hideSelectMenu ? nothing : html`<cm-action-menu icon-only icon="chevron-down" part="select-menu" label=${this.t('selectionOptions')} ?hidden=${!menu}
                .items=${[
                  { label: this.t('selectPage', { count: enabled }), value: 'page', disabled: !enabled },
                  ...(more ? [{ label: this.t('selectAll', { count: this.total, resource: plural }), value: 'all' }] : []),
                  { label: this.t('selectNone'), value: 'none', disabled: !n && !this.allSelected },
                ]} @cm-select=${this.#menuSelect}></cm-action-menu>`}
              <label for="${this.#id}-all" class=${over || busy ? 'sr' : 'label'}>${this.t('select')}<span class="sr"> ${this.t('selectPageHidden', { count: rows, resource: noun(rows) })}</span></label>
            </span>
            <span class="status" part="status" role="status">${status}</span>
            <span class="bulk" ?hidden=${!n}><slot name="bulk-actions"></slot></span>
            ${over ? nothing : html`<span class="actions ${this._hasActions ? 'has' : ''}">${actions}</span>`}
          </div>`
          : nothing}
      </div>
      <div class="body">
        <div class="list" part="list" role="list" aria-label=${this.label || plural.replace(/^./, (c) => c.toUpperCase())} aria-busy=${this.loading ? 'true' : 'false'}>
          <slot @slotchange=${() => this.#sync()}></slot>
        </div>
        ${this.loading ? html`<span class="spinner" part="spinner" role="progressbar" aria-label=${this.t('loading', { resource: plural })}></span>` : nothing}
      </div>
      <div class="empty ${rows || this.loading ? '' : 'show'}"><slot name="empty"></slot></div>
    `;
  }
}
define('cm-resource-list', CmResourceList);

declare global {
  interface HTMLElementTagNameMap { 'cm-resource-list': CmResourceList; 'cm-resource-item': CmResourceItem }
}
