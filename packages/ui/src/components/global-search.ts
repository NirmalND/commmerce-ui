import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { popoverStyles, closeOnOutsidePointer } from '../popover.js';
import './icon.js';
import './spinner.js';

/** One result in `cm-global-search`. */
export interface GlobalSearchItem {
  /** The record's name: "Ravi Stores". */
  title: string;
  /** A second line in smaller grey text: "Lead · Mumbai · +91 98200 12345". */
  description?: string;
  /** The record's page. Every result is a link. */
  href: string;
  /** Icon name from `@commmerce/icons`, shown before the title. */
  icon?: string;
  /** Identifies the result in `cm-select`. Defaults to the href. */
  value?: string;
}

/** A group of results of one kind ("Leads", "Deals") in `cm-global-search`. */
export interface GlobalSearchGroup {
  /** Group heading: "Leads". */
  label: string;
  /** How many records of this kind match in total, shown next to the heading. Defaults to the number of items. */
  total?: number;
  /** The results shown, best first. Keep to about five per group. */
  items: GlobalSearchItem[];
  /** Link to every match of this kind (your list page filtered by the query). Shows a "See all" row. */
  href?: string;
  /** Text of that row, instead of the component's `see-all-label`. */
  seeAllLabel?: string;
}

const strings = defineStrings('globalSearch', {
  /** Accessible name and placeholder of the text box. */
  label: 'Search',
  placeholder: 'Search',
  /** Shown and announced when nothing matches. */
  noResults: 'No results',
  /** Announced as results arrive; also read after each group heading for its total. */
  results: { one: '{count} result', other: '{count} results' },
  /** The row under a group that links to every match. */
  seeAll: 'See all',
  /** Accessible name of the clear button. */
  clear: 'Clear search',
});
declare module '../localize.js' { interface CmStrings { globalSearch: typeof strings } }

type Row = { group: GlobalSearchGroup; item?: GlobalSearchItem; href: string };

/**
 * One box that searches everything (customers, orders, products…) and lists the matches grouped by kind, each a
 * link to its page. Your app does the searching: listen for `cm-search`, fetch, then set `results` (and `loading`
 * while it runs). Put it in the header bar's `search` slot: on narrow screens the bar shows a search button that
 * opens it full screen.
 *
 * Unlike `cm-combobox`, which picks a value for a form, choosing a result navigates.
 * Follows the WAI-ARIA combobox pattern with a grouped listbox: focus stays in the text box and the highlighted
 * result is announced with `aria-activedescendant`.
 * @element cm-global-search
 * @fires cm-search - As the merchant types (and when the box is cleared), with `detail: { query }`. Fetch results and set `results`.
 * @fires cm-select - When a result or a "See all" row is chosen, with `detail: { href, item, group }` (`item` is undefined for "See all"). Cancelable: `preventDefault()` stops the link, to route in your app.
 * @csspart box - The bordered box around the icon and the text input.
 * @csspart input - The text input.
 * @csspart popover - The panel under the box that holds the results.
 * @csspart listbox - The grouped list of results.
 * @cssprop --cm-global-search-results-position - `position` of the results panel. Default `absolute` (over the page); the header bar's full-screen layer sets `static`.
 * @cssprop --cm-global-search-results-max-height - Tallest the results panel gets before it scrolls. Default `min(480px, 100dvh - 140px)`.
 * @cssprop --cm-global-search-results-shadow - Shadow of the results panel. Default `var(--cm-shadow-100)`.
 */
