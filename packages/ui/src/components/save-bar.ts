import { html, css } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './button.js';

const strings = defineStrings('saveBar', {
  /** The message next to the buttons. */
  message: 'Unsaved changes',
  /** The two buttons. */
  save: 'Save',
  discard: 'Discard',
});
declare module '../localize.js' { interface CmStrings { saveBar: typeof strings } }

/**
 * Asks the merchant to save or discard unsaved changes. Hidden until `open` (or, with `form`,
 * until a field in that form changes). Built on the Figma "Bottom Tab" save variant.
 * @element cm-save-bar
 * @fires cm-save - Save pressed (cancelable). With `form`, the default submits that form.
 * @fires cm-discard - Discard pressed (cancelable). With `form`, the default resets that form and closes the bar.
 */
export class CmSaveBar extends CmLocalizedElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    message: { string: 'message' },
    saveLabel: { attribute: 'save-label', string: 'save' },
    discardLabel: { attribute: 'discard-label', string: 'discard' },
    loading: { type: Boolean, reflect: true },
    saveDisabled: { type: Boolean, attribute: 'save-disabled' },
    form: {},
  };

  /** Shows the bar. Set it when the page has unsaved changes. */
  open = false;
  /** The question or status shown next to the buttons. Default: the built-in string `message` ("Unsaved changes"). */
  message!: string;
  /** Primary button label. Default: the built-in string `save` ("Save"). */
  saveLabel!: string;
  /** Secondary button label. Default: the built-in string `discard` ("Discard"). */
  discardLabel!: string;
  /** Shows a spinner on Save and blocks both buttons while saving. */
  loading = false;
  /** Disables Save, for example while the form has errors. */
  saveDisabled = false;
  /** ID of a `<form>` to watch: the bar opens on input, Save submits it and Discard resets it. */
  form = '';

  #watched: HTMLFormElement | null = null;

  static styles = [
    base,
    css`
      :host { display: block; position: sticky; bottom: 0; z-index: 20; }
      :host(:not([open])) { display: none; }
      .bar {
        display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--cm-space-20);
        min-height: 64px; padding: var(--cm-space-12) var(--cm-space-20);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle);
        border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-lg);
      }
      .message { flex: 1 1 200px; margin: 0; font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600; }
      .actions { flex: none; display: flex; gap: var(--cm-space-8); margin-inline-start: auto; }
      @media (max-width: 640px) {
        .bar { min-height: 56px; padding: var(--cm-space-8) var(--cm-space-12); gap: var(--cm-space-8); }
        .message { font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); font-weight: 500; }

      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    queueMicrotask(() => this.#watch());
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#unwatch();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('form') && this.isConnected) this.#watch();
  }

  #onDirty = () => { this.open = true; };
  #onReset = () => { this.open = false; };

  #watch() {
    this.#unwatch();
    const f = this.form ? (this.getRootNode() as Document | ShadowRoot).getElementById?.(this.form) : null;
    if (f instanceof HTMLFormElement) {
      this.#watched = f;
      f.addEventListener('input', this.#onDirty);
      f.addEventListener('change', this.#onDirty);
      f.addEventListener('reset', this.#onReset);
    }
  }

  #unwatch() {
    const f = this.#watched;
    if (!f) return;
    f.removeEventListener('input', this.#onDirty);
    f.removeEventListener('change', this.#onDirty);
    f.removeEventListener('reset', this.#onReset);
    this.#watched = null;
  }

  #emit(name: string) {
    return this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, cancelable: true }));
  }

  #save() {
    if (this.loading || this.saveDisabled) return;
    if (this.#emit('cm-save') && this.#watched) this.#watched.requestSubmit();
  }

  #discard() {
    if (this.loading) return;
    if (this.#emit('cm-discard') && this.#watched) {
      this.#watched.reset();
      this.open = false;
    }
  }

  render() {
    return html`<div class="bar" part="bar" role="region" aria-label=${this.message}>
      <p class="message" part="message" role="status">${this.open ? this.message : ''}</p>
      <div class="actions">
        <cm-button size="large" ?disabled=${this.loading} @click=${this.#discard}>${this.discardLabel}</cm-button>
        <cm-button size="large" variant="primary" ?loading=${this.loading} ?disabled=${this.saveDisabled} @click=${this.#save}>${this.saveLabel}</cm-button>
      </div>
    </div>`;
  }
}
define('cm-save-bar', CmSaveBar);

declare global { interface HTMLElementTagNameMap { 'cm-save-bar': CmSaveBar } }
