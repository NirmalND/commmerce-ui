import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('fileUpload', {
  /** Text inside the empty zone. */
  prompt: 'Click here to upload',
  /** Text of the tile that adds more files. */
  addMore: 'Add more',
  /** Accessible name of the list of chosen files. */
  files: 'Chosen files',
  /** Accessible name of each file's remove button. */
  remove: 'Remove {name}',
  /** File sizes. `{size}` is a number formatted for the locale. */
  kilobytes: '{size} KB',
  megabytes: '{size} MB',
  /** Validation messages. */
  required: 'Please choose a file.',
  wrongType: '{name} is not an allowed file type',
  tooLarge: '{name} is larger than {size}',
  tooMany: 'You can add up to {max} files',
  /** `variant="photo"`: text of the empty tile when there is no `label`. */
  takePhoto: 'Take a photo',
  /** `variant="photo"`: visible text of the buttons under a taken photo. */
  retake: 'Retake',
  removePhoto: 'Remove',
  /** `variant="photo"`: accessible names of those buttons. `{name}` is the `label`, or the `photo` string without one. */
  retakeName: 'Retake {name}',
  removeName: 'Remove {name}',
  /** `variant="photo"`: what the photo is called in button names when there is no `label`. */
  photo: 'photo',
});
declare module '../localize.js' { interface CmStrings { fileUpload: typeof strings } }

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
 *
 * `variant="photo"` (since 1.3) is the phone capture pattern: one tile with a camera icon and the label; once a photo
 * is taken or chosen, the tile shows it with Retake and Remove buttons. Add `capture="environment"` to open the
 * back camera directly on phones.
 * @element cm-file-upload
 * @fires change - When files are added or removed. Read `files`.
 * @fires cm-reject - When chosen files are refused for type or size. `detail.files` lists them.
 */
