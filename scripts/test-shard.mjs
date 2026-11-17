// Runs one CI test shard, with shards split by recorded test time (owner's fast-CI rules, 17 Nov 2026).
//   node scripts/test-shard.mjs <browser> <shard> <shards>   run shard <shard> of <shards> (1-based) in <browser>
//   node scripts/test-shard.mjs record <report.json>...        rewrite scripts/test-times.json from JSON reports
// Every test file of every suite (ui, ui-react with React 18 and 19, app-bridge) is placed longest-first onto the
// least-loaded shard, using scripts/test-times.json (milliseconds per file and browser; files with no recorded time
// count as the median). The plan from scripts/ci-plan.mjs (env CI_TESTS, base ref in CI_BASE) skips suites or runs
// only the tests the change can reach (vitest --changed). Each suite writes a JSON report to test-reports/, which
// CI uploads; `record` turns those reports into new times. Refresh the times when suites grow:
//   gh run download <main run id> -p 'test-reports-*' -D /tmp/r && node scripts/test-shard.mjs record /tmp/r/*/*.json
import { execSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, relative, basename } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const timesFile = join(root, 'scripts/test-times.json');
const PER_FILE_MS = 500; // a file's start-up (page load, imports) on top of its tests' recorded durations

// id: the key in test-times.json and the report name. pkg: the folder. config: a non-default vitest config.
const SUITES = [
  { id: 'ui', pkg: 'ui' },
  { id: 'ui-react', pkg: 'ui-react' },
  { id: 'ui-react@react19', pkg: 'ui-react', config: 'vitest.react19.config.ts', plan: 'ui-react', setup: 'npm ci --prefix react19 --no-audit --no-fund' },
  { id: 'app-bridge', pkg: 'app-bridge' },
];

const testFiles = (pkg) => readdirSync(join(root, 'packages', pkg, 'test')).filter((f) => f.endsWith('.test.ts')).map((f) => `test/${f}`).sort();

export function assign(files, times, shards) {
  const known = files.map((f) => times[f]).filter((t) => t != null).sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 1000;
  const cost = (f) => (times[f] ?? median) + PER_FILE_MS;
  const bins = Array.from({ length: shards }, () => ({ load: 0, files: [] }));
  for (const f of [...files].sort((a, b) => cost(b) - cost(a) || a.localeCompare(b))) {
    const bin = bins.reduce((min, b) => (b.load < min.load ? b : min));
    bin.files.push(f); bin.load += cost(f);
  }
  return bins;
}

function record(reports) {
  const times = existsSync(timesFile) ? JSON.parse(readFileSync(timesFile, 'utf8')) : {};
  for (const r of reports) {
    const [browser, suite] = basename(r, '.json').split('--'); // <browser>--<suite id>--<shard>.json
    const pkgDir = join(root, 'packages', SUITES.find((s) => s.id === suite).pkg);
    const data = JSON.parse(readFileSync(r, 'utf8'));
    for (const t of data.testResults ?? []) {
      // The runner's checkout path differs from this one: keep the part from test/ on.
      const file = t.name.includes('/test/') ? `test/${t.name.split('/test/').pop()}` : relative(pkgDir, t.name);
      // The sum of the file's test durations: start and end times overlap when files run side by side.
      const ms = (t.assertionResults ?? []).reduce((sum, a) => sum + (a.duration ?? 0), 0);
      ((times[browser] ??= {})[`${suite}/${file}`] = Math.round(ms));
    }
  }
  const sorted = Object.fromEntries(Object.keys(times).sort().map((b) => [b, Object.fromEntries(Object.entries(times[b]).sort())]));
  writeFileSync(timesFile, JSON.stringify(sorted, null, 2) + '\n');
  console.log(`recorded ${reports.length} reports into scripts/test-times.json`);
}

function run(browser, shard, shards) {
  const plan = process.env.CI_TESTS ? JSON.parse(process.env.CI_TESTS) : {};
  const base = process.env.CI_BASE;
  const times = (existsSync(timesFile) ? JSON.parse(readFileSync(timesFile, 'utf8')) : {})[browser] ?? {};
  const suites = SUITES.map((s) => ({ ...s, mode: plan[s.plan ?? s.pkg] ?? 'full' })).filter((s) => s.mode !== 'skip');
  const all = suites.flatMap((s) => testFiles(s.pkg).map((f) => `${s.id}/${f}`));
  const bins = assign(all, times, shards);
  bins.forEach((b, i) => console.log(`shard ${i + 1}: ${b.files.length} files, ~${Math.round(b.load / 1000)}s`));
  const mine = bins[shard - 1].files;
  mkdirSync(join(root, 'test-reports'), { recursive: true });
  let failed = false;
  for (const s of suites) {
    const files = mine.filter((f) => f.startsWith(`${s.id}/`)).map((f) => f.slice(s.id.length + 1));
    if (!files.length) continue;
    const cwd = join(root, 'packages', s.pkg);
    if (s.setup) execSync(s.setup, { cwd, stdio: 'inherit' });
    const args = ['vitest', 'run', `--browser.name=${browser}`, '--reporter=default', '--reporter=json',
      `--outputFile.json=${join(root, 'test-reports', `${browser}--${s.id}--${shard}.json`)}`];
    if (s.config) args.push('--config', s.config);
    if (s.mode === 'changed') args.push('--changed', base, '--passWithNoTests');
    console.log(`\n${s.id} (${s.mode}): ${files.join(' ')}`);
    const r = spawnSync('npx', [...args, ...files], { cwd, stdio: 'inherit' });
    if (r.status !== 0) failed = true; // keep going: every suite reports even if an earlier one failed
  }
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b, c, ...rest] = process.argv.slice(2);
  if (a === 'record') record([b, c, ...rest].filter(Boolean));
  else if (a && b && c) run(a, Number(b), Number(c));
  else { console.error('usage: test-shard.mjs <browser> <shard> <shards> | record <report.json>...'); process.exit(2); }
}
