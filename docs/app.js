import { components, planned, groupsOrder } from './content.js';
import { STATUS, PREVIEW, SUPPORT_EMAIL, packages, patterns, statesHtml, orderListHtml, wireOrderList } from './site.js';
import { releaseNotes } from './releases.js';
import { iconNames } from './vendor/icons/index.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Inline markdown: `code` and **bold** only.
const md = (s) => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/\[\[([^|\]]+)\|(\/[^\]]*)\]\]/g, '<a href="#$2">$1</a>');
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Data files resolve next to this script, so a versioned release folder serves all of them together.
const asset = (p) => new URL(p, import.meta.url).href;
// Toast examples: a button with data-toast="<message>" calls showToast() (data-toast-tone, data-toast-action optional).
const wireToasts = (root) => root.querySelectorAll('[data-toast]').forEach((b) => b.addEventListener('click', async () => {
  const { showToast } = await import(asset('vendor/cdn.js'));
  const d = b.dataset;
  showToast(d.toast, { tone: d.toastTone || undefined,
    action: d.toastAction ? { label: d.toastAction, onAction: () => showToast('Change undone') } : undefined });
}));
const [manifest, tokenData] = await Promise.all([
  fetch(asset('vendor/custom-elements.json')).then((r) => r.json()),
  fetch(asset('vendor/tokens.json')).then((r) => r.json()),
]);
const decl = (tag) => manifest.modules.flatMap((m) => m.declarations ?? []).find((d) => d.tagName === tag);
const tokens = tokenData.tokens;
const colorTokens = tokens.filter((t) => t.family === 'color');

/* ---------------- Facts shown on the site (computed, never typed in) ---------------- */
const FACTS = {
  ready: components.length,
  inProgress: planned.filter((p) => p.status === 'in-progress').length,
  planned: planned.filter((p) => p.status === 'planned').length,
  tokens: tokens.length,
  colors: colorTokens.length,
  icons: iconNames.length,
  // Heading ids are versions with dashes: v0-9-0 -> 0.9.0, v1-0-0-rc-1 -> 1.0.0-rc.1.
  release: (releaseNotes.match(/<h2 id="v(\d[\w-]*)"/) ?? [, '0-1-0'])[1]
    .replace(/^(\d+)-(\d+)-(\d+)(?:-(.+))?$/, (_, a, b, c, pre) => `${a}.${b}.${c}${pre ? `-${pre.replace(/-/g, '.')}` : ''}`),
};
const namesBy = (st) => { const n = planned.filter((p) => p.status === st).map((p) => p.name); return n.length > 4 ? `${n.slice(0, 4).join(', ')} and more` : n.join(', ') || 'None'; };
const byGroup = (list) => { const g = {}; list.forEach((c) => (g[c.group] ??= []).push(c)); return g; };
const orderedComponents = [...components].sort((a, b) => groupsOrder.indexOf(a.group) - groupsOrder.indexOf(b.group));

/* ---------------- Site map ---------------- */
const SECTIONS = [
  { id: 'start', title: 'Get started', pages: [
    { path: '/start', title: 'Quickstart' },
    { path: '/start/install', title: 'Install and frameworks' },
    { path: '/start/themes', title: 'Themes and tokens' },
    { path: '/start/flutter', title: 'Flutter' },
    { path: '/start/troubleshooting', title: 'Troubleshooting' },
  ] },
  { id: 'apps', title: 'Build an admin app', pages: [
    { path: '/apps', title: 'How apps run in the admin' },
    { path: '/apps/native', title: 'What makes an app native' },
    { path: '/apps/page-structure', title: 'Page structure' },
    { path: '/apps/app-bridge', title: 'App Bridge' },
    { path: '/apps/starter', title: 'Starter app' },
  ] },
  { id: 'components', title: 'Components', pages: [{ path: '/components', title: 'All components' },
    ...orderedComponents.map((c) => ({ path: `/components/${c.slug}`, title: c.name, group: c.group })),
    ...planned.map((p) => ({ path: `/components/${p.slug}`, title: p.name, group: 'Not available yet', status: p.status }))] },
  { id: 'patterns', title: 'Patterns', pages: [{ path: '/patterns', title: 'All patterns' },
    ...patterns.map((p) => ({ path: `/patterns/${p.slug}`, title: p.name }))] },
  { id: 'foundations', title: 'Foundations', pages: [
    { path: '/foundations/accessibility', title: 'Accessibility', group: 'Principles' },
    { path: '/foundations/content', title: 'Content', group: 'Principles' },
    { path: '/foundations/tokens', title: 'Tokens', group: 'Design' },
    { path: '/foundations/colors', title: 'Colour', group: 'Design' },
    { path: '/foundations/typography', title: 'Typography', group: 'Design' },
    { path: '/foundations/spacing', title: 'Spacing', group: 'Design' },
    { path: '/foundations/shape', title: 'Shape and depth', group: 'Design' },
    { path: '/foundations/logo', title: 'Logo', group: 'Design' },
  ] },
  { id: 'icons', title: 'Icons', pages: [{ path: '/icons', title: 'Icon gallery' }] },
  { id: 'releases', title: 'Releases and support', pages: [
    { path: '/releases', title: 'Release notes' },
    { path: '/releases/stability', title: 'Versioning and stability' },
    { path: '/support', title: 'Support and compatibility' },
    { path: '/contributing', title: 'Contributing' },
  ] },
];
const allPages = SECTIONS.flatMap((s) => s.pages.map((p) => ({ ...p, section: s })));
// Addresses from the first version of the site keep working.
const REDIRECTS = {
  '/getting-started': '/start', '/getting-started/install': '/start/install', '/getting-started/themes': '/start/themes',
  '/getting-started/apps': '/apps', '/tokens': '/foundations/tokens', '/whats-new': '/releases',
};

/* ---------------- Code: highlight + HTML→React ---------------- */
function highlight(code, lang) {
  const re = lang === 'jsx'
    ? /(\/\/[^\n]*|\{\/\*[\s\S]*?\*\/\})|(<\/?[A-Za-z][\w.-]*)|("[^"]*"|'[^']*')|(\s[\w-:]+)(?==)|(\b(?:import|from|export|const|return|function)\b)/g
    : lang === 'sh'
      ? /(#[^\n]*)|(\b\B)|("[^"]*")|(\s--?[\w-]+)|(\b(?:npm|npx)\b)/g
      : /(<!--[\s\S]*?-->|\/\*[\s\S]*?\*\/)|(<\/?[a-z][\w-]*)|("[^"]*")|(\s[\w-:@]+)(?==)|(\b\B)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(code))) {
    out += esc(code.slice(last, m.index));
    const [t] = m;
    out += m[1] ? `<span class="tk-com">${esc(t)}</span>` : m[2] ? `<span class="tk-tag">${esc(t)}</span>`
      : m[3] ? `<span class="tk-str">${esc(t)}</span>` : m[4] ? `<span class="tk-attr">${esc(t)}</span>` : `<span class="tk-tag">${esc(t)}</span>`;
    last = m.index + t.length;
  }
  return out + esc(code.slice(last));
}

// `parts` are child elements documented on their parent's page (e.g. cm-radio inside cm-radio-group).
const reactName = Object.fromEntries(components.flatMap((c) => [[c.tag, c.react], ...(c.parts ?? []).map((p) => [p.tag, p.react])]));
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const reactEvent = (name) => 'on' + camel(name.replace(/^cm-/, '')).replace(/^./, (x) => x.toUpperCase());
const ATTR = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex' };
function toReact(html) {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const used = new Set();
  const walk = (node, depth) => {
    const pad = '  '.repeat(depth);
    if (node.nodeType === 3) { const t = node.textContent.replace(/\s+/g, ' ').trim(); return t ? pad + t.replace(/[{}]/g, (c) => `{'${c}'}`) : ''; }
    if (node.nodeType !== 1) return '';
    const tag = node.localName, name = reactName[tag] ?? tag;
    if (reactName[tag]) used.add(name);
    const props = [...node.attributes].map(({ name: a, value: v }) => {
      if (a === 'style') {
        const obj = v.split(';').filter((d) => d.trim()).map((d) => { const i = d.indexOf(':'); const k = d.slice(0, i).trim(); return `${k.startsWith('--') ? `'${k}'` : camel(k)}: '${d.slice(i + 1).trim()}'`; });
        return `style={{ ${obj.join(', ')} }}`;
      }
      if (/^on/.test(a)) return `on${a[2].toUpperCase()}${a.slice(3)}={(event) => { /* … */ }}`;
      const p = ATTR[a] ?? (reactName[tag] ? camel(a) : a);
      // JSON attribute values (arrays and objects, e.g. a data table's columns) become JavaScript values.
      if (reactName[tag] && /^\s*[[{]/.test(v)) { try { return `${p}={${JSON.stringify(JSON.parse(v))}}`; } catch { /* plain text */ } }
      return v === '' ? p : `${p}=${v.includes('"') ? `{${JSON.stringify(v)}}` : `"${v}"`}`;
    });
    const open = `${pad}<${name}${props.length ? ' ' + props.join(' ') : ''}`;
    const kids = [...node.childNodes].map((c) => walk(c, depth + 1)).filter(Boolean);
    if (!kids.length) return `${open} />`;
    if (kids.length === 1 && node.childNodes.length === 1 && node.firstChild.nodeType === 3 && kids[0].length < 60) return `${open}>${kids[0].trim()}</${name}>`;
    return `${open}>\n${kids.join('\n')}\n${pad}</${name}>`;
  };
  const body = [...doc.body.childNodes].map((n) => walk(n, 0)).filter(Boolean);
  const root = body.length > 1 ? `<>\n${body.map((l) => l.replace(/^/gm, '  ')).join('\n')}\n</>` : body[0];
  return `import { ${[...used].join(', ')} } from '@commmerce/ui-react';\n\n${root}`;
}

// Layout helpers the examples use, written inline so copied code works anywhere.
const ROW = 'display:flex;flex-wrap:wrap;gap:20px;align-items:center';
const STACK = 'display:grid;gap:30px';
const mergeStyle = (a, b = '') => {
  const m = new Map();
  for (const d of `${a};${b}`.split(';')) { const i = d.indexOf(':'); if (i > 0) m.set(d.slice(0, i).trim(), d.slice(i + 1).trim()); }
  return [...m].map(([k, v]) => `${k}:${v}`).join(';');
};
const inlineLayout = (html) => html.replace(/class="(row|stack)"(?: style="([^"]*)")?/g,
  (_, k, extra) => `style="${mergeStyle(k === 'row' ? ROW : STACK, extra)}"`);

/* ---------------- UI helpers ---------------- */
function toast(msg) {
  const t = Object.assign(document.createElement('div'), { className: 'toast', role: 'status', textContent: msg });
  document.body.append(t); setTimeout(() => t.remove(), 1600);
}
async function copy(text, what = 'Text') {
  try { await navigator.clipboard.writeText(text); toast(`${what} copied`); } catch { toast('Copy failed: select the text and copy it'); }
}
const h2 = (title, id = slugify(title)) => `<h2 id="${id}">${esc(title)}<a class="anchor" href="#${currentPath}?s=${id}" aria-label="Link to section: ${esc(title)}">#</a></h2>`;
const table = (head, rows, cls = '') => `<div class="tbl-wrap ${cls}"><table>${head?.some(Boolean) ? `<thead><tr>${head.map((x) => `<th scope="col">${x}</th>`).join('')}</tr></thead>` : ''}<tbody>${rows.join('')}</tbody></table></div>`;
const tokenValue = (t, theme = 'light') => typeof t.value === 'object' && !('fontSize' in t.value) ? (t.value[theme] ?? t.value.light) : t.value;
const badge = (status) => { const s = STATUS[status]; return `<cm-badge tone="${s.tone}">${s.label}</cm-badge>`; };
function linkifyText(s) { return md(s).replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, '<a href="#$2">$1</a>'); }
const note = (html, cls = '') => `<div class="note ${cls}">${html}</div>`;
const doDont = (dos, donts) => `<div class="dd"><div class="do"><h3><cm-icon name="check" size="18"></cm-icon>Do</h3><ul>${dos.map((x) => `<li>${md(x)}</li>`).join('')}</ul></div>
  <div class="dont"><h3><cm-icon name="close" size="18"></cm-icon>Don't</h3><ul>${donts.map((x) => `<li>${md(x)}</li>`).join('')}</ul></div></div>`;
const mail = (subject = '') => `<a href="mailto:${SUPPORT_EMAIL}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}">${SUPPORT_EMAIL}</a>`;
const statusKey = () => `<dl class="status-key">${Object.entries(STATUS).map(([k, s]) => `<div><dt>${badge(k)}</dt><dd>${s.text}</dd></div>`).join('')}</dl>`;

// Code blocks remember the reader's framework (HTML or React) across the whole site.
let langPref = 'HTML';
try { langPref = localStorage.getItem('cm-docs-lang') || 'HTML'; } catch {}
function codeBlock(sources, opts = {}) { // sources: [{label, lang, code}]
  const pick = Math.max(0, sources.findIndex((s) => s.label === langPref));
  return `<div class="code${opts.flush ? ' code--flush' : ''}">
    <div class="code-bar">${sources.length > 1
      ? `<div class="tabs" role="tablist" aria-label="Code language">${sources.map((s, i) => `<button role="tab" aria-selected="${i === pick}" data-i="${i}" data-label="${s.label}">${s.label}</button>`).join('')}</div>`
      : `<span class="code-label">${sources[0].label}</span>`}
      <button class="copy" type="button" aria-label="Copy code">Copy</button></div>
    ${sources.map((s, i) => `<pre ${i === pick ? '' : 'hidden'} data-i="${i}" tabindex="0"><code>${highlight(s.code, s.lang)}</code></pre>`).join('')}
  </div>`;
}
function selectLang(el, label) {
  const b = el.querySelector(`.tabs button[data-label="${label}"]`);
  if (!b) return;
  el.querySelectorAll('.tabs button').forEach((x) => x.setAttribute('aria-selected', String(x === b)));
  el.querySelectorAll('pre').forEach((p) => (p.hidden = p.dataset.i !== b.dataset.i));
}
function wireCode(root) {
  root.querySelectorAll('.code:not([data-wired])').forEach((el) => {
    el.dataset.wired = '';
    el.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => {
      langPref = b.dataset.label;
      try { localStorage.setItem('cm-docs-lang', langPref); } catch {}
      document.querySelectorAll('.code').forEach((c) => selectLang(c, langPref));
    }));
    el.querySelector('.copy').addEventListener('click', () => copy(el.querySelector('pre:not([hidden])').textContent, 'Code'));
  });
}
const setupCode = (body) => [
  { label: 'HTML', lang: 'html', code: `<link rel="stylesheet" href="${PREVIEW.font}">\n<link rel="stylesheet" href="${PREVIEW.css}">\n<script type="module" src="${PREVIEW.js}"></script>\n\n${body}` },
];

/* ---------------- Pages ---------------- */
const pages = {};

