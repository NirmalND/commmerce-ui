import {
  PROTOCOL, PROTOCOL_VERSION, AppBridgeError, isMessage, normalizeOrigin, isOriginPattern, parseOriginPattern, matchesOriginPattern,
  type RequestMap, type RequestType, type EventMap, type EventType, type HostInfo, type ToastOptions,
  type ModalOptions, type ModalResult, type SaveBarOptions, type ResourcePickerOptions, type PickedResource,
  type NavigateOptions, type ResponseMessage,
} from './protocol.js';
import { decodeClaims } from './session-token.js';

export interface AppConfig {
  /**
   * The admin's origin, as given in your app settings. Required. Either:
   * - an exact origin, e.g. `https://admin.example.com`; or
   * - a pattern, e.g. `https://*.commmerce.com`, to run inside any Commmerce admin on a subdomain of that domain
   *   (see `matchesOriginPattern` for exactly what matches). The app finds the admin's actual origin
   *   (`location.ancestorOrigins[0]`, or the origin of `document.referrer` in browsers without it), checks it
   *   against the pattern, and throws if it doesn't match or can't be found.
   *
   * Either way the app then talks to ONE concrete origin (`app.hostOrigin`) for the whole session: requests are
   * only ever posted to it (never to `*`), and messages from any other origin are ignored. `*` is refused.
   */
  hostOrigin: string;
  /**
   * With a pattern `hostOrigin` only: the admin's concrete origin, instead of finding it from the page. It must
   * still match the pattern. For tests, or when the admin sends no referrer and the browser has no
   * `location.ancestorOrigins`. If it isn't really the admin's origin, the browser drops every request
   * and `ready` rejects with `timeout`.
   */
  exactHostOrigin?: string;
  /** Your app's API key. Sent to the admin when connecting; it becomes the session token's `aud`. */
  apiKey?: string;
  /** How long to wait for an answer, in ms. Default 10000. Modals and the resource picker wait for the merchant, without a limit. */
  timeout?: number;
  /** The admin window. Default `window.parent`. */
  target?: Window;
  /** Called with the reason whenever a message is ignored (wrong origin, wrong sender, not App Bridge). For logging. */
  onReject?: (reason: string, event: MessageEvent) => void;
}

/** What `createApp()` returns. Every method returns a promise that settles when the admin has acted on it. */
export interface App {
  /** The one admin origin this app talks to: `hostOrigin` itself, or with a pattern, the admin origin it matched. */
  readonly hostOrigin: string;
  /** Settles once the admin has accepted the connection. Every request waits for it. */
  readonly ready: Promise<HostInfo>;
  toast: { show(message: string, options?: ToastOptions): Promise<void> };
  modal: { open(options: ModalOptions): Promise<ModalResult> };
  /** Updates the admin's address to `path` (within your app), so links, reloads and the back button work. */
  navigate(path: string, options?: NavigateOptions): Promise<void>;
  saveBar: { show(options?: SaveBarOptions): Promise<void>; hide(): Promise<void> };
  /** Opens the admin's picker. Resolves with what was chosen, or `null` if the merchant cancelled. */
  resourcePicker(options: ResourcePickerOptions): Promise<PickedResource[] | null>;
  loading: { start(): Promise<void>; stop(): Promise<void> };
  /** A short-lived signed token (JWT) for your backend. Cached until 10 seconds before it expires. */
  getSessionToken(): Promise<string>;
  /**
   * Keeps the admin's frame as tall as your page, so the merchant scrolls the admin, not a box inside it.
   * Sends the height now and whenever it changes. Measures your content, not the window, so don't size content
   * with `vh` units. Calling it again returns the same stop function. Returns a function that stops it.
   */
  autoResize(): () => void;
  /** Listens for an admin event. Returns a function that stops listening. */
  on<T extends EventType>(type: T, listener: (payload: EventMap[T]) => void): () => void;
  /** Stops listening and rejects pending requests. */
  destroy(): void;
}

/**
 * The height of the page's content: the lowest edge of the body's children (fixed-position ones excluded),
 * plus the body's own bottom padding, border and margin. It does not depend on the frame's height, so a page
 * with `min-height: 100vh` or `height: 100%` can't make the frame grow without end.
 */
function contentHeight(): number {
  const body = document.body;
  if (!body) return 0;
  const bs = getComputedStyle(body);
  let bottom = body.getBoundingClientRect().top + parseFloat(bs.paddingTop) + parseFloat(bs.borderTopWidth);
  for (const child of body.children) {
    const cs = getComputedStyle(child);
    if (cs.position === 'fixed' || cs.display === 'none' || child.localName === 'script') continue;
    bottom = Math.max(bottom, child.getBoundingClientRect().bottom + parseFloat(cs.marginBottom));
  }
  return Math.ceil(bottom + scrollY + parseFloat(bs.paddingBottom) + parseFloat(bs.borderBottomWidth) + parseFloat(bs.marginBottom));
}

