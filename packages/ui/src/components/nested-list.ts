import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import './icon.js';

/**
 * One row in a `cm-nested-list`: a 60px bordered row with a label and actions (toggle, edit, delete).
 * Put more `cm-nested-item`s inside it to nest them; each level is indented.
 * @element cm-nested-item
 * @slot - Child `cm-nested-item`s.
 * @slot actions - Controls at the end of the row: a badge, a toggle, edit and delete buttons.
 * @fires cm-reorder - Bubbles from the moved item: `detail: { item, from, to }` (positions among its siblings). Cancelable.
 */
export class CmNestedItem extends LitElement {
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
        display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 34px; margin-left: -6px; padding: 0;
        color: var(--cm-icon-selected); background: none; border: 0; border-radius: var(--cm-radius-xs); cursor: grab;
      }
      .handle:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      .children { margin: var(--cm-space-10) 0 0 50px; display: flex; flex-direction: column; gap: var(--cm-space-10); }
      .children:not(.has) { display: none; }
      @media (max-width: 640px) {
        .row { min-height: 50px; padding: 0 var(--cm-space-10); gap: var(--cm-space-10); font-size: 14px; }
        .actions { gap: var(--cm-space-10); }
        .children { margin-left: var(--cm-space-20); }
      }
    `,
  ];

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
    this.closest('cm-nested-list')?.announce(`${this.label} moved to position ${to + 1} of ${sibs.length}.`);
    return true;
  }

  #onHandleKey(e: KeyboardEvent) {
    const i = this.siblings.indexOf(this);
    let to: number | undefined;
    if (e.key === 'ArrowUp') to = i - 1;
    else if (e.key === 'ArrowDown') to = i + 1;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = this.siblings.length - 1;
    else return;
    e.preventDefault();
    if (this.moveTo(to)) {
      // Moving the row re-inserts it, which drops focus. Restore it at once so a quick second key
      // press (e.g. ↓ then End) still reaches the handle, and again after render as a fallback.
      const refocus = () => this.renderRoot.querySelector<HTMLElement>('.handle')?.focus();
      refocus();
      requestAnimationFrame(refocus);
    }
  }

  #onDragStart(e: DragEvent) {
    e.stopPropagation();
    CmNestedItem.dragged = this;
    this.classList.add('dragging');
    e.dataTransfer?.setData('text/plain', this.label);
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  static dragged: CmNestedItem | null = null;

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
          ? html`<button class="handle" type="button" part="handle" draggable="true" aria-label=${`Reorder ${this.label}`}
              aria-describedby="hint"
              @keydown=${this.#onHandleKey} @dragstart=${this.#onDragStart}
              @dragend=${() => { this.classList.remove('dragging'); CmNestedItem.dragged = null; }}><cm-icon name="drag" size="18"></cm-icon></button>`
          : nothing}
        ${this.sortable ? html`<span class="sr" id="hint">Press up or down arrow to move.</span>` : nothing}
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

/**
 * A titled group of rows that nest inside each other, such as a navigation menu with links and
 * sub-links, or categories and sub-categories. The heading sits in a 90px grey bar with its own
 * actions; rows below are indented one step per level. With `sortable`, each row gets a drag
 * handle that also works from the keyboard (↑/↓, Home/End). With `collapsible`, the bar gets a
 * round button that shows and hides the rows.
 * @element cm-nested-list
 * @slot - `cm-nested-item` rows.
 * @slot actions - Controls in the heading bar, e.g. an "Add links" button or a toggle.
 * @fires cm-reorder - When a row is moved. See `cm-nested-item`.
 * @fires cm-toggle - `detail: { open }` when a collapsible list is shown or hidden.
 */
export class CmNestedList extends LitElement {
  static properties = {
    heading: {},
    headingLevel: { type: Number, attribute: 'heading-level' },
    sortable: { type: Boolean, reflect: true },
    collapsible: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    _msg: { state: true },
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

  _msg = '';
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
      .rows { display: flex; flex-direction: column; gap: var(--cm-space-10); margin: var(--cm-space-15) 0 0 50px; }
      .rows[hidden] { display: none; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .bar { min-height: 60px; padding: 0 var(--cm-space-10); gap: var(--cm-space-10); }
        .title { font-size: 18px; }
        .rows { margin-left: var(--cm-space-10); }
        .toggle { width: 30px; height: 30px; }
      }
    `,
  ];

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
    [...this.children].forEach((k) => { if (k.localName === 'cm-nested-item') (k as CmNestedItem).sortable = this.sortable; });
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('sortable')) this.#syncSortable();
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
              aria-label=${`${shown ? 'Hide' : 'Show'} ${this.heading}`} @click=${this.#toggle}>
              <cm-icon name=${shown ? 'chevron-up' : 'chevron-down'} size="14"></cm-icon></button>`
          : nothing}
      </div>
      <div class="rows" id="${this.#id}-rows" role="list" aria-labelledby="${this.#id}-h" ?hidden=${!shown}>
        <slot @slotchange=${() => this.#syncSortable()}></slot>
      </div>
      <span class="sr" role="status">${this._msg}</span>
    `;
  }
}
define('cm-nested-list', CmNestedList);

declare global {
  interface HTMLElementTagNameMap { 'cm-nested-list': CmNestedList; 'cm-nested-item': CmNestedItem }
}
