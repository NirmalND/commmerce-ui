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
  .check { position: relative; display: inline-flex; flex: none; width: 20px; height: 20px; }
  .check input { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .check input:disabled { cursor: not-allowed; }
  .box {
    width: 100%; height: 100%; display: inline-flex; align-items: center; justify-content: center; pointer-events: none;
    color: var(--cm-icon-selected); background: var(--cm-bg-surface);
    border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-xs);
  }
  .dash { width: 50%; height: 2px; background: currentColor; }
  .check input:focus-visible + .box { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
  .check input:disabled + .box { border-color: var(--cm-border-default); background: var(--cm-bg-input-filled); }
`;

/**
 * A row in a `cm-resource-list`: a checkbox when the list is selectable, an optional thumbnail and
 * any content. With `href` the whole row is a link; otherwise clicking a selectable row ticks it.
 * @element cm-resource-item
 * @slot - Row content: name, details, badges. To line up with a `cm-table-header`, set `columns` and give one element per column.
 * @slot media - A 50px thumbnail (34px on phones): a `cm-thumbnail` (recommended; `alt=""` when the row names the product) or an `<img>`.
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
      :host { display: block; position: relative; border-bottom: var(--cm-border-1) solid var(--cm-border-default); }
      :host(:last-child) { border-bottom: 0; }
      .row {
        display: flex; align-items: center; gap: var(--cm-space-20); min-height: 70px; padding: var(--cm-space-20) var(--cm-space-10);
        font-size: 16px; line-height: 18px;
      }
      :host(:hover:not([disabled])) .row, :host([selected]) .row { background: var(--cm-bg-inset); }
      :host([selectable]:not([href]):not([disabled])) .row { cursor: pointer; }
      :host([disabled]) .row { color: var(--cm-text-tertiary); }
      .media { display: contents; }
      ::slotted([slot='media']) {
        flex: none; width: 50px; height: 50px; object-fit: cover; border-radius: var(--cm-radius-sm); background: var(--cm-thumb-bg);
      }
      ::slotted(cm-thumbnail[slot='media']) { --cm-thumbnail-size: 50px; background: none; }
      .content { flex: 1; min-width: 0; }
      :host([columns]) .content {
        display: grid; grid-template-columns: var(--cm-table-columns, minmax(0, 1fr)); column-gap: var(--cm-space-20); align-items: center;
      }
      :host([columns]) ::slotted(*) { min-width: 0; overflow-wrap: anywhere; }
      a { position: absolute; inset: 0; z-index: 0; border-radius: var(--cm-radius-xs); }
      a:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; }
      .check, .actions { position: relative; z-index: 1; }
      .actions { display: flex; gap: var(--cm-space-10); }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .row { gap: var(--cm-space-10); min-height: 64px; padding: 15px 0; font-size: 14px; }
        .check { width: 18px; height: 18px; }
        ::slotted([slot='media']) { width: 34px; height: 34px; }
        ::slotted(cm-thumbnail[slot='media']) { --cm-thumbnail-size: 34px; }
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
              <span class="box" aria-hidden="true">${this.selected ? html`<cm-icon name="check" size="14"></cm-icon>` : nothing}</span></span>`
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
 * When `selectable`, a toolbar shows a select-all box with a menu (this page, all matching, none), bulk actions once something is selected,
 * "2 products selected" and, when there are more results than rows, a button to select all of them.
 * Put a `cm-table-header` in the `header` slot for column names and `cm-pagination` under the list.
 * The list lines a slotted `cm-table-header` up with its rows (it sets the header's `resource-rows`): lay each row's
 * content out as a grid with `grid-template-columns: var(--cm-table-columns)` and `column-gap: var(--cm-space-20)`,
 * and set `--cm-table-columns` on the list.
 * @element cm-resource-list
 * @slot - `cm-resource-item` rows.
 * @slot header - A `cm-table-header` (or anything) between the toolbar and the rows. A `cm-table-header` here is lined up with the rows, checkbox column included.
 * @slot bulk-actions - Buttons that act on the selection, e.g. "Bulk orders". Shown once a row is selected.
 * @slot actions - Buttons at the end of the toolbar, e.g. "Customise columns".
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
  #id = nextId('cm-rl');
  #headers = new Set<HTMLElement>();

  static styles = [
    base,
    checkboxStyles,
    css`
      :host { display: block; position: relative; background: var(--cm-bg-surface); border-radius: var(--cm-radius-md); }
      .toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-20); padding: var(--cm-space-20) var(--cm-space-20) 0; }
      .select {
        display: inline-flex; align-items: center; gap: var(--cm-space-10); height: 40px; padding: 0 var(--cm-space-10);
        font-size: 14px; background: var(--cm-bg-inset); border: var(--cm-border-1) solid var(--cm-border-default); border-radius: var(--cm-radius-sm);
      }
      .select .check { width: 16px; height: 16px; }
      .select label { cursor: pointer; }
      .select cm-action-menu { margin-inline-start: -6px; }
      .select cm-action-menu::part(trigger) { width: 28px; min-height: 28px; }
      .bulk { display: flex; gap: var(--cm-space-10); }
      .bulk[hidden] { display: none; }
      .status { flex: 1; text-align: center; font-size: 16px; }
      .status button { font: inherit; font-weight: 500; color: inherit; text-decoration: underline; background: none; border: 0; padding: 0; cursor: pointer; }
      .status button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .actions { display: flex; gap: var(--cm-space-10); margin-inline-start: auto; }
      .header { display: block; padding: var(--cm-space-20) var(--cm-space-20) 0; }
      .header:not(.has) { display: none; }
      .body { position: relative; }
      .list { padding: 0 var(--cm-space-20) var(--cm-space-10); }
      :host([loading]) .list ::slotted(*) { opacity: 0.4; }
      .spinner {
        position: absolute; inset-inline-start: 50%; top: 50%; width: 46px; height: 46px; margin: -23px; border-radius: 50%;
        border: 4px solid var(--cm-thumb-bg); border-top-color: var(--cm-icon-selected); animation: spin 0.8s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
      .empty:not(.show) { display: none; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .toolbar { gap: var(--cm-space-10); padding: var(--cm-space-10) var(--cm-space-10) 0; }
        .select { height: 32px; font-size: 12px; }
        .status { flex-basis: 100%; order: 3; text-align: start; font-size: 12px; }
        .header { padding: var(--cm-space-10) var(--cm-space-10) 0; }
        .list { padding: 0 var(--cm-space-10); }
        .spinner { width: 30px; height: 30px; margin: -15px; border-width: 3px; }
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
  }

  #onHeaderSlot = (e: Event) => {
    const slot = e.target as HTMLSlotElement;
    slot.parentElement!.classList.toggle('has', slot.assignedElements().length > 0);
    this.#syncHeaders(slot);
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
    return html`
      ${this.selectable
        ? html`<div class="toolbar" part="toolbar">
            <span class="select" part="select">
              <span class="check"><input id="${this.#id}-all" type="checkbox" .checked=${all} .indeterminate=${n > 0 && !all}
                ?disabled=${!enabled} @change=${(e: Event) => this.selectPage((e.target as HTMLInputElement).checked)} />
                <span class="box" aria-hidden="true">${n > 0 && !all ? html`<span class="dash"></span>` : all ? html`<cm-icon name="check" size="12"></cm-icon>` : nothing}</span></span>
              <label for="${this.#id}-all">${this.t('select')}<span class="sr"> ${this.t('selectPageHidden', { count: rows, resource: noun(rows) })}</span></label>
              ${this.hideSelectMenu ? nothing : html`<cm-action-menu icon-only icon="chevron-down" part="select-menu" label=${this.t('selectionOptions')}
                .items=${[
                  { label: this.t('selectPage', { count: enabled }), value: 'page', disabled: !enabled },
                  ...(more ? [{ label: this.t('selectAll', { count: this.total, resource: plural }), value: 'all' }] : []),
                  { label: this.t('selectNone'), value: 'none', disabled: !n && !this.allSelected },
                ]} @cm-select=${this.#menuSelect}></cm-action-menu>`}
            </span>
            <span class="bulk" ?hidden=${!n}><slot name="bulk-actions"></slot></span>
            <span class="status" part="status" role="status">${status}</span>
            <span class="actions"><slot name="actions"></slot></span>
          </div>`
        : nothing}
      <div class="header"><slot name="header" @slotchange=${this.#onHeaderSlot}></slot></div>
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
