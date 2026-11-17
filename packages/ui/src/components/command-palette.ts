import { html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { define } from '../base.js';
import { defineStrings } from '../localize.js';
import { CmOverlay } from '../overlay.js';
import { popoverStyles, groupStyles, resultStyles, resultOption, resultContent, resultGroupHeading, moveActive } from '../popover.js';
import { matchesShortcut, shortcutHasModifier, isTypingTarget, shortcutKeys, ariaKeyShortcut } from '../shortcut.js';
import './icon.js';
import './spinner.js';

/** One record or action in `cm-command-palette`. */
export interface CommandPaletteItem {
  /** What it is or does: "Ravi Stores", "New lead", "Go to Tasks". */
  title: string;
  /** A second line in smaller grey text: "Lead · Mumbai". */
  description?: string;
  /** A page to open. Items with an `href` are links; items without one are actions your app runs (see `run` and `cm-select`). */
  href?: string;
  /** Icon name from `@commmerce/icons`, shown before the title. */
  icon?: string;
  /** Identifies the item in `cm-select`. */
  value?: string;
  /**
   * A key hint shown on the right as keycaps: `mod+shift+l` (⌘ ⇧ L on a Mac, Ctrl Shift L elsewhere), or `g t` for
   * keys pressed one after the other. Only shown: your app listens for the shortcut itself.
   */
  shortcut?: string;
  /** More words that find this action when typed: `['create', 'add']` for "New lead". Only used for `actions`. */
  keywords?: string[];
  /** Called when the item is chosen and `cm-select` wasn't cancelled, after the palette has closed. Set it in JavaScript. */
  run?: (item: CommandPaletteItem) => void;
}

/** A group of items in `cm-command-palette`: "Records", "Actions", "Navigate". */
export interface CommandPaletteGroup {
  /** Group heading: "Actions". */
  label: string;
  /** For search results: how many records match in total, shown next to the heading. Not shown when left out. */
  total?: number;
  /** The items, best first. */
  items: CommandPaletteItem[];
  /** For search results: link to every match (your list page filtered by the query). Shows a "See all" row. */
  href?: string;
  /** Text of that row, instead of the component's `see-all-label`. */
  seeAllLabel?: string;
}

const strings = defineStrings('commandPalette', {
  /** Accessible name of the dialog and its text box. */
  label: 'Command palette',
  placeholder: 'Search or run a command',
  /** Heading of the recent items, shown while the box is empty. */
  recent: 'Recent',
  /** Shown and announced when nothing matches. */
  noResults: 'No results',
  /** Announced as the list changes. */
  results: { one: '{count} result', other: '{count} results' },
  /** The row under a group of search results that links to every match. */
  seeAll: 'See all',
});
declare module '../localize.js' { interface CmStrings { commandPalette: typeof strings } }

type Row = { group: CommandPaletteGroup; item?: CommandPaletteItem; href?: string };
type View = { group: CommandPaletteGroup; rows: Row[] };

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase();

/** Whether an action matches a query: every word of the query appears in the title or a keyword (any case, any accents). */
export function commandMatches(item: CommandPaletteItem, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fold([item.title, ...(item.keywords ?? [])].join(' '));
  return words.every((w) => hay.includes(w));
}

/**
 * A search box in a dialog for people who work from the keyboard: jump to any record or run an action without
 * leaving the keys. Opens with `show()`, the `open` attribute or an opt-in page-wide shortcut (`shortcut="mod+k"`:
 * Cmd+K on a Mac, Ctrl+K elsewhere).
 *
 * Two kinds of content, in groups:
 * - `actions`: things your app can do or places it can go ("New lead", "Go to Tasks"), set once. The palette
 *   filters them itself as the merchant types (every typed word must appear in the title or a keyword).
 * - `results`: records your app finds, as in `cm-global-search`: listen for `cm-search`, fetch, then set
 *   `results` (and `loading` while it runs).
 *
 * While the box is empty it shows `recent` items, then every action.
 * Choosing an item fires a cancelable `cm-select` and closes the palette; links are followed, and an item's
 * `run` function is called, unless the event is cancelled.
 *
 * A native modal `<dialog>` like `cm-modal`: the page behind is inert, Escape and the backdrop close it, and focus
 * goes back to where it was. Inside, the text box is a combobox over a grouped listbox, as in `cm-global-search`.
 * @element cm-command-palette
 * @fires cm-search - As the merchant types (and when the box is cleared), with `detail: { query }`. Fetch records and set `results`.
 * @fires cm-select - When an item or a "See all" row is chosen, with `detail: { item, group, href }` (`item` is undefined for "See all"). The palette has already closed. Cancelable: `preventDefault()` stops the link and the item's `run`, to route in your app.
 * @fires cm-open - After the palette opens.
 * @fires cm-close - Before it closes from Escape, the backdrop, the close button or the shortcut. `detail: { reason }`. Cancelable.
 * @fires cm-closed - After it has closed and focus has gone back.
 * @csspart dialog - The native dialog.
 * @csspart panel - The white box.
 * @csspart box - The row with the search icon and the text input.
 * @csspart input - The text input.
 * @csspart close - The close button (narrow screens).
 * @csspart results - The scrolling area under the box.
 * @csspart listbox - The grouped list.
 */
export class CmCommandPalette extends CmOverlay {
  static properties = {
    ...CmOverlay.properties,
    label: { string: 'label' },
    placeholder: { string: 'placeholder' },
    value: {},
    results: { type: Array },
    actions: { type: Array },
    recent: { type: Array },
    loading: { type: Boolean, reflect: true },
    shortcut: {},
    emptyText: { attribute: 'empty-text', string: 'noResults' },
    loadingText: { attribute: 'loading-text', string: 'loading' },
    recentLabel: { attribute: 'recent-label', string: 'recent' },
    seeAllLabel: { attribute: 'see-all-label', string: 'seeAll' },
    _active: { state: true },
  };

  /** Accessible name of the dialog and its text box, read by screen readers but not shown. Default: the built-in string `label` ("Command palette"). */
  declare label: string;
  /** Text in the empty box: "Search leads, contacts or run a command". Default: the built-in string `placeholder` ("Search or run a command"). */
  placeholder!: string;
  /** The query. Updated as the merchant types; emptied when the palette closes. */
  value = '';
  /** Records found for the current query, grouped by kind, as in `cm-global-search`. Shown only while there is a query. Groups with no items are skipped. */
  results: CommandPaletteGroup[] = [];
  /** Actions and places, grouped ("Actions", "Navigate"). Always available: filtered by the palette as the merchant types. */
  actions: CommandPaletteGroup[] = [];
  /** Items the merchant chose recently, shown under "Recent" while the box is empty. Your app keeps the list (e.g. add the chosen item in `cm-select`). */
  recent: CommandPaletteItem[] = [];
  /** Shows "Loading" with a spinner in place of `results` while you fetch them. Matching actions still show. */
  loading = false;
  /**
   * A shortcut that opens (and closes) the palette from anywhere on the page: `mod+k` is Cmd+K on a Mac and
   * Ctrl+K elsewhere. Off by default: turn it on for one palette per page. A shortcut without Ctrl, Cmd or Alt
   * (like `/`) is ignored while the merchant is typing in a field. The page only gets the key while it has focus
   * (not from the address bar; in an embedded app, only while focus is in the app's frame), and shortcuts the
   * browser reserves (Ctrl+T, Ctrl+W, Ctrl+N) can't be used: keep a visible button that calls `show()` too.
   */
  shortcut = '';
  /** Shown when nothing matches. Default: the built-in string `noResults` ("No results"). */
  emptyText!: string;
  /** Shown and announced while `loading`. Default: the built-in string `loading` ("Loading", shared with other components). */
  loadingText!: string;
  /** Heading of the `recent` items. Default: the built-in string `recent` ("Recent"). */
  recentLabel!: string;
  /** Text of each results group's "See all" row. Default: the built-in string `seeAll` ("See all"). */
  seeAllLabel!: string;

  _active = -1;

  constructor() {
    super();
    // CmOverlay starts `label` as ''; undefined reads the built-in string instead.
    (this as { label?: string }).label = undefined;
  }

  static styles = [
    ...CmOverlay.overlayStyles,
    popoverStyles,
    groupStyles,
    resultStyles,
    css`
      dialog {
        position: fixed; inset: 0; margin: max(var(--cm-space-16), 12dvh) auto auto; height: fit-content;
        width: min(var(--cm-command-palette-width, 640px), calc(100vw - 32px));
      }
      .panel { max-height: calc(88dvh - 32px); border-radius: var(--cm-radius-lg); box-shadow: var(--cm-shadow-lg); }
      .box {
        display: flex; align-items: center; gap: var(--cm-space-8); flex: 1; min-width: 0; height: var(--cm-control-height-lg);
        padding-block: 0; padding-inline: var(--cm-space-12) var(--cm-space-8); background: var(--cm-bg-page);
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      .box:focus-within { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .top {
        display: flex; align-items: center; gap: var(--cm-space-8); flex: none; padding: var(--cm-space-12);
        border-bottom: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      .box > cm-icon { flex: none; color: var(--cm-icon-selected); }
      input {
        flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; background: none; outline: none;
        font: inherit; font-size: var(--cm-font-size-14); color: var(--cm-text-default);
      }
      input::placeholder { color: var(--cm-text-tertiary); }
      .x { display: none; width: var(--cm-control-height-md); height: var(--cm-control-height-md); color: var(--cm-icon-selected); }
      .x:hover { background: var(--cm-bg-hover); }
      .x:focus-visible { outline: 2px solid var(--cm-border-strong); }
      .list { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding-inline: var(--cm-space-8); padding-block-end: var(--cm-space-4); }
      [role='option'] { border-radius: var(--cm-radius-sm); }
      .keys { display: flex; flex: none; gap: var(--cm-space-4); }
      .message { padding-inline: var(--cm-space-12); }
      @media (max-width: 640px) {
        dialog { width: 100vw; height: 100dvh; margin: 0; }
        .panel { height: 100%; max-height: none; border-radius: 0; box-shadow: none; }
        .esc { display: none; }
        .x { display: grid; }
      }
      @media (pointer: coarse) {
        .box { height: var(--cm-control-height-touch); }
        input { font-size: var(--cm-font-size-16); }
        .x { width: var(--cm-control-height-touch); height: var(--cm-control-height-touch); }
        [role='option'] { min-height: var(--cm-control-height-touch); }
      }
    `,
  ];

  /** Opens the palette if it is closed and closes it if it is open. */
  toggle() { if (this.open) this.requestClose('method'); else this.show(); }

  connectedCallback() {
    super.connectedCallback();
    document.addEventListener('keydown', this.#onShortcut);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('keydown', this.#onShortcut);
  }

  #onShortcut = (e: KeyboardEvent) => {
    if (!this.shortcut || e.defaultPrevented || e.repeat || !matchesShortcut(e, this.shortcut)) return;
    if (!this.open && !shortcutHasModifier(this.shortcut) && isTypingTarget(e)) return;
    if (this.open && !shortcutHasModifier(this.shortcut)) return; // the key types into the box
    e.preventDefault();
    this.toggle();
  };

  get #query() { return this.value.trim(); }

  /** What the list shows, in order: recent then every action (empty box), or results then matching actions. */
  #view(): View[] {
    const q = this.#query;
    const groups: View[] = [];
    const add = (group: CommandPaletteGroup, items: CommandPaletteItem[], withSeeAll = false) => {
      const rows: Row[] = items.map((item) => ({ group, item, href: item.href }));
      if (withSeeAll && group.href) rows.push({ group, href: group.href });
      if (items.length) groups.push({ group, rows });
    };
    if (!q) {
      if (this.recent?.length) add({ label: this.recentLabel, items: this.recent }, this.recent);
    } else if (!this.loading) {
      for (const g of this.results ?? []) if (g?.items?.length) add(g, g.items, true);
    }
    for (const g of this.actions ?? []) {
      if (g?.items?.length) add(g, q ? g.items.filter((it) => commandMatches(it, q)) : g.items);
    }
    return groups;
  }

  #rows(view = this.#view()) { return view.flatMap((v) => v.rows); }

  willUpdate(changed: PropertyValues) {
    super.willUpdate?.(changed);
    if (changed.has('open') && !this.open && changed.get('open')) { this.value = ''; this._active = -1; }
    if (['results', 'actions', 'recent', 'loading', 'value', 'open'].some((k) => changed.has(k))) {
      const n = this.#rows().length;
      // The first row is highlighted whenever there is one, so Enter runs it.
      if (this._active >= n || this._active < 0) this._active = n ? 0 : -1;
    }
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if ((changed.has('_active') || changed.has('open')) && this.open && this._active >= 0) {
      this.renderRoot.querySelector(`#${this.uid}-o${this._active}`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  /** Focus goes to the text box, with any text in it selected. */
  protected focusFirst() {
    const input = this.renderRoot.querySelector('input');
    input?.focus();
    input?.select();
  }

  #onInput = (e: Event) => {
    this.value = (e.target as HTMLInputElement).value;
    this._active = this.#rows().length ? 0 : -1;
    this.dispatchEvent(new CustomEvent('cm-search', { detail: { query: this.value }, bubbles: true, composed: true }));
  };

  #onKeyDown = (e: KeyboardEvent) => {
    const n = this.#rows().length;
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        this._active = moveActive(this._active, e.key === 'ArrowDown' ? 1 : -1, n);
        break;
      case 'Home':
      case 'End':
        if (e.shiftKey || !n) break; // Shift+Home/End still select text
        e.preventDefault();
        this._active = e.key === 'Home' ? 0 : n - 1;
        break;
      case 'Enter':
        if (e.isComposing || this._active < 0) break;
        e.preventDefault();
        this.renderRoot.querySelector<HTMLElement>(`#${this.uid}-o${this._active}`)?.click();
        break;
      default:
    }
  };

  #choose(e: MouseEvent, row: Row) {
    // Close first, so focus is back on the opener before the app reacts (e.g. opens a modal).
    this.closeNow();
    const ok = this.dispatchEvent(new CustomEvent('cm-select', {
      detail: { item: row.item, group: row.group, href: row.href }, bubbles: true, composed: true, cancelable: true,
    }));
    if (!ok) { e.preventDefault(); return; }
    row.item?.run?.(row.item);
  }

  #keys(spec?: string) {
    if (!spec) return nothing;
    return html`<span class="keys" aria-hidden="true">${shortcutKeys(spec).map((k) => html`<kbd>${k}</kbd>`)}</span>`;
  }

  render() {
    const view = this.open ? this.#view() : [];
    const rows = this.#rows(view);
    const q = this.#query;
    const items = rows.filter((r) => r.item).length;
    const status = !this.open || !q ? ''
      : this.loading ? this.loadingText
      : rows.length ? this.t('results', { count: items })
      : this.emptyText;
    const id = this.uid;
    let i = -1;
    return this.renderDialog(html`<div class="panel" part="panel">
      <div class="top">
        <div class="box" part="box">
          <cm-icon name="search" size="16"></cm-icon>
          <input id="${id}-in" part="input" type="text" role="combobox" enterkeyhint="go" autocomplete="off" spellcheck="false"
            aria-label=${this.label} placeholder=${this.placeholder || nothing} .value=${live(this.value)}
            aria-autocomplete="list" aria-expanded=${rows.length ? 'true' : 'false'} aria-controls="${id}-list"
            aria-activedescendant=${this._active >= 0 && rows.length ? `${id}-o${this._active}` : nothing}
            @input=${this.#onInput} @keydown=${this.#onKeyDown} />
          <kbd class="esc" aria-hidden="true">${shortcutKeys('escape')[0]}</kbd>
        </div>
        <button type="button" class="x" part="close" aria-label=${this.closeLabel} @click=${() => this.requestClose('close-button')}>
          <cm-icon name="close" size="18"></cm-icon></button>
      </div>
      <div class="list" part="results" @pointerdown=${(e: Event) => { if ((e.target as Element).closest?.('[role=option]')) e.preventDefault(); }}>
        ${this.loading && q
          ? html`<p class="message"><cm-spinner size="small" aria-hidden="true"></cm-spinner><span aria-hidden="true">${this.loadingText}</span></p>` : nothing}
        <div role="listbox" id="${id}-list" part="listbox" aria-label=${this.label} ?hidden=${!rows.length}>
          ${view.map((v, gi) => html`<div role="group" aria-labelledby="${id}-g${gi}">
            ${resultGroupHeading(`${id}-g${gi}`, v.group.label, v.group.total !== undefined ? this.formatNumber(v.group.total) : undefined, this.t('results', { count: v.group.total ?? 0 }))}
            ${v.rows.map((row) => {
              const n = ++i;
              const it = row.item;
              return resultOption({
                id: `${id}-o${n}`, active: n === this._active, href: row.href, cls: it ? '' : 'all',
                keyshortcuts: it?.shortcut ? ariaKeyShortcut(it.shortcut) : undefined,
                onHover: () => (this._active = n), onChoose: (e) => this.#choose(e, row),
              }, it ? resultContent(it, this.#keys(it.shortcut)) : html`<span class="text">${row.group.seeAllLabel || this.seeAllLabel}</span>`);
            })}
          </div>`)}
        </div>
        ${q && !this.loading && !rows.length ? html`<p class="message" aria-hidden="true">${this.emptyText}</p>` : nothing}
      </div>
      <span class="vh" role="status" aria-live="polite">${status}</span>
    </div>`);
  }
}
define('cm-command-palette', CmCommandPalette);

declare global { interface HTMLElementTagNameMap { 'cm-command-palette': CmCommandPalette } }
