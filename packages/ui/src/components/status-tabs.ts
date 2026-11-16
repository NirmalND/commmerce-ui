import { LitElement, html, css, nothing } from 'lit';
import { base, define, logicalKey } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';

/** One status tab. */
export interface StatusTab {
  value: string;
  label: string;
  /** Number shown in brackets after the label, e.g. `All ( 233 )`. */
  count?: number;
  disabled?: boolean;
}

const strings = defineStrings('statusTabs', {
  /** Accessible name of the tab list when the element has no `aria-label`. */
  label: 'Status',
});
declare module '../localize.js' { interface CmStrings { statusTabs: typeof strings } }

/**
 * A row of statuses that filters the list under it, such as All, Unprocessed, Processing, Fulfilled.
 * The chosen status is black and underlined; the others are grey. Each label can carry a count.
 * Works as ARIA tabs: one tab stop, arrow keys move and select, Home/End jump to the ends.
 * Too many tabs for the width scroll sideways.
 *
 * Tabs come from `<option>` children (`count` attribute for the number) or the `tabs` property.
 * @element cm-status-tabs
 * @slot - `<option value="…" count="23">Label</option>` elements. `disabled` and `selected` are honoured.
 * @fires change - When the merchant picks another status. Read `value`.
 */
export class CmStatusTabs extends CmLocalizedElement {
  static properties = {
    value: { reflect: true },
    tabs: { type: Array },
    controls: {},
    size: { reflect: true },
    _slotted: { state: true },
  };

  /** Value of the chosen tab. Defaults to the first tab. */
  value = '';
  /** Tabs as strings or `{ value, label, count, disabled }`. Used instead of `<option>` children when set. */
  tabs: Array<string | StatusTab> = [];
  /**
   * Id of the list or panel the tabs filter (in the same document or shadow root as the tabs). Each tab is linked to it
   * with ARIA element reflection (`ariaControlsElements`), since an `aria-controls` id cannot point out of a shadow root.
   * Browsers without element reflection skip the link.
   */
  controls = '';
  /** `large` (18px, page-level order statuses) or `small` (14px, inside a card, e.g. review sorting). */
  size: 'large' | 'small' = 'large';

  _slotted: StatusTab[] = [];
  #observer = new MutationObserver(() => this.#readChildren());

  static styles = [
    base,
    css`
      :host { display: block; }
      .tabs {
        display: flex; gap: 28px; overflow-x: auto; scrollbar-width: thin; padding: 2px 2px 0;
        font-size: 18px; font-weight: 500; white-space: nowrap;
      }
      button {
        position: relative; flex: none; padding: 0 0 12px; font: inherit; color: var(--cm-text-tertiary);
        background: none; border: 0; cursor: pointer;
      }
      button::after {
        content: ''; position: absolute; inset-inline: 0; bottom: 4px; height: 2px; border-radius: 1px; background: transparent;
      }
      button:hover:not(:disabled) { color: var(--cm-text-default); }
      button[aria-selected='true'] { color: var(--cm-text-default); }
      button[aria-selected='true']::after { background: var(--cm-border-strong); }
      button:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; border-radius: var(--cm-radius-xs); }
      button:disabled { color: var(--cm-text-secondary); cursor: not-allowed; }
      .count { font-size: 0.89em; }
      :host([size='small']) .tabs { gap: 18px; font-size: 14px; }
      slot { display: none; }
      @media (max-width: 640px) {
        .tabs { gap: 18px; font-size: 14px; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#readChildren();
    this.#observer.observe(this, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['value', 'label', 'count', 'disabled', 'selected'] });
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  /** The tabs in use, normalised. */
  get items(): StatusTab[] {
    if (!this.tabs.length) return this._slotted;
    return this.tabs.map((t) => (typeof t === 'string' ? { value: t, label: t } : t));
  }

  /** Focuses the selected tab. */
  override focus(options?: FocusOptions) {
    this.renderRoot.querySelector<HTMLElement>('button[tabindex="0"]')?.focus(options);
  }

  #readChildren() {
    const opts = [...this.querySelectorAll('option')];
    this._slotted = opts.map((o) => {
      const c = o.getAttribute('count');
      return { value: o.value, label: o.label || o.textContent!.trim(), count: c === null || c === '' ? undefined : Number(c), disabled: o.disabled };
    });
    if (!this.hasUpdated && !this.value) this.value = opts.find((o) => o.hasAttribute('selected'))?.value ?? '';
  }

  #current(items: StatusTab[]) {
    const i = items.findIndex((t) => t.value === this.value && !t.disabled);
    return i >= 0 ? i : items.findIndex((t) => !t.disabled);
  }

  #select(i: number) {
    const t = this.items[i];
    if (!t || t.disabled) return;
    this.updateComplete.then(() => {
      const b = this.renderRoot.querySelectorAll('button')[i];
      b?.focus();
      b?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    });
    if (t.value === this.value) return;
    this.value = t.value;
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }

  #onKeyDown(e: KeyboardEvent, i: number) {
    const key = logicalKey(e, this);
    const en = this.items.flatMap((t, j) => (t.disabled ? [] : [j]));
    const pos = en.indexOf(i);
    let next: number | undefined;
    if (key === 'ArrowRight') next = en[(pos + 1) % en.length];
    else if (key === 'ArrowLeft') next = en[(pos - 1 + en.length) % en.length];
    else if (e.key === 'Home') next = en[0];
    else if (e.key === 'End') next = en[en.length - 1];
    else return;
    e.preventDefault();
    if (next !== undefined) this.#select(next);
  }

  updated() {
    if (!('ariaControlsElements' in Element.prototype)) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const target = this.controls ? root.getElementById?.(this.controls) : null;
    for (const b of this.renderRoot.querySelectorAll('button')) (b as any).ariaControlsElements = target ? [target] : null;
  }

  render() {
    const items = this.items;
    const cur = this.#current(items);
    return html`
      <div class="tabs" part="tabs" role="tablist" aria-label=${this.getAttribute('aria-label') || this.t('label')}>
        ${items.map((t, i) => html`<button type="button" role="tab" part="tab" aria-selected=${i === cur ? 'true' : 'false'}
            tabindex=${i === cur ? '0' : '-1'} ?disabled=${!!t.disabled}
            @click=${() => this.#select(i)} @keydown=${(e: KeyboardEvent) => this.#onKeyDown(e, i)}>${t.label}${t.count !== undefined && !Number.isNaN(t.count)
              ? html` <span class="count">(</span> ${this.formatNumber(t.count)} <span class="count">)</span>`
              : nothing}</button>`)}
      </div>
      <slot></slot>
    `;
  }
}
define('cm-status-tabs', CmStatusTabs);

declare global { interface HTMLElementTagNameMap { 'cm-status-tabs': CmStatusTabs } }
