import {
  PROTOCOL, PROTOCOL_VERSION, AppBridgeError, isMessage, normalizeOrigin,
  type RequestMap, type RequestType, type EventMap, type EventType, type HostInfo, type ErrorCode, type RequestMessage,
} from './protocol.js';

type Payload<T extends RequestType> = RequestMap[T]['payload'];
type Result<T extends RequestType> = RequestMap[T]['result'] | Promise<RequestMap[T]['result']>;

/**
 * What the admin does for each request. Payloads are validated before a handler runs. Every string in them
 * comes from the app: show it as text, never as HTML. A missing handler answers `not-supported`.
 */
export interface HostHandlers {
  toast(p: Payload<'toast.show'>): Result<'toast.show'>;
  modal(p: Payload<'modal.open'>): Result<'modal.open'>;
  /** `path` always starts with `/` and is relative to the app's place in the admin. */
  navigate(p: Payload<'navigate'>): Result<'navigate'>;
  /** Called with the options to show the save bar, or `null` to hide it. */
  saveBar(p: Payload<'saveBar.show'> | null): Result<'saveBar.show'>;
  resourcePicker(p: Payload<'resourcePicker.open'>): Result<'resourcePicker.open'>;
  /** `true` to show the admin loading bar, `false` to hide it. */
  loading(on: boolean): Result<'loading.start'>;
  /** Get a fresh token for this app from the admin's backend (which holds the app secret). */
  sessionToken(): Result<'sessionToken.get'>;
  /** The app's content height changed (`app.autoResize()`). Default: sets the iframe's height. */
  resize?(p: Payload<'frame.resize'>): Result<'frame.resize'>;
}

export interface HostConfig {
  /** The iframe the app runs in. Only messages from its window are accepted. */
  iframe: HTMLIFrameElement;
  /** The app's exact origin, e.g. `https://app.example.com`. Messages from any other origin are ignored; `*` is refused. */
  appOrigin: string;
  handlers: Partial<HostHandlers>;
  /** Sent to the app when it connects. */
  info?: Partial<Omit<HostInfo, 'version'>>;
  /** If set, the app's `ready` request must carry this API key. */
  apiKey?: string;
  /** Called with the reason whenever a message is ignored. For logging. */
  onReject?: (reason: string, event: MessageEvent) => void;
}

export interface Host {
  /** Sends an event to the app (e.g. `saveBar.save`, `theme.change`). Dropped until the app has connected. */
  send<T extends EventType>(type: T, payload: EventMap[T]): void;
  /** True once the app has connected with `ready`. */
  readonly connected: boolean;
  destroy(): void;
}

const str = (v: unknown, max: number) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
const optStr = (v: unknown, max: number) => v === undefined || str(v, max);
const optBool = (v: unknown) => v === undefined || typeof v === 'boolean';

/**
 * True for a path that stays inside the app: starts with one `/`, has no `\\` (browsers read `/\\host` as
 * `//host`) and no control characters, and resolves to the same origin as its base.
 */
export function isAppPath(v: unknown): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > 2000) return false;
  if (!v.startsWith('/') || v.startsWith('//') || v.includes('\\') || /[\u0000-\u001f\u007f]/.test(v)) return false;
  try { return new URL(v, 'https://app-bridge.invalid').origin === 'https://app-bridge.invalid'; } catch { return false; }
}

/** Returns an error message if the payload is wrong for its type, else null. */
export function validatePayload(type: RequestType, p: Record<string, unknown>): string | null {
  switch (type) {
    case 'ready': return optStr(p.apiKey, 200) ? null : 'apiKey must be a string';
    case 'toast.show':
      if (!str(p.message, 200)) return 'message must be 1–200 characters';
      if (p.tone !== undefined && !['default', 'success', 'critical'].includes(p.tone as string)) return 'tone must be default, success or critical';
      if (p.duration !== undefined && !(typeof p.duration === 'number' && p.duration >= 2000 && p.duration <= 10000)) return 'duration must be 2000–10000 ms';
      return null;
    case 'modal.open': {
      if (!str(p.title, 100) || !str(p.message, 1000)) return 'title (1–100) and message (1–1000 characters) are required';
      const pa = p.primaryAction as Record<string, unknown> | undefined;
      const sa = p.secondaryAction as Record<string, unknown> | undefined;
      if (pa !== undefined && !(pa && str(pa.label, 40) && optBool(pa.destructive))) return 'primaryAction needs a label (1–40 characters)';
      if (sa !== undefined && !(sa && str(sa.label, 40))) return 'secondaryAction needs a label (1–40 characters)';
      return null;
    }
    case 'navigate':
      if (!isAppPath(p.path)) return 'path must be a path inside the app, starting with a single / (no \\, no control characters)';
      return optBool(p.replace) ? null : 'replace must be a boolean';
    case 'frame.resize':
      return typeof p.height === 'number' && Number.isFinite(p.height) && p.height >= 0 && p.height <= 100000
        ? null : 'height must be a number of pixels, 0–100000';
    case 'saveBar.show':
      return optStr(p.message, 100) && optStr(p.saveLabel, 40) && optStr(p.discardLabel, 40) && optBool(p.loading)
        ? null : 'message (≤100), saveLabel and discardLabel (≤40) must be strings; loading a boolean';
    case 'resourcePicker.open':
      if (!['product', 'customer', 'collection'].includes(p.type as string)) return 'type must be product, customer or collection';
      return optBool(p.multiple) ? null : 'multiple must be a boolean';
    default: return null;
  }
}

