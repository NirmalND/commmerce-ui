import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { type NavItem, readNavItems, watchNavItems, fireNavigate } from './nav-item.js';
import './icon.js';

/**
 * The admin's full menu on phones, opened from "More" in the Bottom navigation. A grey page of white
 * rounded cards: the store and the signed-in user first, then labelled sections of rows. Rows with
 * sub-items open them on a second screen with a back button. For Commmerce products only, not for apps.
 *
 * Top-level `cm-nav-item`s are sections (their `label` is the heading; leave it empty for a card without
 * one). Their children are rows. A child marked `primary` is the section's action, e.g. "Add channel".
 * @element cm-mobile-menu
 * @slot - `cm-nav-item` sections, each holding row items.
 * @fires cm-navigate - When a row is chosen. `detail: { item, value, href }`. Cancelable: call `preventDefault()` to route in your app.
 * @fires cm-store-switch - When the store card is pressed.
 * @fires cm-account - When the user row is pressed.
 */
export class CmMobileMenu extends LitElement {
  static properties = {
    items: { type: Array },
    store: {},
    userName: { attribute: 'user-name' },
    userEmail: { attribute: 'user-email' },
    avatarSrc: { attribute: 'avatar-src' },
    label: {},
    _slotted: { state: true },
    _page: { state: true },
  };

  /** Sections as data: `[{ label: 'Panels', items: [{ label: 'Reports', icon: 'chart', href }] }]`. Used instead of children when set. */
  items: NavItem[] = [];
  /** Store the merchant is signed in to. Empty hides the store row. */
  store = '';
  /** Signed-in user's name. Empty hides the user row. */
  userName = '';
  /** Signed-in user's email, under the name. */
  userEmail = '';
  /** Avatar image URL. Without it, the first letter of the name is shown. */
  avatarSrc = '';
  /** Accessible name of the navigation landmark. */
  label = 'Menu';

  _slotted: NavItem[] = [];
  /** Path of the open sub-page as [section, row], or null on the main page. */
  _page: [number, number] | null = null;
  #observer?: MutationObserver;
  #id = nextId('cm-mmenu');

  static styles = [
    base,
    css`
      :host { display: block; background: var(--cm-bg-page); }
      nav { padding: var(--cm-space-20); display: flex; flex-direction: column; gap: var(--cm-space-20); }
      .heading {
        margin: 0 0 8px; font-size: 12px; font-weight: 500; letter-spacing: var(--cm-tracking-caps); text-transform: uppercase;
        color: var(--cm-text-default);
      }
      .card { list-style: none; margin: 0; padding: 0 15px; background: var(--cm-bg-surface); border-radius: 12px; }
      .card > li + li { border-top: var(--cm-border-1) solid var(--cm-border-default); }
      .row {
        display: flex; align-items: center; gap: var(--cm-space-15); width: 100%; min-height: 51px; padding: 8px 4px 8px 6px;
        font: inherit; font-size: 18px; font-weight: 500; color: var(--cm-text-default); text-align: start; text-decoration: none;
        background: none; border: 0; cursor: pointer;
      }
      .row:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; border-radius: var(--cm-radius-sm); }
      .row .icon { color: var(--cm-icon-responsive-menu); }
      .label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .chev { color: var(--cm-icon-selected); }
      .badge {
        flex: none; padding: 5px 10px; border-radius: var(--cm-radius-full); font-size: 10px; font-weight: 500;
        letter-spacing: var(--cm-tracking-caps); text-transform: uppercase; color: var(--cm-text-on-dark); background: var(--cm-nav-badge);
      }
      .action { justify-content: center; min-height: 40px; font-size: 12px; letter-spacing: var(--cm-tracking-caps); text-transform: uppercase; }
      .eyebrow { display: block; font-size: 12px; letter-spacing: var(--cm-tracking-caps); text-transform: uppercase; color: var(--cm-text-tertiary); }
      .stack { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; }
      .email { font-size: 12px; font-weight: 400; }
      .avatar {
        display: grid; place-items: center; flex: none; width: 36px; height: 36px; border-radius: 50%; overflow: hidden;
        font-size: 12px; background: var(--cm-avatar-bg); border: var(--cm-border-1) solid var(--cm-border-strong); color: var(--cm-text-default);
      }
      .avatar img { width: 100%; height: 100%; object-fit: cover; }
      .back {
        display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; padding: 6px 4px; font: inherit; font-size: 16px; font-weight: 500;
        color: var(--cm-text-default); background: none; border: 0; cursor: pointer; border-radius: var(--cm-radius-sm);
      }
      .back:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .sub .row { font-size: 16px; min-height: 48px; }
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

  /** The sections in use. */
  get sections(): NavItem[] { return this.items.length ? this.items : this._slotted; }

  #read() { this._slotted = readNavItems(this); }

  /** Returns to the main page from a sub-page. */
  back() {
    if (!this._page) return;
    const [s, r] = this._page;
    this._page = null;
    this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>(`[data-row="${s}-${r}"]`)?.focus());
  }

  #open(s: number, r: number) {
    this._page = [s, r];
    this.updateComplete.then(() => this.renderRoot.querySelector<HTMLElement>('.back')?.focus());
  }

  #fire(name: string) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true })); }

  #row(it: NavItem, s: number, r: number, sub = false) {
    const go = (e: Event) => { if (!fireNavigate(this, it)) e.preventDefault(); };
    if (it.primary && !sub) return html`<button type="button" class="row action" part="row" @click=${go}>${it.label}</button>`;
    const icon = it.icon && !sub ? html`<cm-icon class="icon" name=${it.icon} size="24"></cm-icon>` : nothing;
    const badge = it.badge ? html`<span class="badge">${it.badge}</span>` : nothing;
    if (it.items?.length && !sub) {
      return html`<button type="button" class="row" part="row" data-row="${s}-${r}"
          @click=${() => this.#open(s, r)}>${icon}<span class="label">${it.label}</span>${badge}<cm-icon class="chev" name="chevron-right" size="16"></cm-icon></button>`;
    }
    const inner = html`${icon}<span class="label">${it.label}</span>${badge}${it.href && !sub ? html`<cm-icon class="chev" name="chevron-right" size="16"></cm-icon>` : nothing}`;
    return it.href
      ? html`<a class="row" part="row" href=${it.href} aria-current=${it.current ? 'page' : nothing} @click=${go}>${inner}</a>`
      : html`<button type="button" class="row" part="row" aria-current=${it.current ? 'page' : nothing} @click=${go}>${inner}</button>`;
  }

