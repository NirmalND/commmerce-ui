import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import './icon.js';

/**
 * A dark strip across the top of the page with one short offer or call to action, such as
 * "Publish your store with a Commmerce plan - Click here to pick a plan". Links inside it are green.
 * @element cm-flash-offer-bar
 * @slot - The message. Put one `<a>` inside it for the action.
 * @slot icon - Replaces the leading icon.
 * @fires cm-dismiss - When the close button is pressed (with `dismissible`). The bar hides itself unless the event is cancelled.
 */
export class CmFlashOfferBar extends LitElement {
  static properties = {
    icon: {},
    dismissible: { type: Boolean, reflect: true },
    label: {},
  };

  /** Leading icon from @commmerce/icons. Empty hides it. */
  icon = 'send';
  /** Shows a close button. */
  dismissible = false;
  /** Accessible name of the bar's region. */
  label = 'Offer';

  static styles = [
    base,
    css`
      :host { display: block; }
      .bar {
        position: relative; display: flex; align-items: center; justify-content: center; gap: 10px; min-height: 56px;
        padding: 10px var(--cm-space-20); background: var(--cm-bg-flash-bar); color: var(--cm-text-on-dark);
        font-size: 18px; text-align: center;
      }
      :host([dismissible]) .bar { padding-inline: 56px; }
      .icon { display: inline-flex; color: var(--cm-text-speciality-on-dark); flex: none; }
      /* !important: page link colours (usually blue) would otherwise win over ::slotted and fail contrast on the dark bar. */
      ::slotted(a) { color: var(--cm-text-speciality-on-dark) !important; font-weight: 500; text-decoration: none; }
      ::slotted(a:hover) { text-decoration: underline; }
      ::slotted(a:focus-visible) { outline: 2px solid var(--cm-text-on-dark); outline-offset: 2px; border-radius: 2px; }
      .close {
        position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: grid; place-items: center;
        width: 32px; height: 32px; padding: 0; color: var(--cm-text-on-dark); background: none; border: 0; border-radius: 50%; cursor: pointer;
      }
      .close:hover { background: var(--cm-nav-active); }
      .close:focus-visible { outline: 2px solid var(--cm-text-on-dark); outline-offset: 0; }
      @media (max-width: 640px) {
        .bar { font-size: 14px; min-height: 44px; justify-content: flex-start; text-align: start; }
      }
    `,
  ];

  #dismiss() {
    const ok = this.dispatchEvent(new CustomEvent('cm-dismiss', { bubbles: true, composed: true, cancelable: true }));
    if (ok) this.hidden = true;
  }

  render() {
    return html`<div class="bar" part="bar" role="region" aria-label=${this.label || 'Offer'}>
      <span class="icon" aria-hidden="true"><slot name="icon">${this.icon ? html`<cm-icon name=${this.icon} size="20"></cm-icon>` : nothing}</slot></span>
      <span class="text"><slot></slot></span>
      ${this.dismissible ? html`<button type="button" class="close" part="close" aria-label="Dismiss offer" @click=${this.#dismiss}><cm-icon name="close" size="18"></cm-icon></button>` : nothing}
    </div>`;
  }
}
define('cm-flash-offer-bar', CmFlashOfferBar);

declare global { interface HTMLElementTagNameMap { 'cm-flash-offer-bar': CmFlashOfferBar } }
