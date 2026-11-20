// Runs one package script in several workspaces, in order, with whichever package manager started it.
//   node scripts/ws.mjs build tokens icons ui      = npm run build in packages/tokens, then icons, then ui
// Why not `npm run build -w @commmerce/x`: Bun rewrites `npm run` inside scripts to `bun run`, which has no -w, so the
// root scripts called themselves forever under Bun. This works the same under npm, Bun and pnpm, on any OS.
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [script, ...pkgs] = process.argv.slice(2);
if (!script || !pkgs.length) {
  console.error('usage: node scripts/ws.mjs <script> <package folder>...');
  process.exit(2);
}

// The package manager that ran the root script tells us where it lives: npm_execpath is npm-cli.js for npm (run it with
// node) and the bun binary for Bun. Run straight from a terminal (no npm_execpath), fall back to npm on the PATH.
const execpath = process.env.npm_execpath;
const [cmd, pre, shell] = !execpath
  ? ['npm', [], process.platform === 'win32']
  : /\.[cm]?js$/.test(execpath)
    ? [process.execPath, [execpath], false]
    : [execpath, [], false];

for (const pkg of pkgs) {
  const r = spawnSync(cmd, [...pre, 'run', script], { cwd: join(root, 'packages', pkg), stdio: 'inherit', shell });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
