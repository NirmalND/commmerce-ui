import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const itemStrings = defineStrings('nestedItem', {
  /** Accessible name of the drag handle, and the keyboard hint read with it. */
  reorder: 'Reorder {label}',
  hint: 'Press up or down arrow to move.',
  /** The keyboard hint in a list with a `group`: the arrows also cross into the list before or after. */
  hintGroup: 'Press up or down arrow to move. At either end of the list, the arrow moves it into the list before or after.',
  /** Announced after a move. */
  moved: '{label} moved to position {position} of {total}.',
  /** Announced after a move into another list (`group`). */
  movedTo: '{label} moved to {list}, position {position} of {total}.',
});
const listStrings = defineStrings('nestedList', {
  /** Accessible name of the show/hide button. */
  show: 'Show {heading}',
  hide: 'Hide {heading}',
});
declare module '../localize.js' { interface CmStrings { nestedItem: typeof itemStrings; nestedList: typeof listStrings } }

/**
 * One row in a `cm-nested-list`: a 60px bordered row with a label and actions (toggle, edit, delete).
 * Put more `cm-nested-item`s inside it to nest them; each level is indented.
 * @element cm-nested-item
 * @slot - Child `cm-nested-item`s.
 * @slot actions - Controls at the end of the row: a badge, a toggle, edit and delete buttons.
 * @fires cm-reorder - Bubbles from the moved item: `detail: { item, from, to }` (positions among its siblings). Cancelable.
 * @fires cm-move - Bubbles from the item before it moves into another list with the same `group` (since 1.3): `detail: { item, from, to, fromList, toList }`, where `from` is its position in `fromList` and `to` its position in `toList` after the move. Cancelable: the component moves the element unless you call `preventDefault()`.
 */
export class CmNestedItem extends CmLocalizedElement {
  static properties = {
    label: {},
    value: { reflect: true },
    sortable: { type: Boolean, reflect: true },
    _hasChildren: { state: true },
  };

  /** Row text, e.g. a menu link or category name. */
  label = '';
  /** Identifies the item in `cm-reorder` handlers. */
  value = '';
  /** Shows the drag handle. Set by the parent list from its own `sortable`. */
  sortable = false;

