import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';

/**
 * Side card on detail pages that lists facts as label/value pairs (order details, SKU, tags).
 * Put `cm-info-item` elements inside. The Figma file calls this the "Additional Info Card".
 * Labels are 13/18 in text-tertiary, values 14/20 medium (owner standard).
 *
 * On record pages (since 1.7) use `variant="compact"` (the padding of a compact `cm-card`: 16px, 12px under the title)
 * and `layout="rows"`: each fact on one row, the label on the start side and the value beside it, the way a CRM's
 * Details card reads. Rows fit the 320px aside of a record layout.
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
    variant: { reflect: true },
    layout: { reflect: true },
    _list: { state: true },
  };

  /** Panel title. */
  heading = '';
  /** Text of the header action, in sentence case ("Remove", "Edit"). Leave empty for none. */
  action = '';
  /** Accessible name of the header action when the text alone is unclear, e.g. "Remove order details". */
  actionLabel = '';
  /** Heading level for the title. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;
  /** `default` (20px padding, as before 1.7) or `compact` (16px padding and 12px under the title, like a compact `cm-card`). Since 1.7. */
  variant: 'default' | 'compact' = 'default';
  /**
   * `stacked` (default: each label over its value; `half` items share a line) or `rows` (each label beside its value,
   * two fifths of the width for the label; `half` is ignored). Since 1.7.
   */
  layout: 'stacked' | 'rows' = 'stacked';
  /** The items area is a list only while it holds just `cm-info-item`s (not, say, a loading skeleton). */
  _list = true;

  static styles = [
    base,
    css`
      :host { display: block; }
      section {
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle);
        border-radius: var(--cm-radius-md); padding: var(--cm-space-20);
      }
      header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--cm-space-16); margin-bottom: var(--cm-space-16); }
      .title { margin: 0; font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600; }
      .action {
        padding: 2px 4px; margin: -2px -4px; border: 0; background: none; color: var(--cm-text-default); cursor: pointer;
        font: inherit; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 500; text-decoration: underline; text-underline-offset: 3px;
        border-radius: var(--cm-radius-xs);
      }
      .action:hover { text-decoration-thickness: 2px; }
      .action:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .items { display: grid; grid-template-columns: 1fr 1fr; gap: var(--cm-space-12) var(--cm-space-20); }
      :host([variant='compact']) section { padding: var(--cm-space-16); }
      :host([variant='compact']) header { margin-bottom: var(--cm-space-12); }
      /* Rows (1.7): the item's label and value become two columns of its own grid. */
      :host([layout='rows']) .items { grid-template-columns: minmax(0, 1fr); }
      :host([layout='rows']) ::slotted(cm-info-item) {
        display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); align-items: baseline;
        column-gap: var(--cm-space-12); grid-column: 1 / -1; --_cm-info-value-gap: 0px;
      }
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
 * One fact in an info panel: a label (13px) and its value (14px): text, a link, a badge or tags.
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
      .label { font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); color: var(--cm-text-tertiary); }
      .value {
        display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-8);
        margin-top: var(--_cm-info-value-gap, var(--cm-space-4)); font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 500; overflow-wrap: anywhere;

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
