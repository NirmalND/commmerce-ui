// Reference server for the Commmerce Colour API: the store's brand colours and each staff member's recent colours,
// for cm-color-picker (`httpColorSource({ baseUrl })` in @commmerce/ui). Dependency-free: node:http, Node 22+.
// The API is documented in README.md next to this file and at the top of packages/ui/src/color-source.ts.
import { readFile, writeFile, rename, mkdir, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';

/** How many recent colours are kept per staff member. */
export const MAX_RECENT = 16;
/** How many brand colours a store may have. */
export const MAX_BRAND = 50;
/** Longest colour value accepted, in characters. */
export const MAX_COLOR_LENGTH = 200;
/** Longest brand colour name accepted, in characters. */
export const MAX_NAME_LENGTH = 60;
/** Largest request body accepted, in bytes. */
export const MAX_BODY = 16 * 1024;

// ---------------------------------------------------------------------------------------------------------------
// Colour validation. Deliberately conservative: only syntax a colour picker produces, nothing that could smuggle
// other CSS (no url(), var(), named colours, semicolons, braces, quotes or comments).

const HEX = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const NUM = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)`;
const ARG = new RegExp(String.raw`^${NUM}(?:%|deg)?$`, 'i');
const ANGLE_OR_NUM = new RegExp(String.raw`^${NUM}(?:deg)?$`, 'i');
const PLAIN_OR_PCT = new RegExp(String.raw`^${NUM}%?$`, 'i');
const FUNC = /^(rgba?|hsla?)\(([^()]*)\)$/i;
const GRADIENT = /^(linear|radial)-gradient\((.*)\)$/is;
const GRADIENT_WORDS = new Set(['to', 'left', 'right', 'top', 'bottom', 'circle', 'ellipse', 'at', 'center']);

/** The arguments of rgb()/hsl() in comma syntax (`1, 2, 3[, a]`) or space syntax (`1 2 3[ / a]`), or null. */
function functionArgs(inner) {
  const s = inner.trim();
  if (s.includes(',')) {
    if (s.includes('/')) return null;
    const parts = s.split(',').map((p) => p.trim());
    return parts.every((p) => p && !/\s/.test(p)) ? parts : null;
  }
  const [main, alpha, extra] = s.split('/');
  if (extra !== undefined) return null;
  const parts = main.trim().split(/\s+/);
  if (parts.length !== 3) return null; // space syntax: three values, alpha only after a slash
  if (alpha !== undefined) {
    const a = alpha.trim();
    if (!a || /\s/.test(a)) return null;
    parts.push(a);
  }
  return parts;
}

/** True for `rgb()`, `rgba()`, `hsl()` or `hsla()` with 3 or 4 numeric arguments. */
function isColorFunction(value) {
  const m = FUNC.exec(value);
  if (!m) return false;
  const args = functionArgs(m[2]);
  if (!args || args.length < 3 || args.length > 4 || !args.every((a) => ARG.test(a))) return false;
  const hsl = m[1].toLowerCase().startsWith('hsl');
  // Hue may carry `deg`; every other argument is a plain number or a percentage.
  return args.every((a, i) => (hsl && i === 0 ? ANGLE_OR_NUM.test(a) : PLAIN_OR_PCT.test(a)));
}

/** True for a hex colour or an rgb()/rgba()/hsl()/hsla() colour. */
function isPlainColor(value) {
  return HEX.test(value) || isColorFunction(value);
}

/**
 * True for `linear-gradient(...)` or `radial-gradient(...)` made only of hex and rgb/hsl colours, numbers (plain, `%`
 * or `deg`), commas, spaces and the keywords to, left, right, top, bottom, circle, ellipse, at and center, with at
 * least two colours.
 */
function isGradient(value) {
  const m = GRADIENT.exec(value);
  if (!m) return false;
  let rest = m[2];
  let colors = 0;
  const token = new RegExp(String.raw`^(?:\s+|,|#[0-9a-f]+|(?:rgba?|hsla?)\([^()]*\)|${NUM}(?:%|deg)?|[a-z]+)`, 'i');
  while (rest.length) {
    const t = token.exec(rest)?.[0];
    if (!t) return false;
    const word = t.toLowerCase();
    if (t.startsWith('#') || /^(rgba?|hsla?)\(/i.test(t)) {
      if (!isPlainColor(t)) return false;
      colors++;
    } else if (/^[a-z]+$/i.test(t) && !GRADIENT_WORDS.has(word)) {
      return false;
    }
    rest = rest.slice(t.length);
  }
  return colors >= 2;
}

/**
 * True if `value` is a colour this API stores: a hex colour (3, 4, 6 or 8 digits), `rgb()`/`rgba()`/`hsl()`/`hsla()`,
 * or a linear or radial gradient of those, at most 200 characters. Surrounding spaces are ignored.
 */
export function isColor(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v || v.length > MAX_COLOR_LENGTH) return false;
  return isPlainColor(v) || isGradient(v);
}