  _hasChildren = false;
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
    css`
      :host { display: block; }
      .row {
        display: flex; align-items: center; gap: var(--cm-space-15); min-height: 60px; padding: 0 var(--cm-space-20);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-default); border-radius: var(--cm-radius-md);
        font-size: 16px; font-weight: 500;
      }
      :host(.dragging) .row { opacity: 0.5; }
      :host(.drop-before) .row { box-shadow: 0 -3px 0 var(--cm-border-strong); }
      :host(.drop-after) .row { box-shadow: 0 3px 0 var(--cm-border-strong); }
      .label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .actions { display: flex; align-items: center; gap: var(--cm-space-15); }
      .handle {
        display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 34px; margin-inline-start: -6px; padding: 0;
        color: var(--cm-icon-selected); background: none; border: 0; border-radius: var(--cm-radius-xs); cursor: grab;
      }
      .handle:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      /* Touch: a drag that starts on the handle moves the row instead of scrolling the page. */
      .handle { touch-action: none; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      .children { margin-block: var(--cm-space-10) 0; margin-inline: 50px 0; display: flex; flex-direction: column; gap: var(--cm-space-10); }
      .children:not(.has) { display: none; }
      @media (max-width: 640px) {
        .row { min-height: 50px; padding: 0 var(--cm-space-10); gap: var(--cm-space-10); font-size: 14px; }
        .actions { gap: var(--cm-space-10); }
        .children { margin-inline-start: var(--cm-space-20); }
      }
    `,
  ];

  /** The `cm-nested-list` this item is a top-level row of, or null when it is nested in another item. */
  get list(): CmNestedList | null {
    const p = this.parentElement;
    return p?.localName === 'cm-nested-list' ? (p as CmNestedList) : null;
  }

  /**
   * The lists this row can move between: every sortable, shown `cm-nested-list` with the same `group` as its own,
   * in document order (including its own). Empty when its list has no `group` or the row is nested.
   */
  get #peerLists(): CmNestedList[] {
    const own = this.list;
    if (!own?.group) return [];
    const root = own.getRootNode() as Document | ShadowRoot;
    return ([...root.querySelectorAll('cm-nested-list')] as CmNestedList[])
      .filter((l) => l === own || (l.group === own.group && l.sortable && (!l.collapsible || l.open)));
  }

  /**
   * Moves this top-level row into another `cm-nested-list` with the same `group`, at position `to` (default: the
   * end), firing a cancelable `cm-move` first. With its own list it is the same as `moveTo(to)`. Use it for a
   * "Move to…" menu. Returns false if nothing moved. Since 1.3.
   */
  moveToList(list: CmNestedList, to?: number): boolean {
    const from = this.list;
    if (!from || !list) return false;
    if (list === from) return to === undefined ? false : this.moveTo(to);
    if (!from.group || list.group !== from.group) return false;
    const targets = list.items;
    const index = Math.max(0, Math.min(targets.length, to ?? targets.length));
    const detail = { item: this, from: from.items.indexOf(this), to: index, fromList: from, toList: list };
    if (!this.dispatchEvent(new CustomEvent('cm-move', { detail, bubbles: true, composed: true, cancelable: true }))) return false;
    list.insertBefore(this, targets[index] ?? null);
    list.announce(this.t('movedTo', { label: this.label, list: list.heading, position: index + 1, total: targets.length + 1 }));
    return true;
  }

  /** Sibling `cm-nested-item`s, including this one. */
  get siblings(): CmNestedItem[] {
    return [...this.parentElement!.children].filter((c) => c.localName === 'cm-nested-item') as CmNestedItem[];
  }

  /**
   * Moves this item to a position among its siblings, firing a cancelable `cm-reorder` first.
   * Returns false if nothing moved.
   */
  moveTo(to: number) {
    const sibs = this.siblings;
    const from = sibs.indexOf(this);
    to = Math.max(0, Math.min(sibs.length - 1, to));
    if (to === from) return false;
    const ev = new CustomEvent('cm-reorder', { detail: { item: this, from, to }, bubbles: true, composed: true, cancelable: true });
    if (!this.dispatchEvent(ev)) return false;
    const ref = sibs[to];
    ref.parentElement!.insertBefore(this, to > from ? ref.nextSibling : ref);
    this.closest('cm-nested-list')?.announce(this.t('moved', { label: this.label, position: to + 1, total: sibs.length }));
    return true;
  }

  #refocus() {
    // Moving the row re-inserts it, which drops focus. Restore it at once so a quick second key
    // press (e.g. ↓ then End) still reaches the handle, and again after render as a fallback.
    const refocus = () => this.renderRoot.querySelector<HTMLElement>('.handle')?.focus();
    refocus();
    requestAnimationFrame(refocus);
  }

  #onHandleKey(e: KeyboardEvent) {
    const i = this.siblings.indexOf(this);
    // In a list with a `group`, ↑ on the first row and ↓ on the last cross into the list before or after.
    const up = e.key === 'ArrowUp', down = e.key === 'ArrowDown';
    if ((up && i === 0) || (down && i === this.siblings.length - 1)) {
      const lists = this.#peerLists;
      const next = lists[lists.indexOf(this.list!) + (up ? -1 : 1)];
      if (next) {
        e.preventDefault();
        if (this.moveToList(next, up ? next.items.length : 0)) this.#refocus();
        return;
      }
    }
    let to: number | undefined;
    if (e.key === 'ArrowUp') to = i - 1;
    else if (e.key === 'ArrowDown') to = i + 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = this.siblings.length - 1;
    else return;
    e.preventDefault();
    if (this.moveTo(to)) this.#refocus();
  }

  #onDragStart(e: DragEvent) {
    e.stopPropagation();
    if (this.#pointerDrag) { e.preventDefault(); return; } // a touch drag is already moving the row
    CmNestedItem.dragged = this;
    this.classList.add('dragging');
    e.dataTransfer?.setData('text/plain', this.label);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  static dragged: CmNestedItem | null = null;

  #pointerDrag = false;

  /**
   * Touch and pen: drag the handle with pointer events (HTML drag and drop doesn't start from a touch on most
   * phones). The row moves among its siblings, or into another list with the same `group`, when the finger lifts.
   */
  #onPointerDown(e: PointerEvent) {
    if (e.pointerType === 'mouse' || !e.isPrimary) return;
    const startY = e.clientY;
    let target: DropTarget | null = null;
    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      if (!this.#pointerDrag) {
        if (Math.abs(ev.clientY - startY) < 6) return;
        this.#pointerDrag = true;
        CmNestedItem.dragged = this;
        this.classList.add('dragging');
      }
      ev.preventDefault();
      target = this.#targetAt(ev.clientX, ev.clientY);
      markDrop(this, target);
    };
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== e.pointerId) return;
      document.removeEventListener('pointermove', move, true);
      document.removeEventListener('pointerup', end, true);
      document.removeEventListener('pointercancel', end, true);
      const dragged = this.#pointerDrag;
      this.#pointerDrag = false;
      CmNestedItem.dragged = null;
      this.classList.remove('dragging');
      markDrop(this, null);
      if (!dragged || ev.type === 'pointercancel' || !target) return;
      if (target.list) this.moveToList(target.list, target.index);
      else this.moveTo(target.index);
    };
    document.addEventListener('pointermove', move, true);
    document.addEventListener('pointerup', end, true);
    document.addEventListener('pointercancel', end, true);
  }

  /** Where a row dragged by pointer would land: in another list of its group under the point, else among its siblings. */
  #targetAt(x: number, y: number): DropTarget {
    for (const l of this.#peerLists) {
      if (l === this.list) continue;
      const r = l.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return { list: l, index: indexAt(l.items, this, y) };
    }
    return { index: indexAt(this.siblings, this, y) };
  }

  #onDragOver(e: DragEvent) {
    const d = CmNestedItem.dragged;
    if (!d || d === this || d.parentElement !== this.parentElement) return;
    e.preventDefault();
    e.stopPropagation();
    const r = this.renderRoot.querySelector('.row')!.getBoundingClientRect();
    const after = e.clientY > r.top + r.height / 2;
    this.classList.toggle('drop-after', after);
    this.classList.toggle('drop-before', !after);
  }

  #clearDrop() { this.classList.remove('drop-before', 'drop-after'); }

  #onDrop(e: DragEvent) {
    const d = CmNestedItem.dragged;
    if (!d || d === this || d.parentElement !== this.parentElement) return;
    e.preventDefault();
    e.stopPropagation();
    const after = this.classList.contains('drop-after');
    this.#clearDrop();
    const sibs = this.siblings;
    const from = sibs.indexOf(d);
    let to = sibs.indexOf(this) + (after ? 1 : 0);
    if (to > from) to -= 1;
    d.moveTo(to);
  }

  render() {
    return html`
      <div class="row" part="row" @dragover=${this.#onDragOver} @dragleave=${this.#clearDrop} @drop=${this.#onDrop}>
        ${this.sortable
          ? html`<button class="handle" type="button" part="handle" draggable="true" aria-label=${this.t('reorder', { label: this.label })}
              aria-describedby="hint"
              @keydown=${this.#onHandleKey} @dragstart=${this.#onDragStart} @pointerdown=${this.#onPointerDown}
              @dragend=${() => { this.classList.remove('dragging'); CmNestedItem.dragged = null; markDrop(this, null); }}><cm-icon name="drag" size="18"></cm-icon></button>`
          : nothing}
        ${this.sortable ? html`<span class="sr" id="hint">${this.t(this.list?.group ? 'hintGroup' : 'hint')}</span>` : nothing}
        <span class="label" part="label">${this.label}</span>
        <span class="actions" part="actions"><slot name="actions"></slot></span>
      </div>
      <div class="children ${this._hasChildren ? 'has' : ''}" role="list" aria-label=${this.label}>
        <slot @slotchange=${(e: Event) => {
          const kids = (e.target as HTMLSlotElement).assignedElements().filter((k) => k.localName === 'cm-nested-item') as CmNestedItem[];
          kids.forEach((k) => (k.sortable = this.sortable));
          this._hasChildren = kids.length > 0;
        }}></slot>
      </div>
    `;
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('sortable')) {
      [...this.children].forEach((k) => { if (k.localName === 'cm-nested-item') (k as CmNestedItem).sortable = this.sortable; });
    }
  }
}
define('cm-nested-item', CmNestedItem);

