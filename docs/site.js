// Site-level content: status definitions, packages, and patterns (complete merchant workflows).
// Component docs live in content.js; release notes in releases.js.
import { VERSION } from './vendor/version.js';

export const STATUS = {
  ready: { label: 'Ready', tone: 'success', text: 'Documented and usable, in the hosted build and the npm packages.' },
  'in-progress': { label: 'In progress', tone: 'attention', text: 'Next in the build queue. Not usable yet.' },
  planned: { label: 'Planned', tone: 'neutral', text: 'Scheduled, not started. Not usable yet.' },
};

export const SUPPORT_EMAIL = 'support@commmerce.com';

// Hosted build. /v/<version>/ files never change once published; /vendor/ is always the latest release.
const HOST = 'https://commmerce.com/blog/commmerceui';
// 1.0.0 and later are stable; a pre-release suffix (1.0.0-rc.4) means preview. The docs' preview wording follows this,
// so releasing 1.0.0 needs only the version bump and its release note.
export const STABLE = !VERSION.includes('-');
export const PREVIEW = {
  version: VERSION,
  css: `${HOST}/v/${VERSION}/tokens.css`,
  js: `${HOST}/v/${VERSION}/cdn.js`,
  latestCss: `${HOST}/vendor/tokens.css`,
  font: `${HOST}/v/${VERSION}/fonts.css`,
  latestJs: `${HOST}/vendor/cdn.js`,
  bridge: `${HOST}/v/${VERSION}/app-bridge.js`,
};

export const packages = [
  { name: `Hosted build v${VERSION}`, status: 'ready', what: 'One stylesheet (tokens), one ES module that registers every ready component, and `app-bridge.js` for apps embedded in the admin. Loads from any website. Files under `/v/<version>/` never change; `/vendor/` always serves the latest release.' },
  { name: '@commmerce/tokens', status: 'ready', what: 'Colours, type, spacing, radii and shadows as CSS variables (`--cm-*`), JSON and typed JS, plus `fonts.css` for the Poppins typeface. On npm: `npm install @commmerce/tokens`.' },
  { name: '@commmerce/ui', status: 'ready', what: 'The web components as an npm package. On npm: `npm install @commmerce/ui`.' },
  { name: '@commmerce/ui-react', status: 'ready', what: 'React components generated from the web components, with typed props and events. Tested with React 18 and React 19 (every wrapper\'s props and events) in Chromium, Firefox and WebKit. On npm: `npm install @commmerce/ui-react`.' },
  { name: '@commmerce/icons', status: 'ready', what: 'The line icons as SVG files and path data. On npm: `npm install @commmerce/icons` (installed with `@commmerce/ui`).' },
  { name: '@commmerce/app-bridge', status: 'ready', what: 'Lets an app embedded in the admin open toasts and modals, navigate, show the save bar, pick resources and get a session token. Also in the hosted build as `app-bridge.js`. On npm: `npm install @commmerce/app-bridge`.' },
];

/* ---------------- Patterns ---------------- */
// kind: 'example' = a working layout you can copy; 'guidance' = recommended approach, parts not built yet.
// uses: component slugs, so component pages can link back to the patterns that use them.

const ORDERS = [
  ['1042', 'Priya Sharma', '13 Nov, 4:20 pm', 'Rs. 2,340', ['success', 'Paid'], 'unprocessed'],
  ['1041', 'Rahul Mehta', '13 Nov, 1:05 pm', 'Rs. 899', ['information', 'Pending'], 'unprocessed'],
  ['1040', 'Ananya Iyer', '12 Nov, 6:48 pm', 'Rs. 12,499', ['success', 'Paid'], 'processing'],
  ['1039', 'Farhan Ali', '12 Nov, 11:30 am', 'Rs. 1,150', ['critical', 'Failed'], 'unprocessed'],
  ['1038', 'Kavya Reddy', '11 Nov, 9:12 pm', 'Rs. 3,780', ['success', 'Paid'], 'fulfilled'],
  ['1037', 'Arjun Nair', '11 Nov, 3:44 pm', 'Rs. 640', ['success', 'Paid'], 'fulfilled'],
];
const orderRow = ([id, name, date, total, [tone, pay], status]) => `    <cm-resource-item value="${id}" data-status="${status}" href="#/patterns/order-list" label="Order #${id}">
      <div class="order-row" style="display:grid;grid-template-columns:var(--cm-table-columns);gap:12px;align-items:center">
        <strong>#${id}</strong><span>${name}</span><span>${date}</span><span>${total}</span><cm-badge tone="${tone}">${pay}</cm-badge>
      </div>
    </cm-resource-item>`;

export const orderListHtml = `<cm-page-header heading="Orders" breadcrumbs='[{"label":"Dashboard","href":"#/patterns"}]'>
  <cm-button slot="actions" size="large" variant="primary">Create order</cm-button>
</cm-page-header>
<div style="display:grid;gap:20px;padding:20px">
  <cm-status-tabs controls="orders">
    <option value="all" count="6">All</option>
    <option value="unprocessed" count="3" selected>Unprocessed</option>
    <option value="processing" count="1">Processing</option>
    <option value="fulfilled" count="2">Fulfilled</option>
  </cm-status-tabs>
  <cm-search label="Search orders" placeholder="Search by order number or customer"></cm-search>
  <cm-resource-list id="orders" selectable total="3" resource-name="order" style="--cm-table-columns: 0.7fr 1.3fr 1.2fr 0.9fr 0.8fr">
    <cm-button slot="bulk-actions" size="medium">Mark as processing</cm-button>
    <cm-button slot="bulk-actions" size="medium">Print invoices</cm-button>
    <cm-button slot="actions" size="medium">Export</cm-button>
    <cm-empty-state slot="empty" size="small" icon="cart" heading="No orders match">Try another status or search.</cm-empty-state>
${ORDERS.map(orderRow).join('\n')}
  </cm-resource-list>
  <cm-pagination total="3" page-size="20" resource-name="orders"></cm-pagination>
</div>`;

