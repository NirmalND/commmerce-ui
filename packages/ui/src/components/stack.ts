import { LitElement, html, css } from 'lit';
import { base, define } from '../base.js';
import { spaceRules, type SpaceStep } from '../spacing.js';

/**
 * Lays out its children in a column (default) or a row, a spacing token apart. The children stay in your
 * page (light DOM), so your own styles and form elements keep working.
 * @element cm-stack
 * @slot - The items to stack.
 */
export class CmStack extends LitElement {
  static properties = {
    direction: { reflect: true },
    gap: { reflect: true },
    align: { reflect: true },
    justify: { reflect: true },
    wrap: { type: Boolean, reflect: true },
  };

  /** `block` stacks top to bottom; `inline` lays items out in a row (right to left in RTL pages). */
  direction: 'block' | 'inline' = 'block';
  /** Space between items: a spacing step on the 4px grid (`0`, `4`, `8`, `12`, `16`, `20`, `24`, `32`, `40`, `48`, `64`; the pre-1.5 steps `10`, `15`, `22` and `30` still work and draw as 8, 16, 24 and 32). Default `20`, the gap between cards. */
  gap: SpaceStep = '20';
  /** Cross-axis alignment. Default `stretch` in a column and `center` in a row. */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  /** Main-axis distribution. `space-between` pushes the first and last items to the edges. */
  justify?: 'start' | 'center' | 'end' | 'space-between';
  /** Lets a row wrap onto more lines when it runs out of space. */
  wrap = false;

  static styles = [
    base,
    css`
      :host { display: flex; flex-direction: column; gap: var(--cm-space-20); min-inline-size: 0; }
      :host([direction='inline']) { flex-direction: row; align-items: center; }
      :host([wrap]) { flex-wrap: wrap; }
      :host([align='start']) { align-items: flex-start; }
      :host([align='center']) { align-items: center; }
      :host([align='end']) { align-items: flex-end; }
      :host([align='stretch']) { align-items: stretch; }
      :host([align='baseline']) { align-items: baseline; }
      :host([justify='start']) { justify-content: flex-start; }
      :host([justify='center']) { justify-content: center; }
      :host([justify='end']) { justify-content: flex-end; }
      :host([justify='space-between']) { justify-content: space-between; }
    `,
    spaceRules('gap', 'gap'),
  ];

  render() {
    return html`<slot></slot>`;
  }
}
define('cm-stack', CmStack);

declare global { interface HTMLElementTagNameMap { 'cm-stack': CmStack } }
