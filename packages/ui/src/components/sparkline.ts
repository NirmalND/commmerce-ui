import { html, svg, css, nothing } from 'lit';
import { base, define } from '../base.js';
import { CmLocalizedElement, defineStrings } from '../localize.js';

const strings = defineStrings('sparkline', {
  /** Accessible summary. {label} names the series, {total} its sum, {peak} the largest value, {latest} the last one. */
  summary: '{label}: {total} in all, peak {peak}, latest {latest}',
  /** Accessible summary when `labels` names the points: {when} is the label of the peak. */
  summaryAt: '{label}: {total} in all, peak {peak} on {when}, latest {latest}',
  /** Accessible summary with no values. */
  empty: '{label}: no data',
});
declare module '../localize.js' { interface CmStrings { sparkline: typeof strings } }

export type SparklineType = 'bars' | 'line';
export type SparklineTone = 'neutral' | 'information' | 'success';

/** "[1,0,3]" (JSON) or "1, 0, 3" (comma-separated) to numbers; anything else that isn't a number counts as 0. */
const toNumbers = (v: string | null): number[] => {
  if (!v) return [];
  const t = v.trim();
  let raw: unknown[] = [];
  if (t.startsWith('[')) { try { raw = JSON.parse(t) as unknown[]; } catch { raw = []; } }
  else raw = t.split(',');
  return raw.map((x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; });
};
const toLabels = (v: string | null): string[] => {
  if (!v) return [];
  const t = v.trim();
  if (t.startsWith('[')) { try { return (JSON.parse(t) as unknown[]).map(String); } catch { return []; } }
  return t.split(',').map((s) => s.trim());
};

/**
 * A word-sized chart of one series over time, for a summary card: "Visits, last 30 days" beside the facts it sums
 * up (since 1.10.0). Bars (the default) for counts per day or week, a line for a level that moves (a balance, a
 * score). It has no axes or numbers of its own: put the figure it explains next to it, for example in `cm-metric`
 * or a `cm-info-item`. Time runs left to right in every language. Screen readers hear one sentence: the total, the
 * peak (and when, with `labels`) and the latest value; with `labels`, pointing at a bar shows its label and value.
 * @element cm-sparkline
 * @cssprop --cm-sparkline-height - Height (default 32px). The width follows the container (default 100%, at most `--cm-sparkline-width`).
 * @cssprop --cm-sparkline-width - Largest width (default none).
 * @csspart chart - The `<svg>`.
 */
export class CmSparkline extends CmLocalizedElement {
  static properties = {
    values: { converter: { fromAttribute: toNumbers } },
    labels: { converter: { fromAttribute: toLabels } },
    label: {},
    type: { reflect: true },
    tone: { reflect: true },
  };

  /** The points, oldest first. In HTML: `values="[0,2,1,4]"` or `values="0,2,1,4"`. */
  values: number[] = [];
  /** Optional name of each point, oldest first ("12 Nov"), for the summary and the hover text. */
  labels: string[] = [];
  /** What the series is, e.g. "Visits, last 30 days". Used in the accessible summary. */
  label = '';
  /** `bars` (default) for counts; `line` for a level. */
  type: SparklineType = 'bars';
  /** Colour: `neutral` (default, the text colour at 60%), `information` or `success`. */
  tone: SparklineTone = 'neutral';

  static styles = [
    base,
    css`
      :host { display: block; width: 100%; max-width: var(--cm-sparkline-width, none); height: var(--cm-sparkline-height, 32px); color: var(--cm-icon-default); }
      :host([tone='information']) { color: var(--cm-text-information); }
      :host([tone='success']) { color: var(--cm-text-success); }
      svg { display: block; width: 100%; height: 100%; overflow: visible; direction: ltr; }
      .base { stroke: var(--cm-border-subtle); stroke-width: 1; vector-effect: non-scaling-stroke; }
      .bar { fill: currentColor; }
      .bar.last { fill: var(--cm-text-default); }
      :host([tone='information']) .bar.last, :host([tone='success']) .bar.last { fill: currentColor; opacity: 1; }
      :host([tone='information']) .bar:not(.last), :host([tone='success']) .bar:not(.last) { opacity: 0.55; }
      .line { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
      .dot { stroke: var(--cm-text-default); stroke-width: 5; stroke-linecap: round; vector-effect: non-scaling-stroke; }
      :host([tone='information']) .dot, :host([tone='success']) .dot { stroke: currentColor; }
    `,
  ];

  /** The sentence screen readers hear. */
  get summary(): string {
    const v = this.values ?? [];
    const label = this.label || '';
    if (!v.length) return this.t('empty', { label });
    const total = v.reduce((a, b) => a + b, 0);
    const peak = Math.max(...v);
    const at = v.indexOf(peak);
    const vars = { label, total: this.formatNumber(total), peak: this.formatNumber(peak), latest: this.formatNumber(v[v.length - 1]) };
    const when = this.labels?.[at];
    return when ? this.t('summaryAt', { ...vars, when }) : this.t('summary', vars);
  }

  render() {
    const v = this.values ?? [];
    const n = v.length;
    // A 100 x 32 box stretched to the element; the stroke widths stay put (non-scaling-stroke).
    const W = 100, H = 32, top = 2;
    const max = Math.max(1, ...v.map((x) => Math.max(0, x)));
    const y = (x: number) => H - (Math.max(0, x) / max) * (H - top);
    const tip = (i: number) => (this.labels?.[i] ? `${this.labels[i]}: ${this.formatNumber(v[i])}` : '');
    let marks: unknown = nothing;
    if (n && this.type === 'line') {
      const step = n > 1 ? W / (n - 1) : 0;
      const pts = v.map((x, i) => `${(n > 1 ? i * step : W / 2).toFixed(2)},${y(x).toFixed(2)}`).join(' ');
      const last = pts.split(' ').pop()!.split(',');
      // The dot is a zero-length round-capped line: with non-scaling-stroke it stays round however the chart stretches.
      marks = svg`<polyline class="line" points=${pts}></polyline><line class="dot" x1=${last[0]} y1=${last[1]} x2=${last[0]} y2=${last[1]}></line>`;
    } else if (n) {
      const slot = W / n, gap = n > 1 ? Math.min(slot * 0.25, 2) : 0, bw = slot - gap;
      marks = v.map((x, i) => {
        const h = Math.max(x > 0 ? 1.5 : 0, H - y(x));
        const t = tip(i);
        return svg`<rect class=${i === n - 1 ? 'bar last' : 'bar'} x=${(i * slot + gap / 2).toFixed(2)} y=${(H - h).toFixed(2)} width=${bw.toFixed(2)} height=${h.toFixed(2)} rx="0.6">${t ? svg`<title>${t}</title>` : nothing}</rect>`;
      });
    }
    return html`<svg part="chart" role="img" aria-label=${this.summary} viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <line class="base" x1="0" y1=${H} x2=${W} y2=${H}></line>${marks}</svg>`;
  }
}
define('cm-sparkline', CmSparkline);

declare global { interface HTMLElementTagNameMap { 'cm-sparkline': CmSparkline } }
