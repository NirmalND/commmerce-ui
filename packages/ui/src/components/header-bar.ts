import { html, css, nothing, type PropertyValues } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { lockScroll, unlockScroll, deepActiveElement } from '../overlay.js';
import './icon.js';
import './avatar.js';

const strings = defineStrings('headerBar', {
  /** Accessible name of the header. */
  label: 'Admin',
  /** Accessible names of the store switcher, the wallet pill and the user pill. */
  store: 'Store: {store}. Switch store',
  balance: 'Wallet balance {balance}',
  account: 'Account: {name}',
  /** Accessible name of the search button on narrow bars, and of the full-screen search layer it opens. */
  search: 'Search',
});
declare module '../localize.js' { interface CmStrings { headerBar: typeof strings } }

/**
 * The white bar across the top of the admin: logo, store switcher, then account actions, the wallet
 * balance and the signed-in user on the right. For Commmerce products only, not for apps.
 *
 * The bar adapts to its own width: under 900px the actions hide; under 640px the balance hides too and the user pill shrinks to the avatar; put those
 * destinations in the Mobile menu instead.
 *
 * Global search goes in the `search` slot (usually a `cm-global-search`): inline after the store switcher while the bar is wider
 * than 900px; at 900px or narrower the bar shows a search button instead, which opens the search full screen.
 * @element cm-header-bar
 * @slot logo - The product logo (an `<img>` or `<svg>`), linked to the dashboard if you wrap it in `<a>`.
 * @slot actions - Buttons such as "Hire an Expert" (secondary) and "My Subscription" (primary).
 * @slot end - Anything after the user pill, e.g. a notifications button.
 * @slot search - One search box for the whole product, usually `cm-global-search`. Inline on wide bars; behind a search button that opens a full-screen layer at 900px or narrower.
 * @fires cm-store-switch - When the store switcher is pressed. Open your store list in response.
 * @fires cm-wallet - When the wallet balance is pressed.
 * @fires cm-account - When the user pill is pressed. Open the account menu in response.
 * @fires cm-search-toggle - When the full-screen search layer opens or closes (narrow bars), with `detail: { open }`.
 * @csspart search-button - The search button shown on narrow bars.
 * @csspart search-layer - The full-screen search layer (a modal `<dialog>`).
 */
export class CmHeaderBar extends CmLocalizedElement {
  static properties = {
    store: {},
    balance: {},
    userName: { attribute: 'user-name' },
    avatarSrc: { attribute: 'avatar-src' },
    label: { string: 'label' },
    searchLabel: { attribute: 'search-label', string: 'search' },
    _narrow: { state: true },
    _hasSearch: { state: true },
    _searchOpen: { state: true },
  };

  /** Current store's address or name, shown as the store switcher ("preprod.commmerce.com"). Empty hides it. */
  store = '';
  /** Wallet balance, already formatted ("₹ 2,312"). Empty hides the pill. */
  balance = '';
  /** Signed-in user's name. Empty hides the user pill. */
  userName = '';
  /** Avatar image URL. Without it, the initials of `user-name` are shown. */
  avatarSrc = '';
  /** Accessible name of the header's toolbar region. Default: the built-in string `label` ("Admin"). */
  label!: string;
  /** Accessible name of the search button on narrow bars and of the search layer. Default: the built-in string `search` ("Search"). */
  searchLabel!: string;

  _narrow = false;
  _hasSearch = false;
  _searchOpen = false;
  #resize?: ResizeObserver;
  #locked = false;
  #opener: HTMLElement | null = null;

  /** True while the full-screen search layer is open. */
  get searchOpen(): boolean { return this._searchOpen; }

