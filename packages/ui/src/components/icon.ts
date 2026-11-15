import { LitElement, svg, css, nothing } from 'lit';
import { icons, dotted, type IconName } from '@commmerce/icons';
import { define } from '../base.js';

/**
 * Line icon from @commmerce/icons. Decorative unless `label` is set.
 * @element cm-icon
 */
export class CmIcon extends LitElement {
  static properties = {
    name: { reflect: true },
    size: { type: Number },
    label: {},
  };

  /** Icon from @commmerce/icons. See the Icons page for all names. */
  name: IconName = 'more';
  /** Pixel size. Header icons are 18, buttons 16. */
  size = 18;
  /** Accessible name. Leave empty when the icon sits next to text that says the same thing. */
  label = '';

  static styles = css`
    :host { display: inline-flex; flex: none; color: inherit; line-height: 0; }
    svg { display: block; }
  `;

  render() {
    const d = icons[this.name] ?? icons.more;
    const sw = dotted.includes(this.name) ? 3 : 1.6;
    return svg`<svg width=${this.size} height=${this.size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      stroke-width=${sw} stroke-linecap="round" stroke-linejoin="round"
      role=${this.label ? 'img' : nothing} aria-label=${this.label || nothing} aria-hidden=${this.label ? nothing : 'true'}
      part="svg"><path d=${d}></path></svg>`;
  }
}
define('cm-icon', CmIcon);

declare global { interface HTMLElementTagNameMap { 'cm-icon': CmIcon } }
