import { html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('pageHeader', {
  /** Accessible name of the back link on narrow screens. */
  back: 'Back to {label}',
  /** Accessible name of the back link (`back-href`) when no `back-label` is given. */
  backOnly: 'Back',
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
 * On narrow screens the breadcrumbs collapse to a back link to the parent page. `back-href` (since 1.7) shows that
 * back link at every width instead, before the title: use it on record pages opened from a list (a lead, an order).
 * Type (owner standard, 1.6): title 24/32 semibold (20/28 on phones), description 13/18, breadcrumbs 13/18.
 * A badge in `title-adornment` sits beside the title and wraps under it only when the title runs out of room.
 * @element cm-page-header
 * @slot actions - Buttons, right-aligned, secondary first and the primary action last (large size).
 * @slot title-adornment - Badge or count next to the title.
 * @csspart description - The `description` line under the title.
 * @cssprop --cm-page-header-background - The header's background (default `bg-surface`). `cm-app-frame panel` makes it
 * transparent, so the header doesn't square off the panel's rounded corners. Since 1.8.2.
 * @fires cm-previous - When the previous-record arrow is pressed (with `pagination`).
 * @fires cm-next - When the next-record arrow is pressed (with `pagination`).
 */
export class CmPageHeader extends CmLocalizedElement {
  static properties = {
    heading: {},
    description: {},
    breadcrumbs: { type: Array },
    backHref: { attribute: 'back-href' },
    backLabel: { attribute: 'back-label' },
    pagination: { type: Boolean, reflect: true },
    hasPrevious: { type: Boolean, attribute: 'has-previous' },
    hasNext: { type: Boolean, attribute: 'has-next' },
  };

  /** Page title, rendered as the page's `<h1>` and as the last (current) breadcrumb. */
  heading = '';
  /**
   * One line under the title saying what the page is for, 13px in text-tertiary (owner standard: page description 13). Since 1.6.
   * On a record page, the record's facts at a glance: "Owner Asha Rao · Created 12 Nov 2026 · Source Website form".
   */
  description = '';
  /**
   * Parent pages, outermost first, as `{label, href}`. Don't include the current page.
   * In HTML pass JSON: `breadcrumbs='[{"label":"Products","href":"/products"}]'`.
   */
  breadcrumbs: Breadcrumb[] = [];
  /**
   * Address of the page this one was opened from (the list of leads, of orders). Shows a back arrow before the title
   * at every width, named "Back to {back-label}". Without it the arrow appears only on narrow screens, for the last
   * breadcrumb with an `href`. Since 1.7.
   */
  backHref = '';
  /** Name of the page `back-href` leads to ("Leads"), for the back arrow's accessible name. Since 1.7. */
  backLabel = '';
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
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--cm-space-12) var(--cm-space-20);
        min-height: 64px; padding: var(--cm-space-12) var(--cm-space-24);
        background: var(--cm-page-header-background, var(--cm-bg-surface)); border-bottom: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      .lead { flex: 1 1 280px; display: flex; align-items: center; gap: var(--cm-space-8); min-width: 0; }
      /* flex: 1 (issue #32): the titles column takes the room the lead has, so a title-adornment badge sits beside the
         title. Without it the column shrank to the h1's min-content and the badge always wrapped under the title. */
      .titles { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: var(--cm-space-4); }
      .desc { margin: 0; font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-tertiary); overflow-wrap: anywhere; }
      nav ol { display: flex; flex-wrap: wrap; margin: 0; padding: 0; list-style: none; font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-tertiary); }
      nav li { white-space: nowrap; }
      nav li + li::before { content: '/'; padding: 0 0.35em; }
      nav a { color: inherit; text-decoration: none; border-radius: var(--cm-radius-xs); }
      nav a:hover { color: var(--cm-text-default); text-decoration: underline; }
      nav a:focus-visible, .back:focus-visible, .arrow:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      nav [aria-current] { color: var(--cm-text-default); }
      h1 {
        display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-4) var(--cm-space-8); margin: 0; min-width: 0;
        font-family: var(--cm-font-display, inherit);
        font-size: var(--cm-type-heading-lg-size); font-weight: var(--cm-type-heading-lg-weight); line-height: var(--cm-type-heading-lg-line-height);
      }
      /* Badges in title-adornment wrap below the title only when title and badges don't fit on one line (flex-wrap breaks
         lines on the title's full width), instead of pushing the page wider; a title alone on its line is cut short with
         an ellipsis. No min-width: a 12ch minimum (1.2-1.5) pushed badges away from short titles (#32). */
      .text { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .actions { flex: none; display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-8); margin-inline-start: auto; }
      .arrows { display: flex; gap: var(--cm-space-8); }
      .arrow, .back {
        position: relative; display: inline-flex; align-items: center; justify-content: center; width: var(--cm-control-height-md, 36px); height: var(--cm-control-height-md, 36px); padding: 0;
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
        background: var(--cm-bg-surface); color: var(--cm-icon-selected); cursor: pointer;
      }
      .arrow:hover:not(:disabled), .back:hover { background: var(--cm-bg-hover); }
      .arrow:active:not(:disabled), .back:active { background: color-mix(in srgb, var(--cm-bg-hover), var(--cm-text-default) 8%); }
      .arrow:disabled { color: var(--cm-text-secondary); border-color: var(--cm-border-subtle); cursor: not-allowed; }
      .back { display: none; border: 0; flex: none; text-decoration: none; }
      .back.always { display: inline-flex; }
      /* Icon buttons (1.6): 36 x 36, 40 x 40 on touch screens with a 44px hit area. */
      @media (pointer: coarse) {
        .arrow, .back { width: var(--cm-control-height-lg, 40px); height: var(--cm-control-height-lg, 40px); }
        .arrow::after, .back::after { content: ''; position: absolute; inset: -2px; }
      }
      @media (max-width: 640px) {
        /* Title and actions share one row while they fit; otherwise the actions wrap below, so nothing spills sideways. */
        header { min-height: 48px; padding: var(--cm-space-8) var(--cm-space-16); gap: var(--cm-space-8); }
        .lead { flex: 1 1 160px; }
        /* With a description (a record's meta line) the title block takes the whole row and the actions go under it,
           so the meta line is not squeezed into a narrow column beside the buttons. Since 1.7. */
        .lead.described { flex-basis: 100%; }
        .actions { flex: 0 1 auto; min-width: 0; max-width: 100%; justify-content: flex-end; }
        nav { display: none; }
        .back { display: inline-flex; }
        h1 { font-size: var(--cm-type-heading-lg-resp-size); line-height: var(--cm-type-heading-lg-resp-line-height); }
        .actions { gap: var(--cm-space-8); }
      }
    `,
  ];

  #emit(name: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  render() {
    const crumbs = Array.isArray(this.breadcrumbs) ? this.breadcrumbs : [];
    const parent = this.backHref ? { href: this.backHref, label: this.backLabel } : [...crumbs].reverse().find((c) => c.href);
    return html`<header part="header">
      <div class=${this.description ? 'lead described' : 'lead'}>
        ${parent
          ? html`<a class=${this.backHref ? 'back always' : 'back'} part="back" href=${parent.href!} aria-label=${parent.label ? this.t('back', { label: parent.label }) : this.t('backOnly')}><cm-icon name="chevron-left" size="20"></cm-icon></a>`
          : nothing}
        <div class="titles">
          ${crumbs.length
            ? html`<nav aria-label=${this.t('breadcrumbs')} part="breadcrumbs"><ol>
                ${crumbs.map((c) => html`<li>${c.href ? html`<a href=${c.href}>${c.label}</a>` : c.label}</li>`)}
                <li><span aria-current="page">${this.heading}</span></li>
              </ol></nav>`
            : nothing}
          <h1 part="title"><span class="text">${this.heading}</span><slot name="title-adornment"></slot></h1>
          ${this.description ? html`<p class="desc" part="description">${this.description}</p>` : nothing}
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
