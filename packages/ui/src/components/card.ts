import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';

/**
 * White section card with optional title, description and header actions.
 * @element cm-card
 * @slot - Body.
 * @slot actions - Header actions (buttons, links), right-aligned.
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
  /** One sentence under the title in text-tertiary. */
  description = '';
  /** Removes body padding, for lists and tables that run edge to edge. */
  flush = false;
  /** Heading level for the title, so pages keep a correct outline. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;

  static styles = [
    base,
    css`
      :host { display: block; }
      section {
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-card);
        border-radius: var(--cm-radius-md); padding: var(--cm-space-20);
      }
      :host([flush]) section { padding: 0; }
      header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--cm-space-20); margin-bottom: var(--cm-space-20); }
      :host([flush]) header { padding: var(--cm-space-20) var(--cm-space-20) 0; }
      .title { margin: 0; font-size: var(--cm-type-heading-sm-size); font-weight: 600; display: flex; align-items: center; gap: var(--cm-space-10); }
      .desc { margin: 6px 0 0; font-size: 16px; color: var(--cm-text-tertiary); }
      .actions { display: flex; gap: var(--cm-space-20); align-items: center; }
    `,
  ];

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    const title = this.heading
      ? html`<div role="heading" aria-level=${level} class="title" part="title">${this.heading}<slot name="title-adornment"></slot></div>`
      : nothing;
    return html`<section part="card" aria-label=${this.heading || nothing}>
      ${this.heading || this.description
        ? html`<header><div>${title}${this.description ? html`<p class="desc">${this.description}</p>` : nothing}</div>
            <div class="actions"><slot name="actions"></slot></div></header>`
        : nothing}
      <slot></slot>
    </section>`;
  }
}
define('cm-card', CmCard);

declare global { interface HTMLElementTagNameMap { 'cm-card': CmCard } }
