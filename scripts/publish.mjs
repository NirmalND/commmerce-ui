// Publishes @commmerce/tokens, icons, ui, ui-react and app-bridge to npm, in dependency order.
//   node scripts/publish.mjs        dry run: builds, tests, and shows exactly what would be published
//   node scripts/publish.mjs --yes  publishes (needs `npm login` as the npm user "commmerce", which owns the @commmerce scope)
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const yes = process.argv.includes('--yes');
const run = (cmd) => { console.log(`$ ${cmd}`); execSync(cmd, { stdio: 'inherit' }); };
const names = ['tokens', 'icons', 'ui', 'ui-react', 'app-bridge'];
const versions = names.map((n) => JSON.parse(readFileSync(`packages/${n}/package.json`, 'utf8')).version);
if (new Set(versions).size !== 1) throw new Error(`versions differ: ${versions.join(', ')}`);
const version = versions[0];
console.log(`Commmerce UI ${version}${yes ? '' : ' (dry run)'}`);
if (yes) {
  try { console.log(`npm user: ${execSync('npm whoami').toString().trim()}`); }
  catch { throw new Error('Not logged in to npm. Run `npm login` first.'); }
}
run('npm run build');
run('npm test');
run('node scripts/build-docs.mjs');          // fails if the release note for this version is missing
run('node scripts/test-packages.mjs chromium');
// Release candidates (1.0.0-rc.1) go to the `next` dist-tag, so `npm install @commmerce/ui` keeps the last final release.
const tag = version.includes('-') ? ' --tag next' : '';
for (const n of names) run(`npm publish --workspace @commmerce/${n} --access public${tag}${yes ? '' : ' --dry-run'}`);
console.log(yes ? `Published ${version}. Tag it: git tag v${version} && git push --tags` : 'Dry run complete. Re-run with --yes to publish.');