// Live behaviour for the order list (tabs and search filter the rows). Not part of the copied markup.
export function wireOrderList(root) {
  const tabs = root.querySelector('cm-status-tabs'), search = root.querySelector('cm-search');
  const list = root.querySelector('cm-resource-list'), pager = root.querySelector('cm-pagination');
  if (!tabs || !list) return;
  const apply = () => {
    const status = tabs.value || 'all', q = (search?.value || '').trim().toLowerCase();
    let n = 0;
    list.querySelectorAll('cm-resource-item').forEach((row) => {
      const show = (status === 'all' || row.dataset.status === status) && (!q || row.textContent.toLowerCase().includes(q));
      row.hidden = !show; if (show) n++;
    });
    list.setAttribute('total', String(n)); pager?.setAttribute('total', String(n));
  };
  tabs.addEventListener('change', apply);
  search?.addEventListener('input', apply);
  apply();
}

export const productEditorHtml = `<cm-page>
<cm-page-header slot="header" heading="Add product" breadcrumbs='[{"label":"Products","href":"#/patterns"}]'>
  <cm-button slot="actions" size="large">Cancel</cm-button>
</cm-page-header>
<form id="product-form" novalidate>
  <cm-layout>
    <cm-layout-section variant="two-thirds">
      <cm-card heading="Details">
        <cm-stack gap="30">
          <cm-text-field name="title" label="Title" placeholder="Short sleeve t-shirt" required></cm-text-field>
          <cm-text-field name="description" label="Description" multiline rows="4" help-text="Plain text, up to 500 characters"></cm-text-field>
        </cm-stack>
      </cm-card>
      <cm-card heading="Media">
        <cm-file-upload name="images" label="Product images" hint="max. file size 300 KB" accept="image/*" multiple max-size="307200"></cm-file-upload>
      </cm-card>
      <cm-card heading="Pricing">
        <cm-grid columns="2" gap="30">
          <cm-text-field name="price" label="Price" hint="rs." type="number" required></cm-text-field>
          <cm-text-field name="compare" label="Compare-at price" hint="rs." type="number" help-text="Shown struck through when it is higher than the price"></cm-text-field>
        </cm-grid>
      </cm-card>
    </cm-layout-section>
    <cm-layout-section variant="one-third">
      <cm-card heading="Status">
        <cm-stack>
          <cm-select name="status" label="Product status" value="draft">
            <option value="active">Active</option>
            <option value="draft">Draft</option>
          </cm-select>
          <cm-toggle name="online" label="Show on online store" checked></cm-toggle>
        </cm-stack>
      </cm-card>
      <cm-card heading="Inventory">
        <cm-stack>
          <cm-text-field name="sku" label="SKU" placeholder="TS-0042"></cm-text-field>
          <cm-checkbox name="track" value="yes" label="Track quantity" checked></cm-checkbox>
        </cm-stack>
      </cm-card>
    </cm-layout-section>
  </cm-layout>
</form>
<cm-save-bar slot="footer" form="product-form" message="Unsaved product"></cm-save-bar>
</cm-page>`;

// Validation on save: required fields get an error message and the first invalid field gets focus.
export function wireProductEditor(root) {
  const form = root.querySelector('#product-form');
  if (!form) return;
  const status = root.querySelector('[data-pattern-status]');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fields = [...form.querySelectorAll('cm-text-field[required]')];
    let firstInvalid = null;
    for (const f of fields) {
      f.error = f.value.trim() ? '' : `Enter a ${f.label.toLowerCase()}`;
      if (f.error && !firstInvalid) firstInvalid = f;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      if (status) { status.tone = 'critical'; status.heading = 'Product not saved'; status.textContent = 'Fix the highlighted fields and save again.'; status.hidden = false; }
      return;
    }
    root.querySelector('cm-save-bar').open = false;
    if (status) { status.tone = 'success'; status.heading = ''; status.textContent = 'Product saved.'; status.hidden = false; }
  });
  form.addEventListener('input', (e) => { const f = e.target.closest?.('cm-text-field'); if (f?.error && f.value.trim()) f.error = ''; });
}

export const statesHtml = {
  empty: `<cm-card heading="Orders" flush>
  <cm-empty-state size="small" icon="cart" heading="No orders yet">
    Orders appear here when customers check out.
    <cm-button slot="actions" variant="primary">Share your store</cm-button>
  </cm-empty-state>
</cm-card>`,
  loading: `<cm-resource-list loading resource-name="order" label="Orders">
  <cm-resource-item value="o1">#1042 · Priya Sharma</cm-resource-item>
  <cm-resource-item value="o2">#1041 · Rahul Mehta</cm-resource-item>
  <cm-resource-item value="o3">#1040 · Ananya Iyer</cm-resource-item>
</cm-resource-list>`,
  error: `<cm-banner tone="critical" heading="Orders couldn't load">
  Check your connection and try again. Your orders are safe.
  <cm-button slot="actions" size="slim" variant="primary">Try again</cm-button>
</cm-banner>`,
  success: `<cm-banner tone="success" dismissible>3 orders marked as processing.</cm-banner>`,
};

export const fulfilmentHtml = `<cm-card heading="Order statuses" flush>
  <div style="display:grid;grid-template-columns:auto 1fr;gap:14px 20px;padding:20px;align-items:center">
    <cm-badge tone="information">Order placed</cm-badge><span>Paid, not yet picked or packed.</span>
    <cm-badge tone="attention">Processing</cm-badge><span>Being picked, packed or handed to a courier.</span>
    <cm-badge tone="success">Delivered</cm-badge><span>Confirmed delivered by the courier.</span>
    <cm-badge tone="critical">Cancelled</cm-badge><span>Cancelled and refunded; no further action.</span>
    <cm-badge>Draft</cm-badge><span>Created by staff, not yet sent to the customer.</span>
  </div>
</cm-card>
<cm-card heading="Stock">
  <div style="display:grid;grid-template-columns:auto 1fr;gap:14px 20px;align-items:center">
    <cm-badge tone="success">In stock</cm-badge><span>Above the low-stock level you set.</span>
    <cm-badge tone="information">Low stock</cm-badge><span>At or below the low-stock level.</span>
    <cm-badge tone="critical">Out of stock</cm-badge><span>Zero available; hidden or marked sold out on the store.</span>
  </div>
</cm-card>`;

