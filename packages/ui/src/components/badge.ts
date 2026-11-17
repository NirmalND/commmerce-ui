import { LitElement, html, css } from 'lit';
import { base, define, type Tone } from '../base.js';

/**
 * Status pill in sentence case ("Order placed", "5 open"): 12px medium text on a tinted 24px pill (owner standard, 1.6;
 * 20px in 1.5). Write the text in sentence case; since 1.5 it is shown as written (it was upper-cased with wide
 * letter-spacing before).
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
        display: inline-flex; align-items: center; box-sizing: border-box; height: 24px; padding: 0 var(--cm-space-8); white-space: nowrap;
        font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); font-weight: 500; font-variant-numeric: tabular-nums;
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
