import { html, css, nothing, type PropertyValues } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import type { MenuItem } from './menu-item.js';
import './action-menu.js';

const strings = defineStrings('buttonGroup', {
  /** Text of the trigger that holds the buttons that don't fit (its accessible name with `more-icon`), and the menu's name. */
  more: 'More',
});
declare module '../localize.js' { interface CmStrings { buttonGroup: typeof strings } }

/** Set on a button the group moved into its More menu (together with `hidden`). */
const MOVED = 'data-cm-overflow';
/** Attributes of a button that change what its menu item shows or how it fits. */
const WATCHED = ['disabled', 'loading', 'tone', 'icon', 'label', 'variant', 'size', 'icon-only', 'count', 'href', 'hidden', 'data-priority'];

/**
 * A row of buttons 8px apart: a task's outcome choices ("Spoke to them", "No answer, reschedule", "Not interested"),
 * card actions or a toolbar. By default the row wraps onto more lines when it runs out of room. With
 * `overflow="menu"` it stays on one line: the buttons that don't fit move into a trailing "More" menu (measured
 * from the group's own width, so it works in cards and side panels as well as on phones), the least important first.
 *
 * Choosing a menu item clicks the original button, so your click handlers, `href` and `type="submit"` keep working.
 * Buttons in the menu are `hidden` (out of the layout, the tab order and the accessibility tree) and come back when
 * there is room again.
 * @element cm-button-group
 * @slot - `cm-button`s, in reading order. Put `data-priority="high"` on a button to keep it visible longest and
 *   `data-priority="low"` to move it into the menu first; a `variant="primary"` button stays visible if it fits at all.
 * @csspart row - The flex row (`role="group"`).
 * @csspart more - The `cm-action-menu` that holds the buttons that don't fit.
 * @fires cm-overflow-change - When the set of buttons in the More menu changes. `detail: { hidden: HTMLElement[] }`.
 */
export class CmButtonGroup extends CmLocalizedElement {
  static properties = {
    overflow: { reflect: true },
    moreLabel: { attribute: 'more-label', string: 'more' },
    moreIcon: { attribute: 'more-icon' },
    size: { reflect: true },
    align: { reflect: true },
    label: {},
    _items: { state: true },
    _size: { state: true },
  };

  /** `wrap` (default): buttons wrap onto more lines. `menu`: one line; the buttons that don't fit move into a More menu at the end. */
  overflow: 'wrap' | 'menu' = 'wrap';
  /** Text of the More trigger, and its accessible name with `more-icon`. Default: the built-in string `more` ("More"). */
  moreLabel!: string;
  /**
   * Makes the More trigger a square icon button named by `more-label`. The value is the icon: empty (just the attribute)
   * is `more` (⋮). Use it when even "More" is too wide, e.g. in table rows.
   */
  moreIcon?: string | null;
  /** Size of the More trigger: `large` 40, `medium` 36, `slim` 32 (40 on touch screens). Default: the first button's `size`. Give every button the same size. */
  size?: 'large' | 'medium' | 'slim';
  /** `start` (default) lines the buttons up at the start edge; `end` at the end edge (dialog and card footers). */
  align: 'start' | 'end' = 'start';
  /** Accessible name of the group, e.g. "Call outcome". */
  label = '';

  _items: MenuItem[] = [];
  _size: 'large' | 'medium' | 'slim' = 'medium';
  #hidden: HTMLElement[] = [];
  #mo?: MutationObserver;
  #ro?: ResizeObserver;
  #frame = 0;
  #watched = new Set<Element>();
  #refocus = false;

  static styles = [
    base,
    css`
      :host { display: block; min-inline-size: 0; }
      .row { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-8); min-inline-size: 0; }
      :host([align='end']) .row { justify-content: flex-end; }
      :host([overflow='menu']) .row { flex-wrap: nowrap; }
      ::slotted(*) { flex: none; }
      .more { flex: none; }
      .more[hidden] { display: none; }
      /* The More trigger matches the buttons (owner standard, 1.6): medium 36, slim 32, large 40; 40 on touch screens with
         a 44px hit area (set by cm-action-menu). Text 14px (13px slim), like cm-button. */
      .more::part(trigger) { min-height: var(--cm-control-height-md, 36px); padding: 0 var(--cm-space-16); font-size: var(--cm-font-size-14); }
      .more.slim::part(trigger) { min-height: var(--cm-control-height-sm, 32px); padding: 0 var(--cm-space-12); font-size: var(--cm-font-size-13); }
      .more.large::part(trigger) { min-height: var(--cm-control-height-lg, 40px); padding: 0 var(--cm-space-20); }
      /* Icon-only: a square outlined like a secondary icon button. */
      .more.icon::part(trigger) {
        width: var(--cm-control-height-md, 36px); padding: 0; background: var(--cm-bg-surface); border-color: var(--cm-border-input);
      }
      .more.icon.slim::part(trigger) { width: var(--cm-control-height-sm, 32px); }
      .more.icon.large::part(trigger) { width: var(--cm-control-height-lg, 40px); }
      .more.icon::part(trigger):hover, .more.icon[open]::part(trigger) { background: var(--cm-bg-hover); }
      @media (pointer: coarse) {
        .more::part(trigger), .more.slim::part(trigger) { min-height: var(--cm-control-height-lg, 40px); }
        .more.icon::part(trigger), .more.icon.slim::part(trigger) { width: var(--cm-control-height-lg, 40px); }
      }
    `,
  ];

