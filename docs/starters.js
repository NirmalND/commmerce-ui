// The framework starter apps (examples/<dir>/). scripts/build-docs.mjs copies these files into docs/vendor/<dir>/,
// and the Frameworks page links each one for download. Source files only: no node_modules/, dist/ or .next/.
const SPEC = ['tests/app.spec.js', 'Browser tests (the same five for every framework): the table renders, the modal opens and closes from state (also after Esc), the fields are two-way bound, `required` blocks submission, submitting reads FormData and adds a row.'];
const LOCK = ['package-lock.json', 'Exact versions of every dependency, for `npm ci`.'];
const GITIGNORE = ['.gitignore', 'Keeps installed packages and build output out of git.'];

export const FRAMEWORK_STARTERS = [
  { id: 'vue', name: 'Vue 3', dir: 'vue-starter', stack: 'Vite 6 and Vue 3.5', files: [
    ['README.md', 'How to run and test it, and a table of how each binding works.'],
    ['package.json', 'Scripts: `dev`, `build`, `preview`, `test`. Commmerce packages pinned to one version.'], LOCK,
    ['index.html', 'The page Vite serves.'],
    ['vite.config.mjs', 'The Vue plugin with `isCustomElement` for `cm-` tags.'],
    ['playwright.config.js', 'Runs the tests in Chromium against the built app.'],
    ['src/main.js', 'Loads fonts and tokens, registers the elements, mounts the app.'],
    ['src/App.vue', 'The orders table, the modal and the form.'],
    ['src/data.js', 'Sample orders and the row built from `FormData`.'],
    ['src/app.css', 'Page background and type from the tokens.'],
    SPEC, GITIGNORE,
  ] },
  { id: 'angular', name: 'Angular', dir: 'angular-starter', stack: 'Angular 22 (standalone, zoneless, signals)', files: [
    ['README.md', 'How to run and test it, and a table of how each binding works.'],
    ['package.json', 'Scripts: `dev`, `build`, `preview`, `test`. Commmerce packages pinned to one version.'], LOCK,
    ['angular.json', 'Build config: fonts and tokens in `styles`.'],
    ['tsconfig.json', 'Strict TypeScript and strict templates.'],
    ['serve.mjs', 'Serves the built app for the tests (no extra packages).'],
    ['playwright.config.js', 'Runs the tests in Chromium against the built app.'],
    ['src/index.html', 'The page.'],
    ['src/main.ts', 'Registers the elements and bootstraps the app.'],
    ['src/styles.css', 'Page background and type from the tokens.'],
    ['src/app/app.component.ts', 'The component: `CUSTOM_ELEMENTS_SCHEMA`, signals, the submit handler.'],
    ['src/app/app.component.html', 'The orders table, the modal and the form.'],
    ['src/app/data.ts', 'Sample orders (typed with the package\'s `DataTableColumn`, `SelectOption`).'],
    SPEC, GITIGNORE,
  ] },
  { id: 'svelte', name: 'Svelte 5', dir: 'svelte-starter', stack: 'Vite 6 and Svelte 5.57', files: [
    ['README.md', 'How to run and test it, and a table of how each binding works.'],
    ['package.json', 'Scripts: `dev`, `build`, `preview`, `test`. Commmerce packages pinned to one version.'], LOCK,
    ['index.html', 'The page Vite serves.'],
    ['vite.config.mjs', 'The Svelte plugin; silences two a11y warnings for `cm-button` only.'],
    ['playwright.config.js', 'Runs the tests in Chromium against the built app.'],
    ['src/main.js', 'Loads fonts and tokens, registers the elements, mounts the app.'],
    ['src/App.svelte', 'The orders table, the modal and the form.'],
    ['src/data.js', 'Sample orders and the row built from `FormData`.'],
    ['src/app.css', 'Page background and type from the tokens.'],
    SPEC, GITIGNORE,
  ] },
  { id: 'next', name: 'Next.js', dir: 'next-starter', stack: 'Next.js 16 App Router, React 19 and `@commmerce/ui-react`', files: [
    ['README.md', 'How to run and test it, and exactly what server rendering needs.'],
    ['package.json', 'Scripts: `dev`, `build`, `start`, `test`. Commmerce packages pinned to one version.'], LOCK,
    ['next.config.mjs', 'Empty: nothing special is needed.'],
    ['playwright.config.js', 'Runs the tests in Chromium against `next start`.'],
    ['app/layout.jsx', 'Loads fonts and tokens; the `<html>` element.'],
    ['app/page.jsx', 'Server component: renders the client component.'],
    ['app/Orders.jsx', '`\'use client\'`: the table, the modal and the form, with the React wrappers.'],
    ['app/data.js', 'Sample orders and the row built from `FormData`.'],
    ['app/app.css', 'Page background and type from the tokens.'],
    SPEC, GITIGNORE,
  ] },
];
