/**
 * The App Bridge wire protocol: plain objects sent with `postMessage` between the Commmerce admin (host)
 * and an app running in an iframe inside it. Every message carries `protocol` and `version`, so either
 * side can ignore traffic that is not App Bridge and refuse a version it does not speak.
 *
 * - request  (app → host): `{ protocol, version, kind: 'request', id, type, payload }`
 * - response (host → app): `{ protocol, version, kind: 'response', id, ok, result? , error? }`
 * - event    (host → app): `{ protocol, version, kind: 'event', type, payload }`
 */
export const PROTOCOL = 'commmerce-app-bridge';
/** Major protocol version. A host answers a request with a different version with `unsupported-version`. */
export const PROTOCOL_VERSION = 1;

export type ToastTone = 'default' | 'success' | 'critical';

export interface ToastOptions {
  /** `default`, `success` or `critical`. */
  tone?: ToastTone;
  /** How long it stays, in ms (2000–10000). Default 5000. */
  duration?: number;
}

export interface ModalOptions {
  title: string;
  message: string;
  /** The main action, e.g. `{ label: 'Delete product', destructive: true }`. */
  primaryAction?: { label: string; destructive?: boolean };
  /** Usually `{ label: 'Cancel' }`. */
  secondaryAction?: { label: string };
}

/** How an admin-level modal was closed. */
export type ModalResult = 'primary' | 'secondary' | 'close';

export interface SaveBarOptions {
  /** Default "Unsaved changes". */
  message?: string;
  saveLabel?: string;
  discardLabel?: string;
  /** Show the save button as busy. */
  loading?: boolean;
}

export type ResourceType = 'product' | 'customer' | 'collection';

export interface ResourcePickerOptions {
  type: ResourceType;
  /** Allow choosing more than one. Default false. */
  multiple?: boolean;
}

export interface PickedResource {
  id: string;
  title: string;
}

export interface NavigateOptions {
  /** Replace the current admin history entry instead of adding one. */
  replace?: boolean;
}

/** What the host tells the app when it connects. */
export interface HostInfo {
  /** The protocol version the host speaks. */
  version: number;
  /** The admin's current theme. Follow it with `data-cm-theme`. */
  theme: 'light' | 'dark';
  /** BCP 47 locale of the staff member, e.g. `en-IN`. */
  locale: string;
}

/** Every request an app can make, with its payload and result. */
export interface RequestMap {
  'ready': { payload: { apiKey?: string }; result: HostInfo };
  'toast.show': { payload: { message: string } & ToastOptions; result: void };
  'modal.open': { payload: ModalOptions; result: ModalResult };
  'navigate': { payload: { path: string } & NavigateOptions; result: void };
  'saveBar.show': { payload: SaveBarOptions; result: void };
  'saveBar.hide': { payload: Record<string, never>; result: void };
  'resourcePicker.open': { payload: ResourcePickerOptions; result: PickedResource[] | null };
  'loading.start': { payload: Record<string, never>; result: void };
  'loading.stop': { payload: Record<string, never>; result: void };
  'sessionToken.get': { payload: Record<string, never>; result: string };
  /** The app's content height in CSS pixels, so the admin can size the frame (added in 1.0.0-rc.2, still protocol v1). */
  'frame.resize': { payload: { height: number }; result: void };
}
export type RequestType = keyof RequestMap;

/** Events the host sends to the app. */
export interface EventMap {
  /** Save pressed on the admin save bar. */
  'saveBar.save': Record<string, never>;
  /** Discard pressed on the admin save bar. */
  'saveBar.discard': Record<string, never>;
  /** The admin theme changed. */
  'theme.change': { theme: 'light' | 'dark' };
}
export type EventType = keyof EventMap;

export interface RequestMessage<T extends RequestType = RequestType> {
  protocol: typeof PROTOCOL; version: number; kind: 'request'; id: string; type: T; payload: RequestMap[T]['payload'];
}
export interface ResponseMessage {
  protocol: typeof PROTOCOL; version: number; kind: 'response'; id: string; ok: boolean;
  result?: unknown; error?: { code: ErrorCode; message: string };
}
export interface EventMessage<T extends EventType = EventType> {
  protocol: typeof PROTOCOL; version: number; kind: 'event'; type: T; payload: EventMap[T];
}
export type Message = RequestMessage | ResponseMessage | EventMessage;

export type ErrorCode =
  | 'unsupported-version' | 'unknown-type' | 'invalid-payload' | 'not-supported' | 'not-ready' | 'failed' | 'timeout';

/** A request the host refused or could not complete. */
export class AppBridgeError extends Error {
  code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'AppBridgeError';
    this.code = code;
  }
}

/** True for anything shaped like an App Bridge message (any version). */
export function isMessage(data: unknown): data is Message {
  if (!data || typeof data !== 'object') return false;
  const m = data as Record<string, unknown>;
  return m.protocol === PROTOCOL && typeof m.version === 'number'
    && (m.kind === 'request' || m.kind === 'response' || m.kind === 'event');
}