/** Admin side: answers App Bridge requests from the app in `iframe`. */
export function createHost(config: HostConfig): Host {
  const appOrigin = normalizeOrigin(config.appOrigin, 'appOrigin');
  const { iframe, handlers } = config;
  let connected = false;
  let destroyed = false;

  const post = (msg: object) => {
    if (!destroyed) iframe.contentWindow?.postMessage({ protocol: PROTOCOL, version: PROTOCOL_VERSION, ...msg }, appOrigin);
  };
  const fail = (id: string, code: ErrorCode, message: string) => post({ kind: 'response', id, ok: false, error: { code, message } });

  const run = (type: RequestType, p: any): Result<RequestType> => {
    const need = (h: unknown) => { if (!h) throw new AppBridgeError('not-supported', `This admin does not support "${type}"`); };
    switch (type) {
      case 'ready':
        if (config.apiKey && p.apiKey !== config.apiKey) throw new AppBridgeError('failed', 'API key does not match this app');
        connected = true;
        return { version: PROTOCOL_VERSION, theme: config.info?.theme ?? 'light', locale: config.info?.locale ?? 'en-IN' };
      case 'toast.show': need(handlers.toast); return handlers.toast!(p);
      case 'modal.open': need(handlers.modal); return handlers.modal!(p);
      case 'navigate': need(handlers.navigate); return handlers.navigate!(p);
      case 'saveBar.show': need(handlers.saveBar); return handlers.saveBar!(p);
      case 'saveBar.hide': need(handlers.saveBar); return handlers.saveBar!(null);
      case 'resourcePicker.open': need(handlers.resourcePicker); return handlers.resourcePicker!(p);
      case 'loading.start': need(handlers.loading); return handlers.loading!(true);
      case 'loading.stop': need(handlers.loading); return handlers.loading!(false);
      case 'sessionToken.get': need(handlers.sessionToken); return handlers.sessionToken!();
      case 'frame.resize':
        if (handlers.resize) return handlers.resize(p);
        iframe.style.blockSize = `${Math.ceil(p.height)}px`;
        return;
    }
  };

  const KNOWN: RequestType[] = ['ready', 'toast.show', 'modal.open', 'navigate', 'saveBar.show', 'saveBar.hide',
    'resourcePicker.open', 'loading.start', 'loading.stop', 'sessionToken.get', 'frame.resize'];

  const onMessage = async (event: MessageEvent) => {
    if (!isMessage(event.data)) return config.onReject?.('not an App Bridge message', event);
    if (!iframe.contentWindow || event.source !== iframe.contentWindow) return config.onReject?.('not from the app frame', event);
    if (event.origin !== appOrigin) return config.onReject?.(`origin ${event.origin} is not ${appOrigin}`, event);
    const msg = event.data as RequestMessage;
    if (msg.kind !== 'request' || typeof msg.id !== 'string') return config.onReject?.('not a request', event);
    const { id, type } = msg;
    if (msg.version !== PROTOCOL_VERSION) return fail(id, 'unsupported-version', `This admin speaks App Bridge version ${PROTOCOL_VERSION}`);
    if (!KNOWN.includes(type)) return fail(id, 'unknown-type', `Unknown request "${String(type)}"`);
    if (type !== 'ready' && !connected) return fail(id, 'not-ready', 'Send "ready" first');
    const payload = msg.payload && typeof msg.payload === 'object' ? msg.payload as Record<string, unknown> : {};
    const invalid = validatePayload(type, payload);
    if (invalid) return fail(id, 'invalid-payload', invalid);
    try {
      const result = await run(type, payload);
      post({ kind: 'response', id, ok: true, ...(result === undefined ? {} : { result }) });
    } catch (e) {
      if (e instanceof AppBridgeError) fail(id, e.code, e.message);
      else fail(id, 'failed', e instanceof Error ? e.message : 'The admin could not complete the request');
    }
  };
  window.addEventListener('message', onMessage);

  return {
    send(type, payload) { if (connected) post({ kind: 'event', type, payload }); },
    get connected() { return connected; },
    destroy() { destroyed = true; connected = false; window.removeEventListener('message', onMessage); },
  };
}
