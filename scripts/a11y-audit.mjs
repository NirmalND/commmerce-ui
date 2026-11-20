// Automated accessibility check of every component example, in light and dark.
// Run after `npm run docs:build`:  node scripts/a11y-audit.mjs [--json out.json]
//
// Opens docs/dev.html in Chromium, and for every component page, every example (and every overlay an example
// opens) and every States section, runs axe-core with the WCAG 2.0/2.1/2.2 A and AA rules on the live components
// (axe reads open shadow roots). Exits 1 if any violation is found. This finds what a machine can find; it does
// not replace testing with screen readers and people.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = createServer((q, r) => {
  const f = join(root, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(root) || !existsSync(f) || statSync(f).isDirectory()) { r.statusCode = 404; return r.end(); }
  r.setHeader('content-type', types[extname(f)] ?? 'application/octet-stream');
  r.end(readFileSync(f));
}).listen(0);
const base = `http://localhost:${srv.address().port}/dev.html`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}#components`);
await page.waitForSelector('a.ccard-link', { state: 'attached' });
const slugs = await page.$$eval('a[href^="#/components/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href').slice('#/components/'.length)).filter((s) => s && !s.includes('/')))]);

if (!slugs.length) throw new Error('No component pages found');
// Reviewed by hand and accepted, with the reason. Matched on component + rule + a piece of the node selector.
const ACCEPTED = [
  { component: 'table-header', rule: 'aria-required-children', target: 'div[role="table"]', html: 'role="table"',
    reason: 'axe counts the <option> column definitions inside cm-table-header as children of the table. They are never rendered (their slot is display:none); Chromium\'s accessibility tree has table > row > columnheader only.' },
];
// axe picks the shortest unique selector, so the same element can get a different selector when the docs page around
// it changes; the element's own opening tag is matched too.
const accepted = (f, node) => ACCEPTED.find((a) => a.component === f.component && a.rule === f.rule && (node.target.includes(a.target) || (a.html && node.html?.includes(a.html))));
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const findings = new Map(); // rule|component -> { rule, impact, help, component, where: Set, sample }
let checks = 0;

async function audit(selector, component, where) {
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  const res = await page.evaluate(async ({ selector: target, tags }) => {
    const r = await window.axe.run(target, { runOnly: { type: 'tag', values: tags }, resultTypes: ['violations'] });
    // WCAG 1.4.3 exempts inactive components: contrast on a disabled control, or on rows dimmed under a loading list.
    const inactive = (n) => {
      const host = document.querySelector(n.target[0]);
      return !!host?.closest('[disabled], [aria-disabled="true"], [loading]');
    };
    return r.violations.map((v) => ({
      rule: v.id, impact: v.impact, help: v.help,
      nodes: v.nodes.filter((n) => !(v.id === 'color-contrast' && inactive(n))).map((n) => ({ target: n.target.flat().join(' >>> '), html: n.html, summary: n.failureSummary })),
    })).filter((v) => v.nodes.length);
  }, { selector, tags: TAGS });
  checks++;
  for (const v of res) {
    const key = `${v.rule}|${component}`;
    const f = findings.get(key) ?? { rule: v.rule, impact: v.impact, help: v.help, component, where: new Set(), nodes: new Map() };
    f.where.add(where);
    for (const n of v.nodes) if (f.nodes.size < 8) f.nodes.set(n.target, { summary: n.summary, html: n.html });
    findings.set(key, f);
  }
}

// Keyboard: Tab from the example picker through the preview. Every stop must show a focus indicator (outline or
// box-shadow), and focus must leave the preview again (no trap).
const keyboard = [];
let tabStops = 0;
async function sweep(slug, where) {
  await page.focus('#exsel');
  let entered = false;
  for (let i = 0; i < 70; i++) {
    await page.keyboard.press('Tab');
    const r = await page.evaluate(() => {
      let a = document.activeElement;
      while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
      const frame = document.querySelector('#frame');
      let inside = false;
      for (let n = a; n; n = n.parentNode || n.host) if (n === frame) { inside = true; break; }
      if (!inside) return { inside };
      // Native date and time inputs take one Tab per part (day, month, hour…) without focus leaving the element.
      // Probe each element once: blur() + focus() would send focus back to its first part, and Tab would never leave.
      const probed = (window.__cmProbed ??= new WeakSet());
      if (probed.has(a)) return { inside, again: true };
      probed.add(a);
      // Focus indicator = some outline, box-shadow or border on the element, its near ancestors (:focus-within) or its
      // descendants (.radio:focus-visible .dot) that changes when focus leaves.
      const near = [a, ...a.querySelectorAll('*')].slice(0, 12);
      for (let n = a.parentNode || a.host, k = 0; n && n.nodeType === 1 && k < 3; n = n.parentNode, k++) near.push(n);
      // Pseudo-elements count too: an interactive cm-card draws its ring on the ::after that covers the card.
      const style = (c) => [c.outlineStyle, c.outlineWidth, c.outlineColor, c.boxShadow, c.borderColor, c.backgroundColor].join();
      const look = () => near.map((n) => [getComputedStyle(n), getComputedStyle(n, '::after'), getComputedStyle(n, '::before')].map(style).join('|'));
      const focused = look();
      a.blur();
      const blurred = look();
      a.focus();
      const ring = focused.some((v, j) => v !== blurred[j]);
      const desc = a.localName + (a.getAttribute('aria-label') ? `[aria-label="${a.getAttribute('aria-label')}"]` : '') + ` "${(a.textContent || a.value || '').trim().slice(0, 30)}"`;
      return { inside, ring, desc };
    });
    if (!r.inside) { if (entered || i > 8) return; continue; } // the picker's own buttons come first
    entered = true;
    if (r.again) continue;
    tabStops++;
    if (!r.ring) keyboard.push(`${slug}: no visible focus on ${r.desc} (${where})`);
  }
  keyboard.push(`${slug}: focus did not leave the preview after 70 Tab presses (${where})`);
}

