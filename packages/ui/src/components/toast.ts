import { html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings, translate } from '../localize.js';
import './icon.js';

export type ToastTone = 'default' | 'critical';
export type ToastDismissReason = 'timeout' | 'close' | 'action';
/** How a toast closed, as `closed` resolves: a dismiss reason, or `removed` when it left the page while open. */
export type ToastCloseReason = ToastDismissReason | 'removed';

const regionStrings = defineStrings('toastRegion', {
  /** Accessible name of the toast region (a live region). */
  label: 'Notifications',
});
const toastStrings = defineStrings('toast', {
  /** Label of the action that `undoable()` adds. */
  undo: 'Undo',
  /** Read after a toast that has an action, in a toast region: how to reach it from the keyboard. Empty: not read. */
  shortcut: 'Press F6 to reach it.',
});
declare module '../localize.js' { interface CmStrings { toastRegion: typeof regionStrings; toast: typeof toastStrings } }

/** The focused element, looking inside shadow roots. */
const deepActive = (): HTMLElement | null => {
  let a = document.activeElement as HTMLElement | null;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement as HTMLElement;
  return a && a !== document.body ? a : null;
};
/** Whether `node` is `host` or inside it, crossing shadow roots. */
const within = (host: Element, node: Node | null): boolean => {
  for (let n: Node | null = node; n; n = n.parentNode ?? (n as ShadowRoot).host ?? null) if (n === host) return true;
  return false;
};

const MIN = 2000;
const MAX = 10000;
/** How long a new live region gets before its first message, so screen readers register it (ms). */
const LIVE_REGION_DELAY = 150;

/**
 * A short confirmation that appears at the bottom of the screen and goes away on its own ("Product saved").
 * Usually shown with `showToast()`, which puts it in the page's toast region so screen readers announce it.
 * Hovering or focusing it pauses the timer. In a toast region, F6 moves focus to the newest toast's action and back.
 * `closed` resolves with how it closed, so code can wait for an Undo (or for the toast to go).
 * @element cm-toast
 * @slot - The message, if not given with `message`.
 * @fires cm-action - The action button was pressed (cancelable; by default the toast then closes).
 * @fires cm-dismiss - The toast is closing: `detail.reason` is `timeout`, `close` or `action` (cancelable; keeps it open).
 */
export class CmToast extends CmLocalizedElement {
  static properties = {
    message: {},
    tone: { reflect: true },
    duration: { type: Number },
    actionLabel: { attribute: 'action-label' },
    open: { type: Boolean, reflect: true },
    _inRegion: { state: true },
    _primed: { state: true },
  };

  /** The text: one short sentence, up to about 50 characters. */
  message = '';
  /** `critical` for failures. Never the only place an error is shown: also say it next to what failed. */
  tone: ToastTone = 'default';
  /** How long it stays, in ms: 2000–10000. Default 5000, or 10000 when it has an action. */
  duration?: number;
  /** Label of one optional action ("Undo", "View"). The toast stays 10 seconds when it has one. */
  actionLabel = '';
  /** Whether it is showing. Set it to show the toast again; it is cleared when the toast closes. */
  open = true;
  /** @internal */
  _inRegion = false;
  /** Alone, the toast's live region must exist before its text, or screen readers skip the first message. */
  _primed = false;
  #primeTimer?: ReturnType<typeof setTimeout>;

  #timer?: ReturnType<typeof setTimeout>;
  #remaining = 0;
  #startedAt = 0;
  #hovered = false;
  #focused = false;
  #closed?: Promise<ToastCloseReason>;
  #settle?: (reason: ToastCloseReason) => void;
  #reason?: ToastCloseReason;

  /**
   * Resolves when the toast closes (this time it is shown), with the reason: `action` (its action was pressed),
   * `close` (Dismiss, Esc or `open = false`), `timeout`, or `removed` (taken off the page while open, e.g. pushed out by newer toasts).
   */
  get closed(): Promise<ToastCloseReason> {
    if (!this.#closed) {
      if (!this.open && this.#reason) return Promise.resolve(this.#reason);
      this.#closed = new Promise((resolve) => { this.#settle = resolve; });
    }
    return this.#closed;
  }

  #finish(reason: ToastCloseReason) {
    this.#reason = reason;
    const settle = this.#settle;
    this.#closed = this.#settle = undefined;
    settle?.(reason);
  }

