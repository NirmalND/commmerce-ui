import { describe, it, expect, afterEach, vi } from 'vitest';
import { createHost, signSessionToken, verifySessionToken, PROTOCOL, type Host } from '../src/index';
import { frame, win, until, nextReport, errorOf, OTHER, FIXTURE } from './helpers';

let hosts: Host[] = [];
const host = (...a: Parameters<typeof createHost>) => { const h = createHost(...a); hosts.push(h); return h; };
afterEach(() => { hosts.forEach((h) => h.destroy()); hosts = []; document.body.replaceChildren(); });

describe('app and admin in real iframes (same origin)', () => {
  it('connects and returns host info', async () => {
    const f = await frame();
    const h = host({ iframe: f, appOrigin: location.origin, handlers: {}, info: { theme: 'dark', locale: 'en-GB' } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    expect(await app.ready).toEqual({ version: 1, theme: 'dark', locale: 'en-GB' });
    expect(h.connected).toBe(true);
  });

  it('sends the current app path on connect, and / for a path outside the app', async () => {
    let current = '/orders/12?tab=notes';
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: {}, currentPath: () => current });
    expect((await win(f).createApp({ hostOrigin: location.origin }).ready).path).toBe('/orders/12?tab=notes');
    current = '//evil.example/x';
    const f2 = await frame();
    host({ iframe: f2, appOrigin: location.origin, handlers: {}, currentPath: () => current });
    expect((await win(f2).createApp({ hostOrigin: location.origin }).ready).path).toBe('/');
    const f3 = await frame();
    host({ iframe: f3, appOrigin: location.origin, handlers: {}, info: { path: '/settings' } });
    expect((await win(f3).createApp({ hostOrigin: location.origin }).ready).path).toBe('/settings');
  });

  it('delivers path.change events to the app', async () => {
    const f = await frame();
    const h = host({ iframe: f, appOrigin: location.origin, handlers: {} });
    const app = win(f).createApp({ hostOrigin: location.origin });
    await app.ready;
    const seen: string[] = [];
    app.on('path.change', ({ path }) => seen.push(path));
    h.send('path.change', { path: '/reviews/3' });
    await until(() => seen.length > 0);
    expect(seen).toEqual(['/reviews/3']);
  });

  it('runs toast, navigate, loading and save bar through their handlers', async () => {
    const f = await frame();
    const handlers = { toast: vi.fn(), navigate: vi.fn(), loading: vi.fn(), saveBar: vi.fn() };
    host({ iframe: f, appOrigin: location.origin, handlers });
    const app = win(f).createApp({ hostOrigin: location.origin });
    await app.toast.show('Product saved', { tone: 'success' });
    await app.navigate('/orders/12', { replace: true });
    await app.loading.start(); await app.loading.stop();
    await app.saveBar.show({ message: 'Unsaved product' }); await app.saveBar.hide();
    expect(handlers.toast).toHaveBeenCalledWith({ message: 'Product saved', tone: 'success' });
    expect(handlers.navigate).toHaveBeenCalledWith({ path: '/orders/12', replace: true });
    expect(handlers.loading.mock.calls).toEqual([[true], [false]]);
    expect(handlers.saveBar.mock.calls).toEqual([[{ message: 'Unsaved product' }], [null]]);
  });

  it('waits for the merchant on modals and the resource picker, without a timeout', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: {
      modal: () => new Promise((r) => setTimeout(() => r('primary'), 300)),
      resourcePicker: ({ multiple }) => (multiple ? [{ id: 'p1', title: 'Blue mug' }] : null),
    } });
    const app = win(f).createApp({ hostOrigin: location.origin, timeout: 100 });
    expect(await app.modal.open({ title: 'Delete product?', message: 'This can\'t be undone.', primaryAction: { label: 'Delete', destructive: true } })).toBe('primary');
    expect(await app.resourcePicker({ type: 'product', multiple: true })).toEqual([{ id: 'p1', title: 'Blue mug' }]);
    expect(await app.resourcePicker({ type: 'product' })).toBeNull();
  });

  it('refuses invalid payloads before any handler runs', async () => {
    const f = await frame();
    const navigate = vi.fn();
    const toast = vi.fn();
    host({ iframe: f, appOrigin: location.origin, handlers: { navigate, toast } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    expect((await errorOf(app.navigate('https://evil.example/steal')))?.code).toBe('invalid-payload');
    expect((await errorOf(app.navigate('//evil.example')))?.code).toBe('invalid-payload');
    // Browsers read `/\\host` like `//host`; control characters can hide the same trick.
    expect((await errorOf(app.navigate('/\\evil.example')))?.code).toBe('invalid-payload');
    expect((await errorOf(app.navigate('/a\\b')))?.code).toBe('invalid-payload');
    expect((await errorOf(app.navigate('/\t/evil.example')))?.code).toBe('invalid-payload');
    expect((await errorOf(app.navigate('/orders\n')))?.code).toBe('invalid-payload');
    expect((await errorOf(app.toast.show('x'.repeat(201))))?.code).toBe('invalid-payload');
    expect((await errorOf(app.resourcePicker({ type: 'order' as 'product' })))?.code).toBe('invalid-payload');
    expect(navigate).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('sizes the frame to the app with autoResize, and lets a handler take over', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: {} });
    const w = win(f);
    const app = w.createApp({ hostOrigin: location.origin });
    w.document.body.style.margin = '0';
    const box = w.document.createElement('div');
    box.style.height = '640px';
    w.document.body.replaceChildren(box);
    const stop = app.autoResize();
    await until(() => f.style.blockSize === '640px');
    box.style.height = '900px';
    await until(() => f.style.blockSize === '900px');
    stop();
    box.style.height = '100px';
    await new Promise((r) => setTimeout(r, 150));
    expect(f.style.blockSize).toBe('900px');

    const g = await frame();
    const resize = vi.fn();
    host({ iframe: g, appOrigin: location.origin, handlers: { resize } });
    const app2 = win(g).createApp({ hostOrigin: location.origin });
    app2.autoResize();
    await until(() => resize.mock.calls.length > 0);
    expect(typeof resize.mock.calls[0][0].height).toBe('number');
    expect(g.style.blockSize).toBe('');
  });

  it('autoResize measures content, so full-height page styles cannot grow the frame without end', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: {} });
    const w = win(f);
    const app = w.createApp({ hostOrigin: location.origin });
    const style = w.document.createElement('style');
    style.textContent = 'html, body { height: 100%; } body { min-height: 100vh; margin: 8px; }';
    w.document.head.append(style);
    const box = w.document.createElement('div');
    box.style.height = '500px';
    w.document.body.replaceChildren(box);
    const stop = app.autoResize();
    expect(app.autoResize()).toBe(stop); // one observer per app
    await until(() => f.style.blockSize === '516px');
    await new Promise((r) => setTimeout(r, 300)); // several frames: it must stay put
    expect(f.style.blockSize).toBe('516px');
    box.style.height = '900px'; // content taller than the body's 100%: still measured
    await until(() => f.style.blockSize === '916px');
    stop();
  });

  it('answers not-supported for a missing handler, and passes handler errors on', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: { toast: () => { throw new Error('Toast region missing'); } } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    expect((await errorOf(app.getSessionToken()))?.code).toBe('not-supported');
    expect(await errorOf(app.toast.show('Hi'))).toMatchObject({ code: 'failed', message: 'Toast region missing' });
  });

  it('refuses requests before ready, unknown types and other protocol versions', async () => {
    const f = await frame();
    const toast = vi.fn();
    host({ iframe: f, appOrigin: location.origin, handlers: { toast } });
    const w = win(f);
    const base = { protocol: PROTOCOL, kind: 'request', payload: {} };
    w.rawSend({ ...base, version: 1, id: 'a', type: 'toast.show', payload: { message: 'Hi' } });
    w.rawSend({ ...base, version: 2, id: 'b', type: 'ready' });
    w.rawSend({ ...base, version: 1, id: 'c', type: 'admin.deleteStore' });
    await until(() => w.received.length === 3);
    const byId = Object.fromEntries(w.received.map((m) => [m.id, m.error.code]));
    expect(byId).toEqual({ a: 'not-ready', b: 'unsupported-version', c: 'unknown-type' });
    expect(toast).not.toHaveBeenCalled();
  });

  it('sends admin events to the app', async () => {
    const f = await frame();
    const h = host({ iframe: f, appOrigin: location.origin, handlers: { saveBar: () => {} } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    await app.ready;
    const save = vi.fn(); const theme = vi.fn();
    app.on('saveBar.save', save);
    const off = app.on('theme.change', theme);
    h.send('saveBar.save', {});
    h.send('theme.change', { theme: 'dark' });
    await until(() => save.mock.calls.length && theme.mock.calls.length);
    expect(theme).toHaveBeenCalledWith({ theme: 'dark' });
    off();
    h.send('theme.change', { theme: 'light' });
    await new Promise((r) => setTimeout(r, 50));
    expect(theme).toHaveBeenCalledTimes(1);
  });

  it('times out when the admin does not answer, and destroy() rejects what is pending', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: { toast: () => new Promise(() => {}), modal: () => new Promise(() => {}) } });
    const app = win(f).createApp({ hostOrigin: location.origin, timeout: 200 });
    await app.ready;
    expect((await errorOf(app.toast.show('Hi')))?.code).toBe('timeout');
    const modal = errorOf(app.modal.open({ title: 'T', message: 'M' }));
    await new Promise((r) => setTimeout(r, 50));
    app.destroy();
    expect((await modal)?.code).toBe('failed');
  });

  it('caches the session token until shortly before it expires', async () => {
    const f = await frame();
    const sessionToken = vi.fn(() => signSessionToken({ iss: 'https://admin.example', dest: 'https://shop.example', aud: 'key', sub: '7', sid: 's' }, 'secret'));
    host({ iframe: f, appOrigin: location.origin, handlers: { sessionToken } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    const a = await app.getSessionToken();
    const b = await app.getSessionToken();
    expect(a).toBe(b);
    expect(sessionToken).toHaveBeenCalledTimes(1);
  });

  it('checks the API key when the admin is given one', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, apiKey: 'right', handlers: {} });
    const app = win(f).createApp({ hostOrigin: location.origin, apiKey: 'wrong' });
    expect((await errorOf(app.ready))?.code).toBe('failed');
  });
});

