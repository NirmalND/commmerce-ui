import { LitElement, html, css } from 'lit';
import { base, define } from '../base.js';

/**
 * A whole admin page: the page header across the top, then the content with the page padding (`space-24`, or
 * `space-16` when the page is 640px wide or less; the same side padding as `cm-page-header`, so titles and content
 * line up), centred at a width that suits the page.
 * `<cm-page><cm-page-header slot="header" heading="Orders"></cm-page-header><cm-layout>…</cm-layout></cm-page>`
 *
 * Page anatomy: the header (title, primary action at the end), then a filter or toolbar row, then the content.
 * Pick the width by what the page holds: `form` (640px) for settings and single-column forms, `detail` (1040px) for
 * one record (an order, a customer), the default (1600px) for lists and dashboards, `full` for wide tables and reports.
 * The background is `bg-page`; inside `cm-app-frame panel` it is transparent, so the page sits on the white panel.
 * @element cm-page
 * @slot header - A `cm-page-header`. Runs edge to edge.
 * @slot - The page content, usually a `cm-layout`.
 * @slot footer - A `cm-save-bar` or `cm-action-bar`, after the content.
 */
export class CmPage extends LitElement {
  static properties = {
    width: { reflect: true },
    fullWidth: { type: Boolean, attribute: 'full-width', reflect: true },
    narrow: { type: Boolean, reflect: true },
  };
  /**
   * Largest width of the content, centred: `form` (640px), `detail` (1040px), `wide` (1600px) or `full` (no limit).
   * Empty is `wide`, unless `narrow` or `full-width` is set.
   */
  width: '' | 'form' | 'detail' | 'wide' | 'full' = '';
  /** Same as `width="full"`: the content uses every pixel of width (wide tables, reports). */
  fullWidth = false;
  /** Content at most 800px wide, centred. Kept from 1.0; prefer `width="form"` (640px) or `width="detail"` (1040px). */
  narrow = false;

  static styles = [
    base,
    css`
      :host { display: block; container: cm-page / inline-size; background: var(--cm-bg-page); min-block-size: 100%; }
      .content {
        box-sizing: content-box; max-inline-size: 1600px; margin-inline: auto;
        padding: var(--cm-space-24);
      }
      :host([narrow]) .content { max-inline-size: 800px; }
      :host([full-width]) .content, :host([width='full']) .content { max-inline-size: none; }
      :host([width='form']) .content { max-inline-size: 640px; }
      :host([width='detail']) .content { max-inline-size: 1040px; }
      :host([width='wide']) .content { max-inline-size: 1600px; }
      @container cm-page (max-width: 640px) { .content { padding: var(--cm-space-16); } }
    `,
  ];

  render() {
    return html`<slot name="header"></slot><div class="content" part="content"><slot></slot></div><slot name="footer"></slot>`;
  }
}
define('cm-page', CmPage);

declare global { interface HTMLElementTagNameMap { 'cm-page': CmPage } }