export class CmGlobalSearch extends CmLocalizedElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: { string: 'label' },
    placeholder: { string: 'placeholder' },
    value: {},
    results: { type: Array },
    loading: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    emptyText: { attribute: 'empty-text', string: 'noResults' },
    loadingText: { attribute: 'loading-text', string: 'loading' },
    seeAllLabel: { attribute: 'see-all-label', string: 'seeAll' },
    shortcut: {},
    _active: { state: true },
  };

  /** Accessible name of the box, read by screen readers but not shown. Default: the built-in string `label` ("Search"). */
  label!: string;
  /** Example query in the empty box: "Search leads, deals, contacts". Default: the built-in string `placeholder` ("Search"). */
  placeholder!: string;
  /** The query. Updated as the merchant types. */
  value = '';
  /** Results for the current query, grouped by kind. Set it when your search returns. Groups with no items are skipped. */
  results: GlobalSearchGroup[] = [];
  /** Shows "Loading" with a spinner in place of the results while you fetch them. */
  loading = false;
  /** Whether the results panel is showing. It shows only while there is a query. */
  open = false;
  /** Shown when a query has no results. Default: the built-in string `noResults` ("No results"). */
  emptyText!: string;
  /** Shown and announced while `loading`. Default: the built-in string `loading` ("Loading", shared with other components). */
  loadingText!: string;
  /** Text of each group's "See all" row. Default: the built-in string `seeAll` ("See all"). */
  seeAllLabel!: string;
  /**
   * A key that moves focus to the box from anywhere on the page, e.g. `/`. Off by default: turn it on only for
   * one search per page. It is ignored while the merchant is typing in a field or holding Ctrl, Alt or Cmd.
   */
  shortcut = '';

  _active = -1;
  #id = nextId('cm-gs');
  #stopOutside?: () => void;

  static styles = [
    base,
    popoverStyles,
    css`
      :host { display: block; position: relative; }
      .wrap { position: relative; }
      .box {
        display: flex; align-items: center; gap: var(--cm-space-10); height: 42px; padding: 0 var(--cm-space-10);
        background: var(--cm-bg-page); color: var(--cm-text-default);
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      .box:focus-within { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .icon { flex: none; color: var(--cm-icon-selected); }
      input {
        flex: 1; min-width: 0; height: 100%; padding: 0; border: 0; background: none; outline: none;
        font: inherit; font-size: 14px; color: var(--cm-text-default);
      }
      input::placeholder { color: var(--cm-text-tertiary); }
      input::-webkit-search-cancel-button { display: none; }
      .clear {
        flex: none; display: inline-flex; align-items: center; justify-content: center;
        width: 28px; height: 28px; margin: 0 -4px; padding: 0; border: 0; border-radius: var(--cm-radius-sm);
        background: none; color: var(--cm-icon-selected); cursor: pointer;
      }
      .clear:hover { background: var(--cm-bg-hover); }
      .clear:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 0; }
      kbd {
        flex: none; min-width: 20px; padding: 0 5px; font: inherit; font-size: 12px; line-height: 18px; text-align: center;
        color: var(--cm-text-tertiary); border: var(--cm-border-1) solid var(--cm-border-default); border-radius: var(--cm-radius-xs);
      }
      .box:focus-within kbd { display: none; }
      .pop {
        position: var(--cm-global-search-results-position, absolute);
        box-shadow: var(--cm-global-search-results-shadow, var(--cm-shadow-100));
        overflow-y: auto; max-height: var(--cm-global-search-results-max-height, min(480px, calc(100dvh - 140px)));
      }
      [role='listbox'] { padding-block: 6px; }
      [role='listbox'][hidden] { display: none; }
      [role='group'] + [role='group'] { margin-block-start: 6px; padding-block-start: 6px; border-top: var(--cm-border-1) solid var(--cm-border-default); }
      .gh {
        display: flex; align-items: baseline; gap: var(--cm-space-10); padding: 6px var(--cm-space-20) 2px;
        font-size: 12px; line-height: 16px; font-weight: 600; color: var(--cm-text-default);
      }
      .gh .count { font-weight: 400; color: var(--cm-text-tertiary); }
      [role='option'] {
        display: flex; align-items: center; gap: var(--cm-space-10); min-height: 40px; padding: 6px var(--cm-space-20);
        font-size: 14px; line-height: 20px; color: var(--cm-text-default); text-decoration: none; cursor: pointer;
      }
      [role='option'].active { background: var(--cm-bg-hover); box-shadow: inset 2px 0 0 var(--cm-border-strong); }
      [role='option'].active:dir(rtl) { box-shadow: inset -2px 0 0 var(--cm-border-strong); }
      [role='option'] cm-icon { flex: none; color: var(--cm-icon-selected); }
      .text { flex: 1; min-width: 0; }
      .title, .desc { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .desc { font-size: 12px; line-height: 16px; color: var(--cm-text-tertiary); }
      .all { font-size: 13px; text-decoration: underline; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#stopOutside = closeOnOutsidePointer(this, () => this.open, () => this.#hide());
    document.addEventListener('keydown', this.#onShortcut);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#stopOutside?.();
    document.removeEventListener('keydown', this.#onShortcut);
  }

  /** Results flattened in reading order: each group's items, then its "See all" row. */
  #rows(): Row[] {
    if (this.loading) return [];
    return (this.results ?? []).filter((g) => g?.items?.length).flatMap((group) => [
      ...group.items.map((item) => ({ group, item, href: item.href })),
      ...(group.href ? [{ group, href: group.href }] : []),
    ]);
  }

  get #showing() { return this.open && !!this.value.trim(); }

  willUpdate(changed: PropertyValues) {
    if (changed.has('results') || changed.has('loading') || changed.has('value')) {
      if (this._active >= this.#rows().length) this._active = -1;
    }
  }

  updated(changed: PropertyValues) {
    if ((changed.has('_active') || changed.has('open')) && this.open && this._active >= 0) {
      this.renderRoot.querySelector(`#${this.#id}-o${this._active}`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  #hide() { this.open = false; this._active = -1; }

  #search() {
    this.dispatchEvent(new CustomEvent('cm-search', { detail: { query: this.value }, bubbles: true, composed: true }));
  }

  #onInput = (e: Event) => {
    this.value = (e.target as HTMLInputElement).value;
    this._active = -1;
    this.open = !!this.value.trim();
    this.#search();
  };

  #move(step: number) {
    const n = this.#rows().length;
    if (!n) { this._active = -1; return; }
    if (this._active < 0) this._active = step > 0 ? 0 : n - 1;
    else this._active = (this._active + step + n) % n;
  }

  #onKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        e.preventDefault();
        if (!this.value.trim()) break;
        if (!this.open) this.open = true;
        this.#move(e.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'Enter':
        if (this.#showing && this._active >= 0) {
          e.preventDefault();
          this.renderRoot.querySelector<HTMLAnchorElement>(`#${this.#id}-o${this._active}`)?.click();
        }
        break;
      case 'Escape':
        if (this.#showing) { e.preventDefault(); e.stopPropagation(); this.#hide(); }
        else if (this.value) { e.preventDefault(); this.#clear(false); }
        break;
      case 'Tab':
        this.#hide();
        break;
      default:
    }
  };

  #onShortcut = (e: KeyboardEvent) => {
    if (!this.shortcut || e.key !== this.shortcut || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    const t = e.composedPath()[0] as HTMLElement | undefined;
    if (t && (t.isContentEditable || /^(input|textarea|select)$/i.test(t.localName ?? ''))) return;
    if (!this.getClientRects().length) return; // hidden, e.g. inside a closed layer
    e.preventDefault();
    this.focus();
  };

  #clear(focus = true) {
    this.value = '';
    this.#hide();
    if (focus) this.renderRoot.querySelector('input')?.focus();
    this.#search();
  }

  #choose(e: MouseEvent, row: Row) {
    const ok = this.dispatchEvent(new CustomEvent('cm-select', {
      detail: { href: row.href, item: row.item, group: row.group }, bubbles: true, composed: true, cancelable: true,
    }));
    if (!ok) e.preventDefault();
    this.#hide();
  }

  render() {
    const rows = this.#rows();
    const showing = this.#showing;
    const items = rows.filter((r) => r.item).length;
    const status = this.loading && showing ? this.loadingText
      : !showing ? ''
      : rows.length ? this.t('results', { count: items })
      : this.emptyText;
    let i = -1;
    const groups = (this.results ?? []).filter((g) => g?.items?.length);
    const option = (row: Row, content: unknown, cls = '') => {
      i++;
      const n = i;
      return html`<a role="option" id="${this.#id}-o${n}" class="${cls}${n === this._active ? ' active' : ''}" href=${row.href} tabindex="-1"
        aria-selected=${n === this._active ? 'true' : 'false'} @pointerenter=${() => (this._active = n)}
        @click=${(e: MouseEvent) => this.#choose(e, row)}>${content}</a>`;
    };
    return html`<div class="wrap">
      <div class="box" part="box" @click=${(e: Event) => { if (e.target === e.currentTarget) this.focus(); }}>
        <cm-icon class="icon" name="search" size="14"></cm-icon>
        <input id="${this.#id}-in" part="input" type="search" role="combobox" enterkeyhint="search" autocomplete="off" spellcheck="false"
          aria-label=${this.label} placeholder=${this.placeholder || nothing} .value=${live(this.value)}
          aria-autocomplete="list" aria-expanded=${showing ? 'true' : 'false'} aria-controls="${this.#id}-list"
          aria-activedescendant=${showing && this._active >= 0 ? `${this.#id}-o${this._active}` : nothing}
          aria-keyshortcuts=${this.shortcut || nothing}
          @input=${this.#onInput} @keydown=${this.#onKeyDown}
          @focus=${() => { if (this.value.trim()) this.open = true; }} @click=${() => { if (this.value.trim()) this.open = true; }} />
        ${this.value
          ? html`<button type="button" class="clear" part="clear" aria-label=${this.t('clear')} @click=${() => this.#clear()}><cm-icon name="close" size="14"></cm-icon></button>`
          : this.shortcut ? html`<kbd aria-hidden="true">${this.shortcut}</kbd>` : nothing}
      </div>
      <div class="pop" part="popover" ?hidden=${!showing} @pointerdown=${(e: Event) => e.preventDefault()}>
        <div role="listbox" id="${this.#id}-list" part="listbox" aria-label=${this.label} ?hidden=${!rows.length}>
          ${groups.map((g, gi) => {
            const total = g.total ?? g.items.length;
            return html`<div role="group" aria-labelledby="${this.#id}-g${gi}">
              <div role="presentation" class="gh" id="${this.#id}-g${gi}"><span>${g.label}</span><span class="count" aria-hidden="true">${this.formatNumber(total)}</span><span class="vh">, ${this.t('results', { count: total })}</span></div>
              ${g.items.map((it) => option({ group: g, item: it, href: it.href }, html`${it.icon ? html`<cm-icon name=${it.icon} size="16"></cm-icon>` : nothing}<span class="text"><span class="title">${it.title}</span>${it.description ? html`<span class="vh">, </span><span class="desc">${it.description}</span>` : nothing}</span>`))}
              ${g.href ? option({ group: g, href: g.href }, html`<span class="text">${g.seeAllLabel || this.seeAllLabel}</span>`, 'all') : nothing}
            </div>`;
          })}
        </div>
        ${this.loading
          ? html`<p class="message"><cm-spinner size="small" aria-hidden="true"></cm-spinner><span aria-hidden="true">${this.loadingText}</span></p>`
          : !rows.length ? html`<p class="message" aria-hidden="true">${this.emptyText}</p>` : nothing}
      </div>
      <span class="vh" role="status" aria-live="polite">${status}</span>
    </div>`;
  }
}
define('cm-global-search', CmGlobalSearch);

declare global { interface HTMLElementTagNameMap { 'cm-global-search': CmGlobalSearch } }
