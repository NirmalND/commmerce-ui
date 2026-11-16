import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('pagination', {
  /** Accessible name of the navigation landmark. */
  label: 'Pagination',
  /** Label of the rows-per-page picker. */
  rows: 'Number of rows',
  /** The summary. `{resource}` is `resource-name`, or empty. */
  summary: 'Showing {from}–{to} of {total} {resource}',
  /** Label of the page field. */
  page: 'Page',
  /** After the page field. */
  of: 'of {count}',
  /** Accessible names of the arrows. */
  previous: 'Previous page',
  next: 'Next page',
});
declare module '../localize.js' { interface CmStrings { pagination: typeof strings } }

/**
 * Moves through a long list one page at a time. A 52px bar under a list or table: rows per page on
 * the left, "Showing 21–40 of 290" in the middle, and "Page [n] of N" with previous/next arrows on
 * the right. On phones only the page field and arrows remain.
 *
 * The component does not load data: listen for `cm-page-change` and `cm-page-size-change`, fetch,
 * then set `page` (and `total`) yourself.
 * @element cm-pagination
 * @fires cm-page-change - `detail: { page }` when the merchant asks for another page.
 * @fires cm-page-size-change - `detail: { pageSize }` when rows per page changes. `page` resets to 1.
 */
export class CmPagination extends CmLocalizedElement {
  static properties = {
    page: { type: Number, reflect: true },
    total: { type: Number },
    pageSize: { type: Number, attribute: 'page-size' },
    pageSizes: { type: Array, attribute: 'page-sizes' },
    label: { string: 'label' },
    resourceName: { attribute: 'resource-name' },
    _draft: { state: true },
  };

  /** Current page, starting at 1. */
  page = 1;
  /** Total number of items across all pages. 0 hides the summary. */
  total = 0;
  /** Items per page. */
  pageSize = 20;
  /** Choices for "Number of rows". Empty hides the picker. JSON in the attribute: `page-sizes="[10,20,50]"`. */
  pageSizes: number[] = [10, 20, 50, 100];
  /** Accessible name of the navigation landmark. Change it when a page has two paginations. Default: the built-in string `label` ("Pagination"). */
  label!: string;
  /** Plural noun used in the summary, e.g. "products": "Showing 21–40 of 290 products". */
  resourceName = '';

  _draft: string | null = null;
  #id = nextId('cm-pg');

  static styles = [
    base,
    css`
      :host { display: block; }
      nav {
        display: flex; align-items: center; gap: var(--cm-space-20); min-height: 52px; padding: 0 var(--cm-space-16);
        background: var(--cm-bg-surface); border-radius: var(--cm-radius-md); font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14);
        font-variant-numeric: tabular-nums;
      }
      .rows, .pages, .counter { display: flex; align-items: center; gap: var(--cm-space-8); white-space: nowrap; }
      .summary { flex: 1; text-align: center; white-space: nowrap; }
      .field { position: relative; display: inline-flex; }
      select, input {
        height: var(--cm-control-height-sm); font: inherit; font-weight: 500; color: var(--cm-text-default); background: var(--cm-bg-surface);
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
      }
      select { appearance: none; padding-block: 0; padding-inline: var(--cm-space-8) var(--cm-space-24); min-width: 56px; cursor: pointer; }
      .field cm-icon { position: absolute; inset-inline-end: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; }
      input { width: 40px; padding: 0; text-align: center; -moz-appearance: textfield; }
      input::-webkit-inner-spin-button, input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      select:focus-visible, input:focus-visible, button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .arrows { display: flex; gap: var(--cm-space-8); margin-inline-start: var(--cm-space-8); }
      button {
        width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; padding: 0; cursor: pointer;
        color: var(--cm-icon-selected); background: var(--cm-bg-hover);
        border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-sm);
      }
      button:hover:not(:disabled) { border-color: var(--cm-border-strong); }
      button:disabled { color: var(--cm-text-secondary); cursor: not-allowed; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (pointer: coarse) {
        select, input { height: var(--cm-control-height-touch); }
        button { width: var(--cm-control-height-touch); height: var(--cm-control-height-touch); }
      }
      @media (max-width: 640px) {
        nav { min-height: 48px;
 padding: 0 var(--cm-space-8); justify-content: space-between; }

        .rows, .summary { display: none; }
        .pages { flex: 1; justify-content: space-between; }
        .arrows { display: contents; }
        .prev { order: -1; }
      }
    `,
  ];

