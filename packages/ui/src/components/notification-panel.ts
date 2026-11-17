import { LitElement, html, css, nothing } from 'lit';
import { define, type Tone } from '../base.js';
import { CmOverlay } from '../overlay.js';
import { defineStrings } from '../localize.js';
import './icon.js';
import './skeleton.js';

/** One notification in `cm-notification-panel`. */
export interface NotificationItem {
  /** What happened: "New order received". */
  label: string;
  /** A second line under the label, in smaller grey text: "Follow-up due at 4 pm". */
  description?: string;
  /** Icon name from `@commmerce/icons` for the kind of notification ("user", "clock"). Shown in the tone's colours instead of the tone's own icon. */
  icon?: string;
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
  /** The header button that marks every notification read (`mark-all-read`). */
  markAllRead: 'Mark all read',
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
    description: { reflect: true },
    icon: { reflect: true },
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
  /** A second line under the label, in smaller grey text: "Follow-up due at 4 pm". */
  description = '';
  /** Icon name from `@commmerce/icons` for the kind ("user", "clock"), shown in the tone's colours instead of the tone's icon. */
  icon = '';
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
 * @slot footer - A control under the list, such as a toggle for push notifications on this device.
 * @fires cm-select - When a notification is chosen. `detail: { value, item }`. Cancelable: `preventDefault()` stops a link, to route in your app.
 * @fires cm-open - After the panel opens.
 * @fires cm-close - Before it closes. `detail: { reason }`. Cancelable.
 * @fires cm-closed - After it has closed.
 * @fires cm-mark-all-read - When "Mark all read" is pressed (`mark-all-read`). Clear `unread` on your notifications in response; the button hides when none are unread.
 */
export class CmNotificationPanel extends CmOverlay {
  static properties = {
    ...CmOverlay.properties,
    items: { type: Array },
    moreHref: { attribute: 'more-href' },
    heading: { string: 'heading' },
    moreLabel: { attribute: 'more-label', string: 'more' },
    emptyText: { attribute: 'empty-text', string: 'empty' },
    markAllRead: { type: Boolean, attribute: 'mark-all-read' },
    markAllLabel: { attribute: 'mark-all-label', string: 'markAllRead' },
    loading: { type: Boolean, reflect: true },
    _slotted: { state: true },
    _footer: { state: true },
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
  /** Shows a "Mark all read" button in the header while at least one notification is unread. Pressing it fires `cm-mark-all-read`. */
  markAllRead = false;
  /** Text of that button. Default: the built-in string `markAllRead` ("Mark all read"). */
  markAllLabel!: string;
  /** Shows placeholder rows while you fetch the notifications, and announces "Loading" politely. */
  loading = false;
  _slotted: NotificationItem[] = [];
  _footer = false;
  #observer?: MutationObserver;

  static styles = [
    ...CmOverlay.overlayStyles,
    css`
      dialog {
        position: fixed; inset-block: var(--cm-notification-panel-top, 64px) auto; inset-inline: auto var(--cm-notification-panel-end, 20px);
        width: min(380px, calc(100vw - 32px));
      }
      .panel { max-height: calc(100dvh - var(--cm-notification-panel-top, 64px) - 16px); border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-md); }
      .list { flex: 1 1 auto; min-height: 0; overflow: auto; margin: 0; padding: 0; list-style: none; }
      .list li:nth-child(even) .row { background: var(--cm-bg-hover); }
      .row {
        display: flex; align-items: center; gap: var(--cm-space-8); width: 100%; min-height: 40px; padding: var(--cm-space-8) var(--cm-space-12);
        font: inherit; font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); color: var(--cm-text-default); text-align: start; text-decoration: none;
        background: var(--cm-bg-surface); border: 0; cursor: pointer;
      }
      .row:hover { text-decoration: underline; }
      .row:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: -2px; }
      .ic { display: grid; place-items: center; flex: none; width: 24px; height: 24px; border-radius: var(--cm-radius-sm); }
      .information { background: var(--cm-bg-information-soft); color: var(--cm-text-information); }
      .attention { background: var(--cm-bg-attention); color: var(--cm-text-attention); }
      .success { background: var(--cm-bg-success-soft); color: var(--cm-text-success); }
      .critical { background: var(--cm-bg-critical); color: var(--cm-text-critical); }
      .label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
      .unread .label { font-weight: 600; }
      .desc { display: block; font-weight: 400; font-size: 12px; line-height: 16px; color: var(--cm-text-tertiary); }
      .row:has(.desc) { align-items: flex-start; }
      .row:has(.desc) .ic, .row:has(.desc) time { margin-block-start: 1px; }
      .mark {
        flex: none; padding: var(--cm-space-4) var(--cm-space-8); border: 0; border-radius: var(--cm-radius-sm); background: none; color: inherit;
        font: inherit; font-size: 12px; line-height: 16px; text-decoration: underline; cursor: pointer;
      }
      .mark:hover { text-decoration-thickness: 2px; }
      .mark:focus-visible { outline: 2px solid var(--cm-text-on-dark); outline-offset: 0; }
      .loading { flex: 1 1 auto; min-height: 0; margin: 0; padding: 0; list-style: none; }
      .loading li { display: flex; align-items: center; gap: var(--cm-space-8); min-height: 40px; padding: var(--cm-space-8) var(--cm-space-12); }
      .loading li:nth-child(even) { background: var(--cm-bg-hover); }
      .loading .sk-ic { flex: none; width: 24px; }
      .loading .sk-text { flex: 1; }
      .footer { flex: none; padding: var(--cm-space-8) var(--cm-space-12); font-size: 13px; border-top: var(--cm-border-1) solid var(--cm-border-subtle); }
      .footer[hidden] { display: none; }
      time { flex: none; font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); color: var(--cm-text-tertiary); font-variant-numeric: tabular-nums; }
      .vh { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      .more {
        display: block; flex: none; padding: var(--cm-space-12); font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); text-align: center;
 color: var(--cm-text-default);
        border-top: var(--cm-border-1) solid var(--cm-border-subtle);
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
        unread: c.hasAttribute('unread') || undefined, value: a('value'), description: a('description'), icon: a('icon'),
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
    const label = it.description
      ? html`<span class="title">${it.label}</span><span class="vh">, </span><span class="desc">${it.description}</span>`
      : it.label;
    const inner = html`<span class="ic ${tone}" aria-hidden="true"><cm-icon name=${it.icon || ICONS[tone] || 'bell'} size="14"></cm-icon></span>
      <span class="label">${it.unread ? html`<span class="vh">${this.t('unread')}</span>` : nothing}${label}</span>
      ${it.time ? html`<time>${it.time}</time>` : nothing}`;
    const cls = `row${it.unread ? ' unread' : ''}`;
    return it.href
      ? html`<a class=${cls} part="row" href=${it.href} @click=${(e: Event) => this.#choose(e, it)}>${inner}</a>`
      : html`<button type="button" class=${cls} part="row" @click=${(e: Event) => this.#choose(e, it)}>${inner}</button>`;
  }

  async #markAll(e: Event) {
    const btn = e.currentTarget as HTMLElement;
    this.dispatchEvent(new CustomEvent('cm-mark-all-read', { bubbles: true, composed: true }));
    // The app clears `unread`, which removes the button: keep focus in the panel rather than losing it.
    await new Promise((r) => setTimeout(r));
    await this.updateComplete;
    if (!btn.isConnected && this.open) this.renderRoot.querySelector<HTMLElement>('.panel')?.focus();
  }

  #onFooter(e: Event) {
    this._footer = (e.target as HTMLSlotElement).assignedNodes({ flatten: true })
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim());
  }

