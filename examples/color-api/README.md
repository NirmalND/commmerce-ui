# Colour API reference server

Where `cm-color-picker` gets the store's **brand colours** (set by the merchant in the platform's brand settings)
and each staff member's **recent colours** (the custom colours they picked last), when the picker uses
`httpColorSource({ baseUrl })` from `@commmerce/ui`. Apps embedded in the Commmerce admin don't need this server:
they pass `app.colors` from `@commmerce/app-bridge`, and the admin answers.

This folder is a small, dependency-free Node server (Node 22+, `node:http`, ES modules) that implements the API.
Copy `color-api.mjs` into your own server, or read it as the specification in code.

## The API

HTTP with JSON bodies, under a base path (default `/api/colors`). Recents belong to the signed-in staff member
and the store; brand colours to the store.

| Request | Body | Answer |
| --- | --- | --- |
| `GET {base}/brand-colors` | none | `{ "colors": [{ "value": "#2e6faf", "name": "Primary" }] }`, in the order the merchant set them |
| `GET {base}/recent-colors` | none | `{ "colors": ["#2e6faf", "rgba(222, 0, 0, 0.5)"] }`, newest first |
| `POST {base}/recent-colors` | `{ "color": "#2e6faf" }` | the new list, same shape as GET |
| `PUT {base}/brand-colors` | `{ "colors": [{ "value": "#2e6faf", "name": "Primary" }] }` | the stored list, same shape as GET |

- **POST /recent-colors** puts the colour first, removes an earlier copy (ignoring letter case and surrounding
  spaces) and keeps at most 16.
- **PUT /brand-colors** replaces the whole list. It is for the platform's brand settings screen, not for the
  picker. Items may also be plain strings (`"#2e6faf"`); they are stored as `{ "value": "#2e6faf" }`. At most 50
  colours; names are optional, at most 60 characters, no control characters, trimmed (an empty name is dropped).
- **Colours** must be at most 200 characters and one of: hex (`#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`);
  `rgb()`, `rgba()`, `hsl()`, `hsla()` with numbers and percentages (`deg` on the hue), in comma syntax
  `rgb(46, 111, 175)` or space syntax `rgb(46 111 175 / 50%)`; or `linear-gradient(...)` / `radial-gradient(...)`
  made only of those colours (at least two), numbers, `%`, `deg`, commas, spaces and the words `to`, `left`,
  `right`, `top`, `bottom`, `circle`, `ellipse`, `at`, `center`. Everything else is refused, on purpose: named
  colours, `transparent`, `px` lengths, `var()`, `url()`, `calc()`, conic and repeating gradients. The check is
  syntax only (`rgb(999, 0, 0)` passes, as browsers clamp it).

Every answer is JSON with `Cache-Control: no-store`. Errors are `{ "error": "message" }` with:

| Status | When |
| --- | --- |
| 400 | body is not valid JSON, or a colour, name or list is invalid |
| 401 | `identify` returned nothing (not signed in), or recents were asked for without a staff member |
| 403 | PUT /brand-colors and `canEditBrand` said no |
| 404 | a path under the base path that isn't one of the above |
| 405 | another method (with an `Allow` header) |
| 413 | body larger than 16 KB |
| 415 | POST or PUT without `Content-Type: application/json` |
| 500 | the store or `identify` threw (passed to `onError`; the answer says only "Internal error") |

## Using it in your server

```js
import { createServer } from 'node:http';
import { createColorApi, fileStore } from './color-api.mjs';

const colorApi = createColorApi({
  store: fileStore('/var/lib/my-app/colors.json'),
  // Who is asking: from YOUR session or auth, never from headers or a body the client controls.
  identify: async (req) => {
    const session = await mySessions.fromCookie(req.headers.cookie);
    return session ? { tenant: session.storeId, user: session.staffId, canBrand: session.can('brand') } : null;
  },
  canEditBrand: (identity) => identity.canBrand,   // default: nobody may PUT
  // basePath: '/api/colors',                       // default
  // cors: 'https://admin.example.com',             // default off: same origin only
});

createServer(async (req, res) => {
  if (await colorApi(req, res)) return;             // true when the request was under the base path
  /* the rest of your server */
}).listen(3000);
```

In the browser: `picker.source = httpColorSource({ baseUrl: '/api/colors' })`.

Options of `createColorApi`:

- `store` (required): `memoryStore()`, `fileStore(path)`, or your own object with four async methods:
  `getBrandColors(tenant)`, `setBrandColors(tenant, colors)`, `getRecent(tenant, user)`,
  `setRecent(tenant, user, list)`.
- `identify(req)` (required, may be async): returns `{ tenant, user }` (non-empty strings, at most 200
  characters; other fields are passed to `canEditBrand`), or `null` for 401. An identity without `user` can read
  brand colours but not recents.
- `canEditBrand(identity)` (may be async): who may PUT brand colours. Default: nobody.
- `basePath`: default `/api/colors`.
- `cors`: one exact origin allowed to call the API from a browser on another origin, with credentials (cookies).
  Answers the preflight (`OPTIONS`). `*` is refused. Default off.
- `corsHeaders`: request headers allowed with CORS. Default `['Authorization', 'Content-Type']`.
- `onError(error)`: unexpected errors. Default `console.error`.

Stores:

- `memoryStore()`: in memory, lost on restart. For tests and trying it out.
- `fileStore(path)`: one JSON file, rewritten through a temporary file and a rename so a crash never leaves half a
  file; created (with its folder) on the first write; a file that isn't valid JSON is an error and is never
  overwritten. For one process only: several processes sharing the file would overwrite each other. Use a database
  for more.

POSTs for one staff member are handled one at a time within a process, so two quick picks can't lose one.
Several server processes need a store that updates the list atomically.

## Run it

```sh
cd examples/color-api
npm start          # http://127.0.0.1:8787/api/colors, data in ./colors.json (PORT, HOST, COLOR_API_FILE to change)
npm test           # node:test against a real server on a random port
```

`server.mjs` is a demo: it takes the store and staff member from the `X-Store-Id` and `X-User-Id` headers, and
allows PUT with `X-Role: admin`. **That lets anyone who can reach it read and change any store's colours.** Real
deployments must take them from their own session or authentication (for embedded apps, the App Bridge session
token checked with `verifySessionToken`), never from client headers. It listens on 127.0.0.1 only.

```sh
curl -X PUT -H 'X-Store-Id: s1' -H 'X-Role: admin' -H 'Content-Type: application/json' \
  -d '{"colors":[{"value":"#2e6faf","name":"Primary"}]}' http://127.0.0.1:8787/api/colors/brand-colors
curl -X POST -H 'X-Store-Id: s1' -H 'X-User-Id: u1' -H 'Content-Type: application/json' \
  -d '{"color":"#2e6faf"}' http://127.0.0.1:8787/api/colors/recent-colors
```

Made and maintained by Commmerce. Support: support@commmerce.com
