import { html, css, nothing, type PropertyValues } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import { type MenuItem, readMenuItems, watchMenuItems } from './menu-item.js';
import { TopLayer } from '../top-layer.js';
import './icon.js';
import './spinner.js';

const strings = defineStrings('actionMenu', {
  /** Text of the trigger button (its accessible name when `icon-only`), and the menu's name. */
  label: 'Actions',
});
declare module '../localize.js' { interface CmStrings { actionMenu: typeof strings } }

/**
 * A button that opens a short list of actions: row actions in a table ("Cancel shipment", "Change tracking
 * info"), "Add…" menus, or the account menu with the merchant's name and email on top. The highlighted choice
 * is black with white text; a destructive (`critical`) choice turns red on red instead.
 *
 * Rows (owner standard, 1.6): 36px (32px with `density="compact"`, 44px on touch screens), 12px side padding,
 * 14px text, 16px icons, an optional shortcut hint at 12px in grey, and 12px section headings. The same rows as the
 * options of `cm-select` and `cm-combobox`.
 *
 * Follows the WAI-ARIA menu button pattern: the trigger has `aria-haspopup` and `aria-expanded`; ↓/↑ (or
 * Enter/Space) open it, ↓/↑ Home/End and the first letter move between choices, Enter/Space choose, Esc closes
 * and returns focus to the trigger, Tab closes and moves on. A click outside closes it.
 * @element cm-action-menu
 * @slot - `cm-menu-item`s, with `<hr>` between groups.
 * @slot trigger - Your own trigger button (optional). The menu sets its ARIA state.
 * @csspart trigger - The built-in trigger button.
 * @csspart menu - The floating panel.
 * @csspart item - Each choice.
 * @csspart shortcut - A choice's shortcut hint.
 * @csspart section - A section heading.
 * @fires cm-select - When a choice is made. `detail: { value, item }`. Cancelable: for link items, `preventDefault()` stops the navigation.
 * @fires cm-toggle - When the menu opens or closes. `detail: { open }`.
 */
export class CmActionMenu extends CmLocalizedElement {
  static properties = {
    items: { type: Array },
    open: { type: Boolean, reflect: true },
    label: { string: 'label' },
    triggerLabel: { attribute: 'trigger-label' },
    iconOnly: { type: Boolean, attribute: 'icon-only' },
    icon: {},
    align: { reflect: true },
    heading: {},
    subheading: {},
    density: { reflect: true },
    loading: { type: Boolean, reflect: true },
    disabled: { type: Boolean, reflect: true },
    _slotted: { state: true },
    _active: { state: true },
    _custom: { state: true },
  };

  /** Choices as data, used instead of children when set: `[{ label: 'Add product', value: 'product' }, { divider: true }, …]`. */
  items: MenuItem[] = [];
  /** Shows the menu. */
  open = false;
  /** Accessible name of the menu. Also the trigger's name when it is icon-only. Default: the built-in string `label` ("Actions"). */
  label!: string;
  /** Text of the built-in trigger. Empty uses `label`. */
  triggerLabel = '';
  /** The built-in trigger is a "more" (⋮) icon button, e.g. for table rows. */
  iconOnly = false;
  /** Icon of the icon-only trigger. Default `more` (⋮); `chevron-down` for a menu attached to another control. */
  icon = 'more';
  /** Which trigger edge the menu lines up with: `start` (default) or `end` (for triggers at the right edge). */
  align: 'start' | 'end' = 'start';
  /** Bold line above the choices, e.g. the merchant's name in the account menu. */
  heading = '';
  /** Smaller line under the heading, e.g. the email. */
  subheading = '';
  /** Row height: `comfortable` 36px rows (the default) or `compact` 32px rows for dense tables and toolbars. Since 1.6. */
  density?: 'comfortable' | 'compact';
  /** Shows a spinner row instead of the choices while you load them (the menu is `aria-busy`). Since 1.6. */
  loading = false;
  /** The built-in trigger can't be used (it is a disabled button); a slotted trigger is yours to disable. Since 1.6. */
  disabled = false;