pages['/'] = () => ({ wide: true, side: false, title: 'Commmerce UI', html: `
  <section class="hero">
    <p class="eyebrow">Commmerce UI · Preview ${FACTS.release}</p>
    <h1>Build apps that feel native to Commmerce.</h1>
    <p class="lead">The components, design tokens, patterns and guidance behind the Commmerce admin. For Commmerce's product teams and for developers building apps that merchants use inside the admin, so every screen looks, reads and behaves like one product.</p>
    <dl class="facts">
      <div><dt>Who it's for</dt><dd>Commmerce product teams and third-party app developers</dd></div>
      <div><dt>Where you use it</dt><dd>Screens inside the Commmerce admin: orders, products, inventory, settings</dd></div>
      <div><dt>What you build</dt><dd>Lists, forms, detail pages and the states around them</dd></div>
      <div><dt>What works today</dt><dd>${FACTS.ready} components, light and dark tokens and ${FACTS.icons} icons in a versioned hosted build (v${PREVIEW.version}). <a href="#/apps">Apps run inside the admin</a> today.</dd></div>
    </dl>
    <div class="hero-actions">
      <cm-button variant="primary" size="large" href="#/start">Start building</cm-button>
      <cm-button size="large" href="#/components">Explore components</cm-button>
    </div>
  </section>

  <section class="showcase" aria-labelledby="showcase-title">
    <div class="section-head">
      <div><h2 id="showcase-title">An orders screen, built only with Commmerce UI</h2>
      <p class="muted">Live components, not a picture. Switch the status tabs, search, or tick a few orders to see bulk actions.</p></div>
      <a class="more" href="#/patterns/order-list">See the pattern and code →</a>
    </div>
    <div class="admin-frame" role="group" aria-label="Example: orders screen in the Commmerce admin">
      <div class="admin-top" aria-hidden="true"><img class="logo logo--light" src="vendor/brand/wordmark-black.svg" alt="" width="132" height="10"><img class="logo logo--dark" src="vendor/brand/wordmark-white.svg" alt="" width="132" height="10"><span class="admin-store">Anika's Boutique</span></div>
      <div class="admin-body">
        <nav class="admin-nav" aria-hidden="true"><span>Home</span><span class="on">Orders</span><span>Products</span><span>Customers</span><span>Reports</span><span>Apps</span></nav>
        <div class="admin-page" id="home-orders">${orderListHtml}</div>
      </div>
    </div>
    <p class="caption">The admin header and navigation are drawn here for context. They come from the admin itself; their components are planned and are not for apps.</p>
  </section>

  <section class="why" aria-labelledby="why-title">
    <h2 id="why-title">Why build with it</h2>
    <div class="why-grid">
      <div><h3>One admin, not a collection of apps</h3><p>First-party screens and third-party apps share the same layout, controls and words, so merchants don't relearn your app. <a href="#/apps/native">What makes an app native</a></p></div>
      <div><h3>The same behaviour everywhere</h3><p>Keyboard use, focus, error messages and screen-reader names are built into each component and checked by browser tests before every release. <a href="#/foundations/accessibility">How accessibility is checked</a></p></div>
      <div><h3>Works with your stack</h3><p>Web components for plain HTML, server-rendered pages and React, and a Flutter package for web, desktop, mobile and tablet. <a href="#/start/install">Framework support</a></p></div>
      <div><h3>Built from real merchant work</h3><p>Patterns for order lists, product editing, fulfilment states and empty or failed screens, with the reasoning behind each. <a href="#/patterns">Browse patterns</a></p></div>
    </div>
  </section>

  <section class="today" aria-labelledby="today-title">
    <h2 id="today-title">What you can use today</h2>
    ${statusKey()}
    <div class="avail">
      <a href="#/components" class="avail-item"><span>${badge('ready')}</span><strong>${FACTS.ready} components</strong><span class="muted">Forms, layout, lists and feedback</span></a>
      <a href="#/foundations/tokens" class="avail-item"><span>${badge('ready')}</span><strong>${FACTS.tokens} tokens</strong><span class="muted">Light and dark themes</span></a>
      <a href="#/icons" class="avail-item"><span>${badge('ready')}</span><strong>${FACTS.icons} icons</strong><span class="muted">24px line set</span></a>
      <a href="#/components?status=in-progress" class="avail-item"><span>${badge('in-progress')}</span><strong>${FACTS.inProgress} components in progress</strong><span class="muted">${esc(namesBy('in-progress'))}</span></a>
      <a href="#/components?status=planned" class="avail-item"><span>${badge('planned')}</span><strong>${FACTS.planned} components planned</strong><span class="muted">${esc(namesBy('planned'))}</span></a>
      <a href="#/apps/app-bridge" class="avail-item"><span>${badge('ready')}</span><strong>App Bridge</strong><span class="muted">Admin toasts, modals, navigation and session tokens</span></a>
    </div>
    <p class="muted small">APIs can change between preview releases. Pin a version to stay on one, and read the <a href="#/releases">release notes</a> before moving to the next.</p>
  </section>
  <footer class="footer">Commmerce UI is made and maintained by Commmerce. Design source: the Commmerce Design System Figma file. Questions and requests: ${mail()} · <a href="#/support">Support and compatibility</a> · <a href="#/releases">Release notes</a></footer>`,
  after(main) { wireOrderList($('#home-orders', main)); } });

/* ---- Get started ---- */
const QUICKSTART = `<!doctype html>
<html lang="en" data-cm-theme="auto">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>My Commmerce app</title>
  <link rel="stylesheet" href="${PREVIEW.font}">
  <link rel="stylesheet" href="${PREVIEW.css}">
  <script type="module" src="${PREVIEW.js}"></script>
  <style>
    body { margin: 0; padding: 24px; background: var(--cm-bg-page); font-family: var(--cm-font-sans); }
  </style>
</head>
<body>
  <cm-card heading="Store settings">
    <form id="settings" style="display:grid;gap:20px">
      <cm-text-field name="store" label="Store name" value="Anika's Boutique" required></cm-text-field>
      <cm-button type="submit" variant="primary">Save</cm-button>
    </form>
  </cm-card>
  <script type="module">
    document.getElementById('settings').addEventListener('submit', (event) => {
      event.preventDefault();
      console.log(Object.fromEntries(new FormData(event.target)));
    });
  </script>
</body>
</html>`;

pages['/start'] = () => ({ title: 'Quickstart', html: `
  <h1>Quickstart</h1>
  <p class="lead">Get a Commmerce UI form on screen in about two minutes, with no build tools.</p>
  <ol class="steps">
    <li><h3>Create an HTML file</h3>
      <p>Save this as <code>index.html</code>. It loads the tokens and the components from the hosted preview build.</p>
      ${codeBlock([{ label: 'index.html', lang: 'html', code: QUICKSTART }])}</li>
    <li><h3>Open it in a browser</h3>
      <p>Double-click the file, or serve the folder (<code>npx serve</code>). You should see this card. Press Save and the form data appears in the browser console.</p>
      <div class="ex-stage ex-stage--inline" id="qs-preview">
        <cm-card heading="Store settings" style="width:100%;max-width:520px">
          <form style="display:grid;gap:20px" onsubmit="event.preventDefault()">
            <cm-text-field name="store" label="Store name" value="Anika's Boutique" required></cm-text-field>
            <cm-button type="submit" variant="primary">Save</cm-button>
          </form>
        </cm-card>
      </div></li>
    <li><h3>Build your first screen</h3>
      <p>Pick a pattern close to what you're making and copy its markup: <a href="#/patterns/order-list">an order or product list</a>, <a href="#/patterns/product-editor">a product editor</a>, or <a href="#/patterns/states">empty and error states</a>. Then read <a href="#/apps/native">what makes an app native</a>.</p></li>
  </ol>
  ${note(`<strong>This pins version ${PREVIEW.version}.</strong> Files under <code>/v/${PREVIEW.version}/</code> never change, so your app only changes when you change the number. See <a href="#/start/install">choosing a version</a>.`)}
  ${h2('Requirements')}
  <ul>
    <li>A current browser: Chrome or Edge, or Safari 16.4 or later (both tested), or Firefox 98 or later (tested). See <a href="#/support">support</a>.</li>
    <li>Pages must be served over <code>https://</code>, <code>http://localhost</code> or opened as a file. Scripts load as ES modules.</li>
  </ul>` });

const FLUTTER_WIDGETS = [
  ['Actions and forms', 'CmButton, CmTextField, CmCheckbox, CmRadioGroup, CmToggle, CmSelect, CmSearch, CmOptionGroup, CmFileUpload'],
  ['Feedback and status', 'CmBadge, CmTag, CmBanner, CmEmptyState, CmSkeleton, CmSkeletonDisplay, CmComment, CmCommentBox, CmSmartTip, CmSmartTips, CmToast, CmSpinner, CmProgressBar'],
  ['Layout', 'CmPage, CmLayout, CmLayoutSection, CmGrid, CmStack, CmCard, CmInfoPanel, CmPageHeader, CmSaveBar, CmAccordion, CmActionBar'],
  ['Lists and tables', 'CmDataTable, CmStatusTabs, CmResourceList, CmPagination, CmTableHeader, CmNestedList, CmReportTile, CmReportTiles'],
  ['Images', 'CmAvatar, CmThumbnail'],
  ['Navigation', 'CmLinkTabs, CmFlashOfferBar'],
  ['Overlays', 'CmModal, CmSidePanel, CmFilterPanel, CmActionMenu, CmBottomSheet, CmTooltip'],
  ['Marketplace', 'CmAppCard'],
  ['Admin navigation (Commmerce products only)', 'CmSideNav, CmHeaderBar, CmAdminScaffold, CmBottomNavigation, CmMobileMenu, CmNotificationPanel'],
  ['Foundations', 'CmTheme.light() / dark(), CmColors, CmSpace, CmRadius, CmType, CmShadow, CmIcon + CmIcons, CmBreakpoints'],
];
/** Widgets in the table above, counted (Foundations are tokens and helpers, not widgets). */
const FLUTTER_WIDGET_COUNT = FLUTTER_WIDGETS.filter(([g]) => g !== 'Foundations').reduce((n, [, w]) => n + w.split(', ').length, 0);

const FRAMEWORKS = [
  ['Plain HTML and server-rendered pages (EJS, PHP)', 'ready', 'Use the elements directly. These docs and their tests run this way.'],
  ['React 18 and 19', 'ready', 'Use `@commmerce/ui-react` wrappers once on npm (planned). They are generated from the components and tested with React 18 in Chromium: every wrapper\'s props and events, children, refs and controlled values. React 19 is not tested yet. Until they are on npm, use the elements directly.'],
  ['Vue 3, Angular, Svelte', 'planned', 'Not tested. They are standard custom elements, so they should work with each framework\'s custom-element support.'],
  ['Flutter (web, desktop, mobile, tablet)', 'ready', 'Preview. The `commmerce_ui` Flutter package: the same tokens, a Material theme, the icons and ' + FLUTTER_WIDGET_COUNT + ' widgets, including the admin side navigation, header and an adaptive admin shell. [[Flutter guide|/start/flutter]]'],
];
pages['/start/install'] = () => ({ title: 'Install and frameworks', html: `
  <h1>Install and frameworks</h1>
  <p class="lead">Today there is one way to install Commmerce UI: the hosted, versioned build. npm packages are planned.</p>
  ${h2('Framework support')}
  ${table(['Setup', 'Status', 'Notes'], FRAMEWORKS.map(([a, s, n]) => `<tr><td>${a}</td><td>${s === 'ready' ? badge('ready') : `<cm-badge>Not tested</cm-badge>`}</td><td>${linkifyText(n)}</td></tr>`))}
  ${h2('Plain HTML and server-rendered pages')}
  <p>Add the two lines to your page's <code>&lt;head&gt;</code>, then use any <code>&lt;cm-*&gt;</code> element in your markup.</p>
  ${codeBlock(setupCode('<cm-button variant="primary">Save</cm-button>'))}
  ${h2('Choosing a version')}
  ${table(['Address', 'Changes when', 'Use it for'], [
    `<tr><td><code>…/commmerceui/v/${PREVIEW.version}/cdn.js</code><br><code>…/commmerceui/v/${PREVIEW.version}/tokens.css</code></td><td>Never. Each release gets a new number.</td><td>Apps merchants use. Upgrade by changing the number after reading the <a href="#/releases">release notes</a>.</td></tr>`,
    `<tr><td><code>…/commmerceui/vendor/cdn.js</code><br><code>…/commmerceui/vendor/tokens.css</code></td><td>Every release.</td><td>Prototypes, and checking an upcoming release.</td></tr>`,
  ])}
  ${h2('React')}
  <p>The React wrappers (<code>@commmerce/ui-react</code>) give you typed props and <code>on…</code> event props. They are built but not yet published. Until they are, load the preview build as above and use the elements in JSX:</p>
  ${codeBlock([{ label: 'React 19', lang: 'jsx', code: `// React 19 passes properties and listens to events on custom elements directly.
export function StoreName({ value, onChange }) {
  return <cm-text-field label="Store name" value={value} onchange={(e) => onChange(e.target.value)} />;
}` }, { label: 'React 18', lang: 'jsx', code: `// React 18 sets attributes only: use a ref for properties and custom events.
export function StoreName({ value, onChange }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    const handler = () => onChange(el.value);
    el.addEventListener('change', handler);
    return () => el.removeEventListener('change', handler);
  }, [onChange]);
  return <cm-text-field ref={ref} label="Store name" value={value} />;
}` }])}
  <p>Once published:</p>
  ${codeBlock([{ label: 'Terminal', lang: 'sh', code: 'npm install @commmerce/tokens @commmerce/ui-react   # planned, not available yet' }])}
  ${h2('Vue 3')}
  <p>Not tested yet. Tell Vue that <code>cm-</code> tags are custom elements:</p>
  ${codeBlock([{ label: 'vite.config.js', lang: 'jsx', code: `vue({ template: { compilerOptions: { isCustomElement: (tag) => tag.startsWith('cm-') } } })` }])}
  ${h2('Packages')}
  ${table(['Package', 'Status', 'What it is'], packages.map((p) => `<tr><td><code>${esc(p.name)}</code></td><td>${badge(p.status)}</td><td>${md(p.what)}</td></tr>`))}` });

pages['/start/themes'] = () => ({ title: 'Themes and tokens', html: `
  <h1>Themes and tokens</h1>
  <p class="lead">One stylesheet holds every token as a CSS variable, with a light and a dark value. Components read them, and so should your own CSS.</p>
  ${h2('Load the tokens')}
  ${codeBlock([{ label: 'HTML', lang: 'html', code: `<link rel="stylesheet" href="${PREVIEW.font}">\n<link rel="stylesheet" href="${PREVIEW.css}">` }])}
  <p>The stylesheet also loads Poppins from Google Fonts. Set the font on your page so text outside components matches:</p>
  ${codeBlock([{ label: 'CSS', lang: 'html', code: `body {
  background: var(--cm-bg-page);
  color: var(--cm-text-default);
  font-family: var(--cm-font-sans);
}` }])}
  ${h2('Pick a theme')}
  ${codeBlock([{ label: 'HTML', lang: 'html', code: `<html data-cm-theme="light">  <!-- default -->
<html data-cm-theme="dark">
<html data-cm-theme="auto">   <!-- follows the operating system -->` }])}
  <p>The attribute works on any element, so one area can be dark. The switch in this site's header uses it.</p>
  ${note('When your app is embedded, follow the admin\'s theme: <a href="#/apps/app-bridge">App Bridge</a> gives it in <code>app.ready</code> and the <code>theme.change</code> event. Outside the admin, use <code>auto</code>.')}
  ${h2('Use tokens in your CSS')}
  <p>Use semantic tokens (<code>--cm-bg-surface</code>, <code>--cm-text-default</code>, <code>--cm-border-input</code>) so your styles follow the theme and future changes. The <code>gray-*</code> scale is raw palette and does not change between themes. Browse every token in <a href="#/foundations/tokens">Tokens</a>.</p>` });

