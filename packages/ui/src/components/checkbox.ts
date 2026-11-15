import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';

/**
 * Checkbox with label and optional description. Participates in native forms.
 * @element cm-checkbox
 * @slot - Rich label content, used instead of `label`.
 * @fires change - When toggled by the user.
 */
export class CmCheckbox extends LitElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    description: {},
    name: { reflect: true },
    value: {},
    checked: { type: Boolean, reflect: true },
    indeterminate: { type: Boolean },
    disabled: { type: Boolean, reflect: true },
    required: { type: Boolean },
  };

  /** Visible label. Capitalised automatically in the original design; write it in sentence case. */
  label = '';
  /** Help text under the label, linked for screen readers. */
  description = '';
  /** Form field name. */
  name = '';
  /** Submitted value when checked. */
  value = 'on';
  /** Whether the box is ticked. Reflects to the attribute. */
  checked = false;
  /** Mixed state, for a "select all" box when only some rows are selected. */
  indeterminate = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Form will not submit until ticked. */
  required = false;

  #internals = this.attachInternals();
  #id = nextId('cm-cb');
  #defaultChecked = false;

  static styles = [
    base,
    css`
      :host { display: inline-flex; }
      label { position: relative; display: inline-flex; align-items: flex-start; gap: var(--cm-space-10); cursor: pointer; }
      input { position: absolute; opacity: 0; width: 20px; height: 20px; margin: 0; cursor: inherit; }
      .box {
        flex: none; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center;
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-xs);
        background: var(--cm-bg-surface); color: transparent;
      }
      input:checked + .box, input:indeterminate + .box { color: var(--cm-text-default); }
      input:focus-visible + .box { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .text { display: flex; flex-direction: column; gap: 6px; padding-top: 1px; }
      .label { font-size: 16px; }
      .desc { font-size: 12px; color: var(--cm-text-tertiary); }
      :host([disabled]) label { cursor: not-allowed; }
      :host([disabled]) .box { background: var(--cm-bg-input-filled); border-color: var(--cm-border-default); }
      :host([disabled]) .label { color: var(--cm-text-secondary); }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#defaultChecked = this.checked;
  }
  get form() { return this.#internals.form; }
  checkValidity() { return this.#internals.checkValidity(); }
  formResetCallback() { this.checked = this.#defaultChecked; }
  formDisabledCallback(d: boolean) { this.disabled = d; }

  updated() {
    this.#internals.setFormValue(this.checked ? this.value : null);
    if (this.required && !this.checked) this.#internals.setValidity({ valueMissing: true }, 'Please tick this box.');
    else this.#internals.setValidity({});
  }

  #onChange(e: Event) {
    const input = e.target as HTMLInputElement;
    this.checked = input.checked;
    this.indeterminate = false;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  render() {
    const mark = this.indeterminate
      ? html`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`
      : html`<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6.2 4.8 9 10 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return html`<label for=${this.#id}>
      <input type="checkbox" id=${this.#id} .checked=${this.checked} .indeterminate=${this.indeterminate}
        ?disabled=${this.disabled} ?required=${this.required}
        aria-describedby=${this.description ? `${this.#id}-d` : nothing} @change=${this.#onChange} />
      <span class="box" part="box">${mark}</span>
      ${this.label || this.description
        ? html`<span class="text"><span class="label">${this.label}<slot></slot></span>${this.description ? html`<span class="desc" id="${this.#id}-d">${this.description}</span>` : nothing}</span>`
        : html`<slot></slot>`}
    </label>`;
  }
}
define('cm-checkbox', CmCheckbox);

declare global { interface HTMLElementTagNameMap { 'cm-checkbox': CmCheckbox } }
