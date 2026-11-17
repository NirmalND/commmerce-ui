<script setup>
import { reactive, ref } from 'vue';
import { COLUMNS, ORDERS, STATUSES, orderFromForm } from './data.js';

const orders = ref(ORDERS);
const modalOpen = ref(false);
const submitted = ref('');
const empty = () => ({ customer: '', status: 'unprocessed', paid: false });
const draft = reactive(empty());

function openModal() {
  Object.assign(draft, empty());
  modalOpen.value = true;
}

// The form is a real <form>: the cm-* fields are form-associated, so FormData and `required` work natively.
function submit(e) {
  const data = new FormData(e.target);
  submitted.value = [...data].map(([k, v]) => `${k}=${v}`).join(', ');
  orders.value = [orderFromForm(data, 1001 + orders.value.length), ...orders.value];
  modalOpen.value = false;
}
</script>

<template>
  <cm-page>
    <cm-page-header slot="header" heading="Orders">
      <cm-button slot="actions" variant="primary" @click="openModal">New order</cm-button>
    </cm-page-header>
    <cm-stack gap="20">
      <!-- Arrays and objects go to properties: Vue sets a DOM property when the element has one. -->
      <cm-data-table caption="Orders" caption-hidden :columns="COLUMNS" :rows="orders"></cm-data-table>
      <p v-if="submitted" data-testid="submitted">Submitted: {{ submitted }}</p>
    </cm-stack>

    <!-- `open` follows state. Esc, the backdrop and the close button fire cm-close: put the state back. -->
    <cm-modal heading="New order" :open="modalOpen" @cm-close="modalOpen = false">
      <form id="new-order" @submit.prevent="submit">
        <cm-stack gap="20">
          <!-- v-model works on cm-text-field: it listens to `input` and reads/writes `value`. -->
          <cm-text-field label="Customer" name="customer" required v-model="draft.customer"></cm-text-field>
          <cm-select label="Status" name="status" :options="STATUSES" :value="draft.status"
            @change="draft.status = $event.target.value"></cm-select>
          <!-- Checkboxes: bind `checked` and listen to `change` (v-model would bind `value`). -->
          <cm-checkbox label="Paid" name="paid" value="yes" :checked="draft.paid"
            @change="draft.paid = $event.target.checked"></cm-checkbox>
          <p data-testid="draft">Draft: {{ draft.customer || '(no customer)' }} · {{ draft.status }} · {{ draft.paid ? 'paid' : 'unpaid' }}</p>
        </cm-stack>
      </form>
      <cm-button slot="footer" @click="Object.assign(draft, empty())">Clear</cm-button>
      <cm-button slot="footer" @click="modalOpen = false">Cancel</cm-button>
      <!-- form="new-order": the footer is outside the <form>, so point the submit button at it. -->
      <cm-button slot="footer" variant="primary" type="submit" form="new-order">Create order</cm-button>
    </cm-modal>
  </cm-page>
</template>
