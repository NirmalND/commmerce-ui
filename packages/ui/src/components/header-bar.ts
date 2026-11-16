import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';
import './avatar.js';

const strings = defineStrings('headerBar', {
  /** Accessible name of the header. */
  label: 'Admin',
  /** Accessible names of the store switcher, the wallet pill and the user pill. */
  store: 'Store: {store}. Switch store',
  balance: 'Wallet balance {balance}',
  account: 'Account: {name}',
});
declare module '../localize.js' { interface CmStrings { headerBar: typeof strings } }

/**
 * The white bar across the top of the admin: logo, store switcher, then account actions, the wallet
 * balance and the signed-in user on the right. For Commmerce products only, not for apps.
 *
 * The bar adapts to its own width: under 900px the actions hide; under 640px the balance hides too and the user pill shrinks to the avatar; put those
 * destinations in the Mobile menu instead.
 * @element cm-header-bar
 * @slot logo - The product logo (an `<img>` or `<svg>`), linked to the dashboard if you wrap it in `<a>`.
 * @slot actions - Buttons such as "Hire an Expert" (secondary) and "My Subscription" (primary).
 * @slot end - Anything after the user pill, e.g. a notifications button.
 * @fires cm-store-switch - When the store switcher is pressed. Open your store list in response.
 * @fires cm-wallet - When the wallet balance is pressed.
 * @fires cm-account - When the user pill is pressed. Open the account menu in response.
 */
export class CmHeaderBar extends CmLocalizedElement {
  static properties = {
    store: {},
    balance: {},
    userName: { attribute: 'user-name' },
    avatarSrc: { attribute: 'avatar-src' },
    label: { string: 'label' },
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

  static styles = [
    base,
    css`
      :host { display: block; background: var(--cm-bg-surface); container-type: inline-size; }
      header {
        display: flex; align-items: center; gap: var(--cm-space-20); min-height: 70px; padding-block: 10px; padding-inline: 27px var(--cm-space-20);
      }
      .logo { display: flex; align-items: center; flex: none; }
      ::slotted([slot='logo']) { display: block; max-height: 24px; width: auto; }
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
      }
    `,
  ];

  #fire(name: string) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true }));
  }

  render() {
    return html`
      <header part="bar" role="banner" aria-label=${this.label || nothing}>
        <div class="logo"><slot name="logo"></slot></div>
        ${this.store ? html`<button type="button" class="store" part="store" aria-haspopup="true" aria-label=${this.t('store', { store: this.store })}
            @click=${() => this.#fire('cm-store-switch')}><span>${this.store}</span><cm-icon name="chevron-down" size="20"></cm-icon></button>` : nothing}
        <span class="grow"></span>
        <div class="end">
          <div class="actions"><slot name="actions"></slot></div>
          ${this.balance ? html`<button type="button" class="pill" part="balance" aria-label=${this.t('balance', { balance: this.balance })}
              @click=${() => this.#fire('cm-wallet')}>${this.balance}</button>` : nothing}
          ${this.userName ? html`<button type="button" class="user" part="user" aria-haspopup="true" aria-label=${this.t('account', { name: this.userName })}
              @click=${() => this.#fire('cm-account')}><span class="name">${this.userName}</span>
              <cm-avatar class="avatar" name=${this.userName} src=${this.avatarSrc} decorative></cm-avatar></button>` : nothing}
          <slot name="end"></slot>
        </div>
      </header>
    `;
  }
}
define('cm-header-bar', CmHeaderBar);

declare global { interface HTMLElementTagNameMap { 'cm-header-bar': CmHeaderBar } }
