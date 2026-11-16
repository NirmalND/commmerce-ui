import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';

/**
 * Black primary or outlined secondary action.
 * @element cm-button
 * @slot - Label.
 * @slot icon - Optional leading icon.
 * @fires click - Native click; suppressed while disabled or loading.
 */
export class CmButton extends LitElement {
  static formAssociated = true;
  static properties = {
    variant: { reflect: true },
    size: { reflect: true },
    type: {},
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    href: {},
    target: {},
  };

  /** `primary` = black fill (one per group); `secondary` = light fill, black outline. */
  variant: 'primary' | 'secondary' = 'secondary';
  /** `large` 46px (save bars), `medium` 32px, `slim` 24px. */
  size: 'large' | 'medium' | 'slim' = 'medium';
  /** Form behaviour when inside a `<form>`: `submit` submits it, `reset` resets it. */
  type: 'button' | 'submit' | 'reset' = 'button';
  /** Blocks clicks and dims the button. Prefer explaining why nearby. */
  disabled = false;
  /** Shows a spinner and blocks clicks while an action runs. */
  loading = false;
  /** Renders a link styled as a button. */
  href?: string;
  /** Link target when `href` is set. `_blank` adds `rel="noopener noreferrer"`. */
  target?: string;

  #internals = this.attachInternals();

  static styles = [
    base,
    css`
      :host { display: inline-flex; vertical-align: middle; }
      .btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        width: 100%; font: inherit; font-weight: 500; line-height: 1; white-space: nowrap;
        border-radius: var(--cm-radius-sm); border: var(--cm-border-1) solid transparent;
        cursor: pointer; text-decoration: none;
      }
      :host([size='large']) .btn { height: 46px; padding: 0 var(--cm-space-20); font-size: 16px; }
      .btn, :host([size='medium']) .btn { height: 32px; padding: 0 var(--cm-space-15); font-size: 12px; }
      :host([size='slim']) .btn { height: 24px; padding: 0 var(--cm-space-10); font-size: 10px; }
      :host([variant='primary']) .btn { background: var(--cm-action-primary); color: var(--cm-action-primary-text); border-color: var(--cm-action-primary); }
      :host([variant='primary']) .btn:hover { background: var(--cm-action-primary-hover); border-color: var(--cm-action-primary-hover); }
      .btn, :host([variant='secondary']) .btn {
        background: var(--cm-bg-hover); color: var(--cm-text-default); border-color: var(--cm-border-strong);
      }
      :host([variant='secondary']) .btn:hover { background: var(--cm-bg-surface); }
      :host([disabled]) .btn, :host([loading]) .btn {
        background: var(--cm-action-disabled); border-color: var(--cm-action-disabled); color: var(--cm-action-disabled-text); cursor: not-allowed;
      }
      .btn:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .spinner {
        width: 1em; height: 1em; border-radius: 50%;
        border: 2px solid currentColor; border-right-color: transparent;
        animation: spin .7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2s; } }
      ::slotted([slot='icon']) { display: inline-flex; }
    `,
  ];

  constructor() {
    super();
    this.addEventListener('click', this.#onClick, { capture: true });
  }

  #onClick = (e: Event) => {
    if (this.disabled || this.loading) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    const form = this.#internals.form;
    if (!form || this.href) return;
    if (this.type === 'submit') form.requestSubmit();
    else if (this.type === 'reset') form.reset();
  };

  render() {
    const inner = html`${this.loading ? html`<span class="spinner" aria-hidden="true"></span>` : html`<slot name="icon"></slot>`}<slot></slot>`;
    if (this.href && !this.disabled) {
      return html`<a class="btn" part="control" href=${this.href} target=${this.target ?? nothing}
        rel=${this.target === '_blank' ? 'noopener noreferrer' : nothing}>${inner}</a>`;
    }
    return html`<button class="btn" part="control" type="button"
      ?disabled=${this.disabled} aria-disabled=${this.loading ? 'true' : nothing}
      aria-busy=${this.loading ? 'true' : nothing}>${inner}</button>`;
  }
}
define('cm-button', CmButton);

declare global { interface HTMLElementTagNameMap { 'cm-button': CmButton } }
