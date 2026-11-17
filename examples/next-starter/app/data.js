// Sample data. In a real app this comes from your backend.

export const STATUSES = [
  { value: 'unprocessed', label: 'Unprocessed' },
  { value: 'processing', label: 'Processing' },
  { value: 'fulfilled', label: 'Fulfilled' },
];

export const COLUMNS = [
  { key: 'id', label: 'Order' },
  { key: 'customer', label: 'Customer' },
  { key: 'status', label: 'Status' },
  { key: 'payment', label: 'Payment' },
];

export const ORDERS = [
  { id: '#1004', customer: 'Priya Sharma', status: 'Unprocessed', payment: 'Paid' },
  { id: '#1003', customer: 'Rahul Mehta', status: 'Processing', payment: 'Pending' },
  { id: '#1002', customer: 'Ananya Iyer', status: 'Fulfilled', payment: 'Paid' },
  { id: '#1001', customer: 'Farhan Ali', status: 'Fulfilled', payment: 'Paid' },
];

/** A table row from the submitted form. */
export function orderFromForm(data, nextNumber) {
  return {
    id: `#${nextNumber}`,
    customer: data.get('customer'),
    status: STATUSES.find((s) => s.value === data.get('status'))?.label ?? '',
    payment: data.get('paid') ? 'Paid' : 'Pending',
  };
}
