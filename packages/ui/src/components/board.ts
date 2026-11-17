import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { base, define, logicalKey, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { MoveModel, Announcer, type MovePlace } from '../move-model.js';
import './button.js';
import './skeleton.js';
import './spinner.js';

const cardStrings = defineStrings('boardCard', {
  /** What screen readers call a card, after its name: "Ravi Stores, movable card". */
  roleDescription: 'movable card',
  /** Read after the card's name and role (its description). */
  instructions: 'Press Space to pick up. Then use the arrow keys to choose a column and a position, Space or Enter to drop, and Escape to cancel.',
  /** Added before `instructions` when the card opens a record (`href`, or a link or button in the `heading` slot). */
  openHint: 'Press Enter to open.',
  /** Read while the move is being saved (`pending`). */
  saving: 'Saving',
});
const columnStrings = defineStrings('boardColumn', {
  /** Read after the column heading: "Contacted, 12 cards". `{count}` is `total`, or the number of cards loaded. */
  count: { one: '{count} card', other: '{count} cards' },
  /** The button at the end of a column that has more cards to load. */
  loadMore: 'Load more',
  /** Announced while `loading`. `{column}` is the heading. */
  loading: 'Loading {column}',
  /** Shown in a column with no cards (when nothing is in the `empty` slot). */
  empty: 'No cards',
});
const boardStrings = defineStrings('board', {
  /** Accessible name of the board. */
  label: 'Board',
  /** Announced on pick up. `{card}` card name, `{column}` heading, `{position}` and `{count}` the place in the column. */
  pickedUp: 'Picked up {card}. Column {column}, position {position} of {count}.',
  /** Announced as the arrow keys move the card. */
  over: 'Column {column}, position {position} of {count}.',
  /** Announced after a drop that moved the card. */
  moved: 'Moved {card} to {column}, position {position} of {count}.',
  /** Announced after a drop where the card started. */
  sameSpot: '{card} dropped where it started.',
  /** Announced after Escape (or focus leaving the card) while it is picked up. */
  cancelled: 'Move cancelled. {card} is back in {column}.',
  /** Announced when the app cancels `cm-move` (`preventDefault()`). */
  refused: '{card} can\'t be moved to {column}.',
  /** Announced when a move fails and the card goes back (`revert()`, or a rejected `waitUntil()` promise). `{column}` is where it went back to. */
  reverted: 'Couldn\'t move {card}. It is back in {column}.',
});
declare module '../localize.js' {
  interface CmStrings { board: typeof boardStrings; boardColumn: typeof columnStrings; boardCard: typeof cardStrings }
}

/** How a move was made: dragged with a pointer, moved with the keyboard, or by calling `moveCard()`. */
export type BoardMoveSource = 'pointer' | 'keyboard' | 'api';

/** `detail` of `cm-move`. */
export interface BoardMoveDetail {
  /** The card's `value`. */
  value: string;
  /** The card element. */
  card: CmBoardCard;
  /** `value` of the column it leaves, and of the column it goes to (the same when reordering). */
  from: string;
  to: string;
  /** The column elements. */
  fromColumn: CmBoardColumn;
  toColumn: CmBoardColumn;
  /** Its position in the column it leaves, and its position in the column it goes to, once there (from 0). */
  fromIndex: number;
  toIndex: number;
  /** How it was moved. */
  source: BoardMoveSource;
  /**
   * Call with the promise that saves the move: the card shows as saving (`pending`) until it settles; if it rejects,
   * the board puts the card back (`revert()`) and announces it. Call it during the event.
   */
  waitUntil(promise: Promise<unknown>): void;
}

const NO_DRAG = 'input, select, textarea, [contenteditable], cm-action-menu, cm-select, cm-text-field, [data-no-drag]';

/**
 * One record on a `cm-board`: a title (`heading`, or a link in the `heading` slot), secondary lines, badges and an
 * avatar. The whole card is the move handle: drag it, or focus it and press Space to move it with the keyboard.
 * With `href` the title is a link and Enter on the card opens it.
 * @element cm-board-card
 * @slot - Secondary lines under the title (owner, phone, city), one element per line.
 * @slot heading - Rich title instead of `heading`, e.g. a link. A link here is a second Tab stop; prefer `href`.
 * @slot badges - `cm-badge`s (grade, tags) under the lines.
 * @slot avatar - A `cm-avatar` for the owner, at the end of the title line.
 * @slot actions - A small control at the end of the title line, e.g. a `cm-action-menu` with "Move to…". Pressing it never starts a drag.
 * @csspart card - The card's box.
 * @csspart handle - The focusable layer under the content that carries the card's name and instructions.
 * @csspart title - The title.
 */
export class CmBoardCard extends CmLocalizedElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static properties = {
    value: { reflect: true },
    label: {},
    heading: {},
    href: {},
    locked: { type: Boolean, reflect: true },
    pending: { type: Boolean, reflect: true },
    moving: { type: Boolean, reflect: true },
    _badges: { state: true },
    _slottedTitle: { state: true },
  };

  /** Identifies the record in `cm-move` (e.g. its id). Defaults to the card's name. */
  value = '';
  /** The card's name, read by screen readers and in announcements ("Picked up Ravi Stores"). Defaults to `heading` or the `heading` slot's text. */
  label = '';
  /** The title: the record's name. */
  heading = '';
  /** Makes the title a link to the record. Enter on the focused card opens it too. */
  href = '';
  /** The card can't be moved (e.g. no permission). It can still be opened. */
  locked = false;
  /** The move is being saved: the card is greyed with a spinner and can't be moved again until it is cleared. Set by `waitUntil()` in `cm-move`, or by you. */
  pending = false;
  /** Set by the board while the card is picked up or dragged; it then marks where the card came from. Read it for styling; don't set it. */
  moving = false;

  _badges = false;
  _slottedTitle = '';
  #id = nextId('cm-bc');

  static styles = [
    base,
    css`
      :host { display: block; position: relative; -webkit-touch-callout: none; font-size: 14px; line-height: 20px; }
      .card {
        position: relative; display: block; padding: var(--cm-space-12) var(--cm-space-12); background: var(--cm-bg-surface);
        border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md); cursor: grab;
      }
      :host([locked]) .card { cursor: default; }
      .handle { position: absolute; inset: 0; z-index: 0; border-radius: inherit; outline: none; }
      .handle:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .content { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .head { display: flex; align-items: flex-start; gap: var(--cm-space-8); }
      .title { flex: 1; min-width: 0; font-weight: 500; overflow-wrap: anywhere; }
      .title a { color: inherit; text-decoration: none; }
      .title a:hover { text-decoration: underline; }
      .lines { display: flex; flex-direction: column; font-size: 12px; line-height: 16px; color: var(--cm-text-tertiary); overflow-wrap: anywhere; }
      .badges { display: flex; flex-wrap: wrap; gap: var(--cm-space-4); margin-block-start: var(--cm-space-8); }
      .badges[hidden] { display: none; }
      ::slotted([slot='avatar']), ::slotted([slot='actions']) { flex: none; }
      .spin { position: absolute; z-index: 2; inset-block-start: var(--cm-space-8); inset-inline-end: var(--cm-space-8); }
      :host([pending]) .card { background: var(--cm-bg-page); cursor: progress; }
      :host([pending]) .content { padding-inline-end: 24px; }
      :host([moving]) .card { border-style: dashed; border-color: var(--cm-border-strong); background: var(--cm-bg-page); }
      :host([moving]) .content { opacity: 0.5; }
      :host([ghost]) .card { cursor: grabbing; box-shadow: var(--cm-shadow-lg); border-color: var(--cm-border-subtle); }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    `,
  ];

  /** The card's name: `label`, `heading`, the `heading` slot's text, or its first line of text. */
  get name(): string {
    const text = (s: string | null | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();
    if (this.label) return this.label;
    if (this.heading) return this.heading;
    const slotted = this.querySelector(':scope > [slot="heading"]');
    if (slotted) return text(slotted.textContent);
    return text(this.textContent).slice(0, 80);
  }

  /** The value used in `cm-move`: `value`, or the name. */
  get key(): string { return this.value || this.name; }

  /** The link or button that opens the record: the `href` title, or the first link or button in the `heading` slot. */
  get opener(): HTMLElement | null {
    if (this.href) return this.renderRoot?.querySelector<HTMLElement>('.title a') ?? null;
    const h = this.querySelector(':scope > [slot="heading"]');
    if (!h) return null;
    return (h.matches('a[href], button, cm-button') ? h : h.querySelector('a[href], button, cm-button')) as HTMLElement | null;
  }

  /** Focuses the card's handle (its single Tab stop), even when a control inside the card has focus. */
  focusHandle(options?: FocusOptions) {
    const h = this.renderRoot?.querySelector<HTMLElement>('.handle');
    if (h) h.focus(options); else this.focus(options);
  }

  /** Opens the record: clicks the `href` title or the link or button in the `heading` slot. Returns false when there is none. */
  open(): boolean {
    const o = this.opener;
    if (!o) return false;
    o.click();
    return true;
  }

  #slotted(e: Event, prop: '_badges') {
    this[prop] = (e.target as HTMLSlotElement).assignedElements({ flatten: true }).length > 0;
  }

  render() {
    const openable = !!(this.href || this.querySelector(':scope > [slot="heading"] a[href], :scope > [slot="heading"] button, :scope > a[slot="heading"][href], :scope > button[slot="heading"]'));
    const busy = this.pending;
    return html`<div class="card" part="card">
      ${this.locked
        ? nothing
        : html`<div class="handle" part="handle" tabindex="0" role="button" aria-roledescription=${this.t('roleDescription')}
            aria-label=${busy ? `${this.name}, ${this.t('saving')}` : this.name} aria-describedby="${this.#id}-help"></div>`}
      <div class="content">
        <div class="head">
          <div class="title" part="title"><slot name="heading" @slotchange=${() => this.requestUpdate()}>${this.href
            ? html`<a href=${this.href} tabindex="-1">${this.heading}</a>` : this.heading}</slot></div>
          <slot name="avatar"></slot>
          <slot name="actions"></slot>
        </div>
        <div class="lines"><slot></slot></div>
        <div class="badges" ?hidden=${!this._badges}><slot name="badges" @slotchange=${(e: Event) => this.#slotted(e, '_badges')}></slot></div>
      </div>
      ${busy ? html`<cm-spinner class="spin" size="small" accessible-label=${this.t('saving')} aria-hidden="true"></cm-spinner>` : nothing}
      <span id="${this.#id}-help" hidden>${openable ? `${this.t('openHint')} ` : ''}${this.t('instructions')}</span>
    </div>`;
  }
}
define('cm-board-card', CmBoardCard);

