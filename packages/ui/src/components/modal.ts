import { html, css } from 'lit';
import { define } from '../base.js';
import { CmOverlay } from '../overlay.js';

/**
 * A dialog over the page for a short task or a decision that must be made before going on: confirming a
 * deletion, editing one field, picking from a short list. A black header with the title and a close button,
 * the content, and the actions in a footer.
 *
 * Built on the native `<dialog>`: the page behind is inert (focus stays in the modal), Esc and a click on the
 * backdrop ask to close through `cm-close`, page scrolling is locked, and focus returns to the opener.
 * @element cm-modal
 * @slot - The content.
 * @slot footer - Actions, right-aligned: the main action last. Usually `cm-button`s.
 * @fires cm-open - After the modal opens.
 * @fires cm-close - Before it closes from Esc, the backdrop or the close button. `detail: { reason }`. Cancelable: call `preventDefault()` to keep it open (e.g. unsaved changes).
 * @fires cm-closed - After it has closed and focus has gone back.
 */
export class CmModal extends CmOverlay {
  static properties = {
    ...CmOverlay.properties,
    size: { reflect: true },
    _hasFooter: { state: true },
  };

  /** Width: `small` (400px, confirmations), `medium` (620px, default) or `large` (900px, lists and tables). Never wider than the screen. */
  size: 'small' | 'medium' | 'large' = 'medium';
  _hasFooter = false;

  connectedCallback() {
    super.connectedCallback();
    this._hasFooter = !!this.querySelector(':scope > [slot="footer"]');
  }

  static styles = [
    ...CmOverlay.overlayStyles,
    css`
      dialog { position: fixed; inset: 0; margin: auto; width: min(var(--cm-modal-width, 620px), calc(100vw - 32px)); }
      :host([size='small']) dialog { --cm-modal-width: 400px; }
      :host([size='large']) dialog { --cm-modal-width: 900px; }
      .panel { max-height: calc(100dvh - 64px); border-radius: var(--cm-radius-lg); box-shadow: var(--cm-shadow-lg); }

    `,
  ];

  #slot(e: Event) { this._hasFooter = (e.target as HTMLSlotElement).assignedElements().length > 0; }

  render() {
    return this.renderDialog(html`<div class="panel" part="panel" tabindex="-1">
      ${this.renderHeader()}
      <div class="body" part="body"><slot></slot></div>
      <footer class="foot" part="footer" ?hidden=${!this._hasFooter}><slot name="footer" @slotchange=${this.#slot}></slot></footer>
    </div>`);
  }
}
define('cm-modal', CmModal);

declare global { interface HTMLElementTagNameMap { 'cm-modal': CmModal } }
