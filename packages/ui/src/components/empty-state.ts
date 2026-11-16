import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import type { IconName } from '@commmerce/icons';
import './icon.js';

/**
 * Shown in place of a list or page when there is nothing to show yet, with the next step to take.
 * A soft circle holds an illustration (an image, your own markup or one of the system icons).
 * `size="inline"` is the compact form for an empty list inside a card or table: one or two left-aligned lines,
 * an optional small icon and an optional text action, with no circle.
 * @element cm-empty-state
 * @slot - Optional supporting text under the heading (inline: after it, on the same line).
 * @slot image - Your own illustration, drawn inside the circle. Decorative: give it `alt=""`. Inline: 20px.
 * @slot actions - The primary action (usually one primary `cm-button`), plus an optional link.
 * @fires cm-action - The text action (`action`) was pressed. Not fired when it has `action-href` (it is then a link).
 */
export class CmEmptyState extends LitElement {
  static properties = {
    heading: {},
    image: {},
    icon: {},
    headingLevel: { type: Number, attribute: 'heading-level' },
    size: { reflect: true },
    action: {},
    actionHref: { attribute: 'action-href' },
  };

  /** What is missing, said plainly: "No products found". */
  heading = '';
  /** URL of an illustration shown in the circle. Decorative, so it has no alt text. */
  image = '';
  /** System icon shown in the circle when there is no `image` or `image` slot. */
  icon: IconName | '' = 'box';
  /** Heading level, so the page outline stays correct. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;
  /**
   * `large` (160px circle, page-level), `small` (120px circle, inside a card or on mobile) or `inline`
   * (since 1.2: no circle, a 20px icon, heading and text on one or two left-aligned lines; for an empty list
   * inside a card, panel or table). Inline shows the `icon` (default `box`); set `icon=""` for text only.
   */
  size: 'large' | 'small' | 'inline' = 'large';
  /** Text of one action drawn as a text button ("Add task", "View all"), after the text. Meant for `size="inline"`; larger sizes put a `cm-button` in the `actions` slot. Fires `cm-action`. Since 1.2. */
  action = '';
  /** Makes the text action a link to this URL instead of a button. Since 1.2. */
  actionHref = '';

  static styles = [
    base,
    css`
      :host { display: block; }
      .wrap {
        display: flex; flex-direction: column; align-items: center; text-align: center;
        padding: var(--cm-space-32) var(--cm-space-20);
      }
      .circle {
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        width: 160px; height: 160px; border-radius: var(--cm-radius-full);
        background: var(--cm-bg-input-filled); color: var(--cm-icon-selected);
      }
      .circle img, ::slotted([slot='image']) { max-width: 66%; max-height: 66%; object-fit: contain; }
      .title { margin: var(--cm-space-24) 0 0; font-size: var(--cm-type-heading-sm-size); line-height: var(--cm-type-heading-sm-line-height); font-weight: 600; }
      .text { margin-top: var(--cm-space-4); max-width: 46ch; font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); color: var(--cm-text-tertiary); }
      .text[hidden], .actions[hidden] { display: none; }
      .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--cm-space-8); margin-top: var(--cm-space-16); }
      :host([size='small']) .wrap { padding: var(--cm-space-24) var(--cm-space-16); }
      :host([size='small']) .circle { width: 120px; height: 120px; }
      :host([size='small']) .title { margin-top: var(--cm-space-16); font-size: var(--cm-font-size-14); line-height: var(--cm-line-height-14); }
      /* Inline (1.2): a line of text with an optional 20px icon, no circle, no extra height. */
      .inline { flex-direction: row; align-items: flex-start; gap: var(--cm-space-8); padding: 0; text-align: start; font-size: 14px; line-height: 20px; }
      .inline .icon { display: inline-flex; flex: none; width: 20px; height: 20px; overflow: hidden; color: var(--cm-icon-default); }
      .inline .icon img, .inline ::slotted([slot='image']) { width: 20px; height: 20px; max-width: none; max-height: none; object-fit: contain; }
      .inline .line { min-width: 0; text-align: start; }
      .inline .title { display: inline; margin: 0; font-size: inherit; font-weight: 500; color: var(--cm-text-default); }
      .inline .text { display: inline; margin: 0; font-size: inherit; color: var(--cm-text-tertiary); }
      .inline .actions { display: inline-flex; vertical-align: middle; margin: 0; margin-inline-start: var(--cm-space-8); }
      .inline .text[hidden], .inline .actions[hidden], .inline .icon[hidden] { display: none; }
      .text-action {
        display: inline-flex; align-items: center; min-height: 24px; vertical-align: middle;
        margin: -2px 0; padding: 0 2px; border: 0; background: none; cursor: pointer;
        font: inherit; font-weight: 500; color: var(--cm-text-default);
        text-decoration: underline; text-underline-offset: 3px; border-radius: var(--cm-radius-xs);
      }
      .text-action:hover { text-decoration-thickness: 2px; }
      .text-action:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .inline .text-action { display: inline; min-height: 0; vertical-align: baseline; margin: 0; margin-inline-start: var(--cm-space-8); padding-block: 2px; }
      @media (max-width: 640px) {
        .circle { width: 120px; height: 120px; }
        .title { margin-top: var(--cm-space-16); }
      }
    `,
  ];

