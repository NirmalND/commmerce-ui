import { html, css, nothing } from 'lit';
import { define } from '../base.js';
import { CmOverlay } from '../overlay.js';
import { type MenuItem, readMenuItems, watchMenuItems } from './menu-item.js';
import './icon.js';

/**
 * A sheet that rises from the bottom of a phone screen with a few actions ("Mark as paid", "Generate invoice")
 * or shortcuts ("Orders", "Add orders"). White with 12px top corners, a round black close button on its top
 * edge, and rows split by thin lines. Rows without icons are centred; rows with icons line up left and end in a
 * chevron. Use `cm-menu-item` children (or `items`); anything else in the sheet is shown as it is.
 *
 * A native modal `<dialog>`: the page behind is inert, Esc and the backdrop ask to close through `cm-close`,
 * scrolling is locked, and focus returns to the opener.
 * @element cm-bottom-sheet
 * @slot - `cm-menu-item`s, or your own content.
 * @fires cm-select - When a row is chosen. `detail: { value, item }`. Cancelable: `preventDefault()` keeps the sheet open (and stops a link).
 * @fires cm-open - After the sheet opens.
 * @fires cm-close - Before it closes from Esc, the backdrop or the close button. `detail: { reason }`. Cancelable.
 * @fires cm-closed - After it has closed.
 */
export class CmBottomSheet extends CmOverlay {
  static properties = {
    ...CmOverlay.properties,
    items: { type: Array },
    _slotted: { state: true },
  };

  /** Hidden title that names the sheet for screen readers, e.g. "Order actions". Set it (or `label`). */
  heading = '';
  /** Rows as data, used instead of `cm-menu-item` children when set. */
  items: MenuItem[] = [];
  _slotted: MenuItem[] = [];
  #observer?: MutationObserver;

  static styles = [
    ...CmOverlay.overlayStyles,
    css`
      dialog {
        position: fixed; inset: auto 0 0 0; margin: 0 auto; width: min(600px, 100vw); padding-top: var(--cm-space-24);
      }
      .panel {
        position: relative; overflow: visible; max-height: calc(100dvh - 80px); padding: var(--cm-space-20) var(--cm-space-16) max(var(--cm-space-16), env(safe-area-inset-bottom));
        border-radius: var(--cm-radius-lg) var(--cm-radius-lg) 0 0; box-shadow: var(--cm-shadow-lg);
      }
      .x {
        position: absolute; top: -18px; left: 50%; transform: translateX(-50%); /* centred: the same in both directions */ width: 36px; height: 36px; border-radius: 50%;
        background: var(--cm-bg-panel-header); color: var(--cm-text-on-dark);
      }
      .x:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .content { overflow: auto; min-height: 0; }
      ul { list-style: none; margin: 0; padding: 0; }
      li + li { border-top: var(--cm-border-1) solid var(--cm-border-subtle); }
      .row {
        display: flex; align-items: center; justify-content: center; gap: var(--cm-space-8); width: 100%; min-height: 44px; padding: 8px 4px;
        font: inherit; font-size: 14px; color: var(--cm-text-default); text-decoration: none; background: none; border: 0; cursor: pointer;
      }
      .icons .row { justify-content: flex-start; }
      .row .label { overflow-wrap: anywhere; }
      .icons .row .label { flex: 1; text-align: start; }
      .row.critical { color: var(--cm-text-critical); }
      .row[aria-disabled='true'] { color: var(--cm-text-secondary); cursor: default; }
      .row:hover:not([aria-disabled='true']):not(.critical) { background: var(--cm-bg-hover); }
      .row.critical:hover { text-decoration: underline; } /* text-critical on bg-hover is under 4.5:1 in dark */
      .row:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; border-radius: var(--cm-radius-sm); }
      .lead { color: var(--cm-icon-default); }
      @media (prefers-reduced-motion: no-preference) {
        dialog[open] .panel { animation: cm-sheet-in var(--cm-duration-base) var(--cm-easing-standard); }
      }
      @keyframes cm-sheet-in { from { transform: translateY(24px); opacity: 0; } to { transform: none; opacity: 1; } }
      .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    `,
  ];

  /** The rows in use. */
  get sheetItems(): MenuItem[] { return this.items.length ? this.items : this._slotted; }

  connectedCallback() {
    super.connectedCallback();
    this._slotted = readMenuItems(this);
    this.#observer = watchMenuItems(this, () => { this._slotted = readMenuItems(this); });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  #choose(e: Event, it: MenuItem) {
    if (it.disabled) { e.preventDefault(); return; }
    const ok = this.dispatchEvent(new CustomEvent('cm-select', {
      detail: { value: it.value ?? it.label, item: it }, bubbles: true, composed: true, cancelable: true,
    }));
    if (!ok) { e.preventDefault(); return; }
    this.requestClose('action');
  }

  #row(it: MenuItem) {
    const cls = `row${it.critical ? ' critical' : ''}`;
    const inner = html`${it.icon ? html`<cm-icon class="lead" name=${it.icon} size="16"></cm-icon>
` : nothing}<span class="label">${it.label}</span>${it.icon ? html`<cm-icon name="chevron-right" size="16"></cm-icon>` : nothing}`;
    return it.href && !it.disabled
      ? html`<a class=${cls} part="row" href=${it.href} @click=${(e: Event) => this.#choose(e, it)}>${inner}</a>`
      : html`<button type="button" class=${cls} part="row" aria-disabled=${it.disabled ? 'true' : nothing}
          @click=${(e: Event) => this.#choose(e, it)}>${inner}</button>`;
  }

  render() {
    const items = this.sheetItems.filter((it) => !it.divider);
    const icons = items.some((it) => it.icon);
    return this.renderDialog(html`<div class="panel" part="panel" tabindex="-1">
      <button type="button" class="x" part="close" aria-label=${this.closeLabel || this.t('close')} @click=${() => this.requestClose('close-button')}>
        <cm-icon name="close" size="16"></cm-icon></button>
      ${this.heading ? html`<h2 class="vh" id="${this.uid}-h">${this.heading}</h2>` : nothing}
      <div class="content">
        ${items.length ? html`<ul class=${icons ? 'icons' : ''} part="list">${items.map((it) => html`<li>${this.#row(it)}</li>`)}</ul>` : nothing}
        <slot ?hidden=${this._slotted.length > 0}></slot>
      </div>
    </div>`);
  }
}
define('cm-bottom-sheet', CmBottomSheet);

declare global { interface HTMLElementTagNameMap { 'cm-bottom-sheet': CmBottomSheet } }
