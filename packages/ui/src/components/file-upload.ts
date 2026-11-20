import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { FieldValidity } from '../validation.js';
import './icon.js';

const strings = defineStrings('fileUpload', {
  /** Text inside the empty zone. `{browse}` is where the `browse` word goes, drawn like a link. */
  prompt: 'Drag files here or {browse}',
  /** The link-like word in the prompt. */
  browse: 'Browse',
  /** The prompt while files are dragged over the zone. */
  drop: 'Drop files to upload',
  /** Accessible name of a file's progress bar while it uploads (`setProgress`). */
  uploading: 'Uploading {name}',
  /** Accessible name of the button that cancels a file's upload. */
  cancel: 'Cancel uploading {name}',
  /** `variant="photo"`: visible text of the Cancel button while the photo uploads. */
  cancelShort: 'Cancel',
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
 * Empty, it is one compact row (72px: an icon, "Drag files here or Browse" and the `hint` in 12px), with hover,
 * drag-over, focus, pressed and disabled states (owner standard, 1.6; it was a 160px box). Upload the chosen files
 * yourself: report progress with `setProgress(file, percent)` (a bar and a Cancel button on that file's tile; Cancel
 * fires `cm-cancel`) and a failed file with `setFileError(file, message)`.
 *
 * `variant="photo"` (since 1.3) is the phone capture pattern: one tile with a camera icon and the label; once a photo
 * is taken or chosen, the tile shows it with Retake and Remove buttons. Add `capture="environment"` to open the
 * back camera directly on phones.
 * @element cm-file-upload
 * @fires change - When files are added or removed. Read `files`.
 * @fires cm-reject - When chosen files are refused for type or size. `detail.files` lists them.
 * @fires cm-cancel - When the merchant cancels a file's upload, with `detail: { file }`: stop the upload. The file is then removed; `preventDefault()` keeps it. Since 1.6.
 * @csspart zone - The drop zone (the compact row, the "Add more" tile, or the empty photo tile).
 * @csspart files - The list of chosen files.
 * @csspart progress - A file's progress bar while it uploads.
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
    _progress: { state: true },
    _fileErrors: { state: true },
    _over: { state: true },
  };

  /** Heading above the zone, e.g. "Add product images". */
  label = '';
  /**
   * Accepted types and size in 12px grey, e.g. "PNG or JPG, up to 2 MB". Shown in the empty zone's row (since 1.6),
   * next to the label once files are chosen, and under the label in the photo tile.
   */
  hint = '';
  /**
   * Text inside the zone; `{browse}` in it becomes the link-like "Browse". Default: the built-in string `prompt`
   * ("Drag files here or {browse}"; "Click here to upload" before 1.6).
   */
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
   * it is 4:3 (change it with `::part(photo)`, e.g. `aspect-ratio: 16 / 10` for a visiting card). Empty, the tile is
   * at most 120px tall (since 1.6; 4:3 when it is narrower than 160px).
   */
  variant?: 'photo';
  /**
   * Asks phones to open the camera instead of the file chooser, as `capture` on a native input (since 1.3):
   * `environment` for the back camera (a shop front, a document), `user` for the front camera (a selfie).
   * Desktop browsers ignore it and show the file chooser.
   */
  capture?: 'environment' | 'user';

  _rejected = '';
  _progress = new Map<File, number>();
  _fileErrors = new Map<File, string>();
  _over = false;

  #internals = this.attachInternals();
  #v = new FieldValidity(this, this.#internals);
  #id = nextId('cm-fu');
  #urls = new Map<File, string>();

  static styles = [
    base,
    css`
      :host { display: block; }
      .head { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: var(--cm-space-8); margin-bottom: var(--cm-space-12); }
      .label { font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600; }
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
      .hint { font-size: 12px; color: var(--cm-text-tertiary); }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 140px)); gap: var(--cm-space-16); }
      .zone {
        position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--cm-space-8);
        padding: var(--cm-space-12); text-align: center; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); color: var(--cm-text-default);
        background: var(--cm-bg-surface); border: var(--cm-border-1) dashed var(--cm-border-input); border-radius: var(--cm-radius-md); cursor: pointer;
        transition: background-color var(--cm-duration-fast) var(--cm-easing-standard), border-color var(--cm-duration-fast) var(--cm-easing-standard);
      }
      /* The empty zone (1.6): one compact row, 72px tall. */
      .zone.row { flex-direction: row; justify-content: flex-start; gap: var(--cm-space-12); min-height: 72px; padding: var(--cm-space-12) var(--cm-space-16); text-align: start; }
      .ico {
        flex: none; display: inline-flex; align-items: center; justify-content: center; width: 40px; height: 40px;
        border-radius: var(--cm-radius-md); background: var(--cm-bg-inset); color: var(--cm-icon-selected);
      }
      .words { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
      .browse { font-weight: 500; text-decoration: underline; text-underline-offset: 2px; }
      .zone .hint { overflow-wrap: anywhere; }
      .zone:hover { background: var(--cm-bg-hover); border-color: var(--cm-border-strong); }
      .zone:active { background: color-mix(in srgb, var(--cm-bg-hover), var(--cm-text-default) 8%); }
      :host([data-over]) .zone { background: var(--cm-bg-hover); border-color: var(--cm-border-strong); border-style: solid; box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
      .zone.tile { min-height: 0; aspect-ratio: 1; font-size: 14px; }
      .zone input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; cursor: inherit; font-size: 0; }
      .zone:focus-within { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .zone.invalid { border-color: var(--cm-border-critical); }
      .item { display: flex; flex-direction: column; gap: var(--cm-space-4); min-width: 0; }
      .ferr { margin: 0; font-size: var(--cm-type-body-xs-size); line-height: var(--cm-type-body-xs-line-height); color: var(--cm-text-critical); overflow-wrap: anywhere; }
      .file.invalid { border-color: var(--cm-border-critical); }
      .file.busy img { opacity: 0.6; } /* text stays full strength (contrast) */
      .bar {
        position: absolute; inset-inline: var(--cm-space-8); inset-block-end: var(--cm-space-8); height: 4px; overflow: hidden;
        border-radius: var(--cm-radius-full); background: var(--cm-bg-inset); box-shadow: 0 0 0 1px var(--cm-bg-surface);
      }
      .bar span { display: block; height: 100%; background: var(--cm-action-primary); border-radius: inherit; transition: inline-size var(--cm-duration-base) var(--cm-easing-standard); }
      .file {
        position: relative; aspect-ratio: 1; border-radius: var(--cm-radius-md); background: var(--cm-bg-inset);
        border: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      .file img { width: 100%; height: 100%; object-fit: cover; border-radius: inherit; display: block; }
      .doc { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--cm-space-4); height: 100%; padding: var(--cm-space-8); text-align: center; }
      .doc .name { font-size: 12px; word-break: break-all; }
      .doc .size, .tile .size { font-size: 12px; color: var(--cm-text-tertiary); }
      .remove {
        position: absolute; top: -10px; inset-inline-end: -10px; display: inline-flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; padding: 0; border-radius: var(--cm-radius-full); cursor: pointer;
        background: var(--cm-bg-surface); color: var(--cm-icon-selected); border: var(--cm-border-1) solid var(--cm-border-input);
      }
      .remove:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .msg { margin: var(--cm-space-8) 0 0; font-size: 12px; color: var(--cm-text-critical); }
      :host([disabled]) .zone { cursor: not-allowed; background: var(--cm-bg-input-filled); color: var(--cm-text-secondary); border-color: var(--cm-border-subtle); }
      :host([disabled]) .remove { display: none; }
      /* variant="photo" (1.3) */
      /* Empty, the tile is 4:3 up to 120px tall (1.6): a 160px-wide tile, or a full-width strip in a wider column. */
      .zone.photo { min-height: 0; aspect-ratio: 4 / 3; max-height: 120px; gap: var(--cm-space-4); font-size: 14px; }
      .zone.photo .hint { font-size: 12px; }
      .shot { position: relative; }
      .shot.busy img { opacity: 0.6; }
      .zone.photo.invalid { border-color: var(--cm-border-critical); }
      .photo-label { font-weight: 500; overflow-wrap: anywhere; }
      .shot {
        aspect-ratio: 4 / 3; border-radius: var(--cm-radius-md); overflow: hidden;
        background: var(--cm-bg-inset); border: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      .shot img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .caption { margin: var(--cm-space-8) 0 0; font-size: 14px; font-weight: 500; overflow-wrap: anywhere; }
      .caption:empty { display: none; }
      .actions { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); margin-top: var(--cm-space-8); }
      .action {
        display: inline-flex; align-items: center; justify-content: center; gap: var(--cm-space-8); flex: 1 1 0; min-width: max-content;
        min-height: var(--cm-control-height-md); padding: 0 var(--cm-space-12); font: inherit; font-size: var(--cm-font-size-14); font-weight: 500; cursor: pointer;
        background: var(--cm-bg-hover); color: var(--cm-text-default);
        border: var(--cm-border-1) solid var(--cm-border-strong); border-radius: var(--cm-radius-sm);
      }
      .action:hover { background: var(--cm-bg-surface); }
      .action:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      @media (pointer: coarse) { .action { min-height: var(--cm-control-height-touch); } }
      @media (prefers-reduced-motion: reduce) { .zone, .bar span { transition: none; } }
      @media (max-width: 640px) {
        .label { font-size: var(--cm-type-heading-sm-resp-size); }
      }
    `,
  ];

  get #photo() { return this.variant === 'photo'; }
  // oxlint-disable-next-line unicorn/no-accessor-recursion -- reads the public `accept` property, not this private `#accept` getter
  get #accept() { return this.accept || (this.#photo ? 'image/*' : ''); }
  // oxlint-disable-next-line unicorn/no-accessor-recursion -- reads the public `multiple` property, not this private `#multiple` getter
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
  reportValidity() { return this.#v.report(() => this.#internals.reportValidity()); }
  formResetCallback() { this.#v.reset(); this.files = []; this._rejected = ''; this._progress = new Map(); this._fileErrors = new Map(); }
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
    this.#v.sync();
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

  /**
   * Shows a chosen file uploading (since 1.6): a progress bar from 0 to 100 on its tile, with a Cancel button in place
   * of Remove. `null` ends it (the upload finished, or failed: then call `setFileError`).
   */
  setProgress(file: File, percent: number | null) {
    const next = new Map(this._progress);
    if (percent === null || percent === undefined) next.delete(file);
    else next.set(file, Math.min(100, Math.max(0, Number(percent) || 0)));
    this._progress = next;
  }

  /** Marks one chosen file as failed (since 1.6): its tile turns red with `message` under it. `''` clears it. */
  setFileError(file: File, message: string) {
    const next = new Map(this._fileErrors);
    if (message) next.set(file, message); else next.delete(file);
    this._fileErrors = next;
  }

  /** Whether a file is uploading (`setProgress`). */
  #busy(f: File) { return this._progress.has(f); }

  #cancel(f: File) {
    const ok = this.dispatchEvent(new CustomEvent('cm-cancel', { detail: { file: f }, bubbles: true, composed: true, cancelable: true }));
    this.setProgress(f, null);
    if (ok) this.removeFile(f);
  }

  /** Removes one chosen file and fires `change`. */
  removeFile(file: File) {
    if (!this.files.includes(file)) return;
    this.files = this.files.filter((f) => f !== file);
    this._rejected = '';
    if (this._progress.has(file)) this.setProgress(file, null);
    if (this._fileErrors.has(file)) this.setFileError(file, '');
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    this.updateComplete.then(() => this.renderRoot.querySelector('input')?.focus());
  }

  #onInputChange(e: Event) {
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    this.addFiles(input.files ?? []);
    input.value = '';
  }

  #setOver(on: boolean) { this.toggleAttribute('data-over', on); this._over = on; }

  /** The prompt, with `{browse}` drawn as a link-like word. */
  #prompt() {
    if (this._over) return this.t('drop');
    const [before, after] = this.prompt.split('{browse}');
    return after === undefined ? before : html`${before}<span class="browse">${this.t('browse')}</span>${after}`;
  }

  /** A file's tile: thumbnail or name and size, progress while uploading, and Remove or Cancel. */
  #file(f: File) {
    const busy = this.#busy(f), err = this._fileErrors.get(f) ?? '';
    const errId = `${this.#id}-e${this.files.indexOf(f)}`;
    const pct = this._progress.get(f) ?? 0;
    return html`<li class="item"><div class="file ${busy ? 'busy' : ''} ${err ? 'invalid' : ''}">
        ${f.type.startsWith('image/')
          ? html`<img src=${this.#url(f)} alt=${f.name} />`
          : html`<div class="doc"><cm-icon name="book" size="24"></cm-icon><span class="name">${f.name}</span><span class="size">${this.#size(f.size)}</span></div>`}
        ${busy ? html`<div class="bar" part="progress" role="progressbar" aria-label=${this.t('uploading', { name: f.name })}
            aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(pct)}><span style="inline-size:${pct}%"></span></div>` : nothing}
        ${this.disabled ? nothing : busy
          ? html`<button type="button" class="remove" aria-label=${this.t('cancel', { name: f.name })} @click=${() => this.#cancel(f)}><cm-icon name="close" size="12"></cm-icon></button>`
          : html`<button type="button" class="remove" aria-label=${this.t('remove', { name: f.name })} aria-describedby=${err ? errId : nothing}
              @click=${() => this.removeFile(f)}><cm-icon name="close" size="12"></cm-icon></button>`}
      </div>${err ? html`<p class="ferr" id=${errId} role="alert">${err}</p>` : nothing}</li>`;
  }

  #zone(tile: boolean) {
    const msg = this.error || this._rejected || this.#v.message;
    const described = [this.hint && `${this.#id}-hint`, msg && `${this.#id}-msg`].filter(Boolean).join(' ');
    return html`<label class="zone ${tile ? 'tile' : 'row'} ${msg && !tile ? 'invalid' : ''}" part="zone"
        @dragenter=${() => this.#setOver(true)} @dragleave=${() => this.#setOver(false)} @drop=${() => this.#setOver(false)}>
      <input type="file" id=${this.#id} accept=${this.accept || nothing} capture=${this.capture || nothing} ?multiple=${this.multiple} ?disabled=${this.disabled}
        ?required=${this.required && !this.files.length}
        aria-labelledby=${[this.label && `${this.#id}-l`, `${this.#id}-p`].filter(Boolean).join(' ')}
        aria-describedby=${described || nothing} aria-invalid=${msg ? 'true' : nothing}
        @change=${this.#onInputChange} @cancel=${(e: Event) => e.stopPropagation()} />
      ${tile
        ? html`<cm-icon name="plus" size="24"></cm-icon><span id="${this.#id}-p">${this.t('addMore')}</span>`
        : html`<span class="ico"><cm-icon name="upload" size="20"></cm-icon></span>
          <span class="words"><span id="${this.#id}-p">${this.#prompt()}</span>${this.hint
            ? html`<span class="hint" id="${this.#id}-hint">${this.hint}</span>` : nothing}</span>`}
    </label>`;
  }

  /** Opens the camera or file chooser again to replace the photo. */
  #retake() { this.renderRoot.querySelector<HTMLInputElement>('input[type=file]')?.click(); }

  #renderPhoto() {
    const f = this.files[0];
    const msg = this.error || this._rejected || (f && this._fileErrors.get(f)) || this.#v.message;
    const busy = !!f && this.#busy(f);
    const name = this.label || this.t('photo');
    const described = [this.hint && `${this.#id}-hint`, msg && `${this.#id}-msg`].filter(Boolean).join(' ');
    const input = (hidden: boolean) => html`<input type="file" id=${this.#id} accept=${this.#accept} capture=${this.capture || nothing}
      ?disabled=${this.disabled} ?required=${this.required && !f} tabindex=${hidden ? '-1' : nothing} aria-hidden=${hidden ? 'true' : nothing}
      ?hidden=${hidden} aria-labelledby=${hidden ? nothing : `${this.#id}-p`} aria-describedby=${(!hidden && described) || nothing} aria-invalid=${msg ? 'true' : nothing}
      @change=${this.#onInputChange} @cancel=${(e: Event) => e.stopPropagation()} />`;
    const hint = this.hint ? html`<span class="hint" id="${this.#id}-hint">${this.hint}</span>` : nothing;
    return html`
      ${f
        ? html`<div class="shot ${busy ? 'busy' : ''}" part="photo">
              ${f.type.startsWith('image/')
                ? html`<img src=${this.#url(f)} alt=${name} />`
                : html`<div class="doc"><cm-icon name="book" size="24"></cm-icon><span class="name">${f.name}</span><span class="size">${this.#size(f.size)}</span></div>`}
              ${busy ? html`<div class="bar" part="progress" role="progressbar" aria-label=${this.t('uploading', { name: f.name })}
                  aria-valuemin="0" aria-valuemax="100" aria-valuenow=${Math.round(this._progress.get(f) ?? 0)}><span style="inline-size:${this._progress.get(f) ?? 0}%"></span></div>` : nothing}
            </div>
            <p class="caption" aria-hidden="true">${this.label}</p>
            ${input(true)}
            ${this.disabled ? nothing : busy ? html`<div class="actions" part="actions">
              <button type="button" class="action" aria-label=${this.t('cancel', { name })} @click=${() => this.#cancel(f)}><cm-icon name="close" size="16"></cm-icon>${this.t('cancelShort')}</button>
            </div>` : html`<div class="actions" part="actions">
              <button type="button" class="action retake" aria-label=${this.t('retakeName', { name })} aria-describedby=${msg ? `${this.#id}-msg` : nothing} @click=${this.#retake}><cm-icon name="camera" size="16"></cm-icon>${this.t('retake')}</button>
              <button type="button" class="action" aria-label=${this.t('removeName', { name })} @click=${() => this.removeFile(f)}><cm-icon name="trash" size="16"></cm-icon>${this.t('removePhoto')}</button>
            </div>`}`
        : html`<label class="zone photo ${msg ? 'invalid' : ''}" part="zone photo"
              @dragenter=${() => this.#setOver(true)} @dragleave=${() => this.#setOver(false)} @drop=${() => this.#setOver(false)}>
            ${input(false)}
            <cm-icon name="camera" size="24"></cm-icon>
            <span class="photo-label" id="${this.#id}-p" part="label">${this.label || this.t('takePhoto')}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>
            ${hint}
          </label>`}
      ${msg ? html`<p class="msg" id="${this.#id}-msg" role="alert">${msg}</p>` : nothing}
    `;
  }

  render() {
    if (this.#photo) return this.#renderPhoto();
    const msg = this.error || this._rejected || this.#v.message;
    const showZone = !this.files.length || this.multiple;
    const tile = this.files.length > 0;
    return html`
      ${this.label || (this.hint && tile)
        ? html`<div class="head">
            ${this.label ? html`<span class="label" id="${this.#id}-l" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>` : nothing}
            ${this.hint && tile ? html`<span class="hint" id="${this.#id}-hint">${this.hint}</span>` : nothing}
          </div>`
        : nothing}
      ${tile
        ? html`<ul class="grid" part="files" role="list" style="list-style:none;margin:0;padding:0" aria-label=${this.t('files')}>
            ${this.files.map((f) => this.#file(f))}
            ${showZone ? html`<li>${this.#zone(true)}</li>` : nothing}
          </ul>`
        : this.#zone(false)}
      ${msg ? html`<p class="msg" id="${this.#id}-msg" role="alert">${msg}</p>` : nothing}
    `;
  }
}
define('cm-file-upload', CmFileUpload);

declare global { interface HTMLElementTagNameMap { 'cm-file-upload': CmFileUpload } }