  render() {
    const list = this.notifications;
    const markAll = this.markAllRead && !this.loading && list.some((it) => it.unread)
      ? html`<button type="button" class="mark" part="mark-all-read" @click=${this.#markAll}>${this.markAllLabel}</button>`
      : nothing;
    const body = this.loading
      ? html`<ul class="loading" part="list" aria-hidden="true">${[0, 1, 2].map(() => html`<li>
          <cm-skeleton class="sk-ic" variant="block" style="--cm-skeleton-height:22px"></cm-skeleton><cm-skeleton class="sk-text"></cm-skeleton></li>`)}</ul>`
      : list.length
        ? html`<ul class="list" part="list">${list.map((it) => html`<li>${this.#row(it)}</li>`)}</ul>`
        : html`<p class="empty">${this.emptyText}</p>`;
    return this.renderDialog(html`<div class="panel" part="panel" tabindex="-1">
      ${this.renderHeader(markAll)}
      ${body}
      <span class="vh" role="status">${this.loading ? this.t('loading') : ''}</span>
      ${this.moreHref ? html`<a class="more" part="more" href=${this.moreHref}>${this.moreLabel}</a>` : nothing}
      <div class="footer" part="footer" ?hidden=${!this._footer}><slot name="footer" @slotchange=${this.#onFooter}></slot></div>
      <slot hidden></slot>
    </div>`);
  }
}
define('cm-notification-panel', CmNotificationPanel);

declare global {
  interface HTMLElementTagNameMap { 'cm-notification-panel': CmNotificationPanel; 'cm-notification-item': CmNotificationItem }
}
