import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { FieldValidity } from '../validation.js';
import { groupStyles, sortByGroup, groupRuns } from '../popover.js';
import { fieldStyles, optionStyles } from '../field.js';
import { TopLayer, topLayerStyles } from '../top-layer.js';
import './icon.js';
import './spinner.js';

const strings = defineStrings('select', {
  /** Validation message when `required` and nothing is chosen. */
  required: 'Please select an item in the list.',
  /** The chosen option in the box with `show-group`: "Lead: Company". */
  grouped: '{group}: {label}',
});
declare module '../localize.js' { interface CmStrings { select: typeof strings } }

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  /**
   * Heading of the group the option belongs to ("Lead"), like a native `<optgroup label>`. Options of the same group
   * are shown together under the heading, in the order the groups first appear. Since 1.3.
   */
  group?: string;
}

/**
 * Dropdown field: a labelled box that opens a list of options and shows the chosen one.
 * A custom listbox (the WAI-ARIA "select-only combobox" pattern) so the open list can match the
 * design; it keeps native-select keyboard behaviour. Participates in native forms.
 *
 * Options come from `<option>` children (easy in plain HTML, PHP and EJS) or the `options` property.
 * Group them under headings with `<optgroup label="…">` or a `group` on each option (since 1.3).
 * @element cm-select
 * @slot - `<option value="…">Label</option>` elements, optionally inside `<optgroup label="…">`. `disabled` (also on an optgroup) and `selected` are honoured.
 * @fires change - When the merchant picks a different option.
 * @fires input - Same moment as `change`.
 */
export class CmSelect extends CmLocalizedElement {
  static formAssociated = true;
  static shadowRootOptions = { ...LitElement.shadowRootOptions, delegatesFocus: true };
  static properties = {
    label: {},
    helpText: { attribute: 'help-text' },
    error: { reflect: true },
    name: { reflect: true },
    value: {},
    placeholder: {},
    options: { type: Array },
    required: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    open: { type: Boolean, reflect: true },
    showGroup: { type: Boolean, attribute: 'show-group' },
    size: { reflect: true },
    loading: { type: Boolean, reflect: true },
    _active: { state: true },
    _slotted: { state: true },
  };

  /** Visible label above the box. Required for accessibility unless the element has an aria-label. */
  label = '';
  /** One sentence under the box in text-tertiary. */
  helpText = '';
  /** Error message; turns the border critical and sets aria-invalid. */
  error = '';
  /** Form field name. */
  name = '';
  /** Value of the chosen option; empty when nothing is chosen. */
  value = '';
  /** Shown while nothing is chosen, e.g. "Select customer". */
  placeholder = '';
  /** Options as strings or `{ value, label, disabled, group }`. Used instead of `<option>` children when set. */
  options: Array<string | SelectOption> = [];
  /** The form will not submit until an option is chosen. */
  required = false;
  /** Blocks interaction. Also set by a disabled `<fieldset>`. */
  disabled = false;
  /** Whether the list is showing. */
  open = false;
  /**
   * Shows the chosen option's group before its label in the box ("Lead: Company"), for grouped lists where labels
   * repeat across groups. The list itself always shows the bare label under its group heading. Since 1.3.
   */
  showGroup = false;
  /**
   * `small`: a 32px box with a 13px label, for toolbars, filter rows and filter panels. `medium` (1.8.1): 36px, the height of a standard
   * button, for a select in a row of buttons such as page header actions. Default: a 40px box (since 1.6, owner standard; was 36px). On touch
   * screens all are 44px. Since 1.5.
   */
  size: 'default' | 'medium' | 'small' = 'default';
  /**
   * Shows a spinner in place of the chevron while you load the options (the box is `aria-busy`); the list doesn't
   * open until it is cleared. For options fetched as the merchant types, use `cm-combobox`. Since 1.6.
   */
  loading = false;

  _active = -1;
  _slotted: SelectOption[] = [];

  #internals = this.attachInternals();
  #v = new FieldValidity(this, this.#internals);
  #id = nextId('cm-sel');
  #defaultValue = '';
  #typed = '';
  #typedAt = 0;
  #observer = new MutationObserver(() => this.#readChildren());