// oxlint-disable-next-line no-control-regex -- refusing control characters in names is the point of this check
const CONTROL = /[\u0000-\u001f\u007f]/;

/** Checks a PUT /brand-colors list. Returns `{ colors }` (trimmed, strings turned into `{ value }`) or `{ error }`. */
export function parseBrandColors(list) {
  if (!Array.isArray(list)) return { error: 'colors must be an array' };
  if (list.length > MAX_BRAND) return { error: `at most ${MAX_BRAND} brand colours` };
  const colors = [];
  for (const [i, item] of list.entries()) {
    const c = typeof item === 'string' ? { value: item } : item;
    if (!c || typeof c !== 'object' || Array.isArray(c)) return { error: `colors[${i}] must be { value, name? }` };
    if (!isColor(c.value)) return { error: `colors[${i}].value is not a supported colour (hex, rgb(), hsl() or a linear/radial gradient of them, at most ${MAX_COLOR_LENGTH} characters)` };
    const out = { value: c.value.trim() };
    if (c.name !== undefined && c.name !== null) {
      if (typeof c.name !== 'string' || c.name.trim().length > MAX_NAME_LENGTH || CONTROL.test(c.name)) {
        return { error: `colors[${i}].name must be text of at most ${MAX_NAME_LENGTH} characters` };
      }
      if (c.name.trim()) out.name = c.name.trim();
    }
    colors.push(out);
  }
  return { colors };
}

/** Puts `color` first, drops an earlier copy (ignoring case) and keeps at most `max`: the same rule as @commmerce/ui. */
export function pushRecent(list, color, max = MAX_RECENT) {
  const value = color.trim();
  const key = value.toLowerCase();
  return [value, ...list.filter((c) => typeof c === 'string' && c.trim().toLowerCase() !== key)].slice(0, max);
}

// ---------------------------------------------------------------------------------------------------------------
// Stores. Any object with these four async methods works (a database table, Redis, …):
//   getBrandColors(tenant) → [{ value, name? }]     setBrandColors(tenant, colors)
//   getRecent(tenant, user) → string[]              setRecent(tenant, user, list)

const recentKey = (tenant, user) => JSON.stringify([tenant, user]);

/** Keeps everything in memory (lost on restart). For tests and trying the API out. */
export function memoryStore() {
  const brand = new Map();
  const recent = new Map();
  return {
    async getBrandColors(tenant) { return structuredClone(brand.get(tenant) ?? []); },
    async setBrandColors(tenant, colors) { brand.set(tenant, structuredClone(colors)); },
    async getRecent(tenant, user) { return [...(recent.get(recentKey(tenant, user)) ?? [])]; },
    async setRecent(tenant, user, list) { recent.set(recentKey(tenant, user), [...list]); },
  };
}

/**
 * Keeps everything in one JSON file at `path`, rewritten on every change through a temporary file and a rename, so a
 * crash never leaves half a file. Writes from this process are queued one after another. One process only: several
 * processes sharing the file would overwrite each other's changes (use a database for that). A missing file starts
 * empty; a file that isn't valid JSON is an error, never silently replaced.
 */
