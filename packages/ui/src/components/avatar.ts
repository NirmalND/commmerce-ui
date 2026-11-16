import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import './icon.js';

/** "Asha Rao" → "AR", "preprod.commmerce.com" → "P". At most two letters. */
export function initials(name: string): string {
  const words = name.trim().split(/[\s._@-]+/).filter(Boolean);
  if (!words.length) return '';
  const first = [...words[0]][0] ?? '';
  const last = words.length > 1 && !/[.@]/.test(name) ? [...words[words.length - 1]][0] ?? '' : '';
  return (first + last).toLocaleUpperCase();
}

/**
 * A person or a store, as a photo or their initials.
 * Round for people, square for stores. Without a photo (or when it fails to load) it shows the initials of
 * `name`, and without a name a person or store icon.
 * @element cm-avatar
 */
export class CmAvatar extends LitElement {
  static properties = {
    name: {},
    src: {},
    size: { reflect: true },
    shape: { reflect: true },
    decorative: { type: Boolean, reflect: true },
    _failed: { state: true },
  };

  /** Who or what it shows. Used for the initials and as the accessible name. */
  name = '';
  /** Photo or logo URL. Shown cropped to fill the avatar. */
  src = '';
  /** `small` 24px, `medium` 36px, `large` 48px. Set `--cm-avatar-size` for any other size. */
  size: 'small' | 'medium' | 'large' = 'medium';
  /** `round` for people, `square` for stores and businesses. */
  shape: 'round' | 'square' = 'round';
  /** Hides it from screen readers. Use when the name is written right next to the avatar. */
  decorative = false;
  _failed = false;

  static styles = [
    base,
    css`
      :host { --_size: var(--cm-avatar-size, 36px); display: inline-flex; vertical-align: middle; flex: none; }
      :host([size='small']) { --_size: var(--cm-avatar-size, 24px); }
      :host([size='large']) { --_size: var(--cm-avatar-size, 48px); }
      .avatar {
        display: grid; place-items: center; overflow: hidden; inline-size: var(--_size); block-size: var(--_size);
        border-radius: 50%; background: var(--cm-avatar-bg); color: var(--cm-text-default);
        font-size: calc(var(--_size) * 0.4); font-weight: 500; line-height: 1; user-select: none;
      }
      :host([shape='square']) .avatar { border-radius: var(--cm-radius-sm); }
      .icon { background: var(--cm-bg-input-filled); color: var(--cm-icon-selected); }
      img { inline-size: 100%; block-size: 100%; object-fit: cover; display: block; }
      @media (forced-colors: active) { .avatar { border: 1px solid CanvasText; } }
    `,
  ];

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('src')) this._failed = false;
  }

  render() {
    const letters = initials(this.name);
    const label = this.decorative || !this.name ? nothing : this.name;
    const hidden = this.decorative || !this.name ? 'true' : nothing;
    let inner;
    let cls = 'avatar';
    if (this.src && !this._failed) {
      inner = html`<img src=${this.src} alt="" @error=${() => { this._failed = true; }}>`;
    } else if (letters) {
      inner = html`<span aria-hidden="true">${letters}</span>`;
    } else {
      cls += ' icon';
      inner = html`<cm-icon name=${this.shape === 'square' ? 'store' : 'user'} size="18"></cm-icon>`;
    }
    return html`<span class=${cls} part="avatar" role=${label === nothing ? nothing : 'img'} aria-label=${label} aria-hidden=${hidden}>${inner}</span>`;
  }
}
define('cm-avatar', CmAvatar);

declare global { interface HTMLElementTagNameMap { 'cm-avatar': CmAvatar } }
