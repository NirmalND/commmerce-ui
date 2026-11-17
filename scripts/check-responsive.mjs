// Responsive check of every docs page, in Chromium and WebKit.
//   node scripts/check-responsive.mjs [url] [--browsers chromium,webkit] [--widths 320,1440] [--only /components/button]
// Default url: http://127.0.0.1:4500/docs/dev.html (any static server over the repo root; dev.html is what
// `node scripts/build-docs.mjs` writes, and the same document the public site serves).
//
// Routes come from the app's own navigation: every section in the top bar, then every page in that section's
// sidebar. Each page is checked at each width for:
//   - horizontal page overflow: document.scrollingElement.scrollWidth > innerWidth + 1
//   - page errors and console errors
//   - docs text (outside live component previews) with a computed font-size below 12px
//   - navigation links and controls (buttons, selects, inputs, tabs, summaries, links in nav and card links)
//     with a hit area under 24x24 CSS px; inline text links inside sentences are exempt (WCAG 2.5.8)
// Exits 1 if anything fails.
import { chromium, webkit } from 'playwright';

const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : null; };
const browsersArg = opt('--browsers'), widthsArg = opt('--widths'), only = opt('--only');
const base = (args[0] ?? 'http://127.0.0.1:4500/docs/dev.html').replace(/#.*$/, '');
const WIDTHS = (widthsArg ?? '320,360,375,390,430,1440').split(',').map(Number);
const ENGINES = { chromium, webkit };
const BROWSERS = (browsersArg ?? 'chromium,webkit').split(',');
const toHash = (path) => (path === '/' ? '' : path.slice(1).replace(/\//g, '--'));

// Collect routes once, from the rendered navigation.
async function collectRoutes(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base);
  await page.waitForSelector('.topnav a');
  const sections = await page.$$eval('.topnav a', (as) => as.map((a) => a.getAttribute('href').slice(1)));
  const routes = new Set(['/']);
  for (const s of sections) {
    await page.evaluate((h) => { location.hash = h; }, s.replace(/^\//, '').replace(/\//g, '--'));
    await page.waitForFunction((p) => document.querySelector(`#sidebar a[href="#${p}"]`), s);
    for (const h of await page.$$eval('#sidebar nav:not(.mobile-sections) a', (as) => as.map((a) => a.getAttribute('href').slice(1)))) routes.add(h);
  }
  await page.close();
  return [...routes];
}

// Runs in the page: returns a list of problems on the current route.
function inspect() {
  const problems = [];
  const se = document.scrollingElement;
  if (se.scrollWidth > innerWidth + 1) {
    // Name the outermost elements that stick out and are not clipped by a scrolling ancestor.
    const clipped = (el) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { if (getComputedStyle(a).overflowX !== 'visible') return true; } return false; };
    const sticks = (el) => { const r = el.getBoundingClientRect(); return r.width && r.right > innerWidth + 1 && getComputedStyle(el).position !== 'fixed' && !clipped(el); };
    const wide = [...document.querySelectorAll('body *')].filter(sticks)
      .filter((el) => !el.parentElement || !sticks(el.parentElement)).slice(0, 3)
      .map((el) => `${el.localName}${el.id ? '#' + el.id : ''}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} (right ${Math.round(el.getBoundingClientRect().right)})`);
    problems.push(`overflow: scrollWidth ${se.scrollWidth} > ${innerWidth}${wide.length ? ': ' + wide.join(', ') : ''}`);
  }
  const visible = (el) => {
    if (el.closest('[hidden], [inert], details:not([open]) > :not(summary)')) return false;
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  // Live component previews render the components at their designed sizes; they are tested in packages/ui.
  const PREVIEW = '.ex-stage, .ccard .thumb, .admin-frame, .ab-host, [data-specimen], cm-toast, .toast';
  const inPreview = (el) => !!el.closest(PREVIEW) || el.getRootNode() !== document;
  // Small text.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const small = new Map();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || inPreview(el) || /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|OPTION)$/.test(el.tagName) || el.closest('cm-badge, cm-tag')) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12 && visible(el)) small.set(`${el.localName}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} ${size}px "${n.textContent.trim().slice(0, 30)}"`, 1);
  }
  for (const k of [...small.keys()].slice(0, 5)) problems.push(`small text: ${k}`);
  // Hit areas. Inline text links (inside a sentence: p, li, td, dd, figcaption, small) are exempt.
  const CONTROLS = 'button, select, input:not([type=hidden]), [role=tab], summary, nav a, .related a, .avail-item, .pcard, .ccard-link, .pager a, .path-card, h2 .anchor, .toc a, .to-top';
  const tiny = new Map();
  for (const el of document.querySelectorAll(CONTROLS)) {
    if (inPreview(el) || !visible(el)) continue;
    if (el.localName === 'a' && !el.matches('nav a, .related a, .avail-item, .pcard, .pager a, .path-card, .toc a, .to-top') && el.closest('p, li, td, dd, small, figcaption')) continue;
    let r = el.getBoundingClientRect();
    // A card link stretched over its card (::after) is as big as the card.
    if (el.matches('.ccard-link')) r = el.closest('.ccard').getBoundingClientRect();
    if (r.width < 24 - 0.5 || r.height < 24 - 0.5) {
      const label = (el.getAttribute('aria-label') || el.textContent || el.value || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      tiny.set(`${el.localName}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${label}" ${Math.round(r.width)}x${Math.round(r.height)}`, 1);
    }
  }
  for (const k of [...tiny.keys()].slice(0, 5)) problems.push(`hit area: ${k}`);
  return problems;
}

const failures = [];
let checked = 0;
const started = Date.now();
let routes;
for (const name of BROWSERS) {
  const browser = await ENGINES[name].launch();
  routes ??= only ? only.split(',') : await collectRoutes(browser);
  if (name === BROWSERS[0]) console.log(`${routes.length} pages × ${WIDTHS.length} widths × ${BROWSERS.length} browsers (${base})`);
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    let errors = [];
    page.on('pageerror', (e) => errors.push(`page error: ${e.message}`));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(`console error: ${m.text().slice(0, 200)}`); });
    await page.goto(base);
    await page.waitForSelector('#main .page');
    for (const path of routes) {
      errors = [];
      await page.evaluate((h) => { if (location.hash.slice(1) !== h) location.hash = h; }, toHash(path));
      await page.waitForFunction((h) => (location.hash.slice(1) === h) && document.querySelector('#main .page'), toHash(path));
      // Let custom elements upgrade and lay out, and late errors arrive.
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 120)))));
      const problems = [...errors, ...await page.evaluate(inspect)];
      checked++;
      if (problems.length) failures.push({ name, width, path, problems });
    }
    await ctx.close();
    process.stdout.write(`${name} ${width}px done\n`);
  }
  await browser.close();
}

const secs = Math.round((Date.now() - started) / 1000);
if (failures.length) {
  for (const f of failures) console.log(`\n✗ ${f.name} ${f.width}px ${f.path}\n  ${f.problems.join('\n  ')}`);
  console.log(`\n${failures.length} of ${checked} page views failed (${secs}s).`);
  process.exit(1);
}
console.log(`All ${checked} page views passed: ${routes.length} pages × ${WIDTHS.length} widths (${WIDTHS.join(', ')}) × ${BROWSERS.length} browsers (${BROWSERS.join(', ')}), ${secs}s.`);