  /** Number of pages, at least 1. */
  get pageCount() {
    return Math.max(1, Math.ceil((this.total || 0) / Math.max(1, this.pageSize)));
  }

  /** Moves to a page (clamped to 1…pageCount) and fires `cm-page-change` if it changed. */
  goTo(page: number) {
    const p = Math.min(this.pageCount, Math.max(1, Math.round(page) || 1));
    this._draft = null;
    if (p === this.page) { this.requestUpdate(); return; }
    this.page = p;
    this.dispatchEvent(new CustomEvent('cm-page-change', { detail: { page: p }, bubbles: true, composed: true }));
  }

  #onSize(e: Event) {
    const size = Number((e.target as HTMLSelectElement).value);
    if (size === this.pageSize) return;
    this.pageSize = size;
    this.page = 1;
    this.dispatchEvent(new CustomEvent('cm-page-size-change', { detail: { pageSize: size }, bubbles: true, composed: true }));
  }

  #onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); this.goTo(Number((e.target as HTMLInputElement).value)); }
    else if (e.key === 'Escape') { this._draft = null; (e.target as HTMLInputElement).value = String(this.page); }
  }

  render() {
    const count = this.pageCount;
    const page = Math.min(count, Math.max(1, this.page));
    const from = this.total ? (page - 1) * this.pageSize + 1 : 0;
    const to = Math.min(this.total, page * this.pageSize);
    const sizes = this.pageSizes ?? [];
    return html`
      <nav part="bar" aria-label=${this.label}>
        ${sizes.length
          ? html`<div class="rows" part="rows">
              <label for="${this.#id}-s">${this.t('rows')}</label>
              <span class="field"><select id="${this.#id}-s" @change=${this.#onSize}>
                ${(sizes.includes(this.pageSize) ? sizes : [...sizes, this.pageSize].sort((a, b) => a - b))
                  .map((s) => html`<option value=${s} ?selected=${s === this.pageSize}>${s}</option>`)}
              </select><cm-icon name="chevron-down" size="12"></cm-icon></span>
            </div>`
          : nothing}
        <div class="summary" part="summary" role="status">${this.total ? this.t('summary', { from, to, total: this.total, resource: this.resourceName }).replace(/\s+/g, ' ').trim() : nothing}</div>
        <div class="pages" part="pages">
          <span class="counter">
          <label for="${this.#id}-p">${this.t('page')}</label>
          <input id="${this.#id}-p" type="number" inputmode="numeric" min="1" max=${count}
            .value=${this._draft ?? String(page)} aria-describedby="${this.#id}-of"
            @input=${(e: Event) => (this._draft = (e.target as HTMLInputElement).value)}
            @keydown=${this.#onKey}
            @change=${(e: Event) => this.goTo(Number((e.target as HTMLInputElement).value))} />
          <span id="${this.#id}-of">${this.t('of', { count })}</span>
          </span>
          <span class="arrows">
            <button class="prev" type="button" part="previous" aria-label=${this.t('previous')} ?disabled=${page <= 1}
              @click=${() => this.goTo(page - 1)}><cm-icon name="chevron-left" size="12"></cm-icon></button>
            <button class="next" type="button" part="next" aria-label=${this.t('next')} ?disabled=${page >= count}
              @click=${() => this.goTo(page + 1)}><cm-icon name="chevron-right" size="12"></cm-icon></button>
          </span>
        </div>
      </nav>
    `;
  }
}
define('cm-pagination', CmPagination);

declare global { interface HTMLElementTagNameMap { 'cm-pagination': CmPagination } }
