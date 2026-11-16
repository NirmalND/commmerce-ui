import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement } from '../localize.js';

// Card heights measured from the Figma "Skeleton Display" board (main column 910px, side column 390px).
const MAIN = [472, 90, 90, 251];
const SIDE = [94, 266, 134, 191, 138];

/**
 * A whole-page loading placeholder: a page header bar and grey cards laid out like a detail page.
 * Show it while the first data for a page loads, then replace it with the page. Announces "Loading"
 * once to screen readers.
 * @element cm-skeleton-display
 */
export class CmSkeletonDisplay extends CmLocalizedElement {
  static properties = {
    layout: { reflect: true },
    navigation: { type: Boolean, reflect: true },
    label: { string: 'loading' },
  };

  /** `two-column` (main cards plus a side column, as on detail pages) or `one-column` (lists and settings). */
  layout: 'two-column' | 'one-column' = 'two-column';
  /** Adds a 250px side-navigation placeholder on the left. Admin chrome: for Commmerce products only, not for apps. */
  navigation = false;
  /** What screen readers announce while it shows. Default: the built-in string `loading` ("Loading"). */
  label!: string;

  static styles = [
    base,
    css`
      :host { display: block; }
      .page { display: grid; grid-template-columns: 1fr; gap: var(--cm-space-10); }
      :host([navigation]) .page { grid-template-columns: 250px minmax(0, 1fr); }
      .nav { grid-row: span 2; border-radius: 14px; min-height: 100%; }
      .body { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 3fr); gap: var(--cm-space-10); align-items: start; }
      :host([layout='one-column']) .body { grid-template-columns: minmax(0, 1fr); }
      :host([layout='one-column']) .side { display: none; }
      .col { display: grid; gap: var(--cm-space-10); }
      .bone {
        display: block; border-radius: var(--cm-radius-md); background: var(--cm-bg-input-filled);
        animation: pulse 1.6s ease-in-out infinite;
      }
      .head { height: 80px; }
      @keyframes pulse { 50% { background: var(--cm-thumb-bg); } }
      @media (prefers-reduced-motion: reduce) { .bone { animation: none; background: var(--cm-thumb-bg); } }
      @media (forced-colors: active) { .bone { border: 1px solid CanvasText; } }
      .sr { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 768px) {
        :host([navigation]) .page { grid-template-columns: minmax(0, 1fr); }
        .nav { display: none; }
        .body { grid-template-columns: minmax(0, 1fr); }
        .head { height: 60px; }
      }
    `,
  ];

  render() {
    const bones = (hs: number[]) => hs.map((h) => html`<span class="bone" style="height:${h}px"></span>`);
    return html`<div class="wrap" part="skeleton-display" aria-busy="true">
      <span class="sr" role="status">${this.label}</span>
      <div class="page" aria-hidden="true">
        ${this.navigation ? html`<span class="bone nav"></span>` : nothing}
        <span class="bone head"></span>
        <div class="body">
          <div class="col main">${bones(this.layout === 'one-column' ? [472, 251] : MAIN)}</div>
          <div class="col side">${bones(SIDE)}</div>
        </div>
      </div>
    </div>`;
  }
}
define('cm-skeleton-display', CmSkeletonDisplay);

declare global { interface HTMLElementTagNameMap { 'cm-skeleton-display': CmSkeletonDisplay } }