describe('origin and sender checks', () => {
  it('refuses * and missing origins', async () => {
    const f = await frame();
    expect(() => createHost({ iframe: f, appOrigin: '*', handlers: {} })).toThrow(/exact origin/);
    expect(() => win(f).createApp({ hostOrigin: '*' })).toThrow(/exact origin/);
  });

  it('admin ignores requests from a frame that is not the app', async () => {
    const app = await frame();
    const other = await frame();
    const toast = vi.fn(); const onReject = vi.fn();
    const h = host({ iframe: app, appOrigin: location.origin, handlers: { toast }, onReject });
    win(other).createApp({ hostOrigin: location.origin, timeout: 200 }).ready.catch(() => {});
    await until(() => onReject.mock.calls.length);
    expect(onReject.mock.calls[0][0]).toBe('not from the app frame');
    expect(h.connected).toBe(false);
  });

  it('app ignores App Bridge messages that do not come from the admin window', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: {} });
    const onReject = vi.fn(); const listener = vi.fn();
    const app = win(f).createApp({ hostOrigin: location.origin, onReject });
    await app.ready;
    app.on('saveBar.discard', listener);
    // A sibling frame (same origin, but not the admin window) tries to fake an admin event.
    const sibling = await frame();
    win(sibling).postTo(f.contentWindow!, { protocol: PROTOCOL, version: 1, kind: 'event', type: 'saveBar.discard', payload: {} });
    await until(() => onReject.mock.calls.length);
    expect(onReject.mock.calls[0][0]).toBe('not from the admin window');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('cross-origin frames', () => {
  it('works end to end when both origins match', async () => {
    const report = nextReport();
    const f = document.createElement('iframe');
    host({ iframe: f, appOrigin: OTHER, handlers: {
      toast: () => {}, sessionToken: () => signSessionToken({ iss: location.origin, dest: 'https://shop.example', aud: 'k', sub: '1', sid: 's' }, 'x'),
    }, info: { theme: 'light', locale: 'en-IN' } });
    f.src = `${OTHER}${FIXTURE}?scenario=basic&host=${encodeURIComponent(location.origin)}`;
    document.body.append(f);
    const r = await report;
    expect(r.ok).toBe(true);
    expect(r.info).toEqual({ version: 1, theme: 'light', locale: 'en-IN' });
    expect(r.token.split('.')).toHaveLength(3);
  });

  it('admin ignores an app served from an origin it was not given', async () => {
    const onReject = vi.fn(); const toast = vi.fn();
    const report = nextReport();
    const f = document.createElement('iframe');
    host({ iframe: f, appOrigin: 'https://app.example.com', handlers: { toast }, onReject });
    f.src = `${OTHER}${FIXTURE}?scenario=basic&timeout=300&host=${encodeURIComponent(location.origin)}`;
    document.body.append(f);
    expect((await report).code).toBe('timeout');
    expect(onReject.mock.calls[0][0]).toBe(`origin ${OTHER} is not https://app.example.com`);
    expect(toast).not.toHaveBeenCalled();
  });

  it('app never talks to an admin on another origin', async () => {
    const toast = vi.fn();
    const report = nextReport();
    const f = document.createElement('iframe');
    host({ iframe: f, appOrigin: OTHER, handlers: { toast } });
    f.src = `${OTHER}${FIXTURE}?scenario=basic&timeout=300&host=${encodeURIComponent('https://admin.example.com')}`;
    document.body.append(f);
    expect((await report).code).toBe('timeout'); // the browser drops posts addressed to the wrong origin
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('admin origin patterns (hostOrigin: http://*.localhost:<port>)', () => {
  // Chromium, Firefox and WebKit (as Playwright runs them) send every *.localhost name to this computer, so one test
  // server can be admin.localhost (the admin), a.b.localhost (a deeper admin), localhost (the bare domain) and
  // 127.0.0.1 (the app, and this test page). Firefox has no location.ancestorOrigins, so there these tests go through
  // the document.referrer fallback.
  const port = location.port;
  const PATTERN = `http://*.localhost:${port}`;
  const APP = `http://127.0.0.1:${port}`;
  const ADMIN_PAGE = new URL('./fixtures/admin.html', import.meta.url).pathname;
  const appUrl = (q: Record<string, string>) => `${APP}${FIXTURE}?${new URLSearchParams({ scenario: 'basic', timeout: '1500', ...q })}`;
  /** Loads the stand-in admin from `admin`, which frames the app; resolves with the app's report. */
  const viaAdmin = (admin: string, q: Record<string, string>, referrerpolicy = '') => {
    const report = nextReport();
    const f = document.createElement('iframe');
    f.src = `${admin}${ADMIN_PAGE}?${new URLSearchParams({ app: appUrl(q), appOrigin: APP, referrerpolicy })}`;
    document.body.append(f);
    return report;
  };

  it('connects to an admin on a subdomain and locks to its exact origin', async () => {
    const admin = `http://admin.localhost:${port}`;
    const r = await viaAdmin(admin, { host: PATTERN });
    expect(r).toMatchObject({ ok: true, hostOrigin: admin, admin, connected: true, toasts: ['Saved'] });
    const claims = await verifySessionToken(r.token, 'x', { audience: 'k', issuer: PATTERN });
    expect(claims.iss).toBe(admin);
  });

  it('connects to an admin on a deeper subdomain', async () => {
    const admin = `http://a.b.localhost:${port}`;
    expect(await viaAdmin(admin, { host: PATTERN })).toMatchObject({ ok: true, hostOrigin: admin, connected: true });
  });

  it('refuses the bare domain, another port and another scheme', async () => {
    const bare = await viaAdmin(`http://localhost:${port}`, { host: PATTERN });
    expect(bare).toMatchObject({ ok: false, thrown: true, connected: false });
    expect(bare.message).toBe(`App Bridge: the admin's origin http://localhost:${port} does not match hostOrigin ${PATTERN}. Messages to it are refused.`);
    const otherPort = await viaAdmin(`http://admin.localhost:${port}`, { host: `http://*.localhost:${Number(port) === 1 ? 2 : 1}` });
    expect(otherPort).toMatchObject({ ok: false, thrown: true, connected: false });
    const https = await viaAdmin(`http://admin.localhost:${port}`, { host: `https://*.localhost:${port}` });
    expect(https).toMatchObject({ ok: false, thrown: true, connected: false });
  });

  it('refuses an admin on an IP address', async () => {
    const report = nextReport();
    const f = document.createElement('iframe');
    // Framed straight by this page, on 127.0.0.1. In Firefox (referrer fallback) the earlier tests left admin.localhost
    // remembered in this tab; a parent on the app's own origin must still win over that.
    f.src = appUrl({ host: PATTERN });
    document.body.append(f);
    const r = await report;
    expect(r).toMatchObject({ ok: false, thrown: true });
    expect(r.message).toMatch(/127\.0\.0\.1.* does not match/);
  });

  it('with referrerpolicy="no-referrer" on the frame, connects to the right admin or throws, never anything else', async () => {
    // Chromium 131 and WebKit 18.2 (Playwright 1.49) still name the admin in ancestorOrigins here (the spec allows hiding it as
    // "null", and then createApp throws "can't be found"). Firefox has no ancestorOrigins and gets no referrer, so it throws.
    const admin = `http://admin.localhost:${port}`;
    const r = await viaAdmin(admin, { host: PATTERN }, 'no-referrer');
    if (r.ok) expect(r).toMatchObject({ hostOrigin: admin, connected: true });
    else expect(r).toMatchObject({ thrown: true, connected: false, message: expect.stringMatching(/can't be found/) });
  });

  it('exactHostOrigin is still checked against the pattern, and a wrong one fails closed', async () => {
    const admin = `http://admin.localhost:${port}`;
    expect(await viaAdmin(admin, { host: PATTERN, exact: admin })).toMatchObject({ ok: true, hostOrigin: admin, connected: true });
    const outside = await viaAdmin(admin, { host: PATTERN, exact: 'https://evil.example' });
    expect(outside).toMatchObject({ ok: false, thrown: true, connected: false });
    // Matches the pattern but is not the window around the app: the browser drops every request.
    const elsewhere = await viaAdmin(admin, { host: PATTERN, exact: `http://other.localhost:${port}` });
    expect(elsewhere).toMatchObject({ ok: false, code: 'timeout', hostOrigin: `http://other.localhost:${port}`, connected: false, toasts: [] });
  });

  it('refuses invalid patterns before anything else', async () => {
    const f = await frame();
    for (const hostOrigin of ['https://*', 'https://*.com', 'https://a.*.example.com', 'https://*.example.com/admin']) {
      expect(() => win(f).createApp({ hostOrigin })).toThrow(/not a valid origin pattern/);
    }
    expect(() => createHost({ iframe: f, appOrigin: 'https://*.example.com', handlers: {} })).toThrow(/exact origin/);
  });
});

describe('colours (colors.brand, colors.recent, colors.addRecent; added in 1.16.0)', () => {
  it('answers brand and recent colours through their handlers', async () => {
    const f = await frame();
    const addRecentColor = vi.fn((c: string) => [c, '#000000']);
    host({ iframe: f, appOrigin: location.origin, handlers: {
      brandColors: () => [{ value: '#2e6faf', name: 'Primary' }, { value: 'linear-gradient(90deg, #fff, #000)' }],
      recentColors: async () => ['#ff0000'],
      addRecentColor,
    } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    expect(Object.keys(app.colors).sort()).toEqual(['addRecentColor', 'brandColors', 'recentColors']);
    expect(await app.colors.brandColors()).toEqual([{ value: '#2e6faf', name: 'Primary' }, { value: 'linear-gradient(90deg, #fff, #000)' }]);
    expect(await app.colors.recentColors()).toEqual(['#ff0000']);
    expect(await app.colors.addRecentColor('rgba(222, 0, 0, 0.5)')).toEqual(['rgba(222, 0, 0, 0.5)', '#000000']);
    expect(addRecentColor).toHaveBeenCalledWith('rgba(222, 0, 0, 0.5)');
  });

  it('answers not-supported when the admin has no colour handlers', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: {} });
    const app = win(f).createApp({ hostOrigin: location.origin });
    expect((await errorOf(app.colors.brandColors()))?.code).toBe('not-supported');
    expect((await errorOf(app.colors.recentColors()))?.code).toBe('not-supported');
    expect((await errorOf(app.colors.addRecentColor('#fff')))?.code).toBe('not-supported');
  });

  it('refuses a colour that is not a 1–200 character string before the handler runs', async () => {
    const f = await frame();
    const addRecentColor = vi.fn(() => []);
    host({ iframe: f, appOrigin: location.origin, handlers: { addRecentColor } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    for (const bad of ['', '   ', 'x'.repeat(201), 42, null, undefined]) {
      expect((await errorOf(app.colors.addRecentColor(bad as string)))?.code).toBe('invalid-payload');
    }
    expect(await app.colors.addRecentColor('x'.repeat(200))).toEqual([]);
    expect(addRecentColor).toHaveBeenCalledTimes(1);
  });

  it('passes handler errors on as failed', async () => {
    const f = await frame();
    host({ iframe: f, appOrigin: location.origin, handlers: { recentColors: () => { throw new Error('Store offline'); } } });
    const app = win(f).createApp({ hostOrigin: location.origin });
    const e = await errorOf(app.colors.recentColors());
    expect(e?.code).toBe('failed');
    expect(e?.message).toBe('Store offline');
  });
});