const QUICK = [['Add Category', '#/components/side-navigation'], ['Add Product', '#/patterns/product-editor'], ['Add Domain', '#/patterns/admin-dashboard'], ['Add Payment Gateway', '#/components/app-card'], ['Add Store Address & GST (Optional)', '#/patterns/admin-dashboard']];
const DARK_BTN = 'display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:0 15px;border-radius:var(--cm-radius-sm);font:inherit;font-size:14px;font-weight:500;text-decoration:none';
const SHARE_BTN = 'display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:44px;min-height:44px;padding:0 14px;border:1px solid var(--cm-text-on-dark);border-radius:var(--cm-radius-full);color:var(--cm-text-on-dark);background:none;font:inherit;font-size:13px;cursor:pointer';

export const dashboardHtml = `<cm-header-bar store="preprod.commmerce.com" balance="₹ 2,312" user-name="Demo user">
  <img slot="logo" src="vendor/brand/wordmark-black.svg" alt="Commmerce" width="190" height="14">
  <cm-button slot="actions" size="large">Hire an Expert</cm-button>
  <cm-button slot="actions" variant="primary" size="large">My Subscription</cm-button>
</cm-header-bar>
<div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start;padding:20px">
  <cm-side-navigation style="flex:0 0 250px">
    <cm-nav-item label="Dashboard" icon="home" href="#/patterns/admin-dashboard" current></cm-nav-item>
    <cm-nav-item label="Catalog" icon="box"><cm-nav-item label="Products" href="#/patterns/order-list"></cm-nav-item><cm-nav-item label="Categories" href="#/patterns/order-list"></cm-nav-item></cm-nav-item>
    <cm-nav-item label="Orders" icon="bag"><cm-nav-item label="All orders" href="#/patterns/order-list"></cm-nav-item></cm-nav-item>
    <cm-nav-item label="WebPOS" icon="pos" href="#/patterns/admin-dashboard"></cm-nav-item>
    <cm-nav-item label="Customers" icon="users"><cm-nav-item label="All customers" href="#/patterns/order-list"></cm-nav-item></cm-nav-item>
    <cm-nav-item label="Subscriptions" icon="repeat" href="#/patterns/admin-dashboard"></cm-nav-item>
    <cm-nav-item label="Website" icon="website"><cm-nav-item label="Themes" href="#/patterns/admin-dashboard"></cm-nav-item></cm-nav-item>
    <cm-nav-item label="Apps" icon="apps" href="#/components/app-card"></cm-nav-item>
    <cm-nav-item label="Reports" icon="chart" href="#/components/report-tile"></cm-nav-item>
    <cm-nav-item label="Marketing" icon="megaphone"><cm-nav-item label="Discounts" href="#/patterns/admin-dashboard"></cm-nav-item></cm-nav-item>
    <cm-nav-item label="Staff Management" icon="staff"><cm-nav-item label="Staff" href="#/patterns/admin-dashboard"></cm-nav-item></cm-nav-item>
    <cm-nav-item label="Settings" icon="settings"><cm-nav-item label="Store details" href="#/patterns/admin-dashboard"></cm-nav-item></cm-nav-item>
  </cm-side-navigation>
  <main style="flex:1 1 420px;min-width:0;display:grid;gap:40px;justify-items:center;padding:40px 20px;background:var(--cm-bg-surface);border-radius:16px">
    <h1 style="margin:0;font-size:32px;font-weight:500;text-align:center">Welcome to your Dashboard</h1>
    <section aria-labelledby="share-store" style="width:100%;max-width:860px;display:grid;gap:24px;justify-items:center;padding:36px 24px;background:var(--cm-bg-dashboard);color:var(--cm-text-on-dark);border-radius:var(--cm-radius-sm);text-align:center">
      <h2 id="share-store" style="margin:0;font-size:24px;font-weight:400">Create and Share Your Online Store</h2>
      <div style="width:100%;max-width:690px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:10px 10px 10px 20px;background:var(--cm-bg-panel-header);border-radius:var(--cm-radius-sm)">
        <span style="flex:1 1 200px;text-align:start;overflow-wrap:anywhere">https://preprod.commmerce.com</span>
        <a href="#/patterns/admin-dashboard" style="${DARK_BTN};color:var(--cm-text-on-dark);border:1px solid var(--cm-text-on-dark)">Edit Website <cm-icon name="external" size="16"></cm-icon></a>
        <a href="#/patterns/admin-dashboard" style="${DARK_BTN};color:var(--cm-text-default);background:var(--cm-bg-surface)">Go To Website</a>
      </div>
      <p style="margin:0">Want to Hire an Expert to design your website? <a href="#/patterns/admin-dashboard" style="color:var(--cm-text-on-dark);font-weight:500">Click Here</a></p>
      <div role="group" aria-labelledby="share-label" style="display:grid;gap:16px;justify-items:center">
        <span id="share-label" style="font-size:14px;letter-spacing:var(--cm-tracking-caps);text-transform:uppercase">Share</span>
        <div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center">
          <button type="button" style="${SHARE_BTN}">Facebook</button>
          <button type="button" style="${SHARE_BTN}">X</button>
          <button type="button" style="${SHARE_BTN}">LinkedIn</button>
          <button type="button" style="${SHARE_BTN}" aria-label="Copy store link"><cm-icon name="link" size="18"></cm-icon></button>
        </div>
      </div>
    </section>
    <ul aria-label="Set up your store" style="width:100%;max-width:860px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:20px;margin:0;padding:0;list-style:none">
${QUICK.map(([l, h]) => `      <li><a href="${h}" style="display:grid;gap:16px;justify-items:center;align-content:center;min-height:150px;height:100%;padding:16px;border:1px solid var(--cm-border-input);border-radius:var(--cm-radius-xs);color:var(--cm-text-default);text-decoration:none;text-align:center;font-weight:500"><span aria-hidden="true" style="display:grid;place-items:center;width:52px;height:52px;border:1px dashed var(--cm-border-input);border-radius:50%;color:var(--cm-icon-default)"><cm-icon name="plus" size="18"></cm-icon></span>${l}</a></li>`).join('\n')}
    </ul>
  </main>
</div>`;

