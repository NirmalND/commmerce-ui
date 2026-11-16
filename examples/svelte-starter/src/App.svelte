<script>
  import { COLUMNS, ORDERS, STATUSES, orderFromForm } from './data.js';

  const empty = () => ({ customer: '', status: 'unprocessed', paid: false });
  let orders = $state(ORDERS);
  let modalOpen = $state(false);
  let submitted = $state('');
  let draft = $state(empty());

  function openModal() {
    draft = empty();
    modalOpen = true;
  }

  // The form is a real <form>: the cm-* fields are form-associated, so FormData and `required` work natively.
  function submit(e) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    submitted = [...data].map(([k, v]) => `${k}=${v}`).join(', ');
    orders = [orderFromForm(data, 1001 + orders.length), ...orders];
    modalOpen = false;
  }
</script>

<cm-page>
  <cm-page-header slot="header" heading="Orders">
    <cm-button slot="actions" variant="primary" onclick={openModal}>New order</cm-button>
  </cm-page-header>
  <cm-stack gap="20">
    <!-- Svelte sets a DOM property when the element has one, so arrays reach `columns` and `rows` as arrays. -->
    <cm-data-table caption="Orders" caption-hidden columns={COLUMNS} rows={orders}></cm-data-table>
    {#if submitted}<p data-testid="submitted">Submitted: {submitted}</p>{/if}
  </cm-stack>

  <!-- `open` follows state. Esc, the backdrop and the close button fire cm-close: put the state back. -->
  <cm-modal heading="New order" open={modalOpen} oncm-close={() => (modalOpen = false)}>
    <form id="new-order" onsubmit={submit}>
      <cm-stack gap="20">
        <!-- bind:value only works on native inputs: pass the value and listen to `input` / `change`. -->
        <cm-text-field label="Customer" name="customer" required value={draft.customer}
          oninput={(e) => (draft.customer = e.currentTarget.value)}></cm-text-field>
        <cm-select label="Status" name="status" options={STATUSES} value={draft.status}
          onchange={(e) => (draft.status = e.currentTarget.value)}></cm-select>
        <cm-checkbox label="Paid" name="paid" value="yes" checked={draft.paid}
          onchange={(e) => (draft.paid = e.currentTarget.checked)}></cm-checkbox>
        <p data-testid="draft">Draft: {draft.customer || '(no customer)'} · {draft.status} · {draft.paid ? 'paid' : 'unpaid'}</p>
      </cm-stack>
    </form>
    <cm-button slot="footer" onclick={() => (draft = empty())}>Clear</cm-button>
    <cm-button slot="footer" onclick={() => (modalOpen = false)}>Cancel</cm-button>
    <!-- form="new-order": the footer is outside the <form>, so point the submit button at it. -->
    <cm-button slot="footer" variant="primary" type="submit" form="new-order">Create order</cm-button>
  </cm-modal>
</cm-page>