const REMEMBER = 'commmerce-app-bridge:host-origin';

/**
 * Where the admin around this page seems to be, for a pattern `hostOrigin`. Only a candidate: the caller checks it
 * against the pattern, and the browser's own `postMessage` origin check stops anything being sent to another
 * window. Uses `location.ancestorOrigins[0]` when the browser has it (it is the parent's origin, or `"null"` when
 * the admin hides it). Otherwise the origin of `document.referrer`: the page that loaded this one into the frame.
 * After a link inside the app, the referrer is the app's own page, so the origin remembered for this tab is used,
 * unless the parent is on this page's own origin (`sameOriginParent`: then the parent's origin is known for sure).
 */
export function detectHostOrigin(source: {
  ancestorOrigins?: ArrayLike<string> | null; referrer?: string; self?: string; remembered?: string | null; sameOriginParent?: boolean;
} = currentPage()): string | undefined {
  const { ancestorOrigins, referrer, self, remembered, sameOriginParent } = source;
  if (ancestorOrigins) return ancestorOrigins.length && ancestorOrigins[0] !== 'null' ? ancestorOrigins[0] : undefined;
  if (sameOriginParent) return self;
  let from: string | undefined;
  try { from = referrer ? new URL(referrer).origin : undefined; } catch { from = undefined; }
  if (!from || from === 'null') return undefined;
  if (from === self) return remembered || undefined;
  return from;
}
function currentPage() {
  let remembered: string | null = null;
  try { remembered = sessionStorage.getItem(REMEMBER); } catch { /* storage blocked */ }
  // A parent on another origin can't be read (SecurityError); one on this origin can.
  let sameOriginParent = false;
  try { sameOriginParent = window.parent !== window && window.parent.location.origin === location.origin; } catch { /* cross-origin */ }
  return { ancestorOrigins: location.ancestorOrigins, referrer: document.referrer, self: location.origin, remembered, sameOriginParent };
}

/** The concrete admin origin to talk to, checked against `hostOrigin` (exact or pattern). */
function resolveHostOrigin(config: AppConfig, target: Window): string {
  if (!isOriginPattern(config.hostOrigin)) return normalizeOrigin(config.hostOrigin, 'hostOrigin');
  const pattern = parseOriginPattern(config.hostOrigin, 'hostOrigin');
  let candidate = config.exactHostOrigin;
  if (!candidate) {
    if (target !== window.parent) throw new Error('App Bridge: with a pattern hostOrigin and a custom target, pass exactHostOrigin');
    candidate = detectHostOrigin();
  }
  if (!candidate) {
    throw new Error(`App Bridge: hostOrigin is the pattern ${pattern.source}, but the admin's origin can't be found `
      + '(no location.ancestorOrigins and no document.referrer, or the admin hides them). Is the page inside the admin?');
  }
  if (!matchesOriginPattern(pattern, candidate)) {
    throw new Error(`App Bridge: the admin's origin ${candidate} does not match hostOrigin ${pattern.source}. Messages to it are refused.`);
  }
  const origin = new URL(candidate).origin;
  if (!config.exactHostOrigin) { try { sessionStorage.setItem(REMEMBER, origin); } catch { /* storage blocked */ } }
  return origin;
}

const WAITS_FOR_MERCHANT: RequestType[] = ['modal.open', 'resourcePicker.open'];
let seq = 0;

