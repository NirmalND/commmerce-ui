import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import type { IconName } from '@commmerce/icons';
import './icon.js';

/**
 * Shown in place of a list or page when there is nothing to show yet, with the next step to take.
 * A soft circle holds an illustration (an image, your own markup or one of the system icons).
 * @element cm-empty-state
 * @slot - Optional supporting text under the heading.
 * @slot image - Your own illustration, drawn inside the circle. Decorative: give it `alt=""`.
 * @slot actions - The primary action (usually one primary `cm-button`), plus an optional link.
 */
export class CmEmptyState extends LitElement {
  static properties = {
    heading: {},
    image: {},
    icon: {},
    headingLevel: { type: Number, attribute: 'heading-level' },
    size: { reflect: true },
  };

  /** What is missing, said plainly: "No products found". */
  heading = '';
  /** URL of an illustration shown in the circle. Decorative, so it has no alt text. */
  image = '';
  /** System icon shown in the circle when there is no `image` or `image` slot. */
  icon: IconName | '' = 'box';
  /** Heading level, so the page outline stays correct. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;
  /** `large` (250px circle, page-level) or `small` (200px circle, inside a card or on mobile). */
  size: 'large' | 'small' = 'large';

  static styles = [
    base,
    css`
      :host { display: block; }
      .wrap {
        display: flex; flex-direction: column; align-items: center; text-align: center;
        padding: var(--cm-space-30) var(--cm-space-20);
      }
      .circle {
        display: flex; align-items: center; justify-content: center; overflow: hidden;
        width: 250px; height: 250px; border-radius: var(--cm-radius-full);
        background: var(--cm-bg-input-filled); color: var(--cm-icon-selected);
      }
      .circle img, ::slotted([slot='image']) { max-width: 66%; max-height: 66%; object-fit: contain; }
      .title { margin: 40px 0 0; font-size: 16px; font-weight: 400; }
      .text { margin-top: var(--cm-space-10); max-width: 46ch; font-size: 14px; color: var(--cm-text-tertiary); }
      .text[hidden], .actions[hidden] { display: none; }
      .actions { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--cm-space-20); margin-top: var(--cm-space-20); }
      :host([size='small']) .circle { width: 200px; height: 200px; }
      :host([size='small']) .title { margin-top: 30px; font-size: 14px; }
      :host([size='small']) .actions { gap: var(--cm-space-10); }
      @media (max-width: 640px) {
        .circle { width: 200px; height: 200px; }
        .title { margin-top: 30px; font-size: 14px; }
        .actions { gap: var(--cm-space-10); }
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

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    const fallback = this.image
      ? html`<img src=${this.image} alt="" part="image">`
      : this.icon ? html`<cm-icon name=${this.icon} size="96"></cm-icon>` : nothing;
    return html`<div class="wrap" part="empty-state">
      <div class="circle" part="circle" aria-hidden=${this.hasImage ? nothing : 'true'}>
        <slot name="image" @slotchange=${(e: Event) => this.#slot(e, 'hasImage')}>${fallback}</slot>
      </div>
      <div class="title" role="heading" aria-level=${level} part="heading">${this.heading}</div>
      <div class="text" ?hidden=${!this.hasText}><slot @slotchange=${(e: Event) => this.#slot(e, 'hasText')}></slot></div>
      <div class="actions" ?hidden=${!this.hasActions}><slot name="actions" @slotchange=${(e: Event) => this.#slot(e, 'hasActions')}></slot></div>
    </div>`;
  }
}
define('cm-empty-state', CmEmptyState);

declare global { interface HTMLElementTagNameMap { 'cm-empty-state': CmEmptyState } }
