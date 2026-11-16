import { LitElement, html, css } from 'lit';
import { base, define } from '../base.js';
import { spaceRules, type SpaceStep } from '../spacing.js';

/**
 * The body of an admin page: sections side by side, for example the main column and side column of a detail page.
 * Sections stack into one column, in source order, when the layout is narrower than 768px (a container query, so
 * it follows the space the layout gets, not the window). Put the main section first.
 * @element cm-layout
 * @slot - `cm-layout-section` elements.
 */
export class CmLayout extends LitElement {
  static properties = { gap: { reflect: true } };
  /** Space between sections, across and down: a spacing step (`0`, `10`, `12`, `15`, `20`, `22`, `30`). Default `20`. */
  gap: SpaceStep = '20';

  static styles = [
    base,
    css`
      :host { display: block; container: cm-layout / inline-size; --_gap: var(--cm-space-20); }
      .layout { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: var(--_gap); align-items: start; }
      @container cm-layout (max-width: 767px) {
        .layout { grid-template-columns: minmax(0, 1fr); }
      }
      /* Section widths live here, not in cm-layout-section: a container name only reaches queries in its own
         shadow tree in current browsers, and rules on ::slotted from this scope win over the section's :host. */
      ::slotted(*) { grid-column: 1 / -1; min-inline-size: 0; }
      @container cm-layout (min-width: 768px) {
        ::slotted([variant='one-half']) { grid-column: span 3; }
        ::slotted([variant='one-third']) { grid-column: span 2; }
        ::slotted([variant='two-thirds']) { grid-column: span 4; }
      }
    `,
    spaceRules('gap', '--_gap'),
  ];

  render() {
    return html`<div class="layout" part="layout"><slot></slot></div>`;
  }
}

/**
 * One column of a `cm-layout`. Its children are stacked `space-20` apart (cards on the page).
 * @element cm-layout-section
 * @slot - The section's content, usually cards.
 */
export class CmLayoutSection extends LitElement {
  static properties = { variant: { reflect: true } };
  /**
   * Width on wide layouts: `full` (default), `one-half`, `one-third` or `two-thirds`. A detail page is a
   * `two-thirds` main section and a `one-third` side section. Every section is full width once the layout stacks.
   */
  variant: 'full' | 'one-half' | 'one-third' | 'two-thirds' = 'full';

  static styles = [
    base,
    css`
      :host { display: flex; flex-direction: column; gap: var(--cm-space-20); min-inline-size: 0; }
    `,
  ];

  render() {
    return html`<slot></slot>`;
  }
}
define('cm-layout', CmLayout);
define('cm-layout-section', CmLayoutSection);

declare global { interface HTMLElementTagNameMap { 'cm-layout': CmLayout; 'cm-layout-section': CmLayoutSection } }
