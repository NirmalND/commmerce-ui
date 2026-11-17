import { html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { type NavItem, readNavItems, watchNavItems, fireNavigate } from './nav-item.js';

const strings = defineStrings('linkTabs', {
  /** Accessible name of the navigation landmark. */
  label: 'Sections',
});
declare module '../localize.js' { interface CmStrings { linkTabs: typeof strings } }

/**
 * A row of links between sibling pages, such as the sections of Settings or the parts of a product
 * (Details, Variants, Inventory). It looks like Status tabs but each tab is a link to its own page:
 * the current page is black and underlined. Too many tabs for the width scroll sideways.
 *
 * To filter one list without leaving the page, use Status tabs instead.
 * @element cm-link-tabs
 * @slot - `cm-nav-item` elements with `href`; mark the page you are on `current`.
 * @fires cm-navigate - When a tab is chosen. `detail: { item, value, href }`. Cancelable: call `preventDefault()` to route in your app.
 */
export class CmLinkTabs extends CmLocalizedElement {
  static properties = {
    items: { type: Array },
    label: { string: 'label' },
    _slotted: { state: true },
  };

  /** Tabs as data (`{ label, href, current }`). Used instead of `cm-nav-item` children when set. */
  items: NavItem[] = [];
  /** Accessible name of the navigation, e.g. "Settings sections". Default: the built-in string `label` ("Sections"). */
  label!: string;

  _slotted: NavItem[] = [];
  #observer?: MutationObserver;

  static styles = [
    base,
    css`
      :host { display: block; }
      ul {
        display: flex; gap: var(--cm-space-24); margin: 0; padding: 2px 2px 0; list-style: none; overflow-x: auto; scrollbar-width: thin;
        border-bottom: var(--cm-border-1) solid var(--cm-border-subtle); white-space: nowrap;
      }
      li { flex: none; display: flex; }
      a {
        position: relative; display: inline-flex; align-items: center; gap: var(--cm-space-8); padding: var(--cm-space-4) 0 var(--cm-space-12);
        font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 500; color: var(--cm-text-tertiary); text-decoration: none;
      }
      a::after { content: ''; position: absolute; inset-inline: 0; bottom: -1px; height: 2px; border-radius: var(--cm-radius-full); background: transparent; }
      a:hover { color: var(--cm-text-default); }
      a[aria-current='page'] { color: var(--cm-text-default); }
      a[aria-current='page']::after { background: var(--cm-border-strong); }
      a:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; border-radius: var(--cm-radius-xs); }
      .badge { font-size: var(--cm-font-size-12); color: var(--cm-text-tertiary); font-variant-numeric: tabular-nums; }
      @media (max-width: 640px) { ul { gap: var(--cm-space-16); } }

    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#read();
    this.#observer = watchNavItems(this, () => this.#read());
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  /** The tabs in use. */
  get tabs(): NavItem[] { return this.items.length ? this.items : this._slotted; }

  #read() { this._slotted = readNavItems(this); }

  render() {
    return html`<nav part="nav" aria-label=${this.label || this.t('label')}>
      <ul part="tabs">${this.tabs.map((t) => html`<li><a part="tab" href=${t.href || '#'} aria-current=${t.current ? 'page' : nothing}
          @click=${(e: Event) => { if (!fireNavigate(this, t)) e.preventDefault(); }}>${t.label}${t.badge ? html`<span class="badge">(${t.badge})</span>` : nothing}</a></li>`)}</ul>
      <slot hidden></slot>
    </nav>`;
  }
}
define('cm-link-tabs', CmLinkTabs);

declare global { interface HTMLElementTagNameMap { 'cm-link-tabs': CmLinkTabs } }