  static styles = [
    base,
    topLayerStyles,
    fieldStyles,
    optionStyles,
    groupStyles,
    css`
      :host { display: block; position: relative; }
      .label { cursor: default; }
      .wrap { position: relative; }
      .box {
        display: flex; align-items: center; gap: var(--cm-space-8); width: 100%; height: var(--_cm-field-h);
        padding-block: 0; padding-inline: var(--_cm-field-pad) var(--cm-space-8);
        font-size: var(--_cm-field-font); line-height: var(--cm-line-height-14); color: var(--cm-text-default); background: var(--cm-bg-surface); cursor: pointer;
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm); outline: none; user-select: none;
      }
      /* Hover (1.6): the outline darkens; focus adds the 2px ring. */
      :host(:not([disabled])) .box:hover { border-color: var(--cm-border-strong); }
      .box:focus-visible, :host([open]) .box { border-color: var(--cm-border-strong); box-shadow: 0 0 0 1px var(--cm-border-strong); }
      .text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .placeholder { color: var(--cm-text-tertiary); }
      .spin { flex: none; display: inline-flex; }
      :host([loading]) .box { cursor: progress; }
      .chev { flex: none; color: var(--cm-icon-selected); transition: transform var(--cm-duration-fast) var(--cm-easing-standard); }
      :host([open]) .chev { transform: rotate(180deg); }
      :host([error]:not([error=''])) .box, :host([data-cm-invalid]) .box { border-color: var(--cm-border-critical); }
      :host([disabled]) .box { background: var(--cm-bg-input-filled); color: var(--cm-text-secondary); border-color: var(--cm-border-subtle); cursor: not-allowed; }
      [role='listbox'] {
        position: absolute; z-index: 20; top: calc(100% + var(--cm-space-4)); inset-inline: 0; min-width: max-content;
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle);
        border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-md);
      }
      [role='option'].active { background: var(--cm-bg-hover); }
      [role='option'][aria-selected='true'] { background: var(--cm-action-primary); color: var(--cm-action-primary-text); }
      [role='option'][aria-selected='true'].active { background: var(--cm-action-primary-hover); }
      [role='option'][aria-disabled='true'] { color: var(--cm-text-secondary); cursor: not-allowed; }
      [role='group'] { display: block; }
      slot { display: none; }
      @media (prefers-reduced-motion: reduce) { .chev { transition: none; } }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#readChildren();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'label', 'disabled', 'selected'] });
    document.addEventListener('pointerdown', this.#onOutside, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#layer.close();
    this.#observer.disconnect();
    document.removeEventListener('pointerdown', this.#onOutside, true);
  }

  get form() { return this.#internals.form; }
  get validity() { return this.#internals.validity; }
  get validationMessage() { return this.#internals.validationMessage; }
  checkValidity() { return this.#internals.checkValidity(); }
  reportValidity() { return this.#v.report(() => this.#internals.reportValidity()); }
  formResetCallback() { this.value = this.#defaultValue; this.open = false; this.#v.reset(); }
  formDisabledCallback(d: boolean) { this.disabled = d; if (d) this.open = false; }
  formStateRestoreCallback(state: string) { this.value = state; }

  /** The options in use, normalised, in the order shown (options of a group together). */
  get items(): SelectOption[] {
    if (!this.options.length) return sortByGroup(this._slotted);
    return sortByGroup(this.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));
  }

  #readChildren() {
    const opts = [...this.querySelectorAll('option')];
    this._slotted = opts.map((o) => {
      const g = o.parentElement?.localName === 'optgroup' ? (o.parentElement as HTMLOptGroupElement) : null;
      const opt: SelectOption = { value: o.value, label: o.label || o.textContent!.trim(), disabled: o.disabled || !!g?.disabled };
      if (g?.label) opt.group = g.label;
      return opt;
    });
    if (!this.hasUpdated && !this.value) {
      this.value = opts.find((o) => o.hasAttribute('selected'))?.value ?? '';
      this.#defaultValue = this.value;
    }
  }

  firstUpdated() { this.#defaultValue ||= this.value; }

  updated(changed: Map<string, unknown>) {
    this.#internals.setFormValue(this.value || null, this.value);
    const box = this.renderRoot.querySelector<HTMLElement>('.box') ?? undefined;
    if (this.error) this.#internals.setValidity({ customError: true }, this.error, box);
    else if (this.required && !this.value) this.#internals.setValidity({ valueMissing: true }, this.t('required'), box);
    else this.#internals.setValidity({});
    this.#v.sync();
    // The list opens in the top layer (1.10.1, #35), so later rows and scroll containers can't cover or clip it.
    if (changed.has('open')) {
      if (this.open) this.#layer.open(this.renderRoot.querySelector<HTMLElement>('[role=listbox]'), this.renderRoot.querySelector<HTMLElement>('.box'), { align: 'stretch' });
      else this.#layer.close();
    } else if (this.open && changed.has('items')) this.#layer.place();
    if ((changed.has('_active') || changed.has('open')) && this.open) {
      this.renderRoot.querySelector(`#${this.#id}-o${this._active}`)?.scrollIntoView({ block: 'nearest' });
    }
  }

  #layer = new TopLayer();

  #enabledIndexes() { return this.items.flatMap((o, i) => (o.disabled ? [] : [i])); }

  #show(active?: number) {
    if (this.disabled || this.loading) return;
    const sel = this.items.findIndex((o) => o.value === this.value);
    this.open = true;
    this._active = active ?? (sel >= 0 ? sel : this.#enabledIndexes()[0] ?? -1);
  }
  #hide() { this.open = false; }

  #commit(i: number) {
    const o = this.items[i];
    if (!o || o.disabled) return;
    this.#hide();
    if (o.value === this.value) return;
    this.value = o.value;
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #move(step: number | 'first' | 'last') {
    const en = this.#enabledIndexes();
    if (!en.length) return;
    if (step === 'first') return void (this._active = en[0]);
    if (step === 'last') return void (this._active = en[en.length - 1]);
    const pos = en.indexOf(this._active);
    this._active = pos < 0 ? en[0] : en[Math.min(en.length - 1, Math.max(0, pos + step))];
  }

  #typeahead(ch: string) {
    const now = Date.now();
    this.#typed = now - this.#typedAt > 500 ? ch : this.#typed + ch;
    this.#typedAt = now;
    const items = this.items;
    const start = this._active < 0 ? 0 : this._active;
    // A repeated letter cycles through matches; a longer string matches from the current option.
    const same = this.#typed.split('').every((c) => c === this.#typed[0]);
    const q = same ? this.#typed[0] : this.#typed;
    const from = same || this.#typed.length === 1 ? start + 1 : start;
    for (let k = 0; k < items.length; k++) {
      const i = (from + k) % items.length;
      if (!items[i].disabled && items[i].label.toLowerCase().startsWith(q.toLowerCase())) return i;
    }
    return -1;
  }

  #onKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;
    const k = e.key;
    if (!this.open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(k)) { e.preventDefault(); this.#show(); return; }
      if (k === 'Home' || k === 'End') { e.preventDefault(); this.#show(); this.#move(k === 'Home' ? 'first' : 'last'); return; }
      if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const i = this.#typeahead(k);
        this.#show(i >= 0 ? i : undefined);
      }
      return;
    }
    switch (k) {
      case 'ArrowDown': e.preventDefault(); if (e.altKey) this.#commit(this._active); else this.#move(1); break;
      case 'ArrowUp': e.preventDefault(); if (e.altKey) this.#commit(this._active); else this.#move(-1); break;
      case 'Home': e.preventDefault(); this.#move('first'); break;
      case 'End': e.preventDefault(); this.#move('last'); break;
      case 'PageDown': e.preventDefault(); this.#move(10); break;
      case 'PageUp': e.preventDefault(); this.#move(-10); break;
      case 'Enter': e.preventDefault(); this.#commit(this._active); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); this.#hide(); break;
      case 'Tab': this.#commit(this._active); break;
      case ' ':
        e.preventDefault();
        if (this.#typed && Date.now() - this.#typedAt < 500) { const i = this.#typeahead(' '); if (i >= 0) this._active = i; }
        else this.#commit(this._active);
        break;
      default:
        if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const i = this.#typeahead(k);
          if (i >= 0) this._active = i;
        }
    }
  };

  #onOutside = (e: Event) => {
    if (this.open && !e.composedPath().includes(this)) this.#hide();
  };

  #onBoxClick = () => {
    if (this.disabled) return;
    if (this.open) this.#hide(); else this.#show();
  };

  #display(o: SelectOption) {
    return this.showGroup && o.group ? this.t('grouped', { group: o.group, label: o.label }) : o.label;
  }

  #focusBox = () => this.renderRoot.querySelector<HTMLElement>('.box')?.focus();

  render() {
    const items = this.items;
    const current = items.find((o) => o.value === this.value);
    const message = this.#v.message;
    const described = [message && `${this.#id}-err`, this.helpText && `${this.#id}-help`].filter(Boolean).join(' ');
    const hostLabel = this.getAttribute('aria-label');
    const option = (o: SelectOption, i: number) => html`<li role="option" id="${this.#id}-o${i}" class=${i === this._active ? 'active' : ''}
      aria-selected=${o.value === this.value ? 'true' : 'false'} aria-disabled=${o.disabled ? 'true' : nothing}
      @pointerenter=${() => !o.disabled && (this._active = i)} @click=${() => this.#commit(i)}>${o.label}</li>`;
    return html`<div class="field">
      ${this.label
        ? html`<span class="label" id="${this.#id}-l" part="label" @click=${this.#focusBox}>${this.label}${this.required ? html`<span class="req" aria-hidden="true">*</span>` : nothing}</span>`
        : nothing}
      <div class="wrap">
        <div class="box" part="box" role="combobox" tabindex=${this.disabled ? '-1' : '0'}
          aria-labelledby=${this.label ? `${this.#id}-l` : nothing}
          aria-label=${!this.label && hostLabel ? hostLabel : nothing}
          aria-haspopup="listbox" aria-expanded=${this.open ? 'true' : 'false'} aria-controls="${this.#id}-list"
          aria-activedescendant=${this.open && this._active >= 0 ? `${this.#id}-o${this._active}` : nothing}
          aria-required=${this.required ? 'true' : nothing} aria-invalid=${message ? 'true' : nothing}
          aria-disabled=${this.disabled ? 'true' : nothing} aria-describedby=${described || nothing} aria-busy=${this.loading ? 'true' : nothing}
          @click=${this.#onBoxClick} @keydown=${this.#onKeyDown} @blur=${() => this.#hide()}>
          <span class="text ${current ? '' : 'placeholder'}" id="${this.#id}-v">${current ? this.#display(current) : this.placeholder}</span>
          ${this.loading
            ? html`<span class="spin"><cm-spinner size="small" aria-hidden="true"></cm-spinner></span>`
            : html`<cm-icon class="chev" name="chevron-down" size="16"></cm-icon>`}
        </div>
        <ul role="listbox" id="${this.#id}-list" part="listbox" tabindex="-1" aria-labelledby=${this.label ? `${this.#id}-l` : nothing}
          aria-label=${!this.label && hostLabel ? hostLabel : nothing} ?hidden=${!this.open}
          @pointerdown=${(e: Event) => e.preventDefault()}>
          ${groupRuns(items).map((run, gi) => run.group
            ? html`<li role="group" aria-labelledby="${this.#id}-g${gi}"><div role="presentation" class="gh" id="${this.#id}-g${gi}">${run.group}</div>
                <ul role="none" class="gopts">${run.rows.map(({ row, index }) => option(row, index))}</ul></li>`
            : run.rows.map(({ row, index }) => option(row, index)))}
        </ul>
      </div>
      ${message ? html`<p class="error" id="${this.#id}-err" role="alert">${message}</p>` : nothing}
      ${this.helpText ? html`<p class="help" id="${this.#id}-help">${this.helpText}</p>` : nothing}
      <slot></slot>
    </div>`;
  }
}
define('cm-select', CmSelect);

declare global { interface HTMLElementTagNameMap { 'cm-select': CmSelect } }
