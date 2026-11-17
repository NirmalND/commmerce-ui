import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';

const strings = defineStrings('progressBar', {
  /** Read while the progress is indeterminate (no `value`). */
  inProgress: 'In progress',
});
declare module '../localize.js' { interface CmStrings { progressBar: typeof strings } }

/**
 * Shows how far a longer task has got (an import, an upload, a bulk update), or that it is running when the
 * amount is unknown. A WAI-ARIA progressbar.
 * @element cm-progress-bar
 */
export class CmProgressBar extends CmLocalizedElement {
  static properties = {
    value: { type: Number },
    label: {},
    labelHidden: { type: Boolean, attribute: 'label-hidden' },
    showValue: { type: Boolean, attribute: 'show-value' },
    size: { reflect: true },
  };

  /** Percent done, 0–100. Leave unset (or `null`) for an indeterminate bar when the amount is unknown. */
  value: number | null = null;
  /** What is in progress, shown above the bar and used as its accessible name. Required. */
  label = '';
  /** Keeps the label for screen readers only, when the surrounding text already says what is running. */
  labelHidden = false;
  /** Shows the percentage next to the label. Determinate bars only. */
  showValue = false;
  /** `small` (4px) inside rows and cards; `medium` (8px) for a page-level task. */
  size: 'small' | 'medium' = 'medium';

  #id = nextId('cm-progress');

  static styles = [
    base,
    css`
      :host { display: block; }
      .head { display: flex; justify-content: space-between; gap: var(--cm-space-8); margin-block-end: var(--cm-space-8); font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); }
      .value { color: var(--cm-text-tertiary); font-variant-numeric: tabular-nums; }
      .vh {
        position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; padding: 0; overflow: hidden;
        clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; border: 0;
      }
      .track { position: relative; block-size: 8px; border-radius: var(--cm-radius-full); background: var(--cm-bg-inset); overflow: hidden; box-shadow: inset 0 0 0 1px var(--cm-border-subtle); }
      :host([size='small']) .track { block-size: 4px; }
      .fill { position: absolute; inset-block: 0; inset-inline-start: 0; border-radius: inherit; background: var(--cm-action-primary); transition: inline-size var(--cm-duration-base) var(--cm-easing-standard); }

      .indeterminate .fill { inline-size: 35%; animation: slide 1.4s ease-in-out infinite; }
      @keyframes slide { from { inset-inline-start: -35%; } to { inset-inline-start: 100%; } }
      @media (prefers-reduced-motion: reduce) {
        .fill { transition: none; }
        .indeterminate .fill { animation-duration: 4s; }
      }
    `,
  ];

  /** The value clamped to 0–100, or `null` when indeterminate. */
  get clampedValue(): number | null {
    const v = this.value;
    if (v === null || v === undefined || Number.isNaN(Number(v))) return null;
    return Math.min(100, Math.max(0, Number(v)));
  }

  render() {
    const v = this.clampedValue;
    const labelId = `${this.#id}-label`;
    return html`
      <div class="head ${this.labelHidden ? 'vh' : ''}">
        <span id=${labelId} part="label">${this.label}</span>
        ${this.showValue && v !== null ? html`<span class="value" aria-hidden="true">${this.formatNumber(Math.round(v) / 100, { style: 'percent' })}</span>` : nothing}
      </div>
      <div class="track ${v === null ? 'indeterminate' : ''}" part="track" role="progressbar"
        aria-labelledby=${labelId} aria-valuemin="0" aria-valuemax="100"
        aria-valuenow=${v === null ? nothing : Math.round(v)}
        aria-valuetext=${v === null ? this.t('inProgress') : this.formatNumber(Math.round(v) / 100, { style: 'percent' })}>
        <div class="fill" part="fill" style=${v === null ? '' : `inline-size:${v}%`}></div>
      </div>`;
  }
}
define('cm-progress-bar', CmProgressBar);

declare global { interface HTMLElementTagNameMap { 'cm-progress-bar': CmProgressBar } }