  /** Brings up the search: focuses it on wide bars, or opens the full-screen layer on narrow ones. */
  openSearch() {
    if (!this._narrow) { this.#searchEl()?.focus(); return; }
    if (this._searchOpen) return;
    this.#opener = deepActiveElement();
    this._searchOpen = true;
  }

  /** Closes the full-screen search layer, and returns focus to the search button. */
  closeSearch() {
    if (this._searchOpen) this._searchOpen = false;
  }

  #searchEl() { return this.querySelector<HTMLElement>(':scope > [slot="search"]'); }

  constructor() {
    super();
    // Choosing a result in the layer navigates: close it (even when the app cancels the link to route itself).
    this.addEventListener('cm-select', (e) => {
      const s = this.#searchEl();
      if (this._searchOpen && s && e.composedPath().includes(s)) this.closeSearch();
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.#resize = new ResizeObserver(([entry]) => {
      const narrow = entry.contentRect.width <= 900;
      if (narrow !== this._narrow) {
        this._narrow = narrow;
        if (!narrow) this.closeSearch();
      }
    });
    this.#resize.observe(this);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#resize?.disconnect();
    if (this.#locked) { unlockScroll(); this.#locked = false; }
  }

  updated(changed: PropertyValues) {
    if (!changed.has('_searchOpen')) return;
    const d = this.renderRoot.querySelector<HTMLDialogElement>('dialog.layer');
    if (this._searchOpen && d && !d.open) {
      d.showModal();
      if (!this.#locked) { lockScroll(); this.#locked = true; }
      this.#searchEl()?.focus();
      this.#fire('cm-search-toggle', { open: true });
    } else if (!this._searchOpen && changed.get('_searchOpen')) {
      if (d?.open) d.close();
      if (this.#locked) { unlockScroll(); this.#locked = false; }
      const o = this.#opener ?? this.renderRoot.querySelector<HTMLElement>('.search-btn');
      this.#opener = null;
      if (o?.isConnected) o.focus();
      this.#fire('cm-search-toggle', { open: false });
    }
  }

  #onSearchSlot() {
    // Read the light DOM, not the event's slot: the slot moves between the bar and the layer, and the old one
    // reports an empty assignment after it is removed.
    this._hasSearch = !!this.#searchEl();
  }

  static styles = [
    base,
    css`
      :host { display: block; background: var(--cm-bg-surface); container-type: inline-size; }
      header {
        display: flex; align-items: center; gap: var(--cm-space-20); min-height: 70px; padding-block: 10px; padding-inline: 27px var(--cm-space-20);
      }
      .logo { display: flex; align-items: center; flex: 0 1 auto; min-width: 0; }
      ::slotted([slot='logo']) { display: block; max-height: 24px; width: auto; max-width: 100%; object-fit: contain; }
      .store, .pill, .user {
        display: inline-flex; align-items: center; gap: 8px; font: inherit; color: var(--cm-text-default);
        background: none; cursor: pointer;
      }
      .store {
        margin-inline-start: 60px; padding: 6px 8px; border: 0; border-radius: var(--cm-radius-sm); font-size: 18px; min-width: 0; flex: 0 1 auto;
      }
      .store span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .store:hover { background: var(--cm-bg-hover); }
      .grow { flex: 1; }
      .end { display: flex; align-items: center; gap: var(--cm-space-20); flex: none; white-space: nowrap; }
      .actions { display: flex; align-items: center; gap: var(--cm-space-20); }
      .pill {
        min-height: 44px; padding: 0 var(--cm-space-20); font-size: 14px; font-weight: 500;
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-sm);
      }
      .pill:hover, .user:hover { background: var(--cm-bg-hover); }
      .user {
        min-height: 50px; padding-block: 4px; padding-inline: 20px 6px; gap: var(--cm-space-20); font-size: 18px;
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-full);
      }
      .avatar { --cm-avatar-size: 36px; }
      .search { display: none; flex: 1 1 240px; min-width: 200px; max-width: 560px; }
      .search.has { display: block; }
      .search-btn {
        display: inline-grid; place-items: center; flex: none; width: 44px; height: 44px; padding: 0; border: 0;
        border-radius: var(--cm-radius-sm); background: none; color: var(--cm-icon-selected); cursor: pointer;
      }
      .search-btn:hover { background: var(--cm-bg-hover); }
      .layer {
        position: fixed; inset: 0; width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0;
        background: var(--cm-bg-surface); color: var(--cm-text-default); font: inherit;
        --cm-global-search-results-position: static; --cm-global-search-results-shadow: none; --cm-global-search-results-max-height: none;
      }
      .layer[open] { display: flex; flex-direction: column; }
      .layer::backdrop { background: var(--cm-bg-surface); }
      .layer-bar { display: flex; align-items: flex-start; gap: var(--cm-space-10); flex: 1 1 auto; min-height: 0; overflow: auto; padding: 8px var(--cm-space-15); }
      .layer-search { flex: 1; min-width: 0; }
      .layer-close {
        display: inline-grid; place-items: center; flex: none; width: 44px; height: 44px; padding: 0; border: 0;
        border-radius: var(--cm-radius-sm); background: none; color: var(--cm-icon-selected); cursor: pointer;
      }
      .layer-close:hover { background: var(--cm-bg-hover); }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      @container (max-width: 1300px) {
        .store { margin-inline-start: var(--cm-space-20); }
      }
      @container (max-width: 1100px) {
        .store { font-size: 16px; }
      }
      @container (max-width: 900px) {
        .actions { display: none; }
      }
      @container (max-width: 640px) {
        header { min-height: 56px; gap: var(--cm-space-10); padding: 8px var(--cm-space-15); }
        .actions, .pill { display: none; }
        .store { margin-inline-start: 0; font-size: 14px; }
        .user { padding: 2px; min-height: 0; border-color: transparent; }
        .user .name { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        .avatar { --cm-avatar-size: 32px; }
        /* The controls on the right keep their 44px touch areas, so they need no gap between them; the logo gives way first. */
        .end { gap: 0; }
      }
    `,
  ];

  #fire(name: string, detail?: unknown) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  render() {
    return html`
      <header part="bar" role="banner" aria-label=${this.label || nothing}>
        <div class="logo"><slot name="logo"></slot></div>
        ${this.store ? html`<button type="button" class="store" part="store" aria-haspopup="true" aria-label=${this.t('store', { store: this.store })}
            @click=${() => this.#fire('cm-store-switch')}><span>${this.store}</span><cm-icon name="chevron-down" size="20"></cm-icon></button>` : nothing}
        ${this._narrow ? nothing : html`<div class="search${this._hasSearch ? ' has' : ''}" part="search"><slot name="search" @slotchange=${this.#onSearchSlot}></slot></div>`}
        <span class="grow"></span>
        <div class="end">
          ${this._narrow && this._hasSearch ? html`<button type="button" class="search-btn" part="search-button" aria-label=${this.searchLabel}
              aria-haspopup="dialog" aria-expanded=${this._searchOpen ? 'true' : 'false'} @click=${() => this.openSearch()}><cm-icon name="search" size="20"></cm-icon></button>` : nothing}
          <div class="actions"><slot name="actions"></slot></div>
          ${this.balance ? html`<button type="button" class="pill" part="balance" aria-label=${this.t('balance', { balance: this.balance })}
              @click=${() => this.#fire('cm-wallet')}>${this.balance}</button>` : nothing}
          ${this.userName ? html`<button type="button" class="user" part="user" aria-haspopup="true" aria-label=${this.t('account', { name: this.userName })}
              @click=${() => this.#fire('cm-account')}><span class="name">${this.userName}</span>
              <cm-avatar class="avatar" name=${this.userName} src=${this.avatarSrc} decorative></cm-avatar></button>` : nothing}
          <slot name="end"></slot>
        </div>
      </header>
      ${this._narrow ? html`<dialog class="layer" part="search-layer" aria-label=${this.searchLabel}
          @keydown=${(e: KeyboardEvent) => {
            // Handle Escape here rather than relying on the dialog's cancel event, which browsers may skip after
            // repeated Escapes without other input. The search box claims the Escapes it uses with preventDefault.
            if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); this.closeSearch(); }
          }}
          @cancel=${(e: Event) => { e.preventDefault(); this.closeSearch(); }} @close=${() => this.closeSearch()}>
        <div class="layer-bar">
          <div class="layer-search"><slot name="search" @slotchange=${this.#onSearchSlot}></slot></div>
          <button type="button" class="layer-close" aria-label=${this.t('close')} @click=${() => this.closeSearch()}><cm-icon name="close" size="20"></cm-icon></button>
        </div>
      </dialog>` : nothing}
    `;
  }
}
define('cm-header-bar', CmHeaderBar);

declare global { interface HTMLElementTagNameMap { 'cm-header-bar': CmHeaderBar } }
