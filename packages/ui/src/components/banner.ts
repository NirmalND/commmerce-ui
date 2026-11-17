import { LitElement, html, svg, css, nothing } from 'lit';
import { base, define, type Tone } from '../base.js';
import { CmLocalizedElement } from '../localize.js';

/**
 * Full-width message about the page or a task. Critical banners are announced immediately.
 * @element cm-banner
 * @slot - Message body.
 * @slot actions - Buttons or links under the message.
 * @fires cm-dismiss - When the close button is pressed (cancelable; default hides the banner).
 */
export class CmBanner extends CmLocalizedElement {
  static properties = {
    tone: { reflect: true },
    heading: {},
    dismissible: { type: Boolean },
  };

  /** attention = blue, information = orange, success = green, critical = red. */
  tone: Tone = 'attention';
  /** Bold first line. Leave empty for one-line banners. */
  heading = '';
  /** Shows a close button. Use for messages the merchant can act on later. */
  dismissible = false;

  static styles = [
    base,
    css`
      :host { display: block; }
      .banner {
        display: flex; gap: var(--cm-space-12); align-items: flex-start;
        padding: var(--cm-space-12) var(--cm-space-20); border-radius: var(--cm-radius-md);
        background: var(--cm-bg-attention); color: var(--cm-text-default); font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14);
      }
      :host([tone='information']) .banner { background: var(--cm-bg-information); }
      :host([tone='success']) .banner { background: var(--cm-bg-success); }
      :host([tone='critical']) .banner { background: var(--cm-bg-critical); }
      .icon { flex: none; margin-top: 2px; color: var(--cm-text-attention); }
      :host([tone='critical']) .icon { color: var(--cm-icon-critical); }
      :host([tone='information']) .icon, :host([tone='success']) .icon { color: var(--cm-text-default); }
      .body { flex: 1; display: flex; flex-direction: column; gap: 4px; }
      .title { margin: 0; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 600; }

      :host([tone='critical']) .title { color: var(--cm-text-critical); }
      .actions { display: flex; gap: var(--cm-space-8); margin-top: var(--cm-space-8); }
      .actions[hidden] { display: none; }
      .close {
        flex: none; display: inline-flex; padding: 4px; margin: -4px; background: none; border: 0;
        border-radius: var(--cm-radius-sm); color: inherit; cursor: pointer;
      }
      .close:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
    `,
  ];

  /** @internal */
  hasActions = false;

  #onSlot(e: Event) {
    this.hasActions = (e.target as HTMLSlotElement).assignedElements().length > 0;
    this.requestUpdate();
  }

  #dismiss() {
    const ev = new CustomEvent('cm-dismiss', { bubbles: true, composed: true, cancelable: true });
    if (this.dispatchEvent(ev)) this.hidden = true;
  }

  render() {
    const role = this.tone === 'critical' ? 'alert' : 'status';
    const icon = this.tone === 'success'
      ? svg`<path d="m5 10.5 3 3 7-7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
      : svg`<circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10 6v5M10 13.6v.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
    return html`<div class="banner" part="banner" role=${role}>
      <svg class="icon" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">${icon}</svg>
      <div class="body">
        ${this.heading ? html`<p class="title">${this.heading}</p>` : nothing}
        <div><slot></slot></div>
        <div class="actions" ?hidden=${!this.hasActions}><slot name="actions" @slotchange=${this.#onSlot}></slot></div>
      </div>
      ${this.dismissible
        ? html`<button class="close" aria-label=${this.t('dismiss')} @click=${this.#dismiss}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>`
        : nothing}
    </div>`;
  }
}
define('cm-banner', CmBanner);

declare global { interface HTMLElementTagNameMap { 'cm-banner': CmBanner } }
