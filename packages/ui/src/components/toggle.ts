import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';

/**
 * On/off switch for settings that apply straight away, such as showing a product on the store.
 * Participates in native forms like a checkbox.
 * @element cm-toggle
 * @slot - Rich label content, used instead of `label`.
 * @fires change - When switched by the user.
 */
export class CmToggle extends LitElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    description: {},
    name: { reflect: true },
    value: {},
    checked: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
  };

  /** Visible label after the switch. Without one, give the element an `aria-label`. */
  label = '';
  /** Help text under the label, linked for screen readers. */
  description = '';
  /** Form field name. */
  name = '';
  /** Submitted value when on. */
  value = 'on';
  /** Whether the switch is on. Reflects to the attribute. */
  checked = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;

  #internals = this.attachInternals();
  #id = nextId('cm-tg');
  #defaultChecked = false;

  static styles = [
    base,
    css`
      :host { display: inline-flex; }
      label { position: relative; display: inline-flex; align-items: flex-start; gap: var(--cm-space-10); cursor: pointer; }
      input { position: absolute; opacity: 0; width: 38px; height: 20px; margin: 0; cursor: inherit; }
      .track {
        flex: none; display: inline-flex; align-items: center; width: 38px; height: 20px; padding: 2px;
        border-radius: var(--cm-radius-full); background: var(--cm-toggle-off);
        border: var(--cm-border-1) solid var(--cm-border-input); transition: background-color .15s;
      }
      .thumb {
        width: 14px; height: 14px; border-radius: var(--cm-radius-full); background: var(--cm-bg-surface);
        border: var(--cm-border-1) solid var(--cm-border-input); transition: transform .15s;
      }
      input:checked + .track { background: var(--cm-toggle-on); }
      input:checked + .track .thumb { transform: translateX(18px); }
      /* On is the end side: the left in right-to-left text. */
      :host(:dir(rtl)) input:checked + .track .thumb { transform: translateX(-18px); }
      input:focus-visible + .track { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .text { display: flex; flex-direction: column; gap: 4px; padding-top: 1px; }
      .label { font-size: 14px; }
      .desc { font-size: 12px; color: var(--cm-text-tertiary); }
      :host([disabled]) label { cursor: not-allowed; }
      :host([disabled]) .track { opacity: .5; }
      :host([disabled]) .label { color: var(--cm-text-secondary); }
      @media (prefers-reduced-motion: reduce) { .track, .thumb { transition: none; } }
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
  formStateRestoreCallback(state: string | null) { this.checked = state != null; }

  updated() {
    this.#internals.setFormValue(this.checked ? this.value : null);
  }

  #onChange(e: Event) {
    this.checked = (e.target as HTMLInputElement).checked;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  render() {
    const hasText = this.label || this.description || this.textContent?.trim();
    return html`<label for=${this.#id}>
      <input type="checkbox" role="switch" id=${this.#id} .checked=${this.checked} ?disabled=${this.disabled}
        aria-label=${hasText ? nothing : this.getAttribute('aria-label') ?? nothing}
        aria-describedby=${this.description ? `${this.#id}-d` : nothing} @change=${this.#onChange} />
      <span class="track" part="track"><span class="thumb" part="thumb"></span></span>
      ${hasText
        ? html`<span class="text"><span class="label">${this.label}<slot></slot></span>${this.description ? html`<span class="desc" id="${this.#id}-d">${this.description}</span>` : nothing}</span>`
        : nothing}
    </label>`;
  }
}
define('cm-toggle', CmToggle);

declare global { interface HTMLElementTagNameMap { 'cm-toggle': CmToggle } }
