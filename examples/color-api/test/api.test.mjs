import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, readFile, readdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createColorApi, memoryStore, fileStore } from '../color-api.mjs';

/** Starts a real server on port 0 with the API mounted; identity comes from test headers (tests only). */
async function start(options = {}) {
  const api = createColorApi({
    store: memoryStore(),
    identify: (req) => (req.headers['x-store-id']
      ? { tenant: req.headers['x-store-id'], user: req.headers['x-user-id'], admin: req.headers['x-role'] === 'admin' }
      : null),
    canEditBrand: (id) => id.admin,
    onError: () => {},
    ...options,
  });
  const server = createServer(async (req, res) => {
    if (await api(req, res)) return;
    res.writeHead(418).end('not mine');
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { url, close: () => new Promise((r) => server.close(r)) };
}

const who = (tenant = 'store-1', user = 'staff-1', extra = {}) => ({ 'X-Store-Id': tenant, 'X-User-Id': user, ...extra });
const json = (body) => ({ 'Content-Type': 'application/json', body: JSON.stringify(body) });
async function call(url, path, { method = 'GET', headers = {}, body, type } = {}) {
  const init = { method, headers: { ...headers, ...(type ? { 'Content-Type': type } : {}) } };
  if (body !== undefined) init.body = body;
  const res = await fetch(`${url}${path}`, init);
  const text = await res.text();
  let parsed;
  try { parsed = text ? JSON.parse(text) : undefined; } catch { parsed = text; }
  return { status: res.status, headers: res.headers, body: parsed };
}
const post = (url, color, headers = who()) => {
  const { body, 'Content-Type': type } = json({ color });
  return call(url, '/api/colors/recent-colors', { method: 'POST', headers, body, type });
};
const putBrand = (url, colors, headers = who('store-1', 'staff-1', { 'X-Role': 'admin' })) => {
  const { body, 'Content-Type': type } = json({ colors });
  return call(url, '/api/colors/brand-colors', { method: 'PUT', headers, body, type });
};

describe('Colour API over HTTP', () => {
  let s;
  before(async () => { s = await start(); });
  after(() => s.close());

  test('answers only under its base path', async () => {
    const r = await fetch(`${s.url}/other`);
    assert.equal(r.status, 418);
    assert.equal((await call(s.url, '/api/colors/nope', { headers: who() })).status, 404);
    assert.deepEqual((await call(s.url, '/api/colors', { headers: who() })).body, { error: 'Not found' });
  });

  test('401 without an identity, and recents need a staff member', async () => {
    const r = await call(s.url, '/api/colors/brand-colors');
    assert.equal(r.status, 401);
    assert.deepEqual(r.body, { error: 'Not signed in' });
    assert.equal((await call(s.url, '/api/colors/recent-colors', { headers: { 'X-Store-Id': 'store-1' } })).status, 401);
    assert.equal((await call(s.url, '/api/colors/brand-colors', { headers: { 'X-Store-Id': 'store-1' } })).status, 200);
  });

  test('recent colours: empty at first, newest first, no repeats ignoring case, at most 16, per staff member and store', async () => {
    const empty = await call(s.url, '/api/colors/recent-colors', { headers: who() });
    assert.equal(empty.status, 200);
    assert.deepEqual(empty.body, { colors: [] });
    assert.equal(empty.headers.get('cache-control'), 'no-store');
    assert.match(empty.headers.get('content-type'), /^application\/json/);
    await post(s.url, '#FF0000');
    await post(s.url, 'rgba(222, 0, 0, 0.5)');
    const r = await post(s.url, ' #ff0000 ');
    assert.equal(r.status, 200);
    assert.deepEqual(r.body, { colors: ['#ff0000', 'rgba(222, 0, 0, 0.5)'] });
    assert.deepEqual((await call(s.url, '/api/colors/recent-colors', { headers: who() })).body, r.body);
    for (let i = 0; i < 20; i++) await post(s.url, `#0000${String(i).padStart(2, '0')}`);
    const list = (await call(s.url, '/api/colors/recent-colors', { headers: who() })).body.colors;
    assert.equal(list.length, 16);
    assert.equal(list[0], '#000019');
    assert.deepEqual((await call(s.url, '/api/colors/recent-colors', { headers: who('store-1', 'staff-2') })).body, { colors: [] });
    assert.deepEqual((await call(s.url, '/api/colors/recent-colors', { headers: who('store-2', 'staff-1') })).body, { colors: [] });
  });

  test('concurrent POSTs for one staff member all land', async () => {
    const colors = Array.from({ length: 10 }, (_, i) => `#1111${String(i).padStart(2, '0')}`);
    await Promise.all(colors.map((c) => post(s.url, c, who('store-c', 'staff-c'))));
    const list = (await call(s.url, '/api/colors/recent-colors', { headers: who('store-c', 'staff-c') })).body.colors;
    assert.deepEqual([...list].sort(), [...colors].sort());
  });

  test('refuses bad colours and bad bodies with 400/413/415 and { error }', async () => {
    for (const bad of ['red', 'url(x)', '', 'x'.repeat(201), 5, null]) {
      const r = await post(s.url, bad);
      assert.equal(r.status, 400, String(bad));
      assert.equal(typeof r.body.error, 'string');
    }
    const broken = await call(s.url, '/api/colors/recent-colors', { method: 'POST', headers: who(), body: '{"color":', type: 'application/json' });
    assert.equal(broken.status, 400);
    assert.deepEqual(broken.body, { error: 'Body is not valid JSON' });
    const plain = await call(s.url, '/api/colors/recent-colors', { method: 'POST', headers: who(), body: '{"color":"#fff"}', type: 'text/plain' });
    assert.equal(plain.status, 415);
    const big = await call(s.url, '/api/colors/recent-colors', { method: 'POST', headers: who(), body: JSON.stringify({ color: '#fff', pad: 'x'.repeat(17000) }), type: 'application/json' });
    assert.equal(big.status, 413);
    assert.match(big.body.error, /16384/);
  });

  test('brand colours: anyone signed in reads them; only canEditBrand may replace them', async () => {
    assert.deepEqual((await call(s.url, '/api/colors/brand-colors', { headers: who('store-b') })).body, { colors: [] });
    const denied = await putBrand(s.url, ['#fff'], who('store-b'));
    assert.equal(denied.status, 403);
    const r = await putBrand(s.url, ['#2e6faf', { value: 'linear-gradient(90deg, #fff, #000)', name: ' Sky ' }], who('store-b', 'u', { 'X-Role': 'admin' }));
    assert.equal(r.status, 200);
    const expected = { colors: [{ value: '#2e6faf' }, { value: 'linear-gradient(90deg, #fff, #000)', name: 'Sky' }] };
    assert.deepEqual(r.body, expected);
    assert.deepEqual((await call(s.url, '/api/colors/brand-colors', { headers: who('store-b', 'someone') })).body, expected);
    assert.deepEqual((await call(s.url, '/api/colors/brand-colors', { headers: who('store-other') })).body, { colors: [] });
  });

  test('brand colours: refuses invalid lists, keeping the old one', async () => {
    const admin = who('store-v', 'u', { 'X-Role': 'admin' });
    await putBrand(s.url, ['#123456'], admin);
    for (const bad of [[{ value: 'red' }], Array(51).fill('#fff'), [{ value: '#fff', name: 'x'.repeat(61) }], 'nope']) {
      const r = await putBrand(s.url, bad, admin);
      assert.equal(r.status, 400);
      assert.equal(typeof r.body.error, 'string');
    }
    assert.deepEqual((await call(s.url, '/api/colors/brand-colors', { headers: admin })).body, { colors: [{ value: '#123456' }] });
  });

  test('405 with Allow for other methods; no CORS headers by default', async () => {
    const r = await call(s.url, '/api/colors/recent-colors', { method: 'DELETE', headers: who() });
    assert.equal(r.status, 405);
    assert.equal(r.headers.get('allow'), 'GET, POST');
    const pre = await call(s.url, '/api/colors/recent-colors', { method: 'OPTIONS', headers: { Origin: 'https://admin.example.com' } });
    assert.equal(pre.status, 405);
    const g = await call(s.url, '/api/colors/brand-colors', { headers: { ...who(), Origin: 'https://admin.example.com' } });
    assert.equal(g.headers.get('access-control-allow-origin'), null);
  });
});

describe('options', () => {
  test('requires a store and identify, and refuses * for cors', () => {
    assert.throws(() => createColorApi({ identify: () => null }), /store/);
    assert.throws(() => createColorApi({ store: memoryStore() }), /identify/);
    assert.throws(() => createColorApi({ store: memoryStore(), identify: () => null, cors: '*' }), /cors/);
    assert.throws(() => createColorApi({ store: memoryStore(), identify: () => null, cors: 'https://a.example/path' }), /cors/);
  });

  test('basePath, async identify and canEditBrand, and 500 when the store fails', async () => {
    const errors = [];
    const failing = { ...memoryStore(), getRecent: async () => { throw new Error('db down'); } };
    const s = await start({
      basePath: '/colours/', store: failing, onError: (e) => errors.push(e.message),
      identify: async () => ({ tenant: 't', user: 'u', role: 'owner' }), canEditBrand: async (id) => id.role === 'owner',
    });
    try {
      assert.equal((await call(s.url, '/api/colors/brand-colors')).status, 418);
      assert.equal((await call(s.url, '/colours/brand-colors')).status, 200);
      const { body, 'Content-Type': type } = json({ colors: ['#abc'] });
      assert.equal((await call(s.url, '/colours/brand-colors', { method: 'PUT', body, type })).status, 200);
      const r = await call(s.url, '/colours/recent-colors');
      assert.equal(r.status, 500);
      assert.deepEqual(r.body, { error: 'Internal error' });
      assert.deepEqual(errors, ['db down']);
    } finally { await s.close(); }
  });

  test('cors: one exact origin, with credentials and a preflight', async () => {
    const s = await start({ cors: 'https://admin.example.com' });
    try {
      const pre = await call(s.url, '/api/colors/recent-colors', { method: 'OPTIONS', headers: { Origin: 'https://admin.example.com', 'Access-Control-Request-Method': 'POST' } });
      assert.equal(pre.status, 204);
      assert.equal(pre.headers.get('access-control-allow-origin'), 'https://admin.example.com');
      assert.equal(pre.headers.get('access-control-allow-credentials'), 'true');
      assert.equal(pre.headers.get('access-control-allow-methods'), 'GET, POST');
      assert.equal(pre.headers.get('access-control-allow-headers'), 'Authorization, Content-Type');
      const ok = await call(s.url, '/api/colors/brand-colors', { headers: { ...who(), Origin: 'https://admin.example.com' } });
      assert.equal(ok.headers.get('access-control-allow-origin'), 'https://admin.example.com');
      assert.equal(ok.headers.get('vary'), 'Origin');
      const other = await call(s.url, '/api/colors/brand-colors', { headers: { ...who(), Origin: 'https://evil.example' } });
      assert.equal(other.headers.get('access-control-allow-origin'), null);
    } finally { await s.close(); }
  });
});

describe('fileStore', () => {
  let dir;
  before(async () => { dir = await mkdtemp(join(tmpdir(), 'color-api-')); });
  after(() => rm(dir, { recursive: true, force: true }));

  test('persists to one JSON file through temp file + rename, and reads it back in a new store', async () => {
    const file = join(dir, 'nested', 'colors.json');
    const a = fileStore(file);
    assert.deepEqual(await a.getRecent('t', 'u'), []);
    await a.setBrandColors('t', [{ value: '#fff', name: 'White' }]);
    await Promise.all([a.setRecent('t', 'u', ['#000']), a.setRecent('__proto__', 'u', ['#111']), a.setBrandColors('__proto__', [{ value: '#222' }])]);
    assert.deepEqual(await readdir(join(dir, 'nested')), ['colors.json']); // no temp files left behind
    JSON.parse(await readFile(file, 'utf8'));
    const b = fileStore(file);
    assert.deepEqual(await b.getBrandColors('t'), [{ value: '#fff', name: 'White' }]);
    assert.deepEqual(await b.getRecent('t', 'u'), ['#000']);
    assert.deepEqual(await b.getRecent('__proto__', 'u'), ['#111']);
    assert.deepEqual(await b.getBrandColors('__proto__'), [{ value: '#222' }]);
    assert.deepEqual(await b.getBrandColors('other'), []);
    assert.equal({}.polluted, undefined);
  });

  test('returns copies, so callers cannot change what is stored', async () => {
    const st = fileStore(join(dir, 'copies.json'));
    await st.setBrandColors('t', [{ value: '#fff' }]);
    (await st.getBrandColors('t'))[0].value = '#000';
    assert.deepEqual(await st.getBrandColors('t'), [{ value: '#fff' }]);
  });

  test('a corrupt file is an error, never silently replaced', async () => {
    const file = join(dir, 'corrupt.json');
    await writeFile(file, '{ not json');
    const st = fileStore(file);
    await assert.rejects(st.getRecent('t', 'u'), SyntaxError);
    await assert.rejects(st.setRecent('t', 'u', ['#fff']), SyntaxError);
    assert.equal(await readFile(file, 'utf8'), '{ not json');
  });

  test('works behind the HTTP API', async () => {
    const file = join(dir, 'http.json');
    const s = await start({ store: fileStore(file) });
    try {
      await post(s.url, '#abcdef');
      await post(s.url, '#123456');
    } finally { await s.close(); }
    assert.deepEqual(await fileStore(file).getRecent('store-1', 'staff-1'), ['#123456', '#abcdef']);
  });
});
