// Runs the reference Colour API on its own: node server.mjs  (PORT, HOST and COLOR_API_FILE are optional).
//
// !!! FOR TRYING THE API OUT ONLY !!!
// This server believes whatever the X-Store-Id, X-User-Id and X-Role headers say. Anyone who can reach it can read
// and change any store's colours. A real deployment MUST take the store and the staff member from its own session
// or authentication (a verified session cookie, an App Bridge session token checked with verifySessionToken from
// @commmerce/app-bridge/session-token, …), never from headers or anything else the client sends.
import { createServer } from 'node:http';
import { createColorApi, fileStore } from './color-api.mjs';

const port = Number(process.env.PORT ?? 8787);
const hostname = process.env.HOST ?? '127.0.0.1'; // this computer only, on purpose
const file = process.env.COLOR_API_FILE ?? new URL('./colors.json', import.meta.url).pathname;

const api = createColorApi({
  store: fileStore(file),
  // DEMO ONLY: trusts client headers. Replace with your session/auth lookup (see the comment at the top).
  identify(req) {
    const tenant = req.headers['x-store-id'];
    const user = req.headers['x-user-id'];
    if (typeof tenant !== 'string' || !tenant) return null;
    return { tenant, user: typeof user === 'string' && user ? user : undefined, admin: req.headers['x-role'] === 'admin' };
  },
  // Who may change the brand colours: in a real platform, staff with the brand settings permission.
  canEditBrand: (identity) => identity.admin === true,
});

const server = createServer(async (req, res) => {
  if (await api(req, res)) return;
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'Not found' }));
});
server.listen(port, hostname, () => {
  console.log(`Colour API (demo identity from X-Store-Id / X-User-Id headers) on http://${hostname}:${server.address().port}/api/colors`);
  console.log(`Data file: ${file}`);
});
