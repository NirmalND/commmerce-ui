// Sample data. In a real app this comes from your backend (see README, "Where to change things").

export const PRODUCTS = [
  { id: 'p1', title: 'Cotton kurta', price: '1299', sku: 'KU-001' },
  { id: 'p2', title: 'Leather sandals', price: '899', sku: 'SA-014' },
  { id: 'p3', title: 'Steel water bottle', price: '549', sku: 'WB-220' },
  { id: 'p4', title: 'Silk scarf', price: '2340', sku: 'SC-007' },
];

const CUSTOMERS = ['Priya Sharma', 'Rahul Mehta', 'Ananya Iyer', 'Farhan Ali', 'Kavya Reddy', 'Arjun Nair', 'Meera Pillai', 'Vikram Singh'];
const STATUSES = ['unprocessed', 'processing', 'fulfilled'];
const PAYMENTS = [['success', 'Paid'], ['information', 'Pending'], ['success', 'Paid'], ['critical', 'Failed']];

// 24 orders, newest first: #1048 down to #1025.
export const ORDERS = Array.from({ length: 24 }, (_, i) => ({
  id: String(1048 - i),
  customer: CUSTOMERS[i % CUSTOMERS.length],
  productId: PRODUCTS[i % PRODUCTS.length].id,
  status: STATUSES[i % STATUSES.length],
  payment: PAYMENTS[i % PAYMENTS.length],
}));

export const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'unprocessed', label: 'Unprocessed' },
  { value: 'processing', label: 'Processing' },
  { value: 'fulfilled', label: 'Fulfilled' },
];
