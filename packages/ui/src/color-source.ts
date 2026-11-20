/**
 * Where a colour picker gets the merchant's brand colours and their recent custom colours (since 1.17.0).
 *
 * The picker only needs an object with these three optional methods, so any of these work as `source`:
 * - `app.colors` from `@commmerce/app-bridge` in an app embedded in the admin (the admin answers from the brand
 *   settings and remembers recents per staff member);
 * - `httpColorSource({ baseUrl })` for your own server speaking the Colour API below;
 * - `localColorSource(key)` for recents kept in this browser only (no brand colours);
 * - your own object.
 *
 * Colour API (HTTP, JSON; the reference server is examples/color-api):
 * - `GET  {baseUrl}/brand-colors`   → `{ "colors": [{ "value": "#2e6faf", "name": "Primary" }] }`
 * - `GET  {baseUrl}/recent-colors`  → `{ "colors": ["#2e6faf", "rgba(222, 0, 0, 0.5)"] }` (newest first)
 * - `POST {baseUrl}/recent-colors` with `{ "color": "#2e6faf" }` → the new list, same shape as GET.
 *   The server puts the colour first, removes an earlier copy and keeps at most 16.
 * Recents belong to the signed-in staff member and store; brand colours to the store.
 */

/** A colour with an optional name, e.g. `{ value: '#2e6faf', name: 'Primary' }`. Any CSS colour or gradient. */
export interface ColorSwatch { value: string; name?: string }

export interface ColorSource {
  /** The store's brand colours, in the order the merchant set them. */
  brandColors?(): Promise<Array<string | ColorSwatch>>;
  /** Recent custom colours, newest first. */
  recentColors?(): Promise<string[]>;
  /** Remember a colour the merchant committed. Returns the new list (newest first) when it has it. */
  addRecentColor?(color: string): Promise<string[] | void>;
}

/** How many recent colours a picker shows and a local source keeps. */
export const MAX_RECENT = 16;

/** Puts `color` first, drops an earlier copy (ignoring case) and keeps at most `max`. */
export function pushRecent(list: readonly string[], color: string, max = MAX_RECENT): string[] {
  const key = color.trim().toLowerCase();
  return [color.trim(), ...list.filter((c) => c.trim().toLowerCase() !== key)].slice(0, max);
}

/**
 * Recents kept in this browser's `localStorage` under `cm-recent-colors:<key>`. Each device has its own list; use
 * `httpColorSource` or App Bridge to follow the merchant across devices. Never throws (private windows, blocked storage).
 */
export function localColorSource(key = 'default', max = MAX_RECENT): ColorSource {
  const id = `cm-recent-colors:${key}`;
  const read = (): string[] => {
    try {
      const v = JSON.parse(localStorage.getItem(id) ?? '[]');
      return Array.isArray(v) ? v.filter((c): c is string => typeof c === 'string').slice(0, max) : [];
    } catch { return []; }
  };
  return {
    recentColors: async () => read(),
    async addRecentColor(color) {
      const next = pushRecent(read(), color, max);
      try { localStorage.setItem(id, JSON.stringify(next)); } catch { /* storage blocked: keep the list in memory only */ }
      return next;
    },
  };
}

export interface HttpColorSourceOptions {
  /** Base URL of the Colour API, e.g. `/api/colors` or `https://shop.example.com/api/colors`. */
  baseUrl: string;
  /** Extra request headers, e.g. `{ Authorization: 'Bearer …' }`. A function is called for every request. */
  headers?: Record<string, string> | (() => Record<string, string> | Promise<Record<string, string>>);
  /** `fetch` credentials mode. Default `same-origin`. */
  credentials?: RequestCredentials;
  /** A `fetch` to use instead of the global one (tests, App Bridge authenticated fetch). */
  fetch?: typeof fetch;
}

/** A source backed by the Colour API (see the top of this file). Requests that fail reject; the picker then shows no list. */
export function httpColorSource(opts: HttpColorSourceOptions): ColorSource {
  const base = opts.baseUrl.replace(/\/+$/, '');
  const call = async (path: string, init: RequestInit = {}) => {
    const extra = typeof opts.headers === 'function' ? await opts.headers() : opts.headers ?? {};
    const res = await (opts.fetch ?? fetch)(`${base}${path}`, {
      credentials: opts.credentials ?? 'same-origin',
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...extra },
    });
    if (!res.ok) throw new Error(`Colour API ${path}: HTTP ${res.status}`);
    const body = await res.json();
    return Array.isArray(body?.colors) ? body.colors : [];
  };
  return {
    brandColors: () => call('/brand-colors'),
    recentColors: async () => (await call('/recent-colors')).filter((c: unknown): c is string => typeof c === 'string'),
    addRecentColor: async (color) => (await call('/recent-colors', { method: 'POST', body: JSON.stringify({ color }) }))
      .filter((c: unknown): c is string => typeof c === 'string'),
  };
}
