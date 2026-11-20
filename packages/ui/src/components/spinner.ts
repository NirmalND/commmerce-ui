import { html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement } from '../localize.js';

/**
 * Shows that something is loading when the wait is short or its length unknown. Announced to screen readers
 * through a status role with a text label.
 *
 * A product can show its own loading graphic instead of the arc by putting it inside (since 1.12). The spinner
 * keeps the status role, the label and the size, and passes `--cm-spinner-duration` (one cycle) and
 * `--cm-spinner-play-state` (`paused` under reduced motion) to the graphic, which animates itself with them.
 * @element cm-spinner
 * @slot - Optional graphic shown instead of the arc, such as an inline SVG. Decorative: give it `aria-hidden="true"`.
 * Drawn 12px tall (`small`) or 20px (`large`) with its own width; colour it with `currentColor`.
 * @cssprop --cm-spinner-duration - One animation cycle for a slotted graphic. Default 0.8s.
 * @cssprop --cm-spinner-play-state - `running`, or `paused` when the person prefers reduced motion.
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
  /** True while a graphic is slotted in place of the arc. */
  private custom = false;

  static styles = [
    base,
    css`
      :host { display: inline-flex; vertical-align: middle; color: var(--cm-border-strong); }
      .spinner { display: inline-flex; align-items: center; --cm-spinner-duration: 0.8s; --cm-spinner-play-state: running; }
      ::slotted(*) { display: block; block-size: 20px; inline-size: auto; }
      :host([size='small']) ::slotted(*) { block-size: 12px; }
      svg { inline-size: 44px; block-size: 44px; animation: spin 0.8s linear infinite; }
      :host([size='small']) svg { inline-size: 20px; block-size: 20px; }
      .track { stroke: var(--cm-border-subtle); }
      .arc { stroke: currentColor; }
      .vh {
        position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; padding: 0; overflow: hidden;
        clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) {
        svg { animation-duration: 2.4s; }
        .spinner { --cm-spinner-play-state: paused; }
      }
    `,
  ];

  private onSlotChange(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedElements().length > 0;
    if (has !== this.custom) { this.custom = has; this.requestUpdate(); }
  }

  render() {
    const sw = this.size === 'small' ? 2.5 : 3;
    return html`<span class="spinner" part="spinner" role="status">
      ${this.custom ? nothing : html`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle class="track" cx="12" cy="12" r="10" fill="none" stroke-width=${sw}></circle>
        <path class="arc" d="M12 2a10 10 0 0 1 10 10" fill="none" stroke-width=${sw} stroke-linecap="round"></path>
      </svg>`}
      <slot @slotchange=${this.onSlotChange}></slot>
      <span class="vh">${this.accessibleLabel || this.t('loading')}</span>
    </span>`;
  }
}
define('cm-spinner', CmSpinner);

declare global { interface HTMLElementTagNameMap { 'cm-spinner': CmSpinner } }
