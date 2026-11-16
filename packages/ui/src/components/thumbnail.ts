import { LitElement, html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';

const strings = defineStrings('thumbnail', {
  /** Accessible name of the placeholder when there is no image. */
  noImage: '{alt} (no image)',
});
declare module '../localize.js' { interface CmStrings { thumbnail: typeof strings } }

/**
 * A small product or file image in a fixed square box, shown whole (never cropped) on a grey backdrop.
 * Without an image, or when it fails to load, it shows a placeholder icon.
 * @element cm-thumbnail
 */
export class CmThumbnail extends CmLocalizedElement {
  static properties = {
    src: {},
    alt: {},
    size: { reflect: true },
    loading: {},
    _failed: { state: true },
  };

  /** Image URL. */
  src = '';
  /**
   * What the image shows, e.g. "Blue cotton kurta, front". Leave empty when the product name is written next to
   * the thumbnail: the image is then decorative.
   */
  alt = '';
  /** `small` 40px, `medium` 60px, `large` 80px. Set `--cm-thumbnail-size` for any other size. */
  size: 'small' | 'medium' | 'large' = 'medium';
  /** `lazy` waits until the thumbnail is near the screen: use it in long lists. */
  loading: 'eager' | 'lazy' = 'eager';
  _failed = false;

  static styles = [
    base,
    css`
      :host { --_size: var(--cm-thumbnail-size, 60px); display: inline-flex; vertical-align: middle; flex: none; }
      :host([size='small']) { --_size: var(--cm-thumbnail-size, 40px); }
      :host([size='large']) { --_size: var(--cm-thumbnail-size, 80px); }
      .box {
        display: grid; place-items: center; overflow: hidden; inline-size: var(--_size); block-size: var(--_size);
        border: var(--cm-border-1) solid var(--cm-border-default); border-radius: var(--cm-radius-sm);
        background: var(--cm-thumb-bg); color: var(--cm-icon-selected);
      }
      img { inline-size: 100%; block-size: 100%; object-fit: contain; display: block; }
    `,
  ];

  willUpdate(changed: Map<string, unknown>) {
    if (changed.has('src')) this._failed = false;
  }

  render() {
    if (this.src && !this._failed) {
      return html`<span class="box" part="thumbnail"><img src=${this.src} alt=${this.alt} loading=${this.loading}
        @error=${() => { this._failed = true; }}></span>`;
    }
    const size = this.size === 'small' ? 18 : this.size === 'large' ? 32 : 24;
    return html`<span class="box" part="thumbnail" role=${this.alt ? 'img' : nothing}
      aria-label=${this.alt ? this.t('noImage', { alt: this.alt }) : nothing} aria-hidden=${this.alt ? nothing : 'true'}>
      <cm-icon name="box" size=${size}></cm-icon></span>`;
  }
}
define('cm-thumbnail', CmThumbnail);

declare global { interface HTMLElementTagNameMap { 'cm-thumbnail': CmThumbnail } }
