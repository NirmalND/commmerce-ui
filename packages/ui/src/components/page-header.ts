import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('pageHeader', {
  /** Accessible name of the back link on narrow screens. */
  back: 'Back to {label}',
  /** Accessible name of the breadcrumb navigation. */
  breadcrumbs: 'Breadcrumb',
  /** Accessible names of the record arrows and their group. */
  records: 'Records',
  previous: 'Previous',
  next: 'Next',
});
declare module '../localize.js' { interface CmStrings { pageHeader: typeof strings } }

/** One breadcrumb link above the page title. */
export interface Breadcrumb {
  label: string;
  href?: string;
}

/**
 * Top of an admin page: breadcrumbs, the page title and the page's main actions.
 * The Figma file calls this the "Save Bar" (80px desktop, 50px mobile).
 * On narrow screens the breadcrumbs collapse to a back link to the parent page.
 * @element cm-page-header
 * @slot actions - Buttons, right-aligned, secondary first and the primary action last (large size).
 * @slot title-adornment - Badge or count next to the title.
 * @fires cm-previous - When the previous-record arrow is pressed (with `pagination`).
 * @fires cm-next - When the next-record arrow is pressed (with `pagination`).
 */
export class CmPageHeader extends CmLocalizedElement {
  static properties = {
    heading: {},
    breadcrumbs: { type: Array },
    pagination: { type: Boolean, reflect: true },
    hasPrevious: { type: Boolean, attribute: 'has-previous' },
    hasNext: { type: Boolean, attribute: 'has-next' },
  };

  /** Page title, rendered as the page's `<h1>` and as the last (current) breadcrumb. */
  heading = '';
  /**
   * Parent pages, outermost first, as `{label, href}`. Don't include the current page.
   * In HTML pass JSON: `breadcrumbs='[{"label":"Products","href":"/products"}]'`.
   */
  breadcrumbs: Breadcrumb[] = [];
  /** Shows previous/next arrows for stepping through records (orders, products). */
  pagination = false;
  /** Enables the previous arrow. */
  hasPrevious = false;
  /** Enables the next arrow. */
  hasNext = false;

  static styles = [
    base,
    css`
      :host { display: block; }
      header {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--cm-space-20);
        min-height: 80px; padding: var(--cm-space-12) var(--cm-space-20);
        background: var(--cm-bg-surface); border-bottom: var(--cm-border-1) solid var(--cm-border-default);
      }
      .lead { flex: 1 1 280px; display: flex; align-items: center; gap: var(--cm-space-10); min-width: 0; }
      .titles { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
      nav ol { display: flex; flex-wrap: wrap; margin: 0; padding: 0; list-style: none; font-size: 14px; color: var(--cm-text-tertiary); }
      nav li { white-space: nowrap; }
      nav li + li::before { content: '/'; padding: 0 0.35em; }
      nav a { color: inherit; text-decoration: none; border-radius: var(--cm-radius-xs); }
      nav a:hover { color: var(--cm-text-default); text-decoration: underline; }
      nav a:focus-visible, .back:focus-visible, .arrow:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      nav [aria-current] { color: var(--cm-text-default); }
      h1 {
        display: flex; flex-wrap: wrap; align-items: center; gap: 6px var(--cm-space-10); margin: 0; min-width: 0;
        font-size: 26px; font-weight: 500; line-height: 1.2;
      }
      /* The title keeps at least about 12 characters; badges in title-adornment wrap below it instead of pushing the page wider. */
      .text { flex: 0 1 auto; min-width: min(12ch, 100%); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .actions { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-20); margin-inline-start: auto; }
      .arrows { display: flex; gap: var(--cm-space-10); }
      .arrow, .back {
        display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; padding: 0;
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
        background: var(--cm-bg-surface); color: var(--cm-icon-selected); cursor: pointer;
      }
      .arrow:hover:not(:disabled), .back:hover { background: var(--cm-bg-hover); }
      .arrow:disabled { color: var(--cm-text-secondary); border-color: var(--cm-border-default); cursor: not-allowed; }
      .back { display: none; border: 0; flex: none; text-decoration: none; }
      @media (max-width: 640px) {
        /* Title and actions share one row while they fit; otherwise the actions wrap below, so nothing spills sideways. */
        header { min-height: 50px; padding: var(--cm-space-10); gap: var(--cm-space-10); }
        .lead { flex: 1 1 160px; }
        .actions { flex: 0 1 auto; min-width: 0; max-width: 100%; justify-content: flex-end; }
        nav { display: none; }
        .back { display: inline-flex; }
        h1 { font-size: 18px; font-weight: 600; }
        .actions { gap: var(--cm-space-10); }
      }
    `,
  ];

  #emit(name: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  render() {
    const crumbs = Array.isArray(this.breadcrumbs) ? this.breadcrumbs : [];
    const parent = [...crumbs].reverse().find((c) => c.href);
    return html`<header part="header">
      <div class="lead">
        ${parent
          ? html`<a class="back" part="back" href=${parent.href!} aria-label=${this.t('back', { label: parent.label })}><cm-icon name="chevron-left" size="20"></cm-icon></a>`
          : nothing}
        <div class="titles">
          ${crumbs.length
            ? html`<nav aria-label=${this.t('breadcrumbs')} part="breadcrumbs"><ol>
                ${crumbs.map((c) => html`<li>${c.href ? html`<a href=${c.href}>${c.label}</a>` : c.label}</li>`)}
                <li><span aria-current="page">${this.heading}</span></li>
              </ol></nav>`
            : nothing}
          <h1 part="title"><span class="text">${this.heading}</span><slot name="title-adornment"></slot></h1>
        </div>
      </div>
      <div class="actions">
        ${this.pagination
          ? html`<div class="arrows" role="group" aria-label=${this.t('records')}>
              <button class="arrow" type="button" aria-label=${this.t('previous')} ?disabled=${!this.hasPrevious} @click=${() => this.#emit('cm-previous')}><cm-icon name="chevron-left" size="16"></cm-icon></button>
              <button class="arrow" type="button" aria-label=${this.t('next')} ?disabled=${!this.hasNext} @click=${() => this.#emit('cm-next')}><cm-icon name="chevron-right" size="16"></cm-icon></button>
            </div>`
          : nothing}
        <slot name="actions"></slot>
      </div>
    </header>`;
  }
}
define('cm-page-header', CmPageHeader);

declare global { interface HTMLElementTagNameMap { 'cm-page-header': CmPageHeader } }
