import { LitElement, html, css } from 'lit';
import { base, define, nextId } from '../base.js';

const FOCUSABLE = 'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [part="control"]';

/**
 * Short text that names or explains a control, shown on hover (after 400ms) and at once on keyboard focus; it hides
 * as soon as the pointer leaves or focus moves on. 12px text on a dark surface, 8 x 12px padding, 6px corners, at
 * most 240px wide (owner standard, 1.6). A tooltip is never the only way to get information: whatever it says must
 * also be in the page, the control's label or its help text, because touch screens never show it.
 * Wrap exactly one focusable element. The text becomes that element's accessible description, so screen readers
 * hear it too. It stays open while the pointer is over the control or the tooltip, and Esc closes it
 * (WCAG 1.4.13). Text only: never put links or buttons in a tooltip.
 *
 * An icon-only button still needs its own accessible name (visually hidden text or `aria-label`): the tooltip
 * describes, it does not name.
 * @element cm-tooltip
 * @slot - The one focusable element the tooltip belongs to (a `cm-button`, a link, an input…).
 * @fires cm-show - When the tooltip appears.
 * @fires cm-hide - When the tooltip disappears.
 */
export class CmTooltip extends LitElement {
  static properties = {
    content: {},
    placement: { reflect: true },
    delay: { type: Number },
    open: { type: Boolean, reflect: true },
    visualOnly: { type: Boolean, attribute: 'visual-only' },
    _side: { state: true },
  };

  /** The tooltip text. Plain text, ideally under 80 characters. */
  content = '';
  /** Preferred side. It flips to the opposite side when there is no room. */
  placement: 'top' | 'bottom' | 'start' | 'end' = 'top';
  /** Wait before showing on hover, in ms. Keyboard focus shows it at once. Default 400 (since 1.6; was 300). */
  delay = 400;
  /** True while the tooltip is shown. Read it; use `show()` / `hide()` to change it. */
  open = false;
  /**
   * Shows the bubble without adding its text to the control's accessible description. Use it only when the text
   * repeats the control's accessible name, such as the label of an icon-only navigation item, so screen readers
   * don't hear it twice.
   */
  visualOnly = false;
  _side: 'top' | 'bottom' | 'start' | 'end' = 'top';

  #desc?: HTMLSpanElement;
  #target?: HTMLElement;
  /** For a control inside the trigger's shadow root: its own `aria-describedby` ids (help, error text). */
  #ownIds: string[] = [];
  #watch?: MutationObserver;
  #timer?: ReturnType<typeof setTimeout>;
  #hovered = false;
  #focused = false;

