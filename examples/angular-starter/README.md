# Commmerce UI Angular starter

A small Angular app (standalone components, zoneless, signals) built with Commmerce UI, installed from npm: one
orders screen made of the `cm-*` elements from `@commmerce/ui`, used directly in an Angular template.

## What the screen shows

- An orders **data table** rendered from an array (`[columns]` and `[rows]` are property bindings).
- A **New order** button that opens a **modal** from a signal (`[open]`). Esc, the backdrop and the close button
  fire `cm-close`, and the app puts its state back to closed.
- A **form** in the modal: a text field (with `ngModel`), a select and a checkbox (property binding and events),
  and a summary rendered from state. **Create order** submits the real `<form>`: the app reads
  `new FormData(form)`, adds a row and closes the modal. The customer field is `required`, so an empty form does
  not submit.

## Run it

Node `^22.22.3`, `^24.15.0` or 26 and later (what Angular 22 supports).

```sh
npm install
npm run dev       # ng serve, http://localhost:4200
npm run build     # production build in dist/browser/
npm run preview   # serves dist/browser/ on http://127.0.0.1:4173
```

## Test it

```sh
npx playwright install chromium   # once
npm test                          # builds the app, then checks it in Chromium
```

## How Angular and the elements fit together

| What | How (see `src/app/app.component.*`, `src/main.ts`, `angular.json`) |
| --- | --- |
| Register the elements | `import '@commmerce/ui'` in `main.ts`. |
| Tokens and fonts | `fonts.css` and `tokens.css` from `node_modules/@commmerce/tokens/dist/` in `angular.json` `styles`. |
| Allow `cm-*` tags | `schemas: [CUSTOM_ELEMENTS_SCHEMA]` on the component. Bindings on `cm-*` elements are then not type-checked. |
| Arrays and objects | `[rows]="orders()"`: square brackets bind the DOM property. |
| Text field | `ngDefaultControl [(ngModel)]="customer"` (Angular's default value accessor: listens to `input`, sets `value`). |
| Select | `[value]="status()"` and `(change)="onStatus($event)"`, reading `(e.target as CmSelect).value`. |
| Checkbox | `[checked]="paid()"` and `(change)="onPaid($event)"`, reading `(e.target as CmCheckbox).checked`. |
| Modal | `[open]="modalOpen()"` and `(cm-close)="modalOpen.set(false)"`. |
| Native form validation | `<form ngNoForm>`. With `FormsModule` imported, Angular otherwise adds `novalidate` to every form and `required` no longer blocks submission. |
| Submit button in the modal footer | `type="submit" form="new-order"`: the footer is outside the `<form>`. |

## Versions

The Commmerce packages are pinned to one exact version (`1.0.0-rc.4`). Angular 22.2.4, TypeScript 6.0.3.