for (const slug of slugs) {
  await page.goto(`${base}#components--${slug}`);
  await page.waitForSelector('#exsel');
  const examples = await page.$$eval('#exsel option', (os) => os.map((o) => o.textContent));
  await page.addScriptTag({ content: axeSource });
  for (const theme of ['light', 'dark']) {
    await page.click(`#viewer [data-theme="${theme}"]`);
    await page.evaluate((t) => document.querySelectorAll('.state-stage').forEach((s) => (s.dataset.cmTheme = t)), theme);
    for (let i = 0; i < examples.length; i++) {
      await page.selectOption('#exsel', String(i));
      await audit('#stage', slug, `${examples[i]} (${theme})`);
      if (theme === 'light') await sweep(slug, examples[i]);
      // Overlays the example opens: check them open, then close them.
      const openers = await page.$$('#frame [data-opens]');
      for (const o of openers) {
        const id = await o.getAttribute('data-opens');
        const tag = await o.evaluate((e) => e.localName);
        if (tag === 'cm-search') continue;
        await o.click();
        await page.waitForTimeout(250);
        await audit('#stage', slug, `${examples[i]}, ${id} open (${theme})`);
        await page.evaluate((openId) => document.querySelector(`#frame #${openId}`)?.close?.(), id);
        await page.waitForTimeout(250);
      }
      // Fields with a popup (list or calendar): check them with the popup open too.
      const popups = await page.$$('#frame cm-select, #frame cm-combobox, #frame cm-global-search, #frame cm-date-picker, #frame cm-date-range-picker, #frame cm-time-picker');
      for (const p of popups) {
        const tag = await p.evaluate((e) => (e.disabled ? '' : e.localName));
        if (!tag) continue;
        await p.evaluate((e) => (e.show ? e.show() : (e.open = true)));
        await page.waitForTimeout(150);
        await audit('#stage', slug, `${examples[i]}, ${tag} open (${theme})`);
        await p.evaluate((e) => (e.open = false));
      }
    }
    if (await page.$('.state-stage')) await audit('.states', slug, `States (${theme})`);
  }
}
await browser.close();
srv.close();

const all = [...findings.values()].map((f) => ({ ...f, where: [...f.where], nodes: [...f.nodes].map(([target, { summary, html }]) => ({ target, summary, html })) }));
const acceptedHits = all.flatMap((f) => f.nodes.filter((n) => accepted(f, n)).map(() => `${f.component}: ${f.rule} (${accepted(f, f.nodes[0])?.reason ?? ''})`));
const list = all.map((f) => ({ ...f, nodes: f.nodes.filter((n) => !accepted(f, n)) })).filter((f) => f.nodes.length);
const out = process.argv.indexOf('--json');
if (out > 0) writeFileSync(process.argv[out + 1], JSON.stringify({ checks, components: slugs.length, findings: list, keyboard: [...new Set(keyboard)], tabStops, accepted: [...new Set(acceptedHits)], errors }, null, 2));
console.log(`Keyboard: ${tabStops} tab stops checked for a visible focus indicator and no trap.`);
for (const k of new Set(keyboard)) console.log(`✗ ${k}`);
console.log(`axe-core ${JSON.parse(readFileSync(createRequire(import.meta.url).resolve('axe-core/package.json'), 'utf8')).version}: ${slugs.length} components, ${checks} checks (${TAGS.join(', ')}).`);
for (const f of list) console.log(`\n✗ ${f.component}: ${f.rule} [${f.impact}] ${f.help}\n  in: ${f.where.join('; ')}\n${f.nodes.map((n) => `  ${n.target}\n    ${n.summary.split('\n').slice(1).join(' ').trim()}`).join('\n')}`);
for (const a of new Set(acceptedHits)) console.log(`\n(accepted) ${a}`);
if (errors.length) console.log(`\nPage errors:\n${[...new Set(errors)].join('\n')}`);
console.log(list.length ? `\n${list.length} problem(s).` : '\nNo violations found.');
process.exit(list.length || keyboard.length || errors.length ? 1 : 0);