/* Search, filtering, sorting and bulk actions: a product list with status tabs, search, the Filter panel,
   applied-filter tags, sortable columns and a confirmed bulk delete. */
const PRODUCTS = [
  ['p1', 'Blue linen kurta', 'Clothing', 'active', 1499, 24],
  ['p2', 'Hand-block printed scarf', 'Accessories', 'active', 650, 3],
  ['p3', 'Brass diya, set of 4', 'Home', 'draft', 899, 0],
  ['p4', 'Cotton bedsheet, king', 'Home', 'active', 2199, 12],
  ['p5', 'Leather sling bag', 'Accessories', 'archived', 3450, 0],
  ['p6', 'Khadi shirt', 'Clothing', 'draft', 1199, 8],
  ['p7', 'Terracotta planter', 'Home', 'active', 540, 2],
];
const stockOf = (n) => (n === 0 ? 'out' : n <= 5 ? 'low' : 'in');
const STOCK = { in: ['success', 'In stock'], low: ['information', 'Low stock'], out: ['critical', 'Out of stock'] };
const productRow = ([id, name, type, status, price, qty]) => { const [tone, word] = STOCK[stockOf(qty)]; return `    <cm-resource-item value="${id}" label="${name}" data-status="${status}" data-type="${type}" data-stock="${stockOf(qty)}" data-price="${price}" data-qty="${qty}">
      <div style="display:grid;grid-template-columns:var(--cm-table-columns);gap:12px;align-items:center">
        <strong>${name}</strong><span>${type}</span><span>Rs. ${price.toLocaleString('en-IN')}</span><span>${qty}</span><cm-badge tone="${tone}">${word}</cm-badge>
      </div>
    </cm-resource-item>`; };

export const searchFilterHtml = `<cm-page-header heading="Products">
  <cm-button slot="actions" size="large" variant="primary">Add product</cm-button>
</cm-page-header>
<div style="display:grid;gap:20px;padding:20px">
  <cm-status-tabs controls="products">
    <option value="all" selected>All</option>
    <option value="active">Active</option>
    <option value="draft">Draft</option>
    <option value="archived">Archived</option>
  </cm-status-tabs>
  <cm-search label="Search products" placeholder="Search by product name" filter></cm-search>
  <div id="applied-filters" role="group" aria-label="Applied filters" hidden style="display:flex;flex-wrap:wrap;gap:var(--cm-space-10)"></div>
  <cm-resource-list id="products" selectable total="${PRODUCTS.length}" resource-name="product" style="--cm-table-columns: 2fr 1fr 1fr 0.6fr 1fr">
    <cm-table-header slot="header" sort="name" direction="ascending">
      <option value="name" sortable>Product</option>
      <option value="type">Type</option>
      <option value="price" sortable>Price</option>
      <option value="qty" sortable>Stock</option>
      <option value="stock">Availability</option>
    </cm-table-header>
    <cm-button slot="bulk-actions" size="medium">Set as active</cm-button>
    <cm-button slot="bulk-actions" size="medium">Delete products</cm-button>
    <cm-empty-state slot="empty" size="small" icon="search" heading="No products match">Try another status, search or filter.</cm-empty-state>
${PRODUCTS.map(productRow).join('\n')}
  </cm-resource-list>
</div>
<cm-filter-panel id="product-filters">
  <form>
    <cm-select label="Product type" name="type"><option value="">Any</option><option>Clothing</option><option>Accessories</option><option>Home</option></cm-select>
    <fieldset style="display:grid;gap:var(--cm-space-10);margin:0;padding:0;border:0">
      <legend style="padding:0;margin-bottom:var(--cm-space-10);font-weight:500">Availability</legend>
      <cm-checkbox name="stock" value="in" label="In stock"></cm-checkbox>
      <cm-checkbox name="stock" value="low" label="Low stock"></cm-checkbox>
      <cm-checkbox name="stock" value="out" label="Out of stock"></cm-checkbox>
    </fieldset>
  </form>
</cm-filter-panel>
<cm-modal id="confirm-bulk-delete" heading="Delete products?" size="small">
  <p style="margin:0" data-message>The selected products will be deleted. This can't be undone.</p>
  <cm-button slot="footer" data-cancel>Cancel</cm-button>
  <cm-button slot="footer" variant="primary" data-confirm>Delete products</cm-button>
</cm-modal>`;

