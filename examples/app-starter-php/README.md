# Commmerce app starter (PHP)

The same app as the Node starter, with a PHP backend: a plain HTML page built with Commmerce UI, connected to the
admin with App Bridge, and a front controller that verifies session tokens. PHP 8.0 or later; no Composer packages.

```sh
php fetch-vendor.php                 # downloads one pinned version of the hosted build into vendor/
COMMMERCE_DEV=1 php -S 127.0.0.1:4800 index.php   # then open http://localhost:4800/dev-admin
php tests/run.php                    # checks the session-token rules
```

## What's in it

| File | What it does |
|---|---|
| `index.php` | Front controller. Serves the page, and verifies the session token on every `/api/*` request: signature (HS256 only), expiry, your API key (`aud`) and the admin (`iss`). Then it looks the store (`dest`) up among the stores that installed the app and answers 403 for any other. Sends `Content-Security-Policy: frame-ancestors <admin>`. |
| `lib/SessionToken.php` | `SessionToken::verify($token, $secret, $apiKey, $adminOrigin)`: the same checks as `verifySessionToken` in `@commmerce/app-bridge`; `$adminOrigin` is an exact origin or a pattern such as `https://*.commmerce.com` (`SessionToken::matchesOrigin()` has the rules). Copy it into any PHP app (Laravel, CodeIgniter, plain PHP). |
| `public/index.html` | The app page: Commmerce UI components, `createApp()`, theme following, `autoResize()`, the admin save bar, toasts, a modal and the resource picker. |
| `public/dev-admin.html` | Development only: plays the admin with App Bridge's reference host, on a different origin from the app. |
| `fetch-vendor.php` | Downloads `tokens.css`, `cdn.js` and `app-bridge.js` for one version. |
| `.htaccess` | Apache: routes everything to `index.php` and passes the `Authorization` header to PHP (Apache drops it otherwise). |

## Settings (environment variables)

| Variable | Meaning |
|---|---|
| `COMMMERCE_API_KEY` | Your app's API key. Public: the page sends it to the admin. |
| `COMMMERCE_APP_SECRET` | Your app secret. Server only: never send it to the browser or commit it. |
| `COMMMERCE_ADMIN_ORIGIN` | `https://*.commmerce.com` (recommended: any Commmerce admin, see below) or one exact origin. The page only talks to an admin it matches, and tokens must be issued by one. |
| `COMMMERCE_DEV=1` | Development mode: the stand-in admin, its token endpoint, a demo store and throwaway settings. Off unless set; never set it on a real server. Without it, every request fails with 500 until the three settings above are set. |

## The admin origin

Set `COMMMERCE_ADMIN_ORIGIN=https://*.commmerce.com` (the recommended value): the app then works inside any
Commmerce product's admin on a subdomain of commmerce.com. The same setting is used for the page's `hostOrigin`,
the `iss` check on session tokens and `frame-ancestors`.

- Matches: the same scheme and port (none written means the default), and a host name ending in `.commmerce.com`
  with at least one label before it, at any depth: `https://admin.commmerce.com`, `https://a.b.commmerce.com`.
- Never matches: the bare domain (`https://commmerce.com`), look-alikes (`https://evilcommmerce.com`,
  `https://commmerce.com.evil.com`), `http://`, another port, or an IP address.
- Allowed patterns: one leading `*.` and a domain with at least one dot (`https://*.com` is refused), an optional
  `:port`, no path. An invalid pattern makes every request fail with 500 and the reason.
- The page still talks to one exact origin: App Bridge finds the admin's actual origin, checks it against the
  pattern and posts only to that origin (`app.hostOrigin`), never to `*`.
- An exact origin (`https://admin.example.com`) still works, and is compared exactly.

`lib/SessionToken.php` checks patterns itself. The page needs `vendor/app-bridge.js` from 1.0.0-rc.3 or later (what
`fetch-vendor.php` downloads); 1.0.0-rc.2 and earlier compare exact origins only.

## nginx

```nginx
location / { try_files $uri /index.php$is_args$args; }
location ~ ^/(lib|tests|public)/ { return 404; }
location = /index.php { include fastcgi_params; fastcgi_param SCRIPT_FILENAME $document_root/index.php; fastcgi_pass unix:/run/php/php8.1-fpm.sock; }
```

nginx passes the `Authorization` header to PHP-FPM by default.

## Make it yours

- Replace `$installs` with your database of installed stores, keyed by the store address (`dest`). Take the store
  from the verified token, never from the request.
- Add routes next to `/api/me`, and call `authenticate()` first in each.

## Before you ship

- Follow the app design guidelines: https://commmerce.com/blog/commmerceui/#apps--guidelines
  (components and tokens, page structure, App Bridge's save bar, toasts and modals, navigation, states, errors,
  the frame, performance, words, accessibility, branding, data and security).
- Test the app against the marketplace review checklist: https://commmerce.com/blog/commmerceui/#apps--review-checklist
  Each check says how to test it.
