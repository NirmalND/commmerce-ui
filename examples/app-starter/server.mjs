// Commmerce app starter: a zero-dependency Node server for an app that runs inside the Commmerce admin.
//   node server.mjs --dev      then open http://localhost:4700/dev-admin
//   node server.mjs            production: needs the COMMMERCE_* settings
// It serves the app page (public/), verifies App Bridge session tokens on /api/*, and, in development only,
// plays the admin at /dev-admin so you can try the app without the real admin.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as bridge from './vendor/app-bridge.js';

const { verifySessionToken, signSessionToken } = bridge;

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT || 4700);
// Development mode only when asked for: never on by accident on a real server.
const DEV = process.argv.includes('--dev') || process.env.COMMMERCE_DEV === '1';
const API_KEY = process.env.COMMMERCE_API_KEY || (DEV ? 'dev-api-key' : '');
const SECRET = process.env.COMMMERCE_APP_SECRET || (DEV ? 'dev-secret-change-me' : '');
// The admin's origin: https://*.commmerce.com (any Commmerce admin on a subdomain; recommended) or one exact origin.
// In development the fake admin is this server under the name "localhost", and the app is the same server under
// "127.0.0.1", so they are different origins, as in production.
const ADMIN_ORIGIN = process.env.COMMMERCE_ADMIN_ORIGIN || (DEV ? `http://localhost:${PORT}` : '');
if (!API_KEY || !SECRET || !ADMIN_ORIGIN) {
  console.error('Set COMMMERCE_API_KEY, COMMMERCE_APP_SECRET and COMMMERCE_ADMIN_ORIGIN (e.g. https://*.commmerce.com).');
  process.exit(1);
}
if (ADMIN_ORIGIN.includes('*')) {
  // Patterns need an App Bridge build that has them (the page uses the same vendor/app-bridge.js).
  if (!bridge.parseOriginPattern) {
    console.error('COMMMERCE_ADMIN_ORIGIN is a pattern, but vendor/app-bridge.js is too old for patterns. Download a newer version (see README).');
    process.exit(1);
  }
  try { bridge.parseOriginPattern(ADMIN_ORIGIN, 'COMMMERCE_ADMIN_ORIGIN'); } catch (e) { console.error(e.message); process.exit(1); }
}
/** True if a request or token comes from the admin your settings allow. */
const isAdmin = (origin) => (ADMIN_ORIGIN.includes('*') ? bridge.matchesOrigin(ADMIN_ORIGIN, origin) : origin === ADMIN_ORIGIN);

// Stores that installed this app. Replace with your database: never serve a store that is not here.
const installs = new Map(DEV ? [['http://store.localhost', { name: 'Demo store' }]] : []);
for (const s of (process.env.INSTALLED_STORES || '').split(',').filter(Boolean)) installs.set(s, { name: s });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8' };

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    // Only the Commmerce admin may frame the app (clickjacking protection). A pattern works here as it is:
    // in CSP, https://*.commmerce.com also means any subdomain at any depth, and not commmerce.com itself.
    'Content-Security-Policy': `frame-ancestors ${ADMIN_ORIGIN}`,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  });
  res.end(type === 'application/json' && typeof body !== 'string' ? JSON.stringify(body) : body);
}

/** Verifies the session token and finds the store. Answers 401/403 itself and returns null when it can't. */
async function authenticate(req, res) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try {
    const claims = await verifySessionToken(token, SECRET, { audience: API_KEY, issuer: ADMIN_ORIGIN });
    const store = installs.get(claims.dest); // the store comes from the verified token, never from the request
    if (!store) { send(res, 403, { error: 'This store has not installed the app' }); return null; }
    return { claims, store };
  } catch (e) {
    send(res, 401, { error: e.code || 'invalid-token' });
    return null;
  }
}

async function serveFile(res, path) {
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return send(res, 404, { error: 'Not found' });
  try { send(res, 200, await readFile(file), TYPES[extname(file)] || 'application/octet-stream'); }
  catch { send(res, 404, { error: 'Not found' }); }
}

createServer((req, res) => {
  handle(req, res).catch((e) => {
    console.error(e);
    if (!res.headersSent) send(res, 500, { error: 'Server error' }); else res.end();
  });
}).listen(PORT, () => {
  console.log(`App on http://127.0.0.1:${PORT}/`);
  if (DEV) console.log(`Development mode. Try it inside a stand-in admin: http://localhost:${PORT}/dev-admin`);
});

async function handle(req, res) {
  const p = new URL(req.url, 'http://app.invalid').pathname; // a fixed base: never trust the Host header

  // --- Your API: every route checks the session token first.
  if (p === '/api/me' && req.method === 'GET') {
    const auth = await authenticate(req, res);
    if (!auth) return;
    return send(res, 200, { store: auth.claims.dest, storeName: auth.store.name, staff: auth.claims.sub });
  }

  // --- Development only: a fake admin and the token endpoint the real admin's backend provides.
  if (DEV && p === '/dev-admin') return serveFile(res, 'dev-admin.html');
  if (DEV && p === '/dev/token' && req.method === 'POST' && isAdmin(req.headers.origin)) {
    const token = await signSessionToken({ iss: req.headers.origin, dest: 'http://store.localhost', aud: API_KEY, sub: 'staff-1', sid: 'dev-session' }, SECRET);
    return send(res, 200, { token });
  }
  if (DEV && p === '/dev/config') return send(res, 200, { apiKey: API_KEY, appOrigin: `http://127.0.0.1:${PORT}` });

  // --- The app page and its files.
  if (p === '/') {
    const page = (await readFile(join(ROOT, 'public/index.html'), 'utf8'))
      .replace('%ADMIN_ORIGIN%', JSON.stringify(ADMIN_ORIGIN)).replace('%API_KEY%', JSON.stringify(API_KEY));
    return send(res, 200, page, TYPES['.html']);
  }
  if (p.startsWith('/public/') || p.startsWith('/vendor/')) return serveFile(res, p.slice(1));
  send(res, 404, { error: 'Not found' });
}
