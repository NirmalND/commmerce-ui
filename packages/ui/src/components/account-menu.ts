import { html, css, nothing } from 'lit';
import { define } from '../base.js';
import { defineStrings } from '../localize.js';
import { CmActionMenu } from './action-menu.js';
import './avatar.js';
import './icon.js';

const strings = defineStrings('accountMenu', {
  /** Accessible name of the avatar button. {name} is the signed-in person. */
  trigger: 'Account: {name}',
});
declare module '../localize.js' { interface CmStrings { accountMenu: typeof strings } }

/**
 * The signed-in person's menu at the end of a Commmerce product's header bar (since 1.9.2): a round avatar button that
 * opens a panel with who is signed in (avatar, name, role and place), the business or store they're working in (its
 * logo, name, kind and plan), then the choices: `cm-menu-item`s such as Settings, Lock screen and Log out. The panel
 * is the action menu's: keyboard, outside click and Escape behave the same, and it opens in the top layer, aligned
 * to the avatar's end edge. Put it in `cm-header-bar`'s `account` slot, so it is always last in the bar.
 * For Commmerce products only, not for apps.
 * @element cm-account-menu
 * @slot - `cm-menu-item` elements (and `cm-menu-item divider`).
 * @slot org-logo - The business's logo (an `<img>`, 40px round). Without it, a store icon on the brand tone is shown.
 * @fires cm-select - When a choice is picked (as on `cm-action-menu`).
 * @csspart trigger - The avatar button.
 * @csspart profile - The signed-in person's row.
 * @csspart org - The business row.
 */
export class CmAccountMenu extends CmActionMenu {
  static properties = {
    ...CmActionMenu.properties,
    name: {},
    avatarSrc: { attribute: 'avatar-src' },
    meta: {},
    profileHref: { attribute: 'profile-href' },
    orgName: { attribute: 'org-name' },
    orgMeta: { attribute: 'org-meta' },
    orgHref: { attribute: 'org-href' },
    plan: {},
  };

  /** The signed-in person's name. Their initials show when there is no `avatar-src`. */
  name = '';
  /** Their photo. */
  avatarSrc = '';
  /** One line under the name: role and place ("Owner · Bangalore"). */
  meta = '';
  /** Their profile page; makes the row a link with a chevron. */
  profileHref = '';
  /** The business or store they're working in ("Bangalore"). Empty hides the business row. */
  orgName = '';
  /** One line under it ("POS store"). */
  orgMeta = '';
  /** The business's page or switcher; makes the row a link with a chevron. */
  orgHref = '';
  /** The plan, shown under the business with a check ("POS Standard"). */
  plan = '';

  constructor() {
    super();
    this.align = 'end';
  }

  static styles = [
    ...CmActionMenu.styles,
    css`
      /* The avatar button: 36px round with a ring (40 and a 44px hit area on touch screens). */
      .trigger.account {
        position: relative; width: var(--cm-control-height-md, 36px); height: var(--cm-control-height-md, 36px); min-height: 0; padding: 2px;
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-full); background: var(--cm-bg-surface);
      }
      .trigger.account:hover { background: var(--cm-bg-hover); }
      .trigger.account cm-avatar { --cm-avatar-size: 28px; } /* 36 less the 2px gap and 1px ring on each side */
      @media (pointer: coarse) {
        .trigger.account { width: var(--cm-control-height-lg, 40px); height: var(--cm-control-height-lg, 40px); }
        .trigger.account cm-avatar { --cm-avatar-size: 32px; }
        .trigger.account::after { content: ''; position: absolute; inset: -3px; }
      }
      .pop { width: min(320px, calc(100vw - 32px)); }
      .acct { display: flex; flex-direction: column; padding: var(--cm-space-4) 0; margin-bottom: var(--cm-space-4); border-bottom: var(--cm-border-1) solid var(--cm-border-subtle); }
      .row {
        display: flex; align-items: center; gap: var(--cm-space-12); padding: var(--cm-space-8) var(--cm-space-12); border-radius: var(--cm-radius-sm);
        color: var(--cm-text-default); text-decoration: none;
      }
      a.row:hover { background: var(--cm-bg-hover); }
      a.row:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; }
      .ring { flex: none; display: grid; place-items: center; width: 40px; height: 40px; box-sizing: border-box; padding: 2px; border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-full); }
      .ring cm-avatar { --cm-avatar-size: 34px; }
      .logo { flex: none; display: grid; place-items: center; width: 40px; height: 40px; overflow: hidden; border-radius: var(--cm-radius-full); background: var(--cm-bg-brand, var(--cm-action-primary)); color: var(--cm-text-on-brand, var(--cm-action-primary-text)); }
      ::slotted([slot='org-logo']) { width: 40px; height: 40px; object-fit: cover; }
      .who { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .who strong { font-size: var(--cm-font-size-16); line-height: var(--cm-line-height-16); font-weight: 500; overflow-wrap: anywhere; }
      .who span { font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); color: var(--cm-text-tertiary); overflow-wrap: anywhere; }
      .chev { flex: none; color: var(--cm-icon-default); }
      .plan { display: flex; align-items: center; gap: var(--cm-space-8); padding: 0 var(--cm-space-12) var(--cm-space-8); font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); color: var(--cm-text-tertiary); }
      .plan cm-icon { color: var(--cm-text-success); }
      .split { height: 0; margin: var(--cm-space-4) var(--cm-space-12); border-top: var(--cm-border-1) solid var(--cm-border-subtle); }
      :host(:dir(rtl)) .chev { transform: scaleX(-1); }
    `,
  ];

  protected triggerTemplate(click: (e: Event) => void, key: (e: KeyboardEvent) => void) {
    return html`<button type="button" class="trigger account" part="trigger" aria-haspopup="menu" aria-expanded=${String(this.open)}
      aria-label=${this.t('trigger', { name: this.name })} ?disabled=${this.disabled} @click=${click} @keydown=${key}>
      <cm-avatar name=${this.name} src=${this.avatarSrc || nothing} decorative></cm-avatar></button>`;
  }

  protected headTemplate() {
    const row = (href: string, part: string, lead: unknown, title: string, sub: string) => {
      const inner = html`${lead}<span class="who"><strong>${title}</strong>${sub ? html`<span>${sub}</span>` : nothing}</span>${href
        ? html`<cm-icon class="chev" name="chevron-right" size="16"></cm-icon>` : nothing}`;
      return href ? html`<a class="row" part=${part} href=${href}>${inner}</a>` : html`<div class="row" part=${part}>${inner}</div>`;
    };
    return html`<div class="acct">
      ${row(this.profileHref, 'profile', html`<span class="ring"><cm-avatar name=${this.name} src=${this.avatarSrc || nothing} decorative></cm-avatar></span>`, this.name, this.meta)}
      ${this.orgName ? html`<div class="split"></div>
        ${row(this.orgHref, 'org', html`<span class="logo"><slot name="org-logo"><cm-icon name="store" size="20"></cm-icon></slot></span>`, this.orgName, this.orgMeta)}
        ${this.plan ? html`<div class="plan"><cm-icon name="check-circle" size="16"></cm-icon>${this.plan}</div>` : nothing}` : nothing}
    </div>`;
  }
}
define('cm-account-menu', CmAccountMenu);

declare global { interface HTMLElementTagNameMap { 'cm-account-menu': CmAccountMenu } }
