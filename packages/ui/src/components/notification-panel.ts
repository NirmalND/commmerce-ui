import { LitElement, html, css, nothing } from 'lit';
import { define, type Tone } from '../base.js';
import { CmOverlay } from '../overlay.js';
import { defineStrings } from '../localize.js';
import './icon.js';

/** One notification in `cm-notification-panel`. */
export interface NotificationItem {
  /** What happened: "New order received". */
  label: string;
  /** When, as shown: "1 min ago". */
  time?: string;
  /** Colour and icon: `information` (default), `attention`, `success` or `critical`. */
  tone?: Tone;
  /** Where the notification leads. */
  href?: string;
  /** Not read yet: the label is bold and "Unread" is read out. */
  unread?: boolean;
  /** Identifies it in `cm-select`. Defaults to the href, then the label. */
  value?: string;
}

const strings = defineStrings('notificationPanel', {
  /** Title in the header. */
  heading: 'Notifications',
  /** Text of the link to all notifications. */
  more: 'See more notifications',
  /** Shown when there are no notifications. */
  empty: 'No notifications yet.',
  /** Read before an unread notification. */
  unread: 'Unread: ',
});
declare module '../localize.js' { interface CmStrings { notificationPanel: typeof strings } }

const ICONS: Record<Tone, string> = { information: 'bag', attention: 'alert', success: 'check-circle', critical: 'x-circle' };

/**
 * A notification in markup, read by `cm-notification-panel`. Its text is the label. Renders nothing itself.
 * @element cm-notification-item
 */
export class CmNotificationItem extends LitElement {
  static properties = {
    time: { reflect: true },
    tone: { reflect: true },
    href: { reflect: true },
    unread: { type: Boolean, reflect: true },
    value: { reflect: true },
  };
  /** When, as shown: "1 min ago". */
  time = '';
  /** `information` (default), `attention`, `success` or `critical`. */
  tone: Tone = 'information';
  /** Where the notification leads. */
  href = '';
  /** Not read yet. */
  unread = false;
  /** Identifies it in `cm-select`. */
  value = '';
  static styles = css`:host { display: none; }`;
  render() { return null; }
}
define('cm-notification-item', CmNotificationItem);

/**
 * The list of recent notifications, opened from the bell in the header bar: a panel under the top-right corner (top-left in right-to-left pages)
 * of the page with a black "Notifications" header, one row per notification (a coloured icon for its kind,
 * what happened, and when), and "See more notifications" at the bottom. On phones it spans the screen width.
 *
 * A native modal `<dialog>`: the page behind is dimmed and inert, Esc and the backdrop ask to close through
 * `cm-close`, scrolling is locked, and focus returns to the bell.
 * @element cm-notification-panel
 * @slot - `cm-notification-item`s.
 * @fires cm-select - When a notification is chosen. `detail: { value, item }`. Cancelable: `preventDefault()` stops a link, to route in your app.
 * @fires cm-open - After the panel opens.
 * @fires cm-close - Before it closes. `detail: { reason }`. Cancelable.
 * @fires cm-closed - After it has closed.
 */
export class CmNotificationPanel extends CmOverlay {
  static properties = {
    ...CmOverlay.properties,
    items: { type: Array },
    moreHref: { attribute: 'more-href' },
    heading: { string: 'heading' },
    moreLabel: { attribute: 'more-label', string: 'more' },
    emptyText: { attribute: 'empty-text', string: 'empty' },
    _slotted: { state: true },
  };

  /** Title in the header. Default: the built-in string `heading` ("Notifications"). */
  heading!: string;
  /** Notifications as data, used instead of children when set. */
  items: NotificationItem[] = [];
  /** Link to all notifications. Empty hides it. */
  moreHref = '';
  /** Text of that link. Default: the built-in string `more` ("See more notifications"). */
  moreLabel!: string;
  /** Shown when there are no notifications. Default: the built-in string `empty` ("No notifications yet."). */
  emptyText!: string;
  _slotted: NotificationItem[] = [];
  #observer?: MutationObserver;

