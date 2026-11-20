import { html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

/** Highest count shown in full; above it the button shows "99+". */
const COUNT_MAX = 99;

const strings = defineStrings('button', {
  /** Accessible name of an icon-only button with a `count`: `{label}` is the button's `label`. */
  labelWithCount: '{label}, {count} unread',
  /** Read after the visible text of a button with a `count` that is not icon-only. */
  count: '{count} unread',
  /** Shown instead of the number when `count` is over 99. */
  countOverflow: '{max}+',
});
declare module '../localize.js' { interface CmStrings { button: typeof strings } }

/**
 * Black primary or outlined secondary action. With `icon-only` it is a square button that shows just an icon
 * (bell, refresh, search, row actions) and is named by `label`. `count` adds a small counter ("3", "99+").
 * `tone` colours a button by the outcome it records (`success`, `critical`); the label still carries the meaning.
 * @element cm-button
 * @slot - Label. Visually hidden when `icon-only` (it still names the button if `label` is empty).
 * @slot icon - Optional leading icon. Overrides the `icon` attribute.
 * @csspart control - The native `<button>` or `<a>`.
 * @csspart count - The counter shown when `count` is above 0.
 * @fires click - Native click; suppressed while disabled or loading.
 */
export class CmButton extends CmLocalizedElement {
  static formAssociated = true;
  static properties = {
    variant: { reflect: true },
    size: { reflect: true },
    type: {},
    disabled: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    href: {},
    target: {},
    iconOnly: { type: Boolean, reflect: true, attribute: 'icon-only' },
    icon: {},
    label: {},
    count: { type: Number },
    tone: { reflect: true },
  };

  /** `primary` = black fill (one per group); `secondary` = white fill with a grey outline, like a field (since 1.5; was a black outline). */
  variant: 'primary' | 'secondary' = 'secondary';
  /**
   * `large` 40px (save bars, page actions), `medium` 36px (default), `slim` 32px (toolbars, table rows). Text is 14px (13px on slim).
   * On touch screens (`pointer: coarse`) every size is drawn at least 40px tall (icon-only: 40 x 40) and its hit area reaches
   * 44px. Owner standard since 1.6 (1.5 drew 44px on touch screens; sizes before 1.5 were 46, 32 and 24px).
   */
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
  /** Square button that shows only its icon (from `icon` or the `icon` slot). Give it a `label`. */
  iconOnly = false;
  /** Name of a @commmerce/icons icon shown before the label (16px at every size). */
  icon = '';
  /** Accessible name of an `icon-only` button ("Notifications", "Refresh"). Required with `icon-only`; ignored otherwise, so the visible text stays the name. */
  label = '';
  /** Small counter on the button, e.g. unread notifications. Hidden at 0; over 99 shows "99+". Screen readers hear the exact number ("Notifications, 3 unread"). */
  count = 0;
  /**
   * Colours the button by meaning: `critical` (red: delete, "Not interested") or `success` (green: "Sale closed").
   * Secondary: tone text, icon and outline on a white fill. Primary: filled in the tone. Leave unset for the
   * standard black and white. Colour is never the only signal: the label must say what happens. Since 1.2.
   */
  tone?: 'critical' | 'success';

  #internals = this.attachInternals();

  static styles = [
    base,
    css`
      :host { display: inline-flex; vertical-align: middle; max-width: 100%; }
      /* A label longer than the room (a button in a narrow card) ends with an ellipsis instead of spilling out (1.8.1). */
      .text { min-width: 0; overflow: hidden; text-overflow: ellipsis; line-height: var(--cm-line-height-14, 20px); } /* a full line box, so overflow: hidden doesn't cut g, p and y (1.9.3) */
      .btn {
        position: relative; display: inline-flex; align-items: center; justify-content: center; gap: var(--cm-space-8);
        width: 100%; min-width: 0; font: inherit; font-weight: 500; line-height: 1; white-space: nowrap;
        border-radius: var(--cm-radius-sm); border: var(--cm-border-1) solid transparent;
        cursor: pointer; text-decoration: none;
      }
      /* Owner standard (1.6): large 40, medium 36, slim 32 (--cm-control-height-*); 14px text, 13px on slim. 40 on touch screens. */
      :host([size='large']) .btn { height: var(--cm-control-height-lg, 40px); padding: 0 var(--cm-space-20); font-size: var(--cm-font-size-14); }
      .btn, :host([size='medium']) .btn { height: var(--cm-control-height-md, 36px); padding: 0 var(--cm-space-16); font-size: var(--cm-font-size-14); }
      :host([size='slim']) .btn { height: var(--cm-control-height-sm, 32px); padding: 0 var(--cm-space-12); font-size: var(--cm-font-size-13); }
      :host([variant='primary']) .btn { background: var(--cm-action-primary); color: var(--cm-action-primary-text); border-color: var(--cm-action-primary); }
      :host([variant='primary']) .btn:hover { background: var(--cm-action-primary-hover); border-color: var(--cm-action-primary-hover); }
      /* Secondary (1.5): white with the same outline as fields (border-input), grey on hover. */
      .btn, :host([variant='secondary']) .btn {
        background: var(--cm-bg-surface); color: var(--cm-text-default); border-color: var(--cm-border-input);
      }
      :host(:not([variant='primary']):not([disabled]):not([loading])) .btn:hover { background: var(--cm-bg-hover); }
      :host([disabled]) .btn, :host([loading]) .btn {
        background: var(--cm-action-disabled); border-color: var(--cm-action-disabled); color: var(--cm-action-disabled-text); cursor: not-allowed;
      }
      /* Tones (1.2). Secondary sits on bg-surface, not bg-hover: text-critical on bg-hover is under 4.5:1 in dark.
         Success has no border token: its outline is text-success (4.8:1 or more on every surface; icon-success is 2.9:1 on bg-page).
         Primary fills with the tone's text colour and takes action-primary-text, like the black primary (5.1:1 or more).
         Hover darkens it towards text-default, which only raises the label's contrast. Pairs: packages/tokens/scripts/contrast.mjs. */
      :host([tone='critical']:not([variant='primary']):not([disabled]):not([loading])) .btn {
        background: var(--cm-bg-surface); color: var(--cm-text-critical); border-color: var(--cm-border-critical);
      }
      :host([tone='critical']:not([variant='primary']):not([disabled]):not([loading])) .btn:hover { background: var(--cm-bg-critical); }
      :host([tone='success']:not([variant='primary']):not([disabled]):not([loading])) .btn {
        background: var(--cm-bg-surface); color: var(--cm-text-success); border-color: var(--cm-text-success);
      }
      :host([tone='success']:not([variant='primary']):not([disabled]):not([loading])) .btn:hover {
        background: linear-gradient(var(--cm-bg-success-soft), var(--cm-bg-success-soft)) var(--cm-bg-surface);
      }
      :host([tone='critical'][variant='primary']:not([disabled]):not([loading])) .btn { --_tone: var(--cm-text-critical); }
      :host([tone='success'][variant='primary']:not([disabled]):not([loading])) .btn { --_tone: var(--cm-text-success); }
      :host([tone='critical'][variant='primary']:not([disabled]):not([loading])) .btn, :host([tone='success'][variant='primary']:not([disabled]):not([loading])) .btn {
        background: var(--_tone); border-color: var(--_tone); color: var(--cm-action-primary-text);
      }
      :host([tone='critical'][variant='primary']:not([disabled]):not([loading])) .btn:hover, :host([tone='success'][variant='primary']:not([disabled]):not([loading])) .btn:hover {
        background: color-mix(in srgb, var(--_tone) 80%, var(--cm-text-default));
        border-color: color-mix(in srgb, var(--_tone) 80%, var(--cm-text-default));
      }
      /* Pressed (1.6): a step darker than hover (lighter in dark), so a tap shows before the action lands. */
      :host(:not([variant='primary']):not([tone]):not([disabled]):not([loading])) .btn:active { background: color-mix(in srgb, var(--cm-bg-hover), var(--cm-text-default) 8%); }
      :host([variant='primary']:not([tone]):not([disabled]):not([loading])) .btn:active {
        background: color-mix(in srgb, var(--cm-action-primary-hover), var(--cm-action-primary) 50%); border-color: color-mix(in srgb, var(--cm-action-primary-hover), var(--cm-action-primary) 50%);
      }
      :host([tone]:not([disabled]):not([loading])) .btn:active { filter: brightness(0.92); }
      .btn:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .spinner {
        width: 1em; height: 1em; border-radius: 50%;
        border: 2px solid currentColor; border-right-color: transparent;
        animation: spin .7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2s; } }
      ::slotted([slot='icon']) { display: inline-flex; }
      /* Icon-only: a square of the size's height. */
      :host([icon-only]) .btn { position: relative; padding: 0; }
      :host([icon-only][size='large']) .btn { width: var(--cm-control-height-lg, 40px); }
      :host([icon-only]) .btn, :host([icon-only][size='medium']) .btn { width: var(--cm-control-height-md, 36px); }
      :host([icon-only][size='slim']) .btn { width: var(--cm-control-height-sm, 32px); }
      /* Touch screens (owner standard, 1.6): every button is drawn at least 40px tall (icon-only: 40 x 40), whatever its
         size, and an invisible margin 2px all round makes the hit area 44px (WCAG 2.5.5 target size). */
      @media (pointer: coarse) {
        .btn { min-height: var(--cm-control-height-lg, 40px); }
        :host([icon-only]) .btn { min-width: var(--cm-control-height-lg, 40px); }
        .btn::after { content: ''; position: absolute; inset: -2px; }
      }
      .vh { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      .count {
        display: inline-flex; align-items: center; justify-content: center; box-sizing: border-box;
        min-width: 16px; height: 16px; padding: 0 var(--cm-space-4); border-radius: var(--cm-radius-full);
        font-size: var(--cm-font-size-12); font-weight: 500; line-height: 1; font-variant-numeric: tabular-nums;
        color: var(--cm-count-text); background: var(--cm-count-bg);
      }
      :host([icon-only]) .count {
        position: absolute; inset-block-start: -6px; inset-inline-end: -6px;
        box-shadow: 0 0 0 2px var(--cm-bg-surface); pointer-events: none;
      }
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

  #warned = false;

  updated() {
    if (this.iconOnly && !this.label && !this.textContent?.trim() && !this.querySelector('[label]') && !this.#warned) {
      this.#warned = true;
      console.warn('cm-button: an icon-only button needs a `label` (its accessible name).', this);
    }
  }

  render() {
    const count = Number.isFinite(this.count) && this.count > 0 ? Math.floor(this.count) : 0;
    const icon = this.loading
      ? html`<span class="spinner" aria-hidden="true"></span>`
      : html`<slot name="icon">${this.icon ? html`<cm-icon name=${this.icon} size="16"></cm-icon>` : nothing}</slot>`;
    const text = this.iconOnly ? html`<span class="vh"><slot></slot></span>` : html`<span class="text"><slot></slot></span>`;
    const counter = count
      ? html`<span class="count" part="count" aria-hidden="true">${count > COUNT_MAX ? this.t('countOverflow', { max: COUNT_MAX }) : this.formatNumber(count)}</span>${
        this.iconOnly ? nothing : html`<span class="vh"> ${this.t('count', { count })}</span>`}`
      : nothing;
    const name = this.iconOnly ? (this.label || this.textContent?.trim() || '') : '';
    const ariaLabel = !this.iconOnly || !name ? nothing : count ? this.t('labelWithCount', { label: name, count }) : this.label || nothing;
    const inner = html`${icon}${text}${counter}`;
    if (this.href && !this.disabled) {
      return html`<a class="btn" part="control" href=${this.href} target=${this.target ?? nothing}
        rel=${this.target === '_blank' ? 'noopener noreferrer' : nothing} aria-label=${ariaLabel}>${inner}</a>`;
    }
    return html`<button class="btn" part="control" type="button"
      ?disabled=${this.disabled} aria-disabled=${this.loading ? 'true' : nothing}
      aria-busy=${this.loading ? 'true' : nothing} aria-label=${ariaLabel}>${inner}</button>`;
  }
}
define('cm-button', CmButton);

declare global { interface HTMLElementTagNameMap { 'cm-button': CmButton } }
