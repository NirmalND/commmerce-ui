# Commmerce UI Svelte starter

A small Svelte 5 app built with Commmerce UI, installed from npm: one orders screen made of the `cm-*` elements
from `@commmerce/ui`, used directly in Svelte markup.

## What the screen shows

- An orders **data table** rendered from an array (`columns` and `rows` are passed as properties).
- A **New order** button that opens a **modal** from Svelte state (`open={modalOpen}`). Esc, the backdrop and the
  close button fire `cm-close`, and the app puts its state back to closed.
- A **form** in the modal: a text field, a select and a checkbox, each two-way bound to state, and a summary
  rendered from that state. **Create order** submits the real `<form>`: the app reads `new FormData(form)`,
  adds a row and closes the modal. The customer field is `required`, so an empty form does not submit.

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

## How Svelte and the elements fit together

| What | How (see `src/App.svelte`, `src/main.js`, `vite.config.mjs`) |
| --- | --- |
| Register the elements | `import '@commmerce/ui'` in `main.js`, **before** `mount()`. |
| Tokens and fonts | `import '@commmerce/tokens/fonts.css'` and `tokens.css` in `main.js`. |
| Arrays and objects | `rows={orders}`. Svelte sets a DOM property when the element has one (it is registered first). |
| Text field | `value={draft.customer}` and `oninput={(e) => (draft.customer = e.currentTarget.value)}`. `bind:value` is for native inputs only. |
| Select | `value={…}` and `onchange={(e) => (draft.status = e.currentTarget.value)}`. |
| Checkbox | `checked={…}` and `onchange={(e) => (draft.paid = e.currentTarget.checked)}`. |
| Modal | `open={modalOpen}` and `oncm-close={() => (modalOpen = false)}` (Svelte 5 event attribute for `cm-close`). |
| Submit button in the modal footer | `type="submit" form="new-order"`: the footer is outside the `<form>`. |
| a11y warnings | Svelte can't see inside custom elements, so it warns about click handlers on `cm-button` (it renders a real `<button>`). `vite.config.mjs` silences those two warnings for `cm-button` only. |

## Versions

The Commmerce packages are pinned to one exact version (`1.0.0-rc.5`). Svelte 5.57.3, Vite 6.4.5.
`package.json` has no `"type": "module"` on purpose: with it, Playwright 1.49 stalls while loading the tests on
Node 25. The Vite config is `vite.config.mjs` instead.