type DropTarget = { list?: CmNestedList; index: number };

/** Position a dragged row would take among `rows` (it is left out) for a pointer at `y`: rows whose middle is above it. */
function indexAt(rows: CmNestedItem[], dragged: CmNestedItem, y: number) {
  return rows.filter((r) => {
    if (r === dragged) return false;
    const b = r.getBoundingClientRect();
    return b.top + b.height / 2 < y;
  }).length;
}

/** Shows where a dragged row will land (a line before or after a row, or an outline on an empty list); null clears. */
function markDrop(dragged: CmNestedItem, target: DropTarget | null) {
  const root = (dragged.list ?? dragged).getRootNode() as Document | ShadowRoot;
  root.querySelectorAll('cm-nested-item.drop-before, cm-nested-item.drop-after, cm-nested-list.drop-target')
    .forEach((el) => el.classList.remove('drop-before', 'drop-after', 'drop-target'));
  if (!target) return;
  const rows = (target.list ? target.list.items : dragged.siblings).filter((r) => r !== dragged);
  if (!rows.length) target.list?.classList.add('drop-target');
  else if (target.index < rows.length) rows[target.index].classList.add('drop-before');
  else rows[rows.length - 1].classList.add('drop-after');
}

/**
 * A titled group of rows that nest inside each other, such as a navigation menu with links and
 * sub-links, or categories and sub-categories. The heading sits in a 90px grey bar with its own
 * actions; rows below are indented one step per level. With `sortable`, each row gets a drag
 * handle that also works from the keyboard (↑/↓, Home/End). With `collapsible`, the bar gets a
 * round button that shows and hides the rows. Give sortable lists the same `group` to let top-level rows move
 * between them, by drag and drop or from the keyboard (since 1.3).
 * @element cm-nested-list
 * @slot - `cm-nested-item` rows.
 * @slot actions - Controls in the heading bar, e.g. an "Add links" button or a toggle.
 * @fires cm-reorder - When a row is moved. See `cm-nested-item`.
 * @fires cm-move - When a row moves into another list with the same `group`. Fired on the row before it moves, so it bubbles through the list it leaves. See `cm-nested-item`.
 * @fires cm-toggle - `detail: { open }` when a collapsible list is shown or hidden.
 */
