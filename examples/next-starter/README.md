# Commmerce UI Next.js starter

A small Next.js app (App Router) built with Commmerce UI's React wrappers (`@commmerce/ui-react`), installed
from npm.

## What the screen shows

- An orders **data table** rendered from an array.
- A **New order** button that opens a **modal** from React state (`open`). Esc, the backdrop and the close button
  fire `cm-close` (`onClose`), and the app puts its state back to closed.
- A **form** in the modal: a text field, a select and a checkbox, each controlled by state, and a summary
  rendered from that state. **Create order** submits the real `<form>`: the app reads `new FormData(form)`,
  adds a row and closes the modal. The customer field is `required`, so an empty form does not submit.

## Run it

```sh
npm install
npm run dev       # http://localhost:3000
npm run build     # production build
npm start         # serves the build
```

## Test it

```sh
npx playwright install chromium   # once
npm test                          # builds the app, then checks it in Chromium (next start)
```

## Server rendering: what is needed

- **Use the wrappers only in client components.** `app/Orders.jsx` starts with `'use client'`; `app/page.jsx`
  (a server component) renders it. Importing a wrapper straight into a server component fails the build
  (`TypeError: useRef is not a function` while prerendering): the wrappers use React hooks.
- **Nothing else is needed**: no `next/dynamic`, no `ssr: false`. On the server, Lit's built-in shims let the
  package load; the server HTML contains the bare `<cm-…>` tags, and the wrappers set their properties and
  register the elements once the page hydrates. The tests check the built app (`next start`) has no hydration
  or console errors, and the same tests pass against `next dev`.
- Until hydration the elements are unstyled tags: children (button text) are in the HTML, but anything passed
  as a property (button variants, field labels, the modal heading) appears a moment later. For pages where that matters, keep Commmerce UI below the fold or
  show a skeleton.
- **Tokens and fonts** are plain CSS imported in `app/layout.jsx`, so they are in the server HTML.

## Files

| File | What it does |
| --- | --- |
| `app/layout.jsx` | Loads `@commmerce/tokens/fonts.css` and `tokens.css`; the `<html>` element. |
| `app/page.jsx` | Server component: renders the client component. |
| `app/Orders.jsx` | `'use client'`: the table, the modal and the form. |
| `app/data.js` | Sample orders and the row built from `FormData`. |

## Versions

The Commmerce packages are pinned to one exact version (`1.0.0-rc.4`). Next.js 16.4.3, React 19.3.1,
Playwright 1.64.1 (Next.js asks for 1.51.1 or later).
