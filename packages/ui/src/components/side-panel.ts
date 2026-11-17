import { html, css } from 'lit';
import { define } from '../base.js';
import { CmOverlay } from '../overlay.js';

/**
 * A panel that slides over the right edge of the page (the left edge in right-to-left pages) to show the details of one item (an enquiry, an
 * order, a customer) without leaving the list. A black header with the title and a close button, the
 * content, and an optional footer. On phones it becomes a card inset 16px from the screen edges.
 *
 * A native modal `<dialog>`: the page behind is inert, Esc and the backdrop ask to close through
 * `cm-close`, page scrolling is locked, and focus returns to the opener.
 * @element cm-side-panel
 * @slot - The content.
 * @slot footer - Actions at the bottom, right-aligned.
 * @fires cm-open - After the panel opens.
 * @fires cm-close - Before it closes from Esc, the backdrop or the close button. `detail: { reason }`. Cancelable.
 * @fires cm-closed - After it has closed and focus has gone back.
 */
export class CmSidePanel extends CmOverlay {
  static properties = {
    ...CmOverlay.properties,
    size: { reflect: true },
    _hasFooter: { state: true },
  };

  /** Width on larger screens: `small` (380px), `medium` (450px, default) or `large` (720px). */
  size: 'small' | 'medium' | 'large' = 'medium';
  _hasFooter = false;

  connectedCallback() {
    super.connectedCallback();
    this._hasFooter = !!this.querySelector(':scope > [slot="footer"]');
  }

  static styles = [
    ...CmOverlay.overlayStyles,
    css`
      dialog {
        position: fixed; inset-block: 0; inset-inline: auto 0; height: 100dvh; width: min(var(--cm-side-panel-width, 450px), 100vw);
      }
      :host([size='small']) dialog { --cm-side-panel-width: 380px; }
      :host([size='large']) dialog { --cm-side-panel-width: 720px; }
      .panel { height: 100%; box-shadow: var(--cm-shadow-lg); }
      @media (prefers-reduced-motion: no-preference) {
        dialog[open] .panel { animation: cm-side-in var(--cm-duration-base) var(--cm-easing-standard); }
      }
      /* Slides in from the end edge: from the right, or from the left in right-to-left pages. */
      dialog:dir(rtl) { --_cm-side-from: -24px; }
      @keyframes cm-side-in { from { transform: translateX(var(--_cm-side-from, 24px)); opacity: 0; } to { transform: none; opacity: 1; } }
      @media (max-width: 599px) {
        dialog { inset: 16px; width: auto; height: auto; }
        .panel { border-radius: var(--cm-radius-lg); }

      }
    `,
  ];

  #slot(e: Event) { this._hasFooter = (e.target as HTMLSlotElement).assignedElements().length > 0; }

  /** Content between the header and the footer. Filter panel adds its search field here. */
  protected renderBody() { return html`<slot></slot>`; }
  protected renderFooter() { return html`<slot name="footer" @slotchange=${this.#slot}></slot>`; }
  protected get showFooter() { return this._hasFooter; }

  render() {
    return this.renderDialog(html`<div class="panel" part="panel" tabindex="-1">
      ${this.renderHeader()}
      <div class="body" part="body">${this.renderBody()}</div>
      <footer class="foot" part="footer" ?hidden=${!this.showFooter}>${this.renderFooter()}</footer>
    </div>`);
  }
}
define('cm-side-panel', CmSidePanel);

declare global { interface HTMLElementTagNameMap { 'cm-side-panel': CmSidePanel } }
