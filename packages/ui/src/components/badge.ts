import { LitElement, html, css } from 'lit';
import { base, define, type Tone } from '../base.js';

/**
 * Uppercase status pill ("ORDER PLACED", "ACCEPTED").
 * @element cm-badge
 * @slot - Status text.
 */
export class CmBadge extends LitElement {
  static properties = { tone: { reflect: true } };
  /** Colour and meaning. `neutral` for drafts and other states with no status. */
  tone: Tone | 'neutral' = 'neutral';

  static styles = [
    base,
    css`
      :host { display: inline-flex; vertical-align: middle; }
      span {
        display: inline-flex; align-items: center; height: 28px; padding: 0 var(--cm-space-10);
        font-size: 10px; font-weight: 500; letter-spacing: var(--cm-tracking-caps); text-transform: uppercase;
        border-radius: var(--cm-radius-full); background: var(--cm-bg-tag); color: var(--cm-text-default);
      }
      /* Tinted tones are laid over the surface colour, so the text keeps AA contrast on any page background. */
      :host([tone='information']) span { background: linear-gradient(var(--cm-bg-information-soft), var(--cm-bg-information-soft)), var(--cm-bg-surface); color: var(--cm-text-information); }
      :host([tone='success']) span { background: linear-gradient(var(--cm-bg-success-soft), var(--cm-bg-success-soft)), var(--cm-bg-surface); color: var(--cm-text-success); }
      :host([tone='critical']) span { background: linear-gradient(var(--cm-bg-critical), var(--cm-bg-critical)), var(--cm-bg-surface); color: var(--cm-text-critical); }
      :host([tone='attention']) span { background: linear-gradient(var(--cm-bg-attention), var(--cm-bg-attention)), var(--cm-bg-surface); color: var(--cm-text-attention); }
    `,
  ];

  render() {
    return html`<span part="badge"><slot></slot></span>`;
  }
}
define('cm-badge', CmBadge);

declare global { interface HTMLElementTagNameMap { 'cm-badge': CmBadge } }