  static styles = [
    base,
    css`
      :host { display: inline-block; position: relative; }
      .tip {
        position: fixed; top: 0; left: 0; z-index: 1100; box-sizing: border-box;
        max-width: min(240px, calc(100vw - 16px)); width: max-content;
        padding: var(--cm-space-8) var(--cm-space-12); border-radius: var(--cm-radius-sm);
        background: var(--cm-bg-panel-header); color: var(--cm-text-on-dark);
        font-size: 12px; line-height: 16px; font-weight: 400; white-space: normal; overflow-wrap: anywhere;
        box-shadow: var(--cm-shadow-sm); pointer-events: auto;
        opacity: 0; visibility: hidden;
      }
      /* The pointer can cross the 8px gap onto the bubble without leaving (WCAG 1.4.13 hoverable): the bubble is in this
         element's shadow tree, and this strip bridges the gap. */
      .tip::before { content: ''; position: absolute; inset: calc(-1 * var(--cm-space-8)); }
      :host([open]) .tip { opacity: 1; visibility: visible; transition: opacity var(--cm-duration-fast) var(--cm-easing-standard); }
      @media (prefers-reduced-motion: reduce) { .tip { transition: none; } }
      @media (forced-colors: active) { .tip { border: 1px solid CanvasText; } }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('pointerenter', this.#onEnter);
    this.addEventListener('pointerleave', this.#onLeave);
    this.addEventListener('focusin', this.#onFocusIn);
    this.addEventListener('focusout', this.#onFocusOut);
    this.addEventListener('keydown', this.#onKey);
    // Moved in the page: slotchange won't fire again, so link here.
    if (this.hasUpdated) this.#link();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.hide();
    this.#unlink();
    this.#stopTracking();
    clearTimeout(this.#timer);
  }

  /** Shows the tooltip now. */
  show() {
    clearTimeout(this.#timer);
    if (this.open || !this.content) return;
    this.open = true;
    document.addEventListener('keydown', this.#onKey, true);
    addEventListener('scroll', this.#place, true);
    addEventListener('resize', this.#place);
    this.updateComplete.then(this.#place);
    this.dispatchEvent(new CustomEvent('cm-show', { bubbles: true, composed: true }));
  }

  /** Hides the tooltip now. */
  hide() {
    clearTimeout(this.#timer);
    if (!this.open) return;
    this.open = false;
    this.#stopTracking();
    this.dispatchEvent(new CustomEvent('cm-hide', { bubbles: true, composed: true }));
  }

  #stopTracking() {
    document.removeEventListener('keydown', this.#onKey, true);
    removeEventListener('scroll', this.#place, true);
    removeEventListener('resize', this.#place);
  }

  #onEnter = () => {
    this.#hovered = true;
    clearTimeout(this.#timer);
    if (!this.open) this.#timer = setTimeout(() => this.show(), this.delay);
  };
  #onLeave = () => {
    this.#hovered = false;
    clearTimeout(this.#timer);
    if (!this.#focused) this.hide();
  };
  #onFocusIn = () => { this.#focused = true; this.show(); };
  #onFocusOut = (e: FocusEvent) => {
    if (e.relatedTarget && this.contains(e.relatedTarget as Node)) return;
    this.#focused = false;
    if (!this.#hovered) this.hide();
  };
  #onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) { this.hide(); }
  };

  /** Finds the element that takes focus: the trigger itself, or the control inside its shadow root. */
  #focusTarget(trigger: HTMLElement): HTMLElement {
    if (trigger.matches(FOCUSABLE) && !trigger.shadowRoot) return trigger;
    return (trigger.shadowRoot?.querySelector(FOCUSABLE) as HTMLElement | null) ?? trigger;
  }

  #link = () => {
    const slot = this.renderRoot.querySelector('slot');
    const trigger = slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined;
    this.#unlink();
    if (!trigger || !this.content || this.visualOnly) return;
    // A component trigger renders its control later: link once it has.
    const pending = (trigger as { updateComplete?: Promise<unknown> }).updateComplete;
    if (trigger.localName.includes('-') && pending && !trigger.shadowRoot?.querySelector(FOCUSABLE)) {
      pending.then(() => { if (trigger.shadowRoot?.querySelector(FOCUSABLE)) this.#link(); });
    }
    if (!this.#desc) {
      this.#desc = document.createElement('span');
      this.#desc.id = nextId('cm-tooltip');
      this.#desc.hidden = true;
      this.#desc.slot = 'description'; // never rendered: there is no such slot
    }
    this.#desc.textContent = this.content;
    if (!this.#desc.isConnected) this.append(this.#desc);
    const target = this.#focusTarget(trigger);
    this.#target = target;
    if (target.getRootNode() === this.#desc.getRootNode()) {
      const ids = (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
      if (!ids.includes(this.#desc.id)) target.setAttribute('aria-describedby', [...ids, this.#desc.id].join(' '));
    } else if ('ariaDescribedByElements' in target) {
      // The control is inside the trigger's shadow root: IDs can't reach it, element references can. Keep the
      // control's own descriptions (help and error text) and add the tooltip's. When the component rewrites its
      // aria-describedby (an error appears), that replaces the references, so merge again.
      this.#merge(target);
      this.#watch = new MutationObserver(() => {
        // Our own write leaves the attribute empty; anything else is the component's.
        if (target.getAttribute('aria-describedby') !== '') this.#merge(target);
      });
      this.#watch.observe(target, { attributes: true, attributeFilter: ['aria-describedby'] });
    } else {
      trigger.setAttribute('aria-describedby', this.#desc.id);
    }
  };

  #merge(target: HTMLElement) {
    this.#ownIds = (target.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean);
    const root = target.getRootNode() as Document | ShadowRoot;
    const own = this.#ownIds.map((id) => root.getElementById(id)).filter((e): e is HTMLElement => !!e);
    (target as any).ariaDescribedByElements = [...own, this.#desc];
  }

  #unlink() {
    const t = this.#target;
    if (!t || !this.#desc) return;
    if (this.#watch) {
      // Give the control back exactly the descriptions it had.
      this.#watch.disconnect();
      this.#watch = undefined;
      if (this.#ownIds.length) t.setAttribute('aria-describedby', this.#ownIds.join(' ')); else t.removeAttribute('aria-describedby');
      this.#ownIds = [];
    } else {
      const ids = (t.getAttribute('aria-describedby') ?? '').split(/\s+/).filter((id) => id && id !== this.#desc!.id);
      if (ids.length) t.setAttribute('aria-describedby', ids.join(' ')); else t.removeAttribute('aria-describedby');
    }
    this.#target = undefined;
  }

  #place = () => {
    const tip = this.renderRoot.querySelector('.tip') as HTMLElement | null;
    if (!tip || !this.open) return;
    const slot = this.renderRoot.querySelector('slot');
    const anchor = (slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined) ?? this;
    const r = anchor.getBoundingClientRect();
    const t = tip.getBoundingClientRect();
    const gap = 8, pad = 8, vw = innerWidth, vh = innerHeight;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const logical = (p: string) => (p === 'start' ? (rtl ? 'right' : 'left') : p === 'end' ? (rtl ? 'left' : 'right') : p);
    const fits = { top: r.top - gap - t.height >= pad, bottom: r.bottom + gap + t.height <= vh - pad,
      left: r.left - gap - t.width >= pad, right: r.right + gap + t.width <= vw - pad } as Record<string, boolean>;
    const opposite: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    let side = logical(this.placement);
    if (!fits[side] && fits[opposite[side]]) side = opposite[side];
    let x: number, y: number;
    if (side === 'top' || side === 'bottom') {
      x = r.left + r.width / 2 - t.width / 2;
      y = side === 'top' ? r.top - gap - t.height : r.bottom + gap;
    } else {
      y = r.top + r.height / 2 - t.height / 2;
      x = side === 'left' ? r.left - gap - t.width : r.right + gap;
    }
    x = Math.min(Math.max(pad, x), vw - pad - t.width);
    y = Math.min(Math.max(pad, y), vh - pad - t.height);
    tip.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    const back: Record<string, 'top' | 'bottom' | 'start' | 'end'> = { top: 'top', bottom: 'bottom', left: rtl ? 'end' : 'start', right: rtl ? 'start' : 'end' };
    this._side = back[side];
  };

  updated(changed: Map<string, unknown>) {
    if (changed.has('content') || changed.has('visualOnly')) {
      this.#link();
      if (!this.content) this.hide(); else if (this.open) this.#place();
    }
  }

  render() {
    // The bubble repeats the description visually; screen readers get it from the trigger's description.
    return html`<slot @slotchange=${this.#link}></slot><div class="tip" part="tooltip" role="tooltip" aria-hidden="true"
      data-side=${this._side}>${this.content}</div>`;
  }
}
define('cm-tooltip', CmTooltip);

declare global { interface HTMLElementTagNameMap { 'cm-tooltip': CmTooltip } }
