import { LitElement, html, css } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { base, define } from '../base.js';
import { spaceRules, type SpaceStep } from '../spacing.js';

/**
 * Equal-width columns, for tiles, cards and short fields side by side. Collapses to one column when the grid
 * itself is 640px wide or less (a container query), so it also works inside a narrow side column.
 * @element cm-grid
 * @slot - The grid items, in reading order.
 */
export class CmGrid extends LitElement {
  static properties = {
    columns: { type: Number, reflect: true },
    minColumnWidth: { attribute: 'min-column-width', reflect: true },
    gap: { reflect: true },
  };

  /** Number of columns. Default 2. Ignored when `min-column-width` is set. */
  columns = 2;
  /**
   * Fit as many columns as there is room for, each at least this wide (a CSS length such as `240px` or `15rem`).
   * Never wider than the grid, so it reaches one column on its own on narrow screens.
   */
  minColumnWidth?: string;
  /** Space between items: a spacing step on the 4px grid (`0`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`; the pre-1.5 steps `10`, `15`, `22` and `30` still work and draw as 8, 16, 24 and 32). Default `20`. */
  gap: SpaceStep = '20';

  static styles = [
    base,
    css`
      :host { display: block; container: cm-grid / inline-size; --_gap: var(--cm-space-20); }
      .grid { display: grid; gap: var(--_gap); align-items: start; }
      @container cm-grid (max-width: 640px) {
        .grid.fixed { grid-template-columns: minmax(0, 1fr) !important; }
      }
    `,
    spaceRules('gap', '--_gap'),
  ];

  render() {
    const n = Math.max(1, Math.floor(Number(this.columns) || 1));
    const fit = this.minColumnWidth?.trim();
    const cols = fit ? `repeat(auto-fit, minmax(min(100%, ${fit}), 1fr))` : `repeat(${n}, minmax(0, 1fr))`;
    return html`<div class="grid ${fit ? 'fit' : 'fixed'}" part="grid" style=${styleMap({ gridTemplateColumns: cols })}><slot></slot></div>`;
  }
}
define('cm-grid', CmGrid);

declare global { interface HTMLElementTagNameMap { 'cm-grid': CmGrid } }
