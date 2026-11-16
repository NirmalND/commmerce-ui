import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';

/**
 * Side card on detail pages that lists facts as label/value pairs (order details, SKU, tags).
 * Put `cm-info-item` elements inside. The Figma file calls this the "Additional Info Card".
 * @element cm-info-panel
 * @slot - `cm-info-item` elements.
 * @fires cm-action - When the header text action (for example REMOVE) is pressed.
 */
export class CmInfoPanel extends LitElement {
  static properties = {
    heading: {},
    action: {},
    actionLabel: { attribute: 'action-label' },
    headingLevel: { type: Number, attribute: 'heading-level' },
    _list: { state: true },
  };

  /** Panel title. */
  heading = '';
  /** Text of the header action, shown uppercase ("Remove", "Edit"). Leave empty for none. */
  action = '';
  /** Accessible name of the header action when the text alone is unclear, e.g. "Remove order details". */
  actionLabel = '';
  /** Heading level for the title. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;
  /** The items area is a list only while it holds just `cm-info-item`s (not, say, a loading skeleton). */
  _list = true;

  static styles = [
    base,
    css`
      :host { display: block; }
      section {
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-card);
        border-radius: var(--cm-radius-md); padding: var(--cm-space-20);
      }
      header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--cm-space-20); margin-bottom: var(--cm-space-20); }
      .title { margin: 0; font-size: 20px; font-weight: 600; }
      .action {
        padding: 2px 4px; margin: -2px -4px; border: 0; background: none; color: var(--cm-text-default); cursor: pointer;
        font: inherit; font-size: 14px; font-weight: 500; letter-spacing: var(--cm-tracking-caps); text-transform: uppercase;
        border-radius: var(--cm-radius-xs);
      }
      .action:hover { text-decoration: underline; }
      .action:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .items { display: grid; grid-template-columns: 1fr 1fr; gap: var(--cm-space-15) var(--cm-space-20); }
    `,
  ];

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    return html`<section part="panel" aria-label=${this.heading || nothing}>
      ${this.heading || this.action
        ? html`<header>
            <div class="title" role="heading" aria-level=${level} part="title">${this.heading}</div>
            ${this.action
              ? html`<button class="action" type="button" part="action" aria-label=${this.actionLabel || nothing}
                  @click=${() => this.dispatchEvent(new CustomEvent('cm-action', { bubbles: true, composed: true }))}>${this.action}</button>`
              : nothing}
          </header>`
        : nothing}
      <div class="items" role=${this._list ? 'list' : nothing}><slot @slotchange=${(e: Event) => {
        this._list = (e.target as HTMLSlotElement).assignedElements().every((el) => el.localName === 'cm-info-item');
      }}></slot></div>
    </section>`;
  }
}
define('cm-info-panel', CmInfoPanel);

/**
 * One fact in an info panel: a label and its value (text, a badge or tags).
 * @element cm-info-item
 * @slot - The value.
 */
export class CmInfoItem extends LitElement {
  static properties = {
    label: {},
    half: { type: Boolean, reflect: true },
  };

  /** What the value is ("Ordered on", "SKU"). */
  label = '';
  /** Takes half the width, so two short facts share a line. */
  half = false;

  static styles = [
    base,
    css`
      :host { display: block; grid-column: 1 / -1; min-width: 0; }
      :host([half]) { grid-column: auto; }
      .label { font-size: 16px; }
      .value {
        display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-10);
        margin-top: 6px; font-size: 16px; font-weight: 500; overflow-wrap: anywhere;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute('role')) this.setAttribute('role', 'listitem');
  }

  render() {
    return html`<div class="label" part="label">${this.label}</div><div class="value" part="value"><slot></slot></div>`;
  }
}
define('cm-info-item', CmInfoItem);

declare global { interface HTMLElementTagNameMap { 'cm-info-panel': CmInfoPanel; 'cm-info-item': CmInfoItem } }
