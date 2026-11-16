import { CUSTOM_ELEMENTS_SCHEMA, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { CmCheckbox, CmSelect } from '@commmerce/ui';
import { COLUMNS, ORDERS, STATUSES, orderFromForm } from './data';

@Component({
  selector: 'app-root',
  imports: [FormsModule],
  // Lets the template use cm-* elements and bind their properties: [columns], [open], [checked]…
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './app.component.html',
})
export class AppComponent {
  readonly columns = COLUMNS;
  readonly statuses = STATUSES;
  readonly orders = signal(ORDERS);
  readonly modalOpen = signal(false);
  readonly submitted = signal('');
  readonly customer = signal('');
  readonly status = signal('unprocessed');
  readonly paid = signal(false);

  clear() {
    this.customer.set('');
    this.status.set('unprocessed');
    this.paid.set(false);
  }

  openModal() {
    this.clear();
    this.modalOpen.set(true);
  }

  // Typed handlers: the event target is the element itself.
  onStatus(e: Event) { this.status.set((e.target as CmSelect).value); }
  onPaid(e: Event) { this.paid.set((e.target as CmCheckbox).checked); }

  // The form is a real <form>: the cm-* fields are form-associated, so FormData and `required` work natively.
  submit(e: SubmitEvent) {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    this.submitted.set([...data].map(([k, v]) => `${k}=${v}`).join(', '));
    this.orders.update((all) => [orderFromForm(data, 1001 + all.length), ...all]);
    this.modalOpen.set(false);
  }
}