  static styles = [
    base,
    css`
      :host { display: block; pointer-events: auto; }
      :host(:not([open])) { display: none; }
      .toast {
        display: flex; align-items: center; gap: var(--cm-space-12);
        min-block-size: 48px; max-inline-size: min(480px, calc(100vw - 32px));
        padding-block: var(--cm-space-8); padding-inline: var(--cm-space-20) var(--cm-space-8);
        border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-lg);
        background: var(--cm-bg-dashboard); color: var(--cm-text-on-dark);
        outline: 1px solid var(--cm-nav-divider); font-size: 14px; line-height: 20px;
      }
      :host([tone='critical']) .toast { background: var(--cm-bg-error-bar); color: var(--cm-text-default); outline-color: var(--cm-border-critical); }
      .icon { flex: none; color: var(--cm-icon-critical); }
      .message { flex: 1; min-inline-size: 0; padding-block: 4px; }
      button {
        flex: none; display: inline-flex; align-items: center; justify-content: center; min-block-size: 32px;
        padding: 0 var(--cm-space-8); border: 0; border-radius: var(--cm-radius-sm); background: none;
        color: inherit; font: inherit; font-weight: 600; cursor: pointer;
      }
      .action { text-decoration: underline; text-underline-offset: 3px; }
      .close { inline-size: 32px; padding: 0; }
      /* Slim (32) inside the toast; on touch screens drawn 40 with a 44px hit area (owner standard 1.6). */
      @media (pointer: coarse) {
        button { position: relative; min-block-size: var(--cm-control-height-lg, 40px); }
        .close { inline-size: var(--cm-control-height-lg, 40px); }
        button::after { content: ''; position: absolute; inset: -2px; }
      }
      .hint { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      button:hover { background: color-mix(in srgb, var(--cm-text-on-dark) 14%, transparent); }
      :host([tone='critical']) button:hover { background: var(--cm-bg-hover); }
      button:focus-visible { outline: 2px solid var(--cm-text-on-dark); outline-offset: 1px; }
      :host([tone='critical']) button:focus-visible { outline-color: var(--cm-border-strong); }
    `,
  ];

  /** The time the toast stays, clamped to 2000–10000 ms. */
  get effectiveDuration(): number {
    const d = this.duration ?? (this.actionLabel ? MAX : 5000);
    return Math.min(MAX, Math.max(MIN, Number(d) || 5000));
  }