export class CmNestedList extends CmLocalizedElement {
  static properties = {
    heading: {},
    headingLevel: { type: Number, attribute: 'heading-level' },
    sortable: { type: Boolean, reflect: true },
    collapsible: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    group: { reflect: true },
    _msg: { state: true },
    _empty: { state: true },
  };

  /** Title in the grey bar, e.g. "Header" or "Clothing & accessories". */
  heading = '';
  /** Heading level for the title (1–6). */
  headingLevel = 2;
  /** Rows get drag handles and can be reordered among their siblings. */
  sortable = false;
  /** Adds a show/hide button to the heading bar. */
  collapsible = false;
  /** Whether the rows are shown when `collapsible`. */
  open = true;
  /**
   * Name shared by sortable lists that accept each other's top-level rows (since 1.3), e.g. every section of a
   * form layout. Rows then move between them by drag and drop (mouse or touch) and from the keyboard: ↑ on the
   * first row or ↓ on the last moves it into the list before or after. The component moves the element and fires
   * a cancelable `cm-move`. An empty list in a group shows a drop area.
   */
  group = '';

  _msg = '';
  _empty = false;
  #id = nextId('cm-nl');

  static styles = [
    base,
    css`
      :host { display: block; }
      .bar {
        display: flex; align-items: center; gap: var(--cm-space-15); min-height: 90px; padding: 0 var(--cm-space-20);
        background: var(--cm-bg-page); border-radius: var(--cm-radius-md);
      }
      .title { flex: 1; min-width: 0; margin: 0; font-size: 26px; font-weight: 500; line-height: 1.3; }
      .actions { display: flex; align-items: center; gap: var(--cm-space-15); }
      .toggle {
        display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; padding: 0; flex: none;
        color: var(--cm-action-primary-text); background: var(--cm-action-primary); border: 0; border-radius: var(--cm-radius-full); cursor: pointer;
      }
      .toggle:hover { background: var(--cm-action-primary-hover); }
      .toggle:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .rows { display: flex; flex-direction: column; gap: var(--cm-space-10); margin-block: var(--cm-space-15) 0; margin-inline: 50px 0; }
      .rows[hidden] { display: none; }
      .rows.empty { min-height: 60px; border: var(--cm-border-1) dashed var(--cm-border-default); border-radius: var(--cm-radius-md); }
      :host(.drop-target) .rows.empty { border: 2px solid var(--cm-border-strong); }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .bar { min-height: 60px; padding: 0 var(--cm-space-10); gap: var(--cm-space-10); }
        .title { font-size: 18px; }
        .rows { margin-inline-start: var(--cm-space-10); }
        .toggle { width: 30px; height: 30px; }
      }
    `,
  ];