  _slotted: MenuItem[] = [];
  _active = -1;
  _custom = false;
  #observer?: MutationObserver;
  #id = nextId('cm-menu');
  #typed = '';
  #typedAt = 0;

  static styles = [
    base,
    css`
      :host { display: inline-block; position: relative; vertical-align: middle; }
      .trigger {
        display: inline-flex; align-items: center; gap: var(--cm-space-8); min-height: var(--cm-control-height-md, 36px); padding: 0 var(--cm-space-12); font: inherit; font-size: var(--cm-font-size-14); font-weight: 500;
        color: var(--cm-text-default); background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-input);
        border-radius: var(--cm-radius-sm); cursor: pointer;
      }
      .trigger.icon { width: var(--cm-control-height-md, 36px); padding: 0; justify-content: center; border-color: transparent; background: none; }
      .trigger:hover:not(:disabled) { background: var(--cm-bg-hover); }
      .trigger:disabled { color: var(--cm-text-secondary); border-color: var(--cm-border-subtle); background: var(--cm-bg-input-filled); cursor: not-allowed; }
      .trigger.icon:disabled { background: none; }
      .trigger:active { background: color-mix(in srgb, var(--cm-bg-hover), var(--cm-text-default) 8%); }
      .trigger[aria-expanded='true'] { background: var(--cm-bg-hover); }
      /* Touch screens (1.6, like cm-button): the trigger is drawn 40px (40 x 40 icon-only) with a 44px hit area. */
      @media (pointer: coarse) {
        .trigger { position: relative; min-height: var(--cm-control-height-lg, 40px); } .trigger.icon { width: var(--cm-control-height-lg, 40px); }
        .trigger::after { content: ''; position: absolute; inset: -2px; }
        .item { min-height: var(--cm-control-height-touch, 44px); }
      }
      .trigger:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .pop {
        position: absolute; z-index: 20; top: calc(100% + 4px); inset-inline-start: 0; width: max-content; min-width: 180px; max-width: min(320px, calc(100vw - 32px));
        padding: var(--cm-space-4); text-align: start; background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle);
        border-radius: var(--cm-radius-md); box-shadow: var(--cm-shadow-md);
      }
      :host([align='end']) .pop, .pop.to-end { inset-inline-start: auto; inset-inline-end: 0; }
      :host([align='end']) .pop.to-start { inset-inline-start: 0; inset-inline-end: auto; }
      .pop[hidden] { display: none; }
      /* 1.9.2: the open menu is a popover in the top layer, so a scrolling ancestor (a board column, a table, a card
         body) can't clip it; TopLayer (src/top-layer.ts) puts it beside the trigger. Browsers without popovers keep the absolute menu. */
      .pop:popover-open { position: fixed; inset: auto; margin: 0; overflow: auto; color: var(--cm-text-default); }
      .head { padding: var(--cm-space-4) var(--cm-space-12) var(--cm-space-8); margin-bottom: 4px; border-bottom: var(--cm-border-1) solid var(--cm-border-subtle); overflow-wrap: anywhere; }
      .head strong { display: block; font-size: 14px; font-weight: 500; }
      .head span { display: block; font-size: var(--cm-font-size-12); color: var(--cm-text-tertiary); }
      [role='menu'] { display: flex; flex-direction: column; outline: none; }
      .item {
        display: flex; align-items: center; gap: var(--cm-space-8); width: 100%; min-height: var(--cm-control-height-md, 36px); padding: var(--cm-space-4) var(--cm-space-12); font: inherit; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14);
        color: var(--cm-text-default); text-align: start; text-decoration: none; background: none; border: 0; border-radius: var(--cm-radius-sm);
        cursor: pointer; outline: none;
      }
      :host([density='compact']) .item { min-height: var(--cm-control-height-sm, 32px); }
      .item cm-icon { flex: none; }
      .label { flex: 1; min-width: 0; }
      .shortcut { flex: none; padding-inline-start: var(--cm-space-16); font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12); color: var(--cm-text-tertiary); }
      .item.critical { color: var(--cm-text-critical); }
      .item[aria-disabled='true'] { color: var(--cm-text-secondary); cursor: not-allowed; }
      .item[aria-disabled='true'] .shortcut { color: var(--cm-text-secondary); }
      .item.active:not([aria-disabled='true']), .item:not([aria-disabled='true']):hover {
        background: var(--cm-bg-panel-header); color: var(--cm-text-on-dark);
      }
      .item.active:not([aria-disabled='true']) .shortcut, .item:not([aria-disabled='true']):hover .shortcut { color: var(--cm-text-on-dark-secondary); }
      .item:not([aria-disabled='true']):active { background: color-mix(in srgb, var(--cm-bg-panel-header), var(--cm-text-on-dark) 16%); }
      .item.critical.active:not([aria-disabled='true']), .item.critical:not([aria-disabled='true']):hover { background: var(--cm-bg-critical); color: var(--cm-text-critical); }
      .item.critical.active .shortcut, .item.critical:hover .shortcut { color: var(--cm-text-critical); }
      .item.critical:not([aria-disabled='true']):active { background: color-mix(in srgb, var(--cm-bg-critical), var(--cm-text-critical) 12%); }
      .item.active:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 1px; }
      [role='group'] { display: flex; flex-direction: column; }
      .section {
        padding: var(--cm-space-8) var(--cm-space-12) var(--cm-space-4); font-size: var(--cm-font-size-12); line-height: var(--cm-line-height-12);
        font-weight: 500; color: var(--cm-text-tertiary);
      }
      .loading { display: flex; align-items: center; gap: var(--cm-space-8); min-height: var(--cm-control-height-md, 36px); padding: var(--cm-space-4) var(--cm-space-12); font-size: var(--cm-font-size-14); color: var(--cm-text-tertiary); }
      [role='separator'] { height: 0; margin: 4px 0; border-top: var(--cm-border-1) solid var(--cm-border-subtle); }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#read();
    this.#observer = watchMenuItems(this, () => this.#read());
    document.addEventListener('pointerdown', this.#outside, true);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer?.disconnect();
    document.removeEventListener('pointerdown', this.#outside, true);
    this.#layer.close();
  }

  #read() {
    this._slotted = readMenuItems(this);
    this._custom = !!this.querySelector(':scope > [slot="trigger"]');
  }

  /** The choices in use. */
  get menuItems(): MenuItem[] { return this.items.length ? this.items : this._slotted; }

  #outside = (e: Event) => { if (this.open && !e.composedPath().includes(this)) this.#setOpen(false); };

  #trigger(): HTMLElement | null {
    if (this._custom) return this.querySelector<HTMLElement>(':scope > [slot="trigger"]');
    return this.renderRoot.querySelector<HTMLElement>('.trigger');
  }

  #enabled() {
    if (this.loading) return [];
    return this.menuItems.map((it, i) => (!it.divider && !it.heading && !it.disabled ? i : -1)).filter((i) => i >= 0);
  }

  /** Opens the menu and highlights the first (or last) choice. */
  show(focus: 'first' | 'last' = 'first') {
    const en = this.#enabled();
    this._active = focus === 'first' ? en[0] ?? -1 : en[en.length - 1] ?? -1;
    this.#setOpen(true);
    this.updateComplete.then(() => this.#focusActive());
  }

  /** Closes the menu. With `returnFocus`, focus goes back to the trigger. */
  hide(returnFocus = false) {
    this.#setOpen(false);
    if (returnFocus) this.#trigger()?.focus();
  }

  #setOpen(v: boolean) {
    if (this.open === v) return;
    this.open = v;
    if (!v) this._active = -1;
    this.dispatchEvent(new CustomEvent('cm-toggle', { detail: { open: v }, bubbles: true, composed: true }));
  }

  #focusActive() { this.renderRoot.querySelector<HTMLElement>(`[data-i="${this._active}"]`)?.focus(); }

  /** Opens toward the other side when the menu would run off the screen (1.8.1: a More menu at the end of a page header). */
  #fit() {
    const pop = this.renderRoot.querySelector<HTMLElement>('.pop');
    if (!pop) return;
    // In the top layer (1.9.2; shared with the other dropdowns since 1.10.1), beside the trigger.
    if (this.#layer.open(pop, this.#trigger() ?? this, { align: this.align === 'end' ? 'end' : 'start' })) return;
    pop.classList.remove('to-end', 'to-start');
    const r = pop.getBoundingClientRect(), vw = document.documentElement.clientWidth, m = 8;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const endOverflow = rtl ? r.left < m : r.right > vw - m;
    const startOverflow = rtl ? r.right > vw - m : r.left < m;
    if (this.align !== 'end' && endOverflow) pop.classList.add('to-end');
    else if (this.align === 'end' && startOverflow) pop.classList.add('to-start');
  }

  #layer = new TopLayer();

  protected updated(changed: PropertyValues) {
    if (changed.has('open') && this.open) this.#fit();
    if (changed.has('open') && !this.open) this.#layer.close();
    if (this._custom) {
      const t = this.#trigger();
      if (t) {
        // Only write changes: the item observer watches attributes, so rewriting would loop.
        const set = (k: string, v: string) => { if (t.getAttribute(k) !== v) t.setAttribute(k, v); };
        set('aria-haspopup', 'menu');
        set('aria-expanded', String(this.open));
        set('aria-controls', `${this.#id}-m`);
      }
    }
    if ((changed.has('open') || changed.has('loading')) && this.open && this._active < 0) {
      const en = this.#enabled();
      this._active = en[0] ?? -1;
      this.updateComplete.then(() => this.#focusActive());
    }
  }

