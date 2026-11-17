import { html, css } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement } from '../localize.js';

/**
 * Shows that something is loading when the wait is short or its length unknown. Announced to screen readers
 * through a status role with a text label.
 * @element cm-spinner
 */
export class CmSpinner extends CmLocalizedElement {
  static properties = {
    size: { reflect: true },
    accessibleLabel: { attribute: 'accessible-label', string: 'loading' },
  };

  /** `small` (20px) for inline use in buttons, rows and fields; `large` (44px) for a section or page. */
  size: 'small' | 'large' = 'large';
  /** What screen readers announce. Name what is loading when it helps: "Loading orders". Default: the built-in string `loading` ("Loading"). */
  accessibleLabel!: string;

  static styles = [
    base,
    css`
      :host { display: inline-flex; vertical-align: middle; color: var(--cm-border-strong); }
      .spinner { display: inline-flex; }
      svg { inline-size: 44px; block-size: 44px; animation: spin 0.8s linear infinite; }
      :host([size='small']) svg { inline-size: 20px; block-size: 20px; }
      .track { stroke: var(--cm-border-subtle); }
      .arc { stroke: currentColor; }
      .vh {
        position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; padding: 0; overflow: hidden;
        clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { svg { animation-duration: 2.4s; } }
    `,
  ];

  render() {
    const sw = this.size === 'small' ? 2.5 : 3;
    return html`<span class="spinner" part="spinner" role="status">
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle class="track" cx="12" cy="12" r="10" fill="none" stroke-width=${sw}></circle>
        <path class="arc" d="M12 2a10 10 0 0 1 10 10" fill="none" stroke-width=${sw} stroke-linecap="round"></path>
      </svg>
      <span class="vh">${this.accessibleLabel || this.t('loading')}</span>
    </span>`;
  }
}
define('cm-spinner', CmSpinner);

declare global { interface HTMLElementTagNameMap { 'cm-spinner': CmSpinner } }
