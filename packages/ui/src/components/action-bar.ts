import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import './icon.js';

/**
 * Bar at the bottom of a long form or record page that repeats what the page is about and its
 * main actions, so they stay in reach. The Figma file calls this the "Bottom Tab".
 * With `tone="critical"` it explains a blocking error and offers the action that fixes it.
 * @element cm-action-bar
 * @slot - Extra content under the heading, such as an amount.
 * @slot adornment - Badge next to the eyebrow (for example the order status).
 * @slot actions - Buttons, secondary first and the primary action last (large size).
 */
export class CmActionBar extends LitElement {
  static properties = {
    eyebrow: {},
    heading: {},
    tone: { reflect: true },
    sticky: { type: Boolean, reflect: true },
    label: {},
  };

  /** Small line above the heading: the page or record ID ("Add product", "#ODYOD0744"). */
  eyebrow = '';
  /** The record name, or the error message when `tone="critical"`. */
  heading = '';
  /** `default` white bar; `critical` pink bar with a red top edge and warning icon, announced as an alert. */
  tone: 'default' | 'critical' = 'default';
  /** Sticks the bar to the bottom of the scrolling area. */
  sticky = false;
  /** Accessible name of the bar's region. Defaults to the heading. */
  label = '';

  static styles = [
    base,
    css`
      :host { display: block; }
      :host([sticky]) { position: sticky; bottom: 0; z-index: 10; }
      .bar {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--cm-space-20);
        min-height: 80px; padding: var(--cm-space-15) var(--cm-space-20) var(--cm-space-15) var(--cm-space-20);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-card); border-radius: var(--cm-radius-md);
      }
      :host([sticky]) .bar { box-shadow: var(--cm-shadow-100); }
      :host([tone='critical']) .bar {
        background: var(--cm-bg-error-bar); border-color: transparent; border-top-color: var(--cm-border-critical); border-radius: 0;
      }
      .lead { flex: 1 1 280px; display: flex; align-items: center; gap: var(--cm-space-10); min-width: 0; }
      .text { min-width: 0; display: flex; flex-direction: column; gap: var(--cm-space-10); }
      .eyebrow { display: flex; align-items: center; gap: var(--cm-space-10); font-size: 14px; font-weight: 500; }
      .eyebrow[hidden] { display: none; }
      .heading { margin: 0; font-size: 20px; font-weight: 600; line-height: 1.3; overflow-wrap: anywhere; }
      :host([tone='critical']) .heading { font-weight: 400; }
      .icon {
        flex: none; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
        border-radius: var(--cm-radius-full); background: var(--cm-bg-surface); color: var(--cm-icon-critical);
      }
      .actions { flex: none; display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--cm-space-20); margin-left: auto; }
      @media (max-width: 640px) {
        .bar { min-height: 68px; padding: var(--cm-space-10); gap: var(--cm-space-10); }
        .heading { font-size: 14px; }
        .eyebrow { font-size: 12px; }
        .text { gap: var(--cm-space-10); }
        .icon { width: 30px; height: 30px; }
        .actions { gap: var(--cm-space-10); }
      }
    `,
  ];

  render() {
    const critical = this.tone === 'critical';
    return html`<div class="bar" part="bar" role="region" aria-label=${this.label || this.heading || this.eyebrow || 'Actions'}>
      <div class="lead">
        ${critical ? html`<span class="icon" aria-hidden="true"><cm-icon name="alert" size="20"></cm-icon></span>` : nothing}
        <div class="text">
          <div class="eyebrow" ?hidden=${!this.eyebrow}>${this.eyebrow}<slot name="adornment"></slot></div>
          ${this.heading ? html`<p class="heading" part="heading" role=${critical ? 'alert' : nothing}>${this.heading}</p>` : nothing}
          <slot></slot>
        </div>
      </div>
      <div class="actions"><slot name="actions"></slot></div>
    </div>`;
  }
}
define('cm-action-bar', CmActionBar);

declare global { interface HTMLElementTagNameMap { 'cm-action-bar': CmActionBar } }
