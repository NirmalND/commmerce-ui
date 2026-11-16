import { html, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';
import './icon.js';
import './skeleton.js';

const strings = defineStrings('metric', {
  /** Read for a rising change. `{change}` is the `change` text, e.g. "+12%". */
  up: 'Up {change}',
  /** Read for a falling change. */
  down: 'Down {change}',
  /** Read for a change that is level. */
  flat: 'No change {change}',
  /** Added when the change is good news (`trend-sentiment`). `{trend}` is the text above. */
  good: '{trend}, good',
  /** Added when the change is bad news. */
  bad: '{trend}, bad',
  /** Announced (politely) while the figure loads. */
  loadingValue: 'Loading {label}',
});
declare module '../localize.js' { interface CmStrings { metric: typeof strings } }

export type MetricTrend = 'up' | 'down' | 'flat';
export type MetricSentiment = 'auto' | 'positive' | 'negative' | 'neutral';

/** A plain number written as text ("1240", "-3.5"): formatted like a number. Anything else is shown as given. */
const PLAIN_NUMBER = /^\s*-?\d+(\.\d+)?\s*$/;

/**
 * One number with its name, for totals and KPIs: "SMB leads 1,240". A large figure in tabular numerals, an optional
 * hint line ("2 past demos need a result") and an optional change ("+12%" with an arrow, coloured by whether it is
 * good news). With `href` the whole tile is one link, e.g. to the list behind the number. Put a row of them in
 * `cm-grid`.
 * @element cm-metric
 * @slot hint - A hint with markup (e.g. a bold count), used instead of `hint`. No links or buttons: with `href` the whole tile is already one link.
 */
export class CmMetric extends CmLocalizedElement {
  static properties = {
    label: {},
    value: {
      converter: {
        fromAttribute: (v: string | null) => (v !== null && PLAIN_NUMBER.test(v) ? Number(v) : v ?? ''),
        toAttribute: (v: unknown) => (v === null || v === undefined ? v : String(v)),
      },
    },
    hint: {},
    change: {},
    trend: { reflect: true },
    trendSentiment: { attribute: 'trend-sentiment', reflect: true },
    href: {},
    loading: { type: Boolean, reflect: true },
    _hasHint: { state: true },
  };

  /** What is counted, e.g. "SMB leads". Two to four words. */
  label = '';
  /**
   * The figure. A number (or a plain number in the attribute, `value="1240"`) is formatted for the locale:
   * "1,240", and lakh grouping "12,40,000" in `en-IN`. Any other text ("Rs. 2.4 L", "3 of 5") is shown as given.
   */
  value: number | string = '';
  /** One line under the figure in a quieter colour, e.g. "2 past demos need a result". */
  hint = '';
  /** The change to show, written as you want it read, e.g. "+12%" or "-3 vs last week". */
  change = '';
  /** Direction of `change`: `up`, `down` or `flat`. Adds an arrow and says the direction to screen readers. */
  trend?: MetricTrend;
  /**
   * Whether the change is good news. `auto` (default): up is positive (green), down is negative (red), flat is
   * neutral. Set `negative` when up is bad (more refunds, more overdue tasks), `positive` when down is good.
   */
  trendSentiment: MetricSentiment = 'auto';
  /** Makes the whole tile one link, named by the label and figure, e.g. to the list behind the number. */
  href = '';
  /** Shows a placeholder instead of the figure and announces "Loading <label>" politely. */
  loading = false;

  private _hasHint = false;

  static styles = [
    base,
    css`
      :host { display: block; align-self: stretch; min-inline-size: 0; }
      .tile {
        display: flex; flex-direction: column; gap: 4px; block-size: 100%; min-inline-size: 0;
        padding: var(--cm-space-20); color: var(--cm-text-default); text-decoration: none; text-align: start;
        background: var(--cm-bg-surface); border: var(--cm-border-1) solid var(--cm-border-card); border-radius: var(--cm-radius-md);
      }
      a.tile { cursor: pointer; }
      a.tile:hover { border-color: var(--cm-border-strong); }
      a.tile:focus-visible { outline: 2px solid var(--cm-border-strong); outline-offset: 2px; }
      .label { font-size: var(--cm-type-body-md-size); font-weight: 500; line-height: var(--cm-type-body-md-line-height); overflow-wrap: anywhere; }
      .value {
        font-size: var(--cm-type-heading-lg-size); font-weight: var(--cm-type-heading-lg-weight); line-height: 1.25;
        font-variant-numeric: tabular-nums; overflow-wrap: anywhere; min-block-size: 1.25em;
      }
      .value cm-skeleton { inline-size: 6ch; max-inline-size: 100%; --cm-skeleton-height: 0.9em; margin-block: 0.175em; }
      .foot { display: flex; flex-wrap: wrap; align-items: baseline; column-gap: var(--cm-space-10); row-gap: 2px; }
      .foot:not(.on) { display: none; }
      .change {
        display: inline-flex; align-items: center; gap: 2px; font-size: var(--cm-type-body-sm-size); font-weight: 500;
        font-variant-numeric: tabular-nums; color: var(--cm-text-tertiary);
      }
      .change.positive { color: var(--cm-text-success); }
      .change.negative { color: var(--cm-text-critical); }
      .change cm-icon { align-self: center; }
      .change.down cm-icon { transform: rotate(90deg); }
      :host(:dir(rtl)) .change.down cm-icon { transform: rotate(-90deg); }
      .change.flat cm-icon { transform: rotate(180deg); }
      .hint { font-size: var(--cm-type-body-sm-size); line-height: var(--cm-type-body-sm-line-height); color: var(--cm-text-tertiary); overflow-wrap: anywhere; }
      .hint:not(.on) { display: none; }
      .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); clip-path: inset(50%); white-space: nowrap; }
      @media (max-width: 640px) {
        .tile { padding: var(--cm-space-15); }
        .value { font-size: var(--cm-type-heading-lg-resp-size); }
      }
      @media (forced-colors: active) { .change { color: CanvasText; } }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this._hasHint = !!this.querySelector(':scope > [slot="hint"]');
  }

  /** The figure as shown: a number formatted for the locale, any other text as given. */
  private figure(): string {
    const v = this.value;
    if (v === '' || v === null || v === undefined) return '';
    const n = typeof v === 'number' ? v : PLAIN_NUMBER.test(String(v)) ? Number(v) : NaN;
    return Number.isNaN(n) ? String(v) : this.formatNumber(n);
  }

  private sentiment(): 'positive' | 'negative' | 'neutral' {
    const s = this.trendSentiment;
    if (s === 'positive' || s === 'negative' || s === 'neutral') return s;
    return this.trend === 'up' ? 'positive' : this.trend === 'down' ? 'negative' : 'neutral';
  }

  private renderChange() {
    const trend = this.trend && ['up', 'down', 'flat'].includes(this.trend) ? this.trend : undefined;
    if (!this.change && !trend) return nothing;
    if (!trend) return html`<span class="change neutral" part="change">${this.change}</span>`;
    const sentiment = this.sentiment();
    const said = this.t(trend, { change: this.change }).trim();
    const spoken = sentiment === 'positive' ? this.t('good', { trend: said }) : sentiment === 'negative' ? this.t('bad', { trend: said }) : said;
    // up: the arrow drawn up-and-forward; down: turned a quarter clockwise (mirrored first in RTL, so turned the other way);
    // flat: arrow-left turned half round, which points forward in either direction.
    const icon = trend === 'flat' ? 'arrow-left' : 'arrow-up-right';
    return html`<span class="change ${trend} ${sentiment}" part="change">
      <cm-icon name=${icon} size="16"></cm-icon><span aria-hidden="true">${this.change}</span><span class="sr">${spoken}</span>
    </span>`;
  }

  render() {
    const showHint = this._hasHint || !!this.hint;
    const value = this.loading ? html`<cm-skeleton variant="block"></cm-skeleton>` : this.figure();
    const change = this.renderChange();
    const hasFoot = change !== nothing || showHint;
    const body = html`
      <span class="label" id="label" part="label">${this.label}</span>
      <span class="value" id="value" part="value">${value}</span>
      <span class="foot ${hasFoot ? 'on' : ''}" id="foot" part="footer">
        ${change}
        <span class="hint ${showHint ? 'on' : ''}" part="hint"><slot name="hint" @slotchange=${this.onHintSlot}>${this.hint}</slot></span>
      </span>
    `;
    const status = html`<span class="sr" role="status">${this.loading ? this.t('loadingValue', { label: this.label }) : ''}</span>`;
    const busy = this.loading ? 'true' : nothing;
    return this.href
      ? html`<a class="tile" part="tile" href=${this.href} aria-labelledby="label value" aria-describedby=${hasFoot ? 'foot' : nothing} aria-busy=${busy}>${body}</a>${status}`
      : html`<div class="tile" part="tile" aria-busy=${busy}>${body}</div>${status}`;
  }

  private onHintSlot = (e: Event) => {
    this._hasHint = (e.target as HTMLSlotElement).assignedNodes({ flatten: false }).some((n) => n.nodeType === 1 || n.textContent?.trim());
  };
}
define('cm-metric', CmMetric);

declare global { interface HTMLElementTagNameMap { 'cm-metric': CmMetric } }