  connectedCallback() {
    super.connectedCallback();
    this._inRegion = !!this.parentElement?.closest('cm-toast-region');
    if (!this._inRegion && !this._primed) this.#primeTimer = setTimeout(() => { this._primed = true; }, LIVE_REGION_DELAY);
    this.addEventListener('pointerenter', this.#onEnter);
    this.addEventListener('pointerleave', this.#onLeave);
    this.addEventListener('focusin', this.#onFocusIn);
    this.addEventListener('focusout', this.#onFocusOut);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Taken off the page while showing (not just moved): whoever waits on `closed` hears about it.
    if (this.open && this.#settle) queueMicrotask(() => { if (!this.isConnected && this.open) this.#finish('removed'); });
    clearTimeout(this.#timer);
    clearTimeout(this.#primeTimer);
    this.removeEventListener('pointerenter', this.#onEnter);
    this.removeEventListener('pointerleave', this.#onLeave);
    this.removeEventListener('focusin', this.#onFocusIn);
    this.removeEventListener('focusout', this.#onFocusOut);
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('open') && changed.get('open') !== undefined) {
      if (this.open) this.#reason = undefined;
      else if (this.#settle) this.#finish('close');
    }
    if (changed.has('open') || changed.has('duration') || changed.has('actionLabel') || changed.has('_primed') || changed.has('_inRegion')) {
      clearTimeout(this.#timer);
      // The time on screen starts when the message is shown.
      if (this.open && (this._inRegion || this._primed)) { this.#remaining = this.effectiveDuration; this.#resume(); }
    }
  }

  /** Shows the toast again and restarts its timer. */
  show() { if (this.open) { this.#remaining = this.effectiveDuration; this.#resume(); } else this.open = true; }

  /** Closes the toast, as if the close button were pressed. Returns false if a listener kept it open. */
  dismiss(reason: ToastDismissReason = 'close'): boolean {
    const ev = new CustomEvent('cm-dismiss', { bubbles: true, composed: true, cancelable: true, detail: { reason } });
    if (!this.dispatchEvent(ev)) { if (reason === 'timeout') { this.#remaining = this.effectiveDuration; this.#resume(); } return false; }
    clearTimeout(this.#timer);
    this.open = false;
    this.#finish(reason);
    return true;
  }

  get #paused() { return this.#hovered || this.#focused; }

  #resume() {
    clearTimeout(this.#timer);
    if (!this.open || this.#paused) return;
    this.#startedAt = Date.now();
    this.#timer = setTimeout(() => this.dismiss('timeout'), this.#remaining);
  }

  #pause() {
    if (this.#timer === undefined) return;
    clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#remaining = Math.max(1000, this.#remaining - (Date.now() - this.#startedAt));
  }

  #onEnter = () => { this.#hovered = true; this.#pause(); };
  #onLeave = () => { this.#hovered = false; this.#resume(); };
  #onFocusIn = () => { this.#focused = true; this.#pause(); };
  #onFocusOut = (e: FocusEvent) => {
    if (e.relatedTarget instanceof Node && this.contains(e.relatedTarget)) return;
    if (e.relatedTarget instanceof Node && this.shadowRoot?.contains(e.relatedTarget)) return;
    this.#focused = false; this.#resume();
  };

  #action() {
    const ev = new CustomEvent('cm-action', { bubbles: true, composed: true, cancelable: true });
    if (this.dispatchEvent(ev)) this.dismiss('action');
  }

  render() {
    const body = html`<div class="toast" part="toast">
      ${this.tone === 'critical' ? html`<cm-icon class="icon" name="alert" size="20"></cm-icon>` : nothing}
      <div class="message" part="message">${this.message}<slot></slot></div>
      ${this.actionLabel ? html`<button class="action" part="action" aria-keyshortcuts=${this._inRegion ? 'F6' : nothing} @click=${this.#action}>${this.actionLabel}</button>` : nothing}
      <button class="close" part="close" aria-label=${this.t('dismiss')} @click=${() => this.dismiss('close')}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
      </button>
      ${this.actionLabel && this._inRegion && this.t('shortcut') ? html`<span class="hint">${this.t('shortcut')}</span>` : nothing}
    </div>`;
    // Inside a toast region the region is the live region; alone, the toast carries its own.
    return this._inRegion ? body : html`<div role="status" aria-live="polite" aria-atomic="false">${this.open && this._primed ? body : nothing}</div>`;
  }
}
define('cm-toast', CmToast);

/**
 * The page's toast area: bottom centre, above everything, a polite live region so new toasts are announced.
 * `showToast()` creates one when needed; add it yourself only to change where toasts appear.
 * Keyboard: F6 (or Shift+F6) moves focus to the newest toast with an action (else the newest toast) and, pressed
 * again, back to where it was; Esc closes the focused toast. When a focused toast closes, focus goes back too.
 * @element cm-toast-region
 * @slot - `cm-toast` elements. Closed toasts are removed.
 */
export class CmToastRegion extends CmLocalizedElement {
  static properties = { max: { type: Number } };
  /** Most toasts shown at once. When a new one would exceed it, the oldest is removed. Default 3. */
  max = 3;

  static styles = [
    base,
    css`
      :host {
        position: fixed; inset-block-end: var(--cm-space-20); inset-inline: 0; z-index: 1000;
        display: flex; flex-direction: column; align-items: center; gap: var(--cm-space-8);
        padding-inline: var(--cm-space-12); pointer-events: none;
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', 'status');
    this.setAttribute('aria-live', 'polite');
    // Read each new toast on its own, not every toast still on screen.
    this.setAttribute('aria-atomic', 'false');
    if (!this.hasAttribute('aria-label')) { this.setAttribute('aria-label', this.t('label')); this.#ownLabel = true; }
    this.addEventListener('cm-dismiss', this.#onDismiss);
    this.addEventListener('focusin', this.#onFocusIn);
    this.addEventListener('keydown', this.#onKeyDown);
    document.addEventListener('keydown', this.#onDocKeyDown);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('cm-dismiss', this.#onDismiss);
    this.removeEventListener('focusin', this.#onFocusIn);
    this.removeEventListener('keydown', this.#onKeyDown);
    document.removeEventListener('keydown', this.#onDocKeyDown);
  }
  /** Where focus was before it moved into a toast, to go back to. */
  #returnTo: HTMLElement | null = null;
  /** The region names itself (unless the page set `aria-label`): keep that name in the current language. */
  #ownLabel = false;
  updated() { if (this.#ownLabel) this.setAttribute('aria-label', this.t('label')); }

  #onDismiss = (e: Event) => {
    const t = e.target as CmToast;
    // Remove after the toast has handled the event (and only if nobody cancelled it).
    queueMicrotask(() => {
      if (t.localName !== 'cm-toast' || t.open) return;
      const hadFocus = t.matches(':focus-within');
      t.remove();
      if (hadFocus) this.#giveFocusBack();
    });
  };

  #onFocusIn = (e: FocusEvent) => {
    const from = e.relatedTarget as HTMLElement | null;
    if (from && !within(this, from)) this.#returnTo = from;
  };

  #onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented) return;
    const t = e.composedPath().find((n) => (n as Element).localName === 'cm-toast') as CmToast | undefined;
    if (t && t.parentElement === this) { e.preventDefault(); t.dismiss('close'); }
  };

  #onDocKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'F6' || e.altKey || e.ctrlKey || e.metaKey || e.defaultPrevented) return;
    const moved = this.matches(':focus-within') ? this.#giveFocusBack() : this.focusToast();
    if (moved) e.preventDefault();
  };

  /** Focus where it was before it moved into a toast. */
  #giveFocusBack(): boolean {
    const to = this.#returnTo;
    this.#returnTo = null;
    if (!to?.isConnected) return false;
    to.focus();
    // A component host that doesn't pass focus on: focus the first focusable thing inside it.
    if (!within(to, deepActive())) to.shadowRoot?.querySelector<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')?.focus();
    return true;
  }

  /**
   * Moves focus to the newest open toast with an action (else the newest toast): its action, or its Dismiss button.
   * F6 does this; call it to offer another shortcut. Returns false when there is no toast to focus.
   */
  focusToast(): boolean {
    const open = [...this.querySelectorAll<CmToast>(':scope > cm-toast[open]')].reverse();
    const t = open.find((x) => x.actionLabel) ?? open[0];
    const target = t?.shadowRoot?.querySelector<HTMLElement>('.action') ?? t?.shadowRoot?.querySelector<HTMLElement>('.close');
    if (!target) return false;
    const from = deepActive();
    if (from && !within(this, from)) this.#returnTo = from;
    target.focus();
    return true;
  }

  /** Adds a toast, removing the oldest ones above `max`. */
  add(toast: CmToast) {
    this.append(toast);
    const all = [...this.querySelectorAll(':scope > cm-toast')];
    const gone = all.slice(0, Math.max(0, all.length - Math.max(1, this.max)));
    const hadFocus = gone.some((t) => t.matches(':focus-within'));
    gone.forEach((t) => t.remove());
    if (hadFocus) this.#giveFocusBack();
    return toast;
  }

  render() { return html`<slot></slot>`; }
}
define('cm-toast-region', CmToastRegion);

export interface ShowToastOptions {
  tone?: ToastTone;
  /** ms, 2000–10000. */
  duration?: number;
  /** One action: its label and what it does. */
  action?: { label: string; onAction: () => void };
  /** Where to put the toast region. Default `document.body`. */
  root?: HTMLElement;
}

/**
 * Shows a toast in the page's toast region (created on first use) and returns it. The message is text, never HTML.
 * The returned toast is the handle: `toast.dismiss()` closes it, and `await toast.closed` gives how it closed
 * (`action`, `timeout`, `close` or `removed`).
 * @example showToast('Product saved'); showToast('Order archived', { action: { label: 'Undo', onAction: undo } });
 */
export function showToast(message: string, options: ShowToastOptions = {}): CmToast {
  const root = options.root ?? document.body;
  let region = root.querySelector<CmToastRegion>(':scope > cm-toast-region');
  const fresh = !region;
  if (!region) { region = document.createElement('cm-toast-region') as CmToastRegion; root.append(region); }
  const toast = document.createElement('cm-toast') as CmToast;
  toast.message = String(message);
  if (options.tone) toast.tone = options.tone;
  if (options.duration !== undefined) toast.duration = options.duration;
  if (options.action) {
    toast.actionLabel = options.action.label;
    const run = options.action.onAction;
    toast.addEventListener('cm-action', () => run());
  }
  // A live region added in the same moment as its text is not announced: give a new region time to register.
  if (fresh) { const r = region; setTimeout(() => r.add(toast), LIVE_REGION_DELAY); return toast; }
  return region.add(toast);
}

export interface UndoableOptions extends Omit<ShowToastOptions, 'action'> {
  /** What just happened, in the past tense: "Lead archived". */
  message: string;
  /** Label of the action. Default: the built-in string `toast.undo` ("Undo"). */
  undoLabel?: string;
}

/**
 * Undo instead of confirm: runs `doIt` at once, then shows `message` in a toast with Undo, and runs `undoIt` if Undo
 * is pressed. Resolves with how the toast closed once that is known (`action` only after `undoIt` has finished), so
 * a caller can, say, really delete a record only on `timeout`. If `doIt` throws, no toast is shown and the promise rejects.
 * @example await undoable(() => api.archive(lead), () => api.unarchive(lead), { message: 'Lead archived' });
 */
export async function undoable(doIt: () => unknown, undoIt: () => unknown, options: UndoableOptions): Promise<ToastCloseReason> {
  await doIt();
  const { message, undoLabel, ...rest } = options;
  const label = undoLabel ?? translate('toast', 'undo', undefined, rest.root ?? document.body);
  const reason = await showToast(message, { ...rest, action: { label, onAction: () => {} } }).closed;
  if (reason === 'action') await undoIt();
  return reason;
}

declare global { interface HTMLElementTagNameMap { 'cm-toast': CmToast; 'cm-toast-region': CmToastRegion } }