export class CmFileUpload extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    hint: {},
    prompt: { string: 'prompt' },
    name: { reflect: true },
    accept: {},
    multiple: { type: Boolean },
    maxSize: { type: Number, attribute: 'max-size' },
    maxFiles: { type: Number, attribute: 'max-files' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    error: { reflect: true },
    files: { attribute: false },
    variant: { reflect: true },
    capture: { reflect: true },
    _rejected: { state: true },
  };

  /** Heading above the zone, e.g. "Add product images". */
  label = '';
  /** Rule shown next to the label in text-tertiary, e.g. "max. file size 300 KB". */
  hint = '';
  /** Text inside the zone. Default: the built-in string `prompt` ("Click here to upload"). */
  prompt!: string;
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
  /**
   * `photo` (since 1.3): a single-photo tile for phones. It shows a camera icon and the `label` (or the prompt
   * "Take a photo" without one); after a photo is taken it fills the tile, with Retake and Remove buttons under it.
   * One file only (`multiple` is ignored); `accept` defaults to `image/*`. Size the tile with CSS on the element;
   * it is 4:3 (change it with `::part(photo)`, e.g. `aspect-ratio: 16 / 10` for a visiting card).
   */
  variant?: 'photo';
  /**
   * Asks phones to open the camera instead of the file chooser, as `capture` on a native input (since 1.3):
   * `environment` for the back camera (a shop front, a document), `user` for the front camera (a selfie).
   * Desktop browsers ignore it and show the file chooser.
   */
  capture?: 'environment' | 'user';

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
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
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
        position: absolute; top: -10px; inset-inline-end: -10px; display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; padding: 0; border-radius: var(--cm-radius-full); cursor: pointer;
        background: var(--cm-bg-surface); color: var(--cm-icon-selected); border: var(--cm-border-1) solid var(--cm-border-input);
      }
      .remove:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .msg { margin: var(--cm-space-10) 0 0; font-size: 12px; color: var(--cm-text-critical); }
      :host([disabled]) .zone { cursor: not-allowed; background: var(--cm-bg-input-filled); color: var(--cm-text-secondary); border-color: var(--cm-border-default); }
      :host([disabled]) .remove { display: none; }
      /* variant="photo" (1.3) */
      .zone.photo { min-height: 0; aspect-ratio: 4 / 3; border-radius: var(--cm-radius-md); font-size: 14px; }
      .zone.photo.invalid { border-color: var(--cm-border-critical); }
      .photo-label { font-weight: 500; overflow-wrap: anywhere; }
      .shot {
        aspect-ratio: 4 / 3; border-radius: var(--cm-radius-md); overflow: hidden;
        background: var(--cm-bg-inset); border: var(--cm-border-1) solid var(--cm-border-card);
      }
      .shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .caption { margin: var(--cm-space-10) 0 0; font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
      .caption:empty { display: none; }
      .actions { display: flex; flex-wrap: wrap; gap: var(--cm-space-10); margin-top: var(--cm-space-10); }
      .action {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px; flex: 1 1 0; min-width: max-content;
        min-height: 40px; padding: 0 var(--cm-space-15); font: inherit; font-size: 14px; font-weight: 500; cursor: pointer;
        background: var(--cm-bg-hover); color: var(--cm-text-default);
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-sm);
      }
      .action:hover { background: var(--cm-bg-surface); }
      .action:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      @media (max-width: 640px) {
        .zone:not(.tile):not(.photo) { min-height: 100px; font-size: 14px; }
        .label { font-size: var(--cm-type-heading-sm-resp-size); }
      }
    `,
  ];

  get #photo() { return this.variant === 'photo'; }
  get #accept() { return this.accept || (this.#photo ? 'image/*' : ''); }
  get #multiple() { return this.multiple && !this.#photo; }

  /** A file size in KB or MB, formatted for the locale. */
  #size(n: number) {
    return n >= 1024 * 1024
      ? this.t('megabytes', { size: this.formatNumber(+(n / 1024 / 1024).toFixed(1), { useGrouping: false }) })
      : this.t('kilobytes', { size: this.formatNumber(Math.max(1, Math.round(n / 1024)), { useGrouping: false }) });
  }

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
    // The photo tile keeps a hidden input for Retake; with a photo shown, point validation at the Retake button.
    const input = (this.#photo && this.files.length ? this.renderRoot.querySelector<HTMLElement>('.retake') : this.renderRoot.querySelector('input')) ?? undefined;
    const msg = this.error || this._rejected;
    if (msg) this.#internals.setValidity({ customError: true }, msg, input);
    else if (this.required && !this.files.length) this.#internals.setValidity({ valueMissing: true }, this.t('required'), input);
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
      if (!accepts(f, this.#accept)) { refused.push(f); reasons.push(this.t('wrongType', { name: f.name })); }
      else if (this.maxSize && f.size > this.maxSize) { refused.push(f); reasons.push(this.t('tooLarge', { name: f.name, size: this.#size(this.maxSize) })); }
      else ok.push(f);
    }
    let next = this.#multiple ? [...this.files, ...ok] : ok.slice(-1);
    if (!this.#multiple && !ok.length) next = this.files;
    if (this.#multiple && this.maxFiles && next.length > this.maxFiles) {
      refused.push(...next.slice(this.maxFiles));
      reasons.push(this.t('tooMany', { max: this.maxFiles }));
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
      <input type="file" id=${this.#id} accept=${this.accept || nothing} capture=${this.capture || nothing} ?multiple=${this.multiple} ?disabled=${this.disabled}
        ?required=${this.required && !this.files.length}
        aria-labelledby=${[this.label && `${this.#id}-l`, `${this.#id}-p`].filter(Boolean).join(' ')}
        aria-describedby=${described || nothing} aria-invalid=${this.error || this._rejected ? 'true' : nothing}
        @change=${this.#onInputChange} @cancel=${(e: Event) => e.stopPropagation()} />
      <cm-icon name=${tile ? 'plus' : 'upload'} size=${tile ? 24 : 38}></cm-icon>
      <span id="${this.#id}-p">${tile ? this.t('addMore') : this.prompt}</span>
    </label>`;
  }

  /** Opens the camera or file chooser again to replace the photo. */
  #retake() { this.renderRoot.querySelector<HTMLInputElement>('input[type=file]')?.click(); }

  #renderPhoto() {
    const msg = this.error || this._rejected;
    const f = this.files[0];
    const name = this.label || this.t('photo');
    const described = [this.hint && `${this.#id}-hint`, msg && `${this.#id}-msg`].filter(Boolean).join(' ');
    const input = (hidden: boolean) => html`<input type="file" id=${this.#id} accept=${this.#accept} capture=${this.capture || nothing}
      ?disabled=${this.disabled} ?required=${this.required && !f} tabindex=${hidden ? '-1' : nothing} aria-hidden=${hidden ? 'true' : nothing}
      ?hidden=${hidden} aria-labelledby=${hidden ? nothing : `${this.#id}-p`} aria-describedby=${(!hidden && described) || nothing} aria-invalid=${msg ? 'true' : nothing}
      @change=${this.#onInputChange} @cancel=${(e: Event) => e.stopPropagation()} />`;
    const hint = this.hint ? html`<span class="hint" id="${this.#id}-hint">${this.hint}</span>` : nothing;
    return html`
      ${f
        ? html`<div class="shot" part="photo">
              ${f.type.startsWith('image/')
                ? html`<img src=${this.#url(f)} alt=${name} />`
                : html`<div class="doc"><cm-icon name="book" size="24"></cm-icon><span class="name">${f.name}</span><span class="size">${this.#size(f.size)}</span></div>`}
            </div>
            <p class="caption" aria-hidden="true">${this.label}</p>
            ${input(true)}
            ${this.disabled ? nothing : html`<div class="actions" part="actions">
              <button type="button" class="action retake" aria-label=${this.t('retakeName', { name })} aria-describedby=${msg ? `${this.#id}-msg` : nothing} @click=${this.#retake}><cm-icon name="camera" size="16"></cm-icon>${this.t('retake')}</button>
              <button type="button" class="action" aria-label=${this.t('removeName', { name })} @click=${() => this.removeFile(f)}><cm-icon name="trash" size="16"></cm-icon>${this.t('removePhoto')}</button>
            </div>`}`
        : html`<label class="zone photo ${msg ? 'invalid' : ''}" part="zone photo"
              @dragenter=${() => this.#setOver(true)} @dragleave=${() => this.#setOver(false)} @drop=${() => this.#setOver(false)}>
            ${input(false)}
            <cm-icon name="camera" size="32"></cm-icon>
            <span class="photo-label" id="${this.#id}-p" part="label">${this.label || this.t('takePhoto')}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>
            ${hint}
          </label>`}
      ${msg ? html`<p class="msg" id="${this.#id}-msg" role="alert">${msg}</p>` : nothing}
    `;
  }

  render() {
    if (this.#photo) return this.#renderPhoto();
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
        ? html`<ul class="grid" part="files" role="list" style="list-style:none;margin:0;padding:0" aria-label=${this.t('files')}>
            ${this.files.map((f) => html`<li class="file">
              ${f.type.startsWith('image/')
                ? html`<img src=${this.#url(f)} alt=${f.name} />`
                : html`<div class="doc"><cm-icon name="book" size="24"></cm-icon><span class="name">${f.name}</span><span class="size">${this.#size(f.size)}</span></div>`}
              ${this.disabled ? nothing : html`<button type="button" class="remove" aria-label=${this.t('remove', { name: f.name })} @click=${() => this.removeFile(f)}><cm-icon name="close" size="12"></cm-icon></button>`}
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
