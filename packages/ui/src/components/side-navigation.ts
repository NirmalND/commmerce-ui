import { html, css, nothing } from 'lit';
import { base, define, nextId, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { type NavItem, readNavItems, watchNavItems, hasCurrent, fireNavigate, navValue } from './nav-item.js';
import './icon.js';
import './tooltip.js';

const strings = defineStrings('sideNavigation', {
  /** Accessible name of the navigation landmark. */
  label: 'Main',
  /** The built-in collapse button, while the full menu is shown. */
  collapse: 'Collapse menu',
  /** The built-in collapse button, while only icons are shown. */
  expand: 'Expand menu',
});
declare module '../localize.js' { interface CmStrings { sideNavigation: typeof strings } }

/**
 * The admin's main menu: a black rounded panel down the left of the page, with an icon and a label per
 * destination and sections that open to show their sub-items. For Commmerce products only, not for apps:
 * apps are shown inside the admin, which already has this menu.
 *
 * Items come from `cm-nav-item` children or the `items` property, so every Commmerce product can use it.
 *
 * `collapsed` turns it into a narrow rail of icons, to give wide pages (tables, reports) more room. Each item's
 * label is still its accessible name and shows as a tooltip on hover and focus; badges become a dot (or a small
 * count when the badge is a number). Add `collapsible` for a built-in button that switches between the two: it
 * fires `cm-collapse` so the app can remember the choice.
 * @element cm-side-navigation
 * @slot - `cm-nav-item` elements (nest them for sub-items).
 * @slot header - Optional content above the items, such as a store switcher on narrow layouts.
 * @slot footer - Optional content below the items.
 * @fires cm-navigate - When an item is chosen. `detail: { item, value, href }`. Cancelable: call `preventDefault()` to route in your app instead of following the link.
 * @fires cm-expand - When a section opens or closes. `detail: { item, expanded }`.
 * @fires cm-collapse - When the merchant collapses the menu to icons or expands it again: from the built-in button (`collapsible`), or by choosing a section while collapsed (that expands the menu and opens the section). `detail: { collapsed }`. Cancelable: call `preventDefault()` to keep the current state. Not fired when you set `collapsed` yourself.
 * @cssprop --cm-side-navigation-width - Width of the full menu. Default `220px` (owner standard, 1.6; was 250px).
 * @cssprop --cm-side-navigation-collapsed-width - Width of the icon rail (`collapsed`). Default `72px`.
 */
export class CmSideNavigation extends CmLocalizedElement {
  static properties = {
    items: { type: Array },
    label: { string: 'label' },
    collapsed: { type: Boolean, reflect: true },
    collapsible: { type: Boolean, reflect: true },
    _slotted: { state: true },
    _open: { state: true },
  };

  /** Items as data. Used instead of `cm-nav-item` children when set. */
  items: NavItem[] = [];
  /** Accessible name of the navigation landmark. Default: the built-in string `label` ("Main"). */
  label!: string;
  /** Shows only the icons, in a narrow rail. Labels become tooltips and stay the items' accessible names; sub-items are hidden. */
  collapsed = false;
  /** Adds a button at the bottom that collapses the menu to icons and expands it again, firing `cm-collapse`. */
  collapsible = false;

  _slotted: NavItem[] = [];
  _open = new Set<string>();
  #seen = new Set<string>();
  #observer?: MutationObserver;
  #id = nextId('cm-sidenav');

  static styles = [
    base,
    css`
      :host { display: block; width: var(--cm-side-navigation-width, 220px); }
      nav {
        background: var(--cm-bg-dashboard); color: var(--cm-text-on-dark-secondary); border-radius: var(--cm-radius-lg);
        padding: var(--cm-space-12) 0; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14);
      }
      ul { list-style: none; margin: 0; padding: 0; }
      .item {
        display: flex; align-items: center; gap: var(--cm-space-8); box-sizing: border-box; width: calc(100% - 2 * var(--cm-space-8));
        min-height: var(--cm-control-height-md); margin: 0 var(--cm-space-8); padding-block: 0; padding-inline: var(--cm-space-12);
        font: inherit; color: inherit; text-align: start; text-decoration: none; background: none; border: 0; border-radius: var(--cm-radius-sm); cursor: pointer;
      }
      /* Owner standard (1.6): a 220px menu of 36px rows with 12px side padding. */
      .item:hover { color: var(--cm-text-on-dark); background: var(--cm-nav-active); }
      .item:active { background: color-mix(in srgb, var(--cm-nav-active), var(--cm-text-on-dark) 10%); }
      .item:focus-visible { outline: 2px solid var(--cm-text-on-dark); outline-offset: -2px; color: var(--cm-text-on-dark); }
      .item[aria-current='page'] { color: var(--cm-text-on-dark); font-weight: 600; }
      .parent.has-current { color: var(--cm-text-on-dark); }
      .label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .chev { transition: transform var(--cm-duration-fast) var(--cm-easing-standard); }
      [aria-expanded='true'] .chev { transform: rotate(180deg); }
      .badge {
        flex: none; box-sizing: border-box; min-inline-size: var(--cm-space-20); padding: 0 var(--cm-space-4); text-align: center;
        border-radius: var(--cm-radius-full); font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); font-weight: 500;
        font-variant-numeric: tabular-nums; color: var(--cm-text-on-dark); background: var(--cm-nav-badge);
      }
      .sub { padding: 0 0 var(--cm-space-4); }
      .sub .item { min-height: var(--cm-control-height-sm); padding-inline-start: calc(var(--cm-space-12) + var(--cm-icon-size-md) + var(--cm-space-8)); }
      .sub .item.deep { padding-inline-start: calc(var(--cm-space-12) + var(--cm-icon-size-md) + var(--cm-space-8) + var(--cm-space-16)); }
      @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
      /* Touch screens: rows at least 44px tall. */
      @media (pointer: coarse) { .item, .sub .item, :host([collapsed]) .item { min-height: var(--cm-control-height-touch); } }
      .sr { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
      .toggle { margin-block-start: var(--cm-space-8); color: var(--cm-text-on-dark-secondary); }
      /* Collapsed: an icon rail. */
      :host([collapsed]) { width: var(--cm-side-navigation-collapsed-width, 72px); }
      :host([collapsed]) cm-tooltip { display: block; color: inherit; }
      :host([collapsed]) .item { position: relative; justify-content: center; min-height: var(--cm-control-height-lg); padding: 0; }
      :host([collapsed]) .item[aria-current='page'], :host([collapsed]) .parent.has-current { background: var(--cm-nav-active); }
      .initial { display: grid; place-items: center; width: var(--cm-icon-size-md); height: var(--cm-icon-size-md); font-size: var(--cm-font-size-14); font-weight: 600; }
      .dot {
        position: absolute; inset-block-start: 6px; inset-inline-start: calc(50% + 4px); min-width: 8px; height: 8px; border-radius: var(--cm-radius-full);
        background: var(--cm-nav-badge); box-shadow: 0 0 0 2px var(--cm-bg-dashboard);
      }
      .dot.count { inset-block-start: 2px; height: 16px; padding: 0 var(--cm-space-4); font-size: var(--cm-font-size-12); font-weight: 600; line-height: 16px; text-align: center; font-variant-numeric: tabular-nums; color: var(--cm-text-on-dark); }
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

  /** The items in use. */
  get navItems(): NavItem[] { return this.items.length ? this.items : this._slotted; }

  #read() { this._slotted = readNavItems(this); }

  willUpdate() {
    // Sections open when they hold the current page or ask to, the first time they are seen.
    this.navItems.forEach((it, i) => {
      const k = this.#key(it, i);
      if (this.#seen.has(k) || !it.items?.length) return;
      this.#seen.add(k);
      if (it.expanded || hasCurrent(it)) this._open.add(k);
    });
  }

  #key(it: NavItem, i: number) { return `${i}:${navValue(it)}`; }

  /** Opens or closes the section at `index`. */
  toggle(index: number, open?: boolean) {
    const it = this.navItems[index];
    if (!it?.items?.length) return;
    const k = this.#key(it, index);
    const next = open ?? !this._open.has(k);
    if (next === this._open.has(k)) return;
    const s = new Set(this._open);
    if (next) s.add(k);
    else s.delete(k);
    this._open = s;
    this.dispatchEvent(new CustomEvent('cm-expand', { bubbles: true, composed: true, detail: { item: it, expanded: next } }));
  }

  #choose(e: Event, it: NavItem) {
    if (!fireNavigate(this, it)) e.preventDefault();
  }

  #focusables() {
    return [...this.renderRoot.querySelectorAll<HTMLElement>('.item')].filter((el) => !el.closest('[hidden]'));
  }

  #onKeyDown(e: KeyboardEvent) {
    const t = (e.composedPath()[0] as HTMLElement)?.closest?.('.item') as HTMLElement | null;
    if (!t) return;
    const all = this.#focusables();
    const i = all.indexOf(t);
    const idx = Number(t.dataset.index);
    const key = logicalKey(e, this);
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = all[(i + 1) % all.length];
    else if (e.key === 'ArrowUp') next = all[(i - 1 + all.length) % all.length];
    else if (e.key === 'Home') next = all[0];
    else if (e.key === 'End') next = all[all.length - 1];
    else if (this.collapsed && (key === 'ArrowRight' || key === 'ArrowLeft')) return;
    else if (key === 'ArrowRight' && t.classList.contains('parent')) { this.toggle(idx, true); e.preventDefault(); return; }
    else if (key === 'ArrowLeft') {
      if (t.classList.contains('parent')) this.toggle(idx, false);
      else if (t.dataset.parent) next = this.renderRoot.querySelector<HTMLElement>(`.parent[data-index="${t.dataset.parent}"]`) ?? undefined;
      if (!next) { e.preventDefault(); return; }
    } else return;
    e.preventDefault();
    next?.focus();
  }

  #flatten(items: NavItem[], depth = 0): Array<[NavItem, number]> {
    return items.flatMap((it) => [[it, depth] as [NavItem, number], ...this.#flatten(it.items ?? [], depth + 1)]);
  }

  /** Collapses or expands the menu as the merchant asked, unless a `cm-collapse` handler cancels it. */
  #setCollapsed(next: boolean) {
    if (next === this.collapsed) return true;
    const ok = this.dispatchEvent(new CustomEvent('cm-collapse', { bubbles: true, composed: true, cancelable: true, detail: { collapsed: next } }));
    if (ok) this.collapsed = next;
    return ok;
  }

  /** A section chosen in the rail: expand the menu and open it. */
  #openFromRail(i: number) {
    if (!this.#setCollapsed(false)) return;
    this.toggle(i, true);
    this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`.parent[data-index="${i}"]`)?.focus());
  }

  #icon(it: NavItem) {
    if (it.icon) return html`<cm-icon name=${it.icon} size="20"></cm-icon>`;
    return this.collapsed ? html`<span class="initial" aria-hidden="true">${([...it.label.trim()][0] ?? '').toLocaleUpperCase(this.locale)}</span>` : nothing;
  }

  /** Label and badge. In the rail the label is hidden visually (it stays the accessible name) and the badge is a dot or a short count. */
  #text(it: NavItem) {
    if (!this.collapsed) return html`<span class="label">${it.label}</span>${it.badge ? html`<span class="badge">${it.badge}</span>` : nothing}`;
    const count = it.badge && /^\d{1,2}\+?$/.test(it.badge.trim());
    return html`<span class="sr">${it.label}${it.badge ? ` (${it.badge})` : ''}</span>${it.badge ? html`<span class="dot ${count ? 'count' : ''}" aria-hidden="true">${count ? it.badge : nothing}</span>` : nothing}`;
  }

  /** In the rail, every item is wrapped in a tooltip that shows its label. */
  #tip(it: NavItem, inner: unknown) {
    return this.collapsed ? html`<cm-tooltip content=${it.label} placement="end" visual-only>${inner}</cm-tooltip>` : inner;
  }

  #link(it: NavItem, cls: string, extra: { index?: number; parent?: number } = {}) {
    const inner = html`${this.#icon(it)}${this.#text(it)}`;
    return this.#tip(it, it.href
      ? html`<a class="item ${cls}" part="item" href=${it.href} aria-current=${it.current ? 'page' : nothing}
          data-index=${extra.index ?? nothing} data-parent=${extra.parent ?? nothing} @click=${(e: Event) => this.#choose(e, it)}>${inner}</a>`
      : html`<button type="button" class="item ${cls}" part="item" aria-current=${it.current ? 'page' : nothing}
          data-index=${extra.index ?? nothing} data-parent=${extra.parent ?? nothing} @click=${(e: Event) => this.#choose(e, it)}>${inner}</button>`);
  }

  #toggleButton() {
    if (!this.collapsible) return nothing;
    const label = this.t(this.collapsed ? 'expand' : 'collapse');
    const inner = html`<cm-icon name=${this.collapsed ? 'chevron-right' : 'chevron-left'} size="20"></cm-icon>${this.collapsed
      ? html`<span class="sr">${label}</span>` : html`<span class="label">${label}</span>`}`;
    return html`<div class="toggle-row">${this.#tip({ label }, html`<button type="button" class="item toggle" part="collapse-button"
      @click=${() => this.#setCollapsed(!this.collapsed)}>${inner}</button>`)}</div>`;
  }

  render() {
    const rail = this.collapsed;
    return html`
      <nav part="nav" aria-label=${this.label || this.t('label')} @keydown=${this.#onKeyDown}>
        <slot name="header"></slot>
        <ul part="list">
          ${this.navItems.map((it, i) => {
            if (!it.items?.length) return html`<li>${this.#link(it, '', { index: i })}</li>`;
            const open = !rail && this._open.has(this.#key(it, i));
            const sub = `${this.#id}-${i}`;
            return html`<li>
              ${this.#tip(it, html`<button type="button" class="item parent ${hasCurrent(it) ? 'has-current' : ''}" part="item" data-index=${i}
                aria-expanded=${open ? 'true' : 'false'} aria-controls=${sub} @click=${() => (rail ? this.#openFromRail(i) : this.toggle(i))}>
                ${this.#icon(it)}${this.#text(it)}
                ${rail ? nothing : html`<cm-icon class="chev" name="chevron-down" size="16"></cm-icon>`}
              </button>`)}
              <ul class="sub" id=${sub} ?hidden=${!open} aria-label=${it.label}>
                ${this.#flatten(it.items).map(([s, d]) => html`<li>${this.#link({ ...s, icon: undefined }, d ? 'deep' : '', { parent: i })}</li>`)}
              </ul>
            </li>`;
          })}
        </ul>
        ${this.#toggleButton()}
        <slot name="footer"></slot>
        <slot hidden></slot>
      </nav>
    `;
  }
}
define('cm-side-navigation', CmSideNavigation);

declare global { interface HTMLElementTagNameMap { 'cm-side-navigation': CmSideNavigation } }
