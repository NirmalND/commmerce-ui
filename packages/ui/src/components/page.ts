import { LitElement, html, css } from 'lit';
import { base, define } from '../base.js';

/**
 * A whole admin page: the page header across the top, then the content on `bg-page` with page padding
 * (`space-20`, or `space-10` when the page is 640px wide or less).
 * `<cm-page><cm-page-header slot="header" heading="Orders"></cm-page-header><cm-layout>…</cm-layout></cm-page>`
 * @element cm-page
 * @slot header - A `cm-page-header`. Runs edge to edge.
 * @slot - The page content, usually a `cm-layout`.
 * @slot footer - A `cm-save-bar` or `cm-action-bar`, after the content.
 */
export class CmPage extends LitElement {
  static properties = {
    fullWidth: { type: Boolean, attribute: 'full-width', reflect: true },
    narrow: { type: Boolean, reflect: true },
  };
  /** Lets the content use every pixel of width (wide tables, reports). By default it stops at 1600px, centred. */
  fullWidth = false;
  /** Content at most 800px wide, centred: for settings and single-column forms. */
  narrow = false;

  static styles = [
    base,
    css`
      :host { display: block; container: cm-page / inline-size; background: var(--cm-bg-page); min-block-size: 100%; }
      .content {
        box-sizing: content-box; max-inline-size: 1600px; margin-inline: auto;
        padding: var(--cm-space-20);
      }
      :host([narrow]) .content { max-inline-size: 800px; }
      :host([full-width]) .content { max-inline-size: none; }
      @container cm-page (max-width: 640px) { .content { padding: var(--cm-space-10); } }
    `,
  ];

  render() {
    return html`<slot name="header"></slot><div class="content" part="content"><slot></slot></div><slot name="footer"></slot>`;
  }
}
define('cm-page', CmPage);

declare global { interface HTMLElementTagNameMap { 'cm-page': CmPage } }
