'use client';
// Commmerce UI components are browser custom elements: they register and run on the client.
import { useState } from 'react';
import { Button, Checkbox, DataTable, Modal, Page, PageHeader, Select, Stack, TextField } from '@commmerce/ui-react';
import { COLUMNS, ORDERS, STATUSES, orderFromForm } from './data.js';

const empty = () => ({ customer: '', status: 'unprocessed', paid: false });

export function Orders() {
  const [orders, setOrders] = useState(ORDERS);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState('');
  const [draft, setDraft] = useState(empty);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  function openModal() {
    setDraft(empty());
    setModalOpen(true);
  }

  // The form is a real <form>: the cm-* fields are form-associated, so FormData and `required` work natively.
  function submit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSubmitted([...data].map(([k, v]) => `${k}=${v}`).join(', '));
    setOrders((all) => [orderFromForm(data, 1001 + all.length), ...all]);
    setModalOpen(false);
  }

  return (
    <Page>
      <PageHeader slot="header" heading="Orders">
        <Button slot="actions" variant="primary" onClick={openModal}>New order</Button>
      </PageHeader>
      <Stack gap="20">
        {/* The wrappers pass arrays and objects as properties. */}
        <DataTable caption="Orders" captionHidden columns={COLUMNS} rows={orders} />
        {submitted && <p data-testid="submitted">Submitted: {submitted}</p>}
      </Stack>

      {/* `open` follows state. Esc, the backdrop and the close button fire cm-close (onClose): put the state back. */}
      <Modal heading="New order" open={modalOpen} onClose={() => setModalOpen(false)}>
        <form id="new-order" onSubmit={submit}>
          <Stack gap="20">
            <TextField label="Customer" name="customer" required value={draft.customer}
              onInput={(e) => set('customer', e.target.value)} />
            <Select label="Status" name="status" options={STATUSES} value={draft.status}
              onChange={(e) => set('status', e.target.value)} />
            <Checkbox label="Paid" name="paid" value="yes" checked={draft.paid}
              onChange={(e) => set('paid', e.target.checked)} />
            <p data-testid="draft">Draft: {draft.customer || '(no customer)'} · {draft.status} · {draft.paid ? 'paid' : 'unpaid'}</p>
          </Stack>
        </form>
        <Button slot="footer" onClick={() => setDraft(empty())}>Clear</Button>
        <Button slot="footer" onClick={() => setModalOpen(false)}>Cancel</Button>
        {/* form="new-order": the footer is outside the <form>, so point the submit button at it. */}
        <Button slot="footer" variant="primary" type="submit" form="new-order">Create order</Button>
      </Modal>
    </Page>
  );
}
