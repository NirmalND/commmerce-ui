import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';

/**
 * White section card with optional title, description and header actions.
 *
 * Three variants (owner standard, 1.6): `standard` (the default: 24px padding, 16px between header and body, a subtle
 * border), `compact` (16px padding: dashboards, task summaries, metrics) and `interactive` (the whole card opens
 * something: hover, pressed, focus and `selected` states; set `href` for a link, or listen for `cm-action`).
 * Combine them with a space: `variant="interactive compact"`. On phones (640px or less) every card has 16px padding.
 *
 * An interactive card is one control: its heading (or `label`) is a link or button stretched over the whole card, so
 * keyboard users reach it with Tab and press it with Enter (and Space, for a button). Controls in the `actions` slot
 * stay separately clickable above it; don't put other controls in the body of an interactive card.
 *
 * On narrow cards the header wraps instead of squeezing the heading: the title adornment moves under the heading
 * when both don't fit on one line, and the actions move under the title when the title would be narrower than
 * about 12 characters. Wide cards keep everything on one row.
 * @element cm-card
 * @slot - Body.
 * @slot actions - Header actions (buttons, links), at the end of the header. Since 1.3 they also show on a card with no
 * `heading` or `description`, in a row of their own at the top of the card.
 * @slot title-adornment - Badge or icon next to the title.
 * @csspart card - The card's box.
 * @csspart title - The heading.
 * @csspart control - The link or button an interactive card is pressed through (stretched over the card).
 * @fires cm-action - An interactive card without `href` was pressed (click, Enter or Space). Not fired by the header actions. Since 1.6.
 */
export class CmCard extends LitElement {
  static properties = {
    heading: {},
    description: {},
    flush: { type: Boolean, reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level' },
    variant: { reflect: true },
    href: {},
    target: {},
    selected: { type: Boolean, reflect: true },
    label: {},
  };

  /** Card title, rendered as a heading at `heading-level`. */
  heading = '';
  /** One sentence under the title, 13px in text-tertiary. */
  description = '';
  /** Removes body padding, for lists and tables that run edge to edge. */
  flush = false;
  /** Heading level for the title, so pages keep a correct outline. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;
  /**
   * `standard` (default: 24px padding), `compact` (16px padding, for dashboards, task summaries and metrics) or
   * `interactive` (the whole card is a link or button, with hover, pressed, focus and selected states). Combine
   * with a space, e.g. `interactive compact`. Phones always get 16px padding. Since 1.6.
   */
  variant: 'standard' | 'compact' | 'interactive' | 'interactive compact' | 'compact interactive' = 'standard';
  /** Interactive cards: the address the card opens. Without it the card is a button that fires `cm-action`. Since 1.6. */
  href = '';
  /** Link target when `href` is set. `_blank` adds `rel="noopener noreferrer"`. Since 1.6. */
  target = '';
  /** Interactive cards: shows the card as chosen (a 2px dark outline). A button card reports it as pressed, a link card as the current one. Since 1.6. */
  selected = false;
  /** Interactive cards without a `heading`: the accessible name of the card's link or button. Since 1.6. */
  label = '';

  #adorned = false;
  #bareActions = false;

  static styles = [
    base,
    css`
      /* Owner standard (1.6): 24px padding and a 16px gap under the header; compact 16px and 12px; 16px on phones. */
      :host { display: block; --_pad: var(--cm-space-24); --_gap: var(--cm-space-16); }
      :host([variant~='compact']) { --_pad: var(--cm-space-16); --_gap: var(--cm-space-12); }
      @media (max-width: 640px) { :host { --_pad: var(--cm-space-16); } }
      /* Flat: a 1px border-subtle and no shadow (shadows are for overlays). */
      section {
        position: relative; background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-subtle);
        border-radius: var(--cm-radius-md); padding: var(--_pad);
        font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14);
      }
      :host([flush]) section { padding: 0; }
      /* Interactive (1.6): hover darkens the outline and tints the card, pressing tints it a step more, focus draws the
         2px ring outside the card, selected draws a 2px dark outline. The control's ::after covers the card. */
      :host([variant~='interactive']) section { cursor: pointer; transition: background-color var(--cm-duration-fast) var(--cm-easing-standard), border-color var(--cm-duration-fast) var(--cm-easing-standard); }
      :host([variant~='interactive']) section:hover { border-color: var(--cm-border-input); background: var(--cm-bg-hover); }
      :host([variant~='interactive']) section:active { background: color-mix(in srgb, var(--cm-bg-hover), var(--cm-text-default) 6%); }
      :host([variant~='interactive'][selected]) section { border-color: var(--cm-border-strong); box-shadow: inset 0 0 0 1px var(--cm-border-strong); }
      @media (prefers-reduced-motion: reduce) { :host([variant~='interactive']) section { transition: none; } }
      .hit { color: inherit; text-decoration: none; font: inherit; background: none; border: 0; padding: 0; margin: 0; text-align: inherit; cursor: pointer; outline: none; }
      .hit::after { content: ''; position: absolute; inset: calc(-1 * var(--cm-border-1)); z-index: 0; border-radius: var(--cm-radius-md); }
      .hit:focus-visible::after { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .hit:hover { text-decoration: underline; text-underline-offset: 3px; }
      .cover { position: absolute; inset: 0; }
      :host([variant~='interactive']) .actions, :host([variant~='interactive']) .bare { position: relative; z-index: 1; }
      /* Wraps only on narrow cards. .main grows from a 0 basis (wide cards look exactly as before: its content stays
         at the start), and its minimum width comes from .strut: the heading on one line, capped at 12 characters. So
         the actions move under the title only when the heading would get less than that. */
      header {
        display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between;
        gap: var(--cm-space-8) var(--cm-space-16); margin-bottom: var(--_gap);
      }
      /* Flush: the header keeps its padding and the body (a list, a table) starts right under it. */
      :host([flush]) header { padding: var(--_pad) var(--_pad) 0; margin-bottom: var(--cm-space-8); }
      .main { flex: 1 1 0%; max-inline-size: 100%; align-self: center; }
      .strut {
        display: block; block-size: 0; overflow: hidden; visibility: hidden; white-space: nowrap;
        max-inline-size: 12ch; font-size: var(--cm-type-heading-sm-size); font-weight: 600;
      }
      .title {
        margin: 0; font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600;
        display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-8);
      }
      /* Flex-wrap moves the badges under the heading before the heading itself would wrap. */
      .adornment { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cm-space-8); }
      .adornment[hidden] { display: none; }
      .desc { margin: var(--cm-space-4) 0 0; font-size: var(--cm-font-size-13); line-height: var(--cm-line-height-13); color: var(--cm-text-tertiary); }
      .actions { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); align-items: center; }
      /* Actions on a card without a heading or description: a row of their own, at the end. */
      .bare { display: flex; justify-content: flex-end; margin-bottom: var(--_gap); }
      .bare[hidden] { display: none; }
      :host([flush]) .bare { padding: var(--_pad) var(--_pad) 0; margin-bottom: var(--cm-space-8); }
    `,
  ];

  #onAdornment(e: Event) {
    const adorned = (e.target as HTMLSlotElement).assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim());
    if (adorned !== this.#adorned) { this.#adorned = adorned; this.requestUpdate(); }
  }