  /** The top-level `cm-nested-item` rows, in order. */
  get items(): CmNestedItem[] {
    return [...this.children].filter((c) => c.localName === 'cm-nested-item') as CmNestedItem[];
  }

  /** Reads a message to screen readers, e.g. after a move. */
  announce(msg: string) {
    this._msg = '';
    requestAnimationFrame(() => (this._msg = msg));
  }

  #toggle() {
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('cm-toggle', { detail: { open: this.open }, bubbles: true, composed: true }));
  }

  #syncSortable() {
    const rows = this.items;
    rows.forEach((k) => { k.sortable = this.sortable; k.requestUpdate(); });
  }

  willUpdate() {
    // A list with no rows gets no slotchange, so count them before the first render.
    if (!this.hasUpdated) this._empty = !this.items.length;
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('sortable') || changed.has('group')) this.#syncSortable();
  }

  /** Whether a row being dragged (mouse) may drop into this list from another list of its group. */
  #accepts(d: CmNestedItem | null): d is CmNestedItem {
    const from = d?.list;
    return !!d && !!from && from !== this && !!this.group && from.group === this.group && this.sortable && (!this.collapsible || this.open);
  }

  #onDragOver(e: DragEvent) {
    const d = CmNestedItem.dragged;
    if (!this.#accepts(d)) return;
    e.preventDefault();
    markDrop(d, { list: this, index: indexAt(this.items, d, e.clientY) });
  }

  #onDrop(e: DragEvent) {
    const d = CmNestedItem.dragged;
    if (!this.#accepts(d)) return;
    e.preventDefault();
    const index = indexAt(this.items, d, e.clientY);
    markDrop(d, null);
    d.moveToList(this, index);
  }

  render() {
    const level = Math.min(6, Math.max(1, this.headingLevel || 2));
    const shown = !this.collapsible || this.open;
    return html`
      <div class="bar" part="bar">
        <div class="title" part="heading" role="heading" aria-level=${level} id="${this.#id}-h">${this.heading}</div>
        <span class="actions"><slot name="actions"></slot></span>
        ${this.collapsible
          ? html`<button class="toggle" type="button" part="toggle" aria-expanded=${shown ? 'true' : 'false'} aria-controls="${this.#id}-rows"
              aria-label=${this.t(shown ? 'hide' : 'show', { heading: this.heading })} @click=${this.#toggle}>
              <cm-icon name=${shown ? 'chevron-up' : 'chevron-down'} size="14"></cm-icon></button>`
          : nothing}
      </div>
      <div class="rows ${this.group && this._empty ? 'empty' : ''}" id="${this.#id}-rows" role="list" aria-labelledby="${this.#id}-h" ?hidden=${!shown}
        @dragover=${this.#onDragOver} @drop=${this.#onDrop}>
        <slot @slotchange=${() => { this.#syncSortable(); this._empty = !this.items.length; }}></slot>
      </div>
      <span class="sr" role="status">${this._msg}</span>
    `;
  }
}
define('cm-nested-list', CmNestedList);

declare global {
  interface HTMLElementTagNameMap { 'cm-nested-list': CmNestedList; 'cm-nested-item': CmNestedItem }
}