  /** The buttons currently moved into the More menu, in reading order. */
  get overflowing(): HTMLElement[] { return [...this.#hidden]; }

  connectedCallback() {
    super.connectedCallback();
    this.#mo = new MutationObserver((records) => this.#mutated(records));
    this.#mo.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: WATCHED });
    if (typeof ResizeObserver !== 'undefined') {
      // The group, the More trigger and each button: their widths change with the page, fonts and late rendering.
      // Layout runs a frame later, never inside this callback, so it can't cause a resize loop.
      this.#ro = new ResizeObserver(() => this.#schedule());
      this.#ro.observe(this);
      this.#watched = new Set([this]);
    }
    document.fonts?.ready.then(() => this.#schedule());
    this.#schedule();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#mo?.disconnect();
    this.#ro?.disconnect();
    this.#watched.clear();
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#restore(this.#buttons());
  }

  protected updated(changed: PropertyValues) {
    if (changed.has('overflow') || changed.has('moreLabel') || changed.has('moreIcon') || changed.has('size')) this.#schedule();
  }

  // Lay out straight after the first render (a microtask, so before the first paint).
  protected firstUpdated() { this.updateComplete.then(() => this.relayout()); }

  /** Measures again and moves buttons into or out of the More menu. Runs by itself on resize and on changes to the buttons. */
  relayout() {
    cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#layout();
  }

  #schedule() {
    if (this.#frame || !this.isConnected) return;
    this.#frame = requestAnimationFrame(() => {
      this.#frame = 0;
      // Wait for buttons that are still rendering, so their widths are real.
      const pending = this.#buttons().map((b) => (b as { updateComplete?: Promise<unknown> }).updateComplete).filter(Boolean);
      if (pending.length) Promise.all(pending).then(() => this.#layout());
      else this.#layout();
    });
  }

  #mutated(records: MutationRecord[]) {
    for (const r of records) {
      // A button taken out of the group while it was in the menu gets its place back.
      for (const n of Array.from(r.removedNodes)) {
        if (n instanceof HTMLElement && n.hasAttribute(MOVED) && n.parentElement !== this) { n.removeAttribute(MOVED); n.hidden = false; }
      }
    }
    this.#schedule();
  }

  /** The children that can move into the menu: cm-buttons the app hasn't hidden itself. */
  #buttons(): HTMLElement[] {
    return (Array.from(this.children) as HTMLElement[]).filter((c) => c.localName === 'cm-button' && (!c.hidden || c.hasAttribute(MOVED)));
  }

