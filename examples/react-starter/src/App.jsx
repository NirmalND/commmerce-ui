import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Badge, Button, EmptyState, Page, PageHeader, Pagination, ResourceItem, ResourceList, Search, Stack, StatusTabs,
} from '@commmerce/ui-react';
import { ORDERS, PRODUCTS, STATUS_TABS } from './data.js';
import { ProductPanel } from './ProductPanel.jsx';
import { notify } from './notify.js';

export function App() {
  const [orders, setOrders] = useState(ORDERS);
  const [products, setProducts] = useState(PRODUCTS);
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selection, setSelection] = useState({ selected: [], all: false });
  const [editing, setEditing] = useState(null); // the product open in the side panel
  const listRef = useRef(null);

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [p.id, p])), [products]);

  // Tabs and search filter in the browser here. In a real app, send status and query to your API.
  const q = query.trim().toLowerCase();
  const matching = orders.filter((o) => (status === 'all' || o.status === status)
    && (!q || o.id.includes(q) || o.customer.toLowerCase().includes(q)));
  const rows = matching.slice((page - 1) * pageSize, page * pageSize);
  const tabs = STATUS_TABS.map((t) => ({ ...t, count: t.value === 'all' ? orders.length : orders.filter((o) => o.status === t.value).length }));

  // A new filter or page starts with nothing selected.
  useEffect(() => { listRef.current?.clearSelection(); }, [status, query, page, pageSize]);

  function markFulfilled() {
    const ids = selection.all ? matching.map((o) => o.id) : selection.selected;
    setOrders((all) => all.map((o) => (ids.includes(o.id) ? { ...o, status: 'fulfilled' } : o)));
    listRef.current?.clearSelection();
    notify(`${ids.length} ${ids.length === 1 ? 'order' : 'orders'} marked as fulfilled`);
  }

  function saveProduct(product) {
    setProducts((all) => all.map((p) => (p.id === product.id ? product : p)));
    setEditing(null);
    notify('Product saved');
  }

  return (
    <Page>
      <PageHeader slot="header" heading="Orders" />
      <Stack gap="20">
        <StatusTabs tabs={tabs} value={status} controls="orders" onChange={(e) => { setStatus(e.target.value); setPage(1); }} />
        <Search label="Search orders" placeholder="Search by order number or customer" value={query}
          onInput={(e) => { setQuery(e.target.value); setPage(1); }} />
        <ResourceList id="orders" ref={listRef} selectable total={matching.length} resourceName="order"
          onSelectionChange={(e) => setSelection(e.detail)}>
          <Button slot="bulk-actions" size="medium" onClick={markFulfilled}>Mark as fulfilled</Button>
          <EmptyState slot="empty" size="small" icon="cart" heading="No orders found">Try another status or search.</EmptyState>
          {rows.map((o) => {
            const product = productById[o.productId];
            return (
              <ResourceItem key={o.id} value={o.id} label={`Order #${o.id}`}>
                <div className="order-row">
                  <strong>#{o.id}</strong>
                  <span>{o.customer}</span>
                  <span>{product.title}, Rs. {product.price}</span>
                  <Badge tone={o.payment[0]}>{o.payment[1]}</Badge>
                  <Badge tone={o.status === 'fulfilled' ? 'success' : 'neutral'}>{o.status}</Badge>
                </div>
                <Button slot="actions" size="medium" onClick={() => setEditing(product)}>Edit product</Button>
              </ResourceItem>
            );
          })}
        </ResourceList>
        <Pagination page={page} total={matching.length} pageSize={pageSize} pageSizes={[10, 20]} resourceName="orders"
          onPageChange={(e) => setPage(e.detail.page)}
          onPageSizeChange={(e) => { setPageSize(e.detail.pageSize); setPage(1); }} />
      </Stack>
      <ProductPanel product={editing} onSave={saveProduct} onClose={() => setEditing(null)} />
    </Page>
  );
}