const FILTER_WORDS = { type: 'Type', stock: 'Availability', in: 'In stock', low: 'Low stock', out: 'Out of stock' };
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// Live behaviour: in a real app, send status, query, filters and sort to your API instead of filtering rows here.
export function wireSearchFilter(root) {
  const list = root.querySelector('#products');
  if (!list) return;
  const tabs = root.querySelector('cm-status-tabs'), search = root.querySelector('cm-search');
  const head = root.querySelector('cm-table-header'), panel = root.querySelector('#product-filters');
  const applied = root.querySelector('#applied-filters'), modal = root.querySelector('#confirm-bulk-delete');
  const status = root.querySelector('[data-pattern-status]');
  let filters = {};
  const say = (text, tone = 'success') => { if (status) { status.tone = tone; status.textContent = text; status.hidden = false; } };
  const rows = () => [...list.querySelectorAll('cm-resource-item')];
  const apply = () => {
    const st = tabs.value || 'all', q = (search.value || '').trim().toLowerCase();
    const stock = [].concat(filters.stock ?? []);
    let n = 0;
    rows().forEach((r) => {
      const show = (st === 'all' || r.dataset.status === st) && (!q || r.label.toLowerCase().includes(q))
        && (!filters.type || r.dataset.type === filters.type) && (!stock.length || stock.includes(r.dataset.stock));
      r.hidden = !show; if (show) n++; else r.selected = false;
    });
    list.total = n;
    const tags = Object.entries(filters).flatMap(([k, v]) => [].concat(v).map((x) => [k, x]));
    search.filterCount = tags.length;
    applied.hidden = !tags.length;
    applied.replaceChildren(...tags.map(([k, v]) => {
      const t = document.createElement('cm-tag');
      t.removable = true; t.textContent = FILTER_WORDS[v] ?? v; t.removeLabel = `Remove filter: ${FILTER_WORDS[k]} is ${t.textContent}`;
      t.addEventListener('cm-remove', () => {
        const left = [].concat(filters[k]).filter((x) => x !== v);
        if (left.length) filters[k] = left; else delete filters[k];
        apply(); search.focus?.();
      });
      return t;
    }));
  };
  tabs.addEventListener('change', apply);
  search.addEventListener('input', apply);
  search.addEventListener('cm-filter', () => panel.show());
  panel.addEventListener('cm-filter-apply', (e) => { filters = { ...e.detail.values }; apply(); });
  panel.addEventListener('cm-filter-reset', () => { filters = {}; apply(); });
  head.addEventListener('cm-sort', (e) => {
    const { key, direction } = e.detail, dir = direction === 'descending' ? -1 : 1;
    const val = (r) => (key === 'name' ? r.label.toLowerCase() : Number(r.dataset[key]));
    rows().sort((a, b) => (val(a) > val(b) ? dir : val(a) < val(b) ? -dir : 0)).forEach((r) => list.append(r));
    head.sort = key; head.direction = direction;
  });
  const [, del] = list.querySelectorAll('[slot="bulk-actions"]');
  let doomed = [];
  del.addEventListener('click', () => {
    doomed = rows().filter((r) => r.selected && !r.hidden);
    if (!doomed.length) return;
    modal.heading = `Delete ${plural(doomed.length, 'product', 'products')}?`;
    modal.querySelector('[data-message]').textContent = `${doomed.length === 1 ? `“${doomed[0].label}” will be deleted` : `${plural(doomed.length, 'product', 'products')} will be deleted`}, with their images and variants. This can't be undone.`;
    modal.querySelector('[data-confirm]').textContent = doomed.length === 1 ? 'Delete product' : `Delete ${doomed.length} products`;
    modal.show();
  });
  modal.querySelector('[data-cancel]').addEventListener('click', () => modal.close());
  modal.querySelector('[data-confirm]').addEventListener('click', () => {
    const n = doomed.length;
    doomed.forEach((r) => r.remove()); doomed = [];
    modal.close(); list.clearSelection?.(); apply();
    say(`${plural(n, 'product', 'products')} deleted.`);
  });
  apply();
}

/* Confirm before deleting: one destructive action, one modal that names what goes. */
export const confirmDeleteHtml = `<cm-page-header heading="Linen shirt" breadcrumbs='[{"label":"Products","href":"#/patterns/confirm-delete"}]'>
  <cm-button slot="actions" size="large" data-delete>Delete product</cm-button>
</cm-page-header>
<div style="display:grid;gap:20px;padding:20px">
  <cm-card heading="Details">
    <cm-info-panel>
      <cm-info-item label="Price">Rs. 1,299</cm-info-item>
      <cm-info-item label="Variants">4 (S, M, L, XL)</cm-info-item>
      <cm-info-item label="Status">Active</cm-info-item>
    </cm-info-panel>
  </cm-card>
</div>
<cm-modal id="confirm-delete" heading="Delete “Linen shirt”?" size="small">
  <p style="margin:0">The product, its 4 variants and its images will be deleted. Orders that include it keep their details. This can't be undone.</p>
  <cm-button slot="footer" data-cancel>Cancel</cm-button>
  <cm-button slot="footer" variant="primary" data-confirm>Delete product</cm-button>
</cm-modal>`;

export function wireConfirmDelete(root) {
  const modal = root.querySelector('#confirm-delete');
  if (!modal) return;
  const confirm = modal.querySelector('[data-confirm]'), status = root.querySelector('[data-pattern-status]');
  root.querySelector('[data-delete]').addEventListener('click', () => modal.show());
  modal.querySelector('[data-cancel]').addEventListener('click', () => modal.close());
  confirm.addEventListener('click', () => {
    // While the request runs: keep the modal open, show the button as busy, and don't let it close half-way.
    confirm.loading = true;
    const hold = (e) => e.preventDefault();
    modal.addEventListener('cm-close', hold);
    setTimeout(() => {
      confirm.loading = false; modal.removeEventListener('cm-close', hold); modal.close();
      if (status) { status.tone = 'success'; status.textContent = '“Linen shirt” deleted. (Nothing was really deleted in this example.)'; status.hidden = false; }
    }, 800);
  });
}

/* Unsaved changes when leaving: the save bar tracks changes; leaving through a link asks first. */
export const unsavedChangesHtml = `<cm-page-header heading="Edit customer" breadcrumbs='[{"label":"Customers","href":"#/patterns/unsaved-changes"}]'></cm-page-header>
<form id="customer-form" style="display:grid;gap:20px;padding:20px">
  <cm-card heading="Contact">
    <div style="display:grid;gap:30px">
      <cm-text-field name="name" label="Name" value="Priya Sharma"></cm-text-field>
      <cm-text-field name="phone" label="Phone" type="tel" value="+91 98200 12345"></cm-text-field>
      <cm-checkbox name="marketing" value="yes" label="Customer agreed to receive marketing"></cm-checkbox>
    </div>
  </cm-card>
</form>
<cm-save-bar form="customer-form" message="Unsaved changes"></cm-save-bar>
<cm-modal id="confirm-leave" heading="Leave page with unsaved changes?" size="small">
  <p style="margin:0">If you leave, the changes you made to this customer will be lost.</p>
  <cm-button slot="footer" data-stay>Keep editing</cm-button>
  <cm-button slot="footer" variant="primary" data-leave>Leave page</cm-button>
</cm-modal>`;