/** Normalises an origin (`https://app.example.com/path` → `https://app.example.com`). Refuses `*`, `null` and wildcards. */
export function normalizeOrigin(origin: string, what: string): string {
  if (!origin || origin === '*' || origin === 'null') throw new TypeError(`App Bridge: ${what} must be an exact origin such as https://app.example.com, not "${origin}"`);
  // `new URL('https://*.example.com')` parses, but no real origin contains `*`: say so instead of never matching.
  if (String(origin).includes('*')) throw new TypeError(`App Bridge: ${what} must be an exact origin such as https://app.example.com, not the pattern "${origin}"`);
  const o = new URL(origin).origin;
  if (o === 'null') throw new TypeError(`App Bridge: ${what} "${origin}" has no origin`);
  return o;
}

/**
 * An admin origin pattern such as `https://*.commmerce.com`: every admin on a subdomain of one domain.
 * Made by `parseOriginPattern`; `scheme` is `https:` or `http:`, `port` is `''` for the scheme's default port.
 */
export interface OriginPattern {
  scheme: 'https:' | 'http:';
  /** The domain after `*.`, lower case, e.g. `commmerce.com`. */
  domain: string;
  port: string;
  /** The pattern as given. */
  source: string;
}

/** One DNS label: letters, digits and hyphens, 1–63 characters, not starting or ending with a hyphen. */
const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const DEFAULT_PORT: Record<string, string> = { 'https:': '443', 'http:': '80' };

/** True if `value` is meant as a pattern (it contains `*`). Check it with `parseOriginPattern`. */
export function isOriginPattern(value: string): boolean {
  return typeof value === 'string' && value.includes('*');
}

/**
 * Parses an origin pattern: `scheme://*.domain` or `scheme://*.domain:port`, scheme `https` or `http`.
 * Only one leading `*.` label is allowed, the domain needs at least one dot (`*.com` is refused; `*.localhost`
 * is allowed for local development, because it only ever reaches this computer), and there is no path. Throws
 * `TypeError` otherwise.
 */
export function parseOriginPattern(pattern: string, what = 'origin pattern'): OriginPattern {
  const fail = (why: string) => new TypeError(`App Bridge: ${what} "${pattern}" is not a valid origin pattern: ${why}. `
    + 'Use an exact origin such as https://admin.example.com, or a pattern such as https://*.commmerce.com');
  const m = /^(https?):\/\/\*\.([^:/?#]*)(?::(\d{1,5}))?$/i.exec(String(pattern));
  if (!m) throw fail('it must be https://*.domain or http://*.domain, with an optional :port and nothing else');
  const scheme = `${m[1].toLowerCase()}:` as OriginPattern['scheme'];
  const domain = m[2].toLowerCase();
  const labels = domain.split('.');
  if (domain.length > 253 || !labels.every((l) => LABEL.test(l))) throw fail('the part after "*." must be a domain name (letters, digits, hyphens and dots)');
  if (labels.length < 2 && domain !== 'localhost') throw fail('the domain after "*." needs at least one dot, e.g. *.commmerce.com');
  if (/^(\d+|0x[0-9a-f]*)$/.test(labels[labels.length - 1])) throw fail('IP addresses cannot have a wildcard');
  let port = '';
  if (m[3] !== undefined) {
    const n = Number(m[3]);
    if (n < 1 || n > 65535) throw fail('the port must be 1 to 65535');
    port = String(n) === DEFAULT_PORT[scheme] ? '' : String(n);
  }
  return { scheme, domain, port, source: String(pattern) };
}

/**
 * True if `origin` (e.g. `https://admin.commmerce.com`) matches `pattern` (e.g. `https://*.commmerce.com`):
 * the same scheme and port, and a host name that ends with `.` + the domain with at least one valid label before
 * it, at any depth. The bare domain, look-alikes (`evilcommmerce.com`, `commmerce.com.evil.com`), other schemes,
 * other ports and IP addresses never match. `origin` must be an origin and nothing more (no path, no trailing `/`,
 * no user name, no default port written out); letter case is ignored.
 */
export function matchesOriginPattern(pattern: string | OriginPattern, origin: string): boolean {
  const p = typeof pattern === 'string' ? parseOriginPattern(pattern) : pattern;
  if (typeof origin !== 'string' || !origin) return false;
  let u: URL;
  try { u = new URL(origin); } catch { return false; }
  if (u.origin === 'null' || u.origin !== origin.toLowerCase()) return false;
  if (u.protocol !== p.scheme || u.port !== p.port) return false;
  const suffix = `.${p.domain}`;
  if (!u.hostname.endsWith(suffix)) return false;
  const sub = u.hostname.slice(0, -suffix.length);
  return sub.length > 0 && sub.split('.').every((l) => LABEL.test(l));
}

/**
 * Checks `origin` against what your settings allow: an exact origin (compared exactly, as before) or a pattern
 * such as `https://*.commmerce.com` (see `matchesOriginPattern`). Throws `TypeError` for an invalid pattern.
 */
export function matchesOrigin(allowed: string, origin: string): boolean {
  if (isOriginPattern(allowed)) return matchesOriginPattern(parseOriginPattern(allowed, 'allowed origin'), origin);
  return typeof origin === 'string' && origin === allowed;
}
