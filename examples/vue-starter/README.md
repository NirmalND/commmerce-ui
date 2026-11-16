# Commmerce UI Vue starter

A small Vue 3 app built with Commmerce UI, installed from npm: one orders screen made of the `cm-*` elements
from `@commmerce/ui`, used directly in Vue templates.

## What the screen shows

- An orders **data table** rendered from an array (`:columns` and `:rows` are passed as properties).
- A **New order** button that opens a **modal** from Vue state (`:open`). Esc, the backdrop and the close button
  fire `cm-close`, and the app puts its state back to closed.
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

## How Vue and the elements fit together

| What | How (see `src/App.vue`, `src/main.js`, `vite.config.mjs`) |
| --- | --- |
| Register the elements | `import '@commmerce/ui'` in `main.js`, **before** `createApp().mount()`. |
| Tokens and fonts | `import '@commmerce/tokens/fonts.css'` and `tokens.css` in `main.js`. |
| Stop Vue resolving `cm-*` as components | `isCustomElement: (tag) => tag.startsWith('cm-')` in `vite.config.mjs`. |
| Arrays and objects | `:rows="orders"`. Vue sets a DOM property when the element has one (it is registered first). |
| Text field | `v-model="draft.customer"`: Vue listens to `input` and reads and writes `value`. |
| Select | `:value` and `@change="draft.status = $event.target.value"`. |
| Checkbox | `:checked` and `@change="draft.paid = $event.target.checked"` (`v-model` would bind `value`, not `checked`). |
| Modal | `:open="modalOpen"` and `@cm-close="modalOpen = false"`. |
| Submit button in the modal footer | `type="submit" form="new-order"`: the footer is outside the `<form>`. |

## Versions

The Commmerce packages are pinned to one exact version (`1.0.0-rc.5`). Vue 3.5.44, Vite 6.4.5.
`package.json` has no `"type": "module"` on purpose: with it, Playwright 1.49 stalls while loading the tests on
Node 25. The Vite config is `vite.config.mjs` instead.