pages['/start/troubleshooting'] = () => ({ title: 'Troubleshooting', html: `
  <h1>Troubleshooting</h1>
  <p class="lead">The problems people hit first, and how to fix them.</p>
  ${table(['What you see', 'Why', 'Fix'], [
    ['Elements show as plain text, unstyled', 'The component script did not load or ran as a classic script.', 'Load it with <code>type="module"</code>. Check the browser console and network tab for the script URL.'],
    ['Components look right but the page font is a default serif', 'Only components use the tokens on their own.', 'Set <code>font-family: var(--cm-font-sans)</code> on <code>body</code>.'],
    ['Colours are missing or everything is black', 'The tokens stylesheet is not loaded.', 'Add the <code>tokens.css</code> link before the script.'],
    ['Text is in the system font, not Poppins', 'The font stylesheet is not loaded. Since 1.0.0-rc.3, <code>tokens.css</code> no longer loads it.', 'Add the Google Fonts link (or <code>fonts.css</code>) before <code>tokens.css</code>.'],
    ['Dark theme does nothing', 'No theme attribute is set.', 'Set <code>data-cm-theme="dark"</code> or <code>"auto"</code> on <code>&lt;html&gt;</code>.'],
    ['Form values are missing on submit', 'The control has no <code>name</code>, or is outside the form.', 'Give each control a <code>name</code> and put it inside the <code>&lt;form&gt;</code>.'],
    ['Nothing happens in older Safari', 'Safari before 16.4 lacks form-associated custom elements.', 'Use a current browser; see <a href="#/support">supported browsers</a>.'],
    ['React event handler never fires', 'React 18 does not attach listeners for custom element events.', 'Use the wrappers when published, or attach the listener with a ref (see <a href="#/start/install">Install</a>).'],
    ['<code>npm install @commmerce/ui</code> fails', 'The packages are not published yet.', 'Use the hosted preview build.'],
  ].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`))}
  <p>Still stuck? Email ${mail('Commmerce UI: setup problem')} with your browser, the page markup and what you see.</p>` });


pages['/start/flutter'] = () => ({ title: 'Flutter', html: `
  <h1>Flutter ${badge('ready')}</h1>
  <p class="lead">The <code>commmerce_ui</code> Flutter package brings the same tokens, theme, icons and widgets to Flutter apps on the web, desktop, phones and tablets.</p>
  <p class="status-line"><span class="muted">Preview, version ${PREVIEW.version}. Built and tested with Flutter 3.32. Widget APIs can change between releases.</span></p>
  <p><a class="more" href="flutter/" target="_blank" rel="noopener">Open the live Flutter demo →</a> <span class="muted small">(the Commmerce admin dashboard, orders and product editor, rebuilt with the package, plus a Components page with every newer widget; resize the window to see the phone and tablet layouts)</span></p>
  ${h2('Install')}
  <p>The package is not on pub.dev yet. Commmerce teams add it from the repository:</p>
  ${codeBlock([{ label: 'pubspec.yaml', lang: 'html', code: `dependencies:
  commmerce_ui:
    git:
      url: git@github.com:NirmalND/commmerce-ui.git
      path: flutter/commmerce_ui
      ref: main` }])}
  ${note(`Publishing to pub.dev, which would let developers outside Commmerce install it, is not decided yet. Ask at ${mail('Flutter package')}.`)}
  ${h2('Set up the theme')}
  ${codeBlock([{ label: 'main.dart', lang: 'jsx', code: `import 'package:commmerce_ui/commmerce_ui.dart';

MaterialApp(
  theme: CmTheme.light(),
  darkTheme: CmTheme.dark(),
  themeMode: ThemeMode.system,
  home: const OrdersPage(),
);

// Tokens anywhere: CmTheme.colorsOf(context).textTertiary, CmSpace.s20, CmRadius.md` }])}
  <p>Poppins is bundled, so text matches the admin offline on every platform.</p>
  ${h2('The admin shell')}
  <p><code>CmAdminScaffold</code> lays out the header, the side navigation and a content panel, and adapts to the screen:</p>
  ${table(['Screen', 'Width', 'Navigation'], [
    ['<tr><td>Desktop</td><td>1100px and wider</td><td>Black side navigation, always open, with expandable groups</td></tr>'],
    ['<tr><td>Tablet</td><td>600–1099px</td><td>Icon rail with tooltips</td></tr>'],
    ['<tr><td>Phone</td><td>Below 600px</td><td>Drawer, opened from the header’s menu button</td></tr>'],
  ].map((r) => r[0]))}
  ${codeBlock([{ label: 'Dart', lang: 'jsx', code: `CmAdminScaffold(
  navItems: const [
    CmNavItem(id: 'dashboard', label: 'Dashboard', icon: CmIcons.home),
    CmNavItem(id: 'catalog', label: 'Catalog', icon: CmIcons.box, children: [
      CmNavItem(id: 'products', label: 'Products'),
    ]),
    CmNavItem(id: 'orders', label: 'Orders', icon: CmIcons.bag, count: 3),
  ],
  selectedId: page,
  onNavSelected: (item) => setState(() => page = item.id),
  header: (context, openMenu) => CmHeaderBar(
    logo: Image.asset('assets/logo.png'),
    storeName: 'preprod.commmerce.com',
    walletBalance: '₹ 2,312',
    userName: 'Demo user',
    onMenuTap: openMenu, // set on phones only
  ),
  body: const DashboardPage(),
)` }])}
  ${h2('Widgets')}
  ${table(['Group', 'Widgets'], FLUTTER_WIDGETS.map(([g, w]) => `<tr><td>${g}</td><td><code>${w.split(', ').join('</code>, <code>')}</code></td></tr>`))}
  <p>Each widget follows its web component: the same sizes, states, words and accessibility (semantic labels, keyboard focus, announced errors). Overlays open as routes with <code>showCmModal</code>, <code>showCmSidePanel</code>, <code>showCmFilterPanel</code>, <code>showCmBottomSheet</code> and <code>showCmNotificationPanel</code>, which complete with the value the overlay closed with: the page behind is dimmed and hidden from screen readers, focus moves in and stays inside, Esc closes, and focus returns to the opener. <code>CmActionMenu</code> is anchored to its trigger and follows the web menu keyboard model. <code>showCmToast</code> shows a toast at the bottom of the screen and announces each one to screen readers on its own. <code>CmLayout</code> and <code>CmGrid</code> measure their own width, not the window, so they stack correctly inside narrow columns.</p>
  ${h2('Tokens stay in step')}
  <p>Colours, type, spacing, radii, shadows and icons are generated from the same source as the web packages (<code>npm run flutter:generate</code>), so a token change reaches web and Flutter together.</p>` });

/* ---- Build an admin app ---- */
pages['/apps'] = () => ({ title: 'How apps run in the admin', html: `
  <h1>How apps run in the admin</h1>
  <p class="lead">Apps add screens to the Commmerce admin. Commmerce UI is how those screens match the rest of it.</p>
  ${statusKey()}
  ${table(['Capability', 'Status', 'Notes'], [
    ['Build app screens with Commmerce UI', badge('ready'), 'Components, tokens, icons and patterns in the preview build.'],
    ['Run your app inside the admin', badge('ready'), `Live. To set up your app in a store, email ${mail('App in the Commmerce admin')}.`],
    ['App Bridge (admin navigation, toasts, modals, session tokens)', badge('ready'), `In the preview build. Confirm your store's admin is connected first: <a href="#/apps/app-bridge">App Bridge</a>.`],
    ['Installable npm packages', badge('planned'), 'Use the hosted preview build until then.'],
  ].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`))}
  ${h2('How it works')}
  <p>Your app is served from your own domain and shown inside the admin, in the page area. The admin keeps its header and navigation; your app draws everything below them, using Commmerce UI. With <a href="#/apps/app-bridge">App Bridge</a>, your app can also update the admin's address, open admin-level toasts and modals, and confirm who the merchant is.</p>
  ${h2('Steps')}
  <ol>
    <li>Build your screens with the <a href="#/start">hosted build</a>, pinned to a version.</li>
    <li>Follow the <a href="#/apps/page-structure">page structure</a>, the <a href="#/patterns">patterns</a> and <a href="#/apps/native">what makes an app native</a>.</li>
    <li>Keep navigation inside your app shallow: the admin provides the top level.</li>
    <li>Email ${mail('App in the Commmerce admin')} to set your app up in a store.</li>
  </ol>
  ${note(`Listing an app and getting it reviewed will happen in the Commmerce developer portal, not in these docs. Until the portal is available, email ${mail('App listing')}.`)}` });

const NATIVE = [
  ['Layout and navigation', 'ready', 'Page header, cards on `bg-page`, two-column detail pages, save and action bars. See [[page structure|/apps/page-structure]].', 'ready', 'The admin draws its header and side navigation around your app. Don\'t add your own.'],
  ['Merchant terminology and content', 'ready', 'Labels, buttons, errors, money and dates follow the [[content guidelines|/foundations/content]].', null, ''],
  ['Interaction and feedback', 'ready', 'Banners, save bar, empty states, skeletons, form errors, modals, side panels and menus behave the same way in every app.', 'ready', 'Admin-level toasts, modals, the save bar and the loading bar come from [[App Bridge|/apps/app-bridge]]; inside your app\'s page, use Modal and Side panel.'],
  ['Theme', 'ready', 'Light and dark themes through tokens; `data-cm-theme="auto"` follows the device. Apps use Commmerce\'s palette: merchant or app brand colours are not supported inside the admin, by design.', 'ready', 'Follow the admin\'s theme with [[App Bridge|/apps/app-bridge]] (`app.ready` and `theme.change`).'],
  ['Accessibility', 'ready', 'Keyboard behaviour, focus, labels and contrast are built in. See [[how it is checked|/foundations/accessibility]].', null, ''],
  ['Responsive and embedded constraints', 'ready', 'Components adapt from desktop to 414px phones.', 'ready', 'Call `app.autoResize()` so the admin sizes your frame to your page and the merchant scrolls the admin, not a box inside it.'],
];
const linkify = (s) => md(s).replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, '<a href="#$2">$1</a>');
pages['/apps/native'] = () => ({ title: 'What makes an app native', html: `
  <h1>What makes an app native</h1>
  <p class="lead">A merchant should not notice when they move from a Commmerce screen into your app. That comes from six things, and Commmerce UI handles part of each one.</p>
  ${statusKey()}
  ${NATIVE.map(([area, s1, t1, s2, t2]) => `<section class="native-row"><h3>${area}</h3>
    <div class="native-cells"><div>${badge(s1)}<p>${linkify(t1)}</p></div>${s2 ? `<div>${badge(s2)}<p>${linkify(t2)}</p></div>` : ''}</div></section>`).join('')}
  ${h2('Checklist before you ship a screen')}
  <ul class="checklist">
    <li>Every control is a Commmerce UI component; no restyled native controls.</li>
    <li>The page starts with a page header; content sits in cards.</li>
    <li>Buttons start with a verb; errors say how to fix the problem.</li>
    <li>The screen works with only a keyboard, and in both themes.</li>
    <li>Loading, empty and error states are designed, not left blank.</li>
    <li>Colours come from Commmerce tokens, not your own brand palette.</li>
    <li>Your app does not use the Commmerce logo or imply Commmerce made it.</li>
  </ul>` });

pages['/apps/page-structure'] = () => ({ title: 'Page structure', html: `
  <h1>Page structure</h1>
  <p class="lead">Every admin screen has the same skeleton. Use it for every page in your app.</p>
  <div class="anatomy" aria-hidden="true">
    <div class="a-head">1 · Page header: breadcrumbs, title, up to three actions</div>
    <div class="a-body"><div class="a-main">2 · Main column: cards for what customers see</div><div class="a-side">3 · Side column: settings, status, summaries</div></div>
    <div class="a-foot">4 · Save bar or action bar, when there is something to commit</div>
  </div>
  <ol>
    <li><strong>Page header</strong> (<a href="#/components/page-header">component</a>): breadcrumbs back to the parent list, the page title as the only <code>h1</code>, and actions on the right. One primary action.</li>
    <li><strong>Main column</strong>: <a href="#/components/card">cards</a> on <code>bg-page</code>, <code>space-20</code> apart, each with a heading.</li>
    <li><strong>Side column</strong> on detail pages: about a third of the width, with <a href="#/components/info-panel">info panels</a> and settings cards. It moves under the main column on narrow screens.</li>
    <li><strong>Save bar</strong> (<a href="#/components/save-bar">component</a>) when the page edits a record, or <strong>action bar</strong> (<a href="#/components/action-bar">component</a>) for the next step on a record.</li>
  </ol>
  ${h2('Widths and spacing')}
  <ul>
    <li>The admin is designed at 1440–1600px wide and at 414px for phones. Let your layout fill the page area; don't fix a width.</li>
    <li>Gaps: <code>space-20</code> to <code>space-30</code> on desktop, <code>space-10</code> to <code>space-22</code> on phones. See <a href="#/foundations/spacing">Spacing</a>.</li>
  </ul>
  <p>See the full layout working in the <a href="#/patterns/product-editor">product editor</a> and <a href="#/patterns/order-list">order list</a> patterns.</p>` });