  #onBareActions(e: Event) {
    const has = (e.target as HTMLSlotElement).assignedNodes().some((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim());
    if (has !== this.#bareActions) { this.#bareActions = has; this.requestUpdate(); }
  }

  /** Set once the card has been `selected`: from then on a button card reports pressed or not pressed (a toggle). */
  #toggles = false;

  willUpdate() { if (this.selected) this.#toggles = true; }

  /** Whether `variant` includes `interactive`. */
  get #interactive() { return String(this.variant || '').split(/\s+/).includes('interactive'); }

  #onControl = () => {
    if (!this.href) this.dispatchEvent(new CustomEvent('cm-action', { bubbles: true, composed: true }));
  };

  /** The link or button an interactive card is pressed through; `text` is its content (the heading), or empty for a cover. */
  #control(text: unknown) {
    const cls = text === nothing ? 'hit cover' : 'hit';
    const name = text === nothing ? this.label || nothing : nothing;
    return this.href
      ? html`<a class=${cls} part="control" href=${this.href} target=${this.target || nothing} rel=${this.target === '_blank' ? 'noopener noreferrer' : nothing}
          aria-current=${this.selected ? 'true' : nothing} aria-label=${name}>${text}</a>`
      : html`<button class=${cls} part="control" type="button" aria-pressed=${this.selected ? 'true' : this.#toggles ? 'false' : nothing} aria-label=${name} @click=${this.#onControl}>${text}</button>`;
  }

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    const interactive = this.#interactive;
    const text = interactive ? this.#control(this.heading) : this.heading;
    const title = this.heading
      ? html`<div role="heading" aria-level=${level} class="title" part="title"><span class="text">${text}</span><span class="adornment" ?hidden=${!this.#adorned}><slot name="title-adornment" @slotchange=${this.#onAdornment}></slot></span></div>`
      : nothing;
    return html`<section part="card" aria-label=${(!interactive && this.heading) || nothing}>${interactive && !this.heading ? this.#control(nothing) : nothing}
      ${this.heading || this.description
        ? html`<header><div class="main">${this.heading ? html`<span class="strut" aria-hidden="true">${this.heading}</span>` : nothing}${title}${this.description ? html`<p class="desc">${this.description}</p>` : nothing}</div>
            <div class="actions"><slot name="actions"></slot></div></header>`
        : html`<div class="bare" ?hidden=${!this.#bareActions}><div class="actions"><slot name="actions" @slotchange=${this.#onBareActions}></slot></div></div>`}
      <slot></slot>
    </section>`;
  }
}
define('cm-card', CmCard);

declare global { interface HTMLElementTagNameMap { 'cm-card': CmCard } }
