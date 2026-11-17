import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';

/**
 * White section card with optional title, description and header actions.
 *
 * On narrow cards the header wraps instead of squeezing the heading: the title adornment moves under the heading
 * when both don't fit on one line, and the actions move under the title when the title would be narrower than
 * about 12 characters. Wide cards keep everything on one row.
 * @element cm-card
 * @slot - Body.
 * @slot actions - Header actions (buttons, links), at the end of the header. Since 1.3 they also show on a card with no
 * `heading` or `description`, in a row of their own at the top of the card.
 * @slot title-adornment - Badge or icon next to the title.
 */
export class CmCard extends LitElement {
  static properties = {
    heading: {},
    description: {},
    flush: { type: Boolean, reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level' },
  };

  /** Card title, rendered as a heading at `heading-level`. */
  heading = '';
  /** One sentence under the title, 13px in text-tertiary. */
  description = '';
  /** Removes body padding, for lists and tables that run edge to edge. */
  flush = false;
  /** Heading level for the title, so pages keep a correct outline. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;

  #adorned = false;
  #bareActions = false;

  static styles = [
    base,
    css`
      :host { display: block; }
      /* Flat: a 1px border-subtle and no shadow (shadows are for overlays). 16px 20px around the header, 20px around the body. */
      section {
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle);
        border-radius: var(--cm-radius-md); padding: var(--cm-space-16) var(--cm-space-20) var(--cm-space-20);
        font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14);
      }
      :host([flush]) section { padding: 0; }
      /* Wraps only on narrow cards. .main grows from a 0 basis (wide cards look exactly as before: its content stays
         at the start), and its minimum width comes from .strut: the heading on one line, capped at 12 characters. So
         the actions move under the title only when the heading would get less than that. */
      header {
        display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between;
        gap: var(--cm-space-8) var(--cm-space-16); margin-bottom: var(--cm-space-12);
      }
      /* Flush: the header keeps its padding and the body (a list, a table) starts right under it. */
      :host([flush]) header { padding: var(--cm-space-16) var(--cm-space-20) 0; margin-bottom: var(--cm-space-8); }
      .main { flex: 1 1 0%; max-inline-size: 100%; align-self: center; }
      .strut {
        display: block; block-size: 0; overflow: hidden; visibility: hidden; white-space: nowrap;
        max-inline-size: 12ch; font-size: var(--cm-type-heading-sm-size); font-weight: 600;
      }
      .title {
        margin: 0; font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600;
        display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-8);
      }
      /* Flex-wrap moves the badges under the heading before the heading itself would wrap. */
      .adornment { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-8); }
      .adornment[hidden] { display: none; }
      .desc { margin: var(--cm-space-4) 0 0; font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); color: var(--cm-text-tertiary); }
      .actions { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); align-items: center; }
      /* Actions on a card without a heading or description: a row of their own, at the end. */
      .bare { display: flex; justify-content: flex-end; margin-bottom: var(--cm-space-12); }
      .bare[hidden] { display: none; }
      :host([flush]) .bare { padding: var(--cm-space-16) var(--cm-space-20) 0; margin-bottom: var(--cm-space-8); }
    `,
  ];

  #onAdornment(e: Event) {
    const adorned = (e.target as HTMLSlotElement).assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim());
    if (adorned !== this.#adorned) { this.#adorned = adorned; this.requestUpdate(); }
  }

  #onBareActions(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim());
    if (has !== this.#bareActions) { this.#bareActions = has; this.requestUpdate(); }
  }

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    const title = this.heading
      ? html`<div role="heading" aria-level=${level} class="title" part="title"><span class="text">${this.heading}</span><span class="adornment" ?hidden=${!this.#adorned}><slot name="title-adornment" @slotchange=${this.#onAdornment}></slot></span></div>`
      : nothing;
    return html`<section part="card" aria-label=${this.heading || nothing}>
      ${this.heading || this.description
        ? html`<header><div class="main">${this.heading ? html`<span class="strut" aria-hidden="true">${this.heading}</span>` : nothing}${title}${this.description ? html`<p class="desc">${this.description}</p>` : nothing}</div>
            <div class="actions"><slot name="actions"></slot></div></header>`
        : html`<div class="bare" ?hidden=${!this.#bareActions}><div class="actions"><slot name="actions" @slotchange=${this.#onBareActions}></slot></div></div>`}
      <slot></slot>
    </section>`;
  }
}
define('cm-card', CmCard);

declare global { interface HTMLElementTagNameMap { 'cm-card': CmCard } }
