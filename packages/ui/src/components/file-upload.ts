import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import './icon.js';

const kb = (n: number) => (n >= 1024 * 1024 ? `${+(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Does `file` match an `accept` list such as `image/*,.pdf`? */
function accepts(file: File, accept: string) {
  if (!accept.trim()) return true;
  const name = file.name.toLowerCase(), type = file.type.toLowerCase();
  return accept.split(',').map((a) => a.trim().toLowerCase()).filter(Boolean).some((a) =>
    a.startsWith('.') ? name.endsWith(a) : a.endsWith('/*') ? type.startsWith(a.slice(0, -1)) : type === a);
}

/**
 * Drop zone for choosing files, with thumbnails of chosen images and a remove button on each.
 * Wraps a native file input, so it works with the keyboard, screen readers and drag and drop.
 * Participates in native forms (submit with `enctype="multipart/form-data"`).
 * @element cm-file-upload
 * @fires change - When files are added or removed. Read `files`.
 * @fires cm-reject - When chosen files are refused for type or size. `detail.files` lists them.
 */
export class CmFileUpload extends LitElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    hint: {},
    prompt: {},
    name: { reflect: true },
    accept: {},
    multiple: { type: Boolean },
    maxSize: { type: Number, attribute: 'max-size' },
    maxFiles: { type: Number, attribute: 'max-files' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    error: { reflect: true },
    files: { attribute: false },
    _rejected: { state: true },
  };

  /** Heading above the zone, e.g. "Add product images". */
  label = '';
  /** Rule shown next to the label in text-tertiary, e.g. "max. file size 300 KB". */
  hint = '';
  /** Text inside the zone. */
  prompt = 'Click here to upload';
  /** Form field name. */
  name = '';
  /** Allowed types, as for a native input: `image/*`, `.pdf,.csv`. Other files are refused. */
  accept = '';
  /** Allows more than one file. Chosen files are added to the list rather than replacing it. */
  multiple = false;
  /** Largest allowed file in bytes. Larger files are refused. */
  maxSize = 0;
  /** Most files allowed when `multiple`; 0 for no limit. */
  maxFiles = 0;
  /** The form will not submit without a file. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Error message from your own validation; announced and linked to the input. */
  error = '';
  /** The chosen files. Set it to `[]` to clear. */
  files: File[] = [];

  _rejected = '';

  #internals = this.attachInternals();
  #id = nextId('cm-fu');
  #urls = new Map<File, string>();

  static styles = [
    base,
    css`
      :host { display: block; }
      .head { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: var(--cm-space-10); margin-bottom: var(--cm-space-20); }
      .label { font-size: var(--cm-type-heading-sm-size); font-weight: 600; }
      .req { color: var(--cm-text-critical); margin-left: 2px; }
      .hint { font-size: 12px; color: var(--cm-text-tertiary); }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 186px)); gap: var(--cm-space-30); }
      .zone {
        position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--cm-space-10);
        min-height: 177px; padding: var(--cm-space-20); text-align: center; font-size: 16px; color: var(--cm-text-default);
        background: var(--cm-bg-surface); border: var(--cm-border-1) dashed var(--cm-border-strong); cursor: pointer;
      }
      .zone:hover, :host([data-over]) .zone { background: var(--cm-bg-hover); }
      .zone.tile { min-height: 0; aspect-ratio: 1; border-radius: var(--cm-radius-md); font-size: 14px; }
      .zone input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: inherit; font-size: 0; }
      .zone:focus-within { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .file {
        position: relative; aspect-ratio: 1; border-radius: var(--cm-radius-md); background: var(--cm-bg-inset);
        border: var(--cm-border-1) solid var(--cm-border-card);
      }
      .file img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block; }
      .doc { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; height: 100%; padding: var(--cm-space-10); text-align: center; }
      .doc .name { font-size: 12px; word-break: break-all; }
      .doc .size, .tile .size { font-size: 12px; color: var(--cm-text-tertiary); }
      .remove {
        position: absolute; top: -10px; right: -10px; display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; padding: 0; border-radius: var(--cm-radius-full); cursor: pointer;
        background: var(--cm-bg-surface); color: var(--cm-icon-selected); border: var(--cm-border-1) solid var(--cm-border-input);
      }
      .remove:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .msg { margin: var(--cm-space-10) 0 0; font-size: 12px; color: var(--cm-text-critical); }
      :host([disabled]) .zone { cursor: not-allowed; background: var(--cm-bg-input-filled); color: var(--cm-text-secondary); border-color: var(--cm-border-default); }
      :host([disabled]) .remove { display: none; }
      @media (max-width: 640px) {
        .zone:not(.tile) { min-height: 100px; font-size: 14px; }
        .label { font-size: var(--cm-type-heading-sm-resp-size); }
      }
    `,
  ];

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  formResetCallback() { this.files = []; this._rejected = ''; }
  formDisabledCallback(d: boolean) { this.disabled = d; }

  disconnectedCallback() {
    super.disconnectedCallback();
    for (const u of this.#urls.values()) URL.revokeObjectURL(u);
    this.#urls.clear();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('files')) {
      for (const [f, u] of this.#urls) if (!this.files.includes(f)) { URL.revokeObjectURL(u); this.#urls.delete(f); }
    }
    const data = new FormData();
    for (const f of this.files) data.append(this.name || 'file', f);
    this.#internals.setFormValue(this.files.length ? data : null);
    const input = this.renderRoot.querySelector('input') ?? undefined;
    const msg = this.error || this._rejected;
    if (msg) this.#internals.setValidity({ customError: true }, msg, input);
    else if (this.required && !this.files.length) this.#internals.setValidity({ valueMissing: true }, 'Please choose a file.', input);
    else this.#internals.setValidity({});
  }

  #url(f: File) {
    let u = this.#urls.get(f);
    if (!u) { u = URL.createObjectURL(f); this.#urls.set(f, u); }
    return u;
  }

  /** Adds files as if the merchant had chosen them: filters by type, size and count, then fires events. */
  addFiles(list: Iterable<File>) {
    const incoming = [...list];
    const ok: File[] = [], refused: File[] = [], reasons: string[] = [];
    for (const f of incoming) {
      if (!accepts(f, this.accept)) { refused.push(f); reasons.push(`${f.name} is not an allowed file type`); }
      else if (this.maxSize && f.size > this.maxSize) { refused.push(f); reasons.push(`${f.name} is larger than ${kb(this.maxSize)}`); }
      else ok.push(f);
    }
    let next = this.multiple ? [...this.files, ...ok] : ok.slice(-1);
    if (!this.multiple && !ok.length) next = this.files;
    if (this.multiple && this.maxFiles && next.length > this.maxFiles) {
      refused.push(...next.slice(this.maxFiles));
      reasons.push(`You can add up to ${this.maxFiles} files`);
      next = next.slice(0, this.maxFiles);
    }
    this._rejected = reasons.join('. ');
    if (refused.length) this.dispatchEvent(new CustomEvent('cm-reject', { bubbles: true, composed: true, detail: { files: refused } }));
    if (next !== this.files && (next.length !== this.files.length || next.some((f, i) => f !== this.files[i]))) {
      this.files = next;
      this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
  }

  /** Removes one chosen file and fires `change`. */
  removeFile(file: File) {
    if (!this.files.includes(file)) return;
    this.files = this.files.filter((f) => f !== file);
    this._rejected = '';
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.updateComplete.then(() => this.renderRoot.querySelector('input')?.focus());
  }

  #onInputChange(e: Event) {
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    this.addFiles(input.files ?? []);
    input.value = '';
  }

  #setOver(on: boolean) { this.toggleAttribute('data-over', on); }

  #zone(tile: boolean) {
    const described = [this.hint && `${this.#id}-hint`, (this.error || this._rejected) && `${this.#id}-msg`].filter(Boolean).join(' ');
    return html`<label class="zone ${tile ? 'tile' : ''}" part="zone"
        @dragenter=${() => this.#setOver(true)} @dragleave=${() => this.#setOver(false)} @drop=${() => this.#setOver(false)}>
      <input type="file" id=${this.#id} accept=${this.accept || nothing} ?multiple=${this.multiple} ?disabled=${this.disabled}
        ?required=${this.required && !this.files.length}
        aria-labelledby=${[this.label && `${this.#id}-l`, `${this.#id}-p`].filter(Boolean).join(' ')}
        aria-describedby=${described || nothing} aria-invalid=${this.error || this._rejected ? 'true' : nothing}
        @change=${this.#onInputChange} @cancel=${(e: Event) => e.stopPropagation()} />
      <cm-icon name=${tile ? 'plus' : 'upload'} size=${tile ? 24 : 38}></cm-icon>
      <span id="${this.#id}-p">${tile ? 'Add more' : this.prompt}</span>
    </label>`;
  }

  render() {
    const msg = this.error || this._rejected;
    const showZone = !this.files.length || this.multiple;
    const tile = this.files.length > 0;
    return html`
      ${this.label || this.hint
        ? html`<div class="head">
            ${this.label ? html`<span class="label" id="${this.#id}-l" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>` : nothing}
            ${this.hint ? html`<span class="hint" id="${this.#id}-hint">${this.hint}</span>` : nothing}
          </div>`
        : nothing}
      ${tile
        ? html`<ul class="grid" part="files" role="list" style="list-style:none;margin:0;padding:0" aria-label="Chosen files">
            ${this.files.map((f) => html`<li class="file">
              ${f.type.startsWith('image/')
                ? html`<img src=${this.#url(f)} alt=${f.name} />`
                : html`<div class="doc"><cm-icon name="book" size="24"></cm-icon><span class="name">${f.name}</span><span class="size">${kb(f.size)}</span></div>`}
              ${this.disabled ? nothing : html`<button type="button" class="remove" aria-label="Remove ${f.name}" @click=${() => this.removeFile(f)}><cm-icon name="close" size="12"></cm-icon></button>`}
            </li>`)}
            ${showZone ? html`<li>${this.#zone(true)}</li>` : nothing}
          </ul>`
        : this.#zone(false)}
      ${msg ? html`<p class="msg" id="${this.#id}-msg" role="alert">${msg}</p>` : nothing}
    `;
  }
}
define('cm-file-upload', CmFileUpload);

declare global { interface HTMLElementTagNameMap { 'cm-file-upload': CmFileUpload } }