  static styles = [
    ...CmOverlay.overlayStyles,
    css`
      dialog {
        position: fixed; inset-block: var(--cm-notification-panel-top, 64px) auto; inset-inline: auto var(--cm-notification-panel-end, 20px);
        width: min(380px, calc(100vw - 32px));
      }
      .panel { max-height: calc(100dvh - var(--cm-notification-panel-top, 64px) - 16px); border-radius: var(--cm-radius-sm); box-shadow: var(--cm-shadow-100); }
      .list { flex: 1 1 auto; min-height: 0; overflow: auto; margin: 0; padding: 0; list-style: none; }
      .list li:nth-child(even) .row { background: var(--cm-bg-hover); }
      .row {
        display: flex; align-items: center; gap: var(--cm-space-10); width: 100%; min-height: 40px; padding: 8px var(--cm-space-15);
        font: inherit; font-size: 13px; line-height: 18px; color: var(--cm-text-default); text-align: start; text-decoration: none;
        background: var(--cm-bg-surface); border: 0; cursor: pointer;
      }
      .row:hover { text-decoration: underline; }
      .row:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; }
      .ic { display: grid; place-items: center; flex: none; width: 22px; height: 22px; border-radius: var(--cm-radius-xs); }
      .information { background: var(--cm-bg-information-soft); color: var(--cm-text-information); }
      .attention { background: var(--cm-bg-attention); color: var(--cm-text-attention); }
      .success { background: var(--cm-bg-success-soft); color: var(--cm-text-success); }
      .critical { background: var(--cm-bg-critical); color: var(--cm-text-critical); }
      .label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .unread .label { font-weight: 600; }
      time { flex: none; font-size: 11px; color: var(--cm-text-tertiary); }
      .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      .more {
        display: block; flex: none; padding: 10px; font-size: 12px; text-align: center; color: var(--cm-text-default);
        border-top: var(--cm-border-1) solid var(--cm-border-default);
      }
      .more:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; }
      .empty { margin: 0; padding: var(--cm-space-20); font-size: 13px; text-align: center; color: var(--cm-text-tertiary); }
      @media (max-width: 599px) {
        dialog { inset: var(--cm-notification-panel-top, 56px) 8px auto 8px; width: auto; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#read();
    this.#observer = new MutationObserver(() => this.#read());
    this.#observer.observe(this, { childList: true, subtree: true, attributes: true, characterData: true });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
  }

  #read() {
    this._slotted = Array.from(this.querySelectorAll(':scope > cm-notification-item')).map((c) => {
      const a = (n: string) => c.getAttribute(n) || undefined;
      return {
        label: (c.textContent ?? '').trim(), time: a('time'), tone: (a('tone') as Tone) ?? 'information', href: a('href'),
        unread: c.hasAttribute('unread') || undefined, value: a('value'),
      };
    });
  }

  /** The notifications in use. */
  get notifications(): NotificationItem[] { return this.items.length ? this.items : this._slotted; }

  #choose(e: Event, it: NotificationItem) {
    const ok = this.dispatchEvent(new CustomEvent('cm-select', {
      detail: { value: it.value ?? it.href ?? it.label, item: it }, bubbles: true, composed: true, cancelable: true,
    }));
    if (!ok) { e.preventDefault(); return; }
    this.requestClose('action');
  }

  #row(it: NotificationItem) {
    const tone = it.tone ?? 'information';
    const inner = html`<span class="ic ${tone}" aria-hidden="true"><cm-icon name=${ICONS[tone] ?? 'bell'} size="14"></cm-icon></span>
      <span class="label">${it.unread ? html`<span class="vh">${this.t('unread')}</span>` : nothing}${it.label}</span>
      ${it.time ? html`<time>${it.time}</time>` : nothing}`;
    const cls = `row${it.unread ? ' unread' : ''}`;
    return it.href
      ? html`<a class=${cls} part="row" href=${it.href} @click=${(e: Event) => this.#choose(e, it)}>${inner}</a>`
      : html`<button type="button" class=${cls} part="row" @click=${(e: Event) => this.#choose(e, it)}>${inner}</button>`;
  }

  render() {
    const list = this.notifications;
    return this.renderDialog(html`<div class="panel" part="panel" tabindex="-1">
      ${this.renderHeader()}
      ${list.length
        ? html`<ul class="list" part="list">${list.map((it) => html`<li>${this.#row(it)}</li>`)}</ul>`
        : html`<p class="empty">${this.emptyText}</p>`}
      ${this.moreHref ? html`<a class="more" part="more" href=${this.moreHref}>${this.moreLabel}</a>` : nothing}
      <slot hidden></slot>
    </div>`);
  }
}
define('cm-notification-panel', CmNotificationPanel);

declare global {
  interface HTMLElementTagNameMap { 'cm-notification-panel': CmNotificationPanel; 'cm-notification-item': CmNotificationItem }
}