// The live example: a small "Product reviews" app in an iframe, connected to this page (the "admin") through
// createReferenceHost. The demo signs session tokens in the browser with a made-up secret; the real admin
// gets them from Commmerce's servers, which hold your app secret.
const DEMO_APP = (bridge, css, ui, hostOrigin) => `<!doctype html><html lang="en" data-cm-theme="light"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&display=swap"><link rel="stylesheet" href="${css}"><script type="module" src="${ui}"></script>
<style>body{margin:0;padding:20px;background:var(--cm-bg-page);font-family:var(--cm-font-sans);color:var(--cm-text-default)}
.row{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 16px}#log{margin:16px 0 0;font-size:14px;word-break:break-word}</style></head><body>
<cm-page-header heading="Product reviews"></cm-page-header>
<cm-card heading="Try each App Bridge request">
  <div class="row">
    <cm-button id="toast">Show toast</cm-button>
    <cm-button id="modal">Delete review…</cm-button>
    <cm-button id="pick">Choose products…</cm-button>
    <cm-button id="nav">Open review 42</cm-button>
    <cm-button id="load">Load for 1 second</cm-button>
    <cm-button id="token">Get session token</cm-button>
  </div>
  <cm-text-field id="reply" label="Reply to the newest review" help-text="Type to show the admin save bar."></cm-text-field>
  <p id="log" role="status">Connecting…</p>
</cm-card>
<script type="module">
import { createApp, decodeClaims } from '${bridge}';
const app = createApp({ hostOrigin: '${hostOrigin}', apiKey: 'demo-reviews-app' });
const log = (t) => { document.getElementById('log').textContent = t; };
const on = (id, fn) => document.getElementById(id).addEventListener('click', () => fn().catch((e) => log('Error: ' + e.code + ', ' + e.message)));
app.ready.then((info) => log('Connected. Admin theme: ' + info.theme + ', locale: ' + info.locale + '.'), (e) => log('Not connected: ' + e.message));
on('toast', () => app.toast.show('Reply published', { tone: 'success' }).then(() => log('Toast shown by the admin.')));
on('modal', async () => log('Modal closed with: ' + await app.modal.open({ title: 'Delete review?', message: 'The customer\\'s review will be removed from your store. This can\\'t be undone.', primaryAction: { label: 'Delete review', destructive: true }, secondaryAction: { label: 'Cancel' } })));
on('pick', async () => { const r = await app.resourcePicker({ type: 'product', multiple: true }); log(r ? 'Picked: ' + (r.map((p) => p.title).join(', ') || 'nothing') : 'Picker cancelled.'); });
on('nav', () => app.navigate('/reviews/42').then(() => log('Admin address updated.')));
on('load', async () => { await app.loading.start(); await new Promise((r) => setTimeout(r, 1000)); await app.loading.stop(); log('Loading bar shown for 1 second.'); });
on('token', async () => { const c = decodeClaims(await app.getSessionToken()); log('Token for store ' + c.dest + ', staff ' + c.sub + ', expires in ' + (c.exp - Math.floor(Date.now() / 1000)) + ' s.'); });
const reply = document.getElementById('reply');
reply.addEventListener('input', () => app.saveBar.show({ message: 'Unsaved reply' }));
app.on('saveBar.save', async () => { await app.saveBar.hide(); await app.toast.show('Reply saved'); log('Saved: ' + reply.value); });
app.on('saveBar.discard', async () => { reply.value = ''; await app.saveBar.hide(); log('Reply discarded.'); });
<\/script></body></html>`;

const BRIDGE_REQUESTS = [
  ['`toast.show(message, { tone, duration })`', 'A short confirmation at the bottom of the admin. `tone`: `default`, `success`, `critical`. Up to 200 characters.', '—'],
  ['`modal.open({ title, message, primaryAction, secondaryAction })`', 'A confirmation over the whole admin. Waits for the merchant (no time limit).', '`primary`, `secondary` or `close`'],
  ['`navigate(path, { replace })`', 'Updates the admin\'s address to `path` inside your app, so reloads, links and Back work. `path` starts with one `/` and stays inside your app (no `\\`, no control characters).', '—'],
  ['`saveBar.show({ message, saveLabel, discardLabel, loading })` / `saveBar.hide()`', 'The admin save bar. Listen for `saveBar.save` and `saveBar.discard`.', '—'],
  ['`resourcePicker({ type, multiple })`', 'The admin picker for `product`, `customer` or `collection`. Waits for the merchant.', '`[{ id, title }]`, or `null` if cancelled'],
  ['`loading.start()` / `loading.stop()`', 'The admin loading bar, for work that takes more than a second.', '—'],
  ['`getSessionToken()`', 'A signed token for your backend. Cached until 10 seconds before it expires.', 'JWT string'],
  ['`autoResize()`', 'Keeps the admin\'s frame as tall as your page: sends the height now and whenever it changes. Call it once after your page renders.', 'A function that stops it'],
  ['`on(event, listener)`', 'Admin events: `saveBar.save`, `saveBar.discard`, `theme.change` (`{ theme }`).', 'A function that stops listening'],
];
const TOKEN_CLAIMS = [
  ['`iss`', 'Issuer: the admin\'s origin.'],
  ['`dest`', 'The store\'s address (origin). Look it up among the stores that installed your app, and refuse the request if it is not one of them.'],
  ['`aud`', 'Your app\'s API key. Reject tokens for any other app.'],
  ['`sub`', 'The staff member\'s id in that store.'],
  ['`sid`', 'The admin session; the same while the staff member stays signed in.'],
  ['`iat`, `nbf`, `exp`', 'Issued at, not before, expires: seconds since 1970. Tokens live 60 seconds.'],
  ['`jti`', 'A unique id per token, for replay protection if you need it.'],
];
const ERROR_CODES = [
  ['`timeout`', 'The admin did not answer within `timeout` (10 s). Usually: wrong `hostOrigin`, or the page is not inside the admin.'],
  ['`invalid-payload`', 'A value is missing, too long or the wrong type. The message says which.'],
  ['`not-supported`', 'This admin does not offer that request.'],
  ['`not-ready`', 'A request arrived before `ready`. `createApp` handles this for you.'],
  ['`unsupported-version`', 'The admin speaks a different protocol version.'],
  ['`unknown-type`', 'Not an App Bridge request.'],
  ['`failed`', 'The admin could not complete the request (for example a wrong API key).'],
];
const rowsMd = (rows) => rows.map((r) => `<tr>${r.map((c) => `<td>${md(c)}</td>`).join('')}</tr>`);

