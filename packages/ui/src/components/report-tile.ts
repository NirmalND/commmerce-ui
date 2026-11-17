import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import type { IconName } from '@commmerce/icons';
import './icon.js';

const strings = defineStrings('reportTile', {
  /** Read after the label of a pinned report. */
  pinned: ', pinned',
});
declare module '../localize.js' { interface CmStrings { reportTile: typeof strings } }

/**
 * A square tile that opens one report: a large icon over a short name, e.g. "Hourly sales".
 * A pinned tile shows a pin in its corner. With `href` the tile is a link; without, a button.
 * @element cm-report-tile
 * @slot icon - Your own 40px illustration, used instead of `icon`.
 * @fires click - When a tile without `href` is chosen.
 */
export class CmReportTile extends CmLocalizedElement {
  static properties = {
    label: {},
    icon: {},
    href: {},
    pinned: { type: Boolean, reflect: true },
  };

  /** Report name, two or three words. */
  label = '';
  /** System icon shown above the name. */
  icon: IconName = 'chart';
  /** Opens the report page. */
  href = '';
  /** Shows a pin: the report is pinned to the dashboard. */
  pinned = false;

  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };

  static styles = [
    base,
    css`
      :host { display: block; }
      .tile {
        position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--cm-space-12);
        width: 100%; height: 120px; padding: var(--cm-space-8); font: inherit; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 500; text-align: center;
        color: var(--cm-text-default); text-decoration: none; background: var(--cm-bg-surface); cursor: pointer;
        border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md);
      }
      .tile:hover { border-color: var(--cm-border-strong); }
      .tile:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .icon { display: inline-flex; color: var(--cm-icon-selected); }
      ::slotted([slot='icon']) { width: 40px; height: 40px; }
      .pin { position: absolute; top: var(--cm-space-8); inset-inline-end: var(--cm-space-8); color: var(--cm-icon-selected); }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .tile { height: 104px; gap: var(--cm-space-8); font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); }
        .icon cm-icon::part(svg) { width: 32px; height: 32px; }
        ::slotted([slot='icon']) { width: 32px; height: 32px; }
      }
    `,
  ];

  render() {
    const inner = html`
      <span class="icon" aria-hidden="true"><slot name="icon"><cm-icon name=${this.icon} size="40"></cm-icon></slot></span>
      <span class="label">${this.label}</span>
      ${this.pinned ? html`<span class="pin" part="pin"><cm-icon name="pin" size="16"></cm-icon>
<span class="sr">${this.t('pinned')}</span></span>` : nothing}
    `;
    return this.href
      ? html`<a class="tile" part="tile" href=${this.href}>${inner}</a>`
      : html`<button class="tile" part="tile" type="button">${inner}</button>`;
  }
}
define('cm-report-tile', CmReportTile);

/**
 * A titled group of report tiles, e.g. "Sales". Tiles are 146px wide, 12px apart, and wrap;
 * on phones three fit a row.
 * @element cm-report-tiles
 * @slot - `cm-report-tile` elements.
 */
export class CmReportTiles extends LitElement {
  static properties = {
    heading: {},
    headingLevel: { type: Number, attribute: 'heading-level' },
  };

  /** Group title, e.g. "Sales". */
  heading = '';
  /** Heading level for the title (1–6). */
  headingLevel = 2;

  static styles = [
    base,
    css`
      :host { display: block; padding: var(--cm-space-20); background: var(--cm-bg-surface); border-radius: var(--cm-radius-md); }
      .title { margin: 0 0 var(--cm-space-16); font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(146px, 1fr)); gap: var(--cm-space-12); }
      @media (min-width: 641px) { .grid { grid-template-columns: repeat(auto-fill, 146px); } }
      @media (max-width: 640px) {
        :host { padding: var(--cm-space-8); }
        .title { margin-bottom: var(--cm-space-8); }
        .grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--cm-space-8); }
      }
    `,
  ];

  firstUpdated() {
    // Tiles become list items of the grid.
    for (const t of this.querySelectorAll(':scope > cm-report-tile')) if (!t.hasAttribute('role')) t.setAttribute('role', 'listitem');
  }

  render() {
    const level = Math.min(6, Math.max(1, this.headingLevel || 2));
    return html`
      ${this.heading ? html`<div class="title" part="heading" role="heading" aria-level=${level} id="h">${this.heading}</div>` : nothing}
      <div class="grid" part="grid" role="list" aria-labelledby=${this.heading ? 'h' : nothing}><slot @slotchange=${() => this.firstUpdated()}></slot></div>
    `;
  }
}
define('cm-report-tiles', CmReportTiles);

declare global {
  interface HTMLElementTagNameMap { 'cm-report-tile': CmReportTile; 'cm-report-tiles': CmReportTiles }
}
