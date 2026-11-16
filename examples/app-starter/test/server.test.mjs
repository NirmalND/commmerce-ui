// Checks the backend's session-token rules: run `npm run vendor` first, then `npm test`.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { signSessionToken } from '../vendor/app-bridge.js';

const PORT = 4799;
const ENV = { COMMMERCE_API_KEY: 'key-1', COMMMERCE_APP_SECRET: 'secret-1', COMMMERCE_ADMIN_ORIGIN: 'https://admin.example', PORT: String(PORT), INSTALLED_STORES: 'https://shop.example' };
let server;

before(async () => {
  server = spawn(process.execPath, [new URL('../server.mjs', import.meta.url).pathname], { env: { ...process.env, ...ENV }, stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((resolve) => server.stdout.once('data', resolve));
});
after(() => server.kill());

const claims = { iss: 'https://admin.example', dest: 'https://shop.example', aud: 'key-1', sub: 'staff-7', sid: 's1' };
const me = (token) => fetch(`http://127.0.0.1:${PORT}/api/me`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

test('a valid token for an installed store gets the store and staff member', async () => {
  const res = await me(await signSessionToken(claims, 'secret-1'));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { store: 'https://shop.example', storeName: 'https://shop.example', staff: 'staff-7' });
});

test('no token, a wrong secret, another app, another issuer or an expired token: 401', async () => {
  assert.equal((await me()).status, 401);
  assert.equal((await me(await signSessionToken(claims, 'other-secret'))).status, 401);
  assert.equal((await me(await signSessionToken({ ...claims, aud: 'key-2' }, 'secret-1'))).status, 401);
  assert.equal((await me(await signSessionToken({ ...claims, iss: 'https://evil.example' }, 'secret-1'))).status, 401);
  const old = Math.floor(Date.now() / 1000) - 3600;
  assert.equal((await me(await signSessionToken({ ...claims, iat: old, nbf: old, exp: old + 60 }, 'secret-1'))).status, 401);
});

test('a store that never installed the app: 403', async () => {
  assert.equal((await me(await signSessionToken({ ...claims, dest: 'https://other-shop.example' }, 'secret-1'))).status, 403);
});

test('a malformed Host header gets an answer, not a crash', async () => {
  const net = await import('node:net');
  const raw = (host) => new Promise((resolve) => {
    const sock = net.connect(PORT, '127.0.0.1', () => sock.write(`GET / HTTP/1.1\r\nHost: ${host}\r\nConnection: close\r\n\r\n`));
    let data = ''; sock.on('data', (d) => (data += d)); sock.on('close', () => resolve(data)); sock.on('error', () => resolve(data));
  });
  for (const host of ['[::1', 'a b', 'x:99999999']) {
    assert.match(await raw(host), /^HTTP\/1\.1 \d{3}/, `no answer for Host: ${host}`);
  }
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/`)).status, 200); // still running
});

test('only the admin may frame the app, and dev routes are off unless asked for', async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/`);
  assert.equal(res.headers.get('content-security-policy'), 'frame-ancestors https://admin.example');
  assert.match(await res.text(), /hostOrigin: "https:\/\/admin\.example", apiKey: "key-1"/);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/dev-admin`)).status, 404);
  assert.equal((await fetch(`http://127.0.0.1:${PORT}/dev/token`, { method: 'POST' })).status, 404);
});