  #triggerKey = (e: KeyboardEvent) => {
    if (this.disabled) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); this.show('first'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.show('last'); }
    else if (e.key === 'Escape' && this.open) { e.preventDefault(); e.stopPropagation(); this.hide(true); }
  };

  #triggerClick = () => { if (this.disabled) return; if (this.open) this.hide(); else this.show(); };

  #move(to: number) {
    this._active = to;
    this.updateComplete.then(() => this.#focusActive());
  }

  #menuKey = (e: KeyboardEvent) => {
    const en = this.#enabled();
    const pos = en.indexOf(this._active);
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.#move(en[(pos + 1) % en.length]); break;
      case 'ArrowUp': e.preventDefault(); this.#move(en[(pos - 1 + en.length) % en.length]); break;
      case 'Home': e.preventDefault(); this.#move(en[0]); break;
      case 'End': e.preventDefault(); this.#move(en[en.length - 1]); break;
      case 'Escape': e.preventDefault(); e.stopPropagation(); this.hide(true); break;
      case 'Tab': this.hide(); break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now();
          this.#typed = (now - this.#typedAt < 600 ? this.#typed : '') + e.key.toLowerCase();
          this.#typedAt = now;
          const items = this.menuItems;
          const start = this.#typed.length > 1 ? pos : pos + 1;
          const order = [...en.slice(Math.max(start, 0)), ...en.slice(0, Math.max(start, 0))];
          const hit = order.find((i) => (items[i].label ?? '').toLowerCase().startsWith(this.#typed));
          if (hit !== undefined) this.#move(hit);
        }
    }
  };

  #choose(e: Event, it: MenuItem) {
    if (it.disabled) { e.preventDefault(); return; }
    const ok = this.dispatchEvent(new CustomEvent('cm-select', {
      detail: { value: it.value ?? it.label, item: it }, bubbles: true, composed: true, cancelable: true,
    }));
    if (!ok) e.preventDefault();
    this.hide(!it.href || !ok);
  }

  #item(it: MenuItem, i: number) {
    if (it.divider) return html`<div role="separator"></div>`;
    const cls = `item${it.critical ? ' critical' : ''}${i === this._active ? ' active' : ''}`;
    const inner = html`${it.icon ? html`<cm-icon name=${it.icon} size="16"></cm-icon>` : nothing}<span class="label">${it.label}</span>${it.shortcut
      ? html`<span class="shortcut" part="shortcut" aria-hidden="true">${it.shortcut}</span>` : nothing}`;
    const common = {
      over: () => { if (!it.disabled) this._active = i; },
      click: (e: Event) => this.#choose(e, it),
    };
    return it.href && !it.disabled
      ? html`<a class=${cls} part="item" role="menuitem" tabindex="-1" data-i=${i} href=${it.href}
          aria-keyshortcuts=${it.shortcut || nothing} @pointerenter=${common.over} @click=${common.click}>${inner}</a>`
      : html`<button type="button" class=${cls} part="item" role="menuitem" tabindex="-1" data-i=${i}
          aria-disabled=${it.disabled ? 'true' : nothing} aria-keyshortcuts=${it.shortcut || nothing} @pointerenter=${common.over} @click=${common.click}>${inner}</button>`;
  }

  /** Rows: choices and separators, with each heading and the choices after it (up to a divider or heading) in a group. */
  #rows(items: MenuItem[]) {
    const out: unknown[] = [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.heading) { out.push(this.#item(it, i)); continue; }
      const id = `${this.#id}-h${i}`;
      const members: unknown[] = [];
      let j = i + 1;
      for (; j < items.length && !items[j].heading && !items[j].divider; j++) members.push(this.#item(items[j], j));
      out.push(html`<div role="group" aria-labelledby=${id}><div class="section" part="section" id=${id} role="presentation">${it.label}</div>${members}</div>`);
      i = j - 1;
    }
    return out;
  }

  /** @internal A subclass's own trigger (it must carry class="trigger"); undefined keeps the standard one. */
  protected triggerTemplate(_click: (e: Event) => void, _key: (e: KeyboardEvent) => void): unknown { return undefined; }
  /** @internal A subclass's own content above the choices; undefined keeps the heading/subheading block. */
  protected headTemplate(): unknown { return undefined; }

  render() {
    const items = this.menuItems;
    const name = this.triggerLabel || this.label;
    const trigger = this._custom
      ? html`<slot name="trigger" @click=${this.#triggerClick} @keydown=${this.#triggerKey} @slotchange=${() => this.#read()}></slot>`
      : this.triggerTemplate(this.#triggerClick, this.#triggerKey) ?? html`<button type="button" class="trigger ${this.iconOnly ? 'icon' : ''}" part="trigger" aria-haspopup="menu"
          aria-expanded=${String(this.open)} aria-controls="${this.#id}-m" aria-label=${this.iconOnly ? name : nothing}
          ?disabled=${this.disabled} @click=${this.#triggerClick} @keydown=${this.#triggerKey}>${this.iconOnly
            ? html`<cm-icon name=${this.icon} size="18"></cm-icon>`
            : html`<span>${name}</span><cm-icon name="chevron-down" size="14"></cm-icon>`}</button>`;
    return html`${trigger}
      <div class="pop" part="menu" popover="manual" ?hidden=${!this.open}>
        ${this.headTemplate() ?? (this.heading ? html`<div class="head" part="heading"><strong>${this.heading}</strong>${this.subheading ? html`<span>${this.subheading}</span>` : nothing}</div>` : nothing)}
        <div role="menu" id="${this.#id}-m" aria-label=${this.heading || this.label} aria-busy=${this.loading ? 'true' : nothing} @keydown=${this.#menuKey}>
          ${this.loading
            ? html`<div class="loading" role="presentation"><cm-spinner size="small" aria-hidden="true"></cm-spinner><span>${this.t('loading')}</span></div>`
            : this.#rows(items)}
        </div>
      </div>
      <slot hidden></slot>`;
  }
}
define('cm-action-menu', CmActionMenu);

declare global { interface HTMLElementTagNameMap { 'cm-action-menu': CmActionMenu } }
