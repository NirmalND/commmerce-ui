import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { type NavItem, readNavItems, watchNavItems, hasCurrent, fireNavigate, navValue } from './nav-item.js';
import './icon.js';

/**
 * The admin's main menu: a black rounded panel down the left of the page, with an icon and a label per
 * destination and sections that open to show their sub-items. For Commmerce products only, not for apps:
 * apps are shown inside the admin, which already has this menu.
 *
 * Items come from `cm-nav-item` children or the `items` property, so every Commmerce product can use it.
 * @element cm-side-navigation
 * @slot - `cm-nav-item` elements (nest them for sub-items).
 * @slot header - Optional content above the items, such as a store switcher on narrow layouts.
 * @slot footer - Optional content below the items.
 * @fires cm-navigate - When an item is chosen. `detail: { item, value, href }`. Cancelable: call `preventDefault()` to route in your app instead of following the link.
 * @fires cm-expand - When a section opens or closes. `detail: { item, expanded }`.
 */
export class CmSideNavigation extends LitElement {
  static properties = {
    items: { type: Array },
    label: {},
    _slotted: { state: true },
    _open: { state: true },
  };

  /** Items as data. Used instead of `cm-nav-item` children when set. */
  items: NavItem[] = [];
  /** Accessible name of the navigation landmark. */
  label = 'Main';

  _slotted: NavItem[] = [];
  _open = new Set<string>();
  #seen = new Set<string>();
  #observer?: MutationObserver;
  #id = nextId('cm-sidenav');

  static styles = [
    base,
    css`
      :host { display: block; width: var(--cm-side-navigation-width, 250px); }
      nav {
        background: var(--cm-bg-dashboard); color: var(--cm-text-on-dark-secondary); border-radius: 16px;
        padding: 14px 0; font-size: 16px; line-height: 1.25;
      }
      ul { list-style: none; margin: 0; padding: 0; }
      .item {
        display: flex; align-items: center; gap: 8px; width: calc(100% - 16px); min-height: 40px; margin: 0 8px; padding: 0 10px 0 12px;
        font: inherit; color: inherit; text-align: start; text-decoration: none; background: none; border: 0; border-radius: 8px; cursor: pointer;
      }
      .item:hover { color: var(--cm-text-on-dark); background: var(--cm-nav-active); }
      .item:focus-visible { outline: 2px solid var(--cm-text-on-dark); outline-offset: -2px; color: var(--cm-text-on-dark); }
      .item[aria-current='page'] { color: var(--cm-text-on-dark); font-weight: 600; }
      .parent.has-current { color: var(--cm-text-on-dark); }
      .label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .chev { transition: transform 0.15s; }
      [aria-expanded='true'] .chev { transform: rotate(180deg); }
      .badge {
        flex: none; padding: 1px 6px; border-radius: var(--cm-radius-full); font-size: 10px; font-weight: 500;
        letter-spacing: var(--cm-tracking-caps); text-transform: uppercase; color: var(--cm-text-on-dark); background: var(--cm-nav-badge);
      }
      .sub { padding: 2px 0 6px; }
      .sub .item { min-height: 36px; padding-left: 40px; font-size: 14px; }
      .sub .item.deep { padding-left: 56px; }
      @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
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
    next ? s.add(k) : s.delete(k);
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
    let next: HTMLElement | undefined;
    if (e.key === 'ArrowDown') next = all[(i + 1) % all.length];
    else if (e.key === 'ArrowUp') next = all[(i - 1 + all.length) % all.length];
    else if (e.key === 'Home') next = all[0];
    else if (e.key === 'End') next = all[all.length - 1];
    else if (e.key === 'ArrowRight' && t.classList.contains('parent')) { this.toggle(idx, true); e.preventDefault(); return; }
    else if (e.key === 'ArrowLeft') {
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

  #link(it: NavItem, cls: string, extra: { index?: number; parent?: number } = {}) {
    const inner = html`${it.icon ? html`<cm-icon name=${it.icon} size="20"></cm-icon>` : nothing}<span class="label">${it.label}</span>${it.badge ? html`<span class="badge">${it.badge}</span>` : nothing}`;
    return it.href
      ? html`<a class="item ${cls}" part="item" href=${it.href} aria-current=${it.current ? 'page' : nothing}
          data-index=${extra.index ?? nothing} data-parent=${extra.parent ?? nothing} @click=${(e: Event) => this.#choose(e, it)}>${inner}</a>`
      : html`<button type="button" class="item ${cls}" part="item" aria-current=${it.current ? 'page' : nothing}
          data-index=${extra.index ?? nothing} data-parent=${extra.parent ?? nothing} @click=${(e: Event) => this.#choose(e, it)}>${inner}</button>`;
  }

  render() {
    return html`
      <nav part="nav" aria-label=${this.label || 'Main'} @keydown=${this.#onKeyDown}>
        <slot name="header"></slot>
        <ul part="list">
          ${this.navItems.map((it, i) => {
            if (!it.items?.length) return html`<li>${this.#link(it, '', { index: i })}</li>`;
            const open = this._open.has(this.#key(it, i));
            const sub = `${this.#id}-${i}`;
            return html`<li>
              <button type="button" class="item parent ${hasCurrent(it) ? 'has-current' : ''}" part="item" data-index=${i}
                aria-expanded=${open ? 'true' : 'false'} aria-controls=${sub} @click=${() => this.toggle(i)}>
                ${it.icon ? html`<cm-icon name=${it.icon} size="20"></cm-icon>` : nothing}<span class="label">${it.label}</span>${it.badge ? html`<span class="badge">${it.badge}</span>` : nothing}
                <cm-icon class="chev" name="chevron-down" size="18"></cm-icon>
              </button>
              <ul class="sub" id=${sub} ?hidden=${!open} aria-label=${it.label}>
                ${this.#flatten(it.items).map(([s, d]) => html`<li>${this.#link({ ...s, icon: undefined }, d ? 'deep' : '', { parent: i })}</li>`)}
              </ul>
            </li>`;
          })}
        </ul>
        <slot name="footer"></slot>
        <slot hidden></slot>
      </nav>
    `;
  }
}
define('cm-side-navigation', CmSideNavigation);

declare global { interface HTMLElementTagNameMap { 'cm-side-navigation': CmSideNavigation } }