const STARTER_FILES = [
  ['README.md', 'How to run it, the settings, and what to change first.'],
  ['package.json', 'Scripts: `vendor`, `start`, `test`. No dependencies.'],
  ['server.mjs', 'Serves the page; verifies the session token (API key and issuer) on every `/api/*` request; serves only installed stores; `frame-ancestors` limited to the admin.'],
  ['public/index.html', 'The app page: Commmerce UI components and App Bridge (theme, `autoResize`, save bar, toast, modal, resource picker).'],
  ['dev-admin.html', 'Development only: a stand-in admin on another origin, running the reference host.'],
  ['fetch-vendor.mjs', 'Downloads one pinned version of the hosted build into `vendor/`.'],
  ['test/server.test.mjs', 'Backend tests: 401 for bad tokens, 403 for stores that did not install the app, the CSP header.'],
  ['test/pattern.test.mjs', 'Backend tests with `COMMMERCE_ADMIN_ORIGIN=https://*.commmerce.com`: any admin subdomain accepted, look-alikes refused. Skipped with an App Bridge build that has no patterns.'],
  ['.gitignore', 'Keeps `vendor/` out of git.'],
];
const STARTER_PHP_FILES = [
  ['README.md', 'How to run it, the settings, and nginx and Apache set-up.'],
  ['index.php', 'Front controller: serves the page; verifies the session token (API key and issuer) on every `/api/*` request; serves only installed stores; `frame-ancestors` limited to the admin.'],
  ['lib/SessionToken.php', '`SessionToken::verify()`: the same checks as `verifySessionToken`. Copy it into any PHP app.'],
  ['public/index.html', 'The app page (the same as the Node starter\'s).'],
  ['public/dev-admin.html', 'Development only: a stand-in admin on another origin.'],
  ['fetch-vendor.php', 'Downloads one pinned version of the hosted build into `vendor/`.'],
  ['tests/run.php', 'Session-token tests: wrong secret, app, issuer (exact and `https://*.commmerce.com` patterns, look-alikes included), expired, `alg: none`, malformed.'],
  ['.htaccess', 'Apache: routes every request to `index.php` and passes the `Authorization` header to PHP.'],
];
pages['/apps/starter'] = () => ({ title: 'Starter app', html: `
  <h1>Starter app</h1>
  <p class="lead">A complete app to copy: a plain HTML page built with Commmerce UI, connected to the admin with App Bridge, and a backend that verifies session tokens. Pick <a href="#/apps/starter?s=node">Node</a> (Node 18 or later) or <a href="#/apps/starter?s=php">PHP</a> (PHP 8.0 or later); neither needs packages installed.</p>
  ${h2('Node', 'node')}
  ${codeBlock([{ label: 'Terminal', lang: 'sh', code: `# download the files below into one folder (keep public/ and test/), then:
npm run vendor   # downloads one pinned version of the hosted build into vendor/
npm run dev      # http://localhost:4700/dev-admin shows your app inside a stand-in admin
npm test         # checks the backend's token rules` }])}
  ${table(['File', 'What it does'], STARTER_FILES.map(([f, d]) => `<tr><td><a href="vendor/app-starter/${f}" download="${f.split('/').pop()}"><code>${f}</code></a></td><td>${md(d)}</td></tr>`))}
  ${h2('PHP', 'php')}
  ${codeBlock([{ label: 'Terminal', lang: 'sh', code: `# download the files below into one folder (keep lib/, public/ and tests/), then:
php fetch-vendor.php                 # downloads one pinned version of the hosted build into vendor/
COMMMERCE_DEV=1 php -S 127.0.0.1:4800 index.php   # http://localhost:4800/dev-admin: your app in a stand-in admin
php tests/run.php                    # checks the session-token rules` }])}
  ${table(['File', 'What it does'], STARTER_PHP_FILES.map(([f, d]) => `<tr><td><a href="vendor/app-starter-php/${f}" download="${f.split('/').pop()}"><code>${f}</code></a></td><td>${md(d)}</td></tr>`))}
  <p>Both starters sign and verify the same tokens: a token from the JavaScript library verifies in PHP and the other way round.</p>
  ${h2('What it shows')}
  <ul>
    <li>The page has no header or navigation of its own: the admin draws those around it (see [[page structure|/apps/page-structure]]).</li>
    <li>It follows the admin's theme, sizes its frame with <code>autoResize()</code>, and uses the admin's save bar, toasts, modal and resource picker through [[App Bridge|/apps/app-bridge]].</li>
    <li>Every backend route verifies the session token first, takes the store from the token, never from the request, and refuses stores that did not install the app.</li>
    <li>Only the admin may frame the app (<code>Content-Security-Policy: frame-ancestors</code>), and the app secret never leaves the server.</li>
  </ul>
  ${note('The dev admin signs tokens with a throwaway secret on your machine. In production the Commmerce admin signs them with your real app secret; run without development mode (<code>--dev</code> / <code>COMMMERCE_DEV=1</code>) and set the three <code>COMMMERCE_*</code> settings described in the README. Set <code>COMMMERCE_ADMIN_ORIGIN</code> to <code>https://*.commmerce.com</code> so the app works in every Commmerce admin (see <a href="#/apps/app-bridge?s=admin-origin">Admin origin</a>); patterns need an App Bridge build newer than 1.0.0-rc.2.')}`.replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, '<a href="#$2">$1</a>') });
pages['/apps/app-bridge'] = () => ({ title: 'App Bridge', html: `
  <h1>App Bridge ${badge('ready')}</h1>
  <p class="lead">App Bridge connects your app, running in a frame inside the admin, to the admin around it: toasts and modals over the whole admin, the save bar, a loading bar, the resource picker, the admin's address, and a session token that tells your backend which store and staff member is using your app.</p>
  ${note(`App Bridge is in the preview build (protocol version 1). The Commmerce admin answers App Bridge requests as it rolls out to stores: before you rely on it, email ${mail('App Bridge in my store')} to confirm your store's admin is connected. Until the admin answers, <code>app.ready</code> rejects with <code>timeout</code>, so keep in-page fallbacks (<a href="#/components/banner">Banner</a>, <a href="#/components/save-bar">Save bar</a>, <a href="#/components/modal">Modal</a>).`)}
  ${h2('Try it')}
  <p>This page plays the admin; the frame below is an app. Each button sends one App Bridge request, and this page answers it with Commmerce UI components.</p>
  <div class="example ab-demo">
    <div class="ex-bar"><span class="muted small">Admin address</span> <code id="ab-address">/apps/product-reviews</code></div>
    <div id="ab-host" class="ab-host"><iframe id="ab-frame" title="Example app: Product reviews" loading="lazy"></iframe></div>
  </div>
  ${h2('Add it to your app')}
  ${codeBlock([{ label: 'JavaScript', lang: 'jsx', code: `import { createApp } from '${PREVIEW.bridge}';
// or, with npm when it is published: import { createApp } from '@commmerce/app-bridge';

const app = createApp({
  hostOrigin: ADMIN_ORIGIN, // from your app settings: 'https://*.commmerce.com' (any Commmerce admin) or one exact origin
  apiKey: 'YOUR_API_KEY',
});
const { theme } = await app.ready;           // follow it: <html data-cm-theme="dark">

await app.toast.show('Review published', { tone: 'success' });

const choice = await app.modal.open({
  title: 'Delete review?',
  message: "This can't be undone.",
  primaryAction: { label: 'Delete review', destructive: true },
  secondaryAction: { label: 'Cancel' },
});
if (choice === 'primary') await deleteReview();

form.addEventListener('input', () => app.saveBar.show({ message: 'Unsaved changes' }));
app.on('saveBar.save', save);
app.on('saveBar.discard', discard);

const token = await app.getSessionToken();
await fetch('/api/reviews', { headers: { Authorization: \`Bearer \${token}\` } });` }])}
  ${h2('Admin origin', 'admin-origin')}
  <p>Each Commmerce product has its admin on a subdomain of commmerce.com, and your app can run inside any of them. Set <code>hostOrigin</code> (and <code>issuer</code> on your backend) to the pattern <code>https://*.commmerce.com</code> so it works in all of them. Use one exact origin, such as <code>https://admin.example.com</code>, only if your app must run in one admin alone.</p>
  ${table(['<code>https://*.commmerce.com</code>', 'Matches?'], rowsMd([
    ['`https://admin.commmerce.com`, `https://preprod.commmerce.com`', 'Yes: any subdomain'],
    ['`https://a.b.commmerce.com`', 'Yes: any depth'],
    ['`https://commmerce.com`', 'No: the bare domain is not a subdomain'],
    ['`https://evilcommmerce.com`, `https://commmerce.com.evil.com`', 'No: look-alikes'],
    ['`http://admin.commmerce.com`, `https://admin.commmerce.com:8443`', 'No: another scheme or port'],
    ['`https://127.0.0.1`', 'No: IP addresses never match'],
  ]))}
  <ul>
    <li>Exactly what matches: the same scheme and port as the pattern (no port means the scheme's default), and a host name that ends with <code>.</code> plus the domain, with at least one label before it. Letter case does not matter.</li>
    <li>Allowed patterns: <code>https://*.domain</code> or <code>http://*.domain</code>, optionally with <code>:port</code>. One leading <code>*.</code> only; the domain needs at least one dot (<code>https://*.com</code> is refused); no path, no other wildcards. <code>*</code> on its own is refused. For local development only, <code>http://*.localhost:&lt;port&gt;</code> is allowed too, because <code>*.localhost</code> only ever reaches your own computer.</li>
    <li>Messages still go to one exact origin. The app finds the admin's actual origin (<code>location.ancestorOrigins[0]</code>; in browsers without it, such as Firefox, the origin of <code>document.referrer</code>), checks it against the pattern, and then talks only to that origin for the whole session: <code>app.hostOrigin</code>. It never posts to <code>*</code>. If the admin's origin does not match, or cannot be found, <code>createApp</code> throws.</li>
    <li>Even if a page managed to pass itself off as the admin's origin, the browser delivers your messages only to the window that really has that origin, so nothing reaches anyone else: requests just time out.</li>
    <li><code>exactHostOrigin</code> gives the admin's origin yourself (for tests, or an admin that hides its referrer in a browser without <code>ancestorOrigins</code>). It must still match the pattern.</li>
    <li>The admin side (<code>createHost</code>) takes your app's one exact origin as <code>appOrigin</code>: an app has one origin, so patterns are refused there.</li>
    <li>On your server, the same pattern works in <code>Content-Security-Policy: frame-ancestors https://*.commmerce.com</code>, where it means the same thing.</li>
  </ul>
  ${note('Patterns need App Bridge 1.0.0-rc.3 or later. Earlier pinned files (<code>/v/1.0.0-rc.2/</code> and before) compare an exact origin only: with them, use one exact origin.')}
  ${h2('Requests')}
  ${table(['Call', 'What the admin does', 'Resolves with'], rowsMd(BRIDGE_REQUESTS))}
  <p>Every call returns a promise. It rejects with an <code>AppBridgeError</code> whose <code>code</code> is one of:</p>
  ${table(['Code', 'Meaning'], rowsMd(ERROR_CODES))}
  ${h2('Session tokens')}
  <p>Send the token with every request to your backend, and verify it there: never trust a store or staff id sent from the browser. Tokens are JWTs signed with HS256 using your app secret, and live 60 seconds.</p>
  ${table(['Claim', 'Meaning'], rowsMd(TOKEN_CLAIMS))}
  ${codeBlock([{ label: 'Node.js', lang: 'jsx', code: `import { verifySessionToken } from '@commmerce/app-bridge/session-token';

app.use('/api', async (req, res, next) => {
  try {
    const token = req.get('authorization')?.replace(/^Bearer /, '');
    req.claims = await verifySessionToken(token, process.env.COMMMERCE_APP_SECRET, {
      audience: process.env.COMMMERCE_API_KEY,
      issuer: process.env.COMMMERCE_ADMIN_ORIGIN, // from your app settings, e.g. 'https://*.commmerce.com'
    });
    req.store = await db.installs.find(req.claims.dest); // only stores that installed your app
    if (!req.store) return res.sendStatus(403);
    next(); // req.claims.sub is the staff member
  } catch {
    res.sendStatus(401);
  }
});` }])}
  <p><code>verifySessionToken</code> refuses every algorithm except HS256 (including <code>none</code>), a wrong signature, an expired or not-yet-valid token (5 seconds of clock tolerance), a token for another app and, when you pass <code>issuer</code> (always do), a token from anyone but the admin. <code>issuer</code> takes an exact origin (compared exactly) or a pattern such as <code>https://*.commmerce.com</code>, with the rules in <a href="#/apps/app-bridge?s=admin-origin">Admin origin</a>; an invalid pattern throws a <code>TypeError</code> rather than refusing tokens. It uses Web Crypto, so it runs in Node 18+, Deno, Bun and edge runtimes. In other languages, use any JWT library with the same checks.</p>
  ${h2('Security')}
  <ul>
    <li>Your app gives <code>hostOrigin</code> (an exact origin, or a pattern that is resolved to one exact origin when the app starts), and the admin knows your app's exact origin. Each side posts only to that one origin and ignores messages from any other origin, and from any window other than the one it expects; <code>*</code> is refused.</li>
    <li>The admin checks every request before acting on it (types, lengths, paths that stay inside your app) and shows your text as text, never as HTML.</li>
    <li>Keep your app secret on your server. The token in the browser is short-lived and only proves who is using your app.</li>
    <li>On your backend, take the store from the verified token (<code>dest</code>), never from the request, and serve only stores that installed your app. Pass <code>issuer</code> to <code>verifySessionToken</code>.</li>
  </ul>
  ${h2('Protocol')}
  <p>For other languages and for the admin side. Plain objects over <code>postMessage</code>, each with <code>protocol: 'commmerce-app-bridge'</code> and <code>version: 1</code>:</p>
  <ul>
    <li>Request, app to admin: <code>{ kind: 'request', id, type, payload }</code>. The first is always <code>ready</code> (<code>{ apiKey }</code>), answered with <code>{ version, theme, locale }</code>.</li>
    <li>Response, admin to app: <code>{ kind: 'response', id, ok, result }</code> or <code>{ …, ok: false, error: { code, message } }</code>.</li>
    <li>Event, admin to app: <code>{ kind: 'event', type, payload }</code>.</li>
  </ul>
  <p>Request types: <code>ready</code>, <code>toast.show</code>, <code>modal.open</code>, <code>navigate</code>, <code>saveBar.show</code>, <code>saveBar.hide</code>, <code>resourcePicker.open</code>, <code>loading.start</code>, <code>loading.stop</code>, <code>sessionToken.get</code>, <code>frame.resize</code> (<code>{ height }</code>, from <code>autoResize</code>; the admin sets the frame's height unless it passes a <code>resize</code> handler). The admin side is <code>createHost({ iframe, appOrigin, handlers })</code>; <code>createReferenceHost</code> is the reference implementation this page runs.</p>
  ${h2('How it is tested')}
  <p>124 browser tests in Chromium with real frames: same-origin and cross-origin, refused origins and senders, invalid payloads, versions, time-outs, the reference host's components, frame auto-resize, session token signing and verification, and admin origin patterns (a stand-in admin on <code>admin.localhost</code> and <code>a.b.localhost</code> against <code>http://*.localhost:&lt;port&gt;</code>, the bare domain, other ports and schemes, IP addresses, and look-alike origins). Not yet tested in Firefox or WebKit, so the <code>document.referrer</code> fallback used where <code>location.ancestorOrigins</code> is missing is covered by unit tests only.</p>`,
  after(main) { runDemoApp(main, 'demo-reviews-app', (a) => DEMO_APP(a.bridge, a.css, a.ui, a.hostOrigin)); } });

// Plays the admin for a demo app in #ab-frame: App Bridge's reference host answers its requests with Commmerce UI
// components inside #ab-host, and #ab-address shows the admin address the app asks for.
async function runDemoApp(main, apiKey, doc, ownUrl = false) {
  const f = $('#ab-frame', main);
  if (!f) return;
  try {
    const bridge = await import(asset('vendor/app-bridge.js'));
    const secret = 'demo-secret-not-for-real-use';
    const host = bridge.createReferenceHost({
      iframe: f, appOrigin: location.origin, root: $('#ab-host', main), apiKey,
      info: { theme: document.documentElement.dataset.cmTheme === 'dark' ? 'dark' : 'light', locale: 'en-IN' },
      navigate: (path) => { $('#ab-address', main).textContent = `/apps/product-reviews${path}`; },
      resources: () => [{ id: 'p1', title: 'Blue linen kurta' }, { id: 'p2', title: 'Hand-block printed scarf' }, { id: 'p3', title: 'Brass diya, set of 4' }],
      sessionToken: () => bridge.signSessionToken({ iss: location.origin, dest: 'https://preprod.commmerce.com', aud: apiKey, sub: 'staff-7', sid: 'demo-session' }, secret),
    });
    // Disconnect once the reader leaves this page (the router replaces the page content).
    const stop = () => setTimeout(() => { if (!f.isConnected) { host.destroy(); window.removeEventListener('hashchange', stop); } });
    window.addEventListener('hashchange', stop);
    const html = doc({ bridge: asset('vendor/app-bridge.js'), css: asset('vendor/tokens.css'), ui: asset('vendor/cdn.js'), hostOrigin: location.origin });
    // An app with its own routes needs its own document address (a srcdoc frame shares this page's), so it gets a blob: URL.
    if (ownUrl) { const url = URL.createObjectURL(new Blob([html], { type: 'text/html' })); f.src = url; window.addEventListener('hashchange', () => { if (!f.isConnected) URL.revokeObjectURL(url); }, { once: true }); } else f.srcdoc = html;
  } catch (e) {
    $('#ab-host', main).innerHTML = `<p class="muted" style="padding:16px">The live example can't run on this page (${esc(e.message)}). Use the code below.</p>`;
  }
}

/* ---- Components ---- */
pages['/components'] = (params) => {
  const all = [
    ...orderedComponents.map((c) => ({ ...c, status: 'ready' })),
    ...planned.map((p) => ({ ...p, summary: STATUS[p.status].text })),
  ];
  const groups = groupsOrder.filter((g) => all.some((c) => c.group === g));
  const want = params.get('status');
  return { wide: true, title: 'Components', html: `
  <h1>Components</h1>
  <p class="lead">${FACTS.ready} components ready to use, ${FACTS.inProgress} in progress and ${FACTS.planned} planned. Each ready component is a web component with a React wrapper.</p>
  ${statusKey()}
  <div class="toolbar catalog-tools">
    <div class="search" style="position:relative"><cm-icon name="search" size="16"></cm-icon><input id="cq" type="search" placeholder="Search components" aria-label="Search components" autocomplete="off"></div>
    <label class="sel"><span>Category</span><select id="cgroup"><option value="">All categories</option>${groups.map((g) => `<option>${g}</option>`).join('')}</select></label>
    <div class="seg" role="group" aria-label="Status">${[['', 'All'], ['ready', 'Ready'], ['in-progress', 'In progress'], ['planned', 'Planned']].map(([v, l]) => `<button data-st="${v}" aria-pressed="${(want ?? '') === v}">${l}</button>`).join('')}</div>
    <span class="muted" id="ccount" role="status"></span>
  </div>
  <div id="catalog"></div>`,
  after(main) {
    let st = want ?? '';
    const q = $('#cq', main), grp = $('#cgroup', main), out = $('#catalog', main);
    const card = (c) => c.status === 'ready'
      // The name is the link and stretches over the card, so previews may contain links of their own
      // (nested <a> elements would split the card apart).
      ? `<div class="ccard"><div class="thumb" inert>${inlineLayout(c.examples[0].html)}</div><div class="meta"><a class="ccard-link" href="#/components/${c.slug}"><strong>${c.name}</strong></a><span>${c.adminOnly ? 'Admin only. ' : ''}${esc(c.summary)}</span></div></div>`
      : `<div class="ccard soon"><div class="thumb">${badge(c.status)}</div><div class="meta"><a class="ccard-link" href="#/components/${c.slug}"><strong>${c.name}</strong></a><span>Not usable yet${c.adminOnly ? ' · admin only' : ''}</span></div></div>`;
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      const list = all.filter((c) => (!st || c.status === st) && (!grp.value || c.group === grp.value)
        && (!s || `${c.name} ${c.summary ?? ''} ${c.tag ?? ''} ${c.group}`.toLowerCase().includes(s)));
      const g = byGroup(list);
      out.innerHTML = groups.filter((x) => g[x]).map((x) => `<section class="cgroup"><h2>${x}</h2><div class="cgrid">${g[x].map(card).join('')}</div></section>`).join('')
        || `<p class="muted">No components match. Request one at ${mail('Component request')}.</p>`;
      $('#ccount', main).textContent = `${list.length} of ${all.length}`;
    };
    q.addEventListener('input', draw); grp.addEventListener('change', draw);
    main.querySelectorAll('[data-st]').forEach((b) => b.addEventListener('click', () => {
      st = b.dataset.st; main.querySelectorAll('[data-st]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw();
    }));
    draw();
  } };
};

const patternsUsing = (slug) => patterns.filter((p) => p.uses.includes(slug));
function componentPage(c) {
  const api = (tag, many) => {
    const d = decl(tag);
    if (!d) return '';
    const props = d.members.filter((m) => m.kind === 'field' && m.privacy !== 'private' && m.attribute && !m.static);
    const sfx = many ? ` of ${tag}` : '';
    return `<h3 id="props-${tag}">Properties${sfx}</h3>
  ${table(['Attribute', 'Type', 'Default', 'Description'], props.map((p) => `<tr><td><code>${p.attribute}</code>${p.attribute !== p.name ? `<br><small class="muted">${p.name}</small>` : ''}</td><td class="type"><code>${esc(p.type?.text ?? '')}</code></td><td>${p.default ? `<code>${esc(p.default)}</code>` : '—'}</td><td>${md(p.description ?? '')}</td></tr>`), 'api')}
  ${d.slots?.length ? `<h3>Slots${sfx}</h3>` + table(['Name', 'Description'], d.slots.map((s) => `<tr><td><code>${s.name || '(default)'}</code></td><td>${md(s.description ?? '')}</td></tr>`), 'api') : ''}
  ${d.events?.filter((e) => e.name !== 'name').length ? `<h3>Events${sfx}</h3>` + table(['Event', 'React prop', 'Description'], d.events.filter((e) => e.name !== 'name').map((e) => `<tr><td><code>${e.name}</code></td><td><code>${reactEvent(e.name)}</code></td><td>${md(e.description ?? '')}</td></tr>`), 'api') : ''}`;
  };
  const tags = [c.tag, ...(c.parts ?? []).map((p) => p.tag)];
  const reacts = [c.react, ...(c.parts ?? []).map((p) => p.react)];
  const ex = c.examples.map((e) => ({ ...e, html: inlineLayout(e.html) }));
  const uses = patternsUsing(c.slug);
  return { title: c.name, html: `
  <h1>${c.name}</h1>
  <p class="status-line">${badge('ready')} <span class="muted">Preview API: may change before 1.0. <a href="#/releases/stability">Stability</a></span></p>
  <p class="lead">${md(c.lead)}</p>
  ${c.adminOnly ? note('<strong>For Commmerce products only, not for apps.</strong> This is part of the admin itself. Apps run inside the admin, which already shows this navigation; an app never draws its own.') : ''}
  <div class="example" id="viewer">
    <div class="ex-bar">
      <label for="exsel">Example</label>
      <select id="exsel">${ex.map((e, i) => `<option value="${i}">${esc(e.title)}</option>`).join('')}</select>
      <span class="grow"></span>
      <div class="seg" role="group" aria-label="Preview theme"><button data-theme="light" aria-pressed="true"><cm-icon name="sun" size="14"></cm-icon>Light</button><button data-theme="dark" aria-pressed="false"><cm-icon name="moon" size="14"></cm-icon>Dark</button></div>
      <div class="seg" role="group" aria-label="Preview width"><button data-w="wide" aria-pressed="true">Desktop</button><button data-w="narrow" aria-pressed="false">Phone</button></div>
    </div>
    <p class="ex-desc" id="exdesc"></p>
    <div class="ex-stage" id="stage" data-cm-theme="light"><div class="ex-frame" id="frame"></div></div>
    <div id="excode"></div>
  </div>
  ${c.states ? `${h2('States')}
  <p class="muted">Beyond the examples above: ${c.states.map((st) => esc(st.title.toLowerCase())).join(', ')}.</p>
  <div class="states">${c.states.map((st, i) => `<section class="state" aria-labelledby="state-${i}">
    <h3 id="state-${i}">${esc(st.title)}</h3>
    ${st.description ? `<p>${md(st.description)}</p>` : ''}
    <div class="ex-stage state-stage" data-cm-theme="light"><div class="ex-frame">${inlineLayout(st.html)}</div></div>
    <details><summary>Code</summary>${codeBlock([{ label: 'HTML', lang: 'html', code: inlineLayout(st.html) }, { label: 'React', lang: 'jsx', code: toReact(inlineLayout(st.html)) }], { flush: true })}</details>
  </section>`).join('')}</div>` : ''}
  ${h2('Use it')}
  ${table(null, [
    `<tr><th scope="row">HTML element</th><td>${tags.map((t) => `<code>&lt;${t}&gt;</code>`).join(' ')}</td></tr>`,
    `<tr><th scope="row">React</th><td>${reacts.map((r) => `<code>${r}</code>`).join(' ')} from <code>@commmerce/ui-react</code> (npm package planned)</td></tr>`,
    `<tr><th scope="row">Load it</th><td>Included in the <a href="#/start">preview build</a>; no separate import.</td></tr>`,
    `<tr><th scope="row">Frameworks</th><td>Plain HTML and server-rendered pages; React (preview). Others not tested. <a href="#/start/install">Details</a></td></tr>`,
  ], 'kv')}
  ${h2('API')}
  <p class="muted">Set attributes in HTML (kebab-case, <code>help-text</code>) or properties in JavaScript and React (camelCase, <code>helpText</code>). Generated from the component source.</p>
  ${tags.map((t) => api(t, tags.length > 1)).join('')}
  ${h2('Keyboard and screen readers')}<ul>${c.a11y.map((x) => `<li>${md(x)}</li>`).join('')}</ul>
  ${h2('Best practices')}
  ${doDont(c.do, c.dont)}
  ${c.content?.length ? `${h2('Content guidelines')}<ul>${c.content.map((x) => `<li>${md(x)}</li>`).join('')}</ul>` : ''}
  ${h2('Related')}
  <div class="related">${c.related.map((s) => components.find((x) => x.slug === s)).filter(Boolean).map((r) => `<a href="#/components/${r.slug}">${r.name}</a>`).join('')}
  ${uses.map((p) => `<a class="pat" href="#/patterns/${p.slug}">Pattern: ${p.name}</a>`).join('')}</div>`,
  after(main) {
    const sel = $('#exsel', main), frame = $('#frame', main), desc = $('#exdesc', main), codeEl = $('#excode', main);
    const show = (i) => {
      const e = ex[i];
      frame.innerHTML = e.html;
      // Overlay examples: a button with data-opens="<id>" opens that overlay (in an app, call show() or set open).
      frame.querySelectorAll('[data-opens]').forEach((b) => b.addEventListener(b.localName === 'cm-search' ? 'cm-filter' : 'click', () => frame.querySelector(`#${b.dataset.opens}`)?.show?.()));
      wireToasts(frame);
      desc.innerHTML = md(e.description ?? '');
      desc.hidden = !e.description;
      codeEl.innerHTML = codeBlock([{ label: 'HTML', lang: 'html', code: e.html }, { label: 'React', lang: 'jsx', code: toReact(e.html) }], { flush: true });
      wireCode(codeEl);
    };
    sel.addEventListener('change', () => show(+sel.value));
    show(0);
    main.querySelectorAll('.state-stage').forEach((st) => {
      st.dataset.cmTheme = effectiveTheme();
      st.querySelectorAll('[data-opens]').forEach((b) => b.addEventListener('click', () => st.querySelector(`#${b.dataset.opens}`)?.show?.()));
      wireToasts(st);
    });
    const siteTheme = effectiveTheme();
    $('#stage', main).dataset.cmTheme = siteTheme;
    main.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.theme === siteTheme)));
    main.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => {
      $('#stage', main).dataset.cmTheme = b.dataset.theme;
      main.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
    main.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => {
      frame.classList.toggle('narrow', b.dataset.w === 'narrow');
      main.querySelectorAll('[data-w]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    }));
  } };
}
components.forEach((c) => (pages[`/components/${c.slug}`] = () => componentPage(c)));

planned.forEach((p) => (pages[`/components/${p.slug}`] = () => ({ title: p.name, html: `
  <h1>${p.name}</h1>
  <p class="status-line">${badge(p.status)} <span class="muted">${STATUS[p.status].text}</span></p>
  <p class="lead">${p.name} is designed in the Commmerce Design System (Figma page "${esc(p.figma)}") and ${p.status === 'in-progress' ? 'is in the next build batch' : 'is scheduled in a later build batch'}. There is no element or API to use yet.</p>
  ${p.adminOnly ? note('This is part of the admin itself. When built, it is for Commmerce\'s own products only. Apps don\'t draw their own admin navigation.') : ''}
  ${h2('What to use meanwhile')}
  <p>${md(p.use ?? 'Nothing equivalent yet. Design the screen without it, or keep it out of your first release.')}</p>
  ${h2('Follow progress')}
  <p>When it ships, it appears in the <a href="#/components">component list</a> as Ready and in the <a href="#/releases">release notes</a>. To ask for it sooner, email ${mail(`Component request: ${p.name}`)}.</p>` })));

/* ---- Patterns ---- */
const KIND = { example: ['Working example', 'success'], guidance: ['Guidance', 'neutral'] };
pages['/patterns'] = () => ({ wide: true, title: 'Patterns', html: `
  <h1>Patterns</h1>
  <p class="lead">Complete merchant workflows, built from the components. A <strong>working example</strong> is a layout you can copy today. <strong>Guidance</strong> describes the recommended approach where some parts are not built yet.</p>
  <div class="pgrid">${patterns.map((p) => `<a class="pcard" href="#/patterns/${p.slug}"><cm-badge tone="${KIND[p.kind][1]}">${KIND[p.kind][0]}</cm-badge><strong>${p.name}</strong><span>${esc(p.task)}</span>${p.status ? `<small class="muted">${esc(p.status)}</small>` : ''}</a>`).join('')}</div>` });

patterns.forEach((p) => (pages[`/patterns/${p.slug}`] = () => ({ wide: true, title: p.name, html: `
  <h1>${p.name}</h1>
  <p class="status-line"><cm-badge tone="${KIND[p.kind][1]}">${KIND[p.kind][0]}</cm-badge>${p.status ? ` <span class="muted">${esc(p.status)}</span>` : ''}</p>
  <div class="task"><span>Merchant task</span><p>${esc(p.task)}</p></div>
  ${p.states ? `<div class="example"><div class="ex-bar"><cm-option-group id="state-pick" aria-label="State to show">${Object.keys(statesHtml).map((k, i) => `<option value="${k}" ${i ? '' : 'selected'}>${k[0].toUpperCase() + k.slice(1)}</option>`).join('')}</cm-option-group></div>
      <div class="ex-stage"><div class="ex-frame" id="state-frame"></div></div><div id="state-code"></div></div>`
    : p.app ? `<div class="example ab-demo">
      <div class="ex-bar"><span class="muted small">Admin address</span> <code id="ab-address">/apps/product-reviews</code></div>
      <div id="ab-host" class="ab-host"><iframe id="ab-frame" title="Example app: Product reviews" loading="lazy"></iframe></div>
      ${codeBlock([{ label: 'HTML', lang: 'html', code: p.app({ bridge: PREVIEW.bridge, css: PREVIEW.css, ui: PREVIEW.js, hostOrigin: 'YOUR_ADMIN_ORIGIN' }) }], { flush: true })}</div>`
    : p.html ? `<div class="example">${p.banner ? '<div class="ex-msg"><cm-banner data-pattern-status hidden></cm-banner></div>' : ''}<div class="ex-stage ex-stage--app"><div class="ex-app" id="pattern-live">${p.html}</div></div>
      ${codeBlock([{ label: 'HTML', lang: 'html', code: p.html }, { label: 'React', lang: 'jsx', code: toReact(p.html) }], { flush: true })}</div>` : ''}
  ${h2('Recommended layout and behaviour')}
  <ul>${p.layout.map((x) => `<li>${md(x)}</li>`).join('')}</ul>
  ${p.notes.length ? p.notes.map((n) => note(md(n))).join('') : ''}
  ${h2('Components used')}
  <div class="related">${p.uses.map((s) => components.find((c) => c.slug === s)).filter(Boolean).map((c) => `<a href="#/components/${c.slug}">${c.name}</a>`).join('')}</div>`,
  after(main) {
    if (p.wire) p.wire(main);
    if (p.app) runDemoApp(main, 'product-reviews', p.app, true);
    if (p.states) {
      const pick = $('#state-pick', main), frame = $('#state-frame', main), code = $('#state-code', main);
      const show = () => { const h = statesHtml[pick.value || 'empty']; frame.innerHTML = h; code.innerHTML = codeBlock([{ label: 'HTML', lang: 'html', code: h }, { label: 'React', lang: 'jsx', code: toReact(h) }], { flush: true }); wireCode(code); };
      pick.addEventListener('change', show); show();
    }
  } })));

/* ---- Foundations ---- */
pages['/foundations/accessibility'] = () => ({ title: 'Accessibility', html: `
  <h1>Accessibility</h1>
  <p class="lead">Merchants run their stores with screen readers, keyboards, zoom and phones in bright sunlight. Commmerce UI targets WCAG 2.2 level AA. This page says exactly what has been checked and what has not.</p>
  ${h2('How it is evaluated')}
  ${table(['Check', 'Status', 'What it covers'], [
    ['Automated colour contrast', badge('ready'), 'Every foreground and background token pair the components use, in light and dark. The token build fails if one drops below AA.'],
    ['Automated browser tests', badge('ready'), 'Every ready component has tests in Chromium for keyboard use, ARIA roles and names, events and form behaviour. They run before every release.'],
    ['Automated accessibility audit', badge('ready'), 'axe-core 4.10.2 with the WCAG 2.0, 2.1 and 2.2 A and AA rules, run on every example of every component page, the overlays the examples open and the States sections, in light and dark (338 checks), plus a keyboard sweep of every example (254 tab stops) for a visible focus indicator and no keyboard traps. Last run on 1.0.0-rc.2: no violations. Automated tools find only part of the problems people meet.'],
    ['Safari (WebKit)', badge('ready'), 'The full component test suite runs in WebKit 18.2, the engine behind Safari, on every change; every docs page and its live components were also checked in WebKit.'],
    ['Firefox', badge('ready'), 'The full component test suite runs in Firefox on every change (Playwright\'s Firefox build, on Linux). The React wrapper and App Bridge tests run in Chromium only.'],
    ['Screen reader testing (VoiceOver, NVDA, TalkBack)', `<cm-badge>Not done yet</cm-badge>`, 'Accessible names and roles are tested in code, not yet with real screen readers.'],
    ['Full WCAG 2.2 AA audit', `<cm-badge>Not done yet</cm-badge>`, 'A review by people (screen readers, zoom and reflow, speech input) is planned before 1.0.0. Commmerce UI does not claim conformance until it is done.'],
  ].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`))}
  ${h2('What the "AA contrast" check means')}
  <ul>
    <li>Text colours reach <strong>4.5:1</strong> against every background they are paired with; icons, input borders and focus rings reach <strong>3:1</strong>.</li>
    <li>It covers the pairs used inside Commmerce UI components, in both themes. It does not cover your own colours, images or text over photos.</li>
    <li>Contrast is one part of AA. Keyboard access, names, focus order and timing are covered by the tests above.</li>
  </ul>
  <p>Where a Figma colour was too light, it keeps its hue and is darkened only as far as needed:</p>
  ${table(['Token', 'Figma', 'Now', 'Contrast'], [
    ['text-information', '#F18402', '#AD5500', '2.3 → 4.6:1'], ['text-success', '#61AD14', '#3C7C00', '2.5 → 4.7:1'],
    ['text-speciality', '#1EC81A', '#008800', '2.3 → 4.6:1'], ['text-critical', '#E50000', '#DE0000', '4.4 → 4.6:1'],
    ['text-attention', '#3274B6', '#2E6FAF', '4.3 → 4.6:1'], ['text-counter', '#3E6CFF', '#3B68F9', '4.4 → 4.6:1'],
    ['icon-default', '#9E9E9E', '#8B8B8B', '2.5 → 3.4:1'], ['border-input', '#D6D6D6', '#8B8B8B', '1.5 → 3.4:1'],
  ].map(([t, a, b, c]) => `<tr><td><code>${t}</code></td><td><span class="swatch" style="background:${a}"></span>${a}</td><td><span class="swatch" style="background:${b}"></span>${b}</td><td>${c}</td></tr>`))}
  ${h2('What the components do for you')}
  <ul>
    <li>Native elements inside each component, so roles and keyboard behaviour come from the browser.</li>
    <li>A visible 2px focus ring in both themes.</li>
    <li>Labels, help text and errors tied to their controls; errors are announced.</li>
    <li>Critical banners interrupt the screen reader; others wait their turn.</li>
    <li>Icons are hidden from screen readers unless you give them a label.</li>
  </ul>
  ${h2('What you still need to do')}
  <ul>
    <li>Give every field a <code>label</code>, every page one <code>h1</code>, and every card a heading at the right level.</li>
    <li>Write errors that say how to fix the problem.</li>
    <li>Don't use colour alone to carry meaning: pair it with words, or an icon with a label.</li>
    <li>Try your flow with only a keyboard: Tab, Shift+Tab, Enter, Space and Esc.</li>
  </ul>` });

pages['/foundations/content'] = () => ({ title: 'Content', html: `
  <h1>Content</h1>
  <p class="lead">Words are part of the interface. Write for a busy merchant who wants to finish the task and get back to their store.</p>
  ${h2('Voice')}
  <ul><li><strong>Plain.</strong> Everyday words. "Delete", not "Purge".</li><li><strong>Direct.</strong> Lead with what matters. One idea per sentence.</li><li><strong>Calm.</strong> No exclamation marks, no blame. "The card was declined", not "You entered a bad card!"</li></ul>
  ${h2('Conventions')}
  ${table(['Element', 'Rule', 'Example'], [
    ['Field labels', 'Nouns, sentence case', '<code>Name</code>, <code>Subject</code>, <code>Redeemed</code>'],
    ['Hints', 'Lowercase, in brackets after the label', '<code>Ordered [points earned per rupee (rs. 1) spent]</code>'],
    ['Help text', 'One sentence under the control, no full stop needed', '<code>Phone otp is only for Indian numbers</code>'],
    ['Buttons', 'Title case, verb first, short', '<code>Save</code>, <code>Send Preview</code>, <code>Add Product</code>'],
    ['Breadcrumbs', 'Above the page title', '<code>Dashboard / Products / Add Product</code>'],
    ['Text actions', 'Uppercase with wide tracking', '<code>ADD</code>, <code>REMOVE</code>, <code>UPGRADE</code>'],
    ['Money', 'Rupees as "Rs." with Indian digit grouping', '<code>Rs. 1,24,999</code>'],
    ['Errors', 'What happened and how to fix it', '<code>Enter a price above 0</code>'],
    ['Statuses', 'One word for one state, everywhere', '<code>Paid</code>, <code>Processing</code>, <code>Delivered</code>'],
  ].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`))}` });

const colorGroups = [
  ['Surfaces', (n) => n.startsWith('bg-') && !/(attention|information|success|critical|error)/.test(n)],
  ['Status', (n) => /(attention|information|success|critical|error)/.test(n) && !n.startsWith('border')],
  ['Text', (n) => n.startsWith('text-')], ['Icons', (n) => n.startsWith('icon-')],
  ['Borders', (n) => n.startsWith('border-')], ['Actions', (n) => n.startsWith('action-')],
  ['Navigation and controls', (n) => /^(nav-|toggle-|avatar|thumb|overlay)/.test(n)], ['Grey scale (not themed)', (n) => n.startsWith('gray-')],
];
pages['/foundations/colors'] = () => {
  const used = new Set();
  const chip = (t) => `<button class="chip copyable" data-copy="var(${t.cssVar})" aria-label="Copy var(${t.cssVar})">
    <span class="fill"><i style="background:${t.value.light}"></i><i style="background:${t.value.dark ?? t.value.light}"></i></span>
    <span class="info"><b>${t.name}</b><small>${t.value.light}${t.value.dark && t.value.dark !== t.value.light ? ' · ' + t.value.dark : ''}</small></span></button>`;
  return { wide: true, title: 'Colour', html: `
  <h1>Colour</h1>
  <p class="lead">Black and white first; colour only for meaning. Each swatch shows light on the left and dark on the right. Select one to copy its variable.</p>
  ${note('Information is <strong>orange</strong> and attention is <strong>blue</strong> in this system, the reverse of many others. Always pick tokens by name.')}
  ${colorGroups.map(([title, test]) => {
    const list = colorTokens.filter((t) => !used.has(t.name) && test(t.name));
    list.forEach((t) => used.add(t.name));
    return list.length ? `${h2(title)}<div class="palette">${list.map(chip).join('')}</div>` : '';
  }).join('')}` };
};

pages['/foundations/typography'] = () => {
  const styles = tokens.filter((t) => t.family === 'type' && t.group);
  const ramp = (g) => `<div class="ramp">${styles.filter((s) => s.group === g).map((s) => `<div>
    <small>${s.name.replace('type-', '')}</small>
    <span style="font-size:${s.value.fontSize};font-weight:${s.value.fontWeight};line-height:${s.value.lineHeight}">Rs. 2,340 · 12 orders today</span>
    <small>${s.value.fontSize} / ${s.value.fontWeight}</small></div>`).join('')}</div>`;
  return { title: 'Typography', html: `
  <h1>Typography</h1>
  <p class="lead">Poppins, in two ramps: Desktop and Responsive (414px). Headings are 600 and 500, everything else 400.</p>
  ${h2('Desktop')}${ramp('Desktop')}
  ${h2('Responsive')}${ramp('Responsive')}
  ${h2('Uppercase labels')}
  <p>Text actions and badges are Medium weight, uppercase, with <code>--cm-tracking-caps</code> (16%).</p>
  <p style="font-size:14px;font-weight:500;letter-spacing:var(--cm-tracking-caps)">UPGRADE</p>
  <p style="font-size:10px;font-weight:500;letter-spacing:var(--cm-tracking-caps)">REMOVE</p>
  ${h2('Using type tokens')}
  ${codeBlock([{ label: 'CSS', lang: 'html', code: `.title {
  font-family: var(--cm-font-sans);
  font-size: var(--cm-type-heading-lg-size);
  font-weight: var(--cm-type-heading-lg-weight);
  line-height: var(--cm-type-heading-lg-line-height);
}` }])}` };
};

pages['/foundations/spacing'] = () => ({ title: 'Spacing', html: `
  <h1>Spacing</h1>
  <p class="lead">Six steps. Desktop gaps are 20–30px; phone gaps 10–22px.</p>
  <div class="ramp">${tokens.filter((t) => t.family === 'spacing').map((t) => `<div><button class="copyable" data-copy="var(${t.cssVar})" aria-label="Copy var(${t.cssVar})"><code>${t.name}</code></button><span><span class="bar" style="display:block;width:${t.value}"></span></span><small>${t.value}</small></div>
    <div class="ramp-note"><span class="muted">${esc(t.usage)}</span></div>`).join('')}</div>` });

pages['/foundations/shape'] = () => ({ title: 'Shape and depth', html: `
  <h1>Shape and depth</h1>
  <p class="lead">Flat surfaces with 1px borders. Shadow only for things that float.</p>
  ${h2('Corner radius')}
  <div class="cols">${tokens.filter((t) => t.family === 'radius').map((t) => `<div style="display:flex;gap:16px;align-items:center"><span class="radius-demo" style="border-radius:${t.value}"></span><span><button class="copyable" data-copy="var(${t.cssVar})" aria-label="Copy var(${t.cssVar})"><code>${t.name}</code></button><br><small class="muted">${t.value} · ${esc(t.usage)}</small></span></div>`).join('')}</div>
  ${h2('Borders')}
  <p>Always 1px (<code>--cm-border-1</code>). <code>border-default</code> for cards and dividers, <code>border-input</code> around form controls, <code>border-strong</code> for focus and selection, <code>border-critical</code> for errors.</p>
  ${h2('Shadow')}
  <div class="cols">${tokens.filter((t) => t.family === 'shadow').map((t) => `<div style="padding:28px;border-radius:var(--cm-radius-md);background:var(--cm-bg-surface);box-shadow:${t.value};border:1px solid var(--cm-border-subtle)"><button class="copyable" data-copy="var(${t.cssVar})" aria-label="Copy var(${t.cssVar})"><code>${t.name}</code></button><p class="muted" style="font-size:13px;margin:6px 0 0">${esc(t.usage)}</p></div>`).join('')}</div>` });

pages['/foundations/tokens'] = (params) => {
  const fams = ['all', ...new Set(tokens.map((t) => t.family))];
  return { wide: true, title: 'Tokens', html: `
  <h1>Tokens</h1>
  <p class="lead">${FACTS.tokens} named design decisions. Use the variable, never the raw value, so your UI follows the theme and future updates. Select a name to copy it.</p>
  <div class="toolbar">
    <div class="search" style="position:relative"><cm-icon name="search" size="16"></cm-icon><input id="tq" type="search" placeholder="Filter tokens" aria-label="Filter tokens" value="${esc(params.get('q') ?? '')}"></div>
    <div class="seg" role="group" aria-label="Token family">${fams.map((f, i) => `<button data-fam="${f}" aria-pressed="${i === 0}">${f === 'all' ? 'All' : f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>
    <span class="muted" id="tcount" role="status"></span>
  </div>
  <div class="tbl-wrap"><table><thead><tr><th scope="col">Token</th><th scope="col">Light</th><th scope="col">Dark</th><th scope="col">Usage</th></tr></thead><tbody id="tbody"></tbody></table></div>
  ${h2('Formats')}
  <p>The preview build ships the CSS. The JavaScript and JSON forms come with the <code>@commmerce/tokens</code> npm package (planned).</p>
  ${codeBlock([
    { label: 'CSS', lang: 'html', code: `.panel { background: var(--cm-bg-surface); color: var(--cm-text-default); }` },
    { label: 'JavaScript', lang: 'jsx', code: `import { tokens } from '@commmerce/tokens'; // planned\nstyle.background = tokens.bgSurface; // 'var(--cm-bg-surface)'` },
    { label: 'JSON', lang: 'html', code: `// @commmerce/tokens/tokens.json (planned)\n{ "themes": ["light", "dark"], "tokens": [{ "name", "family", "cssVar", "value", "usage" }] }` },
  ])}`,
  after(main) {
    let fam = 'all';
    const q = $('#tq', main), body = $('#tbody', main);
    const val = (t, th) => {
      if (t.family === 'type' && t.group) return `<code>${t.value.fontSize} / ${t.value.fontWeight}</code>`;
      const v = tokenValue(t, th);
      const sw = t.family === 'color' ? `<span class="swatch" style="background:${v}"></span>` : '';
      return `${sw}<code>${esc(v)}</code>`;
    };
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      const list = tokens.filter((t) => (fam === 'all' || t.family === fam) && (!s || `${t.name} ${t.usage ?? ''} ${JSON.stringify(t.value)}`.toLowerCase().includes(s)));
      body.innerHTML = list.map((t) => `<tr><td>${t.cssVar ? `<button class="copyable" data-copy="var(${t.cssVar})" aria-label="Copy var(${t.cssVar})"><code>${t.cssVar}</code></button>` : `<code>${t.name}</code><br><small class="muted">--cm-${t.name}-size, -weight, -line-height</small>`}</td>
        <td>${val(t, 'light')}</td><td>${t.family === 'color' ? val(t, 'dark') : '<span class="muted">same</span>'}</td><td>${md(t.usage ?? '')}</td></tr>`).join('') || `<tr><td colspan="4" class="muted">No tokens match.</td></tr>`;
      $('#tcount', main).textContent = `${list.length} of ${tokens.length}`;
    };
    q.addEventListener('input', draw);
    main.querySelectorAll('[data-fam]').forEach((b) => b.addEventListener('click', () => {
      fam = b.dataset.fam; main.querySelectorAll('[data-fam]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); draw();
    }));
    draw();
  } };
};

pages['/foundations/logo'] = () => ({ title: 'Logo', html: `
  <h1>Logo</h1>
  <p class="lead">The COMMMERCE wordmark and the M mark. For Commmerce's own products only.</p>
  <div class="cols">
    <div class="logo-tile" style="background:#fff;border:1px solid var(--cm-border-default)"><img src="vendor/brand/wordmark-black.svg" alt="Commmerce wordmark, black" style="width:100%"></div>
    <div class="logo-tile" style="background:#000"><img src="vendor/brand/wordmark-white.svg" alt="Commmerce wordmark, white" style="width:100%"></div>
    <div class="logo-tile" style="background:#fff;border:1px solid var(--cm-border-default);display:grid;place-items:center"><img src="vendor/brand/mark-black.svg" alt="Commmerce M mark" style="height:64px"></div>
  </div>
  <ul>
    <li>Black on light grounds, white on black and dark grey. Never coloured, outlined or stretched.</li>
    <li>No full stop after the name. At least 16px high in product UI.</li>
    <li>Marketing and large placements use the 2025 version with ™.</li>
  </ul>
  ${note('Apps built by other developers must not use the Commmerce logo or suggest that Commmerce made them.', 'warn')}` });

/* ---- Icons ---- */
pages['/icons'] = (params) => ({ wide: true, title: 'Icons', html: `
  <h1>Icons</h1>
  <p class="lead">${FACTS.icons} line icons on a 24px grid with a 1.6px round stroke. They take the colour of the text around them. Use them through <a href="#/components/icon"><code>cm-icon</code></a>.</p>
  <div class="toolbar"><div class="search" style="position:relative"><cm-icon name="search" size="16"></cm-icon><input id="iq" type="search" placeholder="Search icons" aria-label="Search icons" value="${esc(params.get('q') ?? '')}"></div><span class="muted" id="icount" role="status"></span></div>
  <div class="icon-grid" id="igrid"></div>
  <div class="icon-detail" id="idetail" hidden></div>`,
  after(main) {
    const q = $('#iq', main), grid = $('#igrid', main), det = $('#idetail', main);
    let current = null;
    const select = (n) => {
      current = n;
      grid.querySelectorAll('.icon-cell').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.n === n)));
      det.hidden = false;
      det.innerHTML = `<span class="big"><cm-icon name="${n}" size="40"></cm-icon></span>
        <div class="grow"><strong>${n}</strong>
          <code>&lt;cm-icon name="${n}"&gt;&lt;/cm-icon&gt;</code></div>
        <cm-button size="medium" data-c="html"><cm-icon slot="icon" name="copy" size="16"></cm-icon>Copy HTML</cm-button>
        <cm-button size="medium" data-c="react"><cm-icon slot="icon" name="code" size="16"></cm-icon>Copy React</cm-button>
        <cm-button size="medium" data-c="svg"><cm-icon slot="icon" name="download" size="16"></cm-icon>Copy SVG</cm-button>`;
      det.querySelector('[data-c=html]').addEventListener('click', () => copy(`<cm-icon name="${n}"></cm-icon>`, 'HTML'));
      det.querySelector('[data-c=react]').addEventListener('click', () => copy(`<Icon name="${n}" />`, 'React'));
      const svgReady = fetch(asset(`vendor/icons/svg/${n}.svg`)).then((r) => r.text());
      det.querySelector('[data-c=svg]').addEventListener('click', async () => copy(await svgReady, 'SVG'));
    };
    const draw = () => {
      const s = q.value.trim().toLowerCase();
      const list = iconNames.filter((n) => n.includes(s));
      grid.innerHTML = list.map((n) => `<button class="icon-cell" data-n="${n}" aria-pressed="${n === current}"><cm-icon name="${n}" size="24"></cm-icon>${n}</button>`).join('') || '<p class="muted">No icons match.</p>';
      $('#icount', main).textContent = `${list.length} of ${iconNames.length}`;
    };
    grid.addEventListener('click', (e) => { const b = e.target.closest('.icon-cell'); if (b) select(b.dataset.n); });
    q.addEventListener('input', draw);
    draw();
    if (params.get('q') && iconNames.includes(params.get('q'))) select(params.get('q'));
  } });

/* ---- Releases and support ---- */
pages['/releases'] = () => ({ title: 'Release notes', html: `
  <h1>Release notes</h1>
  <p class="lead">What changed in each release, newest first. Each release stays available at <code>/v/&lt;version&gt;/</code>; <code>/vendor/</code> serves the latest.</p>
  ${note('Until 1.0, read every release before upgrading: APIs can change. <a href="#/releases/stability">Stability</a>')}
  <div class="releases">${releaseNotes}</div>` });

pages['/releases/stability'] = () => ({ title: 'Versioning and stability', html: `
  <h1>Versioning and stability</h1>
  <p class="lead">Commmerce UI is in preview. Here is what that means for code you write against it today.</p>
  ${table(null, [
    `<tr><th scope="row">Breaking changes</th><td>Can happen in any release. Each one is listed in the <a href="#/releases">release notes</a>.</td></tr>`,
    `<tr><th scope="row">Least likely to change</th><td>Element names (<code>cm-*</code>), token names (<code>--cm-*</code>) and native events (<code>input</code>, <code>change</code>, <code>click</code>).</td></tr>`,
    `<tr><th scope="row">Most likely to change</th><td>Custom event details, slot names, and properties of recently added components.</td></tr>`,
    `<tr><th scope="row">Pinning a version</th><td>Load <code>/v/${PREVIEW.version}/</code> (or any earlier number). Those files never change. <a href="#/start/install">Choosing a version</a></td></tr>`,
    `<tr><th scope="row">Version numbers</th><td>Every release raises the number: the minor number for new components or changes, the last number for fixes. All packages share it.</td></tr>`,
  ], 'kv')}
  ${h2('From 1.0: compatibility policy')}
  <p>From 1.0.0, Commmerce UI follows semantic versioning: <code>major.minor.patch</code>. Every package shares the number: components, React wrappers, tokens, icons and App Bridge. The Flutter package will move to the same number.</p>
  ${table(null, [
    `<tr><th scope="row">Public API</th><td>Element names, attributes, properties, events, slots and documented CSS parts; the <code>--cm-*</code> tokens; React props; the App Bridge message protocol; Flutter widget constructors. None of these break within a major version.</td></tr>`,
    `<tr><th scope="row">Not public</th><td>The markup and styles inside components, and anything undocumented. These can change in any release, so do not depend on them.</td></tr>`,
    `<tr><th scope="row">Breaking changes</th><td>Only in a new major version (2.0, 3.0 and so on). Anything to be removed is first marked deprecated in a minor release, with a console warning and a note in the docs, and keeps working for at least <strong>6 months</strong> before a major version can remove it.</td></tr>`,
    `<tr><th scope="row">Fixes</th><td>The latest major version gets every fix. The previous major version gets security and critical fixes for <strong>6 months</strong> after the next one is released.</td></tr>`,
    `<tr><th scope="row">Hosted files</th><td>Pinned files (<code>/v/&lt;version&gt;/</code>) stay online and never change. <code>/vendor/</code> always serves the latest, so pin a version in production.</td></tr>`,
    `<tr><th scope="row">App Bridge</th><td>When a new protocol version ships, the admin keeps supporting the previous one for at least <strong>6 months</strong>, so embedded apps keep working while they upgrade.</td></tr>`,
    `<tr><th scope="row">Visual updates</th><td>Small colour and spacing adjustments to match the design system are not breaking changes, as long as layouts keep working. They are listed in the release notes.</td></tr>`,
    `<tr><th scope="row">Browsers</th><td>The last two versions of Chrome, Edge, Firefox and Safari (macOS and iOS). See <a href="#/support">Support and compatibility</a>.</td></tr>`,
  ], 'kv')}` });

pages['/support'] = () => ({ title: 'Support and compatibility', html: `
  <h1>Support and compatibility</h1>
  <p class="lead">What Commmerce UI runs on, how it is maintained, and where to get help.</p>
  ${h2('Browsers')}
  ${table(['Browser', 'Status'], [
    ['Chrome and Edge (current)', `${badge('ready')} Full test suite on every release (Chromium).`],
    ['Firefox 98 or later', `${badge('ready')} Full component test suite on every change.`],
    ['Safari 16.4 or later (macOS, iOS)', `${badge('ready')} Full component test suite in WebKit 18.2, the engine behind Safari, on every change, and run in real Safari 27 on macOS (181 of 182 pass; the other fails only because Safari\'s automation driver cannot type into a field inside a component, and the same keystrokes work when sent directly), and used day to day in Safari by the Commmerce team.`],
    ['Older browsers, Internet Explorer', 'Not supported. They lack form-associated custom elements.'],
  ].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`))}
  ${h2('Frameworks')}
  ${table(['Setup', 'Status', 'Notes'], FRAMEWORKS.map(([a, s, n]) => `<tr><td>${a}</td><td>${s === 'ready' ? badge('ready') : `<cm-badge>Not tested</cm-badge>`}</td><td>${linkifyText(n)}</td></tr>`))}
  ${h2('Get help, report a problem, request a component')}
  ${table(['Who', 'Where'], [
    ['Third-party app developers', `Email ${mail('Commmerce UI')} for questions, bug reports, component requests and setting up your app in the admin.`],
    ['Commmerce product teams', `Open an issue in the <code>commmerce-ui</code> GitHub repository, or email ${mail('Commmerce UI')}.`],
  ].map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`))}
  <p>When you report a problem, include the component, the browser and its version, what you expected, what happened, and the smallest markup that shows it.</p>
  ${h2('Ownership and maintenance')}
  <p>Commmerce UI is made and maintained by Commmerce. The design source is the Commmerce Design System file in Figma; the code lives in the private <code>commmerce-ui</code> repository. Components are being added in batches, with each batch tested, documented and announced in the <a href="#/releases">release notes</a>.</p>` });

pages['/contributing'] = () => ({ title: 'Contributing', html: `
  <h1>Contributing</h1>
  <p class="lead">How a component goes from the Figma file to this site, and how to take part.</p>
  ${h2('Commmerce product teams')}
  <ol class="steps">
    <li><h3>Design</h3><p>The component exists in the Commmerce Design System Figma file, with guidance in the design system.</p></li>
    <li><h3>Build</h3><p>Add <code>packages/ui/src/components/&lt;name&gt;.ts</code>. Style only with <code>--cm-*</code> tokens, render native elements inside, and document every property with a JSDoc comment: the API tables on this site are generated from them.</p></li>
    <li><h3>Test</h3><p>Add browser tests for keyboard use, ARIA, events and form behaviour. Run <code>npm test</code>. New colour pairs go in the token contrast check.</p></li>
    <li><h3>Document</h3><p>Add examples, best practices, content and accessibility notes to <code>docs/content.js</code>, and a release note to <code>docs/releases.js</code>.</p></li>
    <li><h3>Release</h3><p>Raise the version in every package and add a release note (the docs build fails otherwise). Pushing to the main branch publishes the docs and <code>/v/&lt;version&gt;/</code> within five minutes.</p></li>
  </ol>
  ${h2('Third-party developers')}
  <p>The source is private, so outside code contributions are not possible yet. Feedback, bug reports and component requests are welcome at ${mail('Commmerce UI feedback')}.</p>
  ${h2('Rules for every component')}
  <ul><li>No raw colour values in components.</li><li>Native events keep working; custom events are prefixed <code>cm-</code>.</li><li>Every colour pair goes in the token contrast check.</li><li>Elements register with <code>define()</code>, so loading the library twice is harmless.</li></ul>` });

/* ---------------- Shell: nav, sidebar, breadcrumbs, router ---------------- */
const nav = $('.topnav'), side = $('#sidebar'), main = $('#main'), layout = $('.layout');
nav.innerHTML = SECTIONS.map((s) => `<a href="#${s.pages[0].path}" data-sec="${s.id}">${s.title}</a>`).join('');

function renderSidebar(section, path) {
  let html = `<nav aria-label="All sections" class="mobile-sections">${SECTIONS.map((s) => `<a href="#${s.pages[0].path}" ${s === section ? 'aria-current="true"' : ''}>${s.title}</a>`).join('')}</nav>`;
  if (section) {
    let group = null;
    html += `<nav aria-label="${section.title}"><h2>${section.title}</h2>`;
    for (const p of section.pages) {
      if (p.group && p.group !== group) { group = p.group; html += `<h2>${group}</h2>`; }
      html += `<a href="#${p.path}" ${p.path === path ? 'aria-current="page"' : ''}>${p.title}${p.status ? `<small class="st st--${p.status}">${STATUS[p.status].label}</small>` : ''}</a>`;
    }
    html += '</nav>';
  }
  side.innerHTML = html;
}
function crumbs(section, meta) {
  if (!section) return '';
  const items = [['Home', '/'], [section.title, section.pages[0].path]];
  if (meta.group && meta.group !== 'Not available yet' && section.id !== 'foundations') items.push([meta.group, null]);
  if (meta.path !== section.pages[0].path) items.push([meta.title, null]);
  return `<nav class="crumb" aria-label="Breadcrumb"><ol>${items.map(([t, h], i) => `<li>${h && i < items.length - 1 ? `<a href="#${h}">${t}</a>` : `<span ${i === items.length - 1 ? 'aria-current="page"' : ''}>${t}</span>`}</li>`).join('')}</ol></nav>`;
}

// Hosted pages only allow plain #name hashes, so '/foundations/colors' lives at #foundations--colors
// and query parameters (?q=, ?s=, ?status=) are passed in memory, not in the URL.
const toHash = (path) => (path === '/' ? '' : path.slice(1).replace(/\//g, '--'));
const fromHash = (hash) => (hash ? '/' + hash.replace(/--/g, '/') : '/');
let pending = new URLSearchParams();
function go(href) {
  const [path, qs] = href.replace(/^#/, '').split('?');
  const params = new URLSearchParams(qs);
  if (path === currentPath && params.get('s')) { document.getElementById(params.get('s'))?.scrollIntoView(); return; }
  pending = params;
  const h = toHash(path || '/');
  if (location.hash.slice(1) === h) route(); else location.hash = h;
}
// Internal links are written as href="#/path?x=y"; translate them on click (also inside cm-button's shadow root).
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const a = e.composedPath().find((n) => n.getAttribute?.('href')?.startsWith('#'));
  if (!a) return;
  const href = a.getAttribute('href');
  if (href === '#main') { e.preventDefault(); main.focus(); return; }
  if (href === '#' || href.startsWith('#/')) { e.preventDefault(); go(href === '#' ? '/' : href.slice(1)); }
});

let first = true, currentPath = null;
function route() {
  let path = fromHash(location.hash.slice(1));
  if (REDIRECTS[path]) { history.replaceState(null, '', '#' + toHash(REDIRECTS[path])); path = REDIRECTS[path]; }
  const params = pending; pending = new URLSearchParams();
  currentPath = path;
  const page = (pages[path] ?? (() => ({ title: 'Page not found', html: `<h1>Page not found</h1><p class="lead">There is no page at this address. It may have moved when the site was reorganised.</p><p><a href="#/">Home</a> · <a href="#/start">Get started</a> · <a href="#/components">Components</a></p>` })))(params);
  const meta = allPages.find((p) => p.path === path);
  const section = meta?.section;
  layout.classList.toggle('no-side', page.side === false);
  renderSidebar(section, path);
  nav.querySelectorAll('a').forEach((a) => (a.dataset.sec === section?.id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
  let pager = '';
  if (section) {
    const i = section.pages.findIndex((p) => p.path === path);
    const prev = section.pages[i - 1], next = section.pages[i + 1];
    pager = `<nav class="pager" aria-label="Previous and next page">${prev ? `<a href="#${prev.path}"><small>Previous</small>${prev.title}</a>` : ''}${next ? `<a class="next" href="#${next.path}"><small>Next</small>${next.title}</a>` : ''}</nav>`;
  }
  main.innerHTML = `<div class="page ${page.wide ? 'page--wide' : ''}">${meta ? crumbs(section, meta) : ''}${page.html}${page.side === false ? '' : pager}</div>`;
  page.after?.(main);
  wireCode(main);
  document.title = path === '/' ? 'Commmerce UI' : `${page.title} · Commmerce UI`;
  side.classList.remove('open'); $('.menu-btn').setAttribute('aria-expanded', 'false');
  const s = params.get('s');
  if (s) document.getElementById(s)?.scrollIntoView();
  else window.scrollTo(0, 0);
  if (!first) main.focus({ preventScroll: true });
  first = false;
}
window.addEventListener('hashchange', route);

// Copy buttons anywhere in the page
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]');
  if (b) copy(b.dataset.copy, b.dataset.copy);
});

/* ---------------- Theme ---------------- */
const themeBtn = $('#theme');
const mq = matchMedia('(prefers-color-scheme: dark)');
const effectiveTheme = () => {
  const t = document.documentElement.dataset.cmTheme;
  return t === 'dark' || (t === 'auto' && mq.matches) ? 'dark' : 'light';
};
const setThemeUI = () => {
  const dark = effectiveTheme() === 'dark';
  document.documentElement.classList.toggle('is-dark', dark);
  themeBtn.querySelector('cm-icon').name = dark ? 'sun' : 'moon';
  themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
};
themeBtn.addEventListener('click', () => {
  const t = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.cmTheme = t;
  try { localStorage.setItem('cm-docs-theme', t); } catch {}
  setThemeUI();
  // An open example preview follows the site theme; its own Light/Dark switch can still override it.
  const stage = $('#stage');
  if (stage) {
    stage.dataset.cmTheme = t;
    document.querySelectorAll('[data-theme]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.theme === t)));
  }
});
setThemeUI();
mq.addEventListener('change', setThemeUI);
// Follow the host's light/dark setting when the viewer hasn't picked one on this site.
new MutationObserver(() => {
  let saved = null; try { saved = localStorage.getItem('cm-docs-theme'); } catch {}
  const host = document.documentElement.getAttribute('data-theme');
  if (!saved && host && host !== document.documentElement.dataset.cmTheme) { document.documentElement.dataset.cmTheme = host; setThemeUI(); }
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

/* ---------------- Mobile menu ---------------- */
$('.menu-btn').addEventListener('click', (e) => {
  const open = side.classList.toggle('open');
  e.currentTarget.setAttribute('aria-expanded', String(open));
  e.currentTarget.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
});

/* ---------------- Search ---------------- */
const index = [
  ...allPages.map((p) => ({ label: p.title, kind: p.status ? `${p.section.title} · ${STATUS[p.status].label}` : p.section.title, href: p.path })),
  ...components.flatMap((c) => [c.tag, ...(c.parts ?? []).map((p) => p.tag)].map((t) => ({ label: t, kind: c.name, href: `/components/${c.slug}` }))),
  ...tokens.filter((t) => t.cssVar).map((t) => ({ label: t.name, kind: 'Token', href: `/foundations/tokens?q=${t.name}` })),
  ...iconNames.map((n) => ({ label: n, kind: 'Icon', href: `/icons?q=${n}` })),
];
const q = $('#q'), results = $('#results'), searchBox = $('.search');
let sel = -1, hits = [];
const drawResults = () => {
  const s = q.value.trim().toLowerCase();
  if (!s) { results.hidden = true; q.setAttribute('aria-expanded', 'false'); return; }
  const rank = (x) => (x.label.toLowerCase().startsWith(s) ? 0 : 1) + (x.kind === 'Token' || x.kind === 'Icon' ? 2 : 0);
  hits = index.filter((x) => x.label.toLowerCase().includes(s)).sort((a, b) => rank(a) - rank(b)).slice(0, 12);
  sel = hits.length ? 0 : -1;
  results.innerHTML = hits.length ? hits.map((h, i) => `<li role="option" id="r${i}" aria-selected="${i === sel}"><a href="#${h.href}">${esc(h.label)}<small>${esc(h.kind)}</small></a></li>`).join('') : `<li class="empty">No results for "${esc(q.value)}"</li>`;
  results.hidden = false; q.setAttribute('aria-expanded', 'true');
  q.setAttribute('aria-activedescendant', sel >= 0 ? `r${sel}` : '');
};
q.addEventListener('input', drawResults);
q.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); if (!hits.length) return;
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + hits.length) % hits.length;
    results.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
    q.setAttribute('aria-activedescendant', `r${sel}`);
  } else if (e.key === 'Enter' && sel >= 0) { go(hits[sel].href); closeSearch(); }
  else if (e.key === 'Escape') closeSearch();
});
results.addEventListener('click', (e) => { if (e.target.closest('a')) closeSearch(); });
const closeSearch = () => { q.value = ''; results.hidden = true; q.setAttribute('aria-expanded', 'false'); searchBox.classList.remove('open'); q.blur(); };
document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !e.composedPath().some((n) => /^(INPUT|TEXTAREA|SELECT)$/.test(n.tagName) || n.isContentEditable)) { e.preventDefault(); searchBox.classList.add('open'); q.focus(); }
});
searchBox.addEventListener('click', () => { if (getComputedStyle(q).display === 'none' || !searchBox.classList.contains('open')) { searchBox.classList.add('open'); q.focus(); } });
document.addEventListener('click', (e) => { if (!searchBox.contains(e.target)) { results.hidden = true; searchBox.classList.remove('open'); } });

route();