  #profile() {
    if (!this.store && !this.userName) return nothing;
    const initial = this.userName.trim().charAt(0).toUpperCase();
    return html`<section aria-labelledby="${this.#id}-profile">
      <h2 class="heading" id="${this.#id}-profile">Profile</h2>
      <ul class="card">
        ${this.store ? html`<li><button type="button" class="row" part="row" @click=${() => this.#fire('cm-store-switch')}>
            <span class="stack"><span class="eyebrow">Logged in to store</span><span>${this.store}</span></span>
            <cm-icon class="chev" name="chevron-right" size="16"></cm-icon></button></li>` : nothing}
        ${this.userName ? html`<li><button type="button" class="row" part="row" @click=${() => this.#fire('cm-account')}>
            <span class="avatar">${this.avatarSrc ? html`<img src=${this.avatarSrc} alt="">` : html`<span aria-hidden="true">${initial}</span>`}</span>
            <span class="stack"><span>${this.userName}</span>${this.userEmail ? html`<span class="email">${this.userEmail}</span>` : nothing}</span>
            <cm-icon class="chev" name="chevron-right" size="16"></cm-icon></button></li>` : nothing}
      </ul>
    </section>`;
  }

  render() {
    const secs = this.sections;
    const page = this._page ? secs[this._page[0]]?.items?.[this._page[1]] : undefined;
    if (page) {
      return html`<nav part="nav" class="sub" aria-label=${this.label || 'Menu'} id="${this.#id}-sub"
          @keydown=${(e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); this.back(); } }}>
        <button type="button" class="back" part="back" @click=${() => this.back()}><cm-icon name="arrow-left" size="18"></cm-icon>${page.label}</button>
        <ul class="card" aria-label=${page.label}>${page.items!.map((it) => html`<li>${this.#row(it, 0, 0, true)}</li>`)}</ul>
        <slot hidden></slot>
      </nav>`;
    }
    return html`<nav part="nav" aria-label=${this.label || 'Menu'}>
      ${this.#profile()}
      ${secs.map((sec, s) => {
        const hid = `${this.#id}-s${s}`;
        return html`<section aria-labelledby=${sec.label ? hid : nothing}>
          ${sec.label ? html`<h2 class="heading" id=${hid}>${sec.label}</h2>` : nothing}
          <ul class="card">${(sec.items ?? []).map((it, r) => html`<li>${this.#row(it, s, r)}</li>`)}</ul>
        </section>`;
      })}
      <slot hidden></slot>
    </nav>`;
  }
}
define('cm-mobile-menu', CmMobileMenu);

declare global { interface HTMLElementTagNameMap { 'cm-mobile-menu': CmMobileMenu } }
