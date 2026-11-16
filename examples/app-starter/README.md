# Commmerce app starter

A complete app that runs inside the Commmerce admin: a plain HTML page built with Commmerce UI, connected to the
admin with App Bridge, and a zero-dependency Node backend that verifies session tokens. Copy this folder to start
your own app. Node 18 or later; nothing to install.

```sh
npm run vendor   # downloads one pinned version of the hosted build into vendor/
npm run dev      # http://localhost:4700/dev-admin shows your app inside a stand-in admin
npm test         # checks the backend's token rules (exact origin, and the https://*.commmerce.com pattern)
```

## What's in it

| File | What it does |
|---|---|
| `public/index.html` | The app page. Commmerce UI components, `createApp()`, theme following, `autoResize()`, the admin save bar, toasts, a modal and the resource picker. |
| `server.mjs` | Serves the page and verifies the session token on every `/api/*` request: signature, expiry, your API key (`aud`) and the admin (`iss`). Then it looks the store (`dest`) up among the stores that installed the app, and answers 403 for any other. Sends `Content-Security-Policy: frame-ancestors <admin>` so only the admin can frame the app. |
| `dev-admin.html` | Development only: plays the admin with App Bridge's reference host, on a different origin from the app (`localhost` vs `127.0.0.1`), as in production. |
| `fetch-vendor.mjs` | Downloads `tokens.css`, `fonts.css` (with the self-hosted Poppins files in `fonts/`), `cdn.js` and `app-bridge.js` for one version. Pinned files never change; raise the version after reading the release notes. |

## Settings

| Variable | Meaning |
|---|---|
| `COMMMERCE_API_KEY` | Your app's API key. Public: the page sends it to the admin. |
| `COMMMERCE_APP_SECRET` | Your app secret. Server only: never send it to the browser or commit it. |
| `COMMMERCE_ADMIN_ORIGIN` | `https://*.commmerce.com` (recommended: any Commmerce admin, see below) or one exact origin. The page only talks to an admin it matches, and tokens must be issued by one. |
| `--dev` (or `COMMMERCE_DEV=1`) | Development mode: the stand-in admin, its token endpoint, a demo store and throwaway settings. Off unless asked for; never use it on a real server. Without it, the server refuses to start until the three settings above are set. |
| `PORT` | Default 4700. |

In development mode the server uses throwaway values for all three (the admin is `http://localhost:4700`), so `npm run dev` works at once.

## The admin origin

Set `COMMMERCE_ADMIN_ORIGIN=https://*.commmerce.com` (the recommended value): the app then works inside any
Commmerce product's admin on a subdomain of commmerce.com. The same setting is used for the page's `hostOrigin`,
the `iss` check on session tokens and `frame-ancestors`.

- Matches: the same scheme and port (none written means the default), and a host name ending in `.commmerce.com`
  with at least one label before it, at any depth: `https://admin.commmerce.com`, `https://a.b.commmerce.com`.
- Never matches: the bare domain (`https://commmerce.com`), look-alikes (`https://evilcommmerce.com`,
  `https://commmerce.com.evil.com`), `http://`, another port, or an IP address.
- Allowed patterns: one leading `*.` and a domain with at least one dot (`https://*.com` is refused), an optional
  `:port`, no path. An invalid pattern stops the server at start with the reason.
- The page still talks to one exact origin: App Bridge finds the admin's actual origin, checks it against the
  pattern and posts only to that origin (`app.hostOrigin`), never to `*`.
- An exact origin (`https://admin.example.com`) still works, and is compared exactly.

Patterns need App Bridge 1.0.0-rc.3 or later (what `fetch-vendor.mjs` downloads); 1.0.0-rc.2 and earlier compare
exact origins only.

## Make it yours

- Replace the `installs` map in `server.mjs` with your database of installed stores, keyed by the store address
  (`dest`). Take the store from the verified token, never from the request.
- Add your routes next to `/api/me`, and call `authenticate()` first in each.
- Build the page from Commmerce UI components and follow the design guidance at
  https://commmerce.com/blog/commmerceui/#apps
- Prefer React? The App Bridge code is the same; use `@commmerce/ui-react` for the components.

## Before you ship

- Follow the app design guidelines: https://commmerce.com/blog/commmerceui/#apps--guidelines
  (components and tokens, page structure, App Bridge's save bar, toasts and modals, navigation, states, errors,
  the frame, performance, words, accessibility, branding, data and security).
- Test the app against the marketplace review checklist: https://commmerce.com/blog/commmerceui/#apps--review-checklist
  Each check says how to test it.