export function wireUnsavedChanges(root) {
  const form = root.querySelector('#customer-form');
  if (!form) return;
  const bar = root.querySelector('cm-save-bar'), modal = root.querySelector('#confirm-leave');
  const status = root.querySelector('[data-pattern-status]');
  const say = (t) => { if (status) { status.tone = 'success'; status.textContent = t; status.hidden = false; } };
  const dirty = () => bar.open;
  // Closing the tab or reloading: the browser asks with its own prompt (the text can't be changed).
  const onUnload = (e) => { if (form.isConnected && dirty()) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', onUnload);
  window.addEventListener('hashchange', function off() { if (!form.isConnected) { window.removeEventListener('beforeunload', onUnload); window.removeEventListener('hashchange', off); } });
  // Leaving inside the app (breadcrumbs, links, your router): ask with a modal.
  let leave = null;
  root.querySelector('cm-page-header').addEventListener('click', (e) => {
    const a = e.composedPath().find((n) => n.localName === 'a' && n.href);
    if (!a || !dirty()) return;
    e.preventDefault();
    leave = () => say('You left the page; the changes were discarded. (This example stays on the page.)');
    modal.show();
  });
  modal.querySelector('[data-stay]').addEventListener('click', () => modal.close());
  modal.querySelector('[data-leave]').addEventListener('click', () => { modal.close(); form.reset(); leave?.(); leave = null; });
  form.addEventListener('submit', (e) => { e.preventDefault(); bar.open = false; say('Customer saved.'); });
}

/* Embedded app layout: a small "Product reviews" app as it runs in the admin's frame. Three screens (list, detail,
   settings), each starting with a page header; App Bridge keeps the admin's address, save bar, toasts and modals in step. */
export const appLayoutApp = ({ bridge, font, css, ui, hostOrigin }) => `<!doctype html>
<html lang="en" data-cm-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="${font}">
<link rel="stylesheet" href="${css}">
<script type="module" src="${ui}"></script>
<style>
  body { margin: 0; background: var(--cm-bg-page); color: var(--cm-text-default); font-family: var(--cm-font-sans); }
  main { display: grid; gap: 20px; padding: 20px; }
  .cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 20px; align-items: start; }
  p { margin: 0; }
</style>
</head>
<body>
<div id="view"></div>
<script type="module">
import { createApp } from '${bridge}';
const app = createApp({ hostOrigin: '${hostOrigin}', apiKey: 'product-reviews' });
const REVIEWS = [
  { id: '1', who: 'Priya Sharma', product: 'Blue linen kurta', stars: 5, text: 'Soft fabric and the fit is perfect.' },
  { id: '2', who: 'Rahul Mehta', product: 'Brass diya, set of 4', stars: 3, text: 'Nice, but one diya arrived dented.' },
  { id: '3', who: 'Kavya Reddy', product: 'Khadi shirt', stars: 4, text: 'Good shirt. Runs a little large.' },
];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => '&#' + c.charCodeAt(0) + ';');
const crumbs = JSON.stringify([{ label: 'Product reviews', href: '#/' }]).replace(/'/g, '&#39;');

// One render function per screen. Every screen starts with a page header, then cards.
const screens = {
  list: () => \`<cm-page-header heading="Product reviews">
    <cm-button slot="actions" size="large" href="#/settings">Settings</cm-button>
  </cm-page-header>
  <main>
    <cm-resource-list label="Reviews" resource-name="review" total="\${REVIEWS.length}">
      \${REVIEWS.map((r) => \`<cm-resource-item href="#/reviews/\${r.id}" label="Review from \${esc(r.who)}">
        <strong>\${esc(r.who)}</strong> · \${esc(r.product)} · \${r.stars} of 5
      </cm-resource-item>\`).join('')}
    </cm-resource-list>
  </main>\`,
  review: (r) => \`<cm-page-header heading="Review from \${esc(r.who)}" breadcrumbs='\${crumbs}'>
    <cm-button slot="actions" size="large" id="delete">Delete review</cm-button>
  </cm-page-header>
  <main class="cols">
    <cm-card heading="Review"><p>\${esc(r.text)}</p></cm-card>
    <cm-card heading="Your reply">
      <form id="reply-form"><cm-text-field name="reply" label="Reply" multiline rows="3" help-text="Shown under the review on your store"></cm-text-field></form>
    </cm-card>
  </main>\`,
  settings: () => \`<cm-page-header heading="Settings" breadcrumbs='\${crumbs}'></cm-page-header>
  <main>
    <cm-card heading="Publishing">
      <form id="settings-form"><cm-toggle name="auto" label="Publish new reviews without checking them first"></cm-toggle></form>
    </cm-card>
  </main>\`,
};

// Routing inside the app: the frame's own hash. Each screen change tells the admin its address,
// so reloading the admin page or sharing its link opens the same screen.
let dirty = false;
function render() {
  const path = location.hash.slice(1) || '/';
  const review = REVIEWS.find((r) => path === '/reviews/' + r.id);
  document.getElementById('view').innerHTML = review ? screens.review(review) : path === '/settings' ? screens.settings() : screens.list();
  document.title = review ? 'Review from ' + review.who : path === '/settings' ? 'Settings' : 'Product reviews';
  app.navigate(path, { replace: true }).catch(() => {});
  const form = document.querySelector('form');
  form?.addEventListener('input', () => { dirty = true; app.saveBar.show({ message: 'Unsaved changes' }).catch(() => {}); });
  form?.addEventListener('change', () => { dirty = true; app.saveBar.show({ message: 'Unsaved changes' }).catch(() => {}); });
  document.getElementById('delete')?.addEventListener('click', async () => {
    const choice = await app.modal.open({ title: 'Delete review?', message: 'The review from ' + review.who + ' will be removed from your store. This can\\'t be undone.', primaryAction: { label: 'Delete review', destructive: true }, secondaryAction: { label: 'Cancel' } });
    if (choice !== 'primary') return;
    REVIEWS.splice(REVIEWS.indexOf(review), 1);
    await app.toast.show('Review deleted', { tone: 'success' });
    location.hash = '#/';
  });
}
app.on('saveBar.save', async () => { dirty = false; await app.saveBar.hide(); await app.toast.show('Saved', { tone: 'success' }); });
app.on('saveBar.discard', async () => { dirty = false; document.querySelector('form')?.reset(); await app.saveBar.hide(); });
app.on('theme.change', ({ theme }) => { document.documentElement.dataset.cmTheme = theme; });
// Back or Forward in the admin: show that screen (render() tells the admin again with replace, which is harmless).
app.on('path.change', ({ path }) => { location.hash = '#' + path; });
window.addEventListener('hashchange', () => {
  if (dirty) { dirty = false; app.saveBar.hide().catch(() => {}); }
  render();
});
app.ready.then((info) => {
  document.documentElement.dataset.cmTheme = info.theme;
  // A reload or a shared admin link: open the screen the admin's address points to.
  if (info.path && info.path !== (location.hash.slice(1) || '/')) location.hash = '#' + info.path;
}, () => {});
render();
<\/script>
</body>
</html>`;

export const patterns = [
  {
    slug: 'admin-dashboard', name: 'Admin dashboard and onboarding', kind: 'example',
    task: 'Land in the admin, see where everything is, and finish setting up the store.',
    uses: ['header-bar', 'side-navigation', 'bottom-navigation', 'mobile-menu', 'button'],
    html: dashboardHtml,
    layout: [
      'Header bar across the top: logo, store switcher, Hire an Expert and My Subscription, wallet balance and the user.',
      'Side navigation on the left, inset 20px on `bg-page`; the page content sits in one large white panel with 16px corners.',
      'A welcome heading, then one black card for the most important setup step: the store address, Edit Website and Go To Website, and ways to share the store.',
      'Quick-action tiles under it for the remaining setup steps (category, product, domain, payment gateway, store address and GST). Each tile is one link.',
    ],
    notes: [
      'For Commmerce products only: apps never draw the header bar or side navigation.',
      'On phones, replace the side navigation with a Bottom navigation whose "More" opens the Mobile menu; the header bar already drops to logo, store and avatar.',
      'The share buttons are text, not brand logos: Facebook, X and LinkedIn marks are not part of the Commmerce icon set. Copy link uses the `link` icon.',
      'Hide a tile once its step is done, and the whole row once setup is complete.',
    ],
  },
  {
    slug: 'order-list', name: 'Order and product lists', kind: 'example',
    task: 'Find the orders that need attention, check their state at a glance, and act on several at once.',
    uses: ['page-header', 'status-tabs', 'search', 'resource-list', 'table-header', 'badge', 'pagination', 'empty-state', 'button'],
    html: orderListHtml, wire: wireOrderList,
    layout: [
      'Page header with the list name and one primary action (Create order). Actions on the list itself, such as Export, go in the list toolbar.',
      'Status tabs directly under the header, with counts, so the default view is the work to do ("Unprocessed"), not everything.',
      'Search above the list. Results update as the merchant types; Enter commits the query.',
      'A selectable resource list. Bulk actions appear only once rows are selected; "Select all" offers every matching order, not just the page.',
      'One badge per row for the state the merchant acts on (payment here). Don\'t stack several badges in one row.',
      'Pagination under the list, with rows per page.',
    ],
    notes: ['On phones, give each row two columns (the example does this under 600px wide) instead of squeezing every field into one line.', 'Products use the same layout: swap the columns for image, title, stock and price, and the tabs for Active, Draft and Archived.', 'Tabs and search in this example filter rows in the browser. In a real app, send the status and query to your API and set `total` from its response.'],
  },
  {
    slug: 'product-editor', name: 'Product creation and editing', kind: 'example',
    task: 'Create or change a product without losing work, and fix any mistakes before it goes live.',
    uses: ['page', 'layout', 'page-header', 'card', 'stack', 'grid', 'text-field', 'file-upload', 'select', 'toggle', 'checkbox', 'save-bar', 'banner'],
    html: productEditorHtml, wire: wireProductEditor, banner: true,
    layout: [
      '`cm-page` and `cm-layout`: a two-thirds main column for what customers see (details, media, pricing) and a one-third side column for settings (status, inventory). The columns stack below 768px.',
      'Save bar appears as soon as anything changes and stays until the merchant saves or discards. Discard resets the form.',
      'Validate when the merchant saves, not while they type. Each invalid field says what to enter, and focus moves to the first one.',
      'Clear an error as soon as the field is fixed.',
      'After saving, confirm with a short success banner; after a failed save, keep everything the merchant typed.',
    ],
    notes: ['Try it: change any field to see the save bar, then press Save with the title empty.', 'Warn before leaving a page with unsaved changes with the browser\'s `beforeunload` prompt. Inside the admin, ask with a Modal: see [[Unsaved changes when leaving|/patterns/unsaved-changes]].'],
  },
  {
    slug: 'states', name: 'Empty, loading, error and success states', kind: 'example',
    task: 'Always know what is happening: nothing here yet, still loading, something went wrong, or it worked.',
    uses: ['empty-state', 'resource-list', 'skeleton', 'skeleton-display', 'banner', 'button'],
    states: true,
    layout: [
      'Empty: say what will appear and give the one action that fills it. Different from "no results", which should suggest changing the search or filters.',
      'Loading: keep the layout in place with skeletons or the list\'s `loading` state; don\'t show a spinner over a blank page.',
      'Error: say what failed, that nothing was lost, and offer to try again. Use a critical banner at the top of the affected area.',
      'Success: confirm briefly and specifically ("3 orders marked as processing"). Let the merchant dismiss it.',
    ],
    notes: [],
  },
  {
    slug: 'inventory-fulfilment', name: 'Inventory and fulfilment states', kind: 'guidance',
    task: 'Tell, in one glance, where an order is in fulfilment and whether a product can be sold.',
    uses: ['badge', 'status-tabs', 'info-panel', 'action-bar'],
    html: fulfilmentHtml,
    layout: [
      'Use one badge per state and the same word everywhere: list rows, the detail page and notifications.',
      'Pick the tone by meaning: success when nothing is left to do, critical when something failed or stopped, information when the merchant should look, attention for new items.',
      'On the order page, show the next step as the primary action in the action bar ("Mark as processing").',
    ],
    notes: ['These words and tones are the proposed standard for every Commmerce platform. Platforms use different words today; they will move to these as they adopt Commmerce UI. Map your backend\'s states onto them rather than inventing new ones.'],
  },
  {
    slug: 'search-filter-sort', name: 'Search, filtering, sorting and bulk actions', kind: 'example',
    task: 'Narrow a long list down to the records to act on, then act on them together.',
    uses: ['page-header', 'status-tabs', 'search', 'filter-panel', 'tag', 'table-header', 'resource-list', 'select', 'checkbox', 'badge', 'modal', 'empty-state'],
    html: searchFilterHtml, wire: wireSearchFilter, banner: true,
    layout: [
      'Order of controls: status tabs, then search, then the applied filters, then the list. Sorting lives in the table header.',
      'Search matches the fields merchants know (product name, order number, customer name, phone), not internal IDs. Results update as the merchant types.',
      'The search\'s filter button opens the Filter panel. Filters apply when the merchant presses Search, not field by field.',
      'Show each applied filter as a removable tag under the search, and the number of filters on the filter button (`filter-count`). Removing a tag updates the list at once.',
      'Sort by clicking a sortable column; clicking it again reverses the order. Only make a column sortable if your API can sort by it.',
      'Bulk actions act on the selected rows. A destructive bulk action asks first and says how many records it affects ("Delete 3 products?").',
      'When nothing matches, say so and suggest changing the status, search or filters (the list\'s `empty` slot).',
    ],
    notes: ['Try it: search "shirt", open the filters and tick "Low stock", sort by Price, then select rows and delete them.', 'Tabs, search, filters and sorting run in the browser in this example. In a real app, send them to your API, set the list\'s `total` from the response, and keep them in the page address so the view survives a reload.'],
  },
  {
    slug: 'confirm-delete', name: 'Confirm before deleting', kind: 'example',
    task: 'Delete something on purpose, never by accident, and know exactly what will go.',
    uses: ['modal', 'button', 'page-header', 'banner', 'resource-list'],
    html: confirmDeleteHtml, wire: wireConfirmDelete, banner: true,
    layout: [
      'Ask only when the action can\'t be undone. If it can be undone (archive, hide), do it at once and offer Undo instead.',
      'A small Modal whose title names the thing: "Delete “Linen shirt”?". For several records, give the count: "Delete 3 products?".',
      'Say what goes with it (variants, images) and what stays (past orders keep their details), then "This can\'t be undone."',
      'Cancel first, the main action last, named with the same verb as the button that opened it ("Delete product", never "OK" or "Yes").',
      'While the request runs, keep the modal open and the button busy (`loading`); cancel `cm-close` so Esc can\'t close it half-way. On success, close it and confirm in a banner; on failure, keep it open and say what went wrong.',
    ],
    notes: ['Try it: press Delete product, then Delete product in the modal.', 'Focus starts on the modal itself, so its title is read, and returns to the Delete button when it closes. Don\'t put `autofocus` on the destructive button: Enter should never delete by accident.'],
  },
  {
    slug: 'unsaved-changes', name: 'Unsaved changes when leaving', kind: 'example',
    task: 'Leave a form without losing work by accident, or throw changes away on purpose.',
    uses: ['save-bar', 'modal', 'page-header', 'card', 'text-field', 'checkbox'],
    html: unsavedChangesHtml, wire: wireUnsavedChanges, banner: true,
    layout: [
      'The save bar shows as soon as anything changes; Save and Discard live there, so there is no Cancel button on the page.',
      'Leaving inside the admin (a breadcrumb, a link, the navigation) while the save bar is open asks with a small Modal: "Leave page with unsaved changes?", with Keep editing and Leave page.',
      'Closing the tab or reloading asks with the browser\'s own `beforeunload` prompt; its text can\'t be changed.',
      'Don\'t ask when nothing changed, after a successful save, or after Discard.',
    ],
    notes: ['Try it: change the name, then press the "Customers" breadcrumb.', 'Embedded apps: when your app shows the admin save bar through App Bridge, the admin asks before leaving your app; inside your app\'s own pages, use this pattern.'],
  },
  {
    slug: 'app-layout', name: 'Embedded app layout and navigation', kind: 'example',
    task: 'Open your app inside the Commmerce admin and find your way around it like any other admin page.',
    uses: ['page-header', 'card', 'resource-list', 'text-field', 'toggle', 'save-bar', 'modal', 'empty-state'],
    app: appLayoutApp,
    layout: [
      'The admin draws its own header and navigation. Your app fills the page area: start each screen with a page header, then cards on `bg-page`.',
      'Keep your own navigation shallow: a first page that lists things, a page per thing, and settings. Link back with breadcrumbs; don\'t draw a side navigation or tabs that copy the admin\'s.',
      'Route inside your frame (here: its `#` address) and call `app.navigate(path)` on every screen change, so the admin\'s address, reloads and shared links open the same screen.',
      'Use the admin\'s save bar (`app.saveBar.show()`) for unsaved changes and the admin\'s modal (`app.modal.open()`) for confirmations: they cover the whole admin, not just your frame.',
      'Confirm finished actions with `app.toast.show()`. Follow the admin\'s theme from `app.ready` and `theme.change`.',
      'Design for the admin\'s content width at desktop and for 414px phones; every ready component already adapts.',
    ],
    notes: ['Try it: open a review, type a reply (the save bar above the frame appears), save, then delete the review. Watch the admin address above the frame.', 'This page plays the admin with App Bridge\'s reference host; your app\'s code is exactly what runs in the frame. Before relying on App Bridge in a store, confirm with support that your store\'s admin is connected (see [[App Bridge|/apps/app-bridge]]).'],
  },
];
