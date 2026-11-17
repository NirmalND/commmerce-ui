import { LitElement, html, css, nothing, type PropertyValues } from 'lit';
import { base, define, nextId, type Tone } from '../base.js';
import { CmLocalizedElement, defineStrings, formatDate } from '../localize.js';
import './icon.js';
import './button.js';
import './skeleton.js';
import './tooltip.js';

const itemStrings = defineStrings('timelineItem', {
  /** When it happened, relative to now. `{count}` is a whole number; past and future wording are separate keys. */
  justNow: 'Just now',
  minutesAgo: { one: '{count} minute ago', other: '{count} minutes ago' },
  hoursAgo: { one: '{count} hour ago', other: '{count} hours ago' },
  daysAgo: { one: '{count} day ago', other: '{count} days ago' },
  inMinutes: { one: 'In {count} minute', other: 'In {count} minutes' },
  inHours: { one: 'In {count} hour', other: 'In {count} hours' },
  inDays: { one: 'In {count} day', other: 'In {count} days' },
  /** The button under a clamped body. */
  showAll: 'Show all',
  showLess: 'Show less',
});
const strings = defineStrings('timeline', {
  /** Accessible name of the list. */
  label: 'Activity',
  /** The button at the end that asks for older events. */
  showMore: 'Show more',
  /** Announced while `loading`. */
  loading: 'Loading activity',
});
declare module '../localize.js' { interface CmStrings { timelineItem: typeof itemStrings; timeline: typeof strings } }

/** Times older (or further ahead) than this many days show as a date instead of "N days ago". */
const RELATIVE_DAYS = 7;

// One timer for every item on the page, so "2 minutes ago" moves on while the page is open.
const ticking = new Set<LitElement>();
let timer: ReturnType<typeof setInterval> | undefined;
function tick(el: LitElement, on: boolean) {
  if (on) ticking.add(el); else ticking.delete(el);
  if (ticking.size && !timer) timer = setInterval(() => ticking.forEach((e) => e.requestUpdate()), 60_000);
  if (!ticking.size && timer) { clearInterval(timer); timer = undefined; }
}

/**
 * One event in a `cm-timeline`: an icon for its kind, a title, when it happened, a meta line, an optional badge,
 * an optional body (clamped to a few lines with Show all / Show less) and optional actions.
 *
 * The time is shown relative to now ("2 hours ago", then a date after a week), with the full date and time in a
 * tooltip on hover and keyboard focus, and read out to screen readers after the relative time.
 * @element cm-timeline-item
 * @slot - The body: an email excerpt, a note, a call summary. Clamped to `lines` lines.
 * @slot heading - Rich title (e.g. with a link), instead of `heading`.
 * @slot meta - Rich meta line, instead of `meta`.
 * @slot badge - A `cm-badge` for the kind or state, after the title.
 * @slot actions - Links or buttons under the body, e.g. "Read email".
 * @csspart icon - The round icon.
 * @csspart title - The title.
 * @csspart time - The `<time>` element.
 * @csspart meta - The meta line.
 * @csspart body - The body.
 * @csspart toggle - The Show all / Show less button.
 */
export class CmTimelineItem extends CmLocalizedElement {
  static properties = {
    icon: { reflect: true },
    tone: { reflect: true },
    heading: {},
    datetime: { reflect: true },
    time: {},
    meta: {},
    lines: { type: Number },
    expanded: { type: Boolean, reflect: true },
    _overflow: { state: true },
    _body: { state: true },
    _meta: { state: true },
    _actions: { state: true },
  };

  /** Icon name from `@commmerce/icons` for the kind of event ("mail", "note", "edit", "chat"). Empty shows a small dot. */
  icon = '';
  /** Colours the icon: `neutral` (default), `information`, `attention`, `success` or `critical`. */
  tone: Tone | 'neutral' = 'neutral';
  /** What happened: "Email sent", "Status changed". Use the `heading` slot for a link. */
  heading = '';
  /** When it happened, as an ISO date-time (`2026-11-16T10:30:00+05:30`). Shown relative to now; used for `<time datetime>`. */
  datetime = '';
  /** The time as shown, instead of the relative time worked out from `datetime` (which still gives the full date on hover). */
  time = '';
  /** A line under the title: "by Rahul Kumar · sent". Use the `meta` slot for links. */
  meta = '';
  /** Lines of body shown before "Show all". 0 shows the whole body. */
  lines = 3;
  /** The whole body is shown (after "Show all"). */
  expanded = false;

