// COMMMERCE_ADMIN_ORIGIN=https://*.commmerce.com: tokens from any admin on a subdomain, and nothing else.
// Needs a vendor/app-bridge.js with origin patterns (1.0.0-rc.3 or later); skipped with an older one.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import * as bridge from '../vendor/app-bridge.js';

const PORT = 4798;
const PATTERN = 'https://*.commmerce.com';
const ENV = { COMMMERCE_API_KEY: 'key-1', COMMMERCE_APP_SECRET: 'secret-1', COMMMERCE_ADMIN_ORIGIN: PATTERN, PORT: String(PORT), INSTALLED_STORES: 'https://shop.example' };
const skip = bridge.parseOriginPattern ? false : 'vendor/app-bridge.js has no origin patterns: download a newer version';
let server;

const start = (env) => spawn(process.execPath, [new URL('../server.mjs', import.meta.url).pathname], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });

before(async () => {
  if (skip) return;
  server = start(ENV);
  await new Promise((resolve) => server.stdout.once('data', resolve));
});
after(() => server?.kill());

const claims = { dest: 'https://shop.example', aud: 'key-1', sub: 'staff-7', sid: 's1' };
const me = async (iss) => fetch(`http://127.0.0.1:${PORT}/api/me`, { headers: { Authorization: `Bearer ${await bridge.signSessionToken({ ...claims, iss }, 'secret-1')}` } });

test('tokens from any admin on a subdomain are accepted', { skip }, async () => {
  for (const iss of ['https://admin.commmerce.com', 'https://preprod.commmerce.com', 'https://a.b.commmerce.com']) {
    assert.equal((await me(iss)).status, 200, iss);
  }
});

test('the bare domain, look-alikes, other schemes and ports: 401', { skip }, async () => {
  for (const iss of ['https://commmerce.com', 'https://evilcommmerce.com', 'https://commmerce.com.evil.com', 'http://admin.commmerce.com', 'https://admin.commmerce.com:8443', 'https://admin.commmerce.com/']) {
    assert.equal((await me(iss)).status, 401, iss);
  }
});

test('the pattern goes into frame-ancestors and the page as it is', { skip }, async () => {
  const res = await fetch(`http://127.0.0.1:${PORT}/`);
  assert.equal(res.headers.get('content-security-policy'), `frame-ancestors ${PATTERN}`);
  assert.match(await res.text(), /hostOrigin: "https:\/\/\*\.commmerce\.com"/);
});

test('an invalid pattern stops the server at start', { skip }, async () => {
  const bad = start({ ...ENV, PORT: '4797', COMMMERCE_ADMIN_ORIGIN: 'https://*.com' });
  let err = '';
  bad.stderr.on('data', (d) => (err += d));
  const code = await new Promise((resolve) => bad.on('exit', resolve));
  assert.equal(code, 1);
  assert.match(err, /not a valid origin pattern/);
});
