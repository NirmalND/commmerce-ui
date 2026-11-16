import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { popoverStyles, groupStyles, sortByGroup, groupRuns, closeOnOutsidePointer } from '../popover.js';
import type { SelectOption } from './select.js';
import './icon.js';
import './tag.js';
import './spinner.js';

const strings = defineStrings('combobox', {
  /** Shown in the open list when nothing matches. */
  noResults: 'No results',
  /** Announced as the list changes. */
  results: { one: '{count} result', other: '{count} results' },
  /** The row that adds what was typed (`allow-custom`). */
  add: 'Add “{value}”',
  /** Accessible name of a tag's remove button (`multiple`). */
  remove: 'Remove {label}',
  /** Validation: `required` and nothing chosen. */
  required: 'Please select an item in the list.',
  /** Validation: `required`, `multiple` and nothing chosen. */
  requiredMultiple: 'Choose at least one item.',
  /** The chosen option in the box or its tag with `show-group`: "Lead: Company". */
  grouped: '{group}: {label}',
});
declare module '../localize.js' { interface CmStrings { combobox: typeof strings } }

/**
 * Editable combobox: a text box that suggests matching options as the merchant types (the WAI-ARIA APG
 * "combobox with list autocomplete" pattern). Picks one option, or several with `multiple` (shown as removable
 * tags). With `filter="none"` it doesn't filter by itself: listen for `cm-search`, fetch matches, set `options`
 * and toggle `loading`. With `allow-custom` the merchant can add a value that isn't in the list (a new product tag).
 *
 * Options come from `<option>` children or the `options` property, as for `cm-select`, and can be grouped under
 * headings with `<optgroup label="…">` or a `group` on each option (since 1.3). Filtering keeps the heading of
 * every group that still has a match.
 * @element cm-combobox
 * @slot - `<option value="…">Label</option>` elements, optionally inside `<optgroup label="…">`. `disabled` (also on an optgroup) and `selected` are honoured.
 * @fires change - When the value changes (an option picked or removed, or a custom value added).
 * @fires input - Same moment as `change`.
 * @fires cm-search - As the merchant types, with `detail: { query }`. Use it to load matches from the server.
 * @fires cm-create - Before a custom value is added (`allow-custom`), with `detail: { value }`. Cancelable: call `preventDefault()` to refuse it.
 * @csspart box - The bordered box around the tags and the text input.
 * @csspart input - The text input.
 * @csspart listbox - The list of suggestions.
 */