/**
 * One column of a `cm-board`: a heading with its count, the cards as a list, and "Load more" when there are more
 * cards than are loaded.
 * @element cm-board-column
 * @slot - `cm-board-card` elements, in order. Other children are not shown.
 * @slot actions - A small control at the end of the heading row, e.g. an icon-only "Add" button.
 * @slot empty - Shown in a column with no cards, instead of "No cards".
 * @fires cm-load-more - When "Load more" is pressed. `detail: { column, value }`. Set `loading`, append the cards, then clear `loading` (and `has-more` on the last page).
 * @csspart header - The heading row.
 * @csspart count - The count.
 * @csspart list - The `<ul>` of cards.
 * @csspart more - The Load more button.
 */
export class CmBoardColumn extends CmLocalizedElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' as SlotAssignmentMode };

  static properties = {
    value: { reflect: true },
    heading: {},
    total: { type: Number },
    hasMore: { type: Boolean, attribute: 'has-more', reflect: true },
    loading: { type: Boolean, reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level' },
    _cards: { state: true },
    _drop: { state: true },
  };

  /** Identifies the column in `cm-move` (e.g. the status id). Defaults to `heading`. */
  value = '';
  /** The column's name, e.g. the status "Contacted". */
  heading = '';
  /** How many cards the column has in all, when more than are loaded (shown as the count). Unset: the number of cards. The board keeps it in step when it moves cards. */
  total?: number;
  /** Shows "Load more", which fires `cm-load-more`. Also shown when `total` is more than the cards loaded. */
  hasMore = false;
  /** Cards are loading: Load more shows a spinner, or placeholder cards show in an empty column. Announced politely. */
  loading = false;
  /** Level of the heading for screen readers (2 to 6). */
  headingLevel = 3;
  #collapsed = false;
  /** Whether the column is shown as a narrow rail: the board has `hide-empty` and the column is empty. Also the `collapsed` attribute, for styling. */
  get collapsed(): boolean { return this.#collapsed; }

  _cards: CmBoardCard[] = [];
  /** @internal The drop placeholder, set by the board while a card is moved. */
  _drop: { card: CmBoardCard; index: number; height: number } | null = null;
  #observer = new MutationObserver(() => this.#read());
  #id = nextId('cm-col');
  #moreFocused = false;

  static styles = [
    base,
    css`
      :host {
        display: flex; flex-direction: column; flex: none; min-height: 0; max-height: 100%;
        inline-size: var(--cm-board-column-width, 272px);
      }
      :host([collapsed]) { inline-size: 48px; }
      section {
        position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; background: var(--cm-bg-page);
        border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md);
      }
      header { display: flex; align-items: center; gap: var(--cm-space-8); min-height: 48px; padding: var(--cm-space-8) var(--cm-space-12); }
      .title { flex: 1; min-width: 0; margin: 0; font-size: 14px; line-height: 20px; font-weight: 500; overflow-wrap: anywhere; }
      .count {
        flex: none; min-width: 24px; padding: 0 8px; font-size: 12px; line-height: 20px; text-align: center; font-variant-numeric: tabular-nums;
        background: var(--cm-bg-surface); color: var(--cm-text-default); border-radius: var(--cm-radius-full);
      }
      .scroll { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; padding: 0 var(--cm-space-8) var(--cm-space-8); }
      ul { display: flex; flex-direction: column; gap: var(--cm-space-8); margin: 0; padding: 0; list-style: none; }
      ul:focus { outline: none; }
      li { display: block; min-width: 0; }
      .drop > div {
        display: flex; align-items: center; justify-content: center; min-height: 40px; padding: 0 var(--cm-space-12);
        border: 2px dashed var(--cm-border-strong); border-radius: var(--cm-radius-md); background: var(--cm-bg-surface);
        color: var(--cm-text-tertiary); font-size: 12px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
      }
      .empty { padding: var(--cm-space-12) var(--cm-space-8); font-size: 12px; color: var(--cm-text-tertiary); text-align: center; }
      .loading { display: grid; gap: var(--cm-space-8); }
      .loading cm-skeleton { --cm-skeleton-height: 72px; }
      .more { display: flex; justify-content: center; padding-block-start: var(--cm-space-8); }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      [hidden] { display: none !important; }
      /* Rail: the heading turned on its side, the count on top. Still a drop target. */
      :host([collapsed]) header { flex-direction: column; justify-content: flex-start; padding: var(--cm-space-8) 0; gap: var(--cm-space-8); }
      :host([collapsed]) .title { flex: none; writing-mode: vertical-rl; white-space: nowrap; overflow-wrap: normal; }
      :host([collapsed]) .scroll { padding: 0; overflow: hidden; }
      :host([collapsed]) .actions { display: none; }
      :host([collapsed]) section.over { outline: 2px dashed var(--cm-border-strong); outline-offset: -2px; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#read();
    this.#observer.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'] });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  /** The `cm-board-card` children, in order. */
  get cards(): CmBoardCard[] {
    return [...this.children].filter((c) => c.localName === 'cm-board-card' && !c.hasAttribute('slot')) as CmBoardCard[];
  }

  /** The column's `value`, or its heading. */
  get key(): string { return this.value || this.heading; }

  /** The number shown in the heading: `total`, or the cards loaded. */
  get count(): number {
    return typeof this.total === 'number' && !Number.isNaN(this.total) ? this.total : this._cards.length;
  }

  /** @internal The element that scrolls the cards. */
  get scrollElement(): HTMLElement | null { return this.renderRoot?.querySelector<HTMLElement>('.scroll') ?? null; }

  #read() {
    this._cards = this.cards;
  }

  /** @internal Reads the cards now (after the board moved one) and resolves once they are shown. */
  _sync(): Promise<boolean> {
    this.#read();
    return this.updateComplete;
  }

  protected willUpdate() {
    const board = this.closest('cm-board') as CmBoard | null;
    this.#collapsed = !!board?.hideEmpty && !this._cards.length && !this.loading && !(this.count > 0);
    this.toggleAttribute('collapsed', this.#collapsed);
    this.#moreFocused = (this.renderRoot as ShadowRoot | undefined)?.activeElement?.localName === 'cm-button';
  }

  protected updated() {
    // Manual slot assignment: each card goes into the slot inside its own <li>, so the column is a real list.
    const slots = this.renderRoot.querySelectorAll<HTMLSlotElement>('li > slot');
    slots.forEach((s) => { const c = this._cards[Number(s.dataset.i)]; if (c) s.assign(c); else s.assign(); });
    const named = (name: string) => [...this.children].filter((c) => c.getAttribute('slot') === name);
    this.renderRoot.querySelector<HTMLSlotElement>('slot.actions')?.assign(...named('actions'));
    this.renderRoot.querySelector<HTMLSlotElement>('slot.empty')?.assign(...named('empty'));
    if (this.#moreFocused && !this.renderRoot.querySelector('.more cm-button')) {
      this.#moreFocused = false;
      this.renderRoot.querySelector<HTMLElement>('ul')?.focus();
    }
  }

  #more() {
    if (this.loading) return;
    this.dispatchEvent(new CustomEvent('cm-load-more', { detail: { column: this, value: this.key }, bubbles: true, composed: true }));
  }

  render() {
    const cards = this._cards;
    const drop = this._drop;
    const count = this.count;
    const others = drop ? cards.filter((c) => c !== drop.card) : cards;
    // No placeholder where the card already is: its own (dimmed) place marks the spot.
    const from = drop ? cards.indexOf(drop.card) : -1;
    const showDrop = !!drop && !this.collapsed && !(from >= 0 && drop.index === from);
    type Row = { key: unknown; card?: CmBoardCard; i?: number };
    const rows: Row[] = [];
    cards.forEach((c, i) => {
      if (showDrop && c !== drop!.card && others.indexOf(c) === drop!.index) rows.push({ key: 'drop' });
      rows.push({ key: c, card: c, i });
    });
    if (showDrop && drop!.index >= others.length) rows.push({ key: 'drop' });
    const more = this.hasMore || count > cards.length;
    const busy = this.loading;
    const level = Math.min(6, Math.max(2, Math.round(this.headingLevel) || 3));
    const countText = this.t('count', { count });
    return html`<section aria-labelledby="${this.#id}-h" class=${drop && this.collapsed ? 'over' : ''}>
      <header part="header">
        <div class="title" id="${this.#id}-h" role="heading" aria-level=${level}>${this.heading}<span class="sr">, ${countText}</span></div>
        <span class="count" part="count" aria-hidden="true">${this.formatNumber(count)}</span>
        <span class="actions"><slot class="actions"></slot></span>
      </header>
      <div class="scroll">
        <ul part="list" role="list" aria-labelledby="${this.#id}-h" aria-busy=${busy ? 'true' : 'false'} tabindex="-1" ?hidden=${this.collapsed}>
          ${repeat(rows, (r) => r.key, (r) => r.card
            ? html`<li><slot data-i=${r.i!}></slot></li>`
            : html`<li class="drop" aria-hidden="true"><div style="min-height:${Math.max(40, drop!.height)}px">${drop!.card.name}</div></li>`)}
        </ul>
        ${busy && !cards.length && !this.collapsed
          ? html`<div class="loading" aria-hidden="true"><cm-skeleton variant="block"></cm-skeleton><cm-skeleton variant="block"></cm-skeleton></div>`
          : nothing}
        <div class="empty" ?hidden=${cards.length > 0 || busy || more || this.collapsed || showDrop}><slot class="empty">${this.t('empty')}</slot></div>
        ${more && !this.collapsed
          ? html`<div class="more"><cm-button part="more" size="medium" ?loading=${busy} @click=${this.#more}>${this.t('loadMore')}</cm-button></div>`
          : nothing}
      </div>
      <span class="sr" role="status">${busy ? this.t('loading', { column: this.heading }) : ''}</span>
    </section>`;
  }
}
define('cm-board-column', CmBoardColumn);

type Move = { card: CmBoardCard; from: CmBoardColumn; fromIndex: number; to: CmBoardColumn; toIndex: number; totals: boolean };
type Drag = {
  card: CmBoardCard; pointerId: number; type: string; x0: number; y0: number; x: number; y: number; started: boolean;
  dx: number; dy: number; width: number; height: number; ghost?: HTMLElement; timer?: ReturnType<typeof setTimeout>;
  from: CmBoardColumn; fromIndex: number; to?: CmBoardColumn; toIndex?: number; raf?: number;
};

/**
 * A board of records by status (Kanban): one `cm-board-column` per status with its count, and `cm-board-card`s
 * that move between columns, with a pointer (mouse, touch, pen) or with the keyboard.
 *
 * Moving: drag a card (on touch, press and hold first), or focus it and press Space, choose a column and position
 * with the arrow keys, and drop with Space or Enter (Escape cancels). Every step is announced. Each move fires
 * `cm-move`, which you can cancel. By default the board then moves the card element itself; with `controlled` it
 * leaves the DOM to you (React, Vue, anything that renders from data).
 *
 * Columns are fixed-width side by side and the board scrolls sideways; when the board is 480px wide or less each
 * column takes nearly the whole width and the board snaps from column to column. Give the board a height (CSS
 * `height` or `block-size`) to make columns scroll on their own.
 * @element cm-board
 * @slot - `cm-board-column` elements, in order.
 * @fires cm-move - Before a card moves. Cancelable: `preventDefault()` keeps it where it was. `detail: { value, card, from, to, fromColumn, toColumn, fromIndex, toIndex, source, waitUntil }` (see `BoardMoveDetail`). Pass the save request to `detail.waitUntil(promise)` to show the card as saving and put it back if the promise rejects.
 * @fires cm-load-more - From a column's Load more button (bubbles from `cm-board-column`). `detail: { column, value }`.
 * @csspart columns - The scrolling row of columns.
 * @cssprop --cm-board-column-width - Width of each column on wide boards. Default 272px.
 */
export class CmBoard extends CmLocalizedElement {
  static properties = {
    label: { string: 'label' },
    hideEmpty: { type: Boolean, attribute: 'hide-empty', reflect: true },
    controlled: { type: Boolean, reflect: true },
    dragging: { type: Boolean, reflect: true },
  };

  /** Accessible name of the board, e.g. "Merchants by status". Default: the built-in string `label` ("Board"). */
  label!: string;
  /** Empty columns shrink to a narrow rail (heading on its side and the count). Rails still take cards: drop on them or move to them with the keyboard. */
  hideEmpty = false;
  /**
   * You move the cards: the board fires `cm-move` but never moves card elements or changes `total`. Re-render the
   * card into its new column (and update totals) in your `cm-move` listener. Use it with React, Vue and other
   * frameworks that render from data. `preventDefault()` still means the move was refused.
   */
  controlled = false;
  /** Set while a card is being dragged with a pointer. Read it for styling; don't set it. */
  dragging = false;

  #announcer = new Announcer();
  #model: MoveModel;
  #held: { card: CmBoardCard; column: CmBoardColumn; index: number } | null = null;
  #history = new WeakMap<CmBoardCard, Move>();
  #drag: Drag | null = null;

  constructor() {
    super();
    this.#model = new MoveModel({
      groupCount: () => this.columns.length,
      slotCount: (g) => {
        const col = this.columns[g];
        if (!col || !this.#held) return 0;
        return col.cards.filter((c) => c !== this.#held!.card).length + 1;
      },
      onTarget: (at) => this.#showTarget(at),
      onDrop: (from, to) => this.#keyboardDrop(from, to),
      onCancel: () => this.#release(),
      messages: {
        pickedUp: (at) => this.#say('pickedUp', at),
        over: (at) => this.#say('over', at),
        cancelled: (from) => this.t('cancelled', { card: this.#held?.card.name ?? '', column: this.columns[from.group]?.heading ?? '' }),
      },
      announce: (text) => this.#announcer.announce(text),
    });
  }

  static styles = [
    base,
    css`
      :host { position: relative; display: block; container-type: inline-size; container-name: cm-board; min-width: 0; }
      .board { height: 100%; }
      .columns {
        position: relative; display: flex; align-items: stretch; gap: var(--cm-space-12); height: 100%; overflow-x: auto; overflow-y: hidden;
        padding-block-end: var(--cm-space-8); overscroll-behavior-x: contain;
      }
      :host([dragging]) .columns { scroll-snap-type: none !important; }
      :host([dragging]) { cursor: grabbing; user-select: none; -webkit-user-select: none; }
      @container cm-board (max-width: 480px) {
        .columns { scroll-snap-type: x mandatory; scroll-padding-inline: 0; gap: var(--cm-space-8); }
        ::slotted(cm-board-column) { inline-size: calc(100% - 40px); scroll-snap-align: start; }
        ::slotted(cm-board-column[collapsed]) { inline-size: 48px; }
      }
    `,
  ];

  /** The `cm-board-column` children, in order. */
  get columns(): CmBoardColumn[] {
    return [...this.children].filter((c) => c.localName === 'cm-board-column') as CmBoardColumn[];
  }

  /** The column with this `value` (or heading). */
  column(value: string): CmBoardColumn | undefined {
    return this.columns.find((c) => c.key === value);
  }

  /** The card with this `value` (or name), in any column. */
  card(value: string): CmBoardCard | undefined {
    for (const col of this.columns) { const c = col.cards.find((x) => x.key === value); if (c) return c; }
    return undefined;
  }

  /** The card picked up with the keyboard, if any. */
  get heldCard(): CmBoardCard | null { return this.#held?.card ?? null; }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('keydown', this.#onKey);
    this.addEventListener('focusout', this.#onFocusOut);
    this.addEventListener('pointerdown', this.#onPointerDown);
    this.addEventListener('dragstart', this.#onNativeDrag);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.#onKey);
    this.removeEventListener('focusout', this.#onFocusOut);
    this.removeEventListener('pointerdown', this.#onPointerDown);
    this.removeEventListener('dragstart', this.#onNativeDrag);
    this.#model.cancel(true);
    this.#endDrag(false);
  }

  protected firstUpdated() {
    this.renderRoot.appendChild(this.#announcer.element);
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('hideEmpty')) this.columns.forEach((c) => c.requestUpdate());
  }

  /** The last message announced (for tests and logging). */
  get announcement(): string { return this.#announcer.text; }

  /** Announces a message in the board's live region, e.g. after your own "Move to" menu. */
  announce(text: string) { this.#announcer.announce(text); }

  #say(key: 'pickedUp' | 'over', at: MovePlace) {
    const col = this.columns[at.group];
    return this.t(key, { card: this.#held?.card.name ?? '', column: col?.heading ?? '', position: at.index + 1, count: this.#model.slotCount(at.group) });
  }

  #place(card: CmBoardCard): { column: CmBoardColumn; group: number; index: number } | null {
    const columns = this.columns;
    const group = columns.findIndex((c) => c.contains(card) && card.parentElement === c);
    if (group < 0) return null;
    return { column: columns[group], group, index: columns[group].cards.indexOf(card) };
  }

  /* ---------- Keyboard ---------- */

  /** Picks up a card for moving with the arrow keys, as Space does: e.g. from a "Move" item in your own menu. Focuses the card. */
  pickUp(card: CmBoardCard | string): boolean {
    const c = typeof card === 'string' ? this.card(card) : card;
    if (!c || c.locked || c.pending) return false;
    const at = this.#place(c);
    if (!at) return false;
    this.#endDrag(false);
    this.#model.cancel(true);
    this.#held = { card: c, column: at.column, index: at.index };
    c.moving = true;
    this.#focusHandle(c);
    this.#model.pickUp({ group: at.group, index: at.index });
    return true;
  }

  /** Cancels a keyboard move or a drag in progress: the card stays where it was. */
  cancelMove() {
    const d = this.#drag;
    if (d?.started) {
      this.#endDrag(false);
      this.#announcer.announce(this.t('cancelled', { card: d.card.name, column: d.from.heading }));
    }
    this.#model.cancel();
  }

  /**
   * Focuses the card's handle, and again on the next frame if something took focus back in between (a menu inside
   * the card returns focus to its trigger after its `cm-select` listeners ran).
   */
  #focusHandle(c: CmBoardCard) {
    const onHandle = () => !!(c.shadowRoot?.activeElement as HTMLElement | null)?.classList.contains('handle');
    c.focusHandle({ preventScroll: true });
    requestAnimationFrame(() => { if (this.#held?.card === c && !onHandle()) c.focusHandle({ preventScroll: true }); });
  }

  #release() {
    if (this.#held) this.#held.card.moving = false;
    this.#held = null;
  }

  #showTarget(at: MovePlace | null) {
    const held = this.#held;
    this.columns.forEach((col, g) => {
      col._drop = held && at && g === at.group ? { card: held.card, index: at.index, height: held.card.getBoundingClientRect().height } : null;
    });
    if (at) {
      const col = this.columns[at.group];
      col?.updateComplete.then(() => {
        const el = col.renderRoot.querySelector<HTMLElement>('li.drop') ?? (held && held.column === col ? held.card : col);
        this.#reveal(col, el);
      });
    }
  }

  /** Scrolls the board to show a column and the column to show an element in it, without moving focus. */
  #reveal(col: CmBoardColumn, el: Element) {
    const scroller = this.renderRoot.querySelector<HTMLElement>('.columns');
    if (scroller) {
      const s = scroller.getBoundingClientRect(), c = col.getBoundingClientRect();
      if (c.left < s.left) scroller.scrollLeft -= s.left - c.left + 8;
      else if (c.right > s.right) scroller.scrollLeft += c.right - s.right + 8;
    }
    const list = col.scrollElement;
    if (list) {
      const l = list.getBoundingClientRect(), r = el.getBoundingClientRect();
      if (r.top < l.top) list.scrollTop -= l.top - r.top + 8;
      else if (r.bottom > l.bottom) list.scrollTop += r.bottom - l.bottom + 8;
    }
  }

  #keyboardDrop(from: MovePlace, to: MovePlace) {
    const held = this.#held;
    this.#release();
    if (!held) return;
    const toCol = this.columns[to.group];
    this.#commit(held.card, held.column, from.index, toCol, to.index, 'keyboard');
  }

  #handleOf(path: EventTarget[]): CmBoardCard | null {
    // The key came from a card's own handle (not a link or control inside it).
    const first = path[0] as HTMLElement;
    if (!(first instanceof HTMLElement) || !first.classList?.contains('handle')) return null;
    const card = path.find((n) => (n as Element).localName === 'cm-board-card') as CmBoardCard | undefined;
    return card && this.#place(card) ? card : null;
  }

  #onKey = (e: KeyboardEvent) => {
    if (this.#drag?.started && e.key === 'Escape') { e.preventDefault(); this.cancelMove(); return; }
    const key = logicalKey(e, this);
    if (this.#model.active) {
      if (this.#model.handleKey(e, key)) { e.preventDefault(); e.stopPropagation(); }
      return;
    }
    const card = this.#handleOf(e.composedPath());
    if (!card || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === ' ') {
      e.preventDefault();
      this.pickUp(card);
    } else if (e.key === 'Enter') {
      if (card.open()) e.preventDefault();
    } else if (key.startsWith('Arrow')) {
      const next = this.#neighbour(card, key);
      if (next) { e.preventDefault(); next.focusHandle(); }
    }
  };

  /** The card to focus from `card` with an arrow key: up/down in its column, the nearest one in the next column sideways. */
  #neighbour(card: CmBoardCard, key: string): CmBoardCard | null {
    const at = this.#place(card);
    if (!at) return null;
    const cards = at.column.cards;
    if (key === 'ArrowDown') return cards[at.index + 1] ?? null;
    if (key === 'ArrowUp') return cards[at.index - 1] ?? null;
    const dir = key === 'ArrowRight' ? 1 : -1;
    const columns = this.columns;
    for (let g = at.group + dir; g >= 0 && g < columns.length; g += dir) {
      const list = columns[g].cards;
      if (list.length) return list[Math.min(at.index, list.length - 1)];
    }
    return null;
  }

  #onFocusOut = (e: FocusEvent) => {
    if (!this.#model.active || !this.#held) return;
    // Focus left the held card (a click elsewhere, the window lost focus while still on it is fine).
    const to = e.relatedTarget as Node | null;
    if (to && (to === this.#held.card || this.#held.card.contains(to))) return;
    if (!to && document.hasFocus() === false) return;
    queueMicrotask(() => {
      if (this.#model.active && this.#held && !this.#held.card.matches(':focus-within')) this.#model.cancel();
    });
  };

  /* ---------- Moving ---------- */

  /**
   * Moves a card to a column and position (default: the end), as a drop would: fires `cm-move`, and unless it is
   * cancelled (or the board is `controlled`) moves the element. Use it for your own "Move to" menu. Returns false
   * when the move was cancelled or the card or column was not found.
   */
  moveCard(card: CmBoardCard | string, to: CmBoardColumn | string, index?: number): boolean {
    const c = typeof card === 'string' ? this.card(card) : card;
    const col = typeof to === 'string' ? this.column(to) : to;
    if (!c || !col) return false;
    const at = this.#place(c);
    if (!at) return false;
    const room = col.cards.filter((x) => x !== c).length;
    const toIndex = Math.max(0, Math.min(index ?? room, room));
    return this.#commit(c, at.column, at.index, col, toIndex, 'api');
  }

  /**
   * Puts a card back where it was before its last move by the board, restores the two columns' `total`, clears
   * `pending` and announces it. Call it when saving the move failed (a rejected `waitUntil()` promise does this
   * for you). Does nothing with `controlled` (put it back in your data) or when the card has not moved. Returns
   * whether the card went back.
   */
  revert(card: CmBoardCard | string): boolean {
    const c = typeof card === 'string' ? this.card(card) : card;
    if (!c) return false;
    c.pending = false;
    const m = this.#history.get(c);
    if (this.controlled || !m) return false;
    this.#history.delete(c);
    if (!m.from.isConnected || !this.contains(m.from)) return false;
    const hadFocus = c.matches(':focus-within');
    this.#insert(c, m.from, m.fromIndex);
    if (m.totals) this.#adjustTotals(m.to, m.from);
    this.#shown(m.to, m.from, hadFocus ? c : null);
    this.#announcer.announce(this.t('reverted', { card: c.name, column: m.from.heading }));
    return true;
  }

  /** After moving a card element: both columns show it at once, then focus goes back to it (moving an element drops focus). */
  #shown(from: CmBoardColumn, to: CmBoardColumn, focus: CmBoardCard | null) {
    from._sync();
    to._sync().then(() => { if (focus?.isConnected) focus.focusHandle({ preventScroll: true }); });
  }

  #insert(card: CmBoardCard, col: CmBoardColumn, index: number) {
    const others = col.cards.filter((x) => x !== card);
    const ref = others[index];
    if (ref) ref.before(card);
    else if (others.length) others[others.length - 1].after(card);
    else col.append(card);
  }

  #adjustTotals(from: CmBoardColumn, to: CmBoardColumn) {
    if (from === to) return;
    if (typeof from.total === 'number') from.total = Math.max(0, from.total - 1);
    if (typeof to.total === 'number') to.total = to.total + 1;
  }

  #commit(card: CmBoardCard, from: CmBoardColumn, fromIndex: number, to: CmBoardColumn, toIndex: number, source: BoardMoveSource): boolean {
    const name = card.name;
    if (from === to && fromIndex === toIndex) {
      if (source !== 'api') this.#announcer.announce(this.t('sameSpot', { card: name }));
      if (source === 'keyboard') card.focusHandle({ preventScroll: true });
      return false;
    }
    const waits: Promise<unknown>[] = [];
    const detail: BoardMoveDetail = {
      value: card.key, card, from: from.key, to: to.key, fromColumn: from, toColumn: to, fromIndex, toIndex, source,
      waitUntil: (p: Promise<unknown>) => { waits.push(Promise.resolve(p)); },
    };
    const ok = this.dispatchEvent(new CustomEvent<BoardMoveDetail>('cm-move', { detail, bubbles: true, composed: true, cancelable: true }));
    if (!ok) {
      this.#announcer.announce(this.t('refused', { card: name, column: to.heading }));
      if (source === 'keyboard') card.focusHandle({ preventScroll: true });
      return false;
    }
    const count = to.cards.filter((x) => x !== card).length + 1;
    if (!this.controlled) {
      const hadFocus = source === 'keyboard' || card.matches(':focus-within');
      this.#insert(card, to, toIndex);
      const totals = from !== to;
      if (totals) this.#adjustTotals(from, to);
      this.#history.set(card, { card, from, fromIndex, to, toIndex, totals });
      this.#shown(from, to, hadFocus ? card : null);
    } else if (source === 'keyboard') {
      this.#refocus(card.key, to);
    }
    this.#announcer.announce(this.t('moved', { card: name, column: to.heading, position: toIndex + 1, count }));
    if (waits.length) {
      card.pending = true;
      Promise.all(waits).then(
        () => { card.pending = false; if (!this.controlled) this.#history.delete(card); },
        () => {
          card.pending = false;
          if (!this.controlled) this.revert(card);
          else this.#announcer.announce(this.t('reverted', { card: name, column: from.heading }));
        },
      );
    }
    return true;
  }

  /** Controlled boards: once the app has re-rendered the card in its new column, focus it again. */
  #refocus(value: string, col: CmBoardColumn) {
    const find = () => col.isConnected ? col.cards.find((c) => c.key === value) : undefined;
    const tryFocus = () => {
      const c = find();
      const lost = !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected;
      if (!c || !(lost || this.contains(document.activeElement))) return false;
      col._sync().then(() => c.updateComplete).then(() => { if (c.isConnected) c.focusHandle({ preventScroll: true }); });
      return true;
    };
    const mo = new MutationObserver(() => { if (tryFocus()) mo.disconnect(); });
    mo.observe(this, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 1000);
  }

  /* ---------- Pointer drag ---------- */

  #onNativeDrag = (e: DragEvent) => {
    if (e.composedPath().some((n) => (n as Element).localName === 'cm-board-card')) e.preventDefault();
  };

  #onPointerDown = (e: PointerEvent) => {
    if (this.#drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const path = e.composedPath();
    const card = path.find((n) => (n as Element).localName === 'cm-board-card') as CmBoardCard | undefined;
    if (!card || card.locked || card.pending) return;
    if (path.some((n) => n instanceof Element && n !== card && n.matches?.(NO_DRAG))) return;
    const at = this.#place(card);
    if (!at) return;
    if (this.#model.active) this.#model.cancel();
    const r = card.getBoundingClientRect();
    this.#drag = {
      card, pointerId: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, started: false,
      dx: e.clientX - r.left, dy: e.clientY - r.top, width: r.width, height: r.height, from: at.column, fromIndex: at.index,
    };
    if (e.pointerType !== 'mouse') {
      // Touch and pen: press and hold to pick up, so a swipe still scrolls.
      this.#drag.timer = setTimeout(() => { if (this.#drag && !this.#drag.started) this.#startDrag(); }, 300);
    }
    window.addEventListener('pointermove', this.#onPointerMove, true);
    window.addEventListener('pointerup', this.#onPointerUp, true);
    window.addEventListener('pointercancel', this.#onPointerCancel, true);
    window.addEventListener('touchmove', this.#onTouchMove, { capture: true, passive: false });
    window.addEventListener('contextmenu', this.#onContextMenu, true);
  };

  #onTouchMove = (e: TouchEvent) => { if (this.#drag?.started && e.cancelable) e.preventDefault(); };
  #onContextMenu = (e: Event) => { if (this.#drag) e.preventDefault(); };

  #onPointerMove = (e: PointerEvent) => {
    const d = this.#drag;
    if (!d || e.pointerId !== d.pointerId) return;
    d.x = e.clientX; d.y = e.clientY;
    if (!d.started) {
      const dist = Math.hypot(d.x - d.x0, d.y - d.y0);
      if (d.type === 'mouse' ? dist > 4 : dist > 8) {
        if (d.type === 'mouse') this.#startDrag();
        else this.#endDrag(false); // moved before the hold: it's a scroll
      }
      return;
    }
    e.preventDefault();
    this.#moveGhost();
    this.#updateTarget();
  };

  #onPointerUp = (e: PointerEvent) => {
    const d = this.#drag;
    if (!d || e.pointerId !== d.pointerId) return;
    if (!d.started) { this.#endDrag(false); return; }
    // The click that follows a drag must not open the card.
    const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => window.removeEventListener('click', swallow, true), 0);
    this.#endDrag(true);
  };

  #onPointerCancel = (e: PointerEvent) => {
    if (this.#drag && e.pointerId === this.#drag.pointerId) this.#endDrag(false);
  };

  #startDrag() {
    const d = this.#drag!;
    d.started = true;
    clearTimeout(d.timer);
    getSelection()?.removeAllRanges();
    const ghost = d.card.cloneNode(true) as HTMLElement;
    ghost.removeAttribute('id');
    ghost.removeAttribute('moving');
    ghost.setAttribute('ghost', '');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.setAttribute('inert', '');
    Object.assign(ghost.style, {
      position: 'fixed', zIndex: '2147483000', left: '0', top: '0', width: `${d.width}px`, margin: '0', pointerEvents: 'none',
      willChange: 'transform',
    });
    // In the document so the page's own styles for the card's content still apply.
    (this.ownerDocument.body ?? this.ownerDocument.documentElement).appendChild(ghost);
    d.ghost = ghost;
    d.card.moving = true;
    this.dragging = true;
    d.to = d.from;
    d.toIndex = d.fromIndex;
    this.#announcer.announce(this.t('pickedUp', {
      card: d.card.name, column: d.from.heading, position: d.fromIndex + 1, count: d.from.cards.length,
    }));
    this.#moveGhost();
    this.#updateTarget();
    const tick = () => {
      if (!this.#drag?.started) return;
      this.#autoScroll();
      this.#drag.raf = requestAnimationFrame(tick);
    };
    d.raf = requestAnimationFrame(tick);
  }

  #moveGhost() {
    const d = this.#drag;
    if (d?.ghost) d.ghost.style.transform = `translate(${d.x - d.dx}px, ${d.y - d.dy}px)`;
  }

  /** The column under the pointer (the nearest one sideways) and the position in it. */
  #updateTarget() {
    const d = this.#drag;
    if (!d) return;
    const columns = this.columns;
    if (!columns.length) return;
    let best = columns[0], bestDist = Infinity;
    for (const col of columns) {
      const r = col.getBoundingClientRect();
      const dist = d.x < r.left ? r.left - d.x : d.x > r.right ? d.x - r.right : 0;
      if (dist < bestDist) { best = col; bestDist = dist; }
    }
    const others = best.cards.filter((c) => c !== d.card);
    let index = others.length;
    if (!best.collapsed) {
      for (let i = 0; i < others.length; i++) {
        const r = others[i].getBoundingClientRect();
        if (d.y < r.top + r.height / 2) { index = i; break; }
      }
    } else index = 0;
    if (best === d.to && index === d.toIndex) return;
    const changedColumn = best !== d.to;
    d.to = best; d.toIndex = index;
    columns.forEach((col) => { col._drop = col === best ? { card: d.card, index, height: d.height } : null; });
    if (changedColumn) {
      this.#announcer.announce(this.t('over', { column: best.heading, position: index + 1, count: others.length + 1 }));
    }
  }

  #autoScroll() {
    const d = this.#drag;
    if (!d) return;
    const EDGE = 48, MAX = 16;
    const speed = (dist: number) => (dist < EDGE ? Math.ceil(((EDGE - Math.max(dist, 0)) / EDGE) * MAX) : 0);
    let scrolled = false;
    const scroller = this.renderRoot.querySelector<HTMLElement>('.columns');
    if (scroller) {
      const r = scroller.getBoundingClientRect();
      const left = speed(d.x - r.left), right = speed(r.right - d.x);
      const before = scroller.scrollLeft;
      if (left) scroller.scrollLeft -= left; else if (right) scroller.scrollLeft += right;
      scrolled ||= scroller.scrollLeft !== before;
    }
    const list = d.to?.scrollElement;
    if (list && list.scrollHeight > list.clientHeight) {
      const r = list.getBoundingClientRect();
      if (d.x >= r.left && d.x <= r.right) {
        const up = speed(d.y - r.top), down = speed(r.bottom - d.y);
        const before = list.scrollTop;
        if (up) list.scrollTop -= up; else if (down) list.scrollTop += down;
        scrolled ||= list.scrollTop !== before;
      }
    }
    // A board without a height grows with its cards: scroll the window instead.
    const vh = window.innerHeight;
    const up = speed(d.y), down = speed(vh - d.y);
    if (up || down) {
      const before = window.scrollY;
      window.scrollBy(0, up ? -up : down);
      scrolled ||= window.scrollY !== before;
    }
    if (scrolled) this.#updateTarget();
  }

  #endDrag(drop: boolean) {
    const d = this.#drag;
    if (!d) return;
    this.#drag = null;
    clearTimeout(d.timer);
    if (d.raf) cancelAnimationFrame(d.raf);
    window.removeEventListener('pointermove', this.#onPointerMove, true);
    window.removeEventListener('pointerup', this.#onPointerUp, true);
    window.removeEventListener('pointercancel', this.#onPointerCancel, true);
    window.removeEventListener('touchmove', this.#onTouchMove, true);
    window.removeEventListener('contextmenu', this.#onContextMenu, true);
    d.ghost?.remove();
    if (!d.started) return;
    d.card.moving = false;
    this.dragging = false;
    this.columns.forEach((c) => { c._drop = null; });
    if (drop && d.to && d.toIndex !== undefined) this.#commit(d.card, d.from, d.fromIndex, d.to, d.toIndex, 'pointer');
  }

  render() {
    return html`<div class="board" role="group" aria-label=${this.label}>
      <div class="columns" part="columns"><slot @slotchange=${() => this.requestUpdate()}></slot></div>
    </div>`;
  }
}
define('cm-board', CmBoard);

declare global {
  interface HTMLElementTagNameMap { 'cm-board': CmBoard; 'cm-board-column': CmBoardColumn; 'cm-board-card': CmBoardCard }
}