  #restore(list: HTMLElement[]) {
    for (const b of list) if (b.hasAttribute(MOVED)) { b.removeAttribute(MOVED); b.hidden = false; }
  }

  #more() { return this.renderRoot.querySelector<HTMLElement & { open: boolean }>('.more'); }

  #layout() {
    const row = this.renderRoot.querySelector<HTMLElement>('.row');
    const more = this.#more();
    if (!row || !more || !this.isConnected) return;
    const buttons = this.#buttons();
    // Where focus is now, so it isn't lost when its element moves into the menu or More goes away.
    const hadFocus = this.shadowRoot!.activeElement === more ? more : buttons.find((b) => b.matches(':focus-within')) ?? null;
    const first = buttons[0]?.getAttribute('size');
    this._size = this.size || (first === 'slim' || first === 'large' ? first : 'medium');
    const hide = new Set<HTMLElement>();
    if (this.#ro) {
      const now = new Set<Element>([this, more, ...buttons]);
      for (const el of this.#watched) if (!now.has(el)) this.#ro.unobserve(el);
      for (const el of now) if (!this.#watched.has(el)) this.#ro.observe(el);
      this.#watched = now;
    }
    if (this.overflow === 'menu') {
      // Measure every item as if all fit: put the moved buttons back for a moment (no paint happens in between).
      this.#restore(buttons);
      more.hidden = false;
      const avail = row.clientWidth;
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const items = (Array.from(this.children) as HTMLElement[]).filter((c) => !c.hidden);
      const width = new Map(items.map((c) => [c, c.getBoundingClientRect().width] as const));
      const total = items.reduce((s, c) => s + width.get(c)!, 0) + gap * Math.max(items.length - 1, 0);
      if (total > avail + 0.5) {
        const rank = (b: HTMLElement) => {
          const p = b.dataset.priority;
          return p === 'low' ? 0 : p === 'high' ? 2 : b.getAttribute('variant') === 'primary' ? 3 : 1;
        };
        // Least important first; among equals, the last in reading order first.
        const order = buttons.map((b, i) => ({ b, i, r: rank(b) })).sort((a, z) => a.r - z.r || z.i - a.i);
        let used = total + gap + more.getBoundingClientRect().width;
        for (const { b } of order) {
          if (used <= avail + 0.5) break;
          hide.add(b);
          used -= width.get(b)! + gap;
        }
      }
    }
    for (const b of buttons) {
      if (hide.has(b)) { b.setAttribute(MOVED, ''); b.hidden = true; }
      else if (b.hasAttribute(MOVED)) { b.removeAttribute(MOVED); b.hidden = false; }
    }
    more.hidden = hide.size === 0;
    if (hadFocus === more && more.hidden) this.#focusLastButton();
    else if (hadFocus && hadFocus !== more && hide.has(hadFocus)) this.#focusMore();
    if (hide.size === 0 && more.open) (more as unknown as { hide(f?: boolean): void }).hide();
    // Our own attribute changes are not changes to the buttons.
    this.#mo?.takeRecords();
    const hidden = buttons.filter((b) => hide.has(b));
    this._items = hidden.map((b, i) => this.#item(b, i));
    const changed = hidden.length !== this.#hidden.length || hidden.some((b, i) => b !== this.#hidden[i]);
    this.#hidden = hidden;
    if (changed) this.dispatchEvent(new CustomEvent('cm-overflow-change', { detail: { hidden: [...hidden] }, bubbles: true, composed: true }));
    if (this.#refocus) this.updateComplete.then(() => this.#rescueFocus());
  }

  #item(b: HTMLElement, i: number): MenuItem {
    const text = Array.from(b.childNodes)
      .filter((n) => !(n instanceof Element && n.hasAttribute('slot')))
      .map((n) => n.textContent ?? '').join('').replace(/\s+/g, ' ').trim();
    const label = b.hasAttribute('icon-only') ? b.getAttribute('label') || text : text || b.getAttribute('label') || '';
    const icon = b.getAttribute('icon') || b.querySelector(':scope > [slot="icon"]')?.getAttribute('name') || undefined;
    return {
      label, value: String(i), icon,
      disabled: b.hasAttribute('disabled') || b.hasAttribute('loading') || undefined,
      critical: b.getAttribute('tone') === 'critical' || undefined,
    };
  }

  #choose = (e: CustomEvent<{ value: string }>) => {
    // The group's menu is an implementation detail: the original button's click is the event apps listen to.
    e.stopPropagation();
    const b = this.#hidden[Number(e.detail.value)];
    if (!b) return;
    this.#refocus = true;
    const control = b.shadowRoot?.querySelector<HTMLElement>('[part="control"]');
    (control ?? b).click();
    requestAnimationFrame(() => requestAnimationFrame(() => this.#rescueFocus()));
  };

  /** After a menu choice, if the page lost focus (the More trigger went away), put it back in the group. */
  #rescueFocus() {
    if (!this.#refocus) return;
    this.#refocus = false;
    const active = document.activeElement;
    const more = this.#more();
    const lost = !active || active === document.body || active === document.documentElement
      || (active === this && (!more || more.hidden || this.shadowRoot!.activeElement !== more));
    if (!lost) return;
    if (more && !more.hidden) this.#focusMore();
    else this.#focusLastButton();
  }

  #focusMore() { this.#more()?.shadowRoot?.querySelector<HTMLElement>('[part="trigger"]')?.focus(); }

  #focusLastButton() {
    const visible = this.#buttons().filter((b) => !b.hidden && !b.hasAttribute('disabled'));
    const last = visible[visible.length - 1];
    (last?.shadowRoot?.querySelector<HTMLElement>('[part="control"]') ?? last)?.focus();
  }


  render() {
    const icon = this.moreIcon != null;
    return html`<div class="row" part="row" role="group" aria-label=${this.label || nothing}>
      <slot></slot>
      <cm-action-menu class="more ${this._size}${icon ? ' icon' : ''}" part="more" hidden align="end"
        .items=${this._items} label=${this.moreLabel} ?icon-only=${icon} icon=${this.moreIcon || 'more'}
        @cm-select=${this.#choose}></cm-action-menu>
    </div>`;
  }
}
define('cm-button-group', CmButtonGroup);

declare global { interface HTMLElementTagNameMap { 'cm-button-group': CmButtonGroup } }
