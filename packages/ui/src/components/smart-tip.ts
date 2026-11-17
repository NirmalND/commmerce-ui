import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';
import './button.js';

const tipStrings = defineStrings('smartTip', {
  /** Read after the tip when `target="_blank"`. */
  newTab: '(opens in a new tab)',
});
const strings = defineStrings('smartTips', {
  /** Title above the tips, and the tour banner's button. */
  heading: 'Smart tips',
  tourAction: 'Start',
});
declare module '../localize.js' { interface CmStrings { smartTip: typeof tipStrings; smartTips: typeof strings } }

/**
 * A short, linked tip that points merchants to a guide or setting ("Importing and exporting products").
 * The whole card is one link. Group tips in `cm-smart-tips`.
 * @element cm-smart-tip
 * @slot - One or two lines that say what the merchant gets from the guide.
 */
export class CmSmartTip extends CmLocalizedElement {
  static properties = {
    heading: {},
    href: {},
    target: {},
  };

  /** Tip title, at most two short lines. */
  heading = '';
  /** Where the tip leads. */
  href = '';
  /** Link target. `_blank` adds `rel="noopener noreferrer"` and tells screen readers it opens a new tab. */
  target = '';

  static styles = [
    base,
    css`
      :host { display: block; }
      a {
        display: flex; align-items: flex-start; gap: var(--cm-space-8); padding: var(--cm-space-16);
        min-height: 88px; background: var(--cm-bg-surface); color: var(--cm-text-default); text-decoration: none;
        border: var(--cm-border-1) solid var(--cm-border-subtle); border-radius: var(--cm-radius-md);
      }
      a:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
      .title { font-size: var(--cm-font-size-14); font-weight: 600; line-height: var(--cm-line-height-14); }
      .desc { font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); color: var(--cm-text-tertiary); }
      .go {
        flex: none; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px;
        margin-top: -4px; border-radius: var(--cm-radius-full); background: var(--cm-bg-icon); color: var(--cm-icon-selected);
      }
      a:hover .go, a:focus-visible .go { background: var(--cm-action-primary); color: var(--cm-action-primary-text); }
      a:hover .title { text-decoration: underline; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute('role') && this.parentElement?.localName === 'cm-smart-tips') this.setAttribute('role', 'listitem');
  }

  render() {
    const blank = this.target === '_blank';
    return html`<a part="tip" href=${this.href || nothing} target=${this.target || nothing} rel=${blank ? 'noopener noreferrer' : nothing}>
      <span class="text">
        <span class="title" part="heading">${this.heading}</span>
        <span class="desc" part="description"><slot></slot></span>
        ${blank ? html`<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">${this.t('newTab')}</span>` : nothing}
      </span>
      <span class="go" aria-hidden="true"><cm-icon name="arrow-up-right" size="16"></cm-icon></span>
    </a>`;
  }
}
define('cm-smart-tip', CmSmartTip);

/**
 * The "Smart tips" card on the home page: an optional dark tour banner on top, then a list of `cm-smart-tip` links.
 * @element cm-smart-tips
 * @slot - `cm-smart-tip` elements.
 * @fires cm-tour - When the tour banner's button is pressed.
 */
export class CmSmartTips extends CmLocalizedElement {
  static properties = {
    heading: { string: 'heading' },
    tourHeading: { attribute: 'tour-heading' },
    tourAction: { attribute: 'tour-action', string: 'tourAction' },
    headingLevel: { type: Number, attribute: 'heading-level' },
  };

  /** Title above the tips. Default: the built-in string `heading` ("Smart tips"). */
  heading!: string;
  /** Text of the dark tour banner ("Take a tour of Commmerce"). Leave empty for no banner. */
  tourHeading = '';
  /** Label of the tour banner's button. Default: the built-in string `tourAction` ("Start"). */
  tourAction!: string;
  /** Heading level of the title. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;

  static styles = [
    base,
    css`
      :host { display: block; }
      .card { display: flex; flex-direction: column; gap: var(--cm-space-8); }
      .tour {
        display: flex; align-items: center; gap: var(--cm-space-8); min-height: 56px; padding-block: var(--cm-space-12); padding-inline: var(--cm-space-16) var(--cm-space-12);
        border-radius: var(--cm-radius-md); background: var(--cm-bg-panel-header); color: var(--cm-text-on-dark);
      }
      .tour-icon {
        flex: none; display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px;
        border-radius: var(--cm-radius-full); background: var(--cm-nav-active); color: var(--cm-text-on-dark);
      }
      .tour-text { flex: 1; min-width: 0; font-size: var(--cm-font-size-14); font-weight: 500; line-height: var(--cm-line-height-14); }
      .panel { padding: var(--cm-space-8); border-radius: var(--cm-radius-md); background: var(--cm-bg-surface); }
      .title {
        margin: var(--cm-space-8) 0 var(--cm-space-16); text-align: center; font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600;
      }
      .list { display: flex; flex-direction: column; gap: var(--cm-space-8); }
    `,
  ];

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    return html`<div class="card" part="smart-tips">
      ${this.tourHeading
        ? html`<div class="tour" part="tour">
            <span class="tour-icon" aria-hidden="true"><cm-icon name="rocket" size="16"></cm-icon>
</span>
            <span class="tour-text">${this.tourHeading}</span>
            <cm-button size="medium" @click=${() => this.dispatchEvent(new CustomEvent('cm-tour', { bubbles: true, composed: true }))}>${this.tourAction}</cm-button>
          </div>`
        : nothing}
      <section class="panel" part="panel" aria-label=${this.heading}>
        <div class="title" role="heading" aria-level=${level} part="heading">${this.heading}</div>
        <div class="list" role="list"><slot></slot></div>
      </section>
    </div>`;
  }
}
define('cm-smart-tips', CmSmartTips);

declare global { interface HTMLElementTagNameMap { 'cm-smart-tip': CmSmartTip; 'cm-smart-tips': CmSmartTips } }
