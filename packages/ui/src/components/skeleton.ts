import { LitElement, html, css } from 'lit';
import { base, define } from '../base.js';

const THUMB = { small: 34, medium: 40, large: 50, xlarge: 186 } as const;

/**
 * A grey placeholder shape shown where content is loading: lines of text, a product thumbnail or a block.
 * Skeletons are hidden from assistive technology; mark the region that is loading with `aria-busy="true"`
 * (or use `cm-skeleton-display`, which announces "Loading").
 * @element cm-skeleton
 */
export class CmSkeleton extends LitElement {
  static properties = {
    variant: { reflect: true },
    lines: { type: Number },
    size: { reflect: true },
  };

  /** `text` (one or more lines), `thumbnail` (a square image placeholder) or `block` (fills the width; set a height). */
  variant: 'text' | 'thumbnail' | 'block' = 'text';
  /** Number of text lines. The last of several lines is shorter, like a real paragraph. */
  lines = 1;
  /** Thumbnail size from Figma: `small` 34px, `medium` 40px, `large` 50px, `xlarge` 186px. */
  size: keyof typeof THUMB = 'large';

  static styles = [
    base,
    css`
      :host { display: block; --cm-skeleton-height: 120px; }
      :host([variant='thumbnail']) { display: inline-block; vertical-align: middle; }
      .bone {
        display: block; border-radius: var(--cm-radius-md); background: var(--cm-bg-input-filled);
        animation: pulse 1.6s ease-in-out infinite;
      }
      .line { height: 12px; margin: 6px 0; border-radius: var(--cm-radius-sm); }
      .line.short { width: 60%; }
      .block { height: var(--cm-skeleton-height); }
      @keyframes pulse { 50% { background: var(--cm-thumb-bg); } }
      @media (prefers-reduced-motion: reduce) {
        .bone { animation: none; background: var(--cm-thumb-bg); }
      }
      @media (forced-colors: active) { .bone { border: 1px solid CanvasText; } }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
  }

  render() {
    if (this.variant === 'thumbnail') {
      const px = THUMB[this.size] ?? THUMB.large;
      return html`<span class="bone" part="bone" style="width:${px}px;height:${px}px"></span>`;
    }
    if (this.variant === 'block') return html`<span class="bone block" part="bone"></span>`;
    const n = Math.max(1, Math.floor(this.lines || 1));
    return html`${Array.from({ length: n }, (_, i) =>
      html`<span class="bone line ${n > 1 && i === n - 1 ? 'short' : ''}" part="bone"></span>`)}`;
  }
}
define('cm-skeleton', CmSkeleton);

declare global { interface HTMLElementTagNameMap { 'cm-skeleton': CmSkeleton } }