export class CmCombobox extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: {},
    values: { type: Array },
    placeholder: {},
    options: { type: Array },
    multiple: { type: Boolean, reflect: true },
    allowCustom: { type: Boolean, attribute: 'allow-custom' },
    filter: {},
    loading: { type: Boolean, reflect: true },
    emptyText: { attribute: 'empty-text', string: 'noResults' },
    loadingText: { attribute: 'loading-text', string: 'loading' },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    showGroup: { type: Boolean, attribute: 'show-group' },
    _query: { state: true },
    _active: { state: true },
    _slotted: { state: true },
    _typing: { state: true },
  };

  /** Visible label above the box. Required for accessibility unless the element has an aria-label. */
  label = '';
  /** One sentence under the box in text-tertiary. */
  helpText = '';
  /** Error message; turns the border critical and sets aria-invalid. */
  error = '';
  /** Form field name. With `multiple`, each value is submitted as its own entry under this name. */
  name = '';
  /** Value of the chosen option (single mode). Empty when nothing is chosen. */
  value = '';
  /** Values of the chosen options (`multiple` mode), in the order they were added. */
  values: string[] = [];
  /** Shown in the empty text box, e.g. "Search tags". */
  placeholder = '';
  /** Options as strings or `{ value, label, disabled, group }`. Used instead of `<option>` children when set. */
  options: Array<string | SelectOption> = [];
  /** Lets the merchant choose several options, shown as removable tags. Backspace in the empty box removes the last one. */
  multiple = false;
  /** Lets the merchant add what they typed when it isn't an option ("Add “summer”"). Fires a cancelable `cm-create`. */
  allowCustom = false;
  /** How typing narrows the list: `contains` (default), `starts-with`, or `none` when you filter on the server from `cm-search`. */
  filter: 'contains' | 'starts-with' | 'none' = 'contains';
  /** Shows a spinner in the list while you load options. */
  loading = false;
  /** Shown in the list when nothing matches. Default: the built-in string `noResults` ("No results"). */
  emptyText!: string;
  /** Announced and shown while `loading`. Default: the built-in string `loading` ("Loading", shared with other components). */
  loadingText!: string;
  /** The form will not submit until something is chosen. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Whether the list is showing. */
  open = false;
  /**
   * Shows the chosen option's group before its label in the box, or in its tag with `multiple` ("Lead: Company"),
   * for grouped lists where labels repeat across groups. The list itself shows the bare label under its heading. Since 1.3.
   */
  showGroup = false;

  _query = '';
  _active = -1;
  _slotted: SelectOption[] = [];
  /** True while the text box holds the merchant's own query rather than the chosen option's label. */
  _typing = false;

  #internals = this.attachInternals();
  #id = nextId('cm-cb');
  #default: { value: string; values: string[] } | null = null;
  /** Labels for chosen values, so tags keep their text when async options change. */
  #labels = new Map<string, string>();
  /** Groups of chosen values, for the same reason (`show-group`). */
  #groups = new Map<string, string>();
  #observer = new MutationObserver(() => this.#readChildren());
  #stopOutside?: () => void;

  static styles = [
    base,
    popoverStyles,
    groupStyles,
    css`
      :host { display: block; position: relative; }
      .field { display: flex; flex-direction: column; gap: var(--cm-space-10); }
      .label { font-size: var(--cm-type-label-size); color: var(--cm-text-default); }
      .req { color: var(--cm-text-critical); margin-inline-start: 2px; }
      .wrap { position: relative; }
      .box {
        display: flex; flex-wrap: wrap; align-items: center; gap: 6px; width: 100%; min-height: 42px; padding: 7px var(--cm-space-10);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm); cursor: text;
      }
      .box:focus-within { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .tags { display: contents; }
      input {
        flex: 1 1 80px; min-width: 80px; height: 26px; padding: 0; border: 0; outline: none; background: none;
        font: inherit; font-size: 16px; color: var(--cm-text-default);
      }
      input::placeholder { color: var(--cm-text-tertiary); }
      .chev { flex: none; margin-inline-start: auto; color: var(--cm-icon-selected); transition: transform .15s; }
      :host([open]) .chev { transform: rotate(180deg); }
      :host([error]:not([error=''])) .box { border-color: var(--cm-border-critical); }
      :host([disabled]) .box { background: var(--cm-bg-input-filled); border-color: var(--cm-border-default); cursor: not-allowed; }
      :host([disabled]) input { color: var(--cm-text-secondary); cursor: not-allowed; }
      [role='listbox'] { max-height: 242px; overflow-y: auto; margin: 0; padding: var(--cm-space-10) 0; list-style: none; }
      [role='listbox'][hidden] { display: none; }
      [role='option'] {
        display: flex; align-items: center; gap: var(--cm-space-10); min-height: 40px; padding: 6px var(--cm-space-20);
        font-size: 16px; color: var(--cm-text-default); cursor: pointer;
      }
      [role='option'] .check { flex: none; visibility: hidden; }
      [role='option'][aria-selected='true'] .check { visibility: visible; }
      [role='option'].active { background: var(--cm-bg-hover); box-shadow: inset 2px 0 0 var(--cm-border-strong); }
      [role='option'].active:dir(rtl) { box-shadow: inset -2px 0 0 var(--cm-border-strong); }
      :host(:not([multiple])) [role='option'][aria-selected='true'] { background: var(--cm-action-primary); color: var(--cm-action-primary-text); }
      :host(:not([multiple])) [role='option'][aria-selected='true'].active { background: var(--cm-action-primary-hover); }
      [role='option'][aria-disabled='true'] { color: var(--cm-text-secondary); cursor: not-allowed; }
      [role='option'] mark { background: none; color: inherit; font-weight: 600; }
      .create { font-style: normal; }
      .help, .error { margin: 0; font-size: 12px; color: var(--cm-text-tertiary); }
      .error { color: var(--cm-text-critical); }
      slot { display: none; }
      @media (max-width: 640px) { [role='option'] { font-size: 14px; min-height: 30px; padding-inline: var(--cm-space-15); } }
      @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#readChildren();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'label', 'disabled', 'selected'] });
    this.#stopOutside = closeOnOutsidePointer(this, () => this.open, () => this.#hide());
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
    this.#stopOutside?.();
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#internals.reportValidity(); }
  formResetCallback() {
    const d = this.#default ?? { value: '', values: [] };
    this.value = d.value; this.values = [...d.values];
    this._query = ''; this._typing = false; this.open = false;
  }
  formDisabledCallback(d: boolean) { this.disabled = d; if (d) this.open = false; }
  formStateRestoreCallback(state: string | FormData) {
    if (typeof state === 'string') { if (this.multiple) this.values = state ? state.split('\n') : []; else this.value = state; }
  }

  /** All options in use, normalised (before filtering), in the order shown (options of a group together). */
  get items(): SelectOption[] {
    if (!this.options?.length) return sortByGroup(this._slotted);
    return sortByGroup(this.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));
  }

  /** The options shown for the current query. */
  get filteredItems(): SelectOption[] {
    const q = this._typing ? this._query.trim().toLowerCase() : '';
    if (!q || this.filter === 'none') return this.items;
    return this.items.filter((o) => {
      const l = o.label.toLowerCase();
      return this.filter === 'starts-with' ? l.startsWith(q) : l.includes(q);
    });
  }

  #readChildren() {
    const opts = [...this.querySelectorAll('option')];
    this._slotted = opts.map((o) => {
      const g = o.parentElement?.localName === 'optgroup' ? (o.parentElement as HTMLOptGroupElement) : null;
      const opt: SelectOption = { value: o.value, label: o.label || o.textContent!.trim(), disabled: o.disabled || !!g?.disabled };
      if (g?.label) opt.group = g.label;
      return opt;
    });
    if (!this.hasUpdated) {
      const sel = opts.filter((o) => o.hasAttribute('selected')).map((o) => o.value);
      if (this.multiple && !this.values.length && sel.length) this.values = sel;
      if (!this.multiple && !this.value && sel.length) this.value = sel[0];
    }
  }

  #labelOf(v: string) {
    return this.items.find((o) => o.value === v)?.label ?? this.#labels.get(v) ?? v;
  }

  /** The chosen value as shown in the box or its tag: the label, or "Group: label" with `show-group`. */
  #displayOf(v: string) {
    const label = this.#labelOf(v);
    if (!this.showGroup) return label;
    const group = this.items.find((o) => o.value === v)?.group ?? this.#groups.get(v);
    return group ? this.t('grouped', { group, label }) : label;
  }

  /** Whether the "Add …" row is offered for the current query. */
  get #createText(): string {
    if (!this.allowCustom || !this._typing) return '';
    const q = this._query.trim();
    if (!q) return '';
    const lq = q.toLowerCase();
    if (this.items.some((o) => o.label.toLowerCase() === lq || o.value.toLowerCase() === lq)) return '';
    if (this.multiple ? this.values.some((v) => v.toLowerCase() === lq) : this.value.toLowerCase() === lq) return '';
    return q;
  }

  /** Rows in the list: the matching options, then the "Add …" row if offered. */
  #rows(): Array<SelectOption & { create?: boolean }> {
    const rows: Array<SelectOption & { create?: boolean }> = this.loading ? [] : [...this.filteredItems];
    const c = this.#createText;
    if (c && !this.loading) rows.push({ value: c, label: c, create: true });
    return rows;
  }

  firstUpdated() {
    this.#default = { value: this.value, values: [...this.values] };
  }

  willUpdate(changed: PropertyValues) {
    for (const o of this.items) { this.#labels.set(o.value, o.label); if (o.group) this.#groups.set(o.value, o.group); }
    if ((changed.has('value') || changed.has('options') || changed.has('_slotted') || changed.has('showGroup')) && !this.multiple && !this._typing) {
      this._query = this.value ? this.#displayOf(this.value) : '';
    }
    if (changed.has('_query') || changed.has('options') || changed.has('_slotted') || changed.has('loading')) {
      const rows = this.#rows();
      if (this._active >= rows.length) this._active = -1;
    }
  }

  updated(changed: PropertyValues) {
    const input = this.renderRoot.querySelector<HTMLInputElement>('input') ?? undefined;
    if (this.multiple) {
      if (this.name && this.values.length) {
        const fd = new FormData();
        for (const v of this.values) fd.append(this.name, v);
        this.#internals.setFormValue(fd, this.values.join('\n'));
      } else this.#internals.setFormValue(null);
    } else this.#internals.setFormValue(this.value || null, this.value);
    const empty = this.multiple ? !this.values.length : !this.value;
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, input);
    else if (this.required && empty) this.#internals.setValidity({ valueMissing: true }, this.t(this.multiple ? 'requiredMultiple' : 'required'), input);
    else this.#internals.setValidity({});
    if ((changed.has('_active') || changed.has('open')) && this.open && this._active >= 0) {
      this.renderRoot.querySelector(`#${this.#id}-o${this._active}`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  #emit() {
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #show() { if (!this.disabled) this.open = true; }
  #hide() { this.open = false; this._active = -1; }

  #enabled(rows = this.#rows()) { return rows.flatMap((o, i) => (o.disabled ? [] : [i])); }

  #move(step: number | 'first' | 'last') {
    const en = this.#enabled();
    if (!en.length) { this._active = -1; return; }
    if (step === 'first') return void (this._active = en[0]);
    if (step === 'last') return void (this._active = en[en.length - 1]);
    const pos = en.indexOf(this._active);
    if (pos < 0) { this._active = step > 0 ? en[0] : en[en.length - 1]; return; }
    this._active = en[(pos + step + en.length) % en.length];
  }

  #choose(i: number) {
    const row = this.#rows()[i];
    if (!row || row.disabled) return;
    if (row.create) { this.#create(row.value); return; }
    if (this.multiple) {
      this.values = this.values.includes(row.value) ? this.values.filter((v) => v !== row.value) : [...this.values, row.value];
      this._query = ''; this._typing = false; this._active = -1;
      this.#emit();
      this.#focusInput();
      return;
    }
    this.#hide();
    this._typing = false;
    this._query = this.showGroup && row.group ? this.t('grouped', { group: row.group, label: row.label }) : row.label;
    if (row.value !== this.value) { this.value = row.value; this.#emit(); }
  }

  #create(text: string) {
    const ok = this.dispatchEvent(new CustomEvent('cm-create', { detail: { value: text }, bubbles: true, composed: true, cancelable: true }));
    if (!ok) return;
    this.#labels.set(text, text);
    if (this.multiple) {
      this.values = [...this.values, text];
      this._query = ''; this._typing = false; this._active = -1;
    } else {
      this.#hide();
      this.value = text; this._typing = false; this._query = text;
    }
    this.#emit();
  }

  /** Removes a chosen value (`multiple`). */
  removeValue(value: string) {
    if (!this.values.includes(value)) return;
    this.values = this.values.filter((v) => v !== value);
    this.#emit();
  }

  #focusInput() { this.renderRoot.querySelector<HTMLInputElement>('input')?.focus(); }

  #onInput = (e: Event) => {
    e.stopPropagation(); // the native per-keystroke input event; `input` is fired when the value changes
    this._query = (e.target as HTMLInputElement).value;
    this._typing = true;
    this._active = -1;
    this.#show();
    this.dispatchEvent(new CustomEvent('cm-search', { detail: { query: this._query }, bubbles: true, composed: true }));
  };

  #onKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    const k = e.key;
    switch (k) {
      case 'ArrowDown':
        e.preventDefault();
        if (!this.open) { this.#show(); if (!e.altKey) this.#move('first'); }
        else this.#move(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (!this.open) { this.#show(); this.#move('last'); }
        else this.#move(-1);
        break;
      case 'Enter':
        if (this.open && this._active >= 0) { e.preventDefault(); this.#choose(this._active); }
        else if (this.#createText) { e.preventDefault(); this.#create(this.#createText); }
        break;
      case 'Escape':
        if (this.open) { e.preventDefault(); e.stopPropagation(); this.#hide(); }
        else if (this._query) {
          e.preventDefault();
          this._query = ''; this._typing = true;
          if (!this.multiple && this.value) { this.value = ''; this.#emit(); }
        }
        break;
      case 'Backspace':
        if (this.multiple && !this._query && this.values.length) {
          e.preventDefault();
          this.removeValue(this.values[this.values.length - 1]);
        }
        break;
      case 'Tab':
        this.#hide();
        break;
      default:
    }
  };

  #onBlur = () => {
    // Leaving the box: put back the chosen option's label (single), or clear an unfinished query (multiple).
    queueMicrotask(() => {
      if (this.shadowRoot?.activeElement === this.renderRoot.querySelector('input')) return;
      this.#hide();
      if (!this._typing) return;
      this._typing = false;
      this._query = this.multiple ? '' : this.value ? this.#displayOf(this.value) : '';
    });
  };

  #highlight(label: string) {
    const q = this._typing ? this._query.trim() : '';
    if (!q || this.filter === 'none') return label;
    const i = label.toLowerCase().indexOf(q.toLowerCase());
    if (i < 0 || (this.filter === 'starts-with' && i !== 0)) return label;
    return html`${label.slice(0, i)}<mark>${label.slice(i, i + q.length)}</mark>${label.slice(i + q.length)}`;
  }

  render() {
    const rows = this.#rows();
    const described = [this.error && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ');
    const hostLabel = this.getAttribute('aria-label');
    const selected = (v: string) => (this.multiple ? this.values.includes(v) : v === this.value);
    const option = (o: SelectOption & { create?: boolean }, i: number) => html`<li role="option" id="${this.#id}-o${i}" class=${i === this._active ? 'active' : ''}
        aria-selected=${o.create ? 'false' : selected(o.value) ? 'true' : 'false'} aria-disabled=${o.disabled ? 'true' : nothing}
        @pointerenter=${() => !o.disabled && (this._active = i)} @click=${() => this.#choose(i)}>
        ${o.create
          ? html`<cm-icon name="plus" size="16"></cm-icon><span class="create">${this.t('add', { value: o.label })}</span>`
          : html`${this.multiple ? html`<cm-icon class="check" name="check" size="16"></cm-icon>` : nothing}<span>${this.#highlight(o.label)}</span>`}</li>`;
    const status = this.loading ? this.loadingText || this.t('loading')
      : !this.open ? ''
      : rows.length ? this.t('results', { count: rows.length })
      : this.emptyText || this.t('noResults');
    return html`<div class="field">
      ${this.label
        ? html`<label class="label" id="${this.#id}-l" for="${this.#id}-in" part="label">${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</label>`
        : nothing}
      <div class="wrap">
        <div class="box" part="box" @click=${(e: Event) => { if (!(e.target as HTMLElement).closest('cm-tag')) this.#focusInput(); }}>
          ${this.multiple ? this.values.map((v) => html`<cm-tag removable ?disabled=${this.disabled} remove-label=${this.t('remove', { label: this.#displayOf(v) })}
              @cm-remove=${() => { this.removeValue(v); this.#focusInput(); }}>${this.#displayOf(v)}</cm-tag>`) : nothing}
          <input id="${this.#id}-in" part="input" type="text" role="combobox" autocomplete="off" spellcheck="false"
            .value=${live(this._query)} placeholder=${this.multiple && this.values.length ? nothing : this.placeholder || nothing}
            aria-label=${!this.label && hostLabel ? hostLabel : nothing}
            aria-autocomplete="list" aria-expanded=${this.open ? 'true' : 'false'} aria-controls="${this.#id}-list"
            aria-activedescendant=${this.open && this._active >= 0 ? `${this.#id}-o${this._active}` : nothing}
            aria-invalid=${this.error ? 'true' : nothing} aria-describedby=${described || nothing}
            aria-required=${this.required ? 'true' : nothing} ?disabled=${this.disabled}
            @input=${this.#onInput} @keydown=${this.#onKeyDown} @blur=${this.#onBlur}
            @click=${() => { if (!this.open) this.#show(); }} @change=${(e: Event) => e.stopPropagation()} />
          <cm-icon class="chev" name="chevron-down" size="16" @click=${() => { if (this.open) this.#hide(); else { this.#show(); this.#focusInput(); } }}></cm-icon>
        </div>
        <div class="pop" part="popover" ?hidden=${!this.open} @pointerdown=${(e: Event) => e.preventDefault()}>
          <ul role="listbox" id="${this.#id}-list" part="listbox" ?hidden=${!rows.length}
            aria-labelledby=${this.label ? `${this.#id}-l` : nothing} aria-label=${!this.label && hostLabel ? hostLabel : nothing}
            aria-multiselectable=${this.multiple ? 'true' : nothing}>
            ${groupRuns(rows).map((run, gi) => run.group
              ? html`<li role="group" aria-labelledby="${this.#id}-g${gi}"><div role="presentation" class="gh" id="${this.#id}-g${gi}">${run.group}</div>
                  <ul role="none" class="gopts">${run.rows.map(({ row, index }) => option(row, index))}</ul></li>`
              : run.rows.map(({ row, index }) => option(row, index)))}
          </ul>
          ${this.loading
            ? html`<p class="message"><cm-spinner size="small" aria-hidden="true"></cm-spinner><span aria-hidden="true">${this.loadingText || this.t('loading')}</span></p>`
            : !rows.length ? html`<p class="message">${this.emptyText || this.t('noResults')}</p>` : nothing}
        </div>
      </div>
      <span class="vh" role="status" aria-live="polite">${status}</span>
      ${this.error ? html`<p class="error" id="${this.#id}-err" role="alert">${this.error}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
      <slot></slot>
    </div>`;
  }
}
define('cm-combobox', CmCombobox);

declare global { interface HTMLElementTagNameMap { 'cm-combobox': CmCombobox } }