  /** @internal */
  hasText = false;
  /** @internal */
  hasActions = false;
  /** @internal */
  hasImage = false;

  #slot(e: Event, key: 'hasText' | 'hasActions' | 'hasImage') {
    const s = e.target as HTMLSlotElement;
    this[key] = s.assignedNodes({ flatten: true }).some((n) => n.nodeType === 1 || n.textContent!.trim());
    this.requestUpdate();
  }

  #textAction() {
    if (!this.action) return nothing;
    return this.actionHref
      ? html`<a class="text-action" part="action" href=${this.actionHref}>${this.action}</a>`
      : html`<button class="text-action" type="button" part="action"
          @click=${() => this.dispatchEvent(new CustomEvent('cm-action', { bubbles: true, composed: true }))}>${this.action}</button>`;
  }

  #renderInline(level: number) {
    const fallback = this.image
      ? html`<img src=${this.image} alt="" part="image">`
      : this.icon ? html`<cm-icon name=${this.icon} size="20"></cm-icon>` : nothing;
    return html`<div class="wrap inline" part="empty-state">
      <span class="icon" part="circle" aria-hidden=${this.hasImage ? nothing : 'true'} ?hidden=${!this.hasImage && !this.image && !this.icon}>
        <slot name="image" @slotchange=${(e: Event) => this.#slot(e, 'hasImage')}>${fallback}</slot>
      </span>
      <div class="line">
        <div class="title" role="heading" aria-level=${level} part="heading">${this.heading}</div>
        <span class="text" ?hidden=${!this.hasText}> <slot @slotchange=${(e: Event) => this.#slot(e, 'hasText')}></slot></span>${this.#textAction()}
        <span class="actions" ?hidden=${!this.hasActions}><slot name="actions" @slotchange=${(e: Event) => this.#slot(e, 'hasActions')}></slot></span>
      </div>
    </div>`;
  }

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    if (this.size === 'inline') return this.#renderInline(level);
    const fallback = this.image
      ? html`<img src=${this.image} alt="" part="image">`
      : this.icon ? html`<cm-icon name=${this.icon} size="48"></cm-icon>
` : nothing;
    return html`<div class="wrap" part="empty-state">
      <div class="circle" part="circle" aria-hidden=${this.hasImage ? nothing : 'true'}>
        <slot name="image" @slotchange=${(e: Event) => this.#slot(e, 'hasImage')}>${fallback}</slot>
      </div>
      <div class="title" role="heading" aria-level=${level} part="heading">${this.heading}</div>
      <div class="text" ?hidden=${!this.hasText}><slot @slotchange=${(e: Event) => this.#slot(e, 'hasText')}></slot></div>
      <div class="actions" ?hidden=${!this.hasActions}><slot name="actions" @slotchange=${(e: Event) => this.#slot(e, 'hasActions')}></slot></div>${
        this.action ? html`<div class="actions">${this.#textAction()}</div>` : nothing}
    </div>`;
  }
}
define('cm-empty-state', CmEmptyState);

declare global { interface HTMLElementTagNameMap { 'cm-empty-state': CmEmptyState } }
