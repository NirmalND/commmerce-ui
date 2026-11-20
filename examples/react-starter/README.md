# Commmerce UI React starter

A complete React app built with Commmerce UI, installed from npm: one orders screen, made only from ready
components through the React wrappers (`@commmerce/ui-react`).

## What the screen shows

- **Status tabs** (All, Unprocessed, Processing, Fulfilled) with counts, filtering the list.
- **Search** by order number or customer. When nothing matches, the list shows an **empty state**.
- A selectable **resource list** of orders. Select rows and a **bulk action** ("Mark as fulfilled") appears;
  running it shows a **toast**.
- **Pagination** under the list, with rows per page.
- **Edit product** on each row opens a **side panel** with a small form (title, price, SKU). The **save bar**
  appears once something changes; Save checks the fields and shows an error under each one that needs fixing.

Every input is controlled: values live in React state and come back through the wrappers' `onInput`,
`onChange` and custom event props (`onSelectionChange`, `onPageChange`, `onSave`…).

## Prerequisites

- Node 18 or later, and npm.

## Run it

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # production build in dist/
npm run preview   # serves dist/
```

## Test it

```sh
npx playwright install chromium   # once
npm test                          # builds the app, then checks it in Chromium
```

The tests (`tests/app.spec.js`) open the built app and check that it renders, the tabs filter, search shows the
empty state, selecting rows and running the bulk action shows a toast, and the product form validates.

## Files

| File | What it does |
| --- | --- |
| `src/main.jsx` | Loads the fonts and tokens (`@commmerce/tokens/fonts.css`, `tokens.css`) and renders the app. |
| `src/App.jsx` | The orders screen: tabs, search, list, bulk action, pagination. |
| `src/ProductPanel.jsx` | The product form in a side panel, with validation and the save bar. |
| `src/notify.js` | Toasts: the admin's toast through App Bridge when embedded, otherwise an in-page one. |
| `src/data.js` | Sample orders and products. |
| `src/app.css` | Page background and the order row columns. |
| `tests/app.spec.js`, `playwright.config.js` | The browser tests. |

## Where to change things

- **Your data**: replace `src/data.js` with calls to your backend. In `App.jsx`, send `status`, `query`, `page` and
  `pageSize` to your API instead of filtering in the browser, and set `total` from its response.
- **The bulk action**: `markFulfilled()` in `App.jsx`. Add more buttons with `slot="bulk-actions"`.
- **Form fields and rules**: `validate()` and the fields in `ProductPanel.jsx`.
- **Row columns**: the `.order-row` grid in `src/app.css` and the row markup in `App.jsx`.
- **Components**: everything is imported from `@commmerce/ui-react`. Each component's props and events are on its
  page in the Commmerce UI docs.

## Inside the Commmerce admin (optional)

`src/notify.js` is the only file that knows about App Bridge. When the page runs in a frame and its address has
`?host=`, which is how the admin opens an embedded app, it connects with `createApp` from `@commmerce/app-bridge`,
calls `autoResize()`, and shows toasts with `app.toast.show()` over the whole admin. Anywhere else, or if the admin
does not answer, it uses an in-page toast (`showToast` from `@commmerce/ui-react`).

Set the admin's origin in `.env.local`, never in code:

```sh
VITE_COMMMERCE_ADMIN_ORIGIN=https://*.commmerce.com   # any Commmerce admin, or one exact origin
VITE_COMMMERCE_API_KEY=your-api-key
```

Without `VITE_COMMMERCE_ADMIN_ORIGIN` the app never connects. If your app never runs in the admin, delete
`src/notify.js`, call `showToast()` directly and remove `@commmerce/app-bridge` from `package.json`.
For session tokens and a backend that verifies them, see the Node and PHP starter apps in the docs.

## Before you ship

- Follow the app design guidelines: https://commmerce.com/commmerceui/#apps--guidelines
  (components and tokens, page structure, App Bridge's save bar, toasts and modals, navigation, states, errors,
  the frame, performance, words, accessibility, branding, data and security).
- Test the app against the marketplace review checklist: https://commmerce.com/commmerceui/#apps--review-checklist
  Each check says how to test it.

## Versions

The Commmerce packages are pinned to one exact version (`1.0.0-rc.5`). To upgrade, change all four together
after reading the release notes. React is pinned to 19.3.1, the version the wrappers are tested with
(React 18.3.1 is tested too).

`package.json` has no `"type": "module"` on purpose: with it, Playwright 1.49 stalls while loading the tests
on Node 25 (seen with 25.9). The Vite config is `vite.config.mjs` instead.