  _overflow = false;
  _body = false;
  _meta = false;
  _actions = false;
  #id = nextId('cm-tl');
  #resize?: ResizeObserver;

  static styles = [
    base,
    css`
      :host { display: block; min-width: 0; font-size: 14px; line-height: 20px; }
      .item { display: flex; gap: var(--cm-space-12); align-items: flex-start; }
      .icon {
        position: relative; z-index: 1; display: grid; place-items: center; flex: none; width: 32px; height: 32px; border-radius: var(--cm-radius-full);
        background: var(--cm-bg-inset); color: var(--cm-icon-default); border: var(--cm-border-1) solid var(--cm-border-subtle);
      }
      .icon.information { background: var(--cm-bg-information-soft); color: var(--cm-text-information); border-color: transparent; }
      .icon.attention { background: var(--cm-bg-attention); color: var(--cm-text-attention); border-color: transparent; }
      .icon.success { background: var(--cm-bg-success-soft); color: var(--cm-text-success); border-color: transparent; }
      .icon.critical { background: var(--cm-bg-critical); color: var(--cm-text-critical); border-color: transparent; }
      .dot { width: 8px; height: 8px; border-radius: var(--cm-radius-full); background: currentColor; }
      .main { flex: 1; min-width: 0; padding-block-start: calc((32px - 20px) / 2); } /* the first line centred on the 32px icon */
      .head { display: flex; flex-wrap: wrap; align-items: center; column-gap: var(--cm-space-8); row-gap: 4px; }
      .title { min-width: 0; font-weight: 500; overflow-wrap: anywhere; }
      .when { margin-inline-start: auto; }
      time {
        position: relative; display: inline-block; font-size: 12px; line-height: 16px; color: var(--cm-text-tertiary); white-space: nowrap; font-variant-numeric: tabular-nums;
        border-radius: var(--cm-radius-xs);
      }
      time:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .meta { margin-block-start: 2px; font-size: 12px; line-height: 16px; color: var(--cm-text-tertiary); overflow-wrap: anywhere; }
      .body { margin-block-start: var(--cm-space-8); overflow-wrap: anywhere; }
      .body.clamp {
        display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: var(--_lines); overflow: hidden;
        max-height: calc(var(--_lines) * 20px);
      }
      .toggle {
        margin-block-start: 4px; padding: 2px 0; font: inherit; font-size: 12px; font-weight: 500; line-height: 16px; color: var(--cm-text-default);
        text-decoration: underline; background: none; border: 0; cursor: pointer; min-height: 24px;
      }
      .toggle:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; border-radius: var(--cm-radius-xs); }
      .actions { display: flex; flex-wrap: wrap; gap: var(--cm-space-8); margin-block-start: var(--cm-space-8); }
      [hidden] { display: none !important; }
      .sr { position: absolute; inset-block-start: 0; inset-inline-start: 0; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      ::slotted([slot='badge']) { flex: none; }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    tick(this, true);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    tick(this, false);
    this.#resize?.disconnect();
    this.#resize = undefined;
  }

  firstUpdated() {
    const body = this.renderRoot.querySelector('.body');
    if (body && typeof ResizeObserver !== 'undefined') {
      this.#resize = new ResizeObserver(() => this.#measure());
      this.#resize.observe(body);
    }
  }

  updated(changed: PropertyValues) {
    if (changed.has('lines') || changed.has('_body') || changed.has('expanded')) this.#measure();
  }

  /** Whether the body is longer than `lines` (the toggle is needed). Measured against the full text height. */
  #measure() {
    const body = this.renderRoot.querySelector<HTMLElement>('.body');
    if (!body || !this._body || !(this.lines > 0)) { this._overflow = false; return; }
    const lh = parseFloat(getComputedStyle(body).lineHeight) || 20;
    this._overflow = body.scrollHeight > this.lines * lh + 1;
  }

  /** The `datetime` as a Date, or undefined when missing or invalid. */
  get date(): Date | undefined {
    if (!this.datetime) return undefined;
    const d = new Date(this.datetime);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  /** The time as shown: `time`, or `datetime` relative to now ("2 hours ago"), or a date when over a week away. */
  get relativeTime(): string {
    if (this.time) return this.time;
    const d = this.date;
    if (!d) return this.datetime;
    const diff = Date.now() - d.getTime();
    const future = diff < 0;
    const min = Math.floor(Math.abs(diff) / 60_000);
    if (min < 1) return this.t('justNow');
    if (min < 60) return this.t(future ? 'inMinutes' : 'minutesAgo', { count: min });
    const hours = Math.floor(min / 60);
    if (hours < 24) return this.t(future ? 'inHours' : 'hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days < RELATIVE_DAYS) return this.t(future ? 'inDays' : 'daysAgo', { count: days });
    return formatDate(d, { dateStyle: 'medium' }, this.locale);
  }

  /** The full date and time, for the tooltip and screen readers. */
  get fullTime(): string {
    const d = this.date;
    return d ? formatDate(d, { dateStyle: 'full', timeStyle: 'short' }, this.locale) : '';
  }

  #has(e: Event, prop: '_body' | '_meta' | '_actions') {
    const nodes = (e.target as HTMLSlotElement).assignedNodes({ flatten: true });
    this[prop] = nodes.some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim());
  }

  #toggle() {
    this.expanded = !this.expanded;
  }

  render() {
    const shown = this.relativeTime;
    const full = this.fullTime;
    const tone = this.tone && this.tone !== 'neutral' ? this.tone : '';
    const clamp = this.lines > 0 && !this.expanded;
    const timeEl = shown
      ? full
        ? html`<cm-tooltip class="when" content=${full} visual-only placement="top"><time part="time" tabindex="0" datetime=${this.datetime}>${shown}<span class="sr">, ${full}</span></time></cm-tooltip>`
        : html`<time class="when" part="time" datetime=${this.datetime || nothing}>${shown}</time>`
      : nothing;
    return html`<div class="item">
      <span class="icon ${tone}" part="icon" aria-hidden="true">${this.icon
        ? html`<cm-icon name=${this.icon} size="16"></cm-icon>` : html`<span class="dot"></span>`}</span>
      <div class="main">
        <div class="head">
          <span class="title" part="title"><slot name="heading">${this.heading}</slot></span>
          <slot name="badge"></slot>
          ${timeEl}
        </div>
        <div class="meta" part="meta" ?hidden=${!this.meta && !this._meta}><slot name="meta" @slotchange=${(e: Event) => this.#has(e, '_meta')}>${this.meta}</slot></div>
        <div class="body ${clamp ? 'clamp' : ''}" id="${this.#id}-body" part="body" ?hidden=${!this._body}
          style="--_lines: ${Math.max(1, this.lines || 1)}"><slot @slotchange=${(e: Event) => this.#has(e, '_body')}></slot></div>
        ${this._body && this._overflow
          ? html`<button type="button" class="toggle" part="toggle" aria-expanded=${this.expanded ? 'true' : 'false'}
              aria-controls="${this.#id}-body" @click=${this.#toggle}>${this.expanded ? this.t('showLess') : this.t('showAll')}</button>`
          : nothing}
        <div class="actions" part="actions" ?hidden=${!this._actions}><slot name="actions" @slotchange=${(e: Event) => this.#has(e, '_actions')}></slot></div>
      </div>
    </div>`;
  }
}
define('cm-timeline-item', CmTimelineItem);

/**
 * An activity feed for a record page: one `cm-timeline-item` per event (emails, calls, notes, field changes,
 * system events), newest first, joined by a vertical line, with "Show more" at the end for older events.
 *
 * It is an ordered list: the component renders the `<ol>` and one `<li>` per item, and each item is shown inside its
 * `<li>`. The line between icons is decoration only.
 * @element cm-timeline
 * @slot - `cm-timeline-item` elements, in the order to show them. Other children are not shown.
 * @slot empty - Shown when there are no items and nothing is loading, e.g. a `cm-empty-state`.
 * @fires cm-load-more - When "Show more" is pressed. Fetch the next page, append the items and clear `loading`; clear `has-more` on the last page.
 * @csspart list - The `<ol>`.
 * @csspart more - The Show more button.
 */
export class CmTimeline extends CmLocalizedElement {
  static shadowRootOptions = { ...LitElement.shadowRootOptions, slotAssignment: 'manual' as SlotAssignmentMode };

  static properties = {
    label: { string: 'label' },
    hasMore: { type: Boolean, attribute: 'has-more', reflect: true },
    loading: { type: Boolean, reflect: true },
    moreLabel: { attribute: 'more-label', string: 'showMore' },
    _items: { state: true },
    _empty: { state: true },
  };

  /** Accessible name of the list, e.g. "Activity for Asha Rao". Default: the built-in string `label` ("Activity"). */
  label!: string;
  /** There are older events: shows the "Show more" button, which fires `cm-load-more`. */
  hasMore = false;
  /** Events are loading: the Show more button shows a spinner, or placeholder rows show when there are no items yet. Announced politely. */
  loading = false;
  /** Text of the Show more button. Default: the built-in string `showMore` ("Show more"). */
  moreLabel!: string;

  _items: CmTimelineItem[] = [];
  _empty: Element[] = [];
  #observer = new MutationObserver(() => this.#read());
  #moreFocused = false;

  static styles = [
    base,
    css`
      :host { display: block; }
      ol { margin: 0; padding: 0; list-style: none; }
      ol:focus { outline: none; }
      li { position: relative; padding-block-end: var(--cm-space-20); }
      /* The line joining the icons (16px is half the 32px icon). Decorative: a pseudo-element, nothing to read. */
      li::before {
        content: ''; position: absolute; inset-inline-start: 15px; inset-block: 32px 0; width: 2px; background: var(--cm-border-subtle);
      }
      li:last-child::before { display: none; }
      :host([has-more]) li:last-child::before { display: block; }
      li:last-child { padding-block-end: 0; }
      :host([has-more]) li:last-child { padding-block-end: var(--cm-space-20); }
      .more { display: flex; padding-inline-start: calc(32px + var(--cm-space-12)); }

      .loading { display: grid; gap: var(--cm-space-20); }
      .sk { display: flex; gap: var(--cm-space-12); align-items: flex-start; }
      .sk .ic { flex: none; width: 32px; --cm-skeleton-height: 32px; }
      .sk .tx { flex: 1; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      @media (max-width: 640px) {
        .more { padding-inline-start: 0; }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.#read();
    this.#observer.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'] });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.#observer.disconnect();
  }

  /** The `cm-timeline-item` children, in order. */
  get items(): CmTimelineItem[] {
    return [...this.children].filter((c) => c.localName === 'cm-timeline-item' && !c.hasAttribute('slot')) as CmTimelineItem[];
  }

  #read() {
    this._items = this.items;
    this._empty = [...this.children].filter((c) => c.getAttribute('slot') === 'empty');
  }

  protected willUpdate() {
    this.#moreFocused = (this.renderRoot as ShadowRoot | undefined)?.activeElement?.localName === 'cm-button';
  }

  protected updated() {
    // Manual slot assignment: each item goes into the slot inside its own <li>, so the list is a real <ol> of <li>s.
    const slots = this.renderRoot.querySelectorAll<HTMLSlotElement>('li > slot');
    slots.forEach((s, i) => { if (this._items[i]) s.assign(this._items[i]); });
    const empty = this.renderRoot.querySelector<HTMLSlotElement>('slot.empty');
    if (empty) empty.assign(...this._empty);
    // "Show more" went away while focused (the last page arrived): keep focus in the timeline.
    if (this.#moreFocused && !this.renderRoot.querySelector('.more cm-button')) {
      this.#moreFocused = false;
      this.renderRoot.querySelector<HTMLElement>('ol')?.focus();
    }
  }

  #more() {
    if (this.loading) return;
    this.dispatchEvent(new CustomEvent('cm-load-more', { bubbles: true, composed: true }));
  }

  render() {
    const items = this._items;
    const busy = this.loading;
    const skeleton = busy && !items.length
      ? html`<div class="loading" aria-hidden="true">${[0, 1, 2].map(() => html`<div class="sk">
          <cm-skeleton class="ic" variant="block"></cm-skeleton><cm-skeleton class="tx" lines="2"></cm-skeleton></div>`)}</div>`
      : nothing;
    return html`
      ${items.length
        ? html`<ol part="list" aria-label=${this.label} aria-busy=${busy ? 'true' : 'false'} tabindex="-1">
            ${items.map(() => html`<li><slot></slot></li>`)}
          </ol>`
        : nothing}
      ${skeleton}
      ${!items.length && !busy ? html`<slot class="empty"></slot>` : nothing}
      ${this.hasMore && items.length
        ? html`<div class="more"><cm-button part="more" size="medium" ?loading=${busy} @click=${this.#more}>${this.moreLabel}</cm-button></div>`
        : nothing}
      <span class="sr" role="status">${busy ? this.t('loading') : ''}</span>
    `;
  }
}
define('cm-timeline', CmTimeline);

declare global { interface HTMLElementTagNameMap { 'cm-timeline': CmTimeline; 'cm-timeline-item': CmTimelineItem } }