/** Connects an app running in an iframe to the Commmerce admin around it. */
export function createApp(config: AppConfig): App {
  // A bad setting is reported first, before anything about the page.
  if (isOriginPattern(config.hostOrigin)) parseOriginPattern(config.hostOrigin, 'hostOrigin');
  else normalizeOrigin(config.hostOrigin, 'hostOrigin');
  const target = config.target ?? window.parent;
  if (!target || target === window) throw new Error('App Bridge: the app is not inside the admin (no parent window)');
  const hostOrigin = resolveHostOrigin(config, target);
  const timeout = config.timeout ?? 10000;
  const pending = new Map<string, { resolve(v: unknown): void; reject(e: Error): void; timer?: ReturnType<typeof setTimeout> }>();
  const listeners = new Map<string, Set<(p: unknown) => void>>();
  const prefix = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  let destroyed = false;
  let token: { value: string; exp: number } | null = null;
  const stopResize = new Set<() => void>();
  let resizing: (() => void) | undefined;

  const onMessage = (event: MessageEvent) => {
    if (!isMessage(event.data)) return config.onReject?.('not an App Bridge message', event);
    if (event.source !== target) return config.onReject?.('not from the admin window', event);
    if (event.origin !== hostOrigin) return config.onReject?.(`origin ${event.origin} is not ${hostOrigin}`, event);
    const msg = event.data;
    if (msg.kind === 'response') {
      const p = pending.get(msg.id);
      if (!p) return;
      pending.delete(msg.id);
      clearTimeout(p.timer);
      const r = msg as ResponseMessage;
      if (r.ok) p.resolve(r.result);
      else p.reject(new AppBridgeError(r.error?.code ?? 'failed', r.error?.message ?? 'The admin refused the request'));
    } else if (msg.kind === 'event') {
      listeners.get(msg.type)?.forEach((l) => l(msg.payload));
    }
  };
  window.addEventListener('message', onMessage);

  function send<T extends RequestType>(type: T, payload: RequestMap[T]['payload']): Promise<RequestMap[T]['result']> {
    if (destroyed) return Promise.reject(new AppBridgeError('failed', 'App Bridge was destroyed'));
    const id = `${prefix}-${++seq}`;
    return new Promise((resolve, reject) => {
      const entry: { resolve(v: unknown): void; reject(e: Error): void; timer?: ReturnType<typeof setTimeout> } = {
        resolve: resolve as (v: unknown) => void, reject,
      };
      if (!WAITS_FOR_MERCHANT.includes(type)) {
        entry.timer = setTimeout(() => {
          pending.delete(id);
          reject(new AppBridgeError('timeout', `The admin did not answer "${type}" within ${timeout} ms`));
        }, timeout);
      }
      pending.set(id, entry);
      target.postMessage({ protocol: PROTOCOL, version: PROTOCOL_VERSION, kind: 'request', id, type, payload }, hostOrigin);
    });
  }

  const ready = send('ready', config.apiKey ? { apiKey: config.apiKey } : {});
  ready.catch(() => {}); // surfaced through every later request
  const request = <T extends RequestType>(type: T, payload: RequestMap[T]['payload']) =>
    ready.then(() => send(type, payload));

  return {
    hostOrigin,
    ready,
    toast: { show: (message, options = {}) => request('toast.show', { message, ...options }) },
    modal: { open: (options) => request('modal.open', options) },
    navigate: (path, options = {}) => request('navigate', { path, ...options }),
    saveBar: { show: (options = {}) => request('saveBar.show', options), hide: () => request('saveBar.hide', {}) },
    resourcePicker: (options) => request('resourcePicker.open', options),
    loading: { start: () => request('loading.start', {}), stop: () => request('loading.stop', {}) },
    async getSessionToken() {
      if (token && token.exp * 1000 - Date.now() > 10000) return token.value;
      const value = await request('sessionToken.get', {});
      const exp = Number(decodeClaims(value).exp);
      token = Number.isFinite(exp) ? { value, exp } : null;
      return value;
    },
    autoResize() {
      if (resizing) return resizing; // already running: one observer per app
      let last = -1;
      let frame = 0;
      const sendSize = () => {
        frame = 0;
        const height = contentHeight();
        if (height === last || destroyed) return;
        last = height;
        request('frame.resize', { height }).catch(() => {});
      };
      const schedule = () => { if (!frame) frame = requestAnimationFrame(sendSize); };
      // Watch the body and each of its children: with `body { height: 100% }` the body itself never grows.
      const sizes = new ResizeObserver(schedule);
      const watchChildren = () => {
        sizes.disconnect();
        sizes.observe(document.body);
        for (const child of document.body.children) sizes.observe(child);
        schedule();
      };
      const children = new MutationObserver(watchChildren);
      children.observe(document.body, { childList: true });
      watchChildren();
      const stop = () => {
        sizes.disconnect();
        children.disconnect();
        cancelAnimationFrame(frame);
        stopResize.delete(stop);
        if (resizing === stop) resizing = undefined;
      };
      stopResize.add(stop);
      resizing = stop;
      return stop;
    },
    on(type, listener) {
      const set = listeners.get(type) ?? new Set();
      listeners.set(type, set);
      set.add(listener as (p: unknown) => void);
      return () => set.delete(listener as (p: unknown) => void);
    },
    destroy() {
      destroyed = true;
      [...stopResize].forEach((stop) => stop());
      window.removeEventListener('message', onMessage);
      for (const [, p] of pending) { clearTimeout(p.timer); p.reject(new AppBridgeError('failed', 'App Bridge was destroyed')); }
      pending.clear();
      listeners.clear();
    },
  };
}