export function fileStore(path) {
  let loaded;
  let queue = Promise.resolve();
  const load = () => (loaded ??= (async () => {
    let text;
    try { text = await readFile(path, 'utf8'); } catch (e) {
      if (e.code === 'ENOENT') return { brand: new Map(), recent: new Map() };
      throw e;
    }
    const data = JSON.parse(text);
    // Maps, not plain objects: a tenant called "__proto__" must stay an ordinary key.
    return { brand: new Map(data.brand ?? []), recent: new Map(data.recent ?? []) };
  })().catch((e) => { loaded = undefined; throw e; }));
  const save = (data) => {
    const run = async () => {
      await mkdir(dirname(path), { recursive: true });
      const tmp = `${path}.${process.pid}.${randomBytes(6).toString('hex')}.tmp`;
      const body = JSON.stringify({ brand: [...data.brand], recent: [...data.recent] });
      try {
        await writeFile(tmp, body, { mode: 0o600 });
        await rename(tmp, path);
      } catch (e) {
        await unlink(tmp).catch(() => {});
        throw e;
      }
    };
    const next = queue.then(run, run);
    queue = next.catch(() => {});
    return next;
  };
  return {
    async getBrandColors(tenant) { return structuredClone((await load()).brand.get(tenant) ?? []); },
    async setBrandColors(tenant, colors) { const d = await load(); d.brand.set(tenant, structuredClone(colors)); await save(d); },
    async getRecent(tenant, user) { return [...((await load()).recent.get(recentKey(tenant, user)) ?? [])]; },
    async setRecent(tenant, user, list) { const d = await load(); d.recent.set(recentKey(tenant, user), [...list]); await save(d); },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The HTTP handler.

class HttpError extends Error {
  constructor(status, message, headers = {}) { super(message); this.status = status; this.headers = headers; }
}

async function readJson(req) {
  const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') throw new HttpError(415, 'Content-Type must be application/json');
  const declared = Number(req.headers['content-length']);
  const tooBig = () => new HttpError(413, `Body is larger than ${MAX_BODY} bytes`, { Connection: 'close' });
  if (declared > MAX_BODY) throw tooBig();
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw tooBig();
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Body is not valid JSON');
  }
}

const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 200;

/**
 * Creates the Colour API request handler: `(req, res) => Promise<boolean>`, true when it answered the request (its
 * path was under `basePath`), false to let the rest of your server handle it.
 *
 * Options:
 * - `store` (required): see `memoryStore()` / `fileStore(path)`.
 * - `identify(req)` (required, may be async): who is asking, from YOUR session or auth (a verified session cookie,
 *   an App Bridge session token, …), never from values the client sends in plain headers or the body. Return
 *   `{ tenant, user }` (tenant = the store, user = the staff member), optionally with more fields for
 *   `canEditBrand`, or `null` → 401.
 * - `canEditBrand(identity)` (may be async): whether this identity may replace the brand colours with
 *   PUT /brand-colors. Default: nobody (403).
 * - `basePath`: default `/api/colors`.
 * - `cors`: an exact origin (e.g. `https://admin.example.com`) allowed to call the API from the browser with
 *   credentials. Default: off (same origin only).
 * - `corsHeaders`: request headers allowed with CORS. Default `['Authorization', 'Content-Type']`.
 * - `onError(error)`: called for unexpected errors (store or identify failed), answered as 500. Default console.error.
 */
export function createColorApi(options = {}) {
  const { store, identify } = options;
  if (!store || typeof store.getRecent !== 'function') throw new TypeError('createColorApi: store is required');
  if (typeof identify !== 'function') throw new TypeError('createColorApi: identify(req) is required');
  const base = (options.basePath ?? '/api/colors').replace(/\/+$/, '');
  const canEditBrand = options.canEditBrand ?? (() => false);
  const cors = options.cors;
  if (cors !== undefined && (typeof cors !== 'string' || cors === '*' || new URL(cors).origin !== cors)) {
    throw new TypeError('createColorApi: cors must be one exact origin such as https://admin.example.com (not *)');
  }
  const corsHeaders = (options.corsHeaders ?? ['Authorization', 'Content-Type']).join(', ');
  const onError = options.onError ?? ((e) => console.error('Colour API:', e));
  // One recent-colours update at a time per staff member, so two quick POSTs can't lose one.
  const locks = new Map();
  const serial = (key, fn) => {
    const prev = locks.get(key) ?? Promise.resolve();
    const next = prev.then(fn, fn);
    const tail = next.catch(() => {});
    locks.set(key, tail);
    tail.then(() => { if (locks.get(key) === tail) locks.delete(key); });
    return next;
  };

  const routes = {
    '/brand-colors': {
      async GET(id) { return { colors: await store.getBrandColors(id.tenant) }; },
      async PUT(id, req) {
        if (!(await canEditBrand(id))) throw new HttpError(403, 'Not allowed to change the brand colours');
        const body = await readJson(req);
        const parsed = parseBrandColors(body?.colors);
        if (parsed.error) throw new HttpError(400, parsed.error);
        await store.setBrandColors(id.tenant, parsed.colors);
        return { colors: parsed.colors };
      },
    },
    '/recent-colors': {
      async GET(id) { return { colors: await store.getRecent(id.tenant, needUser(id)) }; },
      async POST(id, req) {
        const user = needUser(id);
        const body = await readJson(req);
        if (!isColor(body?.color)) {
          throw new HttpError(400, `color is not a supported colour (hex, rgb(), hsl() or a linear/radial gradient of them, at most ${MAX_COLOR_LENGTH} characters)`);
        }
        return serial(recentKey(id.tenant, user), async () => {
          const colors = pushRecent(await store.getRecent(id.tenant, user), body.color);
          await store.setRecent(id.tenant, user, colors);
          return { colors };
        });
      },
    },
  };
  function needUser(id) {
    if (!isId(id.user)) throw new HttpError(401, 'Recent colours need a signed-in staff member');
    return id.user;
  }

  return async function colorApi(req, res) {
    const path = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (path !== base && !path.startsWith(`${base}/`)) return false;
    const headers = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    };
    if (cors && req.headers.origin === cors) {
      Object.assign(headers, { 'Access-Control-Allow-Origin': cors, 'Access-Control-Allow-Credentials': 'true', Vary: 'Origin' });
    } else if (cors) {
      headers.Vary = 'Origin';
    }
    const send = (status, body, extra = {}) => {
      if (res.headersSent) return;
      res.writeHead(status, { ...headers, ...extra });
      res.end(body === undefined ? undefined : JSON.stringify(body));
    };
    try {
      const route = routes[path.slice(base.length)];
      if (!route) throw new HttpError(404, 'Not found');
      const allow = Object.keys(route).join(', ');
      if (req.method === 'OPTIONS' && cors) {
        send(204, undefined, req.headers.origin === cors
          ? { 'Access-Control-Allow-Methods': allow, 'Access-Control-Allow-Headers': corsHeaders, 'Access-Control-Max-Age': '600' }
          : {});
        return true;
      }
      const handler = Object.hasOwn(route, req.method) ? route[req.method] : undefined;
      if (!handler) throw new HttpError(405, 'Method not allowed', { Allow: allow });
      const id = await identify(req);
      if (!id || !isId(id.tenant)) throw new HttpError(401, 'Not signed in');
      send(200, await handler(id, req));
    } catch (e) {
      if (e instanceof HttpError) {
        send(e.status, { error: e.message }, e.headers);
      } else {
        onError(e);
        send(500, { error: 'Internal error' });
      }
    }
    // Leave nothing unread behind an early answer (413, 401, …), so the connection can be reused or closed cleanly.
    if (!req.readableEnded) req.resume();
    return true;
  };
}
