// Keeps "sideEffects" in packages/ui/package.json listing every component file by name.
// Each components/*.js registers its custom element when imported, so bundlers must never drop it. A wildcard
// ("./dist/components/*.js") says the same thing, but Bun's bundler doesn't support wildcards there and then turns off
// tree-shaking for the whole package. Named files work in every bundler (webpack, Rollup/Vite, esbuild, Parcel, Bun).
//   node scripts/sync-side-effects.mjs           rewrite the list (the ui build runs this)
//   node scripts/sync-side-effects.mjs --check   exit 1 if the list is out of date (CI lint job)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgFile = join(root, 'packages/ui/package.json');
const components = readdirSync(join(root, 'packages/ui/src/components'))
  .filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'))
  .map((f) => `./dist/components/${f.replace(/\.ts$/, '.js')}`)
  .sort();
const want = ['./dist/index.js', './dist/cdn.js', ...components];

const text = readFileSync(pkgFile, 'utf8');
const pkg = JSON.parse(text);
if (JSON.stringify(pkg.sideEffects) === JSON.stringify(want)) process.exit(0);

if (process.argv.includes('--check')) {
  console.error('packages/ui/package.json "sideEffects" is out of date. Run: node scripts/sync-side-effects.mjs');
  process.exit(1);
}
pkg.sideEffects = want;
writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + (text.endsWith('\n') ? '\n' : ''));
console.log(`ui: sideEffects lists ${components.length} components`);
