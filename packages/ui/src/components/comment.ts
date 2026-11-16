import { LitElement, html, css, nothing } from 'lit';
import { base, define, nextId } from '../base.js';
import { CmLocalizedElement, defineStrings, formatDate } from '../localize.js';
import './button.js';

const boxStrings = defineStrings('commentBox', {
  /** Section title, the text box's accessible name, and the post button. */
  heading: 'Comments',
  label: 'Add a comment',
  action: 'Post comment',
});
declare module '../localize.js' { interface CmStrings { commentBox: typeof boxStrings } }

/**
 * One entry in an order or customer timeline: when it was written, what it says and who wrote it.
 * Stack several inside any container, `space-10` apart; put a `cm-comment-box` above or below to add new ones.
 * @element cm-comment
 * @slot - The comment text.
 */
export class CmComment extends CmLocalizedElement {
  static properties = {
    author: {},
    datetime: {},
    time: {},
  };

  /** Who wrote it (a staff name, "System" or an app name). */
  author = '';
  /** When it was written, as an ISO date-time (`2023-02-09T17:07`). Used for `<time datetime>`. */
  datetime = '';
  /** The date as shown. Leave empty to format `datetime` in the viewer's locale. */
  time = '';

  static styles = [
    base,
    css`
      :host { display: block; }
      article {
        display: flex; flex-direction: column; gap: 6px; padding: var(--cm-space-10);
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-default); border-radius: var(--cm-radius-sm);
      }
      .meta { font-size: 12px; color: var(--cm-text-tertiary); }
      .body { font-size: 14px; line-height: 16px; overflow-wrap: anywhere; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    // A list item only inside a comment box, which provides the list.
    if (!this.hasAttribute('role') && this.parentElement?.localName === 'cm-comment-box') this.setAttribute('role', 'listitem');
  }

  #shown() {
    if (this.time) return this.time;
    if (!this.datetime) return '';
    const d = new Date(this.datetime);
    if (Number.isNaN(d.getTime())) return this.datetime;
    return formatDate(d, { dateStyle: 'medium', timeStyle: 'short' }, this.locale);
  }

  render() {
    const shown = this.#shown();
    return html`<article part="comment">
      ${shown ? html`<time class="meta" part="time" datetime=${this.datetime || nothing}>${shown}</time>` : nothing}
      <div class="body" part="body"><slot></slot></div>
      ${this.author ? html`<div class="meta" part="author">– ${this.author}</div>` : nothing}
    </article>`;
  }
}
define('cm-comment', CmComment);

/**
 * Writes a new comment: a heading, a text box and a Post button. Ctrl/⌘ + Enter also posts.
 * Put your `cm-comment` elements in the default slot to show the timeline under the box.
 * @element cm-comment-box
 * @slot - Existing `cm-comment` elements, shown as a list under the box.
 * @fires cm-submit - When Post is pressed with text; `detail.value` is the trimmed text. Cancelable: the default clears the box.
 */
export class CmCommentBox extends CmLocalizedElement {
  static properties = {
    heading: { string: 'heading' },
    label: { string: 'label' },
    placeholder: {},
    action: { string: 'action' },
    value: {},
    disabled: { type: Boolean, reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level' },
  };

  /** Section title above the box. Default: the built-in string `heading` ("Comments"). */
  heading!: string;
  /** Accessible name of the text box. Default: the built-in string `label` ("Add a comment"). */
  label!: string;
  /** Placeholder in the empty box. */
  placeholder = '';
  /** Text of the post button. Default: the built-in string `action` ("Post comment"). */
  action!: string;
  /** Current text in the box. */
  value = '';
  /** Blocks typing and posting (for example while the comment saves). */
  disabled = false;
  /** Heading level of the title. Default 2. */
  headingLevel: 2 | 3 | 4 | 5 | 6 = 2;

  #id = nextId('cm-comment-box');

  static styles = [
    base,
    css`
      :host { display: block; }
      section { display: flex; flex-direction: column; gap: var(--cm-space-20); }
      .title { margin: 0; font-size: 20px; font-weight: 600; }
      textarea {
        display: block; width: 100%; min-height: 128px; padding: var(--cm-space-10); resize: vertical;
        border: var(--cm-border-1) solid var(--cm-border-input); border-radius: var(--cm-radius-sm);
        background: var(--cm-bg-surface); color: var(--cm-text-default); font: inherit; font-size: 14px;
      }
      textarea::placeholder { color: var(--cm-text-tertiary); }
      textarea:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 0; border-color: var(--cm-border-strong); }
      textarea:disabled { background: var(--cm-bg-input-filled); color: var(--cm-text-secondary); }
      .actions { display: flex; }
      .list { display: flex; flex-direction: column; gap: var(--cm-space-10); }
      .list[hidden] { display: none; }
      @media (max-width: 640px) {
        section { gap: var(--cm-space-10); }
        .title { font-size: 16px; }
        textarea { min-height: 100px; }
        .actions { justify-content: flex-end; }
      }
    `,
  ];

  /** @internal */
  hasComments = false;

  /** Posts the current text, as if Post was pressed. */
  submit() {
    const ta = this.renderRoot.querySelector('textarea');
    const text = (ta?.value ?? this.value).trim();
    if (this.disabled) return;
    if (!text) { ta?.focus(); return; }
    const ev = new CustomEvent('cm-submit', { bubbles: true, composed: true, cancelable: true, detail: { value: text } });
    if (this.dispatchEvent(ev)) { this.value = ''; if (ta) ta.value = ''; }
  }

  #key(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.submit(); }
  }

  render() {
    const level = Math.min(6, Math.max(2, this.headingLevel || 2));
    return html`<section part="comment-box" aria-labelledby="${this.#id}-h">
      <div class="title" id="${this.#id}-h" role="heading" aria-level=${level} part="heading">${this.heading}</div>
      <textarea part="input" aria-label=${this.label} placeholder=${this.placeholder || nothing} .value=${this.value}
        ?disabled=${this.disabled} @input=${(e: Event) => { this.value = (e.target as HTMLTextAreaElement).value; }}
        @keydown=${this.#key}></textarea>
      <div class="actions"><cm-button variant="primary" size="large" ?disabled=${this.disabled} @click=${() => this.submit()}>${this.action}</cm-button></div>
      <div class="list" role="list" ?hidden=${!this.hasComments}>
        <slot @slotchange=${(e: Event) => { this.hasComments = (e.target as HTMLSlotElement).assignedElements().length > 0; this.requestUpdate(); }}></slot>
      </div>
    </section>`;
  }
}
define('cm-comment-box', CmCommentBox);

declare global { interface HTMLElementTagNameMap { 'cm-comment': CmComment; 'cm-comment-box': CmCommentBox } }
