import { LitElement, html, css } from 'lit';
import { base, define, nextId } from '../base.js';
import './icon.js';

/**
 * A row that shows or hides extra detail. Used in side panels and cards.
 * @element cm-accordion
 * @slot - The detail shown when open.
 * @fires cm-toggle - After it opens or closes; `detail.open` is the new state.
 */
export class CmAccordion extends LitElement {
  static properties = {
    heading: {},
    open: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level' },
  };

  /** The always-visible row text. */
  heading = '';
  /** Shows the detail. */
  open = false;
  /** Blocks opening and closing. */
  disabled = false;
  /** Heading level wrapping the toggle button, so the page outline stays correct. Default 3. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 3;

  #id = nextId('cm-accordion');

  static styles = [
    base,
    css`
      :host { display: block; }
      .wrap { border: var(--cm-border-1) solid var(--cm-border-default); border-radius: var(--cm-radius-md); background: var(--cm-bg-surface); }
      .h { margin: 0; font: inherit; }
      button {
        display: flex; align-items: center; justify-content: space-between; gap: var(--cm-space-15); width: 100%;
        min-height: 60px; padding-block: var(--cm-space-12); padding-inline: var(--cm-space-20) var(--cm-space-15);
        border: 0; border-radius: inherit; background: none; color: var(--cm-text-default);
        font: inherit; font-size: 16px; text-align: start; cursor: pointer;
      }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      button:disabled { color: var(--cm-text-secondary); cursor: not-allowed; }
      .chev {
        flex: none; display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px;
        border-radius: var(--cm-radius-full); background: var(--cm-bg-page); color: var(--cm-icon-selected);
        transition: transform .2s ease;
      }
      :host([open]) .chev { transform: rotate(180deg); }
      @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
      .body { padding: var(--cm-space-15) var(--cm-space-20); border-top: var(--cm-border-1) solid var(--cm-border-default); font-size: 14px; }
      .body[hidden] { display: none; }
      @media (max-width: 640px) { button { min-height: 50px; font-size: 14px; } .chev { width: 28px; height: 28px; } }
    `,
  ];

  /** Opens or closes it, as if the row was pressed. */
  toggle() {
    if (this.disabled) return;
    this.open = !this.open;
    this.dispatchEvent(new CustomEvent('cm-toggle', { bubbles: true, composed: true, detail: { open: this.open } }));
  }

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 3));
    return html`<div class="wrap" part="accordion">
      <div class="h" role="heading" aria-level=${level}>
        <button type="button" part="toggle" id="${this.#id}-btn" aria-expanded=${this.open ? 'true' : 'false'} aria-controls="${this.#id}-body"
          ?disabled=${this.disabled} @click=${this.toggle}>
          <span>${this.heading}</span>
          <span class="chev" aria-hidden="true"><cm-icon name="chevron-down" size="16"></cm-icon></span>
        </button>
      </div>
      <div class="body" part="body" id="${this.#id}-body" role="region" aria-labelledby="${this.#id}-btn" ?hidden=${!this.open}><slot></slot></div>
    </div>`;
  }
}
define('cm-accordion', CmAccordion);

declare global { interface HTMLElementTagNameMap { 'cm-accordion': CmAccordion } }
